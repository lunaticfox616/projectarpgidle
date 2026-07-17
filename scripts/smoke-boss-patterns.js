const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/combat-patterns.js', 'utf8');
const exposed = {};
const context = {
    window: {},
    safeExposeGlobals: map => Object.assign(exposed, map)
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/combat-patterns.js' });

{
    const enemy = { isBoss: true, patternMode: 'burst', patternAttackCount: 3, hp: 100, maxHp: 100 };
    const preview = exposed.getBossPatternPreview(enemy);
    assert.strictEqual(preview.label, '연속 참격');
    assert.strictEqual(preview.isSpecial, true);
    assert.strictEqual(preview.damageMul, 1.30);
    const consumed = exposed.consumeBossPatternAttack(enemy);
    assert.strictEqual(consumed.attackNumber, 4);
    assert.strictEqual(enemy.patternAttackCount, 4);
    assert.strictEqual(enemy.nextPatternState.attackNumber, 5);
}

{
    const enemy = { isBoss: true, patternMode: 'slam', patternAttackCount: 2, hp: 100, maxHp: 100 };
    const preview = exposed.getBossPatternPreview(enemy);
    assert.strictEqual(preview.telegraphKind, 'ring');
    assert.strictEqual(preview.damageMul, 1.55);
}

{
    const enemy = { isBoss: true, patternMode: 'ramp', patternAttackCount: 0, hp: 25, maxHp: 100 };
    const preview = exposed.getBossPatternPreview(enemy);
    assert.strictEqual(preview.stage, 3);
    assert.strictEqual(preview.damageMul, 1.21);
    assert(preview.label.includes('Ⅲ'));
}

{
    const enemy = { isBoss: true, patternMode: 'cosmos', patternAttackCount: 0, hp: 100, maxHp: 100 };
    const labels = [];
    for (let i = 0; i < 3; i++) labels.push(exposed.consumeBossPatternAttack(enemy).label);
    assert(labels[0].includes('연속 참격'));
    assert(labels[1].includes('파쇄 강타'));
    assert(labels[2].includes('격앙'));
}

assert.strictEqual(exposed.getBossPatternPreview({ isBoss: false, patternMode: 'slam' }), null);
assert.strictEqual(exposed.getBossPatternModeLabel('burst'), '연속 참격');
assert.ok(exposed.getBossPatternDescription('slam').includes('3번째 공격'), 'boss pattern descriptions should explain their trigger rule');

{
    const enemy = { isBoss: true, patternMode: 'burst', patternAttackCount: 3, attackTimer: 0.49, hp: 100, maxHp: 100 };
    exposed.refreshBossPatternPreview(enemy);
    assert.strictEqual(exposed.updateBossPatternTelegraph(enemy, 1000), false, 'special attacks should not arm before the warning threshold');
    enemy.attackTimer = 0.5;
    assert.strictEqual(exposed.updateBossPatternTelegraph(enemy, 1000), false, 'crossing the warning threshold should start a minimum telegraph window');
    enemy.attackTimer = 1;
    assert.strictEqual(exposed.updateBossPatternTelegraph(enemy, 1359), false, 'a charged special attack must wait for its warning window');
    assert.strictEqual(exposed.updateBossPatternTelegraph(enemy, 1360), true, 'a special attack may resolve after the minimum warning window');
    exposed.consumeBossPatternAttack(enemy);
    assert.strictEqual(enemy.patternTelegraphKey, null, 'consuming a pattern should clear its telegraph latch');
}

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes('bossAttacksThisTick >= 1'), 'bosses should not execute multiple untelegraphed attacks in one simulation tick');
assert.ok(combatSource.includes('updateBossPatternTelegraph(enemy, Date.now())'), 'combat should enforce special-pattern telegraph readiness');

console.log('smoke-boss-patterns passed');
