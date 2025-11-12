/**
 * Maps placement strings to View Transition class values.
 * @type {Object<string, string>}
 * @private
 */
const viewTransitionPlacementTypes = {
  'top-start': 'block-start inline-start',
  'top-center': 'block-start',
  'top-end': 'block-start inline-end',
  'bottom-start': 'block-end inline-start',
  'bottom-center': 'block-end',
  'bottom-end': 'block-end inline-end',
  center: 'block-end',
};

/**
 * Maps placement strings to swipeable direction values.
 * @type {Object<string, string>}
 * @private
 */
const swipeableDirectionPlacementTypes = {
  'top-start': 'left',
  'top-center': 'up',
  'top-end': 'right',
  'bottom-start': 'left',
  'bottom-center': 'down',
  'bottom-end': 'right',
  center: 'inline',
};

/**
 * Gets the View Transition class for a given placement.
 * @param {string} placement - The placement (e.g., 'top-center', 'bottom-end').
 * @returns {string|undefined} The corresponding class string, or undefined if not found.
 */
export function getPlacementViewTransitionClass(placement) {
  return viewTransitionPlacementTypes[placement];
}

/**
 * Gets the swipeable direction for a given placement.
 * @param {string} placement - The placement (e.g., 'top-center', 'bottom-end').
 * @returns {string|undefined} The corresponding direction ('up', 'down', 'left', 'right', 'inline'), or undefined if not found.
 */
export function getSwipeableDirection(placement) {
  return swipeableDirectionPlacementTypes[placement];
}

/**
 * Executes a DOM update with a view transition when supported and appropriate.
 * Skips transitions if disabled by user preferences.
 *
 * @param {Function} updateDOM - Function that performs DOM updates (required).
 * @returns {Object} A transition-like object with `ready` and `finished` promises.
 *                   Returns immediate-resolving promises when transitions are skipped.
 */
export function wrapInViewTransition(updateDOM) {
  const immediate = {
    ready: Promise.resolve(),
    finished: Promise.resolve(),
  };

  // Skip transitions if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    updateDOM();
    return immediate;
  }

  // Skip if View Transition API is not supported
  if (!('startViewTransition' in document)) {
    updateDOM();
    return immediate;
  }

  // Use native View Transition API
  return document.startViewTransition(updateDOM);
}

/**
 * A timer that can be paused, resumed, and cleared.
 */
export class Timer {
  #timerId;
  #startTime;
  #functionRef;
  #remainingTime;

  /**
   * Creates a new Timer.
   * @param {Function} functionRef - The function to execute when the timer completes.
   * @param {number} delay - The delay in milliseconds before the function is called.
   */
  constructor(functionRef, delay) {
    this.#functionRef = functionRef;
    this.#remainingTime = delay;
    this.resume();
  }

  /**
   * Resumes the timer. If already running, does nothing.
   * Sets the start time and creates a new timeout based on remaining time.
   * @returns {void}
   */
  resume() {
    if (this.#timerId) return;
    this.#startTime = Date.now();
    this.#timerId = setTimeout(this.#functionRef, this.#remainingTime);
  }

  /**
   * Pauses the timer. If not running, does nothing.
   * Clears the current timeout and updates the remaining time.
   * @returns {void}
   */
  pause() {
    if (!this.#timerId) return;
    clearTimeout(this.#timerId);
    this.#timerId = null;
    this.#remainingTime -= Date.now() - this.#startTime;
  }

  /**
   * Clears and stops the timer permanently.
   * Clears the timeout and resets the timer state.
   * @returns {void}
   */
  clear() {
    if (!this.#timerId) return;
    clearTimeout(this.#timerId);
    this.#timerId = null;
  }
}

/**
 * Generates a random string ID.
 * @returns {string} A random alphanumeric string.
 */
export function randomId() {
  return Math.random().toString(36).slice(2);
}

/**
 * Creates a function that inflects a word based on quantity.
 * @param {string} singular - The singular form of the word.
 * @returns {Function} A function that takes the plural form and returns a function to determine the correct form.
 * @returns {Function} A function that takes a quantity and returns the singular or plural form.
 * @example
 * const itemInflection = inflect('item')('items');
 * itemInflection(1); // => 'item'
 * itemInflection(2); // => 'items'
 */
export const inflect = (singular) => (plural) => (quantity) =>
  Number(quantity) === 1 ? singular : plural;
