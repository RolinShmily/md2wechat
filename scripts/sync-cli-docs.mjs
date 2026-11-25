import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The published CLI package lives in src/cli, while the canonical docs and config
// template live at the repository root. Copy them in before `npm pack` / `npm publish`
// so the tarball is self-contained.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cliDir = path.join(root, 'src', 'cli');

const files = [
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES',
  'config.yaml.example',
];

for (const name of files) {
  const source = path.join(root, name);
  const target = path.join(cliDir, name);
  if (!fs.existsSync(source)) {
    throw new Error(`[sync-cli-docs] Missing required file: ${source}`);
  }
  fs.copyFileSync(source, target);
  console.log(`[sync-cli-docs] ${name} -> src/cli/${name}`);
}
