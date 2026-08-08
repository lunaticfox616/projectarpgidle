// 전적 기록 도메인 — "내가 얼마나 나아졌는가"를 남기는 계층.
//
// 역할 분리: 이 파일은 게임 상태에서 기록을 적립하고 화면이 쓸 읽기 모델을 만든다.
// DOM에 접근하지 않고, 기록 외의 게임 상태를 바꾸지 않는다. 화면 조립은 js/records-ui.js가 한다.
//
// 왜 별도 상태가 필요한가:
//   - 시간(루프 소요·액트 돌파)은 지금까지 아무 데도 기록되지 않았다.
//   - 최고 층수는 대부분 이미 있지만 일부는 루프 정산에서 초기화된다(군락지 파도 등).
//     그래서 "이번 루프 최고"와 "역대 최고"를 구분해 따로 적립해야 한다.
//
// 기존 세이브에는 과거 시간 데이터가 없다. 없는 것을 지어내지 않고 startedAt을 남겨
// 화면이 "언제부터의 기록인지"를 그대로 밝힌다.

const RECORDS_VERSION = 1;
// 최근 루프 목록의 보관 개수. 저장 용량을 위해 상한을 둔다(오래된 것부터 버린다).
const RECORDS_LOOP_HISTORY_LIMIT = 30;
// 한 틱에서 이 이상 벌어진 간격은 "게임이 굴러간 시간"이 아니라 자리를 비운 구간으로 본다.
// 포그라운드 틱은 100ms, 백그라운드 정산도 100ms 스텝으로 시뮬레이션 시계를 밀어 준다.
const RECORDS_ACTIVE_TICK_MAX_MS = 5000;

function createDefaultRecordsState(now) {
    return {
        version: RECORDS_VERSION,
        startedAt: now,
        currentLoop: null,
        loops: [],
        actBest: {},
        echo: { bestDps: 0, bestDamage: 0, runs: 0, lastAt: 0 },
        best: {}
    };
}

function toPositiveInt(value) {
    let num = Math.floor(Number(value) || 0);
    return num > 0 ? num : 0;
}

function ensureRecordsState(state) {
    let g = state || (typeof game !== 'undefined' ? game : null);
    if (!g) return createDefaultRecordsState(Date.now());
    let now = Date.now();
    if (!g.records || typeof g.records !== 'object') g.records = createDefaultRecordsState(now);
    let r = g.records;
    r.version = RECORDS_VERSION;
    r.startedAt = toPositiveInt(r.startedAt) || now;
    r.loops = Array.isArray(r.loops) ? r.loops.filter(row => row && typeof row === 'object') : [];
    r.actBest = (r.actBest && typeof r.actBest === 'object') ? r.actBest : {};
    r.best = (r.best && typeof r.best === 'object') ? r.best : {};
    r.echo = (r.echo && typeof r.echo === 'object') ? r.echo : { bestDps: 0, bestDamage: 0, runs: 0, lastAt: 0 };
    r.echo.bestDps = Math.max(0, Number(r.echo.bestDps) || 0);
    r.echo.bestDamage = Math.max(0, Number(r.echo.bestDamage) || 0);
    r.echo.runs = toPositiveInt(r.echo.runs);
    r.echo.lastAt = toPositiveInt(r.echo.lastAt);
    if (r.currentLoop && typeof r.currentLoop === 'object') {
        r.currentLoop.startedAt = toPositiveInt(r.currentLoop.startedAt) || now;
        r.currentLoop.actClears = (r.currentLoop.actClears && typeof r.currentLoop.actClears === 'object')
            ? r.currentLoop.actClears : {};
        r.currentLoop.activeMs = Math.max(0, Math.floor(Number(r.currentLoop.activeMs) || 0));
        // 기준점은 여기서 되돌리지 않는다. ensureRecordsState는 매 틱 호출되므로 되돌리면
        // 델타가 항상 0이 된다. 불러온 직후의 큰 간격은 RECORDS_ACTIVE_TICK_MAX_MS 상한이
        // 걸러 주므로 값만 정규화한다.
        r.currentLoop.lastTickAt = toPositiveInt(r.currentLoop.lastTickAt);
    } else {
        // 진행 중인 루프 기록이 없으면 지금부터 센다(기존 세이브의 첫 진입 경로).
        r.currentLoop = { loop: Math.max(1, Math.floor((g.season || 1))), startedAt: now, activeMs: 0, lastTickAt: now, actClears: {} };
    }
    return r;
}

