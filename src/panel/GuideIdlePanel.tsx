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
    <div className="space-y-5 px-5 py-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {t(locale, s3IamGuide.titleKey)}
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
          {t(locale, 'app.subtitle')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {s3IamGuide.steps.length} steps. Spotlight guidance anchored to the AWS Console.
        </p>
        {guideSnapshot?.guideMode === 'not_started' ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
            <p className="text-sm font-semibold text-white">{guideSnapshot.statusText}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{guideSnapshot.goalText}</p>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        onClick={onStart}
      >
        {t(locale, 'guide.start')}
      </button>
    </div>
  )
}
