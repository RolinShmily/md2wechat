# Third-Party Notices

`md2wechat` bundles and adapts the following third-party software. Their licenses
apply to the corresponding portions of the distributed package.

---

## md-wechat

The WeChat inline-style renderer and theme definitions in `src/renderer/vendor/`
are vendored from:

- **Repository**: [laogou717/md-wechat](https://github.com/laogou717/md-wechat)
- **Commit**: `8a21962efdc44b83d1673e557a52cf963c72b669`
- **Vendored files**: `renderer.js` (upstream `src/lib/renderer.js`),
  `themes.js` (upstream `src/lib/themes.js`), `LICENSE`
- **License**: MIT

```
MIT License

Copyright (c) 2026 字间排版

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Bundled dependencies

The published CLI bundles the following packages into `dist/index.js`. Their
license texts are available in each package's npm tarball and are reproduced
here by reference:

| Package | License |
|---|---|
| `highlight.js` | BSD-3-Clause |
| `markdown-it` | MIT |
| `markdown-it-mark` | MIT |
| `yaml` | ISC |

## Runtime dependency

The only runtime dependency installed alongside the CLI is `sharp`
(Apache-2.0), which is kept external because it ships platform-specific native
binaries. Its license text is distributed by npm with the package.
