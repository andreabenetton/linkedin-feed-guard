<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->
# Architecture

Manifest V3, packaged vanilla JavaScript/CSS/HTML, no build step and no runtime
dependencies. The runtime directory is `extension/`.

## Components

`config.js` validates the six boolean preferences, holds the long-feed thresholds and reads the release version
from the manifest, its only source. `background.js` serializes settings changes,
reconciles the packaged DNR ruleset, and rolls back rules if a storage write fails.
Its settings message channel answers only the extension's own pages, not content
scripts or web pages. That channel is not the only writer: `chrome.storage.local`
is writable from every extension context, the content script included, so the
worker reconciles the ruleset after any change to the stored settings, whoever made
it, and every reader normalizes what it reads. A web page has no access to it.
Errors returned to the UI are fixed codes rather than arbitrary exception text.

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

`advisory.js` (content script, loaded before `content.js`) owns the long-feed
notice of ADR-0015: one `data-llg-v1-advisory` element appended to `body`, outside the
feed root, with an open shadow root, a constructed stylesheet and its own English and
Italian strings (it cannot use `i18n.js`, which rewrites `[data-i18n]` nodes of the
document it runs in). `content.js` decides when to show it: at most once per five
seconds, during a flush that runs anyway, it compares the post count and Chromium's
`performance.memory` with the thresholds. Only a click on Reload feed reloads.
While the feed has posts, `content.js` watches `class` changes inside the feed root
only; other identity attributes are still watched document-wide.

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

`feedGuardSettingsV1`: six booleans (`enabled`, `renderOffscreen`,
`pauseOffscreenVideos`, `pauseHiddenVideos`, `blockTracking`, `memoryAdvisory`).

`feedGuardLanguageV1`: one enum, `auto`, `en`, or `it`.

Counts and generated reports are not persisted. No Sync storage is used. Changing
the language does not rewrite the six optimization preferences.

## Diagnostics, schema 2

The report contains only these fields:

- `schema`, `version`: the fixed schema and the release version of the popup that
  made the report.
- `contentVersion`: the release version the page's content script reports, kept only
  when it is MAJOR.MINOR.PATCH and omitted otherwise. It differs from `version` when
  the tab still runs a script from before an update or reload.
- `pageCategory`: `main-feed` or `other`; not the page URL.
- `scope`: `feed`, `unrecognized`, `waiting`, `outside-feed`, `disabled`, `error`,
  or `stale`, which the popup sets when `contentVersion` is not `version`.
- `visibility`, `enabled`, `renderSupported`: fixed enums/booleans.
- `root`: `none`, `mainFeed`, `main`, or `role-main`.
- `posts`, `deferred`, `videos`, `paused`: nonnegative aggregate counters.
- `variants`: counts for `legacy`, `component-key`, and `list-item` wrappers.
- `selectors`: counts for twelve fixed selector categories. Values are capped at
  10,000 on export; arbitrary selectors and arbitrary attribute values are never
  exported. On excluded routes the content script does not run the diagnostic
  selector scan; the popup's fixed schema fills unused categories with zeros.
- `heapMB`: JavaScript heap in use in 50 MB buckets, or null where the browser does
  not report it. `pressure`: whether the long-feed notice's threshold is met.
- `errorCode`: null or the fixed `local-optimization-stopped` code.

Diagnostics do not include identifiers, attribute contents, text/HTML, user
input, URLs, cookies, full exception messages, timestamps, or a browser user agent.
The popup repeats schema validation so unexpected fields cannot enter the report.
The report remains local until the user explicitly copies and shares it.

## Boundaries

No DOM deletion, page-world API hooks, automatic reload/discard (a reload happens
only on the user's click), remote code,
external endpoint, background recording, or automatic video resume. Scoped CSS
is inert until the script marks a distant eligible post. Frames and shadow roots
are deliberately not traversed. The network rule is opt-in and host-wide;
rendering/video modifications are restricted to the home-feed route.
