const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const mapsSource = fs.readFileSync('data/maps.js', 'utf8');
const bossesSource = fs.readFileSync('data/bosses.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(mapsSource, context, { filename: 'data/maps.js' });
vm.runInContext(bossesSource, context, { filename: 'data/bosses.js' });

const manifest = context.window.BOSS_ASSET_MANIFEST;
assert(manifest, 'boss asset manifest must be exposed from data/bosses.js');
Object.entries(manifest).forEach(([key, src]) => {
    assert(fs.existsSync(src), `${key} must point at an existing boss asset: ${src}`);
});

context.window.STORY_ACTS.forEach((zone, idx) => {
    const key = context.window.getBossAssetKeyForZone({ ...zone, id: idx, type: 'act' }, 0);
    assert(key && manifest[key], `act ${idx + 1} must resolve to a manifest boss image`);
});
assert.strictEqual(context.window.getBossAssetKeyForZone({ id: 9, type: 'act' }, 4), 'bossAct10_5', 'act 10 must support all provided variant images');
assert.strictEqual(context.window.getBossAssetKeyForZone({ id: 1, type: 'trial' }, 0), null, 'non-story bosses without assets must fall back to atlas sprites');

assert(combatSource.includes('bossAssetKey: bossAssetKey'), 'created enemies must carry the resolved boss asset key');
assert(passivesSource.includes('...((typeof BOSS_ASSET_MANIFEST'), 'battle loader must include the boss asset manifest');
assert(passivesSource.includes('bossImages: bossImages'), 'battle atlas must expose loaded boss images to the renderer');
assert(uiSource.includes('getBossAssetVariantEntry(enemy, enemyAtlas) || pickBattleEnemyVariant'), 'canvas enemy renderer must prefer mapped boss images before generic variants');

console.log('Boss canvas asset smoke checks passed.');
