'use strict';

if (typeof safeExposeGlobals !== 'function') throw new Error('js/utils.js must load before js/hidden-journal.js');

const HIDDEN_JOURNAL_AILMENTS = new Set(['ignite', 'chill', 'freeze', 'shock', 'poison', 'bleed']);

function isHiddenJournalEndgameBoss(zone) {
    if (!zone) return false;
    return !!zone.milestonePinnacle || zone.type === 'seasonBoss' || zone.type === 'outsideChaos';
}

function isHiddenJournalPinnacleBoss(zone) {
    return !!(zone && zone.milestonePinnacle);
}

function getHiddenJournalActiveRun(enemy) {
    let run = game.hiddenJournalBossRun;
    if (!run || !enemy || run.enemyId !== enemy.id) return null;
    return run;
}

/** @param {{id:number,isBoss:boolean}} enemy @param {object} zone */
function startHiddenJournalBossRun(enemy, zone) {
    if (!enemy || !enemy.isBoss || !isHiddenJournalEndgameBoss(zone)) return false;
    let active = getHiddenJournalActiveRun(enemy);
    if (active) return false;
    game.hiddenJournalBossRun = {
        enemyId: enemy.id,
        zoneId: zone.id,
        hpDamageTaken: 0,
        flaskUses: 0,
        ailments: []
    };
    return true;
}

function trackHiddenJournalPlayerDamage(amount) {
    let run = game.hiddenJournalBossRun;
    let damage = Math.max(0, Math.floor(Number(amount) || 0));
    if (!run || damage <= 0) return;
    run.hpDamageTaken = Math.max(0, Math.floor(run.hpDamageTaken || 0)) + damage;
}

function trackHiddenJournalFlaskUse() {
    let run = game.hiddenJournalBossRun;
    if (!run) return;
    run.flaskUses = Math.max(0, Math.floor(run.flaskUses || 0)) + 1;
}

function trackHiddenJournalAilment(type, enemy) {
    let run = getHiddenJournalActiveRun(enemy);
    if (!run || !HIDDEN_JOURNAL_AILMENTS.has(type)) return;
    let ailments = new Set(Array.isArray(run.ailments) ? run.ailments : []);
    ailments.add(type);
    run.ailments = Array.from(ailments);
}

function unlockHiddenJournalRunEntries(run, zone, playerStats) {
    let hp = Math.max(0, Number(game.playerHp) || 0);
    let maxHp = Math.max(1, Number(playerStats && playerStats.maxHp) || hp || 1);
    if (hp > 0 && (hp / maxHp) <= 0.05) unlockJournalEntry('hidden_last_breath');
    if (isHiddenJournalPinnacleBoss(zone) && (run.hpDamageTaken || 0) <= 0) unlockJournalEntry('hidden_unscarred');
    if (isHiddenJournalPinnacleBoss(zone) && (run.flaskUses || 0) <= 0) unlockJournalEntry('hidden_dry_vial');
    if ((run.ailments || []).length >= 4) unlockJournalEntry('hidden_fourfold_affliction');
}

function completeHiddenJournalBossRun(enemy, zone, playerStats) {
    let run = getHiddenJournalActiveRun(enemy);
    if (!run || !isHiddenJournalEndgameBoss(zone)) return false;
    unlockHiddenJournalRunEntries(run, zone, playerStats);
    game.hiddenJournalBossRun = null;
    return true;
}

function resetHiddenJournalBossRun() {
    game.hiddenJournalBossRun = null;
}

safeExposeGlobals({
    startHiddenJournalBossRun,
    trackHiddenJournalPlayerDamage,
    trackHiddenJournalFlaskUse,
    trackHiddenJournalAilment,
    completeHiddenJournalBossRun,
    resetHiddenJournalBossRun
});
