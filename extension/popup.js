/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors */
(() => {
  'use strict';
  const Config = globalThis.LLGuardConfig;
  const I18n = globalThis.LLGuardI18n;
  const byId = id => document.getElementById(id);
  const controls = Config.KEYS.map(byId);
  let busy = false;
  let lastSettings = Config.normalize();
  let lastState = null, lastStatus = null, errorKey = null, copyKey = null;
  function error(key) { errorKey = key || null; renderError(); }
  function renderError() {
    byId('error').textContent = errorKey ? I18n.t(errorKey) : '';
    byId('error').hidden = !errorKey;
  }
  function lock(value) {
    busy = value;
    for (const control of [...controls, byId('refresh'), byId('diagnostics')]) control.disabled = value;
  }
  async function timeout(promise) {
    let timer;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('workerUnavailable')), 3000);
      })]);
    } finally { clearTimeout(timer); }
  }
  async function call(message) {
    let response;
    try { response = await timeout(chrome.runtime.sendMessage({channel: 'feed-guard-ui', ...message})); }
    catch { throw new Error('workerUnavailable'); }
    if (!response?.ok) {
      const known = ['filter-rollback-failed', 'settings-operation-failed', 'invalid-settings', 'invalid-option'];
      throw new Error(known.includes(response?.error) ? response.error : 'workerUnavailable');
    }
    return response;
  }
  function renderConfig(state) {
    lastState = state; lastSettings = Config.normalize(state.settings);
    for (const control of controls) control.checked = lastSettings[control.id];
    const intended = lastSettings.enabled && lastSettings.blockTracking;
    if (intended !== state.trackingRuleActive) error('ruleMismatch');
    render();
  }
  function render() {
    renderError();
    byId('rule-state').textContent = lastState ? I18n.t(lastState.trackingRuleActive ? 'ruleOn' : 'ruleOff') : '';
    const status = lastStatus;
    if (!status) {
      byId('scope').textContent = I18n.t('noPage');
      for (const key of ['posts', 'deferred', 'paused']) byId(key).textContent = '\u2014';
      byId('hint').textContent = I18n.t('noPageHint');
    } else {
      const scopes = ['feed', 'unrecognized', 'waiting', 'outside-feed', 'disabled', 'error', 'stale'];
      byId('scope').textContent = I18n.t(scopes.includes(status.scope) ? status.scope : 'unknown');
      for (const key of ['posts', 'deferred', 'paused']) {
        byId(key).textContent = Number.isSafeInteger(status[key]) && status[key] >= 0 ? String(status[key]) : '\u2014';
      }
      const hint = status.scope === 'stale' ? 'staleHint' : status.scope === 'error' ? 'errorHint' :
        (status.scope === 'unrecognized' || status.scope === 'waiting') ? 'zeroHint' :
        !status.supported ? 'unsupportedHint' : 'normalHint';
      byId('hint').textContent = I18n.t(hint);
    }
    byId('copy-status').textContent = copyKey ? I18n.t(copyKey) : '';
  }
  async function pageCall(type) {
    const [tab] = await timeout(chrome.tabs.query({active: true, currentWindow: true}));
    if (!Number.isInteger(tab?.id)) throw new Error('no-tab');
    // Top frame only: the extension intentionally does not operate in iframes.
    const response = await timeout(chrome.tabs.sendMessage(tab.id,
      {channel: 'feed-guard-page', type}, {frameId: 0}));
    if (!response?.ok) throw new Error('no-response');
    return response;
  }
  async function pageStatus(rescan = false) {
    try {
      if (rescan) {
        await pageCall('rescan');
        await new Promise(resolve => setTimeout(resolve, 160));
      }
      lastStatus = await pageCall('status');
      if (lastStatus.version !== Config.VERSION) lastStatus = {...lastStatus, scope: 'stale'};
      else if (lastStatus.scope === 'feed' && lastStatus.posts === 0) lastStatus = {...lastStatus, scope: 'unrecognized'};
    } catch { lastStatus = null; }
    render();
  }
  async function refresh(rescan = true) {
    if (busy) return;
    lock(true); error(null);
    try { renderConfig(await call({type: 'get-settings'})); await pageStatus(rescan); }
    catch (e) { error(e.message); }
    finally { lock(false); }
  }
  for (const control of controls) {
    control.addEventListener('change', async () => {
      if (busy) return;
      lock(true); error(null);
      try {
        renderConfig(await call({type: 'set-settings', patch: {[control.id]: control.checked}}));
        await new Promise(resolve => setTimeout(resolve, 180));
        await pageStatus();
      } catch (e) {
        error(e.message);
        for (const item of controls) item.checked = lastSettings[item.id];
        try { renderConfig(await call({type: 'get-settings'})); } catch { /* Keep the original error. */ }
      } finally { lock(false); }
    });
  }
  byId('language').addEventListener('change', async event => {
    const select = event.target; select.disabled = true;
    try { await I18n.set(select.value); }
    catch { select.value = I18n.preference(); error('languageError'); }
    finally { select.disabled = false; }
  });
  byId('diagnostics').addEventListener('click', async () => {
    if (busy) return;
    lock(true); error(null); copyKey = null;
    try {
      const response = await pageCall('diagnostics');
      const report = globalThis.LLGuardDiagnostics.sanitize(response.diagnostics);
      byId('report').value = JSON.stringify(report, null, 2);
      byId('diagnostic-panel').hidden = false;
      await pageStatus();
      byId('diagnostic-panel').scrollIntoView({block: 'nearest'});
    } catch { error('diagnosticsError'); }
    finally { lock(false); }
  });
  byId('copy').addEventListener('click', async () => {
    const report = byId('report');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no-clipboard');
      await navigator.clipboard.writeText(report.value);
      copyKey = 'copied';
    } catch {
      // Do not override clipboard policy or add a permission. Manual fallback.
      report.focus(); report.select(); copyKey = 'copyManual';
    }
    render();
  });
  byId('close-diagnostics').addEventListener('click', () => {
    byId('diagnostic-panel').hidden = true; byId('report').value = ''; copyKey = null;
    byId('diagnostics').focus();
  });
  byId('settings').addEventListener('submit', event => event.preventDefault());
  byId('refresh').addEventListener('click', () => void refresh());
  byId('help').addEventListener('click', () => {
    chrome.tabs.create({url: chrome.runtime.getURL('help.html')}).catch(() => error('helpError'));
  });
  I18n.subscribe(render); I18n.render();
  void (async () => {
    let languageFailed = false;
    try { await I18n.init(); } catch { languageFailed = true; }
    await refresh();
    if (languageFailed) error('languageError');
  })();
})();
