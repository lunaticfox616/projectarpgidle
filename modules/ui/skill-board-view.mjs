import { listenView, releaseViewEvents } from './view-events.mjs';
import { render, pick, currentKind, kindOf, wornGemHint, boardEngraveHint, openEngrave, createRenderSatellite } from './skill-board-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createSkillBoardView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { render, pick, currentKind, kindOf, wornGemHint, boardEngraveHint };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.renderSatellite = createRenderSatellite(runtime);
    runtime.api = Object.freeze({ render: runtime.handlers.render, pick: runtime.handlers.pick, currentKind: runtime.handlers.currentKind, kindOf: runtime.handlers.kindOf, hint: runtime.handlers.wornGemHint, engraveHint: runtime.handlers.boardEngraveHint , dispose: () => disposeSkillBoard(runtime) });
    listenView(runtime, runtime.deps.document, 'click', event => {
        const engrave = event.target.closest('[data-board-engrave]');
        if (engrave) { openEngrave(runtime, Number(engrave.dataset.boardEngrave)); return; }
        const slot = event.target.closest('[data-board-pick]');
        if (!slot) return;
        const kind = slot.dataset.boardPick;
        if (kind !== 'support') { runtime.state.focusedSkill = { kind, name: slot.dataset.boardGem || '' }; render(runtime, (0, runtime.deps.getUiPlayerStats)()); }
        // 칸을 누르면 룬 칸 창이 바로 뜬다(찬 칸: 등급, 해제, 바꿔 낄 룬 / 빈 칸: 낄 룬).
        if (kind !== runtime.state.pickerKind) pick(runtime, kind, true);
        runtime.deps.gemSlotDialog.open(kind, slot.dataset.boardGem || '');
    });
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.pickerKind = 'active';
    runtime.state.focusedSkill = { kind: 'active', name: '' };
    runtime.state.PICKER_TITLES = Object.freeze({ active: '공격스킬룬', mobility: '이동스킬룬', summon: '소환스킬룬', support: '보조스킬룬', sealed: '봉인한 룬' });
    runtime.state.RING_RADIUS = 96;
    runtime.state.ENGRAVE_HINTS = Object.freeze({ open: '눌러서 넣을 각인을 고릅니다.', next: '눌러서 이 칸을 엽니다.', lock: '앞 칸부터 차례로 엽니다.' });
    runtime.state.GROUP_TONES = Object.freeze({ basic: '#7aa4d6', crafted: '#d9a650', awakened: '#b48ae6' });
}

function disposeSkillBoard(runtime) {
    releaseViewEvents(runtime); runtime.state.focusedSkill = null;
}
