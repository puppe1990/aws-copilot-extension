import { beforeEach } from 'vitest'
import { handleContentMessage, resetGuideRuntimeForTests, restoreGuideFromStorage } from './main'

beforeEach(() => {
  document.body.innerHTML = ''
  document.title = ''
  resetGuideRuntimeForTests()
})

it('responds with an explicit error for sensitive highlight selectors', () => {
  const sendResponse = vi.fn()

  expect(() =>
    handleContentMessage(
      {
        type: 'AWS_COPILOT_HIGHLIGHT',
        selector: 'input[type="password"]',
      },
      'https://console.aws.amazon.com/iam/home',
      sendResponse,
    ),
  ).not.toThrow()

  expect(sendResponse).toHaveBeenCalledWith({
    ok: false,
    error: 'Refusing to target sensitive AWS fields',
  })
})

it('starts the inline guide by searching S3 from the AWS Console home', () => {
  document.body.innerHTML = '<input aria-label="Search" placeholder="Search" />'
  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://console.aws.amazon.com/',
    sendResponse,
  )

  expect(sendResponse).toHaveBeenCalledWith({ ok: true })
  expect(document.querySelector('input[aria-label="Search"]')).toHaveValue('S3')
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
})

it('suggests AWS search with S3 when the active guide step is on the wrong AWS page', () => {
  document.body.innerHTML = '<input aria-label="Search" placeholder="Search" />'
  const sendResponse = vi.fn()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://console.aws.amazon.com/',
    sendResponse,
  )

  const searchInput = document.querySelector('input[aria-label="Search"]') as HTMLInputElement
  expect(sendResponse).toHaveBeenCalledWith({ ok: true })
  expect(searchInput.value).toBe('S3')
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
  expect(
    (document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement).style.bottom,
  ).toBe('24px')
  expect((document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement).style.right).toBe(
    '24px',
  )
})

it('points to the S3 service result when it appears in AWS search', () => {
  document.body.innerHTML = `
    <input aria-label="Search" placeholder="Search" />
    <a id="s3-service" href="/s3/home">
      <span>S3</span>
      <span>Scalable Storage in the Cloud</span>
    </a>
  `
  const searchInput = document.querySelector('input[aria-label="Search"]') as HTMLInputElement
  const s3Service = document.getElementById('s3-service') as HTMLElement
  vi.spyOn(searchInput, 'getBoundingClientRect').mockReturnValue({
    x: 30,
    y: 16,
    left: 30,
    top: 16,
    right: 440,
    bottom: 48,
    width: 410,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect)
  vi.spyOn(s3Service, 'getBoundingClientRect').mockReturnValue({
    x: 240,
    y: 96,
    left: 240,
    top: 96,
    right: 800,
    bottom: 156,
    width: 560,
    height: 60,
    toJSON: () => ({}),
  } as DOMRect)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://console.aws.amazon.com/',
    vi.fn(),
  )

  const highlight = document.querySelector('[data-aws-copilot-highlight]') as HTMLElement
  expect(highlight.style.left).toBe('228px')
  expect(highlight.style.top).toBe('84px')
  expect(highlight.style.boxShadow).not.toContain('9999px')
})

