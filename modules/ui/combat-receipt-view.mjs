import { updateCombatCurrencyHud } from './combat-currency-hud.mjs';
import { announce } from './loot-currency-notices.mjs';
import { announceGemReward } from './loot-rune-notices.mjs';
import { announceJewelReward, announceCore, announceDropVariant } from './loot-item-notices.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCombatReceiptView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, owner: deps.game, timers: new Set(), listeners: [] };
    const handlers = { announce };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ update: () => {
            if (!runtime.active) return;
            syncReceiptOwner(runtime);
            updateCombatCurrencyHud(runtime);
        }, dispose: () => disposeCombatReceipts(runtime) });
    listenReceipt(runtime, 'project-idle:currency-acquired',runtime.handlers.announce);
    listenReceipt(runtime, 'project-idle:room-invader',event=>{
        const [line,tone]=runtime.state.ROOM_INVADER_LINES[event.detail.kind];
        (0, runtime.deps.addLog)(line(event.detail.name),tone);
    });
    listenReceipt(runtime, 'project-idle:gem-loot-received',event=>{
        if (event.detail?.deferred) (0, runtime.deps.checkUnlocks)();
        // 체이싱 룬(data/skills.js chase, 2026-11-12 사용자): 체이싱 코어와 같은 알림(방치 정산 중에는 말고).
        const name=event.detail?.gem?.name;
        if(name && runtime.deps.SKILL_DB[name]?.chase && !runtime.deps.game.isBackgroundCalculation)(0, runtime.deps.dispatchRuntimeEvent)('incident',{text:(0, runtime.deps._t)('체이싱 룬을 획득했습니다. 「{name}」', { name: (0, runtime.deps._t)(name) }),tone:'chase',chase:true});
        announceGemReward(runtime, event.detail);
    });
    listenReceipt(runtime, 'project-idle:jewel-drop-received',event=>announceJewelReward(runtime, event.detail));
    listenReceipt(runtime, 'project-idle:core-item-received',event=>announceCore(runtime, event.detail));
    listenReceipt(runtime, 'project-idle:equipment-drop-variant',event=>announceDropVariant(runtime, event.detail));
    listenReceipt(runtime, 'project-idle:exploration-departed',event=>{
        if(event.detail.background)return;
        (0, runtime.deps.updateStaticUI)();(0, runtime.deps.queueImportantSave)(220);
    });
    return runtime.api;
}

function listenReceipt(runtime, type, handler) {
    listenView(runtime, runtime.deps.window, type, event => {
        if (!runtime.active) return;
        syncReceiptOwner(runtime);
        handler(event);
    });
}

function syncReceiptOwner(runtime) {
    if (runtime.owner === runtime.deps.game) return;
    for (const timer of runtime.timers) runtime.deps.clearTimeout(timer);
    runtime.timers.clear();
    runtime.state.drawn = '';
    runtime.state.root = null;
    runtime.owner = runtime.deps.game;
}

function disposeCombatReceipts(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    for (const timer of runtime.timers) runtime.deps.clearTimeout(timer);
    runtime.timers.clear();
    runtime.state.root = null;
}

function initialize(runtime) {
    runtime.state.keys = null;
    runtime.state.drawn = '';
    runtime.state.FIRST_USE = {
        roots:['craft_roots','제작 뿌리','제작 뿌리를 얻었습니다.\n‘장비 → 제작실’의 ‘뿌리 함께 사용’에서 걸어 두면 그 뿌리가 바꾸는 다음 제작 한 번에 쓰입니다.'],
        memoryImprint:['memory_chisel','기억 조각칼','기억 조각칼을 얻었습니다.\n‘장비 → 제작실’에서 장비의 지금 추가 옵션을 새겨 두면, 뒤에 제작이 마음에 들지 않을 때 그 옵션으로 한 번 되돌릴 수 있습니다.']
    };
    runtime.state.RUNE_UPGRADE_NOTICE_GAIN = 1.1;
    runtime.state.ROOM_INVADER_LINES = Object.freeze({arrived:[name=>`🩸 ${name}${(0, runtime.deps.pickParticle)(name,'이','가')} 들이닥쳤습니다!`,'attack-monster'],twin:[()=>'🩸 보스가 둘입니다!','attack-monster'],slain:[name=>`🩸 ${name}${(0, runtime.deps.pickParticle)(name,'을','를')} 쓰러뜨렸습니다!`,'loot-unique']});
}
