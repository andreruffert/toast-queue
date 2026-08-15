# toast-queue

[![Test status](https://img.shields.io/github/actions/workflow/status/andreruffert/toast-queue/test.yml?label=Test&logo=github&color=1a1a1a&labelColor=242424)](https://github.com/andreruffert/toast-queue/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/toast-queue?color=1a1a1a&labelColor=242424)](https://npmx.dev/package/toast-queue/versions)
[![npm downloads](https://img.shields.io/npm/dm/toast-queue?logo=npm&color=1a1a1a&labelColor=242424)](https://npmx.dev/package/toast-queue)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/toast-queue?color=1a1a1a&labelColor=242424)](https://www.jsdelivr.com/package/npm/toast-queue)

> Accessible, unstyled toast notifications for modern web apps. `toast-queue` is a tiny, framework-agnostic JavaScript library for managing toast notifications with native web APIs, progressive enhancement, and optional CSS presets.

- Framework agnostic: Vanilla JavaScript with zero runtime dependencies.
- Unstyled by design: Bring your own CSS or start with the included presets.
- Accessible: Screen-reader announcements via [`ariaNotify()`](#browser-support), keyboard dismissal with <kbd>Escape</kbd>, and focus management.
- Touch-friendly: Swipe to dismiss on touch devices.
- Progressively enhanced: uses modern browser APIs where available and falls back where possible.

> [!NOTE]
> Status: alpha. The API may change before the first stable release.

## Contents

- [Quick start](#quick-start)
- [Presets](#presets)
- [Configuration](#configuration)
- [Browser support](#browser-support)
- [API reference](#api-reference)

## Quick start

### Install

To start using the library, install it via npm:

```shell
npm install toast-queue
```

### Create a queue
Create a new `ToastQueue` instance.

```js
import ToastQueue from 'toast-queue'

// ...

const toastQueue = new ToastQueue();
```

### Add a toast

Add a toast whenever you need one:

```js
toastQueue.add('Toast message...');

toastQueue.add({
  title: 'Changes saved',
  description: 'Your profile has been updated.',
});

toastQueue.add(
  {
    title: 'Update available',
    description: 'A new version is ready to install.',
  },
  {
    action: {
      label: 'Reload',
      onClick: () => location.reload(),
    },
  },
);
```

## Styling

`toast-queue` ships unstyled by default, you own every pixel. If you'd rather start from a look and adjust from there, two optional presets are included.

### Presets

```js
import 'toast-queue/presets/minimal.css';
// or
import 'toast-queue/presets/stacked.css';
```

- **minimal**: a simple vertical list.
- **stacked**: a card-stack "peek" effect, where toasts beyond `visibleLimit` collapse behind the topmost one.

Both are plain CSS layered under `@layer toast-queue`, so your own styles will win by default. Treat them as a starting point, not a lock-in.

## Configuration

### Queue options

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

### Toast options

Per-toast options are passed as the second argument to `.add()`. See [API reference](./API.md#ToastOptions) for the full list.

## Browser support

toast-queue uses modern, progressively-enhanced browser features, [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), and [`ariaNotify()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify), and falls back gracefully where a browser doesn't yet support them (toasts still render and function without animation, just without a transition).

`ariaNotify()` provides the screen-reader announcement for newly created toasts. Browsers without native support can use a polyfill. Install the polyfill and load it conditionally so browsers with native support skip it entirely.

```shell
npm install @github/arianotify-polyfill
```

```js
if (typeof HTMLElement.prototype.ariaNotify !== 'function') {
  await import('@github/arianotify-polyfill');
}

const toastQueue = new ToastQueue();

// ...
```

## API reference

- [API reference](./API.md)

## License

Distributed under the MIT license. See LICENSE for details.

© [André Ruffert](https://andreruffert.com)
