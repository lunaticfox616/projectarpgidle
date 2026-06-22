#!/usr/bin/env node
// Verifies the 워록(Warlock) keystone rebalance: 심연 각인(+20% chaos), 부패 증식(DOT 20%/instant -10%),
// 전염 가속(tick +50%/duration -50%), 공허 관통(resPen +21 + crit→resPen, crit=0),
// 심연 군주(jewel slots +2, chaos *1.25, leech/regen *0.5), 피의 계약(ES≥50% → +25% dmg,
// per-attack life 4% cost → 1.5x). Source-of-truth checks against js/state.js + js/combat.js.
const fs = require('fs');
const assert = require('assert');

const state = fs.readFileSync('js/state.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');

// --- Keystone descriptions reflect the new spec ---
assert(state.includes("name: '심연 각인', desc: '모든 피해가 카오스 피해가 됨. 카오스 피해 20% 증폭'"), '심연 각인 desc');
assert(state.includes("name: '부패 증식', desc: '지속 피해 배율 20% 증폭, 즉발 피해 10% 감폭'"), '부패 증식 desc');
assert(state.includes("name: '전염 가속', desc: 'DOT 틱 속도 +50%, 지속시간 -50%'"), '전염 가속 desc');
assert(state.includes("name: '공허 관통', desc: '저항 관통 +21%, 치명타 불가, 치명타 확률이 저항 관통으로 전환'"), '공허 관통 desc');
assert(/name: '피의 계약', desc: '에너지 보호막 50% 이상에서 피해 25% 증폭\. 공격 시 가능하면 생명력 4%를 소모해 해당 공격의 피해 1\.5배'/.test(state), '피의 계약 desc');
assert(state.includes("name: '심연 군주', desc: '주얼 슬롯 2칸 추가, 카오스 피해 25% 증폭, 생명력 회복 효과 50% 감폭'"), '심연 군주 desc');

// --- Stat-branch implementation (js/combat.js warlock else-if) ---
const branch = combat.slice(combat.indexOf("} else if (game.ascendClass === 'warlock') {"));
const wlBranch = branch.slice(0, branch.indexOf("} else if (game.ascendClass === 'guardian')"));

// wlk1: chaos *1.20
assert(/hasKeystone\('wlk1'\)\) \{\s*chaosDamageMultiplier \*= 1\.20;/.test(wlBranch), 'wlk1 chaos 1.20');
// wlk2: DOT *1.20, instant *0.90
assert(/hasKeystone\('wlk2'\)\) \{\s*totalDotDamageMultiplier \*= 1\.20;\s*instantDamageMultiplier \*= 0\.90;/.test(wlBranch), 'wlk2 dot/instant');
// wlk5: tick interval /1.50 (=+50% speed), duration *0.5
assert(/hasKeystone\('wlk5'\)\) \{\s*dotTickIntervalMultiplier \/= 1\.50;\s*dotDurationMultiplier \*= 0\.5;/.test(wlBranch), 'wlk5 tick/duration');
// wlk6: resPen += 21 + crit, crit = 0 (crit chance → resPen, no crit)
assert(/hasKeystone\('wlk6'\)\) \{\s*finalResPen \+= 21 \+ Math\.max\(0, finalCrit\);\s*finalCrit = 0;/.test(wlBranch), 'wlk6 resPen/crit conversion');
// wlk8: chaos *1.25, leech *0.5, regen *0.5
assert(/hasKeystone\('wlk8'\)\) \{\s*chaosDamageMultiplier \*= 1\.25;\s*finalLeech \*= 0\.5;\s*finalRegen \*= 0\.5;/.test(wlBranch), 'wlk8 chaos/heal');
// wlk7: ES >= 50% → +25% base dmg
assert(/hasKeystone\('wlk7'\)\) \{\s*if \(\(game\.playerEnergyShield \|\| 0\) >= \(finalEnergyShield \* 0\.5\)\) finalBaseDmg = Math\.floor\(finalBaseDmg \* 1\.25\);/.test(wlBranch), 'wlk7 ES dmg amp');

// No leftover legacy effects in the warlock branch.
assert(!/finalPoisonChance \+= 25/.test(wlBranch), 'legacy +25 poison removed from warlock branch');
assert(!/finalDr = Math\.max\(-40, finalDr - 12\)/.test(wlBranch), 'legacy wlk7 dr penalty removed');

// --- Per-attack blood-pact mechanic (performPlayerAttack) ---
assert(/hasKeystone\('wlk7'\)\) \{\s*let bloodPactCost = Math\.floor\(\(pStats\.maxHp \|\| game\.playerHp \|\| 1\) \* 0\.04\);\s*if \(bloodPactCost > 0 && \(game\.playerHp \|\| 0\) > bloodPactCost\) \{\s*game\.playerHp -= bloodPactCost;\s*baseDamage = Math\.floor\(baseDamage \* 1\.5\);/.test(combat), 'wlk7 per-attack 4% life → 1.5x');

// --- 심연 군주 grants +2 jewel slots via getMaxJewelSlotCount ---
assert(/function getMaxJewelSlotCount\(\) \{\s*return 2 \+ \(\(game\.ascendClass === 'warlock' && hasKeystone\('wlk8'\)\) \? 2 : 0\);/.test(combat), 'getMaxJewelSlotCount +2 for wlk8');

// --- Numeric sanity: simulate the wlk7 per-attack mechanic in isolation ---
function bloodPact(playerHp, maxHp, baseDamage) {
  let cost = Math.floor((maxHp || playerHp || 1) * 0.04);
  if (cost > 0 && (playerHp || 0) > cost) {
    playerHp -= cost;
    baseDamage = Math.floor(baseDamage * 1.5);
  }
  return { playerHp, baseDamage };
}
let a = bloodPact(1000, 1000, 100);
assert.strictEqual(a.playerHp, 960, 'spends 4% of max life');
assert.strictEqual(a.baseDamage, 150, 'deals 1.5x when affordable');
let b = bloodPact(30, 1000, 100); // cost 40 > current hp 30 → cannot afford
assert.strictEqual(b.playerHp, 30, 'no life spent when unaffordable');
assert.strictEqual(b.baseDamage, 100, 'no damage boost when unaffordable');

console.log('warlock keystone rebalance smoke checks passed');
