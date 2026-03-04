import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
  test,
} from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

test.describe('Schema Designer Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstable-e2e-schema-'));
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
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

  test('S-01, S-02, S-03: Create Table and Column Operations', async () => {
    const tableName = 'schema_test_table';

    // Open Schema Designer
    await window.locator('button[data-testid="btn-create-table"]').click();
    await expect(window.locator('div[data-testid="active-tab-content"]')).toBeVisible();

    // S-01: Set table name
    await window.locator('input[data-testid="input-table-name"]').fill(tableName);

    // S-02: Column Operations
    // Row 0 is created by default. Configure it.
    const row0 = window.locator('tbody tr').nth(0);
    await row0.locator('input[data-testid="input-column-name"]').fill('id');

    // Select Type 'uuid'
    const typeBtn0 = row0.locator('td').nth(2).locator('button');
    await typeBtn0.click();
    const searchInput = window.locator('input[placeholder="Search type..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('uuid');
    const uuidOption = window.locator('#type-selector-portal button:has-text("uuid")').first();
    await expect(uuidOption).toBeVisible();
    await uuidOption.click();

    // Set as PK (Key icon in 8th cell) - check if already PK
    const pkCell0 = row0.locator('td').nth(7);
    const pkIcon0 = pkCell0.locator('div');
    const isAlreadyPk = await pkIcon0.evaluate((el) => el.classList.contains('text-amber-500'));
    if (!isAlreadyPk) {
      await pkCell0.click();
    }
    await expect(pkIcon0).toHaveClass(/text-amber-500/);

    // Add a second column
    await window.locator('button[data-testid="btn-add-column"]').click();
    const row1 = window.locator('tbody tr').nth(1);
    await row1.locator('input[data-testid="input-column-name"]').fill('username');

    // Select Type 'varchar' and set length
    const typeBtn1 = row1.locator('td').nth(2).locator('button');
    await typeBtn1.click();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('varchar');
    await window.locator('#type-selector-portal button:has-text("varchar")').first().click();

    await row1.locator('input[placeholder="Len"]').fill('255');

    // S-03: DDL Execution
    await window.locator('button[data-testid="btn-save-structure"]').click();

    // Verify DDL Preview modal
    const executeBtn = window.locator('button[data-testid="btn-execute-sql"]');
    await expect(executeBtn).toBeVisible({ timeout: 10000 });
    await executeBtn.click();

    // Verify tab closed and table exists in sidebar
    await expect(
      window.locator(`div[data-testid="tab-table-Structure: ${tableName}"]`)
    ).not.toBeVisible({ timeout: 15000 });

    await window.locator('button[data-testid="btn-refresh-tables"]').click();
    await expect(window.locator(`div[data-testid="table-item-${tableName}"]`)).toBeVisible();

    // Cleanup: Drop table
    const tableItem = window.locator(`div[data-testid="table-item-${tableName}"]`);
    await tableItem.hover(); // Make delete button visible
    await tableItem.locator('button').click(); // Trash icon
    const confirmOkBtn = window.locator('button[data-testid="btn-confirm-ok"]');
    await expect(confirmOkBtn).toBeVisible();
    await confirmOkBtn.click();
    await expect(tableItem).not.toBeVisible({ timeout: 10000 });
  });
});
