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
 * HTML templates used for toast queue elements.
 * @type {Object}
 * @property {string} root - The root element template.
 * @property {string} item - The individual toast item template.
 * @property {string} actionButton - The action button template.
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
 * @type {Object}
 * @property {string} root - Selector for the root element.
 * @property {string} group - Selector for the group container.
 * @property {string} item - Selector for toast items.
 * @property {string} toast - Selector for the toast wrapper.
 * @property {string} icon - Selector for the icon element.
 * @property {string} content - Selector for the content wrapper.
 * @property {string} title - Selector for the title element.
 * @property {string} desc - Selector for the description element.
 * @property {string} closeButton - Selector for the close button.
 * @property {string} actions - Selector for the actions container.
 * @property {string} actionButton - Selector for the action button.
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
 * Inflected label for the toast queue, used for accessibility.
 * @type {Function}
 * @returns {string} "notification" (singular) or "notifications" (plural)
 * @example
 * ROOT_LABEL(1); // → "notification"
 * ROOT_LABEL(2); // → "notifications"
 * @private
 */
const ROOT_LABEL = inflect('notification')('notifications');

/**
 * Create and manage accessible toast messages that can be styled as needed.
 *
 * @class ToastQueue
 */
export class ToastQueue {
  /** @private @type {ToastQueueOptions|null} */
  #options = null;

  /** @private @type {Set} */
  #queue = new Set();

  /** @private @type {number} */
  #duration = 6000;

  /**
   * Possible activation modes for the toast queue.
   *
   * @typedef {('hover'|'click')} ToastQueueActivationMode
   */

  /** @private @type {ToastQueueActivationMode|null} */
  #activationMode = null;

  /**
   * Possible placement positions for the toast queue.
   *
   * @typedef {('top-start'|'top-center'|'top-end'|'bottom-start'|'bottom-center'|'bottom-end'|'center')} ToastQueuePlacement
   */

  /** @private @type {ToastQueuePlacement} */
  #placement = 'top-end';

