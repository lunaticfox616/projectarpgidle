import { threadRewardHeldCurrency, threadRewardPlan, threadRewardReason } from './knitting-reward-plan.mjs';

/** 씨앗은 보관함이 가득 차도 들어간다(조합 결과처럼 잃지 않는 보상, js/stump-box.js createItem force). */
export function threadRewardGrantSeeds(env, state, seeds) {
    for (const [color, n] of seeds) for (let i = 0; i < n; i++) env.deps.stumpBox.createItem(state, { family: 'seed', color, roll: env.deps.STUMP_BOX_HARVEST.giftRoll }, true);
}

/** Prepare the entire exchange on copies. No notification or acquisition callback can run between spending and granting. */
export function threadRewardCommit(env, state, row, made) {
    const next = { ...state, currencies: { ...state.currencies }, inventory: state.inventory.slice(),
        knitting: { ...state.knitting, counts: { ...state.knitting.counts }, knitted: { ...state.knitting.knitted }, seen: state.knitting.seen.slice() } };
    next.knitting.counts[row.id] -= row.set;
    next.knitting.knitted[row.id] = (next.knitting.knitted[row.id] || 0) + 1;
    if (made.item) next.inventory.push(made.item);
    let skyPower = 0;
    for (const [key, n] of made.currencies) {
        if (key === env.SKY_POWER) skyPower += n;
        else next.currencies[key] = (next.currencies[key] || 0) + n;
    }
    made.yarns.forEach(id => env.deps.knitting.receive(next, id));
    Object.assign(state, { currencies: next.currencies, inventory: next.inventory, knitting: next.knitting });
    if (skyPower) state.skyTower.condensedPower = threadRewardHeldCurrency(env, state, env.SKY_POWER) + skyPower;
    if (made.mapReward) state.atlas = made.mapReward.atlas;
    threadRewardGrantSeeds(env, state, made.seeds);
    state.currencyDropVersion = (Number(state.currencyDropVersion) || 0) + made.currencies.length;
    state.noti.items = true;
}

/** 세트 하나를 뜨개질한다: 모든 보상을 계획하고 자리를 확인한 뒤에만 수량을 쓴다. 실패하면 수량도 아이템 번호도 그대로다. */
export function threadRewardKnit(env, state, id, random = Math.random) {
    const blocked = env.deps.knitting.reason(state, id);
    if (blocked) return { ok: false, reason: blocked };
    const row = env.deps.knitting.row(id), counter = env.deps.itemAllocator.snapshot();
    try {
        const made = threadRewardPlan(env, state, row, random), failure = threadRewardReason(env, state, made);
        if (failure) { env.deps.itemAllocator.restore(counter); return { ok: false, reason: failure }; }
        threadRewardCommit(env, state, row, made);
        return { ok: true, row, made };
    } catch (error) { env.deps.itemAllocator.restore(counter); throw error; }
}
