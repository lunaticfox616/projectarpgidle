/** Display adapter for the classic CSS-pixel UI. Game rules never depend on this module. */
const uiDisplay = (() => {
    let factor = 1;
    let percent = 100;
    let resolutionQuery;
    let sideBattleHudQuery;
    const mediaRules = new Map();
    const visitedSheets = new WeakSet();
    // iPadOS Safari asks for desktop pages and identifies as Mac; it still needs the mobile draw budget.
    const mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // PC 배율 단계(2026-10-27): 도트 글꼴은 CSS 1px이 기기 화소의 정수배일 때만 또렷하다. 1080p와 QHD(윈도우 100~175%)에서는 100%와 200%,
    // 윈도우 200%의 4K에서는 세 단계 모두 정수배다. 정수배가 아닌 단계(1080p의 150%)에서는 글자만 일반 글꼴로 바꾼다(html.ui-smooth-text,
    // css/tokens.css). 휴대폰은 기기 비율이 소수(2.625 등)라 또렷한 단계가 없어 옛 열 단계를 그대로 둔다.
    const PC_SCALE_STEPS = [100, 150, 200];
    const TARGET_CSS_WIDTH = 1920;   // 처음 기본값: 화면이 1080p 한 장쯤으로 보이는 배수(4K 윈도우 150%는 200%, 윈도우 200%는 100%, QHD는 100%)
    function floorDpr(dpr) { return Math.max(1, Math.floor((dpr || 1) + 1e-6)); }
    /** 단계마다 CSS 1px이 되는 기기 화소 수(윈도우 배율의 소수 부분은 apply가 되돌린다). */
    function deviceMultiple(step, dpr) { return step / 100 * floorDpr(dpr); }
    function isCrispStep(step, dpr) { const multiple = deviceMultiple(step, dpr); return Math.abs(multiple - Math.round(multiple)) < 1e-6; }
    /** 저장된 값(옛 열 단계 포함)을 PC 단계로: 가장 가까운 것, 같은 거리면 또렷한 쪽, 그래도 같으면 작은 쪽. */
    function pcScaleStep(value, dpr) {
        const wanted = normalizeUiScale(value);
        return PC_SCALE_STEPS.slice().sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted)
            || Number(isCrispStep(b, dpr)) - Number(isCrispStep(a, dpr)) || a - b)[0];
    }
    /** 처음 실행의 기본값: 또렷한 단계 가운데 화면 가로(CSS px)가 TARGET_CSS_WIDTH에 가장 가까운 것, 같으면 작은 단계. */
    function recommendedScale(deviceWidth, dpr) {
        const distance = step => Math.abs(deviceWidth / deviceMultiple(step, dpr) - TARGET_CSS_WIDTH);
        return PC_SCALE_STEPS.filter(step => isCrispStep(step, dpr)).sort((a, b) => distance(a) - distance(b) || a - b)[0];
    }
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

    function apply(value) {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        percent = mobileDevice ? normalizeUiScale(value) : pcScaleStep(value, dpr);
        // PC: 디스플레이 배율의 정수 배는 살리고 소수 부분만 되돌린다 — 도트가 늘 기기 픽셀의 정수 배로 그려진다.
        // (배율 전체를 되돌리면 Retina · 200% 화면에서 UI가 절반 크기였다: 2 → ×2, 1.25 → ×1, 2.5 → ×2)
        const deviceScale = mobileDevice ? 1 : dpr / Math.floor(dpr + 1e-6);
        const next = percent / 100 / deviceScale;
        const changed = Math.abs(next - factor) > 0.00001;
        factor = next;
        // Reuse the MediaQueryList in drawing; its matches value follows resize without a frame-time DOM measure.
        if (changed || !sideBattleHudQuery) sideBattleHudQuery = window.matchMedia(mediaText('(max-width: 1080px) and (orientation: landscape) and (max-height: 600px)'));
        document.documentElement.style.setProperty('--scale-display-factor', String(factor));
        // 기기 픽셀 ÷ CSS 1px(배율과 확대를 합친 값): 도트 그림을 기기 픽셀의 정수배로 맞출 때 쓴다(css/themes/pixel-hud.css 스킬룬 칸)
        document.documentElement.style.setProperty('--device-ratio', String(dpr * factor));
        document.documentElement.style.zoom = String(factor);
        // 정수배가 아닌 단계: 도트 글꼴이 번지므로 글자만 일반 글꼴로(css/tokens.css :root.ui-smooth-text)
        document.documentElement.classList.toggle('ui-smooth-text', !mobileDevice && !isCrispStep(percent, dpr));
        registerStyles();
        syncScaleSelect(dpr);
        watchResolution();
        if (changed) window.dispatchEvent(new Event('resize'));
    }

    function refresh() { apply(percent); }

    function select(value) {
        game.settings.uiScale = normalizeUiScale(value);
        game.settings.uiScaleChosen = true;   // 사용자가 고른 뒤에는 처음 기본값 계산을 하지 않는다
        apply(game.settings.uiScale);
        saveGame({ skipCloudSync: false });
    }

    /** PC 선택 상자: 세 단계와 기기에 맞춘 꼬리표. 또렷한 단계는 (추천), 아닌 단계는 (글꼴 바꿈). 설명 줄도 함께 바꾼다. 휴대폰은 index.html의 열 단계 그대로. */
    function syncScaleSelect(dpr) {
        const select = document.getElementById('sel-ui-scale');
        if (!select) return;
        if (!mobileDevice) {
            const labels = PC_SCALE_STEPS.map(step => `${step}% ${isCrispStep(step, dpr) ? '(추천)' : '(글꼴 바꿈)'}`).join('|');
            if (select.dataset.labels !== labels) {
                select.dataset.labels = labels;
                select.innerHTML = labels.split('|').map((label, index) => `<option value="${PC_SCALE_STEPS[index]}">${label}</option>`).join('');
                const hint = document.querySelector('label[for="sel-ui-scale"] + small');
                if (hint) hint.textContent = '메뉴와 글자의 크기. (추천)은 도트가 또렷한 배율이고, 글꼴 바꿈 배율은 글자를 일반 글꼴로 보입니다.';
            }
        }
        select.value = String(percent);
    }

    /** 저장된 설정의 배율을 적용한다. 사용자가 고른 적이 없으면(uiScaleChosen이 true가 아니고 값이 기본 100) 화면에 맞는 추천값을 쓰고,
     * 적용한 단계를 설정에 되돌려 적는다(옛 열 단계 값은 PC 단계로 바뀐다). */
    function applySaved(settings) {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const chosen = settings.uiScaleChosen === true || normalizeUiScale(settings.uiScale) !== 100;
        if (!mobileDevice && !chosen) settings.uiScale = recommendedScale((window.screen ? window.screen.width : 1920) * dpr, dpr);
        apply(settings.uiScale);
        settings.uiScale = percent;
    }

    function init() {
        apply(100);
        document.getElementById('sel-ui-scale').addEventListener('change', event => select(event.target.value));
        document.querySelectorAll('[style]').forEach(el => adaptStyle(el.style));
        new MutationObserver(() => registerStyles()).observe(document.head, { childList: true });
    }

    return Object.freeze({ apply, applySaved, init, matches, registerStyles, recommendedScale, isCrispStep, pcScaleStep, get factor() { return factor; },
        get battleHudAtSide() { return !!sideBattleHudQuery && sideBattleHudQuery.matches; },
        // Time since the last input: a long gap means the player is away (an idle run must not stop on a reward window).
        get inputIdleMs() { return performance.now() - lastInputAt; },
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
