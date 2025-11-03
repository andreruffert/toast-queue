import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ToastQueue } from './index.js';
import { getSwipeableDirection } from './utils.js';

test('renders a toast that is fully accessible', async () => {
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

  // TODO: const toastItem = page.getByRole('listitem');
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
  await expect.element(toastElement).toHaveAttribute('data-swipeable', 'right');
  await expect.element(toastElement).toHaveAttribute('data-dismissible', 'true');

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

test('renders a toast with action', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add(
    {
      title: 'Title',
      description: 'Description',
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

  // Calls the action callback
  await actionTrigger.click();
  expect(toastRef.action.onClick).toHaveBeenCalled();

  // Action triggers should close the toast
  expect(toastQueue.get(toastRef.id)).toBeUndefined();
  await expect.element(toastElement).not.toBeInTheDocument();

  // Destroy instance
  toastQueue.destroy();
});

test('renders a toast with content string', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add('Toast message');
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content });
  const toastContent = page.getByRole('alert', { atomic: 'true' });

  await expect.element(toastElement).toBeInTheDocument();
  await expect.element(toastContent).toBeInTheDocument();
  await expect.element(toastContent).toHaveTextContent(toastRef.content);

  // Destroy instance
  toastQueue.destroy();
});

test('renders a toast with title and description', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add({ title: 'Title', description: 'Description' });
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

test('renders a toast that auto-dismisses', async () => {
  const toastQueue = new ToastQueue({ pauseOnPageIdle: false });
  const toastOptions = { duration: 100 };
  const toastRef = toastQueue.add('Toast message', toastOptions);
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content });

  await expect.element(toastElement).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, toastOptions.duration));
  await expect.element(toastElement).not.toBeInTheDocument();

  // Destroy instance
  toastQueue.destroy();
});

test('renders a toast that is not dismissible', async () => {
  const toastQueue = new ToastQueue();
  const toastRef = toastQueue.add('Toast message', { dismissible: false });
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content });
  const closeButton = page.getByRole('button', { name: 'Close' });

  await expect.element(toastElement).toHaveAttribute('data-dismissible', 'false');
  await expect.element(toastElement).not.toHaveAttribute('data-swipeable');
  await expect.element(closeButton).not.toBeInTheDocument();

  // Destroy instance
  toastQueue.destroy();
});

test('toast placement', async () => {
  const placement = 'top-center';
  const toastQueue = new ToastQueue({ duration: null, placement });
  const toastRef = toastQueue.add('Toast message');
  const rootElement = page.getByLabelText('1 notification');
  const toastElement = page.getByRole('alertdialog', { name: toastRef.content });

  await expect.element(rootElement).toBeInTheDocument();
  await expect.element(rootElement).toHaveAttribute('data-placement', 'top-center');
  await expect
    .element(toastElement)
    .toHaveAttribute('data-swipeable', getSwipeableDirection(placement));

  // Destroy instance
  toastQueue.destroy();
});
