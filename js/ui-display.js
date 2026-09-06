/** Display adapter for the classic CSS-pixel UI. Game rules never depend on this module. */
const uiDisplay = (() => {
    let factor = 1;
    let percent = 100;
    let resolutionQuery;
    const mediaRules = new Map();
    const visitedSheets = new WeakSet();
    const mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
            if (rule.style) adaptStyle(rule.style);
        }
    }

    function adaptStyle(style) {
        for (const property of Array.from(style)) {
            const value = style.getPropertyValue(property);
            if (value.includes('--ui-display-factor')) continue;
            const next = value.replace(/(-?(?:\d*\.)?\d+)(d?vw|d?vh|vmin|vmax)\b/g,
                (_, number, unit) => `calc(${number}${unit} / var(--ui-display-factor, 1))`);
            if (next !== value) style.setProperty(property, next, style.getPropertyPriority(property));
        }
    }

    function registerStyles() {
        for (const sheet of Array.from(document.styleSheets)) {
            if (visitedSheets.has(sheet)) continue;
            if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
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

    function apply(value) {
        percent = normalizeUiScale(value);
        const deviceScale = mobileDevice ? 1 : Math.max(1, window.devicePixelRatio || 1);
        const next = percent / 100 / deviceScale;
        const changed = Math.abs(next - factor) > 0.00001;
        factor = next;
        document.documentElement.style.setProperty('--ui-display-factor', String(factor));
        document.documentElement.style.zoom = String(factor);
        registerStyles();
        const select = document.getElementById('sel-ui-scale');
        if (select) select.value = String(percent);
        watchResolution();
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
        document.querySelectorAll('[style]').forEach(el => adaptStyle(el.style));
        new MutationObserver(() => registerStyles()).observe(document.head, { childList: true });
    }

    return Object.freeze({ apply, init, matches, registerStyles, get factor() { return factor; } });
})();
safeExposeGlobals({ uiDisplay });
document.addEventListener('DOMContentLoaded', () => uiDisplay.init(), { once: true });
