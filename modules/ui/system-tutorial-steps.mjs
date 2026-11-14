export function supportChoices(runtime) {
    if (!runtime.deps.contentProgression.isUnlocked('support') || !runtime.deps.game.supports.length || runtime.deps.game.woodsmanBuildLock) return [];
    const stats = (0, runtime.deps.getUiPlayerStats)();
    if (runtime.deps.game.equippedSupports.length >= Math.floor(stats.suppCap || 0)) return [];
    const free = (0, runtime.deps.getEffectiveResonanceCap)(stats) - runtime.deps.game.equippedSupports.reduce((cost, name) => cost + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    return runtime.deps.game.supports.filter(name => !runtime.deps.game.equippedSupports.includes(name)
            && (0, runtime.deps.getSupportTierResonanceCost)(name) <= free && runtime.deps.gemSelectionUi.targetCount(name) > 0
            && !runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game));
}

export function supportStep(runtime, before) {
    if (!shown(runtime, runtime.state.slotDialog)) {
        return runtime.handlers.step(1, 2, '빛나는 빈 보조스킬룬 칸을 누르세요.', '#tab-skills .support-slot.is-empty[data-board-pick="support"]');
    }
    const buttons = before.choices.map(name => `${runtime.state.slotDialog} [data-slot-action="choose"][data-name="${runtime.deps.CSS.escape(name)}"]:not(:disabled)`);
    return runtime.handlers.step(2, 2, '적용되는 스킬과 필요한 공명력을 확인한 뒤 ‘장착’을 누르세요.', buttons, `${runtime.state.slotDialog} .gem-slot-list-head`);
}

export function engraveStep(runtime) {
    if (!shown(runtime, runtime.state.engraveDialog)) {
        return runtime.handlers.step(1, 2, '장착한 공격 룬의 빛나는 빈 각인 칸을 누르세요.',
            ['#tab-skills [data-board-engrave].is-open', '#ui-gem-engrave-slots [data-slot-state="open"]:not(:disabled)']);
    }
    return runtime.handlers.step(2, 2, '효과를 읽고 각인을 고르세요. 창공의 정수 1개가 소모됩니다.',
        `${runtime.state.engraveDialog} [data-action="apply"]:not(:disabled)`, `${runtime.state.engraveDialog} header`);
}

export function canUseBud(runtime, item) {
    return item?.rarity === 'normal' && !item.hallReplica && !runtime.deps.bagItems.isSpecial(item)
        && !runtime.deps.craftCurrencyUse.blockReason(item, runtime.deps.equipmentCrafting.resolveAction('magicBud', item.rarity));
}

export function craftChoices(runtime) {
    return Object.values(runtime.deps.game.equipment).concat(runtime.deps.game.inventory).filter(runtime.handlers.canUseBud);
}

export function craftTargetStep(runtime) {
    const prefix = shown(runtime, runtime.state.craftPicker) ? runtime.state.craftPicker : '#crafting-workspace';
    const slots = Object.entries(runtime.deps.game.equipment).filter(([, item]) => canUseBud(runtime, item))
        .map(([slot]) => `${prefix} .slot-box.slot-${runtime.deps.CSS.escape(slot)}`);
    const cards = runtime.deps.game.inventory.filter(runtime.handlers.canUseBud).map(item => `${runtime.state.craftPicker} ${spareCard(runtime, item)}`);
    const openers = slots.length ? ['#craft-target-equip-open', '#craft-target-inventory-open'] : ['#craft-target-inventory-open'];
    return runtime.handlers.step(1, 2, '제작할 일반 장비를 고르세요. 착용 중인 장비와 가방의 장비를 모두 고를 수 있습니다.',
        [...slots, ...cards, ...openers], shown(runtime, runtime.state.craftPicker) ? `${runtime.state.craftPicker} .craft-picker-head` : undefined);
}

export function craftStep(runtime) {
    if (!canUseBud(runtime, (0, runtime.deps.getSelectedCraftItem)()) || shown(runtime, runtime.state.craftPicker)) return craftTargetStep(runtime);
    const use = '#crafting-workspace [data-command="craft"][data-craft-resource="magicBud"]:not(:disabled)';
    if (shown(runtime, runtime.state.catalog)) {
        return runtime.handlers.step(2, 2, '‘마법의 새싹’을 제작 재화로 고르세요.',
            [`${runtime.state.catalog}:has([data-resource="magicBud"][aria-pressed="true"]) [data-apply]:not(:disabled)`, `${runtime.state.catalog} [data-resource="magicBud"]`], `${runtime.state.catalog} > header`);
    }
    return runtime.handlers.step(2, 2, '‘1회 사용’을 눌러 일반 장비를 마법 장비로 바꾸고 새 옵션을 붙이세요.',
        [use, '#cl-inventory-open']);
}

export function shopStep(runtime, before) {
    const shop = `${runtime.state.npcDialog} [data-npc-shop="${runtime.deps.CSS.escape(before.npc)}"]`;
    if (!shown(runtime, shop)) {
        return runtime.handlers.step(1, 3, '빛나는 ‘상점’을 누르세요. 만났던 상인은 거래의 NPC 목록에서도 찾아갈 수 있습니다.',
            [`${runtime.state.npcDialog} [data-npc-topic="shop"]`, `#market-panel-npc [data-npc-open="${runtime.deps.CSS.escape(before.npc)}"][data-npc-mode="shop"]`]);
    }
    const buy = `${shop} [data-npc-buy]:not(:disabled)`;
    if (shown(runtime, buy)) return runtime.handlers.step(3, 3, '가격과 보유 재화를 확인하고 ‘구매’를 누르세요. 구입한 장비는 가방에 들어갑니다.', buy);
    const wares = runtime.deps.npcShop.stock(before.npc)?.offers || [];
    const targets = wares.flatMap((ware, index) => before.offers.includes(ware) ? [`${shop} [data-shop-pick="ware:${index}"]`] : []);
    return runtime.handlers.step(2, 3, '빛나는 물건을 골라 옵션과 가격을 확인하세요.', targets, `${shop} .shop-shelf > .shop-bar`);
}

