# Checks registry — thecurltapes-site

A check gates a launch only if it is listed here (Checker bylaws, Blake via MANAGER, Nov 25 2026).
Every check exits nonzero on fail (1 = FAIL, 2 = ENV). A timeout or crash is ENV, not FAIL: rerun alone once, then report ENV.

| id | Blake ask | what it protects | runner | runtime | command |
|---|---|---|---|---|---|
| t490u-ct-bz-seo | t490u | Under-the-hood SEO signals pointing to blakezuniga.com with zero visible / load-time change vs base 7876dab. A: shared JSON-LD graph (Person `https://blakezuniga.com/#blake`, MusicGroup `https://thecurltapes.com/#band`, Coleman as second member, all six target phrases) on all 26 pages. B: ProfilePage on /aboutpage/blakezuniga/. C: static, followable Blake corner link titled "Blake Zuniga's website"; JS fallback sets the same title and stays idempotent; no hidden/nofollow/noscript/cloaked Zuniga links or text; no Blake keywords in Coleman pages' meta. D: ct-member-links.css and all CSS byte-identical to base; each page's `<body>` byte-identical to base apart from the static nav; `<head>` identical apart from the new JSON-LD, www→apex URL meta, and (Blake's about page only) description/og:description. E: per-page gzip delta < 1024 bytes, no new request-causing src/href, no new/changed JS except ct-member-links.js. F: sitemap.xml (apex, homepage + Blake's about page, no 404/noindex/non-canonical URLs, every indexable self-canonical page listed) and robots.txt (Sitemap line, no Disallow-all). | Node (no browser, no deps; needs git with base commit) | ~0.5 s | `node checks/t490u-ct-bz-seo.mjs [--log path.log]` |

## Evidence (t490u)
- Fail-before on unchanged 7876dab tree: `/workspace/website/curltapes-bz-seo-notes/logs/t490u-before.log`, exit 1 (179 failures across A–F).
- Pass-after: `/workspace/website/curltapes-bz-seo-notes/logs/t490u-after.log`, exit 0.
- Reruns: `/workspace/website/curltapes-bz-seo-notes/logs/t490u-rerun1.log` (pre-commit) and `t490u-rerun2.log` (post-commit), exit 0.

## Notes
- The base commit is pinned in the check (`7876dab059773c0a18ad2deae7f5371d7b30443e`). If a later, Blake-approved change legitimately edits page bodies, CSS or the member-links module, this check must be updated in the same commit as a MEASUREMENT CHANGE citing the ask (never loosened), or retired with its file kept.
- gzip sizes use Node zlib level 9; raw sizes are bytes.
