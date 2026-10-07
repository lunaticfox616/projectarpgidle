// 세계수 기운(12번 루프 27, 2026-10-08, docs/loop-content-12-plan-20261008.md, data/region-affixes.js): 루프 27부터 아틀라스 지도에서
// 떨어진 장비는 그 지역을 기억하고(item.dropRegion), 그 지역 전용 줄(MOD_DB regions)만 그 장비의 옵션 풀에 들어간다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 1. 어느 장비가 지역을 기억하나: 아틀라스 지도, 루프 27부터, 알려진 지역만.
run(`game = mergeDefaults({}); window.game = game;
    window.atlasZone = region => ({ type: 'atlasMap', atlasRegion: region });
    window.atLoop = loop => { game.season = loop; game.contentProgression.highestLoop = loop; };`);
run('atLoop(26);');
assert.equal(run(`getEquipmentDropRegion(atlasZone('roots'))`), null, 'not before loop 27');
run('atLoop(27);');
assert.equal(run(`getEquipmentDropRegion(atlasZone('roots'))`), 'roots', 'an atlas map drop remembers its region');
assert.equal(run(`getEquipmentDropRegion({ type: 'abyss', atlasRegion: 'roots' })`), null, 'only atlas maps');
assert.equal(run(`getEquipmentDropRegion(atlasZone('bogus'))`), null, 'only known regions');
assert.deepEqual(json(`ATLAS.regions.map(row => row.id)`), ['roots', 'trunk', 'canopy', 'garden', 'sanctum']);

// 2. 저장 경계: 알려진 지역만 남는다.
const stored = json(`(() => {
    const base = BASE_ITEM_DB.find(row => row.slot === '반지');
    const keep = normalizeItem(JSON.parse(JSON.stringify(createItemFromBase(base, 'rare', 18, { dropRegion: 'garden' }))));
    const bogus = normalizeItem({ ...JSON.parse(JSON.stringify(keep)), dropRegion: 'nowhere' });
    return [keep.dropRegion, bogus.dropRegion, createItemFromBase(base, 'rare', 18).dropRegion];
})()`);
assert.deepEqual(stored, ['garden', null, null], 'a known region survives a load, an unknown one and a plain drop have none');

// 3. 옵션 풀: 지역 줄은 그 지역 장비에만(검사용 줄을 잠시 더해 본다), 풀 캐시는 지역마다 따로.
const pools = json(`(() => {
    MOD_DB.push({ id: 'testRootsLine', statId: 'pctHp', type: 'suffix', statName: '시험', slots: ['반지'], regions: ['roots'], tierValues: [[1, 1]] });
    availableModPools.clear();
    const base = BASE_ITEM_DB.find(row => row.slot === '반지');
    const has = region => getAvailableMods({ ...createItemFromBase(base, 'normal', 18), dropRegion: region }).some(mod => mod.id === 'testRootsLine');
    const out = { roots: has('roots'), trunk: has('trunk'), none: has(null) };
    MOD_DB.pop();
    availableModPools.clear();
    return out;
})()`);
assert.deepEqual(pools, { roots: true, trunk: false, none: false }, 'a region line only joins its own region\'s pool');
console.log('region affixes: atlas drops remember their region from loop 27, saves keep known regions, region lines join only their pool: OK');
