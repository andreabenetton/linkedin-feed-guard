<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# Architecture Decision Records

ADRs follow the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): one decision each, with its context, the decision, the alternatives considered and the consequences accepted.

Status values: **Proposed**, **Accepted**, **Superseded by NNNN**, **Deprecated**. A changed decision gets a new ADR that supersedes the old one; the old one's status is updated, its body is not rewritten.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-license-gpl-3-only.md) | License — GPL-3.0-only, REUSE-compliant | Accepted |
| [0002](0002-mv3-vanilla-js-no-build.md) | Platform — Manifest V3, vanilla JavaScript, no build step, no runtime dependencies | Accepted |
| [0003](0003-local-only-privacy.md) | Privacy — local only: no network, no telemetry, opt-in fixed-schema diagnostics | Accepted |
| [0004](0004-least-permission.md) | Permissions — storage and declarativeNetRequestWithHostAccess on one host | Accepted |
| [0005](0005-opt-in-dnr-tracking-rule.md) | Network rule — one packaged, opt-in DNR rule for /li/track, worker-controlled | Accepted |
| [0006](0006-feed-only-scope.md) | Scope — registered host-wide, acting only on the main feed | Accepted |
| [0007](0007-structural-detection.md) | Detection — structural, text-free selectors | Accepted |
| [0008](0008-content-visibility-deferral.md) | Rendering — content-visibility on distant cards; never remove nodes | Accepted |
| [0009](0009-video-pause-only.md) | Video — pause only, never resume, never touch media settings | Accepted |
| [0010](0010-fail-open.md) | Errors — fail open: stop optimizing, never break the page | Accepted |
| [0011](0011-settings-schema.md) | Settings — one versioned local key, validated and migrated | Accepted |
| [0012](0012-i18n-en-it.md) | Languages — English and Italian, packaged, with an in-app override | Accepted |
| [0013](0013-testing-strategy.md) | Testing — Node vm unit tests and Chromium fixtures; no live-site tests | Accepted |
| [0014](0014-versioning-semver.md) | Versioning — SemVer, Keep a Changelog, tagged releases | Accepted |
| [0015](0015-long-feed-memory-advisory.md) | Memory — advise a reload of a long feed; never reload on our own | Accepted |
| [0016](0016-toolbar-badge.md) | Toolbar — the browser's own badge shows the post count | Accepted |
| [0017](0017-unload-far-images.md) | Images — opt-in unloading of far images, attributes moved unread | Accepted (experimental) |
