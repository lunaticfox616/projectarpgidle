import { createSeededRng } from '../common/numbers.mjs';
import { atlasCoreChartRun, atlasCoreReachable } from './atlas-graph.mjs';
import { atlasCoreGrantStone } from './atlas-map-drops.mjs';
import { atlasCoreDeliver } from './atlas-inventory.mjs';

// 천문도 일반 지도의 완료 보상 중 장비 상자와 패시브 별의 몫(개편 2026-11-24 B, 패키지 시뮬레이터의 finishRun 차례).
// 별의 확률 굴림은 지도석 uid로 정한 굴림(atlas-star:<uid>:<이름>)이라 다시 불러와도 같다.

/** One roll under chance %, from the run's own seed family. */
export function atlasStarRoll(run, name, chance) { return chance > 0 && createSeededRng(`atlas-star:${run.map.uid}:${name}`)() * 100 < chance; }

/** 장비 상자의 추가 확률(%): 별의 chestChance, T8 이상이면 highTierChestChance, 이슬 입장이면 dewChestChance. */
export function atlasStarBoxChance(env, run) {
    const stars = run.stars;
    return stars.chestChance + (run.map.tier >= env.deps.ATLAS.highTier ? stars.highTierChestChance : 0) + (run.dew ? stars.dewChestChance : 0);
}

/** 장비 상자: 지도석으로 연 천문도 일반 지도만. 첫 상자가 지도 보스의 보상이고(보통 입장은 그것 하나), 이슬 입장은 하나 더, 별의
 * firstChest는 첫 완료에 하나 더, 추가 확률이 맞으면 하나 더. 상급(fine)은 상자 하나가 희귀도 바닥 한 단계 위로 굴린다(gradeChance). */
export function atlasStarBoxes(env, run, first) {
    if (!atlasCoreChartRun(env, run)) return { count: 0, fine: 0 };
    const rules = env.deps.ATLAS, base = run.dew ? rules.dewEntry.gearBoxes : rules.gearBoxes;
    const count = base + Number(first && run.stars.firstChest > 0) + Number(atlasStarRoll(run, 'chest', atlasStarBoxChance(env, run)));
    return { count, fine: Number(atlasStarRoll(run, 'grade', run.stars.gradeChance)) };
}

/** tierChance가 주는 지침의 지도: 방금 깬 지도의 자식 중 런보다 높은 등급의 열린 일반 지도 하나(굴림으로 고른다). T10에는 없다. */
export function atlasStarHigherChild(env, state, run) {
    const children = env.MAP_NODES.filter(node => node.parent === run.map.node && node.tier > run.map.tier && atlasCoreReachable(env, state, node.id));
    if (!children.length) return null;
    return children[Math.floor(createSeededRng(`atlas-star:${run.map.uid}:tierPick`)() * children.length)];
}

/** 별이 완료에 더하는 것: 형체 없는 이슬(dewChance, 지갑에는 런의 보상 단계가 넣는다), 깬 지도의 지침(alidadeChance), 이어진 높은
 * 등급 지도의 지침(tierChance). 지침은 바로 보관함으로(한도를 넘어도). 천문도 일반 지도가 아니면 null. */
export function atlasStarClearGains(env, state, run) {
    if (!atlasCoreChartRun(env, run)) return null;
    const stars = run.stars, node = env.BY_ID.get(run.map.node), higher = atlasStarRoll(run, 'tier', stars.tierChance) && atlasStarHigherChild(env, state, run);
    const targets = [atlasStarRoll(run, 'alidade', stars.alidadeChance) && node, higher].filter(Boolean);
    const stones = targets.map(target => atlasCoreGrantStone(env, state, target.id, target.tier, Math.random));
    atlasCoreDeliver(state, stones);
    return { dew: Number(atlasStarRoll(run, 'dew', stars.dewChance)), dewKept: run.dewKept === true, stones: stones.map(map => ({ node: map.node, tier: map.tier })) };
}
