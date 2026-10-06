/** Display adapter for the classic CSS-pixel UI. Game rules never depend on this module. */
const uiDisplay = (() => {
    let factor = 1;
    let percent = 100;
    let fontMode = 'auto';
    let resolutionQuery;
    const mediaRules = new Map();
    const visitedSheets = new WeakSet();
    const mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Resting cadence: an idle game keeps fighting while nobody watches closely. After a quiet
    // period, or while another window has focus, the battlefield repaints less often.
    // Combat timing is unaffected; only drawing is spaced out. Any input restores full cadence.
    const RESTING_AFTER_MS = 20000;
    const RESTING_FRAME_MS = mobileDevice ? 1000 / 20 : 1000 / 30;
    const UNFOCUSED_FRAME_MS = 1000 / 20;
    let lastInputAt = performance.now();
    const markInput = () => { lastInputAt = performance.now(); };
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(type =>
        window.addEventListener(type, markInput, { capture: true, passive: true }));
    window.addEventListener('focus', markInput);
    function restingFrameMs() {
        if (!document.hasFocus()) return UNFOCUSED_FRAME_MS;
        return performance.now() - lastInputAt > RESTING_AFTER_MS ? RESTING_FRAME_MS : 0;
    }

    function mediaText(query) {
        return query.replace(/((?:min-|max-)?(?:width|height)\s*:\s*)([\d.]+)(px|em|rem)/g,
            (_, prefix, value, unit) => `${prefix}${Number(value) * factor}${unit}`);
    }

    function matches(query) { return window.matchMedia(mediaText(query)).matches; }

    // One adapter for legacy viewport units/media queries, preserving the authored cascade.
    // Remove this translation when all styles use logical viewport tokens/container queries.
    // No frame-time traversal or attribute observer: ordinary battle DOM updates are untouched.
    function adaptRules(rules) {
        const pending = Array.from(rules);
        while (pending.length) {
            const rule = pending.pop();
            if (rule.type === CSSRule.MEDIA_RULE) mediaRules.set(rule, rule.media.mediaText);
            if (rule.cssRules) pending.push(...rule.cssRules);
            const imported = rule.styleSheet;
            if (imported && !visitedSheets.has(imported) && new URL(imported.href).origin === window.origin) {
                visitedSheets.add(imported);
                pending.push(...imported.cssRules);
            }
            if (rule.style) adaptStyle(rule.style);
        }
    }

    function adaptStyle(style) {
        for (const property of Array.from(style)) {
            const value = style.getPropertyValue(property);
            if (value.includes('--scale-display-factor')) continue;
            const next = value.replace(/(-?(?:\d*\.)?\d+)(d?vw|d?vh|vmin|vmax)\b/g,
                (_, number, unit) => `calc(${number}${unit} / var(--scale-display-factor, 1))`);
            if (next !== value) style.setProperty(property, next, style.getPropertyPriority(property));
        }
    }

    function registerStyles() {
        for (const sheet of Array.from(document.styleSheets)) {
            if (visitedSheets.has(sheet)) continue;
            // srcdoc previews inherit the parent's security origin, while location.origin is "null".
            if (sheet.href && new URL(sheet.href).origin !== window.origin) continue;
            adaptRules(sheet.cssRules);
            visitedSheets.add(sheet);
        }
        for (const [rule, original] of mediaRules) rule.media.mediaText = mediaText(original);
    }

    function watchResolution() {
        if (resolutionQuery) resolutionQuery.removeEventListener('change', refresh);
        resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        resolutionQuery.addEventListener('change', refresh, { once: true });
    }

    // 윈도우 125% · 150% 같은 소수 배율에서 크롬은 글자를 픽셀 사이(소수 위치)에 찍는다. 1px 획인 도트 글꼴은 그때마다 두 칸에
    // 번져 흐려지므로(2026-10-06 사용자 보고) 자동 모드는 그런 PC 화면에서만 일반 글꼴(body.ui-font-smooth, themes/pixel.css)로 바꾼다.
    function applyFont() {
        const dpr = window.devicePixelRatio || 1;
        const fractionalPc = !mobileDevice && Math.abs(dpr - Math.round(dpr)) > 0.01;
        document.body.classList.toggle('ui-font-smooth', fontMode === 'smooth' || (fontMode === 'auto' && fractionalPc));
        const select = document.getElementById('sel-ui-font');
        if (select) select.value = fontMode;
    }

    /** @param {'auto'|'pixel'|'smooth'} mode stored font choice (normalizeUiFont) */
    function font(mode) {
        fontMode = normalizeUiFont(mode);
        applyFont();
    }

    function apply(value) {
        percent = normalizeUiScale(value);
        // PC: 디스플레이 배율의 정수 배는 살리고 소수 부분만 되돌린다 — 도트가 늘 기기 픽셀의 정수 배로 그려진다.
        // (배율 전체를 되돌리면 Retina · 200% 화면에서 UI가 절반 크기였다: 2 → ×2, 1.25 → ×1, 2.5 → ×2)
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const deviceScale = mobileDevice ? 1 : dpr / Math.floor(dpr + 1e-6);
        const next = percent / 100 / deviceScale;
        const changed = Math.abs(next - factor) > 0.00001;
        factor = next;
        document.documentElement.style.setProperty('--scale-display-factor', String(factor));
        document.documentElement.style.zoom = String(factor);
        registerStyles();
        const select = document.getElementById('sel-ui-scale');
        if (select) select.value = String(percent);
        watchResolution();
        applyFont();
        if (changed) window.dispatchEvent(new Event('resize'));
    }

    function refresh() { apply(percent); }

    function select(value) {
        game.settings.uiScale = normalizeUiScale(value);
        apply(game.settings.uiScale);
        saveGame({ skipCloudSync: false });
    }

    function init() {
        apply(100);
        document.getElementById('sel-ui-scale').addEventListener('change', event => select(event.target.value));
        document.getElementById('sel-ui-font').addEventListener('change', event => {
            game.settings.uiFont = normalizeUiFont(event.target.value);
            font(game.settings.uiFont);
            saveGame({ skipCloudSync: false });
        });
        document.querySelectorAll('[style]').forEach(el => adaptStyle(el.style));
        new MutationObserver(() => registerStyles()).observe(document.head, { childList: true });
    }

    return Object.freeze({ apply, font, init, matches, registerStyles, get factor() { return factor; },
        get battleFrameMs() { return Math.max(mobileDevice ? 1000 / 30 : 22, restingFrameMs()); },
        get explorationFrameMs() { return Math.max(mobileDevice ? 1000 / 30 : 1000 / 60, restingFrameMs()); },
        // Canvas pixels per CSS pixel, capped for fill cost. The canvas is shown with image-rendering:pixelated, so it
        // takes a whole number of device pixels per canvas pixel: a 2.625 phone renders at 1.3125 (×2 on screen)
        // instead of 1.5 (×1.75, which drew every fourth pixel-art column twice as wide as its neighbours).
        get battleRenderScale() {
            const ratio = (window.devicePixelRatio || 1) * factor, cap = mobileDevice ? 1.5 : 2;
            return Math.max(1, ratio / Math.max(1, Math.ceil(ratio / cap - 1e-6)));
        }
    });
})();
safeExposeGlobals({ uiDisplay });
document.addEventListener('DOMContentLoaded', () => uiDisplay.init(), { once: true });
