/** Recovery mutates only the supplied owner. dt and durationSec are seconds; queue amounts are resource points.
 * The classic boundary supplies keystone and life-cap policies until combat consumers migrate. No owner is retained. */
function getPlayerHitLeechPercent(pStats) {
    const tags = pStats.sSkill?.tags || [];
    if (tags.includes('spell')) return Math.max(0, pStats.spellLeech || 0);
    if (pStats.passiveKeystoneFlags?.soulSanctuary) return 0;
    return tags.includes('attack') ? Math.max(0, pStats.leech || 0) : 0;
}

function hitLeechTarget(pStats, deps) {
    let target = deps.ownsKeystone('wlk3') && pStats.energyShield > 0 ? 'energyShield' : 'life';
    if (pStats.passiveKeystoneFlags?.soulSanctuary && pStats.sSkill.tags.includes('spell')) target = 'energyShield';
    return target;
}

function applyHitLeech(owner, pStats, hitDamage, chaosDamage, deps) {
    const target = hitLeechTarget(pStats, deps);
    const attackAllowed = pStats.sSkill.tags.includes('attack') && !pStats.passiveKeystoneFlags?.soulSanctuary;
    const chaosPct = attackAllowed ? pStats.uniqueChaosDamageInstantLeechPct : 0;
    let recovered = recoverInstantLeech(owner, chaosDamage * chaosPct / 100, pStats, target, deps);
    const amount = hitDamage * getPlayerHitLeechPercent(pStats) / 100;
    if (!(amount > 0)) return recovered;
    recovered += recoverInstantLeech(owner, amount * pStats.uniqueInstantLeechPct / 100, pStats, target, deps);
    if (pStats.sSkill.instantLeech) recovered += recoverInstantLeech(owner, amount, pStats, target, deps);
    else storeLeech(owner, amount, pStats, target, deps);
    return recovered;
}

function getActiveLeechInstances(owner) {
    owner.playerLeechInstances = Array.isArray(owner.playerLeechInstances) ? owner.playerLeechInstances : [];
    owner.playerLeechInstances = owner.playerLeechInstances
        .map(inst => ({
            remaining: Math.max(0, Number(inst && inst.remaining) || 0),
            rate: Math.max(0, Number(inst && inst.rate) || 0),
            target: inst && inst.target === 'energyShield' ? 'energyShield' : 'life'
        }))
        .filter(inst => inst.remaining > 0 && inst.rate > 0);
    return owner.playerLeechInstances;
}

function outstandingLeech(owner) {
    return getActiveLeechInstances(owner).reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
}

function storeLeech(owner, rawAmount, pStats, target, deps) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    let caps = deps.caps.leech(pStats, target === 'energyShield' ? 'energyShield' : 'life');
    if (caps.instanceCap <= 0 || caps.totalCap <= 0 || caps.rateCap <= 0) return 0;
    let instances = getActiveLeechInstances(owner);
    let outstanding = instances.reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
    let allowed = Math.max(0, caps.totalCap - outstanding);
    let stored = Math.min(amount, caps.instanceCap, allowed);
    if (stored <= 0) return 0;
    instances.push({
        remaining: stored,
        rate: caps.rateCap,
        target: target === 'energyShield' ? 'energyShield' : 'life'
    });
    owner.playerLeechInstances = instances;
    return stored;
}

function recoverInstantLeech(owner, rawAmount, pStats, target, deps) {
    let leechTarget = target === 'energyShield' ? 'energyShield' : 'life';
    let instantAmount = Math.max(0, Number(rawAmount) || 0);
    if (instantAmount <= 0) return 0;
    let caps = deps.caps.leech(pStats, leechTarget);
    if (caps.instanceCap <= 0) return 0;
    instantAmount = Math.min(instantAmount, caps.instanceCap);
    if (leechTarget === 'energyShield') {
        let esCap = deps.caps.shield(pStats);
        if (esCap <= 0) return 0;
        let before = Math.max(0, Number(owner.playerEnergyShield) || 0);
        owner.playerEnergyShield = Math.min(esCap, before + instantAmount);
        return Math.max(0, owner.playerEnergyShield - before);
    }
    let hpCap = deps.lifeCap(pStats);
    let before = Math.max(0, Number(owner.playerHp) || 0);
    owner.playerHp = Math.min(hpCap, before + instantAmount);
    let recovered = Math.max(0, owner.playerHp - before);
    return recovered;
}

