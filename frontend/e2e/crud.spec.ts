import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const testConfigs = [
  {
    dialect: 'PostgreSQL',
    port: '5433',
    tableName: 'pg_ui_test',
  },
  {
    dialect: 'MySQL',
    port: '3307',
    tableName: 'mysql_ui_test',
  }
];

for (const config of testConfigs) {
  test.describe(`${config.dialect} Table CRUD E2E Tests`, () => {
    let electronApp: ElectronApplication;
    let window: Page;
    let userDataDir: string;

    test.beforeEach(async () => {
      userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `quickpg-e2e-${config.dialect.toLowerCase()}-`));
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

      // Connect to database
      const form = window.locator('form[data-testid="connection-form"]');
      await expect(form).toBeVisible({ timeout: 10000 });
      
      const dialectButton = window.locator(`button:has-text("${config.dialect}")`);
      if (await dialectButton.isVisible()) {
        await dialectButton.click();
      }

      await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
      await window.locator('input[data-testid="input-port"]').fill(config.port);
      await window.locator('input[data-testid="input-user"]').fill('root');
      await window.locator('input[data-testid="input-password"]').fill('password');
      await window.locator('input[data-testid="input-database"]').fill('quickpg_test');
      
      await window.locator('button[data-testid="btn-connect"]').click();
      await expect(form).not.toBeVisible({ timeout: 10000 });
    });

    test.afterEach(async () => {
      if (electronApp) {
        await electronApp.close();
      }
      if (userDataDir && fs.existsSync(userDataDir)) {
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {
          console.error('Failed to cleanup userDataDir:', e);
        }
      }
    });

    test(`Perform CRUD on ${config.dialect} table via UI`, async () => {
      const { tableName } = config;

      // 1. Create a test table via Schema Designer
      await window.locator('button[data-testid="btn-create-table"]').click();
      
      const structureView = window.locator('div[data-testid="active-tab-content"]');
      await expect(structureView).toBeVisible();

      // Set table name
      await window.locator('input[data-testid="input-table-name"]').fill(tableName);

      // Add 'name' column
      await window.locator('button[data-testid="btn-add-column"]').click();
      const nameInputs = window.locator('input[data-testid="input-column-name"]');
      await nameInputs.nth(1).fill('name');
      
      // Add 'age' column
      await window.locator('button[data-testid="btn-add-column"]').click();
      await nameInputs.nth(2).fill('age');

      // Save structure
      await window.locator('button[data-testid="btn-save-structure"]').click();
      
      // Should show Preview modal first
      const executeBtn = window.locator('button[data-testid="btn-execute-sql"]');
      await expect(executeBtn).toBeVisible({ timeout: 10000 });
      await executeBtn.click();
      
      // Wait for the structure view tab to close
      await expect(window.locator(`div[data-testid="tab-table-Structure: ${tableName}"]`)).not.toBeVisible({ timeout: 15000 });

      // 2. Refresh sidebar and open the table
      await window.locator('button[data-testid="btn-refresh-tables"]').click();
      const tableItem = window.locator(`div[data-testid="table-item-${tableName}"]`);
      await expect(tableItem).toBeVisible();
      await tableItem.click();

      // 3. Create (Add Row)
      const tableTab = window.locator(`div[data-testid="tab-table-${tableName}"]`);
      await expect(tableTab).toBeVisible();

      const grid = window.locator('div[data-testid="results-scroll"]');
      // Ensure table is loaded and showing empty state
      await expect(window.locator('text=No data found')).toBeVisible();

      await grid.click({ button: 'right' });
      await window.locator('button:has-text("Add Row")').click();
      
      // Fill the new row inputs at the bottom
      await window.locator('input[placeholder="name"]').fill('Test_User');
      await window.locator('input[placeholder="age"]').fill('30');
      await window.locator('button[data-testid="btn-save-row"]').click();
      
      // Verify row 1
      const cell = window.locator('td[data-testid="cell-name-0"]');
      await expect(cell).toHaveText('Test_User');

      // 4. Update
      await cell.click();
      await cell.dblclick();
      
      const editModal = window.locator('textarea[data-testid="edit-textarea"]');
      await expect(editModal).toBeVisible({ timeout: 10000 });
      await editModal.fill('Updated_User');
      await window.locator('button:has-text("Save Changes")').click();
      
      await expect(cell).toHaveText('Updated_User');

      // 5. Delete
      await cell.click({ button: 'right' });
      await window.locator('button:has-text("Delete Row")').click();
      
      // Wait for custom confirm modal
      await expect(window.locator('button[data-testid="btn-confirm-ok"]')).toBeVisible({ timeout: 10000 });
      await window.locator('button[data-testid="btn-confirm-ok"]').click();

      // Verify gone
      await expect(cell).not.toBeVisible({ timeout: 10000 });

      // 6. Cleanup (Drop Table via UI)
      await tableItem.locator('button').click(); // Trash icon
      await expect(window.locator('button[data-testid="btn-confirm-ok"]')).toBeVisible({ timeout: 10000 });
      await window.locator('button[data-testid="btn-confirm-ok"]').click();

      await expect(tableItem).not.toBeVisible({ timeout: 10000 });
    });
  });
}
