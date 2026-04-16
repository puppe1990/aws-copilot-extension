import { clearHighlight, highlightSelector, renderGuideOverlay, resolveHighlightTarget } from './highlight';
import { detectAwsPage } from './pageDetection';
import { assertSafeElement, assertSafeSelector, isSensitiveSelector } from '../safety/safetyRules';

console.info('[AWS Copilot] content script loaded', detectAwsPage(window.location.href));

type Locale = 'en' | 'pt-BR';
type GuideStepId = 'objective' | 'bucket' | 'security' | 'iamPolicy' | 'review';
type GuideState = {
  activeStepIndex: number;
  completedStepIds: GuideStepId[];
};

type ContentMessage = {
  type?: string;
  selector?: unknown;
  guideId?: unknown;
  locale?: unknown;
  activeStepIndex?: unknown;
};

type ContentGuideStep = {
  id: GuideStepId;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  substeps?: Record<Locale, string[]>;
  expectedPage: 'anyAws' | 's3BucketsList' | 's3CreateBucket' | 's3BucketSettings' | 'iamCreatePolicy';
  highlightSelector?: string;
  policyTemplate?: string;
};

const guideId = 's3-iam-app-access';
const locales: Locale[] = ['en', 'pt-BR'];
const bucketName = 'my-app-uploads-prod';
const startStepIndex = 1;
const activeGuideStorageKey = 'awsCopilot.activeGuide';

type PersistedActiveGuide = {
  guideId: typeof guideId;
  locale: Locale;
  state: GuideState;
};
const labels = {
  copyPolicyJson: {
    en: 'Copy policy JSON',
    'pt-BR': 'Copiar JSON da politica'
  },
  next: {
    en: 'Next step',
    'pt-BR': 'Proxima etapa'
  },
  exit: {
    en: 'Exit guide',
    'pt-BR': 'Sair do guia'
  },
  wrongPage: {
    en: 'Search for S3 in the AWS Console, then open Amazon S3.',
    'pt-BR': 'Busque por S3 no Console da AWS e abra Amazon S3.'
  },
  notAws: {
    en: 'Open the AWS Console to use this guide.',
    'pt-BR': 'Abra o Console da AWS para usar este guia.'
  },
  searchS3: {
    en: 'Search S3',
    'pt-BR': 'Buscar S3'
  },
  openCreateBucket: {
    en: 'Click Create bucket in Amazon S3.',
    'pt-BR': 'Clique em Create bucket no Amazon S3.'
  },
  createBucket: {
    en: 'Create bucket',
    'pt-BR': 'Create bucket'
  }
} as const;

const awsSearchSelector = [
  'input[aria-label="Search"]',
  'input[aria-label*="Search"]',
  'input[placeholder="Search"]',
  'input[type="search"]',
  '[role="searchbox"]'
].join(', ');
const bucketNameFieldSelectors = [
  '[data-testid="bucket-name"]',
  'input[name="bucketName"]',
  'input[aria-label*="Bucket" i]',
  'input[placeholder*="bucket" i]',
  'input[placeholder*="s3-demo" i]'
];

