// GENERATED from modules/records*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/records-rules.mjs
  function recordKeepIncidentCounts(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function recordCreateDefaultRecordsState(env, now) {
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
  function recordKeepClearedBests(env, records) {
    recordLowerBestsOnce(records, "clearedFloorBests", env.RECORD_CLEARED_FLOOR_KEYS);
    recordLowerBestsOnce(records, "clearedColonyBests", ["colonyWave"]);
  }
  function recordLowerBestsOnce(records, flag, keys) {
    if (records[flag] === true) return;
    keys.forEach((key) => {
      if (records.best[key] !== void 0) records.best[key] = Math.max(0, recordToPositiveInt(records.best[key]) - 1);
    });
    records[flag] = true;
  }
  function recordToPositiveInt(value) {
    let num = Math.floor(Number(value) || 0);
    return num > 0 ? num : 0;
  }
  function recordNormalizeEchoMeasurement(raw) {
    if (!raw || !Number.isFinite(raw.damage) || raw.damage < 0 || !Number.isFinite(raw.seconds) || raw.seconds <= 0 || raw.seconds > 30) return null;
    const damage = Math.floor(raw.damage);
    const dps = damage / raw.seconds;
    return Number.isFinite(dps) ? { damage, seconds: raw.seconds, dps } : null;
  }
  function recordEnsureRecordsState(env, state) {
    let g = state;
    if (!g) return recordCreateDefaultRecordsState(env, env.deps.clockNow());
    let now = env.deps.clockNow();
    if (!g.records || typeof g.records !== "object") g.records = recordCreateDefaultRecordsState(env, now);
    let r = g.records;
    r.version = env.RECORDS_VERSION;
    r.startedAt = recordToPositiveInt(r.startedAt) || now;
    recordRestoreCollections(env, r);
    recordRestoreEcho(r);
    recordRestoreCurrentLoop(r, g, now);
    return r;
  }
  function recordRestoreCollections(env, r) {
    r.loops = Array.isArray(r.loops) ? r.loops.filter((row) => row && typeof row === "object") : [];
    r.actBest = r.actBest && typeof r.actBest === "object" ? r.actBest : {};
    r.best = r.best && typeof r.best === "object" ? r.best : {};
    r.incidents = recordKeepIncidentCounts(r.incidents);
    recordKeepClearedBests(env, r);
  }
  function recordRestoreEcho(r) {
    r.echo = r.echo && typeof r.echo === "object" ? r.echo : { bestDps: 0, bestDamage: 0, runs: 0, lastAt: 0 };
    r.echo.bestDps = Math.max(0, Number(r.echo.bestDps) || 0);
    r.echo.bestDamage = Math.max(0, Number(r.echo.bestDamage) || 0);
    r.echo.runs = recordToPositiveInt(r.echo.runs);
    r.echo.lastAt = recordToPositiveInt(r.echo.lastAt);
    r.echo.last = recordNormalizeEchoMeasurement(r.echo.last);
    r.echo.previous = recordNormalizeEchoMeasurement(r.echo.previous);
  }
  function recordRestoreCurrentLoop(r, g, now) {
    if (r.currentLoop && typeof r.currentLoop === "object") {
      r.currentLoop.startedAt = recordToPositiveInt(r.currentLoop.startedAt) || now;
      r.currentLoop.actClears = r.currentLoop.actClears && typeof r.currentLoop.actClears === "object" ? r.currentLoop.actClears : {};
      r.currentLoop.activeMs = Math.max(0, Math.floor(Number(r.currentLoop.activeMs) || 0));
      r.currentLoop.lastTickAt = recordToPositiveInt(r.currentLoop.lastTickAt);
    } else {
      r.currentLoop = { loop: Math.max(1, Math.floor(g.season || 1)), startedAt: now, activeMs: 0, lastTickAt: now, actClears: {} };
    }
  }
  function recordGetAchievedRecordBests(best) {
    const baselines = { abyssDepth: 20 };
    return Object.fromEntries(Object.entries(best).filter(([key, value]) => recordToPositiveInt(value) > (baselines[key] || 0)));
  }
  function recordGetRecordBestSources(env, g) {
    let chaosRealm = g.chaosRealm && typeof g.chaosRealm === "object" ? g.chaosRealm : {};
    let underworld = g.underworldProgress && typeof g.underworldProgress === "object" ? g.underworldProgress : {};
    let ocean = g.ocean && typeof g.ocean === "object" ? g.ocean : {};
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
    const colony = g.colony && typeof g.colony === "object" ? g.colony : {};
    return Math.max(0, Math.max(recordToPositiveInt(colony.highestWave), recordToPositiveInt(colony.wave)) - 1);
  }
  function recordTickRecordActiveTime(env, records, now = env.deps.clockNow()) {
    let last = Math.floor(Number(records.currentLoop.lastTickAt) || 0) || now;
    let delta = now - last;
    if (delta > 0 && delta <= env.RECORDS_ACTIVE_TICK_MAX_MS) {
      records.currentLoop.activeMs = Math.max(0, Math.floor(records.currentLoop.activeMs || 0)) + delta;
    }
    records.currentLoop.lastTickAt = now;
  }
  function recordTrackRecordBests(env, state) {
    let g = state;
    if (!g) return null;
    let r = recordEnsureRecordsState(env, g);
    recordTickRecordActiveTime(env, r, g.combatTimeMs || env.deps.clockNow());
    let sources = recordGetRecordBestSources(env, g);
    Object.keys(sources).forEach((key) => {
      let next = sources[key];
      if (next > recordToPositiveInt(r.best[key])) r.best[key] = next;
    });
    return r.best;
  }
  function recordRecordActClear(env, zoneId, state) {
    let g = state;
    if (!g) return;
    let id = Math.floor(Number(zoneId));
    if (!Number.isFinite(id) || id < 0) return;
    let r = recordEnsureRecordsState(env, g);
    if (r.currentLoop.actClears[id] !== void 0) return;
    let elapsed = Math.max(0, Math.floor(r.currentLoop.activeMs || 0));
    r.currentLoop.actClears[id] = elapsed;
    let best = recordToPositiveInt(r.actBest[id]);
    if (!best || elapsed < best) r.actBest[id] = elapsed;
  }
  function recordRecordWoodsmanEchoRun(env, totalDamage, dps, state, seconds = 30) {
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
  function recordRecordIncident(env, kind, state) {
    let g = state;
    if (!g || !env.deps.ACT_EXPLORATION_INCIDENTS.records.some(([key]) => key === kind)) return;
    let r = recordEnsureRecordsState(env, g);
    r.incidents[kind] = recordToPositiveInt(r.incidents[kind]) + 1;
  }
  function recordCloseLoopRecord(env, path, state) {
    let g = state;
    if (!g) return null;
    let r = recordEnsureRecordsState(env, g);
    recordTrackRecordBests(env, g);
    let now = env.deps.clockNow();
    let progress = g.loopProgressCurrent && typeof g.loopProgressCurrent === "object" ? g.loopProgressCurrent : {};
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
      path: String(path || "chaos"),
      actClears: { ...r.currentLoop.actClears }
    };
    r.loops.unshift(row);
    if (r.loops.length > env.RECORDS_LOOP_HISTORY_LIMIT) r.loops.length = env.RECORDS_LOOP_HISTORY_LIMIT;
    r.currentLoop = { loop: row.loop + 1, startedAt: now, activeMs: 0, lastTickAt: now, actClears: {} };
    return row;
  }
  function recordEchoMeasurementChange(echo) {
    const { last, previous } = echo;
    if (!last || !previous || last.seconds !== 30 || previous.seconds !== 30 || previous.dps <= 0) return null;
    const change = (last.dps / previous.dps - 1) * 100;
    return Number.isFinite(change) ? change : null;
  }
  function recordEchoRecordsView(echo) {
    return { ...echo, last: echo.last && { ...echo.last }, previous: echo.previous && { ...echo.previous }, changePct: recordEchoMeasurementChange(echo) };
  }
  function recordGetRecordsView(env, state) {
    let g = state;
    if (!g) return null;
    let r = recordEnsureRecordsState(env, g);
    let now = env.deps.clockNow();
    let loops = r.loops.slice();
    let finished = loops.filter((row) => row && Math.floor(row.activeMs || 0) > 0);
    let fastest = finished.length ? finished.reduce((a, b) => a.activeMs <= b.activeMs ? a : b) : null;
    let averageMs = finished.length ? Math.round(finished.reduce((sum, row) => sum + Math.floor(row.activeMs || 0), 0) / finished.length) : 0;
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

  // modules/domain/records.mjs
  function createPlayerRecords(deps) {
    const env = { deps };
    env.RECORDS_VERSION = 1;
    env.RECORDS_LOOP_HISTORY_LIMIT = 30;
    env.RECORDS_ACTIVE_TICK_MAX_MS = 5e3;
    env.RECORD_CLEARED_FLOOR_KEYS = Object.freeze(["labyrinthFloor", "chaosRealmFloor", "skyFloor", "underworldFloor"]);
    return Object.freeze({
      createDefaultRecordsState: (...args) => recordCreateDefaultRecordsState(env, ...args),
      ensureRecordsState: (...args) => recordEnsureRecordsState(env, ...args),
      tickRecordActiveTime: (...args) => recordTickRecordActiveTime(env, ...args),
      trackRecordBests: (...args) => recordTrackRecordBests(env, ...args),
      recordActClear: (...args) => recordRecordActClear(env, ...args),
      recordWoodsmanEchoRun: (...args) => recordRecordWoodsmanEchoRun(env, ...args),
      recordIncident: (...args) => recordRecordIncident(env, ...args),
      closeLoopRecord: (...args) => recordCloseLoopRecord(env, ...args),
      getRecordsView: (...args) => recordGetRecordsView(env, ...args),
      RECORDS_VERSION: env.RECORDS_VERSION,
      RECORDS_LOOP_HISTORY_LIMIT: env.RECORDS_LOOP_HISTORY_LIMIT,
      RECORDS_ACTIVE_TICK_MAX_MS: env.RECORDS_ACTIVE_TICK_MAX_MS,
      RECORD_CLEARED_FLOOR_KEYS: env.RECORD_CLEARED_FLOOR_KEYS,
      keepIncidentCounts: recordKeepIncidentCounts
    });
  }

  // modules/records-classic.mjs
  var rules = createPlayerRecords({
    clockNow: () => Date.now(),
    get getClearedSkyTowerFloor() {
      return getClearedSkyTowerFloor;
    },
    get ACT_EXPLORATION_INCIDENTS() {
      return ACT_EXPLORATION_INCIDENTS;
    }
  });
  var {
    createDefaultRecordsState,
    tickRecordActiveTime,
    RECORDS_VERSION,
    RECORDS_LOOP_HISTORY_LIMIT,
    RECORDS_ACTIVE_TICK_MAX_MS,
    RECORD_CLEARED_FLOOR_KEYS,
    keepIncidentCounts
  } = rules;
  function resolveRecordOwner(state) {
    return state || (typeof game !== "undefined" ? game : null);
  }
  function ensureRecordsState(state) {
    return rules.ensureRecordsState(resolveRecordOwner(state));
  }
  function trackRecordBests(state) {
    return rules.trackRecordBests(resolveRecordOwner(state));
  }
  function recordActClear(zoneId, state) {
    return rules.recordActClear(zoneId, resolveRecordOwner(state));
  }
  function recordWoodsmanEchoRun(totalDamage, dps, state, seconds = 30) {
    return rules.recordWoodsmanEchoRun(totalDamage, dps, resolveRecordOwner(state), seconds);
  }
  function recordIncident(kind, state) {
    return rules.recordIncident(kind, resolveRecordOwner(state));
  }
  function closeLoopRecord(path, state) {
    return rules.closeLoopRecord(path, resolveRecordOwner(state));
  }
  function getRecordsView(state) {
    return rules.getRecordsView(resolveRecordOwner(state));
  }
  safeExposeGlobals({
    createDefaultRecordsState,
    ensureRecordsState,
    tickRecordActiveTime,
    trackRecordBests,
    recordActClear,
    recordWoodsmanEchoRun,
    recordIncident,
    closeLoopRecord,
    getRecordsView,
    RECORDS_VERSION,
    RECORDS_LOOP_HISTORY_LIMIT,
    RECORDS_ACTIVE_TICK_MAX_MS,
    RECORD_CLEARED_FLOOR_KEYS,
    keepIncidentCounts
  });
})();
