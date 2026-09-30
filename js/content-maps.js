/** 콘텐츠별 맵 디자인 (docs/atlas-endgame-20260930.md 4절): 구역 팩토리(getZone)가 붙이는 탐험 맵 명세 — 스타일 · 바이옴 ·
 * 크기 · 시드 · 보스 단계만 정한다. 맵 모양은 js/exploration-layouts.js가, 런은 넓은 맵 탐험 엔진(js/act-exploration-*.js)이 맡는다.
 * 런은 시작할 때 명세를 저장하므로 뒤에 시드 재료가 바뀌어도 걷던 맵은 그대로다(새 런마다 새 맵).
 * packExtra는 방마다 무리에 더하는 몬스터 수(기본 3마리 + packExtra, 3×3까지): 판에서 수십 마리였던 콘텐츠는 방을 촘촘히 채운다.
 */
const contentMaps = (() => {
    /** Seed material: the loop, the content step (floor, tier …) and the enemy id counter — it moves every encounter, so
     * walking the same floor again opens a different path ("no corridor was ever the same"). */
    function runSeed(state, tag, step) { return `${tag}:${state.season || 1}:${step}:${state.nextEnemyId || 0}`; }
    const sizeBy = (value, bands) => 1 + bands.filter(limit => value >= limit).length;
    const spec = (style, biome, size, seed, bossStages = 1) => ({ style, biome, size, seed, bossStages });

    /** 고대 미궁: 층마다 새로 짜이는 미로. 10층부터 넓어지고 40층부터 가장 크다. */
    function labyrinth(floor, state = game) {
        return spec('maze', 'maze', sizeBy(floor, [10, 40]), runSeed(state, 'lab', floor));
    }
    /** 혼돈 1~20 · 심화: 뿌리를 따라 내려가는 하강 갱도. 깊을수록 커지고, 방마다 촘촘한 무리(심화는 더 촘촘). */
    function chaos(depth, state = game) {
        return { exploration: spec('descent', 'root', sizeBy(depth, [8, 15]), runSeed(state, 'chaos', depth)), packExtra: depth > 20 ? 4 : 3 };
    }
    /** 혼돈계: 공허에 뜬 폐허 섬 — 정예 섬들을 지나 보스 섬으로. 층이 오를수록 섬이 늘어난다. */
    function chaosRealm(floor, state = game) {
        return { exploration: spec('islands', 'ruins', sizeBy(floor, [10, 30]), runSeed(state, 'realm', floor)), packExtra: 2 };
    }
    /** 창공의 탑: 떠 있는 발판과 다리, 꼭대기의 보스. 긴 층은 섬이 많다. */
    function skyTower(floor, state = game) {
        return { exploration: spec('islands', 'aerial', sizeBy(floor, [10, 25]), runSeed(state, 'sky', floor)), packExtra: 1 };
    }
    /** 지하계: 짧은 갱도와 광석 방, 맨 아래 보스 동굴(생명력 흡수 · 중력은 그대로 지하계 규칙). */
    function underworld(floor, state = game) {
        return { exploration: spec('descent', 'trunk', sizeBy(floor, [15]), runSeed(state, 'under', floor)), packExtra: 2 };
    }
    /** 시간의 균열: 같은 시간압이면 과거와 미래가 같은 방 배치를 걷는다 — 과거는 폐허, 미래는 성소로 보인다. */
    function timeRift(phase, pressure, state = game) {
        const seed = `rift:${state.season || 1}:${pressure}`;
        return { exploration: spec('rooms', phase === 'past' ? 'ruins' : 'sanctum', sizeBy(pressure, [4, 8]), seed), packExtra: 2 };
    }
    /** 보스 투기장(전직 시련 · 강대한 적 · 정점 · 운석): 보스만 서는 방. 같은 보스는 같은 투기장. */
    function arena(id, biome = 'sanctum') {
        return spec('arena', biome, 1, `arena:${id}`);
    }
    const TRACK_BIOMES = Object.freeze({ underworld: 'root', sky: 'aerial', ocean: 'courtyard', convergence: 'sanctum' });
    /** Where a boss zone's arena stands: a pinnacle in its realm's look, rivals among ruins, root bosses in the trunk. */
    function bossBiome(zone) {
        if (zone.pinnacleTrack) return TRACK_BIOMES[zone.pinnacleTrack] || 'sanctum';
        return zone.rivalBlade ? 'ruins' : (zone.cosmosCapstone ? 'sanctum' : 'trunk');
    }
    /** A data-defined boss zone with its arena attached (a copy — the data row stays untouched). */
    const withArena = (zone, biome) => (zone ? { ...zone, exploration: arena(zone.id, biome) } : zone);
    /** 전직 시련: 함정이 번지는 연속 방 — 정예가 이끄는 방들을 지나 시련의 수호자에게(판의 정예 두 무리 → 보스와 같은 흐름). */
    const trialCorridor = zone => (zone ? { ...zone, exploration: spec('gauntlet', 'sanctum', 1, `trial:${zone.id}`) } : zone);
    return Object.freeze({ labyrinth, chaos, chaosRealm, skyTower, underworld, timeRift, arena, withArena, trialCorridor, bossBiome });
})();
safeExposeGlobals({ contentMaps });
