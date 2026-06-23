// 신규 추가 옵션 검증:
//  - 무기/반지/장갑 속성별 기본 피해(flat) 모드 존재 + 반지/장갑은 무기의 약 20% 수준
//  - 한 줄 복합 옵션(방어flat+방어%, 무기 기본피해+무기피해%)이 extraStats로 두 스탯을 동시에 부여
//  - applyStatsToBucket / addStatToBucket이 extraStats와 physFlatDmg를 올바르게 합산
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// ---- MOD_DB 로드 ----
const stateSrc = fs.readFileSync('js/state.js', 'utf8');
const modDbMatch = stateSrc.match(/const MOD_DB = \[[\s\S]*?\n\];/);
assert(modDbMatch, 'MOD_DB must be found in state.js');
const modCtx = {};
vm.createContext(modCtx);
vm.runInContext(`${modDbMatch[0]}; this.MOD_DB = MOD_DB;`, modCtx);
const MOD_DB = modCtx.MOD_DB;
const byId = id => MOD_DB.find(m => m.id === id);

// 무기 속성 flat 5종
['weaponPhysFlatDmg', 'weaponFireFlatDmg', 'weaponColdFlatDmg', 'weaponLightFlatDmg', 'weaponChaosFlatDmg'].forEach(id => {
    let m = byId(id);
    assert(m && m.slots.includes('무기'), `${id} must exist on weapon`);
});
assert.strictEqual(byId('weaponPhysFlatDmg').statId, 'physFlatDmg', 'weapon phys flat must map to physFlatDmg');
assert.strictEqual(byId('weaponFireFlatDmg').statId, 'fireFlatDmg', 'weapon fire flat must map to fireFlatDmg');

// 반지/장갑 속성 flat: 무기의 약 20% (base/step)
['ring', 'glove'].forEach(prefix => {
    ['Phys', 'Fire', 'Cold', 'Light', 'Chaos'].forEach(ele => {
        let m = byId(`${prefix}${ele}FlatDmg`);
        let slot = prefix === 'ring' ? '반지' : '장갑';
        assert(m && m.slots.includes(slot), `${prefix}${ele}FlatDmg must exist on ${slot}`);
        let w = byId(`weapon${ele}FlatDmg`);
        let ratioBase = m.base / w.base;
        assert(Math.abs(ratioBase - 0.2) < 0.0001, `${prefix}${ele}FlatDmg base must be 20% of weapon (got ${ratioBase})`);
        assert(Math.abs((m.step / w.step) - 0.2) < 0.0001, `${prefix}${ele}FlatDmg step must be 20% of weapon`);
    });
});

// 복합 옵션 정의 확인
const armorCompound = byId('compoundArmor');
assert(armorCompound && armorCompound.statId === 'armor' && Array.isArray(armorCompound.compound), 'compoundArmor must define compound');
assert.strictEqual(armorCompound.compound[0].statId, 'armorPct', 'compoundArmor extra must be armorPct');
// 30% 수준 검증: 단일 armor base 12 → 3.6, armorPct base 6 → 1.8
assert(Math.abs(armorCompound.base - 3.6) < 0.0001, 'compoundArmor armor base must be 30% of 12');
assert(Math.abs(armorCompound.compound[0].base - 1.8) < 0.0001, 'compoundArmor armorPct base must be 30% of 6');
const wpnCompound = byId('compoundWeaponDmg');
assert(wpnCompound && wpnCompound.statId === 'flatDmg' && wpnCompound.compound[0].statId === 'weaponFlatDmgPct', 'compoundWeaponDmg must combine flatDmg + weaponFlatDmgPct');

// 장갑 공격 속도는 이미 존재해야 한다(요청: 없으면 추가).
assert(byId('aspd').slots.includes('장갑'), 'gloves must already roll attack speed (aspd)');

// ---- 굴림 로직(rollAffixValue) 검증: 복합 옵션이 extraStats를 생성 ----
const passSrc = fs.readFileSync('js/passives.js', 'utf8');
function extractFn(name) {
    let re = new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`);
    let m = passSrc.match(re);
    assert(m, `${name} must be found`);
    return m[0];
}
const rollCtx = {
    Math: Math,
    getStatName: id => id,
    clampNumber: (v, lo, hi) => Math.max(lo, Math.min(hi, v))
};
vm.createContext(rollCtx);
vm.runInContext(
    `${extractFn('rollTierValueAffix')}\n${extractFn('rollCompoundExtraStats')}\n${extractFn('rollAffixValue')}\n` +
    `this.rollAffixValue = rollAffixValue;`,
    rollCtx
);
let rolled = rollCtx.rollAffixValue(armorCompound, 10);
assert.strictEqual(rolled.id, 'armor', 'rolled compound primary id must be armor');
assert(Array.isArray(rolled.extraStats) && rolled.extraStats.length === 1, 'rolled compound must carry one extra stat');
assert.strictEqual(rolled.extraStats[0].id, 'armorPct', 'rolled compound extra must be armorPct');
assert(rolled.extraStats[0].tier === rolled.tier, 'extra stat tier must match primary tier');
assert(rolled.val > 0 && rolled.extraStats[0].val > 0, 'compound values must be positive');

let plainRoll = rollCtx.rollAffixValue(byId('weaponFireFlatDmg'), 8);
assert.strictEqual(plainRoll.id, 'fireFlatDmg', 'weapon fire flat rolls fireFlatDmg');
assert(!plainRoll.extraStats, 'non-compound mod must not have extraStats');

// ---- 합산 로직(utils.js) 검증 ----
const utilSrc = fs.readFileSync('js/utils.js', 'utf8');
const utilCtx = { Number: Number };
vm.createContext(utilCtx);
// createEmptyStatBucket / addStatToBucket / applyStatsToBucket from utils.js
function extractFnFrom(src, name) {
    let re = new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`);
    let m = src.match(re);
    assert(m, `${name} must be found`);
    return m[0];
}
vm.runInContext(
    `${extractFnFrom(utilSrc, 'createEmptyStatBucket')}\n${extractFnFrom(utilSrc, 'addStatToBucket')}\n${extractFnFrom(utilSrc, 'applyStatsToBucket')}\n` +
    `this.createEmptyStatBucket = createEmptyStatBucket; this.applyStatsToBucket = applyStatsToBucket;`,
    utilCtx
);
let bucket = utilCtx.createEmptyStatBucket();
assert.strictEqual(bucket.physFlatDmg, 0, 'bucket must include physFlatDmg');
utilCtx.applyStatsToBucket(bucket, [
    { id: 'armor', val: 50, extraStats: [{ id: 'armorPct', val: 12 }] },
    { id: 'physFlatDmg', val: 7 }
]);
assert.strictEqual(bucket.armor, 50, 'compound primary armor must be summed');
assert.strictEqual(bucket.armorPct, 12, 'compound extra armorPct must be summed');
assert.strictEqual(bucket.physFlatDmg, 7, 'physFlatDmg must be summed');

console.log('smoke-flat-element-and-compound-mods: OK');
