# Debug Context Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a debug mode in the popup that can extract an LLM-friendly Markdown summary of the active AWS Console DOM context, then preview, copy, or download it.

**Architecture:** Persist a popup-level debug flag in `chrome.storage.local`, expose debug controls only when enabled, and request a new content-script message that returns a deterministic Markdown summary. Keep DOM extraction and wizard-aware diagnostics in the content layer, and keep copy/download behavior local to the popup.

**Tech Stack:** React, TypeScript, Chrome extension messaging, Vitest, Playwright

---

### Task 1: Add popup debug-mode state and storage wiring

**Files:**
- Modify: `src/panel/App.tsx`
- Test: `src/panel/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('shows debug controls only when debug mode is enabled', async () => {
  const get = vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
    callback({ 'awsCopilot.debugMode': true });
  });
  const set = vi.fn();

  vi.stubGlobal('chrome', {
    storage: {
      local: { get, set }
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage: vi.fn().mockResolvedValue({ ok: true, page: { kind: 'awsUnknown' } })
    }
  });

  render(<App />);

  expect(await screen.findByRole('button', { name: 'Extract debug markdown' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy debug markdown' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Download debug.md' })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/panel/App.test.tsx -t "shows debug controls only when debug mode is enabled"`
Expected: FAIL because the popup has no debug-mode storage wiring or controls yet

- [ ] **Step 3: Write minimal implementation**

```tsx
const DEBUG_MODE_STORAGE_KEY = 'awsCopilot.debugMode';

const [debugMode, setDebugMode] = useState(false);
const [debugMarkdown, setDebugMarkdown] = useState('');

useEffect(() => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local?.get) {
    return;
  }

  chrome.storage.local.get(DEBUG_MODE_STORAGE_KEY, (items) => {
    setDebugMode(Boolean(items?.[DEBUG_MODE_STORAGE_KEY]));
  });
}, []);
```

```tsx
async function updateDebugMode(nextValue: boolean): Promise<void> {
  setDebugMode(nextValue);
  chrome.storage?.local?.set?.({ [DEBUG_MODE_STORAGE_KEY]: nextValue });
}
```

```tsx
{debugMode ? (
  <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
    <h3 className="text-sm font-semibold text-white">Debug</h3>
    <div className="mt-3 grid gap-3">
      <button type="button">Extract debug markdown</button>
      <button type="button" disabled={!debugMarkdown}>Copy debug markdown</button>
      <button type="button" disabled={!debugMarkdown}>Download debug.md</button>
    </div>
  </section>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/panel/App.test.tsx -t "shows debug controls only when debug mode is enabled"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/panel/App.tsx src/panel/App.test.tsx
git commit -m "feat: add popup debug mode controls"
```

### Task 2: Add popup extract, copy, and download behavior

**Files:**
- Modify: `src/panel/App.tsx`
- Test: `src/panel/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('extracts debug markdown and enables copy and download actions', async () => {
  const sendMessage = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, page: { kind: 'awsUnknown' } })
    .mockResolvedValueOnce({ ok: true, markdown: '# Debug Context\n\n- URL: https://console.aws.amazon.com/' });

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((_keys: string[] | string, callback: (value: unknown) => void) => {
          callback({ 'awsCopilot.debugMode': true });
        }),
        set: vi.fn()
      }
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 42 }]),
      sendMessage
    }
  });

  render(<App />);

  await userEvent.click(await screen.findByRole('button', { name: 'Extract debug markdown' }));

  expect(sendMessage).toHaveBeenCalledWith(42, { type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT' });
  expect(await screen.findByText('# Debug Context', { exact: false })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy debug markdown' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Download debug.md' })).toBeEnabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/panel/App.test.tsx -t "extracts debug markdown and enables copy and download actions"`
Expected: FAIL because extraction, preview, copy, and download behavior do not exist yet

- [ ] **Step 3: Write minimal implementation**

```tsx
async function extractDebugMarkdown(): Promise<void> {
  const sent = await sendToActiveTab({ type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT' });
}
```

Replace the helper with a response-returning version:

```tsx
async function sendToActiveTab<T = unknown>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.tabs?.sendMessage) {
      return null;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) {
      return null;
    }

    return (await chrome.tabs.sendMessage(tab.id, payload)) as T;
  } catch {
    return null;
  }
}
```

```tsx
async function extractDebugMarkdown(): Promise<void> {
  const response = await sendToActiveTab<{ ok?: boolean; markdown?: string }>({
    type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT'
  });

  setDebugMarkdown(response?.ok && response.markdown ? response.markdown : '');
}
```

