/** 콘텐츠별 넓은 맵 (docs/atlas-pinnacles-20261002.md 1절, 2026-10-02 간소화): 구역 팩토리(getZone)가 붙이는 탐험 맵 명세.
 * 예전의 생성 미로 · 섬 · 갱도(임시 그림) 대신 그림이 완성된 액트 지도 10장을 콘텐츠 분위기에 맞춰 돌려 쓴다
 * (js/exploration-layouts.js). 보스만 서는 콘텐츠는 그 액트 지도의 보스 방 앞에서 시작한다(arena).
 * 런은 시작할 때 명세를 저장하므로 뒤에 층 · 깊이가 바뀌어도 걷던 맵은 그대로다.
 * packExtra는 방마다 무리에 더하는 몬스터 수(기본 3마리 + packExtra, 3×3까지): 판에서 수십 마리였던 콘텐츠는 방을 촘촘히 채운다.
 */
const contentMaps = (() => {
    /** Seed material: the loop, the content step (floor, tier …) and the enemy id counter (packs differ run to run). */
    function runSeed(state, tag, step) { return `${tag}:${state.season || 1}:${step}:${state.nextEnemyId || 0}`; }
    const spec = (act, seed, arena = false) => (arena ? { style: 'act', act, seed, arena: true } : { style: 'act', act, seed });
    /** The act map for the n-th step (1-based) of a content that walks a cycle of maps. */
    const cycle = (acts, step) => acts[(Math.max(1, Math.floor(Number(step) || 1)) - 1) % acts.length];
    // 바탕 이름 → 그 바탕으로 그린 액트 지도(1 뿌리 동굴 성소 · 2 생울타리 중정 · 3 허공 위 섬과 널다리 · 4 책장 미궁 · 5 갈색 신전과 검은 물 ·
    // 6 무너진 중정 · 7 줄기 속 널 · 8 허공 위 보라 섬 · 9 꽃덤불 · 10 별 뜬 허공 위 흑요석).
    const ACT_BY_BIOME = Object.freeze({ root: 1, courtyard: 2, aerial: 3, maze: 4, sanctum: 5, ruins: 6, trunk: 7, veil: 8, canopy: 9, crown: 10 });
    const actForBiome = biome => ACT_BY_BIOME[biome] || ACT_BY_BIOME.sanctum;
    // 콘텐츠마다 도는 지도: 혼돈은 열 장 모두, 나머지는 그 콘텐츠의 분위기.
    const CHAOS_ACTS = Object.freeze([1, 7, 3, 5, 8, 6, 4, 2, 9, 10]);
    const REALM_ACTS = Object.freeze([6, 10, 8]), SKY_ACTS = Object.freeze([3, 8, 10]), UNDER_ACTS = Object.freeze([7, 1, 5]);
    const LABYRINTH_ACTS = Object.freeze([4, 7]);

    /** 고대 미궁: 책장 미궁과 줄기 속 나선이 층마다 번갈아 선다. */
    function labyrinth(floor, state = game) {
        return spec(cycle(LABYRINTH_ACTS, floor), runSeed(state, 'lab', floor));
    }
    /** 혼돈 1~20 · 심화: 깊이마다 다음 액트 지도로 내려간다. 방마다 촘촘한 무리(심화는 더 촘촘). */
    function chaos(depth, state = game) {
        return { exploration: spec(cycle(CHAOS_ACTS, depth), runSeed(state, 'chaos', depth)), packExtra: depth > 20 ? 4 : 3 };
    }
    /** 혼돈계: 무너진 중정 · 별 뜬 허공 · 보라 섬을 층마다 돈다. */
    function chaosRealm(floor, state = game) {
        return { exploration: spec(cycle(REALM_ACTS, floor), runSeed(state, 'realm', floor)), packExtra: 2 };
    }
    /** 창공의 탑: 허공 위 섬들(널다리 · 보라 섬 · 별 뜬 흑요석)을 층마다 돈다. */
    function skyTower(floor, state = game) {
        return { exploration: spec(cycle(SKY_ACTS, floor), runSeed(state, 'sky', floor)), packExtra: 1 };
    }
    /** 지하계: 줄기 속 나선 · 뿌리 동굴 · 검은 물 신전(생명력 흡수 · 중력은 그대로 지하계 규칙). */
    function underworld(floor, state = game) {
        return { exploration: spec(cycle(UNDER_ACTS, floor), runSeed(state, 'under', floor)), packExtra: 2 };
    }
    /** 시간의 균열: 같은 중정의 두 시대 — 과거는 생울타리 중정, 미래는 무너진 중정. */
    function timeRift(phase, pressure, state = game) {
        return { exploration: spec(phase === 'past' ? 2 : 6, `rift:${state.season || 1}:${pressure}`), packExtra: 2 };
    }
    /** 보스 투기장(강대한 적 · 정점 · 운석 · 아틀라스 수호자 · 정점): 바탕에 맞는 액트 지도의 보스 방 앞에서 시작한다. */
    function arena(id, biome = 'sanctum') {
        return spec(actForBiome(biome), `arena:${id}`, true);
    }
    const TRACK_BIOMES = Object.freeze({ underworld: 'root', sky: 'aerial', ocean: 'courtyard', convergence: 'sanctum' });
    /** Where a boss zone's arena stands: a pinnacle in its realm's look, rivals among ruins, root bosses in the trunk. */
    function bossBiome(zone) {
        if (zone.pinnacleTrack) return TRACK_BIOMES[zone.pinnacleTrack] || 'sanctum';
        return zone.rivalBlade ? 'ruins' : (zone.cosmosCapstone ? 'sanctum' : 'trunk');
    }
    /** A data-defined boss zone with its arena attached (a copy — the data row stays untouched). A board fight (Cerberus's three
     * phases of heads and body) keeps the 9×8 board. */
    const withArena = (zone, biome) => (zone && !zone.boardFight ? { ...zone, exploration: arena(zone.id, biome) } : zone);
    // 전직 시련: 함정이 번지는 방들을 지나 시련의 수호자에게. 2026-10-06(사용자 요청 "아직 없는 맵 디자인(시련 등)"): 액트 지도를
    // 빌리지 않고 시련마다 따로 짠 지도(data CONTENT_EXPLORATION_MAPS)를 걷는다.
    const TRIAL_MAPS = Object.freeze({ trial_1: 'trial-blades', trial_2: 'trial-triad', trial_3: 'trial-miasma', trial_4: 'trial-crossing', trial_5: 'trial-winter' });
    const trialCorridor = zone => (zone ? { ...zone, exploration: { style: 'map', id: TRIAL_MAPS[zone.id] || 'trial-blades', seed: `trial:${zone.id}` } } : zone);
    return Object.freeze({ labyrinth, chaos, chaosRealm, skyTower, underworld, timeRift, arena, withArena, trialCorridor, bossBiome, actForBiome });
})();
safeExposeGlobals({ contentMaps });
