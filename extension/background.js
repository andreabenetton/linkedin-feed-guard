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
  // A content script cannot change the configuration through this channel.
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
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, Config.STORAGE_KEY)) {
    serial(reconcile).catch(error => console.error('Feed Guard: rule update failed.', error));
  }
});
