import { createLocalization } from './browser/localization.mjs';
// Lazy packs retain release-hashed link URLs and are loaded only when requested.
const catalog = [
    { code: 'en', name: 'English', global: 'LANGUAGE_PACK_EN' },
    { code: 'ja', name: '日本語', global: 'LANGUAGE_PACK_JA' },
    { code: 'zh-CN', name: '简体中文', global: 'LANGUAGE_PACK_ZH_CN' },
    { code: 'zh-TW', name: '繁體中文', global: 'LANGUAGE_PACK_ZH_TW' }
];
const i18n = createLocalization(LANGUAGE_PACK_KO, catalog, {
    window, document, location, console,
    CustomEvent: typeof CustomEvent === 'function' ? CustomEvent : undefined,
    getComputedStyle: typeof getComputedStyle === 'function' ? element => getComputedStyle(element) : undefined,
    setTimeout: function scheduleLocaleDeadline(fn, ms) { return setTimeout(fn, ms); },
    clearTimeout: function cancelLocaleDeadline(id) { clearTimeout(id); }
});
const _t = (key, params) => i18n.t(key, params);
safeExposeGlobals({ i18n, _t });
