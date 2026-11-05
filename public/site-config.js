(() => {
  'use strict';
  const hostedOrigin = 'https://kirinsounds-portfolio.kirinsounds.chatgpt.site';
  const portfolioOrigin = 'https://kirinsounds.art';
  const publicHosts = new Set(['hliu13-jms.github.io', 'kirinsounds.art', 'www.kirinsounds.art']);
  const staticFrontend = publicHosts.has(location.hostname.toLowerCase());
  const hostedStudio = location.origin === hostedOrigin;
  const adminPage = /^\/admin(?:\/|\/index\.html)?$/.test(location.pathname);
  const normalizeLanguage = value => ['en', 'zh', 'ja'].includes(value) ? value : 'en';
  const portfolioUrl = language => {
    const url = new URL('/', staticFrontend || hostedStudio ? portfolioOrigin : location.origin);
    url.searchParams.set('lang', normalizeLanguage(language));
    return url.href;
  };
  const publicApiUrl = path => {
    if (!['/api/content', '/api/subscribe'].includes(path)) throw new Error('This endpoint is not a public portfolio endpoint.');
    return staticFrontend ? hostedOrigin + path : path;
  };
  const adminApiUrl = path => {
    if (!adminPage || !/^\/api\/(?:auth\/(?:status|login|logout)|admin\/(?:content|upload|subscribers(?:\.csv|\/[a-zA-Z0-9-]+)?))$/.test(path)) throw new Error('This endpoint is not available here.');
    return staticFrontend ? hostedOrigin + path : path;
  };
  const mediaUrl = value => {
    if (typeof value !== 'string') return value;
    if (adminPage && /^\/?assets\//.test(value)) return '/' + value.replace(/^\//, '');
    if (!staticFrontend) return value;
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
    const url = new URL('/admin/', location.origin);
    url.searchParams.set('lang', lang);
    return url.href;
  };
  window.PORTFOLIO_SITE = Object.freeze({
    staticFrontend,
    hostedStudio,
    adminPage,
    publicApiOrigin: staticFrontend ? hostedOrigin : '',
    publicCredentials: staticFrontend ? 'omit' : 'same-origin',
    publicApiUrl,
    adminApiUrl,
    mediaUrl,
    normalizeContent,
    studioUrl,
    portfolioUrl
  });
})();
