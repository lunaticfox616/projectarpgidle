// 재능 개화의 회복 공유와 지연 회복 상태를 한 경계에서 처리한다.

function shareTalentPlayerRecoveryWithSummons(amount) {
    let ratio = 0.20 * getPreciseTalentRatio('hero3__crusader') + 0.20 * getPreciseTalentRatio('hero7__crusader');
    if (!(amount > 0) || ratio <= 0) return 0;
    let shared = amount * ratio;
    (game.summons || []).forEach(row => {
        if (row && row.alive && row.hp > 0) row.hp = Math.min(row.maxHp || row.hp, row.hp + shared);
    });
    return shared;
}

function getTalentPlayerLeechTarget(defaultTarget) {
    return getPreciseTalentLevel('hero6__crusader') ? 'energyShield' : defaultTarget;
}

function addTalentMossBarkRecovery(damage, now) {
    let ratio = getPreciseTalentRatio('hero3__guardian');
    if (!(damage > 0) || ratio <= 0) return;
    let runtime = getTalentCardRuntimeState();
    runtime.mossRecoveries = Array.isArray(runtime.mossRecoveries) ? runtime.mossRecoveries : [];
    runtime.mossRecoveries.push({ at: (Number(now) || Date.now()) + 2000, amount: damage * 0.20 * ratio });
}

function processTalentMossBarkRecovery(pStats, now) {
    let runtime = getTalentCardRuntimeState();
    let rows = Array.isArray(runtime.mossRecoveries) ? runtime.mossRecoveries : [];
    let at = Number(now) || Date.now();
    let due = rows.filter(row => row && row.at <= at).reduce((sum, row) => sum + Math.max(0, row.amount || 0), 0);
    runtime.mossRecoveries = rows.filter(row => row && row.at > at);
    if (due <= 0) return 0;
    let before = game.playerHp;
    game.playerHp = Math.min(getPlayerRecoveryHpCap(pStats), game.playerHp + due);
    let recovered = Math.max(0, game.playerHp - before);
    shareTalentPlayerRecoveryWithSummons(recovered);
    return recovered;
}

safeExposeGlobals({
    shareTalentPlayerRecoveryWithSummons,
    getTalentPlayerLeechTarget,
    addTalentMossBarkRecovery,
    processTalentMossBarkRecovery
});
