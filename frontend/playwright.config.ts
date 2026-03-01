import { defineConfig } from '@playwright/test';
import { resolve } from 'path';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  globalSetup: resolve(__dirname, 'e2e/global-setup.ts'),
  globalTeardown: resolve(__dirname, 'e2e/global-teardown.ts'),
  workers: 1, // Crucial: Go engine uses a fixed port
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
    },
  ],
});
