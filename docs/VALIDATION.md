<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->
# Validation - LinkedIn Feed Guard 0.4.0

## Scope

This is a local beta, distributed as unpacked source. It has not been installed
in an authenticated LinkedIn session in the laboratory. The user's exact live
DOM was not provided. Broader structural matching addresses known detection gaps,
but successful detection on the user's specific account remains to be confirmed.

Field report: the project owner installed 0.2.0 unpacked in their own browser and
reported it working on their LinkedIn feed (2026-10-19). That is a report of use,
not a measurement: no counts, memory or CPU figures were recorded with it. 0.3.0
changes the code it ran (the review fixes in `CHANGELOG.md`) and is covered by the
fixture results below.

The package includes the exact source, synthetic fixtures, test commands, result
logs and UI screenshots. Each release ZIP carries its own SHA-256 checksum.

## Test results

**78 tests passed: 27 Node unit tests and 51 Chromium browser/UI fixture cases.**
No failing cases in the final run. See `test-results/unit.tap`,
`test-results/browser.log` and `test-results/browser-results.json`.

Screenshots of both popup languages, both help languages and the diagnostics panel
are included in `test-results/`. They show synthetic test data, not an authenticated account.

`test-results/` is regenerated at each release by running the tests on the tagged
tree; running the browser tests rewrites it in place. `browser-results.json`
records `extensionSha256`, a SHA-256 over every file under `extension/` the run
loaded, so a result can be tied to the code it tested. To check it against a tree:

```bash
cd extension && find . -type f -printf '%P\n' | LC_ALL=C sort | xargs sha256sum | sha256sum
```

The first field must equal `extensionSha256`; a different value means the results
describe other code.

### Unit tests

The Node suite covers configuration types and whitelists, defaults, serialized
writes, DNR enable/disable calls, storage rollback, sender validation, update
preservation, startup reconciliation, request-pattern boundaries and manifest
permissions. It also checks locale selection/fallback, separate language storage,
failed writes, live storage notifications, translated HTML/ARIA keys, manifest
locale catalogs, equal translation keys and diagnostic schema sanitization.

Browser extension APIs are mocked here. These are not tests of Chrome's actual
DNR engine or of installed-extension permissions.

### Browser fixtures

The browser suite uses a real Chromium DOM/layout engine, media playback,
IntersectionObserver, MutationObserver and content-visibility rendering. The
runtime source is loaded into an isolated JavaScript world. Source files are
not rewritten for the tests; a lexical location dependency is supplied to model
routes in local `about:blank` pages.

Coverage includes ordinary and nested cards, rendering near/far from the viewport,
page search, draft/editor protection, live settings, scroll-height/resize handling,
large insertions, removed-node cleanup, route changes, video pause behavior,
media protections, lifecycle cleanup and preservation of page-owned CSS values.

The long-feed notice (ADR-0015) is covered on a 210-post fixture: it appears outside
the feed root, a click reloads (simulated `location`), Later snoozes it, and the
setting, the master switch, an excluded route and an orphaned script keep it away.
Class-change scoping is covered by counting observer records: class churn beside the
feed delivers none, while a class that hides the root's ancestor still releases it.
The popup's heap counter, warning and Reload feed button are covered in both languages.
Real heap growth on LinkedIn and whether the notice prevents a crash were not measured.

Detection cases include modern mainFeed without a main element, component-key
wrappers, empty first main elements, hidden roots, late feed containers, attribute
hydration/removal, modern-to-class-based root replacement, strict list-item
fallbacks and a grouping container containing multiple actual post cards. Zero
posts is not classified as successful post detection.

Diagnostics are tested with text/input/cookie getters that throw when accessed.
The popup sanitization test adds deliberately unexpected fields and checks that
they do not reach the displayed report. Clipboard denial produces manual selection,
not a permission bypass. Language tests cover both complete interfaces, a stored
override, live changes and help. A stale content-script version produces a reload
warning in both languages.

## Browser and policy constraints

The recorded run used Chromium 153.0.8010.12, headless, driven by Playwright.
An earlier run, on Chromium 144.0.7559.96, was under a managed policy with
`ExtensionInstallBlocklist: ["*"]` and `URLBlocklist: ["*"]`, which was not
altered. Either way the tests do not install the extension, navigate to LinkedIn, sign in,
use the user's profile, or bypass browser policy. All fixture page requests are
aborted. Synthetic media is embedded as a tiny data-URL video.

Extension APIs, navigation state, hidden-tab state, picture-in-picture, fullscreen
and BFCache transitions are simulated where the laboratory cannot exercise them
as real user actions. Video playback and pause are real browser media operations.
The popup is rendered as a local page with extension APIs supplied by the harness,
not as a browser-installed extension action popup.

No real-session RAM/CPU savings were measured. The original reported crash was
not reproduced. Passing fixtures is not evidence that a memory leak has been fixed
or that every LinkedIn layout is supported.

## Manual acceptance check

1. Replace the files in the existing extension directory. Reload the extension,
   verify version 0.3.0, save drafts, and reload LinkedIn.
2. Open the main home feed. Confirm a positive post count and inspect the detected
   root/variant counts in Diagnostics. If zero remains, share only the local report
   after reviewing it; do not assume optimization is active.
3. Switch English/Italian, close/reopen the popup, and open Help. Verify that the
   language persists and all displayed status/error messages follow the selection.
4. Scroll both directions, open comments/menus and edit a draft. No post or editor
   should disappear. Toggle rendering and the master switch to confirm rollback.
5. Test in/out-of-view video, background tabs and actual fullscreen/PiP if used.
6. Keep the optional network filter off initially. Validate it separately before
   relying on its actual browser-engine behavior.
7. Compare similar sessions with the same Shields and other extension settings.
   Record browser task-manager observations and any crash code. A session without
   a crash does not establish a general fix.

## Primary technical references

These are references for APIs and selector evidence, not performance measurements.
No remote material is loaded by the extension at runtime.

- Chrome internationalization and default locale:
  https://developer.chrome.com/docs/extensions/reference/api/i18n
- Chrome content-script isolation:
  https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome tab messaging and permission distinctions:
  https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome unpacked-extension workflow:
  https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
- Chrome Declarative Net Request:
  https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- A public implementation's documented mainFeed/componentkey DOM observations:
  https://github.com/alxkutovyi/litmus/blob/main/docs/architecture.md
  This is third-party implementation evidence, not an official LinkedIn DOM
  contract and not proof that it matches the user's live session.
