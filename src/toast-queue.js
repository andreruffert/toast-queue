import { Swipeable } from './swipeable';
import {
  getPlacementViewTransitionClass,
  getSwipeableDirection,
  inflect,
  randomId,
  Timer,
  wrapInViewTransition,
} from './utils';

/**
 * @typedef {Object} ToastAction
 * @property {string} label
 * @property {function(): void} [onClick]
 */

/**
 * @typedef {Object} ToastContent
 * @property {string} title
 * @property {string} [description]
 */

/**
 * @typedef {Object} ToastOptions
 * @property {number} [duration]
 * @property {boolean} [dismissible=true]
 * @property {string} [icon]
 * @property {ToastAction} [action]
 * @property {function(): void} [onClose]
 */

/** @private
 * @typedef {Object} ToastRecord
 * @property {string} id
 * @property {number} index
 * @property {number} timestamp
 * @property {string|ToastContent} content
 * @property {string} [icon]
 * @property {ToastAction} [action]
 * @property {boolean} dismissible
 * @property {function(): void} [onClose]
 * @property {Timer} [timer]
 * @property {HTMLLIElement|null} itemRef
 */

/**
 * @typedef {'top-start'|'top-center'|'top-end'|'bottom-start'|'bottom-center'|'bottom-end'} ToastQueuePlacement
 */

/**
 * @typedef {'hover'|'click'|null} ToastQueueActivationMode
 */

/**
 * @typedef {Object} ToastQueueOptions
 * @property {HTMLElement} [root]
 * @property {number} [duration]
 * @property {ToastQueuePlacement} [placement]
 * @property {ToastQueueActivationMode} [activationMode]
 * @property {ToastQueueTemplate} [template]
 */

/** @typedef {'hover'|'focus'|'click'} ActivationReason */

/**
 * @typedef {Object} ToastQueueTemplate
 * @property {string} [root]
 * @property {string} [item]
 * @property {string} [actionButton]
 */

/**
 * Default HTML templates.
 * @type {ToastQueueTemplate}
 * @private
 */
const TEMPLATE = {
  root: `<toast-queue><ol data-part="group"></ol></toast-queue>`,
  item: `<li data-part="item">
    <div data-part="toast">
      <div data-part="icon"></div>
      <div data-part="content">
        <span data-part="title"></span>
        <span data-part="description"></span>
      </div>
      <div data-part="actions"></div>
      <button type="button" data-part="close-button" data-command="close" aria-label="Close">&times;</button>
    </div>
  </li>`,
  actionButton: `<button type="button" data-part="action-button" data-command="action"></button>`,
};

/**
 * CSS selectors for toast queue parts.
 * @private
 */
const SELECTORS = {
  root: 'toast-queue',
  group: '[data-part="group"]',
  item: '[data-part="item"]',
  toast: '[data-part="toast"]',
  icon: '[data-part="icon"]',
  content: '[data-part="content"]',
  title: '[data-part="title"]',
  desc: '[data-part="description"]',
  closeButton: '[data-part="close-button"]',
  actions: '[data-part="actions"]',
  actionButton: '[data-part="action-button"]',
};

/**
 * Accessible singular/plural notification label.
 * @private
 */
const ROOT_LABEL = inflect('notification')('notifications');

/**
 * @class ToastQueue
 */
