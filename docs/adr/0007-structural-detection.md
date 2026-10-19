<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0007: Detection — structural, text-free selectors

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

The extension must find feed posts without reading what they say. LinkedIn changes its markup often.

## Decision

Detect posts **only by structure**: `data-testid="mainFeed"` containers, component-key list items with the `FeedType_MAIN_FEED` marker (matched by selector, value never read), `.occludable-update`, `.feed-shared-update-v2` and `data-view-name="feed-full-update"`, plus a list-item fallback that requires a `mainFeed` ancestor and an `expandable-text-box` marker. Nested markers are deduplicated (outermost card wins); the feed root is chosen among visible candidates by score. Finding a container is never reported as finding posts.

## Alternatives considered

- **Text heuristics (e.g. "Promoted").** Rejected: reads personal content and breaks across languages.
- **Every `article` or list item.** Rejected: matches non-posts.

## Consequences

- A LinkedIn markup change can drop the count to zero; the popup says so, and diagnostics report per-selector counts so a fix can be found without page content.

## Validation

- The browser fixtures cover each marker family, hydration and late roots.
