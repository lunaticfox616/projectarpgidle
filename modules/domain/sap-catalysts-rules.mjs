

export function catalystOpen(env, state) { return env.deps.contentProgression.holds('sapWound', state); }

export function catalystQuality(item) { return Math.max(0, Math.floor(Number(item.quality) || 0)); }

/** '' when this catalyst can go on the item, otherwise why not (crafting rules: no corrupted item; a full same-tag quality is pointless). */
export function catalystUseReason(env, item, key) {
    const kind = env.BY_KEY.get(key);
    if (!kind) return '없는 기폭제입니다.';
    if (!item || !item.slot) return '아이템을 선택하세요.';
    if (item.corrupted) return '타락한 장비에는 쓸 수 없습니다.';
    const same = env.deps.getItemQualityAttributeMode(item) === kind.mode;
    if (same && (item.qualityLockedByLimitBreak || catalystQuality(item) >= env.C.cap)) return '이미 이 품질 속성이고 품질을 더 올릴 수 없습니다.';
    return '';
}

/** Sets the item's quality attribute to the catalyst's tag and adds quality up to the cap (a limit-broken item keeps its quality).
 * @returns {{mode: string, before: number, after: number}} */
export function catalystApply(env, item, key) {
    const kind = env.BY_KEY.get(key), before = catalystQuality(item);
    item.qualityAttribute = kind.mode;
    if (!item.qualityLockedByLimitBreak) item.quality = Math.max(before, Math.min(env.C.cap, before + env.C.quality));
    return { mode: kind.mode, before, after: catalystQuality(item) };
}

/** A random catalyst key. */
export function catalystPick(env, random) { return env.KEYS[Math.min(env.KEYS.length - 1, Math.floor(random() * env.KEYS.length))]; }

/** The catalyst a sap pack kill drops (data/atlas.js encounters.sapWound), through the ordinary currency drops (js/loot.js). */
export function catalystKillDrops(env, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== 'sapWound' || enemy.isBoss) return [];
    return random() < env.C.killDrops[enemy.isElite ? 'elite' : 'normal'] ? [[catalystPick(env, random), 1]] : [];
}

/** 뿌리 조합(data/stump-cube.js root_catalyst): two grown roots of one colour → that colour's catalyst. */
export function catalystRootRecipe(env, [group], state) {
    if (!catalystOpen(env, state)) return { ok: false, reason: env.deps._t('수액 상처 해금 뒤에 만들 수 있습니다.') };
    const kind = env.BY_COLOR.get(group[0] && group[0].item && group[0].item.color);
    if (!kind) return { ok: false, reason: env.deps._t('이 색의 기폭제는 없습니다.') };
    return { ok: true, consumed: group, outputs: [{ kind: 'currency', key: kind.key, amount: 1 }] };
}

/** 기폭제 바꾸기(data/stump-cube.js catalyst_exchange, 2026-10-30 사용자): the vine colour's catalyst, and the held catalysts of
 * other kinds that may be turned into it (STUMP_CUBE_CATALYST_EXCHANGE of them), or why it cannot be made. */
export function catalystExchangePlan(env, vine, state) {
    if (!catalystOpen(env, state)) return { reason: env.deps._t('수액 상처 해금 뒤에 만들 수 있습니다.') };
    const kind = env.BY_COLOR.get(vine && vine.color);
    if (!kind) return { reason: env.deps._t('이 색의 기폭제는 없습니다.') };
    const held = env.KEYS.filter(key => key !== kind.key && (state.currencies[key] || 0) > 0);
    const total = held.reduce((sum, key) => sum + Math.floor(state.currencies[key] || 0), 0);
    return total >= env.deps.STUMP_CUBE_CATALYST_EXCHANGE ? { kind, held } : { reason: env.deps._t('바꿀 다른 기폭제가 {value}개 필요합니다.', { value: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }) };
}

/** A grown vine turns STUMP_CUBE_CATALYST_EXCHANGE held catalysts of other kinds, each picked at random among the kinds still held, into as many of
 * the vine colour's catalyst. */
export function catalystExchangeRecipe(env, [[vine]], state, random = Math.random) {
    const plan = catalystExchangePlan(env, vine.item, state);
    if (plan.reason) return { ok: false, reason: plan.reason };
    const paid = {};
    for (let i = 0; i < env.deps.STUMP_CUBE_CATALYST_EXCHANGE; i++) {
        const left = plan.held.filter(key => Math.floor(state.currencies[key] || 0) > (paid[key] || 0));
        const key = left[Math.min(left.length - 1, Math.floor(random() * left.length))];
        paid[key] = (paid[key] || 0) + 1;
    }
    return { ok: true, consumed: [vine], paid, outputs: [{ kind: 'currency', key: plan.kind.key, amount: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }] };
}
