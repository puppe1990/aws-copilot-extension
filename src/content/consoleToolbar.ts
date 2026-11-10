import { assertSafeSelector } from '../safety/safetyRules'
import { overlayLabels, type Locale } from './contentGuideCatalog'

export const TOOLBAR_BUTTON_ATTRIBUTE = 'data-aws-copilot-toolbar'
export const AWS_NAV_HEADER_SELECTOR = '#awsc-nav-header'
export const AWS_NAV_SEARCH_SELECTOR = '#aws-unified-search-container'
export const AWS_NAV_BELL_SELECTOR = 'button[data-testid="awsc-phd__bell-icon"]'

export type ConsoleToolbarOptions = {
  locale: Locale
  onStartGuide: () => void
}

let toolbarObserver: MutationObserver | null = null
let toolbarOptions: ConsoleToolbarOptions | null = null

function existingToolbarButton(): HTMLButtonElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  const found = document.querySelector(`[${TOOLBAR_BUTTON_ATTRIBUTE}]`)
  return found instanceof HTMLButtonElement ? found : null
}

function styleToolbarButton(button: HTMLButtonElement): void {
  Object.assign(button.style, {
    position: 'fixed',
    zIndex: '2147483000',
    height: '32px',
    padding: '0 12px',
    margin: '0',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: '500',
    letterSpacing: '0',
    lineHeight: '32px',
    whiteSpace: 'nowrap',
    textTransform: 'none',
    border: '0',
    borderRadius: '8px',
    background: 'rgb(255, 153, 0)',
    color: 'rgb(11, 13, 20)',
    cursor: 'pointer',
    fontFamily: 'inherit',
  })
}

function placeToolbarButton(button: HTMLButtonElement): void {
  const search = firstExisting(AWS_NAV_SEARCH_SELECTOR)
  if (search) {
    const rect = search.getBoundingClientRect()
    button.style.top = `${Math.max(8, rect.top + (rect.height - 32) / 2)}px`
    button.style.left = `${rect.right + 8}px`
    return
  }

  const bell = firstExisting(AWS_NAV_BELL_SELECTOR)
  if (bell) {
    const rect = bell.getBoundingClientRect()
    button.style.top = `${Math.max(8, rect.top + (rect.height - 32) / 2)}px`
    button.style.left = `${Math.max(8, rect.left - 88)}px`
    return
  }

  button.style.top = '8px'
  button.style.left = '50%'
}

function createToolbarButton(options: ConsoleToolbarOptions): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute(TOOLBAR_BUTTON_ATTRIBUTE, 'true')
  button.textContent = overlayLabels.toolbarGuide[options.locale]
  button.setAttribute('aria-label', overlayLabels.toolbarAria[options.locale])
  styleToolbarButton(button)
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    options.onStartGuide()
  })
  return button
}

function firstExisting(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  assertSafeSelector(selector)
  const node = document.querySelector(selector)
  return node instanceof HTMLElement ? node : null
}

export function mountConsoleToolbar(options: ConsoleToolbarOptions): HTMLButtonElement | null {
  if (typeof document === 'undefined' || !document.body) {
    return null
  }
  const existing = existingToolbarButton()
  if (existing) {
    placeToolbarButton(existing)
    return existing
  }
  const button = createToolbarButton(options)
  document.body.appendChild(button)
  placeToolbarButton(button)
  return button
}

export function bootConsoleToolbar(options: ConsoleToolbarOptions): void {
  toolbarOptions = options
  mountConsoleToolbar(options)
  if (
    toolbarObserver ||
    typeof MutationObserver === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return
  }
  toolbarObserver = new MutationObserver(() => {
    if (typeof document === 'undefined') {
      stopConsoleToolbar()
      return
    }
    if (!toolbarOptions) {
      return
    }
    mountConsoleToolbar(toolbarOptions)
  })
  toolbarObserver.observe(document.documentElement, { childList: true, subtree: true })
}

export function stopConsoleToolbar(): void {
  toolbarObserver?.disconnect()
  toolbarObserver = null
  toolbarOptions = null
  existingToolbarButton()?.remove()
}
