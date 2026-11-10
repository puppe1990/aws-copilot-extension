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
    <section className="border-t border-[rgba(237,241,248,0.08)] px-5 py-5">
      <h3 className="text-sm font-medium text-[#edf1f8]">Debug</h3>
      <div className="mt-3 grid gap-3">
        <button
          type="button"
          className="rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-transparent px-4 py-3 text-sm font-medium text-[#edf1f8] transition-colors hover:bg-[#161a24] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onExtract}
        >
          Extract debug markdown
        </button>
        <button
          type="button"
          className="rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-transparent px-4 py-3 text-sm font-medium text-[#edf1f8] transition-colors hover:bg-[#161a24] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!debugMarkdown}
          onClick={onCopy}
        >
          Copy debug markdown
        </button>
        <button
          type="button"
          className="rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-transparent px-4 py-3 text-sm font-medium text-[#edf1f8] transition-colors hover:bg-[#161a24] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!debugMarkdown}
          onClick={onDownload}
        >
          Download debug.md
        </button>
        {debugError ? (
          <p className="rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-[#0b0d14] px-3 py-2 text-sm text-[#c4cad8]">
            {debugError}
          </p>
        ) : null}
        <pre className="max-h-56 overflow-auto rounded-[8px] border border-[rgba(237,241,248,0.08)] bg-[#0b0d14] p-4 text-xs leading-6 text-[#edf1f8]">
          {debugMarkdown || 'No debug markdown yet.'}
        </pre>
      </div>
    </section>
  )
}