const steps: ContentGuideStep[] = [
  {
    id: 'objective',
    title: {
      en: 'Choose the objective',
      'pt-BR': 'Escolha o objetivo'
    },
    body: {
      en: 'This guide creates app access to S3 without opening the bucket publicly.',
      'pt-BR': 'Este guia cria acesso de aplicacao ao S3 sem abrir o bucket publicamente.'
    },
    expectedPage: 'anyAws'
  },
  {
    id: 'bucket',
    title: {
      en: 'Create the bucket',
      'pt-BR': 'Crie o bucket'
    },
    body: {
      en: `Use a globally unique bucket name such as ${bucketName}. Do not include secrets or customer data in the name.`,
      'pt-BR': `Use um nome globalmente unico, como ${bucketName}. Nao inclua segredos ou dados de clientes no nome.`
    },
    substeps: {
      en: [
        'Keep the default General purpose bucket type.',
        'Leave Global namespace selected.',
        'Enter a lowercase, globally unique bucket name.',
        'Do not put secrets, customer names, or account data in the bucket name.'
      ],
      'pt-BR': [
        'Mantenha o tipo General purpose.',
        'Deixe Global namespace selecionado.',
        'Digite um nome minusculo e globalmente unico.',
        'Nao coloque segredos, nomes de clientes ou dados da conta no nome do bucket.'
      ]
    },
    expectedPage: 's3CreateBucket',
    highlightSelector: '[data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]'
  },
  {
    id: 'security',
    title: {
      en: 'Keep public access blocked',
      'pt-BR': 'Mantenha o acesso publico bloqueado'
    },
    body: {
      en: 'Block public access unless you have a specific reviewed reason to make objects public.',
      'pt-BR': 'Bloqueie acesso publico, exceto quando houver um motivo especifico e revisado para publicar objetos.'
    },
    substeps: {
      en: [
        'Scroll to Block Public Access settings.',
        'Keep all public access block options enabled.',
        'Do not enable public ACLs or public bucket policies for app uploads.'
      ],
      'pt-BR': [
        'Role ate Block Public Access settings.',
        'Mantenha todas as opcoes de bloqueio publico ativadas.',
        'Nao habilite ACLs publicas nem politicas publicas para uploads da aplicacao.'
      ]
    },
    expectedPage: 's3BucketSettings',
    highlightSelector:
      '[data-testid="block-public-access"], [data-testid*="block-public"] input, input[name="blockPublicAccess"], input[aria-label*="Block public access"]'
  },
  {
    id: 'iamPolicy',
    title: {
      en: 'Create a least-privilege IAM policy',
      'pt-BR': 'Crie uma politica IAM de privilegio minimo'
    },
    body: {
      en: 'Scope the policy to this bucket and only the S3 actions your app needs.',
      'pt-BR': 'Restrinja a politica a este bucket e apenas as acoes S3 que a aplicacao precisa.'
    },
    substeps: {
      en: [
        'Use the JSON editor.',
        'Replace the example bucket name with the bucket you created.',
        'Keep actions limited to list, read, write, and delete only if your app needs them.'
      ],
      'pt-BR': [
        'Use o editor JSON.',
        'Troque o nome de exemplo pelo bucket que voce criou.',
        'Mantenha as acoes limitadas a listar, ler, gravar e apagar apenas se a aplicacao precisar.'
      ]
    },
    expectedPage: 'iamCreatePolicy',
    highlightSelector:
      '[data-testid="policy-json"], [data-testid*="policy-json"], [aria-label="Policy JSON"], [aria-label*="Policy JSON"]',
    policyTemplate: JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['s3:ListBucket'],
            Resource: `arn:aws:s3:::${bucketName}`
          },
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: `arn:aws:s3:::${bucketName}/*`
          }
        ]
      },
      null,
      2
    )
  },
  {
    id: 'review',
    title: {
      en: 'Review the result',
      'pt-BR': 'Revise o resultado'
    },
    body: {
      en: 'Confirm the bucket is private and the IAM policy references only the intended bucket.',
      'pt-BR': 'Confirme que o bucket esta privado e que a politica IAM referencia apenas o bucket esperado.'
    },
    substeps: {
      en: [
        'Check that public access is still blocked.',
        'Check that the policy uses only the intended bucket ARN.',
        'Attach the policy only to the app role or app user that needs S3 access.'
      ],
      'pt-BR': [
        'Confira se o acesso publico continua bloqueado.',
        'Confira se a politica usa apenas o ARN do bucket esperado.',
        'Anexe a politica apenas ao role ou usuario da aplicacao que precisa acessar S3.'
      ]
    },
    expectedPage: 'anyAws'
  }
];

let activeLocale: Locale = 'en';
let activeGuideState: GuideState | null = null;
let activeHref = window.location.href;
let s3ResultObserver: MutationObserver | null = null;
let s3ResultObserverTimeout: number | null = null;
let bucketFormObserver: MutationObserver | null = null;
let bucketFormObserverTimeout: number | null = null;

function getGuideStorage(): chrome.storage.StorageArea | null {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null;
  }

  return chrome.storage.session ?? chrome.storage.local ?? null;
}

