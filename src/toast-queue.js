import { Swipeable } from './swipeable.js';
import {
  getPositionViewTransitionClass,
  getSwipeableDirection,
  randomId,
  Timer,
  wrapInViewTransition,
} from './utils.js';

/** @import {
 *   ToastQueueOptions,
 *   ToastQueuePosition,
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
 * Manages a queue of toast notifications.
 *
 * A queue handles rendering, auto-dismiss timers, focus management,
 * keyboard dismissal, swipe dismissal, and screen-reader announcements.
 *
 * Toasts are announced with the browser's `ariaNotify()` API when available.
 * Browsers without `ariaNotify()` can use the
 * [`@github/arianotify-polyfill`](https://github.com/github/aria-notify-polyfill)
 * before creating the queue.
 *
 * The queue is unstyled by default. Use the exposed `data-*` attributes and
 * CSS custom properties to provide your own presentation, or use one of the
 * optional CSS presets.
 *
 * @class ToastQueue
 * @param {ToastQueueOptions} [options] - Queue configuration.
 *
 * @example
 * import ToastQueue from 'toast-queue';
 *
 * const toastQueue = new ToastQueue();
 *
 * toastQueue.add('Changes saved.');
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

  /** @type {ToastQueuePosition} */
  #position = 'top-end';

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

  constructor(options = {}) {
    this.#template.root.innerHTML = options?.template?.root || TEMPLATE.root;
    this.#template.item.innerHTML = options?.template?.item || TEMPLATE.item;
    this.#template.actionButton.innerHTML =
      options?.template?.actionButton || TEMPLATE.actionButton;

    this.#duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    this.#position = options.position ?? this.#position;
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
    this.#rootPart.dataset.position = this.#position;

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
    }, this.#rootPart);
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
   * The toast is rendered immediately when space is available. When the
   * `visibleLimit` has been reached, additional toasts remain queued until an
   * earlier toast is closed.
   *
   * Pass a string for a simple message or an object for a title and optional
   * description.
   *
   * @param {ToastContent} content - Toast message content.
   * @param {ToastOptions} [options] - Per-toast configuration.
   * @returns {ToastRecord} The newly created toast record.
   *
   * @example
   * toastQueue.add('Changes saved.');
   *
   * @example
   * toastQueue.add({
   *   title: 'Changes saved',
   *   description: 'Your profile has been updated.',
   * });
   *
   * @example
   * toastQueue.add('File uploaded.', {
   *   duration: 3000,
   *   action: {
   *     label: 'View',
   *     onClick: (toast) => {
   *       console.log(toast);
   *     },
   *   },
   * });
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
   * Retrieves a toast by its identifier.
   *
   * @param {string} id - Toast identifier.
   * @returns {ToastRecord|undefined} The matching toast, or `undefined` when no toast with that identifier exists.
   */
  get(id) {
    return this.#queue.get(id);
  }

  /**
   * Closes a toast and removes it from the queue.
   *
   * Closing a toast also cancels its auto-dismiss timer and updates queue state.
   * If the toast has an `onClose` callback, it is invoked after the queue has
   * been updated.
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
   * Closes all toasts and clears the queue.
   *
   * All auto-dismiss timers are cancelled and the queue is reset to its empty state.
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
   * Whether the queue's toast timers are currently paused.
   *
   * Timers may be paused explicitly with {@link ToastQueue#pause}, or
   * automatically while the queue is hovered, focused, or the document is
   * hidden.
   *
   * @readonly
   * @type {boolean}
   */
  get isPaused() {
    return this.#paused;
  }

  /**
   * The root `<toast-queue>` element for this queue instance.
   *
   * Use this element to apply instance-specific styles or inspect the queue's
   * DOM state.
   *
   * @readonly
   * @type {HTMLElement}
   */
  get element() {
    return this.#rootPart;
  }

  /**
   * The number of toasts currently in the queue.
   *
   * @readonly
   * @type {number}
   */
  get size() {
    return this.#queue.size;
  }

  /**
   * Pauses all toast auto-dismiss timers.
   *
   * Calling this method does not remove or hide toasts. Timers resume from
   * their remaining time when {@link ToastQueue#resume} is called.
   */
  pause() {
    this.#setPaused(true);
  }

  /**
   * Resumes all paused toast auto-dismiss timers.
   *
   * Has no effect when the queue is already running.
   */
  resume() {
    this.#setPaused(false);
  }

  /**
   * Gets or sets the queue position.
   *
   * Supported positions are:
   *
   * - `top-start`
   * - `top-center`
   * - `top-end`
   * - `center`
   * - `bottom-start`
   * - `bottom-center`
   * - `bottom-end`
   *
   * Changing the position updates the queue and existing toasts in place.
   *
   * @type {ToastQueuePosition}
   */
  get position() {
    return this.#position;
  }

  set position(value) {
    this.#position = value;
    for (const toast of this.#queue.values()) {
      toast.itemRef.style.setProperty(
        'view-transition-class',
        `tq-item ${getPositionViewTransitionClass(this.#position)}`,
      );
      if (toast.dismissible) {
        const toastPart = toast.itemRef.querySelector(SELECTORS.toast);
        toastPart.dataset.swipeable = getSwipeableDirection(value);
      }
    }
    wrapInViewTransition(() => {
      this.#rootPart.dataset.position = this.#position;
    });
  }

  /**
   * Gets or sets the number of toasts that are considered visible.
   *
   * Toasts beyond this limit remain in the queue but are marked as hidden using
   * `data-hidden`. The current number of hidden toasts is exposed through
   * `data-hidden-count` on the queue element.
   *
   * CSS presets can use these attributes to create stacked or peek effects.
   *
   * @type {number}
   */
  get visibleLimit() {
    return this.#visibleLimit;
  }

  set visibleLimit(value) {
    this.#visibleLimit = value;
    wrapInViewTransition(() => this.#syncVisibleLimitState(), this.#rootPart);
  }

  /**
   * Permanently destroys the queue instance.
   *
   * Removes the queue element, clears all auto-dismiss timers, removes event
   * listeners, and releases the associated resources.
   *
   * After calling `destroy()`, the queue instance must not be used again.
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
   * Synchronizes queue visibility state with the current `visibleLimit`.
   *
   * The queue element receives `data-hidden-count` when toasts exceed the
   * visible limit. Individual items receive:
   *
   * - `data-hidden` when they are beyond the visible limit.
   * - `data-peek` on the first hidden item.
   * - `--tq-item-index` containing the item's zero-based position.
   *
   * These attributes are intended as styling hooks for CSS presets.
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
      await wrapInViewTransition(applyUpdate, this.#rootPart).finished;
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
      `tq-item ${getPositionViewTransitionClass(this.#position)}`,
    );
    const toastPart = item.querySelector(SELECTORS.toast);
    toastPart.tabIndex = 0;
    toastPart.dataset.id = toast.id;
    toastPart.dataset.dismissible = toast.dismissible;
    toastPart.setAttribute('aria-labelledby', titleId);

    if (toast.dismissible) toastPart.dataset.swipeable = getSwipeableDirection(this.#position);
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
   * Announces a toast to assistive technology.
   *
   * Uses `Element.ariaNotify()` when available and falls back to
   * `Document.ariaNotify()`. When neither API is available, no announcement is
   * made.
   *
   * @private
   * @param {ToastRecord} toast - Toast to announce.
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
