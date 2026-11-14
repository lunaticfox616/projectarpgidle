

export function hiddenIsHiddenJournalEndgameBoss(zone) {
    if (!zone) return false;
    return !!zone.milestonePinnacle || zone.type === 'seasonBoss' || zone.type === 'outsideChaos';
}

export function hiddenIsHiddenJournalPinnacleBoss(zone) {
    return !!(zone && zone.milestonePinnacle);
}

export function hiddenGetHiddenJournalActiveRun(enemy, owner) {
    let run = owner.hiddenJournalBossRun;
    if (!run || !enemy || run.enemyId !== enemy.id) return null;
    return run;
}

/** @param {{id:number,isBoss:boolean}} enemy @param {object} zone */
export function hiddenStartHiddenJournalBossRun(enemy, zone, owner) {
    if (!enemy || !enemy.isBoss || !hiddenIsHiddenJournalEndgameBoss(zone)) return false;
    let active = hiddenGetHiddenJournalActiveRun(enemy, owner);
    if (active) return false;
    owner.hiddenJournalBossRun = {
        enemyId: enemy.id,
        zoneId: zone.id,
        hpDamageTaken: 0,
        ailments: []
    };
    return true;
}

/** A wide map's boss is created with its room and waits there: the no-hit count starts again when it wakes. */
export function hiddenRestartHiddenJournalBossRun(enemy, zone, owner) {
    if (!enemy || !enemy.isBoss) return false;
    owner.hiddenJournalBossRun = null;
    return hiddenStartHiddenJournalBossRun(enemy, zone, owner);
}

export function hiddenTrackHiddenJournalPlayerDamage(amount, owner) {
    let run = owner.hiddenJournalBossRun;
    let damage = Math.max(0, Math.floor(Number(amount) || 0));
    if (!run || damage <= 0) return;
    run.hpDamageTaken = Math.max(0, Math.floor(run.hpDamageTaken || 0)) + damage;
}

export function hiddenTrackHiddenJournalAilment(env, type, enemy, owner) {
    let run = hiddenGetHiddenJournalActiveRun(enemy, owner);
    if (!run || !env.HIDDEN_JOURNAL_AILMENTS.has(type)) return;
    let ailments = new Set(Array.isArray(run.ailments) ? run.ailments : []);
    ailments.add(type);
    run.ailments = Array.from(ailments);
}

function hiddenAtLastBreath(owner, playerStats) {
    let hp = Math.max(0, Number(owner.playerHp) || 0);
    let maxHp = Math.max(1, Number(playerStats && playerStats.maxHp) || hp || 1);
    return hp > 0 && (hp / maxHp) <= 0.05;
}

export function* hiddenUnlockHiddenJournalRunEntries(run, zone, playerStats, owner) {
    if (hiddenAtLastBreath(owner, playerStats)) yield { kind: 'unlockHiddenEntry', args: ['hidden_last_breath'] };
    if (hiddenIsHiddenJournalPinnacleBoss(zone) && (run.hpDamageTaken || 0) <= 0) yield { kind: 'unlockHiddenEntry', args: ['hidden_unscarred'] };
    if ((run.ailments || []).length >= 4) yield { kind: 'unlockHiddenEntry', args: ['hidden_fourfold_affliction'] };
}

export function* hiddenCompleteHiddenJournalBossRun(enemy, zone, playerStats, owner) {
    let run = hiddenGetHiddenJournalActiveRun(enemy, owner);
    if (!run || !hiddenIsHiddenJournalEndgameBoss(zone)) return false;
    yield* hiddenUnlockHiddenJournalRunEntries(run, zone, playerStats, owner);
    owner.hiddenJournalBossRun = null;
    return true;
}

export function hiddenResetHiddenJournalBossRun(owner) {
    owner.hiddenJournalBossRun = null;
}
