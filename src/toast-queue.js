import { Swipeable } from './swipeable';
import {
  getPlacementViewTransitionClass,
  getSwipeableDirection,
  inflect,
  randomId,
  Timer,
  wrapInViewTransition,
} from './utils';

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

const notificationInflection = inflect('notification')('notifications');

export class ToastQueue {
  #options = null;
  #queue = new Set();
  #duration = 6000;
  /** @typedef ToastQueuePlacement 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end' | center */
  #placement = 'top-end';
  #mode = null;
  #template = {
    root: document.createElement('template'),
    item: document.createElement('template'),
    actionButton: document.createElement('template'),
  };
  #rootPart;
  #groupPart;
  #swipeable;

  /**
   * @typedef {object} ToastQueueOptions
   * @property {number} duration - The amount of time, in milliseconds, that the toast will remain open before closing automatically.
   * @property {ToastQueuePlacement} placement -
   * @property {string} mode -
   * @property {HTMLElement} root -
   * @property {boolean} pauseOnPageIdle -
   * @property {object} template - HTML templates
   * @property {string} template.root -
   * @property {string} template.item -
   * @property {string} template.actionButton -
   *
   * @param {ToastQueueOptions} options
   */
  constructor(options) {
    this.#options = options;
    this.#duration = typeof options?.duration !== 'undefined' ? options.duration : this.#duration;
    this.#placement = options?.placement || this.#placement;
    this.#mode = options?.mode || this.#mode;

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
    if (this.#mode) this.#rootPart.dataset.mode = this.#mode;
    this.#groupPart = rootPart.querySelector(SELECTORS.group);

    (options?.root || document.body).appendChild(rootPart);

    this.#swipeable = new Swipeable({
      onSwipe: ({ target }) => {
        const toastId = target?.dataset?.id;
        if (!toastId) return;
        this.close(toastId);
      },
    });

    // Attach event listeners
    document.addEventListener('visibilitychange', this.#onPageIdle);
    this.#rootPart.addEventListener('click', this.#onCommand);
    this.#rootPart.addEventListener('pointerover', this.#onActive);
    this.#rootPart.addEventListener('pointerout', this.#onInactive);
  }

  #onPageIdle = () => {
    if (this.#options?.pauseOnPageIdle === false) return;
    if (document.visibilityState === 'hidden') {
      this.pause();
    } else {
      this.resume();
    }
  };

  #onCommand = (event) => {
    const cmd = event.target.dataset.command;
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
    if (cmd === 'toggle-mode') {
      if (this.#options?.mode) this.mode = this.#options.mode;
      return;
    }
  };

  #onActive = () => {
    this.pause();
  };

  #onInactive = () => {
    this.resume();
  };

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

  set mode(value) {
    if (value === null && this.#queue.size <= 1) return;
    if (this.#mode === value) return;
    this.#mode = value;
    wrapInViewTransition(() => {
      if (this.#mode) {
        this.#rootPart.dataset.mode = this.#mode;
      } else {
        delete this.#rootPart.dataset.mode;
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
   *
   * @param {function} updateDOM
   * @param {boolean} skipTransition
   */
  async update(updateDOM, skipTransition = false) {
    this.#rootPart.setAttribute(
      'aria-label',
      `${this.#queue.size} ${notificationInflection(this.#queue.size)}`,
    );

    if (this.#queue.size === 1) this.#rootPart.showPopover();
    if (typeof updateDOM === 'function') {
      skipTransition ? updateDOM() : await wrapInViewTransition(updateDOM).finished;
    }
    if (this.#queue.size === 0) {
      this.#rootPart.hidePopover();
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
   * @param {string} options.icon
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
    const template = this.#template.item.content.cloneNode(true);
    const newItem = template.querySelector(SELECTORS.item);
    const toastPart = newItem.querySelector(SELECTORS.toast);
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

    if (toastRef.dismissible) toastPart.dataset.swipeable = getSwipeableDirection(this.#placement);
    if (options?.className) toastPart.classList.add(...options.className.split(' '));
    if (options?.dismissible === false) toastPart.querySelector(SELECTORS.closeButton).remove();
    if (content?.description) toastPart.setAttribute('aria-describedby', ariaDescId);

    /** Toast icon */
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
      contentPart.id = ariaLabelId;
      contentPart.textContent = content;
    } else {
      const titlePart = template.querySelector(SELECTORS.title);
      const descPart = template.querySelector(SELECTORS.desc);
      titlePart.id = ariaLabelId;
      titlePart.textContent = content?.title;
      descPart.id = ariaDescId;
      descPart.textContent = content?.description;
    }

    /** Toast actions */
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
    this.update(() => this.#groupPart.prepend(newItem));

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
            toast.itemRef.remove();
          },
          // Skip view transition for elements not visible in the UI
          !toast.itemRef.checkVisibility(),
        );
      }
    }
  }

  /** Clears all toasts. */
  clear() {
    this.#queue.clear();
    this.update(() => {
      this.#groupPart.innerHTML = '';
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
    document.removeEventListener('visibilitychange', this.#onPageIdle);
    this.#rootPart.removeEventListener('click', this.#onCommand);
    this.#rootPart.removeEventListener('pointerover', this.#onActive);
    this.#rootPart.removeEventListener('pointerout', this.#onInactive);
    this.#rootPart.remove();
    this.#swipeable.destroy();
  }
}
