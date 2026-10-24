<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0016: Toolbar — the browser's own badge shows the post count

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** project owner

## Context

The icon had a pause badge drawn into it, which read as a counter but carried no
information. The owner asked for a counter that looks like other extensions' badges
(for example Browserpass: white text on `#666`).

## Decision

- The icons no longer draw a badge; the 16/32 px drawing centres the shield.
- The content script sends `{channel: 'feed-guard-badge', posts, pressure}` to the
  service worker **only when either value changes**: the number of detected posts
  and whether the long-feed threshold (ADR-0015) is met. Off the feed, disabled,
  stopped or orphaned, it sends 0.
- The worker accepts it only from this extension's content script in a tab's top
  frame, and sets that tab's badge: background `#666666`, text `#ffffff`, the count
  (`999+` above 999), `!` when heavy, nothing for 0. `chrome.action` needs no
  permission; the browser clears a tab's badge when the tab navigates.

## Alternatives considered

- **Keep the drawn badge.** Rejected: looks like a count, is not one.
- **Show heap MB.** Rejected by the owner: the post count is what a user can act on.
- **A periodic update.** Rejected: one message per change is enough.

## Consequences

- A second message channel into the worker. It carries two typed values, never page
  content, and changes nothing but the badge.

## Validation

- Worker unit test: colours, text, `999+`, `!`, and rejection of other senders and
  frames. Fixture: sent on change only, 0 off the feed and when disabled, no content.
