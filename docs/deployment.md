# 部署指南（Deployment）

本文覆盖无头 Linux VPS 上的定时运行方式。配置字段见
[`configuration.md`](configuration.md)，接口权限与错误码见
[`wechat-permissions.md`](wechat-permissions.md)。

## 1. systemd 定时同步

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
安装时固定使用 `/etc/md2wechat/config.yaml`（除非传入 `-c`），配置文件权限会被设为
`600`。

## 2. 无桌面 VPS 检查清单

1. **微信 IP 白名单**：公众号后台「设置与开发 → 基本配置 → IP 白名单」必须加入
   VPS 的**出口 IP**。运行 `md2wechat diagnose` 可直接看到当前出口 IP 与 `40164`
   错误提示。家用宽带、弹性 IP、NAT 网关的出口 IP 可能变化，长期部署建议使用固定 IP。
2. **个人订阅号限制**：部分个人号没有草稿箱接口权限（`48001`）。此时 `diagnose`
   会明确提示，请改用 `md2wechat preview` 生成 HTML 后手动粘贴到公众号后台。
3. **时区**：systemd 定时器按系统时区运行；如需固定时区，可在 unit 中设置
   `Environment="TZ=Asia/Shanghai"`（安装后可手动编辑 service）。
4. **凭据权限**：`/etc/md2wechat/config.yaml` 建议 `600`，安装器会自动设置。
5. **状态文件**：默认位于 `/var/lib/md2wechat/state.json`，是机器本地事实来源。
   迁移机器时复制该文件，或使用 `md2wechat baseline --import`；不要删除它，
   否则可能触发空基线保护。
6. **磁盘空间**：首次运行会克隆博客仓库，后续 `git pull` 也需要可用空间与网络。

## 3. 通知（可选）

配置 `notify.webhookUrl` 或环境变量 `MD2WECHAT_WEBHOOK_URL` 后，同步成功/失败会发送
文本通知，支持飞书、企业微信、钉钉和通用 JSON 接收端。

```bash
export MD2WECHAT_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/..."
```

systemd 安装器不会主动写入该环境变量；需要时请编辑 service 文件或通过配置文件的
`notify.webhookUrl` 设置。字段说明见
[`configuration.md`](configuration.md#36-notify)。

## 4. 维护建议

- 用 `md2wechat diagnose` 作为部署后的第一道检查；它只读，不写草稿。
- 上线前先 `md2wechat sync --dry-run` 观察将推送的篇目。
- 定时任务与手动 `push` 共用 `flock`，但仍建议避免在 timer 运行时手动同步。
- 升级 CLI 后运行一次 `md2wechat check`，确认配置与状态文件仍兼容。
