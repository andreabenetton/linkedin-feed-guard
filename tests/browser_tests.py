#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
"""Local Chromium/DOM tests. Does NOT install an extension or contact LinkedIn.
Chrome storage/runtime APIs, page URL/navigation, visibility and PiP/fullscreen state are simulated.
Layout, DOM, media playback and IntersectionObserver use the actual browser.
"""
from __future__ import annotations
import base64
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
KEY = 'feedGuardSettingsV1'
VERSION = json.loads((EXT / 'manifest.json').read_text())['version']
EXTENSION_HASH_METHOD = ("sha256 of a sha256sum listing of every file under extension/, paths relative "
    "to it and sorted bytewise; from the repository root: cd extension && find . -type f -printf '%P\\n' "
    "| LC_ALL=C sort | xargs sha256sum | sha256sum")

def extension_sha256():
    """Ties browser-results.json to the exact extension/ tree these tests loaded."""
    paths = sorted(path.relative_to(EXT).as_posix() for path in EXT.rglob('*') if path.is_file())
    listing = ''.join(f'{hashlib.sha256((EXT / rel).read_bytes()).hexdigest()}  {rel}\n' for rel in paths)
    return hashlib.sha256(listing.encode()).hexdigest()

# Hashed before any test runs: the tree the tests read, not one edited meanwhile.
EXTENSION_SHA256 = extension_sha256()
SOURCE = '\n'.join((EXT / name).read_text() for name in ['config.js', 'selectors.js', 'advisory.js', 'content.js'])
MEDIA = 'data:video/webm;base64,' + base64.b64encode((ROOT / 'tests/silent.webm').read_bytes()).decode()
ROOTS_SELECTOR = '[data-testid="mainFeed"], main, [role="main"]'  # selectors.js ROOTS
CSS = '''body{margin:0;background:white}main{width:600px;margin:0 20px}.occludable-update{box-sizing:border-box;min-height:200px;margin:12px 0;padding:15px;border:1px solid #aaa}video{width:160px;height:90px}textarea{width:250px;height:48px}.spacer{height:1500px}'''

PIXEL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
def cards(count=40, start=0, video=None, drafts=False, images=False):
    output=[]
    for i in range(start,start+count):
        extra=''
        if images:
            extra += f'<img id="img-{i}" src="{PIXEL}#{i}" srcset="{PIXEL}#{i}x 1x" width="40" height="40" alt="">'
            extra += f'<picture><source id="src-{i}" srcset="{PIXEL}#{i}p"><img id="pic-{i}" src="{PIXEL}#{i}q" width="40" height="40" alt=""></picture>'
        if i == video:
            extra += f'<video id="sample-video" src="{MEDIA}" muted loop controls playsinline preload="metadata"></video>'
        if drafts and i in (0,15):
            extra += f'<textarea id="draft-{i}">UNSAVED {i}</textarea>'
        if drafts and i == 16:
            extra += '<div contenteditable="true" id="rich-draft">DRAFT EDITOR</div>'
        output.append(f'<div class="occludable-update" id="post-{i}"><div class="feed-shared-update-v2"><h2>Fixture post {i}</h2><p>I was Promoted at work today. Synthetic body {i}.</p>{extra}</div></div>')
    return ''.join(output)

def document(content):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><aside id="advert" data-promoted="true">Promoted fixture outside feed</aside>{content}</body></html>'

STUB = r'''
(() => {
 const changeListeners=[], messageListeners=[];
 let stored=INITIAL;
 const nativeHidden=Object.getOwnPropertyDescriptor(Document.prototype,'hidden').get;
 const T = globalThis.__FGTEST__ = {sent:[],hidden:null,pip:null,fullscreen:null,readAttempts:0,location:{protocol:'https:',hostname:'www.linkedin.com',pathname:TEST_PATH,reload(){T.reloads++;}},reloads:0};
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>T.hidden===null?nativeHidden.call(document):T.hidden});
 Object.defineProperty(document,'pictureInPictureElement',{configurable:true,get:()=>T.pip?document.getElementById(T.pip):null});
 Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>T.fullscreen?document.getElementById(T.fullscreen):null});
 globalThis.chrome = {
  storage:{local:{get:async()=>({feedGuardSettingsV1:stored})}, onChanged:{addListener:fn=>changeListeners.push(fn)}},
  runtime:{id:'fixture-id',getManifest:()=>({version:MANIFEST_VERSION}),onMessage:{addListener:fn=>messageListeners.push(fn)},
   sendMessage:async message=>{T.sent.push(JSON.parse(JSON.stringify(message)));}}
 };
 T.patch = patch => {
  const oldValue=stored;stored={...stored,...patch};
  for(const fn of changeListeners)fn({feedGuardSettingsV1:{oldValue,newValue:stored}},'local');
 };
 // Counts the content script's console warnings without printing them.
 T.warnings=0;console.warn=()=>{T.warnings++;};
 // Counts full root selections (Selectors.findRoot) by their one ROOTS query.
 const qsa=Document.prototype.querySelectorAll;T.rootScans=0;
 Document.prototype.querySelectorAll=function(selector){if(selector===ROOTS_SELECTOR)T.rootScans++;return qsa.call(this,selector);};
 // A reported JS heap, in MB, or null for the browser's own.
 const nativeMemory=Object.getOwnPropertyDescriptor(Performance.prototype,'memory');T.heapMB=null;
 Object.defineProperty(performance,'memory',{configurable:true,get(){
  if(T.heapMB===null)return nativeMemory?nativeMemory.get.call(performance):undefined;
  return {usedJSHeapSize:T.heapMB*1048576,totalJSHeapSize:T.heapMB*1048576,jsHeapSizeLimit:4096*1048576};}});
 // Counts MutationObserver records the content script receives.
 const NativeMO=MutationObserver;T.records=0;
 globalThis.MutationObserver=class extends NativeMO{constructor(cb){super((records,observer)=>{T.records+=records.length;cb(records,observer);});}};
 // Counts IntersectionObserver.unobserve calls: a resize remeasure unobserves every card.
 const unobserve=IntersectionObserver.prototype.unobserve;T.unobserved=0;
 IntersectionObserver.prototype.unobserve=function(target){T.unobserved++;return unobserve.call(this,target);};
 // What an invalidated extension context looks like to a content script.
 T.orphan = () => {delete chrome.runtime.id;};
 T.request = type => {let reply=null;for(const fn of messageListeners)fn({channel:'feed-guard-page',type},{id:'fixture-id'},value=>{reply=value;});return reply;};
 T.status = () => T.request('status');
 T.guardReads = () => {
  const forbid=()=>{T.readAttempts++;throw new Error('Content read forbidden in fixture');};
  Object.defineProperty(Node.prototype,'textContent',{configurable:true,get:forbid,set:forbid});
  Object.defineProperty(HTMLInputElement.prototype,'value',{configurable:true,get:forbid});
  Object.defineProperty(HTMLTextAreaElement.prototype,'value',{configurable:true,get:forbid});
  Object.defineProperty(document,'cookie',{configurable:true,get:forbid});
 };
})();
'''

