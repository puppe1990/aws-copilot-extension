import {
  clearHighlight,
  createHighlightLayer,
  GUIDE_CARD_ATTRIBUTE,
  highlightElement,
  lockPageScroll,
} from './highlight'

export type GuideOverlayContent = {
  progressLabel: string
  stepTitle: string
  stepBody: string
  substeps?: string[]
  placement?: 'auto' | 'bottomRight'
  dimBackdrop?: boolean
  showBackdropWhenUntargeted?: boolean
  codeBlock?: string | null
  primaryActionLabel: string
  secondaryActionLabel: string
  canAdvance: boolean
  onPrimaryAction: () => void
  onSecondaryAction: () => void
  onCopyAction?: () => void
  copyActionLabel?: string
}

function createActionButton(
  label: string,
  variant: 'primary' | 'secondary',
  onClick: () => void,
  disabled = false,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.style.borderRadius = '16px'
  button.style.padding = '12px 16px'
  button.style.fontSize = '14px'
  button.style.fontWeight = '600'
  button.style.transition = 'opacity 120ms ease, transform 120ms ease'
  button.style.cursor = disabled ? 'not-allowed' : 'pointer'
  button.style.opacity = disabled ? '0.5' : '1'
  button.style.border = variant === 'primary' ? '0' : '1px solid rgba(255, 255, 255, 0.1)'
  button.style.background = variant === 'primary' ? '#ff9900' : 'rgba(255, 255, 255, 0.04)'
  button.style.color = variant === 'primary' ? '#020617' : '#ffffff'
  button.disabled = disabled
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  })
  return button
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function positionGuideCard(
  card: HTMLDivElement,
  target: HTMLElement | null,
  placement: GuideOverlayContent['placement'],
): void {
  card.style.left = ''
  card.style.right = ''
  card.style.top = ''
  card.style.bottom = ''

  if (placement === 'bottomRight') {
    card.style.right = '24px'
    card.style.bottom = '24px'
    return
  }

  if (!target) {
    card.style.top = '24px'
    card.style.right = '24px'
    return
  }

  const margin = 16
  const gap = 20
  const rect = target.getBoundingClientRect()
  const cardHeight = Math.max(card.offsetHeight, 320)
  const cardWidth = Math.max(card.offsetWidth, 320)
  const topBelow = rect.bottom + gap
  const topAbove = rect.top - gap - cardHeight
  const maxTop = Math.max(margin, window.innerHeight - cardHeight - margin)
  const maxLeft = Math.max(margin, window.innerWidth - cardWidth - margin)
  const top =
    topBelow + cardHeight <= window.innerHeight - margin
      ? topBelow
      : topAbove >= margin
        ? topAbove
        : clamp(maxTop, margin, maxTop)
  const left = clamp(rect.left, margin, maxLeft)

  card.style.top = `${top}px`
  card.style.left = `${left}px`
}

function appendStyledText(
  parent: HTMLElement,
  tag: keyof HTMLElementTagNameMap,
  text: string,
  styles: Partial<CSSStyleDeclaration>,
): void {
  const node = document.createElement(tag)
  Object.assign(node.style, styles)
  node.textContent = text
  parent.appendChild(node)
}

function appendOverlayBody(inner: HTMLElement, content: GuideOverlayContent): void {
  appendStyledText(inner, 'p', content.progressLabel, {
    margin: '0',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#fde68a',
  })
  appendStyledText(inner, 'h2', content.stepTitle, {
    margin: '0',
    fontSize: '30px',
    lineHeight: '1.05',
    fontWeight: '700',
    letterSpacing: '-0.03em',
    color: '#ffffff',
  })
  appendStyledText(inner, 'p', content.stepBody, {
    margin: '0',
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#e2e8f0',
  })

  if (content.substeps && content.substeps.length > 0) {
    const list = document.createElement('ol')
    list.style.display = 'grid'
    list.style.gap = '8px'
    list.style.margin = '0'
    list.style.padding = '0 0 0 18px'
    list.style.fontSize = '13px'
    list.style.lineHeight = '1.55'
    list.style.color = '#cbd5e1'
    for (const substep of content.substeps) {
      const item = document.createElement('li')
      item.textContent = substep
      list.appendChild(item)
    }
    inner.appendChild(list)
  }

  if (content.codeBlock) {
    appendStyledText(inner, 'pre', content.codeBlock, {
      maxHeight: '192px',
      overflow: 'auto',
      margin: '0',
      padding: '16px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(15, 23, 42, 0.85)',
      fontSize: '12px',
      lineHeight: '1.7',
      color: '#f8fafc',
    })
  }
}

export function renderGuideOverlay(target: HTMLElement | null, content: GuideOverlayContent): void {
  clearHighlight()

  if (target) {
    highlightElement(target, { dimBackdrop: content.dimBackdrop })
  } else if (content.showBackdropWhenUntargeted !== false) {
    const backdrop = createHighlightLayer('')
    backdrop.style.position = 'fixed'
    backdrop.style.inset = '0'
    backdrop.style.zIndex = '2147483645'
    backdrop.style.pointerEvents = 'none'
    backdrop.style.background = 'rgba(2, 6, 23, 0.65)'
    document.body.appendChild(backdrop)
  }

  if (content.substeps && content.substeps.length > 0) {
    lockPageScroll()
  }

  const card = createHighlightLayer('', GUIDE_CARD_ATTRIBUTE)
  card.style.position = 'fixed'
  card.style.zIndex = '2147483647'
  card.style.width = '360px'
  card.style.maxWidth = 'calc(100vw - 32px)'
  card.style.maxHeight = 'calc(100vh - 32px)'
  card.style.overflowX = 'hidden'
  card.style.overflowY = 'auto'
  card.style.borderRadius = '28px'
  card.style.border = '1px solid rgba(255, 255, 255, 0.1)'
  card.style.background = 'rgba(2, 6, 23, 0.95)'
  card.style.color = '#f8fafc'
  card.style.boxShadow = '0 28px 90px rgba(15, 23, 42, 0.6)'
  card.style.backdropFilter = 'blur(18px)'

  const inner = document.createElement('div')
  inner.style.display = 'grid'
  inner.style.gap = '16px'
  inner.style.padding = '20px'
  appendOverlayBody(inner, content)

  const actions = document.createElement('div')
  actions.style.display = 'grid'
  actions.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))'
  actions.style.gap = '12px'
  actions.appendChild(
    createActionButton(content.secondaryActionLabel, 'secondary', content.onSecondaryAction),
  )
  actions.appendChild(
    createActionButton(
      content.primaryActionLabel,
      'primary',
      content.onPrimaryAction,
      !content.canAdvance,
    ),
  )
  inner.appendChild(actions)

  if (content.onCopyAction && content.copyActionLabel) {
    inner.appendChild(
      createActionButton(content.copyActionLabel, 'secondary', content.onCopyAction),
    )
  }

  card.appendChild(inner)
  document.body.appendChild(card)
  positionGuideCard(card, target, content.placement)
}
