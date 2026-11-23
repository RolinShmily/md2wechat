# 项目架构（ARCHITECTURE）

## 1. 设计目标与边界

`md2wechat` 的职责范围被刻意收窄：

- **只处理微信公众号**：文章写入草稿箱，不调用群发/发布接口。
- **只读博客仓库**：不会修改 Markdown、frontmatter 或博客的 Git 历史。
- **离线优先**：`check` / `preview` / `baseline` 默认不访问微信；只有 `sync` / `push` /
  `baseline --remote` / `diagnose` 会产生网络请求。
- **可无头运行**：所有状态落在机器本地的文件里，适合 systemd 定时任务。
- **失败要可见**：配置/凭据/权限错误快速失败，进程以非 0 退出码结束。

不在范围内：文章发布后的排版微调、多平台分发、评论管理、素材库清理、自动群发。

## 2. 分层与依赖

```
┌──────────────────────────────┐
│            cli               │  argv 解析、交互式选择、systemd 安装
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│         sync-core            │  配置、状态、图片、编排、通知
└───┬──────────┬───────────┬───┘
    │          │           │
┌───▼────┐ ┌───▼─────┐ ┌───▼────────┐
│sources │ │renderer │ │wechat-sdk  │
└────────┘ └─────────┘ └────────────┘
```

依赖方向严格单向，底层包不感知 CLI 与上层编排：

- `sources`：文件系统 / Git / 资源解析，不依赖微信。
- `renderer`：Markdown → HTML，不依赖网络。
- `wechat-sdk`：只负责 HTTP API 与错误映射，不读配置、不读状态。
- `sync-core`：唯一知道“配置 + 状态 + 渲染 + 上传”如何组合的层。
- `cli`：只做输入输出与进程退出码，不实现业务细节。

发布产物只包含 `cli` 的 bundle；其余包在构建期被打包进单文件（`sharp` 保持外部依赖）。

## 3. 各包职责

### `src/sources` — 内容与资产来源

- `FsSource`：按 `layout`（bundle / flat）扫描文章，解析 YAML frontmatter。
- `GitSource` 辅助函数：`git clone` / `git pull`、分支与远端处理。
- `pullInterval`：根据状态文件中的 `lastGitPullAt` 判断是否跳过本次拉取，避免定时任务
  每轮都访问远端。
- `asset-resolver`：按 `assetRoots` 顺序解析本地图片，支持 `{postDir}` / `{repoRoot}`。
- 输出统一的 `SourcePost`：`id`、`title`、`summary`、`bodyMarkdown`、`contentHash`、
  `coverRaw`、`draft`、`publishedAt`、`canonicalUrl` 等。

`contentHash` 是标题、摘要、封面、正文与同目录图片元数据的复合 SHA-256，用于增量判断。

### `src/renderer` — 微信公众号排版

- 包装 vendored `md-wechat` 渲染器与 28 套主题。
- 预处理：frontmatter 之外的内容清洗、标题降级、图片引用收集、外链转脚注、
  图注生成、相对链接补全。
- 输出内联样式 HTML（微信编辑器不支持 `<style>` 与外链 CSS）。
- `listThemes()` 供 `md2wechat themes` 使用。

vendored 文件不允许直接修改；所有适配都在 `src/` 中完成。

### `src/wechat-sdk` — 微信 API 客户端

- `TokenManager`：access_token 获取、缓存、并发去重、强制刷新。
- 素材：`uploadimg`（正文图）与 `add_material`（封面）。
- 草稿：`draft.add` / `draft.update` / `draft.batchGet`。
- `WeChatError`：统一 errcode / errmsg / 动作描述，提供 `isUnauthorized()`、
  `isNonFallbackError()` 等判断。
- `dryRun` 模式：不发送写请求，返回可预测的假 ID，用于演练与测试。

### `src/sync-core` — 编排层

| 模块 | 职责 |
|---|---|
| `config.ts` | 配置发现、YAML 解析、路径解析、凭据优先级、状态默认路径 |
| `state-store.ts` | 状态文件读写、文件锁、baseline/synced 记录、图片/封面缓存、导入 |
| `image-processor.ts` | 图片格式转换、体积压缩、上传去重、封面处理 |
| `normalize.ts` | 微信标题 32 字截断、摘要 120 字截断 |
| `preflight.ts` | 凭据存在性与占位值检查 |
| `notifier.ts` | 可选 Webhook 通知 |
| `pipeline.ts` | `check` / `baseline` / `preview` / `push` / `sync` 的业务编排 |

### `src/cli` — 入口

- 解析命令与参数，加载配置，调用 pipeline。
- 交互式文章选择（序号、区间、`new` / `updated`、slug、排序翻转）。
- `systemd install/uninstall`：生成 unit、创建目录、修正权限、调用 `systemctl`。
- 统一退出码：任一文章失败或致命配置错误 → 1。

