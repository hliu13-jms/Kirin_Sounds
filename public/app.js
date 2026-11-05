(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const site = window.PORTFOLIO_SITE || {
    publicCredentials:'same-origin',publicApiUrl:path=>path,normalizeContent:content=>content
  };
  const copy = {
    en: {
      headerPractice:'SOUND / PHOTOGRAPHY', browse:'INDEX ↗', intro:'A personal signal path.', introSub:'Electronic music. Modular synthesis. Light.', sources:'SOURCES', sound:'Sound', photography:'Photography', experiments:'Experiments', about:'About', contact:'Contact', soundSub:'Compositions & performance', photoSub:'Darkroom & digital', experimentSub:'Studies & works in progress', contactSub:'Start a conversation', patchHint:'Drag an output to the SCOPE input. Or tap an output, then tap IN.', selectedHint:'Selected. Now connect to IN on the SCOPE.', noSignal:'NO SIGNAL', standby:'STANDBY', disconnect:'UNPATCH ×', gain:'GAIN', timebase:'TIME', listenHint:'A space for close listening.', scopeFooter:'MADE OF SOUND, LIGHT & CURIOSITY', routingDescription:'Choose a source. Make a connection. Explore at your own pace.', heroTitle:'A practice in<br>sound & light.', heroBody:'Connect a module.<br>See where the signal goes.', heroButton:'CONNECT SOUND ↗', soundIntro:'Electronic compositions, noise, and the physical act of patching.', selectedWorks:'SELECTED WORKS', soundMeta:'COMPOSITION / STEREO', detail:'Explore project', back:'← BACK TO', overview:'Overview', role:'My role', tools:'Tools & methods', process:'Process', version:'Version & credits',   external:'EXTERNAL', labIntro:'A working notebook: sound studies, experiments, and things still becoming.', labMeta:'SOUND EXPERIMENT', learningTitle:'CURRENTLY LEARNING', learningBody:'Max & gen~. Learning through patching, listening, and small experiments.', webProjects:'Elsewhere on the web', photoIntro:'Darkroom and digital photography. Selected images from Boston.', gallery:'SELECTED FRAMES', photoFull:'View full screen', previous:'Previous photo', next:'Next photo', foto:'FOTO ARCHIVE ↗', aboutTitle:'Sound, light,<br>and the space between.', aboutBody:'I’m Henglin Liu, also known as KirinSounds麟, an undergraduate studying Electronic Production & Design at Berklee College of Music.', aboutBody2:'My practice connects electronic music, modular synthesis, and darkroom & digital photography. I’m interested in what happens when a sound becomes a texture, or an everyday moment becomes an image.', practiceLabel:'IN PRACTICE', practiceBody:'Electronic composition · modular performance · sound studies · darkroom & digital photography', learningShort:'Max and gen~', contactTitle:'Let’s make<br>a connection.', contactBody:'For sound, photography, creative collaborations, or simply a conversation.', alternate:'Also reachable at', projectsLabel:'PROJECTS', photosLabel:'PHOTOGRAPHY', play:'Play', pause:'Pause', playing:'PLAYING', paused:'PAUSED', ready:'READY', audioError:'Audio could not load. Try again or open the audio file.', close:'Close', skip:'Skip to content', input:'SCOPE input', out:'output', connected:'Connected', nothing:'Nothing connected',  draft:'Draft', shot1:'Water Fountain at Christian Science Plaza', shot2:'Two Ladies Talking at Boston Common Park', shot3:'IMPACT', boston:'Boston', still:'STILL IMAGE', audio:'AUDIO', current:'Current practice', hoverHint:'Drag from a circular output; release over IN.'
    },
    zh: {
      headerPractice:'声音 / 摄影', browse:'目录 ↗', intro:'一条属于我的信号路径。', introSub:'电子音乐、模块合成与光。', sources:'信号源', sound:'声音', photography:'摄影', experiments:'实验', about:'关于', contact:'联系', soundSub:'作曲与现场表演', photoSub:'暗房与数码', experimentSub:'习作与进行中的探索', contactSub:'开始一段对话', patchHint:'从模块插孔拖线到 SCOPE 输入端。也可点选输出，再点 IN。', selectedHint:'已选中。现在连接 SCOPE 的 IN 输入端。', noSignal:'未连接', standby:'待机', disconnect:'断开 ×', gain:'增益', timebase:'时基', listenHint:'留一处空间，仔细聆听。', scopeFooter:'由声音、光与好奇心构成', routingDescription:'选择信号源，建立连接，按自己的节奏探索。', heroTitle:'在声音与光之间<br>持续创作。', heroBody:'连接一个模块，<br>看看信号会去哪里。', heroButton:'连接声音 ↗', soundIntro:'电子作曲、噪声，以及拉线与演奏的身体体验。', selectedWorks:'精选作品', soundMeta:'作曲 / 立体声', detail:'查看项目', back:'← 返回', overview:'概述', role:'我的职责', tools:'工具与方法', process:'创作过程', version:'版本与署名',   external:'外部链接', labIntro:'一本持续更新的笔记：声音习作、实验，以及正在成形的想法。', labMeta:'声音习作', learningTitle:'正在学习', learningBody:'Max 与 gen~。通过搭建、聆听和小型实验逐步学习。', webProjects:'网络上的其他实践', photoIntro:'暗房与数码摄影。波士顿的部分影像。', gallery:'影像选集', photoFull:'全屏查看', previous:'上一张', next:'下一张', foto:'FOTO 摄影档案 ↗', aboutTitle:'声音、光，<br>以及两者之间。', aboutBody:'我是 Henglin Liu，艺名 KirinSounds麟，目前就读于 Berklee College of Music 的 Electronic Production & Design 本科专业。', aboutBody2:'我的创作连接电子音乐、模块合成与暗房及数码摄影。我关注声音如何成为质感，也关注日常片刻如何成为影像。', practiceLabel:'创作实践', practiceBody:'电子作曲 · 模块合成器表演 · 声音习作 · 暗房与数码摄影', learningShort:'Max 与 gen~', contactTitle:'让我们<br>建立连接。', contactBody:'欢迎交流声音、摄影、跨领域创作与合作。', alternate:'备用邮箱', projectsLabel:'项目', photosLabel:'摄影', play:'播放', pause:'暂停', playing:'播放中', paused:'已暂停', ready:'就绪', audioError:'音频暂时无法加载。请重试，或直接打开音频文件。', close:'关闭', skip:'跳转到内容', input:'SCOPE 输入端', out:'输出端', connected:'已连接', nothing:'尚未连接',  draft:'草稿', shot1:'基督教科学广场的喷泉', shot2:'波士顿公园长椅上的交谈', shot3:'IMPACT', boston:'波士顿', still:'静态影像', audio:'音频', current:'当前实践', hoverHint:'从圆形输出插孔拖线，在 IN 上松开。'
    },
    ja: {
      headerPractice:'サウンド / 写真', browse:'目次 ↗', intro:'自分だけのシグナルパス。', introSub:'電子音楽、モジュラーシンセシス、光。', sources:'ソース', sound:'サウンド', photography:'写真', experiments:'実験', about:'紹介', contact:'連絡', soundSub:'作曲とパフォーマンス', photoSub:'暗室とデジタル', experimentSub:'習作と制作中の試み', contactSub:'会話をはじめる', patchHint:'出力から SCOPE の入力へケーブルをドラッグ。出力、IN の順にタップしても接続できます。', selectedHint:'選択しました。SCOPE の IN に接続してください。', noSignal:'未接続', standby:'待機中', disconnect:'切断 ×', gain:'ゲイン', timebase:'時間軸', listenHint:'じっくり耳を澄ますための場所。', scopeFooter:'音と光と好奇心から', routingDescription:'ソースを選び、つないで、自分のペースで探ってください。', heroTitle:'音と光のあいだで<br>つくり続ける。', heroBody:'モジュールをつないで、<br>信号の行き先を探る。', heroButton:'サウンドに接続 ↗', soundIntro:'電子音楽の作曲、ノイズ、そしてケーブルをつなぎ演奏する身体感覚。', selectedWorks:'主な作品', soundMeta:'作曲 / ステレオ', detail:'作品を見る', back:'← 戻る', overview:'概要', role:'担当', tools:'ツールと手法', process:'制作過程', version:'バージョンとクレジット',   external:'外部リンク', labIntro:'音の習作、実験、まだ形になりつつあるアイデアを記すノート。', labMeta:'サウンド習作', learningTitle:'学習中', learningBody:'Max と gen~。パッチング、リスニング、小さな実験を通して学んでいます。', webProjects:'ウェブ上の試み', photoIntro:'暗室での写真制作とデジタル写真。ボストンで撮影した写真から。', gallery:'写真セレクション', photoFull:'全画面で見る', previous:'前の写真', next:'次の写真', foto:'FOTO アーカイブ ↗', aboutTitle:'音、光、<br>そのあいだ。', aboutBody:'Henglin Liuです。KirinSounds麟というアーティスト名でも活動しています。バークリー音楽大学で Electronic Production & Design を専攻する学部生です。', aboutBody2:'電子音楽、モジュラーシンセシス、暗室での写真制作、デジタル写真を行き来しています。音が質感になる瞬間や、日常のひとこまが写真になる瞬間に関心があります。', practiceLabel:'制作活動', practiceBody:'電子音楽の作曲 · モジュラーシンセの演奏 · 音の習作 · 暗室とデジタル写真', learningShort:'Max と gen~', contactTitle:'つながりを<br>つくりましょう。', contactBody:'音、写真、分野を越えた制作やコラボレーションについて、お気軽にご連絡ください。', alternate:'別のメールアドレス', projectsLabel:'作品', photosLabel:'写真', play:'再生', pause:'一時停止', playing:'再生中', paused:'一時停止', ready:'準備完了', audioError:'音声を読み込めませんでした。再試行するか、音声ファイルを開いてください。', close:'閉じる', skip:'コンテンツへ', input:'SCOPE 入力', out:'出力', connected:'接続済み', nothing:'未接続',  draft:'制作中', shot1:'クリスチャン・サイエンス・プラザの噴水', shot2:'ボストン・コモンのベンチでの会話', shot3:'IMPACT', boston:'ボストン', still:'静止画', audio:'音声', current:'現在の活動', hoverHint:'丸い出力端子からドラッグし、IN の上で離してください。'
    }
  };
  Object.assign(copy.en,{fotoProfile:'Foto profile',selectedFrames:'Selected frames',openFoto:'Open on Foto ↗',fotoFrameTitle:'kirinvisions on Foto',fotoHelp:'Photography by kirinvisions · Foto',reloadFoto:'Reload profile'});
  Object.assign(copy.zh,{fotoProfile:'Foto 主页',selectedFrames:'精选照片',openFoto:'在 Foto 打开 ↗',fotoFrameTitle:'kirinvisions 的 Foto 主页',fotoHelp:'kirinvisions 的 Foto 摄影主页',reloadFoto:'重新加载主页'});
  Object.assign(copy.ja,{fotoProfile:'Fotoプロフィール',selectedFrames:'写真セレクション',openFoto:'Fotoで開く ↗',fotoFrameTitle:'kirinvisionsのFotoプロフィール',fotoHelp:'kirinvisionsの写真 · Foto',reloadFoto:'プロフィールを再読込'});
  // The public view-only route works for visitors; the /app/profile route opens Foto's signed-in app.
  let fotoUrl='https://the.fotoapp.co/kirinvisions';
  let portfolioContent=null;
  let photoMode='foto';
  Object.assign(copy.en,{subscribe:'Subscribe',manage:'Root login',noPhotos:'No selected photographs have been published yet.'});
  Object.assign(copy.zh,{subscribe:'订阅更新',manage:'root 登录',noPhotos:'暂未发布精选照片。'});
  Object.assign(copy.ja,{subscribe:'更新を購読',manage:'root ログイン',noPhotos:'写真セレクションはまだ公開されていません。'});
  const rack=$('#rack'), screen=$('#display'), input=$('#scope-input'), cable=$('#cable'), shadow=$('#cable-shadow'), highlight=$('#cable-highlight'), tip=$('#cable-tip');
  const canvas=$('#waveform'), ctx=canvas.getContext('2d');
  const originalWordmark=$('.wordmark').innerHTML;
  let savedLanguage='';try{savedLanguage=localStorage.getItem('kirin-language')||'';}catch{}
  let lang=new URLSearchParams(location.search).get('lang') || savedLanguage || 'en';
  if(!copy[lang]) lang='en';
  let route='', projectId='', pending=null, drag=null, currentPhoto=0, audioData={}, currentAudio=null, currentWave=null, audioContext=null, analyser=null, frame=0, playbackToken=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modules=['sound','photography','experiments','about','contact'];
  let photos=[{src:'assets/photo-1.webp',title:'shot1'},{src:'assets/photo-2.webp',title:'shot2'},{src:'assets/photo-3.webp',title:'shot3'}];
  const t=k=>copy[lang][k] || copy.en[k] || k;
  const loc=value=>typeof value==='string'?value:(value?.[lang] || value?.en || '');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalizeLines=value=>String(value??'').replace(/\r\n?/g,'\n');
  const textLines=value=>esc(normalizeLines(value)).replaceAll('\n','<br>');
  const profileValue=(key,fallback='')=>{const value=portfolioContent?.profile?.[key];return value==null?fallback:typeof value==='object'?loc(value):String(value);};
  const photoTitle=p=>typeof p.title==='object'?loc(p.title):t(p.title);
  const photoCaption=p=>p.caption?loc(p.caption):`${profileValue('name','Henglin Liu')} · ${t('boston')}`;
  const instagramUrl=()=>`https://www.instagram.com/${encodeURIComponent(profileValue('instagram','kirin_soundsnfotos'))}/`;
  const positiveDuration=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):0;
  const fmt=s=>{s=Math.max(0,Math.floor(Number.isFinite(Number(s))?Number(s):0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
  const announce=s=>{$('#announcement').textContent=s;};
  const external=(url,label)=>`<a class="external-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}</span><span>↗</span></a>`;
  function player(id,title){const a=audioData[id];if(!a)return '';const duration=positiveDuration(a.duration);return `<div class="audio-player" data-player="${esc(id)}"><button class="play-button" aria-label="${esc(t('play')+' '+title)}" data-play="${esc(id)}">▶</button><div><div class="audio-text"><span>${esc(title)}</span><span class="audio-time">0:00 / ${duration?fmt(duration):'—'}</span></div><input class="audio-seek" type="range" min="0" max="${duration}" step="0.1" value="0" disabled aria-label="${esc(title+' · '+(lang==='zh'?'播放进度':lang==='ja'?'再生位置':'Playback position'))}"></div><audio preload="none" src="${esc(a.src)}" data-audio="${esc(id)}"></audio></div>`;}
  function card(p){return `<article class="work-card"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"><div><span class="meta">${esc(t(p.category==='composition'?'soundMeta':'labMeta'))}</span><h2><button class="work-title" data-project="${p.id}">${esc(p.title)}</button></h2><p>${esc(loc(p.summary).split(/(?<=[.!?。])\s/)[0])}</p><div style="margin-top:8px"><span class="tag ${p.id==='fm'?'draft':''}">${esc(loc(p.status))}</span></div></div><button class="work-open" data-project="${p.id}" aria-label="${esc(t('detail')+' · '+p.title)}">↗</button></article>`;}
  function emptyView(){const name=profileValue('name','Henglin Liu');const intro=profileValue('intro',t('heroTitle').replaceAll('<br>','\n'));return `<div class="empty-screen"><div class="empty-photo"></div><div class="empty-content"><span class="eyebrow">${esc(name.toUpperCase())} / BERKLEE EPD</span><h1>${textLines(intro)}</h1><p>${t('heroBody')}</p><button class="connect-shortcut" data-route="sound">${t('heroButton')}</button></div></div>`;}
  function soundView(){const works=window.PROJECTS.filter(p=>p.category==='composition');return `<div class="view"><div class="view-head"><div><span class="eyebrow">01 / ${t('selectedWorks')}</span><h1>${t('sound')}</h1></div><span>${String(works.length).padStart(2,'0')} ${t('projectsLabel')}</span></div><p class="view-intro">${t('soundIntro')}</p><div class="work-list">${works.map(p=>`<div>${card(p)}${player(p.audioIds[0],p.title)}</div>`).join('')}</div></div>`;}
  function experimentView(){return `<div class="view"><div class="view-head"><div><span class="eyebrow">03 / LAB NOTES</span><h1>${t('experiments')}</h1></div><span>PROCESS / STUDIES</span></div><p class="view-intro">${t('labIntro')}</p><div class="work-list lab-list">${window.PROJECTS.filter(p=>p.category==='study').map(card).join('')}</div><div class="lab-learning"><span class="eyebrow">${t('learningTitle')}</span><br>${textLines(profileValue('learning',t('learningBody')))}</div><div class="section-divider"><h2>${t('webProjects')}</h2>${external('https://hliu13-jms.github.io/Image_Destroyer_Final/','Image Destroyer')}${external('https://twisterdots.com/','Twisterdots')}</div></div>`;}
  function photoView(){
    const p=photos[currentPhoto];
    const modes=`<div class="photo-mode-bar"><div class="photo-modes" role="group" aria-label="${esc(t('photography'))}"><button data-photo-mode="foto" aria-pressed="${photoMode==='foto'}">${t('fotoProfile')}</button><button data-photo-mode="selected" aria-pressed="${photoMode==='selected'}">${t('selectedFrames')}</button></div><a href="${esc(fotoUrl)}" target="_blank" rel="noopener noreferrer">${t('openFoto')}</a></div>`;
    const head=`<div class="view-head"><div><span class="eyebrow">02 / ${photoMode==='foto'?'FOTO':t('gallery')}</span><h1>${t('photography')}</h1></div><span>kirinvisions</span></div>`;
    if(photoMode==='foto')return `<div class="view photo-view foto-view">${head}${modes}<div class="foto-notice"><p>${t('fotoHelp')}</p><button data-reload-foto aria-label="${esc(t('reloadFoto'))}" title="${esc(t('reloadFoto'))}">↻</button></div><div class="foto-pane"><iframe id="foto-frame" src="${esc(fotoUrl)}" title="${esc(t('fotoFrameTitle'))}" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen" allowfullscreen></iframe></div></div>`;
    if(!p)return `<div class="view photo-view">${head}${modes}<p class="view-intro">${t('noPhotos')}</p></div>`;
    return `<div class="view photo-view">${head}${modes}<div class="photo-stage"><img src="${esc(p.src)}" alt="${esc(photoTitle(p))}"><button class="photo-expand" aria-label="${esc(t('photoFull'))}" data-fullscreen>⤢</button></div><div class="photo-toolbar"><div class="photo-caption"><h2>${esc(photoTitle(p))}</h2><p>${textLines(photoCaption(p))}</p></div><span class="photo-count">${String(currentPhoto+1).padStart(2,'0')} / ${String(photos.length).padStart(2,'0')}</span><button class="photo-nav" data-photo-step="-1" aria-label="${esc(t('previous'))}">←</button><button class="photo-nav" data-photo-step="1" aria-label="${esc(t('next'))}">→</button></div><div class="photo-thumbs">${photos.map((im,i)=>`<button data-photo="${i}" aria-label="${esc(photoTitle(im))}" aria-pressed="${i===currentPhoto}"><img src="${esc(im.src)}" alt=""></button>`).join('')}</div></div>`;
  }
  function aboutView(){const about=normalizeLines(profileValue('about',t('aboutBody')+'\n\n'+t('aboutBody2')));return `<div class="view"><span class="eyebrow">04 / ${esc(profileValue('name','Henglin Liu').toUpperCase())}</span><div class="view-head"><h1>${t('aboutTitle')}</h1></div><div class="about-layout"><div class="about-copy">${about.split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${textLines(p)}</p>`).join('')}</div><img class="portrait" src="assets/portrait.webp" alt="${esc(profileValue('name','Henglin Liu'))}"></div><div class="learning"><div><b>${t('practiceLabel')}</b><p>${textLines(profileValue('practice',t('practiceBody')))}</p></div><div><b>${t('learningTitle')}</b><p>${textLines(profileValue('learning',t('learningShort')))}</p></div></div></div>`;}
  function contactView(){const email=profileValue('primaryEmail','lhl@kirinsounds.art'),secondary=profileValue('secondaryEmail','henglinliu24@163.com');return `<div class="view contact-view"><span class="eyebrow">05 / CONTACT</span><h1>${t('contactTitle')}</h1><p class="view-intro">${t('contactBody')}</p><a class="contact-email" href="mailto:${esc(email)}"><span>${esc(email)}</span><span>↗</span></a>${secondary?`<div class="contact-other">${t('alternate')}<br><a href="mailto:${esc(secondary)}">${esc(secondary)} ↗</a></div>`:''}<div class="contact-social"><a href="${esc(instagramUrl())}" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a><a href="${esc(fotoUrl)}" target="_blank" rel="noopener noreferrer">FOTO ↗</a><button class="subscribe-inline" data-open-subscribe>${t('subscribe')}</button></div></div>`;}
  function detailView(p){return `<div class="view detail"><button class="back-button" data-route="${route}">${t('back')} ${t(route).toUpperCase()}</button><div class="detail-title"><div><span class="eyebrow">${t(p.category==='composition'?'soundMeta':'labMeta')}</span><h1>${esc(p.title)}</h1></div><span class="tag ${p.id==='fm'?'draft':''}">${esc(loc(p.status))}</span></div>${p.image?`<img class="detail-cover" src="${esc(p.image)}" alt="${esc(p.title)}">`:''}<div class="${p.audioIds.length>1?'samples':''}">${p.audioIds.map(id=>player(id,p.audioIds.length===1?p.title:/^soni\d+$/.test(id)?'SoniMorf '+id.slice(4):/^franken\d+$/.test(id)?'FrankenSound '+id.slice(7):/^bell\d+$/.test(id)?'Bell '+id.slice(4):id)).join('')}</div><p class="detail-summary">${textLines(loc(p.summary))}</p><div class="detail-grid"><div><h2>${t('role')}</h2><p>${textLines(loc(p.role))}</p></div><div><h2>${t('tools')}</h2><p>${textLines(loc(p.tools))}</p></div></div><div class="detail-section"><h2>${t('process')}</h2><p>${textLines(loc(p.process))}</p></div><p class="project-note">${textLines(loc(p.note))}</p></div>`;}
  function stopAll(){playbackToken++;if(currentAudio)currentAudio.pause();$$('audio',screen).forEach(a=>a.pause());currentAudio=null;$('#audio-status').textContent=t('listenHint');}
  function render(){const hadFocus=screen.contains(document.activeElement);stopAll();const p=window.PROJECTS.find(p=>p.id===projectId);screen.innerHTML=p?detailView(p):({sound:soundView,photography:photoView,experiments:experimentView,about:aboutView,contact:contactView}[route]?.()||emptyView());screen.classList.toggle('foto-active',route==='photography'&&photoMode==='foto');screen.scrollTop=0;bindPlayers();bindView();updateChrome();if(hadFocus)screen.focus({preventScroll:true});if(!reduced){screen.classList.remove('flash');void screen.offsetWidth;screen.classList.add('flash');}currentWave=p?audioData[p.audioIds[0]]?.waveform:route==='sound'?audioData.fm?.waveform:null;drawScope();}
  function updateChrome(){document.documentElement.lang=lang==='zh'?'zh-CN':lang;$$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));$$('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));$('.skip').textContent=t('skip');$$('.output').forEach(el=>{el.setAttribute('aria-label',`${t(el.dataset.output)} ${t('out')}`);el.classList.toggle('connected',el.dataset.output===route);el.setAttribute('aria-pressed',String(el.dataset.output===route));});input.setAttribute('aria-label',t('input'));input.classList.toggle('connected',!!route);$$('.module').forEach(el=>{el.classList.toggle('connected',el.dataset.module===route);el.classList.toggle('pending',el.dataset.module===pending);});rack.classList.toggle('patched',!!route);$('#signal-label').textContent=route?t(route).toUpperCase():t('noSignal');$('#connection-label').textContent=route?t('connected').toUpperCase():t('standby');$('#disconnect').hidden=!route;$('#monitor-mode').textContent=route==='photography'?t('still'):route==='sound'||projectId?t('audio'):route?'CONNECTED':'IDLE';$('#patch-hint').textContent=pending?t('selectedHint'):t('patchHint');$('#patch-hint').classList.toggle('armed',!!pending);$('.dialog-close').setAttribute('aria-label',t('close'));if(portfolioContent){const name=profileValue('name','Henglin Liu'),artist=profileValue('artistName','KirinSounds麟');document.title=`${name} — ${artist}`;const identity=$('.header-identity span');if(identity)identity.textContent=name.toUpperCase();const brand=$('.wordmark');if(artist==='KirinSounds麟'){if(brand.innerHTML!==originalWordmark)brand.innerHTML=originalWordmark;}else brand.textContent=artist;brand.setAttribute('aria-label',artist+' home');const email=$('.site-footer a[href^="mailto:"]');if(email){email.href='mailto:'+profileValue('primaryEmail');email.textContent=profileValue('primaryEmail')+' ↗';}const ig=$('.site-footer a[href*="instagram.com"]');if(ig)ig.href=instagramUrl();}requestAnimationFrame(drawCable);}
  function bindView(){$$('[data-route]',screen).forEach(b=>b.addEventListener('click',()=>b.classList.contains('connect-shortcut')?selectOutput(b.dataset.route):navigate(b.dataset.route)));$$('[data-project]',screen).forEach(b=>b.addEventListener('click',()=>navigate(route,b.dataset.project)));$$('[data-photo-step]',screen).forEach(b=>b.addEventListener('click',()=>changePhoto(+b.dataset.photoStep)));$$('[data-photo]',screen).forEach(b=>b.addEventListener('click',()=>{currentPhoto=+b.dataset.photo;render();}));$('[data-fullscreen]',screen)?.addEventListener('click',openPhoto);$$('[data-photo-mode]',screen).forEach(b=>b.addEventListener('click',()=>{photoMode=b.dataset.photoMode;render();$(`[data-photo-mode="${photoMode}"]`,screen)?.focus({preventScroll:true});}));$('[data-reload-foto]',screen)?.addEventListener('click',()=>{$('#foto-frame').src=fotoUrl;});}
  function navigate(section,id='',write=true){if(!modules.includes(section))section='';route=section;projectId=window.PROJECTS.some(p=>p.id===id)?id:'';pending=null;if(write){const hash=section?`#${section}${projectId?'/'+projectId:''}`:'#';history.pushState(null,'',location.pathname+location.search+hash);}$('.browse').open=false;render();announce(section?`${t('connected')}: ${t(section)}`:t('nothing'));}
  function readLocation(){const [section,id]=location.hash.slice(1).split('/');navigate(section||'',id||'',false);}
  function setLanguage(value){if(!copy[value])return;lang=value;try{localStorage.setItem('kirin-language',lang);}catch{}const u=new URL(location);u.searchParams.set('lang',lang);history.replaceState(null,'',u);render();}
  function selectOutput(key){pending=key;updateChrome();announce(`${t(key)}. ${t('selectedHint')}`);}
  function clearCable(){[cable,shadow,highlight].forEach(el=>el.setAttribute('d',''));tip.style.display='none';}
  function drawCable(){const key=drag?.key||pending||route;if(!key){clearCable();return;}const out=$(`[data-output="${key}"]`);if(!out)return;const r=rack.getBoundingClientRect(),a=out.getBoundingClientRect(),b=input.getBoundingClientRect();const x1=a.left+a.width/2-r.left,y1=a.top+a.height/2-r.top;let x2,y2;if(drag?.moved){x2=drag.x-r.left;y2=drag.y-r.top;}else if(pending){x2=x1+24;y2=y1+48;}else{x2=b.left+b.width/2-r.left;y2=b.top+b.height/2-r.top;}const horizontal=Math.abs(x2-x1)>100;const drop=Math.min(190,Math.max(45,Math.abs(y2-y1)*.35+55));let d;if(horizontal)d=`M ${x1} ${y1} C ${x1+50} ${y1+drop}, ${x2-45} ${y2+drop}, ${x2} ${y2}`;else d=`M ${x1} ${y1} C ${x1-30} ${y1+drop}, ${x2-35} ${y2+drop}, ${x2} ${y2}`;[cable,shadow,highlight].forEach(el=>el.setAttribute('d',d));tip.style.display=drag?.moved||pending?'block':'none';tip.setAttribute('cx',x2);tip.setAttribute('cy',y2);}
  $$('.output').forEach(out=>{
    out.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();drag={key:out.dataset.output,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false,pointer:e.pointerId};out.setPointerCapture(e.pointerId);});
    out.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){drag.moved=true;rack.classList.add('is-dragging');}drawCable();});
    out.addEventListener('pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;const d=drag,b=input.getBoundingClientRect();const hit=e.clientX>b.left-25&&e.clientX<b.right+25&&e.clientY>b.top-25&&e.clientY<b.bottom+25;drag=null;rack.classList.remove('is-dragging');if(d.moved&&hit)navigate(d.key);else if(!d.moved)selectOutput(d.key);else{pending=null;updateChrome();announce(t('patchHint'));}drawCable();});
    out.addEventListener('pointercancel',()=>{drag=null;pending=null;rack.classList.remove('is-dragging');updateChrome();});
    out.addEventListener('click',e=>{if(e.detail===0)selectOutput(out.dataset.output);});
  });
  input.addEventListener('click',()=>{if(pending)navigate(pending);else if(route){announce(`${t('connected')}: ${t(route)}`);}else announce(t('patchHint'));});
  $('#disconnect').addEventListener('click',()=>navigate(''));
  $$('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
  $$('.browse [data-route]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
  $('.wordmark').addEventListener('click',e=>{e.preventDefault();navigate('');});
  $('.skip').addEventListener('click',e=>{e.preventDefault();screen.focus();});
  window.addEventListener('popstate',readLocation);window.addEventListener('hashchange',readLocation);
  window.addEventListener('resize',()=>{drawCable();drawScope();});new ResizeObserver(drawCable).observe(rack);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){pending=null;drag=null;rack.classList.remove('is-dragging');updateChrome();}if(route==='photography'&&photoMode==='selected'&&!$('#photo-dialog').open&&!['INPUT','BUTTON'].includes(document.activeElement.tagName)){if(e.key==='ArrowRight'){e.preventDefault();changePhoto(1);}if(e.key==='ArrowLeft'){e.preventDefault();changePhoto(-1);}}});
  function changePhoto(step){currentPhoto=(currentPhoto+step+photos.length)%photos.length;render();announce(`${photoTitle(photos[currentPhoto])} · ${currentPhoto+1} / ${photos.length}`);}
  function openPhoto(){const d=$('#photo-dialog'),p=photos[currentPhoto];$('img',d).src=p.src;$('img',d).alt=photoTitle(p);$('.dialog-caption',d).textContent=`${photoTitle(p)} · ${profileValue('name','Henglin Liu')}`;d.showModal();}
  $('.dialog-close').addEventListener('click',()=>$('#photo-dialog').close());$('#photo-dialog').addEventListener('click',e=>{if(e.target===$('#photo-dialog'))$('#photo-dialog').close();});
  function canAnalyseAudio(audio){
    try{
      const source=new URL(audio.currentSrc||audio.src,location.href);
      // External media stays on the native playback path: an audio URL alone is not CORS permission.
      return ['http:','https:'].includes(source.protocol)&&source.origin===location.origin;
    }catch{return false;}
  }
  async function prepareAudioAnalysis(audio){
    if(!canAnalyseAudio(audio))return;
    if(audio._source){
      await audioContext.resume();
      return;
    }
    try{
      if(!audioContext){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return;
        audioContext=new AC();
        analyser=audioContext.createAnalyser();
        analyser.fftSize=2048;
        analyser.connect(audioContext.destination);
      }
      await audioContext.resume();
      if(audioContext.state!=='running')return;
    }catch{return;}
    try{
      audio._source=audioContext.createMediaElementSource(audio);
      audio._source.connect(analyser);
      audio._scopeAnalyser=true;
    }catch(error){
      if(audio._source){
        audio._source.disconnect();
        audio._source.connect(audioContext.destination);
      }
      audio._scopeAnalyser=false;
    }
  }
  function bindPlayers(){
    $$('[data-player]',screen).forEach(box=>{
      const id=box.dataset.player,a=$('audio',box),button=$('.play-button',box),seek=$('.audio-seek',box),label=$('.audio-text span',box).textContent;
      const updateProgress=override=>{
        const actual=positiveDuration(a.duration),duration=actual||positiveDuration(audioData[id]?.duration);
        const time=typeof override==='number'?override:Number.isFinite(a.currentTime)?a.currentTime:0;
        seek.max=String(duration);
        seek.disabled=a.readyState<1||!actual;
        seek.value=String(Math.min(Math.max(0,time),duration));
        const readable=`${fmt(time)} / ${duration?fmt(duration):'—'}`;
        seek.setAttribute('aria-valuetext',readable);
        $('.audio-time',box).textContent=readable;
      };
      button.addEventListener('click',async()=>{
        if(!a.paused){a.pause();return;}
        $$('audio',screen).forEach(other=>{if(other!==a)other.pause();});
        const token=++playbackToken;
        currentAudio=a;currentWave=audioData[id]?.waveform;
        try{
          await prepareAudioAnalysis(a);
          if(token!==playbackToken||!box.isConnected){a.pause();return;}
          await a.play();
          if(token!==playbackToken||!box.isConnected)a.pause();
        }catch{showAudioError(box,a.src);}
      });
      a.addEventListener('play',()=>{
        $('.audio-error',box)?.remove();
        button.textContent='Ⅱ';button.setAttribute('aria-label',`${t('pause')} ${label}`);
        $('#audio-status').textContent=`${t('playing')} / ${label}`;
        $('#monitor-mode').textContent=a._scopeAnalyser?'LIVE':t('audio');
        updateProgress();animateScope();
      });
      a.addEventListener('pause',()=>{
        button.textContent='▶';button.setAttribute('aria-label',`${t('play')} ${label}`);
        if(currentAudio===a){$('#audio-status').textContent=`${t('paused')} / ${label}`;$('#monitor-mode').textContent=t('audio');}
        drawScope();
      });
      a.addEventListener('ended',()=>{
        updateProgress(0);button.textContent='▶';button.setAttribute('aria-label',`${t('play')} ${label}`);$('#audio-status').textContent=t('ready');
      });
      for(const event of ['loadedmetadata','durationchange','timeupdate'])a.addEventListener(event,updateProgress);
      a.addEventListener('error',()=>showAudioError(box,a.src));
      seek.addEventListener('input',()=>{
        if(a.readyState>=1&&positiveDuration(a.duration)){
          a.currentTime=Math.max(0,Math.min(Number(seek.value),a.duration));updateProgress();
        }
      });
      updateProgress();
    });
  }
  function showAudioError(box,url){if($('.audio-error',box))return;const el=document.createElement('a');el.className='audio-error';el.href=url;el.target='_blank';el.rel='noopener';el.textContent=t('audioError');box.append(el);$('#audio-status').textContent=t('audioError');}
  function drawScope(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(!rect.width)return;const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.clearRect(0,0,w,h);ctx.strokeStyle='#304128';ctx.lineWidth=.7*dpr;for(let x=0;x<=w;x+=w/16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<=h;y+=h/4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}const gain=+$('#gain').value;ctx.beginPath();ctx.strokeStyle='#c1d49d';ctx.lineWidth=1.2*dpr;ctx.shadowColor='#9cc366';ctx.shadowBlur=4*dpr;if(currentAudio&&!currentAudio.paused&&currentAudio._scopeAnalyser&&analyser&&!reduced){const b=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(b);const length=Math.floor(b.length/(+$('#timebase').value/1.5));for(let i=0;i<length;i++){const x=i/(length-1)*w,y=h/2+(b[i]/128-1)*h*.43*gain;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}}else if(currentWave?.length>1&&route){currentWave.forEach((value,i)=>{const x=i/(currentWave.length-1)*w;const v=value*h*.39*gain;ctx.moveTo(x,h/2-v);ctx.lineTo(x,h/2+v);});}else{ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);}ctx.stroke();ctx.shadowBlur=0;}
  function animateScope(){cancelAnimationFrame(frame);const step=()=>{drawScope();if(currentAudio&&!currentAudio.paused&&!reduced&&!document.hidden)frame=requestAnimationFrame(step);};step();}
  $('#gain').addEventListener('input',drawScope);$('#timebase').addEventListener('input',drawScope);document.addEventListener('visibilitychange',()=>{if(!document.hidden)animateScope();});
  function applyContent(value){
    if(!value||!value.profile||!Array.isArray(value.projects)||!value.audio||!Array.isArray(value.photos))return false;
    const content=site.normalizeContent(value);
    portfolioContent=content;window.PROJECTS=content.projects;audioData=content.audio;
    photos=content.photos;currentPhoto=Math.min(currentPhoto,Math.max(0,photos.length-1));
    if(content.profile.fotoUrl)fotoUrl=content.profile.fotoUrl;
    window.portfolioContent=content;
    return true;
  }
  async function refreshContent(){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(site.publicApiUrl('/api/content'),{cache:'no-store',credentials:site.publicCredentials,signal:controller.signal});
      if(!response.ok)return false;
      const payload=await response.json();
      return applyContent(payload.content);
    }catch{return false;}
    finally{clearTimeout(timeout);}
  }
  async function loadSnapshot(){
    try{
      const response=await fetch('content-snapshot.json',{cache:'no-cache',credentials:'omit'});
      if(response.ok&&applyContent(await response.json()))return;
    }catch{}
    try{const response=await fetch('assets/audio.json',{credentials:'omit'});if(response.ok)audioData=await response.json();}catch{}
  }
  window.addEventListener('portfolio-content-saved',async()=>{if(await refreshContent())render();});
  async function init(){
    await loadSnapshot();
    readLocation();drawScope();
    // The bundled public snapshot stays usable while the backend is unavailable.
    // Do not interrupt audio that a visitor has already started during refresh.
    if(await refreshContent())if(!currentAudio||currentAudio.paused)render();
  }
  init();
})();
