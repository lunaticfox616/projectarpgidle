// 회귀 방지: 재능 개화 미궁(trial_5)은 보스를 실제로 처치해야만 개화가 완료되어야 한다.
// "보스 안 잡았는데 클리어 처리됨" 제보 대응. finishEncounterRun의 개화 분기가
// game.bloomBossDefeated 가드로 보호되고, 보스 사망 시 플래그가 설정되며, 런 시작 시 초기화되는지 확인한다.
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('js/combat.js', 'utf8');

// 1) finishEncounterRun의 bloomTrial 분기가 보스 처치 가드로 보호되어야 한다.
const bloomBranch = src.match(/if \(zone\.type === 'trial' && zone\.bloomTrial\) \{[\s\S]{0,400}?handleTalentBloomClear\(zone\);/);
assert(bloomBranch, 'bloom trial completion branch must exist');
assert(/if \(!game\.bloomBossDefeated\)/.test(bloomBranch[0]), 'bloom completion must be gated by game.bloomBossDefeated');
assert(/startEncounterRun\(\);/.test(bloomBranch[0]), 'a non-boss-kill completion must rebuild the encounter instead of granting bloom');

// 2) 보스 사망 시 개화 미궁에서 플래그가 설정되어야 한다.
assert(
  /if \(enemy\.isBoss && zone && zone\.type === 'trial' && zone\.bloomTrial\) game\.bloomBossDefeated = true;/.test(src),
  'handleEnemyDeath must set bloomBossDefeated when the bloom-trial boss dies'
);

// 3) 런 시작 시 플래그가 초기화되어야 한다(이전 런/지역의 보스 처치 기록 이월 방지).
const startFn = src.match(/function startEncounterRun\(\) \{[\s\S]*?\n\}/);
assert(startFn, 'startEncounterRun must exist');
assert(/game\.bloomBossDefeated = false;/.test(startFn[0]), 'startEncounterRun must reset bloomBossDefeated');

console.log('smoke-bloom-requires-boss-kill: OK');
