# AWS Copilot Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension MVP that locally guides users through creating an S3 bucket and IAM least-privilege policy, with English and Brazilian Portuguese UI.

**Architecture:** Use a Vite + React + TypeScript extension app. Keep guide behavior in language-independent step definitions, copy in locale dictionaries, page interaction in a content script, and safety rules in a shared guard module. The MVP has no backend, no AWS API calls, and no external network calls.

**Tech Stack:** TypeScript, React, Vite, Chrome Manifest V3, Vitest, Testing Library, Playwright fixtures for browser-level checks.

---

## File Structure

- Create `package.json`: npm scripts and dependencies.
- Create `tsconfig.json`: strict TypeScript project settings.
- Create `vite.config.ts`: builds popup and content script into `dist/`.
- Create `index.html`: extension panel HTML entry.
- Create `public/manifest.json`: Chrome MV3 manifest with AWS Console host permissions only.
- Create `src/panel/main.tsx`: React entrypoint.
- Create `src/panel/App.tsx`: extension panel UI shell.
- Create `src/panel/App.test.tsx`: panel behavior tests.
- Create `src/test/setup.ts`: Vitest DOM matcher setup.
- Create `src/content/main.ts`: AWS Console content script entrypoint.
- Create `src/content/highlight.ts`: highlight overlay rendering and cleanup.
- Create `src/content/pageDetection.ts`: AWS Console page detection helpers.
- Create `src/content/content.test.ts`: content script behavior tests.
- Create `src/guides/s3IamGuide.ts`: S3/IAM guide step definitions.
- Create `src/guides/guideEngine.ts`: active guide state machine.
- Create `src/guides/guideEngine.test.ts`: guide state tests.
- Create `src/i18n/locales/en.ts`: English strings.
- Create `src/i18n/locales/pt-BR.ts`: Brazilian Portuguese strings.
- Create `src/i18n/index.ts`: locale resolution, fallback, interpolation.
- Create `src/i18n/i18n.test.ts`: localization tests.
- Create `src/safety/safetyRules.ts`: local-only safety assertions.
- Create `src/safety/safetyRules.test.ts`: safety tests.
- Create `tests/fixtures/aws-console-s3.html`: local S3 fixture page.
- Create `tests/fixtures/aws-console-iam.html`: local IAM fixture page.
- Create `tests/browser/extension-flow.spec.ts`: Playwright fixture-based flow checks.
- Create `playwright.config.ts`: browser test config.
- Create `README.md`: local setup and extension loading instructions.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/panel/main.tsx`
- Create: `src/panel/App.tsx`
- Create: `src/panel/App.test.tsx`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create package metadata and scripts**

Write `package.json`:

```json
{
  "name": "aws-copilot-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.2.0",
    "@types/chrome": "^0.0.300",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["chrome", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 3: Create Vite config**

Write `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'index.html'),
      content: resolve(__dirname, 'src/content/main.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts']
  }
});
```

- [ ] **Step 4: Create test setup**

Write `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Create panel HTML and initial React app**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AWS Copilot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/panel/main.tsx"></script>
  </body>
</html>
```

Write `src/panel/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Write `src/panel/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>AWS Copilot</h1>
      <p>Create an S3 bucket and IAM policy for app access.</p>
    </main>
  );
}
```

- [ ] **Step 6: Write first panel test**

Write `src/panel/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the extension name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'AWS Copilot' })).toBeInTheDocument();
});
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 8: Run scaffold checks**

Run: `npm run typecheck && npm run test`

Expected: TypeScript passes and `App.test.tsx` passes.

