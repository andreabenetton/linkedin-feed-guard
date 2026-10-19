<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0006: Scope — registered host-wide, acting only on the main feed

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

LinkedIn is a single-page application: navigating from a profile back to the feed does not load a page, so a content script registered only on `/feed` would miss it.

## Decision

Register the content script on `https://www.linkedin.com/*` but **do DOM and media work only when the route is exactly `/feed` or `/feed/`** on https `www.linkedin.com` (`inFeed()`). Route changes are followed through `popstate`, `hashchange`, `navigation.currententrychange` and, as a fallback, mutations while inactive. Frames and shadow-DOM feeds are not supported.

## Alternatives considered

- **Match only `/feed*`.** Rejected: misses in-app navigation.
- **Act on every page.** Rejected: profiles, messaging and jobs are not feeds.

## Consequences

- A MutationObserver runs on every LinkedIn page while the extension is enabled; its cost there must stay small.
- Individual post pages are excluded by design.

## Validation

- The browser fixtures cover entering and leaving the feed by `popstate`; pushState navigation is a manual check.
