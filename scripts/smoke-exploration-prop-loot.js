// 항아리와 나무 상자(2026-10-07 사용자 "가끔씩 낮은 확률로 장비 보상"): 루프와 상관없이 깨질 때 10% 확률로 장비 하나,
// 재화는 열려 있을 때만 30%. 예전에는 재화뿐이라 재화가 잠긴 루프 1에는 늘 비어 있었다(data/maps.js EXPLORATION_PROP_LOOT).
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');

const { run } = fixture(11);
// A new loop-1 player: no inherited unlocks (the bare fixture save counts as a pre-ledger save that inherits crafting).
run(`rollExplorationFacing = () => undefined; game.currentZoneId = 0; game.combatHalted = false; game.moveTimer = 0;
    Object.assign(game.contentProgression, { legacy: false, inherited: [], unlocked: [] });`);
assert.equal(run("contentProgression.canDropCurrency('magicBud')"), false, 'fixture: currency is locked in loop 1');
function breakProps(maps) {
    return JSON.parse(run(`(() => {
        const out = { props: 0, items: 0, currency: 0 };
        for (let i = 0; i < ${maps}; i++) {
            startEncounterRun(true);
            const run = game.actExploration, rows = (run.objects ? run.objects.entries : []).filter(row => ['pot', 'crate'].includes(row.kind));
            out.props += rows.length;
            run.groundLoot = [];
            actExplorationProgress.objects.area(rows.map(row => ({ gx: row.gx, gy: row.gy })));
            out.items += run.groundLoot.filter(row => row.item).length;
            out.currency += run.groundLoot.filter(row => row.currency).length;
        }
        return JSON.stringify(out);
    })()`));
}

const locked = breakProps(150);
assert.ok(locked.props >= 300, `fixture: enough props (${locked.props})`);
assert.equal(locked.currency, 0, 'loop 1 has no currency to give');
const lockedRate = locked.items / locked.props;
assert.ok(lockedRate > 0.05 && lockedRate < 0.16, `a loop-1 prop now and then holds equipment: ${(lockedRate * 100).toFixed(1)}%`);

// Loop 2 with crafting bought: currency opens through the real unlock ledger.
run(`game.season = 2; game.contentProgression.unlocked = ['craft'];`);
assert.equal(run("contentProgression.canDropCurrency('magicBud')"), true, 'fixture: currency opens with crafting');
const open = breakProps(150);
const itemRate = open.items / open.props, currencyRate = open.currency / open.props;
assert.ok(itemRate > 0.05 && itemRate < 0.16, `equipment keeps its chance once currency opens: ${(itemRate * 100).toFixed(1)}%`);
assert.ok(currencyRate > 0.22 && currencyRate < 0.38, `currency keeps its 30%: ${(currencyRate * 100).toFixed(1)}%`);
console.log(`prop loot: loop 1 ${locked.items}/${locked.props} equipment, opened ${open.items} equipment and ${open.currency} currency of ${open.props}`);
