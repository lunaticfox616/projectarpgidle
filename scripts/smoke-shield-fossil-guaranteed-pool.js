// 회귀 방지: 🛡️ 방패 화석(fossilBulwark)은 방패에 사용 가능해야 한다.
// guaranteedStats는 스탯 id(maxResF/C/L)로 적혀 있고, 방패 최대저항 모드는 id='shieldMaxResF'·statId='maxResF'.
// 보장 풀 필터가 mod.id로 비교하면 방패에서도 매칭되지 않아 "이 슬롯에 사용할 수 없습니다"가 떴다.
// 이제 mod.statId||mod.id로 비교하므로 방패에서 보장 풀이 존재해야 한다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// MOD_DB / FOSSIL_DB 로드
const stateSrc = fs.readFileSync('js/state.js', 'utf8');
const modDb = stateSrc.match(/const MOD_DB = \[[\s\S]*?\n\];/);
const fossilDb = stateSrc.match(/const FOSSIL_DB = \[[\s\S]*?\n\];/);
assert(modDb && fossilDb, 'MOD_DB and FOSSIL_DB must be present');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${modDb[0]}\n${fossilDb[0]}\nthis.MOD_DB = MOD_DB; this.FOSSIL_DB = FOSSIL_DB;`, ctx);

// applyFossilChaosCraft에서 쓰는 보장 풀 필터(수정본)를 그대로 재현한다.
// 방패 화석은 모든 방어구(투구/갑옷/장갑/신발/방패)에서 최대 저항 확정 옵션을 부여하도록 슬롯 제한을 완화한다.
const ARMOR_DEFENSE_SLOTS = new Set(['투구', '갑옷', '장갑', '신발', '방패']);
function guaranteedPoolFor(fossilKey, slot) {
  const fossil = ctx.FOSSIL_DB.find(f => f.key === fossilKey);
  let pool = ctx.MOD_DB.filter(mod => mod.slots.includes(slot) && fossil.guaranteedStats.includes(mod.statId || mod.id));
  if (fossilKey === 'fossilBulwark' && pool.length === 0 && ARMOR_DEFENSE_SLOTS.has(slot)) {
    pool = ctx.MOD_DB.filter(mod => fossil.guaranteedStats.includes(mod.statId || mod.id));
  }
  return pool;
}

// 수정 전 동작(버그) 재현용: mod.id로 비교.
function guaranteedPoolBuggy(fossilKey, slot) {
  const fossil = ctx.FOSSIL_DB.find(f => f.key === fossilKey);
  return ctx.MOD_DB.filter(mod => mod.slots.includes(slot) && fossil.guaranteedStats.includes(mod.id));
}

// 버그 재현: 방패 화석이 방패에서 보장 풀이 비어 있었음을 확인.
assert.strictEqual(guaranteedPoolBuggy('fossilBulwark', '방패').length, 0, 'sanity: the old (mod.id) filter yields an empty pool on shields');

// 수정 후: 방패 화석이 방패에서 최대 화염/냉기/번개 저항 모드를 보장 풀로 가져야 한다.
const fixed = guaranteedPoolFor('fossilBulwark', '방패');
assert(fixed.length >= 3, 'shield fossil must resolve guaranteed max-resist mods on a shield');
const statIds = new Set(fixed.map(m => m.statId || m.id));
['maxResF', 'maxResC', 'maxResL'].forEach(s => assert(statIds.has(s), `shield fossil guaranteed pool must include ${s}`));

// 방패 화석은 이제 다른 방어구(투구/갑옷/장갑/신발)에도 최대 저항 확정 옵션을 부여할 수 있어야 한다.
['투구', '갑옷', '장갑', '신발'].forEach(slot => {
  let pool = guaranteedPoolFor('fossilBulwark', slot);
  assert(pool.length >= 3, `shield fossil must grant max-resist guarantee on ${slot}`);
  let ids = new Set(pool.map(m => m.statId || m.id));
  ['maxResF', 'maxResC', 'maxResL'].forEach(s => assert(ids.has(s), `${slot} shield-fossil pool must include ${s}`));
});

// 방어구가 아닌 슬롯(예: 무기)에는 방패 화석이 적용되지 않아야 한다(보장 풀 비어 있음).
assert.strictEqual(guaranteedPoolFor('fossilBulwark', '무기').length, 0, 'shield fossil must not apply to non-armor slots (weapon)');

// 일반 화석(예: 톱니 화석)은 기존처럼 해당 슬롯에서 정상 매칭되어야 한다(회귀 없음).
assert(guaranteedPoolFor('fossilJagged', '무기').length > 0, 'jagged fossil must still resolve on weapons');

console.log('smoke-shield-fossil-guaranteed-pool: OK');
