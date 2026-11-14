import { listenView, releaseViewEvents } from './view-events.mjs';
import { cancelViewFrames } from './view-frames.mjs';
import { canUseBud, skillBoardShown, supportStep, equipped, canEngrave, engraveStep, craftShown, craftStep, shopStep, salvageStep, beginSalvage, createStep, salvageCandidates, supportChoices, sampleAttackRune, tabShown, engraveRune, engravings, craftChoices, normalHelmet, shown, shopNpc, affordableGear } from './system-tutorial-steps.mjs';
import { offer, visit, startShopSalvage, refreshSystemGuide } from './system-tutorial-actions.mjs';

export function createSystemTutorialView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    const handlers = { canUseBud, offer, skillBoardShown, supportStep, equipped, canEngrave, engraveStep, craftShown, craftStep, shopStep, salvageStep, beginSalvage, visit, startShopSalvage, refreshSystemGuide };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);
    runtime.handlers.step = createStep();
    runtime.api = SystemTutorialViewApi(runtime);
    installSystemTutorialViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.slotDialog = '#gem-slot-dialog .is-kind-support';
    runtime.state.engraveDialog = '#gem-engrave-slot-overlay';
    runtime.state.craftPicker = '#craft-item-picker-overlay[open]';
    runtime.state.catalog = '.cl-catalog[open]';
    runtime.state.npcDialog = '#npc-dialog[open]';
    runtime.state.bagCard = '#ui-inventory-list .equipment-grid-item';
    runtime.state.SALVAGE_RARITIES = Object.freeze({ magicBud: ['normal', 'magic'], formlessDew: ['rare'] });
    runtime.state.lessons = [supportLesson(runtime), engraveLesson(runtime), craftLesson(runtime), shopLesson(runtime), salvageLesson(runtime)];
    runtime.state.guides = Object.fromEntries(runtime.state.lessons.map(lesson => [lesson.key, lesson]));
    runtime.state.visits = new Map([
        ['skill-tab-equip', ['tutorial_support_equip', 'tutorial_rune_engrave']],
        ['skill-tab-enhance', ['tutorial_rune_engrave']],
        ['item-tab-craft', ['tutorial_craft_gear']],
        ['npc-shop', ['tutorial_shop_buy']]
    ]);
}

function SystemTutorialViewApi(runtime) {
    const api = {
        lessons: runtime.state.lessons,
        guides: runtime.state.guides,
        visit: runtime.handlers.visit,
        canGuideSalvage: currency => salvageCandidates(runtime, currency).length > 0,
        startShopSalvage: runtime.handlers.startShopSalvage
    };
    api.dispose = () => disposeSystemTutorialView(runtime);
    return Object.freeze(api);
}

function installSystemTutorialViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.refreshSystemGuide, true);
    listenView(runtime, runtime.deps.document, 'keydown', runtime.handlers.refreshSystemGuide, true);
    listenView(runtime, runtime.deps.document, 'close', runtime.handlers.refreshSystemGuide, true);
}

function disposeSystemTutorialView(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    cancelViewFrames(runtime);
}

function supportLesson(runtime) {
    return { key: 'tutorial_support_equip', tabId: 'tab-skills', unlock: 'support', title: '보조스킬룬 장착',
        body: '빈 보조 칸을 열고, 적용 대상과 공명 비용을 확인해 룬을 장착합니다.',
        view: runtime.handlers.skillBoardShown, available: () => supportChoices(runtime).length > 0, step: runtime.handlers.supportStep,
        begin: () => ({ worn: new Set(equipped(runtime)), choices: supportChoices(runtime) }), read: runtime.handlers.equipped,
        completed: (current, before) => current.some(name => !before.worn.has(name)),
        result: () => '보조스킬룬을 장착했습니다.',
        prepare: () => {
            sampleAttackRune(runtime);
            runtime.deps.game.contentProgression.inherited.push('support');
            runtime.deps.gemDropRewards.grant(runtime.deps.game, { kind: 'support', name: '가속', tier: 1 });
            return () => runtime.deps.selectionDialog.close('gem-slot-dialog');
    } };
}

