const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const start = uiSource.indexOf('let combatLogItemSequence');
const end = uiSource.indexOf('function flushLogQueue', start);
assert(start >= 0 && end > start, 'combat-log item snapshot formatter should be executable in isolation');

const context = {
    Map,
    JSON,
    escapeHTML(text) {
        return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }
};
vm.createContext(context);
vm.runInContext(uiSource.slice(start, end), context, { filename: 'combat-log-item-snapshot.js' });

const item = { id: 17, name: '가시 <검>', rarity: 'rare', slot: '무기', stats: [{ id: 'dmg', val: 12 }] };
const html = context.decorateCombatLogItemMessage(`획득: [${item.name}]`, item);
assert(html.includes('class="combat-log-item-link"'), 'equipment names in the combat log should become tooltip anchors');
assert(html.includes('[가시 &lt;검&gt;]'), 'combat-log item labels must be HTML escaped');
assert(html.includes('onclick="toggleCombatLogItemTooltip'), 'the same anchor should support tap/click pinning');

item.stats[0].val = 999;
const snapshotValue = vm.runInContext('combatLogItemSnapshots.get(1).stats[0].val', context);
assert.strictEqual(snapshotValue, 12, 'tooltip data should retain the acquisition-time item state');

for (let index = 0; index < 81; index++) {
    context.decorateCombatLogItemMessage(`[장비 ${index}]`, { id: index + 100, name: `장비 ${index}` });
}
assert.strictEqual(vm.runInContext('combatLogItemSnapshots.size', context), 80, 'combat-log snapshots should have a bounded memory footprint');
assert.strictEqual(vm.runInContext('combatLogItemSnapshots.has(1)', context), false, 'snapshots older than the visible log history should be discarded');

console.log('smoke-combat-log-item-tooltip passed');
