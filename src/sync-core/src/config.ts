import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import YAML from 'yaml';
import type { FsSourceOptions } from '@md2wechat/sources';

export interface AppConfig {
  /** Absolute path of the config file that was actually used. */
  configPath: string;
  source: FsSourceOptions;
  site: {
    url: string;
    postPath: string;
    author: string;
    license: string;
  };
  render: {
    theme: string;
    accent?: string;
    fontSize: number;
    fontFamily: 'theme' | 'sans' | 'serif' | 'rounded';
    macCode: boolean;
    galleryMode: 'stack' | 'grid' | 'collage';
    linksToFootnotes: boolean;
    shiftBodyHeadings: boolean;
    imageCaptionMode: 'smart' | 'none' | 'all';
    insertHeaderCover: boolean;
    appendCopyrightCard: boolean;
  };
  sync: {
    stateFile: string;
    maxPerRun: number;
    syncUpdated: boolean;
    defaultCover?: string;
    downloadRemoteImages: boolean;
    openComment: 0 | 1;
    onlyFansCanComment: 0 | 1;
  };
  wechat: {
    appId: string;
    appSecret: string;
  };
  notify?: {
    webhookUrl?: string;
    onSuccess?: boolean;
    onFailure?: boolean;
  };
}

const CONFIG_SEARCH_HINT = [
  '未找到 md2wechat 配置文件。按以下优先级查找均未命中：',
  '  1) 命令行 -c / --config <path>',
  '  2) 环境变量 MD2WECHAT_CONFIG',
  '  3) 当前目录 ./config.yaml',
  '  4) 用户级 ~/.config/md2wechat/config.yaml',
  '  5) 系统级 /etc/md2wechat/config.yaml',
  '',
  '初始化方式：',
  '  sudo mkdir -p /etc/md2wechat',
  '  sudo curl -fsSL https://raw.githubusercontent.com/RolinShmily/md2wechat/main/config.yaml.example \\',
  '    -o /etc/md2wechat/config.yaml',
  '  或直接复制仓库内的 config.yaml.example 到上述任一位置。',
].join('\n');

/**
 * Resolves the config file path using the documented discovery order.
 * Explicit and environment paths must exist; an implicit search failing is fatal.
 */
export function resolveConfigPath(explicit?: string): string {
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!fs.existsSync(resolved)) {
      throw new Error(`配置文件不存在: ${resolved}`);
    }
    return resolved;
  }

  const envPath = (process.env.MD2WECHAT_CONFIG || '').trim();
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`环境变量 MD2WECHAT_CONFIG 指向的配置文件不存在: ${resolved}`);
    }
    return resolved;
  }

  const candidates = [
    path.resolve(process.cwd(), 'config.yaml'),
    path.join(os.homedir(), '.config', 'md2wechat', 'config.yaml'),
    '/etc/md2wechat/config.yaml',
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (found) return found;

  throw new Error(CONFIG_SEARCH_HINT);
}

function resolveConfigRelativePath(targetPath: string, baseDir: string): string {
  const trimmed = targetPath.trim();
  if (trimmed.startsWith('~/')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  // Tokens are expanded later, once the concrete post (and its Git repo root) is known.
  if (trimmed.includes('{postDir}') || trimmed.includes('{repoRoot}')) {
    return trimmed;
  }
  return path.isAbsolute(trimmed) ? trimmed : path.resolve(baseDir, trimmed);
}

/**
 * Default state location, decoupled from the install directory:
 * - root / systemd / an existing /etc/md2wechat -> /var/lib/md2wechat/state.json
 * - normal local user -> ~/.local/share/md2wechat/state.json
 */
function defaultStateFile(): string {
  const systemContext =
    process.getuid?.() === 0 ||
    Boolean(process.env.INVOCATION_ID) ||
    fs.existsSync('/etc/md2wechat');
  return systemContext
    ? '/var/lib/md2wechat/state.json'
    : path.join(os.homedir(), '.local', 'share', 'md2wechat', 'state.json');
}

function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // Ignore unreadable env files.
  }
}

