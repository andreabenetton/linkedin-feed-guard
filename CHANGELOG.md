<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Licensed GPL-3.0-only** (ADR-0001). Every source file carries an
  SPDX header; files that cannot, such as JSON and images, are covered by `REUSE.toml`.
  The help page names the new licence in both languages.

### Added

- **An icon** in the extensions page and on the toolbar: a shield over feed cards that
  fade off screen, with a pause badge. A simplified drawing keeps it legible at 16 and
  32 pixels.
- **Architecture decision records** under `docs/adr/` for the choices the extension
  embodies: platform, privacy, permissions, scope, detection, rendering, video,
  failure handling, settings, languages, testing and versioning.
- **Continuous integration**: syntax, unit tests, browser fixtures, REUSE compliance,
  a check that the extension contains no network code, and version consistency.
- **Releases**: a `vX.Y.Z` tag publishes a GitHub release with a ZIP ready for
  *Load unpacked* and its SHA-256 checksum (`tools/package.py`).

### Removed

- `SHA256SUMS`: each release carries the checksum of its own ZIP instead.

## [0.2.0] - 2026-10-19

### Added

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

[Unreleased]: https://github.com/andreabenetton/linkedin-feed-guard/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/andreabenetton/linkedin-feed-guard/releases/tag/v0.2.0
