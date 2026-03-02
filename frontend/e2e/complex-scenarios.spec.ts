import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const testConfigs = [
  {
    dialect: 'PostgreSQL',
    port: '5433',
    tableName: 'complex_pg_test',
    columns: [
      { name: 'id', type: 'uuid', isPk: true },
      { name: 'data', type: 'jsonb' },
      { name: 'price', type: 'numeric' },
      { name: 'created_at', type: 'timestamp' }
    ],
    invalidData: { id: 'not-a-uuid', data: '{}', price: '10.50', created_at: '2023-01-01 00:00:00' },
    validData: { id: '550e8400-e29b-41d4-a716-446655440000', data: '{"key": "val"}', price: '123.45', created_at: '2023-10-27 10:00:00' },
    batchInsert: (table: string) => `INSERT INTO ${table} (id, data, price, created_at) SELECT gen_random_uuid(), '{}', i, now() FROM generate_series(1, 105) s(i);`,
    expectedFilterCount: 6
  },
  {
    dialect: 'MySQL',
    port: '3307',
    tableName: 'complex_mysql_test',
    columns: [
      { name: 'id', type: 'int', isPk: true },
      { name: 'data', type: 'json' },
      { name: 'price', type: 'decimal' },
      { name: 'created_at', type: 'datetime' }
    ],
    invalidData: { id: 'not-an-int', data: 'invalid-json', price: 'abc', created_at: 'invalid-date' },
    validData: { id: '1', data: '{"key": "val"}', price: '123.45', created_at: '2023-10-27 10:00:00' },
    batchInsert: (table: string) => {
        let sql = `INSERT INTO ${table} (id, data, price, created_at) VALUES `;
        const values = [];
        for (let i = 2; i <= 106; i++) {
            values.push(`(${i}, '{}', ${i}, NOW())`);
        }
        return sql + values.join(',') + ';';
    },
    expectedFilterCount: 7
  }
];

