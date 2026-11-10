import { detectLocale, t, translationKeys } from './index'

it('detects pt-BR from browser language', () => {
  expect(detectLocale(['pt-BR', 'en-US'])).toBe('pt-BR')
})

it('detects en as fallback for unsupported language', () => {
  expect(detectLocale(['fr-FR'])).toBe('en')
})

it('falls back to English when a locale key is missing', () => {
  expect(t('pt-BR', 'app.title')).toBe('AWS Copilot')
})

it('interpolates values in localized strings', () => {
  expect(t('en', 'guide.s3Iam.stepBucketName.body', { bucketName: 'my-app-uploads' })).toContain(
    'my-app-uploads',
  )
})

it('has matching translation keys for en and pt-BR', () => {
  expect(translationKeys('pt-BR')).toEqual(translationKeys('en'))
})