## 4. 关键数据流

### 4.1 `check`（零微信请求）

```
loadConfig
  → SyncPipeline.check
    → FsSource.prepare (可选 git pull，受 pullInterval 冷却)
    → scanPosts → contentHash
    → StateStore.getPost
    → 分类: new / updated / unchanged / baselined / draft
```

`check` 不会调用 `assertWeChatReady`，因此可以在没有凭据的机器上先审视待推内容。

### 4.2 `sync`

```
assertWeChatReady（dry-run 跳过）
  → withLock
    → prepare (git pull)
    → scanPosts
    → 过滤 draft；state 不存在 → new；hash 变化 → updated
    → 空基线保护（isEmpty && pending && !allowInitialPush → 中止）
    → 截断 maxPerRun，按发布时间倒序优先
    → 逐篇 pushInternal
    → sendSyncNotification
```

注意：`toProcess` 先 `slice` 再 `reverse`，因此优先推送最新的文章，但输出顺序保持稳定。

### 4.3 `push`

```
withLock
  → assertWeChatReady
  → getPost
  → 图片：resolve → 转换/压缩 → uploadimg（带缓存）
  → 封面：frontmatter image → sync.defaultCover → 缺失则失败
  → renderer.renderArticle（内联 CSS）
  → 有 draftMediaId 且非 --force：draft.update
       └─ 40007 等可降级错误 → draft.add
  → 保存 state（contentHash + mediaId）
```

`--force` 强制新建草稿，但不会删除旧草稿。

### 4.4 `preview`

```
getPost
  → 收集图片引用 → 读本地文件 → data: URI 内联
  → renderArticle
  → 包裹为可独立打开的 HTML（含一键复制按钮）
```

`preview` 不访问网络、不需要凭据；远程图片不会下载，保留原始引用。

### 4.5 `baseline`

- 默认：把当前所有已发布文章写入状态文件，`status = baselined`。
- `--status`：只读展示。
- `--import`：合并其他机器的 `state.json`，本地记录优先。
- `--remote`：访问微信草稿箱/已发表列表，按 canonical URL 或标题匹配并绑定
  `draftMediaId`；已发表列表返回 48001 时自动跳过。

## 5. 关键设计决策

1. **单文件 bundle**：`tsup` 把所有内部包打进 `dist/index.js`，避免 npm 包内 workspace
   依赖解析问题；`sharp` 必须外部化，因为它是带原生二进制的平台包。
2. **配置与状态分离**：配置文件可随仓库/团队共享；状态文件是机器本地事实来源。
   默认状态路径按 root/systemd 与普通用户分流，避免 systemd 写进 `/root` 或只读目录。
3. **空基线保护**：新机器上“所有文章都是新的”是错觉；宁可中止并提示，也不 mass push。
4. **草稿更新优先**：重复 push 更新原草稿，避免草稿箱堆积；仅在明确的可降级错误时新建。
5. **图片缓存**：以内容哈希为键缓存微信 URL，避免重复上传占用素材配额。
6. **标题/摘要本地截断**：微信 API 对超长标题的行为不一致，先在本地按字符数截断。
7. **systemd 以调用者身份运行**：`sudo md2wechat systemd install` 使用 `SUDO_USER`，
   而不是 root，降低密钥与文件权限风险。
8. **flock 而非应用内锁**：应用内文件锁只能防同一状态文件的并发；systemd 级 `flock`
   还能防止手动执行与定时任务重叠。

## 6. 扩展点

- **新博客布局**：在 `sources` 增加 `SourceAdapter` 实现，或在 `FsSource` 中扩展
  `layout`。
- **新主题**：在 `renderer` 的 vendored `themes.js` 之外注册主题元数据；不要直接改
  vendored 文件。
- **新通知渠道**：`notifier.ts` 根据 URL 生成不同 payload；新增渠道只需增加分支。
- **新部署方式**：CLI 已提供 `--dry-run` 与纯 JSON/文件状态，可被容器 entrypoint 或
  cron 调用；systemd 只是其中一种封装。

## 7. 已知边界

- 微信草稿接口对个人订阅号可能不可用（48001）；本工具不绕过权限。
- 微信不提供“删除草稿”的稳定公开接口；本工具不管理草稿清理。
- 正文中的 SVG、iframe、复杂表格可能被微信编辑器过滤；`renderer` 会尽量降级并给出
  warning，但无法保证与浏览器完全一致。
- 状态文件损坏时（非法 JSON），`StateStore` 会回退为空状态并打印警告；此时请恢复备份，
  否则可能触发空基线保护。
- `pullInterval` 依赖状态文件；删除状态文件会同时重置拉取冷却。
