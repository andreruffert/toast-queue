## Classes

<dl>
<dt><a href="#ToastQueue">ToastQueue</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ToastQueueOptions">ToastQueueOptions</a> : <code>Object</code></dt>
<dd><p>Configuration options for a <a href="#ToastQueue">ToastQueue</a>.</p>
</dd>
<dt><a href="#ToastQueuePosition">ToastQueuePosition</a> : <code>&#x27;top-start&#x27;</code> | <code>&#x27;top-center&#x27;</code> | <code>&#x27;top-end&#x27;</code> | <code>&#x27;center&#x27;</code> | <code>&#x27;bottom-start&#x27;</code> | <code>&#x27;bottom-center&#x27;</code> | <code>&#x27;bottom-end&#x27;</code></dt>
<dd><p>Position of the toast queue.</p>
</dd>
<dt><a href="#ToastQueueTemplate">ToastQueueTemplate</a> : <code>Object</code></dt>
<dd><p>HTML templates used to render a toast queue.</p>
<p>Templates are expected to contain the data-part attributes used by the
library to locate and update their elements.</p>
</dd>
<dt><a href="#ToastContent">ToastContent</a> : <code>string</code> | <code><a href="#ToastContentObject">ToastContentObject</a></code></dt>
<dd><p>Content displayed by a toast.</p>
</dd>
<dt><a href="#ToastContentObject">ToastContentObject</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastOptions">ToastOptions</a> : <code>Object</code></dt>
<dd><p>Configuration for an individual toast.</p>
</dd>
<dt><a href="#ToastPriority">ToastPriority</a> : <code>&#x27;normal&#x27;</code> | <code>&#x27;high&#x27;</code></dt>
<dd><p>Toast priority used for screen-reader announcements.</p>
<p><code>high</code> requests a higher announcement priority from <code>ariaNotify()</code>.</p>
</dd>
<dt><a href="#ToastAction">ToastAction</a> : <code>Object</code></dt>
<dd><p>Configuration for an optional toast action button.</p>
</dd>
<dt><a href="#ToastActionHandler">ToastActionHandler</a> ⇒ <code>void</code></dt>
<dd><p>Called when a toast action button is clicked.</p>
</dd>
<dt><a href="#ToastCloseHandler">ToastCloseHandler</a> ⇒ <code>void</code></dt>
<dd><p>Called after a toast is closed and removed from the queue.</p>
</dd>
</dl>

<a name="ToastQueue"></a>

## ToastQueue
**Kind**: global class  

