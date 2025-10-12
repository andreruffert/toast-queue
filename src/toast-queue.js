import { Swipeable } from './swipeable';
import { Timer, inflect, wrapInViewTransition } from './utils';

const ROOT_TEMPLATE = document.createElement('template');
ROOT_TEMPLATE.innerHTML = `<section data-toastq-part="popover"><ol data-toastq-part="group"></ol></section>`;

const ITEM_TEMPLATE = document.createElement('template');
ITEM_TEMPLATE.innerHTML = `<li data-toastq-part="item">
  <div data-toastq-part="toast">
    <div data-toastq-part="content">
      <span slot="title"></span>
      <span slot="description"></span>
    </div>
    <div data-toastq-part="actions"></div>
    <button type="button" data-toastq-part="close-button" data-toastq-command="close" aria-label="Close">&times;</button>
  </div>
</li>`;

const partSelectors = {
  popover: '[data-toastq-part="popover"]',
  group: '[data-toastq-part="group"]',
  item: '[data-toastq-part="item"]',
  toast: '[data-toastq-part="toast"]',
  content: '[data-toastq-part="content"]',
  actions: '[data-toastq-part="actions"]',
};

const notificationInflection = inflect('notification')('notifications');

export class ToastQueue {
  #queue = new Set();
  #timeout = null;
  /** @typedef ToastPosition 'top start' | 'top center' | 'top end' | 'bottom start' | 'bottom center' | 'bottom end' */
  #toastPosition = 'top end';
  #viewMode = null;
  #popover;
  #group;
  #swipeable;

  /**
   * @typedef {Object} ToastQueueOptions
   * @property {number} timeout - A timeout to automatically close the toast after, in milliseconds.
   * @property {ToastPosition} position -
   * @property {string} viewMode -
   * @property {HTMLElement} root -
   */
  constructor(options) {
    const root = options?.root || document.body;
    const rootTemplate = options?.rootTemplate || ROOT_TEMPLATE;
    const template = rootTemplate.content.cloneNode(true);

    this.#timeout = options.timeout || this.#timeout;
    this.#toastPosition = options?.position || this.#toastPosition;
    this.#viewMode = options?.viewMode || this.#viewMode;
    this.#popover = template.querySelector(partSelectors.popover);
    this.#popover.setAttribute('popover', 'manual');
    this.#popover.setAttribute('role', 'region');
    this.#popover.setAttribute('aria-label', 'Notifications');
    this.#popover.setAttribute('tabindex', '-1');
    this.#popover.dataset.toastqPosition = this.#toastPosition;
    if (this.#viewMode) this.#popover.dataset.toastqViewMode = this.#viewMode;
    this.#group = template.querySelector(partSelectors.group);

    root.appendChild(template);

    this.#swipeable = new Swipeable({
      selector: '[data-toastq-id]',
      direction: getSwipeableDirection(this.#toastPosition),
      removeFunction: (target) => {
        this.close(target.dataset.toastqId);
      },
    });

    this.#group.addEventListener('pointerover', (event) => {
      if (!event.target.closest(partSelectors.group)) return;
      this.pauseAll();
    });

    this.#group.addEventListener('pointerout', (event) => {
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
      if (event.target.dataset.toastqCommand === 'close') {
        const toastId = event.target.closest(partSelectors.toast).dataset.toastqId;
        this.close(toastId);
        return;
      }

      if (event.target.dataset.toastqCommand === 'action') {
        const toastId = event.target.closest(partSelectors.toast).dataset.toastqId;
        const toast = this.get(toastId);
        toast?.actionButton?.onClick();
        return;
      }
    });
  }

  #createToastRef(options) {
    const timeout = options?.timeout || this.#timeout;
    const toastId = Math.random().toString(36).slice(2);
    return {
      id: toastId,
      index: this.#queue.size + 1,
      timer: timeout ? new Timer(() => this.close(toastId), timeout) : undefined,
      dismissible: options?.dismissible !== false,
      content: options?.content,
      actionButton: options?.actionButton || undefined,
      onClose: options?.onClose || undefined,
    };
  }

  set viewMode(value) {
    if (value === null && this.#queue.size <= 1) return;
    this.#viewMode = value;
    wrapInViewTransition(() => {
      if (this.#viewMode) {
        this.#popover.dataset.toastqViewMode = this.#viewMode;
      } else {
        delete this.#popover.dataset.toastqViewMode;
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
    for (const element of this.#group.childNodes) {
      element.style.setProperty(
        'view-transition-class',
        `toast ${getPositionViewTransitionClass(this.#toastPosition)}`,
      );
    }
    wrapInViewTransition(() => {
      this.#popover.dataset.toastqPosition = this.#toastPosition;
    });
  }

  update(fn) {
    if (this.#queue.size === 1) this.#popover.showPopover();
    if (this.#queue.size === 0) this.#popover.hidePopover();
    if (typeof fn === 'function') wrapInViewTransition(fn); // DOM mutations

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
   * @param {number} options.timeout
   * @param {number} options.dismissible
   * @param {object} options.actionButton
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
    toastPart.dataset.toastqId = toastRef.id;
    toastPart.dataset.toastqDismissible = toastRef.dismissible;
    toastPart.setAttribute('tabindex', '0');
    toastPart.setAttribute('role', 'alertdialog');
    toastPart.setAttribute('aria-modal', 'false');
    toastPart.setAttribute('aria-labelledby', ariaLabelId);
    toastPart.setAttribute('aria-describedby', ariaDescId);
    toastPart.style.setProperty('view-transition-name', `toast-${toastRef.id}`);
    toastPart.style.setProperty(
      'view-transition-class',
      `toast ${getPositionViewTransitionClass(this.#toastPosition)}`,
    );
    // Ensure capture pointer events will work properly on touch devices
    toastPart.style.setProperty('touch-action', 'none');

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

    const toastActions = template.querySelector(partSelectors.actions);
    if (toastRef.actionButton) {
      // TODO: Add support for multiple action buttons passing an array of objects.
      toastActions.innerHTML = `<button type="button" data-toastq-part="action-button" data-toastq-command="action">${toastRef.actionButton.label}</button>`;
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
    this.update(() => {
      this.#group.querySelector(`li:has([data-toastq-id="${id}"])`).remove();
    });
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
