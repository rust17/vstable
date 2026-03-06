import { _electron as electron, expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

test.describe('Workspace Persistence Tests', () => {
  let userDataDir: string;

  test.beforeAll(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstable-e2e-persist-'));
  });

  test.afterAll(async () => {
    if (userDataDir && fs.existsSync(userDataDir)) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (e) {}
    }
  });

  test('P-01 Connect, open tabs, and restore after restart', async () => {
    // 1. First launch
    let electronApp = await electron.launch({
      args: ['.', '--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
    });
    let window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for engine
    await expect(async () => {
      const response = await window.request.get('http://127.0.0.1:39082/api/ping');
      expect(response.ok()).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // Connect to PostgreSQL
    const form = window.locator('form[data-testid="connection-form"]');
    await expect(form).toBeVisible({ timeout: 10000 });

    await window.locator('button:has-text("PostgreSQL")').click();
    await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await window.locator('input[data-testid="input-port"]').fill('5433');
    await window.locator('input[data-testid="input-user"]').fill('root');
    await window.locator('input[data-testid="input-password"]').fill('password');
    await window.locator('input[data-testid="input-database"]').fill('vstable_test');

    await window.locator('button[data-testid="btn-connect"]').click();
    await expect(form).not.toBeVisible({ timeout: 10000 });

    // Open a Query tab
    const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.press(`${mod}+t`);

    // Ensure the tab appears
    await expect(window.locator('div[data-testid="tab-table-New Query"]')).toBeVisible();

    // Give it a moment to save workspace.json
    await window.waitForTimeout(2000);

    // Close the app
    await electronApp.close();

    // 2. Second launch
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for engine
    await expect(async () => {
      const response = await window.request.get('http://127.0.0.1:39082/api/ping');
      expect(response.ok()).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // form should not be visible (auto connected)
    await expect(window.locator('form[data-testid="connection-form"]')).not.toBeVisible({
      timeout: 5000,
    });

    // the tab should be restored
    await expect(window.locator('div[data-testid="tab-table-New Query"]')).toBeVisible({
      timeout: 10000,
    });

    await electronApp.close();
  });
});
