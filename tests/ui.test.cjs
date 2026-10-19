/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors */
'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const EXT = path.resolve(__dirname, '../extension');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
function harness(language = 'en-US', preference) {
  const listeners = [], storage = {feedGuardLanguageV1: preference};
  const document = {documentElement: {lang: ''}, querySelectorAll: () => [], getElementById: () => null};
  let fail = false;
  const context = vm.createContext({document, navigator: {language}, chrome: {
    i18n: {getUILanguage: () => language},
    runtime: {getManifest: () => structuredClone(MANIFEST)},
    storage: {onChanged: {addListener: fn => listeners.push(fn)}, local: {
      async get(key) { return {[key]: storage[key]}; },
      async set(values) { if (fail) throw Error('write failure'); Object.assign(storage, values); }
    }}
  }});
  for (const file of ['config.js', 'i18n.js', 'diagnostics.js']) vm.runInContext(fs.readFileSync(path.join(EXT, file),'utf8'), context);
  return {context, storage, document, listeners, fail: () => { fail = true; }};
}
test('browser locale selects Italian region variants and falls back to English', async () => {
  for (const [input, expected] of [['it','it'],['it-CH','it'],['it_IT','it'],['en-GB','en'],['fr-FR','en']]) {
    const h=harness(input); await h.context.LLGuardI18n.init();
    assert.equal(h.document.documentElement.lang,expected);
  }
});
test('language override persists separately from optimization settings', async () => {
  const h=harness('it-IT'); const i=h.context.LLGuardI18n; await i.init(); await i.set('en');
  assert.equal(i.t('feed'),'Posts detected'); assert.equal(h.storage.feedGuardLanguageV1,'en');
  assert.equal(Object.hasOwn(h.storage,'feedGuardSettingsV1'),false);
});
test('invalid language preference is normalized, not executed or fetched', async () => {
  const h=harness('en-US','https://invalid.test/remote.js');await h.context.LLGuardI18n.init();
  assert.equal(h.context.LLGuardI18n.preference(),'auto');assert.equal(h.context.LLGuardI18n.locale(),'en');
});
test('storage events update an open UI, while unrelated settings events do not change language', async () => {
  const h=harness();const i=h.context.LLGuardI18n;await i.init();
  for(const cb of h.listeners)cb({feedGuardLanguageV1:{newValue:'it'}},'local');
  assert.equal(i.t('copy'),'Copia rapporto');
  for(const cb of h.listeners)cb({feedGuardSettingsV1:{newValue:{enabled:false}}},'local');
  assert.equal(i.locale(),'it');
});
test('a failed language write preserves the active preference', async () => {
  const h=harness('en-US','en');const i=h.context.LLGuardI18n;await i.init();h.fail();
  await assert.rejects(i.set('it'));assert.equal(i.locale(),'en');
});
test('every HTML translation and ARIA key exists in both languages', async () => {
  const keys=new Set();for(const file of ['popup.html','help.html']){
    for(const m of fs.readFileSync(path.join(EXT,file),'utf8').matchAll(/data-i18n(?:-aria)?="([^"]+)"/g))keys.add(m[1]);
  }
  for(const locale of ['en','it']){
    const h=harness(locale);const i=h.context.LLGuardI18n;await i.init();
    for(const key of keys)assert.notEqual(i.t(key),key,`${locale}: ${key}`);
    for(const key of ['noPage','zeroHint','copyManual','ruleMismatch','workerUnavailable','settings-operation-failed'])assert.notEqual(i.t(key),key);
  }
});
test('manifest locale catalogs are complete and satisfy all message references', () => {
  const m=JSON.parse(fs.readFileSync(path.join(EXT,'manifest.json')));assert.equal(m.default_locale,'en');
  const messages=[...JSON.stringify(m).matchAll(/__MSG_([^_]+)__/g)].map(x=>x[1]);
  for(const locale of ['en','it']){
    const catalog=JSON.parse(fs.readFileSync(path.join(EXT,'_locales',locale,'messages.json')));
    for(const key of messages)assert.ok(catalog[key]?.message);
  }
});
test('diagnostic export strips unknown fields, validates enums and clamps invalid numbers', () => {
  const h=harness();const clean=h.context.LLGuardDiagnostics.sanitize({
    url:'PRIVATE',html:'PRIVATE',version:'PRIVATE',scope:'PRIVATE',root:'PRIVATE',
    posts:NaN,deferred:-2,paused:20000,selectors:{mainFeed:1,private:'PRIVATE'},variants:{legacy:2,private:'PRIVATE'},errorCode:'PRIVATE'
  });
  assert.equal(clean.version,MANIFEST.version);assert.equal(clean.scope,'error');assert.equal(clean.root,'none');
  assert.equal(clean.posts,0);assert.equal(clean.deferred,0);assert.equal(clean.paused,10000);
  assert.equal(JSON.stringify(clean).includes('PRIVATE'),false);
  assert.equal(clean.errorCode,null);
});
test('the version comes from the manifest alone and fills the help strings', async () => {
  const h=harness('en-US');assert.equal(h.context.LLGuardConfig.VERSION,MANIFEST.version);
  for(const locale of ['en','it']){
    const i=harness(locale).context.LLGuardI18n;await i.init();
    assert.ok(i.t('helpIntro').includes(`LinkedIn Feed Guard ${MANIFEST.version} `),locale);
    assert.equal(i.t('helpIntro').includes('{version}'),false);
  }
  const bare=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(EXT,'config.js'),'utf8'),bare);
  assert.equal(bare.LLGuardConfig.VERSION,'0.0.0');
  for(const file of ['config.js','i18n.js','popup.html','help.html']){
    assert.equal(fs.readFileSync(path.join(EXT,file),'utf8').includes(MANIFEST.version),false,file);
  }
});
test('English and Italian translation catalogs have matching keys', () => {
  const source=fs.readFileSync(path.join(EXT,'i18n.js'),'utf8');
  const encoded=source.slice(source.indexOf('const STRINGS = ')+16,source.indexOf(';\nconst KEY'));
  const values=JSON.parse(encoded);assert.deepEqual(Object.keys(values.en).sort(),Object.keys(values.it).sort());
});
