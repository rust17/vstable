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

    // Create a table first to ensure it exists
    const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.press(`${mod}+t`);
    const activeTab = window.locator('div[data-testid="active-tab-content"]');
    const editor = activeTab.locator('.monaco-editor').last();
    await editor.click();
    await window.keyboard.press(`${mod}+a`);
    await window.keyboard.press('Backspace');
    await window.keyboard.insertText('CREATE TABLE IF NOT EXISTS persist_test (id int);');
    await activeTab.locator('button[data-testid="btn-run-query"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 10000 });

    // Open the table tab
    await window.locator('button[data-testid="btn-refresh-tables"]').click();
    const tableItem = window.locator('div[data-testid="table-item-persist_test"]');
    await expect(tableItem).toBeVisible({ timeout: 10000 });
    await tableItem.click();

    // Ensure the tab appears
    await expect(window.locator('div[data-testid="tab-table-persist_test"]')).toBeVisible();

    // Wait for the data to finish loading to ensure all state updates are done
    const activeTabContent = window.locator('div[data-testid="active-tab-content"]');
    await expect(activeTabContent.locator('text=Loading data...')).not.toBeVisible({
      timeout: 10000,
    });

    // Give it a moment to save workspace.json (CI can be slow, 1s debounce + IO)
    const workspacePath = path.join(userDataDir, 'workspace.json');
    await expect(async () => {
      expect(fs.existsSync(workspacePath)).toBeTruthy();
      const content = fs.readFileSync(workspacePath, 'utf8');
      const data = JSON.parse(content);
      const hasTableTab = data.sessions?.[0]?.tabs?.some(
        (t: any) => t.type === 'table' && t.name === 'persist_test'
      );
      expect(hasTableTab).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // Close the app
    await electronApp.close();

    // 2. Second launch
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for "Loading workspace..." to disappear
    await expect(window.locator('text=Loading workspace...')).not.toBeVisible({ timeout: 15000 });

    // Wait for engine
    await expect(async () => {
      const response = await window.request.get('http://127.0.0.1:39082/api/ping');
      expect(response.ok()).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // the tab should be restored
    await expect(window.locator('div[data-testid="tab-table-persist_test"]')).toBeVisible({
      timeout: 10000,
    });

    await electronApp.close();
  });
});
