const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const files = [
  'js/bootstrap.js',
  'cloud-save-config.js',
  'data/constants.js',
  'data/maps.js',
  'data/skills.js',
  'data/items.js',
  'data/passives.js',
  'data/bosses.js',
  'data/rewards.js',
  'data/talent-cards.js',
  'js/utils.js',
  'js/state.js',
  'js/save.js',
  'js/items.js',
  'js/skills.js',
  'js/passives.js',
  'js/core-cube.js',
  'js/combat-grid.js',
  'js/combat.js',
  'js/talent-cards.js',
];

function createElement() {
  return {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getContext() { return null; },
  };
}

const context = {
  console,
  window: null,
  globalThis: null,
  document: {
    readyState: 'loading',
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement,
    head: { appendChild() {} },
    body: { appendChild() {} },
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '', hash: '', href: '' },
  navigator: {},
  addEventListener() {},
  removeEventListener() {},
  setTimeout() {},
  clearTimeout() {},
  setInterval() {},
  clearInterval() {},
  requestAnimationFrame() {},
  cancelAnimationFrame() {},
  Image: function Image() {},
  Date,
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  WeakSet,
  RegExp,
  Error,
  URLSearchParams,
  structuredClone,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
context.getHeroSelectionDef = () => ({ label: '테스트 영웅', classId: null });
context.getCodexBonusPct = () => 0;
context.addLog = () => {};

function resetGame() {
  vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);
  context.game.currentZoneId = 0;
}

function makeEnemy(id, gx, gy, extra) {
  return Object.assign({
    id, hp: 100, maxHp: 100, gx, gy, gridMoveTimer: 0,
    attackKind: 'melee', attackRange: 1, ele: 'phys', ailments: [],
    attackTimer: 0, atkMul: 1, attackSpeedVar: 1, damageMul: 1,
  }, extra || {});
}

const cfg = context.COMBAT_GRID_CONFIG;

// ── 1. 모든 스킬 젬에 유효한 그리드 범위 프로필이 있어야 한다 ──
const validKinds = new Set(['melee', 'arc', 'nova', 'line', 'chain', 'blast']);
Object.keys(context.SKILL_DB).forEach(name => {
  const profile = context.SKILL_GRID_DB[name];
  assert.ok(profile, `스킬 '${name}'의 그리드 범위 프로필이 SKILL_GRID_DB에 없어야 하면 안 된다`);
  assert.ok(validKinds.has(profile.kind), `스킬 '${name}'의 kind가 유효하지 않다: ${profile.kind}`);
  assert.ok(Number.isFinite(profile.range) && profile.range >= 1, `스킬 '${name}'의 range가 유효하지 않다`);
});

// ── 2. 직선 칸 계산(브레젠험) ──
{
  const row = context.gridLineCells(0, 0, 3, 0, 7);
  assert.strictEqual(row.map(c => `${c.gx},${c.gy}`).join('|'), '1,0|2,0|3,0', '가로 직선');
  const diag = context.gridLineCells(0, 0, 2, 2, 7);
  assert.strictEqual(diag.map(c => `${c.gx},${c.gy}`).join('|'), '1,1|2,2', '대각 직선');
  const clipped = context.gridLineCells(6, 6, 12, 12, 7);
  assert.ok(clipped.every(c => context.isGridCellInBounds(c.gx, c.gy)), '전장 밖 칸은 잘려야 한다');
}

