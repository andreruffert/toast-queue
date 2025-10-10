import { Swipeable } from './swipeable';
import { Timer, inflect, wrapInViewTransition } from './utils';

const TOAST_REGION_TEMPLATE = document.createElement('template');
TOAST_REGION_TEMPLATE.innerHTML = `<section popover="manual" data-toastq-part="popover">
  <ol data-toastq-part="region"></ol>
</section>`;

const TOAST_ITEM_TEMPLATE = document.createElement('template');
TOAST_ITEM_TEMPLATE.innerHTML = `<li data-toastq-part="item">
  <div data-toastq-part="notification" role="alertdialog" aria-modal="false">
    <div data-toastq-part="content" role="alert" aria-atomic="true"></div>
    <div data-toastq-part="actions"></div>
    <button type="button" data-toastq-part="close-button" data-toastq-command="close" aria-label="Close">&times;</button>
  </div>
</li>`;

const partSelectors = {
  popover: '[data-toastq-part="popover"]',
  region: '[data-toastq-part="region"]',
  item: '[data-toastq-part="item"]',
  notification: '[data-toastq-part="notification"]',
  content: '[data-toastq-part="content"]',
  actions: '[data-toastq-part="actions"]',
};

const notificationInflection = inflect('notification')('notifications');

export class ToastQueue {
  #queue = new Set();
  #displayDuration = null;
  /** @typedef ToastPosition 'top start' | 'top center' | 'top end' | 'bottom start' | 'bottom center' | 'bottom end' */
  #toastPosition = 'top end';
  #minimized = false;
  #popover;
  #region;
  #swipeable;

  /**
   * @typedef {Object} ToastQueueOptions
   * @property {number} displayDuration -
   * @property {ToastPosition} position -
   * @property {boolean} minimized -
   * @property {string} root -
   */
  constructor(options) {
    const root = options?.root || document.body;
    const template = options?.toastRegionTemplate || TOAST_REGION_TEMPLATE;
    const toastRegion = template.content.cloneNode(true);

    this.#displayDuration =
      options?.displayDuration !== undefined ? options.displayDuration : this.#displayDuration;
    this.#toastPosition = options?.position || this.#toastPosition;
    this.#minimized = options?.minimized || this.#minimized;
    this.#popover = toastRegion.querySelector(partSelectors.popover);
    this.#popover.dataset.toastqPosition = this.#toastPosition;
    if (this.#minimized) this.#popover.dataset.toastqMinimized = '';
    this.#region = toastRegion.querySelector(partSelectors.region);

    root.appendChild(toastRegion);

    this.#swipeable = new Swipeable({
      selector: '[data-toastq-id]',
      direction: getSwipeableDirection(this.#toastPosition),
      removeFunction: (target) => {
        const id = target.dataset.toastqId;
        this.delete(id);
      },
    });

    this.#region.addEventListener('pointerover', (event) => {
      if (!event.target.closest(partSelectors.region)) return;
      this.pauseAll();
    });

    this.#region.addEventListener('pointerout', (event) => {
      this.resumeAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    });

    document.addEventListener('click', (event) => {
      if (event.target.dataset.toastqCommand === 'close') {
        const toastId = event.target.closest(partSelectors.item).dataset.toastqId;
        this.delete(toastId);
        return;
      }

      if (event.target.dataset.toastqCommand === 'action') {
        const toastId = event.target.closest(partSelectors.item).dataset.toastqId;
        const toast = this.get(toastId);
        toast?.actionButton?.onClick();
        return;
      }

      if (!options.minimized) return;

      // Backdrop minimize
      if (!event.target.closest(partSelectors.popover) && !this.#minimized) {
        this.minimized = true;
        return;
      }

      // Maximize
      if (event.target.closest('[data-toastq-minimized]')) {
        if (event.target.closest('[data-toastq-dragging]')) return;
        this.minimized = false;
        return;
      }

      // Minimize
      if (event.target.dataset.toastqCommand === 'minimize') {
        this.minimized = true;
        return;
      }
    });
  }

  #createToastRef(options) {
    const displayDuration = options?.displayDuration || this.#displayDuration;
    const toastId = Math.random().toString(36).slice(2);
    return {
      id: toastId,
      index: this.#queue.size + 1,
      timer: displayDuration ? new Timer(() => this.delete(toastId), displayDuration) : undefined,
      dismissible: options?.dismissible !== false,
      content: options?.content,
      actionButton: options?.actionButton || undefined,
      onClose: options?.onClose || undefined,
    };
  }

  set minimized(value) {
    if (value === false && this.#queue.size <= 1) return;
    this.#minimized = value;
    wrapInViewTransition(() => {
      if (this.#minimized) {
        this.#popover.dataset.toastqMinimized = '';
      } else {
        delete this.#popover.dataset.toastqMinimized;
      }
    });
  }

  get minimized() {
    return this.#minimized;
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
    for (const element of this.#region.childNodes) {
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

    this.#region.setAttribute(
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
   * @param {number} options.displayDuration
   * @param {number} options.dismissible
   * @param {object} options.actionButton
   * @param {function} options.onClose
   * @returns
   */
  add(content, options) {
    const toastRef = this.#createToastRef({ content, ...options });
    const template = TOAST_ITEM_TEMPLATE.content.cloneNode(true);
    const ariaLabelId = `aria-label-${toastRef.id}`;

    const toastItem = template.querySelector(partSelectors.item);
    toastItem.dataset.toastqId = toastRef.id;
    toastItem.dataset.toastqDismissible = toastRef.dismissible;
    toastItem.setAttribute('tabindex', '0');
    toastItem.setAttribute('aria-labelledby', ariaLabelId);
    toastItem.style.setProperty('view-transition-name', `toast-${toastRef.id}`);
    toastItem.style.setProperty(
      'view-transition-class',
      `toast ${getPositionViewTransitionClass(this.#toastPosition)}`,
    );
    // Ensure capture pointer events will work properly on touch devices
    toastItem.style.setProperty('touch-action', 'none');

    const toastContent = template.querySelector(partSelectors.content);
    toastContent.innerHTML = `${toastRef.content}`;
    toastContent.setAttribute('id', ariaLabelId);

    const toastActions = template.querySelector(partSelectors.actions);
    if (toastRef.actionButton) {
      // TODO: Add support for multiple action buttons passing an array of objects.
      toastActions.innerHTML = `<button type="button" data-toastq-part="action-button" data-toastq-command="action">${toastRef.actionButton.label}</button>`;
    }

    this.#queue.add(toastRef);

    this.update(() => {
      this.#region.prepend(toastItem);
    });

    return toastRef;
  }

  /* Delete toast by ID */
  delete(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        if (typeof toast.onClose === 'function') toast.onClose();
        this.#queue.delete(toast);
      }
    }
    this.update(() => {
      this.#region.querySelector(`[data-toastq-id="${id}"]`).remove();
    });
  }

  /** Clear all toasts. */
  clearAll() {
    this.#queue.clear();
    this.update(() => {
      this.#region.innerHTML = '';
    });
  }

  /** Pause the timer for all toasts. */
  pauseAll() {
    for (const toast of this.#queue) {
      if (toast.timer) {
        toast.timer.pause();
      }
    }
  }

  /** Resume the timer for all toasts. */
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