- [ ] **Step 9: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/test/setup.ts src/panel/main.tsx src/panel/App.tsx src/panel/App.test.tsx
git commit -m "feat: scaffold extension app"
```

---

### Task 2: Manifest And Build Output

**Files:**
- Create: `public/manifest.json`
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Create manifest**

Write `public/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "AWS Copilot",
  "version": "0.1.0",
  "description": "Local guided walkthroughs for AWS Console tasks.",
  "action": {
    "default_title": "AWS Copilot",
    "default_popup": "index.html"
  },
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["https://*.console.aws.amazon.com/*"],
  "content_scripts": [
    {
      "matches": ["https://*.console.aws.amazon.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: Configure Vite to copy manifest**

Modify `vite.config.ts` to include `publicDir: 'public'`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content/main.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts']
  }
});
```

- [ ] **Step 3: Add content entry stub**

Write `src/content/main.ts`:

```ts
console.info('[AWS Copilot] content script loaded');
```

- [ ] **Step 4: Build and inspect output**

Run: `npm run build`

Expected: `dist/manifest.json`, `dist/index.html`, and `dist/content.js` exist.

- [ ] **Step 5: Commit manifest**

```bash
git add public/manifest.json vite.config.ts src/content/main.ts
git commit -m "feat: add chrome extension manifest"
```

---

### Task 3: Localization Layer

**Files:**
- Create: `src/i18n/locales/en.ts`
- Create: `src/i18n/locales/pt-BR.ts`
- Create: `src/i18n/index.ts`
- Create: `src/i18n/i18n.test.ts`
- Modify: `src/panel/App.tsx`

- [ ] **Step 1: Write failing localization tests**

Write `src/i18n/i18n.test.ts`:

```ts
import { detectLocale, t, translationKeys } from './index';

it('detects pt-BR from browser language', () => {
  expect(detectLocale(['pt-BR', 'en-US'])).toBe('pt-BR');
});

it('detects en as fallback for unsupported language', () => {
  expect(detectLocale(['fr-FR'])).toBe('en');
});

it('falls back to English when a locale key is missing', () => {
  expect(t('pt-BR', 'app.title')).toBe('AWS Copilot');
});

it('interpolates values in localized strings', () => {
  expect(t('en', 'guide.s3Iam.stepBucketName.body', { bucketName: 'my-app-uploads' })).toContain('my-app-uploads');
});

