const inlineDirections = ['inline', 'horizontal', 'left', 'right'];
const blockDirections = ['block', 'vertical', 'up', 'down'];

export class Swipeable {
  #target = null;
  #isDragging = null;
  #dragFrame = null;
  #startX = null;
  #startY = null;
  #direction = 'inline';
  #timeStamp = null;
  #distance = null;
  #velocity = null;
  #acceleration = null;
  #onSwipe = () => {};

  /**
   *
   * @param {Object} options
   * @param {function} options.onSwipe - Swipe callback
   */
  constructor(options) {
    this.#onSwipe = options?.onSwipe || this.#onSwipe;
    document.addEventListener('pointerdown', this.startDrag);
    document.addEventListener('pointermove', this.drag);
    document.addEventListener('pointerup', this.endDrag);
    document.addEventListener('pointercancel', this.endDrag);
  }

  startDrag = (event) => {
    const target = event.target.closest('[data-swipeable]');
    if (!target) return;

    this.#target = target;
    this.#target.dataset.dragging = '';
    this.#target.style.setProperty('touch-action', 'none'); // Ensure capture pointer events will work properly on touch devices.
    this.#target.style.setProperty('will-change', 'transform');
    this.#isDragging = true;
    this.#startX = event.clientX;
    this.#startY = event.clientY;
    this.#direction = this.#target.dataset.swipeable || this.#direction;
    this.#timeStamp = event.timeStamp;
  };

  drag = (event) => {
    if (!this.#isDragging) return;
    if (this.#direction === 'left' && event.clientX - 10 > this.#startX) return;
    if (this.#direction === 'right' && event.clientX + 10 < this.#startX) return;
    if (this.#direction === 'up' && event.clientY - 10 > this.#startY) return;
    if (this.#direction === 'down' && event.clientY + 10 < this.#startY) return;

    event.preventDefault();

    const dx = inlineDirections.includes(this.#direction) ? event.clientX - this.#startX : 0;
    const dy = blockDirections.includes(this.#direction) ? event.clientY - this.#startY : 0;
    const dt = event.timeStamp - this.#timeStamp;

    if (dt > 0) {
      const velocityX = dx / dt;
      const velocityY = dy / dt;
      const distance = inlineDirections.includes(this.#direction)
        ? Math.abs(dx) / this.#target.offsetWidth
        : Math.abs(dy) / this.#target.offsetHeight;
      const velocity = Math.hypot(velocityX, velocityY); // px/ms
      const acceleration = (velocity - this.#velocity) / dt; // (px/ms)/ms

      this.#timeStamp = event.timeStamp;
      this.#velocity = velocity;
      this.#acceleration = acceleration;
      this.#distance = distance;
    }

    // Cancel previous frame to avoid multiple calls
    if (this.#dragFrame) cancelAnimationFrame(this.#dragFrame);

    this.#dragFrame = requestAnimationFrame(() => {
      if (!this.#target) return;
      this.#target.style.setProperty('transform', `translate(${dx}px, ${dy}px)`); // rotate(${dx * 0.1}deg)
      this.#target.style.setProperty('--tq-distance', this.#distance);
    });
  };

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
        this.#target.style.setProperty('transition', 'transform 0.3s');
        this.#target.style.removeProperty('transform');
        this.#target.style.removeProperty('--tq-distance');
        this.#target.style.removeProperty('will-change');
        this.#target.style.removeProperty('touch-action');
        delete this.#target.dataset.dragging;
      });
    }

    // Reset state
    this.#isDragging = false;
    this.#startX = 0;
    this.#startY = 0;
    this.#timeStamp = null;
    this.#distance = 0;
    this.#velocity = 0;
    this.#acceleration = 0;
  };

  destroy() {
    document.removeEventListener('pointerdown', this.startDrag);
    document.removeEventListener('pointermove', this.drag);
    document.removeEventListener('pointerup', this.endDrag);
    document.removeEventListener('pointercancel', this.endDrag);
  }
}
