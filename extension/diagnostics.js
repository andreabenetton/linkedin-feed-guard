/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * Fixed-schema diagnostic export; UI only. */
(() => {
  'use strict';
  const count = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 10000) : 0;
  const pick = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const release = value => typeof value === 'string' && /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(value);
  function sanitize(value) {
    const source = value && typeof value === 'object' ? value : {};
    const groups = {};
    for (const key of ['legacy', 'component-key', 'list-item']) groups[key] = count(source.variants?.[key]);
    const selectors = {};
    for (const key of ['mainFeed', 'main', 'roleMain', 'occludable', 'sharedUpdate',
      'viewUpdate', 'componentKeyCards', 'listItems', 'expandableTextBoxes',
      'feedRoles', 'articleRoles', 'frames']) selectors[key] = count(source.selectors?.[key]);
    // `version` is this UI's; `contentVersion` is the page script's own, which
    // differs when the tab still runs a script from before an update or reload.
    const report = {schema: 2, version: globalThis.LLGuardConfig.VERSION};
    if (release(source.version)) report.contentVersion = source.version;
    return Object.assign(report, {
      pageCategory: pick(source.pageCategory, ['main-feed', 'other'], 'other'),
      scope: pick(source.scope, ['feed', 'unrecognized', 'waiting', 'outside-feed',
        'disabled', 'error', 'stale'], 'error'),
      visibility: pick(source.visibility, ['visible', 'hidden'], 'hidden'),
      enabled: source.enabled === true, renderSupported: source.renderSupported === true,
      root: pick(source.root, ['none', 'mainFeed', 'main', 'role-main'], 'none'),
      posts: count(source.posts), deferred: count(source.deferred),
      videos: count(source.videos), paused: count(source.paused),
      variants: groups, selectors,
      // Heap in use, in 50 MB buckets, or null where the browser does not report it.
      heapMB: Number.isSafeInteger(source.heapMB) && source.heapMB >= 0
        ? Math.min(100000, Math.round(source.heapMB / 50) * 50) : null,
      pressure: source.pressure === true,
      unloadedImages: count(source.unloadedImages),
      errorCode: source.errorCode === 'local-optimization-stopped' ? 'local-optimization-stopped' : null,
    });
  }
  globalThis.LLGuardDiagnostics = Object.freeze({sanitize});
})();