// ── 3. 스킬 대상 선택: 사거리/스플래시/관통/연쇄/대상 수 상한 ──
{
  const attacker = { gx: 1, gy: 6 };
  // 근접(사거리 1): 3칸 밖 적은 대상이 없어야 한다
  let far = makeEnemy(1, 4, 6);
  let hits = context.selectGridSkillTargets('기본 공격', { targets: 1, targetMode: 'single' }, attacker, [far]);
  assert.strictEqual(hits.length, 0, '근접 스킬은 사거리 밖 적을 때릴 수 없어야 한다');
  // 근접 인접: 1기만 타격
  let near = makeEnemy(2, 2, 6);
  hits = context.selectGridSkillTargets('기본 공격', { targets: 1, targetMode: 'single' }, attacker, [near, far]);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].enemy.id, 2);
  assert.strictEqual(hits[0].mult, 1);

  // 폭발(서리 폭발, 사거리 5·반경 2): 대상 주변의 적이 함께 맞고, 반경 밖은 안 맞는다
  const inBlast = makeEnemy(3, 4, 4);
  const splash = makeEnemy(4, 5, 5);   // 대상에서 체비셰프 1
  const outside = makeEnemy(5, 7, 0);  // 대상에서 멀리
  hits = context.selectGridSkillTargets('서리 폭발', { targets: 99, targetMode: 'all' }, attacker, [inBlast, splash, outside]);
  const hitIds = hits.map(h => h.enemy.id).sort().join(',');
  assert.strictEqual(hitIds, '3,4', '폭발 범위 안의 적만 함께 맞아야 한다');
  assert.ok(hits.every(h => h.mult === 1), 'all 모드 부가 타격 배율은 1이어야 한다');

  // 직선 관통(관통 사격): 1차 대상 뒤 같은 직선의 적이 함께 맞는다
  const front = makeEnemy(6, 3, 6);
  const behind = makeEnemy(7, 5, 6);
  const offLine = makeEnemy(8, 3, 2);
  hits = context.selectGridSkillTargets('관통 사격', { targets: 4, targetMode: 'pierce' }, attacker, [front, behind, offLine]);
  assert.strictEqual(hits.map(h => h.enemy.id).join(','), '6,7', '직선 위의 적만 관통해야 한다');
  assert.strictEqual(hits[1].mult, 0.65, '관통 2번째 타격 배율');

  // 연쇄(연쇄 폭풍, 점프 2칸): 점프 거리 밖 적으로는 튀지 않는다
  const chainA = makeEnemy(9, 3, 6);
  const chainB = makeEnemy(10, 5, 6);  // A에서 2칸
  const chainFar = makeEnemy(11, 5, 1); // B에서 5칸
  hits = context.selectGridSkillTargets('연쇄 폭풍', { targets: 4, targetMode: 'chain' }, attacker, [chainA, chainB, chainFar]);
  assert.strictEqual(hits.map(h => h.enemy.id).join(','), '9,10', '점프 거리 밖으로는 연쇄되지 않아야 한다');

  // 대상 수 상한: targets=2면 범위 안에 3기가 있어도 2기만 맞는다
  const n1 = makeEnemy(12, 2, 6), n2 = makeEnemy(13, 2, 5), n3 = makeEnemy(14, 1, 5);
  hits = context.selectGridSkillTargets('회오리바람', { targets: 2, targetMode: 'whirl' }, attacker, [n1, n2, n3]);
  assert.strictEqual(hits.length, 2, 'targets 상한을 지켜야 한다');
}

// ── 4. 스폰 배치: 보스 고정 칸, 중복 없는 무작위 배치 ──
{
  resetGame();
  context.resetPlayerGridPosition();
  const blocked = context.getGridBlockedCells();
  const boss = { id: 100, hp: 1000, isBoss: true };
  context.assignEnemyGridSpawn(boss, blocked);
  assert.strictEqual(boss.gx, cfg.bossSpawn.gx);
  assert.strictEqual(boss.gy, cfg.bossSpawn.gy);
  const seen = new Set([`${boss.gx},${boss.gy}`, `${cfg.playerSpawn.gx},${cfg.playerSpawn.gy}`]);
  for (let i = 0; i < 20; i++) {
    const mob = { id: 101 + i, hp: 100 };
    context.assignEnemyGridSpawn(mob, blocked);
    assert.ok(context.isGridCellInBounds(mob.gx, mob.gy), '스폰 칸은 전장 안이어야 한다');
    assert.ok(!seen.has(`${mob.gx},${mob.gy}`), '이미 점유된 칸에 스폰되면 안 된다');
    seen.add(`${mob.gx},${mob.gy}`);
  }
  // 보스 스폰 칸이 점유된 경우 인접 빈 칸으로 밀려난다
  const boss2 = { id: 200, hp: 1000, isBoss: true };
  context.assignEnemyGridSpawn(boss2, blocked);
  assert.ok(context.isGridCellInBounds(boss2.gx, boss2.gy));
  assert.ok(!(boss2.gx === cfg.bossSpawn.gx && boss2.gy === cfg.bossSpawn.gy), '점유된 보스 칸에는 겹쳐 스폰되면 안 된다');
}

