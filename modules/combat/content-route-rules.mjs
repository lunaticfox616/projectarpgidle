// Content route choices take explicit state; seeds, map cycles and monster counts retain their existing definitions.
function contentRunSeed(state, tag, step) { return `${tag}:${state.season || 1}:${step}:${state.nextEnemyId || 0}`; }

const contentSpec = (act, seed, arena = false) => (arena ? { style: 'act', act, seed, arena: true } : { style: 'act', act, seed });

/** The act map for the n-th step (1-based) of a content that walks a cycle of maps. */
const contentCycle = (acts, step) => acts[(Math.max(1, Math.floor(Number(step) || 1)) - 1) % acts.length];

// 바탕 이름 → 그 바탕으로 그린 액트 지도(1 뿌리 동굴 성소 · 2 생울타리 중정 · 3 허공 위 섬과 널다리 · 4 책장 미궁 · 5 갈색 신전과 검은 물 ·
    // 6 무너진 중정 · 7 줄기 속 널 · 8 허공 위 보라 섬 · 9 꽃덤불 · 10 별 뜬 허공 위 흑요석).
const ACT_BY_BIOME = Object.freeze({ root: 1, courtyard: 2, aerial: 3, maze: 4, sanctum: 5, ruins: 6, trunk: 7, veil: 8, canopy: 9, crown: 10 });

const contentActForBiome = biome => ACT_BY_BIOME[biome] || ACT_BY_BIOME.sanctum;

// 콘텐츠마다 도는 지도: 혼돈은 열 장 모두, 나머지는 그 콘텐츠의 분위기.
const CHAOS_ACTS = Object.freeze([1, 7, 3, 5, 8, 6, 4, 2, 9, 10]);

const REALM_ACTS = Object.freeze([6, 10, 8]), SKY_ACTS = Object.freeze([3, 8, 10]), UNDER_ACTS = Object.freeze([7, 1, 5]);

const LABYRINTH_ACTS = Object.freeze([4, 7]);

/** 고대 미궁: 책장 미궁과 줄기 속 나선이 층마다 번갈아 선다. */
function contentLabyrinth(floor, state) {
    return contentSpec(contentCycle(LABYRINTH_ACTS, floor), contentRunSeed(state, 'lab', floor));
}

/** 혼돈 1~20 · 심화: 깊이마다 다음 액트 지도로 내려간다. 방마다 촘촘한 무리(심화는 더 촘촘). */
function contentChaos(depth, state) {
    return { exploration: contentSpec(contentCycle(CHAOS_ACTS, depth), contentRunSeed(state, 'chaos', depth)), packExtra: depth > 20 ? 4 : 3 };
}

/** 혼돈계: 무너진 중정 · 별 뜬 허공 · 보라 섬을 층마다 돈다. */
function contentChaosRealm(floor, state) {
    return { exploration: contentSpec(contentCycle(REALM_ACTS, floor), contentRunSeed(state, 'realm', floor)), packExtra: 2 };
}

/** 창공의 탑: 허공 위 섬들(널다리 · 보라 섬 · 별 뜬 흑요석)을 층마다 돈다. */
function contentSkyTower(floor, state) {
    return { exploration: contentSpec(contentCycle(SKY_ACTS, floor), contentRunSeed(state, 'sky', floor)), packExtra: 1 };
}

/** 지하계: 줄기 속 나선 · 뿌리 동굴 · 검은 물 신전(생명력 흡수 · 중력은 그대로 지하계 규칙). */
function contentUnderworld(floor, state) {
    return { exploration: contentSpec(contentCycle(UNDER_ACTS, floor), contentRunSeed(state, 'under', floor)), packExtra: 2 };
}

/** 시간의 균열: 같은 중정의 두 시대 — 과거는 생울타리 중정, 미래는 무너진 중정. */
function contentTimeRift(phase, pressure, state) {
    return { exploration: contentSpec(phase === 'past' ? 2 : 6, `rift:${state.season || 1}:${pressure}`), packExtra: 2 };
}

/** 보스 투기장(강대한 적 · 정점 · 운석 · 아틀라스 수호자 · 정점): 바탕에 맞는 액트 지도의 보스 방 앞에서 시작한다. */
function contentArena(id, biome = 'sanctum') {
    return contentSpec(contentActForBiome(biome), `arena:${id}`, true);
}

/** 벌집 원정의 전용 지도(2026-10-13 사용자: "벌집전용지도 만들던가"): 입구, 갈림길마다의 벌집 방 열, 여왕의 방이 한 줄로 이어진다.
     * 방 단위 무대에서만 쓴다(js/state.js createBeehiveZone: 그 밖에서는 판에서 싸운다). 바탕은 방이 꼭 열둘인 액트 10의 지도다. */
const HIVE_ACT = 10;

function contentHive(state) {
    return { style: 'act', act: HIVE_ACT, seed: `hive:${state.season || 1}`, chain: true };
}

const TRACK_BIOMES = Object.freeze({ underworld: 'root', sky: 'aerial', ocean: 'courtyard', convergence: 'sanctum' });

/** Where a boss zone's arena stands: a pinnacle in its realm's look, rivals among ruins, root bosses in the trunk. */
function contentBossBiome(zone) {
    if (zone.pinnacleTrack) return TRACK_BIOMES[zone.pinnacleTrack] || 'sanctum';
    return zone.rivalBlade ? 'ruins' : (zone.cosmosCapstone ? 'sanctum' : 'trunk');
}

/** A data-defined boss zone with its arena attached (a copy — the data row stays untouched). A row with bossStages (Cerberus's
     * three phases of heads and body) has its boss rise that many times in the arena. */
const contentWithArena = (zone, biome) => (zone ? { ...zone, exploration: zone.bossStages ? { ...contentArena(zone.id, biome), bossStages: zone.bossStages } : contentArena(zone.id, biome) } : zone);

// 전직 시련: 함정이 번지는 방들을 지나 시련의 수호자에게. 2026-10-06(사용자 요청 "아직 없는 맵 디자인(시련 등)"): 액트 지도를
    // 빌리지 않고 시련마다 따로 짠 지도(data CONTENT_EXPLORATION_MAPS)를 걷는다.
const TRIAL_MAPS = Object.freeze({ trial_1: 'trial-blades', trial_2: 'trial-triad', trial_3: 'trial-miasma', trial_4: 'trial-crossing', trial_5: 'trial-winter' });

const contentTrialCorridor = zone => (zone ? { ...zone, exploration: { style: 'map', id: TRIAL_MAPS[zone.id] || 'trial-blades', seed: `trial:${zone.id}` } } : zone);
export { contentLabyrinth, contentChaos, contentChaosRealm, contentSkyTower, contentUnderworld, contentTimeRift, contentArena, contentWithArena, contentTrialCorridor, contentBossBiome, contentActForBiome, contentHive };
