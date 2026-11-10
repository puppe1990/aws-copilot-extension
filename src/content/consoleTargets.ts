import { assertSafeElement, assertSafeSelector } from '../safety/safetyRules'
import { AWS_SEARCH_SELECTOR, BUCKET_NAME_FIELD_SELECTORS } from './contentGuideCatalog'

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

export function resolveAwsSearchTarget(): HTMLInputElement | HTMLElement | null {
  assertSafeSelector(AWS_SEARCH_SELECTOR)

  let targets: NodeListOf<Element>
  try {
    targets = document.querySelectorAll(AWS_SEARCH_SELECTOR)
  } catch {
    return null
  }

  for (const target of targets) {
    if (!(target instanceof HTMLElement)) {
      continue
    }
    assertSafeElement(target)
    const rect = target.getBoundingClientRect()
    const isVisible = rect.width > 0 && rect.height > 0
    if (isVisible || targets.length === 1) {
      return target
    }
  }

  return null
}

export function putS3InSearch(target: HTMLElement | null): void {
  if (!(target instanceof HTMLInputElement)) {
    target?.focus()
    return
  }

  const inputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  inputValueSetter?.call(target, 'S3')
  target.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'S3' }),
  )
  target.dispatchEvent(new Event('change', { bubbles: true }))
  target.focus()
}

export function resolveS3ServiceResultTarget(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a, button, [role="link"], [role="button"], [role="option"], [data-testid], [aria-label]',
    ),
  )

  for (const candidate of candidates) {
    const text = normalizedText(candidate)
    const isS3Service = /^S3\b/u.test(text) && /Scalable Storage in the Cloud/iu.test(text)
    if (!isS3Service || !isVisibleEnough(candidate)) {
      continue
    }
    assertSafeElement(candidate)
    return candidate
  }

  return null
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
