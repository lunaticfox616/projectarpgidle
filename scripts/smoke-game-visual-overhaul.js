const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveFiles = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/growth-items.js', 'data/passives.js', 'data/passive-tree-v22.js', 'data/bosses.js',
  'data/rewards.js', 'data/talent-cards.js', 'data/endgame-progression.js', 'js/utils.js', 'js/state.js', 'js/passives.js',
];

function createElement() {
  return {
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, getContext() { return null; },
  };
}

const context = {
  console, window: null, globalThis: null,
  document: {
    readyState: 'loading', addEventListener() {}, getElementById() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, createElement,
    head: { appendChild() {} }, body: { appendChild() {} },
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '', hash: '', href: '' }, navigator: {},
  addEventListener() {}, removeEventListener() {}, setTimeout() {}, clearTimeout() {},
  setInterval() {}, clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
  performance: { now() { return 1000; } }, Image: function Image() {}, Date, Math, JSON,
  Number, String, Boolean, Array, Object, Map, Set, WeakSet, RegExp, Error,
  URLSearchParams, structuredClone,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
passiveFiles.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));

const layout = vm.runInContext(`(() => {
  const nodes = Object.values(PASSIVE_TREE.nodes);
  const starts = nodes.filter(node => node.kind === 'start');
  const coordinateKeys = new Set();
  let duplicateCoordinates = 0;
  for (let i = 0; i < nodes.length; i++) {
    const key = nodes[i].x + ':' + nodes[i].y;
    if (coordinateKeys.has(key)) duplicateCoordinates++;
    coordinateKeys.add(key);
  }
  const actualMinX = Math.min(...nodes.map(node => node.x));
  const actualMaxX = Math.max(...nodes.map(node => node.x));
  const actualMinY = Math.min(...nodes.map(node => node.y));
  const actualMaxY = Math.max(...nodes.map(node => node.y));
  const adjacency = new Map(nodes.map(node => [node.id, 0]));
  PASSIVE_TREE.edges.forEach(edge => {
    adjacency.set(edge.from, (adjacency.get(edge.from) || 0) + 1);
    adjacency.set(edge.to, (adjacency.get(edge.to) || 0) + 1);
  });
  return {
    count: nodes.length,
    edgeCount: PASSIVE_TREE.edges.length,
    duplicateCoordinates,
    startCount: starts.length,
    startClasses: new Set(starts.map(node => node.startClassId)).size,
    startEffects: starts.reduce((sum, node) => sum + (node.effects || []).length, 0),
    isolatedCount: [...adjacency.values()].filter(count => count === 0).length,
    centralStarWedges: nodes.filter(node => node.starWedgeMode === 'mutation').length,
    outerStarWedges: nodes.filter(node => node.starWedgeMode === 'constellation').length,
    starWedgeOptions: nodes.filter(node => node.kind === 'star_option').length,
    builtCount: Object.keys(PASSIVE_TREE_V22.nodes).length,
    builtEdgeCount: PASSIVE_TREE_V22.edges.length,
    aspectRatio: (actualMaxX - actualMinX) / (actualMaxY - actualMinY),
  };
})()`, context);

assert.strictEqual(layout.starWedgeOptions, 24, 'six outer star wedges should expose four connected options each');
assert.strictEqual(layout.count, layout.builtCount,
  'the runtime tree should load every built node, including outer star-wedge options');
assert.strictEqual(layout.edgeCount, layout.builtEdgeCount,
  'the runtime tree should preserve every built connection');
assert.strictEqual(layout.startCount, 6, 'the replacement tree should expose six class starting points');
assert.strictEqual(layout.startClasses, 6, 'each class starting point should own a distinct class id');
assert.strictEqual(layout.startEffects, 0, 'class starting points must remain effect-free');
assert.strictEqual(layout.isolatedCount, 0, 'the authored replacement tree must not contain isolated nodes');
assert.strictEqual(layout.duplicateCoordinates, 0, 'the authored replacement tree must not contain exact coordinate duplicates');
assert.strictEqual(layout.centralStarWedges, 3, 'the center should contain three mutation star-wedge sockets');
assert.strictEqual(layout.outerStarWedges, 6, 'the outer ring should contain six constellation star-wedge sockets');
assert.ok(layout.aspectRatio >= 0.9 && layout.aspectRatio <= 1.2, 'the authored passive tree should retain its near-circular silhouette');

