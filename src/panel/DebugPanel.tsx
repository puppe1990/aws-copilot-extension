type DebugPanelProps = {
  debugMarkdown: string
  debugError: string
  onExtract: () => void
  onCopy: () => void
  onDownload: () => void
}

export function DebugPanel({
  debugMarkdown,
  debugError,
  onExtract,
  onCopy,
  onDownload,
}: DebugPanelProps) {
  return (
    <section className="border-t border-white/10 px-5 py-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Debug</h3>
      <div className="mt-3 grid gap-3">
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onExtract}
        >
          Extract debug markdown
        </button>
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!debugMarkdown}
          onClick={onCopy}
        >
          Copy debug markdown
        </button>
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!debugMarkdown}
          onClick={onDownload}
        >
          Download debug.md
        </button>
        {debugError ? (
          <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {debugError}
          </p>
        ) : null}
        <pre className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200">
          {debugMarkdown || 'No debug markdown yet.'}
        </pre>
      </div>
    </section>
  )
}
