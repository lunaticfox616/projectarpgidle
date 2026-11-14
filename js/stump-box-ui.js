// GENERATED from modules/stump-box-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
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

  // modules/ui/stump-board-lifetime.mjs
  function clearStumpFrameMotion(runtime) {
    const state = runtime.state;
    runtime.deps.clearTimeout(state.firedTimer);
    runtime.deps.clearTimeout(state.frameTimer);
    state.firedTimer = state.frameTimer = 0;
    state.frameGhost?.remove();
    state.frameBoard?.classList.remove("is-revealing", "is-from-top", "is-from-bottom");
    state.frameGhost = state.frameBoard = null;
    state.frameSwitching = false;
    const holder = runtime.deps.document.getElementById("stump-box-board");
    if (holder) delete holder.dataset.fired;
  }
  function clearStumpTabBinding(runtime) {
    for (const target of runtime.state.boundTargets || []) releaseViewTarget(runtime, target);
    for (const observer of runtime.state.observers || []) observer.disconnect();
    runtime.state.boundTargets = [];
    runtime.state.observers = [];
    runtime.state.bound = null;
  }
  function initializeStumpSelection(runtime) {
    Object.assign(runtime.state, {
      owner: runtime.deps.game,
      selectedId: null,
      selectedCell: null,
      moreTab: "harvest",
      colorFilter: "all",
      lastSignature: "",
      placement: null,
      placementKey: "",
      storageSort: "manual",
      stateFilter: "all",
      compareOpen: false,
      comparedId: null,
      frameView: "box",
      summaryOpen: false,
      moreOpen: false,
      storagePage: 0,
      rightView: "storage",
      firstClickFree: true
    });
  }
  function syncStumpBoardOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return false;
    clearStumpFrameMotion(runtime);
    runtime.deps.clearTimeout(runtime.state.detailGuard);
    runtime.state.detailGuard = 0;
    runtime.state.rulesDialog?.close();
    initializeStumpSelection(runtime);
    const panel = runtime.deps.document.getElementById("stump-box-detail");
    if (panel) panel.inert = false;
    return true;
  }
  function clearMissingStumpSelection(runtime) {
    if (runtime.state.selectedId !== null && !runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.selectedId)) runtime.state.selectedId = null;
  }

  // modules/ui/stump-board-summary.mjs
  function escStump(runtime, text) {
    return (0, runtime.deps.escapeHTML)(String(text));
  }
  function stumpTone(runtime, color) {
    return runtime.deps.STUMP_BOX_COLORS[color].tone;
  }
  function itemTone(runtime, item) {
    if (item.albino) return runtime.deps.STUMP_BOX_RIPENING.albino.tone;
    if (item.family === "talisman") return runtime.deps.stumpTalismanUi.tone(item);
    return item.family === "scar" ? runtime.deps.STUMP_BOX_SCAR.tone : stumpTone(runtime, item.color);
  }
  function isSealedCell(runtime, cell) {
    return cell >= 0 && !onNursery(runtime) && runtime.deps.stumpBox.isSealed(runtime.deps.game.stumpBox, cell);
  }
  function stumpPercent(runtime, item) {
    return Math.min(100, Math.round(item.xp / runtime.deps.stumpBox.need(item) * 100));
  }
  function stumpNumber(runtime, value) {
    return String(Math.round(value * 10) / 10);
  }
  function stumpBar(runtime, item, wide) {
    return `<span class="stump-bar${wide ? " is-wide" : ""}"><i style="width:${stumpPercent(runtime, item)}%"></i></span>`;
  }
  function stumpIcon(runtime, item) {
    return `<img src="${runtime.deps.stumpBox.iconPath(item)}" alt="" draggable="false">`;
  }
  function selectedItem(runtime) {
    return runtime.state.selectedId === null ? null : runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.selectedId);
  }
  function stumpItemClasses(runtime, item, result) {
    const out = ["is-filled", `is-${item.family}`], suppressed = result.suppressed.has(item.id);
    if (item.id === runtime.state.selectedId) out.push("is-selected");
    if (suppressed) out.push("is-suppressed");
    if (runtime.deps.stumpBox.isMature(item)) out.push("is-ripe");
    if (runtime.deps.stumpRipeningUi.isGolden(item)) out.push("is-golden");
    if (item.albino) out.push("is-albino");
    if (item.locked) out.push("is-item-locked");
    if (!suppressed && runtime.deps.stumpBox.isMature(item) && result.synergy[item.id]) out.push("is-boosted");
    return out;
  }
  function stumpGraftLabel(runtime, cell) {
    const rank = cellGraftRank(runtime, cell);
    return rank ? (0, runtime.deps._t)(", 접붙이기 {rank}단계(+{value}%)", { rank, value: rank * runtime.deps.STUMP_BOX_GRAFT.pctPerRank }) : "";
  }
  function stumpCellLabel(runtime, cell, item, open) {
    if (!open) return (0, runtime.deps._t)("닫힌 칸, 루프 {opensAt}에 열림", { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) });
    return (item ? runtime.deps.stumpBox.label(item) : "빈 칸") + stumpGraftLabel(runtime, cell) + (isSealedCell(runtime, cell) ? ", 봉인 칸" : "");
  }
  function stumpTargetClass(runtime, item, open) {
    if (runtime.state.selectedId === null || !open || item && item.id === runtime.state.selectedId) return null;
    return item ? "is-swap" : "is-target";
  }
  function stumpCellClasses(runtime, item, open, result, cell) {
    const classes = ["stump-cell", open ? "is-open" : "is-locked"].concat(item ? stumpItemClasses(runtime, item, result) : []);
    const target = stumpTargetClass(runtime, item, open);
    if (target) classes.push(target);
    if (!item && cell === runtime.state.selectedCell) classes.push("is-selected");
    if (isSealedCell(runtime, cell)) classes.push("is-sealed");
    return classes;
  }
  function stumpCellMarks(runtime, cell) {
    const rank = cellGraftRank(runtime, cell);
    return (rank ? `<span class="stump-graft-mark" aria-hidden="true">${rank}</span>` : "") + (isSealedCell(runtime, cell) ? '<span class="stump-seal-mark" aria-hidden="true"></span>' : "");
  }
  function stumpStatText(runtime, stat, value) {
    return runtime.deps.stumpBox.lineText(stat, value);
  }
  function nurseryHeadHtml(runtime) {
    return `<span class="stump-nursery-rate">${(0, runtime.deps._t)("생육함 경험치 효율 {round}%", { round: Math.round(runtime.deps.stumpBox.nurseryRate(runtime.deps.game) * 100) })}</span><span class="stump-line">${(0, runtime.deps._t)("칸 {openCount}/25", { openCount: runtime.deps.stumpBox.openCount(runtime.deps.game) })}</span><button type="button" data-stump-action="unplace-all"${runtime.deps.game.stumpBox.nursery.some((id) => id !== null) ? "" : " disabled"}>${(0, runtime.deps._t)("전체 해제")}</button>${runtime.state.RULES_BUTTON}`;
  }
  function stumpHeadHtml(runtime, result) {
    if (onNursery(runtime)) return nurseryHeadHtml(runtime);
    const chips = runtime.state.COLORS.map((color) => {
      const on = result.resonant.has(color);
      return `<span class="stump-chip${on ? " is-on" : ""}" style="--stump-tone:${stumpTone(runtime, color)}">${(0, runtime.deps._t)(runtime.deps.STUMP_BOX_COLORS[color].label)} ${result.counts[color]}${on ? (0, runtime.deps._t)(" 공명") : ""}</span>`;
    }).join("");
    const notes = [
      (0, runtime.deps._t)("칸 {openCount}/25", { openCount: runtime.deps.stumpBox.openCount(runtime.deps.game) }),
      result.suppressed.size ? `<span class="is-bad">${(0, runtime.deps._t)("비활성 {size}", { size: result.suppressed.size })}</span>` : "",
      runtime.deps.stumpBox.graftOpen(runtime.deps.game) ? `<span class="is-graft">${(0, runtime.deps._t)("접붙이기 {free}", { free: runtime.deps.stumpBox.graftPoints(runtime.deps.game).free })}</span>` : ""
    ].filter(Boolean);
    return `<div class="stump-chips">${chips}</div><span class="stump-line">${notes.join(", ")}</span>` + runtime.deps.stumpHarvestUi.rewardButtonHtml() + (runtime.state.frameView === "box" ? `<button type="button" data-stump-action="unplace-all"${runtime.deps.game.stumpBox.board.some((id) => id !== null) ? "" : " disabled"}>${(0, runtime.deps._t)("전체 해제")}</button>` : "") + `<button type="button" data-stump-action="placement-undo"${runtime.deps.stumpBox.canUndoPlacement(runtime.deps.game) ? "" : " disabled"}>${(0, runtime.deps._t)("배치 되돌리기")}</button>${runtime.state.RULES_BUTTON}`;
  }
  function stumpSummaryHtml(runtime, result) {
    const keys = Object.keys(result.stats);
    const head = `<button type="button" class="stump-fold" data-stump-action="summary" aria-expanded="${runtime.state.summaryOpen}"><span>${(0, runtime.deps._t)("옵션 합계")}</span><small>${keys.length ? (0, runtime.deps._t)("{length}줄", { length: keys.length }) : (0, runtime.deps._t)("아직 없음")}</small></button>`;
    if (!runtime.state.summaryOpen) return head;
    const stats = keys.map((stat) => `<li style="color:${(0, runtime.deps.getItemStatToneColor)(stat)}">${escStump(runtime, stumpStatText(runtime, stat, result.stats[stat]))}</li>`).join("");
    return head + `<ul class="stump-stats">${stats || (0, runtime.deps._t)('<li class="is-empty">아직 없음</li>')}</ul>` + runtime.deps.stumpTalismanUi.summaryHtml();
  }
  function stumpLoopRule() {
    return "루프가 바뀌면 봉인 칸에 있는 아이템을 빼고 그루터기 함, 보관함, 생육함의 아이템이 모두 사라집니다.";
  }
  function stumpRulesHtml(runtime) {
    const { resonance, feed, discipline } = runtime.deps.STUMP_BOX_SYNERGY;
    const rules = [
      "그루터기 함에 있는 그루터기 아이템만 처치 시 경험치를 얻습니다.",
      (0, runtime.deps._t)("공명: 성장 완료된 같은 색 {length}개가 가로나 세로로 한 줄이면 그 {length2}개 +{bonusPct}%. 옆에 같은 색이 하나라도 더 있으면 사라집니다.", { length: resonance.length, length2: resonance.length, bonusPct: resonance.bonusPct }),
      "반극: 공명 중인 아이템은 비활성화되지 않고, 옆에서 그 색을 비활성화하는 아이템이 대신 비활성화됩니다.",
      "비활성화: 물리는 카오스를, 카오스는 냉기를, 냉기는 화염을, 화염은 번개를, 번개는 물리를 비활성화합니다.",
      (0, runtime.deps._t)("상생: 화염은 물리, 카오스는 화염, 번개는 카오스, 냉기는 번개, 물리는 냉기가 옆에 있으면 비활성화되지 않고, 둘 다 +{bonusPct}%", { bonusPct: feed.bonusPct }),
      (0, runtime.deps._t)("규율: 다섯 색이 가로나 세로 한 줄을 채우면 그 5개 +{bonusPct}%. 가로줄은 위아래, 세로줄은 양옆에 같은 색이 있으면 사라집니다.", { bonusPct: discipline.bonusPct }),
      "거름: 보관함의 씨앗을 소모해 그루터기 함에서 성장 중인 그루터기 아이템의 경험치를 올립니다.",
      stumpLoopRule(runtime)
    ];
    if (runtime.deps.stumpBox.graftOpen(runtime.deps.game)) rules.push(`접붙이기: 단계마다 그 칸의 효과 +${runtime.deps.STUMP_BOX_GRAFT.pctPerRank}%`);
    rules.push(...runtime.deps.stumpRipeningUi.rulesLines());
    return '<div class="stump-rules-tip">' + rules.map(runtime.handlers.stumpRuleLineHtml).join("") + "</div>";
  }
  function stumpRuleLineHtml(runtime, rule) {
    const at = rule.indexOf(": "), head = at > 0 ? rule.slice(0, at) : "", body = at > 0 ? rule.slice(at + 2) : rule;
    const lead = head ? `<span class="stump-rules-head">${escStump(runtime, head)}</span>: ` : "";
    return `<div class="tooltip-line">${lead}${runtime.deps.statToneText.markup(runtime.deps.stumpCubeUi.recipeToneHtml(body))}</div>`;
  }
  function stumpGraftButton(runtime, action, cell, label, reason) {
    return `<button type="button" data-stump-action="${action}" data-cell="${cell}"${reason ? " disabled" : ""}>${label}</button>`;
  }
  function stumpGraftHtml(runtime, cell) {
    if (cell < 0 || !runtime.deps.stumpBox.graftOpen(runtime.deps.game)) return "";
    const rank = runtime.deps.stumpBox.graftRank(runtime.deps.game.stumpBox, cell), max = runtime.deps.stumpBox.graftMaxRank(runtime.deps.game), free = runtime.deps.stumpBox.graftPoints(runtime.deps.game).free;
    const raiseReason = rank < max ? runtime.deps.stumpBox.graftRaiseReason(runtime.deps.game, cell) : "";
    const raise = rank < max ? stumpGraftButton(runtime, "graft-raise", cell, (0, runtime.deps._t)("접붙이기 ({value}점)", { value: rank + 1 }), raiseReason) : "";
    const lower = rank > 0 ? stumpGraftButton(
      runtime,
      "graft-lower",
      cell,
      (0, runtime.deps._t)("되돌리기 (마름병 포자 {refundSpores})", { refundSpores: runtime.deps.STUMP_BOX_GRAFT.refundSpores }),
      runtime.deps.stumpBox.graftLowerReason(runtime.deps.game, cell)
    ) : "";
    const effect = rank ? (0, runtime.deps._t)(", 효과 +{value}%", { value: rank * runtime.deps.STUMP_BOX_GRAFT.pctPerRank }) : "";
    return `<div class="stump-graft"><p class="stump-line"><strong>${(0, runtime.deps._t)("접붙이기 {rank}/{max}단계", { rank, max })}</strong>${(0, runtime.deps._t)("{effect}, 남은 점수 {free}", { effect, free })}</p>${raiseReason ? `<p class="stump-hint">${escStump(runtime, raiseReason)}</p>` : ""}<div class="stump-actions">${raise}${lower}</div></div>`;
  }
  function stumpMoreTabs(runtime) {
    const total = runtime.deps.STUMP_BOX_HARVEST.rows.length * runtime.state.COLORS.length;
    const tabs = [
      ["harvest", (0, runtime.deps._t)("수확 일지 {length}/{total}", { length: runtime.deps.game.stumpBox.harvest.grown.length, total })],
      ["unlocks", (0, runtime.deps._t)("함 해금 {length}/{length2}", { length: runtime.deps.stumpBox.openUnlocks(runtime.deps.game).length, length2: runtime.deps.STUMP_BOX_UNLOCKS.length })],
      ["wallet", (0, runtime.deps._t)("재화")]
    ];
    return runtime.deps.contentProgression.isUnlocked("talisman") ? tabs.concat([["talisman", (0, runtime.deps._t)("부적")]]) : tabs;
  }
  function stumpMoreHtml(runtime) {
    const tabs = stumpMoreTabs(runtime);
    if (!tabs.some(([id]) => id === runtime.state.moreTab)) runtime.state.moreTab = tabs[0][0];
    const buttons = tabs.map(([id, label]) => {
      const on = runtime.state.moreOpen && id === runtime.state.moreTab;
      return `<button type="button" role="tab" class="stump-more-tab${on ? " is-on" : ""}" data-stump-action="more-tab" data-tab="${id}" aria-selected="${on}" aria-expanded="${on}">${label}</button>`;
    }).join("");
    return `<div class="stump-more-tabs" role="tablist">${buttons}</div>` + (runtime.state.moreOpen ? `<div class="stump-more-body" role="tabpanel">${runtime.state.STUMP_MORE_BODIES[runtime.state.moreTab]()}</div>` : "");
  }
  function onNursery(runtime) {
    return runtime.state.frameView === "nursery";
  }
  function shownCells(runtime) {
    return onNursery(runtime) ? runtime.deps.game.stumpBox.nursery : runtime.deps.game.stumpBox.board;
  }
  function cellGraftRank(runtime, cell) {
    return onNursery(runtime) ? 0 : runtime.deps.stumpBox.graftRank(runtime.deps.game.stumpBox, cell);
  }
  function stumpItemName(runtime, item) {
    return runtime.deps.stumpBox.shortName(item);
  }

  // modules/ui/stump-board-markup.mjs
  function stumpLockMark(runtime, item) {
    return item.locked ? `<span class="stump-lock-mark">${(0, runtime.deps.renderPixelIcon)("lock", "stump-lock-icon")}</span>` : "";
  }
  function stumpCellBody(runtime, cell, item, open) {
    if (item) return stumpIcon(runtime, item) + (runtime.deps.stumpBox.isMature(item) ? "" : stumpBar(runtime, item)) + stumpCellMarks(runtime, cell) + stumpLockMark(runtime, item);
    return open ? stumpCellMarks(runtime, cell) : `<span class="stump-cell-lock">${runtime.deps.stumpBox.opensAt(runtime.deps.game, cell)}</span>`;
  }
  function stumpCellHooks(runtime, cell, item, open) {
    const tip = item || !open || cellGraftRank(runtime, cell) || isSealedCell(runtime, cell) ? ' data-stump-tip="cell" data-info-tooltip-anchor="1"' : "";
    return `${item ? ` data-stump-drag="${item.id}"` : ""} data-stump-drop-cell="${cell}"${tip}`;
  }
  function stumpCellHtml(runtime, cell, result) {
    const id = shownCells(runtime)[cell], item = id === null ? null : runtime.deps.stumpBox.itemById(runtime.deps.game, id), open = runtime.deps.stumpBox.isOpen(runtime.deps.game, cell);
    const classes = stumpCellClasses(runtime, item, open, result, cell), body = stumpCellBody(runtime, cell, item, open);
    return `<button type="button" class="${classes.join(" ")}" data-stump-action="cell" data-cell="${cell}"${stumpCellHooks(runtime, cell, item, open)} aria-label="${escStump(runtime, stumpCellLabel(runtime, cell, item, open))}"${open ? "" : ' aria-disabled="true"'} style="--stump-tone:${item ? itemTone(runtime, item) : "transparent"};${stumpCellPlace(runtime, cell)}">${body}</button>`;
  }
  function frameButtonLabels(runtime) {
    const box = runtime.state.frameView === "box", cube = runtime.state.frameView === "cube";
    const turn = (frame, rest = "") => ({ frame, text: (0, runtime.deps._t)("{frame}으로 전환{rest}", { frame: (0, runtime.deps._t)(frame), rest }) }), here = cube ? "조합창" : box ? "그루터기 함" : "생육함";
    return {
      top: turn(box ? "조합창" : "그루터기 함"),
      left: { text: (0, runtime.deps._t)(runtime.state.rightView === "bag" ? "그루터기 보관함 보기" : "장비 인벤토리 보기") },
      right: { frame: here, text: (0, runtime.deps._t)("{here} 비우기", { here: (0, runtime.deps._t)(here) }) },
      bottom: onNursery(runtime) ? turn("그루터기 함") : turn("생육함", canEnterNursery(runtime) ? "" : ` (${(0, runtime.deps._t)("해금 필요")})`)
    };
  }
  function stumpFrameHtml(runtime) {
    const buttons = Object.entries(frameButtonLabels(runtime)).map(([side, label]) => `<button type="button" class="stump-frame-button is-${side}" data-stump-action="frame-button" data-side="${side}" aria-label="${escStump(runtime, label.text)}" data-stump-tip="frame" data-info-tooltip-anchor="1"${side === "left" ? ` aria-pressed="${runtime.state.rightView === "bag"}"` : ""}></button>`).join("");
    return `<div class="stump-frame">${buttons}</div>`;
  }
  function frameTipHtml(runtime, side) {
    const label = frameButtonLabels(runtime)[side];
    if (!label) return "";
    const frameName = escStump(runtime, (0, runtime.deps._t)(label.frame || ""));
    const named = label.frame ? escStump(runtime, label.text).replace(frameName, `<span style="color:${runtime.state.FRAME_NAME_TONES[label.frame]}">${frameName}</span>`) : escStump(runtime, label.text);
    return `<div class="tooltip-line plain-tip">${named}</div>`;
  }
  function stumpSpanPlace(runtime, cells) {
    const cols = cells.map((cell) => cell % runtime.deps.STUMP_BOX_SIZE), rows = cells.map((cell) => Math.floor(cell / runtime.deps.STUMP_BOX_SIZE));
    return `grid-column:${Math.min(...cols) * 2 + 1} / ${Math.max(...cols) * 2 + 2};grid-row:${Math.min(...rows) * 2 + 1} / ${Math.max(...rows) * 2 + 2}`;
  }
  function stumpBarPlace(runtime, a, b) {
    const [low, high] = [Math.min(a, b), Math.max(a, b)], col = low % runtime.deps.STUMP_BOX_SIZE, row = Math.floor(low / runtime.deps.STUMP_BOX_SIZE);
    return high - low === 1 ? `grid-column:${col * 2 + 2};grid-row:${row * 2 + 1}` : `grid-column:${col * 2 + 1};grid-row:${row * 2 + 2}`;
  }
  function stumpLinksHtml(runtime, result) {
    const toneOf = (cell) => itemTone(runtime, runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.deps.game.stumpBox.board[cell]));
    const resonance = result.groups.resonance.map((line) => `<span class="stump-link is-resonance" style="--stump-tone:${line.color ? stumpTone(runtime, line.color) : "#f3d28c"};${stumpSpanPlace(runtime, line.cells)}"></span>`);
    const discipline = result.groups.discipline.map((line) => `<span class="stump-link is-discipline" style="--rule-tones:linear-gradient(${line.axis === "row" ? 90 : 180}deg,${line.cells.map(toneOf).join(",")});${stumpSpanPlace(runtime, line.cells)}"></span>`);
    const feed = result.groups.feed.map(([a, b]) => `<span class="stump-link is-feed" style="${stumpBarPlace(runtime, a, b)}"></span>`);
    return resonance.concat(discipline, feed).join("");
  }
  function stumpBoardHtml(runtime, result) {
    const cube = runtime.state.frameView === "cube", shown = onNursery(runtime) ? runtime.state.NO_EFFECT : result;
    const grid = cube ? runtime.deps.stumpCubeUi.cubeGridHtml() : Array.from({ length: runtime.deps.STUMP_BOX_SIZE * runtime.deps.STUMP_BOX_SIZE }, (_, cell) => stumpCellHtml(runtime, cell, shown)).join("");
    const links = runtime.state.frameView === "box" ? `<div class="stump-board-links" aria-hidden="true">${stumpLinksHtml(runtime, result)}</div>` : "";
    return `<div class="stump-board is-${runtime.state.frameView}"${cube ? "" : (0, runtime.deps._t)(' role="grid" aria-label="{value} 판"', { value: onNursery(runtime) ? (0, runtime.deps._t)("생육함") : (0, runtime.deps._t)("그루터기 함") })}><div class="stump-board-grid">${grid}</div>${stumpFrameHtml(runtime)}${links}</div><div class="stump-board-foot">${runtime.deps.stumpCubeUi.bookButtonHtml()}${cube ? (0, runtime.deps._t)('<button type="button" class="stump-frame-action" data-stump-action="frame-action">조합하기</button>') : ""}</div><div id="stump-placement-preview" class="stump-placement-preview" role="status" aria-live="polite" hidden></div>`;
  }
  function stumpCellPlace(runtime, cell) {
    return `grid-column:${cell % runtime.deps.STUMP_BOX_SIZE * 2 + 1};grid-row:${Math.floor(cell / runtime.deps.STUMP_BOX_SIZE) * 2 + 1}`;
  }
  function canEnterNursery(runtime) {
    return runtime.deps.stumpBox.nurseryOpen(runtime.deps.game) || runtime.deps.game.stumpBox.nursery.some((id) => id !== null);
  }

  // modules/ui/stump-board-detail.mjs
  function stumpCellDetailHtml(runtime, cell) {
    return `<p class="stump-line"><strong>${(0, runtime.deps._t)("빈 칸")}</strong>${isSealedCell(runtime, cell) ? (0, runtime.deps._t)(" <small>봉인 칸</small>") : ""}</p>` + stumpGraftHtml(runtime, cell) + runtime.deps.stumpRipeningUi.sealHtml(cell) + '<div class="stump-actions"><button type="button" data-stump-action="deselect">선택 해제</button></div>';
  }
  function stumpGrowthText(runtime, item) {
    if (runtime.deps.stumpBox.isMature(item)) return "";
    return (0, runtime.deps._t)("경험치 {floor} / {need}", { floor: Math.floor(item.xp), need: runtime.deps.stumpBox.need(item) });
  }
  function stumpYieldLine(runtime, item, result) {
    const gain = runtime.deps.stumpBox.yieldOf(item);
    if (!gain) return null;
    const active = Object.hasOwn(result.values, item.id);
    const value = active ? result.values[item.id] : gain.value * runtime.deps.stumpBox.qualityOf(item) * runtime.deps.stumpBox.goldenMul(item);
    return { text: gain.text.replace("{v}", stumpNumber(runtime, value)) + (active ? "" : " (비활성)"), tone: active ? (0, runtime.deps.getItemStatToneColor)(gain.stat) : "", active };
  }
  function stumpStatus(runtime, item, result, cell) {
    const note = cell < 0 ? null : runtime.deps.stumpBox.boardNote(item, result);
    return note && { text: note.text, tone: note.bad ? "is-bad" : "is-good" };
  }
  function stumpStoredSeedButtons(runtime, item) {
    const reason = runtime.deps.stumpBox.compostReason(runtime.deps.game, item.id), grown = runtime.deps.stumpBox.isMature(item);
    return `<button type="button" data-stump-action="compost"${reason ? " disabled" : ""}>${(0, runtime.deps._t)("거름 사용 (경험치 +{compostGrowth})", { compostGrowth: runtime.deps.stumpBox.compostGrowth(item) })}</button><button type="button" data-stump-action="${grown ? "monetize" : "discard"}"${item.locked ? " disabled" : ""}>${grown ? (0, runtime.deps._t)("화폐화") : (0, runtime.deps._t)("버리기")}</button>`;
  }
  function stumpStoredButton(runtime, item, cell) {
    if (cell >= 0) return "";
    if (item.family === "scar") return `<button type="button" data-stump-action="scar-discard"${item.locked ? " disabled" : ""}>${(0, runtime.deps._t)("버리기")}</button>`;
    return item.color ? stumpStoredSeedButtons(runtime, item) : "";
  }
  function stumpActionsHtml(runtime, item, cell) {
    const placed = runtime.deps.stumpBox.isPlaced(runtime.deps.game, item.id), back = placed ? '<button type="button" data-stump-action="unplace">보관함으로</button>' : "";
    const reason = !placed && item.color ? runtime.deps.stumpBox.compostReason(runtime.deps.game, item.id) : "";
    return `${reason ? `<p class="stump-hint">${escStump(runtime, reason)}</p>` : ""}<div class="stump-actions">${back}${placed ? "" : stumpStoredButton(runtime, item, cell)}<button type="button" data-stump-action="lock">${item.locked ? (0, runtime.deps._t)("잠금 해제") : (0, runtime.deps._t)("잠금")}</button><button type="button" data-stump-action="deselect">선택 해제</button></div>`;
  }
  function stumpDetailHead(runtime, item) {
    const note = item.color ? ` <small>${(0, runtime.deps._t)("품질 {round}%", { round: Math.round(item.roll * 100) })}</small>` : "";
    return `<div class="stump-detail-head" style="--stump-tone:${itemTone(runtime, item)}">${stumpIcon(runtime, item)}<div><strong>${escStump(runtime, runtime.deps.stumpBox.label(item))}</strong>${note}${runtime.deps.stumpRipeningUi.badgesHtml(item)}</div></div>`;
  }
  function stumpGrowthHtml(runtime, item) {
    const growth = stumpGrowthText(runtime, item);
    return growth ? `<p class="stump-growth">${escStump(runtime, growth)}</p>${stumpBar(runtime, item, true)}` : "";
  }
  function stumpSeedRows(runtime, item, result, cell, tooltip) {
    const gain = stumpYieldLine(runtime, item, result), status = stumpStatus(runtime, item, result, cell), tag = tooltip ? "div" : "p";
    const yieldClass = tooltip ? "tooltip-line stump-tip-yield" : "stump-yield", statusClass = tooltip ? "tooltip-line stump-tip-status" : "stump-status";
    return (gain ? `<${tag} class="${yieldClass}${gain.active ? "" : " is-off"}"${gain.tone ? ` style="color:${gain.tone}"` : ""}>${escStump(runtime, gain.text)}</${tag}>` : "") + runtime.deps.stumpRipeningUi.extraLinesHtml(item, result, tooltip) + (status ? `<${tag} class="${statusClass} ${status.tone}">${escStump(runtime, status.text)}</${tag}>` : "");
  }
  function stumpBodyHtml(runtime, item, result, cell) {
    if (item.family === "talisman") return stumpGrowthHtml(runtime, item) + runtime.deps.stumpTalismanUi.detailHtml(item, cell);
    if (item.family === "scar") return stumpGrowthHtml(runtime, item) + runtime.deps.stumpRipeningUi.scarBodyHtml(item, result, false);
    return stumpGrowthHtml(runtime, item) + stumpSeedRows(runtime, item, result, cell, false);
  }
  function stumpDetailHtml(runtime, result) {
    const item = selectedItem(runtime);
    if (!item) return runtime.state.selectedCell === null ? "" : stumpCellDetailHtml(runtime, runtime.state.selectedCell);
    const cell = runtime.deps.game.stumpBox.board.indexOf(item.id);
    const peers = comparisonItems(runtime, item), comparison = runtime.state.compareOpen && peers.length;
    const toggle = peers.length ? `<button type="button" class="stump-compare-toggle" data-stump-action="compare" aria-expanded="${!!comparison}">${comparison ? (0, runtime.deps._t)("비교 닫기") : (0, runtime.deps._t)("같은 종류 비교 ({length})", { length: peers.length })}</button>` : "";
    return toggle + (comparison ? stumpComparisonHtml(runtime, item, peers, result) : stumpDetailHead(runtime, item) + stumpBodyHtml(runtime, item, result, cell)) + stumpGraftHtml(runtime, cell) + runtime.deps.stumpRipeningUi.sealHtml(cell) + stumpActionsHtml(runtime, item, cell);
  }
  function comparisonKey(runtime, item) {
    if (item.family === "talisman") return `talisman:${item.uniqueId || item.name}`;
    return [item.family, item.color, item.path, !!item.ancient].join(":");
  }
  function comparisonItems(runtime, item) {
    const key = comparisonKey(runtime, item);
    return runtime.deps.game.stumpBox.items.filter((other) => other.id !== item.id && comparisonKey(runtime, other) === key).sort((a, b) => b.roll - a.roll || a.id - b.id);
  }
  function comparisonLabel(runtime, item) {
    const place = runtime.deps.stumpBox.isPlaced(runtime.deps.game, item.id) ? "배치 중" : "보관함";
    const quality = item.color ? ` / ${Math.round(item.roll * 100)}%` : "";
    return `${runtime.deps.stumpBox.label(item)}${quality} / ${place}`;
  }
  function comparisonCard(runtime, item, title, result, interactive = false) {
    const cell = runtime.deps.game.stumpBox.board.indexOf(item.id), place = runtime.deps.stumpBox.inNursery(runtime.deps.game, item.id) ? "생육함" : cell < 0 ? "보관함" : (0, runtime.deps._t)("{value}번 칸", { value: cell + 1 });
    const body = interactive ? stumpBodyHtml(runtime, item, result, cell) : stumpGrowthHtml(runtime, item) + stumpTipBody(runtime, item, result, cell);
    return `<section class="stump-compare-card" style="--stump-tone:${itemTone(runtime, item)}"><h4>${title} <small>${place}</small></h4>` + stumpDetailHead(runtime, item) + runtime.deps.statToneText.markup(body) + "</section>";
  }
  function stumpComparisonHtml(runtime, item, peers, result) {
    const other = peers.find((peer) => peer.id === runtime.state.comparedId) || peers[0];
    const options = peers.map((peer, index) => `<option value="${peer.id}"${peer.id === other.id ? " selected" : ""}>${index + 1}. ${escStump(runtime, comparisonLabel(runtime, peer))}</option>`).join("");
    return `<label class="stump-compare-choice">${(0, runtime.deps._t)("비교 대상")}<select data-stump-select="comparison" aria-label="${(0, runtime.deps._t)("비교 대상")}">${options}</select></label><div class="stump-comparison">${comparisonCard(runtime, item, "선택한 아이템", result, true)}${comparisonCard(runtime, other, "비교 아이템", result)}</div>`;
  }
  function stumpGrowthTipLine(runtime, item) {
    const growth = stumpGrowthText(runtime, item);
    return growth ? `<div class="tooltip-line stump-tip-growth">${escStump(runtime, growth)} (${stumpPercent(runtime, item)}%)</div>` : "";
  }
  function stumpCellTipLines(runtime, cell) {
    const rank = cell < 0 || onNursery(runtime) ? 0 : runtime.deps.stumpBox.graftRank(runtime.deps.game.stumpBox, cell) + runtime.deps.stumpBox.ancientRanks(runtime.deps.game.stumpBox, cell);
    return (rank ? `<div class="tooltip-line stump-tip-graft">${(0, runtime.deps._t)("접붙이기 {rank}단계, +{value}%", { rank, value: rank * runtime.deps.STUMP_BOX_GRAFT.pctPerRank })}</div>` : "") + (isSealedCell(runtime, cell) ? '<div class="tooltip-line stump-tip-seal">봉인 칸</div>' : "");
  }
  function stumpTipBody(runtime, item, result, cell) {
    if (item.family === "talisman") return runtime.deps.stumpTalismanUi.tooltipHtml(item, cell);
    return item.family === "scar" ? runtime.deps.stumpRipeningUi.scarBodyHtml(item, result, true) : stumpSeedRows(runtime, item, result, cell, true);
  }
  function stumpItemTipHtml(runtime, item, result, cell = runtime.deps.game.stumpBox.board.indexOf(item.id)) {
    const quality = item.color ? `<div class="tooltip-line tooltip-meta-base">${(0, runtime.deps._t)("품질 {round}%{badges}", { round: Math.round(item.roll * 100), badges: runtime.deps.stumpRipeningUi.badgesHtml(item) })}</div>` : "";
    return `<div class="tooltip-title" style="color:${itemTone(runtime, item)}">${escStump(runtime, runtime.deps.stumpBox.label(item))}</div>` + quality + stumpGrowthTipLine(runtime, item) + stumpTipBody(runtime, item, result, cell) + stumpCellTipLines(runtime, cell);
  }
  function stumpCellTipHtml(runtime, cell) {
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) return `<div class="tooltip-title">${(0, runtime.deps._t)("닫힌 칸")}</div><div class="tooltip-line">${(0, runtime.deps._t)("루프 {opensAt}에 열립니다.", { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) })}</div>`;
    const lines = stumpCellTipLines(runtime, cell);
    return lines ? `<div class="tooltip-title">${(0, runtime.deps._t)("빈 칸")}</div>${lines}` : "";
  }
  function tipFor(runtime, element) {
    const kind = element.dataset.stumpTip;
    if (kind === "frame") return { html: frameTipHtml(runtime, element.dataset.side), tone: "#a98546" };
    const id = element.dataset.stumpDrag !== void 0 ? Number(element.dataset.stumpDrag) : null;
    const item = id === null ? null : runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (item) return { html: stumpItemTipHtml(runtime, item, runtime.deps.stumpBox.evaluate(runtime.deps.game)), tone: itemTone(runtime, item) };
    if (kind !== "cell") return null;
    const html = stumpCellTipHtml(runtime, Number(element.dataset.stumpDropCell));
    return html ? { html, tone: "#8a7a5c" } : null;
  }
  function itemTipHtml(runtime, item, storedSnapshot = false) {
    if (!storedSnapshot) return stumpItemTipHtml(runtime, item, runtime.deps.stumpBox.evaluate(runtime.deps.game));
    const state = { ...runtime.deps.game, stumpBox: { ...runtime.deps.game.stumpBox, board: runtime.deps.game.stumpBox.board.map(() => null) } };
    return stumpItemTipHtml(runtime, item, runtime.deps.stumpBox.evaluate(state), -1);
  }

  // modules/ui/stump-board-storage.mjs
  function stumpStorageCard(runtime, item, cell = item.slot) {
    const growing = item.xp > 0 && !runtime.deps.stumpBox.isMature(item) ? stumpBar(runtime, item) : "";
    const classes = `stump-item${item.id === runtime.state.selectedId ? " is-selected" : ""}${runtime.deps.stumpRipeningUi.isGolden(item) ? " is-golden" : ""}${item.albino ? " is-albino" : ""}${item.locked ? " is-item-locked" : ""}`;
    return `<button type="button" class="${classes}" data-stump-action="item" data-item="${item.id}" data-stump-drag="${item.id}" data-stump-storage-slot="${cell}" data-stump-tip="item" data-info-tooltip-anchor="1" aria-label="${escStump(runtime, comparisonLabel(runtime, item))}${item.locked ? (0, runtime.deps._t)(", 잠금") : ""}" style="--stump-tone:${itemTone(runtime, item)}">${stumpIcon(runtime, item)}${growing}${stumpLockMark(runtime, item)}</button>`;
  }
  function stumpFilterLabel(runtime, key) {
    if (key === "all") return (0, runtime.deps._t)("전체");
    return key === "talisman" ? (0, runtime.deps._t)("부적") : (0, runtime.deps._t)(runtime.deps.STUMP_BOX_COLORS[key].label);
  }
  function stumpFilterTone(runtime, key) {
    if (key === "all") return "#e8c872";
    return key === "talisman" ? "#6fd6b8" : stumpTone(runtime, key);
  }
  function stumpFilterMatch(runtime, item) {
    if (runtime.state.colorFilter === "all") return true;
    return runtime.state.colorFilter === "talisman" ? item.family === "talisman" : item.color === runtime.state.colorFilter;
  }
  function stumpStateMatch(runtime, item) {
    if (runtime.state.stateFilter === "locked") return !!item.locked;
    if (runtime.state.stateFilter === "ripe") return runtime.deps.stumpBox.isMature(item);
    if (runtime.state.stateFilter === "unripe") return !runtime.deps.stumpBox.isMature(item);
    return true;
  }
  function compareStorageItems(runtime, a, b) {
    if (runtime.state.storageSort === "manual") return a.slot - b.slot;
    if (runtime.state.storageSort === "recent") return b.id - a.id;
    if (runtime.state.storageSort === "name") return runtime.deps.stumpBox.label(a).localeCompare(runtime.deps.stumpBox.label(b), "ko") || a.id - b.id;
    if (!!a.color !== !!b.color) return a.color ? -1 : 1;
    return (a.color ? (a.roll - b.roll) * (runtime.state.storageSort === "quality-asc" ? 1 : -1) : 0) || a.id - b.id;
  }
  function storageSelect(runtime, key, label, value, choices) {
    return `<select data-stump-select="${key}" aria-label="${(0, runtime.deps._t)("보관함 {label}", { label })}">` + Object.entries(choices).map(([id, name]) => `<option value="${id}"${id === value ? " selected" : ""}>${(0, runtime.deps._t)(name)}</option>`).join("") + "</select>";
  }
  function storageToolsHtml(runtime, count, total) {
    const shown = count < total ? `<span class="stump-hint">${(0, runtime.deps._t)("{count}/{total}개", { count, total })}</span>` : "";
    return '<div class="stump-storage-tools">' + storageSelect(runtime, "state", (0, runtime.deps._t)("상태"), runtime.state.stateFilter, runtime.state.STORAGE_STATES) + storageSelect(runtime, "sort", (0, runtime.deps._t)("정렬"), runtime.state.storageSort, runtime.state.STORAGE_SORTS) + (runtime.state.stateFilter === "all" ? runtime.deps.stumpRipeningUi.bulkHtml(runtime.state.colorFilter) : "") + shown + "</div>";
  }
  function stumpStorageCells(runtime, count) {
    return runtime.state.colorFilter === "all" && runtime.state.stateFilter === "all" ? Math.max(count, runtime.deps.stumpBox.storageLimit(runtime.deps.game)) : count;
  }
  function storagePagesHtml(runtime, pages) {
    if (pages <= 1) return "";
    return '<div class="stump-pages" role="group" aria-label="보관함 쪽">' + Array.from({ length: pages }, (_, page) => `<button type="button" data-stump-action="storage-page" data-page="${page}" aria-pressed="${page === runtime.state.storagePage}">${page + 1}</button>`).join("") + "</div>";
  }
  function storageLayout(runtime, items) {
    const cells = new Array(storageSlotTotal(runtime, items)).fill(null), loose = [];
    items.forEach((item) => runtime.state.storageSort === "manual" || item.locked ? cells[item.slot] = item : loose.push(item));
    let at = 0;
    loose.forEach((item) => {
      while (cells[at]) at++;
      cells[at++] = item;
    });
    return cells;
  }
  function storageSlotCells(runtime, cells, from, to) {
    let html = "";
    for (let slot = from; slot < to; slot++) {
      html += cells[slot] ? stumpStorageCard(runtime, cells[slot], slot) : `<span class="stump-slot" data-stump-storage-slot="${slot}" aria-hidden="true"></span>`;
    }
    return html;
  }
  function storageSlotTotal(runtime, items) {
    return Math.max(runtime.deps.stumpBox.storageLimit(runtime.deps.game), items.length, ...items.map((item) => item.slot + 1));
  }
  function storageFiltersHtml(runtime, all) {
    const keys = ["all"].concat(runtime.state.COLORS, all.some((item) => item.family === "talisman") || runtime.state.colorFilter === "talisman" ? ["talisman"] : []);
    return all.length ? keys.map((key) => `<button type="button" class="stump-filter${runtime.state.colorFilter === key ? " is-on" : ""}" data-stump-action="filter" data-filter="${key}" aria-pressed="${runtime.state.colorFilter === key}" style="--stump-tone:${stumpFilterTone(runtime, key)}">${stumpFilterLabel(runtime, key)}</button>`).join("") : "";
  }
  function storageCellsHtml(runtime, all, items, cells, layout) {
    const from = runtime.state.storagePage * runtime.state.STORAGE_PAGE_CELLS;
    if (layout) return storageSlotCells(runtime, layout, from, Math.min(cells, from + runtime.state.STORAGE_PAGE_CELLS));
    const shown = items.slice(from, from + runtime.state.STORAGE_PAGE_CELLS);
    const slots = '<span class="stump-slot" aria-hidden="true"></span>'.repeat(Math.max(0, Math.min(runtime.state.STORAGE_PAGE_CELLS, cells - from) - shown.length));
    return `${shown.map(runtime.handlers.stumpStorageCard).join("") || (all.length ? (0, runtime.deps._t)('<p class="stump-hint">이 분류는 비어 있습니다.</p>') : "")}${slots}`;
  }
  function stumpStorageHtml(runtime) {
    runtime.deps.stumpBox.settleStorageSlots(runtime.deps.game);
    const all = runtime.deps.stumpBox.storage(runtime.deps.game), items = all.filter(runtime.handlers.stumpFilterMatch).filter(runtime.handlers.stumpStateMatch).sort(runtime.handlers.compareStorageItems);
    const layout = storageShowsSlots(runtime) ? storageLayout(runtime, items) : null;
    const cells = layout ? layout.length : stumpStorageCells(runtime, items.length), pages = Math.max(1, Math.ceil(cells / runtime.state.STORAGE_PAGE_CELLS));
    runtime.state.storagePage = Math.min(runtime.state.storagePage, pages - 1);
    const target = runtime.state.selectedId !== null && runtime.deps.stumpBox.isPlaced(runtime.deps.game, runtime.state.selectedId) ? " is-target" : "";
    return `<div class="stump-storage-head"><h3>${(0, runtime.deps._t)("보관함 {length}/{storageLimit}", { length: all.length, storageLimit: runtime.deps.stumpBox.storageLimit(runtime.deps.game) })}</h3><div class="stump-filters">${storageFiltersHtml(runtime, all)}</div>${storagePagesHtml(runtime, pages)}</div>` + (all.length ? storageToolsHtml(runtime, items.length, all.length) : "") + `<div class="stump-storage-grid${target}" data-stump-action="storage" data-stump-drop-storage="1">${storageCellsHtml(runtime, all, items, cells, layout)}</div>`;
  }
  function storageShowsSlots(runtime) {
    return runtime.state.colorFilter === "all" && runtime.state.stateFilter === "all";
  }

  // modules/ui/stump-board-placement.mjs
  function placementEffects(runtime, state) {
    const seeds = runtime.deps.stumpBox.evaluate(state), talismans2 = runtime.deps.talismanEffects.summarize(state);
    const stats = { ...seeds.stats }, conditions = {};
    Object.entries(talismans2.stats).forEach(([key, value]) => {
      stats[key] = (stats[key] || 0) + value;
    });
    talismans2.conditions.forEach((line) => {
      conditions[line.id] = Math.max(conditions[line.id] || 0, line.value);
    });
    return {
      stats,
      conditions,
      board: state.stumpBox.board,
      groups: seeds.groups,
      suppressed: /* @__PURE__ */ new Set([...seeds.suppressed, ...talismans2.suppressed]),
      boss: talismans2.bossFinalDmgBonusPct
    };
  }
  function placementItemNames(runtime, ids) {
    return ids.map((id) => runtime.deps.stumpBox.itemById(runtime.deps.game, id)).filter(Boolean).map(runtime.deps.stumpBox.shortName).join(", ");
  }
  function placementStatusRows(runtime, before, after) {
    const rows = [], disabled = [...after.suppressed].filter((id) => !before.suppressed.has(id));
    const enabled = [...before.suppressed].filter((id) => after.board.includes(id) && !after.suppressed.has(id));
    if (disabled.length) rows.push(`<li class="is-bad">비활성화: ${escStump(runtime, placementItemNames(runtime, disabled))}</li>`);
    if (enabled.length) rows.push(`<li class="is-good">비활성화 해제: ${escStump(runtime, placementItemNames(runtime, enabled))}</li>`);
    [["resonance", "줄"], ["discipline", "줄"], ["feed", "쌍"]].forEach(([key, unit]) => {
      const from = before.groups[key].length, to = after.groups[key].length;
      if (from !== to) rows.push(`<li class="${to > from ? "is-good" : "is-bad"}">${runtime.deps.STUMP_BOX_SYNERGY[key].label}: ${from}${unit} → ${to}${unit}</li>`);
    });
    return rows;
  }
  function placementValueRows(runtime, before, after, describe) {
    return [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => {
      const from = Math.round((before[key] || 0) * 100) / 100, to = Math.round((after[key] || 0) * 100) / 100;
      if (from === to) return [];
      return [`<li><span class="stump-placement-before">${runtime.deps.statToneText.html(describe(key, from))}</span> → <strong>${runtime.deps.statToneText.html(describe(key, to))}</strong></li>`];
    });
  }
  function placementRows(runtime, preview) {
    const before = placementEffects(runtime, runtime.deps.game), after = placementEffects(runtime, preview);
    const rows = placementStatusRows(runtime, before, after);
    rows.push(...placementValueRows(runtime, before.stats, after.stats, (id, value) => runtime.deps.stumpBox.lineText(id, value).replace(/\+-/g, "−")));
    rows.push(...placementValueRows(
      runtime,
      before.conditions,
      after.conditions,
      (id, value) => runtime.deps.talismans.describeLine({ kind: "condition", id, value })
    ));
    if (before.boss !== after.boss) rows.push(`<li>보스 최종 피해: ${before.boss}% → <strong>${after.boss}%</strong></li>`);
    return {
      rows,
      disabled: [...after.suppressed].filter((id) => !before.suppressed.has(id)),
      enabled: [...before.suppressed].filter((id) => after.board.includes(id) && !after.suppressed.has(id))
    };
  }
  function clearPlacementMarks(runtime) {
    runtime.deps.document.querySelectorAll("#stump-box-board .is-preview-target, #stump-box-board .is-preview-off, #stump-box-board .is-preview-on").forEach((node) => node.classList.remove("is-preview-target", "is-preview-off", "is-preview-on"));
  }
  function markPlacement(runtime, result) {
    clearPlacementMarks(runtime);
    runtime.deps.document.querySelectorAll("#stump-box-board [data-stump-drop-cell]").forEach((node) => {
      const cell = Number(node.dataset.stumpDropCell), id = result.board[cell];
      node.classList.toggle("is-preview-target", cell === runtime.state.placement.cell);
      node.classList.toggle("is-preview-off", result.disabled.includes(id));
      node.classList.toggle("is-preview-on", result.enabled.includes(id));
    });
  }
  function clearPlacementPreview(runtime, transientOnly = false) {
    if (transientOnly && runtime.state.placement?.pinned) return false;
    const hovered = !!runtime.state.placement?.hover;
    runtime.state.placement = null;
    runtime.state.placementKey = "";
    clearPlacementMarks(runtime);
    const node = runtime.deps.document.getElementById("stump-placement-preview");
    if (node) {
      node.hidden = true;
      node.replaceChildren();
    }
    return hovered;
  }
  function renderPlacementPreview(runtime) {
    const node = runtime.deps.document.getElementById("stump-placement-preview");
    if (!runtime.state.placement || !node) return;
    const key = JSON.stringify([runtime.deps.game.stumpBox, !!runtime.deps.game.woodsmanBuildLock, runtime.state.placement.id, runtime.state.placement.cell, runtime.state.placement.pinned]);
    if (key !== runtime.state.placementKey) {
      const preview = runtime.deps.stumpBox.previewMove(runtime.deps.game, runtime.state.placement.id, runtime.state.placement.cell);
      if (!preview) return clearPlacementPreview(runtime);
      const result = placementRows(runtime, preview);
      runtime.state.placement.result = { ...result, board: preview.stumpBox.board };
      runtime.state.placement.effectKey = JSON.stringify([runtime.deps.game.stumpBox.board, result.rows, preview.stumpBox.board]);
      runtime.state.placementKey = key;
    }
    markPlacement(runtime, runtime.state.placement.result);
    if (runtime.state.placement.hover) {
      node.hidden = true;
      return;
    }
    const { title, verb, rows } = placementParts(runtime);
    const buttons = runtime.state.placement.pinned ? `<div class="stump-actions"><button type="button" data-stump-action="placement-apply">${verb}</button><button type="button" data-stump-action="placement-cancel">취소</button></div>` : "";
    const html = `<strong>${escStump(runtime, title)}</strong><span class="stump-placement-label">${(0, runtime.deps._t)("{verb} 미리보기", { verb })}</span>` + rows + buttons;
    if (node.__previewHtml !== html || node.hidden) {
      node.innerHTML = html;
      node.__previewHtml = html;
    }
    node.hidden = false;
  }
  function placementParts(runtime) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.placement.id), occupant = runtime.deps.game.stumpBox.board[runtime.state.placement.cell];
    const title = (0, runtime.deps._t)("{shortName}, {value}행 {value2}열", { shortName: runtime.deps.stumpBox.shortName(item), value: Math.floor(runtime.state.placement.cell / runtime.deps.STUMP_BOX_SIZE) + 1, value2: runtime.state.placement.cell % runtime.deps.STUMP_BOX_SIZE + 1 });
    const rows = runtime.state.placement.result.rows.length ? `<ul>${runtime.state.placement.result.rows.join("")}</ul>` : "<p>효과 변화 없음</p>";
    return { title, verb: occupant === null ? "배치" : "자리 바꾸기", rows };
  }
  function placementTipHtml(runtime) {
    const { title, verb, rows } = placementParts(runtime), item = runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.placement.id);
    return `<div class="tooltip-title" style="color:${itemTone(runtime, item)}">${escStump(runtime, title)}</div><div class="tooltip-line stump-placement-label">${(0, runtime.deps._t)("{verb} 미리보기", { verb })}</div><div class="stump-placement-tip">${rows}</div>`;
  }
  function placementTip(runtime) {
    return runtime.state.placement?.hover && runtime.state.placement.result ? { html: placementTipHtml(runtime), tone: itemTone(runtime, runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.placement.id)) } : null;
  }
  function previewBoardCell(runtime, id, cell, pinned, hover) {
    if (runtime.state.placement) {
      if (runtime.state.placement.pinned && !pinned) return;
      if (runtime.state.placement.id === id && runtime.state.placement.cell === cell && runtime.state.placement.pinned === pinned && runtime.state.placement.hover === hover) return;
    }
    runtime.state.placement = { id, cell, pinned, hover };
    runtime.state.placementKey = "";
    renderPlacementPreview(runtime);
    if (!pinned) return;
    (0, runtime.deps.hideInfoTooltip)();
    const node = runtime.deps.document.getElementById("stump-placement-preview");
    if (node) node.scrollIntoView({ block: "nearest" });
    refreshStumpTutorial(runtime);
  }
  function cancelPlacement(runtime) {
    clearPlacementPreview(runtime);
    refreshStumpTutorial(runtime);
  }
  function refreshStumpTutorial(runtime) {
    if (runtime.deps.tutorialActionUi.active) runtime.deps.tutorialActionUi.refresh();
  }

  // modules/ui/stump-board-render.mjs
  function paintStumpPart(runtime, id, html) {
    const node = runtime.deps.document.getElementById(id);
    if (node && node.__stumpHtml !== html) {
      node.innerHTML = html;
      node.__stumpHtml = html;
    }
  }
  function stumpTabSignature(runtime) {
    const talismanInputs = [runtime.deps.contentProgression.isUnlocked("talisman"), runtime.state.TALISMAN_CURRENCIES.map((key) => Math.floor(runtime.deps.game.currencies[key] || 0))];
    const graftInputs = [runtime.state.selectedCell, runtime.deps.stumpBox.graftPoints(runtime.deps.game).free, Math.floor(runtime.deps.game.currencies.blightSpore || 0)];
    const unlockInputs = [runtime.deps.stumpBox.storageLimit(runtime.deps.game), runtime.deps.stumpBox.openUnlocks(runtime.deps.game).map((row) => row.id)];
    return JSON.stringify([
      runtime.deps.i18n.language,
      runtime.deps.game.stumpBox,
      runtime.state.selectedId,
      runtime.state.moreTab,
      runtime.state.moreOpen,
      runtime.state.colorFilter,
      runtime.state.storageSort,
      runtime.state.stateFilter,
      runtime.state.compareOpen,
      runtime.state.comparedId,
      runtime.deps.stumpBox.canUndoPlacement(runtime.deps.game),
      runtime.deps.stumpBox.openCount(runtime.deps.game),
      !!runtime.deps.game.woodsmanBuildLock,
      talismanInputs,
      graftInputs,
      unlockInputs,
      runtime.state.frameView,
      runtime.state.rightView,
      runtime.state.summaryOpen,
      runtime.state.storagePage,
      runtime.deps.stumpCubeUi.cubeSignature()
    ]);
  }
  function renderStumpBoxTab(runtime, force) {
    if (!runtime.active) return;
    syncStumpBoardOwner(runtime);
    const root = runtime.deps.document.getElementById("tab-stump");
    if (!root || !runtime.deps.game.stumpBox || !runtime.deps.game.stumpBox.acquired) return;
    bindStumpBoxTab(runtime, root);
    const key = stumpTabSignature(runtime);
    if (!force && key === runtime.state.lastSignature) return;
    runtime.state.lastSignature = key;
    const result = runtime.deps.stumpBox.evaluate(runtime.deps.game);
    paintStumpPart(runtime, "stump-box-head", stumpHeadHtml(runtime, result));
    paintStumpPart(runtime, "stump-box-board", stumpBoardHtml(runtime, result));
    paintStumpPart(runtime, "stump-cube", runtime.state.frameView === "cube" ? runtime.deps.stumpCubeUi.cubeHtml() : "");
    paintStumpPart(runtime, "stump-box-summary", runtime.state.frameView === "box" ? stumpSummaryHtml(runtime, result) : "");
    paintStumpPart(runtime, "stump-box-detail", stumpDetailHtml(runtime, result));
    paintStumpPart(runtime, "stump-box-storage", stumpStorageHtml(runtime));
    paintStumpPart(runtime, "stump-box-more", stumpMoreHtml(runtime));
    showRightView(runtime);
    placeStumpDetail(runtime);
    renderPlacementPreview(runtime);
    refreshStumpTutorial(runtime);
  }
  function showRightView(runtime) {
    const bag = runtime.state.rightView === "bag";
    [["stump-box-storage", bag], ["stump-box-more", bag], ["stump-equip-host", !bag]].forEach(([id, hidden]) => {
      const node = runtime.deps.document.getElementById(id);
      if (node && node.hidden !== hidden) node.hidden = hidden;
    });
  }
  function moveEquipmentBag(runtime, toStump) {
    const card = runtime.deps.document.querySelector(".equipment-inventory-panel"), inspector = runtime.deps.document.getElementById("ui-equipment-inventory-inspector");
    const target = runtime.deps.craftPickerHostUi.bagHome() || runtime.deps.document.querySelector(toStump ? "#stump-equip-host > .equipment-window" : "#item-tab-equip .equipment-window");
    if (!card || !inspector || !target || card.parentElement === target) return;
    runtime.deps.equipmentInventoryInteraction.focus(null);
    target.append(card, inspector);
  }
  function syncEquipmentBag(runtime, itemsTabDrawn) {
    const drawn = isStumpTabDrawn(runtime);
    if (itemsTabDrawn && drawn && runtime.state.rightView === "bag") {
      runtime.state.rightView = "storage";
      renderStumpBoxTab(runtime, true);
    }
    const shown = !itemsTabDrawn && drawn && runtime.state.rightView === "bag";
    moveEquipmentBag(runtime, shown);
    return shown;
  }
  function refreshStumpTabIfVisible(runtime) {
    if (typeof runtime.deps.getRenderingUiTabIds !== "function" || !(0, runtime.deps.getRenderingUiTabIds)().has("tab-stump")) return;
    if (!(0, runtime.deps.isUiPointerInteractionActive)()) renderStumpBoxTab(runtime);
  }
  function placeStumpDetail(runtime) {
    const panel = runtime.deps.document.getElementById("stump-box-detail"), tab = runtime.deps.document.getElementById("tab-stump");
    if (!panel || typeof panel.showPopover !== "function") return;
    if (!stumpDetailWanted(runtime, panel, tab)) {
      if (panel.matches(":popover-open")) panel.hidePopover();
      return;
    }
    if (!panel.matches(":popover-open")) openStumpDetail(runtime, panel);
    if (runtime.deps.uiDisplay.matches("(max-width: 1080px)")) ["left", "top", "max-height"].forEach((name) => panel.style.removeProperty(name));
    else floatStumpDetail(runtime, panel, tab);
  }
  function stumpDetailWanted(runtime, panel, tab) {
    const visible = !!tab?.getClientRects().length, picked = runtime.state.selectedId !== null || runtime.state.selectedCell !== null;
    if (!visible && picked) forgetStumpSelection(runtime);
    return visible && picked && panel.childElementCount > 0 && !runtime.deps.document.querySelector("body > .selection-overlay");
  }
  function openStumpDetail(runtime, panel) {
    panel.showPopover();
    panel.inert = true;
    (0, runtime.deps.clearTimeout)(runtime.state.detailGuard);
    runtime.state.detailGuard = (0, runtime.deps.setTimeout)(() => {
      panel.inert = false;
    }, runtime.state.DETAIL_GUARD_MS);
  }
  function forgetStumpSelection(runtime) {
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    runtime.state.compareOpen = false;
    runtime.state.lastSignature = "";
  }
  function floatStumpDetail(runtime, panel, tab) {
    const scale = runtime.deps.uiDisplay.factor || 1, gap = 8, nav = runtime.deps.document.getElementById("tab-header-bottom");
    const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    panel.style.maxHeight = `${Math.max(160, bottom - gap * 2) / scale}px`;
    const size = panel.getBoundingClientRect(), spot = besideStumpWindow(runtime, tab, size, gap) || besideStumpPick(runtime, tab, size, gap);
    panel.style.left = `${spot.x / scale}px`;
    panel.style.top = `${Math.max(gap, Math.min(bottom - size.height - gap, spot.y)) / scale}px`;
  }
  function besideStumpWindow(runtime, tab, size, gap) {
    const column = ["stump-box-storage", "stump-equip-host"].map((id) => runtime.deps.document.getElementById(id)).find((node) => node?.getClientRects().length);
    const win = tab.getBoundingClientRect(), y = column ? column.getBoundingClientRect().top : win.top;
    if (win.right + gap + size.width <= runtime.deps.innerWidth - gap) return { x: win.right + gap, y };
    return win.left - gap - size.width >= gap ? { x: win.left - gap - size.width, y } : null;
  }
  function besideStumpPick(runtime, tab, size, gap) {
    const pick = (tab.querySelector(".stump-item.is-selected, .stump-cell.is-selected") || tab).getBoundingClientRect();
    const x = pick.right + gap + size.width <= runtime.deps.innerWidth - gap ? pick.right + gap : pick.left - gap - size.width;
    return { x: Math.max(gap, Math.min(runtime.deps.innerWidth - gap - size.width, x)), y: pick.top };
  }
  function bindStumpBoxTab(runtime, root) {
    var _a;
    if (runtime.state.bound === root) return;
    clearStumpTabBinding(runtime);
    runtime.state.bound = root;
    const doc = runtime.deps.document, host = doc.getElementById("stump-equip-host");
    runtime.state.boundTargets = [root, host].filter(Boolean);
    listenView(runtime, root, "click", runtime.handlers.onStumpTabClick);
    listenView(runtime, root, "dblclick", runtime.handlers.onStumpTabDoubleClick);
    listenView(runtime, root, "change", runtime.handlers.onStumpSelectionChange);
    if (host) listenView(runtime, host, "dblclick", runtime.handlers.onBagDoubleClick, true);
    if (!runtime.state.ticker) {
      listenView(runtime, runtime.deps.window, "resize", runtime.handlers.placeStumpDetail);
      listenView(runtime, doc, "pointerdown", runtime.handlers.onStumpOutsidePress, true);
    }
    (_a = runtime.state).ticker || (_a.ticker = runtime.deps.setInterval(runtime.handlers.refreshStumpTabIfVisible, 1e3));
    for (const [target, options] of [[root, { attributes: true, attributeFilter: ["class", "style"] }], [doc.body, { childList: true }]]) {
      const observer = new runtime.deps.MutationObserver(runtime.handlers.placeStumpDetail);
      observer.observe(target, options);
      runtime.state.observers.push(observer);
    }
  }
  function refreshStumpTabNow(runtime) {
    runtime.state.lastSignature = "";
    renderStumpBoxTab(runtime, true);
  }
  function isStumpTabDrawn(runtime) {
    return typeof runtime.deps.getRenderingUiTabIds === "function" && (0, runtime.deps.getRenderingUiTabIds)().has("tab-stump");
  }
  function frameShowsCube(runtime) {
    return runtime.state.frameView === "cube";
  }

  // modules/ui/stump-board-notices.mjs
  function checkStumpBoxUnlock(runtime) {
    if (runtime.deps.stumpBox.sync(runtime.deps.game, "act10")) runtime.deps.game.noti.stump = true;
    if (!runtime.deps.game.stumpBox.acquired) return;
    const sawIntro = (runtime.deps.game.seenTutorials || []).includes("unlock_stump_box"), given = grantStumpStarter(runtime);
    grantStumpScar(runtime);
    announceStumpGraft(runtime);
    runtime.deps.stumpHarvestUi.announceUnlocks();
    runtime.deps.stumpHarvestUi.announceRecipes();
    runtime.deps.stumpHarvestUi.announceGraftJournal();
    if (sawIntro) return given.length && announceStumpStarter(runtime);
    (0, runtime.deps.queueTutorialNotice)(
      "unlock_stump_box",
      (0, runtime.deps._t)("그루터기 함"),
      "액트 10 돌파 보상으로 그루터기 함과 시작 보상(씨앗 2개)을 받았습니다.\n그루터기 함에 있는 그루터기 아이템만 처치 시 경험치를 얻습니다.\n성장 완료된 같은 색 3개가 가로나 세로로 한 줄이면 공명(+10%), 이기는 색이 맞닿으면 지는 쪽이 비활성화됩니다.",
      "tab-stump",
      { quote: runtime.deps.STORY_LOOP_MILESTONES.stump }
    );
  }
  function grantStumpStarter(runtime) {
    const given = runtime.deps.stumpBox.starterOwed(runtime.deps.game) ? runtime.deps.stumpBox.grantStarter(runtime.deps.game, (0, runtime.deps.getUiPlayerStats)()) : [];
    if (!given.length) return given;
    runtime.deps.game.noti.stump = true;
    runtime.state.lastSignature = "";
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🌱 그루터기 함 시작 보상: {map}", { map: given.map(runtime.deps.stumpBox.label).join(", ") }), "loot-magic");
    return given;
  }
  function grantStumpScar(runtime) {
    const scar = runtime.deps.stumpBox.grantScar(runtime.deps.game);
    if (!scar) return;
    runtime.deps.game.noti.stump = true;
    runtime.state.lastSignature = "";
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🔥 그루터기 함: {name} 받았습니다. 그루터기 함에 배치해 깨우세요.", { name: (0, runtime.deps.withObjectParticle)((0, runtime.deps._t)(runtime.deps.STUMP_BOX_SCAR.name)) }), "loot-unique");
  }
  function announceStumpStarter(runtime) {
    (0, runtime.deps.queueTutorialNotice)("tutorial_stump_starter", (0, runtime.deps._t)("그루터기 함 시작 보상"), (0, runtime.deps._t)("씨앗 2개를 보관함에 넣었습니다.\n그루터기 함에 배치해야 처치 시 경험치를 얻습니다."), "tab-stump");
  }
  function announceStumpGraft(runtime) {
    if (!runtime.deps.stumpBox.graftOpen(runtime.deps.game) || (runtime.deps.game.seenTutorials || []).includes("unlock_stump_graft")) return;
    runtime.deps.game.noti.stump = true;
    (0, runtime.deps.queueTutorialNotice)(
      "unlock_stump_graft",
      "접붙이기",
      "루프 {loop}부터 루프마다 접붙이기 점수 {points}점을 받습니다.\n그루터기 함에서 칸을 고르고 [접붙이기]로 강화합니다. n단계에 n점(최대 {maxRank}단계), 단계마다 그 칸의 효과 +{pct}%.\n마름병 포자로 한 단계씩 되돌리면 점수가 돌아옵니다.",
      "tab-stump",
      { bodyParams: { loop: runtime.deps.STUMP_BOX_GRAFT.startLoop, points: runtime.deps.STUMP_BOX_GRAFT.pointsPerLoop, maxRank: runtime.deps.STUMP_BOX_GRAFT.maxRank, pct: runtime.deps.STUMP_BOX_GRAFT.pctPerRank } }
    );
  }
  function stumpDropLog(runtime, drop) {
    const name = drop.family === "talisman" ? `[${drop.name}]` : runtime.deps.stumpBox.label(drop);
    const rare = drop.rarity === "unique" || drop.family === "scar" || runtime.deps.stumpRipeningUi.isGolden(drop);
    return [(0, runtime.deps._t)("{STUMP_LOG_ICONS} 그루터기 함: {name} 획득", { STUMP_LOG_ICONS: runtime.state.STUMP_LOG_ICONS[drop.family] || (drop.golden ? "✨" : "🌱"), name }), rare ? "loot-unique" : "loot-magic"];
  }
  function announceStumpChange(runtime, detail) {
    if (detail.drop) (0, runtime.deps.addLog)(...stumpDropLog(runtime, detail.drop));
    if (detail.overflow) (0, runtime.deps.addLog)((0, runtime.deps._t)("🧿 그루터기 함 보관함이 가득 차 부적 대신 {name} 1개를 받았습니다.", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[detail.overflow].name) }), "loot-magic");
    if (detail.compost) (0, runtime.deps.addLog)(stumpCompostDropText(runtime, detail.compost), "loot-magic");
    (detail.ripened || []).forEach((item) => (0, runtime.deps.addLog)((0, runtime.deps._t)("{value} 그루터기 함: {item}", { value: runtime.state.STUMP_LOG_ICONS[item.family] || "🌸", item: stumpRipeName(runtime, item) }), "loot-rare"));
    announceStumpRipened(runtime, detail.ripened || []);
    runtime.state.lastSignature = "";
  }
  function stumpCompostDropText(runtime, compost) {
    const name = `${runtime.deps.STUMP_BOX_COLORS[compost.color].label} ${runtime.deps.STUMP_BOX_STAGES[compost.family].label}`;
    return compost.fed ? (0, runtime.deps._t)("🌱 그루터기 함 보관함이 가득 차 {name} 거름이 됐습니다(성장 중인 {fed}개 경험치 +{growth}).", { name: (0, runtime.deps.withSubjectParticle)(name), fed: compost.fed, growth: compost.growth }) : (0, runtime.deps._t)("🌱 그루터기 함 보관함이 가득 찼습니다.");
  }
  function stumpRipeGain(runtime, item) {
    const gain = runtime.deps.stumpBox.yieldOf(item), value = runtime.deps.stumpBox.evaluate(runtime.deps.game).values[item.id];
    return gain && value ? gain.text.replace("{v}", stumpNumber(runtime, value)) : "";
  }
  function stumpRipeName(runtime, item) {
    if (item.family === "talisman") return (0, runtime.deps._t)("[{name}] 깨어남", { name: item.name });
    return `${stumpItemName(runtime, item)} ${item.family === "scar" ? (0, runtime.deps._t)("깨어남") : (0, runtime.deps._t)("성장 완료")}`;
  }
  function announceStumpRipened(runtime, ripened) {
    if (!ripened.length) return;
    ripened.filter((item) => item.albino).forEach((item) => (0, runtime.deps.dispatchRuntimeEvent)("incident", {
      text: (0, runtime.deps._t)("{shortName} 개화{value}", { shortName: runtime.deps.stumpBox.shortName(item), value: runtime.deps.stumpBox.cellOf(runtime.deps.game, item.id) < 0 ? (0, runtime.deps._t)(", 보관함으로 이동") : "" }),
      tone: "chase",
      chase: true
    }));
    const gain = ripened.length === 1 ? stumpRipeGain(runtime, ripened[0]) : "";
    const names = ripened.length <= 3 ? ripened.map(runtime.handlers.stumpRipeName).join(", ") : (0, runtime.deps._t)("{length}개 성장 완료", { length: ripened.length });
    const gift = runtime.deps.stumpBox.pendingGifts(runtime.deps.game).length ? ", 수확 일지 보상을 받으세요" : "", note = runtime.deps.stumpRipeningUi.ripenNote(ripened);
    if (gift) runtime.deps.game.noti.stump = true;
    (0, runtime.deps.showGameToast)(`${(0, runtime.deps._t)("그루터기 함")}: ${names}${gain ? `, ${gain}` : ""}${note ? ` (${note})` : ""}${gift}`, { tone: "success" });
    (0, runtime.deps.playUiFeedbackSound)("success");
    runtime.deps.stumpHarvestUi.announceRecipes();
    runtime.deps.stumpHarvestUi.announceUnlocks();
  }

  // modules/ui/stump-board-actions.mjs
  function revealMoreTab(runtime, id) {
    if (!stumpMoreTabs(runtime).some(([key]) => key === id)) return false;
    runtime.state.moreTab = id;
    runtime.state.moreOpen = true;
    renderStumpBoxTab(runtime, true);
    return true;
  }
  function notifyStump(runtime, message) {
    (0, runtime.deps.showGameToast)(message, { tone: "info" });
  }
  function commitStumpChange(runtime) {
    if (clearPlacementPreview(runtime)) (0, runtime.deps.hideInfoTooltip)();
    runtime.state.lastSignature = "";
    (0, runtime.deps.queueImportantSave)(300);
    renderStumpBoxTab(runtime, true);
    (0, runtime.deps.updateStaticUI)();
  }
  function selectStumpItem(runtime, id) {
    if (clearPlacementPreview(runtime)) (0, runtime.deps.hideInfoTooltip)();
    runtime.state.compareOpen = false;
    runtime.state.comparedId = null;
    runtime.state.selectedId = runtime.state.selectedId === id ? null : id;
    runtime.state.selectedCell = null;
    renderStumpBoxTab(runtime, true);
  }
  function beginStumpGuideView(runtime, owner = runtime.state.owner) {
    const previous = { frameView: runtime.state.frameView, rightView: runtime.state.rightView, storagePage: runtime.state.storagePage, stateFilter: runtime.state.stateFilter, colorFilter: runtime.state.colorFilter };
    runtime.state.frameView = "box";
    runtime.state.rightView = "storage";
    runtime.state.storagePage = 0;
    runtime.state.stateFilter = runtime.state.colorFilter = "all";
    selectStumpItem(runtime, null);
    return () => {
      if (!runtime.active || owner !== runtime.deps.game) return;
      selectStumpItem(runtime, null);
      ({ frameView: runtime.state.frameView, rightView: runtime.state.rightView, storagePage: runtime.state.storagePage, stateFilter: runtime.state.stateFilter, colorFilter: runtime.state.colorFilter } = previous);
    };
  }
  function undoPlacement(runtime) {
    if (!runtime.deps.stumpBox.undoPlacement(runtime.deps.game)) {
      notifyStump(runtime, "지금은 이전 배치로 되돌릴 수 없습니다.");
      renderStumpBoxTab(runtime, true);
      return;
    }
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    commitStumpChange(runtime);
  }
  function stumpRefusal(runtime, item) {
    if (runtime.deps.game.woodsmanBuildLock) return "나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.";
    return (0, runtime.deps._t)("{label}: 이 칸에는 놓을 수 없습니다.", { label: runtime.deps.stumpBox.label(item) });
  }
  function dropOnCell(runtime, id, cell) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (onNursery(runtime)) return dropOnNurseryCell(runtime, item, cell);
    if (!item || runtime.deps.game.stumpBox.board[cell] === id) return false;
    const uniqueReason = runtime.deps.stumpBox.onePerBoardReason(runtime.deps.game, id, cell);
    if (uniqueReason) {
      notifyStump(runtime, uniqueReason);
      return false;
    }
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) {
      notifyStump(runtime, (0, runtime.deps._t)("이 칸은 루프 {opensAt}에 열립니다.", { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) }));
      return false;
    }
    if (!runtime.deps.stumpBox.move(runtime.deps.game, id, cell)) {
      notifyStump(runtime, stumpRefusal(runtime, item));
      return false;
    }
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    commitStumpChange(runtime);
    return true;
  }
  function dropOnNurseryCell(runtime, item, cell) {
    if (!item || runtime.deps.game.stumpBox.nursery[cell] === item.id) return false;
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) {
      notifyStump(runtime, (0, runtime.deps._t)("이 칸은 루프 {opensAt}에 열립니다.", { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) }));
      return false;
    }
    if (!runtime.deps.stumpBox.nurseryMove(runtime.deps.game, item.id, cell)) {
      notifyStump(runtime, runtime.deps.game.woodsmanBuildLock ? "나무꾼 전투 중에는 생육함 배치를 바꿀 수 없습니다." : "보관함이 가득 찼습니다.");
      return false;
    }
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    commitStumpChange(runtime);
    return true;
  }
  function adoptStorageOrder(runtime, slot) {
    if (runtime.state.storageSort === "manual") return slot;
    const layout = storageLayout(runtime, runtime.deps.stumpBox.storage(runtime.deps.game).sort(runtime.handlers.compareStorageItems)), over = layout.find((item) => item && item.slot === slot);
    const target = storageShowsSlots(runtime) ? slot : over ? layout.indexOf(over) : layout.length;
    runtime.deps.stumpBox.orderStorage(runtime.deps.game, layout);
    runtime.state.storageSort = "manual";
    return target;
  }
  function arrangeStorage(runtime, id, slot) {
    if (slot === null || slot === void 0) return false;
    if (!runtime.deps.stumpBox.moveInStorage(runtime.deps.game, id, adoptStorageOrder(runtime, slot))) return false;
    commitStumpChange(runtime);
    return true;
  }
  function showStoragePage(runtime, page) {
    if (page === runtime.state.storagePage) return;
    runtime.state.storagePage = page;
    renderStumpBoxTab(runtime, true);
  }
  function dropOnStorage(runtime, id, slot = null) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (item && !runtime.deps.stumpBox.isPlaced(runtime.deps.game, id)) return arrangeStorage(runtime, id, slot);
    if (!item) return false;
    if (!(runtime.deps.stumpBox.inNursery(runtime.deps.game, id) ? runtime.deps.stumpBox.nurseryUnplace(runtime.deps.game, id) : runtime.deps.stumpBox.unplace(runtime.deps.game, id))) {
      notifyStump(runtime, runtime.deps.game.woodsmanBuildLock ? stumpRefusal(runtime, item) : "보관함이 가득 찼습니다.");
      return false;
    }
    runtime.state.selectedId = null;
    if (slot !== null) runtime.deps.stumpBox.moveInStorage(runtime.deps.game, id, adoptStorageOrder(runtime, slot));
    commitStumpChange(runtime);
    return true;
  }
  function selectStumpCell(runtime, cell) {
    runtime.state.selectedCell = runtime.state.selectedCell === cell ? null : cell;
    renderStumpBoxTab(runtime, true);
  }
  function clickStumpCell(runtime, cell, confirm) {
    const occupant = shownCells(runtime)[cell];
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) return notifyStump(runtime, (0, runtime.deps._t)("이 칸은 루프 {opensAt}에 열립니다.", { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) }));
    if (runtime.state.selectedId !== null && occupant === runtime.state.selectedId) return selectStumpItem(runtime, null);
    if (runtime.state.selectedId !== null) return confirm ? confirmCell(runtime, runtime.state.selectedId, cell) : dropOnCell(runtime, runtime.state.selectedId, cell);
    if (occupant !== null) return selectStumpItem(runtime, occupant);
    if (!onNursery(runtime) && (runtime.deps.stumpBox.graftOpen(runtime.deps.game) || runtime.deps.stumpBox.sealLimit(runtime.deps.game))) selectStumpCell(runtime, cell);
  }
  function graftStumpCell(runtime, cell, raise) {
    const reason = raise ? runtime.deps.stumpBox.graftRaiseReason(runtime.deps.game, cell) : runtime.deps.stumpBox.graftLowerReason(runtime.deps.game, cell);
    if (reason) return notifyStump(runtime, reason);
    (raise ? runtime.deps.stumpBox.graftRaise : runtime.deps.stumpBox.graftLower)(runtime.deps.game, cell);
    commitStumpChange(runtime);
  }
  function claimHarvestGift(runtime, row, color) {
    const item = runtime.deps.stumpBox.claimHarvestGift(runtime.deps.game, row, color);
    if (!item) return notifyStump(runtime, "보관함이 가득 찼거나 이미 받은 보상입니다.");
    runtime.state.selectedId = item.id;
    notifyStump(runtime, (0, runtime.deps._t)("수확 일지 보상: {label}", { label: runtime.deps.stumpBox.label(item) }));
    commitStumpChange(runtime);
  }
  function unsealTalisman(runtime, source) {
    const item = runtime.deps.stumpTalismanUi.unseal(source);
    if (!item) return;
    runtime.state.selectedId = item.id;
    commitStumpChange(runtime);
  }
  function compostStumpItem(runtime) {
    const item = selectedItem(runtime), reason = item ? runtime.deps.stumpBox.compostReason(runtime.deps.game, item.id) : "";
    if (!item || reason) return reason && notifyStump(runtime, reason);
    const name = stumpItemName(runtime, item), result = runtime.deps.stumpBox.compost(runtime.deps.game, item.id);
    runtime.state.selectedId = null;
    notifyStump(runtime, (0, runtime.deps._t)("거름 사용: {name} 소모, 성장 중인 {fed}개 경험치 +{growth}", { name, fed: result.fed, growth: result.growth }));
    announceStumpRipened(runtime, result.ripened);
    commitStumpChange(runtime);
  }
  function toggleStumpLock(runtime) {
    const item = selectedItem(runtime);
    if (!item) return;
    if (!runtime.deps.stumpBox.toggleLock(runtime.deps.game, item.id)) return notifyStump(runtime, "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.");
    notifyStump(runtime, `${stumpItemName(runtime, item)} ${item.locked ? (0, runtime.deps._t)("잠금") : (0, runtime.deps._t)("잠금 해제")}`);
    commitStumpChange(runtime);
  }
  async function discardTalisman(runtime) {
    const owner = runtime.deps.game, selected = runtime.state.selectedId;
    if (runtime.state.selectedId === null || !await runtime.deps.stumpTalismanUi.discard(runtime.state.selectedId)) return;
    if (!runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.selectedId === selected) runtime.state.selectedId = null;
    commitStumpChange(runtime);
  }
  async function discardScar(runtime) {
    const owner = runtime.deps.game, selected = runtime.state.selectedId;
    if (runtime.state.selectedId === null || !await runtime.deps.stumpRipeningUi.discardScar(runtime.state.selectedId)) return;
    if (!runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.selectedId === selected) runtime.state.selectedId = null;
    commitStumpChange(runtime);
  }
  async function discardStumpSeed(runtime) {
    const owner = runtime.deps.game;
    const item = selectedItem(runtime);
    if (!item || !item.color || !await runtime.deps.stumpRipeningUi.confirmDiscard(item)) return;
    if (!runtime.active || runtime.deps.game !== owner || selectedItem(runtime) !== item) return;
    if (!runtime.deps.stumpBox.discard(owner, item.id)) return;
    runtime.state.selectedId = null;
    commitStumpChange(runtime);
  }
  async function monetizeStumpItem(runtime) {
    const owner = runtime.deps.game;
    const item = selectedItem(runtime);
    if (!item || !await runtime.deps.stumpRipeningUi.confirmMonetize(item)) return;
    if (!runtime.active || runtime.deps.game !== owner || selectedItem(runtime) !== item) return;
    const name = runtime.deps.stumpBox.shortName(item);
    if (!runtime.deps.stumpBox.monetize(runtime.deps.game, item.id)) return notifyStump(runtime, stumpRefusal(runtime, item));
    runtime.state.selectedId = null;
    notifyStump(runtime, (0, runtime.deps._t)("화폐화: {name}", { name }));
    commitStumpChange(runtime);
  }
  function sealStumpCell(runtime, cell) {
    const reason = runtime.deps.stumpBox.sealReason(runtime.deps.game, cell);
    if (reason) return notifyStump(runtime, reason);
    runtime.deps.stumpBox.toggleSeal(runtime.deps.game, cell);
    commitStumpChange(runtime);
  }
  function chooseStumpPouch(runtime, id, index) {
    const item = runtime.deps.stumpBox.choosePouch(runtime.deps.game, id, index);
    if (!item) return notifyStump(runtime, "보관함이 가득 찼습니다.");
    runtime.state.selectedId = item.id;
    notifyStump(runtime, (0, runtime.deps._t)("씨앗 주머니: {label}", { label: runtime.deps.stumpBox.label(item) }));
    commitStumpChange(runtime);
  }
  function runBulkCompost(runtime, filter) {
    const result = runtime.deps.stumpBox.compostMany(runtime.deps.game, filter);
    if (!result) return false;
    notifyStump(runtime, (0, runtime.deps._t)("일괄 거름 사용: {count}개 소모, 성장 중인 {fed}개 경험치 +{growth}", { count: result.count, fed: result.fed, growth: result.growth }));
    announceStumpRipened(runtime, result.ripened);
    return true;
  }
  function runBulkDiscard(runtime, filter) {
    const gone = runtime.deps.stumpBox.discardMany(runtime.deps.game, filter), money = (gone || []).filter(runtime.deps.stumpBox.isMature).length;
    if (gone) notifyStump(runtime, money ? (0, runtime.deps._t)("일괄 버리기: 버림 {value}개, 화폐화 {money}개", { value: gone.length - money, money }) : (0, runtime.deps._t)("일괄 버리기: {length}개", { length: gone.length }));
    return !!gone;
  }
  async function bulkStump(runtime, kind) {
    const owner = runtime.deps.game;
    if (runtime.state.stateFilter !== "all") return;
    const filter = runtime.state.colorFilter;
    const approval = await runtime.deps.stumpRipeningUi.confirmBulk(kind, filter);
    if (!approval || !runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.stateFilter !== "all" || runtime.state.colorFilter !== filter || !runtime.deps.stumpRipeningUi.bulkConfirmationCurrent(kind, filter, approval)) {
      notifyStump(runtime, "대상이 바뀌었습니다. 확인 후 다시 눌러 주세요.");
      renderStumpBoxTab(runtime, true);
      return;
    }
    if (!(kind === "compost" ? runBulkCompost(runtime, filter) : runBulkDiscard(runtime, filter))) return;
    clearMissingStumpSelection(runtime);
    commitStumpChange(runtime);
  }
  function ensureRulesDialog(runtime) {
    if (runtime.state.rulesDialog) return runtime.state.rulesDialog;
    runtime.state.rulesDialog = runtime.deps.document.createElement("dialog");
    runtime.state.rulesDialog.className = "stump-rules-dialog";
    runtime.state.rulesDialog.setAttribute("aria-labelledby", "stump-rules-title");
    listenView(runtime, runtime.state.rulesDialog, "click", (event) => {
      if (event.target === runtime.state.rulesDialog || event.target.closest("[data-rules-close]")) runtime.state.rulesDialog.close();
    });
    runtime.deps.document.body.appendChild(runtime.state.rulesDialog);
    return runtime.state.rulesDialog;
  }
  function showStumpRules(runtime) {
    const dialog = ensureRulesDialog(runtime);
    dialog.innerHTML = '<div class="stump-rules-panel"><div class="stump-rules-top"><h3 id="stump-rules-title" class="tooltip-title">그루터기 함</h3><button type="button" class="stump-rules-close" data-rules-close aria-label="닫기">✕</button></div>' + stumpRulesHtml(runtime) + "</div>";
    (0, runtime.deps.hideInfoTooltip)();
    dialog.showModal();
    dialog.querySelector(".stump-rules-tip").scrollTop = 0;
  }
  function bestStumpCell(runtime, id) {
    let best = null;
    for (const cell of runtime.deps.STUMP_BOX_CELL_ORDER) {
      const preview = runtime.deps.game.stumpBox.board[cell] === null ? runtime.deps.stumpBox.previewMove(runtime.deps.game, id, cell) : null;
      const off = preview ? runtime.deps.stumpBox.evaluate(preview).suppressed.size : Infinity;
      if (off < (best ? best.off : Infinity)) best = { cell, off };
    }
    return best ? best.cell : null;
  }
  function dropOnCube(runtime, id, cell) {
    runtime.state.selectedId = null;
    return runtime.deps.stumpCubeUi.putStumpItem(id, cell);
  }
  function dropCubeItem(runtime, from, to) {
    return to === null ? runtime.deps.stumpCubeUi.takeOutCubeCell(from) : runtime.deps.stumpCubeUi.moveCubeItem(from, to);
  }
  function quickStumpCell(runtime, item) {
    const worn = runtime.deps.stumpBox.wornOneId(runtime.deps.game, item);
    return worn === null ? bestStumpCell(runtime, item.id) : runtime.deps.game.stumpBox.board.indexOf(worn);
  }
  function quickMoveStumpItem(runtime, id) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (!item) return;
    clearPlacementPreview(runtime);
    if (runtime.deps.stumpBox.isPlaced(runtime.deps.game, id)) return dropOnStorage(runtime, id);
    if (runtime.state.frameView === "cube") return dropOnCube(runtime, id);
    if (runtime.deps.game.woodsmanBuildLock) return notifyStump(runtime, stumpRefusal(runtime, item));
    const cell = onNursery(runtime) ? runtime.deps.stumpBox.firstNurseryCell(runtime.deps.game) : quickStumpCell(runtime, item);
    if (cell === null) return notifyStump(runtime, (0, runtime.deps._t)("{value}에 빈 칸이 없습니다.", { value: onNursery(runtime) ? (0, runtime.deps._t)("생육함") : (0, runtime.deps._t)("그루터기 함") }));
    dropOnCell(runtime, id, cell);
  }
  function unplaceAllStump(runtime) {
    const reason = onNursery(runtime) ? runtime.deps.stumpBox.nurseryClearReason(runtime.deps.game) : runtime.deps.stumpBox.unplaceAllReason(runtime.deps.game);
    if (reason) return notifyStump(runtime, reason);
    const count = onNursery(runtime) ? runtime.deps.stumpBox.nurseryClear(runtime.deps.game) : runtime.deps.stumpBox.unplaceAll(runtime.deps.game);
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    notifyStump(runtime, (0, runtime.deps._t)("전체 해제: {count}개를 보관함으로 옮겼습니다.", { count }));
    commitStumpChange(runtime);
  }
  function claimReward(runtime, kind, key, choice) {
    if (kind === "gift") claimHarvestGift(runtime, key, choice);
    else chooseStumpPouch(runtime, key, choice);
  }
  function previewCell(runtime, id, cell, pinned = false, hover = false) {
    if (!onNursery(runtime)) previewBoardCell(runtime, id, cell, pinned, hover);
    else if (pinned) dropOnCell(runtime, id, cell);
  }
  function confirmCell(runtime, id, cell) {
    if (runtime.state.placement?.pinned && runtime.state.placement.id === id && runtime.state.placement.cell === cell) return applyPlacement(runtime);
    previewCell(runtime, id, cell, true);
  }
  function hoverCell(runtime, cell, tip = false) {
    if (runtime.state.selectedId !== null && !onNursery(runtime)) previewCell(runtime, runtime.state.selectedId, cell, false, tip);
    if (!runtime.state.placement?.result) return null;
    return placementTip(runtime) || { html: "", tone: "" };
  }
  function applyPlacement(runtime) {
    if (!runtime.state.placement) return;
    const key = runtime.state.placement.effectKey;
    renderPlacementPreview(runtime);
    if (!runtime.state.placement) return;
    if (key !== runtime.state.placement.effectKey) return notifyStump(runtime, "배치 효과가 바뀌었습니다. 확인 후 다시 눌러 주세요.");
    dropOnCell(runtime, runtime.state.placement.id, runtime.state.placement.cell);
  }

  // modules/ui/stump-board-input.mjs
  function onStumpOutsidePress(runtime, event) {
    if (runtime.state.selectedId === null && runtime.state.selectedCell === null) return;
    if (runtime.deps.document.querySelector("dialog:modal") || event.target.closest?.("#tab-stump, body > .selection-overlay, #info-tooltip")) return;
    selectStumpItem(runtime, null);
  }
  function onBagDoubleClick(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const card = runtime.state.frameView === "cube" && event.target.closest?.(".equipment-grid-item");
    if (!card) return;
    event.stopPropagation();
    event.preventDefault();
    const item = (runtime.deps.game.inventory || []).find((row) => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row) === card.dataset.equipmentGridKey);
    runtime.deps.equipmentInventoryInteraction.focus(null);
    if (item) runtime.deps.stumpCubeUi.putBagItem(item);
  }
  function stumpTargetItem(runtime, target) {
    if (target.dataset.stumpAction === "item") return Number(target.dataset.item);
    const id = shownCells(runtime)[Number(target.dataset.cell)];
    return id === void 0 ? null : id;
  }
  function isSecondPress(runtime, target) {
    const card = target.dataset.stumpAction === "item", pick = card || target.dataset.stumpAction === "cell";
    if (runtime.deps.clickPairs.isSecond()) return pick && runtime.state.firstClickFree;
    if (pick) runtime.state.firstClickFree = card || runtime.state.selectedId === null || runtime.state.selectedId === stumpTargetItem(runtime, target);
    return false;
  }
  function onStumpTabDoubleClick(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const target = event.target.closest('[data-stump-action="item"], [data-stump-action="cell"]');
    const id = target && runtime.state.firstClickFree ? stumpTargetItem(runtime, target) : null;
    if (id === null) return;
    event.preventDefault();
    quickMoveStumpItem(runtime, id);
    if (runtime.state.selectedId === id) selectStumpItem(runtime, null);
  }
  function onStumpTabClick(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const target = event.target.closest("[data-stump-action]");
    if (!target || !runtime.state.ACTIONS[target.dataset.stumpAction] || isSecondPress(runtime, target)) return;
    runtime.state.ACTIONS[target.dataset.stumpAction](target.dataset, target, event);
  }
  function onStumpSelectionChange(runtime, event) {
    if (!runtime.active || syncStumpBoardOwner(runtime)) return;
    const key = event.target.dataset.stumpSelect, value = event.target.value;
    if (key === "state" && Object.hasOwn(runtime.state.STORAGE_STATES, value)) runtime.state.stateFilter = value;
    else if (key === "sort" && Object.hasOwn(runtime.state.STORAGE_SORTS, value)) runtime.state.storageSort = value;
    else if (key === "comparison") runtime.state.comparedId = Number(value);
    else return;
    if (key !== "comparison") runtime.state.storagePage = 0;
    clearPlacementPreview(runtime);
    renderStumpBoxTab(runtime, true);
    runtime.deps.document.querySelector(`[data-stump-select="${key}"]`)?.focus({ preventScroll: true });
  }

  // modules/ui/stump-board-frame.mjs
  function pressNurseryGem(runtime, button) {
    if (onNursery(runtime)) return switchFrame(runtime, button, "box");
    if (!canEnterNursery(runtime)) return notifyStump(runtime, "해금 탭에서 생육함을 열 수 있습니다.");
    switchFrame(runtime, button, "nursery");
  }
  function pressFrameButton(runtime, side, button) {
    if (!runtime.state.FRAME_BUTTONS[side]) return;
    fireFrameButton(runtime, side);
    runtime.state.FRAME_BUTTONS[side](button);
  }
  function fireFrameButton(runtime, side) {
    const holder = runtime.deps.document.getElementById("stump-box-board");
    if (!holder) return;
    holder.dataset.fired = side;
    (0, runtime.deps.clearTimeout)(runtime.state.firedTimer);
    runtime.state.firedTimer = (0, runtime.deps.setTimeout)(() => {
      delete holder.dataset.fired;
    }, runtime.state.FRAME_FIRE_MS);
  }
  function emptyStumpBoard(runtime) {
    if (!runtime.deps.game.stumpBox.board.some((id) => id !== null)) return notifyStump(runtime, "그루터기 함이 비어 있습니다.");
    const refusal = runtime.deps.stumpBox.unplaceAllReason(runtime.deps.game);
    if (refusal) return notifyStump(runtime, refusal);
    (0, runtime.deps.playUiFeedbackSound)("uiCancel");
    unplaceAllStump(runtime);
  }
  function emptyStumpCube(runtime) {
    if (!runtime.deps.stumpCube.entries().length) return notifyStump(runtime, "조합창이 비어 있습니다.");
    (0, runtime.deps.playUiFeedbackSound)("uiCancel");
    runtime.deps.stumpCube.clear();
    commitStumpChange(runtime);
  }
  async function autoMergeStump(runtime) {
    const owner = runtime.deps.game;
    if (runtime.state.stateFilter !== "all") return;
    const filter = runtime.state.colorFilter, approval = await runtime.deps.stumpRipeningUi.confirmAutoMerge(filter);
    if (!approval || !runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.stateFilter !== "all" || runtime.state.colorFilter !== filter || !runtime.deps.stumpRipeningUi.autoMergeCurrent(filter, approval)) {
      notifyStump(runtime, "대상이 바뀌었습니다. 확인 후 다시 눌러 주세요.");
      renderStumpBoxTab(runtime, true);
      return;
    }
    const result = runtime.deps.stumpCube.autoMerge(runtime.deps.game, filter);
    (0, runtime.deps.playUiFeedbackSound)(result.ok ? "craftSuccess" : "craftFailure");
    if (!result.ok) return notifyStump(runtime, result.reason);
    const best = Math.max(...result.items.map((item) => Math.round(item.roll * 100)));
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧩 자동합성: 씨앗 {length}개 (최고 품질 {best}%)", { length: result.items.length, best }), "loot-rare");
    notifyStump(runtime, (0, runtime.deps._t)("자동합성: 씨앗 {length}개 (최고 품질 {best}%)", { length: result.items.length, best }));
    clearMissingStumpSelection(runtime);
    commitStumpChange(runtime);
  }
  function toggleRightView(runtime) {
    (0, runtime.deps.playUiFeedbackSound)("uiSelect");
    runtime.state.rightView = runtime.state.rightView === "bag" ? "storage" : "bag";
    renderStumpBoxTab(runtime, true);
    (0, runtime.deps.updateStaticUI)();
  }
  function switchFrame(runtime, button, next) {
    if (runtime.state.frameSwitching) return;
    (0, runtime.deps.playUiFeedbackSound)("stumpFrameSwitch");
    const side = button.classList.contains("is-bottom") ? "bottom" : "top";
    const ghost = runtime.deps.uiDisplay.matches("(prefers-reduced-motion: reduce)") ? null : frameGhost(runtime, button.closest(".stump-board"), side);
    if (onNursery(runtime) || next === "nursery") {
      runtime.state.selectedId = null;
      runtime.state.selectedCell = null;
    }
    runtime.state.frameView = next;
    clearPlacementPreview(runtime);
    renderStumpBoxTab(runtime, true);
    const board = runtime.deps.document.querySelector("#stump-box-board .stump-board");
    board?.querySelector(`.stump-frame-button.is-${side}`)?.focus({ preventScroll: true });
    if (!ghost) return;
    runtime.state.frameSwitching = true;
    runtime.state.frameGhost = ghost;
    runtime.state.frameBoard = board;
    board?.classList.add("is-revealing", `is-from-${side}`);
    runtime.state.frameTimer = runtime.deps.setTimeout(() => clearStumpFrameMotion(runtime), runtime.state.FRAME_REVEAL_MS);
  }
  function frameGhost(runtime, board, side) {
    const section = runtime.deps.document.getElementById("stump-board-section");
    if (!board || !section) return null;
    const ghost = board.cloneNode(true);
    ghost.classList.add("stump-board-ghost", `is-from-${side}`);
    ghost.removeAttribute("role");
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.style.cssText = `left:${board.offsetLeft}px;top:${board.offsetTop}px;width:${board.offsetWidth}px;height:${board.offsetHeight}px`;
    section.appendChild(ghost);
    return ghost;
  }

  // modules/ui/stump-box-view.mjs
  function createStumpBoxView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { stumpRuleLineHtml, stumpStorageCard, stumpFilterMatch, stumpStateMatch, compareStorageItems, onStumpTabClick, onStumpTabDoubleClick, onStumpSelectionChange, refreshStumpTabIfVisible, placeStumpDetail, onStumpOutsidePress, onBagDoubleClick, stumpRipeName, emptyStumpCube, emptyStumpBoard, unplaceAllStump, renderStumpBoxTab, refreshStumpTabNow, revealMoreTab, checkStumpBoxUnlock, tipFor, dropOnCell, dropOnStorage, showStoragePage, dropOnCube, dropCubeItem, claimReward, itemTipHtml, previewCell, hoverCell, placementTip, clearPlacementPreview, syncEquipmentBag, frameShowsCube, beginStumpGuideView };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = StumpBoxViewApi(runtime);
    installStumpBoxViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    initializeStumpSelection(runtime);
    initializeStumpConstants(runtime);
    runtime.state.ACTIONS = {};
    initializeStumpActions0(runtime);
    initializeStumpActions1(runtime);
    initializeStumpActions2(runtime);
  }
  function initializeStumpConstants(runtime) {
    runtime.state.COLORS = Object.keys(runtime.deps.STUMP_BOX_COLORS);
    runtime.state.TALISMAN_CURRENCIES = ["sealShard", "strongSealShard", "radiantSealShard", "beeswax"];
    runtime.state.bound = false;
    runtime.state.ticker = null;
    runtime.state.frameSwitching = false;
    runtime.state.firedTimer = 0;
    runtime.state.FRAME_FIRE_MS = 320;
    runtime.state.detailGuard = 0;
    runtime.state.DETAIL_GUARD_MS = 450;
    runtime.state.FRAME_REVEAL_MS = 700;
    runtime.state.STORAGE_PAGE_CELLS = 100;
    runtime.state.STORAGE_STATES = { all: "모든 상태", ripe: "성장 완료", unripe: "성장 전", locked: "잠금" };
    runtime.state.STORAGE_SORTS = { manual: "직접 배치", "quality-desc": "품질 높은 순", "quality-asc": "품질 낮은 순", name: "이름순", recent: "최근 획득순" };
    runtime.state.NO_EFFECT = Object.freeze({
      suppressed: /* @__PURE__ */ new Set(),
      stoppedBy: {},
      synergy: {},
      groups: { resonance: [], discipline: [], feed: [] },
      resonant: /* @__PURE__ */ new Set(),
      values: {},
      extras: {}
    });
    runtime.state.FRAME_NAME_TONES = Object.freeze({ "그루터기 함": "#e8a95a", "조합창": "#6fd0e6", "생육함": "#8fd17a" });
    runtime.state.FRAME_BUTTONS = Object.freeze({
      top: (button) => switchFrame(runtime, button, runtime.state.frameView === "box" ? "cube" : "box"),
      left: () => toggleRightView(runtime),
      right: () => ({ cube: runtime.handlers.emptyStumpCube, box: runtime.handlers.emptyStumpBoard, nursery: runtime.handlers.unplaceAllStump })[runtime.state.frameView](),
      bottom: (button) => pressNurseryGem(runtime, button)
    });
    runtime.state.RULES_BUTTON = '<button type="button" class="stump-rules-button" data-stump-action="rules" data-tip="그루터기 함 규칙" aria-label="그루터기 함 규칙" aria-haspopup="dialog"><span class="px-center">?</span></button>';
    runtime.state.STUMP_MORE_BODIES = Object.freeze({
      harvest: () => runtime.deps.stumpHarvestUi.journalHtml(),
      unlocks: () => runtime.deps.stumpHarvestUi.unlocksHtml(),
      wallet: () => runtime.deps.stumpHarvestUi.walletHtml(runtime.state.frameView === "cube"),
      talisman: () => runtime.deps.stumpTalismanUi.unsealHtml() + runtime.deps.stumpRipeningUi.codexHtml()
    });
    runtime.state.rulesDialog = null;
    runtime.state.STUMP_LOG_ICONS = Object.freeze({ talisman: "🧿", scar: "🔥" });
  }
  function initializeStumpActions0(runtime) {
    Object.assign(runtime.state.ACTIONS, {
      rules: () => showStumpRules(runtime),
      cell: (data, button, event) => clickStumpCell(runtime, Number(data.cell), event.pointerType === "touch" || event.detail === 0 || runtime.deps.uiDisplay.matches("(hover: none), (max-width: 680px)")),
      "placement-apply": () => applyPlacement(runtime),
      "placement-cancel": () => cancelPlacement(runtime),
      "placement-undo": () => undoPlacement(runtime),
      "unplace-all": () => unplaceAllStump(runtime),
      compare: () => {
        runtime.state.compareOpen = !runtime.state.compareOpen;
        renderStumpBoxTab(runtime, true);
      },
      item: (data) => selectStumpItem(runtime, Number(data.item)),
      storage: () => {
        if (runtime.state.selectedId !== null) dropOnStorage(runtime, runtime.state.selectedId);
      },
      unplace: () => {
        if (runtime.state.selectedId !== null) dropOnStorage(runtime, runtime.state.selectedId);
      },
      compost: () => compostStumpItem(runtime),
      discard: () => discardStumpSeed(runtime),
      monetize: () => monetizeStumpItem(runtime),
      "wallet-put": (data) => runtime.deps.stumpCubeUi.putWalletUnit(data.key),
      lock: () => toggleStumpLock(runtime),
      bulk: (data) => bulkStump(runtime, data.kind),
      "more-tab": (data) => {
        runtime.state.moreOpen = !(runtime.state.moreOpen && runtime.state.moreTab === data.tab);
        runtime.state.moreTab = data.tab;
        renderStumpBoxTab(runtime, true);
      },
      "frame-button": (data, button) => pressFrameButton(runtime, data.side, button)
    });
  }
  function initializeStumpActions1(runtime) {
    Object.assign(runtime.state.ACTIONS, {
      "frame-action": () => runtime.deps.stumpCubeUi.transmuteCube(),
      "auto-merge": () => autoMergeStump(runtime),
      summary: () => {
        runtime.state.summaryOpen = !runtime.state.summaryOpen;
        renderStumpBoxTab(runtime, true);
      },
      "storage-page": (data) => {
        runtime.state.storagePage = Number(data.page) || 0;
        renderStumpBoxTab(runtime, true);
      },
      deselect: () => selectStumpItem(runtime, null),
      rewards: () => runtime.deps.stumpHarvestUi.openRewards(),
      filter: (data) => {
        runtime.state.colorFilter = data.filter;
        runtime.state.storagePage = 0;
        renderStumpBoxTab(runtime, true);
      },
      "talisman-unseal": (data) => unsealTalisman(runtime, data.source),
      "talisman-exchange": (data) => {
        if (runtime.deps.stumpTalismanUi.exchange(Number(data.index))) commitStumpChange(runtime);
      },
      "talisman-wax": () => {
        if (runtime.deps.stumpTalismanUi.wax(runtime.state.selectedId)) commitStumpChange(runtime);
      },
      "talisman-turn": () => {
        if (runtime.deps.stumpTalismanUi.turn(runtime.state.selectedId)) commitStumpChange(runtime);
      },
      "talisman-discard": () => discardTalisman(runtime),
      "graft-raise": (data) => graftStumpCell(runtime, Number(data.cell), true),
      "graft-lower": (data) => graftStumpCell(runtime, Number(data.cell), false),
      seal: (data) => sealStumpCell(runtime, Number(data.cell)),
      "scar-discard": () => discardScar(runtime),
      "cube-cell": (data) => runtime.deps.stumpCubeUi.takeOutCubeCell(Number(data.cell)),
      "cube-open": (data, button, event) => {
        if (event.detail < 2) runtime.deps.stumpCubeUi.openCubePicker();
      }
    });
  }
  function initializeStumpActions2(runtime) {
    Object.assign(runtime.state.ACTIONS, {
      "cube-quick": (data) => runtime.deps.stumpCubeUi.quickFillCube(data.recipe),
      "recipe-book": (data, button) => runtime.deps.stumpCubeUi.openRecipeBook(button)
    });
  }
  function installStumpBoxViewEvents(runtime) {
    if (typeof runtime.deps.window !== "undefined" && typeof runtime.deps.window.addEventListener === "function") {
      listenView(runtime, runtime.deps.window, "project-idle:stump-box-changed", (event) => announceStumpChange(runtime, event.detail || {}));
    }
  }
  function StumpBoxViewApi(runtime) {
    return {
      renderStumpBoxTab: runtime.handlers.renderStumpBoxTab,
      refreshStumpTabNow: runtime.handlers.refreshStumpTabNow,
      revealMoreTab: runtime.handlers.revealMoreTab,
      checkStumpBoxUnlock: runtime.handlers.checkStumpBoxUnlock,
      tipFor: runtime.handlers.tipFor,
      dropOnCell: runtime.handlers.dropOnCell,
      dropOnStorage: runtime.handlers.dropOnStorage,
      showStoragePage: runtime.handlers.showStoragePage,
      dropOnCube: runtime.handlers.dropOnCube,
      dropCubeItem: runtime.handlers.dropCubeItem,
      claimReward: runtime.handlers.claimReward,
      itemTipHtml: runtime.handlers.itemTipHtml,
      previewCell: runtime.handlers.previewCell,
      hoverCell: runtime.handlers.hoverCell,
      placementTip: runtime.handlers.placementTip,
      clearPlacementPreview: runtime.handlers.clearPlacementPreview,
      syncEquipmentBag: runtime.handlers.syncEquipmentBag,
      frameShowsCube: runtime.handlers.frameShowsCube,
      beginStumpGuideView: runtime.handlers.beginStumpGuideView,
      dispose: () => disposeStumpBoxView(runtime)
    };
  }
  function disposeStumpBoxView(runtime) {
    releaseViewEvents(runtime);
    clearStumpTabBinding(runtime);
    clearStumpFrameMotion(runtime);
    runtime.deps.clearInterval(runtime.state.ticker);
    runtime.deps.clearTimeout(runtime.state.detailGuard);
    runtime.state.ticker = runtime.state.detailGuard = 0;
    const panel = runtime.deps.document.getElementById("stump-box-detail");
    if (panel) {
      if (panel.matches(":popover-open")) panel.hidePopover();
      panel.inert = false;
    }
    runtime.state.rulesDialog?.close();
    runtime.state.rulesDialog?.remove();
    runtime.state.rulesDialog = null;
    moveEquipmentBag(runtime, false);
  }

  // modules/stump-box-ui-classic.mjs
  var stumpBoxUi = createStumpBoxView({
    get clearInterval() {
      return windowClearInterval;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get STUMP_BOX_RIPENING() {
      return STUMP_BOX_RIPENING;
    },
    get stumpTalismanUi() {
      return stumpTalismanUi;
    },
    get STUMP_BOX_SCAR() {
      return STUMP_BOX_SCAR;
    },
    get stumpBox() {
      return stumpBox;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get stumpRipeningUi() {
      return stumpRipeningUi;
    },
    get _t() {
      return _t;
    },
    get STUMP_BOX_GRAFT() {
      return STUMP_BOX_GRAFT;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get STUMP_BOX_SIZE() {
      return STUMP_BOX_SIZE;
    },
    get stumpCubeUi() {
      return stumpCubeUi;
    },
    get document() {
      return document;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get stumpCube() {
      return stumpCube;
    },
    get addLog() {
      return addLog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get stumpHarvestUi() {
      return stumpHarvestUi;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get STUMP_BOX_SYNERGY() {
      return STUMP_BOX_SYNERGY;
    },
    get statToneText() {
      return statToneText;
    },
    get STUMP_BOX_HARVEST() {
      return STUMP_BOX_HARVEST;
    },
    get STUMP_BOX_UNLOCKS() {
      return STUMP_BOX_UNLOCKS;
    },
    get contentProgression() {
      return contentProgression;
    },
    get i18n() {
      return i18n;
    },
    get craftPickerHostUi() {
      return craftPickerHostUi;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get getRenderingUiTabIds() {
      return typeof getRenderingUiTabIds === "undefined" ? void 0 : getRenderingUiTabIds;
    },
    get isUiPointerInteractionActive() {
      return isUiPointerInteractionActive;
    },
    get talismanEffects() {
      return talismanEffects;
    },
    get talismans() {
      return talismans;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get showGameToast() {
      return showGameToast;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get STUMP_BOX_CELL_ORDER() {
      return STUMP_BOX_CELL_ORDER;
    },
    get clickPairs() {
      return clickPairs;
    },
    get innerHeight() {
      return innerHeight;
    },
    get innerWidth() {
      return innerWidth;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get MutationObserver() {
      return MutationObserver;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get STORY_LOOP_MILESTONES() {
      return STORY_LOOP_MILESTONES;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get withObjectParticle() {
      return withObjectParticle;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get STUMP_BOX_STAGES() {
      return STUMP_BOX_STAGES;
    },
    get withSubjectParticle() {
      return withSubjectParticle;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    }
  });
  safeExposeGlobals({ stumpBoxUi });
})();
