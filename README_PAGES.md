# GitHub Pages 发布

这个版本使用 **GitHub Pages 展示前台，现有 Sites 提供持久后端**。Scope、音频、摄影、三语、订阅和后台入口都保留。源码可以放在 GitHub；Pages 发布产物仅包含 `public/` 的静态内容，不包含管理员凭证、订阅名单、后端运行数据或部署令牌。

正式仓库为 `hliu13-jms/Kirin_Sounds`，自定义域名已绑定并启用 HTTPS：

```text
https://kirinsounds.art/
```

## 前台、后台与公开内容

- Pages 从 `public/` 发布 HTML、样式、脚本、图片、字体和音频。相对资源路径支持项目子目录，拉线后的内容使用 hash 路由，不需要服务器重写规则。
- `public/site-config.js` 指定公开 API 的 Sites 来源。Pages 从该后端读取公开内容并提交订阅；读取与提交必须使用精确允许的 Origin，不能把管理员凭证传给跨域公开接口。
- 管理入口为 `/admin/`，首页不显示登录按钮。密码验证、保存、上传和订阅名单仍由 Sites 后端执行，但界面始终留在 `kirinsounds.art/admin/`，不需要 ChatGPT 登录。Pages 自身不运行 Node、D1 或登录 API。
- 管理会话使用只驻留页面内存的随机令牌，刷新后重新输入密码。会话四小时过期，退出立即撤销；管理 API 只接受精确允许的 HTTPS 来源与有效令牌。公共内容和订阅请求不携带管理令牌。
- 公开内容快照（`public/content-snapshot.json`）和静态 `projects.js`／`assets/audio.json` 用作浏览回退。后端可用时读取持久内容；快照需要在源码发布时更新。私人订阅名单不能放进快照。
- 已上传到后端的 `/uploads/` 媒体仍由后端地址提供。Foto 使用已验证的公开主页 `https://the.fotoapp.co/kirinvisions`。
- 后台音频最大1 GiB，超过25 MiB时自动分段上传并显示进度。失败会重试或清理未完成上传；上传后仍需保存全站才能关联展示。图片及其他媒体仍为25 MiB。

因此，发布 Pages 不会替换或清空现有 Sites 数据。若后端访问策略、域名或允许来源发生改变，需要同步配置并验证公开内容与订阅，不能仅检查首页截图。

## 本地导出

在源码根目录运行，无需 npm install：

```sh
node scripts/build-pages.mjs
```

结果写入 `.pages-output/`，不会修改 `public/`。脚本保留前台功能，拒绝符号链接，限制为静态文件类型，排除隐藏文件、账号／名单文件及后端目录，并生成 `.nojekyll`。它不读取 `.data/`、`server/`、环境文件、Git 或 Sites 凭证。

生成目录已加入 `.gitignore`。不要把整个源码根目录作为 Pages artifact 上传。默认导出不包含 `CNAME`，即使 `public/` 中意外留下该文件也会跳过，避免在项目地址验收前混入域名配置。

## GitHub Actions

1. 在正确账号下新建或选定作品集仓库，确认默认发布分支是 `main`。先检查源码提交范围，排除 `.data/`、真实 `.env`、私人原始材料、令牌和本地依赖。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 将源码与 `.github/workflows/pages.yml` 推送到 `main`。也可在 Actions 中手动运行 `Publish portfolio to GitHub Pages`。
4. 等待 build 和 deploy 均成功，检查样式、音频、Foto、三语、订阅与 `/admin/` 密码登录。

工作流仅运行静态导出，不安装依赖、不执行 Vinext 构建、不部署后端。发布使用 GitHub 提供的短期工作流身份，无需把个人访问令牌写进源码。`github-pages` 环境可限制为仅默认分支部署。

工作流使用已核实的官方主要版本：`checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`。上传动作启用隐藏文件仅为了携带导出器生成的 `.nojekyll`；输入路径严格为 `.pages-output`。

## kirinsounds.art：先验收 Pages，再绑定域名

首先验收 GitHub 提供的项目地址。之后在 GitHub 账号的 Pages 设置中按官方流程验证域名，再在仓库 Pages 的 **Custom domain** 中保存 `kirinsounds.art`，最后才按经确认的 DNS 方案切换网站记录，并等待 HTTPS 可用。

本项目用自定义 Actions 工作流发布，GitHub 通过仓库设置管理域名，不需要 `CNAME` 文件。仅在仓库放一个 `CNAME` 并不能完成绑定。[GitHub 自定义域名说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

域名在 Namecheap 注册，不代表当前 DNS 就由 Namecheap 托管。准备时检查到的权威 NS 仍是 Wix。若要离开 Wix 并更换 NS，应先完整备份并在新 DNS 区域重建需要保留的记录，尤其 Google 邮箱的 MX、SPF、DKIM、DMARC 和验证 TXT；再按单独确认的迁移计划切换。不要清空邮件记录或照搬旧 VPS 目标。Namecheap 的 GitHub Pages Host Records 教程仅适用于其 BasicDNS／PremiumDNS／FreeDNS。[Namecheap 官方说明](https://www.namecheap.com/support/knowledgebase/article.aspx/9645/2208/how-do-i-link-my-domain-to-github-pages/)

这个工作流不会更改 Namecheap、Wix、邮箱、NS 或自定义域名设置，也不会提前指定 CNAME。

## 验收与维护

部署后验证首页和各模块、播放器进度、手机布局、三语、Foto 窗口、公开内容 API，以及订阅真实入库。`/admin/` 应在当前域名内显示密码锁，未登录访客不能取得订阅名单或修改内容。后台密钥使用原生运行环境的 `ADMIN_PASSWORD_HASH` secret，不能提交到 GitHub。

内容通过 Sites 后台保存后，Pages 前台可读取新的公开内容。更新前台代码、打包媒体或离线快照时，修改对应源码并推送 `main`，等待新的 Pages 部署。纯浏览器静态导出不代表远程部署已经成功，最终以 Actions 结果和实际地址验证为准。

官方参考：

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [配置 Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [验证自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
