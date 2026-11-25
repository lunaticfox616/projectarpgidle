import { atlasCoreRenameSavedIds, atlasCoreNodeList, atlasCoreNormalizeRun, atlasCoreNormalizeFragments, atlasCoreNormalizeMemory } from './atlas-restore-values.mjs';
import { atlasCoreDefaults } from './atlas-state.mjs';
import { atlasAutoUnlocked } from './atlas-auto.mjs';
import { atlasCoreNormalizeResult, atlasCoreNormalizeTally } from './atlas-receipts.mjs';
import { atlasCoreSetLoadout } from './atlas-loadout.mjs';
import { atlasCoreCancel } from './atlas-completion.mjs';
import { atlasChartMove, atlasChartStaleRun } from './atlas-chart-migration.mjs';
import { atlasCoreStatus } from './atlas-graph.mjs';

/** 보관함에 둘 수 있는 것: 지도 노드의 지도석(천문도 등급을 넘는 손상된 등급은 가장 높은 등급으로)과 수호자의 지도석(그대로, 넷은 천문도의
 * 중간 보스 자리에서, 「나이테 왕」의 것은 그 수호자에게 쓴다). */
function stashStone(env, map) {
    const kind = map && env.BY_ID.get(map.node).kind;
    if (kind === 'map') return { ...map, tier: Math.min(env.CHART_TIERS, map.tier) };
    return kind === 'guardian' ? map : null;
}

/** 완료와 보너스: 아는 노드만. 천문도에 그리지 않는 수호자와 정점의 id는 버린다(천문도 이전의 첫 완료, 그 처치는 보스 자리와 처치 기록이
 * 센다). 예전 지도 id는 모르는 id라 함께 빠진다. */
function clearedNodes(env, raw) {
    const done = atlasCoreNodeList(env, raw.completed, id => !env.LEGACY.includes(env.BY_ID.get(id)));
    return { done, bonus: atlasCoreNodeList(env, raw.bonus, id => done.includes(id)) };
}

/** 한도(ATLAS.stashCap)로 자르지 않는다: 주는 지도석(첫 완료, 포털 환급, 시작 육분의)은 한도를 넘어 들어와 있을 수 있다. */
function restoreStash(env, raw, validMap) {
    return (Array.isArray(raw.stash) ? raw.stash : []).map(validMap).map(map => stashStone(env, map)).filter(Boolean);
}

/** 예전 저장을 천문도로 옮기고(제자리에서), 옮기기 전의 것 둘을 돌려준다: 이어질 수 없는 열린 지도가 있었는지, 예전 정점을 완료했는지
 * (후반 아틀라스의 깨어남을 예전 완료 기록에서 잇는 저장이 있다: atlasEndgame.normalize). */
function moveToChart(env, raw) {
    const before = { stale: atlasChartStaleRun(env, raw.run), pinnacleDone: Array.isArray(raw.completed) && raw.completed.includes(env.PINNACLE.id) };
    atlasChartMove(env, raw);
    return before;
}

/** Defaults, the one-time move from the world-tree journey (its unlock carries over), the move to the star chart (atlas-chart-migration),
 * corrupt entries dropped, unique uids. */
