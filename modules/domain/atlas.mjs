/** 세계수 아틀라스 (docs/atlas-endgame-20260930.md 3절): 저장 상태 · 노드 그래프 · 지도 장치 런 · 지도석 · 각인 드롭 · 자동 지도.
 * 전투 함수는 부르지 않는다 — 이동 · 보스 처치 정산 · 쓰러짐은 js/atlas-run.js가 이 모듈의 상태 전이를 부른다.
 * 루프를 넘어 남는 것: 해금 · 완료 · 보너스 · 패시브 · 자동 지도 · 각인 홈 설정. 루프마다 비우는 것: 지도석 · 각인 · 열린 지도.
 * 지도를 열 때 패시브와 각인의 효과를 런에 고정한다(run.bonus): 열린 지도 도중에 패시브를 바꿔도 그 지도는 그대로다.
 */
import { atlasCoreLateNode, atlasCorePosition, atlasCoreStatus, atlasCoreReachable, atlasCorePoints, atlasCoreBestTier, atlasCoreBestGameTier, atlasCoreEffectiveTier, atlasCoreGameTier, atlasCoreMapGameTier, atlasCoreHasTickets, atlasCoreIsMapStone } from './atlas-graph.mjs';
import { atlasCoreRenameSavedIds } from './atlas-restore-values.mjs';
import { atlasCoreDefaults } from './atlas-state.mjs';
import { atlasCoreLockReason, atlasCoreRunOpenReason, atlasCorePinnacleReason, atlasCoreBeginReason, atlasCoreMatchesNode, atlasCoreMapDestination } from './atlas-access.mjs';
import { atlasCoreSync, atlasCoreSextantReason, atlasCoreActivateSextant } from './atlas-unlock.mjs';
import { atlasCoreBeginPinnacle, atlasCoreBeginSpecial, atlasCoreBeginMemory, atlasCoreBeginBoard, atlasCoreBegin } from './atlas-entry.mjs';
import { atlasCoreSlots } from './atlas-bonuses.mjs';
import { atlasCoreSetLoadout } from './atlas-loadout.mjs';
import { atlasCoreDiscard, atlasCoreDiscardCandidates, atlasCoreDiscardBatch, atlasCorePlainMap } from './atlas-inventory.mjs';
import { atlasCoreTierBand, atlasCoreCombineSet, atlasCoreCombineReason, atlasCoreCombine, atlasCoreCombineAllPlan, atlasCoreCombineAll, atlasCoreOmenChangeReason, atlasCoreChangeOmen } from './atlas-combining.mjs';
import { atlasCoreCancel, atlasCoreComplete, atlasCoreMarkCleared, atlasCoreKeepLoot, atlasCoreUsePortal, atlasCoreClose } from './atlas-completion.mjs';
import { atlasCoreNextAuto, atlasAutoUnlocked } from './atlas-auto.mjs';
import { atlasCoreDropFromKill, atlasCoreExtraMap, atlasCoreFragmentFromKill, atlasCoreFragmentOpen, atlasCoreRewardMaps } from './atlas-kill-drops.mjs';
import { atlasCoreZone, atlasCorePreview, atlasCoreLootTier, atlasCoreEquivalentDepth } from './atlas-zone.mjs';
import { atlasCoreNormalize } from './atlas-restore.mjs';
import { atlasCoreOnLoopReset, atlasCoreTravelReason } from './atlas-reset.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
/** 천문도의 지도 50곳: 자리, 부모, 천문도 등급은 천문도 표에서, 지형과 보스는 제 권역의 빌린 칸(ATLAS.maps, ATLAS.rows)에서.
 * region은 게임의 권역 id(내용과 저장의 열쇠), chartRegion과 side는 천문도의 것이다. parent 'entry'는 시작 육분의. */
function createAtlasMapNodes(deps) {
    const lent = new Map(deps.ATLAS.maps.map(row => [row.id, row]));
    return deps.ATLAS.starChart.maps.map(map => {
        const { region, slot } = lent.get(map.id), regionIndex = deps.ATLAS.regions.findIndex(row => row.id === region), body = `atlas-${region}-${slot}`;
        const [boss, act, bossAct] = deps.ATLAS.rows[region][slot];
        return Object.freeze({ id: map.id, kind: 'map', region, chartRegion: map.region, side: map.side, regionIndex, slot, name: map.name, tier: map.tier,
            boss, act, bossAct, bossVisualId: deps.ATLAS_BOSS_BODIES.includes(body) ? body : null, ele: deps.ATLAS.regions[regionIndex].ele,
            parent: map.parent, point: map.point, temple: map.temple, treeBoss: map.treeBoss });
    });
}

/** 천문도의 보스 10곳(중간 보스 넷, 권역 보스 둘, 세계수 보스 둘, 외부 피나클 둘). 지금은 자리만 있다: 언제나 잠겨 있고 싸움이 없다
 * (C 단계가 기존 싸움에 잇는다). gate는 천문도의 종류(guardian, region, tree, outer), keys는 권역 보스가 요구하는 중간 보스다. */
