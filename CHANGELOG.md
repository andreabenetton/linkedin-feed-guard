<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->
# Changelog

## 0.2.0

- Detect `mainFeed` containers and component-key list items, alongside class-based
  and data-view markers. Restrict the list-item fallback to post-like structure.
- Choose a populated, non-hidden feed rather than unconditionally choosing the
  first main element. Detect late roots and identity attributes added by hydration.
- Separate successful card detection from merely finding a container.
- Add an explicit page rescan and fixed-schema, opt-in local diagnostics.
- Add complete English and Italian interfaces, status/error messages and help.
- Add a persistent language selector with browser-default behavior.
- Provide standalone English README, architecture and validation documentation.
- Expand fixture coverage for modern layouts, hydration, diagnostics and languages.
