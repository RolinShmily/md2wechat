# 开发指南（Development）

配套文档：[`architecture.md`](architecture.md)（架构与数据流）、
[`configuration.md`](configuration.md)（配置字段）、
[`wechat-permissions.md`](wechat-permissions.md)（接口权限与错误码）、
[`deployment.md`](deployment.md)（systemd / VPS 部署）。

## 1. 环境要求

- Node.js >= 20（CI 覆盖 20 / 22）
- pnpm >= 10（仓库使用 workspace + lockfile）
- Linux（systemd 子命令）；其他平台可运行 CLI，但没有 systemd 安装功能
- `sharp` 需要平台预编译二进制；安装依赖时允许其 install script

## 2. 常用命令

### 2.1 仓库根目录

```bash
pnpm install           # 安装 workspace 依赖
pnpm build             # 按拓扑顺序构建所有包，最后用 tsup 打包 CLI
pnpm typecheck         # 所有包 tsc --noEmit
pnpm test              # 所有包测试（CLI 测试需要先 build）
pnpm cli --help        # 运行已构建的 CLI
```

**顺序很重要**：workspace 包的 `exports` 指向 `dist/`，因此全新 checkout 上直接跑
`pnpm typecheck` 或 `pnpm test` 可能因缺少 `dist/*.d.ts` / `dist/index.js` 失败。
标准顺序是：

```bash
pnpm install --ignore-scripts
pnpm build
pnpm typecheck
pnpm test
```

若 `sharp` / `esbuild` 尚未安装二进制，需要去掉 `--ignore-scripts` 重新安装，或单独执行
`pnpm rebuild sharp esbuild`。这两个包在 `pnpm-workspace.yaml` 的
`onlyBuiltDependencies` 中白名单化，其他依赖的 install script 仍应保持禁用。

### 2.2 单包操作

```bash
pnpm --filter @md2wechat/sync-core build
pnpm --filter @md2wechat/renderer test
pnpm --filter @rol1n/md2wechat build

# 单个测试文件
pnpm --filter @md2wechat/sync-core exec tsx --test test/sync-core.test.ts
pnpm --filter @rol1n/md2wechat exec tsx --test test/cli.test.ts
```

### 2.3 CLI 自检序列

```bash
pnpm build
node src/cli/dist/index.js --help
node src/cli/dist/index.js themes
node src/cli/dist/index.js systemd install --dry-run   # 打印 unit，不落盘
```

## 3. 目录与命名约定

```
src/cli/src/index.ts        CLI 唯一入口
src/cli/dist/index.js       tsup 产物（不提交）
src/renderer/vendor/        vendored 上游文件，禁止直接改
src/renderer/src/           适配与预处理
src/sources/src/            文章发现与 Git
src/sync-core/src/          业务编排
src/wechat-sdk/src/         微信 API
```

- 文件名使用 kebab-case；类型/类使用 PascalCase；函数/变量 camelCase。
- 内部包统一 `@md2wechat/*`，发布包为 `@rol1n/md2wechat`。
- 所有相对 import 带 `.js` 扩展名（NodeNext ESM）。

## 4. 编码规范

### 4.1 语言与类型

- TypeScript strict；避免 `any` 扩散，外部 API 响应可局部 `any` 但必须立即收窄。
- 对外导出的函数写显式返回类型或用推断后的清晰结构。
- 配置与状态字段变更必须同步更新 `config.yaml.example` 与 `docs/configuration.md`。

### 4.2 错误处理

- 捕获具体错误，补充上下文后抛出；不要 `catch {}` 吞掉可行动的错误。
- 可降级的错误（如草稿 40007）必须显式判断并记录 `console.warn`。
- 面向用户的错误信息应包含：发生了什么、当前值/路径、下一步命令。

### 4.3 副作用与可测试性

