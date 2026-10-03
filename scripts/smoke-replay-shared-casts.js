// 오프라인 재연이 전투 상태를 복제해도(PR #1030 리뷰, 2026-10-03) 한 시전의 단계 줄들은 같은 파동 · 회오리 상태를 함께 쓴다:
// 서리 폭발과 회오리바람은 몬스터마다 한 번만 맞힌다(JSON 복제 때는 [1, 5, 5]처럼 여러 번 맞혔다).
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
run('showGameToast = () => {}; resetGame();');

const enemy = (id, gx, gy) => `{ id: ${id}, hp: 1e9, maxHp: 1e9, gx: ${gx}, gy: ${gy}, gridMoveTimer: 0, attackKind: 'melee', attackRange: 1, ele: 'phys',
    ailments: [], attackTimer: 0, atkMul: 1, attackSpeedVar: 1, damageMul: 1, armor: 0, evasion: 0, evasionChance: 0, dr: 0, resF: 0, resC: 0, resL: 0, resChaos: 0 }`;
function hitsAfterReplayClone(skill, enemies) {
    run(`resetGame(); game.activeSkill = ${JSON.stringify(skill)}; game.skills = Array.from(new Set([...(game.skills || []), ${JSON.stringify(skill)}]));
        game.gemData[${JSON.stringify(skill)}] = { level: 1, exp: 0, quality: 0 }; game.gridPlayer = { gx: 0, gy: 4, gridMoveTimer: 0 };
        game.enemies = [${enemies.join(',')}]; game.combatTimeMs = 1e12; battleFx = []; pendingSkillStageHits = [];
        globalThis.__stats = getPlayerStats(); Object.assign(__stats, { minDmgRoll: 100, maxDmgRoll: 100, accuracy: 1e9, crit: 0 });
        performPlayerAttack(__stats);
        globalThis.__start = Math.min(...pendingSkillStageHits.map(row => row.at));
        game.combatTimeMs = __start; processPendingSkillStageHits();
        restoreCombatRuntime(createCombatReplay(5000, game, game.combatTimeMs).runtime);
        game.combatTimeMs = __start + 5000; processPendingSkillStageHits();`);
    return JSON.parse(run("JSON.stringify(game.enemies.map(e => battleFx.filter(fx => fx.type === 'hit' && fx.enemyId === e.id).length))"));
}
assert.deepStrictEqual(hitsAfterReplayClone('서리 폭발', [enemy(1, 4, 4), enemy(2, 5, 4), enemy(3, 6, 4)]), [1, 1, 1], 'frost burst: one hit per monster');
assert.deepStrictEqual(hitsAfterReplayClone('회오리바람', [enemy(11, 1, 4), enemy(12, 0, 5)]), [1, 1], 'whirlwind: one hit per monster');
console.log('replay clone keeps one cast\'s stages sharing their wave and whirl state: OK');
