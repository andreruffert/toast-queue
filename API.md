## Classes

<dl>
<dt><a href="#ToastQueue">ToastQueue</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ToastQueueOptions">ToastQueueOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastQueuePlacement">ToastQueuePlacement</a> : <code>&#x27;top-start&#x27;</code> | <code>&#x27;top-center&#x27;</code> | <code>&#x27;top-end&#x27;</code> | <code>&#x27;bottom-start&#x27;</code> | <code>&#x27;bottom-center&#x27;</code> | <code>&#x27;bottom-end&#x27;</code></dt>
<dd><p>Toast queue placement.</p>
</dd>
<dt><a href="#ToastQueueTemplate">ToastQueueTemplate</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastPriority">ToastPriority</a> : <code>&#x27;normal&#x27;</code> | <code>&#x27;high&#x27;</code></dt>
<dd></dd>
<dt><a href="#ToastOptions">ToastOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastContent">ToastContent</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastActionHandler">ToastActionHandler</a> ⇒ <code>void</code></dt>
<dd><p>Called when a toast action button is clicked.</p>
</dd>
<dt><a href="#ToastCloseHandler">ToastCloseHandler</a> ⇒ <code>void</code></dt>
<dd><p>Called when a toast is closed.</p>
</dd>
<dt><a href="#ToastAction">ToastAction</a> : <code>Object</code></dt>
<dd><p>Action button configuration.</p>
</dd>
</dl>

<a name="ToastQueue"></a>

## ToastQueue
**Kind**: global class  

