import { useEffect, useMemo, useState } from 'react';
import { createGuideState, currentStep, goNext, markDone } from '../guides/guideEngine';
import { renderIamPolicyTemplate, s3IamGuide } from '../guides/s3IamGuide';
import type { AwsPage } from '../content/pageDetection';
import { detectLocale, type Locale, t } from '../i18n';

const DEBUG_MODE_STORAGE_KEY = 'awsCopilot.debugMode';
const startStepId = 'objective';

function extractDebugContextFromPage(): string {
  const normalizeText = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? '';
  const isVisibleEnough = (element: Element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const list = (items: string[]) => (items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None visible');
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(isVisibleEnough)
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean)
    .slice(0, 8);
  const actions = Array.from(
    document.querySelectorAll('button, a[role="button"], [role="button"], input[type="button"], input[type="submit"]')
  )
    .filter(isVisibleEnough)
    .map((element) =>
      element instanceof HTMLInputElement ? normalizeText(element.value) || normalizeText(element.getAttribute('aria-label')) : normalizeText(element.textContent)
    )
    .filter(Boolean)
    .slice(0, 8);
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
    .filter(isVisibleEnough)
    .map((element) => {
      if (!(element instanceof HTMLElement)) {
        return '';
      }

      return normalizeText(
        element.getAttribute('aria-label') ??
          element.getAttribute('placeholder') ??
          element.getAttribute('name') ??
          element.getAttribute('id') ??
          element.tagName.toLowerCase()
      );
    })
    .filter(Boolean)
    .slice(0, 8);

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
    list(inputs)
  ].join('\n');
}

async function getActiveTabId(): Promise<number | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return null;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return typeof tab?.id === 'number' ? tab.id : null;
  } catch {
    return null;
  }
}

async function sendMessageToActiveTab<T = unknown>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      return null;
    }

    const tabId = await getActiveTabId();
    if (tabId === null) {
      return null;
    }

    return (await chrome.tabs.sendMessage(tabId, payload)) as T;
  } catch {
    return null;
  }
}

async function extractDebugMarkdownViaScripting(): Promise<string | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
      return null;
    }

    const tabId = await getActiveTabId();
    if (tabId === null) {
      return null;
    }

    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDebugContextFromPage
    });

    return typeof result?.result === 'string' && result.result ? result.result : null;
  } catch {
    return null;
  }
}

async function sendToActiveTab(payload: Record<string, unknown>): Promise<boolean> {
  return (await sendMessageToActiveTab(payload)) !== null;
}

function closeLauncherPopup(): void {
  window.close();
}

async function detectActivePage(): Promise<AwsPage | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.tabs?.sendMessage) {
      return null;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) {
      return null;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'AWS_COPILOT_DETECT_PAGE'
    });

    if (response?.ok && response.page && typeof response.page.kind === 'string') {
      return response.page as AwsPage;
    }

    return null;
  } catch {
    return null;
  }
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function matchesExpectedPage(expectedPage: (typeof s3IamGuide.steps)[number]['expectedPage'], page: AwsPage): boolean {
  if (expectedPage === 'anyAws') {
    return page.kind !== 'notAws';
  }

  return page.kind === expectedPage;
}

