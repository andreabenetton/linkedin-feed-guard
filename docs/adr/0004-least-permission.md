<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0004: Permissions — storage and declarativeNetRequestWithHostAccess on one host

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

Every permission is shown to the user and widens what a compromise of the extension could do.

## Decision

Request only **`storage`** and **`declarativeNetRequestWithHostAccess`**, with host access **`https://www.linkedin.com/*`**. No `tabs`, `scripting`, `activeTab`, `cookies`, `history`, clipboard, `debugger` or all-sites permission; no `web_accessible_resources`, no `externally_connectable`. The content script runs in the ISOLATED world, top frame only (`all_frames: false`).

## Alternatives considered

- **`declarativeNetRequest`.** Rejected: broader install warning; the host-access variant is enough for one host.
- **`scripting` + programmatic injection.** Rejected: a declared content script does the job without the permission.
- **`<all_urls>`.** Rejected: the extension has nothing to do elsewhere.

## Consequences

- A feature needing another permission needs an ADR first.
- `tabs.query`/`tabs.sendMessage`/`tabs.create` are used only as far as they work without `tabs`.

## Validation

- `tests/worker.test.cjs` asserts the manifest's permissions and host list stay this narrow.