export function loadConfig(configPath?: string): AppConfig {
  const resolvedPath = resolveConfigPath(configPath);
  const configDir = path.dirname(resolvedPath);

  // Optionally load a config-dir .env (never auto-created). config.yaml remains authoritative.
  loadEnvFile(path.join(configDir, '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  let parsed: any = {};
  try {
    const rawYaml = fs.readFileSync(resolvedPath, 'utf8');
    parsed = YAML.parse(rawYaml) || {};
  } catch (err: any) {
    throw new Error(`配置文件 ${resolvedPath} 解析失败 (YAML 语法/缩进错误): ${err.message}`);
  }

  // Credential resolution: config.yaml is authoritative; environment variables are only a
  // fallback for values left empty in the file. Explicit config beats ambient env.
  const configAppId = String(parsed.wechat?.appId || '').trim();
  const configAppSecret = String(parsed.wechat?.appSecret || '').trim();
  const envAppId = (process.env.WECHAT_APPID || '').trim();
  const envAppSecret = (process.env.WECHAT_SECRET || '').trim();

  const appId = configAppId || envAppId;
  const appSecret = configAppSecret || envAppSecret;

  if (envAppId && configAppId && envAppId !== configAppId) {
    console.warn(
      `[Config] 已忽略环境变量 WECHAT_APPID (${envAppId.slice(0, 6)}…)：config.yaml 中的 AppID 优先。` +
        '若想改用环境变量，请清空 config.yaml 的 wechat.appId。'
    );
  }
  if (envAppSecret && configAppSecret && envAppSecret !== configAppSecret) {
    console.warn(
      '[Config] 已忽略环境变量 WECHAT_SECRET：config.yaml 中的 AppSecret 优先。' +
        '若想改用环境变量，请清空 config.yaml 的 wechat.appSecret。'
    );
  }
  if (!configAppId && envAppId) {
    console.log('[Config] wechat.appId 未在 config.yaml 中配置，回退使用环境变量 WECHAT_APPID。');
  }

  const rawRepoUrl = parsed.source?.repoUrl ? String(parsed.source.repoUrl).trim() : undefined;
  const rawGitRemote = parsed.source?.gitRemote || parsed.source?.remote || 'origin';
  const rawGitBranch = parsed.source?.gitBranch || parsed.source?.branch || 'main';
  const rawPostsPath = String(parsed.source?.postsPath || 'content/posts')
    .trim()
    .replace(/^[/\\]+|[/\\]+$/g, '');
  const rawGitPull = Boolean(parsed.source?.gitPull ?? rawRepoUrl);
  const rawPostsRoot = parsed.source?.postsRoot || parsed.source?.root;
  const rawRepoRoot = parsed.source?.repoRoot;
  const rawStateFile = parsed.sync?.stateFile;
  const rawDefaultCover = parsed.sync?.defaultCover;
  const rawAssetRoots: string[] = Array.isArray(parsed.source?.assetRoots)
    ? parsed.source.assetRoots
    : ['{postDir}', '{repoRoot}/public'];

  const siteUrl = String(parsed.site?.url || 'https://blog.example.com').replace(/\/+$/, '');

  const stateFile = rawStateFile
    ? resolveConfigRelativePath(String(rawStateFile), configDir)
    : defaultStateFile();

  // Keep a remote blog clone next to the state file, not next to the caller's cwd:
  // systemd starts with cwd=/ and the install directory may be read-only.
  const repoRoot = rawRepoRoot
    ? resolveConfigRelativePath(String(rawRepoRoot), configDir)
    : rawRepoUrl
    ? path.join(path.dirname(stateFile), 'blog-repo')
    : undefined;

  const postsRoot = rawPostsRoot
    ? resolveConfigRelativePath(String(rawPostsRoot), configDir)
    : repoRoot
    ? path.join(repoRoot, rawPostsPath)
    : undefined;

  return {
    configPath: resolvedPath,
    source: {
      postsRoot,
      postsPath: rawPostsPath,
      repoRoot,
      repoUrl: rawRepoUrl,
      gitRemote: String(rawGitRemote).trim(),
      gitBranch: String(rawGitBranch).trim(),
      layout: parsed.source?.layout || 'bundle',
      assetRoots: rawAssetRoots.map((root) => resolveConfigRelativePath(String(root), configDir)),
      gitPull: rawGitPull,
      pullInterval: parsed.source?.pullInterval || '24h',
      sortOrder: (parsed.source?.sortOrder as 'asc' | 'desc') || 'asc',
      siteUrl,
      postPathPattern: parsed.site?.postPath || '/posts/{slug}/',
      fieldMapping: parsed.fields || {},
    },
    site: {
      url: siteUrl,
      postPath: parsed.site?.postPath || '/posts/{slug}/',
      author: parsed.site?.author || 'Author',
      license: parsed.site?.license || 'CC BY-NC-SA 4.0',
    },
    render: {
      theme: parsed.render?.theme || 'tech-blue',
      accent: parsed.render?.accent || undefined,
      fontSize: parsed.render?.fontSize || 15,
      fontFamily: parsed.render?.fontFamily || 'theme',
      macCode: parsed.render?.macCode !== false,
      galleryMode: parsed.render?.galleryMode || 'stack',
      linksToFootnotes: parsed.render?.linksToFootnotes !== false,
      shiftBodyHeadings: parsed.render?.shiftBodyHeadings !== false,
      imageCaptionMode: parsed.render?.imageCaptionMode || 'smart',
      insertHeaderCover: Boolean(parsed.render?.insertHeaderCover),
      appendCopyrightCard: parsed.render?.appendCopyrightCard !== false,
    },
    sync: {
      stateFile,
      maxPerRun: parsed.sync?.maxPerRun || 5,
      syncUpdated: Boolean(parsed.sync?.syncUpdated),
      defaultCover: rawDefaultCover
        ? resolveConfigRelativePath(String(rawDefaultCover), configDir)
        : undefined,
      downloadRemoteImages: parsed.sync?.downloadRemoteImages !== false,
      openComment: parsed.sync?.openComment === 1 ? 1 : 0,
      onlyFansCanComment: parsed.sync?.onlyFansCanComment === 1 ? 1 : 0,
    },
    wechat: {
      appId,
      appSecret,
    },
    notify: {
      webhookUrl:
        (parsed.notify?.webhookUrl && String(parsed.notify.webhookUrl).trim()) ||
        process.env.MD2WECHAT_WEBHOOK_URL ||
        undefined,
      onSuccess: parsed.notify?.onSuccess !== false,
      onFailure: parsed.notify?.onFailure !== false,
    },
  };
}
