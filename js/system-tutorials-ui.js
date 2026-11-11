/** Action guides offered at the first usable visit to a system. Replays use these same steps. */
const systemTutorialUi = (() => {
    const step = (number, total, body, selector, inline) => ({ number, total, body, selector, inline });
    const shown = selector => !!document.querySelector(selector)?.getClientRects().length;
    const slotDialog = '#gem-slot-dialog .is-kind-support';
    const engraveDialog = '#gem-engrave-slot-overlay';
    const craftPicker = '#craft-item-picker-overlay[open]';
    const catalog = '.cl-catalog[open]';
    const npcDialog = '#npc-dialog[open]';
    const bagCard = '#ui-inventory-list .equipment-grid-item';
    const spareCard = item => `${bagCard}[data-equipment-grid-key="${CSS.escape(equipmentInventoryGridRuntime.getItemKey(item))}"]`;
    const equipped = () => [...game.equippedSupports];
    const tabShown = id => getRenderingUiTabIds().has(id);
    const skillBoardShown = () => tabShown('tab-skills') && game.skillSubtab === 'skill-tab-equip';
    const craftShown = () => tabShown('tab-items') && game.itemSubtab === 'item-tab-craft';

    function supportChoices() {
        if (!contentProgression.isUnlocked('support') || !game.supports.length || game.woodsmanBuildLock) return [];
        const stats = getUiPlayerStats();
        if (game.equippedSupports.length >= Math.floor(stats.suppCap || 0)) return [];
        const free = getEffectiveResonanceCap(stats) - game.equippedSupports.reduce((cost, name) => cost + getSupportTierResonanceCost(name), 0);
        return game.supports.filter(name => !game.equippedSupports.includes(name)
            && getSupportTierResonanceCost(name) <= free && gemSelectionUi.targetCount(name) > 0
            && !window.GameModules.skills.supports.conflictReason(name, game));
    }

    function supportStep(before) {
        if (!shown(slotDialog)) {
            return step(1, 2, '빛나는 빈 보조스킬룬 칸을 누르세요.', '#tab-skills .support-slot.is-empty[data-board-pick="support"]');
        }
        const buttons = before.choices.map(name => `${slotDialog} [data-slot-action="choose"][data-name="${CSS.escape(name)}"]:not(:disabled)`);
        return step(2, 2, '적용되는 스킬과 필요한 공명력을 확인한 뒤 ‘장착’을 누르세요.', buttons, `${slotDialog} .gem-slot-list-head`);
    }

    const engraveRune = () => game.skillSubtab === 'skill-tab-enhance' ? getGemEnhanceTargetSkill() : game.activeSkill;
    const engravings = name => getSkyEnhancementSlotsForSkill(name).filter(Boolean);
    const canEngrave = () => contentProgression.isUnlocked('engraving') && !game.woodsmanBuildLock
        && game.currencies.skyEssence > 0 && isEnhanceableAttackGem(engraveRune()) && getFirstEmptyGemEngraveSlot(engraveRune()) >= 0;

    function engraveStep() {
        if (!shown(engraveDialog)) {
            return step(1, 2, '장착한 공격 룬의 빛나는 빈 각인 칸을 누르세요.',
                ['#tab-skills [data-board-engrave].is-open', '#ui-gem-engrave-slots [data-slot-state="open"]:not(:disabled)']);
        }
        return step(2, 2, '효과를 읽고 각인을 고르세요. 창공의 정수 1개가 소모됩니다.',
            `${engraveDialog} [data-action="apply"]:not(:disabled)`, `${engraveDialog} header`);
    }

    function canUseBud(item) {
        return item?.rarity === 'normal' && !item.hallReplica && !bagItems.isSpecial(item)
            && !craftCurrencyUse.blockReason(item, equipmentCrafting.resolveAction('magicBud', item.rarity));
    }

    function craftChoices() {
        return Object.values(game.equipment).concat(game.inventory).filter(canUseBud);
    }

    function craftTargetStep() {
        const prefix = shown(craftPicker) ? craftPicker : '#crafting-workspace';
        const slots = Object.entries(game.equipment).filter(([, item]) => canUseBud(item))
            .map(([slot]) => `${prefix} .slot-box.slot-${CSS.escape(slot)}`);
        const cards = game.inventory.filter(canUseBud).map(item => `${craftPicker} ${spareCard(item)}`);
        const openers = slots.length ? ['#craft-target-equip-open', '#craft-target-inventory-open'] : ['#craft-target-inventory-open'];
        return step(1, 2, '제작할 일반 장비를 고르세요. 착용 중인 장비와 가방의 장비를 모두 고를 수 있습니다.',
            [...slots, ...cards, ...openers], shown(craftPicker) ? `${craftPicker} .craft-picker-head` : undefined);
    }

    function craftStep() {
        if (!canUseBud(getSelectedCraftItem()) || shown(craftPicker)) return craftTargetStep();
        const use = '#crafting-workspace [data-command="craft"][data-craft-resource="magicBud"]:not(:disabled)';
        if (shown(catalog)) {
            return step(2, 2, '‘마법의 새싹’을 제작 재화로 고르세요.',
                [`${catalog}:has([data-resource="magicBud"][aria-pressed="true"]) [data-apply]:not(:disabled)`, `${catalog} [data-resource="magicBud"]`], `${catalog} > header`);
        }
        return step(2, 2, '‘1회 사용’을 눌러 일반 장비를 마법 장비로 바꾸고 새 옵션을 붙이세요.',
            [use, '#cl-inventory-open']);
    }

    const currentNpc = () => document.querySelector(npcDialog)?.dataset.npcId;
    const affordableGear = id => (npcShop.stock(id)?.offers || []).filter((offer, index) => offer.item && npcShop.check(id, index, null).ok);
    const shopNpc = () => currentNpc() || Object.keys(game.npcMet).find(id => affordableGear(id).length);

    function shopStep(before) {
        const shop = `${npcDialog} [data-npc-shop="${CSS.escape(before.npc)}"]`;
        if (!shown(shop)) {
            return step(1, 3, '빛나는 ‘상점’을 누르세요. 만났던 상인은 거래의 NPC 목록에서도 찾아갈 수 있습니다.',
                [`${npcDialog} [data-npc-topic="shop"]`, `#market-panel-npc [data-npc-open="${CSS.escape(before.npc)}"][data-npc-mode="shop"]`]);
        }
        const buy = `${shop} [data-npc-buy]:not(:disabled)`;
        if (shown(buy)) return step(3, 3, '가격과 보유 재화를 확인하고 ‘구매’를 누르세요. 구입한 장비는 가방에 들어갑니다.', buy);
        const wares = npcShop.stock(before.npc)?.offers || [];
        const targets = wares.flatMap((ware, index) => before.offers.includes(ware) ? [`${shop} [data-shop-pick="ware:${index}"]`] : []);
        return step(2, 3, '빛나는 물건을 골라 옵션과 가격을 확인하세요.', targets, `${shop} .shop-shelf > .shop-bar`);
    }

    const SALVAGE_RARITIES = Object.freeze({ magicBud: ['normal', 'magic'], formlessDew: ['rare'] });
    function salvageCandidates(currency) {
        const rarities = SALVAGE_RARITIES[currency];
        if (!Array.isArray(rarities) || game.woodsmanBuildLock) return [];
        return game.inventory.filter(item => rarities.includes(item?.rarity) && !bagItems.isSpecial(item)
            && !item.loopSealed && !item.hallReplica && !isBulkSalvageProtectedItem(item));
    }

    function beginSalvage(notice) {
        const currency = notice.currency || 'magicBud';
        return { currency, count: game.currencies[currency], items: salvageCandidates(currency), replay: notice.replay };
    }

    function salvageStep(before) {
        const inspector = '#ui-equipment-inventory-inspector';
        const tools = `${inspector} .eqw-manage-toggle:not([hidden])`;
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const total = mobile ? 3 : 2;
        const focused = equipmentInventoryInteraction.getFocusedKey();
        if (!focused || !salvageCandidates(before.currency).some(item => equipmentInventoryGridRuntime.getItemKey(item) === focused)) {
            if (before.replay) return step(1, total, '가방의 빛나는 예시 장비를 고르세요.', spareCard(before.items[0]));
            const body = before.currency === 'formlessDew'
                ? '형체 없는 이슬을 얻으려면 가방에서 해체할 희귀 장비를 고르세요.'
                : '마법의 새싹을 얻으려면 가방에서 해체할 일반 또는 마법 장비를 고르세요.';
            return step(1, total, body, '#item-tab-equip .eqw-bag-head', '#item-tab-equip .eqw-bag-head');
        }
        const salvage = `${inspector} .equipment-card-danger:not(:disabled)`;
        const itemName = `${inspector} .eqw-pick`;
        if (mobile && !shown(salvage)) return step(2, total, '‘장비 관리’를 열어 해체 버튼을 찾으세요.', tools, itemName);
        const body = before.currency === 'formlessDew'
            ? '‘해체’를 누르면 선택한 장비가 사라지고 형체 없는 이슬을 얻습니다.'
            : '‘해체’를 누르면 선택한 장비가 사라지고 마법의 새싹을 얻습니다.';
        return step(total, total, body, salvage, itemName);
    }

    function startShopSalvage(dialog, currency) {
        if (!dialog?.open || !salvageCandidates(currency).length || game.isGuideReplay) return;
        const owner = game, npc = STORY_NPCS[dialog.dataset.npcId];
        dialog.close();
        equipmentInventoryInteraction.focus(null);
        tutorialActionUi.start({ ...guides.tutorial_salvage_gear, currency, onComplete: () => {
            showGameToast(_t('해체 재화를 얻었습니다.'), { tone: 'success' });
            requestAnimationFrame(() => {
                if (game !== owner || !npc) return;
                openTabPane('tab-trade');
                contentUnlockUi.openNpc(npc, 'shop');
            });
        } });
    }

    const normalHelmet = () => createItemFromBase(chooseItemBase('투구', 1, getZone(0)), 'normal', 1);
    function sampleAttackRune() {
        game.skills.push('화염 참격');
        game.activeSkill = '화염 참격';
        game.gemData['화염 참격'] = normalizeGemRecord(null);
    }

    const lessons = [
        { key: 'tutorial_support_equip', tabId: 'tab-skills', unlock: 'support', title: '보조스킬룬 장착',
            body: '빈 보조 칸을 열고, 적용 대상과 공명 비용을 확인해 룬을 장착합니다.',
            view: skillBoardShown, available: () => supportChoices().length > 0, step: supportStep,
            begin: () => ({ worn: new Set(equipped()), choices: supportChoices() }), read: equipped,
            completed: (current, before) => current.some(name => !before.worn.has(name)),
            result: () => '보조스킬룬을 장착했습니다.',
            prepare: () => {
                sampleAttackRune();
                game.contentProgression.inherited.push('support');
                gemDropRewards.grant(game, { kind: 'support', name: '가속', tier: 1 });
                return () => selectionDialog.close('gem-slot-dialog');
            } },
        { key: 'tutorial_rune_engrave', tabId: 'tab-skills', unlock: 'engraving', title: '스킬룬 각인',
            body: '공격 룬의 빈 각인 칸에 창공의 정수를 써서 효과를 넣습니다.',
            view: () => tabShown('tab-skills') && ['skill-tab-equip', 'skill-tab-enhance'].includes(game.skillSubtab),
            available: canEngrave, step: engraveStep,
            begin: () => ({ rune: engraveRune(), effects: new Set(engravings(engraveRune())) }), read: () => game.currencies.skyEssence,
            completed: (_, before) => engravings(before.rune).some(id => !before.effects.has(id)),
            result: () => '공격 룬에 각인을 넣었습니다.',
            prepare: () => {
                sampleAttackRune();
                game.contentProgression.inherited.push('engraving', 'gemForge');
                game.currencies.skyEssence = 1;
                return closeGemEngraveSlotOverlay;
            } },
        { key: 'tutorial_craft_gear', tabId: 'tab-items', unlock: 'craft', title: '첫 장비 제작',
            body: '일반 장비를 골라 마법의 새싹으로 추가 옵션을 붙입니다.',
            view: craftShown, available: () => contentProgression.isUnlocked('craft') && !game.woodsmanBuildLock && game.currencies.magicBud > 0 && craftChoices().length > 0,
            open: () => switchItemSubtab('item-tab-craft'), step: craftStep,
            begin: () => ({ items: craftChoices(), buds: game.currencies.magicBud }), read: () => game.currencies.magicBud,
            completed: (buds, before) => buds < before.buds && before.items.some(item => item.rarity === 'magic'),
            result: () => '장비에 새 옵션을 붙였습니다.',
            prepare: () => {
                const ref = getCraftSelectionRef(), worn = isCraftSelectionEquip();
                clearCraftSelection();
                game.contentProgression.inherited.push('craft');
                game.equipment['투구'] = normalHelmet();
                game.currencies.magicBud = 1;
                return () => {
                    window.closeCraftItemPickerOverlay();
                    document.querySelector(catalog)?.close();
                    clearCraftSelection();
                    if (ref !== null) selectForCrafting(ref, worn);
                };
            } },
        { key: 'tutorial_shop_buy', tabId: 'tab-trade', gate: () => contentProgression.npcsMet(game), title: 'NPC 상점에서 구매',
            body: '상점에서 장비를 골라 옵션과 가격을 확인한 뒤 구매합니다.',
            view: () => shown(`${npcDialog} :is([data-npc-topic="shop"], [data-npc-shop])`),
            available: () => contentProgression.canOpen('tab-trade') && !!shopNpc() && affordableGear(shopNpc()).length > 0,
            open: () => marketUi.show('npc'), step: shopStep,
            begin: () => ({ npc: shopNpc(), offers: affordableGear(shopNpc()) }), read: () => game.inventory,
            completed: (items, before) => before.offers.some(offer => items.includes(offer.item)),
            result: () => '상점에서 장비를 구매했습니다.',
            prepare: () => {
                const previousSection = marketUi.section;
                npcShop.meet(STORY_NPCS.bern, 0);
                game.currencies.magicBud = 10;
                game.currencies.formlessDew = 10;
                marketUi.section = 'npc';
                return () => { document.querySelector(npcDialog)?.close(); marketUi.section = previousSection; };
            } },
        { key: 'tutorial_salvage_gear', tabId: 'tab-items', title: '장비 해체로 재화 얻기',
            body: '남는 장비를 해체해 상점과 제작에 쓰는 재화를 얻습니다.',
            available: () => Object.keys(SALVAGE_RARITIES).some(currency => salvageCandidates(currency).length),
            step: salvageStep, begin: beginSalvage,
            read: before => game.currencies[before.currency],
            completed: (count, before) => count > before.count && before.items.some(item => !game.inventory.includes(item)),
            prepare: () => { game.inventory.push(normalHelmet()); } }
    ];
    const guides = Object.fromEntries(lessons.map(lesson => [lesson.key, lesson]));
    const visits = new Map([
        ['skill-tab-equip', ['tutorial_support_equip', 'tutorial_rune_engrave']],
        ['skill-tab-enhance', ['tutorial_rune_engrave']],
        ['item-tab-craft', ['tutorial_craft_gear']],
        ['npc-shop', ['tutorial_shop_buy']]
    ]);

    function offer(key) {
        const lesson = guides[key];
        if (game.isGuideReplay || tutorialActionUi.active || activeTutorial || !lesson.view()) return false;
        if (game.seenTutorials.includes('action_' + key) || game.seenTutorials.includes('dismiss_' + key) || !lesson.available()) return false;
        tutorialActionUi.start(lesson, false);
        return true;
    }

    function visit(panel) {
        const keys = visits.get(panel);
        if (keys && !game.isGuideReplay) requestAnimationFrame(() => keys.some(offer));
    }

    function refreshSystemGuide(event) {
        const action = tutorialActionUi.active;
        if (!guides[action?.notice.key] || (event.type === 'keydown' && event.key !== 'Escape')) return;
        requestAnimationFrame(() => { if (tutorialActionUi.active === action) tutorialActionUi.refresh(); });
    }

    // Several panel controls stop propagation once they have opened their picker.
    document.addEventListener('click', refreshSystemGuide, true);
    document.addEventListener('keydown', refreshSystemGuide, true);
    document.addEventListener('close', refreshSystemGuide, true);
    return Object.freeze({ lessons, guides, visit, canGuideSalvage: currency => salvageCandidates(currency).length > 0, startShopSalvage });
})();
