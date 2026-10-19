<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0005: Network rule — one packaged, opt-in DNR rule for /li/track, worker-controlled

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

LinkedIn's `/li/track` endpoint receives frequent beacon and XHR traffic. Blocking it may save work but can also cause retries or break site behaviour, and the extension is not a tracker blocker (Brave Shields is).

## Decision

Ship **one static declarativeNetRequest ruleset** (`rules/tracking.json`, id `optional_tracking`), **disabled by default**, blocking `xmlhttprequest`, `ping` and `image` requests matching `^https://www\.linkedin\.com/li/track([/?]|$)` and initiated by `www.linkedin.com`. Only the service worker enables it, when `enabled && blockTracking`; it applies the rule before saving the setting and rolls the rule back if saving fails, and reconciles on install, startup and storage change.

## Alternatives considered

- **Dynamic rules.** Rejected: a static ruleset is reviewable and cannot be widened at runtime.
- **A broader blocklist.** Rejected: out of scope; Brave Shields does it better.
- **On by default.** Rejected: blocking can break the site; users opt in knowingly.

## Consequences

- The rule applies on all of www.linkedin.com, not only the feed; this is documented.
- Chromium's real DNR engine is not exercised by the automated tests (ADR-0013); it is a manual check.

## Validation

- `tests/worker.test.cjs` checks the regex's boundaries and the rollback.
