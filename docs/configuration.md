# 配置参考（Configuration）

`md2wechat` 只读取一个 YAML 配置文件。命令行参数仅覆盖少量运行时选项（`--pull`、
`--repo`、`--posts`、`--branch`、`--sort` 等），不会写回文件。

## 1. 查找顺序

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | `-c, --config <path>` | 显式指定，文件必须存在 |
| 2 | `MD2WECHAT_CONFIG` | 环境变量指定，文件必须存在 |
| 3 | `./config.yaml` | 当前工作目录 |
| 4 | `~/.config/md2wechat/config.yaml` | 用户级 |
| 5 | `/etc/md2wechat/config.yaml` | 系统级（systemd 推荐） |

全部未命中时命令会直接失败，并打印初始化指引——不会悄悄使用空配置。

## 2. 路径解析规则

- 配置文件里的相对路径**相对 config.yaml 所在目录**解析，而不是调用者当前目录。
- `~` 会展开为运行用户的 home。
- `{postDir}` 与 `{repoRoot}` 是运行时占位符，分别代表当前文章目录和博客仓库根目录，
  只在 `assetRoots` / `sync.defaultCover` 等字段中使用。
- `source.repoRoot` 未配置且设置了 `source.repoUrl` 时，默认克隆到
  `<状态文件目录>/blog-repo`。这样 systemd（cwd 为 home）不会把仓库克隆到奇怪的位置。
- `source.postsRoot` 未配置时，默认 `repoRoot/postsPath`。

## 3. 字段说明

### 3.1 `source`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `repoUrl` | string | — | 远程 Git 仓库；留空则只读本地目录 |
| `gitRemote` | string | `origin` | 远端名 |
| `gitBranch` | string | `main` | 拉取分支 |
| `gitPull` | boolean | `true`（配置了 repoUrl 时） | 是否自动 `git pull` |
| `pullInterval` | string | `24h` | 自动拉取冷却期，支持 `ms/s/m/h/d/w` |
| `postsPath` | string | `content/posts` | 仓库内文章相对路径 |
| `repoRoot` | string | `<state dir>/blog-repo` | 本地仓库/克隆目录 |
| `postsRoot` | string | `repoRoot/postsPath` | 直接指定文章目录（优先于 repoUrl 克隆） |
| `layout` | `bundle` \| `flat` | `bundle` | `slug/index.md` 或 `slug.md` |
| `assetRoots` | string[] | `["{postDir}", "{repoRoot}/public"]` | 图片查找根目录，按顺序匹配 |
| `sortOrder` | `asc` \| `desc` | `asc` | 文章列表排序 |
| `fields` | object | 见下 | frontmatter 字段映射 |

`fields` 默认值：

```yaml
fields:
  title: "title"
  summary: "description"
  cover: "image"
  date: "published"
  updated: "updated"
  draft: "draft"
```

支持点号路径，例如 `cover: "cover.image"`。

### 3.2 `site`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `url` | `https://blog.example.com` | 博客基础 URL，用于补全相对链接与版权卡片 |
| `postPath` | `/posts/{slug}/` | 文章 URL 路由 |
| `author` | `Author` | 草稿作者（微信限制 16 字符） |
| `license` | `CC BY-NC-SA 4.0` | 版权卡片中的协议名 |

`site.url` 同时用于：
- 生成文章 canonical URL（写入草稿的“阅读原文”链接）；
- 决定哪些链接被视为站外链接并转成脚注。

请务必填写为真实博客域名。

### 3.3 `render`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `theme` | `tech-blue` | 主题 ID，`md2wechat themes` 查看全部 |
| `accent` | 主题默认 | 主色覆盖，如 `#0e88eb` |
| `fontSize` | `15` | 正文字号（px） |
| `fontFamily` | `theme` | `theme` / `sans` / `serif` / `rounded` |
| `macCode` | `true` | Mac 风格代码窗口 |
| `galleryMode` | `stack` | `stack` / `grid` / `collage` |
| `linksToFootnotes` | `true` | 站外链接转文末脚注 |
| `shiftBodyHeadings` | `true` | 正文章节标题降一级 |
| `imageCaptionMode` | `smart` | `smart` / `none` / `all` |
| `insertHeaderCover` | `false` | 正文顶部插入封面大图 |
| `appendCopyrightCard` | `true` | 文末追加原文/版权卡片 |

### 3.4 `sync`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `stateFile` | 见下 | 状态文件路径 |
| `maxPerRun` | `5` | 单次 `sync` 最多推送篇数 |
| `syncUpdated` | `false` | 定时同步是否包含已修改老文章 |
| `defaultCover` | — | frontmatter 无封面时的兜底图 |
| `downloadRemoteImages` | `true` | 下载外链图片并转传微信 |
| `openComment` | `0` | 草稿是否开启评论 |
| `onlyFansCanComment` | `0` | 是否仅粉丝可评论 |

状态文件默认值：

- root、systemd（存在 `INVOCATION_ID`）或已存在 `/etc/md2wechat`：
  `/var/lib/md2wechat/state.json`
- 普通用户：`~/.local/share/md2wechat/state.json`

状态文件包含每篇文章的内容哈希、草稿 `media_id`、图片与封面缓存。它是机器本地的，
不会写入 Git。`sync` 在状态文件为空且存在待推文章时会中止，除非传入 `--initial-push`。

### 3.5 `wechat`

| 字段 | 说明 |
|---|---|
| `appId` | 公众号 AppID，通常为 `wx` + 16 位 |
| `appSecret` | 公众号 AppSecret |

优先级：`config.yaml` > `WECHAT_APPID` / `WECHAT_SECRET` 环境变量。
配置文件中非空的值会覆盖环境变量；只有留空时才回退到环境变量。

### 3.6 `notify`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `webhookUrl` | — | 通知地址；留空时回退 `MD2WECHAT_WEBHOOK_URL` |
| `onSuccess` | `true` | 成功时发送 |
| `onFailure` | `true` | 失败时发送 |

支持飞书、企业微信、钉钉和通用 JSON 接收端。

## 4. 环境变量

| 变量 | 作用 |
|---|---|
| `MD2WECHAT_CONFIG` | 指定配置文件路径 |
| `WECHAT_APPID` | AppID 兜底（配置文件留空时） |
| `WECHAT_SECRET` | AppSecret 兜底（配置文件留空时） |
| `MD2WECHAT_WEBHOOK_URL` | 通知地址兜底 |

## 5. 最小可用示例

```yaml
source:
  repoUrl: "https://github.com/you/blog.git"
  postsPath: "content/posts"

site:
  url: "https://blog.example.com"
  author: "YourName"

sync:
  defaultCover: "{repoRoot}/public/og/og.png"

wechat:
  appId: "wx1234567890abcdef"
  appSecret: "replace-with-your-app-secret"
```

## 6. systemd 安装时的配置

`md2wechat systemd install` 固定使用 `/etc/md2wechat/config.yaml`（除非传入 `-c`）。
若该文件不存在，会从安装包内复制 `config.yaml.example` 生成模板并提示你编辑；
填好后再次执行安装命令即可。

安装后会以 `SUDO_USER` 身份运行服务，因此安装器会：

- 把配置文件权限设为 `600` 并交给该用户；
- 创建状态目录并 `chown` 给该用户。

不要把仅 root 可读的密钥文件路径放进用户级配置，否则服务会因权限不足失败。
