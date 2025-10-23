import { Swipeable } from './swipeable';
import { inflect, Timer, wrapInViewTransition } from './utils';

const ROOT_TEMPLATE = document.createElement('template');
ROOT_TEMPLATE.innerHTML = `<section data-tq-part="popover"><ol data-tq-part="group"></ol></section>`;

const ITEM_TEMPLATE = document.createElement('template');
ITEM_TEMPLATE.innerHTML = `<li data-tq-part="item">
  <div data-tq-part="toast">
    <div data-tq-part="content">
      <span slot="title"></span>
      <span slot="description"></span>
    </div>
    <div data-tq-part="actions"></div>
    <button type="button" data-tq-part="close-button" data-tq-command="close" aria-label="Close">&times;</button>
  </div>
</li>`;

const partSelectors = {
  popover: '[data-tq-part="popover"]',
  group: '[data-tq-part="group"]',
  item: '[data-tq-part="item"]',
  toast: '[data-tq-part="toast"]',
  content: '[data-tq-part="content"]',
  actions: '[data-tq-part="actions"]',
};

const notificationInflection = inflect('notification')('notifications');

export class ToastQueue {
  #queue = new Set();
  #duration = null;
  /** @typedef ToastPosition 'top start' | 'top center' | 'top end' | 'bottom start' | 'bottom center' | 'bottom end' */
  #toastPosition = 'top end';
  #viewMode = null;
  #popover;
  #group;
  #swipeable;

  /**
   * @typedef {Object} ToastQueueOptions
   * @property {number} duration - The amount of time, in milliseconds, that the toast will remain open before closing automatically.
   * @property {ToastPosition} position -
   * @property {string} viewMode -
   * @property {HTMLElement} root -
   */
  constructor(options) {
    const root = options?.root || document.body;
    const rootTemplate = options?.rootTemplate || ROOT_TEMPLATE;
    const template = rootTemplate.content.cloneNode(true);

    this.#duration = options?.duration || this.#duration;
    this.#toastPosition = options?.position || this.#toastPosition;
    this.#viewMode = options?.viewMode || this.#viewMode;
    this.#popover = template.querySelector(partSelectors.popover);
    this.#popover.setAttribute('popover', 'manual');
    this.#popover.setAttribute('role', 'region');
    this.#popover.setAttribute('aria-label', 'Notifications');
    this.#popover.setAttribute('tabindex', '-1');
    this.#popover.dataset.tqPosition = this.#toastPosition;
    if (this.#viewMode) this.#popover.dataset.tqViewMode = this.#viewMode;
    this.#group = template.querySelector(partSelectors.group);

    root.appendChild(template);

    this.#swipeable = new Swipeable({
      selector: '[data-tq-id]',
      direction: getSwipeableDirection(this.#toastPosition),
      removeFunction: (target) => {
        this.close(target.dataset.tqId);
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

    this.#popover.addEventListener('click', (event) => {
      if (event.target.dataset.tqCommand === 'close') {
        const toastId = event.target.closest(partSelectors.toast).dataset.tqId;
        this.close(toastId);
        return;
      }

      if (event.target.dataset.tqCommand === 'action') {
        const toastId = event.target.closest(partSelectors.toast).dataset.tqId;
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

  set viewMode(value) {
    if (value === null && this.#queue.size <= 1) return;
    this.#viewMode = value;
    wrapInViewTransition(() => {
      if (this.#viewMode) {
        this.#popover.dataset.tqViewMode = this.#viewMode;
      } else {
        delete this.#popover.dataset.tqViewMode;
      }
    });
  }

  get viewMode() {
    return this.#viewMode;
  }

  get position() {
    return this.#toastPosition;
  }

  /**
   * @param {string} Toastposition - Toast position
   */
  set position(value) {
    this.#toastPosition = value;
    this.#swipeable.direction = getSwipeableDirection(value);
    for (const toast of this.#group.querySelectorAll(partSelectors.toast)) {
      toast.style.setProperty(
        'view-transition-class',
        `tq-toast ${getPositionViewTransitionClass(this.#toastPosition)}`,
      );
    }
    wrapInViewTransition(() => {
      this.#popover.dataset.tqPosition = this.#toastPosition;
    });
  }

  update(fn, skipTransition = false) {
    if (this.#queue.size === 1) this.#popover.showPopover();
    if (this.#queue.size === 0) this.#popover.hidePopover();
    if (typeof fn === 'function' && !skipTransition) wrapInViewTransition(fn); // DOM mutations

    this.#popover.setAttribute(
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
    const ariaLabelId = `aria-label-${toastRef.id}`;
    const ariaDescId = `aria-desc-${toastRef.id}`;
    const template = ITEM_TEMPLATE.content.cloneNode(true);
    const toastItem = template.querySelector(partSelectors.item);

    const toastPart = toastItem.querySelector(partSelectors.toast);
    toastPart.dataset.tqId = toastRef.id;
    toastPart.dataset.tqDismissible = toastRef.dismissible;
    toastPart.setAttribute('tabindex', '0');
    toastPart.setAttribute('role', 'alertdialog');
    toastPart.setAttribute('aria-modal', 'false');
    toastPart.setAttribute('aria-labelledby', ariaLabelId);
    toastPart.setAttribute('aria-describedby', ariaDescId);
    toastPart.style.setProperty('view-transition-name', `toast-${toastRef.id}`);
    toastPart.style.setProperty(
      'view-transition-class',
      `tq-toast ${getPositionViewTransitionClass(this.#toastPosition)}`,
    );
    // Ensure capture pointer events will work properly on touch devices
    toastPart.style.setProperty('touch-action', 'none');

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
      const titleSlot = template.querySelector('[slot="title"]');
      const descSlot = template.querySelector('[slot="description"]');
      titleSlot.id = ariaLabelId;
      titleSlot.textContent = content?.title;
      descSlot.id = ariaDescId;
      descSlot.textContent = content?.description;
    }

    if (toastRef.actionLabel) {
      const toastActions = template.querySelector(partSelectors.actions);
      toastActions.innerHTML = `<button type="button" data-tq-part="action-button" data-tq-command="action">${toastRef.actionLabel}</button>`;
    }

    this.#queue.add(toastRef);
    this.update(() => this.#group.prepend(toastItem));

    return toastRef;
  }

  /* Closes a toast by ID */
  close(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        if (typeof toast.onClose === 'function') toast.onClose();
        this.#queue.delete(toast);
      }
    }
    this.update(
      () => {
        this.#group.querySelector(`li:has([data-tq-id="${id}"])`).remove();
      },
      // Skip view transition for elements not visible in the UI
      this.#group.querySelector(`li:has([data-tq-id="${id}"])`).offsetParent === null,
    );
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
    this.#popover.remove();
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
