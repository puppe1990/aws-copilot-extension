import { faker } from '@faker-js/faker'
import { beforeEach } from 'vitest'
import { renderGuideOverlay, type GuideOverlayContent } from './guideOverlayDom'

function overlayContent(overrides: Partial<GuideOverlayContent> = {}): GuideOverlayContent {
  return {
    progressLabel: `Step ${faker.number.int({ min: 1, max: 5 })} of 5`,
    stepTitle: faker.lorem.words(3),
    stepBody: faker.lorem.sentence(),
    primaryActionLabel: faker.lorem.words(2),
    secondaryActionLabel: faker.lorem.word(),
    canAdvance: true,
    onPrimaryAction: vi.fn(),
    onSecondaryAction: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

it('renders an ink card with a hairline, no glass wash, and orange only on the primary action', () => {
  renderGuideOverlay(null, overlayContent({ primaryActionLabel: 'Search S3' }))

  const card = document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement
  expect(card.style.background).toBe('rgb(11, 13, 20)')
  expect(card.style.borderRadius).toBe('16px')
  expect(card.style.backdropFilter || '').not.toMatch(/blur/i)
  expect(card.style.boxShadow).toBe('none')
  expect(card.style.zIndex).toBe('2147483647')

  const progress = card.querySelector('p') as HTMLElement
  expect(progress.style.textTransform).toBe('none')
  expect(progress.style.letterSpacing).toBe('0.02em')
  expect(progress.style.fontWeight).toBe('500')

  const buttons = Array.from(card.querySelectorAll('button'))
  const primary = buttons.find((button) => button.textContent === 'Search S3') as HTMLButtonElement
  const secondary = buttons.find((button) => button !== primary) as HTMLButtonElement
  expect(primary.style.background).toBe('rgb(255, 153, 0)')
  expect(primary.style.borderRadius).toBe('8px')
  expect(primary.style.color).toBe('rgb(11, 13, 20)')
  expect(secondary.style.background).not.toContain('255, 153, 0')
  expect(secondary.style.borderRadius).toBe('8px')
})
