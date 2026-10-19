<!--
  SPDX-License-Identifier: GPL-3.0-only
  SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
-->

# ADR-0001: License — GPL-3.0-only, REUSE-compliant

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** project owner

## Context

The project owner publishes the extension as copyleft free software, in line with the owner's other public projects (pcontacts). The owner holds the copyright to all of the code: there are no outside contributions, and no third-party code, font or image is bundled (the video fixture `tests/silent.webm` is a synthetic clip; the screenshots are the extension's own UI). Selector knowledge was informed by public DOM observation, not copied code.

## Decision

License the whole repository **GPL-3.0-only**. `LICENSE` (and `extension/LICENSE`, so the loadable folder carries its licence) holds the verbatim GPL-3.0 text from gnu.org (sha256 `3972dc97…`), mirrored in `LICENSES/GPL-3.0-only.txt` for REUSE. Every file that can carry a comment has an SPDX header:

```
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
```

in its own comment syntax; files that cannot (JSON, images, video, generated reports) take theirs from `REUSE.toml`. The repository is REUSE 3.3 compliant.

## Alternatives considered

- **A permissive licence.** Rejected: the owner wants derivatives to stay free.
- **GPL-3.0-or-later.** Rejected, as in pcontacts: forks should choose future GPL versions deliberately.
- **AGPL-3.0.** Rejected: client-side software, no network service to protect.
- **MPL-2.0.** Rejected: file-level copyleft is weaker than the owner wants.

## Consequences

- Any redistribution (a store listing, a fork, a repackaged ZIP) must ship corresponding source under GPL-3.0-only.
- A contribution is accepted only under GPL-3.0-only; closed-source contributions are not.
- No GPL-incompatible runtime dependency can be added (today there are none).
- The help page and README state the licence; a change of licence touches both languages of `helpLicense`.

## Validation

- `reuse lint` passes in CI.
- The `LICENSE` hash matches gnu.org's GPL-3.0 text.
