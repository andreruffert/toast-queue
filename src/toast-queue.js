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
 *   ToastContent,
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
  command: '[data-command]',
};

const DEFAULT_DURATION = 6000;
const DEFAULT_POSITION = 'top-end';
const DEFAULT_VISIBLE_LIMIT = 3;

/**
 * Manages a queue of toast notifications.
 *
 * The queue handles rendering, auto-dismiss timers, pause/resume behavior,
 * focus management, keyboard dismissal, pointer interaction, touch swipes,
 * and screen-reader announcements.
 *
 * Auto-dismiss timers are paused while the queue is hovered or focused and
 * while the document is hidden.
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
  #duration = DEFAULT_DURATION;

  /** @type {ToastQueuePosition} */
  #position = DEFAULT_POSITION;

  /**
   * Number of toasts rendered visibly at once before the rest are hidden.
   * Exposed to presets via `data-hidden-count`, `[data-hidden]`,
   * `[data-peek]`, and `--tq-item-index` (see `#syncVisibleLimitState`) so they
   * can build their own cutoff/peek treatment.
   * @type {number}
   */
  #visibleLimit = DEFAULT_VISIBLE_LIMIT;

  /** @type {boolean} */
  #paused = false;

  /** @type {Set<ActivationReason>} */
  #activationReasons = new Set();

  /** @type {Swipeable} */
  #swipeable;

  /** @type {AbortController} Controls all document/root event listeners added by this instance. */
  #controller = new AbortController();

  constructor(options = {}) {
    const templates = options.template ?? {};

    this.#duration = options.duration ?? DEFAULT_DURATION;
    this.#position = options.position ?? DEFAULT_POSITION;
    this.#visibleLimit = Math.max(0, options.visibleLimit ?? DEFAULT_VISIBLE_LIMIT);

    this.#template.root.innerHTML = templates.root ?? TEMPLATE.root;
    this.#template.item.innerHTML = templates.item ?? TEMPLATE.item;
    this.#template.actionButton.innerHTML = templates.actionButton ?? TEMPLATE.actionButton;

    this.#mount(options.root ?? document.body);
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
   * Mounts the queue into the supplied root element.
   *
   * @param {HTMLElement} root - Element to which the queue is appended.
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
  /* Public API                                                              */
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
    const duration = options.duration ?? this.#duration;

    /** @type {ToastRecord} */
    const toast = {
      id,
      timestamp: Date.now(),
      content,
      className: options.className,
      icon: options.icon,
      action: options.action,
      dismissible: options.dismissible ?? true,
      priority: options.priority ?? 'normal',
      onClose: options.onClose,
      timer: duration > 0 ? new Timer(() => this.close(id), duration) : undefined,
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
      // Skip transition for hidden elements
      toast.itemRef.hasAttribute('data-hidden'),
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
    this.#clearActivation();
    this.#clearQueue();

    this.#syncRootState(() => {
      this.#groupPart.replaceChildren();
    });

    console.debug('[toast-queue] clear');
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
   * Permanently destroys the queue instance.
   *
   * Removes the queue element, clears all auto-dismiss timers, removes event
   * listeners, and releases the associated resources.
   *
   * After calling `destroy()`, the queue instance must not be used again.
   */
  destroy() {
    this.#controller.abort();
    this.#clearQueue();
    this.#rootPart.remove();
    this.#swipeable.destroy();

    console.debug('[toast-queue] destroy');
  }

  /* ---------------------------------------------------------------------- */
  /* Properties.                                                            */
  /* ---------------------------------------------------------------------- */

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
    if (this.#position === value) return;

    this.#position = value;
    for (const toast of this.#queue.values()) {
      this.#syncItemPosition(toast.itemRef, toast.dismissible);
    }
    wrapInViewTransition(() => {
      this.#rootPart.dataset.position = value;
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
    const next = Math.max(0, value);
    if (this.#visibleLimit === next) return;

    this.#visibleLimit = next;
    wrapInViewTransition(() => this.#syncVisibleLimitState(), this.#rootPart);
  }

  /* ---------------------------------------------------------------------- */
  /* Events                                                                */
  /* ---------------------------------------------------------------------- */

  #bindEvents() {
    const { signal } = this.#controller;

    document.addEventListener('visibilitychange', this.#onVisibility, { signal });
    document.addEventListener('pointerdown', this.#onOutsidePointer, { signal });

    this.#rootPart.addEventListener('pointerenter', this.#onEnter, { signal });
    this.#rootPart.addEventListener('pointerleave', this.#onLeave, { signal });
    this.#rootPart.addEventListener('pointercancel', this.#onLeave, { signal });
    this.#rootPart.addEventListener('click', this.#onClick, { signal });
    this.#rootPart.addEventListener('focusin', this.#onFocusIn, { signal });
    this.#rootPart.addEventListener('focusout', this.#onFocusOut, { signal });
    this.#rootPart.addEventListener('keydown', this.#onKeydown, { signal });
  }

  /** @param {PointerEvent} event */
  #onEnter = () => {
    if (this.#active) return;

    this.pause();
  };

  /** @param {PointerEvent} event */
  #onLeave = () => {
    if (this.#active) return;

    this.resume();
  };

  /** @param {FocusEvent} event */
  #onFocusIn = (event) => {
    // Ignore action/close buttons
    if (event.target.closest(SELECTORS.command)) return;

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
      if (!this.#rootPart.contains(document.activeElement)) {
        this.#deactivate('focus');
      }
    });
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
    const id = toastPart?.dataset.id;

    if (!id) return;

    const toast = this.#queue.get(id);
    if (!toast || toast.dismissible === false) return;

    event.stopPropagation();
    this.close(id);
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const command = target?.closest(SELECTORS.command)?.dataset.command;

    switch (command) {
      case 'close':
        event.stopPropagation();
        this.close(target.closest(SELECTORS.toast)?.dataset.id);
        break;

      case 'action': {
        event.stopPropagation();

        const id = target.closest(SELECTORS.toast)?.dataset.id;
        const toast = this.#queue.get(id);
        try {
          toast?.action?.onClick?.(toast);
        } catch (error) {
          console.error('[toast-queue] action onClick callback threw', error);
        }

        break;
      }

      case 'clear':
        this.clear();
        break;

      default:
        this.#activate('click');
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Activation                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * Whether the queue is currently interaction-active.
   *
   * The queue is active when one or more activation reasons are present.
   *
   * @returns {boolean}
   */
  get #active() {
    return this.#activationReasons.size > 0;
  }

  #updateActivation(reason, active) {
    if (active) {
      if (this.#activationReasons.has(reason)) return;

      const wasActive = this.#active;
      this.#activationReasons.add(reason);

      if (!wasActive) {
        this.pause();
        this.#syncActivationState();
      }
    } else {
      if (!this.#activationReasons.delete(reason)) return;

      if (!this.#active) {
        this.resume();
        this.#syncActivationState();
      }
    }

    console.debug('[toast-queue] activation', active ? 'add' : 'remove', reason, [
      ...this.#activationReasons,
    ]);
  }

  /**
   * Activates the queue for the given interaction reason.
   *
   * Multiple interaction reasons can be active simultaneously. Timers are
   * paused when the first reason is added and resumed when the last reason
   * is removed.
   *
   * @param {ActivationReason} reason - Reason the queue should remain active.
   */
  #activate(reason) {
    this.#updateActivation(reason, true);
  }

  /**
   * Deactivates the queue for the given interaction reason.
   *
   * Timers resume only after all active interaction reasons have been removed.
   *
   * @param {ActivationReason} reason - Reason to remove.
   */
  #deactivate(reason) {
    this.#updateActivation(reason, false);
  }

  /**
   * Clears all interaction activation reasons and resumes the queue.
   */
  #clearActivation() {
    if (!this.#active) return;

    this.#activationReasons.clear();
    this.resume();
    this.#syncActivationState();

    console.debug('[toast-queue] activation clear');
  }

  #syncActivationState() {
    wrapInViewTransition(() => {
      this.#rootPart.toggleAttribute('data-active', this.#active);
    }, this.#rootPart);
  }

  /* ---------------------------------------------------------------------- */
  /* Timers / lifecycle state                                               */
  /* ---------------------------------------------------------------------- */

  #clearQueue() {
    for (const toast of this.#queue.values()) {
      toast.timer?.clear();
    }

    this.#queue.clear();
  }

  #syncTimers() {
    for (const toast of this.#queue.values()) {
      this.#paused ? toast.timer?.pause() : toast.timer?.resume();
    }
  }

  /**
   * @param {boolean} value
   */
  #setPaused(value) {
    if (this.#paused === value) return;

    this.#paused = value;
    this.#syncTimers();

    console.debug(`[toast-queue] ${value ? 'pause' : 'resume'}`);
  }

  /* ---------------------------------------------------------------------- */
  /* State synchronization                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Synchronizes visibility-related attributes and CSS properties with the
   * current `visibleLimit`.
   *
   * Each item receives:
   *
   * - `data-hidden` when it exceeds the visible limit.
   * - `data-peek` on the first hidden item.
   * - `--tq-item-index` containing its zero-based position.
   *
   * The queue receives `data-hidden-count` when hidden items exist.
   *
   * These attributes and properties are styling hooks for CSS presets.
   *
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
   * Synchronizes the queue's DOM and popover state.
   *
   * Applies the update inside a view transition unless transitions are skipped.
   * Resolves when the transition has finished.
   *
   * @param {function(): void} [update] - DOM update to apply.
   * @param {boolean} [skipTransition=false] - Whether to skip the view transition.
   * @returns {Promise<void>}
   */
  #syncRootState(update = () => {}, skipTransition = false) {
    const applyUpdate = () => {
      if (this.#queue.size > 0) {
        if (!this.#rootPart.matches(':popover-open')) {
          this.#rootPart.showPopover();
        }
      }

      update();
      this.#syncVisibleLimitState();

      if (this.#queue.size === 0) {
        if (this.#rootPart.matches(':popover-open')) {
          this.#rootPart.hidePopover();
        }

        if (this.#active) {
          this.resume();
          this.#activationReasons.clear();
          delete this.#rootPart.dataset.active;
        }
      }
    };

    if (skipTransition) {
      applyUpdate();
      return Promise.resolve();
    }

    return wrapInViewTransition(applyUpdate).finished;
  }

  /* ---------------------------------------------------------------------- */
  /* DOM creation                                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Creates and populates a toast item from a toast record.
   *
   * @param {ToastRecord} toast - Toast data to render.
   * @returns {HTMLLIElement} The newly created toast item.
   */
  #createItem(toast) {
    const titleId = `tq:${toast.id}:title`;
    const descId = `tq:${toast.id}:desc`;
    const fragment = this.#template.item.content.cloneNode(true);
    const item = fragment.querySelector(SELECTORS.item);
    const toastPart = item.querySelector(SELECTORS.toast);
    const iconPart = fragment.querySelector(SELECTORS.icon);
    const contentPart = fragment.querySelector(SELECTORS.content);
    const titlePart = fragment.querySelector(SELECTORS.title);
    const descPart = fragment.querySelector(SELECTORS.desc);
    const actionsPart = fragment.querySelector(SELECTORS.actions);
    const closeButton = toastPart.querySelector(SELECTORS.closeButton);

    item.style.setProperty('view-transition-name', `tq-item-${toast.id}`);

    toastPart.tabIndex = 0;
    toastPart.dataset.id = toast.id;
    toastPart.dataset.dismissible = toast.dismissible;
    toastPart.setAttribute('aria-labelledby', titleId);

    if (toast.dismissible === false) closeButton.remove();
    if (toast.className) toastPart.classList.add(...toast.className.split(' '));
    if (toast.content?.description) toastPart.setAttribute('aria-describedby', descId);

    if (toast.icon) {
      if (typeof iconPart.setHTML === 'function') {
        iconPart.setHTML(toast.icon);
      } else {
        iconPart.innerHTML = toast.icon;
      }
    } else {
      iconPart.remove();
    }

    if (typeof toast.content === 'string') {
      contentPart.id = titleId;
      contentPart.textContent = toast.content;
    } else {
      titlePart.id = titleId;
      titlePart.textContent = toast.content?.title ?? '';
      descPart.id = descId;
      descPart.textContent = toast.content?.description ?? '';
    }

    if (toast.action?.label) {
      const actionButtonTemplate = this.#template.actionButton.content.cloneNode(true);
      const actionButton = actionButtonTemplate.querySelector(SELECTORS.actionButton);
      actionButton.textContent = toast.action.label;
      actionsPart.appendChild(actionButton);
    } else {
      actionsPart.remove();
    }

    this.#syncItemPosition(item, toast.dismissible);

    return item;
  }

  #syncItemPosition(item, dismissible) {
    item.style.setProperty(
      'view-transition-class',
      `tq-item ${getPositionViewTransitionClass(this.#position)}`,
    );

    if (!dismissible) return;

    item.querySelector(SELECTORS.toast).dataset.swipeable = getSwipeableDirection(this.#position);
  }

  /* ---------------------------------------------------------------------- */
  /* Focus                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Moves focus to the next visible toast after closing the focused toast.
   *
   * Falls back to the previous visible toast when no next toast is available.
   * Focus is moved only when the queue currently owns focus and is active.
   *
   * @param {ToastRecord} toast - Toast being closed.
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
   * Converts toast content into a string suitable for screen-reader
   * announcement.
   *
   * @param {ToastRecord} toast - Toast whose content should be announced.
   * @returns {string} Announcement text.
   */
  #getAnnouncementText(toast) {
    if (typeof toast.content === 'string') return toast.content;
    if (!toast.content) return '';

    return [toast.content.title, toast.content.description].filter(Boolean).join('. ');
  }

  /**
   * Announces a toast to assistive technology.
   *
   * Prefers `Element.ariaNotify()` and falls back to `Document.ariaNotify()`.
   * No announcement is made when neither API is available.
   *
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
