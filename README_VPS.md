# kirinsounds.art 自有服务器部署

这里准备的是 Ubuntu 24.04 / Linux Docker 部署方案，尚未连接或更改远程服务器。网站前端、媒体、root 内容管理和订阅名单由 Node 24 提供；Caddy 负责 HTTPS。它与现有 Sites 版本独立，未修改 Sites 的身份、数据库或访问策略。

## 服务器就绪后需确认

- 服务器实际系统、公网 IPv4、SSH 登录方式，以及 80/443 是否已有服务。
- 如服务器确实启用 IPv6，再确认公网 IPv6；不要预先添加 AAAA。
- 确认当前网站与邮箱的 DNS 备份，并安排域名切换时间。

本方案使用 apex 域名 `kirinsounds.art`。当前只读 DNS 检查显示它仍指向 Wix：A 为 `185.230.63.171`、`185.230.63.186`、`185.230.63.107`，`www` 为 `cdn3.wixdns.net` 的 CNAME，TTL 3600；AAAA 未返回地址。NS 为 `ns10.wixdns.net`、`ns11.wixdns.net`。Google 邮箱 MX 为 `aspmx.l.google.com` 和 `alt1`–`alt4.aspmx.l.google.com`。实际切换前应再次核对。

**只在确认服务器就绪后，把 apex 的网站 A 记录改为实际 VPS IPv4。这里没有预填 VPS 地址。保留 NS、MX、TXT（包括 SPF/DKIM/DMARC）、域名验证和其他邮箱记录。** 不能将删除整个 DNS 区域当作迁移步骤。保存现有网站记录，可在需要时恢复；DNS 生效需要时间。

`www` 不包含在默认切换中。若也需要它，另行将 `www` 的 CNAME 改为 `kirinsounds.art`，再启用 Caddyfile 末尾的 `www` 跳转段。只加 CNAME 不会自动启用服务器上的域名处理。

## 文件与网络结构

```text
浏览器 → HTTPS 443 → Caddy → 127.0.0.1:4173 → Node
                                      └→ /data 持久卷
```

- `deploy/vps/compose.yml`：两个容器和三个持久卷。
- `deploy/vps/Dockerfile`：只复制 `public/`、初始公开内容和 Node `.mjs` 后端；不运行 npm install，不包含 Vinext、账号、旧订阅名单或私有原始素材。
- `deploy/vps/Dockerfile.dockerignore`：构建上下文白名单。
- `deploy/vps/Caddyfile`：apex HTTPS 和固定代理头。
- `deploy/vps/healthcheck.mjs`：容器内部健康检查。

Node 以 UID/GID 1000 的非 root 用户运行，根文件系统只读；只有 `/data` 和临时目录可写。Node 仍只监听容器内的 `127.0.0.1:4173`。Caddy 通过 `network_mode: service:app` 与其共享网络命名空间。Compose 只映射 80/TCP、443/TCP 和 443/UDP，**不映射 4173**，也不使用宿主机网络模式。

Caddy 会覆盖来访者提供的代理头，向 Node 传递固定的公开 Host、HTTPS 协议和单一客户端 IP。默认方案按直接连接 VPS 的 DNS 记录设计；若日后增加 CDN 或其他代理，应先重新确认客户端 IP 的信任配置。

## 首次部署：先创建 root，再开放服务