vm.runInContext(fs.readFileSync('js/canvas-slash-vfx.js', 'utf8'), context, { filename: 'js/canvas-slash-vfx.js' });
vm.runInContext(fs.readFileSync('js/canvas-skill-footprint.js', 'utf8'), context, { filename: 'js/canvas-skill-footprint.js' });
vm.runInContext(fs.readFileSync('js/canvas-earth-spikes.js', 'utf8'), context, { filename: 'js/canvas-earth-spikes.js' });
context.Path2D = require('./lib/canvas-path');
vm.runInContext(fs.readFileSync('js/canvas-skill-signatures.js', 'utf8'), context, { filename: 'js/canvas-skill-signatures.js' });
vm.runInContext(fs.readFileSync('data/skill-fx-atlas.js', 'utf8'), context, { filename: 'data/skill-fx-atlas.js' });
vm.runInContext(fs.readFileSync('js/combat-clock.js', 'utf8'), context, { filename: 'js/combat-clock.js' });
vm.runInContext(fs.readFileSync('js/combat.js', 'utf8'), context, { filename: 'js/combat.js' });
vm.runInContext(fs.readFileSync('js/canvas-world-tree-fx.js', 'utf8'), context, { filename: 'js/canvas-world-tree-fx.js' });
vm.runInContext(fs.readFileSync('js/canvas-enemy-projectiles.js', 'utf8'), context, { filename: 'js/canvas-enemy-projectiles.js' });
vm.runInContext(fs.readFileSync('js/canvas-battlefield.js', 'utf8'), context, { filename: 'js/canvas-battlefield.js' });
vm.runInContext(fs.readFileSync('js/canvas-attack-fx.js', 'utf8'), context, { filename: 'js/canvas-attack-fx.js' });
const playerGridMotion = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  battleVisualState.playerGridMotion = null;
  let projection = { cellToScreen(gx, gy) { return { x: 25 + gx * 50, y: 25 + gy * 50 }; } };
  let origin = { gx: 1, gy: 4 };
  let target = { gx: 2, gy: 4 };
  return {
    initial: updatePlayerGridVisualMotion(projection, origin, 1000, 100),
    sameCellLater: updatePlayerGridVisualMotion(projection, origin, 1200, 100),
    moveStart: updatePlayerGridVisualMotion(projection, target, 1300, 100),
    moveMiddle: updatePlayerGridVisualMotion(projection, target, 1546, 100),
    arrival: updatePlayerGridVisualMotion(projection, target, 1792, 100),
    settled: updatePlayerGridVisualMotion(projection, target, 1900, 100),
    directions: {
      east: (() => { battleVisualState.playerGridMotion = null; updatePlayerGridVisualMotion(projection, origin, 2000, 100); return updatePlayerGridVisualMotion(projection, { gx: 2, gy: 4 }, 2010, 100).direction; })(),
      west: (() => { battleVisualState.playerGridMotion = null; updatePlayerGridVisualMotion(projection, origin, 2000, 100); return updatePlayerGridVisualMotion(projection, { gx: 0, gy: 4 }, 2010, 100).direction; })(),
      north: (() => { battleVisualState.playerGridMotion = null; updatePlayerGridVisualMotion(projection, origin, 2000, 100); return updatePlayerGridVisualMotion(projection, { gx: 1, gy: 3 }, 2010, 100).direction; })(),
      south: (() => { battleVisualState.playerGridMotion = null; updatePlayerGridVisualMotion(projection, origin, 2000, 100); return updatePlayerGridVisualMotion(projection, { gx: 1, gy: 5 }, 2010, 100).direction; })()
    },
    heldDirection: battleVisualState.playerFacingDirection
  };
})())`, context));
assert.strictEqual(playerGridMotion.initial.animating, false, '첫 렌더는 현재 칸에서 정지 상태로 시작해야 한다');
assert.strictEqual(playerGridMotion.sameCellLater.animating, false, '시간과 진행도만 흘러도 같은 칸이면 걷지 않아야 한다');
assert.strictEqual(playerGridMotion.moveStart.position.x, 75, '칸 변경을 감지한 첫 프레임은 원본 칸에서 시작해야 한다');
assert.strictEqual(playerGridMotion.moveStart.animating, true, '실제 칸 변경은 걷기 애니메이션을 시작해야 한다');
assert.ok(playerGridMotion.moveMiddle.position.x > 75 && playerGridMotion.moveMiddle.position.x < 125,
  '이동 중에는 원본 칸과 목표 칸 사이를 보간해야 한다');
assert.deepStrictEqual(playerGridMotion.arrival.position, { x: 125, y: 225 }, '도착 시점에는 목표 칸 중심에 정확히 맞아야 한다');
assert.strictEqual(playerGridMotion.arrival.progress, 1, '도착 시점에는 걷기 사이클의 마지막 프레임을 선택해야 한다');
assert.strictEqual(playerGridMotion.arrival.animating, true, '마지막 걷기 프레임은 도착 직후 짧게 유지되어야 한다');
assert.strictEqual(playerGridMotion.settled.animating, false, '도착 프레임 유지가 끝나면 대기 상태로 돌아가야 한다');
assert.deepStrictEqual(playerGridMotion.directions, { east: 'east', west: 'west', north: 'north', south: 'south' },
  '상하좌우 칸 이동은 해당 방향의 걷기 스트립을 선택해야 한다');
assert.strictEqual(playerGridMotion.heldDirection, 'south',
  '이동이 끝난 뒤에도 마지막 이동 방향을 대기·피격 자세에 유지해야 한다');
const playerReturnWarp = JSON.parse(vm.runInContext(`JSON.stringify({
  start: getPlayerReturnWarpPresentation([{ type: 'playerReturnWarp', start: 1000, duration: 500 }], 1000),
  reveal: getPlayerReturnWarpPresentation([{ type: 'playerReturnWarp', start: 1000, duration: 500 }], 1170),
  late: getPlayerReturnWarpPresentation([{ type: 'playerReturnWarp', start: 1000, duration: 500 }], 1450),
  expired: getPlayerReturnWarpPresentation([{ type: 'playerReturnWarp', start: 1000, duration: 500 }], 1501)
})`, context));
assert.strictEqual(playerReturnWarp.start.actorAlpha, 0, '시작 지점 복귀 첫 프레임은 빛 안에서 캐릭터가 나타나기 전이어야 한다');
assert.strictEqual(playerReturnWarp.reveal.actorAlpha, 1, '복귀 연출 초반이 지나면 캐릭터가 완전히 보여야 한다');
assert.strictEqual(playerReturnWarp.start.actorScale, undefined, '복귀 도착 연출이 캐릭터를 작게 만들면 안 된다');
assert.ok(playerReturnWarp.reveal.whiteShroud > 0.9, '복귀 도착 시 원래 크기의 캐릭터가 흰빛에 감싸여야 한다');
assert.ok(playerReturnWarp.late.fade < playerReturnWarp.reveal.fade,
  '캐릭터가 나타난 뒤에는 바닥 소환 고리와 빛기둥이 점차 사라져야 한다');
assert.strictEqual(playerReturnWarp.expired, null, '복귀 연출 시간이 끝나면 추가 렌더 비용을 남기면 안 된다');
const playerReturnDeparture = JSON.parse(vm.runInContext(`JSON.stringify({
  start: getPlayerReturnDeparturePresentation([{ type: 'playerReturnDepart', start: 1000, duration: 500 }], 1000),
  beforeVanish: getPlayerReturnDeparturePresentation([{ type: 'playerReturnDepart', start: 1000, duration: 500 }], 1300),
  vanishing: getPlayerReturnDeparturePresentation([{ type: 'playerReturnDepart', start: 1000, duration: 500 }], 1450),
  expired: getPlayerReturnDeparturePresentation([{ type: 'playerReturnDepart', start: 1000, duration: 500 }], 1501)
})`, context));
assert.strictEqual(playerReturnDeparture.start.actorAlpha, 1, '귀환 준비 초반에는 캐릭터가 빛줄기 안에 그대로 보여야 한다');
assert.strictEqual(playerReturnDeparture.beforeVanish.actorAlpha, 1, '귀환 직전까지는 캐릭터가 성급하게 사라지면 안 된다');
assert.ok(playerReturnDeparture.vanishing.actorAlpha < 1, '귀환 완료 직전에는 상승하는 빛과 함께 캐릭터가 사라져야 한다');
assert.strictEqual(playerReturnDeparture.vanishing.actorScale, undefined, '귀환 출발 연출이 캐릭터 크기를 줄이면 안 된다');
assert.ok(playerReturnDeparture.beforeVanish.whiteShroud > 0.9, '귀환 출발 후반에는 흰빛이 캐릭터를 감싸야 한다');
assert.strictEqual(playerReturnDeparture.expired, null, '귀환 출발 연출이 끝나면 렌더 상태를 남기면 안 된다');
const playerAttackDirections = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  battleVisualState.playerAttackDirection = 'east';
  let player = { x: 100, y: 100 };
  let target = id => [{ enemy: { id } }];
  return {
    north: resolvePlayerAttackDirection(player, target('north'), { north: { x: 240, y: 50 } }),
    south: resolvePlayerAttackDirection(player, target('south'), { south: { x: 20, y: 150 } }),
    east: resolvePlayerAttackDirection(player, target('east'), { east: { x: 150, y: 100 } }),
    west: resolvePlayerAttackDirection(player, target('west'), { west: { x: 50, y: 100 } })
  };
})())`, context));
assert.deepStrictEqual(playerAttackDirections, { north: 'north', south: 'south', east: 'east', west: 'west' },
  '공격 대상이 위·아래·좌·우에 있을 때 해당 방향의 공격 모션을 선택해야 한다');
const actorDepthOrder = JSON.parse(vm.runInContext(`JSON.stringify({
  upperEnemy: sortBattleActorsByDepth([
    { kind: 'player', id: -1, y: 220 }, { kind: 'enemy', id: 1, y: 140 }
  ]).map(actor => actor.kind),
  lowerEnemy: sortBattleActorsByDepth([
    { kind: 'player', id: -1, y: 140 }, { kind: 'enemy', id: 1, y: 220 }
  ]).map(actor => actor.kind),
  sameRow: sortBattleActorsByDepth([
    { kind: 'player', id: -1, y: 180 }, { kind: 'enemy', id: 1, y: 180 }
  ]).map(actor => actor.kind)
})`, context));
assert.deepStrictEqual(actorDepthOrder.upperEnemy, ['enemy', 'player'], '위쪽 적은 아래쪽 플레이어보다 먼저 그려져야 한다');
assert.deepStrictEqual(actorDepthOrder.lowerEnemy, ['player', 'enemy'], '아래쪽 적은 위쪽 플레이어보다 나중에 그려져야 한다');
assert.deepStrictEqual(actorDepthOrder.sameRow, ['enemy', 'player'], '같은 줄에서는 플레이어를 마지막에 그려 가림을 줄여야 한다');
const enemyAttackMotion = JSON.parse(vm.runInContext(`JSON.stringify({
  start: getEnemyAttackMotion({ start: 1000, duration: 200 }, { x: 40, y: 80 }, { x: 100, y: 80 }, 1000, 6),
  impact: getEnemyAttackMotion({ start: 1000, duration: 200 }, { x: 40, y: 80 }, { x: 100, y: 80 }, 1100, 6),
  end: getEnemyAttackMotion({ start: 1000, duration: 200 }, { x: 40, y: 80 }, { x: 100, y: 80 }, 1200, 6),
  north: getEnemyAttackMotion({ start: 1000, duration: 200 }, { x: 80, y: 100 }, { x: 80, y: 40 }, 1100, 6)
})`, context));
assert.ok(Math.abs(enemyAttackMotion.start.x) < 1e-9 && Math.abs(enemyAttackMotion.end.x) < 1e-9,
  '공격 모션이 없는 몬스터는 공격 시작점과 종료점에서 원래 칸으로 돌아와야 한다');
