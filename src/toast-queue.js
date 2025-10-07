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

const getpositionViewTransitionClass = (position) => {
  if (position === 'top start') return 'block-start inline-start';
  if (position === 'top center') return 'block-start';
  if (position === 'top end') return 'block-start inline-end';
  if (position === 'bottom start') return 'block-end inline-start';
  if (position === 'bottom center') return 'block-end';
  if (position === 'bottom end') return 'block-end inline-end';
};

const getSwipeableDirection = (position) => {
  if (position === 'top start') return 'inline-start';
  if (position === 'top center') return 'block-start';
  if (position === 'top end') return 'inline-end';
  if (position === 'bottom start') return 'inline-start';
  if (position === 'bottom center') return 'block-end';
  if (position === 'bottom end') return 'inline-end';
};

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
  #timeout = null;
  /** @typedef ToastPosition 'top start' | 'top center' | 'top end' | 'bottom start' | 'bottom center' | 'bottom end' */
  #toastPosition = 'top end';
  #isMinimized = false;
  #order = 'reversed';
  #popover;
  #region;
  #swipeable;

  /**
   * @typedef {Object} ToastQueueOptions
   * @property {number} timeout -
   * @property {ToastPosition} position -
   * @property {boolean} minimized -
   * @property {number} order -
   * @property {string} root -
   */
  constructor(options) {
    const root = options?.root || document.body;
    const toastRegion =
      options?.toastRegionTemplate?.content.cloneNode(true) ||
      TOAST_REGION_TEMPLATE.content.cloneNode(true);

    this.#timeout = options?.timeout !== undefined ? options.timeout : this.#timeout;
    this.#toastPosition = options?.position || this.#toastPosition;
    this.#isMinimized = options?.minimized || this.#isMinimized;
    this.#order = options?.order || this.#order;
    this.#popover = toastRegion.querySelector(partSelectors.popover);
    this.#popover.dataset.toastqPosition = this.#toastPosition;
    if (this.#isMinimized) this.#popover.dataset.toastqMinimized = '';
    this.#region = toastRegion.querySelector(partSelectors.region);

    root.appendChild(toastRegion);

    this.#swipeable = new Swipeable({
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

      if (options.minimized) {
        // Easy close maximized
        if (!event.target.closest(partSelectors.popover)) {
          if (!this.#isMinimized) {
            this.isMinimized = true;
          }
          return;
        }

        // Maximize
        if (event.target.closest('[data-toastq-minimized]')) {
          if (event.target.closest('[data-toastq-dragging]')) return;
          this.isMinimized = false;
          return;
        }

        // Minimize
        if (event.target.dataset.toastqCommand === 'minimize') {
          this.isMinimized = true;
          return;
        }
      }
    });
  }

  set isMinimized(value) {
    if (value === false && this.#queue.size <= 1) return;
    this.#isMinimized = value;
    wrapInViewTransition(() => {
      if (this.#isMinimized) {
        this.#popover.dataset.toastqMinimized = '';
      } else {
        delete this.#popover.dataset.toastqMinimized;
      }
    });
  }

  get isMinimized() {
    return this.#isMinimized;
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
        `toast ${getpositionViewTransitionClass(this.#toastPosition)}`,
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
   *
   * @param {*} content
   * @param {object} options
   * @param {number} options.timeout
   * @param {object} options.actionButton
   * @param {function} options.onClose
   * @returns
   */
  add(content, options) {
    const timeout = options?.timeout || this.#timeout;
    const toastRef = {
      id: Math.random().toString(36).slice(2),
      index: this.#queue.size + 1,
      timer: timeout ? new Timer(() => this.delete(toastId), timeout) : undefined,
      content,
      actionButton: options?.actionButton || undefined,
      onClose: options?.onClose || undefined,
    };

    this.#queue.add(toastRef);

    this.update(() => {
      const clone = TOAST_ITEM_TEMPLATE.content.cloneNode(true);
      const ariaLabelId = `aria-label-${toastRef.id}`;
      const toastItem = clone.querySelector(partSelectors.item);
      const toastContent = clone.querySelector(partSelectors.content);
      const toastActions = clone.querySelector(partSelectors.actions);
      toastItem.dataset.toastqId = toastRef.id;
      toastItem.setAttribute('tabindex', '0');
      toastItem.setAttribute('aria-labelledby', ariaLabelId);
      toastItem.style.setProperty('view-transition-name', `toast-${toastRef.id}`);
      toastItem.style.setProperty(
        'view-transition-class',
        `toast ${getpositionViewTransitionClass(this.#toastPosition)}`,
      );
      // Make sure capture pointer events will work properly on touch devices
      toastItem.style.setProperty('touch-action', 'none');

      // TODO: Add support for multiple action buttons passing an array of objects.
      if (toastRef.actionButton) {
        toastActions.innerHTML = `<button type="button" data-toastq-part="action-button" data-toastq-command="action">${toastRef.actionButton.label}</button>`;
      }
      toastContent.innerHTML = `${toastRef.content}`;
      toastContent.setAttribute('id', ariaLabelId);

      if (this.#order === 'reversed') {
        // newest first
        this.#region.prepend(toastItem);
      } else {
        // newest last
        this.#region.appendChild(toastItem);
      }
    });

    return toastRef;
  }

  /* Delete toast by ID */
  delete(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        if (typeof toast.onClose === 'function') {
          toast.onClose();
        }
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
