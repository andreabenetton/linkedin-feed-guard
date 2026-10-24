/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * run: node --test tests/worker.test.cjs */
'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const EXT = path.resolve(__dirname, '../extension');
const KEY = 'feedGuardSettingsV1';
const RULE = 'optional_tracking';
function event() {
  const listeners = [];
  return {addListener: fn => listeners.push(fn), listeners, emit(...args) {for (const fn of listeners) fn(...args);}};
}
function harness(initial = {}) {
  const local = structuredClone(initial);
  const rules = new Set();
  const events = {changed: event(), message: event(), install: event(), startup: event()};
  const failures = {store: false, rule: false};
  const warnings = [];
  const chrome = {
    runtime: {id: 'fixture-id', getURL: file => `chrome-extension://fixture-id/${file}`,
      onMessage: events.message, onInstalled: events.install, onStartup: events.startup},
    storage: {onChanged: events.changed, local: {
      async get(key) {return {[key]:structuredClone(local[key])};},
      async set(values) {
        if (failures.store) {failures.store = false; throw new Error('storage failure');}
        const changes = {};
        for (const [key, value] of Object.entries(values)) {
          const oldValue = structuredClone(local[key]); local[key] = structuredClone(value);
          changes[key] = {oldValue, newValue:structuredClone(value)};
        }
        events.changed.emit(changes, 'local');
      }
    }},
    declarativeNetRequest: {
      async getEnabledRulesets() {return [...rules];},
      async updateEnabledRulesets({enableRulesetIds=[],disableRulesetIds=[]}) {
        if (failures.rule) {failures.rule = false; throw new Error('rule failure');}
        for (const rule of disableRulesetIds) rules.delete(rule);
        for (const rule of enableRulesetIds) rules.add(rule);
      }
    }
  };
  const context = vm.createContext({chrome, console:{error:(...v)=>warnings.push(v)}, structuredClone});
  context.importScripts = file => vm.runInContext(fs.readFileSync(path.join(EXT,file),'utf8'), context, {filename:file});
  vm.runInContext(fs.readFileSync(path.join(EXT,'background.js'),'utf8'), context, {filename:'background.js'});
  const sender = {id:'fixture-id',url:'chrome-extension://fixture-id/popup.html'};
  async function request(type,patch,identity=sender) {
    let handled = false;
    return new Promise((resolve,reject) => {
      const timer = setTimeout(()=>reject(new Error('message timeout')),1000);
      for (const listener of events.message.listeners) {
        handled = listener({channel:'feed-guard-ui',type,patch},identity,result=>{clearTimeout(timer);resolve(result);}) || handled;
      }
      if (!handled) {clearTimeout(timer);resolve(null);}
    });
  }
  return {context, local, rules, events, failures, warnings, request};
}
const plain = value => JSON.parse(JSON.stringify(value));
test('configuration is typed, whitelisted, copied and does not accept arbitrary fields', () => {
  const h = harness(); const c = h.context.LLGuardConfig;
  assert.equal(c.normalize({enabled:'false',blockTracking:true,evil:'x'}).enabled,true);
  assert.equal(c.normalize({enabled:false}).enabled,false);
  assert.equal(Object.hasOwn(c.normalize({evil:1}),'evil'),false);
  assert.throws(()=>c.validatePatch({unknown:true}));
  assert.throws(()=>c.validatePatch({enabled:1}));
  assert.throws(()=>c.validatePatch([]));
  assert.throws(()=>c.validatePatch(JSON.parse('{"__proto__":true}')));
  assert.equal(c.normalize().memoryAdvisory,true);
  assert.equal(c.normalize({memoryAdvisory:false}).memoryAdvisory,false);
  assert.equal(c.ADVISORY.posts>0&&c.ADVISORY.heapMB>0,true);
  const first = c.normalize(); first.enabled=false;
  assert.equal(c.normalize().enabled,true);
});
test('defaults keep the experimental network rule off', async () => {
  const h=harness(); const r=await h.request('get-settings');
  assert.equal(r.ok,true);assert.equal(r.settings.blockTracking,false);assert.equal(r.trackingRuleActive,false);
});
test('opt-in enables DNR; master disable removes it', async () => {
  const h=harness();
  const on=await h.request('set-settings',{blockTracking:true});assert.equal(on.trackingRuleActive,true);
  assert.equal(h.rules.has(RULE),true);
  const off=await h.request('set-settings',{enabled:false});assert.equal(off.trackingRuleActive,false);
  assert.equal(off.settings.blockTracking,true);
});
test('concurrent setting changes do not overwrite one another', async () => {
  const h=harness();
  await Promise.all([h.request('set-settings',{renderOffscreen:false}),h.request('set-settings',{pauseHiddenVideos:false}),h.request('set-settings',{blockTracking:true})]);
  const s=(await h.request('get-settings')).settings;
  assert.equal(s.renderOffscreen,false);assert.equal(s.pauseHiddenVideos,false);assert.equal(s.blockTracking,true);
});
test('invalid settings cannot reach persistent storage or DNR', async () => {
  const h=harness();const before=plain(h.local);
  assert.equal((await h.request('set-settings',{arbitraryUrl:'https://evil.test'})).ok,false);
  assert.deepEqual(h.local,before);assert.equal(h.rules.size,0);
});
test('messages from a page, content script or another extension are rejected', async () => {
  const h=harness();
  assert.equal(await h.request('set-settings',{blockTracking:true},{id:'fixture-id',tab:{id:1},url:'https://www.linkedin.com/feed/'}),null);
  assert.equal(await h.request('set-settings',{blockTracking:true},{id:'other',url:'chrome-extension://fixture-id/popup.html'}),null);
  assert.equal(await h.request('set-settings',{blockTracking:true},{id:'fixture-id',url:'https://www.linkedin.com/'}),null);
});
test('DNR failure does not silently persist a successful opt-in', async () => {
  const h=harness();h.failures.rule=true;
  const r=await h.request('set-settings',{blockTracking:true});assert.equal(r.ok,false);
  const after=await h.request('get-settings');assert.equal(after.settings.blockTracking,false);assert.equal(after.trackingRuleActive,false);
});
test('storage failure rolls back previously changed browser rules', async () => {
  const h=harness();h.failures.store=true;
  const r=await h.request('set-settings',{blockTracking:true});assert.equal(r.ok,false);assert.equal(h.rules.size,0);
});
test('a 0.3.0 settings object gains the new advisory default without losing values', async () => {
  const h=harness({[KEY]:{enabled:true,renderOffscreen:false,pauseOffscreenVideos:true,pauseHiddenVideos:false,blockTracking:false}});
  h.events.install.emit({reason:'update'});
  const s=(await h.request('get-settings')).settings;
  assert.equal(s.renderOffscreen,false);assert.equal(s.pauseHiddenVideos,false);assert.equal(s.memoryAdvisory,true);
});
test('update migration preserves user settings instead of resetting defaults', async () => {
  const h=harness({[KEY]:{enabled:false,pauseOffscreenVideos:false,blockTracking:true}});
  h.events.install.emit({reason:'update'});
  const r=await h.request('get-settings');
  assert.equal(r.settings.enabled,false);assert.equal(r.settings.pauseOffscreenVideos,false);assert.equal(r.settings.blockTracking,true);assert.equal(r.trackingRuleActive,false);
});
test('startup reconciles persisted settings with packaged defaults', async () => {
  const h=harness({[KEY]:{enabled:true,blockTracking:true}});
  h.events.startup.emit();assert.equal((await h.request('get-settings')).trackingRuleActive,true);
});
test('local storage changes are reconciled by the worker', async () => {
  const h=harness();h.local[KEY]={enabled:true,blockTracking:true};
  h.events.changed.emit({[KEY]:{newValue:h.local[KEY]}},'local');
  assert.equal((await h.request('get-settings')).trackingRuleActive,true);
});
test('rule pattern is anchored; does not match app, auth, publish or messages endpoints', () => {
  const [rule]=JSON.parse(fs.readFileSync(path.join(EXT,'rules/tracking.json')));
  const regex=new RegExp(rule.condition.regexFilter);
  for (const url of ['https://www.linkedin.com/li/track','https://www.linkedin.com/li/track?x=1','https://www.linkedin.com/li/track/subpath']) assert.equal(regex.test(url),true,url);
  for (const url of ['https://www.linkedin.com/li/tracker','https://evil.test/?x=https://www.linkedin.com/li/track','https://www.linkedin.com.evil.test/li/track','https://www.linkedin.com/voyager/api/contentcreation/normShares','https://www.linkedin.com/voyager/api/messaging','https://www.linkedin.com/checkpoint/lg/login-submit','https://px.ads.linkedin.com/collect','http://www.linkedin.com/li/track']) assert.equal(regex.test(url),false,url);
  assert.deepEqual(rule.condition.resourceTypes,['xmlhttprequest','ping','image']);
  assert.deepEqual(rule.condition.initiatorDomains,['www.linkedin.com']);
  assert.equal(rule.action.type,'block');
});
test('manifest is narrow, package references exist, and remote/update hooks are absent', () => {
  const m=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json')));
  assert.deepEqual(m.permissions,['storage','declarativeNetRequestWithHostAccess']);
  assert.deepEqual(m.host_permissions,['https://www.linkedin.com/*']);
  assert.equal(m.manifest_version,3);assert.equal(m.content_scripts[0].world,'ISOLATED');
  assert.equal(m.declarative_net_request.rule_resources[0].enabled,false);
  assert.equal(Object.hasOwn(m,'update_url'),false);assert.equal(Object.hasOwn(m,'externally_connectable'),false);
  assert.match(m.content_security_policy.extension_pages,/connect-src 'none'/);
  for (const file of [m.background.service_worker,m.action.default_popup,...m.content_scripts[0].js,...m.content_scripts[0].css,...m.declarative_net_request.rule_resources.map(r=>r.path)]) assert.equal(fs.existsSync(path.join(EXT,file)),true,file);
});