```tsx
async function copyDebugMarkdown(): Promise<void> {
  if (!debugMarkdown) return;
  await copyToClipboard(debugMarkdown);
}
```

```tsx
function downloadDebugMarkdown(): void {
  if (!debugMarkdown) return;

  const blob = new Blob([debugMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `aws-copilot-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

```tsx
<pre className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200">
  {debugMarkdown || 'No debug extract yet.'}
</pre>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/panel/App.test.tsx -t "extracts debug markdown and enables copy and download actions"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/panel/App.tsx src/panel/App.test.tsx
git commit -m "feat: add debug markdown extraction actions"
```

### Task 3: Add content-script debug extraction message and Markdown builder

**Files:**
- Modify: `src/content/main.ts`
- Test: `src/content/content.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('extracts wizard-aware debug markdown for the active AWS page', () => {
  document.body.innerHTML = `
    <h1>Create bucket</h1>
    <button>Create bucket</button>
    <input name="bucketName" aria-label="Bucket name" placeholder="amzn-s3-demo-bucket" />
  `;

  const sendResponse = vi.fn();

  handleContentMessage(
    { type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT' },
    'https://s3.console.aws.amazon.com/s3/home?region=us-east-1',
    sendResponse
  );

  expect(sendResponse).toHaveBeenCalledWith(
    expect.objectContaining({
      ok: true,
      markdown: expect.stringContaining('## Page')
    })
  );
  expect(sendResponse).toHaveBeenCalledWith(
    expect.objectContaining({
      ok: true,
      markdown: expect.stringContaining('s3BucketsList')
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/content.test.ts -t "extracts wizard-aware debug markdown for the active AWS page"`
Expected: FAIL because the message type and extractor do not exist yet

- [ ] **Step 3: Write minimal implementation**

Add a helper in `src/content/main.ts`:

```ts
function extractVisibleText(selector: string, limit: number): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>(selector))
    .map((element) => element.innerText.trim())
    .filter(Boolean)
    .slice(0, limit);
}
```

```ts
function selectorStatus(selector: string): string {
  try {
    const count = document.querySelectorAll(selector).length;
    return count === 0 ? 'not found' : count === 1 ? 'single match' : `${count} matches`;
  } catch {
    return 'invalid selector';
  }
}
```

```ts
function buildDebugMarkdown(href: string): string {
  const page = detectAwsPage(href);
  const step = currentStep();
  const headings = extractVisibleText('h1, h2, h3', 8);
  const buttons = extractVisibleText('button, [role="button"], a', 12);
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
    .slice(0, 12)
    .map((input) => `- name=${input.name || '-'} aria=${input.getAttribute('aria-label') || '-'} placeholder=${input.placeholder || '-'}`);

  return [
    '# AWS Copilot Debug Context',
    '',
    '## Page',
    `- URL: ${href}`,
    `- Title: ${document.title || '-'}`,
    `- Detected page: ${page.kind}`,
    '',
    '## Guide',
    `- Active step: ${step?.id ?? 'none'}`,
    `- Highlight selector status: ${step?.highlightSelector ? selectorStatus(step.highlightSelector) : 'none'}`,
    '',
    '## Visible headings',
    ...headings.map((heading) => `- ${heading}`),
    '',
    '## Visible actions',
    ...buttons.map((button) => `- ${button}`),
    '',
    '## Relevant inputs',
    ...(inputs.length > 0 ? inputs : ['- none'])
  ].join('\n');
}
```

Wire it into `handleContentMessage`:

```ts
if (contentMessage?.type === 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT') {
  sendResponse({ ok: true, markdown: buildDebugMarkdown(href) });
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/content.test.ts -t "extracts wizard-aware debug markdown for the active AWS page"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/main.ts src/content/content.test.ts
git commit -m "feat: add content debug context extraction"
```

### Task 4: Expand the extractor with wizard diagnostics and selector summaries

**Files:**
- Modify: `src/content/main.ts`
- Test: `src/content/content.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('includes wizard diagnostics in the debug markdown', () => {
  document.body.innerHTML = '<input aria-label="Search" placeholder="Search" />';
  const sendResponse = vi.fn();

  handleContentMessage(
    {
      type: 'AWS_COPILOT_RENDER_GUIDE_STEP',
      guideId: 's3-iam-app-access',
      locale: 'en',
      activeStepIndex: 1
    },
    'https://console.aws.amazon.com/',
    vi.fn()
  );

  handleContentMessage(
    { type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT' },
    'https://console.aws.amazon.com/',
    sendResponse
  );

  const payload = sendResponse.mock.calls.at(-1)?.[0];
  expect(payload.markdown).toContain('## Wizard diagnostics');
  expect(payload.markdown).toContain('shouldSearchS3: true');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/content.test.ts -t "includes wizard diagnostics in the debug markdown"`