function isPersistedActiveGuide(value: unknown): value is PersistedActiveGuide {
  const candidate = value as PersistedActiveGuide | null | undefined;
  return (
    candidate?.guideId === guideId &&
    locales.includes(candidate.locale) &&
    typeof candidate.state?.activeStepIndex === 'number' &&
    Array.isArray(candidate.state.completedStepIds)
  );
}

function persistActiveGuide(): void {
  const storage = getGuideStorage();
  if (!storage || !activeGuideState) {
    return;
  }

  storage.set?.({
    [activeGuideStorageKey]: {
      guideId,
      locale: activeLocale,
      state: activeGuideState
    }
  });
}

function clearPersistedGuide(): void {
  getGuideStorage()?.remove(activeGuideStorageKey);
}

function stopWatchingForS3ServiceResult(): void {
  s3ResultObserver?.disconnect();
  s3ResultObserver = null;

  if (s3ResultObserverTimeout !== null) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(s3ResultObserverTimeout);
    }
    s3ResultObserverTimeout = null;
  }
}

function stopWatchingForBucketForm(): void {
  bucketFormObserver?.disconnect();
  bucketFormObserver = null;

  if (bucketFormObserverTimeout !== null) {
    if (typeof window !== 'undefined') {
      window.clearTimeout(bucketFormObserverTimeout);
    }
    bucketFormObserverTimeout = null;
  }
}

function detectLocaleFromNavigator(): Locale {
  const browserLanguages = typeof navigator === 'undefined' ? [] : navigator.languages;
  return browserLanguages.some((language) => language.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en';
}

function currentAwsPage(href = activeHref) {
  return detectAwsPage(href);
}

function stepIndexForHref(href: string): number {
  const page = currentAwsPage(href);

  if (page.kind === 's3BucketSettings') {
    return 2;
  }

  if (page.kind === 'iamCreatePolicy') {
    return 3;
  }

  return startStepIndex;
}

function completedStepIdsForIndex(activeStepIndex: number): GuideStepId[] {
  return steps.slice(0, activeStepIndex).map((step) => step.id);
}

function matchesExpectedPage(expectedPage: ContentGuideStep['expectedPage'], page = currentAwsPage()): boolean {

  if (expectedPage === 'anyAws') {
    return page.kind !== 'notAws';
  }

  return page.kind === expectedPage;
}

function matchesExpectedStepPage(step: ContentGuideStep, page = currentAwsPage()): boolean {

  if (step.id === 'security' && page.kind === 's3CreateBucket') {
    return true;
  }

  return matchesExpectedPage(step.expectedPage, page);
}

function isBucketStepLandingPage(step: ContentGuideStep, page = currentAwsPage()): boolean {
  return step.id === 'bucket' && page.kind === 's3BucketsList';
}

function resolveCreateBucketButtonTarget(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, a, [role="button"], [aria-label]'));

  for (const candidate of candidates) {
    const text = normalizedText(candidate);
    if (!/^Create bucket$/iu.test(text) || !isVisibleEnough(candidate)) {
      continue;
    }

    assertSafeElement(candidate);
    return candidate;
  }

  return null;
}

function resolveBucketFormTarget(): HTMLElement | null {
  for (const selector of bucketNameFieldSelectors) {
    assertSafeSelector(selector);

    let candidates: NodeListOf<Element>;
    try {
      candidates = document.querySelectorAll(selector);
    } catch {
      continue;
    }

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      assertSafeElement(candidate);

      if (isVisibleEnough(candidate) || candidates.length === 1) {
        return candidate;
      }
    }
  }

  return null;
}

function resolveAwsSearchTarget(): HTMLInputElement | HTMLElement | null {
  assertSafeSelector(awsSearchSelector);

  let targets: NodeListOf<Element>;
  try {
    targets = document.querySelectorAll(awsSearchSelector);
  } catch {
    return null;
  }

  for (const target of targets) {
    if (!(target instanceof HTMLElement)) {
      continue;
    }

    assertSafeElement(target);

    const rect = target.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    if (isVisible || targets.length === 1) {
      return target instanceof HTMLInputElement ? target : target;
    }
  }

  return null;
}

