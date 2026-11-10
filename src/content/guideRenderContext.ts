import { assertSafeElement, assertSafeSelector, isSensitiveSelector } from '../safety/safetyRules'
import { detectAwsPage, type AwsPage } from './pageDetection'
import { resolveHighlightTarget } from './highlight'
import {
  AWS_SEARCH_SELECTOR,
  BUCKET_NAME_FIELD_SELECTORS,
  isBucketStepLandingPage,
  matchesExpectedStepPage,
  overlayLabels,
  type ActiveGuideContext,
  type ContentGuideStep,
  type Locale,
  type RecoveryMode,
} from './contentGuideCatalog'
import {
  putS3InSearch,
  resolveAwsSearchTarget,
  resolveBucketFormTarget,
  resolveCreateBucketButtonTarget,
  resolveS3ServiceResultTarget,
} from './consoleTargets'

export type GuideRenderContext = {
  page: AwsPage
  step: ContentGuideStep | null
  stepIdentifier: string
  recoveryMode: RecoveryMode
  bucketFormTarget: HTMLElement | null
  isBucketCreateForm: boolean
  isBucketLanding: boolean
  isExpectedStepPage: boolean
  searchTarget: HTMLElement | null
  s3ServiceTarget: HTMLElement | null
  createBucketTarget: HTMLElement | null
  target: HTMLElement | null
  shouldSearchS3: boolean
  keepFloatingWithoutBackdrop: boolean
  substepsVisible: boolean
  selectorSummaries: string[]
}

export type GuideRenderContextInput = {
  href: string
  step: ContentGuideStep | null
  locale: Locale
  performSearchSideEffects?: boolean
}

export function resolveHighlightTargetForDiagnostics(selector: string): HTMLElement | null {
  // WHY: debug extraction must not use resolveHighlightTarget — that clears an existing overlay.
  try {
    assertSafeSelector(selector)
  } catch {
    return null
  }

  let targets: NodeListOf<Element>
  try {
    targets = document.querySelectorAll(selector)
  } catch {
    return null
  }

  if (targets.length !== 1) {
    return null
  }

  const target = targets[0]
  if (!(target instanceof HTMLElement)) {
    return null
  }

  try {
    assertSafeElement(target)
  } catch {
    return null
  }

  return target
}

export function deriveRecoveryMode(
  step: ContentGuideStep | null,
  page: AwsPage,
  isExpectedStepPage: boolean,
  isBucketLanding: boolean,
): RecoveryMode {
  if (!step || isExpectedStepPage || isBucketLanding || page.kind === 'notAws') {
    return 'none'
  }
  if (step.id === 'iamPolicy') {
    return 'openIam'
  }
  return 'searchS3'
}

export function summarizeSelectorSummaries(context: GuideRenderContext): string[] {
  if (!context.step) {
    return ['None']
  }

  const summaries: string[] = []
  if (context.step.highlightSelector) {
    summaries.push(
      `highlightSelector: ${isSensitiveSelector(context.step.highlightSelector) ? '[redacted sensitive field]' : context.step.highlightSelector}`,
    )
  }
  if (context.step.id === 'bucket') {
    summaries.push(`bucketFormSelectors: ${BUCKET_NAME_FIELD_SELECTORS.join(' | ')}`)
  }
  if (context.shouldSearchS3) {
    summaries.push(`searchSelector: ${AWS_SEARCH_SELECTOR}`)
  }
  return summaries.length > 0 ? summaries : ['None']
}

export function buildIamPolicyCreateUrl(href: string): string {
  const parsed = new URL(href)
  const isRegionalConsoleHost = /^[a-z0-9-]+\.console\.aws\.amazon\.com$/u.test(parsed.hostname)
  const origin =
    parsed.hostname.startsWith('s3.') || !isRegionalConsoleHost
      ? 'https://console.aws.amazon.com'
      : parsed.origin
  return `${origin}/iam/home#/policies$new`
}

export function resolveActiveGuideContext(
  step: ContentGuideStep,
  page: AwsPage,
  recoveryMode: RecoveryMode,
  locale: Locale,
): ActiveGuideContext {
  if (step.id === 'iamPolicy') {
    if (recoveryMode === 'openIam') {
      return {
        contextId: 'iamWrongService',
        statusText: overlayLabels.guideStatusS3CreateBucket[locale],
        goalText: overlayLabels.guideGoalIamPolicy[locale],
        bodyText: `${overlayLabels.guideStatusS3CreateBucket[locale]}. ${overlayLabels.guideGoalIamPolicy[locale]}`,
        checklist: step.substeps?.[locale] ?? [],
      }
    }
    if (page.kind === 'iamCreatePolicy') {
      return {
        contextId: 'iamReadyToPaste',
        statusText: overlayLabels.guideStatusIamCreatePolicy[locale],
        goalText: overlayLabels.guideGoalIamPolicy[locale],
        bodyText: `${overlayLabels.guideStatusIamCreatePolicy[locale]}. ${overlayLabels.guideStatusIamReadyToPaste[locale]}`,
        checklist: step.substeps?.[locale] ?? [],
      }
    }
  }

  return {
    contextId: 'default',
    statusText: '',
    goalText: step.body[locale],
    bodyText: step.body[locale],
    checklist: step.substeps?.[locale] ?? [],
  }
}

export function deriveGuideRenderContext(input: GuideRenderContextInput): GuideRenderContext {
  const page = detectAwsPage(input.href)
  const step = input.step
  const bucketFormTarget = step?.id === 'bucket' ? resolveBucketFormTarget() : null
  const isBucketCreateForm = Boolean(bucketFormTarget)
  const isBucketLanding = Boolean(
    step && isBucketStepLandingPage(step, page) && !isBucketCreateForm,
  )
  const isExpectedStepPage = Boolean(
    step && (matchesExpectedStepPage(step, page) || isBucketCreateForm),
  )
  const recoveryMode = deriveRecoveryMode(step, page, isExpectedStepPage, isBucketLanding)
  const searchTarget = recoveryMode === 'searchS3' ? resolveAwsSearchTarget() : null
  const shouldSearchS3 = recoveryMode === 'searchS3' && Boolean(searchTarget)

  if (shouldSearchS3 && input.performSearchSideEffects) {
    putS3InSearch(searchTarget)
  }

  const s3ServiceTarget = searchTarget ? resolveS3ServiceResultTarget() : null
  const createBucketTarget = isBucketLanding ? resolveCreateBucketButtonTarget() : null
  const target =
    bucketFormTarget ??
    createBucketTarget ??
    (step?.highlightSelector && isExpectedStepPage
      ? input.performSearchSideEffects
        ? resolveHighlightTarget(step.highlightSelector)
        : resolveHighlightTargetForDiagnostics(step.highlightSelector)
      : s3ServiceTarget)
  const keepFloatingWithoutBackdrop = isExpectedStepPage && !target
  const substepsVisible = Boolean(
    step &&
    (isExpectedStepPage || recoveryMode === 'openIam') &&
    step.substeps?.[input.locale]?.length,
  )
  const context: GuideRenderContext = {
    page,
    step,
    stepIdentifier: step?.id ?? 'none',
    recoveryMode,
    bucketFormTarget,
    isBucketCreateForm,
    isBucketLanding,
    isExpectedStepPage,
    searchTarget,
    s3ServiceTarget,
    createBucketTarget,
    target,
    shouldSearchS3,
    keepFloatingWithoutBackdrop,
    substepsVisible,
    selectorSummaries: [],
  }
  context.selectorSummaries = summarizeSelectorSummaries(context)
  return context
}
