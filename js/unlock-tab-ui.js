// GENERATED from modules/unlock-tab-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/unlock-tree-lifetime.mjs
  function initializeUnlockSelection(runtime) {
    Object.assign(runtime.state, {
      owner: runtime.deps.game,
      view_selectedId: "",
      view_shownKey: "",
      view_centerNow: true,
      view_revealId: "",
      view_jump: 0,
      view_shownOwned: null,
      view_shownOpenParents: null,
      view_layoutNow: null,
      view_plannedPath: /* @__PURE__ */ new Set(),
      view_shownSeason: void 0
    });
  }
  function syncUnlockOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return false;
    runtime.state.stopGesture?.();
    initializeUnlockSelection(runtime);
    return true;
  }
  function releaseUnlockPanel(runtime) {
    runtime.state.stopGesture?.();
    runtime.state.observer?.disconnect();
    if (runtime.state.panel) releaseViewTarget(runtime, runtime.state.panel);
    runtime.state.panel = runtime.state.observer = null;
    runtime.state.view_shownKey = "";
  }
  function beginUnlockGesture(runtime, event, scroller, apply) {
    runtime.state.stopGesture?.();
    const owner = runtime.deps.game, panel = runtime.state.panel;
    const move = (next) => {
      if (next.pointerId !== event.pointerId) return;
      if (!runtime.active || runtime.deps.game !== owner || !panel?.isConnected || !scroller.isConnected) {
        stop();
        return;
      }
      apply(next);
    };
    const release = (next) => {
      if (next.pointerId === event.pointerId) stop();
    };
    const stop = () => {
      runtime.deps.window.removeEventListener("pointermove", move);
      runtime.deps.window.removeEventListener("pointerup", release);
      runtime.deps.window.removeEventListener("pointercancel", release);
      scroller.classList.remove("is-panning");
      if (runtime.state.stopGesture === stop) runtime.state.stopGesture = null;
    };
    runtime.state.stopGesture = stop;
    runtime.deps.window.addEventListener("pointermove", move);
    runtime.deps.window.addEventListener("pointerup", release);
    runtime.deps.window.addEventListener("pointercancel", release);
  }

  // modules/ui/unlock-tree-labels.mjs
  function upgradeEffect(runtime, series, rank) {
    const spec = runtime.deps.CONTENT_UNLOCK_SERIES.find((row) => row.series === series);
    if (series === "offlineHours") return (0, runtime.deps._t)("{value}시간", { value: runtime.deps.OFFLINE_PROGRESS_RECOGNITION_HOURS[rank] });
    if (series === "offlineRate") return `${Math.round(runtime.deps.OFFLINE_PROGRESS_EFFICIENCY_RATES[rank] * 100)}%`;
    if (series === "bagPage") return (0, runtime.deps._t)("{value}페이지", { value: 1 + rank });
    if (series === "stumpSeal") return (0, runtime.deps._t)("{rank}칸", { rank });
    if (series === "stumpQuality") return `${130 + rank * 10}%`;
    if (series === "stumpNurseryRate") return `${Math.round((runtime.deps.STUMP_BOX_NURSERY.rate + rank * runtime.deps.STUMP_BOX_NURSERY.ratePerRank) * 100)}%`;
    return `+${rank * spec.storage}`;
  }
  function gainOf(runtime, def) {
    if (!def.series) return (0, runtime.deps._t)(def.gain || "");
    const after = upgradeEffect(runtime, def.series, def.rank);
    if (def.series === "stumpSeal") return (0, runtime.deps._t)("봉인 칸 {after}", { after });
    if (def.series === "stumpQuality") return def.rank > 1 ? (0, runtime.deps._t)("품질 상한 {after}, 접붙이기 {value}단계", { after, value: def.rank + 4 }) : (0, runtime.deps._t)("품질 상한 {after}", { after });
    if (def.series === "stumpStorage") return (0, runtime.deps._t)("보관함 {after}칸", { after });
    return `${upgradeEffect(runtime, def.series, def.rank - 1)} → ${after}`;
  }
  function cardGain(runtime, def) {
    return gainOf(runtime, def) || (def.cost ? "" : (0, runtime.deps._t)("자동"));
  }
  function view_cardName(runtime, def) {
    return (0, runtime.deps._t)(def.rail ? runtime.deps.CONTENT_UNLOCK_RAILS.find((row) => row.rail === def.rail).name : def.name);
  }

  // modules/ui/unlock-tree-metrics.mjs
  function boardFamilyOf(runtime, def) {
    let row = def;
    while (row.after && !runtime.state.UNLOCK_LOOSE_FAMILY[row.id]) row = runtime.state.boardById.get(row.after);
    return runtime.state.UNLOCK_LOOSE_FAMILY[row.id] || runtime.state.UNLOCK_FAMILIES.find((family) => family.root === row.id).id;
  }
  function boardCardWidth(runtime, def, height) {
    const texts = [view_cardName(runtime, def), ...height >= runtime.state.boardSIZE.gainFrom ? [cardGain(runtime, def)] : []];
    return height - 2 + 5 + Math.max(runtime.state.boardSIZE.minCardText, ...texts.map(runtime.handlers.boardTextWidth)) + 8;
  }
  function boardTreeOrder(runtime) {
    const done = /* @__PURE__ */ new Set(), order = [];
    while (order.length < runtime.state.boardRows.length) {
      const before = order.length;
      for (const def of runtime.state.boardRows) {
        if (done.has(def.id) || !runtime.deps.contentProgression.parents(def).every((id) => done.has(id))) continue;
        done.add(def.id);
        order.push(def);
      }
      if (order.length === before) throw new Error("unlock board: a cycle in the prerequisites");
    }
    return order;
  }
  function boardReadTree(runtime) {
    const sorted = boardTreeOrder(runtime), loopOf = /* @__PURE__ */ new Map(), depthOf = /* @__PURE__ */ new Map(), kids = /* @__PURE__ */ new Map(), sizes = /* @__PURE__ */ new Map();
    for (const def of sorted) {
      const earlier = runtime.deps.contentProgression.parents(def);
      const at = Math.max(def.minLoop, ...earlier.map((id) => loopOf.get(id)));
      loopOf.set(def.id, at);
      depthOf.set(def.id, earlier.filter((id) => loopOf.get(id) === at).reduce((best, id) => Math.max(best, depthOf.get(id) + 1), 0));
      if (def.after) kids.set(def.after, [...kids.get(def.after) || [], def]);
    }
    for (const def of [...sorted].reverse()) sizes.set(def.id, 1 + (kids.get(def.id) || []).reduce((sum, kid) => sum + sizes.get(kid.id), 0));
    const familyRank = (def) => runtime.state.UNLOCK_FAMILIES.findIndex((row) => row.id === boardFamilyOf(runtime, def));
    const order = runtime.state.boardRows.map((def, index) => ({ def, index, loop: loopOf.get(def.id), depth: depthOf.get(def.id), family: familyRank(def) })).sort((p, q) => p.loop - q.loop || p.depth - q.depth || p.family - q.family || p.index - q.index).map((row) => row.def);
    const stems = /* @__PURE__ */ new Map();
    kids.forEach((list, id) => stems.set(id, (list.find(runtime.handlers.boardIsStep) || list.reduce((best, kid) => sizes.get(kid.id) > sizes.get(best.id) ? kid : best)).id));
    return { loopOf, order, stems };
  }
  function boardIsStep(runtime, def) {
    return !!def.rail && runtime.state.boardById.get(def.after)?.rail === def.rail;
  }
  function boardSlotKey(runtime, loop, sub) {
    return loop + sub / 10;
  }
  function boardTextWidth(runtime, text) {
    return [...String(text)].reduce((sum, letter) => sum + (letter.charCodeAt(0) > 8192 ? 12 : 8), 0);
  }
  function boardPipWidth(runtime, def) {
    return Math.max(runtime.state.boardSIZE.pip, boardTextWidth(runtime, upgradeEffect(runtime, def.series, def.rank)) + 10);
  }
  function boardCellWidth(runtime, def, height) {
    return boardIsStep(runtime, def) ? boardPipWidth(runtime, def) : boardCardWidth(runtime, def, height);
  }

  // modules/ui/unlock-tree-layout.mjs
  function boardNearRows(runtime, plan, start, side) {
    const list = [];
    for (let step = 1; step < plan.count; step++) list.push(start + side * step, start - side * step);
    return list;
  }
  function boardPutCell(runtime, plan, def, spot, from) {
    const here = boardSlotKey(runtime, spot.loop, spot.sub), stem = plan.tree.stems.get(def.id);
    plan.rows[spot.row].push([from === null ? here - 0.01 : from, here + 0.01, ""]);
    plan.spots.set(def.id, { def, ...spot });
    if (stem && plan.tree.loopOf.get(stem) > spot.loop) plan.rows[spot.row].push([here + 0.01, boardSlotKey(runtime, plan.tree.loopOf.get(stem), 0) + 0.01, stem]);
    return true;
  }
  function boardPlaceRoot(runtime, plan, def) {
    const loop = plan.tree.loopOf.get(def.id), family = runtime.state.UNLOCK_FAMILIES.find((row2) => row2.id === boardFamilyOf(runtime, def));
    const start = Math.round((plan.count - 1) * family.at), spot = boardSlotKey(runtime, loop, 0);
    const row = [start, ...boardNearRows(runtime, plan, start, family.side)].find((value) => boardFree(runtime, plan, value, spot - 0.01, spot + 0.01));
    return row !== void 0 && boardPutCell(runtime, plan, def, { loop, sub: 0, row }, null);
  }
  function boardPlaceStep(runtime, plan, def, parent) {
    const loop = plan.tree.loopOf.get(def.id), from = boardSlotKey(runtime, parent.loop, parent.sub) + 0.01;
    let sub = parent.loop === loop ? parent.sub + 1 : 0;
    while (sub < 9 && !boardFree(runtime, plan, parent.row, boardSlotKey(runtime, loop, sub) - 0.01, boardSlotKey(runtime, loop, sub) + 0.01)) sub++;
    return boardFree(runtime, plan, parent.row, from, boardSlotKey(runtime, loop, sub) + 0.01) && boardPutCell(runtime, plan, def, { loop, sub, row: parent.row }, from);
  }
  function createBoardPlaceAlong(runtime) {
    return function boardPlaceAlong(plan, def, parent, firstSub, withParentRow) {
      const loop = plan.tree.loopOf.get(def.id), side = runtime.state.UNLOCK_FAMILIES.find((row) => row.id === boardFamilyOf(runtime, def)).side, parentKey = boardSlotKey(runtime, parent.loop, parent.sub);
      const candidates = [...withParentRow ? [parent.row] : [], ...boardNearRows(runtime, plan, parent.row, side)];
      const fromOf = (row) => parentKey + (row === parent.row ? 0.01 : 0.05);
      for (let sub = firstSub; sub < 9; sub++) {
        const row = candidates.find((value) => boardFree(runtime, plan, value, fromOf(value), boardSlotKey(runtime, loop, sub) + 0.01));
        if (row !== void 0) return boardPutCell(runtime, plan, def, { loop, sub, row }, fromOf(row));
      }
      return false;
    };
  }
  function boardPlaceStacked(runtime, plan, def, parent) {
    const side = runtime.state.UNLOCK_FAMILIES.find((row2) => row2.id === boardFamilyOf(runtime, def)).side, here = boardSlotKey(runtime, parent.loop, parent.sub);
    const row = [parent.row + side, parent.row - side].find((value) => boardFree(runtime, plan, value, here - 0.01, here + 0.01));
    return row !== void 0 ? boardPutCell(runtime, plan, def, { loop: parent.loop, sub: parent.sub, row }, null) : runtime.handlers.boardPlaceAlong(plan, def, parent, parent.sub + 1, true);
  }
  function boardPlaceRow(runtime, plan, def) {
    const parent = def.after ? plan.spots.get(def.after) : null;
    if (!parent) return boardPlaceRoot(runtime, plan, def);
    if (boardIsStep(runtime, def)) return boardPlaceStep(runtime, plan, def, parent);
    if (plan.tree.loopOf.get(def.id) === parent.loop) return boardPlaceStacked(runtime, plan, def, parent);
    return runtime.handlers.boardPlaceAlong(plan, def, parent, 0, plan.tree.stems.get(parent.def.id) === def.id);
  }
  function boardTryCount(runtime, count, tree) {
    const plan = { count, tree, rows: Array.from({ length: count }, () => []), spots: /* @__PURE__ */ new Map(), me: "" };
    for (const def of tree.order) {
      plan.me = def.id;
      if (!boardPlaceRow(runtime, plan, def)) return null;
    }
    return plan.spots;
  }
  function boardMeasureColumns(runtime, spots) {
    const slots = /* @__PURE__ */ new Map();
    spots.forEach((spot) => {
      const name = `${spot.loop}.${spot.sub}`, slot = slots.get(name) || { loop: spot.loop, sub: spot.sub, w: 0 };
      slot.w = Math.max(slot.w, boardCellWidth(runtime, spot.def, runtime.state.boardSIZE.maxCard) + runtime.state.boardSIZE.cardGap);
      slots.set(name, slot);
    });
    let x = runtime.state.boardSIZE.left;
    const columns = [...slots.values()].sort((a, b) => a.loop - b.loop || a.sub - b.sub), loops = [];
    columns.forEach((slot) => {
      slot.x = x;
      x += slot.w;
      const last = loops[loops.length - 1];
      if (last && last.loop === slot.loop) last.w += slot.w;
      else loops.push({ loop: slot.loop, x: slot.x, w: slot.w });
    });
    spots.forEach((spot) => {
      spot.col = slots.get(`${spot.loop}.${spot.sub}`);
    });
    return { loops, width: x + 40 };
  }
  function boardBuildBase(runtime) {
    const tree = boardReadTree(runtime);
    for (let count = runtime.state.boardSIZE.minRows; count <= runtime.state.boardSIZE.maxRows; count++) {
      const spots = boardTryCount(runtime, count, tree);
      if (spots) return { spots, count, ...boardMeasureColumns(runtime, spots) };
    }
    throw new Error("unlock board: no row count fits the tree");
  }
  function boardLayout(runtime, height) {
    const board = boardBuilt(runtime), pitch = Math.max(runtime.state.boardSIZE.minPitch, Math.min(runtime.state.boardSIZE.maxPitch, Math.floor((height - runtime.state.boardSIZE.ruler) / board.count)));
    const cardH = Math.min(pitch - 4, runtime.state.boardSIZE.maxCard), pos = /* @__PURE__ */ new Map();
    board.spots.forEach((spot, id) => {
      const step = boardIsStep(runtime, spot.def), rowTop = runtime.state.boardSIZE.ruler + spot.row * pitch, y = rowTop + Math.floor(pitch / 2);
      const w = boardCellWidth(runtime, spot.def, cardH), h = step ? runtime.state.boardSIZE.pipH : cardH, left = spot.col.x + Math.floor((spot.col.w - w) / 2);
      pos.set(id, { def: spot.def, step, row: spot.row, loop: spot.loop, left, right: left + w, y, top: y - Math.floor(h / 2), w, h, cx: left + Math.floor(w / 2), rowTop, rowBottom: rowTop + pitch, col: spot.col });
    });
    return { board, pos, pitch, cardH, height, fullHeight: Math.max(height, runtime.state.boardSIZE.ruler + board.count * pitch) };
  }
  function boardEdgePoints(runtime, L, from, to) {
    const p = L.pos.get(from), c = L.pos.get(to), skip = [from, to], out = p.col.x + p.col.w, inn = c.col.x;
    if (p.col === c.col) return c.y > p.y ? [[p.cx, p.top + p.h], [p.cx, c.top]] : [[p.cx, p.top], [p.cx, c.top + c.h]];
    const toward = (x, y) => [[p.right, p.y], [x, p.y], [x, y], [c.left, c.y]];
    if (runtime.state.boardById.get(to).after === from) return p.y === c.y ? [[p.right, p.y], [c.left, c.y]] : toward(out, c.y);
    if (runtime.handlers.boardClearRun(L, p.y, p.right, inn, skip)) return toward(inn, c.y);
    if (runtime.handlers.boardClearRun(L, c.y, out, c.left, skip)) return toward(out, c.y);
    const gap = c.y < p.y ? p.rowTop : p.rowBottom;
    return [[p.right, p.y], [out, p.y], [out, gap], [inn, gap], [inn, c.y], [c.left, c.y]];
  }
  function boardFree(runtime, plan, row, from, to) {
    return row >= 0 && row < plan.count && !plan.rows[row].some(([a, b, owner]) => owner !== plan.me && a < to && b > from);
  }
  function boardBuilt(runtime) {
    if (!runtime.state.boardBase || runtime.state.boardBase.language !== runtime.deps.i18n.language) runtime.state.boardBase = { ...boardBuildBase(runtime), language: runtime.deps.i18n.language };
    return runtime.state.boardBase;
  }
  function createBoardClearRun() {
    return function boardClearRun(L, y, from, to, skip) {
      return ![...L.pos.values()].some((row) => !skip.includes(row.def.id) && row.y === y && row.left < to && row.right > from);
    };
  }

  // modules/ui/unlock-tree-markup.mjs
  function stateOf(runtime, def) {
    const status = runtime.deps.contentProgression.status(def.id);
    if (status.unlocked) return "owned";
    if (status.available) return "ready";
    if (!view_parentsOpen(runtime, def)) return "far";
    return runtime.deps.contentProgression.requirements(def.id).every((row) => row.met) ? "short" : "soon";
  }
  function readyRows(runtime) {
    return runtime.state.unlockBoard.rows.filter((def) => runtime.deps.contentProgression.kind(def) === "paid" && runtime.deps.contentProgression.status(def.id).available);
  }
  function tipOf(runtime, def, step) {
    const lines = step ? [`${(0, runtime.deps._t)(def.name)}, ${def.cost}P`, gainOf(runtime, def), (0, runtime.deps._t)(def.description)] : [gainOf(runtime, def), (0, runtime.deps._t)(def.description)];
    return (0, runtime.deps.escapeHTML)(lines.filter(Boolean).join("\n"));
  }
  function nodeClass(runtime, def, state, marks) {
    const lit = marks.lit.has(def.id) ? " is-lit" : "", fresh = marks.fresh.has(def.id) ? " is-fresh" : "", chosen = runtime.state.view_selectedId === def.id ? " is-chosen" : "";
    const plan = runtime.state.view_plannedPath.has(def.id) ? " is-planned" : "", goal = runtime.deps.game.contentProgression.plannedUnlockId === def.id ? " is-goal" : "";
    return `fam-${runtime.state.unlockBoard.familyOf(def)} kind-${runtime.deps.contentProgression.kind(def)} is-${state}${lit}${fresh}${chosen}${plan}${goal}${marks.unseen.has(def.id) ? " is-unseen" : ""}`;
  }
  function unseenIds(runtime) {
    const seen = new Set(runtime.deps.game.seenUnlocks || []);
    return new Set(runtime.state.unlockBoard.rows.filter((def) => !seen.has(def.id) && runtime.state.UNLOCK_UNSEEN_STATES.has(stateOf(runtime, def))).map((def) => def.id));
  }
  function nodeHtml(runtime, def, L, marks) {
    const at = L.pos.get(def.id), state = stateOf(runtime, def), style = `left:${at.left}px;top:${at.top}px;width:${at.w}px;height:${at.h}px`, name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name));
    if (at.step) return `<button type="button" class="unlock-pip ${nodeClass(runtime, def, state, marks)}" data-unlock-select="${def.id}" data-tip="${tipOf(runtime, def, true)}" aria-label="${name}" style="${style}">${(0, runtime.deps.escapeHTML)(upgradeEffect(runtime, def.series, def.rank))}${view_unseenHtml(runtime, def, marks)}</button>`;
    const chip = state !== "owned" && def.cost ? `<small class="unlock-chip">${def.cost}P</small>` : "";
    const second = L.cardH >= runtime.state.UNLOCK_BOARD_SIZE.gainFrom ? `<small class="unlock-card-gain">${(0, runtime.deps.escapeHTML)(cardGain(runtime, def))}</small>` : "";
    return `<button type="button" class="unlock-card ${nodeClass(runtime, def, state, marks)}" data-unlock-select="${def.id}" data-tip="${tipOf(runtime, def, false)}" aria-label="${name}" style="${style};--icon:${at.h - 2}px">
            <span class="unlock-ic"><img src="${runtime.deps.contentUnlockUi.art(def)}" alt="" draggable="false" loading="lazy">${chip}</span><span class="unlock-card-text"><b>${(0, runtime.deps.escapeHTML)(view_cardName(runtime, def))}</b>${second}</span>${view_unseenHtml(runtime, def, marks)}</button>`;
  }
  function edgesHtml(runtime, L, marks) {
    const rank = { "is-dim": 0, "is-next": 1, "is-lit": 2 }, edges = [];
    runtime.state.unlockBoard.rows.forEach((def) => runtime.deps.contentProgression.parents(def).forEach((from) => {
      const points = runtime.state.unlockBoard.edgePoints(L, from, def.id), long = Math.abs(points[points.length - 1][0] - points[0][0]) > 300;
      const state = runtime.deps.contentProgression.isUnlocked(def.id) ? "is-lit" : runtime.deps.contentProgression.isUnlocked(from) ? "is-next" : "is-dim";
      edges.push({ from, to: def.id, points, long, state, side: def.after !== from, fresh: marks.lit.has(from) && marks.fresh.has(def.id) });
    }));
    return edges.sort((a, b) => rank[a.state] - rank[b.state]).map((edge) => {
      const planned = runtime.state.view_plannedPath.has(edge.from) && runtime.state.view_plannedPath.has(edge.to) ? " is-planned" : "";
      const name = `fam-${runtime.state.unlockBoard.familyOf(runtime.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === edge.from))} ${edge.state}${planned}${edge.fresh ? " is-new" : ""}${edge.long ? " is-long" : ""}${edge.side ? " is-side" : ""}`;
      return `<polyline class="${name}"${edge.fresh ? ' pathLength="1"' : ""} data-from="${edge.from}" data-to="${edge.to}" points="${edge.points.map((point) => point.join(",")).join(" ")}"/>`;
    }).join("");
  }
  function nowEntry(runtime, board) {
    return board.loops.filter((row) => row.loop <= runtime.deps.game.season).pop() || board.loops[0];
  }
  function nowLeft(runtime, scroller) {
    const now = nowEntry(runtime, runtime.state.view_layoutNow.board);
    return Math.max(0, now.x + now.w - scroller.clientWidth * 0.72);
  }
  function railLabelsHtml(runtime, L) {
    const rails = /* @__PURE__ */ new Map();
    runtime.state.unlockBoard.rows.filter((def) => def.rail).forEach((def) => {
      const at = L.pos.get(def.id), span = rails.get(def.rail) || { left: at.left, right: at.right, first: at.right, y: at.y, def };
      span.right = Math.max(span.right, at.right);
      rails.set(def.rail, span);
    });
    return [...rails.values()].map((span) => `<div class="unlock-rail fam-${runtime.state.unlockBoard.familyOf(span.def)}" data-card-end="${span.first}" style="left:${span.left}px;width:${span.right - span.left}px;top:${span.y - 24}px"><span>${(0, runtime.deps.escapeHTML)(view_cardName(runtime, span.def))}</span></div>`).join("");
  }
  function canvasHtml(runtime, L, marks, height) {
    const board = L.board, now = nowEntry(runtime, board);
    const ticks = board.loops.map((row) => `<span class="unlock-tick${row === now ? " is-now" : ""}${row.loop < now.loop ? " is-past" : ""}${row.loop % 5 === 0 ? " is-major" : ""}" style="left:${row.x}px;width:${row.w}px">${row.loop}</span>`).join("");
    const bands = board.loops.map((row) => `<span class="unlock-col${Math.floor(row.loop / 5) % 2 ? " is-alt" : ""}" style="left:${row.x}px;width:${row.w}px"></span>`).join("");
    return `${bands}<div class="unlock-past" style="width:${now.x}px"></div><div class="unlock-now" style="left:${now.x}px;width:${now.w}px"></div><div class="unlock-ruler">${ticks}</div>
            <svg class="unlock-lines" width="${board.width}" height="${height}" aria-hidden="true">${edgesHtml(runtime, L, marks)}</svg>${railLabelsHtml(runtime, L)}${runtime.state.unlockBoard.rows.map((def) => nodeHtml(runtime, def, L, marks)).join("")}`;
  }
  function overviewHtml(runtime, L) {
    const total = L.board.width, step = 38 / L.board.count;
    const ticks = runtime.state.unlockBoard.rows.map((def) => {
      const at = L.pos.get(def.id);
      return `<i class="fam-${runtime.state.unlockBoard.familyOf(def)} is-${stateOf(runtime, def)}" style="left:${(at.cx / total * 100).toFixed(2)}%;top:${Math.round(at.row * step) + 1}px"></i>`;
    }).join("");
    const now = nowEntry(runtime, L.board);
    return `<div class="unlock-over" data-unlock-over="1">${ticks}<span class="unlock-over-now" style="left:${((now.x + now.w / 2) / total * 100).toFixed(2)}%"></span><span class="unlock-over-win"></span></div>`;
  }
  function pointsHtml(runtime) {
    const points = runtime.deps.contentProgression.points();
    if (points.complete) return `<div class="unlock-stat is-points" data-tip="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)("넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 됩니다."))}"><strong class="is-done">${(0, runtime.deps._t)("전체 해금 완료")}</strong></div>`;
    const tip = points.balance === points.remaining ? (0, runtime.deps._t)("남은 해금에 필요한 포인트를 모두 모았습니다. 넘치는 몫은 그루터기 함 접붙이기 점수가 됩니다.") : (0, runtime.deps._t)("루프마다 {perLoop}P. 남은 해금 비용을 넘는 몫은 그루터기 함 접붙이기 점수가 됩니다.", { perLoop: runtime.deps.CONTENT_UNLOCK_POINT_AWARDS.perLoop });
    return `<div class="unlock-stat is-points" data-tip="${(0, runtime.deps.escapeHTML)(tip)}"><span>${(0, runtime.deps._t)("해금 포인트")}</span><strong>${points.balance}<small>P</small></strong></div>`;
  }
  function headHtml(runtime) {
    const ready = readyRows(runtime).length;
    return `<header class="unlocks-head">${pointsHtml(runtime)}<button type="button" class="unlock-stat is-ready" data-unlock-next="1"${ready ? "" : " disabled"}><span>${(0, runtime.deps._t)("해금 가능")}</span><strong>${ready}</strong></button>
            <div class="unlock-over-slot"></div><div class="unlock-stat is-total"><span>${(0, runtime.deps._t)("전체")}</span><strong>${view_openCount(runtime)}<small>/${runtime.state.unlockBoard.rows.length}</small></strong></div></header>`;
  }
  function view_parentsOpen(runtime, def) {
    return runtime.deps.contentProgression.parents(def).every((id) => runtime.deps.contentProgression.isUnlocked(id));
  }
  function view_openCount(runtime) {
    return runtime.state.unlockBoard.rows.filter((def) => runtime.deps.contentProgression.isUnlocked(def.id)).length;
  }
  function view_unseenHtml(runtime, def, marks) {
    return marks.unseen.has(def.id) ? '<i class="unlock-unseen" aria-hidden="true">!</i>' : "";
  }

  // modules/ui/unlock-tree-detail.mjs
  function goalHtml(runtime, plan) {
    if (!plan?.valid) return "";
    const def = runtime.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === plan.id);
    const status = plan.complete ? (0, runtime.deps._t)("목표 달성 · 다음 목표를 골라 보세요") : (0, runtime.deps._t)("남은 경로 {cost}P · 부족 {deficit}P", { cost: plan.totalCost, deficit: plan.deficit });
    return `<div class="unlock-goal${plan.complete ? " is-complete" : ""}" aria-label="${(0, runtime.deps._t)("고정한 해금 목표")}"><button type="button" data-unlock-select="${def.id}"><b>${(0, runtime.deps._t)("목표")} · ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name))}</b><span>${status}</span></button>
            <button type="button" data-unlock-goal-clear="1" aria-label="${(0, runtime.deps._t)("해금 목표 해제")}">${(0, runtime.deps._t)("해제")}</button></div>`;
  }
  function planStepsHtml(runtime, plan) {
    const steps = plan.remainingIds.map((id) => runtime.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.id === id));
    return steps.length ? `<ol class="unlock-plan-steps">${steps.map((def) => `<li><button type="button" data-unlock-select="${def.id}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name))}</button><span>${runtime.deps.contentProgression.holds(def.id) ? (0, runtime.deps._t)("구매 완료") : def.cost ? `${def.cost}P` : (0, runtime.deps._t)("자동")}</span></li>`).join("")}</ol>` : `<p>${(0, runtime.deps._t)("필요한 해금을 모두 열었습니다.")}</p>`;
  }
  function planHtml(runtime, def, plan) {
    if (!plan.valid) return `<p class="unlock-plan-error">${(0, runtime.deps._t)("해금 경로를 확인할 수 없습니다.")}</p>`;
    if (plan.complete) return `<p class="unlock-plan-complete">${(0, runtime.deps._t)("선택한 해금은 이미 열려 있습니다.")}</p>`;
    const pointAt = plan.pointLoop === null ? (0, runtime.deps._t)("계산할 수 없음") : plan.pointLoop === runtime.deps.game.season ? (0, runtime.deps._t)("현재 충족") : (0, runtime.deps._t)("루프 {minLoop}", { minLoop: plan.pointLoop });
    const unmet = plan.world.filter((row) => !row.met).length;
    const world = plan.world.map((row) => `<li class="${row.met ? "is-met" : ""}"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</b> ${row.met ? "✓" : "○"} ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.label))}</li>`).join("");
    return `<div class="unlock-plan-stats"><strong>${(0, runtime.deps._t)("남은 경로 {cost}P", { cost: plan.totalCost })}</strong><span>${(0, runtime.deps._t)("보유 {balance}P · 부족 {deficit}P", { balance: plan.balance, deficit: plan.deficit })}</span>
            <span>${(0, runtime.deps._t)("포인트 충족: {loop}", { loop: pointAt })}</span><span class="${runtime.deps.game.season >= plan.minLoop ? "is-met" : ""}">${(0, runtime.deps._t)("루프 조건: {loop} 이상", { loop: plan.minLoop })}</span></div>
            <details class="unlock-plan-details" id="unlock-plan-${def.id}"><summary>${(0, runtime.deps._t)("남은 해금 {count}개 · 세계 조건 미충족 {unmet}개", { count: plan.remainingIds.length, unmet })}</summary><div class="unlock-plan-body"><h5>${(0, runtime.deps._t)("목표까지 필요한 해금")}</h5>${planStepsHtml(runtime, plan)}
            <h5>${(0, runtime.deps._t)("별도로 달성할 세계 조건")}</h5>${world ? `<ul class="unlock-plan-world">${world}</ul>` : `<p>${(0, runtime.deps._t)("추가 세계 조건 없음")}</p>`}<p class="unlock-plan-note">${(0, runtime.deps._t)("포인트 예상은 다른 해금에 쓰지 않을 때 기준입니다. 세계 진행 조건은 별도로 달성해야 합니다.")}</p></div></details>`;
  }
  function lifecycleSummaryHtml(runtime, def) {
    const life = def.lifecycle;
    return `<div class="unlock-lifecycle-summary" aria-label="${(0, runtime.deps._t)("다음 루프에 남는 것")}"><p><b>${(0, runtime.deps._t)("유지")}</b>${(0, runtime.deps._t)("기능 해금")}${life?.kept ? ` · ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.kept))}` : ""}</p>
            ${life?.reset ? `<p><b>${(0, runtime.deps._t)("초기화")}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.reset))}</p>` : ""}</div>`;
  }
  function pinHtml(runtime, def) {
    const pinned = runtime.deps.game.contentProgression.plannedUnlockId === def.id;
    return `<button type="button" class="unlock-pin" data-unlock-goal="${def.id}" aria-pressed="${pinned}">${(0, runtime.deps._t)(pinned ? "목표 고정 해제" : "이 해금을 목표로 고정")}</button>`;
  }
  function lifecycleHtml(runtime, def) {
    const life = def.lifecycle;
    if (!life) return `<p class="unlock-lifetime-note">${(0, runtime.deps._t)("기능 해금은 다음 루프에도 유지됩니다.")}</p>`;
    return `<div class="unlock-lifetime"><h5>${(0, runtime.deps._t)("루프 전환 시, {label}", { label: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.label)) })}</h5><p class="unlock-lifetime-note">${(0, runtime.deps._t)("기능 해금은 영구 유지")}</p>
            ${life.kept ? `<p><b>${(0, runtime.deps._t)("유지")}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.kept))}</p>` : ""}${life.reset ? `<p><b>${(0, runtime.deps._t)("초기화")}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.reset))}</p>` : ""}</div>`;
  }
  function relatedHtml(runtime, def) {
    if (!def.features) return "";
    return `<div class="unlock-related"><h5>${(0, runtime.deps._t)("포함된 성장 요소")}</h5>${def.features.map((row) => `<p><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</p>`).join("")}</div>`;
  }
  function loreHtml(runtime, id) {
    const lore = runtime.deps.STORY_LOOP_MILESTONES[id];
    if (!lore) return "";
    return `<blockquote class="story-scene-quote"><p>${lore.narration.map((line) => (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(line))).join(" ")}</p><p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.quote))} - ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)((0, runtime.deps.speakerShortName)(lore.speaker)))}</p></blockquote>`;
  }
  function moreHtml(runtime, def) {
    return `<details class="unlock-more" id="unlock-more-${def.id}"><summary>${(0, runtime.deps._t)("자세히")}</summary><div class="unlock-more-body">${loreHtml(runtime, def.id)}${lifecycleHtml(runtime, def)}${relatedHtml(runtime, def)}</div></details>`;
  }
  function nextHtml(runtime, def) {
    const kids = runtime.state.unlockBoard.rows.filter((row) => runtime.deps.contentProgression.parents(row).includes(def.id));
    if (!kids.length) return '<div class="unlock-next"></div>';
    return `<div class="unlock-next"><h5>${(0, runtime.deps._t)("이어지는 해금")}</h5><div>${kids.map((kid) => `<button type="button" class="unlock-next-chip fam-${runtime.state.unlockBoard.familyOf(kid)}" data-unlock-select="${kid.id}">
            <span class="unlock-ic"><img src="${runtime.deps.contentUnlockUi.art(kid)}" alt="" loading="lazy"></span><span>${(0, runtime.deps.escapeHTML)(runtime.state.unlockBoard.isStep(kid) ? (0, runtime.deps._t)(kid.name) : view_cardName(runtime, kid))}</span></button>`).join("")}</div></div>`;
  }
  function actionHtml(runtime, def, status) {
    if (status.unlocked) return runtime.deps.contentUnlockUi.routeAction(def) ? `<button type="button" class="unlock-act" data-open-content="${def.id}">${(0, runtime.deps._t)("바로 사용하기")}</button>` : `<button type="button" class="unlock-act" disabled>${(0, runtime.deps._t)("해금 완료")}</button>`;
    if (runtime.deps.contentProgression.kind(def) === "auto") return `<button type="button" class="unlock-act" disabled>${(0, runtime.deps.escapeHTML)(status.reason)}</button>`;
    return status.available ? `<button type="button" class="unlock-act is-go" data-unlock-content="${def.id}">${(0, runtime.deps._t)("{cost}P 해금", { cost: def.cost })}</button>` : `<button type="button" class="unlock-act" disabled>${(0, runtime.deps.escapeHTML)(status.reason)}</button>`;
  }
  function requirementsHtml(runtime, def) {
    return runtime.deps.contentProgression.requirements(def.id).map((row) => {
      const follow = row.met ? "" : runtime.deps.contentUnlockUi.progressButton(row.route, (0, runtime.deps._t)("{label} 보기", { label: (0, runtime.deps._t)(row.label) }));
      return follow || `<span class="${row.met ? "is-met" : ""}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.label))}</span>`;
    }).join("");
  }
  function detailDescriptionHtml(runtime, def, unlocked) {
    const route = def.action?.guide || def.routes?.[0];
    const path = runtime.deps.contentUnlockUi.journeyPath(route);
    const journey = runtime.deps.EXPLORATION_REGIONS.guides[route];
    const description = unlocked && journey?.entry ? (0, runtime.deps._t)("입장 조건 · {condition}", { condition: (0, runtime.deps._t)(journey.entry) }) : (0, runtime.deps._t)(def.description);
    return `<p class="unlock-desc">${(0, runtime.deps.escapeHTML)(description)}</p>${path ? `<p class="unlock-desc">${(0, runtime.deps.escapeHTML)(path)}</p>` : ""}`;
  }
  function detailHtml(runtime, def, plan) {
    const status = runtime.deps.contentProgression.status(def.id), kind = runtime.deps.contentProgression.kind(def), kindName = kind === "auto" ? "자동 개방" : def.rail ? "강화" : "포인트 해금";
    const gain = gainOf(runtime, def);
    return `<div class="unlock-detail-art fam-${runtime.state.unlockBoard.familyOf(def)} kind-${kind} is-${stateOf(runtime, def)}"><span class="unlock-ic"><img src="${runtime.deps.contentUnlockUi.art(def)}" alt=""></span></div>
            <div class="unlock-detail-text"><span class="unlock-eyebrow fam-${runtime.state.unlockBoard.familyOf(def)}">${def.rail ? (0, runtime.deps._t)(kindName) : `${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.group))}, ${(0, runtime.deps._t)(kindName)}`}</span><h4>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name))}${gain ? `<em>${(0, runtime.deps.escapeHTML)(gain)}</em>` : ""}</h4>
            ${detailDescriptionHtml(runtime, def, status.unlocked)}<div class="unlock-reqs">${status.unlocked ? "" : requirementsHtml(runtime, def)}</div>${planHtml(runtime, def, plan)}</div>
            ${nextHtml(runtime, def)}<div class="unlock-detail-action">${runtime.deps.contentUnlockUi.entryReward(def, status)}${actionHtml(runtime, def, status)}${lifecycleSummaryHtml(runtime, def)}${pinHtml(runtime, def)}${moreHtml(runtime, def)}</div>`;
  }

  // modules/ui/unlock-tree-render.mjs
  function settleSelection(runtime) {
    if (!runtime.state.unlockBoard.has(runtime.state.view_selectedId)) {
      const ready = readyRows(runtime);
      runtime.state.view_selectedId = (ready.find((def) => !def.rail) || ready[0] || runtime.state.unlockBoard.rows.find((def) => def.id === runtime.state.UNLOCK_FAMILIES[0].root)).id;
    }
    return runtime.deps.CONTENT_UNLOCK_CATALOG.find((def) => def.id === runtime.state.view_selectedId);
  }
  function readMarks(runtime) {
    const owned = new Set(runtime.state.unlockBoard.rows.filter((def) => runtime.deps.contentProgression.isUnlocked(def.id)).map((def) => def.id));
    const open = new Set(runtime.state.unlockBoard.rows.filter((def) => view_parentsOpen(runtime, def)).map((def) => def.id));
    const marks = { lit: /* @__PURE__ */ new Set(), fresh: /* @__PURE__ */ new Set(), unseen: unseenIds(runtime) };
    if (runtime.state.view_shownOwned) {
      owned.forEach((id) => {
        if (!runtime.state.view_shownOwned.has(id)) marks.lit.add(id);
      });
      open.forEach((id) => {
        if (!runtime.state.view_shownOpenParents.has(id) && !owned.has(id)) marks.fresh.add(id);
      });
    }
    runtime.state.view_shownOwned = owned;
    runtime.state.view_shownOpenParents = open;
    return marks;
  }
  function readPlans(runtime, id) {
    const goalId = runtime.deps.game.contentProgression.plannedUnlockId;
    const goal = goalId ? runtime.deps.window.GameModules.unlockPlan.read(goalId) : null;
    runtime.state.view_plannedPath = new Set(goal?.valid ? goal.ids : []);
    return { plan: runtime.deps.window.GameModules.unlockPlan.read(id), goal };
  }
  function render(runtime) {
    syncUnlockOwner(runtime);
    const root = runtime.deps.document.getElementById("content-unlock-panel");
    if (!root || !runtime.deps.game.contentProgression) return;
    bindPanel(runtime, root);
    const selected = settleSelection(runtime), { plan, goal } = readPlans(runtime, selected.id);
    const states = runtime.state.unlockBoard.rows.map((def) => stateOf(runtime, def)).join();
    const key = JSON.stringify([runtime.deps.i18n.language, runtime.deps.game.season, runtime.deps.contentProgression.balance(), states, runtime.state.view_selectedId, plan, goal, (runtime.deps.game.seenUnlocks || []).length, root.clientHeight, root.clientWidth]);
    if (runtime.state.view_shownKey === key && root.childNodes.length) return;
    runtime.state.view_shownKey = key;
    const keep = root.querySelector(".unlocks-scroll")?.scrollLeft || 0, keepTop = root.querySelector(".unlocks-scroll")?.scrollTop || 0;
    (0, runtime.deps.captureUiDisclosureState)(root);
    root.innerHTML = `${headHtml(runtime)}${goalHtml(runtime, goal)}<div class="unlocks-view"><div class="unlocks-scroll"><div class="unlocks-canvas"></div></div>
            <div class="unlock-fade is-left"></div><div class="unlock-fade is-right"></div><div class="unlock-corner">${(0, runtime.deps._t)("루프")}</div>
            <button type="button" class="unlock-edge is-left" data-unlock-edge="-1"></button><button type="button" class="unlock-edge is-right" data-unlock-edge="1"></button>
            <button type="button" class="unlock-to-now" data-unlock-now="1">${(0, runtime.deps._t)("지금으로")}</button></div><aside class="unlock-detail" aria-label="${(0, runtime.deps._t)("고른 해금")}">${detailHtml(runtime, selected, plan)}</aside>`;
    (0, runtime.deps.restoreUiDisclosureState)(root);
    fillBoard(runtime, root, keep, keepTop);
  }
  function fillBoard(runtime, root, keep, keepTop) {
    runtime.state.stopGesture?.();
    const view = root.querySelector(".unlocks-view"), height = view.clientHeight;
    if (!height) return;
    const L = runtime.state.view_layoutNow = runtime.state.unlockBoard.layout(height), marks = readMarks(runtime);
    const canvas = root.querySelector(".unlocks-canvas"), scroller = root.querySelector(".unlocks-scroll");
    canvas.style.width = `${L.board.width}px`;
    canvas.style.height = `${L.fullHeight}px`;
    canvas.innerHTML = canvasHtml(runtime, L, marks, L.fullHeight);
    root.querySelector(".unlock-over-slot").innerHTML = overviewHtml(runtime, L);
    scroller.scrollLeft = runtime.state.view_centerNow || runtime.state.view_shownSeason !== runtime.deps.game.season ? nowLeft(runtime, scroller) : keep;
    scroller.scrollTop = keepTop;
    if (scroller.clientWidth) {
      runtime.state.view_centerNow = false;
      runtime.state.view_shownSeason = runtime.deps.game.season;
    }
    syncOverlays(runtime, root);
    if (runtime.state.view_revealId) scrollToNode(runtime, root, runtime.state.view_revealId);
    runtime.state.view_revealId = "";
  }
  function syncOverlays(runtime, root) {
    const scroller = root.querySelector(".unlocks-scroll"), win = root.querySelector(".unlock-over-win");
    if (!scroller || !win || !runtime.state.view_layoutNow) return;
    const total = runtime.state.view_layoutNow.board.width, left = scroller.scrollLeft, width = scroller.clientWidth;
    win.style.left = `${(left / total * 100).toFixed(2)}%`;
    win.style.width = `${(width / total * 100).toFixed(2)}%`;
    const spots = readyRows(runtime).map((def) => runtime.state.view_layoutNow.pos.get(def.id));
    const paint = (selector, count, label) => {
      const el = root.querySelector(selector);
      el.textContent = label(count);
      el.classList.toggle("is-on", count > 0);
    };
    paint(".unlock-edge.is-left", spots.filter((at) => at.left < left).length, (count) => (0, runtime.deps._t)("◀ 가능 {count}", { count }));
    paint(".unlock-edge.is-right", spots.filter((at) => at.right > left + width).length, (count) => (0, runtime.deps._t)("가능 {count} ▶", { count }));
    root.querySelectorAll(".unlock-rail").forEach((el) => el.classList.toggle("is-stuck", Number(el.dataset.cardEnd) < left));
    root.querySelector(".unlock-fade.is-left").classList.toggle("is-on", left > 2);
    root.querySelector(".unlock-fade.is-right").classList.toggle("is-on", left + width < total - 2);
  }
  function scrollToNode(runtime, root, id) {
    const scroller = root.querySelector(".unlocks-scroll"), at = runtime.state.view_layoutNow?.pos.get(id);
    if (at && scroller) scroller.scrollTo({ left: at.cx - scroller.clientWidth / 2, top: at.y - scroller.clientHeight / 2, behavior: "smooth" });
  }
  function select(runtime, id) {
    syncUnlockOwner(runtime);
    if (!runtime.state.unlockBoard.has(id)) return;
    runtime.state.view_selectedId = id;
    if (!Array.isArray(runtime.deps.game.seenUnlocks)) runtime.deps.game.seenUnlocks = [];
    if (!runtime.deps.game.seenUnlocks.includes(id)) runtime.deps.game.seenUnlocks.push(id);
    runtime.state.view_revealId = id;
    render(runtime);
  }
  function jumpOffscreen(runtime, root, direction) {
    const scroller = root.querySelector(".unlocks-scroll"), seenFrom = scroller.scrollLeft, seenTo = seenFrom + scroller.clientWidth;
    const list = readyRows(runtime).map((def) => runtime.state.view_layoutNow.pos.get(def.id)).filter((at) => direction < 0 ? at.left < seenFrom : at.right > seenTo).sort((a, b) => a.left - b.left);
    if (list.length) select(runtime, (direction < 0 ? list[list.length - 1] : list[0]).def.id);
  }
  function cycleReady(runtime) {
    const list = readyRows(runtime).sort((a, b) => runtime.state.view_layoutNow.pos.get(a.id).left - runtime.state.view_layoutNow.pos.get(b.id).left);
    if (!list.length) return;
    runtime.state.view_jump = (runtime.state.view_jump + 1) % list.length;
    select(runtime, list[runtime.state.view_jump].id);
  }
  function pin(runtime, id) {
    const target = runtime.deps.game.contentProgression.plannedUnlockId === id ? "" : id;
    const keepFocus = runtime.deps.document.activeElement?.matches?.("[data-unlock-goal], [data-unlock-goal-clear]");
    if (!runtime.deps.contentProgression.planTarget(target)) return;
    render(runtime);
    if (keepFocus) runtime.deps.document.querySelector("#content-unlock-panel .unlock-pin")?.focus({ preventScroll: true });
    (0, runtime.deps.saveGame)({ skipCloudSync: false });
  }
  function markPath(runtime, root, id) {
    root.querySelectorAll(".is-path").forEach((el) => el.classList.remove("is-path"));
    if (!id) return;
    const path = /* @__PURE__ */ new Set(), waiting = [id];
    while (waiting.length) {
      const step = waiting.pop();
      path.add(step);
      waiting.push(...runtime.deps.contentProgression.parents(runtime.deps.CONTENT_UNLOCK_CATALOG.find((def) => def.id === step)));
    }
    root.querySelectorAll(".unlocks-canvas [data-unlock-select]").forEach((el) => {
      if (path.has(el.dataset.unlockSelect)) el.classList.add("is-path");
    });
    root.querySelectorAll("polyline[data-to]").forEach((el) => {
      if (!path.has(el.dataset.to) || !path.has(el.dataset.from)) return;
      el.classList.add("is-path");
      el.parentNode.appendChild(el);
    });
  }
  function handleClick(runtime, event) {
    const control = event.target.closest?.("#content-unlock-panel button");
    if (!control) return;
    if (syncUnlockOwner(runtime)) {
      render(runtime);
      return;
    }
    const root = runtime.deps.document.getElementById("content-unlock-panel"), data = control.dataset;
    if (data.unlockGoal) {
      pin(runtime, data.unlockGoal);
      return;
    }
    if (data.unlockGoalClear) {
      pin(runtime, runtime.deps.game.contentProgression.plannedUnlockId);
      return;
    }
    if (data.unlockSelect) {
      select(runtime, data.unlockSelect);
      return;
    }
    if (data.unlockNext) {
      cycleReady(runtime);
      return;
    }
    if (data.unlockEdge) {
      jumpOffscreen(runtime, root, Number(data.unlockEdge));
      return;
    }
    if (data.unlockNow) {
      const scroller = root.querySelector(".unlocks-scroll");
      scroller.scrollTo({ left: nowLeft(runtime, scroller), behavior: "smooth" });
    }
  }
  function startPan(runtime, event, root) {
    if (event.pointerType !== "mouse" || event.target.closest("button")) return;
    const scroller = root.querySelector(".unlocks-scroll"), scale = runtime.deps.uiDisplay.factor || 1, from = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    const pan = (move) => {
      scroller.scrollLeft = from.left - (move.clientX - from.x) / scale;
      scroller.scrollTop = from.top - (move.clientY - from.y) / scale;
    };
    beginUnlockGesture(runtime, event, scroller, pan);
    scroller.classList.add("is-panning");
  }
  function startOverview(runtime, event, root) {
    const box = root.querySelector(".unlock-over"), scroller = root.querySelector(".unlocks-scroll");
    const go = (move) => {
      const rect = box.getBoundingClientRect();
      scroller.scrollLeft = (move.clientX - rect.left) / rect.width * runtime.state.view_layoutNow.board.width - scroller.clientWidth / 2;
    };
    go(event);
    beginUnlockGesture(runtime, event, scroller, go);
  }
  function onPointerDown(runtime, event, root) {
    if (syncUnlockOwner(runtime)) {
      render(runtime);
      return;
    }
    if (event.button) return;
    if (event.target.closest?.(".unlock-over")) {
      startOverview(runtime, event, root);
      return;
    }
    if (event.target.closest?.(".unlocks-scroll")) startPan(runtime, event, root);
  }
  function onWheel(runtime, event, root) {
    if (!event.target.closest?.(".unlocks-view")) return;
    event.preventDefault();
    root.querySelector(".unlocks-scroll").scrollLeft += event.deltaY || event.deltaX;
  }
  function bindPanel(runtime, root) {
    if (runtime.state.panel === root) return;
    releaseUnlockPanel(runtime);
    runtime.state.panel = root;
    listenView(runtime, root, "pointerover", (event) => {
      const node = event.target.closest?.(".unlocks-canvas [data-unlock-select]");
      markPath(runtime, root, node ? node.dataset.unlockSelect : "");
    });
    listenView(runtime, root, "pointerleave", () => markPath(runtime, root, ""));
    listenView(runtime, root, "pointerdown", (event) => runtime.handlers.onPointerDown(event, root));
    listenView(runtime, root, "wheel", (event) => onWheel(runtime, event, root), { passive: false });
    listenView(runtime, root, "scroll", () => syncOverlays(runtime, root), true);
    runtime.state.observer = new runtime.deps.ResizeObserver(() => {
      if (runtime.active && runtime.state.panel === root && root.clientWidth) runtime.handlers.render();
    });
    runtime.state.observer.observe(root);
  }

  // modules/ui/unlock-tree-view.mjs
  function createUnlockTreeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    const handlers = { boardTextWidth, boardIsStep, boardBuilt, boardLayout, boardEdgePoints, boardFamilyOf, stateOf, readyRows, upgradeEffect, gainOf, cardGain, tipOf, nodeClass, unseenIds, nodeHtml, edgesHtml, nowEntry, nowLeft, railLabelsHtml, canvasHtml, overviewHtml, pointsHtml, headHtml, goalHtml, planStepsHtml, planHtml, lifecycleSummaryHtml, pinHtml, lifecycleHtml, relatedHtml, loreHtml, moreHtml, nextHtml, actionHtml, requirementsHtml, detailDescriptionHtml, detailHtml, settleSelection, readMarks, readPlans, render, fillBoard, syncOverlays, scrollToNode, select, jumpOffscreen, cycleReady, pin, handleClick, markPath, startPan, startOverview, onPointerDown, onWheel, bindPanel, view_parentsOpen, view_openCount, view_cardName, view_unseenHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.handlers.boardPlaceAlong = createBoardPlaceAlong(runtime);
    runtime.handlers.boardClearRun = createBoardClearRun();
    runtime.api = UnlockTreeViewApi(runtime);
    installUnlockTreeViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.UNLOCK_BOARD_SIZE = Object.freeze({ cardGap: 10, minCardText: 36, gainFrom: 32, left: 38, ruler: 24, pip: 44, pipH: 22, minPitch: 24, maxPitch: 52, maxCard: 44, minRows: 8, maxRows: 24 });
    runtime.state.UNLOCK_FAMILIES = Object.freeze([
      { id: "gear", root: "craft", side: -1, at: 0.22 },
      { id: "rune", root: "support", side: 1, at: 0.56 },
      { id: "growth", root: "loopTree", side: 1, at: 0.84 }
    ]);
    runtime.state.UNLOCK_LOOSE_FAMILY = Object.freeze({ passiveTree: "growth", deepChaos: "rune" });
    runtime.state.UNLOCK_UNSEEN_STATES = Object.freeze(/* @__PURE__ */ new Set(["ready", "short", "owned"]));
    runtime.state.boardSIZE = runtime.state.UNLOCK_BOARD_SIZE;
    runtime.state.boardById = new Map(runtime.deps.CONTENT_UNLOCK_CATALOG.map((def) => [def.id, def]));
    runtime.state.boardRows = runtime.deps.CONTENT_UNLOCK_CATALOG.filter((def) => def.minLoop > 1);
    runtime.state.boardBase = null;
    runtime.state.unlockBoard = Object.freeze({ rows: runtime.state.boardRows, built: runtime.handlers.boardBuilt, layout: runtime.handlers.boardLayout, edgePoints: runtime.handlers.boardEdgePoints, familyOf: runtime.handlers.boardFamilyOf, isStep: runtime.handlers.boardIsStep, has: (id) => runtime.state.boardRows.some((def) => def.id === id) });
    initializeUnlockSelection(runtime);
  }
  function UnlockTreeViewApi(runtime) {
    const names = [
      "stateOf",
      "readyRows",
      "upgradeEffect",
      "gainOf",
      "cardGain",
      "tipOf",
      "nodeClass",
      "unseenIds",
      "nodeHtml",
      "edgesHtml",
      "nowEntry",
      "nowLeft",
      "railLabelsHtml",
      "canvasHtml",
      "overviewHtml",
      "pointsHtml",
      "headHtml",
      "goalHtml",
      "planStepsHtml",
      "planHtml",
      "lifecycleSummaryHtml",
      "pinHtml",
      "lifecycleHtml",
      "relatedHtml",
      "loreHtml",
      "moreHtml",
      "nextHtml",
      "actionHtml",
      "requirementsHtml",
      "detailDescriptionHtml",
      "detailHtml",
      "settleSelection",
      "readMarks",
      "readPlans",
      "render",
      "fillBoard",
      "syncOverlays",
      "scrollToNode",
      "select",
      "jumpOffscreen",
      "cycleReady",
      "pin",
      "handleClick",
      "markPath",
      "startPan",
      "startOverview",
      "onPointerDown",
      "onWheel",
      "bindPanel"
    ];
    const api = Object.fromEntries(names.map((name) => [name, runtime.handlers[name]]));
    api.unlockBoard = runtime.state.unlockBoard;
    Object.defineProperties(api, Object.getOwnPropertyDescriptors(UnlockTreeViewFields(runtime)));
    Object.defineProperties(api, Object.getOwnPropertyDescriptors(UnlockTreeLayoutFields(runtime)));
    api.dispose = () => disposeUnlockTreeView(runtime);
    return api;
  }
  function UnlockTreeViewFields(runtime) {
    return {
      get selectedId() {
        return runtime.state.view_selectedId;
      },
      set selectedId(value) {
        runtime.state.view_selectedId = value;
      },
      get shownKey() {
        return runtime.state.view_shownKey;
      },
      set shownKey(value) {
        runtime.state.view_shownKey = value;
      },
      get centerNow() {
        return runtime.state.view_centerNow;
      },
      set centerNow(value) {
        runtime.state.view_centerNow = value;
      },
      get revealId() {
        return runtime.state.view_revealId;
      },
      set revealId(value) {
        runtime.state.view_revealId = value;
      },
      get jump() {
        return runtime.state.view_jump;
      },
      set jump(value) {
        runtime.state.view_jump = value;
      },
      get shownOwned() {
        return runtime.state.view_shownOwned;
      },
      set shownOwned(value) {
        runtime.state.view_shownOwned = value;
      },
      get shownOpenParents() {
        return runtime.state.view_shownOpenParents;
      },
      set shownOpenParents(value) {
        runtime.state.view_shownOpenParents = value;
      }
    };
  }
  function UnlockTreeLayoutFields(runtime) {
    return {
      get layoutNow() {
        return runtime.state.view_layoutNow;
      },
      set layoutNow(value) {
        runtime.state.view_layoutNow = value;
      },
      get plannedPath() {
        return runtime.state.view_plannedPath;
      },
      set plannedPath(value) {
        runtime.state.view_plannedPath = value;
      },
      get parentsOpen() {
        return runtime.handlers.view_parentsOpen;
      },
      set parentsOpen(value) {
        runtime.handlers.view_parentsOpen = value;
      },
      get openCount() {
        return runtime.handlers.view_openCount;
      },
      set openCount(value) {
        runtime.handlers.view_openCount = value;
      },
      get cardName() {
        return runtime.handlers.view_cardName;
      },
      set cardName(value) {
        runtime.handlers.view_cardName = value;
      },
      get unseenHtml() {
        return runtime.handlers.view_unseenHtml;
      },
      set unseenHtml(value) {
        runtime.handlers.view_unseenHtml = value;
      },
      get shownSeason() {
        return runtime.state.view_shownSeason;
      },
      set shownSeason(value) {
        runtime.state.view_shownSeason = value;
      }
    };
  }
  function installUnlockTreeViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, "click", (event) => runtime.api.handleClick(event));
    listenView(runtime, runtime.deps.window, "game:languagechange", () => runtime.api.render());
  }
  function disposeUnlockTreeView(runtime) {
    if (!runtime.active) return;
    releaseUnlockPanel(runtime);
    releaseViewEvents(runtime);
  }

  // modules/unlock-tab-ui-classic.mjs
  var unlockTabUi = createUnlockTreeView({
    get contentProgression() {
      return contentProgression;
    },
    get CONTENT_UNLOCK_SERIES() {
      return CONTENT_UNLOCK_SERIES;
    },
    get _t() {
      return _t;
    },
    get OFFLINE_PROGRESS_RECOGNITION_HOURS() {
      return OFFLINE_PROGRESS_RECOGNITION_HOURS;
    },
    get OFFLINE_PROGRESS_EFFICIENCY_RATES() {
      return OFFLINE_PROGRESS_EFFICIENCY_RATES;
    },
    get STUMP_BOX_NURSERY() {
      return STUMP_BOX_NURSERY;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get CONTENT_UNLOCK_POINT_AWARDS() {
      return CONTENT_UNLOCK_POINT_AWARDS;
    },
    get STORY_LOOP_MILESTONES() {
      return STORY_LOOP_MILESTONES;
    },
    get speakerShortName() {
      return speakerShortName;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get window() {
      return window;
    },
    get document() {
      return document;
    },
    get i18n() {
      return i18n;
    },
    get captureUiDisclosureState() {
      return captureUiDisclosureState;
    },
    get restoreUiDisclosureState() {
      return restoreUiDisclosureState;
    },
    get saveGame() {
      return saveGame;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get ResizeObserver() {
      return ResizeObserver;
    },
    get CONTENT_UNLOCK_RAILS() {
      return CONTENT_UNLOCK_RAILS;
    }
  });
  var unlockBoard = unlockTabUi.unlockBoard;
  safeExposeGlobals({ unlockTabUi, unlockBoard });
})();
