const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('js/passives.js', 'utf8');
const manifestStart = source.indexOf('    const manifest = {', source.indexOf('function initBattleAssets('));
const manifestEnd = source.indexOf('\n    };', manifestStart);

assert(manifestStart >= 0 && manifestEnd > manifestStart, 'battle asset manifest must be present');
const manifestSource = source.slice(manifestStart, manifestEnd);
const assetPaths = [...manifestSource.matchAll(/'((?:assets\/)[^'?]+)(?:\?[^']*)?'/g)].map(match => match[1]);

assert(assetPaths.length > 20, 'battle asset manifest must retain its local asset entries');
assetPaths.forEach(assetPath => {
    assert(fs.existsSync(assetPath), `battle asset manifest references a missing file: ${assetPath}`);
});

console.log(`smoke-battle-asset-manifest passed (${assetPaths.length} local assets)`);
