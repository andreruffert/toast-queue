export function wrapInViewTransition(updateDOM) {
  let transition;

  if ('startViewTransition' in document) {
    transition = document.startViewTransition(updateDOM);
  } else {
    transition = {
      ready: Promise.resolve(),
      finished: Promise.resolve(),
    };
    updateDOM();
  }

  return transition;
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

/**
 * Dynamically change a word in a phrase from singular to plural
 * based on the quantity of that item.
 *
 * const itemInflection = inflect('item')('items')
 * itemInflection(1) // => 'item'
 */
export const inflect = (singular) => (plural) => (quantity) =>
  Number(quantity) === 1 ? singular : plural;
