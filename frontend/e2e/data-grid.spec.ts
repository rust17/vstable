import * as os from 'os';
import { expect, test } from './fixture';

test.describe('Data Grid Tests', () => {
  const tableName = 'data_grid_test';
  const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for Go Engine to be reachable via gRPC-Web
    await expect(async () => {
      const ok = await page.evaluate(() =>
        fetch('http://localhost:39082/vstable.EngineService/Ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/grpc-web-text', 'x-grpc-web': '1' },
          body: 'AAAAAAA=',
        })
          .then((r) => r.ok)
          .catch(() => false)
      );
      expect(ok).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // Connect to PostgreSQL
    await page.locator('button:has-text("PostgreSQL")').click();
    await page.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await page.locator('input[data-testid="input-port"]').fill('5433');
    await page.locator('input[data-testid="input-user"]').fill('root');
    await page.locator('input[data-testid="input-password"]').fill('password');
    await page.locator('input[data-testid="input-database"]').fill('vstable_test');
    await page.locator('button[data-testid="btn-connect"]').click();
    await expect(page.locator('form[data-testid="connection-form"]')).not.toBeVisible({
      timeout: 20000,
    });

    // Setup table
    await page.keyboard.press(`${mod}+t`);
    const activeTab = page.locator('div[data-testid="active-tab-content"]');
    const editor = activeTab.locator('.monaco-editor').last();

    const statements = [
      `DROP TABLE IF EXISTS ${tableName};`,
      `CREATE TABLE ${tableName} (id int primary key, name varchar(255));`,
    ];

    for (const sql of statements) {
      await editor.click();
      await page.keyboard.press(`${mod}+a`);
      await page.keyboard.press('Backspace');
      await page.keyboard.insertText(sql);
      await activeTab.locator('button[data-testid="btn-run-query"]').click();
      await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 10000 });
      await expect(activeTab.locator('div.text-red-600')).not.toBeVisible();
    }

    // Open table
    await page.locator('button[data-testid="btn-refresh-tables"]').click();
    await page.locator(`div[data-testid="table-item-${tableName}"]`).click();
  });

  test('D-01, D-02, D-03: Basic CRUD', async ({ page }) => {
    const activeTab = page.locator('div[data-testid="active-tab-content"]');
    const grid = activeTab.locator('div[data-testid="results-scroll"]');

    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();

    // D-01: Create Row
    await grid.click({ button: 'right' });
    const addRowBtn = page.locator('button:has-text("Add Row")');
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
    const textarea = page.locator('textarea[data-testid="edit-textarea"]');
    await expect(textarea).toBeVisible();
    await textarea.fill('updated_name');
    await page.locator('button:has-text("Save Changes")').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(nameCell).toHaveText('updated_name');

    // D-03: Delete Row
    await nameCell.click({ button: 'right' });
    await page.locator('button:has-text("Delete Row")').click();
    await page.locator('button[data-testid="btn-confirm-ok"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(nameCell).not.toBeVisible();
  });

  test('D-04: Refresh Interaction', async ({ page }) => {
    await page.keyboard.press(`${mod}+t`);
    let activeTab = page.locator('div[data-testid="active-tab-content"]');
    const editor = activeTab.locator('.monaco-editor').last();
    await editor.click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(`INSERT INTO ${tableName} (id, name) VALUES (100, 'external');`);
    await activeTab.locator('button[data-testid="btn-run-query"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 10000 });

    await page.locator(`div[data-testid="tab-table-${tableName}"]`).click();
    activeTab = page.locator('div[data-testid="active-tab-content"]');
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await page.keyboard.press(`${mod}+r`);
    await expect(activeTab.locator('td[data-testid="cell-id-0"]')).toHaveText('100', {
      timeout: 15000,
    });
  });

  test('R-01: Constraint Violation via Insert Conflict', async ({ page }) => {
    const activeTab = page.locator('div[data-testid="active-tab-content"]');
    const grid = activeTab.locator('div[data-testid="results-scroll"]');

    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();

    // 1. Add id=1
    await grid.click({ button: 'right' });
    await page.locator('button:has-text("Add Row")').click();
    await activeTab.locator('input[placeholder="id"]').fill('1');
    await activeTab.locator('button[data-testid="btn-save-row"]').click();
    await expect(activeTab.locator('text=Loading data...')).not.toBeVisible();
    await expect(activeTab.locator('td[data-testid="cell-id-0"]')).toHaveText('1');

    // 2. Try Add same id=1
    await grid.click({ button: 'right' });
    await page.locator('button:has-text("Add Row")').click();
    const idInput = activeTab.locator('input[placeholder="id"]');
    await expect(idInput).toBeVisible();
    await idInput.fill('1');
    await activeTab.locator('button[data-testid="btn-save-row"]').click();

    // 3. Verify AlertModal
    const alertModal = page.locator('div[role="dialog"]');
    await expect(alertModal).toBeVisible({ timeout: 15000 });

    const alertOkBtn = alertModal.locator('button[data-testid="btn-alert-ok"]');
    await expect(alertOkBtn).toBeVisible();
    await alertOkBtn.click();

    // 4. Cancel the invalid row
    await activeTab.locator('button[data-testid="btn-cancel-row"]').click();
    await expect(idInput).not.toBeVisible();
  });
});
