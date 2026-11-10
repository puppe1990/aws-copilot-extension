import { faker } from '@faker-js/faker'
import { isClassicContentScriptSource } from './contentBundleFormat'

it('rejects an ESM content bundle that Chrome cannot inject as a content script', () => {
  const chunk = faker.string.alphanumeric({ length: 8 })
  const source = `import{overlayLabels as s}from"./assets/contentGuideCatalog-${chunk}.js";console.info("loaded")`

  expect(isClassicContentScriptSource(source)).toBe(false)
})

it('accepts an IIFE content bundle with no ESM import or export', () => {
  const source = `(function(){"use strict";console.info(${JSON.stringify(faker.lorem.word())});})();`

  expect(isClassicContentScriptSource(source)).toBe(true)
})
