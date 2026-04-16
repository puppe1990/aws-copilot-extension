import { expect, test } from '@playwright/test';

test('panel renders localized guide content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AWS Copilot' })).toBeVisible();
  await page.getByLabel('Language').selectOption('pt-BR');
  await expect(page.getByText('Roda localmente. Sem chamadas à API da AWS.')).toBeVisible();
});

test('fixture pages contain target fields used by guide selectors', async ({ page }) => {
  await page.goto('/tests/fixtures/aws-console-s3.html');
  await expect(page.locator('input[name="bucketName"]')).toBeVisible();

  await page.goto('/tests/fixtures/aws-console-iam.html');
  await expect(page.locator('textarea')).toBeVisible();
});
