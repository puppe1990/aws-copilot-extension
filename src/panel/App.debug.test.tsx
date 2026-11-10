import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { App } from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('hides debug controls by default', () => {
  render(<App />)

  expect(screen.queryByRole('button', { name: 'Extract debug markdown' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Copy debug markdown' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Download debug.md' })).not.toBeInTheDocument()
})

it('persists debug mode toggles to storage', async () => {
  const set = vi.fn()
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((_key: string, callback: (value: unknown) => void) => {
          callback({})
        }),
        set,
      },
    },
  })

  render(<App />)

  await userEvent.click(screen.getByRole('checkbox', { name: 'Debug mode' }))

  expect(set).toHaveBeenCalledWith({
    'awsCopilot.debugMode': true,
  })
})

it('does not throw when toggling debug mode without chrome storage', async () => {
  render(<App />)

  await expect(
    userEvent.click(screen.getByRole('checkbox', { name: 'Debug mode' })),
  ).resolves.toBeUndefined()
  expect(screen.getByRole('checkbox', { name: 'Debug mode' })).toBeChecked()
})

it('shows debug controls only when debug mode is enabled', async () => {
  const get = vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
    callback({ 'awsCopilot.debugMode': true })
  })

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get,
        set: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage: vi.fn().mockResolvedValue({ ok: true, page: { kind: 'awsUnknown' } }),
    },
  })

  render(<App />)

  expect(await screen.findByRole('button', { name: 'Extract debug markdown' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Extract debug markdown' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Copy debug markdown' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Download debug.md' })).toBeDisabled()
})

it('extracts debug markdown and enables copy and download actions', async () => {
  const close = vi.spyOn(window, 'close').mockImplementation(() => undefined)
  const writeText = vi.fn().mockResolvedValue(undefined)

  Object.assign(navigator, {
    clipboard: {
      writeText,
    },
  })

  const sendMessage = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      snapshot: {
        guideMode: 'not_started',
        pageKind: 'awsUnknown',
        statusText: 'Guide not started',
        goalText: 'Click Start guide to begin the S3 + IAM walkthrough.',
      },
    })
    .mockResolvedValueOnce({
      ok: true,
      markdown: '# Debug Context\n\n- URL: https://console.aws.amazon.com/',
    })

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
          callback({ 'awsCopilot.debugMode': true })
        }),
        set: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)

  const createObjectURL = vi.fn().mockReturnValue('blob:debug')
  const revokeObjectURL = vi.fn()
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  })
  const anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined)

  const extractButton = await screen.findByRole('button', { name: 'Extract debug markdown' })
  await userEvent.click(extractButton)

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
  })
  expect(close).not.toHaveBeenCalled()
  expect(await screen.findByText(/# Debug Context/)).toBeInTheDocument()

  const copyButton = screen.getByRole('button', { name: 'Copy debug markdown' })
  const downloadButton = screen.getByRole('button', { name: 'Download debug.md' })

  expect(extractButton).toBeEnabled()
  expect(copyButton).toBeEnabled()
  expect(downloadButton).toBeEnabled()

  await userEvent.click(copyButton)
  expect(writeText).toHaveBeenCalledWith(
    '# Debug Context\n\n- URL: https://console.aws.amazon.com/',
  )

  await userEvent.click(downloadButton)
  expect(createObjectURL).toHaveBeenCalled()
  expect(anchorClick).toHaveBeenCalled()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:debug')
})

it('falls back to page script extraction when the content script does not respond', async () => {
  const sendMessage = vi
    .fn()
    .mockRejectedValue(new Error('Could not establish connection. Receiving end does not exist.'))
  const executeScript = vi.fn().mockResolvedValue([
    {
      result: '## Page\n- URL: https://s3.console.aws.amazon.com/s3/home',
    },
  ])

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
          callback({ 'awsCopilot.debugMode': true })
        }),
        set: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
    scripting: {
      executeScript,
    },
  })

  render(<App />)

  await userEvent.click(await screen.findByRole('button', { name: 'Extract debug markdown' }))

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
  })
  expect(executeScript).toHaveBeenCalledTimes(1)
  expect(await screen.findByText(/## Page/)).toBeInTheDocument()
  expect(screen.queryByText(/Could not extract debug markdown/)).not.toBeInTheDocument()
})
