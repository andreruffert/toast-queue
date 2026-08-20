import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { ToastQueue } from './index.js';
import { getSwipeableDirection } from './utils.js';

describe('ToastQueue', () => {
  let toastQueue;

  beforeEach(async () => {
    // Reset the browser pointer between tests so a toast isn't immediately hovered
    // when it is rendered, which would pause its auto-dismiss timer.
    await userEvent.unhover(document.body);

    toastQueue = new ToastQueue();
  });

  afterEach(() => {
    toastQueue?.destroy();

    delete HTMLElement.prototype.ariaNotify;

    vi.restoreAllMocks();
  });

  test('mounts queue with default configuration', () => {
    const root = toastQueue.element;

    expect(root).toBeTruthy();
    expect(root).toHaveAttribute('popover', 'manual');
    expect(root).toHaveAttribute('tabindex', '-1');
    expect(root).toHaveAttribute('data-position', 'top-end');
  });

  test('renders toast content', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);
    const toastPart = item?.querySelector('[data-part="toast"]');

    expect(item).toHaveAttribute('data-dismissible', 'true');
    expect(item).toHaveAttribute('data-swipeable', 'right');

    expect(toastPart).toHaveAttribute('tabindex', '0');
  });

  test('renders title and description toast content', async () => {
    const toastRef = toastQueue.add({
      title: 'Title',
      description: 'Description',
    });

    await expect.element(page.getByText('Title')).toBeInTheDocument();

    await expect.element(page.getByText('Description')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);
    const toastPart = item?.querySelector('[data-part="toast"]');

    expect(item).toHaveAttribute('data-id', toastRef.id);

    expect(toastPart).toHaveAttribute('aria-labelledby', `tq:${toastRef.id}:title`);

    expect(toastPart).toHaveAttribute('aria-describedby', `tq:${toastRef.id}:desc`);
  });

  test('renders icon markup when provided', async () => {
    toastQueue.add('Toast message', {
      icon: '<span>Icon</span>',
    });

    await expect.element(page.getByText('Icon')).toBeInTheDocument();
  });

  test('removes icon part without icon', async () => {
    toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    expect(document.querySelector('[data-part="icon"]')).toBeNull();
  });

  test('renders action button and invokes callback', async () => {
    const onClick = vi.fn();
    const onAction = vi.fn();

    toastQueue.element.addEventListener('toast-action', onAction);

    const toastRef = toastQueue.add('Toast message', {
      action: {
        label: 'Action',
        onClick,
      },
    });

    const button = page.getByRole('button', {
      name: 'Action',
    });

    await expect.element(button).toBeInTheDocument();
    await button.click();

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0][0].detail).toEqual({
      toast: toastRef,
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('removes actions part without an action', async () => {
    toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    expect(document.querySelector('[data-part="actions"]')).toBeNull();
  });

  test('closes toast through close button', async () => {
    const onClose = vi.fn();
    const onToastClose = vi.fn();

    toastQueue.element.addEventListener('toast-close', onToastClose);

    const toastRef = toastQueue.add('Toast message', {
      onClose,
    });

    await page
      .getByRole('button', {
        name: 'Close',
      })
      .click();

    expect(onToastClose).toHaveBeenCalledTimes(1);

    const [event] = onToastClose.mock.calls[0];

    expect(event.detail).toEqual({
      toast: toastRef,
      reason: 'button',
    });

    expect(onClose).toHaveBeenCalledWith(toastRef);
    expect(toastQueue.get(toastRef.id)).toBeUndefined();
  });

  test('does not render close button for non-dismissible toast', async () => {
    const toastRef = toastQueue.add('Toast message', {
      dismissible: false,
    });

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);

    expect(item).toHaveAttribute('data-dismissible', 'false');
    expect(item).not.toHaveAttribute('data-swipeable');

    await expect
      .element(
        page.getByRole('button', {
          name: 'Close',
        }),
      )
      .not.toBeInTheDocument();
  });

  test('resolves commands from the item boundary', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.command = 'close';
    button.textContent = 'External close';
    item.appendChild(button);

    await page.getByRole('button', { name: 'External close' }).click();

    expect(toastQueue.get(toastRef.id)).toBeUndefined();
  });

  test('closes dismissible toast on Escape', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);
    const toastPart = item?.querySelector('[data-part="toast"]');

    toastPart.focus();

    toastPart.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    );

    expect(toastQueue.get(toastRef.id)).toBeUndefined();
  });

  test('ignores Escape on a non-dismissible toast', async () => {
    const toastRef = toastQueue.add('Toast message', {
      dismissible: false,
    });

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);
    const toastPart = item?.querySelector('[data-part="toast"]');

    toastPart.focus();

    toastPart.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    );

    expect(toastQueue.get(toastRef.id)).toBe(toastRef);
  });

  test('updates position and swipe direction', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    toastQueue.position = 'bottom-center';

    await vi.waitFor(() => {
      expect(toastQueue.element).toHaveAttribute('data-position', 'bottom-center');
    });

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);

    expect(item).toHaveAttribute('data-swipeable', getSwipeableDirection('bottom-center'));
  });

  test('flags items beyond visibleLimit as hidden and exposes the count', async () => {
    toastQueue.visibleLimit = 2;
    toastQueue.add('First');
    toastQueue.add('Second');
    toastQueue.add('Third');

    await expect.element(page.getByText('Third')).toBeInTheDocument();

    // Newest is prepended, so DOM order is [Third, Second, First].
    const items = document.querySelectorAll('[data-part="item"]');

    expect(toastQueue.element).toHaveAttribute('data-hidden-count', '1');
    expect(items[0]).not.toHaveAttribute('data-hidden');
    expect(items[1]).not.toHaveAttribute('data-hidden');
    expect(items[2]).toHaveAttribute('data-hidden');
    expect(items[2]).toHaveAttribute('data-peek');
  });

  test('drops data-hidden-count once toasts fall back within visibleLimit', async () => {
    toastQueue.visibleLimit = 2;

    toastQueue.add('First');
    toastQueue.add('Second');
    const third = toastQueue.add('Third');

    await expect.element(page.getByText('Third')).toBeInTheDocument();

    toastQueue.close(third.id);

    await vi.waitFor(() => {
      expect(toastQueue.element).not.toHaveAttribute('data-hidden-count');
    });
  });

  test('returns toast by id', () => {
    const toastRef = toastQueue.add('Toast message');

    expect(toastQueue.get(toastRef.id)).toBe(toastRef);
  });

  test('clears all toast items', async () => {
    toastQueue.add('First');
    toastQueue.add('Second');

    await expect.element(page.getByText('First')).toBeInTheDocument();

    toastQueue.clear();

    await vi.waitFor(() => {
      expect(document.querySelector('[data-part="item"]')).toBeNull();
    });
  });

  test('clears pending toast timers on clear()', async () => {
    const first = toastQueue.add('First', { duration: 50 });
    const second = toastQueue.add('Second', { duration: 50 });

    toastQueue.clear();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(toastQueue.get(first.id)).toBeUndefined();
    expect(toastQueue.get(second.id)).toBeUndefined();
    expect(toastQueue.size).toBe(0);
  });

  test('clears pending toast timers on destroy()', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    toastQueue.add('First', { duration: 5000 });

    clearTimeoutSpy.mockClear();

    toastQueue.destroy();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  test('auto dismisses toast', async () => {
    const queue = new ToastQueue({
      duration: 50,
    });

    const toastRef = queue.add('Toast message');

    await vi.waitFor(() => {
      expect(queue.get(toastRef.id)).toBeUndefined();
    });

    queue.destroy();
  });

  test('does not auto dismiss when duration is 0', async () => {
    const tq = new ToastQueue({ duration: 0 });

    const toastRef = tq.add('Toast message');

    // Longer than the auto-dismiss test above uses, to be confident this
    // isn't just "hasn't fired yet".
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(tq.get(toastRef.id)).toBe(toastRef);

    tq.destroy();
  });

  test('pauses and resumes timers', async () => {
    const queue = new ToastQueue({ duration: 50 });
    const toast = queue.add('Toast message');

    const pause = vi.fn();
    const resume = vi.fn();

    queue.element.addEventListener('pause', pause);
    queue.element.addEventListener('resume', resume);

    queue.pause();

    expect(pause).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Timer should remain paused.
    expect(queue.get(toast.id)).toBe(toast);

    queue.resume();

    expect(resume).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(queue.get(toast.id)).toBeUndefined();
    });

    queue.destroy();
  });

  test('announces toast using ariaNotify', async () => {
    const ariaNotify = vi.fn();

    HTMLElement.prototype.ariaNotify = ariaNotify;

    toastQueue.add('Toast message');

    await vi.waitFor(() => {
      expect(ariaNotify).toHaveBeenCalledWith('Toast message', {
        priority: 'normal',
      });
    });
  });

  test('announces title and description using ariaNotify', async () => {
    const ariaNotify = vi.fn();

    HTMLElement.prototype.ariaNotify = ariaNotify;

    toastQueue.add({
      title: 'Title',
      description: 'Description',
    });

    await vi.waitFor(() => {
      expect(ariaNotify).toHaveBeenCalledWith('Title. Description', {
        priority: 'normal',
      });
    });
  });

  test('moves focus after closing focused toast', async () => {
    const first = toastQueue.add('First');
    const second = toastQueue.add('Second');

    await expect.element(page.getByText('First')).toBeInTheDocument();
    await expect.element(page.getByText('Second')).toBeInTheDocument();

    const firstItem = document.querySelector(`[data-part="item"][data-id="${first.id}"]`);

    const secondItem = document.querySelector(`[data-part="item"][data-id="${second.id}"]`);

    const firstToast = firstItem?.querySelector('[data-part="toast"]');
    const secondToast = secondItem?.querySelector('[data-part="toast"]');

    firstToast.focus();

    expect(firstToast).toHaveFocus();

    toastQueue.close(first.id);

    await expect.element(secondToast).toHaveFocus();
  });

  test('keeps the queue expanded when closing the last visible toast', async () => {
    const queue = new ToastQueue({ visibleLimit: 3 });

    queue.add('First');
    queue.add('Second');
    const third = queue.add('Third');
    queue.add('Fourth');

    await expect.element(page.getByText('Third')).toBeInTheDocument();

    const thirdItem = document.querySelector(`[data-part="item"][data-id="${third.id}"]`);

    const thirdToast = thirdItem?.querySelector('[data-part="toast"]');

    // Focusing a toast is one of the ways the queue expands (data-active).
    thirdToast.focus();

    await vi.waitFor(() => {
      expect(queue.element).toHaveAttribute('data-active');
    });

    queue.close(third.id);

    await vi.waitFor(() => {
      expect(queue.get(third.id)).toBeUndefined();
    });

    expect(queue.element).toHaveAttribute('data-active');

    queue.destroy();
  });

  test('dispatches toast-add event', () => {
    const listener = vi.fn();

    toastQueue.element.addEventListener('toast-add', listener);

    const toast = toastQueue.add('Toast message');

    expect(listener).toHaveBeenCalledTimes(1);

    const [event] = listener.mock.calls[0];

    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail).toEqual({ toast });
    expect(event.bubbles).toBe(true);
  });

  test('dispatches pause and resume events', () => {
    const pause = vi.fn();
    const resume = vi.fn();

    toastQueue.element.addEventListener('pause', pause);
    toastQueue.element.addEventListener('resume', resume);

    toastQueue.add('Toast message');

    toastQueue.pause();

    expect(pause).toHaveBeenCalledTimes(1);
    expect(pause.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(pause.mock.calls[0][0].detail).toEqual({});

    toastQueue.resume();

    expect(resume).toHaveBeenCalledTimes(1);
    expect(resume.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(resume.mock.calls[0][0].detail).toEqual({});
  });

  test('dispatches activate and deactivate events', async () => {
    const activate = vi.fn();
    const deactivate = vi.fn();

    toastQueue.element.addEventListener('activate', activate);
    toastQueue.element.addEventListener('deactivate', deactivate);

    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const item = document.querySelector(`[data-part="item"][data-id="${toastRef.id}"]`);
    const toastPart = item?.querySelector('[data-part="toast"]');

    toastPart.focus();

    await vi.waitFor(() => {
      expect(activate).toHaveBeenCalledTimes(1);
    });

    expect(activate.mock.calls[0][0].detail).toEqual({
      reason: 'focus',
      reasons: ['focus'],
    });

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    await vi.waitFor(() => {
      expect(deactivate).toHaveBeenCalledTimes(1);
    });

    expect(deactivate.mock.calls[0][0].detail).toEqual({
      reason: 'focus',
    });

    outside.remove();
  });

  test('custom events bubble from the queue root', () => {
    const listener = vi.fn();

    document.body.addEventListener('toast-add', listener);

    toastQueue.add('Toast message');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].target).toBe(toastQueue.element);

    document.body.removeEventListener('toast-add', listener);
  });

  test('destroys queue', () => {
    const root = toastQueue.element;

    toastQueue.destroy();

    expect(root.isConnected).toBe(false);
  });
});
