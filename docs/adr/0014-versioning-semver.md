<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0014: Versioning — SemVer, Keep a Changelog, tagged releases

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

Users install by copying files; they need to know what changed and whether it is safe to update in place.

## Decision

Version with **Semantic Versioning 2.0.0** and record changes in **`CHANGELOG.md`** in the Keep a Changelog 1.1.0 format, with an `[Unreleased]` section. A release sets the version in one place, `manifest.json` `version` and `version_name`; the popup, the help page and diagnostics read it from the manifest at runtime, is tagged `vX.Y.Z` and published as a GitHub release with the ZIP and its SHA-256 checksum, built reproducibly by `tools/package.py`. While the major version is 0, a minor bump may change behaviour; a settings-schema or permission change is called out under **Changed** or **Security**.

## Alternatives considered

- **Date versions.** Rejected: Chromium needs dotted integers and users expect SemVer.

## Consequences

- The manifest is the one source of the version (since 0.3.0); a release changes nothing else but the changelog.

## Validation

- CI checks that `manifest.json`'s `version` and `version_name` agree, and a unit test that no version string is written anywhere else in the extension.

## Amendments

- 2026-10-19 (0.3.0): the version moved to the manifest alone; it was set in five places before.
