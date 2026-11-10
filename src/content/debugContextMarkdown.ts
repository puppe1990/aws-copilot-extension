import { isSensitiveSelector } from '../safety/safetyRules'
import { CONTENT_GUIDE_ID, type GuideState, type Locale } from './contentGuideCatalog'
import { isVisibleEnough, normalizedText } from './consoleTargets'
import type { GuideRenderContext } from './guideRenderContext'

function isInsideInjectedOverlay(element: HTMLElement): boolean {
  return Boolean(element.closest('[data-aws-copilot-guide-card], [data-aws-copilot-highlight]'))
}

function getVisibleElements(selectors: string): HTMLElement[] {
  try {
    return Array.from(document.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => isVisibleEnough(element) && !isInsideInjectedOverlay(element),
    )
  } catch {
    return []
  }
}

function describeNodeText(element: HTMLElement): string {
  return normalizedText(element)
}

function describeActionElement(element: HTMLElement): string {
  let label = describeNodeText(element)
  if (element instanceof HTMLInputElement) {
    const type = (element.getAttribute('type') ?? '').trim().toLowerCase()
    if (type === 'button' || type === 'submit' || type === 'reset') {
      label = element.value.trim() || normalizedText(element) || type
    }
  }
  if (
    isSensitiveSelector(label) ||
    isSensitiveSelector(element.getAttribute('name') ?? '') ||
    isSensitiveSelector(element.id)
  ) {
    return '[redacted sensitive field]'
  }
  return label
}

function describeInputElement(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby')
  const labelledText =
    labelledBy
      ?.split(/\s+/u)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''
  const labelText =
    (element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
      ? Array.from(element.labels ?? [])
          .map((label) => label.textContent ?? '')
          .join(' ')
      : ''
    )
      .replace(/\s+/g, ' ')
      .trim() ||
    element.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() ||
    ''
  const ariaLabel = element.getAttribute('aria-label')?.trim() ?? ''
  const placeholder = element.getAttribute('placeholder')?.trim() ?? ''
  const name = element.getAttribute('name')?.trim() ?? ''
  const type = element.getAttribute('type')?.trim() ?? element.tagName.toLowerCase()
  const label = labelledText || labelText || ariaLabel || placeholder || name || type

  if (
    isSensitiveSelector(label) ||
    isSensitiveSelector(labelledText) ||
    isSensitiveSelector(labelText) ||
    isSensitiveSelector(ariaLabel) ||
    isSensitiveSelector(placeholder) ||
    isSensitiveSelector(name) ||
    isSensitiveSelector(type) ||
    isSensitiveSelector(element.id) ||
    isSensitiveSelector(element.getAttribute('autocomplete') ?? '') ||
    isSensitiveSelector(element.getAttribute('type') ?? '')
  ) {
    return '[redacted sensitive field]'
  }
  return label
}

function formatMarkdownList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None visible'
}

function buildDiagnosisLines(context: GuideRenderContext): string[] {
  if (!context.step) {
    return ['- No active guide step']
  }
  const recommendedAction =
    context.recoveryMode === 'searchS3'
      ? 'Search for S3 in the AWS Console, then open Amazon S3.'
      : context.recoveryMode === 'openIam'
        ? 'Open IAM Policies, click Create policy, switch to the JSON editor, and paste the policy JSON.'
        : context.isExpectedStepPage
          ? 'Stay on this page and complete the highlighted step.'
          : 'Inspect the current page state manually.'
  return [
    `- Expected page kind: ${context.step.expectedPage}`,
    `- Recovery mode: ${context.recoveryMode}`,
    `- Recommended action: ${recommendedAction}`,
  ]
}

export type DebugMarkdownInput = {
  href: string
  context: GuideRenderContext
  locale: Locale
  activeGuideState: GuideState | null
  stepCount: number
}

export function buildDebugContextMarkdown(input: DebugMarkdownInput): string {
  const { href, context, locale, activeGuideState, stepCount } = input
  const headingItems = getVisibleElements('h1, h2, h3, h4, h5, h6')
    .map(describeNodeText)
    .filter(Boolean)
    .slice(0, 8)
  const actionItems = getVisibleElements(
    'button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]',
  )
    .map(describeActionElement)
    .filter(Boolean)
    .slice(0, 8)
  const inputItems = getVisibleElements(
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select',
  )
    .map(describeInputElement)
    .filter(Boolean)
    .slice(0, 8)
  const guideLines = activeGuideState
    ? [
        `- Active guide: ${CONTENT_GUIDE_ID}`,
        `- Current step: ${context.step ? context.step.title[locale] : 'Unknown'}`,
        `- Progress: Step ${activeGuideState.activeStepIndex + 1} of ${stepCount}`,
      ]
    : ['- Guide not started']
  const debugSections = activeGuideState
    ? [
        '',
        '## Wizard diagnostics',
        `- stepId: ${context.stepIdentifier}`,
        `- isExpectedStepPage: ${String(context.isExpectedStepPage)}`,
        `- isBucketLanding: ${String(context.isBucketLanding)}`,
        `- shouldSearchS3: ${String(context.shouldSearchS3)}`,
        `- targetFound: ${String(Boolean(context.target))}`,
        `- substepsVisible: ${String(context.substepsVisible)}`,
        '',
        '## Diagnosis',
        ...buildDiagnosisLines(context),
      ]
    : []

  return [
    '## Page',
    `- URL: ${href}`,
    `- Document title: ${document.title || '(empty)'}`,
    `- Detected page kind: ${context.page.kind}`,
    '',
    '## Guide',
    ...guideLines,
    ...debugSections,
    '',
    '## Selector summaries',
    formatMarkdownList(context.selectorSummaries),
    '',
    '## Headings',
    formatMarkdownList(headingItems),
    '',
    '## Actions',
    formatMarkdownList(actionItems),
    '',
    '## Inputs',
    formatMarkdownList(inputItems),
  ].join('\n')
}
