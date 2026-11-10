import { beforeEach } from 'vitest'
import { handleContentMessage, resetGuideRuntimeForTests } from './main'

beforeEach(() => {
  document.body.innerHTML = ''
  document.title = ''
  resetGuideRuntimeForTests()
})

it('extracts a concise debug context markdown payload', () => {
  document.body.innerHTML = `
    <h1>Amazon S3</h1>
    <h2>Bucket overview</h2>
    <button>Create bucket</button>
    <a role="button">View details</a>
    <input type="button" value="Refresh list" />
    <input type="submit" value="Save changes" />
    <input aria-label="Search" placeholder="Search" />
    <label for="standard-name">Standard bucket name</label>
    <input id="standard-name" />
    <input name="bucketName" aria-label="Bucket name" />
    <label for="secret-access-key">AWS Secret Access Key</label>
    <input id="secret-access-key" type="password" />
    <button>Reset password</button>
  `
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  headings.forEach((heading) => {
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 24,
      width: 100,
      height: 24,
      toJSON: () => ({}),
    } as DOMRect)
  })
  const actions = Array.from(document.querySelectorAll('button, a[role="button"]'))
  actions.forEach((action) => {
    vi.spyOn(action, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 120,
      bottom: 32,
      width: 120,
      height: 32,
      toJSON: () => ({}),
    } as DOMRect)
  })
  const inputs = Array.from(document.querySelectorAll('input'))
  inputs.forEach((input) => {
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 160,
      bottom: 32,
      width: 160,
      height: 32,
      toJSON: () => ({}),
    } as DOMRect)
  })
  const secretButton = document.querySelector('button + button') as HTMLElement | null
  if (secretButton) {
    vi.spyOn(secretButton, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 120,
      bottom: 32,
      width: 120,
      height: 32,
      toJSON: () => ({}),
    } as DOMRect)
  }

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  const sendResponse = vi.fn()
  const handled = handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    sendResponse,
  )

  expect(handled).toBe(true)
  expect(sendResponse).toHaveBeenCalledWith(
    expect.objectContaining({
      ok: true,
      markdown: expect.stringContaining('## Page'),
    }),
  )
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain(
    'URL: https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
  )
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('Document title:')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('Detected page kind: s3BucketsList')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('## Guide')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('Current step: Create the bucket')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('## Wizard diagnostics')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- stepId: bucket')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- isExpectedStepPage: true')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- isBucketLanding: false')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- shouldSearchS3: false')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- targetFound: true')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- substepsVisible: true')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('## Selector summaries')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain(
    '- highlightSelector: [data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]',
  )
  expect(sendResponse.mock.calls[0]?.[0].markdown).not.toContain('- - highlightSelector:')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('## Headings')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Amazon S3')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('## Actions')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Create bucket')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Refresh list')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Save changes')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('## Inputs')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Search')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Standard bucket name')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('- Bucket name')
  expect(sendResponse.mock.calls[0]?.[0].markdown).toContain('[redacted sensitive field]')
  expect(sendResponse.mock.calls[0]?.[0].markdown).not.toContain('AWS Secret Access Key')
  expect(sendResponse.mock.calls[0]?.[0].markdown).not.toContain('Reset password')
  expect(sendResponse.mock.calls[0]?.[0].markdown).not.toContain('Next step')
  expect(sendResponse.mock.calls[0]?.[0].markdown).not.toContain('Exit guide')
})

it('skips injected overlay content while extracting the debug context', () => {
  document.body.innerHTML = `
    <h1>Amazon S3</h1>
    <button>Create bucket</button>
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    sendResponse,
  )

  const markdown = sendResponse.mock.calls[0]?.[0].markdown as string
  expect(markdown).toContain('## Guide')
  expect(markdown).toContain('Current step: Create the bucket')
  expect(markdown).toContain('## Wizard diagnostics')
  expect(markdown).toContain('- stepId: bucket')
  expect(markdown).not.toContain('Next step')
  expect(markdown).not.toContain('Exit guide')
  expect(markdown).not.toContain('Use a globally unique bucket name')
})

it('derives wizard diagnostics from the requested href instead of stale active page state', () => {
  document.body.innerHTML = `
    <input aria-label="Search" placeholder="Search" />
    <button>Create bucket</button>
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://us-east-1.console.aws.amazon.com/iam/home#/policies$new',
    sendResponse,
  )

  const markdown = sendResponse.mock.calls[0]?.[0].markdown as string
  expect(markdown).toContain('Detected page kind: iamCreatePolicy')
  expect(markdown).toContain('- stepId: bucket')
  expect(markdown).toContain('- isExpectedStepPage: false')
  expect(markdown).toContain('- isBucketLanding: false')
  expect(markdown).toContain('- shouldSearchS3: true')
  expect(markdown).toContain('- targetFound: false')
  expect(markdown).toContain('- substepsVisible: false')
  expect(markdown).toContain(
    '- searchSelector: input[aria-label="Search"], input[aria-label*="Search"], input[placeholder="Search"], input[type="search"], [role="searchbox"]',
  )
})

