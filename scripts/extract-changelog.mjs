import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Extract the CHANGELOG section for a release tag so the Release workflow can
// use it as the GitHub Release body. Fails loudly when the section is missing
// or empty, forcing the changelog to be updated before tagging.
const tag = process.argv[2] ?? '';
const version = tag.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`[extract-changelog] Expected a vX.Y.Z tag, got: ${tag || '(missing)'}`);
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const changelogPath = path.resolve(here, '..', 'CHANGELOG.md');
const lines = fs.readFileSync(changelogPath, 'utf8').split(/\r?\n/);

const heading = `## [${version}]`;
const start = lines.findIndex((line) => line === heading || line.startsWith(`${heading} `));

if (start === -1) {
  console.error(`[extract-changelog] No "${heading}" section found in ${changelogPath}`);
  process.exit(1);
}

let end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
if (end === -1) {
  end = lines.length;
}

const bodyLines = lines.slice(start + 1, end);

// Drop trailing blank lines and link-reference definitions such as
// "[0.1.0]: https://..." that belong to the changelog footer, not the release.
while (bodyLines.length > 0 && bodyLines.at(-1).trim() === '') bodyLines.pop();
while (bodyLines.length > 0 && /^\[[^\]]+\]:\s+\S+/.test(bodyLines.at(-1).trim())) {
  bodyLines.pop();
}
while (bodyLines.length > 0 && bodyLines.at(-1).trim() === '') bodyLines.pop();

const body = bodyLines.join('\n').trim();

if (!body) {
  console.error(`[extract-changelog] The "${heading}" section is empty`);
  process.exit(1);
}

process.stdout.write(`${body}\n`);
