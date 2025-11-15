## Classes

<dl>
<dt><a href="#ToastQueue">ToastQueue</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ToastQueueActivationMode">ToastQueueActivationMode</a> : <code>&#x27;hover&#x27;</code> | <code>&#x27;click&#x27;</code></dt>
<dd><p>Possible activation modes for the toast queue.</p>
</dd>
<dt><a href="#ToastQueuePlacement">ToastQueuePlacement</a> : <code>&#x27;top-start&#x27;</code> | <code>&#x27;top-center&#x27;</code> | <code>&#x27;top-end&#x27;</code> | <code>&#x27;bottom-start&#x27;</code> | <code>&#x27;bottom-center&#x27;</code> | <code>&#x27;bottom-end&#x27;</code> | <code>&#x27;center&#x27;</code></dt>
<dd><p>Possible placement positions for the toast queue.</p>
</dd>
<dt><a href="#ToastQueueOptions">ToastQueueOptions</a> : <code>Object</code></dt>
<dd><p>Configuration options for the ToastQueue.</p>
</dd>
<dt><a href="#ToastContent">ToastContent</a> : <code>string</code> | <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastOptions">ToastOptions</a> : <code>Object</code></dt>
<dd><p>Configuration options for the Toast.</p>
</dd>
</dl>

<a name="ToastQueue"></a>

## ToastQueue
**Kind**: global class  

* [ToastQueue](#ToastQueue)
    * [new ToastQueue()](#new_ToastQueue_new)
    * [.ToastQueue](#ToastQueue+ToastQueue)
        * [new exports.ToastQueue(options)](#new_ToastQueue+ToastQueue_new)
    * [.placement](#ToastQueue+placement) ⇒ [<code>ToastQueuePlacement</code>](#ToastQueuePlacement)
    * [.placement](#ToastQueue+placement)
    * [.get(toastId)](#ToastQueue+get) ⇒ <code>Object</code> \| <code>undefined</code>
    * [.add(content, options)](#ToastQueue+add) ⇒ <code>string</code>
    * [.close(id)](#ToastQueue+close)
    * [.clear()](#ToastQueue+clear)
    * [.pause()](#ToastQueue+pause)
    * [.resume()](#ToastQueue+resume)
    * [.destroy()](#ToastQueue+destroy) ⇒ <code>void</code>

<a name="new_ToastQueue_new"></a>

### new ToastQueue()
Create and manage accessible toast messages that can be styled as needed.

<a name="ToastQueue+ToastQueue"></a>

### toastQueue.ToastQueue
**Kind**: instance class of [<code>ToastQueue</code>](#ToastQueue)  
<a name="new_ToastQueue+ToastQueue_new"></a>

#### new exports.ToastQueue(options)
Creates an instance of ToastQueue.


| Param | Type | Description |
| --- | --- | --- |
| options | [<code>ToastQueueOptions</code>](#ToastQueueOptions) | Configuration options. |

<a name="ToastQueue+placement"></a>

### toastQueue.placement ⇒ [<code>ToastQueuePlacement</code>](#ToastQueuePlacement)
Gets the current toast placement.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) - The current placement.  
<a name="ToastQueue+placement"></a>

### toastQueue.placement
Sets the toast placement position.

**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| value | [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) | The new placement. |

<a name="ToastQueue+get"></a>

### toastQueue.get(toastId) ⇒ <code>Object</code> \| <code>undefined</code>
Retrieves a toast by its ID.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>Object</code> \| <code>undefined</code> - The toast object if found, otherwise undefined.  

| Param | Type | Description |
| --- | --- | --- |
| toastId | <code>string</code> | The ID of the toast to retrieve. |

<a name="ToastQueue+add"></a>

### toastQueue.add(content, options) ⇒ <code>string</code>
Adds a new toast notification to the queue and renders it.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: <code>string</code> - The generated toast ID.  

| Param | Type | Description |
| --- | --- | --- |
| content | [<code>ToastContent</code>](#ToastContent) | The message content (text or object). |
| options | [<code>ToastOptions</code>](#ToastOptions) | Toast configuration options. |

<a name="ToastQueue+close"></a>

### toastQueue.close(id)
Closes a toast by its ID.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The ID of the toast to close. |

<a name="ToastQueue+clear"></a>

### toastQueue.clear()
Clears all toasts from the queue.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+pause"></a>

### toastQueue.pause()
Pauses all active toast timers.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+resume"></a>

### toastQueue.resume()
Resumes all paused toast timers.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+destroy"></a>

### toastQueue.destroy() ⇒ <code>void</code>
Removes event listeners and cleans up resources.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueueActivationMode"></a>

## ToastQueueActivationMode : <code>&#x27;hover&#x27;</code> \| <code>&#x27;click&#x27;</code>
Possible activation modes for the toast queue.

**Kind**: global typedef  
<a name="ToastQueuePlacement"></a>

## ToastQueuePlacement : <code>&#x27;top-start&#x27;</code> \| <code>&#x27;top-center&#x27;</code> \| <code>&#x27;top-end&#x27;</code> \| <code>&#x27;bottom-start&#x27;</code> \| <code>&#x27;bottom-center&#x27;</code> \| <code>&#x27;bottom-end&#x27;</code> \| <code>&#x27;center&#x27;</code>
Possible placement positions for the toast queue.

**Kind**: global typedef  
<a name="ToastQueueOptions"></a>

## ToastQueueOptions : <code>Object</code>
Configuration options for the ToastQueue.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [duration] | <code>number</code> | <code>6000</code> | Auto-dismiss duration in milliseconds. |
| [activationMode] | [<code>ToastQueueActivationMode</code>](#ToastQueueActivationMode) \| <code>null</code> | <code></code> | Activation mode (e.g., 'hover', 'click'). Toggles a `data-active` attribute on the root part using a view transition. |
| [placement] | [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) \| <code>null</code> | <code>&#x27;top-end&#x27;</code> | Position on screen. |
| [root] | <code>HTMLElement</code> | <code>document.body</code> | Container element for the toast queue. |
| [pauseOnPageIdle] | <code>boolean</code> | <code>true</code> | Pause timers when page is hidden. |
| template | <code>Object</code> |  | HTML templates for toast queue elements. |
| template.root | <code>string</code> |  | Template HTML for the toast container. |
| template.item | <code>string</code> |  | Template HTML for individual toast items. |
| template.actionButton | <code>string</code> |  | Template HTML for action buttons. |

<a name="ToastContent"></a>

## ToastContent : <code>string</code> \| <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| content | <code>string</code> \| <code>Object</code> | The toast's content. |
| [content.title] | <code>string</code> | Optional title of the toast. |
| [content.description] | <code>string</code> | Optional description or message of the toast. |

<a name="ToastOptions"></a>

## ToastOptions : <code>Object</code>
Configuration options for the Toast.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Toast-specific options. |
| [options.className] | <code>string</code> |  | Additional CSS class. |
| [options.duration] | <code>number</code> |  | Override auto-dismiss duration. |
| [options.dismissible] | <code>boolean</code> | <code>true</code> | Whether toast can be manually closed. |
| [options.icon] | <code>string</code> |  | Icon HTML. |
| [options.action] | <code>Object</code> \| <code>string</code> |  | Action button configuration. |
| options.action.label | <code>string</code> |  | Button label. |
| options.action.onClick | <code>function</code> |  | Click handler. |
| [options.onClose] | <code>function</code> |  | Callback when toast is closed. |

