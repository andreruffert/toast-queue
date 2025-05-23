export function wrapInViewTransition(fn) {
  if ('startViewTransition' in document) {
    document.startViewTransition(fn).ready.catch(() => {});
  } else {
    fn();
  }
}

export class Timer {
  #timerId;
  #startTime;
  #functionRef;
  #remainingTime;

  constructor(functionRef, delay) {
    this.#functionRef = functionRef;
    this.#remainingTime = delay;
    this.resume();
  }

  resume() {
    if (this.#timerId) return;
    this.#startTime = Date.now();
    this.#timerId = setTimeout(this.#functionRef, this.#remainingTime);
  }

  pause() {
    if (!this.#timerId) return;
    clearTimeout(this.#timerId);
    this.#timerId = null;
    this.#remainingTime -= Date.now() - this.#startTime;
  }

  clear() {
    if (!this.#timerId) return;
    clearTimeout(this.#timerId);
    this.#timerId = null;
  }
}