- `renderer` / `sources` 不读全局配置；配置由 `sync-core` 注入。
- 网络客户端支持 `baseUrl` 与 `dryRun`，测试使用本地 HTTP mock。
- 状态文件路径、时间、锁都可通过参数注入，避免测试依赖真实 home。

### 4.4 注释

- 注释解释“为什么”，不复述代码。
- 涉及平台限制（微信 32 字标题、48001、40007 降级、空基线）必须写明背景。

## 5. 依赖策略

- 新增运行时依赖前先评估是否可用 Node 内置能力替代。
- 发布包的**运行时依赖只有 `sharp`**（原生二进制，必须外部安装并保持 external）；
  `highlight.js`、`markdown-it`、`markdown-it-mark`、`yaml` 及其传递依赖都在构建期
  由 tsup 打进 `dist/index.js`，只作为 `devDependencies` 参与构建。
- 打包内容或版本变化时，同步更新 `THIRD_PARTY_NOTICES` 中的 bundled 依赖清单。
- 内部包保持 `private: true`，不单独发布。
- 修改 `pnpm-lock.yaml` 必须来自 `pnpm install`，不要手改。
- 安装依赖默认 `--ignore-scripts`；需要原生构建的包需显式评估并记录。

## 6. 测试策略

| 包 | 重点 |
|---|---|
| `wechat-sdk` | token 缓存/刷新、错误码映射、draft 请求体、上传 |
| `renderer` | 预处理、主题渲染、链接脚注、图片映射、标题降级 |
| `sources` | frontmatter 映射、bundle/flat 扫描、pullInterval 冷却、资源解析 |
| `sync-core` | 增量判断、baseline 守卫、导入合并、图片缓存、E2E mock 微信 |
| `cli` | 构建产物端到端：themes / check / preview / push --dry-run |

E2E 测试使用 `node:http` 启动 mock 微信服务，覆盖：

- baseline 后 sync 不重复上传；
- 新文章上传正文图 + 封面 + `draft/add`；
- 老文章修改默认跳过；
- 手动 push 更新草稿并复用缓存；
- `draft/update` 返回 40007 时降级 `draft/add`；
- Webhook 通知触发。

## 7. 验证流程（Definition of Done）

`.github/workflows/test.yml` 在 Node 20 / 22 上执行相同的构建、类型检查与测试。

### 步骤 1 — 构建

```bash
pnpm build
```

确认 `src/cli/dist/index.js` 存在，首行 shebang 保留，`sharp` 未被打包进去：

```bash
head -1 src/cli/dist/index.js
grep -c "require(\"sharp\")\|from \"sharp\"" src/cli/dist/index.js || true
```

### 步骤 2 — 静态检查

```bash
pnpm typecheck
```

### 步骤 3 — 全量测试

```bash
pnpm test
```

### 步骤 4 — CLI 冒烟

```bash
node src/cli/dist/index.js --help
node src/cli/dist/index.js themes
node src/cli/dist/index.js check -c /path/to/config.yaml
node src/cli/dist/index.js preview <slug> -c /path/to/config.yaml -o /tmp/preview.html
node src/cli/dist/index.js push <slug> -c /path/to/config.yaml --dry-run
node src/cli/dist/index.js systemd install --dry-run -c /path/to/config.yaml
```

`push --dry-run` 应打印 `dry-run-draft-*`；`systemd install --dry-run` 只打印 unit，
不得写入 `/etc` 或调用 `systemctl`。

### 步骤 5 — 打包校验

```bash
cd src/cli
npm pack --dry-run
```

确认 tarball 只包含：

- `dist/`
- `config.yaml.example`
- `README.md` / `README.zh-CN.md`
- `CHANGELOG.md`
- `LICENSE`
- `THIRD_PARTY_NOTICES`
- `package.json`

并在临时目录做一次真实安装验证（可选）：

```bash
tmp=$(mktemp -d)
npm install -g --prefix "$tmp" ./rol1n-md2wechat-0.2.1.tgz
"$tmp/bin/md2wechat" --help
```

