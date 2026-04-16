const sensitiveSelectorPatterns = [
  /password/i,
  /secret/i,
  /accesskey/i,
  /access-key/i,
  /credential/i,
  /token/i
];

export function isSensitiveSelector(selector: string): boolean {
  return sensitiveSelectorPatterns.some((pattern) => pattern.test(selector));
}

export function assertSafeSelector(selector: string): void {
  if (isSensitiveSelector(selector)) {
    throw new Error('Refusing to target sensitive AWS fields');
  }
}

export function isExternalUrlAllowed(_url: string): boolean {
  return false;
}
