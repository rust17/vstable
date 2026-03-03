import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('Connection Management Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstable-e2e-conn-'));
    electronApp = await electron.launch({ 
      args: ['.', `--user-data-dir=${userDataDir}`] 
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await expect(async () => {
      const response = await window.request.get('http://127.0.0.1:39082/api/ping');
      expect(response.ok()).toBeTruthy();
    }).toPass({ timeout: 15000 });
  });

  test.afterEach(async () => {
    if (electronApp) await electronApp.close();
    if (userDataDir && fs.existsSync(userDataDir)) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('C-01 PostgreSQL Connection: Valid credentials', async () => {
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
  });

  test('C-02 MySQL Connection: Valid credentials', async () => {
    const form = window.locator('form[data-testid="connection-form"]');
    await window.locator('button:has-text("MySQL")').click();
    await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await window.locator('input[data-testid="input-port"]').fill('3307');
    await window.locator('input[data-testid="input-user"]').fill('root');
    await window.locator('input[data-testid="input-password"]').fill('password');
    await window.locator('input[data-testid="input-database"]').fill('vstable_test');
    
    await window.locator('button[data-testid="btn-connect"]').click();
    await expect(form).not.toBeVisible({ timeout: 10000 });
  });

  test('R-02 Connection Failure: Invalid credentials', async () => {
    await window.locator('button:has-text("PostgreSQL")').click();
    await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await window.locator('input[data-testid="input-port"]').fill('5433');
    await window.locator('input[data-testid="input-user"]').fill('root');
    await window.locator('input[data-testid="input-password"]').fill('wrong_password');
    await window.locator('input[data-testid="input-database"]').fill('vstable_test');
    
    await window.locator('button[data-testid="btn-connect"]').click();
    
    // 验证内联错误消息出现
    const errorMsg = window.locator('div.text-red-600');
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
    
    // 表单依然可见
    await expect(window.locator('form[data-testid="connection-form"]')).toBeVisible();
  });
});
