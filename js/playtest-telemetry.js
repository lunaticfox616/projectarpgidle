// GENERATED from modules/playtest-telemetry*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/telemetry-platform.mjs
  function telemetryCreatePlaytestSessionId(env) {
    if (typeof env.deps.crypto !== "undefined" && typeof env.deps.crypto.randomUUID === "function") return env.deps.crypto.randomUUID();
    let bytes = new Uint8Array(16);
    if (typeof env.deps.crypto !== "undefined" && typeof env.deps.crypto.getRandomValues === "function") env.deps.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    let hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function telemetryGetPlaytestBuildVersion(env) {
    let deploy = env.deps.document.querySelector('meta[name="app-deploy"]');
    let stamp = deploy ? String(deploy.content || "").trim() : "";
    if (stamp && stamp !== "dev") return stamp;
    let meta = env.deps.document.querySelector('meta[name="app-build"]');
    return meta ? String(meta.content || "unknown") : "unknown";
  }
  function telemetryGetPlaytestPlatform(env) {
    let mobile = typeof env.deps.matchMedia === "function" && env.deps.matchMedia("(max-width: 1080px)").matches;
    return mobile ? "mobile" : "desktop";
  }
  function telemetryGetPlaytestUserId(env) {
    let id = typeof env.deps.cloudState !== "undefined" && env.deps.cloudState.user && env.deps.cloudState.user.id;
    return typeof id === "string" && id ? id : null;
  }
  function telemetryGetPlaytestUtcDay(env) {
    return new env.deps.Date().toISOString().slice(0, 10);
  }

  // modules/browser/telemetry-frames.mjs
  function telemetryResetPlaytestFrameMetrics(env) {
    env.playtestRuntime.frameSamples = [];
    env.playtestRuntime.longFrames = 0;
    env.playtestRuntime.peakFx = 0;
  }
  function telemetryGetPlaytestFrameSummary(env) {
    let sorted = env.playtestRuntime.frameSamples.slice().sort((a, b) => a - b);
    let index = sorted.length ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
    return { p95: sorted.length ? sorted[index] : null, longFrames: env.playtestRuntime.longFrames, peakFx: env.playtestRuntime.peakFx };
  }
  function telemetrySamplePlaytestFrame(env, now) {
    env.playtestRuntime.frameHandle = null;
    if (!env.playtestRuntime.active) return;
    if (env.playtestRuntime.lastFrameAt > 0 && typeof env.deps.gameplayStarted !== "undefined" && env.deps.gameplayStarted && !env.deps.document.hidden) {
      let elapsed = Math.max(0, now - env.playtestRuntime.lastFrameAt);
      env.playtestRuntime.frameSamples.push(Math.min(1e3, elapsed));
      if (env.playtestRuntime.frameSamples.length > 600) env.playtestRuntime.frameSamples.shift();
      if (elapsed > 50) env.playtestRuntime.longFrames++;
      const fxCount = telemetryLiveEffectCount(env);
      env.playtestRuntime.currentFx = fxCount;
      env.playtestRuntime.peakFx = Math.max(env.playtestRuntime.peakFx, fxCount);
    }
    env.playtestRuntime.lastFrameAt = now;
  }
  function telemetrySchedulePlaytestFrame(env) {
    if (!env.playtestRuntime.active || env.playtestRuntime.frameHandle !== null || env.deps.startupOverlayActive) return;
    const onTelemetryFrame = (now) => {
      telemetrySamplePlaytestFrame(env, now);
      if (!env.playtestRuntime.active || env.deps.startupOverlayActive) return;
      env.playtestRuntime.frameHandle = env.deps.requestAnimationFrame(onTelemetryFrame);
    };
    env.playtestRuntime.frameHandle = env.deps.requestAnimationFrame(onTelemetryFrame);
  }
  function telemetryLiveEffectCount(env) {
    return (typeof env.deps.battleFx !== "undefined" && Array.isArray(env.deps.battleFx) ? env.deps.battleFx.length : 0) + (typeof env.deps.battleVisualState !== "undefined" && Array.isArray(env.deps.battleVisualState.skillEffects) ? env.deps.battleVisualState.skillEffects.length : 0) + (typeof env.deps.battleVisualState !== "undefined" && Array.isArray(env.deps.battleVisualState.damageTexts) ? env.deps.battleVisualState.damageTexts.length : 0);
  }
  function telemetrySyncPlaytestFrameSampling(env) {
    if (env.playtestRuntime.frameHandle !== null) env.deps.cancelAnimationFrame(env.playtestRuntime.frameHandle);
    env.playtestRuntime.frameHandle = null;
    env.playtestRuntime.lastFrameAt = 0;
    telemetrySchedulePlaytestFrame(env);
  }
  function telemetryGetLiveFrameAverage(env) {
    let samples = env.playtestRuntime.frameSamples.slice(-60);
    return samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
  }

  // modules/browser/telemetry-transport.mjs
  function telemetryConsumePlaytestDailyBudget(env, name, limit) {
    let userId = telemetryGetPlaytestUserId(env);
    if (!userId) return false;
    let day = telemetryGetPlaytestUtcDay(env);
    let key = `projectidle_${name}_budget`;
    try {
      let value = JSON.parse(env.deps.localStorage.getItem(key) || "null");
      let count = value && value.day === day && value.userId === userId ? Math.max(0, Number(value.count) || 0) : 0;
      if (count >= limit) return false;
      env.deps.localStorage.setItem(key, JSON.stringify({ day, userId, count: count + 1 }));
      return true;
    } catch (error) {
      env.deps.console.warn("playtest budget storage unavailable:", error);
      return false;
    }
  }
  function telemetryDisableMissingPlaytestTable(env, table, error) {
    let message = String(error && error.message || error || "");
    if (/schema cache|does not exist|could not find/i.test(message)) env.playtestRuntime.disabledTables.add(table);
  }
  function telemetryIsPlaytestTableUnavailable(env, table) {
    if (env.playtestRuntime.disabledTables.has(table)) return true;
    let limitedDay = env.playtestRuntime.dailyLimitedTables.get(table);
    if (!limitedDay) return false;
    if (limitedDay === telemetryGetPlaytestUtcDay(env)) return true;
    env.playtestRuntime.dailyLimitedTables.delete(table);
    return false;
  }
  function telemetryRememberPlaytestDailyLimit(env, table, error) {
    let message = String(error && error.message || error || "");
    if (!/PLAYTEST_DAILY_LIMIT/i.test(message)) return false;
    env.playtestRuntime.dailyLimitedTables.set(table, telemetryGetPlaytestUtcDay(env));
    return true;
  }
  async function telemetryPostPlaytestRow(env, table, body) {
    if (!telemetryGetPlaytestUserId(env) || telemetryIsPlaytestTableUnavailable(env, table)) return false;
    if (typeof env.deps.cloudJsonRequest !== "function") return false;
    try {
      await env.deps.cloudJsonRequest(`/rest/v1/${table}`, {
        method: "POST",
        headers: { Prefer: "return=minimal", "Content-Type": "application/json" },
        body
      });
      return true;
    } catch (error) {
      telemetryDisableMissingPlaytestTable(env, table, error);
      let dailyLimited = telemetryRememberPlaytestDailyLimit(env, table, error);
      if (!dailyLimited) env.deps.console.warn(`${table} write failed:`, error);
      return false;
    }
  }

  // modules/browser/telemetry-attempts.mjs
  function telemetryClampPlaytestInteger(value) {
    return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(value) || 0)));
  }
  function telemetryGetPlaytestPowerSnapshot(env) {
    let stats = typeof env.deps.getPlayerStats === "function" ? env.deps.getPlayerStats() : {};
    let profile = typeof env.deps.calculatePlayerEhpProfile === "function" ? env.deps.calculatePlayerEhpProfile(stats) : { elements: {} };
    let elements = {};
    ["phys", "fire", "cold", "light", "chaos"].forEach((key) => {
      elements[key] = telemetryClampPlaytestInteger(profile.elements && profile.elements[key] && profile.elements[key].entropy);
    });
    let positiveEhp = Object.values(elements).filter((value) => value > 0);
    return {
      dps: telemetryClampPlaytestInteger(stats.totalDps || stats.dps || stats.hitDps),
      ehpMin: positiveEhp.length ? Math.min(...positiveEhp) : 0,
      elements,
      skillElement: stats.sSkill && ["phys", "fire", "cold", "light", "chaos"].includes(stats.sSkill.ele) ? stats.sSkill.ele : "phys"
    };
  }
  function telemetryBeginPlaytestAttempt(env, detail) {
    if (!telemetryGetPlaytestUserId(env) || detail && detail.background) return;
    let zoneId = detail && detail.zoneId;
    if (zoneId === void 0 || zoneId === null) return;
    telemetryResetPlaytestFrameMetrics(env);
    env.playtestRuntime.attempt = {
      startedAt: env.deps.Date.now(),
      zoneId: String(zoneId),
      zoneType: String(detail && detail.zoneType || "unknown"),
      ...telemetryAttemptActorFields(env.deps.game),
      contentContext: telemetryAttemptContent(detail),
      power: telemetryGetPlaytestPowerSnapshot(env)
    };
  }
  function telemetryFinishPlaytestAttempt(env, result, detail) {
    if (detail && detail.background) return;
    let attempt = env.playtestRuntime.attempt;
    env.playtestRuntime.attempt = null;
    if (!attempt || !telemetryGetPlaytestUserId(env)) return;
    if (detail && detail.zoneId !== void 0 && String(detail.zoneId) !== attempt.zoneId) return;
    if (!telemetryConsumePlaytestDailyBudget(env, "run", env.PLAYTEST_RUN_DAILY_LIMIT)) return;
    let frame = telemetryGetPlaytestFrameSummary(env);
    telemetryPostPlaytestRow(env, "playtest_runs", {
      session_id: env.playtestRuntime.sessionId,
      zone_id: attempt.zoneId,
      zone_type: attempt.zoneType,
      loop: attempt.loop,
      ascend_class: attempt.ascendClass,
      hero_id: attempt.heroId,
      active_skill: attempt.activeSkill,
      skill_element: attempt.power.skillElement,
      result,
      duration_ms: Math.min(864e5, Math.max(0, env.deps.Date.now() - attempt.startedAt)),
      dps: attempt.power.dps,
      ehp_min: attempt.power.ehpMin,
      ehp_by_element: attempt.power.elements,
      frame_p95_ms: frame.p95,
      long_frames: frame.longFrames,
      peak_fx: frame.peakFx,
      content_context: attempt.contentContext,
      app_version: telemetryGetPlaytestBuildVersion(env),
      platform: telemetryGetPlaytestPlatform(env)
    });
  }
  function telemetryAttemptActorFields(owner) {
    if (!owner) return { loop: 1, ascendClass: null, heroId: null, activeSkill: null };
    return {
      loop: Math.max(1, Math.floor(Number(owner.season) || 1)),
      ascendClass: owner.ascendClass ? String(owner.ascendClass) : null,
      heroId: owner.selectedHeroId ? String(owner.selectedHeroId) : null,
      activeSkill: owner.activeSkill ? String(owner.activeSkill) : null
    };
  }
  function telemetryAttemptContent(detail) {
    return detail && detail.contentContext && typeof detail.contentContext === "object" ? detail.contentContext : {};
  }

  // modules/ui/telemetry-panel.mjs
  function telemetryIsPerformancePanelEnabled(env) {
    return typeof env.deps.location !== "undefined" && typeof env.deps.URLSearchParams !== "undefined" && new env.deps.URLSearchParams(env.deps.location.search).get("debug") === "perf";
  }
  function telemetryEnsurePerformancePanel(env) {
    if (!telemetryIsPerformancePanelEnabled(env)) return null;
    let panel = env.deps.document.getElementById("playtest-performance-panel");
    if (panel) return panel;
    panel = env.deps.document.createElement("aside");
    panel.id = "playtest-performance-panel";
    panel.setAttribute("aria-label", env.deps._t("실시간 성능"));
    panel.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:20000;min-width:170px;padding:9px 11px;border:1px solid #5b7698;border-radius:8px;background:rgba(7,13,22,.92);color:#eaf4ff;font:12px/1.5 monospace;pointer-events:none;white-space:pre;";
    env.deps.document.body.appendChild(panel);
    return panel;
  }
  function telemetryUpdatePerformancePanel(env) {
    let panel = telemetryEnsurePerformancePanel(env);
    if (!panel) return;
    let average = telemetryGetLiveFrameAverage(env);
    let summary = telemetryGetPlaytestFrameSummary(env);
    let calls = average > 0 ? Math.min(999, 1e3 / average) : 0;
    let lines = [
      env.deps._t("화면 갱신 {calls}/s (브라우저가 프레임을 부른 횟수)", { calls: calls.toFixed(0) }),
      env.deps._t("갱신 간격 평균 {average}ms, p95 {p95}ms, 50ms 넘음 {longFrames}", { average: average.toFixed(1), p95: (summary.p95 || 0).toFixed(1), longFrames: summary.longFrames })
    ].concat(telemetryGetBattleDrawPanelLines(env), [`FX ${env.playtestRuntime.currentFx} / ${summary.peakFx}`]);
    if (env.deps.performance && env.deps.performance.memory) lines.push(`JS 힙 ${(env.deps.performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB (그림과 GPU 메모리는 빼고)`);
    panel.textContent = lines.join("\n");
  }
  function telemetryGetBattleDrawPanelLines(env) {
    let frame = env.deps.battleFrameStats.frameSummary();
    if (!frame) return ["전장 그리기 아직 없음"];
    return [
      env.deps._t("전장 그리기 {draws}/s (박자 {pace}/s, 박자보다 늦음 {late}/{samples})", { draws: frame.draws, pace: frame.pace, late: frame.late, samples: frame.samples }),
      env.deps._t("그리기 간격 평균 {mean}ms, p95 {p95}ms, 최대 {worst}ms", { mean: frame.gapMs.mean, p95: frame.gapMs.p95, worst: frame.gapMs.worst }),
      env.deps._t("그리기 CPU 평균 {mean}ms, p95 {p95}ms, 최대 {worst}ms (메인 스레드)", { mean: frame.cpuMs.mean, p95: frame.cpuMs.p95, worst: frame.cpuMs.worst }),
      env.deps._t("방 그림 준비 {count}번, 최근 {lastMs}ms, 최대 {worstMs}ms", { count: frame.rooms.count, lastMs: frame.rooms.lastMs.toFixed(1), worstMs: frame.rooms.worstMs.toFixed(1) })
    ];
  }

  // modules/browser/telemetry-diagnostics.mjs
  function telemetrySanitizeClientErrorText(value, maxLength) {
    return String(value || "").replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[token]").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]").replace(/([?&](?:access_token|refresh_token|apikey)=)[^&#\s]+/gi, "$1[redacted]").slice(0, maxLength);
  }
  function telemetryCaptureClientError(env, error, source) {
    const message = telemetryErrorMessage(error);
    let stack = telemetrySanitizeClientErrorText(error && error.stack ? error.stack : "", 5e3);
    let fingerprint = `${message}|${String(source || "").split("/").pop()}`.slice(0, 500);
    let row = { at: env.deps.Date.now(), message, stack, source: String(source || "").slice(-200) };
    env.playtestRuntime.recentErrors.push(row);
    if (env.playtestRuntime.recentErrors.length > env.PLAYTEST_RECENT_ERROR_LIMIT) env.playtestRuntime.recentErrors.shift();
    if (!telemetryGetPlaytestUserId(env) || !telemetryConsumePlaytestDailyBudget(env, "error", env.PLAYTEST_ERROR_DAILY_LIMIT)) return;
    telemetryPostPlaytestRow(env, "client_error_reports", {
      fingerprint,
      message,
      stack,
      context: telemetryGetClientDiagnosticContext(env),
      app_version: telemetryGetPlaytestBuildVersion(env)
    });
  }
  function telemetryGetClientDiagnosticContext(env) {
    let frame = telemetryGetPlaytestFrameSummary(env);
    return {
      ...telemetryDiagnosticProgress(env.deps.game),
      platform: telemetryGetPlaytestPlatform(env),
      frameP95Ms: frame.p95,
      longFrames: frame.longFrames,
      peakFx: frame.peakFx
    };
  }
  async function telemetryCopyClientDiagnostics(env) {
    let report = {
      appVersion: telemetryGetPlaytestBuildVersion(env),
      context: telemetryGetClientDiagnosticContext(env),
      errors: env.playtestRuntime.recentErrors.slice(-env.PLAYTEST_RECENT_ERROR_LIMIT)
    };
    let text = JSON.stringify(report, null, 2);
    try {
      await env.deps.navigator.clipboard.writeText(text);
      if (typeof env.deps.addLog === "function") env.deps.addLog(env.deps._t("진단 정보를 클립보드에 복사했습니다."), "loot-magic");
    } catch (error) {
      env.deps.console.error("diagnostic copy failed:", error);
    }
    return text;
  }
  function telemetryErrorMessage(error) {
    return telemetrySanitizeClientErrorText(error && error.message ? error.message : error, 1e3) || "Unknown runtime error";
  }
  function telemetryDiagnosticProgress(owner) {
    if (!owner) return { zoneId: null, loop: 1, ascendClass: null, activeSkill: null };
    return {
      zoneId: owner.currentZoneId,
      loop: Math.max(1, Math.floor(Number(owner.season) || 1)),
      ascendClass: owner.ascendClass || null,
      activeSkill: owner.activeSkill || null
    };
  }

  // modules/browser/telemetry-lifecycle.mjs
  function createTelemetryLifecycle(deps, rules2, state) {
    let installed = false, panelTimer = null;
    const events = [
      ["project-idle:encounter-started", (event) => rules2.beginPlaytestAttempt(event.detail)],
      ["project-idle:encounter-finished", (event) => rules2.finishPlaytestAttempt("clear", event.detail)],
      ["project-idle:player-defeated", (event) => rules2.finishPlaytestAttempt("death", event.detail)],
      ["project-idle:movement-started", (event) => rules2.finishPlaytestAttempt("abandon", event.detail)],
      ["error", (event) => rules2.captureClientError(event.error || event.message, event.filename)],
      ["unhandledrejection", (event) => rules2.captureClientError(event.reason, "unhandledrejection")],
      ["project-idle:startup-visibility", rules2.syncPlaytestFrameSampling]
    ];
    const resetFrameClock = () => {
      state.lastFrameAt = 0;
    };
    return {
      install() {
        if (installed) return;
        installed = true;
        state.active = true;
        for (const [name, handler] of events) deps.window.addEventListener(name, handler);
        deps.document.addEventListener("visibilitychange", resetFrameClock);
        rules2.schedulePlaytestFrame();
        if (rules2.isPerformancePanelEnabled()) panelTimer = deps.setInterval(rules2.updatePerformancePanel, 500);
      },
      dispose() {
        if (!installed) return;
        installed = false;
        state.active = false;
        for (const [name, handler] of events) deps.window.removeEventListener(name, handler);
        deps.document.removeEventListener("visibilitychange", resetFrameClock);
        if (state.frameHandle !== null) deps.cancelAnimationFrame(state.frameHandle);
        if (panelTimer !== null) deps.clearInterval(panelTimer);
        state.frameHandle = null;
        state.lastFrameAt = 0;
        panelTimer = null;
      }
    };
  }

  // modules/playtest-telemetry-runtime.mjs
  function createPlaytestTelemetry(deps) {
    const env = { deps, PLAYTEST_RUN_DAILY_LIMIT: 50, PLAYTEST_ERROR_DAILY_LIMIT: 20, PLAYTEST_RECENT_ERROR_LIMIT: 20 };
    env.playtestRuntime = {
      sessionId: telemetryCreatePlaytestSessionId(env),
      attempt: null,
      recentErrors: [],
      disabledTables: /* @__PURE__ */ new Set(),
      dailyLimitedTables: /* @__PURE__ */ new Map(),
      frameSamples: [],
      longFrames: 0,
      peakFx: 0,
      currentFx: 0,
      lastFrameAt: 0,
      frameHandle: null,
      active: true
    };
    const rules2 = {
      createPlaytestSessionId: (...args) => telemetryCreatePlaytestSessionId(env, ...args),
      getPlaytestBuildVersion: (...args) => telemetryGetPlaytestBuildVersion(env, ...args),
      getPlaytestFrameSummary: (...args) => telemetryGetPlaytestFrameSummary(env, ...args),
      beginPlaytestAttempt: (...args) => telemetryBeginPlaytestAttempt(env, ...args),
      finishPlaytestAttempt: (...args) => telemetryFinishPlaytestAttempt(env, ...args),
      schedulePlaytestFrame: (...args) => telemetrySchedulePlaytestFrame(env, ...args),
      syncPlaytestFrameSampling: (...args) => telemetrySyncPlaytestFrameSampling(env, ...args),
      isPerformancePanelEnabled: (...args) => telemetryIsPerformancePanelEnabled(env, ...args),
      updatePerformancePanel: (...args) => telemetryUpdatePerformancePanel(env, ...args),
      captureClientError: (...args) => telemetryCaptureClientError(env, ...args),
      getClientDiagnosticContext: (...args) => telemetryGetClientDiagnosticContext(env, ...args),
      copyClientDiagnostics: (...args) => telemetryCopyClientDiagnostics(env, ...args)
    };
    return Object.freeze({ ...rules2, ...createTelemetryLifecycle(deps, rules2, env.playtestRuntime) });
  }

  // modules/playtest-telemetry-classic.mjs
  var rules = createPlaytestTelemetry({
    get crypto() {
      return typeof crypto === "undefined" ? void 0 : crypto;
    },
    get document() {
      return document;
    },
    get matchMedia() {
      return typeof matchMedia === "undefined" ? void 0 : matchMedia.bind(window);
    },
    get cloudState() {
      return typeof cloudState === "undefined" ? void 0 : cloudState;
    },
    get Date() {
      return Date;
    },
    get localStorage() {
      return localStorage;
    },
    get console() {
      return console;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest.bind(void 0);
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats.bind(void 0);
    },
    get calculatePlayerEhpProfile() {
      return typeof calculatePlayerEhpProfile === "undefined" ? void 0 : calculatePlayerEhpProfile.bind(void 0);
    },
    get game() {
      return typeof game === "undefined" ? void 0 : game;
    },
    get gameplayStarted() {
      return typeof gameplayStarted === "undefined" ? void 0 : gameplayStarted;
    },
    get battleFx() {
      return typeof battleFx === "undefined" ? void 0 : battleFx;
    },
    get battleVisualState() {
      return typeof battleVisualState === "undefined" ? void 0 : battleVisualState;
    },
    get startupOverlayActive() {
      return startupOverlayActive;
    },
    get window() {
      return window;
    },
    get setInterval() {
      return setInterval.bind(window);
    },
    get clearInterval() {
      return clearInterval.bind(window);
    },
    get requestAnimationFrame() {
      return requestAnimationFrame.bind(window);
    },
    get cancelAnimationFrame() {
      return cancelAnimationFrame.bind(window);
    },
    get navigator() {
      return navigator;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog.bind(void 0);
    },
    get _t() {
      return _t.bind(void 0);
    },
    get location() {
      return typeof location === "undefined" ? void 0 : location;
    },
    get URLSearchParams() {
      return typeof URLSearchParams === "undefined" ? void 0 : URLSearchParams;
    },
    get performance() {
      return performance;
    },
    get battleFrameStats() {
      return battleFrameStats;
    }
  });
  var { createPlaytestSessionId, getPlaytestBuildVersion, getPlaytestFrameSummary, beginPlaytestAttempt, finishPlaytestAttempt, schedulePlaytestFrame, syncPlaytestFrameSampling, isPerformancePanelEnabled, updatePerformancePanel, captureClientError, getClientDiagnosticContext, copyClientDiagnostics } = rules;
  safeExposeGlobals({ createPlaytestSessionId, getPlaytestBuildVersion, getPlaytestFrameSummary, beginPlaytestAttempt, finishPlaytestAttempt, schedulePlaytestFrame, syncPlaytestFrameSampling, isPerformancePanelEnabled, updatePerformancePanel, captureClientError, getClientDiagnosticContext, copyClientDiagnostics });
  rules.install();
})();