function putS3InSearch(target: HTMLElement | null): void {
  if (!(target instanceof HTMLInputElement)) {
    target?.focus();
    return;
  }

  const inputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  inputValueSetter?.call(target, 'S3');
  target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'S3' }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  target.focus();
}

function normalizedText(element: HTMLElement): string {
  return (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function isVisibleEnough(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function resolveS3ServiceResultTarget(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('a, button, [role="link"], [role="button"], [role="option"], [data-testid], [aria-label]')
  );

  for (const candidate of candidates) {
    const text = normalizedText(candidate);
    const isS3Service = /^S3\b/u.test(text) && /Scalable Storage in the Cloud/iu.test(text);
    if (!isS3Service || !isVisibleEnough(candidate)) {
      continue;
    }

    assertSafeElement(candidate);
    return candidate;
  }

  return null;
}

function watchForS3ServiceResult(): void {
  if (typeof MutationObserver === 'undefined' || s3ResultObserver) {
    return;
  }

  s3ResultObserver = new MutationObserver(() => {
    if (typeof document === 'undefined') {
      stopWatchingForS3ServiceResult();
      return;
    }

    if (!resolveS3ServiceResultTarget()) {
      return;
    }

    stopWatchingForS3ServiceResult();
    renderCurrentGuideStep();
  });
  s3ResultObserver.observe(document.body, { childList: true, subtree: true });
  s3ResultObserverTimeout = window.setTimeout(() => {
    stopWatchingForS3ServiceResult();
  }, 8000);
}

function watchForBucketForm(): void {
  if (typeof MutationObserver === 'undefined' || bucketFormObserver) {
    return;
  }

  bucketFormObserver = new MutationObserver(() => {
    if (typeof document === 'undefined' || currentStep()?.id !== 'bucket') {
      stopWatchingForBucketForm();
      return;
    }

    if (!resolveBucketFormTarget()) {
      return;
    }

    stopWatchingForBucketForm();
    renderCurrentGuideStep();
  });
  bucketFormObserver.observe(document.body, { childList: true, subtree: true });
  bucketFormObserverTimeout = window.setTimeout(() => {
    stopWatchingForBucketForm();
  }, 15000);
}

function currentStep(): ContentGuideStep | null {
  if (!activeGuideState) {
    return null;
  }

  return steps[activeGuideState.activeStepIndex] ?? null;
}

function isInsideInjectedOverlay(element: HTMLElement): boolean {
  return Boolean(element.closest('[data-aws-copilot-guide-card], [data-aws-copilot-highlight]'));
}

function getVisibleElements(selectors: string): HTMLElement[] {
  try {
    return Array.from(document.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => isVisibleEnough(element) && !isInsideInjectedOverlay(element)
    );
  } catch {
    return [];
  }
}

function describeNodeText(element: HTMLElement): string {
  return normalizedText(element);
}

function describeActionElement(element: HTMLElement): string {
  let label = describeNodeText(element);

  if (element instanceof HTMLInputElement) {
    const type = (element.getAttribute('type') ?? '').trim().toLowerCase();
    if (type === 'button' || type === 'submit' || type === 'reset') {
      label = element.value.trim() || normalizedText(element) || type;
    }
  }

  if (isSensitiveSelector(label) || isSensitiveSelector(element.getAttribute('name') ?? '') || isSensitiveSelector(element.id)) {
    return '[redacted sensitive field]';
  }

  return label;
}

function describeInputElement(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  const labelledText =
    labelledBy
      ?.split(/\s+/u)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ?? '';
  const labelText =
    (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
      ? Array.from(element.labels ?? [])
          .map((label) => label.textContent ?? '')
          .join(' ')
      : '')
      .replace(/\s+/g, ' ')
      .trim() || element.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const ariaLabel = element.getAttribute('aria-label')?.trim() ?? '';
  const placeholder = element.getAttribute('placeholder')?.trim() ?? '';
  const name = element.getAttribute('name')?.trim() ?? '';
  const type = element.getAttribute('type')?.trim() ?? element.tagName.toLowerCase();
  const label = labelledText || labelText || ariaLabel || placeholder || name || type;

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
    return '[redacted sensitive field]';
  }

  return label;
}

function formatMarkdownList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None visible';
}

