/** 혼돈 심화 등반(루프 패시브 창 아래, 루프 10부터, 2026-10-09 사용자 "게임 전체에서 부족한 화면" 2순위). 한 줄에 길게 이어지던 루프 조건과
 * 평문 예상 획득을 바꿨다: 머리(현재 심화층, 심화 루프 포인트), 루프 조건 체크 목록(혼돈, 루프 31부터 우주계 갈래, 하나만 채우면 된다),
 * 루프와 혼돈 밖 단추, 기록된 층 다시 입장, 다음 루프 예상 획득 칩, 영구 강화(능력치 색 단추). 규칙은 js/state.js(루프 조건)와 js/ui.js(입장). */
const loopClimbUi = (() => {
    const esc = value => escapeHTML(String(value ?? ''));
    const season = () => Math.max(1, Math.floor(game.season || 1));

    /** Older saves lack these; the panel always wrote the defaults before drawing. */
    function ensureClimbState() {
        game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
        game.loopProgressBase = game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
        game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false };
    }
    /** The loop gates as rows: the chaos depth, and from loop 31 the cosmos planet (either one opens the loop). */
    function gateRows() {
        const cap = getSeasonAbyssDepthCap(season()), rows = [{ ok: hasCurrentLoopChaosRequirementClear(season()), text: `${cap > 20 ? '혼돈 심화' : '혼돈'} ${cap} 클리어` }];
        if (season() >= LOOP_GATE_ALT_START_SEASON) rows.push({ ok: hasCurrentLoopCosmosRequirementClear(season()), text: `우주계 ${LOOP_GATE_ALT_COSMOS_PLANET_NAME} 행성 돌파` });
        return rows;
    }
    function gateHtml() {
        const rows = gateRows();
        const list = rows.map(row => `<li class="${row.ok ? 'is-on' : 'is-off'}"><i></i>${esc(row.text)}</li>`).join('');
        return `<div class="climb-gates"><span>루프 조건${rows.length > 1 ? ' (하나만)' : ''}</span><ul>${list}</ul></div>`;
    }
    function buttonsHtml(ready) {
        const loops = season() >= 31
            ? `<button type="button" onclick="chooseLoopAdvancePath('chaos')" ${loopSettlementUi.resetButtonAttr(hasCurrentLoopChaosRequirementClear(season()))}>혼돈 루프</button>`
                + `<button type="button" onclick="chooseLoopAdvancePath('cosmos')" ${loopSettlementUi.resetButtonAttr(hasCurrentLoopCosmosRequirementClear(season()))}>우주계 루프</button>`
            : `<button type="button" onclick="triggerSeasonReset()" ${loopSettlementUi.resetButtonAttr(ready)}>지금 즉시 루프</button>`;
        return `<div class="climb-buttons">${loops}<button type="button" class="ominous-entry-btn" data-exploration-departure onclick="enterOutsideChaos()"${ready ? '' : ' disabled'}>혼돈 밖 진입</button></div>${loopSettlementUi.stallWarningHtml()}`;
    }
    function reentryHtml(open) {
        const top = Math.max(21, Math.floor(game.abyssEndlessDepth || 20));
        return `<div class="climb-reentry"><span>기록된 층 다시 입장</span><b>21 ~ ${top}층</b>`
            + `<button type="button" data-exploration-departure onclick="enterDeepChaosPrompt()"${open ? '' : ' disabled'}>${open ? '층 골라 입장' : '혼돈 20 클리어 필요'}</button></div>`;
    }
    /** Deep chaos floors cleared beyond this loop's start (the highest unlocked floor is the one after the last clear). */
    function depthGain() {
        const unlocked = game.abyssUnlockedDepths.map(value => Math.floor(value || 0)).filter(value => value >= 21);
        const highest = unlocked.length ? Math.max(...unlocked) : Math.floor(game.abyssEndlessDepth || 20);
        const cleared = Math.max(20, highest >= 21 ? highest - 1 : highest);
        return Math.max(0, Math.floor(cleared - (game.loopProgressBase.abyssEndlessDepth || 20)));
    }
    /** What the next loop banks: deep chaos floors, labyrinth floors, special bosses and woodsman points beyond this loop's start. */
    function gains() {
        const base = game.loopProgressBase, current = game.loopProgressCurrent;
        const woodsman = Math.max(0, Math.floor(game.woodsmanPendingScore || 0)) - Math.max(0, Math.floor(game.woodsmanSettledScore || 0));
        return [['혼돈 심화', depthGain(), '층'],
            ['고대 미궁', Math.max(0, Math.floor((game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1) - (base.labyrinthUnlockedMaxFloor || 1))), '층'],
            ['특수 보스', (current.specialBosses || []).filter(id => !(base.specialBosses || []).includes(id)).length, '종'],
            ['나무꾼', Math.floor(Math.sqrt(Math.max(0, woodsman)) / 25), '']];
    }
    function gainsHtml() {
        const chips = gains().map(([label, value, unit]) => `<span class="climb-gain${value > 0 ? ' is-up' : ''}"><b>+${value}${unit}</b><small>${label}</small></span>`).join('');
        return `<div class="climb-gains"><span>다음 루프 예상 획득</span><div>${chips}</div></div>`;
    }
    function growthHtml() {
        const stats = game.loopDeepStats || {}, tone = def => getItemStatToneColor(def.stat || 'pctDmg'), points = game.loopDeepPoints || 0;
        const buttons = LOOP_DEEP_STATS.map(def => `<button type="button" class="climb-stat" style="--stat-tone:${tone(def)}" onclick="allocateLoopDeepStat('${def.key}')">`
            + `<strong>${esc(def.label)}</strong><b>Lv.${stats[def.key] || 0}</b><small>합계 +${formatLoopDeepValue(def, stats[def.key])}, 레벨당 +${def.per}${def.unit}</small>`
            + `<em>비용 ${getLoopDeepStatCost(def.key)}</em></button>`).join('');
        return `<details id="loop-deep-growth" class="progression-workbench climb-growth" ${contentUnlockUi.lockAttribute('deepTree')}><summary>영구 강화<b>보유 포인트 ${points}</b></summary>`
            + `<div class="climb-stats">${buttons}</div></details>`;
    }
    function render() {
        const panel = document.getElementById('ui-loop10-panel'), section = document.getElementById('ui-loop10-section');
        if (!panel) return;
        const open = season() >= 10;
        if (section) section.style.display = open ? 'block' : 'none';
        if (!open) return;
        ensureClimbState();
        const ready = hasCurrentLoopAbyssRequirementClear(season()), deepOpen = hasCurrentLoopChaos20Clear();
        updateGamePanelMarkup(panel, `<div class="climb-head"><span class="climb-emblem" aria-hidden="true">∞</span><div><small>현재 심화층</small><b>${Math.floor(game.abyssEndlessDepth || 20)}</b></div>`
            + `<div><small>심화 루프 포인트</small><b class="is-points">${game.loopDeepPoints || 0}</b></div></div>`
            + `${gateHtml()}${buttonsHtml(ready)}${reentryHtml(deepOpen)}${gainsHtml()}${growthHtml()}`);
    }
    return Object.freeze({ render });
})();

safeExposeGlobals({ loopClimbUi });