it('has matching translation keys for en and pt-BR', () => {
  expect(translationKeys('pt-BR')).toEqual(translationKeys('en'));
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/i18n/i18n.test.ts`

Expected: FAIL because `src/i18n/index.ts` does not exist.

- [ ] **Step 3: Add locale dictionaries**

Write `src/i18n/locales/en.ts`:

```ts
export const en = {
  'app.title': 'AWS Copilot',
  'app.subtitle': 'Create an S3 bucket and IAM policy for app access.',
  'language.label': 'Language',
  'guide.start': 'Start guide',
  'guide.s3Iam.title': 'S3 bucket + IAM policy',
  'guide.s3Iam.stepObjective.title': 'Choose the objective',
  'guide.s3Iam.stepObjective.body': 'This guide creates app access to S3 without opening the bucket publicly.',
  'guide.s3Iam.stepBucketName.title': 'Create the bucket',
  'guide.s3Iam.stepBucketName.body': 'Use a globally unique bucket name such as {bucketName}. Do not include secrets or customer data in the name.',
  'guide.s3Iam.stepSecurity.title': 'Keep public access blocked',
  'guide.s3Iam.stepSecurity.body': 'Block public access unless you have a specific reviewed reason to make objects public.',
  'guide.s3Iam.stepIamPolicy.title': 'Create a least-privilege IAM policy',
  'guide.s3Iam.stepIamPolicy.body': 'Scope the policy to this bucket and only the S3 actions your app needs.',
  'guide.s3Iam.stepReview.title': 'Review the result',
  'guide.s3Iam.stepReview.body': 'Confirm the bucket is private and the IAM policy references only the intended bucket.',
  'action.copy': 'Copy suggestion',
  'action.fill': 'Fill field',
  'action.done': 'Mark done',
  'status.localOnly': 'Runs locally. No AWS API calls. No data sent to servers.',
  'error.notAws': 'Open the AWS Console to use this guide.',
  'error.wrongPage': 'This step needs a different AWS Console page.'
} as const;
```

Write `src/i18n/locales/pt-BR.ts`:

```ts
import type { TranslationKeyMap } from '../index';

export const ptBR: TranslationKeyMap = {
  'app.title': 'AWS Copilot',
  'app.subtitle': 'Crie um bucket S3 e uma política IAM para acesso da aplicação.',
  'language.label': 'Idioma',
  'guide.start': 'Iniciar guia',
  'guide.s3Iam.title': 'Bucket S3 + política IAM',
  'guide.s3Iam.stepObjective.title': 'Escolha o objetivo',
  'guide.s3Iam.stepObjective.body': 'Este guia cria acesso de aplicação ao S3 sem abrir o bucket publicamente.',
  'guide.s3Iam.stepBucketName.title': 'Crie o bucket',
  'guide.s3Iam.stepBucketName.body': 'Use um nome globalmente único, como {bucketName}. Não inclua segredos ou dados de clientes no nome.',
  'guide.s3Iam.stepSecurity.title': 'Mantenha o acesso público bloqueado',
  'guide.s3Iam.stepSecurity.body': 'Bloqueie acesso público, exceto quando houver um motivo específico e revisado para publicar objetos.',
  'guide.s3Iam.stepIamPolicy.title': 'Crie uma política IAM de privilégio mínimo',
  'guide.s3Iam.stepIamPolicy.body': 'Restrinja a política a este bucket e apenas às ações S3 que a aplicação precisa.',
  'guide.s3Iam.stepReview.title': 'Revise o resultado',
  'guide.s3Iam.stepReview.body': 'Confirme que o bucket está privado e que a política IAM referencia apenas o bucket esperado.',
  'action.copy': 'Copiar sugestão',
  'action.fill': 'Preencher campo',
  'action.done': 'Marcar como concluído',
  'status.localOnly': 'Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.',
  'error.notAws': 'Abra o Console da AWS para usar este guia.',
  'error.wrongPage': 'Esta etapa precisa de outra página do Console da AWS.'
};
```

- [ ] **Step 4: Add localization implementation**

Write `src/i18n/index.ts`:

```ts
import { en } from './locales/en';

export type Locale = 'en' | 'pt-BR';
export type TranslationKey = keyof typeof en;
export type TranslationKeyMap = Record<TranslationKey, string>;

import { ptBR } from './locales/pt-BR';

const dictionaries: Record<Locale, TranslationKeyMap> = {
  en,
  'pt-BR': ptBR
};

export function detectLocale(languages: readonly string[] = navigator.languages): Locale {
  const normalized = languages.map((language) => language.toLowerCase());
  if (normalized.some((language) => language === 'pt-br' || language.startsWith('pt-'))) {
    return 'pt-BR';
  }
  return 'en';
}

export function t(locale: Locale, key: TranslationKey, values: Record<string, string> = {}): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key];
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    template
  );
}

export function translationKeys(locale: Locale): string[] {
  return Object.keys(dictionaries[locale]).sort();
}
```

- [ ] **Step 5: Wire localized panel title**

Modify `src/panel/App.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { detectLocale, type Locale, t } from '../i18n';

export function App() {
  const initialLocale = useMemo(() => detectLocale(), []);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  return (
    <main>
      <label>
        {t(locale, 'language.label')}
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </label>
      <h1>{t(locale, 'app.title')}</h1>
      <p>{t(locale, 'app.subtitle')}</p>
      <p>{t(locale, 'status.localOnly')}</p>
    </main>
  );
}
```

- [ ] **Step 6: Run localization tests**

Run: `npm run test -- src/i18n/i18n.test.ts src/panel/App.test.tsx`

Expected: all tests pass.

- [ ] **Step 7: Commit localization**

```bash
git add src/i18n src/panel/App.tsx src/panel/App.test.tsx
git commit -m "feat: add english and portuguese localization"
```

---

### Task 4: Guide Engine And S3/IAM Steps

**Files:**
- Create: `src/guides/s3IamGuide.ts`
- Create: `src/guides/guideEngine.ts`
- Create: `src/guides/guideEngine.test.ts`
- Modify: `src/panel/App.tsx`

- [ ] **Step 1: Write failing guide engine tests**

Write `src/guides/guideEngine.test.ts`:

```ts
import { createGuideState, currentStep, goNext, goPrevious, markDone } from './guideEngine';
import { s3IamGuide } from './s3IamGuide';