assert.ok(enemyAttackMotion.impact.x > 5.9 && enemyAttackMotion.north.y < -5.9,
  '보조 공격 움직임은 플레이어가 있는 방향으로만 짧게 전진해야 한다');
const enemyFacingDirections = JSON.parse(vm.runInContext(`JSON.stringify({
  north: resolveEnemyFacingDirection({ x: 80, y: 100 }, { x: 80, y: 20 }),
  south: resolveEnemyFacingDirection({ x: 80, y: 100 }, { x: 80, y: 180 }),
  west: resolveEnemyFacingDirection({ x: 80, y: 100 }, { x: 10, y: 100 }),
  east: resolveEnemyFacingDirection({ x: 80, y: 100 }, { x: 150, y: 100 })
})`, context));
assert.deepStrictEqual(enemyFacingDirections, { north: 'north', south: 'south', west: 'west', east: 'east' },
  '방향 스프라이트가 있는 몬스터는 플레이어를 향한 네 방향 프레임을 선택해야 한다');
const summonAttackMotion = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  let proj = { actorGroundOffsetY: 0, cellToScreen: (gx, gy) => ({ x: gx * 10, y: gy * 10 }) };
  let summons = [{ id: 7, gx: 1, gy: 2 }];
  let fx = [{ type: 'summonAttack', summonId: 7, targetEnemyId: 8, targetGx: 4, targetGy: 2,
    start: 1000, duration: 200 }];
  return {
    impact: buildSummonAttackMotionMap(fx, summons, proj, {}, 1100)[7],
    end: buildSummonAttackMotionMap(fx, summons, proj, {}, 1200)[7]
  };
})())`, context));
assert.ok(summonAttackMotion.impact.x > 4.9 && Math.abs(summonAttackMotion.impact.y) < 1e-9,
  '소환수는 실제 공격 대상을 향해 짧게 전진해야 한다');
assert.ok(Math.abs(summonAttackMotion.end.x) < 1e-9 && Math.abs(summonAttackMotion.end.y) < 1e-9,
  '소환수는 공격 연출이 끝나면 원래 칸의 기준점으로 돌아와야 한다');
const heroWalkMotion = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  let ids = Array.from({ length: 10 }, (_, index) => 'hero' + (index + 1));
  return {
    stopped: getPlayableHeroWalkMotion('hero5', 0.5, 0),
    moving: ids.map(id => getPlayableHeroWalkMotion(id, 0.125, 1)),
    arrived: getPlayableHeroWalkMotion('hero5', 1, 1)
  };
})())`, context));
assert.deepStrictEqual(heroWalkMotion.stopped, { x: 0, y: 0 }, '정지한 캐릭터에는 보행 흔들림을 적용하면 안 된다');
heroWalkMotion.moving.forEach((motion, index) => {
  assert.ok(Math.abs(motion.x) + Math.abs(motion.y) >= 1,
    `hero${index + 1}은 걷기 스트립이 미묘해도 식별 가능한 보행 변위가 있어야 한다`);
});
assert.ok(Math.abs(heroWalkMotion.moving[4].y) > Math.abs(heroWalkMotion.moving[0].y),
  '성기사 같은 중장 캐릭터는 가벼운 캐릭터보다 보폭이 분명해야 한다');
assert.ok(Math.abs(heroWalkMotion.arrived.x) + Math.abs(heroWalkMotion.arrived.y) < 1e-9,
  '목표 칸 도착 프레임에서는 보행 흔들림도 바닥 기준점으로 돌아와야 한다');
const adaptiveVfx = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  battleVisualState.frameTimeEma = 16.7;
  battleVisualState.vfxDensity = 1;
  for (let frame = 0; frame < 12; frame++) updateBattleVfxDensity(34, 6);
  const pressured = battleVisualState.vfxDensity;
  for (let frame = 0; frame < 12; frame++) updateBattleVfxDensity(8, 1);
  return { pressured, recovered: battleVisualState.vfxDensity };
})())`, context));
assert.ok(adaptiveVfx.pressured < 0.7, 'slow crowded frames must lower cosmetic VFX density');
assert.ok(adaptiveVfx.recovered > adaptiveVfx.pressured && adaptiveVfx.recovered <= 1,
  'VFX density must recover gradually when the battlefield becomes cheap again');
const shake = vm.runInContext(`(() => { game.settings.cameraShake = false; battleFx = [{ type: 'hit', start: 900, crit: true }]; return getBattleCameraShake(1000); })()`, context);
assert.strictEqual(Math.abs(shake.x) + Math.abs(shake.y), 0, 'camera shake toggle should fully disable translation');
const impactFeedback = vm.runInContext(`(() => {
  game.enemies = [{ id: 'feedback-target', hp: 0, maxHp: 100, lastOverkillDamage: 35 }];
  battleFx = [];
  addBattleFx('playerSwing', { projectile: false, duration: 180, impactDelayMs: 180 });
  addBattleFx('hit', { enemyId: 'feedback-target', damage: 100, duration: 320, syncToSwing: true });
  addBattleFx('enemyDeath', { enemyId: 'feedback-target', duration: 600 });
  addBattleFx('hit', { enemyId: 'independent-target', damage: 10, duration: 220, syncToSwing: false });
  return { swing: battleFx[0], hit: battleFx[1], death: battleFx[2], independent: battleFx[3] };
})()`, context);
assert.strictEqual(impactFeedback.hit.start, impactFeedback.swing.start + impactFeedback.swing.duration, 'hit feedback should begin exactly when the attack motion ends');
assert.strictEqual(impactFeedback.hit.impactTier, 'annihilate', '100%+ raw damage should use annihilation feedback');
assert.strictEqual(impactFeedback.death.start, impactFeedback.hit.start, 'death feedback should stay on the same impact frame');
assert.strictEqual(impactFeedback.independent.start, impactFeedback.independent.queuedAt, 'summon, reflect, and delayed hits should not attach to the player swing');
const deathMotion = JSON.parse(vm.runInContext(`JSON.stringify({
  start: getEnemyDeathMotion({ x: 100, y: 80 }, { x: 40, y: 80 }, 0, false, false),
  impact: getEnemyDeathMotion({ x: 100, y: 80 }, { x: 40, y: 80 }, 0.1, false, false),
  late: getEnemyDeathMotion({ x: 100, y: 80 }, { x: 40, y: 80 }, 0.8, false, false)
})`, context));
assert.deepStrictEqual(deathMotion.start, {
  x: 100, y: 80, scaleX: 1, scaleY: 1, directionX: 1, directionY: 0, dissolve: 0, impactAlpha: 1
}, 'death reaction should begin at the monster footprint without a pre-impact jump');
assert.ok(deathMotion.impact.x > deathMotion.start.x, 'death reaction should knock the body away from the attacker');
assert.strictEqual(deathMotion.impact.scaleX, deathMotion.impact.scaleY,
  'death reaction should keep a rigid silhouette instead of stretching the monster body');
assert.ok(deathMotion.late.dissolve > 0.7 && deathMotion.late.impactAlpha === 0,
  'ground impact should end quickly while the shortened dissolve completes');
const backlogGuard = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  battleFx = [];
  document.hidden = true;
  addBattleFx('hit', { damage: 1 });
  const hiddenCount = battleFx.length;
  document.hidden = false;
  for (let index = 0; index < 300; index++) addBattleFx('hit', { enemyId: 'queue-' + index, damage: 1 });
  const cappedCount = battleFx.length;
  setBattleFxSuppressed(true);
  addBattleFx('hit', { damage: 1 });
  const suppressedCount = battleFx.length;
  setBattleFxSuppressed(false);
  return { hiddenCount, cappedCount, suppressedCount };
})()`, context)));
assert.deepStrictEqual(backlogGuard, { hiddenCount: 0, cappedCount: 160, suppressedCount: 0 }, 'hidden/background combat must discard visual effects and cap any foreground backlog');
const blizzardFieldQueue = vm.runInContext(`(() => {
  battleFx = [];
  addBattleFx('combatTravel', { patternKind: 'field', skillName: '난타 눈보라', duration: 1400 });
  addBattleFx('combatTravel', { patternKind: 'field', skillName: '난타 눈보라', duration: 1400 });
  addBattleFx('combatTravel', { patternKind: 'field', skillName: '화염 폭풍핵', duration: 1400 });
  return battleFx.map(fx => fx.skillName);
})()`, context);
assert.deepStrictEqual(Array.from(blizzardFieldQueue), ['난타 눈보라', '화염 폭풍핵'],
  '빠른 재시전은 이전 눈보라 화면 효과를 교체하되 다른 장판 효과는 유지해야 한다');
