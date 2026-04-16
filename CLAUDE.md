# AWS Copilot Extension

Chrome MV3 extension. Guides users through AWS Console tasks locally. No backend, no AWS API calls, no external network requests.

## MVP Goal

Guide user through: Create S3 bucket + IAM least-privilege policy for app access. Two locales: `en` and `pt-BR`.

## Tech Stack

- TypeScript (strict)
- React 19 + Vite (MV3 popup)
- Vitest + Testing Library (unit tests)
- Playwright (browser fixture tests)
- Chrome Manifest V3

## Architecture

```
src/
  panel/          # React popup UI (App.tsx)
  content/        # Content script injected into AWS Console
    main.ts       # Entry, message listener
    highlight.ts  # Visual overlay on AWS elements
    pageDetection.ts  # Detect which AWS service page
  guides/
    s3IamGuide.ts     # Step definitions (language-independent)
    guideEngine.ts    # State machine (index, completedStepIds)
  i18n/
    index.ts          # detectLocale(), t(), translationKeys()
    locales/en.ts
    locales/pt-BR.ts
  safety/
    safetyRules.ts    # assertSafeSelector(), isExternalUrlAllowed()
  test/setup.ts
public/manifest.json
tests/
  fixtures/       # Local HTML mimicking AWS Console pages
  browser/        # Playwright specs
```

## Commands

```bash
npm run dev          # Dev server (popup UI only)
npm run build        # Build to dist/
npm run test         # Vitest unit tests
npm run test:watch   # Vitest watch mode
npm run typecheck    # tsc --noEmit
npm run test:browser # Playwright browser tests
npm run check        # typecheck + test + build + test:browser
```

## Load Extension in Chrome

1. `npm run build`
2. `chrome://extensions` → Enable Developer Mode
3. Load unpacked → select `dist/`

Use non-production AWS account for manual testing.

## Key Constraints

**Safety rules (never violate):**
- No external network calls from the extension
- No reading AWS credentials, secrets, or access keys
- No automatic AWS action confirmation — user confirms every meaningful action
- `assertSafeSelector()` blocks any selector targeting credential/password/token fields
- `isExternalUrlAllowed()` always returns `false` in MVP

**Guide behavior:**
- Step definitions in `s3IamGuide.ts` are language-independent (selectors, IDs, page patterns)
- All user-facing copy uses translation keys resolved via `t(locale, key, values?)`
- Fallback: missing `pt-BR` key falls back to `en`

**i18n:**
- `translationKeys('pt-BR')` must equal `translationKeys('en')` — enforced by test
- New strings require entries in both `en.ts` and `pt-BR.ts`

**Testing:**
- Unit tests: guide state, i18n, content highlighting, safety rules
- Browser tests: Playwright against local fixture pages (not real AWS)
- Manual verification against real AWS Console required before release

## File Conventions

- Guide step IDs: `'objective' | 'bucket' | 'security' | 'iamPolicy' | 'review'`
- Message types from panel → content: `AWS_COPILOT_HIGHLIGHT`, `AWS_COPILOT_DETECT_PAGE`
- Highlight overlay attribute: `data-aws-copilot-highlight`
- Host permission: `https://*.console.aws.amazon.com/*` only
