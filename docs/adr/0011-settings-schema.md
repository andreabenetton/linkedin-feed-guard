<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0011: Settings — one versioned local key, validated and migrated

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

Settings outlive extension versions.

## Decision

Store settings under one versioned key, **`feedGuardSettingsV1`**, normalized and validated by `config.js` (`normalize`, `validatePatch`); only the extension's own pages may change them through the worker (`trustedUI`). A new schema gets a new key and a migration that keeps the user's values.

## Alternatives considered

- **Several loose keys.** Rejected: harder to validate and migrate atomically.

## Consequences

- `chrome.storage.local` itself is writable by every extension context, including the content script; the worker reconciles any change (the trust boundary is the extension, not the popup).

## Validation

- `tests/worker.test.cjs` covers validation, sender rejection and migration.
