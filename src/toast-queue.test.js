import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ToastQueue } from './index.js';
import { getSwipeableDirection } from './utils.js';

describe('ToastQueue', () => {
  let toastQueue;

  beforeEach(() => {
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
    expect(root).toHaveAttribute('data-placement', 'top-end');
  });

  test('renders toast content', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const toastPart = document.querySelector(`[data-part="toast"][data-id="${toastRef.id}"]`);

    expect(toastPart).toHaveAttribute('tabindex', '0');
    expect(toastPart).toHaveAttribute('data-dismissible', 'true');
    expect(toastPart).toHaveAttribute('data-swipeable', 'right');
  });

  test('renders title and description toast content', async () => {
    const toastRef = toastQueue.add({
      title: 'Title',
      description: 'Description',
    });

    await expect.element(page.getByText('Title')).toBeInTheDocument();

    await expect.element(page.getByText('Description')).toBeInTheDocument();

    const toastPart = document.querySelector(`[data-part="toast"][data-id="${toastRef.id}"]`);

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

    toastQueue.add('Toast message', {
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

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('removes actions part without an action', async () => {
    toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    expect(document.querySelector('[data-part="actions"]')).toBeNull();
  });

  test('closes toast through close button', async () => {
    const onClose = vi.fn();

    const toastRef = toastQueue.add('Toast message', {
      onClose,
    });

    await page
      .getByRole('button', {
        name: 'Close',
      })
      .click();

    expect(onClose).toHaveBeenCalledWith(toastRef);
    expect(toastQueue.get(toastRef.id)).toBeUndefined();
  });

  test('does not render close button for non-dismissible toast', async () => {
    const toastRef = toastQueue.add('Toast message', {
      dismissible: false,
    });

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const toastPart = document.querySelector(`[data-part="toast"][data-id="${toastRef.id}"]`);

    expect(toastPart).toHaveAttribute('data-dismissible', 'false');

    expect(toastPart).not.toHaveAttribute('data-swipeable');

    await expect
      .element(
        page.getByRole('button', {
          name: 'Close',
        }),
      )
      .not.toBeInTheDocument();
  });

  test('closes dismissible toast on Escape', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const toastPart = document.querySelector(`[data-part="toast"][data-id="${toastRef.id}"]`);
    toastPart.focus();

    toastPart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(toastQueue.get(toastRef.id)).toBeUndefined();
  });

  test('ignores Escape on a non-dismissible toast', async () => {
    const toastRef = toastQueue.add('Toast message', { dismissible: false });

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    const toastPart = document.querySelector(`[data-part="toast"][data-id="${toastRef.id}"]`);
    toastPart.focus();

    toastPart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(toastQueue.get(toastRef.id)).toBe(toastRef);
  });

  test('updates placement and swipe direction', async () => {
    const toastRef = toastQueue.add('Toast message');

    await expect.element(page.getByText('Toast message')).toBeInTheDocument();

    toastQueue.placement = 'bottom-center';

    await vi.waitFor(() => {
      expect(toastQueue.element).toHaveAttribute('data-placement', 'bottom-center');
    });

    const toastPart = document.querySelector(`[data-part="toast"][data-id="${toastRef.id}"]`);

    expect(toastPart).toHaveAttribute('data-swipeable', getSwipeableDirection('bottom-center'));
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

  test('clears pending toast timers on clear()', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    toastQueue.add('First', { duration: 5000 });
    toastQueue.add('Second', { duration: 5000 });

    clearTimeoutSpy.mockClear();

    toastQueue.clear();

    // One clearTimeout per pending toast timer — proves clear() doesn't just
    // drop the Map and leave the underlying setTimeouts running.
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
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

  test('pauses and resumes timers', () => {
    toastQueue.add('Toast message');

    toastQueue.pause();

    expect(toastQueue.isPaused).toBe(true);

    toastQueue.resume();

    expect(toastQueue.isPaused).toBe(false);
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

    const firstToast = document.querySelector(`[data-part="toast"][data-id="${first.id}"]`);

    const secondToast = document.querySelector(`[data-part="toast"][data-id="${second.id}"]`);

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

    const thirdToast = document.querySelector(`[data-part="toast"][data-id="${third.id}"]`);

    // Focusing a toast is one of the ways the queue expands (data-active).
    thirdToast.focus();

    await vi.waitFor(() => {
      expect(queue.element).toHaveAttribute('data-active', 'true');
    });

    queue.close(third.id);

    await vi.waitFor(() => {
      expect(queue.get(third.id)).toBeUndefined();
    });

    expect(queue.element).toHaveAttribute('data-active', 'true');

    queue.destroy();
  });

  test('destroys queue', () => {
    const root = toastQueue.element;

    toastQueue.destroy();

    expect(root.isConnected).toBe(false);
  });
});
