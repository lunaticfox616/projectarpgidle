/** 세계수 껍질 화면(규칙은 js/world-tree-bark.js): 루프 패시브 창의 칸, 정산 화면에서 여는 배분 창, 포인트를 받은 알림. */
const worldTreeBarkUi = (() => {
    const DIALOG = 'bark-allocate-dialog';
    const esc = value => escapeHTML(String(value ?? ''));
    const statTones = () => ({ damage: getItemStatToneColor('pctDmg'), taken: getItemStatToneColor('dr'), move: getItemStatToneColor('move'), reach: '#9fd46a' });
    const barkStepsNow = () => getWorldTreeBarkLayers(game.season);
    const barkFixedText = count => `최대 생명력 +${count * WORLD_TREE_BARK.pctHp}%, 받는 피해 -${count * WORLD_TREE_BARK.taken}%`;
    const pointsIn = key => Math.max(0, Math.floor(Number(game.worldTreeBark[key]) || 0));
    /** Where the bark zone reaches, in the map's own words. */
    function barkReachText(zones) {
        const acts = WORLD_TREE_BARK.points.actTenZoneId + 1;
        return zones <= acts ? `액트 1~${zones}` : `액트 전체, 혼돈 1~${zones - acts}`;
    }
    /** What the points in one stat give now. */
    function barkStatValueText(def) {
        const total = pointsIn(def.key) * def.per;
        if (def.key === 'damage') return `${(1 + total / 100).toFixed(1)}배`;
        if (def.key === 'taken') return total ? `-${total}%` : '없음';
        if (def.key === 'move') return total ? `+${total}%` : '없음';
        return barkReachText(getWorldTreeBarkReach(game));
    }
    const perPointText = { damage: '1점당 +10%', taken: '1점당 -1%', move: '1점당 +1%', reach: '1점당 지역 1개' };
    /** A tree's cross-section: one ring a step, in the colours of where the points went. */
    function barkRingsHtml(count, size = 84) {
        const center = size / 2, pith = 5, step = Math.min(4, (center - pith - 3) / Math.max(1, count)), tones = statTones();
        const spent = WORLD_TREE_BARK.stats.flatMap(def => Array(pointsIn(def.key)).fill(tones[def.key]));
        const ringTone = at => (spent.length ? spent[Math.floor((at / count) * spent.length)] : '#3b2d1d');
        const rings = Array.from({ length: count }, (_, at) => `<circle cx="${center}" cy="${center}" r="${(pith + step * (at + 1)).toFixed(1)}" fill="none" stroke="${ringTone(at)}" stroke-width="${Math.max(1, step - 1).toFixed(1)}"/>`).join('');
        return `<svg class="bark-rings" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${center}" cy="${center}" r="${pith}" fill="#8a6a3e"/>${rings}</svg>`;
    }
    /** The thirty zones in order: cleared this loop, still ahead in the bark zone, past its reach. */
    function barkRouteHtml() {
        const reach = getWorldTreeBarkReach(game), acts = WORLD_TREE_BARK.points.actTenZoneId + 1, done = Math.max(0, Math.floor(game.maxZoneId || 0));
        const ticks = Array.from({ length: WORLD_TREE_BARK.maxZones }, (_, id) => {
            const state = id >= reach ? 'is-off' : (id < done ? 'is-cleared' : 'is-on');
            return `<i class="${state}${id === acts ? ' is-chaos-start' : ''}"></i>`;
        }).join('');
        return `<div class="bark-route"><span>껍질 구간</span><b>${esc(barkReachText(reach))}</b><div class="bark-route-ticks" aria-hidden="true">${ticks}</div></div>`;
    }
    function barkStatCardHtml(def, free, tones) {
        const now = pointsIn(def.key), full = def.max !== null && now >= def.max;
        const button = (label, delta, off) => `<button type="button" onclick="worldTreeBarkUi.moveBarkPoints('${def.key}',${delta})"${off ? ' disabled' : ''}>${label}</button>`;
        return `<article class="bark-stat" style="--stat-tone:${tones[def.key]}"><strong>${esc(def.label)}</strong><b>${esc(barkStatValueText(def))}</b><small>${perPointText[def.key]}, ${now}점</small>`
            + `<div class="bark-stat-buttons">${button('-5', -5, !now)}${button('-1', -1, !now)}${button('+1', 1, !free || full)}${button('+5', 5, !free || full)}</div></article>`;
    }
    function barkAllocateHtml() {
        const { free } = worldTreeBark.barkPoints(game), tones = statTones();
        return `<div class="bark-allocate-head"><span>남은 껍질 포인트</span><b>${free}</b><button type="button" onclick="worldTreeBarkUi.resetBarkAllocation()">다시 나누기</button></div>`
            + `${barkRouteHtml()}<div class="bark-stats">${WORLD_TREE_BARK.stats.map(def => barkStatCardHtml(def, free, tones)).join('')}</div>`;
    }
    /** Where the points come from, with the goals still open. */
    function barkSourcesHtml() {
        const rule = WORLD_TREE_BARK.points, journal = game.journalEntries || [];
        const kills = PINNACLE_FIRST_KILL_JOURNALS.filter(id => journal.includes(id)).length, have = game.worldTreeBark.timeGoals || [];
        const best = Math.floor(Number(((game.records || {}).actBest || {})[rule.actTenZoneId]) || 0);
        const goals = rule.actTenMinutes.map(goal => `<i class="${have.includes(goal) ? 'is-on' : ''}">${goal}분</i>`).join('');
        return `<ul class="bark-sources"><li><span>루프</span><b>+${rule.start + (game.season - rule.startLoop) * rule.perLoop}</b></li>`
            + `<li><span>정점 보스 첫 처치 ${kills}/${PINNACLE_FIRST_KILL_JOURNALS.length}</span><b>+${kills * rule.pinnacle}</b></li>`
            + `<li><span>액트 10 돌파 시간${best ? `, 최고 ${esc(formatRecordDuration(best))}` : ''}</span><em>${goals}</em><b>+${have.length * rule.actTenGoal}</b></li></ul>`;
    }
    function renderBarkPanel() {
        const section = document.getElementById('world-tree-bark-section'), panel = document.getElementById('world-tree-bark-panel');
        if (!section || !panel) return;
        const count = barkStepsNow(), next = WORLD_TREE_BARK.loops[count];
        section.style.display = count ? 'block' : 'none';
        if (!count) return;
        updateGamePanelMarkup(panel, `<div class="bark-head">${barkRingsHtml(count)}<div class="bark-head-copy"><b>${count}단계</b><span>${barkFixedText(count)}</span>${next ? `<small>다음 단계 루프 ${next}</small>` : ''}</div></div>`
            + `${barkAllocateHtml()}${barkSourcesHtml()}`);
    }
    function drawBarkDialog() {
        selectionDialog.show({ id: DIALOG, title: '세계수 껍질', panelClass: 'bark-dialog', body: barkAllocateHtml() });
    }
    const barkDialogOpen = () => !!document.getElementById(DIALOG);
    function refreshBarkScreens() {
        playerStatCache.invalidate();
        renderBarkPanel();
        if (barkDialogOpen()) drawBarkDialog();
        loopSettlementUi.render();
        updateStaticUI();
        queueImportantSave(200);
    }
    function refused() {
        const reason = worldTreeBark.barkAllocationRefusal(game);
        if (reason) addLog(reason, 'attack-monster', { toast: true });
        return !!reason;
    }
    function moveBarkPoints(key, delta) {
        if (refused()) return;
        if (worldTreeBark.allocateBarkPoints(game, key, delta)) refreshBarkScreens();
    }
    function resetBarkAllocation() {
        if (refused()) return;
        if (worldTreeBark.resetBarkPoints(game)) refreshBarkScreens();
    }
    function openBarkDialog() {
        if (!refused()) drawBarkDialog();
    }
    /** The loop screen's line: the steps, the points left and the button. Nothing before the first step. */
    function barkSettlementHtml() {
        const count = barkStepsNow();
        if (!count) return '';
        const { free } = worldTreeBark.barkPoints(game);
        return `<div class="loop-settlement-bark"><p>세계수 껍질 ${count}단계: ${barkFixedText(count)}</p>${free ? `<span>남은 껍질 포인트 ${free}</span>` : ''}<button type="button" onclick="worldTreeBarkUi.openBarkDialog()">껍질 포인트 나누기</button></div>`;
    }
    /** The map's mark on a zone the bark effect would hold in. */
    const barkMapChipHtml = zone => (isWorldTreeBarkZone(zone) ? '<span class="map-bark-chip">껍질 구간</span>' : '');
    window.addEventListener('project-idle:bark-points', event => {
        const { gain, why } = event.detail || {};
        if (barkStepsNow()) addLog(`🌿 껍질 포인트 +${gain}: ${why}`, 'season-up', { toast: true });
    });
    return Object.freeze({ renderBarkPanel, openBarkDialog, moveBarkPoints, resetBarkAllocation, barkSettlementHtml, barkMapChipHtml, barkDialogOpen });
})();

safeExposeGlobals({ worldTreeBarkUi });