* [ToastQueue](#ToastQueue)
    * [new ToastQueue()](#new_ToastQueue_new)
    * [.ToastQueue](#ToastQueue+ToastQueue)
        * [new exports.ToastQueue([options])](#new_ToastQueue+ToastQueue_new)
    * [.isPaused](#ToastQueue+isPaused) ⇒ <code>boolean</code>
    * [.element](#ToastQueue+element) ⇒ <code>HTMLElement</code>
    * [.size](#ToastQueue+size) ⇒ <code>number</code>
    * [.placement](#ToastQueue+placement) ⇒ [<code>ToastQueuePlacement</code>](#ToastQueuePlacement)
    * [.placement](#ToastQueue+placement)
    * [.visibleLimit](#ToastQueue+visibleLimit) ⇒ <code>number</code>
    * [.visibleLimit](#ToastQueue+visibleLimit)
    * [.add(content, [options])](#ToastQueue+add) ⇒ <code>ToastRecord</code>
    * [.get(id)](#ToastQueue+get) ⇒ <code>ToastRecord</code> \| <code>undefined</code>
    * [.close(id)](#ToastQueue+close)
    * [.clear()](#ToastQueue+clear)
    * [.pause()](#ToastQueue+pause)
    * [.resume()](#ToastQueue+resume)
    * [.destroy()](#ToastQueue+destroy)

<a name="new_ToastQueue_new"></a>

### new ToastQueue()
Manages a queue of toast notifications including rendering,
focus management, swipe dismissal, and auto-dismiss timers.

Toasts are announced to screen readers via
[`ariaNotify()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify)
where the browser supports it. On browsers that don't yet, announcements
are silently skipped unless a polyfill is loaded beforehand — see
[Browser support](README.md#browser-support)
in the README.

**Example**  
```js
// Optional: polyfill ariaNotify() on browsers that don't support it yet.
if (typeof HTMLElement.prototype.ariaNotify !== 'function') {
  await import('@github/arianotify-polyfill');
}

const tq = new ToastQueue();
```
<a name="ToastQueue+ToastQueue"></a>

### toastQueue.ToastQueue
**Kind**: instance class of [<code>ToastQueue</code>](#ToastQueue)  
<a name="new_ToastQueue+ToastQueue_new"></a>

#### new exports.ToastQueue([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>ToastQueueOptions</code>](#ToastQueueOptions) | Configuration options. |

<a name="ToastQueue+isPaused"></a>

### toastQueue.isPaused ⇒ <code>boolean</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>boolean</code> - - Whether toast timers are currently paused.  
<a name="ToastQueue+element"></a>

### toastQueue.element ⇒ <code>HTMLElement</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>HTMLElement</code> - - The root DOM element for this queue instance.  
<a name="ToastQueue+size"></a>

### toastQueue.size ⇒ <code>number</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>number</code> - - The number of toasts currently in the queue.  
<a name="ToastQueue+placement"></a>

### toastQueue.placement ⇒ [<code>ToastQueuePlacement</code>](#ToastQueuePlacement)
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) - - The current placement.  
<a name="ToastQueue+placement"></a>

### toastQueue.placement
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| value | [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) | The new placement. |

<a name="ToastQueue+visibleLimit"></a>

### toastQueue.visibleLimit ⇒ <code>number</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>number</code> - - The current visible limit.  
<a name="ToastQueue+visibleLimit"></a>

### toastQueue.visibleLimit
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>number</code> | The number of toasts to render visibly before hiding the rest. |

<a name="ToastQueue+add"></a>

### toastQueue.add(content, [options]) ⇒ <code>ToastRecord</code>
Adds a toast notification to the queue.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>ToastRecord</code> - The created toast record.  

| Param | Type | Description |
| --- | --- | --- |
| content | <code>string</code> \| [<code>ToastContent</code>](#ToastContent) | Toast message content. |
| [options] | [<code>ToastOptions</code>](#ToastOptions) | Per-toast configuration. |

<a name="ToastQueue+get"></a>

### toastQueue.get(id) ⇒ <code>ToastRecord</code> \| <code>undefined</code>
Retrieves a toast by id.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type |
| --- | --- |
| id | <code>string</code> | 

<a name="ToastQueue+close"></a>

### toastQueue.close(id)
Removes the specified toast from the queue.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Toast identifier. |

<a name="ToastQueue+clear"></a>

### toastQueue.clear()
Removes all toasts from the queue.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+pause"></a>

### toastQueue.pause()
Temporarily pauses all toast timers.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+resume"></a>

### toastQueue.resume()
Resumes all paused toast timers.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+destroy"></a>

### toastQueue.destroy()
Destroys the queue and removes all listeners.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueueOptions"></a>

## ToastQueueOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [root] | <code>HTMLElement</code> | <code>document.body</code> | Container element for the toast queue. |
| [duration] | <code>number</code> | <code>6000</code> | Auto-dismiss duration in milliseconds. |
| [placement] | [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) | <code>&#x27;top-end&#x27;</code> | Position on screen. |
| [visibleLimit] | <code>number</code> | <code>3</code> | Number of toasts rendered visibly before the rest are hidden (exposed via `data-hidden-count`). |
| [template] | [<code>ToastQueueTemplate</code>](#ToastQueueTemplate) |  | HTML templates. |

<a name="ToastQueuePlacement"></a>

## ToastQueuePlacement : <code>&#x27;top-start&#x27;</code> \| <code>&#x27;top-center&#x27;</code> \| <code>&#x27;top-end&#x27;</code> \| <code>&#x27;bottom-start&#x27;</code> \| <code>&#x27;bottom-center&#x27;</code> \| <code>&#x27;bottom-end&#x27;</code>
Toast queue placement.

**Kind**: global typedef  
<a name="ToastQueueTemplate"></a>

## ToastQueueTemplate : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [root] | <code>string</code> | HTML for the toast container. |
| [item] | <code>string</code> | HTML for individual toast items. |
| [actionButton] | <code>string</code> | HTML for action buttons. |

<a name="ToastPriority"></a>

## ToastPriority : <code>&#x27;normal&#x27;</code> \| <code>&#x27;high&#x27;</code>
**Kind**: global typedef  
<a name="ToastOptions"></a>

## ToastOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [duration] | <code>number</code> |  | Override the queue default auto-dismiss duration in milliseconds.  Use 0 to disable automatic dismissal. |
| [dismissible] | <code>boolean</code> | <code>true</code> | Whether toast can be manually closed. |
| [priority] | [<code>ToastPriority</code>](#ToastPriority) | <code>&#x27;normal&#x27;</code> |  |
| [className] | <code>string</code> |  | Additional CSS class. |
| [icon] | <code>string</code> |  | HTML markup rendered into the icon slot. |
| [action] | [<code>ToastAction</code>](#ToastAction) |  | Action button configuration. |
| [onClose] | [<code>ToastCloseHandler</code>](#ToastCloseHandler) |  | Called when the toast is closed. |

<a name="ToastContent"></a>

## ToastContent : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| title | <code>string</code> | Primary toast message. |
| [description] | <code>string</code> | Additional supporting text. |

<a name="ToastActionHandler"></a>

## ToastActionHandler ⇒ <code>void</code>
Called when a toast action button is clicked.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| toast | <code>ToastRecord</code> | The toast associated with the action. |

<a name="ToastCloseHandler"></a>

## ToastCloseHandler ⇒ <code>void</code>
Called when a toast is closed.

**Kind**: global typedef  

| Param | Type |
| --- | --- |
| toast | <code>ToastRecord</code> | 

<a name="ToastAction"></a>

## ToastAction : <code>Object</code>
Action button configuration.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| label | <code>string</code> | Text displayed in the action button. |
| [onClick] | [<code>ToastActionHandler</code>](#ToastActionHandler) |  |

