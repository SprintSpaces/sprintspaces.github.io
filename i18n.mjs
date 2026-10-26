import english from './locales/runtime-en.mjs?v=20261026-i18n1';

// HTML owns the language, so bookmarked URLs always keep their chosen locale.
export function createTranslator(locale = 'pl') {
  const useEnglish = locale.toLowerCase().split('-')[0] === 'en';
  return (source, values = {}) => {
    const text = useEnglish ? (english[source] ?? source) : source;
    return text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
  };
}