function resolveHighlightTargetForDiagnostics(selector: string): HTMLElement | null {
  try {
    assertSafeSelector(selector);
  } catch {
    return null;
  }

  let targets: NodeListOf<Element>;
  try {
    targets = document.querySelectorAll(selector);
  } catch {
    return null;
  }

  if (targets.length !== 1) {
    return null;
  }

  const target = targets[0];
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  try {
    assertSafeElement(target);
  } catch {
    return null;
  }

  return target;
}

type GuideRenderContext = {
  page: ReturnType<typeof detectAwsPage>;
  step: ContentGuideStep | null;
  stepIdentifier: string;
  bucketFormTarget: HTMLElement | null;
  isBucketCreateForm: boolean;
  isBucketLanding: boolean;
  isExpectedStepPage: boolean;
  searchTarget: HTMLElement | null;
  s3ServiceTarget: HTMLElement | null;
  createBucketTarget: HTMLElement | null;
  target: HTMLElement | null;
  shouldSearchS3: boolean;
  keepFloatingWithoutBackdrop: boolean;
  substepsVisible: boolean;
  selectorSummaries: string[];
};

function summarizeSelectorSummaries(context: GuideRenderContext): string[] {
  if (!context.step) {
    return ['None'];
  }

  const summaries: string[] = [];

  if (context.step.highlightSelector) {
    summaries.push(`highlightSelector: ${isSensitiveSelector(context.step.highlightSelector) ? '[redacted sensitive field]' : context.step.highlightSelector}`);
  }

  if (context.step.id === 'bucket') {
    summaries.push(`bucketFormSelectors: ${bucketNameFieldSelectors.join(' | ')}`);
  }

  if (context.shouldSearchS3) {
    summaries.push(`searchSelector: ${awsSearchSelector}`);
  }

  return summaries.length > 0 ? summaries : ['None'];
}

function deriveGuideRenderContext(href: string, options?: { performSearchSideEffects?: boolean }): GuideRenderContext {
  const page = detectAwsPage(href);
  const step = currentStep();
  const bucketFormTarget = step?.id === 'bucket' ? resolveBucketFormTarget() : null;
  const isBucketCreateForm = Boolean(bucketFormTarget);
  const isBucketLanding = Boolean(step?.id === 'bucket' && !isBucketCreateForm && page.kind === 's3BucketsList');
  const isExpectedStepPage = Boolean(step && (matchesExpectedStepPage(step, page) || isBucketCreateForm));
  const searchTarget = !isExpectedStepPage && !isBucketLanding && page.kind !== 'notAws' ? resolveAwsSearchTarget() : null;
  const shouldSearchS3 = Boolean(searchTarget);

  if (shouldSearchS3 && options?.performSearchSideEffects) {
    putS3InSearch(searchTarget);
  }

  const s3ServiceTarget = searchTarget ? resolveS3ServiceResultTarget() : null;
  const createBucketTarget = isBucketLanding ? resolveCreateBucketButtonTarget() : null;
  const target =
    bucketFormTarget ??
    createBucketTarget ??
    (step?.highlightSelector && isExpectedStepPage
      ? options?.performSearchSideEffects
        ? resolveHighlightTarget(step.highlightSelector)
        : resolveHighlightTargetForDiagnostics(step.highlightSelector)
      : s3ServiceTarget);
  const keepFloatingWithoutBackdrop = isExpectedStepPage && !target;
  const substepsVisible = Boolean(step && isExpectedStepPage && step.substeps?.[activeLocale]?.length);
  const context: GuideRenderContext = {
    page,
    step,
    stepIdentifier: step?.id ?? 'none',
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
    selectorSummaries: []
  };

  context.selectorSummaries = summarizeSelectorSummaries(context);
  return context;
}

