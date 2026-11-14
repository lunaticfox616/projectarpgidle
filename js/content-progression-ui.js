// GENERATED from modules/content-progression-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

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

  // modules/ui/content-npc-markup.mjs
  function view_personal(runtime, text) {
    return String(text || "").split(/[\s,]+/).pop();
  }
  function view_npcHeardKey(runtime, npc, topic) {
    return `${npc.id}:${topic}`;
  }
  function npcNews(runtime, npc) {
    if (!runtime.deps.game.contentProgression) return "";
    return npcTopics(runtime, npc).open.some((row) => !npcHeard(runtime, npc, row.topic)) ? "talk" : "";
  }
  function npcModeBody(runtime, view) {
    if (view.mode === "shop") return runtime.deps.npcShopUi.body(view.npc);
    return view.mode === "exchange" ? runtime.deps.orgaExchangeUi.body() : npcTalkBody(runtime, view);
  }
  function npcTalkBody(runtime, view) {
    const npc = view.npc, { open: open2 } = npcTopics(runtime, npc), topic = open2.find((row) => row.topic === view.topic) || null;
    const keys = open2.map((row) => {
      const heard = npcHeard(runtime, npc, row.topic);
      return `<li><button type="button" class="${heard ? "is-heard" : "is-new"}" data-npc-topic="${(0, runtime.deps.escapeHTML)(row.topic)}" aria-pressed="${row === topic}">
                <span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.topic))}</span>${heard ? "" : (0, runtime.deps._t)("<em>새 이야기</em>")}</button></li>`;
    }).join("");
    return `<section class="npc-dialog-speech" aria-live="polite">${topic ? `<h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(topic.topic))}</h3>` : ""}
            <p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(topic ? topic.line : npcGreeting(runtime, npc)))}</p></section>
            <nav class="npc-dialog-talk" aria-label="${(0, runtime.deps._t)("이야깃거리")}"><h4>${(0, runtime.deps._t)("이야기")}</h4><ul class="npc-dialog-topics">${keys}</ul></nav>
            ${npcFoot(runtime, view)}`;
  }
  function npcFoot(runtime, view) {
    if (!runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, "tab-trade")) return "";
    const doors = runtime.deps.npcShopUi.door(view.npc) + runtime.deps.orgaExchangeUi.door(view.npc);
    return doors ? `<footer class="npc-dialog-foot">${doors}</footer>` : "";
  }
  function npcTopics(runtime, npc) {
    const rows = (runtime.deps.STORY_NPCS[npc.id] || {}).dialogues || [], act = npcReachedAct(runtime), loop = runtime.deps.game.season || 1;
    return { open: rows.filter((row) => (!row.reqAct || act >= row.reqAct) && (!row.reqLoop || loop >= row.reqLoop)) };
  }
  function npcReachedAct(runtime) {
    if ((runtime.deps.game.season || 1) > 1) return runtime.deps.STORY_ACTS.length;
    const zone = Math.max(Number(runtime.deps.game.maxZoneId) || 0, Number.isInteger(runtime.deps.game.currentZoneId) ? runtime.deps.game.currentZoneId : 0);
    return runtime.deps.STORY_ACTS.filter((act, index) => index <= zone).reduce((top, act) => Math.max(top, act.order), 1);
  }
  function npcGreeting(runtime, npc) {
    if (npc.line) return npc.line;
    const me = view_personal(runtime, npc.name), act = npcReachedAct(runtime);
    const met = runtime.deps.STORY_ACTS.filter((row) => row.order <= act).map((row) => (runtime.deps.STORY_ACT_ENCOUNTERS[row.order] || {}).npc).filter((said) => said && view_personal(runtime, said.name) === me).pop();
    return met ? met.bark : npc.title;
  }
  function npcHeard(runtime, npc, topic) {
    return runtime.deps.game.npcHeard.includes(view_npcHeardKey(runtime, npc, topic));
  }

  // modules/ui/content-npc-actions.mjs
  function hearNpcTopic(runtime, npc, topic) {
    if (!npcHeard(runtime, npc, topic)) runtime.deps.game.npcHeard.push(view_npcHeardKey(runtime, npc, topic));
  }
  function npcClick(runtime, dialog, view, event) {
    if (view.owner !== runtime.deps.game) {
      closeNpcView(runtime);
      return;
    }
    const control = event.target.closest("button");
    if (!control) return;
    if (control.dataset.npcClose !== void 0) {
      dialog.close();
      return;
    }
    if (control.dataset.npcTopic) {
      npcPickTopic(runtime, view, control.dataset.npcTopic);
      renderNpc(runtime, dialog, view);
    }
  }
  function npcPickTopic(runtime, view, topic) {
    if (view.owner && view.owner !== runtime.deps.game) return;
    if (topic === "shop" || topic === "exchange") {
      if (topic === "exchange" && view.npc.id !== runtime.deps.NPC_CURRENCY_EXCHANGE.npc) return;
      if (runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, "tab-trade")) view.mode = topic;
      return;
    }
    const known = npcTopics(runtime, view.npc).open.some((row) => row.topic === topic);
    Object.assign(view, { mode: "talk", topic: known ? topic : null });
    if (known) hearNpcTopic(runtime, view.npc, topic);
  }
  function openNpc(runtime, npc, mode = "talk") {
    syncNpcOwner(runtime);
    const old = runtime.deps.document.getElementById("npc-dialog");
    if (!npc || old && old.open) return false;
    if (!runtime.deps.contentProgression.opening.canOpen(runtime.deps.game, "tab-trade") || mode === "exchange" && npc.id !== runtime.deps.NPC_CURRENCY_EXCHANGE.npc) mode = "talk";
    if (old) old.remove();
    closeNpcView(runtime);
    const view = { npc, mode, topic: null, owner: runtime.deps.game };
    const dialog = runtime.deps.document.createElement("dialog");
    dialog.id = "npc-dialog";
    dialog.className = "npc-dialog";
    dialog.dataset.npcId = npc.id;
    dialog.dataset.tone = npc.tone || "gold";
    dialog.setAttribute("aria-labelledby", "npc-dialog-name");
    runtime.state.npcView = view;
    runtime.state.npcDialog = dialog;
    listenView(runtime, dialog, "click", (event) => npcClick(runtime, dialog, view, event));
    listenView(runtime, dialog, "close", () => closeNpcView(runtime, dialog), { once: true });
    runtime.deps.document.body.appendChild(dialog);
    renderNpc(runtime, dialog, view);
    dialog.showModal();
    runtime.deps.systemTutorialUi.visit("npc-shop");
    return true;
  }
  function closeNpcView(runtime, dialog = runtime.state.npcDialog) {
    if (!dialog) return;
    releaseViewTarget(runtime, dialog);
    if (dialog.open) dialog.close();
    dialog.remove();
    if (runtime.state.npcDialog !== dialog) return;
    runtime.state.npcDialog = runtime.state.npcView = null;
  }
  function syncNpcOwner(runtime) {
    if (runtime.state.npcView && runtime.state.npcView.owner !== runtime.deps.game) closeNpcView(runtime);
  }
  function renderNpc(runtime, dialog, view) {
    const npc = view.npc;
    dialog.classList.toggle("is-shop", view.mode !== "talk");
    dialog.innerHTML = `<figure class="npc-dialog-figure"><img class="npc-dialog-portrait" src="${runtime.deps.STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who">
            <h2 id="npc-dialog-name">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(npc.name))}</h2><p class="npc-dialog-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(npc.title || ""))}</p></div>
            <button type="button" class="npc-dialog-close" data-npc-close>${(0, runtime.deps._t)("닫기")}</button></header>
            ${npcModeBody(runtime, view)}</div>`;
  }

  // modules/ui/content-unlock-markup.mjs
  function view_art(runtime, def) {
    return "assets/" + (def.art || "ui/currency/sap-bud.png");
  }
  function view_listed(runtime, loop) {
    return runtime.deps.CONTENT_UNLOCK_CATALOG.filter((row) => row.minLoop === loop && !row.series);
  }
  function roadmapAdditions(runtime, loop) {
    return (runtime.deps.SEASON_CONTENT_ROADMAP[loop]?.features || []).filter((text) => /심화:|그루터기 함|아틀라스:|야생 부적|전환점:|전술 조건|버려진 날붙이|최종 관문|세계수 껍질/.test(text));
  }
  function entryReward(runtime, def, status) {
    const text = def.rewardText;
    const reward = !status.unlocked && text ? `<p class="unlock-reward">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(text))}</p>` : "";
    const picker = !status.unlocked && def.rewardChoices?.length > 1 ? `<label class="content-unlock-choice">${(0, runtime.deps._t)("첫 보상")}<select data-unlock-reward="${def.id}" aria-label="${(0, runtime.deps._t)("{name} 첫 보상", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name)) })}">${def.rewardChoices.map((row) => `<option value="${row.key}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.label))}</option>`).join("")}</select></label>` : "";
    return reward + picker;
  }
  function lockAttribute(runtime, id) {
    return runtime.deps.contentProgression.isUnlocked(id) ? "" : "data-content-locked";
  }
  function routeAction(runtime, def) {
    if (def.action) return def.action;
    const route = def.routes?.[0];
    if (!route) return null;
    if (route.startsWith("item-tab-")) return { tab: "tab-items", subtab: route };
    if (route.startsWith("skill-tab-")) return { tab: "tab-skills", skillSubtab: route };
    if (route.startsWith("map-explore-")) return { tab: "tab-map", mapSubtab: "map-tab-zones", explore: route };
    if (route.startsWith("map-tab-")) return { tab: "tab-map", mapSubtab: route };
    if (route.startsWith("tab-")) return { tab: route };
    return null;
  }
  function routeKey(runtime, action) {
    const map = action.mapSubtab && action.mapSubtab !== "map-tab-zones" ? action.mapSubtab : null;
    return action.explore || action.subtab || action.skillSubtab || map || action.tab;
  }
  function journeyPath(runtime, route) {
    const guide = runtime.deps.EXPLORATION_REGIONS.guides[route];
    return guide ? guide.path.split(" → ").map((step) => (0, runtime.deps._t)(step)).join(" → ") : "";
  }
  function journeyNotice(runtime, route) {
    const guide = runtime.deps.EXPLORATION_REGIONS.guides[route];
    const line = guide.notice || guide.reward;
    return [(0, runtime.deps._t)(line), (0, runtime.deps._t)("입장 경로 · {path}", { path: journeyPath(runtime, route) })].join("\n");
  }
  function noticeContentId(runtime, notice) {
    return notice.contentId || (notice.key?.startsWith("unlock_content_") ? notice.key.slice("unlock_content_".length) : "");
  }
  function journeyForNotice(runtime, notice) {
    const id = noticeContentId(runtime, notice);
    const def = id && runtime.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === id);
    if (!def) return Object.keys(runtime.deps.EXPLORATION_REGIONS.guides).find((key) => runtime.deps.EXPLORATION_REGIONS.guides[key].noticeKey === notice.key);
    const action = routeAction(runtime, def);
    return action && (def.action?.guide || routeKey(runtime, action));
  }
  function noticeBody(runtime, def, route) {
    const guideKey = def.action?.guide || route;
    if (runtime.deps.EXPLORATION_REGIONS.guides[guideKey]) return journeyNotice(runtime, guideKey);
    const path = runtime.state.CONTENT_ROUTE_PATHS[route];
    return path ? (0, runtime.deps._t)("{description}\n‘{path}’에 있습니다.", { description: (0, runtime.deps._t)(def.description), path: (0, runtime.deps._t)(path) }) : def.description;
  }
  function canOpenProgressTarget(runtime, route) {
    if (route === "outside-chaos") return runtime.deps.game.season >= 10 && runtime.deps.contentProgression.canOpen("tab-season");
    if (route === "map-explore-chaos") return runtime.deps.contentProgression.canOpen("tab-map");
    return runtime.deps.explorationAtlasUi.available(route);
  }
  function progressButton(runtime, route, label) {
    if (!route || !canOpenProgressTarget(runtime, route)) return "";
    return `<button type="button" data-progress-target="${(0, runtime.deps.escapeHTML)(route)}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(label))}</button>`;
  }
  function openedContents(runtime, owner = runtime.deps.game) {
    return new Set(owner.contentProgression?.automatic || []);
  }

  // modules/ui/content-unlock-notices.mjs
  function announceStarterWeapon(runtime, item) {
    if (!item || (runtime.deps.game.seenTutorials || []).includes(runtime.deps.basicSkills.weaponGuide)) return;
    runtime.deps.game.unlocks.items = true;
    runtime.deps.game.noti.items = true;
    (0, runtime.deps.queueTutorialNotice)(
      runtime.deps.basicSkills.weaponGuide,
      (0, runtime.deps._t)("첫 무기 장착"),
      (0, runtime.deps._t)("[{name}] 무기를 주웠습니다.\n‘장비’에서 가방의 무기를 누르고 ‘장착’을 누르세요.\n무기를 들면 기초 스킬로 싸웁니다.", { name: (0, runtime.deps._t)(item.name) }),
      "tab-items"
    );
  }
  function announceLoop(runtime) {
    if (runtime.deps.game.season === 2 && !runtime.deps.contentProgression.isUnlocked("passiveTree")) return;
    if (!runtime.deps.game.contentProgression) {
      (0, runtime.deps.queueTutorialNotice)(
        "unlock_content_loop_" + runtime.deps.game.season,
        (0, runtime.deps._t)("다음 콘텐츠 선택"),
        (0, runtime.deps._t)("루프 {loop}에 도달했습니다!\n루프 이정표와 루프 패시브 트리를 루프 탭에서 확인할 수 있습니다.", { loop: runtime.deps.game.season }),
        "tab-unlocks"
      );
      return;
    }
    const added = view_listed(runtime, runtime.deps.game.season).filter((def) => runtime.deps.contentProgression.kind(def) === "paid" && !runtime.deps.contentProgression.isUnlocked(def.id) && runtime.deps.contentProgression.parents(def).every((id) => runtime.deps.contentProgression.isUnlocked(id)));
    const paid = added.map((def) => `[${(0, runtime.deps._t)(def.name)}]`);
    if (runtime.deps.contentProgression.points().complete && !added.length) return;
    const lines = [(0, runtime.deps._t)("해금 포인트 {balance}P", { balance: runtime.deps.contentProgression.balance() })];
    if (paid.length) lines.push((0, runtime.deps._t)("새 해금: {names}", { names: paid.join(", ") }));
    if (!added.length) {
      const ahead = runtime.deps.CONTENT_UNLOCK_CATALOG.filter((def) => !def.series && def.minLoop > runtime.deps.game.season).reduce((min, def) => Math.min(min, def.minLoop), Infinity);
      if (Number.isFinite(ahead)) lines.push((0, runtime.deps._t)("루프 {loop}: {names}", { loop: ahead, names: view_listed(runtime, ahead).map((def) => `[${(0, runtime.deps._t)(def.name)}]`).join(", ") }));
    }
    (0, runtime.deps.queueTutorialNotice)("unlock_content_loop_" + runtime.deps.game.season, (0, runtime.deps._t)("루프 {season}", { season: runtime.deps.game.season }), lines.join("\n"), "tab-unlocks");
  }
  function announceJourney(runtime, guideKey) {
    const guide = runtime.deps.EXPLORATION_REGIONS.guides[guideKey];
    const outside = guideKey === "outside-chaos";
    (0, runtime.deps.queueTutorialNotice)(
      guide.noticeKey,
      guide.title,
      journeyNotice(runtime, guideKey),
      outside ? "tab-season" : "tab-map",
      outside ? null : { subtabId: guide.mapRoute || guideKey, atlasView: guide.atlasView }
    );
  }
  function announceOutsideChaos(runtime) {
    const key = runtime.deps.EXPLORATION_REGIONS.guides["outside-chaos"].noticeKey;
    if (runtime.deps.game.season < 10 || runtime.deps.game.chaosRealm.unlocked || runtime.deps.game.isBackgroundCalculation) return;
    if (runtime.deps.game.seenTutorials.includes(key) || runtime.deps.game.tutorialHistory.some((row) => row.key === key)) return;
    if ((0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(runtime.deps.game.season)) announceJourney(runtime, "outside-chaos");
  }
  function announceContent(runtime, id, inline = false) {
    const def = runtime.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === id);
    if (!def || !runtime.deps.contentProgression.isUnlocked(id) || def.series || def.minLoop <= 1 && id !== "tactics") return false;
    const action = routeAction(runtime, def), route = action ? routeKey(runtime, action) : null;
    const before = runtime.deps.tutorialQueue.length;
    (0, runtime.deps.queueTutorialNotice)(
      `unlock_content_${id}`,
      def.name,
      noticeBody(runtime, def, route),
      action ? action.tab : null,
      { subtabId: route, contentId: id, inline, openLabel: (0, runtime.deps._t)("{name} 열기", { name: (0, runtime.deps._t)(def.name) }) }
    );
    return runtime.deps.tutorialQueue.length > before;
  }
  function announceOpenedSince(runtime, before) {
    openedContents(runtime).forEach((id) => {
      if (before.has(id)) return;
      if (id === "tactics" && runtime.deps.contentProgression.opening.applies(runtime.deps.game)) {
        runtime.deps.game.noti.skills = true;
        return announceContent(runtime, id, true);
      }
      announceContent(runtime, id);
    });
  }
  function syncOpened(runtime) {
    const before = openedContents(runtime);
    runtime.deps.contentProgression.sync();
    announceOpenedSince(runtime, before);
    announceOutsideChaos(runtime);
  }
  function announceSettledUnlocks(runtime, before) {
    announceOpenedSince(runtime, openedContents(runtime, before));
    if (!before.atlas?.unlocked && runtime.deps.game.atlas.unlocked) announceJourney(runtime, "map-explore-worldtree");
    announceOutsideChaos(runtime);
  }

  // modules/ui/content-unlock-actions.mjs
  function sync(runtime) {
    if (!runtime.deps.game.contentProgression) return;
    const enabled = !!runtime.deps.game.contentProgression;
    runtime.deps.document.body.classList.toggle("content-choice-progression", enabled);
    syncOpeningHud(runtime);
    runtime.deps.document.body.classList.toggle("content-support-locked", enabled && !runtime.deps.contentProgression.isUnlocked("support"));
    runtime.deps.document.body.classList.toggle("content-craft-locked", !runtime.deps.contentProgression.isUnlocked("craft"));
    runtime.deps.document.getElementById("loop-passive-locked")?.toggleAttribute("hidden", runtime.deps.contentProgression.isUnlocked("loopTree"));
    for (const def of runtime.deps.CONTENT_UNLOCK_CATALOG) {
      const locked = !runtime.deps.contentProgression.isUnlocked(def.id);
      for (const selector of def.sections || []) {
        runtime.deps.document.querySelectorAll(selector).forEach((el) => el.toggleAttribute("data-content-locked", locked));
      }
      for (const route of def.routes || []) syncRoute(runtime, route, !runtime.deps.contentProgression.canOpen(route));
    }
    for (const route of ["tab-map", "tab-season", "tab-unlocks", "tab-skills", "tab-items", "tab-character", "tab-char", "tab-social", "tab-trade", "map-explore-worldtree"]) {
      syncRoute(runtime, route, !runtime.deps.contentProgression.canOpen(route));
    }
    resetClosedSelection(runtime, "itemSubtab", "item-tab-equip", "#tab-items");
    resetClosedSelection(runtime, "skillSubtab", "skill-tab-equip", "#tab-skills");
    resetClosedSelection(runtime, "mapSubtab", "map-tab-zones", "#tab-map");
    resetClosedSelection(runtime, "mapExploreSubtab", "map-explore-hunting", "#map-tab-zones");
    render(runtime);
  }
  function syncOpeningHud(runtime) {
    const locked = runtime.deps.contentProgression.opening.combatOnly(runtime.deps.game);
    for (const id of ["btn-act-exploration-auto", "btn-combat-return", "btn-combat-goal-toggle"]) {
      runtime.deps.document.getElementById(id)?.toggleAttribute("data-content-locked", locked);
    }
    const chatLocked = !runtime.deps.contentProgression.canOpen("tab-social");
    runtime.deps.document.body.classList.toggle("opening-chat-locked", chatLocked);
    for (const id of ["btn-combat-chat-tab", "btn-combat-chat-settings"]) {
      runtime.deps.document.getElementById(id)?.toggleAttribute("data-content-locked", chatLocked);
    }
    syncRuneLauncher(runtime);
  }
  function syncRuneLauncher(runtime) {
    const button = runtime.deps.document.getElementById("btn-tab-items");
    if (!button) return;
    const runeOnly = !runtime.deps.contentProgression.canOpen("tab-items") && runtime.deps.contentProgression.canOpen("tab-skills");
    if (runeOnly) button.dataset.openingRunes = "1";
    else {
      if (!button.dataset.openingRunes) return;
      delete button.dataset.openingRunes;
    }
    const name = runeOnly ? "스킬룬" : "장비";
    const caption = name + "|하단 메뉴";
    const label = button.querySelector(".ui-rail-label");
    if (label && label.textContent !== (0, runtime.deps._t)(name)) label.textContent = (0, runtime.deps._t)(name);
    button.dataset.i18nSourceDataCaption = caption;
    button.dataset.caption = (0, runtime.deps._t)(caption);
  }
  function syncRoute(runtime, route, locked) {
    const group = (0, runtime.deps.getMergedTabGroup)(route);
    const launcher = group && group[1].launcher === route;
    const closed = launcher ? !(0, runtime.deps.getSelectedMergedTabId)(group[0]) : locked;
    runtime.deps.document.getElementById("btn-" + route)?.toggleAttribute("data-content-locked", closed);
    if (!launcher) runtime.deps.document.getElementById(route)?.toggleAttribute("data-content-locked", locked);
  }
  function resetClosedSelection(runtime, key, fallback, rootId) {
    if (runtime.deps.contentProgression.canOpen(runtime.deps.game[key])) return;
    runtime.deps.game[key] = fallback;
    const panels = key === "mapExploreSubtab" ? " .vertical-tab-panel" : " > .subtab-content";
    const buttons = key === "mapExploreSubtab" ? " .vertical-tab-btn" : " > .subtab-row > button";
    runtime.deps.document.querySelectorAll(rootId + panels).forEach((el) => el.classList.toggle("active", el.id === fallback));
    runtime.deps.document.querySelectorAll(rootId + buttons).forEach((el) => el.classList.toggle("active", el.id === "btn-" + fallback));
  }
  function render(runtime) {
    if (typeof runtime.deps.unlockTabUi === "object") runtime.deps.unlockTabUi.render();
  }
  function select(runtime, id) {
    runtime.deps.unlockTabUi.select(id);
  }
  function purchase(runtime, id, scope = runtime.deps.document) {
    takeContent(runtime, id, scope);
  }
  function takeContent(runtime, id, scope) {
    const key = scope.querySelector(`[data-unlock-reward="${id}"]`)?.value, opened = openedContents(runtime);
    const result = runtime.deps.contentProgression.purchase(id, runtime.deps.game, key);
    if (!result.ok) {
      (0, runtime.deps.addLog)(result.message, "attack-monster", { toast: true });
      return;
    }
    const carded = id === "passiveTree" || announceContent(runtime, id);
    (0, runtime.deps.addLog)(result.message, "season-up", { toast: !carded, noToast: carded });
    announceOpenedSince(runtime, opened);
    if (id === "voidSocket") {
      (0, runtime.deps.refreshPassiveConnectivity)();
      runtime.deps.game.noti.char = true;
    }
    runtime.deps.game.noti.season = runtime.deps.CONTENT_UNLOCK_CATALOG.some((def) => runtime.deps.contentProgression.kind(def) === "paid" && runtime.deps.contentProgression.status(def.id).available);
    runtime.handlers.checkUnlocks();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.saveGame)({ skipCloudSync: false });
  }
  function openSection(runtime, id) {
    runtime.deps.disclosure.setOpen(`id:${id}`, true);
    const section = runtime.deps.document.getElementById(id);
    if (section) section.open = true;
    scheduleViewFrame(runtime, () => runtime.deps.document.getElementById(id)?.scrollIntoView({ block: "nearest" }));
  }
  function openProgressTarget(runtime, route) {
    if (!canOpenProgressTarget(runtime, route)) return false;
    if (route === "outside-chaos") {
      (0, runtime.deps.switchTab)("tab-season", { keepWindowOpen: true });
      openSection(runtime, "ui-loop10-section");
    } else if (route === "map-explore-chaos" && !runtime.deps.explorationAtlasUi.available(route)) {
      runtime.deps.explorationAtlasUi.openAct(Math.min(runtime.deps.STORY_ACTS.length - 1, runtime.deps.game.maxZoneId));
    } else {
      (0, runtime.deps.switchTab)("tab-map", { keepWindowOpen: true });
      runtime.deps.explorationAtlasUi.enter(route);
      runtime.deps.explorationAtlasUi.openEntryPage(route);
    }
    return true;
  }
  function open(runtime, id) {
    if (!runtime.deps.contentProgression.isUnlocked(id)) return false;
    const def = runtime.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === id);
    const action = routeAction(runtime, def);
    if (!action || !runtime.deps.contentProgression.canOpen(routeKey(runtime, action))) return false;
    (0, runtime.deps.switchTab)(action.tab, { keepWindowOpen: true });
    if (action.subtab) (0, runtime.deps.switchItemSubtab)(action.subtab);
    if (action.skillSubtab) (0, runtime.deps.switchSkillSubtab)(action.skillSubtab);
    if (action.mapSubtab) (0, runtime.deps.switchMapSubtab)(action.mapSubtab);
    if (action.explore) (0, runtime.deps.switchMapExploreSubtab)(action.explore);
    runtime.deps.explorationAtlasUi.openEntryPage(routeKey(runtime, action));
    if (action.atlasView) runtime.deps.atlasUi.setView(action.atlasView);
    if (action.section) openSection(runtime, action.section);
    return true;
  }

  // modules/domain/content-menu-progress.mjs
  var MENU_READY = Object.freeze({
    items: (owner, starter) => (owner.inventory.length > 0 || Object.values(owner.currencies).some((value) => value > 0)) && !starter,
    skills: (owner) => owner.skills.length > 1 || owner.supports.length > 0,
    codex: (owner) => (owner.inventory || []).some((item) => item && item.rarity === "unique") || Object.values(owner.equipment || {}).some((item) => item && item.rarity === "unique") || Object.keys(owner.uniqueCodex || {}).length > 0,
    map: (owner) => owner.maxZoneId >= 1,
    season: (owner) => owner.season > 1,
    traits: (owner) => (owner.completedTrials || []).length > 0 || owner.ascendPoints > 0 || !!owner.ascendClass
  });
  function takeMenuUnlock(owner, key, starter = null) {
    if (owner.unlocks[key] || !MENU_READY[key](owner, starter)) return false;
    owner.unlocks[key] = true;
    owner.noti[key] = true;
    return true;
  }
  function starterWeaponTarget(owner) {
    const id = owner.starterWeaponTutorialPending;
    if (id == null) return null;
    if (Object.values(owner.equipment || {}).some((item) => item && item.id === id)) {
      owner.starterWeaponTutorialPending = null;
      return null;
    }
    return (owner.inventory || []).find((item) => item && item.id === id) || null;
  }
  function jewelPanelReady(owner, bagItems2) {
    return (owner.season || 1) >= 5 || bagItems2.jewels(owner).length > 0 || ((owner.currencies || {}).jewelShard || 0) > 0;
  }
  function journalPanelReady(owner) {
    const entries = Array.isArray(owner.journalEntries) ? owner.journalEntries : [];
    return entries.some((id) => id && id !== "prologue") || !!(owner.unlocks && owner.unlocks.codex);
  }
  function takeBoundaryMenuReveal(owner, boundary) {
    if (!boundary.unlocked || boundary.unlockNoticeSeen) return false;
    boundary.unlockNoticeSeen = true;
    owner.noti.map = true;
    return true;
  }
  function takeInfusionUnlock(owner, available) {
    if (!available || owner.chaosInfuserUnlocked) return false;
    owner.chaosInfuserUnlocked = true;
    owner.noti.items = true;
    return true;
  }
  function takeFourthTrialUnlock(owner) {
    if (!(owner.level >= 100) || !(owner.completedTrials || []).includes("trial_3") || (owner.unlockedTrials || []).includes("trial_4")) return false;
    owner.unlockedTrials.push("trial_4");
    owner.noti.map = true;
    return true;
  }

  // modules/ui/content-menu-progression.mjs
  function getStarterWeaponTutorialTarget(runtime) {
    return starterWeaponTarget(runtime.deps.game);
  }
  function isJournalTabUnlockReady(runtime) {
    return journalPanelReady(runtime.deps.game);
  }
  function syncMenuUnlocks(runtime) {
    const { deps } = runtime;
    deps.storyJournalUi.sync();
    const owner = deps.game;
    if (runtime.state.menuOwner !== owner) cancelBoundaryReveal(runtime);
    runtime.state.menuOwner = owner;
    const starter = starterWeaponTarget(owner);
    if (typeof deps.stumpBoxUi === "object") deps.stumpBoxUi.checkStumpBoxUnlock();
    announceBasicBattle(runtime);
    unlockInventoryAndJewels(runtime, starter);
    deps.contentProgression.opening.sync(owner);
    runtime.handlers.announceStarterWeapon(starter);
    deps.queueStarterGuides(owner);
    takeMenuUnlock(owner, "skills");
    deps.tutorialActionUi.announceRune();
    unlockCodexAndMap(runtime);
    revealBoundary(runtime);
    if (takeMenuUnlock(owner, "season")) runtime.handlers.announceLoop();
    unlockTraitsAndInfusion(runtime);
    if (owner.level >= 200) deps.unlockJournalEntry("level_200");
    if (takeFourthTrialUnlock(owner)) deps.addLog(deps._t("🏛️ Lv.100 달성으로 4차 전직 미궁 시련이 개방되었습니다!"), "loot-unique");
    runtime.handlers.syncOpened();
    deps.detectNewMapUnlockAlarms();
    deps.announceMapPrimaryContentUnlocks();
  }
  function announceBasicBattle(runtime) {
    const { deps } = runtime;
    if (!(deps.game.seenTutorials || []).includes("tutorial_battle_basics")) {
      deps.queueTutorialNotice("tutorial_battle_basics", deps._t("첫 여정"), deps._t("전투는 자동입니다. 캐릭터가 알아서 걷고 공격합니다.\n지금 할 일은 오른쪽 위 ‘목표’에 나옵니다.\n생명 구슬이 자주 비면 장비와 저항을 점검하세요.\n장비나 룬을 얻으면 그때마다 조작을 안내합니다."));
    }
  }
  function unlockInventoryAndJewels(runtime, starter) {
    const { deps } = runtime;
    if (takeMenuUnlock(deps.game, "items", starter)) {
      deps.queueTutorialNotice("unlock_items", deps._t("첫 장비"), deps._t("장비나 제작 재화를 처음 얻었습니다.\n‘장비’에서 아이템을 눌러 지금 착용한 장비와 비교하고 착용하세요."), "tab-items");
    }
    if (jewelPanelReady(deps.game, deps.bagItems)) {
      deps.queueContentNotice("unlock_jewel", "주얼", "jewel", {
        open: "주얼을 모을 수 있게 되었습니다.\n장비를 선택해 [소켓]에서 주얼을 끼우세요. 반지, 목걸이, 허리띠에는 소켓이 처음부터 있습니다.",
        locked: "주얼과 주얼 결정을 모을 수 있게 되었습니다.\n‘해금’에서 주얼을 열면 장비 소켓에 끼울 수 있습니다."
      }, "tab-items");
    }
  }
  function unlockCodexAndMap(runtime) {
    const { deps } = runtime;
    if (takeMenuUnlock(deps.game, "codex")) {
      deps.queueContentNotice("unlock_codex", "첫 고유 장비", "codex", {
        open: "고유 장비를 처음 얻었습니다.\n‘기록 → 도감’에 등록하면 도감 보너스를 받습니다.",
        locked: "고유 장비를 처음 얻었습니다.\n고유 도감을 해금하면 등록해 도감 보너스를 얻습니다."
      }, "tab-codex");
    }
    if (takeMenuUnlock(deps.game, "map")) {
      deps.queueTutorialNotice("unlock_map", deps._t("지도 개방"), deps._t("다음 액트가 열렸습니다.\n‘지도’에서 지나온 액트로 돌아가 다시 사냥하거나, 마친 액트의 보상을 받을 수 있습니다."), "tab-map");
    }
  }
  function unlockTraitsAndInfusion(runtime) {
    const { deps } = runtime;
    if (takeMenuUnlock(deps.game, "traits")) {
      deps.queueContentNotice("unlock_traits", "전직", "trials", {
        open: "전직을 고를 수 있게 되었습니다.\n‘스킬트리 → 전직’에서 직업의 전직 셋 중 하나를 고르세요.\n전직 노드 포인트와 키스톤 포인트는 서로 다른 노드에 씁니다.",
        locked: "전직을 고를 수 있게 되었습니다.\n‘해금’에서 전직을 열면 전직을 고르고 전직 노드를 할당할 수 있습니다."
      }, "tab-traits");
    }
    if (typeof deps.isChaosInfuserUnlocked === "function" && takeInfusionUnlock(deps.game, deps.isChaosInfuserUnlocked())) {
      deps.addLog(deps._t("🧪 나무꾼의 흔적을 해석해 혼돈 주입이 열렸습니다. 장비 상세의 [주입]으로 희귀 장비에 한 줄을 더할 수 있습니다."), "loot-unique");
    }
  }
  function revealBoundary(runtime) {
    const { deps } = runtime;
    deps.reconcileBeyondBoundaryUnlock(deps.game);
    if (!takeBoundaryMenuReveal(deps.game, deps.ensureBeyondBoundaryState(deps.game))) return;
    const button = deps.document.getElementById("btn-map-explore-beyond");
    if (!button) return;
    cancelBoundaryReveal(runtime);
    button.style.display = "";
    button.classList.add("map-explore-tab-unlock-reveal");
    runtime.state.boundaryRevealButton = button;
    runtime.state.boundaryRevealTimer = deps.setTimeout(() => cancelBoundaryReveal(runtime), 1400);
  }
  function cancelBoundaryReveal(runtime) {
    runtime.deps.clearTimeout(runtime.state.boundaryRevealTimer);
    runtime.state.boundaryRevealTimer = null;
    runtime.state.boundaryRevealButton?.classList.remove("map-explore-tab-unlock-reveal");
    runtime.state.boundaryRevealButton = null;
  }

  // modules/ui/content-unlock-view.mjs
  function createContentUnlockView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    const handlers = { checkUnlocks: syncMenuUnlocks, getStarterWeaponTutorialTarget, isJournalTabUnlockReady, announceStarterWeapon, announceLoop, sync, syncOpeningHud, syncRuneLauncher, syncRoute, resetClosedSelection, roadmapAdditions, entryReward, lockAttribute, render, select, purchase, takeContent, routeAction, openSection, routeKey, journeyPath, journeyNotice, noticeContentId, journeyForNotice, noticeBody, announceJourney, announceOutsideChaos, canOpenProgressTarget, openProgressTarget, progressButton, announceContent, openedContents, announceOpenedSince, syncOpened, announceSettledUnlocks, npcNews, openNpc, renderNpc, npcModeBody, npcTalkBody, npcFoot, npcTopics, npcReachedAct, npcGreeting, npcHeard, hearNpcTopic, npcClick, npcPickTopic, open, view_art, view_listed, view_personal, view_npcHeardKey };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = ContentUnlockViewApi(runtime);
    installContentUnlockViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.CONTENT_ROUTE_PATHS = Object.freeze({
      "item-tab-equip": "장비 → 장비 창",
      "item-tab-craft": "장비 → 제작실",
      "item-tab-fossil": "장비 → 제작실",
      "tab-trade": "거래",
      "skill-tab-equip": "스킬룬 → 룬",
      "skill-tab-enhance": "스킬룬 → 각인",
      "skill-tab-condition": "스킬룬 → 전술",
      "tab-codex": "기록 → 도감",
      "tab-traits": "스킬트리 → 전직",
      "tab-char": "스킬트리",
      "tab-season": "루프 패시브",
      "tab-stump": "그루터기 함",
      "tab-talent": "재능",
      "tab-unlocks": "해금"
    });
  }
  function ContentUnlockViewApi(runtime) {
    const names = [
      "checkUnlocks",
      "getStarterWeaponTutorialTarget",
      "isJournalTabUnlockReady",
      "announceStarterWeapon",
      "announceLoop",
      "sync",
      "syncOpeningHud",
      "syncRuneLauncher",
      "syncRoute",
      "resetClosedSelection",
      "roadmapAdditions",
      "entryReward",
      "lockAttribute",
      "render",
      "select",
      "purchase",
      "takeContent",
      "routeAction",
      "openSection",
      "routeKey",
      "journeyPath",
      "journeyNotice",
      "noticeContentId",
      "journeyForNotice",
      "noticeBody",
      "announceJourney",
      "announceOutsideChaos",
      "canOpenProgressTarget",
      "openProgressTarget",
      "progressButton",
      "announceContent",
      "openedContents",
      "announceOpenedSince",
      "syncOpened",
      "announceSettledUnlocks",
      "npcNews",
      "openNpc",
      "renderNpc",
      "npcModeBody",
      "npcTalkBody",
      "npcFoot",
      "npcTopics",
      "npcReachedAct",
      "npcGreeting",
      "npcHeard",
      "hearNpcTopic",
      "npcClick",
      "npcPickTopic",
      "open"
    ];
    const api = Object.fromEntries(names.map((name) => [name, runtime.handlers[name]]));
    Object.defineProperties(api, Object.getOwnPropertyDescriptors(ContentUnlockViewFields(runtime)));
    api.dispose = () => disposeContentUnlockView(runtime);
    return api;
  }
  function ContentUnlockViewFields(runtime) {
    return {
      get art() {
        return runtime.handlers.view_art;
      },
      set art(value) {
        runtime.handlers.view_art = value;
      },
      get listed() {
        return runtime.handlers.view_listed;
      },
      set listed(value) {
        runtime.handlers.view_listed = value;
      },
      get personal() {
        return runtime.handlers.view_personal;
      },
      set personal(value) {
        runtime.handlers.view_personal = value;
      },
      get npcHeardKey() {
        return runtime.handlers.view_npcHeardKey;
      },
      set npcHeardKey(value) {
        runtime.handlers.view_npcHeardKey = value;
      }
    };
  }
  function installContentUnlockViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const progress = event.target.closest("[data-progress-target]");
      if (progress) runtime.api.openProgressTarget(progress.dataset.progressTarget);
      const button = event.target.closest("[data-unlock-content]");
      if (button && !button.disabled) runtime.api.purchase(button.dataset.unlockContent, button.closest(".unlock-detail") || runtime.deps.document);
      const open2 = event.target.closest("[data-open-content]");
      if (open2) runtime.api.open(open2.dataset.openContent);
    });
    listenView(runtime, runtime.deps.document, "error", (event) => {
      if (!(event.target instanceof runtime.deps.HTMLImageElement)) return;
      if (event.target.matches(".npc-dialog-portrait, .npc-roster-portrait")) event.target.remove();
    }, true);
  }
  function disposeContentUnlockView(runtime) {
    if (!runtime.active) return;
    closeNpcView(runtime);
    cancelBoundaryReveal(runtime);
    runtime.state.menuOwner = null;
    releaseViewEvents(runtime);
    cancelViewFrames(runtime);
  }

  // modules/content-progression-ui-classic.mjs
  var contentUnlockUi = createContentUnlockView({
    get storyJournalUi() {
      return storyJournalUi;
    },
    get stumpBoxUi() {
      return typeof stumpBoxUi === "object" ? stumpBoxUi : void 0;
    },
    get bagItems() {
      return bagItems;
    },
    get queueContentNotice() {
      return queueContentNotice;
    },
    get queueStarterGuides() {
      return queueStarterGuides;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get reconcileBeyondBoundaryUnlock() {
      return reconcileBeyondBoundaryUnlock;
    },
    get ensureBeyondBoundaryState() {
      return ensureBeyondBoundaryState;
    },
    get isChaosInfuserUnlocked() {
      return typeof isChaosInfuserUnlocked === "function" ? isChaosInfuserUnlocked : void 0;
    },
    get unlockJournalEntry() {
      return unlockJournalEntry;
    },
    get detectNewMapUnlockAlarms() {
      return detectNewMapUnlockAlarms;
    },
    get announceMapPrimaryContentUnlocks() {
      return announceMapPrimaryContentUnlocks;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get basicSkills() {
      return basicSkills;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get _t() {
      return _t;
    },
    get contentProgression() {
      return contentProgression;
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get document() {
      return document;
    },
    get getMergedTabGroup() {
      return getMergedTabGroup;
    },
    get getSelectedMergedTabId() {
      return getSelectedMergedTabId;
    },
    get SEASON_CONTENT_ROADMAP() {
      return SEASON_CONTENT_ROADMAP;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get unlockTabUi() {
      return typeof unlockTabUi === "undefined" ? void 0 : unlockTabUi;
    },
    get addLog() {
      return addLog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get saveGame() {
      return saveGame;
    },
    get refreshPassiveConnectivity() {
      return refreshPassiveConnectivity;
    },
    get disclosure() {
      return window.GameModules.uiRuntime.disclosure;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get hasCurrentLoopAbyssRequirementClear() {
      return hasCurrentLoopAbyssRequirementClear;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get switchTab() {
      return switchTab;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get tutorialQueue() {
      return tutorialQueue;
    },
    get NPC_CURRENCY_EXCHANGE() {
      return NPC_CURRENCY_EXCHANGE;
    },
    get systemTutorialUi() {
      return systemTutorialUi;
    },
    get STAGE_NPC_ART() {
      return STAGE_NPC_ART;
    },
    get npcShopUi() {
      return npcShopUi;
    },
    get orgaExchangeUi() {
      return orgaExchangeUi;
    },
    get STORY_NPCS() {
      return STORY_NPCS;
    },
    get STORY_ACT_ENCOUNTERS() {
      return STORY_ACT_ENCOUNTERS;
    },
    get switchItemSubtab() {
      return switchItemSubtab;
    },
    get switchSkillSubtab() {
      return switchSkillSubtab;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get atlasUi() {
      return atlasUi;
    },
    get HTMLImageElement() {
      return HTMLImageElement;
    }
  });
  safeExposeGlobals({
    contentUnlockUi,
    checkUnlocks: contentUnlockUi.checkUnlocks,
    getStarterWeaponTutorialTarget: contentUnlockUi.getStarterWeaponTutorialTarget,
    isJournalTabUnlockReady: contentUnlockUi.isJournalTabUnlockReady
  });
})();
