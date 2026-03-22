import { expect, test } from './fixture';

test.describe('Connection Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Ensure engine is pingable through our mock bridge
    await expect(async () => {
      const pingOk = await page.evaluate(() =>
        (window as any).__TAURI_INTERNALS__.invoke('engine_ping').catch(() => false)
      );
      expect(pingOk).toBeTruthy();
    }).toPass({ timeout: 15000 });
  });

  test('C-01 PostgreSQL Connection: Valid credentials', async ({ page }) => {
    const form = page.locator('form[data-testid="connection-form"]');
    await expect(form).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("PostgreSQL")').click();
    await page.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await page.locator('input[data-testid="input-port"]').fill('5433');
    await page.locator('input[data-testid="input-user"]').fill('root');
    await page.locator('input[data-testid="input-password"]').fill('password');
    await page.locator('input[data-testid="input-database"]').fill('vstable_test');

    await page.locator('button[data-testid="btn-connect"]').click();
    await expect(form).not.toBeVisible({ timeout: 10000 });
  });

  test('C-02 MySQL Connection: Valid credentials', async ({ page }) => {
    const form = page.locator('form[data-testid="connection-form"]');
    await page.locator('button:has-text("MySQL")').click();
    await page.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await page.locator('input[data-testid="input-port"]').fill('3307');
    await page.locator('input[data-testid="input-user"]').fill('root');
    await page.locator('input[data-testid="input-password"]').fill('password');
    await page.locator('input[data-testid="input-database"]').fill('vstable_test');

    await page.locator('button[data-testid="btn-connect"]').click();
    await expect(form).not.toBeVisible({ timeout: 10000 });
  });

  test('R-02 Connection Failure: Invalid credentials', async ({ page }) => {
    await page.locator('button:has-text("PostgreSQL")').click();
    await page.locator('input[data-testid="input-host"]').fill('127.0.0.1');
    await page.locator('input[data-testid="input-port"]').fill('5433');
    await page.locator('input[data-testid="input-user"]').fill('root');
    await page.locator('input[data-testid="input-password"]').fill('wrong_password');
    await page.locator('input[data-testid="input-database"]').fill('vstable_test');

    await page.locator('button[data-testid="btn-connect"]').click();

    // 验证内联错误消息出现
    const errorMsg = page.locator('div.text-red-600');
    await expect(errorMsg).toBeVisible({ timeout: 10000 });

    // 表单依然可见
    await expect(page.locator('form[data-testid="connection-form"]')).toBeVisible();
  });
});
