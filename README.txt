Kirin Portfolio — 本地运行 / Local run
====================================

中文
----
先完整解压，再启动。不要在 Windows 的 ZIP 压缩文件预览窗口中双击启动器。
请右键下载的 ZIP，选择“全部解压缩／Extract All...”，再打开解压后的
KirinSounds-webapp 文件夹。应同时看到 server.mjs、public、server、data
与 Start-Portfolio.cmd，确认后再双击启动器。
例如：C:\Users\YourName\Documents\KirinSounds-webapp\Start-Portfolio.cmd

如果从压缩包内直接启动，Windows 可能只把启动器临时释放到临时目录，
其旁边没有 server.mjs，因而会报“Cannot find module ... server.mjs”。
这不代表 ZIP 缺少服务器文件。新版启动器会先检查完整目录，再运行 Node；
发现缺少文件时只显示“Extract All...”步骤，不会自动解压或删除任何文件。

1. 将整个压缩包解压到一个文件夹。保留 public 文件夹与内部目录结构。
2. 电脑需要安装 Node.js 22.13 或更新版本。启动器不需要额外的软件包，
   不需要运行 npm install，也不需要 Foto 账号或登录。
3. Windows：双击 Start-Portfolio.cmd，保留打开的命令窗口。
   然后用浏览器访问 http://127.0.0.1:4173/ 。
   macOS / Linux：在解压后的文件夹打开终端，运行 node server.mjs 。
4. 停止网站：在运行窗口按 Ctrl+C。

也可在该文件夹运行 npm start。请通过上面的本地网址浏览，
不要直接双击 public/index.html；本地网址才能正确加载网站使用的文件。

端口被占用时，运行：
  node server.mjs --port 4174
并访问 http://127.0.0.1:4174/ 。
Windows 启动器也可接收端口：Start-Portfolio.cmd --port 4174
使用 npm 时：npm start -- --port 4174

也支持 PORT 环境变量，命令行 --port 优先。例如：
  PowerShell: $env:PORT='4174'; node server.mjs
  macOS / Linux: PORT=4174 node server.mjs

该服务器只监听本机 127.0.0.1，适合本地查看，不会自动发布网站。
包内的页面与媒体从 public 提供；Foto 窗口需要联网，直接显示公开主页：
  https://the.fotoapp.co/kirinvisions
公开主页已在未登录的浏览器和 Scope 内验证。原 /app/profile 地址
是应用内入口，不能替代这个供访客浏览的公开地址。
Foto 上的照片由 Foto 提供；包内同时保留本地精选照片和音频。
此包不包含账号凭证，运行网站或查看公开 Foto 主页无需账号。
音频支持播放进度拖动；照片仍在网站的摄影模块与 SCOPE 中浏览。

文件结构
  public/                网站页面、图片、音频与其他资源
  server.mjs             无外部依赖的本地服务器
  server/                内容、账号与订阅管理后端
  data/seed-content.json  公开内容的初始值
  package.json           npm start 启动命令
  Start-Portfolio.cmd    Windows 启动器
  README.txt             本说明

如出现“找不到 public”提示，请确认完整解压，并且 server.mjs 与 public
处于同一层级。若显示 Node.js 未安装，请先安装 Node.js 并重新打开启动器。

本地内容管理与订阅名单
--------------------
网站首次运行时，访问本地网址的 /admin/，给用户名 root 设置至少12个字符的
密码或口令。没有默认密码。以后使用 root 与该密码登录。
密码只以加盐 scrypt 哈希存入本机 .data/admin.json，后台登录有效期为8小时；
重新启动服务器后需要重新登录。此本地 root 账号与 Foto 或线上账号无关。

后台保存的个人介绍、项目、音频和本地摄影资料会写入 .data/content.json。
重新加载页面或重启服务器后仍会保留。多人或多窗口同时编辑时，过期版本
会被拒绝；重新读取最新内容后再保存，避免覆盖其他更改。
音频单个文件最大1 GiB；图片、视频或 PDF 最大25 MiB，文件存入 .data/uploads/。
大文件流式写入临时文件，校验完成后才会显示；中断会清理未完成文件。
不接受 HTML、JavaScript 或 SVG。原始文件名仅用于显示，不用作服务器路径。

订阅表单需要明确勾选同意加入邮件列表。名单去重保存在 .data/subscribers.json；
root 可在后台查看、下载CSV或删除记录。目前功能是收集和管理名单，
不会自动发送邮件；若日后连接邮件发送服务，需要另行配置。

请保留 .data 文件夹来备份本地内容、上传媒体和订阅名单。该目录同时包含
密码哈希与私人邮箱资料，不要放入公开仓库或分享的ZIP。
发布包附带的 data/seed-content.json 仅是公开内容初始值；不包含密码或名单。
初次启动时才用该文件初始化内容；以后优先读取 .data 中保存的版本。
如需在其他磁盘保存运行数据，可设置 DATA_DIR 环境变量指向完整目录。
同一份数据目录只供一个本地服务器进程使用。

本地服务器仍然只接受本机访问；线上 /admin/ 使用独立的站内密码锁，
线上内容、上传和订阅名单与本地 .data 独立存储，不会自动相互同步。

English
-------
Extract all files before starting. Do not double-click the launcher inside
Windows' ZIP preview. Right-click the downloaded ZIP, choose "Extract All...",
then open the extracted KirinSounds-webapp folder. It must contain server.mjs,
public, server, data, and Start-Portfolio.cmd together before you run it.
Example: C:\Users\YourName\Documents\KirinSounds-webapp\Start-Portfolio.cmd

