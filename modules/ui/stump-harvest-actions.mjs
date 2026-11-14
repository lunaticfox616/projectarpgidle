import { rewardsBody, pendingRewardCount, unlockWhen } from './stump-harvest-markup.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

/** Opens (or redraws) the rewards window. Pouch offers rolled just now are saved at once, so a reload shows the same three. */
export function openRewards(runtime) {
    if (!runtime.active) return;
    const fresh = runtime.deps.stumpBox.pendingPouches(runtime.deps.game).some(id => !runtime.deps.game.stumpBox.pouches.offers[id]);
    const panel = runtime.deps.selectionDialog.show({ id: runtime.state.REWARD_DIALOG, title: (0, runtime.deps._t)('받을 보상'), panelClass: 'stump-reward-panel', body: rewardsBody(runtime) });
    if (fresh) (0, runtime.deps.queueImportantSave)(300);
    const overlay = panel && panel.parentElement;
    runtime.state.rewardOwner = runtime.deps.game;
    if (overlay && overlay !== runtime.state.rewardOverlay) {
        if (runtime.state.rewardOverlay) releaseViewTarget(runtime, runtime.state.rewardOverlay);
        runtime.state.rewardOverlay = overlay;
        listenView(runtime, overlay, 'click', runtime.handlers.onRewardClick);
    }
}

export function onRewardClick(runtime, event) {
    if (!runtime.active || runtime.state.rewardOwner !== runtime.deps.game) {
        if (runtime.state.rewardOverlay?.isConnected) runtime.deps.selectionDialog.close(runtime.state.REWARD_DIALOG);
        return;
    }
    const gift = event.target.closest('[data-reward-gift]'), pouch = event.target.closest('[data-reward-pouch]');
    if (gift) runtime.deps.stumpBoxUi.claimReward('gift', gift.dataset.rewardGift, gift.dataset.color);
    else if (pouch) runtime.deps.stumpBoxUi.claimReward('pouch', pouch.dataset.rewardPouch, Number(pouch.dataset.index));
    else return;
    if (pendingRewardCount(runtime)) openRewards(runtime);
    else runtime.deps.selectionDialog.close(runtime.state.REWARD_DIALOG);
}

export function describeUnlock(runtime, row) {
    const text = runtime.state.UNLOCK_TEXTS.find(([test]) => test(row));
    return `${text ? text[1](row) : row.label} (${unlockWhen(runtime, row, true)})`;
}

/** Unlocks that opened since they were last announced, on one card (a veteran's first load opens several at once). */
export function announceUnlocks(runtime) {
    if (runtime.deps.game.isBackgroundCalculation || !runtime.deps.game.stumpBox.acquired) return;
    const seen = runtime.deps.game.seenTutorials = runtime.deps.game.seenTutorials || [];
    const fresh = runtime.deps.stumpBox.openUnlocks(runtime.deps.game).filter(row => !seen.includes(`unlock_stump_${row.id}`));
    if (!fresh.length) return;
    fresh.slice(1).forEach(row => seen.push(`unlock_stump_${row.id}`));
    runtime.deps.game.noti.stump = true;
    (0, runtime.deps.queueTutorialNotice)(`unlock_stump_${fresh[0].id}`, (0, runtime.deps._t)('그루터기 함 해금'), `${fresh.map(runtime.handlers.describeUnlock).join('\n')}\n‘그루터기 함’의 함 해금에서 볼 수 있습니다.`, 'tab-stump');
}

/** New recipes in the cube's book (조합법 발견): a toast and a log line. The first call on a save records silently. */
export function announceRecipes(runtime) {
    if (runtime.deps.game.isBackgroundCalculation || !runtime.deps.game.stumpBox.acquired) return;
    const found = runtime.deps.stumpCube.learn(runtime.deps.game);
    if (!found.length) return;
    const names = found.map(recipe => (0, runtime.deps._t)(recipe.name)).join(', ');
    runtime.deps.game.noti.stump = true;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🧩 새 조합법: {names}', { names }), 'loot-rare');
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)('새 조합법: {names}', { names }), { tone: 'success' });
}

/** Once, when journal pages first add graft points (C2). */
export function announceGraftJournal(runtime) {
    const points = runtime.deps.stumpBox.graftJournalPoints(runtime.deps.game);
    if (!runtime.deps.stumpBox.graftOpen(runtime.deps.game) || points <= 0) return;
    (0, runtime.deps.queueTutorialNotice)('unlock_stump_graft_journal', (0, runtime.deps._t)('저널 접붙이기 점수'),
        (0, runtime.deps._t)('정점 보스와 버려진 날의 저널이 접붙이기 점수를 더합니다(정점 +3, 버려진 날 +2, 지금 +{points}).', { points }), 'tab-stump');
}

/** A new loop (js/stump-box.js regress): what the scars ate, what bred, what the seal cells kept, and how many items went. */
export function announceRegress(runtime, detail) {
    runtime.deps.stumpRipeningUi.regressLog(detail);
    if (detail.count) (0, runtime.deps.addLog)((0, runtime.deps._t)('🌱 그루터기 함: 봉인 칸 밖의 아이템 {count}개가 루프와 함께 사라졌습니다.', { count: detail.count }), 'season-up');
}

export function graftRankAt(runtime, row) { return runtime.deps.STUMP_BOX_UNLOCKS.slice(0, runtime.deps.STUMP_BOX_UNLOCKS.indexOf(row) + 1)
        .reduce((sum, next) => sum + (next.graftRanks || 0), runtime.deps.STUMP_BOX_GRAFT.maxRank); }
