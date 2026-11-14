// GENERATED from modules/passive-tree-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/void-craft-panel.mjs
  function hitChance(ctx, count) {
    const pool = ctx.deps.VOID_PASSIVE_OPTION_POOL.length;
    return 0.5 * (count / pool) + 0.5 * (1 - (pool - count) * (pool - count - 1) / (pool * (pool - 1)));
  }
  function effectHtml(ctx, nodeId) {
    const entry = (0, ctx.deps.getVoidPassiveCraft)(nodeId), wanted = targetsOf(ctx, nodeId);
    if (entry.transcendent || !entry.stats.length) return (0, ctx.deps.getVoidPassiveEffectLabel)(nodeId);
    return ctx.deps.passiveRouting.voidStats(entry, ctx.deps.game, (0, ctx.deps.getVoidLinkScale)(nodeId)).map((line) => `<div class="void-craft-line${wanted.has(line.id) ? " is-target" : ""}">${(0, ctx.deps.escapeHTML)((0, ctx.deps.formatVoidPassiveStatLine)(line))}</div>`).join("");
  }
  function pickerOptionHtml(ctx, option, wanted) {
    const on = wanted.has(option.id), full = !on && wanted.size >= ctx.state.MAX_TARGETS;
    return `<button type="button" class="${chipClass(ctx, option.id)} void-picker-option${on ? " is-on" : ""}" aria-pressed="${on}"${full ? " disabled" : ""} onclick="voidCraftUi.toggleTarget('${ctx.state.pickerNode}','${option.id}')"><span>${lineName(ctx, option.id)}</span><small>${rangeText(ctx, option)}</small></button>`;
  }
  function pickerTabHtml(ctx, group, wanted) {
    const rows = ctx.deps.VOID_PASSIVE_OPTION_POOL.filter((option) => option.group === group), picked = rows.filter((option) => wanted.has(option.id)).length;
    return `<button type="button" class="void-picker-tab is-${ctx.state.GROUP_CLASS[group]}${group === ctx.state.pickerGroup ? " is-active" : ""}${picked ? " has-picked" : ""}" aria-pressed="${group === ctx.state.pickerGroup}" onclick="voidCraftUi.showGroup('${group}')"><span>${group}</span><small>${picked ? (0, ctx.deps._t)("{picked}개 고름", { picked }) : (0, ctx.deps._t)("{length}종", { length: rows.length })}</small></button>`;
  }
  function drawPicker(ctx) {
    const wanted = targetsOf(ctx, ctx.state.pickerNode);
    const tabs = Object.keys(ctx.state.GROUP_CLASS).map((group) => pickerTabHtml(ctx, group, wanted)).join("");
    const options = ctx.deps.VOID_PASSIVE_OPTION_POOL.filter((option) => option.group === ctx.state.pickerGroup).map((option) => pickerOptionHtml(ctx, option, wanted)).join("");
    const picked = [...wanted].map((statId) => `<button type="button" class="${chipClass(ctx, statId)} is-on" onclick="voidCraftUi.toggleTarget('${ctx.state.pickerNode}','${statId}')">${lineName(ctx, statId)}<span aria-hidden="true"> ✕</span></button>`).join("");
    ctx.deps.selectionDialog.show({ id: ctx.state.PICKER_ID, title: (0, ctx.deps._t)("목표 옵션 고르기"), panelClass: "void-target-window", body: `<nav class="void-picker-tabs" aria-label="${(0, ctx.deps._t)("옵션 분류")}">${tabs}</nav>
            <div class="void-picker-grid">${options}</div>
            <footer class="void-picker-foot"><b>${wanted.size}/${ctx.state.MAX_TARGETS}</b><div class="void-target-chips">${picked}</div><span class="void-run-status">${idleStatus(ctx, wanted)}</span><button type="button" class="void-picker-done" data-selection-close>${(0, ctx.deps._t)("완료")}</button></footer>` });
  }
  function openPicker(ctx, nodeId) {
    ctx.state.pickerNode = String(nodeId);
    drawPicker(ctx);
  }
  function showGroup(ctx, group) {
    if (!ctx.state.GROUP_CLASS[group]) return;
    ctx.state.pickerGroup = group;
    drawPicker(ctx);
  }
  function idleStatus(ctx, wanted) {
    if (!wanted.size) return "목표를 고르면 연속으로 쓸 수 있습니다.";
    const chance = hitChance(ctx, wanted.size);
    return (0, ctx.deps._t)("새싹 1개에 {value}%, 평균 {ceil}개", { value: (chance * 100).toFixed(1), ceil: Math.ceil(1 / chance) });
  }
  function panelBody(ctx, nodeId) {
    const wanted = targetsOf(ctx, nodeId), running = ctx.state.run && ctx.state.run.nodeId === nodeId;
    const picked = [...wanted].map((statId) => `<button type="button" class="${chipClass(ctx, statId)} is-on" onclick="voidCraftUi.toggleTarget('${nodeId}','${statId}')">${lineName(ctx, statId)}<span aria-hidden="true"> ✕</span></button>`).join("");
    const disabled = !running && (!wanted.size || budCount(ctx) <= 0);
    return `<div class="void-target-head"><b>${(0, ctx.deps._t)("목표 옵션")}</b><span>${(0, ctx.deps._t)("{size}/{MAX_TARGETS}, 하나라도 나오면 멈춥니다", { size: wanted.size, MAX_TARGETS: ctx.state.MAX_TARGETS })}</span></div>
            ${picked ? `<div class="void-target-chips">${picked}</div>` : ""}
            ${running ? "" : `<button type="button" class="void-picker-open" onclick="voidCraftUi.openPicker('${nodeId}')">${(0, ctx.deps._t)("옵션 고르기")}</button>`}
            <div class="void-run">
                <button type="button" id="void-run-button" class="void-run-button${running ? " is-running" : ""}" onclick="voidCraftUi.toggleRun('${nodeId}')" ${disabled ? "disabled" : ""}>${running ? (0, ctx.deps._t)("멈추기") : (0, ctx.deps._t)("목표까지 연속 사용")}</button>
                <span id="void-run-status" class="void-run-status" role="status">${running ? runStatus(ctx) : idleStatus(ctx, wanted)}</span>
            </div>`;
  }
  function panelHtml(ctx, node, entry, active) {
    if (!active || entry.transcendent) return "";
    return `<div class="void-target" id="void-target-panel">${panelBody(ctx, node.id)}</div>`;
  }
  function refreshPanel(ctx, nodeId) {
    const panel = ctx.deps.document.getElementById("void-target-panel");
    if (panel) panel.innerHTML = panelBody(ctx, nodeId);
  }
  function refreshEffect(ctx, nodeId) {
    const card = ctx.deps.document.getElementById("void-craft-effect");
    if (card) card.innerHTML = effectHtml(ctx, nodeId);
  }
  function toggleTarget(ctx, nodeId, statId) {
    if (ctx.state.run || !optionOf(ctx, statId)) return;
    const wanted = new Set(targetsOf(ctx, nodeId));
    if (wanted.has(statId)) wanted.delete(statId);
    else if (wanted.size < ctx.state.MAX_TARGETS) wanted.add(statId);
    ctx.state.targets.set(String(nodeId), wanted);
    refreshPanel(ctx, nodeId);
    refreshEffect(ctx, nodeId);
    if (ctx.deps.selectionDialog.isOpen(ctx.state.PICKER_ID)) drawPicker(ctx);
  }
  function setRolling(ctx, on) {
    const dialog = ctx.deps.document.querySelector("#void-passive-craft-overlay .void-craft-dialog");
    if (dialog) dialog.classList.toggle("is-rolling", on);
  }
  function canKeepRolling(ctx, nodeId, entry) {
    return !ctx.deps.game.woodsmanBuildLock && !entry.transcendent && (ctx.deps.game.passives || []).includes(nodeId);
  }
  function tick(ctx) {
    const { nodeId } = ctx.state.run, entry = (0, ctx.deps.getVoidPassiveCraft)(nodeId);
    if (!canKeepRolling(ctx, nodeId, entry)) return endRun(ctx, "stopped", true);
    if (budCount(ctx) <= 0) return endRun(ctx, "empty", true);
    ctx.deps.game.currencies.magicBud = budCount(ctx) - 1;
    (0, ctx.deps.rollMagicBudOnVoid)(entry);
    ctx.state.run.used++;
    refreshEffect(ctx, nodeId);
    const status = ctx.deps.document.getElementById("void-run-status"), count = ctx.deps.document.getElementById("void-bud-count");
    if (status) status.textContent = runStatus(ctx);
    if (count) count.textContent = (0, ctx.deps._t)("보유 {budCount}", { budCount: budCount(ctx) });
    const wanted = targetsOf(ctx, nodeId);
    if (entry.stats.some((line) => wanted.has(line.id))) endRun(ctx, "hit", true);
  }
  function resultText(ctx, outcome, nodeId, used) {
    const bud = ctx.deps.ORB_DB.magicBud.name;
    if (outcome === "hit") return (0, ctx.deps._t)("목표 옵션 획득, {bud} {used}개 사용: {nodeId}", { bud, used, nodeId: plainEffect(ctx, nodeId) });
    if (outcome === "empty") return (0, ctx.deps._t)("{bud}이 떨어졌습니다, {used}개 사용: {nodeId}", { bud, used, nodeId: plainEffect(ctx, nodeId) });
    return (0, ctx.deps._t)("연속 사용을 멈췄습니다, {bud} {used}개 사용: {nodeId}", { bud, used, nodeId: plainEffect(ctx, nodeId) });
  }
  function settleRun(ctx, outcome) {
    const { nodeId, used, timer } = ctx.state.run;
    (0, ctx.deps.clearInterval)(timer);
    ctx.state.run = null;
    ctx.deps.playerStatCache.invalidate();
    const text = resultText(ctx, outcome, nodeId, used);
    if (used > 0) {
      (0, ctx.deps.addLog)(`🕳️ ${text}`, outcome === "hit" ? "loot-rare" : "loot-magic");
      (0, ctx.deps.queueImportantSave)(200);
    }
    (0, ctx.deps.updateStaticUI)();
    return { nodeId, text };
  }
  function endRun(ctx, outcome, reopen) {
    const { nodeId, text } = settleRun(ctx, outcome);
    if (!reopen) return;
    openVoidPassiveCraftOverlay(ctx, nodeId, text);
    if (outcome === "hit") celebrate(ctx);
    else (0, ctx.deps.showGameToast)(text, { tone: "info" });
  }
  function toggleRun(ctx, nodeId) {
    if (ctx.state.run) return endRun(ctx, "stopped", true);
    if (!targetsOf(ctx, nodeId).size || budCount(ctx) <= 0) return;
    ctx.state.run = { nodeId, used: 0, timer: (0, ctx.deps.setInterval)(ctx.handlers.tick, ctx.state.RUN_INTERVAL_MS) };
    refreshPanel(ctx, nodeId);
    setRolling(ctx, true);
  }
  function stopRun(ctx) {
    if (ctx.state.run) settleRun(ctx, "stopped");
  }
  function celebrate(ctx) {
    const overlay = ctx.deps.document.getElementById("void-passive-craft-overlay"), card = ctx.deps.document.getElementById("void-craft-effect");
    if (!overlay || !card) return;
    const dialog = overlay.querySelector(".void-craft-dialog"), box = overlay.getBoundingClientRect(), rect = card.getBoundingClientRect();
    const scale = box.width / (overlay.offsetWidth || box.width);
    const fx = ctx.deps.document.createElement("div");
    fx.className = "void-hit-fx";
    fx.setAttribute("aria-hidden", "true");
    fx.style.left = `${(rect.left + rect.width / 2 - box.left) / scale}px`;
    fx.style.top = `${(rect.top + rect.height / 2 - box.top) / scale}px`;
    const sparks = Array.from({ length: ctx.state.SPARKS }, (_, i) => `<i style="--a:${Math.round(i * 360 / ctx.state.SPARKS)}deg;--r:${90 + i % 4 * 34}px;--d:${i % 5 * 45}ms"></i>`).join("");
    fx.innerHTML = `<span class="void-hit-ring"></span><span class="void-hit-ring is-late"></span>${sparks}<b class="void-hit-banner">${(0, ctx.deps._t)("목표 옵션 획득")}</b>`;
    overlay.appendChild(fx);
    dialog.classList.add("is-hit");
    card.classList.add("is-hit");
    (0, ctx.deps.playUiFeedbackSound)("lootMajor");
    (0, ctx.deps.setTimeout)(() => {
      fx.remove();
      dialog.classList.remove("is-hit");
      card.classList.remove("is-hit");
    }, ctx.state.HIT_FX_MS);
  }
  function closeVoidPassiveCraftOverlay(ctx) {
    stopRun(ctx);
    let overlay = ctx.deps.document.getElementById("void-passive-craft-overlay");
    if (overlay) overlay.remove();
  }
  function getVoidPassiveRefundState(ctx, nodeId) {
    let active = (ctx.deps.game.passives || []).includes(nodeId);
    let hasScour = (ctx.deps.game.currencies.blightSpore || 0) >= 1;
    let connected = typeof ctx.deps.canRefundPassiveNode === "function" && (0, ctx.deps.canRefundPassiveNode)(nodeId);
    return {
      enabled: active && hasScour && connected,
      reason: !active ? "활성화된 공허 패시브만 반환할 수 있습니다." : !connected ? "연결 유지에 필요한 노드는 반환할 수 없습니다." : !hasScour ? "마름병 포자가 부족합니다." : "마름병 포자 1개를 소모해 반환합니다."
    };
  }
  function craftVoidPassiveFromOverlay(ctx, nodeId, currencyKey) {
    const before = ctx.deps.game.currencies[currencyKey] || 0;
    (0, ctx.deps.applyVoidPassiveCurrency)(nodeId, currencyKey);
    const result = (ctx.deps.game.currencies[currencyKey] || 0) < before ? getVoidCraftResultText(ctx, nodeId, currencyKey) : "";
    if (result) (0, ctx.deps.showGameToast)(result, { tone: "info" });
    openVoidPassiveCraftOverlay(ctx, nodeId, result);
  }
  function canUseFairyRingOnVoid(ctx, entry, active) {
    return active && !entry.fairyLocked && (ctx.deps.game.currencies.fairyRing || 0) > 0 && (!!entry.transcendent || (entry.stats || []).length > 0);
  }
  function getVoidCraftResultText(ctx, nodeId, currencyKey) {
    const entry = (0, ctx.deps.getVoidPassiveCraft)(nodeId), name = (0, ctx.deps._t)(ctx.deps.ORB_DB[currencyKey].name);
    if (entry.transcendent) return `${name}, ${(0, ctx.deps.formatTranscendentVoidPassive)(entry.transcendent).replace(/<[^>]*>/g, "")}`;
    if (currencyKey === "fairyRing") return (0, ctx.deps._t)("{name}, 초월 실패, 옵션이 지워졌습니다.", { name });
    return (0, ctx.deps._t)("{name}, 새 옵션: {replace}", { name, replace: (0, ctx.deps.getVoidPassiveEffectLabel)(nodeId).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() });
  }
  function refundVoidPassiveFromOverlay(ctx, nodeId) {
    let state = getVoidPassiveRefundState(ctx, nodeId);
    if (!state.enabled) return (0, ctx.deps.addLog)(state.reason, "attack-monster");
    closeVoidPassiveCraftOverlay(ctx);
    (0, ctx.deps.refundPassiveNode)(nodeId);
  }
  async function askRefundPassiveNode(ctx, id) {
    if (!await (0, ctx.deps.requestGameConfirmation)((0, ctx.deps._t)("선택한 패시브 노드를 반환하고 마름병 포자 1개를 소모합니다."), {
      title: (0, ctx.deps._t)("패시브 노드 반환"),
      tone: "danger",
      confirmLabel: (0, ctx.deps._t)("노드 반환")
    })) return;
    (0, ctx.deps.refundPassiveNode)(id);
  }
  function getVoidCraftGuide(ctx, node, active) {
    if (!active) return "먼저 패시브 트리에서 이 공허 패시브를 활성화해야 제작할 수 있습니다.";
    const base = "마법의 새싹은 현재 옵션을 지우고 공허 옵션 1~2줄을 다시 굴립니다. 요정의 고리는 옵션이 있는 공허를 25% 확률로 초월시키고, 실패하면 옵션이 지워지며 이번 루프에는 이 소켓에 다시 쓸 수 없습니다. 황금률은 초월 수치를 다시 굴립니다.";
    if (node.voidRing !== "outer" || ctx.deps.game.passiveStarEvolution) return base;
    const progress = (0, ctx.deps.getPassiveConstellationAwakeningProgress)();
    return `${base}<br>${(0, ctx.deps._t)("직업 공허 소켓, 성좌 각성 {completed}/{required}: 여섯을 모두 활성화하면 성좌가 각성합니다.", { completed: progress.completed, required: progress.required })}`;
  }
  function describeTranscendentRange(ctx, def) {
    const range = (min, max, fixed) => fixed !== void 0 ? fixed : Number.isFinite(Number(min)) && Number.isFinite(Number(max)) ? min === max ? min : `${min}~${max}` : "";
    return def.desc(range(def.min, def.max, def.fixed), range(def.min2, def.max2));
  }
  function chameleonChoicesHtml(ctx, node, entry, active) {
    if (!active || !entry.transcendent || entry.transcendent.id !== "chameleon") return "";
    const rows = (0, ctx.deps.getChameleonChoices)(node.id).map((def) => `<button type="button" class="void-chameleon-choice" onclick="convertChameleonFromOverlay('${node.id}','${def.id}')"><b>${(0, ctx.deps.escapeHTML)((0, ctx.deps._t)(def.name))}</b><span>${(0, ctx.deps.escapeHTML)(describeTranscendentRange(ctx, def))}</span></button>`).join("");
    return `<div class="void-chameleon"><div class="void-craft-hint">${(0, ctx.deps._t)("카멜레온: 바꿀 초월을 고르세요. 수치는 새로 굴리고, 바꾼 뒤에는 되돌릴 수 없습니다.")}</div><div class="void-chameleon-list">${rows || (0, ctx.deps._t)('<div class="void-craft-hint">고를 수 있는 초월이 없습니다.</div>')}</div></div>`;
  }
  async function convertChameleonFromOverlay(ctx, nodeId, targetId) {
    const def = ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB.find((row) => row.id === targetId);
    if (!def || !await (0, ctx.deps.requestGameConfirmation)((0, ctx.deps._t)("카멜레온을 「{name}」 초월로 바꿉니다. 수치는 새로 굴리고, 되돌릴 수 없습니다.", { name: def.name }), { title: (0, ctx.deps._t)("카멜레온 변환"), confirmLabel: (0, ctx.deps._t)("바꾸기") })) return;
    const reason = (0, ctx.deps.convertChameleonVoidPassive)(nodeId, targetId);
    if (reason) return (0, ctx.deps.addLog)(reason, "attack-monster");
    const result = (0, ctx.deps._t)("카멜레온 변환, {replace}", { replace: (0, ctx.deps.formatTranscendentVoidPassive)((0, ctx.deps.getVoidPassiveCraft)(nodeId).transcendent).replace(/<[^>]*>/g, "") });
    (0, ctx.deps.addLog)(`🦎 ${result}`, "loot-unique");
    (0, ctx.deps.showGameToast)(result, { tone: "info" });
    (0, ctx.deps.updateStaticUI)();
    openVoidPassiveCraftOverlay(ctx, nodeId, result);
  }
  function openVoidPassiveCraftOverlay(ctx, nodeId, result = "") {
    closeVoidPassiveCraftOverlay(ctx);
    let node = ctx.deps.PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== "void") return (0, ctx.deps.addLog)((0, ctx.deps._t)("공허 패시브만 제작할 수 있습니다."), "attack-monster");
    let active = (ctx.deps.game.passives || []).includes(node.id);
    let entry = voidOverlayEntry(ctx, node);
    let refundState = getVoidPassiveRefundState(ctx, node.id);
    let overlay = ctx.deps.document.createElement("div");
    overlay.id = "void-passive-craft-overlay";
    overlay.className = "void-craft-overlay";
    overlay.onclick = (event) => {
      if (event.target === overlay) closeVoidPassiveCraftOverlay(ctx);
    };
    overlay.innerHTML = voidOverlayHtml(ctx, { node, active, entry, refundState, result });
    ctx.deps.document.body.appendChild(overlay);
  }
  function targetsOf(ctx, nodeId) {
    return ctx.state.targets.get(String(nodeId)) || /* @__PURE__ */ new Set();
  }
  function lineName(ctx, statId) {
    return (0, ctx.deps.escapeHTML)(String((0, ctx.deps.getStatName)(statId)).replace(/\s*\((\+%p|%)\)\s*/g, "").trim());
  }
  function optionOf(ctx, statId) {
    return ctx.deps.VOID_PASSIVE_OPTION_POOL.find((option) => option.id === statId);
  }
  function chipClass(ctx, statId) {
    return `void-chip is-${ctx.state.GROUP_CLASS[optionOf(ctx, statId).group]}`;
  }
  function budCount(ctx) {
    return Math.max(0, Math.floor(ctx.deps.game.currencies.magicBud || 0));
  }
  function rangeText(ctx, option) {
    return `${option.min}~${option.max}${String((0, ctx.deps.getStatName)(option.id)).includes("%") ? "%" : ""}`;
  }
  function runStatus(ctx) {
    return (0, ctx.deps._t)("{used}개 사용, 남은 새싹 {budCount}개", { used: ctx.state.run.used, budCount: budCount(ctx) });
  }
  function plainEffect(ctx, nodeId) {
    return (0, ctx.deps.getVoidPassiveEffectLabel)(nodeId).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  function voidOverlayEntry(ctx, node) {
    return typeof ctx.deps.getVoidPassiveCraft === "function" ? (0, ctx.deps.getVoidPassiveCraft)(node.id) : { stats: [] };
  }
  function canRollMagicBud(ctx, active, entry) {
    return active && !entry.transcendent && (ctx.deps.game.currencies.magicBud || 0) > 0;
  }
  function canRerollTranscendent(ctx, active, entry) {
    return active && entry.transcendent && typeof ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB !== "undefined" && ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB.some((def) => def.id === entry.transcendent.id && Number.isFinite(Number(def.min))) && (ctx.deps.game.currencies.goldenRule || 0) > 0;
  }
  function voidOverlayHtml(ctx, { node, active, entry, refundState, result }) {
    return `<div class="void-craft-dialog" role="dialog" aria-modal="true" aria-labelledby="void-craft-title" tabindex="-1">
        <div class="void-craft-header">
            <div><div id="void-craft-title">${(0, ctx.deps.escapeHTML)((0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node))}</div><div class="void-craft-subtitle">${(0, ctx.deps._t)("공허 패시브 제작")}</div></div>
            <button type="button" onclick="closeVoidPassiveCraftOverlay()">${(0, ctx.deps._t)("닫기")}</button>
        </div>
        <div class="void-craft-effect" id="void-craft-effect">${effectHtml(ctx, node.id)}</div>${chameleonChoicesHtml(ctx, node, entry, active)}
        ${result ? `<div class="void-craft-result" role="status">${(0, ctx.deps.escapeHTML)(result)}</div>` : ""}
        <div class="void-craft-hint">${getVoidCraftGuide(ctx, node, active)}</div>
        <div class="void-craft-actions">
            <button type="button" class="void-currency is-bud" onclick="craftVoidPassiveFromOverlay('${node.id}','magicBud')" ${canRollMagicBud(ctx, active, entry) ? "" : "disabled"}>${(0, ctx.deps._t)("마법의 새싹, 1~2줄 재굴림")}<br><span id="void-bud-count">${(0, ctx.deps._t)("보유 {magicBud}", { magicBud: ctx.deps.game.currencies.magicBud || 0 })}</span></button>
            <button type="button" class="void-currency is-ring" onclick="craftVoidPassiveFromOverlay('${node.id}','fairyRing')" ${canUseFairyRingOnVoid(ctx, entry, active) ? "" : "disabled"}>${(0, ctx.deps._t)("요정의 고리")}<br><span>${entry.fairyLocked ? (0, ctx.deps._t)("이번 루프 사용 불가") : (0, ctx.deps._t)("보유 {fairyRing}", { fairyRing: ctx.deps.game.currencies.fairyRing || 0 })}</span></button>
            <button type="button" class="void-currency is-rule" onclick="craftVoidPassiveFromOverlay('${node.id}','goldenRule')" ${canRerollTranscendent(ctx, active, entry) ? "" : "disabled"}>${(0, ctx.deps._t)("황금률")}<br><span>${(0, ctx.deps._t)("보유 {goldenRule}", { goldenRule: ctx.deps.game.currencies.goldenRule || 0 })}</span></button>
        </div>
        ${panelHtml(ctx, node, entry, active)}
        <div class="void-craft-footer">
            <div class="void-craft-hint">${refundState.reason}</div>
            <button type="button" onclick="refundVoidPassiveFromOverlay('${node.id}')" ${refundState.enabled ? "" : "disabled"}>${(0, ctx.deps._t)("공허 패시브 반환 (마름병 포자 1)")}</button>
        </div>
    </div>`;
  }

  // modules/ui/passive-tree-search.mjs
  function ensurePassiveTreeSearchSettings(ctx) {
    if (typeof ctx.deps.game !== "undefined" && ctx.deps.game) {
      if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== "object") ctx.deps.game.settings = {};
      if (typeof ctx.deps.game.settings.passiveTreeSearch !== "string") ctx.deps.game.settings.passiveTreeSearch = ctx.state.passiveTreeSearch || "";
      if (typeof ctx.deps.game.settings.passiveTreeFilter !== "string") ctx.deps.game.settings.passiveTreeFilter = ctx.state.passiveTreeFilter || "all";
      ctx.state.passiveTreeSearch = ctx.deps.game.settings.passiveTreeSearch;
      ctx.state.passiveTreeFilter = ctx.deps.game.settings.passiveTreeFilter;
    }
    return currentSearchState(ctx);
  }
  function getPassiveTreeSearchState(ctx) {
    return ensurePassiveTreeSearchSettings(ctx);
  }
  function getPassiveTreeNodeSearchText(ctx, node) {
    if (!node) return "";
    let parts = [
      node.id,
      (0, ctx.deps._t)(node.title),
      (0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node),
      (0, ctx.deps.passiveNodePresentation.getPassiveEffectLabel)(node),
      (0, ctx.deps.getStatName)(node.stat)
    ];
    return parts.filter(Boolean).join(" ").toLowerCase();
  }
  function getPassiveTreeNodeCategory(ctx, node) {
    let stat = node && node.stat;
    if (node && node.kind === "void") return "utility";
    if (["flatDmg", "pctDmg", "meleePctDmg", "physPctDmg", "aoePctDmg", "projectilePctDmg", "crit", "critDmg", "ds", "physIgnore", "igniteChance", "chillChance", "freezeChance", "shockChance", "poisonChance", "bleedChance"].includes(stat)) return "offense";
    if (["flatHp", "pctHp", "regen", "leech", "armor", "armorPct", "evasion", "evasionPct", "energyShield", "energyShieldPct", "energyShieldRegen", "deflectChance", "dr", "blockChance", "blockChancePct", "resF", "resC", "resL", "resAll", "resChaos", "ailResIgnite", "ailResShock", "ailResFreeze", "ailResPoison", "ailResBleed"].includes(stat)) return "defense";
    if (["firePctDmg", "coldPctDmg", "lightPctDmg", "chaosPctDmg", "elementalPctDmg", "dotPctDmg", "resPen"].includes(stat)) return "element";
    if (["aspd", "move", "suppCap", "gemLevel", "expGain"].includes(stat)) return "utility";
    return "other";
  }
  function doesPassiveNodeMatchSearch(ctx, node, query) {
    let q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    return q.split(/\s+/).filter(Boolean).every((token) => getPassiveTreeNodeSearchText(ctx, node).includes(token));
  }
  function doesPassiveNodeMatchFilter(ctx, node, filter) {
    let f = filter || "all";
    if (f === "all") return true;
    if (f === "offense") return getPassiveTreeNodeCategory(ctx, node) === "offense" || getPassiveTreeNodeCategory(ctx, node) === "element";
    return getPassiveTreeNodeCategory(ctx, node) === f;
  }
  function getPassiveNodeSearchMatch(ctx, node) {
    let state = getPassiveTreeSearchState(ctx);
    let query = String(state.search || "").trim();
    let filter = state.filter || "all";
    let active = !!query || filter !== "all";
    if (!active) return { active: false, matches: true, query, filter };
    if (node && typeof ctx.deps.getPassiveVisibility === "function" && (0, ctx.deps.getPassiveVisibility)(node.id) === "hidden") {
      return { active: true, matches: false, query, filter };
    }
    return {
      active: true,
      matches: doesPassiveNodeMatchSearch(ctx, node, query) && doesPassiveNodeMatchFilter(ctx, node, filter),
      query,
      filter
    };
  }
  function setPassiveTreeSearchState(ctx, next) {
    let cur = ensurePassiveTreeSearchSettings(ctx);
    let search = nextSearchText(next, cur);
    let filter = nextSearchFilter(next, cur);
    if (!["all", "offense", "defense", "element", "utility"].includes(filter)) filter = "all";
    ctx.state.passiveTreeSearch = search;
    ctx.state.passiveTreeFilter = filter;
    if (typeof ctx.deps.game !== "undefined" && ctx.deps.game) {
      if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== "object") ctx.deps.game.settings = {};
      ctx.deps.game.settings.passiveTreeSearch = ctx.state.passiveTreeSearch;
      ctx.deps.game.settings.passiveTreeFilter = ctx.state.passiveTreeFilter;
    }
    syncPassiveTreeSearchControls(ctx);
    if (typeof ctx.deps.markPassiveRenderCacheDirty === "function") (0, ctx.deps.markPassiveRenderCacheDirty)("state");
    if (ctx.deps.document.getElementById("tab-char") && ctx.deps.document.getElementById("tab-char").classList.contains("active")) {
      (0, ctx.deps.resizePassiveTreeCanvas)(false);
      (0, ctx.deps.drawPassiveTree)();
    }
  }
  function syncPassiveTreeSearchControls(ctx) {
    let state = ensurePassiveTreeSearchSettings(ctx);
    let input = ctx.deps.document.getElementById("passive-search-input");
    if (input && input.value !== state.search) input.value = state.search;
    ctx.deps.document.querySelectorAll("[data-passive-filter]").forEach((btn) => {
      let active = btn.dataset.passiveFilter === state.filter;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }
  function setupPassiveTreeSearchControls(ctx) {
    if (typeof ctx.deps.syncPassiveAttributePreferenceControls === "function") (0, ctx.deps.syncPassiveAttributePreferenceControls)();
    if (ctx.state.controlsBound) {
      syncPassiveTreeSearchControls(ctx);
      return;
    }
    ctx.state.controlsBound = true;
    let input = ctx.deps.document.getElementById("passive-search-input");
    if (input) {
      input.addEventListener("input", () => setPassiveTreeSearchState(ctx, { search: input.value }));
    }
    ctx.deps.document.querySelectorAll("[data-passive-filter]").forEach((btn) => {
      btn.addEventListener("click", () => setPassiveTreeSearchState(ctx, { filter: btn.dataset.passiveFilter || "all" }));
    });
    let clear = ctx.deps.document.getElementById("passive-search-clear");
    if (clear) {
      clear.addEventListener("click", () => setPassiveTreeSearchState(ctx, { search: "", filter: "all" }));
    }
    syncPassiveTreeSearchControls(ctx);
  }
  function currentSearchState(ctx) {
    return { search: ctx.state.passiveTreeSearch || "", filter: ctx.state.passiveTreeFilter || "all" };
  }
  function nextSearchText(next, cur) {
    return next && next.search !== void 0 ? String(next.search || "") : cur.search;
  }
  function nextSearchFilter(next, cur) {
    return next && next.filter !== void 0 ? String(next.filter || "all") : cur.filter;
  }

  // modules/ui/passive-tree-planner.mjs
  function getPassiveTreeResetBlockReason(ctx) {
    const replay = ctx.deps.shopView.busyReason();
    if (replay) return replay;
    if (ctx.deps.game.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 스킬트리를 초기화할 수 없습니다.";
    if ((ctx.deps.game.currencies.goldenRule || 0) < 1) return "황금률이 부족합니다.";
    return (0, ctx.deps.getPaidPassiveNodeIds)(ctx.deps.game.passives).length > 0 ? "" : "초기화할 스킬트리 노드가 없습니다.";
  }
  async function resetPassiveTreeByGoldenRule(ctx) {
    const button = ctx.deps.document.getElementById("btn-passive-tree-reset");
    if (button && button.disabled) return;
    const blocked = getPassiveTreeResetBlockReason(ctx);
    if (blocked) return (0, ctx.deps.addLog)(blocked, "attack-monster");
    const owner = ctx.deps.game, spentNodes = (0, ctx.deps.getPaidPassiveNodeIds)(ctx.deps.game.passives).length, before = ctx.deps.game.passives.join("|");
    if (button) button.disabled = true;
    let accepted = false;
    try {
      accepted = await (0, ctx.deps.requestGameConfirmation)(`황금률 1개로 기본 스킬트리를 초기화하고 ${spentNodes}점을 돌려받습니다.
루프 패시브, 심화 패시브와 전직은 그대로입니다.`, {
        title: (0, ctx.deps._t)("스킬트리 초기화"),
        tone: "danger",
        confirmLabel: (0, ctx.deps._t)("초기화")
      });
    } finally {
      if (button) button.disabled = false;
    }
    if (!accepted) return;
    if (ctx.deps.game !== owner || getPassiveTreeResetBlockReason(ctx) || ctx.deps.game.passives.join("|") !== before) {
      return (0, ctx.deps.addLog)((0, ctx.deps._t)("확인하는 사이 게임 상태, 스킬트리나 재화가 바뀌어 초기화를 취소했습니다."), "attack-monster");
    }
    ctx.deps.game.currencies.goldenRule -= 1;
    const grantedPoints = ctx.deps.passiveRouting.paleBonus(ctx.deps.game);
    const hadOverflowKeystone = (0, ctx.deps.hasAuthoredPassiveKeystone)("의지의 공명");
    ctx.deps.game.passives = [];
    ctx.deps.game.passiveAttributeChoices = {};
    ctx.deps.game.passivePoints = Math.max(0, ctx.deps.game.passivePoints + spentNodes - grantedPoints);
    (0, ctx.deps.calculateReachableNodes)();
    (0, ctx.deps.refreshPassiveVisibility)();
    (0, ctx.deps.normalizeSupportLoadout)(true, null, hadOverflowKeystone);
    (0, ctx.deps.addLog)((0, ctx.deps._t)("🧠 스킬트리 초기화: {spentNodes}점을 돌려받았습니다.", { spentNodes }), "season-up");
    (0, ctx.deps.updateStaticUI)();
  }
  function renderPassiveTreePlannerPanel(ctx) {
    let host = ctx.deps.document.getElementById("passive-tree-planner");
    if (!host || typeof ctx.deps.ensurePassiveTreePlannerState !== "function") return;
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let active = planner.presets[planner.activeSlot];
    let owned = new Set(ctx.deps.game.passives || []);
    let completed = countPresetCompleted(active, owned);
    let signature = JSON.stringify([
      planner.activeSlot,
      planner.autoInvest,
      ctx.deps.game.settings.passiveTreeShowLabels !== false,
      completed,
      planner.presets.map((preset) => preset ? [preset.name, preset.nodeIds.length] : null)
    ]);
    if (host.dataset.plannerSignature === signature) return;
    let options = planner.presets.map((preset, index) => {
      let label = preset ? `${index + 1}. ${preset.name} (${preset.nodeIds.length})` : (0, ctx.deps._t)("{value}. 빈 프리셋", { value: index + 1 });
      return `<option value="${index}" ${index === planner.activeSlot ? "selected" : ""}>${(0, ctx.deps.escapeHTML)(label)}</option>`;
    }).join("");
    host.innerHTML = `
        <div class="passive-planner-row passive-planner-primary">
            <strong>${(0, ctx.deps._t)("트리 프리셋")}</strong>
            <select id="passive-preset-slot" onchange="selectPassiveTreePresetSlot(this.value)">${options}</select>
            <input id="passive-preset-name" class="passive-preset-name" type="text" maxlength="24" value="${(0, ctx.deps.escapeHTML)(active ? active.name : (0, ctx.deps._t)("프리셋 {value}", { value: planner.activeSlot + 1 }))}" aria-label="${(0, ctx.deps._t)("프리셋 이름")}">
            <button type="button" onclick="savePassiveTreePresetFromUi()">${(0, ctx.deps._t)("현재 트리 저장")}</button>
            <label class="passive-planner-toggle"><input type="checkbox" ${planner.autoInvest ? "checked" : ""} onchange="togglePassiveTreeAutoInvest(this.checked)"> ${(0, ctx.deps._t)("환생 후 자동 투자")}</label>
            <label class="passive-planner-toggle"><input type="checkbox" ${ctx.deps.game.settings.passiveTreeShowLabels === true ? "checked" : ""} onchange="togglePassiveTreeLabels(this.checked)"> ${(0, ctx.deps._t)("상시 문구")}</label>
            <span class="passive-planner-progress">${active ? (0, ctx.deps._t)("{completed}/{length} 투자", { completed, length: active.nodeIds.length }) : (0, ctx.deps._t)("저장된 경로 없음")}</span>
        </div>
        <div class="passive-planner-row passive-planner-share">
            <input id="passive-preset-code" type="text" placeholder="${(0, ctx.deps._t)("공유 코드를 붙여넣으세요")}" autocomplete="off">
            <button type="button" onclick="copyPassiveTreePresetCode()" ${active ? "" : "disabled"}>${(0, ctx.deps._t)("공유 코드 복사")}</button>
            <button type="button" onclick="importPassiveTreePresetFromUi()">${(0, ctx.deps._t)("코드 불러오기")}</button>
        </div>`;
    host.dataset.plannerSignature = signature;
  }
  function selectPassiveTreePresetSlot(ctx, slotIndex) {
    if ((0, ctx.deps.setActivePassiveTreePreset)(slotIndex)) renderPassiveTreePlannerPanel(ctx);
  }
  function savePassiveTreePresetFromUi(ctx) {
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let allocated = (ctx.deps.game.passives || []).filter((id) => ctx.deps.PASSIVE_TREE.nodes[id] && ctx.deps.PASSIVE_TREE.nodes[id].kind !== "start");
    if (allocated.length === 0) return (0, ctx.deps.addLog)((0, ctx.deps._t)("저장할 패시브 경로가 없습니다."), "attack-monster");
    let nameInput = ctx.deps.document.getElementById("passive-preset-name");
    let name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : (0, ctx.deps._t)("프리셋 {value}", { value: planner.activeSlot + 1 });
    let preset = (0, ctx.deps.saveCurrentPassiveTreePreset)(planner.activeSlot, name);
    (0, ctx.deps.addLog)((0, ctx.deps._t)("🧭 {name}에 현재 패시브 {length}개를 저장했습니다.", { name: (0, ctx.deps._t)(preset.name), length: preset.nodeIds.length }), "season-up");
    renderPassiveTreePlannerPanel(ctx);
  }
  function togglePassiveTreeAutoInvest(ctx, enabled) {
    (0, ctx.deps.setPassiveTreeAutoInvest)(enabled);
    let result = enabled ? (0, ctx.deps.runPassiveTreeAutoInvest)() : { nodes: 0 };
    if (result.nodes > 0) (0, ctx.deps.addLog)((0, ctx.deps._t)("🧭 프리셋 자동 투자: {nodes}개 노드 활성화", { nodes: result.nodes }), "season-up");
    (0, ctx.deps.updateStaticUI)();
  }
  function togglePassiveTreeLabels(ctx, enabled) {
    ctx.deps.game.settings.passiveTreeShowLabels = !!enabled;
    if (typeof ctx.deps.markPassiveRenderCacheDirty === "function") (0, ctx.deps.markPassiveRenderCacheDirty)("labels");
    (0, ctx.deps.drawPassiveTree)();
  }
  async function copyPassiveTreePresetCode(ctx) {
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let code = (0, ctx.deps.encodePassiveTreePreset)(planner.activeSlot);
    let input = ctx.deps.document.getElementById("passive-preset-code");
    if (!code || !input) return;
    input.value = code;
    input.select();
    try {
      if (ctx.deps.navigator.clipboard && ctx.deps.navigator.clipboard.writeText) await ctx.deps.navigator.clipboard.writeText(code);
      else if (ctx.deps.document.execCommand) ctx.deps.document.execCommand("copy");
      (0, ctx.deps.addLog)((0, ctx.deps._t)("📋 패시브 트리 공유 코드를 복사했습니다."), "loot-magic");
    } catch {
      (0, ctx.deps.addLog)((0, ctx.deps._t)("공유 코드를 입력칸에 만들었습니다. 직접 복사해 주세요."), "attack-monster");
    }
  }
  function importPassiveTreePresetFromUi(ctx) {
    let planner = (0, ctx.deps.ensurePassiveTreePlannerState)();
    let input = ctx.deps.document.getElementById("passive-preset-code");
    try {
      let preset = (0, ctx.deps.importPassiveTreePreset)(planner.activeSlot, input ? input.value : "");
      (0, ctx.deps.addLog)((0, ctx.deps._t)("🧭 공유 프리셋 [{name}]{particle} 불러왔습니다.", { name: (0, ctx.deps._t)(preset.name), particle: (0, ctx.deps.pickParticle)(preset.name, "을", "를") }), "season-up");
      renderPassiveTreePlannerPanel(ctx);
    } catch (error) {
      (0, ctx.deps.addLog)((0, ctx.deps._t)("프리셋을 불러오지 못했습니다: {message}", { message: error.message }), "attack-monster");
    }
  }
  function countPresetCompleted(active, owned) {
    return active ? active.nodeIds.filter((id) => owned.has(id)).length : 0;
  }

  // modules/ui/passive-tree-summary.mjs
  function getAllocatedPassiveStatSummary(ctx) {
    const totals = {};
    const specialEffects = [];
    const allocatedIds = Array.isArray(ctx.deps.game.passives) ? ctx.deps.game.passives : [];
    const balanceAttributes = (0, ctx.deps.hasAuthoredPassiveKeystone)("균형의 공명");
    const virtualVoidCount = (0, ctx.deps.getVirtualVoidPassiveCount)();
    let voidCount = 0;
    const add = (stat, value) => {
      if (!ctx.deps.P_STATS[stat] || !Number.isFinite(Number(value)) || balanceAttributes && stat === "intelligence") return;
      totals[stat] = (totals[stat] || 0) + Number(value);
    };
    allocatedIds.forEach((id) => {
      const node = ctx.deps.PASSIVE_TREE.nodes[id];
      if (!node) return;
      if (node.kind === "void") {
        voidCount++;
        const entry = ctx.deps.game.voidPassives && ctx.deps.game.voidPassives[String(id)];
        ctx.deps.passiveRouting.voidStats(entry, ctx.deps.game, (0, ctx.deps.getVoidLinkScale)(id)).forEach((line) => add(line && line.id, line && line.val));
        (0, ctx.deps.getTranscendentVoidPassiveStats)(id, entry, virtualVoidCount).forEach((line) => add(line.stat, line.val));
        if (entry && entry.transcendent) {
          const def = (typeof ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB !== "undefined" ? ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB : []).find((row) => row.id === entry.transcendent.id);
          specialEffects.push(def ? (0, ctx.deps._t)("초월, {name}", { name: def.name }) : "초월 공허 효과");
        }
        return;
      }
      (0, ctx.deps.getEffectivePassiveNodeEffects)(node, balanceAttributes).forEach((effect) => add(effect.stat, effect.val));
    });
    appendSpecialEffectSummary(ctx, totals, specialEffects);
    return {
      allocatedCount: allocatedIds.filter((id) => ctx.deps.PASSIVE_TREE.nodes[id] && ctx.deps.PASSIVE_TREE.nodes[id].kind !== "start").length,
      voidCount,
      totals: Object.entries(totals).sort((a, b) => (0, ctx.deps.getStatName)(a[0]).localeCompare((0, ctx.deps.getStatName)(b[0]), "ko")),
      specialEffects
    };
  }
  function renderPassiveSpecializationControls(ctx) {
    if (typeof ctx.deps.ensurePassiveSpecializationState !== "function") return "";
    const state = (0, ctx.deps.ensurePassiveSpecializationState)();
    const devotion = typeof ctx.deps.getAllocatedPassiveStatValue === "function" ? (0, ctx.deps.getAllocatedPassiveStatValue)("devotion") : 0;
    const revelationUnlocked = devotion >= 1;
    const tripleRevelation = typeof ctx.deps.findAllocatedPassiveKeystone === "function" && !!(0, ctx.deps.findAllocatedPassiveKeystone)("삼중 계시");
    const revelationLabels = { combat: "전투의 계시", guard: "수호의 계시", life: "생명의 성약" };
    const revelationOptions = Object.entries(revelationLabels).map(([id, label]) => `<option value="${id}" ${state.revelation === id ? "selected" : ""}>${label}</option>`).join("");
    const wisdomNode = typeof ctx.deps.findAllocatedPassiveKeystone === "function" ? (0, ctx.deps.findAllocatedPassiveKeystone)("지혜의 도약") : null;
    if (!revelationUnlocked && !tripleRevelation && !wisdomNode) return "";
    const renderRevelationSelector = () => {
      if (!revelationUnlocked && !tripleRevelation) return "";
      return `<label>${(0, ctx.deps._t)("계시")}<select onchange="onPassiveRevelationChanged(this.value)" ${tripleRevelation ? "disabled" : ""}>${revelationOptions}</select></label>`;
    };
    const elementLabels = { fire: "화염", cold: "냉기", lightning: "번개", chaos: "공허(카오스)", "": "속성 노드 미투자" };
    const wisdomElement = (0, ctx.deps.getPassiveWisdomElementFromNodeIds)(ctx.deps.game.passives);
    return `<div class="passive-specialization-controls">${renderRevelationSelector()}
        ${tripleRevelation ? (0, ctx.deps._t)('<span class="passive-specialization-locked">삼중 계시: 세 효과가 40%로 고정 적용</span>') : ""}
        ${wisdomNode ? `<span class="passive-specialization-locked">${(0, ctx.deps._t)("지혜의 도약, {elementLabels}", { elementLabels: elementLabels[wisdomElement] })} <small>${(0, ctx.deps._t)("투자한 노드 기준")}</small></span>` : ""}</div>`;
  }
  function onPassiveRevelationChanged(ctx, value) {
    if (typeof ctx.deps.setPassiveRevelation !== "function" || !(0, ctx.deps.setPassiveRevelation)(value)) {
      (0, ctx.deps.addLog)((0, ctx.deps._t)("헌신이 1 이상일 때만 계시를 선택할 수 있습니다."), "attack-monster");
      return;
    }
    (0, ctx.deps.updateStaticUI)();
    (0, ctx.deps.queueImportantSave)(180);
  }
  function renderPassiveInvestmentSummary(ctx) {
    const panel = ctx.deps.document.getElementById("passive-investment-summary");
    const body = ctx.deps.document.getElementById("passive-investment-summary-body");
    if (!panel || !body) return;
    if (typeof ctx.deps.syncPassiveAttributePreferenceControls === "function") (0, ctx.deps.syncPassiveAttributePreferenceControls)();
    if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== "object") ctx.deps.game.settings = {};
    const collapsed = !!ctx.deps.game.settings.passiveInvestmentSummaryCollapsed;
    panel.classList.toggle("collapsed", collapsed);
    const toggle = panel.querySelector(".passive-investment-summary-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    const summary = getAllocatedPassiveStatSummary(ctx);
    const rows = passiveSummaryTotalsHtml(ctx, summary);
    const specials = summary.specialEffects.length ? `<div class="passive-summary-specials">${(0, ctx.deps._t)("조건부 효과, {specialEffects}", { specialEffects: summary.specialEffects.join(", ") })}</div>` : "";
    (0, ctx.deps.writeHtmlIfChanged)(body, `<div class="passive-summary-meta">투자 ${summary.allocatedCount}개${summary.voidCount ? (0, ctx.deps._t)(", 공허 {voidCount}개", { voidCount: summary.voidCount }) : ""}</div>${renderPassiveSpecializationControls(ctx)}<div class="passive-summary-grid">${rows}</div>${specials}`);
    renderPassiveTreePlannerPanel(ctx);
  }
  function togglePassiveInvestmentSummary(ctx) {
    if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== "object") ctx.deps.game.settings = {};
    ctx.deps.game.settings.passiveInvestmentSummaryCollapsed = !ctx.deps.game.settings.passiveInvestmentSummaryCollapsed;
    renderPassiveInvestmentSummary(ctx);
  }
  function syncPassiveTreeHeader(ctx) {
    ctx.deps.document.getElementById("ui-passive-points").innerText = ctx.deps.game.passivePoints;
    const button = ctx.deps.document.getElementById("btn-passive-tree-reset");
    if (!button) return;
    const count = (0, ctx.deps.getPaidPassiveNodeIds)(ctx.deps.game.passives).length, title = (0, ctx.deps._t)("황금률 1개로 찍은 {count}점을 모두 돌려받습니다. 루프 패시브, 심화 패시브와 전직은 그대로입니다.", { count });
    if (button.hidden !== count <= 0) button.hidden = count <= 0;
    if (button.dataset.tip !== title) button.dataset.tip = title;
  }
  function appendConstellationSummary(ctx, specialEffects) {
    if (ctx.deps.game.passiveStarEvolution) {
      specialEffects.push(ctx.deps.game.passiveStarEvolutionSource === "legacy_migrated" ? "성좌 각성, 기존 트리에서 영구 계승" : "성좌 각성, 별의 공명 영구 활성");
    } else if (typeof ctx.deps.getPassiveConstellationAwakeningProgress === "function") {
      const progress = (0, ctx.deps.getPassiveConstellationAwakeningProgress)();
      if (progress.mode === "outer_void" && progress.allocated > 0) {
        specialEffects.push(`성좌 각성 ${progress.completed}/${progress.required}, 직업 공허 소켓을 모두 활성화`);
      }
    }
  }
  function appendSpecialEffectSummary(ctx, totals, specialEffects) {
    const specialization = typeof ctx.deps.ensurePassiveSpecializationState === "function" ? (0, ctx.deps.ensurePassiveSpecializationState)() : null;
    if ((totals.mystique || 0) > 0) specialEffects.push(`신비 ${(0, ctx.deps.formatValue)("mystique", totals.mystique)}, 최고 피해 속성 상태이상 강화`);
    if ((totals.devotion || 0) > 0 && specialization) {
      const revelationLabel = { combat: "전투", guard: "수호", life: "생명" }[specialization.revelation] || "전투";
      specialEffects.push(`${revelationLabel}의 계시, 헌신 ${(0, ctx.deps.formatValue)("devotion", totals.devotion)}`);
    }
    if ((totals.cycle || 0) > 0) specialEffects.push(`순환 ${(0, ctx.deps.formatValue)("cycle", totals.cycle)}, 상태이상 종료 시 6초 강화`);
    appendConstellationSummary(ctx, specialEffects);
  }
  function passiveSummaryTotalsHtml(ctx, summary) {
    return summary.totals.length ? summary.totals.map(([stat, value]) => `<span>${(0, ctx.deps.getStatName)(stat)}</span><strong style="color:${(0, ctx.deps.getItemStatToneColor)(stat)}">+${(0, ctx.deps.formatValue)(stat, value)}${ctx.deps.P_STATS[stat] && ctx.deps.P_STATS[stat].isPct ? "%" : ""}</strong>`).join("") : "<span>아직 투자한 효과가 없습니다.</span><strong>-</strong>";
  }

  // modules/ui/passive-tree-tooltips.mjs
  function normalizePassiveTooltipText(ctx, value) {
    return String(value || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/초당 생명력 재생/g, "초당 재생").replace(/\(\s*%\s*\)/g, "").replace(/\s+/g, " ").trim();
  }
  function getPassiveTooltipDescription(ctx, node, effectLabels) {
    if (!node || !node.desc) return "";
    if (Array.isArray(node.effects) && node.effects.length > 0) return "";
    const description = normalizePassiveTooltipText(ctx, node.desc);
    if (!description) return "";
    const labels = Array.isArray(effectLabels) ? effectLabels : [effectLabels];
    const repeatsEffect = labels.some((label) => {
      const effect = normalizePassiveTooltipText(ctx, label);
      return effect === description || effect.startsWith(`${description} `);
    });
    return repeatsEffect ? "" : node.desc;
  }
  function describeReachablePassiveNode(ctx, node) {
    return node.kind === "start" ? "시작점, 여기서 이어진 노드부터 포인트를 씁니다." : "활성화하면 주변 노드가 밝혀집니다.";
  }
  function describeBlockedPassiveNode(ctx, node) {
    return node.kind === "start" ? "시작점은 이미 열려 있습니다. 이어진 노드를 눌러 포인트를 쓰세요." : "연결된 노드가 아니라 활성화할 수 없습니다.";
  }

  // modules/ui/passive-tree-view.mjs
  function createPassiveTreeView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { tick, getPassiveTreeSearchState, getPassiveNodeSearchMatch, setPassiveTreeSearchState, renderPassiveSpecializationControls, onPassiveRevelationChanged, renderPassiveInvestmentSummary, togglePassiveInvestmentSummary, syncPassiveTreeHeader, resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot, savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest, togglePassiveTreeLabels, copyPassiveTreePresetCode, importPassiveTreePresetFromUi, setupPassiveTreeSearchControls, closeVoidPassiveCraftOverlay, craftVoidPassiveFromOverlay, refundVoidPassiveFromOverlay, askRefundPassiveNode, convertChameleonFromOverlay, openVoidPassiveCraftOverlay, normalizePassiveTooltipText, getPassiveTooltipDescription, describeReachablePassiveNode, describeBlockedPassiveNode, effectHtml, panelHtml, toggleTarget, openPicker, showGroup, toggleRun, stopRun };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    initialize(ctx);
    ctx.api = createPublicApi(ctx);
    return ctx.api;
  }
  function initialize(ctx) {
    ctx.state.passiveTreeSearch = "";
    ctx.state.passiveTreeFilter = "all";
    ctx.state.controlsBound = false;
    ctx.state.RUN_INTERVAL_MS = 130;
    ctx.state.MAX_TARGETS = 3;
    ctx.state.HIT_FX_MS = 1900;
    ctx.state.SPARKS = 22;
    ctx.state.GROUP_CLASS = { 피해: "damage", "치명타와 속도": "speed", 상태이상: "ailment", 방어: "defence", 능력치: "attribute", 무기: "weapon" };
    ctx.state.PICKER_ID = "void-target-dialog";
    ctx.state.targets = /* @__PURE__ */ new Map();
    ctx.state.run = null;
    ctx.state.pickerNode = null;
    ctx.state.pickerGroup = Object.keys(ctx.state.GROUP_CLASS)[0];
  }
  function createPublicApi(ctx) {
    return { getPassiveTreeSearchState: ctx.handlers.getPassiveTreeSearchState, getPassiveNodeSearchMatch: ctx.handlers.getPassiveNodeSearchMatch, setPassiveTreeSearchState: ctx.handlers.setPassiveTreeSearchState, renderPassiveSpecializationControls: ctx.handlers.renderPassiveSpecializationControls, onPassiveRevelationChanged: ctx.handlers.onPassiveRevelationChanged, renderPassiveInvestmentSummary: ctx.handlers.renderPassiveInvestmentSummary, togglePassiveInvestmentSummary: ctx.handlers.togglePassiveInvestmentSummary, syncPassiveTreeHeader: ctx.handlers.syncPassiveTreeHeader, resetPassiveTreeByGoldenRule: ctx.handlers.resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel: ctx.handlers.renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot: ctx.handlers.selectPassiveTreePresetSlot, savePassiveTreePresetFromUi: ctx.handlers.savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest: ctx.handlers.togglePassiveTreeAutoInvest, togglePassiveTreeLabels: ctx.handlers.togglePassiveTreeLabels, copyPassiveTreePresetCode: ctx.handlers.copyPassiveTreePresetCode, importPassiveTreePresetFromUi: ctx.handlers.importPassiveTreePresetFromUi, setupPassiveTreeSearchControls: ctx.handlers.setupPassiveTreeSearchControls, closeVoidPassiveCraftOverlay: ctx.handlers.closeVoidPassiveCraftOverlay, craftVoidPassiveFromOverlay: ctx.handlers.craftVoidPassiveFromOverlay, refundVoidPassiveFromOverlay: ctx.handlers.refundVoidPassiveFromOverlay, askRefundPassiveNode: ctx.handlers.askRefundPassiveNode, convertChameleonFromOverlay: ctx.handlers.convertChameleonFromOverlay, openVoidPassiveCraftOverlay: ctx.handlers.openVoidPassiveCraftOverlay, normalizePassiveTooltipText: ctx.handlers.normalizePassiveTooltipText, getPassiveTooltipDescription: ctx.handlers.getPassiveTooltipDescription, describeReachablePassiveNode: ctx.handlers.describeReachablePassiveNode, describeBlockedPassiveNode: ctx.handlers.describeBlockedPassiveNode, voidCraftUi: { effectHtml: ctx.handlers.effectHtml, panelHtml: ctx.handlers.panelHtml, toggleTarget: ctx.handlers.toggleTarget, openPicker: ctx.handlers.openPicker, showGroup: ctx.handlers.showGroup, toggleRun: ctx.handlers.toggleRun, stopRun: ctx.handlers.stopRun } };
  }

  // modules/passive-tree-ui-classic.mjs
  var passiveTreeUi = createPassiveTreeView({
    get passiveNodePresentation() {
      return window.GameModules.passiveScene.nodes;
    },
    get VOID_PASSIVE_OPTION_POOL() {
      return VOID_PASSIVE_OPTION_POOL;
    },
    get getVoidPassiveCraft() {
      return typeof getVoidPassiveCraft === "undefined" ? void 0 : getVoidPassiveCraft;
    },
    get getVoidPassiveEffectLabel() {
      return getVoidPassiveEffectLabel;
    },
    get passiveRouting() {
      return passiveRouting;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getVoidLinkScale() {
      return getVoidLinkScale;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatVoidPassiveStatLine() {
      return formatVoidPassiveStatLine;
    },
    get _t() {
      return _t;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get document() {
      return document;
    },
    get rollMagicBudOnVoid() {
      return rollMagicBudOnVoid;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get showGameToast() {
      return showGameToast;
    },
    get addLog() {
      return addLog;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get getStatName() {
      return getStatName;
    },
    get getPassiveVisibility() {
      return typeof getPassiveVisibility === "undefined" ? void 0 : getPassiveVisibility;
    },
    get markPassiveRenderCacheDirty() {
      return typeof markPassiveRenderCacheDirty === "undefined" ? void 0 : markPassiveRenderCacheDirty;
    },
    get resizePassiveTreeCanvas() {
      return resizePassiveTreeCanvas;
    },
    get drawPassiveTree() {
      return drawPassiveTree;
    },
    get hasAuthoredPassiveKeystone() {
      return hasAuthoredPassiveKeystone;
    },
    get getVirtualVoidPassiveCount() {
      return getVirtualVoidPassiveCount;
    },
    get ensurePassiveSpecializationState() {
      return typeof ensurePassiveSpecializationState === "undefined" ? void 0 : ensurePassiveSpecializationState;
    },
    get formatValue() {
      return formatValue;
    },
    get getPassiveConstellationAwakeningProgress() {
      return typeof getPassiveConstellationAwakeningProgress === "undefined" ? void 0 : getPassiveConstellationAwakeningProgress;
    },
    get P_STATS() {
      return P_STATS;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get getEffectivePassiveNodeEffects() {
      return getEffectivePassiveNodeEffects;
    },
    get getTranscendentVoidPassiveStats() {
      return getTranscendentVoidPassiveStats;
    },
    get TRANSCENDENT_VOID_PASSIVE_DB() {
      return typeof TRANSCENDENT_VOID_PASSIVE_DB === "undefined" ? void 0 : TRANSCENDENT_VOID_PASSIVE_DB;
    },
    get getAllocatedPassiveStatValue() {
      return typeof getAllocatedPassiveStatValue === "undefined" ? void 0 : getAllocatedPassiveStatValue;
    },
    get findAllocatedPassiveKeystone() {
      return typeof findAllocatedPassiveKeystone === "undefined" ? void 0 : findAllocatedPassiveKeystone;
    },
    get getPassiveWisdomElementFromNodeIds() {
      return getPassiveWisdomElementFromNodeIds;
    },
    get setPassiveRevelation() {
      return typeof setPassiveRevelation === "undefined" ? void 0 : setPassiveRevelation;
    },
    get syncPassiveAttributePreferenceControls() {
      return window.syncPassiveAttributePreferenceControls;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getPaidPassiveNodeIds() {
      return getPaidPassiveNodeIds;
    },
    get shopView() {
      return shopView;
    },
    get calculateReachableNodes() {
      return calculateReachableNodes;
    },
    get refreshPassiveVisibility() {
      return refreshPassiveVisibility;
    },
    get normalizeSupportLoadout() {
      return normalizeSupportLoadout;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get ensurePassiveTreePlannerState() {
      return typeof ensurePassiveTreePlannerState === "undefined" ? void 0 : ensurePassiveTreePlannerState;
    },
    get setActivePassiveTreePreset() {
      return setActivePassiveTreePreset;
    },
    get saveCurrentPassiveTreePreset() {
      return saveCurrentPassiveTreePreset;
    },
    get setPassiveTreeAutoInvest() {
      return setPassiveTreeAutoInvest;
    },
    get runPassiveTreeAutoInvest() {
      return runPassiveTreeAutoInvest;
    },
    get encodePassiveTreePreset() {
      return encodePassiveTreePreset;
    },
    get navigator() {
      return navigator;
    },
    get importPassiveTreePreset() {
      return importPassiveTreePreset;
    },
    get pickParticle() {
      return pickParticle;
    },
    get canRefundPassiveNode() {
      return typeof canRefundPassiveNode === "undefined" ? void 0 : canRefundPassiveNode;
    },
    get applyVoidPassiveCurrency() {
      return applyVoidPassiveCurrency;
    },
    get formatTranscendentVoidPassive() {
      return formatTranscendentVoidPassive;
    },
    get refundPassiveNode() {
      return refundPassiveNode;
    },
    get getChameleonChoices() {
      return getChameleonChoices;
    },
    get convertChameleonVoidPassive() {
      return convertChameleonVoidPassive;
    }
  });
  var { getPassiveTreeSearchState: getPassiveTreeSearchState2, getPassiveNodeSearchMatch: getPassiveNodeSearchMatch2, setPassiveTreeSearchState: setPassiveTreeSearchState2, renderPassiveSpecializationControls: renderPassiveSpecializationControls2, onPassiveRevelationChanged: onPassiveRevelationChanged2, renderPassiveInvestmentSummary: renderPassiveInvestmentSummary2, togglePassiveInvestmentSummary: togglePassiveInvestmentSummary2, syncPassiveTreeHeader: syncPassiveTreeHeader2, resetPassiveTreeByGoldenRule: resetPassiveTreeByGoldenRule2, renderPassiveTreePlannerPanel: renderPassiveTreePlannerPanel2, selectPassiveTreePresetSlot: selectPassiveTreePresetSlot2, savePassiveTreePresetFromUi: savePassiveTreePresetFromUi2, togglePassiveTreeAutoInvest: togglePassiveTreeAutoInvest2, togglePassiveTreeLabels: togglePassiveTreeLabels2, copyPassiveTreePresetCode: copyPassiveTreePresetCode2, importPassiveTreePresetFromUi: importPassiveTreePresetFromUi2, setupPassiveTreeSearchControls: setupPassiveTreeSearchControls2, closeVoidPassiveCraftOverlay: closeVoidPassiveCraftOverlay2, craftVoidPassiveFromOverlay: craftVoidPassiveFromOverlay2, refundVoidPassiveFromOverlay: refundVoidPassiveFromOverlay2, askRefundPassiveNode: askRefundPassiveNode2, convertChameleonFromOverlay: convertChameleonFromOverlay2, openVoidPassiveCraftOverlay: openVoidPassiveCraftOverlay2, normalizePassiveTooltipText: normalizePassiveTooltipText2, getPassiveTooltipDescription: getPassiveTooltipDescription2, describeReachablePassiveNode: describeReachablePassiveNode2, describeBlockedPassiveNode: describeBlockedPassiveNode2, voidCraftUi } = passiveTreeUi;
  safeExposeGlobals({ getPassiveTreeSearchState: getPassiveTreeSearchState2, getPassiveNodeSearchMatch: getPassiveNodeSearchMatch2, setPassiveTreeSearchState: setPassiveTreeSearchState2, renderPassiveSpecializationControls: renderPassiveSpecializationControls2, onPassiveRevelationChanged: onPassiveRevelationChanged2, renderPassiveInvestmentSummary: renderPassiveInvestmentSummary2, togglePassiveInvestmentSummary: togglePassiveInvestmentSummary2, syncPassiveTreeHeader: syncPassiveTreeHeader2, resetPassiveTreeByGoldenRule: resetPassiveTreeByGoldenRule2, renderPassiveTreePlannerPanel: renderPassiveTreePlannerPanel2, selectPassiveTreePresetSlot: selectPassiveTreePresetSlot2, savePassiveTreePresetFromUi: savePassiveTreePresetFromUi2, togglePassiveTreeAutoInvest: togglePassiveTreeAutoInvest2, togglePassiveTreeLabels: togglePassiveTreeLabels2, copyPassiveTreePresetCode: copyPassiveTreePresetCode2, importPassiveTreePresetFromUi: importPassiveTreePresetFromUi2, setupPassiveTreeSearchControls: setupPassiveTreeSearchControls2, closeVoidPassiveCraftOverlay: closeVoidPassiveCraftOverlay2, craftVoidPassiveFromOverlay: craftVoidPassiveFromOverlay2, refundVoidPassiveFromOverlay: refundVoidPassiveFromOverlay2, askRefundPassiveNode: askRefundPassiveNode2, convertChameleonFromOverlay: convertChameleonFromOverlay2, openVoidPassiveCraftOverlay: openVoidPassiveCraftOverlay2, normalizePassiveTooltipText: normalizePassiveTooltipText2, getPassiveTooltipDescription: getPassiveTooltipDescription2, describeReachablePassiveNode: describeReachablePassiveNode2, describeBlockedPassiveNode: describeBlockedPassiveNode2, voidCraftUi });
})();
