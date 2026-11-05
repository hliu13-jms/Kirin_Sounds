(() => {
  'use strict';
  const supported = new Set(['en', 'zh', 'ja']);
  let saved = '';
  try { saved = localStorage.getItem('kirin-language') || ''; } catch {}
  const requested = new URLSearchParams(location.search).get('lang') || saved;
  const setLanguage = value => {
    const language = supported.has(value) ? value : 'en';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState(null, '', url);
    try { localStorage.setItem('kirin-language', language); } catch {}
  };
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  setLanguage(requested);
})();
