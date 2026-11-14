import { contentKind, contentIsUnlocked, contentRequirements, contentCanOpen } from './content-unlock-rules.mjs';
import { contentBalance } from './content-unlock-points.mjs';

/** The cheapest paid unlock whose conditions are met now, or null while every remaining one waits for a loop or progress. The goal
 * (js/content-unlock-guide.js) points at it; 강화 steps are left to their cards in the unlock tab. */
export function contentCheapestOpen(env, owner) {
    return env.deps.CONTENT_UNLOCK_CATALOG.filter(def => contentKind(def) === 'paid' && !def.series && owner.season >= def.minLoop && !contentIsUnlocked(env, def.id, owner)
        && contentRequirements(env, def.id, owner).every(row => row.met))
        .reduce((best, def) => (!best || def.cost < best.cost ? def : best), null);
}

export function contentStatus(env, id, owner) {
    const def = env.definitions.get(id);
    if (!def) return { available: false, reason: env.deps._t('알 수 없는 콘텐츠입니다.') };
    if (contentIsUnlocked(env, id, owner)) return { available: false, reason: env.deps._t('해금 완료'), unlocked: true };
    const missing = contentRequirements(env, id, owner).filter(row => !row.met);
    if (missing.length) return { available: false, reason: env.deps._t('{label} 필요', { label: env.deps._t(missing[0].label) }) };
    if (contentBalance(env, owner) < def.cost) return { available: false, reason: env.deps._t('해금 포인트 부족') };
    return { available: true, reason: env.deps._t('{cost}점으로 해금', { cost: def.cost }) };
}

export function contentSync(env, owner) {
    const state = owner.contentProgression;
    if (!state) return;
    state.highestLoop = Math.max(state.highestLoop, Math.floor(owner.season || 1));
    Object.assign(owner.unlocks, { char: contentCanOpen(env, 'tab-char', owner), items: true, skills: true, map: contentCanOpen(env, 'tab-map', owner), season: owner.season >= 2 });
    for (const def of env.deps.CONTENT_UNLOCK_CATALOG) {
        const opened = contentIsUnlocked(env, def.id, owner);
        if (def.gate) owner.unlocks[def.gate] = opened;
        for (const flag of def.flags || []) owner[flag] = opened;
    }
    const automatic = env.deps.CONTENT_UNLOCK_CATALOG.filter(def => contentKind(def) === 'auto' && contentIsUnlocked(env, def.id, owner)).map(def => def.id);
    state.automatic = [...new Set([...state.automatic, ...automatic])];
}

/** One-time entry rewards share the purchase transaction; load/loop changes never replay them. */
export function contentGrantEntryReward(env, id, key, owner) {
    if (id === 'craft') owner.currencies[key]++;
    if (id === 'support') {
        if (!env.deps.hasSupportGemOwned(key, owner)) {
            owner.supports.push(key);
            owner.supportGemData[key] = env.deps.normalizeGemRecord(null);
        }
    }
}

/** Synchronous check-and-spend: validate choices before mutating any state. */
export function contentPurchase(env, id, owner, rewardKey) {
    const def = env.definitions.get(id), check = contentStatus(env, id, owner);
    if (!check.available) return { ok: false, message: check.reason };
    if (contentKind(def) !== 'paid') return { ok: false, message: env.deps._t('조건을 채우면 저절로 열립니다.') };
    const choices = def.rewardChoices || [];
    const key = rewardKey === undefined ? choices[0]?.key : rewardKey;
    if (choices.length && !choices.some(row => row.key === key)) return { ok: false, message: env.deps._t('받을 보상을 선택하세요.') };
    contentGrantEntryReward(env, id, key, owner);
    owner.contentProgression.unlocked.push(id);
    owner.contentProgression.paidCosts[id] = def.cost;
    contentSync(env, owner);
    return { ok: true, message: env.deps._t('{name} 해금', { name: env.deps._t(def.name) }) };
}

/** A saved destination is only a UI preference. It never changes purchase eligibility or the ledger. */
export function contentPlanTarget(env, id, owner) {
    if (!owner.contentProgression || (id !== '' && !env.definitions.has(id))) return false;
    owner.contentProgression.plannedUnlockId = id;
    return true;
}
