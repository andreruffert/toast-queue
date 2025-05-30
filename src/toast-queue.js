import { Swipeable } from './swipeable';
import { Timer, wrapInViewTransition } from './utils';

const TOAST_CONTAINER_TEMPLATE = document.createElement('template');
TOAST_CONTAINER_TEMPLATE.innerHTML = `<section data-toast="popover" popover="manual" data-minimized>
  <div data-toast="actions">
    <button data-toast-button="minimize">Show less</button>
    <button data-toast-button="clear-all">Clear all</button>
  </div>
  <ul data-toast="container"></ul>
</section>`;

const TOAST_TEMPLATE = document.createElement('template');
TOAST_TEMPLATE.innerHTML = `<li data-toast="root" role="alertdialog" aria-modal="false" tabindex="0">
  <div data-toast="notification">
    <div data-toast="content" role="alert" aria-atomic="true"></div>
    <button data-toast-button="clear">x</button>
  </div>
</li>`;

const MAX_TOASTS = 6;

const render = (where, what) => {
  where.innerHTML = what();
};

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

export class ToastQueue {
  #queue = new Set();
  #timeout = null;
  /** @type ToastPosition 'top' | 'top center' | 'top end' | 'bottom' | 'bottom center' | 'bottom end' */
  #position = 'top end';
  #isMinimized = true;
  #popover;
  #container;
  #swipeable;

  /**
   * @typedef {Object} ToastQueueOptions
   * @property {number} timeout -
   * @property {string} position -
   * @property {string} root -
   */
  constructor(options) {
    this.#timeout = options?.timeout !== undefined ? options.timeout : this.#timeout;
    this.#position = options?.position || this.#position;

    const root = options?.root || document.body;
    const toastContainer = TOAST_CONTAINER_TEMPLATE.content.cloneNode(true);
    this.#popover = toastContainer.querySelector('[data-toast="popover"]');
    this.#popover.dataset.toastPosition = this.#position;
    this.#container = toastContainer.querySelector('[data-toast="container"]');
    root.appendChild(toastContainer);

    this.#swipeable = new Swipeable({
      direction: getSwipeableDirection(this.#position),
      removeFunction: (target) => {
        const id = target.dataset.toastId;
        this.delete(id);
      },
    });

    this.#container.addEventListener('pointerover', (event) => {
      if (!event.target.closest('[data-toast="container"]')) return;
      this.pauseAll();
    });

    this.#container.addEventListener('pointerout', (event) => {
      this.resumeAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    });
  }

  set isMinimized(value) {
    this.#isMinimized = value;
    this.update();
  }

  get isMinimized() {
    return this.#isMinimized;
  }

  get position() {
    return this.#position;
  }

  /**
   * @param {string} Toastposition - Toast position
   */
  set position(value) {
    this.#position = value;
    this.#swipeable.direction = getSwipeableDirection(value);
    this.update();
  }

  update() {
    if (this.#queue.size === 1) this.#popover.showPopover();
    if (this.#queue.size === 0) this.#popover.hidePopover();

    this.#container.setAttribute('aria-label', `${this.#queue.size} notifications`);

    wrapInViewTransition(() => {
      this.#popover.dataset.toastPosition = this.#position;
      this.#isMinimized ? this.#popover.dataset.minimized =  '' : delete this.#popover.dataset.minimized;
      render(this.#container, () => this.render());
    });
  }

  render() {
    const toasts = Array.from(this.#queue).slice(Math.max(this.#queue.size - MAX_TOASTS, 0));

    return toasts
      .reverse()
      .map((toast) => {
        const clone = TOAST_TEMPLATE.content.cloneNode(true);
        const toastId = toast.id;
        const ariaLabelId = `aria-label-${toastId}`;
        const toastRoot = clone.querySelector('[data-toast="root"]');
        const toastContent = clone.querySelector('[data-toast="content"]');

        toastRoot.dataset.toastId = toastId;
        toastRoot.setAttribute('aria-labelledby', ariaLabelId);
        toastRoot.style.setProperty('view-transition-name', `toast-${toastId}`);
        toastRoot.style.setProperty(
          'view-transition-class',
          `toast ${getpositionViewTransitionClass(this.#position)}`,
        );
        // Make sure capture pointer events will work properly on touch devices
        toastRoot.style.setProperty('touch-action', 'none');

        toastContent.textContent = toast?.content;
        toastContent.setAttribute('id', ariaLabelId);

        return toastRoot.outerHTML;
      })
      .join('');
  }

  add(content, variant, options) {
    const timeout = options?.timeout || this.#timeout;
    const toastId = Math.random().toString(36).slice(2);
    const toastRef = {
      id: toastId,
      index: this.#queue.size + 1,
      timer: timeout ? new Timer(() => this.delete(toastId), timeout) : undefined,
      content,
      variant,
    };

    this.#queue.add(toastRef);
    this.update();
    return toastRef;
  }

  delete(id) {
    for (const toast of this.#queue) {
      if (toast.id === id) {
        this.#queue.delete(toast);
      }
    }
    this.update();
  }

  /** Clear all toasts. */
  clearAll() {
    this.#queue.clear();
    this.update();
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
