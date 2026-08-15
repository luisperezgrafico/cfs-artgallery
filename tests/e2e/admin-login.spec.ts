import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_ADMIN } from '../../playwright.config';

/**
 * These tests need a browser context with no pre-attached credentials — the
 * `page` fixture always carries the project's httpCredentials (so every other
 * spec is auto-authenticated), which would make the login page redirect away
 * before we could exercise it. A fresh `browser.newContext()` without
 * httpCredentials starts logged out, same trick admin-moderation.spec.ts uses
 * to test the dev role.
 */
async function loggedOutPage(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  return { context, page: await context.newPage() };
}

test.describe('admin login', () => {
  test('visiting /admin without a session redirects to the login page', async ({ browser }) => {
    const { context, page } = await loggedOutPage(browser);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.close();
  });

  test('wrong credentials show an error and do not sign in', async ({ browser }) => {
    const { context, page } = await loggedOutPage(browser);
    await page.goto('/admin/login');

    await page.getByLabel('Username', { exact: true }).fill('nope');
    await page.getByLabel('Password', { exact: true }).fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Incorrect username or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.close();
  });

  test('correct credentials sign in and land on the dashboard', async ({ browser }) => {
    const { context, page } = await loggedOutPage(browser);
    await page.goto('/admin/login');

    await page.getByLabel('Username', { exact: true }).fill(TEST_ADMIN.username);
    await page.getByLabel('Password', { exact: true }).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('admin-main')).toBeVisible();
    await context.close();
  });

  test('"remember" pre-fills the fields on a later visit, without logging in automatically', async ({ browser }) => {
    const { context, page } = await loggedOutPage(browser);
    await page.goto('/admin/login');

    await page.getByLabel('Username', { exact: true }).fill(TEST_ADMIN.username);
    await page.getByLabel('Password', { exact: true }).fill(TEST_ADMIN.password);
    await page.getByLabel('Remember my username and password').check();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.reload();
    await expect(page.getByLabel('Username', { exact: true })).toHaveValue(TEST_ADMIN.username);
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue(TEST_ADMIN.password);
    // Filling the fields is as far as "remember" goes — no auto-submit.
    await expect(page).toHaveURL(/\/admin\/login/);

    await context.close();
  });

  test('logout clears the session', async ({ browser }) => {
    const { context, page } = await loggedOutPage(browser);
    await page.goto('/admin/login');
    await page.getByLabel('Username', { exact: true }).fill(TEST_ADMIN.username);
    await page.getByLabel('Password', { exact: true }).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.close();
  });
});