class Fixture:
    def __init__(self,browser,content=None,path='/feed/',settings=None,guard_reads=False):
        self.context=browser.new_context(viewport={'width':1100,'height':800})
        self.page=self.context.new_page()
        self.page.set_default_timeout(5000)
        self.errors=[];self.requests=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        body=document('<main>'+cards()+'</main>' if content is None else content)
        def route(request_route):
            self.requests.append(request_route.request.url)
            request_route.abort()
        self.context.route('**/*',route)
        # No navigation: the managed browser forbids all URLs. Use only about:blank
        # fixtures and inject a lexical URL dependency for scope tests.
        self.page.set_content(body)
        self.page.evaluate('window.__refs={fetch:window.fetch,xhr:window.XMLHttpRequest,beacon:navigator.sendBeacon};window.__cvEvents=[];document.addEventListener("contentvisibilityautostatechange",e=>__cvEvents.push({skipped:e.skipped,id:e.target.id}),true)')
        self.page.add_style_tag(content=(EXT/'content.css').read_text())
        self.cdp=self.context.new_cdp_session(self.page)
        frame=self.cdp.send('Page.getFrameTree')['frameTree']['frame']['id']
        self.world=self.cdp.send('Page.createIsolatedWorld',{'frameId':frame,'worldName':'feed-guard-test'})['executionContextId']
        self.evaluate(STUB.replace('INITIAL',json.dumps(settings or {})).replace('TEST_PATH',json.dumps(path)).replace('ROOTS_SELECTOR',json.dumps(ROOTS_SELECTOR)).replace('MANIFEST_VERSION',json.dumps(VERSION)))
        if guard_reads:self.evaluate('__FGTEST__.guardReads()')
        self.evaluate('(() => { const location = __FGTEST__.location;\n' + SOURCE + '\n})();')
        self.wait()
    def evaluate(self,source):
        result=self.cdp.send('Runtime.evaluate',{'contextId':self.world,'expression':source,'returnByValue':True,'awaitPromise':True})
        if 'exceptionDetails' in result:raise AssertionError(json.dumps(result['exceptionDetails']))
        return result.get('result',{}).get('value')
    def wait(self,ms=360):self.page.wait_for_timeout(ms)
    def navigate(self,path):
        self.evaluate('__FGTEST__.location.pathname='+json.dumps(path)+';window.dispatchEvent(new PopStateEvent("popstate"))')
        self.wait()
    def status(self):return self.evaluate('__FGTEST__.status()')
    def patch(self,**patch):self.evaluate('__FGTEST__.patch('+json.dumps(patch)+')');self.wait()
    def hidden(self,value):self.evaluate('__FGTEST__.hidden='+json.dumps(value)+';document.dispatchEvent(new Event("visibilitychange"))');self.wait(140)
    def close(self):
        errors=list(self.errors)
        self.context.close()
        assert not errors,errors
    def __enter__(self):return self
    def __exit__(self,exc_type,exc_value,tb):self.close()

