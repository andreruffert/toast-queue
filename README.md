# toast-queue

> A unstyled, accessible Vanilla JS library to display brief, temporary toast messages.

- Framework agnostic: Vanilla JavaScript without dependencies.
- Headless UI: Complete styling control without any pre-defined visual styles.
- Accessible: Toasts are rendered in a [landmark region](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) and follow the [ARIA alertdialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/).
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) ready: Smooth animations using modern browser features.
- Touch-friendly swiping: Native gesture support for dismissing toasts.

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

## License

Distributed under the MIT license. See LICENSE for details. 

© [André Ruffert](https://andreruffert.com)
