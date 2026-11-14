// 그루터기 함 부적의 효과 합산(2026-09-30): 판에 놓여 깨어난 부적만 센다. 일반 줄은 능력치로, 조건부 줄은
// talisman-combat.js가 전투 중에 쓰는 목록으로 모은다. 이웃은 판의 상하좌우 칸이다(대각선 아님).
// 척력은 맞닿은 부적을 끄고 나머지 부적을 +25%, 중력은 맞닿은 부적 일반 줄의 25%, 단순한 부적은 표식 방향 부적의
// 일반 줄을 한 번 더, 오만은 맞닿은 조각(계열 무관) 수에 따라, 찰나는 보스 최종 피해, 주베누비아의 선택은 표식이
// 가로(오른쪽 · 왼쪽)면 룬 레벨 +2, 세로면 −2 · 보조스킬룬 한도 +2, 판결은 번개 피해 변동.
// 야생 고유(예전 생장판 고유)는 판의 거리 · 가장자리 · 맞닿은 조각 · 다 자란 씨앗 · 수액의 색 · 억제를 읽는다(data/talismans.js 설명).
// 접붙이기(7단계): 부적 자신의 줄(일반 · 조건부)은 놓인 칸의 단계만큼 커진다. 다른 부적의 줄을 빌리는 이웃 효과는 그대로다.
import { charmAshenSun, charmHiveCord, charmBlueprint, charmBoostAwake, charmDistance, charmTwoAway, charmSameLine, charmAddStat, charmNeighborPieces, charmAddStats, charmBoundaryBonus, charmGrownPieces, charmPieces, charmAddLines, charmItemAt, charmDeadStarBonus, charmAwakeNeighbors, charmStepCell, charmIsAwake, charmSummarize } from './talisman-effects-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
function createTalismanSpatialEffects(env) {
    return {
        farReach: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.25, other => charmDistance(env, cell, other) >= 3),
        voidRing: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.35, other => charmDistance(env, cell, other) === 1),
        twinSpore: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.2, other => charmTwoAway(env, cell, other)),
        stormConduit: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.18, other => charmSameLine(env, cell, other)),
        cradle: (result, box, cell) => charmAddStat(result, 'dr', charmNeighborPieces(env, box, cell).length),
        bloodTithe: (result, box, cell) => {
        const count = charmNeighborPieces(env, box, cell).length;
        if (count) charmAddStats(result, [['physPctDmg', 7 * count], ['pctHp', -2 * count]]);
    },
        boundary: (result, box, cell) => charmBoundaryBonus(env, result, cell)
    };
}

function createTalismanGrowthEffects(env) {
    return {
        ashenSun: (...args) => charmAshenSun(env, ...args),
        triElement: (result, box, cell, off, state) => {
        const colors = new Set(charmGrownPieces(env, state).map(({ item }) => item.color));
        if (['fire', 'cold', 'lightning'].every(color => colors.has(color))) charmAddStats(result, [['elementalPctDmg', 30], ['resPen', 6]]);
    },
        firstHarvest: (result, box, cell) => {
        const seeds = Math.min(3, charmPieces(box).filter(({ item }) => item.family === 'seed' && item.ripe === true).length);
        if (seeds) charmAddLines(env, result, charmItemAt(box, cell), 0.1 * seeds, true);
    },
        invertedRoot: (result, box, cell, off, state) => {
        const count = Math.min(4, env.deps.stumpBox.evaluate(state).suppressed.size);
        if (count) charmAddStats(result, [['pctHp', 5 * count], ['armor', 25 * count]]);
    },
        hiveCord: charmHiveCord,
        blueprint: (...args) => charmBlueprint(env, ...args),
        deadStar: (result, box, cell, off, state) => charmDeadStarBonus(env, result, state)
    };
}

function createTalismanSpecialEffects(env) {
    return Object.freeze({
    gravity: (result, box, cell, off) => charmAwakeNeighbors(env, box, cell, off).forEach(item => charmAddLines(env, result, item, 0.25, true)),
    simpleCopy: (result, box, cell, off) => {
        const target = charmItemAt(box, charmStepCell(env, cell, charmItemAt(box, cell).dir));
        if (charmIsAwake(target) && !off.has(target.id)) charmAddLines(env, result, target, 1, true);
    },
    pride: (result, box, cell) => {
        const count = env.deps.stumpBox.neighbors(cell).filter(next => charmItemAt(box, next)).length;
        charmAddStats(result, env.PRIDE_BY_NEIGHBORS[Math.min(2, count)]);
    },
    moment: (result, box, cell) => { result.bossFinalDmgBonusPct = Math.max(result.bossFinalDmgBonusPct, charmItemAt(box, cell).moment || 5); },
    cosmosChoice: (result, box, cell) => charmAddStats(result, env.CHOICE_BY_AXIS[(charmItemAt(box, cell).dir ?? 1) % 2]),
    cosmosLightningVariance: result => charmAddStat(result, 'cosmosLightningVariance', 1),
    ...env.WILD_EFFECTS
});
}

export function createTalismanEffects(deps) {
    const env = { deps };
    env.PRIDE_BY_NEIGHBORS = [[['gemLevel', 1], ['suppCap', 1]], [['suppCap', 1]], [['pctDmg', 15], ['aspd', 10]]];
    env.CHOICE_BY_AXIS = [[['gemLevel', -2], ['suppCap', 2]], [['gemLevel', 2]]];
    env.STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    env.EMPTY = Object.freeze({ stats: Object.freeze({}), conditions: Object.freeze([]), bossFinalDmgBonusPct: 0,
    suppressed: new Set(), amplified: new Set() });
    env.memo = { key: null, box: null, value: null };
    env.WILD_EFFECTS = Object.freeze({ ...createTalismanSpatialEffects(env), ...createTalismanGrowthEffects(env) });
    env.SPECIAL_EFFECTS = createTalismanSpecialEffects(env);
    return Object.freeze({ summarize: (...args) => charmSummarize(env, ...args) });
}
