/** @import { Timer } from './utils.js' */

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Configuration options for a {@link ToastQueue}.
 *
 * @typedef {Object} ToastQueueOptions
 * @property {HTMLElement} [root=document.body]
 *   Container into which the queue is mounted.
 * @property {number} [duration=6000]
 *   Default auto-dismiss duration in milliseconds. Use `0` to disable
 *   automatic dismissal.
 * @property {ToastQueuePosition} [position='top-end']
 *   Position of the toast queue.
 * @property {number} [visibleLimit=3]
 *   Number of toasts considered visible at once. Additional toasts remain
 *   queued and can be exposed by CSS presets.
 * @property {ToastQueueTemplate} [template]
 *   Optional HTML templates used to render the queue, toast items, and
 *   action buttons.
 */

/**
 * Position of the toast queue.
 *
 * @typedef {'top-start'|'top-center'|'top-end'|'bottom-start'|'bottom-center'|'bottom-end'} ToastQueuePosition
 */

/**
 * HTML templates used to render a toast queue.
 *
 * Templates are expected to contain the data-part attributes used by the
 * library to locate and update their elements.
 *
 * @typedef {Object} ToastQueueTemplate
 * @property {string} [root]
 *   HTML for the queue root and toast group.
 * @property {string} [item]
 *   HTML for an individual toast item.
 * @property {string} [actionButton]
 *   HTML for an individual action button.
 */

/**
 * Content displayed by a toast.
 *
 * @typedef {string | ToastContentObject} ToastContent
 */

/**
 * @typedef {Object} ToastContentObject
 * @property {string} title
 *   Primary toast message.
 * @property {string} [description]
 *   Optional supporting text displayed below the title.
 */

/**
 * Configuration for an individual toast.
 *
 * @typedef {Object} ToastOptions
 * @property {number} [duration]
 *   Auto-dismiss duration in milliseconds. `0` disables automatic dismissal.
 * @property {boolean} [dismissible=true]
 *   Whether the toast can be manually dismissed.
 * @property {ToastPriority} [priority='normal']
 *   Announcement priority passed to `ariaNotify()`.
 * @property {string} [className]
 *   Additional CSS class names applied to the toast.
 * @property {string} [icon]
 *   Trusted HTML markup rendered in the toast's icon slot.
 *   Do not pass user-controlled or unsanitized content.
 * @property {ToastAction} [action]
 *   Optional action button configuration.
 * @property {ToastCloseHandler} [onClose]
 *   Called after the toast has been closed and removed from the queue.
 */

/**
 * Toast priority used for screen-reader announcements.
 *
 * `high` requests a higher announcement priority from `ariaNotify()`.
 *
 * @typedef {'normal'|'high'} ToastPriority
 */

/**
 * Configuration for an optional toast action button.
 *
 * @typedef {Object} ToastAction
 * @property {string} label
 *   Text displayed in the action button.
 * @property {ToastActionHandler} [onClick]
 *   Called when the action button is clicked.
 */

/**
 * Called when a toast action button is clicked.
 *
 * @callback ToastActionHandler
 * @param {ToastRecord} toast
 *   The toast associated with the action.
 * @returns {void}
 */

/**
 * Called after a toast is closed and removed from the queue.
 *
 * @callback ToastCloseHandler
 * @param {ToastRecord} toast
 *   The toast that was closed.
 * @returns {void}
 */

/**
 * Record representing a toast managed by a {@link ToastQueue}.
 *
 * @typedef {Object} ToastRecord
 * @property {string} id
 *   Unique identifier for the toast.
 * @property {number} timestamp
 *   Creation timestamp in milliseconds.
 * @property {ToastContent} content
 *   Content displayed by the toast.
 * @property {string} [icon]
 *   Trusted HTML markup for the toast icon.
 * @property {ToastAction} [action]
 *   Optional action button configuration.
 * @property {boolean} dismissible
 *   Whether the toast can be manually dismissed.
 * @property {ToastPriority} priority
 *   Screen-reader announcement priority.
 * @property {string} [className]
 *   Additional CSS classes applied to the toast.
 * @property {ToastCloseHandler} [onClose]
 *   Called after the toast is closed.
 * @property {Timer} [timer]
 *   Auto-dismiss timer.
 * @property {HTMLLIElement} itemRef
 *   Associated toast item in the DOM.
 */

/**
 * Reason a toast was closed.
 *
 * @typedef {'timeout'|'button'|'escape'|'swipe'|'manual'} CloseReason
 */

/**
 * Reason the queue becomes interaction-active.
 *
 * @typedef {'focus'|'click'} ActivationReason
 */

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Detail payload for the `toast-add` event.
 *
 * @typedef {Object} ToastAddEventDetail
 * @property {ToastRecord} toast
 *   The toast that was added to the queue.
 */

/**
 * Detail payload for the `toast-close` event.
 *
 * @typedef {Object} ToastCloseEventDetail
 * @property {ToastRecord} toast
 *   The toast that was closed.
 * @property {CloseReason} reason
 *   The reason the toast was closed.
 */

/**
 * Detail payload for the `toast-action` event.
 *
 * @typedef {{
 *   toast: ToastRecord
 * }} ToastActionEventDetail
 */

/**
 * Detail payload for the `activate` event.
 *
 * @typedef {{
 *   reason: ActivationReason,
 *   reasons: ActivationReason[]
 * }} ToastActivateEventDetail
 */

/**
 * Detail payload for the `deactivate` event.
 *
 * @typedef {{
 *   reason: ActivationReason
 * }} ToastDeactivateEventDetail
 */

/* -------------------------------------------------------------------------- */
/* Internal                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {'manual'|'hover'|'visibility'|'focus'|'click'} PauseReason
 * @private
 */

/* -------------------------------------------------------------------------- */
/* Module                                                                     */
/* -------------------------------------------------------------------------- */

// Essential: Export an empty object to make this a module
export {};
