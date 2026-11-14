// GENERATED from modules/ascendancy-tree-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowMatchMedia = (...args) => globalThis.matchMedia(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);

  // modules/ui/ascend-tree-data.mjs
  var ROWS = /* @__PURE__ */ Object.freeze([["n1"], ["n2", "n3"], ["n4", "n5", "n6"], ["n7", "n8", "n9"], ["n10"], ["n11", "n12"], ["n13a", "n13b", "n13c", "n13d"]]);
  var RANK = /* @__PURE__ */ Object.freeze({ n10: "궁극 노드", n11: "4차 핵심", n12: "4차 핵심", n13a: "재능 특화", n13b: "재능 특화", n13c: "전직 특화", n13d: "전직 특화" });
  var ICONS = /* @__PURE__ */ Object.freeze({
    pctDmg: "sword",
    flatDmg: "sword",
    meleePctDmg: "sword",
    physPctDmg: "sword",
    slamPctDmg: "sword",
    attackPctDmg: "sword",
    elementalPctDmg: "flame",
    firePctDmg: "flame",
    coldPctDmg: "drop",
    lightPctDmg: "up",
    chaosPctDmg: "drop",
    dotPctDmg: "flame",
    spellPctDmg: "star",
    projectilePctDmg: "reticle",
    aoePctDmg: "split",
    summonPctDmg: "fork",
    summonHpPct: "heart",
    pctHp: "heart",
    flatHp: "heart",
    regen: "drop",
    leech: "leech",
    dr: "shield",
    armor: "shield",
    armorPct: "shield",
    evasion: "boot",
    evasionPct: "boot",
    energyShield: "shield",
    resAll: "shield",
    resChaos: "shield",
    blockChance: "shield",
    aspd: "speed",
    ds: "speed",
    move: "boot",
    crit: "crit",
    critDmg: "eye",
    resPen: "pierce",
    physIgnore: "physIgnore",
    suppCap: "star"
  });
  var NODE_TEXT = /* @__PURE__ */ Object.freeze({ taken: "할당", open: "할당 가능", nopoint: "포인트 없음", locked: "선행 노드 필요", closed: "짝 노드를 할당해 닫힘", future: "아직 열리지 않음" });
  var KEYSTONE_TEXT = /* @__PURE__ */ Object.freeze({ taken: "할당", open: "할당 가능", nopoint: "키스톤 포인트 없음", full: "5개 모두 할당", locked: "선행 키스톤 필요", fifth: "5차 전직 필요" });
  var ROW_LABEL = /* @__PURE__ */ Object.freeze({ n10: "궁극", n11: "4차 핵심", n13a: "특화" });
  var KEYSTONE_HALF_WIDTH = 14;
  var NODE_ACTIONS = /* @__PURE__ */ Object.freeze({ taken: "반환", open: "할당" });
  var KEYSTONE_ACTIONS = /* @__PURE__ */ Object.freeze({ taken: "반환", open: "할당" });
  var KEYSTONE_ART = /* @__PURE__ */ Object.freeze([
    ["소환", "summon"],
    ["카오스", "chaos"],
    ["화염", "fire"],
    ["점화", "ignite"],
    ["냉기", "cold"],
    ["동결", "freeze"],
    ["냉각", "chill"],
    ["번개", "lightning"],
    ["감전", "shock"],
    ["중독", "poison"],
    ["출혈", "bleed"],
    ["지속", "damageOverTime"],
    ["투사체", "projectile"],
    ["강타", "slam"],
    ["근접", "blade"],
    ["주문", "spell"],
    ["에너지", "energyShield"],
    ["ES", "energyShield"],
    ["회피", "evasion"],
    ["막기", "shield"],
    ["방어", "armor"],
    ["생명력", "life"],
    ["재생", "life"],
    ["흡수", "life"],
    ["이동", "wind"],
    ["공격 속도", "precision"],
    ["치명타", "critical"],
    ["원소", "elemental"],
    ["저항", "elemental"],
    ["물리", "blade"],
    ["연속", "cycle"],
    ["보조스킬룬", "arcane"],
    ["룬", "arcane"]
  ]);

  // modules/ui/ascend-tree-common.mjs
  var ascendTreeIconOf = (stat) => ICONS[stat] || "star";
  var ascendTreeEsc = (runtime, value) => runtime.deps.escapeHTML(String(value));
  var ascendTreeStatName = (runtime, stat) => String(runtime.deps._t(runtime.deps.P_STATS[stat] && runtime.deps.P_STATS[stat].name || runtime.deps.getStatName(stat))).replace(/\s*\(%\)$/, "");
  var ascendTreePercent = (runtime, stat) => !!(runtime.deps.P_STATS[stat] && runtime.deps.P_STATS[stat].isPct);
  var ascendTreeLinesOf = (node) => node && Array.isArray(node.stats) ? node.stats : node && node.stat ? [{ stat: node.stat, val: node.val }] : [];
  function ascendTreeLineText(runtime, line) {
    if (line.stat === "suppCap") return runtime.deps._t("보조스킬룬 장착 한도 +1");
    return `${ascendTreeStatName(runtime, line.stat)} +${runtime.deps.formatValue(line.stat, line.val)}${ascendTreePercent(runtime, line.stat) ? "%" : ""}`;
  }
  var ascendTreeShortValue = (runtime, line) => line.stat === "suppCap" ? "+1" : `+${runtime.deps.formatValue(line.stat, line.val)}${ascendTreePercent(runtime, line.stat) ? "%" : ""}`;
  var ascendTreeReqIds = (req) => Array.isArray(req) ? req : req ? [req] : [];
  var ascendTreeTouchOnly = (runtime) => typeof runtime.deps.matchMedia === "function" && !runtime.deps.matchMedia("(hover: hover)").matches;
  function ascendTreeLayout(rows) {
    const at = /* @__PURE__ */ new Map();
    rows.forEach((ids, row) => ids.forEach((id, index) => at.set(id, { x: (index + 1) * 100 / (ids.length + 1), y: (row + 0.5) * 100 / rows.length })));
    return at;
  }
  function ascendTreeLinkHtml(points, state) {
    return `<polyline class="is-${state}" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" vector-effect="non-scaling-stroke"></polyline>`;
  }
  function ascendTreeArtHtml(runtime, family) {
    const cell = runtime.deps.passiveNodes.iconAtlasCell[family] || runtime.deps.passiveNodes.iconAtlasCell.constellation;
    return `<span class="ascend-socket"><span class="ascend-art" style="--cx:${cell[0]};--cy:${cell[1]}"></span></span>`;
  }
  var ascendTreeStatFamily = (runtime, stat) => runtime.deps.passiveNodes.iconFamily[stat] || (stat ? "arcane" : "constellation");
  function ascendTreeKeystoneFamily(desc) {
    const text = String(desc || "");
    const found = KEYSTONE_ART.map(([word, family]) => [text.indexOf(word), family]).filter(([at]) => at >= 0).sort((a, b) => a[0] - b[0]);
    return found.length ? found[0][1] : "constellation";
  }
  var ascendTreeLinkState = (a, b) => a === "taken" && b === "taken" ? "done" : a === "taken" ? "lit" : "dim";
  var ascendTreeKeystoneReqs = (k) => [k.req, ...Array.isArray(k.reqAny) ? k.reqAny : []].filter(Boolean);
  function ascendTreeKeystoneRows(defs) {
    const ids = new Set(defs.map((k) => k.id)), depth = new Map(defs.map((k) => [k.id, 0]));
    for (let pass = 0; pass < defs.length; pass++) {
      defs.forEach((k) => {
        const reqs = ascendTreeKeystoneReqs(k).filter((id) => ids.has(id));
        if (reqs.length) depth.set(k.id, 1 + Math.max(...reqs.map((id) => depth.get(id))));
      });
    }
    const last = Math.max(0, ...depth.values()) + 1, rows = [];
    defs.forEach((k) => {
      const d = k.fifthJobOnly ? last : depth.get(k.id);
      (rows[d] = rows[d] || []).push(k.id);
    });
    return rows.filter(Boolean);
  }
  var ascendTreeCanTake = (state) => state === "open" || state === "nopoint";
  var ascendTreeDetailHead = (runtime, title, stateText, state) => `<p class="ascend-detail-head"><strong>${ascendTreeEsc(runtime, title)}</strong><small class="is-${state}">${ascendTreeEsc(runtime, stateText)}</small>
        <button type="button" class="ascend-detail-close" data-ascend-action="clear">${runtime.deps._t("닫기")}</button></p>`;
  var ascendTreeActionHtml = (runtime, label) => label ? `<button type="button" class="ascend-detail-act" data-ascend-action="act">${ascendTreeEsc(runtime, label)}</button>` : "";
  function ascendTreePreviewHtml(runtime, field, id, verb) {
    const parts = runtime.deps.buildStatPreviewParts(runtime.deps.previewBuildStats((copy) => {
      copy[field] = [...copy[field] || [], id];
    }));
    return parts ? `<p class="ascend-preview">${verb} ${parts}</p>` : "";
  }
  function ascendTreeScrollerOf(runtime, el) {
    for (let at = el.parentElement; at; at = at.parentElement) {
      if (/auto|scroll/.test(runtime.deps.getComputedStyle(at).overflowY) && at.scrollHeight > at.clientHeight) return at;
    }
    return runtime.deps.document.scrollingElement;
  }

  // modules/ui/ascend-tree-nodes.mjs
  function ascendTreeFullTree(runtime, cls) {
    const tree = { ...runtime.deps.getClassTreeDef(cls) }, defs = runtime.deps.ASCENDANCY_NODE_DEFS[cls] || {};
    const pair = (ids, lines, req, future) => ids.forEach((id, index) => {
      if (!tree[id]) tree[id] = { ...lines ? { stat: lines[index].stat, val: lines[index].val } : {}, req, exclusive: ids[1 - index], future };
    });
    pair(["n11", "n12"], defs.core || runtime.deps.ASCENDANCY_NODE_FALLBACK.core, "n10", "4차 전직 시련을 처음 통과하면 열립니다.");
    pair(["n13a", "n13b"], null, ["n11", "n12"], "재능 개화(5차 전직)를 하면 그 재능의 특화 둘이 열립니다.");
    pair(["n13c", "n13d"], defs.job || runtime.deps.ASCENDANCY_NODE_FALLBACK.job, ["n11", "n12"], "재능 개화(5차 전직)를 하면 열립니다.");
    return tree;
  }
  function ascendTreeNodeState(runtime, node, id) {
    if (node.future) return "future";
    if (runtime.deps.game.ascendNodes.includes(id)) return "taken";
    if (node.exclusive && runtime.deps.game.ascendNodes.includes(node.exclusive)) return "closed";
    if (!runtime.deps.isAscendNodeRequirementMet(node)) return "locked";
    return runtime.deps.game.ascendPoints > 0 ? "open" : "nopoint";
  }
  function ascendTreeNodeClass(runtime, id, state, tight) {
    const focused = runtime.focus && runtime.focus.kind === "node" && runtime.focus.id === id;
    return `ascend-node is-${state}${RANK[id] ? " is-major" : ""}${id === "n10" ? " is-peak" : ""}${tight ? " is-tight" : ""}${focused ? " is-focus" : ""}`;
  }
  function ascendTreeNodeButton(runtime, id, node, pos, options) {
    const { state, tight } = options;
    const lines = ascendTreeLinesOf(node), first = (lines[0] || {}).stat, label = lines.length ? ascendTreeShortValue(runtime, lines[0]) : "?";
    const stat = lines.length ? ascendTreeStatName(runtime, first) : runtime.deps._t("재능 특화"), name = `${RANK[id] ? runtime.deps._t(RANK[id]) : stat}, ${runtime.deps._t(NODE_TEXT[state])}`;
    return `<button type="button" class="${ascendTreeNodeClass(runtime, id, state, tight)}" style="--x:${pos.x}%;--y:${pos.y}%;--tone:${runtime.deps.getItemStatToneColor(first)}"
            aria-label="${ascendTreeEsc(runtime, name)}" aria-pressed="${state === "taken"}" data-ascend-kind="node" data-ascend-id="${id}"
            data-info-tooltip-anchor="1">${ascendTreeArtHtml(runtime, ascendTreeStatFamily(runtime, first))}<span class="ascend-plate"><b>${ascendTreeEsc(runtime, label)}</b><span class="ascend-node-name">${ascendTreeEsc(runtime, stat)}</span></span></button>`;
  }
  function ascendTreeLinkSources(tree, rows, at, id) {
    const reqs = ascendTreeReqIds(tree[id].req).filter((req) => at.has(req)), key = reqs.join(",");
    const row = rows.find((ids) => ids.includes(id)) || [];
    if (reqs.length < 2 || row.filter((other) => ascendTreeReqIds(tree[other].req).join(",") === key).length < 2) return reqs;
    const x = at.get(id).x;
    return [reqs.reduce((best, req) => Math.abs(at.get(req).x - x) < Math.abs(at.get(best).x - x) ? req : best)];
  }
  function ascendTreeNodeGraphHtml(runtime, tree) {
    const rows = ROWS.map((ids) => ids.filter((id) => tree[id])).filter((ids) => ids.length), at = ascendTreeLayout(rows);
    const states = new Map([...at.keys()].map((id) => [id, ascendTreeNodeState(runtime, tree[id], id)]));
    const links = [...at.keys()].flatMap((id) => ascendTreeLinkSources(tree, rows, at, id).map((req) => ascendTreeLinkHtml([at.get(req), at.get(id)], ascendTreeLinkState(states.get(req), states.get(id)))));
    const tight = new Set(rows.filter((ids) => ids.length > 3).flat());
    const buttons = [...at.keys()].map((id) => ascendTreeNodeButton(runtime, id, tree[id], at.get(id), { state: states.get(id), tight: tight.has(id) }));
    const labels = rows.map((ids) => ids.find((id) => ROW_LABEL[id])).filter(Boolean).map((id) => `<span class="ascend-row-label" style="--y:${at.get(id).y}%">${ascendTreeEsc(runtime, runtime.deps._t(ROW_LABEL[id]))}</span>`);
    return `<div class="ascend-graph" style="--rows:${rows.length}"><svg class="ascend-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links.join("")}</svg>${labels.join("")}${buttons.join("")}</div>`;
  }

  // modules/ui/ascend-tree-keystones.mjs
  function ascendTreeKeystoneState(runtime, k) {
    if (runtime.deps.game.ascendKeystones.includes(k.id)) return "taken";
    if (k.fifthJobOnly && !runtime.deps.isAscendKeystoneRequirementMet(k)) return "fifth";
    if (!runtime.deps.isAscendKeystoneRequirementMet(k)) return "locked";
    if (runtime.deps.game.ascendKeystones.length >= runtime.deps.CLASS_KEYSTONE_PICK_LIMIT) return "full";
    return Math.floor(runtime.deps.game.ascendKeystonePoints || 0) > 0 ? "open" : "nopoint";
  }
  function ascendTreeKeystoneButton(runtime, k, pos, state) {
    const focused = runtime.focus && runtime.focus.kind === "keystone" && runtime.focus.id === k.id ? " is-focus" : "";
    return `<button type="button" class="ascend-node ascend-keystone is-${state}${focused}" style="--x:${pos.x}%;--y:${pos.y}%"
            aria-label="${ascendTreeEsc(runtime, `${runtime.deps._t(k.name)}, ${runtime.deps._t(KEYSTONE_TEXT[state])}`)}" aria-pressed="${state === "taken"}" data-ascend-kind="keystone" data-ascend-id="${k.id}"
            data-info-tooltip-anchor="1">${ascendTreeArtHtml(runtime, ascendTreeKeystoneFamily(k.desc))}<span class="ascend-plate"><span class="ascend-node-name">${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</span></span></button>`;
  }
  function ascendTreeKeystoneSpots(defs) {
    const fifth = defs.filter((k) => k.fifthJobOnly).map((k) => k.id);
    const rows = ascendTreeKeystoneRows(defs).map((ids) => ids.filter((id) => !fifth.includes(id))).filter((ids) => ids.length);
    const spots = /* @__PURE__ */ new Map();
    rows.forEach((ids, row) => ids.forEach((id, index) => {
      const reqs = ascendTreeKeystoneReqs(defs.find((k) => k.id === id)).filter((req) => spots.has(req)).map((req) => spots.get(req).x);
      const x = reqs.length ? reqs.reduce((sum, value) => sum + value, 0) / reqs.length : (index + 0.5) * 100 / ids.length;
      spots.set(id, { x, row });
    }));
    const last = rows.length - 1, taken = [...spots.values()].filter((spot) => spot.row === last).map((spot) => spot.x);
    const clearance = (x) => Math.min(...taken.map((other) => Math.abs(other - x)), 100);
    const column = [100 / 6, 50, 500 / 6].reduce((best, x) => clearance(x) > clearance(best) ? x : best);
    const beside = clearance(column) >= KEYSTONE_HALF_WIDTH * 2;
    fifth.forEach((id) => spots.set(id, beside ? { x: column, row: last } : { x: 50, row: last + 1 }));
    const count = rows.length + (fifth.length && !beside ? 1 : 0);
    spots.forEach((spot) => {
      spot.y = (spot.row + 0.5) * 100 / count;
    });
    return { spots, rows: count };
  }
  function ascendTreeKeystoneLinkPoints(from, to, spots) {
    const points = [from];
    const span = to.row - from.row, reach = Math.abs(to.y - from.y) / span * 0.48;
    for (let row = from.row + 1; row < to.row; row++) {
      const y = from.y + (to.y - from.y) * (row - from.row) / span;
      const xAt = (at) => from.x + (to.x - from.x) * (at - from.y) / (to.y - from.y);
      const straight = xAt(y), passes = [xAt(y - reach), straight, xAt(y + reach)];
      const inRow = [...spots.values()].filter((spot) => spot.row === row).map((spot) => spot.x).sort((a, b) => a - b);
      if (!inRow.some((x2) => passes.some((pass) => Math.abs(x2 - pass) < KEYSTONE_HALF_WIDTH))) continue;
      const gaps = [...inRow, 100].map((x2, index) => (x2 + [0, ...inRow][index]) / 2);
      const x = gaps.reduce((best, gap) => Math.abs(gap - straight) < Math.abs(best - straight) ? gap : best);
      points.push({ x, y: y - reach }, { x, y: y + reach });
    }
    return [...points, to];
  }
  function ascendTreeKeystoneGraphHtml(runtime, defs) {
    if (!defs.length) return '<p class="ascend-muted">이 전직에는 키스톤이 없습니다.</p>';
    const { spots, rows } = ascendTreeKeystoneSpots(defs);
    const states = new Map(defs.map((k) => [k.id, ascendTreeKeystoneState(runtime, k)]));
    const links = defs.flatMap((k) => ascendTreeKeystoneReqs(k).filter((id) => spots.has(id)).map((id) => ascendTreeLinkHtml(ascendTreeKeystoneLinkPoints(spots.get(id), spots.get(k.id), spots), ascendTreeLinkState(states.get(id), states.get(k.id)))));
    const buttons = defs.map((k) => ascendTreeKeystoneButton(runtime, k, spots.get(k.id), states.get(k.id)));
    return `<div class="ascend-graph is-keystones" style="--rows:${rows}"><svg class="ascend-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links.join("")}</svg>${buttons.join("")}</div>`;
  }

  // modules/ui/ascend-tree-details.mjs
  function ascendTreeNextPoints(runtime) {
    const done = Array.isArray(runtime.deps.game.completedTrials) ? runtime.deps.game.completedTrials : [];
    const trial = ["trial_1", "trial_2", "trial_3", "trial_4"].find((id) => !done.includes(id));
    if (trial) return runtime.deps._t("다음 포인트: {trial}차 전직 시련 첫 통과(노드 +{value}, 키스톤 +1)", { trial: trial.slice(-1), value: trial === "trial_4" ? 1 : 2 });
    return runtime.deps.game.bloomedClassThisLoop ? "이번 루프의 포인트를 모두 받았습니다." : "다음 포인트: 재능 개화(노드 +2, 키스톤 +1)";
  }
  function ascendTreeTotalsText(runtime, tree) {
    const sums = /* @__PURE__ */ new Map();
    runtime.deps.game.ascendNodes.forEach((id) => ascendTreeLinesOf(tree[id]).forEach((line) => sums.set(line.stat, (sums.get(line.stat) || 0) + Number(line.val || 0))));
    return [...sums].map(([stat, val]) => ascendTreeLineText(runtime, { stat, val })).join(", ");
  }
  function ascendTreeSummaryHtml(runtime, cls, tree) {
    const template = runtime.deps.CLASS_TEMPLATES[cls], total = ascendTreeTotalsText(runtime, tree), ks = runtime.deps.game.ascendKeystones.length;
    return `<div class="ascend-summary"><div class="ascend-summary-name"><strong>${ascendTreeEsc(runtime, runtime.deps._t(template.name))}</strong><span>${ascendTreeEsc(runtime, runtime.deps._t(template.desc))}</span></div>
            <div class="ascend-summary-chips"><span class="is-node">${runtime.deps._t("노드 포인트")} <b>${Math.max(0, Math.floor(runtime.deps.game.ascendPoints || 0))}</b></span>
            <span class="is-key">${runtime.deps._t("키스톤")} <b>${ks}/${runtime.deps.CLASS_KEYSTONE_PICK_LIMIT}</b>${runtime.deps._t(", 포인트")} <b>${Math.max(0, Math.floor(runtime.deps.game.ascendKeystonePoints || 0))}</b></span>
            <span class="is-taken">${runtime.deps._t("할당한 노드")} <b>${runtime.deps.game.ascendNodes.length}</b></span>
            ${runtime.deps.game.ascendNodes.length ? `<button type="button" class="ascend-reset" data-ascend-action="reset-nodes">${runtime.deps._t("노드 초기화")}</button>` : ""}</div>
            <p class="ascend-muted">${runtime.deps._t("{nextPoints}. 이번 루프의 노드 포인트는 최대 9점이라 전부 할당할 수는 없습니다.", { nextPoints: ascendTreeEsc(runtime, ascendTreeNextPoints(runtime)) })}</p>
            ${total ? `<p class="ascend-total">${runtime.deps._t("합계: {html}", { html: runtime.deps.statToneText.html(total) })}</p>` : ""}${runtime.deps.getAscendancyPlanContinueHtml()}</div>`;
  }
  function ascendTreeNodeNote(runtime, tree, id) {
    const node = tree[id];
    if (!node) return "";
    const state = ascendTreeNodeState(runtime, node, id), lines = ascendTreeLinesOf(node);
    const body = lines.length ? lines.map((line) => `<span style="color:${runtime.deps.getItemStatToneColor(line.stat)}">${ascendTreeEsc(runtime, ascendTreeLineText(runtime, line))}</span>`).join("<br>") : runtime.deps._t("개화한 재능에 따라 정해집니다.");
    return `${ascendTreeDetailHead(runtime, runtime.deps._t(RANK[id] || "전직 노드"), runtime.deps._t(NODE_TEXT[state]), state)}<p class="ascend-detail-lines">${body}</p>
            ${ascendTreeCanTake(state) ? ascendTreePreviewHtml(runtime, "ascendNodes", id, runtime.deps._t("할당하면")) : ""}<p class="ascend-detail-advice">${ascendTreeEsc(runtime, ascendTreeNodeAdvice(runtime, tree, node, id, state))}</p>${ascendTreeActionHtml(runtime, NODE_ACTIONS[state] && runtime.deps._t(NODE_ACTIONS[state]))}`;
  }
  function ascendTreeNodeAdvice(runtime, tree, node, id, state) {
    if (state === "future") return node.future;
    if (state === "taken") return runtime.deps._t("다시 누르면 반환합니다(마름병 포자 1개, 이 노드를 선행으로 둔 노드가 없을 때).");
    if (state === "closed") return runtime.deps._t("둘 중 하나만 할당할 수 있습니다. 짝 노드를 반환하면 할당할 수 있습니다.");
    if (state === "locked") return runtime.deps._t("선행 노드 필요: {list}", { list: ascendTreeReqIds(node.req).map((req) => ascendTreeLinesOf(tree[req]).map((...args) => ascendTreeLineText(runtime, ...args)).join(", ")).join(runtime.deps._t(" 또는 ")) });
    if (state === "nopoint") return runtime.deps._t("전직 포인트가 없습니다. {nextPoints}.", { nextPoints: ascendTreeNextPoints(runtime) });
    return runtime.deps._t("{value} 할당합니다{value2}.", { value: ascendTreeTouchOnly(runtime) ? runtime.deps._t("한 번 더 누르면") : runtime.deps._t("누르면"), value2: node.exclusive ? runtime.deps._t("(짝 노드와 둘 중 하나)") : "" });
  }
  function ascendTreeKeystoneNote(runtime, defs, id) {
    const k = defs.find((row) => row.id === id);
    if (!k) return "";
    const state = ascendTreeKeystoneState(runtime, k), names = ascendTreeKeystoneReqs(k).map((req) => (defs.find((row) => row.id === req) || {}).name).filter(Boolean);
    const advice = {
      taken: runtime.deps._t("다시 누르면 반환합니다(마름병 포자 1개, 이 키스톤을 선행으로 둔 키스톤이 없을 때)."),
      fifth: runtime.deps._t("재능 개화(5차 전직)를 하면 할당할 수 있습니다."),
      locked: runtime.deps._t("선행 키스톤 필요: {names}", { names: names.map((name) => runtime.deps._t(name)).join(Array.isArray(k.reqAny) ? runtime.deps._t(" 또는 ") : ", ") }),
      full: runtime.deps._t("키스톤은 {value}개까지 할당할 수 있습니다. 하나를 반환하면 바꿀 수 있습니다.", { value: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT }),
      nopoint: runtime.deps._t("키스톤 포인트가 없습니다. 전직 시련을 처음 통과할 때마다 1점씩 받습니다."),
      open: runtime.deps._t("{value} 할당합니다.", { value: ascendTreeTouchOnly(runtime) ? runtime.deps._t("한 번 더 누르면") : runtime.deps._t("누르면") })
    }[state];
    return `${ascendTreeDetailHead(runtime, runtime.deps._t(k.name), runtime.deps._t(KEYSTONE_TEXT[state]), state)}<p class="ascend-detail-lines">${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</p>
            ${ascendTreeCanTake(state) ? ascendTreePreviewHtml(runtime, "ascendKeystones", id, runtime.deps._t("할당하면")) : ""}<p class="ascend-detail-advice">${ascendTreeEsc(runtime, advice)}</p>${ascendTreeActionHtml(runtime, KEYSTONE_ACTIONS[state] && runtime.deps._t(KEYSTONE_ACTIONS[state]))}`;
  }
  function ascendTreeDetailBody(runtime, tree, defs) {
    const body = runtime.shown ? runtime.shown.kind === "node" ? ascendTreeNodeNote(runtime, tree, runtime.shown.id) : ascendTreeKeystoneNote(runtime, defs, runtime.shown.id) : "";
    return body || '<p class="ascend-muted">노드나 키스톤을 가리키거나 누르면 효과와 할 수 있는 일이 여기에 나옵니다.</p>';
  }
  function ascendTreeTipHtml(runtime, kind, id, tree, defs) {
    if (kind === "keystone") {
      const k = defs.find((row) => row.id === id);
      return k ? `<div class="tooltip-title">${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</div><div class="tooltip-line">${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</div><div class="tooltip-line" style="color:#b3a58c;">${ascendTreeEsc(runtime, runtime.deps._t(KEYSTONE_TEXT[ascendTreeKeystoneState(runtime, k)]))}</div>` : "";
    }
    const node = tree[id];
    if (!node) return "";
    const lines = ascendTreeLinesOf(node), body = lines.length ? lines.map((line) => `<span style="color:${runtime.deps.getItemStatToneColor(line.stat)}">${ascendTreeEsc(runtime, ascendTreeLineText(runtime, line))}</span>`).join("<br>") : runtime.deps._t("개화한 재능에 따라 정해집니다.");
    return `<div class="tooltip-title">${ascendTreeEsc(runtime, runtime.deps._t(RANK[id] || "전직 노드"))}</div><div class="tooltip-line">${body}</div><div class="tooltip-line" style="color:#b3a58c;">${ascendTreeEsc(runtime, runtime.deps._t(NODE_TEXT[ascendTreeNodeState(runtime, node, id)]))}</div>`;
  }

  // modules/ui/loop-investment-session.mjs
  function captureInvestmentSession(runtime) {
    const owner = runtime.deps.game;
    return {
      owner,
      season: owner.season,
      loop: owner.loopCount,
      selectedClass: owner.selectedClassId,
      ascendClass: owner.ascendClass
    };
  }
  function investmentSessionIsCurrent(runtime, session) {
    const owner = runtime.deps.game;
    return runtime.active && session.owner === owner && session.season === owner.season && session.loop === owner.loopCount && session.selectedClass === owner.selectedClassId && session.ascendClass === owner.ascendClass;
  }

  // modules/ui/ascend-tree-actions.mjs
  function ascendTreeRender(runtime) {
    const box = runtime.deps.document.getElementById("ui-ascend-tree-container"), cls = runtime.deps.game.ascendClass;
    if (!box || !cls || !runtime.deps.CLASS_TEMPLATES[cls]) return;
    runtime.deps.rules.normalize(runtime.deps.game);
    const tree = ascendTreeFullTree(runtime, cls), defs = runtime.deps.getClassKeystoneDefs(cls);
    box.dataset.ascend = cls;
    box.innerHTML = `${ascendTreeSummaryHtml(runtime, cls, tree)}<div class="ascend-layout">
            <section class="ascend-board is-nodes" aria-label="${runtime.deps._t("전직 노드")}"><h3>${runtime.deps._t("전직 노드")}</h3>${ascendTreeNodeGraphHtml(runtime, tree)}</section>
            <section class="ascend-board is-keystones" aria-label="${runtime.deps._t("키스톤")}"><h3>${runtime.deps._t("키스톤")} <button type="button" class="ascend-reset" data-ascend-action="reset">${runtime.deps._t("키스톤 초기화")}</button></h3>${ascendTreeKeystoneGraphHtml(runtime, defs)}</section>
            <section class="ascend-detail${runtime.shown ? "" : " is-empty"}" aria-label="${runtime.deps._t("자세히")}" aria-live="polite">${ascendTreeDetailBody(runtime, tree, defs)}</section></div>`;
  }
  function ascendTreeHint(runtime, kind, id) {
    const card = runtime.deps.document.querySelector("#ui-ascend-tree-container .ascend-detail"), cls = runtime.deps.game.ascendClass;
    if (!card || !cls || ascendTreeTouchOnly(runtime)) return;
    runtime.shown = { kind, id };
    card.innerHTML = ascendTreeDetailBody(runtime, ascendTreeFullTree(runtime, cls), runtime.deps.getClassKeystoneDefs(cls));
    card.classList.remove("is-empty");
  }
  function ascendTreeTip(runtime, event, kind, id) {
    const cls = runtime.deps.game.ascendClass;
    if (!event || event.pointerType === "touch" || !cls || typeof runtime.deps.showInfoTooltipHtml !== "function") return;
    const html = ascendTreeTipHtml(runtime, kind, id, ascendTreeFullTree(runtime, cls), runtime.deps.getClassKeystoneDefs(cls));
    if (html) runtime.deps.showInfoTooltipHtml(event.clientX, event.clientY, html, runtime.deps.getComputedStyle(event.currentTarget).getPropertyValue("--asc") || "#c9a86a", `ascend:${kind}:${id}`);
  }
  function ascendTreePress(runtime, kind, id) {
    const again = !!runtime.focus && runtime.focus.kind === kind && runtime.focus.id === id;
    runtime.focus = { kind, id };
    runtime.shown = runtime.focus;
    if (!ascendTreeTouchOnly(runtime) || again) kind === "node" ? ascendTreeActOnNode(runtime, id) : ascendTreeActOnKeystone(runtime, id);
    ascendTreeRender(runtime);
    ascendTreeKeepFocusAboveCard(runtime);
  }
  function ascendTreeKeepFocusAboveCard(runtime) {
    if (runtime.scrollFrame !== null) runtime.deps.cancelAnimationFrame(runtime.scrollFrame);
    const session = captureInvestmentSession(runtime);
    runtime.scrollFrame = runtime.deps.requestAnimationFrame(() => {
      runtime.scrollFrame = null;
      if (!investmentSessionIsCurrent(runtime, session)) return;
      const box = runtime.deps.document.getElementById("ui-ascend-tree-container");
      const cell = box && box.querySelector(".ascend-node.is-focus"), card = box && box.querySelector(".ascend-detail");
      if (!cell || !card || runtime.deps.getComputedStyle(card).position !== "sticky") return;
      const scroller = ascendTreeScrollerOf(runtime, box), port = scroller === runtime.deps.document.scrollingElement ? runtime.deps.innerHeight : scroller.getBoundingClientRect().top + scroller.clientTop + scroller.clientHeight;
      const over = cell.getBoundingClientRect().bottom + 8 - (Math.min(port, runtime.deps.innerHeight) - card.getBoundingClientRect().height);
      if (over > 0) scroller.scrollBy({ top: over / (runtime.deps.uiDisplay.factor || 1) });
    });
  }
  function ascendTreeClear(runtime) {
    runtime.shown = null;
    runtime.focus = null;
    ascendTreeRender(runtime);
  }
  function ascendTreeAct(runtime) {
    if (!runtime.shown) return;
    if (runtime.shown.kind === "node") ascendTreeActOnNode(runtime, runtime.shown.id);
    else ascendTreeActOnKeystone(runtime, runtime.shown.id);
    ascendTreeRender(runtime);
  }
  function ascendTreeActOnNode(runtime, id) {
    const tree = ascendTreeFullTree(runtime, runtime.deps.game.ascendClass), node = tree[id], state = node ? ascendTreeNodeState(runtime, node, id) : "future";
    if (!node) return;
    if (state === "taken") return runtime.deps.askRefundAscendNode(id);
    if (state === "open") return runtime.deps.buyAscend(id);
    runtime.deps.addLog(ascendTreeNodeAdvice(runtime, tree, node, id, state), "attack-monster");
  }
  function ascendTreeActOnKeystone(runtime, id) {
    const k = runtime.deps.getClassKeystoneDefs(runtime.deps.game.ascendClass).find((row) => row.id === id);
    if (!k) return;
    const state = ascendTreeKeystoneState(runtime, k);
    if (state === "taken") return runtime.deps.refundAscendKeystone(id);
    if (state === "open") return runtime.deps.buyAscendKeystone(id);
    ascendTreeHint(runtime, "keystone", id);
  }

  // modules/ui/ascend-tree-pick.mjs
  function ascendTreeFocusStats(runtime, key) {
    const tree = runtime.deps.getClassTreeDef(key), stats = [];
    ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9"].forEach((id) => ascendTreeLinesOf(tree[id]).forEach((line) => {
      if (line.stat && !stats.includes(line.stat)) stats.push(line.stat);
    }));
    return stats.slice(0, 4);
  }
  function ascendTreePickCardHtml(runtime, key) {
    const template = runtime.deps.CLASS_TEMPLATES[key], defs = runtime.deps.getClassKeystoneDefs(key), stats = ascendTreeFocusStats(runtime, key);
    const chips = stats.map((stat) => `<span class="ascend-pick-chip">${runtime.deps.renderPixelIcon(ascendTreeIconOf(stat), "ascend-pick-chip-icon")}${ascendTreeEsc(runtime, ascendTreeStatName(runtime, stat))}</span>`).join("");
    const keys = (ascendTreeKeystoneRows(defs)[0] || []).map((id) => defs.find((k) => k.id === id)).filter(Boolean).map((k) => `<span class="ascend-pick-key"><b>${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</b><span>${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</span></span>`).join("");
    return `<button type="button" class="class-card ascend-pick-card" data-loop-class="${key}">
            <span class="ascend-pick-head">${runtime.deps.renderPixelIcon(ascendTreeIconOf(stats[0]), "ascend-pick-icon")}<strong>${ascendTreeEsc(runtime, runtime.deps._t(template.name))}</strong></span>
            <span class="ascend-pick-desc">${ascendTreeEsc(runtime, runtime.deps._t(template.desc))}</span>
            <span class="ascend-pick-section">${runtime.deps._t("노드")}</span><span class="ascend-pick-chips">${chips}</span>
            <span class="ascend-pick-section">${runtime.deps._t("첫 키스톤 ({length}개 가운데 {value}개 할당)", { length: defs.length, value: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT })}</span><span class="ascend-pick-keys">${keys}</span>
            <span class="ascend-pick-cta">${runtime.deps._t("이 전직 고르기")}</span></button>`;
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

  // modules/ui/ascend-tree-events.mjs
  function installAscendTreeEvents(runtime) {
    const host = runtime.deps.document.getElementById("ui-ascend-tree-container");
    if (!host) return;
    listenView(runtime, host, "click", (event) => {
      const cell = event.target.closest?.("[data-ascend-kind]");
      if (cell && host.contains(cell)) return runtime.handlers.press(cell.dataset.ascendKind, cell.dataset.ascendId);
      const action = event.target.closest?.("[data-ascend-action]");
      if (!action || !host.contains(action)) return;
      const commands = {
        clear: runtime.handlers.clear,
        act: runtime.handlers.act,
        reset: runtime.handlers.reset,
        "reset-nodes": runtime.handlers.resetNodes,
        "continue-plan": runtime.handlers.continuePlan
      };
      commands[action.dataset.ascendAction]?.();
    });
    listenView(runtime, host, "focusin", (event) => hintAscendCell(runtime, host, event));
    listenView(runtime, host, "mouseover", (event) => {
      const cell = event.target.closest?.("[data-ascend-kind]");
      if (cell?.contains(event.relatedTarget)) return;
      hintAscendCell(runtime, host, event);
    });
    listenView(runtime, host, "pointerover", (event) => tipAscendCell(runtime, host, event));
    listenView(runtime, host, "pointermove", (event) => tipAscendCell(runtime, host, event));
    listenView(runtime, host, "pointerout", (event) => {
      const cell = event.target.closest?.("[data-ascend-kind]");
      if (cell && host.contains(cell) && !cell.contains(event.relatedTarget)) (0, runtime.deps.hideInfoTooltip)();
    });
  }
  function hintAscendCell(runtime, host, event) {
    const cell = event.target.closest?.("[data-ascend-kind]");
    if (cell && host.contains(cell)) runtime.handlers.hint(cell.dataset.ascendKind, cell.dataset.ascendId);
  }
  function tipAscendCell(runtime, host, event) {
    const cell = event.target.closest?.("[data-ascend-kind]");
    if (!cell || !host.contains(cell)) return;
    runtime.handlers.tip(
      { currentTarget: cell, pointerType: event.pointerType, clientX: event.clientX, clientY: event.clientY },
      cell.dataset.ascendKind,
      cell.dataset.ascendId
    );
  }

  // modules/ui/ascend-tree-view.mjs
  function createAscendTreeView(deps) {
    const runtime = { deps, active: true, session: null, focus: null, shown: null, scrollFrame: null, listeners: [], handlers: {} };
    const actions = {
      hint: ascendTreeHint,
      tip: ascendTreeTip,
      press: ascendTreePress,
      act: ascendTreeAct,
      clear: ascendTreeClear,
      reset: () => (0, deps.resetAscendKeystones)(),
      resetNodes: () => (0, deps.resetAscendNodes)(),
      continuePlan: () => (0, deps.continueLastLoopAscendPlan)()
    };
    runtime.handlers.render = () => {
      if (!runtime.active) return;
      syncAscendTreeSession(runtime);
      ascendTreeRender(runtime);
    };
    for (const [name, action] of Object.entries(actions)) runtime.handlers[name] = (...args) => {
      if (!runtime.active) return;
      if (!runtime.session || !investmentSessionIsCurrent(runtime, runtime.session)) return runtime.handlers.render();
      return action(runtime, ...args);
    };
    installAscendTreeEvents(runtime);
    return Object.freeze({
      ...runtime.handlers,
      pickCardHtml: (key) => ascendTreePickCardHtml(runtime, key),
      icon: ascendTreeIconOf,
      dispose() {
        if (runtime.scrollFrame !== null) deps.cancelAnimationFrame(runtime.scrollFrame);
        runtime.scrollFrame = null;
        runtime.session = null;
        releaseViewEvents(runtime);
      }
    });
  }
  function syncAscendTreeSession(runtime) {
    if (runtime.session && investmentSessionIsCurrent(runtime, runtime.session)) return;
    if (runtime.scrollFrame !== null) runtime.deps.cancelAnimationFrame(runtime.scrollFrame);
    runtime.scrollFrame = null;
    runtime.focus = null;
    runtime.shown = null;
    runtime.session = captureInvestmentSession(runtime);
  }

  // modules/ascendancy-tree-ui-classic.mjs
  var ascendancyTreeUi = createAscendTreeView({
    get rules() {
      return window.GameModules.loopInvestmentRules.ascend;
    },
    get ASCENDANCY_NODE_DEFS() {
      return ASCENDANCY_NODE_DEFS;
    },
    get ASCENDANCY_NODE_FALLBACK() {
      return ASCENDANCY_NODE_FALLBACK;
    },
    get CLASS_KEYSTONE_PICK_LIMIT() {
      return CLASS_KEYSTONE_PICK_LIMIT;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get P_STATS() {
      return P_STATS;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get askRefundAscendNode() {
      return window.GameModules.loopInvestmentView.askRefundAscendNode;
    },
    get buildStatPreviewParts() {
      return buildStatPreviewParts;
    },
    get buyAscend() {
      return window.GameModules.loopInvestmentView.buyAscend;
    },
    get buyAscendKeystone() {
      return window.GameModules.loopInvestmentView.buyAscendKeystone;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatValue() {
      return formatValue;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getAscendancyPlanContinueHtml() {
      return window.GameModules.loopInvestmentView.getAscendancyPlanContinueHtml;
    },
    get getClassKeystoneDefs() {
      return getClassKeystoneDefs;
    },
    get getClassTreeDef() {
      return getClassTreeDef;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getStatName() {
      return getStatName;
    },
    get innerHeight() {
      return innerHeight;
    },
    get isAscendKeystoneRequirementMet() {
      return window.GameModules.loopInvestmentView.isAscendKeystoneRequirementMet;
    },
    get isAscendNodeRequirementMet() {
      return window.GameModules.loopInvestmentView.isAscendNodeRequirementMet;
    },
    get matchMedia() {
      return typeof matchMedia === "undefined" ? void 0 : windowMatchMedia;
    },
    get passiveNodes() {
      return window.GameModules.passiveScene.nodes;
    },
    get previewBuildStats() {
      return previewBuildStats;
    },
    get refundAscendKeystone() {
      return window.GameModules.loopInvestmentView.refundAscendKeystone;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get showInfoTooltipHtml() {
      return typeof showInfoTooltipHtml === "undefined" ? void 0 : showInfoTooltipHtml;
    },
    get statToneText() {
      return statToneText;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get resetAscendKeystones() {
      return window.GameModules.loopInvestmentView.resetAscendKeystones;
    },
    get resetAscendNodes() {
      return window.GameModules.loopInvestmentView.resetAscendNodes;
    },
    get continueLastLoopAscendPlan() {
      return window.GameModules.loopInvestmentView.continueLastLoopAscendPlan;
    }
  });
  window.GameModules.ascendTreeView = ascendancyTreeUi;
  safeExposeGlobals({ ascendancyTreeUi });
})();
