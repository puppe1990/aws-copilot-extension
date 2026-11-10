export function isClassicContentScriptSource(source: string): boolean {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return !/^\s*import\b/m.test(stripped) && !/\bexport\s*\{/.test(stripped)
}
