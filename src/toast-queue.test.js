import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ToastQueue } from './index.js';

test('defaults', async () => {
  const toastQueue = new ToastQueue();

  // const rootElement = page.getByRole('region', { name: 'Notifications' }).element();
  const rootElement = document.querySelector('toast-queue');
  const groupElement = document.querySelector('[data-part="group"]');

  await expect.element(rootElement).toBeInTheDocument();
  await expect.element(groupElement).toBeInTheDocument();

  expect(rootElement).toHaveAttribute('role', 'region');
  expect(rootElement).toHaveAttribute('tabindex', '-1');
  expect(rootElement).toHaveAttribute('popover', 'manual');
  expect(rootElement).toHaveAttribute('data-placement', 'top-end');
  // expect(rootElement).toHaveAccessibleName('Notifications');
  expect(rootElement).toHaveAttribute('aria-label', 'Notifications');

  toastQueue.destroy();
});

test('renders a toast message', async () => {
  const toastQueue = new ToastQueue();
  const onCloseCallback = vi.fn();
  const toastRef = toastQueue.add(
    {
      title: 'Toast notification',
      description: '...',
    },
    {
      onClose: onCloseCallback,
    },
  );

  // const rootElement = page.getByRole('region', { name: '1 notification' }).element();
  // const popoverElement = document.querySelector('[data-toast-queue]');
  const toastElement = page.getByRole('alertdialog');
  // const toastElement = document.querySelector('[data-part="toast"]');
  const toastContent = page.getByRole('alert');
  // const toastContent = document.querySelector('[data-part="content"]');
  const closeButton = page.getByRole('button', { name: 'Close' });
  // const closeButton = document.querySelector('[data-part="close-button"]');

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
  expect(toastElement).toHaveAttribute('data-id', toastRef.id);
  expect(toastElement).toHaveAttribute('data-part', 'toast');
  expect(toastElement).toHaveAttribute('data-dismissible', 'true');

  // expect(toastContent).toHaveAttribute('role', 'alert');
  expect(toastContent).toHaveAttribute('aria-atomic', 'true');

  // expect(closeButton).toHaveAttribute('aria-label', 'Close');

  await closeButton.click();
  expect(onCloseCallback).toHaveBeenCalled();
  // expect(popoverElement).toHaveAccessibleName('0 notifications');
  // expect(popoverElement).toHaveAttribute('aria-label', '0 notifications');

  toastQueue.destroy();
});
