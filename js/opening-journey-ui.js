// GENERATED from modules/opening-journey-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);
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

  // modules/browser/battle-canvas-box.mjs
  function battlefieldClientPoint(canvas, clientX, clientY) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * ((canvas.clientWidth || rect.width) / Math.max(1, rect.width)),
      y: (clientY - rect.top) * ((canvas.clientHeight || rect.height) / Math.max(1, rect.height))
    };
  }

  // modules/ui/opening-lessons.mjs
  function mark(runtime, key) {
    if (seen(runtime, key)) return;
    runtime.deps.game.seenTutorials.push(key);
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) (0, runtime.deps.queueImportantSave)(220);
  }
  function doorToRescue(runtime, run) {
    const map = run && runtime.deps.actExplorationDoors.stageMap(run), pack = run && run.packs.find((row) => row.rescue);
    const here = map && runtime.deps.actExplorationDoors.room(run), there = pack && map.rooms.find((room) => room.id === pack.roomId);
    if (!here || !there || here === there) return null;
    const door = map.hops[here.index] && map.hops[here.index][there.index];
    return door ? door.side : null;
  }
  function fresh(runtime) {
    return newGame(runtime) && !seen(runtime, runtime.state.KEY.intro) && !seen(runtime, runtime.state.KEY.done) && started(runtime);
  }
  function rescueStruck(runtime, run) {
    const pack = run && run.packs.find((row) => row.rescue);
    if (!pack || !pack.aliveIds.length) return true;
    return runtime.deps.game.enemies.some((enemy) => enemy && pack.aliveIds.includes(enemy.id) && enemy.hp < enemy.maxHp);
  }
  function lesson(runtime) {
    if (!active(runtime)) return null;
    if (!seen(runtime, runtime.state.KEY.rise)) return "rise";
    if (!seen(runtime, runtime.state.KEY.move)) return "move";
    if (!seen(runtime, runtime.state.KEY.attack)) return "attack";
    return weaponOnFloor(runtime, actRun(runtime)) ? "pickup" : "equip";
  }
  function lying(runtime) {
    const run = actRun(runtime);
    return lesson(runtime) === "rise" && !!run && inEntry(runtime, run);
  }
  function holds(runtime) {
    return !!runtime.state.intro || lying(runtime);
  }
  function hushes(runtime) {
    return holds(runtime) || fresh(runtime);
  }
  function onBattlefieldPress(runtime, event) {
    if (!lying(runtime)) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.type !== "click" || runtime.state.rising) return;
    const point = battlefieldClientPoint(event.currentTarget, event.clientX, event.clientY), hero = runtime.deps.battleVisualState.playerPos;
    if (hero && Math.abs(point.x - hero.x) < 90 && point.y > hero.y - 90 && point.y < hero.y + 30) startRise(runtime);
  }
  function wakesHero(runtime, code) {
    if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) return true;
    return runtime.deps.hotkeyBindings.actionForCode(runtime.deps.game.settings.hotkeyOverrides, code)?.kind === "move";
  }
  function startRise(runtime) {
    runtime.state.rising = { start: runtime.deps.battleVisualState.visualNow };
    runtime.deps.stageActors.setRise({ start: runtime.state.rising.start });
  }
  function riseEnded(runtime) {
    return !!runtime.state.rising && runtime.deps.battleVisualState.visualNow - runtime.state.rising.start >= runtime.deps.STAGE_HERO_RISE.ms.reduce((sum, ms) => sum + ms, 0);
  }
  function trackRise(runtime) {
    if (!lying(runtime)) {
      mark(runtime, runtime.state.KEY.rise);
      runtime.deps.stageActors.setRise(null);
      return;
    }
    if (!runtime.state.rising) runtime.deps.stageActors.setRise({ start: null });
    else if (riseEnded(runtime)) {
      mark(runtime, runtime.state.KEY.rise);
      runtime.state.rising = null;
      runtime.deps.stageActors.setRise(null);
    }
  }
  function trackMove(runtime, run) {
    const hero = runtime.deps.game.gridPlayer;
    if (!runtime.state.movedFrom) runtime.state.movedFrom = { gx: hero.gx, gy: hero.gy };
    if (run && run.destination || hero.gx !== runtime.state.movedFrom.gx || hero.gy !== runtime.state.movedFrom.gy) mark(runtime, runtime.state.KEY.move);
  }
  function weaponLearnt(runtime) {
    const guide = runtime.deps.basicSkills.weaponGuide;
    if ((0, runtime.deps.getEquippedWeaponStance)() === "unarmed") return false;
    return runtime.deps.contentProgression.opening.applies(runtime.deps.game) || seen(runtime, guide) && !guideWaits(runtime, guide) && !tutorialOpen(runtime) && !runtime.deps.tutorialActionUi.active;
  }
  function trackLesson(runtime, run) {
    const step = lesson(runtime);
    if (runtime.state.intro) return;
    if (step === "rise") trackRise(runtime);
    else if (step === "move") trackMove(runtime, run);
    else if (step === "attack" && rescueStruck(runtime, run)) mark(runtime, runtime.state.KEY.attack);
    else if (step === "equip" && weaponLearnt(runtime)) finish(runtime, run);
  }
  function finish(runtime, run) {
    mark(runtime, runtime.state.KEY.done);
    runtime.state.autoHint = run && runtime.deps.game.gridPlayer ? { owner: runtime.deps.game, run, gx: runtime.deps.game.gridPlayer.gx, gy: runtime.deps.game.gridPlayer.gy } : null;
    (0, runtime.deps.switchTab)("tab-battle");
    const key = coarse(runtime) ? "" : runtime.deps.hotkeyBindings.label(runtime.deps.hotkeyBindings.codeFor(runtime.deps.game.settings.hotkeyOverrides, "combat:autoMove"));
    (0, runtime.deps.queueTutorialNotice)("opening_auto", (0, runtime.deps._t)("자동 사냥"), `이제 자동 사냥을 쓸 수 있습니다.
오른쪽 위 자동 단추${key ? (0, runtime.deps._t)("나 {key} 키", { key }) : ""}로 켜면 캐릭터가 알아서 걷고 싸웁니다.
지금 할 일은 ‘목표’에 나옵니다.`);
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) {
      runtime.deps.window.GameModules.state.tutorials.archivePending(runtime.deps.game, "opening_auto");
      (0, runtime.deps.updateStaticUI)();
      (0, runtime.deps.queueImportantSave)(0);
    }
    runtime.deps.actExplorationUi.render();
  }
  function holdManual(runtime, run) {
    if (runtime.deps.game.settings.autoMove !== false) runtime.deps.game.settings.autoMove = false;
    if (run && run.mode !== "manual") {
      run.mode = "manual";
      runtime.deps.actExplorationUi.render();
    }
  }
  function seen(runtime, key) {
    return Array.isArray(runtime.deps.game.seenTutorials) && runtime.deps.game.seenTutorials.includes(key);
  }
  function actRun(runtime) {
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    return run && run.zoneId === 0 && run.status === "active" ? run : null;
  }
  function inEntry(runtime, run) {
    const room = run && runtime.deps.actExplorationDoors.room(run);
    return !!room && room.role === "entry";
  }
  function coarse(runtime) {
    return typeof runtime.deps.window.matchMedia === "function" && runtime.deps.window.matchMedia("(pointer: coarse)").matches;
  }
  function tutorialOpen(runtime) {
    return !!runtime.deps.document.querySelector("#tutorial-overlay.active");
  }
  function guideWaits(runtime, key) {
    return !!runtime.deps.activeTutorial && runtime.deps.activeTutorial.key === key || runtime.deps.tutorialQueue.some((row) => row.key === key);
  }
  function newGame(runtime) {
    return (runtime.deps.game.season || 1) === 1 && (runtime.deps.game.level || 1) === 1 && !(Number(runtime.deps.game.exp) > 0) && !(Number(runtime.deps.game.maxZoneId) > 0) && runtime.deps.game.currentZoneId === 0;
  }
  function started(runtime) {
    return !!runtime.deps.game.heroSelectionInitialized && !(0, runtime.deps.isLoopHeroSelectOpen)() && !(0, runtime.deps.isStartupOverlayOpen)() && !(0, runtime.deps.isLoadingOverlayOpen)();
  }
  function active(runtime) {
    return (runtime.deps.game.season || 1) === 1 && (!!runtime.state.intro || seen(runtime, runtime.state.KEY.intro)) && !seen(runtime, runtime.state.KEY.done);
  }
  function weaponOnFloor(runtime, run) {
    return !!run && runtime.deps.game.starterWeaponTutorialPending != null && (run.groundLoot || []).some((row) => row.item && row.item.id === runtime.deps.game.starterWeaponTutorialPending);
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

  // modules/ui/opening-intro.mjs
  function startIntro(runtime) {
    const replaced = [...runtime.state.REPLACED, ...runtime.state.STAGE_REPLACED];
    replaced.forEach(runtime.handlers.mark);
    for (let i = runtime.deps.tutorialQueue.length - 1; i >= 0; i--) if (replaced.includes(runtime.deps.tutorialQueue[i].key)) runtime.deps.tutorialQueue.splice(i, 1);
    if (runtime.deps.activeTutorial && replaced.includes(runtime.deps.activeTutorial.key)) (0, runtime.deps.dismissTutorial)(false);
    runtime.deps.contentProgression.opening.enroll(runtime.deps.game);
    (0, runtime.deps.updateTabUnlockButtons)();
    runtime.state.heldAuto = { settings: runtime.deps.game.settings, autoMove: runtime.deps.game.settings.autoMove };
    runtime.deps.game.settings.autoMove = false;
    runtime.deps.stageActors.preloadRise(runtime.deps.game.selectedClassId);
    runtime.deps.stageActors.setRise({ start: null });
    runtime.state.introReturnFocus = runtime.deps.document.activeElement;
    runtime.state.introOwner = runtime.deps.game;
    runtime.state.intro = runtime.deps.document.createElement("dialog");
    runtime.state.intro.id = "opening-intro";
    runtime.state.intro.className = "opening-intro";
    runtime.state.intro.setAttribute("aria-label", (0, runtime.deps._t)("프롤로그"));
    runtime.state.intro.innerHTML = introHtml(runtime);
    listenView(runtime, runtime.state.intro, "click", (event) => event.target.closest("[data-opening-skip]") ? endIntro(runtime) : advanceIntro(runtime));
    listenView(runtime, runtime.state.intro, "cancel", (event) => {
      event.preventDefault();
      endIntro(runtime);
    });
    runtime.deps.document.body.appendChild(runtime.state.intro);
    runtime.state.intro.showModal();
    runtime.state.intro.querySelector("[data-opening-next]").focus({ preventScroll: true });
    const scene = runtime.state.intro;
    scheduleViewFrame(runtime, () => scheduleViewFrame(runtime, () => {
      if (runtime.state.intro === scene) scene.classList.add("is-playing");
    }));
  }
  function introHtml(runtime) {
    const scene = runtime.deps.STORY_JOURNAL_SCENES.find((row) => row.id === "prologue"), quote = runtime.deps.STORY_SCENE_QUOTES.prologue;
    const title = (0, runtime.deps._t)(scene.title).split(", ").pop(), verdict = quote.lines.filter((text) => text.startsWith("“")).map((text) => (0, runtime.deps._t)(text)), source = quote.lines.find((text) => text.startsWith("("));
    let step = 0;
    const line = (cls, text) => `<p class="${cls}" data-step style="--step:${step++}">${(0, runtime.deps.escapeHTML)(text)}</p>`;
    return `<button type="button" class="opening-intro-skip" data-opening-skip>${(0, runtime.deps._t)("건너뛰기")}</button>
            <div class="opening-intro-stage"><figure class="opening-intro-plate"><img src="${(0, runtime.deps.escapeHTML)(scene.image)}" alt=""></figure>
            <div class="opening-intro-text"><p class="opening-intro-kicker">${(0, runtime.deps._t)("프롤로그")}</p><h1 class="opening-intro-title">${(0, runtime.deps.escapeHTML)(title)}</h1>
            <blockquote class="opening-intro-verdict">${verdict.map((text) => line("", text)).join("")}${source ? line("opening-intro-source", (0, runtime.deps._t)(source)) : ""}</blockquote>
            ${scene.lines.map((text) => line("opening-intro-line", (0, runtime.deps._t)(text))).join("")}
            <button type="button" class="opening-intro-next" data-opening-next>${(0, runtime.deps._t)("계속")} <kbd>Enter / Space</kbd></button></div></div>`;
  }
  function removeIntro(runtime, scene) {
    if (!scene || runtime.state.intro !== scene) return;
    clearIntroTasks(runtime);
    releaseViewTarget(runtime, scene);
    runtime.state.intro = null;
    runtime.state.introOwner = null;
    scene.close();
    scene.remove();
    const previous = runtime.state.introReturnFocus;
    runtime.state.introReturnFocus = null;
    runtime.deps.selectionDialog.restoreFocus(previous);
  }
  function dropIntro(runtime) {
    removeIntro(runtime, runtime.state.intro);
    clearIntroTasks(runtime);
    runtime.state.rising = null;
    runtime.deps.stageActors.setRise(null);
    if (runtime.state.heldAuto && runtime.state.heldAuto.settings === runtime.deps.game?.settings) runtime.deps.game.settings.autoMove = runtime.state.heldAuto.autoMove;
    runtime.state.heldAuto = null;
  }
  function advanceIntro(runtime) {
    if (!runtime.state.intro || runtime.state.intro.classList.contains("is-leaving")) return;
    if (!runtime.state.intro.classList.contains("is-all")) {
      runtime.state.intro.classList.add("is-all", "is-playing");
      return;
    }
    endIntro(runtime);
  }
  function endIntro(runtime) {
    if (!runtime.state.intro || runtime.state.intro.classList.contains("is-leaving")) return;
    const scene = runtime.state.intro;
    scene.classList.add("is-leaving");
    deferIntro(runtime, () => {
      if (runtime.state.intro !== scene) return;
      if (runtime.state.introOwner !== runtime.deps.game) {
        dropIntro(runtime);
        return;
      }
      mark(runtime, runtime.state.KEY.intro);
      runtime.state.heldAuto = null;
      scene.classList.add("is-revealing");
      deferIntro(runtime, () => removeIntro(runtime, scene), runtime.deps.uiDisplay.reducedEffects() ? 0 : runtime.state.REVEAL_MS);
    }, runtime.deps.uiDisplay.reducedEffects() ? 0 : runtime.state.LEAVE_MS);
  }
  function deferIntro(runtime, callback, ms) {
    const handle = runtime.deps.setTimeout(() => {
      runtime.state.introTimers.delete(handle);
      if (runtime.active) callback();
    }, ms);
    runtime.state.introTimers.add(handle);
  }
  function clearIntroTasks(runtime) {
    cancelViewFrames(runtime);
    for (const handle of runtime.state.introTimers) runtime.deps.clearTimeout(handle);
    runtime.state.introTimers.clear();
  }
  function onIntroKey(runtime, event) {
    event.stopImmediatePropagation();
    if (event.code === "Tab") {
      runtime.deps.selectionDialog.containFocus(event, runtime.state.intro);
      return;
    }
    if (!["Escape", "Space", "Enter"].includes(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === "Escape" || event.target.closest("[data-opening-skip]")) endIntro(runtime);
    else advanceIntro(runtime);
  }

  // modules/ui/opening-hints.mjs
  function hintFor(runtime) {
    if (runtime.state.intro) return null;
    const step = lesson(runtime);
    if (step === "rise") return lying(runtime) ? "rise" : null;
    if (step === "equip") return weaponInHand(runtime) ? "equip" : lessonHint(runtime, "attack");
    if (step) return lessonHint(runtime, step);
    return autoHintDue(runtime) ? "auto" : systemHint(runtime);
  }
  function systemHint(runtime) {
    const cue = runtime.deps.contentProgression.opening.nextCue(runtime.deps.game);
    return cue && !(0, runtime.deps.isRewardOpen)() && !(0, runtime.deps.actRewardPromptPending)() ? `system:${cue}` : null;
  }
  function lessonHint(runtime, step) {
    if (step !== "attack") return step;
    const door = doorToRescue(runtime, actRun(runtime)), far = rescueSide(runtime);
    return door ? `go:${door}` : far ? `attack:${far}` : step;
  }
  function rescueSide(runtime) {
    const enemy = runtime.deps.game.enemies.find((row) => row && row.rescue), dx = enemy ? enemy.gx - runtime.deps.game.gridPlayer.gx : 0;
    return Math.abs(dx) > 3 ? dx > 0 ? "east" : "west" : null;
  }
  function lessonCardHtml(runtime, name, arg) {
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) {
      if (name === "equip") return `<button class="opening-lesson-action" type="button" data-opening-weapon>${(0, runtime.deps._t)("무기 장착하기")}</button>`;
      if (name === "system") {
        const description = arg === "tab-items" ? `<p class="opening-lesson-text">${(0, runtime.deps._t)("가방의 장비를 착용 중인 장비와 비교해 바꿔 낄 수 있습니다.")}</p>` : "";
        return description + `<button class="opening-lesson-action" type="button" data-opening-route="${arg}">${(0, runtime.deps._t)(runtime.state.SYSTEM_CUES[arg])}</button>`;
      }
      return `<p class="opening-lesson-text">${runtime.state.HINTS[name](arg)}</p>`;
    }
    const at = runtime.state.LESSON_ORDER.indexOf(name === "go" ? "attack" : name);
    const dots = runtime.state.LESSON_ORDER.map((_, i) => `<i class="${i < at ? "is-done" : i === at ? "is-now" : ""}"></i>`).join("");
    return `<div class="opening-lesson-head"><span class="opening-lesson-kicker">${(0, runtime.deps._t)("시작 안내 {value}/{length}", { value: at + 1, length: runtime.state.LESSON_ORDER.length })}</span><span class="opening-lesson-dots" aria-hidden="true">${dots}</span></div><strong class="opening-lesson-title">${(0, runtime.deps._t)(runtime.state.LESSON_TITLES[name])}</strong><p class="opening-lesson-text">${runtime.state.HINTS[name](arg)}</p>`;
  }
  function autoHintDue(runtime) {
    if (!runtime.state.autoHint) return false;
    const { gx, gy } = runtime.deps.game.gridPlayer;
    if (runtime.state.autoHint.owner !== runtime.deps.game || runtime.state.autoHint.run !== actRun(runtime) || runtime.deps.game.settings.autoMove || gx !== runtime.state.autoHint.gx || gy !== runtime.state.autoHint.gy) {
      runtime.state.autoHint = null;
    }
    return !!runtime.state.autoHint;
  }
  function fieldMark(runtime, el, className, attr) {
    const wrap = runtime.deps.document.getElementById("battlefield-wrap");
    if (el && el.parentElement === wrap) return el;
    if (!el) {
      el = runtime.deps.document.createElement("div");
      el.className = className;
      el.setAttribute(...attr);
    }
    if (wrap) wrap.appendChild(el);
    return el;
  }
  function place(runtime, el, left, top) {
    const x = `${Math.round(left)}px`, y = `${Math.round(top)}px`;
    if (el.style.left !== x) el.style.left = x;
    if (el.style.top !== y) el.style.top = y;
  }
  function showHint(runtime, step) {
    runtime.state.hintEl = fieldMark(runtime, runtime.state.hintEl, "opening-lesson", ["role", "status"]);
    if (runtime.state.hintEl.hidden !== !step) runtime.state.hintEl.hidden = !step;
    runtime.deps.document.getElementById("btn-act-exploration-auto")?.classList.toggle("is-opening-glow", step === "auto");
    const canvas = runtime.deps.document.getElementById("battlefield-canvas");
    showWakeMark(runtime, step === "rise" && !runtime.state.rising, canvas);
    if (!step || !canvas) return markLessonBottom(runtime, null);
    const fresh2 = runtime.state.hintEl.dataset.step !== step || runtime.state.hintEl.dataset.language !== runtime.deps.i18n.language;
    if (fresh2) {
      const [name, arg] = step.split(":");
      runtime.state.hintEl.dataset.step = step;
      runtime.state.hintEl.dataset.language = runtime.deps.i18n.language;
      runtime.state.hintEl.classList.remove("is-compact");
      runtime.state.hintEl.innerHTML = lessonCardHtml(runtime, name, arg);
    }
    const field = `${canvas.offsetWidth}x${canvas.offsetHeight}`, resized = field !== runtime.state.hintField;
    runtime.state.hintField = field;
    const top = cardTop(runtime, canvas, fresh2 || resized);
    place(runtime, runtime.state.hintEl, canvas.offsetLeft + (canvas.offsetWidth - runtime.state.hintEl.offsetWidth) / 2, canvas.offsetTop + top);
    markLessonBottom(runtime, canvas.offsetTop + top + runtime.state.hintEl.offsetHeight);
  }
  function markLessonBottom(runtime, bottom) {
    const tab = runtime.deps.document.getElementById("tab-battle"), value = bottom === null ? "" : `${Math.round(bottom)}px`;
    if (tab && tab.style.getPropertyValue("--lesson-bottom") !== value) tab.style.setProperty("--lesson-bottom", value);
  }
  function cardTop(runtime, canvas, fresh2) {
    const room = headRoom(runtime), clear = topClear(runtime, canvas), stacked = runtime.deps.stageView.stacked();
    if (!runtime.state.hintEl.classList.contains("is-compact") && room - runtime.state.hintEl.offsetHeight < clear) runtime.state.hintEl.classList.add("is-compact");
    const height = runtime.state.hintEl.offsetHeight, fits = stacked || room - height >= clear;
    runtime.state.hintBelow = fresh2 ? !fits : runtime.state.hintBelow || !fits;
    const want = runtime.state.hintBelow ? Math.min(runtime.deps.battleVisualState.playerPos.y + runtime.state.CARD_GAP * 2, canvas.offsetHeight - height - runtime.state.CARD_GAP) : Math.max(clear, Math.min(canvas.offsetHeight * 0.06, room - height));
    runtime.state.hintTop = fresh2 ? want : (runtime.state.hintBelow ? Math.max : Math.min)(runtime.state.hintTop, want);
    return runtime.state.hintTop;
  }
  function topClear(runtime, canvas) {
    const row = runtime.deps.stageView.stacked() && runtime.deps.document.querySelector("#tab-battle .combat-zone-row");
    if (!row) return runtime.state.CARD_GAP;
    return Math.max(runtime.state.CARD_GAP, Math.round(row.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top) + runtime.state.CARD_GAP);
  }
  function headRoom(runtime) {
    const hero = runtime.deps.battleVisualState.playerPos, head = hero ? (0, runtime.deps.getHeroHeadY)(runtime.deps.battleVisualState.visualNow) : null;
    return head === null ? Infinity : head - runtime.state.CARD_GAP * 2;
  }
  function showWakeMark(runtime, show, canvas) {
    const hero = show && canvas && runtime.deps.battleVisualState.playerPos;
    if (!runtime.state.wakeEl && !hero) return;
    runtime.state.wakeEl = fieldMark(runtime, runtime.state.wakeEl, "opening-wake-mark", ["aria-hidden", "true"]);
    if (runtime.state.wakeEl.hidden !== !hero) runtime.state.wakeEl.hidden = !hero;
    if (!hero) return;
    const head = (0, runtime.deps.getHeroHeadY)(runtime.deps.battleVisualState.visualNow), stand = head === null ? 160 : hero.y - head;
    place(runtime, runtime.state.wakeEl, canvas.offsetLeft + hero.x, canvas.offsetTop + hero.y - stand / 4);
  }
  function weaponInHand(runtime) {
    return runtime.deps.game.starterWeaponTutorialPending != null || seen(runtime, runtime.deps.basicSkills.weaponGuide);
  }

  // modules/ui/opening-flow.mjs
  function onKey(runtime, event) {
    if (runtime.state.intro) {
      onIntroKey(runtime, event);
      return;
    }
    if (!lying(runtime) || runtime.state.rising || runtime.state.intro || !wakesHero(runtime, event.code)) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    startRise(runtime);
  }
  function tick(runtime) {
    if (!ticking(runtime)) return;
    followGame(runtime);
    if (active(runtime)) {
      const run = actRun(runtime);
      holdManual(runtime, run);
      trackLesson(runtime, run);
    } else if (runtime.deps.stageActors.down()) runtime.deps.stageActors.setRise(null);
    showHint(runtime, hintFor(runtime));
  }
  function followGame(runtime) {
    if (runtime.state.owner !== runtime.deps.game) {
      dropIntro(runtime);
      runtime.state.owner = runtime.deps.game;
      runtime.state.movedFrom = runtime.state.autoHint = null;
      runtime.state.hintEl?.remove();
      runtime.state.wakeEl?.remove();
      runtime.state.hintEl = runtime.state.wakeEl = null;
      runtime.state.hintField = "";
    }
    if (runtime.state.intro && (runtime.state.introOwner !== runtime.deps.game || !newGame(runtime))) dropIntro(runtime);
    else if (!runtime.state.intro && fresh(runtime)) startIntro(runtime);
  }
  function openCue(runtime, route) {
    if (!Object.hasOwn(runtime.state.SYSTEM_CUES, route)) return;
    if (route !== "tab-map") return (0, runtime.deps.openTabPane)(route);
    runtime.deps.explorationAtlasUi.open();
    runtime.deps.worldMapUi.pick("act-02");
    runtime.deps.document.querySelector("#ui-exploration-atlas .wm-side .atlas-hunt-now")?.focus();
  }
  function init(runtime) {
    if (!runtime.active || runtime.state.tickTimer !== null) return;
    const canvas = runtime.deps.document.getElementById("battlefield-canvas");
    if (!canvas) return;
    ["pointerdown", "mousedown", "click"].forEach((type) => listenView(runtime, canvas, type, (event) => {
      if (runtime.state.owner !== runtime.deps.game && ticking(runtime)) followGame(runtime);
      runtime.handlers.onBattlefieldPress(event);
    }, true));
    const wrap = runtime.deps.document.getElementById("battlefield-wrap");
    if (wrap) listenView(runtime, wrap, "click", (event) => {
      if (event.target.closest("[data-opening-weapon]")) (0, runtime.deps.openTabPane)("tab-items");
      const route = event.target.closest("[data-opening-route]")?.dataset.openingRoute;
      openCue(runtime, route);
    });
    listenView(runtime, runtime.deps.window, "keydown", (event) => {
      if (runtime.state.owner !== runtime.deps.game && ticking(runtime)) followGame(runtime);
      runtime.handlers.onKey(event);
    }, true);
    listenView(runtime, runtime.deps.window, "keyup", (event) => {
      if (runtime.state.intro) event.stopImmediatePropagation();
    }, true);
    runtime.state.tickTimer = runtime.deps.setInterval(runtime.handlers.tick, runtime.state.TICK_MS);
  }
  function afterStartPick(runtime) {
    if (ticking(runtime)) followGame(runtime);
  }
  function ticking(runtime) {
    return typeof runtime.deps.game === "object" && !!runtime.deps.game && Array.isArray(runtime.deps.game.seenTutorials) && !runtime.deps.game.isBackgroundCalculation;
  }

  // modules/ui/opening-journey-view.mjs
  function createOpeningJourneyView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    const handlers = { mark, onKey, tick, onBattlefieldPress, holds, hushes, lying, afterStartPick, active, lesson, init };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = OpeningJourneyViewApi(runtime);
    installOpeningJourneyViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.KEY = Object.freeze({ intro: "opening_intro", rise: "opening_rise", move: "opening_move", attack: "opening_attack", done: "opening_done" });
    runtime.state.REPLACED = Object.freeze(["story_prologue"]);
    runtime.state.STAGE_REPLACED = Object.freeze(["story_act_1_start", "tutorial_battle_basics"]);
    runtime.state.TICK_MS = 150;
    runtime.state.LEAVE_MS = 900;
    runtime.state.REVEAL_MS = 1100;
    runtime.state.CARD_GAP = 8;
    runtime.state.intro = null;
    runtime.state.rising = null;
    runtime.state.movedFrom = null;
    runtime.state.hintEl = null;
    runtime.state.hintTop = 0;
    runtime.state.hintBelow = false;
    runtime.state.hintField = "";
    runtime.state.wakeEl = null;
    runtime.state.autoHint = null;
    runtime.state.heldAuto = null;
    runtime.state.introReturnFocus = null;
    runtime.state.introOwner = null;
    runtime.state.owner = runtime.deps.game;
    runtime.state.introTimers = /* @__PURE__ */ new Set();
    runtime.state.tickTimer = null;
    runtime.state.SIDES = Object.freeze({ east: "오른쪽", west: "왼쪽", north: "위쪽", south: "아래쪽" });
    runtime.state.HINTS = {
      rise: () => (0, runtime.deps._t)(coarse(runtime) ? "쓰러진 캐릭터를 눌러 깨우세요" : "쓰러진 캐릭터를 클릭하거나 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 키로 깨우세요"),
      move: () => (0, runtime.deps._t)(coarse(runtime) ? "바닥을 눌러 움직이세요" : "바닥을 클릭하거나 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 키로 움직이세요"),
      attack: (side) => `${side ? (0, runtime.deps._t)("{SIDES}으로 가서 하켄을 구하세요", { SIDES: (0, runtime.deps._t)(runtime.state.SIDES[side]) }) : (0, runtime.deps._t)("하켄을 치는 괴물에게 다가가세요")}. ${(0, runtime.deps._t)("가까이 가면 자동으로 공격합니다")}`,
      go: (side) => (0, runtime.deps._t)("{SIDES} 문으로 나아가세요", { SIDES: runtime.state.SIDES[side] ? (0, runtime.deps._t)(runtime.state.SIDES[side]) : (0, runtime.deps._t)("앞쪽") }),
      pickup: () => (0, runtime.deps._t)("떨어진 무기를 누르거나 그 위로 걸어가 주우세요"),
      equip: () => (0, runtime.deps._t)("장비 창에서 주운 무기를 장착하세요"),
      auto: () => (0, runtime.deps._t)("오른쪽 위 자동 단추를 눌러 자동 사냥을 켜세요")
    };
    runtime.state.SYSTEM_CUES = Object.freeze({
      "tab-map": "다음 지역 지도 보기",
      "tab-items": "첫 장비 살펴보기",
      "tab-character": "달라진 능력치 보기",
      "tab-journal": "새 기록 읽기",
      "tab-trade": "NPC 상점 보기"
    });
    runtime.state.LESSON_ORDER = Object.freeze(["rise", "move", "attack", "pickup", "equip", "auto"]);
    runtime.state.LESSON_TITLES = Object.freeze({ rise: "깨어나기", move: "움직이기", attack: "하켄 구하기", go: "하켄 구하기", pickup: "무기 줍기", equip: "무기 장착하기", auto: "자동 사냥" });
  }
  function OpeningJourneyViewApi(runtime) {
    const api = {
      holds: runtime.handlers.holds,
      hushes: runtime.handlers.hushes,
      lying: runtime.handlers.lying,
      afterStartPick: runtime.handlers.afterStartPick,
      autoLocked: runtime.handlers.active,
      lesson: runtime.handlers.lesson,
      introOpen: () => runtime.active && (!!runtime.state.intro || fresh(runtime))
    };
    api.dispose = () => disposeOpeningJourneyView(runtime);
    return Object.freeze(api);
  }
  function installOpeningJourneyViewEvents(runtime) {
    if (typeof runtime.deps.document === "object" && runtime.deps.document.readyState !== "loading") init(runtime);
    else if (typeof runtime.deps.document === "object") listenView(runtime, runtime.deps.document, "DOMContentLoaded", runtime.handlers.init, { once: true });
  }
  function disposeOpeningJourneyView(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    runtime.deps.clearInterval(runtime.state.tickTimer);
    runtime.state.tickTimer = null;
    dropIntro(runtime);
    runtime.state.hintEl?.remove();
    runtime.state.wakeEl?.remove();
    runtime.state.hintEl = runtime.state.wakeEl = null;
    runtime.deps.document.getElementById("btn-act-exploration-auto")?.classList.remove("is-opening-glow");
    runtime.deps.document.getElementById("tab-battle")?.style.removeProperty("--lesson-bottom");
  }

  // modules/opening-journey-ui-classic.mjs
  var openingJourney = createOpeningJourneyView({
    get game() {
      return window.GameModules.state.game;
    },
    get contentProgression() {
      return contentProgression;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get activeTutorial() {
      return activeTutorial;
    },
    get dismissTutorial() {
      return dismissTutorial;
    },
    get updateTabUnlockButtons() {
      return updateTabUnlockButtons;
    },
    get stageActors() {
      return stageActors;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
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
    get tutorialQueue() {
      return tutorialQueue;
    },
    get STORY_JOURNAL_SCENES() {
      return STORY_JOURNAL_SCENES;
    },
    get STORY_SCENE_QUOTES() {
      return STORY_SCENE_QUOTES;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get battleVisualState() {
      return battleVisualState;
    },
    get hotkeyBindings() {
      return hotkeyBindings;
    },
    get STAGE_HERO_RISE() {
      return STAGE_HERO_RISE;
    },
    get basicSkills() {
      return basicSkills;
    },
    get getEquippedWeaponStance() {
      return getEquippedWeaponStance;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get switchTab() {
      return switchTab;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get actExplorationUi() {
      return actExplorationUi;
    },
    get window() {
      return window;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get isRewardOpen() {
      return isRewardOpen;
    },
    get actRewardPromptPending() {
      return actRewardPromptPending;
    },
    get i18n() {
      return i18n;
    },
    get stageView() {
      return stageView;
    },
    get getHeroHeadY() {
      return getHeroHeadY;
    },
    get openTabPane() {
      return openTabPane;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get worldMapUi() {
      return worldMapUi;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get isLoopHeroSelectOpen() {
      return isLoopHeroSelectOpen;
    },
    get isStartupOverlayOpen() {
      return isStartupOverlayOpen;
    },
    get isLoadingOverlayOpen() {
      return isLoadingOverlayOpen;
    }
  });
  var isOpeningIntroOpen = () => openingJourney.introOpen();
  safeExposeGlobals({ openingJourney, isOpeningIntroOpen });
})();
