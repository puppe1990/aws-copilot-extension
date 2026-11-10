import { assertSafeElement, assertSafeSelector } from '../safety/safetyRules'
import {
  AWS_COOKIE_ACCEPT_SELECTOR,
  AWS_COOKIE_BANNER_SELECTOR,
  AWS_SEARCH_RESULTS_SELECTOR,
  AWS_SEARCH_SELECTOR,
  AWS_UNIFIED_SEARCH_CONTAINER_SELECTOR,
  BUCKET_NAME_FIELD_SELECTORS,
} from './contentGuideCatalog'

let s3ResultObserver: MutationObserver | null = null
let s3ResultObserverTimeout: number | null = null
let bucketFormObserver: MutationObserver | null = null
let bucketFormObserverTimeout: number | null = null

export function normalizedText(element: HTMLElement): string {
  return (element.getAttribute('aria-label') ?? element.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isVisibleEnough(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export function resolveCreateBucketButtonTarget(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('button, a, [role="button"], [aria-label]'),
  )

  for (const candidate of candidates) {
    const text = normalizedText(candidate)
    if (!/^Create bucket$/iu.test(text) || !isVisibleEnough(candidate)) {
      continue
    }
    assertSafeElement(candidate)
    return candidate
  }

  return null
}

export function resolveBucketFormTarget(): HTMLElement | null {
  for (const selector of BUCKET_NAME_FIELD_SELECTORS) {
    assertSafeSelector(selector)

    let candidates: NodeListOf<Element>
    try {
      candidates = document.querySelectorAll(selector)
    } catch {
      continue
    }

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) {
        continue
      }
      assertSafeElement(candidate)
      if (isVisibleEnough(candidate) || candidates.length === 1) {
        return candidate
      }
    }
  }

  return null
}

function firstMatchingElement(selector: string, root: ParentNode = document): HTMLElement | null {
  assertSafeSelector(selector)

  let matches: NodeListOf<Element>
  try {
    matches = root.querySelectorAll(selector)
  } catch {
    return null
  }

  for (const match of matches) {
    if (!(match instanceof HTMLElement)) {
      continue
    }
    assertSafeElement(match)
    if (isVisibleEnough(match) || matches.length === 1) {
      return match
    }
  }

  return null
}

function isSearchField(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
}

function typeS3IntoSearchField(target: HTMLInputElement | HTMLTextAreaElement): void {
  const prototype =
    target instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(target, 'S3')
  target.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'S3' }),
  )
  target.dispatchEvent(new Event('change', { bubbles: true }))
  target.focus()
}

function resolveUnifiedSearchOpener(): HTMLElement | null {
  const container = firstMatchingElement(AWS_UNIFIED_SEARCH_CONTAINER_SELECTOR)
  if (!container) {
    return null
  }
  const opener = firstMatchingElement(
    '[aria-label="Search"], button, [role="button"], [role="combobox"]',
    container,
  )
  return opener ?? container
}

export function resolveAwsSearchTarget(): HTMLInputElement | HTMLElement | null {
  return firstMatchingElement(AWS_SEARCH_SELECTOR) ?? resolveUnifiedSearchOpener()
}

export function putS3InSearch(target: HTMLElement | null): void {
  if (!target) {
    return
  }
  if (isSearchField(target)) {
    typeS3IntoSearchField(target)
    return
  }

  target.click()
  target.focus()
  const revealed =
    firstMatchingElement(AWS_SEARCH_SELECTOR) ??
    firstMatchingElement('input, textarea, [role="searchbox"]', target)
  if (revealed && isSearchField(revealed)) {
    typeS3IntoSearchField(revealed)
  }
}

function isS3ServiceResult(element: HTMLElement): boolean {
  const text = normalizedText(element)
  return /^S3\b/u.test(text) && /Scalable Storage in the Cloud/iu.test(text)
}

export function resolveS3ServiceResultTarget(): HTMLElement | null {
  const dropdown = firstMatchingElement(AWS_SEARCH_RESULTS_SELECTOR)
  if (!dropdown) {
    return null
  }

  const candidates = Array.from(
    dropdown.querySelectorAll<HTMLElement>(
      'a, button, [role="link"], [role="button"], [role="option"], [data-testid], [aria-label]',
    ),
  )

  for (const candidate of candidates) {
    if (!isS3ServiceResult(candidate) || !isVisibleEnough(candidate)) {
      continue
    }
    assertSafeElement(candidate)
    return candidate
  }

  return null
}

export function resolveCookieAcceptTarget(): HTMLElement | null {
  assertSafeSelector(AWS_COOKIE_BANNER_SELECTOR)
  assertSafeSelector(AWS_COOKIE_ACCEPT_SELECTOR)
  const banner = document.querySelector(AWS_COOKIE_BANNER_SELECTOR)
  if (!(banner instanceof HTMLElement) || !isVisibleEnough(banner)) {
    return null
  }
  const accept = banner.querySelector(AWS_COOKIE_ACCEPT_SELECTOR)
  if (!(accept instanceof HTMLElement) || !isVisibleEnough(accept)) {
    return null
  }
  assertSafeElement(accept)
  return accept
}

export function stopWatchingForS3ServiceResult(): void {
  s3ResultObserver?.disconnect()
  s3ResultObserver = null
  if (s3ResultObserverTimeout !== null) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(s3ResultObserverTimeout)
    }
    s3ResultObserverTimeout = null
  }
}

export function stopWatchingForBucketForm(): void {
  bucketFormObserver?.disconnect()
  bucketFormObserver = null
  if (bucketFormObserverTimeout !== null) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(bucketFormObserverTimeout)
    }
    bucketFormObserverTimeout = null
  }
}

export function watchForS3ServiceResult(onFound: () => void): void {
  if (typeof MutationObserver === 'undefined' || s3ResultObserver) {
    return
  }

  s3ResultObserver = new MutationObserver(() => {
    if (typeof document === 'undefined') {
      stopWatchingForS3ServiceResult()
      return
    }
    if (!resolveS3ServiceResultTarget()) {
      return
    }
    stopWatchingForS3ServiceResult()
    onFound()
  })
  s3ResultObserver.observe(document.body, { childList: true, subtree: true })
  s3ResultObserverTimeout = window.setTimeout(() => {
    stopWatchingForS3ServiceResult()
  }, 8000)
}

export function watchForBucketForm(onFound: () => void, isBucketStep: () => boolean): void {
  if (typeof MutationObserver === 'undefined' || bucketFormObserver) {
    return
  }

  bucketFormObserver = new MutationObserver(() => {
    if (typeof document === 'undefined' || !isBucketStep()) {
      stopWatchingForBucketForm()
      return
    }
    if (!resolveBucketFormTarget()) {
      return
    }
    stopWatchingForBucketForm()
    onFound()
  })
  bucketFormObserver.observe(document.body, { childList: true, subtree: true })
  bucketFormObserverTimeout = window.setTimeout(() => {
    stopWatchingForBucketForm()
  }, 15000)
}
