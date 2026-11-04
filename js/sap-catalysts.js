// 기폭제(12번 루프 32, 2026-10-08, data/sap-catalysts.js): 장비의 품질 속성을 그 태그로 바꾸고 품질을 2% 올린다(20%까지). 수액 상처
// 무리의 처치 드롭과, 그루터기 함 뿌리 조합(stumpCubeRecipes root_catalyst), 덩굴의 기폭제 바꾸기가 여기서 정한다. 품질 속성이 키우는 줄은 태그 규칙
// (data/affix-tags.js AFFIX_TAG_LISTS.quality)이 정하고, 스탯 계산은 js/equipment-stat-resolution.js가 그대로 한다.
const sapCatalysts = (() => {
    const C = SAP_CATALYSTS;
    const BY_KEY = new Map(C.kinds.map(kind => [kind.key, kind]));
    const BY_COLOR = new Map(C.kinds.filter(kind => kind.color).map(kind => [kind.color, kind]));
    const KEYS = Object.freeze(C.kinds.map(kind => kind.key));
    const open = state => contentProgression.holds('sapWound', state);
    const quality = item => Math.max(0, Math.floor(Number(item.quality) || 0));

    /** '' when this catalyst can go on the item, otherwise why not (crafting rules: no corrupted item; a full same-tag quality is pointless). */
    function useReason(item, key) {
        const kind = BY_KEY.get(key);
        if (!kind) return '없는 기폭제입니다.';
        if (!item || !item.slot) return '아이템을 선택하세요.';
        if (item.corrupted) return '타락한 장비에는 쓸 수 없습니다.';
        const same = getItemQualityAttributeMode(item) === kind.mode;
        if (same && (item.qualityLockedByLimitBreak || quality(item) >= C.cap)) return '이미 이 품질 속성이고 품질을 더 올릴 수 없습니다.';
        return '';
    }
    /** Sets the item's quality attribute to the catalyst's tag and adds quality up to the cap (a limit-broken item keeps its quality).
     * @returns {{mode: string, before: number, after: number}} */
    function apply(item, key) {
        const kind = BY_KEY.get(key), before = quality(item);
        item.qualityAttribute = kind.mode;
        if (!item.qualityLockedByLimitBreak) item.quality = Math.max(before, Math.min(C.cap, before + C.quality));
        return { mode: kind.mode, before, after: quality(item) };
    }
    /** A random catalyst key. */
    const pick = random => KEYS[Math.min(KEYS.length - 1, Math.floor(random() * KEYS.length))];
    /** The catalyst a sap pack kill drops (data/atlas.js encounters.sapWound), through the ordinary currency drops (js/loot.js). */
    function killDrops(enemy, random = Math.random) {
        if (!enemy || enemy.atlasEncounter !== 'sapWound' || enemy.isBoss) return [];
        return random() < C.killDrops[enemy.isElite ? 'elite' : 'normal'] ? [[pick(random), 1]] : [];
    }
    /** 뿌리 조합(data/stump-cube.js root_catalyst): two grown roots of one colour → that colour's catalyst. */
    function rootRecipe([group], state) {
        if (!open(state)) return { ok: false, reason: _t('수액 상처 해금 뒤에 만들 수 있습니다.') };
        const kind = BY_COLOR.get(group[0] && group[0].item && group[0].item.color);
        if (!kind) return { ok: false, reason: _t('이 색의 기폭제는 없습니다.') };
        return { ok: true, consumed: group, outputs: [{ kind: 'currency', key: kind.key, amount: 1 }] };
    }
    /** 기폭제 바꾸기(data/stump-cube.js catalyst_exchange, 2026-10-30 사용자): the vine colour's catalyst, and the held catalysts of
     * other kinds that may be turned into it (STUMP_CUBE_CATALYST_EXCHANGE of them), or why it cannot be made. */
    function exchangePlan(vine, state) {
        if (!open(state)) return { reason: _t('수액 상처 해금 뒤에 만들 수 있습니다.') };
        const kind = BY_COLOR.get(vine && vine.color);
        if (!kind) return { reason: _t('이 색의 기폭제는 없습니다.') };
        const held = KEYS.filter(key => key !== kind.key && (state.currencies[key] || 0) > 0);
        const total = held.reduce((sum, key) => sum + Math.floor(state.currencies[key] || 0), 0);
        return total >= STUMP_CUBE_CATALYST_EXCHANGE ? { kind, held } : { reason: _t('바꿀 다른 기폭제가 {value}개 필요합니다.', { value: STUMP_CUBE_CATALYST_EXCHANGE }) };
    }
    /** A grown vine turns STUMP_CUBE_CATALYST_EXCHANGE held catalysts of other kinds, each picked at random among the kinds still held, into as many of
     * the vine colour's catalyst. */
    function exchangeRecipe([[vine]], state, random = Math.random) {
        const plan = exchangePlan(vine.item, state);
        if (plan.reason) return { ok: false, reason: plan.reason };
        const paid = {};
        for (let i = 0; i < STUMP_CUBE_CATALYST_EXCHANGE; i++) {
            const left = plan.held.filter(key => Math.floor(state.currencies[key] || 0) > (paid[key] || 0));
            const key = left[Math.min(left.length - 1, Math.floor(random() * left.length))];
            paid[key] = (paid[key] || 0) + 1;
        }
        return { ok: true, consumed: [vine], paid, outputs: [{ kind: 'currency', key: plan.kind.key, amount: STUMP_CUBE_CATALYST_EXCHANGE }] };
    }
    return Object.freeze({ keys: KEYS, open, useReason, apply, killDrops, rootRecipe, exchangePlan, exchangeRecipe, kind: key => BY_KEY.get(key) || null,
        isCatalyst: key => BY_KEY.has(key) });
})();
safeExposeGlobals({ sapCatalysts });
