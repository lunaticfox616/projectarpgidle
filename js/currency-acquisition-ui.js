// GENERATED from modules/currency-acquisition-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/combat-currency-hud.mjs
  function updateCombatCurrencyHud(runtime) {
    const root = runtime.deps.document.getElementById("ui-combat-currencies");
    if (!root) return;
    runtime.state.keys = runtime.state.keys || Object.keys(runtime.deps.ORB_DB).filter((key) => runtime.deps.craftingWorkspaceState.group(key) === "basic" && runtime.deps.ORB_DB[key].icon);
    const held = runtime.state.keys.map((key) => [key, Math.floor(Number(runtime.deps.game.currencies[key]) || 0)]).filter(([, count]) => count > 0);
    const sign = `${runtime.deps.i18n.locale}:${held.join("|")}`;
    if (root === runtime.state.root && sign === runtime.state.drawn) return;
    runtime.state.root = root;
    runtime.state.drawn = sign;
    root.hidden = !held.length;
    root.innerHTML = held.map(([key, count]) => {
      const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.deps.ORB_DB[key].name));
      return `<span data-tip="${name}" aria-label="${(0, runtime.deps._t)("{name} {count}개", { name, count })}"><img src="${runtime.deps.ORB_DB[key].icon}" alt="">${count.toLocaleString(runtime.deps.i18n.locale)}</span>`;
    }).join("");
  }

  // modules/ui/loot-currency-notices.mjs
  function noticeCurrency(runtime, currencyKey, gain) {
    if (!(gain > 0)) return;
    const chase = runtime.deps.lootMoments.ofCurrency(currencyKey) === "jackpot";
    if (currencyKey !== "goldenRule" && !chase) return;
    const name = (0, runtime.deps._t)(runtime.deps.ORB_DB[currencyKey].name);
    if (runtime.deps.game.settings.lootFx?.notices?.[chase ? "chase" : "goldenRule"] === false) return;
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)("{name} 획득했습니다.", { name: (0, runtime.deps.withObjectParticle)(name) }), { tone: chase ? "chase" : "reward", duration: chase ? 6e3 : 3600 });
  }
  function noticeFirstUse(runtime, currencyKey, gain) {
    const row = runtime.state.FIRST_USE[runtime.deps.CRAFT_OMENS.keys.includes(currencyKey) ? "roots" : currencyKey];
    if (gain > 0 && row) (0, runtime.deps.queueTutorialNotice)(row[0], row[1], row[2], "tab-items", "item-tab-craft");
  }
  function announce(runtime, event) {
    const { currencyKey, gain, unlocked } = event.detail;
    noticeCurrency(runtime, currencyKey, gain);
    noticeFirstUse(runtime, currencyKey, gain);
    if (currencyKey === "goldenRule" && gain > 0) {
      (0, runtime.deps.addLog)((0, runtime.deps._t)("✨✨ <strong>{name} +{gain}</strong> 획득!", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB.goldenRule.name), gain }), "loot-unique");
    }
    if (["chaosKey", "coreKey"].includes(currencyKey) && gain > 0) {
      const name = (0, runtime.deps._t)(runtime.deps.ORB_DB[currencyKey].name);
      (0, runtime.deps.addLog)((0, runtime.deps._t)("🗝️ <strong>{name} +{gain}</strong> 획득! 5차 미궁 시련(재능 개화)을 지도에서 확인하세요.", { name, gain }), "loot-unique");
    }
    if (currencyKey === "ouroboros" && gain > 0) {
      (0, runtime.deps.addLog)((0, runtime.deps._t)("🌿✨ <strong>{name} +{gain}</strong> 획득! 장비를 봉인해 루프가 지나도 지킬 수 있습니다.", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB.ouroboros.name), gain }), "loot-unique");
    }
    if (unlocked.gem) (0, runtime.deps.addLog)((0, runtime.deps._t)("☁️ 스킬룬 탭의 각인이 열렸습니다!"), "loot-unique");
  }

  // modules/ui/loot-rune-notices.mjs
  function noticeRuneUpgrade(runtime, name) {
    if (runtime.deps.game.activeSkill === name || (0, runtime.deps.isMobilityRuneName)(name) || !(runtime.deps.game.skills || []).includes(name) || !(0, runtime.deps.canUseSkillWithCurrentEquipment)(name)) return;
    const { dps: [before, after] } = (0, runtime.deps.previewBuildStats)((copy) => {
      copy.activeSkill = name;
    });
    const format = runtime.deps.COMPARE_STAT_META.dps.format;
    if (before > 0 && after >= before * runtime.state.RUNE_UPGRADE_NOTICE_GAIN) (0, runtime.deps.showGameToast)((0, runtime.deps._t)("더 강한 공격 룬을 얻었습니다. 「{name}」 DPS {before} → {after}", { name, before: format(before), after: format(after) }), { tone: "reward", duration: 4200 });
  }
  function queueRuneUpgradeNotice(runtime, { gem, kind }) {
    if (!gem || kind !== "attack" || runtime.deps.game.isBackgroundCalculation || (runtime.deps.SKILL_DB[gem.name]?.tags || []).includes("summon")) return;
    const owner = runtime.deps.game, name = gem.name;
    const timer = runtime.deps.setTimeout(() => {
      runtime.timers.delete(timer);
      if (runtime.active && runtime.deps.game === owner && !owner.isBackgroundCalculation) noticeRuneUpgrade(runtime, name);
    }, 0);
    runtime.timers.add(timer);
  }
  function announceGemReward(runtime, reward) {
    queueRuneUpgradeNotice(runtime, reward);
    if (!runtime.deps.game.settings.showLootLog) return;
    const { gem, kind } = reward;
    if (!gem) return;
    if (kind === "attack") (0, runtime.deps.addLog)((0, runtime.deps._t)("✨ 공격 룬 <span class='loot-magic'>[{name}]</span> 획득!{awakened}", { name: (0, runtime.deps._t)(gem.name), awakened: gem.awakened ? ` ${(0, runtime.deps._t)("(각성 후보)")}` : "" }));
    else (0, runtime.deps.addLog)((0, runtime.deps._t)("🟢 보조스킬룬 <span class='loot-rare'>[{name}]</span> 획득! (해금: {supportTierLabel})", { name: (0, runtime.deps._t)(gem.name), supportTierLabel: (0, runtime.deps.getSupportTierLabel)(gem.name, gem.tier) }));
  }

  // modules/ui/loot-item-notices.mjs
  function announceJewelReward(runtime, receipt) {
    if (!runtime.deps.game.settings.showLootLog) return;
    const { jewel, inventoryFull, protectOverflow, stored, shardGain } = receipt;
    if (!stored) {
      if (!runtime.deps.game.isBackgroundCalculation) (0, runtime.deps.addLog)((0, runtime.deps._t)("💠 {how}: [{name}], 주얼 결정 +{gain}", { how: (0, runtime.deps._t)(inventoryFull ? "가방이 가득 차 해체" : "주얼 자동해체"), name: (0, runtime.deps._t)(jewel.name), gain: shardGain }), inventoryFull ? "attack-monster" : "loot-normal");
      return;
    }
    const lines = (0, runtime.deps.getJewelStats)(jewel).map((stat) => `${(0, runtime.deps.isJewelPetiteStat)(stat) ? (0, runtime.deps._t)("쁘띠 ") : ""}${(0, runtime.deps.getStatName)(stat.id)} +${(0, runtime.deps.formatJewelStatValue)(stat.id, stat.val)}${Number.isFinite(Number(stat.tier)) && !(0, runtime.deps.isJewelPetiteStat)(stat) ? ` T${Math.floor(stat.tier)}` : ""}`).join(" / ");
    (0, runtime.deps.addLog)((0, runtime.deps._t)("💠 {rarity} 주얼 [{name}] 획득!{protect} ({lines})", { rarity: (0, runtime.deps._t)((0, runtime.deps.getJewelRarityLabel)(jewel.rarity)), name: (0, runtime.deps._t)(jewel.name), protect: protectOverflow ? ` <span style="color:#ffb86b;">${(0, runtime.deps._t)("(공간 부족 보호)")}</span>` : "", lines: lines || (0, runtime.deps._t)("미가공") }), protectOverflow ? "loot-unique" : "loot-rare", { item: jewel, itemKind: "jewel" });
  }
  function announceCore(runtime, core) {
    if (core.perfect && !runtime.deps.game.isBackgroundCalculation) (0, runtime.deps.dispatchRuntimeEvent)("incident", { text: (0, runtime.deps._t)("체이싱 코어를 획득했습니다. 「{name}」", { name: core.name }), tone: "chase", chase: true });
    if (runtime.deps.game.settings.showLootLog && !runtime.deps.game.isBackgroundCalculation) (0, runtime.deps.addLog)((0, runtime.deps._t)("🧊 코어 [{name}] 획득! ({map})", { name: (0, runtime.deps._t)(core.name), map: core.lines.map(runtime.deps.coreItems.describe).join(", ") }), "loot-unique", { item: core, itemKind: "core" });
  }
  function announceDropVariant(runtime, { kind, items }) {
    const item = items[0], name = `<span class='loot-${item.rarity}'>[${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemDisplayName)(item))}]</span>`;
    const text = kind === "corrupted" ? (0, runtime.deps._t)("🩸 타락한 장비 {name}: 제작할 수 없지만 추가 옵션이 더 강합니다.", { name }) : kind === "duplicate" ? (0, runtime.deps._t)("✨ 복제된 장비 {name}: 똑같은 장비가 하나 더 떨어졌습니다.", { name }) : (0, runtime.deps._t)("📦 장비 묶음: {baseName} {length}개가 함께 떨어졌습니다.", { baseName: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName) || item.name), length: items.length });
    (0, runtime.deps.addLog)(text, "loot-unique", { item });
  }

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

  // modules/ui/combat-receipt-view.mjs
  function createCombatReceiptView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, owner: deps.game, timers: /* @__PURE__ */ new Set(), listeners: [] };
    const handlers = { announce };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ update: () => {
      if (!runtime.active) return;
      syncReceiptOwner(runtime);
      updateCombatCurrencyHud(runtime);
    }, dispose: () => disposeCombatReceipts(runtime) });
    listenReceipt(runtime, "project-idle:currency-acquired", runtime.handlers.announce);
    listenReceipt(runtime, "project-idle:room-invader", (event) => {
      const [line, tone] = runtime.state.ROOM_INVADER_LINES[event.detail.kind];
      (0, runtime.deps.addLog)(line(event.detail.name), tone);
    });
    listenReceipt(runtime, "project-idle:gem-loot-received", (event) => {
      if (event.detail?.deferred) (0, runtime.deps.checkUnlocks)();
      const name = event.detail?.gem?.name;
      if (name && runtime.deps.SKILL_DB[name]?.chase && !runtime.deps.game.isBackgroundCalculation) (0, runtime.deps.dispatchRuntimeEvent)("incident", { text: (0, runtime.deps._t)("체이싱 룬을 획득했습니다. 「{name}」", { name: (0, runtime.deps._t)(name) }), tone: "chase", chase: true });
      announceGemReward(runtime, event.detail);
    });
    listenReceipt(runtime, "project-idle:jewel-drop-received", (event) => announceJewelReward(runtime, event.detail));
    listenReceipt(runtime, "project-idle:core-item-received", (event) => announceCore(runtime, event.detail));
    listenReceipt(runtime, "project-idle:equipment-drop-variant", (event) => announceDropVariant(runtime, event.detail));
    listenReceipt(runtime, "project-idle:exploration-departed", (event) => {
      if (event.detail.background) return;
      (0, runtime.deps.updateStaticUI)();
      (0, runtime.deps.queueImportantSave)(220);
    });
    return runtime.api;
  }
  function listenReceipt(runtime, type, handler) {
    listenView(runtime, runtime.deps.window, type, (event) => {
      if (!runtime.active) return;
      syncReceiptOwner(runtime);
      handler(event);
    });
  }
  function syncReceiptOwner(runtime) {
    if (runtime.owner === runtime.deps.game) return;
    for (const timer of runtime.timers) runtime.deps.clearTimeout(timer);
    runtime.timers.clear();
    runtime.state.drawn = "";
    runtime.state.root = null;
    runtime.owner = runtime.deps.game;
  }
  function disposeCombatReceipts(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    for (const timer of runtime.timers) runtime.deps.clearTimeout(timer);
    runtime.timers.clear();
    runtime.state.root = null;
  }
  function initialize(runtime) {
    runtime.state.keys = null;
    runtime.state.drawn = "";
    runtime.state.FIRST_USE = {
      roots: ["craft_roots", "제작 뿌리", "제작 뿌리를 얻었습니다.\n‘장비 → 제작실’의 ‘뿌리 함께 사용’에서 걸어 두면 그 뿌리가 바꾸는 다음 제작 한 번에 쓰입니다."],
      memoryImprint: ["memory_chisel", "기억 조각칼", "기억 조각칼을 얻었습니다.\n‘장비 → 제작실’에서 장비의 지금 추가 옵션을 새겨 두면, 뒤에 제작이 마음에 들지 않을 때 그 옵션으로 한 번 되돌릴 수 있습니다."]
    };
    runtime.state.RUNE_UPGRADE_NOTICE_GAIN = 1.1;
    runtime.state.ROOM_INVADER_LINES = Object.freeze({ arrived: [(name) => `🩸 ${name}${(0, runtime.deps.pickParticle)(name, "이", "가")} 들이닥쳤습니다!`, "attack-monster"], twin: [() => "🩸 보스가 둘입니다!", "attack-monster"], slain: [(name) => `🩸 ${name}${(0, runtime.deps.pickParticle)(name, "을", "를")} 쓰러뜨렸습니다!`, "loot-unique"] });
  }

  // modules/currency-acquisition-ui-classic.mjs
  var combatCurrencyHud = createCombatReceiptView({
    get document() {
      return document;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get craftingWorkspaceState() {
      return craftingWorkspaceState;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get i18n() {
      return i18n;
    },
    get lootMoments() {
      return lootMoments;
    },
    get showGameToast() {
      return showGameToast;
    },
    get withObjectParticle() {
      return withObjectParticle;
    },
    get CRAFT_OMENS() {
      return CRAFT_OMENS;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get addLog() {
      return addLog;
    },
    get isMobilityRuneName() {
      return isMobilityRuneName;
    },
    get canUseSkillWithCurrentEquipment() {
      return canUseSkillWithCurrentEquipment;
    },
    get previewBuildStats() {
      return previewBuildStats;
    },
    get COMPARE_STAT_META() {
      return COMPARE_STAT_META;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get getSupportTierLabel() {
      return getSupportTierLabel;
    },
    get getJewelStats() {
      return getJewelStats;
    },
    get getJewelRarityLabel() {
      return getJewelRarityLabel;
    },
    get isJewelPetiteStat() {
      return isJewelPetiteStat;
    },
    get getStatName() {
      return getStatName;
    },
    get formatJewelStatValue() {
      return formatJewelStatValue;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get coreItems() {
      return coreItems;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get pickParticle() {
      return pickParticle;
    },
    get window() {
      return window;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    }
  });
  safeExposeGlobals({ combatCurrencyHud });
})();