it('moves the spotlight from search to S3 after search results render', async () => {
  document.body.innerHTML = '<input aria-label="Search" placeholder="Search" />'
  const searchInput = document.querySelector('input[aria-label="Search"]') as HTMLInputElement
  vi.spyOn(searchInput, 'getBoundingClientRect').mockReturnValue({
    x: 30,
    y: 16,
    left: 30,
    top: 16,
    right: 440,
    bottom: 48,
    width: 410,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://console.aws.amazon.com/',
    vi.fn(),
  )

  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()

  const s3Service = document.createElement('a')
  s3Service.href = '/s3/home'
  s3Service.textContent = 'S3 Scalable Storage in the Cloud'
  vi.spyOn(s3Service, 'getBoundingClientRect').mockReturnValue({
    x: 240,
    y: 96,
    left: 240,
    top: 96,
    right: 800,
    bottom: 156,
    width: 560,
    height: 60,
    toJSON: () => ({}),
  } as DOMRect)
  document.body.appendChild(s3Service)
  await new Promise((resolve) => setTimeout(resolve, 0))

  const highlight = document.querySelector('[data-aws-copilot-highlight]') as HTMLElement
  expect(highlight.style.left).toBe('228px')
  expect(highlight.style.top).toBe('84px')
})

it('points to Create bucket on the S3 bucket list page', () => {
  document.body.innerHTML = '<button>Create bucket</button>'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Create the bucket')
  expect(document.body).toHaveTextContent('Click Create bucket in Amazon S3.')
  expect(document.body).not.toHaveTextContent('Search for S3')
  expect(document.body).not.toHaveTextContent('Keep the default General purpose bucket type.')
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
})

it('uses the bucket form when AWS keeps the S3 home URL after SPA navigation', () => {
  document.body.innerHTML = '<input name="bucketName" aria-label="Bucket name" />'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Create the bucket')
  expect(document.body).toHaveTextContent('Use a globally unique bucket name')
  expect(document.body).toHaveTextContent('Keep the default General purpose bucket type.')
  expect(document.body).toHaveTextContent('Leave Global namespace selected.')
  expect(document.body).not.toHaveTextContent('Click Create bucket in Amazon S3.')
  expect(document.body).not.toHaveTextContent('Search for S3')
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
})

it('uses the bucket placeholder field when AWS does not expose a bucketName input name', () => {
  document.body.innerHTML = '<input placeholder="amzn-s3-demo-bucket" />'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Use a globally unique bucket name')
  expect(document.body).not.toHaveTextContent('Click Create bucket in Amazon S3.')
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
})

it('rerenders the guide after AWS replaces the bucket list with the create bucket form', async () => {
  document.body.innerHTML = ''
  const createBucket = document.createElement('button')
  createBucket.textContent = 'Create bucket'
  createBucket.addEventListener('click', () => {
    document.body.innerHTML = '<input placeholder="amzn-s3-demo-bucket" />'
  })
  document.body.appendChild(createBucket)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1,
    },
    'https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Click Create bucket in Amazon S3.')
  const primaryButton = Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent === 'Create bucket',
  )
  primaryButton?.click()
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(document.body).toHaveTextContent('Use a globally unique bucket name')
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
})

it('keeps the security step on the S3 create bucket URL instead of searching S3 again', () => {
  document.body.innerHTML = '<input placeholder="amzn-s3-demo-bucket" />'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 2,
    },
    'https://us-east-1.console.aws.amazon.com/s3/bucket/create?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Keep public access blocked')
  expect(document.body).toHaveTextContent('Block public access unless')
  expect(document.body).toHaveTextContent('Scroll to Block Public Access settings.')
  expect(document.body).toHaveTextContent('Keep all public access block options enabled.')
  expect(document.body).not.toHaveTextContent('Search for S3')
  expect(document.body).not.toHaveTextContent('Search S3')
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
  expect(
    (document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement).style.bottom,
  ).toBe('24px')
  expect((document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement).style.right).toBe(
    '24px',
  )
})

it('starts from the S3 bucket list step when the guide is launched on S3 home', () => {
  const set = vi.fn()
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        set,
      },
    },
  })
  document.body.innerHTML = '<button>Create bucket</button>'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Click Create bucket in Amazon S3.')
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({
      'awsCopilot.activeGuide': expect.objectContaining({
        state: expect.objectContaining({ activeStepIndex: 1 }),
      }),
    }),
  )
})

it('starts from the security step on S3 bucket settings pages', () => {
  const set = vi.fn()
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        set,
      },
    },
  })
  document.body.innerHTML = '<input data-testid="block-public-access" />'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://s3.console.aws.amazon.com/s3/buckets/my-bucket/permissions',
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Keep public access blocked')
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({
      'awsCopilot.activeGuide': expect.objectContaining({
        state: expect.objectContaining({ activeStepIndex: 2 }),
      }),
    }),
  )
})

it('persists the active guide when starting from the AWS Console home', () => {
  const set = vi.fn()
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        set,
      },
    },
  })
  document.body.innerHTML = '<input aria-label="Search" placeholder="Search" />'

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    'https://console.aws.amazon.com/',
    vi.fn(),
  )

  expect(set).toHaveBeenCalledWith({
    'awsCopilot.activeGuide': {
      guideId: 's3-iam-app-access',
      locale: 'en',
      state: {
        activeStepIndex: 1,
        completedStepIds: ['objective'],
      },
    },
  })
})

it('restores the active guide after navigating into S3', () => {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (_key: string, callback: (items: unknown) => void) => {
          callback({
            'awsCopilot.activeGuide': {
              guideId: 's3-iam-app-access',
              locale: 'en',
              state: {
                activeStepIndex: 1,
                completedStepIds: ['objective'],
              },
            },
          })
        },
      },
    },
  })
  document.body.innerHTML = '<button>Create bucket</button>'

  restoreGuideFromStorage('https://s3.console.aws.amazon.com/s3/home?region=us-east-1')

  expect(document.body).toHaveTextContent('Create the bucket')
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
})
