// GENERATED from modules/atlas-board-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);

  // modules/ui/atlas-board-actions.mjs
  function cell(runtime, i, cols, rows) {
    const r = Math.floor(i / cols), k = i % cols;
    return { col: (r % 2 ? cols - 1 - k : k) + 1, row: rows - r };
  }
  function pathD(runtime, cols, rows, from, to) {
    let d = "";
    for (let i = from; i <= to; i++) {
      const p = cell(runtime, i, cols, rows);
      d += `${i === from ? "M" : "L"}${p.col - 0.5} ${p.row - 0.5}`;
    }
    return d;
  }
  function focusTile(runtime, i) {
    const frame = (0, runtime.deps.requestAnimationFrame)(() => {
      runtime.focusFrames.delete(frame);
      runtime.deps.document.querySelector(`.ab-trail > li:nth-child(${i + 1}) > button`)?.focus({ preventScroll: true });
    });
    runtime.focusFrames.add(frame);
  }
  function inspect(runtime, i) {
    const b = runtime.deps.game.atlas.board, n = Number.isInteger(i) && i >= 0 && i <= runtime.state.LAST ? i : null;
    runtime.state.inspected = n === null || n === runtime.state.inspected || n === b.position ? null : n;
    runtime.deps.atlasUi.refresh();
    focusTile(runtime, n ?? b.position);
  }
  function rules(runtime, open) {
    runtime.state.rulesOpen = !!open;
  }
  function save(runtime) {
    (0, runtime.deps.queueImportantSave)(0);
    runtime.deps.atlasUi.refresh();
  }
  function roll(runtime) {
    const block = runtime.deps.atlas.lockReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason();
    if (block) return (0, runtime.deps.addLog)(block, "attack-monster");
    const result = runtime.deps.atlasBoard.roll(runtime.deps.game);
    if (result.reason) return (0, runtime.deps.addLog)(result.reason, "attack-monster");
    for (const [key, n] of result.rewards) (0, runtime.deps.awardCurrency)(key, n);
    runtime.state.inspected = null;
    runtime.state.movedAt = runtime.deps.Date.now();
    save(runtime);
  }
  function choose(runtime, choice) {
    if (runtime.deps.atlasBoard.choose(runtime.deps.game, choice)) save(runtime);
  }
  function enter(runtime) {
    const reason = runtime.deps.game.atlas.run?.board ? runtime.deps.atlasRun.reenter() : runtime.deps.atlasRun.openBoard();
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    save(runtime);
    (0, runtime.deps.switchTab)("tab-battle");
  }
  function defsHtml(runtime) {
    return `<svg class="ab-defs" aria-hidden="true" focusable="false">${Object.entries(runtime.state.SYMBOLS).map(([k, body]) => `<symbol id="ab-g-${k}" viewBox="0 0 24 24">${body}</symbol>`).join("")}</svg>`;
  }
  function headHtml(runtime, b) {
    const level = b.risk >= 4 ? "high" : b.risk >= 2 ? "mid" : "low";
    const pips = Array.from({ length: runtime.state.B.maxRisk }, (_, n) => `<i${n < b.risk ? ' class="on"' : ""}></i>`).join("");
    return `<header class="ab-head">
            <div class="ab-titles"><h3 id="ab-title" class="ab-title">${esc(runtime, (0, runtime.deps._t)(runtime.state.T.title))}</h3><p class="ab-sub">${esc(runtime, runtime.state.T.lapText(b.lap))}</p>${b.promise ? `<span class="ab-oath">${esc(runtime, runtime.state.T.promiseShort)}</span>` : ""}</div>
            <dl class="ab-meters">
                <div class="ab-meter is-risk" data-level="${level}"><dt>${esc(runtime, runtime.state.T.risk)}</dt><dd><span class="ab-pips" aria-hidden="true">${pips}</span><b>${b.risk}<small>/${runtime.state.B.maxRisk}</small></b></dd></div>
                <div class="ab-meter is-boost"><dt>${esc(runtime, runtime.state.T.boost)}</dt><dd><b>+${b.boost}%</b></dd></div>
                <div class="ab-meter is-tier"><dt>${esc(runtime, runtime.state.T.tier)}</dt><dd><b>${esc(runtime, runtime.state.T.tierValue(runtime.deps.atlasBoard.tierFor(b)))}</b></dd></div>
            </dl>
            <div class="ab-dice${b.dice ? "" : " is-zero"}" role="group" aria-label="${esc(runtime, runtime.state.T.aria.dice(b.dice))}"><span>${esc(runtime, runtime.state.T.dice)}</span><b>${b.dice}</b></div>
        </header>`;
  }
  function tileClasses(runtime, t, i, b, reach) {
    const cls = ["ab-tile", `k-${t.kind}`];
    if (i === b.position) cls.push("is-here");
    else if (i < b.position) cls.push("is-done");
    if (i > b.position && i <= reach) cls.push("is-reach");
    if (i === runtime.state.inspected) cls.push("is-inspect");
    if (b.trail.includes(i)) cls.push("is-step");
    if (t.kind === "boss" && b.promise) cls.push("has-oath");
    return cls.join(" ");
  }
  function tileHtml(runtime, t, i, b, reach) {
    const d = i - b.position, here = d === 0, inReach = d > 0 && i <= reach, step = b.trail.indexOf(i);
    const pos = runtime.state.LAYOUTS.map(([c, r]) => {
      const p = cell(runtime, i, c, r);
      return `--c${c}:${p.col};--r${c}:${p.row}`;
    }).join(";");
    const badge = here ? `<span class="ab-badge is-here">${esc(runtime, runtime.state.T.here)}</span>` : inReach ? `<span class="ab-badge">${esc(runtime, runtime.state.T.reach(d))}</span>` : "";
    const leaf = t.kind === "boss" ? `<svg class="ab-leaf" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ab-g-leaf"/></svg>` : "";
    return `<li class="${tileClasses(runtime, t, i, b, reach)}" style="${pos};--step:${Math.max(0, step)}">
            <button type="button" onclick="atlasBoardUi.inspect(${i})" aria-label="${esc(runtime, runtime.state.T.aria.tile(i + 1, t.name, kindName(runtime, t.kind), here))}"${here ? ' aria-current="step"' : ""}${i === runtime.state.inspected ? ' aria-pressed="true"' : ""}>
                ${badge}<span class="ab-node">${leaf}</span><span class="ab-name">${esc(runtime, (0, runtime.deps._t)(t.name))}</span>
            </button></li>`;
  }
  function trailHtml(runtime, b, reach) {
    const lines = runtime.state.LAYOUTS.map(([c, r]) => `<svg class="ab-lines ab-lines-${c}" viewBox="0 0 ${c} ${r}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path class="ab-line-all" d="${pathD(runtime, c, r, 0, runtime.state.LAST)}"/>
            ${b.position > 0 ? `<path class="ab-line-done" d="${pathD(runtime, c, r, 0, b.position)}"/>` : ""}
            ${reach > 0 ? `<path class="ab-line-reach" d="${pathD(runtime, c, r, b.position, reach)}"/>` : ""}</svg>`).join("");
    return `<div class="ab-trail-wrap"><div class="ab-trail-box">${lines}
            <ol class="ab-trail" aria-label="${esc(runtime, runtime.state.T.aria.trail(runtime.state.B.tiles.length))}">${runtime.state.B.tiles.map((t, i) => tileHtml(runtime, t, i, b, reach)).join("")}</ol>
        </div></div>`;
  }
  function focusHtml(runtime, b) {
    const i = runtime.state.inspected ?? b.position, t = runtime.state.B.tiles[i], d = i - b.position;
    const where = d === 0 ? runtime.state.T.here : d > 0 ? runtime.state.T.ahead(d) : runtime.state.T.behind(-d);
    return `<div class="ab-focus k-${t.kind}">
            <span class="ab-node" aria-hidden="true"></span>
            <div><p class="ab-focus-meta">${esc(runtime, kindName(runtime, t.kind))}<span>${esc(runtime, where)}</span></p>
                <h4>${esc(runtime, (0, runtime.deps._t)(t.name))}</h4><p class="ab-focus-effect">${esc(runtime, effectText(runtime, t.kind))}</p></div>
            ${d ? `<button type="button" class="ab-link" onclick="atlasBoardUi.inspect(null)">${esc(runtime, runtime.state.T.backToCurrent)}</button>` : ""}
        </div>`;
  }
  function dieHtml(runtime, n, rolled) {
    const on = runtime.state.PIPS[n] || [];
    return `<span class="ab-die${n ? "" : " is-empty"}${rolled && n ? " is-rolled" : ""}" role="img" aria-label="${esc(runtime, n ? runtime.state.T.aria.lastRoll(n) : runtime.state.T.aria.noRoll)}">${Array.from({ length: 9 }, (_, k) => `<i${on.includes(k) ? ' class="on"' : ""}></i>`).join("")}</span>`;
  }
  function rollHtml(runtime, b, moving) {
    const blocked = runtime.deps.atlas.lockReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason() || runtime.deps.atlasBoard.reason(runtime.deps.game);
    const atBoss = b.position === runtime.state.LAST;
    return `<div class="ab-act"><div class="ab-roll-row">${dieHtml(runtime, b.lastRoll, moving)}
            <button type="button" class="ab-cta" onclick="atlasBoardUi.roll()"${blocked ? " disabled" : ""}><span>${esc(runtime, atBoss ? runtime.state.T.rollBoss : runtime.state.T.roll)}</span><small>${esc(runtime, atBoss ? runtime.state.T.rollCostOnly : runtime.state.T.rollMeta)}</small></button></div>
            ${blocked ? `<p class="ab-hint is-blocked">${esc(runtime, blocked)}</p>` : ""}</div>`;
  }
  function choiceHtml(runtime, b) {
    const run = !!runtime.deps.game.atlas.run;
    const why = {
      risk: b.risk >= runtime.state.B.maxRisk ? runtime.state.T.riskFull : b.boost >= runtime.state.B.maxBoost ? runtime.state.T.boostFull : "",
      rest: "",
      promise: b.promise ? runtime.state.T.promiseHeld : b.risk + runtime.state.B.promise.risk > runtime.state.B.maxRisk ? runtime.state.T.riskFull : ""
    };
    const btn = (k) => `<button type="button" class="ab-opt is-${k}" onclick="atlasBoardUi.choose('${k}')"${run || why[k] ? " disabled" : ""}>
            <b>${esc(runtime, runtime.state.T.choices[k].name)}</b><span>${esc(runtime, why[k] || (k === "risk" ? (0, runtime.deps._t)("위험 +1, 보상 +{min}%", { min: Math.min(15, runtime.state.B.maxBoost - b.boost) }) : runtime.state.T.choices[k].effect))}</span></button>`;
    return `<div class="ab-act"><p class="ab-prompt">${esc(runtime, runtime.state.T.choicePrompt)}</p><div class="ab-choices">${["risk", "rest", "promise"].map(btn).join("")}</div>
            <p class="ab-hint">${(0, runtime.deps._t)("서약 중 문지기 패배 또는 포기: 보관 재화 {value}% 손실", { value: runtime.state.B.lossPct + runtime.state.B.promise.lossPct })}</p>
            ${run ? `<p class="ab-hint is-blocked">${esc(runtime, runtime.state.T.otherRun)}</p>` : ""}</div>`;
  }
  function entryHtml(runtime, b, moving) {
    const plan = runtime.deps.atlasBoard.plan(runtime.deps.game);
    if (!plan) return rollHtml(runtime, b, moving);
    const inBoard = !!runtime.deps.game.atlas.run?.board, other = !!runtime.deps.game.atlas.run && !inBoard;
    const label = inBoard ? runtime.state.T.reenter : runtime.state.T.enter;
    const banked = Object.values(b.bank).some((n) => n > 0);
    const warn = banked ? `<p class="ab-warn">${esc(runtime, runtime.state.T.lossWarn(runtime.deps.atlasBoard.lossPctFor(b, plan.boss)))}</p>` : "";
    return `<div class="ab-act">
            <p class="ab-enter-meta"><b>${esc(runtime, runtime.state.T.tierValue(plan.tier))}</b><span>${esc(runtime, kindName(runtime, plan.boss ? "boss" : "map"))}</span></p>
            <button type="button" class="ab-cta" onclick="atlasBoardUi.enter()"${other ? " disabled" : ""}><span>${esc(runtime, label)}</span>${plan.boss ? `<small>${esc(runtime, runtime.state.T.bossReward)}</small>` : ""}</button>
            ${other ? `<p class="ab-hint is-blocked">${esc(runtime, runtime.state.T.otherRun)}</p>` : warn}</div>`;
  }
  function bankHtml(runtime, b) {
    const rows = Object.entries(b.bank).filter(([, n]) => n > 0).map(([key, n]) => `<li><span>${esc(runtime, (0, runtime.deps.getCurrencyInfo)(key).name)}</span><b>${n}</b></li>`);
    if (b.gear) rows.push(`<li class="is-gear"><span>${esc(runtime, runtime.state.T.gear)}</span><b>${b.gear}</b></li>`);
    return `<section class="ab-bank" aria-labelledby="ab-bank-title">
            <header><h4 id="ab-bank-title">${esc(runtime, runtime.state.T.bankTitle)}</h4><small${b.promise ? ' class="is-oath"' : ""}>${esc(runtime, b.promise ? runtime.state.T.bankOath(runtime.state.B.promise.rewardPct) : runtime.state.T.bankHint)}</small></header>
            ${rows.length ? `<ul>${rows.join("")}</ul>` : `<p class="ab-empty">${esc(runtime, runtime.state.T.bankEmpty)}</p>`}</section>`;
  }
  function rulesHtml(runtime) {
    return `<details class="ab-rules"${runtime.state.rulesOpen ? " open" : ""} ontoggle="atlasBoardUi.rules(this.open)">
            <summary>${esc(runtime, runtime.state.T.rulesTitle)}</summary><ul>${runtime.state.T.rules(runtime.state.B).map((s) => `<li>${esc(runtime, s)}</li>`).join("")}</ul>
            <div class="ab-lore">${runtime.state.T.intro.map((s) => `<p>${esc(runtime, s)}</p>`).join("")}<p>${esc(runtime, runtime.state.T.discoveries[runtime.deps.game.atlas.board.lap % runtime.state.T.discoveries.length])}</p></div></details>`;
  }
  function lockedHtml(runtime) {
    return `<section class="ab is-locked" aria-labelledby="ab-title"><div class="ab-locked">
            <h3 id="ab-title" class="ab-title">${esc(runtime, (0, runtime.deps._t)(runtime.state.T.title))}</h3><p>${esc(runtime, runtime.state.T.locked(runtime.state.B.minLoop))}</p><small>${esc(runtime, runtime.state.T.lockedSub)}</small></div></section>`;
  }
  function panelHtml(runtime, b, moving) {
    const act = b.choice ? choiceHtml(runtime, b) : b.pending ? entryHtml(runtime, b, moving) : rollHtml(runtime, b, moving);
    return `<section class="ab-panel" aria-label="${esc(runtime, runtime.state.T.aria.panel)}">${focusHtml(runtime, b)}${act}
            ${b.message ? `<p class="ab-log" role="status">${esc(runtime, b.message)}</p>` : ""}</section>`;
  }
  function html(runtime) {
    if (!runtime.deps.atlasBoard.unlocked(runtime.deps.game)) return lockedHtml(runtime);
    const b = runtime.deps.game.atlas.board;
    if (runtime.state.inspected !== null && (runtime.state.inspected === b.position || !runtime.state.B.tiles[runtime.state.inspected])) runtime.state.inspected = null;
    const age = runtime.deps.Date.now() - runtime.state.movedAt, moving = age >= 0 && age < runtime.state.FX_MS && b.trail.length > 0;
    const reach = reachOf(runtime, b);
    return `<section class="ab${moving ? " is-moving" : ""}" aria-labelledby="ab-title" style="--age:${moving ? age : 0}ms;--steps:${b.trail.length || 1}">
            ${defsHtml(runtime)}
            <div class="ab-layout">
                ${headHtml(runtime, b)}
                ${trailHtml(runtime, b, reach)}
                ${panelHtml(runtime, b, moving)}
                ${bankHtml(runtime, b)}
                ${rulesHtml(runtime)}
            </div></section>`;
  }
  function esc(runtime, s) {
    return (0, runtime.deps.escapeHTML)(String(s));
  }
  function kindName(runtime, k) {
    return runtime.state.T.kinds[k];
  }
  function effectText(runtime, k) {
    return runtime.state.T.effects(runtime.state.B)[k];
  }
  function reachOf(runtime, b) {
    return b.pending || b.choice || b.position >= runtime.state.LAST ? -1 : Math.min(runtime.state.LAST, b.position + 6);
  }

  // modules/ui/atlas-board-view.mjs
  function createAtlasBoardView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, focusFrames: /* @__PURE__ */ new Set() };
    const handlers = { html, inspect, roll, choose, enter, rules };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasBoardView(runtime), html: runtime.handlers.html, inspect: runtime.handlers.inspect, roll: runtime.handlers.roll, choose: runtime.handlers.choose, enter: runtime.handlers.enter, rules: runtime.handlers.rules });
    return runtime.api;
  }
  function disposeAtlasBoardView(runtime) {
    for (const frame of runtime.focusFrames) (0, runtime.deps.cancelAnimationFrame)(frame);
    runtime.focusFrames.clear();
  }
  function initialize(runtime) {
    runtime.state.B = runtime.deps.ATLAS_BOARD;
    runtime.state.T = runtime.state.B.text;
    runtime.state.LAST = runtime.state.B.tiles.length - 1;
    runtime.state.LAYOUTS = Object.freeze([[6, 4], [8, 3]]);
    runtime.state.FX_MS = 1600;
    runtime.state.PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
    runtime.state.DOT = 'fill="currentColor" stroke="none"';
    runtime.state.SYMBOLS = Object.freeze({
      leaf: `<path ${runtime.state.DOT} d="M4 20C4 11 10 5 20 4c-1 10-7 16-16 16z"/><path d="M5 19l8-8" stroke="#2a2010" stroke-width="1.4"/>`
    });
    runtime.state.inspected = null;
    runtime.state.rulesOpen = false;
    runtime.state.movedAt = 0;
  }

  // modules/atlas-board-ui-classic.mjs
  var atlasBoardUi = createAtlasBoardView({
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get document() {
      return document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get atlasUi() {
      return atlasUi;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get atlas() {
      return atlas;
    },
    get atlasRun() {
      return atlasRun;
    },
    get addLog() {
      return addLog;
    },
    get atlasBoard() {
      return atlasBoard;
    },
    get Date() {
      return Date;
    },
    get awardCurrency() {
      return awardCurrency;
    },
    get switchTab() {
      return switchTab;
    },
    get _t() {
      return _t;
    },
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get ATLAS_BOARD() {
      return ATLAS_BOARD;
    }
  });
  safeExposeGlobals({ atlasBoardUi });
})();
