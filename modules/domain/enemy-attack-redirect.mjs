/** Redirect only life damage absorbed by living guards, with per-guard rounding and roster order. */
export function redirectEnemyHit(c, e, h) {
    h.remaining = h.dmg;
    h.guardRedirectPct = c.deps.getSummonRedirectPct(c.pStats);
    h.soulbinderShare = c.deps.hasKeystone('sb2');
    h.closestSummon = h.soulbinderShare ? c.deps.engagement.getClosestLivingSummonToPlayer(c.owner) : null;
    h.aliveGuards = h.soulbinderShare
        ? (h.closestSummon ? [h.closestSummon] : [])
        : (c.owner.summons || []).filter(s => s && !s.isGhost && s.alive && s.hp > 0 && s.role === 'guard');
    if (h.guardRedirectPct > 0 && h.aliveGuards.length > 0) redirectToGuards(c, e, h);
}

function redirectToGuards(c, e, h) {
    const redirect = Math.min(h.remaining, Math.floor(h.remaining * (h.guardRedirectPct / 100)));
    if (redirect <= 0) return;
    const each = Math.max(1, Math.floor(redirect / h.aliveGuards.length));
    let redirectedTotal = 0;
    h.aliveGuards.forEach((guard, idx) => {
        if (!guard.alive || guard.hp <= 0) return;
        const share = idx === h.aliveGuards.length - 1 ? Math.max(0, redirect - redirectedTotal) : each;
        const reduced = redirectedGuardDamage(c, e, h, guard, share);
        if (reduced <= 0) return;
        guard.hp = Math.max(0, guard.hp - reduced);
        c.deps.ascendancyNodeRules.storeSharedBlow(guard, reduced);
        redirectedTotal += reduced;
        if (guard.hp <= 0) defeatRedirectGuard(c, h, guard);
    });
    h.remaining = Math.max(0, h.remaining - redirectedTotal);
}

function redirectedGuardDamage(c, e, h, guard, share) {
    const local = h.soulbinderShare ? 100 : Math.max(0, Math.min(100, Number(guard.redirectPct || 0)));
    if (local > 0) share = Math.floor(share * (local / 100));
    if (c.deps.resolveEntropyEvasion(guard, c.deps.getSummonEvadeChance(guard, e.enemy), c.deps.getCombatTime())) share = 0;
    const resistance = guardElementResistance(guard, h.attackElement);
    let reduced = Math.max(0, Math.floor(share * (1 - Math.max(-60, resistance) / 100)));
    const armorRed = Math.min(85, (guard.armor || 0) / ((guard.armor || 0) + Math.max(1, reduced) * 8) * 100);
    reduced = Math.max(0, Math.floor(reduced * (1 - armorRed / 100)));
    return Math.max(0, Math.min(reduced, guard.hp));
}

function guardElementResistance(guard, element) {
    if (element === 'fire') return guard.resFire || 0;
    if (element === 'cold') return guard.resCold || 0;
    if (element === 'light') return guard.resLight || 0;
    if (element === 'chaos') return guard.resChaos || 0;
    return 0;
}

function defeatRedirectGuard(c, h, guard) {
    guard.alive = false;
    guard.respawnAt = c.deps.engagement.getSummonRespawnAt(c.owner, guard, h.soulbinderShare);
    if (c.pStats.uniqueSummonDeathDamageBuff) {
        const cfg = c.pStats.uniqueSummonDeathDamageBuff || {};
        c.owner.summonDeathDamageBuffPct = Math.max(Number(c.owner.summonDeathDamageBuffPct || 0), Math.max(0, Number(cfg.pct || 40)));
        c.owner.summonDeathDamageBuffExpiresAt = c.deps.getCombatTime() + Math.max(1, Number(cfg.duration || 4)) * 1000;
    }
}