function buildDebugContextMarkdown(href: string): string {
  const context = deriveGuideRenderContext(href);
  const headingItems = getVisibleElements('h1, h2, h3, h4, h5, h6').map(describeNodeText).filter(Boolean).slice(0, 8);
  const actionItems = getVisibleElements('button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]').map(
    describeActionElement
  ).filter(Boolean).slice(0, 8);
  const inputItems = getVisibleElements('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select')
    .map(describeInputElement)
    .filter(Boolean)
    .slice(0, 8);
  const guideLines = activeGuideState
    ? [
        `- Active guide: ${guideId}`,
        `- Current step: ${context.step ? context.step.title[activeLocale] : 'Unknown'}`,
        `- Progress: Step ${activeGuideState.activeStepIndex + 1} of ${steps.length}`
      ]
    : ['- No active guide'];

  return [
    '## Page',
    `- URL: ${href}`,
    `- Document title: ${document.title || '(empty)'}`,
    `- Detected page kind: ${context.page.kind}`,
    '',
    '## Guide',
    ...guideLines,
    '',
    '## Wizard diagnostics',
    `- stepId: ${context.stepIdentifier}`,
    `- isExpectedStepPage: ${String(context.isExpectedStepPage)}`,
    `- isBucketLanding: ${String(context.isBucketLanding)}`,
    `- shouldSearchS3: ${String(context.shouldSearchS3)}`,
    `- targetFound: ${String(Boolean(context.target))}`,
    `- substepsVisible: ${String(context.substepsVisible)}`,
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
    formatMarkdownList(inputItems)
  ].join('\n');
}

function goNext(state: GuideState, stepId: GuideStepId): GuideState {
  const completedStepIds = state.completedStepIds.includes(stepId) ? state.completedStepIds : [...state.completedStepIds, stepId];
  return {
    activeStepIndex: Math.min(state.activeStepIndex + 1, steps.length - 1),
    completedStepIds
  };
}

function renderCurrentGuideStep(): void {
  const context = deriveGuideRenderContext(activeHref, { performSearchSideEffects: true });
  const step = context.step;
  if (!step || !activeGuideState) {
    clearHighlight();
    return;
  }

  const page = context.page;
  const bucketFormTarget = context.bucketFormTarget;
  const isBucketLanding = context.isBucketLanding;
  const isExpectedStepPage = context.isExpectedStepPage;
  const searchTarget = context.searchTarget;
  const s3ServiceTarget = context.s3ServiceTarget;
  const createBucketTarget = context.createBucketTarget;
  const target = context.target;
  const shouldSearchS3 = context.shouldSearchS3;
  const keepFloatingWithoutBackdrop = context.keepFloatingWithoutBackdrop;

  if (shouldSearchS3 && !s3ServiceTarget) {
    watchForS3ServiceResult();
  } else {
    stopWatchingForS3ServiceResult();
  }

  if (isBucketLanding && !bucketFormTarget) {
    watchForBucketForm();
  } else {
    stopWatchingForBucketForm();
  }

  renderGuideOverlay(target, {
    progressLabel: `Step ${activeGuideState.activeStepIndex + 1} of ${steps.length}`,
    stepTitle: step.title[activeLocale],
    stepBody: isBucketLanding
      ? labels.openCreateBucket[activeLocale]
      : isExpectedStepPage
        ? step.body[activeLocale]
        : page.kind === 'notAws'
          ? labels.notAws[activeLocale]
          : labels.wrongPage[activeLocale],
    substeps: isExpectedStepPage ? step.substeps?.[activeLocale] : undefined,
    placement: shouldSearchS3 || keepFloatingWithoutBackdrop ? 'bottomRight' : 'auto',
    dimBackdrop: !shouldSearchS3,
    showBackdropWhenUntargeted: !shouldSearchS3 && !keepFloatingWithoutBackdrop,
    codeBlock: step.policyTemplate ?? null,
    primaryActionLabel:
      shouldSearchS3
        ? labels.searchS3[activeLocale]
        : isBucketLanding
          ? labels.createBucket[activeLocale]
          : activeGuideState.activeStepIndex === steps.length - 1
            ? labels.exit[activeLocale]
            : labels.next[activeLocale],
    secondaryActionLabel: labels.exit[activeLocale],
    canAdvance: isExpectedStepPage || shouldSearchS3 || isBucketLanding,
    onPrimaryAction: () => {
      if (!activeGuideState) {
        return;
      }

      if (isBucketLanding) {
        watchForBucketForm();
        createBucketTarget?.click();
        return;
      }

      if (shouldSearchS3) {
        putS3InSearch(searchTarget);
        return;
      }

      if (activeGuideState.activeStepIndex === steps.length - 1) {
        clearPersistedGuide();
        activeGuideState = null;
        clearHighlight();
        return;
      }

      activeGuideState = goNext(activeGuideState, step.id);
      persistActiveGuide();
      renderCurrentGuideStep();
    },
    onSecondaryAction: () => {
      stopWatchingForS3ServiceResult();
      stopWatchingForBucketForm();
      clearPersistedGuide();
      activeGuideState = null;
      clearHighlight();
    },
    onCopyAction: step.policyTemplate
      ? () => {
          void navigator.clipboard?.writeText(step.policyTemplate!);
        }
      : undefined,
    copyActionLabel: step.policyTemplate ? labels.copyPolicyJson[activeLocale] : undefined
  });
}

