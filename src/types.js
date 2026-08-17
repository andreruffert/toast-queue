/** @import { Timer } from './utils.js' */

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
 * @typedef {'top-start'|'top-center'|'top-end'|'center'|'bottom-start'|'bottom-center'|'bottom-end'} ToastQueuePosition
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
 *   HTML markup rendered in the toast's icon slot.
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
 * Internal representation of a toast notification.
 *
 * @typedef {Object} ToastRecord
 * @property {string} id
 * @property {number} index - Queue insertion index.
 * @property {number} timestamp - Creation timestamp in milliseconds.
 * @property {string|ToastContent} content
 * @property {string} [icon]
 * @property {ToastAction} [action]
 * @property {boolean} dismissible
 * @property {ToastPriority} priority
 * @property {string} [className]
 * @property {ToastCloseHandler} [onClose]
 * @property {Timer} [timer] - Auto-dismiss timer.
 * @property {HTMLLIElement} itemRef - Associated DOM element.
 * @private
 */

/**
 * @typedef {'focus'|'click'} ActivationReason
 * @private
 */

// Essential: Export an empty object to make this a module
export {};
