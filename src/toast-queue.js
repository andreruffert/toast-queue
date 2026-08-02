import { Swipeable } from './swipeable.js';
import {
  getPlacementViewTransitionClass,
  getSwipeableDirection,
  randomId,
  Timer,
  wrapInViewTransition,
} from './utils.js';

/** @import {
 *   ToastQueueOptions,
 *   ToastQueuePlacement,
 *   ToastQueueTemplate,
 *   ToastOptions,
 *   ToastRecord,
 *   ActivationReason
 * } from './types.js'
 */

/**
 * Default HTML templates.
 * @private
 * @type {ToastQueueTemplate}
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
 * Manages a queue of toast notifications including rendering,
 * focus management, swipe dismissal, and auto-dismiss timers.
 *
 * Toasts are announced to screen readers via
 * [`ariaNotify()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify)
 * where the browser supports it. On browsers that don't yet, announcements
 * are silently skipped unless a polyfill is loaded beforehand — see
 * [Browser support](README.md#browser-support)
 * in the README.
 *
 * @class ToastQueue
 *
 * @example
 * // Optional: polyfill ariaNotify() on browsers that don't support it yet.
 * if (typeof HTMLElement.prototype.ariaNotify !== 'function') {
 *   await import('@github/arianotify-polyfill');
 * }
 *
 * const toastQueue = new ToastQueue();
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

  /** @type {number} */
  #duration = 6000;

  /** @type {ToastQueuePlacement} */
  #placement = 'top-end';

  /** @type {boolean} */
  #paused = false;

  /** @type {Set<ActivationReason>} */
  #activationReasons = new Set();

  /** @type {Swipeable} */
  #swipeable;

  /** @type {AbortController} Controls all document/root event listeners added by this instance. */
  #controller = new AbortController();

  /**
   * @param {ToastQueueOptions} [options] - Configuration options.
   */
  constructor(options = {}) {
    this.#template.root.innerHTML = options?.template?.root || TEMPLATE.root;
    this.#template.item.innerHTML = options?.template?.item || TEMPLATE.item;
    this.#template.actionButton.innerHTML =
      options?.template?.actionButton || TEMPLATE.actionButton;

    this.#duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    this.#placement = options.placement ?? this.#placement;

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
    const { signal } = this.#controller;

    document.addEventListener('visibilitychange', this.#onVisibility, { signal });
    document.addEventListener('pointerdown', this.#onOutsidePointer, { signal });

    this.#rootPart.addEventListener('click', this.#onClick, { signal });
    this.#rootPart.addEventListener('pointerenter', this.#onEnter, { signal });
    this.#rootPart.addEventListener('pointerleave', this.#onLeave, { signal });
    this.#rootPart.addEventListener('focusin', this.#onFocusIn, { signal });
    this.#rootPart.addEventListener('focusout', this.#onFocusOut, { signal });
    this.#rootPart.addEventListener('keydown', this.#onKeydown, { signal });
  }

  #onEnter = () => {
    if (this.#active) return;
    this.pause();
  };

  #onLeave = () => {
    if (this.#active) return;
    this.resume();
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

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    if (event.key !== 'Escape') return;

    const toastPart = event.target.closest(SELECTORS.toast);
    if (!toastPart) return;

    const id = toastPart.dataset.id;
    const toast = this.#queue.get(id);
    if (!toast || toast.dismissible === false) return;

    event.stopPropagation();
    this.close(id);
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
      toast?.action?.onClick?.(toast);
      return;
    }

    if (cmd === 'clear') {
      this.clear();
      return;
    }

    if (!this.#isExpandable) return;

    this.#activate('click');
  };

  /* ---------------------------------------------------------------------- */
  /* Core API                                                              */
  /* ---------------------------------------------------------------------- */

  /**
   * Adds a toast notification to the queue.
   *
   * @param {string|ToastContent} content
   *   Toast message content.
   * @param {ToastOptions} [options]
   *   Per-toast configuration.
   * @returns {ToastRecord}
   *   The created toast record.
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
      className: options.className,
      icon: options.icon,
      action: options.action,
      dismissible: options.dismissible ?? true,
      priority: options.priority ?? 'normal',
      onClose: options.onClose,
      timer: duration ? new Timer(() => this.close(id), duration) : undefined,
      itemRef: null,
    };

    const item = this.#createItem(toast);

    toast.itemRef = item;
    this.#queue.set(id, toast);

    this.#syncRootState(() => {
      this.#groupPart.prepend(item);
    }).then(() => {
      this.#announce(toast);
    });

    console.debug('[toast queue] add', toast.id);

    return toast;
  }

  /**
   * Retrieves a toast by id.
   *
   * @param {string} id
   * @returns {ToastRecord|undefined}
   */
  get(id) {
    return this.#queue.get(id);
  }

  /**
   * Removes the specified toast from the queue.
   *
   * @param {string} id - Toast identifier.
   */
  close(id) {
    const toast = this.#queue.get(id);
    if (!toast) return;

    this.#queue.delete(id);
    toast.onClose?.(toast);
    toast.timer?.clear();
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

  /**
   * @returns {boolean} - Whether toast timers are currently paused.
   */
  get isPaused() {
    return this.#paused;
  }

  /**
   * Temporarily pauses all toast timers.
   */
  pause() {
    this.#setPaused(true);
  }

  /**
   * Resumes all paused toast timers.
   */
  resume() {
    this.#setPaused(false);
  }

  /**
   * @returns {ToastQueuePlacement} - The current placement.
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
    this.#controller.abort();

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
    if (this.#queue.size >= 1 && !this.#rootPart.matches(':popover-open')) {
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
    toastPart.tabIndex = 0;
    toastPart.dataset.id = toast.id;
    toastPart.dataset.dismissible = toast.dismissible;
    toastPart.setAttribute('aria-labelledby', titleId);

    if (toast.dismissible) toastPart.dataset.swipeable = getSwipeableDirection(this.#placement);
    if (toast.dismissible === false) toastPart.querySelector(SELECTORS.closeButton).remove();
    if (toast.className) toastPart.classList.add(...toast.className.split(' '));
    if (toast.content?.description) toastPart.setAttribute('aria-describedby', descId);

    /** Toast icon - Optional */
    const iconPart = fragment.querySelector(SELECTORS.icon);
    if (toast.icon) {
      iconPart.setHTML?.(toast.icon) ?? (iconPart.innerHTML = toast.icon);
    } else {
      iconPart.remove();
    }

    /** Toast content */
    const contentPart = fragment.querySelector(SELECTORS.content);
    if (typeof toast.content === 'string') {
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
    if (toast.action?.label) {
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

  #getAnnouncementText(toast) {
    if (typeof toast.content === 'string') return toast.content;
    if (!toast.content) return '';

    return [toast.content.title, toast.content.description].filter(Boolean).join('. ');
  }

  #announce(toast) {
    const message = this.#getAnnouncementText(toast);

    if (!message) return;

    console.debug('ariaNotify', message);

    const target = toast.itemRef.querySelector(SELECTORS.toast);

    if (target?.ariaNotify) {
      target.ariaNotify(message, {
        priority: toast.priority,
      });
    } else if (document.ariaNotify) {
      document.ariaNotify(message, {
        priority: toast.priority,
      });
    }
  }
}
