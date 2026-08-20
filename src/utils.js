/** @import { ToastQueuePosition } from './types.js' */

/**
 * Maps each toast queue position to the logical block/inline direction
 * used by the View Transition API.
 *
 * @type {Record<ToastQueuePosition, string>}
 * @private
 */
const viewTransitionPositionTypes = {
  'top-start': 'block-start inline-start',
  'top-center': 'block-start',
  'top-end': 'block-start inline-end',
  'bottom-start': 'block-end inline-start',
  'bottom-center': 'block-end',
  'bottom-end': 'block-end inline-end',
};

/**
 * Maps each toast queue position to the direction in which a toast can
 * be swiped away.
 *
 * @type {Record<ToastQueuePosition, string>}
 * @private
 */
const swipeableDirectionPositionTypes = {
  'top-start': 'left',
  'top-center': 'up',
  'top-end': 'right',
  'bottom-start': 'left',
  'bottom-center': 'down',
  'bottom-end': 'right',
};

/**
 * Returns the View Transition class for a toast queue position.
 *
 * @param {ToastQueuePosition} position
 * @returns {string} The logical block/inline direction for the position.
 * @private
 */
export function getPositionViewTransitionClass(position) {
  return viewTransitionPositionTypes[position];
}

/**
 * Returns the swipe direction for a toast queue position.
 *
 * @param {ToastQueuePosition} position
 * @returns {string} The direction in which the toast can be swiped away.
 * @private
 */
export function getSwipeableDirection(position) {
  return swipeableDirectionPositionTypes[position];
}

/**
 * Result returned by {@link wrapInViewTransition}.
 *
 * @typedef {Object} TransitionResult
 * @property {Promise<void>} ready
 *   Resolves when the transition is ready.
 * @property {Promise<void>} finished
 *   Resolves when the transition finishes or is aborted.
 * @private
 */

/** @type {TransitionResult} */
const immediateTransition = () => ({
  ready: Promise.resolve(),
  finished: Promise.resolve(),
});

/**
 * Runs a DOM update inside a View Transition when supported.
 *
 * Transitions are skipped when the user prefers reduced motion or when the
 * View Transition API is unavailable. In either case, the DOM update runs
 * synchronously and the returned promises resolve immediately.
 *
 * When a transition is aborted, its `finished` promise resolves instead of
 * rejecting. Other transition errors are propagated.
 *
 * When the provided root supports scoped View Transitions, the transition
 * is scoped to that element. Otherwise, the document is used.
 *
 * @param {function(): void} update - Callback that performs the DOM update.
 * @param {Element} [scope=document] - Element used to scope the transition.
 * @returns {TransitionResult} - Transition lifecycle promises.
 * @private
 */
export function wrapInViewTransition(update, scope = document) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return immediateTransition();
  }

  const transitionTarget = typeof scope.startViewTransition === 'function' ? scope : document;

  if (typeof transitionTarget.startViewTransition !== 'function') {
    update();
    return immediateTransition();
  }

  const transition = transitionTarget.startViewTransition(update);
  transition.ready.catch(() => {});

  return {
    ready: transition.ready,
    finished: transition.finished.catch((error) => {
      if (error?.name !== 'AbortError') throw error;
    }),
  };
}

/**
 * A timer that can be paused, resumed, and cleared while preserving its
 * remaining duration.
 *
 * @private
 */
export class Timer {
  #timerId = null;
  #startTime;
  #functionRef;
  #remainingTime;

  /**
   * Creates a new timer and starts it immediately.
   *
   * @param {function(): void} functionRef - Function called when the timer expires.
   * @param {number} delay - Initial duration in milliseconds.
   */
  constructor(functionRef, delay) {
    this.#functionRef = functionRef;
    this.#remainingTime = Math.max(0, delay);
    this.resume();
  }

  /**
   * Resumes the timer using its remaining duration.
   *
   * Has no effect if the timer is already running.
   *
   * @returns {void}
   */
  resume() {
    if (this.#timerId !== null) return;

    this.#startTime = Date.now();
    this.#timerId = setTimeout(this.#functionRef, this.#remainingTime);
  }

  /**
   * Pauses the timer and preserves the time remaining.
   *
   * Has no effect if the timer is already paused.
   *
   * @returns {void}
   */
  pause() {
    if (this.#timerId === null) return;

    clearTimeout(this.#timerId);
    this.#timerId = null;
    this.#remainingTime = Math.max(0, this.#remainingTime - (Date.now() - this.#startTime));
  }

  /**
   * Stops the timer.
   *
   * The timer cannot fire after being cleared, but it may be resumed by
   * calling {@link Timer#resume}.
   *
   * @returns {void}
   */
  clear() {
    if (this.#timerId === null) return;

    clearTimeout(this.#timerId);
    this.#timerId = null;
  }
}

/**
 * Generates a random string ID.
 *
 * @returns {string} A random alphanumeric identifier.
 * @private
 */
export function randomId() {
  return Math.random().toString(36).slice(2);
}
