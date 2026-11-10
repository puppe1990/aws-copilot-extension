import { faker } from '@faker-js/faker'
import { beforeEach } from 'vitest'
import { handleContentMessage, resetGuideRuntimeForTests } from './main'
import { bootConsoleToolbar, mountConsoleToolbar, stopConsoleToolbar } from './consoleToolbar'

const AWS_CONSOLE_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'sa-east-1',
  'eu-west-1',
  'ap-northeast-1',
] as const

function fakerConsoleHomeUrl(): string {
  const region = faker.helpers.arrayElement(AWS_CONSOLE_REGIONS)
  return `https://${region}.console.aws.amazon.com/console/home?region=${region}`
}

function mockVisible(element: HTMLElement): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 24,
    y: 8,
    left: 24,
    top: 8,
    right: 420,
    bottom: 40,
    width: 396,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect)
}

function awsHeaderHtml(): string {
  return `
    <header id="awsc-nav-header">
      <nav aria-label="Global">
        <div id="aws-unified-search-container">
          <input type="text" placeholder="${faker.lorem.word()}" aria-label="Search" />
        </div>
        <button data-testid="awsc-phd__bell-icon" type="button" aria-label="Notifications">
          ${faker.number.int({ min: 1, max: 12 })}
        </button>
      </nav>
    </header>
  `
}

beforeEach(() => {
  stopConsoleToolbar()
  resetGuideRuntimeForTests()
  document.body.innerHTML = ''
})

it('injects a fixed Guide button to the right of unified search, outside the AWS header tree', () => {
  document.body.innerHTML = awsHeaderHtml()
  const search = document.getElementById('aws-unified-search-container') as HTMLElement
  mockVisible(search)

  const button = mountConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })

  expect(button).toBeInstanceOf(HTMLButtonElement)
  expect(button?.textContent).toBe('Guide')
  expect(button?.getAttribute('aria-label')).toBe('AWS Copilot guide')
  expect(button?.style.position).toBe('fixed')
  expect(button?.style.left).toBe('428px')
  expect(button?.style.top).toBe('8px')
  expect(search.contains(button as Node)).toBe(false)
  expect(search.nextElementSibling).not.toBe(button)
  expect(document.body.contains(button)).toBe(true)
})

it('does not inject a second toolbar button into the same header', () => {
  document.body.innerHTML = awsHeaderHtml()

  mountConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })
  mountConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })

  expect(document.querySelectorAll('[data-aws-copilot-toolbar]')).toHaveLength(1)
})

it('styles the header button like Console chrome: orange fill, 8px radius, sentence case', () => {
  document.body.innerHTML = awsHeaderHtml()

  const button = mountConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })

  expect(button?.style.background).toBe('rgb(255, 153, 0)')
  expect(button?.style.color).toBe('rgb(11, 13, 20)')
  expect(button?.style.borderRadius).toBe('8px')
  expect(button?.style.textTransform).toBe('none')
  expect(button?.style.height).toBe('32px')
})

it('uses Portuguese copy when the locale is pt-BR', () => {
  document.body.innerHTML = awsHeaderHtml()

  const button = mountConsoleToolbar({ locale: 'pt-BR', onStartGuide: vi.fn() })

  expect(button?.textContent).toBe('Guia')
  expect(button?.getAttribute('aria-label')).toBe('Guia AWS Copilot')
})

it('starts the S3 walkthrough from the header button', () => {
  document.body.innerHTML = awsHeaderHtml()
  const search = document.querySelector('#aws-unified-search-container input') as HTMLInputElement
  mockVisible(search)

  const href = fakerConsoleHomeUrl()
  mountConsoleToolbar({
    locale: 'en',
    onStartGuide: () => {
      handleContentMessage(
        {
          type: 'AWS_COPILOT_START_GUIDE',
          guideId: 's3-iam-app-access',
          locale: 'en',
        },
        href,
        vi.fn(),
      )
    },
  })?.click()

  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
  expect(document.body).toHaveTextContent('Search S3')
  expect(search).toHaveValue('S3')
})

it('falls back beside the notifications bell when unified search is missing', () => {
  document.body.innerHTML = `
    <header id="awsc-nav-header">
      <button data-testid="awsc-phd__bell-icon" type="button" aria-label="Notifications">
        ${faker.number.int({ min: 1, max: 12 })}
      </button>
    </header>
  `
  const bell = document.querySelector('[data-testid="awsc-phd__bell-icon"]') as HTMLElement
  vi.spyOn(bell, 'getBoundingClientRect').mockReturnValue({
    x: 800,
    y: 8,
    left: 800,
    top: 8,
    right: 832,
    bottom: 40,
    width: 32,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect)

  const button = mountConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })

  expect(button?.style.position).toBe('fixed')
  expect(bell.previousElementSibling).not.toBe(button)
  expect(document.body.contains(button)).toBe(true)
})

it('keeps the Guide button when AWS re-renders the header', () => {
  document.body.innerHTML = awsHeaderHtml()
  mockVisible(document.getElementById('aws-unified-search-container') as HTMLElement)

  const button = mountConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })
  document.getElementById('awsc-nav-header')!.innerHTML = ''

  expect(document.querySelector('[data-aws-copilot-toolbar]')).toBe(button)
})

it('re-injects the button when the Console header remounts', async () => {
  document.body.innerHTML = awsHeaderHtml()
  bootConsoleToolbar({ locale: 'en', onStartGuide: vi.fn() })
  expect(document.querySelector('[data-aws-copilot-toolbar]')).toBeTruthy()

  document.body.innerHTML = awsHeaderHtml()

  await vi.waitFor(() => {
    expect(document.querySelector('[data-aws-copilot-toolbar]')).toBeTruthy()
  })
})
