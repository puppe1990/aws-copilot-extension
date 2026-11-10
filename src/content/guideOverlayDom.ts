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
  button.style.borderRadius = '8px'
  button.style.padding = '8px 12px'
  button.style.fontSize = '13px'
  button.style.fontWeight = '500'
  button.style.transition = 'opacity 120ms ease, background-color 120ms ease'
  button.style.cursor = disabled ? 'not-allowed' : 'pointer'
  button.style.opacity = disabled ? '0.5' : '1'
  button.style.border = variant === 'primary' ? '0' : '1px solid rgba(237, 241, 248, 0.08)'
  button.style.background = variant === 'primary' ? 'rgb(255, 153, 0)' : 'transparent'
  button.style.color = variant === 'primary' ? 'rgb(11, 13, 20)' : 'rgb(237, 241, 248)'
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
    fontWeight: '500',
    letterSpacing: '0.02em',
    textTransform: 'none',
    color: '#8b93a7',
  })
  appendStyledText(inner, 'h2', content.stepTitle, {
    margin: '0',
    fontSize: '20px',
    lineHeight: '1.25',
    fontWeight: '500',
    letterSpacing: '0',
    color: '#edf1f8',
  })
  appendStyledText(inner, 'p', content.stepBody, {
    margin: '0',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#c4cad8',
  })

  if (content.substeps && content.substeps.length > 0) {
    const list = document.createElement('ol')
    list.style.display = 'grid'
    list.style.gap = '8px'
    list.style.margin = '0'
    list.style.padding = '0 0 0 18px'
    list.style.fontSize = '13px'
    list.style.lineHeight = '1.55'
    list.style.color = '#c4cad8'
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
      borderRadius: '8px',
      border: '1px solid rgba(237, 241, 248, 0.08)',
      background: '#11141c',
      fontSize: '12px',
      lineHeight: '1.6',
      color: '#edf1f8',
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
  card.style.borderRadius = '16px'
  card.style.border = '1px solid rgba(237, 241, 248, 0.08)'
  card.style.background = 'rgb(11, 13, 20)'
  card.style.color = '#edf1f8'
  card.style.boxShadow = 'none'

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
