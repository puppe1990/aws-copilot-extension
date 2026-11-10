import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { App } from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('renders the extension name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'AWS Copilot' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start guide' })).toBeInTheDocument()
})

it('switches to Portuguese', async () => {
  render(<App />)
  await userEvent.selectOptions(screen.getByLabelText('Language'), 'pt-BR')
  expect(
    screen.getByText(
      'Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.',
    ),
  ).toBeInTheDocument()
})

it('starts the guide in the AWS Console', async () => {
  const sendMessage = vi.fn().mockResolvedValue(undefined)
  const close = vi.spyOn(window, 'close').mockImplementation(() => undefined)
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)

  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }))

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_START_GUIDE',
    guideId: 's3-iam-app-access',
    locale: 'en',
  })
  expect(close).toHaveBeenCalled()
})

it('does not throw when the start message is rejected', async () => {
  const sendMessage = vi.fn().mockRejectedValue(new Error('Receiving end does not exist'))
  const close = vi.spyOn(window, 'close').mockImplementation(() => undefined)
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)

  await expect(
    userEvent.click(screen.getByRole('button', { name: 'Start guide' })),
  ).resolves.toBeUndefined()
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(sendMessage).toHaveBeenCalledWith(42, {
    type: 'AWS_COPILOT_START_GUIDE',
    guideId: 's3-iam-app-access',
    locale: 'en',
  })
  expect(close).not.toHaveBeenCalled()
})

it('shows recovery text outside AWS after the guide is started', async () => {
  const sendMessage = vi.fn().mockResolvedValue({
    ok: true,
    page: { kind: 'notAws' },
  })
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }))

  expect(await screen.findByText('Open the AWS Console to use this guide.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Restart guide' })).toBeEnabled()
})

it('shows S3 search recovery when the current page does not match', async () => {
  const sendMessage = vi.fn().mockResolvedValue({
    ok: true,
    page: { kind: 's3BucketSettings' },
  })
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }))

  expect(
    await screen.findByText('Search for S3 in the AWS Console, then open Amazon S3.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Create the bucket' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Open spotlight in AWS' })).toBeEnabled()
})

it('renders an IAM policy template and wires copy to clipboard', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, {
    clipboard: {
      writeText,
    },
  })

  render(<App />)

  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next step' }))

  expect(screen.getByText(/"s3:GetObject"/)).toBeInTheDocument()
  expect(screen.getByText(/"arn:aws:s3:::my-app-uploads-prod\/\*"/)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Copy policy JSON' }))

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"s3:DeleteObject"'))
})

it('starts at the first actionable S3 step', async () => {
  render(<App />)

  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }))
  expect(screen.getByRole('heading', { name: 'Create the bucket' })).toBeInTheDocument()
})

it('shows that the guide has not started before launch', async () => {
  vi.spyOn(window, 'close').mockImplementation(() => undefined)
  const sendMessage = vi.fn().mockResolvedValue({
    ok: true,
    snapshot: {
      guideMode: 'not_started',
      pageKind: 's3BucketsList',
      statusText: 'Guide not started',
      goalText: 'Click Start guide to begin the S3 + IAM walkthrough.',
    },
  })

  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)

  expect(await screen.findByText('Guide not started')).toBeInTheDocument()
  expect(
    screen.getByText('Click Start guide to begin the S3 + IAM walkthrough.'),
  ).toBeInTheDocument()
})

it('shows the active guide status from the tab snapshot after launch', async () => {
  vi.spyOn(window, 'close').mockImplementation(() => undefined)
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
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({
      ok: true,
      snapshot: {
        guideMode: 'active',
        pageKind: 's3CreateBucket',
        stepId: 'bucket',
        contextId: 'bucketFormReady',
        statusText: 'Current page: S3 Create bucket',
        goalText: 'Goal: Create the S3 bucket with a unique safe name.',
      },
    })
    .mockResolvedValueOnce({
      ok: true,
      page: { kind: 's3CreateBucket' },
    })
    .mockResolvedValueOnce({
      ok: true,
      snapshot: {
        guideMode: 'active',
        pageKind: 's3CreateBucket',
        stepId: 'bucket',
        contextId: 'bucketFormReady',
        statusText: 'Current page: S3 Create bucket',
        goalText: 'Goal: Create the S3 bucket with a unique safe name.',
      },
    })

  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage,
    },
  })

  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Start guide' }))

  expect(await screen.findByText('Current page: S3 Create bucket')).toBeInTheDocument()
  expect(
    screen.getByText('Goal: Create the S3 bucket with a unique safe name.'),
  ).toBeInTheDocument()
})