it('starts at the first guide step', () => {
  const state = createGuideState(s3IamGuide);
  expect(currentStep(s3IamGuide, state).id).toBe('objective');
});

it('moves forward and backward through steps', () => {
  const state = createGuideState(s3IamGuide);
  const next = goNext(s3IamGuide, state);
  expect(currentStep(s3IamGuide, next).id).toBe('bucket');
  expect(currentStep(s3IamGuide, goPrevious(s3IamGuide, next)).id).toBe('objective');
});

it('does not move beyond final step', () => {
  let state = createGuideState(s3IamGuide);
  for (let index = 0; index < 10; index += 1) {
    state = goNext(s3IamGuide, state);
  }
  expect(currentStep(s3IamGuide, state).id).toBe('review');
});

it('tracks completed step ids', () => {
  const state = markDone(createGuideState(s3IamGuide), 'bucket');
  expect(state.completedStepIds).toContain('bucket');
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/guides/guideEngine.test.ts`

Expected: FAIL because guide modules do not exist.

- [ ] **Step 3: Add structured S3/IAM guide**

Write `src/guides/s3IamGuide.ts`:

```ts
import type { TranslationKey } from '../i18n';

export type GuideStepId = 'objective' | 'bucket' | 'security' | 'iamPolicy' | 'review';

export type GuideStep = {
  id: GuideStepId;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  expectedPage: 'anyAws' | 's3CreateBucket' | 's3BucketSettings' | 'iamCreatePolicy';
  highlightSelector?: string;
  suggestedValues?: Record<string, string>;
};

export type GuideDefinition = {
  id: 's3-iam-app-access';
  titleKey: TranslationKey;
  steps: GuideStep[];
};

export const s3IamGuide: GuideDefinition = {
  id: 's3-iam-app-access',
  titleKey: 'guide.s3Iam.title',
  steps: [
    {
      id: 'objective',
      titleKey: 'guide.s3Iam.stepObjective.title',
      bodyKey: 'guide.s3Iam.stepObjective.body',
      expectedPage: 'anyAws'
    },
    {
      id: 'bucket',
      titleKey: 'guide.s3Iam.stepBucketName.title',
      bodyKey: 'guide.s3Iam.stepBucketName.body',
      expectedPage: 's3CreateBucket',
      highlightSelector: '[data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]',
      suggestedValues: {
        bucketName: 'my-app-uploads-prod'
      }
    },
    {
      id: 'security',
      titleKey: 'guide.s3Iam.stepSecurity.title',
      bodyKey: 'guide.s3Iam.stepSecurity.body',
      expectedPage: 's3BucketSettings',
      highlightSelector: '[data-testid*="block-public"], input[type="checkbox"]'
    },
    {
      id: 'iamPolicy',
      titleKey: 'guide.s3Iam.stepIamPolicy.title',
      bodyKey: 'guide.s3Iam.stepIamPolicy.body',
      expectedPage: 'iamCreatePolicy',
      highlightSelector: 'textarea, [data-testid*="policy"], [role="textbox"]'
    },
    {
      id: 'review',
      titleKey: 'guide.s3Iam.stepReview.title',
      bodyKey: 'guide.s3Iam.stepReview.body',
      expectedPage: 'anyAws'
    }
  ]
};
```

- [ ] **Step 4: Add guide engine**

Write `src/guides/guideEngine.ts`:

```ts
import type { GuideDefinition, GuideStep, GuideStepId } from './s3IamGuide';

export type GuideState = {
  activeStepIndex: number;
  completedStepIds: GuideStepId[];
};

export function createGuideState(_guide: GuideDefinition): GuideState {
  return {
    activeStepIndex: 0,
    completedStepIds: []
  };
}

export function currentStep(guide: GuideDefinition, state: GuideState): GuideStep {
  return guide.steps[state.activeStepIndex];
}

export function goNext(guide: GuideDefinition, state: GuideState): GuideState {
  return {
    ...state,
    activeStepIndex: Math.min(state.activeStepIndex + 1, guide.steps.length - 1)
  };
}

export function goPrevious(_guide: GuideDefinition, state: GuideState): GuideState {
  return {
    ...state,
    activeStepIndex: Math.max(state.activeStepIndex - 1, 0)
  };
}

export function markDone(state: GuideState, stepId: GuideStepId): GuideState {
  if (state.completedStepIds.includes(stepId)) {
    return state;
  }

  return {
    ...state,
    completedStepIds: [...state.completedStepIds, stepId]
  };
}
```

- [ ] **Step 5: Render guide in panel**

Modify `src/panel/App.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { createGuideState, currentStep, goNext, markDone } from '../guides/guideEngine';
import { s3IamGuide } from '../guides/s3IamGuide';
import { detectLocale, type Locale, t } from '../i18n';

export function App() {
  const initialLocale = useMemo(() => detectLocale(), []);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [guideState, setGuideState] = useState(() => createGuideState(s3IamGuide));
  const step = currentStep(s3IamGuide, guideState);
  const values = step.suggestedValues ?? {};

  return (
    <main>
      <label>
        {t(locale, 'language.label')}
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </label>
      <h1>{t(locale, 'app.title')}</h1>
      <p>{t(locale, 'status.localOnly')}</p>
      <section>
        <p>
          Step {guideState.activeStepIndex + 1} of {s3IamGuide.steps.length}
        </p>
        <h2>{t(locale, step.titleKey)}</h2>
        <p>{t(locale, step.bodyKey, values)}</p>
        <button
          type="button"
          onClick={() => {
            setGuideState((state) => goNext(s3IamGuide, markDone(state, step.id)));
          }}
        >
          {t(locale, 'action.done')}
        </button>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run guide tests**

Run: `npm run test -- src/guides/guideEngine.test.ts src/panel/App.test.tsx`

Expected: all tests pass.

- [ ] **Step 7: Commit guide engine**

```bash
git add src/guides src/panel/App.tsx
git commit -m "feat: add curated s3 iam guide"
```

---

### Task 5: Content Script Page Detection And Highlights

**Files:**
- Create: `src/content/pageDetection.ts`
- Create: `src/content/highlight.ts`
- Create: `src/content/content.test.ts`
- Modify: `src/content/main.ts`

- [ ] **Step 1: Write failing content tests**

Write `src/content/content.test.ts`:

```ts
import { clearHighlight, highlightElement } from './highlight';
import { detectAwsPage } from './pageDetection';

it('detects non-AWS pages', () => {
  expect(detectAwsPage('https://example.com')).toEqual({ kind: 'notAws' });
});

it('detects AWS S3 pages', () => {
  expect(detectAwsPage('https://s3.console.aws.amazon.com/s3/bucket/create')).toEqual({ kind: 's3' });
});

it('detects AWS IAM pages', () => {
  expect(detectAwsPage('https://us-east-1.console.aws.amazon.com/iam/home#/policies$new')).toEqual({ kind: 'iam' });
});

it('adds and clears a highlight overlay', () => {
  document.body.innerHTML = '<input id="bucket" />';
  const target = document.getElementById('bucket') as HTMLElement;

  highlightElement(target);
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument();

  clearHighlight();
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/content/content.test.ts`

Expected: FAIL because content helpers do not exist.

- [ ] **Step 3: Add page detection**

Write `src/content/pageDetection.ts`:

```ts
export type AwsPage =
  | { kind: 'notAws' }
  | { kind: 'awsUnknown' }
  | { kind: 's3' }
  | { kind: 'iam' };

export function detectAwsPage(url: string): AwsPage {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith('console.aws.amazon.com')) {
    return { kind: 'notAws' };
  }

  const fullUrl = url.toLowerCase();
  if (fullUrl.includes('/s3')) {
    return { kind: 's3' };
  }
  if (fullUrl.includes('/iam')) {
    return { kind: 'iam' };
  }
  return { kind: 'awsUnknown' };
}
```

- [ ] **Step 4: Add highlight helpers**

Write `src/content/highlight.ts`:

```ts
const HIGHLIGHT_ATTRIBUTE = 'data-aws-copilot-highlight';

export function clearHighlight(): void {
  document.querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}]`).forEach((element) => element.remove());
}

export function highlightElement(target: HTMLElement): void {
  clearHighlight();
  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute(HIGHLIGHT_ATTRIBUTE, 'true');
  overlay.style.position = 'fixed';
  overlay.style.left = `${rect.left - 4}px`;
  overlay.style.top = `${rect.top - 4}px`;
  overlay.style.width = `${rect.width + 8}px`;
  overlay.style.height = `${rect.height + 8}px`;
  overlay.style.border = '3px solid #10b981';
  overlay.style.borderRadius = '6px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483647';
  overlay.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.2)';
  document.body.appendChild(overlay);
}

export function highlightSelector(selector: string): boolean {
  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) {
    clearHighlight();
    return false;
  }

  highlightElement(target);
  return true;
}
```

- [ ] **Step 5: Wire content script listener**

Modify `src/content/main.ts`:

```ts
import { highlightSelector } from './highlight';
import { detectAwsPage } from './pageDetection';

