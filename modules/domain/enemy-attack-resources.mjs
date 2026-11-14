// Enemy turn stages. Explicit tick state and dependencies; existing rounding and short-circuit order.
function consumeEnergyShield(c, e, h) {
    c.owner.playerEnergyShield = Math.max(0, Math.floor(Number(c.owner.playerEnergyShield) || 0));
    h.playerResourceBeforeHit = Math.max(0, Number(c.owner.playerHp) || 0) + c.owner.playerEnergyShield;
    h.beforeEsForCr8 = c.owner.playerEnergyShield;
    if (h.remaining > 0 && c.owner.playerEnergyShield > 0) {
        let bypass = Math.floor(h.remaining * Math.max(0, Math.min(100, c.pStats.cosmosEnergyShieldBypassPct || 0)) / 100);
        let shieldPart = Math.max(0, h.remaining - bypass);
        let absorbed = Math.min(c.owner.playerEnergyShield, shieldPart);
        c.owner.playerEnergyShield -= absorbed;
        h.remaining = bypass + Math.max(0, shieldPart - absorbed);
    }
    c.deps.triggerUniqueEnergyShieldBreakRecharge(c.pStats, h.beforeEsForCr8, c.deps.getCombatTime());
}

function consumeStoneAndDeathWard(c, e, h) {
    if (h.remaining > 0) h.remaining = c.deps.absorbDamageWithTalentStoneShield(h.remaining);
    if (h.remaining > 0) h.remaining = c.deps.absorbDamageWithRealmDeathWard(h.remaining, c.pStats);
}

function consumeUniqueHitGuard(c, e, h) {
    if (h.remaining > 0 && c.owner.playerUniqueGuard && c.deps.getCombatTime() < (c.owner.playerUniqueGuard.expiresAt || 0) && (c.owner.playerUniqueGuard.amount || 0) > 0) {
        let absorbed = Math.min(h.remaining, Math.floor(c.owner.playerUniqueGuard.amount || 0));
        c.owner.playerUniqueGuard.amount = Math.max(0, Math.floor((c.owner.playerUniqueGuard.amount || 0) - absorbed));
        h.remaining -= absorbed;
    }
}

function capReceivedHit(c, e, h) {
    if (h.remaining > 0 && (c.pStats.guardianHitCapPct || 0) > 0) {
        const hitCap = Math.max(1, Math.floor((c.pStats.maxHp || 1) * c.pStats.guardianHitCapPct / 100));
        if (h.remaining > hitCap) {
            h.remaining = hitCap;
            c.deps.addBattleFx('statusText', { text: c.deps._t('성채화!'), color: '#d8c08b', duration: 300, bodyCue: true });
        }
    }
}

function consumeHitShields(c, e, h) {
    consumeEnergyShield(c, e, h);
    consumeStoneAndDeathWard(c, e, h);
    consumeUniqueHitGuard(c, e, h);
    capReceivedHit(c, e, h);
}

function losePlayerLife(c, e, h) {
    h.nextPlayerHp = Math.floor(c.owner.playerHp - h.remaining);
    if (h.nextPlayerHp <= 0 && (c.pStats.cosmosDeathResistPct || 0) > 0 && c.deps.random() * 100 < Math.max(0, c.pStats.cosmosDeathResistPct || 0)) {
        h.remaining = 0;
        h.nextPlayerHp = Math.max(1, Math.floor(c.owner.playerHp || 1));
        c.deps.addBattleFx('statusText', { text: c.deps._t('죽음 저항!'), color: '#d7b8ff', duration: 420 });
    }
    h.nextPlayerHp = c.deps.ascendancyNodeRules.onLifeDrop(c.pStats, c.owner.playerHp, h.nextPlayerHp, c.deps.getCombatTime());
    c.owner.playerHp = h.nextPlayerHp;
    if (typeof c.deps.recordPassiveKarmaLoss === 'function') {
        let playerResourceAfterHit = Math.max(0, Number(c.owner.playerHp) || 0)
                    + Math.max(0, Number(c.owner.playerEnergyShield) || 0);
        c.deps.recordPassiveKarmaLoss(e.enemy, Math.max(0, h.playerResourceBeforeHit - playerResourceAfterHit));
    }
    c.deps.trackHiddenJournalPlayerDamage(h.remaining);
}

