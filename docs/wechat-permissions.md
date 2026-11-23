# 微信公众号权限与排障（WeChat Permissions）

`md2wechat` 只调用公众号官方接口，并且只写入**草稿箱**，不会调用群发/发布接口。
但草稿箱接口仍受账号类型、IP 白名单和凭据配置限制。本文说明常见错误的成因与处理。

## 1. 需要哪些权限

| 能力 | 接口 | 用途 |
|---|---|---|
| 获取 access_token | `/cgi-bin/token` | 所有 API 的入口 |
| 上传正文图片 | `/cgi-bin/media/uploadimg` | 正文图片转微信图床 |
| 上传永久素材 | `/cgi-bin/material/add_material` | 封面上传，得到 `thumb_media_id` |
| 新建草稿 | `/cgi-bin/draft/add` | 写入草稿箱 |
| 更新草稿 | `/cgi-bin/draft/update` | 重复推送时更新原草稿 |
| 查询草稿 | `/cgi-bin/draft/batchget` | `baseline --remote` 匹配已有草稿 |
| 查询已发表 | `/cgi-bin/freepublish/batchget` | `baseline --remote` 匹配已发表文章（可选） |

`md2wechat diagnose` 会依次检查 token、图片上传、素材上传和草稿接口，并给出结论。

## 2. `40164 invalid ip`

**含义**：调用方出口 IP 不在公众号后台的 IP 白名单中。

**处理**：

1. 运行 `md2wechat diagnose`，在输出中找到当前出口 IP（或微信返回的 IP）。
2. 登录公众号后台 → 设置与开发 → 基本配置 → IP 白名单。
3. 添加该 IP（VPS 请填**出口 IP**，不是内网 IP）。
4. 等待生效后重新运行 `diagnose`。

注意：

- 家用宽带、云主机弹性 IP、NAT 网关的出口 IP 可能变化；长期部署建议使用固定 IP。
- 若通过代理访问微信 API，白名单需要填代理的出口 IP。
- 动态 IP 场景没有“关闭白名单”的选项；只能更新白名单或使用固定出口。

## 3. `48001 api unauthorized`

**含义**：当前账号没有该接口权限。

常见情况：

- **个人订阅号**通常没有草稿箱/发布接口权限。`diagnose` 会在草稿接口步骤返回
  `48001`，并提示只能本地预览后手动粘贴。
- 未认证的服务号也可能受限。
- 接口权限与账号类型、认证状态有关，无法通过代码绕过。

**处理**：

- 使用 `md2wechat preview <slug>` 生成排版 HTML，在浏览器中点击“一键复制富文本”，
  粘贴到公众号后台编辑器。
- 或改用具备草稿接口权限的账号。

`baseline --remote` 在查询已发表列表遇到 `48001` 时会自动跳过该步骤，不影响草稿箱匹配。

## 4. `40013 invalid appid`

**含义**：AppID 不正确，或 AppID/AppSecret 不匹配。

**处理**：

- 确认 `wechat.appId` 是公众号后台的 AppID（通常 `wx` 开头 + 16 位）。
- 确认 `wechat.appSecret` 与 AppID 属于同一账号，且未在后台重置。
- 检查是否被环境变量覆盖：配置文件非空时优先于 `WECHAT_APPID`。
- 不要包含多余空格或引号。

## 5. `40001 invalid credential` / token 失效

**含义**：access_token 无效或已过期。

**处理**：

- `md2wechat diagnose` 会强制刷新 token。
- token 缓存默认位于 `~/.cache/md2wechat/wechat-token.json`；删除后可重新获取。
- 多个进程同时刷新 token 可能互相失效；systemd 使用 `flock` 避免并发运行。

## 6. `45009 api freq out of limit`

**含义**：接口调用频率超限。

**处理**：

- 降低 `sync.maxPerRun`。
- 避免频繁手动 `push` 同一批文章。
- 等待配额重置后重试；必要时在公众号后台查看接口调用量。

## 7. 草稿箱与群发的区别

- `draft/add` 只写入草稿箱，**不会发布**，不会推送给粉丝。
- 发布/群发需要在公众号后台手动操作，或调用 `freepublish/submit`（本工具不调用）。
- 因此 `md2wechat` 的自动同步不会造成“误发文章”，但仍会占用草稿箱空间。

## 8. 安全建议

- AppSecret 仅保存在 `config.yaml` 或环境变量中；不要提交到 Git。
- `/etc/md2wechat/config.yaml` 使用 `600` 权限，属主为运行服务的用户。
- 不要把 AppSecret 作为命令行参数传入（会出现在 shell history / 进程列表）。
- 定期在公众号后台重置 AppSecret；重置后同步更新配置并重启定时器。
- systemd 服务以普通用户运行，使用 `NoNewPrivileges` 等加固可按需补充。