Expected: FAIL because the extractor does not yet emit wizard diagnostics

- [ ] **Step 3: Write minimal implementation**

Extract the guide-state derivation already used in `renderCurrentGuideStep` into a shared helper:

```ts
type GuideDiagnostics = {
  stepId: string | null;
  isExpectedStepPage: boolean;
  isBucketLanding: boolean;
  shouldSearchS3: boolean;
  targetFound: boolean;
  substepsVisible: boolean;
};
```

```ts
function getGuideDiagnostics(): GuideDiagnostics {
  const step = currentStep();
  if (!step || !activeGuideState) {
    return {
      stepId: null,
      isExpectedStepPage: false,
      isBucketLanding: false,
      shouldSearchS3: false,
      targetFound: false,
      substepsVisible: false
    };
  }

  const page = currentAwsPage();
  const bucketFormTarget = step.id === 'bucket' ? resolveBucketFormTarget() : null;
  const isBucketCreateForm = Boolean(bucketFormTarget);
  const isBucketLanding = !isBucketCreateForm && isBucketStepLandingPage(step);
  const isExpectedStepPage = matchesExpectedStepPage(step) || isBucketCreateForm;
  const searchTarget = !isExpectedStepPage && !isBucketLanding && page.kind !== 'notAws' ? resolveAwsSearchTarget() : null;
  const shouldSearchS3 = Boolean(searchTarget);
  const target =
    bucketFormTarget ??
    (isBucketLanding ? resolveCreateBucketButtonTarget() : null) ??
    (step.highlightSelector && isExpectedStepPage ? resolveHighlightTarget(step.highlightSelector) : null);

  return {
    stepId: step.id,
    isExpectedStepPage,
    isBucketLanding,
    shouldSearchS3,
    targetFound: Boolean(target),
    substepsVisible: Boolean(isExpectedStepPage && step.substeps?.[activeLocale]?.length)
  };
}
```

Append it to the Markdown:

```ts
'## Wizard diagnostics',
`- stepId: ${diagnostics.stepId ?? 'none'}`,
`- isExpectedStepPage: ${diagnostics.isExpectedStepPage}`,
`- isBucketLanding: ${diagnostics.isBucketLanding}`,
`- shouldSearchS3: ${diagnostics.shouldSearchS3}`,
`- targetFound: ${diagnostics.targetFound}`,
`- substepsVisible: ${diagnostics.substepsVisible}`,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/content.test.ts -t "includes wizard diagnostics in the debug markdown"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/main.ts src/content/content.test.ts
git commit -m "feat: include wizard diagnostics in debug markdown"
```

### Task 5: Validate the full feature and keep regressions out

**Files:**
- Modify: `src/panel/App.test.tsx`
- Modify: `src/content/content.test.ts`

- [ ] **Step 1: Add focused regression coverage**

```tsx
it('keeps guide start behavior unchanged when debug mode is disabled', async () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: 'Extract debug markdown' })).not.toBeInTheDocument();
});
```

```ts
it('does not include sensitive inputs in debug markdown', () => {
  document.body.innerHTML = '<input type="password" value="secret" /><input name="bucketName" />';
  const sendResponse = vi.fn();

  handleContentMessage(
    { type: 'AWS_COPILOT_EXTRACT_DEBUG_CONTEXT' },
    'https://console.aws.amazon.com/',
    sendResponse
  );

  const payload = sendResponse.mock.calls.at(-1)?.[0];
  expect(payload.markdown).not.toContain('secret');
  expect(payload.markdown).not.toContain('password');
});
```

- [ ] **Step 2: Run the focused tests**

Run: `npm test -- src/panel/App.test.tsx src/content/content.test.ts`
Expected: PASS

- [ ] **Step 3: Run the full verification suite**

Run: `npm run check`
Expected: PASS with typecheck, unit tests, build, and Playwright all green

- [ ] **Step 4: Commit**

```bash
git add src/panel/App.test.tsx src/content/content.test.ts
git commit -m "test: cover debug context extractor regressions"
```

