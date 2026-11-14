// GENERATED from modules/background-build-cache*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/build-memo.mjs
  function createBuildMemo(fields, parts) {
    const background = /* @__PURE__ */ new WeakMap();
    let pass = null;
    const values = (byEquipment, state) => {
      const key = state.equipment || state;
      let memo2 = byEquipment.get(key);
      if (!memo2) byEquipment.set(key, memo2 = /* @__PURE__ */ new Map());
      return memo2;
    };
    const foreground = (state) => !pass || pass.owner !== state || !state.equipment ? null : values(pass.byEquipment, state);
    const withinPass = (state, draw) => {
      if (pass) return draw();
      pass = { owner: state, byEquipment: /* @__PURE__ */ new WeakMap() };
      try {
        return draw();
      } finally {
        pass = null;
      }
    };
    const signature = (state, includeInventory = false) => {
      const inputs = fields.filter((key) => includeInventory || key !== "inventory").map((key) => state[key]);
      Object.entries(parts).forEach(([key, names]) => inputs.push(names.map((name) => state[key]?.[name])));
      return JSON.stringify(inputs, (key, value) => ["locked", "exp", "xp", "uniqueBaseLegacy"].includes(key) ? void 0 : value);
    };
    const read = (state) => {
      if (!state.isBackgroundCalculation) return foreground(state);
      const revision = [
        state.loopKills,
        state.loopDeaths,
        state.level,
        state.season,
        state.maxZoneId,
        state.currentZoneId,
        state.passives,
        state.actRewardBonuses?.length,
        state.journalBonuses?.length
      ];
      let memo2 = background.get(state);
      if (!memo2 || revision.some((value, index) => value !== memo2.revision[index])) {
        memo2 = { revision, byEquipment: /* @__PURE__ */ new WeakMap() };
        background.set(state, memo2);
      }
      return values(memo2.byEquipment, state);
    };
    return Object.freeze({ withinPass, signature, read, clear: (state) => background.delete(state) });
  }

  // modules/background-build-cache-classic.mjs
  var memo = createBuildMemo(BUILD_STAT_FIELDS, BUILD_STAT_PARTS);
  var withBuildMemoPass = (draw) => memo.withinPass(game, draw);
  var getPersistentBuildSignature = (owner, includeInventory = false) => memo.signature(owner, includeInventory);
  var getBackgroundBuildMemo = (state) => memo.read(state);
  var clearBackgroundBuildMemo = (state) => {
    memo.clear(state);
  };
  safeExposeGlobals({ withBuildMemoPass, getPersistentBuildSignature, getBackgroundBuildMemo, clearBackgroundBuildMemo });
})();
