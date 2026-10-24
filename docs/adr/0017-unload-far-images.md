<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0017: Images — opt-in unloading of far images, attributes moved unread

- **Status:** Accepted (experimental, off by default)
- **Date:** 2026-10-24
- **Deciders:** project owner

## Context

The field test in ADR-0015 found that unloading the images and videos of far posts
freed about 20-25 % of the heap, while removing their DOM freed nothing more. Videos
are played by LinkedIn's own player (Media Source); taking their source breaks it.

## Decision

A seventh setting, **`unloadFarImages`, off by default**, labelled experimental.

- A third IntersectionObserver marks a card **far** beyond 3000 px. A far card that
  is already deferred (ADR-0008), not sensitive and not focused has the `srcset` and
  `src` of its `img` and `picture > source` elements removed **as Attr nodes**
  (`removeAttributeNode`). The nodes are kept in a map keyed by element and put back
  with `setAttributeNode`: **their values are never read**, so no URL becomes a
  string in the extension (the rule of ADR-0003/ADR-0007 still holds).
- They come back when the card is within 3000 px (about 1800 px before it can render
  at the 1200 px margin), whenever deferral is cleared (focus, hover, near, settings),
  when the option or the master switch is turned off, and on fail-open. A value the
  site set meanwhile wins. Elements the site removed are dropped from the map.
- **Videos are not touched** (ADR-0009 stands).

## Alternatives considered

- **Removing far posts' DOM.** Rejected: measured no gain, and fights LinkedIn's state.
- **Storing URLs as strings.** Rejected: Attr nodes give the same result unread.
- **On by default.** Rejected until it has been used on real sessions; a missing
  image is a visible failure.

## Consequences

- Scrolling back fast can show an image loading late (from the browser cache).
- Status and diagnostics report `unloadedImages`, a count.

## Validation

- Fixture: off by default; on, far deferred cards lose both attributes on `img` and
  `<source>` while near ones keep them, attribute values are never read (getters that
  throw), scrolling back restores them byte for byte and the image loads, turning it
  off or the master switch restores everything, and a value the site set wins.
- Live check on LinkedIn (injected build, built-in Chromium): at 104 posts, 302 images
  unloaded, no page errors; turning it off restored all 305 missing sources; heap
  settled at about 1,060 MB against 1,443 MB in the earlier run without the extension
  (different feed content: indicative only).
