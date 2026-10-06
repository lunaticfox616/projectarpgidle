// 전투 기록의 내 공격 줄(2026-10-06 사용자: "플레이어가 준 피해도 누구한테 준건지 표시됐으면 좋겠고 흐린(회색)이랑 주황색이랑
// 나뉘어져있으니까 더 정신없어", "치명타는 그냥 숫자 색만 바꿔도 충분할거같은데?"): 기술, 맞은 적, 피해를 한 줄에 적고, 치명타도
// 같은 줄 색(attack-player)에 피해 숫자만 기록창이 따로 칠한다(smoke-combat-log-icons). 같은 적의 줄끼리만 합친다.
const assert = require('node:assert/strict');
const { runtime: r, enemy, state, run } = require('./audit-combat-20260905').prepare();

const logs = [];
r.addLog = (msg, cls, opts) => logs.push({ msg: String(msg), cls, opts: opts || {} });
state.settings.showCombatLog = true;
state.settings.showDetailedDamageLog = false;
enemy.name = '썩은 잔뿌리';
const stats = r.getPlayerStats();
Object.assign(stats, { accuracy: 1000000, passiveAlwaysHit: true });
const attack = forcedCrit => {
    logs.length = 0;
    r.performPlayerAttack(stats, { forcedCrit });
    run('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();');
    return logs.filter(row => /피해$/.test(row.msg));
};

// ── 한 적: "기술로 적에게 N 피해", 치명타도 같은 줄 색에 숫자만 넘긴다 ─────────────────────────────
const [normal] = attack(false);
assert.ok(normal, 'a landed hit writes a line');
const skillPart = `${r.withDirectionParticle(state.activeSkill)}`;
assert.match(normal.msg, new RegExp(`^\\S+ ${skillPart} 썩은 잔뿌리에게 \\d[\\d,]* 피해$`), 'the line names the skill, the enemy it hit, and the damage');
assert.equal(normal.cls, 'attack-player');
assert.equal(normal.opts.critValue, '', 'an ordinary hit marks no number');
assert.equal(normal.opts.aggregateKey, 'combat:hit:100', 'repeats merge per target');

const [crit] = attack(true);
assert.equal(crit.cls, 'attack-player', 'a critical hit keeps the player-hit line colour (no orange line)');
assert.equal(crit.opts.critValue, crit.msg.match(/(\d[\d,]*) 피해$/)[1], 'and hands over only its damage number to colour');
assert.equal(crit.opts.aggregateKey, 'combat:hit-crit:100', 'crits merge apart from ordinary hits');

// ── 여러 적: 몇 마리에게 갔는지, 합치는 열쇠도 따로 ───────────────────────────────────────────
const hit = { skillName: '일격', swingElement: 'fire', isCrit: false, isDotSkill: false, targets: [], pStats: stats, instantLeechRecovered: 0 };
const spread = r.getPlayerHitCombatLog({ totalHits: 3, totalDamage: 2400, uniqueTargets: new Set([1, 2, 3]), targetName: '셋째' }, hit);
assert.match(spread.line, /^\S+ 일격으로 적 3마리에게 2,400 피해$/, 'a hit spread over several enemies says how many, with the right particle');
assert.equal(spread.options.aggregateKey, 'combat:hit:many');
assert.equal(r.getPlayerHitCombatLog({ totalHits: 1, totalDamage: 0, uniqueTargets: new Set([1]) }, hit), null, 'no line for 0 damage');
state.settings.showCombatLog = false;
assert.equal(r.getPlayerHitCombatLog({ totalHits: 1, totalDamage: 9, uniqueTargets: new Set([1]), targetName: 'a' }, hit), null, 'nor with the log off');
state.settings.showCombatLog = true;

// ── 상세 피해 기록: 같은 줄 뒤에 맥락을 붙인다 ────────────────────────────────────────────────
state.settings.showDetailedDamageLog = true;
const detailed = r.getPlayerHitCombatLog({ totalHits: 2, totalDamage: 1033, uniqueTargets: new Set([100]), targetName: '썩은 잔뿌리' },
    { ...hit, instantLeechRecovered: 2.5, pStats: { ...stats, damageScales: { hpFlatBonus: 40, regen: 1.25 } } });
assert.equal(detailed.line.replace(/^\S+ /, ''), '일격으로 썩은 잔뿌리에게 1,033 피해 / 2히트 / 계수 생명력추가+40, 재생x1.25 / 즉시흡수 +2.5');
state.settings.showDetailedDamageLog = false;

// ── 시체 폭발: 닿은 적을 적고, 아무도 없으면 줄을 남기지 않는다 ────────────────────────────────
const first = { id: 201, name: '첫째', hp: 50, maxHp: 50 }, second = { id: 202, name: '둘째', hp: 5000, maxHp: 5000 };
state.enemies = [enemy, first, second];
const killed = [];
assert.equal(r.explodeCorpse(enemy, 100, '전령 시체 폭발', target => killed.push(target.id)), '💥 전령 시체 폭발로 적 2마리에게 100 피해');
assert.deepEqual(killed, [201], 'each enemy it kills goes to the death handler');
assert.equal(second.hp, 4900);
state.enemies = [enemy, second];
assert.equal(r.explodeCorpse(enemy, 1234, '시체 역병', () => {}, '카오스 피해'), '💥 시체 역병으로 둘째에게 1,234 카오스 피해');
state.enemies = [enemy];
assert.equal(r.explodeCorpse(enemy, 100, '룬 시체 폭발', () => {}), '', 'an explosion that reached nobody writes nothing');

// ── 덧붙는 타격도 누구에게 갔는지 ───────────────────────────────────────────────────────────
logs.length = 0;
state.pendingSlamEchoHits = [{ enemyId: 100, at: -1, damage: 77, element: 'phys' }];
r.processPendingSlamEchoHits();
assert.ok(logs.some(row => row.msg === '🌋 지진의 함성으로 썩은 잔뿌리에게 77 추가 피해'), JSON.stringify(logs));

console.log('smoke-combat-hit-log: ok');
