<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->
# Architecture

Manifest V3, packaged vanilla JavaScript/CSS/HTML, no build step and no runtime
dependencies. The runtime directory is `extension/`.

## Components

`config.js` validates the five boolean preferences and reads the release version
from the manifest, its only source. `background.js` serializes settings changes, reconciles the packaged DNR
ruleset, and rolls back rules if a storage write fails. Only extension UI senders
can use its settings-write message channel. Errors returned to the UI are fixed
codes rather than arbitrary exception text.

`selectors.js` keeps structural detection separate from rendering. Root selection
prefers a populated explicit mainFeed over a page-wide main, a populated main over
an empty feed placeholder, and excludes hidden roots. Supported candidate wrappers
are deduplicated by outermost qualifying card. The generic list-item fallback is
restricted to mainFeed and requires a post-body marker. Component-key values are
matched by CSS, not read into strings or retained.

`content.js` owns per-page maps of cards and video elements. On the feed,
MutationObserver batches insertions, removals and selected identity/interaction
attribute changes; elsewhere it watches child lists only, to notice an in-page
return to the feed. A change inside the feed root is handled around its target; a
change that can affect root selection asks for a full root rescan, which runs at
most once a second with a trailing run, so the last change is never lost.
IntersectionObserver drives rendering and video behavior. There is no periodic
polling loop or infinite-scroll truncation. Selector rescans are coalesced and can
also be explicitly requested from the popup. Detached nodes are unobserved and
removed from maps. Background tabs do not perform new-card scans.

`i18n.js` contains complete English and Italian dictionaries and the local
`feedGuardLanguageV1` preference (`auto`, `en`, or `it`). It is loaded only in
extension UI pages, not in the LinkedIn content script or service worker. The
manifest uses `_locales/en` and `_locales/it` with English fallback. Translation
files are not fetched; the catalogs are packaged JavaScript. All translated HTML
text is assigned as text, not parsed as markup.

`popup.js` shows settings, status, language controls and diagnostics. Only the top
frame of the active tab is messaged. `diagnostics.js` strips unrecognized report
fields and enforces a fixed schema before displaying a report. The copy button
uses clipboard access only on a user click, with manual selection as fallback.
`help.html`/`help.js` provide fully translated, offline help.

## Storage

`feedGuardSettingsV1`: five booleans (`enabled`, `renderOffscreen`,
`pauseOffscreenVideos`, `pauseHiddenVideos`, `blockTracking`).

`feedGuardLanguageV1`: one enum, `auto`, `en`, or `it`.

Counts and generated reports are not persisted. No Sync storage is used. Changing
the language does not rewrite the five optimization preferences.

## Diagnostics, schema 1

The report contains only these fields:

- `schema`, `version`: the fixed schema and packaged release version.
- `pageCategory`: `main-feed` or `other`; not the page URL.
- `scope`: `feed`, `unrecognized`, `waiting`, `outside-feed`, `disabled`, `error`.
- `visibility`, `enabled`, `renderSupported`: fixed enums/booleans.
- `root`: `none`, `mainFeed`, `main`, or `role-main`.
- `posts`, `deferred`, `videos`, `paused`: nonnegative aggregate counters.
- `variants`: counts for `legacy`, `component-key`, and `list-item` wrappers.
- `selectors`: counts for twelve fixed selector categories. Values are capped at
  10,000 on export; arbitrary selectors and arbitrary attribute values are never
  exported. On excluded routes the content script does not run the diagnostic
  selector scan; the popup's fixed schema fills unused categories with zeros.
- `errorCode`: null or the fixed `local-optimization-stopped` code.

Diagnostics do not include identifiers, attribute contents, text/HTML, user
input, URLs, cookies, full exception messages, timestamps, or a browser user agent.
The popup repeats schema validation so unexpected fields cannot enter the report.
The report remains local until the user explicitly copies and shares it.

## Boundaries

No DOM deletion, page-world API hooks, automatic reload/discard, remote code,
external endpoint, background recording, or automatic video resume. Scoped CSS
is inert until the script marks a distant eligible post. Frames and shadow roots
are deliberately not traversed. The network rule is opt-in and host-wide;
rendering/video modifications are restricted to the home-feed route.
