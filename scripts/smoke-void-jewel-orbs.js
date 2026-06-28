'use strict';
// 공허 주얼: 신성/엑잘티드 오브만 사용 가능(엑잘 최대 6줄), 공허 합성은 각 주얼 1~4줄 계승 후 최대 6줄.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'passives.js'), 'utf8');
function slice(from, to) {
  const a = src.indexOf(from), b = src.indexOf(to, a);
  assert(a >= 0 && b > a, `블록을 찾을 수 없습니다: ${from}`);
  return src.slice(a, b);
}
const orbKeysLine = src.match(/const JEWEL_CRAFT_ORB_KEYS = \[[^\]]*\];/)[0];
const useState = slice('function getJewelCurrencyUseState', 'function useCurrencyOnJewel');
const fusion = slice('function pickRandomVoidFusionStats', 'function createVoidJewelFromMaterials');

const ctx = {
  Math, Object, Array, Number, Set, JSON, console,
  getJewelCoreStats: (j) => ((j && j.stats) || []).filter(s => !s.petite),
  cloneJewelStat: (s) => Object.assign({}, s),
  rollRandomJewelStat: () => ({ id: 'rng_' + Math.random().toString(36).slice(2, 6), tier: 1 }),
};
vm.createContext(ctx);
vm.runInContext(orbKeysLine + '\n' + useState + '\n' + fusion, ctx);

const state = (key, jewel) => vm.runInContext('getJewelCurrencyUseState', ctx)(key, jewel);

// 공허 주얼: 진화/카오스/제왕 등은 거부
let voidJewel = { isVoid: true, rarity: 'rare', stats: [{ id: 'a' }, { id: 'b' }] };
assert.strictEqual(state('transmute', voidJewel).enabled, false, '공허+진화 거부');
assert.strictEqual(state('chaos', voidJewel).enabled, false, '공허+카오스 거부');
assert.strictEqual(state('regal', voidJewel).enabled, false, '공허+제왕 거부');
assert.strictEqual(state('alteration', voidJewel).enabled, false, '공허+변화 거부');
// 신성/엑잘만 허용
assert.strictEqual(state('divine', voidJewel).enabled, true, '공허+신성 허용');
assert.strictEqual(state('exalted', voidJewel).enabled, true, '공허+엑잘 허용(2줄<6)');
// 엑잘 상한 6
let fullVoid = { isVoid: true, rarity: 'rare', stats: Array.from({ length: 6 }, (_, i) => ({ id: 'v' + i })) };
assert.strictEqual(state('exalted', fullVoid).enabled, false, '공허 6줄에서 엑잘 거부');
assert.strictEqual(state('divine', fullVoid).enabled, true, '공허 6줄에서도 신성은 허용');

// 일반(비공허) 등급 상한은 그대로 (매직 2, 레어 4)
assert.strictEqual(state('augment', { rarity: 'magic', stats: [{ id: 'a' }, { id: 'b' }] }).enabled, false, '매직 2줄에서 확장 거부');
assert.strictEqual(state('exalted', { rarity: 'rare', stats: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] }).enabled, false, '레어 4줄에서 엑잘 거부');

// 공허 합성: 1~6줄, 중복 없음, 원본에서 계승
const jA = { stats: Array.from({ length: 4 }, (_, i) => ({ id: 'A' + i, tier: 1 })) };
const jB = { stats: Array.from({ length: 4 }, (_, i) => ({ id: 'B' + i, tier: 1 })) };
for (let t = 0; t < 50; t++) {
  const merged = vm.runInContext('mergeVoidFusionStats', ctx)(jA, jB);
  assert(merged.length >= 1 && merged.length <= 6, '합성 결과 1~6줄');
  const ids = merged.map(s => s.id);
  assert.strictEqual(new Set(ids).size, ids.length, '중복 없음');
}

console.log('smoke-void-jewel-orbs: OK (void orbs divine/exalted only, cap 6, fusion 1~4+1~4<=6)');
