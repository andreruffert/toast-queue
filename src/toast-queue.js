import { Swipeable } from './swipeable';
import { Timer, wrapInViewTransition } from './utils';

const TOAST_CONTAINER_TEMPLATE = document.createElement('template');
TOAST_CONTAINER_TEMPLATE.innerHTML =
  '<section data-toast="popover" popover="manual"><div data-toast="actions"><button data-toast-button="minimize">Show less</button></div><ul data-toast="container" data-minimized></ul></section>';

const TOAST_TEMPLATE = document.createElement('template');
TOAST_TEMPLATE.innerHTML = `<li data-toast="root" role="alertdialog" aria-modal="false" tabindex="0">
  <div data-toast="notification">
    <div data-toast="content" role="alert" aria-atomic="true"></div>
    <button data-toast-button="clear">x</button>
  </div>
</li>`;

const MAX_TOASTS = 5;

const getPlacementViewTransitionClass = (placement) => {
  if (placement === 'top') return 'block-start inline-start';
  if (placement === 'top center') return 'block-start';
  if (placement === 'top end') return 'block-start inline-end';
  if (placement === 'bottom') return 'block-end inline-start';
  if (placement === 'bottom center') return 'block-end';
  if (placement === 'bottom end') return 'block-end inline-end';
};

const getSwipeableDirection = (placement) => {
  if (placement === 'top') return 'inline-start';
  if (placement === 'top center') return 'block-start';
  if (placement === 'top end') return 'inline-end';
  if (placement === 'bottom') return 'inline-start';
  if (placement === 'bottom center') return 'block-end';
  if (placement === 'bottom end') return 'inline-end';
};

export class ToastQueue {
  #queue = new Set();
  #timeout = 8000;
  /** @type ToastPlacement 'top' | 'top center' | 'top end' | 'bottom' | 'bottom center' | 'bottom end' */
  #placement = 'top end';
  #popover;
  #container;
  #swipeable;

  constructor(options) {
    this.#timeout = options?.timeout !== undefined ? options.timeout : this.#timeout;
    this.#placement = options?.placement || this.#placement;

    const root = options?.root || document.body;
    const toastContainer = TOAST_CONTAINER_TEMPLATE.content.cloneNode(true);
    this.#popover = toastContainer.querySelector('[data-toast="popover"]');
    this.#popover.dataset.toastPlacement = this.#placement;
    this.#container = toastContainer.querySelector('[data-toast="container"]');
    root.appendChild(toastContainer);

    this.#swipeable = new Swipeable({
      direction: getSwipeableDirection(this.#placement),
      removeFunction: (target) => {
        const id = target.dataset.toastId;
        this.close(id);
      },
    });

    this.#popover.addEventListener('click', (event) => {
      console.log('click', event.target.dataset);

      if (event.target.dataset.toastButton === 'minimize') {
        wrapInViewTransition(() => {
          this.#container.setAttribute('data-minimized', '');
        });

        return;
      }

      // if (event.target.closest('[data-toast="container"]')?.dataset.minimized !== '') return;
      if (event.target.dataset.toastButton === 'clear') {
        const toastId = event.target.closest('[data-toast-id]').dataset.toastId;
        this.close(toastId);
        return;
      }

      wrapInViewTransition(() => {
        this.#container.removeAttribute('data-minimized', '');
      });
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

  get placement() {
    return this.#placement;
  }

  /**
   * @param {string} ToastPlacement - Toast placement
   */
  set placement(value) {
    this.#placement = value;
    this.#popover.dataset.toastPlacement = value;
    this.#swipeable.direction = getSwipeableDirection(value);

    // Update existing view transition classes
    for (const toast of this.#queue) {
      toast.ref.style.setProperty(
        'view-transition-class',
        `toast ${getPlacementViewTransitionClass(value)}`,
      );
    }
  }

  render(toasts = []) {
    this.#container.style.setProperty('--numtoasts', this.#queue.size);
    this.#container.setAttribute('aria-label', `${this.#queue.size} notifications`);

    wrapInViewTransition(() => {
      if (toasts.length === 0) {
        this.#popover.hidePopover();
      }
      if (toasts.length === 1) {
        this.#popover.showPopover();
      }

      this.#container.innerHTML = '';

      for (const toast of toasts) {
        if (this.#container.firstChild) {
          this.#container.insertBefore(toast.ref, this.#container.firstChild);
        } else {
          this.#container.appendChild(toast.ref);
        }
      }

      // toastNotification.scrollIntoView();
    });
  }

  add(content, variant, options) {
    const timeout = options?.timeout || this.#timeout;
    const clone = TOAST_TEMPLATE.content.cloneNode(true);
    const toastId = Math.random().toString(36).slice(2);
    const labelId = `aria-label-${toastId}`;

    const toastRoot = clone.querySelector('[data-toast="root"]');
    const toastNotification = clone.querySelector('[data-toast="notification"]');
    const toastContent = clone.querySelector('[data-toast="content"]');
    const toastClearButton = clone.querySelector('[data-toast-button="clear"]');

    toastRoot.dataset.toastId = toastId;
    toastRoot.setAttribute('aria-labelledby', labelId);
    toastRoot.style.setProperty('--index', this.#queue.size + 1);
    toastRoot.style.setProperty('view-transition-name', `toast-${toastId}`);
    toastRoot.style.setProperty(
      'view-transition-class',
      `toast ${getPlacementViewTransitionClass(this.#placement)}`,
    );
    toastContent.textContent = content;
    toastContent.setAttribute('id', labelId);

    this.#queue.add({
      id: toastId,
      index: this.#queue.size + 1,
      ref: toastRoot,
      timer: timeout ? new Timer(() => this.close(toastId), timeout) : undefined,
    });

    this.render(
      Array.from(this.#queue)
        .reverse()
        .filter((_, i) => i <= MAX_TOASTS)
        .reverse(),
    );

    return toastRoot;
  }

  close(id) {
    let toastRef;

    for (const toast of this.#queue) {
      if (toast.id === id) {
        toastRef = toast.ref;
        this.#queue.delete(toast);
      }

      // toast.index = toast.index - 1;
      // toast.ref.style.setProperty('--index', toast.index);
    }

    // toastRef.remove();
    this.render(
      Array.from(this.#queue)
        .reverse()
        .filter((_, i) => i <= MAX_TOASTS)
        .reverse(),
    );
  }

  /** Clear all toasts. */
  clearAll() {
    for (const toast of this.#queue) {
      toast.ref.remove();
    }
    this.#queue.clear();
    this.render([]);
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
