import { assertSafeElement, assertSafeSelector } from '../safety/safetyRules'

export const HIGHLIGHT_ATTRIBUTE = 'data-aws-copilot-highlight'
export const GUIDE_CARD_ATTRIBUTE = 'data-aws-copilot-guide-card'
const PAGE_SCROLL_LOCK_ATTRIBUTE = 'data-aws-copilot-scroll-lock'

type ScrollLockState = {
  htmlOverflow: string
  bodyOverflow: string
}

let activeScrollLock: ScrollLockState | null = null

export function createHighlightLayer(
  className: string,
  attributeName = HIGHLIGHT_ATTRIBUTE,
): HTMLDivElement {
  const element = document.createElement('div')
  element.setAttribute(attributeName, 'true')
  element.className = className
  return element
}

function unlockPageScroll(): void {
  if (!activeScrollLock) {
    return
  }

  document.documentElement.style.overflow = activeScrollLock.htmlOverflow
  document.body.style.overflow = activeScrollLock.bodyOverflow
  document.documentElement.removeAttribute(PAGE_SCROLL_LOCK_ATTRIBUTE)
  activeScrollLock = null
}

export function lockPageScroll(): void {
  if (activeScrollLock) {
    return
  }

  activeScrollLock = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
  }
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.documentElement.setAttribute(PAGE_SCROLL_LOCK_ATTRIBUTE, 'true')
}

export function clearHighlight(): void {
  document
    .querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}], [${GUIDE_CARD_ATTRIBUTE}]`)
    .forEach((element) => element.remove())
  unlockPageScroll()
}

export function highlightElement(
  target: HTMLElement,
  options: { dimBackdrop?: boolean } = {},
): void {
  clearHighlight()
  const rect = target.getBoundingClientRect()
  const overlay = createHighlightLayer('')
  overlay.style.left = `${rect.left - 12}px`
  overlay.style.top = `${rect.top - 12}px`
  overlay.style.width = `${rect.width + 24}px`
  overlay.style.height = `${rect.height + 24}px`
  overlay.style.position = 'fixed'
  overlay.style.zIndex = '2147483646'
  overlay.style.pointerEvents = 'none'
  overlay.style.borderRadius = '8px'
  overlay.style.border = '2px solid #ff9900'
  overlay.style.boxShadow =
    options.dimBackdrop === false
      ? '0 0 0 4px rgba(255, 153, 0, 0.22)'
      : '0 0 0 9999px rgba(11, 13, 20, 0.72), 0 0 0 4px rgba(255, 153, 0, 0.15)'
  document.body.appendChild(overlay)
}

export function resolveHighlightTarget(selector: string): HTMLElement | null {
  assertSafeSelector(selector)

  let targets: NodeListOf<Element>
  try {
    targets = document.querySelectorAll(selector)
  } catch {
    clearHighlight()
    return null
  }

  if (targets.length !== 1) {
    clearHighlight()
    return null
  }

  const target = targets[0]
  if (!(target instanceof HTMLElement)) {
    clearHighlight()
    return null
  }

  assertSafeElement(target)
  return target
}

export function highlightSelector(selector: string): boolean {
  const target = resolveHighlightTarget(selector)
  if (!target) {
    return false
  }

  highlightElement(target)
  return true
}
