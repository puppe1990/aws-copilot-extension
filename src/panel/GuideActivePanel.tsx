import type { GuideState } from '../guides/guideEngine'
import { s3IamGuide, type GuideStep } from '../guides/s3IamGuide'
import type { AwsPage } from '../content/pageDetection'
import type { GuideSnapshot } from '../content/contentGuideCatalog'
import { t, type Locale } from '../i18n'

type GuideActivePanelProps = {
  locale: Locale
  guideState: GuideState
  step: GuideStep
  policyTemplate: string | null
  guideSnapshot: GuideSnapshot | null
  recoveryMessage: string | null
  detectedPage: AwsPage | null
  onSpotlight: () => void
  onNext: () => void
  onCopyPolicy: () => void
  onRestart: () => void
}

export function GuideActivePanel({
  locale,
  guideState,
  step,
  policyTemplate,
  guideSnapshot,
  recoveryMessage,
  detectedPage,
  onSpotlight,
  onNext,
  onCopyPolicy,
  onRestart,
}: GuideActivePanelProps) {
  const values = step.suggestedValues ?? {}

  return (
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
            width: `${((guideState.activeStepIndex + 1) / s3IamGuide.steps.length) * 100}%`,
          }}
        />
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
          {t(locale, step.titleKey)}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{t(locale, step.bodyKey, values)}</p>
        {guideSnapshot?.guideMode === 'active' ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
            <p className="text-sm font-semibold text-white">{guideSnapshot.statusText}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{guideSnapshot.goalText}</p>
          </div>
        ) : null}
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
          onClick={onSpotlight}
        >
          {t(locale, 'action.openSpotlight')}
        </button>
        <button
          type="button"
          className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          onClick={onNext}
        >
          {t(locale, 'action.next')}
        </button>
      </div>

      {policyTemplate ? (
        <button
          type="button"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
          onClick={onCopyPolicy}
        >
          {t(locale, 'action.copyPolicyJson')}
        </button>
      ) : null}

      <button
        type="button"
        className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
        onClick={onRestart}
      >
        {t(locale, 'guide.restart')}
      </button>
    </div>
  )
}
