// GENERATED from modules/realm-content-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/beehive-choices.mjs
  var BeehiveChoices = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    rewardAmount(base, branchStep) {
      let depthBonus = Math.max(0, Math.floor(branchStep || 0)) * 0.08;
      return Math.max(1, Math.floor(base * (1 + depthBonus)));
    }
    penaltyPool(owner, branchStep) {
      let depth = Math.max(1, Math.floor(branchStep || 1));
      let pool = [
        { key: "swarm", text: (0, this.deps._t)("군체 분노 +1"), power: 1 },
        { key: "pursuit", text: (0, this.deps._t)("이번 무리 벌 +2마리"), power: 2 },
        { key: "pollen_tax", text: (0, this.deps._t)("꽃가루 -6"), power: 1 }
      ];
      if (depth >= 4) pool.push({ key: "deep_swarm", text: (0, this.deps._t)("심층 군체 분노 +2"), power: 2 });
      pool.push(
        { key: "venom_tax", text: (0, this.deps._t)("독벌침 1개 소모 확률 25%"), power: 1 },
        { key: "honey_tax", text: (0, this.deps._t)("벌꿀 1개 소모 확률 20%"), power: 1 }
      );
      if (depth >= 6) pool.push({ key: "royal_swarm", text: (0, this.deps._t)("왕실 군체 분노 +3"), power: 3 });
      return pool.filter((...args) => this.canPay(owner, ...args));
    }
    penaltyCost(penalty) {
      const costs = {
        pollen_tax: { key: "pollen", name: "꽃가루", amount: 6, chance: 1 },
        venom_tax: { key: "venomStinger", name: "독벌침", amount: 1, chance: 0.25 },
        honey_tax: { key: "enchantedHoney", name: "벌꿀", amount: 1, chance: 0.2 }
      };
      return penalty ? costs[penalty.key] : void 0;
    }
    canPay(owner, penalty) {
      if (!penalty) return false;
      const cost = this.penaltyCost(penalty);
      if (cost) return (owner.currencies[cost.key] || 0) >= cost.amount;
      return ["swarm", "sting", "pursuit", "deep_swarm", "royal_swarm"].includes(penalty.key);
    }
    selectable(owner, choices2, key) {
      if (!["a", "b", "c"].includes(key)) return null;
      const pick = choices2[key];
      if (!pick || key !== "c" || ["a", "b", "c"].some((id) => this.canPay(owner, choices2[id]?.penalty))) return pick;
      return { ...pick, penalty: { key: "swarm", text: (0, this.deps._t)("군체 분노 +1"), power: 1 } };
    }
    rewardPool(owner, branchStep) {
      let depth = Math.max(1, Math.floor(branchStep || 1));
      const currencies = {
        honey: ["enchantedHoney"],
        stinger: ["venomStinger"],
        bundle: ["pollen", "venomStinger", "formlessDew"]
      };
      return [
        { type: "pollen", weight: 42 },
        { type: "honey", weight: 18 },
        { type: "stinger", weight: 16 },
        { type: "formlessDew", weight: 14 + Math.min(8, depth) },
        { type: "goldenRule", weight: 2 + Math.floor(depth / 4) },
        { type: "jewelShard", weight: 10 },
        { type: "beeswax", weight: 10 },
        { type: "bundle", weight: 4 }
      ].filter((row) => (currencies[row.type] || [row.type]).every((key) => this.deps.contentProgression.canDropCurrency(key, owner)));
    }
    pickReward(owner, branchStep, usedTypes) {
      let used = usedTypes || /* @__PURE__ */ new Set();
      let pool = this.rewardPool(owner, branchStep).filter((row) => !used.has(row.type));
      if (pool.length <= 0) pool = this.rewardPool(owner, branchStep);
      let total = pool.reduce((sum, row) => sum + Math.max(0, row.weight || 0), 0);
      let roll = this.deps.random() * Math.max(1, total);
      for (let row of pool) {
        roll -= Math.max(0, row.weight || 0);
        if (roll <= 0) return row.type;
      }
      return pool[0].type;
    }
    prepare(owner, b) {
      if (!b || !b.inRun || b.awaitingClear || b.queenActive) return;
      let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
      let used = /* @__PURE__ */ new Set();
      let immediate = this.pickReward(owner, nextStep, used);
      used.add(immediate);
      let wave = this.pickReward(owner, nextStep, used);
      used.add(wave);
      let queen = this.pickReward(owner, nextStep, used);
      b.pendingChoice = {
        a: this.option(owner, immediate, nextStep, "immediate"),
        b: this.option(owner, wave, nextStep, "wave"),
        c: this.option(owner, queen, nextStep, "queen"),
        branchStep: nextStep
      };
    }
    timingLabel(timing) {
      if (timing === "immediate") return "즉시 보상";
      if (timing === "queen") return "여왕벌 보상";
      return "웨이브 보상";
    }
    timingMultiplier(timing) {
      if (timing === "immediate") return 0.55;
      if (timing === "queen") return 2.25;
      return 1;
    }
    scaledAmount(baseAmount, timing) {
      return Math.max(1, Math.floor(Math.max(1, baseAmount || 1) * this.timingMultiplier(timing)));
    }
    scaledChance(baseChance, timing) {
      let chance = Number.isFinite(baseChance) ? baseChance : 1;
      if (timing === "immediate") return Math.max(0.05, Math.min(1, chance * 0.75));
      if (timing === "queen") return Math.min(1, chance + 0.35);
      return chance;
    }
    option(owner, type, branchStep, timing = "wave") {
      let step = Math.max(1, Math.floor(branchStep || ((owner.beehive || {}).branchStep || 1)));
      let penaltyPool = this.penaltyPool(owner, step);
      let penalty = penaltyPool[Math.floor(this.deps.random() * penaltyPool.length)];
      const reward = this.rewardOffer(type, step, timing);
      const text = this.deps._t("[{label}] {text} / 대가: {text2}", {
        label: this.timingLabel(timing),
        text: reward.text,
        text2: penalty.text
      });
      return { ...reward, text, penalty, timing };
    }
    rewardOffer(type, step, timing) {
      const scaled = (base) => this.scaledAmount(this.rewardAmount(base, step), timing);
      switch (type) {
        case "pollen":
          return this.amountOffer(type, scaled(12 + Math.floor(this.deps.random() * 7)));
        case "honey":
        case "stinger":
        case "goldenRule":
          return this.chanceOffer(type, step, timing);
        case "formlessDew":
          return this.amountOffer(type, scaled(1 + Number(step >= 7)));
        case "jewelShard":
          return this.amountOffer(type, scaled(2 + Math.floor(this.deps.random() * 3)));
        case "beeswax":
          return this.amountOffer(type, this.scaledAmount(1 + Number(step >= 8), timing));
        case "bundle":
          return this.amountOffer(type, this.scaledAmount(1, timing));
        default:
          return this.amountOffer("pollen", this.scaledAmount(10, timing));
      }
    }
    amountOffer(effect, amount) {
      const labels = {
        pollen: "꽃가루 +{amount}",
        formlessDew: "형체 없는 이슬 +{amount}",
        jewelShard: "주얼 결정 +{amount}",
        beeswax: "밀랍 +{amount}",
        bundle: "꽃가루 +{value}, 독벌침 +{amount}, 형체 없는 이슬 +{amount2}"
      };
      return { text: this.deps._t(labels[effect], { amount, value: 20 * amount, amount2: amount }), effect, amount, chance: void 0 };
    }
    chanceOffer(effect, step, timing) {
      const chances = { honey: 0.3, stinger: 0.38, goldenRule: step >= 8 ? 1 : 0.35 };
      const labels = { honey: "벌꿀 획득 확률 {floor}%", stinger: "독벌침 획득 확률 {floor}%", goldenRule: "황금률 획득 확률 {floor}%" };
      const chance = this.scaledChance(chances[effect], timing);
      const text = effect === "goldenRule" && chance >= 1 ? "황금률 +1" : this.deps._t(labels[effect], { floor: Math.floor(chance * 100) });
      return { text, effect, amount: 1, chance };
    }
    applyPenalty(owner, penalty, b) {
      if (!this.canPay(owner, penalty)) return null;
      b.waveExtra = Number(penalty.key === "pursuit") * 2;
      const cost = this.penaltyCost(penalty);
      if (cost) {
        if (cost.chance < 1 && this.deps.random() >= cost.chance) return (0, this.deps._t)("{name} 소모 없음", { name: cost.name });
        owner.currencies[cost.key] -= cost.amount;
        return `${cost.name} -${cost.amount}`;
      }
      return this.applyCombatPenalty(owner, penalty, b);
    }
    applyCombatPenalty(owner, penalty, b) {
      let power = Math.max(1, Math.floor(penalty.power || 1));
      if (["swarm", "deep_swarm", "royal_swarm"].includes(penalty.key)) b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + power));
      else if (penalty.key === "sting") owner.playerHp = Math.max(1, Math.floor((owner.playerHp || 1) * 0.95));
      return penalty.text || "";
    }
    applyReward(owner, pick) {
      if (!pick) return "";
      let chance = Number.isFinite(pick.chance) ? pick.chance : 1;
      if (chance < 1 && this.deps.random() >= chance) return "보상 획득 실패";
      let amount = Math.max(1, Math.floor(pick.amount || 1));
      return this.creditReward(owner, pick.effect, amount);
    }
    creditReward(owner, effect, amount) {
      if (effect === "honey") {
        owner.currencies.enchantedHoney = (owner.currencies.enchantedHoney || 0) + amount;
        return (0, this.deps._t)("벌꿀 +{amount}", { amount });
      }
      if (effect === "stinger") {
        owner.currencies.venomStinger = (owner.currencies.venomStinger || 0) + amount;
        return (0, this.deps._t)("독벌침 +{amount}", { amount });
      }
      if (effect === "bundle") return this.creditBundle(owner, amount);
      if (!effect) return "";
      const merged = Object.entries(this.deps.CURRENCY_LEGACY_MERGE || {}).find(([, keys]) => keys.includes(effect));
      const key = merged ? merged[0] : effect;
      owner.currencies[key] = (owner.currencies[key] || 0) + amount;
      return `${this.deps.getCurrencyInfo(key).name} +${amount}`;
    }
    creditBundle(owner, amount) {
      owner.currencies.pollen = (owner.currencies.pollen || 0) + 20 * amount;
      owner.currencies.venomStinger = (owner.currencies.venomStinger || 0) + amount;
      owner.currencies.formlessDew = (owner.currencies.formlessDew || 0) + amount;
      return (0, this.deps._t)("꽃가루 +{value} / 독벌침 +{amount} / 형체 없는 이슬 +{amount2}", { value: 20 * amount, amount, amount2: amount });
    }
  };

  // modules/state/realm-progress.mjs
  function beehivePanelProgress(owner) {
    return owner.beehive || (owner.beehive = { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0 });
  }
  function colonyPanelProgress(owner) {
    return owner.colony || (owner.colony = {});
  }
  function grandBreachPanelProgress(owner) {
    return owner.voidRift || (owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
  }

  // modules/combat/beehive-run.mjs
  var BeehiveRun = class {
    constructor(deps2, choices2) {
      this.deps = deps2;
      this.choices = choices2;
    }
    *spawn(owner, isBoss) {
      let b = owner.beehive || {};
      let zone = (0, this.deps.getZone)("beehive_run") || (0, this.deps.getZone)(0);
      let step = Math.max(1, Math.floor(b.branchStep || 1));
      let count = this.waveCount(b, step, isBoss);
      let eliteCount = step >= 6 ? 3 : 2;
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.moveTimer = 0;
      let wave = [];
      for (let i = 0; i < count; i++) {
        let marker = { elite: !isBoss && i < eliteCount, boss: isBoss };
        let enemy = (0, this.deps.createEnemy)(zone, marker, i);
        wave.push((0, this.deps.tuneBeehiveWaveEnemy)(enemy, zone, isBoss, b.enemyEmpower));
      }
      let roomRun = (0, this.deps.getBeehiveRoomRun)();
      if (roomRun) (0, this.deps.placeBeehiveRoomWave)(roomRun, wave, step, isBoss);
      else owner.enemies.push(...wave);
      if (isBoss) yield { kind: "log", args: [(0, this.deps._t)("👑 10개 갈림길을 완료해 여왕벌이 등장했습니다. 여왕벌을 처치하면 벌집 원정이 완료됩니다."), "loot-unique"] };
      else yield { kind: "log", args: [(0, this.deps._t)("🐝 벌떼 웨이브 시작! 진행도 {min}%, 남은 적을 모두 처치해야 다음 갈림길이 열립니다.", { min: Math.min(100, step * 10) }), "attack-monster"] };
    }
    waveCount(b, step, isBoss) {
      return isBoss ? 1 : Math.min(8, 6 + Math.floor((step - 1) / 4)) + (b.waveExtra || 0);
    }
    *start(owner) {
      let b = owner.beehive || (owner.beehive = {});
      if ((owner.currencies.hiveKey || 0) <= 0 || b.inRun) return;
      const block = (0, this.deps.getContentStartBlockReason)();
      if (block) return yield { kind: "log", args: [block, "attack-monster"] };
      let lastDeepChaosDepth = Math.max(21, Math.min(owner.abyssEndlessDepth || 21, owner.loopProgressCurrent.bestAbyssDepth || 21));
      (0, this.deps.resetBeehiveRunModifiers)(b);
      owner.currencies.hiveKey--;
      b.entryDeepChaosDepth = lastDeepChaosDepth;
      b.inRun = true;
      b.branchStep = 0;
      b.inMapZoneId = "beehive_run";
      b.returnZoneId = (0, this.deps.getContentReturnZoneId)();
      b.queenActive = false;
      (0, this.deps.actExplorationProgress).depart(owner);
      owner.currentZoneId = "beehive_run";
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.runProgress = 0;
      owner.moveTimer = 0;
      if ((0, this.deps.actExplorationDoors).session()) (0, this.deps.startEncounterRun)();
      owner.combatHalted = true;
      this.choices.prepare(owner, b);
      yield { kind: "log", args: [(0, this.deps._t)("🐝 벌집 원정 시작! 기준 난이도: 혼돈 심화 {max}, 갈림길을 선택하면 즉시 벌떼 웨이브가 시작됩니다.", { max: Math.max(21, Math.floor(b.entryDeepChaosDepth || 21)) }), "season-up"] };
      yield { kind: "refresh", args: [] };
      yield { kind: "save", args: [200] };
    }
    *syncChoices(owner) {
      const b = beehivePanelProgress(owner);
      if (b.inRun && !b.pendingChoice && !b.awaitingClear && !b.queenActive) this.choices.prepare(owner, b);
      if (b.inRun && b.awaitingClear && this.deps.countBeehiveWaveAlive() === 0) yield* this.cleared(owner);
      return b;
    }
    canResolve(b) {
      return !!b?.inRun && !!b.pendingChoice && !b.awaitingClear && (0, this.deps.countBeehiveWaveAlive)() === 0;
    }
    *validatePayment(owner, pick, displayedPenalty) {
      if (this.choices.canPay(owner, pick.penalty) && (!displayedPenalty || displayedPenalty === pick.penalty.key)) return true;
      yield { kind: "close", args: [] };
      yield { kind: "open", args: ["보유 재료가 바뀌었습니다. 대가를 확인하고 다시 선택하세요."] };
      yield { kind: "refresh", args: [] };
      return false;
    }
    *resolve(owner, key, displayedPenalty) {
      let b = owner.beehive;
      if (!this.canResolve(b)) return;
      let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
      const pick = this.selectedReward(owner, b, key, nextStep);
      if (!pick) return;
      if (!(yield* this.validatePayment(owner, pick, displayedPenalty))) return;
      let penaltyText = this.choices.applyPenalty(owner, pick.penalty, b);
      yield { kind: "close", args: [] };
      const { rewardText, rewardResult } = this.queueReward(owner, b, pick);
      b.penaltyLedger.push(penaltyText || "");
      b.pendingChoice = null;
      b.branchStep = nextStep;
      b.awaitingClear = true;
      b.queenActive = false;
      owner.runProgress = Math.min(100, b.branchStep * 10);
      owner.combatHalted = false;
      const timingText = this.paymentText(pick.timing, rewardText, rewardResult);
      yield { kind: "log", args: [this.deps._t("🐝 갈림길 {step}/10 선택 완료: {timing}, 대가: {penalty}, 벌떼 웨이브 시작", { step: b.branchStep, timing: timingText, penalty: penaltyText || this.deps._t("없음") }), "loot-magic"] };
      yield* this.spawn(owner, false);
      yield { kind: "refresh", args: [] };
      yield { kind: "save", args: [200] };
    }
    selectedReward(owner, b, key, nextStep) {
      const pick = this.choices.selectable(owner, b.pendingChoice, key);
      if (pick || !["legacy_now", "legacy_later"].includes(key)) return pick;
      return this.choices.option(owner, key === "legacy_now" ? "pollen" : "honey", nextStep);
    }
    queueReward(owner, b, pick) {
      b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
      b.penaltyLedger = Array.isArray(b.penaltyLedger) ? b.penaltyLedger : [];
      let rewardText = String(pick.text || "").split(" / 대가:")[0];
      let rewardResult = "";
      b.pendingWaveReward = null;
      b.pendingWaveRewardText = "";
      b.pendingQueenRewards = Array.isArray(b.pendingQueenRewards) ? b.pendingQueenRewards : [];
      if (pick.timing === "immediate") {
        rewardResult = this.choices.applyReward(owner, pick);
        if (rewardResult) b.rewardLedger.push(rewardResult);
      } else if (pick.timing === "queen") {
        b.pendingQueenRewards.push({ effect: pick.effect, amount: pick.amount, chance: pick.chance, text: rewardText });
      } else {
        b.pendingWaveReward = { effect: pick.effect, amount: pick.amount, chance: pick.chance };
        b.pendingWaveRewardText = rewardText;
      }
      return { rewardText, rewardResult };
    }
    paymentText(timing, rewardText, rewardResult) {
      if (timing === "immediate") return this.deps._t("즉시 지급({rewardResult})", { rewardResult: rewardResult || this.deps._t("보상 없음") });
      if (timing === "queen") return this.deps._t("여왕벌 처치 후 지급({rewardText})", { rewardText: rewardText || this.deps._t("보상 없음") });
      return this.deps._t("웨이브 처치 후 지급({rewardText})", { rewardText: rewardText || this.deps._t("보상 없음") });
    }
    *exit(owner, message, logType) {
      yield { kind: "close", args: [] };
      let b = owner.beehive || {};
      b.inRun = false;
      b.branchStep = 0;
      (0, this.deps.resetBeehiveRunModifiers)(b);
      (0, this.deps.actExplorationProgress).depart(owner);
      owner.currentZoneId = b.returnZoneId !== void 0 && b.returnZoneId !== null ? b.returnZoneId : owner.maxZoneId;
      b.returnZoneId = null;
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.runProgress = 0;
      owner.combatHalted = false;
      if (message) yield { kind: "log", args: [message, logType || "attack-monster"] };
      yield { kind: "refresh", args: [] };
      yield { kind: "save", args: [200] };
    }
    *complete(owner) {
      let b = owner.beehive || {};
      if (!b.inRun || !b.queenActive) return;
      const rewardZone = (0, this.deps.getZone)("beehive_run");
      const risk = Math.max(0, Math.min(30, Math.floor(b.enemyEmpower || 0)));
      yield { kind: "close", args: [] };
      let queenRewardResults = [];
      if (Array.isArray(b.pendingQueenRewards)) {
        b.pendingQueenRewards.forEach((reward) => {
          let result = this.choices.applyReward(owner, reward);
          if (result) queenRewardResults.push(result);
        });
      }
      b.inRun = false;
      b.cleared = true;
      b.unlockedPermanent = true;
      (0, this.deps.resetBeehiveRunModifiers)(b);
      b.branchStep = 0;
      (0, this.deps.actExplorationProgress).depart(owner);
      owner.currentZoneId = b.returnZoneId !== void 0 && b.returnZoneId !== null ? b.returnZoneId : owner.maxZoneId;
      b.returnZoneId = null;
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.runProgress = 0;
      owner.combatHalted = false;
      (0, this.deps.markLoopSpecialBossKill)("beehive_queen");
      (0, this.deps.unlockJournalEntry)("beehive_queen");
      const wax = (0, this.deps.awardCurrency)("beeswax", 1 + Math.floor(risk / 6), "reward");
      const stinger = (0, this.deps.awardCurrency)("venomStinger", 1 + Math.floor(risk / 10), "reward");
      if (this.deps.random() < 0.08) {
        const itemLevel = (0, this.deps.levelProgression).itemLevel(rewardZone, { isBoss: true });
        const tier = Math.min((0, this.deps.getRealmEquipmentHiddenTierCap)(rewardZone), (0, this.deps.levelProgression).maxDropTier(itemLevel));
        let item = (0, this.deps.levelProgression).stampItem((0, this.deps.generateUniqueItem)(tier, "무기", null, rewardZone), itemLevel);
        (0, this.deps.addItemToInventory)(item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true });
      }
      yield { kind: "log", args: [(0, this.deps._t)("👑 여왕벌 처치! 밀랍 +{wax}, 독벌침 +{stinger} (군체 강화 {risk} 정산).{picked}", { wax, stinger, risk, picked: queenRewardResults.length ? ` ${(0, this.deps._t)("여왕벌 선택 보상")}: ${queenRewardResults.join(" / ")}` : "" }), "level-up"] };
      yield { kind: "refresh", args: [] };
      yield { kind: "save", args: [200] };
    }
    *cleared(owner) {
      let b = owner.beehive || {};
      if (!b.inRun || !b.awaitingClear) return;
      if ((0, this.deps.countBeehiveWaveAlive)() > 0) return;
      b.waveExtra = 0;
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.moveTimer = 0;
      if (b.queenActive) return yield* this.complete(owner);
      const rewardResult = this.settleWaveReward(owner, b);
      b.awaitingClear = false;
      owner.combatHalted = true;
      owner.runProgress = Math.min(100, Math.max(0, Math.floor(b.branchStep || 0)) * 10);
      yield { kind: "save", args: [200] };
      if (b.branchStep >= 10) return yield* this.summonQueen(owner, b, rewardResult);
      this.choices.prepare(owner, b);
      yield { kind: "log", args: [(0, this.deps._t)("🐝 벌떼 웨이브 정리 완료{reward}. 다음 갈림길을 선택할 수 있습니다. ({step}/10)", { reward: rewardResult ? `: ${rewardResult}` : "", step: b.branchStep }), "loot-magic"] };
      yield { kind: "open", args: [rewardResult ? (0, this.deps._t)("웨이브 보상: {rewardResult}", { rewardResult }) : "웨이브를 정리했습니다."] };
      yield { kind: "refresh", args: [] };
    }
    *summonQueen(owner, b, rewardResult) {
      b.awaitingClear = true;
      b.queenActive = true;
      owner.combatHalted = false;
      yield* this.spawn(owner, true);
      if (rewardResult) yield { kind: "log", args: [this.deps._t("🐝 벌떼 웨이브 정리 완료: {rewardResult}. 여왕벌이 등장합니다.", { rewardResult }), "loot-unique"] };
      yield { kind: "refresh", args: [] };
    }
    settleWaveReward(owner, b) {
      if (!b.pendingWaveReward) return "";
      const result = this.choices.applyReward(owner, b.pendingWaveReward);
      b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
      if (result) b.rewardLedger.push(result);
      b.pendingWaveReward = null;
      b.pendingWaveRewardText = "";
      return result;
    }
  };

  // modules/combat/realm-run-controls.mjs
  var RealmRunControls = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    *startColony(owner) {
      let c = owner.colony || (owner.colony = {});
      if ((owner.currencies.colonyTrace || 0) <= 0 || c.inRun) return;
      const held = (0, this.deps.getContentStartBlockReason)();
      if (held) return yield { kind: "log", args: [held, "attack-monster"] };
      owner.currencies.colonyTrace--;
      c.entryDeepChaosDepth = (0, this.deps.getZone)("colony_run").entryDeepChaosDepth;
      c.inRun = true;
      c.wave = 1;
      c.kills = 0;
      c.requiredKills = (0, this.deps.getColonyWaveEnemyCount)(1);
      c.coreMaxHp = 0;
      c.coreHp = 0;
      c.failedWave = 0;
      c.returnAfterWave = 0;
      c.lastResult = null;
      c.pendingLoot = [];
      c.lootPending = false;
      c.bossLootCell = null;
      c.returnZoneId = (0, this.deps.getContentReturnZoneId)();
      (0, this.deps.actExplorationProgress).depart(owner);
      owner.currentZoneId = "colony_run";
      owner.combatHalted = false;
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.runProgress = 0;
      owner.moveTimer = 0;
      (0, this.deps.spawnColonyWave)();
      yield { kind: "log", args: [(0, this.deps._t)("🪲 군락지 방어전 시작! 기준 난이도: 혼돈 심화 {entryDeepChaosDepth}", { entryDeepChaosDepth: c.entryDeepChaosDepth }), "season-up"] };
      yield { kind: "refresh", args: [] };
      yield { kind: "save", args: [200] };
    }
    canAutoEnter(owner) {
      if ((0, this.deps.actExplorationState).current(owner)?.status === "active") return false;
      let v = owner.voidRift;
      let g = v.grandRun || {};
      let beehiveRunning = (0, this.deps.isBeehiveRunLockedForMapTravel)();
      return !!(owner.settings && owner.settings.autoEnterGrandBreach && v.grandBreachUnlock && !g.inRun && !beehiveRunning && owner.currentZoneId !== "grand_breach_run");
    }
    *autoEnter(owner) {
      if (!this.canAutoEnter(owner) || (0, this.deps.getZone)(owner.currentZoneId)?.type === "act" || (0, this.deps.getContentStartBlockReason)()) return false;
      yield* this.enterGrand(owner, { automatic: true });
      if (owner.currentZoneId !== "grand_breach_run") return false;
      yield { kind: "log", args: [(0, this.deps._t)("🌌 자동입장: 대균열이 열려 즉시 진입합니다."), "season-up"] };
      return true;
    }
    *enterGrand(owner, options) {
      const held = (0, this.deps.getContentStartBlockReason)();
      if (held) return yield { kind: "log", args: [held, "attack-monster"] };
      let v = owner.voidRift;
      if (!v.grandBreachUnlock) return;
      this.reconcileGrand(owner);
      if (v.grandRun && v.grandRun.inRun) return;
      v.grandBreachUnlock = false;
      v.grandRun = {
        inRun: true,
        phase: "survival",
        survivalStarted: false,
        kills: 0,
        gauge: 0,
        pendingLoot: [],
        rewardVoidChisel: null,
        rewardJewelShard: null,
        nextRefillAt: 0,
        returnZoneId: (0, this.deps.getContentReturnZoneId)()
      };
      (0, this.deps.actExplorationProgress).depart(owner);
      owner.currentZoneId = "grand_breach_run";
      owner.enemies = [];
      owner.encounterPlan = [];
      owner.encounterIndex = 0;
      owner.runProgress = 0;
      owner.moveTimer = 0;
      owner.combatHalted = false;
      if (!options || !options.automatic) yield { kind: "log", args: [(0, this.deps._t)("🌌 대균열 진입! 일반 몬스터 0.5%, 정예 3%씩 게이지를 채워 균열 군주를 소환합니다. 전리품은 군주 처치 시 쏟아집니다."), "season-up"] };
      yield { kind: "refresh", args: [] };
      yield { kind: "save", args: [200] };
    }
    reconcileGrand(owner) {
      const v = grandBreachPanelProgress(owner);
      const run = v.grandRun;
      if (run?.inRun && owner.currentZoneId !== "grand_breach_run") {
        this.deps.actExplorationState.groundLoot.discardEncounter(owner, "grand_breach_run");
        run.inRun = false;
        run.phase = "failed";
      }
      return v;
    }
    *toggleMeteor(owner) {
      owner.settings = owner.settings || {};
      owner.settings.autoEnterMeteor = !owner.settings.autoEnterMeteor;
      yield { kind: "log", args: [`☄️ ${(0, this.deps._t)("운석 낙하 자동입장")} ${(0, this.deps._t)(owner.settings.autoEnterMeteor ? "켜짐" : "꺼짐")}`, "season-up"] };
      yield { kind: "refresh", args: [] };
    }
    *toggleGrand(owner) {
      owner.settings = owner.settings || {};
      owner.settings.autoEnterGrandBreach = !owner.settings.autoEnterGrandBreach;
      yield { kind: "log", args: [`🌌 ${(0, this.deps._t)("대균열 자동입장")} ${(0, this.deps._t)(owner.settings.autoEnterGrandBreach ? "켜짐" : "꺼짐")}`, "season-up"] };
      yield* this.autoEnter(owner);
      yield { kind: "refresh", args: [] };
    }
  };

  // modules/ui/beehive-view.mjs
  var BeehiveView = class {
    constructor(deps2, choices2) {
      this.deps = deps2;
      this.choices = choices2;
      this.active = true;
      this.dismissed = /* @__PURE__ */ new WeakSet();
      this.selection = null;
      this.revision = 0;
      this.overlay = null;
    }
    close(owner = this.deps.game, dismiss = false) {
      if (dismiss && this.overlay?.owner === owner && this.overlay.choice === owner.beehive.pendingChoice) {
        this.dismissed.add(this.overlay.choice);
      }
      let el = (0, this.deps.document).getElementById("beehive-choice-overlay");
      if (el) el.remove();
      this.overlay = null;
    }
    matches(owner, choice) {
      const saved = this.selection;
      return !!saved && saved.owner === owner && saved.choice === choice && saved.season === owner.season && saved.loop === owner.loopCount;
    }
    choiceRevision(owner, choice) {
      if (!this.matches(owner, choice)) {
        this.selection = { owner, choice, season: owner.season, loop: owner.loopCount, revision: ++this.revision };
      }
      return this.selection.revision;
    }
    accepts(owner, revision) {
      if (revision === void 0) return true;
      return this.matches(owner, owner.beehive?.pendingChoice) && revision === this.selection.revision;
    }
    runStatusHtml(owner, b, alive) {
      if (!b.inRun) return "";
      if (b.pendingChoice && !b.awaitingClear && alive <= 0) {
        this.open(owner);
        return `<div class="map-hive-choices"><strong>${this.deps._t("갈림길 선택 ({min}/10), 선택하면 전투가 시작됩니다.", { min: Math.min(10, (b.branchStep || 0) + 1) })}</strong>${this.buttonsHtml(owner, b.pendingChoice)}</div>`;
      }
      if (!b.awaitingClear) return "";
      return `<div style="margin-top:8px; color:#f3d28a;">${b.queenActive ? this.deps._t("여왕벌 전투 진행 중") : this.deps._t("벌떼 웨이브 진행 중 ({max}/10)", { max: Math.max(0, Math.floor(b.branchStep || 0)) })}, 남은 적 <strong>${alive}</strong>${this.deps._t("마리를 모두 처치해야 진행할 수 있습니다.")}</div>`;
    }
    buttonsHtml(owner, c) {
      if (!c) return "";
      const revision = this.choiceRevision(owner, c);
      if (c.a && c.b && c.c) {
        return ["a", "b", "c"].map((key) => this.choiceButton(owner, c, key, revision)).join("");
      }
      return `<button onclick="resolveBeehiveChoice('legacy_now',undefined,${revision})">${(0, this.deps.escapeHTML)(c.nowText || "즉시 보상")}</button><button onclick="resolveBeehiveChoice('legacy_later',undefined,${revision})">${(0, this.deps.escapeHTML)(c.laterText || "지연 보상")}</button>`;
    }
    choiceButton(owner, c, key, revision) {
      const pick = this.choices.selectable(owner, c, key);
      const cost = this.choices.penaltyCost(pick.penalty);
      const disabled = !this.choices.canPay(owner, pick.penalty);
      const reward = String(pick.text || "").split(" / 대가:")[0].replace(/^\[[^\]]*\]\s*/, "");
      const price = this.priceText(cost, pick.penalty);
      const stock = cost ? (0, this.deps._t)("보유 {currencies}개{value}", { currencies: owner.currencies[cost.key] || 0, value: disabled ? (0, this.deps._t)(", 재료 부족") : "" }) : "";
      const changed = pick !== c[key] ? "재료 부족으로 대가 변경" : "";
      return `<button class="hive-choice" onclick="resolveBeehiveChoice('${key}',${(0, this.deps.escapeHTML)(JSON.stringify(pick.penalty.key))},${revision})" ${disabled ? "disabled" : ""}>
                    <span class="hive-choice-timing">${this.choices.timingLabel(pick.timing)}</span><strong>${(0, this.deps.escapeHTML)(reward)}</strong>
                    <span class="hive-choice-price">${(0, this.deps._t)("대가, {price}", { price: (0, this.deps.escapeHTML)(price) })}</span><small>${(0, this.deps.escapeHTML)(stock || changed)}</small></button>`;
    }
    priceText(cost, penalty) {
      if (!cost) return penalty.text;
      return `${cost.name} ${cost.amount}개${cost.chance < 1 ? this.deps._t(" 소모 확률 {value}%", { value: cost.chance * 100 }) : this.deps._t(" 소모")}`;
    }
    open(owner, reasonText) {
      if (!this.active) return;
      if ((0, this.deps.document).querySelector("#tab-map.active:not(.ui-window-minimized) #map-tab-zones.active #map-explore-beehive.active")) {
        this.close(owner);
        return;
      }
      let b = owner.beehive;
      if (!this.pending(owner)) {
        this.close(owner);
        return;
      }
      this.choiceRevision(owner, b.pendingChoice);
      if (this.overlay && this.overlay !== this.selection) this.close(owner);
      if (this.dismissed.has(b.pendingChoice)) return;
      let alive = (0, this.deps.countBeehiveWaveAlive)();
      if (alive > 0 || (0, this.deps.document).getElementById("beehive-choice-overlay")) return;
      this.appendOverlay(owner, b, reasonText);
    }
    pending(owner) {
      const b = owner.beehive;
      return !!b?.inRun && !!b.pendingChoice && !b.awaitingClear;
    }
    appendOverlay(owner, b, reasonText) {
      let next = Math.min(10, Math.max(1, Math.floor(b.branchStep + 1)));
      let html = `<div id="beehive-choice-overlay" class="beehive-choice-overlay" role="dialog" aria-modal="true" aria-label="${(0, this.deps._t)("벌집 갈림길")}">
            <div class="beehive-choice-card">
                <div class="beehive-choice-heading"><strong>${(0, this.deps._t)("벌집 갈림길 {next}/10", { next })}</strong><button onclick="closeBeehiveChoiceOverlay(true)">${(0, this.deps._t)("닫기")}</button></div>
                <p>${(0, this.deps.escapeHTML)(reasonText || "다음 갈림길을 선택하세요.")}, 선택하면 전투가 시작됩니다.</p>
                ${(0, this.deps.sideEncounterUi).hiveSummary(b)}
                <div class="beehive-choice-actions">${this.buttonsHtml(owner, b.pendingChoice)}</div>
                <p>${(0, this.deps._t)("닫아도 벌집 패널에서 다시 선택할 수 있습니다.")}</p>
            </div>
        </div>`;
      (0, this.deps.document).body.insertAdjacentHTML("beforeend", html);
      this.overlay = this.selection;
    }
    dispose() {
      this.active = false;
      this.close();
      this.selection = null;
      this.dismissed = /* @__PURE__ */ new WeakSet();
    }
  };

  // modules/data/realm-panel.mjs
  var CHAOS_REALM_BONUS_CHIPS = [
    ["피해", "pctDmg", 1],
    ["이동 속도", "move", 1],
    ["생명력", "pctHp", 1],
    ["카오스 저항", "resChaos", 0],
    ["치명타 확률", "crit", 0],
    ["저항 관통", "resPen", 0],
    ["방어, 회피, 보호막", "armorPct", 0],
    ["치명타 피해", "critDmg", 0],
    ["공격 속도", "aspd", 0]
  ];

  // modules/ui/realm-panels-view.mjs
  var RealmPanelsView = class {
    constructor(deps2) {
      this.deps = deps2;
      this.active = true;
    }
    chaos() {
      if (!this.active) return;
      let panel = (0, this.deps.document).getElementById("ui-chaos-realm-panel");
      let list = (0, this.deps.document).getElementById("ui-chaos-realm-list");
      if (!panel || !list) return;
      let st = (0, this.deps.ensureChaosRealmState)();
      let best = Math.max(0, Number(st.woodsmanBestDamagePct || 0));
      (0, this.deps.writeHtmlIfChanged)(panel, st.unlocked ? this.entryHtml(this.deps.game, st) : this.lockedHtml(best));
      (0, this.deps.writeHtmlIfChanged)(list, st.unlocked ? this.detailHtml(st, best) : "");
      list.hidden = !st.unlocked;
    }
    lockedHtml(best) {
      return `<section class="underworld-entry-card"><div class="underworld-entry-copy"><span>${(0, this.deps._t)("혼돈계 봉인")}</span><strong>${(0, this.deps._t)("나무꾼 피해율 {best} / 10%", { best: best.toFixed(1) })}</strong><small class="underworld-lock">혼돈 밖 최종보스 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투가 끝나면 열립니다</small></div></section>`;
    }
    entryHtml(owner, st) {
      let ready = (0, this.deps.canEnterChaosRealm)(), floor = Math.max(1, Math.floor(st.currentFloor || 1)), highest = Math.max(1, Math.floor(st.highestFloor || 1));
      let lock = ready ? "" : '<small class="underworld-lock">이번 루프에서 혼돈 20을 클리어해야 들어갑니다. 진행과 보너스는 남습니다</small>';
      return `<section class="underworld-entry-card ${owner.currentZoneId === (0, this.deps.CHAOS_REALM_ZONE_ID) ? "current" : ""}"><div class="underworld-entry-copy"><span>${(0, this.deps._t)("루프로 초기화되지 않는 층, 선택 {floor}층, 클리어 {length}층", { floor, length: st.clearedFloors.length })}</span><strong>${(0, this.deps._t)("최고 입장 {highest}층", { highest })}</strong><div>${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)((0, this.deps.CHAOS_REALM_ZONE_ID)))}</div>${lock}</div><div class="underworld-entry-actions"><button type="button" class="underworld-primary-action" data-exploration-departure onclick="enterChaosRealmPrompt()" ${ready ? "" : "disabled"}>${(0, this.deps._t)("층 골라 입장")}</button></div></section>`;
    }
    detailHtml(st, best) {
      let floor = Math.max(1, Math.floor(st.currentFloor || 1)), zone = (0, this.deps.getZone)((0, this.deps.CHAOS_REALM_ZONE_ID)), bonus = st.permanentBonuses || {};
      let traits = (0, this.deps.getChaosRealmAffixes)(floor).map((affix) => `<span class="is-affix"><b>${(0, this.deps._t)(affix.name)}</b> ${(0, this.deps._t)(affix.desc)}</span>`).join("");
      let bonuses = CHAOS_REALM_BONUS_CHIPS.map(([name, key, digits]) => `<span class="has-stat${bonus[key] ? "" : " is-zero"}" style="--stat-tone:${(0, this.deps.getItemStatToneColor)(key)}">${name} <b>+${(Number(bonus[key]) || 0).toFixed(digits)}%</b></span>`).join("");
      return `<div class="chaos-realm-body"><section class="underworld-upgrade-card underworld-reward-card"><div><strong>${(0, this.deps._t)("{floor}층 특징", { floor })}</strong><span>${(0, this.deps._t)("난이도 혼돈 심화 {value}급", { value: zone ? zone.tier : (0, this.deps.getChaosRealmTier)(floor) })}</span></div><div class="underworld-ticket-strip">${traits}</div></section><section class="underworld-upgrade-card underworld-reward-card"><div><strong>${(0, this.deps._t)("영구 보너스")}</strong><span>${(0, this.deps._t)("층을 처음 깰 때 쌓이고, 루프가 지나도 남습니다.")} ${(0, this.deps._t)("나무꾼 최고 피해율 {best}%", { best: best.toFixed(1) })}</span></div><div class="underworld-ticket-strip">${bonuses}</div></section>${this.echoHtml(this.deps.game)}</div>`;
    }
    echoHtml(owner) {
      if (!(Array.isArray(owner.journalEntries) && owner.journalEntries.includes("woodsman_echo"))) return "";
      const echo = (0, this.deps.getRecordsView)(owner).echo;
      const recent = echo.last ? `<span>${(0, this.deps._t)("최근 DPS")} <b>${Math.floor(echo.last.dps).toLocaleString(this.deps.i18n.locale)}</b></span>` : "";
      const change = echo.changePct === null ? "" : `<span>${(0, this.deps._t)("이전 대비")} <b>${echo.changePct >= 0 ? "+" : ""}${echo.changePct.toFixed(1)}%</b></span>`;
      const best = Math.max(echo.bestDps, owner.woodsmanEchoRun.bestDps);
      return `<section class="underworld-upgrade-card"><div><strong>${(0, this.deps._t)("나무꾼의 잔상")}</strong><span>${(0, this.deps._t)("30초 피해 측정")}</span><div class="underworld-ticket-strip">${recent}${change}<span>${(0, this.deps._t)("최고 DPS")} <b>${Math.floor(best).toLocaleString(this.deps.i18n.locale)}</b></span></div></div><button type="button" data-exploration-departure onclick="enterWoodsmanEchoChallenge()">측정</button></section>`;
    }
    sky() {
      if (!this.active) return;
      const panel = (0, this.deps.document).getElementById("ui-sky-tower-panel");
      const list = (0, this.deps.document).getElementById("ui-sky-tower-list");
      if (!panel || !list) return;
      const tower = (0, this.deps.ensureSkyTowerState)();
      (0, this.deps.sideEncounterUi).renderPanel(panel, (0, this.deps.sideEncounterUi).skyPanel(tower));
      (0, this.deps.sideEncounterUi).renderPanel(list, tower.unlocked ? (0, this.deps.sideEncounterUi).skyGrowth(tower) : "");
    }
    oxygen(owner) {
      if (!this.active) return;
      let box = (0, this.deps.document).getElementById("ui-ocean-oxygen-box");
      if (!box) return;
      let st = typeof (0, this.deps.ensureOceanState) === "function" ? (0, this.deps.ensureOceanState)() : null;
      let active = st && st.unlocked && st.diving && owner.currentZoneId === (0, this.deps.OCEAN_ZONE_ID);
      if (!active) {
        if (box.style.display !== "none") box.style.display = "none";
        return;
      }
      box.style.display = "";
      this.paintOxygen(st);
    }
    paintOxygen(st) {
      let max = Math.max(1, st.oxygenMax || 100);
      let cur = Math.max(0, Math.min(max, st.oxygenCur || 0));
      let pct = cur / max * 100;
      let bar = (0, this.deps.document).getElementById("ui-ocean-oxygen-bar");
      let text = (0, this.deps.document).getElementById("ui-ocean-oxygen-text");
      if (bar) {
        bar.style.width = pct + "%";
        bar.style.background = pct <= 20 ? "linear-gradient(90deg,#d63031,#ff7675)" : "linear-gradient(90deg,#1f9bd6,#4fd1ff)";
      }
      if (text) text.textContent = `${Math.ceil(cur)} / ${max}`;
    }
    dispose() {
      this.active = false;
    }
  };

  // modules/ui/realm-content-controls.mjs
  var RealmContentControls = class {
    constructor(deps2, hive2, bees2, runs2) {
      this.deps = deps2;
      this.hive = hive2;
      this.bees = bees2;
      this.runs = runs2;
      this.active = true;
      this.forfeits = /* @__PURE__ */ new WeakSet();
    }
    renderHive(owner, shouldRenderPanel = true) {
      if (!this.active) return;
      let open = (owner.season || 1) >= 8;
      const panel = this.hivePanelVisibility(open && shouldRenderPanel);
      if (!open) return;
      const b = this.consume(this.bees.syncChoices(owner));
      if (!b) return;
      let aliveBeeEnemies = (0, this.deps.countBeehiveWaveAlive)();
      const choiceHtml = this.hive.runStatusHtml(owner, b, aliveBeeEnemies);
      if (shouldRenderPanel) this.paintHivePanel(panel, b, choiceHtml);
    }
    hivePanelVisibility(show) {
      let header = (0, this.deps.document).getElementById("ui-beehive-header");
      let panel = (0, this.deps.document).getElementById("ui-beehive-panel");
      const display = show ? "block" : "none";
      if (header) header.style.display = display;
      if (panel) panel.style.display = display;
      return panel;
    }
    paintHivePanel(panel, b, choiceHtml) {
      if (!panel) return;
      const html = (0, this.deps.sideEncounterUi).hivePanel(b, choiceHtml, (0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)("beehive_run")));
      (0, this.deps.sideEncounterUi).renderPanel(panel, html);
    }
    renderColony(owner) {
      if (!this.active) return;
      let open = (owner.season || 1) >= 15;
      let header = (0, this.deps.document).getElementById("ui-colony-header");
      let panel = (0, this.deps.document).getElementById("ui-colony-panel");
      let wardHost = (0, this.deps.document).getElementById("ui-colony-ward-panel");
      if (!header || !panel || !wardHost) return;
      header.style.display = open ? "block" : "none";
      panel.style.display = open ? "block" : "none";
      wardHost.hidden = !open;
      if (!open) return;
      const c = colonyPanelProgress(owner);
      (0, this.deps.sideEncounterUi).renderPanel(panel, (0, this.deps.sideEncounterUi).colonyPanel(c, (0, this.deps.getZone)("colony_run")));
      (0, this.deps.renderColonyWardView)("ui-colony-ward-panel");
    }
    forfeitColony() {
      if (this.active && this.deps.colonyRun.finish()) (0, this.deps.updateStaticUI)();
    }
    renderGrand(owner) {
      if (!this.active) return;
      let open = (owner.season || 1) >= 9;
      let header = (0, this.deps.document).getElementById("ui-voidrift-header");
      let panel = (0, this.deps.document).getElementById("ui-voidrift-panel");
      if (!header || !panel) return;
      header.style.display = open ? "block" : "none";
      panel.style.display = open ? "block" : "none";
      this.renderGrandAuto(owner, open);
      if (!open) return;
      const v = this.runs.reconcileGrand(owner);
      (0, this.deps.sideEncounterUi).renderPanel(panel, (0, this.deps.sideEncounterUi).grandPanel(v, (0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)("grand_breach_run"))));
    }
    renderGrandAuto(owner, open) {
      let autoBtn = (0, this.deps.document).getElementById("btn-grand-breach-auto-enter");
      if (autoBtn) {
        autoBtn.style.display = open ? "inline-block" : "none";
        autoBtn.innerText = (0, this.deps._t)("대균열 자동입장 {value}", { value: owner.settings && owner.settings.autoEnterGrandBreach ? (0, this.deps._t)("켜짐") : (0, this.deps._t)("꺼짐") });
      }
    }
    async forfeitHive(owner) {
      const b = owner.beehive;
      if (!this.active || !b?.inRun || this.forfeits.has(b)) return;
      const context = { owner, b, queenRewards: b.pendingQueenRewards, season: owner.season, loop: owner.loopCount };
      this.forfeits.add(b);
      try {
        const confirmed = await (0, this.deps.requestGameConfirmation)((0, this.deps._t)("이미 받은 보상은 유지됩니다.\n아직 받지 않은 웨이브/여왕 보상은 사라지며, 입장 열쇠는 반환되지 않습니다."), {
          title: (0, this.deps._t)("벌집 원정을 포기할까요?"),
          tone: "danger",
          confirmLabel: (0, this.deps._t)("포기하고 귀환"),
          cancelLabel: (0, this.deps._t)("계속 탐험")
        });
        if (confirmed && this.forfeitCurrent(context)) {
          this.consume(this.bees.exit(owner, "벌집 원정을 포기하고 탈출했습니다.", "attack-monster"));
        }
      } finally {
        this.forfeits.delete(b);
      }
    }
    forfeitCurrent({ owner, b, queenRewards, season, loop }) {
      return this.active && owner === this.deps.game && owner.beehive === b && b.inRun && b.pendingQueenRewards === queenRewards && owner.season === season && owner.loopCount === loop;
    }
    resolveChoice(owner, key, penalty, revision) {
      if (!this.active || !this.hive.accepts(owner, revision)) return;
      return this.consume(this.bees.resolve(owner, key, penalty));
    }
    consume(flow) {
      if (!this.active) return;
      const owner = this.deps.game;
      const effects = {
        log: (...args) => this.deps.addLog(...args),
        refresh: () => this.deps.updateStaticUI(),
        save: (...args) => this.deps.queueImportantSave(...args),
        close: (...args) => this.hive.close(owner, ...args),
        open: (...args) => this.hive.open(owner, ...args)
      };
      let step = flow.next();
      while (!step.done) {
        const effect = effects[step.value.kind];
        if (!effect) throw new Error("Unknown realm effect: " + step.value.kind);
        const result = effect(...step.value.args);
        if (!this.active || this.deps.game !== owner) {
          flow.return();
          return;
        }
        step = flow.next(result);
      }
      return step.value;
    }
    dispose() {
      this.active = false;
      this.forfeits = /* @__PURE__ */ new WeakSet();
    }
  };

  // modules/realm-content-ui-classic.mjs
  var deps = {
    get game() {
      return window.GameModules.state.game;
    },
    get CHAOS_REALM_ZONE_ID() {
      return CHAOS_REALM_ZONE_ID;
    },
    get CURRENCY_LEGACY_MERGE() {
      return CURRENCY_LEGACY_MERGE;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get _t() {
      return _t;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get addItemToInventory() {
      return addItemToInventory;
    },
    get addLog() {
      return addLog;
    },
    get awardCurrency() {
      return awardCurrency;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get canEnterChaosRealm() {
      return canEnterChaosRealm;
    },
    get contentProgression() {
      return contentProgression;
    },
    get colonyRun() {
      return window.GameModules.colonyRun;
    },
    get countBeehiveWaveAlive() {
      return countBeehiveWaveAlive;
    },
    get createEnemy() {
      return createEnemy;
    },
    get document() {
      return document;
    },
    get ensureChaosRealmState() {
      return ensureChaosRealmState;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get getBeehiveRoomRun() {
      return getBeehiveRoomRun;
    },
    get getChaosRealmAffixes() {
      return getChaosRealmAffixes;
    },
    get getChaosRealmTier() {
      return getChaosRealmTier;
    },
    get getColonyWaveEnemyCount() {
      return getColonyWaveEnemyCount;
    },
    get getContentReturnZoneId() {
      return getContentReturnZoneId;
    },
    get getContentStartBlockReason() {
      return getContentStartBlockReason;
    },
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getRealmEquipmentHiddenTierCap() {
      return getRealmEquipmentHiddenTierCap;
    },
    get getRecordsView() {
      return getRecordsView;
    },
    get getZone() {
      return getZone;
    },
    get isBeehiveRunLockedForMapTravel() {
      return isBeehiveRunLockedForMapTravel;
    },
    get i18n() {
      return i18n;
    },
    get levelProgression() {
      return levelProgression;
    },
    get markLoopSpecialBossKill() {
      return markLoopSpecialBossKill;
    },
    get placeBeehiveRoomWave() {
      return placeBeehiveRoomWave;
    },
    random: () => Math.random(),
    get queueImportantSave() {
      return queueImportantSave;
    },
    get renderColonyWardView() {
      return renderColonyWardView;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get resetBeehiveRunModifiers() {
      return resetBeehiveRunModifiers;
    },
    get sideEncounterUi() {
      return sideEncounterUi;
    },
    get spawnColonyWave() {
      return spawnColonyWave;
    },
    get startEncounterRun() {
      return startEncounterRun;
    },
    get tuneBeehiveWaveEnemy() {
      return tuneBeehiveWaveEnemy;
    },
    get unlockJournalEntry() {
      return unlockJournalEntry;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    }
  };
  var choices = new BeehiveChoices(deps);
  var bees = new BeehiveRun(deps, choices);
  var runs = new RealmRunControls(deps);
  var hive = new BeehiveView(deps, choices);
  var panels = new RealmPanelsView(deps);
  var controls = new RealmContentControls(deps, hive, bees, runs);
  safeExposeGlobals({
    closeBeehiveChoiceOverlay: (dismiss) => hive.close(deps.game, dismiss),
    openBeehiveChoiceOverlay: (reasonText) => hive.open(deps.game, reasonText),
    renderLoop8BeehivePanel: (shouldRenderPanel) => controls.renderHive(deps.game, shouldRenderPanel),
    renderLoop15ColonyPanel: () => controls.renderColony(deps.game),
    startColonyRun: () => controls.consume(runs.startColony(deps.game)),
    forfeitColonyRun: () => controls.forfeitColony(),
    renderLoop9VoidRiftPanel: () => controls.renderGrand(deps.game),
    canPayBeehivePenalty: (penalty) => choices.canPay(deps.game, penalty),
    getBeehiveRewardPool: (branchStep) => choices.rewardPool(deps.game, branchStep),
    startBeehiveRun: () => controls.consume(bees.start(deps.game)),
    resolveBeehiveChoice: (key, displayedPenalty, revision) => controls.resolveChoice(deps.game, key, displayedPenalty, revision),
    exitBeehiveRun: (message, logType) => controls.consume(bees.exit(deps.game, message, logType)),
    onBeehiveWaveCleared: () => controls.consume(bees.cleared(deps.game)),
    forfeitBeehiveRun: () => controls.forfeitHive(deps.game),
    autoEnterGrandBreachIfReady: () => controls.consume(runs.autoEnter(deps.game)),
    enterGrandBreach: (options) => controls.consume(runs.enterGrand(deps.game, options)),
    toggleMeteorAutoEnter: () => controls.consume(runs.toggleMeteor(deps.game)),
    toggleGrandBreachAutoEnter: () => controls.consume(runs.toggleGrand(deps.game)),
    renderChaosRealmMapPanel: () => panels.chaos(),
    renderSkyTowerMapPanel: () => panels.sky(),
    updateCombatOxygenBar: () => panels.oxygen(deps.game)
  });
  window.GameModules.realmContentViews = Object.freeze({ dispose: () => {
    controls.dispose();
    hive.dispose();
    panels.dispose();
  } });
})();
