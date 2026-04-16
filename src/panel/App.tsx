import { useMemo, useState } from 'react';
import { detectLocale, type Locale, t } from '../i18n';

export function App() {
  const initialLocale = useMemo(() => detectLocale(), []);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  return (
    <main>
      <label>
        {t(locale, 'language.label')}
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </label>
      <h1>{t(locale, 'app.title')}</h1>
      <p>{t(locale, 'app.subtitle')}</p>
      <p>{t(locale, 'status.localOnly')}</p>
    </main>
  );
}
