// GENERATED from modules/atlas-passives-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/atlas-passives-actions.mjs
  function place(runtime, node) {
    const key = suffix(runtime, node.id), [first, second] = key;
    if (key === "r") return { ring: 0, angle: 0 };
    if (runtime.state.BRANCH[first] !== void 0 && runtime.state.STEPS[second]) return { ring: runtime.state.STEPS[second], angle: radians(runtime, runtime.state.BRANCH[first]) };
    if (runtime.state.BRANCH[first] !== void 0 && runtime.state.BRANCH[second] !== void 0) return { ring: 2, angle: between(runtime, first, second) };
    const [p, q] = node.requires.map((id) => suffix(runtime, id)[0]);
    return { ring: 4, angle: between(runtime, p, q) };
  }
  function point(runtime, { ring, angle }, shape) {
    const turned = angle + radians(runtime, shape.turn + shape.twist * ring), radius = shape.rings[ring];
    return { x: 50 + radius * Math.cos(turned), y: 50 + radius * Math.sin(turned), ring, angle: turned };
  }
  function linkState(runtime, a, b) {
    const ends = [status(runtime, a), status(runtime, b)];
    if (ends.every((state) => state === "taken")) return "done";
    return ends.includes("taken") ? "lit" : "dim";
  }
  function wheelModel(runtime, wheel) {
    const shape = shapeOf(runtime, wheel.id), at = new Map(wheel.nodes.map((node) => [node.id, point(runtime, place(runtime, node), shape)]));
    const links = wheel.nodes.flatMap((node) => node.requires.map((req) => {
      const from = at.get(req), to = at.get(node.id), sameRing = from.ring === to.ring && from.ring > 0;
      return { from, to, arc: sameRing ? { radius: shape.rings[from.ring], from: from.angle, to: to.angle } : null, state: linkState(runtime, req, node.id) };
    }));
    const nodes = wheel.nodes.map((node) => ({ ...at.get(node.id), rank: rankOf(runtime, node), state: status(runtime, node.id) }));
    return { tint: wheel.tint, rings: shape.rings, nodes, links };
  }
  function paint(runtime) {
    runtime.deps.document.querySelectorAll("#ui-atlas .atlas-wheel-art").forEach((box) => {
      const wheel = runtime.deps.ATLAS_PASSIVES.wheels.find((row) => row.id === box.dataset.wheel), canvas = box.querySelector("canvas");
      if (wheel && canvas && box.clientWidth) runtime.deps.atlasChartArt.paintWheel(canvas, box.dataset.mini ? runtime.state.MINI_DOTS : Math.max(80, Math.round(box.clientWidth / 2)), wheelModel(runtime, wheel));
    });
  }
  function toggle(runtime, id) {
    runtime.state.focusId = id;
    (0, runtime.deps.hideInfoTooltip)();
    const reason = runtime.deps.game.atlas.passives.includes(id) ? runtime.deps.atlasPassives.refund(runtime.deps.game, id) : runtime.deps.atlasPassives.allocate(runtime.deps.game, id);
    if (reason) (0, runtime.deps.addLog)(reason, "attack-monster");
    else {
      runtime.deps.atlas.setLoadout(runtime.deps.game, runtime.deps.game.atlas.loadout);
      (0, runtime.deps.queueImportantSave)(200);
    }
    runtime.deps.atlasUi.refresh();
  }
  function noteBody(runtime, node) {
    if (!node) return "";
    return `<strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</strong> <small>${withState(runtime, runtime.state.RANK_NAME[rankOf(runtime, node)], node)}</small>
            <br>${(0, runtime.deps.escapeHTML)(effectText(runtime, node.effect))}`;
  }
  function hint(runtime, event, id) {
    const wheel = event.currentTarget.closest(".atlas-wheel"), note = wheel && wheel.querySelector(".atlas-wheel-note");
    const node = runtime.deps.atlasPassives.nodes.get(id || runtime.state.focusId);
    if (note) note.innerHTML = noteBody(runtime, node && node.wheel === event.currentTarget.closest(".atlas-wheel-art").dataset.wheel ? node : null);
  }
  function nodeHtml(runtime, node, at) {
    const state = status(runtime, node.id), rank = rankOf(runtime, node);
    const label = withState(runtime, `${node.name}, ${runtime.state.RANK_NAME[rank]}, ${effectText(runtime, node.effect)}`, node);
    return `<button class="atlas-passive-node rank-${rank} is-${state}${node.id === runtime.state.focusId ? " is-focus" : ""}" style="--x:${at.x}%;--y:${at.y}%"
            aria-pressed="${state === "taken"}" aria-label="${(0, runtime.deps.escapeHTML)(label)}" onclick="atlasPassivesUi.toggle('${node.id}')"
            onmouseenter="atlasPassivesUi.hint(event,'${node.id}')" onfocus="atlasPassivesUi.hint(event,'${node.id}')"
            onmouseleave="atlasPassivesUi.hint(event,null)" onblur="atlasPassivesUi.hint(event,null)"></button>`;
  }
  function noteHtml(runtime, wheel) {
    return `<p class="atlas-wheel-note">${noteBody(runtime, wheel.nodes.find((row) => row.id === runtime.state.focusId))}</p>`;
  }
  function pick(runtime, id) {
    runtime.state.wheelId = id;
    (0, runtime.deps.hideInfoTooltip)();
    runtime.deps.atlasUi.refresh();
  }
  function tabsHtml(runtime) {
    return `<nav class="atlas-wheel-tabs" aria-label="${(0, runtime.deps._t)("패시브 갈래")}">${runtime.deps.ATLAS_PASSIVES.wheels.map((wheel) => {
      const taken = wheel.nodes.filter((node) => runtime.deps.game.atlas.passives.includes(node.id)).length;
      return `<button type="button" style="--tint:${wheel.tint}" aria-pressed="${wheel.id === shownWheelId(runtime)}" onclick="atlasPassivesUi.pick('${wheel.id}')">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}<span>${taken}/${wheel.nodes.length}</span></button>`;
    }).join("")}</nav>`;
  }
  function wheelHtml(runtime, wheel, side = "") {
    const at = new Map(wheel.nodes.map((node) => [node.id, point(runtime, place(runtime, node), shapeOf(runtime, wheel.id))]));
    return `<section class="atlas-wheel" style="--tint:${wheel.tint}" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}"${wheel.id === shownWheelId(runtime) ? "" : " hidden"}>
            <div class="atlas-wheel-art" data-wheel="${wheel.id}"><canvas aria-hidden="true"></canvas>${wheel.nodes.map((node) => nodeHtml(runtime, node, at.get(node.id))).join("")}</div>
            ${side ? `<div class="as-wheel-side"><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}</h3>${noteHtml(runtime, wheel)}${side}</div>` : noteHtml(runtime, wheel)}</section>`;
  }
  function railHtml(runtime) {
    return `<nav class="as-wheel-rail" aria-label="${(0, runtime.deps._t)("패시브 갈래")}">${runtime.deps.ATLAS_PASSIVES.wheels.map((wheel) => {
      const taken = wheel.nodes.filter((node) => runtime.deps.game.atlas.passives.includes(node.id)).length;
      return `<button type="button" style="--tint:${wheel.tint}" aria-pressed="${wheel.id === shownWheelId(runtime)}" onclick="atlasPassivesUi.pick('${wheel.id}')"><span class="atlas-wheel-art" data-wheel="${wheel.id}" data-mini="1"><canvas aria-hidden="true"></canvas></span><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(wheel.name))}</b><small>${taken}/${wheel.nodes.length}</small><i style="--fill:${Math.round(taken / wheel.nodes.length * 100)}%"></i></button>`;
    }).join("")}</nav>`;
  }
  function totalRowsHtml(runtime) {
    const rows = Object.entries(runtime.deps.atlasPassives.effects(runtime.deps.game)).filter(([key, value]) => value && runtime.state.labels[key]).map(([key, value]) => `<li><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.state.labels[key][0]))}</span>${runtime.state.labels[key][1] === "on" ? "" : `<b>+${value}${runtime.state.labels[key][1]}</b>`}</li>`).join("");
    return `<h4>${(0, runtime.deps._t)("합계")}</h4>${rows ? `<ul class="as-passive-totals">${rows}</ul>` : `<p class="atlas-muted">${(0, runtime.deps._t)("아직 찍은 패시브가 없습니다.")}</p>`}`;
  }
  function sheetHtml(runtime) {
    const used = runtime.deps.game.atlas.passives.length, points = runtime.deps.atlas.points(runtime.deps.game), side = totalRowsHtml(runtime);
    return `<div class="atlas-passives as-passives">${railHtml(runtime)}<div class="atlas-wheels">${runtime.deps.ATLAS_PASSIVES.wheels.map((wheel) => wheelHtml(runtime, wheel, side)).join("")}</div>
            <p class="as-passive-points" style="--fill:${points ? Math.round(used / points * 100) : 0}%"><b>${(0, runtime.deps._t)("아틀라스 포인트 {used}/{points} 사용", { used, points })}</b></p></div>`;
  }
  function totalsHtml(runtime) {
    const total = runtime.deps.atlasPassives.effects(runtime.deps.game), text = effectText(runtime, total);
    return text ? `<p class="atlas-passive-total">${(0, runtime.deps._t)("합계: {text}", { text: (0, runtime.deps.escapeHTML)(text) })}</p>` : "";
  }
  function html(runtime) {
    if (runtime.deps.atlasSheetUi.on()) return sheetHtml(runtime);
    const used = runtime.deps.game.atlas.passives.length, points = runtime.deps.atlas.points(runtime.deps.game);
    return `<div class="atlas-passives"><p class="atlas-muted">${(0, runtime.deps._t)("아틀라스 포인트 {used}/{points} 사용", { used, points })}</p>${totalsHtml(runtime)}${tabsHtml(runtime)}<div class="atlas-wheels">${runtime.deps.ATLAS_PASSIVES.wheels.map(runtime.handlers.wheelHtml).join("")}</div></div>`;
  }
  function effectText(runtime, effect) {
    return Object.entries(effect).map(([key, value]) => runtime.state.labels[key][1] === "on" ? runtime.state.labels[key][0] : `${runtime.state.labels[key][0]} +${value}${runtime.state.labels[key][1]}`).join(", ");
  }
  function suffix(runtime, id) {
    return id.slice(id.indexOf("_") + 1);
  }
  function rankOf(runtime, node) {
    return suffix(runtime, node.id) === "r" ? "root" : node.rank;
  }
  function status(runtime, id) {
    return runtime.deps.atlasPassives.status(runtime.deps.game, id);
  }
  function stateText(runtime, node) {
    return runtime.deps.atlasPassives.waits(runtime.deps.game, node.id) ? (0, runtime.deps._t)("루프 {loopOf}부터 찍을 수 있습니다", { loopOf: runtime.deps.atlasPassives.loopOf(node.id) }) : runtime.state.STATE_TEXT[status(runtime, node.id)];
  }
  function withState(runtime, text, node) {
    return [text, stateText(runtime, node)].filter(Boolean).join(", ");
  }
  function radians(runtime, degrees) {
    return degrees * Math.PI / 180;
  }
  function between(runtime, p, q) {
    return Math.atan2(Math.sin(radians(runtime, runtime.state.BRANCH[p])) + Math.sin(radians(runtime, runtime.state.BRANCH[q])), Math.cos(radians(runtime, runtime.state.BRANCH[p])) + Math.cos(radians(runtime, runtime.state.BRANCH[q])));
  }
  function shapeOf(runtime, wheelId) {
    return runtime.state.SHAPES[wheelId] || runtime.state.DEFAULT_SHAPE;
  }
  function shownWheelId(runtime) {
    return runtime.state.wheelId || runtime.deps.ATLAS_PASSIVES.wheels[0].id;
  }

  // modules/ui/atlas-passives-view.mjs
  function createAtlasPassiveView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { wheelHtml, html, paint, toggle, hint, pick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ html: runtime.handlers.html, paint: runtime.handlers.paint, toggle: runtime.handlers.toggle, hint: runtime.handlers.hint, pick: runtime.handlers.pick });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.labels = runtime.deps.ATLAS_PASSIVES.labels;
    runtime.state.BRANCH = Object.freeze({ a: -90, b: 30, c: 150 });
    runtime.state.SHAPES = Object.freeze({
      sustain: Object.freeze({ turn: 180, twist: 0, rings: Object.freeze([0, 12, 24, 35, 46]) }),
      loot: Object.freeze({ turn: 0, twist: 22, rings: Object.freeze([0, 9, 19, 33, 47]) }),
      boss: Object.freeze({ turn: 60, twist: -22, rings: Object.freeze([0, 13, 25, 35, 45]) }),
      content: Object.freeze({ turn: 0, twist: 38, rings: Object.freeze([0, 14, 26, 36, 46]) }),
      fruit: Object.freeze({ turn: 30, twist: -38, rings: Object.freeze([0, 15, 27, 37, 45]) })
    });
    runtime.state.DEFAULT_SHAPE = runtime.state.SHAPES.sustain;
    runtime.state.STEPS = Object.freeze({ 1: 1, 2: 2, N: 3, T: 4 });
    runtime.state.RANK_NAME = Object.freeze({ root: "뿌리", small: "작은 노드", notable: "주요 노드", keystone: "핵심 노드" });
    runtime.state.STATE_TEXT = Object.freeze({ taken: "찍음 (다시 누르면 되돌립니다)", open: "", locked: "" });
    runtime.state.focusId = null;
    runtime.state.wheelId = null;
    runtime.state.MINI_DOTS = 80;
  }

  // modules/atlas-passives-ui-classic.mjs
  var atlasPassivesUi = createAtlasPassiveView({
    get document() {
      return document;
    },
    get ATLAS_PASSIVES() {
      return ATLAS_PASSIVES;
    },
    get atlasChartArt() {
      return atlasChartArt;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get atlasPassives() {
      return atlasPassives;
    },
    get addLog() {
      return addLog;
    },
    get atlasUi() {
      return atlasUi;
    },
    get atlas() {
      return atlas;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get atlasSheetUi() {
      return atlasSheetUi;
    }
  });
  safeExposeGlobals({ atlasPassivesUi });
})();
