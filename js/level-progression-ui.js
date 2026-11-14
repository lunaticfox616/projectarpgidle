// GENERATED from modules/level-progression-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/level-progression-markup.mjs
  function itemRequirementStatus(runtime, item2, equipped, slot) {
    if (equipped) return { reason: (runtime.deps.combatEquipmentStats.evaluate(runtime.deps.game).disabled[slot] || []).join(", ") };
    const slots = (0, runtime.deps.getEquipCandidateSlots)(item2);
    const checks = slots.map((target) => runtime.deps.combatEquipmentStats.inspect(item2, target));
    const available = slots.filter((_, index) => checks[index].ok);
    return {
      reason: available.length ? "" : [...new Set(checks.map((check) => check.reason))].join(" / "),
      available: available.length < slots.length ? available.map(runtime.deps.getDualSlotDisplayLabel).join(", ") : ""
    };
  }
  function item(runtime, item2, equipped, slot) {
    const required = runtime.deps.levelProgression.requirements(item2);
    const attributes = Object.entries(required.attributes).filter(([, value]) => value > 0).map(([key, value]) => `${(0, runtime.deps.getStatName)(key)} ${value}`);
    const level = (0, runtime.deps._t)("요구 Lv.{level}", { level: required.level });
    const { reason, available } = itemRequirementStatus(runtime, item2, equipped, slot);
    const warning = reason ? `<div class="tooltip-line" style="color:var(--danger,#ed8d83)">${equipped ? `${(0, runtime.deps._t)("효과 비활성")}, ` : ""}${(0, runtime.deps.escapeHTML)(reason)}</div>` : "";
    const grace = equipped && item2.legacyRequirementGrace ? `, ${(0, runtime.deps._t)("기존 장착 유예")}` : "";
    const slotHint = available ? `<div class="tooltip-line" style="color:var(--color-success)">${(0, runtime.deps._t)("장착 가능")}: ${(0, runtime.deps.escapeHTML)(available)}</div>` : "";
    return `<div class="tooltip-line tooltip-meta tooltip-meta-base">${(0, runtime.deps.escapeHTML)([level, ...attributes].join(", ") + grace)}</div>${warning}${slotHint}`;
  }
  function area(runtime, zone) {
    return `Lv.${runtime.deps.levelProgression.areaLevel(zone)}`;
  }
  function rewardRates(runtime, zone) {
    const enemy = { level: runtime.deps.levelProgression.areaLevel(zone) };
    const rate = (kind) => Math.round(runtime.deps.levelProgression.rewardMultiplier(zone, enemy, runtime.deps.game.level, kind) * 100);
    return { level: enemy.level, xp: rate("experience"), rune: rate("gemExperience"), loot: rate("loot") };
  }
  function rewardHint(runtime, zone) {
    const { xp, loot } = rewardRates(runtime, zone);
    return xp < 100 || loot < 100 ? (0, runtime.deps._t)("보상 감소") : "";
  }
  function rewardData(runtime, zone) {
    const { level, xp, rune, loot } = rewardRates(runtime, zone);
    return `data-area-level="${level}" data-reward-xp="${xp}" data-reward-rune="${rune}" data-reward-loot="${loot}"`;
  }
  function decorateSlots(runtime, root) {
    const disabled = runtime.deps.combatEquipmentStats.evaluate(runtime.deps.game).disabled;
    root.querySelectorAll(".equipment-slot").forEach((card) => card.classList.toggle("equipment-requirements-unmet", !!disabled[card.dataset.slot]));
  }

  // modules/ui/level-progression-view.mjs
  function createLevelProgressionView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { item, area, rewardHint, rewardData, decorateSlots };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = Object.freeze({ item: runtime.handlers.item, area: runtime.handlers.area, rewardHint: runtime.handlers.rewardHint, rewardData: runtime.handlers.rewardData, decorateSlots: runtime.handlers.decorateSlots });
    return runtime.api;
  }

  // modules/level-progression-ui-classic.mjs
  var levelProgressionUi = createLevelProgressionView({
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get getDualSlotDisplayLabel() {
      return getDualSlotDisplayLabel;
    },
    get levelProgression() {
      return levelProgression;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getStatName() {
      return getStatName;
    }
  });
  safeExposeGlobals({ levelProgressionUi });
})();
