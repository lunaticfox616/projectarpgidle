export function resetBeehiveRunModifiers(b) {
    if (!b) return;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.waveExtra = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = [];
    b.queenActive = false;
}
