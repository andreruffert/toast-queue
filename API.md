## Classes

<dl>
<dt><a href="#ToastQueue">ToastQueue</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ToastAction">ToastAction</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastContent">ToastContent</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastOptions">ToastOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ToastQueuePlacement">ToastQueuePlacement</a> : <code>&#x27;top-start&#x27;</code> | <code>&#x27;top-center&#x27;</code> | <code>&#x27;top-end&#x27;</code> | <code>&#x27;bottom-start&#x27;</code> | <code>&#x27;bottom-center&#x27;</code> | <code>&#x27;bottom-end&#x27;</code></dt>
<dd></dd>
<dt><a href="#ToastQueueActivationMode">ToastQueueActivationMode</a> : <code>&#x27;hover&#x27;</code> | <code>&#x27;click&#x27;</code> | <code>null</code></dt>
<dd></dd>
<dt><a href="#ToastQueueOptions">ToastQueueOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ActivationReason">ActivationReason</a> : <code>&#x27;hover&#x27;</code> | <code>&#x27;focus&#x27;</code> | <code>&#x27;click&#x27;</code></dt>
<dd></dd>
<dt><a href="#ToastQueueTemplate">ToastQueueTemplate</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="ToastQueue"></a>

## ToastQueue
**Kind**: global class  

* [ToastQueue](#ToastQueue)
    * [.ToastQueue](#ToastQueue+ToastQueue)
        * [new exports.ToastQueue([options])](#new_ToastQueue+ToastQueue_new)
    * [.placement](#ToastQueue+placement) ⇒ [<code>ToastQueuePlacement</code>](#ToastQueuePlacement)
    * [.placement](#ToastQueue+placement)
    * [.add(content, [options])](#ToastQueue+add) ⇒ <code>ToastRecord</code>
    * [.get(id)](#ToastQueue+get) ⇒ <code>ToastRecord</code> \| <code>undefined</code>
    * [.close(id)](#ToastQueue+close)
    * [.clear()](#ToastQueue+clear)
    * [.pause()](#ToastQueue+pause)
    * [.resume()](#ToastQueue+resume)
    * [.destroy()](#ToastQueue+destroy)

<a name="ToastQueue+ToastQueue"></a>

### toastQueue.ToastQueue
**Kind**: instance class of [<code>ToastQueue</code>](#ToastQueue)  
<a name="new_ToastQueue+ToastQueue_new"></a>

#### new exports.ToastQueue([options])

| Param | Type |
| --- | --- |
| [options] | [<code>ToastQueueOptions</code>](#ToastQueueOptions) | 

<a name="ToastQueue+placement"></a>

### toastQueue.placement ⇒ [<code>ToastQueuePlacement</code>](#ToastQueuePlacement)
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  
**Returns**: [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) - The current placement.  
<a name="ToastQueue+placement"></a>

### toastQueue.placement
**Kind**: instance property of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type | Description |
| --- | --- | --- |
| value | [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) | The new placement. |

<a name="ToastQueue+add"></a>

### toastQueue.add(content, [options]) ⇒ <code>ToastRecord</code>
**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type |
| --- | --- |
| content | <code>string</code> \| [<code>ToastContent</code>](#ToastContent) | 
| [options] | [<code>ToastOptions</code>](#ToastOptions) | 

<a name="ToastQueue+get"></a>

### toastQueue.get(id) ⇒ <code>ToastRecord</code> \| <code>undefined</code>
**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type |
| --- | --- |
| id | <code>string</code> | 

<a name="ToastQueue+close"></a>

### toastQueue.close(id)
**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  

| Param | Type |
| --- | --- |
| id | <code>string</code> | 

<a name="ToastQueue+clear"></a>

### toastQueue.clear()
Removes all toasts from the queue.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+pause"></a>

### toastQueue.pause()
Pauses all active toast timers.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+resume"></a>

### toastQueue.resume()
Resumes all active toast timers.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastQueue+destroy"></a>

### toastQueue.destroy()
Destroys the queue and removes all listeners.

**Kind**: instance method of [<code>ToastQueue</code>](#ToastQueue)  
<a name="ToastAction"></a>

## ToastAction : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| label | <code>string</code> | 
| [onClick] | <code>function</code> | 

<a name="ToastContent"></a>

## ToastContent : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| title | <code>string</code> | 
| [description] | <code>string</code> | 

<a name="ToastOptions"></a>

## ToastOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| [duration] | <code>number</code> |  | 
| [dismissible] | <code>boolean</code> | <code>true</code> | 
| [icon] | <code>string</code> |  | 
| [action] | [<code>ToastAction</code>](#ToastAction) |  | 
| [onClose] | <code>function</code> |  | 

<a name="ToastQueuePlacement"></a>

## ToastQueuePlacement : <code>&#x27;top-start&#x27;</code> \| <code>&#x27;top-center&#x27;</code> \| <code>&#x27;top-end&#x27;</code> \| <code>&#x27;bottom-start&#x27;</code> \| <code>&#x27;bottom-center&#x27;</code> \| <code>&#x27;bottom-end&#x27;</code>
**Kind**: global typedef  
<a name="ToastQueueActivationMode"></a>

## ToastQueueActivationMode : <code>&#x27;hover&#x27;</code> \| <code>&#x27;click&#x27;</code> \| <code>null</code>
**Kind**: global typedef  
<a name="ToastQueueOptions"></a>

## ToastQueueOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| [root] | <code>HTMLElement</code> | 
| [duration] | <code>number</code> | 
| [placement] | [<code>ToastQueuePlacement</code>](#ToastQueuePlacement) | 
| [activationMode] | [<code>ToastQueueActivationMode</code>](#ToastQueueActivationMode) | 
| [template] | [<code>ToastQueueTemplate</code>](#ToastQueueTemplate) | 

<a name="ActivationReason"></a>

## ActivationReason : <code>&#x27;hover&#x27;</code> \| <code>&#x27;focus&#x27;</code> \| <code>&#x27;click&#x27;</code>
**Kind**: global typedef  
<a name="ToastQueueTemplate"></a>

## ToastQueueTemplate : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| [root] | <code>string</code> | 
| [item] | <code>string</code> | 
| [actionButton] | <code>string</code> | 

