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
    function rareTierTarget(gear, state) {
        const top = topTier([gear]);
        const level = Math.max(Math.floor(Number(state.level) || 1), Math.floor(Number(gear.itemLevel) || 1));
        return Math.max(top, Math.min(top + 1, levelProgression.maxDropTier(level)));
    }

    function rareTier(groups, state) {
        const gear = groups[0][0].item;
        return equipmentResult(groups, makeEquipment(baseSlot(gear), rareTierTarget(gear, state), 'rare'));
    }

    /** Another unique of the same slot and tier (a few tries to avoid handing back the same one). */
    function uniqueReroll(groups) {
        const gear = groups[0][0].item, tier = topTier([gear]);
        let item = null;
        for (let tries = 0; tries < 6 && (!item || item.name === gear.name); tries++) item = generateUniqueItem(tier, baseSlot(gear), null, {});
        return equipmentResult(groups, item ? levelProgression.stampItem(item, levelProgression.tierLevel(tier)) : null);
    }

    /** 같은 고유 2: a fresh copy of that unique at the better tier, its lines rolled again, sometimes on an exceptional base line. */
    function uniqueRemake([group], state, random) {
        const gear = group[0].item, tier = topTier(items(group)), item = generateUniqueItem(tier, baseSlot(gear), gear.name, {});
        const base = item && !item.exceptionalBase && Array.isArray(item.baseStats) ? item.baseStats.filter(Boolean) : [];
        if (base.length && random() < STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE) boostExceptionalBaseLine(item, base[Math.floor(random() * base.length)]);
        return equipmentResult([group], item ? levelProgression.stampItem(item, levelProgression.tierLevel(tier)) : null);
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

    /** Best quality + a step, up to the box's quality cap (130%, 140% and 150% with the loop 35 and 45 unlocks); golden if any was
     * golden, ancient (고대 씨앗) if any was ancient. */
    function stumpMergeSpec(list, state) {
        const roll = Math.min(stumpBox.rollCap(state), Math.max(...list.map(item => Number(item.roll) || 1)) + STUMP_CUBE_STUMP_ROLL_STEP);
        return { family: list[0].family, color: list[0].color, path: list[0].path, roll, golden: list.some(item => item.golden === true),
            ancient: list.some(item => item.ancient === true) };
    }

    function stumpMerge([group], state) {
        return { ok: true, consumed: group, outputs: [{ kind: 'stump', spec: stumpMergeSpec(items(group), state) }] };
    }

    function talismanSource(group) {
        return items(group).every(item => item.rarity === 'rare') ? 'radiantSealShard' : 'strongSealShard';
    }

    function talismanUpgrade([group], state, random) {
        return { ok: true, consumed: group, outputs: [{ kind: 'stump', talisman: talismans.roll(talismanSource(group), random) }] };
    }

    function talismanRerollLine([[talisman], [amber]], state, random) {
        if (!talismans.rerollStatLine(talisman.item, random)) return { ok: false, reason: '다시 쓸 일반 줄이 없는 부적입니다.' };
        return { ok: true, consumed: [amber], outputs: [{ kind: 'stump', existing: talisman.item }] };
    }

    function talismanUniqueReroll([group], state, random) {
        const talisman = talismans.rollOtherUnique(items(group).map(item => item.uniqueId), random);
        return { ok: true, consumed: group, outputs: [{ kind: 'stump', talisman }] };
    }

    function jewelTierRange(group) {
        const top = Math.max(1, ...items(group).map(item => Math.floor(Number(item.hiddenTier) || 1)));
        return { min: Math.max(1, top - 1), max: top };
    }

    function jewelFuse([group], state, random) {
        const stats = rollJewelCraftStats(3 + (random() < 0.35 ? 1 : 0), null, jewelTierRange(group));
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
        equip_magic_upgrade: magicUpgrade, equip_rare_tier: rareTier, equip_unique_remake: uniqueRemake, equip_unique_reroll: uniqueReroll,
        equip_socket_jewel: socketJewel,
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

    // Preview reads only guaranteed facts. It never invokes a random generator, allocates an item ID or edits materials.
    function magicPreview([[{ item }]]) {
        const base = BASE_ITEM_DB.find(row => row.id === item.baseId);
        return { label: `희귀 ${base ? base.name : item.name}`, tier: topTier([item]), quality: 0,
            keep: '베이스와 티어', change: '베이스 수치와 추가 옵션 새로 굴림', note: '품질과 제작 효과 초기화' };
    }

    function rarePreview([[{ item }]], state) {
        const tier = rareTierTarget(item, state), capped = tier === topTier([item]);
        return { label: '희귀 장비 1개', tier, quality: 0, keep: '장비 부위',
            change: '베이스와 옵션 새로 굴림', note: capped ? '현재 티어 상한에 도달함, 품질과 제작 효과 초기화' : '품질과 제작 효과 초기화' };
    }

    function uniqueRemakePreview([group]) {
        const item = group[0].item, unique = UNIQUE_DB.find(row => row.name === (RENAMED_UNIQUES[item.name] || item.name));
        if (!unique) return { label: '새 고유 장비 1개', quality: 0, keep: '', change: '현재 목록에서 고유 종류와 옵션 새로 굴림',
            note: '이전 고유 정보 없음, 결과 티어는 고유 종류에 따라 결정, 품질과 제작 효과 초기화' };
        return { label: item.name, tier: unique.reqTier || topTier(items(group)), quality: 0, keep: '고유 종류',
            change: '베이스 수치와 옵션 새로 굴림', note: '특출난 베이스 가능, 품질과 제작 효과 초기화' };
    }

    function uniqueRerollPreview([[{ item }]]) {
        return { label: '새 고유 장비 1개', quality: 0, keep: '',
            change: `T${topTier([item])} 기준으로 고유 종류와 옵션 새로 굴림`,
            note: '결과 티어는 고유 종류에 따라 결정, 동일 고유 가능, 품질과 제작 효과 초기화' };
    }

    function socketPreview([[{ item }], [{ item: jewel }]]) {
        return { label: item.name, tier: topTier([item]), quality: Math.max(0, Math.floor(Number(item.quality) || 0)),
            keep: '장비와 기존 옵션, 품질', change: `공허 소켓에 ${jewel.name} 장착` };
    }

    function mergePreview([group], state) {
        const spec = stumpMergeSpec(items(group), state), color = STUMP_BOX_COLORS[spec.color].label;
        const label = spec.family === 'sap' ? `${color} 수액` : `${color} ${STUMP_BOX_STAGES[spec.path].label} 씨앗`;
        const marks = [spec.golden ? '황금' : '', spec.ancient ? '고대' : ''].filter(Boolean);
        return { label, quality: Math.round(spec.roll * 100), qualityCap: Math.round(stumpBox.rollCap(state) * 100),
            keep: ['색과 종류', ...marks].join(', '), change: '성장 경험치와 수확 옵션 초기화', note: '새 재료 1개로 합쳐짐' };
    }

    function talismanUpgradePreview([group]) {
        const source = talismanSource(group), rule = TALISMAN_UNSEAL_RULES[source], [low, high] = rule.lines;
        return { label: '새 부적 1개', keep: '', change: `일반 부적 옵션 ${low === high ? low : `${low}~${high}`}줄 새로 굴림, 성장 초기화`,
            note: `${ORB_DB[source].name} 등급, 고유 부적 가능` };
    }

    function talismanLinePreview([[{ item }]]) {
        const possible = item.lines.some(line => line.kind === 'stat' && !line.wax);
        return { label: item.name, keep: '부적과 나머지 옵션, 성장', change: '일반 옵션 1줄의 종류와 수치 새로 굴림',
            reason: possible ? '' : '다시 쓸 일반 줄이 없는 부적입니다.' };
    }

    function jewelPreview([group]) {
        const range = jewelTierRange(group);
        return { label: '희귀 주얼 1개', keep: '', change: `옵션 3~4줄 새로 굴림 (T${range.min}~T${range.max})` };
    }

    function currencyPreview(make, groups, state) {
        const result = make(groups, state);
        if (!result.ok) return { label: '', reason: result.reason };
        const output = result.outputs[0];
        return { label: `${ORB_DB[output.key].name} ${output.amount}개`, keep: '재료의 속성', change: '재료 2개를 재화로 변환' };
    }

    const PREVIEWS = Object.freeze({
        equip_magic_upgrade: magicPreview, equip_rare_tier: rarePreview, equip_unique_remake: uniqueRemakePreview,
        equip_unique_reroll: uniqueRerollPreview, equip_socket_jewel: socketPreview, stump_merge: mergePreview,
        talisman_upgrade: talismanUpgradePreview, talisman_reroll_line: talismanLinePreview,
        talisman_unique_reroll: () => ({ label: '고유 부적 1개', keep: '', change: '고유 종류와 옵션 새로 굴림, 성장 초기화' }),
        jewel_fuse: jewelPreview,
        core_reroll: () => ({ label: '새 코어 1개', keep: '', change: `옵션 ${CORE_ITEM_RULES.lines}줄 새로 굴림`, note: '완전한 코어 가능' }),
        amber_catalyst: (groups, state) => currencyPreview(sapCatalysts.amberRecipe, groups, state),
        fruit_oil: (groups, state) => currencyPreview(gardenOils.fruitRecipe, groups, state)
    });

    function preview(recipeId, groups, state = game) {
        const handler = PREVIEWS[recipeId];
        return handler ? handler(groups, state) : null;
    }

    return Object.freeze({ run, preview, baseSlot, has: id => !!HANDLERS[id] });
})();
safeExposeGlobals({ stumpCubeRecipes });
