/** 세계수 아틀라스 (docs/atlas-endgame-20260930.md 3절): 저장 상태 · 노드 그래프 · 지도 장치 런 · 지도석 · 각인 드롭 · 자동 지도.
 * 전투 함수는 부르지 않는다 — 이동 · 보스 처치 정산 · 쓰러짐은 js/atlas-run.js가 이 모듈의 상태 전이를 부른다.
 * 루프를 넘어 남는 것: 해금 · 완료 · 보너스 · 패시브 · 자동 지도 · 각인 홈 설정. 루프마다 비우는 것: 지도석 · 각인 · 열린 지도.
 * 지도를 열 때 패시브와 각인의 효과를 런에 고정한다(run.bonus): 열린 지도 도중에 패시브를 바꿔도 그 지도는 그대로다.
 */
const atlas = (() => {
    const MAP_NODES = ATLAS.regions.flatMap((region, regionIndex) => ATLAS.nodes[region.id].map((row, slot) => Object.freeze({
        id: `${region.id}_${slot}`, kind: 'map', region: region.id, regionIndex, slot, name: row[0], tier: row[1], boss: row[2], style: row[3],
        biome: row[4] || region.biome, bossAct: row[5], ele: region.ele
    })));
    // A guardian closes each region's innermost pair (slots 7 · 8); the pinnacle sits in the centre, opened with the four tickets.
    const GUARDIANS = ATLAS.regions.map((region, regionIndex) => {
        const [name, ticket, bossAct] = ATLAS.guardians[region.id];
        return Object.freeze({ id: `${region.id}_g`, kind: 'guardian', region: region.id, regionIndex, slot: 9, name, tier: ATLAS.guardianRules.tier,
            boss: name, style: 'arena', biome: region.biome, bossAct, ele: region.ele, ticket });
    });
    const PINNACLE = Object.freeze({ id: 'pinnacle', kind: 'pinnacle', region: null, regionIndex: -1, slot: -1, name: ATLAS.pinnacle.name,
        tier: ATLAS.guardianRules.tier, boss: ATLAS.pinnacle.boss, style: 'arena', biome: ATLAS.pinnacle.biome, bossAct: ATLAS.pinnacle.bossAct, ele: 'chaos' });
    const NODES = Object.freeze([...MAP_NODES, ...GUARDIANS, PINNACLE]);
    const BY_ID = new Map(NODES.map(node => [node.id, node]));
    // Inside a region: the outer arc, each node to the ring within, and across rings. Between regions: each ring closes into a circle.
    const INNER_LINKS = [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6], [5, 7], [6, 8], [7, 8], [7, 'g'], [8, 'g']];
    const OUTER_LINKS = [[2, 0], [4, 3], [6, 5], [8, 7]];
    const LINKS = Object.freeze(ATLAS.regions.flatMap((region, r) => {
        const next = ATLAS.regions[(r + 1) % ATLAS.regions.length].id;
        return [...INNER_LINKS.map(([a, b]) => [`${region.id}_${a}`, `${region.id}_${b}`]),
            ...OUTER_LINKS.map(([a, b]) => [`${region.id}_${a}`, `${next}_${b}`])];
    }));
    const NEIGHBOURS = new Map(NODES.map(node => [node.id, LINKS.filter(link => link.includes(node.id))
        .map(([a, b]) => (a === node.id ? b : a))]));
    const FRAGMENTS = new Map(ATLAS.fragments.map(fragment => [fragment.id, fragment]));
    const RARITY_RANK = { normal: 0, magic: 1, rare: 2 };
    const zones = new WeakMap();

    /** Chart point at a region's angle (plus degrees) and a radius, 0~100 on both axes. */
    function polar(regionIndex, degrees, radius) {
        const angle = (-90 + regionIndex * 360 / ATLAS.regions.length + degrees) * Math.PI / 180;
        return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
    }
    function position(node) {
        if (node.kind === 'pinnacle') return { x: 50, y: 50 };
        if (node.kind === 'guardian') return polar(node.regionIndex, 0, ATLAS.guardianRules.radius);
        return polar(node.regionIndex, ATLAS.chart.offsets[node.slot], ATLAS.chart.radii[ATLAS.chart.ring[node.slot]]);
    }
    function defaults() {
        return { version: 1, unlocked: false, completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, loadout: [], nextUid: 1,
            run: null, lastResult: null, autoMap: false, starterSeason: 0 };
    }
    /** 세계수 씨앗 하나마다 모든 노드가 2등급 오른다(24등급까지). */
    const effectiveTier = (state, node) => Math.min(ATLAS.tierCap, node.tier + state.atlas.seeds * ATLAS.seeds.tierStep);
    const hasTickets = state => ATLAS.pinnacle.tickets.every(key => (state.currencies[key] || 0) >= 1);
    /** Every effect key at zero, so zone and drop math never needs fallbacks. */
    const ZERO = () => Object.fromEntries([...atlasPassives.effectKeys].map(key => [key, 0]));
    const fragmentEffects = ids => ids.map(id => FRAGMENTS.get(id).effect).filter(Boolean);
    const bonusOf = (state, fragmentIds = []) => ({ ...ZERO(), ...atlasPassives.sum(state.atlas.passives, fragmentEffects(fragmentIds)) });

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
        if (node && node.kind === 'pinnacle') return hasTickets(state) ? 'open' : 'locked';
        return node && (node.tier === 1 || NEIGHBOURS.get(id).some(other => completed(state, other))) ? 'open' : 'locked';
    }
    const reachable = (state, id) => status(state, id) !== 'locked';
    const points = state => state.atlas.completed.length + state.atlas.bonus.length;
    const bestTier = state => Math.max(0, ...state.atlas.completed.map(id => effectiveTier(state, BY_ID.get(id))));

    /** The highest reachable map tier at or below `tier`, a random node of it (guardians drop by their own rule). */
    function nodeForTier(state, tier, random) {
        const open = MAP_NODES.filter(node => reachable(state, node.id));
        for (let t = Math.min(ATLAS.tierCap, Math.max(1, tier)); t >= 1; t--) {
            const pool = open.filter(node => effectiveTier(state, node) === t);
            if (pool.length) return pool[Math.floor(random() * pool.length)];
        }
        return null;
    }
    function rollMap(state, tier, random, bonus) {
        const node = nodeForTier(state, tier, random);
        if (!node) return null;
        const drops = ATLAS.drops, roll = random(), better = 1 + bonus.mapRarity / 100;
        const rarity = roll < drops.rare * better ? 'rare' : (roll < (drops.rare + drops.magic) * better ? 'magic' : 'normal');
        return stamp(state, atlasMaps.create(node.id, effectiveTier(state, node), rarity, random), random, bonus);
    }
    function stamp(state, map, random, bonus) {
        if (random() < ATLAS.drops.qualityChance + bonus.mapQuality / 100) map.quality = 1 + Math.floor(random() * ATLAS.drops.quality);
        map.uid = state.atlas.nextUid++;
        return map;
    }
    /** A boss of a 13+ map in a region whose guardian is open sometimes drops that guardian's map. */
    function guardianDrop(state, node, random, bonus) {
        const guardian = BY_ID.get(`${node.region}_g`), rules = ATLAS.guardianRules;
        if (node.kind !== 'map' || node.tier < rules.minTier || !reachable(state, guardian.id)) return [];
        if (random() >= rules.dropChance * (1 + bonus.bossMap / 100)) return [];
        return [stamp(state, atlasMaps.create(guardian.id, effectiveTier(state, guardian), 'normal', random), random, bonus)];
    }
    /** @returns {number} how many fit; the rest are lost (the stash keeps its cap). */
    function store(state, maps) {
        const room = Math.max(0, ATLAS.stashCap - state.atlas.stash.length);
        state.atlas.stash.push(...maps.slice(0, room));
        return Math.min(room, maps.length);
    }
    function addFragments(state, ids) {
        for (const id of ids) state.atlas.fragments[id] = Math.min(ATLAS.fragmentRules.cap, (state.atlas.fragments[id] || 0) + 1);
    }

    /** Once per loop, the first look after this loop's chaos 20 clear: the atlas opens for good and a few maps start the loop. */
    function sync(state, random = Math.random) {
        if (!hasCurrentLoopChaos20Clear(state)) return [];
        state.atlas.unlocked = true;
        const season = Math.max(1, Math.floor(state.season || 1));
        if (state.atlas.starterSeason === season) return [];
        state.atlas.starterSeason = season;
        const bonus = bonusOf(state), tier = Math.max(1, bestTier(state) - ATLAS.starter.belowBest);
        const maps = Array.from({ length: ATLAS.starter.count + bonus.starter }, () => rollMap(state, tier, random, bonus)).filter(Boolean);
        store(state, maps);
        return maps;
    }

    // ---------------------------------------------------------------- the map device
    const slots = state => ATLAS.fragmentRules.slots + bonusOf(state).slots;
    /** 각인 홈 설정: 지도를 열 때(자동 지도 포함) 이 순서대로, 가진 것만 하나씩 쓴다. */
    function setLoadout(state, ids) {
        state.atlas.loadout = [...new Set(ids)].filter(id => FRAGMENTS.has(id)).slice(0, slots(state));
    }
    function beginReason(state, uid) {
        const reason = lockReason(state);
        if (reason) return reason;
        if (state.atlas.run) return '이미 열린 지도가 있습니다. 먼저 마치거나 닫으세요.';
        return state.atlas.stash.some(map => map.uid === uid) ? '' : '보관함에 없는 지도석입니다.';
    }
    /** Fragments in the loadout that are in stock, one each; the keep passive may save one. */
    function useFragments(state, random) {
        const keep = bonusOf(state).fragmentKeep / 100;
        const used = state.atlas.loadout.slice(0, slots(state)).filter(id => (state.atlas.fragments[id] || 0) > 0);
        for (const id of used) if (random() >= keep) state.atlas.fragments[id] -= 1;
        return used;
    }
    /** Consumes the map (and its fragments): from here the run owns it — portals, content rooms, drops held until the boss falls. */
    function begin(state, uid, returnZoneId, random = Math.random) {
        const reason = beginReason(state, uid);
        if (reason) return reason;
        const [map] = state.atlas.stash.splice(state.atlas.stash.findIndex(entry => entry.uid === uid), 1);
        startRun(state, map, returnZoneId, random);
        return '';
    }
    function startRun(state, map, returnZoneId, random) {
        const fragments = useFragments(state, random), bonus = bonusOf(state, fragments);
        state.atlas.run = { map, portals: ATLAS.portals + bonus.portals, drops: [], found: [], fragments, bonus,
            encounters: atlasEncounters.roll(bonus, fragments.map(id => FRAGMENTS.get(id).encounter).filter(Boolean), random),
            returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null };
        state.atlas.lastResult = null;
    }
    function pinnacleReason(state) {
        const reason = lockReason(state);
        if (reason) return reason;
        if (state.atlas.run) return '이미 열린 지도가 있습니다. 먼저 마치거나 닫으세요.';
        return hasTickets(state) ? '' : '뿌리 입장권 4종(화염 · 냉기 · 번개 · 카오스)이 하나씩 필요합니다. 지역 수호자가 떨어뜨립니다.';
    }
    /** 정점: 뿌리 입장권 4종을 하나씩 바치고 세계수의 그림자에 들어간다(씨앗마다 2등급 높다). */
    function beginPinnacle(state, returnZoneId, random = Math.random) {
        const reason = pinnacleReason(state);
        if (reason) return reason;
        for (const key of ATLAS.pinnacle.tickets) state.currencies[key] -= 1;
        const map = atlasMaps.create(PINNACLE.id, effectiveTier(state, PINNACLE), 'normal', random);
        map.uid = state.atlas.nextUid++;
        startRun(state, map, returnZoneId, random);
        return '';
    }
    /** The trunk guardian gives whichever ticket the player holds fewest of. */
    function guardianTicket(state, node) {
        if (node.ticket) return node.ticket;
        return ATLAS.pinnacle.tickets.reduce((low, key) => ((state.currencies[key] || 0) < (state.currencies[low] || 0) ? key : low));
    }
    /** What a boss kill beyond ordinary completion earns: a guardian's ticket, the pinnacle's seed and rewards. */
    function bossSpoils(state, node) {
        if (node.kind === 'guardian') return { ticket: guardianTicket(state, node) };
        if (node.kind !== 'pinnacle') return {};
        const seed = state.atlas.seeds < ATLAS.seeds.max;
        if (seed) state.atlas.seeds += 1;
        return { seed, seeds: state.atlas.seeds, rewards: ATLAS.pinnacle.rewards };
    }
    /** Travel failed right after opening: the untouched map (or the pinnacle's tickets) and its fragments go back. */
    function cancel(state) {
        const run = state.atlas.run;
        if (!run) return;
        if (run.map.node === PINNACLE.id) for (const key of ATLAS.pinnacle.tickets) state.currencies[key] += 1;
        else state.atlas.stash.unshift(run.map);
        addFragments(state, run.fragments);
        state.atlas.run = null;
    }
    /** Boss down: completion (and the bonus for a rare map) count once per node; the run's drops go to the stash. */
    function complete(state) {
        const run = state.atlas.run;
        if (!run) return null;
        const id = run.map.node, first = !completed(state, id);
        if (first) state.atlas.completed.push(id);
        const bonus = run.map.rarity === 'rare' && !state.atlas.bonus.includes(id);
        if (bonus) state.atlas.bonus.push(id);
        const stored = store(state, run.drops);
        addFragments(state, run.found);
        state.atlas.run = null;
        state.atlas.lastResult = { nodeId: id, tier: run.map.tier, outcome: 'complete', first, bonus, drops: stored,
            lost: run.drops.length - stored, fragments: run.found.length };
        return { ...state.atlas.lastResult, ...bossSpoils(state, BY_ID.get(id)), returnZoneId: run.returnZoneId };
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
        state.atlas.lastResult = { nodeId: run.map.node, tier: run.map.tier, outcome, first: false, bonus: false, drops: 0,
            lost: run.drops.length, fragments: 0 };
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
    function dropTier(tier, random, bonus) {
        const drops = ATLAS.drops, roll = random(), up = drops.tierUp + bonus.mapTierUp / 100;
        if (roll < up) return tier + 1;
        return roll < up + drops.tierSame ? tier : tier - 1 - Math.floor(random() * 3);
    }
    /** A kill in a map: elites and bosses drop more, item quantity and the sustain passives count; drops wait in the run until the
     * boss falls. Outside the atlas, bosses of chaos 20 and deeper sometimes drop a low map straight to the stash (the way back in). */
    function dropFromKill(state, zone, enemy, random = Math.random) {
        if (!zone || !enemy || lockReason(state)) return [];
        if (zone.type === 'atlasMap' && state.atlas.run) return dropInMap(state, zone, enemy, random);
        return dropOutside(state, zone, enemy, random);
    }
    function dropOutside(state, zone, enemy, random) {
        const drops = ATLAS.drops;
        if (zone.type !== 'abyss' || !enemy.isBoss || !(zone.depth >= drops.outsideDepth) || random() >= drops.outsideBoss) return [];
        const map = rollMap(state, 1 + Math.floor(random() * drops.outsideTier), random, bonusOf(state));
        return map && store(state, [map]) ? [map] : [];
    }
    function dropInMap(state, zone, enemy, random) {
        const run = state.atlas.run, drops = ATLAS.drops, bonus = run.bonus;
        const base = enemy.isBoss ? 1 : (enemy.isElite ? drops.elite : drops.regular);
        const chance = base * (1 + zone.atlasLootQuantity / 100) * (1 + bonus.mapDrop / 100);
        const extra = Number(!!enemy.isBoss && random() < drops.bossExtra + bonus.bossMap / 100);
        const count = Math.floor(chance) + Number(random() < chance % 1) + extra;
        const maps = Array.from({ length: count }, () => rollMap(state, dropTier(run.map.tier, random, bonus), random, bonus)).filter(Boolean);
        if (enemy.isBoss) maps.push(...guardianDrop(state, BY_ID.get(run.map.node), random, bonus));
        run.drops.push(...maps.slice(0, Math.max(0, ATLAS.stashCap - run.drops.length)));
        return maps;
    }
    /** One more map for the run (an emptied content room's find). */
    function extraMap(state, random = Math.random) {
        const run = state.atlas.run, map = run && rollMap(state, run.map.tier, random, run.bonus);
        if (map && run.drops.length < ATLAS.stashCap) run.drops.push(map);
        return map ? [map] : [];
    }
    /** Elites and bosses in a map sometimes drop a fragment; like maps it waits in the run until the boss falls. */
    function fragmentFromKill(state, zone, enemy, random = Math.random) {
        const run = state.atlas.run;
        if (!run || !zone || zone.type !== 'atlasMap') return [];
        const rules = ATLAS.fragmentRules, base = enemy.isBoss ? rules.boss : (enemy.isElite ? rules.elite : 0);
        if (random() >= base * (1 + run.bonus.fragmentDrop / 100)) return [];
        const id = ATLAS.fragments[Math.floor(random() * ATLAS.fragments.length)].id;
        run.found.push(id);
        return [id];
    }

    // ---------------------------------------------------------------- the combat zone of the open map
    const equivalentDepth = tier => ATLAS.difficulty.baseDepth + (tier - 1) * ATLAS.difficulty.depthPerTier;
    const sizeFor = tier => 1 + ATLAS.sizeBands.filter(band => tier >= band).length;
    /** The zone getZone(ATLAS.zoneId) returns while a map is open (memoized per run: its map and bonus never change). */
    function zone(state) {
        const run = state.atlas && state.atlas.run;
        if (!run) return null;
        if (!zones.has(run)) zones.set(run, buildZone(run));
        return zones.get(run);
    }
    const BOSS_RULES = { map: { hpMul: 1, damageMul: 1, stages: 1 }, guardian: { ...ATLAS.guardianRules, stages: 1 }, pinnacle: ATLAS.pinnacle };
    function buildZone(run) {
        const { map, bonus } = run, node = BY_ID.get(map.node), fx = atlasMaps.effects(map), depth = equivalentDepth(map.tier);
        const more = key => 1 + bonus[key] / 100, boss = BOSS_RULES[node.kind];
        return {
            id: ATLAS.zoneId, name: node.name, type: 'atlasMap', tier: getAbyssZoneTier(depth), maxKills: 1, ele: node.ele,
            areaLevel: ATLAS.areaLevel.base + (map.tier - 1) * ATLAS.areaLevel.perTier,
            // 루프 인플레이션 대신 등급이 정한 고정 루프 · 깊이 (combat getLoopDifficultyInputs · state getAbyssMonsterScales).
            fixedSeason: depth - ATLAS.difficulty.loopBehindDepth, equivalentDepth: depth, equivalentChaosDepth: depth,
            mapHpMul: fx.hp * more('monsterLife'), mapDamageMul: fx.damage * more('monsterDamage'),
            bossMods: { hpMul: fx.bossHp * more('bossLife') * boss.hpMul, damageMul: fx.bossDamage * more('bossLife') * boss.damageMul },
            trialHazard: fx.hazard ? { ...ATLAS.burningGround } : undefined,
            atlasNode: node.id, atlasTier: map.tier, atlasMapRarity: map.rarity, atlasEnemyMods: fx.enemy, atlasEncounters: run.encounters,
            atlasLootQuantity: fx.quantity + bonus.quantity, atlasLootRarity: fx.rarity + bonus.rarity, atlasBossRarity: bonus.bossRarity,
            atlasPackExtra: fx.packExtra + bonus.packSize, atlasExtraElite: fx.extraElite + bonus.extraElite / 100,
            atlasSeed: map.uid, bossName: node.boss, bossAct: node.bossAct,
            atlasKind: node.kind,
            exploration: { style: node.style, biome: node.biome, size: sizeFor(map.tier), seed: `atlas:${map.uid}`, bossStages: boss.stages }
        };
    }
    /** What a stash map would be with the current passives and loadout (the device card). */
    const preview = (state, map) => buildZone({ map, bonus: bonusOf(state, state.atlas.loadout.filter(id => (state.atlas.fragments[id] || 0) > 0)), encounters: [] });
    /** Equipment base tier from the map tier: T15 at 1~3등급, one more every three tiers, T20 at 16등급. */
    const lootTier = tier => Math.min(20, 14 + Math.ceil(tier / 3));

    // ---------------------------------------------------------------- save boundary and the loop
    const fragmentIds = (value, limit) => (Array.isArray(value) ? value : []).filter(id => FRAGMENTS.has(id)).slice(0, limit);
    function normalizeBonus(raw) {
        const bonus = ZERO();
        for (const key of Object.keys(bonus)) {
            const value = Number(raw && raw[key]);
            bonus[key] = Number.isFinite(value) ? Math.max(0, Math.min(1000, value)) : 0;
        }
        return bonus;
    }
    function normalizeRun(raw, validMap) {
        const map = raw && validMap(raw.map);
        if (!map) return null;
        const bonus = normalizeBonus(raw.bonus), portals = Math.floor(Number(raw.portals));
        return { map, portals: portals >= 1 && portals <= ATLAS.portals + bonus.portals ? portals : 1,
            drops: (Array.isArray(raw.drops) ? raw.drops : []).map(validMap).filter(Boolean).slice(0, ATLAS.stashCap),
            found: fragmentIds(raw.found, 50), fragments: fragmentIds(raw.fragments, 3), bonus,
            encounters: [...new Set(Array.isArray(raw.encounters) ? raw.encounters : [])].filter(type => ATLAS.encounters[type]),
            returnZoneId: Number.isInteger(raw.returnZoneId) && raw.returnZoneId >= 0 ? raw.returnZoneId : null };
    }
    function normalizeResult(raw) {
        if (!raw || !BY_ID.has(raw.nodeId) || !['complete', 'failed'].includes(raw.outcome)) return null;
        const count = value => Math.max(0, Math.min(ATLAS.stashCap, Math.floor(Number(value) || 0)));
        return { nodeId: raw.nodeId, tier: Math.max(1, Math.min(ATLAS.tierCap, Math.floor(Number(raw.tier) || 1))), outcome: raw.outcome,
            first: raw.first === true, bonus: raw.bonus === true, drops: count(raw.drops), lost: count(raw.lost), fragments: count(raw.fragments) };
    }
    function normalizeFragments(raw) {
        const counts = {};
        for (const id of FRAGMENTS.keys()) {
            const value = Math.floor(Number(raw && raw[id]));
            if (value > 0) counts[id] = Math.min(ATLAS.fragmentRules.cap, value);
        }
        return counts;
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
        const done = nodeList(raw.completed, () => true), bonus = nodeList(raw.bonus, id => done.includes(id)), run = normalizeRun(raw.run, validMap);
        const next = { ...defaults(), unlocked: raw.unlocked === true || journeyUnlocked, completed: done, bonus,
            passives: atlasPassives.normalize(raw.passives, done.length + bonus.length),
            stash: (Array.isArray(raw.stash) ? raw.stash : []).map(validMap).filter(map => map && map.node !== PINNACLE.id).slice(0, ATLAS.stashCap),
            fragments: normalizeFragments(raw.fragments), run, lastResult: normalizeResult(raw.lastResult),
            seeds: Math.max(0, Math.min(ATLAS.seeds.max, Math.floor(Number(raw.seeds) || 0))),
            autoMap: raw.autoMap === true, starterSeason: Math.max(0, Math.floor(Number(raw.starterSeason) || 0)) };
        next.nextUid = Math.max(Math.floor(Number(raw.nextUid) || 1), ...[...uids].map(uid => uid + 1), 1);
        state.atlas = next;
        setLoadout(state, Array.isArray(raw.loadout) ? raw.loadout : []);
        return next;
    }
    function onLoopReset(state) {
        Object.assign(state.atlas, { stash: [], fragments: {}, run: null, lastResult: null });
    }
    function travelReason(state, id) {
        return id === ATLAS.zoneId && !state.atlas.run ? '지도 장치에서 지도석을 열어야 들어갈 수 있습니다.' : '';
    }
    return Object.freeze({ nodes: NODES, links: LINKS, node: id => BY_ID.get(id) || null, neighbours: id => NEIGHBOURS.get(id) || [],
        fragment: id => FRAGMENTS.get(id) || null, pinnacle: PINNACLE, position, polar, defaults, lockReason, status, reachable, points, bestTier, sync,
        effectiveTier, hasTickets, pinnacleReason, beginPinnacle,
        slots, setLoadout, beginReason, begin, cancel, complete, usePortal, close, nextAuto, dropFromKill, extraMap, fragmentFromKill,
        zone, preview, lootTier, equivalentDepth, normalize, onLoopReset, travelReason,
        inMap: state => state.currentZoneId === ATLAS.zoneId });
})();
safeExposeGlobals({ atlas });