* [ToastQueue](#ToastQueue)
    * [new ToastQueue([options])](#new_ToastQueue_new)
    * [.isPaused](#ToastQueue+isPaused) : <code>boolean</code>
    * [.element](#ToastQueue+element) : <code>HTMLElement</code>
    * [.size](#ToastQueue+size) : <code>number</code>
    * [.position](#ToastQueue+position) : [<code>ToastQueuePosition</code>](#ToastQueuePosition)
    * [.visibleLimit](#ToastQueue+visibleLimit) : <code>number</code>
    * [.add(content, [options])](#ToastQueue+add) ⇒ <code>ToastRecord</code>
    * [.get(id)](#ToastQueue+get) ⇒ <code>ToastRecord</code> \| <code>undefined</code>
    * [.close(id)](#ToastQueue+close)
    * [.clear()](#ToastQueue+clear)
    * [.pause()](#ToastQueue+pause)
    * [.resume()](#ToastQueue+resume)
    * [.destroy()](#ToastQueue+destroy)

<a name="new_ToastQueue_new"></a>

### new ToastQueue([options])
Manages a queue of toast notifications.

A queue handles rendering, auto-dismiss timers, focus management,
keyboard dismissal, swipe dismissal, and screen-reader announcements.

Toasts are announced with the browser's `ariaNotify()` API when available.
Browsers without `ariaNotify()` can use the
[`@github/arianotify-polyfill`](https://github.com/github/aria-notify-polyfill)
before creating the queue.

The queue is unstyled by default. Use the exposed `data-*` attributes and
CSS custom properties to provide your own presentation, or use one of the
optional CSS presets.


| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>ToastQueueOptions</code>](#ToastQueueOptions) | Queue configuration. |

**Example**  
```js
import ToastQueue from 'toast-queue';

const toastQueue = new ToastQueue();

toastQueue.add('Changes saved.');
```
<a name="ToastQueue+isPaused"></a>

### toastQueue.isPaused : <code>boolean</code>
Whether the queue's toast timers are currently paused.

Timers may be paused explicitly with [pause](#ToastQueue+pause), or
automatically while the queue is hovered, focused, or the document is
hidden.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Read only**: true  
<a name="ToastQueue+element"></a>

### toastQueue.element : <code>HTMLElement</code>
The root `<toast-queue>` element for this queue instance.

Use this element to apply instance-specific styles or inspect the queue's
DOM state.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Read only**: true  
<a name="ToastQueue+size"></a>

### toastQueue.size : <code>number</code>
The number of toasts currently in the queue.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Read only**: true  
<a name="ToastQueue+position"></a>

### toastQueue.position : [<code>ToastQueuePosition</code>](#ToastQueuePosition)
Gets or sets the queue position.

Supported positions are:

- `top-start`
- `top-center`
- `top-end`
- `center`
- `bottom-start`
- `bottom-center`
- `bottom-end`

Changing the position updates the queue and existing toasts in place.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+visibleLimit"></a>

### toastQueue.visibleLimit : <code>number</code>
Gets or sets the number of toasts that are considered visible.

Toasts beyond this limit remain in the queue but are marked as hidden using
`data-hidden`. The current number of hidden toasts is exposed through
`data-hidden-count` on the queue element.

CSS presets can use these attributes to create stacked or peek effects.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+add"></a>

### toastQueue.add(content, [options]) ⇒ <code>ToastRecord</code>
Adds a toast notification to the queue.

The toast is rendered immediately when space is available. When the
`visibleLimit` has been reached, additional toasts remain queued until an
earlier toast is closed.

Pass a string for a simple message or an object for a title and optional
description.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>ToastRecord</code> - The newly created toast record.  

| Param | Type | Description |
| --- | --- | --- |
| content | [<code>ToastContent</code>](#ToastContent) | Toast message content. |
| [options] | [<code>ToastOptions</code>](#ToastOptions) | Per-toast configuration. |

**Example**  
```js
toastQueue.add('Changes saved.');
```
**Example**  
```js
toastQueue.add({
  title: 'Changes saved',
  description: 'Your profile has been updated.',
});
```
**Example**  
```js
toastQueue.add('File uploaded.', {
  duration: 3000,
  action: {
    label: 'View',
    onClick: (toast) => {
      console.log(toast);
    },
  },
});
```
<a name="ToastQueue+get"></a>

### toastQueue.get(id) ⇒ <code>ToastRecord</code> \| <code>undefined</code>
Retrieves a toast by its identifier.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>ToastRecord</code> \| <code>undefined</code> - The matching toast, or `undefined` when no toast with that identifier exists.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Toast identifier. |

<a name="ToastQueue+close"></a>

### toastQueue.close(id)
Closes a toast and removes it from the queue.

Closing a toast also cancels its auto-dismiss timer and updates queue state.
If the toast has an `onClose` callback, it is invoked after the queue has
been updated.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Toast identifier. |

<a name="ToastQueue+clear"></a>

### toastQueue.clear()
Closes all toasts and clears the queue.

All auto-dismiss timers are cancelled and the queue is reset to its empty state.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+pause"></a>

### toastQueue.pause()
Pauses all toast auto-dismiss timers.

Calling this method does not remove or hide toasts. Timers resume from
their remaining time when [resume](#ToastQueue+resume) is called.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+resume"></a>

### toastQueue.resume()
Resumes all paused toast auto-dismiss timers.

Has no effect when the queue is already running.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+destroy"></a>

### toastQueue.destroy()
Permanently destroys the queue instance.

Removes the queue element, clears all auto-dismiss timers, removes event
listeners, and releases the associated resources.

After calling `destroy()`, the queue instance must not be used again.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueueOptions"></a>

## ToastQueueOptions : <code>Object</code>
Configuration options for a [ToastQueue](#ToastQueue).

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [root] | <code>HTMLElement</code> | <code>document.body</code> | Container into which the queue is mounted. |
| [duration] | <code>number</code> | <code>6000</code> | Default auto-dismiss duration in milliseconds. Use `0` to disable   automatic dismissal. |
| [position] | [<code>ToastQueuePosition</code>](#ToastQueuePosition) | <code>&#x27;top-end&#x27;</code> | Position of the toast queue. |
| [visibleLimit] | <code>number</code> | <code>3</code> | Number of toasts considered visible at once. Additional toasts remain   queued and can be exposed by CSS presets. |
| [template] | [<code>ToastQueueTemplate</code>](#ToastQueueTemplate) |  | Optional HTML templates used to render the queue, toast items, and   action buttons. |

<a name="ToastQueuePosition"></a>

## ToastQueuePosition : <code>&#x27;top-start&#x27;</code> \| <code>&#x27;top-center&#x27;</code> \| <code>&#x27;top-end&#x27;</code> \| <code>&#x27;center&#x27;</code> \| <code>&#x27;bottom-start&#x27;</code> \| <code>&#x27;bottom-center&#x27;</code> \| <code>&#x27;bottom-end&#x27;</code>
Position of the toast queue.

**Kind**: global typedef  
<a name="ToastQueueTemplate"></a>

## ToastQueueTemplate : <code>Object</code>
HTML templates used to render a toast queue.

Templates are expected to contain the data-part attributes used by the
library to locate and update their elements.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [root] | <code>string</code> | HTML for the queue root and toast group. |
| [item] | <code>string</code> | HTML for an individual toast item. |
| [actionButton] | <code>string</code> | HTML for an individual action button. |

<a name="ToastContent"></a>

## ToastContent : <code>string</code> \| [<code>ToastContentObject</code>](#ToastContentObject)
Content displayed by a toast.

**Kind**: global typedef  
<a name="ToastContentObject"></a>

## ToastContentObject : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| title | <code>string</code> | Primary toast message. |
| [description] | <code>string</code> | Optional supporting text displayed below the title. |

<a name="ToastOptions"></a>

## ToastOptions : <code>Object</code>
Configuration for an individual toast.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [duration] | <code>number</code> |  | Auto-dismiss duration in milliseconds. `0` disables automatic dismissal. |
| [dismissible] | <code>boolean</code> | <code>true</code> | Whether the toast can be manually dismissed. |
| [priority] | [<code>ToastPriority</code>](#ToastPriority) | <code>&#x27;normal&#x27;</code> | Announcement priority passed to `ariaNotify()`. |
| [className] | <code>string</code> |  | Additional CSS class names applied to the toast. |
| [icon] | <code>string</code> |  | HTML markup rendered in the toast's icon slot. |
| [action] | [<code>ToastAction</code>](#ToastAction) |  | Optional action button configuration. |
| [onClose] | [<code>ToastCloseHandler</code>](#ToastCloseHandler) |  | Called after the toast has been closed and removed from the queue. |

<a name="ToastPriority"></a>

## ToastPriority : <code>&#x27;normal&#x27;</code> \| <code>&#x27;high&#x27;</code>
Toast priority used for screen-reader announcements.

`high` requests a higher announcement priority from `ariaNotify()`.

**Kind**: global typedef  
<a name="ToastAction"></a>

## ToastAction : <code>Object</code>
Configuration for an optional toast action button.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| label | <code>string</code> | Text displayed in the action button. |
| [onClick] | [<code>ToastActionHandler</code>](#ToastActionHandler) | Called when the action button is clicked. |

<a name="ToastActionHandler"></a>

## ToastActionHandler ⇒ <code>void</code>
Called when a toast action button is clicked.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| toast | <code>ToastRecord</code> | The toast associated with the action. |

<a name="ToastCloseHandler"></a>

## ToastCloseHandler ⇒ <code>void</code>
Called after a toast is closed and removed from the queue.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| toast | <code>ToastRecord</code> | The toast that was closed. |

