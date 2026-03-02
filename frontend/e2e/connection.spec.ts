import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('Connection Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    // Create a temporary user data directory for isolation
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstable-e2e-'));

    // Launch Electron application with the isolated user data directory
    electronApp = await electron.launch({ 
      args: ['.', `--user-data-dir=${userDataDir}`] 
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for the Go engine to be ready
    await expect(async () => {
      const response = await window.request.get('http://127.0.0.1:39082/api/ping');
      expect(response.ok()).toBeTruthy();
    }).toPass({ timeout: 15000 });
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    // Cleanup the temporary user data directory
    if (userDataDir && fs.existsSync(userDataDir)) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to cleanup userDataDir:', e);
      }
    }
  });

  test('Connects to PostgreSQL in Docker', async () => {
    const form = window.locator('form[data-testid="connection-form"]');
    await expect(form).toBeVisible({ timeout: 10000 });

    const pgButton = window.locator('button:has-text("PostgreSQL")');
    if (await pgButton.isVisible()) {
      await pgButton.click();
    }

    await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await window.locator('input[data-testid="input-port"]').fill('5433');
    await window.locator('input[data-testid="input-user"]').fill('root');
    await window.locator('input[data-testid="input-password"]').fill('password');
    await window.locator('input[data-testid="input-database"]').fill('vstable_test');
    
    await window.locator('button[data-testid="btn-connect"]').click();
    await expect(form).not.toBeVisible({ timeout: 10000 });
  });

  test('Connects to MySQL in Docker', async () => {
    const form = window.locator('form[data-testid="connection-form"]');
    await expect(form).toBeVisible({ timeout: 10000 });

    const mySqlButton = window.locator('button:has-text("MySQL")');
    if (await mySqlButton.isVisible()) {
      await mySqlButton.click();
    }

    await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await window.locator('input[data-testid="input-port"]').fill('3307');
    await window.locator('input[data-testid="input-user"]').fill('root');
    await window.locator('input[data-testid="input-password"]').fill('password');
    await window.locator('input[data-testid="input-database"]').fill('vstable_test');
    
    await window.locator('button[data-testid="btn-connect"]').click();
    await expect(form).not.toBeVisible({ timeout: 10000 });
  });
});
