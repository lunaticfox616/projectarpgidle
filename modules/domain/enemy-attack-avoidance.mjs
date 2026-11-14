// Enemy turn stages. Explicit tick state and dependencies; existing rounding and short-circuit order.
function rollMonsterEvade(c, e, h) {
    h.evadeChance = Math.max(0, c.pStats.evadeChance || 0);
    if (c.deps.hasKeystone('ct4') && c.owner.catalystEvadeBoostReady) {
        h.evadeChance *= 1.3;
        c.owner.catalystEvadeBoostReady = false;
    }
    if (c.deps.hasKeystone('h3')) h.evadeChance = 100 - Math.pow(1 - h.evadeChance / 100, 2) * 100;
}

function resolveMonsterEvade(c, e, h) {
    if (!(typeof c.deps.isTalentMonsterAlwaysHit === 'function' && c.deps.isTalentMonsterAlwaysHit())
                && c.deps.resolveEntropyEvasion(c.owner, h.evadeChance, c.deps.getCombatTime())) {
        c.deps.addBattleFx('statusText', { text: c.deps._t('회피!'), color: '#c4e2ff', duration: 260, bodyCue: true });
        c.deps.addEvasionCombatLog(null, true);
        c.deps.recordPlayerEvadeUniqueEffects(c.pStats, h.aliveEnemies, c.deps.getCombatTime());
        c.deps.ascendancyNodeRules.counter(c.pStats, e.enemy, 'evade', c.deps.getCombatTime());
        if (c.pStats.passiveKeystoneFlags && c.pStats.passiveKeystoneFlags.fullEvasion) {
            c.owner.passiveFullEvasionCritReady = true;
        }
        if (c.deps.hasKeystone('ct4')) c.owner.catalystEvadeBoostReady = true;
        return 'continue';
    }
}

function evadeMonsterHit(c, e, h) {
    rollMonsterEvade(c, e, h);
    const step1 = resolveMonsterEvade(c, e, h);if (step1) return step1;
}

function blockMonsterHit(c, e, h) {
    c.deps.repelMeleeAttacker(e.enemy, c.pStats);
    h.blockRollCap = Math.max(0, Math.min(75, Number(c.pStats.blockChanceMax || 50)));
    h.blockRollChance = Math.max(0, Math.min(h.blockRollCap, c.pStats.blockChance || c.pStats.guardianBlockChance || 0));
    h.gladiatorBattleLuck = c.deps.hasKeystone('g9');
    h.blockRoll = c.deps.random() * 100;
    if (h.gladiatorBattleLuck) h.blockRoll = Math.min(h.blockRoll, c.deps.random() * 100);
    h.wasBlocked = h.blockRoll < h.blockRollChance;
    if (h.wasBlocked) {
        c.deps.recoverEnergyShieldOnBlock(c.pStats);
        c.deps.regionAffixEffects.onBlock(c.pStats, c.deps.getCombatTime());
        c.deps.grantTalentStoneShieldOnBlock(c.pStats);
        let blockedTakenPct = Math.max(0, Math.min(100, Number(c.pStats.uniqueBlockedDamageTakenPct) || 0));
        // 다 막으면 '막아냄!'(피해 없음), 일부만 막으면 받는 몫을 적는다.
        let blockText = blockedTakenPct <= 0 ? c.deps._t('막아냄!') : c.deps._t('막아냄, 피해 {blockedTakenPct}%', { blockedTakenPct });
        c.deps.addBattleFx('statusText', { text: blockText, color: '#ebdfc2', duration: 260, bodyCue: true });
        if (c.owner.settings.showCombatLog) c.deps.addLog(`🛡️ ${blockText}`, "loot-magic", { noToast: true, aggregateKey: `combat:block:${blockText}`, aggregateWindowMs: 450 });
        if (blockedTakenPct <= 0) return 'continue';
        h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * blockedTakenPct / 100)));
        h.ailmentSourceDamageBeforeCrit = Math.max(1, Math.floor(h.ailmentSourceDamageBeforeCrit * blockedTakenPct / 100));
    }
}

function nullifyMonsterHit(c, e, h) {
    h.guardianNullifyChance = Math.max(0, Math.min(100, Number(c.pStats.guardianDamageNullifyChance) || 0));
    if (h.guardianNullifyChance > 0 && c.deps.random() * 100 < h.guardianNullifyChance) {
        c.deps.addBattleFx('statusText', { text: c.deps._t('무효!'), color: '#bdf7ff', duration: 300 });
        if (c.owner.settings.showCombatLog) c.deps.addLog(c.deps._t('🛡️ 절대 수호: 피해 무효!'), 'loot-magic', { noToast: true, aggregateKey: 'combat:block:nullify', aggregateWindowMs: 450 });
        return 'continue';
    }
}

function rollMonsterDeflect(c, e, h) {
    h.deflected = false;
    h.deflectReducePct = 0;
    h.deflectRoll = h.wasBlocked ? 100 : c.deps.random() * 100;
    if (!h.wasBlocked && h.gladiatorBattleLuck) h.deflectRoll = Math.min(h.deflectRoll, c.deps.random() * 100);
}

function resolveMonsterDeflect(c, e, h) {
    if (!h.wasBlocked && h.deflectRoll < Math.max(0, Math.min(75, c.pStats.deflectChance || 0))) {
        let deflectReduce = Math.max(0, Math.min(85, 40 + Number(c.pStats.deflectDamageReduce || 0)));
        h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * (1 - deflectReduce / 100))));
        if (c.pStats.uniqueDeflectStealth) {
            let cfg = c.pStats.uniqueDeflectStealth || {};
            c.owner.shadowStealthExpiresAt = c.deps.getCombatTime() + Math.max(1, Number(cfg.duration || 3)) * 1000;
        }
        h.deflected = true;
        h.deflectReducePct = Math.floor(deflectReduce);
        c.deps.ascendancyNodeRules.counter(c.pStats, e.enemy, 'deflect', c.deps.getCombatTime());
    }
}

function deflectMonsterHit(c, e, h) {
    rollMonsterDeflect(c, e, h);
    resolveMonsterDeflect(c, e, h);
}

function floorMonsterHit(c, e, h) {
    if ((c.pStats.cosmosMasteryTakenLessPct || 0) > 0) {
        let masteryReduction = Math.max(0, Math.min(50, Number(c.pStats.cosmosMasteryTakenLessPct) || 0));
        h.dmg = h.scaleBreakdownToTotal(Math.max(0, Math.floor(h.dmg * (1 - masteryReduction / 100))));
    }
    h.flooredDamage = c.deps.floorIncomingDamage(h.dmg);
    if (h.flooredDamage !== h.dmg) {
        h.dmg = h.scaleBreakdownToTotal(Math.max(1, h.flooredDamage));
        h.ailmentSourceDamageBeforeCrit = Math.max(1, c.deps.floorIncomingDamage(h.ailmentSourceDamageBeforeCrit));
    }
}

export function avoidEnemyHit(c, e, h) {
    const step0 = evadeMonsterHit(c, e, h); if (step0) return step0;
    const step1 = blockMonsterHit(c, e, h); if (step1) return step1;
    const step2 = nullifyMonsterHit(c, e, h); if (step2) return step2;
    deflectMonsterHit(c, e, h);
    floorMonsterHit(c, e, h);
}