console.info('[AWS Copilot] content script loaded', detectAwsPage(window.location.href));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AWS_COPILOT_HIGHLIGHT' && typeof message.selector === 'string') {
    const found = highlightSelector(message.selector);
    sendResponse({ ok: found });
    return true;
  }

  if (message?.type === 'AWS_COPILOT_DETECT_PAGE') {
    sendResponse({ ok: true, page: detectAwsPage(window.location.href) });
    return true;
  }

  return false;
});
```

- [ ] **Step 6: Run content tests**

Run: `npm run test -- src/content/content.test.ts`

Expected: all tests pass.

- [ ] **Step 7: Commit content script**

```bash
git add src/content
git commit -m "feat: add aws console page detection"
```

---

### Task 6: Safety Rules

**Files:**
- Create: `src/safety/safetyRules.ts`
- Create: `src/safety/safetyRules.test.ts`
- Modify: `src/content/highlight.ts`

- [ ] **Step 1: Write failing safety tests**

Write `src/safety/safetyRules.test.ts`:

```ts
import { assertSafeSelector, isSensitiveSelector, isExternalUrlAllowed } from './safetyRules';

it('blocks sensitive credential selectors', () => {
  expect(isSensitiveSelector('input[name="secretAccessKey"]')).toBe(true);
  expect(isSensitiveSelector('input[type="password"]')).toBe(true);
});

