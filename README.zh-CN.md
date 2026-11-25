<h1 align="center">md2wechat</h1>

<h4 align="center">将 Markdown 博客文章排版并写入微信公众号草稿箱</h4>

<div align="center">

[![npm](https://img.shields.io/npm/v/@rol1n/md2wechat?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@rol1n/md2wechat)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 这是什么

**md2wechat** 读取 Git 博客仓库（Hugo、Hexo、Astro 等）中的 Markdown 文章，
渲染为微信公众号可用的内联样式 HTML，并通过官方 API 写入**草稿箱**。
它不会自动群发，也不会修改你的博客仓库。

## 需要什么

- **Node.js >= 20**。
- 一个具备草稿箱接口权限的**微信公众号**。个人订阅号通常会返回 `48001`，
  此时可改用 `preview` 生成 HTML 后手动粘贴。
- 一个使用 YAML frontmatter 的 **Git Markdown 博客**，支持
  `bundle`（`slug/index.md`）或 `flat`（`slug.md`）布局。
- 部署到 VPS 时，机器的**出口 IP 必须加入公众号后台白名单**，
  否则微信会返回 `40164`。
- AppID / AppSecret 放在 Git 之外的配置文件中。

## 安装

```bash
npm install -g @rol1n/md2wechat
md2wechat --help
md2wx --help          # 短命令
```

也可以不安装直接运行：

```bash
npx @rol1n/md2wechat check
```

## 快速开始

### 1. 创建配置

```bash
mkdir -p ~/.config/md2wechat
curl -fsSL https://raw.githubusercontent.com/RolinShmily/md2wechat/main/config.yaml.example \
  -o ~/.config/md2wechat/config.yaml
```

从源码仓库使用时，也可以直接
`cp config.yaml.example ~/.config/md2wechat/config.yaml`。

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

### 2. 检查账号与网络

```bash
md2wechat diagnose
```

该命令依次检查 token、图片/素材上传、草稿接口权限和当前出口 IP。

### 3. 渲染与推送

```bash
md2wechat check                    # 离线扫描：新增 vs 已修改
md2wechat preview my-post          # 离线 HTML 预览
md2wechat push my-post             # 推送单篇到草稿箱
md2wechat sync                     # 只推送新文章
```

在已有博客上首次使用前，先执行一次 `md2wechat baseline`，避免把历史文章当成新增。
当状态文件为空且存在待推文章时，`sync` 会主动中止——这是空基线保护，不是故障。
只有确实想全量推送时才使用 `sync --initial-push`。

### 4. 定时运行（可选）

```bash
sudo md2wechat systemd install --interval 6h
```

定时器、VPS 检查清单与 Webhook 通知见 [docs/deployment.md](docs/deployment.md)。

## 主要能力

- **28 套内置主题**，使用微信安全的 Section 结构与代码块逐行高亮。
- **增量同步**：以内容哈希为基线，定时任务不会重复推送已修改的老文章。
- **图片处理**：本地图片自动上传，WebP 转 PNG/JPEG，封面缺失时使用
  `sync.defaultCover`。
- **草稿更新**：重复推送会更新原草稿；草稿被删除时自动降级为新建。
- **失败可见**：凭据、IP 白名单、草稿权限错误会快速失败并以非 0 退出。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/configuration.md](docs/configuration.md) | 全部配置字段、环境变量、路径规则与状态文件 |
| [docs/deployment.md](docs/deployment.md) | systemd 定时器、无头 VPS 清单、Webhook 通知 |
| [docs/wechat-permissions.md](docs/wechat-permissions.md) | `40164` / `48001` / token / 频率限制排障 |
| [docs/development.md](docs/development.md) | 构建、测试、打包与发布流程 |
| [docs/architecture.md](docs/architecture.md) | 包分层、数据流与关键设计决策 |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |

## 许可

- 本项目采用 [MIT License](LICENSE)。
- 微信渲染引擎与主题适配自
  [laogou717/md-wechat](https://github.com/laogou717/md-wechat)。完整许可证文本见
  [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)。
