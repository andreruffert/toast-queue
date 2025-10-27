import { Swipeable } from './swipeable';
import { inflect, Timer, wrapInViewTransition } from './utils';

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

const partSelectors = {
  root: 'toast-queue',
  group: '[data-part="group"]',
  item: '[data-part="item"]',
  toast: '[data-part="toast"]',
  content: '[data-part="content"]',
  title: '[data-part="title"]',
  desc: '[data-part="description"]',
  actions: '[data-part="actions"]',
};

const notificationInflection = inflect('notification')('notifications');

export class ToastQueue {
  #queue = new Set();
  #duration = null;
  /** @typedef Placement 'top start' | 'top center' | 'top end' | 'bottom start' | 'bottom center' | 'bottom end' */
  #placement = 'top end';
  #mode = null;
  #root;
  #group;
  #swipeable;

  /**
   * @typedef {Object} ToastQueueOptions
   * @property {number} duration - The amount of time, in milliseconds, that the toast will remain open before closing automatically.
   * @property {Placement} placement -
   * @property {string} mode -
   * @property {HTMLElement} root -
   */
  constructor(options) {
    const root = options?.root || document.body;
    const rootTemplate = options?.rootTemplate || ROOT_TEMPLATE;
    const template = rootTemplate.content.cloneNode(true);

    this.#duration = options?.duration || this.#duration;
    this.#placement = options?.placement || this.#placement;
    this.#mode = options?.mode || this.#mode;
    this.#root = template.querySelector(partSelectors.root);
    this.#root.setAttribute('popover', 'manual');
    this.#root.setAttribute('role', 'region');
    this.#root.setAttribute('aria-label', 'Notifications');
    this.#root.setAttribute('tabindex', '-1');
    this.#root.dataset.placement = this.#placement;
    if (this.#mode) this.#root.dataset.mode = this.#mode;
    this.#group = template.querySelector(partSelectors.group);

    root.appendChild(template);

    this.#swipeable = new Swipeable({
      selector: '[data-part="item"]',
      direction: getSwipeableDirection(this.#placement),
      removeFunction: (target) => {
        const toastId = target.querySelector('[data-part="toast"]')?.dataset?.id;
        this.close(toastId);
      },
    });

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
      if (event.target.dataset.command === 'close') {
        const toastId = event.target.closest(partSelectors.toast).dataset.id;
        this.close(toastId);
        return;
      }

      if (event.target.dataset.command === 'action') {
        const toastId = event.target.closest(partSelectors.toast).dataset.id;
        const toast = this.get(toastId);
        toast?.actionButton?.onClick();
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
      actionLabel: options?.actionLabel || undefined,
      onAction: options?.onAction || undefined,
      onClose: options?.onClose || undefined,
    };
  }

  set mode(value) {
    if (value === null && this.#queue.size <= 1) return;
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
    this.#swipeable.direction = getSwipeableDirection(value);
    for (const toast of this.#group.querySelectorAll(partSelectors.toast)) {
      toast.style.setProperty(
        'view-transition-class',
        `tq-toast ${getPositionViewTransitionClass(this.#placement)}`,
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
    if (this.#queue.size === 0) this.#root.hidePopover();

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
    const toastItem = template.querySelector(partSelectors.item);
    toastItem.style.setProperty('view-transition-name', `tq-item-${toastRef.id}`);
    toastItem.style.setProperty(
      'view-transition-class',
      `tq-item ${getPositionViewTransitionClass(this.#placement)}`,
    );

    // Ensure capture pointer events will work properly on touch devices
    toastItem.style.setProperty('touch-action', 'none');

    const toastPart = toastItem.querySelector(partSelectors.toast);
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

    if (toastRef.actionLabel) {
      const toastActions = template.querySelector(partSelectors.actions);
      toastActions.innerHTML = `<button type="button" data-part="action-button" data-command="action">${toastRef.actionLabel}</button>`;
    }

    toastRef.el = toastItem;
    this.#queue.add(toastRef);
    this.update(() => this.#group.prepend(toastItem));

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

  unmount() {
    this.#root.remove();
    // TODO remove event listeners cleanup etc.
  }
}

function randomId() {
  return Math.random().toString(36).slice(2);
}

function getPositionViewTransitionClass(position) {
  if (position === 'top start') return 'block-start inline-start';
  if (position === 'top center') return 'block-start';
  if (position === 'top end') return 'block-start inline-end';
  if (position === 'bottom start') return 'block-end inline-start';
  if (position === 'bottom center') return 'block-end';
  if (position === 'bottom end') return 'block-end inline-end';
}

function getSwipeableDirection(position) {
  if (position === 'top start') return 'inline-start';
  if (position === 'top center') return 'block-start';
  if (position === 'top end') return 'inline-end';
  if (position === 'bottom start') return 'inline-start';
  if (position === 'bottom center') return 'block-end';
  if (position === 'bottom end') return 'inline-end';
}
