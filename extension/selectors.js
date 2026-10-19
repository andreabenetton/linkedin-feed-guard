/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * Structural detection only. Never read or copy component-key values or page text.
 */
(() => {
  'use strict';
  const LEGACY = '.occludable-update, .feed-shared-update-v2, [data-view-name="feed-full-update"]';
  const MODERN = '[role="listitem"][componentkey*="FeedType_MAIN_FEED"]';
  const MAIN_FEED = '[data-testid="mainFeed"]';
  const ROOTS = `${MAIN_FEED}, main, [role="main"]`;
  const CANDIDATES = `${LEGACY}, ${MODERN}, [role="listitem"]`;
  const HIDDEN = '[hidden], [aria-hidden="true"], [inert]';
  const ATTRIBUTES = Object.freeze(['class', 'role', 'data-view-name', 'data-testid',
    'componentkey', 'hidden', 'aria-hidden', 'inert']);

  function eligible(node, root) {
    if (!node || node.nodeType !== 1 || node === root || !root?.contains(node)) return false;
    if (node.matches(LEGACY) || node.matches(MODERN)) return true;
    // A generic list item is NOT a post. Accept this fallback only in the known
    // mainFeed container, with a structural post-body marker. Do not use text.
    if (!node.matches('[role="listitem"]') || !node.closest(MAIN_FEED)) return false;
    return [...node.querySelectorAll('[data-testid="expandable-text-box"]')]
      .some(body => body.closest('[role="listitem"]') === node);
  }
  function topPost(node, root) {
    if (!node || node.nodeType !== 1 || !root?.contains(node)) return null;
    let candidate = node.closest(CANDIDATES), result = null;
    while (candidate && candidate !== root && root.contains(candidate)) {
      if (eligible(candidate, root)) result = candidate;
      candidate = candidate.parentElement?.closest(CANDIDATES);
    }
    return result;
  }
  function collect(scope, root) {
    const found = new Set();
    if (!scope || !root || scope.nodeType !== 1) return found;
    const enclosing = topPost(scope, root);
    if (enclosing) { found.add(enclosing); return found; }
    for (const candidate of scope.querySelectorAll(CANDIDATES)) {
      const card = topPost(candidate, root);
      if (card) found.add(card);
    }
    return found;
  }
  function usableRoot(root) {
    if (!root.isConnected || root.closest(HIDDEN)) return false;
    // Only performed on root selection, never for every card or every scroll.
    for (let node = root; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' ||
          style.contentVisibility === 'hidden') return false;
    }
    return true;
  }
  function findRoot(doc = document) {
    let best = null, score = -1;
    for (const root of doc.querySelectorAll(ROOTS)) {
      if (!usableRoot(root)) continue;
      // An explicit modern feed with cards outranks a page-wide main. A main
      // with cards outranks an empty modern loading placeholder.
      const hasPost = [...root.querySelectorAll(CANDIDATES)].some(node => eligible(node, root));
      const next = (hasPost ? 100 : 0) + (root.matches(MAIN_FEED) ? 10 : 0);
      if (next > score) { score = next; best = root; }
    }
    return best;
  }
  function kind(root) {
    return !root ? 'none' : root.matches(MAIN_FEED) ? 'mainFeed' :
      root.tagName === 'MAIN' ? 'main' : 'role-main';
  }
  function variant(post) {
    return post.matches(MODERN) ? 'component-key' : post.matches(LEGACY) ? 'legacy' : 'list-item';
  }
  function counts(doc = document) {
    // Fixed selector names and aggregate counts only; no attribute values,
    // arbitrary DOM samples, URL, title, HTML, text, browser UA or user IDs.
    const selectors = {
      mainFeed: MAIN_FEED, main: 'main', roleMain: '[role="main"]',
      occludable: '.occludable-update', sharedUpdate: '.feed-shared-update-v2',
      viewUpdate: '[data-view-name="feed-full-update"]',
      componentKeyCards: MODERN, listItems: `${MAIN_FEED} [role="listitem"]`,
      expandableTextBoxes: `${MAIN_FEED} [data-testid="expandable-text-box"]`,
      feedRoles: '[role="feed"]', articleRoles: '[role="article"]', frames: 'iframe',
    };
    return Object.fromEntries(Object.entries(selectors).map(([key, selector]) =>
      [key, Math.min(10000, doc.querySelectorAll(selector).length)]));
  }
  globalThis.LLGuardSelectors = Object.freeze({CANDIDATES, ROOTS, ATTRIBUTES,
    topPost, collect, findRoot, kind, variant, counts});
})();
