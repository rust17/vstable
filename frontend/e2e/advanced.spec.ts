import * as os from 'os';
import { expect, test } from './fixture';

test.describe('Advanced Features Tests', () => {
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
      timeout: 10000,
    });
    // Give the workspace time to mount and register global keyboard shortcuts
    await page.waitForTimeout(500);
  });

  test('A-01: SQL Console Execution', async ({ page }) => {
    await page.keyboard.press(`${mod}+t`);

    const activeTab = page.locator('div[data-testid="active-tab-content"]');
    const runQueryBtn = activeTab.locator('button[data-testid="btn-run-query"]');
    await expect(runQueryBtn).toBeVisible({ timeout: 10000 });

    const editor = activeTab.locator('.monaco-editor').last();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText('SELECT 1 as col1, 2 as col2;');

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

  test('A-02, A-03: Pagination and Sorting', async ({ page }) => {
    const tableName = 'advanced_test_table_ps';

    // 1. Setup Data via SQL Console
    await page.keyboard.press(`${mod}+t`);
    let activeTab = page.locator('div[data-testid="active-tab-content"]');
    await expect(activeTab.locator('button[data-testid="btn-run-query"]')).toBeVisible({ timeout: 10000 });
    const editor = activeTab.locator('.monaco-editor').last();

    const statements = [
      `DROP TABLE IF EXISTS ${tableName};`,
      `CREATE TABLE ${tableName} (id serial primary key, price numeric);`,
      `INSERT INTO ${tableName} (price) SELECT i FROM generate_series(1, 105) s(i);`,
    ];

    for (const sql of statements) {
      await editor.click();
      await page.keyboard.press(`${mod}+a`);
      await page.keyboard.press('Backspace');
      await page.keyboard.insertText(sql);
      await activeTab.locator('button[data-testid="btn-run-query"]').click();
      await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 15000 });
      await expect(activeTab.locator('div.text-red-600')).not.toBeVisible();
    }

    // 2. Open Table
    await page.locator('button[data-testid="btn-refresh-tables"]').click();
    const tableItem = page.locator(`div[data-testid="table-item-${tableName}"]`);
    await expect(tableItem).toBeVisible();
    await tableItem.click();

    // Re-locate activeTab as it changed to the table tab
    activeTab = page.locator('div[data-testid="active-tab-content"]');

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

    // Cleanup
    await tableItem.hover();
    await tableItem.locator('button').click();
    await page.locator('button[data-testid="btn-confirm-ok"]').click();
  });

  test('A-04: Filtering and Operators', async ({ page }) => {
    const tableName = 'filter_test_table';

    // 1. Setup Data via SQL Console
    await page.keyboard.press(`${mod}+t`);
    let activeTab = page.locator('div[data-testid="active-tab-content"]');
    await expect(activeTab.locator('button[data-testid="btn-run-query"]')).toBeVisible({ timeout: 10000 });
    const editor = activeTab.locator('.monaco-editor').last();

    const statements = [
      `DROP TABLE IF EXISTS ${tableName};`,
      `CREATE TABLE ${tableName} (id serial primary key, price numeric);`,
      `INSERT INTO ${tableName} (price) SELECT i FROM generate_series(1, 105) s(i);`,
      `INSERT INTO ${tableName} (price) VALUES (NULL);`,
    ];

    for (const sql of statements) {
      await editor.click();
      await page.keyboard.press(`${mod}+a`);
      await page.keyboard.press('Backspace');
      await page.keyboard.insertText(sql);
      await activeTab.locator('button[data-testid="btn-run-query"]').click();
      await expect(activeTab.locator('text=Loading data...')).not.toBeVisible({ timeout: 15000 });
      await expect(activeTab.locator('div.text-red-600')).not.toBeVisible();
    }

    // 2. Open Table
    await page.locator('button[data-testid="btn-refresh-tables"]').click();
    const tableItem = page.locator(`div[data-testid="table-item-${tableName}"]`);
    await expect(tableItem).toBeVisible();
    await tableItem.click();

    activeTab = page.locator('div[data-testid="active-tab-content"]');

    // 3. Filtering setup
    await activeTab.locator('button[data-testid="btn-add-filter"]').click();

    // Column Dropdown
    const colDropdown = activeTab.locator('div[data-testid="filter-column-0"]');
    await colDropdown.click();
    await colDropdown
      .locator('div')
      .filter({ hasText: /^price$/ })
      .click();

    const opDropdown = activeTab.locator('div[data-testid="filter-operator-0"]');
    const valueInput = activeTab.locator('input[data-testid="filter-value-input"]');

    // 4. Test `>` operator
    await opDropdown.click();
    await opDropdown.locator('div').filter({ hasText: /^>$/ }).click();
    await valueInput.fill('100');
    await page.keyboard.press('Enter');
    await expect(activeTab.locator('tbody tr')).toHaveCount(5, { timeout: 10000 });

    // 5. Test `BETWEEN` operator
    await opDropdown.click();
    await opDropdown
      .locator('div')
      .filter({ hasText: /^BETWEEN$/ })
      .click();
    await valueInput.fill('10');
    await activeTab.locator('input[data-testid="filter-value2-0"]').fill('15');
    await page.keyboard.press('Enter');
    await expect(activeTab.locator('tbody tr')).toHaveCount(6, { timeout: 10000 });

    // 6. Test `IN` operator
    await opDropdown.click();
    await opDropdown.locator('div').filter({ hasText: /^IN$/ }).click();
    await valueInput.fill('20, 21, 22');
    await page.keyboard.press('Enter');
    await expect(activeTab.locator('tbody tr')).toHaveCount(3, { timeout: 10000 });

    // 7. Test `NOT IN` operator
    await opDropdown.click();
    await opDropdown
      .locator('div')
      .filter({ hasText: /^NOT IN$/ })
      .click();
    await valueInput.fill('1, 2, 3');
    await page.keyboard.press('Enter');
    // Total is 105 non-null, minus 3 = 102. Current page should show 100.
    await expect(activeTab.getByText('Total: 102')).toBeVisible({ timeout: 10000 });

    // 8. Test `IS NULL` operator
    await opDropdown.click();
    await opDropdown
      .locator('div')
      .filter({ hasText: /^IS NULL$/ })
      .click();
    // Simulate refresh shortcut to apply since input is hidden
    await page.keyboard.press(`${mod}+r`);
    await expect(activeTab.locator('tbody tr')).toHaveCount(1, { timeout: 10000 });

    // 9. Test `IS NOT NULL` operator
    await opDropdown.click();
    await opDropdown
      .locator('div')
      .filter({ hasText: /^IS NOT NULL$/ })
      .click();
    // Simulate refresh
    await page.keyboard.press(`${mod}+r`);
    // Non-null rows = 105. Current page shows 100.
    await expect(activeTab.getByText('Total: 105')).toBeVisible({ timeout: 10000 });

    // Cleanup
    await tableItem.hover();
    await tableItem.locator('button').click();
    await page.locator('button[data-testid="btn-confirm-ok"]').click();
  });
});
