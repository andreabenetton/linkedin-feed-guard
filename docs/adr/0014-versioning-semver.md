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

Version with **Semantic Versioning 2.0.0** and record changes in **`CHANGELOG.md`** in the Keep a Changelog 1.1.0 format, with an `[Unreleased]` section. A release sets the version in every place it appears (`manifest.json` `version` and `version_name`, `config.js` `VERSION`, `popup.html`, `help.html` and the help strings), is tagged `vX.Y.Z` and published as a GitHub release with the ZIP and its SHA-256 checksum, built reproducibly by `tools/package.py`. While the major version is 0, a minor bump may change behaviour; a settings-schema or permission change is called out under **Changed** or **Security**.

## Alternatives considered

- **Date versions.** Rejected: Chromium needs dotted integers and users expect SemVer.

## Consequences

- The version appears in several files; a release checklist (README) lists them until one source drives them.

## Validation

- CI checks that `manifest.json`'s `version` and `config.js`'s `VERSION` agree.
