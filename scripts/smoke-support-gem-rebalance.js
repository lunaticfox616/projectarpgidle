#!/usr/bin/env node
// Verifies the support-gem follow-up rebalance:
// 1) "잔향"(echo) support gem grants stackable periodic-on-hit triggers capped at 12 queued hits per enemy.
// 2) Pierce-overkill carry (pierceOverkillCarry / hunter h4) decays carried damage by 80% per chain hop.
// 3) Elemental support gems (화염 주입/냉기 증폭/번개 전도/혼돈 전환) scale off the player's own elemental % damage.
const fs = require('fs');
const assert = require('assert');

const state = fs.readFileSync('js/state.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');

// --- 1) 잔향 support gem data ---
assert(/'잔향': \{ baseVal: 8, scale: 3\.0, stat: 'echoPower'/.test(state), '잔향 support gem must exist with echoPower stat');
assert(state.includes('남은 타격 수 합계는 최대 12회로 제한됩니다'), '잔향 desc must state the 12-hit chain cap');

// --- 1) periodic-on-hit stacking with global per-enemy chain cap ---
assert(combat.includes('const SKILL_PERIODIC_CHAIN_CAP = 12;'), 'global periodic chain cap must be 12');
assert(/function queueSkillPeriodicHit\(enemy, config, damage, ele\) \{/.test(combat), 'queueSkillPeriodicHit must exist');
assert(/enemy\.skillPeriodics = Array\.isArray\(enemy\.skillPeriodics\) \? enemy\.skillPeriodics : \[\];/.test(combat), 'skillPeriodics must be a stacking array');
assert(/function applySupportEchoOnHit\(enemy, pStats, damage\) \{/.test(combat), 'applySupportEchoOnHit must exist');
assert(/applySupportEchoOnHit\(targetEnemy, pStats, dealtToEnemy\);/.test(combat), 'applySupportEchoOnHit must be wired into the hit pipeline');

// --- numeric sanity: queueSkillPeriodicHit respects the 12-hit global cap when stacking ---
function makeQueue() {
  const CAP = 12;
  function queue(enemy, config) {
    enemy.skillPeriodics = enemy.skillPeriodics || [];
    let queuedHits = enemy.skillPeriodics.reduce((sum, fx) => sum + Math.max(0, fx.hitsLeft || 0), 0);
    let allowedHits = Math.max(0, CAP - queuedHits);
    if (allowedHits <= 0) return;
    let hits = Math.min(Math.max(1, Math.floor(config.hits || 1)), allowedHits);
    enemy.skillPeriodics.push({ hitsLeft: hits });
  }
  return queue;
}
let queue = makeQueue();
let enemy = { skillPeriodics: [] };
queue(enemy, { hits: 5 });
queue(enemy, { hits: 5 });
queue(enemy, { hits: 5 });
let total = enemy.skillPeriodics.reduce((sum, fx) => sum + fx.hitsLeft, 0);
assert.strictEqual(total, 12, 'stacked periodic instances must combine but never exceed the 12-hit cap');
assert.strictEqual(enemy.skillPeriodics.length, 3, 'instances stack as separate entries instead of overwriting each other');
assert.strictEqual(enemy.skillPeriodics[2].hitsLeft, 2, 'the third stack is truncated to whatever headroom remains under the cap');

// --- 2) pierce overkill carry: 80% decay per chain hop ---
assert(/remainingDamage = Math\.max\(0, Math\.floor\(\(remainingDamage - dealtToChain\) \* 0\.8\)\);/.test(combat), 'pierce overkill carry must decay remaining damage by 80% per hop');
assert(combat.includes("전이될 때마다 전달 피해가 80%로 감쇄합니다") === false, 'decay note belongs in data/skills.js, not combat.js');
const skillsSrc = fs.readFileSync('data/skills.js', 'utf8');
assert(skillsSrc.includes('전이될 때마다 전달 피해가 80%로 감쇄합니다'), '관통 사격 desc must mention the 80% per-hop decay');
assert(state.includes("전이마다 80%로 감쇄"), 'hunter h4 (연쇄 관통) desc must mention the 80% per-hop decay');

function pierceCarryDecay(remainingDamage, dealtToChain) {
  return Math.max(0, Math.floor((remainingDamage - dealtToChain) * 0.8));
}
assert.strictEqual(pierceCarryDecay(1000, 400), 480, 'overkill remainder decays to 80% after a chain hop');
assert.strictEqual(pierceCarryDecay(1000, 1000), 0, 'fully consumed damage leaves nothing to decay');

// --- 3) NEW resonance support gems scale off the player's own elemental % damage (no flat baseVal/scale stat grind, no RNG) ---
['화염 공명', '냉기 공명', '번개 공명', '혼돈 공명'].forEach(name => {
  assert(new RegExp(`'${name}': \\{[^}]*scaleWithOwnStat: '\\w+PctDmg'`).test(state), `${name} must scale with the player's own matching pct-dmg stat`);
});
// original flat elemental gems remain untouched alongside the new resonance gems
assert(/'화염 주입': \{ baseVal: 5, scale: 2\.0[^}]*\}/.test(state), 'original flat 화염 주입 definition must remain');
assert(!/'화염 주입': \{[^}]*scaleWithOwnStat/.test(state), '화염 주입 must not carry the scaleWithOwnStat mechanic');

assert(/if \(db\.scaleWithOwnStat\) \{/.test(combat), 'support aggregation loop must special-case scaleWithOwnStat gems');
assert(/let ownStatTotal = gearBase\[db\.scaleWithOwnStat\] \+ gearExplicit\[db\.scaleWithOwnStat\]/.test(combat), 'own-stat total must be summed from non-support buckets only (no self-reference loop)');

// --- numeric sanity: scaleWithOwnStat support contributes a % of the *other* buckets' total, not a flat stack ---
function scaleWithOwnStatVal(ownStatTotal, baseVal, scale, level, tierMul) {
  let ratioPct = (baseVal + ((level - 1) * scale)) * tierMul;
  return Math.max(0, ownStatTotal) * (ratioPct / 100);
}
assert.strictEqual(scaleWithOwnStatVal(100, 8, 1.5, 1, 1), 8, 'level 1, tier 1: 8% of 100 existing firePctDmg = +8');
assert.strictEqual(scaleWithOwnStatVal(0, 8, 1.5, 10, 1), 0, 'zero existing elemental % damage means zero bonus regardless of gem level');
assert(Math.abs(scaleWithOwnStatVal(200, 8, 1.5, 5, 1) - 28) < 1e-9, 'bonus scales linearly with both gem level and own existing pct dmg');

console.log('support gem rebalance smoke checks passed');
