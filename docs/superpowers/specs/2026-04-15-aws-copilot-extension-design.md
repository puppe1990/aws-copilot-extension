# AWS Copilot Extension MVP Design

## Summary

Build a Chrome extension that guides users through a real AWS Console flow: creating an S3 bucket and an IAM least-privilege policy for application access. The MVP is not a general chat agent and does not execute AWS API calls. It is a local, curated, visual guide layered on top of the AWS Console.

The initial target user is technical but not deeply confident in AWS: beginners learning AWS and developers who can code but still get lost in the console or worry about misconfiguring permissions.

## Product Promise

"Create an S3 bucket and IAM policy for an application without opening access too broadly or getting lost in the AWS Console."

The first guided objective is:

- Create an S3 bucket for application file access.
- Keep public access blocked.
- Create an IAM policy scoped to that bucket.
- Review the final configuration with a checklist.
- Support English and Brazilian Portuguese in the extension UI and guide content.

## MVP Scope

The extension runs on AWS Console pages and provides a guided overlay. The user chooses the objective `App access to S3`, then follows a fixed, curated flow.

The flow has five steps:

1. Select objective: app access to S3.
2. Create the S3 bucket with name, region, and baseline safety settings.
3. Confirm key S3 security settings, especially public access blocking.
4. Create an IAM policy granting the minimum required S3 actions for the selected bucket.
5. Review a final checklist and explain what the user should verify next.

The MVP may offer copyable suggestions or assisted field filling, but every meaningful AWS action remains user-confirmed.

The MVP must support two locales:

- `en` for English.
- `pt-BR` for Brazilian Portuguese.

The extension should choose the initial locale from the browser language when possible and provide a manual language switcher in the extension UI. English is the fallback locale when a translation key is missing.

## Explicit Non-Goals

- No free-form chat for arbitrary AWS tasks.
- No automatic AWS resource creation.
- No AWS API integration.
- No credential reading.
- No backend service.
- No cloud sync.
- No support for many AWS workflows in the first version.

Automatic execution can be explored later, after the guided local product proves useful and trustable.

## Trust And Security Rules

The extension must be easy to trust:

- Runs locally in the browser.
- Observes only the AWS Console UI needed for the active flow.
- Does not read AWS credentials, secrets, or access keys.
- Does not call AWS APIs.
- Does not send page content, account data, or user input to an external server.
- Does not click destructive or permission-changing actions automatically.
- Requires explicit user action for AWS confirmations.

These constraints should be visible in product copy and permissions requested by the extension.

## User Experience

The extension exposes a panel or popup where the user chooses a curated task. For the MVP, only one task is required: `Create S3 bucket + IAM policy for app access`.

All user-facing product copy in the panel, overlays, actions, guide steps, recovery states, and final checklist must come from localization files. Internal step IDs, selectors, completion rules, and safety rules must remain language-independent.

When the user starts the task, the extension:

- Detects whether the user is on the expected AWS Console page.
- Shows a concise instruction for the current step.
- Highlights the relevant field, button, or area in the AWS Console.
- Explains why the step matters in practical terms.
- Offers safe suggestions where useful, such as naming guidance or a policy template.
- Lets the user mark a step complete or validates simple page state where feasible.
- Provides recovery instructions if the page does not match the expected state.

The tone should be concrete and procedural. It should not describe itself as magic or promise that it guarantees security.

## Core Components

### Extension Shell

Provides the Chrome extension manifest, browser action, permissions, and page injection rules. It should request only the narrow permissions needed for AWS Console pages.

### Content Script

Runs on AWS Console pages. It detects known page states, applies visual highlights, reads non-sensitive UI state needed for guidance, and optionally fills safe fields when the user explicitly chooses that action.

### Guide Engine

Stores the curated flow as structured step definitions. Each step defines:

- Expected AWS Console URL or page pattern.
- Target UI selector strategy.
- Translation keys for instruction text.
- Translation keys for why the step matters.
- Optional suggested values.
- Completion criteria.
- Translation keys for recovery guidance.

The guide engine should keep behavior separate from copy so the same S3/IAM flow can run in `en` and `pt-BR` without duplicating selectors or state logic.

### Localization Layer

Stores and resolves all user-facing strings for `en` and `pt-BR`. It provides:

- Locale detection from browser settings.
- Manual language selection.
- Fallback to `en` for missing keys.
- A typed or validated key structure so missing translations fail during development.
- Formatting helpers for interpolated values such as bucket names, regions, and policy names.

### Extension Panel

Shows the active step, progress, explanation, suggested values, and actions such as copy suggestion, fill field, mark done, or jump to the required AWS Console page.

### Safety Layer

Enforces rules around no credential capture, no network transmission, and no automatic confirmation of AWS changes. It should also prevent guide steps from targeting sensitive credential fields.

## Data Flow

1. User opens the extension on an AWS Console page.
2. User selects the curated S3/IAM guide.
3. The guide engine activates the first step.
4. The localization layer resolves user-facing copy for the active locale.
5. The content script checks the current page and reports a local state result to the extension panel.
6. The panel renders the instruction and available user actions.
7. If the step has a highlight target, the content script applies a visible overlay around that AWS Console element.
8. The user performs the AWS action manually or uses an assisted fill action.
9. The extension validates simple state where feasible or asks the user to mark the step complete.
10. The guide advances until the final checklist.

No data leaves the browser in the MVP.

## Error And Recovery States

The extension should handle:

- User is not on AWS Console.
- User is on the wrong AWS service page.
- AWS changed the page structure and a selector no longer matches.
- User is in a different AWS region than expected.
- User lacks permission to access S3 or IAM pages.
- The target field or button is hidden behind a collapsed section.
- The user skipped ahead or completed a step outside the expected path.

Recovery messages must explain the current mismatch and give a concrete next action, such as opening a specific AWS Console page or manually confirming that a step is complete.

## Testing Strategy

Initial tests should focus on reliability and trust:

- Unit tests for guide step definitions and state transitions.
- Unit tests for selector matching and fallback behavior where practical.
- Unit tests for locale selection, fallback behavior, and missing translation detection.
- Translation completeness checks for `en` and `pt-BR`.
- Browser tests using local fixture pages that mimic key AWS Console screens.
- Manual verification in Chrome against real AWS Console pages using a non-production AWS account.
- Manual verification of the full S3/IAM guide in both English and Brazilian Portuguese.
- Security checks confirming no external network calls are made by the extension during the guide.

Because AWS Console markup can change, the implementation should avoid brittle selectors where possible and include clear failure states when a target cannot be found.

## Validation Plan

Before building broad automation, validate demand manually:

1. Create a prototype with only the S3/IAM guided flow.
2. Give it to 5-10 beginners or developers who struggle with AWS setup.
3. Watch whether they complete the task faster and with fewer doubts.
4. Ask what they would have searched or asked a senior engineer without the extension.
5. Track whether they would pay for more guided AWS workflows.

Strong validation means users complete the S3/IAM task, trust the extension, and ask for additional AWS workflows.

## Later Phases

Possible next phases:

- Add more curated flows, such as Lambda + API Gateway or EC2 deployment.
- Add a smart checklist mode for more experienced developers.
- Add local explanations that adapt to beginner or developer level.
- Add optional automation for low-risk actions.
- Explore AWS API integration only with explicit authentication, audit logs, and narrow permissions.
