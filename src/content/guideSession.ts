import { clearHighlight, highlightSelector } from './highlight'
import { renderGuideOverlay } from './guideOverlayDom'
import { detectAwsPage } from './pageDetection'
import {
  ACTIVE_GUIDE_STORAGE_KEY,
  CONTENT_GUIDE_ID,
  HOME_INTRO_GUIDE_ID,
  LOCALES,
  completedStepIdsForIndex,
  contentGuideSteps,
  detectLocaleFromNavigator,
  isPersistedActiveGuide,
  overlayLabels,
  stepIndexForHref,
  type ContentGuideId,
  type ContentGuideStep,
  type ContentMessage,
  type GuideState,
  type GuideStepId,
  type Locale,
} from './contentGuideCatalog'
import { homeIntroSteps } from './consoleHomeIntro'
import {
  putS3InSearch,
  stopWatchingForBucketForm,
  stopWatchingForS3ServiceResult,
  watchForBucketForm,
  watchForS3ServiceResult,
} from './consoleTargets'
import {
  buildIamPolicyCreateUrl,
  deriveGuideRenderContext,
  type GuideRenderContext,
} from './guideRenderContext'
import { buildDebugContextMarkdown } from './debugContextMarkdown'
import { overlayPrimaryActionLabel, overlayStepBody, overlaySubsteps } from './guideOverlayCopy'

let activeLocale: Locale = 'en'
let activeGuideId: ContentGuideId = CONTENT_GUIDE_ID
let activeGuideState: GuideState | null = null
let activeHref = window.location.href

function stepsForGuide(guideId: ContentGuideId): ContentGuideStep[] {
  return guideId === HOME_INTRO_GUIDE_ID ? homeIntroSteps : contentGuideSteps
}

function activeGuideSteps(): ContentGuideStep[] {
  return stepsForGuide(activeGuideId)
}

function isContentGuideId(value: unknown): value is ContentGuideId {
  return value === CONTENT_GUIDE_ID || value === HOME_INTRO_GUIDE_ID
}

function startIndexForGuide(guideId: ContentGuideId, href: string): number {
  return guideId === HOME_INTRO_GUIDE_ID ? 0 : stepIndexForHref(href)
}

function getGuideStorage(): chrome.storage.StorageArea | null {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null
  }
  return chrome.storage.session ?? chrome.storage.local ?? null
}

function persistActiveGuide(): void {
  const storage = getGuideStorage()
  if (!storage || !activeGuideState) {
    return
  }
  storage.set?.({
    [ACTIVE_GUIDE_STORAGE_KEY]: {
      guideId: activeGuideId,
      locale: activeLocale,
      state: activeGuideState,
    },
  })
}

function clearPersistedGuide(): void {
  getGuideStorage()?.remove?.(ACTIVE_GUIDE_STORAGE_KEY)
}

function activeContentGuideStep() {
  if (!activeGuideState) {
    return null
  }
  return activeGuideSteps()[activeGuideState.activeStepIndex] ?? null
}

function advanceContentGuideState(state: GuideState, stepId: GuideStepId): GuideState {
  const completedStepIds = state.completedStepIds.includes(stepId)
    ? state.completedStepIds
    : [...state.completedStepIds, stepId]
  return {
    activeStepIndex: Math.min(state.activeStepIndex + 1, activeGuideSteps().length - 1),
    completedStepIds,
  }
}

function applyLocale(locale: unknown): void {
  if (locale && LOCALES.includes(locale as Locale)) {
    activeLocale = locale as Locale
  }
}

function syncConsoleWatchers(context: GuideRenderContext): void {
  if (context.shouldSearchS3 && !context.s3ServiceTarget) {
    watchForS3ServiceResult(renderCurrentGuideStep)
  } else {
    stopWatchingForS3ServiceResult()
  }

  if (context.isBucketLanding && !context.bucketFormTarget) {
    watchForBucketForm(renderCurrentGuideStep, () => activeContentGuideStep()?.id === 'bucket')
  } else {
    stopWatchingForBucketForm()
  }
}

