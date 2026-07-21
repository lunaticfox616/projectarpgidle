const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
const start = source.indexOf('function drawBossPatternLabel');
const end = source.indexOf('function drawBattlefieldPlayerHealthBar', start);
assert(start >= 0 && end > start, 'boss pattern rendering should be executable in isolation');

const calls = [];
const context = {
    Number,
    Math,
    getEnemyTelegraphColor: () => ({ edge: '#fff', fill: '#000' }),
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, value))
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, { filename: 'boss-pattern-visuals.js' });

const ctx = {
    save() {}, restore() {}, beginPath() {}, stroke() {}, setLineDash() {},
    measureText: label => ({ width: label.length * 8 }),
    fillRect: () => calls.push('fillRect'),
    fillText: () => calls.push('fillText'),
    arc: () => calls.push('arc'),
    ellipse: () => calls.push('ellipse'),
    lineTo: () => calls.push('lineTo')
};
const boss = {
    isBoss: true,
    hp: 100,
    attackTimer: 0.9,
    nextPatternState: { isSpecial: true, label: '연속 참격', telegraphKind: 'fan' }
};
context.drawEnemyAttackTelegraphs(ctx, [{ enemy: boss, x: 100, y: 100 }], 1);
assert.deepStrictEqual(calls, ['fillRect', 'fillText'], 'boss patterns should show only their name without scattered geometry');

console.log('smoke-boss-pattern-visuals passed');
