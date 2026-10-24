/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * No network calls, content collection, remote code, periodic timers, or Sync.
 * The service worker reconciles one packaged, opt-in DNR ruleset.
 */
'use strict';
importScripts('config.js');
const Config = globalThis.LLGuardConfig;
let queue = Promise.resolve();
function serial(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}
async function readSettings() {
  const data = await chrome.storage.local.get(Config.STORAGE_KEY);
  return Config.normalize(data[Config.STORAGE_KEY]);
}
async function applyRules(settings) {
  const active = await chrome.declarativeNetRequest.getEnabledRulesets();
  const want = settings.enabled && settings.blockTracking;
  if (active.includes(Config.RULESET) !== want) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: want ? [Config.RULESET] : [],
      disableRulesetIds: want ? [] : [Config.RULESET],
    });
  }
}
async function state(settings) {
  const active = await chrome.declarativeNetRequest.getEnabledRulesets();
  return {ok: true, settings, trackingRuleActive: active.includes(Config.RULESET)};
}
async function reconcile() {
  const settings = await readSettings();
  await applyRules(settings);
  return state(settings);
}
async function writeSettings(patch) {
  Config.validatePatch(patch);
  const previous = await readSettings();
  const next = Config.normalize({...previous, ...patch});
  // Apply browser policy before persisting. Roll back if persistence fails.
  await applyRules(next);
  try {
    await chrome.storage.local.set({[Config.STORAGE_KEY]: next});
  } catch (error) {
    try { await applyRules(previous); }
    catch { throw new Error('filter-rollback-failed'); }
    throw error;
  }
  return state(next);
}
function trustedUI(sender) {
  // This channel answers the extension's own pages only. It is not the only way
  // in: chrome.storage.local is writable from every extension context, the content
  // script included, which is why storage.onChanged below reconciles the ruleset
  // after any settings change, and why every reader normalizes what it reads.
  return sender.id === chrome.runtime.id && !sender.tab &&
    typeof sender.url === 'string' &&
    sender.url.startsWith(chrome.runtime.getURL(''));
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!trustedUI(sender) || !message || message.channel !== 'feed-guard-ui') return false;
  if (!['get-settings', 'set-settings'].includes(message.type)) return false;
  serial(() => message.type === 'set-settings'
    ? writeSettings(message.patch) : reconcile())
    .then(respond, error => respond({ok: false, error: ['invalid-settings', 'invalid-option', 'filter-rollback-failed'].includes(error?.message) ? error.message : 'settings-operation-failed'}));
  return true;
});
// Toolbar badge (ADR-0016): the post count of the feed in that tab, in the colours
// of the browser's usual badge (white on #666), or "!" when the feed is heavy.
const BADGE = Object.freeze({background: '#666666', text: '#ffffff', max: 999});
function badgeText(posts, pressure) {
  if (pressure) return '!';
  if (!posts) return '';
  return posts > BADGE.max ? `${BADGE.max}+` : String(posts);
}
chrome.runtime.onMessage.addListener((message, sender) => {
  // Only our own content script, in a tab's top frame; two typed fields, nothing else.
  if (!message || message.channel !== 'feed-guard-badge' || sender.id !== chrome.runtime.id ||
      !Number.isInteger(sender.tab?.id) || sender.frameId !== 0) return false;
  const posts = Number.isSafeInteger(message.posts) && message.posts > 0 ? message.posts : 0;
  const tabId = sender.tab.id;
  const text = badgeText(posts, message.pressure === true);
  // Per-tab state: the browser drops it when the tab navigates or closes.
  Promise.all([
    chrome.action.setBadgeBackgroundColor({tabId, color: BADGE.background}),
    chrome.action.setBadgeTextColor ? chrome.action.setBadgeTextColor({tabId, color: BADGE.text}) : null,
    chrome.action.setBadgeText({tabId, text}),
  ]).catch(() => { /* The tab closed meanwhile. */ });
  return false;
});
chrome.runtime.onInstalled.addListener(() => {
  // Normalize/migrate without overwriting existing preferences on updates.
  serial(async () => {
    const settings = await readSettings();
    await chrome.storage.local.set({[Config.STORAGE_KEY]: settings});
    return reconcile();
  }).catch(error => console.error('Feed Guard: initialization failed.', error));
});
chrome.runtime.onStartup.addListener(() => {
  serial(reconcile).catch(error => console.error('Feed Guard: startup failed.', error));
});
// Any writer, not just writeSettings: the rule follows whatever is stored.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, Config.STORAGE_KEY)) {
    serial(reconcile).catch(error => console.error('Feed Guard: rule update failed.', error));
  }
});
