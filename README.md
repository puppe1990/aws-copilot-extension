# AWS Copilot Extension

Chrome MV3 extension that locally guides users through AWS Console tasks.

## MVP

The first guide helps a user create:

- an S3 bucket for application access;
- safe baseline S3 settings;
- an IAM least-privilege policy scoped to that bucket.

## Trust Model

The MVP runs locally in the browser.

- No backend.
- No AWS API calls.
- No credential reading.
- No page content sent to servers.
- User confirms every meaningful AWS action.

## Languages

The extension supports:

- English (`en`);
- Brazilian Portuguese (`pt-BR`).

The initial language follows the browser language when possible, and the user can switch languages manually.

## Development

Install dependencies:

```bash
npm install
```

Install Playwright browser binaries on a fresh machine if needed:

```bash
npx playwright install chromium
```

Run checks:

```bash
npm run check
```

Build the extension:

```bash
npm run build
```

Load `dist/` in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Load unpacked".
4. Select this project's `dist/` folder.

Use a non-production AWS account for manual testing.
