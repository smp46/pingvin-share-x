import { test, expect } from '@playwright/test';
import { loadCredentials } from './auth.utils';

test('test', async ({ page }) => {
  const credentials = loadCredentials();

  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).fill(credentials.username);
  await page.getByRole('textbox', { name: 'Email or username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(credentials.password);
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  
  // Wait for either the admin intro or the upload page
  await page.waitForURL(/\/(admin\/intro|upload)/);
  const url = page.url();
  expect(url).toMatch(/\/(admin\/intro|upload)/);

  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});