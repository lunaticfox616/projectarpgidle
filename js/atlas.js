/** 세계수 아틀라스 (docs/atlas-endgame-20260930.md 3절): 저장 상태 · 노드 그래프 · 지도 장치 런 · 지도석 드롭 · 자동 지도.
 * 전투 함수는 부르지 않는다 — 이동 · 보스 처치 정산 · 쓰러짐은 js/atlas-run.js가 이 모듈의 상태 전이를 부른다.
 * 루프를 넘어 남는 것: 해금 · 완료 · 보너스 · 자동 지도 설정. 루프마다 비우는 것: 지도석 보관함 · 열린 지도(열쇠 · 우주석과 같은 규칙).
 */
const atlas = (() => {
    const NODES = Object.freeze(ATLAS.regions.flatMap((region, regionIndex) => ATLAS.nodes[region.id].map((row, slot) => Object.freeze({
        id: `${region.id}_${slot}`, region: region.id, regionIndex, slot, name: row[0], tier: row[1], boss: row[2], style: row[3],
        biome: row[4] || region.biome, bossAct: row[5], ele: region.ele
    }))));
    const BY_ID = new Map(NODES.map(node => [node.id, node]));
    // Inside a region: the outer arc, each node to the ring within, and across rings. Between regions: each ring closes into a circle.
    const INNER_LINKS = [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6], [5, 7], [6, 8], [7, 8]];
    const OUTER_LINKS = [[2, 0], [4, 3], [6, 5], [8, 7]];
    const LINKS = Object.freeze(ATLAS.regions.flatMap((region, r) => {
        const next = ATLAS.regions[(r + 1) % ATLAS.regions.length].id;
        return [...INNER_LINKS.map(([a, b]) => [`${region.id}_${a}`, `${region.id}_${b}`]),
            ...OUTER_LINKS.map(([a, b]) => [`${region.id}_${a}`, `${next}_${b}`])];
    }));
    const NEIGHBOURS = new Map(NODES.map(node => [node.id, LINKS.filter(link => link.includes(node.id))
        .map(([a, b]) => (a === node.id ? b : a))]));
    const RARITY_RANK = { normal: 0, magic: 1, rare: 2 };
    const zones = new WeakMap();

    /** Chart point at a region's angle (plus degrees) and a radius, 0~100 on both axes. */
    function polar(regionIndex, degrees, radius) {
        const angle = (-90 + regionIndex * 360 / ATLAS.regions.length + degrees) * Math.PI / 180;
        return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
    }
    const position = node => polar(node.regionIndex, ATLAS.chart.offsets[node.slot], ATLAS.chart.radii[ATLAS.chart.ring[node.slot]]);
    function defaults() {
        return { version: 1, unlocked: false, completed: [], bonus: [], stash: [], nextUid: 1, run: null, lastResult: null,
            autoMap: false, starterSeason: 0 };
    }

    // ---------------------------------------------------------------- availability and the graph
    /** 루프 10부터 혼돈 20이 관문이다: 처음 깨면 아틀라스가 영구히 열리고, 지도는 루프마다 이번 루프 혼돈 20을 깬 뒤에 연다. */
    function lockReason(state) {
        if (!state.atlas.unlocked && !hasCurrentLoopChaos20Clear(state)) return '루프 10에서 혼돈 20을 클리어하면 세계수 아틀라스가 열립니다.';
        if (!hasCurrentLoopChaos20Clear(state)) return '이번 루프에서 혼돈 20을 클리어해야 지도를 열 수 있습니다.';
        return '';
    }
    const completed = (state, id) => state.atlas.completed.includes(id);
    function status(state, id) {
        if (state.atlas.bonus.includes(id)) return 'bonus';
        if (completed(state, id)) return 'complete';
        const node = BY_ID.get(id);
        return node && (node.tier === 1 || NEIGHBOURS.get(id).some(other => completed(state, other))) ? 'open' : 'locked';
    }
    const reachable = (state, id) => status(state, id) !== 'locked';
    const points = state => state.atlas.completed.length + state.atlas.bonus.length;
    const bestTier = state => Math.max(0, ...state.atlas.completed.map(id => BY_ID.get(id).tier));

    /** The highest reachable tier at or below `tier`, a random node of it. */
    function nodeForTier(state, tier, random) {
        const open = NODES.filter(node => reachable(state, node.id));
        for (let t = Math.min(ATLAS.maxTier, Math.max(1, tier)); t >= 1; t--) {
            const pool = open.filter(node => node.tier === t);
            if (pool.length) return pool[Math.floor(random() * pool.length)];
        }
        return null;
    }
    function rollMap(state, tier, random) {
        const node = nodeForTier(state, tier, random);
        if (!node) return null;
        const drops = ATLAS.drops, roll = random();
        const rarity = roll < drops.rare ? 'rare' : (roll < drops.rare + drops.magic ? 'magic' : 'normal');
        const map = atlasMaps.create(node.id, node.tier, rarity, random);
        if (random() < drops.qualityChance) map.quality = 1 + Math.floor(random() * drops.quality);
        map.uid = state.atlas.nextUid++;
        return map;
    }
    /** @returns {number} how many fit; the rest are lost (the stash keeps its cap). */
    function store(state, maps) {
        const room = Math.max(0, ATLAS.stashCap - state.atlas.stash.length);
        state.atlas.stash.push(...maps.slice(0, room));
        return Math.min(room, maps.length);
    }

    /** Once per loop, the first look after this loop's chaos 20 clear: the atlas opens for good and a few maps start the loop. */
    function sync(state, random = Math.random) {
        if (!hasCurrentLoopChaos20Clear(state)) return [];
        state.atlas.unlocked = true;
        const season = Math.max(1, Math.floor(state.season || 1));
        if (state.atlas.starterSeason === season) return [];
        state.atlas.starterSeason = season;
        const tier = Math.max(1, bestTier(state) - ATLAS.starter.belowBest);
        const maps = Array.from({ length: ATLAS.starter.count }, () => rollMap(state, tier, random)).filter(Boolean);
        store(state, maps);
        return maps;
    }

    // ---------------------------------------------------------------- the map device
    function beginReason(state, uid) {
        const reason = lockReason(state);
        if (reason) return reason;
        if (state.atlas.run) return '이미 열린 지도가 있습니다. 먼저 마치거나 닫으세요.';
        return state.atlas.stash.some(map => map.uid === uid) ? '' : '보관함에 없는 지도석입니다.';
    }
    /** Consumes the map: from here the run owns it (three portals, its own drops held until the boss falls). */
    function begin(state, uid, returnZoneId) {
        const reason = beginReason(state, uid);
        if (reason) return reason;
        const [map] = state.atlas.stash.splice(state.atlas.stash.findIndex(entry => entry.uid === uid), 1);
        state.atlas.run = { map, portals: ATLAS.portals, drops: [], returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null };
        state.atlas.lastResult = null;
        return '';
    }
    /** Travel failed right after opening: the untouched map goes back to the stash. */
    function cancel(state) {
        const run = state.atlas.run;
        if (!run) return;
        state.atlas.stash.unshift(run.map);
        state.atlas.run = null;
    }
    /** Boss down: completion (and the bonus for a rare map) count once per node; the run's map drops go to the stash. */
    function complete(state) {
        const run = state.atlas.run;
        if (!run) return null;
        const id = run.map.node, first = !completed(state, id);
        if (first) state.atlas.completed.push(id);
        const bonus = run.map.rarity === 'rare' && !state.atlas.bonus.includes(id);
        if (bonus) state.atlas.bonus.push(id);
        const stored = store(state, run.drops);
        state.atlas.run = null;
        state.atlas.lastResult = { nodeId: id, tier: run.map.tier, outcome: 'complete', first, bonus, drops: stored, lost: run.drops.length - stored };
        return { ...state.atlas.lastResult, returnZoneId: run.returnZoneId };
    }
    /** Death, a town return or leaving the map spends a portal; the last one closes the map and loses its held drops. */
    function usePortal(state) {
        const run = state.atlas.run;
        if (!run) return null;
        run.portals = Math.max(0, run.portals - 1);
        if (run.portals > 0) return { closed: false, portals: run.portals };
        return { closed: true, ...close(state, 'failed') };
    }
    function close(state, outcome) {
        const run = state.atlas.run;
        state.atlas.run = null;
        state.atlas.lastResult = { nodeId: run.map.node, tier: run.map.tier, outcome, first: false, bonus: false, drops: 0, lost: run.drops.length };
        return { returnZoneId: run.returnZoneId };
    }
    /** 자동 지도: 방금 마친 등급 이하에서 가장 높은 지도석 — 같은 등급이면 아직 못 끝낸 노드, 희귀한 것, 먼저 얻은 것 순. */
    function nextAuto(state, tierCap) {
        if (!state.atlas.autoMap || lockReason(state)) return null;
        const score = map => [map.tier, Number(!completed(state, map.node)), RARITY_RANK[map.rarity], -map.uid];
        const better = (a, b) => { const x = score(a), y = score(b); const i = x.findIndex((v, k) => v !== y[k]); return i >= 0 && x[i] > y[i]; };
        return state.atlas.stash.filter(map => map.tier <= tierCap).reduce((best, map) => (!best || better(map, best) ? map : best), null);
    }

    // ---------------------------------------------------------------- drops
    function dropTier(tier, random) {
        const drops = ATLAS.drops, roll = random();
        if (roll < drops.tierUp) return tier + 1;
        return roll < drops.tierUp + drops.tierSame ? tier : tier - 1 - Math.floor(random() * 3);
    }
    /** A kill in a map: elites and bosses drop more, the map's item quantity counts; drops wait in the run until the boss falls.
     * Outside the atlas, bosses of chaos 20 and deeper sometimes drop a low map straight to the stash (the way back in). */
    function dropFromKill(state, zone, enemy, random = Math.random) {
        if (!zone || !enemy || lockReason(state)) return [];
        if (zone.type === 'atlasMap' && state.atlas.run) return dropInMap(state, zone, enemy, random);
        return dropOutside(state, zone, enemy, random);
    }
    function dropOutside(state, zone, enemy, random) {
        const drops = ATLAS.drops;
        if (zone.type !== 'abyss' || !enemy.isBoss || !(zone.depth >= drops.outsideDepth) || random() >= drops.outsideBoss) return [];
        const map = rollMap(state, 1 + Math.floor(random() * drops.outsideTier), random);
        return map && store(state, [map]) ? [map] : [];
    }
    function dropInMap(state, zone, enemy, random) {
        const run = state.atlas.run, drops = ATLAS.drops;
        const chance = (enemy.isBoss ? 1 : (enemy.isElite ? drops.elite : drops.regular)) * (1 + zone.atlasLootQuantity / 100);
        const count = Math.floor(chance) + Number(random() < chance % 1) + Number(!!enemy.isBoss && random() < drops.bossExtra);
        const maps = Array.from({ length: count }, () => rollMap(state, dropTier(run.map.tier, random), random)).filter(Boolean);
        run.drops.push(...maps.slice(0, Math.max(0, ATLAS.stashCap - run.drops.length)));
        return maps;
    }

    // ---------------------------------------------------------------- the combat zone of the open map
    const equivalentDepth = tier => ATLAS.difficulty.baseDepth + (tier - 1) * ATLAS.difficulty.depthPerTier;
    const sizeFor = tier => 1 + ATLAS.sizeBands.filter(band => tier >= band).length;
    /** The zone getZone(ATLAS.zoneId) returns while a map is open (memoized per run: the map inside never changes). */
    function zone(state) {
        const run = state.atlas && state.atlas.run;
        if (!run) return null;
        if (!zones.has(run)) zones.set(run, buildZone(run.map));
        return zones.get(run);
    }
    function buildZone(map) {
        const node = BY_ID.get(map.node), fx = atlasMaps.effects(map), depth = equivalentDepth(map.tier);
        return {
            id: ATLAS.zoneId, name: node.name, type: 'atlasMap', tier: getAbyssZoneTier(depth), maxKills: 1, ele: node.ele,
            areaLevel: ATLAS.areaLevel.base + (map.tier - 1) * ATLAS.areaLevel.perTier,
            // 루프 인플레이션 대신 등급이 정한 고정 루프 · 깊이 (combat getLoopDifficultyInputs · state getAbyssMonsterScales).
            fixedSeason: depth - ATLAS.difficulty.loopBehindDepth, equivalentDepth: depth, equivalentChaosDepth: depth,
            mapHpMul: fx.hp, mapDamageMul: fx.damage, bossMods: { hpMul: fx.bossHp, damageMul: fx.bossDamage },
            trialHazard: fx.hazard ? { ...ATLAS.burningGround } : undefined,
            atlasNode: node.id, atlasTier: map.tier, atlasMapRarity: map.rarity, atlasEnemyMods: fx.enemy,
            atlasLootQuantity: fx.quantity, atlasLootRarity: fx.rarity, atlasPackExtra: fx.packExtra, atlasExtraElite: fx.extraElite,
            atlasSeed: map.uid, bossName: node.boss, bossAct: node.bossAct,
            exploration: { style: node.style, biome: node.biome, size: sizeFor(map.tier), seed: `atlas:${map.uid}`, bossStages: 1 }
        };
    }
    /** Equipment base tier from the map tier: T15 at 1~3등급, one more every three tiers, T20 at 16등급. */
    const lootTier = tier => Math.min(20, 14 + Math.ceil(tier / 3));

    // ---------------------------------------------------------------- save boundary and the loop
    function normalizeRun(raw, validMap) {
        const map = raw && validMap(raw.map);
        if (!map) return null;
        const portals = Math.floor(Number(raw.portals));
        return { map, portals: portals >= 1 && portals <= ATLAS.portals ? portals : 1,
            drops: (Array.isArray(raw.drops) ? raw.drops : []).map(validMap).filter(Boolean).slice(0, ATLAS.stashCap),
            returnZoneId: Number.isInteger(raw.returnZoneId) && raw.returnZoneId >= 0 ? raw.returnZoneId : null };
    }
    function normalizeResult(raw) {
        if (!raw || !BY_ID.has(raw.nodeId) || !['complete', 'failed'].includes(raw.outcome)) return null;
        const count = value => Math.max(0, Math.min(ATLAS.stashCap, Math.floor(Number(value) || 0)));
        return { nodeId: raw.nodeId, tier: Math.max(1, Math.min(ATLAS.maxTier, Math.floor(Number(raw.tier) || 1))), outcome: raw.outcome,
            first: raw.first === true, bonus: raw.bonus === true, drops: count(raw.drops), lost: count(raw.lost) };
    }
    const nodeList = (value, allowed) => [...new Set(Array.isArray(value) ? value : [])].filter(id => BY_ID.has(id) && allowed(id));
    /** Defaults, the one-time move from the world-tree journey (its unlock carries over), corrupt entries dropped, unique uids. */
    function normalize(state) {
        const raw = state.atlas && typeof state.atlas === 'object' ? state.atlas : {};
        const journeyUnlocked = !!(state.worldTreeJourney && state.worldTreeJourney.unlocked === true);
        delete state.worldTreeJourney;
        const uids = new Set(), validMap = entry => {
            const map = atlasMaps.normalize(entry, id => BY_ID.has(id));
            if (!map || uids.has(map.uid)) return null;
            uids.add(map.uid);
            return map;
        };
        // The open map claims its uid first: a stash entry sharing it is the duplicate.
        const done = nodeList(raw.completed, () => true), run = normalizeRun(raw.run, validMap);
        const next = { ...defaults(), unlocked: raw.unlocked === true || journeyUnlocked, completed: done,
            bonus: nodeList(raw.bonus, id => done.includes(id)), stash: (Array.isArray(raw.stash) ? raw.stash : []).map(validMap).filter(Boolean)
                .slice(0, ATLAS.stashCap), run, lastResult: normalizeResult(raw.lastResult),
            autoMap: raw.autoMap === true, starterSeason: Math.max(0, Math.floor(Number(raw.starterSeason) || 0)) };
        next.nextUid = Math.max(Math.floor(Number(raw.nextUid) || 1), ...[...uids].map(uid => uid + 1), 1);
        state.atlas = next;
        return next;
    }
    function onLoopReset(state) {
        Object.assign(state.atlas, { stash: [], run: null, lastResult: null });
    }
    function travelReason(state, id) {
        return id === ATLAS.zoneId && !state.atlas.run ? '지도 장치에서 지도석을 열어야 들어갈 수 있습니다.' : '';
    }
    return Object.freeze({ nodes: NODES, links: LINKS, node: id => BY_ID.get(id) || null, neighbours: id => NEIGHBOURS.get(id) || [],
        position, polar, defaults, lockReason, status, reachable, points, bestTier, sync, beginReason, begin, cancel, complete, usePortal, close, nextAuto,
        dropFromKill, zone, preview: buildZone, lootTier, equivalentDepth, normalize, onLoopReset, travelReason,
        inMap: state => state.currentZoneId === ATLAS.zoneId });
})();
safeExposeGlobals({ atlas });
