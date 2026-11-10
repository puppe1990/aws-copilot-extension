import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const contentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/content.js')
const source = readFileSync(contentPath, 'utf8')
const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const isClassic = !/^\s*import\b/m.test(stripped) && !/\bexport\s*\{/.test(stripped)

if (!isClassic) {
  throw new Error(
    `dist/content.js must be a classic IIFE. Chrome injects content scripts as classic scripts, so ESM import/export will never run. File starts with: ${source.slice(0, 80)}`,
  )
}

console.info('content.js is a classic IIFE')
