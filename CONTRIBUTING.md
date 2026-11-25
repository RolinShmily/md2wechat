# 参与贡献（CONTRIBUTING）

欢迎通过 **Issue** 反馈问题或提出改进，也欢迎提交 **PR**。
详细的项目结构、编码规范与发布流程见 [`docs/development.md`](docs/development.md)。

## 提交 Issue

1. 先搜索现有 issue，避免重复。
2. 按仓库内置模板填写：
   - **Bug**：使用 `.github/ISSUE_TEMPLATE/bug.yml`。请包含
     - 复现使用的 `md2wechat` 命令与相关配置结构（**脱敏**）；
     - 预期与实际行为，附上完整错误输出与退出码；
     - 环境：OS、`node -v`、`npm ls -g @rol1n/md2wechat`，以及脱敏过的
       `md2wechat diagnose` 输出。
   - **Feature**：使用 `.github/ISSUE_TEMPLATE/feature.yml`。说明要解决的问题与
     期望的实现方式；若需要新的依赖、原生二进制或平台支持，请一并注明其许可证。
3. 敏感信息保护：**不要把 AppSecret、access_token 或完整 `state.json` 贴进 issue**。

常见错误码（`40164` / `48001` / `40013` / `45009`）的成因与处理见
[`docs/wechat-permissions.md`](docs/wechat-permissions.md)，部署类问题参考
[`docs/deployment.md`](docs/deployment.md)。

## 提交 PR

1. **分支**：从最新的 `main` 切分支，命名如 `fix/xxx`、`feat/xxx`、`docs/xxx`。
2. **本地验证**（与 CI 一致，见 `docs/development.md` §7）：

   ```bash
   pnpm install --ignore-scripts
   pnpm build
   pnpm typecheck
   pnpm test
   ```

   涉及 CLI 的改动，再完成 §7 的 CLI 冒烟与 `npm pack --dry-run` 打包校验。
3. **依赖变更**：修改 `package.json` 后必须用 `pnpm install` 更新
   `pnpm-lock.yaml`；新增大打包进 `dist/index.js` 的依赖或变更版本时，
   同步更新 [`THIRD_PARTY_NOTICES`](THIRD_PARTY_NOTICES)。
4. **提交信息**：使用 Conventional Commits（`fix(wechat): ...`、
   `feat(cli): ...`、`docs(config): ...`）；只 stage 本次修改的文件，禁止
   `git add .`。
5. **CI**：`.github/workflows/test.yml` 会在 Node 20 / 22 上运行
   build / typecheck / test，合并前需保持通过。
6. PR 描述里说明改动动机与验证过程；如改动配置字段，请同步
   `config.yaml.example` 与 [`docs/configuration.md`](docs/configuration.md)。

## 相关文档

| 文档 | 内容 | 何时阅读 |
|---|---|---|
| [docs/architecture.md](docs/architecture.md) | 包分层与数据流 | 理解代码结构时 |
| [docs/configuration.md](docs/configuration.md) | 全部配置字段与环境变量 | 改动配置时 |
| [docs/deployment.md](docs/deployment.md) | systemd / VPS 部署与通知 | 涉及部署时 |
| [docs/wechat-permissions.md](docs/wechat-permissions.md) | 接口权限与错误码 | 处理微信 API 报错时 |
| [docs/development.md](docs/development.md) | 构建、测试、提交与发布规范 | 开发与提 PR 前必读 |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 | 发版时在 `[Unreleased]` 下登记变更 |