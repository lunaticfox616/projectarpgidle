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
const validKinds = new Set(['melee', 'arc', 'nova', 'line', 'chain', 'blast']);
Object.keys(context.SKILL_DB).forEach(name => {
  const profile = context.SKILL_GRID_DB[name];
  assert.ok(profile, `스킬 '${name}'의 그리드 범위 프로필이 SKILL_GRID_DB에 없어야 하면 안 된다`);
  assert.ok(validKinds.has(profile.kind), `스킬 '${name}'의 kind가 유효하지 않다: ${profile.kind}`);
  assert.ok(Number.isFinite(profile.range) && profile.range >= 1, `스킬 '${name}'의 range가 유효하지 않다`);
});
assert.strictEqual(context.describeSkillGridProfile('서리 폭발', context.SKILL_DB['서리 폭발']), '공격 범위: 대상 지점 폭발 · 사거리 4칸 · 반경 2칸');
assert.strictEqual(context.describeSkillGridProfile('연쇄 폭풍', context.SKILL_DB['연쇄 폭풍']), '공격 범위: 연쇄 · 사거리 4칸 · 연쇄 2칸');
assert.ok(Math.max(...Object.values(context.SKILL_GRID_DB).map(profile => profile.range)) <= 6, '보수적으로 조정된 스킬 최대 사거리는 6칸을 넘지 않아야 한다');
const radiusOneCells = context.getGridAttackAreaCells({ kind: 'blast', range: 4, radius: 1 }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
const radiusTwoCells = context.getGridAttackAreaCells({ kind: 'blast', range: 4, radius: 2 }, { gx: 0, gy: 0 }, { gx: 3, gy: 3 });
assert.strictEqual(radiusOneCells.length, 5, '반경 1은 중심과 상하좌우 4칸만 덮어야 한다');
assert.strictEqual(radiusTwoCells.length, 13, '반경 2는 맨해튼 거리 2의 다이아몬드 13칸이어야 한다');
assert.ok(!radiusOneCells.some(cell => cell.gx === 4 && cell.gy === 4), '반경 1은 대각선 칸을 포함하지 않아야 한다');

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

// ── 3-1. 스킬 공격 단계: 회전 순차 타격 / 최초·연쇄 분리 / 강타 여진 ──
{
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

// ── 3-3. 플라스크 수명주기: 조우 사이 유지, 지역 완료/이동 시 종료, 루프 시 획득 리셋 ──
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

console.log('smoke-grid-combat passed');
