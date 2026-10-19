<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# Security policy

## Supported versions

Only the latest release receives fixes. There is no backport policy.

## Reporting a vulnerability

**Do not open a public issue for a security problem.** Use **Report a
vulnerability** under this repository's **Security** tab, which opens a private
advisory visible only to the maintainer. Include the version (shown in the popup
and on `brave://extensions`), the browser and its version, what you did and what
happened, and the diagnostics JSON if it helps; it contains no personal data
(ADR-0003).

## What counts

Anything that would let the extension send data anywhere, read page content or
personal data, run code it did not ship, act outside `https://www.linkedin.com/`,
or keep acting after it is switched off, is a security issue. So is a way for a
web page to change the extension's settings.
