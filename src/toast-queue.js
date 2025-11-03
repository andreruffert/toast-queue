import { Swipeable } from './swipeable';
import {
  getPlacementViewTransitionClass,
  getSwipeableDirection,
  inflect,
  randomId,
  Timer,
  wrapInViewTransition,
} from './utils';

const ROOT_TEMPLATE = document.createElement('template');
ROOT_TEMPLATE.innerHTML = `<toast-queue><ol data-part="group"></ol></toast-queue>`;

const ITEM_TEMPLATE = document.createElement('template');
ITEM_TEMPLATE.innerHTML = `<li data-part="item">
  <div data-part="toast">
    <div data-part="icon"></div>
    <div data-part="content">
      <span data-part="title"></span>
      <span data-part="description"></span>
    </div>
    <div data-part="actions"></div>
    <button type="button" data-part="close-button" data-command="close" aria-label="Close">&times;</button>
  </div>
</li>`;

const ACTION_BUTTON_TEMPLATE = document.createElement('template');
ACTION_BUTTON_TEMPLATE.innerHTML = `<button type="button" data-part="action-button" data-command="action"></button>`;

const partSelectors = {
  root: 'toast-queue',
  group: '[data-part="group"]',
  item: '[data-part="item"]',
  toast: '[data-part="toast"]',
  content: '[data-part="content"]',
  title: '[data-part="title"]',
  desc: '[data-part="description"]',
  closeButton: '[data-part="close-button"]',
  actions: '[data-part="actions"]',
  actionButton: '[data-part="action-button"]',
};

const notificationInflection = inflect('notification')('notifications');

export class ToastQueue {
  #options = null;
  #queue = new Set();
  #duration = 6000;
  /** @typedef ToastQueuePlacement 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end' | center */
  #placement = 'top-end';
  #mode = null;
  #root;
  #group;
  #swipeable;

  /**
   * @typedef {object} ToastQueueOptions
   * @property {number} duration - The amount of time, in milliseconds, that the toast will remain open before closing automatically.
   * @property {ToastQueuePlacement} placement -
   * @property {string} mode -
   * @property {HTMLElement} root -
   *
   * @param {ToastQueueOptions} options
   */
  constructor(options) {
    const rootTarget = options?.root || document.body;
    const rootTemplate = options?.rootTemplate || ROOT_TEMPLATE;
    const rootPart = rootTemplate.content.cloneNode(true);

    this.#options = options;
    this.#duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    this.#placement = options?.placement || this.#placement;
    this.#mode = options?.mode || this.#mode;
    this.#root = rootPart.querySelector(partSelectors.root);
    this.#root.setAttribute('popover', 'manual');
    this.#root.setAttribute('role', 'region');
    this.#root.setAttribute('aria-label', 'Notifications');
    this.#root.setAttribute('tabindex', '-1');
    this.#root.dataset.placement = this.#placement;
    if (this.#mode) this.#root.dataset.mode = this.#mode;
    this.#group = rootPart.querySelector(partSelectors.group);

    rootTarget.appendChild(rootPart);

    this.#swipeable = new Swipeable({
      onSwipe: ({ target }) => {
        const toastId = target?.dataset?.id;
        if (!toastId) return;
        this.close(toastId);
      },
    });

