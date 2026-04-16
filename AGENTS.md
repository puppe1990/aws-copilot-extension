# AGENTS.md — AWS Copilot Extension

Instructions for agentic workers executing tasks in this repo.

## Required Skills

Before implementing any task, invoke:
- `superpowers:executing-plans` when following the implementation plan
- `superpowers:test-driven-development` when implementing features
- `superpowers:subagent-driven-development` for parallel task execution

## Implementation Plan

Full plan: `docs/superpowers/plans/2026-04-15-aws-copilot-extension.md`
Spec: `docs/superpowers/specs/2026-04-15-aws-copilot-extension-design.md`

Tasks execute in order (each depends on prior):
1. Project Scaffold
2. Manifest And Build Output
3. Localization Layer
4. Guide Engine And S3/IAM Steps
5. Content Script Page Detection And Highlights
6. Safety Rules
7. Panel To Content Script Integration
8. Browser Fixtures And Flow Checks
9. README And Final Verification

## Verification Gates

After each task, run the check specified in the plan step before committing. Never commit failing tests.

Full suite: `npm run check` (typecheck + unit tests + build + browser tests).

## Absolute Rules For Agents

**Never violate these:**

1. No external network calls — `isExternalUrlAllowed()` returns `false`, keep it that way
2. No credential selectors in guide steps — all selectors pass through `assertSafeSelector()`
3. No AWS API calls anywhere in the extension code
4. No automatic AWS action — user must confirm every meaningful AWS operation
5. Every new user-facing string needs entries in both `src/i18n/locales/en.ts` AND `src/i18n/locales/pt-BR.ts`
6. Guide step definitions (`s3IamGuide.ts`) stay language-independent — no hardcoded strings, only translation keys

## TDD Workflow

Follow the plan's TDD sequence per task:
1. Write failing test first
2. Run test, verify it fails
3. Implement to make it pass
4. Run test, verify it passes
5. Commit

## Safety Check Before Commit

Before any commit involving `highlight.ts` or new guide steps:
- Confirm `assertSafeSelector()` wraps all selector usage
- Confirm no `fetch()`, `XMLHttpRequest`, or `chrome.runtime.sendNativeMessage()` added
- Confirm no credential-related field selectors in `s3IamGuide.ts`

## Scope Control

Do not implement beyond MVP spec:
- No free-form chat
- No AWS API integration
- No backend
- No cloud sync
- No additional AWS workflows (Lambda, EC2, etc.)

These are explicitly deferred to later phases.

## Commit Style

```bash
git commit -m "feat: <what>"   # new capability
git commit -m "test: <what>"   # tests only
git commit -m "fix: <what>"    # bug fix
git commit -m "docs: <what>"   # docs only
```

Follow commit sequence from the plan (one commit per task).
