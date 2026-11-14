import { listenView, releaseViewEvents } from './view-events.mjs';
import { giftSection, pouchSection, walletHtml, journalHtml, unlocksHtml, rewardButtonHtml } from './stump-harvest-markup.mjs';
import { onRewardClick, describeUnlock, openRewards, announceUnlocks, announceRecipes, announceGraftJournal, announceRegress, graftRankAt } from './stump-harvest-actions.mjs';

export function createStumpHarvestView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { giftSection, pouchSection, onRewardClick, describeUnlock, walletHtml, journalHtml, unlocksHtml, rewardButtonHtml, openRewards, announceUnlocks, announceRecipes, announceGraftJournal };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = StumpHarvestViewApi(runtime);
    installStumpHarvestViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.COLORS = Object.keys(runtime.deps.STUMP_BOX_COLORS);
    runtime.state.ROWS = runtime.deps.STUMP_BOX_HARVEST.rows;
    runtime.state.REWARD_DIALOG = 'stump-reward-dialog';
    runtime.state.UNLOCK_TEXTS = Object.freeze([
        [row => row.storage, row => (0, runtime.deps._t)('보관함 +{storage}칸', { storage: row.storage })],
        [row => row.bulkCompost, () => '일괄 거름 사용: 보관함의 씨앗을 한 번에 거름으로 사용'],
        [row => row.breeding, () => '번식: 루프가 바뀔 때 성장 완료된 열매마다 보관함에 씨앗 1개(가끔 다른 색, 황금)'],
        [row => row.pouch, () => '씨앗 주머니: 무작위 씨앗 3개 중 1개 선택'],
        [row => row.devour, () => '봉인 칸 1, 포식: 봉인 칸의 아이템은 루프가 바뀌어도 사라지지 않음. 불씨의 흉터 1개 지급(봉인 칸에서 루프가 바뀔 때 주변 1칸 흡수)'],
        [row => row.rootMemory, row => (0, runtime.deps._t)('뿌리 기억: 봉인 칸 +{sealSlots}', { sealSlots: row.sealSlots })],
        [row => row.sealSlots, row => (0, runtime.deps._t)('봉인 칸 +{sealSlots}: 루프가 바뀌어도 그 칸의 아이템은 사라지지 않음', { sealSlots: row.sealSlots })],
        [row => row.qualityCap, row => `품질 상한 ${Math.round(row.qualityCap * 100)}%${row.graftRanks ? (0, runtime.deps._t)(', 접붙이기 {row}단계', { row: graftRankAt(runtime, row) }) : ''}`]
    ]);
}

function installStumpHarvestViewEvents(runtime) {
    if (typeof runtime.deps.window !== 'undefined' && typeof runtime.deps.window.addEventListener === 'function') {
        listenView(runtime, runtime.deps.window, 'project-idle:stump-box-regressed', event => announceRegress(runtime, event.detail || {}));
    }
}
function StumpHarvestViewApi(runtime) {
    return Object.freeze({
        walletHtml: runtime.handlers.walletHtml,
        journalHtml: runtime.handlers.journalHtml,
        unlocksHtml: runtime.handlers.unlocksHtml,
        rewardButtonHtml: runtime.handlers.rewardButtonHtml,
        openRewards: runtime.handlers.openRewards,
        announceUnlocks: runtime.handlers.announceUnlocks,
        announceRecipes: runtime.handlers.announceRecipes,
        announceGraftJournal: runtime.handlers.announceGraftJournal,
        describeUnlock: runtime.handlers.describeUnlock,
        dispose: () => disposeStumpHarvestView(runtime)
    });
}

function disposeStumpHarvestView(runtime) {
    releaseViewEvents(runtime);
    if (runtime.state.rewardOverlay?.isConnected) runtime.deps.selectionDialog.close(runtime.state.REWARD_DIALOG);
    runtime.state.rewardOverlay = null;
}