    this.#addEventListeners();
  }

  #addEventListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.pause();
      } else {
        this.resume();
      }
    });

    this.#root.addEventListener('click', (event) => {
      const cmd = event.target.dataset.command;

      if (cmd === 'close') {
        event.stopPropagation();
        const toastId = event.target.closest(partSelectors.toast).dataset.id;
        this.close(toastId);
        return;
      }

      if (cmd === 'action') {
        event.stopPropagation();
        const toastId = event.target.closest(partSelectors.toast).dataset.id;
        const toast = this.get(toastId);
        toast?.action?.onClick();
        this.close(toast.id);
        return;
      }

      if (cmd === 'clear') {
        this.clear();
        return;
      }

      if (cmd === 'toggle-mode') {
        if (this.#options?.mode) this.mode = this.#options.mode;
        return;
      }
    });

    this.#root.addEventListener('pointerover', (event) => {
      if (!event.target.closest(partSelectors.group)) return;
      this.pause();
    });

    this.#root.addEventListener('pointerout', () => {
      this.resume();
    });
  }

  #createToastRef(options) {
    const duration = options?.duration || this.#duration;
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
      ref: null,
    };
  }

  set mode(value) {
    if (value === null && this.#queue.size <= 1) return;
    if (this.#mode === value) return;
    this.#mode = value;
    wrapInViewTransition(() => {
      if (this.#mode) {
        this.#root.dataset.mode = this.#mode;
      } else {
        delete this.#root.dataset.mode;
      }
    });
  }

  get mode() {
    return this.#mode;
  }

  get placement() {
    return this.#placement;
  }

  /**
   * @param {ToastQueuePlacement} value - toast-queue placement
   */
  set placement(value) {
    this.#placement = value;
    for (const toast of this.#queue) {
      const toastPart = toast.ref.querySelector(partSelectors.toast);
      toastPart.style.setProperty(
        'view-transition-class',
        `tq-toast ${getPlacementViewTransitionClass(this.#placement)}`,
      );
      if (toast.dismissible) {
        toastPart.dataset.swipeable = getSwipeableDirection(value);
      }
    }
    wrapInViewTransition(() => {
      this.#root.dataset.placement = this.#placement;
    });
  }

  /**
   *
   * @param {function} updateDOM
   * @param {boolean} skipTransition
   */
  async update(updateDOM, skipTransition = false) {
    this.#root.setAttribute(
      'aria-label',
      `${this.#queue.size} ${notificationInflection(this.#queue.size)}`,
    );

    if (this.#queue.size === 1) this.#root.showPopover();
    if (typeof updateDOM === 'function') {
      skipTransition ? updateDOM() : await wrapInViewTransition(updateDOM).finished;
    }

    if (this.#queue.size === 0) {
      this.#root.hidePopover();
      // Reset initial `mode`
      if (this.#options?.mode) {
        this.mode = this.#options.mode;
      }
    }
  }

  /**
   * Receive a toast from the queue.
   *
   * @param {string} toastId
   * @returns
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
   * Creates a new toast.
   *
   * @param {object|string} content - Message
   * @param {object} options
   * @param {string} options.className
   * @param {number} options.duration
   * @param {boolean} options.dismissible
   * @param {object|string} options.action
   * @param {string} options.action.label
   * @param {function} options.action.onClick
   * @param {function} options.onClose
   * @returns
   */
  add(content, options) {
    const toastRef = this.#createToastRef({ content, ...options });
    const ariaLabelId = `${toastRef.id}-label`;
    const ariaDescId = `${toastRef.id}-desc`;
    const template = ITEM_TEMPLATE.content.cloneNode(true);
    const newItem = template.querySelector(partSelectors.item);

    const toastPart = newItem.querySelector(partSelectors.toast);
    toastPart.dataset.id = toastRef.id;
    toastPart.dataset.dismissible = toastRef.dismissible;
    toastPart.setAttribute('tabindex', '0');
    toastPart.setAttribute('role', 'alertdialog');
    toastPart.setAttribute('aria-modal', 'false');
    toastPart.setAttribute('aria-labelledby', ariaLabelId);
    toastPart.style.setProperty('view-transition-name', `tq-toast-${toastRef.id}`);
    toastPart.style.setProperty(
      'view-transition-class',
      `tq-toast ${getPlacementViewTransitionClass(this.#placement)}`,
    );

    if (toastRef.dismissible) {
      toastPart.dataset.swipeable = getSwipeableDirection(this.#placement);
    }

    if (content?.description) toastPart.setAttribute('aria-describedby', ariaDescId);
    if (options?.className) toastPart.classList.add(...options.className.split(' '));
    if (options?.dismissible === false) toastPart.querySelector(partSelectors.closeButton).remove();

    const contentPart = template.querySelector(partSelectors.content);
    const titlePart = template.querySelector(partSelectors.title);
    const descPart = template.querySelector(partSelectors.desc);

    contentPart.setAttribute('role', 'alert');
    contentPart.setAttribute('aria-atomic', 'true');

    if (typeof content === 'string') {
      contentPart.id = ariaLabelId;
      contentPart.textContent = content;
    } else {
      titlePart.id = ariaLabelId;
      titlePart.textContent = content?.title;
      descPart.id = ariaDescId;
      descPart.textContent = content?.description;
    }

    if (toastRef?.action?.label) {
      const actionsPart = template.querySelector(partSelectors.actions);
      const actionButtonTemplate = ACTION_BUTTON_TEMPLATE.content.cloneNode(true);
      const actionButton = actionButtonTemplate.querySelector(partSelectors.actionButton);
      actionButton.textContent = toastRef.action.label;
      actionsPart.appendChild(actionButton);
    }

    toastRef.ref = newItem;
    this.#queue.add(toastRef);
    this.update(() => this.#group.prepend(newItem));

    return toastRef;
  }

  /**
   * Closes a toast by ID.
   *
   * @param {string} id
   */
  close(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        this.#queue.delete(toast);
        if (typeof toast.onClose === 'function') toast.onClose();
        this.update(
          () => {
            toast.ref.remove();
          },
          // Skip view transition for elements not visible in the UI
          !toast.ref.checkVisibility(),
        );
      }
    }
  }

  /** Clears all toasts. */
  clear() {
    this.#queue.clear();
    this.update(() => {
      this.#group.innerHTML = '';
    });
  }

  /** Pauses the timers for all toasts. */
  pause() {
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.pause();
      }
    }
  }

  /** Resumes the timers for all toasts. */
  resume() {
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.resume();
      }
    }
  }

  destroy() {
    // TODO: Remove event listeners cleanup etc.
    this.#root.remove();
    this.#swipeable.destroy();
  }
}
