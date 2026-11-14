// GENERATED from modules/sap-catalysts*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/sap-catalysts-rules.mjs
  function catalystOpen(env, state) {
    return env.deps.contentProgression.holds("sapWound", state);
  }
  function catalystQuality(item) {
    return Math.max(0, Math.floor(Number(item.quality) || 0));
  }
  function catalystUseReason(env, item, key) {
    const kind = env.BY_KEY.get(key);
    if (!kind) return "없는 기폭제입니다.";
    if (!item || !item.slot) return "아이템을 선택하세요.";
    if (item.corrupted) return "타락한 장비에는 쓸 수 없습니다.";
    const same = env.deps.getItemQualityAttributeMode(item) === kind.mode;
    if (same && (item.qualityLockedByLimitBreak || catalystQuality(item) >= env.C.cap)) return "이미 이 품질 속성이고 품질을 더 올릴 수 없습니다.";
    return "";
  }
  function catalystApply(env, item, key) {
    const kind = env.BY_KEY.get(key), before = catalystQuality(item);
    item.qualityAttribute = kind.mode;
    if (!item.qualityLockedByLimitBreak) item.quality = Math.max(before, Math.min(env.C.cap, before + env.C.quality));
    return { mode: kind.mode, before, after: catalystQuality(item) };
  }
  function catalystPick(env, random) {
    return env.KEYS[Math.min(env.KEYS.length - 1, Math.floor(random() * env.KEYS.length))];
  }
  function catalystKillDrops(env, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== "sapWound" || enemy.isBoss) return [];
    return random() < env.C.killDrops[enemy.isElite ? "elite" : "normal"] ? [[catalystPick(env, random), 1]] : [];
  }
  function catalystRootRecipe(env, [group], state) {
    if (!catalystOpen(env, state)) return { ok: false, reason: env.deps._t("수액 상처 해금 뒤에 만들 수 있습니다.") };
    const kind = env.BY_COLOR.get(group[0] && group[0].item && group[0].item.color);
    if (!kind) return { ok: false, reason: env.deps._t("이 색의 기폭제는 없습니다.") };
    return { ok: true, consumed: group, outputs: [{ kind: "currency", key: kind.key, amount: 1 }] };
  }
  function catalystExchangePlan(env, vine, state) {
    if (!catalystOpen(env, state)) return { reason: env.deps._t("수액 상처 해금 뒤에 만들 수 있습니다.") };
    const kind = env.BY_COLOR.get(vine && vine.color);
    if (!kind) return { reason: env.deps._t("이 색의 기폭제는 없습니다.") };
    const held = env.KEYS.filter((key) => key !== kind.key && (state.currencies[key] || 0) > 0);
    const total = held.reduce((sum, key) => sum + Math.floor(state.currencies[key] || 0), 0);
    return total >= env.deps.STUMP_CUBE_CATALYST_EXCHANGE ? { kind, held } : { reason: env.deps._t("바꿀 다른 기폭제가 {value}개 필요합니다.", { value: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }) };
  }
  function catalystExchangeRecipe(env, [[vine]], state, random = Math.random) {
    const plan = catalystExchangePlan(env, vine.item, state);
    if (plan.reason) return { ok: false, reason: plan.reason };
    const paid = {};
    for (let i = 0; i < env.deps.STUMP_CUBE_CATALYST_EXCHANGE; i++) {
      const left = plan.held.filter((key2) => Math.floor(state.currencies[key2] || 0) > (paid[key2] || 0));
      const key = left[Math.min(left.length - 1, Math.floor(random() * left.length))];
      paid[key] = (paid[key] || 0) + 1;
    }
    return { ok: true, consumed: [vine], paid, outputs: [{ kind: "currency", key: plan.kind.key, amount: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }] };
  }

  // modules/domain/sap-catalysts.mjs
  function createSapCatalysts(deps) {
    const env = { deps };
    env.C = env.deps.SAP_CATALYSTS;
    env.BY_KEY = new Map(env.C.kinds.map((kind) => [kind.key, kind]));
    env.BY_COLOR = new Map(env.C.kinds.filter((kind) => kind.color).map((kind) => [kind.color, kind]));
    env.KEYS = Object.freeze(env.C.kinds.map((kind) => kind.key));
    return Object.freeze({
      keys: env.KEYS,
      open: (...args) => catalystOpen(env, ...args),
      useReason: (...args) => catalystUseReason(env, ...args),
      apply: (...args) => catalystApply(env, ...args),
      killDrops: (...args) => catalystKillDrops(env, ...args),
      rootRecipe: (...args) => catalystRootRecipe(env, ...args),
      exchangePlan: (...args) => catalystExchangePlan(env, ...args),
      exchangeRecipe: (...args) => catalystExchangeRecipe(env, ...args),
      kind: (key) => env.BY_KEY.get(key) || null,
      isCatalyst: (key) => env.BY_KEY.has(key)
    });
  }

  // modules/sap-catalysts-classic.mjs
  var rules = createSapCatalysts({
    get contentProgression() {
      return contentProgression;
    },
    get getItemQualityAttributeMode() {
      return getItemQualityAttributeMode;
    },
    get _t() {
      return _t;
    },
    get STUMP_CUBE_CATALYST_EXCHANGE() {
      return STUMP_CUBE_CATALYST_EXCHANGE;
    },
    get SAP_CATALYSTS() {
      return SAP_CATALYSTS;
    }
  });
  var sapCatalysts = rules;
  safeExposeGlobals({ sapCatalysts });
})();
