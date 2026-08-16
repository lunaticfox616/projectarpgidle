const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = vm.createContext({
    console,
    game: { activeSkill: '독니 사출', selectedHeroId: 'hero6' },
    SKILL_DB: { '독니 사출': { ele: 'chaos', tags: ['attack', 'projectile', 'chaos'] } },
    clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); },
    calculatePlayerEhpProfile() {
        return { elements: {
            phys: { direct: 1200 }, fire: { direct: 1500 }, cold: { direct: 1450 },
            light: { direct: 1400 }, chaos: { direct: 900 }
        } };
    },
    getHeroAppearanceId() { return 'hero4'; },
    safeExposeGlobals(entries) { Object.assign(context, entries); }
});

vm.runInContext(fs.readFileSync('js/ghost-combat.js', 'utf8'), context, { filename: 'ghost-combat.js' });

const snapshot = context.getGhostCombatSnapshot({
    sSkill: context.SKILL_DB['독니 사출'], totalDps: 2400, directDps: 1900, skillDotDps: 300, summonDps: 200,
    maxHp: 800, energyShield: 200, aspd: 2, crit: 25, critDmg: 180, minDmgRoll: 70, maxDmgRoll: 130,
    ds: 35, accuracy: 500, evasion: 650, blockChance: 18, deflectChance: 12, deflectDamageReduce: 25,
    leech: 1.5, regen: 2, energyShieldRegenRate: 10
});

assert.strictEqual(snapshot.schemaVersion, 1, 'snapshot contract must be versioned');
assert.strictEqual(snapshot.heroId, 'hero4', 'registered ghost should use the visible character appearance');
assert.strictEqual(snapshot.activeSkill, '독니 사출');
assert.strictEqual(snapshot.style, 'projectile', 'skill delivery style must survive registration for replay');
assert.strictEqual(snapshot.directEhpByElement.chaos, 900, 'direct elemental EHP must be registered before entropy avoidance');
assert.strictEqual(snapshot.dps, 2400);
assert.strictEqual(snapshot.directDps, 1900);
assert.strictEqual(snapshot.recoveryPct, 3.6, 'life and energy-shield recovery must be weighted by their pools');
assert.strictEqual(snapshot.deflectDamageReduce, 65, 'deflect must include its base forty-percent reduction');
assert.deepStrictEqual(Array.from(snapshot.tags), ['attack', 'projectile'], 'only supported combat tags should cross the cloud boundary');

const capped = context.getGhostCombatSnapshot({
    sSkill: { ele: 'invalid', tags: ['spell'] }, totalDps: 1, maxHp: 1, aspd: 99,
    crit: 200, critDmg: 99999, blockChance: 100, deflectChance: 100, leech: 100
});
assert.strictEqual(capped.skillElement, 'phys');
assert.strictEqual(capped.attackSpeed, 8);
assert.strictEqual(capped.blockChance, 75);
assert.strictEqual(capped.leechPct, 20);

console.log('smoke-ghost-combat passed');
