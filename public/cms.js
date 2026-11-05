(() => {
  'use strict';
  const site = window.PORTFOLIO_SITE || {staticFrontend:false,hostedStudio:false,publicApiUrl:path=>path};
  const LANGS = ['en', 'zh', 'ja'];
  const words = {
    en: {
      admin: 'Portfolio studio', subscribe: 'Join the mailing list', close: 'Close', loading: 'Loading…',
      setupTitle: 'Create your local administrator password', setupHelp: 'This local installation has no administrator yet. Create a password for the root account. Use at least 12 characters.',
      loginTitle: 'Administrator sign in', username: 'Username', password: 'Password', confirmPassword: 'Confirm password', setup: 'Create administrator', login: 'Sign in',
      hostedHelp: 'Owner editing uses your authorized ChatGPT account. Sign in to return to this studio. Signing out returns you to kirinsounds.art.', hostedLogin: 'Continue with ChatGPT', refreshAuth: 'Check sign-in status', backToPortfolio: 'Back to portfolio', signingOut: 'Signing out… You will return to kirinsounds.art.',
      profile: 'Profile', projects: 'Projects', audio: 'Audio', photos: 'Photography', subscribers: 'Subscribers', save: 'Save entire website', logout: 'Sign out',
      saved: 'Website saved. The portfolio is refreshing.', unsaved: 'Unsaved changes', savedState: 'All changes saved', discard: 'Discard your unsaved changes and close the studio?',
      name: 'Name', artistName: 'Artist name', intro: 'Introduction', about: 'About', practice: 'Current practice', learning: 'Currently learning', primaryEmail: 'Primary email', secondaryEmail: 'Secondary email', instagram: 'Instagram username', fotoUrl: 'Public Foto URL',
      title: 'Title', id: 'ID', category: 'Category', composition: 'Composition', study: 'Study', image: 'Cover image', status: 'Status', summary: 'Summary', role: 'My role', tools: 'Tools', process: 'Process', note: 'Source / version note',
      addProject: 'Add project', addPhoto: 'Add photograph', addAudio: 'Add audio', delete: 'Delete', removeProject: 'Delete the project “{name}”? This takes effect when you save the website.', removePhoto: 'Delete the photograph “{name}”? This takes effect when you save the website.', removeAudio: 'Delete the audio “{name}” and remove its links from projects? This takes effect when you save the website.',
      newProject: 'Untitled project', newPhoto: 'Untitled photograph', newAudio: 'New audio', src: 'Media URL or site-relative path', caption: 'Caption / image description',
      upload: 'Upload file', uploading: 'Uploading…', uploadHelp: 'Up to 25 MiB. Uploading stores the file; save the website to publish the change.', uploaded: 'File uploaded. Save the website to use it.',
      duration: 'Duration (seconds)', audioHelp: 'Add or edit audio here, then select its ID in a project. A new file can use a simple waveform until one is generated.', projectAudio: 'Audio linked to this project', noAudio: 'No audio yet. Add audio in the Audio tab.',
      noProjects: 'No projects yet.', noPhotos: 'No photographs yet.', noSubscribers: 'The mailing list is empty.', reload: 'Refresh list', export: 'Export CSV', created: 'Joined', removeSubscriber: 'Permanently remove {name} from the mailing list?', deletedSubscriber: 'Subscriber removed.',
      email: 'Email', optionalName: 'Name (optional)', consent: 'I agree to join this mailing list and have my email and optional name stored for that purpose.', website: 'Website (leave blank)', join: 'Join list', subscribeHelp: 'Leave your email to join the list for future updates. Joining the list does not send an automatic newsletter.', joined: 'You have joined the mailing list. Thank you.',
      required: 'Complete the required fields.', mismatch: 'The passwords do not match.', passwordShort: 'Use at least 12 characters for the password.', conflict: 'The website changed elsewhere. Your edits are still here. Close and reopen the studio to load the latest version, then reapply your changes.', sessionExpired: 'Your sign-in may have expired. Your edits remain here; save a copy of your text before closing and signing in again.', requestFailed: 'The request failed', backendUnavailable: 'The editing service is unavailable. Start the included local server or use the hosted website with its backend enabled.', invalidId: 'Use a unique ID containing only letters, numbers, hyphens or underscores.', invalidUrl: 'Use an HTTPS URL or a site-relative media path.', missingMedia: 'Add a media URL or upload a file before saving.', fileTooLarge: 'The file is larger than 25 MiB.', invalidFile: 'Choose a supported image, audio, video or PDF file. HTML, SVG and scripts are not accepted.',
      deleteLinked: 'Deleting an audio entry also removes that ID from project selections.', subscriberNote: 'This area manages the list only. It does not send email.', language: 'Content language', busy: 'Please wait for the current request.', changedSource: 'The audio duration could not be read. Enter its length in seconds before saving.', durationInvalid: 'Enter an audio duration greater than zero, up to 86400 seconds.', ready: 'Ready', selected: 'Selected', moveUp: 'Move up', moveDown: 'Move down'
    },
    zh: {
      admin: '作品集工作室', subscribe: '加入邮件名单', close: '关闭', loading: '载入中…',
      setupTitle: '设置本地管理员密码', setupHelp: '此本地网站尚未设置管理员。请为root账号创建至少12个字符的密码。',
      loginTitle: '管理员登录', username: '用户名', password: '密码', confirmPassword: '再次输入密码', setup: '创建管理员', login: '登录',
      hostedHelp: '网站所有者使用已授权的ChatGPT账号登录编辑。登录后会返回工作室，退出后会回到kirinsounds.art。', hostedLogin: '使用ChatGPT登录', refreshAuth: '检查登录状态', backToPortfolio: '返回作品集', signingOut: '正在退出登录…完成后将返回kirinsounds.art。',
      profile: '个人简介', projects: '作品项目', audio: '音频', photos: '摄影', subscribers: '订阅名单', save: '保存全站', logout: '退出登录',
      saved: '网站已保存，作品集正在刷新。', unsaved: '有未保存的修改', savedState: '修改已全部保存', discard: '放弃尚未保存的修改并关闭工作室？',
      name: '姓名', artistName: '艺名', intro: '简短介绍', about: '个人简介', practice: '当前实践', learning: '正在学习', primaryEmail: '主要邮箱', secondaryEmail: '备用邮箱', instagram: 'Instagram用户名', fotoUrl: 'Foto公开主页链接',
      title: '标题', id: '标识ID', category: '分类', composition: '作曲作品', study: '研究习作', image: '封面图片', status: '作品状态', summary: '项目摘要', role: '我的职责', tools: '工具', process: '创作过程', note: '来源／版本说明',
      addProject: '添加项目', addPhoto: '添加照片', addAudio: '添加音频', delete: '删除', removeProject: '删除项目“{name}”？保存全站后生效。', removePhoto: '删除照片“{name}”？保存全站后生效。', removeAudio: '删除音频“{name}”并取消项目中的对应关联？保存全站后生效。',
      newProject: '未命名项目', newPhoto: '未命名照片', newAudio: '新音频', src: '媒体链接或站内相对路径', caption: '图注／图片描述',
      upload: '上传文件', uploading: '上传中…', uploadHelp: '最大25 MiB。上传会存储文件；保存全站后才会更新展示内容。', uploaded: '文件已上传，保存全站后用于展示。',
      duration: '时长（秒）', audioHelp: '在这里添加或修改音频，再到项目中勾选对应ID。新音频可先使用简易波形。', projectAudio: '此项目关联的音频', noAudio: '还没有音频，请先在“音频”中添加。',
      noProjects: '暂无项目。', noPhotos: '暂无照片。', noSubscribers: '邮件名单暂无订阅者。', reload: '刷新名单', export: '导出CSV', created: '加入时间', removeSubscriber: '将{name}从邮件名单永久删除？', deletedSubscriber: '已移除订阅者。',
      email: '邮箱', optionalName: '姓名（选填）', consent: '我同意加入此邮件名单，并为此保存我的邮箱和选填姓名。', website: '网站（请留空）', join: '加入名单', subscribeHelp: '留下邮箱，加入接收未来消息的名单。加入名单不会自动发送邮件。', joined: '你已加入邮件名单，谢谢。',
      required: '请填写必填内容。', mismatch: '两次输入的密码不一致。', passwordShort: '密码至少需要12个字符。', conflict: '网站已在其他地方更新。你的修改仍保留在这里。关闭并重新打开工作室可读取最新版本，然后重新应用修改。', sessionExpired: '登录状态可能已过期。修改仍在这里；关闭并重新登录前，请先复制保留编辑的文字。', requestFailed: '请求失败', backendUnavailable: '编辑服务暂不可用。请启动附带的本地服务器，或使用已启用后台的线上网站。', invalidId: '请使用唯一ID，仅包含英文字母、数字、连字符或下划线。', invalidUrl: '请使用HTTPS链接或站内相对媒体路径。', missingMedia: '请先填写媒体链接或上传文件，再保存。', fileTooLarge: '文件超过25 MiB。', invalidFile: '请选择支持的图片、音频、视频或PDF文件，不支持HTML、SVG或脚本。',
      deleteLinked: '删除音频条目时，也会取消项目中对应ID的关联。', subscriberNote: '这里仅收集和管理名单，不会发送邮件。', language: '内容语言', busy: '请等待当前请求完成。', changedSource: '无法自动读取音频时长，请在保存前手动填写秒数。', durationInvalid: '请填写大于0且不超过86400秒的音频时长。', ready: '就绪', selected: '已选择', moveUp: '上移', moveDown: '下移'
    },
    ja: {
      admin: 'ポートフォリオ・スタジオ', subscribe: 'メールリストに参加', close: '閉じる', loading: '読み込み中…',
      setupTitle: 'ローカル管理者パスワードを設定', setupHelp: 'このローカルサイトには管理者がまだ登録されていません。rootアカウント用に12文字以上のパスワードを設定してください。',
      loginTitle: '管理者ログイン', username: 'ユーザー名', password: 'パスワード', confirmPassword: 'パスワードを再入力', setup: '管理者を作成', login: 'ログイン',
      hostedHelp: '所有者用の編集には、許可されたChatGPTアカウントでログインします。ログイン後はスタジオに戻り、ログアウト後はkirinsounds.artに戻ります。', hostedLogin: 'ChatGPTでログイン', refreshAuth: 'ログイン状態を確認', backToPortfolio: '作品集に戻る', signingOut: 'ログアウト中…完了後、kirinsounds.artに戻ります。',
      profile: 'プロフィール', projects: 'プロジェクト', audio: '音源', photos: '写真', subscribers: '購読者', save: 'サイト全体を保存', logout: 'ログアウト',
      saved: 'サイトを保存しました。表示を更新しています。', unsaved: '未保存の変更あり', savedState: 'すべて保存済み', discard: '未保存の変更を破棄して閉じますか？',
      name: '名前', artistName: 'アーティスト名', intro: '短い紹介', about: '自己紹介', practice: '現在の制作', learning: '学習中のこと', primaryEmail: '主なメールアドレス', secondaryEmail: '予備メールアドレス', instagram: 'Instagramユーザー名', fotoUrl: 'Foto公開プロフィールURL',
      title: 'タイトル', id: 'ID', category: '分類', composition: '作曲作品', study: 'スタディ', image: 'カバー画像', status: '制作状況', summary: '概要', role: '担当', tools: 'ツール', process: '制作過程', note: '出典・バージョン',
      addProject: 'プロジェクトを追加', addPhoto: '写真を追加', addAudio: '音源を追加', delete: '削除', removeProject: 'プロジェクト「{name}」を削除しますか？サイト保存後に反映されます。', removePhoto: '写真「{name}」を削除しますか？サイト保存後に反映されます。', removeAudio: '音源「{name}」とプロジェクト内の関連づけを削除しますか？サイト保存後に反映されます。',
      newProject: '無題のプロジェクト', newPhoto: '無題の写真', newAudio: '新しい音源', src: 'メディアURLまたはサイト内の相対パス', caption: 'キャプション・画像の説明',
      upload: 'ファイルをアップロード', uploading: 'アップロード中…', uploadHelp: '最大25 MiB。アップロード後、サイトを保存すると表示に反映されます。', uploaded: 'アップロードしました。サイトを保存して反映してください。',
      duration: '長さ（秒）', audioHelp: 'ここで音源を追加・編集し、プロジェクトでIDを選択します。新しい音源は簡易波形で表示できます。', projectAudio: 'このプロジェクトの音源', noAudio: '音源がありません。音源タブで追加してください。',
      noProjects: 'プロジェクトはまだありません。', noPhotos: '写真はまだありません。', noSubscribers: '購読者はまだいません。', reload: 'リストを更新', export: 'CSVを書き出す', created: '登録日', removeSubscriber: '{name}をメールリストから完全に削除しますか？', deletedSubscriber: '購読者を削除しました。',
      email: 'メールアドレス', optionalName: '名前（任意）', consent: 'このメールリストへの登録と、その目的でのメールアドレスおよび任意の名前の保存に同意します。', website: 'ウェブサイト（空欄にしてください）', join: '登録', subscribeHelp: '今後のお知らせのためのリストに参加できます。登録によってメールが自動送信されることはありません。', joined: 'メールリストに登録しました。ありがとうございます。',
      required: '必須項目を入力してください。', mismatch: 'パスワードが一致しません。', passwordShort: 'パスワードは12文字以上にしてください。', conflict: 'サイトは別の場所で更新されました。編集内容はここに残っています。スタジオを閉じて開き直すと最新の状態を取得できます。変更を再適用してください。', sessionExpired: 'ログインの有効期限が切れた可能性があります。編集内容は残っています。閉じて再ログインする前に文章をコピーしてください。', requestFailed: 'リクエストに失敗しました', backendUnavailable: '編集サービスを利用できません。付属のローカルサーバーを起動するか、バックエンドが有効な公開サイトを利用してください。', invalidId: '英数字、ハイフン、アンダースコアのみで一意のIDを入力してください。', invalidUrl: 'HTTPSのURLまたはサイト内の相対パスを入力してください。', missingMedia: '保存前にメディアURLを入力するか、ファイルをアップロードしてください。', fileTooLarge: 'ファイルが25 MiBを超えています。', invalidFile: '対応する画像、音源、動画、PDFを選択してください。HTML、SVG、スクリプトは使用できません。',
      deleteLinked: '音源の削除時に、プロジェクトの関連IDも解除します。', subscriberNote: 'ここではリストの収集・管理のみ行い、メールは送信しません。', language: 'コンテンツの言語', busy: '処理が終わるまでお待ちください。', changedSource: '音源の長さを取得できませんでした。保存前に秒数を入力してください。', durationInvalid: '0より大きく86400秒以下の長さを入力してください。', ready: '準備完了', selected: '選択済み', moveUp: '上へ', moveDown: '下へ'
    }
  };
  const lang = () => document.documentElement.lang.startsWith('zh') ? 'zh' : document.documentElement.lang.startsWith('ja') ? 'ja' : 'en';
  const t = (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), words[lang()][key] || words.en[key] || key);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localized = value => typeof value === 'string' ? value : value?.[lang()] || value?.en || '';
  const emptyText = () => ({en: '', zh: '', ja: ''});
  const clone = value => JSON.parse(JSON.stringify(value));
  const state = {mode: null, auth: null, content: null, revision: null, dirty: false, busy: false, tab: 'profile', subscribers: null, launcher: null, request: 0, focusState: null, renderedTab: null};
  let dialog;

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'cms-dialog';
    dialog.setAttribute('aria-labelledby', 'cms-title');
    dialog.innerHTML = '<div class="cms-shell"></div>';
    document.body.append(dialog);
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('invalid', event => {
      for (let parent=event.target.parentElement;parent && parent!==dialog;parent=parent.parentElement) if(parent.tagName === 'DETAILS')parent.open=true;
    }, true);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) { close(); return; }
      const button = event.target.closest('[data-cms-action]');
      if (button) { event.preventDefault(); act(button.dataset.cmsAction, button); }
    });
    dialog.addEventListener('input', edit);
    dialog.addEventListener('change', event => {
      if (event.target.matches('[data-upload-path]')) upload(event.target);
      else if (event.target.matches('[data-audio-rename]')) renameAudio(event.target);
      else if (event.target.dataset.cmsPath) {
        const path=JSON.parse(event.target.dataset.cmsPath);
        if(path[0] === 'audio' && path[2] === 'src') measureAudioUrl(path);
      }
    });
    dialog.addEventListener('submit', event => {
      event.preventDefault();
      if (state.busy) return;
      const form = event.target;
      if (!form.reportValidity()) return;
      if (form.id === 'cms-auth-form') authenticate(form);
      if (form.id === 'cms-subscribe-form') subscribe(form);
      if (form.id === 'cms-editor-form') save();
    });
    new MutationObserver(() => {
      if (!dialog.open || state.busy) return;
      if (state.mode === 'admin' && state.auth?.authenticated && state.content) renderEditor();
      else if (state.mode === 'admin') renderAuth();
      else if (state.mode === 'subscribe') renderSubscribe();
    }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  }

  function frame(body, footer = '') {
    const back=state.mode === 'admin' && site.hostedStudio ? `<a class="cms-button" style="margin-top:10px;padding:3px 0;min-height:0;border:0;font-size:12px" href="${esc(site.portfolioUrl(lang()))}" target="_top" data-cms-action="back-to-portfolio">← ${t('backToPortfolio')}</a>` : '';
    dialog.querySelector('.cms-shell').innerHTML = `<header class="cms-header"><div><span class="cms-eyebrow">KIRIN / ${state.mode === 'admin' ? 'STUDIO' : 'MAIL'}</span><h1 id="cms-title" tabindex="-1">${t(state.mode === 'admin' ? 'admin' : 'subscribe')}</h1>${back}</div><button class="cms-close" type="button" data-cms-action="close" aria-label="${t('close')}">×</button></header><div id="cms-message" class="cms-message" role="status" aria-live="polite" hidden></div>${body}${footer}`;
  }
  function message(text, error = false) {
    const el = dialog.querySelector('#cms-message');
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle('is-error', error);
    if (error) el.setAttribute('role', 'alert'); else el.setAttribute('role', 'status');
    if (error) el.scrollIntoView({block: 'nearest'});
  }
  function setBusy(value) {
    if (value) state.focusState = captureFocus();
    state.busy = value;
    dialog.setAttribute('aria-busy', String(value));
    dialog.querySelectorAll('input,textarea,select,button').forEach(el => {
      if (el.matches('[data-cms-action="close"]')) return;
      if (value) { el.dataset.cmsWasDisabled = String(el.disabled); el.disabled = true; }
      else if (el.dataset.cmsWasDisabled !== undefined) { el.disabled = el.dataset.cmsWasDisabled === 'true'; delete el.dataset.cmsWasDisabled; }
    });
    if (!value && state.focusState) { restoreFocus(state.focusState); state.focusState=null; }
  }
  function captureFocus() {
    const el=document.activeElement;
    if (!dialog.contains(el)) return null;
    return {el,path:el.dataset?.cmsPath,upload:el.dataset?.uploadPath,action:el.dataset?.cmsAction,tab:el.dataset?.tab,id:el.dataset?.id,index:el.dataset?.index,save:el.getAttribute?.('form') === 'cms-editor-form'};
  }
  function restoreFocus(focus) {
    if (!focus || !dialog.open) return;
    let target=focus.el?.isConnected ? focus.el : null;
    if (!target && focus.path) target=[...dialog.querySelectorAll('[data-cms-path]')].find(el=>el.dataset.cmsPath === focus.path);
    if (!target && focus.upload) target=[...dialog.querySelectorAll('[data-upload-path]')].find(el=>el.dataset.uploadPath === focus.upload);
    if (!target && focus.save) target=dialog.querySelector('[form="cms-editor-form"]');
    if (!target && focus.action) target=[...dialog.querySelectorAll('[data-cms-action]')].find(el=>el.dataset.cmsAction === focus.action && el.dataset.tab === focus.tab && el.dataset.id === focus.id && el.dataset.index === focus.index);
    if (target?.disabled) target=null;
    if (target) for(let parent=target.parentElement;parent && parent!==dialog;parent=parent.parentElement) if(parent.tagName === 'DETAILS')parent.open=true;
    (target || dialog.querySelector('#cms-title'))?.focus({preventScroll:true});
  }
  function markDirty() {
    state.dirty = true;
    const el = dialog.querySelector('#cms-save-state');
    if (el) { el.textContent = t('unsaved'); el.classList.add('is-dirty'); }
  }
  function close() {
    if (state.busy) { message(t('busy')); return; }
    if (state.mode === 'admin' && state.dirty && !window.confirm(t('discard'))) return;
    const returnToPortfolio=state.mode === 'admin' && site.hostedStudio;
    const returnUrl=returnToPortfolio ? site.portfolioUrl(lang()) : '';
    state.request++;
    dialog.close();
    state.mode = null;
    state.content = null;
    state.dirty = false;
    state.subscribers = null;
    state.auth = null;
    dialog.querySelector('.cms-shell').replaceChildren();
    if(returnToPortfolio){navigateTop(returnUrl);return;}
    state.launcher?.focus?.({preventScroll: true});
  }
  function navigateTop(url) {
    const link=document.createElement('a');
    link.href=url;link.target='_top';link.rel='noopener';
    document.body.append(link);link.click();link.remove();
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers);
    const method = String(options.method || 'GET').toUpperCase();
    if (site.staticFrontend && !((path === '/api/content' && method === 'GET') || (path === '/api/subscribe' && method === 'POST'))) throw new Error(t('hostedHelp'));
    if (!site.staticFrontend && method !== 'GET' && state.auth?.csrfToken) headers.set('X-CSRF-Token', state.auth.csrfToken);
    if (options.json !== undefined) { headers.set('Content-Type', 'application/json'); options.body = JSON.stringify(options.json); }
    if (site.staticFrontend) headers.delete('X-CSRF-Token');
    const endpoint = site.staticFrontend ? site.publicApiUrl(path) : path;
    const response = await fetch(endpoint, {...options, method, headers, credentials: site.staticFrontend ? 'omit' : 'same-origin', cache: 'no-store'});
    const isJson = (response.headers.get('Content-Type') || '').includes('application/json');
    const result = isJson ? await response.json() : null;
    if (!response.ok || result?.ok === false) {
      const error = new Error(result?.error?.message || (response.status === 404 || !isJson ? t('backendUnavailable') : `${t('requestFailed')} (${response.status})`));
      error.status = response.status;
      error.code = result?.error?.code;
      throw error;
    }
    if (!isJson) throw new Error(t('backendUnavailable'));
    if (path === '/api/auth/status' && !result.csrfToken) result.csrfToken = response.headers.get('X-CSRF-Token');
    return result;
  }
  function showError(error) {
    let text = error.message || t('requestFailed');
    if (error.status === 409 && state.content) text = `${t('conflict')} ${text}`;
    else if ((error.status === 401 || error.status === 403) && state.content) text = `${t('sessionExpired')} ${text}`;
    message(text, true);
  }

  async function openAdmin(launcher) {
    if (site.staticFrontend) {
      navigateTop(site.studioUrl(lang()));
      return;
    }
    ensureDialog();
    if (dialog.open) return;
    state.mode = 'admin'; state.launcher = launcher || document.activeElement; state.tab = 'profile'; state.dirty = false; state.content = null; state.auth = null; state.subscribers = null;
    frame(`<div class="cms-body"><p>${t('loading')}</p></div>`);
    dialog.showModal();
    const request = ++state.request;
    try {
      const auth = await api('/api/auth/status');
      if (!dialog.open || request !== state.request) return;
      state.auth = auth;
      if (auth.authenticated) await loadEditor(); else renderAuth();
    } catch (error) { if (dialog.open && request === state.request) showError(error); }
  }
  function renderAuth() {
    const a = state.auth;
    if (!a) return;
    if (a.mode === 'hosted') {
      const loginUrl = site.hostedStudio ? site.signInPath(lang()) : safeLink(a.loginUrl);
      frame(`<div class="cms-body cms-auth"><h2>${t('loginTitle')}</h2><p>${t('hostedHelp')}</p>${loginUrl ? `<a class="cms-button cms-primary" href="${esc(loginUrl)}" target="_top" data-cms-provider-login>${t('hostedLogin')} ↗</a>` : ''}<button class="cms-button" type="button" data-cms-action="refresh-auth">${t('refreshAuth')}</button></div>`);
    } else {
      const setup = !a.initialized;
      frame(`<form id="cms-auth-form" class="cms-body cms-auth"><h2>${t(setup ? 'setupTitle' : 'loginTitle')}</h2>${setup ? `<p>${t('setupHelp')}</p>` : ''}<label class="cms-field"><span>${t('username')}</span><input name="username" autocomplete="username" value="root" readonly></label><label class="cms-field"><span>${t('password')}</span><input name="password" type="password" required minlength="${setup ? 12 : 1}" maxlength="1024" autocomplete="${setup ? 'new-password' : 'current-password'}"></label>${setup ? `<label class="cms-field"><span>${t('confirmPassword')}</span><input name="confirmPassword" type="password" required minlength="12" maxlength="1024" autocomplete="new-password"></label>` : ''}<button type="submit" class="cms-button cms-primary">${t(setup ? 'setup' : 'login')}</button></form>`);
    }
    dialog.querySelector('input[name="password"],[data-cms-provider-login],button[data-cms-action="refresh-auth"]')?.focus();
  }
  async function authenticate(form) {
    const fields = new FormData(form);
    const password = fields.get('password');
    const setup = !state.auth.initialized;
    if (setup && password.length < 12) { message(t('passwordShort'), true); return; }
    if (setup && password !== fields.get('confirmPassword')) { message(t('mismatch'), true); return; }
    setBusy(true);
    try {
      await api(setup ? '/api/auth/setup' : '/api/auth/login', {method: 'POST', json: setup ? {password} : {username: 'root', password}});
      form.reset();
      state.auth = await api('/api/auth/status');
      if (state.auth.authenticated) await loadEditor(); else renderAuth();
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  async function loadEditor() {
    const result = await api('/api/content');
    if (!result.content?.profile || !Array.isArray(result.content.projects) || !result.content.audio || !Array.isArray(result.content.photos)) throw new Error(t('requestFailed'));
    state.content = clone(result.content); state.revision = result.revision; state.dirty = false;
    renderEditor();
  }

  function get(path) { return path.reduce((value, part) => value?.[part], state.content); }
  function put(path, value) {
    let target = state.content;
    for (const part of path.slice(0, -1)) {
      if (['__proto__', 'constructor', 'prototype'].includes(String(part))) throw new Error(t('invalidId'));
      if (!target[part] || typeof target[part] !== 'object') target[part] = {};
      target = target[part];
    }
    const final = path.at(-1);
    if (['__proto__', 'constructor', 'prototype'].includes(String(final))) throw new Error(t('invalidId'));
    target[final] = value;
  }
  function field(label, path, options = {}) {
    const value = get(path);
    const common = `data-cms-path="${esc(JSON.stringify(path))}" ${options.required ? 'required' : ''} ${options.readonly ? 'readonly' : ''}`;
    const control = options.multiline
      ? `<textarea rows="${options.rows || 3}" maxlength="10000" ${common}>${esc(value)}</textarea>`
      : `<input type="${options.type || 'text'}" value="${esc(value)}" maxlength="${options.type === 'email' ? 254 : options.maxlength || 2048}" ${options.type === 'number' ? 'min="0" max="86400" step="0.001" data-cms-number' : ''} ${options.pattern ? `pattern="${options.pattern}"` : ''} ${common}>`;
    return `<label class="cms-field"><span>${esc(label)}</span>${control}</label>`;
  }
  function multilingual(key, path, multiline = true) {
    return `<fieldset class="cms-localized"><legend>${t(key)}</legend><div class="cms-language-fields">${LANGS.map(l => `<div class="cms-language-field">${field(l === 'zh' ? '中文' : l === 'ja' ? '日本語' : 'English', [...path, l], {multiline, rows: key === 'summary' || key === 'about' || key === 'process' ? 4 : 2})}</div>`).join('')}</div></fieldset>`;
  }
  function uploadField(label, path, kind) {
    const source = get(path);
    const preview = kind === 'image' && safeMedia(source) ? `<img class="cms-media-preview" src="${esc(source)}" alt="" loading="lazy">` : '';
    const accept = kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/avif' : kind === 'audio' ? 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac,audio/flac,audio/webm' : 'image/jpeg,image/png,image/webp,image/gif,image/avif,audio/*,video/mp4,video/webm,application/pdf';
    return `<div class="cms-upload">${field(label, path, {required: true})}<label class="cms-upload-button"><span>${t('upload')}</span><input type="file" accept="${accept}" data-upload-path="${esc(JSON.stringify(path))}" data-upload-kind="${kind}" aria-label="${esc(t('upload') + ' · ' + label)}"></label>${preview}<p class="cms-hint">${t('uploadHelp')}</p></div>`;
  }
  function profilePanel() {
    const base = ['profile'];
    return `<div class="cms-two-column">${field(t('name'), [...base, 'name'], {required:true, maxlength:160})}${field(t('artistName'), [...base, 'artistName'], {maxlength:160})}</div>${['intro','about','practice','learning'].map(k => multilingual(k, [...base, k])).join('')}<div class="cms-two-column">${field(t('primaryEmail'), [...base, 'primaryEmail'], {type:'email'})}${field(t('secondaryEmail'), [...base, 'secondaryEmail'], {type:'email'})}${field(t('instagram'), [...base, 'instagram'], {maxlength:30,pattern:'[A-Za-z0-9._]+'})}${field(t('fotoUrl'), [...base, 'fotoUrl'])}</div>`;
  }
  function projectPanel() {
    return `<div class="cms-section-tools"><span>${state.content.projects.length} / ${t('projects')}</span><button type="button" class="cms-button" data-cms-action="add-project">＋ ${t('addProject')}</button></div>${state.content.projects.length ? state.content.projects.map((p, i) => `<details class="cms-item" data-cms-item="project-${esc(p.id)}" ${i === state.content.projects.length - 1 && p.id.startsWith('project-') ? 'open' : ''}><summary>${esc(p.title || p.id)}<span>${esc(p.id)}</span></summary><div class="cms-item-body"><div class="cms-row-actions">${orderButtons('project', i, state.content.projects.length)}<button type="button" class="cms-button cms-danger" data-cms-action="delete-project" data-index="${i}">${t('delete')}</button></div><div class="cms-two-column">${field(t('id'), ['projects',i,'id'], {required:true, pattern:'[A-Za-z0-9][A-Za-z0-9_-]{0,79}',maxlength:80})}${field(t('title'), ['projects',i,'title'], {required:true, maxlength:200})}<label class="cms-field"><span>${t('category')}</span><select data-cms-path="${esc(JSON.stringify(['projects',i,'category']))}"><option value="composition" ${p.category === 'composition' ? 'selected' : ''}>${t('composition')}</option><option value="study" ${p.category === 'study' ? 'selected' : ''}>${t('study')}</option></select></label></div>${uploadField(t('image'), ['projects',i,'image'], 'image')}<fieldset class="cms-audio-selection"><legend>${t('projectAudio')}</legend>${Object.keys(state.content.audio).length ? Object.keys(state.content.audio).map(id => `<label><input type="checkbox" data-project-audio="${i}" value="${esc(id)}" ${p.audioIds?.includes(id) ? 'checked' : ''}><span>${esc(id)}</span></label>`).join('') : `<p class="cms-hint">${t('noAudio')}</p>`}</fieldset>${['status','summary','role','tools','process','note'].map(k => multilingual(k, ['projects',i,k], k !== 'status' && k !== 'tools')).join('')}</div></details>`).join('') : `<p>${t('noProjects')}</p>`}`;
  }
  function audioPanel() {
    return `<div class="cms-section-tools"><span>${Object.keys(state.content.audio).length} / ${t('audio')}</span><button type="button" class="cms-button" data-cms-action="add-audio">＋ ${t('addAudio')}</button></div><p class="cms-hint">${t('audioHelp')}</p>${Object.entries(state.content.audio).map(([id, a]) => `<details class="cms-item" data-cms-item="audio-${esc(id)}"><summary>${esc(id)}<span>${Number(a.duration || 0).toFixed(2)} s</span></summary><div class="cms-item-body"><div class="cms-row-actions"><button type="button" class="cms-button cms-danger" data-cms-action="delete-audio" data-id="${esc(id)}">${t('delete')}</button></div><label class="cms-field"><span>${t('id')}</span><input value="${esc(id)}" data-audio-rename="${esc(id)}" pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,79}" maxlength="80" required></label>${uploadField(t('src'), ['audio',id,'src'], 'audio')}${field(t('duration'), ['audio',id,'duration'], {type:'number',required:true})}${safeMedia(a.src) ? `<audio class="cms-audio-preview" controls preload="none" src="${esc(a.src)}"></audio>` : ''}</div></details>`).join('')}`;
  }
  function photoPanel() {
    return `<div class="cms-section-tools"><span>${state.content.photos.length} / ${t('photos')}</span><button type="button" class="cms-button" data-cms-action="add-photo">＋ ${t('addPhoto')}</button></div>${state.content.photos.length ? state.content.photos.map((p, i) => `<details class="cms-item" data-cms-item="photo-${esc(p.id)}"><summary>${esc(localized(p.title) || p.id)}<span>${esc(p.id)}</span></summary><div class="cms-item-body"><div class="cms-row-actions">${orderButtons('photo',i,state.content.photos.length)}<button type="button" class="cms-button cms-danger" data-cms-action="delete-photo" data-index="${i}">${t('delete')}</button></div>${field(t('id'), ['photos',i,'id'], {required:true, pattern:'[A-Za-z0-9][A-Za-z0-9_-]{0,79}',maxlength:80})}${uploadField(t('src'), ['photos',i,'src'], 'image')}${multilingual('title',['photos',i,'title'],false)}${multilingual('caption',['photos',i,'caption'])}</div></details>`).join('') : `<p>${t('noPhotos')}</p>`}`;
  }
  function orderButtons(kind, index, length) {
    return `<button type="button" class="cms-button" data-cms-action="move-${kind}" data-index="${index}" data-step="-1" aria-label="${t('moveUp')}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="cms-button" data-cms-action="move-${kind}" data-index="${index}" data-step="1" aria-label="${t('moveDown')}" ${index === length - 1 ? 'disabled' : ''}>↓</button>`;
  }
  function subscribersPanel() {
    const people = state.subscribers;
    return `<div class="cms-section-tools"><span>${people ? people.length : '—'} / ${t('subscribers')}</span><div><button type="button" class="cms-button" data-cms-action="reload-subscribers">${t('reload')}</button><button type="button" class="cms-button" data-cms-action="export-subscribers">${t('export')} ↓</button></div></div><p class="cms-hint">${t('subscriberNote')}</p>${people === null ? `<p>${t('loading')}</p>` : !people.length ? `<p>${t('noSubscribers')}</p>` : `<div class="cms-subscriber-list">${people.map(s => `<article><div><b>${esc(s.email)}</b><span>${esc(s.name || '')}</span><small>${t('created')} · ${esc(formatDate(s.createdAt))}</small></div><button type="button" class="cms-button cms-danger" data-cms-action="delete-subscriber" data-id="${esc(s.id)}" data-email="${esc(s.email)}">${t('delete')}</button></article>`).join('')}</div>`}`;
  }
  function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString(lang() === 'zh' ? 'zh-CN' : lang()); }
  function renderEditor() {
    const focus=captureFocus();
    const sameTab=state.renderedTab === state.tab;
    const scrollTop=sameTab ? dialog.querySelector('#cms-panel')?.scrollTop || 0 : 0;
    const openItems=sameTab ? [...dialog.querySelectorAll('[data-cms-item][open]')].map(el=>el.dataset.cmsItem) : [];
    const panel = ({profile:profilePanel,projects:projectPanel,audio:audioPanel,photos:photoPanel,subscribers:subscribersPanel})[state.tab]();
    frame(`<nav class="cms-tabs" aria-label="${t('admin')}">${['profile','projects','audio','photos','subscribers'].map(tab => `<button type="button" class="cms-tab" data-cms-action="tab" data-tab="${tab}" aria-pressed="${state.tab === tab}">${t(tab)}</button>`).join('')}</nav><form id="cms-editor-form" class="cms-editor-form"><div class="cms-body cms-editor-panel" id="cms-panel">${panel}</div></form>`, `<footer class="cms-footer"><span id="cms-save-state" class="${state.dirty ? 'is-dirty' : ''}">${t(state.dirty ? 'unsaved' : 'savedState')}</span><div><button class="cms-button" type="button" data-cms-action="logout">${t('logout')}</button><button class="cms-button cms-primary" type="submit" form="cms-editor-form">${t('save')}</button></div></footer>`);
    dialog.querySelectorAll('[data-cms-item]').forEach(el=>{if(openItems.includes(el.dataset.cmsItem))el.open=true;});
    state.renderedTab=state.tab;
    restoreFocus(focus);
    dialog.querySelector('#cms-panel').scrollTop=scrollTop;
  }
  function edit(event) {
    const input = event.target;
    if (!state.content || state.mode !== 'admin') return;
    try {
      if (input.dataset.cmsPath) {
        const path = JSON.parse(input.dataset.cmsPath);
        const previous = get(path);
        const value = input.hasAttribute('data-cms-number') ? (input.value === '' ? 0 : Number(input.value)) : input.value;
        put(path, value);
        if (path[0] === 'audio' && path[2] === 'src' && previous !== value) {
          state.content.audio[path[1]].waveform = [];
          state.content.audio[path[1]].bytes = 0;
        }
        markDirty();
      }
      if (input.dataset.projectAudio !== undefined) {
        const p = state.content.projects[Number(input.dataset.projectAudio)];
        p.audioIds = input.checked ? [...new Set([...(p.audioIds || []),input.value])] : (p.audioIds || []).filter(id => id !== input.value);
        markDirty();
      }
    } catch (error) { showError(error); }
  }
  function uniqueId(prefix, values) { let n = 1; while (values.includes(`${prefix}-${n}`)) n++; return `${prefix}-${n}`; }
  function renameAudio(input) {
    const old = input.dataset.audioRename;
    const next = input.value.trim();
    if (old === next) return;
    if (!validId(next) || state.content.audio[next]) { input.value = old; message(t('invalidId'),true); return; }
    const entries = Object.entries(state.content.audio).map(([id,a]) => [id === old ? next : id,a]);
    state.content.audio = Object.fromEntries(entries);
    state.content.projects.forEach(p => { p.audioIds = (p.audioIds || []).map(id => id === old ? next : id); });
    markDirty(); renderEditor();
  }
  function safeLink(value) {
    if (!value || typeof value !== 'string') return '';
    try { const u = new URL(value, location.href); return u.protocol === 'https:' || u.origin === location.origin && ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
  }
  function safeMedia(value) {
    if (typeof value !== 'string' || !value.trim() || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
    if (/^https:\/\//.test(value)) { try { const u=new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }
    if (!/^\/?(assets|uploads)\//.test(value)) return false;
    try { const decoded=decodeURIComponent(value); return !decoded.split('/').includes('..') && !/[\\\u0000]/.test(decoded); } catch { return false; }
  }
  const validId = value => /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
  function validate() {
    const c = state.content;
    for (const list of [c.projects,c.photos]) {
      const ids = list.map(p => p.id);
      if (ids.some(id => !validId(id)) || new Set(ids).size !== ids.length) throw new Error(t('invalidId'));
    }
    for (const p of c.projects) {
      if (!p.title.trim()) throw new Error(t('required'));
      if (!safeMedia(p.image)) throw new Error(`${p.title}: ${t('missingMedia')}`);
      if ((p.audioIds || []).some(id => !c.audio[id])) throw new Error(`${p.title}: ${t('noAudio')}`);
    }
    for (const p of c.photos) if (!safeMedia(p.src)) throw new Error(`${localized(p.title) || p.id}: ${t('missingMedia')}`);
    for (const [id,a] of Object.entries(c.audio)) {
      if (!validId(id)) throw new Error(t('invalidId'));
      if (!safeMedia(a.src)) throw new Error(`${id}: ${t('missingMedia')}`);
      if (!Number.isFinite(a.duration) || a.duration <= 0 || a.duration > 86400) throw new Error(`${id}: ${t('durationInvalid')}`);
    }
    if (c.profile.fotoUrl && !safeLink(c.profile.fotoUrl)) throw new Error(t('invalidUrl'));
  }
  async function save() {
    try { validate(); } catch (error) { showError(error); return; }
    setBusy(true);
    try {
      const result = await api('/api/admin/content', {method:'PUT',json:{content:state.content,expectedRevision:state.revision}});
      state.revision = result.revision; state.dirty = false;
      renderEditor(); message(t('saved'));
      window.dispatchEvent(new CustomEvent('portfolio-content-saved', {detail:{revision:result.revision,updatedAt:result.updatedAt}}));
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  async function upload(input) {
    const file = input.files?.[0];
    if (!file || !state.content || state.busy) return;
    const path = JSON.parse(input.dataset.uploadPath);
    if (file.size > 25 * 1024 * 1024) { message(t('fileTooLarge'),true); input.value=''; return; }
    let mime = file.type.toLowerCase();
    if (['audio/x-wav','audio/wave'].includes(mime)) mime='audio/wav';
    if (mime === 'audio/mp3') mime='audio/mpeg';
    if (!/^(image\/(jpeg|png|webp|gif|avif)|audio\/(mpeg|wav|ogg|mp4|aac|flac|webm)|video\/(mp4|webm)|application\/pdf)$/.test(mime) || /\.(svg|html?|js|mjs|xml|exe)$/i.test(file.name)) { message(t('invalidFile'),true); input.value=''; return; }
    if (input.dataset.uploadKind === 'image' && !mime.startsWith('image/') || input.dataset.uploadKind === 'audio' && !mime.startsWith('audio/')) { message(t('invalidFile'),true); input.value=''; return; }
    setBusy(true); message(t('uploading'));
    try {
      const result = await api('/api/admin/upload', {method:'POST',headers:{'Content-Type':mime,'X-Filename':encodeURIComponent(file.name)},body:file});
      if (!safeMedia(result.url)) throw new Error(t('invalidUrl'));
      put(path,result.url);
      if (path[0] === 'audio') {
        const a = state.content.audio[path[1]];
        a.waveform = []; a.bytes = result.size || file.size; a.duration=0;
        const duration = await getDuration(result.url);
        if (duration !== null) a.duration = duration;
      }
      markDirty(); renderEditor(); message(t('uploaded'));
    } catch (error) { showError(error); }
    finally { setBusy(false); if (input.isConnected) input.value=''; }
  }
  function getDuration(url) {
    return new Promise(resolve => {
      const media = document.createElement('audio');
      let done = false;
      const finish = value => { if (done) return; done=true; clearTimeout(timer); media.removeAttribute('src'); media.load(); resolve(value); };
      const timer = setTimeout(() => finish(null),8000);
      media.preload='metadata'; media.onloadedmetadata=() => finish(Number.isFinite(media.duration) ? media.duration : null); media.onerror=() => finish(null); media.src=url;
    });
  }
  async function measureAudioUrl(path) {
    if (state.busy || !state.content) return;
    const url=get(path);
    if (!safeMedia(url)) { message(t('invalidUrl'),true); return; }
    const entry=state.content.audio[path[1]];
    entry.duration=0;
    setBusy(true);message(t('loading'));
    try {
      const duration=await getDuration(url);
      if (duration !== null && duration>0) entry.duration=duration;
      markDirty();renderEditor();
      if (!entry.duration) message(t('changedSource'),true); else message(t('ready'));
    } catch(error) { showError(error); }
    finally {setBusy(false);}
  }
  async function loadSubscribers() {
    setBusy(true);
    try { const result = await api('/api/admin/subscribers'); state.subscribers=result.subscribers || []; renderEditor(); }
    catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  async function exportSubscribers() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/subscribers.csv', {credentials:'same-origin',cache:'no-store'});
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error?.message || `${t('requestFailed')} (${response.status})`); }
      if (!(response.headers.get('Content-Type') || '').includes('text/csv')) throw new Error(t('requestFailed'));
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a'); a.href=url; a.download='portfolio-subscribers.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  async function act(action, button) {
    if (action === 'close' || action === 'back-to-portfolio') { close(); return; }
    if (state.busy) return;
    if (action === 'refresh-auth') {
      setBusy(true);
      try { state.auth=await api('/api/auth/status'); if (state.auth.authenticated) await loadEditor(); else renderAuth(); }
      catch (error) { showError(error); } finally { setBusy(false); }
      return;
    }
    if (!state.content) return;
    if (action === 'tab') { state.tab=button.dataset.tab; renderEditor(); if (state.tab === 'subscribers' && state.subscribers === null) await loadSubscribers(); return; }
    if (action === 'add-project') {
      const title=window.prompt(`${t('addProject')} · ${t('title')}`, '');
      if (title === null) return;
      if (!title.trim() || title.length>200) { message(t('required'),true); return; }
      const id=uniqueId('project',state.content.projects.map(p=>p.id));
      state.content.projects.push({id,title:title.trim(),category:'study',image:'',audioIds:[],status:emptyText(),summary:emptyText(),role:emptyText(),tools:emptyText(),process:emptyText(),note:emptyText()});
      markDirty(); renderEditor();
      dialog.querySelector('.cms-item:last-child input')?.focus(); return;
    }
    if (action === 'add-photo') { const title=window.prompt(`${t('addPhoto')} · ${t('title')}`, ''); if(title === null)return; if(!title.trim() || title.length>200){message(t('required'),true);return;} const names=emptyText();names[lang()]=title.trim();state.content.photos.push({id:uniqueId('photo',state.content.photos.map(p=>p.id)),src:'',title:names,caption:emptyText()}); markDirty(); renderEditor(); const last=dialog.querySelector('.cms-item:last-child'); last.open=true; last.querySelector('input')?.focus(); return; }
    if (action === 'add-audio') { const id=uniqueId('audio',Object.keys(state.content.audio)); state.content.audio[id]={src:'',duration:0,waveform:[],bytes:0}; markDirty(); renderEditor(); const last=dialog.querySelector('.cms-item:last-child'); last.open=true; last.querySelector('input')?.focus(); return; }
    if (action === 'delete-project' || action === 'delete-photo') {
      const kind=action === 'delete-project' ? 'projects' : 'photos'; const i=Number(button.dataset.index); const item=state.content[kind][i];
      if (window.confirm(t(action === 'delete-project' ? 'removeProject' : 'removePhoto',{name:localized(item.title) || item.id}))) { state.content[kind].splice(i,1); markDirty(); renderEditor(); }
      return;
    }
    if (action.startsWith('move-')) { const list=state.content[action === 'move-project' ? 'projects' : 'photos']; const i=Number(button.dataset.index); const to=i+Number(button.dataset.step); if (to>=0 && to<list.length) { [list[i],list[to]]=[list[to],list[i]]; markDirty(); renderEditor(); } return; }
    if (action === 'delete-audio') { const id=button.dataset.id; if (window.confirm(t('removeAudio',{name:id}))) { delete state.content.audio[id]; state.content.projects.forEach(p=>{p.audioIds=(p.audioIds||[]).filter(x=>x!==id);}); markDirty(); renderEditor(); } return; }
    if (action === 'reload-subscribers') { await loadSubscribers(); return; }
    if (action === 'export-subscribers') { await exportSubscribers(); return; }
    if (action === 'delete-subscriber') {
      if (!window.confirm(t('removeSubscriber',{name:button.dataset.email}))) return;
      setBusy(true);
      try { await api(`/api/admin/subscribers/${encodeURIComponent(button.dataset.id)}`,{method:'DELETE'}); state.subscribers=state.subscribers.filter(s=>s.id!==button.dataset.id); renderEditor(); message(t('deletedSubscriber')); }
      catch (error) { showError(error); } finally { setBusy(false); }
      return;
    }
    if (action === 'logout') {
      if (state.dirty && !window.confirm(t('discard'))) return;
      setBusy(true);
      try {
        const result=await api('/api/auth/logout',{method:'POST',json:{}});
        state.content=null;state.dirty=false;state.subscribers=null;state.auth=null;
        if (site.hostedStudio) {
          const logoutPath=site.signOutPath(lang());
          const parsed=new URL(logoutPath,location.href);
          if(parsed.origin!==location.origin || parsed.pathname!=='/signout-with-chatgpt')throw new Error(t('invalidUrl'));
          // Remove private editor/subscriber DOM before the browser can cache it.
          frame(`<div class="cms-body"><p>${t('signingOut')}</p></div>`);
          dialog.close();state.mode=null;state.request++;
          navigateTop(logoutPath);
          return;
        }
        frame(`<div class="cms-body"><p>${t('loading')}</p></div>`);
        state.auth=await api('/api/auth/status');renderAuth();
      }
      catch (error) { showError(error); } finally { setBusy(false); }
    }
  }

  function renderSubscribe() {
    frame(`<form id="cms-subscribe-form" class="cms-body cms-subscribe"><p>${t('subscribeHelp')}</p><label class="cms-field"><span>${t('email')}</span><input type="email" name="email" autocomplete="email" maxlength="254" required></label><label class="cms-field"><span>${t('optionalName')}</span><input name="name" autocomplete="name" maxlength="100"></label><label class="cms-honeypot" aria-hidden="true">${t('website')}<input name="website" tabindex="-1" autocomplete="off"></label><label class="cms-consent"><input type="checkbox" name="consent" required><span>${t('consent')}</span></label><button type="submit" class="cms-button cms-primary">${t('join')} ↗</button></form>`);
  }
  function openSubscribe(launcher) {
    ensureDialog(); if (dialog.open) return;
    state.mode='subscribe';state.launcher=launcher || document.activeElement;state.auth=null;state.dirty=false;state.content=null;
    renderSubscribe();dialog.showModal();dialog.querySelector('input[name="email"]')?.focus();
  }
  async function subscribe(form) {
    const data=new FormData(form);
    setBusy(true);
    try {
      await api('/api/subscribe',{method:'POST',json:{email:data.get('email').trim(),name:data.get('name').trim(),consent:data.get('consent') === 'on',website:data.get('website') || ''}});
      frame(`<div class="cms-body cms-subscribe"><div class="cms-success-mark" aria-hidden="true">✓</div><p class="cms-joined">${t('joined')}</p><button type="button" class="cms-button" data-cms-action="close">${t('close')}</button></div>`);
      dialog.querySelector('#cms-title')?.focus();
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  document.addEventListener('click', event => {
    const opener=event.target.closest('[data-open-admin],[data-open-subscribe]');
    if (!opener) return;
    event.preventDefault();
    if (opener.hasAttribute('data-open-admin')) openAdmin(opener); else openSubscribe(opener);
  });
  window.PortfolioCMS = Object.freeze({openAdmin:()=>openAdmin(),openSubscribe:()=>openSubscribe()});
  window.addEventListener('beforeunload',event=>{if(state.mode === 'admin' && state.dirty){event.preventDefault();event.returnValue='';}});
  const openRequestedStudio=()=>{
    if(site.hostedStudio && !site.returningToPortfolio && new URLSearchParams(location.search).get('studio') === '1')openAdmin();
  };
  if(document.readyState === 'loading')document.addEventListener('DOMContentLoaded',openRequestedStudio,{once:true});
  else queueMicrotask(openRequestedStudio);
})();
