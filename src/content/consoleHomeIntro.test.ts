import { faker } from '@faker-js/faker'
import { beforeEach } from 'vitest'
import { HOME_INTRO_GUIDE_ID, resolveHomeIntroTarget } from './consoleHomeIntro'
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

function consoleHomeDom(): void {
  document.body.innerHTML = `
    <nav aria-label="Services">
      <h2>Recently visited</h2>
    </nav>
    <header id="awsc-nav-header">
      <div id="aws-unified-search-container">
        <input type="text" aria-label="Search" placeholder="${faker.lorem.word()}" />
      </div>
      <button type="button" aria-label="Open side navigation">Open side navigation</button>
      <button type="button" aria-label="AWS assistant">AWS assistant</button>
      <button type="button" data-testid="awsc-phd__bell-icon" aria-label="Notifications">9</button>
      <button type="button" data-testid="more-menu__awsc-nav-support-menu-button">Help &amp; support</button>
      <button type="button" data-testid="more-menu__awsc-nav-quick-settings-button">Settings</button>
      <button type="button" data-testid="more-menu__awsc-nav-regions-menu-button">United States (N. Virginia)</button>
      <button type="button" id="nav-usernameMenu">${faker.internet.username()}</button>
    </header>
    <main>
      <h3>Give your coding agent current AWS knowledge and safe resource access</h3>
      <h2>${faker.lorem.words(3)}</h2>
      <h2>Recently visited</h2>
      <h2>Welcome to AWS</h2>
      <h2>AWS Health</h2>
      <h2>Cost and usage</h2>
      <h2>Solutions (13)</h2>
      <h2>Explore AWS</h2>
      <h2>Security</h2>
      <h2>Latest announcements</h2>
      <h2>Recent AWS blog posts</h2>
      <h2>Trusted Advisor</h2>
    </main>
    <button type="button" id="tools-experience-ingress">CloudShell</button>
  `
  for (const node of document.body.querySelectorAll(
    'header, nav, main, h2, h3, button, input, div',
  )) {
    mockVisible(node as HTMLElement)
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
  resetGuideRuntimeForTests()
})

it('resolves each Console Home landmark from the live header and widgets', () => {
  consoleHomeDom()

  expect(resolveHomeIntroTarget('search')?.id).toBe('aws-unified-search-container')
  expect(resolveHomeIntroTarget('services')?.getAttribute('aria-label')).toBe(
    'Open side navigation',
  )
  expect(resolveHomeIntroTarget('assistant')?.getAttribute('aria-label')).toBe('AWS assistant')
  expect(resolveHomeIntroTarget('notifications')?.getAttribute('data-testid')).toBe(
    'awsc-phd__bell-icon',
  )
  expect(resolveHomeIntroTarget('region')?.getAttribute('data-testid')).toBe(
    'more-menu__awsc-nav-regions-menu-button',
  )
  expect(resolveHomeIntroTarget('account')?.id).toBe('nav-usernameMenu')
  expect(resolveHomeIntroTarget('agentToolkit')?.textContent).toContain('Give your coding agent')
  expect(resolveHomeIntroTarget('recent')?.textContent).toBe('Recently visited')
  expect(resolveHomeIntroTarget('recent')?.closest('main')).toBeTruthy()
  expect(resolveHomeIntroTarget('cost')?.textContent).toBe('Cost and usage')
  expect(resolveHomeIntroTarget('solutions')?.textContent).toContain('Solutions')
  expect(resolveHomeIntroTarget('securityWidget')?.textContent).toBe('Security')
  expect(resolveHomeIntroTarget('cloudshell')?.id).toBe('tools-experience-ingress')
})

it('starts the Console Home introduction on Search without typing S3', () => {
  consoleHomeDom()
  const search = document.querySelector('#aws-unified-search-container input') as HTMLInputElement

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: HOME_INTRO_GUIDE_ID,
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(search).toHaveValue('')
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toHaveTextContent('Search')
  expect(document.body).toHaveTextContent('Type a service name here')
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeTruthy()
})

it('walks from Account to the Agent Toolkit banner', () => {
  consoleHomeDom()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: HOME_INTRO_GUIDE_ID,
      locale: 'en',
      activeStepIndex: 7,
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.querySelector('[data-aws-copilot-guide-card]')).toHaveTextContent('Account')

  const next = Array.from(document.querySelectorAll('[data-aws-copilot-guide-card] button')).find(
    (button) => button.textContent === 'Next step',
  ) as HTMLButtonElement
  next.click()

  expect(document.querySelector('[data-aws-copilot-guide-card]')).toHaveTextContent('Agent Toolkit')
  expect(document.body).toHaveTextContent('coding agents')
})

it('walks from Search to All services on Next step', () => {
  consoleHomeDom()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: HOME_INTRO_GUIDE_ID,
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  const next = Array.from(document.querySelectorAll('[data-aws-copilot-guide-card] button')).find(
    (button) => button.textContent === 'Next step',
  ) as HTMLButtonElement
  next.click()

  expect(document.querySelector('[data-aws-copilot-guide-card]')).toHaveTextContent('All services')
  expect(document.body).toHaveTextContent('lists every AWS product')
})

it('explains Console Home in Portuguese', () => {
  consoleHomeDom()

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: HOME_INTRO_GUIDE_ID,
      locale: 'pt-BR',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Busca')
  expect(document.body).toHaveTextContent('Digite o nome de um servico')
})

it('accepts cookies before the Console Home tour', () => {
  consoleHomeDom()
  const banner = document.createElement('div')
  banner.id = 'awsccc-cb-c'
  banner.setAttribute('role', 'dialog')
  banner.innerHTML = '<button aria-label="Accept all cookies" type="submit">Accept</button>'
  document.body.prepend(banner)
  mockVisible(banner)
  mockVisible(banner.querySelector('button') as HTMLElement)

  handleContentMessage(
    {
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: HOME_INTRO_GUIDE_ID,
      locale: 'en',
    },
    fakerConsoleHomeUrl(),
    vi.fn(),
  )

  expect(document.body).toHaveTextContent('Accept cookies')
  expect(document.body).toHaveTextContent('covering the Console')
})
