/**
 * @type {string[]}
 * @private
 */
const inlineDirections = ['inline', 'horizontal', 'left', 'right'];

/**
 * @type {string[]}
 * @private
 */
const blockDirections = ['block', 'vertical', 'up', 'down'];

/**
 * A class that adds swipe gesture detection to elements with the `data-swipeable` attribute.
 * @private
 */
export class Swipeable {
  /** @type {HTMLElement|null} The currently being dragged element. */
  #target = null;

  /** @type {boolean|null} Tracks if a drag gesture is currently active. */
  #isDragging = null;

  /** @type {number|null} The pointerId of the pointer currently driving the drag. */
  #pointerId = null;

  /** @type {number|null} Stores the requestAnimationFrame ID for the current drag frame. */
  #dragFrame = null;

  /** @type {number|null} The clientX coordinate where the drag started. */
  #startX = null;

  /** @type {number|null} The clientY coordinate where the drag started. */
  #startY = null;

  /** @type {string} The allowed swipe direction ('inline', 'left', 'right', 'up', 'down'). */
  #direction = 'inline';

  /** @type {number|null} The timestamp when the drag started or was last updated. */
  #timestamp = null;

  /** @type {number|null} The normalized distance (0-1) the element has been swiped. */
  #distance = null;

  /** @type {number} The current velocity of the swipe (px/ms). */
  #velocity = 0;

  /** @type {number|null} The current acceleration of the swipe ((px/ms)/ms). */
  #acceleration = null;

  /** @type {function({ target: HTMLElement }): void} Callback function triggered on a successful swipe. */
  #onSwipe = () => {};

  /**
   * @type {Document|HTMLElement}
   * Scopes which pointerdown targets this instance is allowed to claim.
   * Listeners still live on `document` (so a drag remains tracked even once
   * the pointer moves outside this element's box), but a drag only starts
   * if the target is inside `#root`. Without this, two `Swipeable`
   * instances (e.g. two `ToastQueue`s on screen at once) would both react
   * to the same pointerdown and both start dragging the same element.
   */
  #root = document;

  /** @type {AbortController} Controls all document-level event listeners added by this instance. */
  #controller = new AbortController();

  /**
   * Creates a new Swipeable instance.
   * @param {Object} options - Configuration options.
   * @param {function({ target: HTMLElement }): void} [options.onSwipe] - Callback function called when a swipe is completed.
   * @param {Document|HTMLElement} [options.root=document] - Element that scopes which `[data-swipeable]` targets this instance may claim.
   */
  constructor(options) {
    this.#onSwipe = options?.onSwipe || this.#onSwipe;
    this.#root = options?.root || this.#root;

    const { signal } = this.#controller;

    document.addEventListener('pointerdown', this.startDrag, { signal });
    document.addEventListener('pointermove', this.drag, { signal });
    document.addEventListener('pointerup', this.endDrag, { signal });
    document.addEventListener('pointercancel', this.endDrag, { signal });
  }

  /**
   * Handles the pointerdown event to initiate a drag.
   * @param {PointerEvent} event - The pointerdown event.
   * @returns {void}
   */
  startDrag = (event) => {
    // Ignore additional pointers (e.g. a second finger) while a drag is already active.
    if (this.#isDragging) return;

    const target = event.target.closest('[data-swipeable]');
    if (!target) return;
    if (!this.#root.contains(target)) return;

    this.#target = target;
    this.#target.style.setProperty('will-change', 'translate');
    this.#isDragging = true;
    this.#pointerId = event.pointerId;
    this.#startX = event.clientX;
    this.#startY = event.clientY;
    this.#direction = this.#target.dataset.swipeable || this.#direction;
    this.#timestamp = event.timeStamp;
  };

  /**
   * Handles the pointermove event to update the drag position.
   * @param {PointerEvent} event - The pointermove event.
   * @returns {void}
   */
  drag = (event) => {
    if (!this.#isDragging) return;
    if (event.pointerId !== this.#pointerId) return;
    if (this.#direction === 'left' && event.clientX - 10 > this.#startX) return;
    if (this.#direction === 'right' && event.clientX + 10 < this.#startX) return;
    if (this.#direction === 'up' && event.clientY - 10 > this.#startY) return;
    if (this.#direction === 'down' && event.clientY + 10 < this.#startY) return;

    event.preventDefault();
    this.#target.dataset.dragging = '';

    const dx = inlineDirections.includes(this.#direction) ? event.clientX - this.#startX : 0;
    const dy = blockDirections.includes(this.#direction) ? event.clientY - this.#startY : 0;
    const dt = event.timeStamp - this.#timestamp;

    // Distance is spatial, not time-dependent — always update it.
    this.#distance = inlineDirections.includes(this.#direction)
      ? Math.abs(dx) / this.#target.offsetWidth
      : Math.abs(dy) / this.#target.offsetHeight;

    // Velocity/acceleration divide by dt, so they still need the guard.
    if (dt > 0) {
      const velocityX = dx / dt;
      const velocityY = dy / dt;
      const velocity = Math.hypot(velocityX, velocityY); //px/ms
      this.#acceleration = (velocity - this.#velocity) / dt; // (px/ms)/ms
      this.#velocity = velocity;
      this.#timestamp = event.timeStamp;
    }

    // Cancel previous frame to avoid multiple calls
    if (this.#dragFrame) cancelAnimationFrame(this.#dragFrame);

    this.#dragFrame = requestAnimationFrame(() => {
      if (!this.#target) return;
      this.#target.style.setProperty('translate', `${dx}px ${dy}px`);
      this.#target.style.setProperty('--tq-swipe-distance', this.#distance);
    });
  };

  /**
   * Handles the pointerup or pointercancel event to end the drag.
   * @param {PointerEvent} [event] - The pointerup or pointercancel event.
   * @returns {Promise<void>}
   */
  endDrag = async (event) => {
    if (!this.#isDragging) return;
    if (event && event.pointerId !== this.#pointerId) return;

    if (this.#distance > 0.5 || (this.#distance > 0.1 && this.#acceleration > 0.1)) {
      this.#dragFrame = requestAnimationFrame(() => {
        this.#onSwipe({ target: this.#target });
      });
    }
    // Restore initial position
    else {
      const onTransitionEnd = (transitionEvent) => {
        transitionEvent.currentTarget.style.removeProperty('transition');
      };
      const target = this.#target;
      this.#dragFrame = requestAnimationFrame(() => {
        target.addEventListener('transitionend', onTransitionEnd, { once: true });
        target.style.setProperty('transition', 'translate 0.2s');
        target.style.removeProperty('translate');
        target.style.removeProperty('--tq-swipe-distance');
        target.style.removeProperty('will-change');
        delete target.dataset.dragging;
      });
    }

    // Reset state
    this.#isDragging = false;
    this.#pointerId = null;
    this.#startX = 0;
    this.#startY = 0;
    this.#timestamp = null;
    this.#distance = 0;
    this.#velocity = 0;
    this.#acceleration = 0;
  };

  /**
   * Removes event listeners and cleans up resources.
   * @returns {void}
   */
  destroy() {
    this.#controller.abort();

    if (this.#dragFrame) cancelAnimationFrame(this.#dragFrame);
  }
}