### 步骤 6 — 真实写操作（可选，需凭据）

```bash
md2wechat diagnose
md2wechat sync --dry-run
md2wechat sync
```

真实推送后检查：

1. 公众号后台草稿箱出现文章；
2. 标题、封面、正文图片、代码块、脚注显示正常；
3. 再次 `push` 同一篇时更新原草稿而不是新建；
4. state.json 中 `contentHash` 与 `draftMediaId` 已更新。

## 8. 发布流程

- 版本号只在 `src/cli/package.json` 维护；tag 格式 `vX.Y.Z`。
- 发布前先在 `CHANGELOG.md` 的 `[Unreleased]` 下整理变更，发版时改为
  `## [X.Y.Z] - YYYY-MM-DD` 并保留新的 `[Unreleased]` 段落。
- 推送 tag 会触发 `.github/workflows/release.yml`：构建、测试、`npm pack`、
  从 `CHANGELOG.md` 截取对应 `## [X.Y.Z]` 段落作为 Release Notes，创建 GitHub
  Release。找不到版本段落或段落为空时 workflow 直接失败。
- Release workflow 成功结束后，会自动触发独立的 `.github/workflows/publish.yml`
  （GitHub Actions `workflow_run` 事件），发布同一个 tag。Release 失败或 tag 不是
  `vX.Y.Z` 时不会发布。
- `publish.yml` 仍保留 `workflow_dispatch`，仅用于 npm 临时故障后的手动重试；正常运行
  发版不需要在 Actions 页面手动触发。
- 发布步骤是幂等的：如果 tag 对应版本已存在于 npm，工作流会跳过 `npm publish` 并正常
  结束，重复运行 Release / Publish 不会因“版本已发布”而失败。
- 首次发布必须在本机手动完成，以创建 npm 包；之后在 npmjs.com 的包设置里配置
  Trusted Publisher：Repository `RolinShmily/md2wechat`、Workflow `publish.yml`、
  Environment 留空。完成配置后，后续 Release 结束即可通过 `publish.yml` 免 token 自动发布。
- 发布使用 OIDC provenance，不需要长期 `NPM_TOKEN`。
- 发布前需要把根目录的 `README.md`、`README.zh-CN.md`、`CHANGELOG.md`、`LICENSE`、
  `THIRD_PARTY_NOTICES`、`config.yaml.example` 复制到 `src/cli/`。
  `src/cli` 的 `prepack` 脚本（`scripts/sync-cli-docs.mjs`）会自动完成。
- 发布后验证：`npm view @rol1n/md2wechat version`、
  `npx @rol1n/md2wechat --help`。

## 9. 提交规范

- 只 stage 本次修改的文件，禁止 `git add .`。
- 不提交 `config.yaml`、`state.json`、`.cache/`、`dist/`、`preview-*.html`。
- 提交信息使用 Conventional Commits：
  `fix(wechat): ...`、`refactor(cli): ...`、`docs(config): ...`。
- 不强制推送，不修改他人未提交的改动。

## 10. 常见问题

**`Cannot find module '@md2wechat/...'`**
先 `pnpm build`，确保依赖包的 `dist/` 存在。

**`tsup` 报错找不到类型**
确认依赖包已构建且 `types` 指向 `dist/index.d.ts`；必要时先跑一次 `pnpm -r build`。

**CLI 测试失败，提示 dist/index.js 不存在**
`pnpm --filter @rol1n/md2wechat build` 后再跑测试。

**`sharp` 报 `Could not load the "sharp" module`**
安装时 install script 被跳过或平台包缺失。重新安装 `sharp` 或执行
`pnpm rebuild sharp`。

**systemd install 提示需要 root**
除 `--dry-run` 外，安装/卸载必须 `sudo`；这是为避免写入 `/etc/systemd/system` 失败。
