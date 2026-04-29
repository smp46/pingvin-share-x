import { test, expect } from '@playwright/test';
import { generateRandomCredentials, saveCredentials } from './auth.utils';
import { execSync } from 'child_process';
import path from 'path';

test.beforeAll(async () => {
  // Reset the database before starting the signup test sequence
  // This ensures that the first user signed up in each project becomes the admin
  console.log('Resetting database...');
  try {
    const backendDir = path.resolve(__dirname, '../../../backend');
    execSync('rm -rf data && npx prisma db push --force-reset && npx prisma db seed', { cwd: backendDir });
    console.log('Database reset successful.');
  } catch (error) {
    console.error('Failed to reset database:', error);
  }
});

test('test', async ({ page }) => {
  const credentials = generateRandomCredentials();
  saveCredentials(credentials);

  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(credentials.username);
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(credentials.password);
  await page.getByRole('button', { name: 'Let\'s get started' }).click();
  
  // Wait for either the admin intro (first user) or the upload page (subsequent users)
  await page.waitForURL(/\/(admin\/intro|upload)/);
  const url = page.url();
  expect(url).toMatch(/\/(admin\/intro|upload)/);
});