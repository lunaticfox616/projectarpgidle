// 조합창 조합법의 결과 만들기(2026-09-30). 조합법 표는 data/stump-cube.js, 재료 배치 · 판정 · 비용 · 소모 · 보관은 stump-cube.js.
// 각 조합법은 재료 묶음(groups: 조합법 inputs 줄마다 재료 목록)을 받아 { ok, consumed, outputs }를 돌려준다.
// consumed는 조합이 끝나면 없어질 재료, outputs는 보관할 결과다. 결과 종류:
//   { kind: 'equipment', item } · { kind: 'jewel', item } · { kind: 'core', item }
//   { kind: 'stump', spec }(새 씨앗 · 수액) · { kind: 'stump', talisman }(새 부적) · { kind: kind, existing }(바뀐 재료 그대로)
//   { kind: 'currency', key, amount }(재화, 지갑으로).
// 결과를 만들 수 없으면 아무것도 바꾸지 않고 { ok: false, reason }을 돌려준다.
const stumpCubeRecipes = (() => {
    function items(group) {
        return group.map(entry => entry.item);
    }

    function baseSlot(item) {
        return String((item && item.slot) || '').replace(/[123]$/, '');
    }

    function topTier(list) {
        return Math.max(1, ...list.map(item => Math.floor(Number(item.hiddenTier || item.itemTier) || 1)));
    }

    /** A fresh drop-quality item of this base (or a base of this slot) and tier (no realm base). */
    function makeEquipment(slot, tier, rarity, baseId) {
        const base = BASE_ITEM_DB.find(row => row.id === baseId) || chooseItemBase(slot, tier, {});
        if (!base) return null;
        const level = levelProgression.tierLevel(tier);
        const item = createItemFromBase(base, rarity, tier, { affixTierCap: levelProgression.affixCap(level), affixTierFloor: 1,
            tierWeightFalloff: DROPPED_AFFIX_TIER_WEIGHT_FALLOFF });
        return levelProgression.stampItem(item, level);
    }

    function equipmentResult(groups, item) {
        return item ? { ok: true, consumed: groups.flat(), outputs: [{ kind: 'equipment', item }] } : { ok: false, reason: '이 부위의 장비를 만들 수 없습니다.' };
    }

    /** 마법 장비 + 다 자란 씨앗: the same base and tier as a rare item with fresh affixes. */
    function magicUpgrade(groups) {
        const gear = groups[0][0].item;
        return equipmentResult(groups, makeEquipment(baseSlot(gear), topTier([gear]), 'rare', gear.baseId));
    }

    // Capped by what the player's level can already drop, so repeated tempering cannot outrun progress.
    function rareTier(groups, state) {
        const gear = groups[0][0].item, top = topTier([gear]);
        const level = Math.max(Math.floor(Number(state.level) || 1), Math.floor(Number(gear.itemLevel) || 1));
        const tier = Math.max(top, Math.min(top + 1, levelProgression.maxDropTier(level)));
        return equipmentResult(groups, makeEquipment(baseSlot(gear), tier, 'rare'));
    }

    /** Another unique of the same slot and tier (a few tries to avoid handing back the same one). */
    function uniqueReroll(groups) {
        const gear = groups[0][0].item, tier = topTier([gear]);
        let item = null;
        for (let tries = 0; tries < 6 && (!item || item.name === gear.name); tries++) item = generateUniqueItem(tier, baseSlot(gear), null, {});
        return equipmentResult(groups, item ? levelProgression.stampItem(item, levelProgression.tierLevel(tier)) : null);
    }

    function socketJewel([[equipment], [jewel]], state) {
        if (!equipmentSockets.openVoidSocket(equipment.item)) return { ok: false, reason: '이 장비에는 소켓을 더 뚫을 수 없습니다.' };
        const result = equipmentSockets.insert(equipment.item, jewel.item.id, state);
        if (!result.ok) {
            delete equipment.item.voidSocket;
            return result;
        }
        return { ok: true, consumed: [], outputs: [{ kind: 'equipment', existing: equipment.item }] };
    }

    /** Best quality + a step, up to the box's quality cap (130%, 140% and 150% with the loop 35 and 45 unlocks); golden if any was golden. */
    function stumpMerge([group], state) {
        const list = items(group);
        const roll = Math.min(stumpBox.rollCap(state), Math.max(...list.map(item => Number(item.roll) || 1)) + STUMP_CUBE_STUMP_ROLL_STEP);
        const spec = { family: list[0].family, color: list[0].color, roll, golden: list.some(item => item.golden === true) };
        return { ok: true, consumed: group, outputs: [{ kind: 'stump', spec }] };
    }

    function talismanUpgrade([group], state, random) {
        const source = items(group).every(item => item.rarity === 'rare') ? 'radiantSealShard' : 'strongSealShard';
        return { ok: true, consumed: group, outputs: [{ kind: 'stump', talisman: talismans.roll(source, random) }] };
    }

    function talismanRerollLine([[talisman], [amber]], state, random) {
        if (!talismans.rerollStatLine(talisman.item, random)) return { ok: false, reason: '다시 쓸 일반 줄이 없는 부적입니다.' };
        return { ok: true, consumed: [amber], outputs: [{ kind: 'stump', existing: talisman.item }] };
    }

    function talismanUniqueReroll([group], state, random) {
        const talisman = talismans.rollOtherUnique(items(group).map(item => item.uniqueId), random);
        return { ok: true, consumed: group, outputs: [{ kind: 'stump', talisman }] };
    }

    function jewelFuse([group], state, random) {
        const top = Math.max(1, ...items(group).map(item => Math.floor(Number(item.hiddenTier) || 1)));
        const stats = rollJewelCraftStats(3 + (random() < 0.35 ? 1 : 0), null, { min: Math.max(1, top - 1), max: top });
        if (!stats.length) return { ok: false, reason: '주얼 옵션을 굴리지 못했습니다.' };
        itemIdCounter += 1;
        const jewel = { id: itemIdCounter, name: `${getStatName(stats[0].id)} 주얼`, tier: 1,
            hiddenTier: Math.max(1, ...stats.map(stat => stat.tier || 1)), rarity: 'rare', stats };
        return { ok: true, consumed: group, outputs: [{ kind: 'jewel', item: jewel }] };
    }

    function coreReroll([group]) {
        return { ok: true, consumed: group, outputs: [{ kind: 'core', item: coreItems.roll() }] };
    }

    const HANDLERS = Object.freeze({
        equip_magic_upgrade: magicUpgrade, equip_rare_tier: rareTier, equip_unique_reroll: uniqueReroll, equip_socket_jewel: socketJewel,
        stump_merge: stumpMerge, talisman_upgrade: talismanUpgrade, talisman_reroll_line: talismanRerollLine,
        talisman_unique_reroll: talismanUniqueReroll, jewel_fuse: jewelFuse, core_reroll: coreReroll,
        // 호박석 기폭제(12번 루프 32): 결과는 재화(stump-cube.js STORERS.currency).
        amber_catalyst: (groups, state) => sapCatalysts.amberRecipe(groups, state),
        // 열매 기름(12번 루프 36): 결과는 재화.
        fruit_oil: (groups, state) => gardenOils.fruitRecipe(groups, state)
    });

    function run(recipeId, groups, state = game, random = Math.random) {
        const handler = HANDLERS[recipeId];
        return handler ? handler(groups, state, random) : { ok: false, reason: '알 수 없는 조합법입니다.' };
    }

    return Object.freeze({ run, baseSlot, has: id => !!HANDLERS[id] });
})();
safeExposeGlobals({ stumpCubeRecipes });
