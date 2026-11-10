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
        <p className="text-xs font-medium text-[#8b93a7]">
          Step {guideState.activeStepIndex + 1} of {s3IamGuide.steps.length}
        </p>
        <p className="text-xs font-medium text-[#8b93a7]">{t(locale, 'guide.launchStatus')}</p>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-[#161a24]">
        <div
          className="h-full rounded-full bg-[#ff9900] transition-[width]"
          style={{
            width: `${((guideState.activeStepIndex + 1) / s3IamGuide.steps.length) * 100}%`,
          }}
        />
      </div>

      <section className="rounded-[12px] border border-[rgba(237,241,248,0.08)] bg-[#161a24] p-4">
        <h2 className="text-lg font-medium leading-snug text-[#edf1f8]">
          {t(locale, step.titleKey)}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#c4cad8]">{t(locale, step.bodyKey, values)}</p>
        {guideSnapshot?.guideMode === 'active' ? (
          <div className="mt-4 rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-[#0b0d14] p-3">
            <p className="text-sm font-medium text-[#edf1f8]">{guideSnapshot.statusText}</p>
            <p className="mt-1 text-sm leading-6 text-[#c4cad8]">{guideSnapshot.goalText}</p>
          </div>
        ) : null}
        {recoveryMessage ? (
          <p className="mt-4 rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-[#0b0d14] px-3 py-2 text-sm text-[#c4cad8]">
            {recoveryMessage}
          </p>
        ) : null}
        {policyTemplate ? (
          <pre className="mt-4 overflow-x-auto rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-[#0b0d14] p-4 text-xs leading-6 text-[#edf1f8]">
            {policyTemplate}
          </pre>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={detectedPage?.kind === 'notAws'}
          className="rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-transparent px-4 py-3 text-sm font-medium text-[#edf1f8] transition-colors hover:bg-[#161a24] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSpotlight}
        >
          {t(locale, 'action.openSpotlight')}
        </button>
        <button
          type="button"
          className="rounded-[8px] bg-[#ff9900] px-4 py-3 text-sm font-medium text-[#0b0d14] transition-colors hover:bg-[#ffb84d]"
          onClick={onNext}
        >
          {t(locale, 'action.next')}
        </button>
      </div>

      {policyTemplate ? (
        <button
          type="button"
          className="w-full rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-transparent px-4 py-3 text-sm font-medium text-[#edf1f8] transition-colors hover:bg-[#161a24]"
          onClick={onCopyPolicy}
        >
          {t(locale, 'action.copyPolicyJson')}
        </button>
      ) : null}

      <button
        type="button"
        className="w-full rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-transparent px-4 py-3 text-sm font-medium text-[#8b93a7] transition-colors hover:text-[#edf1f8]"
        onClick={onRestart}
      >
        {t(locale, 'guide.restart')}
      </button>
    </div>
  )
}