function handleOverlayPrimaryAction(context: GuideRenderContext, isLastStep: boolean): void {
  const step = context.step
  if (!activeGuideState || !step) {
    return
  }
  if (context.isBucketLanding) {
    watchForBucketForm(renderCurrentGuideStep, () => activeContentGuideStep()?.id === 'bucket')
    context.createBucketTarget?.click()
    return
  }
  if (context.recoveryMode === 'acceptCookies') {
    context.cookieAcceptTarget?.click()
    renderCurrentGuideStep()
    return
  }
  if (context.recoveryMode === 'searchS3') {
    putS3InSearch(context.searchTarget)
    return
  }
  if (context.recoveryMode === 'openIam') {
    window.location.assign(buildIamPolicyCreateUrl(activeHref))
    return
  }
  if (isLastStep) {
    clearPersistedGuide()
    activeGuideState = null
    clearHighlight()
    return
  }
  activeGuideState = advanceContentGuideState(activeGuideState, step.id)
  persistActiveGuide()
  renderCurrentGuideStep()
}

function handleOverlaySecondaryAction(): void {
  stopWatchingForS3ServiceResult()
  stopWatchingForBucketForm()
  clearPersistedGuide()
  activeGuideState = null
  clearHighlight()
}

function renderCurrentGuideStep(): void {
  const context = deriveGuideRenderContext({
    href: activeHref,
    step: activeContentGuideStep(),
    locale: activeLocale,
    performSearchSideEffects: true,
  })
  const step = context.step
  if (!step || !activeGuideState) {
    clearHighlight()
    return
  }

  syncConsoleWatchers(context)
  const isLastStep = activeGuideState.activeStepIndex === activeGuideSteps().length - 1
  renderGuideOverlay(context.target, {
    progressLabel: `Step ${activeGuideState.activeStepIndex + 1} of ${activeGuideSteps().length}`,
    stepTitle: step.title[activeLocale],
    stepBody: overlayStepBody(context, activeLocale),
    substeps: overlaySubsteps(context, activeLocale),
    placement:
      context.shouldSearchS3 || context.keepFloatingWithoutBackdrop ? 'bottomRight' : 'auto',
    dimBackdrop: !context.shouldSearchS3,
    showBackdropWhenUntargeted: !context.shouldSearchS3 && !context.keepFloatingWithoutBackdrop,
    codeBlock: step.policyTemplate ?? null,
    primaryActionLabel: overlayPrimaryActionLabel(context, activeLocale, isLastStep),
    secondaryActionLabel: overlayLabels.exit[activeLocale],
    canAdvance:
      context.isExpectedStepPage || context.recoveryMode !== 'none' || context.isBucketLanding,
    onPrimaryAction: () => handleOverlayPrimaryAction(context, isLastStep),
    onSecondaryAction: handleOverlaySecondaryAction,
    onCopyAction: step.policyTemplate
      ? () => {
          void navigator.clipboard?.writeText(step.policyTemplate!)
        }
      : undefined,
    copyActionLabel: step.policyTemplate ? overlayLabels.copyPolicyJson[activeLocale] : undefined,
  })
}

function renderRequestedGuideStep(requestedIndex: number): void {
  const steps = activeGuideSteps()
  activeGuideState = {
    activeStepIndex: Math.min(Math.max(requestedIndex, 0), steps.length - 1),
    completedStepIds: steps.slice(0, requestedIndex).map((step) => step.id),
  }
  persistActiveGuide()
  renderCurrentGuideStep()
}

function buildGuideSnapshot(href: string) {
  const pageKind = detectAwsPage(href).kind
  if (!activeGuideState) {
    return {
      guideMode: 'not_started' as const,
      pageKind,
      statusText: 'Guide not started',
      goalText: 'Click Start guide to begin the S3 + IAM walkthrough.',
    }
  }
  const step = activeContentGuideStep()
  return {
    guideMode: 'active' as const,
    pageKind,
    stepId: step?.id,
    contextId: step?.id ?? 'unknown',
    statusText: step ? `Current step: ${step.title[activeLocale]}` : 'Current step: Unknown',
    goalText: step?.body[activeLocale],
  }
}

