import { atlasCoreBeginReason, atlasCoreLockReason, atlasCoreRunOpenReason, atlasCoreMapDestination } from './atlas-access.mjs';
import { atlasCoreEncounterRooms } from './atlas-zone.mjs';
import { atlasCoreUseFragments } from './atlas-loadout.mjs';
import { atlasCoreBonusOf, atlasCoreZERO, atlasCorePortalCap, atlasCoreStarTerms } from './atlas-bonuses.mjs';
import { atlasCoreEffectiveTier, atlasCoreChartRun } from './atlas-graph.mjs';
import { createSeededRng } from '../common/numbers.mjs';

/** Consumes the map (and its fragments): from here the run owns it — portals, content rooms, drops held until the boss falls.
 * entry: [random, nodeId, dew]. The run takes the chosen node (or, without one, where the stone goes: atlasCoreMapDestination) for its
 * terrain, boss and completion, and the stone's rarity, mods, quality and omen. dew: a 형체 없는 이슬 entry (one more dew, 1 portal,
 * 2 장비 상자; atlasCoreDewReason). */
export function atlasCoreBegin(env, state, uid, returnZoneId, ...entry) {
    const [random = Math.random, nodeId, dew = false] = entry;
    const reason = atlasCoreBeginReason(env, state, uid, nodeId, dew);
    if (reason) return reason;
    const [map] = state.atlas.stash.splice(state.atlas.stash.findIndex(stone => stone.uid === uid), 1);
    // 천문도의 중간 보스 자리를 골랐으면 그 자리가 치르는 수호자의 싸움으로 연다(지도석은 그 수호자의 것이다).
    const destination = nodeId === undefined ? atlasCoreMapDestination(env, state, map).id : nodeId;
    atlasCoreStartRun(env, state, { ...map, node: env.BY_ID.get(destination).fight ?? destination }, returnZoneId, random);
    if (dew) atlasCoreUseDew(env, state);
    return '';
}

/** 이슬 입장: 런은 이슬 포털 수로 시작하고 지갑에서 이슬을 낸다(취소하면 atlasCoreCancel이 돌려준다). 달의 별 dewKeep %로 이슬을 내지
 * 않는다(dewKept, 이슬 입장의 효과는 그대로). 그 굴림은 지도석 uid로 정해 다시 불러와도 같다. */
export function atlasCoreUseDew(env, state) {
    const run = state.atlas.run;
    run.dew = true;
    run.portals = atlasCorePortalCap(env, true, run.stars);
    run.dewKept = createSeededRng(`atlas-star:${run.map.uid}:dewKeep`)() * 100 < run.stars.dewKeep;
    if (!run.dewKept) state.currencies.formlessDew -= env.deps.ATLAS.dewEntry.cost;
}

/** The last result stays on screen while the next map runs (자동 지도 chains maps). */
export function atlasCoreStartRun(env, state, map, returnZoneId, random) {
    const rooms = atlasCoreEncounterRooms(env, map), { used, spent } = atlasCoreUseFragments(env, state, rooms), bonus = env.deps.lootOmens.runBonus(atlasCoreBonusOf(env, state, used), map);
    const stars = atlasCoreStarTerms(env, state, map, atlasCoreChartRun(env, { map }));
    const forced = used.map(id => env.FRAGMENTS.get(id).encounter).filter(Boolean);
    const fieldDiscoveries = rooms > 0 && env.deps.actExplorationDoors.session();
    const encounters = env.deps.atlasEncounters.roll(bonus, forced, random, rooms, { awake: env.deps.atlasEndgame.awakened(state), loop: state.season,
        fieldDiscoveries, region: (env.BY_ID.get(map.node) || {}).region }, state);
    state.atlas.run = { map, portals: atlasCorePortalCap(env, false, stars), dew: false, dewKept: false, free: false, drops: [], found: [], fragments: used, spent, cleared: [], bonus, stars,
        encounters, ...(fieldDiscoveries ? { passages: { tried: [], sites: [] } } : {}), golden: env.deps.atlasEncounters.golden(encounters, bonus, map.uid),
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
    state.atlas.run = { map, portals: 1, dew: false, dewKept: false, free: false, drops: [], found: [], fragments: [], spent: [], cleared: [], bonus: atlasCoreZERO(env), stars: atlasCoreStarTerms(env, state, map, false),
        encounters: [], golden: [], returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null,
        endgame: env.deps.atlasEndgame.normalizeRun(null), board };
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
