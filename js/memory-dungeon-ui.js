// 기억 던전 화면(12번 루프 21, js/memory-dungeon.js): 아틀라스의 '기억' 보기(보스마다 단계별 기억과 도전 단추)와, 보스가 남긴 기억,
// 이긴 기억 싸움의 보상 기록. 싸움 출발은 js/atlas-run.js openMemory, 보상 지급은 그 grantSpoils가 한다.
const memoryDungeonUi = (() => {
    const M = MEMORY_DUNGEON;
    const esc = value => escapeHTML(String(value));
    function challenge(nodeId, tier) {
        const reason = atlasRun.openMemory(nodeId, Number(tier));
        if (reason) return addLog(reason, 'attack-monster');
        queueImportantSave(200);
        atlasUi.refresh();
        switchTab('tab-battle');
    }
    /** Why no memory fight can depart right now (said once above the list). */
    function departBlock() {
        if (game.atlas.run) return '열린 지도를 마치거나 닫으면 도전할 수 있습니다.';
        return atlas.lockReason(game) || atlasRun.blockReason();
    }
    function tierButton(row, step, block) {
        if (!step.have) return `<span class="memory-tier is-empty">${step.tier}단계</span>`;
        const why = step.reason || block, label = `${row.node.boss}의 기억 ${step.tier}단계 도전`;
        return `<button class="memory-tier" data-exploration-departure onclick="memoryDungeonUi.challenge('${row.node.id}', ${step.tier})" aria-label="${esc(label)}"
            ${why ? `disabled title="${esc(why)}"` : ''}><strong>${step.tier}단계</strong><small>${step.have}개, ${step.mapTier}등급</small></button>`;
    }
    /** The memory dungeon's own reward (data/memory-dungeon.js swap): its uniques may come with one line swapped. */
    function swapNote() {
        const chances = (M.swap || []).map(chance => Math.round(chance * 100));
        if (!chances.length) return '';
        return `<p class="memory-swap-note">⟲ 뒤바뀐 고유: 기억의 고유는 1단계 ${chances[0]}%에서 ${chances.length}단계 ${chances[chances.length - 1]}%까지 줄 하나가 바뀐 채로 나옵니다.</p>`;
    }
    function cardHtml(row, block) {
        const where = row.node.region ? (ATLAS.regions.find(region => region.id === row.node.region) || {}).name : row.node.name;
        const unique = row.unique ? `<p class="atlas-late-unique">고유 장비 ${esc(row.unique)}</p>` : '';
        return `<div class="memory-card"><strong>${esc(row.node.boss)}</strong><small>${esc(where)}${row.best ? `, 이긴 단계 ${row.best}` : ''}</small>
            ${unique}<div class="memory-tiers">${row.tiers.map(step => tierButton(row, step, block)).join('')}</div></div>`;
    }
    function html() {
        const block = departBlock(), rows = memoryDungeon.open(game) ? memoryDungeon.overview(game) : [];
        const head = memoryDungeon.open(game)
            ? '아틀라스의 보스가 쓰러질 때 드물게 그 보스의 기억이 남습니다. 기억을 쓰면 그 보스만 있는 투기장이 열리고, 단계가 오를수록 세지고 보상이 커집니다. 이기면 다음 단계의 기억이 나올 수 있습니다.'
            : `루프 ${M.minLoop}부터 아틀라스의 보스가 기억을 남깁니다.`;
        const list = rows.length ? `<div class="memory-cards">${rows.map(row => cardHtml(row, block)).join('')}</div>`
            : (memoryDungeon.open(game) ? '<p class="atlas-muted">아직 모은 기억이 없습니다.</p>' : '');
        return `<div class="atlas-late memory-dungeon"><section class="atlas-late-head"><h3>기억 던전</h3><p class="atlas-muted">${head}</p>${memoryDungeon.open(game) ? swapNote() : ''}
            ${rows.length && block ? `<p class="atlas-lock">${esc(block)}</p>` : ''}</section>${list}${bossVariantsUi.recordHtml()}</div>`;
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
    return Object.freeze({ html, challenge });
})();
safeExposeGlobals({ memoryDungeonUi });
