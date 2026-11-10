# Debug Context Extractor Design

## Goal

Add a debug mode behind a persistent flag in the extension popup. When enabled, the popup exposes a DOM context extractor that produces a concise Markdown summary suitable for pasting into an LLM. The user can preview, copy, or download the summary.

## Scope

This change adds:

- A persistent `debugMode` flag stored in `chrome.storage.local`
- A debug section in the popup, shown only when the flag is enabled
- A popup action that requests page context from the content script
- A content-script extractor that summarizes the active AWS Console page in Markdown
- Copy-to-clipboard and download-as-file actions for the generated Markdown

This change does not add:

- Raw full-page HTML dumps
- Background worker persistence or external uploads
- A generic inspector for arbitrary sites outside the current extension model

## User Experience

### Popup

The popup keeps its existing guide UI. A debug toggle is added near the language or utility controls.

When debug mode is off:

- No extractor UI is shown

When debug mode is on:

- A `Debug` section appears in the popup
- The section includes:
  - `Extract debug markdown`
  - `Copy debug markdown`
  - `Download debug.md`
  - A scrollable preview area

The popup does not auto-close on debug extraction.

### Output Shape

The extracted Markdown is optimized for LLM troubleshooting. It includes:

1. URL
2. Page title
3. Detected AWS page kind
4. Wizard state summary, when available
5. Overlay diagnostics derived from the current guide logic
6. Visible headings
7. Visible buttons and links relevant to navigation
8. Relevant input fields (`name`, `aria-label`, `placeholder`)
9. Target selector diagnostics for the current step
10. A short visible-text excerpt around the likely target area

The extractor should prefer concise summaries over exhaustive dumps.

## Architecture

### Popup responsibilities

- Read and persist `awsCopilot.debugMode`
- Request extraction from the active tab via `chrome.tabs.sendMessage`
- Store preview text in popup state
- Support copy and download actions locally in the popup

### Content script responsibilities

- Handle a new message type: `AWS_COPILOT_EXTRACT_DEBUG_CONTEXT`
- Reuse existing helpers where possible:
  - `detectAwsPage`
  - current guide state restoration/storage helpers
  - step/selector logic already used by `renderCurrentGuideStep`
- Return structured data or prebuilt Markdown

Recommended approach: return prebuilt Markdown from the content script, because it already owns the DOM context and wizard heuristics.

## Data Model

### Storage key

- `awsCopilot.debugMode: boolean`

### Message contract

Request:

```ts
{
  type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT'
}
```

Response:

```ts
{
  ok: true,
  markdown: string
}
```

Failure:

```ts
{
  ok: false,
  error: string
}
```

## Extraction Rules

The extractor should gather:

- `window.location.href`
- `document.title`
- `detectAwsPage(window.location.href)`
- active guide storage payload, if present
- current step inferred from guide state or URL
- selector checks for the current step:
  - highlight selector
  - bucket form selector
  - create bucket button
  - AWS search selector
- current overlay-related booleans:
  - `isExpectedStepPage`
  - `isBucketLanding`
  - `shouldSearchS3`
  - `target found`
  - `substeps visible`
- visible headings (`h1`, `h2`, `h3`)
- visible buttons/links matching navigation relevance
- relevant form fields

The extractor must avoid sensitive fields and never include passwords, secret values, or field values from sensitive inputs.

## Error Handling

If no content script is available in the active tab:

- Popup shows a compact failure state
- Copy/download actions stay disabled

If extraction succeeds but parts are unavailable:

- Markdown should include explicit `not found` markers instead of omitting sections silently

## Testing

### Unit tests

- Popup:
  - debug mode toggle persistence
  - extraction response preview rendering
  - copy/download button state

- Content script:
  - returns Markdown for a known AWS page
  - includes page kind and URL
  - includes selector diagnostics
  - redacts or omits sensitive fields

### Regression goal

The extractor must not change existing guide behavior, overlay rendering, or step progression.

## Implementation Notes

- Keep the extractor logic in a dedicated helper within the content layer rather than expanding `handleContentMessage` inline too much
- Keep the Markdown deterministic so tests can assert meaningful sections
- Use a plain text download blob in the popup for `debug.md`
