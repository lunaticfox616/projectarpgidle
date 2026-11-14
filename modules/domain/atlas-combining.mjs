import { atlasCoreIsMapStone, atlasCorePlainMap } from './atlas-inventory.mjs';
import { atlasCoreRunOpenReason } from './atlas-access.mjs';
import { atlasCoreReachable, atlasCoreEffectiveTier } from './atlas-graph.mjs';
import { atlasCoreNodeForTier, atlasCoreStamp } from './atlas-map-drops.mjs';
import { atlasCoreBonusOf } from './atlas-bonuses.mjs';

/** 등급의 빛깔 줄(data/atlas.js tierBands): { id, max, tone }. */
export function atlasCoreTierBand(env, tier) { return env.deps.ATLAS.tierBands.find(band => tier <= band.max); }

/** 합칠 셋: 고른 지도석과 같은 등급의 다른 지도석 둘(손대지 않은 것, 오래된 것부터). 지도 노드의 지도석끼리만. 모자라면 null. */
export function atlasCoreCombineSet(env, state, uid) {
    const picked = state.atlas.stash.find(map => map.uid === uid);
    if (!picked || !atlasCoreIsMapStone(env, picked)) return null;
    const others = state.atlas.stash.filter(map => map !== picked && map.tier === picked.tier && atlasCoreIsMapStone(env, map))
        .sort((a, b) => Number(atlasCorePlainMap(env, b)) - Number(atlasCorePlainMap(env, a)) || a.uid - b.uid).slice(0, env.deps.ATLAS.combine.count - 1);
    return others.length === env.deps.ATLAS.combine.count - 1 ? [picked, ...others] : null;
}

/** '' when the picked stone can be combined, otherwise why not. */
export function atlasCoreCombineReason(env, state, uid) {
    const busy = atlasCoreRunOpenReason(state), set = atlasCoreCombineSet(env, state, uid), picked = state.atlas.stash.find(map => map.uid === uid);
    if (busy) return busy;
    if (!picked) return env.deps._t('보관함에 없는 지도석입니다.');
    if (!atlasCoreIsMapStone(env, picked)) return env.deps._t('수호자 지도석은 합칠 수 없습니다.');
    if (picked.tier >= env.deps.ATLAS.tierCap) return env.deps._t('가장 높은 등급이라 합칠 수 없습니다.');
    if (!set) return env.deps._t('{tier}등급 지도석이 {count}개 있어야 합칩니다.', { tier: picked.tier, count: env.deps.ATLAS.combine.count });
    return atlasCoreTierOpen(env, state, picked.tier + 1) ? '' : env.deps._t('{tier}등급 노드가 아직 열리지 않았습니다.', { tier: picked.tier + 1 });
}

/** 그 등급까지 올라왔는지: 그 등급 이상의 지도 노드가 하나라도 열렸으면 된다. 지역마다 등급이 건너뛰어(뿌리 1, 2, 4, 5, 7, 9, 11...)
 * 정확히 그 등급의 노드만 찾으면 11, 13등급이 열려 있어도 9등급 합치기가 막혔다(2026-11-11 사용자). */
export function atlasCoreTierOpen(env, state, tier) { return tier <= env.deps.ATLAS.tierCap && env.MAP_NODES.some(node => atlasCoreReachable(env, state, node.id) && atlasCoreEffectiveTier(env, state, node) >= tier); }

/** 셋을 한 등급 위 지도석 하나로. 노드는 떨어진 지도석처럼 그 등급 이하에서 가장 높은 열린 등급의 노드(그 등급 노드가 열렸으면 그 노드),
 * 지도석의 등급은 언제나 한 등급 위(싸움의 세기는 지도석 등급을 따른다). 확인은 부르는 쪽이 한다. */
export function atlasCoreForgeUp(env, state, used, random) {
    const tier = used[0].tier + 1, node = atlasCoreNodeForTier(env, state, tier, random);
    const map = atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, tier, 'normal', random), random, atlasCoreBonusOf(env, state));
    state.atlas.stash = state.atlas.stash.filter(entry => !used.includes(entry));
    state.atlas.stash.push(map);
    return map;
}

/** 같은 등급 셋을 한 등급 위 지도석 하나로. @returns {{reason?:string, used?:object[], map?:object}} */
export function atlasCoreCombine(env, state, uid, random = Math.random) {
    const reason = atlasCoreCombineReason(env, state, uid);
    if (reason) return { reason };
    const used = atlasCoreCombineSet(env, state, uid);
    return { used, map: atlasCoreForgeUp(env, state, used, random) };
}

/** 일괄 합치기의 재료: 지도 노드의 지도석 가운데 타락하지 않은 것(마법, 희귀, 품질도 든다. 2026-11-11 사용자: 타락, 수호자는 X). */
export function atlasCoreBatchable(env, map) { return atlasCoreIsMapStone(env, map) && !map.corrupted; }

/** 한 등급 안에서 먼저 쓰는 순서: 손대지 않은 것 0, 품질만 1, 마법 2, 희귀 3. 남는 한두 개가 값진 쪽이 되게. */
export function atlasCoreBatchRank(map) { return map.rarity === 'rare' ? 3 : map.rarity === 'magic' ? 2 : map.quality ? 1 : 0; }

export function atlasCoreTally(counts, tier) { counts[tier] = (counts[tier] || 0) + 1; }

