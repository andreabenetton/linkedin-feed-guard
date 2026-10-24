<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0008: Rendering — content-visibility on distant cards; never remove nodes

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

Long feeds keep many rendered cards. Removing or virtualizing them would fight LinkedIn's own application state.

## Decision

Defer rendering of **eligible distant cards** (outside a 1200 px IntersectionObserver margin) by setting `data-llg-v1-defer` and `--llg-v1-block-size` (the measured height), so `content.css` applies `content-visibility: auto` with `contain-intrinsic-block-size`. **No post node is ever removed or hidden.** Cards near the viewport, focused, hovered, containing an editor, an input other than a hidden one, an open menu or dialog, or playing media, are excluded. All annotations are namespaced (`llg-v1`) and removed by the master switch, restoring any page-owned value.

## Alternatives considered

- **Removing or detaching cards.** Rejected: breaks LinkedIn's state and scroll position.
- **`display: none`.** Rejected: changes layout and loses scroll anchoring.

## Consequences

- The browser may still keep cards in memory; no RAM limit is promised.
- The exclusion test is broad (any `input` in a card that is not `type="hidden"`); see the open issues for tuning.

## Validation

- Fixtures assert no node removal and full cleanup on disable.

## Amendments

- 2026-10-19 (0.3.0): a hidden input no longer excludes a card; it holds no user input.
- 2026-10-24 (0.4.0): the memory this decision cannot release is addressed by advising a user-initiated reload (ADR-0015), not by removing nodes.
- 2026-10-24 (0.4.0): the 1200 px margin is given as IntersectionObserver `scrollMargin` where supported. LinkedIn scrolls the feed inside `main#workspace`; `rootMargin` only widens the viewport, so inside that container the margin was effectively zero. `scrollMargin` also widens the viewport's own scroller, so it replaces `rootMargin` rather than adding to it.
