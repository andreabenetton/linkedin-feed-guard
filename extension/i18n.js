/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors
 * UI translations; no page access or network. */
(() => {
'use strict';
const STRINGS = {
  "en": {
    "eyebrow": "LOCAL CONTROL",
    "subtitle": "For LinkedIn. Your posts stay intact.",
    "language": "Language",
    "auto": "Browser default",
    "settings": "Settings",
    "enabled": "Enable Feed Guard",
    "enabledHelp": "Changes apply to open tabs immediately.",
    "renderOffscreen": "Off-screen rendering",
    "renderOffscreenHelp": "Reduces rendering work on distant posts. Does not cap memory use.",
    "pauseOffscreenVideos": "Pause off-screen videos",
    "pauseOffscreenVideosHelp": "Preserves visible, fullscreen and picture-in-picture playback.",
    "pauseHiddenVideos": "Pause videos in background",
    "pauseHiddenVideosHelp": "Does not suspend the tab or reload the feed.",
    "blockTracking": "Experimental network filter",
    "blockTrackingHelp": "Only /li/track on www.linkedin.com, including outside the feed. Off by default.",
    "pageStatus": "Page status",
    "checking": "Checking this page...",
    "posts": "posts detected",
    "deferred": "rendering deferred",
    "paused": "video pauses",
    "feed": "Posts detected",
    "waiting": "Waiting for a feed container",
    "unrecognized": "Feed container found; no posts detected",
    "outside-feed": "Not on the main feed",
    "disabled": "Optimizations disabled",
    "error": "Local error; optimizations stopped",
    "unknown": "Status unavailable",
    "noPage": "Open or reload the LinkedIn feed",
    "noPageHint": "Save drafts, then reload LinkedIn after installing or updating the extension. Check that site access is allowed.",
    "errorHint": "Save drafts and reload the page manually.",
    "unsupportedHint": "This browser does not support deferred rendering. That feature stays inactive.",
    "zeroHint": "Scroll until posts appear, then rescan. If this stays at zero, open Diagnostics and copy the report.",
    "normalHint": "Local counts, not memory savings. Paused videos are not automatically resumed.",
    "ruleOn": "Network filter: ON (1 rule).",
    "ruleOff": "Network filter: off.",
    "ruleMismatch": "The active filter differs from your settings. Disable and reload the extension.",
    "filter-rollback-failed": "Saving settings and restoring the filter failed. Disable and reload the extension.",
    "settings-operation-failed": "Could not apply the settings. Check extension errors and try again.",
    "invalid-settings": "Invalid settings.",
    "invalid-option": "Unsupported setting or value.",
    "workerUnavailable": "The extension service worker is unavailable. Reload the extension and the page.",
    "languageError": "Could not save the language preference. Please try again.",
    "refresh": "Rescan page",
    "help": "Help and privacy",
    "helpError": "Could not open the help page.",
    "diagnostics": "Diagnostics",
    "diagnosticsTitle": "Local diagnostic report",
    "diagnosticsHelp": "Only structural counts and status codes. No post text, names, URLs, cookies or attribute values. Nothing is sent automatically.",
    "diagnosticsError": "No response from this tab. Save drafts, reload LinkedIn, and try again.",
    "copy": "Copy report",
    "copied": "Report copied.",
    "copyManual": "Clipboard access is unavailable. The report is selected; press Ctrl+C (Cmd+C on macOS).",
    "close": "Close",
    "foot": "Local preferences only. No telemetry.",
    "helpTitle": "Keep the feed intact. Reduce unnecessary work.",
    "helpIntro": "LinkedIn Feed Guard {version} is a local beta for Brave and Chromium browsers. It does not delete posts, suspend tabs or reload pages on its own. It is not affiliated with LinkedIn.",
    "helpInstallTitle": "Install or update",
    "helpInstall": "Extract the package to a permanent folder. Open brave://extensions (chrome://extensions in Chrome), enable Developer mode, and load the extension folder that contains manifest.json. To update in place, replace files in your existing extension folder and click Reload. Save drafts and reload LinkedIn tabs afterwards. Do not run two copies together.",
    "helpLanguageTitle": "English and Italian",
    "helpLanguage": "Use the language selector here or in the popup. Browser default selects Italian for an Italian browser interface and English otherwise. Your choice is stored locally and shared between the popup and this help page. Extension names in the browser follow the browser language.",
    "helpDetectionTitle": "How detection works",
    "helpDetection": "The extension recognizes mainFeed containers, component-key list items, supported feed-card markers, and a cautious list-item fallback with an expandable-text-box marker. It handles late-loading containers and attribute changes. It does not treat every article, list item or occurrence of a word as a post.",
    "helpZeroTitle": "If the counter stays at zero",
    "helpZero": "Open https://www.linkedin.com/feed/, wait for actual posts, scroll slightly and choose Rescan page. If the counter is still zero, open Diagnostics. Inspect the report and copy it manually when reporting a problem. A zero count means post rendering and video optimizations are not operating on detected posts; a feed container alone is not proof of success.",
    "helpScopeTitle": "Scope and safe handling",
    "helpScope": "Page and video changes operate only on the main feed (/feed or /feed/). Messaging, profiles, jobs and individual-post pages are excluded. The script is registered on www.linkedin.com so it can detect in-page navigation back to the feed. Frames and shadow-DOM feeds are not supported. The optional network filter applies across www.linkedin.com.",
    "helpRenderingTitle": "Deferred rendering",
    "helpRendering": "Distant cards may receive content-visibility: auto, with a measured intrinsic height. Cards with focus, editors, input fields, open menus or playing media are excluded. The browser can skip rendering, but post nodes and application state remain in memory. No RAM or CPU limit is imposed. Turning the feature off removes its annotations.",
    "helpVideoTitle": "Video behavior",
    "helpVideo": "Videos in detected posts may be paused when off screen or when the tab is hidden. Fullscreen and picture-in-picture playback are excluded. The extension never resumes playback or changes media URLs, volume or account settings. Pausing does not guarantee that buffering or memory allocation stops.",
    "helpFilterTitle": "Optional network filter",
    "helpFilter": "The experimental, disabled-by-default rule blocks XHR/fetch, beacon and image requests to https://www.linkedin.com/li/track and its query or path variants, initiated by www.linkedin.com. It is not a complete tracker blocker or a replacement for Brave Shields. Blocking requests can cause retries or break site behavior. Keep it off during initial testing.",
    "helpPrivacyTitle": "Privacy and permissions",
    "helpPrivacy": "Only six on/off settings and one language preference are stored in local extension storage; no Sync storage is used. Per-tab counts are held in memory. Diagnostics contain the version numbers of the popup and of the page script, fixed status codes, whether Feed Guard is enabled, whether the browser supports deferred rendering, aggregate post, video and selector counts, and JavaScript memory in 50 MB steps; they exclude text, HTML, input values, account IDs, component-key values, titles, URLs, cookies and browsing history. Diagnostics are generated only on request and copied only when you choose to copy. No telemetry, external server, remote scripts or automatic update endpoint is configured.",
    "helpPermissionDetails": "Permissions are storage and declarativeNetRequestWithHostAccess, restricted to https://www.linkedin.com/*. There are no clipboard, cookies, history or debugger permissions. A content script still has technical access to the permitted page DOM; privacy depends on the implementation, not just the permission list.",
    "helpOffTitle": "Disable and remove",
    "helpOff": "The master switch removes rendering annotations and disables the optional filter. Already paused videos remain paused. If you disable, remove or reload the extension from the browser extensions page, save drafts and reload LinkedIn to clear any previous script instance. Do not disable browser security or organizational policies.",
    "helpLimitsTitle": "Validation and limitations",
    "helpLimits": "Automated tests use local synthetic DOMs, real browser layout and media, and simulated extension APIs. This package has not been tested in your authenticated LinkedIn session. Browser policy prevented installation in the test environment, so installed-extension behavior and the DNR engine still need manual testing. No RAM savings, crash fix or support for every LinkedIn layout is guaranteed.",
    "helpLicenseTitle": "License",
    "helpLicense": "GPL-3.0-only. Source code, tests and English documentation are included in the package.",
    "memoryAdvisory": "Long-feed memory warning",
    "memoryAdvisoryHelp": "Suggests reloading the feed when it grows heavy. Never reloads on its own.",
    "heap": "MB JS memory",
    "pressureHint": "This feed is heavy enough to risk an \"Aw, Snap!\" crash. Save drafts, then reload the feed to free memory.",
    "reloadFeed": "Reload feed",
    "reloadError": "Could not reload this tab.",
    "helpMemoryTitle": "Long-feed memory warning",
    "helpMemory": "Every post you scroll past stays in the page: LinkedIn's infinite feed only grows, and a renderer that runs out of memory shows \"Aw, Snap!\". Deferred rendering and video pauses reduce work but cannot release that memory; only a reload does. When the feed reaches 200 detected posts, or the browser reports more than 1200 MB (or half of the limit) of JavaScript memory in use with at least 30 posts, a small notice in the corner offers Reload feed or Later. Later waits for 100 more posts or 25% more memory. The extension never reloads by itself; save drafts first. The popup shows the current JavaScript memory and has the same Reload feed button. The measurement is Chromium's coarse performance.memory value, not the whole tab's memory.",
    "stale": "Reload LinkedIn to activate this version",
    "staleHint": "The page is running a different Feed Guard version. Save drafts and reload the LinkedIn tab."
  },
  "it": {
    "eyebrow": "CONTROLLO LOCALE",
    "subtitle": "Per LinkedIn. I tuoi post restano intatti.",
    "language": "Lingua",
    "auto": "Lingua del browser",
    "settings": "Impostazioni",
    "enabled": "Attiva Feed Guard",
    "enabledHelp": "Le modifiche si applicano subito alle schede aperte.",
    "renderOffscreen": "Rendering fuori schermo",
    "renderOffscreenHelp": "Riduce il lavoro sui post lontani. Non limita la memoria utilizzata.",
    "pauseOffscreenVideos": "Pausa video fuori schermo",
    "pauseOffscreenVideosHelp": "Preserva video visibili, fullscreen e picture-in-picture.",
    "pauseHiddenVideos": "Pausa video in background",
    "pauseHiddenVideosHelp": "Non sospende la scheda e non ricarica il feed.",
    "blockTracking": "Filtro di rete sperimentale",
    "blockTrackingHelp": "Solo /li/track su www.linkedin.com, anche fuori dal feed. Spento inizialmente.",
    "pageStatus": "Stato della pagina",
    "checking": "Verifica della pagina...",
    "posts": "post riconosciuti",
    "deferred": "rendering differito",
    "paused": "pause video",
    "feed": "Post riconosciuti",
    "waiting": "In attesa del contenitore del feed",
    "unrecognized": "Contenitore trovato; nessun post riconosciuto",
    "outside-feed": "Non sei nel feed principale",
    "disabled": "Ottimizzazioni disattivate",
    "error": "Errore locale; ottimizzazioni interrotte",
    "unknown": "Stato non disponibile",
    "noPage": "Apri o ricarica il feed LinkedIn",
    "noPageHint": "Salva le bozze e ricarica LinkedIn dopo installazione o aggiornamento. Verifica che sia consentito l\u2019accesso al sito.",
    "errorHint": "Salva le bozze e ricarica manualmente la pagina.",
    "unsupportedHint": "Il browser non supporta il rendering differito. La funzione resta inattiva.",
    "zeroHint": "Scorri fino a vedere i post e ripeti il rilevamento. Se resta a zero, apri Diagnostica e copia il rapporto.",
    "normalHint": "Conteggi locali, non misure di RAM risparmiata. I video non vengono riavviati automaticamente.",
    "ruleOn": "Filtro di rete: ATTIVO (1 regola).",
    "ruleOff": "Filtro di rete: disattivato.",
    "ruleMismatch": "Il filtro attivo non coincide con le impostazioni. Disabilita e ricarica l\u2019estensione.",
    "filter-rollback-failed": "Salvataggio e ripristino del filtro falliti. Disabilita e ricarica l\u2019estensione.",
    "settings-operation-failed": "Impossibile applicare le impostazioni. Controlla gli errori dell\u2019estensione e riprova.",
    "invalid-settings": "Impostazioni non valide.",
    "invalid-option": "Opzione o valore non consentito.",
    "workerUnavailable": "Il service worker non \u00e8 disponibile. Ricarica l\u2019estensione e la pagina.",
    "languageError": "Impossibile salvare la lingua. Riprova.",
    "refresh": "Rileva di nuovo",
    "help": "Guida e privacy",
    "helpError": "Impossibile aprire la guida.",
    "diagnostics": "Diagnostica",
    "diagnosticsTitle": "Rapporto diagnostico locale",
    "diagnosticsHelp": "Solo conteggi strutturali e codici di stato. Nessun testo, nome, URL, cookie o valore degli attributi. Nessun invio automatico.",
    "diagnosticsError": "Nessuna risposta dalla scheda. Salva le bozze, ricarica LinkedIn e riprova.",
    "copy": "Copia rapporto",
    "copied": "Rapporto copiato.",
    "copyManual": "Appunti non disponibili. Il rapporto \u00e8 selezionato: premi Ctrl+C (Cmd+C su macOS).",
    "close": "Chiudi",
    "foot": "Solo preferenze locali. Nessuna telemetria.",
    "helpTitle": "Mantieni intatto il feed. Riduci il lavoro superfluo.",
    "helpIntro": "LinkedIn Feed Guard {version} \u00e8 una beta locale per Brave e browser Chromium. Non cancella post, non sospende schede e non ricarica pagine di sua iniziativa. Non \u00e8 affiliata a LinkedIn.",
    "helpInstallTitle": "Installazione e aggiornamento",
    "helpInstall": "Estrai il pacchetto in una cartella permanente. Apri brave://extensions (chrome://extensions in Chrome), attiva Modalit\u00e0 sviluppatore e carica la cartella extension contenente manifest.json. Per aggiornare, sostituisci i file nella cartella gi\u00e0 utilizzata e premi Ricarica. Salva le bozze e ricarica poi le schede LinkedIn. Non usare due copie insieme.",
    "helpLanguageTitle": "Italiano e inglese",
    "helpLanguage": "Scegli la lingua qui o nel popup. Lingua del browser seleziona l\u2019italiano per un browser con interfaccia italiana, altrimenti l\u2019inglese. La scelta \u00e8 salvata localmente ed \u00e8 condivisa tra popup e guida. I nomi nell\u2019interfaccia del browser seguono la lingua del browser.",
    "helpDetectionTitle": "Come riconosce i post",
    "helpDetection": "L\u2019estensione riconosce contenitori mainFeed, elementi listitem con componentkey, marcatori noti delle schede del feed e, con prudenza, elementi listitem con il marcatore expandable-text-box. Gestisce contenitori caricati in ritardo e attributi aggiunti successivamente. Non considera post qualunque articolo, elemento di elenco o occorrenza di una parola.",
    "helpZeroTitle": "Se il contatore resta a zero",
    "helpZero": "Apri https://www.linkedin.com/feed/, attendi che appaiano post reali, scorri leggermente e premi Rileva di nuovo. Se resta a zero, apri Diagnostica. Controlla il rapporto e copialo manualmente quando segnali il problema. Zero indica che le ottimizzazioni dei post e dei video non stanno operando su post riconosciuti: trovare un contenitore non dimostra che funzionino.",
    "helpScopeTitle": "Ambito e protezioni",
    "helpScope": "Le modifiche a pagina e video operano solo nel feed principale (/feed o /feed/). Messaggi, profili, lavoro e pagine di singoli post sono esclusi. Lo script \u00e8 registrato su www.linkedin.com per rilevare i ritorni al feed tramite navigazione interna. Feed in iframe o shadow DOM non sono supportati. Il filtro opzionale opera su tutto www.linkedin.com.",
    "helpRenderingTitle": "Rendering differito",
    "helpRendering": "Le schede lontane possono ricevere content-visibility: auto con altezza intrinseca misurata. Sono escluse schede con focus, editor, campi, menu aperti o media in riproduzione. Il browser pu\u00f2 evitarne il rendering, ma nodi e stato applicativo restano in memoria. Non viene imposto un limite a RAM o CPU. Spegnendo la funzione vengono rimosse le sue annotazioni.",
    "helpVideoTitle": "Gestione dei video",
    "helpVideo": "I video nei post riconosciuti possono essere messi in pausa quando sono fuori schermo o la scheda \u00e8 nascosta. Fullscreen e picture-in-picture sono esclusi. L\u2019estensione non riavvia video e non cambia URL, volume o impostazioni dell\u2019account. La pausa non garantisce che buffering e allocazione di memoria cessino.",
    "helpFilterTitle": "Filtro di rete opzionale",
    "helpFilter": "La regola sperimentale, spenta inizialmente, blocca XHR/fetch, beacon e immagini verso https://www.linkedin.com/li/track e le sue varianti di percorso o query, avviati da www.linkedin.com. Non \u00e8 un blocco completo dei tracker e non sostituisce Brave Shields. Bloccare richieste pu\u00f2 provocare tentativi ripetuti o malfunzionamenti. Lasciala spenta durante la prima prova.",
    "helpPrivacyTitle": "Privacy e permessi",
    "helpPrivacy": "Vengono salvate solo sei opzioni booleane e una preferenza di lingua nello storage locale; niente Sync. I contatori delle schede restano in memoria. La diagnostica contiene le versioni del popup e dello script della pagina, codici di stato fissi, se Feed Guard \u00e8 attivo, se il browser supporta il rendering differito conteggi aggregati di post, video e selettori e la memoria JavaScript a passi di 50 MB; esclude testo, HTML, valori dei campi, identificativi, valori componentkey, titoli, URL, cookie e cronologia. Si genera solo su richiesta e si copia solo su tua scelta. Nessuna telemetria, server esterno, script remoto o endpoint di aggiornamento automatico.",
    "helpPermissionDetails": "I permessi sono storage e declarativeNetRequestWithHostAccess, limitati a https://www.linkedin.com/*. Nessun permesso per appunti, cookie, cronologia o debugger. Un content script pu\u00f2 comunque accedere tecnicamente al DOM autorizzato: la privacy dipende anche dal codice, non solo dai permessi.",
    "helpOffTitle": "Disattivazione e rimozione",
    "helpOff": "L\u2019interruttore principale rimuove le annotazioni di rendering e spegne il filtro opzionale. I video gi\u00e0 fermati restano in pausa. Dopo disattivazione, rimozione o ricaricamento dalla pagina delle estensioni, salva le bozze e ricarica LinkedIn per eliminare l\u2019istanza precedente dello script. Non disabilitare protezioni del browser o policy dell\u2019organizzazione.",
    "helpLimitsTitle": "Verifiche e limiti",
    "helpLimits": "I test automatici usano DOM sintetici locali, layout e media del browser reali e API delle estensioni simulate. Il pacchetto non \u00e8 stato provato nella tua sessione LinkedIn autenticata. Le policy del laboratorio impediscono l\u2019installazione: il comportamento dell\u2019estensione installata e il motore DNR richiedono ancora una prova manuale. Nessuna garanzia di risparmio RAM, risoluzione dei crash o compatibilit\u00e0 con ogni layout LinkedIn.",
    "helpLicenseTitle": "Licenza",
    "helpLicense": "GPL-3.0-only. Sorgenti, test e documentazione in inglese sono inclusi nel pacchetto.",
    "memoryAdvisory": "Avviso memoria per feed lunghi",
    "memoryAdvisoryHelp": "Suggerisce di ricaricare il feed quando diventa pesante. Non ricarica mai da solo.",
    "heap": "MB memoria JS",
    "pressureHint": "Il feed \u00e8 abbastanza pesante da rischiare un crash \"Aw, Snap!\". Salva le bozze, poi ricarica il feed per liberare memoria.",
    "reloadFeed": "Ricarica il feed",
    "reloadError": "Impossibile ricaricare la scheda.",
    "helpMemoryTitle": "Avviso memoria per feed lunghi",
    "helpMemory": "Ogni post che scorri resta nella pagina: il feed infinito di LinkedIn cresce soltanto, e quando il processo della scheda esaurisce la memoria compare \"Aw, Snap!\". Il rendering differito e la pausa dei video riducono il lavoro ma non liberano quella memoria: solo una ricarica lo fa. Quando il feed arriva a 200 post riconosciuti, o il browser segnala oltre 1200 MB (o met\u00e0 del limite) di memoria JavaScript in uso con almeno 30 post, un piccolo avviso in un angolo propone Ricarica il feed o Pi\u00f9 tardi. Pi\u00f9 tardi attende altri 100 post o il 25% di memoria in pi\u00f9. L\u2019estensione non ricarica mai da sola: salva prima le bozze. Il popup mostra la memoria JavaScript attuale e ha lo stesso pulsante Ricarica il feed. La misura \u00e8 il valore approssimato performance.memory di Chromium, non la memoria totale della scheda.",
    "stale": "Ricarica LinkedIn per attivare questa versione",
    "staleHint": "La pagina usa una versione diversa di Feed Guard. Salva le bozze e ricarica la scheda LinkedIn."
  }
};
const KEY = 'feedGuardLanguageV1';
let preference = 'auto';
const listeners = new Set();
const valid = value => ['auto', 'en', 'it'].includes(value) ? value : 'auto';
function locale() {
  if (preference !== 'auto') return preference;
  const browser = globalThis.chrome?.i18n?.getUILanguage?.() || navigator.language || 'en';
  return /^it(?:[-_]|$)/i.test(browser) ? 'it' : 'en';
}
// From manifest.json through config.js, so no string carries a version to bump.
const version = () => globalThis.LLGuardConfig?.VERSION ?? '';
function t(key) {
  return (STRINGS[locale()][key] ?? STRINGS.en[key] ?? key).replaceAll('{version}', version());
}
function render() {
  document.documentElement.lang = locale();
  for (const node of document.querySelectorAll('[data-version]')) node.textContent = version();
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
  const select = document.getElementById('language');
  if (select) select.value = preference;
  for (const fn of listeners) fn();
}
async function init() {
  const saved = await chrome.storage.local.get(KEY);
  preference = valid(saved[KEY]); render();
}
async function set(value) {
  const next = valid(value);
  await chrome.storage.local.set({[KEY]: next});
  preference = next; render();
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, KEY)) {
    preference = valid(changes[KEY].newValue); render();
  }
});
globalThis.LLGuardI18n = Object.freeze({t, init, set, render, locale, key: KEY,
  preference: () => preference, subscribe: fn => listeners.add(fn)});
})();