for (const config of testConfigs) {
  test.describe(`${config.dialect} Complex Scenario E2E Tests`, () => {
    let electronApp: ElectronApplication;
    let window: Page;
    let userDataDir: string;

    test.beforeEach(async () => {
      userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `quickpg-e2e-complex-${config.dialect.toLowerCase()}-`));
      electronApp = await electron.launch({
        args: ['.', `--user-data-dir=${userDataDir}`]
      });
      window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');

      // Wait for Go engine
      await expect(async () => {
        const response = await window.request.get('http://127.0.0.1:39082/api/ping');
        expect(response.ok()).toBeTruthy();
      }).toPass({ timeout: 15000 });

      // Connect
      const form = window.locator('form[data-testid="connection-form"]');
      await window.locator(`button:has-text("${config.dialect}")`).click();
      await window.locator('input[data-testid="input-host"]').fill('127.0.0.1');
      await window.locator('input[data-testid="input-port"]').fill(config.port);
      await window.locator('input[data-testid="input-user"]').fill('root');
      await window.locator('input[data-testid="input-password"]').fill('password');
      await window.locator('input[data-testid="input-database"]').fill('quickpg_test');
      await window.locator('button[data-testid="btn-connect"]').click();
      await expect(form).not.toBeVisible({ timeout: 10000 });
    });

    test.afterEach(async () => {
      if (electronApp) await electronApp.close();
      if (userDataDir && fs.existsSync(userDataDir)) {
          try {
              fs.rmSync(userDataDir, { recursive: true, force: true });
          } catch (e) {}
      }
    });

    test(`Full lifecycle of ${config.dialect} table`, async () => {
      test.setTimeout(60000); // Increase timeout for this complex test
      const { tableName, columns } = config;

      // 1. Schema Design
      await window.locator('button[data-testid="btn-create-table"]').click();
      await window.locator('input[data-testid="input-table-name"]').fill(tableName);

      for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          if (i > 0) {
              await window.locator('button[data-testid="btn-add-column"]').click();
          }

          const row = window.locator('tbody tr').nth(i);
          const colInput = row.locator('input[data-testid="input-column-name"]');
          await colInput.fill(col.name);

          // Select Type - Target the button inside the 3rd cell (Type column)
          const typeBtn = row.locator('td').nth(2).locator('button');
          await typeBtn.click();

          const searchInput = window.locator('input[placeholder="Search type..."]');
          await expect(async () => {
              if (!await searchInput.isVisible()) {
                  await typeBtn.click();
              }
              await expect(searchInput).toBeVisible();
          }).toPass({ timeout: 10000 });

          await searchInput.click();
          await window.keyboard.type(col.type);

          // Click the type in the dropdown - wait for it to be visible after typing
          const typeInList = window.locator(`#type-selector-portal button:has-text("${col.type}")`).first();
          await expect(typeInList).toBeVisible({ timeout: 5000 });
          await typeInList.click();
          await expect(window.locator('#type-selector-portal')).not.toBeVisible(); // Confirm dropdown closed

          // Primary Key - It's the Key icon in the 8th cell (index 7)
          if (col.isPk !== undefined) {
              const pkCell = row.locator('td').nth(7);
              const pkIcon = pkCell.locator('div');
              const isCurrentlyPk = await pkIcon.evaluate(el => el.classList.contains('text-amber-500'));
              if (col.isPk !== isCurrentlyPk) {
                  await pkCell.click();
              }
          }

          // Length for varchar (MySQL)
          if (col.length) {
              const lengthInput = row.locator('input[placeholder="Len"]');
              await lengthInput.fill(col.length);
          }
      }

      await window.locator('button[data-testid="btn-save-structure"]').click();
      const executeBtn = window.locator('button[data-testid="btn-execute-sql"]');
      await expect(executeBtn).toBeVisible({ timeout: 10000 });
      await executeBtn.click();

      // Wait for the structure tab to disappear, confirming DDL was sent
      const structureTab = window.locator(`div[data-testid="tab-table-Structure: ${tableName}"]`);
      await expect(structureTab).not.toBeVisible({ timeout: 20000 });

      // 2. Open Table - with retry for visibility
      await window.locator('button[data-testid="btn-refresh-tables"]').click();
      const tableItem = window.locator(`div[data-testid="table-item-${tableName}"]`);
      await expect(async () => {
          if (!await tableItem.isVisible()) {
              await window.locator('button[data-testid="btn-refresh-tables"]').click();
          }
          await expect(tableItem).toBeVisible();
      }).toPass({ timeout: 15000 });
      await tableItem.click();

      // 3. Negative Test (Constraint Violation)
      const grid = window.locator('div[data-testid="results-scroll"]');
      await expect(grid).toBeVisible();

      // Right click on grid to show context menu
      await grid.click({ button: 'right' });
      await window.locator('button:has-text("Add Row")').click();

      // Fill invalid data
      for (const [key, value] of Object.entries(config.invalidData)) {
          const input = window.locator(`input[placeholder="${key}"]`);
          if (await input.isVisible()) {
              await input.fill(value as string);
          }
      }

      await window.locator('button[data-testid="btn-save-row"]').click();

      // Wait for and click custom AlertModal OK button
      const alertOkBtn = window.locator('button[data-testid="btn-alert-ok"]');
      await expect(alertOkBtn).toBeVisible({ timeout: 10000 });
      await alertOkBtn.click();

      await window.locator('button[data-testid="btn-cancel-row"]').click().catch(() => {});

      // 4. Positive Test
      await grid.click({ button: 'right' });
      await window.locator('button:has-text("Add Row")').click();
      for (const [key, value] of Object.entries(config.validData)) {
          const input = window.locator(`input[placeholder="${key}"]`);
          if (await input.isVisible()) {
              await input.fill(value as string);
          }
      }
      await window.locator('button[data-testid="btn-save-row"]').click();

      // Verify exactly 1 row exists
      await expect(window.locator('tbody tr')).toHaveCount(1, { timeout: 10000 });

      const mod = os.platform() === 'darwin' ? 'Meta' : 'Control';
      // 5. Batch Insert via SQL Console - Use keyboard shortcut to open new query tab
      await window.keyboard.press(`${mod}+t`);
      const runQueryBtn = window.locator('button[data-testid="btn-run-query"]');
      await expect(runQueryBtn).toBeVisible({ timeout: 10000 });

      // Click into the editor and type
      const editor = window.locator('.monaco-editor').last();
      await expect(editor).toBeVisible({ timeout: 15000 });
      await editor.click();

      // Clear existing content
      await window.keyboard.press(`${mod}+a`);
      await window.keyboard.press('Backspace');

      // Use insertText instead of type to avoid mangling
      await window.keyboard.insertText(config.batchInsert(tableName));
      await runQueryBtn.click();

      // Wait for query results
      await expect(window.locator('text=rows')).toBeVisible({ timeout: 15000 });

      // 6. Pagination Check
      // Go back to the table tab
      await window.locator(`div[data-testid="tab-table-${tableName}"]`).click();
      // Need a refresh to see the 100+ rows - use keyboard shortcut Cmd+R / Ctrl+R
      await window.keyboard.press(`${mod}+r`);

      const pagination = window.locator('[data-testid="select-page-size"]');
      await expect(pagination).toBeVisible();

      const nextBtn = window.locator('button[data-testid="btn-next-page"]');
      await expect(nextBtn).not.toBeDisabled();

      // 7. Filtering & Sorting
      // Sort by price DESC
      const priceHeader = window.locator('th:has-text("price")');
      await priceHeader.click();
      await priceHeader.click();

      // Filter: price > 100
      await window.locator('button[data-testid="btn-add-filter"]').click();

      // Column Dropdown (CustomDropdown)
      const columnDropdown = window.locator('div[data-testid="filter-column-0"]');
      await columnDropdown.click();
      await columnDropdown.locator('div').filter({ hasText: /^price$/ }).click();

      // Operator Dropdown (CustomDropdown)
      const operatorDropdown = window.locator('div[data-testid="filter-operator-0"]');
      await operatorDropdown.click();
      await operatorDropdown.locator('div').filter({ hasText: /^>$/ }).click();

      // Value Input
      const filterValueInput = window.locator('input[data-testid="filter-value-input"]');
      await filterValueInput.fill('100');
      await window.keyboard.press('Enter');

      // Verify exact count of rows matching price > 100
      await expect(window.locator('tbody tr')).toHaveCount(config.expectedFilterCount, { timeout: 10000 });

      // 8. Cleanup
      // Click delete icon (the Trash2 button that appears on hover)
      const deleteBtn = window.locator(`div[data-testid="table-item-${tableName}"] button`);
      await deleteBtn.click();

      // Wait for and click custom ConfirmModal OK button
      const confirmOkBtn = window.locator('button[data-testid="btn-confirm-ok"]');
      await expect(confirmOkBtn).toBeVisible({ timeout: 10000 });
      await confirmOkBtn.click();

      await expect(window.locator(`div[data-testid="table-item-${tableName}"]`)).not.toBeVisible({ timeout: 15000 });
    });
  });
}
