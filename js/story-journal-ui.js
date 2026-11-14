// GENERATED from modules/story-journal-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/story-scenes.mjs
  function createStoryScenes(defs) {
    return Object.freeze({
      sync: (owner) => storyScenesToQueue(defs, owner),
      foldPassed: (owner, queue) => storyFoldPassedScenes(defs, owner, queue),
      setAutoShow(owner, enabled) {
        owner.settings.showActJournal = enabled === true;
      }
    });
  }
  function storySceneAvailable(defs, owner, scene) {
    if (scene.id === "prologue") return true;
    if (owner.journalEntries.includes(scene.journal)) return true;
    if (scene.phase === "end") return false;
    return Number.isInteger(owner.currentZoneId) && owner.currentZoneId < defs.acts.length && owner.currentZoneId >= scene.act - 1;
  }
  function storySceneAllowsNotice(owner, key) {
    return !key.startsWith("story_act_") || owner.settings.showActJournal !== false;
  }
  function markIllustratedScenes(defs, owner) {
    const marker = "story_illustrations_v1";
    if (owner.seenTutorials.includes(marker)) return;
    const fresh = owner.season === 1 && owner.level === 1 && !owner.seenTutorials.includes("tutorial_battle_basics");
    owner.seenTutorials.push(marker);
    if (!fresh) for (const scene of defs.scenes.filter((scene2) => storySceneAvailable(defs, owner, scene2))) owner.seenTutorials.push("story_" + scene.id);
  }
  function markPassedBridges(defs, owner) {
    const marker = "story_bridges_v2";
    if (typeof defs.bridges !== "object" || owner.seenTutorials.includes(marker)) return;
    owner.seenTutorials.push(marker);
    const reached = Math.max(Number(owner.maxZoneId) || 0, Number.isInteger(owner.currentZoneId) ? owner.currentZoneId : 0);
    for (const scene of defs.bridges) {
      const key = "story_" + scene.id;
      if ((reached > scene.act - 1 || (owner.season || 1) > 1) && !owner.seenTutorials.includes(key)) owner.seenTutorials.push(key);
    }
  }
  function* storyScenesToQueue(defs, owner) {
    if (owner.isBackgroundCalculation) return;
    markIllustratedScenes(defs, owner);
    markPassedBridges(defs, owner);
    for (const scene of defs.scenes.filter((scene2) => storySceneAvailable(defs, owner, scene2))) {
      const key = "story_" + scene.id;
      if (storySceneAllowsNotice(owner, key)) yield scene;
      else if (!owner.seenTutorials.includes(key)) owner.seenTutorials.push(key);
    }
  }
  function storyFoldPassedScenes(defs, owner, queue) {
    const queued = new Set(queue.map((notice) => notice.key));
    const pending = defs.scenes.filter((scene) => scene.id !== "prologue" && (queued.has("story_" + scene.id) || storySceneAvailable(defs, owner, scene) && !owner.seenTutorials.includes("story_" + scene.id)));
    const passed = pending.slice(0, -1), keys = new Set(passed.map((scene) => "story_" + scene.id));
    keys.forEach((key) => {
      if (!owner.seenTutorials.includes(key)) owner.seenTutorials.push(key);
    });
    for (let i = queue.length - 1; i >= 0; i--) if (keys.has(queue[i].key)) queue.splice(i, 1);
    return passed;
  }

  // modules/ui/story-journal-markup.mjs
  function sceneCopy({ deps }, scene) {
    const quote = typeof deps.STORY_SCENE_QUOTES === "object" && scene.id ? deps.STORY_SCENE_QUOTES[scene.id] : null;
    const narration = scene.lines.map((line) => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join("");
    if (!quote) return narration;
    const spoken = `<blockquote class="story-scene-quote">${quote.lines.map((line) => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join("")}</blockquote>`;
    return quote.before ? spoken + narration : narration + spoken;
  }
  function entryCopy({ deps }, entry) {
    const intro = entry.intro ? `<p>${deps.escapeHTML(deps._t(entry.intro))}</p>` : "";
    const source = entry.source ? `<p class="story-scene-source">${deps.escapeHTML(deps._t(entry.source))}</p>` : "";
    return `${intro}<blockquote class="story-scene-quote">${(entry.lines || []).map((line) => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join("")}${source}</blockquote>`;
  }
  function sceneHeading({ deps }, scene) {
    const kicker = scene.act ? deps._t("액트 {act}", { act: scene.act }) : deps._t("프롤로그");
    const prefix = kicker + ", ", title = deps._t(scene.title);
    return { kicker, title: title.startsWith(prefix) ? title.slice(prefix.length) : title };
  }
  function journalReaderHtml(runtime, entry, pages) {
    const { deps } = runtime;
    return `<header class="journal-reader-head"><h2 id="journal-reader-title">${deps.escapeHTML(deps._t(entry.title))}</h2>
            <button type="button" autofocus data-journal-close>${deps._t("닫기")}</button></header>
            <div class="journal-reader-pages">${pages.map((scene) => `<section class="journal-reader-page ${scene.image ? "" : "is-text-only"}">
                ${scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${deps.escapeHTML(deps._t(scene.title))}" decoding="async" loading="lazy" width="1254" height="1254">` : ""}
                <div class="story-scene-copy">${pages.length > 1 ? `<h3>${deps.escapeHTML(deps._t(scene.title))}</h3>` : ""}${scene.entry ? entryCopy(runtime, scene.entry) : sceneCopy(runtime, scene)}</div>
            </section>`).join("")}</div>`;
  }

  // modules/ui/story-journal-actions.mjs
  function setAutoShow({ deps }, enabled) {
    deps.rules.setAutoShow(deps.game, enabled);
    deps.document.getElementById("chk-act-journal").checked = deps.game.settings.showActJournal;
    deps.document.getElementById("chk-hide-act-journal").checked = !deps.game.settings.showActJournal;
    deps.queueImportantSave(0);
  }
  function syncStoryScenes(runtime) {
    const { deps } = runtime, owner = deps.game;
    for (const scene of deps.rules.sync(owner)) {
      if (!runtime.active || owner !== deps.game) return;
      deps.queueTutorialNotice("story_" + scene.id, deps._t(scene.title), scene.lines.map((line) => deps._t(line)).join("\n\n"));
    }
  }
  function foldPassedScenes(runtime) {
    return runtime.deps.rules.foldPassed(runtime.deps.game, runtime.deps.tutorialQueue).map((scene) => sceneHeading(runtime, scene));
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/story-journal-reader.mjs
  function openEntry(runtime, id) {
    const { deps } = runtime, entry = deps.JOURNAL_DB[id];
    if (!entry || !deps.game.journalEntries.includes(id) || deps.document.getElementById("journal-reader")) return;
    const scenes = deps.STORY_JOURNAL_SCENES.filter((scene) => scene.journal === id);
    const pages = scenes.length ? scenes : [{ title: entry.title, entry }];
    const reader = deps.document.createElement("dialog");
    runtime.reader = reader;
    reader.id = "journal-reader";
    reader.classList.toggle("is-text-only", pages.every((page) => !page.image));
    reader.setAttribute("aria-labelledby", "journal-reader-title");
    reader.innerHTML = journalReaderHtml(runtime, entry, pages);
    listenView(runtime, reader, "close", () => closeJournalReader(runtime, reader));
    listenView(runtime, reader, "click", (event) => {
      if (event.target.closest("[data-journal-close]")) reader.close();
    });
    listenView(runtime, reader, "keydown", (event) => {
      if (event.key === "Escape") event.stopPropagation();
    });
    deps.document.body.appendChild(reader);
    try {
      reader.showModal();
    } catch (error) {
      closeJournalReader(runtime, reader);
      throw error;
    }
  }
  function closeJournalReader(runtime, reader = runtime.reader) {
    if (!reader) return;
    releaseViewTarget(runtime, reader);
    if (reader.open) reader.close();
    reader.remove();
    if (runtime.reader === reader) runtime.reader = null;
  }

  // modules/ui/story-journal-filter.mjs
  function filter(runtime, category = runtime.category, conditions = runtime.includeConditions) {
    runtime.category = category;
    runtime.includeConditions = conditions;
    refreshArchiveFilter(runtime);
  }
  function refreshArchiveFilter(runtime, changed = true) {
    if (!changed && runtime.archiveOwner === runtime.deps.game) return;
    const host = runtime.deps.document.getElementById("ui-journal-list");
    if (!host) return;
    runtime.archiveOwner = runtime.deps.game;
    filterArchiveCards(runtime, host);
    const sections = [...host.querySelectorAll("[data-journal-category]")];
    const visible = sections.filter((section) => section.querySelector(".journal-card:not([hidden])"));
    if (!visible.some((section) => section.dataset.journalCategory === runtime.category)) runtime.category = "전체";
    for (const section of sections) section.hidden = !visible.includes(section) || runtime.category !== "전체" && section.dataset.journalCategory !== runtime.category;
    refreshArchiveControls(runtime, host, visible);
  }
  function filterArchiveCards(runtime, host) {
    for (const card of host.querySelectorAll(".journal-card")) {
      card.hidden = !card.classList.contains("is-unlocked") && !(runtime.includeConditions && card.classList.contains("is-available"));
    }
  }
  function refreshArchiveControls(runtime, host, visible) {
    for (const button of host.querySelectorAll("[data-journal-filter]")) {
      button.hidden = button.dataset.journalFilter !== "전체" && !visible.some((section) => section.dataset.journalCategory === button.dataset.journalFilter);
      button.setAttribute("aria-pressed", String(button.dataset.journalFilter === runtime.category));
    }
    host.querySelector("[data-journal-conditions]").checked = runtime.includeConditions;
    const target = host.querySelector(".journal-next-target");
    if (target) target.hidden = !runtime.includeConditions;
    host.querySelector(".journal-empty").hidden = visible.length > 0;
  }

  // modules/ui/journal-navigation.mjs
  function getJournalEntryAction(runtime, id) {
    const { deps } = runtime, owner = deps.game;
    if (["level_200", "passive_star_evolution"].includes(id)) return journalCharacterRoute(runtime, id);
    if (!owner?.unlocks?.map) return null;
    const loop = Math.max(1, Math.floor(Number(owner.season || 1)));
    const maxZoneId = Math.max(0, Math.floor(Number(owner.maxZoneId || 0)));
    const context = { loop, maxZoneId };
    return journalStoryRoute(runtime, id, context) || journalExplorationRoute(runtime, id, context) || journalEndgameRoute(runtime, id, context);
  }
  function journalCharacterRoute({ deps }, id) {
    if (id === "level_200") return { label: deps._t("캐릭터 성장 확인"), tabId: "tab-character" };
    return deps.game?.unlocks?.char ? { label: deps._t("성좌 확인"), tabId: "tab-char" } : null;
  }
  function journalStoryRoute(runtime, id, { maxZoneId }) {
    const { deps } = runtime;
    if (/^act_\d+$/.test(id) || id === "immortal") return { label: deps._t("사냥터 보기"), tabId: "tab-map", subtabId: "map-explore-hunting" };
    if (["woodsman", "woodsman_echo"].includes(id)) return journalChaosRoute(runtime, id, maxZoneId);
    if (id === "meteor_fall") return deps.game.meteorSite?.unlocked ? { label: deps._t("운석 낙하 지점 보기"), tabId: "tab-map", subtabId: "map-explore-meteor" } : null;
    return null;
  }
  function journalChaosRoute({ deps }, id, maxZoneId) {
    const owner = deps.game;
    if (id === "woodsman") {
      const ready = typeof deps.hasCurrentLoopChaosAccess === "function" ? deps.hasCurrentLoopChaosAccess(owner) : maxZoneId >= deps.ABYSS_START_ZONE_ID;
      return ready ? { label: deps._t("혼돈 등반 보기"), tabId: "tab-map", subtabId: "map-explore-chaos" } : null;
    }
    return owner.chaosRealm?.unlocked ? { label: deps._t("혼돈계 보기"), tabId: "tab-map", subtabId: "map-tab-chaos-realm" } : null;
  }
  function journalExplorationRoute({ deps }, id, { loop, maxZoneId }) {
    const rows = {
      beehive_queen: [8, "벌집 원정 보기", "map-explore-beehive"],
      void_grand_breach: [9, "대균열 보기", "map-explore-voidrift"],
      labyrinth_10: [3, "고대 미궁 보기", "map-explore-labyrinth"],
      ocean_500: [deps.OCEAN_UNLOCK_LOOP, "심해 보기", "map-tab-ocean"],
      time_rift_fusion: [deps.TIME_RIFT_UNLOCK_LOOP, "시간의 균열 보기", "map-explore-timerift"],
      colony_wave_10: [15, "군락지 보기", "map-explore-colony"]
    };
    if (id === "sky_tower_10") return deps.game.skyTower?.unlocked ? { label: deps._t("창공의 탑 보기"), tabId: "tab-map", subtabId: "map-tab-sky" } : null;
    const row = rows[id];
    if (!row || !(loop >= row[0]) || id === "labyrinth_10" && !(maxZoneId >= 5)) return null;
    return { label: deps._t(row[1]), tabId: "tab-map", subtabId: row[2] };
  }
  function journalEndgameRoute(runtime, id, { loop }) {
    const { deps } = runtime;
    if (/^rival_/.test(id)) return loop >= 31 ? { label: deps._t("버려진 날 보기"), tabId: "tab-map", subtabId: "map-explore-root-boss" } : null;
    if (/^pinnacle_/.test(id)) return loop >= 31 ? { label: deps._t("최종 관문 보기"), tabId: "tab-map", subtabId: "map-explore-root-boss" } : null;
    if (id !== "cosmos_astra" || loop < 31) return null;
    return journalCosmosRoute(runtime);
  }
  function journalCosmosRoute({ deps }) {
    const progress = typeof deps.getCosmosCapstoneProgress === "function" ? deps.getCosmosCapstoneProgress(deps.game.cosmosAtlas || {}) : null;
    return progress?.canChallenge ? { label: deps._t("아스트라 도전 보기"), tabId: "tab-map", subtabId: "map-explore-root-boss" } : { label: deps._t("우주계 진행 보기"), tabId: "tab-map", subtabId: "map-tab-cosmos" };
  }
  function openJournalEntryAction(runtime, id) {
    const { deps } = runtime, action = getJournalEntryAction(runtime, id);
    if (!action?.tabId) return;
    deps.switchTab(action.tabId);
    if (action.tabId !== "tab-map" || !action.subtabId) return;
    if (action.subtabId.startsWith("map-tab-")) deps.switchMapSubtab(action.subtabId);
    else {
      deps.switchMapSubtab("map-tab-zones");
      deps.switchMapExploreSubtab(action.subtabId);
    }
  }

  // modules/ui/journal-queries.mjs
  function getJournalEntryAvailability(runtime, entry, unlockedIds) {
    const unlocked = new Set(Array.isArray(unlockedIds) ? unlockedIds : []);
    if (!entry?.id || !entry.def) return "content-locked";
    if (unlocked.has(entry.id)) return "unlocked";
    if (entry.def.hidden) return "hidden";
    const prerequisites = Array.isArray(entry.def.requiresJournal) ? entry.def.requiresJournal : [];
    if (prerequisites.some((id) => !unlocked.has(id))) return "prerequisite-locked";
    return getJournalEntryAction(runtime, entry.id) ? "available" : "content-locked";
  }
  function getJournalContentUnlockHint({ deps }, id) {
    const hints = {
      woodsman: "액트 10 클리어 후 혼돈 입성",
      beehive_queen: "루프 8 도달",
      void_grand_breach: "루프 9 도달",
      labyrinth_10: "루프 3, 액트 5 도달",
      sky_tower_10: "루프 15, 혼돈 20층 클리어",
      colony_wave_10: "루프 15 도달"
    };
    if (Object.hasOwn(hints, id)) return hints[id];
    if (id === "meteor_fall") return deps._t("루프 {METEOR_SITE_UNLOCK_LOOP}, 액트 {METEOR_SITE_UNLOCK_ACT} 도달", { METEOR_SITE_UNLOCK_LOOP: deps.METEOR_SITE_UNLOCK_LOOP, METEOR_SITE_UNLOCK_ACT: deps.METEOR_SITE_UNLOCK_ACT });
    if (id === "ocean_500") return deps._t("루프 {OCEAN_UNLOCK_LOOP} 도달", { OCEAN_UNLOCK_LOOP: deps.OCEAN_UNLOCK_LOOP });
    if (id === "time_rift_fusion") return deps._t("루프 {TIME_RIFT_UNLOCK_LOOP} 도달", { TIME_RIFT_UNLOCK_LOOP: deps.TIME_RIFT_UNLOCK_LOOP });
    if (/^rival_/.test(id) || id === "cosmos_astra" || /^pinnacle_/.test(id)) return "루프 31 도달";
    return "";
  }
  function getJournalLockedHint(runtime, availability, id) {
    const hint = getJournalContentUnlockHint(runtime, id);
    return availability === "content-locked" && hint ? hint : "???";
  }
  function journalRewardText({ deps }, def, shown) {
    const source = def.bonus ? def.bonus.label : def.displayEffect;
    return shown && source ? deps._t(source) : "";
  }
  function getJournalCategory({ deps }, id) {
    if (id.startsWith("memory_leaf_")) return "기억의 잎";
    if (/^(prologue|act_\d+)$/.test(id)) return "스토리";
    if (id.startsWith("inscription_")) return "세계의 흔적";
    if (deps.JOURNAL_DB[id]?.hidden) return "숨겨진 기록";
    if (/^rival_/.test(id)) return "버려진 날";
    if (id === "cosmos_astra") return "우주계 기록";
    if (/^pinnacle_/.test(id)) return "최종 관문";
    if (["labyrinth_10", "ocean_500", "sky_tower_10", "time_rift_fusion", "colony_wave_10"].includes(id)) return "탐험 기록";
    return "세계의 흔적";
  }

  // modules/ui/story-journal-lifetime.mjs
  function resetStoryJournalForSave(runtime) {
    closeJournalReader(runtime);
    runtime.owner = runtime.deps.game;
    runtime.category = "전체";
    runtime.includeConditions = false;
  }
  function syncStoryJournalOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) resetStoryJournalForSave(runtime);
    return true;
  }

  // modules/ui/story-journal-events.mjs
  function installStoryJournalEvents(runtime) {
    const doc = runtime.deps.document, host = doc.getElementById("ui-journal-list");
    if (host) {
      listenView(runtime, host, "click", (event) => clickJournal(runtime, event));
      listenView(runtime, host, "change", (event) => {
        if (event.target.matches("[data-journal-conditions]") && acceptsJournalInput(runtime)) runtime.handlers.filter(void 0, event.target.checked);
      });
    }
    for (const id of ["chk-act-journal", "chk-hide-act-journal"]) {
      const input = doc.getElementById(id);
      if (input) listenView(runtime, input, "change", () => {
        const owner = runtime.owner;
        if (syncStoryJournalOwner(runtime) && owner === runtime.owner) runtime.handlers.setAutoShow(id === "chk-act-journal" ? input.checked : !input.checked);
      });
    }
  }
  function acceptsJournalInput(runtime) {
    if (!syncStoryJournalOwner(runtime)) return false;
    if (runtime.archiveOwner === runtime.deps.game) return true;
    refreshArchiveFilter(runtime);
    return false;
  }
  function clickJournal(runtime, event) {
    const target = event.target.closest("button");
    if (!target || target.disabled || !acceptsJournalInput(runtime)) return;
    if (target.dataset.journalEntry) runtime.handlers.openEntry(target.dataset.journalEntry);
    else if (target.dataset.journalAction) runtime.handlers.openJournalEntryAction(target.dataset.journalAction);
    else if (target.dataset.journalFilter) runtime.handlers.filter(target.dataset.journalFilter);
  }

  // modules/ui/story-journal-view.mjs
  function createStoryJournalView(deps) {
    const runtime = { deps, owner: deps.game, archiveOwner: null, category: "전체", includeConditions: false, reader: null, active: true, handlers: {}, listeners: [] };
    const handlers = {
      sync: syncStoryScenes,
      openEntry,
      filter,
      refreshArchiveFilter,
      setAutoShow,
      foldPassedScenes,
      openJournalEntryAction,
      resetForSave: resetStoryJournalForSave
    };
    for (const [name, handler] of Object.entries(handlers)) {
      runtime.handlers[name] = (...args) => {
        if (syncStoryJournalOwner(runtime)) return handler(runtime, ...args);
      };
    }
    const queries = {};
    for (const [name, handler] of Object.entries({ getJournalEntryAction, getJournalEntryAvailability, journalRewardText, getJournalLockedHint, getJournalCategory })) {
      queries[name] = (...args) => handler(runtime, ...args);
    }
    installStoryJournalEvents(runtime);
    return Object.freeze({
      ...runtime.handlers,
      ...queries,
      dispose() {
        if (!runtime.active) return;
        closeJournalReader(runtime);
        releaseViewEvents(runtime);
      }
    });
  }

  // modules/story-journal-ui-classic.mjs
  var storyJournalUi = createStoryJournalView({
    rules: createStoryScenes({
      get acts() {
        return STORY_ACTS;
      },
      get scenes() {
        return STORY_JOURNAL_SCENES;
      },
      get bridges() {
        return typeof STORY_BRIDGE_SCENES === "undefined" ? void 0 : STORY_BRIDGE_SCENES;
      }
    }),
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get tutorialQueue() {
      return tutorialQueue;
    },
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get STORY_JOURNAL_SCENES() {
      return STORY_JOURNAL_SCENES;
    },
    get STORY_SCENE_QUOTES() {
      return typeof STORY_SCENE_QUOTES === "undefined" ? void 0 : STORY_SCENE_QUOTES;
    },
    get hasCurrentLoopChaosAccess() {
      return typeof hasCurrentLoopChaosAccess === "undefined" ? void 0 : hasCurrentLoopChaosAccess;
    },
    get getCosmosCapstoneProgress() {
      return window.getCosmosCapstoneProgress;
    },
    get ABYSS_START_ZONE_ID() {
      return ABYSS_START_ZONE_ID;
    },
    get OCEAN_UNLOCK_LOOP() {
      return OCEAN_UNLOCK_LOOP;
    },
    get TIME_RIFT_UNLOCK_LOOP() {
      return TIME_RIFT_UNLOCK_LOOP;
    },
    get METEOR_SITE_UNLOCK_LOOP() {
      return METEOR_SITE_UNLOCK_LOOP;
    },
    get METEOR_SITE_UNLOCK_ACT() {
      return METEOR_SITE_UNLOCK_ACT;
    },
    get switchTab() {
      return switchTab;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    }
  });
  window.GameModules.storyJournalView = storyJournalUi;
  safeExposeGlobals({ storyJournalUi });
})();
