// WHY: chrome.scripting.executeScript serializes this function into the tab.
// It must close over nothing — no imports, no module state.
export function extractDebugContextFromPage(): string {
  const normalizeText = (value: string | null | undefined) =>
    value?.replace(/\s+/g, ' ').trim() ?? ''
  const isVisibleEnough = (element: Element) => {
    if (!(element instanceof HTMLElement)) {
      return false
    }
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }
  const list = (items: string[]) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None visible'
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(isVisibleEnough)
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean)
    .slice(0, 8)
  const actions = Array.from(
    document.querySelectorAll(
      'button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]',
    ),
  )
    .filter(isVisibleEnough)
    .map((element) =>
      element instanceof HTMLInputElement
        ? normalizeText(element.value) || normalizeText(element.getAttribute('aria-label'))
        : normalizeText(element.textContent),
    )
    .filter(Boolean)
    .slice(0, 8)
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
    .filter(isVisibleEnough)
    .map((element) => {
      if (!(element instanceof HTMLElement)) {
        return ''
      }
      return normalizeText(
        element.getAttribute('aria-label') ??
          element.getAttribute('placeholder') ??
          element.getAttribute('name') ??
          element.getAttribute('id') ??
          element.tagName.toLowerCase(),
      )
    })
    .filter(Boolean)
    .slice(0, 8)

  return [
    '## Page',
    `- URL: ${window.location.href}`,
    `- Document title: ${document.title || '(empty)'}`,
    '',
    '## Headings',
    list(headings),
    '',
    '## Actions',
    list(actions),
    '',
    '## Inputs',
    list(inputs),
  ].join('\n')
}
