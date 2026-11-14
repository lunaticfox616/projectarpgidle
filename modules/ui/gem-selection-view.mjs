import { listenView, releaseViewEvents } from './view-events.mjs';
import { act, open, close, position, quickEquip } from './gem-selection-actions.mjs';
import { application, indicators, targetRows, targetCount, targetDetails, effectText, summonEffect, skillSummary, migrationNotice } from './gem-selection-summary.mjs';
import { previewStats, compareHtml } from './gem-selection-comparison.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createGemSelectionView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { act, open, close, application, previewStats, compareHtml, indicators, targetRows, targetCount, targetDetails, effectText, summonEffect, skillSummary, migrationNotice, position, quickEquip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ open: runtime.handlers.open, close: runtime.handlers.close, application: runtime.handlers.application, preview: runtime.handlers.previewStats, compareHtml: runtime.handlers.compareHtml,
        indicators: runtime.handlers.indicators, targetRows: runtime.handlers.targetRows, targetCount: runtime.handlers.targetCount, targetDetails: runtime.handlers.targetDetails, effectText: runtime.handlers.effectText, summonEffect: runtime.handlers.summonEffect, skillSummary: runtime.handlers.skillSummary, migrationNotice: runtime.handlers.migrationNotice , dispose: () => disposeGemSelection(runtime) });
    listenView(runtime, runtime.deps.document, 'scroll', runtime.handlers.position, true);
    listenView(runtime, runtime.deps.document, 'dblclick', runtime.handlers.quickEquip);
    listenView(runtime, runtime.deps.window, 'resize', runtime.handlers.position);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.POPOVER_GAP = 8;
    runtime.state.selection = null;
    runtime.state.TARGET_LABELS = Object.freeze({ main: '주 공격', mobility: '이동', summon: '소환' });
    runtime.state.TARGET_STATES = Object.freeze({ on: '적용', off: '태그가 맞지 않음', empty: '장착한 스킬 없음', na: '소환수 대응 효과 없음', buff: '사역룬은 보조 대상 아님' });
    runtime.state.ACTIONS = Object.freeze({
        equip: ({ type, name }) => (type === 'support' ? (0, runtime.deps.toggleSupport)(name) : (0, runtime.deps.changeSkill)(name)),
        enhance: ({ name }) => (0, runtime.deps.openEquippedGemManagement)(name),
        'summon-more': ({ name }) => (0, runtime.deps.changeSummonSkillCount)(name, 1),
        'summon-less': ({ name }) => (0, runtime.deps.changeSummonSkillCount)(name, -1),
        seal: ({ type, name }) => (type === 'support' ? (0, runtime.deps.sealSupportGem)(name) : (0, runtime.deps.sealSkillGem)(name)),
        tier: ({ name }, button) => (0, runtime.deps.setSupportActiveTier)(name, Number(button.dataset.tier))
    });
}

function disposeGemSelection(runtime) {
    releaseViewEvents(runtime); close(runtime); if (runtime.state.ownsPanel) runtime.state.panel?.remove(); runtime.state.panel = null;
}