function renderRequestedGuideStep(requestedIndex: number): void {
  activeGuideState = {
    activeStepIndex: Math.min(Math.max(requestedIndex, 0), steps.length - 1),
    completedStepIds: steps.slice(0, requestedIndex).map((step) => step.id)
  };
  persistActiveGuide();
  renderCurrentGuideStep();
}

export function restoreGuideFromStorage(href = window.location.href): void {
  const storage = getGuideStorage();
  if (!storage) {
    return;
  }

  storage.get(activeGuideStorageKey, (items) => {
    const persisted = items?.[activeGuideStorageKey];
    if (!isPersistedActiveGuide(persisted)) {
      return;
    }

    activeHref = href;
    activeLocale = persisted.locale;
    const urlStepIndex = stepIndexForHref(href);
    const activeStepIndex = Math.max(persisted.state.activeStepIndex, urlStepIndex);
    activeGuideState = {
      activeStepIndex,
      completedStepIds: completedStepIdsForIndex(activeStepIndex)
    };
    persistActiveGuide();
    renderCurrentGuideStep();
  });
}

export function handleContentMessage(
  message: unknown,
  href: string,
  sendResponse: (response: unknown) => void
): boolean {
  const contentMessage = message as ContentMessage | null | undefined;

  if (contentMessage?.type === 'AWS_COPILOT_HIGHLIGHT' && typeof contentMessage.selector === 'string') {
    try {
      const found = highlightSelector(contentMessage.selector);
      sendResponse({ ok: found });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Refusing to target sensitive AWS fields';
      sendResponse({ ok: false, error: errorMessage });
    }
    return true;
  }

  if (contentMessage?.type === 'AWS_COPILOT_START_GUIDE' && contentMessage.guideId === guideId) {
    activeHref = href;
    if (contentMessage.locale && locales.includes(contentMessage.locale as Locale)) {
      activeLocale = contentMessage.locale as Locale;
    }
    const activeStepIndex = stepIndexForHref(href);
    activeGuideState = {
      activeStepIndex,
      completedStepIds: completedStepIdsForIndex(activeStepIndex)
    };
    persistActiveGuide();
    renderCurrentGuideStep();
    sendResponse({ ok: true });
    return true;
  }

  if (contentMessage?.type === 'AWS_COPILOT_RENDER_GUIDE_STEP' && contentMessage.guideId === guideId) {
    activeHref = href;
    if (contentMessage.locale && locales.includes(contentMessage.locale as Locale)) {
      activeLocale = contentMessage.locale as Locale;
    }
    const requestedIndex = typeof contentMessage.activeStepIndex === 'number' ? contentMessage.activeStepIndex : 0;
    renderRequestedGuideStep(requestedIndex);
    sendResponse({ ok: true });
    return true;
  }

  if (contentMessage?.type === 'AWS_COPILOT_DETECT_PAGE') {
    sendResponse({ ok: true, page: detectAwsPage(href) });
    return true;
  }

  if (contentMessage?.type === 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT') {
    try {
      sendResponse({ ok: true, markdown: buildDebugContextMarkdown(href) });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract debug context';
      sendResponse({ ok: false, error: errorMessage });
    }
    return true;
  }

  return false;
}

activeLocale = detectLocaleFromNavigator();
restoreGuideFromStorage();

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    return handleContentMessage(message, window.location.href, sendResponse);
  });
}
