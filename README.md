<h1 align="center">md2wechat</h1>

<h4 align="center">Turn Markdown blog posts into WeChat Official Account drafts</h4>

<div align="center">

[![npm](https://img.shields.io/npm/v/@rol1n/md2wechat?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@rol1n/md2wechat)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## What it is

**md2wechat** reads Markdown posts from a Git-based blog (Hugo, Hexo, Astro, …),
renders them into WeChat-safe inline-styled HTML, and writes them to the
**Draft Box** through the official WeChat API. It never publishes, never sends
mass messages, and never modifies your blog repository.

## Requirements

- **Node.js >= 20**.
- A **WeChat Official Account** whose account type allows the draft API.
  Personal subscription accounts usually receive `48001`; use `preview` to copy
  rich text manually instead.
- A **Git-hosted Markdown blog** with YAML frontmatter, using either the
  `bundle` (`slug/index.md`) or `flat` (`slug.md`) layout.
- For VPS deployments, the machine's **egress IP must be whitelisted** in the
  Official Account backend; otherwise WeChat returns `40164`.
- An AppID / AppSecret kept in a config file outside Git.

## Install

```bash
npm install -g @rol1n/md2wechat
md2wechat --help
md2wx --help          # short alias
```

Or run without a global install:

```bash
npx @rol1n/md2wechat check
```

## Quick start

### 1. Create a config

```bash
mkdir -p ~/.config/md2wechat
curl -fsSL https://raw.githubusercontent.com/RolinShmily/md2wechat/main/config.yaml.example \
  -o ~/.config/md2wechat/config.yaml
```

If you are working from a source checkout, running
`cp config.yaml.example ~/.config/md2wechat/config.yaml` is equivalent.

At minimum:

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

### 2. Verify the account and network

```bash
md2wechat diagnose
```

This checks the token, image and material upload endpoints, draft permission,
and the current egress IP.

### 3. Render and push

```bash
md2wechat check                    # offline scan: new vs modified posts
md2wechat preview my-post          # offline HTML preview
md2wechat push my-post             # push one post to the draft box
md2wechat sync                     # push new posts only
```

On an existing blog, run `md2wechat baseline` once before the first sync so
historical posts are not treated as new. `sync` also aborts when the state file
is empty and posts are pending — that is the empty-baseline guard, not a
failure. Use `sync --initial-push` only when you really intend to push
everything.

### 4. Schedule it (optional)

```bash
sudo md2wechat systemd install --interval 6h
```

See [docs/deployment.md](docs/deployment.md) for the timer, VPS checklist, and
webhook notifications.

## Capabilities

- **28 built-in themes** with WeChat-safe section markup and per-line code
  highlighting.
- **Incremental sync** keyed on content hashes; edited historical posts are not
  re-pushed by the timer.
- **Image handling**: local images are uploaded to WeChat, WebP is converted to
  PNG/JPEG, and covers fall back to `sync.defaultCover`.
- **Draft updates**: repeated pushes update the existing draft; a deleted draft
  falls back to creating a new one.
- **Visible failures**: credential, IP whitelist, and draft-permission errors
  fail fast with a non-zero exit code.

## Documentation

| Document | Contents |
|---|---|
| [docs/configuration.md](docs/configuration.md) | Every config field, environment variable, path rule, and state file |
| [docs/deployment.md](docs/deployment.md) | systemd timer, headless VPS checklist, webhook notifications |
| [docs/wechat-permissions.md](docs/wechat-permissions.md) | `40164` / `48001` / token / quota troubleshooting |
| [docs/development.md](docs/development.md) | Build, test, package, and release workflow |
| [docs/architecture.md](docs/architecture.md) | Package layout, data flow, and design decisions |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## License

- This project is licensed under the [MIT License](LICENSE).
- The WeChat rendering engine and themes are adapted from
  [laogou717/md-wechat](https://github.com/laogou717/md-wechat). See
  [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for full license texts.
