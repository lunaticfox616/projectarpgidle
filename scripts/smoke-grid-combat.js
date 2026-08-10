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
  'data/growth-items.js',
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
  performance: { now() { return Date.now(); } },
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
const validKinds = new Set(['melee', 'arc', 'nova', 'line', 'chain', 'blast', 'fan', 'summon']);
const validShapes = new Set(['diamond', 'square', 'cross', 'diagonal', 'ring']);
Object.keys(context.SKILL_DB).forEach(name => {
  const profile = context.SKILL_GRID_DB[name];
  assert.ok(profile, `스킬 '${name}'의 그리드 범위 프로필이 SKILL_GRID_DB에 없어야 하면 안 된다`);
  assert.ok(validKinds.has(profile.kind), `스킬 '${name}'의 kind가 유효하지 않다: ${profile.kind}`);
  assert.ok(Number.isFinite(profile.range) && profile.range >= 1, `스킬 '${name}'의 range가 유효하지 않다`);
  if (profile.shape) assert.ok(validShapes.has(profile.shape), `스킬 '${name}'의 shape가 유효하지 않다: ${profile.shape}`);
  if (profile.kind === 'summon') assert.strictEqual(profile.range, context.getSummonProfile(name).gridRange, `소환 젬 '${name}'의 표시 사거리는 실제 공격 사거리와 같아야 한다`);
});
assert.strictEqual(context.describeSkillGridProfile('서리 폭발', context.SKILL_DB['서리 폭발']), '공격 범위: 대상 지점 폭발 · 사거리 5칸 · 반경 2칸 · 사각형');
assert.strictEqual(context.describeSkillGridProfile('연쇄 폭풍', context.SKILL_DB['연쇄 폭풍']), '공격 범위: 연쇄 · 사거리 5칸 · 연쇄 3칸');
assert.strictEqual(context.describeSkillGridProfile('공허 베기', context.SKILL_DB['공허 베기']), '공격 범위: 자신 중심 광역 · 사거리 2칸 · 반경 2칸 · X자형');
assert.strictEqual(context.describeSkillGridProfile('심연 전염', context.SKILL_DB['심연 전염']), '공격 범위: 대상 지점 폭발 · 사거리 5칸 · 반경 2칸 · 마름모형');
assert.strictEqual(context.describeSkillGridProfile('칼날까마귀 소환', context.SKILL_DB['칼날까마귀 소환']), '공격 범위: 소환수 공격 · 사거리 2칸');
assert.strictEqual(context.describeSkillGridProfile('연발 사격', context.SKILL_DB['연발 사격']), '발사 방식: 부채꼴 연사 · 사거리 6칸 · 5방향 · 발사 방식 변경 가능');
const projectileGems = Object.entries(context.SKILL_DB).filter(([, skill]) => skill.isGem && skill.tags.includes('projectile'));
assert.ok(projectileGems.every(([, skill]) => skill.projectilePattern && skill.projectilePattern.mode), '모든 투사체 젬은 툴팁에 표시할 기본 발사 방식을 가져야 한다');
assert.ok(projectileGems.every(([name, skill]) => context.describeSkillGridProfile(name, skill).startsWith('발사 방식:')), '모든 투사체 젬 툴팁은 공격 범위 대신 발사 방식을 표시해야 한다');
assert.ok(Math.max(...Object.values(context.SKILL_GRID_DB).map(profile => profile.range)) <= 7, '스킬 최대 사거리는 8x8 전장의 끝을 넘지 않아야 한다');
const radiusOneCells = context.getGridAttackAreaCells({ kind: 'blast', range: 4, radius: 1 }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
const radiusTwoCells = context.getGridAttackAreaCells({ kind: 'blast', range: 4, radius: 2 }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
assert.strictEqual(radiusOneCells.length, 5, '반경 1은 중심과 상하좌우 4칸만 덮어야 한다');
assert.strictEqual(radiusTwoCells.length, 13, '반경 2는 맨해튼 거리 2의 다이아몬드 13칸이어야 한다');
assert.ok(!radiusOneCells.some(cell => cell.gx === 4 && cell.gy === 4), '반경 1은 대각선 칸을 포함하지 않아야 한다');
const squareCells = context.getGridAttackAreaCells({ kind: 'blast', range: 5, radius: 2, shape: 'square' }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
const crossCells = context.getGridAttackAreaCells({ kind: 'blast', range: 5, radius: 2, shape: 'cross' }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
const diagonalCells = context.getGridAttackAreaCells({ kind: 'blast', range: 5, radius: 2, shape: 'diagonal' }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
const ringCells = context.getGridAttackAreaCells({ kind: 'blast', range: 5, radius: 2, shape: 'ring' }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
const fanCells = context.getGridAttackAreaCells({ kind: 'fan', range: 3, rays: 5 }, { gx: 3, gy: 3 }, { gx: 4, gy: 3 });
assert.strictEqual(new Set(fanCells.map(cell => `${cell.gx},${cell.gy}`)).size, 15, '5방향 산탄은 서로 다른 직선 다섯 개를 지나야 한다');
assert.ok(fanCells.some(cell => cell.gx === 6 && cell.gy === 3), '산탄의 중앙 투사체는 조준 방향으로 날아가야 한다');
assert.ok(fanCells.some(cell => cell.gx === 3 && cell.gy === 0), '산탄의 바깥 투사체는 전방 측면 방향으로 퍼져야 한다');
assert.strictEqual(squareCells.length, 25, '사각형 반경 2는 5x5 전체 칸이어야 한다');
assert.strictEqual(crossCells.length, 9, '십자형 반경 2는 가로·세로 9칸이어야 한다');
assert.strictEqual(diagonalCells.length, 9, 'X자형 반경 2는 두 대각선 9칸이어야 한다');
assert.strictEqual(ringCells.length, 9, '고리형 반경 2는 중심과 바깥 고리 8칸이어야 한다');
assert.ok(!ringCells.some(cell => cell.gx === 4 && cell.gy === 3), '고리형은 중심과 외곽 사이의 안쪽 칸을 비워야 한다');

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
  const splash = makeEnemy(4, 6, 6);   // 대상 중심 5x5 사각형의 대각선 끝
  const outside = makeEnemy(5, 7, 0);  // 대상에서 멀리
  hits = context.selectGridSkillTargets('서리 폭발', { targets: 99, targetMode: 'all' }, attacker, [inBlast, splash, outside]);
  const hitIds = hits.map(h => h.enemy.id).sort().join(',');
  assert.strictEqual(hitIds, '3,4', '서리 폭발은 다이아몬드 밖 사각형 모서리까지 맞혀야 한다');
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

  const fanAttacker = { gx: 3, gy: 3 };
  const fanTargets = [makeEnemy(90, 4, 3), makeEnemy(91, 4, 2), makeEnemy(92, 4, 4), makeEnemy(93, 3, 2), makeEnemy(94, 3, 4), makeEnemy(95, 2, 3), makeEnemy(96, 5, 3)];
  hits = context.selectGridSkillTargets('연발 사격', { ...context.SKILL_DB['연발 사격'], targets: 6 }, fanAttacker, fanTargets);
  assert.deepStrictEqual(Array.from(hits, hit => hit.enemy.id), [90, 91, 92, 93, 94], '산탄은 조준 방향을 중심으로 서로 다른 다섯 방향의 적을 맞혀야 한다');
  assert.ok(!hits.some(hit => hit.enemy.id === 96), '비관통 산탄 한 줄은 가장 가까운 적 하나만 맞혀야 한다');
  assert.deepStrictEqual(Array.from(hits, hit => hit.mult), [1, 0.34, 0.34, 0.34, 0.34], '산탄의 보조 투사체 피해 배율을 적용해야 한다');
  assert.ok(Math.abs(context.getSkillHitSequenceDpsMultiplier('연발 사격', context.SKILL_DB['연발 사격']) - 2.36) < 1e-9, '산탄의 총 투사체 기대 배율을 계산해야 한다');

  // 대상 수 상한: targets=2면 범위 안에 3기가 있어도 2기만 맞는다
  const n1 = makeEnemy(12, 2, 6), n2 = makeEnemy(13, 2, 5), n3 = makeEnemy(14, 1, 5);
  hits = context.selectGridSkillTargets('회오리바람', { targets: 2, targetMode: 'whirl' }, attacker, [n1, n2, n3]);
  assert.strictEqual(hits.length, 2, 'targets 상한을 지켜야 한다');
  const adjacentEight = [
    makeEnemy(140, 0, 5), makeEnemy(141, 1, 5), makeEnemy(142, 2, 5), makeEnemy(143, 0, 6),
    makeEnemy(144, 2, 6), makeEnemy(145, 0, 7), makeEnemy(146, 1, 7), makeEnemy(147, 2, 7),
  ];
  hits = context.selectGridSkillTargets('회오리바람', { targets: 8, targetMode: 'whirl' }, attacker, adjacentEight);
  assert.strictEqual(hits.length, 8, '회오리바람의 사각형 범위는 플레이어 주변 8칸을 모두 덮어야 한다');

  // 전이 타격: 남는 타겟 수만큼 이미 맞은 적의 인접 1칸 적에게 번진다(근접 단일 + 타겟 수 옵션)
  const sp1 = makeEnemy(20, 2, 6);  // 공격자 인접
  const sp2 = makeEnemy(21, 3, 6);  // sp1 인접
  const sp3 = makeEnemy(22, 4, 6);  // sp2 인접
  const spFar = makeEnemy(23, 7, 0); // 고립
  hits = context.selectGridSkillTargets('기본 공격', { targets: 3, targetMode: 'single' }, attacker, [sp1, sp2, sp3, spFar]);
  assert.strictEqual(hits.map(h => h.enemy.id).join(','), '20,21,22', '남는 타겟 수는 인접 적으로 순차 전이되어야 한다');
  hits = context.selectGridSkillTargets('기본 공격', { targets: 1, targetMode: 'single' }, attacker, [sp1, sp2, sp3]);
  assert.strictEqual(hits.length, 1, '타겟 수 1이면 전이되지 않아야 한다');
  hits = context.selectGridSkillTargets('기본 공격', { targets: 4, targetMode: 'single' }, attacker, [sp1, spFar]);
  assert.strictEqual(hits.length, 1, '인접하지 않은 적으로는 전이되지 않아야 한다');
}

// ── 3-1. 전투 전술: 소급 해금 / 대상 우선순위 / 재배치 지연 ──
{
  resetGame();
  assert.strictEqual(context.game.combatTacticsUnlocked, false, '새 게임은 전투 전술이 잠겨 있어야 한다');
  context.game.journalUnlocked = ['act_3'];
  assert.strictEqual(context.ensureCombatTacticsUnlockState(context.game), true, '액트 3 기록이 있는 저장은 소급 해금돼야 한다');
  assert.strictEqual(context.ensureCombatTacticsUnlockState(context.game), false, '소급 해금은 한 번만 상태를 변경해야 한다');

  const attacker = { gx: 1, gy: 6 };
  const near = makeEnemy(201, 2, 6, { hp: 90, maxHp: 100 });
  const weak = makeEnemy(202, 4, 6, { hp: 10, maxHp: 100 });
  const boss = makeEnemy(203, 5, 5, { isBoss: true, attackKind: 'ranged' });
  let hits = context.selectGridSkillTargets('서리 폭발', { targets: 1, targetMode: 'single' }, attacker, [near, weak, boss], { targetPriority: 'weakest' });
  assert.strictEqual(hits[0].enemy.id, 202, '약한 적 전술은 사거리 안에서 남은 생명력 비율이 가장 낮은 적을 골라야 한다');
  hits = context.selectGridSkillTargets('서리 폭발', { targets: 1, targetMode: 'single' }, attacker, [near, weak, boss], { targetPriority: 'dangerous' });
  assert.strictEqual(hits[0].enemy.id, 203, '위험한 적 전술은 보스를 일반 적보다 우선해야 한다');
  hits = context.selectGridSkillTargets('서리 폭발', { targets: 1, targetMode: 'single' }, attacker, [near, weak, boss], { targetPriority: 'dangerous', preferredEnemyId: 202 });
  assert.strictEqual(hits[0].enemy.id, 202, '잠긴 대상이 살아 있고 사거리 안이면 짧은 대상 고정을 지켜야 한다');

  const clusterA = makeEnemy(211, 3, 4);
  const clusterB = makeEnemy(212, 4, 4);
  const clusterC = makeEnemy(213, 4, 5);
  const isolated = makeEnemy(214, 6, 1);
  hits = context.selectGridSkillTargets('서리 폭발', { targets: 3, targetMode: 'all' }, attacker, [isolated, clusterA, clusterB, clusterC], { targetPriority: 'dense' });
  assert.ok([211, 212, 213].includes(hits[0].enemy.id), '밀집 전술은 더 많은 적을 덮는 폭발 중심을 골라야 한다');

  assert.strictEqual(context.getTacticalMoveAttackDelayMs(100), 500, '이동 속도 100의 전술 이동은 다음 공격을 0.5초 미뤄야 한다');
  assert.strictEqual(context.getTacticalMoveAttackDelayMs(10000), 300, '매우 빠른 이동도 공격 지연 하한 0.3초를 무시할 수 없어야 한다');
  assert.strictEqual(context.getTacticalMoveAttackDelayMs(1), 650, '매우 느린 이동은 공격 지연 상한 0.65초를 넘지 않아야 한다');

  context.game.gridPlayer = { gx: 3, gy: 3, gridMoveTimer: 0 };
  context.game.enemies = [makeEnemy(220, 4, 3)];
  const moved = context.advanceGridTacticalMovement(context.game.gridPlayer, context.game.enemies[0], {
    direction: 'away', maxRange: 5, dtSec: 0.6, intervalSec: 0.6,
  });
  assert.strictEqual(moved.moved, true, '거리 유지 전술은 이동 주기가 찼을 때 한 칸만 후퇴해야 한다');
  assert.strictEqual(context.gridChebyshevDist(context.game.gridPlayer.gx, context.game.gridPlayer.gy, 4, 3), 2, '후퇴 한 번에 두 칸 이상 순간이동하면 안 된다');

  context.game.combatTacticsUnlocked = true;
  context.game.settings.combatPositionMode = 'auto';
  context.game.settings.combatTargetPriority = 'nearest';
  context.game.activeSkill = '얼음 창';
  context.game.gridPlayer = { gx: 3, gy: 3, gridMoveTimer: 0.6 };
  context.game.enemies = [makeEnemy(221, 4, 3)];
  context.resetCombatTacticsRuntime();
  const before = { gx: context.game.gridPlayer.gx, gy: context.game.gridPlayer.gy };
  assert.strictEqual(context.updatePlayerGridEngagement({ sSkill: context.SKILL_DB['얼음 창'], moveSpeed: 100 }), true, '자동 위치 운용은 기존처럼 사거리 안에서 즉시 공격 가능해야 한다');
  assert.deepStrictEqual({ gx: context.game.gridPlayer.gx, gy: context.game.gridPlayer.gy }, before, '자동 위치 운용은 기존 위치를 바꾸면 안 된다');

  const NativeDate = context.Date;
  let tacticNow = 1000;
  context.Date = class extends NativeDate { static now() { return tacticNow; } };
  context.game.settings.combatPositionMode = 'keepRange';
  context.game.gridPlayer = { gx: 3, gy: 3, gridMoveTimer: 0.6 };
  context.game.enemies = [makeEnemy(222, 4, 3)];
  context.resetCombatTacticsRuntime();
  assert.strictEqual(context.updatePlayerGridEngagement({ sSkill: context.SKILL_DB['얼음 창'], moveSpeed: 100 }), false, '첫 후퇴가 발생한 틱에는 공격을 미뤄야 한다');
  tacticNow += 500;
  context.game.gridPlayer.gridMoveTimer = 0.6;
  assert.strictEqual(context.updatePlayerGridEngagement({ sSkill: context.SKILL_DB['얼음 창'], moveSpeed: 100 }), false, '두 번째 후퇴도 공격보다 먼저 처리해야 한다');
  tacticNow += 500;
  context.game.gridPlayer.gridMoveTimer = 0.6;
  const heldCell = { gx: context.game.gridPlayer.gx, gy: context.game.gridPlayer.gy };
  assert.strictEqual(context.updatePlayerGridEngagement({ sSkill: context.SKILL_DB['얼음 창'], moveSpeed: 100 }), true, '연속 두 번 후퇴한 뒤에는 이동을 멈추고 공격 기회를 내줘야 한다');
  assert.deepStrictEqual({ gx: context.game.gridPlayer.gx, gy: context.game.gridPlayer.gy }, heldCell, '후퇴 상한 뒤에는 같은 틱에 추가 이동하면 안 된다');
  context.Date = NativeDate;
}

// ── 3-2. 스킬 공격 단계: 회전 순차 타격 / 최초·연쇄 분리 / 강타 여진 ──
{
  const split = context.applyProjectilePatternMode({ ...context.SKILL_DB['얼음 창'], dmg: 100 }, 'split', '테스트 각인');
  assert.strictEqual(context.getSkillGridProfile('얼음 창', split).kind, 'fan', '분산 방식은 기존 직선 젬을 실제 부채꼴 판정으로 바꿔야 한다');
  assert.strictEqual(split.targets, 3, '분산 방식은 최소 세 방향의 대상을 확보해야 한다');
  assert.strictEqual(split.dmg, 72, '분산 방식의 피해 감폭은 실제 스킬 피해에 적용돼야 한다');
  assert.strictEqual(context.applyProjectilePatternMode({ ...context.SKILL_DB['얼음 창'], dmg: 100 }, 'split', '재능', null).dmg, 72, '전용 배율이 없는 효과는 null이어도 각인 기본 배율을 유지해야 한다');
  assert.ok(context.describeSkillGridProfile('얼음 창', split).includes('적용: 테스트 각인'), '변경된 발사 방식과 출처를 툴팁에 표시해야 한다');
  const focused = context.applyProjectilePatternMode({ ...context.SKILL_DB['독니 사출'], dmg: 100 }, 'focus', '테스트 각인');
  assert.strictEqual(focused.targets, 1, '집속 방식은 대상 하나에만 투사체를 집중해야 한다');
  assert.strictEqual(focused.combatPattern, undefined, '집속 방식은 젬의 기존 귀환 궤도를 대체해야 한다');
  assert.strictEqual(focused.dmg, 155, '집속 방식의 단일 대상 피해 증폭을 적용해야 한다');
  const returning = context.applyProjectilePatternMode({ ...context.SKILL_DB['연발 사격'], dmg: 100 }, 'return', '테스트 각인');
  assert.strictEqual(returning.combatPattern.kind, 'boomerang', '귀환 방식은 왕복 투사체 판정을 부여해야 한다');
  assert.strictEqual(returning.dmg, 90, '귀환 방식은 추가 적중 대가로 타격 피해를 감폭해야 한다');
  assert.deepStrictEqual(Array.from(context.normalizeSkyGemEnhancementSlots(['sky_projectile_split', 'sky_projectile_focus', 'sky_fury'])), ['sky_projectile_split', null, 'sky_fury', null, null], '손상되거나 이전 저장에 발사 방식이 여러 개면 첫 방식 하나만 유지해야 한다');

  resetGame();
  context.game.activeSkill = '얼음 창';
  context.game.skills = ['얼음 창'];
  context.game.gemData['얼음 창'] = { level: 1, exp: 0, quality: 0 };
  context.game.skyGemEnhancements = { '얼음 창': ['sky_projectile_split'] };
  const engravedSkill = context.getActiveSkillStats(0);
  assert.strictEqual(engravedSkill.projectilePattern.mode, 'split', '장착한 발사 방식 각인이 실제 활성 젬에 적용돼야 한다');
  assert.strictEqual(engravedSkill.projectilePatternSource, '창공 각인', '젬별 각인의 출처를 보존해야 한다');
  context.game.season = 4;
  context.game.currencies.skyEssence = 2;
  context.game.gemData['얼음 창'].skyEnhanceCap = 1;
  context.getExpertLevel = () => 15;
  assert.strictEqual(context.applySkyGemEnhancementToActive('sky_projectile_focus'), true, '가득 찬 슬롯에서도 기존 발사 방식은 새 방식으로 바로 교체돼야 한다');
  assert.deepStrictEqual(Array.from(context.game.skyGemEnhancements['얼음 창']), ['sky_projectile_focus', null, null, null, null], '한 젬에는 주 발사 방식 하나만 남아야 한다');
  assert.strictEqual(context.game.currencies.skyEssence, 1, '발사 방식 교체는 각인 비용을 한 번만 소모해야 한다');

  const makeUniqueItem = (name, withEffect = true) => {
    const def = context.UNIQUE_DB.find(row => row.name === name);
    assert.ok(def, `${name} 고유 장비 정의가 있어야 한다`);
    return {
      name: def.name, slot: def.slots[0], rarity: 'unique', baseStats: [],
      stats: def.stats.map(stat => ({ id: stat.id, val: stat.min })),
      uniqueEffectKey: withEffect ? def.uniqueEffectKey : '',
      uniqueEffectParams: withEffect ? def.uniqueEffectParams : null,
    };
  };
  const patternWeapons = [
    ['파편비 시위', 'split', 0.9],
    ['일점 관통기', 'focus', 1.75],
    ['귀로를 새긴 활', 'return', 1],
  ];
  patternWeapons.forEach(([name, mode, damageMultiplier]) => {
    resetGame();
    context.game.activeSkill = '얼음 창';
    context.game.skills = ['얼음 창'];
    context.game.gemData['얼음 창'] = { level: 1, exp: 0, quality: 0 };
    const baseSkillDamage = context.getActiveSkillStats(0).dmg;
    context.game.equipment['무기'] = makeUniqueItem(name);
    const weaponStats = context.getPlayerStats();
    assert.strictEqual(weaponStats.sSkill.projectilePattern.mode, mode, `${name}은 실제 발사 방식을 ${mode}로 변경해야 한다`);
    assert.strictEqual(weaponStats.sSkill.projectilePatternSource, `고유 장비 · ${name}`, `${name}의 발사 방식 출처를 표시해야 한다`);
    assert.strictEqual(weaponStats.sSkill.dmg, baseSkillDamage * damageMultiplier, `${name}은 각인보다 완화된 전용 피해 배율을 사용해야 한다`);
    assert.strictEqual(context.getGemPresentation('얼음 창').skill.dmg, weaponStats.sSkill.dmg, `${name}의 완화된 배율을 젬 상세 화면에도 보존해야 한다`);
  });
  context.game.skyGemEnhancements = { '얼음 창': ['sky_projectile_focus'] };
  const engravedWeaponStats = context.getPlayerStats();
  assert.strictEqual(engravedWeaponStats.sSkill.projectilePattern.mode, 'focus', '젬에 새긴 발사 방식은 고유 무기보다 우선해야 한다');
  assert.strictEqual(engravedWeaponStats.sSkill.projectilePatternSource, '창공 각인', '우선 적용된 창공 각인의 출처를 보존해야 한다');

  resetGame();
  context.game.enemies = Array.from({ length: 6 }, (_, idx) => makeEnemy(800 + idx, 1 + idx, 2));
  context.game.equipment['투구'] = makeUniqueItem('군무의 베일', false);
  const crowdBaseStats = context.getPlayerStats();
  context.game.equipment['투구'] = makeUniqueItem('군무의 베일');
  const crowdBoostedStats = context.getPlayerStats();
  assert.strictEqual(crowdBoostedStats.evasion, Math.floor(crowdBaseStats.evasion * 1.6), '군무의 베일은 적 6명 이상에서 회피를 60% 증폭해야 한다');
  assert.ok(crowdBoostedStats.evadeChance > crowdBaseStats.evadeChance, '회피 증폭은 실제 회피 확률에도 반영돼야 한다');
  context.game.enemies = context.game.enemies.slice(0, 2);
  assert.strictEqual(context.getPlayerStats().evasion, crowdBaseStats.evasion, '군무의 베일은 적이 6명 미만이면 발동하지 않아야 한다');

  resetGame();
  context.game.enemies = [makeEnemy(820, 2, 2)];
  context.game.equipment['갑옷'] = makeUniqueItem('고독한 잔상', false);
  const loneBaseStats = context.getPlayerStats();
  context.game.equipment['갑옷'] = makeUniqueItem('고독한 잔상');
  assert.strictEqual(context.getPlayerStats().evasion, Math.floor(loneBaseStats.evasion * 1.45), '고독한 잔상은 적 1~2명에서 회피를 45% 증폭해야 한다');
  context.game.enemies = [makeEnemy(821, 2, 2), makeEnemy(822, 3, 2), makeEnemy(823, 4, 2)];
  assert.strictEqual(context.getPlayerStats().evasion, loneBaseStats.evasion, '고독한 잔상은 적이 3명 이상이면 발동하지 않아야 한다');

  resetGame();
  context.game.equipment['장갑1'] = makeUniqueItem('영점 장갑', false);
  const zeroPointBaseStats = context.getPlayerStats();
  context.game.equipment['장갑1'] = makeUniqueItem('영점 장갑');
  const zeroPointStats = context.getPlayerStats();
  assert.strictEqual(zeroPointStats.energyShield, Math.floor(zeroPointBaseStats.energyShield * 1.2), '영점 장갑은 에너지 보호막을 20% 증폭해야 한다');
  assert.strictEqual(zeroPointStats.uniqueEsRecoverOnCritPct, 3, '영점 장갑은 치명타 시 최대 에너지 보호막 3% 회복을 부여해야 한다');

  resetGame();
  context.game.equipment['갑옷'] = makeUniqueItem('별을 품은 살갗', false);
  const starSkinBaseStats = context.getPlayerStats();
  context.game.equipment['갑옷'] = makeUniqueItem('별을 품은 살갗');
  assert.ok(context.getPlayerStats().energyShield > starSkinBaseStats.energyShield, '별을 품은 살갗은 최대 생명력 기반 에너지 보호막을 실제로 추가해야 한다');

  resetGame();
  context.game.activeSkill = '연발 사격';
  context.game.gridPlayer = { gx: 3, gy: 3, gridMoveTimer: 0 };
  context.game.enemies = [makeEnemy(301, 4, 3), makeEnemy(302, 4, 2), makeEnemy(303, 4, 4), makeEnemy(304, 3, 2),
    makeEnemy(305, 3, 4), makeEnemy(306, 2, 2), makeEnemy(307, 2, 4), makeEnemy(308, 2, 3)];
  const expandedFan = context.getSkillTargets({ sSkill: context.SKILL_DB['연발 사격'], projectileExtraShots: 2 });
  assert.strictEqual(expandedFan.length, 7, '투사체 추가 발사는 산탄의 실제 발사 방향과 대상 수를 늘려야 한다');
  assert.ok(!expandedFan.some(hit => hit.enemy.id === 308), '7방향 산탄은 발사하지 않은 후방 중앙의 적을 맞히면 안 된다');

  resetGame();
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const targets = [makeEnemy(31, 2, 6), makeEnemy(32, 2, 5), makeEnemy(33, 1, 5)]
    .map((enemy, idx) => ({ enemy, mult: idx === 0 ? 1 : 0.8 }));
  const whirl = context.buildSkillHitSequence('회오리바람', context.SKILL_DB['회오리바람'], targets);
  assert.strictEqual(whirl.length, 3, '회오리바람은 대상마다 독립 타격 단계가 있어야 한다');
  assert.strictEqual(whirl.map(stage => stage.delayMs).join(','), '0,80,160', '회오리바람은 0.08초 간격으로 순차 타격해야 한다');
  assert.ok(whirl.every(stage => stage.targets.length === 1), '회오리바람 단계 하나가 모든 대상에게 동시에 피해를 주면 안 된다');

  const chain = context.buildSkillHitSequence('연쇄 폭풍', context.SKILL_DB['연쇄 폭풍'], targets);
  assert.strictEqual(chain.map(stage => stage.kind).join(','), 'chainPrimary,chainJump,chainJump', '연쇄는 최초 공격과 후속 점프로 구분돼야 한다');
  assert.strictEqual(chain.map(stage => stage.delayMs).join(','), '0,110,220', '연쇄 피해는 각 점프 시점에 따로 발생해야 한다');
  assert.strictEqual(chain[1].chainFromEnemyId, 31, '두 번째 연쇄는 최초 대상에서 출발해야 한다');
  assert.strictEqual(chain[2].chainFromEnemyId, 32, '세 번째 연쇄는 직전 연쇄 대상에서 출발해야 한다');
  assert.deepStrictEqual(Array.from(chain, stage => stage.damageMultiplier), [1, 1.12, 1.24], '연쇄 폭풍은 점프마다 12%씩 강해져야 한다');
  const fallingChain = context.buildSkillHitSequence('번개 타격', context.SKILL_DB['번개 타격'], targets);
  assert.deepStrictEqual(Array.from(fallingChain, stage => stage.damageMultiplier), [1, 0.88, 0.76], '번개 타격은 점프마다 12%씩 약해져야 한다');

  const pierce = context.buildSkillHitSequence('관통 사격', context.SKILL_DB['관통 사격'], targets);
  assert.strictEqual(pierce.map(stage => stage.kind).join(','), 'piercePrimary,pierceThrough,pierceThrough', '관통은 한 발의 최초 직격과 후속 관통으로 구분돼야 한다');
  assert.strictEqual(pierce.map(stage => stage.delayMs).join(','), '0,30,60', '관통 피해는 투사체가 직선을 통과하는 순서대로 발생해야 한다');
  assert.ok(pierce.every(stage => stage.targets.length === 1), '관통 단계마다 지나친 적 하나만 피해를 받아야 한다');

  const slam = context.buildSkillHitSequence('묵직한 강타', context.SKILL_DB['묵직한 강타'], targets.slice(0, 1));
  assert.strictEqual(slam.length, 2, '강타는 본 타격과 여진으로 분리돼야 한다');
  assert.strictEqual(slam[1].kind, 'slamAftershock');
  assert.strictEqual(slam[1].delayMs, 420, '묵직한 강타의 개별 여진 지연시간을 사용해야 한다');
  assert.strictEqual(slam[0].damageMultiplier, 0.62, '강타 본 타격과 여진의 합이 기존 총 피해를 유지해야 한다');
  assert.strictEqual(slam[1].damageMultiplier, 0.38, '묵직한 강타의 여진 피해 배율을 사용해야 한다');
  assert.strictEqual(context.getSkillHitSequenceDpsMultiplier('묵직한 강타', context.SKILL_DB['묵직한 강타']), 1, '판정 세분화만으로 표시 DPS가 증가하면 안 된다');

  const meteor = context.buildSkillHitSequence('유성 낙화', context.SKILL_DB['유성 낙화'], targets);
  assert.strictEqual(meteor.length, 1, '유성 낙화는 유성과 여진을 중복 생성하지 않고 한 번만 충돌해야 한다');
  assert.strictEqual(meteor[0].kind, 'meteorImpact', '유성 낙화는 전용 단일 충돌 단계로 판정해야 한다');
  assert.strictEqual(meteor[0].damageMultiplier, 1, '단일 유성 충돌이 기존 총 피해를 모두 보존해야 한다');
  assert.ok(meteor[0].impactCells.length > targets.length, '유성 하나가 충돌 지점의 전체 범위를 판정해야 한다');

  const field = context.buildSkillHitSequence('난타 눈보라', context.SKILL_DB['난타 눈보라'], targets);
  assert.strictEqual(field.length, 4, '지속 장판은 설정한 횟수만큼 실제 타격 단계를 가져야 한다');
  assert.strictEqual(field.map(stage => stage.delayMs).join(','), '0,300,600,900', '장판 타격 간격을 지켜야 한다');
  assert.ok(field.every(stage => stage.singleRepeat), '장판 단계가 기존 multiHit를 다시 반복해 16회가 되면 안 된다');
  assert.ok(field[0].impactCells.length > targets.length, '장판은 시전 당시 적 위치만이 아니라 고정된 전체 범위 칸을 유지해야 한다');

  const fireField = context.buildSkillHitSequence('화염 폭풍핵', context.SKILL_DB['화염 폭풍핵'], targets);
  assert.strictEqual(fireField.length, 3, '화염 폭풍핵은 3회 유지 타격해야 한다');
  assert.strictEqual(fireField.map(stage => stage.delayMs).join(','), '0,260,520', '화염 폭풍핵의 타격 간격을 지켜야 한다');
  assert.ok(fireField.every(stage => stage.damageMultiplier === 0.34), '화염 폭풍핵 각 타격은 기본 피해의 34%여야 한다');

  const moving = context.buildSkillHitSequence('서리 파동', context.SKILL_DB['서리 파동'], targets);
  assert.strictEqual(moving.map(stage => stage.delayMs).join(','), '0,160,320', '이동 파동은 칸을 순서대로 통과해야 한다');
  assert.ok(moving.every(stage => stage.targets.length === 1), '이동 파동의 각 단계는 도착한 칸만 판정해야 한다');
  assert.strictEqual(moving[1].chainFromEnemyId, moving[0].targets[0].enemy.id, '다음 파동은 직전 칸에서 이어져야 한다');

  const boomerang = context.buildSkillHitSequence('독니 사출', context.SKILL_DB['독니 사출'], targets);
  assert.strictEqual(boomerang.length, 6, '부메랑은 전진 3회와 귀환 3회 판정을 가져야 한다');
  assert.strictEqual(boomerang.slice(3).map(stage => stage.kind).join(','), 'boomerangReturn,boomerangReturn,boomerangReturn');
  assert.ok(boomerang.every(stage => stage.damageMultiplier === 0.5), '왕복 총 피해가 기존 피해를 초과하면 안 된다');

  assert.strictEqual(context.getSkillHitSequenceDpsMultiplier('연속 베기', context.SKILL_DB['연속 베기']), 1.45, '연속 베기의 표시 DPS는 감쇠된 후속타를 반영해야 한다');
  assert.ok(Math.abs(context.getSkillHitSequenceDpsMultiplier('연발 사격', context.SKILL_DB['연발 사격']) - 2.36) < 1e-9, '연발 사격의 표시 DPS는 감쇠된 보조 방향 4발을 반영해야 한다');
  assert.ok(Math.abs(context.getSkillHitSequenceDpsMultiplier('화염 폭풍핵', context.SKILL_DB['화염 폭풍핵']) - 1.02) < 1e-9, '화염 폭풍핵의 표시 DPS는 장판 3회를 합산해야 한다');
  assert.strictEqual(context.getSkillHitSequenceDpsMultiplier('난타 눈보라', context.SKILL_DB['난타 눈보라']), 4, '난타 눈보라는 기존 4회 총 피해를 유지해야 한다');
}

// ── 3-1a. 스킬별 후속타·상태이상·조건부 피해·위치 제어 규칙 ──
{
  assert.strictEqual(context.getSkillRepeatDamageMultiplier(context.SKILL_DB['연속 베기'], 0, 2), 1, '첫 타격은 감쇠하지 않아야 한다');
  assert.strictEqual(context.getSkillRepeatDamageMultiplier(context.SKILL_DB['연속 베기'], 1, 2), 0.45, '연속 베기의 두 번째 타격은 45%여야 한다');
  assert.strictEqual(context.getSkillRepeatDamageMultiplier(context.SKILL_DB['연발 사격'], 1, 1), 0.34, '연발 사격의 추가 반복 투사체도 보조 탄 배율을 사용해야 한다');

  const coldStats = context.getSkillAilmentStats({ sSkill: context.SKILL_DB['서리 폭발'] }, 'cold', null);
  assert.strictEqual(coldStats.chillChance, 100, '서리 폭발의 냉각 보너스가 실제 상태이상 계산에 들어가야 한다');
  assert.strictEqual(coldStats.freezeChance, 25, '서리 폭발의 동결 보너스가 실제 상태이상 계산에 들어가야 한다');
  const lightningStats = context.getSkillAilmentStats({ sSkill: context.SKILL_DB['번개 창'] }, 'light', null);
  assert.strictEqual(lightningStats.shockChance, 20, '번개 창의 감전 보너스가 실제 상태이상 계산에 들어가야 한다');

  resetGame();
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const target = makeEnemy(34, 5, 6);
  context.game.enemies = [target];
  assert.strictEqual(context.getSkillConditionalDamageMultiplier(context.SKILL_DB['암살자의 일격'], target), 1.35, '암살자의 일격은 생명력이 가득 찬 적에게 증폭돼야 한다');
  assert.strictEqual(context.getSkillConditionalDamageMultiplier(context.SKILL_DB['번개 창'], target), 1.18, '번개 창은 첫 칸 이후 거리만큼 증폭돼야 한다');
  context.game.enemies = Array.from({ length: 8 }, (_, idx) => makeEnemy(100 + idx, 2 + (idx % 4), 2 + Math.floor(idx / 4)));
  assert.strictEqual(context.getSkillConditionalDamageMultiplier(context.SKILL_DB['회오리바람'], context.game.enemies[0]), 1.28, '회오리바람의 밀집 보너스는 28% 상한을 지켜야 한다');

  context.game.enemies = [target];
  assert.strictEqual(context.applySkillGridControlOnHit(target, context.SKILL_DB['중력 붕괴']), true, '중력 붕괴는 생존한 적을 끌어당겨야 한다');
  assert.deepStrictEqual({ gx: target.gx, gy: target.gy }, { gx: 4, gy: 6 }, '중력 붕괴는 플레이어 방향으로 정확히 1칸 이동시켜야 한다');
}

// ── 3-2. 실제 피해도 첫 단계와 후속 단계의 시점에 나뉘어 적용돼야 한다 ──
{
  resetGame();
  context.game.activeSkill = '회오리바람';
  context.game.skills = Array.from(new Set([...(context.game.skills || []), '회오리바람']));
  context.game.gemData['회오리바람'] = { level: 1, exp: 0, quality: 0 };
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const enemies = [makeEnemy(41, 2, 6), makeEnemy(42, 1, 7), makeEnemy(43, 1, 5)];
  enemies.forEach(enemy => { enemy.hp = 1000000; enemy.maxHp = 1000000; });
  context.game.enemies = enemies;
  const stats = context.getPlayerStats();
  stats.baseDmg = 1000;
  stats.minDmgRoll = 100;
  stats.maxDmgRoll = 100;
  stats.accuracy = 1000000;
  context.performPlayerAttack(stats);
  assert.ok(enemies.every(enemy => enemy.hp === enemy.maxHp), '공격 모션이 끝나기 전에 회오리바람 피해가 적용되면 안 된다');
  vm.runInContext('pendingSkillStageHits.sort((a, b) => a.at - b.at); pendingSkillStageHits[0].at = 0; processPendingSkillStageHits();', context);
  assert.ok(enemies[0].hp < enemies[0].maxHp, '회오리바람 첫 대상은 첫 단계에서 피해를 받아야 한다');
  assert.strictEqual(enemies[1].hp, enemies[1].maxHp, '회오리바람 두 번째 대상 피해가 첫 단계와 동시에 들어가면 안 된다');
  vm.runInContext('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();', context);
  assert.ok(enemies[1].hp < enemies[1].maxHp && enemies[2].hp < enemies[2].maxHp, `회오리바람 후속 대상은 예약된 순차 단계에서 피해를 받아야 한다 (${enemies.map(enemy => enemy.hp).join(',')})`);

  resetGame();
  context.game.activeSkill = '묵직한 강타';
  context.game.skills = Array.from(new Set([...(context.game.skills || []), '묵직한 강타']));
  context.game.gemData['묵직한 강타'] = { level: 1, exp: 0, quality: 0 };
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const slamTarget = makeEnemy(51, 2, 6);
  slamTarget.hp = 1000000; slamTarget.maxHp = 1000000;
  context.game.enemies = [slamTarget];
  const slamStats = context.getPlayerStats();
  slamStats.baseDmg = 1000;
  slamStats.minDmgRoll = 100;
  slamStats.maxDmgRoll = 100;
  slamStats.accuracy = 1000000;
  context.performPlayerAttack(slamStats);
  assert.strictEqual(slamTarget.hp, slamTarget.maxHp, '강타 피해는 공격 모션이 끝난 뒤 적용돼야 한다');
  vm.runInContext('pendingSkillStageHits.sort((a, b) => a.at - b.at); pendingSkillStageHits[0].at = 0; processPendingSkillStageHits();', context);
  const hpAfterPrimary = slamTarget.hp;
  vm.runInContext('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();', context);
  assert.ok(slamTarget.hp < hpAfterPrimary, '강타 여진은 본 타격 이후 별도의 실제 피해를 적용해야 한다');
}

// ── 3-3. 비행/마법 판정: 칸 충돌, 유도, 적 원거리 회피 ──
{
  assert.strictEqual(context.getSkillCombatDelivery(context.SKILL_DB['관통 사격']), 'projectileCell');
  assert.strictEqual(context.getSkillCombatDelivery(context.SKILL_DB['연발 사격']), 'projectileTarget');
  assert.strictEqual(context.getSkillCombatDelivery(context.SKILL_DB['서리 폭발']), 'magicCell');
  assert.strictEqual(context.getSkillCombatDelivery(context.SKILL_DB['기본 공격']), 'instantTarget');
  const normalTravelMs = context.getCombatTravelMs({ gx: 0, gy: 0 }, { gx: 7, gy: 7 });
  const iceSpearTravelMs = context.getCombatTravelMs({ gx: 0, gy: 0 }, { gx: 7, gy: 7 }, context.SKILL_DB['얼음 창']);
  assert.ok(iceSpearTravelMs <= 150, '얼음 창은 전장 끝까지도 매우 빠르게 도착해야 한다');
  assert.ok(iceSpearTravelMs < normalTravelMs / 3, '얼음 창의 실제 피해 판정도 일반 투사체보다 세 배 넘게 빨라야 한다');

  resetGame();
  context.game.enemies = [makeEnemy(550, 2, 2), makeEnemy(551, 3, 2), makeEnemy(552, 4, 2), makeEnemy(553, 5, 2)];
  const cappedAreaTargets = context.getPendingSkillImpactTargets({
    delivery: 'magicCell', sourceCell: { gx: 1, gy: 2 },
    targetEntries: [{ enemyId: 550 }, { enemyId: 551 }, { enemyId: 552 }],
    targetCells: context.game.enemies.map(enemy => ({ gx: enemy.gx, gy: enemy.gy, mult: 1 })),
  });
  assert.strictEqual(cappedAreaTargets.length, 3, '넓어진 모양이 스킬의 최대 타겟 수까지 함께 늘리면 안 된다');

  resetGame();
  context.game.activeSkill = '난타 눈보라';
  context.game.skills = Array.from(new Set([...(context.game.skills || []), '난타 눈보라']));
  context.game.gemData['난타 눈보라'] = { level: 1, exp: 0, quality: 0 };
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const fieldTarget = makeEnemy(59, 3, 6), fieldEntrant = makeEnemy(60, 7, 0);
  fieldTarget.hp = fieldTarget.maxHp = fieldEntrant.hp = fieldEntrant.maxHp = 1000000;
  context.game.enemies = [fieldTarget, fieldEntrant];
  const fieldStats = context.getPlayerStats();
  fieldStats.baseDmg = 1000;
  fieldStats.minDmgRoll = fieldStats.maxDmgRoll = 100;
  fieldStats.accuracy = 1000000;
  context.performPlayerAttack(fieldStats);
  const fieldTravelFx = vm.runInContext("battleFx.filter(fx => fx.type === 'combatTravel' && fx.patternKind === 'field')", context);
  assert.strictEqual(fieldTravelFx.length, 1, '장판 이미지는 타격 횟수만큼 중복 생성되면 안 된다');
  assert.ok(fieldTravelFx[0].duration >= 1200, '장판 이미지는 마지막 타격까지 유지되어야 한다');
  fieldTarget.gx = 7; fieldTarget.gy = 1;
  fieldEntrant.gx = 3; fieldEntrant.gy = 5;
  vm.runInContext('pendingSkillStageHits.sort((a, b) => a.at - b.at); pendingSkillStageHits[0].at = 0; processPendingSkillStageHits();', context);
  assert.strictEqual(fieldTarget.hp, fieldTarget.maxHp, '장판 밖으로 이동한 적은 다음 틱을 맞으면 안 된다');
  assert.ok(fieldEntrant.hp < fieldEntrant.maxHp, '유지 중인 장판 칸에 새로 들어온 적이 다음 틱을 맞아야 한다');
  vm.runInContext('pendingSkillStageHits = [];', context);

  resetGame();
  context.game.activeSkill = '유성 낙화';
  context.game.skills = Array.from(new Set([...(context.game.skills || []), '유성 낙화']));
  context.game.gemData['유성 낙화'] = { level: 1, exp: 0, quality: 0 };
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const meteorTargets = [makeEnemy(600, 3, 6), makeEnemy(601, 3, 5)];
  meteorTargets.forEach(enemy => { enemy.hp = enemy.maxHp = 1000000; });
  context.game.enemies = meteorTargets;
  const meteorStats = context.getPlayerStats();
  meteorStats.baseDmg = 1000;
  meteorStats.minDmgRoll = meteorStats.maxDmgRoll = 100;
  meteorStats.accuracy = 1000000;
  context.performPlayerAttack(meteorStats);
  const meteorRows = vm.runInContext("pendingSkillStageHits.filter(row => row.patternKind === 'meteor')", context);
  const meteorTravelFx = vm.runInContext("battleFx.filter(fx => fx.type === 'combatTravel' && fx.patternKind === 'meteor')", context);
  assert.strictEqual(meteorRows.length, 1, '실제 유성 공격도 대기 중인 피해 단계를 하나만 만들어야 한다');
  assert.strictEqual(meteorTravelFx.length, 1, '실제 유성 공격도 낙하 이펙트를 하나만 만들어야 한다');
  vm.runInContext('pendingSkillStageHits[0].at = 0; processPendingSkillStageHits();', context);
  assert.ok(meteorTargets.every(enemy => enemy.hp < enemy.maxHp), '단일 유성이 충돌 범위의 모든 선택 대상에게 피해를 줘야 한다');

  resetGame();
  context.game.activeSkill = '관통 사격';
  context.game.skills = Array.from(new Set([...(context.game.skills || []), '관통 사격']));
  context.game.gemData['관통 사격'] = { level: 1, exp: 0, quality: 0 };
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const original = makeEnemy(61, 3, 6), interceptor = makeEnemy(62, 4, 5);
  original.hp = original.maxHp = interceptor.hp = interceptor.maxHp = 1000000;
  context.game.enemies = [original, interceptor];
  const projectileStats = context.getPlayerStats();
  projectileStats.baseDmg = 1000;
  projectileStats.minDmgRoll = projectileStats.maxDmgRoll = 100;
  projectileStats.accuracy = 1000000;
  context.performPlayerAttack(projectileStats);
  original.gx = 3; original.gy = 5;
  interceptor.gx = 2; interceptor.gy = 6;
  vm.runInContext('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();', context);
  assert.strictEqual(original.hp, original.maxHp, '직선 투사체는 떠난 원래 대상을 추적하면 안 된다');
  assert.ok(interceptor.hp < interceptor.maxHp, '직선 투사체는 목표까지의 중간 경로에 들어온 다른 적과 충돌해야 한다');

  resetGame();
  context.game.activeSkill = '연발 사격';
  context.game.skills = Array.from(new Set([...(context.game.skills || []), '연발 사격']));
  context.game.gemData['연발 사격'] = { level: 1, exp: 0, quality: 0 };
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const homingTarget = makeEnemy(63, 3, 6);
  homingTarget.hp = homingTarget.maxHp = 1000000;
  context.game.enemies = [homingTarget];
  const homingStats = context.getPlayerStats();
  homingStats.baseDmg = 1000;
  homingStats.minDmgRoll = homingStats.maxDmgRoll = 100;
  homingStats.accuracy = 1000000;
  context.performPlayerAttack(homingStats);
  homingTarget.gx = 3; homingTarget.gy = 5;
  vm.runInContext('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();', context);
  assert.ok(homingTarget.hp < homingTarget.maxHp, '단일 유도 투사체는 이동한 생존 대상을 따라가야 한다');

  resetGame();
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const ranged = makeEnemy(64, 4, 6, { attackKind: 'ranged', attackRange: 5, attackTimer: 1, ele: 'fire' });
  context.game.enemies = [ranged];
  context.game.playerHp = 1000;
  const defenseStats = {
    maxHp: 1000, energyShield: 0, dr: 0, armor: 0, evasion: 0, evadeChance: 0,
    resF: 0, resC: 0, resL: 0, resChaos: 0, chillEffectReducePct: 0, physTakenAs: {},
  };
  context.performMonsterAttacks(defenseStats);
  assert.strictEqual(context.game.playerHp, 1000, '적 원거리 공격은 발사 순간 피해를 주면 안 된다');
  const pathSummon = { id: 640, gx: 2, gy: 6, hp: 100, maxHp: 100, alive: true, evasion: 0, armor: 0 };
  context.game.summons = [pathSummon];
  vm.runInContext('pendingEnemyCombatAttacks.forEach(row => { row.at = 0; });', context);
  context.performMonsterAttacks(defenseStats);
  assert.strictEqual(context.game.playerHp, 1000, '소환수가 중간 경로에 들어오면 뒤의 플레이어가 맞으면 안 된다');
  assert.ok(pathSummon.hp < pathSummon.maxHp, '적 투사체는 이동 경로의 소환수에게 가로막혀야 한다');
  context.game.summons = [];

  ranged.attackTimer = 1;
  context.performMonsterAttacks(defenseStats);
  context.game.gridPlayer.gy = 5;
  vm.runInContext('pendingEnemyCombatAttacks.forEach(row => { row.at = 0; });', context);
  context.performMonsterAttacks(defenseStats);
  assert.strictEqual(context.game.playerHp, 1000, '투사체 도착 전에 목표 칸을 벗어나면 회피해야 한다');
  context.game.gridPlayer.gy = 6;
  ranged.attackTimer = 1;
  context.performMonsterAttacks(defenseStats);
  vm.runInContext('pendingEnemyCombatAttacks.forEach(row => { row.at = 0; });', context);
  context.performMonsterAttacks(defenseStats);
  assert.ok(context.game.playerHp < 1000, '목표 칸에 남은 플레이어는 도착한 적 투사체 피해를 받아야 한다');

  context.game.playerHp = 1000;
  ranged.hp = 100; ranged.attackTimer = 1;
  context.game.enemies = [ranged];
  context.performMonsterAttacks(defenseStats);
  ranged.hp = 0;
  context.game.enemies = [];
  vm.runInContext('pendingEnemyCombatAttacks.forEach(row => { row.at = 0; });', context);
  context.performMonsterAttacks(defenseStats);
  assert.ok(context.game.playerHp < 1000, '이미 발사된 투사체는 발사한 적이 죽어도 사라지면 안 된다');
}

// ── 3-4. 플라스크 수명주기: 조우 사이 유지, 지역 완료/이동 시 종료, 루프 시 획득 리셋 ──
{
  resetGame();
  const st = context.ensureFlaskState();
  const future = Date.now() + 5000;
  st.healOverTimeUntil = future;
  st.healOverTimePerSec = 10;
  st.utils = [{ key: 'granite1', charges: 1, until: future }];
  context.game.enemies = []; // 조우 사이(살아있는 적 없음)
  context.game.playerHp = 50;
  context.tickFlaskAutoUse({ maxHp: 100 });
  assert.ok(st.healOverTimeUntil > Date.now(), '조우 사이에는 회복 지속 효과가 유지되어야 한다');
  assert.ok(st.utils[0].until > Date.now(), '조우 사이에는 유틸 플라스크 효과가 유지되어야 한다');
  context.expireActiveFlaskEffects();
  assert.ok(st.healOverTimeUntil <= Date.now(), '지역 완료/이동 시 회복 지속 효과가 종료되어야 한다');
  assert.ok(st.utils[0].until <= Date.now(), '지역 완료/이동 시 유틸 플라스크 효과가 종료되어야 한다');

  // 루프(환생) 시 플라스크 발견/충전 리셋
  context.game.flasks.foundKeys = ['h1', 'h2', 'h3', 'granite1', 'quicksilver1'];
  context.game.season = 1;
  const beforeFound = context.game.flasks.foundKeys.length;
  // 루프 리셋이 부르는 UI/코스모스 경계 함수는 Node 하네스에 없으므로 무해한 스텁으로 대체
  ['grantCodexLegacyStarterUniques', 'renderCosmosAtlas', 'updateStaticUI', 'renderPassiveTree', 'checkUnlocks', 'renderSkills', 'renderInventory', 'renderEquipment', 'updateCombatUI', 'renderMapList', 'syncBattleTabLayout', 'renderTalentCards', 'closeRewardOverlay', 'renderFlaskPanel', 'updateCloudSaveUI', 'renderConditionGems', 'renderSupports', 'updateHeroSelectionUI', 'renderCoreCube'].forEach(name => {
    if (typeof context[name] !== 'function') context[name] = () => {};
  });
  context.triggerSeasonReset();
  const afterFound = context.ensureFlaskFoundKeys();
  assert.ok(afterFound.length < beforeFound, '루프 시 발견한 플라스크가 기본 지급분으로 리셋되어야 한다');
}

// ── 4. 스폰 배치: 보스 고정 칸, 중복 없는 무작위 배치 ──
// ── 3-2. 플라스크 무결성: 순차 발견, 교체 충전 보존, 독립 충전, 조우별 자동 사용 ──
{
  resetGame();
  context.updateStaticUI = () => {};
  context.game.level = 100;
  context.game.equipment['허리띠'] = { baseStats: [{ id: 'flaskUtilSlots', val: 1 }] };
  context.game.flasks.foundKeys = ['h1', 'granite1', 'quicksilver1'];

  const frontier = context.getFlaskDiscoveryCandidates(100, ['h1', 'granite1']);
  assert.ok(frontier.includes('h2'), '회복 플라스크는 다음 단계부터 발견되어야 한다');
  assert.ok(!frontier.includes('h3'), '회복 플라스크의 중간 단계를 건너뛰면 안 된다');
  assert.ok(frontier.includes('granite2'), '발견한 유틸 종류는 다음 단계가 후보여야 한다');
  assert.ok(!frontier.includes('granite3'), '유틸 플라스크의 중간 단계를 건너뛰면 안 된다');
  assert.ok(frontier.includes('quicksilver1'), '미발견 유틸 종류는 1단계부터 시작해야 한다');
  assert.strictEqual(context.getFlaskDiscoveryTierMultiplier('h1'), 1, '1단계 플라스크 발견 확률은 기준 배율이어야 한다');
  assert.ok(context.getFlaskDiscoveryTierMultiplier('h2') <= 0.45, '2단계부터 발견 확률이 크게 감소해야 한다');
  for (let tier = 3; tier <= 8; tier++) {
    assert.ok(
      context.getFlaskDiscoveryTierMultiplier(`h${tier}`) < context.getFlaskDiscoveryTierMultiplier(`h${tier - 1}`) * 0.5,
      `${tier}단계 플라스크는 직전 단계보다 절반 미만의 발견 배율이어야 한다`
    );
  }
  assert.ok(context.getFlaskHealDef('h8').healPct < 100, '최상위 회복 플라스크도 최대 생명력 전체를 초과 회복하면 안 된다');
  assert.ok(vm.runInContext('FLASK_UTILITY_POOL.granite5.armorPct <= 65', context), '최상위 방어 플라스크 효과가 완화되어야 한다');
  assert.ok(vm.runInContext('FLASK_UTILITY_POOL.bismuth5.genericTakenReducePct <= 11', context), '최상위 피해 감소 플라스크 효과가 완화되어야 한다');

  context.game.noti.flask = false;
  const originalRandom = context.Math.random;
  context.Math.random = () => 0;
  assert.strictEqual(context.rollFlaskAlchemyGlassDrop({ isElite: false, isBoss: false }), 1, '연금 유리 드롭을 강제로 재현해야 한다');
  context.Math.random = originalRandom;
  assert.strictEqual(context.game.noti.flask, false, '연금 유리 획득만으로 플라스크 탭 알림이 켜지면 안 된다');

  let st = context.ensureFlaskState();
  context.equipUtilityFlask(0, 'granite1');
  assert.strictEqual(st.utils[0].charges, 0, '처음 장착한 유틸 플라스크는 빈 충전으로 시작해야 한다');
  st.utils[0].charges = 1;
  st.utils[0].chargeProgress = 3;
  context.syncUtilityFlaskChargeBank(st, st.utils[0]);
  context.equipUtilityFlask(0, 'quicksilver1');
  assert.strictEqual(st.utils[0].charges, 0, '교체 장착으로 새 플라스크 충전을 생성하면 안 된다');
  context.equipUtilityFlask(0, 'granite1');
  assert.strictEqual(st.utils[0].charges, 1, '다시 장착한 플라스크는 보관된 충전을 복원해야 한다');
  assert.strictEqual(st.utils[0].chargeProgress, 3, '다시 장착한 플라스크는 보관된 처치 진행도를 복원해야 한다');

  st.healCharges = 0;
  st.healChargeProgress = 0;
  st.utils[0].charges = 0;
  st.utils[0].chargeProgress = 0;
  context.syncUtilityFlaskChargeBank(st, st.utils[0]);
  const healNeed = context.getFlaskEffectiveChargesPerKills(context.getFlaskHealDef('h1').chargesPerKills);
  for (let i = 0; i < healNeed - 1; i++) context.tickFlaskChargesOnKill();
  assert.strictEqual(st.healCharges, 0, '필요 처치 전에는 회복 플라스크가 충전되면 안 된다');
  context.tickFlaskChargesOnKill();
  assert.strictEqual(st.healCharges, 1, '필요 처치를 채우면 회복 플라스크가 1회 충전되어야 한다');

  st.healCharges = context.getFlaskHealDef('h1').maxCharges;
  st.utils[0].charges = 2;
  st.utils[0].chargeProgress = 0;
  st.utils[0].trigger = 'combat';
  st.utils[0].until = 0;
  st.utils[0].lastAutoEncounter = 0;
  context.syncUtilityFlaskChargeBank(st, st.utils[0]);
  context.game.playerHp = 100;
  context.game.enemies = [{ hp: 10, isElite: false, isBoss: false }];
  context.tickFlaskAutoUse({ maxHp: 100 });
  assert.strictEqual(st.utils[0].charges, 1, '전투 시작 시 유틸 플라스크를 1회 사용해야 한다');
  st.utils[0].until = 0;
  context.tickFlaskAutoUse({ maxHp: 100 });
  assert.strictEqual(st.utils[0].charges, 1, '같은 조우에서 전투 시작 조건이 반복 소비되면 안 된다');
  context.game.enemies = [];
  context.tickFlaskAutoUse({ maxHp: 100 });
  context.game.enemies = [{ hp: 10, isElite: false, isBoss: false }];
  context.tickFlaskAutoUse({ maxHp: 100 });
  assert.strictEqual(st.utils[0].charges, 0, '새 조우에서는 전투 시작 조건을 다시 사용할 수 있어야 한다');

  st.healCharges = 0;
  st.healChargeProgress = 4;
  st.utils[0].charges = 0;
  st.utils[0].chargeProgress = 4;
  st.utilityChargeBank.quicksilver1 = { charges: 0, progress: 3 };
  context.refillAllFlaskCharges();
  assert.strictEqual(st.healCharges, context.getFlaskHealDef(st.healTier).maxCharges, '귀환·사망 회복은 회복 플라스크를 최대로 채워야 한다');
  assert.strictEqual(st.healChargeProgress, 0, '완전 충전 시 회복 플라스크 진행도를 초기화해야 한다');
  assert.strictEqual(st.utils[0].charges, vm.runInContext('FLASK_UTILITY_POOL[game.flasks.utils[0].key].maxCharges', context), '장착 유틸리티 플라스크를 최대로 채워야 한다');
  assert.strictEqual(st.utilityChargeBank.quicksilver1.charges, vm.runInContext('FLASK_UTILITY_POOL.quicksilver1.maxCharges', context), '보관 중인 발견 플라스크도 최대로 채워야 한다');
  assert.strictEqual(st.utilityChargeBank.quicksilver1.progress, 0, '보관 플라스크 충전 진행도도 초기화해야 한다');

  const glassBeforeRecovery = st.alchemyGlass;
  st.healCharges = 0;
  st.utils[0].charges = 0;
  context.syncUtilityFlaskChargeBank(st, st.utils[0]);
  context.startMoving(true);
  assert.strictEqual(st.healCharges, context.getFlaskHealDef(st.healTier).maxCharges, '귀환을 시작하면 회복 플라스크 충전이 즉시 회복되어야 한다');
  assert.strictEqual(st.utils[0].charges, vm.runInContext('FLASK_UTILITY_POOL[game.flasks.utils[0].key].maxCharges', context), '귀환을 시작하면 유틸리티 플라스크 충전도 즉시 회복되어야 한다');
  assert.strictEqual(st.alchemyGlass, glassBeforeRecovery, '충전 회복이 연금 유리 보유량을 바꾸면 안 된다');

  st.healCharges = 0;
  st.utils[0].charges = 0;
  context.syncUtilityFlaskChargeBank(st, st.utils[0]);
  context.game.settings.showDeathNotice = false;
  context.handlePlayerDefeat({ id: 'flask_test', type: 'abyss', name: '플라스크 테스트' }, { maxHp: 100, energyShield: 0, moveSpeed: 100 });
  assert.strictEqual(st.healCharges, context.getFlaskHealDef(st.healTier).maxCharges, '사망하면 회복 플라스크 충전이 즉시 회복되어야 한다');
  assert.strictEqual(st.utils[0].charges, vm.runInContext('FLASK_UTILITY_POOL[game.flasks.utils[0].key].maxCharges', context), '사망하면 유틸리티 플라스크 충전도 즉시 회복되어야 한다');
  assert.strictEqual(st.alchemyGlass, glassBeforeRecovery, '사망 충전 회복이 연금 유리 보유량을 바꾸면 안 된다');

  resetGame();
  st = context.ensureFlaskState();
  const now = Date.now();
  context.game.playerHp = 10;
  context.game.enemies = [];
  st.healOverTimeStartedAt = now - 2000;
  st.healOverTimeUntil = now + 2000;
  st.healOverTimeTotal = 40;
  st.healOverTimeApplied = 0;
  st.healOverTimePerSec = 10;
  context.tickFlaskAutoUse({ maxHp: 100 });
  assert.ok(context.game.playerHp >= 29 && context.game.playerHp <= 31, '지속 회복은 고정 틱이 아니라 실제 경과 시간 비율로 적용되어야 한다');
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

// ── 6. 고난도 조우 계획: 스폰은 잦아지고 한 번에 나오는 수는 줄어든다 ──
{
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.5;
    const lowPlan = context.generateEncounterPlan({ id: 3, tier: 3, type: 'act' });
    const highPlan = context.generateEncounterPlan({ id: 12, tier: 12, type: 'act' });
    const lowMobMarkers = lowPlan.filter(marker => !marker.boss);
    const highMobMarkers = highPlan.filter(marker => !marker.boss);
    const highMaxCount = Math.max(...highMobMarkers.map(marker => marker.count));
    const skyTowerPlan = context.generateEncounterPlan({ type: 'skyTower', floor: 30, tier: 30 });
    const skyTowerMobMarkers = skyTowerPlan.filter(marker => !marker.boss);
    assert.ok(highMobMarkers.length > lowMobMarkers.length * 2, '고난도에서는 더 잦은 스폰 지점이 필요하다');
    assert.ok(highMaxCount <= 2, '고난도 일반 스폰은 한 번에 나오는 수가 줄어야 한다');
    assert.ok(highMobMarkers.some(marker => marker.at <= 6), '고난도 첫 스폰은 약 5% 진행도부터 시작해야 한다');
    assert.strictEqual(skyTowerMobMarkers.length, 50, '이미 촘촘한 고난도 구역은 스폰 지점이 더 늘어나면 안 된다');
    assert.ok(skyTowerMobMarkers.every(marker => marker.count === 7), '이미 촘촘한 구역은 스폰 수를 줄이면 안 된다');
  } finally {
    Math.random = originalRandom;
  }
}

// ── 7. 이동: 목표 접근, 점유 칸 회피, 이동 주기 ──
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

// ── 10. 더 가까운 소환수 우선 공격, 같은 거리면 플레이어 우선 ──
{
  resetGame();
  context.game.gridPlayer = { gx: 1, gy: 6 };
  const summon = { id: 1, gx: 4, gy: 6, alive: true, hp: 100, maxHp: 100, armor: 0, evasion: 0, role: 'attack', respawnMs: 2000 };
  const enemy = makeEnemy(1, 5, 6, { attackTimer: 1 });
  context.game.summons = [summon];
  context.game.enemies = [enemy];
  const pStats = {
    maxHp: 1000, energyShield: 0, dr: 0, armor: 0, evasion: 0, evadeChance: 0,
    resF: 0, resC: 0, resL: 0, resChaos: 0, chillEffectReducePct: 0, physTakenAs: {},
  };
  context.game.playerHp = 1000;
  context.performMonsterAttacks(pStats);
  assert.ok(summon.hp < 100, '플레이어보다 가까운 소환수가 공격받아야 한다');
  assert.strictEqual(context.game.playerHp, 1000, '소환수 대상 공격은 플레이어에게 피해를 주지 않아야 한다');

  context.game.gridPlayer = { gx: 1, gy: 6 };
  summon.gx = 5; summon.gy = 6; summon.hp = 100; summon.alive = true;
  enemy.gx = 3; enemy.gy = 6; enemy.attackRange = 2; enemy.attackTimer = 1;
  context.game.playerHp = 1000;
  context.performMonsterAttacks(pStats);
  assert.strictEqual(summon.hp, 100, '같은 거리에서는 소환수가 아니라 플레이어를 우선해야 한다');
  assert.ok(context.game.playerHp < 1000, '같은 거리에서는 플레이어가 피해를 받아야 한다');
}

// ── 11. 빈 슬롯 자동 장착 설정 ──
{
  resetGame();
  context.game.settings.autoEquipEmptySlots = true;
  const helmet = { id: 9001, slot: '투구', name: '시험 투구', baseName: '시험 투구', rarity: 'normal', baseStats: [], stats: [] };
  assert.strictEqual(context.addItemToInventory(helmet), true);
  assert.strictEqual(context.game.equipment['투구'], helmet, '빈 슬롯에는 습득 즉시 자동 장착해야 한다');
  assert.ok(!context.game.inventory.includes(helmet), '자동 장착한 아이템은 인벤토리에 중복 보관하지 않는다');

  context.game.settings.autoEquipEmptySlots = false;
  const armor = { id: 9002, slot: '갑옷', name: '시험 갑옷', baseName: '시험 갑옷', rarity: 'normal', baseStats: [], stats: [] };
  assert.strictEqual(context.addItemToInventory(armor), true);
  assert.strictEqual(context.game.equipment['갑옷'], null, '설정 OFF에서는 자동 장착하지 않아야 한다');
  assert.ok(context.game.inventory.includes(armor), '설정 OFF 아이템은 인벤토리에 들어가야 한다');
}

// ── 12. 소환수 회복/재배치와 장착 소환수 젬 봉인 보호 ──
{
  resetGame();
  context.game.skills = ['기본 공격', '서리늑대 소환', '연속 베기'];
  context.game.activeSkill = '기본 공격';
  context.game.equippedSummonSkills = ['서리늑대 소환'];
  context.game.summonSkillCounts = { '서리늑대 소환': 1 };
  context.sealAllInactiveSkillGems();
  assert.ok(context.game.skills.includes('서리늑대 소환'), '장착 중인 소환수 젬은 일괄 봉인에서 제외해야 한다');
  assert.ok(context.game.skills.includes('기본 공격'), '활성 스킬은 일괄 봉인에서 유지해야 한다');
  assert.ok(!context.game.skills.includes('연속 베기'), '미사용 일반 스킬 젬은 일괄 봉인해야 한다');

  const pStats = context.getPlayerStats();
  context.ensureSummonRuntime(pStats);
  const summon = context.game.summons[0];
  summon.hp = 1;
  summon.gx = 7;
  summon.gy = 0;
  context.restoreAndRecallSummons(pStats);
  assert.strictEqual(summon.hp, summon.maxHp, '플레이어 회복 경계에서는 소환수 체력도 전부 회복해야 한다');
  assert.ok(context.gridChebyshevDist(summon.gx, summon.gy, context.game.gridPlayer.gx, context.game.gridPlayer.gy) <= 1, '회복 경계에서는 소환수를 플레이어 주변으로 재배치해야 한다');

  const preview = context.getSummonTooltipPreview('서리늑대 소환', pStats);
  assert.ok(preview.maxHp > 0 && preview.regenPerSec > 0, '소환수 젬 툴팁에는 체력과 자체 재생 수치가 있어야 한다');
  assert.strictEqual(context.getSummonProfile('서리늑대 소환').baseHp, 58, '소환수 생명력 너프는 후처리 배율이 아닌 기초 생명력에 반영해야 한다(기존 116의 50% 수준)');
  assert.strictEqual(vm.runInContext('SUMMON_REGEN_PCT_PER_SEC', context), 0.75, '소환수 재생 너프는 기초 재생률에 반영해야 한다');
}

// ── 13. 소울바인더 소환수 키스톤: 흡혈/가까운 피해 공유/주변 관통 ──
{
  resetGame();
  context.game.ascendClass = 'soulbinder';
  context.game.ascendKeystones = ['sb3'];
  let pStats = context.getPlayerStats();
  assert.ok(pStats.leech >= 3.5, '야생성은 플레이어와 소환수에 공유하는 흡혈 +3.5%를 제공해야 한다');

  context.game.skills = ['기본 공격', '서리늑대 소환'];
  context.game.equippedSummonSkills = ['서리늑대 소환'];
  context.game.summonSkillCounts = { '서리늑대 소환': 1 };
  context.ensureSummonRuntime(pStats);
  assert.strictEqual(context.game.summons[0].respawnMs, 4000, '기본 공격 소환수의 실제 부활 시간은 4초여야 한다');

  context.game.gridPlayer = { gx: 1, gy: 6 };
  context.game.summons = [
    { id: 80, alive: true, hp: 100, maxHp: 100, gx: 2, gy: 6, respawnMs: 4000 },
    { id: 81, alive: true, hp: 100, maxHp: 100, gx: 6, gy: 1, respawnMs: 4000 }
  ];
  assert.strictEqual(context.getClosestLivingSummonToPlayer().id, 80, '나눠갖기는 플레이어와 가장 가까운 소환수 하나를 선택해야 한다');
  const now = Date.now();
  assert.ok(context.getSummonRespawnAt(context.game.summons[0], true) - now < 3000, '나눠갖기 전달 피해로 사망한 소환수는 부활 시간이 30% 단축되어야 한다');

  context.game.ascendKeystones = ['sb6'];
  context.ensureSummonRuntime(context.getPlayerStats());
  context.game.gridPlayer = { gx: 1, gy: 6 };
  const attacker = context.game.summons[0];
  attacker.gx = 1; attacker.gy = 5; attacker.nextAttackAt = 0;
  const primary = makeEnemy(70, 2, 5);
  const adjacent = makeEnemy(71, 2, 4);
  context.game.enemies = [primary, adjacent];
  context.runSummonAttackTick(context.getPlayerStats());
  assert.ok(primary.hp < primary.maxHp && adjacent.hp < adjacent.maxHp, '꿰뚫는 이는 주 대상 주변 1칸의 적도 소환수 공격으로 맞춰야 한다');
}

// ── 신규 전투 젬: 시간차 판정 / 기동 / 채널 취소 / 태그 보조 ──
{
  resetGame();
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const target = makeEnemy(301, 6, 6, { hp: 100000, maxHp: 100000 });
  context.game.enemies = [target];
  const channelSkill = context.SKILL_DB['집중 광선'];
  const channelTargets = context.selectGridSkillTargets('집중 광선', channelSkill, context.game.gridPlayer, context.game.enemies);
  const channelStages = context.buildSkillHitSequence('집중 광선', channelSkill, channelTargets);
  assert.strictEqual(channelStages.length, 5, '집중 광선은 다섯 번의 실제 시간차 타격이어야 한다');
  assert.deepStrictEqual(Array.from(channelStages, stage => stage.delayMs), [0, 180, 360, 540, 720], '채널링 타격 간격은 젬 정의와 일치해야 한다');
  assert.ok(Math.abs(context.getSkillHitSequenceDpsMultiplier('집중 광선', channelSkill) - 1.1) < 1e-9, '표시 DPS는 채널링 5회의 총 배율을 반영해야 한다');

  const chargeStats = { moveSpeed: 100 };
  assert.strictEqual(context.applySkillMobilityBeforeAttack(context.SKILL_DB['방패 돌진'], target, chargeStats), true, '방패 돌진은 사거리 안 대상에게 실제로 접근해야 한다');
  assert.deepStrictEqual([context.game.gridPlayer.gx, context.game.gridPlayer.gy], [4, 6], '돌진은 한 번에 최대 세 칸까지만 이동해야 한다');
  assert.notDeepStrictEqual([context.game.gridPlayer.gx, context.game.gridPlayer.gy], [target.gx, target.gy], '돌진은 적이 점유한 칸을 침범하면 안 된다');
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  assert.strictEqual(context.applySkillMobilityBeforeAttack(context.SKILL_DB['그림자 점멸'], target, chargeStats), true, '그림자 점멸은 대상 주변의 빈칸으로 이동해야 한다');
  assert.strictEqual(context.gridChebyshevDist(context.game.gridPlayer.gx, context.game.gridPlayer.gy, target.gx, target.gy), 1, '점멸도 적과 칸이 겹치면 안 된다');

  const supportBucket = context.createEmptyStatBucket();
  context.addStatToBucket(supportBucket, 'channelingPctDmg', 17);
  const channelBreakdown = context.getTaggedDamageBreakdown(supportBucket, channelSkill);
  assert.ok(channelBreakdown.parts.some(part => part.statId === 'channelingPctDmg' && part.value === 17), '집중 유지 보조의 피해는 채널링 태그에만 연결되어야 한다');

  context.game.activeSkill = '방패 투척';
  context.game.skills = ['기본 공격', '방패 투척'];
  const unshieldedDamage = context.getPlayerStats().baseDmg;
  context.game.equipment['방패'] = { id: 9901, slot: '방패', name: '시험 방패', rarity: 'normal', baseStats: [], stats: [] };
  const shieldedDamage = context.getPlayerStats().baseDmg;
  assert.ok(shieldedDamage >= Math.floor(unshieldedDamage * 1.27), '방패 투척의 방패 장착 증폭은 실제 기본 피해와 표시 DPS 계산에 반영되어야 한다');
  context.game.equipment['방패'] = { id: 9902, slot: '무기', name: '시험 보조 무기', rarity: 'normal', baseStats: [], stats: [] };
  assert.strictEqual(context.getPlayerStats().baseDmg, unshieldedDamage, '방패 슬롯의 보조 무기는 방패 스킬 증폭을 활성화하면 안 된다');
  context.game.equipment['방패'] = null;

  context.game.activeSkill = '집중 광선';
  context.game.skills = ['기본 공격', '집중 광선'];
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  target.gx = 5; target.gy = 6; target.hp = target.maxHp;
  const pStats = context.getPlayerStats();
  context.performPlayerAttack(pStats);
  vm.runInContext('pendingSkillStageHits = []; combatChannelRuntime.endAt = Date.now() - 1; pTimer = 0;', context);
  context.updateCombatChannelRuntime(Date.now());
  assert.strictEqual(vm.runInContext('pTimer', context), 1, '채널링이 자연 종료되면 다음 집중을 즉시 이어갈 수 있도록 공격 게이지가 준비되어야 한다');

  context.performPlayerAttack(pStats);
  context.game.playerAilments = [{ type: 'freeze', time: 1, duration: 1, power: 1 }];
  context.updateCombatChannelRuntime(Date.now());
  vm.runInContext('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();', context);
  assert.strictEqual(target.hp, target.maxHp, '채널링 중 동결되면 예약된 후속 타격이 남아 피해를 주면 안 된다');

  assert.strictEqual(context.getSummonProfile('폭풍 정령 소환').gridRange, 4, '폭풍 정령은 원거리 소환수 계약을 사용해야 한다');
  assert.ok(context.getSummonProfile('철갑 거북 소환').baseArmor > context.getSummonProfile('불곰 소환').baseArmor, '철갑 거북은 기존 근접 소환수보다 높은 방어도를 가져야 한다');
  resetGame();
}

// ── 걷기 모션 상태: 지역 이동뿐 아니라 전투 중 칸 이동에서도 걸어야 한다 ──
{
  const g = context.game;
  // 적이 없고 지역 이동 중 → 걷기
  g.enemies = [];
  g.moveTimer = 0;
  g.runProgress = 10;
  assert.strictEqual(context.isPlayerWalkingForAnimation(), true, '적이 없고 지역 이동 중이면 걷는 상태여야 한다');

  // 적이 없고 도착 → 정지
  g.runProgress = 100;
  assert.strictEqual(context.isPlayerWalkingForAnimation(), false, '지역 이동이 끝나면 걷는 상태가 아니어야 한다');

  // 전투 중 멀리 있는 적에게 칸을 좁히는 동안 → 걷기
  context.resetPlayerGridPosition();
  g.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const chased = makeEnemy(90, 6, 6);
  chased.hp = 10000;
  g.enemies = [chased];
  const pStats = context.getPlayerStats();
  context.updatePlayerGridEngagement(pStats);
  assert.strictEqual(context.isPlayerWalkingForAnimation(), true, '사거리 밖 적에게 접근하는 동안 걷는 상태여야 한다');

  // 붙어 있어 더 좁힐 칸이 없으면 제자리걸음이므로 걷지 않는다
  g.gridPlayer = { gx: 5, gy: 6, gridMoveTimer: 0 };
  context.updatePlayerGridEngagement(context.getPlayerStats());
  assert.strictEqual(context.isPlayerWalkingForAnimation(), false, '이미 붙어 있으면 걷는 상태가 아니어야 한다');

  // 전투가 끝나고 지역 이동도 아니면 정지
  chased.hp = 0;
  g.runProgress = 100;
  context.updatePlayerGridEngagement(context.getPlayerStats());
  assert.strictEqual(context.isPlayerWalkingForAnimation(), false, '적이 전멸하고 이동도 없으면 걷는 상태가 아니어야 한다');

  // 사망·지역 전환 경계에서 접근 플래그가 굳으면 걷기 모션이 그대로 남는다
  g.enemies = [makeEnemy(91, 7, 7, { hp: 10000 })];
  g.gridPlayer = { gx: 0, gy: 0, gridMoveTimer: 0 };
  context.updatePlayerGridEngagement(context.getPlayerStats());
  assert.strictEqual(g.gridPlayerPursuing, true, '사전 조건: 접근 플래그가 켜져 있어야 한다');
  context.resetPlayerGridPosition();
  assert.strictEqual(g.gridPlayerPursuing, false, '그리드 초기화는 접근 플래그를 내려야 한다');
}

// 두 렌더 경로가 같은 판단을 써야 한다(전장 캔버스 / 스프라이트 선택).
{
  const battlefield = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
  const ui = fs.readFileSync('js/ui.js', 'utf8');
  assert.ok(battlefield.includes('isPlayerWalkingForAnimation'), '전장 캔버스가 공용 걷기 판단을 써야 한다');
  assert.ok(ui.includes('isPlayerWalkingForAnimation'), '스프라이트 선택이 공용 걷기 판단을 써야 한다');
}

console.log('smoke-grid-combat passed');
