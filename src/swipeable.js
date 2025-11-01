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
    this.#target.style.setProperty('touch-action', 'none');
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

    // Cancel previous frame to avoid multiple calls
    if (this.#dragFrame) cancelAnimationFrame(this.#dragFrame);

    this.#dragFrame = requestAnimationFrame(() => {
      if (!this.#target) return;
      this.#target.style.setProperty('transform', `translate(${dx}px, ${dy}px)`); // rotate(${dx * 0.1}deg)
      this.#target.style.setProperty('--distance', this.#distance);
    });
  };

  endDrag = async (event) => {
    if (!this.#isDragging) return;

    const dx = event.clientX - this.#startX;
    const dy = event.clientY - this.#startY;
    const isNearlyInvisible = this.#distance >= 0.5;

    if (isNearlyInvisible || this.#acceleration >= 0.1) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const exitX = inlineDirections.includes(this.#direction) ? (dx > 0 ? vw : -vw) : 0;
      const exitY = blockDirections.includes(this.#direction) ? (dy > 0 ? vh : -vh) : 0;
      const onTransitionEnd = (event) => {
        const target = event.currentTarget;
        if (!target) return;
        target.style.removeProperty('transition');
        this.#onSwipe({ target });
      };
      this.#dragFrame = requestAnimationFrame(() => {
        this.#target.addEventListener('transitionend', onTransitionEnd, { once: true });
        this.#target.style.setProperty('transition', 'transform 0.3s');
        this.#target.style.setProperty('transform', `translate(${exitX}px, ${exitY}px)`);
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
        this.#target.style.removeProperty('--distance');
      });
    }

    // Reset state
    this.#target.style.removeProperty('will-change');
    this.#target.style.removeProperty('touch-action');
    delete this.#target.dataset.dragging;
    this.#isDragging = false;
    this.#startX = 0;
    this.#startY = 0;
    this.#distance = 0;
    this.#velocity = 0;
    this.#acceleration = 0;
  };
}
