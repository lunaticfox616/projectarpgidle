import { atlasCoreAddFragments, atlasCoreStore, atlasCoreDeliver } from './atlas-inventory.mjs';
import { atlasCoreCompleted, atlasCoreChartRun, atlasCoreReachable, atlasCoreClearIds } from './atlas-graph.mjs';
import { atlasCoreBossSpoils } from './atlas-boss-rewards.mjs';
import { atlasCoreGrantStone } from './atlas-map-drops.mjs';
import { atlasCoreNormalizeResultEndgame, atlasCoreCompletedMemoryResult, atlasCoreNormalizeLoot, atlasCoreNormalizeResultMaterials, atlasCoreNormalizeResultMemory, atlasCoreNormalizeBoxes, atlasCoreNormalizeStarGains } from './atlas-receipts.mjs';
import { atlasStarBoxes, atlasStarClearGains } from './atlas-star-rewards.mjs';

/** Travel failed right after opening: the untouched map (or the pinnacle's tickets) and its fragments go back, and so does a dew
 * entry's 형체 없는 이슬 unless a star kept it (nothing was fought yet). A free first fight of a chart boss (run.free) paid nothing. */
export function atlasCoreCancel(env, state) {
    const run = state.atlas.run;
    if (!run) return;
    if (run.board) { state.atlas.run = null; return; }
    if (!run.free) atlasCoreRefundEntry(env, state, run);
    if (run.dew && !run.dewKept) state.currencies.formlessDew = (state.currencies.formlessDew || 0) + env.deps.ATLAS.dewEntry.cost;
    atlasCoreAddFragments(env, state, run.spent);
    state.atlas.run = null;
}

/** What opening the run took comes back: a memory, the pinnacle's four tickets, a late fight's offering, or the stone itself. */
function atlasCoreRefundEntry(env, state, run) {
    if (run.map.memory) env.deps.memoryDungeon.refund(state, run.map);
    else if (run.map.node === env.PINNACLE.id) for (const key of env.deps.ATLAS.pinnacle.tickets) state.currencies[key] += 1;
    else if (env.deps.atlasEndgame.isFight(run.map.node)) env.deps.atlasEndgame.refund(state, run.map.node);
    else state.atlas.stash.unshift(run.map);
}

/** 첫 완료가 새로 연 지도마다 그 지도의 일반 지도석 하나(그 지도의 천문도 등급, 그 지도를 가리킨다). 열리기 전과 뒤를 견주므로 부모가 둘인
 * 지도도 한 번만 받는다. 보관함 한도를 넘어도 들어온다. locked: 완료하기 전에 잠겨 있던 지도들. */
export function atlasCoreGrantOpened(env, state, locked) {
    const maps = locked.filter(node => atlasCoreReachable(env, state, node.id)).map(node => atlasCoreGrantStone(env, state, node.id, node.tier, Math.random));
    atlasCoreDeliver(state, maps);
    return maps.map(map => ({ node: map.node, tier: map.tier }));
}

/** A ring board map down (js/atlas-board.js complete): its rewards go to the board, never completion, bonus or the stash. */
export function atlasCoreCompleteBoard(env, state, run) {
    const board = env.deps.atlasBoard.complete(state, run.board);
    if (!board) return null;
    state.atlas.run = null;
    state.atlas.lastResult = { nodeId: run.map.node, tier: run.map.tier, outcome: 'complete', first: false, bonus: false, drops: 0, lost: 0,
        fragments: 0, lostFragments: 0, lostMaterials: [], memory: null, granted: [], boxes: null, refund: null, stars: null };
    return { ...state.atlas.lastResult, board, returnZoneId: run.returnZoneId };
}

/** A completed map's receipt (atlas-receipts normalizes the same shape). boxes: 장비 상자 to open { count, fine } (their items arrive
 * with atlasCoreKeepBoxes). stars: what the passive stars added (atlas-star-rewards atlasStarClearGains), null off the chart. */
export function atlasCoreClearReceipt(env, run, parts) {
    const { first, bonus, stored, fragments, granted, boxes, stars } = parts;
    return { nodeId: run.map.node, tier: run.map.tier, outcome: 'complete', first, bonus, drops: stored, lost: run.drops.length - stored, fragments,
        lostFragments: run.found.length - fragments, lostMaterials: [], granted, boxes: atlasCoreNormalizeBoxes(env, boxes), refund: null,
        stars: atlasCoreNormalizeStarGains(env, stars) };
}

/** 완료를 적는다: 지도는 제 id, 천문도의 보스 자리가 치르는 싸움은 그 자리(후반 싸움은 제 id도, atlas-graph atlasCoreClearIds). 기억 싸움은
 * 노드를 끝낸 것으로 치지 않는다: 시대 재생 뒤 기억으로 길을 건너뛰어 노드를 열거나, 정점의 기억이 아틀라스를 깨우거나, 머리줄 완료가 51을
 * 넘던 문제(2026-10-18). first: 처음 적었다(보스 자리는 첫 처치), locked: 그 전에 잠겨 있던 지도들(첫 완료가 연 지도의 지도석). */
function atlasCoreRecordClear(env, state, run) {
    const record = run.map.memory ? [] : atlasCoreClearIds(env, run.map.node), [place] = record;
    const first = !!place && !atlasCoreCompleted(state, place);
    const locked = first ? env.MAP_NODES.filter(node => !atlasCoreReachable(env, state, node.id)) : [];
    for (const id of record) if (!atlasCoreCompleted(state, id)) state.atlas.completed.push(id);
    const bonus = !!place && run.map.rarity === 'rare' && !state.atlas.bonus.includes(place);
    if (bonus) state.atlas.bonus.push(place);
    return { first, bonus, locked };
}

