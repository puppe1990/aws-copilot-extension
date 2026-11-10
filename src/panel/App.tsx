import { useEffect, useMemo, useState } from 'react'
import { createGuideState, currentStep, goNext, markDone } from '../guides/guideEngine'
import { renderIamPolicyTemplate, s3IamGuide } from '../guides/s3IamGuide'
import { matchesExpectedPage, type GuideSnapshot } from '../content/contentGuideCatalog'
import type { AwsPage } from '../content/pageDetection'
import { detectLocale, type Locale, t } from '../i18n'
import { DebugPanel } from './DebugPanel'
import { GuideActivePanel } from './GuideActivePanel'
import { GuideIdlePanel } from './GuideIdlePanel'
import {
  closeLauncherPopup,
  copyToClipboard,
  detectActivePage,
  extractDebugMarkdownViaScripting,
  getGuideSnapshot,
  sendMessageToActiveTab,
  sendToActiveTab,
} from './chromeTabMessaging'

const DEBUG_MODE_STORAGE_KEY = 'awsCopilot.debugMode'
const startStepId = 'objective'

export function App() {
  const initialLocale = useMemo(() => detectLocale(), [])
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [guideState, setGuideState] = useState(() => createGuideState(s3IamGuide))
  const [started, setStarted] = useState(false)
  const [detectedPage, setDetectedPage] = useState<AwsPage | null>(null)
  const [guideSnapshot, setGuideSnapshot] = useState<GuideSnapshot | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [debugMarkdown, setDebugMarkdown] = useState('')
  const [debugError, setDebugError] = useState('')
  const step = currentStep(s3IamGuide, guideState)
  const values = step.suggestedValues ?? {}
  const policyTemplate = step.policyTemplate
    ? renderIamPolicyTemplate(step.policyTemplate, values)
    : null

  useEffect(() => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local?.get) {
        return
      }
      chrome.storage.local.get(DEBUG_MODE_STORAGE_KEY, (items) => {
        const storageItems = items as Record<string, unknown> | undefined
        setDebugMode(Boolean(storageItems?.[DEBUG_MODE_STORAGE_KEY]))
      })
    } catch {
      setDebugMode(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void getGuideSnapshot().then((snapshot) => {
      if (!cancelled) {
        setGuideSnapshot(snapshot)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!started) {
      return
    }
    let cancelled = false
    void detectActivePage().then((page) => {
      if (!cancelled) {
        setDetectedPage(page)
      }
    })
    void getGuideSnapshot().then((snapshot) => {
      if (!cancelled) {
        setGuideSnapshot(snapshot)
      }
    })
    return () => {
      cancelled = true
    }
  }, [started, step.id])

  const recoveryMessage =
    detectedPage?.kind === 'notAws'
      ? t(locale, 'error.notAws')
      : detectedPage && !matchesExpectedPage(step.expectedPage, detectedPage)
        ? t(locale, 'error.wrongPage')
        : null

  async function syncGuideOverlay(activeStepIndex: number): Promise<void> {
    const sent = await sendToActiveTab({
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: s3IamGuide.id,
      locale,
      activeStepIndex,
    })
    if (sent) {
      closeLauncherPopup()
    }
  }

  async function startGuide(): Promise<void> {
    const initialState = goNext(s3IamGuide, markDone(createGuideState(s3IamGuide), startStepId))
    setStarted(true)
    setGuideState(initialState)
    const sent = await sendToActiveTab({
      type: 'AWS_COPILOT_START_GUIDE',
      guideId: s3IamGuide.id,
      locale,
    })
    if (sent) {
      const snapshot = await getGuideSnapshot()
      setGuideSnapshot(snapshot)
      closeLauncherPopup()
    }
  }

  async function advanceGuide(): Promise<void> {
    const nextState = goNext(s3IamGuide, markDone(guideState, step.id))
    setGuideState(nextState)
    await syncGuideOverlay(nextState.activeStepIndex)
  }

  async function updateDebugMode(nextValue: boolean): Promise<void> {
    setDebugMode(nextValue)
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local?.set) {
        return
      }
      await chrome.storage.local.set({
        [DEBUG_MODE_STORAGE_KEY]: nextValue,
      })
    } catch {
      // Ignore storage failures in the popup.
    }
  }

  async function extractDebugMarkdown(): Promise<void> {
    setDebugError('')
    const response = await sendMessageToActiveTab<{ ok?: boolean; markdown?: string }>({
      type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT',
    })
    if (response?.ok && response.markdown) {
      setDebugMarkdown(response.markdown)
      return
    }
    const fallbackMarkdown = await extractDebugMarkdownViaScripting()
    if (fallbackMarkdown) {
      setDebugMarkdown(fallbackMarkdown)
      return
    }
    setDebugMarkdown('')
    setDebugError('Could not extract debug markdown from the active page.')
  }

  async function copyDebugMarkdown(): Promise<void> {
    if (!debugMarkdown) {
      return
    }
    await copyToClipboard(debugMarkdown)
  }

  function downloadDebugMarkdown(): void {
    if (!debugMarkdown) {
      return
    }
    const blob = new Blob([debugMarkdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'debug.md'
    anchor.click()
    URL.revokeObjectURL(url)
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
              <h1 className="text-3xl font-black leading-none tracking-[-0.04em] text-white">
                {t(locale, 'app.title')}
              </h1>
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
          <p className="max-w-[28ch] text-sm leading-6 text-slate-300">
            {t(locale, 'app.panelBody')}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">{t(locale, 'status.localOnly')}</p>
        </div>

        {started ? (
          <GuideActivePanel
            locale={locale}
            guideState={guideState}
            step={step}
            policyTemplate={policyTemplate}
            guideSnapshot={guideSnapshot}
            recoveryMessage={recoveryMessage}
            detectedPage={detectedPage}
            onSpotlight={() => void syncGuideOverlay(guideState.activeStepIndex)}
            onNext={() => void advanceGuide()}
            onCopyPolicy={() => void copyToClipboard(policyTemplate ?? '')}
            onRestart={() => void startGuide()}
          />
        ) : (
          <GuideIdlePanel
            locale={locale}
            guideSnapshot={guideSnapshot}
            onStart={() => void startGuide()}
          />
        )}
        {debugMode ? (
          <DebugPanel
            debugMarkdown={debugMarkdown}
            debugError={debugError}
            onExtract={() => void extractDebugMarkdown()}
            onCopy={() => void copyDebugMarkdown()}
            onDownload={downloadDebugMarkdown}
          />
        ) : null}
      </section>
    </main>
  )
}
