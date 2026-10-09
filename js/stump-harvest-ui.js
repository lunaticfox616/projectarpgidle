// 수확 일지와 그루터기 함 해금(2026-10-07 해금 1차, docs/stump-box-unlocks-review-20261007.md): 처음 성장 완료된 꽃, 열매, 호박석 × 4색
// 12칸, 줄을 채우면 받는 보상(색을 골라 씨앗이나 수액 1개), 해금 목록(보관함, 뿌리 기억), 새로 열린 해금과 조합법, 뿌리 기억의 알림.
// 수확 일지와 함 해금은 그루터기 함 아래 탭에 하나씩 보인다(2026-10-09). 받을 보상(줄 완성 보상과 씨앗 주머니)은 머리줄 단추 하나와
// 그 단추가 여는 창이다. 16번의 부적 도감(부적 탭)과 루프 전환 소식(포식, 번식, 봉인 칸)은 js/stump-ripening-ui.js가 준다.
// 탭 그리기와 클릭은 js/stump-box-ui.js가 맡고(#stump-box-more 탭, 'rewards'), 규칙과 계산은 js/stump-box.js와 js/stump-cube.js.
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
        if (when.harvestCells) return `수확 일지 ${when.harvestCells}칸`;
        if (when.harvestRow) return `수확 일지 ${ROW_LABELS[when.harvestRow]} 줄`;
        if (when.loop) return `루프 ${when.loop}`;
        const page = JOURNAL_DB[when.journal];
        return open || !page.hidden ? `저널 '${page.title}'` : '숨은 저널';
    }
    /** One 함 해금 row: condition on the left, reward on the right (2026-10-09 사용자), open rows lit with a check mark. */
    function unlockRow(row, open) {
        return `<li class="${open ? 'is-on' : ''}"><span class="stump-unlock-mark" aria-label="${open ? '열림' : '잠김'}"></span>`
            + `<span class="stump-unlock-when">${esc(unlockWhen(row, open))}</span><span class="stump-unlock-arrow" aria-hidden="true">→</span>`
            + `<strong class="stump-unlock-reward">${esc(row.label)}</strong></li>`;
    }
    function unlocksHtml() {
        const open = new Set(stumpBox.openUnlocks(game).map(row => row.id));
        return '<div class="stump-unlocks-head" aria-hidden="true"><span>조건</span><span>보상</span></div>'
            + `<ul class="stump-unlocks">${STUMP_BOX_UNLOCKS.map(row => unlockRow(row, open.has(row.id))).join('')}</ul>`;
    }
    /** The 수확 일지 tab: 3 rows × 4 colours (grown ones lit; the count is on the tab) and what a full row gives. */
    function journalHtml() {
        const grown = new Set(game.stumpBox.harvest.grown);
        return `<div class="stump-harvest-grid">${ROWS.map(row => journalRow(row, grown)).join('')}</div>`
            + '<p class="stump-hint">한 줄을 채우면 보상을 받습니다.</p>';
    }

    // ── 받을 보상(2026-10-09 사용자: 단추 하나로 줄이고, 누르면 창에서 왜 받는지 한 줄과 함께 고른다) ──────────
    // 수확 일지 줄 완성 보상(색을 골라 씨앗이나 수액 1개)과 씨앗 주머니(셋 가운데 하나). 고르면 js/stump-box-ui.js claimReward가 받는다.
    const REWARD_DIALOG = 'stump-reward-dialog';
    function pendingRewardCount() { return stumpBox.pendingGifts(game).length + stumpBox.pendingPouches(game).length; }
    /** The head's one button (gold while something waits); '' when nothing does. */
    function rewardButtonHtml() {
        const count = pendingRewardCount();
        return count ? `<button type="button" class="stump-reward-button" data-stump-action="rewards">받을 보상 ${count}</button>` : '';
    }
    /** '화염 꽃 씨앗', '냉기 수액': what a choice gives. */
    function rewardName(family, color, path) {
        const colour = STUMP_BOX_COLORS[color].label;
        return family === 'sap' ? `${colour} 수액` : `${colour} ${STUMP_BOX_STAGES[path || 'flower'].label} 씨앗`;
    }
    function rewardChoice(attrs, family, color, path, note) {
        return `<button type="button" class="stump-reward-choice" ${attrs} style="--stump-tone:${tone(color)}">`
            + `<img src="assets/px/stump/${family}-${color}.png" alt="" draggable="false"><span>${esc(rewardName(family, color, path))}</span><small>${note}</small></button>`;
    }
    function giftSection(row) {
        const family = STUMP_BOX_HARVEST.rows[row], quality = `품질 ${Math.round(STUMP_BOX_HARVEST.giftRoll * 100)}%`;
        const choices = COLORS.map(color => rewardChoice(`data-reward-gift="${row}" data-color="${color}"`, family, color, row, quality)).join('');
        return `<section class="stump-reward"><h4>${ROW_LABELS[row]} 줄 완성 보상</h4>`
            + `<p>수확 일지의 ${ROW_LABELS[row]} 4색을 모두 성장 완료한 보상입니다. 색을 하나 고르세요.</p>`
            + `<div class="stump-reward-choices">${choices}</div></section>`;
    }
    /** Why a seed pouch came: the journal page of its unlock row. */
    function pouchReason(id) {
        const row = STUMP_BOX_UNLOCKS.find(entry => entry.id === id), page = row && JOURNAL_DB[row.when.journal];
        return page ? `저널 '${page.title}' 획득 보상입니다.` : '저널 획득 보상입니다.';
    }
    function pouchSection(id) {
        const choices = stumpBox.pouchOffers(game, id).map((offer, index) => rewardChoice(`data-reward-pouch="${esc(id)}" data-index="${index}"`,
            'seed', offer.color, offer.path, `품질 ${Math.round(offer.roll * 100)}%`)).join('');
        return `<section class="stump-reward"><h4>씨앗 주머니</h4><p>${esc(pouchReason(id))} 3개 중 1개를 고르세요.</p>`
            + `<div class="stump-reward-choices is-three">${choices}</div></section>`;
    }
    function rewardsBody() {
        const sections = stumpBox.pendingGifts(game).map(giftSection).concat(stumpBox.pendingPouches(game).map(pouchSection));
        return sections.join('') || '<p class="selection-overlay-help">받을 보상이 없습니다.</p>';
    }
    /** Opens (or redraws) the rewards window. Pouch offers rolled just now are saved at once, so a reload shows the same three. */
    function openRewards() {
        const fresh = stumpBox.pendingPouches(game).some(id => !game.stumpBox.pouches.offers[id]);
        const panel = selectionDialog.show({ id: REWARD_DIALOG, title: '받을 보상', panelClass: 'stump-reward-panel', body: rewardsBody() });
        if (fresh) queueImportantSave(300);
        const overlay = panel && panel.parentElement;
        if (overlay && !overlay.dataset.rewardBound) {
            overlay.dataset.rewardBound = '1';
            overlay.addEventListener('click', onRewardClick);
        }
    }
    function onRewardClick(event) {
        const gift = event.target.closest('[data-reward-gift]'), pouch = event.target.closest('[data-reward-pouch]');
        if (gift) stumpBoxUi.claimReward('gift', gift.dataset.rewardGift, gift.dataset.color);
        else if (pouch) stumpBoxUi.claimReward('pouch', pouch.dataset.rewardPouch, Number(pouch.dataset.index));
        else return;
        if (pendingRewardCount()) openRewards();
        else selectionDialog.close(REWARD_DIALOG);
    }

    // ── 알림 ───────────────────────────────────────────────
    /** The graft rank cap once this unlock is open: the base plus every graftRanks unlock up to it (the rows are in loop order). */
    const graftRankAt = row => STUMP_BOX_UNLOCKS.slice(0, STUMP_BOX_UNLOCKS.indexOf(row) + 1)
        .reduce((sum, next) => sum + (next.graftRanks || 0), STUMP_BOX_GRAFT.maxRank);
    // What each kind of unlock does, for its notice (the first match wins: 봉인 칸 1 also opens 포식).
    const UNLOCK_TEXTS = Object.freeze([
        [row => row.storage, row => `보관함 +${row.storage}칸`],
        [row => row.keepPct, row => `뿌리 기억 ${row.keepPct}%: 루프가 바뀌어도 성장 완료된 그루터기 아이템의 경험치 ${row.keepPct}% 유지`],
        [row => row.bulkCompost, () => '일괄 거름 사용: 보관함의 씨앗, 수액을 한 번에 거름으로 사용'],
        [row => row.breeding, () => '번식: 루프가 바뀔 때 성장 완료된 열매마다 보관함에 씨앗 1개(가끔 다른 색, 황금)'],
        [row => row.pouch, () => '씨앗 주머니: 무작위 씨앗 3개 중 1개 선택'],
        [row => row.devour, () => '봉인 칸 1, 포식: 봉인 칸은 루프가 바뀌어도 성장 상태 유지. 불씨의 흉터 1개 지급(루프가 바뀔 때 주변 1칸 흡수)'],
        [row => row.sealSlots, row => `봉인 칸 +${row.sealSlots}: 루프가 바뀌어도 성장 상태 유지`],
        [row => row.qualityCap, row => `품질 상한 ${Math.round(row.qualityCap * 100)}%${row.graftRanks ? `, 접붙이기 ${graftRankAt(row)}단계` : ''}`]
    ]);
    function describeUnlock(row) {
        const text = UNLOCK_TEXTS.find(([test]) => test(row));
        return `${text ? text[1](row) : row.label} (${unlockWhen(row, true)})${row.keepPct ? '.' : ''}`;
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
    /** A new loop (js/stump-box.js regress): what the scars ate, what bred, what the seal cells kept, and how far the grown
     * items that went back kept growing. */
    function announceRegress(detail) {
        stumpRipeningUi.regressLog(detail);
        if (!detail.count) return;
        addLog(detail.keepPct > 0 ? `🌱 그루터기 함: 성장 완료된 ${detail.count}개의 경험치가 초기화됐습니다(뿌리 기억 ${detail.keepPct}% 유지).`
            : `🌱 그루터기 함: 성장 완료된 ${detail.count}개의 경험치가 초기화됐습니다.`, 'season-up');
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('project-idle:stump-box-regressed', event => announceRegress(event.detail || {}));
    }

    return Object.freeze({ journalHtml, unlocksHtml, rewardButtonHtml, openRewards, announceUnlocks, announceRecipes, announceGraftJournal, describeUnlock });
})();
safeExposeGlobals({ stumpHarvestUi });
