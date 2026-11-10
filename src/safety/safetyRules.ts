const sensitiveSelectorPatterns = [
  /password/i,
  /secret/i,
  /accesskey/i,
  /access-key/i,
  /credential/i,
  /token/i,
]

export function isSensitiveSelector(selector: string): boolean {
  return sensitiveSelectorPatterns.some((pattern) => pattern.test(selector))
}

export function assertSafeSelector(selector: string): void {
  if (isSensitiveSelector(selector)) {
    throw new Error('Refusing to target sensitive AWS fields')
  }
}

export function isSensitiveElement(element: HTMLElement): boolean {
  const elementValues = [
    element.getAttribute('type'),
    element.getAttribute('name'),
    element.id,
    element.getAttribute('aria-label'),
    element.getAttribute('autocomplete'),
    element.textContent,
  ]

  return elementValues.some((value) => value !== null && isSensitiveSelector(value))
}

export function assertSafeElement(element: HTMLElement): void {
  if (isSensitiveElement(element)) {
    throw new Error('Refusing to target sensitive AWS fields')
  }
}

export function isExternalUrlAllowed(_url: string): boolean {
  return false
}
