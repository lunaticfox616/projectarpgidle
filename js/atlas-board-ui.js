/** 나이테 원정 화면. 문구는 ATLAS_BOARD.text, 규칙과 상태는 atlasBoard가 소유한다. */
const atlasBoardUi = (() => {
    const B = ATLAS_BOARD, T = B.text, LAST = B.tiles.length - 1;
    const LAYOUTS = Object.freeze([[6, 4], [8, 3]]);           // [열, 행]: 좁은 판, 넓은 판
    const FX_MS = 1600;
    const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
    const DOT = 'fill="currentColor" stroke="none"';
    const SYMBOLS = Object.freeze({
        leaf: `<path ${DOT} d="M4 20C4 11 10 5 20 4c-1 10-7 16-16 16z"/><path d="M5 19l8-8" stroke="#2a2010" stroke-width="1.4"/>`
    });
    let inspected = null, rulesOpen = false, movedAt = 0;

    const esc = s => escapeHTML(String(s));
    const kindName = k => T.kinds[k];
    const effectText = k => T.effects(B)[k];
    const reachOf = b => b.pending || b.choice || b.position >= LAST ? -1 : Math.min(LAST, b.position + 6);

    /** 아래에서 위로 굽이쳐 오르는 길. 짝수 줄은 왼쪽에서 오른쪽, 홀수 줄은 반대로. */
    function cell(i, cols, rows) {
        const r = Math.floor(i / cols), k = i % cols;
        return { col: (r % 2 ? cols - 1 - k : k) + 1, row: rows - r };
    }
    function pathD(cols, rows, from, to) {
        let d = '';
        for (let i = from; i <= to; i++) { const p = cell(i, cols, rows); d += `${i === from ? 'M' : 'L'}${p.col - .5} ${p.row - .5}`; }
        return d;
    }
    function focusTile(i) {
        requestAnimationFrame(() => document.querySelector(`.ab-trail > li:nth-child(${i + 1}) > button`)?.focus({ preventScroll: true }));
    }

    function inspect(i) {
        const b = game.atlas.board, n = Number.isInteger(i) && i >= 0 && i <= LAST ? i : null;
        inspected = n === null || n === inspected || n === b.position ? null : n;
        atlasUi.refresh();
        focusTile(n ?? b.position);
    }
    function rules(open) { rulesOpen = !!open; }
    function save() { queueImportantSave(0); atlasUi.refresh(); }
    function roll() {
        const block = atlas.lockReason(game) || atlasRun.blockReason();
        if (block) return addLog(block, 'attack-monster');
        const result = atlasBoard.roll(game);
        if (result.reason) return addLog(result.reason, 'attack-monster');
        for (const [key, n] of result.rewards) awardCurrency(key, n);
        inspected = null; movedAt = Date.now(); save();
    }
    function choose(choice) { if (atlasBoard.choose(game, choice)) save(); }
    function enter() {
        const reason = game.atlas.run?.board ? atlasRun.reenter() : atlasRun.openBoard();
        if (reason) return addLog(reason, 'attack-monster');
        save(); switchTab('tab-battle');
    }

    function defsHtml() {
        return `<svg class="ab-defs" aria-hidden="true" focusable="false">${Object.entries(SYMBOLS)
            .map(([k, body]) => `<symbol id="ab-g-${k}" viewBox="0 0 24 24">${body}</symbol>`).join('')}</svg>`;
    }
    function headHtml(b) {
        const level = b.risk >= 4 ? 'high' : b.risk >= 2 ? 'mid' : 'low';
        const pips = Array.from({ length: B.maxRisk }, (_, n) => `<i${n < b.risk ? ' class="on"' : ''}></i>`).join('');
        return `<header class="ab-head">
            <div class="ab-titles"><h3 id="ab-title" class="ab-title">${esc(T.title)}</h3><p class="ab-sub">${esc(T.lapText(b.lap))}</p>${b.promise ? `<span class="ab-oath">${esc(T.promiseShort)}</span>` : ''}</div>
            <dl class="ab-meters">
                <div class="ab-meter is-risk" data-level="${level}"><dt>${esc(T.risk)}</dt><dd><span class="ab-pips" aria-hidden="true">${pips}</span><b>${b.risk}<small>/${B.maxRisk}</small></b></dd></div>
                <div class="ab-meter is-boost"><dt>${esc(T.boost)}</dt><dd><b>+${b.boost}%</b></dd></div>
                <div class="ab-meter is-tier"><dt>${esc(T.tier)}</dt><dd><b>${esc(T.tierValue(atlasBoard.tierFor(b)))}</b></dd></div>
            </dl>
            <div class="ab-dice${b.dice ? '' : ' is-zero'}" role="group" aria-label="${esc(T.aria.dice(b.dice))}"><span>${esc(T.dice)}</span><b>${b.dice}</b></div>
        </header>`;
    }
    function tileClasses(t, i, b, reach) {
        const cls = ['ab-tile', `k-${t.kind}`];
        if (i === b.position) cls.push('is-here'); else if (i < b.position) cls.push('is-done');
        if (i > b.position && i <= reach) cls.push('is-reach');
        if (i === inspected) cls.push('is-inspect');
        if (b.trail.includes(i)) cls.push('is-step');
        if (t.kind === 'boss' && b.promise) cls.push('has-oath');
        return cls.join(' ');
    }
    function tileHtml(t, i, b, reach) {
        const d = i - b.position, here = d === 0, inReach = d > 0 && i <= reach, step = b.trail.indexOf(i);
        const pos = LAYOUTS.map(([c, r]) => { const p = cell(i, c, r); return `--c${c}:${p.col};--r${c}:${p.row}`; }).join(';');
        const badge = here ? `<span class="ab-badge is-here">${esc(T.here)}</span>` : inReach ? `<span class="ab-badge">${esc(T.reach(d))}</span>` : '';
        const leaf = t.kind === 'boss' ? `<svg class="ab-leaf" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ab-g-leaf"/></svg>` : '';
        return `<li class="${tileClasses(t, i, b, reach)}" style="${pos};--step:${Math.max(0, step)}">
            <button type="button" onclick="atlasBoardUi.inspect(${i})" aria-label="${esc(T.aria.tile(i + 1, t.name, kindName(t.kind), here))}"${here ? ' aria-current="step"' : ''}${i === inspected ? ' aria-pressed="true"' : ''}>
                ${badge}<span class="ab-node">${leaf}</span><span class="ab-name">${esc(t.name)}</span>
            </button></li>`;
    }
    function trailHtml(b, reach) {
        const lines = LAYOUTS.map(([c, r]) => `<svg class="ab-lines ab-lines-${c}" viewBox="0 0 ${c} ${r}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path class="ab-line-all" d="${pathD(c, r, 0, LAST)}"/>
            ${b.position > 0 ? `<path class="ab-line-done" d="${pathD(c, r, 0, b.position)}"/>` : ''}
            ${reach > 0 ? `<path class="ab-line-reach" d="${pathD(c, r, b.position, reach)}"/>` : ''}</svg>`).join('');
        return `<div class="ab-trail-wrap"><div class="ab-trail-box">${lines}
            <ol class="ab-trail" aria-label="${esc(T.aria.trail(B.tiles.length))}">${B.tiles.map((t, i) => tileHtml(t, i, b, reach)).join('')}</ol>
        </div></div>`;
    }
    function focusHtml(b) {
        const i = inspected ?? b.position, t = B.tiles[i], d = i - b.position;
        const where = d === 0 ? T.here : d > 0 ? T.ahead(d) : T.behind(-d);
        return `<div class="ab-focus k-${t.kind}">
            <span class="ab-node" aria-hidden="true"></span>
            <div><p class="ab-focus-meta">${esc(kindName(t.kind))}<span>${esc(where)}</span></p>
                <h4>${esc(t.name)}</h4><p class="ab-focus-effect">${esc(effectText(t.kind))}</p></div>
            ${d ? `<button type="button" class="ab-link" onclick="atlasBoardUi.inspect(null)">${esc(T.backToCurrent)}</button>` : ''}
        </div>`;
    }
    function dieHtml(n, rolled) {
        const on = PIPS[n] || [];
        return `<span class="ab-die${n ? '' : ' is-empty'}${rolled && n ? ' is-rolled' : ''}" role="img" aria-label="${esc(n ? T.aria.lastRoll(n) : T.aria.noRoll)}">${
            Array.from({ length: 9 }, (_, k) => `<i${on.includes(k) ? ' class="on"' : ''}></i>`).join('')}</span>`;
    }
    function rollHtml(b, moving) {
        const blocked = atlas.lockReason(game) || atlasRun.blockReason() || atlasBoard.reason(game);
        const atBoss = b.position === LAST;
        return `<div class="ab-act"><div class="ab-roll-row">${dieHtml(b.lastRoll, moving)}
            <button type="button" class="ab-cta" onclick="atlasBoardUi.roll()"${blocked ? ' disabled' : ''}><span>${esc(atBoss ? T.rollBoss : T.roll)}</span><small>${esc(atBoss ? T.rollCostOnly : T.rollMeta)}</small></button></div>
            ${blocked ? `<p class="ab-hint is-blocked">${esc(blocked)}</p>` : ''}</div>`;
    }
    function choiceHtml(b) {
        const run = !!game.atlas.run;
        const why = { risk: b.risk >= B.maxRisk ? T.riskFull : b.boost >= B.maxBoost ? T.boostFull : '', rest: '',
            promise: b.promise ? T.promiseHeld : b.risk + B.promise.risk > B.maxRisk ? T.riskFull : '' };
        const btn = k => `<button type="button" class="ab-opt is-${k}" onclick="atlasBoardUi.choose('${k}')"${run || why[k] ? ' disabled' : ''}>
            <b>${esc(T.choices[k].name)}</b><span>${esc(why[k] || (k === 'risk' ? `위험 +1, 보상 +${Math.min(15, B.maxBoost - b.boost)}%` : T.choices[k].effect))}</span></button>`;
        return `<div class="ab-act"><p class="ab-prompt">${esc(T.choicePrompt)}</p><div class="ab-choices">${['risk', 'rest', 'promise'].map(btn).join('')}</div>
            <p class="ab-hint">서약 중 문지기 패배 또는 포기: 보관 재화 ${B.lossPct + B.promise.lossPct}% 손실</p>
            ${run ? `<p class="ab-hint is-blocked">${esc(T.otherRun)}</p>` : ''}</div>`;
    }
    function entryHtml(b, moving) {
        const plan = atlasBoard.plan(game);
        if (!plan) return rollHtml(b, moving);
        const inBoard = !!game.atlas.run?.board, other = !!game.atlas.run && !inBoard;
        const label = inBoard ? T.reenter : T.enter;
        const banked = Object.values(b.bank).some(n => n > 0);
        const warn = banked ? `<p class="ab-warn">${esc(T.lossWarn(atlasBoard.lossPctFor(b, plan.boss)))}</p>` : '';
        return `<div class="ab-act">
            <p class="ab-enter-meta"><b>${esc(T.tierValue(plan.tier))}</b><span>${esc(kindName(plan.boss ? 'boss' : 'map'))}</span></p>
            <button type="button" class="ab-cta" onclick="atlasBoardUi.enter()"${other ? ' disabled' : ''}><span>${esc(label)}</span>${plan.boss ? `<small>${esc(T.bossReward)}</small>` : ''}</button>
            ${other ? `<p class="ab-hint is-blocked">${esc(T.otherRun)}</p>` : warn}</div>`;
    }
    function bankHtml(b) {
        const rows = Object.entries(b.bank).filter(([, n]) => n > 0)
            .map(([key, n]) => `<li><span>${esc(getCurrencyInfo(key).name)}</span><b>${n}</b></li>`);
        if (b.gear) rows.push(`<li class="is-gear"><span>${esc(T.gear)}</span><b>${b.gear}</b></li>`);
        return `<section class="ab-bank" aria-labelledby="ab-bank-title">
            <header><h4 id="ab-bank-title">${esc(T.bankTitle)}</h4><small${b.promise ? ' class="is-oath"' : ''}>${esc(b.promise ? T.bankOath(B.promise.rewardPct) : T.bankHint)}</small></header>
            ${rows.length ? `<ul>${rows.join('')}</ul>` : `<p class="ab-empty">${esc(T.bankEmpty)}</p>`}</section>`;
    }
    function rulesHtml() {
        return `<details class="ab-rules"${rulesOpen ? ' open' : ''} ontoggle="atlasBoardUi.rules(this.open)">
            <summary>${esc(T.rulesTitle)}</summary><ul>${T.rules(B).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
            <div class="ab-lore">${T.intro.map(s => `<p>${esc(s)}</p>`).join('')}<p>${esc(T.discoveries[game.atlas.board.lap % T.discoveries.length])}</p></div></details>`;
    }
    function lockedHtml() {
        return `<section class="ab is-locked" aria-labelledby="ab-title"><div class="ab-locked">
            <h3 id="ab-title" class="ab-title">${esc(T.title)}</h3><p>${esc(T.locked(B.minLoop))}</p><small>${esc(T.lockedSub)}</small></div></section>`;
    }
    function panelHtml(b, moving) {
        const act = b.choice ? choiceHtml(b) : b.pending ? entryHtml(b, moving) : rollHtml(b, moving);
        return `<section class="ab-panel" aria-label="${esc(T.aria.panel)}">${focusHtml(b)}${act}
            ${b.message ? `<p class="ab-log" role="status">${esc(b.message)}</p>` : ''}</section>`;
    }
    function html() {
        if (!atlasBoard.unlocked(game)) return lockedHtml();
        const b = game.atlas.board;
        if (inspected !== null && (inspected === b.position || !B.tiles[inspected])) inspected = null;
        const age = Date.now() - movedAt, moving = age >= 0 && age < FX_MS && b.trail.length > 0;
        const reach = reachOf(b);
        return `<section class="ab${moving ? ' is-moving' : ''}" aria-labelledby="ab-title" style="--age:${moving ? age : 0}ms;--steps:${b.trail.length || 1}">
            ${defsHtml()}
            <div class="ab-layout">
                ${headHtml(b)}
                ${trailHtml(b, reach)}
                ${panelHtml(b, moving)}
                ${bankHtml(b)}
                ${rulesHtml()}
            </div></section>`;
    }
    return Object.freeze({ html, inspect, roll, choose, enter, rules });
})();
safeExposeGlobals({ atlasBoardUi });
