# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-11-25

### Added

- GitHub issue templates for bug reports and feature proposals.
- `docs/deployment.md` covering the systemd timer, headless VPS checklist, and
  webhook notifications.
- Release notes are now extracted from this changelog by the Release workflow.

### Changed

- README is now a concise "what it is / what you need / how to use" guide; deep
  operational details live under `docs/`.
- Documentation filenames normalized (`docs/architecture.md`,
  `docs/development.md`) and all cross-links updated.
- CI workflow renamed from `ci.yml` to `test.yml` (workflow name `Test`).
- Chinese README renamed from `README_zh.md` to `README.zh-CN.md`.
- `THIRD_PARTY_NOTICES` now follows a plain-text notice format and reproduces
  the full license texts of bundled dependencies.
- npm publishing is triggered by the Release workflow through `workflow_run`,
  and skips versions that are already on the registry.

### Fixed

- The Release workflow now fails when the tag has no matching, non-empty
  changelog section instead of publishing empty notes.

## [0.2.0] - 2026-11-23

### Changed

- **Breaking:** converged on the WeChat-only `md2wechat` CLI and removed the
  HeyBox/Xiaoheihe sync target.
- Moved workspace packages from `packages/` to `src/` and bundled the CLI into
  a single ESM file with tsup (`sharp` stays external).
- Published as `@rol1n/md2wechat`; `md2wechat` and `md2wx` both point at the
  bundled entry.
- Reworked README around a concise quickstart and headless VPS notes.
- Renamed `config.example.yaml` to `config.yaml.example`.

### Removed

- HeyBox/Xiaoheihe SDK, renderer pipeline, and `sync.target` configuration.

### Fixed

- Normalized npm `bin` paths so both commands resolve after a global install.
- Fail fast when credentials are missing instead of continuing into a partial
  sync.

## [0.1.0] - 2026-11-07

### Added

- Initial release: Markdown blog posts converted to WeChat inline-styled HTML
  and written to the Draft Box.
- 28 built-in themes, incremental sync keyed on content hashes, empty-baseline
  guard, image upload, and WebP conversion.
- Draft updates with fallback to a new draft, plus `diagnose`, `preview`,
  interactive `push`, and `themes` commands.
- systemd timer installer and uninstaller with optional purge.
- Optional webhook notifications for Feishu, WeCom, DingTalk, and generic JSON
  endpoints.

[Unreleased]: https://github.com/RolinShmily/md2wechat/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/RolinShmily/md2wechat/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/RolinShmily/md2wechat/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/RolinShmily/md2wechat/releases/tag/v0.1.0