  /** @private @type {Object.<string, HTMLTemplateElement>} */
  #template = {
    root: document.createElement('template'),
    item: document.createElement('template'),
    actionButton: document.createElement('template'),
  };

  /** @private @type {HTMLElement} */
  #rootPart;

  /** @private @type {HTMLElement} */
  #groupPart;

  /** @private @type {Swipeable} */
  #swipeable;

  /**
   * Configuration options for the ToastQueue.
   *
   * @typedef {Object} ToastQueueOptions
   * @property {number} [duration=6000] - Auto-dismiss duration in milliseconds.
   * @property {ToastQueueActivationMode|null} [activationMode=null] - Activation mode (e.g., 'hover', 'click'). Toggles a `data-active` attribute on the root part using a view transition.
   * @property {ToastQueuePlacement|null} [placement='top-end'] - Position on screen.
   * @property {HTMLElement} [root=document.body] - Container element for the toast queue.
   * @property {boolean} [pauseOnPageIdle=true] - Pause timers when page is hidden.
   * @property {Object} template - HTML templates for toast queue elements.
   * @property {string} template.root - Template HTML for the toast container.
   * @property {string} template.item - Template HTML for individual toast items.
   * @property {string} template.actionButton - Template HTML for action buttons.
   */

  /**
   * Creates an instance of ToastQueue.
   *
   * @param {ToastQueueOptions} options - Configuration options.
   */
  constructor(options) {
    this.#options = options;
    this.#duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    this.#activationMode =
      typeof options?.activationMode !== 'undefined'
        ? options.activationMode
        : this.#activationMode;
    this.#placement = options?.placement || this.#placement;

    this.#template.root.innerHTML = options?.template?.root || TEMPLATE.root;
    this.#template.item.innerHTML = options?.template?.item || TEMPLATE.item;
    this.#template.actionButton.innerHTML =
      options?.template?.actionButton || TEMPLATE.actionButton;

    const rootPart = this.#template.root.content.cloneNode(true);
    this.#rootPart = rootPart.querySelector(SELECTORS.root);
    this.#rootPart.setAttribute('popover', 'manual');
    this.#rootPart.setAttribute('role', 'region');
    this.#rootPart.setAttribute('aria-label', 'Notifications');
    this.#rootPart.setAttribute('tabindex', '-1');
    this.#rootPart.dataset.placement = this.#placement;
    this.#groupPart = rootPart.querySelector(SELECTORS.group);
    this.#groupPart.setAttribute('reversed', '');

    (options?.root || document.body).appendChild(rootPart);

    document.addEventListener('visibilitychange', this.#onPageIdle);
    this.#rootPart.addEventListener('pointerdown', this.#handleEvent);
    this.#rootPart.addEventListener('pointerenter', this.#handleEvent);
    this.#rootPart.addEventListener('pointerleave', this.#handleEvent);
    this.#rootPart.addEventListener('focusin', this.#handleEvent);
    this.#rootPart.addEventListener('focusout', this.#handleEvent);
    this.#rootPart.addEventListener('click', this.#handleEvent);

    this.#swipeable = new Swipeable({
      onSwipe: ({ target }) => {
        const toastId = target?.dataset?.id;
        if (!toastId) return;
        this.close(toastId);
      },
    });
  }

  /**
   * Handles page visibility changes to pause/resume toast timers.
   *
   * @private
   * @this ToastQueue
   * @returns {void}
   */
  #onPageIdle = () => {
    if (this.#options?.pauseOnPageIdle === false) return;
    if (document.visibilityState === 'hidden') {
      this.pause();
    } else {
      this.resume();
    }
  };

  /**
   * Handles delegated events for the toast queue (pointerdown, pointerenter, pointerleave, focusin, focusout, click).
   * Processes commands like close, action, and clear from toast elements and manages
   * user interaction states like hover and focus.
   *
   * @private
   * @param {Event} event - The DOM event object (e.g., pointerdown, pointerenter, pointerleave, focusin, focusout, click).
   * @listens pointerdown
   * @listens pointerenter
   * @listens pointerleave
   * @listens focusin
   * @listens focusout
   * @listens click
   */
  #handleEvent = async (event) => {
    if (event.type === 'pointerdown' && this.#activationMode === 'click') {
      // Flag to determine if focus was triggered by a click.
      this.isClick = true;
    }

    if (event.type === 'click') {
      const cmd = event.target.dataset?.command;

      if (!cmd && this.#activationMode === 'click' && event.target.closest(SELECTORS.root)) {
        if (this.#queue.size === 1) return;
        if (this.#rootPart.dataset?.active === 'true') return;

        console.debug('[toast-queue] click:activation');

        await wrapInViewTransition(() => {
          this.#rootPart.dataset.active = 'true';
        }).finished;

        document.addEventListener(
          'pointerdown',
          () => {
            // Flag to determine if focus was triggered by a click.
            this.isClick = true;
          },
          { once: true },
        );

        document.addEventListener(
          'click',
          (event) => {
            if (!event.target.closest('toast-queue') && this.#rootPart.dataset?.active === 'true') {
              console.debug('[toast-queue] click:deactivation');

              wrapInViewTransition(() => {
                delete this.#rootPart.dataset?.active;
              });
            }
          },
          { once: true },
        );

        return;
      }

      if (cmd === 'close') {
        event.stopPropagation();
        const toastId = event.target.closest(SELECTORS.toast).dataset.id;
        this.close(toastId);
        return;
      }
      if (cmd === 'action') {
        event.stopPropagation();
        const toastId = event.target.closest(SELECTORS.toast).dataset.id;
        const toast = this.get(toastId);
        toast?.action?.onClick();
        this.close(toast.id);
        return;
      }
      if (cmd === 'clear') {
        this.clear();
        return;
      }

      return;
    }

    if (event.type === 'pointerenter') {
      if (this.#rootPart.dataset?.active === 'true') return;
      this.pause();

      if (this.#queue.size === 1) return;
      if (this.#activationMode !== 'hover') return;

      console.debug('[toast-queue] pointerenter:activation');

      wrapInViewTransition(() => {
        this.#rootPart.dataset.active = 'true';
      });

      return;
    }

    if (event.type === 'pointerleave') {
      if (document.activeViewTransition) return; // Debounce invocation
      if (this.#rootPart.contains(document.activeElement)) return;
      this.resume();

      if (!this.#activationMode) return;
      if (this.#rootPart.dataset?.active !== 'true') return;

      console.debug('[toast-queue] pointerleave:deactivation');

      wrapInViewTransition(() => {
        delete this.#rootPart.dataset?.active;
      });

      return;
    }

    if (event.type === 'focusin') {
      if (this.#queue.size === 1) return;
      if (event.target.dataset?.command) return;
      this.pause();

      if (!this.#activationMode) return;
      if (this.#rootPart.dataset?.active === 'true') return;

      // Focus was triggered by a click (reset flag).
      if (this.isClick) {
        this.isClick = false;
        return;
      }

      console.debug('[toast-queue] focusin:activation');

      wrapInViewTransition(() => {
        this.#rootPart.dataset.active = 'true';
      });

      return;
    }

    if (event.type === 'focusout') {
      if (event.target.dataset?.command) return;

      // Focus will stay inside the toast queue.
      if (this.#rootPart.contains(event.relatedTarget)) return;
      this.resume();

      if (!this.#activationMode) return;
      if (this.#rootPart.dataset?.active !== 'true') return;

      // Focusout was triggered by a click (reset flag).
      if (this.isClick) {
        console.log('isClick');

        this.isClick = false;
        return;
      }

      console.debug('[toast-queue] focusout:deactivation');

      // If the document has lost focus, don't remove the toast queue focus just yet.
      // Wait until the document regains focus.
      if (!document.hasFocus()) {
        window.addEventListener(
          'focus',
          () => {
            if (this.#rootPart.contains(document.activeElement)) {
              wrapInViewTransition(() => {
                delete event.currentTarget.dataset?.active;
              });
            }
          },
          { once: true },
        );
        return;
      }

      wrapInViewTransition(() => {
        delete this.#rootPart.dataset?.active;
      });

      return;
    }
  };

  /**
   * Creates a toast reference object with the given options and default settings.
   * @private
   * @param {Object} options - Configuration options for the toast reference.
   * @returns {Object} The created toast reference.
   * @property {string} id - Unique identifier for the toast.
   * @property {number} index - Position in the queue.
   * @property {number} timestamp - Creation time in milliseconds.
   * @property {Timer|undefined} timer - Timer for auto-dismissal, if duration is set.
   * @property {boolean} dismissible - Whether the toast can be dismissed.
   * @property {string|Object} content - The toast's message content.
   * @property {string} [content.title] - Optional title of the toast.
   * @property {string} [content.description] - Optional description or message of the toast.
   * @property {Function|undefined} onClose - Close callback.
   * @property {Object|null} action - Action button configuration.
   * @property {Object|null} itemRef - Reference to the DOM element; initially null.
   */
  #createToastRef(options) {
    const duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    const toastId = randomId();
    return {
      id: toastId,
      index: this.#queue.size + 1,
      timestamp: Date.now(),
      timer: duration ? new Timer(() => this.close(toastId), duration) : undefined,
      dismissible: options?.dismissible !== false,
      content: options?.content,
      onClose: options?.onClose,
      action: options?.action,
      itemRef: null,
    };
  }

  /**
   * Updates the DOM, optionally skipping view transition.
   *
   * @private
   * @param {Function} updateDOM - Function that performs DOM updates.
   * @param {boolean} [skipTransition=false] - Whether to skip view transition.
   */
  async #update(updateDOM, skipTransition = false) {
    this.#rootPart.setAttribute(
      'aria-label',
      `${this.#queue.size} ${ROOT_LABEL(this.#queue.size)}`,
    );

    if (this.#queue.size === 1) this.#rootPart.showPopover();
    if (typeof updateDOM === 'function') {
      skipTransition ? updateDOM() : await wrapInViewTransition(updateDOM).finished;
    }
    if (this.#queue.size === 0) {
      this.#rootPart.hidePopover();
      delete this.#rootPart.dataset.active;
    }
  }

  /**
   * Gets the current toast placement.
   *
   * @returns {ToastQueuePlacement} The current placement.
   */
  get placement() {
    return this.#placement;
  }

  /**
   * Sets the toast placement position.
   *
   * @param {ToastQueuePlacement} value - The new placement.
   */
  set placement(value) {
    this.#placement = value;
    for (const toast of this.#queue) {
      const toastPart = toast.itemRef.querySelector(SELECTORS.toast);
      toastPart.style.setProperty(
        'view-transition-class',
        `tq-toast ${getPlacementViewTransitionClass(this.#placement)}`,
      );
      if (toast.dismissible) {
        toastPart.dataset.swipeable = getSwipeableDirection(value);
      }
    }
    wrapInViewTransition(() => {
      this.#rootPart.dataset.placement = this.#placement;
    });
  }

  /**
   * Retrieves a toast by its ID.
   *
   * @param {string} toastId - The ID of the toast to retrieve.
   * @returns {Object|undefined} The toast object if found, otherwise undefined.
   */
  get(toastId) {
    for (const toast of this.#queue) {
      if (toast.id === toastId) {
        return toast;
      }
    }
    return;
  }

  /**
   * @typedef {string|Object} ToastContent
   * @property {string|Object} content - The toast's content.
   * @property {string} [content.title] - Optional title of the toast.
   * @property {string} [content.description] - Optional description or message of the toast.
   */

  /**
   * Configuration options for the Toast.
   *
   * @typedef {Object} ToastOptions
   * @property {Object} [options] - Toast-specific options.
   * @property {string} [options.className] - Additional CSS class.
   * @property {number} [options.duration] - Override auto-dismiss duration.
   * @property {boolean} [options.dismissible=true] - Whether toast can be manually closed.
   * @property {string} [options.icon] - Icon HTML.
   * @property {Object|string} [options.action] - Action button configuration.
   * @property {string} options.action.label - Button label.
   * @property {Function} options.action.onClick - Click handler.
   * @property {Function} [options.onClose] - Callback when toast is closed.
   */

  /**
   * Adds a new toast notification to the queue and renders it.
   *
   * @param {ToastContent} content - The message content (text or object).
   * @param {ToastOptions} options - Toast configuration options.
   * @returns {string} The generated toast ID.
   */
  add(content, options) {
    const toastRef = this.#createToastRef({ content, ...options });
    const titleId = `tq:${toastRef.id}:title`;
    const descId = `tq:${toastRef.id}:desc`;
    const template = this.#template.item.content.cloneNode(true);
    const newItem = template.querySelector(SELECTORS.item);
    const toastPart = newItem.querySelector(SELECTORS.toast);
    toastPart.dataset.id = toastRef.id;
    toastPart.dataset.dismissible = toastRef.dismissible;
    toastPart.setAttribute('tabindex', '0');
    toastPart.setAttribute('role', 'alertdialog');
    toastPart.setAttribute('aria-modal', 'false');
    toastPart.setAttribute('aria-labelledby', titleId);
    toastPart.style.setProperty('view-transition-name', `tq-toast-${toastRef.id}`);
    toastPart.style.setProperty(
      'view-transition-class',
      `tq-toast ${getPlacementViewTransitionClass(this.#placement)}`,
    );

    if (toastRef.dismissible) toastPart.dataset.swipeable = getSwipeableDirection(this.#placement);
    if (options?.className) toastPart.classList.add(...options.className.split(' '));
    if (options?.dismissible === false) toastPart.querySelector(SELECTORS.closeButton).remove();
    if (content?.description) toastPart.setAttribute('aria-describedby', descId);

    /** Toast icon - Optional */
    const iconPart = template.querySelector(SELECTORS.icon);
    if (options?.icon) {
      iconPart.innerHTML = options.icon;
    } else {
      iconPart.remove();
    }

    /** Toast content */
    const contentPart = template.querySelector(SELECTORS.content);
    contentPart.setAttribute('role', 'alert');
    contentPart.setAttribute('aria-atomic', 'true');
    if (typeof content === 'string') {
      contentPart.id = titleId;
      contentPart.textContent = content;
    } else {
      const titlePart = template.querySelector(SELECTORS.title);
      const descPart = template.querySelector(SELECTORS.desc);
      titlePart.id = titleId;
      titlePart.textContent = content?.title;
      descPart.id = descId;
      descPart.textContent = content?.description;
    }

    /** Toast actions - Optional */
    const actionsPart = template.querySelector(SELECTORS.actions);
    if (toastRef?.action?.label) {
      const actionButtonTemplate = this.#template.actionButton.content.cloneNode(true);
      const actionButton = actionButtonTemplate.querySelector(SELECTORS.actionButton);
      actionButton.textContent = toastRef.action.label;
      actionsPart.appendChild(actionButton);
    } else {
      actionsPart.remove();
    }

    toastRef.itemRef = newItem;
    this.#queue.add(toastRef);
    this.#update(() => this.#groupPart.prepend(newItem));

    console.debug('[toast-queue] add', toastRef);

    return toastRef;
  }

  /**
   * Closes a toast by its ID.
   *
   * @param {string} id - The ID of the toast to close.
   */
  close(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        this.#queue.delete(toast);

        // Perform `ToastOptions.onClose` callback.
        if (typeof toast.onClose === 'function') toast.onClose();

        // If focus is already within the toast queue, move focus to the next or previous toast.
        if (this.#queue.size >= 1 && this.#rootPart.contains(document.activeElement)) {
          if (
            !this.#activationMode ||
            (this.#activationMode && this.#rootPart.dataset?.active === 'true')
          ) {
            const item = toast.itemRef?.nextElementSibling || toast.itemRef?.previousElementSibling;
            item?.firstElementChild?.focus();
          }
        }

        this.#update(
          () => {
            toast.itemRef.remove();
          }, // Skip transition for invisible elements
          !toast.itemRef.checkVisibility(),
        );

        console.debug('[toast-queue] close', id);
      }
    }
  }

  /** Clears all toasts from the queue. */
  clear() {
    this.#queue.clear();
    this.#update(() => {
      this.#groupPart.innerHTML = '';
    });
    console.debug('[toast-queue] clear');
  }

  /** Pauses all active toast timers. */
  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.pause();
      }
    }
    console.debug('[toast-queue] pause');
  }

  /** Resumes all paused toast timers. */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.resume();
      }
    }
    console.debug('[toast-queue] resume');
  }

  /**
   * Removes event listeners and cleans up resources.
   * @returns {void}
   */
  destroy() {
    document.removeEventListener('visibilitychange', this.#onPageIdle);
    this.#rootPart.removeEventListener('pointerdown', this.#handleEvent);
    this.#rootPart.removeEventListener('pointerenter', this.#handleEvent);
    this.#rootPart.removeEventListener('pointerleave', this.#handleEvent);
    this.#rootPart.removeEventListener('focusin', this.#handleEvent);
    this.#rootPart.removeEventListener('focusout', this.#handleEvent);
    this.#rootPart.removeEventListener('click', this.#handleEvent);
    this.#rootPart.remove();
    this.#swipeable.destroy();
  }
}
