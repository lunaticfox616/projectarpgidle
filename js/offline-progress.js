// GENERATED from modules/offline-progress*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/offline-progress-rules.mjs
  function offlineGetOfflineEfficiencySources(env, state) {
    let rows = [
      { key: "epoch", label: env.deps._t("고요한 시대"), rate: typeof env.deps.atlasEpoch === "object" && state.atlas && state.atlas.epoch ? env.deps.atlasEpoch.offline(state) : 0 },
      { key: "mastery", label: env.deps._t("무기 숙련"), rate: typeof env.deps.weaponMastery === "object" ? env.deps.weaponMastery.offline(state) : 0 },
      { key: "chronicle", label: env.deps._t("세계수 연대기"), rate: typeof env.deps.chronicle === "object" ? env.deps.chronicle.offline(state) : 0 }
    ];
    return rows.filter((row) => row.rate > 0);
  }
  function offlineGetOfflineProgressConfig(env, state) {
    let owner = state || {};
    let hours = env.deps.OFFLINE_PROGRESS_RECOGNITION_HOURS[env.deps.contentProgression.rank("offlineHours", owner)];
    let baseRate = env.deps.OFFLINE_PROGRESS_EFFICIENCY_RATES[env.deps.contentProgression.rank("offlineRate", owner)];
    let recognitionLimitMs = hours * 60 * 60 * 1e3;
    let efficiencySources = offlineGetOfflineEfficiencySources(env, owner);
    let rate = Math.min(env.deps.OFFLINE_PROGRESS_EFFICIENCY_CAP, efficiencySources.reduce((sum, row) => sum + row.rate, baseRate));
    return {
      recognitionLimitMs,
      efficiencyRate: rate,
      baseEfficiencyRate: baseRate,
      efficiencySources,
      effectiveLimitMs: recognitionLimitMs * rate,
      recognitionHours: hours
    };
  }

  // modules/domain/offline-progress.mjs
  function createOfflineProgress(deps) {
    const env = { deps };
    return Object.freeze({ getOfflineEfficiencySources: (...args) => offlineGetOfflineEfficiencySources(env, ...args), getOfflineProgressConfig: (...args) => offlineGetOfflineProgressConfig(env, ...args) });
  }

  // modules/offline-progress-classic.mjs
  var rules = createOfflineProgress({
    get _t() {
      return _t;
    },
    get atlasEpoch() {
      return typeof atlasEpoch === "undefined" ? void 0 : atlasEpoch;
    },
    get weaponMastery() {
      return typeof weaponMastery === "undefined" ? void 0 : weaponMastery;
    },
    get chronicle() {
      return typeof chronicle === "undefined" ? void 0 : chronicle;
    },
    get OFFLINE_PROGRESS_RECOGNITION_HOURS() {
      return OFFLINE_PROGRESS_RECOGNITION_HOURS;
    },
    get contentProgression() {
      return contentProgression;
    },
    get OFFLINE_PROGRESS_EFFICIENCY_RATES() {
      return OFFLINE_PROGRESS_EFFICIENCY_RATES;
    },
    get OFFLINE_PROGRESS_EFFICIENCY_CAP() {
      return OFFLINE_PROGRESS_EFFICIENCY_CAP;
    }
  });
  var { getOfflineEfficiencySources, getOfflineProgressConfig } = rules;
  safeExposeGlobals({ getOfflineEfficiencySources, getOfflineProgressConfig });
})();
