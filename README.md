<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->
# LinkedIn Feed Guard

**Version 0.4.0 - local beta for Brave and Chromium browsers. Licensed GPL-3.0-only.**

Reduce unnecessary rendering and video playback in the LinkedIn home feed without
removing posts, reloading pages, or suspending tabs. Not affiliated with LinkedIn.

The interface and built-in help are available in **English and Italian**. This
README and the developer documentation are in English.

**This extension does not impose a RAM/CPU limit and does not guarantee a fix for
"Aw, Snap!" crashes.** The current release has been tested on synthetic browser
fixtures, not in your authenticated LinkedIn session.

## Install

No build tools, account, registration, or package manager are needed. It works in
Brave, Chrome and other Chromium browsers.

1. **Download.** From the
   [latest release](https://github.com/andreabenetton/linkedin-feed-guard/releases/latest)
   download `linkedin-feed-guard-X.Y.Z.zip` and `linkedin-feed-guard-X.Y.Z.zip.sha256`.
2. **Check the download** (optional, recommended). In the download folder, run
   `sha256sum -c linkedin-feed-guard-X.Y.Z.zip.sha256`; it must print `OK`.
   (macOS: `shasum -a 256 -c …`; Windows PowerShell: `Get-FileHash` and compare.)
3. **Extract to a permanent place**, for example `~/extensions/`. The browser loads
   the extension from this folder every time it starts: do not delete or move it
   afterwards. You get one folder, `linkedin-feed-guard-X.Y.Z`, with `manifest.json`
   directly inside it.
4. **Load it.** Open `brave://extensions` (`chrome://extensions` in Chrome), switch on
   **Developer mode** (top right), click **Load unpacked**, and select the
   `linkedin-feed-guard-X.Y.Z` folder itself, not the ZIP and not a folder above it.
   (From a clone of this repository, select its `extension/` folder instead.)
5. **Pin it** (optional): click the puzzle-piece icon in the toolbar and pin
   LinkedIn Feed Guard, so its popup is one click away.
6. **Reload LinkedIn.** Save any drafts, then reload your open LinkedIn tabs: a tab
   opened before the install does not have the extension yet.
7. **Check it works.** Open `https://www.linkedin.com/feed/`, wait for posts, and open
   the extension popup. **Posts detected** should be above zero. If it stays at zero,
   see [When the post count is zero](#when-the-post-count-is-zero).

Do not bypass browser security or organizational policies that prohibit local
extensions. In Qubes OS, keep the extracted files in the same AppVM as Brave.

## Update an existing installation

Keep the folder you loaded the first time: the browser ties the extension's ID and
your settings to that path.

1. Download and extract the new release as in steps 1 to 3 above, somewhere else.
2. Copy the **contents** of the new `linkedin-feed-guard-X.Y.Z` folder over the
   contents of your existing folder, replacing every file, `_locales/` and
   `icons/` included. (From a clone, copy the contents of `extension/`.)
3. At `brave://extensions`, click **Reload** on LinkedIn Feed Guard and check the
   version it shows is the new one.
4. Save drafts and reload your LinkedIn tabs. **Reloading the extension alone does
   not replace the script already running in an open page.**

Do not run two copies of Feed Guard at once. Loading the new folder as a second
extension instead creates a separate extension with separate settings; remove one.

## Language

The popup and help page have a **Language** selector:

- **Browser default**: Italian for an Italian browser UI; English otherwise.
- **English** or **Italiano**: a persistent local override.

Changing the language updates labels, status messages, errors, diagnostic
instructions, and help without reloading LinkedIn. The popup and help share the
same preference. Browser-managed extension metadata follows the browser locale,
not the popup override. Diagnostic JSON uses stable English keys in both languages.

## Features and defaults

| Setting | Default | Behavior |
|---|---|---|
| Enable Feed Guard | On | Enables the selected optimizations |
| Off-screen rendering | On | Applies `content-visibility: auto` to distant, eligible cards |
| Pause off-screen videos | On | Pauses videos outside the viewport margin |
| Pause videos in background | On | Pauses detected videos when the tab is hidden |
| Long-feed memory warning | On | Offers a reload when the feed grows heavy; never reloads by itself |
| Experimental network filter | **Off** | One narrow, optional rule for `/li/track` |

Keep the network filter off during initial testing and do not change Brave Shields
at the same time. This makes comparisons less ambiguous.

### Feed detection

Detection supports `data-testid="mainFeed"` containers, component-key list items
with the `FeedType_MAIN_FEED` marker, `.occludable-update`,
`.feed-shared-update-v2`, and `data-view-name="feed-full-update"` cards. A list-item
fallback requires both a `mainFeed` ancestor and an `expandable-text-box` marker.
Nested card markers are deduplicated.

The detector can select a populated feed after an empty or hidden `main`, and
handles late-loading containers and known identity attributes added during
hydration. It does not identify posts by reading text or by treating every
`article` or list item as a post.

Changes are limited to the main `/feed` or `/feed/` route on `www.linkedin.com`.
Profiles, messaging, jobs, and individual-post pages are excluded. The content
script is registered on the whole host to detect in-page navigation back to the
feed. Frames and shadow-DOM feeds are not supported.

### Rendering and video safeguards

Cards near the viewport, with focus, editors, input fields, open menus, or playing
media are excluded from deferred rendering. The browser may skip rendering
eligible distant cards, but their DOM and LinkedIn application state remain in
memory. No post nodes are deleted. The master switch removes the extension's
annotations and disables its network rule.

Video handling only invokes `pause()`. It does not change media URLs, volume,
preload, autoplay attributes, or account settings. Fullscreen and
picture-in-picture playback are excluded. Videos are never automatically resumed
by the extension. Pausing does not guarantee that buffering or allocation stops.

### Long-feed memory warning

The feed only grows: every post you scroll past stays in memory, and a tab that runs
out of it shows "Aw, Snap!". Deferred rendering and video pauses cannot release that
memory; a reload does. When the feed reaches 200 detected posts, or Chromium reports
at least 1200 MB (or half the limit) of JavaScript heap in use, a small notice in the
bottom-right corner offers **Reload feed** or **Later** (which waits for 100 more
posts or 25 % more memory). The popup shows the heap in use and, when the feed is
heavy, the same button. The extension never reloads on its own: save drafts first.
The heap figure is Chromium's coarse `performance.memory`, not the whole tab's memory
(see ADR-0015).

### Optional network rule

The packaged DNR rule blocks XHR/fetch, beacon, and image requests initiated by
`www.linkedin.com` to `https://www.linkedin.com/li/track` and its query/path
variants. It applies across `www.linkedin.com`, not just the feed. It is not a
complete tracker blocker, and does not replace Brave Shields. Blocking requests
can cause retries or site failures. Keep it off unless you deliberately test it.

## When the post count is zero

First confirm that the extension has permission to run on LinkedIn and that the
page was reloaded after installation or updating. Open the home feed, wait for
visible posts, scroll slightly, and click **Rescan page**.

The popup distinguishes **Posts detected**, **Feed container found; no posts
detected**, and **Waiting for a feed container**. Finding a container alone is
not reported as successful post detection.

If the count is still zero, choose **Diagnostics**. Inspect the JSON, then use
**Copy report** to include it in a problem report. If clipboard access is denied,
the extension selects the text for manual Ctrl+C / Cmd+C copying. Nothing is sent
automatically. No browser-console script or page HTML export is required.

A zero count means the extension is not applying post rendering/video handling to
recognized posts. Do not interpret it as proof that the feed has been optimized.
LinkedIn can serve different layouts, and the selectors may need further changes.

## Privacy and permissions

- Local storage contains only six boolean settings and one language preference.
  No `storage.sync`, content archive, URL history, or diagnostic log is used.
- Per-tab counters exist only in memory. Diagnostics are generated on request and
  contain the popup's and the page script's versions, fixed status values, the
  enabled and rendering-support flags, aggregate counts from fixed selectors, and
  the JavaScript heap in use in 50 MB steps.
  They exclude text, HTML, names, input values, attribute values, post/account IDs,
  titles, URLs, cookies, and browser fingerprint fields. Unknown report fields are
  stripped again in the popup before display/copy.
- There are no telemetry endpoints, remote dependencies, remote scripts, or
  configured automatic update endpoints. Runtime files make no network requests
  of their own. This does not block ordinary LinkedIn or browser traffic.
- Permissions: `storage`, `declarativeNetRequestWithHostAccess`, and access to
  `https://www.linkedin.com/*`. No cookies, history, debugger, clipboard, native
  messaging, or all-sites permission is requested.

An authorized content script can technically access its permitted page's DOM.
Privacy therefore depends on implementation, not merely on permission names.

## Test and inspect

See [validation and limitations](docs/VALIDATION.md),
[architecture and diagnostic schema](docs/ARCHITECTURE.md), and `test-results/`.
Tests use synthetic `about:blank` fixtures, a real Chromium layout/media engine,
and simulated extension APIs and route/visibility states. Browser policy prevents
loading an extension in the laboratory. Installed-extension behavior, the actual
DNR engine, and authenticated LinkedIn performance remain manual validation tasks.

Optional test prerequisites: Node.js 20+, Python 3.10+, Playwright, and Chromium.
The extension itself does not require any of these development tools.

```bash
node --test tests/*.test.cjs
python3 -m venv .venv
.venv/bin/python -m pip install -r tests/requirements.txt
CHROMIUM_BIN=/usr/bin/chromium .venv/bin/python tests/browser_tests.py
```

Tests use temporary browser profiles, no LinkedIn login, and no external
navigation. They do not modify browser policies. The tiny video fixture is a
silent synthetic WebM.

## Package layout

```text
extension/       Load this folder in Brave; all runtime code is included
  _locales/      English and Italian browser metadata
  selectors.js   Structural feed detection
  i18n.js        Packaged English and Italian interface/help strings
  diagnostics.js Fixed-schema report sanitization
  rules/         Optional packaged network rule
  LICENSE        GPL-3.0 text
README.md        English installation and usage guide
CHANGELOG.md     Release notes
LICENSE          GPL-3.0 text (GPL-3.0-only); REUSE.toml covers files without a header
docs/            English architecture and validation notes
tests/           Reproducible unit and browser fixture tests
test-results/    Test reports and UI screenshots recorded at release
tools/package.py Builds the Load-unpacked release ZIP and its checksum
```