results=[]
def case(name,fn):
    start=time.perf_counter()
    try:
        fn();result={'name':name,'passed':True}
    except Exception as error:
        result={'name':name,'passed':False,'error':str(error)}
    result['duration_ms']=round((time.perf_counter()-start)*1000,1)
    results.append(result)
    print(('PASS ' if result['passed'] else 'FAIL ')+name,flush=True)
    if not result['passed']:print(result['error'],flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=True,
        args=['--no-sandbox','--disable-gpu','--disable-background-networking','--autoplay-policy=no-user-gesture-required'])
    browser_version=browser.version
    def preserved():
        with Fixture(browser) as f:
            assert f.status()['posts']==40,f.status()
            assert f.page.locator('.occludable-update').count()==40
            assert f.page.locator('.feed-shared-update-v2').count()==40
            assert f.page.locator('#advert').count()==1
            assert f.page.locator('p').filter(has_text='I was Promoted').count()==40
            assert f.page.evaluate('window.__refs.fetch===window.fetch&&window.__refs.xhr===window.XMLHttpRequest&&window.__refs.beacon===navigator.sendBeacon')
    case('All posts/Promoted text retained, nested cards deduplicated, native network APIs unchanged',preserved)
    def far_render():
        with Fixture(browser) as f:
            assert f.status()['deferred']>0,f.status()
            assert f.page.locator('#post-0').get_attribute('data-llg-v1-defer') is None
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
            assert f.page.locator('#post-39').evaluate("e=>getComputedStyle(e).contentVisibility")=='auto'
            assert f.page.evaluate('__cvEvents.some(e=>e.skipped)'),f.page.evaluate('__cvEvents')
            assert f.page.evaluate("window.find('Synthetic body 39')") is True
    case('Only far-away cards receive actual content-visibility:auto; browser find can find their text',far_render)
    def draft_safety():
        with Fixture(browser,content='<main>'+cards(drafts=True)+'</main>') as f:
            assert f.page.input_value('#draft-0')=='UNSAVED 0'
            assert f.page.input_value('#draft-15')=='UNSAVED 15'
            for i in [0,15,16]:assert f.page.locator(f'#post-{i}').get_attribute('data-llg-v1-defer') is None
            f.page.fill('#draft-0','NEW UNSAVED DRAFT')
            f.wait(400)
            assert f.page.input_value('#draft-0')=='NEW UNSAVED DRAFT'
            assert f.page.locator('#rich-draft').inner_text()=='DRAFT EDITOR'
    case('Textareas, rich editors and newly typed drafts remain intact and uncontained',draft_safety)
    def hidden_input():
        html=cards()
        html=html.replace('Synthetic body 39.</p>','Synthetic body 39.</p><input type="hidden" name="token" value="x">',1)
        html=html.replace('Synthetic body 38.</p>','Synthetic body 38.</p><input type="text" id="text-38">',1)
        html=html.replace('Synthetic body 37.</p>','Synthetic body 37.</p><input type="HIDDEN" name="token2" value="y"><input type="checkbox">',1)
        with Fixture(browser,content='<main>'+html+'</main>') as f:
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
            assert f.page.locator('#post-38').get_attribute('data-llg-v1-defer') is None
            assert f.page.locator('#post-37').get_attribute('data-llg-v1-defer') is None
            assert f.page.locator('#post-36').get_attribute('data-llg-v1-defer')==''
    case('A card whose only input is hidden is still deferred; a visible input still excludes it',hidden_input)
    def live_toggle():
        with Fixture(browser) as f:
            f.patch(renderOffscreen=False)
            assert f.status()['deferred']==0
            assert f.page.locator('#post-39').evaluate('e=>getComputedStyle(e).contentVisibility')=='visible'
            f.patch(renderOffscreen=True)
            assert f.status()['deferred']>0
            f.patch(enabled=False)
            assert f.status()['scope']=='disabled'
            assert f.page.locator('[data-llg-v1-post],[data-llg-v1-defer]').count()==0
            assert f.page.locator('[style*="--llg-v1-block-size"]').count()==0
            assert f.page.locator('.occludable-update').count()==40
    case('Live option toggles and master switch restore attributes/CSS without a reload',live_toggle)
    def stable_scroll():
        with Fixture(browser) as f:
            before=f.page.evaluate('document.documentElement.scrollHeight')
            f.page.locator('#post-39').scroll_into_view_if_needed();f.wait()
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer') is None
            after=f.page.evaluate('document.documentElement.scrollHeight')
            assert abs(before-after)<=3,(before,after)
            assert f.page.locator('.occludable-update').count()==40
    case('Scrolling reactivates cards, preserves fixture document height and does not delete old posts',stable_scroll)
    def dynamic():
        with Fixture(browser) as f:
            f.page.evaluate('(html)=>document.querySelector("main").insertAdjacentHTML("beforeend",html)',cards(220,start=40))
            f.wait(600)
            assert f.status()['posts']==260,f.status()
            f.page.evaluate('document.querySelectorAll(".occludable-update").forEach((el,i)=>{if(i<200)el.remove()})')
            f.wait()
            assert f.status()['posts']==60,f.status()
            assert f.page.locator('.occludable-update').count()==60
    case('Large insertion bursts are handled; references to site-removed cards are released',dynamic)
    def excluded():
        with Fixture(browser,path='/messaging/',content='<main>'+cards(video=39)+'</main>') as f:
            assert f.status()['scope']=='outside-feed'
            assert f.page.locator('[data-llg-v1-post]').count()==0
            f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(160)
            assert not f.page.locator('#sample-video').evaluate('v=>v.paused')
    case('Messaging pages do not receive feed DOM or media interventions',excluded)
    def spa_routes():
        with Fixture(browser) as f:
            f.navigate('/jobs/')
            assert f.status()['scope']=='outside-feed'
            assert f.page.locator('[data-llg-v1-defer]').count()==0
            f.navigate('/feed/')
            assert f.status()['posts']==40,f.status()
    case('Simulated route/popstate changes restore and reapply without reinjection',spa_routes)
    def late_feed():
        with Fixture(browser,content='<div id="loading">Loading</div>') as f:
            assert f.status()['scope']=='waiting'
            f.page.evaluate('(html)=>document.body.insertAdjacentHTML("beforeend",html)','<main>'+cards(6)+'</main>');f.wait()
            assert f.status()['posts']==6,f.status()
    case('Late-arriving main/feed containers are discovered',late_feed)
    def replacement():
        with Fixture(browser) as f:
            f.page.evaluate('(html)=>{window.__oldMain=document.querySelector("main");__oldMain.outerHTML=html}', '<main>'+cards(5,start=100)+'</main>');f.wait()
            assert f.status()['posts']==5,f.status()
            assert f.page.evaluate('__oldMain.querySelectorAll("[data-llg-v1-defer],[data-llg-v1-post]").length')==0
    case('Replacing the main container releases old annotations and tracks only the new feed',replacement)
    def visible_video():
        with Fixture(browser,content='<main>'+cards(video=0)+'</main>') as f:
            attributes=f.page.locator('#sample-video').evaluate('v=>({src:v.getAttribute("src"),autoplay:v.autoplay,preload:v.preload,volume:v.volume})')
            f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(200)
            assert not f.page.locator('#sample-video').evaluate('v=>v.paused')
            assert f.status()['paused']==0
            assert f.page.locator('#sample-video').evaluate('v=>({src:v.getAttribute("src"),autoplay:v.autoplay,preload:v.preload,volume:v.volume})')==attributes
    case('Real visible video playback is allowed; source/autoplay/preload/volume stay unchanged',visible_video)
    def offscreen_video():
        with Fixture(browser,content='<main>'+cards(video=39)+'</main>') as f:
            f.page.locator('#sample-video').evaluate('v=>v.play().catch(()=>{})');f.wait(250)
            assert f.page.locator('#sample-video').evaluate('v=>v.paused')
            assert f.status()['paused']>=1,f.status()
            f.patch(pauseOffscreenVideos=False)
            f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(200)
            assert not f.page.locator('#sample-video').evaluate('v=>v.paused')
    case('Real offscreen video playback is paused; live disable permits playback',offscreen_video)
    def background_video():
        with Fixture(browser,content='<main>'+cards(video=0)+'</main>') as f:
            f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(100)
            f.hidden(True)
            assert f.page.locator('#sample-video').evaluate('v=>v.paused')
            f.hidden(False)
            assert f.page.locator('#sample-video').evaluate('v=>v.paused')
    case('Simulated hidden-tab state pauses real video and return does not autoplay',background_video)
    def protected_media():
        with Fixture(browser,content='<main>'+cards(video=39)+'</main>') as f:
            f.evaluate('__FGTEST__.pip="sample-video"');f.hidden(True)
            f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(200)
            assert not f.page.locator('#sample-video').evaluate('v=>v.paused')
            f.evaluate('__FGTEST__.pip=null;__FGTEST__.fullscreen="post-39"');f.wait(100)
            assert not f.page.locator('#sample-video').evaluate('v=>v.paused')
            f.evaluate('__FGTEST__.fullscreen=null;document.dispatchEvent(new Event("fullscreenchange"))');f.wait(180)
            assert f.page.locator('#sample-video').evaluate('v=>v.paused')
    case('Simulated PiP/fullscreen state protects real video; leaving protected state reapplies policy',protected_media)
    def privacy():
        with Fixture(browser,content='<main>'+cards(drafts=True)+'</main>',guard_reads=True) as f:
            assert f.status()['posts']==40,f.status()
            assert f.evaluate('__FGTEST__.readAttempts')==0
            assert f.requests==[],f.requests
            assert f.page.evaluate('typeof window.LLGuardConfig')=='undefined'
    case('Fixture execution does not read text/input/cookies, request an external resource or expose isolated globals',privacy)
    def responsive():
        with Fixture(browser) as f:
            f.page.set_viewport_size({'width':850,'height':600});f.wait()
            assert f.status()['posts']==40
            f.patch(renderOffscreen=False)
            plain=f.page.evaluate('document.documentElement.scrollHeight')
            f.patch(renderOffscreen=True)
            optimized=f.page.evaluate('document.documentElement.scrollHeight')
            assert abs(plain-optimized)<=3,(plain,optimized)
    case('Resize/reflow maintains fixture height after recomputing deferred-card placeholders',responsive)
    def resize_debounce():
        with Fixture(browser) as f:
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
            f.evaluate('__FGTEST__.unobserved=0')
            # Twenty resize events 20 ms apart, as a window drag produces.
            f.page.evaluate('()=>new Promise(done=>{let n=0;const id=setInterval(()=>{window.dispatchEvent(new Event("resize"));if(++n===20){clearInterval(id);done();}},20)})')
            assert f.evaluate('__FGTEST__.unobserved')==0
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
            f.wait()
            # One remeasure of the 40 cards once the events settle, then deferral again.
            assert f.evaluate('__FGTEST__.unobserved')==40,f.evaluate('__FGTEST__.unobserved')
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
    case('Resize events are debounced: one remeasure after the burst settles',resize_debounce)
    def lifecycle():
        with Fixture(browser) as f:
            f.page.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}))');f.wait()
            assert f.page.locator('[data-llg-v1-defer]').count()==0
            f.page.evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');f.wait()
            assert f.status()['posts']==40
    case('Simulated pagehide/BFCache pageshow cleans up and reinitializes',lifecycle)
    def live_interaction_attributes():
        with Fixture(browser) as f:
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
            f.page.locator('#post-39 h2').evaluate('e=>e.setAttribute("contenteditable","true")');f.wait()
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer') is None
            f.page.locator('#post-39 h2').evaluate('e=>e.setAttribute("contenteditable","false")');f.wait()
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
    case('Interaction attribute changes remove containment before an editor is used',live_interaction_attributes)
    def repeated_toggles():
        with Fixture(browser) as f:
            for _ in range(3):
                f.patch(enabled=False);assert f.status()['posts']==0
                f.patch(enabled=True);assert f.status()['posts']==40
            assert f.page.locator('.occludable-update').count()==40
    case('Repeated on/off cycles do not duplicate tracked cards or lose DOM nodes',repeated_toggles)
    def hidden_cleanup():
        with Fixture(browser) as f:
            f.hidden(True)
            f.page.evaluate('document.querySelector("main").replaceChildren()')
            f.wait(400)
            assert f.status()['posts']==0,f.status()
            assert f.status()['videos']==0
    case('Removed feed trees are released even while the simulated tab remains hidden',hidden_cleanup)
    def orphaned():
        # Through a DOM mutation (the observer flush) and through a scroll (IO callbacks).
        for trigger in ['mutation','scroll']:
            with Fixture(browser,content='<main>'+cards(video=39)+'</main>') as f:
                assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
                f.evaluate('__FGTEST__.orphan()')
                if trigger=='mutation':
                    f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div class=occludable-update id=late>Late</div>")')
                else:
                    f.page.locator('#post-20').scroll_into_view_if_needed()
                f.wait()
                assert f.page.locator('[data-llg-v1-post],[data-llg-v1-defer]').count()==0,trigger
                assert f.page.locator('[style*="--llg-v1-block-size"]').count()==0,trigger
                f.page.locator('#post-0').scroll_into_view_if_needed()
                f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(250)
                assert not f.page.locator('#sample-video').evaluate('v=>v.paused'),trigger
                f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div class=occludable-update>Later</div>")');f.wait()
                assert f.page.locator('[data-llg-v1-post]').count()==0,trigger
                assert f.page.locator('.occludable-update').count()>=40
                assert f.evaluate('__FGTEST__.warnings')==0
        # A media event alone is enough to notice it, too.
        with Fixture(browser,content='<main>'+cards(video=39)+'</main>') as f:
            f.evaluate('__FGTEST__.orphan()')
            f.page.locator('#sample-video').evaluate('v=>v.play()');f.wait(250)
            assert not f.page.locator('#sample-video').evaluate('v=>v.paused')
            assert f.page.locator('[data-llg-v1-post],[data-llg-v1-defer]').count()==0
    case('An invalidated extension context (disabled/removed/reloaded) stops the left-over script and clears its annotations',orphaned)
    # Main world: 150 attribute changes above the feed over 1.5 s, then hide the root.
    BURST='''()=>new Promise(done=>{let n=0;const id=setInterval(()=>{
      document.body.classList.toggle('burst');document.body.setAttribute('data-testid','burst-'+(n%7));
      if(++n===150){clearInterval(id);document.querySelector('main').setAttribute('hidden','');done();}},10);})'''
    def scan_storm():
        with Fixture(browser) as f:
            assert f.status()['posts']==40
            f.evaluate('__FGTEST__.rootScans=0')
            f.page.evaluate(BURST)
            during=f.evaluate('__FGTEST__.rootScans')
            # Unthrottled, every 120 ms batch reselected the root: about 12 here.
            assert 1<=during<=3,during
            f.wait(1300)
            # The trailing rescan saw the last change: the hidden root is let go.
            assert f.status()['scope']=='waiting',f.status()
            assert f.page.locator('[data-llg-v1-post]').count()==0
            assert f.evaluate('__FGTEST__.rootScans')<=during+1,f.evaluate('__FGTEST__.rootScans')
        with Fixture(browser,path='/messaging/') as f:
            f.evaluate('__FGTEST__.rootScans=0')
            f.page.evaluate(BURST);f.wait()
            assert f.evaluate('__FGTEST__.rootScans')==0
            assert f.status()['scope']=='outside-feed'
            # Off the feed the child-list observer still notices an in-page route change.
            f.page.evaluate('document.querySelector("main").removeAttribute("hidden")')
            f.evaluate('__FGTEST__.location.pathname="/feed/"')
            f.page.evaluate('document.body.insertAdjacentHTML("beforeend","<div>route changed</div>")');f.wait()
            assert f.status()['posts']==40,f.status()
    case('A burst of attribute changes above the feed causes a bounded number of root rescans and none off the feed',scan_storm)
    def custom_property_restore():
        with Fixture(browser,settings={'enabled':False}) as f:
            f.page.locator('#post-39').evaluate('e=>e.style.setProperty("--llg-v1-block-size","123px","important")')
            f.patch(enabled=True)
            assert f.status()['deferred']>0
            f.patch(enabled=False)
            assert f.page.locator('#post-39').evaluate('e=>[e.style.getPropertyValue("--llg-v1-block-size"),e.style.getPropertyPriority("--llg-v1-block-size")]')==['123px','important']
    case('Pre-existing custom CSS property is restored, rather than overwriting unrelated page state',custom_property_restore)

    ADVISORY='[data-llg-v1-advisory]'
    def advisory_long_feed():
        with Fixture(browser,content='<main>'+cards(210)+'</main>') as f:
            status=f.status()
            assert status['posts']==210 and status['pressure'] is True,status
            assert isinstance(status['heapMB'],int) and status['heapMB']>0,status
            assert f.page.locator(ADVISORY).count()==1
            # Outside the feed root: no post node gains a child or is touched.
            assert f.page.locator('main '+ADVISORY).count()==0
            assert f.page.locator('.occludable-update').count()==210
            assert '210' in f.page.locator(ADVISORY+' p').first.inner_text()
            f.page.locator(ADVISORY+' button.primary').click();f.wait(100)
            assert f.evaluate('__FGTEST__.reloads')==1
        with Fixture(browser,content='<main>'+cards(210)+'</main>') as f:
            f.page.locator(ADVISORY+' button:not(.primary)').click();f.wait()
            assert f.page.locator(ADVISORY).count()==0
            assert f.evaluate('__FGTEST__.reloads')==0
            # Snoozed: 50 more posts are not enough to ask again.
            f.page.evaluate('(html)=>document.querySelector("main").insertAdjacentHTML("beforeend",html)',cards(50,start=210));f.wait(600)
            assert f.page.locator(ADVISORY).count()==0
    case('A long feed gets a reload notice outside the feed; only a click reloads, and Later snoozes it',advisory_long_feed)
    def advisory_settings():
        with Fixture(browser) as f:
            assert f.status()['pressure'] is False,f.status()
            assert f.page.locator(ADVISORY).count()==0
        with Fixture(browser,content='<main>'+cards(210)+'</main>') as f:
            f.patch(memoryAdvisory=False)
            assert f.page.locator(ADVISORY).count()==0
            assert f.status()['pressure'] is False
            f.patch(memoryAdvisory=True);f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div class=occludable-update>x</div>")');f.wait()
            assert f.page.locator(ADVISORY).count()==1
            f.patch(enabled=False)
            assert f.page.locator(ADVISORY).count()==0
        with Fixture(browser,content='<main>'+cards(210)+'</main>',path='/messaging/') as f:
            assert f.page.locator(ADVISORY).count()==0
        with Fixture(browser,content='<main>'+cards(210)+'</main>') as f:
            f.evaluate('__FGTEST__.orphan()')
            f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div class=occludable-update>x</div>")');f.wait()
            assert f.page.locator(ADVISORY).count()==0
    def advisory_heap():
        # Just after a reload: few posts, and the old page's heap not yet collected.
        with Fixture(browser,content='<main>'+cards(10)+'</main>') as f:
            f.evaluate('__FGTEST__.heapMB=1500')
            f.patch(memoryAdvisory=True)
            f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div class=occludable-update>x</div>")');f.wait()
            assert f.status()['pressure'] is False,f.status()
            assert f.page.locator(ADVISORY).count()==0
        # A real feed of 40 posts with a heavy heap: warned by memory, not by count.
        with Fixture(browser,content='<main>'+cards(40)+'</main>') as f:
            f.evaluate('__FGTEST__.heapMB=1500')
            f.patch(memoryAdvisory=True)
            f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div class=occludable-update>x</div>")');f.wait()
            assert f.status()['pressure'] is True and f.status()['heapMB']==1500,f.status()
            assert '1500 MB' in f.page.locator(ADVISORY+' p').first.inner_text()
    case('The heap counts only once the feed has posts of its own, then warns with the figure',advisory_heap)
    def nested_scroller():
        # LinkedIn's layout: the feed scrolls inside main#workspace, not the window.
        content='<main id="workspace" style="height:800px;overflow-y:auto">'+cards()+'</main>'
        with Fixture(browser,content=content) as f:
            f.page.add_style_tag(content='body{overflow:hidden}')
            f.page.evaluate('document.getElementById("workspace").scrollTop=0');f.wait()
            # Card 5 starts about 1150 px down: off screen but inside the 1200 px margin.
            top=f.page.locator('#post-5').evaluate('e=>e.getBoundingClientRect().top')
            assert 800<top<2000,top
            assert f.page.locator('#post-5').get_attribute('data-llg-v1-defer') is None
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
    case('Inside a scroll container the 1200 px margin still applies (scrollMargin)',nested_scroller)
    def unload_images():
        ATTRS='e=>[e.getAttribute("src"),e.getAttribute("srcset")]'
        with Fixture(browser,content='<main>'+cards(images=True)+'</main>') as f:
            # Off by default: nothing is touched.
            assert f.page.locator('img:not([src])').count()==0
            assert f.status()['unloaded']==0
            original=f.page.locator('#img-39').evaluate(ATTRS)
            # Attribute values must never be read as text by the extension.
            f.evaluate('''(()=>{const forbid=()=>{__FGTEST__.readAttempts++;throw new Error('read');};
              for(const k of ['value','nodeValue'])Object.defineProperty(Attr.prototype,k,{configurable:true,get:forbid});
              Object.defineProperty(Element.prototype,'getAttribute',{configurable:true,value:forbid});})()''')
            f.patch(unloadFarImages=True);f.wait(500)
            assert f.evaluate('__FGTEST__.readAttempts')==0
            f.evaluate('(()=>{delete Attr.prototype.value;delete Attr.prototype.nodeValue;delete Element.prototype.getAttribute;})()')
            status=f.status()
            assert status['unloaded']>0,status
            # Far, deferred cards lose src and srcset (img and <source>); near ones keep them.
            assert f.page.locator('#img-39').evaluate(ATTRS)==[None,None]
            assert f.page.locator('#src-39').evaluate('e=>e.hasAttribute("srcset")') is False
            assert f.page.locator('#pic-39').evaluate('e=>e.hasAttribute("src")') is False
            assert f.page.locator('#img-0').evaluate(ATTRS)!=[None,None]
            assert f.page.locator('#post-39').get_attribute('data-llg-v1-defer')==''
            assert f.page.locator('img').count()==80
            # Scrolling back restores them before the card renders, byte for byte.
            f.page.locator('#post-30').scroll_into_view_if_needed();f.wait(500)
            assert f.page.locator('#img-39').evaluate(ATTRS)==original
            assert f.page.locator('#img-39').evaluate('e=>e.complete&&e.naturalWidth===1')
            f.page.locator('#post-0').scroll_into_view_if_needed();f.wait(500)
            assert f.page.locator('#img-39').evaluate(ATTRS)==[None,None]
            # Turning it off restores everything at once.
            f.patch(unloadFarImages=False)
            assert f.page.locator('img:not([src])').count()==0
            assert f.page.locator('source:not([srcset])').count()==0
            assert f.page.locator('#img-39').evaluate(ATTRS)==original
            f.patch(unloadFarImages=True);f.wait(300)
            assert f.page.locator('#img-39').evaluate(ATTRS)==[None,None]
            f.patch(enabled=False)
            assert f.page.locator('img:not([src])').count()==0
        # A value the site sets meanwhile is kept, not overwritten by the old one.
        with Fixture(browser,content='<main>'+cards(images=True)+'</main>',settings={'unloadFarImages':True}) as f:
            f.wait(300)
            f.page.locator('#img-39').evaluate('e=>e.setAttribute("src","data:image/gif;base64,R0lGODlhAQABAAAAACw=")')
            f.patch(unloadFarImages=False)
            assert f.page.locator('#img-39').get_attribute('src').startswith('data:image/gif')
            assert f.page.locator('#img-39').get_attribute('srcset').endswith('#39x 1x')
    case('Opt-in image unloading frees far deferred cards, never reads URLs, and restores exactly',unload_images)
    def toolbar_badge():
        with Fixture(browser) as f:
            sent=f.evaluate('__FGTEST__.sent')
            assert sent and sent[-1]=={'channel':'feed-guard-badge','posts':40,'pressure':False},sent
            # Only on change: a mutation that does not change the count sends nothing.
            n=len(sent);f.page.locator('#post-3 h2').evaluate('e=>e.setAttribute("aria-expanded","false")');f.wait()
            assert len(f.evaluate('__FGTEST__.sent'))==n
            f.navigate('/jobs/')
            assert f.evaluate('__FGTEST__.sent')[-1]['posts']==0
            f.navigate('/feed/')
            assert f.evaluate('__FGTEST__.sent')[-1]['posts']==40
            f.patch(enabled=False)
            assert f.evaluate('__FGTEST__.sent')[-1]['posts']==0
        with Fixture(browser,content='<main>'+cards(210)+'</main>') as f:
            assert f.evaluate('__FGTEST__.sent')[-1]=={'channel':'feed-guard-badge','posts':210,'pressure':True}
            text=json.dumps(f.evaluate('__FGTEST__.sent'))
            for private in ['Synthetic','Promoted','linkedin']:assert private not in text
    case('The toolbar badge gets the post count on change only, zero off the feed, and the heavy flag',toolbar_badge)
    case('The notice follows its setting and the master switch, stays off other pages and leaves with an orphaned script',advisory_settings)
    def class_scope():
        with Fixture(browser) as f:
            assert f.status()['posts']==40
            # Class churn beside the feed no longer wakes the observer once cards are known...
            f.evaluate('__FGTEST__.rootScans=0;__FGTEST__.records=0')
            f.page.evaluate('()=>new Promise(done=>{let n=0;const id=setInterval(()=>{document.getElementById("advert").classList.toggle("churn");if(++n===60){clearInterval(id);done();}},10)})');f.wait()
            assert f.evaluate('__FGTEST__.rootScans')==0,f.evaluate('__FGTEST__.rootScans')
            assert f.evaluate('__FGTEST__.records')==0,f.evaluate('__FGTEST__.records')
            # ...while class changes inside the feed still update cards.
            f.page.evaluate('document.querySelector("main").insertAdjacentHTML("beforeend","<div id=late-class><p>late</p></div>")');f.wait()
            f.page.locator('#late-class').evaluate('e=>e.classList.add("occludable-update")');f.wait()
            assert f.status()['posts']==41,f.status()
        with Fixture(browser,content='<div id="wrap"><main>'+cards(6)+'</main></div><div id="other"></div>') as f:
            assert f.status()['posts']==6
            f.page.add_style_tag(content='.gone{display:none}')
            # A class on an ancestor that hides the root is still noticed...
            f.page.locator('#wrap').evaluate('e=>e.classList.add("gone")');f.wait(1300)
            assert f.status()['scope']=='waiting',f.status()
            # ...and with no root left, a feed identified by class alone is found again.
            f.page.evaluate('document.getElementById("other").insertAdjacentHTML("beforeend","<main><div id=c1><p>x</p></div></main>")');f.wait()
            f.page.locator('#c1').evaluate('e=>e.classList.add("occludable-update")');f.wait(1300)
            assert f.status()['posts']==1,f.status()
    case('Class changes are watched inside the feed only once cards are known',class_scope)

    def modern_cards(n=12, keyed=True, nested=False):
        return ''.join('<div role="listitem" '+(f'componentkey="expandedSYNTHETIC{i}FeedType_MAIN_FEED"' if keyed else '')+
            f' id="modern-{i}" style="min-height:240px"><div data-testid="expandable-text-box">Synthetic post {i}</div>'+
            ('<div class="feed-shared-update-v2">Nested content</div>' if nested else '')+'</div>' for i in range(n))
    def modern_only():
        with Fixture(browser,content='<div data-testid="mainFeed">'+modern_cards()+'</div>') as f:
            assert f.status()['posts']==12,f.status()
            assert f.status()['root']=='mainFeed'
            assert f.status()['variants']['component-key']==12
            assert f.page.locator('#modern-11').get_attribute('data-llg-v1-defer')==''
    case('Modern mainFeed without a main element detects component-key post wrappers',modern_only)
    def second_main():
        with Fixture(browser,content='<main><p>Empty shell</p></main><main>'+cards(9)+'</main>') as f:
            assert f.status()['posts']==9,f.status()
    case('An empty first main does not hide cards in a later main',second_main)
    def hidden_main():
        with Fixture(browser,content='<div style="display:none"><main>'+cards(6,start=100)+'</main></div><main>'+cards(4)+'</main>') as f:
            assert f.status()['posts']==4,f.status()
            assert f.page.locator('#post-100').get_attribute('data-llg-v1-post') is None
    case('Hidden main trees are excluded during root selection',hidden_main)
    def no_false_positive():
        content='<main><article><p>Promoted</p></article><div role="listitem">Recommendation</div></main>'
        with Fixture(browser,content=content) as f:
            assert f.status()['posts']==0
            assert f.status()['scope']=='unrecognized',f.status()
            assert f.page.locator('article').count()==1
    case('A container with zero supported posts reports unrecognized, not success',no_false_positive)
    def modern_fallback():
        content='<div data-testid="mainFeed">'+modern_cards(7,keyed=False)+'<div role="listitem">Suggestion</div><article>Unrelated article</article></div>'
        with Fixture(browser,content=content) as f:
            assert f.status()['posts']==7,f.status()
            assert f.status()['variants']['list-item']==7
            assert f.page.locator('[role=listitem]').count()==8
    case('List-item fallback requires the known mainFeed and a post-body marker',modern_fallback)
    def modern_nested():
        with Fixture(browser,content='<main><div data-testid="mainFeed">'+modern_cards(9,nested=True)+'</div></main>') as f:
            assert f.status()['posts']==9,f.status()
            assert f.page.locator('.feed-shared-update-v2[data-llg-v1-post]').count()==0
            assert f.status()['root']=='mainFeed'
    case('Nested legacy markers inside modern cards are not double-counted',modern_nested)
    def late_root():
        with Fixture(browser,content='<main id="shell"></main>') as f:
            f.page.evaluate('(html)=>document.body.insertAdjacentHTML("beforeend",html)', '<div data-testid="mainFeed">'+modern_cards(8)+'</div>');f.wait()
            assert f.status()['posts']==8,f.status()
            assert f.status()['root']=='mainFeed'
    case('A late mainFeed outside an empty main is discovered automatically',late_root)
    def hydration():
        with Fixture(browser,content='<div data-testid="mainFeed"><div id="hydrate" componentkey="expandedSYNTHETICFeedType_MAIN_FEED"><p>No role yet</p></div></div>') as f:
            assert f.status()['posts']==0
            f.page.locator('#hydrate').evaluate('e=>e.setAttribute("role","listitem")');f.wait()
            assert f.status()['posts']==1,f.status()
            f.page.locator('#hydrate').evaluate('e=>e.removeAttribute("role")');f.wait()
            assert f.status()['posts']==0,f.status()
    case('Adding or removing role during hydration updates detection without new nodes',hydration)
    def class_hydration():
        with Fixture(browser,content='<main><div id="hydrate"><p>Hydrating</p></div></main>') as f:
            assert f.status()['posts']==0
            f.page.locator('#hydrate').evaluate('e=>e.classList.add("occludable-update")');f.wait()
            assert f.status()['posts']==1,f.status()
            f.page.locator('#hydrate').evaluate('e=>e.classList.remove("occludable-update")');f.wait()
            assert f.status()['posts']==0,f.status()
    case('Legacy class-marker hydration and removal also update the card registry',class_hydration)
    def root_hydration():
        with Fixture(browser,content='<div id="root-hydrate">'+modern_cards(4)+'</div>') as f:
            assert f.status()['scope']=='waiting'
            f.page.locator('#root-hydrate').evaluate('e=>e.setAttribute("data-testid","mainFeed")');f.wait()
            assert f.status()['posts']==4,f.status()
    case('A mainFeed identity added later is detected without replacing the root',root_hydration)
    def modern_replaced():
        with Fixture(browser,content='<div data-testid="mainFeed">'+modern_cards(12)+'</div>') as f:
            f.page.locator('[data-testid=mainFeed]').evaluate('(e, html)=>{e.outerHTML=html}', '<main>'+cards(3)+'</main>');f.wait()
            assert f.status()['posts']==3,f.status()
            assert f.status()['variants']['component-key']==0
    case('Replacing a modern feed with a legacy root releases all old card references',modern_replaced)
    def modern_drafts():
        html='<div data-testid="mainFeed">'+modern_cards(20)+'</div>'
        with Fixture(browser,content=html) as f:
            f.page.locator('#modern-19').evaluate('e=>e.insertAdjacentHTML("beforeend",\'<textarea id="modern-draft">KEEP DRAFT</textarea>\')');f.wait()
            assert f.page.input_value('#modern-draft')=='KEEP DRAFT'
            assert f.page.locator('#modern-19').get_attribute('data-llg-v1-defer') is None
            f.patch(enabled=False)
            assert f.page.locator('[data-llg-v1-post]').count()==0
            assert f.page.locator('[role=listitem]').count()==20
    case('Modern cards preserve draft editors and cleanly remove optimization annotations',modern_drafts)
    def diagnostic_privacy():
        html='<div data-testid="mainFeed">'+modern_cards(5)+'</div>'
        with Fixture(browser,content=html,guard_reads=True) as f:
            data=f.evaluate('__FGTEST__.request("diagnostics")')['diagnostics']
            assert data['version']==VERSION
            assert data['posts']==5 and data['selectors']['componentKeyCards']==5,data
            assert data['pageCategory']=='main-feed'
            encoded=json.dumps(data)
            for private in ['SYNTHETIC','Synthetic post','linkedin.com','http','expanded']:assert private not in encoded
            assert f.evaluate('__FGTEST__.readAttempts')==0
    case('Explicit diagnostics use only fixed enums and counts without reading page text or values',diagnostic_privacy)
    def modern_excluded():
        with Fixture(browser,content='<div data-testid="mainFeed">'+modern_cards(5)+'</div>',path='/messaging/') as f:
            assert f.status()['scope']=='outside-feed'
            assert f.status()['posts']==0
            assert f.evaluate('__FGTEST__.request("diagnostics")')['diagnostics']['selectors']=={}
    case('Modern markers on an excluded route neither activate optimizations nor scan diagnostics',modern_excluded)

    def modern_grouping():
        html='<div data-testid="mainFeed"><div role="listitem" id="group">'+modern_cards(5)+'</div></div>'
        with Fixture(browser,content=html) as f:
            assert f.status()['posts']==5,f.status()
            assert f.page.locator('#group').get_attribute('data-llg-v1-post') is None
    case('A generic list-item group containing several post cards is not treated as one post',modern_grouping)

    def ui_page(kind='popup', lang='en-US', initial=None, status=None, diag_version='WRONG UNTRUSTED VERSION', pending=False):
        import re
        context=browser.new_context(viewport={'width':440 if kind=='popup' else 1000,'height':1000})
        page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        context.route('**/*',lambda r:r.abort())
        html=(EXT/f'{kind}.html').read_text()
        html=re.sub(r'<script[^>]*src=[^>]*></script>','',html)
        html=re.sub(r'<link[^>]*>','',html)
        page.set_content(html);page.add_style_tag(content=(EXT/f'{kind}.css').read_text())
        payload={'pending':pending,'version':VERSION,'diagVersion':diag_version,'lang':lang,'stored':initial or {},'status':status or {'ok':True,'scope':'feed','supported':True,'posts':40,'deferred':28,'videos':1,'paused':2,'heapMB':310,'pressure':False}}
        page.evaluate(r'''(input)=>{
          window.close=()=>{window.__closed=true;};
          const events=[];const store=input.stored;
          window.__uiStore=store;window.__uiEvents=events;window.__calls=[];
          window.chrome={
            i18n:{getUILanguage:()=>input.lang},
            storage:{local:{get:async(key)=>({[key]:store[key]}),set:async(values)=>{Object.assign(store,values);for(const [key,value] of Object.entries(values))for(const cb of events)cb({[key]:{newValue:value}},'local');}},onChanged:{addListener:cb=>events.push(cb)}},
            runtime:{sendMessage:async(m)=>{__calls.push(m);return {ok:true,settings:{enabled:true,renderOffscreen:true,pauseOffscreenVideos:true,pauseHiddenVideos:true,blockTracking:false},trackingRuleActive:false};},getURL:s=>s,getManifest:()=>({version:input.version})},
            tabs:{reload:async(id)=>{__calls.push({type:'reload',id});},query:()=>input.pending?new Promise(()=>{}):Promise.resolve([{id:1}]),sendMessage:async(id,m)=>{
              __calls.push(m);
              if(m.type==='diagnostics')return {ok:true,diagnostics:{schema:1,version:input.diagVersion,scope:'unrecognized',pageCategory:'main-feed',visibility:'visible',enabled:true,renderSupported:true,posts:0,root:'mainFeed',selectors:{mainFeed:1,listItems:6,unapproved:'PRIVATE'},url:'PRIVATE URL',html:'PRIVATE HTML'}};
              return {version:input.version, ...input.status};
            },create:async()=>({})}
          };
        }''',payload)
        scripts=['config.js','i18n.js','diagnostics.js','popup.js'] if kind=='popup' else ['config.js','i18n.js','help.js']
        for script in scripts:page.add_script_tag(content=(EXT/script).read_text())
        page.wait_for_timeout(400)
        return context,page,errors
    def ui_bilingual():
        for locale in ['en-US','it-IT']:
            context,page,errors=ui_page(lang=locale)
            assert page.locator('#posts').inner_text()=='40'
            assert page.locator('#heap').inner_text()=='310'
            assert page.locator('#pressure').is_hidden()
            assert page.locator('#memoryAdvisory').is_checked() is True
            assert page.locator('#blockTracking').is_checked() is False
            assert page.locator('#enabled').is_checked() is True
            assert page.locator('#error').is_hidden()
            assert page.locator('html').get_attribute('lang')==locale[:2]
            assert page.locator('#scope').inner_text()==('Posts detected' if locale.startswith('en') else 'Post riconosciuti')
            assert page.locator('.eyebrow').inner_text().endswith(f'{VERSION} BETA'),page.locator('.eyebrow').inner_text()
            assert page.locator('body').evaluate('e=>e.getBoundingClientRect().height')<=600
            assert page.evaluate('document.documentElement.scrollWidth')<=440
            page.locator('body').screenshot(path=str(OUT/f'popup-{locale[:2]}.png'))
            target='it' if locale.startswith('en') else 'en'
            page.select_option('#language',target);page.wait_for_timeout(100)
            assert page.locator('html').get_attribute('lang')==target
            assert page.evaluate('__uiStore.feedGuardLanguageV1')==target
            assert not errors,errors
            context.close()
    case('English/Italian popup, live selector, persistence and narrow-layout screenshots',ui_bilingual)
    def help_bilingual():
        for locale in ['en-US','it-IT']:
            context,page,errors=ui_page(kind='help',lang=locale)
            assert page.locator('html').get_attribute('lang')==locale[:2]
            assert page.locator('h1').inner_text().startswith('Keep' if locale.startswith('en') else 'Mantieni')
            assert page.locator('.eyebrow').inner_text().endswith(f'{VERSION} BETA')
            intro=page.locator('[data-i18n=helpIntro]').inner_text()
            assert f'LinkedIn Feed Guard {VERSION} ' in intro and '{version}' not in intro,intro
            page.screenshot(path=str(OUT/f'help-{locale[:2]}.png'),full_page=True)
            target='it' if locale.startswith('en') else 'en'
            page.select_option('#language',target);page.wait_for_timeout(100)
            assert page.locator('html').get_attribute('lang')==target
            assert not errors,errors
            context.close()
    case('Help is fully translated in both languages and can switch without a reload',help_bilingual)
    def popup_zero_and_report():
        status={'ok':True,'scope':'unrecognized','supported':True,'posts':0,'deferred':0,'paused':0}
        context,page,errors=ui_page(status=status)
        assert 'no posts detected' in page.locator('#scope').inner_text()
        assert 'Diagnostics' in page.locator('#hint').inner_text()
        page.click('#diagnostics');page.wait_for_timeout(200)
        report=page.input_value('#report');data=json.loads(report)
        assert data['version']==VERSION
        # An invalid page script version is dropped, and the report says stale.
        assert 'contentVersion' not in data and data['scope']=='stale',data
        assert data['selectors']['mainFeed']==1
        for bad in ['PRIVATE','UNTRUSTED','url','html','unapproved']:assert bad not in report
        page.click('#copy');page.wait_for_timeout(100)
        assert page.locator('#copy-status').inner_text()
        assert page.locator('#report').evaluate('e=>e.selectionStart===0&&e.selectionEnd===e.value.length')
        page.select_option('#language','it');page.wait_for_timeout(100)
        assert 'nessun post' in page.locator('#scope').inner_text()
        assert page.locator('#copy').inner_text()=='Copia rapporto'
        # The panel itself: it sits below the fold of the 600 px popup body.
        page.locator('#report').evaluate('e=>{e.scrollTop=0}')
        page.locator('#diagnostic-panel').screenshot(path=str(OUT/'popup-diagnostics.png'))
        page.click('#close-diagnostics')
        assert page.locator('#diagnostic-panel').is_hidden()
        assert page.input_value('#report')==''
        assert not errors,errors
        context.close()
    case('Zero-post UI, sanitized report, clipboard fallback, translation and report cleanup',popup_zero_and_report)
    def stored_language():
        context,page,errors=ui_page(lang='it-IT',initial={'feedGuardLanguageV1':'en'})
        assert page.locator('html').get_attribute('lang')=='en'
        page.evaluate("for(const cb of __uiEvents)cb({feedGuardLanguageV1:{newValue:'it'}},'local')")
        assert page.locator('html').get_attribute('lang')=='it'
        assert not errors,errors
        context.close()
    case('Stored language overrides browser locale and storage changes refresh open UI',stored_language)
    def stale_content():
        context,page,errors=ui_page(status={'ok':True,'version':'0.1.0','scope':'feed','supported':True,'posts':0,'deferred':0,'paused':0})
        assert page.locator('#scope').inner_text()=='Reload LinkedIn to activate this version'
        assert 'Save drafts' in page.locator('#hint').inner_text()
        page.select_option('#language','it');page.wait_for_timeout(100)
        assert page.locator('#scope').inner_text()=='Ricarica LinkedIn per attivare questa versione'
        assert not errors,errors
        context.close()
    case('A stale content script triggers a localized reload warning rather than a success message',stale_content)
    def checking():
        for locale,text in [('en-US','Checking this page...'),('it-IT','Verifica della pagina...')]:
            context,page,errors=ui_page(lang=locale,pending=True)
            assert page.locator('#scope').inner_text()==text,page.locator('#scope').inner_text()
            assert page.locator('#hint').inner_text()==''
            assert not errors,errors
            context.close()
    case('While the page has not answered, the popup says it is checking, in both languages',checking)
    def report_versions():
        for page_version,scope in [(VERSION,'unrecognized'),('0.1.0','stale')]:
            context,page,errors=ui_page(diag_version=page_version)
            page.click('#diagnostics');page.wait_for_timeout(200)
            data=json.loads(page.input_value('#report'))
            assert data['version']==VERSION and data['contentVersion']==page_version,data
            assert data['scope']==scope,data
            assert not errors,errors
            context.close()
    def popup_pressure():
        for locale,word in [('en-US','Aw, Snap'),('it-IT','Aw, Snap')]:
            context,page,errors=ui_page(lang=locale,status={'ok':True,'scope':'feed','supported':True,'posts':260,'deferred':200,'paused':0,'heapMB':1350,'pressure':True})
            assert word in page.locator('#pressure').inner_text()
            assert page.locator('#heap').inner_text()=='1350'
            assert page.locator('#reload-feed').is_visible()
            if locale=='en-US':page.locator('body').screenshot(path=str(OUT/'popup-pressure.png'))
            page.click('#reload-feed');page.wait_for_timeout(100)
            assert page.evaluate('__calls.some(c=>c.type==="reload"&&c.id===1)')
            assert page.evaluate('window.__closed===true')
            assert not errors,errors
            context.close()
    case('A heavy feed shows memory, a localized warning and a Reload feed button in the popup',popup_pressure)
    case('Diagnostics report the page script version beside the popup version and mark a mismatch stale',report_versions)
    browser.close()

report={'utc':datetime.now(timezone.utc).isoformat(),'browser':browser_version,
        'extensionSha256':EXTENSION_SHA256,'extensionSha256Method':EXTENSION_HASH_METHOD,
        'method':'Actual Chromium DOM/media/IntersectionObserver in an isolated JavaScript world; extension runtime/storage APIs and URL/navigation are simulated. Pages are about:blank fixtures: no navigation or policy override. No installed extension, no LinkedIn login, no DNR browser-engine test. Hidden/PiP/fullscreen/BFCache states simulated.',
        'passed':sum(item['passed'] for item in results),'failed':sum(not item['passed'] for item in results),'tests':results}
(OUT/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'failed':report['failed'],'browser':browser_version,'extensionSha256':EXTENSION_SHA256}),flush=True)
sys.exit(1 if report['failed'] else 0)