function consumeLeechTick(owner, instance, tick, limits, stats) {
    const shield = instance.target === 'energyShield';
    const cap = shield ? limits.shield : limits.life;
    let gained = 0;
    let consumed = tick;
    if (!shield || cap > 0) {
        const field = shield ? 'playerEnergyShield' : 'playerHp';
        const before = Math.max(0, Number(owner[field]) || 0);
        owner[field] = Math.min(cap, before + tick);
        gained = Math.max(0, owner[field] - before);
        consumed = gained > 0 || !(stats && stats.leechKeepFullLife) ? tick : 0;
    }
    instance.remaining = Math.max(0, instance.remaining - consumed);
    return gained;
}

function tickLeech(owner, pStats, dt, deps) {
    let instances = getActiveLeechInstances(owner);
    if (instances.length === 0 || dt <= 0) return 0;
    const limits = { life: deps.lifeCap(pStats), shield: deps.caps.shield(pStats) };
    let healed = 0;
    let next = [];
    instances.forEach(inst => {
        let tick = Math.min(inst.remaining, inst.rate * dt);
        if (tick <= 0) return;
        healed += consumeLeechTick(owner, inst, tick, limits, pStats);
        if (inst.remaining > 0) next.push(inst);
    });
    owner.playerLeechInstances = next;
    return healed;
}

function getActiveRecoupInstances(owner) {
    owner.playerRecoupInstances = Array.isArray(owner.playerRecoupInstances) ? owner.playerRecoupInstances : [];
    owner.playerRecoupInstances = owner.playerRecoupInstances
        .map(inst => ({ remaining: Math.max(0, Number(inst && inst.remaining) || 0), rate: Math.max(0, Number(inst && inst.rate) || 0) }))
        .filter(inst => inst.remaining > 0 && inst.rate > 0);
    return owner.playerRecoupInstances;
}

function storeRecoup(owner, rawAmount, durationSec) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    let duration = Math.max(0.5, Number(durationSec) || 4);
    if (amount <= 0) return 0;
    let instances = getActiveRecoupInstances(owner);
    instances.push({ remaining: amount, rate: amount / duration });
    owner.playerRecoupInstances = instances;
    return amount;
}

function tickRecoup(owner, pStats, dt, deps) {
    let instances = getActiveRecoupInstances(owner);
    if (instances.length === 0 || dt <= 0) return 0;
    let hpCap = deps.lifeCap(pStats);
    let healed = 0;
    let next = [];
    instances.forEach(inst => {
        let tick = Math.min(inst.remaining, inst.rate * dt);
        if (tick <= 0) return;
        let before = Math.max(0, Number(owner.playerHp) || 0);
        owner.playerHp = Math.min(hpCap, before + tick);
        healed += Math.max(0, owner.playerHp - before);
        inst.remaining = Math.max(0, inst.remaining - tick);
        if (inst.remaining > 0) next.push(inst);
    });
    owner.playerRecoupInstances = next;
    return healed;
}

export function createPlayerRecovery(deps) {
    return Object.freeze({
        hitTarget: (pStats) => hitLeechTarget(pStats, deps),
        hit: (owner, pStats, hitDamage, chaosDamage) => applyHitLeech(owner, pStats, hitDamage, chaosDamage, deps),
        outstanding: outstandingLeech,
        store: (owner, rawAmount, pStats, target) => storeLeech(owner, rawAmount, pStats, target, deps),
        instant: (owner, rawAmount, pStats, target) => recoverInstantLeech(owner, rawAmount, pStats, target, deps),
        tick: (owner, pStats, dt) => tickLeech(owner, pStats, dt, deps),
        recoup: storeRecoup,
        tickRecoupQueue: (owner, pStats, dt) => tickRecoup(owner, pStats, dt, deps)
    });
}
