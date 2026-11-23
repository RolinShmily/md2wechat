<h1 align="center">md2wechat</h1>

<h4 align="center">将 Markdown 静态博客文章自动排版并推送至微信公众号草稿箱</h4>

<div align="center">

[![npm](https://img.shields.io/npm/v/@rolinshmily/md2wechat?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@rolinshmily/md2wechat)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | [简体中文](README_zh.md)

</div>

---

## 项目简介

**md2wechat** 是一个单平台（微信公众号）内容同步 CLI。它直接读取你的 Git 博客仓库（Hugo、Hexo、Astro 等），把 Markdown 文章转换为微信公众号编辑器可用的内联样式 HTML，并通过官方 Draft API 写入**草稿箱**——不会自动群发，也不修改博客源文件。

核心能力：

- **28 套内置排版主题**，安全 Section 列表、代码块逐行高亮、外链转文末脚注。
- **增量同步**：以内容哈希为基线，只推送新文章；老文章修改不会被定时任务重复推送。
- **空基线保护**：新机器 / 新 VPS 不会把历史文章误判为“新增”而批量推送。
- **图片处理**：本地图片自动上传微信图床，WebP 自动转 PNG/JPEG 并控制体积。
- **草稿更新**：重复 push 同一篇会更新原草稿（草稿被删除时自动降级为新建）。
- **无头部署**：内置 `systemd install` 生成并启用定时器，适合 Linux VPS。
- **失败可见**：凭据错误、IP 白名单、草稿接口未授权都会快速失败并以非 0 退出码结束。

---

## 安装

### 方式一：npm 全局安装（推荐）

```bash
npm install -g @rolinshmily/md2wechat
md2wechat --help
# 也可使用短命令
md2wx --help
```

要求 **Node.js >= 20**。`sharp` 会随平台安装预编译二进制。

### 方式二：直接运行，不安装

```bash
npx @rolinshmily/md2wechat check
```

> 注意：每次 `npx` 可能重新解析版本；定时任务请使用全局安装或仓库构建方式。

### 方式三：从源码构建

```bash
pnpm install
pnpm build
pnpm cli --help
```

`pnpm build` 会把 CLI 打包成单文件 ESM（仅 `sharp` 为外部依赖），产物位于
`src/cli/dist/index.js`。

---

## 配置

按以下顺序查找配置文件，首个命中的生效：

1. `-c / --config <path>`
2. 环境变量 `MD2WECHAT_CONFIG`
3. 当前目录 `./config.yaml`
4. 用户级 `~/.config/md2wechat/config.yaml`
5. 系统级 `/etc/md2wechat/config.yaml`

初始化：

```bash
# 用户级
mkdir -p ~/.config/md2wechat
cp config.yaml.example ~/.config/md2wechat/config.yaml

# 或系统级（systemd 部署推荐）
sudo mkdir -p /etc/md2wechat
sudo cp config.yaml.example /etc/md2wechat/config.yaml
sudo chmod 600 /etc/md2wechat/config.yaml
```

最少需要填写：

```yaml
source:
  repoUrl: "https://github.com/you/your-blog.git"
  postsPath: "content/posts"

site:
  url: "https://blog.example.com"

sync:
  defaultCover: "{repoRoot}/public/og/og.png"

wechat:
  appId: "wx..."
  appSecret: "..."
```

完整字段说明见 [docs/configuration.md](docs/configuration.md)。

### 凭据放置

- 凭据写在 `config.yaml` 的 `wechat.appId` / `wechat.appSecret`（文件已被 `.gitignore` 忽略）。
- 环境变量 `WECHAT_APPID` / `WECHAT_SECRET` 仅在配置字段留空时兜底；**配置文件优先**。
- 不要把 AppSecret 写进命令行参数、镜像或日志。

### 状态文件在哪

`sync.stateFile` 记录“哪些文章已经推过”和图片缓存，默认位置：

| 运行场景 | 默认路径 |
|---|---|
| root / systemd / 已存在 `/etc/md2wechat` | `/var/lib/md2wechat/state.json` |
| 普通本地用户 | `~/.local/share/md2wechat/state.json` |

该文件是**机器本地**的，不随 Git 同步。换机器时可用
`md2wechat baseline --import <state.json>` 搬运，或重新建立基线。

---

## 常用命令

```bash
# 0. 诊断微信 API、出口 IP 白名单与草稿接口权限（只读）
md2wechat diagnose

# 1. 扫描博客状态（零微信请求，区分【新增待推】与【历史已修改】）
md2wechat check

# 2. 本地离线排版预览（无需凭据，打开 HTML 可一键复制富文本）
md2wechat preview my-post
md2wechat preview my-post -t klein -o /tmp/preview.html

# 3. 按需单篇或批量推送（失败以退出码 1 结束）
md2wechat push my-post
md2wechat push post-a post-b --dry-run
md2wechat push                 # 交互式勾选
md2wechat push -i --filter hugo

# 4. 增量同步（默认只推新文章，受 maxPerRun 限制）
md2wechat sync
md2wechat sync --dry-run
md2wechat sync --include-updated

# 5. 同步基线
md2wechat baseline              # 把当前已发布文章标记为基线
md2wechat baseline --status     # 查看基线位置与篇数
md2wechat baseline --import /path/to/state.json

# 6. 主题列表
md2wechat themes
```

### 同步基线（baseline）

`baseline` 把“当前博客里已发布的文章”记为已处理，不会访问微信（除非显式使用
`--remote` 去匹配后台草稿）。典型场景：

- **首次在已有博客上使用**：先 `md2wechat baseline`，避免把历史文章全推一遍。
- **新 VPS**：复制原机器的 `state.json`，或 `baseline --import`，或重新 baseline。
- **确实要把当前所有文章作为首批推送**：`md2wechat sync --initial-push`。

空基线且存在待推文章时，`sync` 会中止并打印处理建议；这是防误推保护，不是故障。

---

## systemd 定时同步（Linux）

```bash
# 首次运行会自动生成 /etc/md2wechat/config.yaml 模板并退出；
# 编辑配置后再次执行即可安装。
sudo md2wechat systemd install

# 自定义检查周期（默认 24h）
sudo md2wechat systemd install --interval 6h

# 只打印将要写入的 unit 文件，不落盘、不调用 systemctl
md2wechat systemd install --dry-run

# 查看状态与日志
systemctl status md2wechat-sync.timer
journalctl -u md2wechat-sync.service -n 50 -f

# 立即运行一次
sudo systemctl start md2wechat-sync.service

# 卸载（保留配置与状态）
sudo md2wechat systemd uninstall

# 卸载并清理 /etc/md2wechat 与 /var/lib/md2wechat
sudo md2wechat systemd uninstall --purge
```

安装器会：

- 写入 `/etc/systemd/system/md2wechat-sync.service` 与 `.timer`；
- 以执行 `sudo` 的用户身份运行（`SUDO_USER`），而不是 root；
- 自动创建状态目录并修正属主；
- 用 `flock` 防止并发运行；
- 执行 `systemctl daemon-reload` 并 `enable --now` 定时器。

首次启动会克隆博客仓库到状态目录下的 `blog-repo/`，因此请确保该目录有足够磁盘空间。

---

## 无桌面 Linux VPS 注意事项

1. **微信 IP 白名单**：公众号后台「设置与开发 → 基本配置 → IP 白名单」必须加入 VPS 的**出口 IP**。
   运行 `md2wechat diagnose` 可直接看到当前出口 IP 与 `40164` 错误提示。
2. **个人订阅号限制**：部分个人号没有草稿箱接口权限（`48001`）。此时 `diagnose` 会明确提示，
   请改用 `md2wechat preview` 生成 HTML 后手动粘贴到公众号后台。
3. **时区**：systemd 定时器按系统时区运行；如需固定时区，可在 unit 中设置
   `Environment="TZ=Asia/Shanghai"`（安装后可手动编辑 service）。
4. **凭据权限**：`/etc/md2wechat/config.yaml` 建议 `600`，安装器会自动设置。

---

## 通知（可选）

配置 `notify.webhookUrl` 或环境变量 `MD2WECHAT_WEBHOOK_URL` 后，同步成功/失败会发送
文本通知，支持飞书、企业微信、钉钉和通用 JSON 接收端。

```bash
export MD2WECHAT_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/..."
```

systemd 安装器不会主动写入该环境变量；需要时请编辑 service 文件或通过配置文件的
`notify.webhookUrl` 设置。

---

## 项目结构

```
src/
├── cli/          # 命令行入口；tsup 打包为单文件 ESM
├── renderer/     # Markdown → 微信内联样式 HTML（内置 Vendor: md-wechat）
├── sources/      # 博客文章发现、Git 拉取、资源解析
├── sync-core/    # 配置、增量状态、图片处理、草稿推送编排
└── wechat-sdk/   # 微信 access_token / 素材 / 草稿 API 客户端
```

详细分层与数据流见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，构建与测试规范见
[docs/BUILD.md](docs/BUILD.md)。

---

## 常见问题

**`40164 invalid ip`**
VPS 出口 IP 不在公众号白名单。把 `diagnose` 显示的 IP 加入后台白名单后重试。

**`48001 api unauthorized`**
账号未获得草稿箱接口权限（常见于个人订阅号）。使用 `preview` 手动粘贴。

**`本机尚无同步基线`**
先 `md2wechat baseline`，或复制/导入原机器的 `state.json`；确属首次推送时加
`--initial-push`。

**图片上传失败 / 正文图片缺失**
检查本地图片路径与 `source.assetRoots`；外链图片需允许 `downloadRemoteImages`。

**`sharp` 安装失败**
确认 Node 版本 >= 20，并让 npm 正常执行 `sharp` 的安装脚本（它需要下载平台预编译包）。

---

## 致谢与许可

- 微信内联排版与主题核心（`src/renderer/vendor/`）来自
  [laogou717/md-wechat](https://github.com/laogou717/md-wechat)，MIT License。
  完整声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 本项目采用 [MIT License](LICENSE)。
