// GENERATED from modules/passive-rules*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // modules/data/passive-rule-settings.mjs
  var PASSIVE_REVELATION_IDS = Object.freeze(["combat", "guard", "life"]);
  var PASSIVE_REVELATION_LABELS = Object.freeze({
    combat: "전투의 계시",
    guard: "수호의 계시",
    life: "생명의 성약",
    fanaticism: "광신"
  });
  var PASSIVE_WISDOM_ELEMENTS = Object.freeze(["fire", "cold", "lightning", "chaos"]);
  var PASSIVE_WISDOM_ELEMENT_BY_NODE_ID = Object.freeze({
    nmvzwisdomf: "fire",
    nmvzwisdomc: "cold",
    nmvzwisdoml: "lightning",
    nmvzwisdomd: "chaos",
    nhenzv8gp4i: "fire",
    nlwk06igprm: "cold",
    ndru1xggqhg: "lightning",
    nwn5msikamo: "chaos"
  });
  var PASSIVE_AILMENT_BY_ELEMENT = Object.freeze({ phys: "bleed", fire: "ignite", cold: "chill", light: "shock", chaos: "poison" });
  var PASSIVE_KARMA_PER_TARGET_CAP = 500;
  var PASSIVE_KEYSTONE_NODE_ID_BY_TITLE = Object.freeze({
    "균형의 공명": "pt_keystone_balance_resonance",
    "세 갈래 불빛": "pt_keystone_three_lights",
    "회심의 일격": "pt_keystone_critical_conversion",
    "육신의 공명": "nmwc5dia92",
    "의지의 공명": "nmwc5lu2h3",
    "금단의 만상": "pt_core_keystone_01",
    "타락한 복음": "pt_core_keystone_02",
    "육신과 정신의 성약": "pt_core_keystone_03",
    "카르마": "pt_core_keystone_04",
    "아슈라": "pt_core_keystone_05",
    "사중합일": "pt_core_keystone_06",
    "순환의 원석": "npqq5m7h2ri",
    "야만": "n39ip40yc3d",
    "헌신의 서약": "nv67fzprmet",
    "몰아의 통로": "nkr7zwrymol",
    "최후방 사격": "nxsxdk1yr2y",
    "결투의 규율": "n2c51dapljo",
    "피빛 요람": "pt_warrior_blood_cradle",
    "지혜의 도약": "nkf64engb6m",
    "혼의 성소": "backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone",
    "움직이는 성벽": "backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone",
    "피의 가속": "backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone",
    "선제 사냥": "backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone",
    "오염된 탄두": "backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone",
    "검은 증류": "backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone",
    "단일 해석": "backbone_branch_occultist_outer_2_mystique_single_keystone",
    "남겨진 잠식": "backbone_branch_occultist_outer_4_occultist_summon_keystone",
    "삼중 계시": "backbone_branch_cleric_outer_1_devotion_triple_keystone",
    "대리 성약": "backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone",
    "역행 순환": "backbone_branch_warrior_outer_1_cycle_reverse_keystone",
    "한 번의 중량": "backbone_branch_warrior_outer_4_warrior_bleed_keystone",
    "완전 회피": "backbone_branch_wanderer_outer_4_wanderer_duel_keystone",
    "관통 행렬": "backbone_branch_archer_outer_4_archer_physical_keystone",
    "과잉 투여": "backbone_branch_alchemist_outer_1_universal_flask_keystone",
    "단 하나의 사역": "backbone_branch_alchemist_outer_2_universal_summon_keystone",
    "폭발성 증류": "backbone_branch_alchemist_outer_4_alchemist_resist_keystone"
  });
  var PASSIVE_CYCLE_BUFF_EFFECTS = Object.freeze({
    ignite: [{ stat: "firePctDmg", perCycle: 2 }],
    chill: [{ stat: "coldPctDmg", perCycle: 2 }, { stat: "move", perCycle: 0.5 }],
    freeze: [{ stat: "coldPctDmg", perCycle: 2 }, { stat: "energyShieldPct", perCycle: 1 }],
    shock: [{ stat: "lightPctDmg", perCycle: 2 }, { stat: "aspd", perCycle: 0.5 }],
    poison: [{ stat: "chaosPctDmg", perCycle: 2 }, { stat: "regen", perCycle: 0.1 }],
    bleed: [{ stat: "physPctDmg", perCycle: 2 }, { stat: "armorPct", perCycle: 1 }]
  });
  var PASSIVE_START_GATE_CLASS_BY_TITLE = Object.freeze({ "연금술의 가지": "alchemist", "지식의 가지": "occultist", "바람결의 가지": "archer", "믿음의 줄기": "cleric", "자유의 줄기": "wanderer", "힘의 뿌리": "warrior" });
  var PASSIVE_TREE_PRESET_SLOTS = 3;

  // modules/data/meteor-progress-settings.mjs
  var METEOR_SITE_FLAGS = Object.freeze(["unlocked", "skyRiftReady", "skyRiftAllCosmos"]);
  var METEOR_SITE_NUMBERS = Object.freeze([
    ["skyRiftGauge", 100, false],
    ["skyRiftCarryGauge", 99, false],
    ["lastAnomalyAt", Infinity, true],
    ["entriesCleared", Infinity, true]
  ]);

  // modules/data/combat-dot-settings.mjs
  var ENEMY_CROWD_PAUSE_LIMIT = 20;
  var DOT_STACK_MAX = 10;
  var DOT_STACK_GROWTH_PER_STACK = 0.1;
  var DOT_TICK_INTERVAL = 0.2;
  var DOT_EFFECT_DURATION = 2.4;
  var DOT_TICK_FROM_HIT_RATIO = 0.06;

  // modules/data/panel-layout-settings.mjs
  var DEBUG_BATTLE_ANCHORS = false;
  var TAB_UNLOCK_GATES = {
    "tab-unlocks": "season",
    "tab-char": "char",
    "tab-season": "season",
    "tab-items": "items",
    "tab-skills": "skills",
    "tab-codex": "codex",
    "tab-map": "map",
    "tab-traits": "traits",
    "tab-talent": "talent",
    "tab-stump": "stump"
  };
  var MOBILE_BATTLE_BREAKPOINT = 1080;

  // modules/data/void-passive-options.mjs
  function voidOptionRows(group, rows) {
    return rows.map(([id, min, max, step]) => ({ id, min, max, step, group }));
  }
  var baseOptions = [
    ...voidOptionRows("피해", [
      ["pctDmg", 5, 9],
      ["attackPctDmg", 8, 13],
      ["spellPctDmg", 9, 15],
      ["elementalPctDmg", 8, 13],
      ["meleePctDmg", 10, 16],
      ["projectilePctDmg", 10, 16],
      ["physPctDmg", 10, 16],
      ["aoePctDmg", 10, 16],
      ["dotPctDmg", 10, 16],
      ["firePctDmg", 11, 18],
      ["coldPctDmg", 11, 18],
      ["lightPctDmg", 11, 18],
      ["chaosPctDmg", 11, 18],
      ["slamPctDmg", 12, 20],
      ["potionPctDmg", 12, 20],
      ["mobilityPctDmg", 12, 20],
      ["summonPctDmg", 12, 20],
      ["flatDmg", 5, 10],
      ["resPen", 2, 4]
    ]),
    ...voidOptionRows("치명타와 속도", [
      ["crit", 2, 4],
      ["critDmg", 8, 15],
      ["aspd", 3, 5],
      ["ds", 3, 6],
      ["minDmgRoll", 3, 6],
      ["maxDmgRoll", 3, 6],
      ["physIgnore", 3, 6],
      ["spellRepeatChance", 2, 4],
      ["skillDelayReduce", 1, 3],
      ["cooldownRecovery", 5, 10],
      ["cooldownReduction", 2, 4],
      ["move", 4, 7]
    ]),
    ...voidOptionRows("상태이상", [
      ["igniteChance", 4, 8],
      ["chillChance", 4, 8],
      ["shockChance", 4, 8],
      ["poisonChance", 4, 8],
      ["bleedChance", 4, 8],
      ["freezeChance", 2, 4],
      ["igniteDurationPct", 8, 14],
      ["chillDurationPct", 8, 14],
      ["freezeDurationPct", 8, 14],
      ["shockDurationPct", 8, 14],
      ["poisonDurationPct", 8, 14],
      ["bleedDurationPct", 8, 14]
    ]),
    ...voidOptionRows("방어", [
      ["flatHp", 20, 40],
      ["pctHp", 3, 6],
      ["regen", 0.5, 1, 0.1],
      ["leech", 0.2, 0.5, 0.1],
      ["armorPct", 8, 15],
      ["evasionPct", 8, 15],
      ["energyShieldPct", 8, 15],
      ["energyShield", 16, 32],
      ["blockChance", 1, 3],
      ["deflectChance", 2, 4],
      ["resAll", 4, 7],
      ["resF", 8, 14],
      ["resC", 8, 14],
      ["resL", 8, 14],
      ["resChaos", 5, 9],
      ["ailResIgnite", 8, 14],
      ["ailResFreeze", 8, 14],
      ["ailResShock", 8, 14],
      ["ailResPoison", 8, 14],
      ["ailResBleed", 8, 14]
    ]),
    ...voidOptionRows("능력치", [["strength", 8, 16], ["dexterity", 8, 16], ["intelligence", 8, 16], ["accuracy", 40, 90]])
  ];
  function createVoidPassiveOptionPool(SKILL_RUNE_STANCE_LABELS2) {
    return [
      ...baseOptions.map((row) => ({ ...row })),
      ...voidOptionRows("무기", Object.keys(SKILL_RUNE_STANCE_LABELS2).filter((stance) => stance !== "unarmed").flatMap((stance) => [[`${stance}PctDmg`, 14, 22], [`${stance}Crit`, 3, 5], [`${stance}Aspd`, 5, 8]]))
    ];
  }

  // modules/data/transcendent-void-passives.mjs
  var PLUTO_VOID_THRESHOLDS = Object.freeze([0.8, 0.96, 0.992, 0.9984]);
  function createTranscendentVoidPassiveDefinitions(_t2, tuning) {
    const { TRANSCENDENT_ANDROMEDA_RADIUS: TRANSCENDENT_ANDROMEDA_RADIUS2, TRANSCENDENT_ASTEROID_RADIUS: TRANSCENDENT_ASTEROID_RADIUS2, TRANSCENDENT_VOID_VALUES: TRANSCENDENT_VOID_VALUES2 } = tuning;
    return [
      { id: "trauma", name: "트라우마", min: 5, max: 10, desc: (v) => _t2("이 공허 패시브는 공허 할당 {v}회로 계산", { v }) },
      { id: "paleBlueDot", name: "창백한 푸른 점", fixed: 10, desc: (v) => _t2("스킬트리 포인트 {v}점을 추가로 얻습니다.", { v }) },
      { id: "overflowingVigor", name: "넘치는 활기", min: 3, max: 6, desc: (v) => _t2("할당한 공허 패시브 하나당 생명력 최대치 +{v}%", { v }) },
      { id: "toughSoul", name: "강인한 영혼", min: 3, max: 6, desc: (v) => _t2("할당한 공허 패시브 하나당 에너지 보호막 최대치 +{v}%", { v }) },
      { id: "defenseMechanism", name: "방어기제", min: 5, max: 10, desc: (v) => _t2("막기 확률 최대치 +{v}% 및 막기 확률 +{v2}%", { v, v2: v }) },
      { id: "blurredPresence", name: "흐릿한 존재감", min: 10, max: 20, min2: 3, max2: 5, desc: (v, v2) => _t2("비껴내기 +{v}% 및 비껴내기 피해 감소 +{v2}%", { v, v2 }) },
      { id: "chameleon", name: "카멜레온", desc: () => "공허 제작 창에서 다른 초월 하나를 골라 바꿀 수 있습니다" },
      // convertChameleonVoidPassive
      { id: "thirdFinger", name: "세 번째 손가락", desc: () => "반지를 하나 더 장착 가능" },
      { id: "greed", name: "재물욕", desc: () => "주얼을 하나 더 장착 가능" },
      { id: "wardKnot", name: "액막이 매듭", desc: () => "액막이를 하나 더 장착 가능" },
      // 액막이 칸 +1(js/colony-wards.js slotCount)
      { id: "innateTalent", name: "타고난 재능", min: 5, max: 15, min2: 1.5, max2: 2, step2: 0.1, desc: (v, v2) => _t2("{v}% 확률로 {v2}배 피해", { v, v2 }) },
      { id: "wholehearted", name: "전심전력", min: 5, max: 15, desc: (v) => _t2("할당한 공허 패시브 하나당 모든 피해 +{v}%", { v }) },
      { id: "impatience", name: "조급함", min: 8, max: 16, desc: (v) => _t2("할당한 공허 패시브 하나당 이동 속도 +{v}%", { v }) },
      { id: "immortalHero", name: "불멸의 영웅", fixed: 3e3, desc: (v) => _t2("생명력 +{max} (획득 이후 사망 시마다 -30)", { max: Math.max(0, Math.floor(Number(v) || 0)) }) },
      { id: "seasoned", name: "노련함", min: 4, max: 5, desc: (v) => _t2("경험한 루프 1회마다 치명타 피해 배율 +{v}%", { v }) },
      // 옛 고유 별쐐기 11종(2026-10-01). 트리를 바꾸던 변성 반경은 수치 효과로 옮겼다. 다섯의 수치는 data/passives.js
      // TRANSCENDENT_VOID_VALUES(9단계에서 맞춤).
      { id: "pluto", name: "명왕성", min: 1, max: 5, rollThresholds: PLUTO_VOID_THRESHOLDS, desc: (v) => _t2("할당한 공허 패시브 수 +{v}로 계산 (5개 확률 1/625)", { v }) },
      { id: "resonantStar", name: "공명별", fixed: 1, desc: (v) => _t2("보조스킬룬 한도 +{v}", { v }) },
      { id: "darkMatter", name: "암흑물질", desc: () => "옵션이 한 줄인 다른 공허 패시브의 효과 +100% (초월 공허 제외)" },
      { id: "sun", name: "태양", desc: () => "초월 직전 이 공허 패시브의 옵션을 3배로 유지" },
      { id: "blackHole", name: "블랙홀", desc: () => "이 노드가 무료 연결 거점이 됩니다. 시작점까지의 길을 되돌려도 이어진 패시브가 유지됩니다" },
      { id: "andromeda", name: "안드로메다", desc: () => _t2("이 노드 반경 {value} 안의 패시브는 길이 이어지지 않아도 할당할 수 있습니다", { value: TRANSCENDENT_ANDROMEDA_RADIUS2 }) },
      { id: "comet", name: "혜성", ...TRANSCENDENT_VOID_VALUES2.comet, desc: (v) => _t2("이동 속도 +{v}%", { v }) },
      { id: "asteroidBelt", name: "소행성대", ...TRANSCENDENT_VOID_VALUES2.asteroidBelt, desc: (v) => _t2("이 노드 반경 {value} 안에 할당한 패시브 하나당 모든 피해 +{v}%", { value: TRANSCENDENT_ASTEROID_RADIUS2, v }) },
      { id: "zeroGravity", name: "무중력", ...TRANSCENDENT_VOID_VALUES2.zeroGravity, desc: (v) => _t2("회피 +{v}%", { v }) },
      { id: "satellite", name: "위성", ...TRANSCENDENT_VOID_VALUES2.satellite, desc: (v) => _t2("공격 속도 +{v}%", { v }) },
      { id: "supernova", name: "초신성", ...TRANSCENDENT_VOID_VALUES2.supernova, desc: (v) => _t2("다른 공허 패시브의 옵션 +{v}%", { v }) }
    ];
  }
  function createTranscendentVoidStatLines(TRANSCENDENT_ASTEROID_RADIUS2) {
    return Object.freeze({
      paleBlueDot: (tr) => [["passivePoint", tr.value || 10]],
      overflowingVigor: (tr, ctx) => [["pctHp", tr.value * ctx.voidCount]],
      toughSoul: (tr, ctx) => [["energyShieldPct", tr.value * ctx.voidCount]],
      defenseMechanism: (tr) => [["blockChance", tr.value], ["blockChanceMax", tr.value]],
      blurredPresence: (tr) => [["deflectChance", tr.value], ["deflectDamageReduce", tr.value2]],
      innateTalent: (tr) => [["doubleDamageChance", tr.value], ["doubleDamageMultiplierPct", Math.max(0, ((tr.value2 || 1.5) - 1) * 100)]],
      wholehearted: (tr, ctx) => [["pctDmg", tr.value * ctx.voidCount]],
      impatience: (tr, ctx) => [["move", tr.value * ctx.voidCount]],
      immortalHero: (tr) => [["flatHp", Math.max(0, tr.value)]],
      seasoned: (tr, ctx) => [["critDmg", tr.value * ctx.loopCount]],
      resonantStar: (tr) => [["suppCap", tr.value]],
      comet: (tr) => [["move", tr.value]],
      zeroGravity: (tr) => [["evasionPct", tr.value]],
      satellite: (tr) => [["aspd", tr.value]],
      asteroidBelt: (tr, ctx) => [["pctDmg", tr.value * ctx.allocatedWithin(TRANSCENDENT_ASTEROID_RADIUS2)]]
    });
  }

  // modules/data/ocean-mod-categories.mjs
  function createOceanModCategoryRules(AFFIX_TAG_LISTS2, MOD_DB2, resolveAffixTagList2) {
    return [["공격", "attack"], ["방어/생명", "defense"], ["속도/치명", "speed"], ["저항", "resistance"]].map(([category, key]) => ({ category, ids: resolveAffixTagList2(AFFIX_TAG_LISTS2.sea[key], MOD_DB2) }));
  }

  // modules/domain/ocean-auto-dive.mjs
  function isAutoOceanDive(state) {
    return !!state.diving && state.autoDive === true;
  }
  function isOceanAutoRediveHalted(state, missLimit) {
    return state.lastSurfaceReason === "defeat" || state.fruitlessDives >= missLimit;
  }

  // modules/application/build-stat-preview.mjs
  var BuildStatPreview = class {
    constructor(state, readStats) {
      this.state = state;
      this.readStats = readStats;
    }
    previewBuildStats(edit) {
      const live = this.state.game, before = this.readStats(false);
      try {
        this.state.game = JSON.parse(JSON.stringify({ ...live, inventory: void 0 }));
        this.state.game.inventory = live.inventory;
        edit(this.state.game);
        const after = this.readStats(false);
        return { dps: [before.dps || 0, after.dps || 0], life: [before.maxHp || 0, after.maxHp || 0], before, after };
      } finally {
        this.state.game = live;
      }
    }
    previewPassiveNodeStats(nodeIds) {
      return this.previewBuildStats((copy) => {
        copy.passives = [.../* @__PURE__ */ new Set([...copy.passives || [], ...nodeIds])];
      });
    }
  };

  // modules/ui/build-stat-preview-labels.mjs
  function buildStatPreviewParts(meta, preview) {
    const format = meta.dps.format;
    const part = (label, [before, after]) => format(before) === format(after) ? "" : `<span style="color:${after > before ? "#8fe0a8" : "#ff9b92"}; white-space:nowrap;">${label} ${format(before)} → ${format(after)}</span>`;
    return [part("DPS", preview.dps), part("생명력", preview.life)].filter(Boolean).join(", ");
  }

  // modules/ui/void-passive-labels.mjs
  var VoidPassiveLabels = class {
    constructor(deps) {
      this.deps = deps;
    }
    formatVoidPassiveStatLine(line) {
      if (!line || !this.deps.isVoidPassiveLineStat(line.id)) return "";
      const isPct = this.deps.P_STATS[line.id] ? this.deps.P_STATS[line.id].isPct : /\(%\)/.test(this.deps.STAT_DISPLAY_NAMES[line.id]);
      const shown = (value) => `+${this.deps.formatValue(line.id, value)}${isPct ? "%" : ""}`, final = shown(line.val);
      const original = line.baseVal === void 0 || shown(line.baseVal) === final ? "" : this.deps._t(" (원본 {baseVal})", { baseVal: shown(line.baseVal) });
      return `${String(this.deps.getStatName(line.id)).replace(/\s*\((\+%p|%)\)\s*/g, "").trim()} ${final}${original}`;
    }
    getTranscendentVoidEffectLabel(nodeId, tr) {
      const def = this.deps.TRANSCENDENT_VOID_PASSIVE_DB.find((row) => row.id === tr.id), scale = this.deps.getVoidLinkScale(nodeId);
      if (!def || scale === 1 || !this.deps.TRANSCENDENT_VOID_STAT_LINES[tr.id] || ["paleBlueDot", "resonantStar"].includes(tr.id)) return this.formatTranscendentVoidPassive(tr);
      const round = (value) => Math.round(value * 100) / 100;
      const value2 = tr.id === "innateTalent" ? 1 + (tr.value2 - 1) * scale : tr.value2 * scale;
      const scaled = { ...tr, value: round(tr.value * scale), value2: round(value2) }, after = def.desc(scaled.value, scaled.value2).split(" ");
      const original = new Set(def.desc(tr.value, tr.value2).split(" ").filter((word, index) => word !== after[index]));
      return `${this.formatTranscendentVoidPassive(scaled)}${original.size ? ` (원본 ${[...original].join(", ")})` : ""}`;
    }
    getVoidPassiveEffectLabel(nodeId) {
      let entry = this.deps.getVoidPassiveCraft(nodeId);
      if (entry.transcendent) {
        return this.getTranscendentVoidEffectLabel(nodeId, entry.transcendent);
      }
      if (!entry.stats.length) return "공허 옵션 없음";
      return this.deps.passiveRouting.voidStats(entry, this.deps.game, this.deps.getVoidLinkScale(nodeId)).map((line) => this.formatVoidPassiveStatLine(line)).filter(Boolean).join(" / ");
    }
    formatTranscendentVoidPassive(entry) {
      let def = this.deps.TRANSCENDENT_VOID_PASSIVE_DB.find((row) => row.id === (entry && entry.id));
      if (!def) return "공허 옵션 없음";
      return `<span style="color:#d8b4ff;">${this.deps._t("{name} (초월)", { name: def.name })}</span>: ${def.desc(entry.value, entry.value2)}`;
    }
  };

  // modules/ui/ocean-progress-presentation.mjs
  var OceanProgressPresentation = class {
    constructor(deps) {
      this.deps = deps;
    }
    getOceanUpgradeCostText(cost) {
      if (!cost) return "최대";
      return Object.keys(cost).filter((key) => (cost[key] || 0) > 0).map((key) => `${this.deps.getCurrencyInfo(key).name} ${cost[key]}`).join(" / ");
    }
    moveAfterSurfacing(returnZoneId) {
      if (typeof this.deps.changeZone !== "function") return;
      this.deps.changeZone(returnZoneId);
      if (this.deps.game.currentZoneId === this.deps.OCEAN_ZONE_ID) this.deps.changeZone(Math.max(0, this.deps.game.maxZoneId || 0));
    }
    getSelectedSeaGiftEquipmentTarget() {
      let item = typeof this.deps.getSelectedCraftItem === "function" ? this.deps.getSelectedCraftItem() : null;
      return this.deps.isSeaGiftEquipmentTarget(item) ? item : null;
    }
  };

  // modules/ui/panel-layout.mjs
  var PanelLayout = class {
    constructor(deps, controls) {
      this.deps = deps;
      this.controls = controls;
      this.docked = false;
      this.onPointer = (e) => {
        controls.mouseX = e.clientX;
        controls.mouseY = e.clientY;
      };
      deps.document.addEventListener("mousemove", this.onPointer);
    }
    dispose() {
      this.deps.document.removeEventListener("mousemove", this.onPointer);
    }
    syncBattleTabLayout(forceTabSwitch) {
      let tabBattle = this.deps.document.getElementById("tab-battle");
      let leftPane = this.deps.document.getElementById("left-pane");
      let battleColumn = this.deps.document.getElementById("battle-column");
      let battleBtn = this.deps.document.getElementById("btn-tab-battle");
      if ([tabBattle, leftPane, battleColumn, battleBtn].some((element) => !element)) return;
      let isMobileBattle = this.deps.uiDisplay.matches(`(max-width: ${this.deps.MOBILE_BATTLE_BREAKPOINT}px)`);
      this.deps.document.body.classList.toggle("mobile-battle-tab", isMobileBattle);
      battleBtn.style.display = isMobileBattle ? "flex" : "none";
      if (isMobileBattle) {
        if (!this.docked || battleColumn.parentElement !== tabBattle) tabBattle.appendChild(battleColumn);
        this.docked = true;
        if (forceTabSwitch && !this.deps.document.getElementById("tab-battle").classList.contains("active")) this.deps.switchTab("tab-battle");
      } else {
        if (this.docked || battleColumn.parentElement !== leftPane) leftPane.appendChild(battleColumn);
        this.docked = false;
      }
    }
    isTutorialOpen() {
      let overlay = this.deps.document.getElementById("tutorial-overlay");
      return !!this.controls.activeTutorial && !!overlay && overlay.classList.contains("active");
    }
    isLoadingOverlayOpen() {
      let overlay = this.deps.document.getElementById("loading-overlay");
      return !!overlay && overlay.classList.contains("active");
    }
    applyPanelLayoutSettings() {
      let leftPane = this.deps.document.getElementById("left-pane");
      let leftToggleButtons = ["left-pane-collapse-toggle", "left-pane-floating-toggle"].map((id) => this.deps.document.getElementById(id)).filter(Boolean);
      let leftExpandFab = this.deps.document.getElementById("left-pane-expand-fab");
      let combatFeed = this.deps.document.querySelector(".combat-feed");
      let combatLogToggleBtn = this.deps.document.getElementById("btn-combat-log-toggle");
      let isLeftCollapsed = !!(this.deps.game && this.deps.game.settings && this.deps.game.settings.leftPaneCollapsed);
      let isLogCollapsed = this.deps.uiDisplay.matches("(max-width: 1080px)") ? !this.deps.game.settings.mobileCombatLogExpanded : !!this.deps.game.settings.combatLogCollapsed;
      if (leftPane) leftPane.classList.toggle("collapsed", isLeftCollapsed);
      this.deps.document.body.classList.toggle("left-pane-collapsed", isLeftCollapsed);
      const leftLabel = this.deps._t(isLeftCollapsed ? "전투 패널 펼치기" : "전투 패널 접기");
      leftToggleButtons.forEach((button) => this.syncPanelToggle(button, isLeftCollapsed ? "▶" : "◀", { "data-tip": leftLabel, "aria-label": leftLabel }));
      if (leftExpandFab) this.syncPanelToggle(leftExpandFab, "▶", {});
      if (combatFeed) combatFeed.classList.toggle("collapsed", isLogCollapsed);
      this.deps.document.body.classList.toggle("combat-log-collapsed", isLogCollapsed);
      const [logText, logLabel] = isLogCollapsed ? ["펼치기", "전투 기록 펼치기"] : ["접기", "전투 기록 접기"];
      if (combatLogToggleBtn) this.syncPanelToggle(combatLogToggleBtn, this.deps._t(logText), { "aria-expanded": String(!isLogCollapsed), "aria-label": this.deps._t(logLabel) });
    }
    syncPanelToggle(el, text, attributes) {
      if (el.textContent !== text) el.textContent = text;
      Object.entries(attributes).forEach(([name, value]) => {
        if (el.getAttribute(name) !== value) el.setAttribute(name, value);
      });
    }
    toggleLeftPaneCollapse() {
      this.deps.game.settings.leftPaneCollapsed = !this.deps.game.settings.leftPaneCollapsed;
      this.applyPanelLayoutSettings();
    }
    toggleCombatLogCollapse() {
      if (this.deps.uiDisplay.matches("(max-width: 1080px)")) this.deps.game.settings.mobileCombatLogExpanded = !this.deps.game.settings.mobileCombatLogExpanded;
      else this.deps.game.settings.combatLogCollapsed = !this.deps.game.settings.combatLogCollapsed;
      this.applyPanelLayoutSettings();
      const log = this.deps.document.getElementById("log");
      if (log && !this.deps.document.body.classList.contains("combat-log-collapsed")) log.scrollTop = log.scrollHeight;
    }
  };

  // modules/common/damage-elements.mjs
  function getAilmentDisplayLabel(type) {
    let labels = { ignite: "점화", chill: "냉각", freeze: "동결", shock: "감전", poison: "중독", bleed: "출혈", flameDecay: "화염 부패" };
    return labels[type] || type || "알 수 없음";
  }
  function normalizeDamageElementKey(labels, ele) {
    let key = typeof ele === "string" ? ele : "";
    if (labels[key]) return key;
    return key ? "other" : "phys";
  }
  function getElementColor(labels, ele) {
    let key = normalizeDamageElementKey(labels, ele);
    if (key === "fire") return "#ff8d4b";
    if (key === "cold") return "#7fe0ff";
    if (key === "light") return "#ffe16b";
    if (key === "chaos") return "#b97dff";
    if (key === "other") return "#8eaeca";
    return "#f2d29a";
  }
  function getDamageElementLabel(labels, translate, ele) {
    return translate(labels[normalizeDamageElementKey(labels, ele)] || labels.phys);
  }
  function getDamageElementIcon(labels, icons, ele) {
    return icons[normalizeDamageElementKey(labels, ele)] || icons.phys;
  }

  // modules/state/beehive-run-reset.mjs
  function resetBeehiveRunModifiers(b) {
    if (!b) return;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.waveExtra = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = "";
    b.pendingQueenRewards = [];
    b.queenActive = false;
  }

  // modules/domain/meteor-progress-state.mjs
  function meteorNormalizeMeteorSiteTiers(env, site) {
    site.skyRiftMinTier = Number.isFinite(site.skyRiftMinTier) ? Math.max(1, Math.floor(site.skyRiftMinTier)) : null;
    site.activeMeteorTier = Number.isFinite(site.activeMeteorTier) ? Math.max(8, Math.min(40, Math.floor(site.activeMeteorTier))) : null;
    const returnZoneId = site.meteorReturnZoneId;
    site.meteorReturnZoneId = ["number", "string"].includes(typeof returnZoneId) && returnZoneId !== env.deps.METEOR_FALL_ZONE_ID ? returnZoneId : null;
  }
  function meteorEnsureMeteorSiteState(env, owner) {
    const site = owner.meteorSite && typeof owner.meteorSite === "object" ? owner.meteorSite : {};
    owner.meteorSite = site;
    env.deps.METEOR_SITE_FLAGS.forEach((key) => {
      site[key] = !!site[key];
    });
    env.deps.METEOR_SITE_NUMBERS.forEach(([key, max, whole]) => {
      const value = Math.min(max, Math.max(0, Number(site[key]) || 0));
      site[key] = whole ? Math.floor(value) : value;
    });
    meteorNormalizeMeteorSiteTiers(env, site);
    const known = env.deps.METEOR_KINDS.some((kind) => kind.id === site.kind);
    site.kind = known ? site.kind : site.skyRiftReady || site.activeMeteorTier ? env.deps.METEOR_KINDS[0].id : null;
    site.constellationBuff = site.constellationBuff && typeof site.constellationBuff === "object" ? site.constellationBuff : null;
    return site;
  }
  function meteorRollMeteorKind(env, random = Math.random) {
    return env.deps.METEOR_KINDS[Math.min(env.deps.METEOR_KINDS.length - 1, Math.floor(random() * env.deps.METEOR_KINDS.length))].id;
  }
  function meteorGetMeteorKind(env, owner, site = meteorEnsureMeteorSiteState(env, owner)) {
    return env.deps.METEOR_KINDS.find((kind) => kind.id === site.kind) || null;
  }

  // modules/domain/meteor-progress-gauge.mjs
  var riftZoneTypes = /* @__PURE__ */ new Set(["abyss", "labyrinth", "chaosRealm", "skyTower", "underworld", "cosmos"]);
  function anomalyChance(enemy) {
    if (enemy && enemy.isBoss) return 0.08;
    return enemy && enemy.isElite ? 0.028 : 45e-4;
  }
  function isRiftZone(zone, unlockAct) {
    return zone.type === "act" && zone.id >= unlockAct || riftZoneTypes.has(zone.type);
  }
  function trackSkyRiftOrigin(st, zone) {
    if (!st.skyRiftReady && (st.skyRiftGauge || 0) <= 1e-4) {
      st.skyRiftAllCosmos = true;
      st.skyRiftMinTier = null;
    }
    if (zone.type !== "cosmos") st.skyRiftAllCosmos = false;
  }
  function* meteorTryUnlockMeteorContentByProgress(env, owner) {
    let st = meteorEnsureMeteorSiteState(env, owner);
    if (st.unlocked || !env.deps.getMeteorSiteUnlockReady(owner)) return false;
    st.unlocked = true;
    yield { kind: "progressLog", args: [env.deps._t("☄️ 말라가는 줄기 위로 검은 별이 떨어지기 시작했다."), "loot-unique"] };
    return true;
  }
  function* meteorTriggerAstronomerAnomaly(env, owner, zone, enemy) {
    if (!env.deps.contentProgression.isUnlocked("meteorSite", owner)) return false;
    let st = meteorEnsureMeteorSiteState(env, owner);
    let now = env.deps.getCombatTime();
    if (now - (st.lastAnomalyAt || 0) < 12e3) return false;
    let baseChance = anomalyChance(enemy);
    if (Math.random() >= baseChance) return false;
    st.lastAnomalyAt = now;
    let rare = Math.random() < 0.22;
    if (rare) {
      st.skyRiftGauge = env.deps.clampNumber((st.skyRiftGauge || 0) + 8, 0, 100);
      yield { kind: "progressLog", args: [env.deps._t("☄️ 희귀 이상 현상 관측! 균열 게이지 +8%"), "loot-unique"] };
    } else {
      st.skyRiftGauge = env.deps.clampNumber((st.skyRiftGauge || 0) + 3, 0, 100);
      yield { kind: "progressLog", args: [env.deps._t("✨ 이상 현상 관측: 균열 게이지 +3%"), "loot-magic"] };
    }
    return true;
  }
  function meteorGetSkyRiftGaugeTierCap(st) {
    return st && st.skyRiftAllCosmos ? 40 : 20;
  }
  function meteorGetSkyRiftGaugeEffectiveTier(zone, st) {
    let tier = Math.max(1, Math.floor(zone && zone.tier || 1));
    return Math.min(meteorGetSkyRiftGaugeTierCap(st), tier);
  }
  function meteorGetSkyRiftGaugeGain(zone, enemy, st) {
    let baseGain = enemy && enemy.isBoss ? 3.8 : enemy && enemy.isElite ? 1.6 : 0.35;
    let effectiveTier = meteorGetSkyRiftGaugeEffectiveTier(zone, st);
    return baseGain * Math.max(1, effectiveTier);
  }
  function* meteorGainSkyRiftGaugeFromCombat(env, owner, zone, enemy) {
    let st = meteorEnsureMeteorSiteState(env, owner);
    if (!st.unlocked || st.skyRiftReady) return;
    if (!zone) return;
    if (!isRiftZone(zone, env.deps.METEOR_SITE_UNLOCK_ACT)) return;
    trackSkyRiftOrigin(st, zone);
    let gain = meteorGetSkyRiftGaugeGain(zone, enemy, st);
    yield* meteorTriggerAstronomerAnomaly(env, owner, zone, enemy);
    let nextGauge = (st.skyRiftGauge || 0) + gain;
    st.skyRiftGauge = env.deps.clampNumber(nextGauge, 0, 100);
    let tier = meteorGetSkyRiftGaugeEffectiveTier(zone, st);
    st.skyRiftMinTier = Number.isFinite(st.skyRiftMinTier) ? Math.min(st.skyRiftMinTier, tier) : tier;
    if (st.skyRiftGauge >= 100 && !st.skyRiftReady) yield* completeSkyRift(env, owner, st, nextGauge);
  }
  function* completeSkyRift(env, owner, st, nextGauge) {
    let overflow = Math.max(0, nextGauge - 100);
    st.skyRiftGauge = 100;
    st.skyRiftCarryGauge = Math.min(99, Math.floor(overflow * 0.25));
    st.skyRiftReady = true;
    st.kind = meteorRollMeteorKind(env);
    const kind = meteorGetMeteorKind(env, owner, st);
    yield { kind: "progressLog", args: [env.deps._t("☄️ 하늘 균열이 완전히 벌어졌다. 운석 낙하 지점으로 향할 수 있다. ({name}, {element})", { name: env.deps._t(kind.name), element: kind.element }), "loot-rare"] };
    owner.noti.map = true;
  }

  // modules/domain/meteor-progress-rewards.mjs
  function* meteorGrantConstellationObservationReward(env, owner) {
    if (!env.deps.atlasPassives.has(owner, "constellation")) return;
    let st = meteorEnsureMeteorSiteState(env, owner);
    let pick = env.deps.rndChoice(env.deps.METEOR_CONSTELLATION_POOL);
    st.constellationBuff = { stat: pick.stat, label: pick.label, val: pick.val, observedAt: Date.now(), permanent: true };
    yield { kind: "progressLog", args: [env.deps._t("🌠 별자리 관측: {label} +{value}{unit} (루프 후 유지)", { label: env.deps._t(pick.label), value: pick.val, unit: pick.stat === "flatHp" ? "" : "%" }), "loot-unique"] };
  }
  function* meteorGrantMeteorEquipmentReward(env) {
    const item = yield { kind: "progressGenerateEquipment", args: [{ isBoss: true }, { minimumRarity: "rare", zone: env.deps.getZone(env.deps.METEOR_FALL_ZONE_ID) }] };
    return item && (yield { kind: "progressStoreEquipment", args: [item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true }] }) ? item : null;
  }
  function* meteorGrantMeteorEncounterRewards(env, owner) {
    let st = meteorEnsureMeteorSiteState(env, owner);
    let encounterTier = Math.max(1, Math.floor(st.activeMeteorTier || 1));
    const count = env.deps.getZone(env.deps.METEOR_FALL_ZONE_ID).rewardEquipmentCount;
    for (let i = 0; i < count; i++) {
      const item = yield* meteorGrantMeteorEquipmentReward(env);
      yield { kind: "progressLog", args: [env.deps._t("☄️ 운석 {tier}단계 정산 ({index}/{count}){item}", { tier: encounterTier, index: i + 1, count, item: item ? `, [${yield { kind: "progressItemName", args: [item] }}]` : "" }), "loot-rare", item ? { item } : {}] };
    }
    yield { kind: "progressJournal", args: ["meteor_fall"] };
    yield* meteorGrantConstellationObservationReward(env, owner);
  }

  // modules/domain/meteor-progress.mjs
  function createMeteorProgress(deps) {
    const env = { deps };
    return Object.freeze({
      ensureMeteorSiteState: (...args) => meteorEnsureMeteorSiteState(env, ...args),
      rollMeteorKind: (...args) => meteorRollMeteorKind(env, ...args),
      getMeteorKind: (...args) => meteorGetMeteorKind(env, ...args),
      tryUnlockMeteorContentByProgress: (...args) => meteorTryUnlockMeteorContentByProgress(env, ...args),
      getSkyRiftGaugeEffectiveTier: meteorGetSkyRiftGaugeEffectiveTier,
      gainSkyRiftGaugeFromCombat: (...args) => meteorGainSkyRiftGaugeFromCombat(env, ...args),
      grantMeteorEncounterRewards: (...args) => meteorGrantMeteorEncounterRewards(env, ...args)
    });
  }

  // modules/domain/ocean-progress-collection.mjs
  function oceanGetOceanFishingStrategyDef(env, owner, st) {
    let state = st || env.deps.ensureOceanState(owner);
    return env.deps.OCEAN_FISHING_STRATEGIES[state.fishingStrategy] || env.deps.OCEAN_FISHING_STRATEGIES.balanced;
  }
  function oceanGetOceanFishCollectionProgress(env, owner, st) {
    let state = st || env.deps.ensureOceanState(owner);
    let discovered = Object.keys(env.deps.OCEAN_FISH_DB).filter((key) => (state.fishCaughtTotal[key] || 0) > 0);
    let claimed = new Set(state.claimedCollectionMilestones || []);
    let milestones = env.deps.OCEAN_FISH_COLLECTION_MILESTONES.map((row) => ({
      ...row,
      ready: discovered.length >= row.required,
      claimed: claimed.has(row.required)
    }));
    return { discovered, discoveredCount: discovered.length, totalCount: Object.keys(env.deps.OCEAN_FISH_DB).length, milestones };
  }
  function oceanGetOceanFishCollectionBonus(env, owner, key, st) {
    let state = st || env.deps.ensureOceanState(owner);
    let claimed = new Set(state.claimedCollectionMilestones || []);
    return env.deps.OCEAN_FISH_COLLECTION_MILESTONES.reduce((sum, row) => {
      return sum + (claimed.has(row.required) ? Math.max(0, Number((row.bonus || {})[key]) || 0) : 0);
    }, 0);
  }
  function* oceanSetOceanFishingStrategy(env, owner, strategyId) {
    let st = env.deps.ensureOceanState(owner);
    let strategy = env.deps.OCEAN_FISHING_STRATEGIES[strategyId];
    if (!strategy) return false;
    if (st.diving) {
      yield { kind: "progressLog", args: [env.deps._t("낚시 전략은 수면에서만 변경할 수 있습니다."), "attack-monster"] };
      return false;
    }
    if (st.fishingStrategy === strategyId) return true;
    st.fishingStrategy = strategyId;
    yield { kind: "progressLog", args: [env.deps._t("{icon} 낚시 전략을 {name} 변경했습니다.", { icon: strategy.icon, name: env.deps.withDirectionParticle(`'${env.deps._t(strategy.name)}'`) }), "loot-magic"] };
    yield { kind: "progressOptionalSave", args: [200] };
    yield { kind: "progressOptionalRefresh", args: [] };
    return true;
  }
  function* oceanClaimOceanFishCollectionMilestone(env, owner, requiredCount) {
    let st = env.deps.ensureOceanState(owner);
    let required = Math.max(0, Math.floor(requiredCount || 0));
    let milestone = env.deps.OCEAN_FISH_COLLECTION_MILESTONES.find((row) => row.required === required);
    let progress = oceanGetOceanFishCollectionProgress(env, owner, st);
    let status = progress.milestones.find((row) => row.required === required);
    if (!milestone || !status || !status.ready || status.claimed) return false;
    st.claimedCollectionMilestones.push(required);
    for (const key of Object.keys(milestone.reward || {})) yield { kind: "progressAwardCurrency", args: [key, milestone.reward[key]] };
    yield { kind: "progressLog", args: [env.deps._t("📘 심해 도감 '{label}' 보상을 획득했습니다.", { label: env.deps._t(milestone.label) }), "loot-unique"] };
    yield { kind: "progressOptionalSave", args: [200] };
    yield { kind: "progressOptionalRefresh", args: [] };
    return true;
  }

  // modules/domain/ocean-progress-fishing.mjs
  function* oceanAdvanceOceanDiveFromKill(env, owner, zone) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving) return;
    if (Math.random() < 0.06) yield { kind: "progressAwardCurrency", args: ["reefFragment", 1] };
    yield* oceanGainOceanFishingGaugeFromCombat(env, owner, zone);
  }
  function* oceanGainOceanFishingGaugeFromCombat(env, owner, zone) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving) return;
    let depthTier = Math.max(0, Math.floor(zone?.depthTier ?? env.deps.getOceanDepthTier(st.depthM)));
    let strategy = oceanGetOceanFishingStrategyDef(env, owner, st);
    let collectionGainPct = oceanGetOceanFishCollectionBonus(env, owner, "gaugeGainPct", st);
    let gain = Math.max(35, 20 + Math.min(depthTier, 20) * 2) * env.deps.getOceanFishingGaugeGainMul(owner);
    gain *= Math.max(0.1, Number(strategy.gaugeGainMul) || 1) * (1 + collectionGainPct / 100);
    if (env.deps.hasOceanCurrent(zone, "school_of_fish")) gain *= 1.5;
    gain = Math.min(100, gain);
    let nextGauge = (st.fishingGauge || 0) + gain;
    st.fishingGauge = env.deps.clampNumber(nextGauge, 0, 100);
    if (st.fishingGauge >= 100) {
      st.fishingGauge = env.deps.clampNumber(nextGauge - 100, 0, 99.99);
      yield* oceanCatchOceanFish(env, owner, st.pressureLevel || 0);
    }
  }
  function* oceanCatchOceanFish(env, owner, depthTier) {
    let safeTier = Math.max(0, Math.floor(depthTier || 0));
    let eligible = Object.keys(env.deps.OCEAN_FISH_DB).filter((key) => (env.deps.OCEAN_FISH_DB[key].depthTier || 0) <= safeTier);
    if (eligible.length === 0) return null;
    let st = env.deps.ensureOceanState(owner);
    let strategy = oceanGetOceanFishingStrategyDef(env, owner, st);
    let rareEligible = eligible.filter((key) => (env.deps.OCEAN_FISH_RARITY_META[env.deps.OCEAN_FISH_DB[key].rarity] || {}).rank >= 2);
    let guaranteed = st.rareFishPity >= 100 && rareEligible.length > 0;
    if (guaranteed) eligible = rareEligible;
    let rareChanceBonusPct = yield { kind: "progressRareFishChance", args: [] };
    rareChanceBonusPct += oceanGetOceanFishCollectionBonus(env, owner, "rareChancePct", st);
    let picked = rollOceanFish(env, eligible, safeTier, strategy, rareChanceBonusPct);
    let wasDiscovered = (st.fishCaughtTotal[picked] || 0) > 0;
    let rarityRank = recordOceanCatch(env, st, picked, strategy, guaranteed);
    yield { kind: "progressBattleFx", args: ["fishCatch", { duration: 400, background: owner.isBackgroundCalculation }] };
    let logType = rarityRank >= 4 ? "loot-unique" : rarityRank >= 2 ? "loot-rare" : "loot-magic";
    yield { kind: "progressLog", args: [env.deps._t("{omen}{fish} 낚았습니다!", { omen: guaranteed ? `${env.deps._t("✨ 희귀 조짐 적중!")} ` : "🐟 ", fish: env.deps.withObjectParticle(env.deps._t(env.deps.OCEAN_FISH_DB[picked].name)) }), logType] };
    yield* announceOceanDiscovery(env, owner, st, wasDiscovered);
    return picked;
  }
  function rollOceanFish(env, eligible, safeTier, strategy, rareChanceBonusPct) {
    let weights = eligible.map((key) => {
      let fish = env.deps.OCEAN_FISH_DB[key];
      let rarityRank = (env.deps.OCEAN_FISH_RARITY_META[fish.rarity] || {}).rank || 0;
      let rareWeight = Number.isFinite(fish.rareWeight) ? fish.rareWeight : 1;
      if (rarityRank >= 2) rareWeight *= Math.max(0.1, Number(strategy.rareWeightMul) || 1) * (1 + rareChanceBonusPct / 100);
      return 1 / (1 + (safeTier - (fish.depthTier || 0))) * rareWeight;
    });
    let total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let picked = eligible[0];
    for (let i = 0; i < eligible.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        picked = eligible[i];
        break;
      }
    }
    return picked;
  }
  function recordOceanCatch(env, st, picked, strategy, guaranteed) {
    st.fishStock[picked] = Math.max(0, Math.floor(st.fishStock[picked] || 0)) + 1;
    st.fishCaughtTotal[picked] = Math.max(0, Math.floor(st.fishCaughtTotal[picked] || 0)) + 1;
    let rarityRank = (env.deps.OCEAN_FISH_RARITY_META[env.deps.OCEAN_FISH_DB[picked].rarity] || {}).rank || 0;
    st.rareFishPity = rarityRank >= 2 ? 0 : Math.min(100, st.rareFishPity + Math.max(1, Number(strategy.pityGain) || 8));
    st.lastCatch = { key: picked, at: Date.now(), guaranteed };
    return rarityRank;
  }
  function* announceOceanDiscovery(env, owner, st, wasDiscovered) {
    let discoveredCount = oceanGetOceanFishCollectionProgress(env, owner, st).discoveredCount;
    if (!wasDiscovered && env.deps.OCEAN_FISH_COLLECTION_MILESTONES.some((row) => row.required === discoveredCount)) {
      yield { kind: "progressLog", args: [env.deps._t("📘 심해 도감 {discoveredCount}/{length}, 받을 보상이 있습니다.", { discoveredCount, length: Object.keys(env.deps.OCEAN_FISH_DB).length }), "loot-rare"] };
      owner.noti.map = true;
    }
  }

  // modules/domain/ocean-progress-upgrades.mjs
  function oceanGetOceanPermanentUpgradeCost(env, owner, key) {
    let def = env.deps.OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return null;
    let level = env.deps.getOceanPermanentUpgradeLevel(key, owner);
    if (level >= def.maxLevel) return null;
    let nextLevel = level + 1;
    return {
      skyEssence: 4 + nextLevel * 2,
      oceanRerollShard: 1 + Math.floor(nextLevel / 3),
      reefFragment: 2 + Math.floor(nextLevel / 2),
      bossCore: nextLevel % 3 === 0 ? Math.max(1, Math.floor(nextLevel / 3)) : 0
    };
  }
  function oceanCanPayOceanUpgradeCost(owner, cost) {
    if (!cost) return false;
    return Object.keys(cost).every((key) => (owner.currencies[key] || 0) >= (cost[key] || 0));
  }
  function oceanPayOceanUpgradeCost(owner, cost) {
    Object.keys(cost).forEach((key) => {
      owner.currencies[key] = Math.max(0, (owner.currencies[key] || 0) - (cost[key] || 0));
    });
  }
  function* oceanUpgradeOceanPermanent(env, owner, key) {
    let st = env.deps.ensureOceanState(owner);
    let def = env.deps.OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return false;
    let cost = oceanGetOceanPermanentUpgradeCost(env, owner, key);
    if (!cost) return yield { kind: "progressLog", args: [env.deps._t("{label} 업그레이드는 이미 최대 단계입니다.", { label: env.deps._t(def.label) }), "attack-monster"] };
    if (!oceanCanPayOceanUpgradeCost(owner, cost)) return yield { kind: "progressLog", args: [env.deps._t("{label} 업그레이드 재료가 부족합니다. (필요: {cost})", { label: env.deps._t(def.label), cost: yield { kind: "progressCostText", args: [cost] } }), "attack-monster"] };
    oceanPayOceanUpgradeCost(owner, cost);
    st.permanentUpgrades[key] = env.deps.getOceanPermanentUpgradeLevel(key, owner) + 1;
    st.oxygenMax = Math.max(1, Math.floor(env.deps.getOceanOxygenMax(owner)));
    st.oxygenCur = Math.min(st.oxygenMax, (st.oxygenCur || 0) + (key === "oxygenMax" ? def.valuePerLevel : 0));
    yield { kind: "progressLog", args: [env.deps._t("🌊 심해 영구 업그레이드: {label} Lv.{permanentUpgrades} 달성", { label: env.deps._t(def.label), permanentUpgrades: st.permanentUpgrades[key] }), "loot-rare"] };
    yield { kind: "progressRefresh", args: [] };
    yield { kind: "progressSave", args: [200] };
    return true;
  }
  function* oceanInstallOceanReefFragment(env, owner) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked) return false;
    if (st.reefInstalled >= 10) return yield { kind: "progressLog", args: [env.deps._t("암초 조각을 더 설치할 수 없습니다 (최대치)."), "attack-monster"] };
    if ((owner.currencies.reefFragment || 0) < 1) return yield { kind: "progressLog", args: [env.deps._t("암초 조각이 부족합니다."), "attack-monster"] };
    owner.currencies.reefFragment -= 1;
    st.reefInstalled = Math.max(0, Math.floor(st.reefInstalled || 0)) + 1;
    yield { kind: "progressLog", args: [env.deps._t("🪸 암초 조각을 설치했습니다. (낚시 게이지 충전 +{value}%)", { value: st.reefInstalled * 15 }), "loot-rare"] };
    yield { kind: "progressSave", args: [200] };
  }

  // modules/domain/ocean-progress-entry.mjs
  function* oceanEnterOceanDive(env, owner, { auto = false, shallow = false } = {}) {
    const reason = env.deps.getZoneTravelBlockReason(env.deps.OCEAN_ZONE_ID) || env.deps.getContentStartBlockReason();
    if (reason) {
      yield { kind: "progressLog", args: [reason, "attack-monster"] };
      return false;
    }
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked) {
      yield { kind: "progressLog", args: [env.deps._t("아직 심해로 진입할 수 없습니다."), "attack-monster"] };
      return false;
    }
    if (st.diving) return false;
    if (!auto) st.fruitlessDives = 0;
    st.returnZoneId = owner.currentZoneId === env.deps.OCEAN_ZONE_ID ? null : owner.currentZoneId;
    st.autoDive = !!auto;
    st.diveStartProgress = env.deps.getOceanDiveRecord(st);
    st.lastSurfaceReason = "";
    st.depthM = oceanGetOceanDiveStartM(env, st, shallow);
    st.oxygenMax = Math.max(1, Math.floor(env.deps.getOceanOxygenMax(owner)));
    st.oxygenCur = st.oxygenMax;
    st.descentPendingM = 0;
    st.diving = true;
    st.lastTickAt = env.deps.getCombatTime();
    owner.currentZoneId = env.deps.OCEAN_ZONE_ID;
    yield { kind: "progressLog", args: [env.deps._t("🌊 심해 {depthM}m 지점부터 잠수를 시작합니다.", { depthM: st.depthM }), "loot-rare"] };
    return true;
  }
  function oceanGetOceanShallowLiftM(env, st) {
    const interval = env.deps.getOceanBossBoundaryInterval(), from = Math.floor(Math.max(0, st.bossClearM || 0) / interval) * interval;
    return Math.floor(st.checkpointM || 0) >= from + interval ? from : null;
  }
  function oceanGetOceanDiveStartM(env, st, shallow) {
    const lift = shallow ? oceanGetOceanShallowLiftM(env, st) : null;
    return lift === null ? Math.max(0, Math.floor(st.checkpointM || 0)) : lift;
  }

  // modules/domain/ocean-progress-surface.mjs
  function* oceanForceSurfaceOcean(env, owner, reason) {
    let st = env.deps.ensureOceanState(owner);
    const returnZoneId = oceanTakeOceanReturnZone(env, owner, st);
    st.diving = false;
    st.depthM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.descentPendingM = 0;
    st.oxygenCur = st.oxygenMax;
    st.drowning = false;
    st.drownSec = 0;
    const stopNote = oceanRecordOceanSurface(env, owner, st, reason);
    yield { kind: "progressLog", args: [reason === "oxygen" ? "🫧 산소가 모두 소진되어 익사 직전에 수면으로 끌어올려졌습니다. 체크포인트 이후의 진행이 사라졌습니다." : "🌊 잠수를 종료하고 수면으로 복귀했습니다.", "attack-monster"] };
    if (stopNote) yield { kind: "progressLog", args: [stopNote, "attack-monster"] };
    st.autoDive = false;
    if (reason !== "manual") {
      yield { kind: "progressAutoSurface", args: [returnZoneId] };
    }
    return returnZoneId;
  }
  function oceanRecordOceanSurface(env, owner, st, reason) {
    st.lastSurfaceReason = ["oxygen", "guardian", "defeat"].includes(reason) ? reason : "manual";
    if (reason === "defeat") return owner.settings.autoRediveOcean ? "🌊 자동 재잠수로 들어간 잠수에서 무리에게 쓰러져 자동 재잠수를 멈춥니다. 잠수 시작을 누르면 다시 이어집니다." : "";
    if (reason !== "oxygen" && reason !== "guardian") return "";
    const limit = env.deps.OCEAN_AUTO_REDIVE.missLimit;
    st.fruitlessDives = env.deps.getOceanDiveRecord(st) > st.diveStartProgress ? 0 : Math.min(limit, st.fruitlessDives + 1);
    return owner.settings.autoRediveOcean ? oceanGetOceanAutoRediveNote(env, st, reason) : "";
  }
  function oceanGetOceanAutoRediveNote(env, st, reason) {
    const limit = env.deps.OCEAN_AUTO_REDIVE.missLimit;
    if (st.fruitlessDives >= limit) return env.deps._t("🌊 리프트도 가디언 처치도 물고기도 없이 {limit}번 떠올라 자동 재잠수를 멈춥니다. 잠수 시작을 누르면 다시 이어집니다.", { limit });
    const lift = reason === "guardian" ? oceanGetOceanShallowLiftM(env, st) : null;
    return lift === null ? "" : env.deps._t("🌊 자동 재잠수는 {lift}m부터 내려가 물고기를 모읍니다.", { lift });
  }
  function oceanTakeOceanReturnZone(env, owner, st) {
    const back = st.returnZoneId === null ? null : env.deps.getZone(st.returnZoneId), farthest = Math.max(0, owner.maxZoneId || 0);
    st.returnZoneId = null;
    return back && ["act", "abyss"].includes(back.type) && !(back.id > farthest) ? back.id : farthest;
  }
  function oceanForgetOceanAutoDive(st) {
    st.lastSurfaceReason = "";
    st.returnZoneId = null;
    st.autoDive = false;
  }
  function oceanSetOceanAutoRedive(env, owner, on) {
    owner.settings.autoRediveOcean = !!on;
    if (on) env.deps.ensureOceanState(owner).fruitlessDives = 0;
  }

  // modules/domain/ocean-progress-depth.mjs
  function* oceanApplyOceanDepthGain(env, st, meters) {
    if (!st || !(meters > 0)) return;
    let curDepth = Math.max(0, Number(st.depthM) || 0);
    let interval = typeof env.deps.getOceanBossBoundaryInterval === "function" ? env.deps.getOceanBossBoundaryInterval() : 500;
    let cleared = Math.max(0, Math.floor(st.bossClearM || 0));
    let nextBoundary = Math.floor(cleared / interval) * interval + interval;
    if (curDepth >= nextBoundary) return;
    st.depthM = Math.min(nextBoundary, curDepth + meters);
    yield* advanceOceanCheckpoint(env, st);
    st.pressureLevel = env.deps.getOceanDepthTier(st.depthM);
    if (curDepth < nextBoundary && st.depthM >= nextBoundary) {
      yield { kind: "progressLog", args: [env.deps._t("🌊 수심 {nextBoundary}m: 심해 가디언이 길을 막습니다. 처치해야 더 깊이 내려갈 수 있습니다.", { nextBoundary }), "loot-unique"] };
    }
  }
  function* advanceOceanCheckpoint(env, st) {
    let newCheckpoint = Math.floor(st.depthM / 100) * 100;
    if (newCheckpoint > (st.checkpointM || 0)) {
      st.checkpointM = newCheckpoint;
      yield { kind: "progressLog", args: [env.deps._t("🛗 수중 리프트 {checkpointM}m 지점이 개방되었습니다.", { checkpointM: st.checkpointM }), "loot-rare"] };
    }
  }
  function* oceanTickOceanDepth(env, st, dtSec) {
    const pending = Math.max(0, Number(st && st.descentPendingM) || 0);
    if (!(dtSec > 0) || pending <= 0) return;
    const step = Math.min(pending, env.deps.OCEAN_COMBAT_DIVE.descentPerSec * dtSec);
    st.descentPendingM = pending - step;
    yield* oceanApplyOceanDepthGain(env, st, step);
  }
  function oceanApplyOceanKill(env, owner, enemy) {
    const st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving || !enemy || enemy.isBoss) return 0;
    if (!enemy.oceanAirAdd) st.descentPendingM = Math.max(0, Number(st.descentPendingM) || 0) + oceanGetOceanKillDescentM(env, enemy);
    const seconds = oceanGetOceanKillAirSec(env, enemy), before = st.oxygenCur;
    if (seconds <= 0) return 0;
    const drainPerSec = env.deps.getOceanOxygenDrainPerSec(owner) * Math.max(0.1, Number(oceanGetOceanFishingStrategyDef(env, owner, st).oxygenDrainMul) || 1);
    st.oxygenCur = Math.min(st.oxygenMax, st.oxygenCur + drainPerSec * seconds);
    return Math.round((st.oxygenCur - before) / drainPerSec);
  }
  function oceanGetOceanKillDescentM(env, enemy) {
    const rule = env.deps.OCEAN_COMBAT_DIVE, gearPct = Math.max(0, Number(env.deps.getPlayerStats().oceanDepthGainPct) || 0);
    return rule.metersPerKill * (enemy.isElite ? rule.eliteKillMul : 1) * (1 + gearPct / 100);
  }
  function oceanGetOceanKillAirSec(env, enemy) {
    const air = env.deps.OCEAN_COMBAT_DIVE.air;
    if (enemy.oceanAirAdd) return air.guardianAddSec;
    if (enemy.isElite) return air.eliteSec;
    return enemy.monsterVisualId === air.carrier ? air.carrierSec : 0;
  }

  // modules/domain/ocean-progress-oxygen.mjs
  function* oceanApplyOceanDrowningDamage(env, owner, st, dtSec) {
    if (!st || !(dtSec > 0)) return;
    if (!st.drowning) {
      st.drowning = true;
      st.drownSec = 0;
      yield { kind: "progressLog", args: [env.deps._t("🫨 산소가 바닥났습니다! 익사 피해가 점점 커지니 즉시 수면으로 복귀하세요."), "attack-monster"] };
    }
    st.drownSec = (Number(st.drownSec) || 0) + dtSec;
    let dmg = drowningDamage(env, owner, st, dtSec);
    let curHp = Math.max(0, Number(owner.playerHp) || 0);
    if (dmg >= curHp - 1) {
      owner.playerHp = Math.max(1, curHp);
      yield* oceanForceSurfaceOcean(env, owner, "oxygen");
      return;
    }
    owner.playerHp = curHp - dmg;
  }
  function drowningDamage(env, owner, st, dtSec) {
    let pStats = typeof env.deps.getPlayerStats === "function" ? env.deps.getPlayerStats() : null;
    let maxHp = Math.max(1, Math.floor(pStats && pStats.maxHp || owner.playerHp || 1));
    let dmgPct = 3 + st.drownSec * 3;
    return maxHp * (dmgPct / 100) * dtSec;
  }
  function oceanIsInOceanZone(env, owner) {
    return owner.currentZoneId === env.deps.OCEAN_ZONE_ID;
  }
  function* oceanTickOceanOxygen(env, owner, nowMs) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving) return;
    if (!oceanIsInOceanZone(env, owner)) {
      st.lastTickAt = nowMs;
      return;
    }
    let last = Math.max(0, Number(st.lastTickAt) || nowMs);
    let dtSec = Math.max(0, Math.min(5, (nowMs - last) / 1e3));
    st.lastTickAt = nowMs;
    if (dtSec <= 0) return;
    let drainPerSec = activeOceanDrain(env, owner, st);
    st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, st.oxygenCur - drainPerSec * dtSec));
    if (st.oxygenCur <= 0) {
      yield* oceanApplyOceanDrowningDamage(env, owner, st, dtSec);
      return;
    }
    st.drowning = false;
    st.drownSec = 0;
    yield* oceanTickOceanDepth(env, st, dtSec);
  }
  function activeOceanDrain(env, owner, st) {
    let drainPerSec = env.deps.getOceanOxygenDrainPerSec(owner);
    drainPerSec *= Math.max(0.1, Number(oceanGetOceanFishingStrategyDef(env, owner, st).oxygenDrainMul) || 1);
    let leechAlive = (owner.enemies || []).some((e) => e && e.hp > 0 && e.trait && e.trait.oceanOxygenLeechOnHit);
    if (leechAlive) drainPerSec *= 1.4;
    let pressureCrushMul = (owner.enemies || []).reduce((mul, enemy) => {
      if (!enemy || enemy.hp <= 0 || !enemy.trait) return mul;
      return Math.max(mul, Number(enemy.trait.oceanPressureGainMul) || 1);
    }, 1);
    return drainPerSec * pressureCrushMul;
  }

  // modules/domain/ocean-progress.mjs
  function createOceanProgress(deps) {
    const env = { deps };
    return Object.freeze({
      getOceanFishingStrategyDef: (...args) => oceanGetOceanFishingStrategyDef(env, ...args),
      getOceanFishCollectionProgress: (...args) => oceanGetOceanFishCollectionProgress(env, ...args),
      getOceanFishCollectionBonus: (...args) => oceanGetOceanFishCollectionBonus(env, ...args),
      setOceanFishingStrategy: (...args) => oceanSetOceanFishingStrategy(env, ...args),
      claimOceanFishCollectionMilestone: (...args) => oceanClaimOceanFishCollectionMilestone(env, ...args),
      advanceOceanDiveFromKill: (...args) => oceanAdvanceOceanDiveFromKill(env, ...args),
      getOceanPermanentUpgradeCost: (...args) => oceanGetOceanPermanentUpgradeCost(env, ...args),
      canPayOceanUpgradeCost: oceanCanPayOceanUpgradeCost,
      upgradeOceanPermanent: (...args) => oceanUpgradeOceanPermanent(env, ...args),
      installOceanReefFragment: (...args) => oceanInstallOceanReefFragment(env, ...args),
      enterOceanDive: (...args) => oceanEnterOceanDive(env, ...args),
      getOceanShallowLiftM: (...args) => oceanGetOceanShallowLiftM(env, ...args),
      forceSurfaceOcean: (...args) => oceanForceSurfaceOcean(env, ...args),
      recordOceanSurface: (...args) => oceanRecordOceanSurface(env, ...args),
      forgetOceanAutoDive: oceanForgetOceanAutoDive,
      setOceanAutoRedive: (...args) => oceanSetOceanAutoRedive(env, ...args),
      tickOceanOxygen: (...args) => oceanTickOceanOxygen(env, ...args),
      tickOceanDepth: (...args) => oceanTickOceanDepth(env, ...args),
      applyOceanKill: (...args) => oceanApplyOceanKill(env, ...args),
      getOceanKillAirSec: (...args) => oceanGetOceanKillAirSec(env, ...args)
    });
  }

  // modules/data/ocean-workshop.mjs
  var ocean_workshop_exports = {};
  __export(ocean_workshop_exports, {
    OCEAN_WORKBENCH_OPTIONS: () => OCEAN_WORKBENCH_OPTIONS,
    SEA_GIFT_ITEM_EFFECT_TYPES: () => SEA_GIFT_ITEM_EFFECT_TYPES,
    SEA_GIFT_RANDOM_ORB_KEYS: () => SEA_GIFT_RANDOM_ORB_KEYS,
    SEA_GIFT_RECIPES: () => SEA_GIFT_RECIPES
  });
  var OCEAN_WORKBENCH_OPTIONS = [
    { id: "oceanBossSlayer", label: "심연의 보스 학살", desc: "보스에게 가하는 피해가 증가합니다. (일반 옵션으로는 등장하지 않는 전용 스탯)", statId: "bossDamagePct", min: 18, max: 28 },
    { id: "oceanEliteHunter", label: "심연의 정예 사냥", desc: "정예 몬스터에게 가하는 피해가 증가합니다.", statId: "eliteDamagePct", min: 16, max: 24 },
    { id: "oceanFirstStrike", label: "심연의 선제 일격", desc: "생명력이 가득 찬 적에게 가하는 첫 타에 추가 피해를 줍니다.", statId: "firstStrikeDamagePct", min: 20, max: 30 },
    { id: "oceanCuller", label: "심연의 처형자", desc: "생명력이 일정 % 이하인 보스가 아닌 적을 즉시 처치합니다.", statId: "cullStrikePct", min: 6, max: 10 },
    { id: "oceanLeviathanCrown", label: "리바이어던의 권능", desc: "보스 처치 피해를 가장 높게 보장하는 최상위 전용 옵션입니다.", statId: "bossDamagePct", min: 32, max: 42 }
  ];
  var SEA_GIFT_RANDOM_ORB_KEYS = ["magicBud", "sapBud", "formlessDew", "goldenRule", "blessing", "emberBranch", "pruningShears"];
  var SEA_GIFT_RECIPES = [
    { "id": "reefBundle", "requires": { "shallowSilverfin": 5 }, "effect": { "type": "currency", "key": "reefFragment", "amount": 2 }, "title": "암초 조각", "group": "supply" },
    { "id": "tidalCharm", "requires": { "tidalEel": 4 }, "effect": { "type": "currency", "key": "oceanRerollShard", "amount": 1 }, "title": "심해의 파편", "group": "supply" },
    { "id": "abyssalCache", "requires": { "abyssAngler": 2, "glowfinTrout": 2 }, "effect": { "type": "randomCurrency", "amount": 2 }, "title": "무작위 제작 재화", "group": "supply" },
    { "id": "safeReroll", "requires": { "glowfinTrout": 3, "shallowSilverfin": 4 }, "effect": { "type": "safeReroll" }, "title": "수치 다듬기", "group": "equipment" },
    { "id": "tierStepUp", "requires": { "abyssAngler": 3, "glowfinTrout": 3 }, "effect": { "type": "tierStepUp" }, "title": "등급 올리기", "group": "equipment" },
    { "id": "categoryShift", "requires": { "glowfinTrout": 3, "tidalEel": 3 }, "effect": { "type": "convertCategoryMod" }, "title": "계열 바꾸기", "group": "equipment" },
    { "id": "sealOffering", "requires": { "tidelordKoi": 1, "glowfinTrout": 3 }, "effect": { "type": "lockMod", "count": 1 }, "title": "옵션 봉인", "group": "equipment" },
    { "id": "echoMod", "requires": { "voidLeviathanSpawn": 1, "abyssAngler": 3 }, "effect": { "type": "echoMod" }, "title": "옵션 복사", "group": "equipment" },
    { "id": "crushDepthScar", "requires": { "prismaticHorror": 2, "tidelordKoi": 1, "abyssAngler": 2 }, "effect": { "type": "fixedBenchOption" }, "title": "심해 옵션", "group": "equipment" },
    { "id": "leviathanSigil", "requires": { "kingLeviathan": 2, "tidelordKoi": 2, "voidLeviathanSpawn": 1 }, "effect": { "type": "fixedBenchOption", "topTier": true }, "title": "리바이어던의 권능", "group": "equipment" }
  ];
  var SEA_GIFT_ITEM_EFFECT_TYPES = /* @__PURE__ */ new Set(["safeReroll", "tierStepUp", "convertCategoryMod", "lockMod", "echoMod", "fixedBenchOption"]);

  // modules/domain/ocean-workshop.mjs
  function workshopGetModCategory(deps, mod) {
    let statId = mod && (mod.statId || mod.id) || "";
    let found = deps.categoryRules.find((rule) => rule.ids.includes(statId));
    return found ? found.category : "특수";
  }
  function workshopGetOceanWorkbenchOption(topTierOnly) {
    if (topTierOnly) return OCEAN_WORKBENCH_OPTIONS.find((opt) => opt.id === "oceanLeviathanCrown");
    return OCEAN_WORKBENCH_OPTIONS[Math.floor(Math.random() * (OCEAN_WORKBENCH_OPTIONS.length - 1))];
  }
  function workshopGetSeaGiftTierStepRows(deps, item) {
    return workshopGetSeaGiftRerollRows(deps, item).filter((row) => {
      let cap = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
      return Math.max(1, Math.floor(Number(row.stat.tier) || 1)) < cap;
    });
  }
  function workshopGetSeaGiftRerollRow(deps, item, index) {
    let stat = item && Array.isArray(item.stats) ? item.stats[index] : null;
    if (!stat || stat.lockedByHoney || stat.lockedByRift || stat.isEchoMod || deps.equipmentCrafting.storedAffixKind(item, stat) === "special") return null;
    let probe = { ...item, stats: item.stats.filter((row, rowIndex) => rowIndex !== index) };
    let stored = deps.findStoredEquipmentAffix(item, stat);
    let mod = stored && deps.getAvailableMods(probe).find((row) => row.id === stored.id);
    return mod ? { index, stat, mod } : null;
  }
  function workshopRollSeaGiftExistingAffix(deps, row, tierBoost) {
    let currentTier = Math.max(1, Math.floor(Number(row.stat.tier) || 1));
    let maxTier = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
    let targetTier = Math.min(maxTier, currentTier + Math.max(0, Math.floor(tierBoost || 0)));
    return deps.rollAffixValueInTierRange(row.mod, targetTier, targetTier);
  }
  function workshopGetSeaGiftRerollRows(deps, item, category) {
    return (item.stats || []).map((stat, index) => {
      if (category && workshopGetModCategory(deps, stat) !== category) return null;
      return workshopGetSeaGiftRerollRow(deps, item, index);
    }).filter(Boolean);
  }
  function workshopGetSeaGiftLineCap(deps, item) {
    const rule = deps.EXPLICIT_AFFIX_RULES[item.rarity];
    return rule ? Math.min(deps.EXPLICIT_AFFIX_LINE_CAP, rule.prefix + rule.suffix) : deps.EXPLICIT_AFFIX_LINE_CAP;
  }
  function workshopGetSeaGiftEchoTargets(deps, item, editableIdx, srcIdx) {
    const targetsForSource = (index) => {
      const kind = deps.equipmentCrafting.storedAffixKind(item, item.stats[index]), room = deps.equipmentCrafting.affixRoom(item);
      const others = editableIdx.filter((target) => target !== index);
      if (!room || kind === "special" || room[kind] > 0) return others;
      return others.filter((target) => deps.equipmentCrafting.storedAffixKind(item, item.stats[target]) === kind);
    };
    if (srcIdx === void 0) {
      const maxTier = editableIdx.reduce((max, index) => Math.max(max, Number(item.stats[index].tier) || 0), 0);
      return editableIdx.filter((index) => (Number(item.stats[index].tier) || 0) === maxTier).map((sourceIndex) => ({ sourceIndex, targetIndexes: targetsForSource(sourceIndex) })).filter((choice) => choice.targetIndexes.length);
    }
    return targetsForSource(srcIdx);
  }
  function workshopGetSeaGiftEditableIndexes(deps, item) {
    return (item.stats || []).map((s, i) => s && !s.lockedByHoney && !s.lockedByRift ? i : -1).filter((i) => i >= 0);
  }
  function workshopApplySeaGiftBenchOption(deps, item, effect, craft) {
    let option = workshopGetOceanWorkbenchOption(!!effect.topTier);
    if (!option) return workshopRefuse(deps, craft, "적용할 수 있는 고정 옵션이 없습니다.");
    let minInt = Math.floor(option.min);
    let maxInt = Math.floor(option.max);
    let val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
    let rolled = { id: option.statId, val, valMin: minInt, valMax: maxInt, tier: 5, statName: deps.getStatName(option.statId), oceanBenchOptionId: option.id };
    const idx = workshopGetSeaGiftBenchSlot(deps, item);
    if (idx === null) return workshopRefuse(deps, craft, "바꿀 수 있는 줄이 없습니다.");
    if (idx < 0) item.stats.push(rolled);
    else item.stats[idx] = rolled;
    deps.updateItemName(item);
  }
  function workshopGetSeaGiftBenchSlot(deps, item) {
    const own = (item.stats || []).findIndex((stat) => stat && stat.oceanBenchOptionId && !stat.isEchoMod && !stat.lockedByHoney && !stat.lockedByRift);
    if (own >= 0) return own;
    if (deps.getItemExplicitOptionCount(item) < workshopGetSeaGiftLineCap(deps, item)) return -1;
    const low = workshopGetSeaGiftLowestLineIndex(deps, item);
    return low < 0 ? null : low;
  }
  function workshopGetSeaGiftLowestLineIndex(deps, item) {
    const tierOf = (index) => Number(item.stats[index].tier) || 0;
    return workshopGetSeaGiftEditableIndexes(deps, item).filter((index) => !deps.isFixedEquipmentAffix(item.stats[index])).reduce((low, index) => low < 0 || tierOf(index) <= tierOf(low) ? index : low, -1);
  }
  function workshopApplySeaGiftEcho(deps, item, effect, craft) {
    const choices = workshopGetSeaGiftEchoTargets(deps, item, workshopGetSeaGiftEditableIndexes(deps, item));
    if (!choices.length) return workshopRefuse(deps, craft, "메아리 줄을 넣을 같은 종류 자리가 없습니다(접두 3, 접미 3).");
    const choice = choices[Math.floor(Math.random() * choices.length)];
    const dstIdx = choice.targetIndexes[Math.floor(Math.random() * choice.targetIndexes.length)];
    const source = item.stats[choice.sourceIndex];
    let echo = workshopMakeSeaGiftEchoLine(deps, source, deps.equipmentCrafting.storedAffixKind(item, source));
    item.stats[dstIdx] = echo;
    craft.say(deps._t("🔊 {echoOf} 옵션이 50% 효과로 메아리쳤습니다.", { echoOf: echo.echoOf }), "loot-rare");
    deps.updateItemName(item);
  }
  function workshopMakeSeaGiftEchoLine(deps, src, kind) {
    let echo = JSON.parse(JSON.stringify(src));
    const halve = (line) => {
      for (const key of ["val", "valMin", "valMax", "baseRollMin", "baseRollMax", "originalVal", "valueStep"]) {
        if (Number.isFinite(line[key])) line[key] = Number((line[key] / 2).toFixed(3));
      }
    };
    halve(echo);
    (echo.extraStats || []).forEach(halve);
    delete echo.oceanBenchOptionId;
    delete echo.fossilExclusive;
    delete echo.fossilExclusiveDrop;
    delete echo.fossilExclusiveSpore;
    if (echo.craftSource === "fossil") delete echo.craftSource;
    echo.echoKind = kind;
    echo.echoOf = src.statName || deps.getStatName(src.id);
    echo.isEchoMod = true;
    return echo;
  }
  function workshopIsSeaGiftEquipmentTarget(deps, owner, item) {
    if (!item || !Array.isArray(item.stats)) return false;
    return deps.getEquipCandidateSlots(item).some((slot) => Object.hasOwn(owner.equipment || {}, slot));
  }
  function workshopGetSeaGiftTargetBlockReason(deps, owner, item) {
    if (!item) return "대상 선택 필요";
    if (!workshopIsSeaGiftEquipmentTarget(deps, owner, item)) return "일반 장비만 가공 가능";
    if (owner.woodsmanBuildLock) return "세팅 변경 잠김";
    if (item.hallReplica) return "전당 소장품 가공 불가";
    if (item.fusedRelic) return "융합 유물 가공 불가";
    return item.corrupted ? "타락 장비 가공 불가" : "";
  }
  function workshopCategoryChoices(deps, item, category) {
    const pool = deps.getAvailableMods(item).filter((mod) => !category || workshopGetModCategory(deps, mod) === category);
    return deps.equipmentCrafting.pickReplacement(item, pool, workshopGetSeaGiftEditableIndexes(deps, item), null, "all");
  }
  function workshopEchoBlock(deps, item) {
    if ((item.stats || []).some((stat) => stat && stat.isEchoMod)) return "메아리 줄 있음";
    const editable = workshopGetSeaGiftEditableIndexes(deps, item);
    if (editable.length < 2) return "봉인 안 된 2줄 필요";
    return workshopGetSeaGiftEchoTargets(deps, item, editable).length ? "" : "메아리 줄을 넣을 같은 종류 자리 없음";
  }
  var blockers = {
    safeReroll: (deps, item) => workshopGetSeaGiftRerollRows(deps, item).length ? "" : "굴릴 줄 없음",
    tierStepUp: (deps, item) => workshopGetSeaGiftTierStepRows(deps, item).length ? "" : "올릴 줄 없음",
    lockMod: (deps, item) => workshopGetSeaGiftEditableIndexes(deps, item).length ? "" : "봉인할 줄 없음",
    echoMod: workshopEchoBlock,
    fixedBenchOption: (deps, item) => workshopGetSeaGiftBenchSlot(deps, item) === null ? "바꿀 줄 없음" : "",
    convertCategoryMod: (deps, item, category) => workshopCategoryChoices(deps, item, category).length ? "" : "해당 계열로 변환할 자리 없음"
  };
  function workshopGetSeaGiftEffectBlockReason(deps, item, effect, category) {
    if (item.rarity === "unique" && effect.type !== "lockMod") return "고유 장비 가공 불가";
    if (category && !deps.categoryRules.some((row) => row.category === category)) return "옵션 계열을 확인하세요.";
    return Object.hasOwn(blockers, effect.type) ? blockers[effect.type](deps, item, category) : "이 제작법을 적용할 수 없습니다.";
  }
  function workshopQuantityOf(deps, recipe, stock, count) {
    const batchLimit = recipe.group === "supply" ? 100 : 1;
    const maxCrafts = Math.min(batchLimit, ...Object.entries(recipe.requires).map(([key, need]) => Math.floor((stock[key] || 0) / need)));
    const valid = Number.isInteger(count) && count >= 1 && count <= batchLimit;
    return { count, batchLimit, maxCrafts, valid, materialReady: valid && maxCrafts >= count };
  }
  function workshopGetSeaGiftRecipeStatus(deps, owner, recipeId, request = {}) {
    const recipe = SEA_GIFT_RECIPES.find((row) => row.id === recipeId);
    if (!recipe) return null;
    const state = deps.ensureOceanState(owner), quantity = workshopQuantityOf(deps, recipe, state.fishStock, request.count === void 0 ? 1 : request.count);
    const item = recipe.group === "equipment" ? request.item : null;
    let reason = "";
    if (!quantity.valid) reason = "제작 횟수를 확인하세요.";
    else if (!state.unlocked) reason = "심해 해금 필요";
    else if (!quantity.materialReady) reason = "재료 부족";
    else if (recipe.group === "equipment") reason = workshopGetSeaGiftTargetBlockReason(deps, owner, item) || workshopGetSeaGiftEffectBlockReason(deps, item, recipe.effect, request.category);
    return { recipe, ready: !reason, ...quantity, reason, item, owned: state.fishStock };
  }
  function workshopRefuse(deps, craft, message) {
    craft.say(message, "attack-monster");
    return false;
  }
  function workshopSafeReroll(deps, item, effect, craft) {
    const rows = workshopGetSeaGiftRerollRows(deps, item), row = rows[Math.floor(Math.random() * rows.length)];
    const rolled = workshopRollSeaGiftExistingAffix(deps, row, 0);
    const oldParts = [row.stat, ...row.stat.extraStats || []], newParts = [rolled, ...rolled.extraStats || []];
    const noDecrease = oldParts.length === newParts.length && oldParts.every((part, index) => newParts[index].id === part.id && Number(newParts[index].val) >= Number(part.val));
    if (noDecrease) item.stats[row.index] = rolled;
    else craft.say("🌊 재굴림 결과가 기존보다 낮아 적용을 취소했습니다.", "loot-magic");
    deps.updateItemName(item);
  }
  var effects = {
    safeReroll: workshopSafeReroll,
    tierStepUp: (deps, item) => {
      const rows = workshopGetSeaGiftTierStepRows(deps, item), row = rows[Math.floor(Math.random() * rows.length)];
      item.stats[row.index] = workshopRollSeaGiftExistingAffix(deps, row, 1);
      deps.updateItemName(item);
    },
    lockMod: (deps, item) => {
      item.stats[workshopGetSeaGiftEditableIndexes(deps, item)[0]].lockedByHoney = true;
    },
    echoMod: workshopApplySeaGiftEcho,
    fixedBenchOption: workshopApplySeaGiftBenchOption,
    convertCategoryMod: (deps, item, effect, craft) => {
      const pool = deps.getAvailableMods(item).filter((mod) => !craft.category || workshopGetModCategory(deps, mod) === craft.category);
      const choice = deps.equipmentCrafting.pickReplacement(item, pool, workshopGetSeaGiftEditableIndexes(deps, item), deps.pickWeightedMod);
      if (!choice) return workshopRefuse(deps, craft, "해당 계열로 변환할 수 있는 옵션이 없습니다.");
      item.stats[choice.index] = deps.rollAffixValue(choice.mod, deps.getItemCraftTier(item));
      deps.updateItemName(item);
    }
  };
  function* workshopSupplyReward(deps, effect, count) {
    if (effect.type === "currency") {
      yield { kind: "oceanCraftCurrency", args: [effect.key, effect.amount * count] };
      return;
    }
    const gains = /* @__PURE__ */ new Map();
    for (let i = 0; i < effect.amount * count; i++) {
      const key = SEA_GIFT_RANDOM_ORB_KEYS[Math.floor(Math.random() * SEA_GIFT_RANDOM_ORB_KEYS.length)];
      yield { kind: "oceanCraftCurrency", args: [key, 1] };
      gains.set(key, (gains.get(key) || 0) + 1);
    }
    for (const [key, amount] of gains) yield { kind: "oceanCraftLog", args: [`🎲 ${deps.ORB_DB[key].name} +${amount}`, "loot-rare"] };
  }
  function* workshopCraftSeaGift(deps, owner, recipeId, request = {}) {
    const status = workshopGetSeaGiftRecipeStatus(deps, owner, recipeId, request);
    if (!status) return false;
    if (!status.ready) {
      yield { kind: "oceanCraftLog", args: [deps._t("바다의 선물: {reason}", { reason: status.reason }), "attack-monster"] };
      return false;
    }
    const { recipe, item } = status;
    if (recipe.group === "supply") yield* workshopSupplyReward(deps, recipe.effect, status.count);
    else {
      const logs = [], craft = { category: request.category, say: (...args) => logs.push(args) };
      const success = effects[recipe.effect.type](deps, item, recipe.effect, craft) !== false;
      for (const args of logs) yield { kind: "oceanCraftLog", args };
      if (!success) return false;
    }
    const state = deps.ensureOceanState(owner);
    for (const [key, need] of Object.entries(recipe.requires)) state.fishStock[key] = Math.max(0, Math.floor(state.fishStock[key] || 0) - need * status.count);
    yield { kind: "oceanCraftLog", args: [deps._t("🎁 바다의 선물 {count}회 제작", { count: status.count }), "loot-rare"] };
    if (item) yield { kind: "oceanCraftNormalize", args: [item] };
    yield { kind: "oceanCraftSave", args: [200] };
    return true;
  }
  function createOceanWorkshop(deps) {
    return Object.freeze({
      getModCategory: (...args) => workshopGetModCategory(deps, ...args),
      getSeaGiftTierStepRows: (...args) => workshopGetSeaGiftTierStepRows(deps, ...args),
      getSeaGiftRerollRows: (...args) => workshopGetSeaGiftRerollRows(deps, ...args),
      getSeaGiftEchoTargets: (...args) => workshopGetSeaGiftEchoTargets(deps, ...args),
      getSeaGiftEditableIndexes: (...args) => workshopGetSeaGiftEditableIndexes(deps, ...args),
      getSeaGiftBenchSlot: (...args) => workshopGetSeaGiftBenchSlot(deps, ...args),
      isSeaGiftEquipmentTarget: (...args) => workshopIsSeaGiftEquipmentTarget(deps, ...args),
      getSeaGiftTargetBlockReason: (...args) => workshopGetSeaGiftTargetBlockReason(deps, ...args),
      getSeaGiftEffectBlockReason: (...args) => workshopGetSeaGiftEffectBlockReason(deps, ...args),
      getSeaGiftRecipeStatus: (...args) => workshopGetSeaGiftRecipeStatus(deps, ...args),
      craftSeaGift: (...args) => workshopCraftSeaGift(deps, ...args)
    });
  }

  // modules/domain/ocean-shard.mjs
  function shardBlockReason(deps, owner, item) {
    if (!item) return "아이템을 선택하세요.";
    if (!Array.isArray(item.stats) || item.stats.length === 0) return "재굴림할 수 있는 옵션 줄이 없습니다.";
    const locked = deps.equipmentCrafting.buildLockReason(owner);
    if (locked) return locked;
    if (item.corrupted) return "타락한 아이템은 더 이상 제작할 수 없습니다.";
    if (item.fusedRelic) return "융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.";
    return item.rarity === "unique" ? "고유 장비에는 쓸 수 없습니다." : "";
  }
  function* shardReroll(deps, owner, item, payment) {
    const blocked = shardBlockReason(deps, owner, item);
    if (blocked) {
      yield { kind: "oceanCraftLog", args: [blocked, "attack-monster"] };
      return false;
    }
    const key = payment.currency || "oceanRerollShard";
    const cost = Math.max(0, Math.floor(payment.amount || 1));
    if ((owner.currencies[key] || 0) < cost) {
      yield { kind: "oceanCraftLog", args: [deps._t("재화가 부족합니다."), "attack-monster"] };
      return false;
    }
    const editable = item.stats.map((stat, i) => stat && !stat.lockedByHoney && !stat.lockedByRift ? i : -1).filter((i) => i >= 0);
    if (editable.length === 0) {
      yield { kind: "oceanCraftLog", args: [deps._t("재굴림할 수 있는 옵션 줄이 없습니다."), "attack-monster"] };
      return false;
    }
    const choice = deps.equipmentCrafting.pickReplacement(item, deps.getAvailableMods(item), editable, (mods) => deps.pickRandomMods(mods, 1)[0]);
    if (!choice) {
      yield { kind: "oceanCraftLog", args: [deps._t("이 장비에서 새로 굴릴 수 있는 옵션이 없습니다."), "attack-monster"] };
      return false;
    }
    const maxTier = Math.max(1, Math.floor(deps.getItemCraftTier(item) || 1));
    owner.currencies[key] = (owner.currencies[key] || 0) - cost;
    item.stats[choice.index] = deps.rollAffixValue(choice.mod, maxTier, { roundInteger: true });
    deps.updateItemName(item);
    yield { kind: "oceanShardApplied", args: [item] };
    return true;
  }
  function createOceanShard(deps) {
    return Object.freeze({
      blockReason: (owner, item) => shardBlockReason(deps, owner, item),
      reroll: (owner, item, currency, amount) => shardReroll(deps, owner, item, { currency, amount })
    });
  }

  // modules/ui/ocean-workshop-effects.mjs
  function createOceanWorkshopEffects(deps) {
    return Object.freeze({
      oceanCraftCurrency: (...args) => deps.awardCurrency(...args),
      oceanCraftLog: (...args) => deps.addLog(...args),
      oceanCraftNormalize: (item) => deps.normalizeItem(item),
      oceanCraftSave: (delay) => deps.queueImportantSave(delay),
      oceanShardApplied: (item) => deps.addLog(deps._t(
        "🌊 {name}의 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 교체했습니다.",
        { name: deps.getItemDisplayName(item) || deps._t("장비") }
      ), "loot-rare")
    });
  }

  // modules/domain/passive-allocation-roots.mjs
  function allocationHasAuthoredPassiveTreeSource(env) {
    return typeof env.deps.PASSIVE_TREE_V22 !== "undefined" && env.deps.PASSIVE_TREE_V22 && env.deps.PASSIVE_TREE_V22.nodes && env.deps.PASSIVE_TREE_V22.edges;
  }
  function allocationHasAuthoredPassiveTree(env) {
    if (!allocationHasAuthoredPassiveTreeSource(env) || env.deps.PASSIVE_TREE.layoutVersion !== env.deps.PASSIVE_TREE_V22.version) return false;
    return Object.values(env.deps.PASSIVE_TREE_V22.classStarts || {}).some((nodeId) => !!env.deps.PASSIVE_TREE.nodes[nodeId]);
  }
  function allocationGetPassiveTreeRootNodeId(env, owner) {
    if (!allocationHasAuthoredPassiveTree(env)) return "n0";
    const source = owner || {};
    const classId = source.selectedClassId || "warrior";
    return env.deps.PASSIVE_TREE_V22.classStarts[classId] || env.deps.PASSIVE_TREE_V22.classStarts.warrior;
  }
  function allocationGetPassiveTreeRootNode(env, owner) {
    return env.deps.PASSIVE_TREE.nodes[allocationGetPassiveTreeRootNodeId(env, owner)] || null;
  }
  function allocationGetPassiveGatedStartIds(env, owner) {
    const opened = (owner.passives || []).map((id) => env.deps.PASSIVE_TREE.nodes[id]).filter((node) => node && node.kind === "keystone" && env.deps.PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]);
    return new Set(opened.map((node) => env.deps.PASSIVE_TREE_V22.classStarts[env.deps.PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]]).filter(Boolean));
  }
  function allocationGetPassiveBlockedStartIds(env, owner) {
    const hasGates = Object.values(env.deps.PASSIVE_TREE.nodes).some((node) => node.kind === "keystone" && env.deps.PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]);
    if (!hasGates) return /* @__PURE__ */ new Set();
    const gated = allocationGetPassiveGatedStartIds(env, owner), rootId = allocationGetPassiveTreeRootNodeId(env, owner);
    return new Set(Object.values(env.deps.PASSIVE_TREE.nodes).filter((node) => node.kind === "start" && node.id !== rootId && !gated.has(node.id)).map((node) => node.id));
  }
  function allocationGetPassiveRouting(env, owner) {
    const allocated = new Set(owner.passives || []);
    return {
      root: allocationGetPassiveTreeRootNodeId(env, owner),
      virtual: env.deps.passiveRouting.transcendentNodeIds(owner, "blackHole"),
      free: env.deps.passiveRouting.freeNodes(env.deps.PASSIVE_TREE, owner),
      passable: allocationGetPassiveGatedStartIds(env, owner),
      edges: env.deps.PASSIVE_TREE.edges.filter((edge) => env.deps.isPassiveTreePathEdge(owner, edge, allocated))
    };
  }

  // modules/domain/passive-allocation-availability.mjs
  function allocationIsPassiveNodeAvailable(env, owner, nodeOrId) {
    let node = typeof nodeOrId === "string" ? env.deps.PASSIVE_TREE.nodes[nodeOrId] : nodeOrId;
    if (!node || node.requiresEvolution && !(owner && owner.passiveStarEvolution)) return false;
    if (node.hiddenByKeystoneId && !(owner && (owner.passives || []).includes(node.hiddenByKeystoneId))) return false;
    return !allocationIsVoidSocketHidden(env, owner, node);
  }
  function allocationIsVoidSocketHidden(env, owner, node) {
    if (!allocationNeedsVoidSockets(node) || !owner || typeof env.deps.contentProgression !== "object") return false;
    return !env.deps.contentProgression.isUnlocked("voidSocket", owner) && !(owner.passives || []).includes(node.id);
  }
  function allocationNeedsVoidSockets(node) {
    return node.kind === "void" || node.stat === "voidLinkEfficiency" || node.title === "공허의 별자리";
  }
  function allocationGetPassiveConnectionNodeIds(env, owner) {
    let result = new Set((owner && Array.isArray(owner.passives) ? owner.passives : []).filter((id) => allocationIsPassiveNodeAvailable(env, owner, id)).map(String));
    const rootId = allocationGetPassiveTreeRootNodeId(env, owner);
    if (allocationIsPassiveNodeAvailable(env, owner, rootId)) result.add(rootId);
    return result;
  }

  // modules/domain/passive-allocation-evolution.mjs
  function allocationGetPassiveApexNodeIds(env) {
    return Object.values(env.deps.PASSIVE_TREE.nodes).filter((node) => node.kind === "apex").map((node) => node.id);
  }
  function allocationGetPassiveOuterVoidNodes(env) {
    return Object.values(env.deps.PASSIVE_TREE.nodes || {}).filter((node) => node.kind === "void" && node.voidRing === "outer");
  }
  function allocationGetPassiveConstellationAwakeningProgress(env, owner) {
    const outerVoids = allocationGetPassiveOuterVoidNodes(env);
    const owned = new Set(owner && owner.passives || []);
    if (outerVoids.length === 0) {
      const apexIds = allocationGetPassiveApexNodeIds(env);
      return { mode: "legacy_apex", required: apexIds.length, completed: apexIds.filter((id) => owned.has(id)).length, allocated: 0 };
    }
    const allocated = outerVoids.filter((node) => owned.has(node.id));
    return { mode: "outer_void", required: outerVoids.length, allocated: allocated.length, completed: allocated.length };
  }
  function* allocationUnlockPassiveStarEvolution(env, owner, options) {
    options = options || {};
    if (!owner || owner.passiveStarEvolution) return false;
    const progress = allocationGetPassiveConstellationAwakeningProgress(env, owner);
    if (progress.required <= 0 || progress.completed < progress.required) return false;
    owner.passiveStarEvolution = true;
    owner.passiveStarEvolutionSource = progress.mode;
    yield { kind: "passiveJournal", args: ["passive_star_evolution", owner] };
    const revealIds = progress.mode === "outer_void" ? allocationGetPassiveOuterVoidNodes(env).map((node) => node.id) : allocationGetPassiveApexNodeIds(env);
    for (const id of revealIds) yield { kind: "passiveReveal", args: [id, {
      forcePulse: !options.silent,
      noBurst: !!options.silent,
      radius: env.deps.PASSIVE_DISCOVERY_RADIUS + 240,
      edgeDepth: 2
    }] };
    owner.noti.char = true;
    if (!options.silent) {
      yield { kind: "passiveLog", args: [env.deps._t("✨ 별의 공명이 일어납니다."), "loot-rare"] };
      yield { kind: "passiveTutorial", args: ["passive_star_evolution", env.deps._t("성좌 각성"), progress.mode === "outer_void" ? "직업 공허 소켓 여섯을 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해/생명력/이동 속도가 오릅니다." : "별끝 특수 노드를 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해/생명력/이동 속도가 오릅니다.", "tab-char"] };
    }
    return true;
  }

  // modules/domain/passive-allocation-changes.mjs
  function* allocationRebasePassiveTreeForClassChange(env, owner, previousClassId, nextClassId) {
    if (!allocationHasAuthoredPassiveTree(env) || previousClassId === nextClassId) return 0;
    const previousRoot = env.deps.PASSIVE_TREE_V22.classStarts[previousClassId];
    const nextRoot = env.deps.PASSIVE_TREE_V22.classStarts[nextClassId];
    if (!previousRoot || !nextRoot || previousRoot === nextRoot) return 0;
    const invested = (Array.isArray(owner.passives) ? owner.passives : []).filter((nodeId) => env.deps.PASSIVE_TREE.nodes[nodeId] && env.deps.PASSIVE_TREE.nodes[nodeId].kind !== "start");
    const hadOverflowKeystone = env.deps.hasAuthoredPassiveKeystone(owner, "의지의 공명");
    owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0) + invested.length - env.deps.passiveRouting.paleBonus(owner));
    owner.passives = [];
    owner.passiveAttributeChoices = {};
    owner.discoveredPassives = [nextRoot];
    if (hadOverflowKeystone) yield { kind: "passiveNormalizeSupport", args: [true, null, true] };
    yield { kind: "passiveRenderDirty", args: ["state"] };
    return invested.length;
  }
  function allocationSetPassiveRevelation(env, owner, revelationId) {
    if (!env.deps.PASSIVE_REVELATION_IDS.includes(revelationId)) return false;
    if (env.deps.getAllocatedPassiveStatValue(owner, "devotion") < 1) return false;
    if (env.deps.findAllocatedPassiveKeystone(owner, "삼중 계시")) return false;
    env.deps.ensurePassiveSpecializationState(owner).revelation = revelationId;
    return true;
  }

  // modules/domain/passive-allocation-paths.mjs
  function allocationGetPassiveActivationPath(env, owner, targetNodeId) {
    if (!owner || !targetNodeId || !allocationIsPassiveNodeAvailable(env, owner, targetNodeId)) return [];
    const targetNode = env.deps.PASSIVE_TREE.nodes[targetNodeId];
    if (targetNode && targetNode.kind === "start") return [];
    const connectionNodes = allocationGetPassiveConnectionNodeIds(env, owner);
    if (connectionNodes.has(String(targetNodeId))) return [];
    if (env.deps.passiveRouting.freeNodes(env.deps.PASSIVE_TREE, owner).has(String(targetNodeId))) return [String(targetNodeId)];
    const startNodes = activationStartNodes(env, owner, connectionNodes);
    if (startNodes.length === 0) return [];
    return findActivationPath(env, owner, targetNodeId, connectionNodes, startNodes);
  }
  function activationStartNodes(env, owner, connectionNodes) {
    const rootId = allocationGetPassiveTreeRootNodeId(env, owner);
    return connectionNodes.size > 0 ? Array.from(connectionNodes) : allocationIsPassiveNodeAvailable(env, owner, rootId) ? [rootId] : [];
  }
  function findActivationPath(env, owner, targetNodeId, connectionNodes, startNodes) {
    const queue = startNodes.slice();
    let queueIndex = 0;
    const previous = new Map(queue.map((id) => [id, null]));
    const adjacency = env.deps.getPassiveTreeAdjacency(owner);
    const blockedStarts = allocationGetPassiveBlockedStartIds(env, owner), openedStarts = allocationGetPassiveGatedStartIds(env, owner);
    const walkable = (id) => allocationIsPassiveNodeAvailable(env, owner, id) && !blockedStarts.has(id);
    while (queueIndex < queue.length && !previous.has(targetNodeId)) {
      const current2 = queue[queueIndex++];
      (adjacency.get(String(current2)) || []).forEach((next) => {
        if (previous.has(next) || !walkable(next)) return;
        previous.set(next, current2);
        queue.push(next);
      });
    }
    if (!previous.has(targetNodeId)) return [];
    const path = [];
    let current = targetNodeId;
    while (current && !connectionNodes.has(String(current))) {
      path.push(current);
      current = previous.get(current);
    }
    return path.reverse().filter((id) => !openedStarts.has(id));
  }
  function allocationGetPassiveKeystoneConflict(env, owner, path) {
    const owned = new Set(owner.passives || []), pending = new Set(path || []);
    const corruptId = env.deps.getPassiveKeystoneNodeId("타락한 복음");
    const tripleId = env.deps.getPassiveKeystoneNodeId("삼중 계시");
    if (owned.has(corruptId) && pending.has(tripleId) || owned.has(tripleId) && pending.has(corruptId)) {
      return env.deps._t("{title}, {title2}는 동시에 할당할 수 없습니다.", { title: env.deps.PASSIVE_TREE.nodes[corruptId].title, title2: env.deps.PASSIVE_TREE.nodes[tripleId].title });
    }
    return "";
  }
  function* allocationActivatePassivePath(env, owner, targetNodeId, options) {
    if (owner.woodsmanBuildLock) return { activated: false, cost: 0, path: [], reason: "locked", message: env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.") };
    if (!env.deps.contentProgression.canOpen("tab-char", owner)) return { activated: false, cost: 0, path: [], reason: "locked" };
    return yield* allocatePassivePath(env, owner, targetNodeId, options);
  }
  function* allocatePassivePath(env, owner, targetNodeId, options) {
    const path = allocationGetPassiveActivationPath(env, owner, targetNodeId);
    const failure = pathInvestmentFailure(env, owner, path, options);
    if (failure) return failure;
    const pointBudget = env.deps.passiveRouting.pointBudget(owner);
    for (const nodeId of path) {
      applyPathNode(env, owner, nodeId, options);
      yield { kind: "passiveReveal", args: [nodeId, { forcePulse: !options || options.forcePulseNodeId === nodeId }] };
    }
    owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0) - path.length);
    env.deps.passiveRouting.settlePoints(owner, pointBudget);
    env.deps.enforcePassiveEquipmentRestrictions(owner);
    return { activated: true, cost: path.length, path: path.slice() };
  }
  function pathInvestmentFailure(env, owner, path, options) {
    const expected = options && options.expectedPath;
    if (expected && (path.length !== expected.length || path.some((id, index) => id !== expected[index]))) {
      return {
        activated: false,
        cost: path.length,
        path: path.slice(),
        reason: "changed",
        message: env.deps._t("확인 중 연결 경로가 바뀌었습니다. 노드를 다시 선택해 주세요.")
      };
    }
    if (path.length === 0) return { activated: false, cost: 0, path: [] };
    const conflict = allocationGetPassiveKeystoneConflict(env, owner, path);
    if (conflict) return { activated: false, cost: path.length, path: path.slice(), reason: "conflict", message: conflict };
    if (Math.max(0, Math.floor(owner.passivePoints || 0)) < path.length) {
      return { activated: false, cost: path.length, path: path.slice(), reason: "points" };
    }
    return null;
  }
  function applyPathNode(env, owner, nodeId, options) {
    if (!(owner.passives || []).includes(nodeId)) owner.passives.push(nodeId);
    const node = env.deps.PASSIVE_TREE.nodes[nodeId];
    const attributeStat = options && options.attributeStat;
    if (node && node.kind === "attribute" && ["strength", "dexterity", "intelligence"].includes(attributeStat)) {
      owner.passiveAttributeChoices = owner.passiveAttributeChoices || {};
      owner.passiveAttributeChoices[nodeId] = attributeStat;
    }
  }
  function allocationGetPassiveLinkedNodeIds(env, owner, nodeId, maxDepth) {
    const rootId = nodeId;
    if (!allocationIsPassiveNodeAvailable(env, owner, rootId)) return [];
    const visited = /* @__PURE__ */ new Set([rootId]);
    let frontier = [rootId];
    const adjacency = env.deps.getPassiveTreeAdjacency(owner);
    const depthLimit = Math.max(0, maxDepth || 0);
    for (let depth = 0; depth < depthLimit; depth++) {
      const nextFrontier = [];
      frontier.forEach((current) => {
        (adjacency.get(String(current)) || []).forEach((next) => {
          if (visited.has(next) || !allocationIsPassiveNodeAvailable(env, owner, next)) return;
          visited.add(next);
          nextFrontier.push(next);
        });
      });
      if (nextFrontier.length === 0) break;
      frontier = nextFrontier;
    }
    visited.delete(rootId);
    return Array.from(visited);
  }

  // modules/domain/passive-allocation.mjs
  function createPassiveAllocation(deps) {
    const env = { deps };
    return Object.freeze({
      hasAuthoredPassiveTreeSource: (...args) => allocationHasAuthoredPassiveTreeSource(env, ...args),
      hasAuthoredPassiveTree: (...args) => allocationHasAuthoredPassiveTree(env, ...args),
      getPassiveTreeRootNodeId: (...args) => allocationGetPassiveTreeRootNodeId(env, ...args),
      getPassiveTreeRootNode: (...args) => allocationGetPassiveTreeRootNode(env, ...args),
      getPassiveGatedStartIds: (...args) => allocationGetPassiveGatedStartIds(env, ...args),
      getPassiveBlockedStartIds: (...args) => allocationGetPassiveBlockedStartIds(env, ...args),
      getPassiveRouting: (...args) => allocationGetPassiveRouting(env, ...args),
      isPassiveNodeAvailable: (...args) => allocationIsPassiveNodeAvailable(env, ...args),
      isVoidSocketHidden: (...args) => allocationIsVoidSocketHidden(env, ...args),
      getPassiveConnectionNodeIds: (...args) => allocationGetPassiveConnectionNodeIds(env, ...args),
      getPassiveApexNodeIds: (...args) => allocationGetPassiveApexNodeIds(env, ...args),
      getPassiveConstellationAwakeningProgress: (...args) => allocationGetPassiveConstellationAwakeningProgress(env, ...args),
      unlockPassiveStarEvolution: (...args) => allocationUnlockPassiveStarEvolution(env, ...args),
      rebasePassiveTreeForClassChange: (...args) => allocationRebasePassiveTreeForClassChange(env, ...args),
      setPassiveRevelation: (...args) => allocationSetPassiveRevelation(env, ...args),
      getPassiveActivationPath: (...args) => allocationGetPassiveActivationPath(env, ...args),
      getPassiveKeystoneConflict: (...args) => allocationGetPassiveKeystoneConflict(env, ...args),
      activatePassivePath: (...args) => allocationActivatePassivePath(env, ...args),
      getPassiveLinkedNodeIds: (...args) => allocationGetPassiveLinkedNodeIds(env, ...args)
    });
  }

  // modules/domain/passive-planner-migrations.mjs
  function plannerGetCurrentPassiveNodeId(env, rawId) {
    if (typeof rawId !== "string") return rawId;
    if (typeof env.deps.PASSIVE_NODE_ID_MIGRATIONS !== "object") return rawId;
    if (env.deps.PASSIVE_NODE_ID_MERGED[rawId]) return env.deps.PASSIVE_NODE_ID_MERGED[rawId];
    if (!env.deps.PASSIVE_NODE_ID_LEGACY_PREFIX.test(rawId)) return rawId;
    return env.deps.PASSIVE_NODE_ID_MIGRATIONS[rawId.replace(env.deps.PASSIVE_NODE_ID_LEGACY_PREFIX, "")] || rawId;
  }
  function plannerMigratePassiveNodeIdList(env, rawIds) {
    const ids = Array.isArray(rawIds) ? rawIds : [];
    return Array.from(new Set(ids.map((id) => plannerGetCurrentPassiveNodeId(env, id))));
  }
  function plannerMigratePassiveNodeIdRecord(env, rawRecord) {
    if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) return {};
    const migrated = {};
    Object.entries(rawRecord).forEach(([rawId, value]) => {
      const id = plannerGetCurrentPassiveNodeId(env, rawId);
      if (id === rawId || !Object.prototype.hasOwnProperty.call(migrated, id)) migrated[id] = value;
    });
    return migrated;
  }

  // modules/domain/passive-planner-state.mjs
  function plannerNormalizePassiveTreePreset(env, raw, slotIndex) {
    if (!raw || typeof raw !== "object") return null;
    const nodeIds = plannerMigratePassiveNodeIdList(env, raw.nodeIds).filter((id) => typeof id === "string" && env.deps.PASSIVE_TREE.nodes[id] && env.deps.PASSIVE_TREE.nodes[id].kind !== "start");
    const choices = plannerMigratePassiveNodeIdRecord(env, raw.attributeChoices);
    const attributeChoices = {};
    nodeIds.forEach((id) => {
      if (env.deps.PASSIVE_TREE.nodes[id].kind !== "attribute") return;
      const stat = choices[id];
      if (["strength", "dexterity", "intelligence"].includes(stat)) attributeChoices[id] = stat;
    });
    const fallbackName = env.deps._t("프리셋 {value}", { value: slotIndex + 1 });
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 24) : fallbackName;
    return { name, nodeIds, attributeChoices };
  }
  function plannerNormalizePassiveTreePlannerState(env, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const layoutMatches = Number(source.layoutVersion) === env.deps.PASSIVE_LAYOUT_VERSION;
    const slots = layoutMatches && Array.isArray(source.presets) ? source.presets : [];
    const presets = Array.from({ length: env.deps.PASSIVE_TREE_PRESET_SLOTS }, (_, index) => plannerNormalizePassiveTreePreset(env, slots[index], index));
    let activeSlot = Math.floor(Number(source.activeSlot));
    if (!Number.isFinite(activeSlot) || activeSlot < 0 || activeSlot >= env.deps.PASSIVE_TREE_PRESET_SLOTS) activeSlot = 0;
    return { layoutVersion: env.deps.PASSIVE_LAYOUT_VERSION, activeSlot, autoInvest: layoutMatches && !!source.autoInvest, presets };
  }
  function plannerEnsurePassiveTreePlannerState(env, owner) {
    owner.settings = owner.settings && typeof owner.settings === "object" ? owner.settings : {};
    owner.settings.passiveTreePlanner = plannerNormalizePassiveTreePlannerState(env, owner.settings.passiveTreePlanner);
    return owner.settings.passiveTreePlanner;
  }

  // modules/domain/passive-planner-presets.mjs
  function plannerSaveCurrentPassiveTreePreset(env, owner, slotIndex, name) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const slot = Math.max(0, Math.min(env.deps.PASSIVE_TREE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    const nodeIds = (owner.passives || []).filter((id) => env.deps.PASSIVE_TREE.nodes[id] && env.deps.PASSIVE_TREE.nodes[id].kind !== "start");
    const attributeChoices = {};
    nodeIds.forEach((id) => {
      const stat = (owner.passiveAttributeChoices || {})[id];
      if (["strength", "dexterity", "intelligence"].includes(stat)) attributeChoices[id] = stat;
    });
    planner.presets[slot] = plannerNormalizePassiveTreePreset(env, { name, nodeIds, attributeChoices }, slot);
    planner.activeSlot = slot;
    return planner.presets[slot];
  }
  function plannerSetActivePassiveTreePreset(env, owner, slotIndex) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const slot = Math.floor(Number(slotIndex));
    if (!Number.isFinite(slot) || slot < 0 || slot >= env.deps.PASSIVE_TREE_PRESET_SLOTS) return false;
    planner.activeSlot = slot;
    return true;
  }
  function plannerSetPassiveTreeAutoInvest(env, owner, enabled) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    planner.autoInvest = !!enabled;
    return planner.autoInvest;
  }
  function plannerEncodePassiveTreePreset(env, owner, slotIndex) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const preset = planner.presets[Math.floor(Number(slotIndex))];
    if (!preset) return "";
    const payload = JSON.stringify({ v: 1, layout: env.deps.PASSIVE_LAYOUT_VERSION, name: preset.name, nodeIds: preset.nodeIds, attributeChoices: preset.attributeChoices });
    return `PT1.${env.deps.encodePresetPayload(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
  }
  function plannerDecodePassiveTreePreset(env, code) {
    const raw = String(code || "").trim();
    if (!raw.startsWith("PT1.")) throw new Error("지원하지 않는 프리셋 코드입니다.");
    let body = raw.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    body += "=".repeat((4 - body.length % 4) % 4);
    const parsed = JSON.parse(env.deps.decodePresetPayload(body));
    if (!parsed || parsed.v !== 1) throw new Error("프리셋 버전이 올바르지 않습니다.");
    if (Number.isFinite(parsed.layout) && parsed.layout !== env.deps.PASSIVE_LAYOUT_VERSION) throw new Error("현재 스킬트리 배치와 호환되지 않는 프리셋입니다.");
    return parsed;
  }
  function plannerImportPassiveTreePreset(env, owner, slotIndex, code) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const slot = Math.max(0, Math.min(env.deps.PASSIVE_TREE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    const preset = plannerNormalizePassiveTreePreset(env, plannerDecodePassiveTreePreset(env, code), slot);
    if (!preset || preset.nodeIds.length === 0) throw new Error("투자 노드가 없는 프리셋입니다.");
    planner.presets[slot] = preset;
    planner.activeSlot = slot;
    return preset;
  }

  // modules/domain/passive-planner-investment.mjs
  function plannerGetPassiveAutoInvestPreset(env, owner) {
    if (owner.woodsmanBuildLock || !env.deps.contentProgression.canOpen("tab-char", owner)) return null;
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    return planner.autoInvest ? planner.presets[planner.activeSlot] : null;
  }
  function* plannerRunPassiveTreeAutoInvest(env, owner) {
    const preset = plannerGetPassiveAutoInvestPreset(env, owner);
    if (!preset) return { nodes: 0, points: 0 };
    const result = { nodes: 0, points: 0 };
    let guard = Math.min(preset.nodeIds.length + 1, Math.max(0, Math.floor(owner.passivePoints || 0)) + 1);
    while (guard-- > 0 && owner.passivePoints > 0) {
      const activated = yield* investNextPresetNode(env, owner, preset);
      if (!activated) break;
      result.nodes += activated.path.length;
      result.points += activated.cost;
    }
    if (result.nodes > 0) {
      yield { kind: "passiveReachable", args: [] };
      yield { kind: "passiveVisibility", args: [] };
    }
    return result;
  }
  function* investNextPresetNode(env, owner, preset) {
    const targetId = preset.nodeIds.find((id) => !(owner.passives || []).includes(id));
    if (!targetId) return null;
    const path = env.deps.allocation.getPassiveActivationPath(owner, targetId);
    if (path.length <= 0 || path.length > owner.passivePoints) return null;
    const attributeStat = preset.attributeChoices[targetId] || owner.passiveAttributePreference || "strength";
    const activated = yield* env.deps.allocation.activatePassivePath(owner, targetId, { attributeStat });
    if (!activated.activated || activated.cost <= 0) return null;
    yield* env.deps.allocation.unlockPassiveStarEvolution(owner, { silent: true });
    restorePresetAttributes(owner, preset, activated.path);
    return activated;
  }
  function restorePresetAttributes(owner, preset, path) {
    path.forEach((id) => {
      const savedStat = preset.attributeChoices[id];
      if (savedStat) owner.passiveAttributeChoices[id] = savedStat;
    });
  }

  // modules/domain/passive-planner.mjs
  function createPassivePlanner(deps) {
    const env = { deps };
    return Object.freeze({
      getCurrentPassiveNodeId: (...args) => plannerGetCurrentPassiveNodeId(env, ...args),
      migratePassiveNodeIdList: (...args) => plannerMigratePassiveNodeIdList(env, ...args),
      migratePassiveNodeIdRecord: (...args) => plannerMigratePassiveNodeIdRecord(env, ...args),
      normalizePassiveTreePlannerState: (...args) => plannerNormalizePassiveTreePlannerState(env, ...args),
      ensurePassiveTreePlannerState: (...args) => plannerEnsurePassiveTreePlannerState(env, ...args),
      saveCurrentPassiveTreePreset: (...args) => plannerSaveCurrentPassiveTreePreset(env, ...args),
      setActivePassiveTreePreset: (...args) => plannerSetActivePassiveTreePreset(env, ...args),
      setPassiveTreeAutoInvest: (...args) => plannerSetPassiveTreeAutoInvest(env, ...args),
      encodePassiveTreePreset: (...args) => plannerEncodePassiveTreePreset(env, ...args),
      importPassiveTreePreset: (...args) => plannerImportPassiveTreePreset(env, ...args),
      runPassiveTreeAutoInvest: (...args) => plannerRunPassiveTreeAutoInvest(env, ...args)
    });
  }

  // modules/domain/journal-recovery.mjs
  var reachedSkyTowerFloor10 = (s) => !!(s.skyTower && (Math.floor(s.skyTower.highestFloor || 1) >= 11 || (Array.isArray(s.skyTower.clearedFloors) ? s.skyTower.clearedFloors : []).some((floor) => Math.floor(floor || 0) >= 10)));
  var holdsFusedRelic = (s) => (s.inventory || []).some((item) => item && item.fusedRelic) || Object.values(s.equipment || {}).some((item) => item && item.fusedRelic);
  var reachedColonyWave10 = (s) => Math.max(Math.floor((s.colony || {}).highestWave || 0), Math.floor((s.colony || {}).wave || 0)) >= 11;
  var progressRules = Object.freeze([
    ["passive_star_evolution", (s) => !!s.passiveStarEvolution],
    ["meteor_fall", (s) => Math.floor((s.meteorSite || {}).entriesCleared || 0) > 0],
    ["woodsman", (s) => !!(s.chaosInfuserUnlocked || s.woodsmanSimulatorSeenLoop || Math.floor(s.woodsmanDefeatAttempts || 0) > 0)],
    ["beehive_queen", (s) => !!(s.beehive && s.beehive.cleared)],
    ["void_grand_breach", (s) => !!(s.voidRift && s.voidRift.grandBreachCleared)],
    ["labyrinth_10", (s) => Math.max(Math.floor(s.labyrinthUnlockedMaxFloor || 1), Math.floor(s.labyrinthFloor || 1)) >= 11],
    ["ocean_500", (s) => !!(s.ocean && Math.floor(s.ocean.bossClearM || 0) >= 500)],
    ["sky_tower_10", reachedSkyTowerFloor10],
    ["time_rift_fusion", journalReachedTimeRiftFusion],
    ["colony_wave_10", reachedColonyWave10]
  ]);
  function journalReachedTimeRiftFusion(owner) {
    const fused = holdsFusedRelic(owner);
    return owner.timeRift && Math.floor(owner.timeRift.fusionCount || 0) > 0 || fused;
  }
  function journalRepairEntriesFromProgress(env, state) {
    const owner = state && typeof state === "object" ? state : {};
    const recovered = new Set(Array.isArray(owner.journalEntries) ? owner.journalEntries.filter((id) => env.deps.JOURNAL_DB[id]) : []);
    recovered.add("prologue");
    const loopStage = Math.max(Math.floor(owner.season || 1), Math.floor(owner.loopCount || 0));
    if (loopStage >= 2) Object.keys(env.deps.JOURNAL_DB).filter((id) => /^act_/.test(id)).forEach((id) => recovered.add(id));
    progressRules.forEach(([id, reached]) => {
      if (reached(owner)) recovered.add(id);
    });
    addRootBossEntries(env, owner, recovered);
    env.deps.memoryLeaves.restoreJournal(owner, recovered);
    owner.journalEntries = Array.from(recovered).filter((id) => env.deps.JOURNAL_DB[id]);
    return owner.journalEntries;
  }
  function addRootBossEntries(env, owner, recovered) {
    const rootBossIds = new Set(Array.isArray(owner.clearedRootBosses) ? owner.clearedRootBosses : []);
    if (typeof env.deps.SEASON_BOSS_ZONES === "undefined" || !Array.isArray(env.deps.SEASON_BOSS_ZONES)) return;
    env.deps.SEASON_BOSS_ZONES.forEach((zone) => {
      if (zone && zone.journalId && rootBossIds.has(zone.id) && env.deps.JOURNAL_DB[zone.journalId]) recovered.add(zone.journalId);
    });
  }

  // modules/domain/journal-bonuses.mjs
  function journalGetClaimedPassivePointTotal(env, owner) {
    const entries = new Set(Array.isArray(owner.journalEntries) ? owner.journalEntries : []);
    const claims = owner.journalBonusClaims && typeof owner.journalBonusClaims === "object" ? owner.journalBonusClaims : {};
    return Object.keys(env.deps.JOURNAL_DB).reduce((sum, id) => {
      const entry = env.deps.JOURNAL_DB[id];
      if (!entry || !entry.bonus || entry.bonus.stat !== "passivePoint") return sum;
      if (!entries.has(id) || !claims[id]) return sum;
      return sum + Math.max(0, Math.floor(entry.bonus.value || 0));
    }, 0);
  }
  function journalRebuildBonusStateForLoad(env, state) {
    const owner = state && typeof state === "object" ? state : {};
    const savedBonuses = Array.isArray(owner.journalBonuses) ? owner.journalBonuses.filter((entry) => entry && typeof entry.stat === "string" && Number.isFinite(entry.value)) : [];
    const hadLegacyImmortalHpBonus = savedBonuses.some((entry) => entry.entryId === "immortal" && entry.stat === "flatHp");
    const legacyPassivePointBonusIds = new Set(savedBonuses.filter((entry) => entry.stat === "passivePoint" && typeof entry.entryId === "string").map((entry) => entry.entryId));
    owner.journalBonusClaims = owner.journalBonusClaims && typeof owner.journalBonusClaims === "object" ? owner.journalBonusClaims : {};
    if (hadLegacyImmortalHpBonus) owner.journalBonusClaims.immortal = false;
    legacyPassivePointBonusIds.forEach((id) => {
      owner.journalBonusClaims[id] = false;
    });
    let pendingPassivePoints = 0;
    owner.journalBonuses = [];
    const entries = Array.isArray(owner.journalEntries) ? owner.journalEntries : [];
    entries.forEach((id) => {
      pendingPassivePoints += restoreEntryBonus(env, owner, id);
    });
    return { pendingPassivePoints, hadLegacyImmortalHpBonus, legacyPassivePointBonusIds: Array.from(legacyPassivePointBonusIds) };
  }
  function restoreEntryBonus(env, owner, id) {
    const entry = env.deps.JOURNAL_DB[id];
    if (!entry || !entry.bonus) return 0;
    let pending = 0;
    if (!owner.journalBonusClaims[id]) {
      owner.journalBonusClaims[id] = true;
      if (entry.bonus.stat === "passivePoint") pending = Math.max(0, Math.floor(entry.bonus.value || 0));
    }
    if (entry.bonus.stat !== "passivePoint" && owner.journalBonusClaims[id]) {
      owner.journalBonuses.push({ entryId: id, stat: entry.bonus.stat, value: entry.bonus.value });
    }
    return pending;
  }
  function applyBonusValue(owner, entryId, bonus) {
    owner.journalBonuses = Array.isArray(owner.journalBonuses) ? owner.journalBonuses : [];
    if (bonus.stat === "passivePoint") {
      owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0)) + Math.max(0, Math.floor(bonus.value || 0));
    } else if (!owner.journalBonuses.some((row) => row && row.entryId === entryId)) {
      owner.journalBonuses.push({ entryId, stat: bonus.stat, value: bonus.value });
    }
  }
  function* journalGrantBonus(env, owner, entryId, live) {
    const entry = env.deps.JOURNAL_DB[entryId];
    if (!entry || !entry.bonus) return;
    owner.journalBonusClaims = owner.journalBonusClaims && typeof owner.journalBonusClaims === "object" ? owner.journalBonusClaims : {};
    if (owner.journalBonusClaims[entryId]) return;
    applyBonusValue(owner, entryId, entry.bonus);
    owner.journalBonusClaims[entryId] = true;
    if (live) {
      if (entry.bonus.stat === "passivePoint") yield { kind: "journalAutoInvest", args: [] };
      yield { kind: "journalInvalidateStats", args: [] };
      if (env.deps.contentProgression.opening.canOpen(owner, "tab-journal")) {
        yield { kind: "journalLog", args: [env.deps._t("저널 영구 보너스 획득: {label}", { label: env.deps._t(entry.bonus.label) }), "season-up"] };
      }
    }
  }

  // modules/domain/journal-unlocks.mjs
  function* journalUnlockEntry(env, owner, entryId, live) {
    if (!env.deps.JOURNAL_DB[entryId]) return;
    owner.journalEntries = Array.isArray(owner.journalEntries) ? owner.journalEntries : ["prologue"];
    if (!owner.journalEntries.includes(entryId)) {
      owner.journalEntries.push(entryId);
      if (env.deps.JOURNAL_DB[entryId].discoveryOnly) return;
      markUnread(owner);
      if (live) {
        if (env.deps.contentProgression.opening.canOpen(owner, "tab-journal")) {
          yield { kind: "journalLog", args: [env.deps._t("📓 새 기록: {title}", { title: env.deps.JOURNAL_DB[entryId].title }), "loot-rare"] };
        }
        yield { kind: "journalPinnacleReward", args: [entryId] };
        yield { kind: "journalRefreshGoals", args: [] };
      }
    }
    yield* journalGrantBonus(env, owner, entryId, live);
  }
  function markUnread(owner) {
    owner.noti = owner.noti && typeof owner.noti === "object" ? owner.noti : {};
    owner.noti.journal = true;
  }
  function* journalEnsureActCompletionForLoop(env, owner, options, live) {
    const silent = !options || options.silent !== false;
    const loopStage = Math.max(Math.floor(owner.season || 1), Math.floor(owner.loopCount || 0));
    if (loopStage < 2) return;
    owner.journalEntries = Array.isArray(owner.journalEntries) ? owner.journalEntries : ["prologue"];
    const before = owner.journalEntries.length;
    const actIds = Object.keys(env.deps.JOURNAL_DB).filter((id) => /^act_/.test(id));
    for (const id of actIds) {
      if (!owner.journalEntries.includes(id)) owner.journalEntries.push(id);
      yield* journalGrantBonus(env, owner, id, live);
    }
    if (!silent && owner.journalEntries.length > before) {
      yield { kind: "journalLog", args: [env.deps._t("📓 루프 2 이상 보정: 액트 저널이 모두 복구되었습니다."), "season-up"] };
    }
  }

  // modules/domain/journal-progress.mjs
  function createJournalProgress(deps) {
    const env = { deps };
    return Object.freeze({
      reachedTimeRiftFusion: journalReachedTimeRiftFusion,
      repairJournalEntriesFromProgress: (...args) => journalRepairEntriesFromProgress(env, ...args),
      getClaimedJournalPassivePointTotal: (...args) => journalGetClaimedPassivePointTotal(env, ...args),
      rebuildJournalBonusStateForLoad: (...args) => journalRebuildBonusStateForLoad(env, ...args),
      grantJournalBonus: (...args) => journalGrantBonus(env, ...args),
      unlockJournalEntry: (...args) => journalUnlockEntry(env, ...args),
      ensureActJournalCompletionForLoop: (...args) => journalEnsureActCompletionForLoop(env, ...args)
    });
  }

  // modules/common/support-gems.mjs
  function getOwnedSkillGemNames(state) {
    let source = state || {};
    return Array.from(new Set([].concat(
      Array.isArray(source.skills) ? source.skills : [],
      Array.isArray(source.sealedSkills) ? source.sealedSkills : []
    ).filter((name) => !!name)));
  }
  function getOwnedSupportGemNames(state) {
    let source = state || {};
    return Array.from(new Set([].concat(
      Array.isArray(source.supports) ? source.supports : [],
      Array.isArray(source.sealedSupports) ? source.sealedSupports : []
    ).filter((name) => !!name)));
  }
  function hasSkillGemOwned(name, state) {
    return !!name && getOwnedSkillGemNames(state).includes(name);
  }
  function hasSupportGemOwned(name, state) {
    return !!name && getOwnedSupportGemNames(state).includes(name);
  }

  // modules/domain/act-reward-items.mjs
  function actCreateClassStarterWeapon(env, owner, classId) {
    if (!owner.equipment || owner.equipment["무기"]) return null;
    const bases = env.deps.keepWeaponCategoryBases(env.deps.BASE_ITEM_DB.filter((base2) => base2.slot === "무기" && !base2.realmBase && !base2.dropOnly), env.deps.HANA_WEAPON_COMBOS.classWeapons[classId]);
    const base = bases.reduce((best, row) => !best || row.reqTier < best.reqTier ? row : best, null);
    return base ? env.deps.createItemFromBase(base, "normal", 1) : null;
  }
  function actIsFirstStarterReward(owner, zoneId) {
    return zoneId === 0 && (owner.season || 1) === 1 && !(owner.loopCount > 0);
  }
  function buildFirstRewardItem(env, base, choice) {
    const item = env.deps.createItemFromBase(base, "normal", 1);
    item.rarity = "magic";
    item.baseStats = base.baseStats.map((stat) => env.deps.rollBaseStat(stat, 1));
    item.stats = env.deps.FIRST_ACT_REWARD_STATS[choice.slot].map((id) => {
      const mod = env.deps.MOD_DB.find((row) => (row.statId || row.id) === id && row.slots.includes(choice.slot));
      const range = env.deps.getAffixTierRange(mod, id, 1);
      return { id, val: range.max, valMin: range.min, valMax: range.max, tier: 1, statName: mod.statName };
    });
    env.deps.updateItemName(item);
    return item;
  }
  function rewardItemBase(env, zoneId, choice) {
    const bases = env.deps.keepWeaponCategoryBases(env.deps.BASE_ITEM_DB.filter((base) => base.slot === choice.slot && !base.realmBase && !base.dropOnly && base.reqTier <= zoneId + 1), choice.weaponCategory);
    return bases.reduce((best, row) => !best || row.reqTier > best.reqTier ? row : best, null);
  }
  function actBuildRewardPreviewItem(env, owner, zoneId, choice) {
    const tier = zoneId + 1;
    const base = rewardItemBase(env, zoneId, choice);
    if (!base) return null;
    if (actIsFirstStarterReward(owner, zoneId)) return buildFirstRewardItem(env, base, choice);
    const item = env.deps.createItemFromBase(base, "normal", tier);
    item.baseStats = base.baseStats.map((stat) => env.deps.rollBaseStat(stat, 0.5));
    return item;
  }
  function* actGrantRewardItem(env, owner, zoneId, choice) {
    const base = rewardItemBase(env, zoneId, choice);
    if (!base) return false;
    const item = actIsFirstStarterReward(owner, zoneId) ? buildFirstRewardItem(env, base, choice) : env.deps.createItemFromBase(base, choice.rarity || "magic", zoneId + 1);
    if (!actIsFirstStarterReward(owner, zoneId)) item.baseStats = base.baseStats.map((stat) => env.deps.rollBaseStat(stat, 0.5));
    const stored = yield { kind: "actStoreItem", args: [item, { guaranteedKeep: true }] };
    return stored ? item : null;
  }

  // modules/domain/act-reward-choices.mjs
  function actGetRewardConfig(env, owner, zoneId) {
    const config = env.deps.ACT_REWARD_DB[zoneId];
    if (!config) return null;
    if (config.firstLoop && owner.season === 1) return config.firstLoop;
    if (config.lockedChoices && !config.choices.some((choice) => actIsRewardChoiceAvailable(env, owner, choice))) {
      return { ...config, body: config.lockedBody, choices: config.lockedChoices };
    }
    return config;
  }
  function actGetSupportFallback(env, choice) {
    const amount = Math.max(1, Math.floor(Number(choice && choice.fallbackValue) || 1));
    if (choice && choice.fallbackKind === "points") {
      return { kind: "points", amount, currency: null, label: env.deps._t("스킬트리 포인트 +{amount}", { amount }) };
    }
    const currency = choice && choice.currency || "magicBud";
    const currencyDef = env.deps.ORB_DB[currency];
    if (!currencyDef) throw new Error(`Unknown support reward fallback currency: ${currency}`);
    return { kind: "currency", amount, currency, label: env.deps._t("{name} {amount}개", { name: currencyDef.name, amount }) };
  }
  function actIsRewardChoiceAvailable(env, owner, choice) {
    if (choice.kind === "points" && owner.season === 1) return env.deps.contentProgression.canOpen("tab-char", owner);
    if (choice.kind === "support" || choice.stat === "suppCap") return env.deps.contentProgression.isUnlocked("support", owner);
    if (choice.kind === "currency") return env.deps.contentProgression.canDropCurrency(choice.currency, owner);
    return true;
  }
  function actGetAvailableRewardZoneIds(env, owner) {
    return (owner.claimableActRewards || []).filter((id) => actGetRewardConfig(env, owner, id)?.choices.some((choice) => actIsRewardChoiceAvailable(env, owner, choice)));
  }
  function actGetRewardChoices(env, owner, zoneId) {
    const config = actGetRewardConfig(env, owner, zoneId);
    if (!config) return [];
    return config.choices.map((choice) => enrichChoice(env, owner, zoneId, choice));
  }
  function enrichChoice(env, owner, zoneId, choice) {
    const enriched = { ...choice };
    if (choice.kind === "skill" && hasSkillGemOwned(choice.skill, owner)) {
      enriched.desc = env.deps._t("{desc} 이미 보유 중이면 스킬트리 포인트 +{fallbackValue}로 바뀝니다.", { desc: env.deps._t(choice.desc), fallbackValue: choice.fallbackValue || 1 });
    }
    if (choice.kind === "support" && hasSupportGemOwned(choice.gem, owner)) {
      const fallback = actGetSupportFallback(env, choice);
      enriched.desc = env.deps._t("{desc} 이미 보유 중이면 {label}로 바뀝니다.", { desc: env.deps._t(choice.desc), label: fallback.label });
    }
    if (choice.kind === "item" && choice.slot === "무기") Object.assign(enriched, describeRewardWeapon(env, owner));
    if (choice.kind === "item" && actIsFirstStarterReward(owner, zoneId)) {
      enriched.label = enriched.label.replace("미확인 ", "");
      enriched.fixedStarter = true;
    }
    enriched.claimKey = JSON.stringify([
      choice.kind,
      choice.slot,
      choice.rarity,
      choice.skill,
      choice.gem,
      choice.stat,
      choice.value,
      choice.currency,
      choice.fallbackKind,
      choice.fallbackValue,
      enriched.weaponCategory
    ]);
    return enriched;
  }
  function describeRewardWeapon(env, owner) {
    const category = env.deps.HANA_WEAPON_COMBOS.classWeapons[owner.selectedClassId];
    return env.deps.WEAPON_CATEGORIES[category] ? { weaponCategory: category, label: env.deps._t("미확인 {name}", { name: env.deps.WEAPON_CATEGORIES[category].name }) } : {};
  }

  // modules/domain/act-reward-payouts.mjs
  function* actGrantRewardEntry(env, owner, zoneId, choice) {
    if (choice.kind === "item") return yield* grantItemEntry(env, owner, zoneId, choice);
    if (choice.kind === "skill") return yield* grantSkillEntry(env, owner, choice);
    if (choice.kind === "support") return yield* grantSupportEntry(env, owner, choice);
    if (choice.kind === "points") {
      owner.passivePoints += choice.value || 0;
      yield { kind: "actLog", args: [env.deps._t("🎁 스킬트리 포인트 +{value}", { value: choice.value || 0 }), "loot-rare"] };
      return;
    }
    if (choice.kind === "currency") return yield* grantCurrencyEntry(env, choice);
    if (choice.kind === "stat") yield* grantStatEntry(env, owner, zoneId, choice);
  }
  function* grantItemEntry(env, owner, zoneId, choice) {
    const item = yield* actGrantRewardItem(env, owner, zoneId, choice);
    if (item) yield { kind: "actLog", args: [env.deps._t("🎁 액트 보상으로 [{name}] 획득!", { name: env.deps._t(item.name) }), choice.rarity === "rare" ? "loot-rare" : "loot-magic", { item }] };
    return !!item;
  }
  function* grantSkillEntry(env, owner, choice) {
    if (!hasSkillGemOwned(choice.skill, owner)) {
      owner.skills.push(choice.skill);
      owner.gemData[choice.skill] = owner.gemData[choice.skill] || { level: 1, exp: 0 };
      owner.noti.skills = true;
      yield { kind: "actLog", args: [env.deps._t("🎁 액트 보상 룬 [{skill}] 획득!", { skill: choice.skill }), "loot-rare"] };
    } else {
      owner.passivePoints += choice.fallbackValue || 1;
      yield { kind: "actLog", args: [env.deps._t("🎁 이미 보유한 룬 대신 스킬트리 포인트 +{value}", { value: choice.fallbackValue || 1 }), "loot-magic"] };
    }
  }
  function* grantSupportEntry(env, owner, choice) {
    if (!env.deps.SUPPORT_GEM_DB[choice.gem]) throw new Error(`Unknown act reward support rune: ${choice.gem}`);
    if (!hasSupportGemOwned(choice.gem, owner)) {
      owner.supports.push(choice.gem);
      owner.supportGemData[choice.gem] = owner.supportGemData[choice.gem] || { level: 1, exp: 0 };
      owner.gemFoldInactiveSupport = false;
      owner.noti.skills = true;
      yield { kind: "actLog", args: [env.deps._t("🎁 액트 보상 보조스킬룬 [{gem}] 획득!", { gem: choice.gem }), "loot-rare"] };
    } else {
      const fallback = actGetSupportFallback(env, choice);
      if (fallback.kind === "points") owner.passivePoints += fallback.amount;
      else yield { kind: "actCurrency", args: [fallback.currency, fallback.amount] };
      yield { kind: "actLog", args: [env.deps._t("🎁 중복 보조스킬룬 대신 {label}", { label: env.deps._t(fallback.label) }), "loot-magic"] };
    }
  }
  function* grantCurrencyEntry(env, choice) {
    const amount = choice.fallbackValue || choice.value || 1;
    yield { kind: "actCurrency", args: [choice.currency, amount] };
    yield { kind: "actLog", args: [`🎁 ${env.deps._t(env.deps.ORB_DB[choice.currency].name)} +${amount}`, "loot-magic"] };
  }
  function* grantStatEntry(env, owner, zoneId, choice) {
    owner.actRewardBonuses = owner.actRewardBonuses || [];
    owner.actRewardBonuses.push({ actId: zoneId, stat: choice.stat, value: choice.value });
    yield { kind: "actLog", args: [`🎁 ${env.deps.getStatName(choice.stat)} +${choice.value}${env.deps.P_STATS[choice.stat] && env.deps.P_STATS[choice.stat].isPct ? "%" : ""}`, "loot-rare"] };
  }

  // modules/domain/act-reward-claims.mjs
  function* actMarkRewardReady(env, owner, zoneId) {
    if (zoneId < 0 || zoneId > 9) return;
    owner.claimableActRewards = owner.claimableActRewards || [];
    owner.claimedActRewards = owner.claimedActRewards || [];
    if (owner.claimedActRewards.includes(zoneId) || owner.claimableActRewards.includes(zoneId)) return;
    owner.claimableActRewards.push(zoneId);
    if (!actGetAvailableRewardZoneIds(env, owner).includes(zoneId)) return;
    owner.noti.map = true;
    yield { kind: "actLog", args: [env.deps._t("🎁 [{name}] 클리어 보상을 받을 수 있습니다.", { name: env.deps.MAP_ZONES[zoneId].name }), "loot-rare"] };
    yield { kind: "actPromptReward", args: [zoneId] };
  }
  function* actClaimRewardChoice(env, owner, zoneId, choiceIndex, displayedChoice) {
    if (owner.woodsmanBuildLock) return yield { kind: "actLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    if (!owner.claimableActRewards.includes(zoneId)) return;
    const choices = actGetRewardChoices(env, owner, zoneId);
    const choice = choices[choiceIndex];
    if (!choice || !actIsRewardChoiceAvailable(env, owner, choice)) return;
    if (displayedChoice !== void 0 && displayedChoice !== encodeURIComponent(choice.claimKey)) return yield { kind: "actOpenReward", args: [zoneId] };
    if ((yield* actGrantRewardEntry(env, owner, zoneId, choice)) === false) {
      return yield { kind: "actLog", args: [env.deps._t("액트 보상을 지급하지 못했습니다. 보상은 유지됩니다."), "system"] };
    }
    yield { kind: "actAutoInvest", args: [] };
    owner.claimableActRewards = owner.claimableActRewards.filter((id) => id !== zoneId);
    if (!owner.claimedActRewards.includes(zoneId)) owner.claimedActRewards.push(zoneId);
    yield { kind: "actCloseReward", args: [] };
    yield { kind: "actCheckUnlocks", args: [] };
    yield { kind: "actNormalizeSupports", args: [true] };
    yield { kind: "actRefresh", args: [] };
    yield { kind: "actSave", args: [180] };
  }

  // modules/domain/act-rewards.mjs
  function createActRewards(deps) {
    const env = { deps };
    return Object.freeze({
      getActRewardConfig: (...args) => actGetRewardConfig(env, ...args),
      isActRewardChoiceAvailable: (...args) => actIsRewardChoiceAvailable(env, ...args),
      getAvailableActRewardZoneIds: (...args) => actGetAvailableRewardZoneIds(env, ...args),
      getActRewardChoices: (...args) => actGetRewardChoices(env, ...args),
      createClassStarterWeapon: (...args) => actCreateClassStarterWeapon(env, ...args),
      buildActRewardPreviewItem: (...args) => actBuildRewardPreviewItem(env, ...args),
      grantActRewardEntry: (...args) => actGrantRewardEntry(env, ...args),
      markActRewardReady: (...args) => actMarkRewardReady(env, ...args),
      claimActRewardChoice: (...args) => actClaimRewardChoice(env, ...args)
    });
  }

  // modules/domain/void-passive-state.mjs
  function voidRuleEnsureVoidPassiveState(env, owner) {
    owner.voidPassives = owner.voidPassives && typeof owner.voidPassives === "object" ? owner.voidPassives : {};
    Object.keys(owner.voidPassives).forEach((nodeId) => {
      let node = env.deps.PASSIVE_TREE.nodes[nodeId];
      if (!node || node.kind !== "void" || String(node.id) !== nodeId) {
        delete owner.voidPassives[nodeId];
        return;
      }
      let entry = owner.voidPassives[nodeId] && typeof owner.voidPassives[nodeId] === "object" ? owner.voidPassives[nodeId] : {};
      let stats = Array.isArray(entry.stats) ? entry.stats : [];
      entry.stats = stats.filter((line) => line && voidRuleIsVoidPassiveLineStat(env, line.id) && Number.isFinite(Number(line.val))).slice(0, 2).map((line) => ({ id: line.id, val: Number(line.val) }));
      entry.transcendent = voidRuleNormalizeTranscendentVoidPassive(env, entry.transcendent);
      entry.rarity = entry.transcendent ? "transcendent" : entry.stats.length > 0 ? "magic" : "normal";
      owner.voidPassives[nodeId] = entry;
    });
    return owner.voidPassives;
  }
  function voidRuleGetVoidPassiveCraft(env, owner, nodeId) {
    let state = voidRuleEnsureVoidPassiveState(env, owner);
    let key = String(nodeId || "");
    if (!state[key]) state[key] = { rarity: "normal", stats: [] };
    return state[key];
  }
  function voidRuleIsVoidPassiveLineStat(env, statId) {
    return !!(env.deps.P_STATS[statId] || env.deps.STAT_DISPLAY_NAMES[statId]);
  }
  function voidRuleNormalizeTranscendentVoidPassive(env, raw) {
    if (!raw || typeof raw !== "object") return null;
    let def = env.deps.TRANSCENDENT_VOID_PASSIVE_DB.find((row) => row.id === raw.id);
    if (!def) return null;
    let value = Number.isFinite(Number(raw.value)) ? Number(raw.value) : def.fixed || def.min || 0;
    let value2 = Number.isFinite(Number(raw.value2)) ? Number(raw.value2) : def.min2 || 0;
    return { id: def.id, value: voidRuleClampTranscendentValue(def, value), value2 };
  }
  function voidRuleClampTranscendentValue(def, value) {
    if (!Number.isFinite(def.min) || !Number.isFinite(def.max)) return value;
    return Math.min(def.max, Math.max(def.min, value));
  }
  function voidRuleGetOwnedTranscendentVoidPassiveIds(env, owner, exceptNodeId) {
    let state = voidRuleEnsureVoidPassiveState(env, owner);
    return new Set(Object.keys(state).filter((nodeId) => String(nodeId) !== String(exceptNodeId)).map((nodeId) => state[nodeId] && state[nodeId].transcendent && state[nodeId].transcendent.id).filter(Boolean));
  }
  function voidRuleGetChameleonChoices(env, owner, nodeId) {
    const owned = voidRuleGetOwnedTranscendentVoidPassiveIds(env, owner, nodeId);
    return env.deps.TRANSCENDENT_VOID_PASSIVE_DB.filter((def) => !["chameleon", "sun"].includes(def.id) && !owned.has(def.id));
  }
  function voidRuleActiveChameleonEntry(env, owner, nodeId) {
    const node = env.deps.PASSIVE_TREE.nodes[nodeId], entry = node && node.kind === "void" ? voidRuleGetVoidPassiveCraft(env, owner, node.id) : null;
    return entry && (owner.passives || []).includes(node.id) && entry.transcendent && entry.transcendent.id === "chameleon" ? entry : null;
  }

  // modules/domain/void-passive-stats.mjs
  function voidRuleGetVoidPassiveNodeIds(env) {
    return Object.values(env.deps.PASSIVE_TREE.nodes || {}).filter((node) => node && node.kind === "void").map((node) => String(node.id));
  }
  function voidRuleCountAllocatedPassivesWithin(env, owner, nodeId, radius) {
    const center = env.deps.PASSIVE_TREE.nodes[nodeId];
    if (!center) return 0;
    return (owner.passives || []).filter((id) => {
      const node = env.deps.PASSIVE_TREE.nodes[id];
      return node && id !== nodeId && node.kind !== "start" && Math.hypot(node.x - center.x, node.y - center.y) <= radius;
    }).length;
  }
  function voidRuleGetTranscendentVoidPassiveStats(env, owner, nodeId, entry, voidCount) {
    const tr = entry && entry.transcendent;
    const rule = tr && env.deps.TRANSCENDENT_VOID_STAT_LINES[tr.id];
    if (!rule) return [];
    const ctx = {
      voidCount,
      loopCount: Math.max(0, Math.floor(owner.loopCount || 0)),
      allocatedWithin: (radius) => voidRuleCountAllocatedPassivesWithin(env, owner, nodeId, radius)
    };
    const linkScale = env.deps.getVoidLinkScale(nodeId);
    return rule(tr, ctx).map(([stat, val]) => ({ stat, val: (Number(val) || 0) * (["passivePoint", "suppCap"].includes(stat) ? 1 : linkScale) }));
  }
  function voidRuleGetTranscendentVoidPassiveCount(env, owner, id, normalize) {
    let state = normalize ? voidRuleEnsureVoidPassiveState(env, owner) : owner.voidPassives || {};
    return (owner.passives || []).filter((nodeId) => state[nodeId]?.transcendent?.id === id).length;
  }

  // modules/domain/void-passive-rolls.mjs
  function voidRuleRollPlutoVoidCount(thresholds = PLUTO_VOID_THRESHOLDS) {
    const roll = Math.random();
    return thresholds.filter((edge) => roll >= edge).length + 1;
  }
  function voidRuleRollVoidPassiveOption(env, existingStats) {
    let used = new Set((existingStats || []).map((line) => line && line.id));
    let pool = env.deps.VOID_PASSIVE_OPTION_POOL.filter((opt) => !used.has(opt.id));
    if (!pool.length) return null;
    let pick = env.deps.rndChoice(pool);
    const step = pick.step || 1, slots = Math.round((pick.max - pick.min) / step);
    return { id: pick.id, val: Number((pick.min + Math.floor(Math.random() * (slots + 1)) * step).toFixed(2)) };
  }
  function voidRuleRollMagicBudOnVoid(env, entry) {
    const nextStats = [], optionCount = 1 + Math.floor(Math.random() * 2);
    for (let index = 0; index < optionCount; index++) {
      const next = voidRuleRollVoidPassiveOption(env, nextStats);
      if (next) nextStats.push(next);
    }
    entry.stats = nextStats;
    entry.rarity = nextStats.length > 0 ? "magic" : "normal";
  }
  function voidRuleRollTranscendentVoidPassive(env, owner, nodeId) {
    let owned = voidRuleGetOwnedTranscendentVoidPassiveIds(env, owner, nodeId);
    let pool = env.deps.TRANSCENDENT_VOID_PASSIVE_DB.filter((def) => !owned.has(def.id));
    if (!pool.length) return null;
    return voidRuleRollTranscendentDef(env.deps.rndChoice(pool));
  }
  function voidRuleRollTranscendentDef(def) {
    let roll = (min, max, step) => {
      if (!Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) return 0;
      let s = Number.isFinite(Number(step)) ? Number(step) : 1;
      let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 1e-5));
      let value2 = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
      return s < 1 ? Number(value2.toFixed(2)) : Math.floor(value2);
    };
    let value = def.fixed || (def.rollThresholds ? voidRuleRollPlutoVoidCount(def.rollThresholds) : roll(def.min, def.max));
    return { id: def.id, value, value2: roll(def.min2, def.max2, def.step2) };
  }
  function voidRuleRerollTranscendentVoidPassive(env, entry) {
    let def = env.deps.TRANSCENDENT_VOID_PASSIVE_DB.find((row) => row.id === (entry && entry.id));
    if (!def || def.fixed || !Number.isFinite(Number(def.min))) return entry;
    let roll = (min, max, step) => {
      let s = Number.isFinite(Number(step)) ? Number(step) : 1;
      let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 1e-5));
      let value = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
      return s < 1 ? Number(value.toFixed(2)) : Math.floor(value);
    };
    return { id: def.id, value: def.rollThresholds ? voidRuleRollPlutoVoidCount(def.rollThresholds) : roll(def.min, def.max), value2: roll(def.min2, def.max2, def.step2) };
  }

  // modules/domain/void-passive-connections.mjs
  function voidRuleIsRoutingTranscendent(entry) {
    return !!entry && ["blackHole", "andromeda"].includes(entry.id);
  }
  function voidRuleSyncPaleBlueDotPassivePoints(env, owner, previousEntry, nextEntry) {
    let previous = previousEntry && previousEntry.id === "paleBlueDot" ? Number(previousEntry.value || 0) : 0;
    let next = nextEntry && nextEntry.id === "paleBlueDot" ? Number(nextEntry.value || 0) : 0;
    if (previous === next) return;
    const budget = env.deps.passiveRouting.pointBudget(owner) - previous + next;
    env.deps.passiveRouting.reconcile(owner, env.deps.PASSIVE_TREE, env.deps.getPassiveRouting(owner), budget);
  }
  function* voidRuleRefreshPassiveConnectivity(env, owner) {
    env.deps.passiveRouting.reconcile(owner, env.deps.PASSIVE_TREE, env.deps.getPassiveRouting(owner));
    yield { kind: "voidReachable", args: [] };
    yield { kind: "voidVisibility", args: [] };
  }

  // modules/domain/void-passive-changes.mjs
  function* voidRuleConvertChameleonVoidPassive(env, owner, nodeId, targetId) {
    if (owner.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.";
    const entry = voidRuleActiveChameleonEntry(env, owner, nodeId);
    if (!entry) return "활성화한 카멜레온 공허 패시브만 바꿀 수 있습니다.";
    const def = voidRuleGetChameleonChoices(env, owner, nodeId).find((row) => row.id === targetId);
    if (!def) return "고를 수 없는 초월입니다.";
    const previous = entry.transcendent;
    entry.transcendent = voidRuleRollTranscendentDef(def);
    voidRuleSyncPaleBlueDotPassivePoints(env, owner, previous, entry.transcendent);
    if (voidRuleIsRoutingTranscendent(entry.transcendent)) yield* voidRuleRefreshPassiveConnectivity(env, owner);
    yield { kind: "voidInvalidateStats", args: [] };
    return "";
  }
  function* voidRuleRollFairyRingOnVoid(env, owner, entry, nodeId) {
    const previous = entry.transcendent;
    entry.transcendent = Math.random() < 0.75 ? null : voidRuleRollTranscendentVoidPassive(env, owner, nodeId);
    if (!entry.transcendent || entry.transcendent.id !== "sun") entry.stats = [];
    voidRuleSyncPaleBlueDotPassivePoints(env, owner, previous, entry.transcendent);
    if (voidRuleIsRoutingTranscendent(previous) || voidRuleIsRoutingTranscendent(entry.transcendent)) yield* voidRuleRefreshPassiveConnectivity(env, owner);
    entry.rarity = entry.transcendent ? "transcendent" : "normal";
  }
  function* voidRuleRecordImmortalHeroDeathPenalty(env, owner) {
    let state = voidRuleEnsureVoidPassiveState(env, owner);
    let changed = false;
    Object.values(state).forEach((entry) => {
      let tr = entry && entry.transcendent;
      if (!tr || tr.id !== "immortalHero") return;
      let before = Math.max(0, Math.floor(Number(tr.value) || 0));
      tr.value = Math.max(0, before - 30);
      changed = changed || tr.value !== before;
    });
    if (changed && (yield { kind: "voidCanLog", args: [] })) yield { kind: "voidLog", args: [env.deps._t("🛡️ 불멸의 영웅 효과가 사망으로 생명력 -30 감소했습니다."), "death"] };
    return changed;
  }

  // modules/domain/void-passive-crafting.mjs
  function* voidRuleRollFairyRingOnCraftedVoid(env, owner, entry, nodeId) {
    if (!entry.transcendent && !(entry.stats || []).length) {
      return { text: env.deps._t("요정의 고리는 옵션이 있는 공허 패시브에만 쓸 수 있습니다. 마법의 새싹으로 먼저 옵션을 굴리세요."), tone: "attack-monster" };
    }
    if (entry.fairyLocked) return { text: env.deps._t("이 소켓에는 이번 루프에 요정의 고리를 다시 쓸 수 없습니다."), tone: "attack-monster" };
    owner.currencies.fairyRing--;
    yield* voidRuleRollFairyRingOnVoid(env, owner, entry, nodeId);
    if (!entry.transcendent) entry.fairyLocked = true;
    return entry.transcendent ? { text: env.deps._t("🌌 공허 패시브 초월: {replace}", { replace: yield { kind: "voidTranscendentLabel", args: [entry.transcendent] } }), tone: "loot-unique" } : { text: env.deps._t("💥 요정의 고리: 초월에 실패해 공허 패시브의 옵션이 지워졌습니다."), tone: "attack-monster" };
  }
  function currencyUseReason(env, owner, node, currencyKey) {
    if (!node || node.kind !== "void") return env.deps._t("공허 패시브에만 사용할 수 있습니다.");
    if (!(owner.passives || []).includes(node.id)) return env.deps._t("먼저 공허 패시브를 활성화해야 합니다.");
    if (!["magicBud", "fairyRing", "goldenRule"].includes(currencyKey)) return env.deps._t("공허 패시브에는 마법의 새싹, 요정의 고리, 황금률만 사용할 수 있습니다.");
    if ((owner.currencies[currencyKey] || 0) <= 0) return env.deps._t("재화가 부족합니다.");
    return "";
  }
  function* voidRuleApplyVoidPassiveCurrency(env, owner, nodeId, currencyKey) {
    if (owner.woodsmanBuildLock) return yield { kind: "voidLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    let node = env.deps.PASSIVE_TREE.nodes[nodeId];
    const reason = currencyUseReason(env, owner, node, currencyKey);
    if (reason) return yield { kind: "voidLog", args: [reason, "attack-monster"] };
    let entry = voidRuleGetVoidPassiveCraft(env, owner, node.id);
    if (currencyKey === "fairyRing") {
      const outcome = yield* voidRuleRollFairyRingOnCraftedVoid(env, owner, entry, node.id);
      yield { kind: "voidLog", args: [outcome.text, outcome.tone] };
      yield* env.deps.unlockPassiveStarEvolution(owner);
      yield { kind: "voidRefresh", args: [] };
      yield { kind: "voidSave", args: [200] };
      return;
    }
    if (currencyKey === "goldenRule") {
      if (!entry.transcendent || !env.deps.TRANSCENDENT_VOID_PASSIVE_DB.some((def) => def.id === entry.transcendent.id && Number.isFinite(Number(def.min)))) return yield { kind: "voidLog", args: [env.deps._t("황금률은 수치가 있는 초월 공허 패시브에만 사용할 수 있습니다."), "attack-monster"] };
      owner.currencies.goldenRule--;
      let previousTranscendent = entry.transcendent;
      entry.transcendent = voidRuleRerollTranscendentVoidPassive(env, entry.transcendent);
      voidRuleSyncPaleBlueDotPassivePoints(env, owner, previousTranscendent, entry.transcendent);
      yield { kind: "voidLog", args: [env.deps._t("✨ 초월 공허 패시브 수치 재굴림: {replace}", { replace: yield { kind: "voidTranscendentLabel", args: [entry.transcendent] } }), "loot-unique"] };
      yield { kind: "voidRefresh", args: [] };
      yield { kind: "voidSave", args: [200] };
      return;
    }
    if (entry.transcendent) return yield { kind: "voidLog", args: [env.deps._t("초월 공허 패시브에는 마법의 새싹을 사용할 수 없습니다."), "attack-monster"] };
    owner.currencies[currencyKey]--;
    voidRuleRollMagicBudOnVoid(env, entry);
    yield { kind: "voidLog", args: [env.deps._t("🕳️ 공허 패시브에 {name} 사용: {replace}", { name: env.deps._t(env.deps.ORB_DB[currencyKey].name), replace: yield { kind: "voidEffectLabel", args: [node.id] } }), "loot-magic"] };
    yield { kind: "voidRefresh", args: [] };
    yield { kind: "voidSave", args: [200] };
  }

  // modules/domain/void-passives.mjs
  function createVoidPassives(deps) {
    const env = { deps };
    return Object.freeze({
      getVoidPassiveCraft: (...args) => voidRuleGetVoidPassiveCraft(env, ...args),
      isVoidPassiveLineStat: (...args) => voidRuleIsVoidPassiveLineStat(env, ...args),
      normalizeTranscendentVoidPassive: (...args) => voidRuleNormalizeTranscendentVoidPassive(env, ...args),
      getChameleonChoices: (...args) => voidRuleGetChameleonChoices(env, ...args),
      getVoidPassiveNodeIds: (...args) => voidRuleGetVoidPassiveNodeIds(env, ...args),
      getTranscendentVoidPassiveStats: (...args) => voidRuleGetTranscendentVoidPassiveStats(env, ...args),
      getTranscendentVoidPassiveCount: (...args) => voidRuleGetTranscendentVoidPassiveCount(env, ...args),
      rollPlutoVoidCount: voidRuleRollPlutoVoidCount,
      rollMagicBudOnVoid: (...args) => voidRuleRollMagicBudOnVoid(env, ...args),
      refreshPassiveConnectivity: (...args) => voidRuleRefreshPassiveConnectivity(env, ...args),
      convertChameleonVoidPassive: (...args) => voidRuleConvertChameleonVoidPassive(env, ...args),
      recordImmortalHeroDeathPenalty: (...args) => voidRuleRecordImmortalHeroDeathPenalty(env, ...args),
      applyVoidPassiveCurrency: (...args) => voidRuleApplyVoidPassiveCurrency(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/domain/passive-tree-access.mjs
  function passiveRuleGetClassKeystoneDefs(env, clsKey) {
    let defs = env.deps.CLASS_KEYSTONE_DEFS && env.deps.CLASS_KEYSTONE_DEFS[clsKey] || [];
    return Array.isArray(defs) ? defs : [];
  }
  function passiveRuleIsPassiveTreePathEdge(env, owner, edge, allocatedNodeIds) {
    return edge.requiresAllocatedNodeId !== env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE["헌신의 서약"] && passiveRuleIsPassiveTreeEdgeAvailable(owner, edge, allocatedNodeIds);
  }
  function passiveRuleIsPassiveTreeEdgeAvailable(owner, edge, allocatedNodeIds) {
    const requiredId = String(edge && edge.requiresAllocatedNodeId || "");
    if (!requiredId) return true;
    const allocated = allocatedNodeIds === void 0 ? owner && Array.isArray(owner.passives) ? owner.passives : [] : allocatedNodeIds;
    if (allocated instanceof Set) return allocated.has(requiredId);
    return Array.isArray(allocated) && allocated.includes(requiredId);
  }
  function passiveRuleGetPassiveTreeAdjacency(env, owner, allocatedNodeIds) {
    const nodeCount = Object.keys(env.deps.PASSIVE_TREE.nodes || {}).length;
    const edges = Array.isArray(env.deps.PASSIVE_TREE.edges) ? env.deps.PASSIVE_TREE.edges : [];
    const unlockSignature = edges.filter((edge) => edge.requiresAllocatedNodeId).map((edge) => `${edge.requiresAllocatedNodeId}:${passiveRuleIsPassiveTreeEdgeAvailable(owner, edge) ? 1 : 0}`).join("|");
    const signature = allocatedNodeIds === void 0 ? `${env.deps.PASSIVE_TREE.layoutVersion || 0}:${nodeCount}:${edges.length}:${unlockSignature}` : "";
    if (signature && env.passiveTreeAdjacencyCache.signature === signature) return env.passiveTreeAdjacencyCache.map;
    const adjacency = new Map(Object.keys(env.deps.PASSIVE_TREE.nodes || {}).map((id) => [String(id), []]));
    edges.forEach((edge) => {
      if (!passiveRuleIsPassiveTreePathEdge(env, owner, edge, allocatedNodeIds)) return;
      const from = String(edge.from), to = String(edge.to);
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);
      adjacency.get(from).push(to);
      adjacency.get(to).push(from);
    });
    if (signature) env.passiveTreeAdjacencyCache = { signature, map: adjacency };
    return adjacency;
  }
  function passiveRuleGetPassiveWisdomElementFromNodeIds(env, nodeIds) {
    const ids = Array.isArray(nodeIds) ? nodeIds : [];
    for (let index = ids.length - 1; index >= 0; index -= 1) {
      const element = env.deps.PASSIVE_WISDOM_ELEMENT_BY_NODE_ID[String(ids[index])];
      if (element) return element;
    }
    return "";
  }

  // modules/domain/passive-specialization-state.mjs
  function passiveRuleNormalizePassiveSpecializationState(env, value, options) {
    let source = value && typeof value === "object" ? value : {};
    let revelation = env.deps.PASSIVE_REVELATION_IDS.includes(source.revelation) ? source.revelation : "combat";
    const { choices, wisdom } = specializationChoices(env, source, options);
    let fanaticism = source.fanaticism && typeof source.fanaticism === "object" ? source.fanaticism : {};
    const karma = normalizeKarma(source);
    const cycleBuffs = normalizeCycleBuffs(env, source);
    return {
      revelation,
      keystoneChoices: { ...choices, wisdom_leap_element: wisdom },
      cycleBuffs,
      fanaticism: { skillName: String(fanaticism.skillName || ""), stacks: Math.max(0, Math.floor(fanaticism.stacks || 0)) },
      karma
    };
  }
  function specializationChoices(env, source, options) {
    let choices = source.keystoneChoices && typeof source.keystoneChoices === "object" ? source.keystoneChoices : {};
    let wisdom = env.deps.PASSIVE_WISDOM_ELEMENTS.includes(choices.wisdom_leap_element) ? choices.wisdom_leap_element : "fire";
    const migrateBranch = options && options.migrateWisdomBranchChoice;
    const branchWisdom = migrateBranch ? passiveRuleGetPassiveWisdomElementFromNodeIds(env, options.passiveIds) : "";
    if (migrateBranch) wisdom = branchWisdom;
    return { choices, wisdom };
  }
  function normalizeKarma(source) {
    let karmaSource = source.karma && typeof source.karma === "object" ? source.karma : {};
    let karmaByEnemy = karmaSource.byEnemy && typeof karmaSource.byEnemy === "object" ? karmaSource.byEnemy : {};
    let normalizedKarma = {};
    Object.keys(karmaByEnemy).forEach((enemyId) => {
      const amount = Math.max(0, Math.floor(Number(karmaByEnemy[enemyId]) || 0));
      if (amount > 0) normalizedKarma[String(enemyId)] = amount;
    });
    return { byEnemy: normalizedKarma, buff: normalizeKarmaBuff(karmaSource) };
  }
  function karmaBuffFields(karmaBuff) {
    return {
      targetId: String(karmaBuff.targetId || ""),
      morePct: Math.max(0, Number(karmaBuff.morePct) || 0),
      expiresAt: Math.max(0, Number(karmaBuff.expiresAt) || 0),
      actionsLeft: Math.max(0, Math.floor(Number(karmaBuff.actionsLeft) || 0))
    };
  }
  function normalizeKarmaBuff(karmaSource) {
    let karmaBuff = karmaSource.buff && typeof karmaSource.buff === "object" ? karmaSource.buff : null;
    if (karmaBuff) {
      karmaBuff = karmaBuffFields(karmaBuff);
      if (!karmaBuff.targetId || karmaBuff.morePct <= 0 || karmaBuff.actionsLeft <= 0) karmaBuff = null;
    }
    return karmaBuff;
  }
  function normalizeCycleBuffs(env, source) {
    return (Array.isArray(source.cycleBuffs) ? source.cycleBuffs : []).filter((buff) => buff && env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[buff.type] && Number.isFinite(Number(buff.cycle)) && Number.isFinite(Number(buff.expiresAt))).map((buff) => ({ type: buff.type, cycle: Math.max(0, Number(buff.cycle)), expiresAt: Math.max(0, Number(buff.expiresAt)) }));
  }
  function passiveRuleEnsurePassiveSpecializationState(env, owner) {
    owner.passiveSpecialization = passiveRuleNormalizePassiveSpecializationState(
      env,
      owner.passiveSpecialization,
      { migrateWisdomBranchChoice: true, passiveIds: owner.passives }
    );
    return owner.passiveSpecialization;
  }

  // modules/domain/passive-keystone-lookup.mjs
  function passiveRuleHasAuthoredPassiveKeystone(env, owner, idOrTitle) {
    const nodeId = env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[idOrTitle] || idOrTitle;
    let node = env.deps.PASSIVE_TREE.nodes[nodeId];
    return !!(node && node.kind === "keystone" && (owner.passives || []).includes(nodeId));
  }
  function passiveRuleFindAllocatedPassiveKeystone(env, owner, title) {
    const authoredNodeId = env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[String(title)] || String(title || "");
    const authoredNode = env.deps.PASSIVE_TREE.nodes[authoredNodeId];
    if (authoredNode && authoredNode.kind === "keystone" && (owner.passives || []).includes(authoredNodeId)) {
      return authoredNode;
    }
    const id = (owner.passives || []).find((id2) => {
      const node = env.deps.PASSIVE_TREE.nodes[id2];
      return node && node.kind === "keystone" && (node.title === title || node.keystoneEffectId === `keystone:${authoredNodeId}`);
    });
    return env.deps.PASSIVE_TREE.nodes[id] || null;
  }
  function passiveRuleGetPassiveKeystoneNodeId(env, title) {
    const liveId = env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[title];
    if (env.deps.PASSIVE_TREE.nodes[liveId]) return liveId;
    const node = Object.values(env.deps.PASSIVE_TREE.nodes).find((row) => row.kind === "keystone" && (row.title === title || row.keystoneEffectId === `keystone:${liveId}`));
    return node ? node.id : liveId;
  }

  // modules/domain/passive-void-count.mjs
  function passiveRuleGetVirtualVoidPassiveCount(env, owner) {
    const allocated = (owner.passives || []).filter((id) => env.deps.PASSIVE_TREE.nodes[id] && env.deps.PASSIVE_TREE.nodes[id].kind === "void").length;
    return allocated + env.deps.passiveRouting.transcendentValue(owner, "trauma") + env.deps.passiveRouting.transcendentValue(owner, "pluto");
  }

  // modules/domain/passive-node-effects.mjs
  function passiveRuleGetPassiveNodeRawEffects(node) {
    if (!node) return [];
    if (node.intentionalNoEffect) return [];
    if (Array.isArray(node.effects) && node.effects.length > 0) return node.effects;
    if (!node.stat) return [];
    return [{ stat: node.stat, val: Number(node.val) || 0 }];
  }
  function passiveRuleGetPassiveSpecialStatReserve(env, owner, statId, excludedNodeId) {
    return (owner && owner.passives || []).reduce((total, nodeId) => {
      const node = env.deps.PASSIVE_TREE.nodes[nodeId], key = String(nodeId);
      if (!node || key === String(excludedNodeId)) return total;
      if (node.kind === "void" || node.activationRequirement) return total;
      return total + passiveRuleGetPassiveNodeRawEffects(node).filter((effect) => effect && effect.stat === statId).reduce((sum, effect) => sum + (Number(effect.val) || 0), 0);
    }, 0);
  }
  function passiveRuleGetPassiveNodeActivationState(env, owner, node) {
    const requirement = node && node.activationRequirement;
    if (!requirement || requirement.type !== "special-stat-reserve") {
      return { active: true, statId: null, available: 0, required: 0 };
    }
    const required = Math.max(0, Number(requirement.minimum) || 0);
    const available = Math.max(0, passiveRuleGetPassiveSpecialStatReserve(env, owner, requirement.statId, node.id));
    return { active: available >= required, statId: requirement.statId, available, required };
  }
  function passiveRuleGetEffectivePassiveNodeEffects(env, owner, node, balanceAttributes = false) {
    if (!passiveRuleGetPassiveNodeActivationState(env, owner, node).active) return [];
    const effects2 = passiveRuleGetDevotionAdjustedPassiveEffects(env, owner, node);
    if (!balanceAttributes) return effects2;
    return effects2.flatMap((effect) => effect.stat === "strength" || effect.stat === "dexterity" ? [{ stat: "strength", val: effect.val / 2 }, { stat: "dexterity", val: effect.val / 2 }] : [effect]);
  }
  function passiveRuleGetDevotionAdjustedPassiveEffects(env, owner, node) {
    const effects2 = passiveRuleGetPassiveNodeRawEffects(node);
    if (!node || !node.connectedDevotionPenalty) return effects2;
    const neighbors = passiveRuleGetPassiveTreeAdjacency(env, owner).get(String(node.id)) || [];
    const count = neighbors.filter((id) => (owner.passives || []).includes(id) && passiveRuleGetPassiveNodeRawEffects(env.deps.PASSIVE_TREE.nodes[id]).some((effect) => effect.stat === "devotion")).length;
    const penalty = count * node.connectedDevotionPenalty;
    return effects2.map((effect) => ["physPctDmg", "lightPctDmg"].includes(effect.stat) ? { ...effect, val: effect.val - penalty } : effect);
  }
  function passiveRuleGetVoidLinkScale(env, owner, nodeId) {
    const owned = owner.passives || [], neighbors = passiveRuleGetPassiveTreeAdjacency(env, owner).get(String(nodeId)) || [];
    const lines = neighbors.filter((id) => owned.includes(id)).flatMap((id) => passiveRuleGetPassiveNodeRawEffects(env.deps.PASSIVE_TREE.nodes[id]));
    const constellation = passiveRuleFindAllocatedPassiveKeystone(env, owner, "공허의 별자리") ? passiveRuleGetVirtualVoidPassiveCount(env, owner) : 0;
    return 1 + (lines.filter((effect) => effect.stat === "voidLinkEfficiency").reduce((sum, effect) => sum + Number(effect.val), 0) + constellation) / 100;
  }
  function passiveRuleGetAllocatedPassiveStatValue(env, owner, statId) {
    const totals = {};
    (owner && owner.passives || []).forEach((nodeId) => {
      const node = env.deps.PASSIVE_TREE.nodes[nodeId];
      if (!node || node.kind === "void") return;
      const effects2 = passiveRuleGetEffectivePassiveNodeEffects(env, owner, node);
      effects2.forEach((effect) => {
        if (!effect || !effect.stat) return;
        totals[effect.stat] = (totals[effect.stat] || 0) + (Number(effect.val) || 0);
      });
    });
    if (statId !== "devotion") return Math.max(0, Number(totals[statId]) || 0);
    let devotion = Math.max(0, Number(totals.devotion) || 0);
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "육신과 정신의 성약")) {
      devotion += Math.floor(Math.max(0, totals.strength || 0) / 10) + Math.floor(Math.max(0, totals.intelligence || 0) / 10);
    }
    const covenant = passiveRuleFindAllocatedPassiveKeystone(env, owner, "헌신의 서약");
    if (covenant) devotion += passiveRuleCountCovenantAttributeConnections(env, owner, covenant);
    return devotion;
  }
  function passiveRuleCountCovenantAttributeConnections(env, owner, keystone) {
    if (!keystone) return 0;
    const neighborIds = [...new Set(env.deps.PASSIVE_TREE.edges.filter((edge) => passiveRuleIsPassiveTreeEdgeAvailable(owner, edge) && (edge.from === keystone.id || edge.to === keystone.id)).map((edge) => edge.from === keystone.id ? edge.to : edge.from))];
    const owned = new Set(owner.passives || []);
    return neighborIds.filter((id) => {
      const node = env.deps.PASSIVE_TREE.nodes[id];
      return owned.has(id) && (node.effects || []).some((effect) => ["strength", "dexterity", "intelligence"].includes(effect.stat));
    }).length;
  }

  // modules/domain/passive-cycle-rules.mjs
  function passiveRuleGetMystiqueAffinity(env, mystique, damageByElement) {
    const amount = Math.max(0, Number(mystique) || 0);
    const elements = ["phys", "fire", "cold", "light", "chaos"];
    const totals = damageByElement && typeof damageByElement === "object" ? damageByElement : {};
    const element = elements.reduce((best, current) => Number(totals[current] || 0) > Number(totals[best] || 0) ? current : best, "phys");
    return {
      element,
      ailment: env.deps.PASSIVE_AILMENT_BY_ELEMENT[element],
      damagePct: amount,
      potencyPct: amount,
      chancePct: Math.floor(amount / 3)
    };
  }
  function passiveRuleRecordPassiveCycleAilmentEnd(env, owner, ailmentType, cycle, now) {
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "역행 순환")) return false;
    if (!env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[ailmentType] || !(Number(cycle) > 0)) return false;
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    state.cycleBuffs = state.cycleBuffs.filter((buff) => buff && buff.type !== ailmentType && buff.expiresAt > timestamp);
    state.cycleBuffs.push({ type: ailmentType, cycle: Math.max(0, Number(cycle)), expiresAt: timestamp + 6e3 });
    return true;
  }
  function passiveRuleRecordPassiveCycleAilmentStart(env, owner, ailmentType, cycle, now) {
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, "역행 순환")) return false;
    if (!env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[ailmentType] || !(Number(cycle) > 0)) return false;
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    state.cycleBuffs = [{ type: ailmentType, cycle: Math.max(0, Number(cycle)) * 0.5, expiresAt: timestamp + 6e3 }];
    return true;
  }
  function passiveRuleGetActivePassiveCycleBuffEffects(env, owner, now) {
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    state.cycleBuffs = state.cycleBuffs.filter((buff) => buff && buff.expiresAt > timestamp);
    return state.cycleBuffs.flatMap((buff) => (env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[buff.type] || []).map((effect) => ({ stat: effect.stat, val: effect.perCycle * buff.cycle, source: buff.type })));
  }
  function passiveRuleRecordPassiveFanaticSkillUse(env, owner, skillName, devotion) {
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), cap = Math.max(0, Math.floor(Number(devotion) || 0));
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, "타락한 복음") || cap <= 0) {
      state.fanaticism = { skillName: "", stacks: 0 };
      return 0;
    }
    const normalizedName = String(skillName || "");
    const stacks = state.fanaticism.skillName === normalizedName ? state.fanaticism.stacks + 1 : 1;
    state.fanaticism = { skillName: normalizedName, stacks: Math.min(cap, stacks) };
    return state.fanaticism.stacks;
  }

  // modules/domain/passive-karma-rules.mjs
  function passiveRuleIsPassiveKarmaTarget(enemy) {
    return !!(enemy && (enemy.isBoss || enemy.isElite || enemy.elite));
  }
  function passiveRuleRecordPassiveKarmaLoss(env, owner, enemy, resourceLost) {
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, "카르마") || !passiveRuleIsPassiveKarmaTarget(enemy)) return 0;
    const amount = Math.max(0, Math.floor(Number(resourceLost) || 0));
    if (amount <= 0) return 0;
    const karma = passiveRuleEnsurePassiveSpecializationState(env, owner).karma;
    const targetId = String(enemy.id);
    karma.byEnemy[targetId] = Math.min(
      env.deps.PASSIVE_KARMA_PER_TARGET_CAP,
      Math.max(0, Math.floor(karma.byEnemy[targetId] || 0)) + amount
    );
    return karma.byEnemy[targetId];
  }
  function passiveRuleBeginPassiveKarmaAttack(env, owner, enemy, now) {
    const timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), karma = state.karma;
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, "카르마") || !passiveRuleIsPassiveKarmaTarget(enemy)) {
      if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, "카르마")) karma.buff = null;
      return { targetId: "", multiplier: 1, morePct: 0 };
    }
    const targetId = String(enemy.id), stored = Math.max(0, Math.floor(karma.byEnemy[targetId] || 0));
    if (stored > 0) {
      karma.buff = { targetId, morePct: Math.floor(stored / 5), expiresAt: timestamp + 4e3, actionsLeft: 5 };
      delete karma.byEnemy[targetId];
    }
    return consumeKarmaBuff(karma, targetId, timestamp);
  }
  function consumeKarmaBuff(karma, targetId, timestamp) {
    let buff = karma.buff;
    if (!buff || buff.targetId !== targetId || buff.expiresAt <= timestamp || buff.actionsLeft <= 0) {
      if (buff && (buff.expiresAt <= timestamp || buff.actionsLeft <= 0)) karma.buff = null;
      return { targetId, multiplier: 1, morePct: 0 };
    }
    const result = { targetId, multiplier: 1 + buff.morePct / 100, morePct: buff.morePct };
    buff.actionsLeft -= 1;
    if (buff.actionsLeft <= 0) karma.buff = null;
    return result;
  }

  // modules/domain/passive-ailment-rules.mjs
  function passiveRuleGetPassiveAshuraAilmentChance(baseChance, cycle) {
    const base = Math.max(0, Number(baseChance) || 0), cycleChance = Math.max(0, Number(cycle) || 0) / 100;
    return Math.min(1, base + cycleChance);
  }
  function passiveRuleGetPassiveAshuraDamageMultiplier(env, element, ailments, cycle) {
    const ailmentType = env.deps.PASSIVE_AILMENT_BY_ELEMENT[element];
    const active = (Array.isArray(ailments) ? ailments : []).find((ailment) => ailment && ailment.type === ailmentType && Number(ailment.time) > 0);
    if (!active) return 1;
    const remainingSeconds = Math.max(0, Number(active.time) || 0);
    const lessPct = Math.min(50, Math.max(0, Number(cycle) || 0) * remainingSeconds / 10);
    return 1 - lessPct / 100;
  }
  function passiveRuleApplyPassiveAshuraDamageBreakdown(env, breakdown, ailments, cycle) {
    return (Array.isArray(breakdown) ? breakdown : []).map((row) => ({
      ele: row.ele,
      amount: Math.max(0, Math.floor((Number(row.amount) || 0) * passiveRuleGetPassiveAshuraDamageMultiplier(env, row.ele, ailments, cycle)))
    })).filter((row) => row.amount > 0);
  }
  function passiveRuleApplyPassiveConditionalAilmentRules(passive, flags) {
    if (flags.explosiveDistill) {
      ["igniteChance", "chillChance", "freezeChance", "shockChance", "poisonChance", "bleedChance"].forEach((statId) => {
        passive[statId] += 25;
      });
    }
    if (flags.taintedWarhead) {
      passive.igniteChance += 20;
      passive.poisonChance += 20;
      passive.bleedChance += 20;
    }
    if (flags.blackDistill) passive.poisonChance += 20;
  }

  // modules/domain/passive-keystone-buckets.mjs
  function passiveRuleSumPassiveRuleStat(buckets, stat) {
    return Object.values(buckets).reduce((sum, bucket) => sum + Number(bucket && bucket[stat] || 0), 0);
  }
  function passiveRuleZeroPassiveRuleStats(buckets, statIds) {
    Object.values(buckets).forEach((bucket) => statIds.forEach((statId) => {
      bucket[statId] = 0;
    }));
  }
  function passiveRuleConvertPassiveRuleStat(buckets, sourceStat, targetStat) {
    Object.values(buckets).forEach((bucket) => {
      bucket[targetStat] += Number(bucket[sourceStat]) || 0;
      bucket[sourceStat] = 0;
    });
  }
  function passiveRuleApplyPassiveDefenseKeystoneRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "대리 성약")) {
      passive.summonGuardRedirectPct += 50;
      passiveRuleZeroPassiveRuleStats(buckets, ["blockChance", "blockChancePct", "baseBlockChance", "deflectChance"]);
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "완전 회피")) {
      passiveRuleZeroPassiveRuleStats(buckets, ["armor", "armorPct", "blockChance", "blockChancePct", "baseBlockChance"]);
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "움직이는 성벽")) {
      passiveRuleConvertPassiveRuleStat(buckets, "evasion", "armor");
      passiveRuleConvertPassiveRuleStat(buckets, "evasionPct", "armorPct");
      passiveRuleZeroPassiveRuleStats(buckets, ["deflectChance"]);
      passive.blockChanceMax += 5;
      passive.move -= 10;
    }
  }
  function passiveRuleApplyPassiveRecoveryKeystoneRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "혼의 성소")) {
      const regen = passiveRuleSumPassiveRuleStat(buckets, "regen");
      passiveRuleZeroPassiveRuleStats(buckets, ["regen", "regenFlat"]);
      passive.energyShieldRegen += regen;
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "피의 가속")) {
      passiveRuleZeroPassiveRuleStats(buckets, ["regen", "regenFlat"]);
      passive.leechKeepFullLife += 1;
    }
  }
  function passiveRuleApplyPassiveKeystoneBucketRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "육신과 정신의 성약")) {
      passive.devotion += Math.floor(Math.max(0, passive.strength) / 10) + Math.floor(Math.max(0, passive.intelligence) / 10);
      passive.strength = 0;
      passive.intelligence = 0;
    }
    const covenant = passiveRuleFindAllocatedPassiveKeystone(env, owner, "헌신의 서약");
    if (covenant) passive.devotion += passiveRuleCountCovenantAttributeConnections(env, owner, covenant);
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "관통 행렬")) passive.targetProjectile += 2;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "남겨진 잠식")) passive.chaosErosionCap += 20;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "야만")) {
      passiveRuleZeroPassiveRuleStats(buckets, ["dexterity", "intelligence"]);
      passive.flatDmg += Math.max(1, Math.floor(owner.level || 1)) * 3 + Math.floor(passiveRuleSumPassiveRuleStat(buckets, "strength") / 10);
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "순환의 원석")) {
      const strength = passiveRuleSumPassiveRuleStat(buckets, "strength");
      passive.cycle += Math.floor(strength / 30);
      passive.armorPct += Math.floor(Math.max(0, passiveRuleSumPassiveRuleStat(buckets, "cycle")) / 5) * 5;
    }
    passiveRuleApplyPassiveDefenseKeystoneRules(env, owner, buckets);
    passiveRuleApplyPassiveRecoveryKeystoneRules(env, owner, buckets);
    passiveRuleApplyPassiveWrittenKeystoneRules(env, owner, buckets);
    if (passiveRuleHasAuthoredPassiveKeystone(env, owner, "균형의 공명")) passiveRuleApplyBalanceResonance(buckets);
  }
  function passiveRuleApplyBalanceResonance(buckets) {
    [buckets.gearBase, buckets.gearExplicit].filter(Boolean).forEach((bucket) => {
      const half = ((Number(bucket.strength) || 0) + (Number(bucket.dexterity) || 0)) / 2;
      bucket.strength = half;
      bucket.dexterity = half;
    });
    passiveRuleZeroPassiveRuleStats(buckets, ["intelligence"]);
  }
  function passiveRuleApplyPassiveWrittenKeystoneRules(env, owner, buckets) {
    const passive = buckets.passive;
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "시간왜곡")) {
      const recovery = Math.max(0, passiveRuleSumPassiveRuleStat(buckets, "cooldownRecovery"));
      passiveRuleZeroPassiveRuleStats(buckets, ["cooldownRecovery"]);
      passive.chaosPctDmg += recovery * 2;
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "면죄의 복음")) {
      Object.values(buckets).forEach((bucket) => {
        bucket.elementalPctDmg += (Number(bucket.chaosPctDmg) || 0) * 0.5;
        bucket.chaosPctDmg = 0;
      });
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "공허의 별자리")) {
      const voids = passiveRuleGetVirtualVoidPassiveCount(env, owner);
      passive.spellPctDmg += voids * 2;
      passive.spellRepeatChance += voids;
    }
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, "지식의 반목")) passive.attackPctDmg += passiveRuleSumPassiveRuleStat(buckets, "spellPctDmg") * 0.75;
  }

  // modules/domain/passive-combat-flags.mjs
  function passiveRuleGetBladeBundleShots(env, owner, strength, dexterity, stance) {
    if (stance !== "sword" || !passiveRuleFindAllocatedPassiveKeystone(env, owner, "칼날 다발")) return 0;
    return Math.floor(strength) === Math.floor(dexterity) ? Math.floor((strength + dexterity) / 100) : 0;
  }
  function passiveRuleGetPassiveKeystoneCombatFlags(env, owner, skillTags) {
    const tags = new Set(Array.isArray(skillTags) ? skillTags : []);
    return {
      threeBranchLight: passiveRuleHasAuthoredPassiveKeystone(env, owner, "세 갈래 불빛"),
      criticalLimit: passiveRuleHasAuthoredPassiveKeystone(env, owner, "회심의 일격"),
      fleshResonance: passiveRuleHasAuthoredPassiveKeystone(env, owner, "육신의 공명"),
      willResonance: passiveRuleHasAuthoredPassiveKeystone(env, owner, "의지의 공명"),
      farshot: tags.has("projectile") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "최후방 사격"),
      duel: tags.has("attack") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "결투의 규율"),
      bloodCradle: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "피빛 요람"),
      channelPath: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "몰아의 통로"),
      erosionLegacy: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "남겨진 잠식"),
      proxyCovenant: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "대리 성약"),
      maximumRoll: tags.has("attack") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "한 번의 중량"),
      fullEvasion: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "완전 회피"),
      projectileFormation: tags.has("projectile") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "관통 행렬"),
      explosiveDistill: tags.has("potion") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "폭발성 증류"),
      soulSanctuary: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "혼의 성소"),
      movingWall: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "움직이는 성벽"),
      bloodAcceleration: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "피의 가속"),
      openingHunt: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "선제 사냥"),
      taintedWarhead: tags.has("projectile") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "오염된 탄두"),
      blackDistill: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "검은 증류"),
      singleMystique: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "단일 해석"),
      soleMinion: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "단 하나의 사역"),
      potionOverdose: tags.has("potion") && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "과잉 투여"),
      selfExperiment: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "자가실험"),
      absolution: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "면죄의 복음")
    };
  }

  // modules/domain/passive-stat-rules.mjs
  function passiveRuleReadPassiveRuleTickValue(options, name, live) {
    return options.tick ? options.tick.get(name) : live();
  }
  function passiveRuleApplyAuthoredPassiveStatRules(env, owner, options) {
    const buckets = options.buckets, passive = buckets.passive, reward = buckets.reward;
    passiveRuleApplyPassiveKeystoneBucketRules(env, owner, buckets);
    const flags = passiveRuleGetPassiveKeystoneCombatFlags(env, owner, options.skillTags);
    passiveRuleApplyPassiveConditionalAilmentRules(passive, flags);
    const activeCycleBuffEffects = passiveRuleReadPassiveRuleTickValue(options, "cycleBuffEffects", () => passiveRuleGetActivePassiveCycleBuffEffects(env, owner, options.now));
    activeCycleBuffEffects.forEach((effect) => env.deps.addStatToBucket(reward, effect.stat, effect.val));
    const damageByElement = {
      phys: passiveRuleSumPassiveRuleStat(buckets, "physPctDmg"),
      fire: passiveRuleSumPassiveRuleStat(buckets, "firePctDmg"),
      cold: passiveRuleSumPassiveRuleStat(buckets, "coldPctDmg"),
      light: passiveRuleSumPassiveRuleStat(buckets, "lightPctDmg"),
      chaos: passiveRuleSumPassiveRuleStat(buckets, "chaosPctDmg")
    };
    if (damageByElement[options.skillElement] !== void 0) damageByElement[options.skillElement] += 0.01;
    const mystique = passiveRuleGetMystiqueAffinity(env, passive.mystique, damageByElement);
    if (flags.singleMystique) {
      mystique.damagePct *= 2;
      mystique.potencyPct *= 2;
      mystique.chancePct *= 2;
    }
    env.deps.addStatToBucket(passive, `${mystique.ailment}Chance`, mystique.chancePct);
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), corrupted = !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "타락한 복음");
    const triple = !corrupted && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, "삼중 계시");
    const devotion = Math.max(0, passiveRuleSumPassiveRuleStat(buckets, "devotion"));
    const cycle = Math.max(0, passiveRuleSumPassiveRuleStat(buckets, "cycle"));
    const revelation = corrupted ? "fanaticism" : triple ? "triple" : state.revelation;
    applyRevelationLifeBonuses(passive, devotion, revelation, triple);
    const wisdomElement = passiveRuleGetPassiveWisdomElementFromNodeIds(env, owner.passives).replace("lightning", "light");
    return {
      mystique,
      devotion,
      cycle,
      revelation,
      wisdomElement,
      ...revelationBonuses(env, devotion, revelation, triple),
      cycleAddedFireFromPhysicalPct: passiveRuleFindAllocatedPassiveKeystone(env, owner, "순환의 원석") ? cycle * 3 : 0,
      fanaticismStacks: corrupted ? Math.min(devotion, Math.max(0, passiveRuleReadPassiveRuleTickValue(options, "fanaticismStacks", () => state.fanaticism.stacks))) : 0,
      activeCycleBuffEffects,
      flags
    };
  }
  function applyRevelationLifeBonuses(passive, devotion, revelation, triple) {
    if (revelation === "life") {
      passive.pctHp += devotion * 0.5;
      passive.energyShieldPct += devotion * 0.5;
      passive.regen += devotion * 0.5;
    }
    if (triple) {
      passive.pctHp += devotion * 0.2;
      passive.energyShieldPct += devotion * 0.2;
      passive.regen += devotion * 0.2;
    }
  }
  function revelationBonuses(env, devotion, revelation, triple) {
    return {
      revelationLabel: triple ? "삼중 계시" : env.deps.PASSIVE_REVELATION_LABELS[revelation] || "계시",
      combatDamageMorePct: revelation === "combat" ? devotion : triple ? devotion * 0.4 : 0,
      guardTakenLessPct: revelation === "guard" ? Math.min(50, Math.floor(devotion / 5)) : triple ? Math.min(20, Math.floor(devotion / 5) * 0.4) : 0,
      lifeBonusPct: revelation === "life" ? devotion * 0.5 : triple ? devotion * 0.2 : 0
    };
  }

  // modules/domain/passive-rules.mjs
  function createPassiveRules(deps) {
    const env = { deps };
    env.passiveTreeAdjacencyCache = { signature: "", map: /* @__PURE__ */ new Map() };
    return Object.freeze({
      getClassKeystoneDefs: (...args) => passiveRuleGetClassKeystoneDefs(env, ...args),
      isPassiveTreePathEdge: (...args) => passiveRuleIsPassiveTreePathEdge(env, ...args),
      isPassiveTreeEdgeAvailable: passiveRuleIsPassiveTreeEdgeAvailable,
      getPassiveTreeAdjacency: (...args) => passiveRuleGetPassiveTreeAdjacency(env, ...args),
      getPassiveWisdomElementFromNodeIds: (...args) => passiveRuleGetPassiveWisdomElementFromNodeIds(env, ...args),
      normalizePassiveSpecializationState: (...args) => passiveRuleNormalizePassiveSpecializationState(env, ...args),
      ensurePassiveSpecializationState: (...args) => passiveRuleEnsurePassiveSpecializationState(env, ...args),
      getPassiveNodeRawEffects: passiveRuleGetPassiveNodeRawEffects,
      getPassiveNodeActivationState: (...args) => passiveRuleGetPassiveNodeActivationState(env, ...args),
      getEffectivePassiveNodeEffects: (...args) => passiveRuleGetEffectivePassiveNodeEffects(env, ...args),
      getVoidLinkScale: (...args) => passiveRuleGetVoidLinkScale(env, ...args),
      getAllocatedPassiveStatValue: (...args) => passiveRuleGetAllocatedPassiveStatValue(env, ...args),
      hasAuthoredPassiveKeystone: (...args) => passiveRuleHasAuthoredPassiveKeystone(env, ...args),
      findAllocatedPassiveKeystone: (...args) => passiveRuleFindAllocatedPassiveKeystone(env, ...args),
      getPassiveKeystoneNodeId: (...args) => passiveRuleGetPassiveKeystoneNodeId(env, ...args),
      getMystiqueAffinity: (...args) => passiveRuleGetMystiqueAffinity(env, ...args),
      recordPassiveCycleAilmentEnd: (...args) => passiveRuleRecordPassiveCycleAilmentEnd(env, ...args),
      recordPassiveCycleAilmentStart: (...args) => passiveRuleRecordPassiveCycleAilmentStart(env, ...args),
      getActivePassiveCycleBuffEffects: (...args) => passiveRuleGetActivePassiveCycleBuffEffects(env, ...args),
      recordPassiveFanaticSkillUse: (...args) => passiveRuleRecordPassiveFanaticSkillUse(env, ...args),
      recordPassiveKarmaLoss: (...args) => passiveRuleRecordPassiveKarmaLoss(env, ...args),
      beginPassiveKarmaAttack: (...args) => passiveRuleBeginPassiveKarmaAttack(env, ...args),
      getPassiveAshuraAilmentChance: passiveRuleGetPassiveAshuraAilmentChance,
      getPassiveAshuraDamageMultiplier: (...args) => passiveRuleGetPassiveAshuraDamageMultiplier(env, ...args),
      applyPassiveAshuraDamageBreakdown: (...args) => passiveRuleApplyPassiveAshuraDamageBreakdown(env, ...args),
      applyPassiveKeystoneBucketRules: (...args) => passiveRuleApplyPassiveKeystoneBucketRules(env, ...args),
      getBladeBundleShots: (...args) => passiveRuleGetBladeBundleShots(env, ...args),
      applyAuthoredPassiveStatRules: (...args) => passiveRuleApplyAuthoredPassiveStatRules(env, ...args),
      getVirtualVoidPassiveCount: (...args) => passiveRuleGetVirtualVoidPassiveCount(env, ...args)
    });
  }

  // modules/domain/ascend-tree.mjs
  function createAscendTree(defs) {
    return Object.freeze({ tree: (owner, key) => buildOwnedAscendTree(defs, owner, key), addPair: addAscendTreePair });
  }
  function buildOwnedAscendTree(defs, owner, key) {
    const template = defs.classes[key];
    if (!template) return {};
    const spec = defs.nodes[key] || {};
    const tree = buildAscendTreeBase(defs, template, spec);
    if ((owner.completedTrials || []).includes("trial_4")) addAscendTreePair(tree, ["n11", "n12"], spec.core || defs.fallback.core, "n10");
    const talents = defs.talents[owner.bloomedTalentThisLoop];
    if (owner.bloomedClassThisLoop === key && talents) {
      addAscendTreePair(tree, ["n13a", "n13b"], talents, ["n11", "n12"]);
      addAscendTreePair(tree, ["n13c", "n13d"], spec.job || defs.fallback.job, ["n11", "n12"]);
    }
    return tree;
  }
  function buildAscendTreeBase(defs, template, spec) {
    const slots = { m1: template.m1, m2: template.m2, d: template.d, ...spec.slots || {} };
    const nodes = spec.nodes || {}, tree = {};
    defs.layout.forEach(([id, slot, tier, mul, req]) => {
      tree[id] = { ...resolveAscendTreeSpec(defs, nodes[id] || { stat: slots[slot], tier, mul }), req };
    });
    tree.n10 = { ...resolveAscendTreeSpec(defs, nodes.n10 || spec.ult || defs.fallback.ult), req: ["n7", "n8", "n9"] };
    return tree;
  }
  function addAscendTreePair(tree, ids, lines, req) {
    tree[ids[0]] = { stat: lines[0].stat, val: lines[0].val, req, exclusive: ids[1] };
    tree[ids[1]] = { stat: lines[1].stat, val: lines[1].val, req, exclusive: ids[0] };
  }
  function resolveAscendTreeSpec(defs, spec) {
    if (Array.isArray(spec.stats)) return { stats: spec.stats.map((line) => resolveAscendTreeLine(defs, line)) };
    return resolveAscendTreeLine(defs, spec);
  }
  function resolveAscendTreeLine(defs, spec) {
    if (Number.isFinite(spec.val)) return { stat: spec.stat, val: spec.val };
    const key = spec.from || spec.stat;
    const base = ascendTreeStatBase(defs.stats, key, spec.tier === "entry");
    return { stat: spec.stat, val: scaleAscendTreeStat(spec.stat, base, spec.mul) };
  }
  function ascendTreeStatBase(stats, key, entry) {
    const stat = stats[key] || {};
    if (key === "suppCap") return 1;
    if (entry) {
      if (stat.m !== void 0) return stat.m;
      if (stat.s !== void 0) return stat.s;
      return stat.k !== void 0 ? stat.k * 0.5 : 1;
    }
    if (stat.k !== void 0) return stat.k;
    if (stat.m !== void 0) return stat.m;
    return stat.s !== void 0 ? stat.s : 1;
  }
  function scaleAscendTreeStat(stat, base, multiplier) {
    if (stat === "suppCap") return 1;
    const scaled = base * multiplier;
    if (stat === "regen" || stat === "leech") return Math.max(0.1, Math.round(scaled * 10) / 10);
    return Math.max(1, Math.round(scaled));
  }

  // modules/domain/passive-visibility.mjs
  var PassiveVisibility = class {
    constructor(data, runtime, allocation, rules2) {
      this.data = data;
      this.runtime = runtime;
      this.allocation = allocation;
      this.rules = rules2;
    }
    *calculateReachableNodes(owner) {
      const reachable = this.runtime.reachableNodes;
      reachable.clear();
      const rootId = this.allocation.getPassiveTreeRootNodeId(owner);
      const available = (id) => this.allocation.isPassiveNodeAvailable(owner, id);
      if (available(rootId)) reachable.add(rootId);
      if (!owner) return;
      const connections = this.allocation.getPassiveConnectionNodeIds(owner);
      connections.forEach((id) => {
        if (available(id)) reachable.add(id);
      });
      this.data.routing.freeNodes(this.data.tree, owner).forEach((id) => {
        if (available(id)) reachable.add(id);
      });
      const blocked = this.allocation.getPassiveBlockedStartIds(owner);
      this.data.tree.edges.forEach((edge) => {
        if (!this.rules.isPassiveTreePathEdge(owner, edge)) return;
        if (!available(edge.from) || !available(edge.to)) return;
        if (connections.has(String(edge.from)) && !blocked.has(edge.to)) reachable.add(edge.to);
        if (connections.has(String(edge.to)) && !blocked.has(edge.from)) reachable.add(edge.from);
      });
      yield { kind: "passiveRenderDirty", args: ["state"] };
    }
    isPassiveLocalReveal(owner, origin, node, radius, maxDepthGap) {
      if (!origin || !node || origin.id === node.id) return false;
      if (Math.hypot(node.x - origin.x, node.y - origin.y) > radius) return false;
      if (origin.id === this.allocation.getPassiveTreeRootNodeId(owner)) return (node.depth || 0) <= 1;
      return this.inSectorDepth(origin, node, maxDepthGap);
    }
    inSectorDepth(origin, node, maxDepthGap) {
      if (!origin.sector || !node.sector || origin.sector !== node.sector) return false;
      return Math.abs((origin.depth || 0) - (node.depth || 0)) <= maxDepthGap;
    }
    *refreshPassiveVisibility(owner) {
      const available = Object.values(this.data.tree.nodes).filter((node) => this.allocation.isPassiveNodeAvailable(owner, node));
      this.runtime.discoveredNodes = new Set(available.map((node) => node.id));
      this.runtime.previewNodes = /* @__PURE__ */ new Set();
      yield { kind: "passiveRenderDirty", args: ["state"] };
    }
    discoverAround(owner, nodeId, origin, options, radius) {
      const rootId = this.allocation.getPassiveTreeRootNodeId(owner);
      const edgeDepth = options.edgeDepth !== void 0 ? options.edgeDepth : nodeId === rootId ? this.data.rootEdgeDepth : this.data.edgeDepth;
      const ids = /* @__PURE__ */ new Set([nodeId]);
      this.allocation.getPassiveLinkedNodeIds(owner, nodeId, edgeDepth).forEach((id) => ids.add(id));
      Object.values(this.data.tree.nodes).forEach((node) => {
        if (!this.allocation.isPassiveNodeAvailable(owner, node)) return;
        const reveal = nodeId === rootId ? node.kind === "core" && node.layoutDepth === 1 : this.isPassiveLocalReveal(owner, origin, node, radius, 2);
        if (reveal) ids.add(node.id);
      });
      const discovered = [];
      ids.forEach((id) => {
        if ((owner.discoveredPassives || []).includes(id)) return;
        owner.discoveredPassives.push(id);
        discovered.push(id);
      });
      return discovered;
    }
    *revealAroundNode(owner, nodeId, options = {}) {
      options = options || {};
      const origin = this.data.tree.nodes[nodeId];
      if (!origin || !this.allocation.isPassiveNodeAvailable(owner, origin)) return;
      const radius = options.radius || this.data.radius;
      const nodeIds = this.discoverAround(owner, nodeId, origin, options, radius);
      if (!options.noBurst && (nodeIds.length > 0 || options.forcePulse)) {
        yield { kind: "passiveRevealBurst", args: [{ originId: nodeId, nodeIds, x: origin.x, y: origin.y, radius, duration: 900 }] };
      }
      yield* this.refreshPassiveVisibility(owner);
      yield { kind: "passiveRenderDirty", args: ["state"] };
    }
    getPassiveVisibility(owner, nodeId) {
      if (!this.allocation.isPassiveNodeAvailable(owner, nodeId)) return "hidden";
      if (this.runtime.discoveredNodes.has(nodeId)) return "discovered";
      if (this.runtime.previewNodes.has(nodeId)) return "preview";
      return "hidden";
    }
  };

  // modules/common/combat-clock.mjs
  function readCombatTime(game2, wallClockNow) {
    return typeof game2 !== "undefined" && game2 && Number.isFinite(game2.combatTimeMs) && game2.combatTimeMs > 0 ? game2.combatTimeMs : wallClockNow();
  }

  // modules/combat/death-damage-history.mjs
  var FIGHT_GAP_MS = 8e3;
  var DAMAGE_AILMENT_SOURCES = ["점화", "중독", "출혈"];
  var DeathDamageHistory = class {
    constructor(deps) {
      this.deps = deps;
      this.ledgers = /* @__PURE__ */ new WeakMap();
    }
    snapshotAilments(owner) {
      return (Array.isArray(owner.playerAilments) ? owner.playerAilments : []).filter((ail) => ail && (ail.time || 0) > 0).map((ail) => ({
        type: ail.type || "unknown",
        label: this.deps.ailmentLabel(ail.type),
        time: Math.max(0, Math.ceil(ail.time || 0)),
        power: Math.max(0, Number(ail.power) || 0),
        sourceHitDamage: Math.max(0, Math.floor(this.deps.storedHitDamage(ail))),
        sourceEnemyName: ail.sourceEnemyName || ""
      }));
    }
    prune(owner, now) {
      const threshold = now - 3200;
      owner.recentDamageEvents = Array.isArray(owner.recentDamageEvents) ? owner.recentDamageEvents.filter((entry) => entry && entry.at >= threshold) : [];
    }
    record(owner, ele, amount, sourceName, options) {
      const now = readCombatTime(owner, Date.now);
      const opts = options && typeof options === "object" ? options : {};
      this.prune(owner, now);
      const entry = {
        at: now,
        ele: this.deps.elementKey(ele),
        amount: Math.max(0, Math.floor(amount || 0)),
        source: sourceName || "",
        sourceType: opts.sourceType || "hazard",
        sourceId: opts.sourceId === void 0 ? null : opts.sourceId,
        sourceName: opts.sourceName || sourceName || "",
        ailmentType: opts.ailmentType || ""
      };
      owner.recentDamageEvents.push(entry);
      this.accumulate(owner, entry);
    }
    accumulate(owner, entry) {
      let ledger = this.ledgers.get(owner);
      if (!ledger || entry.at < ledger.lastAt || entry.at - ledger.lastAt > FIGHT_GAP_MS) {
        ledger = { startedAt: entry.at, lastAt: entry.at, rows: /* @__PURE__ */ new Map() };
        this.ledgers.set(owner, ledger);
      }
      ledger.lastAt = entry.at;
      const key = [entry.ele, entry.sourceType, entry.sourceId, entry.sourceName, entry.source, entry.ailmentType].join("|");
      const row = ledger.rows.get(key);
      if (row) row.amount += entry.amount;
      else ledger.rows.set(key, { ...entry });
    }
    takeFight(owner) {
      const ledger = this.ledgers.get(owner);
      this.ledgers.delete(owner);
      if (!ledger) return null;
      const rows = [...ledger.rows.values()];
      return {
        seconds: Math.max(1, Math.round((ledger.lastAt - ledger.startedAt) / 1e3)),
        damageSummary: this.summarizeElements(owner, Infinity, { events: rows }),
        ailmentDamageSummary: this.summarizeElements(owner, Infinity, { events: rows, ailmentOnly: true }),
        monsterSummary: this.summarizeMonsters(owner, Infinity, rows)
      };
    }
    summarizeElements(owner, windowMs, opts) {
      const now = readCombatTime(owner, Date.now);
      this.prune(owner, now);
      const options = opts || {};
      const totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
      (options.events || owner.recentDamageEvents || []).forEach((entry) => {
        if (!entry || entry.at < now - (windowMs || 3e3)) return;
        if (options.ailmentOnly && !entry.ailmentType && !DAMAGE_AILMENT_SOURCES.includes(entry.source || "")) return;
        totals[this.deps.elementKey(entry.ele)] += Math.max(0, Math.floor(entry.amount || 0));
      });
      return Object.keys(totals).map((key) => ({ ele: key, value: totals[key] })).filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value);
    }
    summarizeMonsters(owner, windowMs, events) {
      const now = readCombatTime(owner, Date.now);
      this.prune(owner, now);
      const grouped = /* @__PURE__ */ new Map();
      (events || owner.recentDamageEvents || []).forEach((entry) => {
        if (!entry || entry.at < now - (windowMs || 3e3) || entry.sourceType !== "monster") return;
        this.addMonsterDamage(grouped, entry);
      });
      return Array.from(grouped.values()).map((row) => {
        const dominant = Object.entries(row.byElement).sort((a, b) => b[1] - a[1])[0];
        return { ...row, primaryElement: dominant ? dominant[0] : "phys" };
      }).sort((a, b) => b.value - a.value);
    }
    addMonsterDamage(grouped, entry) {
      const key = entry.sourceId === null || entry.sourceId === void 0 ? `name:${entry.sourceName || entry.source}` : `id:${entry.sourceId}`;
      const row = grouped.get(key) || { sourceId: entry.sourceId, name: entry.sourceName || entry.source || "알 수 없는 몬스터", value: 0, byElement: {} };
      const element = this.deps.elementKey(entry.ele);
      const value = Math.max(0, Math.floor(entry.amount || 0));
      row.value += value;
      row.byElement[element] = (row.byElement[element] || 0) + value;
      grouped.set(key, row);
    }
  };

  // modules/passive-rules-classic.mjs
  var VOID_PASSIVE_OPTION_POOL = createVoidPassiveOptionPool(SKILL_RUNE_STANCE_LABELS);
  var TRANSCENDENT_VOID_PASSIVE_DB = createTranscendentVoidPassiveDefinitions((...args) => _t(...args), {
    TRANSCENDENT_ANDROMEDA_RADIUS,
    TRANSCENDENT_ASTEROID_RADIUS,
    TRANSCENDENT_VOID_VALUES
  });
  var TRANSCENDENT_VOID_STAT_LINES = createTranscendentVoidStatLines(TRANSCENDENT_ASTEROID_RADIUS);
  var OCEAN_MOD_CATEGORY_RULES = createOceanModCategoryRules(AFFIX_TAG_LISTS, MOD_DB, resolveAffixTagList);
  var isOceanAutoRediveHalted2 = (state) => isOceanAutoRediveHalted(state, OCEAN_AUTO_REDIVE.missLimit);
  var deathHistory = new DeathDamageHistory({
    get ailmentLabel() {
      return getAilmentDisplayLabel2;
    },
    get storedHitDamage() {
      return getStoredAilmentHitDamage;
    },
    get elementKey() {
      return normalizeDamageElementKey2;
    }
  });
  var ascendTree = createAscendTree({
    get classes() {
      return CLASS_TEMPLATES;
    },
    get nodes() {
      return ASCENDANCY_NODE_DEFS;
    },
    get fallback() {
      return ASCENDANCY_NODE_FALLBACK;
    },
    get talents() {
      return TALENT_BLOOM_SPECIALIZATION_DEFS;
    },
    get layout() {
      return ASCENDANCY_NODE_LAYOUT;
    },
    get stats() {
      return P_STATS;
    }
  });
  var rules = createPassiveRules({
    get CLASS_KEYSTONE_DEFS() {
      return CLASS_KEYSTONE_DEFS;
    },
    get PASSIVE_KEYSTONE_NODE_ID_BY_TITLE() {
      return PASSIVE_KEYSTONE_NODE_ID_BY_TITLE;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get PASSIVE_WISDOM_ELEMENT_BY_NODE_ID() {
      return PASSIVE_WISDOM_ELEMENT_BY_NODE_ID;
    },
    get PASSIVE_REVELATION_IDS() {
      return PASSIVE_REVELATION_IDS;
    },
    get PASSIVE_WISDOM_ELEMENTS() {
      return PASSIVE_WISDOM_ELEMENTS;
    },
    get PASSIVE_CYCLE_BUFF_EFFECTS() {
      return PASSIVE_CYCLE_BUFF_EFFECTS;
    },
    get PASSIVE_AILMENT_BY_ELEMENT() {
      return PASSIVE_AILMENT_BY_ELEMENT;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get PASSIVE_KARMA_PER_TARGET_CAP() {
      return PASSIVE_KARMA_PER_TARGET_CAP;
    },
    get addStatToBucket() {
      return addStatToBucket;
    },
    get PASSIVE_REVELATION_LABELS() {
      return PASSIVE_REVELATION_LABELS;
    },
    get passiveRouting() {
      return passiveRouting;
    }
  });
  var passiveRules = Object.freeze({
    ...rules,
    isPassiveTreePathEdge: (...args) => rules.isPassiveTreePathEdge(game, ...args),
    isPassiveTreeEdgeAvailable: (...args) => rules.isPassiveTreeEdgeAvailable(game, ...args),
    getPassiveTreeAdjacency: (...args) => rules.getPassiveTreeAdjacency(game, ...args),
    ensurePassiveSpecializationState: (...args) => rules.ensurePassiveSpecializationState(game, ...args),
    getPassiveNodeActivationState: (...args) => rules.getPassiveNodeActivationState(game, ...args),
    getEffectivePassiveNodeEffects: (...args) => rules.getEffectivePassiveNodeEffects(game, ...args),
    getVoidLinkScale: (...args) => rules.getVoidLinkScale(game, ...args),
    getAllocatedPassiveStatValue: (...args) => rules.getAllocatedPassiveStatValue(game, ...args),
    hasAuthoredPassiveKeystone: (...args) => rules.hasAuthoredPassiveKeystone(game, ...args),
    findAllocatedPassiveKeystone: (...args) => rules.findAllocatedPassiveKeystone(game, ...args),
    recordPassiveCycleAilmentEnd: (...args) => rules.recordPassiveCycleAilmentEnd(game, ...args),
    recordPassiveCycleAilmentStart: (...args) => rules.recordPassiveCycleAilmentStart(game, ...args),
    getActivePassiveCycleBuffEffects: (...args) => rules.getActivePassiveCycleBuffEffects(game, ...args),
    recordPassiveFanaticSkillUse: (...args) => rules.recordPassiveFanaticSkillUse(game, ...args),
    recordPassiveKarmaLoss: (...args) => rules.recordPassiveKarmaLoss(game, ...args),
    beginPassiveKarmaAttack: (...args) => rules.beginPassiveKarmaAttack(game, ...args),
    applyPassiveKeystoneBucketRules: (...args) => rules.applyPassiveKeystoneBucketRules(game, ...args),
    getBladeBundleShots: (...args) => rules.getBladeBundleShots(game, ...args),
    applyAuthoredPassiveStatRules: (...args) => rules.applyAuthoredPassiveStatRules(game, ...args),
    getVirtualVoidPassiveCount: (owner = game) => rules.getVirtualVoidPassiveCount(owner)
  });
  var allocationRules = createPassiveAllocation({
    get PASSIVE_TREE_V22() {
      return typeof PASSIVE_TREE_V22 === "undefined" ? void 0 : PASSIVE_TREE_V22;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get PASSIVE_START_GATE_CLASS_BY_TITLE() {
      return PASSIVE_START_GATE_CLASS_BY_TITLE;
    },
    get passiveRouting() {
      return passiveRouting;
    },
    get isPassiveTreePathEdge() {
      return rules.isPassiveTreePathEdge;
    },
    get getPassiveTreeAdjacency() {
      return rules.getPassiveTreeAdjacency;
    },
    get getPassiveKeystoneNodeId() {
      return rules.getPassiveKeystoneNodeId;
    },
    get enforcePassiveEquipmentRestrictions() {
      return enforcePassiveEquipmentRestrictions;
    },
    get contentProgression() {
      return typeof contentProgression === "undefined" ? void 0 : contentProgression;
    },
    get PASSIVE_DISCOVERY_RADIUS() {
      return PASSIVE_DISCOVERY_RADIUS;
    },
    get _t() {
      return _t;
    },
    get hasAuthoredPassiveKeystone() {
      return rules.hasAuthoredPassiveKeystone;
    },
    get PASSIVE_REVELATION_IDS() {
      return PASSIVE_REVELATION_IDS;
    },
    get getAllocatedPassiveStatValue() {
      return rules.getAllocatedPassiveStatValue;
    },
    get findAllocatedPassiveKeystone() {
      return rules.findAllocatedPassiveKeystone;
    },
    get ensurePassiveSpecializationState() {
      return rules.ensurePassiveSpecializationState;
    }
  });
  var allocationEffects = {
    get passiveNormalizeSupport() {
      return normalizeSupportLoadout.bind(void 0);
    },
    get passiveJournal() {
      return unlockJournalEntry.bind(void 0);
    },
    get passiveReveal() {
      return revealAroundNode.bind(void 0);
    },
    get passiveLog() {
      return addLog.bind(void 0);
    },
    get passiveTutorial() {
      return queueTutorialNotice.bind(void 0);
    },
    get passiveRenderDirty() {
      return typeof markPassiveRenderCacheDirty === "function" ? markPassiveRenderCacheDirty.bind(void 0) : () => void 0;
    }
  };
  var passiveAllocation = Object.freeze({
    ...allocationRules,
    getPassiveTreeRootNodeId: (state) => allocationRules.getPassiveTreeRootNodeId(state || (typeof game !== "undefined" ? game : null) || {}),
    getPassiveTreeRootNode: (state) => allocationRules.getPassiveTreeRootNode(state || (typeof game !== "undefined" ? game : null) || {}),
    getPassiveGatedStartIds: (owner = game) => allocationRules.getPassiveGatedStartIds(owner),
    getPassiveBlockedStartIds: (owner = game) => allocationRules.getPassiveBlockedStartIds(owner),
    getPassiveRouting: (owner = game) => allocationRules.getPassiveRouting(owner),
    isPassiveNodeAvailable: (...args) => allocationRules.isPassiveNodeAvailable(game, ...args),
    isVoidSocketHidden: (...args) => allocationRules.isVoidSocketHidden(game, ...args),
    getPassiveConnectionNodeIds: (...args) => allocationRules.getPassiveConnectionNodeIds(game, ...args),
    getPassiveConstellationAwakeningProgress: (...args) => allocationRules.getPassiveConstellationAwakeningProgress(game, ...args),
    unlockPassiveStarEvolution: (...args) => consumeDomainCommands(allocationRules.unlockPassiveStarEvolution(game, ...args), allocationEffects),
    rebasePassiveTreeForClassChange: (...args) => consumeDomainCommands(allocationRules.rebasePassiveTreeForClassChange(game, ...args), allocationEffects),
    setPassiveRevelation: (...args) => allocationRules.setPassiveRevelation(game, ...args),
    getPassiveActivationPath: (...args) => allocationRules.getPassiveActivationPath(game, ...args),
    getPassiveKeystoneConflict: (...args) => allocationRules.getPassiveKeystoneConflict(game, ...args),
    activatePassivePath: (...args) => consumeDomainCommands(allocationRules.activatePassivePath(game, ...args), allocationEffects),
    getPassiveLinkedNodeIds: (...args) => allocationRules.getPassiveLinkedNodeIds(game, ...args)
  });
  var visibilityRules = new PassiveVisibility({
    get tree() {
      return PASSIVE_TREE;
    },
    get routing() {
      return passiveRouting;
    },
    get radius() {
      return PASSIVE_DISCOVERY_RADIUS;
    },
    get rootEdgeDepth() {
      return PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH;
    },
    get edgeDepth() {
      return PASSIVE_DISCOVERY_EDGE_DEPTH;
    }
  }, window.GameModules.passiveTree, allocationRules, rules);
  window.GameModules.passiveVisibility = visibilityRules;
  var plannerRules = createPassivePlanner({
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get PASSIVE_NODE_ID_MIGRATIONS() {
      return typeof PASSIVE_NODE_ID_MIGRATIONS === "undefined" ? void 0 : PASSIVE_NODE_ID_MIGRATIONS;
    },
    get PASSIVE_NODE_ID_MERGED() {
      return PASSIVE_NODE_ID_MERGED;
    },
    get PASSIVE_NODE_ID_LEGACY_PREFIX() {
      return PASSIVE_NODE_ID_LEGACY_PREFIX;
    },
    get PASSIVE_TREE_PRESET_SLOTS() {
      return PASSIVE_TREE_PRESET_SLOTS;
    },
    get PASSIVE_LAYOUT_VERSION() {
      return PASSIVE_LAYOUT_VERSION;
    },
    get contentProgression() {
      return contentProgression;
    },
    get _t() {
      return _t;
    },
    allocation: allocationRules,
    encodePresetPayload: (payload) => btoa(unescape(encodeURIComponent(payload))),
    decodePresetPayload: (body) => decodeURIComponent(escape(atob(body)))
  });
  var plannerEffects = Object.create(allocationEffects, Object.getOwnPropertyDescriptors({
    get passiveReachable() {
      return calculateReachableNodes.bind(void 0);
    },
    get passiveVisibility() {
      return refreshPassiveVisibility.bind(void 0);
    }
  }));
  var passivePlanner = Object.freeze({
    ...plannerRules,
    ensurePassiveTreePlannerState: () => plannerRules.ensurePassiveTreePlannerState(game),
    saveCurrentPassiveTreePreset: (...args) => plannerRules.saveCurrentPassiveTreePreset(game, ...args),
    setActivePassiveTreePreset: (...args) => plannerRules.setActivePassiveTreePreset(game, ...args),
    setPassiveTreeAutoInvest: (...args) => plannerRules.setPassiveTreeAutoInvest(game, ...args),
    encodePassiveTreePreset: (...args) => plannerRules.encodePassiveTreePreset(game, ...args),
    importPassiveTreePreset: (...args) => plannerRules.importPassiveTreePreset(game, ...args),
    runPassiveTreeAutoInvest: () => consumeDomainCommands(plannerRules.runPassiveTreeAutoInvest(game), plannerEffects)
  });
  var voidRules = createVoidPassives({
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get P_STATS() {
      return P_STATS;
    },
    get STAT_DISPLAY_NAMES() {
      return STAT_DISPLAY_NAMES;
    },
    get TRANSCENDENT_VOID_PASSIVE_DB() {
      return TRANSCENDENT_VOID_PASSIVE_DB;
    },
    get TRANSCENDENT_VOID_STAT_LINES() {
      return TRANSCENDENT_VOID_STAT_LINES;
    },
    get getVoidLinkScale() {
      return passiveRules.getVoidLinkScale;
    },
    get VOID_PASSIVE_OPTION_POOL() {
      return VOID_PASSIVE_OPTION_POOL;
    },
    get rndChoice() {
      return rndChoice;
    },
    get passiveRouting() {
      return passiveRouting;
    },
    get getPassiveRouting() {
      return allocationRules.getPassiveRouting;
    },
    get unlockPassiveStarEvolution() {
      return allocationRules.unlockPassiveStarEvolution;
    },
    get _t() {
      return _t;
    },
    get ORB_DB() {
      return ORB_DB;
    }
  });
  var voidEffects = Object.create(allocationEffects, Object.getOwnPropertyDescriptors({
    get voidLog() {
      return addLog.bind(void 0);
    },
    get voidRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get voidSave() {
      return queueImportantSave.bind(void 0);
    },
    get voidReachable() {
      return calculateReachableNodes.bind(void 0);
    },
    get voidVisibility() {
      return refreshPassiveVisibility.bind(void 0);
    },
    voidCanLog: () => typeof addLog === "function",
    voidInvalidateStats: () => playerStatCache.invalidate(),
    voidTranscendentLabel: (entry) => formatTranscendentVoidPassive(entry).replace(/<[^>]*>/g, ""),
    voidEffectLabel: (nodeId) => getVoidPassiveEffectLabel(nodeId).replace(/<[^>]*>/g, "")
  }));
  var voidPassives = Object.freeze({
    ...voidRules,
    getVoidPassiveCraft: (...args) => voidRules.getVoidPassiveCraft(game, ...args),
    getChameleonChoices: (...args) => voidRules.getChameleonChoices(game, ...args),
    getTranscendentVoidPassiveStats: (nodeId, entry, voidCount, owner = game) => voidRules.getTranscendentVoidPassiveStats(owner, nodeId, entry, voidCount),
    getTranscendentVoidPassiveCount: (id, owner = game) => voidRules.getTranscendentVoidPassiveCount(owner, id, owner === game),
    refreshPassiveConnectivity: (...args) => consumeDomainCommands(voidRules.refreshPassiveConnectivity(game, ...args), voidEffects),
    convertChameleonVoidPassive: (...args) => consumeDomainCommands(voidRules.convertChameleonVoidPassive(game, ...args), voidEffects),
    recordImmortalHeroDeathPenalty: (...args) => consumeDomainCommands(voidRules.recordImmortalHeroDeathPenalty(game, ...args), voidEffects),
    applyVoidPassiveCurrency: (...args) => consumeDomainCommands(voidRules.applyVoidPassiveCurrency(game, ...args), voidEffects)
  });
  var progressEffects = {
    get progressLog() {
      return addLog.bind(void 0);
    },
    get progressRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get progressSave() {
      return queueImportantSave.bind(void 0);
    },
    get progressAwardCurrency() {
      return awardCurrency.bind(void 0);
    },
    get progressBattleFx() {
      return addBattleFx.bind(void 0);
    },
    get progressCostText() {
      return getOceanUpgradeCostText.bind(void 0);
    },
    get progressGenerateEquipment() {
      return generateEquipmentDrop.bind(void 0);
    },
    get progressStoreEquipment() {
      return addItemToInventory.bind(void 0);
    },
    get progressItemName() {
      return getItemDisplayName.bind(void 0);
    },
    get progressJournal() {
      return unlockJournalEntry.bind(void 0);
    },
    get progressMoveAfterSurface() {
      return moveAfterSurfacing.bind(void 0);
    },
    get progressOptionalSave() {
      return typeof queueImportantSave === "function" ? queueImportantSave.bind(void 0) : () => void 0;
    },
    get progressOptionalRefresh() {
      return typeof updateStaticUI === "function" ? updateStaticUI.bind(void 0) : () => void 0;
    },
    progressRareFishChance: readOceanRareFishChance,
    progressAutoSurface: completeOceanAutoSurface
  };
  function readOceanRareFishChance() {
    try {
      return typeof getPlayerStats === "function" ? Math.max(0, Number(getPlayerStats().oceanRareFishChancePct) || 0) : 0;
    } catch (error) {
      console.warn("failed to read ocean rare fish chance stat:", error);
      return 0;
    }
  }
  function completeOceanAutoSurface(returnZoneId) {
    try {
      progressEffects.progressMoveAfterSurface(returnZoneId);
      progressEffects.progressOptionalRefresh();
    } catch (error) {
      console.warn("failed to auto-surface from ocean:", error);
    }
  }
  var meteorProgressRules = createMeteorProgress({
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get METEOR_SITE_FLAGS() {
      return METEOR_SITE_FLAGS;
    },
    get METEOR_SITE_NUMBERS() {
      return METEOR_SITE_NUMBERS;
    },
    get METEOR_KINDS() {
      return METEOR_KINDS;
    },
    get getMeteorSiteUnlockReady() {
      return getMeteorSiteUnlockReady;
    },
    get _t() {
      return _t;
    },
    get contentProgression() {
      return contentProgression;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get clampNumber() {
      return clampNumber;
    },
    get METEOR_SITE_UNLOCK_ACT() {
      return METEOR_SITE_UNLOCK_ACT;
    },
    get atlasPassives() {
      return atlasPassives;
    },
    get rndChoice() {
      return rndChoice;
    },
    get METEOR_CONSTELLATION_POOL() {
      return METEOR_CONSTELLATION_POOL;
    },
    get getZone() {
      return getZone;
    }
  });
  var meteorProgress = Object.freeze({
    ...meteorProgressRules,
    ensureMeteorSiteState: (owner = game) => meteorProgressRules.ensureMeteorSiteState(owner),
    getMeteorKind: (...args) => meteorProgressRules.getMeteorKind(game, ...args),
    tryUnlockMeteorContentByProgress: (...args) => consumeDomainCommands(meteorProgressRules.tryUnlockMeteorContentByProgress(game, ...args), progressEffects),
    gainSkyRiftGaugeFromCombat: (...args) => consumeDomainCommands(meteorProgressRules.gainSkyRiftGaugeFromCombat(game, ...args), progressEffects),
    grantMeteorEncounterRewards: (...args) => consumeDomainCommands(meteorProgressRules.grantMeteorEncounterRewards(game, ...args), progressEffects)
  });
  var oceanProgressRules = createOceanProgress({
    get ensureOceanState() {
      return ensureOceanState;
    },
    get OCEAN_FISHING_STRATEGIES() {
      return OCEAN_FISHING_STRATEGIES;
    },
    get OCEAN_FISH_DB() {
      return OCEAN_FISH_DB;
    },
    get OCEAN_FISH_COLLECTION_MILESTONES() {
      return OCEAN_FISH_COLLECTION_MILESTONES;
    },
    get _t() {
      return _t;
    },
    get withDirectionParticle() {
      return withDirectionParticle;
    },
    get getOceanDepthTier() {
      return getOceanDepthTier;
    },
    get getOceanFishingGaugeGainMul() {
      return getOceanFishingGaugeGainMul;
    },
    get hasOceanCurrent() {
      return hasOceanCurrent;
    },
    get clampNumber() {
      return clampNumber;
    },
    get OCEAN_FISH_RARITY_META() {
      return OCEAN_FISH_RARITY_META;
    },
    get withObjectParticle() {
      return withObjectParticle;
    },
    get OCEAN_PERMANENT_UPGRADE_DEFS() {
      return OCEAN_PERMANENT_UPGRADE_DEFS;
    },
    get getOceanPermanentUpgradeLevel() {
      return getOceanPermanentUpgradeLevel;
    },
    get getOceanOxygenMax() {
      return getOceanOxygenMax;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get getContentStartBlockReason() {
      return getContentStartBlockReason;
    },
    get getOceanDiveRecord() {
      return getOceanDiveRecord;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getOceanBossBoundaryInterval() {
      return typeof getOceanBossBoundaryInterval === "undefined" ? void 0 : getOceanBossBoundaryInterval;
    },
    get OCEAN_AUTO_REDIVE() {
      return OCEAN_AUTO_REDIVE;
    },
    get getZone() {
      return getZone;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get getOceanOxygenDrainPerSec() {
      return getOceanOxygenDrainPerSec;
    },
    get OCEAN_COMBAT_DIVE() {
      return OCEAN_COMBAT_DIVE;
    }
  });
  var oceanProgress = Object.freeze({
    ...oceanProgressRules,
    getOceanFishingStrategyDef: (...args) => oceanProgressRules.getOceanFishingStrategyDef(game, ...args),
    getOceanFishCollectionProgress: (...args) => oceanProgressRules.getOceanFishCollectionProgress(game, ...args),
    getOceanFishCollectionBonus: (...args) => oceanProgressRules.getOceanFishCollectionBonus(game, ...args),
    setOceanFishingStrategy: (...args) => consumeDomainCommands(oceanProgressRules.setOceanFishingStrategy(game, ...args), progressEffects),
    claimOceanFishCollectionMilestone: (...args) => consumeDomainCommands(oceanProgressRules.claimOceanFishCollectionMilestone(game, ...args), progressEffects),
    advanceOceanDiveFromKill: (...args) => consumeDomainCommands(oceanProgressRules.advanceOceanDiveFromKill(game, ...args), progressEffects),
    getOceanPermanentUpgradeCost: (...args) => oceanProgressRules.getOceanPermanentUpgradeCost(game, ...args),
    canPayOceanUpgradeCost: (...args) => oceanProgressRules.canPayOceanUpgradeCost(game, ...args),
    upgradeOceanPermanent: (...args) => consumeDomainCommands(oceanProgressRules.upgradeOceanPermanent(game, ...args), progressEffects),
    installOceanReefFragment: (...args) => consumeDomainCommands(oceanProgressRules.installOceanReefFragment(game, ...args), progressEffects),
    enterOceanDive: (...args) => consumeDomainCommands(oceanProgressRules.enterOceanDive(game, ...args), progressEffects),
    forceSurfaceOcean: (...args) => consumeDomainCommands(oceanProgressRules.forceSurfaceOcean(game, ...args), progressEffects),
    recordOceanSurface: (...args) => oceanProgressRules.recordOceanSurface(game, ...args),
    setOceanAutoRedive: (...args) => oceanProgressRules.setOceanAutoRedive(game, ...args),
    tickOceanOxygen: (...args) => consumeDomainCommands(oceanProgressRules.tickOceanOxygen(game, ...args), progressEffects),
    tickOceanDepth: (...args) => consumeDomainCommands(oceanProgressRules.tickOceanDepth(...args), progressEffects),
    applyOceanKill: (...args) => oceanProgressRules.applyOceanKill(game, ...args)
  });
  var journalRules = createJournalProgress({
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get SEASON_BOSS_ZONES() {
      return typeof SEASON_BOSS_ZONES === "undefined" ? void 0 : SEASON_BOSS_ZONES;
    },
    get memoryLeaves() {
      return memoryLeaves;
    },
    get contentProgression() {
      return contentProgression;
    },
    get _t() {
      return _t;
    }
  });
  var journalEffects = {
    get journalAutoInvest() {
      return typeof runPassiveTreeAutoInvest === "function" ? runPassiveTreeAutoInvest.bind(void 0) : () => void 0;
    },
    get journalInvalidateStats() {
      return playerStatCache.invalidate.bind(playerStatCache);
    },
    get journalLog() {
      return addLog.bind(void 0);
    },
    get journalPinnacleReward() {
      return worldTreeBark.rewardPinnacleFirstKill.bind(worldTreeBark);
    },
    get journalRefreshGoals() {
      return typeof requestGoalSystemRefresh === "function" ? requestGoalSystemRefresh.bind(void 0) : () => void 0;
    }
  };
  var journalProgress = Object.freeze({
    ...journalRules,
    getClaimedJournalPassivePointTotal: (state) => journalRules.getClaimedJournalPassivePointTotal(state && typeof state === "object" ? state : game),
    grantJournalBonus: (entryId, state = game) => consumeDomainCommands(journalRules.grantJournalBonus(state, entryId, state === game), journalEffects),
    unlockJournalEntry: (entryId, state = game) => consumeDomainCommands(journalRules.unlockJournalEntry(state, entryId, state === game), journalEffects),
    ensureActJournalCompletionForLoop: (options) => consumeDomainCommands(journalRules.ensureActJournalCompletionForLoop(game, options, true), journalEffects)
  });
  var actRules = createActRewards({
    get ACT_REWARD_DB() {
      return ACT_REWARD_DB;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get contentProgression() {
      return contentProgression;
    },
    get HANA_WEAPON_COMBOS() {
      return HANA_WEAPON_COMBOS;
    },
    get WEAPON_CATEGORIES() {
      return WEAPON_CATEGORIES;
    },
    get _t() {
      return _t;
    },
    get keepWeaponCategoryBases() {
      return keepWeaponCategoryBases;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get createItemFromBase() {
      return createItemFromBase;
    },
    get rollBaseStat() {
      return rollBaseStat;
    },
    get FIRST_ACT_REWARD_STATS() {
      return FIRST_ACT_REWARD_STATS;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get getAffixTierRange() {
      return getAffixTierRange;
    },
    get updateItemName() {
      return updateItemName;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getStatName() {
      return getStatName;
    },
    get P_STATS() {
      return P_STATS;
    },
    get MAP_ZONES() {
      return MAP_ZONES;
    }
  });
  var actEffects = {
    get actLog() {
      return addLog.bind(void 0);
    },
    get actStoreItem() {
      return addItemToInventory.bind(void 0);
    },
    get actCurrency() {
      return awardCurrency.bind(void 0);
    },
    get actPromptReward() {
      return window.GameModules.playFeedback.reward.promptActReward.bind(window.GameModules.playFeedback.reward);
    },
    get actOpenReward() {
      return openActReward.bind(void 0);
    },
    get actAutoInvest() {
      return journalEffects.journalAutoInvest;
    },
    get actCloseReward() {
      return closeRewardOverlay.bind(void 0);
    },
    get actCheckUnlocks() {
      return checkUnlocks.bind(void 0);
    },
    get actNormalizeSupports() {
      return normalizeSupportLoadout.bind(void 0);
    },
    get actRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get actSave() {
      return queueImportantSave.bind(void 0);
    }
  };
  var actRewards = Object.freeze({
    getActRewardConfig: (zoneId, owner = game) => actRules.getActRewardConfig(owner, zoneId),
    isActRewardChoiceAvailable: (choice, owner = game) => actRules.isActRewardChoiceAvailable(owner, choice),
    getAvailableActRewardZoneIds: (owner = game) => actRules.getAvailableActRewardZoneIds(owner),
    getActRewardChoices: (zoneId) => actRules.getActRewardChoices(game, zoneId),
    createClassStarterWeapon: (classId) => actRules.createClassStarterWeapon(game, classId),
    buildActRewardPreviewItem: (zoneId, choice) => {
      const counter = window.GameModules.state.session.itemIdCounter;
      try {
        return actRules.buildActRewardPreviewItem(game, zoneId, choice);
      } finally {
        window.GameModules.state.session.itemIdCounter = counter;
      }
    },
    grantActRewardEntry: (...args) => consumeDomainCommands(actRules.grantActRewardEntry(game, ...args), actEffects),
    markActRewardReady: (zoneId) => consumeDomainCommands(actRules.markActRewardReady(game, zoneId), actEffects),
    claimActRewardChoice: (...args) => consumeDomainCommands(actRules.claimActRewardChoice(game, ...args), actEffects)
  });
  var oceanCraftRules = createOceanWorkshop({
    get categoryRules() {
      return OCEAN_MOD_CATEGORY_RULES;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get findStoredEquipmentAffix() {
      return findStoredEquipmentAffix;
    },
    get getAvailableMods() {
      return getAvailableMods;
    },
    get rollAffixValueInTierRange() {
      return rollAffixValueInTierRange;
    },
    get EXPLICIT_AFFIX_RULES() {
      return EXPLICIT_AFFIX_RULES;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get getItemExplicitOptionCount() {
      return getItemExplicitOptionCount;
    },
    get isFixedEquipmentAffix() {
      return isFixedEquipmentAffix;
    },
    get getStatName() {
      return getStatName;
    },
    get updateItemName() {
      return updateItemName;
    },
    get _t() {
      return _t;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get pickWeightedMod() {
      return pickWeightedMod;
    },
    get rollAffixValue() {
      return rollAffixValue;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get ORB_DB() {
      return ORB_DB;
    }
  });
  var oceanCraftEffects = createOceanWorkshopEffects({
    get awardCurrency() {
      return awardCurrency;
    },
    get addLog() {
      return addLog;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get _t() {
      return _t;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    }
  });
  var oceanShard = createOceanShard({
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getAvailableMods() {
      return getAvailableMods;
    },
    get pickRandomMods() {
      return pickRandomMods;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get rollAffixValue() {
      return rollAffixValue;
    },
    get updateItemName() {
      return updateItemName;
    },
    get _t() {
      return _t;
    }
  });
  var oceanWorkshop = Object.freeze({
    ...oceanCraftRules,
    ...ocean_workshop_exports,
    getOceanShardBlockReason: (item) => oceanShard.blockReason(game, item),
    rerollSingleBaseOption: (...args) => consumeDomainCommands(oceanShard.reroll(game, ...args), oceanCraftEffects),
    isSeaGiftEquipmentTarget: (item) => oceanCraftRules.isSeaGiftEquipmentTarget(game, item),
    getSeaGiftTargetBlockReason: (item) => oceanCraftRules.getSeaGiftTargetBlockReason(game, item),
    getSeaGiftRecipeStatus: (recipeId, targetItem, category, count = 1) => oceanCraftRules.getSeaGiftRecipeStatus(
      game,
      recipeId,
      { item: targetItem || getSelectedCraftItem(), category, count }
    ),
    craftSeaGift: (recipeId, targetItem, options) => consumeDomainCommands(oceanCraftRules.craftSeaGift(
      game,
      recipeId,
      { item: targetItem || getSelectedCraftItem(), category: options?.category, count: options?.count }
    ), oceanCraftEffects)
  });
  var buildPreview = new BuildStatPreview(window.GameModules.state, (...args) => getPlayerStats(...args));
  var voidLabels = new VoidPassiveLabels({
    get isVoidPassiveLineStat() {
      return isVoidPassiveLineStat;
    },
    get P_STATS() {
      return P_STATS;
    },
    get STAT_DISPLAY_NAMES() {
      return STAT_DISPLAY_NAMES;
    },
    get formatValue() {
      return formatValue;
    },
    get _t() {
      return _t;
    },
    get getStatName() {
      return getStatName;
    },
    get TRANSCENDENT_VOID_PASSIVE_DB() {
      return TRANSCENDENT_VOID_PASSIVE_DB;
    },
    get getVoidLinkScale() {
      return getVoidLinkScale;
    },
    get TRANSCENDENT_VOID_STAT_LINES() {
      return TRANSCENDENT_VOID_STAT_LINES;
    },
    get getVoidPassiveCraft() {
      return getVoidPassiveCraft;
    },
    get passiveRouting() {
      return passiveRouting;
    },
    get game() {
      return window.GameModules.state.game;
    }
  });
  var oceanPresentation = new OceanProgressPresentation({
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    get changeZone() {
      return typeof changeZone === "function" ? changeZone : void 0;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get getSelectedCraftItem() {
      return typeof getSelectedCraftItem === "function" ? getSelectedCraftItem : void 0;
    },
    get isSeaGiftEquipmentTarget() {
      return isSeaGiftEquipmentTarget;
    }
  });
  var panelLayout = new PanelLayout({
    get document() {
      return document;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get MOBILE_BATTLE_BREAKPOINT() {
      return MOBILE_BATTLE_BREAKPOINT;
    },
    get switchTab() {
      return switchTab;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    }
  }, window.GameModules.state.controls);
  window.GameModules.panelLayout = panelLayout;
  var previewBuildStats = buildPreview.previewBuildStats.bind(buildPreview);
  var previewPassiveNodeStats = buildPreview.previewPassiveNodeStats.bind(buildPreview);
  var buildStatPreviewParts2 = (preview) => buildStatPreviewParts(COMPARE_STAT_META, preview);
  var formatVoidPassiveStatLine = voidLabels.formatVoidPassiveStatLine.bind(voidLabels);
  var getVoidPassiveEffectLabel = voidLabels.getVoidPassiveEffectLabel.bind(voidLabels);
  var formatTranscendentVoidPassive = voidLabels.formatTranscendentVoidPassive.bind(voidLabels);
  var getOceanUpgradeCostText = oceanPresentation.getOceanUpgradeCostText.bind(oceanPresentation);
  var moveAfterSurfacing = oceanPresentation.moveAfterSurfacing.bind(oceanPresentation);
  var getSelectedSeaGiftEquipmentTarget = oceanPresentation.getSelectedSeaGiftEquipmentTarget.bind(oceanPresentation);
  var syncBattleTabLayout = panelLayout.syncBattleTabLayout.bind(panelLayout);
  var isTutorialOpen = panelLayout.isTutorialOpen.bind(panelLayout);
  var isLoadingOverlayOpen = panelLayout.isLoadingOverlayOpen.bind(panelLayout);
  var applyPanelLayoutSettings = panelLayout.applyPanelLayoutSettings.bind(panelLayout);
  var toggleLeftPaneCollapse = panelLayout.toggleLeftPaneCollapse.bind(panelLayout);
  var toggleCombatLogCollapse = panelLayout.toggleCombatLogCollapse.bind(panelLayout);
  var getAilmentDisplayLabel2 = getAilmentDisplayLabel;
  var normalizeDamageElementKey2 = (ele) => normalizeDamageElementKey(DAMAGE_ELEMENT_LABELS, ele);
  var getElementColor2 = (ele) => getElementColor(DAMAGE_ELEMENT_LABELS, ele);
  var getDamageElementLabel2 = (ele) => getDamageElementLabel(DAMAGE_ELEMENT_LABELS, (...args) => _t(...args), ele);
  var getDamageElementIcon2 = (ele) => getDamageElementIcon(DAMAGE_ELEMENT_LABELS, DAMAGE_ELEMENT_ICONS, ele);
  safeExposeGlobals({ mouseX: window.GameModules.state.controls.mouseX, mouseY: window.GameModules.state.controls.mouseY, pendingHeavyUiRefresh: window.GameModules.state.controls.pendingHeavyUiRefresh, crowdPauseActive: window.GameModules.state.controls.crowdPauseActive, activeTutorial: window.GameModules.state.controls.activeTutorial, activeTutorialStep: window.GameModules.state.controls.activeTutorialStep });
  var controlAccessors = {
    mouseX: { configurable: true, get() {
      return window.GameModules.state.controls.mouseX;
    }, set(value) {
      window.GameModules.state.controls.mouseX = value;
    } },
    mouseY: { configurable: true, get() {
      return window.GameModules.state.controls.mouseY;
    }, set(value) {
      window.GameModules.state.controls.mouseY = value;
    } },
    pendingHeavyUiRefresh: { configurable: true, get() {
      return window.GameModules.state.controls.pendingHeavyUiRefresh;
    }, set(value) {
      window.GameModules.state.controls.pendingHeavyUiRefresh = value;
    } },
    crowdPauseActive: { configurable: true, get() {
      return window.GameModules.state.controls.crowdPauseActive;
    }, set(value) {
      window.GameModules.state.controls.crowdPauseActive = value;
    } },
    activeTutorial: { configurable: true, get() {
      return window.GameModules.state.controls.activeTutorial;
    }, set(value) {
      window.GameModules.state.controls.activeTutorial = value;
    } },
    activeTutorialStep: { configurable: true, get() {
      return window.GameModules.state.controls.activeTutorialStep;
    }, set(value) {
      window.GameModules.state.controls.activeTutorialStep = value;
    } }
  };
  Object.defineProperties(window, controlAccessors);
  if (globalThis !== window) Object.defineProperties(globalThis, controlAccessors);
  var getModCategory = oceanWorkshop.getModCategory;
  var getSeaGiftTierStepRows = oceanWorkshop.getSeaGiftTierStepRows;
  var getSeaGiftRerollRows = oceanWorkshop.getSeaGiftRerollRows;
  var getSeaGiftEchoTargets = oceanWorkshop.getSeaGiftEchoTargets;
  var getSeaGiftEditableIndexes = oceanWorkshop.getSeaGiftEditableIndexes;
  var getSeaGiftBenchSlot = oceanWorkshop.getSeaGiftBenchSlot;
  var getSeaGiftTargetBlockReason = oceanWorkshop.getSeaGiftTargetBlockReason;
  var getSeaGiftEffectBlockReason = oceanWorkshop.getSeaGiftEffectBlockReason;
  var isSeaGiftEquipmentTarget = oceanWorkshop.isSeaGiftEquipmentTarget;
  var getSeaGiftRecipeStatus = oceanWorkshop.getSeaGiftRecipeStatus;
  var craftSeaGift = oceanWorkshop.craftSeaGift;
  var getOceanShardBlockReason = oceanWorkshop.getOceanShardBlockReason;
  var rerollSingleBaseOption = oceanWorkshop.rerollSingleBaseOption;
  var OCEAN_WORKBENCH_OPTIONS2 = oceanWorkshop.OCEAN_WORKBENCH_OPTIONS;
  var SEA_GIFT_RANDOM_ORB_KEYS2 = oceanWorkshop.SEA_GIFT_RANDOM_ORB_KEYS;
  var SEA_GIFT_RECIPES2 = oceanWorkshop.SEA_GIFT_RECIPES;
  var SEA_GIFT_ITEM_EFFECT_TYPES2 = oceanWorkshop.SEA_GIFT_ITEM_EFFECT_TYPES;
  var getActRewardConfig = actRewards.getActRewardConfig;
  var isActRewardChoiceAvailable = actRewards.isActRewardChoiceAvailable;
  var getAvailableActRewardZoneIds = actRewards.getAvailableActRewardZoneIds;
  var getActRewardChoices = actRewards.getActRewardChoices;
  var createClassStarterWeapon = actRewards.createClassStarterWeapon;
  var buildActRewardPreviewItem = actRewards.buildActRewardPreviewItem;
  var grantActRewardEntry = actRewards.grantActRewardEntry;
  var markActRewardReady = actRewards.markActRewardReady;
  var claimActRewardChoice = actRewards.claimActRewardChoice;
  var getClaimedJournalPassivePointTotal = journalProgress.getClaimedJournalPassivePointTotal;
  var repairJournalEntriesFromProgress = journalProgress.repairJournalEntriesFromProgress;
  var reachedTimeRiftFusion = journalProgress.reachedTimeRiftFusion;
  var rebuildJournalBonusStateForLoad = journalProgress.rebuildJournalBonusStateForLoad;
  var grantJournalBonus = journalProgress.grantJournalBonus;
  var unlockJournalEntry = journalProgress.unlockJournalEntry;
  var ensureActJournalCompletionForLoop = journalProgress.ensureActJournalCompletionForLoop;
  var getPassiveActivationPath = passiveAllocation.getPassiveActivationPath;
  var getPassiveKeystoneConflict = passiveAllocation.getPassiveKeystoneConflict;
  var activatePassivePath = passiveAllocation.activatePassivePath;
  var getCurrentPassiveNodeId = passivePlanner.getCurrentPassiveNodeId;
  var migratePassiveNodeIdList = passivePlanner.migratePassiveNodeIdList;
  var migratePassiveNodeIdRecord = passivePlanner.migratePassiveNodeIdRecord;
  var normalizePassiveTreePlannerState = passivePlanner.normalizePassiveTreePlannerState;
  var ensurePassiveTreePlannerState = passivePlanner.ensurePassiveTreePlannerState;
  var saveCurrentPassiveTreePreset = passivePlanner.saveCurrentPassiveTreePreset;
  var setActivePassiveTreePreset = passivePlanner.setActivePassiveTreePreset;
  var setPassiveTreeAutoInvest = passivePlanner.setPassiveTreeAutoInvest;
  var encodePassiveTreePreset = passivePlanner.encodePassiveTreePreset;
  var importPassiveTreePreset = passivePlanner.importPassiveTreePreset;
  var runPassiveTreeAutoInvest = passivePlanner.runPassiveTreeAutoInvest;
  var ensureMeteorSiteState = meteorProgress.ensureMeteorSiteState;
  var rollMeteorKind = meteorProgress.rollMeteorKind;
  var getMeteorKind = meteorProgress.getMeteorKind;
  var tryUnlockMeteorContentByProgress = meteorProgress.tryUnlockMeteorContentByProgress;
  var getSkyRiftGaugeEffectiveTier = meteorProgress.getSkyRiftGaugeEffectiveTier;
  var gainSkyRiftGaugeFromCombat = meteorProgress.gainSkyRiftGaugeFromCombat;
  var grantMeteorEncounterRewards = meteorProgress.grantMeteorEncounterRewards;
  var getOceanFishingStrategyDef = oceanProgress.getOceanFishingStrategyDef;
  var getOceanFishCollectionProgress = oceanProgress.getOceanFishCollectionProgress;
  var getOceanFishCollectionBonus = oceanProgress.getOceanFishCollectionBonus;
  var setOceanFishingStrategy = oceanProgress.setOceanFishingStrategy;
  var claimOceanFishCollectionMilestone = oceanProgress.claimOceanFishCollectionMilestone;
  var advanceOceanDiveFromKill = oceanProgress.advanceOceanDiveFromKill;
  var getOceanPermanentUpgradeCost = oceanProgress.getOceanPermanentUpgradeCost;
  var canPayOceanUpgradeCost = oceanProgress.canPayOceanUpgradeCost;
  var upgradeOceanPermanent = oceanProgress.upgradeOceanPermanent;
  var installOceanReefFragment = oceanProgress.installOceanReefFragment;
  var enterOceanDive = oceanProgress.enterOceanDive;
  var getOceanShallowLiftM = oceanProgress.getOceanShallowLiftM;
  var forceSurfaceOcean = oceanProgress.forceSurfaceOcean;
  var recordOceanSurface = oceanProgress.recordOceanSurface;
  var forgetOceanAutoDive = oceanProgress.forgetOceanAutoDive;
  var setOceanAutoRedive = oceanProgress.setOceanAutoRedive;
  var tickOceanOxygen = oceanProgress.tickOceanOxygen;
  var tickOceanDepth = oceanProgress.tickOceanDepth;
  var applyOceanKill = oceanProgress.applyOceanKill;
  var getOceanKillAirSec = oceanProgress.getOceanKillAirSec;
  var getPassiveTreeRootNodeId = passiveAllocation.getPassiveTreeRootNodeId;
  var getPassiveTreeRootNode = passiveAllocation.getPassiveTreeRootNode;
  var getPassiveBlockedStartIds = passiveAllocation.getPassiveBlockedStartIds;
  var getPassiveRouting = passiveAllocation.getPassiveRouting;
  var isPassiveNodeAvailable = passiveAllocation.isPassiveNodeAvailable;
  var isVoidSocketHidden = passiveAllocation.isVoidSocketHidden;
  var getPassiveConnectionNodeIds = passiveAllocation.getPassiveConnectionNodeIds;
  var getPassiveApexNodeIds = passiveAllocation.getPassiveApexNodeIds;
  var getPassiveConstellationAwakeningProgress = passiveAllocation.getPassiveConstellationAwakeningProgress;
  var unlockPassiveStarEvolution = passiveAllocation.unlockPassiveStarEvolution;
  var rebasePassiveTreeForClassChange = passiveAllocation.rebasePassiveTreeForClassChange;
  var setPassiveRevelation = passiveAllocation.setPassiveRevelation;
  var getVoidPassiveCraft = voidPassives.getVoidPassiveCraft;
  var isVoidPassiveLineStat = voidPassives.isVoidPassiveLineStat;
  var normalizeTranscendentVoidPassive = voidPassives.normalizeTranscendentVoidPassive;
  var getChameleonChoices = voidPassives.getChameleonChoices;
  var getVoidPassiveNodeIds = voidPassives.getVoidPassiveNodeIds;
  var getTranscendentVoidPassiveStats = voidPassives.getTranscendentVoidPassiveStats;
  var getTranscendentVoidPassiveCount = voidPassives.getTranscendentVoidPassiveCount;
  var rollPlutoVoidCount = voidPassives.rollPlutoVoidCount;
  var rollMagicBudOnVoid = voidPassives.rollMagicBudOnVoid;
  var refreshPassiveConnectivity = voidPassives.refreshPassiveConnectivity;
  var convertChameleonVoidPassive = voidPassives.convertChameleonVoidPassive;
  var recordImmortalHeroDeathPenalty = voidPassives.recordImmortalHeroDeathPenalty;
  var applyVoidPassiveCurrency = voidPassives.applyVoidPassiveCurrency;
  var getClassKeystoneDefs = passiveRules.getClassKeystoneDefs;
  var isPassiveTreeEdgeAvailable = passiveRules.isPassiveTreeEdgeAvailable;
  var getPassiveTreeAdjacency = passiveRules.getPassiveTreeAdjacency;
  var getPassiveWisdomElementFromNodeIds = passiveRules.getPassiveWisdomElementFromNodeIds;
  var normalizePassiveSpecializationState = passiveRules.normalizePassiveSpecializationState;
  var ensurePassiveSpecializationState = passiveRules.ensurePassiveSpecializationState;
  var getPassiveNodeRawEffects = passiveRules.getPassiveNodeRawEffects;
  var getPassiveNodeActivationState = passiveRules.getPassiveNodeActivationState;
  var getEffectivePassiveNodeEffects = passiveRules.getEffectivePassiveNodeEffects;
  var getVoidLinkScale = passiveRules.getVoidLinkScale;
  var getAllocatedPassiveStatValue = passiveRules.getAllocatedPassiveStatValue;
  var hasAuthoredPassiveKeystone = passiveRules.hasAuthoredPassiveKeystone;
  var findAllocatedPassiveKeystone = passiveRules.findAllocatedPassiveKeystone;
  var getMystiqueAffinity = passiveRules.getMystiqueAffinity;
  var recordPassiveCycleAilmentEnd = passiveRules.recordPassiveCycleAilmentEnd;
  var recordPassiveCycleAilmentStart = passiveRules.recordPassiveCycleAilmentStart;
  var getActivePassiveCycleBuffEffects = passiveRules.getActivePassiveCycleBuffEffects;
  var recordPassiveFanaticSkillUse = passiveRules.recordPassiveFanaticSkillUse;
  var recordPassiveKarmaLoss = passiveRules.recordPassiveKarmaLoss;
  var beginPassiveKarmaAttack = passiveRules.beginPassiveKarmaAttack;
  var getPassiveAshuraAilmentChance = passiveRules.getPassiveAshuraAilmentChance;
  var getPassiveAshuraDamageMultiplier = passiveRules.getPassiveAshuraDamageMultiplier;
  var applyPassiveAshuraDamageBreakdown = passiveRules.applyPassiveAshuraDamageBreakdown;
  var applyPassiveKeystoneBucketRules = passiveRules.applyPassiveKeystoneBucketRules;
  var getBladeBundleShots = passiveRules.getBladeBundleShots;
  var applyAuthoredPassiveStatRules = passiveRules.applyAuthoredPassiveStatRules;
  var getVirtualVoidPassiveCount = passiveRules.getVirtualVoidPassiveCount;
  var getPassiveTreeViewAngle = window.GameModules.passiveScene.getPassiveTreeViewAngle;
  var syncPassiveTreeView = window.GameModules.passiveScene.syncPassiveTreeView;
  var cleanupPassiveBursts = window.GameModules.passiveScene.cleanupPassiveBursts;
  var getNodeRevealAmount = window.GameModules.passiveScene.getNodeRevealAmount;
  var getClassTreeDef = (key, owner = game) => ascendTree.tree(owner, key);
  var addAscendancyPairNodes = ascendTree.addPair;
  var clampPassiveCamera = window.GameModules.passiveScene.clampPassiveCamera;
  var fitPassiveCameraToBounds = window.GameModules.passiveScene.fitPassiveCameraToBounds;
  var snapshotPlayerAilmentsForDeathLog = () => deathHistory.snapshotAilments(game);
  var recordIncomingDamage = (ele, amount, sourceName, options) => deathHistory.record(game, ele, amount, sourceName, options);
  var takeDeathFightSummary = () => deathHistory.takeFight(game);
  var buildDeathDamageSummary = (windowMs, opts) => deathHistory.summarizeElements(game, windowMs, opts);
  var buildDeathMonsterSummary = (windowMs, events) => deathHistory.summarizeMonsters(game, windowMs, events);
  exposeFileGlobals({ getSeaGiftRecipeStatus, craftSeaGift, OCEAN_WORKBENCH_OPTIONS: OCEAN_WORKBENCH_OPTIONS2, SEA_GIFT_RANDOM_ORB_KEYS: SEA_GIFT_RANDOM_ORB_KEYS2, SEA_GIFT_RECIPES: SEA_GIFT_RECIPES2, SEA_GIFT_ITEM_EFFECT_TYPES: SEA_GIFT_ITEM_EFFECT_TYPES2, resetBeehiveRunModifiers, getClassKeystoneDefs, getPassiveTreeViewAngle, syncPassiveTreeView, getPassiveTreeRootNodeId, getPassiveTreeRootNode, isPassiveTreeEdgeAvailable, getPassiveTreeAdjacency, rebasePassiveTreeForClassChange, getPassiveWisdomElementFromNodeIds, normalizePassiveSpecializationState, ensurePassiveSpecializationState, getPassiveNodeRawEffects, getPassiveNodeActivationState, getEffectivePassiveNodeEffects, getVoidLinkScale, getAllocatedPassiveStatValue, setPassiveRevelation, hasAuthoredPassiveKeystone, findAllocatedPassiveKeystone, getPassiveBlockedStartIds, getMystiqueAffinity, recordPassiveCycleAilmentEnd, recordPassiveCycleAilmentStart, getActivePassiveCycleBuffEffects, recordPassiveFanaticSkillUse, recordPassiveKarmaLoss, beginPassiveKarmaAttack, getPassiveAshuraAilmentChance, getPassiveAshuraDamageMultiplier, applyPassiveAshuraDamageBreakdown, applyPassiveKeystoneBucketRules, getBladeBundleShots, applyAuthoredPassiveStatRules, isPassiveNodeAvailable, isVoidSocketHidden, getPassiveApexNodeIds, getPassiveConstellationAwakeningProgress, unlockPassiveStarEvolution, ensureMeteorSiteState, rollMeteorKind, getMeteorKind, voidOptionRows, getVoidPassiveNodeIds, getVoidPassiveCraft, isVoidPassiveLineStat, formatVoidPassiveStatLine, getVoidPassiveEffectLabel, rollPlutoVoidCount, getVirtualVoidPassiveCount, getTranscendentVoidPassiveStats, normalizeTranscendentVoidPassive, formatTranscendentVoidPassive, rollMagicBudOnVoid, getChameleonChoices, convertChameleonVoidPassive, getTranscendentVoidPassiveCount, recordImmortalHeroDeathPenalty, applyVoidPassiveCurrency, getPassiveConnectionNodeIds, previewBuildStats, previewPassiveNodeStats, buildStatPreviewParts: buildStatPreviewParts2, refreshPassiveConnectivity, tryUnlockMeteorContentByProgress, getSkyRiftGaugeEffectiveTier, gainSkyRiftGaugeFromCombat, getOceanFishingStrategyDef, getOceanFishCollectionProgress, getOceanFishCollectionBonus, setOceanFishingStrategy, claimOceanFishCollectionMilestone, advanceOceanDiveFromKill, getOceanPermanentUpgradeCost, canPayOceanUpgradeCost, upgradeOceanPermanent, installOceanReefFragment, getPassiveRouting, enterOceanDive, getOceanShallowLiftM, forceSurfaceOcean, recordOceanSurface, forgetOceanAutoDive, setOceanAutoRedive, tickOceanOxygen, tickOceanDepth, applyOceanKill, getOceanKillAirSec, getModCategory, getSeaGiftTargetBlockReason, getSeaGiftEffectBlockReason, getSeaGiftTierStepRows, getSeaGiftRerollRows, getSeaGiftEchoTargets, isSeaGiftEquipmentTarget, getSelectedSeaGiftEquipmentTarget, getSeaGiftEditableIndexes, getSeaGiftBenchSlot, getOceanShardBlockReason, rerollSingleBaseOption, grantMeteorEncounterRewards, getPassiveActivationPath, getPassiveKeystoneConflict, activatePassivePath, getCurrentPassiveNodeId, migratePassiveNodeIdList, migratePassiveNodeIdRecord, normalizePassiveTreePlannerState, ensurePassiveTreePlannerState, saveCurrentPassiveTreePreset, setActivePassiveTreePreset, setPassiveTreeAutoInvest, encodePassiveTreePreset, importPassiveTreePreset, runPassiveTreeAutoInvest, cleanupPassiveBursts, getNodeRevealAmount, getClassTreeDef, addAscendancyPairNodes, syncBattleTabLayout, clampPassiveCamera, fitPassiveCameraToBounds, isTutorialOpen, isLoadingOverlayOpen, applyPanelLayoutSettings, toggleLeftPaneCollapse, getAilmentDisplayLabel: getAilmentDisplayLabel2, snapshotPlayerAilmentsForDeathLog, recordIncomingDamage, takeDeathFightSummary, buildDeathDamageSummary, buildDeathMonsterSummary, getActRewardConfig, isActRewardChoiceAvailable, getAvailableActRewardZoneIds, getActRewardChoices, createClassStarterWeapon, getClaimedJournalPassivePointTotal, repairJournalEntriesFromProgress, reachedTimeRiftFusion, rebuildJournalBonusStateForLoad, grantJournalBonus, unlockJournalEntry, ensureActJournalCompletionForLoop, markActRewardReady, buildActRewardPreviewItem, grantActRewardEntry, claimActRewardChoice, getElementColor: getElementColor2, normalizeDamageElementKey: normalizeDamageElementKey2, getDamageElementLabel: getDamageElementLabel2, getDamageElementIcon: getDamageElementIcon2, PASSIVE_REVELATION_IDS, PASSIVE_REVELATION_LABELS, PASSIVE_WISDOM_ELEMENTS, PASSIVE_WISDOM_ELEMENT_BY_NODE_ID, PASSIVE_AILMENT_BY_ELEMENT, PASSIVE_KARMA_PER_TARGET_CAP, PASSIVE_KEYSTONE_NODE_ID_BY_TITLE, PASSIVE_CYCLE_BUFF_EFFECTS, PASSIVE_START_GATE_CLASS_BY_TITLE, PASSIVE_TREE_PRESET_SLOTS, METEOR_SITE_FLAGS, METEOR_SITE_NUMBERS, ENEMY_CROWD_PAUSE_LIMIT, DOT_STACK_MAX, DOT_STACK_GROWTH_PER_STACK, DOT_TICK_INTERVAL, DOT_EFFECT_DURATION, DOT_TICK_FROM_HIT_RATIO, DEBUG_BATTLE_ANCHORS, TAB_UNLOCK_GATES, MOBILE_BATTLE_BREAKPOINT, VOID_PASSIVE_OPTION_POOL, TRANSCENDENT_VOID_PASSIVE_DB, TRANSCENDENT_VOID_STAT_LINES, OCEAN_MOD_CATEGORY_RULES, isAutoOceanDive, isOceanAutoRediveHalted: isOceanAutoRediveHalted2, toggleCombatLogCollapse });
  window.GameModules.passives = Object.freeze({
    get tree() {
      return window.PASSIVE_TREE;
    },
    get configs() {
      return { targetNodes: window.PASSIVE_TARGET_NODES, discoveryRadius: window.PASSIVE_DISCOVERY_RADIUS, previewRadius: window.PASSIVE_PREVIEW_RADIUS };
    },
    rules: passiveRules,
    allocation: passiveAllocation,
    planner: passivePlanner,
    voidPassives,
    meteorProgress,
    oceanProgress,
    journalProgress,
    actRewards,
    oceanWorkshop,
    ascendTree,
    buildPreview
  });
  window.GameModules.passiveTreeBootstrap.bootstrap();
  window.GameModules.state.startSession(JSON.parse(JSON.stringify(defaultGame)), Date.now());
})();
