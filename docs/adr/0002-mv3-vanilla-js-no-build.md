<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0002: Platform — Manifest V3, vanilla JavaScript, no build step, no runtime dependencies

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

The extension targets Brave and other Chromium browsers (`minimum_chrome_version` 120). Users load it unpacked, so what is reviewed must be exactly what runs. A bundler or transpiler would put generated code between the source and the browser, and every runtime dependency is code with network-facing history to audit.

## Decision

Ship a **Manifest V3** extension written in plain JavaScript, CSS and HTML, loaded directly from `extension/` with **no build step and no runtime dependencies**. The service worker (`background.js`) imports `config.js` with `importScripts`; the content script is `config.js`, `selectors.js`, `content.js` and `content.css`; UI pages load their scripts with `<script src>`.

## Alternatives considered

- **TypeScript or a bundler.** Rejected: the shipped files would no longer be the reviewed files; adds a toolchain a user cannot verify.
- **Manifest V2.** Rejected: deprecated in Chromium.
- **A UI framework.** Rejected: two small pages do not need one, and it would loosen the CSP of ADR-0003.

## Consequences

- Reviewing the source is reviewing what runs; `node --check` is the only syntax gate.
- Shared code between worker, content script and pages goes through small global modules (`self.FeedGuardConfig`, etc.), not imports.
- No dependency updates to track at runtime; test tooling (Playwright) is development-only (ADR-0013).

## Validation

- `extension/` contains only first-party files (`git ls-files extension`).
- `node --check` passes on every JS file in CI.
