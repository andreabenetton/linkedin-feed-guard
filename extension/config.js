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
    memoryAdvisory: true,
  });
  // Long-feed memory advisory (ADR-0015). A feed that keeps growing is the usual
  // road to an out-of-memory "Aw, Snap!": the only thing that frees it is a reload,
  // which the extension offers and never performs on its own.
  const ADVISORY = Object.freeze({
    posts: 200,          // detected posts in the current feed
    heapMB: 1200,        // JavaScript heap in use, where the browser reports it
    heapRatio: 0.5,      // or this share of the heap limit
    heapMinPosts: 30,    // the heap counts only from here: after a reload the old
                         // page's heap lingers until garbage collection (measured:
                         // 1.5 GB with 2 posts for ~40 s), which is not this feed's
    interval: 5000,      // at most one sample per interval, only when work runs anyway
    snoozePosts: 100,    // "Later" waits for this many more posts...
    snoozeGrowth: 1.25,  // ...or this much more heap
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
    DEFAULTS, KEYS, ADVISORY, normalize, validatePatch,
    VERSION: manifestVersion(),
    STORAGE_KEY: 'feedGuardSettingsV1',
    RULESET: 'optional_tracking',
  });
})();