export class ToastQueue {
  /** @type {{
   *   root: HTMLTemplateElement,
   *   item: HTMLTemplateElement,
   *   actionButton: HTMLTemplateElement
   * }}
   */
  #template = {
    root: document.createElement('template'),
    item: document.createElement('template'),
    actionButton: document.createElement('template'),
  };

  /** @type {HTMLElement} */
  #rootPart;

  /** @type {HTMLOListElement} */
  #groupPart;

  /** @type {Map<string, ToastRecord>} */
  #queue = new Map();

  #duration = 6000;

  /** @type {ToastQueuePlacement} */
  #placement = 'top-end';

  /** @type {ToastQueueActivationMode} */
  #activationMode = null;

  #paused = false;
  #supportsHover = window.matchMedia('(hover: hover)').matches;

  /** @type {Set<ActivationReason>} */
  #activationReasons = new Set();

  /** @type {Swipeable} */
  #swipeable;

  /**
   * @param {ToastQueueOptions} [options]
   */
  constructor(options = {}) {
    this.#template.root.innerHTML = options?.template?.root || TEMPLATE.root;
    this.#template.item.innerHTML = options?.template?.item || TEMPLATE.item;
    this.#template.actionButton.innerHTML =
      options?.template?.actionButton || TEMPLATE.actionButton;

    this.#duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    this.#placement = options.placement ?? this.#placement;
    this.#activationMode = options.activationMode ?? null;

    this.#mount(options.root || document.body);

    this.#swipeable = new Swipeable({
      onSwipe: ({ target }) => {
        const id = target?.dataset?.id;
        if (id) this.close(id);
      },
    });

    this.#bindEvents();
  }

  /* ---------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {HTMLElement} root
   */
  #mount(root) {
    const fragment = this.#template.root.content.cloneNode(true);
    this.#rootPart = fragment.querySelector(SELECTORS.root);
    this.#groupPart = fragment.querySelector(SELECTORS.group);

    this.#rootPart.setAttribute('popover', 'manual');
    this.#rootPart.setAttribute('role', 'region');
    this.#rootPart.setAttribute('aria-label', 'Notifications');
    this.#rootPart.setAttribute('tabindex', '-1');
    this.#rootPart.dataset.placement = this.#placement;

    this.#groupPart.setAttribute('reversed', '');

    root.appendChild(fragment);
  }

  /* ---------------------------------------------------------------------- */
  /* Derived state                                                         */
  /* ---------------------------------------------------------------------- */

  /** @returns {boolean} */
  get #active() {
    return this.#activationReasons.size > 0;
  }

  /** @returns {boolean} */
  get #isExpandable() {
    return this.#queue.size > 1;
  }

  /**
   * @returns {ToastQueueActivationMode}
   */
  get #effectiveActivationMode() {
    return this.#activationMode === 'hover' && !this.#supportsHover
      ? 'click'
      : this.#activationMode;
  }

  /* ---------------------------------------------------------------------- */
  /* Activation                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {ActivationReason} reason
   */
  #activate(reason) {
    const wasActive = this.#active;

    this.#activationReasons.add(reason);

    if (!wasActive && this.#active) {
      this.#syncActivationState();
    }

    console.debug('[toast-queue] activate', reason, [...this.#activationReasons]);
  }

  /**
   * @param {ActivationReason} reason
   */
  #deactivate(reason) {
    const wasActive = this.#active;

    this.#activationReasons.delete(reason);

    if (wasActive && !this.#active) {
      this.#syncActivationState();
    }

    console.debug('[toast-queue] deactivate', reason, [...this.#activationReasons]);
  }

  #clearActivation() {
    if (!this.#active) return;

    this.#activationReasons.clear();
    this.#syncActivationState();
  }

  #syncActivationState() {
    if (!this.#activationMode) return;

    wrapInViewTransition(() => {
      if (this.#active) {
        this.#rootPart.dataset.active = 'true';
      } else {
        delete this.#rootPart.dataset.active;
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Events                                                                */
  /* ---------------------------------------------------------------------- */

  #bindEvents() {
    document.addEventListener('visibilitychange', this.#onVisibility);
    document.addEventListener('pointerdown', this.#onOutsidePointer);

    this.#rootPart.addEventListener('click', this.#onClick);
    this.#rootPart.addEventListener('pointerenter', this.#onEnter);
    this.#rootPart.addEventListener('pointerleave', this.#onLeave);
    this.#rootPart.addEventListener('focusin', this.#onFocusIn);
    this.#rootPart.addEventListener('focusout', this.#onFocusOut);
  }

  #onEnter = () => {
    this.pause();
    if (this.#effectiveActivationMode !== 'hover') return;
    if (!this.#isExpandable) return;
    this.#activate('hover');
  };

  #onLeave = () => {
    if (this.#effectiveActivationMode !== 'hover') {
      // this.resume();
      return;
    }

    this.#deactivate('hover');

    if (!this.#active) {
      this.resume();
    }
  };

  /** @param {FocusEvent} event */
  #onFocusIn = (event) => {
    this.pause();

    if (event.target.matches('[data-command]')) return;
    if (!this.#isExpandable) return;

    // Ignore focus moving within the queue
    if (this.#rootPart.contains(event.relatedTarget)) return;

    this.#activate('focus');
  };

  /** @param {FocusEvent} event */
  #onFocusOut = (event) => {
    // Ignore focus leaving the document (e.g. dev tools)
    if (!document.hasFocus()) return;

    // Ignore focus moving within the queue
    if (this.#rootPart.contains(event.relatedTarget)) return;

    queueMicrotask(() => {
      this.resume();
      this.#deactivate('focus');
    });

    console.debug('[toast-queue] onFocusOut', event);
  };

  /** @param {PointerEvent} event */
  #onOutsidePointer = (event) => {
    if (!this.#active) return;
    if (!this.#rootPart.contains(event.target)) {
      this.#deactivate('click');
    }
  };

  #onVisibility = () => {
    document.visibilityState === 'hidden' ? this.pause() : this.resume();
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const cmd = event.target.dataset?.command;

    console.debug('[toast-queue] onClick', cmd);

    if (cmd === 'close') {
      event.stopPropagation();
      const id = event.target.closest(SELECTORS.toast).dataset.id;
      this.close(id);
      return;
    }

    if (cmd === 'action') {
      event.stopPropagation();
      const id = event.target.closest(SELECTORS.toast)?.dataset.id;
      const toast = this.#queue.get(id);
      toast?.action?.onClick?.();
      this.close(id);
      return;
    }

    if (cmd === 'clear') {
      this.clear();
      return;
    }

    if (this.#effectiveActivationMode !== 'click') return;
    if (!this.#isExpandable) return;

    this.#activate('click');
  };

  /* ---------------------------------------------------------------------- */
  /* Core API                                                              */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {string|ToastContent} content
   * @param {ToastOptions} [options]
   * @returns {ToastRecord}
   */
  add(content, options = {}) {
    const id = randomId();
    const duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;

    /** @type {ToastRecord} */
    const toast = {
      id,
      index: this.#queue.size + 1,
      timestamp: Date.now(),
      content,
      icon: options.icon,
      action: options.action,
      dismissible: options.dismissible ?? true,
      onClose: options.onClose,
      timer: duration ? new Timer(() => this.close(id), duration) : undefined,
      itemRef: null,
    };

    const item = this.#createItem(toast);

    toast.itemRef = item;
    this.#queue.set(id, toast);

    this.#syncRootState(() => {
      this.#groupPart.prepend(item);
    });

    console.debug('[toast queue] add', toast.id);

    return toast;
  }

  /**
   * @param {string} id
   * @returns {ToastRecord|undefined}
   */
  get(id) {
    return this.#queue.get(id);
  }

  /**
   * @param {string} id
   */
  close(id) {
    const toast = this.#queue.get(id);
    if (!toast) return;

    this.#queue.delete(id);
    toast.onClose?.();
    toast.timer?.pause();

    this.#moveFocusAfterClose(toast);

    this.#syncRootState(
      () => toast.itemRef.remove(),
      // Skip transition for invisible elements
      !toast.itemRef.checkVisibility?.(),
    );

    console.debug('[toast-queue] close', id);
  }

  /**
   * Removes all toasts from the queue.
   */
  clear() {
    this.#queue.clear();
    this.#syncRootState(() => {
      this.#groupPart.innerHTML = '';
    });
    this.#clearActivation();
    console.debug('[toast-queue] clear');
  }

  /**
   * @param {boolean} value
   */
  #setPaused(value) {
    if (!this.#duration) return;
    if (this.#paused === value) return;

    this.#paused = value;

    for (const toast of this.#queue.values()) {
      toast.timer?.[value ? 'pause' : 'resume']?.();
    }

    console.debug(`[toast-queue] ${value ? 'pause' : 'resume'}`);
  }

  get isPaused() {
    return this.#paused;
  }

  /**
   * Pauses all active toast timers.
   */
  pause() {
    this.#setPaused(true);
  }

  /**
   * Resumes all active toast timers.
   */
  resume() {
    this.#setPaused(false);
  }

  /**
   * @returns {ToastQueuePlacement} The current placement.
   */
  get placement() {
    return this.#placement;
  }

  /**
   * @param {ToastQueuePlacement} value - The new placement.
   */
  set placement(value) {
    this.#placement = value;
    for (const toast of this.#queue.values()) {
      toast.itemRef.style.setProperty(
        'view-transition-class',
        `tq-item ${getPlacementViewTransitionClass(this.#placement)}`,
      );
      if (toast.dismissible) {
        const toastPart = toast.itemRef.querySelector(SELECTORS.toast);
        toastPart.dataset.swipeable = getSwipeableDirection(value);
      }
    }
    wrapInViewTransition(() => {
      this.#rootPart.dataset.placement = this.#placement;
    });
  }

  /**
   * Destroys the queue and removes all listeners.
   */
  destroy() {
    document.removeEventListener('pointerdown', this.#onOutsidePointer);
    document.removeEventListener('visibilitychange', this.#onVisibility);

    this.#rootPart.remove();
    this.#queue.clear();
    this.#clearActivation();
    this.#swipeable.destroy();

    console.debug('[toast-queue] destroy');
  }

  /* ---------------------------------------------------------------------- */
  /* State synchronization                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {function(): void} [update]
   * @param {boolean} [skip]
   * @returns {Promise<void>}
   */
  async #syncRootState(update = () => {}, skip = false) {
    this.#rootPart.setAttribute(
      'aria-label',
      `${this.#queue.size} ${ROOT_LABEL(this.#queue.size)}`,
    );

    if (this.#queue.size === 1) {
      this.#rootPart.showPopover();
    }

    if (skip) {
      update();
    } else {
      await wrapInViewTransition(update).finished;
    }

    if (this.#queue.size === 0) {
      this.#rootPart.hidePopover();
      this.#clearActivation();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* DOM creation                                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {ToastRecord} toast
   * @returns {HTMLLIElement}
   */
  #createItem(toast) {
    const titleId = `tq:${toast.id}:title`;
    const descId = `tq:${toast.id}:desc`;
    const fragment = this.#template.item.content.cloneNode(true);

    /** @type {HTMLLIElement} */
    const item = fragment.querySelector(SELECTORS.item);

    item.style.setProperty('view-transition-name', `tq-item-${toast.id}`);
    item.style.setProperty(
      'view-transition-class',
      `tq-item ${getPlacementViewTransitionClass(this.#placement)}`,
    );
    const toastPart = item.querySelector(SELECTORS.toast);
    toastPart.dataset.id = toast.id;
    toastPart.dataset.dismissible = toast.dismissible;
    toastPart.setAttribute('tabindex', '0');
    toastPart.setAttribute('role', 'alertdialog');
    toastPart.setAttribute('aria-modal', 'false');
    toastPart.setAttribute('aria-labelledby', titleId);

    if (toast.dismissible) toastPart.dataset.swipeable = getSwipeableDirection(this.#placement);
    if (toast?.dismissible === false) toastPart.querySelector(SELECTORS.closeButton).remove();
    if (toast.content?.description) toastPart.setAttribute('aria-describedby', descId);

    /** Toast icon - Optional */
    const iconPart = fragment.querySelector(SELECTORS.icon);
    if (toast?.icon) {
      iconPart.innerHTML = toast.icon;
    } else {
      iconPart.remove();
    }

    /** Toast content */
    const contentPart = fragment.querySelector(SELECTORS.content);
    contentPart.setAttribute('role', 'alert');
    contentPart.setAttribute('aria-atomic', 'true');
    if (typeof toast?.content === 'string') {
      contentPart.id = titleId;
      contentPart.textContent = toast.content;
    } else {
      const titlePart = fragment.querySelector(SELECTORS.title);
      const descPart = fragment.querySelector(SELECTORS.desc);
      titlePart.id = titleId;
      titlePart.textContent = toast.content?.title;
      descPart.id = descId;
      descPart.textContent = toast.content?.description;
    }

    /** Toast actions - Optional */
    const actionsPart = fragment.querySelector(SELECTORS.actions);
    if (toast?.action?.label) {
      const actionButtonTemplate = this.#template.actionButton.content.cloneNode(true);
      const actionButton = actionButtonTemplate.querySelector(SELECTORS.actionButton);
      actionButton.textContent = toast.action.label;
      actionsPart.appendChild(actionButton);
    } else {
      actionsPart.remove();
    }

    return item;
  }

  /* ---------------------------------------------------------------------- */
  /* Focus handling                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {ToastRecord} toast
   */
  #moveFocusAfterClose(toast) {
    if (!this.#rootPart.contains(document.activeElement)) return;
    if (!this.#active) return;

    const next =
      toast.itemRef.nextElementSibling?.firstElementChild ||
      toast.itemRef.previousElementSibling?.firstElementChild;

    next?.focus();
  }
}
