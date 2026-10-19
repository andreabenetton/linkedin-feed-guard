/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * No page text, input values, URL logs, network payloads, or user IDs are read.
 * DOM membership and media state are inspected locally; diagnostics are counts.
 */
(() => {
  'use strict';
  const Config = globalThis.LLGuardConfig;
  const Selectors = globalThis.LLGuardSelectors;
  const SENSITIVE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="menu"], [aria-expanded="true"]';
  const POST_ATTR = 'data-llg-v1-post';
  const DEFER_ATTR = 'data-llg-v1-defer';
  const SIZE_PROP = '--llg-v1-block-size';
  const posts = new Map();
  const videos = new Map();
  const addedRoots = new Set();
  const dirtyPosts = new Set();
  const supported = typeof IntersectionObserver === 'function' &&
    CSS.supports('content-visibility', 'auto') &&
    CSS.supports('contain-intrinsic-block-size', 'auto 600px');
  let settings = {...Config.DEFAULTS, enabled: false};
  let main = null;
  let timer = null;
  let needsScan = false;
  let needsPrune = false;
  let pageSuspended = false;
  let observing = false;
  let failed = false;
  let version = 0;
  let pausedCount = 0;
  let rootDirty = true;

  function inFeed() {
    return location.protocol === 'https:' && location.hostname === 'www.linkedin.com' &&
      /^\/feed\/?$/.test(location.pathname);
  }
  function active() { return settings.enabled && inFeed() && !pageSuspended && !failed; }
  function element(node) { return node && node.nodeType === Node.ELEMENT_NODE; }
  function findMain() { return Selectors.findRoot(); }
  function protectedVideo(video) {
    const full = document.fullscreenElement;
    return document.pictureInPictureElement === video ||
      (full && (full === video || full.contains(video)));
  }
  function topPost(node) { return Selectors.topPost(node, main); }
  function clearDeferred(post) {
    const meta = posts.get(post);
    post.removeAttribute(DEFER_ATTR);
    if (meta && meta.ownSize !== null && post.style.getPropertyValue(SIZE_PROP) === meta.ownSize) {
      if (meta.originalSize) post.style.setProperty(SIZE_PROP, meta.originalSize, meta.originalPriority);
      else post.style.removeProperty(SIZE_PROP);
    }
    if (meta) meta.ownSize = null;
  }
  function updatePost(post) {
    const meta = posts.get(post);
    if (!meta) return;
    const focused = post.contains(document.activeElement);
    // Do not apply containment to editors, open menus, dialogs, or playing media.
    const protectedMedia = [...post.querySelectorAll('video')].some(video =>
      protectedVideo(video) || (!video.paused && !video.ended));
    const safe = active() && settings.renderOffscreen && supported && !meta.near &&
      meta.height > 0 && !focused && !meta.sensitive && !protectedMedia &&
      !post.matches(':hover') && post.isConnected;
    if (!safe) { clearDeferred(post); return; }
    if (!post.hasAttribute(DEFER_ATTR)) {
      // IO reports the BORDER box; contain-intrinsic-block-size substitutes
      // the CONTENT box. Subtract padding/borders to avoid cumulative scroll
      // height inflation after resize or toggling rendering back on.
      const computed = getComputedStyle(post);
      if (computed.writingMode !== 'horizontal-tb') { clearDeferred(post); return; }
      const insets = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
        .reduce((sum, key) => sum + (Number.parseFloat(computed[key]) || 0), 0);
      meta.originalSize = post.style.getPropertyValue(SIZE_PROP);
      meta.originalPriority = post.style.getPropertyPriority(SIZE_PROP);
      meta.ownSize = `${Math.max(1, meta.height - insets)}px`;
      post.style.setProperty(SIZE_PROP, meta.ownSize);
      post.setAttribute(DEFER_ATTR, '');
    }
  }
  function refreshPost(post) {
    const meta = posts.get(post);
    if (!meta) return;
    meta.sensitive = post.matches(SENSITIVE_SELECTOR) || Boolean(post.querySelector(SENSITIVE_SELECTOR));
    updatePost(post);
  }
  const postObserver = supported ? new IntersectionObserver(entries => {
    if (orphaned()) return;
    for (const entry of entries) {
      const meta = posts.get(entry.target);
      if (!meta) continue;
      meta.near = entry.isIntersecting;
      // Bounds come from the browser's observer batch, not synchronous layout reads.
      if (!entry.target.hasAttribute(DEFER_ATTR) && entry.boundingClientRect.height > 0) {
        meta.height = entry.boundingClientRect.height;
      }
      updatePost(entry.target);
    }
  }, {rootMargin: '1200px 0px', threshold: 0}) : null;

  function offscreen(video) {
    const box = video.getBoundingClientRect();
    return box.width <= 0 || box.height <= 0 || box.bottom < -150 ||
      box.top > innerHeight + 150 || box.right < 0 || box.left > innerWidth;
  }
  function maybePause(video, knownNear = null) {
    if (!active() || !main?.contains(video) || !topPost(video) || video.paused || video.ended || protectedVideo(video)) return;
    const hidden = settings.pauseHiddenVideos && document.hidden;
    const away = settings.pauseOffscreenVideos && (knownNear === null ? offscreen(video) : !knownNear);
    if (hidden || away) {
      video.pause();
      if (video.paused) pausedCount++;
      // Never autoplay/resume on return: only the user/site may start playback.
    }
  }
  const videoObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      if (orphaned()) return;
      for (const entry of entries) {
        const meta = videos.get(entry.target);
        if (meta) { meta.near = entry.isIntersecting; maybePause(entry.target, meta.near); }
      }
    }, {rootMargin: '150px 0px', threshold: 0}) : null;

  function trackVideo(video) {
    if (!videos.has(video)) {
      videos.set(video, {near: null});
      videoObserver?.observe(video);
    }
    maybePause(video);
  }
  function trackPost(post) {
    if (!posts.has(post)) {
      posts.set(post, {near: true, height: 0, sensitive: false, ownSize: null,
        originalSize: '', originalPriority: ''});
      post.setAttribute(POST_ATTR, '');
      postObserver?.observe(post);
    }
    refreshPost(post);
    for (const video of post.querySelectorAll('video')) trackVideo(video);
  }
  function discover(root) {
    if (!main || !element(root)) return;
    if (!(main === root || main.contains(root) || root.contains(main))) return;
    const scope = root.contains(main) ? main : root;
    for (const post of Selectors.collect(scope, main)) trackPost(post);
  }
  function forgetPost(post) {
    clearDeferred(post);
    post.removeAttribute(POST_ATTR);
    postObserver?.unobserve(post);
    posts.delete(post);
    dirtyPosts.delete(post);
  }
  function prune() {
    for (const post of posts.keys()) {
      if (!post.isConnected || !main?.contains(post) || topPost(post) !== post) forgetPost(post);
    }
    for (const video of videos.keys()) {
      if (!video.isConnected || !main?.contains(video) || !topPost(video)) {
        videoObserver?.unobserve(video);
        videos.delete(video);
      }
    }
  }
  function clearWork() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    addedRoots.clear(); dirtyPosts.clear();
    needsScan = false; needsPrune = false;
  }
  function clearManaged() {
    clearWork();
    postObserver?.disconnect(); videoObserver?.disconnect();
    for (const post of [...posts.keys()]) forgetPost(post);
    videos.clear(); main = null;
  }
  function stop() {
    failed = true;
    clearManaged();
    domObserver.disconnect(); observing = false;
  }
  function failOpen() {
    stop();
    // Constant diagnostic only. No content/URL is copied into error messages.
    console.warn('LinkedIn Feed Guard: local optimization stopped after an error. Reload the page.');
  }
  // Disabling, removing or reloading the extension leaves this script running in
  // open pages with an invalidated context: chrome.runtime.id becomes undefined and
  // storage.onChanged never fires again, so the master switch can no longer reach
  // it. Every entry point checks for that and tears down as failOpen does, silently
  // (nothing went wrong in the page). A port to the worker would not do: MV3
  // terminates an idle worker, which disconnects ports from a healthy extension too.
  function orphaned() {
    let id;
    try { id = chrome.runtime?.id; } catch { id = undefined; }
    if (id) return false;
    if (!failed) stop();
    return true;
  }
  function flush() {
    timer = null;
    if (orphaned()) return;
    try {
      if (!active()) { clearManaged(); return; }
      if (document.hidden) {
        // Hidden-page work is limited to releasing detached references. Do not
        // scan for new cards, read layout, or retain old detached feed trees.
        if (needsPrune) prune();
        addedRoots.clear(); dirtyPosts.clear(); needsPrune = false; needsScan = true; return;
      }
      const next = rootDirty || !main?.isConnected ? findMain() : main;
      rootDirty = false;
      if (next !== main) {
        clearManaged(); main = next; needsScan = true;
      }
      if (!main) { addedRoots.clear(); dirtyPosts.clear(); return; }
      if (needsPrune || needsScan) prune();
      if (needsScan) discover(main);
      else for (const root of addedRoots) { if (root.isConnected) discover(root); }
      for (const post of dirtyPosts) { if (post.isConnected) refreshPost(post); }
      addedRoots.clear(); dirtyPosts.clear(); needsScan = false; needsPrune = false;
    } catch { failOpen(); }
  }
  function schedule() {
    if (timer === null && !pageSuspended && !failed) timer = setTimeout(flush, 120);
  }
  function syncRoute() {
    if (!active()) { if (main || posts.size) clearManaged(); return; }
    rootDirty = true; needsScan = true; schedule();
  }
  const domObserver = new MutationObserver(records => {
    if (orphaned()) return;
    if (!active()) { syncRoute(); return; }
    if (document.hidden) {
      needsScan = true;
      if (records.some(record => record.removedNodes.length)) { needsPrune = true; schedule(); }
      return;
    }
    // Coalesce structural changes. Attribute hydration can add a post marker
    // without inserting a new node, so observe known identity attributes too.
    for (const record of records) {
      const post = topPost(record.target);
      if (post) dirtyPosts.add(post);
      if (record.removedNodes.length) needsPrune = true;
      const identity = record.type === 'attributes' && Selectors.ATTRIBUTES.includes(record.attributeName);
      if (identity) {
        const target = record.target;
        const relevant = target.matches(Selectors.ROOTS + ', ' + Selectors.CANDIDATES) ||
          target === main || target.contains(main) || posts.has(target) ||
          (main && main.contains(target) && record.attributeName !== 'class');
        if (relevant) { rootDirty = true; needsScan = true; needsPrune = true; }
      }
      for (const node of record.addedNodes) {
        if (!element(node)) continue;
        if (!main || main.contains(node) || node.contains(main)) addedRoots.add(node);
        // A new mainFeed may arrive outside the initially selected empty main.
        if (node.matches(Selectors.ROOTS) || node.querySelector(Selectors.ROOTS) ||
            (posts.size === 0 && (node.matches(Selectors.CANDIDATES) || node.querySelector(Selectors.CANDIDATES)))) {
          rootDirty = true; needsScan = true;
        }
      }
      if (addedRoots.size > 200 || dirtyPosts.size > 200) {
        addedRoots.clear(); dirtyPosts.clear(); needsScan = true;
        break;
      }
    }
    if (!main?.isConnected) { rootDirty = true; needsScan = true; }
    if (needsScan || needsPrune || addedRoots.size || dirtyPosts.size) schedule();
  });

  function configure(value) {
    settings = Config.normalize(value);
    if (!settings.enabled) {
      domObserver.disconnect(); observing = false; clearManaged(); return;
    }
    if (!observing && !pageSuspended && !failed) {
      domObserver.observe(document.documentElement, {childList: true, subtree: true, attributes: true,
        attributeFilter: [...Selectors.ATTRIBUTES, 'contenteditable', 'aria-expanded']}); observing = true;
    }
    if (active()) {
      for (const post of posts.keys()) updatePost(post);
      for (const [video, meta] of videos) maybePause(video, meta.near);
      rootDirty = true; needsScan = true; schedule();
    } else clearManaged();
  }
  async function reloadSettings() {
    const ticket = version;
    try {
      const data = await chrome.storage.local.get(Config.STORAGE_KEY);
      if (version === ticket) configure(data[Config.STORAGE_KEY]);
    } catch { failOpen(); }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes, Config.STORAGE_KEY)) {
      version++; configure(changes[Config.STORAGE_KEY].newValue);
    }
  });
  function status() {
    const variants = {legacy: 0, 'component-key': 0, 'list-item': 0};
    for (const post of posts.keys()) variants[Selectors.variant(post)]++;
    return {ok: true, version: Config.VERSION, scope: failed ? 'error' : !settings.enabled ? 'disabled' :
      !inFeed() ? 'outside-feed' : !main ? 'waiting' : posts.size ? 'feed' : 'unrecognized',
      supported, posts: posts.size,
      deferred: [...posts.keys()].filter(post => post.hasAttribute(DEFER_ATTR)).length,
      videos: videos.size, paused: pausedCount, root: Selectors.kind(main), variants};
  }
  function rescan() {
    if (active() && !document.hidden) {
      if (timer !== null) clearTimeout(timer);
      timer = null; rootDirty = true; needsScan = true; needsPrune = true; flush();
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.channel !== 'feed-guard-page' ||
        !['status', 'rescan', 'diagnostics'].includes(message.type)) return false;
    try {
      if (message.type !== 'status') rescan();
      const current = status();
      if (message.type !== 'diagnostics') { respond(current); return false; }
      respond({ok: true, diagnostics: {
        schema: 1, version: Config.VERSION,
        pageCategory: inFeed() ? 'main-feed' : 'other',
        scope: current.scope, visibility: document.hidden ? 'hidden' : 'visible',
        enabled: settings.enabled, renderSupported: supported,
        root: current.root, posts: current.posts, deferred: current.deferred,
        videos: current.videos, paused: current.paused, variants: current.variants,
        selectors: inFeed() ? Selectors.counts() : {},
        errorCode: failed ? 'local-optimization-stopped' : null,
      }});
    } catch { failOpen(); respond({ok: false, error: 'page-diagnostics-failed'}); }
    return false;
  });
  document.addEventListener('play', event => {
    if (orphaned() || !active() || !(event.target instanceof HTMLVideoElement)) return;
    try {
      if (!main) main = findMain();
      const post = topPost(event.target);
      if (post) { trackPost(post); maybePause(event.target); updatePost(post); }
    } catch { failOpen(); }
  }, true);
  document.addEventListener('pause', event => {
    if (orphaned()) return;
    const post = topPost(event.target);
    if (post) updatePost(post);
  }, true);
  document.addEventListener('focusin', event => {
    if (orphaned()) return;
    const post = topPost(event.target);
    if (post) clearDeferred(post);
  }, true);
  document.addEventListener('focusout', event => {
    if (orphaned()) return;
    const post = topPost(event.target);
    if (post) { dirtyPosts.add(post); schedule(); }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (orphaned() || !active()) return;
    if (document.hidden) {
      for (const [video, meta] of videos) maybePause(video, meta.near);
      clearWork(); needsScan = true; needsPrune = true;
    } else { rootDirty = true; needsScan = true; needsPrune = true; schedule(); }
  });
  for (const name of ['enterpictureinpicture', 'leavepictureinpicture', 'fullscreenchange']) {
    document.addEventListener(name, () => {
      if (orphaned() || !active()) return;
      for (const post of posts.keys()) updatePost(post);
      for (const [video, meta] of videos) maybePause(video, meta.near);
    }, true);
  }
  window.addEventListener('resize', () => {
    if (orphaned() || !active()) return;
    // Cached heights may become stale after responsive reflow. Remeasure via IO.
    for (const post of posts.keys()) {
      clearDeferred(post);
      const meta = posts.get(post); meta.near = true;
      postObserver?.unobserve(post); postObserver?.observe(post);
    }
  }, {passive: true});
  function routeChanged() { if (!orphaned()) syncRoute(); }
  window.addEventListener('popstate', routeChanged);
  window.addEventListener('hashchange', routeChanged);
  if (window.navigation) window.navigation.addEventListener('currententrychange', routeChanged);
  window.addEventListener('pagehide', () => {
    pageSuspended = true; domObserver.disconnect(); observing = false; clearManaged();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && !orphaned()) { pageSuspended = false; void reloadSettings(); }
  });
  void reloadSettings();
})();
