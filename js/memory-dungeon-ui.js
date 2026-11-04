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
        if (!model || model.node.id !== nodeId || model.tier !== Number(tier)) return addLog(_t('도전할 기억을 다시 선택하세요.'), 'attack-monster');
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
        if (!step.have && row.best !== step.tier) return `<span class="memory-tier is-empty">${_t('{tier}단계', { tier: step.tier })}</span>`;
        const on = selected?.node.id === row.node.id && selected.tier === step.tier;
        const label = _t('{boss}의 기억 {tier}단계 준비 보기', { boss: row.node.boss, tier: step.tier });
        const note = step.have ? _t('{have}개', { have: step.have }) : '승리 기록';
        return `<button type="button" class="memory-tier" onclick="memoryDungeonUi.select('${row.node.id}', ${step.tier})" aria-label="${esc(label)}" aria-pressed="${on}">
            <strong>${_t('{tier}단계', { tier: step.tier })}</strong><small>${note}</small>${step.tier > memoryDungeon.maxTier(game) ? _t('<small>잠김</small>') : ''}</button>`;
    }
    function cardHtml(row, selected) {
        const where = row.node.region ? (ATLAS.regions.find(region => region.id === row.node.region) || {}).name : row.node.name;
        return `<div class="memory-card"><strong>${esc(row.node.boss)}</strong><small>${esc(where)}${row.best ? _t(', 이긴 단계 {best}', { best: row.best }) : ''}</small>
            <div class="memory-tiers">${row.tiers.map(step => tierButton(row, step, selected)).join('')}</div></div>`;
    }
    function currentRunHtml() {
        const run = game.atlas.run;
        if (!run) return '';
        const name = atlas.node(run.map.node).boss, memory = run.map.memory ? _t(' (기억 {memory}단계)', { memory: run.map.memory }) : '';
        return `<section class="memory-current-run" aria-label="${_t('열린 지도')}"><strong>${_t('진행 중인 도전이 있습니다')}</strong><p>${_t('{name}{memory}, 남은 포털 {portals}개', { name: esc(name), memory, portals: run.portals })}</p>
            <button type="button" onclick="memoryDungeonUi.showMaps()">${_t('열린 지도 보기')}</button></section>`;
    }
    function currencyReward(row) {
        const amount = row.min === row.max ? _t('{min}개', { min: row.min }) : _t('{min}~{max}개 ({extraChance}로 {max2}개)', { min: row.min, max: row.max, extraChance: percent(row.extraChance), max2: row.max });
        return `<li><span>${getStyledOrbName(row.key)}</span><b>${amount}</b></li>`;
    }
    function nextReward(next) {
        if (!next) return '최고 단계입니다. 다음 단계 기억은 없습니다.';
        if (next.reason) return next.reason;
        return _t('승리 시 {chance} 확률로 {tier}단계 기억 1개 (현재 {have}/{cap}개)', { chance: percent(next.chance), tier: next.tier, have: next.have, cap: next.cap });
    }
    function rewardsHtml(model) {
        const name = model.unique.name || '무작위 고유 장비';
        const gear = model.gear ? '<p>추가 희귀 장비 1개 확정</p>' : '';
        return `<div class="memory-rewards"><p><b>${esc(name)}</b> ${percent(model.unique.chance)}</p>
            <p class="atlas-muted">${_t('옵션 한 줄 뒤바뀜 {swapChance}', { swapChance: percent(model.unique.swapChance) })}</p>
            <p>${esc(nextReward(model.next))}</p><details><summary>${_t('기억 전용 보상 자세히')}</summary>${gear}<ul>${model.rewards.map(currencyReward).join('')}</ul></details></div>`;
    }
    function preparationHtml(model) {
        if (!model) return '';
        const why = model.reason || departBlock();
        return `<section class="memory-preparation" tabindex="-1" aria-labelledby="memory-preparation-title"><h3 id="memory-preparation-title">${_t('{boss}의 기억 {tier}단계', { boss: esc(model.node.boss), tier: model.tier })}</h3>
            <p class="memory-preparation-meta">${model.map.tier}등급, 보유 ${model.have}개${model.best ? _t(', 최고 승리 {best}단계', { best: model.best }) : ''}</p>
            ${buildMapPowerEstimateHtml(atlas.preview(game, model.map), { hideReward: true })}${rewardsHtml(model)}
            <p class="memory-entry-cost">${_t('입장 비용: 이 기억 1개와 장착 각인')}</p>
            ${why ? `<p class="atlas-lock" id="memory-entry-reason">${esc(why)}</p>` : ''}
            <button type="button" class="atlas-primary memory-challenge" data-exploration-departure onclick="memoryDungeonUi.challenge('${model.node.id}',${model.tier})"
                ${why ? 'disabled aria-describedby="memory-entry-reason"' : ''}>${_t('기억 1개로 도전')}</button></section>`;
    }
    const hasHeld = row => row.counts.some(count => count > 0);
    function controlsHtml(rows) {
        if (!rows.length) return '';
        const options = [['held', '보유 기억', rows.filter(hasHeld).length], ['records', '승리 기록', rows.filter(row => row.best > 0).length]];
        return `<div class="memory-controls"><nav aria-label="${_t('기억 목록')}">${options.map(([id, label, count]) => `<button type="button" data-memory-filter="${id}" aria-pressed="${filter === id}"
            onclick="memoryDungeonUi.setFilter('${id}')">${_t('{label} {count}종', { label, count })}</button>`).join('')}</nav>
            <label for="memory-boss-search">${_t('보스 이름으로 찾기')}<input id="memory-boss-search" type="search" value="${esc(query)}" placeholder="${_t('보스 또는 지역 이름')}"
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
        return `<section class="memory-empty"><p>${_t('보유한 기억이 없습니다.')}</p>
            ${game.atlas.run ? '' : _t('<button type="button" onclick="memoryDungeonUi.showMaps()">지도 준비 보기</button>')}</section>`;
    }
    function html() {
        const rows = memoryDungeon.overview(game), selected = selectedPreview(), shown = visibleRows(rows), block = departBlock();
        const head = memoryDungeon.open(game) ? '' : '기억 던전 해금 뒤에 아틀라스의 보스가 기억을 남깁니다.';
        const tiers = memoryDungeon.maxTier(game) < M.tiers ? _t('1~{value}단계 ({from}~{tiers}단계는 기억 던전 4, 5 해금 뒤)', { value: M.highTiers.from - 1, from: M.highTiers.from, tiers: M.tiers }) : _t('1~{tiers}단계 도전 가능', { tiers: M.tiers });
        const list = shown.length ? `<div class="memory-cards">${shown.map(row => cardHtml(row, selected)).join('')}</div>` : emptyHtml();
        return `<div class="atlas-late memory-dungeon"><section class="atlas-late-head"><h3>${_t('기억 던전')}</h3>${head ? `<p class="atlas-muted">${head}</p>` : ''}<p class="atlas-muted">${_t('{tiers}, 보유 {total}개', { tiers, total: memoryDungeon.total(game) })}</p>
            ${block && !game.atlas.run ? `<p class="atlas-lock">${esc(block)}</p>` : ''}</section>${currentRunHtml()}${preparationHtml(selected)}${controlsHtml(rows)}${list}${bossVariantsUi.recordHtml()}</div>`;
    }

    // ---------------------------------------------------------------- log lines ('complete' carries result.memory, js/atlas.js complete)
    function spoilsLines(spoils) {
        const currencies = spoils.rewards.map(([key, amount]) => `${_t(ORB_DB[key].name)} ${amount}`).join(', ');
        addLog(_t('🕯️ 기억 {tier}단계 승리{best}: {currencies}', { tier: spoils.tier, best: spoils.best ? ` ${_t('(새 기록)')}` : '', currencies: currencies || _t('재화 없음') }), 'loot-unique', { toast: true });
        (spoils.items || []).forEach(item => addLog(_t("🛡️ 기억의 보상 <span class='loot-{rarity}'>[{item}]</span>", { rarity: item.rarity, item: esc(getItemDisplayName(item)) }), item.rarity === 'unique' ? 'loot-unique' : 'loot-rare', { item }));
    }
    function announce(detail) {
        const memory = detail.kind === 'complete' ? detail.memory : null;
        if (!memory) return;
        if (memory.spoils) spoilsLines(memory.spoils);
        if (memory.ticket) addLog(_t('🕯️ {name}의 기억 {tier}단계를 얻었습니다(아틀라스의 기억 보기).', { name: esc(_t(memory.ticket.name)), tier: memory.ticket.tier }), 'loot-unique', { toast: true });
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ html, select, challenge, setFilter, search, showMaps });
})();
safeExposeGlobals({ memoryDungeonUi });
