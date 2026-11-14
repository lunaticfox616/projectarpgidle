// GENERATED from modules/act-exploration-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);

  // modules/ui/act-exploration-minimap.mjs
  function mapView(runtime, canvas, map) {
    if (canvas.id !== "act-exploration-map") return { x0: 0, y0: 0, cols: map.columns, rows: map.rows, scale: 10, markerScale: 1 };
    const cols = Math.min(runtime.state.MINI_VIEW, map.columns), rows = Math.min(runtime.state.MINI_VIEW, map.rows);
    const x0 = Math.max(0, Math.min(map.columns - cols, runtime.deps.game.gridPlayer.gx - Math.floor(cols / 2)));
    const y0 = Math.max(0, Math.min(map.rows - rows, runtime.deps.game.gridPlayer.gy - Math.floor(rows / 2)));
    return { x0, y0, cols, rows, scale: 8, markerScale: Math.max(1, Math.max(cols, rows) / runtime.state.MINI_MARKER_BASE) };
  }
  function draw(runtime, canvas, run, map) {
    const view = mapView(runtime, canvas, map), scale = view.scale, ss = 2, width = view.cols * scale * ss, height = view.rows * scale * ss;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.dataset.view = [view.x0, view.y0, view.cols, view.rows].join(",");
    const ctx = canvas.getContext("2d"), seen = runtime.deps.actExplorationSight.seenCells(run);
    ctx.setTransform(ss, 0, 0, ss, -view.x0 * scale * ss, -view.y0 * scale * ss);
    drawFog(runtime, ctx, map, scale);
    drawTerrain(runtime, ctx, map, seen, scale);
    runtime.handlers.drawMarkers(ctx, run, map, seen, view);
  }
  function drawFog(runtime, ctx, map, scale) {
    ctx.fillStyle = runtime.state.MAP_INK.fog;
    ctx.fillRect(0, 0, map.columns * scale, map.rows * scale);
    ctx.fillStyle = runtime.state.MAP_INK.grid;
    for (let gx = 0; gx < map.columns; gx += 4) ctx.fillRect(gx * scale, 0, 0.5, map.rows * scale);
    for (let gy = 0; gy < map.rows; gy += 4) ctx.fillRect(0, gy * scale, map.columns * scale, 0.5);
  }
  function drawTerrain(runtime, ctx, map, seen, scale) {
    for (const id of seen) {
      const gx = id % map.columns, gy = Math.floor(id / map.columns);
      ctx.fillStyle = map.tiles[id] ? runtime.state.MAP_INK.floor : runtime.state.MAP_INK.wall;
      ctx.fillRect(gx * scale, gy * scale, scale, scale);
    }
    ctx.fillStyle = runtime.state.MAP_INK.edge;
    for (const id of seen) if (map.tiles[id]) runtime.handlers.drawFloorEdges(ctx, map, seen, id, scale);
  }
  function createDrawFloorEdges(runtime) {
    return function drawFloorEdges(ctx, map, seen, id, scale) {
      const gx = id % map.columns, gy = Math.floor(id / map.columns), w = 0.7;
      for (const [dx, dy] of runtime.state.EDGE_SIDES) {
        if (!isSeenWallOrEdge(runtime, map, seen, gx + dx, gy + dy)) continue;
        const x = gx * scale + (dx > 0 ? scale - w : 0), y = gy * scale + (dy > 0 ? scale - w : 0);
        ctx.fillRect(x, y, dx ? w : scale, dy ? w : scale);
      }
    };
  }
  function isSeenWallOrEdge(runtime, map, seen, gx, gy) {
    if (gx < 0 || gy < 0 || gx >= map.columns || gy >= map.rows) return true;
    const id = gy * map.columns + gx;
    return seen.has(id) && !map.tiles[id];
  }
  function drawDiamond(runtime, ctx, { x, y, r, fill }) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "#140d08";
    ctx.stroke();
  }
  function packMark(runtime, pack) {
    if (pack.stage !== null) return "#e78077";
    if (runtime.state.ENCOUNTER_MARKS[pack.encounter]) return runtime.state.ENCOUNTER_MARKS[pack.encounter];
    return pack.eliteIds.some((id) => pack.aliveIds.includes(id)) ? "#e1bd62" : "#ae9073";
  }
  function createDrawMarkers(runtime) {
    return function drawMarkers(ctx, run, map, seen, view) {
      const scale = view.scale, at = (v) => v * scale + scale / 2, r = Math.max(3, scale * 0.8) * view.markerScale;
      for (const pack of run.packs) {
        const room = runtime.deps.actExplorationState.packPosition(map, pack);
        if (!pack.aliveIds.length || !seen.has(runtime.deps.actExplorationMap.index(map, room))) continue;
        drawDiamond(runtime, ctx, { x: at(room.gx), y: at(room.gy), r, fill: packMark(runtime, pack) });
      }
      const command = runtime.deps.actExplorationState.markedDestination(run);
      if (command) {
        ctx.beginPath();
        ctx.arc(at(command.gx), at(command.gy), r + 1, 0, Math.PI * 2);
        ctx.setLineDash([2, 1.5]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#f3e5b4";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPlayerMarker(runtime, ctx, at(runtime.deps.game.gridPlayer.gx), at(runtime.deps.game.gridPlayer.gy), r);
    };
  }
  function drawPlayerMarker(runtime, ctx, x, y, r) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    glow.addColorStop(0, "rgba(145,236,223,.55)");
    glow.addColorStop(1, "rgba(145,236,223,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = "#91ecdf";
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "#0b1a17";
    ctx.stroke();
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

  // modules/ui/act-exploration-actions.mjs
  function packDigest(runtime, run) {
    let digest = run.packs.length;
    for (const pack of run.packs) digest = Math.imul(digest, 31) + pack.aliveIds.length | 0;
    return digest;
  }
  function summaryOf(runtime, run, map) {
    const hero = runtime.deps.game.gridPlayer, goal = runtime.deps.actExplorationState.markedDestination(run);
    return {
      run,
      map,
      packs: packDigest(runtime, run),
      visited: run.visitedRooms.length,
      discovered: run.discovered,
      status: run.status,
      sealed: !!run.sealed,
      mode: run.mode,
      hotkey: autoKey(runtime),
      locked: autoLocked(runtime),
      gx: hero.gx,
      gy: hero.gy,
      goalX: goal ? goal.gx : -1,
      goalY: goal ? goal.gy : -1,
      large: runtime.deps.document.getElementById("act-exploration-dialog").open
    };
  }
  function render(runtime) {
    const panel = runtime.deps.document.getElementById("act-exploration-panel");
    if (!panel) return;
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    panel.toggleAttribute("hidden", !run);
    runtime.deps.document.getElementById("btn-act-exploration-map").toggleAttribute("hidden", !run);
    runtime.deps.document.getElementById("btn-act-exploration-auto").toggleAttribute("hidden", !run);
    if (!run) {
      runtime.state.shown = {};
      if (runtime.state.gateHintRun) syncGateHint(runtime, null, 0);
      return;
    }
    refreshMaps(runtime, run, runtime.deps.actExplorationMap.forRun(run));
  }
  function refreshMaps(runtime, run, map) {
    const now = summaryOf(runtime, run, map), base = summaryDiffers(runtime, runtime.state.BASE, now), modes = summaryDiffers(runtime, runtime.state.MODES, now);
    if (!base && !modes && !summaryDiffers(runtime, runtime.state.MARK, now)) return;
    const wasLarge = runtime.state.shown.large;
    runtime.state.shown = now;
    if (base) {
      runtime.state.baseRev++;
      renderSeal(runtime, run);
      renderProgress(runtime, run);
    }
    if (modes) renderModes(runtime, run);
    paintMiniMap(runtime, runtime.deps.document.getElementById("act-exploration-map"), run, map);
    refreshLargeMap(runtime, run, map, wasLarge);
  }
  function refreshLargeMap(runtime, run, map, wasLarge) {
    if (runtime.state.shown.large) paintMiniMap(runtime, runtime.deps.document.getElementById("act-exploration-map-large"), run, map);
    else if (wasLarge) releaseLarge(runtime);
  }
  function renderSeal(runtime, run) {
    const remaining = runtime.deps.actExplorationState.remainingElites(run), seal = runtime.deps.document.getElementById("act-exploration-seal");
    seal.textContent = remaining ? "정예 " + remaining : (0, runtime.deps._t)("관문 개방");
    seal.setAttribute("aria-label", sealText(runtime, run, remaining));
    syncGateHint(runtime, run, remaining);
  }
  function syncGateHint(runtime, run, remaining) {
    if (runtime.state.gateHintRun !== run || !remaining) runtime.state.gateHintRun = null;
    const pending = !!runtime.state.gateHintRun, dialog = runtime.deps.document.getElementById("act-exploration-dialog");
    runtime.deps.document.getElementById("btn-act-exploration-map").classList.toggle("tutorial-callout", pending && !dialog.open);
    runtime.deps.document.getElementById("act-exploration-elite-guide").hidden = !pending;
  }
  function guideBlockedGate(runtime, run, cell) {
    const key = "tutorial_elite_gate";
    if (runtime.deps.game.isGuideReplay || runtime.deps.game.seenTutorials.includes(key)) return false;
    const map = runtime.deps.actExplorationMap.forRun(run);
    const atGate = runtime.deps.actExplorationMap.walkable(map, cell) && !runtime.deps.actExplorationMap.walkable(map, cell, true);
    if (!atGate && (!map.stage || runtime.deps.actExplorationRooms.roomAt(map, cell)?.role !== "boss")) return false;
    const remaining = runtime.deps.actExplorationState.remainingElites(run);
    if (!remaining) return false;
    runtime.deps.game.seenTutorials.push(key);
    runtime.state.gateHintRun = run;
    syncGateHint(runtime, run, remaining);
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)("보스 관문을 열려면 남은 정예를 처치하세요. 탐험 지도에서 금빛 표식을 찾을 수 있습니다."), { tone: "warning", duration: 6500 });
    (0, runtime.deps.queueImportantSave)(180);
    return true;
  }
  function paintMiniMap(runtime, canvas, run, map) {
    if (map.stage) runtime.deps.actExplorationRoomsUi.draw(canvas, run, map, runtime.state.baseRev);
    else draw(runtime, canvas, run, map);
  }
  function releaseLarge(runtime) {
    const canvas = runtime.deps.document.getElementById("act-exploration-map-large");
    canvas.width = canvas.height = 1;
    runtime.deps.actExplorationRoomsUi.forgetMapBase(canvas);
  }
  function renderModes(runtime, run) {
    for (const button of runtime.deps.document.querySelectorAll("[data-exploration-mode]")) {
      button.setAttribute("aria-pressed", String(button.dataset.explorationMode === run.mode));
      button.disabled = run.status !== "active";
    }
    const auto = runtime.deps.document.getElementById("btn-act-exploration-auto"), on = run.mode !== "manual", key = autoKey(runtime), locked = autoLocked(runtime);
    auto.setAttribute("aria-pressed", String(on));
    auto.disabled = run.status !== "active";
    auto.classList.toggle("is-locked", locked);
    auto.querySelector("b").textContent = locked ? (0, runtime.deps._t)("자동 잠김") : (0, runtime.deps._t)("자동");
    auto.setAttribute("aria-label", (on ? "자동 이동 켜짐" : "자동 이동 꺼짐(클릭한 곳으로만 이동)") + ", 눌러서 바꾸기" + (key ? " (" + key + ")" : ""));
    const cap = auto.querySelector(".combat-hud-key");
    cap.textContent = key;
    cap.hidden = !key;
    if (key) auto.setAttribute("aria-keyshortcuts", key);
    else auto.removeAttribute("aria-keyshortcuts");
  }
  function autoKey(runtime) {
    return runtime.deps.hotkeyBindings.label(runtime.deps.hotkeyBindings.codeFor(runtime.deps.game.settings.hotkeyOverrides, "combat:autoMove"));
  }
  function renderProgress(runtime, run) {
    const panel = runtime.deps.document.getElementById("act-exploration-panel");
    if (!panel) return;
    panel.style.setProperty("--explore-pct", Math.round(runtime.deps.actExplorationSight.exploredShare(run) * 100) + "%");
  }
  function mode(runtime, value) {
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!run || run.status !== "active") return;
    if (!["direct", "full", "manual"].includes(value)) throw Error("알 수 없는 탐험 방식");
    if (value !== "manual" && autoLocked(runtime)) {
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("자동 사냥은 첫 무기를 장착하면 열립니다."), { tone: "warning", duration: 2e3 });
      return;
    }
    run.mode = value;
    run.destination = null;
    runtime.deps.game.settings.autoMove = value !== "manual";
    if (value !== "manual") runtime.deps.actExplorationProgress.holdAutoStart(run);
    if (value !== "manual") runtime.deps.game.settings.actExplorationMode = value;
    render(runtime);
  }
  function toggleAuto(runtime) {
    if (autoLocked(runtime)) {
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("자동 사냥은 첫 무기를 장착하면 열립니다."), { tone: "warning", duration: 2e3 });
      return false;
    }
    const on = runtime.deps.game.settings.autoMove === false, run = runtime.deps.actExplorationState.current(runtime.deps.game);
    runtime.deps.game.settings.autoMove = on;
    if (run && run.status === "active") {
      run.mode = runtime.deps.actExplorationProgress.startMode(runtime.deps.game.settings);
      if (on) runtime.deps.actExplorationProgress.holdAutoStart(run);
    }
    (0, runtime.deps.showGameToast)(on ? "자동 이동을 켰습니다" : "자동 이동을 껐습니다. 클릭한 곳으로만 움직입니다", { duration: 1800 });
    render(runtime);
    return on;
  }
  function lockOnAt(runtime, point) {
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!run || run.status !== "active") return false;
    const enemy = runtime.deps.battleDrawList.enemyAt(point);
    if (!enemy) return false;
    if (!runtime.deps.actExplorationState.lockOn(run, enemy)) (0, runtime.deps.showGameToast)((0, runtime.deps._t)("그곳으로는 갈 수 없습니다"), { tone: "warning", duration: 1400 });
    else runtime.deps.actExplorationProgress.clearManualSteerHold(run);
    render(runtime);
    return true;
  }
  function hover(runtime, canvas, event) {
    if (!runtime.active) return;
    const queued = runtime.state.hovering;
    runtime.state.hovering = { canvas, event };
    if (!queued) runtime.hoverFrameId = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.hoverFrame);
  }
  function hoverFrame(runtime) {
    runtime.hoverFrameId = null;
    const { canvas, event } = runtime.state.hovering;
    runtime.state.hovering = null;
    const point = event ? battlefieldClientPoint(canvas, event.clientX, event.clientY) : null, npc = point ? runtime.deps.actTitleCard.npcAt(point) : null;
    runtime.deps.actTitleCard.hover(npc);
    const run = runtime.deps.actExplorationState.current(runtime.deps.game), enemy = point && run && run.status === "active" ? runtime.deps.battleDrawList.enemyAt(point) : null;
    const cursor = npc || enemy || runtime.deps.stageDoorMarks.targetAt(point) ? "pointer" : "";
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }
  function commandMove(runtime, cell, point) {
    if (runtime.deps.bossMoves.observer.sceneActive()) return false;
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!runtime.deps.actExplorationProgress.canMove(run) || !cell) return false;
    const accepted = runtime.deps.actExplorationState.selectDestination(run, cell);
    if (accepted && point && runtime.deps.bossMoves.observer.playerBoundary(run)) runtime.deps.actExplorationMotion.aimFree(run, point);
    if (!accepted && !guideBlockedGate(runtime, run, cell)) (0, runtime.deps.showGameToast)((0, runtime.deps._t)("그곳으로는 갈 수 없습니다"), { tone: "warning", duration: 1400 });
    render(runtime);
    return accepted;
  }
  function choose(runtime, event) {
    if (event.currentTarget.id === "act-exploration-map" && runtime.deps.window.matchMedia("(max-width: 1080px)").matches) return expand(runtime);
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!runtime.deps.actExplorationProgress.canMove(run)) return;
    const map = runtime.deps.actExplorationMap.forRun(run), rect = event.currentTarget.getBoundingClientRect();
    if (map.stage) {
      commandMove(runtime, runtime.deps.actExplorationRoomsUi.pick(event, run, map));
      return;
    }
    const view = mapView(runtime, event.currentTarget, map);
    const cell = {
      gx: view.x0 + Math.floor((event.clientX - rect.left) / rect.width * view.cols),
      gy: view.y0 + Math.floor((event.clientY - rect.top) / rect.height * view.rows)
    };
    commandMove(runtime, cell);
  }
  function press(runtime, direction, down) {
    const index = runtime.state.held.indexOf(direction);
    if (index >= 0) runtime.state.held.splice(index, 1);
    if (down && runtime.state.STEPS[direction]) runtime.state.held.push(direction);
    if (!direction) runtime.state.held.length = 0;
  }
  function holdMove(runtime, direction, down) {
    if (!runtime.active) return false;
    press(runtime, direction, down);
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!runtime.deps.actExplorationProgress.canMove(run)) {
      runtime.state.held.length = 0;
      stopWalking(runtime, null);
      return false;
    }
    if ((0, runtime.deps.isForegroundGameplayPausedForBackground)()) return nudge(runtime, run, down && direction);
    if (!runtime.state.held.length) {
      stopWalking(runtime, run);
      return true;
    }
    steer(runtime);
    runtime.state.walkTimer = runtime.state.walkTimer || (0, runtime.deps.setInterval)(runtime.handlers.steer, runtime.state.WALK_TICK_MS);
    return true;
  }
  function nudge(runtime, run, direction) {
    runtime.state.held.length = 0;
    runtime.deps.actExplorationMotion.setFreeInput(run, runtime.deps.game.gridPlayer, 0, 0);
    if (runtime.state.walkTimer) {
      (0, runtime.deps.clearInterval)(runtime.state.walkTimer);
      runtime.state.walkTimer = null;
    }
    if (!runtime.state.STEPS[direction]) return true;
    const [dx, dy] = runtime.state.STEPS[direction], from = run.destination || footing(runtime, run);
    runtime.deps.actExplorationState.selectDestination(run, { gx: from.gx + dx, gy: from.gy + dy });
    render(runtime);
    return true;
  }
  function steer(runtime) {
    const run = runtime.deps.actExplorationState.current(runtime.deps.game), direction = runtime.state.held[runtime.state.held.length - 1];
    if (!runtime.deps.actExplorationProgress.canMove(run) || !direction) {
      runtime.state.held.length = 0;
      return stopWalking(runtime, run);
    }
    if (runtime.deps.bossMoves.observer.sceneActive()) return;
    if (runtime.deps.bossMoves.observer.playerBoundary(run)) {
      steerFree(runtime, run);
      return;
    }
    const [dx, dy] = runtime.state.STEPS[direction], from = footing(runtime, run);
    let reached = 0;
    while (reached < runtime.state.WALK_REACH && runtime.deps.actExplorationState.selectDestination(run, { gx: from.gx + dx * (reached + 1), gy: from.gy + dy * (reached + 1) }, runtime.state.KEYED)) reached++;
    if (!reached) runtime.deps.actExplorationState.selectDestination(run, from, runtime.state.KEYED);
    render(runtime);
  }
  function steerFree(runtime, run) {
    if ((0, runtime.deps.isForegroundGameplayPausedForBackground)()) {
      runtime.deps.actExplorationMotion.setFreeInput(run, runtime.deps.game.gridPlayer, 0, 0);
      return;
    }
    const dx = Number(runtime.state.held.includes("right")) - Number(runtime.state.held.includes("left"));
    const dy = Number(runtime.state.held.includes("down")) - Number(runtime.state.held.includes("up"));
    run.destination = null;
    runtime.deps.actExplorationProgress.objects.cancel(run);
    runtime.deps.actExplorationProgress.holdAutoManual(run);
    runtime.deps.actExplorationMotion.setFreeInput(run, runtime.deps.game.gridPlayer, dx, dy);
  }
  function stopWalking(runtime, run) {
    if (runtime.state.walkTimer) {
      (0, runtime.deps.clearInterval)(runtime.state.walkTimer);
      runtime.state.walkTimer = null;
    }
    runtime.deps.actExplorationMotion.setFreeInput(run, runtime.deps.game.gridPlayer, 0, 0);
    if (runtime.deps.bossMoves.observer.sceneActive()) return;
    if (runtime.deps.bossMoves.observer.playerBoundary(run)) return;
    if (runtime.deps.actExplorationProgress.canMove(run) && run.destination) runtime.deps.actExplorationState.selectDestination(run, footing(runtime, run), runtime.state.KEYED);
  }
  function expand(runtime) {
    const dialog = runtime.deps.document.getElementById("act-exploration-dialog");
    dialog.showModal();
    if (runtime.state.gateHintRun) {
      syncGateHint(runtime, runtime.state.gateHintRun, runtime.deps.actExplorationState.remainingElites(runtime.state.gateHintRun));
      runtime.gateDialog = dialog;
      dialog.addEventListener("close", runtime.handlers.closeExplorationGateHint, { once: true });
    }
    render(runtime);
  }
  function sealText(runtime, run, remaining) {
    if (remaining) return (0, runtime.deps._t)("남은 정예 {remaining}, 모두 처치하면 보스 관문이 열립니다", { remaining });
    return run.sealed ? (0, runtime.deps._t)("관문이 아직 닫혀 있습니다.") : (0, runtime.deps._t)("보스 관문이 열렸습니다.");
  }
  function hint(runtime, event) {
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!run) return;
    const rect = event.currentTarget.getBoundingClientRect(), count = runtime.deps.actExplorationState.remainingElites(run);
    hostTooltipIn(runtime, event.currentTarget.closest("dialog"));
    (0, runtime.deps.showInfoTooltipHtml)(rect.left, rect.bottom, (0, runtime.deps.escapeHTML)(sealText(runtime, run, count)), "#b79c58", "act-gate-" + count + (run.sealed ? "s" : ""));
  }
  function hostTooltipIn(runtime, dialog) {
    const tip = runtime.deps.document.getElementById("info-tooltip");
    if (!dialog?.open || tip.parentElement === dialog) return;
    dialog.append(tip);
    runtime.tooltipDialog = dialog;
    runtime.tooltip = tip;
    dialog.addEventListener("close", runtime.handlers.restoreExplorationTooltip, { once: true });
  }
  function departureClick(runtime, event) {
    const button = event.target.closest("[onclick], [data-exploration-departure]");
    if (!button?.hasAttribute("data-exploration-departure") || button.disabled) return;
    if (button === runtime.state.approvedDeparture) {
      runtime.state.approvedDeparture = null;
      return;
    }
    const run = runtime.deps.actExplorationState.current(runtime.deps.game);
    if (!run || run.completionApplied || run.status !== "active") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!runtime.state.departurePending) confirmDeparture(runtime, button, run);
  }
  async function confirmDeparture(runtime, button, run) {
    runtime.state.departurePending = true;
    const origin = { state: runtime.deps.game, run, zoneId: runtime.deps.game.currentZoneId, season: runtime.deps.game.season };
    try {
      const copy = departureCopy(runtime, button);
      const accepted = await (0, runtime.deps.requestGameConfirmation)(copy.message, { title: copy.title, tone: "danger", confirmLabel: copy.confirm, cancelLabel: copy.cancel });
      if (!accepted || !departureStillCurrent(runtime, origin)) return;
      if (!button.isConnected || button.disabled) {
        (0, runtime.deps.showGameToast)((0, runtime.deps._t)("이동할 화면이 변경되었습니다. 목적지를 다시 선택하세요."), { tone: "warning" });
        return;
      }
      runtime.state.approvedDeparture = button;
      button.click();
    } catch (error) {
      runtime.deps.console.error("탐험 이동 확인 실패:", error);
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("이동 확인에 실패했습니다. 탐험은 유지됩니다."), { tone: "danger" });
    } finally {
      runtime.state.approvedDeparture = null;
      runtime.state.departurePending = false;
    }
  }
  function departureStillCurrent(runtime, origin) {
    return runtime.active && runtime.deps.game === origin.state && runtime.deps.game.actExploration === origin.run && runtime.deps.game.currentZoneId === origin.zoneId && runtime.deps.game.season === origin.season;
  }
  function departureMessage() {
    return "탐험 진행이 초기화됩니다. 이미 획득한 아이템과 재화는 유지됩니다.";
  }
  function departureCopy(runtime, button) {
    const own = button.dataset;
    return { title: own.departureTitle || "탐험을 포기하고 이동할까요?", message: own.departureMessage || departureMessage(), confirm: own.departureConfirm || "포기하고 이동", cancel: own.departureCancel || "계속 탐험" };
  }
  function summaryDiffers(runtime, fields, now) {
    return fields.some((field) => now[field] !== runtime.state.shown[field]);
  }
  function autoLocked(runtime) {
    return typeof runtime.deps.openingJourney === "object" && runtime.deps.openingJourney.autoLocked();
  }
  function footing(runtime, run) {
    return run.motion ? run.motion.to : runtime.deps.game.gridPlayer;
  }
  function closeExplorationGateHint(runtime) {
    runtime.gateDialog = null;
    runtime.state.gateHintRun = null;
    syncGateHint(runtime, null, 0);
  }
  function restoreExplorationTooltip(runtime) {
    runtime.tooltipDialog?.removeEventListener("close", runtime.handlers.restoreExplorationTooltip);
    if (runtime.tooltip) {
      (0, runtime.deps.hideInfoTooltip)();
      runtime.deps.document.body.append(runtime.tooltip);
    }
    runtime.tooltipDialog = runtime.tooltip = null;
  }

  // modules/ui/act-exploration-view.mjs
  function createActExplorationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, hoverFrameId: null, gateDialog: null, tooltipDialog: null, tooltip: null };
    const handlers = { closeExplorationGateHint, restoreExplorationTooltip, hoverFrame, steer, render, mode, toggleAuto, commandMove, lockOnAt, hover, choose, holdMove, expand, hint, departureClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.drawFloorEdges = createDrawFloorEdges(runtime);
    runtime.handlers.drawMarkers = createDrawMarkers(runtime);
    runtime.api = { render: runtime.handlers.render, mode: runtime.handlers.mode, toggleAuto: runtime.handlers.toggleAuto, commandMove: runtime.handlers.commandMove, lockOnAt: runtime.handlers.lockOnAt, hover: runtime.handlers.hover, choose: runtime.handlers.choose, holdMove: runtime.handlers.holdMove, expand: runtime.handlers.expand, hint: runtime.handlers.hint, departurePending: () => runtime.state.departurePending };
    runtime.deps.document.addEventListener("click", runtime.handlers.departureClick, true);
    runtime.api.dispose = () => disposeActExplorationView(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.departurePending = false;
    runtime.state.approvedDeparture = null;
    runtime.state.gateHintRun = null;
    runtime.state.BASE = ["run", "map", "packs", "visited", "discovered", "status", "sealed"];
    runtime.state.MODES = ["run", "status", "mode", "hotkey", "locked"];
    runtime.state.MARK = ["gx", "gy", "goalX", "goalY", "large"];
    runtime.state.shown = {};
    runtime.state.baseRev = 0;
    runtime.state.MAP_INK = { fog: "#050807", grid: "rgba(201,164,92,.06)", floor: "#7d7152", wall: "#26342c", edge: "rgba(240,214,150,.85)" };
    runtime.state.MINI_VIEW = 19;
    runtime.state.MINI_MARKER_BASE = 13;
    runtime.state.EDGE_SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    runtime.state.ENCOUNTER_MARKS = { breach: "#b58ce0", hive: "#79a8e8", treasure: "#8fd08a", meteor: "#f2efe6", redAltar: "#f07a2a", blueAltar: "#3f6dff" };
    runtime.state.hovering = null;
    runtime.state.STEPS = Object.freeze({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] });
    runtime.state.WALK_REACH = 4;
    runtime.state.WALK_TICK_MS = 90;
    runtime.state.held = [];
    runtime.state.walkTimer = null;
    runtime.state.KEYED = Object.freeze({ unmarked: true });
  }
  function disposeActExplorationView(runtime) {
    runtime.active = false;
    runtime.deps.document.removeEventListener("click", runtime.handlers.departureClick, true);
    if (runtime.hoverFrameId !== null) runtime.deps.cancelAnimationFrame(runtime.hoverFrameId);
    runtime.hoverFrameId = null;
    runtime.state.hovering = null;
    runtime.state.held.length = 0;
    stopWalking(runtime, runtime.deps.actExplorationState.current(runtime.deps.game));
    runtime.gateDialog?.removeEventListener("close", runtime.handlers.closeExplorationGateHint);
    runtime.gateDialog = null;
    runtime.state.gateHintRun = null;
    restoreExplorationTooltip(runtime);
    runtime.state.shown = {};
  }

  // modules/act-exploration-ui-classic.mjs
  var actExplorationUi = createActExplorationView({
    get game() {
      return window.GameModules.state.game;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get document() {
      return document;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get _t() {
      return _t;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get showGameToast() {
      return showGameToast;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get actExplorationRoomsUi() {
      return actExplorationRoomsUi;
    },
    get hotkeyBindings() {
      return hotkeyBindings;
    },
    get actExplorationSight() {
      return actExplorationSight;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get battleDrawList() {
      return battleDrawList;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get actTitleCard() {
      return actTitleCard;
    },
    get stageDoorMarks() {
      return stageDoorMarks;
    },
    get bossMoves() {
      return bossMoves;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get window() {
      return window;
    },
    get isForegroundGameplayPausedForBackground() {
      return isForegroundGameplayPausedForBackground;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get console() {
      return console;
    },
    get openingJourney() {
      return typeof openingJourney === "undefined" ? void 0 : openingJourney;
    }
  });
  safeExposeGlobals({ actExplorationUi });
})();
