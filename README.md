# toast-queue

> A unstyled, accessible Vanilla JS library to display brief, temporary toast messages.

- Framework agnostic: Vanilla JavaScript without dependencies.
- Headless UI: Complete styling control without any pre-defined visual styles.
- Accessible: Toasts are rendered in a [landmark region](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) and follow the [ARIA alertdialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/).
- Focus management: When a toast closes, the focus shifts to the next or previous toast, if available.
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) ready: Smooth animations using modern browser features.
- Touch-friendly swiping: Native gesture support for dismissing toasts.

> [!NOTE]  
> Work in progress.

## Usage

To start using the library, install it via npm:

```shell
npm install toast-queue
```

Create a new `ToastQueue` instance. This will be the place where all your toasts will be rendered.

```js
import ToastQueue from 'toast-queue'

// ...

const toastQueue = new ToastQueue();
```

Then, you can use the provided `ToastQueue` API to trigger a toast from anywhere.

```html
<button onclick="toastQueue.add('Toast message...');">Trigger toast</button>
```

## Browser support

`toast-queue` uses modern, progressively-enhanced browser features — [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), and [`ariaNotify()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify) — and falls back gracefully where a browser doesn't yet support them (e.g. toasts still render and function without animation, just without a transition).

`ariaNotify()` is the one exception worth calling out: without it (or a fallback), screen reader users on browsers that haven't shipped it yet won't hear an announcement when a toast appears. If that matters for your app, install the polyfill and load it conditionally so browsers with native support skip it entirely:

```shell
npm install @github/arianotify-polyfill
```

```js
if (typeof HTMLElement.prototype.ariaNotify !== 'function') {
  await import('@github/arianotify-polyfill');
}

const toastQueue = new ToastQueue();
```

## Documentation

- [API reference](./API.md)

## License

Distributed under the MIT license. See LICENSE for details. 

© [André Ruffert](https://andreruffert.com)
