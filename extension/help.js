/* SPDX-License-Identifier: GPL-3.0-only
 * SPDX-FileCopyrightText: 2026 LinkedIn Feed Guard contributors */
(() => {
  'use strict';
  const I18n = globalThis.LLGuardI18n;
  const select = document.getElementById('language');
  const error = document.getElementById('language-error');
  function failed() { error.textContent = I18n.t('languageError'); error.hidden = false; }
  select.addEventListener('change', async () => {
    select.disabled = true;
    try { await I18n.set(select.value); error.hidden = true; }
    catch { select.value = I18n.preference(); failed(); }
    finally { select.disabled = false; }
  });
  I18n.subscribe(() => { if (!error.hidden) error.textContent = I18n.t('languageError'); });
  I18n.render();
  void I18n.init().catch(failed);
})();
