

export function wardIsWard(env, item) { return !!item && item.slot === env.R.slot; }

/** 줍기 필터의 항상 줍기 '액막이'(기본 켬)가 켜져 있으면 줍기 필터와 등급 자동 해체를 건너뛴다(마법 등급은 이름뿐이라). */
export function wardKeptOnPickup(env, item, state) { return wardIsWard(env, item) && !!state.settings && (state.settings.itemFilterAlways || {}).ward !== false; }

export function wardUnlocked(env, state) { return typeof env.deps.contentProgression === 'object' && env.deps.contentProgression.isUnlocked(env.R.unlock, state); }

// ---------------------------------------------------------------- 허리띠의 액막이 칸
export function wardIsBelt(item) { return !!item && item.slot === '허리띠'; }

/** 허리띠 하나의 액막이 칸 수(1~3): 아이템에 wardSlotRoll로 적혀 있다. 아직 안 적힌 허리띠(2026-10-11 전의 저장, 막 만든 장비)는
 * 제 id에서 나온 값이라 몇 번을 불러와도, 어디서 읽어도 같다. 허리띠가 아니면 0. */
export function wardBeltSlots(env, item) {
    if (!wardIsBelt(item)) return 0;
    const { min, max } = env.R.beltSlots, stored = Math.floor(Number(item.wardSlotRoll));
    if (stored >= min && stored <= max) return stored;
    return min + env.deps.hashSeed(`ward-belt:${item.id === undefined ? item.name : item.id}`) % (max - min + 1);
}

/** js/item-rolls.js normalizeItem: 허리띠에 제 칸 수를 적어 둔다(거래와 복사에도 따라간다). */
export function wardStampBelt(env, item) {
    if (wardIsBelt(item)) item.wardSlotRoll = wardBeltSlots(env, item);
    return item;
}

/** 축복의 꽃잎(js/item-rolls.js useCurrency): 허리띠의 칸 수를 1~3에서 고르게 다시 굴린다. 허리띠가 아니면 그대로 두고 0. */
export function wardRerollBelt(env, item, random = Math.random) {
    if (!wardIsBelt(item)) return 0;
    const { min, max } = env.R.beltSlots;
    item.wardSlotRoll = min + Math.floor(random() * (max - min + 1));
    return item.wardSlotRoll;
}

/** 허리띠 카드에 적는 칸 수(게임 툴팁과 프로필 카드): 허리띠가 아니거나 군락지가 아직 안 열렸으면 undefined. */
export function wardBeltRoll(env, item, state) { return wardIsBelt(item) && wardUnlocked(env, state) ? wardBeltSlots(env, item) : undefined; }

/** 체이싱 고유 허리띠 '편린을 꿴 허리띠'(R.stringEffectKey): 더하는 칸 수와 끼운 액막이 줄의 배수. 안 꼈으면 { slots: 0, mul: 1 }. */
export function wardWardString(env, equipment) {
    const item = Object.values(equipment || {}).find(entry => entry && entry.rarity === 'unique' && entry.uniqueEffectKey === env.R.stringEffectKey);
    const p = item ? item.uniqueEffectParams || {} : {};
    return { slots: Math.max(0, Math.floor(Number(p.slots) || 0)), mul: Math.max(1, Number(p.mul) || 1) };
}

/** 액막이 칸 수: 기본 0, 낀 허리띠의 칸 수(1~3), 초월 공허 '액막이 매듭' 하나마다 +1, 가디언 '수호 재생' +1, 고유 '천 개의 유리병' +1,
 * '편린을 꿴 허리띠' +2. 5칸까지. */
export function wardSlotCount(env, state) {
    const equipment = state.equipment || {};
    const extra = [wardBeltSlots(env, equipment['허리띠']),
        typeof env.deps.getTranscendentVoidPassiveCount === 'function' ? env.deps.getTranscendentVoidPassiveCount(env.R.voidPassive, state) : 0,
        typeof env.deps.hasKeystone === 'function' && env.deps.hasKeystone(env.R.ascendNode, state) ? 1 : 0,
        Object.values(equipment).some(item => item && item.uniqueEffectKey === env.R.uniqueEffectKey) ? 1 : 0, wardWardString(env, equipment).slots];
    return Math.max(0, Math.min(env.R.maxSlots, env.R.baseSlots + extra.reduce((sum, value) => sum + value, 0)));
}

/** 장비창의 바꾸면 표(js/equipment-window-ui.js wardRows): `item`을 `slot`에 끼우면 달라지는 액막이 칸 수. 그대로면 null.
 * @returns {{ from: number, to: number } | null} */
export function wardSlotChange(env, item, slot, state) {
    const from = wardSlotCount(env, state), to = wardSlotCount(env, { ...state, equipment: { ...(state.equipment || {}), [slot]: item } });
    return from === to ? null : { from, to };
}

/** The open ward slots ('액막이1'..): a ward left beyond them (the belt came off) waits there, off. */
export function wardOpenSlots(env, state) { return env.R.slots.slice(0, wardSlotCount(env, state)); }

/** Where a ward goes: the first open empty slot, else the first one (a full set swaps it). undefined with no open slot. */
export function wardPickSlot(env, state) {
    const open = wardOpenSlots(env, state);
    return open.find(slot => !(state.equipment || {})[slot]) || open[0];
}

export function wardOpenWards(env, state) { return wardOpenSlots(env, state).map(slot => (state.equipment || {})[slot]).filter((...args) => wardIsWard(env, ...args)); }

/** A 고유 액막이's (U.rows) param `name` when `item` is that one, else 0. */
export function wardUniqueParam(item, key, name) { return item.rarity === 'unique' && item.uniqueEffectKey === key ? Number((item.uniqueEffectParams || {})[name]) || 0 : 0; }

/** Lines of the wards in the open slots, as js/combat.js colonyWardBonus adds them: [{ stat, val }]. '편린을 꿴 허리띠' adds +100%
 * (its mul - 1) and each 메아리 매듭 its pct, all added up (2026-10-20 사용자: belt and one echo ×2.5, two ×3); the echo has no line of
 * its own, so only the other wards grow. */
export function wardEquippedLines(env, state) {
    const wards = wardOpenWards(env, state);
    const mul = wardWardString(env, state.equipment).mul + wards.reduce((sum, item) => sum + wardUniqueParam(item, 'wardEcho', 'pct'), 0) / 100;
    return wards.flatMap(item => (item.baseStats || []).map(line => ({ stat: line.id, val: (Number(line.val) || 0) * mul })));
}

/** 잔잔한 사건의 확률 배수(js/combat-incidents.js often): 열린 칸에 '사건을 부르는 방울'이 있으면 그 mul(겹치지 않는다), 아니면 1. */
export function wardIncidentMul(env, state) { return Math.max(1, ...wardOpenWards(env, state).map(item => wardUniqueParam(item, 'incidentBell', 'mul'))); }