/** 일괄 합치기의 차례(2026-11-11 사용자: 지도석 일괄합성): 낮은 등급부터 재료를 셋씩 합치고, 그렇게 만든 지도석이 다시 셋이
 * 되면 이어서 합친다(만든 지도석은 보관함에 보이기 전이라 품질이 붙어도 손대지 않은 것으로 친다). 위 등급 노드가 닫혔거나
 * 가장 높은 등급이면 그 등급에서 멈춘다.
 * @returns {{steps:{tier:number, sets:number}[], used:number, made:Object<number, number>}} 등급마다 합칠 셋, 쓰는 보관함 지도석 수, 남을 새 지도석(등급: 수) */
export function atlasCoreCombineAllPlan(env, state) {
    const plan = { steps: [], used: 0, made: {} }, own = {}, plain = {};
    if (atlasCoreRunOpenReason(state)) return plan;
    for (const map of state.atlas.stash.filter((...args) => atlasCoreBatchable(env, ...args))) {
        atlasCoreTally(own, map.tier);
        if (!atlasCoreBatchRank(map)) atlasCoreTally(plain, map.tier);
    }
    for (let tier = Math.min(...Object.keys(own).map(Number)); tier < env.deps.ATLAS.tierCap; tier++) {
        const sets = Math.floor(((own[tier] || 0) + (plan.made[tier] || 0)) / env.deps.ATLAS.combine.count);
        if (sets && atlasCoreTierOpen(env, state, tier + 1)) atlasCorePlanStep(env, plan, tier, sets, plain);
    }
    plan.made = Object.fromEntries(Object.entries(plan.made).filter(([, count]) => count > 0));
    return plan;
}

/** 한 등급의 셋들: 보관함의 손대지 않은 지도석, 이번에 만든 지도석, 품질, 마법, 희귀 순서로 쓴다(combineAll의 정렬과 같다). */
export function atlasCorePlanStep(env, plan, tier, sets, plain) {
    const take = sets * env.deps.ATLAS.combine.count, fresh = plan.made[tier] || 0, fromFresh = Math.min(fresh, Math.max(0, take - (plain[tier] || 0)));
    plan.used += take - fromFresh;
    plan.made[tier] = fresh - fromFresh;
    plan.made[tier + 1] = (plan.made[tier + 1] || 0) + sets;
    plan.steps.push({ tier, sets });
}

/** combineAllPlan대로 합친다. @returns {{used:number, made:object[]}} 쓴 보관함 지도석 수와 남은 새 지도석 */
export function atlasCoreCombineAll(env, state, random = Math.random) {
    const count = env.deps.ATLAS.combine.count, fresh = new Set(), order = map => (fresh.has(map) ? 0.5 : atlasCoreBatchRank(map));
    let used = 0;
    for (const { tier, sets } of atlasCoreCombineAllPlan(env, state).steps) {
        const pool = state.atlas.stash.filter(map => map.tier === tier && atlasCoreBatchable(env, map))
            .sort((a, b) => order(a) - order(b) || (a.quality || 0) - (b.quality || 0) || a.uid - b.uid);
        for (let at = 0; at < sets; at++) {
            const set = pool.slice(at * count, (at + 1) * count);
            used += set.filter(map => !fresh.has(map)).length;
            set.forEach(map => fresh.delete(map));
            fresh.add(atlasCoreForgeUp(env, state, set, random));
        }
    }
    return { used, made: [...fresh] };
}

/** '' when a flower can change this stone's omen, otherwise why not: guardian stones carry none, and corruption closes a stone as it does for crafts. */
export function atlasCoreOmenChangeReason(env, map) {
    if (env.BY_ID.get(map.node)?.kind !== 'map') return '지도 노드의 지도석에만 기운이 붙습니다.';
    return map.corrupted ? '타락한 지도석은 더 바꿀 수 없습니다.' : '';
}

/** 꽃 하나로 지도석의 기운을 바꾼다(data/loot-omens.js flowers): omenId가 없으면 평범한 꽃으로 다시 굴리고, 있으면 황금 꽃으로 그 기운을 고른다.
 * 바꿀 수 없으면 꽃도 지도석도 그대로다. @returns {{reason?:string, omen?:string}} */
export function atlasCoreChangeOmen(env, state, uid, color, ...selection) {
const [omenId = null, random = Math.random] = selection;
    const map = state.atlas.stash.find(entry => entry.uid === uid);
    if (!map) return { reason: env.deps._t('보관함에 없는 지도석입니다.') };
    const reason = atlasCoreOmenChangeReason(env, map);
    if (reason) return { reason };
    const open = env.deps.lootOmens.flowerOmens(color, state, map.omen).some(omen => omen.id === omenId);
    const next = omenId ? (open ? omenId : null) : env.deps.lootOmens.rollFlowerOmen(color, state, map.omen, random);
    if (!next) return { reason: env.deps._t('이 꽃으로 바꿀 수 있는 기운이 없습니다.') };
    // 화폐화한 꽃도 평범한 꽃이라 '보관함에'는 황금 꽃에만 붙는다.
    if (!env.deps.stumpBox.payFlower(state, color, !!omenId)) return { reason: env.deps._t('{value}{label} 꽃이 없습니다.', { value: omenId ? env.deps._t('보관함에 황금 ') : '', label: env.deps.STUMP_BOX_COLORS[color].label }) };
    map.omen = next;
    return { omen: next };
}
