// 이름을 바꾼 아틀라스 id(2026-10-08, data/atlas.js ATLAS.renamed): 후반 보스 넷과 제단 방 둘의 예전 id는 해시로만 적고, 저장을
// 불러올 때(atlas.normalize) 아틀라스, 탐험 지도, 적 상태 안에서 값과 키 모두 새 id로 바꾼다. 이 검사는 지어낸 예전 id와 그 해시로
// 같은 길을 확인한다(실제 예전 id는 어디에도 적지 않는다).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const fnv = text => {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, '0');
};

// 1. 표: 해시 여섯 개(16진수 8자리)가 지금 있는 보스 노드 넷과 제단 방 둘을 가리킨다.
const table = json('ATLAS.renamed');
assert.equal(Object.keys(table).length, 6);
assert.ok(Object.keys(table).every(hash => /^[0-9a-f]{8}$/.test(hash)), 'old ids are hashes only');
assert.deepEqual(Object.values(table).sort(), ['apex_archbishop', 'apex_compost', 'apex_devourer', 'apex_weaver', 'blueAltar', 'redAltar']);
for (const id of ['apex_archbishop', 'apex_compost', 'apex_devourer', 'apex_weaver']) assert.ok(run(`!!atlas.node('${id}')`), `${id} is an atlas node`);
for (const type of ['redAltar', 'blueAltar']) assert.ok(run(`Object.hasOwn(ATLAS.encounters, '${type}')`), `${type} is a room`);

// 2. 바꾸기: 값(완료 목록, 방 목록, 탐험 무리, 적)과 키(처치 수, 기억 던전 기록) 모두. 다른 값은 그대로다.
const fake = { [fnv('legacy_boss')]: 'apex_weaver', [fnv('legacy_room')]: 'redAltar' };
const saved = json(`(() => {
    const state = { atlas: { completed: ['roots_0', 'legacy_boss'], run: { encounters: ['legacy_room', 'breach'] },
            endgame: { kills: { legacy_boss: 2, apex_gardener: 1 } }, memory: { tickets: { legacy_boss: [1, 0, 0, 0, 0] }, best: {} } },
        actExploration: { packs: [{ key: 'a', encounter: 'legacy_room' }, { key: 'b', encounter: 'hive' }] },
        enemies: [{ name: 'legacy_room', encounter: 'legacy_room' }] };
    atlas.renameSavedIds([state.atlas, state.actExploration, state.enemies], ${JSON.stringify(fake)});
    return state;
})()`);
assert.deepEqual(saved.atlas.completed, ['roots_0', 'apex_weaver']);
assert.deepEqual(saved.atlas.run.encounters, ['redAltar', 'breach']);
assert.deepEqual(saved.atlas.endgame.kills, { apex_gardener: 1, apex_weaver: 2 });
assert.deepEqual(Object.keys(saved.atlas.memory.tickets), ['apex_weaver']);
assert.deepEqual(saved.actExploration.packs.map(pack => pack.encounter), ['redAltar', 'hive']);
assert.deepEqual(saved.enemies[0], { name: 'redAltar', encounter: 'redAltar' }, 'any whole-string old id in the loaded state');

// 3. 불러오기: atlas.normalize가 실제 표로 부른다. 새 id로 된 저장은 그대로 지난다.
const loaded = json(`(() => { const state = mergeDefaults({}); state.atlas.completed = ['roots_0', 'apex_weaver']; atlas.normalize(state); return state.atlas.completed; })()`);
assert.deepEqual(loaded, ['roots_0', 'apex_weaver']);
console.log('atlas renamed ids smoke passed');