export function salvageCandidates(runtime, currency) {
    const rarities = runtime.state.SALVAGE_RARITIES[currency];
    if (!Array.isArray(rarities) || runtime.deps.game.woodsmanBuildLock) return [];
    return runtime.deps.game.inventory.filter(item => rarities.includes(item?.rarity) && !runtime.deps.bagItems.isSpecial(item)
            && !item.loopSealed && !item.hallReplica && !(0, runtime.deps.isBulkSalvageProtectedItem)(item));
}

export function beginSalvage(runtime, notice) {
    const currency = notice.currency || 'magicBud';
    return { currency, count: runtime.deps.game.currencies[currency], items: salvageCandidates(runtime, currency), replay: notice.replay };
}

export function salvageStep(runtime, before) {
    const inspector = '#ui-equipment-inventory-inspector';
    const tools = `${inspector} .eqw-manage-toggle:not([hidden])`;
    const mobile = runtime.deps.uiDisplay.matches('(max-width: 1080px)');
    const total = mobile ? 3 : 2;
    const focused = runtime.deps.equipmentInventoryInteraction.getFocusedKey();
    if (!focused || !salvageCandidates(runtime, before.currency).some(item => runtime.deps.equipmentInventoryGridRuntime.getItemKey(item) === focused)) {
        if (before.replay) return runtime.handlers.step(1, total, '가방의 빛나는 예시 장비를 고르세요.', spareCard(runtime, before.items[0]));
        const body = before.currency === 'formlessDew'
            ? '형체 없는 이슬을 얻으려면 가방에서 해체할 희귀 장비를 고르세요.'
            : '마법의 새싹을 얻으려면 가방에서 해체할 일반 또는 마법 장비를 고르세요.';
        return runtime.handlers.step(1, total, body, '#item-tab-equip .eqw-bag-head', '#item-tab-equip .eqw-bag-head');
    }
    const salvage = `${inspector} .equipment-card-danger:not(:disabled)`;
    const itemName = `${inspector} .eqw-pick`;
    if (mobile && !shown(runtime, salvage)) return runtime.handlers.step(2, total, '‘장비 관리’를 열어 해체 버튼을 찾으세요.', tools, itemName);
    const body = before.currency === 'formlessDew'
        ? '‘해체’를 누르면 선택한 장비가 사라지고 형체 없는 이슬을 얻습니다.'
        : '‘해체’를 누르면 선택한 장비가 사라지고 마법의 새싹을 얻습니다.';
    return runtime.handlers.step(total, total, body, salvage, itemName);
}

export function sampleAttackRune(runtime) {
    runtime.deps.game.skills.push('화염 참격');
    runtime.deps.game.activeSkill = '화염 참격';
    runtime.deps.game.gemData['화염 참격'] = (0, runtime.deps.normalizeGemRecord)(null);
}

export function createStep() {
    return function step(number, total, body, selector, inline) { return { number, total, body, selector, inline }; };
}

export function shown(runtime, selector) { return !!runtime.deps.document.querySelector(selector)?.getClientRects().length; }

export function spareCard(runtime, item) { return `${runtime.state.bagCard}[data-equipment-grid-key="${runtime.deps.CSS.escape(runtime.deps.equipmentInventoryGridRuntime.getItemKey(item))}"]`; }

export function equipped(runtime) { return [...runtime.deps.game.equippedSupports]; }

export function tabShown(runtime, id) { return (0, runtime.deps.getRenderingUiTabIds)().has(id); }

export function skillBoardShown(runtime) { return tabShown(runtime, 'tab-skills') && runtime.deps.game.skillSubtab === 'skill-tab-equip'; }

export function craftShown(runtime) { return tabShown(runtime, 'tab-items') && runtime.deps.game.itemSubtab === 'item-tab-craft'; }

export function engraveRune(runtime) { return runtime.deps.game.skillSubtab === 'skill-tab-enhance' ? (0, runtime.deps.getGemEnhanceTargetSkill)() : runtime.deps.game.activeSkill; }

export function engravings(runtime, name) { return (0, runtime.deps.getSkyEnhancementSlotsForSkill)(name).filter(Boolean); }

export function canEngrave(runtime) { return runtime.deps.contentProgression.isUnlocked('engraving') && !runtime.deps.game.woodsmanBuildLock
        && runtime.deps.game.currencies.skyEssence > 0 && (0, runtime.deps.isEnhanceableAttackGem)(engraveRune(runtime)) && (0, runtime.deps.getFirstEmptyGemEngraveSlot)(engraveRune(runtime)) >= 0; }

export function currentNpc(runtime) { return runtime.deps.document.querySelector(runtime.state.npcDialog)?.dataset.npcId; }

export function affordableGear(runtime, id) { return (runtime.deps.npcShop.stock(id)?.offers || []).filter((offer, index) => offer.item && runtime.deps.npcShop.check(id, index, null).ok); }

export function shopNpc(runtime) { return currentNpc(runtime) || Object.keys(runtime.deps.game.npcMet).find(id => affordableGear(runtime, id).length); }

export function normalHelmet(runtime) { return (0, runtime.deps.createItemFromBase)((0, runtime.deps.chooseItemBase)('투구', 1, (0, runtime.deps.getZone)(0)), 'normal', 1); }
