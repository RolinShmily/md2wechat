/**
 * Preflight credential checks.
 *
 * Purpose: a headless/systemd run must fail fast and loudly when WeChat has no usable
 * credentials. Without this, every post fails with the same opaque API error
 * (e.g. WeChat `40013 invalid appid`), the run still exits 0, and systemd reports
 * "Finished" — so nobody notices the whole sync was a no-op.
 */

export interface CredentialStatus {
  ready: boolean;
  /** Blocking problems: the target cannot work until these are fixed. */
  errors: string[];
  /** Suspicious but non-blocking (e.g. malformed AppID); API will confirm. */
  warnings: string[];
}

const PLACEHOLDER_PATTERNS = [
  /^your[-_]?/i,
  /^<.*>$/,
  /^(changeme|change-me|placeholder|example|dummy|test|todo|xxx+)$/i,
  /^wx?x+$/i,
];

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

const ENV_HINT =
  '请在 config.yaml 的 wechat.appId / wechat.appSecret 填写后运行' +
  ' `sudo systemctl start md2wechat-sync.service` 重试。也可用环境变量 WECHAT_APPID / WECHAT_SECRET ' +
  '作为兜底，但 config.yaml 优先级更高。';

/**
 * Validates WeChat Official Account credentials before any network call.
 *
 * Only presence is checked for the secret: callers may hold a client whose secret is
 * private, and echoing secret material into logs must be avoided.
 */
export function checkWeChatCredentials(appId?: string, hasAppSecret = false): CredentialStatus {
  const errors: string[] = [];
  const warnings: string[] = [];
  const id = (appId || '').trim();

  if (!id) {
    errors.push(`微信 AppID 为空。${ENV_HINT}`);
  } else if (isPlaceholder(id)) {
    errors.push(`微信 AppID 仍是占位值 "${id}"。${ENV_HINT}`);
  } else if (!/^wx[0-9a-zA-Z]{16}$/.test(id)) {
    // Real AppIDs look like `wx` + 16 chars; a mismatch usually means a copy/paste slip
    // and the API answers 40013. Warn instead of blocking, to stay permissive.
    warnings.push(`微信 AppID "${id}" 格式不像官方 AppID（通常为 wx + 16 位字符），接口可能返回 40013`);
  }

  if (!hasAppSecret) {
    errors.push(`微信 AppSecret 为空或仍是占位值。${ENV_HINT}`);
  }

  return { ready: errors.length === 0, errors, warnings };
}

/**
 * Formats a credential failure into one actionable multi-line message.
 */
export function formatCredentialFailure(target: string, status: CredentialStatus): string {
  return [
    `[Preflight] 目标平台「${target}」凭据未就绪，已中止本次运行（未推送任何文章）：`,
    ...status.errors.map((e) => `  - ${e}`),
  ].join('\n');
}
