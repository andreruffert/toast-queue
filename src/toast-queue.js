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
 * const tq = new ToastQueue();
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

  /**
   * Number of toasts rendered visibly at once before the rest are hidden.
   * Exposed to presets via `data-hidden-count`, `[data-hidden]`,
   * `[data-peek]`, and `--tq-item-index` (see `#syncVisibleLimitState`) so they
   * can build their own cutoff/peek treatment.
   * @type {number}
   */
  #visibleLimit = 3;

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
    this.#visibleLimit = options.visibleLimit ?? this.#visibleLimit;

    this.#mount(options.root || document.body);

    this.#swipeable = new Swipeable({
      root: this.#rootPart,
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
      this.pause();
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
      this.resume();
      this.#syncActivationState();
    }

    console.debug('[toast-queue] deactivate', reason, [...this.#activationReasons]);
  }

  #clearActivation() {
    if (!this.#active) return;

    this.resume();
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
    this.#rootPart.addEventListener('pointercancel', this.#onLeave, { signal });
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
    if (event.target.matches('[data-command]')) return;

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
      this.#deactivate('focus');
    });

    console.debug('[toast-queue] onFocusOut', event);
  };

  /** @param {PointerEvent} event */
  #onOutsidePointer = (event) => {
    if (!this.#active) return;
    if (this.#rootPart.contains(event.target)) return;
    this.#clearActivation();
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
      try {
        toast?.action?.onClick?.(toast);
      } catch (error) {
        console.error('[toast-queue] action onClick callback threw', error);
      }
      return;
    }

    if (cmd === 'clear') {
      this.clear();
      return;
    }

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

    console.debug('[toast-queue] add', toast.id);

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
    toast.timer?.clear();
    this.#moveFocusAfterClose(toast);

    this.#syncRootState(
      () => toast.itemRef.remove(),
      // Skip transition for invisible elements
      !toast.itemRef.checkVisibility?.(),
    );

    // Run after internal cleanup so a throwing consumer callback can't leave
    // the DOM/popover out of sync with `#queue`.
    try {
      toast.onClose?.(toast);
    } catch (error) {
      console.error('[toast-queue] onClose callback threw', error);
    }

    console.debug('[toast-queue] close', id);
  }

  /**
   * Removes all toasts from the queue.
   */
  clear() {
    for (const toast of this.#queue.values()) {
      toast.timer?.clear();
    }
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
   * @returns {HTMLElement} - The root DOM element for this queue instance.
   */
  get element() {
    return this.#rootPart;
  }

  /**
   * @returns {number} - The number of toasts currently in the queue.
   */
  get size() {
    return this.#queue.size;
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
   * @returns {number} - The current visible limit.
   */
  get visibleLimit() {
    return this.#visibleLimit;
  }

  /**
   * @param {number} value - The number of toasts to render visibly before hiding the rest.
   */
  set visibleLimit(value) {
    this.#visibleLimit = value;
    wrapInViewTransition(() => this.#syncVisibleLimitState());
  }

  /**
   * Destroys the queue and removes all listeners.
   */
  destroy() {
    this.#controller.abort();

    for (const toast of this.#queue.values()) {
      toast.timer?.clear();
    }

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
   * Exposes how many toasts exceed the visible limit as `data-hidden-count`,
   * so CSS presets can render an indicator (e.g. "+2 more") without the
   * library dictating how it looks. Removes the attribute when nothing is
   * hidden.
   *
   * Also flags each toast item's position in the group so presets can build
   * a peek effect (z-index, offset, scale) that scales with `visibleLimit`:
   *  - `--tq-item-index` (0 = topmost/newest) - a CSS custom property,
   *    usable in `calc()` for z-index/margin/scale formulas.
   *  - `[data-hidden]` - set on every item beyond `visibleLimit`.
   *  - `[data-peek]` - set on exactly the first hidden item, so presets can
   *    override its display for a "the next one's coming" preview animation.
   */
  #syncVisibleLimitState() {
    const hidden = Math.max(0, this.#queue.size - this.#visibleLimit);

    if (hidden > 0) {
      this.#rootPart.dataset.hiddenCount = hidden;
    } else {
      delete this.#rootPart.dataset.hiddenCount;
    }

    let index = 0;
    for (const item of this.#groupPart.children) {
      item.style.setProperty('--tq-item-index', index);
      item.toggleAttribute('data-hidden', index >= this.#visibleLimit);
      item.toggleAttribute('data-peek', index === this.#visibleLimit);
      index++;
    }
  }

  /**
   * @param {function(): void} [update]
   * @param {boolean} [skipTransition]
   * @returns {Promise<void>}
   */
  async #syncRootState(update = () => {}, skipTransition = false) {
    if (this.#queue.size >= 1 && !this.#rootPart.matches(':popover-open')) {
      this.#rootPart.showPopover();
    }

    // `#syncVisibleLimitState` reads live DOM order to decide which items are
    // past the limit, so it must run *after* `update()` has actually
    // mutated the DOM (not before) — otherwise it flags items based on
    // the previous state, one step behind the queue it's counting
    // against. Bundling both into a single callback also keeps them
    // inside the same view-transition snapshot.
    const applyUpdate = () => {
      update();
      this.#syncVisibleLimitState();
    };

    if (skipTransition) {
      applyUpdate();
    } else {
      await wrapInViewTransition(applyUpdate).finished;
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
      if (typeof iconPart.setHTML === 'function') {
        iconPart.setHTML(toast.icon);
      } else {
        iconPart.innerHTML = toast.icon;
      }
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
      titlePart.textContent = toast.content?.title ?? '';
      descPart.id = descId;
      descPart.textContent = toast.content?.description ?? '';
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

    const { nextElementSibling: next, previousElementSibling: prev } = toast.itemRef;
    const target = next && !next.hasAttribute('data-hidden') ? next : prev;

    target?.firstElementChild?.focus();
  }

  /* ---------------------------------------------------------------------- */
  /* Accessibility                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * @param {ToastRecord} toast
   */
  #getAnnouncementText(toast) {
    if (typeof toast.content === 'string') return toast.content;
    if (!toast.content) return '';

    return [toast.content.title, toast.content.description].filter(Boolean).join('. ');
  }

  /**
   * @param {ToastRecord} toast
   */
  #announce(toast) {
    const message = this.#getAnnouncementText(toast);

    if (!message) return;

    console.debug('[toast-queue] announce', message);

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
