import { RETIRED_TAB_BUTTON_IDS } from './saved-retired-definitions.mjs';

/** 루프 관문 대기 플래그. 오프라인에서 채운 관문 표시는 관문이 남아 있을 때만 의미가 있다. */
export function normalizeLoopGateFlags(state) {
    state.pendingLoopDecision = !!state.pendingLoopDecision;
    state.pendingLoopReady = !!state.pendingLoopReady;
    state.loopGateOffline = state.loopGateOffline === true && (state.pendingLoopDecision || state.pendingLoopReady);
}

/** 자동화 설정: 자동 이동(기본 켬) · 자동 환생(기본 끔) · 다음 루프 직업(매번 고르기 | 같은 직업 유지). */
export function normalizeAutomationSettings(settings) {
    settings.autoMove = settings.autoMove !== false;
    settings.autoLoop = settings.autoLoop === true;
    settings.autoRediveOcean = settings.autoRediveOcean === true; // 심해 자동 재잠수(기본 끔)
    settings.autoLoopClass = settings.autoLoopClass === 'keep' ? 'keep' : 'ask';
}

/** Saved menu layouts are independent value copies; legacy shared layouts seed both once. */
export function normalizeTabLayoutSettings(settings) {
    const normalizeOrder = (list, pattern) => Array.from(new Set(
        (Array.isArray(list) ? list : []).filter(id => typeof id === 'string' && pattern.test(id) && !RETIRED_TAB_BUTTON_IDS.includes(id))
    ));
    const buttonId = /^btn-(tab-[a-z]+|map-complete-action-picker)$/;
    const layouts = {};
    for (const platform of ['desktop', 'mobile']) {
        const candidate = settings.tabLayouts && settings.tabLayouts[platform];
        const source = candidate && typeof candidate === 'object' ? candidate : settings;
        const placements = source.tabPlacement && typeof source.tabPlacement === 'object' ? source.tabPlacement : {};
        layouts[platform] = {
            tabOrder: normalizeOrder(source.tabOrder, buttonId),
            tabPlacement: Object.fromEntries(Object.entries(placements)
                .filter(([id, place]) => buttonId.test(id) && ['top', 'bottom'].includes(place) && !RETIRED_TAB_BUTTON_IDS.includes(id))),
            tabGroupOrder: normalizeOrder(source.tabGroupOrder, /^(character|growth|content|gear|etc)$/)
        };
    }
    return layouts;
}

/** 전술 규칙만 남긴다: 예전 컨디션 룬 규칙(행동이 없거나 condition_gem)은 버린다. */
export function normalizeSavedTacticRules(deps, raw) {
    const rules = Array.isArray(raw) ? raw.filter(rule => rule && typeof rule === 'object') : [];
    return rules.filter(rule => rule.actionType && rule.actionType !== 'condition_gem').map(rule => (0, deps.normalizeConditionPatternRule)({ ...rule }));
}
