import { useEffect, useMemo, useState } from 'react';
import { createGuideState, currentStep, goNext, markDone } from '../guides/guideEngine';
import { renderIamPolicyTemplate, s3IamGuide } from '../guides/s3IamGuide';
import type { AwsPage } from '../content/pageDetection';
import { detectLocale, type Locale, t } from '../i18n';

async function sendHighlight(selector: string): Promise<boolean> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.tabs?.sendMessage) {
      return false;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) {
      return false;
    }

    await chrome.tabs.sendMessage(tab.id, {
      type: 'AWS_COPILOT_HIGHLIGHT',
      selector
    });

    return true;
  } catch {
    return false;
  }
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
  const step = currentStep(s3IamGuide, guideState);
  const values = step.suggestedValues ?? {};
  const [detectedPage, setDetectedPage] = useState<AwsPage | null>(null);

  useEffect(() => {
    let cancelled = false;

    void detectActivePage().then((page) => {
      if (!cancelled) {
        setDetectedPage(page);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [step.id]);

  const recoveryMessage =
    detectedPage?.kind === 'notAws'
      ? t(locale, 'error.notAws')
      : detectedPage && !matchesExpectedPage(step.expectedPage, detectedPage)
        ? t(locale, 'error.wrongPage')
        : null;
  const canHighlight = Boolean(step.highlightSelector) && recoveryMessage === null;
  const policyTemplate = step.policyTemplate ? renderIamPolicyTemplate(step.policyTemplate, values) : null;

  return (
    <main>
      <label>
        {t(locale, 'language.label')}
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </label>
      <h1>{t(locale, 'app.title')}</h1>
      <p>{t(locale, 'status.localOnly')}</p>
      <section>
        <p>
          Step {guideState.activeStepIndex + 1} of {s3IamGuide.steps.length}
        </p>
        <h2>{t(locale, step.titleKey)}</h2>
        <p>{t(locale, step.bodyKey, values)}</p>
        {recoveryMessage ? <p>{recoveryMessage}</p> : null}
        {policyTemplate ? <pre>{policyTemplate}</pre> : null}
        {policyTemplate ? (
          <button type="button" onClick={() => void copyToClipboard(policyTemplate)}>
            {t(locale, 'action.copyPolicyJson')}
          </button>
        ) : null}
        {step.highlightSelector ? (
          <button
            type="button"
            disabled={!canHighlight}
            onClick={() => {
              if (canHighlight) {
                void sendHighlight(step.highlightSelector!);
              }
            }}
          >
            {t(locale, 'action.highlightField')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setGuideState((state) => goNext(s3IamGuide, markDone(state, step.id)));
          }}
        >
          {t(locale, 'action.done')}
        </button>
      </section>
    </main>
  );
}
