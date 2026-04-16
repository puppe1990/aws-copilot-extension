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
  expect(screen.getByRole('button', { name: 'Start guide' })).toBeInTheDocument();
});

it('switches to Portuguese', async () => {
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Language'), 'pt-BR');
  expect(
    screen.getByText('Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.')
  ).toBeInTheDocument();
});

it('starts the guide in the AWS Console', async () => {
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }));

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_START_GUIDE',
    guideId: 's3-iam-app-access',
    locale: 'en'
  });
  expect(close).toHaveBeenCalled();
});

it('does not throw when the start message is rejected', async () => {
  const sendMessage = vi.fn().mockRejectedValue(new Error('Receiving end does not exist'));
  const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);

  await expect(userEvent.click(screen.getByRole('button', { name: 'Start guide' }))).resolves.toBeUndefined();
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_START_GUIDE',
    guideId: 's3-iam-app-access',
    locale: 'en'
  });
  expect(close).not.toHaveBeenCalled();
});

it('shows recovery text outside AWS after the guide is started', async () => {
  const sendMessage = vi.fn().mockResolvedValue({
    ok: true,
    page: { kind: 'notAws' }
  });
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }));

  expect(await screen.findByText('Open the AWS Console to use this guide.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Restart guide' })).toBeEnabled();
});

it('shows S3 search recovery when the current page does not match', async () => {
  const sendMessage = vi.fn().mockResolvedValue({
    ok: true,
    page: { kind: 's3BucketSettings' }
  });
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }));

  expect(await screen.findByText('Search for S3 in the AWS Console, then open Amazon S3.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Create the bucket' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open spotlight in AWS' })).toBeEnabled();
});

it('renders an IAM policy template and wires copy to clipboard', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, {
    clipboard: {
      writeText
    }
  });

  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }));

  expect(screen.getByText(/"s3:GetObject"/)).toBeInTheDocument();
  expect(screen.getByText(/"arn:aws:s3:::my-app-uploads-prod\/\*"/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Copy policy JSON' }));

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"s3:DeleteObject"'));
});

it('starts at the first actionable S3 step', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }));
  expect(screen.getByRole('heading', { name: 'Create the bucket' })).toBeInTheDocument();
});

it('hides debug controls by default', () => {
  render(<App />);

  expect(screen.queryByRole('button', { name: 'Extract debug markdown' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Copy debug markdown' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Download debug.md' })).not.toBeInTheDocument();
});

it('persists debug mode toggles to storage', async () => {
  const set = vi.fn();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((_key: string, callback: (value: unknown) => void) => {
          callback({});
        }),
        set
      }
    }
  });

  render(<App />);

  await userEvent.click(screen.getByRole('checkbox', { name: 'Debug mode' }));

  expect(set).toHaveBeenCalledWith({
    'awsCopilot.debugMode': true
  });
});

it('does not throw when toggling debug mode without chrome storage', async () => {
  render(<App />);

  await expect(userEvent.click(screen.getByRole('checkbox', { name: 'Debug mode' }))).resolves.toBeUndefined();
  expect(screen.getByRole('checkbox', { name: 'Debug mode' })).toBeChecked();
});

it('shows debug controls only when debug mode is enabled', async () => {
  const get = vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
    callback({ 'awsCopilot.debugMode': true });
  });

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get,
        set: vi.fn()
      }
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage: vi.fn().mockResolvedValue({ ok: true, page: { kind: 'awsUnknown' } })
    }
  });

  render(<App />);

  expect(await screen.findByRole('button', { name: 'Extract debug markdown' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Extract debug markdown' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Copy debug markdown' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Download debug.md' })).toBeDisabled();
});

it('extracts debug markdown and enables copy and download actions', async () => {
  const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);

  Object.assign(navigator, {
    clipboard: {
      writeText
    }
  });

  const sendMessage = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      markdown: '# Debug Context\n\n- URL: https://console.aws.amazon.com/'
    });

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
          callback({ 'awsCopilot.debugMode': true });
        }),
        set: vi.fn()
      }
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);

  const createObjectURL = vi.fn().mockReturnValue('blob:debug');
  const revokeObjectURL = vi.fn();
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL
  });
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL
  });
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  const extractButton = await screen.findByRole('button', { name: 'Extract debug markdown' });
  await userEvent.click(extractButton);

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT'
  });
  expect(close).not.toHaveBeenCalled();
  expect(await screen.findByText(/# Debug Context/)).toBeInTheDocument();

  const copyButton = screen.getByRole('button', { name: 'Copy debug markdown' });
  const downloadButton = screen.getByRole('button', { name: 'Download debug.md' });

  expect(extractButton).toBeEnabled();
  expect(copyButton).toBeEnabled();
  expect(downloadButton).toBeEnabled();

  await userEvent.click(copyButton);
  expect(writeText).toHaveBeenCalledWith('# Debug Context\n\n- URL: https://console.aws.amazon.com/');

  await userEvent.click(downloadButton);
  expect(createObjectURL).toHaveBeenCalled();
  expect(anchorClick).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:debug');
});
