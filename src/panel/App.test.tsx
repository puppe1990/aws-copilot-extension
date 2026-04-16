import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import { App } from './App';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('renders the extension name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'AWS Copilot' })).toBeInTheDocument();
});

it('switches to Portuguese', async () => {
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Language'), 'pt-BR');
  expect(
    screen.getByText('Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.')
  ).toBeInTheDocument();
});

it('advances through the guide', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Choose the objective' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Mark done' }));
  expect(screen.getByRole('heading', { name: 'Create the bucket' })).toBeInTheDocument();
});

it('sends a highlight message for the current step', async () => {
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: 'Mark done' }));
  await userEvent.click(screen.getByRole('button', { name: 'Highlight field' }));

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_HIGHLIGHT',
    selector: '[data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]'
  });
});
