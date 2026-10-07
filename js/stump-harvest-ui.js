// 수확 일지와 그루터기 함 해금(2026-10-07 해금 1차, docs/stump-box-unlocks-review-20261007.md): 처음 다 자란 꽃, 열매, 호박석 × 4색
// 12칸, 줄을 채우면 받는 선물(색을 골라 씨앗이나 수액 1개), 해금 목록(보관함, 뿌리 기억), 새로 열린 해금과 조합법, 뿌리 기억의 알림.
// 그리기와 클릭은 js/stump-box-ui.js가 맡고(#stump-box-harvest, 'harvest-gift'), 규칙과 계산은 js/stump-box.js와 js/stump-cube.js.
const stumpHarvestUi = (() => {
    const COLORS = Object.keys(STUMP_BOX_COLORS);
    const ROWS = Object.keys(STUMP_BOX_HARVEST.rows);
    const ROW_LABELS = Object.freeze({ flower: '꽃', fruit: '열매', amber: '호박석' });

    function esc(text) { return escapeHTML(String(text)); }
    function tone(color) { return STUMP_BOX_COLORS[color].tone; }

    // ── 수확 일지 ───────────────────────────────────────────
    function journalCell(row, color, grown) {
        const key = `${row}-${color}`, on = grown.has(key), name = `${STUMP_BOX_COLORS[color].label} ${ROW_LABELS[row]}`;
        return `<span class="stump-harvest-cell${on ? ' is-on' : ''}" style="--stump-tone:${tone(color)}" title="${esc(on ? name : `${name} (아직)`)}">`
            + `<img src="assets/px/stump/${key}.png" alt="${esc(name)}" draggable="false"></span>`;
    }
    function journalRow(row, grown) {
        return `<div class="stump-harvest-row"><span>${ROW_LABELS[row]}</span>${COLORS.map(color => journalCell(row, color, grown)).join('')}</div>`;
    }
    /** Where an unlock comes from. A hidden journal page keeps its name until it is found. */
    function unlockWhen(row, open) {
        const when = row.when;
        if (when.harvestRows) return `수확 일지 ${when.harvestRows}줄`;
        if (when.loop) return `루프 ${when.loop}`;
        const page = JOURNAL_DB[when.journal];
        return open || !page.hidden ? `저널 '${page.title}'` : '숨은 저널';
    }
    function unlocksHtml() {
        const open = new Set(stumpBox.openUnlocks(game).map(row => row.id));
        return '<ul class="stump-unlocks">' + STUMP_BOX_UNLOCKS.map(row => `<li class="${open.has(row.id) ? 'is-on' : ''}">`
            + `<strong>${esc(row.label)}</strong><small>${esc(unlockWhen(row, open.has(row.id)))}</small></li>`).join('') + '</ul>';
    }
    /** The journal panel: 3 rows × 4 colours (grown ones lit) and the box's unlocks. */
    function journalHtml() {
        const grown = new Set(game.stumpBox.harvest.grown);
        return `<h3>수확 일지 <small>${grown.size}/${ROWS.length * COLORS.length}</small></h3>`
            + `<div class="stump-harvest-grid">${ROWS.map(row => journalRow(row, grown)).join('')}</div>`
            + '<p class="stump-hint">처음 다 자란 것을 적습니다. 한 줄을 채우면 그 줄의 씨앗이나 수액 하나를 골라 받습니다.</p>'
            + `<h3>함 해금</h3>${unlocksHtml()}`;
    }

    // ── 줄 선물 ─────────────────────────────────────────────
    function giftRow(row) {
        const family = STUMP_BOX_HARVEST.rows[row], kind = STUMP_BOX_STAGES[family].label;
        const buttons = COLORS.map(color => `<button type="button" data-stump-action="harvest-gift" data-row="${row}" data-color="${color}"`
            + ` style="--stump-tone:${tone(color)}" aria-label="${STUMP_BOX_COLORS[color].label} ${kind} 받기">`
            + `<img src="assets/px/stump/${family}-${color}.png" alt="" draggable="false">${STUMP_BOX_COLORS[color].label}</button>`).join('');
        return `<div class="stump-starter-row"><span>${ROW_LABELS[row]} 줄</span>${buttons}</div>`;
    }
    /** Completed rows whose gift is waiting: pick a colour (the same buttons as the starter gift). */
    function giftsHtml() {
        const rows = stumpBox.pendingGifts(game);
        if (!rows.length) return '';
        return `<h3>수확 일지 선물 <small>품질 ${Math.round(STUMP_BOX_HARVEST.giftRoll * 100)}%</small></h3>${rows.map(giftRow).join('')}`;
    }

    // ── 알림 ───────────────────────────────────────────────
    function describeUnlock(row) {
        if (row.storage) return `보관함 +${row.storage}칸 (${unlockWhen(row, true)})`;
        return `뿌리 기억 ${row.keepPct}%: 새 루프에 다 자란 것이 ${row.keepPct}% 자란 채로 다시 자랍니다 (${unlockWhen(row, true)}).`;
    }
    /** Unlocks that opened since they were last announced, on one card (a veteran's first load opens several at once). */
    function announceUnlocks() {
        if (game.isBackgroundCalculation || !game.stumpBox.acquired) return;
        const seen = game.seenTutorials = game.seenTutorials || [];
        const fresh = stumpBox.openUnlocks(game).filter(row => !seen.includes(`unlock_stump_${row.id}`));
        if (!fresh.length) return;
        fresh.slice(1).forEach(row => seen.push(`unlock_stump_${row.id}`));
        game.noti.stump = true;
        queueTutorialNotice(`unlock_stump_${fresh[0].id}`, '그루터기 함 해금', `${fresh.map(describeUnlock).join('\n')}\n‘그루터기 함’의 함 해금에서 볼 수 있습니다.`, 'tab-stump');
    }
    /** New recipes in the cube's book (조합법 발견): a toast and a log line. The first call on a save records silently. */
    function announceRecipes() {
        if (game.isBackgroundCalculation || !game.stumpBox.acquired) return;
        const found = stumpCube.learn(game);
        if (!found.length) return;
        const names = found.map(recipe => recipe.name).join(', ');
        game.noti.stump = true;
        addLog(`🧩 새 조합법: ${names}`, 'loot-rare');
        showGameToast(`새 조합법: ${names}`, { tone: 'success' });
    }
    /** Once, when journal pages first add graft points (C2). */
    function announceGraftJournal() {
        const points = stumpBox.graftJournalPoints(game);
        if (!stumpBox.graftOpen(game) || points <= 0) return;
        queueTutorialNotice('unlock_stump_graft_journal', '저널 접붙이기 점수',
            `정점 보스와 버려진 날의 저널이 접붙이기 점수를 더합니다(정점 +3, 버려진 날 +2, 지금 +${points}).`, 'tab-stump');
    }
    /** A new loop sent grown items back (js/stump-box.js regress): say how far they kept growing. */
    function announceRegress(detail) {
        if (!detail.count) return;
        addLog(detail.keepPct > 0 ? `🌱 그루터기 함: 다 자란 ${detail.count}개가 뿌리 기억으로 ${detail.keepPct}% 자란 채 다시 자랍니다.`
            : `🌱 그루터기 함: 다 자란 ${detail.count}개가 새 루프에 씨앗과 수액으로 돌아가 다시 자랍니다.`, 'season-up');
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('project-idle:stump-box-regressed', event => announceRegress(event.detail || {}));
    }

    return Object.freeze({ journalHtml, giftsHtml, announceUnlocks, announceRecipes, announceGraftJournal, describeUnlock });
})();
safeExposeGlobals({ stumpHarvestUi });
