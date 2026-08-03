<a name="ToastQueue"></a>

## ToastQueue
**Kind**: global class  

* [ToastQueue](#ToastQueue)
    * [new ToastQueue()](#new_ToastQueue_new)
    * [.ToastQueue](#ToastQueue+ToastQueue)
        * [new exports.ToastQueue([options])](#new_ToastQueue+ToastQueue_new)
    * [.isPaused](#ToastQueue+isPaused) ⇒ <code>boolean</code>
    * [.element](#ToastQueue+element) ⇒ <code>HTMLElement</code>
    * [.placement](#ToastQueue+placement) ⇒ <code>ToastQueuePlacement</code>
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
| [options] | <code>ToastQueueOptions</code> | Configuration options. |

<a name="ToastQueue+isPaused"></a>

### toastQueue.isPaused ⇒ <code>boolean</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>boolean</code> - - Whether toast timers are currently paused.  
<a name="ToastQueue+element"></a>

### toastQueue.element ⇒ <code>HTMLElement</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>HTMLElement</code> - - The root DOM element for this queue instance.  
<a name="ToastQueue+placement"></a>

### toastQueue.placement ⇒ <code>ToastQueuePlacement</code>
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>ToastQueuePlacement</code> - - The current placement.  
<a name="ToastQueue+placement"></a>

### toastQueue.placement
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>ToastQueuePlacement</code> | The new placement. |

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
| content | <code>string</code> \| <code>ToastContent</code> | Toast message content. |
| [options] | <code>ToastOptions</code> | Per-toast configuration. |

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