it('allows normal AWS console fields', () => {
  expect(isSensitiveSelector('input[name="bucketName"]')).toBe(false);
});

it('throws when a guide tries to target sensitive fields', () => {
  expect(() => assertSafeSelector('input[type="password"]')).toThrow('Refusing to target sensitive AWS fields');
});

it('does not allow external network URLs in MVP', () => {
  expect(isExternalUrlAllowed('https://api.example.com')).toBe(false);
  expect(isExternalUrlAllowed('https://s3.console.aws.amazon.com')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/safety/safetyRules.test.ts`

Expected: FAIL because safety module does not exist.

- [ ] **Step 3: Add safety rules**

Write `src/safety/safetyRules.ts`:

```ts
const sensitiveSelectorPatterns = [
  /password/i,
  /secret/i,
  /accesskey/i,
  /access-key/i,
  /credential/i,
  /token/i
];

export function isSensitiveSelector(selector: string): boolean {
  return sensitiveSelectorPatterns.some((pattern) => pattern.test(selector));
}

export function assertSafeSelector(selector: string): void {
  if (isSensitiveSelector(selector)) {
    throw new Error('Refusing to target sensitive AWS fields');
  }
}

export function isExternalUrlAllowed(_url: string): boolean {
  return false;
}
```

- [ ] **Step 4: Enforce safety in highlights**

Modify `src/content/highlight.ts`:

```ts
import { assertSafeSelector } from '../safety/safetyRules';

const HIGHLIGHT_ATTRIBUTE = 'data-aws-copilot-highlight';

export function clearHighlight(): void {
  document.querySelectorAll(`[${HIGHLIGHT_ATTRIBUTE}]`).forEach((element) => element.remove());
}

export function highlightElement(target: HTMLElement): void {
  clearHighlight();
  const rect = target.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.setAttribute(HIGHLIGHT_ATTRIBUTE, 'true');
  overlay.style.position = 'fixed';
  overlay.style.left = `${rect.left - 4}px`;
  overlay.style.top = `${rect.top - 4}px`;
  overlay.style.width = `${rect.width + 8}px`;
  overlay.style.height = `${rect.height + 8}px`;
  overlay.style.border = '3px solid #10b981';
  overlay.style.borderRadius = '6px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483647';
  overlay.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.2)';
  document.body.appendChild(overlay);
}

export function highlightSelector(selector: string): boolean {
  assertSafeSelector(selector);
  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) {
    clearHighlight();
    return false;
  }

  highlightElement(target);
  return true;
}
```

- [ ] **Step 5: Run safety tests**

Run: `npm run test -- src/safety/safetyRules.test.ts src/content/content.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit safety layer**

```bash
git add src/safety src/content/highlight.ts
git commit -m "feat: enforce local safety rules"
```

---

### Task 7: Panel To Content Script Integration

**Files:**
- Modify: `src/panel/App.tsx`
- Modify: `src/panel/App.test.tsx`

- [ ] **Step 1: Update panel tests for guide actions**

Modify `src/panel/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

it('renders the extension name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'AWS Copilot' })).toBeInTheDocument();
});

it('switches to Portuguese', async () => {
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Language'), 'pt-BR');
  expect(screen.getByText('Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.')).toBeInTheDocument();
});

it('advances through the guide', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Choose the objective' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Mark done' }));
  expect(screen.getByRole('heading', { name: 'Create the bucket' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add `user-event` dependency**

Run: `npm install --save-dev @testing-library/user-event`

Expected: dependency is added to `package.json` and `package-lock.json`.

- [ ] **Step 3: Add content messaging helper to panel**

Modify `src/panel/App.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { createGuideState, currentStep, goNext, markDone } from '../guides/guideEngine';
import { s3IamGuide } from '../guides/s3IamGuide';
import { detectLocale, type Locale, t } from '../i18n';

async function sendHighlight(selector: string): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id === undefined) {
    return;
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: 'AWS_COPILOT_HIGHLIGHT',
    selector
  });
}

