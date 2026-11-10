import { assertSafeSelector, isSensitiveSelector, isExternalUrlAllowed } from './safetyRules'

it('blocks sensitive credential selectors', () => {
  expect(isSensitiveSelector('input[name="secretAccessKey"]')).toBe(true)
  expect(isSensitiveSelector('input[type="password"]')).toBe(true)
})

it('allows normal AWS console fields', () => {
  expect(isSensitiveSelector('input[name="bucketName"]')).toBe(false)
})

it('throws when a guide tries to target sensitive fields', () => {
  expect(() => assertSafeSelector('input[type="password"]')).toThrow(
    'Refusing to target sensitive AWS fields',
  )
})

it('does not allow external network URLs in MVP', () => {
  expect(isExternalUrlAllowed('https://api.example.com')).toBe(false)
  expect(isExternalUrlAllowed('https://s3.console.aws.amazon.com')).toBe(false)
})
