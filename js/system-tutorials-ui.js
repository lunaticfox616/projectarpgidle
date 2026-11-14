// GENERATED from modules/system-tutorials-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);

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

  // modules/ui/view-frames.mjs
  function scheduleViewFrame(runtime, callback) {
    if (!runtime.active) return;
    const owner = runtime.deps.game;
    const handle = runtime.deps.requestAnimationFrame(() => {
      runtime.frames.delete(handle);
      if (runtime.active && runtime.deps.game === owner) callback();
    });
    runtime.frames.add(handle);
  }
  function cancelViewFrames(runtime) {
    for (const handle of runtime.frames) runtime.deps.cancelAnimationFrame(handle);
    runtime.frames.clear();
  }

  // modules/ui/system-tutorial-steps.mjs
  function supportChoices(runtime) {
    if (!runtime.deps.contentProgression.isUnlocked("support") || !runtime.deps.game.supports.length || runtime.deps.game.woodsmanBuildLock) return [];
    const stats = (0, runtime.deps.getUiPlayerStats)();
    if (runtime.deps.game.equippedSupports.length >= Math.floor(stats.suppCap || 0)) return [];
    const free = (0, runtime.deps.getEffectiveResonanceCap)(stats) - runtime.deps.game.equippedSupports.reduce((cost, name) => cost + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    return runtime.deps.game.supports.filter((name) => !runtime.deps.game.equippedSupports.includes(name) && (0, runtime.deps.getSupportTierResonanceCost)(name) <= free && runtime.deps.gemSelectionUi.targetCount(name) > 0 && !runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game));
  }
  function supportStep(runtime, before) {
    if (!shown(runtime, runtime.state.slotDialog)) {
      return runtime.handlers.step(1, 2, "빛나는 빈 보조스킬룬 칸을 누르세요.", '#tab-skills .support-slot.is-empty[data-board-pick="support"]');
    }
    const buttons = before.choices.map((name) => `${runtime.state.slotDialog} [data-slot-action="choose"][data-name="${runtime.deps.CSS.escape(name)}"]:not(:disabled)`);
    return runtime.handlers.step(2, 2, "적용되는 스킬과 필요한 공명력을 확인한 뒤 ‘장착’을 누르세요.", buttons, `${runtime.state.slotDialog} .gem-slot-list-head`);
  }
  function engraveStep(runtime) {
    if (!shown(runtime, runtime.state.engraveDialog)) {
      return runtime.handlers.step(
        1,
        2,
        "장착한 공격 룬의 빛나는 빈 각인 칸을 누르세요.",
        ["#tab-skills [data-board-engrave].is-open", '#ui-gem-engrave-slots [data-slot-state="open"]:not(:disabled)']
      );
    }
    return runtime.handlers.step(
      2,
      2,
      "효과를 읽고 각인을 고르세요. 창공의 정수 1개가 소모됩니다.",
      `${runtime.state.engraveDialog} [data-action="apply"]:not(:disabled)`,
      `${runtime.state.engraveDialog} header`
    );
  }
  function canUseBud(runtime, item) {
    return item?.rarity === "normal" && !item.hallReplica && !runtime.deps.bagItems.isSpecial(item) && !runtime.deps.craftCurrencyUse.blockReason(item, runtime.deps.equipmentCrafting.resolveAction("magicBud", item.rarity));
  }
  function craftChoices(runtime) {
    return Object.values(runtime.deps.game.equipment).concat(runtime.deps.game.inventory).filter(runtime.handlers.canUseBud);
  }
  function craftTargetStep(runtime) {
    const prefix = shown(runtime, runtime.state.craftPicker) ? runtime.state.craftPicker : "#crafting-workspace";
    const slots = Object.entries(runtime.deps.game.equipment).filter(([, item]) => canUseBud(runtime, item)).map(([slot]) => `${prefix} .slot-box.slot-${runtime.deps.CSS.escape(slot)}`);
    const cards = runtime.deps.game.inventory.filter(runtime.handlers.canUseBud).map((item) => `${runtime.state.craftPicker} ${spareCard(runtime, item)}`);
    const openers = slots.length ? ["#craft-target-equip-open", "#craft-target-inventory-open"] : ["#craft-target-inventory-open"];
    return runtime.handlers.step(
      1,
      2,
      "제작할 일반 장비를 고르세요. 착용 중인 장비와 가방의 장비를 모두 고를 수 있습니다.",
      [...slots, ...cards, ...openers],
      shown(runtime, runtime.state.craftPicker) ? `${runtime.state.craftPicker} .craft-picker-head` : void 0
    );
  }
  function craftStep(runtime) {
    if (!canUseBud(runtime, (0, runtime.deps.getSelectedCraftItem)()) || shown(runtime, runtime.state.craftPicker)) return craftTargetStep(runtime);
    const use = '#crafting-workspace [data-command="craft"][data-craft-resource="magicBud"]:not(:disabled)';
    if (shown(runtime, runtime.state.catalog)) {
      return runtime.handlers.step(
        2,
        2,
        "‘마법의 새싹’을 제작 재화로 고르세요.",
        [`${runtime.state.catalog}:has([data-resource="magicBud"][aria-pressed="true"]) [data-apply]:not(:disabled)`, `${runtime.state.catalog} [data-resource="magicBud"]`],
        `${runtime.state.catalog} > header`
      );
    }
    return runtime.handlers.step(
      2,
      2,
      "‘1회 사용’을 눌러 일반 장비를 마법 장비로 바꾸고 새 옵션을 붙이세요.",
      [use, "#cl-inventory-open"]
    );
  }
  function shopStep(runtime, before) {
    const shop = `${runtime.state.npcDialog} [data-npc-shop="${runtime.deps.CSS.escape(before.npc)}"]`;
    if (!shown(runtime, shop)) {
      return runtime.handlers.step(
        1,
        3,
        "빛나는 ‘상점’을 누르세요. 만났던 상인은 거래의 NPC 목록에서도 찾아갈 수 있습니다.",
        [`${runtime.state.npcDialog} [data-npc-topic="shop"]`, `#market-panel-npc [data-npc-open="${runtime.deps.CSS.escape(before.npc)}"][data-npc-mode="shop"]`]
      );
    }
    const buy = `${shop} [data-npc-buy]:not(:disabled)`;
    if (shown(runtime, buy)) return runtime.handlers.step(3, 3, "가격과 보유 재화를 확인하고 ‘구매’를 누르세요. 구입한 장비는 가방에 들어갑니다.", buy);
    const wares = runtime.deps.npcShop.stock(before.npc)?.offers || [];
    const targets = wares.flatMap((ware, index) => before.offers.includes(ware) ? [`${shop} [data-shop-pick="ware:${index}"]`] : []);
    return runtime.handlers.step(2, 3, "빛나는 물건을 골라 옵션과 가격을 확인하세요.", targets, `${shop} .shop-shelf > .shop-bar`);
  }
  function salvageCandidates(runtime, currency) {
    const rarities = runtime.state.SALVAGE_RARITIES[currency];
    if (!Array.isArray(rarities) || runtime.deps.game.woodsmanBuildLock) return [];
    return runtime.deps.game.inventory.filter((item) => rarities.includes(item?.rarity) && !runtime.deps.bagItems.isSpecial(item) && !item.loopSealed && !item.hallReplica && !(0, runtime.deps.isBulkSalvageProtectedItem)(item));
  }
  function beginSalvage(runtime, notice) {
    const currency = notice.currency || "magicBud";
    return { currency, count: runtime.deps.game.currencies[currency], items: salvageCandidates(runtime, currency), replay: notice.replay };
  }
  function salvageStep(runtime, before) {
    const inspector = "#ui-equipment-inventory-inspector";
    const tools = `${inspector} .eqw-manage-toggle:not([hidden])`;
    const mobile = runtime.deps.uiDisplay.matches("(max-width: 1080px)");
    const total = mobile ? 3 : 2;
    const focused = runtime.deps.equipmentInventoryInteraction.getFocusedKey();
    if (!focused || !salvageCandidates(runtime, before.currency).some((item) => runtime.deps.equipmentInventoryGridRuntime.getItemKey(item) === focused)) {
      if (before.replay) return runtime.handlers.step(1, total, "가방의 빛나는 예시 장비를 고르세요.", spareCard(runtime, before.items[0]));
      const body2 = before.currency === "formlessDew" ? "형체 없는 이슬을 얻으려면 가방에서 해체할 희귀 장비를 고르세요." : "마법의 새싹을 얻으려면 가방에서 해체할 일반 또는 마법 장비를 고르세요.";
      return runtime.handlers.step(1, total, body2, "#item-tab-equip .eqw-bag-head", "#item-tab-equip .eqw-bag-head");
    }
    const salvage = `${inspector} .equipment-card-danger:not(:disabled)`;
    const itemName = `${inspector} .eqw-pick`;
    if (mobile && !shown(runtime, salvage)) return runtime.handlers.step(2, total, "‘장비 관리’를 열어 해체 버튼을 찾으세요.", tools, itemName);
    const body = before.currency === "formlessDew" ? "‘해체’를 누르면 선택한 장비가 사라지고 형체 없는 이슬을 얻습니다." : "‘해체’를 누르면 선택한 장비가 사라지고 마법의 새싹을 얻습니다.";
    return runtime.handlers.step(total, total, body, salvage, itemName);
  }
  function sampleAttackRune(runtime) {
    runtime.deps.game.skills.push("화염 참격");
    runtime.deps.game.activeSkill = "화염 참격";
    runtime.deps.game.gemData["화염 참격"] = (0, runtime.deps.normalizeGemRecord)(null);
  }
  function createStep() {
    return function step(number, total, body, selector, inline) {
      return { number, total, body, selector, inline };
    };
  }
  function shown(runtime, selector) {
    return !!runtime.deps.document.querySelector(selector)?.getClientRects().length;
  }
  function spareCard(runtime, item) {
    return `${runtime.state.bagCard}[data-equipment-grid-key="${runtime.deps.CSS.escape(runtime.deps.equipmentInventoryGridRuntime.getItemKey(item))}"]`;
  }
  function equipped(runtime) {
    return [...runtime.deps.game.equippedSupports];
  }
  function tabShown(runtime, id) {
    return (0, runtime.deps.getRenderingUiTabIds)().has(id);
  }
  function skillBoardShown(runtime) {
    return tabShown(runtime, "tab-skills") && runtime.deps.game.skillSubtab === "skill-tab-equip";
  }
  function craftShown(runtime) {
    return tabShown(runtime, "tab-items") && runtime.deps.game.itemSubtab === "item-tab-craft";
  }
  function engraveRune(runtime) {
    return runtime.deps.game.skillSubtab === "skill-tab-enhance" ? (0, runtime.deps.getGemEnhanceTargetSkill)() : runtime.deps.game.activeSkill;
  }
  function engravings(runtime, name) {
    return (0, runtime.deps.getSkyEnhancementSlotsForSkill)(name).filter(Boolean);
  }
  function canEngrave(runtime) {
    return runtime.deps.contentProgression.isUnlocked("engraving") && !runtime.deps.game.woodsmanBuildLock && runtime.deps.game.currencies.skyEssence > 0 && (0, runtime.deps.isEnhanceableAttackGem)(engraveRune(runtime)) && (0, runtime.deps.getFirstEmptyGemEngraveSlot)(engraveRune(runtime)) >= 0;
  }
  function currentNpc(runtime) {
    return runtime.deps.document.querySelector(runtime.state.npcDialog)?.dataset.npcId;
  }
  function affordableGear(runtime, id) {
    return (runtime.deps.npcShop.stock(id)?.offers || []).filter((offer2, index) => offer2.item && runtime.deps.npcShop.check(id, index, null).ok);
  }
  function shopNpc(runtime) {
    return currentNpc(runtime) || Object.keys(runtime.deps.game.npcMet).find((id) => affordableGear(runtime, id).length);
  }
  function normalHelmet(runtime) {
    return (0, runtime.deps.createItemFromBase)((0, runtime.deps.chooseItemBase)("투구", 1, (0, runtime.deps.getZone)(0)), "normal", 1);
  }

  // modules/ui/system-tutorial-actions.mjs
  function startShopSalvage(runtime, dialog, currency) {
    if (!dialog?.open || !salvageCandidates(runtime, currency).length || runtime.deps.game.isGuideReplay) return;
    const owner = runtime.deps.game, npc = runtime.deps.STORY_NPCS[dialog.dataset.npcId];
    dialog.close();
    runtime.deps.equipmentInventoryInteraction.focus(null);
    runtime.deps.tutorialActionUi.start({ ...runtime.state.guides.tutorial_salvage_gear, currency, onComplete: () => {
      if (!runtime.active || runtime.deps.game !== owner) return;
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("해체 재화를 얻었습니다."), { tone: "success" });
      scheduleViewFrame(runtime, () => {
        if (runtime.deps.game !== owner || !npc) return;
        (0, runtime.deps.openTabPane)("tab-trade");
        runtime.deps.contentUnlockUi.openNpc(npc, "shop");
      });
    } });
  }
  function offer(runtime, key) {
    const lesson = runtime.state.guides[key];
    if (runtime.deps.game.isGuideReplay || runtime.deps.tutorialActionUi.active || runtime.deps.activeTutorial || !lesson.view()) return false;
    if (runtime.deps.game.seenTutorials.includes("action_" + key) || runtime.deps.game.seenTutorials.includes("dismiss_" + key) || !lesson.available()) return false;
    runtime.deps.tutorialActionUi.start(lesson, false);
    return true;
  }
  function visit(runtime, panel) {
    const keys = runtime.state.visits.get(panel);
    if (keys && !runtime.deps.game.isGuideReplay) scheduleViewFrame(runtime, () => keys.some(runtime.handlers.offer));
  }
  function refreshSystemGuide(runtime, event) {
    const action = runtime.deps.tutorialActionUi.active;
    if (!runtime.state.guides[action?.notice.key] || event.type === "keydown" && event.key !== "Escape") return;
    scheduleViewFrame(runtime, () => {
      if (runtime.deps.tutorialActionUi.active === action) runtime.deps.tutorialActionUi.refresh();
    });
  }

  // modules/ui/system-tutorial-view.mjs
  function createSystemTutorialView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    const handlers = { canUseBud, offer, skillBoardShown, supportStep, equipped, canEngrave, engraveStep, craftShown, craftStep, shopStep, salvageStep, beginSalvage, visit, startShopSalvage, refreshSystemGuide };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.handlers.step = createStep();
    runtime.api = SystemTutorialViewApi(runtime);
    installSystemTutorialViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.slotDialog = "#gem-slot-dialog .is-kind-support";
    runtime.state.engraveDialog = "#gem-engrave-slot-overlay";
    runtime.state.craftPicker = "#craft-item-picker-overlay[open]";
    runtime.state.catalog = ".cl-catalog[open]";
    runtime.state.npcDialog = "#npc-dialog[open]";
    runtime.state.bagCard = "#ui-inventory-list .equipment-grid-item";
    runtime.state.SALVAGE_RARITIES = Object.freeze({ magicBud: ["normal", "magic"], formlessDew: ["rare"] });
    runtime.state.lessons = [supportLesson(runtime), engraveLesson(runtime), craftLesson(runtime), shopLesson(runtime), salvageLesson(runtime)];
    runtime.state.guides = Object.fromEntries(runtime.state.lessons.map((lesson) => [lesson.key, lesson]));
    runtime.state.visits = /* @__PURE__ */ new Map([
      ["skill-tab-equip", ["tutorial_support_equip", "tutorial_rune_engrave"]],
      ["skill-tab-enhance", ["tutorial_rune_engrave"]],
      ["item-tab-craft", ["tutorial_craft_gear"]],
      ["npc-shop", ["tutorial_shop_buy"]]
    ]);
  }
  function SystemTutorialViewApi(runtime) {
    const api = {
      lessons: runtime.state.lessons,
      guides: runtime.state.guides,
      visit: runtime.handlers.visit,
      canGuideSalvage: (currency) => salvageCandidates(runtime, currency).length > 0,
      startShopSalvage: runtime.handlers.startShopSalvage
    };
    api.dispose = () => disposeSystemTutorialView(runtime);
    return Object.freeze(api);
  }
  function installSystemTutorialViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.refreshSystemGuide, true);
    listenView(runtime, runtime.deps.document, "keydown", runtime.handlers.refreshSystemGuide, true);
    listenView(runtime, runtime.deps.document, "close", runtime.handlers.refreshSystemGuide, true);
  }
  function disposeSystemTutorialView(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    cancelViewFrames(runtime);
  }
  function supportLesson(runtime) {
    return {
      key: "tutorial_support_equip",
      tabId: "tab-skills",
      unlock: "support",
      title: "보조스킬룬 장착",
      body: "빈 보조 칸을 열고, 적용 대상과 공명 비용을 확인해 룬을 장착합니다.",
      view: runtime.handlers.skillBoardShown,
      available: () => supportChoices(runtime).length > 0,
      step: runtime.handlers.supportStep,
      begin: () => ({ worn: new Set(equipped(runtime)), choices: supportChoices(runtime) }),
      read: runtime.handlers.equipped,
      completed: (current, before) => current.some((name) => !before.worn.has(name)),
      result: () => "보조스킬룬을 장착했습니다.",
      prepare: () => {
        sampleAttackRune(runtime);
        runtime.deps.game.contentProgression.inherited.push("support");
        runtime.deps.gemDropRewards.grant(runtime.deps.game, { kind: "support", name: "가속", tier: 1 });
        return () => runtime.deps.selectionDialog.close("gem-slot-dialog");
      }
    };
  }
  function engraveLesson(runtime) {
    return {
      key: "tutorial_rune_engrave",
      tabId: "tab-skills",
      unlock: "engraving",
      title: "스킬룬 각인",
      body: "공격 룬의 빈 각인 칸에 창공의 정수를 써서 효과를 넣습니다.",
      view: () => tabShown(runtime, "tab-skills") && ["skill-tab-equip", "skill-tab-enhance"].includes(runtime.deps.game.skillSubtab),
      available: runtime.handlers.canEngrave,
      step: runtime.handlers.engraveStep,
      begin: () => ({ rune: engraveRune(runtime), effects: new Set(engravings(runtime, engraveRune(runtime))) }),
      read: () => runtime.deps.game.currencies.skyEssence,
      completed: (_, before) => engravings(runtime, before.rune).some((id) => !before.effects.has(id)),
      result: () => "공격 룬에 각인을 넣었습니다.",
      prepare: () => {
        sampleAttackRune(runtime);
        runtime.deps.game.contentProgression.inherited.push("engraving", "gemForge");
        runtime.deps.game.currencies.skyEssence = 1;
        return runtime.deps.closeGemEngraveSlotOverlay;
      }
    };
  }
  function craftLesson(runtime) {
    return {
      key: "tutorial_craft_gear",
      tabId: "tab-items",
      unlock: "craft",
      title: "첫 장비 제작",
      body: "일반 장비를 골라 마법의 새싹으로 추가 옵션을 붙입니다.",
      view: runtime.handlers.craftShown,
      available: () => runtime.deps.contentProgression.isUnlocked("craft") && !runtime.deps.game.woodsmanBuildLock && runtime.deps.game.currencies.magicBud > 0 && craftChoices(runtime).length > 0,
      open: () => (0, runtime.deps.switchItemSubtab)("item-tab-craft"),
      step: runtime.handlers.craftStep,
      begin: () => ({ items: craftChoices(runtime), buds: runtime.deps.game.currencies.magicBud }),
      read: () => runtime.deps.game.currencies.magicBud,
      completed: (buds, before) => buds < before.buds && before.items.some((item) => item.rarity === "magic"),
      result: () => "장비에 새 옵션을 붙였습니다.",
      prepare: () => {
        const ref = (0, runtime.deps.getCraftSelectionRef)(), worn = (0, runtime.deps.isCraftSelectionEquip)();
        (0, runtime.deps.clearCraftSelection)();
        runtime.deps.game.contentProgression.inherited.push("craft");
        runtime.deps.game.equipment["투구"] = normalHelmet(runtime);
        runtime.deps.game.currencies.magicBud = 1;
        return () => {
          runtime.deps.window.closeCraftItemPickerOverlay();
          runtime.deps.document.querySelector(runtime.state.catalog)?.close();
          (0, runtime.deps.clearCraftSelection)();
          if (ref !== null) (0, runtime.deps.selectForCrafting)(ref, worn);
        };
      }
    };
  }
  function shopLesson(runtime) {
    return {
      key: "tutorial_shop_buy",
      tabId: "tab-trade",
      gate: () => runtime.deps.contentProgression.npcsMet(runtime.deps.game),
      title: "NPC 상점에서 구매",
      body: "상점에서 장비를 골라 옵션과 가격을 확인한 뒤 구매합니다.",
      view: () => shown(runtime, `${runtime.state.npcDialog} :is([data-npc-topic="shop"], [data-npc-shop])`),
      available: () => runtime.deps.contentProgression.canOpen("tab-trade") && !!shopNpc(runtime) && affordableGear(runtime, shopNpc(runtime)).length > 0,
      open: () => runtime.deps.marketUi.show("npc"),
      step: runtime.handlers.shopStep,
      begin: () => ({ npc: shopNpc(runtime), offers: affordableGear(runtime, shopNpc(runtime)) }),
      read: () => runtime.deps.game.inventory,
      completed: (items, before) => before.offers.some((offer2) => items.includes(offer2.item)),
      result: () => "상점에서 장비를 구매했습니다.",
      prepare: () => {
        const previousSection = runtime.deps.marketUi.section;
        runtime.deps.npcShop.meet(runtime.deps.STORY_NPCS.bern, 0);
        runtime.deps.game.currencies.magicBud = 10;
        runtime.deps.game.currencies.formlessDew = 10;
        runtime.deps.marketUi.section = "npc";
        return () => {
          runtime.deps.document.querySelector(runtime.state.npcDialog)?.close();
          runtime.deps.marketUi.section = previousSection;
        };
      }
    };
  }
  function salvageLesson(runtime) {
    return {
      key: "tutorial_salvage_gear",
      tabId: "tab-items",
      title: "장비 해체로 재화 얻기",
      body: "남는 장비를 해체해 상점과 제작에 쓰는 재화를 얻습니다.",
      available: () => Object.keys(runtime.state.SALVAGE_RARITIES).some((currency) => salvageCandidates(runtime, currency).length),
      step: runtime.handlers.salvageStep,
      begin: runtime.handlers.beginSalvage,
      read: (before) => runtime.deps.game.currencies[before.currency],
      completed: (count, before) => count > before.count && before.items.some((item) => !runtime.deps.game.inventory.includes(item)),
      prepare: () => {
        runtime.deps.game.inventory.push(normalHelmet(runtime));
      }
    };
  }

  // modules/system-tutorials-ui-classic.mjs
  var systemTutorialUi = createSystemTutorialView({
    get contentProgression() {
      return contentProgression;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get getEffectiveResonanceCap() {
      return getEffectiveResonanceCap;
    },
    get getSupportTierResonanceCost() {
      return getSupportTierResonanceCost;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get window() {
      return window;
    },
    get CSS() {
      return CSS;
    },
    get bagItems() {
      return bagItems;
    },
    get craftCurrencyUse() {
      return craftCurrencyUse;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get npcShop() {
      return npcShop;
    },
    get isBulkSalvageProtectedItem() {
      return isBulkSalvageProtectedItem;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get STORY_NPCS() {
      return STORY_NPCS;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get showGameToast() {
      return showGameToast;
    },
    get _t() {
      return _t;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get openTabPane() {
      return openTabPane;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get activeTutorial() {
      return activeTutorial;
    },
    get document() {
      return document;
    },
    get getRenderingUiTabIds() {
      return getRenderingUiTabIds;
    },
    get getGemEnhanceTargetSkill() {
      return getGemEnhanceTargetSkill;
    },
    get getSkyEnhancementSlotsForSkill() {
      return getSkyEnhancementSlotsForSkill;
    },
    get isEnhanceableAttackGem() {
      return isEnhanceableAttackGem;
    },
    get getFirstEmptyGemEngraveSlot() {
      return getFirstEmptyGemEngraveSlot;
    },
    get createItemFromBase() {
      return createItemFromBase;
    },
    get chooseItemBase() {
      return chooseItemBase;
    },
    get getZone() {
      return getZone;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get closeGemEngraveSlotOverlay() {
      return closeGemEngraveSlotOverlay;
    },
    get switchItemSubtab() {
      return switchItemSubtab;
    },
    get getCraftSelectionRef() {
      return getCraftSelectionRef;
    },
    get isCraftSelectionEquip() {
      return isCraftSelectionEquip;
    },
    get clearCraftSelection() {
      return clearCraftSelection;
    },
    get selectForCrafting() {
      return selectForCrafting;
    },
    get marketUi() {
      return marketUi;
    }
  });
  safeExposeGlobals({ systemTutorialUi });
})();