const damageTextLayout = vm.runInContext(`(() => {
  battleVisualState.damageTexts = [];
  spawnDamageText({ start: 1200, x: 400, y: 240, value: 10 });
  spawnDamageText({ start: 1200, x: 400, y: 240, value: 11 });
  spawnDamageText({ start: 1200, x: 400, y: 240, value: 12 });
  return battleVisualState.damageTexts.map(text => ({
    start: text.start,
    offsetX: text.offsetX,
    stackShiftTo: text.stackShiftTo,
    duration: text.duration,
  }));
})()`, context);
assert.ok(damageTextLayout.every(text => text.start === 1200), 'damage labels should share the battlefield visual clock instead of wall-clock time');
assert.ok(damageTextLayout.every(text => text.offsetX === 0), 'rapid damage labels should stay on one readable anchor');
assert.deepStrictEqual(Array.from(damageTextLayout, text => text.stackShiftTo), [-36, -18, 0], 'older damage labels should be pushed upward in arrival order');
assert.ok(damageTextLayout.every(text => text.duration <= 760), 'ordinary damage labels should clear quickly instead of lingering over combat');
const damageTextColors = vm.runInContext(`({
  normalIncoming: getDamageTextFillColor({ enemyHit: true }),
  deflectedIncoming: getDamageTextFillColor({ enemyHit: true, deflected: true })
})`, context);
assert.strictEqual(damageTextColors.normalIncoming, '#ff9a9a', 'ordinary incoming damage must retain its warning color');
assert.strictEqual(damageTextColors.deflectedIncoming, '#b7c8c5', 'deflected damage must use a paler, less saturated color');
const projectileVolleyText = vm.runInContext(`(() => {
  battleVisualState.damageTexts = [];
  spawnDamageText({ start: 1400, x: 400, y: 240, value: 100, damageRatio: 0.1, aggregateKey: 'volley:1' });
  spawnDamageText({ start: 1400, x: 400, y: 240, value: 40, damageRatio: 0.04, aggregateKey: 'volley:1' });
  spawnDamageText({ start: 1400, x: 400, y: 240, value: 40, damageRatio: 0.04, aggregateKey: 'volley:1' });
  spawnDamageText({ start: 1400, x: 400, y: 240, value: 25, aggregateKey: 'volley:2' });
  return battleVisualState.damageTexts.map(text => ({ value: text.value, hitCount: text.hitCount, impactTier: text.impactTier }));
})()`, context);
assert.deepStrictEqual(Array.from(projectileVolleyText, row => row.value), [180, 25],
  'one projectile volley must collapse same-target bonus shots into one total damage label');
assert.deepStrictEqual(Array.from(projectileVolleyText, row => row.hitCount), [3, 1],
  'the consolidated projectile label must retain its actual hit count');
const bodyCueLayout = vm.runInContext(`(() => {
  battleVisualState.damageTexts = [];
  spawnDamageText({ start: 1500, x: 300, y: 220, value: 25 });
  spawnDamageText({ start: 1500, x: 300, y: 220, value: '회피!', miss: true, bodyCue: true });
  const rows = battleVisualState.damageTexts.map(text => ({ bodyCue: text.bodyCue, stackShiftTo: text.stackShiftTo, duration: text.duration }));
  battleVisualState.damageTexts = [battleVisualState.damageTexts[1]];
  let font = '';
  let drawY = 0;
  const ctx = { save() {}, restore() {}, strokeText() {}, fillText(value, x, y) { font = this.font; drawY = y; } };
  drawDamageTexts(ctx, 1600);
  return { rows, font, drawY };
})()`, context);
assert.strictEqual(bodyCueLayout.rows[0].stackShiftTo, 0, 'body cues must not push ordinary damage labels into the damage-number stack');
assert.strictEqual(bodyCueLayout.rows[1].bodyCue, true, 'evasion feedback should use the body-cue presentation');
assert.strictEqual(bodyCueLayout.rows[1].stackShiftTo, 0, 'evasion body cues must stay out of the damage-number stack');
assert.strictEqual(bodyCueLayout.rows[1].duration, 420, 'evasion body cues should clear quickly beside the character');
assert.ok(bodyCueLayout.font.includes('11px'), 'body cues should be visibly smaller than ordinary damage numbers');
assert.strictEqual(bodyCueLayout.drawY, 220, 'body cues must stay fixed beside the character instead of rising like damage numbers');

