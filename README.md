# toast-queue

> A unstyled, accessible Vanilla JS library to display brief, temporary toast messages.

- Framework agnostic: Vanilla JavaScript without dependencies.
- Headless UI: Complete styling control without any pre-defined visual styles.
- Accessible: Toasts are announced to screen readers via [`ariaNotify()`](#browser-support), are keyboard-dismissible (<kbd>Escape</kbd>), and receive focus in document order.
- Focus management: When a toast closes, focus shifts to the next or previous toast, if available.
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) ready: Smooth animations using modern browser features.
- Touch-friendly swiping: Native gesture support for dismissing toasts.

> [!NOTE]
> Work in progress.

## Contents

- [Usage](#usage)
- [Presets](#presets)
- [Options](#options)
- [Browser support](#browser-support)
- [Documentation](#documentation)
- [Development](#development)

## Usage

To start using the library, install it via npm:

```shell
npm install toast-queue
```

Create a new `ToastQueue` instance. This will be the place where all your toasts will be rendered.

```js
import ToastQueue from 'toast-queue'

// ...

const tq = new ToastQueue();
```

Then, you can use the provided `ToastQueue` API to trigger a toast from anywhere.

```html
<button onclick="tq.add('Toast message...');">Trigger toast</button>
```

## Presets

`toast-queue` ships unstyled by default — you own every pixel. If you'd rather start from a look and adjust from there, two optional presets are included:

```js
import 'toast-queue/presets/minimal.css';
// or
import 'toast-queue/presets/stacked.css';
```

- **minimal** — a simple vertical list.
- **stacked** — a card-stack "peek" effect, where toasts beyond `visibleLimit` collapse behind the topmost one.

Both are plain CSS layered under `@layer toast-queue`, so your own styles will win by default — treat them as a starting point, not a lock-in.

## Options

```js
new ToastQueue({
  root: document.body,      // Container element for the toast queue
  duration: 6000,            // Auto-dismiss duration in ms (0 disables it)
  placement: 'top-end',      // 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end'
  visibleLimit: 3,           // Toasts rendered before the rest are flagged hidden
  template: { root, item, actionButton }, // Override the default markup
});
```

`placement` and `visibleLimit` are also live setters (`toastQueue.placement = 'bottom-center'`) and update everything in place.

Per-toast options are passed as the second argument to `.add()` — see [API.md](./API.md) for the full list (`dismissible`, `priority`, `icon`, `action`, `onClose`, etc.).

## Browser support

`toast-queue` uses modern, progressively-enhanced browser features — [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), and [`ariaNotify()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify) — and falls back gracefully where a browser doesn't yet support them (e.g. toasts still render and function without animation, just without a transition).

`ariaNotify()` is the one exception worth calling out: it's how toasts are announced to screen readers, and without it (or a fallback), screen reader users on browsers that haven't shipped it yet won't hear an announcement when a toast appears. If that matters for your app, install the polyfill and load it conditionally so browsers with native support skip it entirely:

```shell
npm install @github/arianotify-polyfill
```

```js
if (typeof HTMLElement.prototype.ariaNotify !== 'function') {
  await import('@github/arianotify-polyfill');
}

const tq = new ToastQueue();
```

## Documentation

- [API reference](./API.md)

## License

Distributed under the MIT license. See LICENSE for details.

© [André Ruffert](https://andreruffert.com)
