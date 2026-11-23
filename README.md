<h1 align="center">md2wechat</h1>

<h4 align="center">Format Markdown blog posts and push them to the WeChat Official Account Draft Box</h4>

<div align="center">

[![npm](https://img.shields.io/npm/v/@rol1n/md2wechat?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@rol1n/md2wechat)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | [简体中文](README_zh.md)

</div>

---

## Overview

**md2wechat** is a single-platform CLI that turns Markdown posts from a Git blog
(Hugo, Hexo, Astro, …) into WeChat-compatible inline-styled HTML and writes them
into the **Draft Box** through the official API. It never publishes automatically
and never modifies your blog repository.

Highlights:

- **28 built-in themes**, safe section-based markup, per-line code highlighting,
  external links converted to end-of-post footnotes.
- **Incremental sync** based on content hashes: only new posts are pushed, while
  edits to old posts are never re-pushed by the timer.
- **Empty-baseline guard**: a fresh machine or VPS cannot silently push every
  historical post as if it were new.
- **Image handling**: local images are uploaded to WeChat; WebP is converted to
  PNG/JPEG and compressed under the size limit.
- **Draft updates**: pushing the same post again updates the existing draft, and
  falls back to creating a new draft if the old one was deleted.
- **Headless deployment**: `systemd install` writes and enables a timer unit.
- **Visible failures**: credential, IP whitelist, and draft-permission errors
  fail fast with a non-zero exit code.

---

## Installation

### Option 1: global npm install (recommended)

```bash
npm install -g @rol1n/md2wechat
md2wechat --help
# short alias
md2wx --help
```

Requires **Node.js >= 20**. `sharp` installs a prebuilt binary for your platform.

### Option 2: run without installing

```bash
npx @rol1n/md2wechat check
```

> `npx` may re-resolve the package per invocation. For scheduled jobs, prefer a
> global install or a source build.

### Option 3: build from source

```bash
pnpm install
pnpm build
pnpm cli --help
```

`pnpm build` bundles the CLI into a single ESM file at `src/cli/dist/index.js`
(with `sharp` as the only external dependency).

---

## Configuration

Configuration files are discovered in this order (first match wins):

1. `-c / --config <path>`
2. `MD2WECHAT_CONFIG`
3. `./config.yaml`
4. `~/.config/md2wechat/config.yaml`
5. `/etc/md2wechat/config.yaml`

Initialize one:

```bash
# User-level
mkdir -p ~/.config/md2wechat
cp config.yaml.example ~/.config/md2wechat/config.yaml

# System-level (recommended for systemd)
sudo mkdir -p /etc/md2wechat
sudo cp config.yaml.example /etc/md2wechat/config.yaml
sudo chmod 600 /etc/md2wechat/config.yaml
```

Minimum fields:

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

See [docs/configuration.md](docs/configuration.md) for every option.

### Credentials

- Put credentials in `config.yaml` under `wechat.appId` / `wechat.appSecret`
  (the file is git-ignored).
- `WECHAT_APPID` / `WECHAT_SECRET` are fallbacks only when the config fields are
  empty; **the config file always wins**.
- Never pass the AppSecret on the command line, bake it into an image, or log it.

### Where the state file lives

`sync.stateFile` stores “which posts were already pushed” plus image caches.
Defaults:

| Runtime context | Default path |
|---|---|
| root / systemd / `/etc/md2wechat` exists | `/var/lib/md2wechat/state.json` |
| normal local user | `~/.local/share/md2wechat/state.json` |

The file is **machine-local** and is not synced through Git. To move it:

```bash
md2wechat baseline --import /path/to/state.json
```

---

## Commands

```bash
# 0. Diagnose the WeChat API, egress IP whitelist, and draft permission (read-only)
md2wechat diagnose

# 1. Offline scan (zero WeChat requests; reports new vs modified posts)
md2wechat check

# 2. Offline render preview (no credentials needed; copy rich text from the HTML)
md2wechat preview my-post
md2wechat preview my-post -t klein -o /tmp/preview.html

# 3. Targeted or batch push (non-zero exit when any post fails)
md2wechat push my-post
md2wechat push post-a post-b --dry-run
md2wechat push                 # interactive selection
md2wechat push -i --filter hugo

# 4. Incremental sync (new posts only by default, capped by maxPerRun)
md2wechat sync
md2wechat sync --dry-run
md2wechat sync --include-updated

# 5. Baseline
md2wechat baseline              # mark current published posts as processed
md2wechat baseline --status     # show path and counts
md2wechat baseline --import /path/to/state.json

# 6. Themes
md2wechat themes
```

### What the baseline is

`baseline` marks every currently published post as already handled. It does not
touch WeChat unless you pass `--remote` to match existing drafts.

- **First run on an existing blog**: run `md2wechat baseline` first.
- **New VPS**: copy/import the original `state.json`, or baseline again.
- **Intentionally push everything now**: `md2wechat sync --initial-push`.

When the state file is empty and posts are pending, `sync` aborts with guidance.
That is a safety guard against mass-pushing historical posts.

---

## Scheduled sync with systemd (Linux)

```bash
# The first run creates /etc/md2wechat/config.yaml and exits.
# Edit it, then run the command again.
sudo md2wechat systemd install

# Custom interval (default 24h)
sudo md2wechat systemd install --interval 6h

# Print the units without writing or calling systemctl
md2wechat systemd install --dry-run

# Inspect
systemctl status md2wechat-sync.timer
journalctl -u md2wechat-sync.service -n 50 -f

# Run once now
sudo systemctl start md2wechat-sync.service

# Uninstall (keeps config and state)
sudo md2wechat systemd uninstall

# Uninstall and remove /etc/md2wechat + /var/lib/md2wechat
sudo md2wechat systemd uninstall --purge
```

The installer:

- writes `/etc/systemd/system/md2wechat-sync.{service,timer}`;
- runs as the invoking user (`SUDO_USER`), not root;
- creates the state directory and fixes ownership;
- wraps execution in `flock` to prevent overlapping runs;
- runs `systemctl daemon-reload` and `enable --now`.

The first run clones the blog repository into `<state dir>/blog-repo/`.

---

## Headless VPS notes

1. **IP whitelist**: add the VPS **egress IP** to the Official Account backend
   under Settings → Basic Configuration → IP Whitelist. `md2wechat diagnose`
   prints the current egress IP and explains `40164`.
2. **Personal account limits**: some personal subscription accounts cannot use
   the draft API (`48001`). `diagnose` reports this; use `md2wechat preview` and
   paste the HTML manually instead.
3. **Timezone**: the systemd timer follows the system timezone. Set
   `Environment="TZ=Asia/Shanghai"` in the service unit if needed.
4. **Credentials**: keep `/etc/md2wechat/config.yaml` at mode `600`; the
   installer sets this automatically.

---

## Notifications (optional)

Set `notify.webhookUrl` or `MD2WECHAT_WEBHOOK_URL` to receive success/failure
messages via Feishu, WeCom, DingTalk, or a generic JSON endpoint.

```bash
export MD2WECHAT_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/..."
```

The systemd installer does not add this variable; use the config field or edit
the generated service.

---

## Repository layout

```
src/
├── cli/          # CLI entry; bundled by tsup into a single ESM file
├── renderer/     # Markdown -> WeChat inline HTML (vendored md-wechat)
├── sources/      # post discovery, Git pull, asset resolution
├── sync-core/    # config, incremental state, image handling, draft orchestration
└── wechat-sdk/   # access_token / material / draft API client
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/BUILD.md](docs/BUILD.md).

---

## Troubleshooting

**`40164 invalid ip`** — the VPS egress IP is not whitelisted. Add the IP shown
by `diagnose` and retry.

**`48001 api unauthorized`** — the account lacks draft API permission (common
for personal subscriptions). Use `preview`.

**`本机尚无同步基线` (no baseline)** — run `md2wechat baseline`, import another
machine's `state.json`, or pass `--initial-push` for a genuine first push.

**Images missing** — check local paths and `source.assetRoots`; remote images
require `downloadRemoteImages: true`.

**`sharp` install failure** — verify Node >= 20 and allow `sharp`'s install
script to download the platform binary.

---

## Credits & License

- The WeChat renderer and themes in `src/renderer/vendor/` are adapted from
  [laogou717/md-wechat](https://github.com/laogou717/md-wechat) under the MIT
  License. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- This project is licensed under the [MIT License](LICENSE).
