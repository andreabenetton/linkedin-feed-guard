/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * Shared, dependency-free configuration. This file never accesses the page.
 */
(() => {
  'use strict';
  const DEFAULTS = Object.freeze({
    enabled: true,
    renderOffscreen: true,
    pauseOffscreenVideos: true,
    pauseHiddenVideos: true,
    blockTracking: false,
  });
  const KEYS = Object.freeze(Object.keys(DEFAULTS));
  function normalize(value) {
    const result = { ...DEFAULTS };
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of KEYS) {
        if (typeof value[key] === 'boolean') result[key] = value[key];
      }
    }
    return result;
  }
  function validatePatch(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('invalid-settings');
    }
    for (const [key, value] of Object.entries(patch)) {
      if (!KEYS.includes(key) || typeof value !== 'boolean') {
        throw new Error('invalid-option');
      }
    }
    return patch;
  }
  // manifest.json is the one place a release writes the version (ADR-0014).
  // Every extension context (content script, pages, worker) can read it; the
  // fallback serves only the Node vm unit tests, which supply no runtime.
  function manifestVersion() {
    try {
      const value = globalThis.chrome?.runtime?.getManifest?.()?.version;
      if (typeof value === 'string') return value;
    } catch { /* No extension runtime: use the fallback. */ }
    return '0.0.0';
  }
  globalThis.LLGuardConfig = Object.freeze({
    DEFAULTS, KEYS, normalize, validatePatch,
    VERSION: manifestVersion(),
    STORAGE_KEY: 'feedGuardSettingsV1',
    RULESET: 'optional_tracking',
  });
})();
