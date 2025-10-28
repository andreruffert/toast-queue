export class Swipeable {
  #selector = '[data-swipeable]';
  #direction = 'inline';
  #removeFunctionRef = (target) => target.parentNode.removeChild(target);
  #prevEvent = null;
  #prevSpeed = 0;

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

    this.#selector = options?.selector ?? this.#selector;
    this.#direction = options?.direction ?? this.#direction;
    this.#removeFunctionRef = options?.removeFunction ?? this.#removeFunctionRef;

    this.addEventListeners();
    requestAnimationFrame(this.update);
  }

  get direction() {
    return this.#direction;
  }

  set direction(value) {
    this.#direction = value;
  }

  addEventListeners() {
    document.addEventListener('pointerdown', this.onStart);
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerup', this.onEnd);
  }

  onStart = (event) => {
    if (this.target) return;
    if (!event.target.closest('[data-id]')) return;

    event.preventDefault();
    this.target = event.target.closest(this.#selector);
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
    if (this.#direction === 'inline-start' && event.pageX - 10 > this.startX) return;
    if (this.#direction === 'inline-end' && event.pageX + 10 < this.startX) return;
    if (this.#direction === 'block-start' && event.pageY - 10 > this.startY) return;
    if (this.#direction === 'block-end' && event.pageY + 10 < this.startY) return;

    if (this.#prevEvent) {
      const dx = event.clientX - this.#prevEvent.clientX;
      const dy = event.clientY - this.#prevEvent.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const deltaTime = event.timeStamp - this.#prevEvent.timeStamp; // in ms

      // Speed in px/ms
      const speed = deltaTime > 0 ? distance / deltaTime : 0;

      // Acceleration in px/ms²
      // const acceleration = (speed - this.#prevSpeed) / deltaTime;
      // console.log({acceleration, speed});

      this.#prevSpeed = speed;
    }

    this.#prevEvent = event;
    this.target.dataset.dragging = '';
    this.currentX = event.pageX;
    this.currentY = event.pageY;
  };

  onEnd = () => {
    if (!this.target) return;

    this.targetX = 0;
    this.targetY = 0;

    const screenX = this.currentX - this.startX;
    const screenY = this.currentY - this.startY;
    const threshold = this.#direction.includes('inline')
      ? this.targetBCR.width * 0.4
      : this.targetBCR.height * 0.6;

    if (this.#direction.includes('inline') && Math.abs(screenX) > threshold) {
      this.targetX = screenX > 0 ? this.targetBCR.width : -this.targetBCR.width;
    }
    if (this.#direction.includes('block') && Math.abs(screenY) > threshold) {
      this.targetY = screenY > 0 ? this.targetBCR.height : -this.targetBCR.height;
    }

    // Reset
    this.#prevEvent = null;
    this.#prevSpeed = 0;
    this.isDragging = false;
    delete this.target.dataset.dragging;
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
    const isNearlyInvisible = opacity < 0.01 || this.#prevSpeed > 2;

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

    this.target.style.removeProperty('will-change');
    this.target.style.removeProperty('z-index');
    this.target.style.removeProperty('transform');
    this.target.style.removeProperty('opacity');
    this.target = null;
  }
}
