import { defineConfig } from '@playwright/test';

const isCI = Boolean((globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI);

export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI
  }
});
