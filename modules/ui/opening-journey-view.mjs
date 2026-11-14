import { listenView, releaseViewEvents } from './view-events.mjs';
import { dropIntro } from './opening-intro.mjs';
import { mark, onBattlefieldPress, holds, hushes, lying, active, lesson, fresh, coarse } from './opening-lessons.mjs';
import { onKey, tick, afterStartPick, init } from './opening-flow.mjs';

export function createOpeningJourneyView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    const handlers = { mark, onKey, tick, onBattlefieldPress, holds, hushes, lying, afterStartPick, active, lesson, init };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = OpeningJourneyViewApi(runtime);
    installOpeningJourneyViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.KEY = Object.freeze({ intro: 'opening_intro', rise: 'opening_rise', move: 'opening_move', attack: 'opening_attack', done: 'opening_done' });
    runtime.state.REPLACED = Object.freeze(['story_prologue']);
    runtime.state.STAGE_REPLACED = Object.freeze(['story_act_1_start', 'tutorial_battle_basics']);
    runtime.state.TICK_MS = 150;
    runtime.state.LEAVE_MS = 900;
    runtime.state.REVEAL_MS = 1100;
    runtime.state.CARD_GAP = 8;
    runtime.state.intro = null;
    runtime.state.rising = null;
    runtime.state.movedFrom = null;
    runtime.state.hintEl = null;
    runtime.state.hintTop = 0;
    runtime.state.hintBelow = false;
    runtime.state.hintField = '';
    runtime.state.wakeEl = null;
    runtime.state.autoHint = null;
    runtime.state.heldAuto = null;
    runtime.state.introReturnFocus = null;
    runtime.state.introOwner = null;
    runtime.state.owner = runtime.deps.game;
    runtime.state.introTimers = new Set();
    runtime.state.tickTimer = null;
    runtime.state.SIDES = Object.freeze({ east: '오른쪽', west: '왼쪽', north: '위쪽', south: '아래쪽' });
    runtime.state.HINTS = {
        rise: () => (0, runtime.deps._t)(coarse(runtime) ? '쓰러진 캐릭터를 눌러 깨우세요' : '쓰러진 캐릭터를 클릭하거나 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 키로 깨우세요'),
        move: () => (0, runtime.deps._t)(coarse(runtime) ? '바닥을 눌러 움직이세요' : '바닥을 클릭하거나 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 키로 움직이세요'),
        attack: side => `${side ? (0, runtime.deps._t)('{SIDES}으로 가서 하켄을 구하세요', { SIDES: (0, runtime.deps._t)(runtime.state.SIDES[side]) }) : (0, runtime.deps._t)('하켄을 치는 괴물에게 다가가세요')}. ${(0, runtime.deps._t)('가까이 가면 자동으로 공격합니다')}`,
        go: side => (0, runtime.deps._t)('{SIDES} 문으로 나아가세요', { SIDES: runtime.state.SIDES[side] ? (0, runtime.deps._t)(runtime.state.SIDES[side]) : (0, runtime.deps._t)('앞쪽') }),
        pickup: () => (0, runtime.deps._t)('떨어진 무기를 누르거나 그 위로 걸어가 주우세요'),
        equip: () => (0, runtime.deps._t)('장비 창에서 주운 무기를 장착하세요'),
        auto: () => (0, runtime.deps._t)('오른쪽 위 자동 단추를 눌러 자동 사냥을 켜세요')
    };
    runtime.state.SYSTEM_CUES = Object.freeze({
        'tab-map': '다음 지역 지도 보기',
        'tab-items': '첫 장비 살펴보기',
        'tab-character': '달라진 능력치 보기',
        'tab-journal': '새 기록 읽기',
        'tab-trade': 'NPC 상점 보기'
    });
    runtime.state.LESSON_ORDER = Object.freeze(['rise', 'move', 'attack', 'pickup', 'equip', 'auto']);
    runtime.state.LESSON_TITLES = Object.freeze({ rise: '깨어나기', move: '움직이기', attack: '하켄 구하기', go: '하켄 구하기', pickup: '무기 줍기', equip: '무기 장착하기', auto: '자동 사냥' });
}

function OpeningJourneyViewApi(runtime) {
    const api = {
        holds: runtime.handlers.holds,
        hushes: runtime.handlers.hushes,
        lying: runtime.handlers.lying,
        afterStartPick: runtime.handlers.afterStartPick,
        autoLocked: runtime.handlers.active,
        lesson: runtime.handlers.lesson,
        introOpen: () => runtime.active && (!!runtime.state.intro || fresh(runtime))
    };
    api.dispose = () => disposeOpeningJourneyView(runtime);
    return Object.freeze(api);
}

function installOpeningJourneyViewEvents(runtime) {
    if (typeof runtime.deps.document === 'object' && runtime.deps.document.readyState !== 'loading') init(runtime);
    else if (typeof runtime.deps.document === 'object') listenView(runtime, runtime.deps.document, 'DOMContentLoaded', runtime.handlers.init, { once: true });
}

function disposeOpeningJourneyView(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    runtime.deps.clearInterval(runtime.state.tickTimer);
    runtime.state.tickTimer = null;
    dropIntro(runtime);
    runtime.state.hintEl?.remove();
    runtime.state.wakeEl?.remove();
    runtime.state.hintEl = runtime.state.wakeEl = null;
    runtime.deps.document.getElementById('btn-act-exploration-auto')?.classList.remove('is-opening-glow');
    runtime.deps.document.getElementById('tab-battle')?.style.removeProperty('--lesson-bottom');
}