export function restoreGuideFromStorage(href = window.location.href): void {
  const storage = getGuideStorage()
  if (!storage) {
    return
  }
  storage.get(ACTIVE_GUIDE_STORAGE_KEY, (items) => {
    const persisted = items?.[ACTIVE_GUIDE_STORAGE_KEY]
    if (!isPersistedActiveGuide(persisted)) {
      return
    }
    activeHref = href
    activeLocale = persisted.locale
    activeGuideId = persisted.guideId
    const urlStepIndex = startIndexForGuide(activeGuideId, href)
    const activeStepIndex = Math.max(persisted.state.activeStepIndex, urlStepIndex)
    activeGuideState = {
      activeStepIndex,
      completedStepIds:
        activeGuideId === HOME_INTRO_GUIDE_ID
          ? homeIntroSteps.slice(0, activeStepIndex).map((step) => step.id)
          : completedStepIdsForIndex(activeStepIndex),
    }
    persistActiveGuide()
    renderCurrentGuideStep()
  })
}

export function resetGuideRuntimeForTests(): void {
  activeGuideState = null
  activeGuideId = CONTENT_GUIDE_ID
  activeHref = window.location.href
  stopWatchingForS3ServiceResult()
  stopWatchingForBucketForm()
  clearPersistedGuide()
  clearHighlight()
}

export function handleContentMessage(
  message: unknown,
  href: string,
  sendResponse: (response: unknown) => void,
): boolean {
  const contentMessage = message as ContentMessage | null | undefined

  if (
    contentMessage?.type === 'AWS_COPILOT_HIGHLIGHT' &&
    typeof contentMessage.selector === 'string'
  ) {
    try {
      const found = highlightSelector(contentMessage.selector)
      sendResponse({ ok: found })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Refusing to target sensitive AWS fields'
      sendResponse({ ok: false, error: errorMessage })
    }
    return true
  }

  if (
    contentMessage?.type === 'AWS_COPILOT_START_GUIDE' &&
    isContentGuideId(contentMessage.guideId)
  ) {
    activeHref = href
    activeGuideId = contentMessage.guideId
    applyLocale(contentMessage.locale)
    const activeStepIndex = startIndexForGuide(activeGuideId, href)
    const steps = stepsForGuide(activeGuideId)
    activeGuideState = {
      activeStepIndex,
      completedStepIds: steps.slice(0, activeStepIndex).map((step) => step.id),
    }
    persistActiveGuide()
    renderCurrentGuideStep()
    sendResponse({ ok: true })
    return true
  }

  if (
    contentMessage?.type === 'AWS_COPILOT_RENDER_GUIDE_STEP' &&
    isContentGuideId(contentMessage.guideId)
  ) {
    activeHref = href
    activeGuideId = contentMessage.guideId
    applyLocale(contentMessage.locale)
    const requestedIndex =
      typeof contentMessage.activeStepIndex === 'number' ? contentMessage.activeStepIndex : 0
    renderRequestedGuideStep(requestedIndex)
    sendResponse({ ok: true })
    return true
  }

  if (contentMessage?.type === 'AWS_COPILOT_DETECT_PAGE') {
    sendResponse({ ok: true, page: detectAwsPage(href) })
    return true
  }

  if (contentMessage?.type === 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT') {
    try {
      sendResponse({
        ok: true,
        markdown: buildDebugContextMarkdown({
          href,
          context: deriveGuideRenderContext({
            href,
            step: activeContentGuideStep(),
            locale: activeLocale,
          }),
          locale: activeLocale,
          activeGuideState,
          stepCount: activeGuideSteps().length,
        }),
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to extract debug context'
      sendResponse({ ok: false, error: errorMessage })
    }
    return true
  }

  if (contentMessage?.type === 'AWS_COPILOT_GET_GUIDE_SNAPSHOT') {
    sendResponse({ ok: true, snapshot: buildGuideSnapshot(href) })
    return true
  }

  return false
}

export function bootContentGuide(): void {
  activeLocale = detectLocaleFromNavigator()
  restoreGuideFromStorage()
}
