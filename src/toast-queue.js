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
   * @typedef {Object} ToastQueueOptions
   * @property {number} duration - The amount of time, in milliseconds, that the toast will remain open before closing automatically.
   * @property {ToastQueuePlacement} placement -
   * @property {string} mode -
   * @property {HTMLElement} root -
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
        const toastId = target.querySelector('[data-part="toast"]')?.dataset?.id;
        if (!toastId) return;
        this.close(toastId);
      },
    });

    this.#addEventListeners();
  }

  #addEventListeners() {
    this.#group.addEventListener('pointerover', (event) => {
      if (!event.target.closest(partSelectors.group)) return;
      this.pauseAll();
    });

    this.#group.addEventListener('pointerout', () => {
      this.resumeAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.pauseAll();
      } else {
        this.resumeAll();
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
  }

  #createToastRef(options) {
    const duration = options?.duration || this.#duration;
    const toastId = randomId();
    return {
      id: toastId,
      index: this.#queue.size + 1,
      timer: duration ? new Timer(() => this.close(toastId), duration) : undefined,
      dismissible: options?.dismissible !== false,
      content: options?.content,
      onClose: options?.onClose,
      action: options?.action,
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
   * @param {string} Placement - toast-queue placement
   */
  set placement(value) {
    this.#placement = value;
    // this.#swipeable.direction = getSwipeableDirection(value);
    for (const toast of this.#queue) {
      toast.el.dataset.swipeable = getSwipeableDirection(value);
      toast.el.style.setProperty(
        'view-transition-class',
        `tq-item ${getPlacementViewTransitionClass(this.#placement)}`,
      );
    }
    wrapInViewTransition(() => {
      this.#root.dataset.placement = this.#placement;
    });
  }

  async update(updateDOM, skipTransition = false) {
    if (this.#queue.size === 1) this.#root.showPopover();
    if (typeof updateDOM === 'function' && !skipTransition)
      await wrapInViewTransition(updateDOM).finished;

    if (this.#queue.size === 0) {
      this.#root.hidePopover();
      // Reset initial `mode`
      if (this.#options?.mode) {
        this.mode = this.#options.mode;
      }
    }

    this.#root.setAttribute(
      'aria-label',
      `${this.#queue.size} ${notificationInflection(this.#queue.size)}`,
    );
  }

  get(toastId) {
    for (const toast of this.#queue) {
      if (toast.id === toastId) {
        return toast;
      }
    }
    return;
  }

  /**
   * @param {string} content - HTML content
   * @param {object} options
   * @param {string} options.className
   * @param {number} options.duration
   * @param {number} options.dismissible
   * @param {string} options.actionLabel
   * @param {function} options.onAction
   * @param {function} options.onClose
   * @returns
   */
  add(content, options) {
    const toastRef = this.#createToastRef({ content, ...options });
    const ariaLabelId = `${toastRef.id}-label`;
    const ariaDescId = `${toastRef.id}-desc`;
    const template = ITEM_TEMPLATE.content.cloneNode(true);
    const newItem = template.querySelector(partSelectors.item);
    newItem.style.setProperty('view-transition-name', `tq-item-${toastRef.id}`);
    newItem.style.setProperty(
      'view-transition-class',
      `tq-item ${getPlacementViewTransitionClass(this.#placement)}`,
    );

    newItem.dataset.swipeable = getSwipeableDirection(this.#placement);
    // Swipeable: Ensure capture pointer events will work properly on touch devices
    // newItem.style.setProperty('touch-action', 'none');

    const toastPart = newItem.querySelector(partSelectors.toast);
    toastPart.dataset.id = toastRef.id;
    toastPart.dataset.dismissible = toastRef.dismissible;
    toastPart.setAttribute('tabindex', '0');
    toastPart.setAttribute('role', 'alertdialog');
    toastPart.setAttribute('aria-modal', 'false');
    toastPart.setAttribute('aria-labelledby', ariaLabelId);

    if (content?.description) {
      toastPart.setAttribute('aria-describedby', ariaDescId);
    }

    if (options?.className) {
      toastPart.classList.add(...options.className.split(' '));
    }

    const contentPart = template.querySelector(partSelectors.content);
    contentPart.setAttribute('role', 'alert');
    contentPart.setAttribute('aria-atomic', 'true');
    if (typeof content === 'string') {
      contentPart.setAttribute('id', ariaLabelId);
      contentPart.innerHTML = `${toastRef.content}`;
    } else {
      const titlePart = template.querySelector(partSelectors.title);
      const descPart = template.querySelector(partSelectors.desc);
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

    toastRef.el = newItem;
    this.#queue.add(toastRef);
    this.update(() => this.#group.prepend(newItem));

    return toastRef;
  }

  /* Closes a toast by ID */
  close(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        this.#queue.delete(toast);
        if (typeof toast.onClose === 'function') toast.onClose();
        this.update(
          () => {
            toast.el.remove();
          },
          // Skip view transition for elements not visible in the UI
          toast.el.offsetParent === null,
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
  pauseAll() {
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.pause();
      }
    }
  }

  /** Resumes the timers for all toasts. */
  resumeAll() {
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.resume();
      }
    }
  }

  destroy() {
    this.#root.remove();
    // TODO remove event listeners cleanup etc.
  }
}
