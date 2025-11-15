/** @type {string[]} */
const inlineDirections = ['inline', 'horizontal', 'left', 'right'];

/** @type {string[]} */
const blockDirections = ['block', 'vertical', 'up', 'down'];

/**
 * A class that adds swipe gesture detection to elements with the `data-swipeable` attribute.
 * @class Swipeable
 */
export class Swipeable {
  /** @private @type {HTMLElement|null} The currently being dragged element. */
  #target = null;

  /** @private @type {boolean|null} Tracks if a drag gesture is currently active. */
  #isDragging = null;

  /** @private @type {number|null} Stores the requestAnimationFrame ID for the current drag frame. */
  #dragFrame = null;

  /** @private @type {number|null} The clientX coordinate where the drag started. */
  #startX = null;

  /** @private @type {number|null} The clientY coordinate where the drag started. */
  #startY = null;

  /** @private @type {string} The allowed swipe direction ('inline', 'left', 'right', 'up', 'down'). */
  #direction = 'inline';

  /** @private @type {number|null} The timestamp when the drag started or was last updated. */
  #timestamp = null;

  /** @private @type {number|null} The normalized distance (0-1) the element has been swiped. */
  #distance = null;

  /** @private @type {number|null} The current velocity of the swipe (px/ms). */
  #velocity = null;

  /** @private @type {number|null} The current acceleration of the swipe ((px/ms)/ms). */
  #acceleration = null;

  /** @private @type {function({ target: HTMLElement }): void} Callback function triggered on a successful swipe. */
  #onSwipe = () => {};

  /**
   * Creates a new Swipeable instance.
   * @param {Object} options - Configuration options.
   * @param {function({ target: HTMLElement }): void} [options.onSwipe] - Callback function called when a swipe is completed.
   */
  constructor(options) {
    this.#onSwipe = options?.onSwipe || this.#onSwipe;
    document.addEventListener('pointerdown', this.startDrag);
    document.addEventListener('pointermove', this.drag);
    document.addEventListener('pointerup', this.endDrag);
    document.addEventListener('pointercancel', this.endDrag);
  }

  /**
   * Handles the pointerdown event to initiate a drag.
   * @private
   * @param {PointerEvent} event - The pointerdown event.
   * @returns {void}
   */
  startDrag = (event) => {
    const target = event.target.closest('[data-swipeable]');
    if (!target) return;

    this.#target = target;
    this.#target.style.setProperty('will-change', 'translate');
    this.#isDragging = true;
    this.#startX = event.clientX;
    this.#startY = event.clientY;
    this.#direction = this.#target.dataset.swipeable || this.#direction;
    this.#timestamp = event.timeStamp;
  };

  /**
   * Handles the pointermove event to update the drag position.
   * @private
   * @param {PointerEvent} event - The pointermove event.
   * @returns {void}
   */
  drag = (event) => {
    if (!this.#isDragging) return;
    if (this.#direction === 'left' && event.clientX - 10 > this.#startX) return;
    if (this.#direction === 'right' && event.clientX + 10 < this.#startX) return;
    if (this.#direction === 'up' && event.clientY - 10 > this.#startY) return;
    if (this.#direction === 'down' && event.clientY + 10 < this.#startY) return;

    event.preventDefault();

    this.#target.dataset.dragging = '';

    const dx = inlineDirections.includes(this.#direction) ? event.clientX - this.#startX : 0;
    const dy = blockDirections.includes(this.#direction) ? event.clientY - this.#startY : 0;
    const dt = event.timeStamp - this.#timestamp;

    if (dt > 0) {
      const velocityX = dx / dt;
      const velocityY = dy / dt;
      const distance = inlineDirections.includes(this.#direction)
        ? Math.abs(dx) / this.#target.offsetWidth
        : Math.abs(dy) / this.#target.offsetHeight;
      const velocity = Math.hypot(velocityX, velocityY); // px/ms
      const acceleration = (velocity - this.#velocity) / dt; // (px/ms)/ms

      this.#timestamp = event.timeStamp;
      this.#velocity = velocity;
      this.#acceleration = acceleration;
      this.#distance = distance;
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
   * @private
   * @returns {Promise<void>}
   */
  endDrag = async () => {
    if (!this.#isDragging) return;

    if (this.#distance > 0.5 || (this.#distance > 0.1 && this.#acceleration > 0.1)) {
      this.#dragFrame = requestAnimationFrame(() => {
        this.#onSwipe({ target: this.#target });
      });
    }
    // Restore initial position
    else {
      const onTransitionEnd = (event) => {
        event.currentTarget.style.removeProperty('transition');
      };
      this.#dragFrame = requestAnimationFrame(() => {
        this.#target.addEventListener('transitionend', onTransitionEnd, { once: true });
        this.#target.style.setProperty('transition', 'translate 0.3s');
        this.#target.style.removeProperty('translate');
        this.#target.style.removeProperty('--tq-swipe-distance');
        this.#target.style.removeProperty('will-change');
        delete this.#target.dataset.dragging;
      });
    }

    // Reset state
    this.#isDragging = false;
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
    document.removeEventListener('pointerdown', this.startDrag);
    document.removeEventListener('pointermove', this.drag);
    document.removeEventListener('pointerup', this.endDrag);
    document.removeEventListener('pointercancel', this.endDrag);
  }
}
