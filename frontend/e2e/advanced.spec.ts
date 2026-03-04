import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('Advanced Features Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstable-e2e-advanced-'));
    electronApp = await electron.launch({
      args: ['.', `--user-data-dir=${userDataDir}`],
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for Go engine
    await expect(async () => {
      const response = await window.request.get('http://127.0.0.1:39082/api/ping');
      expect(response.ok()).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // Connect to PostgreSQL
    await window.locator('button:has-text("PostgreSQL")').click();
    await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await window.locator('input[data-testid="input-port"]').fill('5433');
    await window.locator('input[data-testid="input-user"]').fill('root');
    await window.locator('input[data-testid="input-password"]').fill('password');
    await window.locator('input[data-testid="input-database"]').fill('vstable_test');
    await window.locator('button[data-testid="btn-connect"]').click();
    await expect(window.locator('form[data-testid="connection-form"]')).not.toBeVisible({
      timeout: 10000,
    });
  });

  test.afterEach(async () => {
    if (electronApp) await electronApp.close();
    if (userDataDir && fs.existsSync(userDataDir)) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (e) {}
    }
  });

  test('A-01: SQL Console Execution', async () => {
    const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.press(`${mod}+t`);

    const activeTab = window.locator('div[data-testid="active-tab-content"]');
    const runQueryBtn = activeTab.locator('button[data-testid="btn-run-query"]');
    await expect(runQueryBtn).toBeVisible({ timeout: 10000 });

    const editor = activeTab.locator('.monaco-editor').last();
    await editor.click();
    await window.keyboard.press(`${mod}+a`);
    await window.keyboard.press('Backspace');
    await window.keyboard.insertText('SELECT 1 as col1, 2 as col2;');

    // Ensure text is there
    await expect(activeTab.locator('.view-line').first()).toContainText('SELECT 1');

    await runQueryBtn.click();

    // Verify results - wait for loading to finish
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 10000 });

    // Check if it shows rows count
    await expect(activeTab.locator('text=1 rows')).toBeVisible({ timeout: 10000 });

    await expect(activeTab.locator('td[data-testid="cell-col1-0"]')).toHaveText('1');
    await expect(activeTab.locator('td[data-testid="cell-col2-0"]')).toHaveText('2');
  });

  test('A-02, A-03, A-04: Pagination, Sorting and Filtering', async () => {
    const tableName = 'advanced_test_table';
    const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';

    // 1. Setup Data via SQL Console
    await window.keyboard.press(`${mod}+t`);
    let activeTab = window.locator('div[data-testid="active-tab-content"]');
    const editor = activeTab.locator('.monaco-editor').last();

    const statements = [
      `DROP TABLE IF EXISTS ${tableName};`,
      `CREATE TABLE ${tableName} (id serial primary key, price numeric);`,
      `INSERT INTO ${tableName} (price) SELECT i FROM generate_series(1, 105) s(i);`,
    ];

    for (const sql of statements) {
      await editor.click();
      await window.keyboard.press(`${mod}+a`);
      await window.keyboard.press('Backspace');
      await window.keyboard.insertText(sql);
      await activeTab.locator('button[data-testid="btn-run-query"]').click();
      await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 15000 });
      await expect(activeTab.locator('div.text-red-600')).not.toBeVisible();
    }

    // 2. Open Table
    await window.locator('button[data-testid="btn-refresh-tables"]').click();
    const tableItem = window.locator(`div[data-testid="table-item-${tableName}"]`);
    await expect(tableItem).toBeVisible();
    await tableItem.click();

    // Re-locate activeTab as it changed to the table tab
    activeTab = window.locator('div[data-testid="active-tab-content"]');

    // 3. A-02: Pagination
    const nextBtn = activeTab.locator('button[data-testid="btn-next-page"]');
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).not.toBeDisabled();

    // 4. A-03: Sorting
    const priceHeader = activeTab.locator('th:has-text("price")');
    await priceHeader.click(); // Sort ASC
    await expect(activeTab.locator('td[data-testid="cell-price-0"]')).toHaveText('1');
    await priceHeader.click(); // Sort DESC
    await expect(activeTab.locator('td[data-testid="cell-price-0"]')).toHaveText('105');

    // 5. A-04: Filtering
    await activeTab.locator('button[data-testid="btn-add-filter"]').click();

    // Column Dropdown
    const colDropdown = activeTab.locator('div[data-testid="filter-column-0"]');
    await colDropdown.click();
    await colDropdown
      .locator('div')
      .filter({ hasText: /^price$/ })
      .click();

    // Operator Dropdown
    const opDropdown = activeTab.locator('div[data-testid="filter-operator-0"]');
    await opDropdown.click();
    await opDropdown.locator('div').filter({ hasText: /^>$/ }).click();

    // Value Input
    await activeTab.locator('input[data-testid="filter-value-input"]').fill('100');
    await window.keyboard.press('Enter');

    // Verify exactly 5 rows (101, 102, 103, 104, 105)
    await expect(activeTab.locator('tbody tr')).toHaveCount(5, { timeout: 10000 });

    // Cleanup
    await tableItem.hover();
    await tableItem.locator('button').click();
    await window.locator('button[data-testid="btn-confirm-ok"]').click();
  });
});
