// 기억 던전 화면(12번 루프 21, js/memory-dungeon.js): 아틀라스의 '기억' 보기(단계 선택 → 준비 → 도전)와, 보스가 남긴 기억,
// 이긴 기억 싸움의 보상 기록. 싸움 출발은 js/atlas-run.js openMemory, 보상 지급은 그 grantSpoils가 한다.
const memoryDungeonUi = (() => {
    const M = MEMORY_DUNGEON;
    const esc = value => escapeHTML(String(value));
    let selection = null, filter = 'held', query = '';
    const percent = chance => `${Number((chance * 100).toFixed(2))}%`;
    function selectedPreview() {
        if (!selection || selection.owner !== game || selection.book !== game.atlas.memory) return null;
        return memoryDungeon.preview(game, selection.node, selection.tier);
    }
    /** Preparation only, also used by the last-result link after earning a memory. */
    function select(nodeId, tier) {
        const model = memoryDungeon.preview(game, nodeId, Number(tier));
        if (!model) return;
        selection = { owner: game, book: game.atlas.memory, node: nodeId, tier: model.tier };
        filter = model.have ? 'held' : 'records'; query = '';
        atlasUi.refresh();
        const panel = document.querySelector('#ui-atlas .memory-preparation');
        panel?.focus({ preventScroll: true });
        panel?.scrollIntoView({ block: 'start' });
    }
    function challenge(nodeId, tier) {
        const model = selectedPreview();
        if (!model || model.node.id !== nodeId || model.tier !== Number(tier)) return addLog('도전할 기억을 다시 선택하세요.', 'attack-monster');
        const reason = atlasRun.openMemory(nodeId, Number(tier));
        if (reason) { addLog(reason, 'attack-monster'); atlasUi.refresh(); return; }
        queueImportantSave(200);
        atlasUi.refresh();
        switchTab('tab-battle');
    }
    function setFilter(value, clearSearch = false) {
        if (!['held', 'records'].includes(value)) return;
        filter = value; selection = null;
        if (clearSearch) query = '';
        atlasUi.refresh();
        document.querySelector(`#ui-atlas [data-memory-filter="${filter}"]`)?.focus({ preventScroll: true });
    }
    function search(value) {
        query = String(value); selection = null;
        atlasUi.refresh();
        const input = document.querySelector('#memory-boss-search');
        input?.focus({ preventScroll: true });
        input?.setSelectionRange(query.length, query.length);
    }
    function showMaps() {
        atlasUi.setView('maps');
        if (game.atlas.run) return atlasUi.revealDevice();
        const map = game.atlas.stash[0];
        if (map) return atlasUi.selectMap(map.uid, true);
        document.querySelector('#ui-atlas .atlas-journey')?.scrollIntoView({ block: 'start' });
    }
    /** Why no memory fight can depart right now (said once above the list). */
    function departBlock() {
        return atlas.runOpenReason(game) || atlas.lockReason(game) || atlasRun.blockReason();
    }
    function tierButton(row, step, selected) {
        if (!step.have && row.best !== step.tier) return `<span class="memory-tier is-empty">${step.tier}단계</span>`;
        const on = selected?.node.id === row.node.id && selected.tier === step.tier;
        const label = `${row.node.boss}의 기억 ${step.tier}단계 준비 보기`;
        const note = step.have ? `${step.have}개` : '승리 기록';
        return `<button type="button" class="memory-tier" onclick="memoryDungeonUi.select('${row.node.id}', ${step.tier})" aria-label="${esc(label)}" aria-pressed="${on}">
            <strong>${step.tier}단계</strong><small>${note}</small>${step.tier > memoryDungeon.maxTier(game) ? '<small>잠김</small>' : ''}</button>`;
    }
    function cardHtml(row, selected) {
        const where = row.node.region ? (ATLAS.regions.find(region => region.id === row.node.region) || {}).name : row.node.name;
        return `<div class="memory-card"><strong>${esc(row.node.boss)}</strong><small>${esc(where)}${row.best ? `, 이긴 단계 ${row.best}` : ''}</small>
            <div class="memory-tiers">${row.tiers.map(step => tierButton(row, step, selected)).join('')}</div></div>`;
    }
    function currentRunHtml() {
        const run = game.atlas.run;
        if (!run) return '';
        const name = atlas.node(run.map.node).boss, memory = run.map.memory ? ` (기억 ${run.map.memory}단계)` : '';
        return `<section class="memory-current-run" aria-label="열린 지도"><strong>진행 중인 도전이 있습니다</strong><p>${esc(name)}${memory}, 남은 포털 ${run.portals}개</p>
            <button type="button" onclick="memoryDungeonUi.showMaps()">열린 지도 보기</button></section>`;
    }
    function currencyReward(row) {
        const amount = row.min === row.max ? `${row.min}개` : `${row.min}~${row.max}개 (${percent(row.extraChance)}로 ${row.max}개)`;
        return `<li><span>${getStyledOrbName(row.key)}</span><b>${amount}</b></li>`;
    }
    function nextReward(next) {
        if (!next) return '최고 단계입니다. 다음 단계 기억은 없습니다.';
        if (next.reason) return next.reason;
        return `승리 시 ${percent(next.chance)} 확률로 ${next.tier}단계 기억 1개 (현재 ${next.have}/${next.cap}개)`;
    }
    function rewardsHtml(model) {
        const name = model.unique.name || '무작위 고유 장비';
        const gear = model.gear ? '<p>추가 희귀 장비 1개 확정</p>' : '';
        return `<div class="memory-rewards"><p><b>${esc(name)}</b> ${percent(model.unique.chance)}</p>
            <p class="atlas-muted">옵션 한 줄 뒤바뀜 ${percent(model.unique.swapChance)}</p>
            <p>${esc(nextReward(model.next))}</p><details><summary>기억 전용 보상 자세히</summary>${gear}<ul>${model.rewards.map(currencyReward).join('')}</ul></details></div>`;
    }
    function preparationHtml(model) {
        if (!model) return '';
        const why = model.reason || departBlock();
        return `<section class="memory-preparation" tabindex="-1" aria-labelledby="memory-preparation-title"><h3 id="memory-preparation-title">${esc(model.node.boss)}의 기억 ${model.tier}단계</h3>
            <p class="memory-preparation-meta">${model.map.tier}등급, 보유 ${model.have}개${model.best ? `, 최고 승리 ${model.best}단계` : ''}</p>
            ${buildMapPowerEstimateHtml(atlas.preview(game, model.map), { hideReward: true })}${rewardsHtml(model)}
            <p class="memory-entry-cost">입장 비용: 이 기억 1개와 장착 각인</p>
            ${why ? `<p class="atlas-lock" id="memory-entry-reason">${esc(why)}</p>` : ''}
            <button type="button" class="atlas-primary memory-challenge" data-exploration-departure onclick="memoryDungeonUi.challenge('${model.node.id}',${model.tier})"
                ${why ? 'disabled aria-describedby="memory-entry-reason"' : ''}>기억 1개로 도전</button></section>`;
    }
    const hasHeld = row => row.counts.some(count => count > 0);
    function controlsHtml(rows) {
        if (!rows.length) return '';
        const options = [['held', '보유 기억', rows.filter(hasHeld).length], ['records', '승리 기록', rows.filter(row => row.best > 0).length]];
        return `<div class="memory-controls"><nav aria-label="기억 목록">${options.map(([id, label, count]) => `<button type="button" data-memory-filter="${id}" aria-pressed="${filter === id}"
            onclick="memoryDungeonUi.setFilter('${id}')">${label} ${count}종</button>`).join('')}</nav>
            <label for="memory-boss-search">보스 이름으로 찾기<input id="memory-boss-search" type="search" value="${esc(query)}" placeholder="보스 또는 지역 이름"
                oninput="if(!event.isComposing)memoryDungeonUi.search(this.value)" oncompositionend="memoryDungeonUi.search(this.value)"></label></div>`;
    }
    function visibleRows(rows) {
        const term = query.trim().toLocaleLowerCase();
        return rows.filter(row => filter === 'held' ? hasHeld(row) : row.best > 0).filter(row => {
            const region = ATLAS.regions.find(entry => entry.id === row.node.region);
            return [row.node.boss, row.node.name, region?.name].join(' ').toLocaleLowerCase().includes(term);
        });
    }
    function emptyHtml() {
        if (query.trim()) return '<p class="memory-empty">이름이 일치하는 기억이 없습니다.</p>';
        if (filter === 'records') return '<p class="memory-empty">아직 승리 기록이 없습니다.</p>';
        return `<section class="memory-empty"><p>보유한 기억이 없습니다.</p>
            ${game.atlas.run ? '' : '<button type="button" onclick="memoryDungeonUi.showMaps()">지도 준비 보기</button>'}</section>`;
    }
    function html() {
        const rows = memoryDungeon.overview(game), selected = selectedPreview(), shown = visibleRows(rows), block = departBlock();
        const head = memoryDungeon.open(game) ? '' : `루프 ${M.minLoop}부터 아틀라스의 보스가 기억을 남깁니다.`;
        const tiers = game.season < M.highTiers.loop ? `1~${M.highTiers.from - 1}단계 (${M.highTiers.from}~${M.tiers}단계는 루프 ${M.highTiers.loop}부터)` : `1~${M.tiers}단계 도전 가능`;
        const list = shown.length ? `<div class="memory-cards">${shown.map(row => cardHtml(row, selected)).join('')}</div>` : emptyHtml();
        return `<div class="atlas-late memory-dungeon"><section class="atlas-late-head"><h3>기억 던전</h3>${head ? `<p class="atlas-muted">${head}</p>` : ''}<p class="atlas-muted">${tiers}, 보유 ${memoryDungeon.total(game)}개</p>
            ${block && !game.atlas.run ? `<p class="atlas-lock">${esc(block)}</p>` : ''}</section>${currentRunHtml()}${preparationHtml(selected)}${controlsHtml(rows)}${list}${bossVariantsUi.recordHtml()}</div>`;
    }

    // ---------------------------------------------------------------- log lines ('complete' carries result.memory, js/atlas.js complete)
    function spoilsLines(spoils) {
        const currencies = spoils.rewards.map(([key, amount]) => `${ORB_DB[key].name} ${amount}`).join(', ');
        addLog(`🕯️ 기억 ${spoils.tier}단계 승리${spoils.best ? ' (새 기록)' : ''}: ${currencies || '재화 없음'}`, 'loot-unique', { toast: true });
        (spoils.items || []).forEach(item => addLog(`🛡️ 기억의 보상 <span class='loot-${item.rarity}'>[${esc(item.name)}]</span>`, item.rarity === 'unique' ? 'loot-unique' : 'loot-rare', { item }));
    }
    function announce(detail) {
        const memory = detail.kind === 'complete' ? detail.memory : null;
        if (!memory) return;
        if (memory.spoils) spoilsLines(memory.spoils);
        if (memory.ticket) addLog(`🕯️ ${esc(memory.ticket.name)}의 기억 ${memory.ticket.tier}단계를 얻었습니다(아틀라스의 기억 보기).`, 'loot-unique', { toast: true });
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ html, select, challenge, setFilter, search, showMaps });
})();
safeExposeGlobals({ memoryDungeonUi });
