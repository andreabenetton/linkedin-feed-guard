/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * Long-feed memory advisory (ADR-0015): one extension-owned notice in an open
 * shadow root. It never reads the page, never touches post nodes and never reloads
 * on its own: only the user's click on "Reload feed" does.
 */
(() => {
  'use strict';
  // Kept here, not in i18n.js: i18n.js rewrites [data-i18n] nodes of the document
  // it runs in, which must never be LinkedIn's. Same keys in both languages (ADR-0012).
  const STRINGS = Object.freeze({
    en: Object.freeze({
      title: 'This feed is getting heavy',
      body: 'The page has accumulated {posts} posts{heap}. A long feed can make the tab crash ("Aw, Snap!"). Reloading frees the memory.',
      heap: ' and uses about {mb} MB of JavaScript memory',
      drafts: 'Save any draft or comment you are writing first.',
      reload: 'Reload feed',
      later: 'Later',
      label: 'LinkedIn Feed Guard notice',
    }),
    it: Object.freeze({
      title: 'Questo feed sta diventando pesante',
      body: 'La pagina ha accumulato {posts} post{heap}. Un feed lungo può far chiudere la scheda ("Aw, Snap!"). Ricaricare libera la memoria.',
      heap: ' e usa circa {mb} MB di memoria JavaScript',
      drafts: 'Salva prima eventuali bozze o commenti che stai scrivendo.',
      reload: 'Ricarica il feed',
      later: 'Più tardi',
      label: 'Avviso di LinkedIn Feed Guard',
    }),
  });
  const LANGUAGE_KEY = 'feedGuardLanguageV1';
  const HOST_ATTR = 'data-llg-v1-advisory';
  let preference = 'auto';
  let host = null, parts = null, last = null, handlers = null;

  function locale() {
    if (preference === 'en' || preference === 'it') return preference;
    let browser = 'en';
    try { browser = chrome.i18n?.getUILanguage?.() || navigator.language || 'en'; } catch { /* default */ }
    return /^it(?:[-_]|$)/i.test(browser) ? 'it' : 'en';
  }
  function t(key) { return STRINGS[locale()][key] ?? STRINGS.en[key]; }
  function text(state) {
    const heap = Number.isSafeInteger(state.heapMB) ? t('heap').replace('{mb}', String(state.heapMB)) : '';
    return t('body').replace('{posts}', String(state.posts)).replace('{heap}', heap);
  }
  const CSS = `
    :host { all: initial; }
    .box { position: fixed; z-index: 2147483000; right: 16px; bottom: 16px; max-width: 340px;
      box-sizing: border-box; padding: 14px 16px; border-radius: 10px; border: 1px solid #b45309;
      background: #fffbeb; color: #1f2937; font: 13px/1.45 system-ui, sans-serif;
      box-shadow: 0 6px 24px rgba(0,0,0,.18); }
    strong { display: block; font-size: 14px; margin-bottom: 4px; }
    p { margin: 0 0 6px; }
    .note { color: #92400e; }
    .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    button { font: inherit; padding: 6px 12px; border-radius: 6px; cursor: pointer;
      border: 1px solid #92400e; background: #fff; color: #1f2937; }
    button.primary { background: #b45309; border-color: #b45309; color: #fff; }
    button:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
    @media (prefers-color-scheme: dark) {
      .box { background: #292524; color: #f5f5f4; border-color: #f59e0b; }
      .note { color: #fcd34d; }
      button { background: #1c1917; color: #f5f5f4; border-color: #f59e0b; }
      button.primary { background: #d97706; border-color: #d97706; color: #111; }
    }`;
  function build() {
    host = document.createElement('div');
    host.setAttribute(HOST_ATTR, '');
    const root = host.attachShadow({mode: 'open'});
    // A constructed sheet is not an inline <style>, so the page's CSP does not apply.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    root.adoptedStyleSheets = [sheet];
    const box = document.createElement('section');
    box.className = 'box'; box.setAttribute('role', 'status');
    const title = document.createElement('strong');
    const body = document.createElement('p');
    const note = document.createElement('p'); note.className = 'note';
    const row = document.createElement('div'); row.className = 'row';
    const later = document.createElement('button'); later.type = 'button';
    const reload = document.createElement('button'); reload.type = 'button'; reload.className = 'primary';
    later.addEventListener('click', () => handlers?.later());
    reload.addEventListener('click', () => handlers?.reload());
    row.append(later, reload);
    box.append(title, body, note, row);
    root.append(box);
    parts = {box, title, body, note, later, reload};
  }
  function paint() {
    if (!parts || !last) return;
    parts.box.setAttribute('aria-label', t('label'));
    parts.title.textContent = t('title');
    parts.body.textContent = text(last);
    parts.note.textContent = t('drafts');
    parts.later.textContent = t('later');
    parts.reload.textContent = t('reload');
  }
  // state: {posts, heapMB|null}; on: {reload(), later()}.
  function show(state, on) {
    last = {posts: state.posts, heapMB: state.heapMB}; handlers = on;
    if (!host) build();
    paint();
    // Outside LinkedIn's application root: a sibling the site does not render.
    if (!host.isConnected) (document.body || document.documentElement).append(host);
  }
  function hide() {
    host?.remove();
    last = null; handlers = null;
  }
  function visible() { return Boolean(host?.isConnected); }
  // The language preference shared with the popup; read once and kept current.
  const valid = value => ['auto', 'en', 'it'].includes(value) ? value : 'auto';
  try {
    chrome.storage.local.get(LANGUAGE_KEY).then(saved => { preference = valid(saved?.[LANGUAGE_KEY]); paint(); }, () => {});
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && Object.hasOwn(changes, LANGUAGE_KEY)) { preference = valid(changes[LANGUAGE_KEY].newValue); paint(); }
    });
  } catch { /* No storage: browser language only. */ }
  globalThis.LLGuardAdvisory = Object.freeze({show, hide, visible, locale, STRINGS, HOST_ATTR});
})();
