<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0015: Memory — advise a reload of a long feed; never reload on our own

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** project owner

## Context

"Aw, Snap!" on LinkedIn is, in practice, a renderer running out of memory. The home
feed only grows: every post scrolled past keeps its DOM, its images and LinkedIn's
application state. ADR-0008 deliberately keeps every node, and ADR-0009 only pauses
video, so neither can release that memory. The one action that does is a reload,
and only the user can judge when one is safe (an unsaved comment or draft).

## Decision

When the feed is heavy, **say so and offer a reload; never reload by ourselves.**

- **Signal.** Heavy means at least `ADVISORY.posts` (200) detected posts, or a
  JavaScript heap in use of at least `ADVISORY.heapMB` (1200 MB) or
  `ADVISORY.heapRatio` (50 %) of its limit, read from Chromium's non-standard
  `performance.memory`. It is sampled at most once per `ADVISORY.interval` (5 s),
  only when the content script already runs a flush: no timer of its own. The heap
  counts only from `ADVISORY.heapMinPosts` (30) posts: after a reload the previous
  page's heap stays reported until it is collected, about 40 s in the field test.
- **Notice.** One extension-owned element, `data-llg-v1-advisory`, appended to
  `body`, outside the feed root, with its UI in a shadow root and a constructed
  stylesheet (no inline `<style>` for the page's CSP to refuse). Text is set with
  `textContent`, in English and Italian, following the shared language preference.
  **Reload feed** calls `location.reload()` on that click only; **Later** snoozes it
  until 100 more posts or 25 % more heap.
- **Popup.** Shows the heap in use (10 MB steps) and, when heavy, the same warning and
  a **Reload feed** button (`chrome.tabs.reload` on the active tab, no permission).
- **Setting.** A sixth boolean, `memoryAdvisory`, default on, in the existing
  `feedGuardSettingsV1` key (normalisation fills it for 0.3.0 settings; ADR-0011).
- **Diagnostics.** Schema 2 adds `heapMB` (50 MB buckets, or null) and `pressure`.
- The master switch, the setting, leaving the feed, `pagehide`, an orphaned script
  and fail-open (ADR-0010) all remove the notice.

## Alternatives considered

- **Automatic reload or tab discard.** Rejected: loses drafts and scroll position, and
  surprises the user.
- **Removing or virtualising old posts.** Rejected for the reasons in ADR-0008.
- **Unloading off-screen video sources.** Rejected for the reasons in ADR-0009;
  Chromium already suspends idle paused players.
- **A periodic memory poll.** Rejected: work for its own sake; flushes already run
  while the feed grows, which is when the heap grows.
- **An action badge only.** Rejected as the only signal: easy to miss before a crash.

## Consequences

- `performance.memory` is coarse, delayed and Chromium-only, and measures the JS heap,
  not the whole tab (images, media, GPU). The post count is the backstop.
- The notice is the extension's first visible element on LinkedIn's page.
- The thresholds are constants in `config.js`, not user settings.

## Validation

- Fixtures: a 210-post feed shows the notice outside `main`, a click reloads (simulated
  `location`), Later snoozes past 50 more posts, and the setting, the master switch, an
  excluded route and an orphaned script all keep it away. Popup: heap, warning and
  button in both languages.
- Not validated: real heap growth and crash avoidance on an authenticated LinkedIn
  session.

## Field measurement (2026-10-24)

One authenticated LinkedIn session in the Claude desktop app's built-in Chromium
browser, narrow single-column layout, feed loaded with its own Load more button.
Figures are `performance.memory.usedJSHeapSize`, which includes garbage not yet
collected; the trend is the signal, not a single value.

| Posts | JS heap | DOM elements |
|---|---|---|
| 7 (fresh) | 456 MB | 2,463 |
| 50 | 602 MB | 12,524 |
| 75 | 978 MB | 20,231 |
| 104 (idle 35 s) | 1,443 MB | 29,115 |

About 10-15 MB of heap per post, rising with the feed; the heap limit reported was
4,184 MB. Experiments on the 84 oldest posts of that session, then:

- **Unloading their images and videos** (334 images, 16 videos): heap settled at
  about 1,110-1,140 MB, roughly 20-25 % less.
- **Then also removing their DOM** (29,115 to 6,899 elements; LinkedIn kept working
  and loaded more posts, with no page errors): heap settled at 1,240-1,370 MB, no
  further gain. LinkedIn's own state, not the DOM, holds most of the memory.
- **Reload:** the heap fell to 213 MB once the old page was collected (about 40 s).

This supports the decision: removing posts does not pay; a reload does. Unloading
far media may be worth a separate, opt-in decision.

