<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0009: Video — pause only, never resume, never touch media settings

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

Off-screen and background videos keep decoding.

## Decision

Call **only `pause()`** on videos in detected posts when they are outside a 150 px margin or the tab is hidden. **Never resume**, never change sources, volume, preload, autoplay or account settings. Fullscreen and picture-in-picture playback are excluded.

## Alternatives considered

- **Auto-resume on return.** Rejected: surprising, and could play sound unexpectedly.
- **Unloading media.** Rejected: changes LinkedIn's player state.

## Consequences

- A paused video stays paused after the feature is turned off.

## Validation

- Fixtures cover off-screen, hidden-tab, PiP and fullscreen cases with a real media element.
