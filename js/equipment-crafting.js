// Explicit affix provenance and admission rules. No payment, rolling, DOM or state mutation.
const equipmentCrafting = (() => {
    const labels = Object.freeze({ spore: '홀씨', fossil: '화석', transplant: '이식' });
    const sporeActions = new Set(['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos']);
    const sporeRerolls = new Set(['transmute', 'alteration', 'alchemy', 'chaos']);
    // Shared by actual spore rolls and crafting target previews (data/affix-tags.js AFFIX_TAG_LISTS.spore).
    const sporeStatIds = Object.freeze(Object.fromEntries(Object.entries(AFFIX_TAG_LISTS.spore)
        .map(([mode, rule]) => [mode, new Set(resolveAffixTagList(rule, MOD_DB))])));

    /** Read explicit origin or known legacy flags; never infer origin from an affix value/tier. */
    function getSource(stat) {
        if (!stat) return undefined;
        // Rift spores consume spores but add a fossil effect, so share the fossil allowance.
        if (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) return 'fossil';
        if (['fossilRiftBlank', 'fossilRiftAmp'].includes(stat.id)) return 'fossil';
        return Object.hasOwn(labels, stat.craftSource) ? stat.craftSource : undefined;
    }

    function getLabel(stat) {
        return labels[getSource(stat)] || '';
    }

    /** Filter an already eligible pool without rolling or changing weights. */
    function filterSporeMods(pool, mode) {
        const ids = sporeStatIds[mode] || new Set();
        return pool.filter(mod => ids.has(mod.statId || mod.id));
    }

    /** Resolve displayed currency names once for both admission UI and the actual craft. */
    function resolveAction(key, rarity) {
        if (key === 'magicBud') return rarity === 'normal' ? 'transmute' : 'alteration';
        if (key === 'sapBud') return rarity === 'magic' ? 'regal' : 'exalted';
        if (key === 'formlessDew') return rarity === 'normal' ? 'alchemy' : 'chaos';
        return { goldenRule: 'divine', fairyRing: 'chance', pruningShears: 'annulment', blightSpore: 'scour', emberBranch: 'tainted' }[key] || key;
    }

    /**
     * @param {{stats?: Array<{id: string, craftSource?: string, lockedByHoney?: boolean, lockedByRift?: boolean}>}} item
     * @param {EquipmentCraftSource} source One explicit effect from each source may coexist.
     * @param {boolean} reroll False for additive crafting; transplant never replaces an existing transplant.
     * @param {string} retainedMarker Existing immutable cost marker recreated by the SAME rift-fossil recipe.
     * @returns {string} Empty if allowed. Call before rolling, payment or mutation.
     */
    function getBlockReason(item, source, reroll = false, retainedMarker = '') {
        if (item.corrupted) return '타락한 아이템은 제작할 수 없습니다.';
        const existing = (item.stats || []).filter(stat => getSource(stat) === source);
        if (!existing.length) return '';
        if (!reroll || source === 'transplant') return `이미 ${labels[source]} 옵션이 있어 추가할 수 없습니다.`;
        const locked = existing.some(stat => stat.id !== retainedMarker && keptOnReroll(item, stat));
        return locked ? `잠긴 ${labels[source]} 옵션이 있어 재련할 수 없습니다.` : '';
    }

    /** action is the resolved orb action, and mode is 'none' for non-equipment crafting. */
    function getSporeBlockReason(item, action, mode) {
        if (mode === 'none' || !sporeActions.has(action)) return '';
        const reroll = sporeRerolls.has(action);
        const reason = getBlockReason(item, 'spore', reroll);
        if (reason || !reroll) return reason;
        return getRerollSpaceReason(item, 1, ['transmute', 'alteration'].includes(action) ? magicLineCap() : EXPLICIT_AFFIX_LINE_CAP);
    }

    function getFossilBlockReason(item, fossilKey) {
        // The blank + amplifier are one fossil effect with a two-affix cost, not two fossil crafts.
        const marker = fossilKey === 'fossilRift' ? 'fossilRiftBlank' : '';
        return getBlockReason(item, 'fossil', true, marker) || getRerollSpaceReason(item, marker ? 2 : 1, EXPLICIT_AFFIX_LINE_CAP, marker);
    }

    function getFossilUseReason(item, fossil, season, currencies) {
        if ((season || 1) < 3) return '미궁 제작은 루프3부터 사용할 수 있습니다.';
        if (!fossil) return '존재하지 않는 화석입니다.';
        if ((currencies[fossil.key] || 0) <= 0) return `${fossil.name}이 부족합니다.`;
        if (!item) return '먼저 아이템을 선택하세요.';
        return getFossilBlockReason(item, fossil.key);
    }

    function getRerollSpaceReason(item, required, cap, retainedMarker = '') {
        const locked = (item.stats || []).filter(stat => stat && stat.id !== retainedMarker && keptOnReroll(item, stat));
        const occupied = locked.length + (item.chaosInfusion ? 1 : 0);
        return occupied + required > cap ? '잠금/주입 옵션 때문에 보장 옵션을 넣을 자리가 없습니다.' : '';
    }

    /** MOD_DB 줄의 종류: 'prefix' | 'suffix'. 그 밖의 줄('special')은 종류 한도를 세지 않는다. */
    function affixKind(mod) {
        return mod && (mod.type === 'prefix' || mod.type === 'suffix') ? mod.type : 'special';
    }

    /** 저장된 추가 옵션 한 줄의 종류. 화석 전용 줄, 균열 표식, 심해 고정 옵션은 'special'. */
    function storedAffixKind(item, stat) {
        if (!stat || stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore || stat.oceanBenchOptionId) return 'special';
        return affixKind(findStoredEquipmentAffix(item, stat));
    }

    /** The kind the next full reroll keeps (item.affixKeep, a golden rule service, data/items.js AFFIX_KEEP_RULES), or ''. */
    function keptKind(item) {
        return item && (item.affixKeep === 'prefix' || item.affixKeep === 'suffix') ? item.affixKeep : '';
    }

    /** A line a full reroll keeps: honey and rift locks, and every line of the kept kind. */
    function keptOnReroll(item, stat) {
        if (!stat) return false;
        return !!(stat.lockedByHoney || stat.lockedByRift) || (!!keptKind(item) && storedAffixKind(item, stat) === keptKind(item));
    }

    /** Why this kind cannot be kept now ('' when it can). Magic and rare equipment with a line of the kind. */
    function getAffixKeepReason(item, kind) {
        if (!item) return '먼저 장비를 선택하세요.';
        if (!AFFIX_KEEP_RULES.labels[kind]) return '보존할 종류를 고르세요.';
        if (item.corrupted || item.fusedRelic || item.hallReplica) return '이 장비는 옵션을 바꿀 수 없습니다.';
        if (!EXPLICIT_AFFIX_RULES[item.rarity]) return '마법이나 희귀 장비만 보존할 수 있습니다.';
        if (keptKind(item)) return `이미 ${AFFIX_KEEP_RULES.labels[keptKind(item)]} 보존이 걸려 있습니다.`;
        return (item.stats || []).some(stat => storedAffixKind(item, stat) === kind) ? '' : `${AFFIX_KEEP_RULES.labels[kind]} 옵션이 없습니다.`;
    }

    /** 종류별 줄 수(혼돈 주입 포함). skip은 바꿀 줄처럼 셈에서 뺄 한 줄. */
    function affixCounts(item, skip = null) {
        const counts = { prefix: 0, suffix: 0, special: 0 };
        const lines = (item.stats || []).concat(item.chaosInfusion ? [item.chaosInfusion] : []);
        for (const stat of lines) if (stat && stat !== skip) counts[storedAffixKind(item, stat)]++;
        return counts;
    }

    /**
     * 종류별 남은 자리(data/items.js EXPLICIT_AFFIX_RULES). 한도가 없는 희귀도(일반, 고유)는 null.
     * 예전 규칙으로 한도를 넘은 장비도 줄을 지우지 않는다: 그 종류는 0 자리일 뿐이다.
     */
    function affixRoom(item, rarity = item.rarity, skip = null) {
        const rule = EXPLICIT_AFFIX_RULES[rarity];
        if (!rule) return null;
        const used = affixCounts(item, skip);
        return { prefix: Math.max(0, rule.prefix - used.prefix), suffix: Math.max(0, rule.suffix - used.suffix) };
    }

    /** room이 null이면 제한 없음. */
    function fitsRoom(room, mod) {
        const kind = affixKind(mod);
        return !room || kind === 'special' || room[kind] > 0;
    }

    function magicLineCap() {
        return EXPLICIT_AFFIX_RULES.magic.prefix + EXPLICIT_AFFIX_RULES.magic.suffix;
    }

    /**
     * 한 줄을 바꾸는 제작(바다의 선물 확정 부여와 변환, 심해의 파편, 봉인 재단): 새 줄은 바뀔 줄을 뺀 자리가 남는 종류에서만 고른다.
     * indexes는 바뀔 수 있는 줄(봉인 안 된 줄)의 번호. pick(mods)가 새 줄을 고르고, 바뀔 줄은 같은 종류를 먼저, choose가
     * 'lowest'면 가장 낮은 단계(같으면 뒤 줄), 'random'이면 무작위. 고를 수 없으면 null.
     */
    function pickReplacement(item, pool, indexes, pick, choose = 'random') {
        const room = affixRoom(item), kindOf = index => storedAffixKind(item, item.stats[index]);
        const freed = new Set(indexes.map(kindOf));
        const mod = pick(pool.filter(row => fitsRoom(room, row) || freed.has(affixKind(row))));
        if (!mod) return null;
        const kind = affixKind(mod), same = indexes.filter(index => kindOf(index) === kind);
        const candidates = same.length || !fitsRoom(room, mod) ? same : indexes;
        if (!candidates.length) return null;
        if (choose !== 'lowest') return { mod, index: candidates[Math.floor(Math.random() * candidates.length)] };
        const tier = index => Number(item.stats[index].tier) || 0;
        return { mod, index: candidates.reduce((best, index) => (tier(index) <= tier(best) ? index : best)) };
    }

    /**
     * 추가 옵션 머리말(게임 툴팁과 공개 프로필): "추가 옵션 5/6 (접두 2/3, 접미 3/3)". used가 없거나(예전 프로필) 한도가 없는
     * 희귀도(일반, 고유)면 "추가 옵션 (5/6)". over는 예전 규칙으로 한도를 넘은 장비.
     */
    function affixHeader(rarity, count, used) {
        const rule = EXPLICIT_AFFIX_RULES[rarity];
        if (!rule || !used) return { text: `추가 옵션 (${count}/${EXPLICIT_AFFIX_LINE_CAP})`, over: false };
        const cap = rarity === 'magic' ? magicLineCap() : EXPLICIT_AFFIX_LINE_CAP;
        return { text: `추가 옵션 ${count}/${cap} (접두 ${used.prefix}/${rule.prefix}, 접미 ${used.suffix}/${rule.suffix})`,
            over: used.prefix > rule.prefix || used.suffix > rule.suffix };
    }

    const basicActions = Object.freeze(['transmute', 'alteration', 'alchemy', 'chaos', 'regal', 'exalted']);
    const rerollActions = Object.freeze(['transmute', 'alteration', 'alchemy', 'chaos']);
    /** The affix a spore mode guarantees for action on item, or null (spore mode off, or nothing of its family is open): picked by
     * weight among the open affixes in the spore's family, counted against the result's rarity (새싹 transmute and alteration: magic,
     * one and one; the rest: rare, three and three). A reroll counts only the lines it keeps (keptOnReroll, as rerollExplicitMods).
     * The live craft (js/passives.js useCurrency) and the bench's rehearsal (js/crafting-goal-options.js rehearse) both pick here. */
    function sporePool(item, action, mode) {
        if (mode === 'none') return [];
        const base = rerollActions.includes(action) ? { ...item, stats: (item.stats || []).filter(stat => keptOnReroll(item, stat)) } : item;
        return filterSporeMods(getOpenAffixMods(base, ['transmute', 'alteration'].includes(action) ? 'magic' : 'rare'), mode);
    }
    function pickSporeMod(item, action, mode) {
        const pool = sporePool(item, action, mode);
        return pool.length ? pickWeightedMod(pool) : null;
    }
    /** mod's guaranteed line, rolled over the whole spore tier range of item (the family is promised, the top two tiers are not). */
    function rollSporeLine(item, mod) {
        if (!mod) return null;
        const range = getCraftTierRangeForItem(item, 'spore');
        return { ...rollAffixValueInTierRange(mod, range.min, range.max), craftSource: 'spore' };
    }
    // ---------------------------------------------------------------- 제작 뿌리 (data/items.js CRAFT_OMENS)
    // 2026-10-18 사용자: "craft of exile 사이트를 참고해서 ... 가중치 메커니즘, 크래프팅 방법 및 컨텐츠와 연계성". 걸어 둔 뿌리 하나가 자기가
    // 바꾸는 다음 제작 한 번에 쓰이고 하나 줄어든다. 실제 제작(js/passives.js useCurrency)과 제작 연구의 연습(rehearse)이 같은 규칙을 쓴다.
    /** omen key with side as the rolls read it: { key, side, effect } (practice uses it without owning one), or null. */
    function omenSpec(key, side) {
        const armed = normalizeCraftOmen({ key, side });
        return armed && { ...armed, effect: CRAFT_OMENS.effects[armed.key].effect };
    }
    /** Arms omen key (side for 허기) for the next craft it fits; an empty key disarms. { ok, reason }. */
    function armOmen(state, key, side) {
        if (!key) { state.craftOmen = null; return { ok: true }; }
        if (!CRAFT_OMENS.keys.includes(key)) return { ok: false, reason: '알 수 없는 뿌리입니다.' };
        if ((state.currencies[key] || 0) < 1) return { ok: false, reason: `${ORB_DB[key].name}가 없습니다.` };
        state.craftOmen = normalizeCraftOmen({ key, side });
        return { ok: true };
    }
    /** Whether omen changes action on item: its action, and for an added line no spore guarantee (that line is the spore's) and an
     * open mod on the omen's side. */
    function omenFits(item, action, omen, sporeMode = 'none') {
        if (!omen || !CRAFT_OMENS.effects[omen.key].actions.includes(action)) return false;
        if (!['regal', 'exalted'].includes(action)) return true;
        return sporeMode === 'none' && (omen.effect !== 'side' || getOpenAffixMods(item, 'rare').some(mod => affixKind(mod) === omen.side));
    }
    /** The armed omen that changes this craft ({ key, side, effect }), or null: none armed, none left, or it does not fit. */
    function omenFor(state, action, item, sporeMode = 'none') {
        const armed = normalizeCraftOmen(state.craftOmen), omen = armed && (state.currencies[armed.key] || 0) > 0 ? omenSpec(armed.key, armed.side) : null;
        return omenFits(item, action, omen, sporeMode) ? omen : null;
    }
    /** After the craft omen changed: one fewer, disarmed. The log's words for it ('' without one). */
    function spendOmen(state, omen) {
        if (!omen) return '';
        state.currencies[omen.key] = Math.max(0, (state.currencies[omen.key] || 0) - 1);
        state.craftOmen = null;
        return `, ${ORB_DB[omen.key].name}`;
    }
    const floorTier = tier => Math.max(1, Math.ceil(tier * CRAFT_OMENS.floorShare));
    /** One new line of mod at item tier: 거름 rolls above a tier floor. */
    function rollOmenLine(mod, tier, omen) {
        return omen && omen.effect === 'floor' ? rollAffixValueInTierRange(mod, floorTier(tier), tier) : rollAffixValue(mod, tier);
    }
    /** 엮음: (pool, picked) → pool where a mod sharing a tag with a line on item (or a mod picked before it this craft) weighs
     * weaveMul times more, as fossils weigh their tags (js/skills.js). */
    function weaveWeigh(item) {
        return (pool, picked) => {
            const held = new Set([...(item.stats || []), ...picked].flatMap(getAffixTags));
            return pool.map(mod => getAffixTags(mod).some(tag => held.has(tag)) ? { ...mod, weight: (Number(mod.weight) || 1) * CRAFT_OMENS.weaveMul } : mod);
        };
    }
    /** The line an added craft (regal, exalted) picks: an open mod of item, on 허기's side, weighed by 엮음. */
    function pickAddMod(item, omen) {
        const effect = omen && omen.effect;
        const pool = getOpenAffixMods(item, 'rare').filter(mod => effect !== 'side' || affixKind(mod) === omen.side);
        return pickWeightedMod(effect === 'weave' ? weaveWeigh(item)(pool, []) : pool);
    }
    /** The row 전정 가위 cuts among removable rows ({ index, stat }): with 가지치기 the lowest tier among tiered lines (a fixed line,
     * shown as T0 whatever tier it stores, is not low: it has no better roll), else any. */
    function pickPruneLine(removable, omen) {
        const tiered = removable.filter(row => !isFixedEquipmentAffix(row.stat) && Number(row.stat.tier) > 0);
        if (!omen || omen.effect !== 'prune' || !tiered.length) return rndChoice(removable);
        const low = Math.min(...tiered.map(row => Number(row.stat.tier)));
        return rndChoice(tiered.filter(row => Number(row.stat.tier) === low));
    }
    /** What an omen changes in a reroll (js/passives.js rerollExplicitMods): each new line's roll, and 엮음's weights. */
    function omenRerollOptions(item, tier, omen) {
        return omen ? { rollLine: mod => rollOmenLine(mod, tier, omen), weigh: omen.effect === 'weave' ? weaveWeigh(item) : null } : {};
    }
    function addedLine(item, options) {
        if (options.guaranteedStat) return options.guaranteedStat;
        const mod = options.addedMod || pickAddMod(item, options.omen);
        return mod ? rollOmenLine(mod, getItemCraftTier(item), options.omen) : null;
    }
    /** Shared item-only roll for live currency use and the crafting bench's rehearsal. Payment and saves stay with the caller.
     * options.omen: the 제작 뿌리 that changes this craft ({ key, side, effect }, omenFor or omenSpec). */
    function applyBasic(item, action, options = {}) {
        if (!basicActions.includes(action)) throw Error('지원하지 않는 기본 제작');
        const tier = getItemCraftTier(item), guaranteed = options.guaranteedStat || null;
        if (['regal', 'exalted'].includes(action)) {
            const line = addedLine(item, options);
            if (line) item.stats.push(line);
            if (action === 'regal') item.rarity = 'rare';
            updateItemName(item);
            return;
        }
        item.rarity = ['transmute', 'alteration'].includes(action) ? 'magic' : 'rare';
        rerollExplicitMods(item, item.rarity, tier, { guaranteedStat: guaranteed, rerollChaosInfusion: item.rarity === 'rare', ...omenRerollOptions(item, tier, options.omen) });
    }

    // ---------------------------------------------------------------- 성화의 뿌리: 세 결과 가운데 고르기 (game.craftChoice)
    // 2026-10-18 사용자: "다음 제작에 세번 굴려서 세 결과 중에 선택". 아이템은 첫 결과를 바로 받고, 세 결과는 고를 때까지 저장에 남는다
    // (다시 불러와도 다시 묻는다). 고르기는 같은 아이템의 제작 칸만 바꾼다: 새 아이템을 만들지 않는다.
    /** The fields a craft writes (applyBasic, fossils, annul, scour, spores, honey): explicit lines, rarity, name, chaos infusion,
     * the kept side. Base lines, quality, sockets and corruption are not among them. */
    const CRAFT_FIELDS = Object.freeze(['rarity', 'name', 'stats', 'chaosInfusion', 'affixKeep']);
    /** A deep copy of item's craft fields (a missing one as null). */
    function craftFields(item) {
        return JSON.parse(JSON.stringify(Object.fromEntries(CRAFT_FIELDS.map(key => [key, item[key] === undefined ? null : item[key]]))));
    }
    /** Puts saved craft fields back on item, as a copy (a null kept side is no kept side). */
    function putCraftFields(item, fields) {
        Object.assign(item, JSON.parse(JSON.stringify(fields)));
        if (item.affixKeep == null) delete item.affixKeep;
    }
    const sameCraftFields = (item, fields) => JSON.stringify(craftFields(item)) === JSON.stringify(fields);
    /** The bag or worn item with id, or null. */
    function findCraftItem(state, id) {
        return (state.inventory || []).find(row => row && row.id === id) || Object.values(state.equipment || {}).find(row => row && row.id === id) || null;
    }
    /** A live basic craft (js/passives.js useCurrency): applyBasic, and with 성화의 뿌리 more rolls on copies of the item as it was. The
     * item keeps the first result; all of them wait in state.craftChoice for the player's pick (pickChoice). */
    function craftBasic(state, item, action, options) {
        const before = options.omen && options.omen.effect === 'choice' ? JSON.parse(JSON.stringify(item)) : null;
        applyBasic(item, action, options);
        if (!before) return;
        const others = Array.from({ length: CRAFT_OMENS.choices - 1 }, () => {
            const copy = JSON.parse(JSON.stringify(before));
            applyBasic(copy, action, { ...options, addedMod: null });
            return craftFields(copy);
        });
        state.craftChoice = { itemId: item.id, options: [craftFields(item), ...others] };
    }
    /** The 성화의 뿌리 pick waiting ({ item, options }), or null. One whose item is gone or changed since (sold, crafted another way)
     * is dropped here. */
    function pendingChoice(state) {
        const choice = state.craftChoice;
        if (!choice) return null;
        const item = findCraftItem(state, choice.itemId);
        if (item && sameCraftFields(item, choice.options[0])) return { item, options: choice.options };
        state.craftChoice = null;
        return null;
    }
    /** Puts result index of the waiting pick on its item and ends the pick. Returns the item, or null when nothing waits. */
    function pickChoice(state, index) {
        const pending = pendingChoice(state);
        if (!pending || !pending.options[index]) return null;
        putCraftFields(pending.item, pending.options[index]);
        state.craftChoice = null;
        return pending.item;
    }

    // ---------------------------------------------------------------- 기억 조각칼 (item.imprint, 화면 이름 기억 새겨짐)
    // 2026-10-18 사용자가 고른 제작 방법(PoE 야수 제작의 Imprint에서): 장비의 제작 칸(CRAFT_FIELDS)을 새겨 두고 한 번 되돌린다. 같은
    // 장비의 칸만 바꾸므로 장비가 늘지 않는다. 타락한 장비, 고유, 융합 유물, 전당 소장품은 새기지도 되돌리지도 않는다.
    const IMPRINT_KEY = 'memoryImprint';
    /** A saved imprint (craft fields of a magic or rare item), or null: the load boundary (js/passives.js normalizeItem). */
    function normalizeImprint(value) {
        return value && typeof value === 'object' && ['magic', 'rare'].includes(value.rarity) && Array.isArray(value.stats) ? value : null;
    }
    function imprintBlock(item) {
        if (!item) return '아이템을 선택하세요.';
        if (item.corrupted) return '타락한 장비는 새기거나 되돌릴 수 없습니다.';
        return item.fusedRelic || item.rarity === 'unique' || item.hallReplica ? '고유 장비, 융합 유물, 전당 소장품에는 쓸 수 없습니다.' : '';
    }
    /** Why the build may not change now, or '': the woodsman fight puts gear and bag back to its snapshot every tick (not the wallet),
     * so a craft paid then would be lost. */
    function buildLockReason(state) {
        return state && state.woodsmanBuildLock ? '☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.' : '';
    }
    /** Why item cannot be engraved now, or '': the build lock, a magic or rare piece, and a 기억 조각칼 in the wallet. */
    function engraveReason(state, item) {
        const reason = buildLockReason(state) || imprintBlock(item);
        if (reason) return reason;
        if (!['magic', 'rare'].includes(item.rarity)) return '마법이나 희귀 장비에 새깁니다.';
        return (state.currencies[IMPRINT_KEY] || 0) > 0 ? '' : `${ORB_DB[IMPRINT_KEY].name}이 없습니다.`;
    }
    /** Engraves item's craft fields for one 기억 조각칼 (an older imprint is replaced). { ok, reason }. */
    function engrave(state, item) {
        const reason = engraveReason(state, item);
        if (reason) return { ok: false, reason };
        state.currencies[IMPRINT_KEY] -= 1;
        item.imprint = craftFields(item);
        return { ok: true };
    }
    /** Why item cannot go back to its imprint now, or ''. Its rarity may have changed since (a scour makes it normal). */
    function restoreReason(item) {
        return imprintBlock(item) || (normalizeImprint(item.imprint) ? '' : '새긴 기억이 없습니다.');
    }
    /** Puts item back to its imprint; the imprint is used up. { ok, reason }. */
    function restoreImprint(item) {
        const reason = restoreReason(item);
        if (reason) return { ok: false, reason };
        putCraftFields(item, item.imprint);
        delete item.imprint;
        return { ok: true };
    }

    return Object.freeze({ basicActions, rerollActions, applyBasic, sporePool, pickSporeMod, rollSporeLine, getSource, getLabel, filterSporeMods, resolveAction, getBlockReason, getSporeBlockReason, getFossilBlockReason, getFossilUseReason,
        affixKind, storedAffixKind, keptKind, keptOnReroll, getAffixKeepReason, affixCounts, affixRoom, fitsRoom, pickReplacement, affixHeader,
        omenSpec, armOmen, omenFits, omenFor, spendOmen, pickAddMod, pickPruneLine, craftBasic, pendingChoice, pickChoice,
        normalizeImprint, engraveReason, engrave, restoreReason, restoreImprint, buildLockReason });
})();
safeExposeGlobals({ equipmentCrafting });
