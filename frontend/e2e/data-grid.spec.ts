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

test.describe('Data Grid Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;
  let userDataDir: string;
  const tableName = 'data_grid_test';

  test.beforeEach(async () => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstable-e2e-datagrid-'));
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`],
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for Go engine
    await expect(async () => {
      const pingOk = await window.evaluate(() =>
        (window as any).api
          .enginePing()
          .then((r: any) => r.status === 'ok')
          .catch(() => false)
      );
      expect(pingOk).toBeTruthy();
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
      timeout: 20000,
    });

    // Setup table
    const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.press(`${mod}+t`);
    const activeTab = window.locator('div[data-testid="active-tab-content"]');
    const editor = activeTab.locator('.monaco-editor').last();

    const statements = [
      `DROP TABLE IF EXISTS ${tableName};`,
      `CREATE TABLE ${tableName} (id int primary key, name varchar(255));`,
    ];

    for (const sql of statements) {
      await editor.click();
      await window.keyboard.press(`${mod}+a`);
      await window.keyboard.press('Backspace');
      await window.keyboard.insertText(sql);
      await activeTab.locator('button[data-testid="btn-run-query"]').click();
      await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 10000 });
      await expect(activeTab.locator('div.text-red-600')).not.toBeVisible();
    }

    // Open table
    await window.locator('button[data-testid="btn-refresh-tables"]').click();
    await window.locator(`div[data-testid="table-item-${tableName}"]`).click();
  });

  test.afterEach(async () => {
    if (electronApp) await electronApp.close();
    if (userDataDir && fs.existsSync(userDataDir)) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (e) {}
    }
  });

  test('D-01, D-02, D-03: Basic CRUD', async () => {
    const activeTab = window.locator('div[data-testid="active-tab-content"]');
    const grid = activeTab.locator('div[data-testid="results-scroll"]');

    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();

    // D-01: Create Row
    await grid.click({ button: 'right' });
    const addRowBtn = window.locator('button:has-text("Add Row")');
    await expect(addRowBtn).toBeVisible();
    await addRowBtn.click();

    await activeTab.locator('input[placeholder="id"]').fill('1');
    await activeTab.locator('input[placeholder="name"]').fill('initial_name');
    await activeTab.locator('button[data-testid="btn-save-row"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(activeTab.locator('td[data-testid="cell-id-0"]')).toHaveText('1');

    // D-02: Inline Update
    const nameCell = activeTab.locator('td[data-testid="cell-name-0"]');
    await nameCell.dblclick();
    const textarea = window.locator('textarea[data-testid="edit-textarea"]');
    await expect(textarea).toBeVisible();
    await textarea.fill('updated_name');
    await window.locator('button:has-text("Save Changes")').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(nameCell).toHaveText('updated_name');

    // D-03: Delete Row
    await nameCell.click({ button: 'right' });
    await window.locator('button:has-text("Delete Row")').click();
    await window.locator('button[data-testid="btn-confirm-ok"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(nameCell).not.toBeVisible();
  });

  test('D-04: Refresh Interaction', async () => {
    const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.press(`${mod}+t`);
    let activeTab = window.locator('div[data-testid="active-tab-content"]');
    const editor = activeTab.locator('.monaco-editor').last();
    await editor.click();
    await window.keyboard.press(`${mod}+a`);
    await window.keyboard.press('Backspace');
    await window.keyboard.insertText(
      `INSERT INTO ${tableName} (id, name) VALUES (100, 'external');`
    );
    await activeTab.locator('button[data-testid="btn-run-query"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 10000 });

    await window.locator(`div[data-testid="tab-table-${tableName}"]`).click();
    activeTab = window.locator('div[data-testid="active-tab-content"]');
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await window.keyboard.press(`${mod}+r`);
    await expect(activeTab.locator('td[data-testid="cell-id-0"]')).toHaveText('100', {
      timeout: 15000,
    });
  });

  test('R-01: Constraint Violation via Insert Conflict', async () => {
    const activeTab = window.locator('div[data-testid="active-tab-content"]');
    const grid = activeTab.locator('div[data-testid="results-scroll"]');

    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();

    // 1. Add id=1
    await grid.click({ button: 'right' });
    await window.locator('button:has-text("Add Row")').click();
    await activeTab.locator('input[placeholder="id"]').fill('1');
    await activeTab.locator('button[data-testid="btn-save-row"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(activeTab.locator('td[data-testid="cell-id-0"]')).toHaveText('1');

    // 2. Try Add same id=1
    await grid.click({ button: 'right' });
    await window.locator('button:has-text("Add Row")').click();
    const idInput = activeTab.locator('input[placeholder="id"]');
    await expect(idInput).toBeVisible();
    await idInput.fill('1');
    await activeTab.locator('button[data-testid="btn-save-row"]').click();

    // 3. Verify AlertModal
    const alertModal = window.locator('div[role="dialog"]');
    await expect(alertModal).toBeVisible({ timeout: 15000 });

    const alertOkBtn = alertModal.locator('button[data-testid="btn-alert-ok"]');
    await expect(alertOkBtn).toBeVisible();
    await alertOkBtn.click();

    // 4. Cancel the invalid row
    await activeTab.locator('button[data-testid="btn-cancel-row"]').click();
    await expect(idInput).not.toBeVisible();
  });
});