export function App() {
  const initialLocale = useMemo(() => detectLocale(), []);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [guideState, setGuideState] = useState(() => createGuideState(s3IamGuide));
  const [started, setStarted] = useState(false);
  const [detectedPage, setDetectedPage] = useState<AwsPage | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugMarkdown, setDebugMarkdown] = useState('');
  const [debugError, setDebugError] = useState('');
  const step = currentStep(s3IamGuide, guideState);
  const values = step.suggestedValues ?? {};
  const policyTemplate = step.policyTemplate ? renderIamPolicyTemplate(step.policyTemplate, values) : null;

  useEffect(() => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local?.get) {
        return;
      }

      chrome.storage.local.get(DEBUG_MODE_STORAGE_KEY, (items) => {
        const storageItems = items as Record<string, unknown> | undefined;
        setDebugMode(Boolean(storageItems?.[DEBUG_MODE_STORAGE_KEY]));
      });
    } catch {
      setDebugMode(false);
    }
  }, []);

  useEffect(() => {
    if (!started) {
      return;
    }

    let cancelled = false;

    void detectActivePage().then((page) => {
      if (!cancelled) {
        setDetectedPage(page);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [started, step.id]);

  const recoveryMessage =
    detectedPage?.kind === 'notAws'
      ? t(locale, 'error.notAws')
      : detectedPage && !matchesExpectedPage(step.expectedPage, detectedPage)
        ? t(locale, 'error.wrongPage')
        : null;

  async function syncGuideOverlay(activeStepIndex: number): Promise<void> {
    const sent = await sendToActiveTab({
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: s3IamGuide.id,
      locale,
      activeStepIndex
    });

    if (sent) {
      closeLauncherPopup();
    }
  }

  async function startGuide(): Promise<void> {
    const initialState = goNext(s3IamGuide, markDone(createGuideState(s3IamGuide), startStepId));
    setStarted(true);
    setGuideState(initialState);
    const sent = await sendToActiveTab({
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: s3IamGuide.id,
      locale
    });

    if (sent) {
      closeLauncherPopup();
    }
  }

  async function advanceGuide(): Promise<void> {
    const nextState = goNext(s3IamGuide, markDone(guideState, step.id));
    setGuideState(nextState);
    await syncGuideOverlay(nextState.activeStepIndex);
  }

  async function updateDebugMode(nextValue: boolean): Promise<void> {
    setDebugMode(nextValue);

    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local?.set) {
        return;
      }

      await chrome.storage.local.set({
        [DEBUG_MODE_STORAGE_KEY]: nextValue
      });
    } catch {
      // Ignore storage failures in the popup.
    }
  }

  async function extractDebugMarkdown(): Promise<void> {
    setDebugError('');

    const response = await sendMessageToActiveTab<{ ok?: boolean; markdown?: string }>({
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT'
    });

    if (response?.ok && response.markdown) {
      setDebugMarkdown(response.markdown);
      return;
    }

    const fallbackMarkdown = await extractDebugMarkdownViaScripting();
    if (fallbackMarkdown) {
      setDebugMarkdown(fallbackMarkdown);
      return;
    }

    setDebugMarkdown('');
    setDebugError('Could not extract debug markdown from the active page.');
  }

  async function copyDebugMarkdown(): Promise<void> {
    if (!debugMarkdown) {
      return;
    }

    await copyToClipboard(debugMarkdown);
  }

  function downloadDebugMarkdown(): void {
    if (!debugMarkdown) {
      return;
    }

    const blob = new Blob([debugMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'debug.md';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="w-[380px] bg-[radial-gradient(circle_at_top,_rgba(255,153,0,0.18),_transparent_38%),linear-gradient(180deg,_#111827_0%,_#0b1220_100%)] p-4 text-slate-50">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                {t(locale, 'app.panelBadge')}
              </p>
              <h1 className="text-3xl font-black leading-none tracking-[-0.04em] text-white">{t(locale, 'app.title')}</h1>
            </div>
            <label className="flex min-w-[120px] flex-col gap-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
              {t(locale, 'language.label')}
              <select
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium tracking-normal text-slate-100 outline-none transition focus:border-amber-400/60"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
              >
                <option value="en">English</option>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            <input
              checked={debugMode}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-400 outline-none"
              type="checkbox"
              onChange={(event) => void updateDebugMode(event.target.checked)}
            />
            Debug mode
          </label>
          <p className="max-w-[28ch] text-sm leading-6 text-slate-300">{t(locale, 'app.panelBody')}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">{t(locale, 'status.localOnly')}</p>
        </div>

        {!started ? (
          <div className="space-y-5 px-5 py-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t(locale, s3IamGuide.titleKey)}</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">{t(locale, 'app.subtitle')}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {s3IamGuide.steps.length} steps. Spotlight guidance anchored to the AWS Console.
              </p>
            </div>
            <button
              type="button"
              className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              onClick={() => void startGuide()}
            >
              {t(locale, 'guide.start')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Step {guideState.activeStepIndex + 1} of {s3IamGuide.steps.length}
              </p>
              <p className="text-xs font-medium text-emerald-300">{t(locale, 'guide.launchStatus')}</p>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-300 transition-[width]"
                style={{
                  width: `${((guideState.activeStepIndex + 1) / s3IamGuide.steps.length) * 100}%`
                }}
              />
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">{t(locale, step.titleKey)}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t(locale, step.bodyKey, values)}</p>
              {recoveryMessage ? (
                <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {recoveryMessage}
                </p>
              ) : null}
              {policyTemplate ? (
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200">
                  {policyTemplate}
                </pre>
              ) : null}
            </section>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={detectedPage?.kind === 'notAws'}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void syncGuideOverlay(guideState.activeStepIndex)}
              >
                {t(locale, 'action.openSpotlight')}
              </button>
              <button
                type="button"
                className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                onClick={() => void advanceGuide()}
              >
                {t(locale, 'action.next')}
              </button>
            </div>

            {policyTemplate ? (
              <button
                type="button"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                onClick={() => void copyToClipboard(policyTemplate)}
              >
                {t(locale, 'action.copyPolicyJson')}
              </button>
            ) : null}

            <button
              type="button"
              className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
              onClick={() => void startGuide()}
            >
              {t(locale, 'guide.restart')}
            </button>
          </div>
        )}
        {debugMode ? (
          <section className="border-t border-white/10 px-5 py-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Debug</h3>
            <div className="mt-3 grid gap-3">
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void extractDebugMarkdown()}
              >
                Extract debug markdown
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!debugMarkdown}
                onClick={() => void copyDebugMarkdown()}
              >
                Copy debug markdown
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!debugMarkdown}
                onClick={() => downloadDebugMarkdown()}
              >
                Download debug.md
              </button>
              {debugError ? (
                <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{debugError}</p>
              ) : null}
              <pre className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200">
                {debugMarkdown || 'No debug markdown yet.'}
              </pre>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
