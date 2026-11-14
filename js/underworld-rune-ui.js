// GENERATED from modules/underworld-rune-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/data/underworld-crafting.mjs
  var UNDERWORLD_RUNE_BONUS_POOL = Object.freeze([
    { stat: "flatHp", min: 10, max: 30 },
    { stat: "flatDmg", min: 2, max: 6 },
    { stat: "aspd", min: 0.4, max: 1.2 },
    { stat: "move", min: 0.4, max: 1.2 },
    { stat: "crit", min: 0.2, max: 0.8 },
    { stat: "critDmg", min: 1.5, max: 4 },
    { stat: "resPen", min: 0.3, max: 1 },
    { stat: "physIgnore", min: 0.3, max: 1 },
    { stat: "resAll", min: 0.2, max: 0.6 }
  ]);
  var UNDERWORLD_GEAR_SLOTS = Object.freeze(["무기", "투구", "갑옷", "장갑1", "장갑2", "신발", "목걸이", "반지1", "반지2", "허리띠"]);

  // modules/state/underworld-runes.mjs
  function underworldRuneState(owner) {
    if (!owner.underworldRunes || typeof owner.underworldRunes !== "object") owner.underworldRunes = {
      unlockedSlots: 0,
      unlockedRunesMaxNumber: 0,
      obtainedRunes: [],
      equippedRunes: [null, null, null, null, null, null],
      enhanceLvByNo: {}
    };
    const state = owner.underworldRunes;
    state.obtainedRunes = Array.isArray(state.obtainedRunes) ? state.obtainedRunes : [];
    state.equippedRunes = Array.isArray(state.equippedRunes) ? state.equippedRunes.slice(0, 6) : [null, null, null, null, null, null];
    while (state.equippedRunes.length < 6) state.equippedRunes.push(null);
    normalizeUnderworldGrowth(state);
    return state;
  }
  function normalizeUnderworldGrowth(state) {
    state.enhanceLvByNo = state.enhanceLvByNo && typeof state.enhanceLvByNo === "object" ? state.enhanceLvByNo : {};
    state.bonusLinesByNo = state.bonusLinesByNo && typeof state.bonusLinesByNo === "object" ? state.bonusLinesByNo : {};
  }

  // modules/domain/underworld-crafting.mjs
  var rounded = (value) => Number((Math.round(value * 10) / 10).toFixed(1));
  var canPay = (owner, cost) => Object.entries(cost).every(([key, amount]) => (owner.currencies[key] || 0) >= amount);
  var pay = (owner, cost) => {
    for (const [key, amount] of Object.entries(cost)) owner.currencies[key] -= amount;
  };
  function underworldEnchantCost(strength) {
    return { underCopper: Math.max(4, strength * 6), underSilver: Math.max(2, strength * 3), underGold: Math.max(1, strength - 1) };
  }
  function underworldLimitBreakCost(slot, rule) {
    const kind = slot.includes("반지") || slot === "목걸이" || slot === "허리띠" ? "accessory" : slot === "무기" ? "weapon" : "armour";
    return rule.costs[kind];
  }
  function underworldGrowthCost(level, reroll) {
    return reroll ? { underCopper: 180 + level * 110, underSilver: 95 + level * 80, underGold: 36 + level * 34 } : { underCopper: 260 + level * 220, underSilver: 150 + level * 150, underGold: 55 + level * 58, runeShard: 120 + level * 90 };
  }
  function ownedUnderworldRuneNumbers(state, getDef) {
    return [...new Set([...state.obtainedRunes, ...state.equippedRunes.slice(0, state.unlockedSlots)].filter((no) => no && getDef(no)))].sort((a, b) => a - b);
  }
  function underworldRuneDef(no, definitions) {
    return (Array.isArray(definitions) ? definitions : []).find((row) => row.no === Math.max(1, Math.floor(no || 0))) || null;
  }
  function underworldRuneCountMap(runes) {
    return (Array.isArray(runes) ? runes : []).reduce((counts, number) => {
      const key = Math.max(1, Math.floor(number || 1));
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }
  function validUnderworldRuneSlot(state, index) {
    return Number.isInteger(index) && index >= 0 && index < Math.min(6, state.unlockedSlots);
  }
  function receiveRune(state, no) {
    state.obtainedRunes.push(no);
    const cap = Math.max(0, Math.min(6, Math.floor(state.unlockedSlots || 0)));
    const slot = state.equippedRunes.slice(0, cap).findIndex((value) => !value);
    if (slot < 0) return;
    const owned = state.obtainedRunes.findIndex((value) => Math.floor(value || 0) === Math.floor(no || 0));
    state.obtainedRunes.splice(owned, 1);
    state.equippedRunes[slot] = no;
  }
  function growthStateCurrent(owner, choice, getDef) {
    return choice.owner === owner && choice.loop === owner.loopCount && choice.season === owner.season && choice.state === owner.underworldRunes && (choice.state.enhanceLvByNo[choice.no] || 0) === choice.level && ownedUnderworldRuneNumbers(choice.state, getDef).includes(choice.no);
  }
  var UnderworldCrafting = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    equipRune(owner, index, no) {
      const state = underworldRuneState(owner);
      if (!validUnderworldRuneSlot(state, index) || !Number.isInteger(no) || no < 1 || !this.deps.runeDef(no)) return { reason: "rune" };
      const owned = state.obtainedRunes.findIndex((value) => Math.floor(value || 0) === no);
      if (owned < 0) return { reason: "owned" };
      const previous = state.equippedRunes[index];
      if (previous) state.obtainedRunes.push(Math.floor(previous));
      state.obtainedRunes.splice(owned, 1);
      state.equippedRunes[index] = no;
      return { ok: true };
    }
    unequipRune(owner, index) {
      const state = underworldRuneState(owner);
      if (!validUnderworldRuneSlot(state, index)) return { reason: "slot" };
      const previous = state.equippedRunes[index];
      if (previous) state.obtainedRunes.push(Math.floor(previous));
      state.equippedRunes[index] = null;
      return { ok: true };
    }
    craftRune(owner) {
      const state = underworldRuneState(owner), maxNo = Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0));
      if (maxNo <= 0) return { reason: "unlock" };
      const cost = { runeShard: 10 };
      if (!canPay(owner, cost)) return { reason: "cost", cost };
      const no = 1 + Math.floor(this.deps.random() * maxNo);
      pay(owner, cost);
      receiveRune(state, no);
      return { ok: true, no };
    }
    upgradeRune(owner, fromNo) {
      const state = underworldRuneState(owner), counts = underworldRuneCountMap(state.obtainedRunes);
      const from = Number.isInteger(fromNo) ? fromNo : 0;
      if (!(counts[from] >= 3) || from >= 30) return { reason: "copies" };
      const cost = { runeShard: Math.max(5, from) };
      if (!canPay(owner, cost)) return { reason: "cost", cost };
      const max = Math.max(1, Math.min(30, Math.floor(state.unlockedRunesMaxNumber || 1)));
      if (from >= max) return { reason: "unlock", from, max };
      pay(owner, cost);
      let removed = 0;
      state.obtainedRunes = state.obtainedRunes.filter((value) => !(Math.floor(value || 0) === from && removed++ < 3));
      const no = Math.min(max, from + 1);
      receiveRune(state, no);
      return { ok: true, from, no, cost };
    }
    enchant(owner, slot) {
      const item = owner.equipment && owner.equipment[slot];
      if (!item) return { reason: "item" };
      const pool = this.deps.enchantPools[slot];
      if (!pool) return { reason: "item" };
      const [id, min, max, strength] = pool[Math.floor(this.deps.random() * pool.length)];
      const value = rounded(min + this.deps.random() * (max - min)), cost = underworldEnchantCost(strength);
      if (!canPay(owner, cost)) return { reason: "cost", cost };
      const line = { id, statName: this.deps.statName(id), val: value, valMin: value, valMax: value, underEnchant: true };
      const stats = Array.isArray(item.stats) ? item.stats.filter((stat) => !(stat && stat.underEnchant)) : [];
      pay(owner, cost);
      item.stats = stats;
      item.underEnchant = line;
      return { ok: true, item, id, value, cost };
    }
    limitBreak(owner, slot) {
      const item = owner.equipment && owner.equipment[slot], rule = this.deps.limitBreak;
      if (!item) return { reason: "item" };
      const before = Math.floor(item.quality || 0);
      if (before !== rule.quality) return { reason: "quality", before, required: rule.quality };
      if (item.qualityLockedByLimitBreak) return { reason: "locked" };
      const amounts = underworldLimitBreakCost(slot, rule);
      const cost = { underCopper: amounts[0], underSilver: amounts[1], underGold: amounts[2] };
      if (!canPay(owner, cost)) return { reason: "cost", cost };
      const delta = -rule.swing + Math.floor(this.deps.random() * (rule.swing * 2 + 1));
      const after = Math.max(0, Math.min(rule.cap, before + delta));
      pay(owner, cost);
      item.quality = after;
      item.qualityLockedByLimitBreak = true;
      return { ok: true, item, before, after, delta };
    }
    quoteGrowth(owner, choice, reroll) {
      if (!choice || !growthStateCurrent(owner, choice, this.deps.runeDef)) return { reason: "state" };
      const level = choice.level;
      if (reroll ? level < 5 || level > 15 : level < 0 || level >= 15) return { reason: "state" };
      const cost = underworldGrowthCost(level, reroll);
      return canPay(owner, cost) ? { cost } : { reason: "cost", cost };
    }
    bonusLine() {
      const row = UNDERWORLD_RUNE_BONUS_POOL[Math.floor(this.deps.random() * UNDERWORLD_RUNE_BONUS_POOL.length)];
      return { stat: row.stat, val: rounded(row.min + this.deps.random() * (row.max - row.min)) };
    }
    grow(owner, choice, reroll) {
      const quote = this.quoteGrowth(owner, choice, reroll);
      if (quote.reason) return quote;
      const { state, no } = choice, level = choice.level + (reroll ? 0 : 1);
      const count = level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0;
      const lines = reroll || !Array.isArray(state.bonusLinesByNo[no]) ? [] : state.bonusLinesByNo[no].slice();
      while (lines.length < count) lines.push(this.bonusLine());
      pay(owner, quote.cost);
      if (!reroll) state.enhanceLvByNo[no] = level;
      state.bonusLinesByNo[no] = lines;
      return { ok: true, no, level, lines };
    }
  };

  // modules/ui/underworld-rune-view.mjs
  var UnderworldRuneView = class {
    constructor(deps2, inventory2, details2) {
      this.deps = deps2;
      this.inventory = inventory2;
      this.details = details2;
      this.active = true;
      this.listeners = [];
      this.updateMarkup = this.deps.updateGamePanelMarkup;
      this.iconHtml = (no) => this.details.iconHtml(no);
      this.COST_NAMES = Object.freeze({ underCopper: "구리", underSilver: "은", underGold: "금", runeShard: "지하석 조각" });
      this.costHtml = (cost) => Object.entries(cost).map(([key, value]) => `<i class="is-${key}">${this.COST_NAMES[key]} ${value}</i>`).join(", ");
      this.PAGES = Object.freeze([["entry", "탐사"], ["stones", "지하석"], ["gear", "장비 가공"]]);
      this.page = "entry";
      this.held = (key) => Math.max(0, Math.floor(Number((this.deps.game.currencies || {})[key]) || 0));
      this.statName = (stat) => this.deps.getStatName(stat).replace(/\s*\(%\)$/, "");
      this.pct = (stat) => this.deps.P_STATS[stat]?.isPct || /\(%\)$/.test(this.deps.getStatName(stat)) ? "%" : "";
      this.statText = (stat, value) => `${this.statName(stat)} +${this.deps.formatValue(stat, value)}${this.pct(stat)}`;
      this.rangeText = (stat, min, max) => `${this.deps.formatValue(stat, min)}${max === min ? "" : `~${this.deps.formatValue(stat, max)}`}${this.pct(stat)}`;
      this.RESOURCES = Object.freeze([["runeShard", "지하석 조각"], ["underCopper", "구리"], ["underSilver", "은"], ["underGold", "금"]]);
      this.resourcesHtml = (keys) => `<div class="underworld-resource-strip">${this.RESOURCES.filter(([key]) => keys.includes(key)).map(([key, name]) => `<span class="is-${key}">${name} <b>${this.held(key)}</b></span>`).join("")}</div>`;
      for (const name of ["progressLabel", "ownedNumbers", "growthCost", "costText", "growthChoice", "chooseGrowth", "validateGrowthChoice", "pages", "enchantCost", "limitBreakCost", "render", "entryCardHtml", "entryPageHtml", "nextRewardHtml", "skyStoneHtml", "stonesPageHtml", "slotsHtml", "slotAttrs", "stoneActionsHtml", "gearPageHtml", "enchantCardHtml", "limitBreakHtml"]) this[name] = this[name].bind(this);
      listenView(this, this.deps.window, "project-idle:underworld-milestone", ({ detail }) => this.deps.addLog(detail.text, "loot-unique"));
    }
    progressLabel(state) {
      const slots = Math.max(0, Math.floor(state.unlockedSlots || 0));
      const max = Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0));
      if (!max) return "지하계 10층 격파 시 첫 지하석과 슬롯 해금";
      return `${slots}/6 슬롯, 지하석 ${max === 1 ? "1" : `1~${max}`} 해금`;
    }
    ownedNumbers(state) {
      return ownedUnderworldRuneNumbers(state, this.deps.getUnderworldRuneDef);
    }
    growthCost(level, reroll) {
      return underworldGrowthCost(level, reroll);
    }
    costText(cost) {
      return Object.entries(cost).map(([key, value]) => `${this.COST_NAMES[key]} ${value}`).join(", ");
    }
    growthChoice(state, no, reroll) {
      const def = this.deps.getUnderworldRuneDef(no), level = state.enhanceLvByNo[no] || 0;
      const cost = this.growthCost(level, reroll);
      const missing = Object.entries(cost).some(([key, amount]) => (this.deps.game.currencies[key] || 0) < amount);
      const effect = `${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat, def.val * (1 + level * 0.01))}${this.deps.P_STATS[def.stat]?.isPct ? "%" : ""}`;
      return {
        value: no,
        label: `${def.name}, 지하석 ${no}, +${level}${reroll ? "" : ` → +${level + 1}`}`,
        detail: `${effect}
${this.costText(cost)}${missing ? this.deps._t("\n재료 부족") : ""}`
      };
    }
    async chooseGrowth(reroll) {
      if (!this.active || this.pendingGrowth || !this.deps.assertBuildEditable()) return null;
      const owner = this.deps.game, loop = owner.loopCount, season = owner.season;
      const state = this.deps.ensureUnderworldRuneState();
      const numbers = this.ownedNumbers(state).filter((no2) => reroll ? state.enhanceLvByNo[no2] >= 5 : (state.enhanceLvByNo[no2] || 0) < 15);
      if (!numbers.length) {
        this.deps.addLog(reroll ? "보유 또는 장착한 +5 이상 지하석이 필요합니다." : "강화 가능한 보유/장착 지하석이 없습니다. (최대 +15)", "attack-monster");
        return null;
      }
      const levels = new Map(numbers.map((no2) => [no2, state.enhanceLvByNo[no2] || 0]));
      this.pendingGrowth = true;
      let no;
      try {
        no = await this.deps.requestGameChoice({
          title: reroll ? "지하석 보너스 리롤" : "지하석 강화",
          message: this.deps._t("같은 번호의 모든 지하석에 적용됩니다."),
          confirmLabel: reroll ? "옵션 리롤" : "지하석 강화",
          choices: numbers.map((no2) => this.growthChoice(state, no2, reroll))
        });
      } finally {
        this.pendingGrowth = false;
      }
      if (no === null) return null;
      if (!this.growthContextCurrent(owner, loop, season)) return null;
      return this.validateGrowthChoice(state, no, levels.get(no), reroll);
    }
    growthContextCurrent(owner, loop, season) {
      return this.active && owner === this.deps.game && owner.loopCount === loop && owner.season === season;
    }
    isGrowthCurrent(choice) {
      return !!choice && this.growthContextCurrent(choice.owner, choice.loop, choice.season) && choice.state === this.deps.game.underworldRunes;
    }
    validateGrowthChoice(state, no, level, reroll) {
      if (!this.deps.assertBuildEditable()) return null;
      const owner = this.deps.game, choice = { state, no, level, owner, loop: owner.loopCount, season: owner.season };
      const quote = this.deps.crafting.quoteGrowth(owner, choice, reroll);
      if (quote.reason === "state") {
        this.deps.addLog(this.deps._t("지하석 상태가 변경되었습니다. 다시 선택하세요."), "attack-monster");
        return null;
      }
      if (quote.reason === "cost") {
        this.deps.addLog(this.deps._t("재료 부족, {cost}", { cost: this.costText(quote.cost) }), "attack-monster");
        return null;
      }
      return { ...choice, cost: quote.cost };
    }
    pages() {
      const select = (id) => {
        this.page = this.PAGES.some(([key]) => key === id) ? id : "entry";
        this.render();
      };
      return { select, items: this.PAGES.map(([id, label]) => ({ id, label, on: this.page === id })) };
    }
    enchantCost(strength) {
      return underworldEnchantCost(strength);
    }
    limitBreakCost(slot) {
      return underworldLimitBreakCost(slot, this.deps.UNDERWORLD_LIMIT_BREAK);
    }
    async pickSlot(slotArg, slots) {
      if (!this.active || !this.deps.assertBuildEditable()) return null;
      const owner = this.deps.game, loop = owner.loopCount, season = owner.season;
      const slot = slots.includes(slotArg) ? slotArg : await this.pickGearDialog(slots);
      return slot ? { slot, owner, loop, season } : null;
    }
    gearChoiceCurrent(choice) {
      return !!choice && this.growthContextCurrent(choice.owner, choice.loop, choice.season) && this.deps.assertBuildEditable();
    }
    pickGearDialog(slots) {
      return this.deps.requestGameChoice({
        title: this.deps._t("장비 대상 선택"),
        message: this.deps._t("작업을 적용할 장비 부위를 선택하세요."),
        choices: slots.map((slot) => ({ value: slot, label: slot, detail: this.deps.game.equipment?.[slot]?.name || (this.deps.game.equipment?.[slot] ? "장착 장비" : "장비 없음") })),
        confirmLabel: this.deps._t("대상 선택")
      });
    }
    gearFailure(result, limitBreak) {
      const t = this.deps._t, cost = result.cost;
      if (result.reason === "item") return this.deps.addLog(t("해당 부위 장비가 없습니다."), "attack-monster");
      if (result.reason === "quality") return this.deps.addLog(t("한계돌파는 퀄리티 {quality}% 장비만 가능합니다(지금 {q}%).", { quality: result.required, q: result.before }), "attack-monster", { toast: true });
      if (result.reason === "locked") return this.deps.addLog(t("이미 한계돌파를 시도한 장비입니다. 퀄리티 재부여 불가 상태입니다."), "attack-monster");
      if (result.reason !== "cost") throw new Error(`Unknown underworld crafting refusal: ${result.reason}`);
      const text = limitBreak ? t("지하계 재화 부족 (구리 {baseCost}/은 {baseCost2}/금 {baseCost3})", { baseCost: cost.underCopper, baseCost2: cost.underSilver, baseCost3: cost.underGold }) : t("지하계 재화 부족 (구리 {costC}/은 {costS}/금 {costG})", { costC: cost.underCopper, costS: cost.underSilver, costG: cost.underGold });
      this.deps.addLog(text, "attack-monster");
    }
    async enchant(slotArg) {
      const choice = await this.pickSlot(slotArg, Object.keys(this.deps.UNDERWORLD_ENCHANT_POOLS));
      if (!this.gearChoiceCurrent(choice)) return;
      const result = this.deps.crafting.enchant(choice.owner, choice.slot);
      if (!result.ok) return this.gearFailure(result, false);
      const { item, id, value, cost } = result;
      this.deps.addLog(this.deps._t(
        "⛏️ 지하계 인챈트 성공: [{name}] {id} +{value} (비용 구리{costC}/은{costS}/금{costG})",
        { name: this.deps._t(item.name), id: this.deps.getStatName(id), value: this.deps.formatValue(id, value), costC: cost.underCopper, costS: cost.underSilver, costG: cost.underGold }
      ), "loot-rare");
      this.deps.updateStaticUI();
    }
    async limitBreak(slotArg) {
      const choice = await this.pickSlot(slotArg, UNDERWORLD_GEAR_SLOTS);
      if (!this.gearChoiceCurrent(choice)) return;
      const result = this.deps.crafting.limitBreak(choice.owner, choice.slot);
      if (!result.ok) return this.gearFailure(result, true);
      const { item, before, after, delta } = result;
      this.deps.addLog(this.deps._t(
        "🧱 한계돌파 시도: [{name}] 퀄리티 {before}% → {after}% (변동 {delta}%, 재부여 잠김)",
        { name: this.deps.getItemDisplayName(item), before, after, delta: `${delta >= 0 ? "+" : ""}${delta}` }
      ), "season-up");
      this.deps.updateStaticUI();
    }
    async grow(reroll) {
      const choice = await this.chooseGrowth(reroll);
      if (!this.isGrowthCurrent(choice)) return;
      const result = this.deps.crafting.grow(this.deps.game, choice, reroll);
      if (!result.ok) {
        this.validateGrowthChoice(choice.state, choice.no, choice.level, reroll);
        return;
      }
      const { no, level, lines } = result, name = this.deps.getUnderworldRuneDef(no).name;
      if (reroll) {
        const text = lines.map((row) => `${this.deps.getStatName(row.stat)} +${this.deps.formatValue(row.stat, row.val)}`).join(" / ");
        this.deps.addLog(this.deps._t("지하석 옵션 리롤: {name}, {text}", { name, text }), "season-up");
      } else this.deps.addLog(this.deps._t("지하석 강화 성공: {name} +{value} (보너스 옵션 {length}줄)", { name, value: level, length: lines.length }), "loot-unique");
      this.deps.updateStaticUI();
      this.deps.queueImportantSave(200);
    }
    render() {
      if (!this.active) return;
      this.inventory.closeStale();
      const list = this.deps.document.getElementById("ui-underworld-list"), panel = this.deps.document.getElementById("ui-underworld-panel");
      if (!list || !panel) return;
      this.owner = this.deps.game;
      this.bindControls([list, panel]);
      this.deps.captureUiDisclosureState(panel);
      this.updateMarkup(list, this.page === "entry" ? this.entryCardHtml() : "");
      this.updateMarkup(panel, { entry: this.entryPageHtml, stones: this.stonesPageHtml, gear: this.gearPageHtml }[this.page]());
      this.deps.restoreUiDisclosureState(panel);
    }
    entryCardHtml() {
      const progress = this.deps.game.underworldProgress || {}, floor = Math.max(1, Math.floor(progress.currentFloor || 1));
      const highest = Math.max(1, Math.floor(progress.highestFloor || 1)), block = this.deps.getUnderworldEntryBlock(this.deps.game), off = block ? "disabled" : "";
      const lock = block ? `<div class="underworld-entry-block"><small class="underworld-lock">${this.deps.escapeHTML(block.label)}</small>
            ${this.deps.contentUnlockUi.progressButton(block.route, "조건을 채울 곳 보기")}</div>` : "";
      const other = floor === highest ? "" : `<button type="button" data-exploration-departure data-underworld-command="floor" data-underworld-value="${floor}" ${off}>${this.deps._t("{floor}층 입장", { floor })}</button>`;
      return `<section class="underworld-entry-card ${this.deps.game.currentZoneId === this.deps.UNDERWORLD_ZONE_ID ? "current" : ""}"><div class="underworld-entry-copy"><span>${this.deps._t("최고층 도전 기준, 현재 선택 {floor}층", { floor })}</span><strong>${this.deps._t("최고 개방 {highest}층", { highest })}</strong><div>${this.deps.buildMapPowerEstimateHtml(this.deps.getUnderworldZone(highest))}</div>${lock}</div><div class="underworld-entry-actions"><button type="button" class="underworld-primary-action" data-exploration-departure data-underworld-command="floor" data-underworld-value="${highest}" ${off}>${this.deps._t("최고층 {highest} 입장", { highest })}</button>${other}<button type="button" data-exploration-departure data-underworld-command="prompt" ${off}>${this.deps._t("다른 층…")}</button></div></section>`;
    }
    entryPageHtml() {
      const tickets = [["uberRootTicketFlame", "화염", "is-fire"], ["uberRootTicketFrost", "냉기", "is-cold"], ["uberRootTicketStorm", "번개", "is-light"], ["uberRootTicketChaos", "카오스", "is-chaos"]];
      return `<div class="underworld-lower-grid">${this.skyStoneHtml()}<section class="underworld-upgrade-card underworld-reward-card">${this.nextRewardHtml()}<div class="underworld-ticket-strip"><small>${this.deps._t("그림자 뿌리 입장권")}</small>${tickets.map(([key, name, tone]) => `<span class="has-stat ${tone}">${name} <b>${this.held(key)}</b></span>`).join("")}</div></section></div>`;
    }
    nextRewardHtml() {
      const state = this.deps.ensureUnderworldRuneState(), rule = this.deps.UNDERWORLD_DEEP_FLOOR_REWARD;
      const nextNo = Math.min(30, Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0))) + 1;
      const paid = Math.max(rule.fromFloor, Math.floor(this.deps.game.underworldProgress.deepRewardFloor || 0));
      const floor = nextNo <= 30 ? nextNo * 10 : rule.fromFloor + (Math.floor((paid - rule.fromFloor) / rule.every) + 1) * rule.every;
      const reward = this.deps.window.GameModules.state.underworldMilestoneReward(floor);
      const slots = reward.slots > state.unlockedSlots ? `<span>${this.deps._t("지하석 슬롯 {slots}/6", { slots: reward.slots })}</span>` : "";
      const stone = reward.rune ? `<div class="underworld-next-stone">${this.iconHtml(reward.rune.no)}<div><strong>${this.deps._t("{name} 지하석 1개", { name: this.deps.escapeHTML(this.deps._t(reward.rune.name)) })}</strong>
            <small>${this.details.effectHtml(reward.rune.no)}</small><span>${this.deps._t("지하석 1~{no} 해금", { no: reward.rune.no })}</span>${slots}</div></div>` : "";
      const materials = this.RESOURCES.filter(([key]) => reward.currencies[key]).map(([key, name]) => `<span class="is-${key}">${name} <b>${this.deps._t("{currencies}개", { currencies: reward.currencies[key] })}</b></span>`).join("");
      return `<div><strong>${this.deps._t("{floor}층 보상", { floor })}</strong>${stone}<div class="underworld-ticket-strip">${materials}</div><small>${this.deps._t("15층부터 지속 피해")}</small></div>`;
    }
    skyStoneHtml() {
      const tower = this.deps.ensureSkyTowerState(), level = Math.max(0, Math.floor((tower.skyStone || {}).level || 0));
      const maxed = level >= this.deps.getSkyStoneMaxLevel(), cost = this.deps.getSkyStoneNextCost();
      return `<section class="underworld-upgrade-card"><div><strong>창공석 ${level > 0 ? `+${level}` : this.deps._t("미제작")}</strong><span>${this.deps._t("지하계 중력 패널티 감소 {skyStoneReductionPct}% / 75%", { skyStoneReductionPct: this.deps.getSkyStoneReductionPct() })}</span></div><div><span>${this.deps._t("응축된 창공의 정수 {floor}", { floor: Math.floor(tower.condensedPower || 0) })}</span><button data-underworld-command="sky-stone" ${maxed ? "disabled" : ""}>${level > 0 ? this.deps._t("강화") : this.deps._t("제작")}, ${maxed ? this.deps._t("최대") : cost}</button></div></section>`;
    }
    stonesPageHtml() {
      const state = this.deps.ensureUnderworldRuneState(), counts = this.deps.getUnderworldRuneCountMap(state.obtainedRunes);
      const owned = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const chips = Object.keys(counts).map(Number).sort((a, b) => a - b).map((no) => {
        return `<button type="button" class="underworld-rune-chip" data-underworld-command="tooltip" data-underworld-rune="${no}" data-info-tooltip-anchor="1">${this.iconHtml(no)}<span>${this.deps.getUnderworldRuneDef(no)?.name || this.deps._t("지하석{no}", { no })}</span><b>×${counts[no]}</b></button>`;
      }).join("");
      return `<div class="underworld-panel-head"><div><strong>${this.deps._t("지하석")}</strong><span>${this.progressLabel(state)}</span></div>${this.resourcesHtml(this.RESOURCES.map(([key]) => key))}</div><section class="underworld-rune-console"><div class="underworld-rune-slots">${this.slotsHtml(state)}</div></section>${this.stoneActionsHtml(state)}<section class="underworld-inventory-card"><strong>${this.deps._t("보유 지하석 {owned}개", { owned })}</strong><div class="underworld-rune-inventory">${chips || this.deps._t('<span class="core-cube-muted">없음</span>')}</div></section>`;
    }
    slotsHtml(state) {
      return Array.from({ length: 6 }, (_, index) => {
        const no = state.equippedRunes[index], unlocked = index < Math.max(0, Math.floor(state.unlockedSlots || 0)), def = no ? this.deps.getUnderworldRuneDef(no) : null;
        const label = unlocked ? def ? def.name : "비어 있음" : "잠김", art = unlocked ? this.iconHtml(no) : "";
        const effect = unlocked ? def ? this.details.effectHtml(no) : "눌러서 장착" : this.deps._t("{value}층 격파", { value: (index + 1) * 10 });
        return `<button type="button" class="underworld-rune-slot ${unlocked ? "unlocked" : "locked"}" ${this.slotAttrs(no, index, unlocked)}><span class="underworld-rune-slot-no">${index + 1}</span><span class="underworld-rune-slot-art">${art}</span><strong>${label}</strong><small>${effect}</small></button>`;
      }).join("");
    }
    slotAttrs(no, index, unlocked) {
      if (!unlocked) return "disabled";
      return `data-underworld-command="slot" data-underworld-value="${index}" data-underworld-rune="${no || ""}" data-info-tooltip-anchor="1"`;
    }
    stoneActionsHtml(state) {
      const blocked = this.held("runeShard") < 10 || !state.unlockedRunesMaxNumber || this.deps.game.woodsmanBuildLock;
      const actions = [
        ["craft", "가공", "해금된 번호 가운데 하나", this.costHtml({ runeShard: 10 }), blocked],
        ["upgrade", "승급", "같은 번호 3개를 다음 번호 1개로", '<i class="is-runeShard">지하석 조각, 번호만큼(최소 5)</i>', false],
        ["enhance", "강화", "능력치 +1%씩, 5, 10, 15단계에 보너스 옵션", this.deps._t("{n}부터", { n: this.costHtml(this.growthCost(0, false)) }), false],
        ["reroll", "보너스 다시", "+5 이상 지하석의 보너스 옵션을 다시 굴림", this.deps._t("{n}부터", { n: this.costHtml(this.growthCost(0, true)) }), false]
      ];
      return `<div class="underworld-action-grid underworld-stone-actions">${actions.map(([call, title, effect, cost, off]) => `<button data-underworld-command="${call}" ${off ? "disabled" : ""}><strong>${title}</strong><span>${effect}</span><small>${cost}</small></button>`).join("")}</div>`;
    }
    gearPageHtml() {
      const cards = Object.entries(this.deps.UNDERWORLD_ENCHANT_POOLS).map(([slot, pool]) => this.enchantCardHtml(slot, pool)).join("");
      return `<div class="underworld-panel-head"><div><strong>${this.deps._t("장비 인챈트")}</strong><span>${this.deps._t("장착한 장비에 지하계 옵션 한 줄, 다시 하면 그 줄이 바뀝니다")}</span></div>${this.resourcesHtml(["underCopper", "underSilver", "underGold"])}</div><div class="underworld-enchant-grid">${cards}</div>${this.limitBreakHtml()}`;
    }
    enchantCardHtml(slot, pool) {
      const item = this.deps.game.equipment && this.deps.game.equipment[slot], now = item && item.underEnchant;
      const rows = pool.map(([stat, min, max, strength]) => {
        const cost = this.enchantCost(strength);
        return `<li class="has-stat" style="--stat-tone:${this.deps.getItemStatToneColor(stat)}"><span>${this.statName(stat)} +${this.rangeText(stat, min, max)}</span><small><i class="is-underCopper">${cost.underCopper}</i>/<i class="is-underSilver">${cost.underSilver}</i>/<i class="is-underGold">${cost.underGold}</i></small></li>`;
      }).join("");
      return `<article class="underworld-enchant-card"><header><strong>${slot}</strong><span>${item ? this.deps.escapeHTML(this.deps.getItemDisplayName(item)) : this.deps._t("장비 없음")}</span></header><p class="${now ? "is-on" : ""}">${now ? this.deps._t("지금 {id}", { id: this.statText(now.id, now.val) }) : this.deps._t("인챈트 없음")}</p><ul><li class="is-head"><span>${this.deps._t("나올 수 있는 효과")}</span><small><i class="is-underCopper">${this.deps._t("구리")}</i>/<i class="is-underSilver">${this.deps._t("은")}</i>/<i class="is-underGold">${this.deps._t("금")}</i></small></li>${rows}</ul><button type="button" data-underworld-command="enchant" data-underworld-value="${this.deps.escapeHTML(slot)}" ${item ? "" : "disabled"}>${this.deps._t("인챈트")}</button></article>`;
    }
    limitBreakHtml() {
      const rule = this.deps.UNDERWORLD_LIMIT_BREAK;
      const costs = [["무기", "weapon"], ["방어구", "armour"], ["장신구", "accessory"]].map(([name, key]) => `<span>${name} ${this.costHtml({ underCopper: rule.costs[key][0], underSilver: rule.costs[key][1], underGold: rule.costs[key][2] })}</span>`).join("");
      const ready = Object.entries(this.deps.game.equipment || {}).filter(([, item]) => item && Math.floor(item.quality || 0) === rule.quality && !item.qualityLockedByLimitBreak);
      const buttons = ready.length ? ready.map(([slot, item]) => `<button type="button" data-underworld-command="limit-break" data-underworld-value="${this.deps.escapeHTML(slot)}">${slot}, ${this.deps.escapeHTML(this.deps.getItemDisplayName(item))}</button>`).join("") : `<span>${this.deps._t("퀄리티 {quality}%인 장착 장비가 없습니다", { quality: rule.quality })}</span>`;
      return `<section class="underworld-upgrade-card underworld-limit-break"><div><strong>${this.deps._t("한계돌파")}</strong><span>${this.deps._t("퀄리티 {quality}% 장비의 퀄리티가 −{swing}~+{swing2}%(최대 {cap}%), 그 뒤로 고정", { quality: rule.quality, swing: rule.swing, swing2: rule.swing, cap: rule.cap })}</span><div class="underworld-ticket-strip">${costs}</div></div><div class="underworld-limit-targets">${buttons}</div></section>`;
    }
    bindControls(hosts) {
      if (this.hosts?.every((host, index) => host === hosts[index])) return;
      for (const host of this.hosts || []) releaseViewTarget(this, host);
      this.hosts = hosts;
      for (const host of hosts) {
        listenView(this, host, "click", (event) => this.onClick(event, host));
        listenView(this, host, "mouseover", (event) => this.onTooltip(event, host));
        listenView(this, host, "mousemove", (event) => this.onTooltip(event, host));
        listenView(this, host, "mouseout", (event) => this.onTooltipOut(event));
      }
    }
    onClick(event, host) {
      const button = event.target.closest("[data-underworld-command]");
      if (!this.active || !button || !host.contains(button) || button.disabled) return;
      if (this.owner !== this.deps.game) return this.render();
      const value = button.dataset.underworldValue;
      const actions = {
        floor: () => this.deps.enterUnderworldFloor(Number(value)),
        prompt: this.deps.enterUnderworldPrompt,
        "sky-stone": this.deps.upgradeSkyStone,
        craft: () => this.inventory.craft(),
        upgrade: () => this.inventory.openUpgrade(),
        enhance: () => this.grow(false),
        reroll: () => this.grow(true),
        enchant: () => this.enchant(value),
        "limit-break": () => this.limitBreak(value),
        slot: () => this.inventory.openSlot(Number(value)),
        tooltip: () => this.onTooltip(event, host)
      };
      const command = button.dataset.underworldCommand;
      if (Object.hasOwn(actions, command)) actions[command]();
    }
    onTooltip(event, host) {
      const button = event.target.closest("[data-underworld-rune]");
      if (!this.active || !button || !host.contains(button) || !button.dataset.underworldRune) return;
      this.details.showTooltip(event, Number(button.dataset.underworldRune));
    }
    onTooltipOut(event) {
      const button = event.target.closest("[data-underworld-rune]");
      if (button && !button.contains(event.relatedTarget)) this.deps.hideInfoTooltip();
    }
    api() {
      return {
        applyUnderworldEnchant: (slot) => this.enchant(slot),
        attemptUnderworldLimitBreak: (slot) => this.limitBreak(slot),
        enhanceUnderworldRune: () => this.grow(false),
        rerollUnderworldRuneBonus: () => this.grow(true),
        updateMarkup: this.updateMarkup,
        progressLabel: this.progressLabel,
        chooseGrowth: this.chooseGrowth,
        isGrowthCurrent: (choice) => this.isGrowthCurrent(choice),
        pages: this.pages,
        render: this.render,
        enchantCost: this.enchantCost,
        limitBreakCost: this.limitBreakCost,
        iconHtml: this.iconHtml
      };
    }
    dispose() {
      releaseViewEvents(this);
      this.inventory.dispose();
    }
  };
  function createUnderworldRuneView(deps2, inventory2, details2) {
    const view = new UnderworldRuneView(deps2, inventory2, details2);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/ui/underworld-rune-details.mjs
  var UnderworldRuneDetails = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    iconHtml(no) {
      const value = Number(no), def = Number.isInteger(value) && value > 0 ? this.deps.getUnderworldRuneDef(value) : null;
      return def ? `<img class="underworld-stone-icon" src="assets/items/underworld-stones/uw_rune_${def.no}.png" alt="" draggable="false" decoding="async">` : "";
    }
    effectHtml(no) {
      const def = this.deps.getUnderworldRuneDef(no), { _t: _t2 } = this.deps;
      if (!def) return `<span style="color:var(--copy-muted);">${_t2("지하석 정보 없음")}</span>`;
      const tone = this.deps.getItemStatToneColor(def.stat);
      const level = Math.max(0, Number(this.deps.game.underworldRunes?.enhanceLvByNo?.[no]) || 0);
      return `<span style="color:${tone};">${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat, def.val * (1 + level * 0.01))}${this.deps.P_STATS[def.stat]?.isPct ? "%" : ""}${level ? `, +${level}` : ""}</span>`;
    }
    tooltipHtml(no) {
      const def = this.deps.getUnderworldRuneDef(no), { _t: _t2 } = this.deps;
      if (!def) return `<div class="tooltip-title">${_t2("알 수 없는 지하석")}</div><div class="tooltip-line">${_t2("지하석 효과 정보가 없습니다.")}</div>`;
      const state = underworldRuneState(this.deps.game), lv = Math.max(0, Math.floor(state.enhanceLvByNo[def.no] || 0));
      const boosted = Number(def.val || 0) * (1 + lv * 0.01);
      const main = `${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat, boosted)}${this.deps.P_STATS[def.stat]?.isPct ? "%" : ""}${lv > 0 ? ` <span style="color:var(--copy-bright);">${_t2("(+{lv} 강화)", { lv })}</span>` : ""}`;
      const bonus = (state.bonusLinesByNo[def.no] || []).map((line) => this.bonusHtml(line)).join("");
      return `<div class="tooltip-title">${this.deps.escapeHTML(_t2(def.name))} <span style="color:var(--copy-bright);">${_t2("지하석{no}", { no: def.no })}</span></div><div class="tooltip-line" style="color:${this.deps.getItemStatToneColor(def.stat)};">${main}</div>${bonus || _t2('<div class="tooltip-line" style="color:var(--copy-muted);">강화 보너스 옵션 없음</div>')}`;
    }
    bonusHtml(line) {
      const text = this.deps._t("보너스, {stat} +{stat2}{value}", {
        stat: this.deps.getStatName(line.stat),
        stat2: this.deps.formatValue(line.stat, line.val),
        value: this.deps.P_STATS[line.stat]?.isPct ? "%" : ""
      });
      return `<div class="tooltip-line" style="color:${this.deps.getItemStatToneColor(line.stat)};">${text}</div>`;
    }
    showTooltip(event, no) {
      if (event.type !== "click" && !this.deps.window.matchMedia("(hover: hover)").matches) return;
      this.deps.showInfoTooltipHtml(event.clientX, event.clientY, this.tooltipHtml(no), "#9b7cff");
    }
  };

  // modules/ui/underworld-rune-inventory.mjs
  var UnderworldRuneInventory = class {
    constructor(deps2, crafting2, details2) {
      this.deps = deps2;
      this.crafting = crafting2;
      this.details = details2;
      this.active = true;
      this.listeners = [];
      this.overlay = null;
      this.context = null;
      this.closePicker = null;
    }
    current() {
      if (!this.active) return false;
      const context = this.context, owner = this.deps.game;
      return !context || context.owner === owner && context.state === owner.underworldRunes && context.loop === owner.loopCount && context.season === owner.season;
    }
    closeStale() {
      if (!this.current()) this.closeOverlay();
    }
    editable() {
      if (!this.current()) {
        this.closeOverlay();
        return false;
      }
      return this.deps.assertBuildEditable();
    }
    finish(close) {
      if (close) this.closeOverlay();
      this.deps.updateStaticUI();
      this.deps.queueImportantSave(200);
    }
    equip(index, no) {
      if (!this.editable()) return;
      if (this.crafting.equipRune(this.deps.game, index, no).ok) this.finish(true);
    }
    unequip(index) {
      if (!this.editable()) return;
      if (this.crafting.unequipRune(this.deps.game, index).ok) this.finish(true);
    }
    craft() {
      if (!this.editable()) return;
      const result = this.crafting.craftRune(this.deps.game), { _t: _t2 } = this.deps;
      if (!result.ok) {
        const text = result.reason === "unlock" ? _t2("먼저 지하계 10층 단위 보상으로 지하석 번호를 해금하세요.") : _t2("지하석 조각이 부족합니다. (필요: {need})", { need: result.cost.runeShard });
        return this.deps.addLog(text, "attack-monster");
      }
      const def = this.deps.getUnderworldRuneDef(result.no);
      this.deps.addLog(_t2("🧿 지하석 가공 성공: {name} 획득 ({detail})", {
        name: def ? _t2(def.name) : _t2("지하석{n}", { n: result.no }),
        detail: this.baseEffectText(def)
      }), "loot-unique");
      this.finish(false);
    }
    upgrade(fromNo) {
      if (!this.editable()) return;
      if (fromNo == null) return this.openUpgrade();
      const result = this.crafting.upgradeRune(this.deps.game, fromNo), { _t: _t2 } = this.deps;
      if (!result.ok) return this.upgradeFailure(result);
      this.closeOverlay();
      const def = this.deps.getUnderworldRuneDef(result.no);
      this.deps.addLog(_t2("🧿 지하석 승급 성공: {from}×3 + 지하석 조각 {shards} → {to} ({detail})", {
        from: _t2("지하석{n}", { n: result.from }),
        shards: result.cost.runeShard,
        to: def ? _t2(def.name) : _t2("지하석{n}", { n: result.no }),
        detail: this.baseEffectText(def)
      }), "loot-unique");
      this.finish(false);
    }
    baseEffectText(def) {
      return def ? `${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat, def.val)}` : "";
    }
    upgradeFailure(result) {
      const { _t: _t2 } = this.deps;
      let text = _t2("동일 번호 지하석 3개가 필요합니다. (지하석30은 승급 불가)");
      if (result.reason === "cost") text = _t2("지하석 조각이 부족합니다. (필요: {shardNeed})", { shardNeed: result.cost.runeShard });
      if (result.reason === "unlock") text = _t2("현재는 {stone} 승급할 수 없습니다. (해금된 최대 번호: {max})", {
        stone: this.deps.withObjectParticle(_t2("지하석{n}", { n: result.from })),
        max: result.max
      });
      this.deps.addLog(text, "attack-monster");
    }
    slotOptionsHtml(counts) {
      const keys = Object.keys(counts).map(Number).sort((a, b) => a - b), { _t: _t2 } = this.deps;
      if (!keys.length) return `<div class="underworld-rune-empty">${_t2("보관 중인 지하석이 없습니다.")}</div>`;
      return keys.map((no) => {
        const def = this.deps.getUnderworldRuneDef(no), title = def ? _t2(def.name) : _t2("지하석{no}", { no });
        return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" data-rune-command="equip" data-rune-number="${no}">${this.details.iconHtml(no)}<strong>${title}</strong><span>${_t2("보유 {runeCountMap}개, {no}", { runeCountMap: counts[no], no: this.details.effectHtml(no) })}</span></button>`;
      }).join("");
    }
    upgradeOptionHtml(no, count, max) {
      const shardNeed = Math.max(5, no), canPay2 = (this.deps.game.currencies.runeShard || 0) >= shardNeed;
      const canUpgrade = no < max && canPay2, target = no + 1, { _t: _t2 } = this.deps;
      const def = this.deps.getUnderworldRuneDef(no), toDef = this.deps.getUnderworldRuneDef(target);
      const status = canUpgrade ? `${this.deps.withDirectionParticle(_t2("지하석{target}", { target }))} ${_t2("승급")}, ${_t2("지하석 조각")} ${shardNeed}` : no >= max ? _t2("지하석{target} 해금 필요", { target }) : _t2("지하석 조각 부족 ({shardNeed})", { shardNeed });
      const title = def ? _t2("{name} 지하석{no}", { name: def.name, no }) : _t2("지하석{no}", { no });
      const targetName = toDef ? _t2("{name} 지하석{target}", { name: toDef.name, target }) : _t2("지하석{target}", { target });
      return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" data-rune-command="upgrade" data-rune-number="${no}" ${canUpgrade ? "" : "disabled"}>${this.details.iconHtml(no)}<strong>${title} ×${count}</strong><span>${this.details.effectHtml(no)}</span><span>→ ${targetName}, ${status}</span></button>`;
    }
    openSlot(index) {
      this.closeOverlay();
      if (!this.active) return;
      const owner = this.deps.game, state = underworldRuneState(owner), { _t: _t2 } = this.deps;
      if (!validUnderworldRuneSlot(state, index)) return;
      const current = state.equippedRunes[index] ? this.details.tooltipHtml(state.equippedRunes[index]) : `<div class="tooltip-line">${_t2("현재 비어있음")}</div>`;
      const body = `<div class="underworld-rune-current">${current}</div><div class="underworld-rune-option-grid">${this.slotOptionsHtml(underworldRuneCountMap(state.obtainedRunes))}</div><div class="underworld-rune-overlay-actions"><button type="button" data-rune-command="unequip" ${state.equippedRunes[index] ? "" : "disabled"}>${_t2("이 슬롯 해제")}</button></div>`;
      this.openPicker(owner, { mode: "slot", index }, [
        _t2("지하석 슬롯 {value} 선택", { value: index + 1 }),
        _t2("보유한 룬을 클릭해 장착하거나 현재 슬롯을 비울 수 있습니다."),
        body
      ], `.underworld-rune-slot:nth-child(${index + 1})`);
    }
    openUpgrade() {
      this.closeOverlay();
      if (!this.active) return;
      const owner = this.deps.game, state = underworldRuneState(owner), { _t: _t2 } = this.deps;
      const counts = underworldRuneCountMap(state.obtainedRunes);
      const max = Math.max(1, Math.min(30, Math.floor(state.unlockedRunesMaxNumber || 1)));
      const rows = Object.keys(counts).map(Number).sort((a, b) => a - b).filter((no) => counts[no] >= 3 && no < 30);
      if (!rows.length) return this.upgradeFailure({ reason: "copies" });
      const options = rows.map((no) => this.upgradeOptionHtml(no, counts[no], max)).join("");
      this.openPicker(owner, { mode: "upgrade" }, [
        _t2("지하석 승급 대상 선택"),
        _t2("동일 번호 룬 3개와 룬조각을 사용해 어떤 룬을 다음 번호로 승급할지 선택하세요."),
        `<div class="underworld-rune-option-grid">${options}</div>`
      ], '.underworld-action-grid button[data-underworld-command="upgrade"]');
    }
    openPicker(owner, selection, content, returnSelector) {
      const [title, description, body] = content, overlay = this.deps.document.createElement("div");
      overlay.id = "underworld-rune-overlay";
      overlay.className = "underworld-rune-overlay";
      overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title" id="underworld-rune-title">${title}</div><div class="underworld-rune-overlay-desc">${description}</div></div><button type="button">${this.deps._t("닫기")}</button></div>${body}</div>`;
      this.context = { owner, state: owner.underworldRunes, loop: owner.loopCount, season: owner.season, ...selection };
      this.overlay = overlay;
      this.deps.document.body.appendChild(overlay);
      listenView(this, overlay, "click", (event) => this.onClick(event, overlay));
      listenView(this, overlay, "mouseover", (event) => this.onTooltip(event, overlay));
      listenView(this, overlay, "mousemove", (event) => this.onTooltip(event, overlay));
      listenView(this, overlay, "mouseout", (event) => this.onTooltipOut(event));
      this.closePicker = this.deps.bindGamePicker(overlay, {
        titleId: "underworld-rune-title",
        closeSelector: ".underworld-rune-overlay-head button",
        returnSelector,
        onClose: () => this.overlayClosed(overlay)
      });
    }
    onClick(event, overlay) {
      if (this.overlay !== overlay) return;
      if (!this.current()) {
        this.closeOverlay();
        return;
      }
      const button = event.target.closest("[data-rune-command]");
      if (!button || !overlay.contains(button) || button.disabled) return;
      this.selectCommand(button.dataset.runeCommand, Number(button.dataset.runeNumber));
    }
    selectCommand(command, no) {
      const { mode, index } = this.context;
      if (mode === "upgrade") {
        if (command === "upgrade") this.upgrade(no);
        return;
      }
      if (command === "equip") this.equip(index, no);
      if (command === "unequip") this.unequip(index);
    }
    onTooltip(event, overlay) {
      if (this.overlay !== overlay) return;
      if (!this.current()) {
        this.closeOverlay();
        return;
      }
      const button = event.target.closest("[data-rune-number]");
      if (button && overlay.contains(button)) this.details.showTooltip(event, Number(button.dataset.runeNumber));
    }
    onTooltipOut(event) {
      const button = event.target.closest("[data-rune-number]");
      if (button && !button.contains(event.relatedTarget)) this.deps.hideInfoTooltip();
    }
    overlayClosed(overlay) {
      releaseViewTarget(this, overlay);
      if (this.overlay !== overlay) return;
      this.overlay = null;
      this.context = null;
      this.closePicker = null;
      this.deps.hideInfoTooltip();
    }
    closeOverlay() {
      const close = this.closePicker;
      if (close) close();
    }
    dispose() {
      this.closeOverlay();
      releaseViewEvents(this);
    }
  };

  // modules/underworld-rune-ui-classic.mjs
  var ensureUnderworldRuneState = () => underworldRuneState(window.GameModules.state.game);
  var getUnderworldRuneDef = (no) => underworldRuneDef(no, UNDERWORLD_RUNE_DB);
  var getUnderworldRuneCountMap = underworldRuneCountMap;
  var crafting = new UnderworldCrafting({
    get enchantPools() {
      return UNDERWORLD_ENCHANT_POOLS;
    },
    get limitBreak() {
      return UNDERWORLD_LIMIT_BREAK;
    },
    statName: (id) => getStatName(id),
    runeDef: (no) => getUnderworldRuneDef(no),
    random: () => Math.random()
  });
  var deps = {
    crafting,
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get enterUnderworldFloor() {
      return enterUnderworldFloor;
    },
    get enterUnderworldPrompt() {
      return enterUnderworldPrompt;
    },
    get upgradeSkyStone() {
      return upgradeSkyStone;
    },
    get P_STATS() {
      return P_STATS;
    },
    get UNDERWORLD_DEEP_FLOOR_REWARD() {
      return UNDERWORLD_DEEP_FLOOR_REWARD;
    },
    get UNDERWORLD_ENCHANT_POOLS() {
      return UNDERWORLD_ENCHANT_POOLS;
    },
    get UNDERWORLD_LIMIT_BREAK() {
      return UNDERWORLD_LIMIT_BREAK;
    },
    get UNDERWORLD_ZONE_ID() {
      return UNDERWORLD_ZONE_ID;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get assertBuildEditable() {
      return assertBuildEditable;
    },
    get bindGamePicker() {
      return bindGamePicker;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get captureUiDisclosureState() {
      return captureUiDisclosureState;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get document() {
      return document;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get ensureUnderworldRuneState() {
      return ensureUnderworldRuneState;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatValue() {
      return formatValue;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getSkyStoneMaxLevel() {
      return getSkyStoneMaxLevel;
    },
    get getSkyStoneNextCost() {
      return getSkyStoneNextCost;
    },
    get getSkyStoneReductionPct() {
      return getSkyStoneReductionPct;
    },
    get getStatName() {
      return getStatName;
    },
    get getUnderworldEntryBlock() {
      return getUnderworldEntryBlock;
    },
    get getUnderworldRuneCountMap() {
      return getUnderworldRuneCountMap;
    },
    get getUnderworldRuneDef() {
      return getUnderworldRuneDef;
    },
    get getUnderworldZone() {
      return getUnderworldZone;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get withObjectParticle() {
      return withObjectParticle;
    },
    get withDirectionParticle() {
      return withDirectionParticle;
    },
    get requestGameChoice() {
      return requestGameChoice;
    },
    get restoreUiDisclosureState() {
      return restoreUiDisclosureState;
    },
    get updateGamePanelMarkup() {
      return updateGamePanelMarkup;
    },
    get window() {
      return window;
    }
  };
  var details = new UnderworldRuneDetails(deps);
  var inventory = new UnderworldRuneInventory(deps, crafting, details);
  var underworldRuneUi = createUnderworldRuneView(deps, inventory, details);
  safeExposeGlobals({
    underworldRuneUi,
    ensureUnderworldRuneState,
    getUnderworldRuneDef,
    getUnderworldRuneCountMap,
    applyUnderworldEnchant: underworldRuneUi.applyUnderworldEnchant,
    attemptUnderworldLimitBreak: underworldRuneUi.attemptUnderworldLimitBreak,
    enhanceUnderworldRune: underworldRuneUi.enhanceUnderworldRune,
    rerollUnderworldRuneBonus: underworldRuneUi.rerollUnderworldRuneBonus,
    renderUnderworldMapPanel: underworldRuneUi.render,
    getUnderworldRuneEffectHtml: (no) => details.effectHtml(no),
    showUnderworldRuneTooltip: (event, no) => details.showTooltip(event, no),
    closeUnderworldRuneOverlay: () => inventory.closeOverlay(),
    openUnderworldRuneOverlay: (index) => inventory.openSlot(index),
    equipUnderworldRuneToSlot: (index, no) => inventory.equip(index, no),
    unequipUnderworldRuneSlot: (index) => inventory.unequip(index),
    craftUnderworldRune: () => inventory.craft(),
    openUnderworldRuneUpgradeOverlay: () => inventory.openUpgrade(),
    upgradeUnderworldRune: (no) => inventory.upgrade(no)
  });
})();
