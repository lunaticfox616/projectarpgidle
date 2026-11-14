import { atlasCoreBeginReason, atlasCoreLockReason, atlasCoreRunOpenReason, atlasCorePinnacleReason } from './atlas-access.mjs';
import { atlasCoreEncounterRooms } from './atlas-zone.mjs';
import { atlasCoreUseFragments } from './atlas-loadout.mjs';
import { atlasCoreBonusOf, atlasCoreZERO } from './atlas-bonuses.mjs';
import { atlasCoreEffectiveTier } from './atlas-graph.mjs';

/** Consumes the map (and its fragments): from here the run owns it — portals, content rooms, drops held until the boss falls. */
export function atlasCoreBegin(env, state, uid, returnZoneId, random = Math.random) {
    const reason = atlasCoreBeginReason(env, state, uid);
    if (reason) return reason;
    const [map] = state.atlas.stash.splice(state.atlas.stash.findIndex(entry => entry.uid === uid), 1);
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    return '';
}

/** The last result stays on screen while the next map runs (자동 지도 chains maps). */
export function atlasCoreStartRun(env, state, map, returnZoneId, random) {
    const rooms = atlasCoreEncounterRooms(env, map), { used, spent } = atlasCoreUseFragments(env, state, rooms, random), bonus = env.deps.lootOmens.runBonus(atlasCoreBonusOf(env, state, used), map);
    const forced = used.map(id => env.FRAGMENTS.get(id).encounter).filter(Boolean);
    const encounters = env.deps.atlasEncounters.roll(bonus, forced, random, rooms, { awake: env.deps.atlasEndgame.awakened(state), loop: state.season,
        region: (env.BY_ID.get(map.node) || {}).region });
    state.atlas.run = { map, portals: env.deps.ATLAS.portals + bonus.portals, drops: [], found: [], fragments: used, spent, cleared: [], bonus,
        encounters, golden: env.deps.atlasEncounters.golden(encounters, bonus, map.uid),
        returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null, endgame: env.deps.atlasEndgame.runExtra(state, env.BY_ID.get(map.node), random) };
}

/** 후반부 싸움(최종 보스 · 리그 우두머리): 재료는 js/atlas-endgame.js가 이미 받았다. 지도석 대신 그 노드의 투기장 지도를 연다. */
export function atlasCoreBeginSpecial(env, state, nodeId, returnZoneId, random = Math.random) {
    const node = env.BY_ID.get(nodeId);
    if (!node || !node.rules) return '없는 싸움입니다.';
    const map = env.deps.atlasMaps.create(node.id, atlasCoreEffectiveTier(env, state, node), 'normal', random);
    map.uid = state.atlas.nextUid++;
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    return '';
}

/** 보드 지도는 지도석·각인·입장권을 쓰지 않는다. 보드 토큰 하나가 한 번의 적립을 소유한다. */
export function atlasCoreBeginBoard(env, state, returnZoneId) {
    const board = env.deps.atlasBoard.plan(state), reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    if (!board) return '주사위를 굴려 지도 칸에 도착하세요.';
    const map = env.deps.atlasMaps.create(board.node, board.tier);
    map.uid = state.atlas.nextUid++;
    state.atlas.run = { map, portals: 1, drops: [], found: [], fragments: [], spent: [], cleared: [], bonus: atlasCoreZERO(env),
        encounters: [], golden: [], returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null,
        endgame: env.deps.atlasEndgame.normalizeRun(null), board };
    return '';
}

/** 정점: 뿌리 입장권 4종을 하나씩 바치고 세계수의 그림자에 들어간다(씨앗마다 2등급 높다). */
export function atlasCoreBeginPinnacle(env, state, returnZoneId, random = Math.random) {
    const reason = atlasCorePinnacleReason(env, state);
    if (reason) return reason;
    for (const key of env.deps.ATLAS.pinnacle.tickets) state.currencies[key] -= 1;
    const map = env.deps.atlasMaps.create(env.PINNACLE.id, atlasCoreEffectiveTier(env, state, env.PINNACLE), 'normal', random);
    map.uid = state.atlas.nextUid++;
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    return '';
}

/** 기억 던전(js/memory-dungeon.js): 그 보스의 기억 하나로 그 노드의 투기장을 연다(지도석에 memory 단계, 등급은 단계만큼 높다).
 * 마름의 사도는 기억 싸움의 보스를 대신하지 않는다. */
export function atlasCoreBeginMemory(env, state, nodeId, tier, ...selection) {
const [returnZoneId, random = Math.random] = selection;
    const reason = env.deps.memoryDungeon.entryReason(state, nodeId, tier);
    if (reason) return reason;
    env.deps.memoryDungeon.spend(state, nodeId, tier);
    const node = env.BY_ID.get(nodeId), map = env.deps.atlasMaps.create(node.id, env.deps.memoryDungeon.mapTier(state, node, tier), 'normal', random);
    Object.assign(map, { uid: state.atlas.nextUid++, memory: tier });
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    state.atlas.run.endgame.apostle = null;
    return '';
}
