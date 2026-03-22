import { defineConfig } from '@playwright/test';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  globalSetup: resolve(__dirname, 'e2e/global-setup.ts'),
  globalTeardown: resolve(__dirname, 'e2e/global-teardown.ts'),
  workers: 1, // Crucial: Go engine uses a fixed port
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://localhost:1420',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev-frontend',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