export function atlasCoreNormalize(env, state) {
    atlasCoreRenameSavedIds(env, [state.atlas, state.actExploration, state.enemies]);
    const raw = state.atlas && typeof state.atlas === 'object' ? state.atlas : {};
    env.deps.atlasEndgame.moveAltarMaterials(state, raw.endgame);
    const journeyUnlocked = !!(state.worldTreeJourney && state.worldTreeJourney.unlocked === true);
    delete state.worldTreeJourney;
    const { stale, pinnacleDone } = moveToChart(env, raw);
    const uids = new Set(), validMap = entry => {
        const map = env.deps.atlasMaps.normalize(entry, id => env.BY_ID.has(id));
        if (!map || uids.has(map.uid)) return null;
        uids.add(map.uid);
        return map;
    };
    // The open map claims its uid first: a stash entry sharing it is the duplicate.
    const { done, bonus } = clearedNodes(env, raw), run = atlasCoreNormalizeRun(env, raw.run, validMap);
    const epoch = env.deps.atlasEpoch.normalize(raw.epoch);
    const next = { ...atlasCoreDefaults(env), unlocked: raw.unlocked === true || journeyUnlocked, sextant: raw.sextant === true, completed: done, bonus,
        passives: [], epoch,
        stash: restoreStash(env, raw, validMap),
        fragments: atlasCoreNormalizeFragments(env, raw.fragments), run, lastResult: atlasCoreNormalizeResult(env, raw.lastResult), endgame: env.deps.atlasEndgame.normalize(raw.endgame, pinnacleDone),
        memory: atlasCoreNormalizeMemory(env, raw.memory), leaves: env.deps.memoryLeaves.normalize(raw.leaves), board: env.deps.atlasBoard.normalize(raw.board), tally: atlasCoreNormalizeTally(raw.tally),
        seeds: Math.max(0, Math.min(env.deps.ATLAS.seeds.max, Math.floor(Number(raw.seeds) || 0))),
        autoMap: raw.autoMap === true, autoGuardians: raw.autoGuardians !== false, starterSeason: Math.max(0, Math.floor(Number(raw.starterSeason) || 0)) };
    const savedNext = Math.floor(Number(raw.nextUid));
    next.nextUid = Math.min(Number.MAX_SAFE_INTEGER, Math.max(Number.isSafeInteger(savedNext) ? savedNext : 1, ...[...uids].map(uid => uid + 1), 1));
    state.atlas = next;
    // 패시브의 별: 그 저장의 첫 완료와 시대 재생 특전으로 센 포인트 안에서, 시작 별에 이어지는 것만(예전 바퀴의 id는 모르는 id라 빠진다).
    next.passives = env.deps.atlasPassives.normalize(raw.passives, state);
    restoreWheelAccess(state, raw);
    atlasCoreRestoreBoardRun(env, raw, state);
    atlasCoreSetLoadout(env, state, Array.isArray(raw.loadout) ? raw.loadout : []);
    // 새 천문도에서 이어질 수 없는 열린 지도는 입장 직후의 취소와 같이 닫는다: 지도석(옮겨진 것)과 쓴 각인, 입장권이 돌아온다.
    closeStaleRun(env, state, stale);
    return next;
}

/** 열린 싸움의 자리가 닫혀 있는지: 천문도 이전의 저장이 열어 둔 수호자, 정점, 자리에 이어진 후반 싸움은 그 자리를 아직 열지 않았다
 * (그 자리가 치르는 싸움은 자리가 열려야 들어간다). 기억 싸움과 원정 판은 그대로 이어진다. */
function closedFightRun(env, state) {
    const run = state.atlas.run;
    if (!run || run.board || run.map.memory) return false;
    const node = env.BY_ID.get(run.map.node), place = env.GATE_OF.get(node.id) || (env.LEGACY.includes(node) ? node : null);
    return !!place && atlasCoreStatus(env, state, place.id) === 'locked';
}

function closeStaleRun(env, state, stale) { if (stale || closedFightRun(env, state)) atlasCoreCancel(env, state); }

function restoreWheelAccess(state, raw) {
    const atlas = state.atlas;
    atlas.autoMap = atlas.autoMap && atlasAutoUnlocked(state);
    atlas.wheelHub = raw.wheelHub === true && !atlas.run && atlas.lastResult?.outcome === 'complete';
}

export function atlasCoreRestoreBoardRun(env, raw, state) {
    const next = state.atlas;
    if (!raw.run?.board || !next.run) return;
    const board = env.deps.atlasBoard.normalizeRun(raw.run.board, state);
    if (board && board.node === next.run.map.node && board.tier === next.run.map.tier) {
        next.run.board = board;
        next.run.portals = 1;
    }
    else next.run = null;
}
