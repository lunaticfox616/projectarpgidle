

export function recordKeepIncidentCounts(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

export function recordCreateDefaultRecordsState(env, now) {
    return {
        version: env.RECORDS_VERSION,
        startedAt: now,
        currentLoop: null,
        loops: [],
        actBest: {},
        echo: { bestDps: 0, bestDamage: 0, runs: 0, lastAt: 0, last: null, previous: null },
        best: {},
        clearedFloorBests: true,
        clearedColonyBests: true,
        incidents: {}
    };
}

/** 층 기록이 다음에 열린 층이던 저장(clearedFloorBests)과 군락지 기록이 들어선 웨이브이던 저장(clearedColonyBests)을 한 번씩 낮춘다.
 * 표식은 예전 판이 지우지 않아, 판을 오가도 두 번 낮추지 않는다. */
export function recordKeepClearedBests(env, records) {
    recordLowerBestsOnce(records, 'clearedFloorBests', env.RECORD_CLEARED_FLOOR_KEYS);
    recordLowerBestsOnce(records, 'clearedColonyBests', ['colonyWave']);
}

export function recordLowerBestsOnce(records, flag, keys) {
    if (records[flag] === true) return;
    keys.forEach(key => {
        if (records.best[key] !== undefined) records.best[key] = Math.max(0, recordToPositiveInt(records.best[key]) - 1);
    });
    records[flag] = true;
}

export function recordToPositiveInt(value) {
    let num = Math.floor(Number(value) || 0);
    return num > 0 ? num : 0;
}

/** @returns {{damage:number,dps:number,seconds:number}|null} Recent measurement, or null for older/invalid records. */
export function recordNormalizeEchoMeasurement(raw) {
    if (!raw || !Number.isFinite(raw.damage) || raw.damage < 0 || !Number.isFinite(raw.seconds) || raw.seconds <= 0 || raw.seconds > 30) return null;
    const damage = Math.floor(raw.damage);
    const dps = damage / raw.seconds;
    return Number.isFinite(dps) ? { damage, seconds: raw.seconds, dps } : null;
}

export function recordEnsureRecordsState(env, state) {
    let g = state;
    if (!g) return recordCreateDefaultRecordsState(env, env.deps.clockNow());
    let now = env.deps.clockNow();
    if (!g.records || typeof g.records !== 'object') g.records = recordCreateDefaultRecordsState(env, now);
    let r = g.records;
    r.version = env.RECORDS_VERSION;
    r.startedAt = recordToPositiveInt(r.startedAt) || now;
    recordRestoreCollections(env, r);
    recordRestoreEcho(r);
    recordRestoreCurrentLoop(r, g, now);
    return r;
}

function recordRestoreCollections(env, r) {
    r.loops = Array.isArray(r.loops) ? r.loops.filter(row => row && typeof row === 'object') : [];
    r.actBest = (r.actBest && typeof r.actBest === 'object') ? r.actBest : {};
    r.best = (r.best && typeof r.best === 'object') ? r.best : {};
    // 잔잔한 사건을 겪은 횟수(recordIncident): 매 틱 부르므로 모양만 지킨다. 값은 셀 때와 읽을 때(getRecordsView) 0 이상의 정수로 읽는다.
    r.incidents = recordKeepIncidentCounts(r.incidents);
    recordKeepClearedBests(env, r);
}

function recordRestoreEcho(r) {
    r.echo = (r.echo && typeof r.echo === 'object') ? r.echo : { bestDps: 0, bestDamage: 0, runs: 0, lastAt: 0 };
    r.echo.bestDps = Math.max(0, Number(r.echo.bestDps) || 0);
    r.echo.bestDamage = Math.max(0, Number(r.echo.bestDamage) || 0);
    r.echo.runs = recordToPositiveInt(r.echo.runs);
    r.echo.lastAt = recordToPositiveInt(r.echo.lastAt);
    r.echo.last = recordNormalizeEchoMeasurement(r.echo.last);
    r.echo.previous = recordNormalizeEchoMeasurement(r.echo.previous);
}

function recordRestoreCurrentLoop(r, g, now) {
    if (r.currentLoop && typeof r.currentLoop === 'object') {
        r.currentLoop.startedAt = recordToPositiveInt(r.currentLoop.startedAt) || now;
        r.currentLoop.actClears = (r.currentLoop.actClears && typeof r.currentLoop.actClears === 'object')
            ? r.currentLoop.actClears : {};
        r.currentLoop.activeMs = Math.max(0, Math.floor(Number(r.currentLoop.activeMs) || 0));
        // 기준점은 여기서 되돌리지 않는다. ensureRecordsState는 매 틱 호출되므로 되돌리면
        // 델타가 항상 0이 된다. 불러온 직후의 큰 간격은 RECORDS_ACTIVE_TICK_MAX_MS 상한이
        // 걸러 주므로 값만 정규화한다.
        r.currentLoop.lastTickAt = recordToPositiveInt(r.currentLoop.lastTickAt);
    } else {
        // 진행 중인 루프 기록이 없으면 지금부터 센다(기존 세이브의 첫 진입 경로).
        r.currentLoop = { loop: Math.max(1, Math.floor((g.season || 1))), startedAt: now, activeMs: 0, lastTickAt: now, actClears: {} };
    }
}

// ── 최고 기록 적립 ──────────────────────────────────────────────────
// The chaos depth starts at 20, so 20 is no progress (floor records keep the floor cleared: 0 is none).
// Filter a copy so reading a legacy record never rewrites the save.
export function recordGetAchievedRecordBests(best) {
    const baselines = { abyssDepth: 20 };
    return Object.fromEntries(Object.entries(best).filter(([key, value]) => recordToPositiveInt(value) > (baselines[key] || 0)));
}

// 루프 정산이 초기화하는 값(군락지 파도 등)이 있으므로, 현재값을 주기적으로 훑어
// 역대 최고를 단조 증가로 남긴다. 값을 읽기만 하고 원본은 건드리지 않는다.
export function recordGetRecordBestSources(env, g) {
    let chaosRealm = (g.chaosRealm && typeof g.chaosRealm === 'object') ? g.chaosRealm : {};
    let underworld = (g.underworldProgress && typeof g.underworldProgress === 'object') ? g.underworldProgress : {};
    let ocean = (g.ocean && typeof g.ocean === 'object') ? g.ocean : {};
    return recordGetAchievedRecordBests({
        actZone: recordToPositiveInt(g.maxZoneId),
        level: recordToPositiveInt(g.level),
        loop: Math.max(1, Math.floor(g.season || 1)),
        abyssDepth: recordToPositiveInt(g.abyssEndlessDepth),
        // 층 콘텐츠는 다음에 열린 층을 들고 있어(돌파 층 + 1) 하나 뺀다.
        labyrinthFloor: Math.max(0, recordToPositiveInt(g.labyrinthUnlockedMaxFloor || g.labyrinthFloor) - 1),
        chaosRealmFloor: Math.max(0, recordToPositiveInt(chaosRealm.highestFloor) - 1),
        skyFloor: env.deps.getClearedSkyTowerFloor(g),
        underworldFloor: Math.max(0, recordToPositiveInt(underworld.highestFloor) - 1),
        oceanBoundary: Math.max(recordToPositiveInt(ocean.depthM), recordToPositiveInt(ocean.checkpointM)),
        // 군락지는 들어선 웨이브를 들고 있어(깬 웨이브 + 1) 하나 뺀다.
        colonyWave: recordCompletedColonyWave(g)
    });
}

function recordCompletedColonyWave(g) {
    const colony = (g.colony && typeof g.colony === 'object') ? g.colony : {};
    return Math.max(0, Math.max(recordToPositiveInt(colony.highestWave), recordToPositiveInt(colony.wave)) - 1);
}

// 실제 경과(벽시계)와 활동 시간을 나눠 센다.
//
// 방치형은 자리를 비운 동안 게임이 그만큼 진행되지 않는다. 복귀 정산은 실제 경과의 일부(효율 30~75%)만,
// 그것도 한도(3~24시간)까지만 시뮬레이션한다(js/away-settlement-ui.js calculateBackgroundProgressMs, data/offline-progress.js).
// 그래서 벽시계로 잰 "루프 소요 시간"은 사실상 "얼마나 자리를 안 비웠나"를 재게 되어
// 루프끼리 비교하는 의미가 사라진다. 틱이 실제로 돈 시간만 따로 적립해 비교에 쓴다.
// 전투 시계가 있는 저장은 실제로 실행한 틱 시간만 적립한다.
export function recordTickRecordActiveTime(env, records, now = env.deps.clockNow()) {
    let last = Math.floor(Number(records.currentLoop.lastTickAt) || 0) || now;
    let delta = now - last;
    if (delta > 0 && delta <= env.RECORDS_ACTIVE_TICK_MAX_MS) {
        records.currentLoop.activeMs = Math.max(0, Math.floor(records.currentLoop.activeMs || 0)) + delta;
    }
    records.currentLoop.lastTickAt = now;
}

// 매 틱 호출된다. 최댓값 비교와 시간 적립만 하므로 비용은 무시할 수 있다.
export function recordTrackRecordBests(env, state) {
    let g = state;
    if (!g) return null;
    let r = recordEnsureRecordsState(env, g);
    recordTickRecordActiveTime(env, r, g.combatTimeMs || env.deps.clockNow());
    let sources = recordGetRecordBestSources(env, g);
    Object.keys(sources).forEach(key => {
        let next = sources[key];
        if (next > recordToPositiveInt(r.best[key])) r.best[key] = next;
    });
    return r.best;
}

// ── 액트 돌파 시간 ──────────────────────────────────────────────────
// 이번 루프의 "활동 시간" 기준으로 남긴다. 벽시계로 재면 자리를 비운 시간이 그대로
// 섞여 루프끼리 비교가 무의미해진다.
export function recordRecordActClear(env, zoneId, state) {
    let g = state;
    if (!g) return;
    let id = Math.floor(Number(zoneId));
    if (!Number.isFinite(id) || id < 0) return;
    let r = recordEnsureRecordsState(env, g);
    if (r.currentLoop.actClears[id] !== undefined) return; // 루프당 첫 돌파만 남긴다.
    let elapsed = Math.max(0, Math.floor(r.currentLoop.activeMs || 0));
    r.currentLoop.actClears[id] = elapsed;
    let best = recordToPositiveInt(r.actBest[id]);
    if (!best || elapsed < best) r.actBest[id] = elapsed;
}

// ── 나무꾼의 잔상 ───────────────────────────────────────────────────
// 잔상은 이미 자체 최고 DPS를 들고 있지만 그건 현재 판 상태다. 전적에는 시도 횟수와
// 마지막 측정 시각까지 남겨, 빌드를 바꿔가며 잰 흐름을 볼 수 있게 한다.
export function recordRecordWoodsmanEchoRun(env, totalDamage, dps, state, seconds = 30) {
    let g = state;
    if (!g) return;
    let r = recordEnsureRecordsState(env, g);
    r.echo.previous = r.echo.last;
    r.echo.last = recordNormalizeEchoMeasurement({ damage: totalDamage, seconds });
    r.echo.runs = recordToPositiveInt(r.echo.runs) + 1;
    r.echo.lastAt = env.deps.clockNow();
    r.echo.bestDps = Math.max(r.echo.bestDps, Math.max(0, Number(dps) || 0));
    r.echo.bestDamage = Math.max(r.echo.bestDamage, Math.max(0, Number(totalDamage) || 0));
}

// ── 잔잔한 사건 ─────────────────────────────────────────────────────
// 금빛 수액 슬라임을 잡았다, 별똥별이 떨어졌다 같은 사건마다 한 번. 루프를 넘겨도 남는다.
export function recordRecordIncident(env, kind, state) {
    let g = state;
    if (!g || !env.deps.ACT_EXPLORATION_INCIDENTS.records.some(([key]) => key === kind)) return;
    let r = recordEnsureRecordsState(env, g);
    r.incidents[kind] = recordToPositiveInt(r.incidents[kind]) + 1;
}

// ── 루프 경계 ───────────────────────────────────────────────────────
// 루프 정산이 상태를 초기화하기 "전에" 호출해야 한다. 그래야 이번 루프의 도달
// 기록(액트·혼돈 깊이)을 그대로 남길 수 있다.
export function recordCloseLoopRecord(env, path, state) {
    let g = state;
    if (!g) return null;
    let r = recordEnsureRecordsState(env, g);
    recordTrackRecordBests(env, g);
    let now = env.deps.clockNow();
    let progress = (g.loopProgressCurrent && typeof g.loopProgressCurrent === 'object') ? g.loopProgressCurrent : {};
    recordTickRecordActiveTime(env, r);
    let row = {
        loop: Math.max(1, Math.floor(r.currentLoop.loop || g.season || 1)),
        // activeMs = 게임이 실제로 굴러간 시간(루프 비교용), durationMs = 벽시계 경과.
        activeMs: Math.max(0, Math.floor(r.currentLoop.activeMs || 0)),
        durationMs: Math.max(0, now - r.currentLoop.startedAt),
        endedAt: now,
        maxZoneId: recordToPositiveInt(g.maxZoneId),
        level: recordToPositiveInt(g.level),
        bestAbyssDepth: recordToPositiveInt(progress.bestAbyssDepth),
        deaths: recordToPositiveInt(g.loopDeaths),
        kills: recordToPositiveInt(g.loopKills),
        path: String(path || 'chaos'),
        actClears: { ...r.currentLoop.actClears }
    };
    r.loops.unshift(row);
    if (r.loops.length > env.RECORDS_LOOP_HISTORY_LIMIT) r.loops.length = env.RECORDS_LOOP_HISTORY_LIMIT;
    r.currentLoop = { loop: row.loop + 1, startedAt: now, activeMs: 0, lastTickAt: now, actClears: {} };
    return row;
}

// ── 화면이 쓰는 읽기 모델 ───────────────────────────────────────────
// UI는 이 결과만 읽는다. 화면이 게임 상태를 직접 훑지 않게 해서, 표시 형식이 바뀌어도
// 기록 규칙은 그대로 두고, 기록 규칙이 바뀌어도 화면은 한 곳만 고치면 되게 한다.
/** Compare two full 30-second measurements only; an early target defeat has a different time window. */
export function recordEchoMeasurementChange(echo) {
    const { last, previous } = echo;
    if (!last || !previous || last.seconds !== 30 || previous.seconds !== 30 || previous.dps <= 0) return null;
    const change = (last.dps / previous.dps - 1) * 100;
    return Number.isFinite(change) ? change : null;
}

export function recordEchoRecordsView(echo) {
    return { ...echo, last: echo.last && { ...echo.last }, previous: echo.previous && { ...echo.previous }, changePct: recordEchoMeasurementChange(echo) };
}

export function recordGetRecordsView(env, state) {
    let g = state;
    if (!g) return null;
    let r = recordEnsureRecordsState(env, g);
    let now = env.deps.clockNow();
    let loops = r.loops.slice();
    // 최단·평균은 활동 시간으로 낸다. 벽시계로 내면 "자리를 덜 비운 루프"가 1등이 된다.
    let finished = loops.filter(row => row && Math.floor(row.activeMs || 0) > 0);
    let fastest = finished.length ? finished.reduce((a, b) => (a.activeMs <= b.activeMs ? a : b)) : null;
    let averageMs = finished.length
        ? Math.round(finished.reduce((sum, row) => sum + Math.floor(row.activeMs || 0), 0) / finished.length)
        : 0;
    return {
        startedAt: r.startedAt,
        trackedForMs: Math.max(0, now - r.startedAt),
        currentLoop: {
            loop: r.currentLoop.loop,
            activeMs: Math.max(0, Math.floor(r.currentLoop.activeMs || 0)),
            elapsedMs: Math.max(0, now - r.currentLoop.startedAt),
            actClears: { ...r.currentLoop.actClears }
        },
        loops,
        loopSummary: {
            count: finished.length,
            fastestMs: fastest ? fastest.activeMs : 0,
            fastestLoop: fastest ? fastest.loop : 0,
            averageMs
        },
        actBest: { ...r.actBest },
        echo: recordEchoRecordsView(r.echo),
        best: recordGetAchievedRecordBests(r.best),
        incidents: env.deps.ACT_EXPLORATION_INCIDENTS.records.map(([key, name, hidden]) => ({ key, name, hidden, count: recordToPositiveInt(r.incidents[key]) }))
    };
}
