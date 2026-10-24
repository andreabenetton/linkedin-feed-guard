<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0010: Errors — fail open: stop optimizing, never break the page

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

An exception inside a content script running on someone else's site must not damage that site.

## Decision

On any unexpected error the content script **stops all optimizations until the page is reloaded**, clears its annotations, and reports `errorCode: local-optimization-stopped` in status and diagnostics.

## Alternatives considered

- **Retry loops.** Rejected: can amplify a fault.

## Consequences

- A bug degrades to "no effect", visible in the popup.

## Validation

- Fixtures cover the stop path.

## Amendments

- 2026-10-24 (0.4.0): stopping also removes the long-feed notice (ADR-0015).
