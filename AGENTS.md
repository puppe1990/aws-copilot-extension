# AGENTS.md — AWS Copilot Extension

Chrome MV3 extension. Local S3+IAM walkthrough in the AWS Console. No backend.

## Commands

```bash
npm install
npm run ci              # prettier --check + eslint --max-warnings 0 + vitest
npm run check           # ci + tsc --noEmit + vite build + playwright
npx playwright install chromium   # once on a clean machine
```

Load unpacked from `dist/` after `npm run build`. Content script is a separate IIFE build (`vite.content.config.ts`); Chrome cannot inject ESM `import`. Pre-commit: Husky + lint-staged, then `npm test`.

## Code style

- Functions: 4–20 lines. Split if longer.
- Files: under 500 lines (target 200–300). Split by responsibility before adding logic.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`, `utils`.
- Types: explicit. No `any` on public surfaces.
- No duplication. Extract shared logic.
- Early returns. Max 2 indentation levels for control flow.
- Exception messages include the received value and expected shape.
- Formatter is Prettier (`semi: false`, `singleQuote`, `printWidth: 100`). Do not bikeshed style.

## Comments

- Keep WHY / provenance comments. Do not strip them on refactor.
- Write WHY, not WHAT.
- Public functions: intent + one usage example when the contract is non-obvious.

## Tests

- One command: `npm run ci`.
- New function → test. Bugfix → regression test.
- Content-script tests import `handleContentMessage`, `restoreGuideFromStorage`, `resetGuideRuntimeForTests` from `src/content/main.ts` (stable public API; `main.ts` re-exports `guideSession.ts`).
- Sensitive-selector errors must keep the exact string `Refusing to target sensitive AWS fields`.
- F.I.R.S.T. Named fakes over inline stubs for Chrome APIs (`chrome.tabs`, `chrome.storage`, `chrome.scripting`).

## Layout

```
src/content/     content script: detect page, overlay, guide session, debug markdown
src/guides/      panel guide engine + s3IamGuide (i18n keys, language-independent)
src/panel/       React popup: App, idle/active panels, chrome.tabs messaging
src/safety/      assertSafeSelector / assertSafeElement / isExternalUrlAllowed
src/i18n/        en + pt-BR. Every user-facing string in BOTH locale files
tests/browser/   Playwright fixtures
```

## Safety (never violate)

- `isExternalUrlAllowed()` stays `false`. No `fetch`, `XMLHttpRequest`, or `chrome.runtime.sendNativeMessage`.
- No AWS API calls. No credentials. No automatic AWS action — the user confirms.
- Every selector goes through `assertSafeSelector()` before `querySelector`.
- Debug extraction uses `resolveHighlightTargetForDiagnostics` (does not clear the overlay). `resolveHighlightTarget` clears it.
- `extractDebugContextFromPage` in `src/panel/pageDebugMarkdown.ts` is injected via `chrome.scripting.executeScript`. It must close over nothing.

## Guide catalogs

Two catalogs share step ids `objective | bucket | security | iamPolicy | review` and guide id `s3-iam-app-access`:

- `src/guides/s3IamGuide.ts` — panel. Translation keys only.
- `src/content/contentGuideCatalog.ts` — content overlay. Inline `{en, pt-BR}` copy (isolated world, no panel i18n bundle).

Keep S3 ids in lockstep. Do not add Lambda/EC2 workflows, chat, backend, or cloud sync.

In-page Guide (`data-aws-copilot-toolbar`) starts `console-home-intro` (`src/content/consoleHomeIntro.ts`, 20 steps: header chrome, Agent Toolkit banner, then Console Home widgets). Headings are resolved by iterating `h1–h3` inside `main` first, never as CSS selectors, skipping `nav` / overlay / cookie dialog. Home intro recovery is cookies or none — it must not type S3. The popup still starts `s3-iam-app-access`.

## Messages (content script)

`AWS_COPILOT_HIGHLIGHT | START_GUIDE | RENDER_GUIDE_STEP | DETECT_PAGE | EXTRACT_DEBUG_CONTEXT | GET_GUIDE_SNAPSHOT`.

Console `MutationObserver`s take callbacks (`watchForS3ServiceResult(onFound)`). Do not import `guideSession` from `consoleTargets`.

Console Home (`/console/home`) is `consoleHome`. Unified search is `#aws-unified-search-container`. S3 results only inside `#awsc-concierge-dropdown` (never Recently visited). Visible cookie banner `#awsccc-cb-c` is recovery `acceptCookies`. Header button `data-aws-copilot-toolbar` is `position:fixed` on `document.body` (AWS React wipes header children). It sits to the right of `#aws-unified-search-container`. SPA remount re-injects.

## Out of scope

No free-form chat, AWS SDK, backend, cloud sync, extra AWS products.