export function App() {
  const initialLocale = useMemo(() => detectLocale(), []);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [guideState, setGuideState] = useState(() => createGuideState(s3IamGuide));
  const step = currentStep(s3IamGuide, guideState);
  const values = step.suggestedValues ?? {};

  return (
    <main>
      <label>
        {t(locale, 'language.label')}
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </label>
      <h1>{t(locale, 'app.title')}</h1>
      <p>{t(locale, 'status.localOnly')}</p>
      <section>
        <p>
          Step {guideState.activeStepIndex + 1} of {s3IamGuide.steps.length}
        </p>
        <h2>{t(locale, step.titleKey)}</h2>
        <p>{t(locale, step.bodyKey, values)}</p>
        {step.highlightSelector ? (
          <button type="button" onClick={() => void sendHighlight(step.highlightSelector!)}>
            Highlight field
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setGuideState((state) => goNext(s3IamGuide, markDone(state, step.id)));
          }}
        >
          {t(locale, 'action.done')}
        </button>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run panel tests**

Run: `npm run test -- src/panel/App.test.tsx`

Expected: all tests pass.

- [ ] **Step 5: Commit panel integration**

```bash
git add package.json package-lock.json src/panel/App.tsx src/panel/App.test.tsx
git commit -m "feat: connect panel guide actions"
```

---

### Task 8: Browser Fixtures And Flow Checks

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/fixtures/aws-console-s3.html`
- Create: `tests/fixtures/aws-console-iam.html`
- Create: `tests/browser/extension-flow.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Add Playwright**

Run: `npm install --save-dev @playwright/test`

Expected: Playwright dependency is added.

- [ ] **Step 2: Add browser scripts**

Modify `package.json` scripts to include:

```json
{
  "test:browser": "playwright test",
  "check": "npm run typecheck && npm run test && npm run build && npm run test:browser"
}
```

Keep existing scripts and replace only the `check` value.

- [ ] **Step 3: Add Playwright config**

Write `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  }
});
```

- [ ] **Step 4: Add fixture pages**

Write `tests/fixtures/aws-console-s3.html`:

```html
<!doctype html>
<html>
  <body>
    <main>
      <h1>Create bucket</h1>
      <label>
        Bucket name
        <input name="bucketName" aria-label="Bucket name" />
      </label>
      <label>
        <input type="checkbox" checked />
        Block all public access
      </label>
    </main>
  </body>
</html>
```

Write `tests/fixtures/aws-console-iam.html`:

```html
<!doctype html>
<html>
  <body>
    <main>
      <h1>Create policy</h1>
      <textarea aria-label="Policy JSON"></textarea>
    </main>
  </body>
</html>
```

- [ ] **Step 5: Add browser flow spec**

Write `tests/browser/extension-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('panel renders localized guide content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AWS Copilot' })).toBeVisible();
  await page.getByLabel('Language').selectOption('pt-BR');
  await expect(page.getByText('Roda localmente. Sem chamadas à API da AWS.')).toBeVisible();
});

test('fixture pages contain target fields used by guide selectors', async ({ page }) => {
  await page.goto('/tests/fixtures/aws-console-s3.html');
  await expect(page.locator('input[name="bucketName"]')).toBeVisible();

  await page.goto('/tests/fixtures/aws-console-iam.html');
  await expect(page.locator('textarea')).toBeVisible();
});
```

- [ ] **Step 6: Run browser tests**

Run: `npm run test:browser`

Expected: both browser tests pass.

- [ ] **Step 7: Commit browser checks**

```bash
git add package.json package-lock.json playwright.config.ts tests
git commit -m "test: add browser fixture checks"
```

---

### Task 9: README And Final Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Write `README.md`:

```md
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
```

- [ ] **Step 2: Run full verification**

Run: `npm run check`

Expected: typecheck, unit tests, production build, and browser tests pass.

- [ ] **Step 3: Confirm build artifacts**

Run: `find dist -maxdepth 2 -type f | sort`

Expected output includes:

```text
dist/content.js
dist/index.html
dist/manifest.json
```

- [ ] **Step 4: Commit documentation**

```bash
git add README.md
git commit -m "docs: add extension setup instructions"
```

- [ ] **Step 5: Final status**

Run: `git status --short`

Expected: no output.

Run: `git log --oneline -5`

Expected: recent commits show scaffold, manifest, i18n, guide engine, content script, safety, browser checks, and README work.

---

## Self-Review Notes

- Spec coverage: the plan covers Chrome extension MVP, real AWS Console content script, curated S3/IAM guide, local-only safety, no backend or AWS APIs, i18n for `en` and `pt-BR`, tests, browser fixtures, and README setup.
- Scope control: automatic AWS execution, free-form chat, AWS API integration, and backend services remain out of scope.
- Testing coverage: unit tests cover i18n, guide state, content highlighting, and safety rules; browser tests cover localized panel and fixture selectors; manual AWS Console verification remains required after the build exists.
