// GENERATED from modules/character-stats-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/character-stats-actions.mjs
  function renderDamageSummary(runtime, pStats) {
    (0, runtime.deps.setTextById)("ui-total-dps", (0, runtime.deps.formatSettingNumber)(pStats.totalDps || (pStats.dps || 0) + (pStats.summonDps || 0), "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-dps", (0, runtime.deps.formatSettingNumber)(pStats.directDps || pStats.dps || 0, "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-summon-dps", (0, runtime.deps.formatSettingNumber)(pStats.summonDps || 0, "showCharacterComma"));
  }
  function renderAttack(runtime, pStats) {
    let summonCap = (0, runtime.deps.getSummonEquipCapFromStats)(pStats);
    let summonCapMaximum = typeof runtime.deps.getSummonCapMaximum === "function" ? (0, runtime.deps.getSummonCapMaximum)() : 8;
    let summonCapRow = runtime.deps.document.getElementById("row-summon-cap");
    if (summonCapRow) summonCapRow.style.display = summonCap > 1 || summonCapMaximum > 8 ? "" : "none";
    (0, runtime.deps.setTextById)("ui-summon-cap", (0, runtime.deps._t)("{n} / 최대 {max}", { n: summonCap, max: summonCapMaximum }));
    (0, runtime.deps.setTextById)("ui-atk", (0, runtime.deps.formatSettingNumber)(pStats.baseDmg, "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-aps", pStats.aspd.toFixed(2));
    (0, runtime.deps.setTextById)("ui-crit", pStats.crit.toFixed(1));
    ["strength", "dexterity", "intelligence"].forEach((key) => (0, runtime.deps.setTextById)("ui-" + key, Math.floor(pStats[key] || 0)));
    (0, runtime.deps.setTextById)("ui-accuracy", (0, runtime.deps.formatSettingNumber)(Math.floor(pStats.accuracy || 0), "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-crit-dmg", Math.floor(pStats.critDmg));
    (0, runtime.deps.setTextById)("ui-move-spd", Math.floor(pStats.moveSpeed));
    (0, runtime.deps.setTextById)("ui-projectile-shots", `+${Math.floor(pStats.projectileExtraShots || 0)}`);
    (0, runtime.deps.setTextById)("ui-target-bonus", `+${Math.max(0, (Number(pStats.sSkill && pStats.sSkill.targets) || 1) - (Number(pStats.skillBaseTargets) || 1))}`);
  }
  function renderDefense(runtime, pStats) {
    (0, runtime.deps.setTextById)("ui-dr", (0, runtime.deps.formatCappedResistanceValue)(pStats.dr, pStats.rawDr));
    (0, runtime.deps.setTextById)("ui-armor", (0, runtime.deps.formatSettingNumber)(pStats.armor || 0, "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-evasion", (0, runtime.deps.formatSettingNumber)(pStats.evasion || 0, "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-es", (0, runtime.deps.formatSettingNumber)(pStats.energyShield || 0, "showCharacterComma"));
    (0, runtime.deps.setTextById)("ui-block-chance", Math.max(0, Number(pStats.blockChance || 0)).toFixed(1));
    (0, runtime.deps.setTextById)("ui-deflect-chance", Math.max(0, Number(pStats.deflectChance || 0)).toFixed(1));
    (0, runtime.deps.setTextById)("ui-phys-ignore", Math.floor(pStats.physIgnore || 0));
    (0, runtime.deps.setTextById)("ui-res-pen", Math.floor(pStats.resPen || 0));
    (0, runtime.deps.setTextById)("ui-res-fire", (0, runtime.deps.formatCappedResistanceValue)(pStats.resF, pStats.rawResF));
    (0, runtime.deps.setTextById)("ui-res-cold", (0, runtime.deps.formatCappedResistanceValue)(pStats.resC, pStats.rawResC));
    (0, runtime.deps.setTextById)("ui-res-light", (0, runtime.deps.formatCappedResistanceValue)(pStats.resL, pStats.rawResL));
    (0, runtime.deps.setTextById)("ui-res-chaos", (0, runtime.deps.formatCappedResistanceValue)(pStats.resChaos, pStats.rawResChaos));
  }
  function renderConditions(runtime, pStats) {
    let formatInlinePct = (value) => {
      let n = Number(value || 0);
      if (!Number.isFinite(n)) n = 0;
      let rounded = Math.round(n * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };
    const fields = [
      ["ignite-chance", "igniteChance"],
      ["chill-chance", "chillChance"],
      ["freeze-chance", "freezeChance"],
      ["shock-chance", "shockChance"],
      ["poison-chance", "poisonChance"],
      ["bleed-chance", "bleedChance"],
      ["ail-res-ignite", "ailmentResistIgniteChance"],
      ["ail-res-chill", "ailmentResistChillChance"],
      ["ail-res-freeze", "ailmentResistFreezeChance"],
      ["ail-res-shock", "ailmentResistShockChance"],
      ["ail-res-poison", "ailmentResistPoisonChance"],
      ["ail-res-bleed", "ailmentResistBleedChance"]
    ];
    fields.forEach(([id, key]) => (0, runtime.deps.setTextById)("ui-" + id, formatInlinePct(pStats[key])));
  }
  function renderSecondary(runtime, pStats) {
    (0, runtime.deps.setTextById)("ui-min-dmg-roll", Math.floor(pStats.minDmgRoll || 80));
    (0, runtime.deps.setTextById)("ui-max-dmg-roll", Math.floor(pStats.maxDmgRoll || 100));
    (0, runtime.deps.setTextById)("ui-loop-deaths", Math.max(0, Math.floor(runtime.deps.game.loopDeaths || 0)));
    (0, runtime.deps.setTextById)("ui-loop-kills", Math.max(0, Math.floor(runtime.deps.game.loopKills || 0)));
    const rows = [
      ["phys-ignore", "physIgnore"],
      ["res-pen", "resPen"],
      ["regen", "regen"],
      ["regen-suppress", "regenSuppress"],
      ["leech", "leech"],
      ["spell-leech", "spellLeech"],
      ["ds", "ds"],
      ["gemlv", "gemLv"]
    ];
    rows.forEach(([id, key]) => {
      runtime.deps.document.getElementById("row-" + id).style.display = pStats[key] > 0 ? "grid" : "none";
    });
    const values = [
      ["regen", "regen", (value) => (0, runtime.deps.formatValue)("regen", value)],
      ["regen-suppress", "regenSuppress", (value) => (0, runtime.deps.formatValue)("regenSuppress", value)],
      ["leech", "leech", (value) => (0, runtime.deps.formatValue)("leech", value)],
      ["spell-leech", "spellLeech", (value) => (0, runtime.deps.formatValue)("spellLeech", value)],
      ["ds", "ds", (value) => (0, runtime.deps.formatSettingNumber)(value, "showCharacterComma")],
      ["gemlv", "gemLv", (value) => "+" + value]
    ];
    values.forEach(([id, key, format]) => {
      if (pStats[key] > 0) (0, runtime.deps.setTextById)("ui-" + id, format(pStats[key]));
    });
  }
  function getTalentNotes(runtime) {
    const notes = [];
    const heroDef = runtime.deps.game.bloomedClassThisLoop === runtime.deps.game.ascendClass ? runtime.deps.HERO_SELECTION_DEFS[runtime.deps.game.bloomedTalentThisLoop] : null;
    if (heroDef) notes.push((0, runtime.deps._t)("{hero} 개화 재능: {talents}", { hero: (0, runtime.deps._t)(heroDef.label), talents: heroDef.talentsText }));
    const picked = runtime.deps.game.ascendClass && Array.isArray(runtime.deps.game.ascendKeystones) ? runtime.deps.game.ascendKeystones : [];
    const twins = (Array.isArray(runtime.deps.game.cosmosTwinKeystones) ? runtime.deps.game.cosmosTwinKeystones : []).filter((id) => !picked.includes(id));
    const names = [...picked.map((id) => (0, runtime.deps._t)((0, runtime.deps.getAscendKeystoneName)(id))), ...twins.map((id) => (0, runtime.deps._t)("{name}(쌍둥이)", { name: (0, runtime.deps._t)((0, runtime.deps.getAscendKeystoneName)(id)) }))];
    if (names.length > 0) notes.push((0, runtime.deps._t)("★ 키스톤: {names}", { names: names.join(" / ") }));
    return notes;
  }
  function renderSpecialSummary(runtime, pStats) {
    const notes = [], bonus = pStats.glovePairAspdBonus || 0;
    const min = pStats.minDmgRoll || 80, max = pStats.maxDmgRoll || 100;
    if (bonus > 0) notes.push((0, runtime.deps._t)("동형 장갑 세트 보너스 활성화: 기본 공속 +{bonus}", { bonus: bonus.toFixed(2) }));
    notes.push(...getTalentNotes(runtime));
    if (min >= max) notes.push((0, runtime.deps._t)("최소 피해 보정({min}%)이 최대 보정 이상이라 최대 피해 보정이 동일 값으로 조정됩니다.", { min: Math.floor(min) }));
    (0, runtime.deps.setTextById)("ui-unique-special-summary", notes.join(", "));
  }
  function renderCharacterStats(runtime, pStats) {
    (0, runtime.deps.setTextById)("ui-maxhp-stat", (0, runtime.deps.formatSettingNumber)(pStats.maxHp, "showCharacterComma"));
    renderDamageSummary(runtime, pStats);
    renderAttack(runtime, pStats);
    renderDefense(runtime, pStats);
    renderConditions(runtime, pStats);
    renderSecondary(runtime, pStats);
    renderSpecialSummary(runtime, pStats);
  }
  function renderCharacterEhpSummary(runtime, stats) {
    const host = runtime.deps.document.getElementById("ui-character-ehp");
    if (host) host.innerHTML = characterEhpCards(runtime, stats);
  }
  function characterEhpCards(runtime, stats) {
    const { deps } = runtime;
    if (typeof deps.calculatePlayerEhpProfile !== "function") return "";
    const profile = deps.calculatePlayerEhpProfile(stats);
    const labels = { phys: deps._t("물리"), fire: deps._t("화염"), cold: deps._t("냉기"), light: deps._t("번개"), chaos: deps._t("카오스") };
    return Object.keys(labels).map((element) => {
      const row = profile.elements[element];
      const entropyText = deps.formatSettingNumber(row.entropy, "showCharacterComma");
      const directText = deps.formatSettingNumber(row.direct, "showCharacterComma");
      const detail = deps._t("{labels} 공격 EHP {entropyText}, 직격 EHP {directText}, 엔트로피 회피 {evadeChance}%", { labels: labels[element], entropyText, directText, evadeChance: profile.evadeChance.toFixed(1) });
      return `<div class="equipment-summary-stat character-ehp-stat equipment-ehp-stat" data-ehp-element="${element}" data-ehp-detail="${deps.escapeHTML(detail)}" tabindex="0" data-info-tooltip-anchor="1" onmouseenter="showPlayerEhpTooltip(event)" onfocus="showPlayerEhpTooltip(event)" onclick="showPlayerEhpTooltip(event)" onmouseleave="if(document.activeElement!==this) hideInfoTooltip()" onblur="hideInfoTooltip()"><span>${labels[element]}</span><strong>${entropyText}</strong></div>`;
    }).join("");
  }
  function renderCharacterPassiveSpecialStats(runtime, stats) {
    const { deps } = runtime;
    const mystique = Math.max(0, Number(stats.mystique) || 0);
    const cycle = Math.max(0, Number(stats.cycle) || 0);
    const devotion = Math.max(0, Number(stats.devotion) || 0);
    const ailment = deps._t(deps.getAilmentDisplayLabel(stats.mystiqueAilmentType));
    deps.setTextById("ui-mystique", deps.formatValue("mystique", mystique));
    deps.setTextById("ui-mystique-effect", mystique > 0 ? deps._t("{ailment} 피해/위력 +{value}%", { ailment, value: deps.formatValue("mystique", mystique) }) : deps._t("효과 없음"));
    deps.setTextById("ui-cycle", deps.formatValue("cycle", cycle));
    deps.setTextById("ui-cycle-effect", deps._t(cycle > 0 ? "상태이상 종료 시 6초 강화" : "효과 없음"));
    deps.setTextById("ui-revelation", deps._t(devotion > 0 ? stats.passiveRevelationLabel || "계시 활성" : "미해금"));
    deps.setTextById("ui-revelation-effect", revelationEffect(runtime, stats, devotion));
  }
  function revelationEffect(runtime, stats, devotion) {
    const { deps } = runtime;
    let text = deps._t("계시 수치 {value}", { value: deps.formatValue("devotion", devotion) });
    if (!(devotion > 0)) return text;
    switch (stats.passiveRevelation) {
      case "combat":
        return text + deps._t(", 피해 {value}% 증폭", { value: deps.formatValue("devotion", stats.passiveRevelationCombatDamageMorePct) });
      case "guard":
        return text + deps._t(", 받는 피해 {value}% 감폭", { value: deps.formatValue("devotion", stats.passiveRevelationGuardTakenLessPct) });
      case "life":
        return text + deps._t(", 생명력/보호막/재생 +{value}%", { value: deps.formatValue("regen", stats.passiveRevelationLifeBonusPct) });
      case "fanaticism":
        return text + deps._t(", 열광 {floor}/{floor2}", { floor: Math.floor(stats.passiveFanaticismStacks), floor2: Math.floor(devotion) });
      default:
        return text;
    }
  }

  // modules/ui/character-stats-view.mjs
  function createCharacterStatsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { renderCharacterStats, renderCharacterEhpSummary, renderCharacterPassiveSpecialStats };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = {
      renderCharacterStats: runtime.handlers.renderCharacterStats,
      renderCharacterEhpSummary: runtime.handlers.renderCharacterEhpSummary,
      renderCharacterPassiveSpecialStats: runtime.handlers.renderCharacterPassiveSpecialStats
    };
    return runtime.api;
  }

  // modules/character-stats-ui-classic.mjs
  var characterStatsView = createCharacterStatsView({
    get calculatePlayerEhpProfile() {
      return typeof calculatePlayerEhpProfile === "function" ? calculatePlayerEhpProfile : void 0;
    },
    get getAilmentDisplayLabel() {
      return getAilmentDisplayLabel;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get setTextById() {
      return setTextById;
    },
    get formatSettingNumber() {
      return formatSettingNumber;
    },
    get getSummonEquipCapFromStats() {
      return getSummonEquipCapFromStats;
    },
    get getSummonCapMaximum() {
      return typeof getSummonCapMaximum === "undefined" ? void 0 : getSummonCapMaximum;
    },
    get document() {
      return document;
    },
    get _t() {
      return _t;
    },
    get formatCappedResistanceValue() {
      return formatCappedResistanceValue;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get formatValue() {
      return formatValue;
    },
    get HERO_SELECTION_DEFS() {
      return HERO_SELECTION_DEFS;
    },
    get getAscendKeystoneName() {
      return getAscendKeystoneName;
    }
  });
  safeExposeGlobals({
    renderCharacterStats: characterStatsView.renderCharacterStats,
    renderCharacterEhpSummary: characterStatsView.renderCharacterEhpSummary,
    renderCharacterPassiveSpecialStats: characterStatsView.renderCharacterPassiveSpecialStats
  });
})();