// ── 5. 근접/원거리 유형 배정 ──
{
  const boss = { isBoss: true };
  context.assignEnemyGridCombatProfile(boss);
  assert.strictEqual(boss.attackKind, 'ranged', '보스는 항상 원거리여야 한다');
  assert.strictEqual(boss.attackRange, cfg.bossAttackRange);
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.0; // meleeEnemyChance 미만 → 근접
    const melee = { isBoss: false };
    context.assignEnemyGridCombatProfile(melee);
    assert.strictEqual(melee.attackKind, 'melee');
    assert.strictEqual(melee.attackRange, cfg.meleeAttackRange);
    Math.random = () => 0.99; // 이상 → 원거리, 사거리는 최대값
    const ranged = { isBoss: false };
    context.assignEnemyGridCombatProfile(ranged);
    assert.strictEqual(ranged.attackKind, 'ranged');
    assert.ok(ranged.attackRange >= cfg.rangedEnemyMinRange && ranged.attackRange <= cfg.rangedEnemyMaxRange, '원거리 사거리 범위');
  } finally {
    Math.random = originalRandom;
  }
}

// ── 6. 이동: 목표 접근, 점유 칸 회피, 이동 주기 ──
{
  resetGame();
  context.game.enemies = [];
  context.game.summons = [];
  context.resetPlayerGridPosition();
  const walker = makeEnemy(1, 5, 6);
  context.game.enemies.push(walker);
  const before = context.gridChebyshevDist(walker.gx, walker.gy, cfg.playerSpawn.gx, cfg.playerSpawn.gy);
  // 이동 주기(0.5초) 미만 누적으로는 움직이지 않는다
  assert.strictEqual(context.advanceGridUnitMovement(walker, context.game.gridPlayer, 0.1, 0.5), false);
  assert.strictEqual(walker.gx, 5);
  // 주기를 채우면 한 칸 접근한다
  for (let i = 0; i < 4; i++) context.advanceGridUnitMovement(walker, context.game.gridPlayer, 0.1, 0.5);
  const after = context.gridChebyshevDist(walker.gx, walker.gy, cfg.playerSpawn.gx, cfg.playerSpawn.gy);
  assert.strictEqual(after, before - 1, '이동 주기를 채우면 1칸 접근해야 한다');
  // 점유 칸으로는 들어가지 않는다
  const blockerSet = new Set([context.gridCellKey(3, 6)]);
  const stepper = { gx: 4, gy: 6, gridMoveTimer: 0 };
  context.gridStepToward(stepper, 1, 6, blockerSet);
  assert.ok(!(stepper.gx === 3 && stepper.gy === 6), '점유 칸으로 이동하면 안 된다');
  assert.ok(context.gridChebyshevDist(stepper.gx, stepper.gy, 1, 6) < 3, '우회로로라도 접근해야 한다');
}

// ── 7. 그리드 런타임 복구: 구버전 저장(칸/유형 없음)도 배치된다 ──
{
  resetGame();
  context.game.gridPlayer = null;
  context.game.enemies = [
    { id: 1, hp: 50, maxHp: 50, ailments: [] },
    { id: 2, hp: 50, maxHp: 50, isBoss: true, ailments: [] },
  ];
  context.game.summons = [{ id: 1, alive: true, hp: 10, maxHp: 10, role: 'attack', gemName: '서리늑대 소환', slotIdx: 0 }];
  context.ensureCombatGridRuntime();
  assert.ok(context.hasGridCell(context.game.gridPlayer), '플레이어 칸이 복구되어야 한다');
  context.game.enemies.forEach(enemy => {
    assert.ok(context.hasGridCell(enemy), '적 칸이 복구되어야 한다');
    assert.ok(enemy.attackKind === 'melee' || enemy.attackKind === 'ranged', '적 유형이 배정되어야 한다');
  });
  assert.strictEqual(context.game.enemies[1].attackKind, 'ranged', '보스는 원거리로 복구되어야 한다');
  assert.ok(context.hasGridCell(context.game.summons[0]), '소환수 칸이 복구되어야 한다');
  const keys = new Set();
  [context.game.gridPlayer, ...context.game.enemies, ...context.game.summons].forEach(unit => {
    const key = context.gridCellKey(unit.gx, unit.gy);
    assert.ok(!keys.has(key), '복구 배치도 칸이 겹치면 안 된다');
    keys.add(key);
  });
}

