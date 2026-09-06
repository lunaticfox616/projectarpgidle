const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/combat-patterns.js', 'utf8');
const exposed = {};
const context = {
    window: {},
    safeExposeGlobals: null
};
context.globalThis = context;
context.safeExposeGlobals = map => { Object.assign(exposed, map); Object.assign(context, map); };
context.safeExposeData = context.safeExposeGlobals;
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/constants.js', 'utf8'), context, { filename: 'data/constants.js' });
vm.runInContext(source, context, { filename: 'js/combat-patterns.js' });
vm.runInContext(fs.readFileSync('js/cosmos-rules.js', 'utf8'), context, { filename: 'js/cosmos-rules.js' });

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

{
    const enemy = { isBoss: true, patternMode: 'cosmosBoss', cosmosBossId: 'planet-45', patternAttackCount: 3, hp: 100, maxHp: 100 };
    const preview = exposed.getBossPatternPreview(enemy);
    assert.strictEqual(preview.label, '혜성 돌진', '에니프론은 공용 성좌 순환 대신 고유 돌진을 사용해야 한다');
    assert.strictEqual(preview.damageMul, 1.70);
    assert.strictEqual(preview.moveCounterPct, 35, '돌진은 이동 속도로 완화할 실제 파훼 수단이 있어야 한다');
}

{
    const tide = exposed.getCosmosBossPatternState('planet-47', 4);
    const balance = exposed.getCosmosBossPatternState('planet-48', 2);
    assert.strictEqual(tide.shieldRestorePct, 8, '디프다르는 지속 화력을 시험하는 보호막 역류를 사용해야 한다');
    assert.strictEqual(balance.elementRule, 'alternatingWeakest', '주베누비아는 편중 방어를 공략해야 한다');
    assert.notStrictEqual(tide.mode, balance.mode, '은하 보스 기믹은 이름만 다른 공용 패턴이면 안 된다');
}

assert.strictEqual(exposed.getBossPatternPeakDamageMultiplier('burst'), 1.30,
    'burst readiness should use its actual peak hit multiplier');
assert.strictEqual(exposed.getBossPatternPeakDamageMultiplier('slam'), 1.55,
    'slam readiness should use its actual peak hit multiplier');
assert.strictEqual(exposed.getMaximumBossPatternDamageMultiplier(), 1.55,
    'unknown boss patterns should use the strongest possible special hit');
assert.deepStrictEqual(Array.from(exposed.getBossPatternModesForLoop(1)), ['intro'],
    'the first loop should teach one readable ground attack');
assert.deepStrictEqual(Array.from(exposed.getBossPatternModesForLoop(5)), ['intro'],
    'early loops should keep the introductory pattern');
assert.deepStrictEqual(Array.from(exposed.getBossPatternModesForLoop(6)), ['ramp'],
    'loop 6 should introduce the gentlest boss pattern first');
assert.deepStrictEqual(Array.from(exposed.getBossPatternModesForLoop(7)), ['ramp', 'burst'],
    'loop 7 should add burst without introducing slam yet');
assert.deepStrictEqual(Array.from(exposed.getBossPatternModesForLoop(8)), ['ramp', 'burst', 'slam'],
    'loop 8 should unlock the complete ordinary boss pattern set');
assert.strictEqual(exposed.getMaximumBossPatternDamageMultiplierForLoop(5), 1.15);
assert.strictEqual(exposed.getMaximumBossPatternDamageMultiplierForLoop(6), 1.21);
assert.strictEqual(exposed.getMaximumBossPatternDamageMultiplierForLoop(7), 1.30);
assert.strictEqual(exposed.getMaximumBossPatternDamageMultiplierForLoop(8), 1.55);
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
    assert.strictEqual(exposed.updateBossPatternTelegraph(enemy, 2499), false, 'a charged special attack must wait for its warning window');
    assert.strictEqual(exposed.updateBossPatternTelegraph(enemy, 2500), true, 'a special attack may resolve after the minimum warning window');
    exposed.consumeBossPatternAttack(enemy);
    assert.strictEqual(enemy.patternTelegraphKey, null, 'consuming a pattern should clear its telegraph latch');
}

// Actual damage, warning locks and automatic escape run in smoke-boss-pattern-areas.js.

console.log('smoke-boss-patterns passed');
