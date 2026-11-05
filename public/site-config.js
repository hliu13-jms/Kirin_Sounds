(() => {
  'use strict';
  const hostedOrigin = 'https://kirinsounds-portfolio.kirinsounds.chatgpt.site';
  const portfolioOrigin = 'https://kirinsounds.art';
  const publicHosts = new Set(['hliu13-jms.github.io', 'kirinsounds.art', 'www.kirinsounds.art']);
  const staticFrontend = publicHosts.has(location.hostname.toLowerCase());
  const hostedStudio = location.origin === hostedOrigin;
  const normalizeLanguage = value => ['en', 'zh', 'ja'].includes(value) ? value : 'en';
  const portfolioUrl = language => {
    const url = new URL('/', portfolioOrigin);
    url.searchParams.set('lang', normalizeLanguage(language));
    return url.href;
  };
  const providerPath = (route, returnFlag, language) => {
    if (!hostedStudio) return '';
    const returnQuery = new URLSearchParams({[returnFlag]: '1', lang: normalizeLanguage(language)});
    const query = new URLSearchParams({return_to: '/?' + returnQuery.toString()});
    return route + '?' + query.toString();
  };
  const signInPath = language => providerPath('/signin-with-chatgpt', 'studio', language);
  const signOutPath = language => providerPath('/signout-with-chatgpt', 'portfolio_return', language);
  const returnQuery = new URLSearchParams(location.search);
  const returningToPortfolio = hostedStudio && returnQuery.get('portfolio_return') === '1';
  const publicApiUrl = path => {
    if (!['/api/content', '/api/subscribe'].includes(path)) throw new Error('This endpoint is not a public portfolio endpoint.');
    return staticFrontend ? hostedOrigin + path : path;
  };
  const mediaUrl = value => {
    if (!staticFrontend || typeof value !== 'string') return value;
    // Uploaded media belongs to the persistent backend. Bundled assets belong
    // to this frontend, whose GitHub Pages URL may include a repository path.
    if (/^\/?uploads\//.test(value)) return hostedOrigin + '/' + value.replace(/^\//, '');
    if (value.startsWith('/assets/')) return value.slice(1);
    return value;
  };
  const normalizeContent = content => {
    if (!staticFrontend) return content;
    return {
      ...content,
      projects: Array.isArray(content.projects) ? content.projects.map(project => ({...project, image: mediaUrl(project.image)})) : content.projects,
      audio: Object.fromEntries(Object.entries(content.audio || {}).map(([id, item]) => [id, {...item, src: mediaUrl(item.src)}])),
      photos: Array.isArray(content.photos) ? content.photos.map(photo => {
        const normalized = {...photo, src: mediaUrl(photo.src)};
        if (photo.thumb) normalized.thumb = mediaUrl(photo.thumb);
        if (photo.full) normalized.full = mediaUrl(photo.full);
        return normalized;
      }) : content.photos
    };
  };
  const studioUrl = language => {
    const lang = normalizeLanguage(language);
    const url = new URL('/', hostedOrigin);
    url.searchParams.set('studio', '1');
    url.searchParams.set('lang', lang);
    return url.href;
  };
  window.PORTFOLIO_SITE = Object.freeze({
    staticFrontend,
    hostedStudio,
    returningToPortfolio,
    publicApiOrigin: staticFrontend ? hostedOrigin : '',
    publicCredentials: staticFrontend ? 'omit' : 'same-origin',
    publicApiUrl,
    mediaUrl,
    normalizeContent,
    studioUrl,
    portfolioUrl,
    signInPath,
    signOutPath
  });
  // This fixed same-origin landing is reached after the platform sign-out.
  // Incoming return_to/next/referrer URLs are never forwarded or evaluated.
  if (returningToPortfolio) location.replace(portfolioUrl(returnQuery.get('lang')));
})();
