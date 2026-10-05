// 인과(반응형 젬, 2026-10-04): 집중 중 영웅이 맞을 때 5번마다 한 번 터진다. 예상 DPS가 공격 속도만큼 터지는 것처럼 계산되어
// 실제의 수십~수백 배로 보였다(자동 빌드가 이 숫자를 믿고 골랐다가 20분 동안 몇 마리만 잡았다). 이제 초당 1회 피격을 가정한
// 폭발 빈도로 계산한다: 공격 속도가 올라도 인과의 예상 DPS는 그대로이고, 폭발 한 번의 피해 × 1/5가 된다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({ level: 60 }); game.skills = ['기본 공격', '인과', '유성 낙화'];
    game.gemData = { '기본 공격': { level: 1, exp: 0 }, '인과': { level: 16, exp: 0 }, '유성 낙화': { level: 16, exp: 0 } };`);
const estimate = (skill, aspd) => json(`(() => {
    game.activeSkill = '${skill}';
    game.loop10BonusStats = { flatHp: 0, flatDmg: 0, aspd: ${aspd}, move: 0 };
    const s = getPlayerStats(); return { dps: s.dps, aspd: s.aspd || s.finalAspd || 0 };
})()`);
const slow = estimate('인과', 0), fast = estimate('인과', 30);
const meteorSlow = estimate('유성 낙화', 0), meteorFast = estimate('유성 낙화', 30);
assert.ok(meteorFast.dps > meteorSlow.dps * 1.05, 'attack speed raises an ordinary gem\'s estimate');
assert.ok(Math.abs(fast.dps - slow.dps) / slow.dps < 0.01, 'attack speed does not raise the reactive gem\'s estimate');
assert.equal(json(`SKILL_DB['인과'].combatPattern.hitsTakenPerBurst`), 5, 'one source for the hits a burst needs');
assert.ok(slow.dps > 0 && slow.dps < meteorSlow.dps, 'a reactive burst every five hits taken is below a gem that attacks on its own');
console.log('reactive gem estimate: bursts per hits taken, not per attack: OK');