// ── 최고 기록 적립 ──────────────────────────────────────────────────
// 루프 정산이 초기화하는 값(군락지 파도 등)이 있으므로, 현재값을 주기적으로 훑어
// 역대 최고를 단조 증가로 남긴다. 값을 읽기만 하고 원본은 건드리지 않는다.
function getRecordBestSources(g) {
    let chaosRealm = (g.chaosRealm && typeof g.chaosRealm === 'object') ? g.chaosRealm : {};
    let skyTower = (g.skyTower && typeof g.skyTower === 'object') ? g.skyTower : {};
    let underworld = (g.underworldProgress && typeof g.underworldProgress === 'object') ? g.underworldProgress : {};
    let ocean = (g.ocean && typeof g.ocean === 'object') ? g.ocean : {};
    let colony = (g.colony && typeof g.colony === 'object') ? g.colony : {};
    return {
        actZone: toPositiveInt(g.maxZoneId),
        level: toPositiveInt(g.level),
        loop: Math.max(1, Math.floor(g.season || 1)),
        abyssDepth: toPositiveInt(g.abyssEndlessDepth),
        labyrinthFloor: toPositiveInt(g.labyrinthUnlockedMaxFloor || g.labyrinthFloor),
        chaosRealmFloor: toPositiveInt(chaosRealm.highestFloor),
        skyFloor: toPositiveInt(skyTower.highestFloor),
        underworldFloor: toPositiveInt(underworld.highestFloor),
        oceanBoundary: toPositiveInt(ocean.highestBoundary || ocean.bestBoundary || ocean.highestDepth),
        colonyWave: Math.max(toPositiveInt(colony.highestWave), toPositiveInt(colony.wave))
    };
}

// 실제 경과(벽시계)와 활동 시간을 나눠 센다.
//
// 방치형은 자리를 비운 동안 게임이 그만큼 진행되지 않는다. 복귀 정산은 실제 경과의 10%만,
// 그것도 3시간까지만 시뮬레이션한다(js/ui.js의 BACKGROUND_PROGRESS_RATE / MAX_REAL_MS).
// 그래서 벽시계로 잰 "루프 소요 시간"은 사실상 "얼마나 자리를 안 비웠나"를 재게 되어
// 루프끼리 비교하는 의미가 사라진다. 틱이 실제로 돈 시간만 따로 적립해 비교에 쓴다.
// (복귀 정산 중에는 Date.now가 시뮬레이션 시계라 이 적립이 그대로 게임 진행 시간을 센다.)
function tickRecordActiveTime(records) {
    let now = Date.now();
    let last = Math.floor(Number(records.currentLoop.lastTickAt) || 0) || now;
    let delta = now - last;
    if (delta > 0 && delta <= RECORDS_ACTIVE_TICK_MAX_MS) {
        records.currentLoop.activeMs = Math.max(0, Math.floor(records.currentLoop.activeMs || 0)) + delta;
    }
    records.currentLoop.lastTickAt = now;
}

// 매 틱 호출된다. 최댓값 비교와 시간 적립만 하므로 비용은 무시할 수 있다.
function trackRecordBests(state) {
    let g = state || (typeof game !== 'undefined' ? game : null);
    if (!g) return null;
    let r = ensureRecordsState(g);
    tickRecordActiveTime(r);
    let sources = getRecordBestSources(g);
    Object.keys(sources).forEach(key => {
        let next = sources[key];
        if (next > toPositiveInt(r.best[key])) r.best[key] = next;
    });
    return r.best;
}