function createAtlasGates(deps) {
    return deps.ATLAS.starChart.bosses.map(boss => Object.freeze({ id: boss.id, kind: 'gate', gate: boss.kind, region: deps.ATLAS.chartRegions[boss.region] || null,
        chartRegion: boss.region, side: boss.side, regionIndex: -1, slot: -1, name: boss.name, tier: 0, boss: boss.name, parents: boss.parents, keys: boss.keys,
        point: boss.point, temple: boss.temple, treeBoss: boss.treeBoss }));
}

function createAtlasGuardians(deps) {
    return deps.ATLAS.regions.map((region, regionIndex) => {
    const [name, ticket, bossAct, bossVisualId] = deps.ATLAS.guardians[region.id];
    return Object.freeze({ id: `${region.id}_g`, kind: 'guardian', region: region.id, regionIndex, slot: 9, name, tier: deps.ATLAS.guardianRules.tier,
        boss: name, arena: true, act: region.act, bossAct, bossVisualId, ele: region.ele, ticket });
});
}

function createAtlasPinnacle(deps) {
    return Object.freeze({ id: 'pinnacle', kind: 'pinnacle', region: null, regionIndex: -1, slot: -1, name: deps.ATLAS.pinnacle.name,
    tier: deps.ATLAS.guardianRules.tier, boss: deps.ATLAS.pinnacle.boss, arena: true, act: deps.ATLAS.pinnacle.act, bossAct: deps.ATLAS.pinnacle.bossAct, bossVisualId: deps.ATLAS.pinnacle.bossVisualId, ele: 'chaos' });
}

function createAtlasEnvironment(deps) {
    const env = { deps };
    env.MAP_NODES = createAtlasMapNodes(deps);
    env.GUARDIANS = createAtlasGuardians(deps);
    env.PINNACLE = createAtlasPinnacle(deps);
    env.GATES = createAtlasGates(deps);
    // 천문도에 선 노드. 예전 지역 수호자 다섯과 정점(세계수의 그림자)은 천문도 밖의 싸움으로 남는다(LEGACY): 저장된 수호자 지도석, 기억,
    // 원정 판, 후반 싸움의 조건이 그 id를 쓴다. C 단계가 천문도의 보스에 잇기 전까지 들어갈 수 없다(atlas-graph atlasCoreStatus).
    env.NODES = Object.freeze([...env.MAP_NODES, ...env.GATES]);
    env.LEGACY = Object.freeze([...env.GUARDIANS, env.PINNACLE]);
    env.LATE_NODES = Object.freeze([...env.deps.ATLAS_ENDGAME.apexes.map(row => atlasCoreLateNode(row, 'apex', row.domain)),
    ...env.deps.ATLAS_ENDGAME.leagues.map(row => atlasCoreLateNode(row, 'league', `${row.name}: ${row.boss}`))]);
    env.BY_ID = new Map([...env.NODES, ...env.LEGACY, ...env.LATE_NODES].map(node => [node.id, node]));
    // 길 [부모, 자식]: 시작 육분의에서 나가는 넷은 노드가 아니라 뺀다(1등급 지도의 parent가 'entry'다).
    env.LINKS = Object.freeze(env.deps.ATLAS.starChart.routes.filter(route => env.BY_ID.has(route.from)).map(route => Object.freeze([route.from, route.to])));
    env.NEIGHBOURS = new Map(env.NODES.map(node => [node.id, env.LINKS.filter(([, to]) => to === node.id).map(([from]) => from)]));
    env.CHART_TIERS = env.deps.ATLAS.starChart.tiers;
    env.FRAGMENTS = new Map(env.deps.ATLAS.fragments.map(fragment => [fragment.id, fragment]));
    env.RARITY_RANK = { normal: 0, magic: 1, rare: 2 };
    env.zones = new WeakMap();
    env.BOSS_RULES = { map: { hpMul: 1, damageMul: 1, stages: 1 }, guardian: { ...env.deps.ATLAS.guardianRules, stages: 1 }, pinnacle: env.deps.ATLAS.pinnacle };
    return env;
}

function createAtlasGraphApi(env) {
    return {
        nodes: env.NODES,
        links: env.LINKS,
        renameSavedIds: (...args) => atlasCoreRenameSavedIds(env, ...args),
        node: id => env.BY_ID.get(id) || null,
        neighbours: id => env.NEIGHBOURS.get(id) || [],
        fragment: id => env.FRAGMENTS.get(id) || null,
        pinnacle: env.PINNACLE,
        hosts: id => env.deps.ATLAS.hosts[id] || [],
        position: (...args) => atlasCorePosition(env, ...args),
        defaults: (...args) => atlasCoreDefaults(env, ...args),
        lockReason: (...args) => atlasCoreLockReason(env, ...args),
        runOpenReason: atlasCoreRunOpenReason,
        status: (...args) => atlasCoreStatus(env, ...args),
        reachable: (...args) => atlasCoreReachable(env, ...args),
        points: () => atlasCorePoints(),
        bestTier: (...args) => atlasCoreBestTier(env, ...args),
        bestGameTier: (...args) => atlasCoreBestGameTier(env, ...args),
        sync: (...args) => atlasCoreSync(env, ...args),
        sextantReason: (...args) => atlasCoreSextantReason(env, ...args),
        activateSextant: (...args) => atlasCoreActivateSextant(env, ...args)
    };
}

