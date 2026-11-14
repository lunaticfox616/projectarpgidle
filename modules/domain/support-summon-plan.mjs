// Pure summon definitions and contact plans. Caller supplies local support effects and world snapshot.
class SummonSupportPlan {
    constructor(rules, grid) { this.rules = rules; this.grid = grid; }
    hpMultiplier(stats) { return stats.summonSupportEffects.summon?.hpMultiplier || 1; }
    inheritedLeech(stats) { return Math.max(0, Number(stats.summonInheritedLeech ?? stats.leech) || 0); }
    scaleContact(hit, multiplier = 1) {
        hit.damage = Math.floor(hit.damage * multiplier);
        hit.ailmentSourceDamage = Math.floor(hit.ailmentSourceDamage * multiplier);
        hit.parts.forEach(part => { part.damage *= multiplier; part.source *= multiplier; });
    }
    soleMinionDefs(defs) {
        const attack = defs.find(row => row.db.tags.includes('summon_attack'));
        return [...(attack ? [attack] : []), ...defs.filter(row => row.db.tags.includes('summon_guard'))];
    }
    // Blessings reserve their normal slot before being removed from physical summon definitions.
    runtimeDefs(defs, stats, state, cap) {
        const sole = !!stats?.passiveKeystoneFlags?.soleMinion;
        const base = (sole ? this.soleMinionDefs(defs) : defs.slice(0, cap)).filter(row => !row.db.tags.includes('summon_buff'));
        const extra = [], reinforced = new Set();
        if (!sole) base.forEach(row => {
            const bonus = this.rules.prepare(row.db, state).supportEffects.summon?.extra || 0;
            if (!bonus || reinforced.has(row.name)) return;
            reinforced.add(row.name);
            const count = base.filter(other => other.name === row.name).length;
            for (let i = 0; i < bonus; i++) extra.push({ ...row, duplicateIndex: count + i, supportReinforcement: true });
        });
        return [...base, ...extra].map((row, slotIdx) => ({ ...row, slotIdx }));
    }
    nearby(from, enemies, seen, distance) {
        return enemies.filter(enemy => !seen.has(enemy.id) && this.grid.distance(from, enemy) <= distance)
            .sort((a, b) => this.grid.distance(from, a) - this.grid.distance(from, b));
    }
    addChain(plan, count, enemies, seen, config) {
        let from = plan[0].target;
        for (let i = 1; i <= count; i++) {
            const target = this.nearby(from, enemies, seen, 3)[0];
            if (!target) break;
            seen.add(target.id);
            plan.push({ target, multiplier: Math.pow(1 + config.stepDamagePct / 100, i), delayMs: plan[0].delayMs + i * 120 });
            from = target;
        }
    }
    inProjectilePath(summon, first, target, fan) {
        if (![summon, first, target].every(unit => this.grid.validCell(unit))) return false;
        const ax = first.gx - summon.gx, ay = first.gy - summon.gy, bx = target.gx - summon.gx, by = target.gy - summon.gy;
        const distance = Math.hypot(ax, ay), range = Math.hypot(bx, by);
        if (!distance || !range || range > Math.max(summon.gridRange || 1, distance) + 2) return false;
        const forward = (ax * bx + ay * by) / distance;
        return fan ? forward / range >= Math.cos(Math.PI * 55 / 180) : forward > 0 && Math.abs(ax * by - ay * bx) / distance <= 0.55;
    }
    attackPlan(summon, targets, fx, world) {
        const enemies = world.enemies.filter(enemy => enemy.hp > 0);
        const plan = targets.map(target => ({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }));
        const seen = new Set(targets.map(target => target.id)), first = targets[0];
        if (fx.chain) this.addChain(plan, fx.chain.count, enemies, seen, fx.chain);
        const extra = (fx.projectiles?.extra || 0) + (fx.pierce || 0);
        enemies.filter(enemy => !seen.has(enemy.id) && this.inProjectilePath(summon, first, enemy, !!fx.projectiles))
            .slice(0, extra).forEach(target => { seen.add(target.id); plan.push({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }); });
        const spread = (fx.spreadRadius || 0) + (fx.expansion || 0);
        if (spread) this.nearby(first, enemies, seen, spread).forEach(target => plan.push({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }));
        if (fx.repeat) plan.push(...plan.map(row => ({ ...row, multiplier: row.multiplier * fx.repeat.damagePct / 100, delayMs: row.delayMs + 180 })));
        return plan.slice(0, 32);
    }
}
export function createSummonSupportPlan(rules, grid) {
    const service = new SummonSupportPlan(rules, grid);
    return Object.freeze(Object.fromEntries(['hpMultiplier','inheritedLeech','scaleContact','runtimeDefs','attackPlan'].map(name => [name, service[name].bind(service)])));
}
