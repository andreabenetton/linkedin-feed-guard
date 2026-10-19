#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
"""Release packaging for LinkedIn Feed Guard (ADR-0014). Standard library only.

    python3 tools/package.py --check            the version strings agree; exit 1 if not
    python3 tools/package.py --tag v0.3.0       ... and the tag is that version
    python3 tools/package.py --notes            the CHANGELOG section of the manifest's version
    python3 tools/package.py [--out dist]       build dist/linkedin-feed-guard-X.Y.Z.zip and its .sha256

The ZIP holds ONE folder, linkedin-feed-guard-X.Y.Z/, which IS the extension: manifest.json at its root,
so a user unzips it and selects that folder in brave://extensions -> Load unpacked. Entries are sorted and
dated 1980-01-01, so the same tree always gives the same bytes and the same checksum.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "extension")
NAME = "linkedin-feed-guard"


def manifest_version() -> str:
    with open(os.path.join(EXT, "manifest.json"), encoding="utf-8") as fh:
        return json.load(fh)["version"]


def version_problems() -> list[str]:
    """Every place a release must set the version (ADR-0014), compared with manifest.json's."""
    v = manifest_version()
    if not re.fullmatch(r"\d+\.\d+\.\d+", v):
        return [f"manifest.json version {v!r} is not MAJOR.MINOR.PATCH"]
    with open(os.path.join(EXT, "manifest.json"), encoding="utf-8") as fh:
        name = json.load(fh).get("version_name", "")
    found = {"manifest.json version_name": name.split(" ")[0]}
    with open(os.path.join(EXT, "config.js"), encoding="utf-8") as fh:
        m = re.search(r"VERSION\s*[:=]\s*['\"]([^'\"]+)['\"]", fh.read())
    found["config.js VERSION"] = m.group(1) if m else "(not found)"
    for page in ("popup.html", "help.html"):
        with open(os.path.join(EXT, page), encoding="utf-8") as fh:
            vs = set(re.findall(r"\b(\d+\.\d+\.\d+)\b", fh.read()))
        found[page] = ", ".join(sorted(vs)) or "(none)"
    return [f"{where} says {got}, manifest.json says {v}" for where, got in found.items() if got != v]


def notes(version: str) -> str:
    with open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8") as fh:
        text = fh.read()
    m = re.search(rf"^## \[{re.escape(version)}\][^\n]*\n(.*?)(?=^## \[|\Z)", text, re.M | re.S)
    if not m:
        raise SystemExit(f"package: CHANGELOG.md has no section [{version}]")
    return m.group(1).strip() + "\n"


def build(out: str) -> str:
    v = manifest_version()
    top = f"{NAME}-{v}"
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, f"{top}.zip")
    files = []
    for dirpath, dirnames, filenames in os.walk(EXT):
        dirnames.sort()
        for f in sorted(filenames):
            full = os.path.join(dirpath, f)
            files.append((full, os.path.relpath(full, EXT).replace(os.sep, "/")))
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for full, rel in files:
            info = zipfile.ZipInfo(f"{top}/{rel}", date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(full, "rb") as fh:
                z.writestr(info, fh.read())
    with open(path, "rb") as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    with open(path + ".sha256", "w", encoding="utf-8") as fh:
        fh.write(f"{digest}  {os.path.basename(path)}\n")
    return path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--tag")
    ap.add_argument("--notes", action="store_true")
    ap.add_argument("--out", default=os.path.join(ROOT, "dist"))
    a = ap.parse_args(argv)
    problems = version_problems()
    if a.tag is not None and a.tag != f"v{manifest_version()}":
        problems.append(f"tag {a.tag} is not v{manifest_version()}")
    if problems:
        for p in problems:
            print(f"package: {p}", file=sys.stderr)
        return 1
    if a.check:
        print(f"package: version {manifest_version()} agrees everywhere")
        return 0
    if a.notes:
        sys.stdout.write(notes(manifest_version()))
        return 0
    print(build(a.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
