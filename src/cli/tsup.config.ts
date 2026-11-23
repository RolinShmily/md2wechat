import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  dts: true,
  // sharp ships platform-specific native binaries; bundling it would break installs.
  external: ['sharp'],
  // Several dependencies (notably yaml) still ship CommonJS builds that call
  // require("process"). ESM has no require, so provide one before the bundle runs.
  banner: {
    js: [
      "import { createRequire as __md2wechatCreateRequire } from 'node:module';",
      'const require = __md2wechatCreateRequire(import.meta.url);',
    ].join('\n'),
  },
});