function engraveLesson(runtime) {
    return { key: 'tutorial_rune_engrave', tabId: 'tab-skills', unlock: 'engraving', title: '스킬룬 각인',
        body: '공격 룬의 빈 각인 칸에 창공의 정수를 써서 효과를 넣습니다.',
        view: () => tabShown(runtime, 'tab-skills') && ['skill-tab-equip', 'skill-tab-enhance'].includes(runtime.deps.game.skillSubtab),
        available: runtime.handlers.canEngrave, step: runtime.handlers.engraveStep,
        begin: () => ({ rune: engraveRune(runtime), effects: new Set(engravings(runtime, engraveRune(runtime))) }), read: () => runtime.deps.game.currencies.skyEssence,
        completed: (_, before) => engravings(runtime, before.rune).some(id => !before.effects.has(id)),
        result: () => '공격 룬에 각인을 넣었습니다.',
        prepare: () => {
            sampleAttackRune(runtime);
            runtime.deps.game.contentProgression.inherited.push('engraving', 'gemForge');
            runtime.deps.game.currencies.skyEssence = 1;
            return runtime.deps.closeGemEngraveSlotOverlay;
    } };
}

function craftLesson(runtime) {
    return { key: 'tutorial_craft_gear', tabId: 'tab-items', unlock: 'craft', title: '첫 장비 제작',
        body: '일반 장비를 골라 마법의 새싹으로 추가 옵션을 붙입니다.',
        view: runtime.handlers.craftShown, available: () => runtime.deps.contentProgression.isUnlocked('craft') && !runtime.deps.game.woodsmanBuildLock && runtime.deps.game.currencies.magicBud > 0 && craftChoices(runtime).length > 0,
        open: () => (0, runtime.deps.switchItemSubtab)('item-tab-craft'), step: runtime.handlers.craftStep,
        begin: () => ({ items: craftChoices(runtime), buds: runtime.deps.game.currencies.magicBud }), read: () => runtime.deps.game.currencies.magicBud,
        completed: (buds, before) => buds < before.buds && before.items.some(item => item.rarity === 'magic'),
        result: () => '장비에 새 옵션을 붙였습니다.',
        prepare: () => {
            const ref = (0, runtime.deps.getCraftSelectionRef)(), worn = (0, runtime.deps.isCraftSelectionEquip)();
            (0, runtime.deps.clearCraftSelection)();
            runtime.deps.game.contentProgression.inherited.push('craft');
            runtime.deps.game.equipment['투구'] = normalHelmet(runtime);
            runtime.deps.game.currencies.magicBud = 1;
            return () => {
                runtime.deps.window.closeCraftItemPickerOverlay();
                runtime.deps.document.querySelector(runtime.state.catalog)?.close();
                (0, runtime.deps.clearCraftSelection)();
                if (ref !== null) (0, runtime.deps.selectForCrafting)(ref, worn);
            };
    } };
}

function shopLesson(runtime) {
    return { key: 'tutorial_shop_buy', tabId: 'tab-trade', gate: () => runtime.deps.contentProgression.npcsMet(runtime.deps.game), title: 'NPC 상점에서 구매',
        body: '상점에서 장비를 골라 옵션과 가격을 확인한 뒤 구매합니다.',
        view: () => shown(runtime, `${runtime.state.npcDialog} :is([data-npc-topic="shop"], [data-npc-shop])`),
        available: () => runtime.deps.contentProgression.canOpen('tab-trade') && !!shopNpc(runtime) && affordableGear(runtime, shopNpc(runtime)).length > 0,
        open: () => runtime.deps.marketUi.show('npc'), step: runtime.handlers.shopStep,
        begin: () => ({ npc: shopNpc(runtime), offers: affordableGear(runtime, shopNpc(runtime)) }), read: () => runtime.deps.game.inventory,
        completed: (items, before) => before.offers.some(offer => items.includes(offer.item)),
        result: () => '상점에서 장비를 구매했습니다.',
        prepare: () => {
            const previousSection = runtime.deps.marketUi.section;
            runtime.deps.npcShop.meet(runtime.deps.STORY_NPCS.bern, 0);
            runtime.deps.game.currencies.magicBud = 10;
            runtime.deps.game.currencies.formlessDew = 10;
            runtime.deps.marketUi.section = 'npc';
            return () => { runtime.deps.document.querySelector(runtime.state.npcDialog)?.close(); runtime.deps.marketUi.section = previousSection; };
    } };
}

function salvageLesson(runtime) {
    return { key: 'tutorial_salvage_gear', tabId: 'tab-items', title: '장비 해체로 재화 얻기',
        body: '남는 장비를 해체해 상점과 제작에 쓰는 재화를 얻습니다.',
        available: () => Object.keys(runtime.state.SALVAGE_RARITIES).some(currency => salvageCandidates(runtime, currency).length),
        step: runtime.handlers.salvageStep, begin: runtime.handlers.beginSalvage,
        read: before => runtime.deps.game.currencies[before.currency],
        completed: (count, before) => count > before.count && before.items.some(item => !runtime.deps.game.inventory.includes(item)),
        prepare: () => { runtime.deps.game.inventory.push(normalHelmet(runtime)); } };
}
