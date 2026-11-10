import { overlayLabels, type Locale } from './contentGuideCatalog'
import { isHomeIntroStepId } from './consoleHomeIntro'
import { resolveActiveGuideContext, type GuideRenderContext } from './guideRenderContext'

export function overlayStepBody(context: GuideRenderContext, locale: Locale): string {
  const step = context.step
  const homeIntro = Boolean(step && isHomeIntroStepId(step.id))
  if (!step) {
    return overlayLabels.wrongPage[locale]
  }
  if (context.recoveryMode === 'acceptCookies') {
    return homeIntro
      ? overlayLabels.cookieBannerHomeIntro[locale]
      : overlayLabels.cookieBanner[locale]
  }
  if (context.isBucketLanding) {
    return overlayLabels.openCreateBucket[locale]
  }
  const activeContext = resolveActiveGuideContext(step, context.page, context.recoveryMode, locale)
  if (context.isExpectedStepPage || context.recoveryMode === 'openIam') {
    return activeContext.bodyText
  }
  if (context.page.kind === 'notAws') {
    return overlayLabels.notAws[locale]
  }
  return homeIntro ? overlayLabels.wrongPageHomeIntro[locale] : overlayLabels.wrongPage[locale]
}

export function overlaySubsteps(context: GuideRenderContext, locale: Locale): string[] | undefined {
  if (context.isBucketLanding || !context.step) {
    return undefined
  }
  if (context.isExpectedStepPage || context.recoveryMode === 'openIam') {
    return resolveActiveGuideContext(context.step, context.page, context.recoveryMode, locale)
      .checklist
  }
  return undefined
}

export function overlayPrimaryActionLabel(
  context: GuideRenderContext,
  locale: Locale,
  isLastStep: boolean,
): string {
  if (context.recoveryMode === 'acceptCookies') {
    return overlayLabels.acceptCookies[locale]
  }
  if (context.recoveryMode === 'searchS3') {
    return overlayLabels.searchS3[locale]
  }
  if (context.recoveryMode === 'openIam') {
    return overlayLabels.openIam[locale]
  }
  if (context.isBucketLanding) {
    return overlayLabels.createBucket[locale]
  }
  return isLastStep ? overlayLabels.exit[locale] : overlayLabels.next[locale]
}
