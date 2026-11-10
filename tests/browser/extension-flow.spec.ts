import { chromium, expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function fixtureUrl(name: string): string {
  return pathToFileURL(path.resolve('tests/fixtures', name)).href
}

test('panel renders localized guide content', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'AWS Copilot' })).toBeVisible()
  await page.getByLabel('Language').selectOption('pt-BR')
  await expect(page.getByText('Roda localmente. Sem chamadas à API da AWS.')).toBeVisible()
})

test('fixture pages contain target fields used by guide selectors', async ({ page }) => {
  await page.goto(fixtureUrl('aws-console-s3.html'))
  await expect(page.locator('input[name="bucketName"]')).toBeVisible()

  await page.goto(fixtureUrl('aws-console-iam.html'))
  await expect(page.locator('[aria-label="Policy JSON"]')).toBeVisible()
})

test('built extension loads a content script on a routed AWS console fixture without external requests', async () => {
  const distPath = path.resolve('dist')
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aws-copilot-extension-'))
  const fixtureHtml = await fs.readFile(path.resolve('tests/fixtures/aws-console-s3.html'), 'utf8')
  const externalRequests: string[] = []

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`],
  })

  try {
    await context.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url())
      if (requestUrl.protocol === 'chrome-extension:') {
        await route.continue()
        return
      }

      if (
        requestUrl.protocol === 'https:' &&
        requestUrl.hostname === 's3.console.aws.amazon.com' &&
        requestUrl.pathname === '/s3/bucket/create'
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: fixtureHtml,
        })
        return
      }

      externalRequests.push(route.request().url())
      await route.abort()
    })

    const page = await context.newPage()
    const contentScriptLoaded = page.waitForEvent('console', {
      predicate: (message) => message.text().includes('[AWS Copilot] content script loaded'),
    })

    await page.goto('https://s3.console.aws.amazon.com/s3/bucket/create')
    await contentScriptLoaded
    await expect(page.locator('input[name="bucketName"]')).toBeVisible()

    expect(externalRequests).toEqual([])
  } finally {
    await context.close()
    await fs.rm(userDataDir, { recursive: true, force: true })
  }
})
