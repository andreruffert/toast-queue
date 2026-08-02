/** @import { Timer } from './utils.js' */

/**
 * @typedef {Object} ToastQueueOptions
 * @property {HTMLElement} [root=document.body] - Container element for the toast queue.
 * @property {number} [duration=6000] - Auto-dismiss duration in milliseconds.
 * @property {ToastQueuePlacement} [placement='top-end'] - Position on screen.
 * @property {ToastQueueTemplate} [template] - HTML templates.
 */

/**
 * Toast queue placement.
 *
 * @typedef {
 *   'top-start' |
 *   'top-center' |
 *   'top-end' |
 *   'bottom-start' |
 *   'bottom-center' |
 *   'bottom-end'
 * } ToastQueuePlacement
 */

/**
 * @typedef {Object} ToastQueueTemplate
 * @property {string} [root] - HTML for the toast container.
 * @property {string} [item] - HTML for individual toast items.
 * @property {string} [actionButton] - HTML for action buttons.
 */

/**
 * @typedef {'normal' | 'high'} ToastPriority
 */

/**
 * @typedef {Object} ToastOptions
 * @property {number} [duration]
 *  Override the queue default auto-dismiss duration in milliseconds.
 *  Use 0 to disable automatic dismissal.
 * @property {boolean} [dismissible=true] - Whether toast can be manually closed.
 * @property {ToastPriority} [priority='normal']
 * @property {string} [className] - Additional CSS class.
 * @property {string} [icon] - HTML markup rendered into the icon slot.
 * @property {ToastAction} [action] - Action button configuration.
 * @property {ToastCloseHandler} [onClose] - Called when the toast is closed.
 */

/**
 * @typedef {Object} ToastContent
 * @property {string} title - Primary toast message.
 * @property {string} [description] - Additional supporting text.
 */

/**
 * Called when a toast action button is clicked.
 *
 * @callback ToastActionHandler
 * @param {ToastRecord} toast - The toast associated with the action.
 * @returns {void}
 */

/**
 * Called when a toast is closed.
 *
 * @callback ToastCloseHandler
 * @param {ToastRecord} toast
 * @returns {void}
 */

/**
 * Action button configuration.
 *
 * @typedef {Object} ToastAction
 * @property {string} label - Text displayed in the action button.
 * @property {ToastActionHandler} [onClick]
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
 * @typedef {'hover'|'focus'|'click'} ActivationReason
 * @private
 */

// Essential: Export an empty object to make this a module
export {};
