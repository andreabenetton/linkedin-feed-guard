<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# CLAUDE.md

## Purpose

The default implementation context for this repository. Read the architecture from
the ADRs; do not restate it in prompts. Optimize for the user's privacy, for not
breaking the site the extension runs on, and for code a reviewer can read as it runs.

## Repo stance

- A **Manifest V3 browser extension** for Brave and Chromium, plain JavaScript, **no
  build step, no runtime dependencies** (ADR-0002). `extension/` is what the browser
  loads, byte for byte.
- **GPL-3.0-only**, REUSE 3.3 compliant: every file carries an SPDX header or is
  listed in `REUSE.toml` (ADR-0001).
- **Local only**: no network request of its own, no telemetry, `storage.local` only,
  diagnostics on request from a fixed schema (ADR-0003).
- **Not affiliated with LinkedIn.** No LinkedIn logo, colour or wording that suggests
  otherwise, in the icon or anywhere else.

## Source precedence

1. `docs/adr/NNNN-*.md`: decisions. Code that contradicts an ADR is wrong, or the ADR
   needs a superseding ADR.
2. `docs/ARCHITECTURE.md` and `docs/VALIDATION.md`: how it works and what was and was
   not validated.
3. The code.

## Non-negotiable rules

- **Permissions** stay `storage` and `declarativeNetRequestWithHostAccess` on
  `https://www.linkedin.com/*` (ADR-0004). Anything more needs an ADR first.
- **No network code** in `extension/`: no fetch, XHR, beacon, WebSocket or image
  pixel. CI greps for them (ADR-0003). The CSP's `connect-src 'none'` stays.
- **No page text, attribute values, IDs or URLs** are read into memory beyond what
  structural matching needs, and never into diagnostics (ADR-0003, ADR-0007).
  Text is set with `textContent`, never `innerHTML`.
- **Never remove or hide a post node**; deferral is `content-visibility` through
  namespaced `data-llg-v1-*` attributes that the master switch removes (ADR-0008).
- **Video: `pause()` only**, never resume, never touch media settings; PiP and
  fullscreen are left alone (ADR-0009).
- **Act only on `/feed` or `/feed/`**, top frame, isolated world (ADR-0006).
- **Fail open**: on an error, stop and clear annotations; never retry (ADR-0010).
- **Never reload on our own**: a long feed gets a notice; only the user's click reloads (ADR-0015).
- **The network rule** stays one static, opt-in ruleset that only the service worker
  toggles (ADR-0005).
- **Every string in English and Italian**, added to both in the same change (ADR-0012).

## Commands

```bash
node --test tests/*.test.cjs                 # unit tests (Node 20+)
python3 tools/package.py --check             # manifest version and version_name agree
python3 tools/package.py --out dist          # the Load-unpacked ZIP and its .sha256
reuse lint                                   # licence compliance
# browser fixtures: see README "Test and inspect"
```

## Releasing (ADR-0014)

1. Move `[Unreleased]` in `CHANGELOG.md` to `[X.Y.Z] - YYYY-MM-DD`; update the links.
2. Set X.Y.Z in `extension/manifest.json` (`version`, `version_name`), the only
   place it is written: the popup, help, help strings and `config.js` read it at run
   time; `python3 tools/package.py --check` passes.
3. Commit, tag `vX.Y.Z`, push the tag. `release.yml` checks the tag, runs the tests
   and publishes the ZIP and its checksum as a GitHub release.