Running directly inside a ZIP can make Windows copy only the launcher into
a temporary folder. Its neighboring server.mjs is then unavailable, causing
"Cannot find module ... server.mjs". The archive itself can still be complete.
The launcher now checks its required files before calling Node. If files are
missing, it shows the "Extract All..." steps and exits without extracting or
deleting anything.

1. Extract the entire archive into one folder. Keep the complete public folder.
2. Install Node.js 22.13 or newer if needed. No extra packages, npm install,
   Foto account, or sign-in are required to run the local server.
3. Windows: double-click Start-Portfolio.cmd and keep its window open.
   Open http://127.0.0.1:4173/ in your browser.
   macOS / Linux: open a terminal in the extracted folder and run:
     node server.mjs
4. Press Ctrl+C in that window to stop the server.

You can also use npm start. Browse the local URL rather than opening
public/index.html directly so the site's files load correctly.

If the port is occupied:
  node server.mjs --port 4174
Then open http://127.0.0.1:4174/ .
Other options:
  Start-Portfolio.cmd --port 4174
  npm start -- --port 4174
  PowerShell: $env:PORT='4174'; node server.mjs
  macOS / Linux: PORT=4174 node server.mjs
The --port argument takes precedence over the PORT environment variable.

The server listens only on 127.0.0.1 and does not publish the site.
Pages and included media are served from public. The Foto window needs an
internet connection and loads the public profile directly:
  https://the.fotoapp.co/kirinvisions
This public route has been verified in a signed-out browser and inside
the Scope. The original /app/profile route opens Foto's signed-in app.
Foto serves its photographs; local selected images and audio are included.
No account credentials or account sign-in are needed to run the local site
or view the public Foto profile.
Audio seeking is supported. Photography stays inside the site's photo
module and SCOPE interface.

Folder layout:
  public/                Pages, photographs, audio, and other site assets
  server.mjs             Dependency-free local server
  server/                Content, account, and subscription backend
  data/seed-content.json  Initial public content
  package.json           npm start command
  Start-Portfolio.cmd    Windows launcher
  README.txt             These instructions

If public cannot be found, extract all files and keep public beside server.mjs.
If Node.js is missing, install it and reopen the launcher.

Local content management and email list
---------------------------------------
On first use, open /admin/ on the local website, then create a password or
passphrase of at least 12 characters for username root. There is no default
password. Later, sign in with root and that password.
Only a salted scrypt password hash is stored in .data/admin.json. Sessions
expire after eight hours and are cleared when the server restarts.
This local account is separate from Foto and the hosted site's identity.

Saved profile text, projects, audio records, and local photographs persist
in .data/content.json across reloads and restarts. Saving an outdated revision
is rejected; reload current content before saving to avoid overwriting
another window's changes. Uploaded raster images, audio, video, and PDFs
are stored in .data/uploads/. Audio supports up to 1 GiB; other files are limited to 25 MiB. HTML,
JavaScript, and SVG uploads are rejected. Original names are display-only.

Email subscription requires explicit consent. Deduplicated addresses are
stored in .data/subscribers.json. Root can view the list, export CSV, and
delete records. This collects and manages an email list; it does not send
newsletters automatically. A delivery service would need separate setup.

Back up .data to retain local content, uploads, and subscribers. It also
contains the password hash and private email addresses: never commit it
or include it in a shared ZIP. The distributed data/seed-content.json
contains only initial public content, without credentials or subscribers.
It initializes content on first launch only; later launches use saved .data content.
Set DATA_DIR to a full directory path to keep data elsewhere. Run only
one server process against a given data directory.

The local server remains restricted to this computer. The hosted admin
uses its standalone password lock at /admin/. Hosted content, uploads, and subscribers are stored
separately from local .data and do not automatically sync in either direction.

独立服务器模式 / Standalone VPS mode
-----------------------------------
独立VPS可使用同一个Node后端，详见 README_VPS。明确设置
KIRIN_DEPLOYMENT=server、PUBLIC_ORIGIN=https://kirinsounds.art，以及指向
持久磁盘的绝对 DATA_DIR。Node始终只监听127.0.0.1；HTTPS由本机Caddy代理。
此模式必须先在服务器终端运行 node server/create-admin.mjs，隐藏输入并确认
root密码，然后再启动网站。浏览器首次设密被禁用；未创建root时服务拒绝启动。
CLI不接受密码参数或密码环境变量，已有管理员也不会被覆盖。
VPS仍使用单进程JSON存储，每份DATA_DIR只能运行一个Node实例；
不要使用多副本、cluster或PM2集群。备份完整DATA_DIR，并保护其中的账号哈希
与订阅名单。VPS与Sites、电脑本地的数据均独立，不能自动同步。

The same Node backend supports a standalone VPS; see README_VPS.
Set KIRIN_DEPLOYMENT=server, PUBLIC_ORIGIN=https://kirinsounds.art, and an
absolute persistent DATA_DIR. Node stays on 127.0.0.1 behind local Caddy HTTPS.
Before starting the site, run node server/create-admin.mjs in the server
terminal and enter/confirm the hidden root password. Browser setup is disabled;
the production service refuses to start without a valid administrator hash.
The CLI accepts no password argument or password environment variable, and
never overwrites an existing administrator. Its --password-stdin option is
for protected input streams; do not put a secret in a shell command.
Storage remains single-process JSON: run only one Node instance for each
DATA_DIR, without clusters or multiple replicas. Back up the whole directory
and protect its credential hash and subscriber list. VPS, Sites, and local
computer data are separate and do not automatically synchronize.
