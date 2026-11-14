// GENERATED from modules/tutorial-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowMatchMedia = (...args) => globalThis.matchMedia(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/tutorial-timers.mjs
  function scheduleTutorialTimer(runtime, callback, delay) {
    if (!runtime.active) return null;
    const owner = runtime.deps.game;
    const handle = runtime.deps.setTimeout(() => {
      runtime.timers.delete(handle);
      if (runtime.active && runtime.deps.game === owner) callback();
    }, delay);
    runtime.timers.add(handle);
    return handle;
  }
  function clearTutorialTimers(runtime) {
    for (const handle of runtime.timers) runtime.deps.clearTimeout(handle);
    runtime.timers.clear();
  }

  // modules/ui/tutorial-placement.mjs
  function rectsOverlap(runtime, a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }
  function tutorialSamePlacement(runtime, placed, next) {
    return !!placed && placed.target === next.target && placed.pinned === next.pinned;
  }
  function tutorialRectOf(runtime, box) {
    return { left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height };
  }
  function tutorialRectFits(runtime, box) {
    const edge = runtime.state.TUTORIAL_CARD_EDGE;
    return box.left >= edge && box.top >= edge && box.left + box.width <= runtime.deps.innerWidth - edge && box.top + box.height <= runtime.deps.innerHeight - edge;
  }
  function tutorialVisibleRects(runtime, selectors) {
    return selectors.map((selector) => runtime.deps.document.querySelector(selector)).filter((node) => node && node.getClientRects().length).map((node) => node.getBoundingClientRect());
  }
  function tutorialCardSpots(runtime, focus, target, home) {
    const width = home.width, height = home.height, gap = runtime.state.TUTORIAL_CARD_GAP;
    const frame = target.closest(".ui-window-open");
    const pane = frame ? frame.getBoundingClientRect() : null;
    const row = Math.max(runtime.state.TUTORIAL_CARD_EDGE, Math.min(home.bottom - height, focus.top));
    const column = Math.max(runtime.state.TUTORIAL_CARD_EDGE, Math.min(runtime.deps.innerWidth - runtime.state.TUTORIAL_CARD_EDGE - width, focus.left));
    const spots = [
      ...pane ? [{ left: pane.left - gap - width, top: row }, { left: pane.right + gap, top: row }] : [],
      { left: focus.left - gap - width, top: row },
      { left: focus.right + gap, top: row },
      { left: column, top: focus.bottom + gap },
      { left: column, top: focus.top - gap - height },
      { left: home.left, top: home.top }
    ];
    return spots.map((spot) => tutorialRectOf(runtime, { ...spot, width, height })).filter((rect) => rect.left >= runtime.state.TUTORIAL_CARD_EDGE && rect.top >= runtime.state.TUTORIAL_CARD_EDGE && rect.right <= runtime.deps.innerWidth - runtime.state.TUTORIAL_CARD_EDGE && rect.bottom <= home.bottom);
  }
  function revealTutorialTarget(runtime, target) {
    const scroller = tutorialScrollParent(runtime, target);
    if (scroller) scroller.scrollTop = 0;
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (scroller && scroller.classList.contains("ui-window-body")) tidyTutorialScroll(runtime, scroller, target);
  }
  function tutorialScrollParent(runtime, node) {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (parent.scrollHeight > parent.clientHeight && /(auto|scroll)/.test((0, runtime.deps.getComputedStyle)(parent).overflowY)) return parent;
    }
    return null;
  }
  function tidyTutorialScroll(runtime, scroller, target) {
    const offset = scroller.scrollTop, top = scroller.getBoundingClientRect().top + scroller.clientTop;
    const span = (node) => {
      const rect = node.getBoundingClientRect();
      return { start: offset + rect.top - top, end: offset + rect.bottom - top };
    };
    const rows = [...scroller.children].filter((node) => node.getClientRects().length).map(span);
    const index = rows.findIndex((row) => row.end > offset), cut = rows[index], next = rows[index + 1];
    if (!offset || !cut || cut.start >= offset || !next) return;
    const clean = Math.max(cut.end, next.start - (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(scroller).paddingTop));
    if (clean <= span(target).start) scroller.scrollTop = clean;
  }
  function tutorialShown(runtime, node) {
    return !!(node && node.classList && node.getClientRects && node.getClientRects().length);
  }
  function tutorialMenuButtons(runtime, tabId) {
    const own = runtime.deps.document.getElementById(`btn-${tabId}`);
    if (tutorialShown(runtime, own)) return [own];
    const group = typeof runtime.deps.getMergedTabGroup === "function" ? (0, runtime.deps.getMergedTabGroup)(tabId) : null;
    const ids = [group ? `btn-${group[1].launcher}` : "", ...runtime.state.TUTORIAL_MENU_OPENERS];
    const opener = ids.map((id) => id ? runtime.deps.document.getElementById(id) : null).find(runtime.handlers.tutorialShown) || null;
    return [own, opener].filter((node) => node && node.classList);
  }
  function clearTutorialCallout(runtime) {
    (0, runtime.deps.clearTimeout)(runtime.state.tutorialCalloutTimer);
    runtime.timers.delete(runtime.state.tutorialCalloutTimer);
    runtime.state.tutorialCalloutTimer = null;
    runtime.state.tutorialCallouts.forEach((node) => node.classList.remove("tutorial-callout"));
    runtime.state.tutorialCallouts = [];
  }
  function setTutorialCallout(runtime, tabId, holdMs) {
    clearTutorialCallout(runtime);
    runtime.state.tutorialCallouts = tabId ? tutorialMenuButtons(runtime, tabId) : [];
    runtime.state.tutorialCallouts.forEach((node) => node.classList.add("tutorial-callout"));
    if (holdMs && runtime.state.tutorialCallouts.length) runtime.state.tutorialCalloutTimer = scheduleTutorialTimer(runtime, runtime.handlers.clearTutorialCallout, holdMs);
  }
  function placeTutorialCard(runtime) {
    const overlay = runtime.deps.document.getElementById("tutorial-overlay");
    if (!overlay || !overlay.style) return;
    const hud = runtime.deps.document.querySelector(".combat-top-status.player-hud"), orb = runtime.deps.document.getElementById("ui-hp-bar");
    const rect = hud ? hud.getBoundingClientRect() : null;
    if (!rect || !rect.width || runtime.deps.uiDisplay.matches("(max-width: 1080px)")) {
      overlay.style.removeProperty("--tutorial-anchor-left");
      overlay.style.removeProperty("--tutorial-anchor-bottom");
      return;
    }
    const factor = runtime.deps.uiDisplay.factor || 1, viewWidth = runtime.deps.window.innerWidth / factor, width = Math.min(420, viewWidth - 24);
    const top = Math.min(rect.top, orb ? orb.getBoundingClientRect().top : rect.top) / factor;
    const centred = Math.max(12, Math.min(viewWidth - width - 12, (rect.left + rect.width / 2) / factor - width / 2));
    const left = tutorialLeftClearOfWindows(runtime, centred, width, factor);
    overlay.style.setProperty("--tutorial-anchor-left", `${Math.round(left)}px`);
    overlay.style.setProperty("--tutorial-anchor-bottom", `${Math.round(runtime.deps.window.innerHeight / factor - top + 10)}px`);
  }
  function tutorialLeftClearOfWindows(runtime, left, width, factor) {
    let limit = Infinity;
    runtime.deps.document.querySelectorAll(".tab-content.ui-window.ui-window-open").forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width && rect.left / factor < left + width && rect.right / factor > left) limit = Math.min(limit, rect.left / factor);
    });
    return limit !== Infinity && limit - width - 12 >= 12 ? Math.min(left, limit - width - 12) : left;
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

  // modules/ui/story-journal-markup.mjs
  function sceneCopy({ deps }, scene) {
    const quote = typeof deps.STORY_SCENE_QUOTES === "object" && scene.id ? deps.STORY_SCENE_QUOTES[scene.id] : null;
    const narration = scene.lines.map((line) => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join("");
    if (!quote) return narration;
    const spoken = `<blockquote class="story-scene-quote">${quote.lines.map((line) => `<p>${deps.escapeHTML(deps._t(line))}</p>`).join("")}</blockquote>`;
    return quote.before ? spoken + narration : narration + spoken;
  }
  function sceneHeading({ deps }, scene) {
    const kicker = scene.act ? deps._t("액트 {act}", { act: scene.act }) : deps._t("프롤로그");
    const prefix = kicker + ", ", title = deps._t(scene.title);
    return { kicker, title: title.startsWith(prefix) ? title.slice(prefix.length) : title };
  }
  function renderStoryTutorial(runtime, notice) {
    const { deps } = runtime, doc = deps.document;
    const scene = deps.STORY_JOURNAL_SCENES.find((row) => "story_" + row.id === notice.key);
    const overlay = doc.getElementById("tutorial-overlay");
    overlay.classList.toggle("is-story-scene", !!scene);
    overlay.classList.toggle("is-story-text", !!scene && !scene.image);
    doc.getElementById("tutorial-journal-preference").hidden = !scene || !scene.act;
    doc.getElementById("chk-hide-act-journal").checked = deps.game.settings.showActJournal === false;
    if (!scene) return false;
    const heading = sceneHeading(runtime, scene);
    doc.getElementById("tutorial-kicker").textContent = heading.kicker;
    doc.getElementById("tutorial-title").textContent = deps._t(heading.title);
    const art = scene.image ? `<img class="story-scene-art" src="${scene.image}" alt="${deps.escapeHTML(deps._t(scene.title))}" decoding="async">` : "";
    doc.getElementById("tutorial-body").innerHTML = `${art}
            <div class="story-scene-copy">${sceneCopy(runtime, scene)}</div>`;
    doc.getElementById("tutorial-open-btn").style.display = "none";
    doc.getElementById("tutorial-dismiss-btn").textContent = deps._t("계속");
    return true;
  }

  // modules/ui/tutorial-notice-markup.mjs
  function tutorialNoticeKind(runtime, notice) {
    if (runtime.state.TUTORIAL_START_KEYS.has(notice.key)) return "start";
    if (String(notice.key).startsWith("notice_")) return "notice";
    return String(notice.key).startsWith("unlock_content_loop_") ? "loop" : "content";
  }
  function tutorialMarkup(runtime, line) {
    return (0, runtime.deps.escapeHTML)(line).replace(/‘([^’]+)’/g, '<span class="tutorial-ui">$1</span>').replace(/\[([^\]]+)\]/g, '<span class="tutorial-name">[$1]</span>');
  }
  function tutorialQuoteHtml(runtime, lore) {
    if (!lore || !lore.quote) return "";
    return `<blockquote class="story-scene-quote"><p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.quote))} - ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)((0, runtime.deps.speakerShortName)(lore.speaker)))}</p></blockquote>`;
  }
  function tutorialBodyHtml(runtime, body, params) {
    const [lead = "", ...rest] = (0, runtime.deps._t)(String(body || ""), params).split("\n").map((line) => line.trim()).filter(Boolean);
    const head = `<p class="tutorial-summary">${tutorialMarkup(runtime, lead)}</p>`;
    if (!rest.length) return head;
    if (rest.some((line) => /^[\u201c"]/.test(line))) return head + rest.map((line) => `<p class="tutorial-line">${tutorialMarkup(runtime, line)}</p>`).join("");
    return head + `<ul class="tutorial-steps">${rest.map((line) => `<li>${tutorialMarkup(runtime, line)}</li>`).join("")}</ul>`;
  }
  function tutorialOpenLabel(runtime, notice) {
    if (coachGuideFor(runtime, notice.key)) return (0, runtime.deps._t)("따라 해보기");
    if (notice.openLabel) return (0, runtime.deps._t)(notice.openLabel);
    const name = runtime.state.TUTORIAL_TAB_NAMES[notice.tabId];
    return name ? (0, runtime.deps._t)("{name} 열기", { name: (0, runtime.deps._t)(name) }) : (0, runtime.deps._t)("화면 열기");
  }
  function syncTutorialQueueCount(runtime) {
    let count = runtime.deps.document.getElementById("tutorial-queue-count");
    const card = count ? null : runtime.deps.document.querySelector?.("#tutorial-overlay .tutorial-card");
    if (card) {
      count = runtime.deps.document.createElement("span");
      count.id = "tutorial-queue-count";
      count.className = "tutorial-queue-count";
      card.prepend(count);
    }
    if (!count) return;
    const waiting = runtime.deps.tutorialQueue.filter(runtime.handlers.tutorialNoticeAllowed).length;
    count.hidden = waiting === 0;
    count.textContent = waiting ? (0, runtime.deps._t)("다음 안내 {waiting}", { waiting }) : "";
  }
  function renderTutorialStep(runtime) {
    releaseViewTarget(runtime, runtime.state.pauseToggle);
    runtime.state.pauseToggle = null;
    if (!runtime.deps.activeTutorial) return;
    const owner = runtime.deps.game, notice = runtime.deps.activeTutorial;
    runtime.state.notice = notice;
    if (renderStoryTutorial(runtime, runtime.deps.activeTutorial)) return;
    const kind = tutorialNoticeKind(runtime, runtime.deps.activeTutorial), overlay = runtime.deps.document.getElementById("tutorial-overlay");
    if (overlay.dataset) overlay.dataset.noticeKind = kind;
    runtime.deps.document.getElementById("tutorial-kicker").innerText = (0, runtime.deps._t)(runtime.state.TUTORIAL_KIND_LABELS[kind]);
    runtime.deps.document.getElementById("tutorial-title").innerText = (0, runtime.deps._t)(runtime.deps.activeTutorial.title);
    syncTutorialQueueCount(runtime);
    let pauseEnabled = runtime.deps.game.settings.pauseGameOnOverlay !== false;
    let pauseControl = runtime.deps.activeTutorial.key === "tutorial_battle_basics" ? `
        <label class="cfg-toggle tutorial-pause-toggle">
            <input type="checkbox" id="tutorial-pause-overlay-toggle" ${pauseEnabled ? "checked" : ""}>
            <span class="cfg-label"><b>${(0, runtime.deps._t)("안내 중 전투 일시 정지")}</b><small>${(0, runtime.deps._t)("이후 {settingsMenuPath}에서 언제든 변경할 수 있습니다.", { settingsMenuPath: settingsMenuPath(runtime) })}</small></span>
            <strong id="tutorial-pause-overlay-status">${pauseEnabled ? (0, runtime.deps._t)("켜짐") : (0, runtime.deps._t)("꺼짐")}</strong>
        </label>` : "";
    runtime.deps.document.getElementById("tutorial-body").innerHTML = coachNoticeBody(runtime, runtime.deps.activeTutorial, pauseControl);
    let pauseToggle = runtime.deps.document.getElementById("tutorial-pause-overlay-toggle");
    if (pauseToggle) {
      runtime.state.pauseToggle = pauseToggle;
      pauseToggle.checked = pauseEnabled;
      listenView(runtime, pauseToggle, "change", () => {
        if (!runtime.active || runtime.deps.game !== owner || runtime.deps.activeTutorial !== notice || !pauseToggle.isConnected) return;
        let enabled = !!pauseToggle.checked;
        runtime.deps.game.settings.pauseGameOnOverlay = enabled;
        let settingsToggle = runtime.deps.document.getElementById("chk-pause-overlay");
        let status = runtime.deps.document.getElementById("tutorial-pause-overlay-status");
        if (settingsToggle) settingsToggle.checked = enabled;
        if (status) status.innerText = enabled ? (0, runtime.deps._t)("켜짐") : (0, runtime.deps._t)("꺼짐");
        if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(0);
      });
    }
    const hasShortcut = !!runtime.deps.activeTutorial.tabId || !!runtime.deps.activeTutorial.subtabId;
    const openButton = runtime.deps.document.getElementById("tutorial-open-btn");
    const dismissButton = runtime.deps.document.getElementById("tutorial-dismiss-btn");
    openButton.style.display = hasShortcut ? "inline-block" : "none";
    openButton.innerHTML = `<span class="px-center">${(0, runtime.deps.escapeHTML)(tutorialOpenLabel(runtime, runtime.deps.activeTutorial))}</span>`;
    dismissButton.innerText = (0, runtime.deps._t)("확인");
  }
  function settingsMenuPath(runtime) {
    return (0, runtime.deps._t)((0, runtime.deps.isMobilePrimaryNavigationEnabled)() ? "전체 → 설정" : "기타 → 설정");
  }
  function coachNoticeBody(runtime, notice, controls) {
    const journey = runtime.deps.contentUnlockUi.journeyForNotice(notice);
    const body = runtime.deps.EXPLORATION_REGIONS.guides[journey] ? runtime.deps.contentUnlockUi.journeyNotice(journey) : notice.key === "tutorial_first_passive" ? runtime.state.coachGuides.unlock_char.body : notice.body;
    return tutorialQuoteHtml(runtime, notice.quote) + tutorialBodyHtml(runtime, body, notice.bodyParams) + controls.trim();
  }
  function coachGuideFor(runtime, key) {
    const guideKey = runtime.state.coachAliases[key] || key;
    const guide = Object.hasOwn(runtime.state.coachGuides, guideKey) ? runtime.state.coachGuides[guideKey] : null;
    return guide && (!guide.available || guide.available()) ? guide : null;
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

  // modules/domain/story-scenes.mjs
  function storySceneAllowsNotice(owner, key) {
    return !key.startsWith("story_act_") || owner.settings.showActJournal !== false;
  }

  // modules/ui/tutorial-coach-card.mjs
  function coachRefreshText(runtime) {
    if (!runtime.state.coachActive || !runtime.state.coachCard) return;
    const { guide, step } = runtime.state.coachActive;
    const count = runtime.state.coachCard.querySelector("[data-step]");
    runtime.state.coachCard.setAttribute("aria-label", (0, runtime.deps._t)("플레이 안내"));
    runtime.state.coachCard.querySelector("strong").textContent = (0, runtime.deps._t)(guide.title);
    count.hidden = !step?.total || step.total < 2;
    count.textContent = count.hidden ? "" : (0, runtime.deps._t)("{step} / {total}단계", { step: step.number, total: step.total });
    runtime.state.coachCard.querySelector("p").innerHTML = tutorialMarkup(runtime, (0, runtime.deps._t)(step?.body || guide.body));
    runtime.state.coachCard.querySelector("[data-open]").textContent = (0, runtime.deps._t)("이어 하기");
    runtime.state.coachCard.querySelector("[data-skip]").textContent = (0, runtime.deps._t)("안내 닫기");
  }
  function coachEnsureCard(runtime) {
    if (runtime.state.coachCard) {
      if (!runtime.state.coachCard.isConnected) runtime.deps.document.body.appendChild(runtime.state.coachCard);
      return;
    }
    const card = runtime.deps.document.createElement("aside");
    card.id = "tutorial-action-card";
    card.className = "tutorial-action-card";
    card.setAttribute("aria-label", (0, runtime.deps._t)("플레이 안내"));
    card.innerHTML = '<small data-step hidden></small><strong></strong><p id="tutorial-action-description" aria-live="polite"></p><div><button type="button" data-open hidden></button><button type="button" data-skip></button></div>';
    listenView(runtime, card.querySelector("[data-open]"), "click", runtime.handlers.coachOpenTarget);
    listenView(runtime, card.querySelector("[data-skip]"), "click", () => runtime.handlers.coachFinish(false, runtime.state.coachActive?.notice.replay));
    runtime.deps.document.body.appendChild(card);
    runtime.state.coachCard = card;
  }
  function coachDockCard(runtime, target, step) {
    const anchor = target && coachInlineGuideAnchor(runtime, target, step);
    if (!anchor || !coachCanDockCard(runtime, anchor, step)) {
      coachFloatCard(runtime);
      return false;
    }
    const card = runtime.state.coachCard;
    if (card.classList.contains("is-docked") && runtime.state.coachDockAnchor === anchor && card.isConnected) return true;
    card.classList.add("is-docked");
    if (step.inline) anchor.after(card);
    else anchor.before(card);
    runtime.state.coachDockAnchor = anchor;
    coachRest(runtime);
    return true;
  }
  function coachCanDockCard(runtime, anchor, step) {
    return step.dock || runtime.deps.uiDisplay.matches("(max-width: 1080px)") || !!anchor.closest("dialog[open], #gem-slot-dialog, #gem-engrave-slot-overlay");
  }
  function coachFloatCard(runtime) {
    if (!runtime.state.coachCard.classList.contains("is-docked")) return;
    runtime.state.coachCard.classList.remove("is-docked");
    runtime.deps.document.body.appendChild(runtime.state.coachCard);
    runtime.state.coachDockAnchor = null;
    coachRest(runtime);
  }
  function coachInlineGuideAnchor(runtime, target, step) {
    if (!step) return null;
    if (step.inline) return runtime.deps.document.querySelector(step.inline);
    return target?.closest("#passive-mobile-detail [data-passive-confirm], .cl-method-use, .cl-action, .npc-dialog-shop, .shop-deal-actions, #stump-placement-preview .stump-actions");
  }
  function coachLeftGuideContext(runtime, action) {
    return action.contextual && action.guide.view && !action.guide.view();
  }
  function coachRevealStep(runtime, action, target, docked) {
    if (action.revealedStep === action.step) return;
    action.revealedStep = action.step;
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (docked) runtime.state.coachCard.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function coachPlaceCard(runtime, target, fresh) {
    const guide = runtime.state.coachActive.guide, pinned = guide.focus ? guide.focus(target) : null;
    const focus = pinned || target.getBoundingClientRect(), avoid = coachAvoidRects(runtime, focus, target, fresh);
    const placed = { target, pinned: !!pinned };
    if (!fresh && tutorialSamePlacement(runtime, runtime.state.coachPlacedFor, placed) && coachKeepsClear(runtime, avoid)) return;
    const home = coachHomeRect(runtime);
    const spot = tutorialCardSpots(runtime, focus, target, home).find((rect) => !avoid.some((other) => rectsOverlap(runtime, rect, other)));
    runtime.state.coachPlacedFor = placed;
    runtime.state.coachCard.classList.toggle("is-covered", !spot);
    if (!spot) return;
    const factor = runtime.deps.uiDisplay.factor || 1, style = runtime.state.coachCard.style;
    style.left = `${spot.left / factor}px`;
    style.top = `${spot.top / factor}px`;
    style.right = style.bottom = "auto";
  }
  function coachAvoidRects(runtime, focus, target, withTooltips) {
    const rects = tutorialVisibleRects(runtime, runtime.state.coachActive.guide.keepClear || []);
    const popover = target.closest(":popover-open");
    if (popover) rects.push(popover.getBoundingClientRect());
    if (focus.height <= runtime.deps.innerHeight / 2) rects.push(focus);
    if (withTooltips) rects.push(...tutorialVisibleRects(runtime, runtime.state.TUTORIAL_TOOLTIPS));
    rects.push(...tutorialVisibleRects(runtime, [".guide-replay-bar"]));
    return rects;
  }
  function coachKeepsClear(runtime, avoid) {
    const box = runtime.state.coachCard.getBoundingClientRect();
    if (runtime.state.coachCard.classList.contains("is-covered") || box.top < 0 || box.bottom > runtime.deps.innerHeight) return false;
    return !avoid.some((rect) => rectsOverlap(runtime, box, rect));
  }
  function coachHomeRect(runtime) {
    const style = runtime.state.coachCard.style;
    style.left = style.top = style.right = style.bottom = "";
    return runtime.state.coachCard.getBoundingClientRect();
  }
  function coachRest(runtime) {
    runtime.state.coachPlacedFor = null;
    runtime.state.coachCard.classList.remove("is-covered");
    coachHomeRect(runtime);
  }
  function coachHushHover(runtime) {
    coachUnhush(runtime);
    if (!(0, runtime.deps.matchMedia)("(hover: hover)").matches) return;
    const at = { x: runtime.deps.mouseX, y: runtime.deps.mouseY };
    const wake = (event) => {
      if (event.type !== "pointermove" || event.clientX !== at.x || event.clientY !== at.y) coachUnhush(runtime);
    };
    runtime.state.coachHush = { at, wake };
    runtime.state.TUTORIAL_HUSH_WAKERS.forEach((type) => runtime.deps.window.addEventListener(type, wake, true));
  }
  function coachUnhush(runtime) {
    if (!runtime.state.coachHush) return;
    runtime.state.TUTORIAL_HUSH_WAKERS.forEach((type) => runtime.deps.window.removeEventListener(type, runtime.state.coachHush.wake, true));
    runtime.state.coachHush = null;
  }
  function coachHushesTooltipAt(runtime, x, y) {
    return !!runtime.state.coachHush && x === runtime.state.coachHush.at.x && y === runtime.state.coachHush.at.y;
  }
  function coachClearTooltipSpot(runtime, spot, x, y) {
    const card = runtime.state.coachCard;
    if (!runtime.state.coachActive || card.hidden || (0, runtime.deps.getComputedStyle)(card).visibility !== "visible") return spot;
    const box = card.getBoundingClientRect();
    const left = x - spot.width - 18, top = y - spot.height - 18;
    const sides = [spot, { ...spot, left }, { ...spot, top }, { ...spot, left, top }, { ...spot, left: x + 18 }, { ...spot, top: y + 18 }];
    return sides.find((side) => tutorialRectFits(runtime, side) && !rectsOverlap(runtime, box, tutorialRectOf(runtime, side))) || spot;
  }
  function coachFindTarget(runtime, selectors) {
    for (const selector of [].concat(selectors)) {
      const found = [...runtime.deps.document.querySelectorAll(selector)].find((el) => el.getClientRects().length);
      if (found) return found;
    }
    return null;
  }
  function coachSetGuideTarget(runtime, target) {
    if (target === runtime.state.coachHighlighted) return;
    coachClearHighlight(runtime);
    if (!target) return;
    target.classList.add("tutorial-action-target");
    const describedBy = target.getAttribute("aria-describedby") || "";
    target.setAttribute("aria-describedby", (describedBy + " tutorial-action-description").trim());
    runtime.state.coachHighlighted = target;
  }
  function coachClearHighlight(runtime) {
    const target = runtime.state.coachHighlighted;
    if (!target) return;
    target.classList.remove("tutorial-action-target");
    const ids = (target.getAttribute("aria-describedby") || "").split(" ").filter((id) => id !== "tutorial-action-description");
    if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
    else target.removeAttribute("aria-describedby");
    runtime.state.coachHighlighted = null;
  }

  // modules/ui/tutorial-notice-flow.mjs
  function openTutorialTarget(runtime, notice) {
    if (notice.key === runtime.deps.EXPLORATION_REGIONS.guides["outside-chaos"].noticeKey) {
      return runtime.deps.contentUnlockUi.openProgressTarget("outside-chaos");
    }
    const contentId = runtime.deps.contentUnlockUi.noticeContentId(notice);
    if (contentId && runtime.deps.contentUnlockUi.open(contentId)) return;
    openSavedTutorialRoute(runtime, notice);
  }
  function openSavedTutorialRoute(runtime, notice) {
    const { tabId, subtabId } = notice;
    if (tabId) (0, runtime.deps.switchTab)(tabId, { keepWindowOpen: true });
    if (subtabId && tabId === "tab-items") (0, runtime.deps.switchItemSubtab)(subtabId);
    if (subtabId && tabId === "tab-map") {
      openMapTutorialTarget(runtime, subtabId);
      runtime.deps.explorationAtlasUi.openEntryPage(subtabId);
    }
    if (notice.atlasView && typeof runtime.deps.atlasUi === "object") runtime.deps.atlasUi.setView(notice.atlasView);
  }
  function openMapTutorialTarget(runtime, subtabId) {
    if (!subtabId.startsWith("map-explore-")) return (0, runtime.deps.switchMapSubtab)(subtabId);
    (0, runtime.deps.switchMapSubtab)("map-tab-zones");
    (0, runtime.deps.switchMapExploreSubtab)(subtabId);
  }
  function tutorialWaitsForTitleCard(runtime) {
    const next = runtime.deps.tutorialQueue[0];
    if (!next || String(next.key).startsWith("story_")) return false;
    return typeof runtime.deps.actTitleCard === "object" && typeof runtime.deps.actTitleCard.busy === "function" && runtime.deps.actTitleCard.busy();
  }
  function isTutorialPresentationBlocked(runtime) {
    if (runtime.deps.game.pendingLoopHeroSelection || runtime.deps.game.pendingLoopReady || runtime.deps.game.pendingLoopDecision) return true;
    if (runtime.deps.backgroundCombatRuntime.processing || runtime.deps.document.getElementById("background-combat-result-overlay")) return true;
    if (tutorialWaitsForTitleCard(runtime) || tutorialYieldsToMenus(runtime) || tutorialWaitsForReward(runtime)) return true;
    return ["isStartupOverlayOpen", "isLoadingOverlayOpen", "isRewardOpen", "isDeathOverlayOpen", "isLoopHeroSelectOpen", "isOpeningIntroOpen"].some((name) => typeof runtime.deps.window[name] === "function" && runtime.deps.window[name]());
  }
  function yieldTutorialCardToResult(runtime) {
    if (!runtime.deps.activeTutorial) return;
    runtime.deps.tutorialQueue.unshift(runtime.deps.activeTutorial);
    runtime.deps.document.getElementById("tutorial-overlay")?.classList.remove("active");
    clearTutorialCallout(runtime);
    runtime.deps.activeTutorial = null;
    runtime.deps.activeTutorialStep = 0;
  }
  function tutorialYieldsToMenus(runtime) {
    return runtime.deps.document.body.classList.contains("mobile-tab-drawer-open") || !!runtime.deps.document.querySelector("dialog:modal, .selection-overlay, .game-choice-overlay");
  }
  function refreshTutorialCardPlacement(runtime) {
    if (!runtime.deps.activeTutorial) return;
    const signature = [...runtime.deps.document.querySelectorAll(".tab-content.ui-window.ui-window-open")].map((node) => node.id).join(",");
    if (signature === runtime.state.tutorialCardWindowSignature) return;
    runtime.state.tutorialCardWindowSignature = signature;
    placeTutorialCard(runtime);
  }
  function tutorialNoticeAllowed(runtime, notice) {
    if (notice.key === "unlock_map" && (runtime.deps.game.claimedActRewards || []).includes(0)) return false;
    if (notice.key === "tutorial_passive_tree_unlock" && runtime.deps.contentProgression.isUnlocked("passiveTree")) return false;
    if (notice.key === "tutorial_first_passive" && runtime.deps.game.passives.length > 0) return false;
    return storySceneAllowsNotice(runtime.deps.game, notice.key) && runtime.deps.contentProgression.canOpen(notice.tabId) && runtime.deps.contentProgression.canOpen(notice.subtabId);
  }
  function tutorialWaitsForReward(runtime) {
    return !!runtime.deps.tutorialQueue[0] && !String(runtime.deps.tutorialQueue[0].key).startsWith("story_") && (0, runtime.deps.actRewardPromptPending)();
  }
  function tutorialQueueIsHeld(runtime) {
    return coachHoldsQueue(runtime) || runtime.deps.Date.now() < runtime.state.coachQuietUntil;
  }
  function saveTutorialHistoryChange(runtime) {
    const revision = runtime.deps.window.GameModules.state.tutorials.revision;
    if (revision === runtime.state.savedTutorialRevision || typeof runtime.deps.isStartupOverlayOpen === "function" && (0, runtime.deps.isStartupOverlayOpen)()) return;
    runtime.state.savedTutorialRevision = revision;
    (0, runtime.deps.queueImportantSave)(0);
  }
  function ownsWeaponBlockedRune(runtime, state) {
    if (!state.loopStarterWeaponGranted || state.starterWeaponTutorialPending != null) return false;
    const stance = (0, runtime.deps.getEquippedWeaponStance)();
    return !!state.weaponBlockedSkill || (state.skills || []).some((name) => !(0, runtime.deps.isSkillRuneUsableWithStance)(name, stance));
  }
  function queueStarterGuides(runtime, state) {
    queuePassiveTreeGuides(runtime, state);
    if ((state.season || 1) > 1 || (state.loopCount || 0) > 0) return;
    runtime.deps.contentProgression.opening.sync(state);
    const seen = state.seenTutorials || [];
    runtime.state.TUTORIAL_STARTER_GUIDES.filter((guide) => !seen.includes(guide.seenAs) && runtime.deps.contentProgression.opening.canOpen(state, guide.tabId) && guide.starterDue(state)).forEach((guide) => (0, runtime.deps.queueTutorialNotice)(guide.key, guide.title, guide.body, guide.tabId));
  }
  function queuePassiveTreeGuides(runtime, state) {
    if (state.season < 2) return;
    if (!runtime.deps.contentProgression.canOpen("tab-char", state)) {
      if (state.season === 2) (0, runtime.deps.queueTutorialNotice)(
        "tutorial_passive_tree_unlock",
        (0, runtime.deps._t)("스킬트리 해금"),
        (0, runtime.deps._t)("해금 포인트 1점을 써서 스킬트리를 여세요."),
        "tab-unlocks"
      );
      return;
    }
    if (state.level < 2 || state.passivePoints < 1 || state.passives.length) return;
    if (state.seenTutorials.includes("tutorial_first_passive") || state.seenTutorials.includes("unlock_char")) return;
    (0, runtime.deps.queueTutorialNotice)(
      "tutorial_first_passive",
      (0, runtime.deps._t)("첫 스킬트리 포인트"),
      (0, runtime.deps._t)("시작점 옆에 빛나는 노드 하나를 골라 1포인트를 쓰세요."),
      "tab-char"
    );
  }
  function advanceTutorial(runtime) {
    if (!runtime.deps.activeTutorial) return;
    dismissTutorial(runtime, true);
  }
  function equipSkippedStarterWeapon(runtime, key) {
    const item = (0, runtime.deps.getStarterWeaponTutorialTarget)();
    if (key !== runtime.deps.basicSkills.weaponGuide || !item) return;
    if ((0, runtime.deps.equipItemById)(item.id)) (0, runtime.deps.showGameToast)((0, runtime.deps._t)("[{name}] 무기를 장착했습니다, '장비'에서 바꿀 수 있습니다", { name: (0, runtime.deps._t)(item.name) }), { tone: "success" });
    runtime.deps.game.starterWeaponTutorialPending = null;
  }
  function applySkippedGuide(runtime, key) {
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) return;
    equipSkippedStarterWeapon(runtime, key);
    plantSkippedStumpStarter(runtime, key);
  }
  function plantSkippedStumpStarter(runtime, key) {
    if (!runtime.state.TUTORIAL_GUIDED_CONTENT_KEYS.has(key) || !runtime.deps.game.stumpBox || !runtime.deps.game.stumpBox.acquired) return;
    if (runtime.deps.stumpBox.plantStored(runtime.deps.game) > 0) (0, runtime.deps.showGameToast)((0, runtime.deps._t)("그루터기 함: 받은 씨앗을 배치했습니다"), { tone: "success" });
  }
  function discardQueuedNotices(runtime) {
    runtime.deps.tutorialQueue.length = 0;
    runtime.deps.window.GameModules.state.tutorials.reset();
    coachFinish(runtime, false, true);
    if (!runtime.deps.activeTutorial) return;
    runtime.deps.document.getElementById("tutorial-overlay").classList.remove("active");
    runtime.deps.activeTutorial = null;
    runtime.deps.activeTutorialStep = 0;
  }
  function dismissTutorial(runtime, openTarget, status = "read") {
    if (!runtime.deps.activeTutorial) return;
    const notice = runtime.deps.activeTutorial, tabId = notice.tabId;
    runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, notice.key, status);
    runtime.deps.document.getElementById("tutorial-overlay").classList.remove("active");
    runtime.deps.activeTutorial = null;
    runtime.deps.activeTutorialStep = 0;
    runtime.deps.window.GameModules.state.session.lastTime = runtime.deps.Date.now();
    setTutorialCallout(runtime, openTarget ? null : tabId, 6e3);
    scheduleTutorialTimer(runtime, () => {
      if (typeof runtime.deps.pumpMobileToastQueue === "function") (0, runtime.deps.pumpMobileToastQueue)();
    }, 120);
    if (!openTarget) {
      if (status === "read") applySkippedGuide(runtime, notice.key);
      (0, runtime.deps.queueImportantSave)(0);
      return coachWaitBetweenNotices(runtime);
    }
    (0, runtime.deps.queueImportantSave)(0);
    if (coachGuideFor(runtime, notice.key)) return coachStart(runtime, notice);
    openTutorialTarget(runtime, notice);
    if (["tutorial_first_gear", "unlock_items"].includes(notice.key)) coachOpenEquipment(runtime);
    coachWaitBetweenNotices(runtime);
  }
  function showNextTutorial(runtime) {
    if (runtime.deps.gameEntryRunning || runtime.deps.game.isGuideReplay) return;
    runtime.deps.window.GameModules.state.tutorials.sync(runtime.deps.game);
    saveTutorialHistoryChange(runtime);
    coachExpireNotice(runtime, runtime.deps.Date.now());
    refreshTutorialCardPlacement(runtime);
    if (runtime.deps.activeTutorial || tutorialQueueIsHeld(runtime) || runtime.deps.tutorialQueue.length === 0 || isTutorialPresentationBlocked(runtime)) return;
    while (runtime.deps.tutorialQueue.length) {
      const next = runtime.deps.tutorialQueue.shift();
      if (tutorialNoticeAllowed(runtime, next)) {
        runtime.deps.activeTutorial = next;
        runtime.state.notice = next;
        break;
      }
      runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, next.key, "unread");
    }
    if (!runtime.deps.activeTutorial) return;
    runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, runtime.deps.activeTutorial.key, "displayed");
    (0, runtime.deps.queueImportantSave)(0);
    runtime.state.coachNoticeUntil = runtime.deps.Date.now() + 8e3;
    const activeTutorial2 = runtime.deps.activeTutorial;
    activeTutorial2.title = (0, runtime.deps.stripDecorativeEmoji)(activeTutorial2.title);
    activeTutorial2.body = (0, runtime.deps.stripDecorativeEmoji)(activeTutorial2.body);
    runtime.deps.activeTutorialStep = 0;
    renderTutorialStep(runtime);
    runtime.deps.document.getElementById("tutorial-overlay").classList.add("active");
    placeTutorialCard(runtime);
    setTutorialCallout(runtime, runtime.deps.activeTutorial.tabId, 0);
    runtime.deps.window.GameModules.state.session.lastTime = runtime.deps.Date.now();
  }
  function coachWaitBetweenNotices(runtime) {
    runtime.state.coachQuietUntil = runtime.deps.Date.now() + runtime.state.TUTORIAL_CHAIN_GAP_MS;
    scheduleTutorialTimer(runtime, runtime.handlers.showNextTutorial, runtime.state.TUTORIAL_CHAIN_GAP_MS + 40);
  }
  function coachRequiresAttention(runtime, notice) {
    return !!notice && (runtime.state.TUTORIAL_START_KEYS.has(notice.key) || runtime.state.TUTORIAL_GUIDED_CONTENT_KEYS.has(notice.key) || String(notice.key).startsWith("story_"));
  }
  function coachExpireNotice(runtime, now) {
    if (!runtime.deps.activeTutorial || coachRequiresAttention(runtime, runtime.deps.activeTutorial) || now < runtime.state.coachNoticeUntil) return;
    const card = runtime.deps.document.querySelector("#tutorial-overlay .tutorial-card");
    if (card?.matches(":hover, :focus-within")) return;
    dismissTutorial(runtime, false, "unread");
  }
  function coachAnnounceRune(runtime) {
    const key = "unlock_skills";
    if (runtime.deps.game.seenTutorials.includes(key) || runtime.deps.game.tutorialHistory.some((row) => row.key === key) || !coachGuideFor(runtime, key)) return;
    runtime.deps.game.noti.skills = true;
    (0, runtime.deps.queueTutorialNotice)(key, (0, runtime.deps._t)("새 스킬룬"), (0, runtime.deps._t)("새 룬을 얻었습니다.\n‘스킬룬’에서 룬을 눌러 효과를 보고 공격 룬을 바꿔 보세요."), "tab-skills");
  }
  function coachStart(runtime, notice, open = true) {
    const guide = coachGuideFor(runtime, notice.key);
    if (!guide) return;
    coachFinish(runtime, false, true);
    if (guide === runtime.state.coachGuides.unlock_items) runtime.deps.equipmentInventoryInteraction.focus(null);
    const before = guide.begin ? guide.begin(notice) : guide.read();
    const action = { notice, guide, before, step: guide.step?.(before), startedAt: runtime.deps.Date.now(), contextual: !open, owner: runtime.deps.game };
    runtime.state.coachActive = action;
    coachEnsureCard(runtime);
    runtime.state.coachCard.hidden = false;
    runtime.state.coachCard.classList.remove("is-away");
    runtime.state.coachCard.querySelector("[data-skip]").hidden = notice.replay === true;
    coachRefreshText(runtime);
    coachRest(runtime);
    if (guide.spotlight) guide.spotlight(true, () => {
      if (runtime.active && runtime.state.coachActive === action && runtime.deps.game === action.owner) coachReposition(runtime);
    });
    if (open) coachOpenTarget(runtime);
    else {
      coachHushHover(runtime);
      scheduleViewFrame(runtime, () => {
        if (runtime.state.coachActive === action) coachRefresh(runtime);
      });
    }
  }
  function coachFollowOpeningTab(runtime, tabId) {
    if (runtime.deps.game.isGuideReplay) return;
    if (tabId === "tab-skills") runtime.deps.systemTutorialUi.visit(runtime.deps.game.skillSubtab);
    if (!runtime.deps.contentProgression.opening.applies(runtime.deps.game)) return;
    if (runtime.deps.contentProgression.opening.visit(runtime.deps.game, tabId)) (0, runtime.deps.queueImportantSave)(180);
    coachFollowOpeningGuide(runtime, tabId);
  }
  function coachFollowOpeningGuide(runtime, tabId) {
    coachLeaveContextualGuide(runtime, tabId);
    if (runtime.state.coachActive) return;
    const keys = runtime.state.OPENING_TAB_GUIDES[tabId];
    if (!keys) return;
    const pendingWeapon = tabId === "tab-items" && !!(0, runtime.deps.getStarterWeaponTutorialTarget)();
    const notice = runtime.deps.game.tutorialHistory.find((row) => keys.includes(row.key) && (row.status === "unread" || pendingWeapon));
    if (!notice || !coachGuideFor(runtime, notice.key)) return;
    if (notice.key !== "tutorial_first_gear") runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, notice.key, "read");
    coachStart(runtime, notice, false);
    const action = runtime.state.coachActive;
    if (tabId === "tab-items") scheduleViewFrame(runtime, () => {
      if (runtime.state.coachActive === action) coachOpenEquipment(runtime);
    });
  }
  function coachLeaveContextualGuide(runtime, tabId) {
    if (runtime.state.coachActive?.contextual && runtime.state.coachActive.notice.tabId !== tabId) coachFinish(runtime, false, true);
  }
  function coachOpenTarget(runtime) {
    const action = runtime.state.coachActive;
    if (!action) return;
    coachHushHover(runtime);
    (0, runtime.deps.hideInfoTooltip)();
    coachOpenGuidePane(runtime, action);
    scheduleViewFrame(runtime, () => {
      if (runtime.state.coachActive !== action) return;
      coachRefresh(runtime);
      if (runtime.state.coachActive !== action || !runtime.state.coachHighlighted) return;
      revealTutorialTarget(runtime, runtime.state.coachHighlighted);
      if (runtime.state.coachCard.classList.contains("is-docked")) runtime.state.coachCard.scrollIntoView({ block: "nearest", inline: "nearest" });
      else coachPlaceCard(runtime, runtime.state.coachHighlighted, true);
    });
  }
  function coachOpenGuidePane(runtime, action) {
    const group = (0, runtime.deps.getMergedTabGroup)(action.notice.tabId);
    if (group) (0, runtime.deps.switchMergedTabSubtab)(group[0], action.notice.tabId);
    else (0, runtime.deps.switchTab)(action.notice.tabId, { keepWindowOpen: true });
    if (action.guide.open) return action.guide.open();
    if (action.notice.key === "tutorial_passive_tree_unlock") runtime.deps.contentUnlockUi.select("passiveTree");
    if (action.notice.tabId === "tab-items") coachOpenEquipment(runtime);
    if (action.notice.tabId === "tab-skills") (0, runtime.deps.switchSkillSubtab)("skill-tab-equip");
  }
  function coachOpenEquipment(runtime) {
    (0, runtime.deps.switchItemSubtab)("item-tab-equip");
    if ((0, runtime.deps.isMobilePrimaryNavigationEnabled)()) {
      const bag = runtime.state.coachActive?.before?.keys ? runtime.state.coachActive.before.keys.length > 0 : runtime.deps.game.inventory.some(Boolean);
      (0, runtime.deps.setEquipmentMobilePane)(bag ? "inventory" : "loadout");
    }
  }
  function coachCurrentTarget(runtime, action) {
    const step = action.guide.step?.(action.before);
    if (step?.body !== action.step?.body) {
      action.step = step;
      coachRefreshText(runtime);
    }
    return coachFindTarget(runtime, step?.selector ?? action.guide.selector);
  }
  function coachRefresh(runtime) {
    const action = runtime.state.coachActive;
    if (!action) return;
    if (action.guide.completed(action.guide.read(action.before), action.before)) return coachFinish(runtime, true);
    if (coachLeftGuideContext(runtime, action)) return coachFinish(runtime, false, true);
    const target = coachCurrentTarget(runtime, action);
    const docked = coachDockCard(runtime, target, action.step);
    coachSetGuideTarget(runtime, target);
    const away = !target && !runtime.deps.document.getElementById(action.notice.tabId)?.classList.contains("active");
    runtime.state.coachCard.classList.toggle("is-away", away);
    runtime.state.coachCard.querySelector("[data-open]").hidden = !away;
    if (!target) return coachRest(runtime);
    coachRevealStep(runtime, action, target, docked);
    if (!docked) coachPlaceCard(runtime, target);
  }
  function coachReposition(runtime) {
    runtime.state.coachPlacedFor = null;
    coachRefresh(runtime);
  }
  function coachHoldsQueue(runtime) {
    if (!runtime.state.coachActive) return false;
    return !runtime.state.coachCard.classList.contains("is-away") || runtime.deps.Date.now() - runtime.state.coachActive.startedAt < runtime.state.TUTORIAL_GUIDE_OPENING_MS;
  }
  function coachCompleteGuideAction(runtime, action) {
    if (!runtime.active || runtime.deps.game !== action.owner) return;
    if (action.notice.onComplete) return action.notice.onComplete();
    const key = "action_" + action.notice.key;
    if (!runtime.deps.game.seenTutorials.includes(key)) runtime.deps.game.seenTutorials.push(key);
    const result = action.guide.result ? (0, runtime.deps._t)(action.guide.result(action.before)) : action.guide.title + " 완료";
    (0, runtime.deps.showGameToast)(result, { tone: "success" });
  }
  function coachDismissGuideAction(runtime, action) {
    if (!runtime.active || runtime.deps.game !== action.owner) return;
    if (action.guide.view) runtime.deps.game.seenTutorials.push("dismiss_" + action.notice.key);
    else applySkippedGuide(runtime, action.notice.key);
  }
  function coachFinish(runtime, completed, withoutSkip = false) {
    const action = runtime.state.coachActive;
    runtime.state.coachActive = null;
    runtime.state.coachPlacedFor = null;
    coachClearHighlight(runtime);
    if (runtime.state.coachCard) {
      runtime.state.coachCard.hidden = true;
      coachFloatCard(runtime);
    }
    if (!action) return;
    if (action.guide.spotlight) action.guide.spotlight(false);
    if (withoutSkip) return coachWaitBetweenNotices(runtime);
    if (action.notice.key === "tutorial_first_gear") runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, action.notice.key, "read");
    if (completed) coachCompleteGuideAction(runtime, action);
    else coachDismissGuideAction(runtime, action);
    (0, runtime.deps.queueImportantSave)(0);
    coachWaitBetweenNotices(runtime);
  }

  // modules/ui/tutorial-practice.mjs
  function practiceGearStep(runtime, before) {
    if (!before.keys.length) return runtime.handlers.practiceStep(1, 1, "빛나는 착용 장비를 눌러 어떤 능력치가 붙어 있는지 확인하세요.", ['#ui-equip-list .equipment-slot:not(.equipment-slot-empty):not([data-slot="무기"])', "#ui-equip-list .equipment-slot:not(.equipment-slot-empty)"]);
    if (before.keys.includes(runtime.deps.equipmentInventoryInteraction.getFocusedKey()) && !practiceWorn(runtime)) {
      return {
        ...runtime.handlers.practiceStep(
          2,
          2,
          "장비를 더블클릭, 혹은 장착 위치에 드래그 앤 드롭하거나 장착 버튼을 눌러서 장착하세요.",
          runtime.state.practiceEquipButton,
          "#ui-equipment-inventory-inspector .eqw-pick"
        ),
        dock: true
      };
    }
    return runtime.handlers.practiceStep(1, 2, "가방에서 빛나는 장비를 골라 비교 화면을 여세요.", before.cards);
  }
  function practiceRuneStep(runtime, before) {
    if (before.cards.some((selector) => runtime.deps.document.querySelector(selector + ".is-gem-selected")) && runtime.deps.document.querySelector(runtime.state.practiceRuneEquipButton)) {
      return runtime.handlers.practiceStep(2, 2, "룬을 더블클릭하거나 장착 버튼을 눌러 장착하세요.", runtime.state.practiceRuneEquipButton, "#gem-selection:popover-open .gem-selection-actions");
    }
    const kind = runtime.deps.skillGemBoardUi.currentKind();
    const picker = before.kinds.includes(kind) ? [] : before.kinds.map((type) => `#ui-skill-picker-tabs [data-picker-kind="${type}"]`);
    return runtime.handlers.practiceStep(
      1,
      2,
      "빛나는 룬을 고르세요. 다른 분류에 있다면 빛나는 분류 탭부터 누르세요.",
      [...before.cards, ...picker],
      "#tab-skills #ui-skill-picker-tabs"
    );
  }
  function practiceSeedStep(runtime, before) {
    const touch = runtime.deps.uiDisplay.matches("(hover: none), (max-width: 680px)");
    const total = touch ? 3 : 2;
    const board = runtime.deps.document.querySelector("#stump-box-board .stump-board");
    if (board?.matches(".is-cube,.is-nursery")) {
      const side = board.matches(".is-nursery") ? "bottom" : "top";
      return runtime.handlers.practiceStep(1, total, "빛나는 보석을 눌러 그루터기 함을 여세요.", `#stump-box-board .stump-frame-button.is-${side}`);
    }
    if (runtime.deps.document.getElementById("stump-box-storage")?.hidden) {
      return runtime.handlers.practiceStep(1, total, "왼쪽 보석을 눌러 씨앗 보관함을 여세요.", "#stump-box-board .stump-frame-button.is-left");
    }
    if (before.cards.some((selector) => runtime.deps.document.querySelector(selector + ".is-selected"))) {
      if (runtime.deps.document.querySelector(runtime.state.practicePlacement)) return runtime.handlers.practiceStep(3, 3, "미리보기에서 ‘배치’를 눌러 씨앗을 심으세요.", runtime.state.practicePlacement);
      return runtime.handlers.practiceStep(
        2,
        total,
        "그루터기 함의 빈 칸을 누르거나 씨앗을 더블클릭하여 장착하세요. 장착한 씨앗은 적을 처치하면 성장합니다.",
        runtime.state.practiceEmptyCell,
        "#stump-box-detail:popover-open .stump-detail-head"
      );
    }
    return runtime.handlers.practiceStep(1, total, "그루터기 보관함에서 빛나는 씨앗을 고르세요.", before.cards);
  }
  function practicePassiveStep(runtime) {
    if (!runtime.deps.uiDisplay.matches("(max-width: 1080px)")) {
      return runtime.handlers.practiceStep(1, 1, "이미 투자한 경로에 닿아 있는 노드만 1포인트로 열 수 있어요. 금빛 고리가 있는 노드를 눌러 투자하세요.", "#tree-canvas");
    }
    const node = runtime.deps.document.querySelector(runtime.state.practicePassivePanel)?.dataset.nodeId;
    if (node && !runtime.deps.game.passives.includes(node) && (0, runtime.deps.getPassiveActivationPath)(node).length === 1 && runtime.deps.document.querySelector(runtime.state.practicePassiveConfirm)) {
      return runtime.handlers.practiceStep(2, 2, "노드의 효과를 확인하고 ‘1포인트 사용’을 누르세요.", runtime.state.practicePassiveConfirm);
    }
    return runtime.handlers.practiceStep(1, 2, "이미 투자한 경로에 닿아 있는 금빛 고리 노드를 눌러 효과를 확인하세요.", "#tree-canvas");
  }
  function createPracticeStep() {
    return function practiceStep(number, total, body, selector, inline) {
      return { number, total, body, selector, inline };
    };
  }
  function practiceSelectors(runtime, prefix, attribute, values) {
    return values.map((value) => `${prefix}[${attribute}="${runtime.deps.CSS.escape(String(value))}"]`);
  }
  function practiceGearChoices(runtime) {
    return runtime.deps.game.inventory.filter((item) => item && !runtime.deps.bagItems.isSpecial(item) && (0, runtime.deps.getEquipCandidateSlots)(item).some((slot) => (0, runtime.deps.canEquipItemToSlot)(item, slot)));
  }
  function practiceEquippedKeys(runtime) {
    return Object.values(runtime.deps.game.equipment).filter(Boolean).map(runtime.deps.equipmentInventoryGridRuntime.getItemKey);
  }
  function practiceWorn(runtime) {
    return !!runtime.deps.equipmentInventoryInteraction.getFocusedEquipmentSlot();
  }
  function practiceGearCards(runtime, keys) {
    return practiceSelectors(runtime, "#ui-inventory-list .equipment-grid-item", "data-equipment-grid-key", keys);
  }
  function practiceEquippedRunes(runtime) {
    return [runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill, ...runtime.deps.game.equippedSummonSkills];
  }
  function practiceRuneChoices(runtime) {
    const worn = practiceEquippedRunes(runtime);
    return runtime.deps.game.skills.filter((name) => runtime.deps.SKILL_DB[name]?.isGem && !runtime.deps.SKILL_DB[name].basicSkill && !worn.includes(name) && (0, runtime.deps.canUseSkillWithCurrentEquipment)(name));
  }
  function practiceRuneCards(runtime, names) {
    return practiceSelectors(runtime, "#ui-skills-list .gem-library-card:not(.active,.equipment-blocked)", "data-attack-rune", names);
  }
  function practiceSeedIds(runtime) {
    return runtime.deps.stumpBox.storage(runtime.deps.game).filter((item) => item.family === "seed" && !runtime.deps.stumpBox.isMature(item) && !item.locked).map((item) => item.id);
  }
  function practiceEmptyStumpCell(runtime) {
    return runtime.deps.game.stumpBox.board.some((id, cell) => id === null && runtime.deps.stumpBox.isOpen(runtime.deps.game, cell));
  }
  function practiceSeedCards(runtime, ids) {
    return practiceSelectors(runtime, "#stump-box-storage .stump-item", "data-item", ids);
  }

  // modules/ui/tutorial-view.mjs
  function createTutorialView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set(), timers: /* @__PURE__ */ new Set() };
    const handlers = { ...tutorialNoticeHandlers(), ...tutorialCoachHandlers() };
    for (const [name, handler] of Object.entries(handlers)) {
      runtime.handlers[name] = (...args) => {
        if (!runtime.active) return;
        syncTutorialOwner(runtime);
        return handler(runtime, ...args);
      };
    }
    initializeTutorialLayout(runtime);
    initializeTutorialPractice(runtime);
    initializeTutorialCoach(runtime);
    initializeTutorialNotices(runtime);
    runtime.state.owner = deps.game;
    runtime.state.notice = null;
    runtime.state.pauseToggle = null;
    runtime.handlers.practiceStep = createPracticeStep();
    runtime.api = TutorialViewApi(runtime);
    installTutorialEvents(runtime);
    return runtime.api;
  }
  function initializeTutorialLayout(runtime) {
    runtime.state.TUTORIAL_CARD_GAP = 12;
    runtime.state.TUTORIAL_CARD_EDGE = 8;
    runtime.state.TUTORIAL_TOOLTIPS = Object.freeze(["#info-tooltip", "#canvas-tooltip", "#item-tooltip-box"]);
    runtime.state.TUTORIAL_HUSH_WAKERS = Object.freeze(["pointermove", "pointerdown", "wheel"]);
    runtime.state.TUTORIAL_GUIDE_OPENING_MS = 1500;
  }
  function initializeTutorialPractice(runtime) {
    runtime.state.practiceEquipButton = "#ui-equipment-inventory-inspector .equipment-card-primary:not(:disabled)";
    runtime.state.practiceRuneEquipButton = "#gem-selection:popover-open .gem-equip-primary:not(:disabled)";
    runtime.state.practiceEmptyCell = "#stump-box-board .stump-board.is-box .stump-cell.is-target";
    runtime.state.practicePlacement = '#stump-placement-preview:not([hidden]) [data-stump-action="placement-apply"]';
    runtime.state.practicePassivePanel = "#passive-mobile-detail:not([hidden])";
    runtime.state.practicePassiveConfirm = runtime.state.practicePassivePanel + " [data-passive-confirm]:not(:disabled)";
    runtime.state.tutorialPractice = Object.freeze({
      gear: {
        available: () => !runtime.deps.game.woodsmanBuildLock && (practiceGearChoices(runtime).length > 0 || practiceEquippedKeys(runtime).length > 0),
        begin: () => {
          const keys = practiceGearChoices(runtime).map(runtime.deps.equipmentLoadoutRuntime.ensureItemIdentity);
          return { keys, cards: practiceGearCards(runtime, keys) };
        },
        step: runtime.handlers.practiceGearStep,
        read: runtime.handlers.practiceEquippedKeys,
        completed: (current, before) => before.keys.length ? current.some((key) => before.keys.includes(key)) : practiceWorn(runtime),
        result: (before) => before.keys.length ? "장비를 장착했습니다." : "착용 장비의 옵션을 확인했습니다."
      },
      rune: {
        available: () => !runtime.deps.game.woodsmanBuildLock && practiceRuneChoices(runtime).length > 0,
        begin: () => {
          const choices = practiceRuneChoices(runtime);
          return { choices, cards: practiceRuneCards(runtime, choices), kinds: [...new Set(choices.map(runtime.deps.skillGemBoardUi.kindOf))] };
        },
        step: runtime.handlers.practiceRuneStep,
        read: runtime.handlers.practiceEquippedRunes,
        completed: (current, before) => current.some((name) => before.choices.includes(name)),
        result: () => "스킬룬을 장착했습니다."
      },
      seed: {
        available: () => !runtime.deps.game.woodsmanBuildLock && practiceEmptyStumpCell(runtime) && practiceSeedIds(runtime).length > 0,
        begin: () => {
          const ids = practiceSeedIds(runtime);
          return { ids, cards: practiceSeedCards(runtime, ids) };
        },
        keepClear: ["#stump-box-detail:popover-open"],
        step: runtime.handlers.practiceSeedStep,
        read: () => runtime.deps.game.stumpBox.board,
        completed: (current, before) => current.some((id) => before.ids.includes(id)),
        result: () => "씨앗을 심었습니다. 이제 적을 처치하면 자랍니다."
      },
      passiveStep: runtime.handlers.practicePassiveStep
    });
  }
  function initializeTutorialCoach(runtime) {
    runtime.state.TUTORIAL_CHAIN_GAP_MS = 700;
    runtime.state.coachNoticeUntil = 0;
    runtime.state.coachQuietUntil = 0;
    runtime.state.coachActive = null;
    runtime.state.coachHighlighted = null;
    runtime.state.coachCard = null;
    runtime.state.coachPlacedFor = null;
    runtime.state.coachHush = null;
    initializeTutorialGuideDefinitions(runtime);
  }
  function initializeTutorialGuideDefinitions(runtime) {
    runtime.state.coachGuides = {
      ...runtime.deps.systemTutorialUi.guides,
      unlock_items: {
        ...runtime.state.tutorialPractice.gear,
        title: "장비 비교와 교체"
      },
      tutorial_passive_tree_unlock: {
        available: () => !runtime.deps.contentProgression.isUnlocked("passiveTree"),
        selector: ['#content-unlock-panel [data-unlock-content="passiveTree"]'],
        title: "스킬트리 해금",
        body: "해금 포인트 1점을 써서 스킬트리를 여세요.",
        step: () => {
          const balance = runtime.deps.contentProgression.balance();
          return { body: balance > 0 ? (0, runtime.deps._t)("해금 포인트 {balance}점 중 1점을 씁니다. 해금 후 {remaining}점이 남습니다.", { balance, remaining: balance - 1 }) : (0, runtime.deps._t)("해금 포인트 1점을 써서 스킬트리를 여세요.") };
        },
        read: () => runtime.deps.contentProgression.isUnlocked("passiveTree"),
        completed: (opened) => opened
      },
      unlock_char: {
        available: () => runtime.deps.game.passivePoints > 0 && !runtime.deps.game.woodsmanBuildLock,
        // 휴대폰에서 노드 상세가 열려 있으면 그 "포인트 사용" 단추를, 아니면 트리 캔버스를 가리킨다.
        title: "첫 스킬트리 투자",
        body: "시작점 옆에 빛나는 노드 하나를 골라 1포인트를 쓰세요.",
        step: runtime.state.tutorialPractice.passiveStep,
        begin: () => ({ nodes: new Set(runtime.deps.game.passives), points: runtime.deps.game.passivePoints }),
        read: () => runtime.deps.game.passives,
        completed: (current, before) => runtime.deps.game.passivePoints < before.points && current.some((id) => !before.nodes.has(id)),
        result: () => "스킬트리 노드에 포인트를 사용했습니다.",
        // 6~8px 노드는 연결선 강조만으로 보이지 않았다: 찍을 수 있는 노드에 고리를 켜고, 카드는 캔버스 대신 그 노드 무리 옆에 둔다
        // (트리는 탭을 연 뒤 40ms에 처음 그려지므로 그때 카드 자리를 다시 잡는다).
        spotlight: (on, whenDrawn) => runtime.deps.passiveTreeGuide.show(on, whenDrawn),
        focus: (target) => target.id === "tree-canvas" ? runtime.deps.passiveTreeGuide.screenRect() : null
      },
      unlock_skills: {
        ...runtime.state.tutorialPractice.rune,
        title: "스킬룬 장착",
        keepClear: ["#gem-selection:popover-open", "#tab-skills .is-gem-selected"]
      },
      starter_weapon: {
        // 첫 루프의 시작 무기(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill, 2026-11-09): 장비 상세가 열려 있으면 그 '장착' 단추를, 아니면 가방의 무기를 가리킨다.
        selector: ["#tab-items .equipment-card-primary", "#ui-inventory-list .equipment-grid-item"],
        title: "무기 장착",
        body: "가방의 무기를 누르고 ‘장착’을 누르세요. 무기를 들면 기초 스킬로 싸웁니다.",
        read: () => (0, runtime.deps.getEquippedWeaponStance)(),
        completed: (current) => current !== "unarmed"
      },
      unlock_stump_box: {
        ...runtime.state.tutorialPractice.seed,
        title: "그루터기 함에 심기"
      }
    };
    runtime.state.coachAliases = {
      tutorial_starter_gem_equip: "starter_weapon",
      tutorial_first_passive: "unlock_char",
      tutorial_first_gear: "unlock_items",
      tutorial_stump_starter: "unlock_stump_box"
    };
    runtime.state.coachDockAnchor = void 0;
  }
  function initializeTutorialNotices(runtime) {
    runtime.state.TUTORIAL_START_KEYS = /* @__PURE__ */ new Set([
      "tutorial_battle_basics",
      "tutorial_starter_gem_equip",
      "opening_auto",
      "tutorial_first_passive",
      "tutorial_first_gear",
      "unlock_char",
      "unlock_items",
      "unlock_skills",
      "tutorial_passive_tree_unlock"
    ]);
    runtime.state.TUTORIAL_GUIDED_CONTENT_KEYS = /* @__PURE__ */ new Set(["unlock_stump_box", "tutorial_stump_starter"]);
    runtime.state.OPENING_TAB_GUIDES = Object.freeze({
      "tab-items": [runtime.deps.basicSkills.weaponGuide, "tutorial_first_gear"],
      "tab-char": ["tutorial_first_passive"],
      "tab-stump": ["unlock_stump_box", "tutorial_stump_starter"]
    });
    runtime.state.TUTORIAL_KIND_LABELS = Object.freeze({ start: "시작 안내", content: "새 콘텐츠", loop: "새 루프", notice: "알림" });
    runtime.state.TUTORIAL_TAB_NAMES = Object.freeze({
      "tab-character": "캐릭터",
      "tab-char": "스킬트리",
      "tab-items": "장비",
      "tab-skills": "스킬룬",
      "tab-map": "지도",
      "tab-unlocks": "해금",
      "tab-season": "루프 패시브",
      "tab-traits": "전직",
      "tab-talent": "재능",
      "tab-codex": "도감",
      "tab-stump": "그루터기 함",
      "tab-settings": "설정",
      "tab-journal": "기록",
      "tab-records": "전적",
      "tab-trade": "거래"
    });
    runtime.state.tutorialCardWindowSignature = "";
    runtime.state.savedTutorialRevision = -1;
    runtime.state.tutorialCallouts = [];
    runtime.state.tutorialCalloutTimer = null;
    runtime.state.TUTORIAL_MENU_OPENERS = Object.freeze(["btn-ui-rail-misc", "ui-rail-misc-toggle", "btn-mobile-nav-more"]);
    initializeTutorialStarterGuides(runtime);
  }
  function initializeTutorialStarterGuides(runtime) {
    runtime.state.TUTORIAL_STARTER_GUIDES = Object.freeze([
      {
        key: "tutorial_first_gear",
        seenAs: "unlock_items",
        tabId: "tab-items",
        title: "첫 장비",
        body: "장비를 얻었습니다. 자동 장착이 켜져 있으면 빈 칸에 맞는 장비를 바로 착용합니다.\n‘장비’에서 착용한 장비의 효과를 확인하고, 보관 중인 장비와 비교하세요.\n바꿔 입으면 전투 화면의 생명 구슬 위에 DPS 변화가 뜹니다.",
        // 빈 칸에 바로 입은 장비도 첫 장비다: 초반 드랍은 가방을 거치지 않아 안내가 끝내 뜨지 않았다(검토 7차). 무기 칸은 세지 않는다:
        // 첫 처치가 떨어뜨리는 직업 무기(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill)는 제 장착 안내가 맡는다(2026-11-09).
        starterDue: (state) => (state.inventory || []).some((item) => item && item.id !== state.starterWeaponTutorialPending) || Object.entries(state.equipment || {}).some(([slot, item]) => item && slot !== "무기")
      },
      {
        key: "tutorial_weapon_rune",
        seenAs: "tutorial_weapon_rune",
        tabId: "tab-skills",
        title: "무기와 스킬룬",
        body: "스킬룬마다 쓸 수 있는 무기가 있습니다. 지금 무기로 쓸 수 없는 룬은 흐리게 보이고, 카드에 필요한 무기가 적혀 있습니다.\n장착한 룬을 쓸 수 없는 무기로 바꾸면 기본 공격으로 싸우다가, 맞는 무기를 들면 그 룬으로 돌아갑니다.",
        starterDue: (state) => ownsWeaponBlockedRune(runtime, state)
      }
    ]);
  }
  function TutorialViewApi(runtime) {
    const names = [
      "rectsOverlap",
      "tutorialSamePlacement",
      "tutorialRectOf",
      "tutorialRectFits",
      "tutorialVisibleRects",
      "tutorialCardSpots",
      "revealTutorialTarget",
      "tutorialMarkup",
      "tutorialQuoteHtml",
      "tutorialBodyHtml",
      "openTutorialTarget",
      "renderTutorialStep",
      "settingsMenuPath",
      "isTutorialPresentationBlocked",
      "yieldTutorialCardToResult",
      "refreshTutorialCardPlacement",
      "tutorialNoticeAllowed",
      "tutorialQueueIsHeld",
      "saveTutorialHistoryChange",
      "setTutorialCallout",
      "ownsWeaponBlockedRune",
      "queueStarterGuides",
      "placeTutorialCard",
      "advanceTutorial",
      "equipSkippedStarterWeapon",
      "applySkippedGuide",
      "discardQueuedNotices",
      "dismissTutorial",
      "showNextTutorial"
    ];
    const api = Object.fromEntries(names.map((name) => [name, runtime.handlers[name]]));
    api.tutorialActionUi = tutorialCoachApi(runtime);
    api.dispose = () => disposeTutorialView(runtime);
    return api;
  }
  function tutorialCoachApi(runtime) {
    const names = [
      "waitBetweenNotices",
      "requiresAttention",
      "noticeBody",
      "expireNotice",
      "guideFor",
      "announceRune",
      "start",
      "followOpeningTab",
      "followOpeningGuide",
      "leaveContextualGuide",
      "refreshText",
      "ensureCard",
      "openTarget",
      "openGuidePane",
      "openEquipment",
      "currentTarget",
      "dockCard",
      "canDockCard",
      "floatCard",
      "inlineGuideAnchor",
      "leftGuideContext",
      "refresh",
      "revealStep",
      "placeCard",
      "avoidRects",
      "keepsClear",
      "homeRect",
      "rest",
      "reposition",
      "holdsQueue",
      "hushHover",
      "unhush",
      "hushesTooltipAt",
      "clearTooltipSpot",
      "findTarget",
      "setGuideTarget",
      "clearHighlight",
      "completeGuideAction",
      "dismissGuideAction",
      "finish"
    ];
    const api = Object.fromEntries(names.map((name) => [name, runtime.handlers["coach" + name[0].toUpperCase() + name.slice(1)]]));
    return Object.defineProperties(api, tutorialCoachFields(runtime));
  }
  function installTutorialEvents(runtime) {
    listenView(runtime, runtime.deps.window, "resize", runtime.handlers.coachReposition);
    listenView(runtime, runtime.deps.window, "game:languagechange", () => {
      runtime.handlers.renderTutorialStep();
      runtime.handlers.coachRefreshText();
    });
    listenView(runtime, runtime.deps.window, "resize", () => {
      if (runtime.deps.activeTutorial) runtime.handlers.placeTutorialCard();
    });
  }
  function clearTutorialPresentation(runtime) {
    cancelViewFrames(runtime);
    clearTutorialTimers(runtime);
    clearTutorialCallout(runtime);
    const action = runtime.state.coachActive;
    runtime.state.coachActive = null;
    runtime.state.coachPlacedFor = null;
    coachClearHighlight(runtime);
    coachUnhush(runtime);
    if (runtime.state.coachCard) {
      runtime.state.coachCard.hidden = true;
      coachFloatCard(runtime);
    }
    if (action?.guide.spotlight) action.guide.spotlight(false);
    releaseViewTarget(runtime, runtime.state.pauseToggle);
    runtime.state.pauseToggle = null;
    if (runtime.state.notice && runtime.deps.activeTutorial === runtime.state.notice) {
      runtime.deps.document.getElementById("tutorial-overlay")?.classList.remove("active");
      runtime.deps.activeTutorial = null;
      runtime.deps.activeTutorialStep = 0;
    }
    runtime.state.notice = null;
  }
  function syncTutorialOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    clearTutorialPresentation(runtime);
    runtime.state.savedTutorialRevision = -1;
    runtime.state.tutorialCardWindowSignature = "";
    runtime.state.coachNoticeUntil = runtime.state.coachQuietUntil = 0;
  }
  function disposeTutorialView(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    clearTutorialPresentation(runtime);
    runtime.state.coachCard?.remove();
    runtime.state.coachCard = null;
  }
  function tutorialNoticeHandlers() {
    return {
      tutorialNoticeAllowed,
      tutorialShown,
      clearTutorialCallout,
      showNextTutorial,
      practiceGearStep,
      practiceEquippedKeys,
      practiceRuneStep,
      practiceEquippedRunes,
      practiceSeedStep,
      practicePassiveStep,
      rectsOverlap,
      tutorialSamePlacement,
      tutorialRectOf,
      tutorialRectFits,
      tutorialVisibleRects,
      tutorialCardSpots,
      revealTutorialTarget,
      tutorialMarkup,
      tutorialQuoteHtml,
      tutorialBodyHtml,
      openTutorialTarget,
      renderTutorialStep,
      settingsMenuPath,
      isTutorialPresentationBlocked,
      yieldTutorialCardToResult,
      refreshTutorialCardPlacement,
      tutorialQueueIsHeld,
      saveTutorialHistoryChange,
      setTutorialCallout,
      ownsWeaponBlockedRune,
      queueStarterGuides,
      placeTutorialCard,
      advanceTutorial,
      equipSkippedStarterWeapon,
      applySkippedGuide,
      discardQueuedNotices,
      dismissTutorial
    };
  }
  function tutorialCoachHandlers() {
    return {
      coachWaitBetweenNotices,
      coachRequiresAttention,
      coachNoticeBody,
      coachExpireNotice,
      coachGuideFor,
      coachAnnounceRune,
      coachStart,
      coachFollowOpeningTab,
      coachFollowOpeningGuide,
      coachLeaveContextualGuide,
      coachRefreshText,
      coachEnsureCard,
      coachOpenTarget,
      coachOpenGuidePane,
      coachOpenEquipment,
      coachCurrentTarget,
      coachDockCard,
      coachCanDockCard,
      coachFloatCard,
      coachInlineGuideAnchor,
      coachLeftGuideContext,
      coachRefresh,
      coachRevealStep,
      coachPlaceCard,
      coachAvoidRects,
      coachKeepsClear,
      coachHomeRect,
      coachRest,
      coachReposition,
      coachHoldsQueue,
      coachHushHover,
      coachUnhush,
      coachHushesTooltipAt,
      coachClearTooltipSpot,
      coachFindTarget,
      coachSetGuideTarget,
      coachClearHighlight,
      coachCompleteGuideAction,
      coachDismissGuideAction,
      coachFinish
    };
  }
  function tutorialCoachFields(runtime) {
    return Object.assign(
      Object.getOwnPropertyDescriptors(tutorialCoachActivityFields(runtime)),
      Object.getOwnPropertyDescriptors(tutorialCoachPresentationFields(runtime))
    );
  }
  function tutorialCoachActivityFields(runtime) {
    return {
      get noticeUntil() {
        return runtime.state.coachNoticeUntil;
      },
      set noticeUntil(value) {
        runtime.state.coachNoticeUntil = value;
      },
      get quietUntil() {
        return runtime.state.coachQuietUntil;
      },
      set quietUntil(value) {
        runtime.state.coachQuietUntil = value;
      },
      get active() {
        return runtime.state.coachActive;
      },
      set active(value) {
        runtime.state.coachActive = value;
      },
      get highlighted() {
        return runtime.state.coachHighlighted;
      },
      set highlighted(value) {
        runtime.state.coachHighlighted = value;
      },
      get card() {
        return runtime.state.coachCard;
      },
      set card(value) {
        runtime.state.coachCard = value;
      }
    };
  }
  function tutorialCoachPresentationFields(runtime) {
    return {
      get placedFor() {
        return runtime.state.coachPlacedFor;
      },
      set placedFor(value) {
        runtime.state.coachPlacedFor = value;
      },
      get hush() {
        return runtime.state.coachHush;
      },
      set hush(value) {
        runtime.state.coachHush = value;
      },
      get guides() {
        return runtime.state.coachGuides;
      },
      set guides(value) {
        runtime.state.coachGuides = value;
      },
      get aliases() {
        return runtime.state.coachAliases;
      },
      set aliases(value) {
        runtime.state.coachAliases = value;
      },
      get dockAnchor() {
        return runtime.state.coachDockAnchor;
      },
      set dockAnchor(value) {
        runtime.state.coachDockAnchor = value;
      }
    };
  }

  // modules/tutorial-ui-classic.mjs
  var tutorialView = createTutorialView({
    get innerWidth() {
      return innerWidth;
    },
    get innerHeight() {
      return innerHeight;
    },
    get document() {
      return document;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get parseFloat() {
      return parseFloat;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get speakerShortName() {
      return speakerShortName;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get switchTab() {
      return switchTab;
    },
    get switchItemSubtab() {
      return switchItemSubtab;
    },
    get atlasUi() {
      return typeof atlasUi === "undefined" ? void 0 : atlasUi;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get tutorialQueue() {
      return tutorialQueue;
    },
    get activeTutorial() {
      return activeTutorial;
    },
    set activeTutorial(value) {
      activeTutorial = value;
    },
    get STORY_JOURNAL_SCENES() {
      return STORY_JOURNAL_SCENES;
    },
    get STORY_SCENE_QUOTES() {
      return typeof STORY_SCENE_QUOTES === "undefined" ? void 0 : STORY_SCENE_QUOTES;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get queueImportantSave() {
      return typeof queueImportantSave === "undefined" ? void 0 : queueImportantSave;
    },
    get actTitleCard() {
      return typeof actTitleCard === "undefined" ? void 0 : actTitleCard;
    },
    get isMobilePrimaryNavigationEnabled() {
      return isMobilePrimaryNavigationEnabled;
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get window() {
      return window;
    },
    get activeTutorialStep() {
      return activeTutorialStep;
    },
    set activeTutorialStep(value) {
      activeTutorialStep = value;
    },
    get contentProgression() {
      return contentProgression;
    },
    get actRewardPromptPending() {
      return actRewardPromptPending;
    },
    get Date() {
      return Date;
    },
    get isStartupOverlayOpen() {
      return typeof isStartupOverlayOpen === "undefined" ? void 0 : isStartupOverlayOpen;
    },
    get getMergedTabGroup() {
      return typeof getMergedTabGroup === "undefined" ? void 0 : getMergedTabGroup;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get getEquippedWeaponStance() {
      return getEquippedWeaponStance;
    },
    get isSkillRuneUsableWithStance() {
      return isSkillRuneUsableWithStance;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get getStarterWeaponTutorialTarget() {
      return getStarterWeaponTutorialTarget;
    },
    get basicSkills() {
      return basicSkills;
    },
    get equipItemById() {
      return equipItemById;
    },
    get showGameToast() {
      return showGameToast;
    },
    get stumpBox() {
      return stumpBox;
    },
    get pumpMobileToastQueue() {
      return typeof pumpMobileToastQueue === "undefined" ? void 0 : pumpMobileToastQueue;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get skillGemBoardUi() {
      return skillGemBoardUi;
    },
    get getPassiveActivationPath() {
      return getPassiveActivationPath;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get systemTutorialUi() {
      return systemTutorialUi;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get switchMergedTabSubtab() {
      return switchMergedTabSubtab;
    },
    get switchSkillSubtab() {
      return switchSkillSubtab;
    },
    get setEquipmentMobilePane() {
      return setEquipmentMobilePane;
    },
    get matchMedia() {
      return windowMatchMedia;
    },
    get mouseX() {
      return mouseX;
    },
    get mouseY() {
      return mouseY;
    },
    get gameEntryRunning() {
      return gameEntryRunning;
    },
    get stripDecorativeEmoji() {
      return stripDecorativeEmoji;
    },
    get CSS() {
      return CSS;
    },
    get bagItems() {
      return bagItems;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get canEquipItemToSlot() {
      return canEquipItemToSlot;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get canUseSkillWithCurrentEquipment() {
      return canUseSkillWithCurrentEquipment;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get passiveTreeGuide() {
      return passiveTreeGuide;
    }
  });
  window.GameModules.tutorialView = tutorialView;
  safeExposeGlobals({
    rectsOverlap: tutorialView.rectsOverlap,
    tutorialSamePlacement: tutorialView.tutorialSamePlacement,
    tutorialRectOf: tutorialView.tutorialRectOf,
    tutorialRectFits: tutorialView.tutorialRectFits,
    tutorialVisibleRects: tutorialView.tutorialVisibleRects,
    tutorialCardSpots: tutorialView.tutorialCardSpots,
    revealTutorialTarget: tutorialView.revealTutorialTarget,
    tutorialMarkup: tutorialView.tutorialMarkup,
    tutorialQuoteHtml: tutorialView.tutorialQuoteHtml,
    tutorialBodyHtml: tutorialView.tutorialBodyHtml,
    openTutorialTarget: tutorialView.openTutorialTarget,
    renderTutorialStep: tutorialView.renderTutorialStep,
    settingsMenuPath: tutorialView.settingsMenuPath,
    isTutorialPresentationBlocked: tutorialView.isTutorialPresentationBlocked,
    yieldTutorialCardToResult: tutorialView.yieldTutorialCardToResult,
    refreshTutorialCardPlacement: tutorialView.refreshTutorialCardPlacement,
    tutorialNoticeAllowed: tutorialView.tutorialNoticeAllowed,
    tutorialQueueIsHeld: tutorialView.tutorialQueueIsHeld,
    saveTutorialHistoryChange: tutorialView.saveTutorialHistoryChange,
    setTutorialCallout: tutorialView.setTutorialCallout,
    ownsWeaponBlockedRune: tutorialView.ownsWeaponBlockedRune,
    queueStarterGuides: tutorialView.queueStarterGuides,
    placeTutorialCard: tutorialView.placeTutorialCard,
    advanceTutorial: tutorialView.advanceTutorial,
    equipSkippedStarterWeapon: tutorialView.equipSkippedStarterWeapon,
    applySkippedGuide: tutorialView.applySkippedGuide,
    discardQueuedNotices: tutorialView.discardQueuedNotices,
    dismissTutorial: tutorialView.dismissTutorial,
    showNextTutorial: tutorialView.showNextTutorial,
    tutorialActionUi: tutorialView.tutorialActionUi
  });
})();
