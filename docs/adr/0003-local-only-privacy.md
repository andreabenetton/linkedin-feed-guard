<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0003: Privacy — local only: no network, no telemetry, opt-in fixed-schema diagnostics

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

A content script running on LinkedIn has technical access to the page's DOM, so privacy depends on what the code does, not only on permission names. Users report problems; a report must help without exposing anything about them.

## Decision

The extension **makes no network request of its own** and has **no telemetry**. Extension pages run under `script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' data:; style-src 'self'; base-uri 'none'; frame-src 'none'; form-action 'none'`. Settings live in `chrome.storage.local` only (`feedGuardSettingsV1`, five booleans; `feedGuardLanguageV1`), never Sync. Per-tab counters live in memory. Diagnostics are built **only on request**, from a fixed schema (version, fixed status codes, two booleans, aggregate selector counts capped at 10000), re-sanitized in the popup by `diagnostics.js`, and copied to the clipboard only on a second click, without a clipboard permission. No text, HTML, attribute value, ID, URL, title or cookie is read into a report.

## Alternatives considered

- **Error reporting to a server.** Rejected: any endpoint is telemetry.
- **Free-form debug dumps (page HTML).** Rejected: would carry personal data.
- **storage.sync.** Rejected: it leaves the device.

## Consequences

- A diagnostics field is added by changing the schema in both `content.js` and `diagnostics.js`; an unknown field is stripped.
- Bugs that need more than counts can only be investigated with the user's own fixture.
- No `innerHTML` with page data; all text is set with `textContent`.

## Validation

- A grep in CI for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and `new Image` in `extension/` finds nothing.
- `tests/ui.test.cjs` covers the sanitizer.

## Amendments

- 2026-10-24 (0.4.0): diagnostics schema 2 adds the JavaScript heap in use in 50 MB buckets (`heapMB`, or null) and a `pressure` boolean (ADR-0015). Settings are six booleans.
- 2026-10-24 (0.4.0): diagnostics schema 2 also carries `unloadedImages`, a count. The content script sends the worker two counts for the toolbar badge (ADR-0016). Settings are seven booleans.