// ── 8. 적 사거리 판정과 사거리 밖 접근(공격 대신 이동) ──
{
  resetGame();
  context.resetPlayerGridPosition();
  const meleeFar = makeEnemy(1, 6, 6);
  const rangedNear = makeEnemy(2, 4, 6, { attackKind: 'ranged', attackRange: 4 });
  context.game.enemies = [meleeFar, rangedNear];
  assert.strictEqual(context.isEnemyInGridAttackRange(meleeFar), false, '5칸 밖 근접 적은 사거리 밖');
  assert.strictEqual(context.isEnemyInGridAttackRange(rangedNear), true, '3칸 거리 원거리(사거리 4) 적은 사거리 안');

  const pStats = {
    maxHp: 1000, energyShield: 0, dr: 0, armor: 0, evasion: 0, regen: 0, aspd: 1, moveSpeed: 100,
    resF: 0, resC: 0, resL: 0, resChaos: 0, chillEffectReducePct: 0, physTakenAs: {},
  };
  context.game.playerHp = 1000;
  const distBefore = context.gridChebyshevDist(meleeFar.gx, meleeFar.gy, context.game.gridPlayer.gx, context.game.gridPlayer.gy);
  meleeFar.attackTimer = 5; // 사거리 밖에서는 누적 공격 게이지가 1회분으로 줄어야 한다
  rangedNear.noAttack = true; // 이 검사는 근접 적의 이동만 본다
  for (let i = 0; i < 6; i++) context.performMonsterAttacks(pStats);
  const distAfter = context.gridChebyshevDist(meleeFar.gx, meleeFar.gy, context.game.gridPlayer.gx, context.game.gridPlayer.gy);
  assert.ok(distAfter < distBefore, '사거리 밖 근접 적은 플레이어에게 접근해야 한다');
  assert.ok(meleeFar.attackTimer <= 1, '사거리 밖에서는 공격 게이지가 1회분을 넘지 않아야 한다');
  assert.strictEqual(context.game.playerHp, 1000, '사거리 밖 적은 피해를 주지 못해야 한다');
}

// ── 9. 플레이어 자동 이동: 사거리 밖이면 접근, 안이면 공격 가능 ──
{
  resetGame();
  context.resetPlayerGridPosition();
  context.game.activeSkill = '기본 공격';
  context.game.enemies = [makeEnemy(1, 6, 1, { attackKind: 'ranged', attackRange: 4 })];
  const pStats = { sSkill: { ...context.SKILL_DB['기본 공격'] }, moveSpeed: 100, aspd: 1 };
  const start = { ...context.game.gridPlayer };
  let engaged = context.updatePlayerGridEngagement(pStats);
  assert.strictEqual(engaged, false, '근접 스킬 사거리 밖이면 공격 불가');
  for (let i = 0; i < 40 && !engaged; i++) engaged = context.updatePlayerGridEngagement(pStats);
  assert.strictEqual(engaged, true, '자동 이동으로 접근해 결국 교전해야 한다');
  const moved = context.gridChebyshevDist(start.gx, start.gy, context.game.gridPlayer.gx, context.game.gridPlayer.gy);
  assert.ok(moved > 0, '플레이어가 실제로 이동했어야 한다');
  assert.strictEqual(context.getSkillTargets(pStats).length, 1, '교전 상태에서는 대상이 잡혀야 한다');
}

console.log('smoke-grid-combat passed');
