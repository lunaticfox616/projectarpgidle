// GENERATED from modules/player-guide-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowQueueMicrotask = (...args) => globalThis.queueMicrotask(...args);
  var windowStructuredClone = (...args) => globalThis.structuredClone(...args);

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

  // modules/ui/player-guide-examples.mjs
  function lessonHtml(runtime, lesson) {
    return `<li><div><strong>${esc(runtime, lesson.title)}</strong><p>${esc(runtime, lesson.body)}</p></div>
            <button type="button" data-guide-lesson="${lesson.key}">${(0, runtime.deps._t)("가이드 다시보기")}</button></li>`;
  }
  function render(runtime) {
    const host = runtime.deps.document.getElementById("ui-player-guide");
    if (!host) return;
    const available = runtime.state.lessons.filter(runtime.handlers.lessonAvailable).map(runtime.handlers.lessonHtml).join("");
    const definitions = runtime.state.terms.filter((term) => term.unlock ? runtime.deps.contentProgression.isUnlocked(term.unlock) : runtime.deps.contentProgression.canOpen(term.tab));
    const glossary = definitions.map((term) => `<div><dt>${esc(runtime, term.name)}</dt><dd>${esc(runtime, term.body)}</dd></div>`).join("");
    (0, runtime.deps.writeHtmlIfChanged)(host, `<section class="player-guide"><h3>${(0, runtime.deps._t)("가이드 다시보기")}</h3><ul>${available}</ul>
            ${glossary ? `<h3>${(0, runtime.deps._t)("용어")}</h3><dl>${glossary}</dl>` : ""}</section>`);
  }
  function lessonAvailable(runtime, lesson) {
    return runtime.deps.contentProgression.canOpen(lesson.tabId) && (!lesson.unlock || runtime.deps.contentProgression.isUnlocked(lesson.unlock)) && (!lesson.gate || lesson.gate());
  }
  function prepareExample(runtime, key) {
    runtime.deps.game.level = 12;
    runtime.deps.game.season = 2;
    runtime.deps.game.loopCount = 1;
    runtime.deps.game.selectedClassId = "warrior";
    runtime.deps.game.heroSelectionInitialized = true;
    runtime.deps.game.combatHalted = true;
    runtime.deps.game.settings.autoEquipEmptySlots = false;
    runtime.deps.game.settings.showMobileBattlePip = false;
    runtime.deps.game.seenTutorials.push("opening_done");
    runtime.deps.game.equipment["무기"] = (0, runtime.deps.createClassStarterWeapon)("warrior");
    const system = runtime.deps.systemTutorialUi.guides[key];
    if (system) {
      runtime.state.replay.restoreSystem = system.prepare();
      return;
    }
    const examples = {
      unlock_items: () => {
        const makeHelmet = (rarity) => (0, runtime.deps.generateEquipmentDrop)({}, { zone: (0, runtime.deps.getZone)(0), slot: "투구", minimumRarity: rarity });
        runtime.deps.game.equipment["투구"] = makeHelmet("normal");
        runtime.deps.game.inventory.push(makeHelmet("rare"));
      },
      unlock_skills: () => runtime.deps.game.skills.push("화염 참격", "관통 사격"),
      unlock_char: () => {
        runtime.deps.game.contentProgression.inherited.push("passiveTree");
        runtime.deps.game.passivePoints = 1;
      },
      unlock_stump_box: () => {
        runtime.deps.game.contentProgression.inherited.push("stump");
        runtime.deps.game.stumpBox.acquired = true;
        runtime.deps.stumpBox.createItem(runtime.deps.game, { family: "seed", color: "fire", roll: 1 });
      }
    };
    examples[key]();
  }
  function esc(runtime, text) {
    return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(text));
  }

  // modules/ui/player-guide-replay.mjs
  function showReturnButton(runtime, lesson) {
    const bar = runtime.deps.document.createElement("aside");
    bar.className = "guide-replay-bar";
    bar.setAttribute("aria-label", (0, runtime.deps._t)("가이드 다시보기"));
    bar.innerHTML = `<span>${esc(runtime, lesson.title)}</span><button type="button">${(0, runtime.deps._t)("가이드로 돌아가기")}</button>`;
    listenView(runtime, bar, "click", (event) => {
      if (event.target.closest("button")) dismissReplay(runtime);
    });
    runtime.deps.document.body.append(bar);
    return bar;
  }
  function openReplay(runtime, lesson) {
    if (!runtime.active) return;
    if (runtime.state.replay && runtime.deps.game !== runtime.state.replay.example) dismissReplay(runtime, false);
    if (runtime.state.replay) return;
    (0, runtime.deps.yieldTutorialCardToResult)();
    runtime.deps.tutorialActionUi.finish(false, true);
    const example = (0, runtime.deps.cloneDefaultGame)();
    example.settings = { ...(0, runtime.deps.structuredClone)(runtime.deps.game.settings), inventoryViewRarities: example.settings.inventoryViewRarities };
    Object.defineProperty(example, "isGuideReplay", { value: true });
    const inert = [...runtime.deps.document.querySelectorAll("#left-pane, #left-pane-floating-toggle, #left-pane-expand-fab, #tab-header-main, #tab-header-bottom, #tab-category-bar")].filter((element) => !element.inert);
    runtime.state.replay = { live: runtime.deps.game, example, counter: runtime.deps.window.GameModules.state.session.itemIdCounter, lesson, inert, bar: null };
    runtime.deps.game = example;
    try {
      startExample(runtime, lesson);
    } catch (error) {
      dismissReplay(runtime);
      runtime.deps.console.error("Guide replay could not start:", error);
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("가이드를 불러오지 못했습니다."), { tone: "warning" });
    }
  }
  function startExample(runtime, lesson) {
    prepareExample(runtime, lesson.key);
    runtime.state.replay.restoreWindows = (0, runtime.deps.beginGuideWindowLayout)(runtime.state.replay.live);
    if (lesson.tabId === "tab-stump") runtime.state.replay.restoreStumpView = runtime.deps.stumpBoxUi.beginStumpGuideView(runtime.state.replay.live);
    runtime.deps.contentProgression.sync();
    runtime.deps.playerStatCache.invalidate();
    if (lesson.tabId === "tab-char") (0, runtime.deps.calculateReachableNodes)();
    if (!runtime.deps.tutorialActionUi.guideFor(lesson.key)) throw new Error("Guide example cannot start");
    runtime.state.replay.bar = showReturnButton(runtime, lesson);
    runtime.deps.document.body.classList.add("guide-replay-active");
    runtime.state.replay.inert.forEach((element) => {
      element.inert = true;
    });
    runtime.deps.document.addEventListener("scroll", runtime.handlers.repositionReplayCoach, true);
    const session = runtime.state.replay;
    session.notice = { ...lesson, replay: true, onComplete: () => completeReplay(runtime, session) };
    runtime.deps.tutorialActionUi.start(session.notice);
    (0, runtime.deps.updateStaticUI)();
  }
  function completeReplay(runtime, session) {
    (0, runtime.deps.queueMicrotask)(() => {
      if (!runtime.active || runtime.state.replay !== session || runtime.deps.game !== session.example) return;
      dismissReplay(runtime);
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("가이드 완료"), { tone: "success" });
    });
  }
  function clearExampleControls(runtime, tabId) {
    runtime.deps.document.querySelector("#game-dialog-overlay[open] #game-dialog-cancel")?.click();
    if (tabId === "tab-items") {
      runtime.deps.equipmentInventoryInteraction.cancelCarry();
      runtime.deps.equipmentInventoryInteraction.focus(null);
    }
    if (tabId === "tab-skills") runtime.deps.gemSelectionUi.close();
    if (tabId === "tab-char") runtime.deps.passiveSelectionUi.hide();
  }
  function repositionReplayCoach(runtime) {
    if (runtime.state.replay && runtime.deps.game !== runtime.state.replay.example) {
      dismissReplay(runtime, false);
      return;
    }
    runtime.deps.tutorialActionUi.reposition();
  }
  function dismissReplay(runtime, restoreView = true) {
    if (!runtime.state.replay) return;
    const session = runtime.state.replay;
    const ownsExample = runtime.deps.game === session.example;
    let restored = false;
    try {
      if (runtime.deps.tutorialActionUi.active?.notice === session.notice) runtime.deps.tutorialActionUi.finish(false, true);
      if (ownsExample) {
        clearExampleControls(runtime, session.lesson.tabId);
      }
    } finally {
      restored = restoreReplay(runtime, session);
    }
    if (restored && restoreView) {
      (0, runtime.deps.openTabPane)("tab-guide");
      (0, runtime.deps.updateStaticUI)();
    }
  }
  function restoreReplay(runtime, session) {
    const ownsExample = runtime.deps.game === session.example;
    if (ownsExample) {
      runtime.deps.game = session.live;
      runtime.deps.window.GameModules.state.session.itemIdCounter = session.counter;
    }
    runtime.state.replay = null;
    runtime.deps.document.removeEventListener("scroll", runtime.handlers.repositionReplayCoach, true);
    if (session.bar) {
      releaseViewTarget(runtime, session.bar);
      session.bar.remove();
    }
    runtime.deps.document.body.classList.remove("guide-replay-active");
    session.inert.forEach((element) => {
      element.inert = false;
    });
    if (!ownsExample) return false;
    session.restoreStumpView?.();
    session.restoreWindows?.();
    session.restoreSystem?.();
    runtime.deps.playerStatCache.invalidate();
    if (session.lesson.tabId === "tab-char") (0, runtime.deps.calculateReachableNodes)();
    return true;
  }
  function readReplayLiveGame(runtime) {
    const replay = runtime.state.replay;
    return replay && runtime.deps.game === replay.example ? replay.live : runtime.deps.game;
  }
  function allowsTab(runtime, tabId, includeLauncher = false) {
    const replay = runtime.state.replay;
    const target = replay && runtime.deps.game === replay.example ? replay.lesson.tabId : null;
    return !target || tabId === target || includeLauncher && tabId === (0, runtime.deps.getMergedTabGroup)(target)?.[1].launcher;
  }

  // modules/ui/player-guide-view.mjs
  function createPlayerGuideView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    const handlers = { lessonAvailable, lessonHtml, repositionReplayCoach, render, dismissReplay, allowsTab };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = PlayerGuideViewApi(runtime);
    installPlayerGuideViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.lessons = [
      {
        key: "unlock_items",
        tabId: "tab-items",
        title: "장비 비교와 교체",
        body: "장비 창에서 가방의 장비를 눌러 착용 중인 장비와 비교하세요. 바꾸려면 장착을 누르세요."
      },
      {
        key: "unlock_skills",
        tabId: "tab-skills",
        title: "스킬룬 장착",
        body: "스킬룬에서 현재 무기로 쓸 수 있는 룬을 고르고 장착하세요."
      },
      {
        key: "unlock_char",
        tabId: "tab-char",
        title: "스킬트리 투자",
        body: "스킬트리에서 연결된 노드를 고르고 포인트를 쓰세요."
      },
      {
        key: "unlock_stump_box",
        tabId: "tab-stump",
        title: "그루터기 함에 심기",
        body: "보관함의 씨앗을 고른 뒤 빈 칸에 놓으세요. 심은 씨앗은 적을 처치할 때 자랍니다."
      },
      ...runtime.deps.systemTutorialUi.lessons
    ];
    runtime.state.terms = [
      { name: "루프", tab: "tab-season", body: "현재 루프 목표를 달성한 뒤 액트 1부터 다시 시작하는 진행 단위입니다. 영구 해금과 영구 강화는 이어집니다." },
      { name: "해금 포인트", tab: "tab-unlocks", body: "루프를 넘어갈 때 얻습니다. 루프 메뉴의 해금에서 새 기능을 여는 데 씁니다." },
      { name: "지하석", unlock: "underworld", body: "지하계에서 얻는 장착용 돌입니다. 지하계의 지하석 탭에서 끼우거나 강화할 수 있습니다." },
      { name: "창공의 정수", unlock: "cosmos", body: "창공의 정수는 우주계 탐사, 은하 보스에서 얻고 룬 강화와 룬 각인에 씁니다." },
      { name: "응축된 창공의 정수", unlock: "sky", body: "창공의 탑에서 얻는 재화입니다. 창공석과 공격 룬을 영구 강화하는 데 씁니다." },
      { name: "지도석", tab: "map-explore-worldtree", body: "세계수 아틀라스에서 한 지도를 여는 데 쓰는 입장 재료입니다." }
    ];
    runtime.state.replay = null;
  }
  function PlayerGuideViewApi(runtime) {
    const api = {
      render: runtime.handlers.render,
      dismissReplay: runtime.handlers.dismissReplay,
      allowsTab: runtime.handlers.allowsTab,
      liveGame: () => readReplayLiveGame(runtime)
    };
    api.dispose = () => disposePlayerGuideView(runtime);
    return Object.freeze(api);
  }
  function installPlayerGuideViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const key = event.target.closest("#ui-player-guide [data-guide-lesson]")?.dataset.guideLesson;
      const lesson = runtime.state.lessons.find((row) => row.key === key);
      if (lesson && lessonAvailable(runtime, lesson)) openReplay(runtime, lesson);
    });
  }
  function disposePlayerGuideView(runtime) {
    if (!runtime.active) return;
    try {
      dismissReplay(runtime, false);
    } finally {
      releaseViewEvents(runtime);
    }
  }

  // modules/player-guide-ui-classic.mjs
  var playerGuideUi = createPlayerGuideView({
    get _t() {
      return _t;
    },
    get document() {
      return document;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get contentProgression() {
      return contentProgression;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get createClassStarterWeapon() {
      return createClassStarterWeapon;
    },
    get systemTutorialUi() {
      return systemTutorialUi;
    },
    get generateEquipmentDrop() {
      return generateEquipmentDrop;
    },
    get getZone() {
      return getZone;
    },
    get stumpBox() {
      return stumpBox;
    },
    get yieldTutorialCardToResult() {
      return yieldTutorialCardToResult;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get cloneDefaultGame() {
      return cloneDefaultGame;
    },
    get structuredClone() {
      return windowStructuredClone;
    },
    get window() {
      return window;
    },
    get console() {
      return console;
    },
    get showGameToast() {
      return showGameToast;
    },
    get beginGuideWindowLayout() {
      return beginGuideWindowLayout;
    },
    get stumpBoxUi() {
      return stumpBoxUi;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get calculateReachableNodes() {
      return calculateReachableNodes;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueMicrotask() {
      return windowQueueMicrotask;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get passiveSelectionUi() {
      return passiveSelectionUi;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get openTabPane() {
      return openTabPane;
    },
    get getMergedTabGroup() {
      return getMergedTabGroup;
    },
    get escapeHTML() {
      return escapeHTML;
    }
  });
  safeExposeGlobals({ playerGuideUi });
})();