function createAtlasEntryApi(env) {
    return {
        effectiveTier: (...args) => atlasCoreEffectiveTier(env, ...args),
        gameTier: (...args) => atlasCoreGameTier(env, ...args),
        mapGameTier: (...args) => atlasCoreMapGameTier(env, ...args),
        hasTickets: (...args) => atlasCoreHasTickets(env, ...args),
        pinnacleReason: (...args) => atlasCorePinnacleReason(env, ...args),
        beginPinnacle: (...args) => atlasCoreBeginPinnacle(env, ...args),
        beginSpecial: (...args) => atlasCoreBeginSpecial(env, ...args),
        beginMemory: (...args) => atlasCoreBeginMemory(env, ...args),
        beginBoard: (...args) => atlasCoreBeginBoard(env, ...args),
        lateNodes: env.LATE_NODES,
        slots: (...args) => atlasCoreSlots(env, ...args),
        setLoadout: (...args) => atlasCoreSetLoadout(env, ...args),
        beginReason: (...args) => atlasCoreBeginReason(env, ...args),
        begin: (...args) => atlasCoreBegin(env, ...args),
        matchesNode: (...args) => atlasCoreMatchesNode(env, ...args),
        mapDestination: (...args) => atlasCoreMapDestination(env, ...args)
    };
}

function createAtlasInventoryApi(env) {
    return {
        discard: atlasCoreDiscard,
        isMapStone: (...args) => atlasCoreIsMapStone(env, ...args),
        discardCandidates: (...args) => atlasCoreDiscardCandidates(env, ...args),
        discardBatch: (...args) => atlasCoreDiscardBatch(env, ...args),
        plainMap: (...args) => atlasCorePlainMap(env, ...args),
        tierBand: (...args) => atlasCoreTierBand(env, ...args),
        combineSet: (...args) => atlasCoreCombineSet(env, ...args),
        combineReason: (...args) => atlasCoreCombineReason(env, ...args),
        combine: (...args) => atlasCoreCombine(env, ...args),
        combineAllPlan: (...args) => atlasCoreCombineAllPlan(env, ...args),
        combineAll: (...args) => atlasCoreCombineAll(env, ...args),
        omenChangeReason: (...args) => atlasCoreOmenChangeReason(env, ...args),
        changeOmen: (...args) => atlasCoreChangeOmen(env, ...args)
    };
}

function createAtlasRunApi(env) {
    return {
        cancel: (...args) => atlasCoreCancel(env, ...args),
        complete: (...args) => atlasCoreComplete(env, ...args),
        markCleared: atlasCoreMarkCleared,
        keepLoot: (...args) => atlasCoreKeepLoot(env, ...args),
        usePortal: (...args) => atlasCoreUsePortal(env, ...args),
        close: (...args) => atlasCoreClose(env, ...args),
        nextAuto: (...args) => atlasCoreNextAuto(env, ...args),
        autoUnlocked: atlasAutoUnlocked,
        dropFromKill: (...args) => atlasCoreDropFromKill(env, ...args),
        extraMap: (...args) => atlasCoreExtraMap(env, ...args),
        fragmentFromKill: (...args) => atlasCoreFragmentFromKill(env, ...args),
        fragmentOpen: (...args) => atlasCoreFragmentOpen(env, ...args),
        zone: (...args) => atlasCoreZone(env, ...args),
        preview: (...args) => atlasCorePreview(env, ...args),
        lootTier: atlasCoreLootTier,
        equivalentDepth: (...args) => atlasCoreEquivalentDepth(env, ...args),
        normalize: (...args) => atlasCoreNormalize(env, ...args),
        onLoopReset: (...args) => atlasCoreOnLoopReset(env, ...args),
        travelReason: (...args) => atlasCoreTravelReason(env, ...args),
        rewardMaps: (...args) => atlasCoreRewardMaps(env, ...args),
        inMap: state => state.currentZoneId === env.deps.ATLAS.zoneId
    };
}

export function createAtlas(deps) {
    const env = createAtlasEnvironment(deps);
    return Object.freeze({
        ...createAtlasGraphApi(env),
        ...createAtlasEntryApi(env),
        ...createAtlasInventoryApi(env),
        ...createAtlasRunApi(env)
    });
}
