// 드랍 풀 1단계(2026-10-07, docs/item-pool-expansion-review-20261007.md): 베이스 드랍 창과 장신구 베이스 14개.
// 베이스 드랍 창(data/items.js BASE_DROP_WEIGHTS, js/passives.js getBaseDropWeight): 드랍 티어보다 4단계 넘게 낮은 일반 베이스는
// 0.15배, 승급 체인 맨 위(6단계 체인의 6단계, 20단계)는 0.25배, 둘 다면 곱한다. 콘텐츠 전용, 계 전용 베이스는 창을 쓰지 않고
// 20단계 이상만 예전처럼 0.04배. 무기 대분류 전용 옵션은 scripts/smoke-weapon-categories.js 9절.
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run('game = mergeDefaults({}); window.game = game;');

// 1. 가중치: 창 안 1, 체인 맨 위 0.25, 창 아래 0.15, 콘텐츠 20단계 0.04.
const weight = (id, tier) => run(`getBaseDropWeight(BASE_ITEM_DB.find(base => base.id === '${id}'), ${tier})`);
assert.equal(weight('resin_amulet', 20), 1, 'a base inside the window weighs 1');
assert.equal(weight('world_tree_leaf_amulet', 20), 0.25, 'the top of a chain weighs a quarter');
assert.equal(weight('bone_amulet', 20), 0.15, 'a base more than four tiers below the drop tier weighs 0.15');
assert.equal(weight('bone_amulet', 5), 1, 'and weighs 1 again near its own tier');
assert.equal(weight('underworld_chain', 20), 0.04, 'content and realm bases of tier 20 keep 0.04');

// 2. 결정적인 쓸기(목걸이 20단계 8000번): 가중치 비율이 실제 뽑기에서도 나온다.
const counts = json(`(() => {
    const keep = Math.random, counts = {};
    try {
        for (let i = 0; i < 8000; i++) {
            Math.random = () => (i + 0.5) / 8000;
            const base = chooseItemBase('목걸이', 20, {});
            counts[base.id] = (counts[base.id] || 0) + 1;
        }
    } finally { Math.random = keep; }
    return counts;
})()`);
assert.ok(Math.abs(counts.world_tree_leaf_amulet / counts.resin_amulet - 0.25) < 0.01, `chain top ${JSON.stringify(counts)}`);
assert.ok(Math.abs(counts.bone_amulet / counts.resin_amulet - 0.15) < 0.01, `below the window ${JSON.stringify(counts)}`);

// 3. 장신구 베이스 14개: 부위와 단계, 승급 체인. 성좌핵 목걸이 뒤에 세계수 잎 목걸이(5단계 중 5), 심판 인장 반지와 식월 반지 뒤에
//    금강석 반지(4단계 중 4). 로프 허리띠 체인은 그대로(새 허리띠는 7단계부터라 로프 허리띠의 다음이 되지 않는다).
const added = { amber_amulet: ['목걸이', 3], jade_amulet: ['목걸이', 3], lapis_amulet: ['목걸이', 3], tree_ring_amulet: ['목걸이', 12],
    resin_amulet: ['목걸이', 16], world_tree_leaf_amulet: ['목걸이', 20], leather_knot_belt: ['허리띠', 7], root_knot_sash: ['허리띠', 8],
    vine_chain_belt: ['허리띠', 13], knot_ornament_belt: ['허리띠', 18], ruby_ring: ['반지', 3], topaz_ring: ['반지', 8],
    twin_stone_ring: ['반지', 14], diamond_ring: ['반지', 18] };
const rows = json(`BASE_ITEM_DB.filter(base => ${JSON.stringify(Object.keys(added))}.includes(base.id)).map(base => [base.id, base.slot, base.reqTier])`);
assert.deepEqual(Object.fromEntries(rows.map(([id, slot, tier]) => [id, [slot, tier]])), added, 'fourteen accessory bases');
assert.equal(run(`BASE_ITEM_DB.filter(base => ['목걸이', '반지', '허리띠'].includes(base.slot) && !base.realmBase && !base.dropOnly).length`), 41, '27 + 14');
const chain = id => json(`(() => { const info = getBaseChainInfo(BASE_ITEM_DB.find(base => base.id === '${id}')); return [info.step, info.total]; })()`);
assert.deepEqual(chain('world_tree_leaf_amulet'), [5, 5]);
assert.deepEqual(chain('constellation_core'), [4, 5]);
assert.deepEqual(chain('diamond_ring'), [4, 4]);
assert.deepEqual(chain('rope_belt'), [1, 4], 'the rope belt keeps its chain');
// 새 베이스는 따로 그린 그림 없이 부위 그림을 쓴다.
assert.equal(run(`getEquipmentGridVisualAsset({ slot: '목걸이', baseId: 'resin_amulet' })`), run(`getEquipmentGridVisualAsset({ slot: '목걸이', baseId: 'no_such_amulet' })`));

console.log('drop pool: base drop window (1, 0.25 chain top, 0.15 below, 0.04 content), 14 accessory bases and their chains: OK');