// ── 액트 돌파 시간 ──────────────────────────────────────────────────
// 이번 루프의 "활동 시간" 기준으로 남긴다. 벽시계로 재면 자리를 비운 시간이 그대로
// 섞여 루프끼리 비교가 무의미해진다.
function recordActClear(zoneId, state) {
    let g = state || (typeof game !== 'undefined' ? game : null);
    if (!g) return;
    let id = Math.floor(Number(zoneId));
    if (!Number.isFinite(id) || id < 0) return;
    let r = ensureRecordsState(g);
    if (r.currentLoop.actClears[id] !== undefined) return; // 루프당 첫 돌파만 남긴다.
    let elapsed = Math.max(0, Math.floor(r.currentLoop.activeMs || 0));
    r.currentLoop.actClears[id] = elapsed;
    let best = toPositiveInt(r.actBest[id]);
    if (!best || elapsed < best) r.actBest[id] = elapsed;
}

// ── 나무꾼의 잔상 ───────────────────────────────────────────────────
// 잔상은 이미 자체 최고 DPS를 들고 있지만 그건 현재 판 상태다. 전적에는 시도 횟수와
// 마지막 측정 시각까지 남겨, 빌드를 바꿔가며 잰 흐름을 볼 수 있게 한다.
function recordWoodsmanEchoRun(totalDamage, dps, state) {
    let g = state || (typeof game !== 'undefined' ? game : null);
    if (!g) return;
    let r = ensureRecordsState(g);
    r.echo.runs = toPositiveInt(r.echo.runs) + 1;
    r.echo.lastAt = Date.now();
    r.echo.bestDps = Math.max(r.echo.bestDps, Math.max(0, Number(dps) || 0));
    r.echo.bestDamage = Math.max(r.echo.bestDamage, Math.max(0, Number(totalDamage) || 0));
}

// ── 루프 경계 ───────────────────────────────────────────────────────
// 루프 정산이 상태를 초기화하기 "전에" 호출해야 한다. 그래야 이번 루프의 도달
// 기록(액트·혼돈 깊이)을 그대로 남길 수 있다.
function closeLoopRecord(path, state) {
    let g = state || (typeof game !== 'undefined' ? game : null);
    if (!g) return null;
    let r = ensureRecordsState(g);
    trackRecordBests(g);
    let now = Date.now();
    let progress = (g.loopProgressCurrent && typeof g.loopProgressCurrent === 'object') ? g.loopProgressCurrent : {};
    tickRecordActiveTime(r);
    let row = {
        loop: Math.max(1, Math.floor(r.currentLoop.loop || g.season || 1)),
        // activeMs = 게임이 실제로 굴러간 시간(루프 비교용), durationMs = 벽시계 경과.
        activeMs: Math.max(0, Math.floor(r.currentLoop.activeMs || 0)),
        durationMs: Math.max(0, now - r.currentLoop.startedAt),
        endedAt: now,
        maxZoneId: toPositiveInt(g.maxZoneId),
        level: toPositiveInt(g.level),
        bestAbyssDepth: toPositiveInt(progress.bestAbyssDepth),
        deaths: toPositiveInt(g.loopDeaths),
        kills: toPositiveInt(g.loopKills),
        path: String(path || 'chaos'),
        actClears: { ...r.currentLoop.actClears }
    };
    r.loops.unshift(row);
    if (r.loops.length > RECORDS_LOOP_HISTORY_LIMIT) r.loops.length = RECORDS_LOOP_HISTORY_LIMIT;
    r.currentLoop = { loop: row.loop + 1, startedAt: now, activeMs: 0, lastTickAt: now, actClears: {} };
    return row;
}

// ── 화면이 쓰는 읽기 모델 ───────────────────────────────────────────
// UI는 이 결과만 읽는다. 화면이 게임 상태를 직접 훑지 않게 해서, 표시 형식이 바뀌어도
// 기록 규칙은 그대로 두고, 기록 규칙이 바뀌어도 화면은 한 곳만 고치면 되게 한다.
function getRecordsView(state) {
    let g = state || (typeof game !== 'undefined' ? game : null);
    if (!g) return null;
    let r = ensureRecordsState(g);
    trackRecordBests(g);
    let now = Date.now();
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
        echo: { ...r.echo },
        best: { ...r.best }
    };
}

safeExposeGlobals({
    ensureRecordsState,
    trackRecordBests,
    recordActClear,
    recordWoodsmanEchoRun,
    closeLoopRecord,
    getRecordsView,
    createDefaultRecordsState,
    tickRecordActiveTime,
    RECORDS_LOOP_HISTORY_LIMIT,
    RECORDS_ACTIVE_TICK_MAX_MS
});