function recoupReceivedHit(c, e, h) {
    if (h.remaining > 0 && c.pStats.uniqueLifeRecoupTakenDamage) {
        let cfg = c.pStats.uniqueLifeRecoupTakenDamage || {};
        c.deps.addPlayerRecoupInstance(h.remaining * Math.max(0, Number(cfg.pct || 25)) / 100, Math.max(1, Number(cfg.duration || 4)));
    }
}

function grantHitBarrier(c, e, h) {
    if (h.remaining > 0 && c.pStats.uniqueInvulnerableBarrierOnHit && c.deps.random() * 100 < Math.max(0, Number(c.pStats.uniqueInvulnerableBarrierOnHit.chance) || 0)) {
        let durationMs = Math.max(250, Math.floor(Math.max(0.1, Number(c.pStats.uniqueInvulnerableBarrierOnHit.duration) || 1.5) * 1000));
        c.owner.realmInvulnerableBarrierUntil = c.deps.getCombatTime() + durationMs;
        c.deps.addBattleFx('statusText', { text: c.deps._t('무적 장막!'), color: '#c49bff', duration: 360 });
    }
}

function triggerCrusaderRecharge(c, e, h) {
    if (c.deps.hasKeystone('cr8') && h.beforeEsForCr8 > 0 && c.owner.playerEnergyShield <= 0 && (c.owner.crusaderEsRegenCooldownUntil || 0) <= c.deps.getCombatTime()) {
        c.owner.crusaderEsRegenUntil = c.deps.getCombatTime() + 4000;
        c.owner.crusaderLightningAegisUntil = c.deps.getCombatTime() + 4000;
        c.owner.crusaderEsRegenCooldownUntil = c.deps.getCombatTime() + 4000;
    }
}

function reflectGuardianHit(c, e, h) {
    if (h.remaining > 0 && c.deps.hasKeystone('gd6')) c.deps.engagement.applyGuardianEnduranceReflect(c.owner, e.enemy, h.remaining, c.pStats);
}

function leechMonsterHit(c, e, h) {
    if ((e.enemy.leechPct || 0) > 0 && h.remaining > 0 && e.enemy.hp > 0) {
        let leeched = Math.max(1, Math.floor(h.remaining * (e.enemy.leechPct || 0) / 100));
        restoreMonsterLeech(e.enemy, leeched);
    }
}

function restoreMonsterLeech(enemy, amount) {
    if ((enemy.energyShield || 0) < (enemy.maxEnergyShield || 0)) enemy.energyShield = Math.min(enemy.maxEnergyShield || 0, (enemy.energyShield || 0) + amount);
    else enemy.hp = Math.min(enemy.maxHp || enemy.hp || 1, (enemy.hp || 0) + amount);
}

function repeatMonsterStrike(c, e) {
    if ((e.enemy.doubleStrikeChance || 0) > 0 && c.deps.random() * 100 < e.enemy.doubleStrikeChance) e.enemy.attackTimer += 1;
}

function triggerReceivedHit(c, e, h) {
    recoupReceivedHit(c, e, h);
    grantHitBarrier(c, e, h);
    triggerCrusaderRecharge(c, e, h);
    reflectGuardianHit(c, e, h);
    leechMonsterHit(c, e, h);
    repeatMonsterStrike(c, e, h);
}

function recordReceivedHit(c, e, h) {
    if ((c.pStats.delayedRegenFromTakenDamage || 0) > 0 && h.remaining > 0) {
        let recover = Math.max(0, h.remaining * c.pStats.delayedRegenFromTakenDamage);
        c.owner.delayedGuardHealPool = Math.max(0, (c.owner.delayedGuardHealPool || 0) + recover);
    }
    c.owner.playerEsLastHitAt = c.deps.getCombatTime();
    c.owner.playerLastHitAt = c.deps.getCombatTime();
    if (c.deps.hasKeystone('a2')) c.owner.assassinBlurred = false;
}

export function commitEnemyHit(c, e, h) {
    consumeHitShields(c, e, h);
    losePlayerLife(c, e, h);
    triggerReceivedHit(c, e, h);
    recordReceivedHit(c, e, h);
}
