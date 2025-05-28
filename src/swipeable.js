export class Swipeable {
  #direction = 'inline';
  #removeFunctionRef = (target) => target.parentNode.removeChild(target);

  constructor(options) {
    this.targetBCR = null;
    this.target = null;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.screenX = 0;
    this.screenY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.isDragging = false;

    this.direction = options?.direction ?? this.#direction;
    this.#removeFunctionRef = options?.removeFunction ?? this.#removeFunctionRef;

    this.addEventListeners();
    requestAnimationFrame(this.update);
  }

  get direction() {
    return this.#direction;
  }

  set direction(value) {
    console.log('set direction');

    this.#direction = value;
  }

  addEventListeners() {
    document.addEventListener('pointerdown', this.onStart);
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerup', this.onEnd);
  }

  onStart = (event) => {
    if (this.target) return;
    if (!event.target.closest('[data-toast-id]')) return;

    event.preventDefault();

    this.target = event.target.closest('[data-toast-id]');
    this.targetBCR = this.target.getBoundingClientRect();
    this.startX = event.pageX;
    this.startY = event.pageY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDragging = true;
    this.target.style.willChange = 'transform';
    this.target.style.zIndex = 'calc(infinity)';
  };

  onMove = (event) => {
    if (!this.target) return;
    if (this.#direction === 'inline-start' && event.pageX > this.startX) return;
    if (this.#direction === 'inline-end' && event.pageX < this.startX) return;
    if (this.#direction === 'block-start' && event.pageY > this.startY) return;
    if (this.#direction === 'block-end' && event.pageY < this.startY) return;

    this.target.dataset.swiping = '';
    this.currentX = event.pageX;
    this.currentY = event.pageY;
  };

  onEnd = (event) => {
    if (!this.target) return;

    this.targetX = 0;
    this.targetY = 0;

    const screenX = this.currentX - this.startX;
    const screenY = this.currentY - this.startY;
    const threshold = this.#direction.includes('inline')
      ? this.targetBCR.width * 0.5
      : this.targetBCR.height * 0.8;

    if (this.#direction.includes('inline') && Math.abs(screenX) > threshold) {
      this.targetX = screenX > 0 ? this.targetBCR.width : -this.targetBCR.width;
    }
    if (this.#direction.includes('block') && Math.abs(screenY) > threshold) {
      this.targetY = screenY > 0 ? this.targetBCR.height : -this.targetBCR.height;
    }

    this.isDragging = false;
  };

  update = () => {
    requestAnimationFrame(this.update);

    if (!this.target) return;

    if (this.isDragging) {
      if (this.#direction.includes('inline')) {
        this.screenX = this.currentX - this.startX;
      }
      if (this.#direction.includes('block')) {
        this.screenY = this.currentY - this.startY;
      }
    } else {
      if (this.#direction.includes('inline')) {
        this.screenX += (this.targetX - this.screenX) / 4;
      }
      if (this.#direction.includes('block')) {
        this.screenY += (this.targetY - this.screenY) / 4;
      }
    }

    const normalizedDragDistance = this.#direction.includes('inline')
      ? Math.abs(this.screenX) / this.targetBCR.width
      : Math.abs(this.screenY) / this.targetBCR.height;
    const opacity = 1 - normalizedDragDistance ** 3;

    this.target.style.setProperty(
      'transform',
      this.#direction.includes('inline')
        ? `translateX(${this.screenX}px)`
        : `translateY(${this.screenY}px)`,
    );
    this.target.style.setProperty('opacity', opacity);

    // User has finished dragging.
    if (this.isDragging) return;

    const isNearlyAtStart =
      Math.abs(this.#direction.includes('inline') ? this.screenX : this.screenY) < 0.1;
    const isNearlyInvisible = opacity < 0.01;

    // If the target is nearly gone.
    if (isNearlyInvisible) {
      // Bail if there's no target or it's not attached to a parent anymore.
      if (!this.target || !this.target.parentNode) return;
      this.#removeFunctionRef(this.target);
      this.target = null;
    } else if (isNearlyAtStart) {
      this.resetTarget();
    }
  };

  resetTarget() {
    if (!this.target) return;
    delete this.target.dataset.swiping;

    this.target.style.removeProperty('will-change');
    this.target.style.removeProperty('z-index');
    this.target.style.removeProperty('transform');
    this.target.style.removeProperty('opacity');
    this.target = null;
  }
}
