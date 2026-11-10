import { faker } from '@faker-js/faker'
import { beforeEach } from 'vitest'
import { handleContentMessage, resetGuideRuntimeForTests } from './main'

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
    y: 16,
    left: 24,
    top: 16,
    right: 420,
    bottom: 48,
    width: 396,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect)
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.title = ''
  resetGuideRuntimeForTests()
})

it('types S3 into the unified Console Home search field', () => {
  document.body.innerHTML = `
    <div id="aws-unified-search-container">
      <input type="text" placeholder="${faker.lorem.word()}" />
    </div>
  `
  mockVisible(document.querySelector('#aws-unified-search-container input') as HTMLElement)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.querySelector('#aws-unified-search-container input')).toHaveValue('S3')
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
  expect(document.body).toHaveTextContent('Search S3')
})

it('asks to accept Console cookies before searching S3', () => {
  document.body.innerHTML = `
    <div id="awsccc-cb-c" role="dialog">
      <h2>Select your cookie preferences</h2>
      <p>${faker.lorem.sentence()}</p>
      <button aria-label="Accept all cookies" type="submit">Accept</button>
    </div>
    <div id="aws-unified-search-container">
      <input type="text" />
    </div>
  `
  const banner = document.getElementById('awsccc-cb-c') as HTMLElement
  const accept = document.querySelector(
    'button[aria-label="Accept all cookies"]',
  ) as HTMLButtonElement
  const search = document.querySelector('#aws-unified-search-container input') as HTMLInputElement
  mockVisible(banner)
  mockVisible(accept)
  mockVisible(search)
  accept.addEventListener('click', () => banner.remove())

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Accept cookies')
  expect(document.body).toHaveTextContent('The AWS cookie banner is covering the Console')
  expect(search.value).toBe('')

  const primary = Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent === 'Accept cookies',
  )
  primary?.click()

  expect(document.getElementById('awsccc-cb-c')).toBeNull()
  expect(search.value).toBe('S3')
})

it('ignores a leftover hidden cookie banner and searches S3', () => {
  document.body.innerHTML = `
    <div id="awsccc-cb-c" role="dialog" hidden>
      <button aria-label="Accept all cookies" type="submit">Accept</button>
    </div>
    <div id="aws-unified-search-container">
      <input type="text" />
    </div>
  `
  mockVisible(document.querySelector('#aws-unified-search-container input') as HTMLElement)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.body).not.toHaveTextContent('Accept cookies')
  expect(document.body).toHaveTextContent('Search S3')
  expect(document.querySelector('#aws-unified-search-container input')).toHaveValue('S3')
})

it('shows Portuguese cookie copy on Console Home', () => {
  document.body.innerHTML = `
    <div id="awsccc-cb-c" role="dialog">
      <button aria-label="Accept all cookies" type="submit">Accept</button>
    </div>
  `
  mockVisible(document.getElementById('awsccc-cb-c') as HTMLElement)
  mockVisible(document.querySelector('button[aria-label="Accept all cookies"]') as HTMLElement)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'pt-BR',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Aceitar cookies')
  expect(document.body).toHaveTextContent('O aviso de cookies da AWS esta cobrindo o Console')
})

it('keeps the guide card above the cookie banner', () => {
  document.body.innerHTML = `
    <div id="awsccc-cb-c" role="dialog" style="z-index: 10000">
      <button aria-label="Accept all cookies" type="submit">Accept</button>
    </div>
  `
  mockVisible(document.getElementById('awsccc-cb-c') as HTMLElement)
  mockVisible(document.querySelector('button[aria-label="Accept all cookies"]') as HTMLElement)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: 's3-iam-app-access',
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  const card = document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement
  expect(Number(card.style.zIndex)).toBeGreaterThan(10000)
  expect(Number(card.style.zIndex)).toBe(2147483647)
})
