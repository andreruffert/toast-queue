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
  center: 'inline',
  'bottom-start': 'left',
  'bottom-center': 'down',
  'bottom-end': 'right',
};

/**
 * Gets the View Transition class for a given placement.
 *
 * @param {string} placement - The placement (e.g., 'top-center', 'bottom-end').
 * @returns {string|undefined} The corresponding class string, or undefined if not found.
 * @private
 */
export function getPlacementViewTransitionClass(placement) {
  return viewTransitionPlacementTypes[placement];
}

/**
 * Gets the swipeable direction for a given placement.
 *
 * @param {string} placement - The placement (e.g., 'top-center', 'bottom-end').
 * @returns {string|undefined} The corresponding direction ('up', 'down', 'left', 'right', 'inline'), or undefined if not found.
 * @private
 */
export function getSwipeableDirection(placement) {
  return swipeableDirectionPlacementTypes[placement];
}

/**
 * Executes a DOM update with a view transition when supported and appropriate.
 * Skips transitions if disabled by user preferences.
 *
 * @param {Function} updateDOM - Function that performs DOM updates (required).
 * @param {Element} root - scope
 * @returns {Object} A transition-like object with `ready` and `finished` promises.
 *                   Returns immediate-resolving promises when transitions are skipped.
 * @private
 */
export function wrapInViewTransition(updateDOM, root = document) {
  const immediate = { ready: Promise.resolve(), finished: Promise.resolve() };

  // Skip transition if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    updateDOM();
    return immediate;
  }

  // Prefer scoping the transition to `root` — isolates snapshotting and
  // pointer-event blocking to this subtree instead of the whole document,
  // and lets multiple ToastQueue instances animate independently instead
  // of contending for the document's single transition slot.
  const scope = typeof root.startViewTransition === 'function' ? root : document;

  // Skip if View Transition API is not supported
  if (typeof scope.startViewTransition !== 'function') {
    updateDOM();
    console.debug('[toast-queue] skipping transition');
    return immediate;
  }

  const transition = scope.startViewTransition(updateDOM);

  // `ready` isn't consumed anywhere, but the browser still
  // reports it as an unhandled rejection when a transition is skipped (e.g.
  // superseded by another transition, or the tab is backgrounded mid-flight).
  // A skip is expected, benign behavior of the View Transitions API, not a
  // bug — mark it handled so it doesn't surface in the console.
  transition.ready.catch(() => {});

  return {
    ready: transition.ready,
    // Callers await `finished` purely for sequencing (e.g. to hide the
    // popover after the DOM settles). The DOM update itself already ran by
    // this point regardless of whether the animation was skipped, so treat
    // an expected skip (AbortError) as a no-op instead of propagating it as
    // an unhandled rejection. Any other error still propagates.
    finished: transition.finished.catch((error) => {
      if (error?.name !== 'AbortError') throw error;
    }),
  };
}

/**
 * A timer that can be paused, resumed, and cleared.
 * @private
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
 * @private
 */
export function randomId() {
  return Math.random().toString(36).slice(2);
}
