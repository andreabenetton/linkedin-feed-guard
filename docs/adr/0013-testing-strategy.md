<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0013: Testing — Node vm unit tests and Chromium fixtures; no live-site tests

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

Automated tests must not log in to LinkedIn or touch a real account, and the test environment's browser policy prevented loading an unpacked extension.

## Decision

Test with **Node's built-in `node:test`** (worker and UI logic in `vm` sandboxes with mocked extension APIs) and with **Playwright driving Chromium** on synthetic `about:blank` fixtures, injecting the content scripts into a CDP isolated world. No external navigation, no login.

## Alternatives considered

- **Tests against linkedin.com.** Rejected: needs an account, is not reproducible, and touches personal data.

## Consequences

- Installed-extension behaviour, the real DNR engine, pushState navigation and real-feed effect are manual checks, listed in `docs/VALIDATION.md`.
- `test-results/` is evidence recorded at a release; running the browser tests rewrites it.

## Validation

- CI runs the Node tests on every push.
