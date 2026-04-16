import { useMemo, useState } from 'react';
import { createGuideState, currentStep, goNext, markDone } from '../guides/guideEngine';
import { s3IamGuide } from '../guides/s3IamGuide';
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

export function App() {
  const initialLocale = useMemo(() => detectLocale(), []);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [guideState, setGuideState] = useState(() => createGuideState(s3IamGuide));
  const step = currentStep(s3IamGuide, guideState);
  const values = step.suggestedValues ?? {};

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
        {step.highlightSelector ? (
          <button type="button" onClick={() => void sendHighlight(step.highlightSelector!)}>
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
