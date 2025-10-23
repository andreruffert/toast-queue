import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ToastQueue } from './toast-queue.js';

test('defaults', async () => {
  const toastQueue = new ToastQueue();

  // const popoverElement = page.getByRole('region', { name: 'Notifications' }).element();
  const popoverElement = document.querySelector('[data-tq-part="popover"]');
  const groupElement = document.querySelector('[data-tq-part="group"]');

  await expect.element(popoverElement).toBeInTheDocument();
  await expect.element(groupElement).toBeInTheDocument();

  expect(popoverElement).toHaveAttribute('role', 'region');
  expect(popoverElement).toHaveAttribute('tabindex', '-1');
  expect(popoverElement).toHaveAttribute('popover', 'manual');
  expect(popoverElement).toHaveAttribute('data-tq-part', 'popover');
  expect(popoverElement).toHaveAttribute('data-tq-position', 'top end');
  // expect(popoverElement).toHaveAccessibleName('Notifications');
  expect(popoverElement).toHaveAttribute('aria-label', 'Notifications');

  toastQueue.unmount();
});

test('renders a toast message', async () => {
  const toastQueue = new ToastQueue();
  const onCloseCallback = vi.fn();
  const toastRef = toastQueue.add('Toast notification', {
    onClose: onCloseCallback,
  });

  // const popoverElement = page.getByRole('region', { name: '1 notification' }).element();
  // const popoverElement = document.querySelector('[data-tq-part="popover"]');
  const toastElement = page.getByRole('alertdialog');
  // const toastElement = document.querySelector('[data-tq-part="toast"]');
  const toastContent = page.getByRole('alert');
  // const toastContent = document.querySelector('[data-tq-part="content"]');
  const closeButton = page.getByRole('button', { name: 'Close' });
  // const closeButton = document.querySelector('[data-tq-part="close-button"]');

  await expect.element(toastElement).toBeInTheDocument();
  await expect.element(toastContent).toBeInTheDocument();
  await expect.element(closeButton).toBeInTheDocument();

  // expect(popoverElement).toHaveAttribute('aria-label', '1 notification');
  expect(toastElement).toHaveAttribute('tabindex', '0');
  // expect(toastElement).toHaveAttribute('role', 'alertdialog');
  expect(toastElement).toHaveAttribute('aria-modal', 'false');
  // expect(toastElement).toHaveAttribute('aria-labelledby', `aria-label-${toastRef.id}`);
  expect(toastElement).toHaveAccessibleName(toastRef.content?.title || toastRef.content);
  expect(toastElement).toHaveAccessibleDescription(toastRef.content?.description || '');
  expect(toastElement).toHaveAttribute('data-tq-id', toastRef.id);
  expect(toastElement).toHaveAttribute('data-tq-part', 'toast');
  expect(toastElement).toHaveAttribute('data-tq-dismissible', 'true');

  // expect(toastContent).toHaveAttribute('role', 'alert');
  expect(toastContent).toHaveAttribute('aria-atomic', 'true');

  // expect(closeButton).toHaveAttribute('aria-label', 'Close');

  await closeButton.click();
  expect(onCloseCallback).toHaveBeenCalled();
  // expect(popoverElement).toHaveAccessibleName('0 notifications');
  // expect(popoverElement).toHaveAttribute('aria-label', '0 notifications');

  toastQueue.unmount();
});