/** Boss down: completion (and the bonus for a rare map) count once per node; the run's drops go to the stash, the maps the first clear
 * opened give their stones, the passive stars add theirs, and an ordinary chart map has 장비 상자 to open (gearBoxes, the first of them the
 * map boss's own reward, rolled from boxSeed by the run layer; gearFine of them one rarity step higher). */
export function atlasCoreComplete(env, state) {
    const run = state.atlas.run;
    if (!run) return null;
    if (run.board) return atlasCoreCompleteBoard(env, state, run);
    const id = run.map.node, recalled = !!run.map.memory, { first, bonus, locked } = atlasCoreRecordClear(env, state, run);
    const stored = atlasCoreStore(env, state, run.drops), fragments = atlasCoreAddFragments(env, state, run.found);
    const granted = atlasCoreGrantOpened(env, state, locked), boxes = atlasStarBoxes(env, run, first), stars = atlasStarClearGains(env, state, run);
    state.atlas.run = null;
    state.atlas.tally.maps += 1;
    state.atlas.lastResult = atlasCoreClearReceipt(env, run, { first, bonus, stored, fragments, granted, boxes, stars });
    // 기억 싸움은 그 보스의 기억 보상만(입장권, 씨앗, 후반부 보상과 처치 수는 원래 싸움의 몫), 다른 싸움은 기억을 남길 수 있다.
    const node = env.BY_ID.get(id), memory = env.deps.memoryDungeon.settle(state, node, run.map, Math.random, run.bonus);
    const endgame = recalled ? null : env.deps.atlasEndgame.onComplete(state, node, run);
    const spoils = recalled ? {} : atlasCoreBossSpoils(env, state, node);
    Object.assign(state.atlas.lastResult, { seed: spoils.seed === true, seeds: state.atlas.seeds, endgame: atlasCoreNormalizeResultEndgame(env, endgame),
        memory: atlasCoreCompletedMemoryResult(env, run.map, memory) });
    // The event keeps its payout contract; only lastResult stores the bounded presentation receipt above.
    return { ...state.atlas.lastResult, ...spoils, endgame, memory, returnZoneId: run.returnZoneId, gearBoxes: boxes.count, gearFine: boxes.fine,
        boxSeed: `atlas-box:${run.map.uid}` };
}

/** The 장비 상자 just opened (atlas-run-spoils): their own loot receipt (null outside a map receipt) joins the result card under its heading. */
export function atlasCoreKeepBoxes(env, state, opened) {
    const result = state.atlas.lastResult;
    if (result?.boxes && opened) result.boxes = atlasCoreNormalizeBoxes(env, { ...result.boxes, total: opened.equipmentCount, items: opened.items });
}

/** An ordinary room emptied in the open map stays empty when a portal re-enters it: it is the same map. */
export function atlasCoreMarkCleared(state, roomId) {
    const run = state.atlas.run;
    if (run && !run.cleared.includes(roomId)) run.cleared.push(roomId);
}

/** The finished map's loot receipt stays with its result (a chained map starts a new receipt). */
export function atlasCoreKeepLoot(env, state, receipt) {
    if (state.atlas.lastResult && receipt) state.atlas.lastResult.loot = atlasCoreNormalizeLoot(env, receipt);
}

/** Death, a town return or leaving the map spends a portal; the last one closes the map and loses its held drops. On an ordinary
 * chart map the last portal gives back one plain stone of that map (over the stash cap); the dew of a dew entry is not given back.
 * Closing on purpose (atlasCoreClose from 지도 닫기) gives nothing back. */
export function atlasCoreUsePortal(env, state) {
    const run = state.atlas.run;
    if (!run) return null;
    run.portals = run.board ? 0 : Math.max(0, run.portals - 1);
    if (run.portals > 0) return { closed: false, portals: run.portals };
    const closed = atlasCoreClose(env, state, 'failed');
    if (!atlasCoreChartRun(env, run)) return { closed: true, ...closed };
    const stone = atlasCoreGrantStone(env, state, run.map.node, run.map.tier, Math.random);
    atlasCoreDeliver(state, [stone]);
    state.atlas.lastResult.refund = { node: stone.node, tier: stone.tier };
    return { closed: true, ...closed, refund: state.atlas.lastResult.refund };
}

export function atlasCoreClose(env, state, outcome) {
    const run = state.atlas.run;
    if (!run) return null;
    if (run.board && outcome === 'failed') env.deps.atlasBoard.fail(state, run.board);
    state.atlas.run = null;
    state.atlas.lastResult = { nodeId: run.map.node, tier: run.map.tier, outcome, first: false, bonus: false, drops: 0,
        lost: run.drops.length, fragments: 0, lostFragments: run.found.length,
        lostMaterials: atlasCoreNormalizeResultMaterials(env, Object.entries(run.endgame.items), env.deps.ATLAS_ENDGAME.itemCap * 10),
        seed: false, seeds: state.atlas.seeds, endgame: null,
        memory: atlasCoreNormalizeResultMemory(env, { foughtTier: run.map.memory }, true), granted: [], boxes: null, refund: null, stars: null };
    // Floor drops already entered this receipt when produced; the existing departure still collects them exactly once.
    atlasCoreKeepLoot(env, state, state.explorationLoot);
    return { returnZoneId: run.returnZoneId };
}