for (let index = 0; index < 18; index++) {
  assert.ok(fs.existsSync(`assets/background/chaos/endgame-${index}.png`), `chaos backdrop ${index} should exist`);
}
assert.ok(fs.existsSync('assets/background/chaos/loop-final.png'), 'chaos loop-final backdrop should exist');
[
  'wood-slimes.png', 'root-spider.png', 'sap-leeches.png'
].forEach(file => assert.ok(fs.existsSync(`assets/enemies/wood/${file}`), `wood monster sheet ${file} should exist`));
for (let index = 0; index < 9; index++) {
  assert.ok(fs.existsSync(`assets/enemies/wood/wood-puppet/frame_${String(index).padStart(3, '0')}.png`), `wood puppet frame ${index} should exist`);
}
assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="chk-camera-shake"'), 'settings should expose the camera shake checkbox');
assert.ok(fs.existsSync('assets/ui/window-frame-luxe-v1.png'), 'generated window frame should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-ring-v1.png'), 'generated boss ring telegraph should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-fan-v1.png'), 'generated boss fan telegraph should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-pulse-v1.png'), 'generated boss pulse telegraph should exist');
[
  'skill-whirlwind-v2.png', 'skill-chain-primary-v2.png', 'skill-chain-jump-v1.png',
  'skill-slam-primary-v2.png', 'skill-slam-aftershock-v2.png', 'skill-slash-v2.png',
  'skill-projectile-v2.png', 'skill-venom-fang-v3.png', 'skill-frost-field-v2.png', 'skill-frost-wave-v2.png',
  'skill-chaos-boomerang-v2.png', 'skill-frost-burst-v1.png', 'skill-frost-wave-ring-v1.png', 'skill-burst-v2.png', 'skill-dot-field-v2.png',
  'skill-meteor-projectile-v2.png', 'skill-meteor-impact-v2.png', 'skill-meteor-ground-v2.png',
  'skill-summon-strike-v1.png',
].forEach(file => assert.ok(fs.existsSync(`assets/effects/${file}`), `generated skill VFX ${file} should exist`));
const channelVfxAssets = [
  'channel-focus-beam-v2.png', 'channel-dragon-breath-v2.png', 'channel-void-cutter-v2.png',
];
channelVfxAssets.forEach(file => {
  const bytes = fs.readFileSync(`assets/effects/${file}`);
  assert.strictEqual(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} should be a real PNG asset`);
  assert.strictEqual(bytes.readUInt8(25), 6, `${file} should retain RGBA transparency`);
  assert.ok(bytes.length <= 32768, `${file} should stay below the 32 KiB channel VFX budget`);
});
const skillVfxCoverage = vm.runInContext(`(() => {
  const gems = Object.keys(SKILL_DB).filter(name => SKILL_DB[name] && SKILL_DB[name].isGem);
  return {
    count: gems.length,
    missing: gems.filter(name => !SKILL_GEM_VFX_PROFILES[name]),
  };
})()`, context);
assert.ok(skillVfxCoverage.count >= 41, 'the active skill-gem roster should remain fully represented');
assert.deepStrictEqual(Array.from(skillVfxCoverage.missing), [], 'every active skill gem should have an explicit image VFX profile');
const elementalImpactDraw = vm.runInContext(`(() => {
  const calls = { arcs: 0, lines: 0, radialGradients: 0 };
  const gradient = { addColorStop() {} };
  const ctx = {
    globalAlpha: 1, save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() { calls.lines++; }, bezierCurveTo() { calls.lines++; }, quadraticCurveTo() { calls.lines++; }, stroke() {}, fill() {}, fillRect() {},
    arc() { calls.arcs++; }, ellipse() { calls.arcs++; },
    createRadialGradient() { calls.radialGradients++; return gradient; },
    createLinearGradient() { return gradient; }
  };
  attackFxSpawn('light', 120, 100, { variant: 'melee' });
  attackFxSpawn('light', 220, 100, { variant: 'nova' });
  attackFxSpawn('fire', 320, 100, { variant: 'slam' });
  attackFxSpawn('cold', 420, 100, { variant: 'nova' });
  attackFxUpdate(16);
  attackFxDraw(ctx);
  return calls;
})()`, context);
assert.strictEqual(elementalImpactDraw.arcs, 0, 'fire, cold, and lightning impacts must not draw circles, ellipses, or arc fragments');
assert.strictEqual(elementalImpactDraw.radialGradients, 0, 'fire, cold, and lightning impacts must not draw circular radial glows');
assert.ok(elementalImpactDraw.lines > 0, 'elemental impacts should retain flame, shard, and forked-line feedback');
const projectileVfxShapes = vm.runInContext(`(() => {
  function signature(style) {
    const calls = [];
    const ctx = { globalAlpha: 1, save() {}, restore() {}, beginPath() { calls.push('begin'); }, closePath() { calls.push('close'); },
      moveTo() { calls.push('move'); }, lineTo() { calls.push('line'); }, arc() { calls.push('arc'); }, rotate() { calls.push('rotate'); },
      fill() { calls.push('fill'); }, stroke() { calls.push('stroke'); }, strokeRect() { calls.push('rect'); } };
    drawElementProjectileVfx(ctx, style, 70, 28, 0.45);
    return calls.join('|');
  }
  const styles = ['fire', 'cold', 'light', 'chaos', 'shield', 'potion'];
  return {
    styles: styles.map(signature),
    shield: getSkillProjectileVfxStyle('방패 투척', 'phys'),
    potion: getSkillProjectileVfxStyle('원소 포션 투척', 'fire'),
    venomAsset: SKILL_GEM_VFX_PROFILES['독니 사출'].projectileAsset,
    venomImpact: SKILL_GEM_VFX_PROFILES['독니 사출'].impactVfx,
  };
})()`, context);
assert.strictEqual(new Set(projectileVfxShapes.styles).size, 6, '화염·냉기·번개·카오스·방패·포션 투사체는 서로 다른 실루엣으로 그려야 한다');
assert.strictEqual(projectileVfxShapes.shield, 'shield', '방패 투척은 물리 화살 대신 회전 방패 실루엣을 사용해야 한다');
assert.strictEqual(projectileVfxShapes.potion, 'potion', '포션 투척은 화염탄 대신 병 실루엣을 사용해야 한다');
assert.strictEqual(projectileVfxShapes.venomAsset, 'venomFang', 'venom fang should use its dedicated image projectile');
assert.strictEqual(projectileVfxShapes.venomImpact, false, 'venom fang should not layer a generic impact burst over the image projectile');
const venomProfile = vm.runInContext(`SKILL_GEM_VFX_PROFILES['독니 사출']`, context);
assert.strictEqual(venomProfile.projectileWidth, 88, 'the supplied sharp venom projectile should remain readable in combat');
assert.strictEqual(venomProfile.projectileHeight, 28, 'the sharp venom projectile should retain its narrow silhouette');
const skillGemArtCoverage = vm.runInContext(`(() => {
  const gems = Object.keys(SKILL_DB).filter(name => SKILL_DB[name] && SKILL_DB[name].isGem);
  return {
    count: gems.length,
    missing: gems.filter(name => !SKILL_GEM_ART_PATHS[name]),
    paths: gems.map(name => SKILL_GEM_ART_PATHS[name]),
  };
})()`, context);
assert.deepStrictEqual(Array.from(skillGemArtCoverage.missing), [], 'every active skill gem should have its own dedicated UI art mapping');
assert.strictEqual(new Set(skillGemArtCoverage.paths).size, skillGemArtCoverage.count, 'active skill gems should not share the same portrait asset');
skillGemArtCoverage.paths.forEach(file => assert.ok(fs.existsSync(file), `skill gem portrait ${file} should exist`));
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
assert.ok(passiveSource.includes("skillFxWhirlwind: 'assets/effects/skill-whirlwind-v2.png'"), 'battle asset loader should preload pixel skill VFX images');
assert.ok(passiveSource.includes("skillFxFrostField: 'assets/effects/skill-frost-field-v2.png'"), 'battle asset loader should preload pixel combat pattern images');
assert.ok(passiveSource.includes("skillFxBlizzardAmbient: 'assets/effects/skill-bludgeoning-blizzard-ambient-sheet-v2.png'"), 'battle asset loader should preload the pixel blizzard ambient sprite sheet');
assert.ok(passiveSource.includes("skillFxBlizzardImpact: 'assets/effects/skill-bludgeoning-blizzard-impact-sheet-v2.png'"), 'battle asset loader should preload the pixel blizzard impact sprite sheet');
assert.ok(passiveSource.includes("skillFxVenomFang: 'assets/effects/skill-venom-fang-v3.png'"), 'battle asset loader should preload the pixel venom projectile image');
assert.ok(passiveSource.includes("skillFxFocusBeam: 'assets/effects/channel-focus-beam-v2.png'"), 'battle asset loader should preload the pixel focused beam image');
assert.ok(passiveSource.includes("skillFxDragonBreath: 'assets/effects/skill-dragon-breath-v3.png'"), 'battle asset loader should preload the pixel dragon breath image');
assert.ok(passiveSource.includes("skillFxVoidCutter: 'assets/effects/channel-void-cutter-v2.png'"), 'battle asset loader should preload the pixel void cutter image');
['ambient', 'impact'].forEach(kind => {
  const bytes = fs.readFileSync(`assets/effects/skill-bludgeoning-blizzard-${kind}-sheet-v2.png`);
  assert.ok(bytes.readUInt32BE(16) >= 600 && bytes.readUInt32BE(20) >= 600,
    `blizzard ${kind} sheet should retain enough source pixels for its 4x4 frame grid`);
  assert.strictEqual(bytes.readUInt8(25), 6, `blizzard ${kind} sheet should retain RGBA transparency`);
});
const venomVfxBytes = fs.readFileSync('assets/effects/skill-venom-fang-v3.png');
assert.deepStrictEqual([venomVfxBytes.readUInt32BE(16), venomVfxBytes.readUInt32BE(20)], [579, 189],
  'the supplied pixel venom projectile must keep its authored combat dimensions');
assert.strictEqual(venomVfxBytes.readUInt8(25), 6, 'the supplied venom projectile must retain RGBA transparency');
assert.ok(passiveSource.includes("key.startsWith('skillFx')"), 'transparent skill VFX should bypass sprite-sheet sanitization');
assert.ok(passiveSource.includes("woodEnemySlimes: 'assets/enemies/wood/wood-slimes.png'"), 'battle asset loader should preload the replacement wood monster roster');
assert.ok(passiveSource.includes("key.startsWith('woodEnemy')"), 'transparent wood monster sheets should bypass legacy backdrop sanitization');
assert.ok(passiveSource.includes('normal: woodEnemyVariants.length ? woodEnemyVariants.concat(wispEnemyVariants)'),
  'normal monster variants should keep the supplied wood roster alongside wisps');
assert.ok(passiveSource.includes('boss: ['), 'boss variants should retain the dedicated legacy and act-boss pool');
const passiveCanvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
const passiveDrawCalls = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  const calls = { lines: 0, curves: 0, images: 0, gradients: 0, operations: 0 };
  const count = key => { calls[key] += 1; calls.operations += 1; };
  const ctx = {
    globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() { count('lines'); }, quadraticCurveTo() { count('curves'); },
    bezierCurveTo() { count('curves'); }, arc() {}, fill() {}, stroke() {}, strokeRect() {},
    drawImage() { count('images'); }, createRadialGradient() { count('gradients'); return { addColorStop() {} }; },
    createLinearGradient() { count('gradients'); return { addColorStop() {} }; },
  };
  drawPassiveLink(ctx, { x: 0, y: 0 }, { x: 80, y: 30 }, { stroke: '#789', width: 1 });
  drawPassiveNodeShape(ctx, { id: 'clean-major', x: 30, y: 20, kind: 'major', tier: 3 }, 16,
    { outer: '#e2c281', mid: '#27313d', inner: '#fff3d6' }, false, true, 'discovered', 1, false);
  return calls;
})())`, context));
assert.ok(passiveDrawCalls.lines > 0, 'clean passive links and major-node ornaments should remain visible');
assert.strictEqual(passiveDrawCalls.curves, 0, 'passive links should be straight instead of using the old curved structure');
assert.strictEqual(passiveDrawCalls.images, 0, 'passive nodes should use lightweight vector silhouettes instead of old frame images');
assert.strictEqual(passiveDrawCalls.gradients, 0, 'individual passive nodes should not create per-node glow gradients');
assert.ok(passiveDrawCalls.operations <= 12, 'one link and one node should stay within a small draw-operation budget');
assert.ok(!passiveSource.includes('PASSIVE_NODE_FRAME_SOURCES'), 'the old passive frame-image loader must stay removed');
assert.ok(!passiveCanvasSource.includes('drawPassiveStarfield'), 'the old animated passive starfield must stay removed');
assert.ok(!passiveCanvasSource.includes('drawPassiveEvolutionAura'), 'the old evolution aura must stay removed');
assert.ok(!fs.readFileSync('index.html', 'utf8').includes('passive-node-star-wedge'), 'old passive art must not be loaded as the app icon');
const windowCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const luxeCss = fs.readFileSync('css/ui-luxe.css', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert.ok(indexSource.includes('<body class="startup-active">'), 'the game body must begin in its startup state before any gameplay UI can paint');
assert.ok(indexSource.includes('id="startup-overlay" class="startup-overlay active"'), 'the startup screen must be visible in the initial HTML paint');
assert.ok(indexSource.includes('<title>Rignin</title>'), 'the browser tab should use the Rignin game title');
assert.ok(!indexSource.includes('THE ROOTBOUND CHRONICLE') && !indexSource.includes('ROOT AWAKENING'),
  'the startup screen should not retain the redundant English campaign and season labels');
assert.ok(!indexSource.includes('끝없이 되감기는 성소에서 운명을 벼려내십시오.'),
  'the startup screen should not retain the removed promotional tagline');
assert.ok(indexSource.includes('class="startup-summary-head"') && indexSource.includes('class="patch-notes-open-btn startup-patch-note-link"'),
  'patch notes should remain accessible from the single compact local-save summary card');
assert.ok(indexSource.includes('body.startup-active #left-pane') && indexSource.includes('body.startup-active #right-pane'), 'startup paint must hide legacy gameplay panes instead of briefly showing them behind the title screen');
assert.ok(indexSource.includes('<html lang="ko" class="app-preload">'), 'the document must begin behind the critical preload curtain');
assert.ok(indexSource.includes('html.app-preload body > :not(#startup-overlay)') && indexSource.includes("classList.remove('app-preload')"), 'the preload curtain must hide unstyled gameplay and release after the styled load frame');
assert.ok(indexSource.includes('id="tutorial-dismiss-btn"'), 'tutorial notice should expose a single acknowledgement action');
assert.ok(!indexSource.includes('id="tutorial-progress-fill"'), 'tutorial notice should not use multi-step progress');
assert.ok(!indexSource.includes('id="tutorial-visual"'), 'tutorial notice should keep the actual game screen visible');
assert.ok(!passiveSource.includes('activeTutorial.steps = getTutorialGuide(activeTutorial)'), 'tutorial notices should not expand into illustrated multi-step lessons');
const enemyUiSource = fs.readFileSync('js/ui.js', 'utf8');
const enemyCombatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(enemyUiSource.includes("enemy.traitOutlineColor || (enemy.trait && enemy.trait.outlineColor) || '#e2b94f'")
  && /enemy\.isBoss\r?\n\s+\? '#a84e49'/.test(enemyUiSource),
  'elite outlines should follow their named trait color while bosses retain the restrained red outline');
assert.ok(enemyUiSource.includes('moving === true && movementFrames.length > 0'), 'monster sprite frames should advance only while the monster actually changes cells');
assert.ok(enemyCombatSource.includes("addBattleFx('enemyAttack', { enemyId: enemy.id, duration: 220 })"),
  'every resolved enemy attack against the player must emit one motion cue even when the hit is evaded or blocked');
assert.ok(!enemyUiSource.includes('let wobble = Math.sin((now / 170)'), 'fallback monsters should not float up and down while idle');
const battlefieldSource = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
assert.ok(battlefieldSource.includes("else if (game.moveTimer > 0) caption = '';"), 'normal area movement should not show a redundant status caption');
assert.ok(!battlefieldSource.includes('전진이 막혔습니다'), 'the verbose legacy crowd-blocked caption must be removed');
assert.ok(battlefieldSource.includes('caption = `몬스터 수 ${enemies.length}마리`;'), 'battlefield status must report the current monster count');
assert.ok(!battlefieldSource.includes('기와 교전 중') && !battlefieldSource.includes('지역 탐색 중'), 'legacy encounter captions must not remain');
assert.ok(battlefieldSource.includes('playerPos.y - 82'), 'the player overhead health bar should clear tall character sprites and head ornaments');
assert.ok(battlefieldSource.includes('enemy.isBoss ? 106 : 56'), '2x2 boss health bars should clear the enlarged sprite');
assert.ok(!battlefieldSource.includes('tilePath(COMBAT_GRID_CONFIG.playerSpawn.gx')
    && !battlefieldSource.includes('tilePath(COMBAT_GRID_CONFIG.bossSpawn.gx'),
  'the battlefield should not paint permanent blue player or red boss spawn markers');
assert.ok(!battlefieldSource.includes("fillCell(game.gridPlayer, 'rgba(107, 190, 255"),
  'the player current cell should not receive a permanent blue overlay');
assert.ok(battlefieldSource.includes('enemy.isBoss ? 3.65'), 'boss sprites should visually span their 2x2 footprint');
assert.ok(!battlefieldSource.includes('let flashFx = (battleFx || []).find'), 'battlefield rendering should not flash the full screen on impact');
assert.ok(battlefieldSource.includes('let rings = 1;'), 'annihilating hits should keep a single lightweight impact ring');
assert.ok(battlefieldSource.includes('for (let ring = 0; ring < 1; ring++)'), 'level-up feedback should use a single lightweight ring');
assert.ok(!battlefieldSource.includes('for (let ray = 0; ray < 4; ray++)'), 'level-up feedback should avoid a separate ray burst');
assert.ok(!battlefieldSource.includes('let glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 92'), 'one-shot feedback should avoid its previous large radial fill');
assert.ok(battlefieldSource.includes("const dissolveFade = Math.pow(1 - dissolve, 1.62);"), 'enemy death sprites should fade through a restrained dissolve curve');
assert.ok(battlefieldSource.includes('ctx.translate(deathMotion.x, deathMotion.y);'), 'enemy deaths should use the short directional body reaction');
assert.ok(!battlefieldSource.includes('ctx.translate(enemy.x, enemy.y - t *'), 'enemy deaths should not use the previous upward exit motion');
assert.ok(!battlefieldSource.includes('let driftX = Math.sin((now / 240)'), 'living monsters should not drift around their assigned grid cell');
assert.ok(!battlefieldSource.includes('drawBossTelegraphDecal'), 'boss telegraphs should not use the coarse generated decal assets');
assert.ok(battlefieldSource.includes('function queueSkillGemVfx('), 'resolved skill hits should enqueue generated image effects');
assert.ok(battlefieldSource.includes('drawSkillGemVfxLayer(ctx, now);'), 'skill VFX should render through the battlefield effect layer');
assert.ok(battlefieldSource.indexOf('drawSkillGemVfxLayer(ctx, now);') > battlefieldSource.indexOf('drawBattleActorLayer(ctx, dynamicLayout'), 'translucent skill VFX should remain visible over depth-sorted actors');
assert.ok(battlefieldSource.indexOf('drawSkillGemVfxLayer(ctx, now);') < battlefieldSource.lastIndexOf('drawBattlefieldEnemyHealthBars(ctx'), 'health bars and combat text should remain above skill VFX');
assert.ok(battlefieldSource.includes('function queueSkillGemProjectileLaunch('), 'projectile gems should enqueue a pre-impact travelling projectile');
assert.ok(battlefieldSource.includes('if (effect.travel)'), 'projectiles should travel as discrete images rather than stretching across the full distance');
assert.ok(battlefieldSource.includes("let isPiercePath = skill.targetMode === 'pierce';"), 'piercing skills should resolve as one shared projectile path');
assert.ok(battlefieldSource.includes('targets = targets.length > 0 ? [targets[targets.length - 1]] : []'), 'piercing target count must not spawn one projectile per enemy');
assert.ok(battlefieldSource.includes('let travelProgress = t;'), 'projectiles should use a straight linear flight path');
assert.ok(!battlefieldSource.includes('let arc = Math.sin(t * Math.PI)'), 'projectiles should not arc above the battlefield');
assert.ok(!battlefieldSource.includes('let connector = family === \'projectile\''), 'projectile art should no longer use a full-distance connector');
assert.ok(battlefieldSource.includes("stageKind === 'chainJump'"), 'secondary chain hits should use their connector image');
assert.ok(battlefieldSource.includes("stageKind === 'slamAftershock'"), 'delayed slam aftershocks should use their own image');
const combatPatternImages = vm.runInContext(`[
  getCombatTravelImageKey({ skillName: '서리 폭발', patternKind: 'radialBurst' }),
  getCombatTravelImageKey({ patternKind: 'field' }),
  getCombatTravelImageKey({ patternKind: 'moving' }),
  getCombatTravelImageKey({ patternKind: 'boomerang' }),
  getCombatTravelImageKey({ patternKind: 'boomerang', skillName: '독니 사출', element: 'chaos' }),
  getCombatTravelImageKey({ patternKind: 'field', element: 'fire' }),
  getCombatTravelImageKey({ owner: 'enemy', delivery: 'magicCell' })
]`, context);
assert.deepStrictEqual(Array.from(combatPatternImages), [
  'skillFxFrostBurst', 'skillFxFrostField', 'skillFxFrostWave', 'skillFxChaosBoomerang', 'skillFxVenomFang', 'skillFxDotField', 'bossTelegraphPulse'
], 'real collision patterns should select their dedicated image assets');
const venomProjectileDrawing = vm.runInContext(`(() => {
  const calls = { images: 0, rectangles: 0, strokes: 0 };
  battleAssets.images.skillFxVenomFang = { complete: true, naturalWidth: 192 };
  const ctx = {
    globalAlpha: 1,
    save() {}, restore() {}, translate() {}, rotate() {},
    drawImage() { calls.images++; }, fillRect() { calls.rectangles++; },
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {}, fill() {},
    stroke() { calls.strokes++; },
  };
  drawCombatMovingFx(ctx, {
    owner: 'player', delivery: 'projectileTarget', patternKind: 'boomerang', skillName: '독니 사출'
  }, 50, 0, 100, { x: 0, y: 0 }, [{ x: 100, y: 0 }], 'skillFxVenomFang', 'chaos');
  return calls;
})()`, context);
assert.strictEqual(venomProjectileDrawing.images, 1, 'venom fang should draw one compact image projectile');
assert.strictEqual(venomProjectileDrawing.rectangles, 0, 'venom fang should not fall back to a placeholder rectangle');
assert.strictEqual(venomProjectileDrawing.strokes, 0, 'venom fang should not retain procedural rings or line trails');
const projectileImageRouting = vm.runInContext(`(() => {
  const calls = { genericImages: 0, missingImageStrokes: 0 };
  battleAssets.images.skillFxProjectile = { complete: true, naturalWidth: 640 };
  const imageCtx = {
    globalAlpha: 1,
    save() {}, restore() {}, translate() {}, rotate() {},
    drawImage() { calls.genericImages++; }, fillRect() {}, fill() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
    stroke() {},
  };
  drawCombatMovingFx(imageCtx, {
    owner: 'player', delivery: 'projectileTarget', skillName: '얼음 창'
  }, 50, 0, 100, { x: 0, y: 0 }, [{ x: 100, y: 0 }], 'skillFxProjectile', 'cold');

  delete battleAssets.images.skillFxVenomFang;
  const fallbackCtx = {
    globalAlpha: 1,
    save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {}, fill() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
    stroke() { calls.missingImageStrokes++; },
  };
  drawCombatMovingFx(fallbackCtx, {
    owner: 'player', delivery: 'projectileTarget', patternKind: 'boomerang', skillName: '독니 사출'
  }, 50, 0, 100, { x: 0, y: 0 }, [{ x: 100, y: 0 }], 'skillFxVenomFang', 'chaos');
  return calls;
})()`, context);
assert.strictEqual(projectileImageRouting.genericImages, 1, 'ordinary projectile gems should use the loaded projectile image');
assert.ok(projectileImageRouting.missingImageStrokes > 0, 'a missing dedicated projectile image should retain a visible procedural fallback');
// Imported skills bypass these legacy cell/procedural renderers. Their motion is verified
// against PixelLab v3.7 in smoke-world-tree-native-motion; real casts remain covered by
// smoke-skill-cast-vfx and smoke-continuous-slash-vfx (including basic attacks).
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes("text: '회피!', color: '#9fb4c8', duration: 260, bodyCue: true"), 'player evasion should request fixed body feedback');
assert.ok(combatSource.includes("text: '막아냄!', color: '#a7a7a7', duration: 260, bodyCue: true"), 'player blocks should request fixed body feedback');
// Slow/fast motion durations are exercised by smoke-combat-calculation-contracts.
assert.ok(combatSource.includes('rawDamage: dmg'), 'one-shot damage labels should retain uncapped calculated damage');
assert.ok(battlefieldSource.includes('Number.isFinite(Number(fx.rawDamage)) ? Number(fx.rawDamage) : fx.damage'), 'damage labels should show damage beyond the target remaining life');
assert.strictEqual(context.SKILL_DB['회오리바람'].targets, 8, 'whirlwind should cover all eight adjacent directions');
assert.strictEqual(context.SKILL_GEM_VFX_PROFILES['번개 타격'].primaryFamily, 'slash', 'lightning strike should begin with a melee lightning slash before chain arcs');
assert.strictEqual(context.SKILL_GEM_VFX_PROFILES['뇌운 낙뢰'].sigilVfx, false, 'thundercloud strike should keep its bolt without stacking a large circular sigil on the target');
assert.strictEqual(context.SKILL_GEM_VFX_PROFILES['뇌운 낙뢰'].impactAccentVfx, false, 'thundercloud strike should not inherit the generic circular heavy-hit accent');
assert.ok(battlefieldSource.includes('if (!enemy.isElite) return;'), 'ordinary monsters should not render ground aura telegraphs');
assert.ok(combatSource.includes("addBattleFx('enemySpawn', { enemyId: bossEnemy.id"), 'boss entrance feedback should remain separate from pattern telegraphs');
assert.ok(battlefieldSource.includes("fx.type === 'playerHit' ? Math.max(0.45, hitStrength * 0.32)"), 'enemy hits should use restrained camera feedback');
assert.ok(combatSource.includes("addBattleFx('levelUp'"), 'player level-ups should create a battlefield effect');
assert.ok(combatSource.includes("duration: 560, color: '#ffe59a'"), 'level-up feedback should end quickly');
const socialSource = fs.readFileSync('js/social.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8') + '\n' + fs.readFileSync('js/main.js', 'utf8');
const windowManagerSource = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const shellSource = fs.readFileSync('js/ui-game-shell.js', 'utf8');
assert.ok(!shellSource.includes('PROJECT IDLE</strong>'), 'the in-game expedition brand should be removed');
assert.ok(!uiSource.includes('enemy-target-strip'), 'meaningless enemy count/target buttons should be removed');
assert.ok(uiSource.includes("showTraits = !!(focusedEnemy.isElite || focusedEnemy.isBoss || focusedEnemy.bossPhase)"), 'elite and boss traits should remain visible under the health bar');
assert.ok(uiSource.includes("hunterExpose: { sprite: 8, label: '약점 노출'"), 'hunter exposure should use its Korean icon presentation');
assert.ok(uiSource.includes("hunterExpose: () => '헌터 전직 키스톤 효과로 받는 모든 피해가 20% 증가합니다.'"), 'hunter exposure should explain its actual effect in the custom tooltip');
assert.ok(uiSource.includes("'rivalKey', 'cosmosSovereignKey'"), 'rival and echo marks should stay hidden from the crafting currency list');
assert.ok(uiSource.includes('gem-tag--${getTone(tag)}'), 'skill-gem tags should render semantic color classes');
assert.ok(uiSource.includes('gem-tag--support') && uiSource.includes('gem-tag--resonance'), 'support gem tags should use distinct support and resonance colors');
assert.ok(uiSource.includes("renderSkillGemArt(name, 'gem-card-sigil gem-card-art')"), 'skill cards should use their dedicated gem portraits');
assert.ok(uiSource.includes('overlayPause && (tutorialOpen || optionalOverlayOpen)'), 'tutorial notices must follow the overlay-pause setting');
assert.ok(uiSource.includes('tutorialPause || isRewardOpen()'), 'tutorial notices must use the optional render-only game-loop path');
assert.ok(windowManagerSource.includes('.tutorial-overlay.active:not(#tutorial-overlay)'), 'compact tutorial notices should not block desktop window interactions');
assert.ok(socialSource.includes('연결이 끝나면 채팅이 이 화면에서 자동으로 열립니다.'), 'chat should show a cloud-session pending state');
assert.ok(uiSource.includes('refreshSocialAfterCloudStateChange'), 'cloud session changes should refresh an already-open chat tab');
assert.ok(uiSource.includes("socialTab.classList.contains('ui-community-dock')"), 'cloud session restore should refresh an open community dock');
assert.ok(uiSource.includes("socialTab.classList.contains('ui-community-overlay')"), 'cloud session restore should refresh an open community overlay');
assert.ok(uiSource.includes('exitPushStartedAt - lastPageExitCloudPushAt < 1500'), 'page-exit cloud uploads should be deduplicated across lifecycle events');
assert.ok(socialSource.includes('function syncSocialChatNotificationSetting()'), 'new chat notifications should follow their dedicated setting');
assert.ok(socialSource.includes('scrollChatToLatestOnNextRender'), 'opening chat should explicitly request the newest message position');
assert.ok(indexSource.includes('id="chk-social-chat-noti"'), 'settings should expose a new-chat notification toggle');
assert.ok(!socialSource.includes('setInterval(() => { if (socialCloudReady() && getMyNickname()) ensureHeartbeat(); }, SOCIAL_HEARTBEAT_MS);\n    // 커뮤니티'), 'social module should not run an eager cloud-ready watcher forever');
assert.ok(passiveSource.includes('data-class-id="${escapeHTML(id)}"'), 'class preview cards should expose stable class ids');
assert.ok(passiveSource.includes('class="hero-choice-portrait" src="${escapeHTML(def.portrait)}"'), 'class selection should render its dedicated portrait');
const heroVisualCoverage = vm.runInContext(`Object.values(PLAYER_CLASS_DEFS).map(def => ({
  id: def.id,
  portrait: def.portrait,
  strips: [def.strips.idle, def.strips.walk, def.strips.attack],
  walkDirections: def.strips.walkDirections,
}))`, context);
assert.strictEqual(heroVisualCoverage.length, 6, 'the player-facing roster should contain six class visuals');
assert.strictEqual(new Set(heroVisualCoverage.map(hero => hero.portrait)).size, 6, 'every class should use a distinct portrait');
heroVisualCoverage.forEach(hero => {
  assert.ok(fs.existsSync(hero.portrait), `${hero.id} class portrait should exist`);
  assert.strictEqual(new Set(hero.strips).size, 3, `${hero.id} core animation states should use explicit asset keys`);
  assert.deepStrictEqual(Object.keys(hero.walkDirections), ['north', 'east', 'south', 'west'],
    `${hero.id} should expose four cardinal walk strips`);
  ['idle', 'walk', 'attack'].forEach(state => {
    assert.ok(fs.existsSync(`assets/playable/classes/${hero.id}/${state}.webp`), `${hero.id} ${state} strip should exist`);
  });
});
assert.ok(passiveSource.includes("hero7Walk: 'assets/playable/hero7/walk.png'"), 'summoner combat art should no longer reuse the druid');
assert.ok(passiveSource.includes("hero8Walk: 'assets/playable/hero8/walk.png'"), 'guardian combat art should no longer reuse the warrior');
const playableManifest = JSON.parse(fs.readFileSync('assets/playable/manifest.json', 'utf8'));
assert.strictEqual(context.getPlayableHeroAttackDurationScale('hero9'), 1.4, 'elementalist attack poses should remain readable for a 560ms visual cycle');
assert.strictEqual(context.getPlayableHeroAttackDurationScale('hero8'), 1, 'slowing the elementalist must not change other hero attack timing');
const expectedAnimationRoles = {
  hero1: ['walks_forward', 'shifts_their_weight'],
  hero2: ['maintains_a_guarded', 'takes_a_brief_focused'],
  hero3: ['rhythmic_walking', 'gently_raises'],
  hero4: ['walks_forward', 'lunges_forward'],
  hero5: ['armored_warrior_walks', 'warrior_shifts_her_weight'],
  hero6: ['animation', 'lifts_the_crossbow'],
  hero7: ['walks_forward', 'stands_in_place'],
  hero8: ['begins_to_walk', 'shifts_its_weight'],
  hero9: ['holds_the_staff', 'holds_their_staff'],
  hero10: ['walks_forward', 'Attack'],
};
Object.entries(expectedAnimationRoles).forEach(([heroId, roles]) => {
  assert.ok(playableManifest[heroId].walkAnimation.includes(roles[0]), `${heroId} should use its verified walk export`);
  assert.ok(playableManifest[heroId].attackAnimation.includes(roles[1]), `${heroId} should use its verified attack export`);
  assert.strictEqual(playableManifest[heroId].attack.frames, 7, `${heroId} attack should keep seven readable runtime poses`);
});
assert.strictEqual(playableManifest.hero6.walk.frames, 10, 'sniper should use a ping-pong movement cycle instead of looping into its aiming pose');
assert.ok(passiveSource.includes('anchorX: raw.width * anchor.xRatio'), 'playable frames should preserve the source-cell center instead of recentering weapon and spell bounds');
assert.ok(passiveSource.includes('anchorY: anchor.anchorY'), 'expanded motion sheets should keep the idle foot baseline instead of scaling padding into vertical lift');
assert.ok(passiveSource.includes('basisHeight: anchor.basisHeight'), 'expanded motion sheets should keep the idle body scale instead of shrinking oversized cells');
assert.ok(passiveSource.includes("manifest[key] += '?v=20260902-directional-poses2'"), 'updated playable sheets should bypass stale browser image caches');
assert.ok(uiSource.includes('directionalWalks[motionState.moveDirection]'), 'the renderer should choose the walk strip matching the actual grid direction');
assert.ok(uiSource.includes('directionalIdles[facingDirection]'), 'the renderer should preserve the last meaningful direction while waiting or taking damage');
assert.ok(uiSource.includes("['north', 'south'].includes(facingDirection) ? idleFrame : hurtCycle[0]"),
  'north and south hit reactions must not fall back to an unrelated right-facing frame');
assert.ok(combatSource.includes("addBattleFx('playerReturnDepart'")
  && battlefieldSource.includes('drawPlayerReturnDepartureEffect(ctx, departurePosition'),
  'returning must stream light upward before removing the player from the battlefield');
assert.ok(uiSource.includes('motionState.attackActive === true'), 'the player must return to an idle pose as soon as the real attack interval ends');
assert.ok(uiSource.includes('attackMotion && attackFrames.length > 0'), 'native enemy attack frames must take priority over fallback lunge motion');
assert.ok(uiSource.includes('walkCycleDuration = clampNumber(960 / moveRatio'), 'walk animation timing should target a complete cycle instead of treating the cycle duration as one frame');
assert.ok(!uiSource.includes("if (typeof isLocalRuntimeHost !== 'function' || !isLocalRuntimeHost()) return defaultTuning;"), 'playable character scale should remain consistent between local and deployed builds');

console.log('smoke-game-visual-overhaul passed');