it('explains when the iam policy step is blocked because the user is still on the S3 bucket form', () => {
  document.body.innerHTML = `
    <h1>Create bucket</h1>
    <h2>General configuration</h2>
    <input aria-label="Search" placeholder="Search" />
    <input name="bucketName" aria-label="Bucket name" />
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 3,
    },
    'https://us-east-1.console.aws.amazon.com/s3/bucket/create?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Create a least-privilege IAM policy')
  expect(document.body).toHaveTextContent('Current page: S3 Create bucket')
  expect(document.body).toHaveTextContent(
    'Goal: Create the least-privilege IAM policy for this bucket.',
  )
  expect(document.body).toHaveTextContent('Open IAM > Policies and click Create policy.')
  expect(document.body).toHaveTextContent('Switch to the JSON editor before pasting the policy.')
  expect(document.body).toHaveTextContent('Open IAM')
  expect(document.body).not.toHaveTextContent('Search S3')
})

it('reports a concrete recovery mode in debug markdown for the iam policy step on the S3 bucket form', () => {
  document.body.innerHTML = `
    <h1>Create bucket</h1>
    <h2>General configuration</h2>
    <input aria-label="Search" placeholder="Search" />
    <input name="bucketName" aria-label="Bucket name" />
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 3,
    },
    'https://us-east-1.console.aws.amazon.com/s3/bucket/create?region=us-east-1',
    vi.fn(),
  )

  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://us-east-1.console.aws.amazon.com/s3/bucket/create?region=us-east-1',
    sendResponse,
  )

  const markdown = sendResponse.mock.calls[0]?.[0].markdown as string
  expect(markdown).toContain('Detected page kind: s3CreateBucket')
  expect(markdown).toContain('- stepId: iamPolicy')
  expect(markdown).toContain('- shouldSearchS3: false')
  expect(markdown).toContain('- substepsVisible: true')
  expect(markdown).toContain('## Diagnosis')
  expect(markdown).toContain('- Expected page kind: iamCreatePolicy')
  expect(markdown).toContain('- Recovery mode: openIam')
  expect(markdown).toContain(
    '- Recommended action: Open IAM Policies, click Create policy, switch to the JSON editor, and paste the policy JSON.',
  )
})

it('shows a concrete IAM landing checklist when the guide is on the iam policy step but the user is still in S3', () => {
  document.body.innerHTML = `
    <h1>Create bucket</h1>
    <input aria-label="Search" placeholder="Search" />
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 3,
    },
    'https://us-east-1.console.aws.amazon.com/s3/bucket/create?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Current page: S3 Create bucket')
  expect(document.body).toHaveTextContent(
    'Goal: Create the least-privilege IAM policy for this bucket.',
  )
  expect(document.body).toHaveTextContent('Open IAM > Policies and click Create policy.')
  expect(document.body).toHaveTextContent('Switch to the JSON editor before pasting the policy.')
})

it('shows a ready-to-paste IAM context when the JSON editor is visible', () => {
  document.body.innerHTML = `
    <h1>Create policy</h1>
    <textarea aria-label="Policy JSON"></textarea>
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 3,
    },
    'https://us-east-1.console.aws.amazon.com/iam/home#/policies$new',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Current page: IAM Create policy')
  expect(document.body).toHaveTextContent('Paste the JSON below into the policy editor.')
  expect(document.body).toHaveTextContent(
    'Replace the example bucket name with the bucket you created.',
  )
})

it('does not clear an existing overlay while extracting debug context', () => {
  document.body.innerHTML = `
    <input name="bucketName" />
    <input name="bucketName" />
  `

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  const existingOverlay = document.createElement('div')
  existingOverlay.setAttribute('data-aws-copilot-highlight', 'true')
  document.body.appendChild(existingOverlay)

  const sendResponse = vi.fn()
  handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    sendResponse,
  )

  expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  expect(document.body.contains(existingOverlay)).toBe(true)
})

it('returns an explicit error when debug extraction fails', () => {
  const sendResponse = vi.fn()
  const titleDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'title')
  Object.defineProperty(document, 'title', {
    configurable: true,
    get() {
      throw new Error('boom')
    },
  })

  const handled = handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://console.aws.amazon.com/',
    sendResponse,
  )

  expect(handled).toBe(true)
  expect(sendResponse).toHaveBeenCalledWith({
    ok: false,
    error: 'boom',
  })

  if (titleDescriptor) {
    Object.defineProperty(document, 'title', titleDescriptor)
  }
})

it('reports guide not started in debug markdown when no guide is active', () => {
  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    },
    'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1',
    sendResponse,
  )

  const markdown = sendResponse.mock.calls[0]?.[0].markdown as string
  expect(markdown).toContain('## Guide')
  expect(markdown).toContain('- Guide not started')
  expect(markdown).not.toContain('## Wizard diagnostics')
  expect(markdown).not.toContain('- shouldSearchS3:')
})

it('returns a not-started guide snapshot when no guide is active', () => {
  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_GET_GUIDE_SNAPSHOT',
    },
    'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1',
    sendResponse,
  )

  expect(sendResponse).toHaveBeenCalledWith(
    expect.objectContaining({
      ok: true,
      snapshot: expect.objectContaining({
        guideMode: 'not_started',
        pageKind: 's3BucketsList',
      }),
    }),
  )
})
