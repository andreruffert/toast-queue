import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ToastQueue } from './index.js';

test('renders an accessible toast message', async () => {
  const toastQueue = new ToastQueue();
  const rootElement = page.getByLabelText('Notifications');
  const groupElement = document.querySelector('[data-part="group"]');

  await expect.element(rootElement).toBeInTheDocument();
  expect(groupElement).toBeInTheDocument();
  await expect.element(rootElement).toHaveAttribute('role', 'region');
  await expect.element(rootElement).toHaveAttribute('tabindex', '-1');
  await expect.element(rootElement).toHaveAttribute('popover', 'manual');
  await expect.element(rootElement).toHaveAttribute('data-placement', 'top-end');

  const toastRef = toastQueue.add(
    {
      title: 'Toast notification',
      description: '...',
    },
    {
      onClose: vi.fn(),
    },
  );

  const toastElement = page.getByRole('alertdialog', { name: toastRef.content.title });
  const toastContent = page.getByRole('alert');
  const toastTitle = page.getByText(toastRef.content.title);
  const toastDescription = page.getByText(toastRef.content.description);
  const closeButton = page.getByRole('button', { name: 'Close' });

  // Updates the region label when adding a toast
  await expect.element(page.getByLabelText('1 notification')).not.toBeUndefined();

  await expect.element(toastElement).toBeInTheDocument();
  await expect.element(toastElement).toHaveAttribute('tabindex', '0');
  await expect.element(toastElement).toHaveAttribute('aria-modal', 'false');
  await expect.element(toastElement).toHaveAccessibleDescription(toastRef.content.description);
  await expect.element(toastElement).toHaveAttribute('data-id', toastRef.id);
  await expect.element(toastElement).toHaveAttribute('data-part', 'toast');
  await expect.element(toastElement).toHaveAttribute('data-dismissible', 'true');
  await expect.element(toastElement).toHaveAttribute('data-part', 'toast');

  await expect.element(toastContent).toBeInTheDocument();
  await expect.element(toastContent).toHaveAttribute('data-part', 'content');
  await expect.element(toastContent).toHaveAttribute('aria-atomic', 'true');

  await expect.element(toastTitle).toBeInTheDocument();
  await expect.element(toastTitle).toHaveAttribute('data-part', 'title');

  await expect.element(toastDescription).toBeInTheDocument();
  await expect.element(toastDescription).toHaveAttribute('data-part', 'description');

  await expect.element(closeButton).toBeInTheDocument();
  await closeButton.click();
  expect(toastRef.onClose).toHaveBeenCalled();

  // Updates the region label when removing a toast
  await expect.element(page.getByLabelText('0 notifications')).not.toBeUndefined();

  // Destroy instance
  toastQueue.destroy();
});

test('toast action', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add(
    {
      title: 'Toast notification',
      description: '...',
    },
    {
      action: {
        label: 'Action',
        onClick: vi.fn(),
      },
    },
  );

  const actionTrigger = page.getByRole('button', { name: 'Action' });
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content.title });

  // Triggers the action callback
  await actionTrigger.click();
  expect(toastRef.action.onClick).toHaveBeenCalled();

  // Ation triggers should close the toast
  expect(toastQueue.get(toastRef.id)).toBeUndefined();
  await expect.element(toastElement).not.toBeInTheDocument();

  // Destroy instance
  toastQueue.destroy();
});

test('toast content - string', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add('Toast content');
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content });
  const toastContent = page.getByRole('alert', { atomic: 'true' });

  await expect.element(toastElement).toBeInTheDocument();
  await expect.element(toastContent).toBeInTheDocument();
  await expect.element(toastContent).toHaveTextContent(toastRef.content);

  // Destroy instance
  toastQueue.destroy();
});

test('toast content - object', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add({ title: 'Title', description: 'Description ...'});
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content.title });
  const toastContent = page.getByRole('alert');
  const toastTitle = page.getByText(toastRef.content.title);
  const toastDescription = page.getByText(toastRef.content.description);

  await expect.element(toastElement).toBeInTheDocument();
  await expect.element(toastContent).toBeInTheDocument();
  await expect.element(toastTitle).toBeInTheDocument();
  await expect.element(toastDescription).toBeInTheDocument();

  // Destroy instance
  toastQueue.destroy();
});