先安装并确认 Docker Engine 和 Compose 插件。使用 [Docker 官方 Ubuntu 安装说明](https://docs.docker.com/engine/install/ubuntu/)，不要在未检查现有服务和防火墙时直接替换服务器软件。

将完整源码包放入服务器专用目录，例如 `/opt/kirin-portfolio`。不要上传自己电脑的 `.data/`、`.env`、`node_modules/`、部署令牌或私人原始材料。随后在源码目录操作：

```sh
cd /opt/kirin-portfolio/deploy/vps
cp .env.example .env
docker compose version
docker compose config --quiet
docker compose build app
```

`.env` 只记录可选镜像标签和持久卷名称，不保存 root 密码。首次使用的默认标签为 `node:24-bookworm-slim` 与 `caddy:2-alpine`；部署验收后可将镜像改为已验证的具体版本或 digest，更新时先记录原版本。

在不启动网站、不发布端口的临时容器中创建管理员：

```sh
docker compose run --rm --no-deps app node server/create-admin.mjs
```

按终端提示输入并确认密码，输入内容不会显示。没有默认密码。已有 root 时命令会拒绝覆盖；不要删除数据目录来“重置”。此命令使用同一个 `/data` 持久卷，但 `docker compose run` 默认不发布服务的端口，**不要添加 `--service-ports`**。如自动化初始化，CLI 另支持 `--password-stdin` 从受保护的标准输入读取；密码不能放在命令参数、镜像或环境变量中。

完成 root 初始化后再启动：

```sh
docker compose up -d app caddy
docker compose ps
docker compose logs --tail=50 app caddy
```

生产模式会在 root 尚未初始化时拒绝启动。Caddy 等 Node 健康后才启动代理。确认服务器和云防火墙允许外部访问 80/TCP、443/TCP；443/UDP 用于 HTTP/3。保留现有 SSH 访问规则，不能用开放全部端口替代配置。确认没有其他程序占用 80/443。

当 apex DNS 已正确指向 VPS、80/443 可达、证书卷可写时，Caddy 会自动申请并续期证书，并把 HTTP 跳转到 HTTPS。[Caddy 官方 HTTPS 要求](https://caddyserver.com/docs/automatic-https)

## 验收

```sh
docker compose exec app node /app/healthcheck.mjs
curl -I https://kirinsounds.art/
curl -fsS https://kirinsounds.art/api/auth/status
```

网站打开前后都应确认：

1. 未登录访客可以浏览作品、播放音频、使用 Scope 拉线、切换三语与查看公开 Foto 窗口。
2. 未登录请求 `/api/admin/subscribers` 被拒绝；`/api/auth/status` 仅返回状态，不暴露凭证。
3. 使用离线创建的 root 登录，修改一项测试内容，刷新后仍在；恢复测试内容。
4. 上传一项测试媒体，确认可以读取和拖动音频进度；必要时从内容里移除测试条目。
5. 用专门的测试地址加入订阅，确认去重、CSV 导出及删除，然后清理测试记录。
6. 重启 app 与 Caddy 后，真实内容和订阅名单仍保留。浏览器登录会话在 Node 重启后需要重新登录。

root 面板通过网站页脚或 INDEX 中的后台入口打开。服务器版使用自有 root 密码，与 Sites 的 ChatGPT 身份和 Foto 账号不同。订阅功能只收集和管理邮件列表，不会自动发送邮件。

## 更新与回退

`public/` 是前端源码，`dist/` 是 Sites/Vinext 生成输出，自有服务器不需要它。更新时上传经过验证的源码，保留运行数据卷和 `.env` 中的卷名称。在更新前完成下面的备份，并记录当前源码版本与镜像标签。

```sh
docker compose build app
docker compose config --quiet
docker compose up -d --force-recreate app caddy
docker compose ps
```

由于两个容器共享网络命名空间，重建 app 时同时重建 Caddy，使代理连接到新的命名空间。这个过程有短暂停机，不会删除命名卷。回退时使用上一个已保留的源码／镜像版本，并继续使用原数据卷；若内容格式也发生变化，先在另一份恢复卷测试旧版本的兼容性。

**不要运行 `docker compose down -v`、`docker volume prune`，也不要在更新时清空或覆盖 `/data`。** `/data` 保存密码哈希、内容、上传和私人订阅地址。Caddy 的证书与配置分别保留在另外两个卷中。

## 备份

应用数据为 JSON 和上传文件。先停止 Caddy 与 app，避免内容及媒体写入过程中备份；完成后启动原服务。以下在 `deploy/vps` 目录运行：

```sh
umask 077
mkdir -p backups
backup_file="backups/app-data-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
docker compose stop caddy app
docker compose run --rm --no-deps --entrypoint tar app -C /data -czf - . > "$backup_file"
sha256sum "$backup_file" > "$backup_file.sha256"
docker compose up -d app caddy
sha256sum -c "$backup_file.sha256"
```

若归档命令失败，不要把生成的文件当作有效备份，仍应启动原服务并检查原因。备份包含密码哈希和私人邮箱，不可加入公开 Git 或可下载 ZIP；保留加密的异地副本。一般更新保留 Caddy 命名卷即可；整台服务器迁移时，也应通过受控服务器备份保留 Caddy 的证书卷和配置卷，它们同样包含敏感材料。

## 恢复：先用新卷验证，不覆盖原卷

先检查备份校验和和归档清单，确认它是自己生成的可信备份：

```sh
sha256sum -c "$backup_file.sha256"
tar -tzf "$backup_file"
```

保持原卷不动，新建一个明确命名的恢复卷：

```sh
restore_volume="kirin_app_data_restore_$(date -u +%Y%m%dT%H%M%SZ)"
docker volume create "$restore_volume"
docker run --rm -i --network none --read-only --user 1000:1000 \
  --mount "type=volume,source=$restore_volume,target=/data" \
  --entrypoint tar kirin-portfolio:local \
  --no-same-owner -C /data -xzf - < "$backup_file"
```

如 `.env` 使用其他 `APP_IMAGE` 标签，将示例中的 `kirin-portfolio:local` 换成已存在的同版镜像。恢复容器不接网络，也不发布端口。必须先确认命令成功，再停止原服务，将 `.env` 中 `APP_DATA_VOLUME` 改为新恢复卷的完整名称，重新启动并完成验收。原卷继续保留，恢复失败时可改回原卷名称；不要删除原卷。

## 当前验证范围与参考

部署文件可以在 Windows 上用 `docker compose config --quiet` 检查。没有运行中的 Linux Docker daemon 时，不能据此声称容器、证书或 VPS 已通过实际部署验收；这些需在服务器可用后完成。本文没有执行 DNS、服务器或邮件设置变更。

- [Caddy Docker Compose 运行方式](https://caddyserver.com/docs/running#docker-compose)
- [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Docker Compose 服务、健康检查与 network_mode](https://docs.docker.com/reference/compose-file/services/)
- [Docker compose run 的端口行为](https://docs.docker.com/reference/cli/docker/compose/run/)
- [Node 官方镜像非 root 运行](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user)
