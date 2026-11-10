import { s3IamGuide } from '../guides/s3IamGuide'
import type { GuideSnapshot } from '../content/contentGuideCatalog'
import { t, type Locale } from '../i18n'

type GuideIdlePanelProps = {
  locale: Locale
  guideSnapshot: GuideSnapshot | null
  onStart: () => void
}

export function GuideIdlePanel({ locale, guideSnapshot, onStart }: GuideIdlePanelProps) {
  return (
    <div className="space-y-4 px-5 py-5">
      <div className="rounded-[12px] border border-[rgba(237,241,248,0.08)] bg-[#161a24] p-4">
        <p className="text-xs font-medium text-[#8b93a7]">{t(locale, s3IamGuide.titleKey)}</p>
        <h2 className="mt-2 text-lg font-medium leading-snug text-[#edf1f8]">
          {t(locale, 'app.subtitle')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#c4cad8]">
          {t(locale, 'guide.idleSteps', { count: String(s3IamGuide.steps.length) })}
        </p>
        {guideSnapshot?.guideMode === 'not_started' ? (
          <div className="mt-4 rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-[#0b0d14] p-3">
            <p className="text-sm font-medium text-[#edf1f8]">{guideSnapshot.statusText}</p>
            <p className="mt-1 text-sm leading-6 text-[#c4cad8]">{guideSnapshot.goalText}</p>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="w-full rounded-[8px] bg-[#ff9900] px-4 py-3 text-sm font-medium text-[#0b0d14] transition-colors hover:bg-[#ffb84d]"
        onClick={onStart}
      >
        {t(locale, 'guide.start')}
      </button>
    </div>
  )
}
