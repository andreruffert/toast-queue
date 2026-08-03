import { afterEach, describe, expect, test, vi } from 'vitest';
import { Swipeable } from './swipeable.js';

describe('Swipeable', () => {
  const containers = [];

  function createTarget(root, direction = 'right') {
    const target = document.createElement('div');
    target.dataset.swipeable = direction;
    target.style.width = '100px';
    root.appendChild(target);
    return target;
  }

  function fire(target, type, x) {
    target.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: 0 }),
    );
  }

  afterEach(() => {
    containers.forEach((container) => {
      container.remove();
    });
    containers.length = 0;
    vi.restoreAllMocks();
  });

  test('flags the target with data-dragging while a drag is in progress', () => {
    const root = document.createElement('div');
    document.body.append(root);
    containers.push(root);

    const target = createTarget(root);
    const swipeable = new Swipeable({ root });

    fire(target, 'pointerdown', 0);
    fire(target, 'pointermove', 40);

    expect(target.dataset.dragging).toBe('');

    fire(target, 'pointerup', 40);

    swipeable.destroy();
  });

  test('only claims a drag for targets inside its own root', async () => {
    // Regression test: two Swipeable instances (e.g. two ToastQueues on
    // screen at once) used to both react to the same pointerdown, since
    // neither checked which root the target actually belonged to — a swipe
    // on one queue's toast could also fire the other queue's onSwipe.
    const rootA = document.createElement('div');
    const rootB = document.createElement('div');
    document.body.append(rootA, rootB);
    containers.push(rootA, rootB);

    const targetA = createTarget(rootA);
    createTarget(rootB);

    const onSwipeA = vi.fn();
    const onSwipeB = vi.fn();
    const swipeableA = new Swipeable({ root: rootA, onSwipe: onSwipeA });
    const swipeableB = new Swipeable({ root: rootB, onSwipe: onSwipeB });

    // A full swipe on targetA: far enough (>50% of its width) to clear the
    // completion threshold regardless of velocity/acceleration.
    fire(targetA, 'pointerdown', 0);
    fire(targetA, 'pointermove', 90);
    fire(targetA, 'pointerup', 90);

    await vi.waitFor(() => {
      expect(onSwipeA).toHaveBeenCalledTimes(1);
    });

    expect(onSwipeB).not.toHaveBeenCalled();

    swipeableA.destroy();
    swipeableB.destroy();
  });

  test('defaults to document as its root when none is given', () => {
    const target = createTarget(document.body);
    containers.push(target);

    const onSwipe = vi.fn();
    const swipeable = new Swipeable({ onSwipe });

    fire(target, 'pointerdown', 0);
    fire(target, 'pointermove', 40);

    expect(target.dataset.dragging).toBe('');

    fire(target, 'pointerup', 40);

    swipeable.destroy();
  });
});
