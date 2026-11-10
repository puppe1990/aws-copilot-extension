import { beforeEach } from 'vitest'
import { clearHighlight, highlightElement, highlightSelector } from './highlight'
import { renderGuideOverlay, type GuideOverlayContent } from './guideOverlayDom'

beforeEach(() => {
  document.body.innerHTML = ''
  document.title = ''
})

it('adds and clears a highlight overlay', () => {
  document.body.innerHTML = '<input id="bucket" />'
  const target = document.getElementById('bucket') as HTMLElement

  highlightElement(target)
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()

  clearHighlight()
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
})

it('renders an inline guide overlay anchored to the target', () => {
  document.body.innerHTML = '<button id="create-bucket">Create bucket</button>'
  const target = document.getElementById('create-bucket') as HTMLElement
  const content: GuideOverlayContent = {
    stepTitle: 'Create the bucket',
    stepBody: 'Use a globally unique bucket name.',
    substeps: ['Keep the default General purpose type.', 'Enter a globally unique bucket name.'],
    progressLabel: 'Step 2 of 5',
    primaryActionLabel: 'Next step',
    secondaryActionLabel: 'Exit guide',
    canAdvance: true,
    onPrimaryAction: vi.fn(),
    onSecondaryAction: vi.fn(),
  }

  renderGuideOverlay(target, content)

  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument()
  expect(document.querySelector('[data-aws-copilot-guide-card]')).toBeInTheDocument()
  expect(document.body).toHaveTextContent('Create the bucket')
  expect(document.body).toHaveTextContent('Step 2 of 5')
  expect(document.body).toHaveTextContent('Keep the default General purpose type.')
  expect(document.body).toHaveTextContent('Enter a globally unique bucket name.')
})

it('locks page scroll only while substeps are visible and restores it when cleared', () => {
  clearHighlight()
  document.body.innerHTML = '<button id="create-bucket">Create bucket</button>'
  const target = document.getElementById('create-bucket') as HTMLElement
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'clip'
  const previousHtmlOverflow = document.documentElement.style.overflow
  const previousBodyOverflow = document.body.style.overflow

  renderGuideOverlay(target, {
    stepTitle: 'Choose the objective',
    stepBody: 'This guide creates app access to S3 without opening the bucket publicly.',
    progressLabel: 'Step 1 of 5',
    primaryActionLabel: 'Next step',
    secondaryActionLabel: 'Exit guide',
    canAdvance: true,
    onPrimaryAction: vi.fn(),
    onSecondaryAction: vi.fn(),
  })

  expect(document.documentElement.style.overflow).toBe(previousHtmlOverflow)
  expect(document.body.style.overflow).toBe(previousBodyOverflow)

  renderGuideOverlay(target, {
    stepTitle: 'Create the bucket',
    stepBody: 'Use a globally unique bucket name.',
    substeps: ['Keep the default General purpose type.', 'Leave Global namespace selected.'],
    progressLabel: 'Step 2 of 5',
    primaryActionLabel: 'Next step',
    secondaryActionLabel: 'Exit guide',
    canAdvance: true,
    onPrimaryAction: vi.fn(),
    onSecondaryAction: vi.fn(),
  })

  expect(document.documentElement.style.overflow).toBe('hidden')
  expect(document.body.style.overflow).toBe('hidden')

  clearHighlight()

  expect(document.documentElement.style.overflow).toBe(previousHtmlOverflow)
  expect(document.body.style.overflow).toBe(previousBodyOverflow)
})

it('keeps the guide actions inside the viewport when the overlay is taller than the position estimate', () => {
  document.body.innerHTML = '<button id="create-bucket">Create bucket</button>'
  const target = document.getElementById('create-bucket') as HTMLElement
  const originalInnerHeight = window.innerHeight
  const originalInnerWidth = window.innerWidth
  const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight',
  )
  const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetWidth',
  )

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 900,
  })
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1440,
  })
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    x: 48,
    y: 430,
    left: 48,
    top: 430,
    right: 944,
    bottom: 462,
    width: 896,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect)
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.getAttribute?.('data-aws-copilot-guide-card') === 'true' ? 460 : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return this.getAttribute?.('data-aws-copilot-guide-card') === 'true' ? 360 : 0
    },
  })

  renderGuideOverlay(target, {
    stepTitle: 'Create the bucket',
    stepBody: 'Use a globally unique bucket name.',
    substeps: [
      'Keep the default General purpose type.',
      'Leave Global namespace selected.',
      'Enter a globally unique bucket name.',
      'Do not put secrets in the bucket name.',
    ],
    progressLabel: 'Step 2 of 5',
    primaryActionLabel: 'Next step',
    secondaryActionLabel: 'Exit guide',
    canAdvance: true,
    onPrimaryAction: vi.fn(),
    onSecondaryAction: vi.fn(),
  })

  const guideCard = document.querySelector('[data-aws-copilot-guide-card]') as HTMLElement
  expect(Number.parseInt(guideCard.style.top, 10)).toBeLessThanOrEqual(424)

  if (offsetHeightDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeightDescriptor)
  }
  if (offsetWidthDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidthDescriptor)
  }
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: originalInnerHeight,
  })
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  })
})

it('returns false for malformed highlight selectors', () => {
  expect(() => highlightSelector('[')).not.toThrow()
  expect(highlightSelector('[')).toBe(false)
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
})

it('returns false when a highlight selector matches multiple elements', () => {
  document.body.innerHTML = '<input class="target" /><input class="target" />'

  expect(highlightSelector('.target')).toBe(false)
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
})

it('blocks a sensitive matched element even when the selector string is benign', () => {
  document.body.innerHTML = '<input class="target" name="secretAccessKey" />'

  expect(() => highlightSelector('.target')).toThrow('Refusing to target sensitive AWS fields')
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument()
})
