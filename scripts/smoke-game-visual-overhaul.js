const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveFiles = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/growth-items.js', 'data/passives.js', 'data/bosses.js',
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
  const root = PASSIVE_TREE.nodes.n0;
  let overlaps = 0;
  let minimumClearance = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const radiusSum = getPassiveNodeVisualRadius(a) + getPassiveNodeVisualRadius(b);
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      minimumClearance = Math.min(minimumClearance, distance - radiusSum);
      if (distance < radiusSum + 3) overlaps++;
    }
  }
  const starters = nodes.filter(node => node.depth === 1);
  const uniqueStartingStats = new Set(starters.map(node => node.stat));
  const webNodes = nodes.filter(node => Number.isFinite(node.webSpoke) && Number.isFinite(node.webRing));
  const spokeCounts = [...new Set(webNodes.map(node => node.webSpoke))].sort((a, b) => a - b)
    .map(spoke => webNodes.filter(node => node.webSpoke === spoke).length);
  const ringMeans = [...new Set(webNodes.map(node => node.webRing))].sort((a, b) => a - b)
    .map(ring => {
      const row = webNodes.filter(node => node.webRing === ring);
      return row.reduce((sum, node) => sum + Math.hypot(node.x - root.x, node.y - root.y), 0) / row.length;
    });
  const actualMinX = Math.min(...nodes.map(node => node.x));
  const actualMaxX = Math.max(...nodes.map(node => node.x));
  const actualMinY = Math.min(...nodes.map(node => node.y));
  const actualMaxY = Math.max(...nodes.map(node => node.y));
  const rootLinks = PASSIVE_TREE.edges.filter(edge => edge.from === root.id || edge.to === root.id).length;
  return {
    count: nodes.length,
    edgeCount: PASSIVE_TREE.edges.length,
    overlaps,
    minimumClearance,
    webNodeCount: webNodes.length,
    spokeCount: new Set(webNodes.map(node => node.webSpoke)).size,
    spokeCounts,
    ringMeans,
    rootLinks,
    aspectRatio: (actualMaxX - actualMinX) / (actualMaxY - actualMinY),
    rootOffsetRatio: Math.hypot(root.x - (actualMinX + actualMaxX) / 2, root.y - (actualMinY + actualMaxY) / 2) / Math.max(actualMaxX - actualMinX, actualMaxY - actualMinY),
    starterCount: starters.length,
    uniqueStartingStats: uniqueStartingStats.size,
  };
})()`, context);

assert.strictEqual(layout.count, 1101, 'radial rollback should preserve all passive nodes from main');
assert.strictEqual(layout.edgeCount, 1353, 'radial rollback should preserve every passive connection from main');
assert.strictEqual(layout.webNodeCount, 192, 'the central web should retain 16 spokes across 12 rings');
assert.strictEqual(layout.spokeCount, 16, 'the passive tree should radiate through sixteen readable spokes');
assert.ok(layout.spokeCounts.every(count => count === 12), 'every web spoke should reach all twelve rings');
assert.strictEqual(layout.rootLinks, 8, 'the center should expose eight distinct starting routes');
assert.strictEqual(layout.overlaps, 0, 'radial passive nodes should not overlap hit areas');
assert.ok(layout.minimumClearance >= 18, 'passive nodes should retain comfortable visual spacing');
assert.ok(layout.aspectRatio >= 0.9 && layout.aspectRatio <= 1.2, 'the full passive tree should keep a near-circular spiderweb silhouette');
assert.ok(layout.rootOffsetRatio <= 0.08, 'the starting root should remain near the visual center');
assert.strictEqual(layout.uniqueStartingStats, layout.starterCount, 'every root-adjacent starting node should provide a distinct stat');
for (let index = 1; index < layout.ringMeans.length; index++) {
  assert.ok(layout.ringMeans[index] > layout.ringMeans[index - 1], 'each successive web ring should expand away from the center');
}

vm.runInContext(fs.readFileSync('js/canvas-battlefield.js', 'utf8'), context, { filename: 'js/canvas-battlefield.js' });
vm.runInContext(fs.readFileSync('js/canvas-attack-fx.js', 'utf8'), context, { filename: 'js/canvas-attack-fx.js' });
const shortStepWalk = vm.runInContext(`({
  stopped: getPlayerAdvanceAnimationTarget(false, 1, 80),
  combat: getPlayerAdvanceAnimationTarget(true, 1, 80),
  map: getPlayerAdvanceAnimationTarget(true, 0, 80),
  mapSettled: getPlayerAdvanceAnimationTarget(true, 0, 620),
})`, context);
assert.strictEqual(shortStepWalk.stopped, 0, '걷지 않을 때 이동 애니메이션이 켜지면 안 된다');
assert.ok(shortStepWalk.combat > 0, '짧은 전투 칸 이동도 0.26초를 기다리지 않고 걷기 전환을 시작해야 한다');
assert.strictEqual(shortStepWalk.map, 0, '지역 이동의 짧은 안정화 지연은 유지되어야 한다');
assert.strictEqual(shortStepWalk.mapSettled, 1, '계속 이동 중이면 걷기 전환이 완전히 끝나야 한다');
const heroWalkMotion = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  let ids = Array.from({ length: 10 }, (_, index) => 'hero' + (index + 1));
  return {
    stopped: getPlayableHeroWalkMotion('hero5', 100, 800, 0),
    moving: ids.map(id => getPlayableHeroWalkMotion(id, 100, 800, 1))
  };
})())`, context));
assert.deepStrictEqual(heroWalkMotion.stopped, { x: 0, y: 0 }, '정지한 캐릭터에는 보행 흔들림을 적용하면 안 된다');
heroWalkMotion.moving.forEach((motion, index) => {
  assert.ok(Math.abs(motion.x) + Math.abs(motion.y) >= 1,
    `hero${index + 1}은 걷기 스트립이 미묘해도 식별 가능한 보행 변위가 있어야 한다`);
});
assert.ok(Math.abs(heroWalkMotion.moving[4].y) > Math.abs(heroWalkMotion.moving[0].y),
  '성기사 같은 중장 캐릭터는 가벼운 캐릭터보다 보폭이 분명해야 한다');
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
assert.ok(fs.existsSync('assets/ui/passive-node-major-v1.png'), 'generated major passive frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-void-v1.png'), 'generated void socket frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-star-wedge-v1.png'), 'generated star-wedge socket frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-path-v1.png'), 'generated path node frame should exist');
const passiveNodeV2Assets = ['major', 'void', 'star-wedge', 'path']
  .flatMap(type => ['active', 'inactive'].map(state => `assets/ui/passive-node-${type}-v2-${state}.png`));
passiveNodeV2Assets.forEach(file => {
  const png = fs.readFileSync(file);
  assert.strictEqual(png.readUInt32BE(16), 512, `${file} should retain its intended width`);
  assert.strictEqual(png.readUInt32BE(20), 512, `${file} should retain its intended height`);
  assert.strictEqual(png[25], 6, `${file} should retain an RGBA transparency channel`);
});
assert.ok(fs.existsSync('assets/ui/window-frame-luxe-v1.png'), 'generated window frame should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-ring-v1.png'), 'generated boss ring telegraph should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-fan-v1.png'), 'generated boss fan telegraph should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-pulse-v1.png'), 'generated boss pulse telegraph should exist');
[
  'skill-whirlwind-v1.png', 'skill-chain-primary-v1.png', 'skill-chain-jump-v1.png',
  'skill-slam-primary-v1.png', 'skill-slam-aftershock-v1.png', 'skill-slash-v1.png',
  'skill-projectile-v1.png', 'skill-venom-fang-v2.png', 'skill-frost-field-v1.png', 'skill-frost-wave-v1.png',
  'skill-chaos-boomerang-v1.png', 'skill-burst-v1.png', 'skill-dot-field-v1.png',
  'skill-summon-strike-v1.png',
].forEach(file => assert.ok(fs.existsSync(`assets/effects/${file}`), `generated skill VFX ${file} should exist`));
const skillVfxCoverage = vm.runInContext(`(() => {
  const gems = Object.keys(SKILL_DB).filter(name => SKILL_DB[name] && SKILL_DB[name].isGem);
  const specs = gems.map(name => JSON.stringify(getSkillGemSigilSpec(name)));
  return {
    count: gems.length,
    missing: gems.filter(name => !SKILL_GEM_VFX_PROFILES[name]),
    missingSigil: gems.filter(name => !getSkillGemSigilSpec(name)),
    uniqueSigils: new Set(specs).size,
  };
})()`, context);
assert.ok(skillVfxCoverage.count >= 41, 'the active skill-gem roster should remain fully represented');
assert.deepStrictEqual(Array.from(skillVfxCoverage.missing), [], 'every active skill gem should have an explicit image VFX profile');
assert.deepStrictEqual(Array.from(skillVfxCoverage.missingSigil), [], 'every active skill gem should have a visible procedural sigil');
assert.strictEqual(skillVfxCoverage.uniqueSigils, skillVfxCoverage.count, 'active skill gems should not share the same combat sigil');
const sigilDrawCounts = vm.runInContext(`(() => {
  function makeCtx() {
    return { globalAlpha: 1, strokes: 0, fills: 0, save() {}, restore() {}, rotate() {}, beginPath() {},
      arc() {}, moveTo() {}, lineTo() {}, stroke() { this.strokes++; }, fill() { this.fills++; } };
  }
  const slash = makeCtx();
  const slam = makeCtx();
  const venom = makeCtx();
  const lightning = makeCtx();
  const fire = makeCtx();
  const cold = makeCtx();
  drawSkillGemSigil(slash, '연속 베기', 80, 0.5, 'phys');
  drawSkillGemSigil(slam, '묵직한 강타', 80, 0.5, 'phys');
  drawSkillGemSigil(venom, '독니 사출', 80, 0.5, 'chaos');
  drawSkillGemSigil(lightning, '번개 타격', 80, 0.5, 'light');
  drawSkillGemSigil(fire, '화염 참격', 80, 0.5, 'fire');
  drawSkillGemSigil(cold, '서리 파동', 80, 0.5, 'cold');
  return { slash: [slash.strokes, slash.fills], slam: [slam.strokes, slam.fills], venom: [venom.strokes, venom.fills], lightning: [lightning.strokes, lightning.fills], fire: [fire.strokes, fire.fills], cold: [cold.strokes, cold.fills] };
})()`, context);
assert.notDeepStrictEqual(Array.from(sigilDrawCounts.slash), Array.from(sigilDrawCounts.slam), 'different gems should render different sigil geometry');
assert.deepStrictEqual(Array.from(sigilDrawCounts.venom), [0, 0], 'venom fang should not add a procedural rune over its dedicated projectile image');
assert.deepStrictEqual(Array.from(sigilDrawCounts.lightning), [0, 0], 'lightning hits should not add a circular procedural sigil');
assert.deepStrictEqual(Array.from(sigilDrawCounts.fire), [0, 0], 'fire hits should not add the shared circular procedural sigil');
assert.deepStrictEqual(Array.from(sigilDrawCounts.cold), [0, 0], 'cold hits should not add the shared circular procedural sigil');
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
assert.ok(passiveSource.includes("skillFxWhirlwind: 'assets/effects/skill-whirlwind-v1.png'"), 'battle asset loader should preload skill VFX images');
assert.ok(passiveSource.includes("skillFxFrostField: 'assets/effects/skill-frost-field-v1.png'"), 'battle asset loader should preload specialized combat pattern images');
assert.ok(passiveSource.includes("skillFxBlizzardAmbient: 'assets/effects/skill-bludgeoning-blizzard-ambient-sheet-v1.png'"), 'battle asset loader should preload the blizzard ambient sprite sheet');
assert.ok(passiveSource.includes("skillFxBlizzardImpact: 'assets/effects/skill-bludgeoning-blizzard-impact-sheet-v1.png'"), 'battle asset loader should preload the blizzard impact sprite sheet');
assert.ok(passiveSource.includes("skillFxVenomFang: 'assets/effects/skill-venom-fang-v2.png'"), 'battle asset loader should preload the supplied sharp venom projectile image');
['ambient', 'impact'].forEach(kind => {
  const bytes = fs.readFileSync(`assets/effects/skill-bludgeoning-blizzard-${kind}-sheet-v1.png`);
  assert.deepStrictEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1024, 1024],
    `blizzard ${kind} sheet should retain its 4x4 frame grid`);
  assert.strictEqual(bytes.readUInt8(25), 6, `blizzard ${kind} sheet should retain RGBA transparency`);
});
const venomVfxBytes = fs.readFileSync('assets/effects/skill-venom-fang-v2.png');
assert.deepStrictEqual([venomVfxBytes.readUInt32BE(16), venomVfxBytes.readUInt32BE(20)], [512, 160],
  'the supplied venom projectile must keep its optimized combat dimensions');
assert.strictEqual(venomVfxBytes.readUInt8(25), 6, 'the supplied venom projectile must retain RGBA transparency');
assert.ok(passiveSource.includes("key.startsWith('skillFx')"), 'transparent skill VFX should bypass sprite-sheet sanitization');
assert.ok(passiveSource.includes("woodEnemySlimes: 'assets/enemies/wood/wood-slimes.png'"), 'battle asset loader should preload the replacement wood monster roster');
assert.ok(passiveSource.includes("key.startsWith('woodEnemy')"), 'transparent wood monster sheets should bypass legacy backdrop sanitization');
assert.ok(passiveSource.includes('normal: woodEnemyVariants.length ? woodEnemyVariants.slice()'), 'normal monster variants should use the supplied wood roster');
assert.ok(passiveSource.includes('boss: ['), 'boss variants should retain the dedicated legacy and act-boss pool');
assert.ok(passiveSource.includes("const frameKey = getPassiveNodeFrameKey(node)"), 'passive nodes should select their dedicated frame assets');
assert.ok(passiveSource.includes("'major:active': 'assets/ui/passive-node-major-v2-active.png'"), 'learned major nodes should use the active frame art');
assert.ok(passiveSource.includes("'major:inactive': 'assets/ui/passive-node-major-v2-inactive.png'"), 'unlearned major nodes should use the inactive frame art');
assert.ok(passiveSource.includes('getPassiveNodeFrameAssetKey(frameKey, active)'), 'passive rendering should select frame art from the learned state');
assert.ok(!passiveSource.includes('if (!lightweightMode && useMajorFrame'), 'drag optimization should not hide passive frame images');
const windowCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const luxeCss = fs.readFileSync('css/ui-luxe.css', 'utf8');
assert.ok(!windowCss.includes('border-image-source:'), 'regular windows should avoid a visually noisy full-image frame');
assert.ok(windowCss.includes('> .ui-window-resize'), 'window resize handle should retain an explicit absolute layer');
assert.ok(windowCss.includes('border: 1px solid rgba(111, 151, 188, .58);'), 'regular windows should use a restrained one-pixel frame');
assert.ok(!windowCss.includes('.tab-content.ui-window::after'), 'window frame should not float over text as a pseudo-element');
assert.ok(windowCss.includes('padding: clamp(12px, 1.15vw, 18px);'), 'window content should retain a compact text-safe inset inside the real border');
assert.ok(windowCss.includes('clip-path: none;'), 'combat health panels should use clean rectangular silhouettes');
assert.ok(windowCss.includes('align-items: center;'), 'health text should remain vertically centered when monster traits are shown');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert.ok(indexSource.includes('<body class="startup-active">'), 'the game body must begin in its startup state before any gameplay UI can paint');
assert.ok(indexSource.includes('id="startup-overlay" class="startup-overlay active"'), 'the startup screen must be visible in the initial HTML paint');
assert.ok(indexSource.includes('<title>Rignin</title>'), 'the browser tab should use the Rignin game title');
assert.ok(indexSource.includes('<span class="startup-wordmark-accent">Rignin</span>'), 'the startup wordmark should use the Rignin game title');
assert.ok(indexSource.includes('body.startup-active #left-pane') && indexSource.includes('body.startup-active #right-pane'), 'startup paint must hide legacy gameplay panes instead of briefly showing them behind the title screen');
assert.ok(indexSource.includes('<html lang="ko" class="app-preload">'), 'the document must begin behind the critical preload curtain');
assert.ok(indexSource.includes('html.app-preload body > :not(#startup-overlay)') && indexSource.includes("classList.remove('app-preload')"), 'the preload curtain must hide unstyled gameplay and release after the styled load frame');
assert.ok(indexSource.includes('id="tutorial-dismiss-btn"'), 'tutorial notice should expose a single acknowledgement action');
assert.ok(!indexSource.includes('id="tutorial-progress-fill"'), 'tutorial notice should not use multi-step progress');
assert.ok(!indexSource.includes('id="tutorial-visual"'), 'tutorial notice should keep the actual game screen visible');
assert.ok(!passiveSource.includes('activeTutorial.steps = getTutorialGuide(activeTutorial)'), 'tutorial notices should not expand into illustrated multi-step lessons');
assert.ok(windowCss.includes('#tutorial-overlay.active'), 'tutorial notice should use a compact live-screen presentation');
const enemyUiSource = fs.readFileSync('js/ui.js', 'utf8');
assert.ok(enemyUiSource.includes("outlineColor: enemy.isBoss ? '#a84e49' : (enemy.isElite ? '#e2b94f' : null)"), 'elite and boss monsters should have restrained yellow and red outlines');
assert.ok(enemyUiSource.includes('let animationFrames = Array.isArray(variantEntry.frames)'), 'wood monster variants should animate instead of rendering a whole sheet or a frozen cell');
const battlefieldSource = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
assert.ok(battlefieldSource.includes("caption = '지역 탐색 중';"), 'empty encounter intervals should use the concise exploration caption');
assert.ok(luxeCss.includes('top: 12px;') && luxeCss.includes('left: 14px;') && luxeCss.includes('bottom: auto;'), 'the battlefield caption should stay in the upper-left safe area instead of covering player effects');
assert.ok(battlefieldSource.includes('playerPos.y - 82'), 'the player overhead health bar should clear tall character sprites and head ornaments');
assert.ok(battlefieldSource.includes('enemy.isBoss ? 78 : 56'), 'enemy overhead health bars should clear normal and boss sprites');
assert.ok(!battlefieldSource.includes('let flashFx = (battleFx || []).find'), 'battlefield rendering should not flash the full screen on impact');
assert.ok(battlefieldSource.includes('let rings = 1;'), 'annihilating hits should keep a single lightweight impact ring');
assert.ok(battlefieldSource.includes('for (let ring = 0; ring < 1; ring++)'), 'level-up feedback should use a single lightweight ring');
assert.ok(!battlefieldSource.includes('for (let ray = 0; ray < 4; ray++)'), 'level-up feedback should avoid a separate ray burst');
assert.ok(!battlefieldSource.includes('let glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 92'), 'one-shot feedback should avoid its previous large radial fill');
assert.ok(battlefieldSource.includes("const dissolveFade = Math.pow(1 - dissolve, 1.62);"), 'enemy death sprites should fade through a restrained dissolve curve');
assert.ok(battlefieldSource.includes('ctx.translate(enemy.x, enemy.y + dissolve *'), 'enemy deaths should settle in place rather than floating upward');
assert.ok(!battlefieldSource.includes('ctx.translate(enemy.x, enemy.y - t *'), 'enemy deaths should not use the previous upward exit motion');
assert.ok(!battlefieldSource.includes('drawBossTelegraphDecal'), 'boss telegraphs should not use the coarse generated decal assets');
assert.ok(battlefieldSource.includes('function queueSkillGemVfx('), 'resolved skill hits should enqueue generated image effects');
assert.ok(battlefieldSource.includes('drawSkillGemVfxLayer(ctx, now);'), 'skill VFX should render through the battlefield effect layer');
assert.ok(battlefieldSource.indexOf('drawSkillGemVfxLayer(ctx, now);') > battlefieldSource.indexOf('drawEnemySprite(ctx, enemy, entry.x'), 'translucent skill VFX should remain visible over monster sprites');
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
  getCombatTravelImageKey({ patternKind: 'field' }),
  getCombatTravelImageKey({ patternKind: 'moving' }),
  getCombatTravelImageKey({ patternKind: 'boomerang' }),
  getCombatTravelImageKey({ patternKind: 'boomerang', skillName: '독니 사출', element: 'chaos' }),
  getCombatTravelImageKey({ patternKind: 'field', element: 'fire' }),
  getCombatTravelImageKey({ owner: 'enemy', delivery: 'magicCell' })
]`, context);
assert.deepStrictEqual(Array.from(combatPatternImages), [
  'skillFxFrostField', 'skillFxFrostWave', 'skillFxChaosBoomerang', 'skillFxVenomFang', 'skillFxDotField', 'bossTelegraphPulse'
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
const optimizedAreaVfx = vm.runInContext(`(() => {
  const counts = { meteorImages: 0, meteorPaths: 0, meteorArcs: 0, blizzardImages: 0, blizzardPaths: 0, rainLines: 0, blizzardBounds: 0 };
  battleAssets.images.skillFxMeteorProjectile = { complete: true, naturalWidth: 448 };
  battleAssets.images.skillFxMeteorImpact = { complete: true, naturalWidth: 384 };
  battleAssets.images.skillFxMeteorGround = { complete: true, naturalWidth: 448 };
  battleAssets.images.skillFxBlizzardAmbient = { complete: true, naturalWidth: 1024, naturalHeight: 1024 };
  battleAssets.images.skillFxBlizzardImpact = { complete: true, naturalWidth: 1024, naturalHeight: 1024 };
  const ctx = {
    save() {}, restore() {}, translate() {}, rotate() {}, beginPath() { counts.meteorPaths++; }, stroke() {}, fill() {}, moveTo() {}, closePath() {},
    arc() { counts.meteorArcs++; }, bezierCurveTo() {},
    lineTo() { counts.rainLines++; }, strokeRect() { counts.blizzardBounds++; },
    drawImage() { counts.meteorImages++; }
  };
  const targets = [{ x: 120, y: 160 }, { x: 260, y: 240 }];
  drawCombatCellFx(ctx, {
    start: 1000, duration: 2800, patternKind: 'meteor', skillName: '유성 낙화'
  }, 1230, 1460, targets, 'skillFxSlamPrimary', 'fire');
  const meteorDescentImages = counts.meteorImages;
  drawCombatCellFx(ctx, {
    start: 1000, duration: 2800, patternKind: 'meteor', skillName: '유성 낙화'
  }, 1540, 1460, targets, 'skillFxSlamPrimary', 'fire');
  const meteorImpactImages = counts.meteorImages - meteorDescentImages;
  const meteorArcs = counts.meteorArcs;
  const meteorLines = counts.rainLines;
  const beforeBlizzardImages = counts.meteorImages;
  const beforeBlizzardPaths = counts.meteorPaths;
  drawCombatCellFx(ctx, {
    id: 9, start: 1000, duration: 1400, patternKind: 'field', skillName: '난타 눈보라'
  }, 1510, 1460, targets, 'skillFxFrostField', 'cold');
  counts.blizzardImages = counts.meteorImages - beforeBlizzardImages;
  counts.blizzardPaths = counts.meteorPaths - beforeBlizzardPaths;
  battleVisualState.skillEffects = [];
  queueSkillGemVfx({ id: 700, skillName: '난타 눈보라', stageKind: 'fieldTick', element: 'cold' },
    targets[0], { x: 20, y: 220 }, {}, 1230, 1);
  return { ...counts, rainLines: counts.rainLines - meteorLines,
    meteorDescentImages, meteorImpactImages, meteorArcs,
    impactEffectCount: battleVisualState.skillEffects.length };
})()`, context);
assert.strictEqual(optimizedAreaVfx.meteorDescentImages, 1, '유성 낙화는 낙하 전용 이미지를 한 장만 그려야 한다');
assert.strictEqual(optimizedAreaVfx.meteorImpactImages, 2, '충돌 뒤에는 충돌 이미지와 불길 지대만 한 장씩 그려야 한다');
assert.strictEqual(optimizedAreaVfx.meteorArcs, 0, '유성 충돌에 원형 파동을 다시 그리면 안 된다');
assert.strictEqual(optimizedAreaVfx.blizzardImages, 2, '난타 눈보라는 한 프레임에 필드와 타격 스프라이트 한 장씩만 그려야 한다');
assert.strictEqual(optimizedAreaVfx.blizzardPaths, 0, '스프라이트가 준비되면 눈보라 도형을 매 프레임 다시 만들면 안 된다');
assert.strictEqual(optimizedAreaVfx.rainLines, 0, '난타 눈보라를 아래로 떨어지는 빗줄기로 표현하면 안 된다');
assert.strictEqual(optimizedAreaVfx.blizzardBounds, 0, '난타 눈보라에 네모난 범위 상자를 그리면 안 된다');
assert.strictEqual(optimizedAreaVfx.impactEffectCount, 0, '눈보라 매 타격마다 중복 폭발 이미지를 추가하면 안 된다');
const aggregatedBurstVfx = vm.runInContext(`(() => {
  let images = 0;
  let arcs = 0;
  let lines = 0;
  let flames = 0;
  battleAssets.images.skillFxBurst = { complete: true, naturalWidth: 64 };
  const ctx = {
    save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, stroke() {}, fill() {},
    moveTo() {}, lineTo() { lines++; }, bezierCurveTo() { flames++; }, closePath() {},
    arc() { arcs++; }, drawImage() { images++; }
  };
  const targets = Array.from({ length: 8 }, (_, index) => ({ x: 100 + index * 24, y: 180 + (index % 2) * 30 }));
  ['서리 폭발', '삼원 파동'].forEach((skillName, index) => {
    drawCombatCellFx(ctx, {
      start: 1000, duration: 720, delivery: 'magicCell', patternKind: null, skillName
    }, 1230, 1460, targets, 'skillFxBurst', index ? 'fire' : 'cold');
  });
  battleVisualState.skillEffects = [];
  targets.forEach((target, index) => {
    queueSkillGemVfx({ id: 800 + index, skillName: '서리 폭발', element: 'cold' }, target, { x: 20, y: 220 }, {}, 1230, 1);
    queueSkillGemVfx({ id: 900 + index, skillName: '삼원 파동', element: 'fire' }, target, { x: 20, y: 220 }, {}, 1230, 1);
  });
  return {
    images, arcs, lines, flames,
    impactEffectCount: battleVisualState.skillEffects.length,
    frostParticles: getAttackFxSpawnOpts({ skillName: '서리 폭발' }, {}, {}, 1),
    triParticles: getAttackFxSpawnOpts({ skillName: '삼원 파동' }, {}, {}, 1)
  };
})()`, context);
assert.strictEqual(aggregatedBurstVfx.images, 0, '화염과 냉기 범위 타격은 같은 공용 원형 이미지를 색만 바꿔 쓰면 안 된다');
assert.strictEqual(aggregatedBurstVfx.arcs, 0, '화염과 냉기 범위 타격은 원형 또는 호를 그리면 안 된다');
assert.ok(aggregatedBurstVfx.lines > 0 && aggregatedBurstVfx.flames > 0, '냉기는 각진 결정선, 화염은 불꽃 곡선으로 구분되어야 한다');
assert.ok(aggregatedBurstVfx.lines <= 8 && aggregatedBurstVfx.flames <= 8, '합성 범위 타격은 대상마다 같은 이펙트를 중복 그리면 안 된다');
assert.strictEqual(aggregatedBurstVfx.impactEffectCount, 0, '범위 폭발은 각 대상마다 별도 적중 이미지를 할당하면 안 된다');
assert.strictEqual(aggregatedBurstVfx.frostParticles, null, '서리 폭발은 대상별 보조 입자를 중복 생성하면 안 된다');
assert.strictEqual(aggregatedBurstVfx.triParticles, null, '삼원 파동은 대상별 보조 입자를 중복 생성하면 안 된다');
const boundedCrowdedSkillVfx = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const targets = Array.from({ length: 8 }, (_, index) => ({
    x: 120 + index * 24, y: 180 + (index % 2) * 32, enemy: { id: index + 1 }
  }));
  battleFx = targets.map((target, index) => ({
    id: 1200 + index, type: 'hit', skillName: '연속 베기', stageKind: 'primary',
    damageTextGroupId: 'crowded:1', enemyId: target.enemy.id, element: 'phys'
  }));
  targets.forEach((target, index) => queueSkillGemVfx(battleFx[index], target, { x: 20, y: 220 }, {}, 1230, 1));
  return {
    impactEffectCount: battleVisualState.skillEffects.length,
    skillParticles: getAttackFxSpawnOpts({ skillName: '기본 공격', element: 'phys' }, targets[0].enemy, {}, 1),
    fallbackParticles: getAttackFxSpawnOpts({ element: 'phys' }, targets[0].enemy, {}, 1)
  };
})()`, context);
assert.strictEqual(boundedCrowdedSkillVfx.impactEffectCount, 1,
  '같은 공격 단계가 다섯 대상을 넘겨도 전용 적중 이미지는 한 번만 생성해야 한다');
assert.strictEqual(boundedCrowdedSkillVfx.skillParticles, null,
  '스킬 전용 적중 이미지 위에 별도 입자 엔진을 중복 실행하면 안 된다');
assert.ok(boundedCrowdedSkillVfx.fallbackParticles,
  '전용 스킬 프로필이 없는 독립 적중은 입자 피드백을 유지해야 한다');
assert.strictEqual(context.SKILL_GEM_VFX_PROFILES['중력 붕괴'].aggregateImpact, true,
  '중력 붕괴의 범위 적중은 대상별 이미지가 아니라 공유 범위 이미지여야 한다');
const optimizedLightningSpearVfx = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const target = { x: 250, y: 210, enemy: { id: 'lightning-target' } };
  queueSkillGemVfx({ id: 950, skillName: '번개 창', element: 'light' }, target, { x: 20, y: 220 }, {}, 1230, 1);
  return {
    impactEffectCount: battleVisualState.skillEffects.length,
    particleOptions: getAttackFxSpawnOpts({ skillName: '번개 창', element: 'light', pierce: true }, target.enemy, { variant: 'projectile' }, 1)
  };
})()`, context);
assert.strictEqual(optimizedLightningSpearVfx.impactEffectCount, 0, '번개창은 관통 대상마다 별도 적중 문양을 중복 생성하면 안 된다');
assert.strictEqual(optimizedLightningSpearVfx.particleOptions, null, '번개창 반복 적중은 대상별 보조 입자를 생성하면 안 된다');
const boundedThundercloudVfx = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const ctxCalls = { arcs: 0, strokes: 0, lines: 0 };
  const player = { x: 20, y: 220 };
  for (let index = 0; index < 20; index++) {
    const enemyId = index % 7;
    const target = { x: 170 + enemyId * 22, y: 180 + (enemyId % 2) * 35, enemy: { id: enemyId } };
    queueSkillGemVfx({ id: 1000 + index, skillName: '뇌운 낙뢰', element: 'light' }, target, player, {}, 1230 + index * 12, 1);
  }
  const ctx = {
    globalAlpha: 0.72, translate() {}, beginPath() {}, moveTo() {}, save() {}, restore() {},
    lineTo() { ctxCalls.lines++; }, stroke() { ctxCalls.strokes++; }, arc() { ctxCalls.arcs++; }
  };
  const beforeStormCell = ctxCalls.arcs + ctxCalls.strokes + ctxCalls.lines;
  drawCombatCellFx(ctx, {
    start: 1000, duration: 720, delivery: 'magicCell', patternKind: null, skillName: '뇌운 낙뢰'
  }, 1230, 1460, [{ x: 220, y: 180 }], 'skillFxBurst', 'light');
  const stormCellDrawCount = ctxCalls.arcs + ctxCalls.strokes + ctxCalls.lines - beforeStormCell;
  drawProceduralSkillImpact(ctx, battleVisualState.skillEffects[0], 0.5);
  const boltArcCount = ctxCalls.arcs;
  const boltStrokeCount = ctxCalls.strokes;
  const boltLineCount = ctxCalls.lines;
  drawDamageImpactAccent(ctx, { skillName: '뇌운 낙뢰', enemyId: 1, impactTier: 'heavy' }, 0.5, { 1: { x: 220, y: 180 } });
  const thundercloudArcCount = ctxCalls.arcs - boltArcCount;
  drawDamageImpactAccent(ctx, { skillName: '번개 타격', element: 'light', enemyId: 1, impactTier: 'heavy' }, 0.5, { 1: { x: 220, y: 180 } });
  const genericLightningArcCount = ctxCalls.arcs - boltArcCount - thundercloudArcCount;
  drawDamageImpactAccent(ctx, { skillName: '묵직한 강타', element: 'phys', enemyId: 1, impactTier: 'heavy' }, 0.5, { 1: { x: 220, y: 180 } });
  return {
    activeEffects: battleVisualState.skillEffects.length,
    particleOptions: getAttackFxSpawnOpts({ skillName: '뇌운 낙뢰', element: 'light' }, { id: 1 }, {}, 1),
    boltArcCount,
    boltStrokeCount,
    boltLineCount,
    stormCellDrawCount,
    thundercloudArcCount,
    genericLightningArcCount,
    ordinaryHeavyArcCount: ctxCalls.arcs - boltArcCount - thundercloudArcCount - genericLightningArcCount,
    ...ctxCalls
  };
})()`, context);
assert.ok(boundedThundercloudVfx.activeEffects <= 4, '뇌운 낙뢰는 빠른 연속 사용 중에도 활성 낙뢰를 네 개 넘게 쌓으면 안 된다');
assert.strictEqual(boundedThundercloudVfx.particleOptions, null, '뇌운 낙뢰는 대상마다 별도 보조 입자를 생성하면 안 된다');
assert.strictEqual(boundedThundercloudVfx.stormCellDrawCount, 0, '뇌운 낙뢰는 전용 낙뢰 전에 공용 도착 버스트를 그리면 안 된다');
assert.strictEqual(boundedThundercloudVfx.boltArcCount, 0, '뇌운 낙뢰 자체 이펙트는 원형 적중선을 그리면 안 된다');
assert.strictEqual(boundedThundercloudVfx.thundercloudArcCount, 0, '뇌운 낙뢰는 강한 타격 공통 원형 충격파도 그리면 안 된다');
assert.strictEqual(boundedThundercloudVfx.genericLightningArcCount, 0, '일반 번개 강타도 공통 원형 충격파를 그리면 안 된다');
assert.ok(boundedThundercloudVfx.ordinaryHeavyArcCount > 0, '다른 강한 타격의 공통 충격파까지 제거하면 안 된다');
assert.ok(boundedThundercloudVfx.boltStrokeCount <= 2 && boundedThundercloudVfx.boltLineCount <= 7, '뇌운 낙뢰 한 개의 그리기 명령 수는 작게 유지되어야 한다');
const compactFireCoreVfx = vm.runInContext(`(() => {
  const counts = { arcs: 0, maxRadius: 0, flames: 0, strokes: 0 };
  const ctx = {
    save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, moveTo() {}, closePath() {}, fill() {},
    arc(x, y, radius) { counts.arcs++; counts.maxRadius = Math.max(counts.maxRadius, radius); },
    bezierCurveTo() { counts.flames++; }, stroke() { counts.strokes++; }
  };
  const targets = [{ x: 120, y: 160 }, { x: 320, y: 280 }];
  drawCombatCellFx(ctx, {
    start: 1000, duration: 900, patternKind: 'field', skillName: '화염 폭풍핵'
  }, 1230, 1460, targets, 'skillFxDotField', 'fire');
  battleVisualState.skillEffects = [];
  queueSkillGemVfx({ id: 701, skillName: '화염 폭풍핵', stageKind: 'fieldTick', element: 'fire' },
    targets[0], { x: 20, y: 220 }, {}, 1230, 1);
  return { ...counts, impactEffectCount: battleVisualState.skillEffects.length };
})()`, context);
assert.strictEqual(compactFireCoreVfx.arcs, 1, '화염 폭풍핵은 작은 중심 핵 하나만 그려야 한다');
assert.ok(compactFireCoreVfx.maxRadius <= 12, '화염 폭풍핵 중심광이 전장 범위만큼 커지면 안 된다');
assert.strictEqual(compactFireCoreVfx.flames, 12, '화염 폭풍핵은 중심 주위의 작은 불꽃 조각으로 회전감을 표현해야 한다');
assert.strictEqual(compactFireCoreVfx.strokes, 0, '화염 폭풍핵에 눈부신 원형 선을 그리면 안 된다');
assert.strictEqual(compactFireCoreVfx.impactEffectCount, 0, '화염 폭풍핵 매 타격마다 큰 핵 이펙트를 중복 생성하면 안 된다');
assert.ok(battlefieldSource.includes('bodyCue: true') && battlefieldSource.includes('bodyCue: bodyCue'),
  '플레이어와 적의 회피 피드백은 피해 숫자가 아닌 본체 주변 cue로 연결되어야 한다');
const stagedSkillVfx = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const player = { x: 100, y: 220 };
  const target = { x: 250, y: 210, enemy: { id: 'b' } };
  const map = { a: { x: 190, y: 205, enemy: { id: 'a' } }, b: target };
  queueSkillGemVfx({ id: 1, skillName: '회오리바람', stageKind: 'whirlPrimary', element: 'phys' }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 2, skillName: '연쇄 폭풍', stageKind: 'chainJump', chainFromEnemyId: 'a', element: 'light' }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 3, skillName: '지진 파쇄', stageKind: 'slamAftershock', element: 'phys' }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 4, skillName: '서리늑대 소환', stageKind: 'primary', element: 'cold', summon: true }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 5, skillName: '번개 타격', stageKind: 'chainPrimary', element: 'light' }, target, player, map, 1000, 1);
  const imageKeys = battleVisualState.skillEffects.map(effect => effect.imageKey);
  for (let id = 10; id < 140; id++) {
    queueSkillGemVfx({ id, skillName: '기본 공격', stageKind: 'primary', element: 'phys' }, target, player, map, 1000, 1);
  }
  return { imageKeys, count: battleVisualState.skillEffects.length };
})()`, context);
assert.ok(stagedSkillVfx.imageKeys.includes('skillFxWhirlwind'), 'whirlwind stages should use the rotating image asset');
assert.ok(stagedSkillVfx.imageKeys.includes('skillFxChainJump'), 'chain jumps should use the connector image asset');
assert.ok(stagedSkillVfx.imageKeys.includes('skillFxSlamAftershock'), 'slam aftershocks should use the delayed fracture image asset');
assert.ok(stagedSkillVfx.imageKeys.includes('skillFxSummonStrike'), 'summon attacks should use the spectral strike image asset');
assert.ok(stagedSkillVfx.imageKeys.includes('skillFxSlash'), 'lightning strike primary should use a lightning-tinted melee slash');
assert.ok(stagedSkillVfx.count <= 56, 'skill image effect queue should stay bounded during rapid attacks');
const aggregateSlamVfxCount = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const player = { x: 100, y: 220 };
  const first = { x: 220, y: 210, enemy: { id: 'a' } };
  const second = { x: 280, y: 210, enemy: { id: 'b' } };
  queueSkillGemVfx({ id: 150, skillName: '지진 파쇄', stageKind: 'slamAftershock', element: 'phys', damageTextGroupId: 'quake:1' }, first, player, {}, 1000, 1);
  queueSkillGemVfx({ id: 151, skillName: '지진 파쇄', stageKind: 'slamAftershock', element: 'phys', damageTextGroupId: 'quake:1' }, second, player, {}, 1000, 1);
  return battleVisualState.skillEffects.length;
})()`, context);
assert.strictEqual(aggregateSlamVfxCount, 1,
  'an earthquake stage must render one shared fracture instead of one full effect per target');
const travellingProjectile = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const swing = { id: 200, projectile: true, skillName: '얼음 창', element: 'cold', start: 1000, duration: 400, impactAt: 1400 };
  queueSkillGemProjectileLaunch(swing, [{ enemy: { id: 'b' } }], { x: 100, y: 220 }, { b: { x: 250, y: 210, enemy: { id: 'b' } } }, 1);
  return battleVisualState.skillEffects[0];
})()`, context);
assert.ok(travellingProjectile && travellingProjectile.travel, 'projectile image should own a real travel phase');
assert.strictEqual(travellingProjectile.arriveAt, 1400, 'projectile arrival should match the delayed damage frame');
assert.ok(travellingProjectile.fromX < travellingProjectile.toX, 'projectile should move from the player toward the target');
const fanProjectiles = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const swing = { id: 201, projectile: true, skillName: '연발 사격', element: 'phys', start: 1000, duration: 400, impactAt: 1400 };
  const entries = [{ enemy: { id: 'a' } }, { enemy: { id: 'b' } }, { enemy: { id: 'c' } }];
  const map = { a: { x: 250, y: 210 }, b: { x: 210, y: 150 }, c: { x: 215, y: 275 } };
  queueSkillGemProjectileLaunch(swing, entries, { x: 100, y: 220 }, map, 1);
  return battleVisualState.skillEffects.map(effect => ({ toX: effect.toX, toY: effect.toY }));
})()`, context);
assert.strictEqual(fanProjectiles.length, 3, '산탄은 선택된 방향마다 실제 투사체 하나를 생성해야 한다');
assert.strictEqual(new Set(fanProjectiles.map(effect => `${effect.toX},${effect.toY}`)).size, 3, '산탄 투사체는 서로 다른 방향으로 날아가야 한다');
const breathQueue = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const player = { x: 100, y: 220 };
  const first = { x: 250, y: 210, enemy: { id: 'a' } };
  const second = { x: 230, y: 260, enemy: { id: 'b' } };
  queueSkillGemVfx({ id: 301, skillName: '용화 숨결', stageKind: 'channelTick', element: 'fire' }, first, player, {}, 1000, 1);
  queueSkillGemVfx({ id: 302, skillName: '용화 숨결', stageKind: 'channelTick', element: 'fire' }, second, player, {}, 1000, 1);
  return battleVisualState.skillEffects;
})()`, context);
assert.strictEqual(breathQueue.length, 1, '한 채널 타격의 다중 대상은 화염 호흡을 중복 생성하면 안 된다');
assert.strictEqual(breathQueue[0].duration, 380, '화염 호흡은 다음 채널 타격까지 자연스럽게 이어져야 한다');
assert.ok(breathQueue[0].fromX > 100 && breathQueue[0].fromY < 220, '화염 호흡은 캐릭터 중심이 아니라 얼굴 앞에서 시작해야 한다');
const breathDrawing = vm.runInContext(`(() => {
  const calls = { bezier: 0, arcs: 0, fills: 0, lines: 0, rects: 0 };
  const ctx = {
    globalAlpha: 0.7, translate() {}, rotate() {}, beginPath() {}, moveTo() {}, closePath() {},
    bezierCurveTo() { calls.bezier++; }, arc() { calls.arcs++; }, fill() { calls.fills++; },
    lineTo() { calls.lines++; }, fillRect() { calls.rects++; }
  };
  const handled = drawProceduralSkillImpact(ctx, {
    family: 'breath', element: 'fire', seed: 33, size: 82,
    fromX: 100, fromY: 200, toX: 260, toY: 220
  }, 0.5);
  return { ...calls, handled };
})()`, context);
assert.strictEqual(breathDrawing.handled, true, '용화 숨결은 전용 절차형 이펙트가 처리해야 한다');
assert.ok(breathDrawing.bezier >= 24 && breathDrawing.fills >= 16, '화염 호흡은 여러 굽은 불꽃 혀로 보여야 한다');
assert.strictEqual(breathDrawing.lines, 0, '화염 호흡은 광선이나 삼각형 윤곽선을 그리면 안 된다');
assert.strictEqual(breathDrawing.rects, 0, '화염 호흡은 직사각형 광선을 그리면 안 된다');
const shieldChargeImpact = vm.runInContext(`(() => {
  const calls = { curves: 0, shards: 0, groundDust: 0, triangleLines: 0 };
  const ctx = {
    globalAlpha: 0.72, translate() {}, rotate() {}, beginPath() {}, moveTo() {}, stroke() {}, fill() {}, save() {}, restore() {},
    bezierCurveTo() { calls.curves++; }, fillRect() { calls.shards++; }, ellipse() { calls.groundDust++; }, lineTo() { calls.triangleLines++; }
  };
  const handled = drawProceduralSkillImpact(ctx, {
    family: 'charge', element: 'phys', size: 82, x: 250, y: 210,
    fromX: 100, fromY: 220, toX: 250, toY: 210
  }, 0.5);
  return { ...calls, handled };
})()`, context);
assert.strictEqual(shieldChargeImpact.handled, true, '방패돌진은 전용 충돌 이펙트가 처리해야 한다');
assert.strictEqual(shieldChargeImpact.curves, 3, '방패돌진 충돌면은 겹친 곡선 충격파로 보여야 한다');
assert.strictEqual(shieldChargeImpact.shards, 6, '방패돌진은 제한된 수의 금속·바닥 파편을 뿌려야 한다');
assert.strictEqual(shieldChargeImpact.groundDust, 1, '방패돌진은 충돌점 바닥 먼지를 한 번만 그려야 한다');
assert.strictEqual(shieldChargeImpact.triangleLines, 0, '방패돌진은 기존 삼각형 방사 이펙트를 그리면 안 된다');
assert.strictEqual(context.SKILL_GEM_VFX_PROFILES['방패 돌진'].sigilVfx, false, '방패돌진 충돌 위에 공용 원형 문양을 겹치면 안 된다');
assert.strictEqual(context.SKILL_GEM_VFX_PROFILES['방패 돌진'].impactAccentVfx, false, '방패돌진 충돌 위에 공용 원형 강타 효과를 겹치면 안 된다');
const annihilateSpawnOptions = vm.runInContext(`getAttackFxSpawnOpts(
  { element: 'fire', impactTier: 'annihilate', crit: false },
  { isBoss: false, isElite: false },
  { variant: 'projectile' },
  1
)`, context);
assert.strictEqual(annihilateSpawnOptions.variant, 'projectile', 'one-shot feedback must not turn every skill into an expensive slam effect');
assert.strictEqual(annihilateSpawnOptions.crit, false, 'one-shot feedback must not force critical particle density');
assert.ok(annihilateSpawnOptions.scale < 0.5, 'one-shot feedback should keep the elemental impact inside a normal monster footprint');
assert.ok(annihilateSpawnOptions.densityMul <= 0.5, 'one-shot feedback should use a reduced particle budget');
assert.ok(battlefieldSource.includes('if (fx.elite || isBossDeath) drawBattleImpactBurst'), 'normal enemy deaths should not stack a full impact burst during mass kills');
assert.ok(!passiveSource.includes('ctx.roundRect(x - boxW / 2'), 'damage labels should not draw opaque backing boxes');
assert.ok(passiveSource.includes("impactTier = damageRatio >= 1 ? 'annihilate'"), 'combat feedback should classify heavy and annihilating hits');
assert.ok(passiveSource.includes("text.impactTier === 'annihilate' ? 27"), 'damage labels should use the compact font hierarchy');
assert.ok(!passiveSource.includes("ctx.fillText('ANNIHILATION'"), 'damage labels should avoid redundant oversized impact captions');
assert.ok(passiveSource.includes("annihilate: Object.freeze({ hitStopMs: 34, shake: 3.8, duration: 170 })"), 'one-shot feedback intensity should stay below the previous expensive profile');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes("text: '회피!', color: '#9fb4c8', duration: 260, bodyCue: true"), 'player evasion should request fixed body feedback');
assert.ok(combatSource.includes("text: '막아냄!', color: '#a7a7a7', duration: 260, bodyCue: true"), 'player blocks should request fixed body feedback');
assert.ok(combatSource.includes("attackTags.includes('slam') ? 460") && combatSource.includes("attackTags.includes('projectile') ? 400 : 360"), 'seven-pose attacks should use a readable motion window');
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
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const windowManagerSource = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const shellSource = fs.readFileSync('js/ui-game-shell.js', 'utf8');
assert.ok(!windowCss.includes("content: 'P I'"), 'the in-game PI rail badge should be removed');
assert.ok(!shellSource.includes('PROJECT IDLE</strong>'), 'the in-game expedition brand should be removed');
assert.ok(!uiSource.includes('enemy-target-strip'), 'meaningless enemy count/target buttons should be removed');
assert.ok(uiSource.includes("showTraits = !!(focusedEnemy.isElite || focusedEnemy.isBoss || focusedEnemy.bossPhase)"), 'elite and boss traits should remain visible under the health bar');
assert.ok(uiSource.includes("hunterExpose: { sprite: 8, label: '약점 노출'"), 'hunter exposure should use its Korean icon presentation');
assert.ok(uiSource.includes("hunterExpose: () => '헌터 전직 키스톤 효과로 받는 모든 피해가 20% 증가합니다.'"), 'hunter exposure should explain its actual effect in the custom tooltip');
assert.ok(uiSource.includes("'rivalKey', 'cosmosSovereignKey'"), 'rival and echo marks should stay hidden from the crafting currency list');
assert.ok(uiSource.includes('gem-tag--${getTone(tag)}'), 'skill-gem tags should render semantic color classes');
assert.ok(uiSource.includes('gem-tag--support') && uiSource.includes('gem-tag--resonance'), 'support gem tags should use distinct support and resonance colors');
assert.ok(uiSource.includes("renderSkillGemArt(name, 'gem-card-sigil gem-card-art')"), 'skill cards should use their dedicated gem portraits');
assert.ok(uiSource.includes('.tutorial-overlay.active:not(#tutorial-overlay)'), 'compact tutorial notices should not pause the live battle screen');
assert.ok(!uiSource.includes('if (isTutorialOpen() || isRewardOpen()'), 'compact tutorial notices should keep the game loop running');
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
assert.ok(passiveSource.includes('data-hero-id="${escapeHTML(id)}"'), 'hero preview cards should expose stable hero ids');
assert.ok(passiveSource.includes('class="hero-choice-portrait" src="${escapeHTML(def.portrait)}"'), 'hero selection should render the dedicated portrait configured for each hero');
assert.ok(windowCss.includes('body:not(.light-mode) .hero-choice-portrait {'), 'hero portraits should have a dedicated selection-card layout');
assert.ok(!windowCss.includes('.hero-choice[data-hero-id='), 'character selection should not reuse animated combat sheets as CSS previews');
const heroVisualCoverage = vm.runInContext(`Object.values(HERO_SELECTION_DEFS).map(def => ({
  id: def.id,
  portrait: def.portrait,
  strips: Object.values(def.strips),
}))`, context);
assert.strictEqual(heroVisualCoverage.length, 10, 'all ten playable heroes should retain a visual definition');
assert.strictEqual(new Set(heroVisualCoverage.map(hero => hero.portrait)).size, 10, 'every hero should use a distinct portrait');
heroVisualCoverage.forEach(hero => {
  assert.ok(fs.existsSync(hero.portrait), `${hero.id} portrait should exist`);
  assert.strictEqual(new Set(hero.strips).size, 5, `${hero.id} animation states should use explicit asset keys`);
  ['idle', 'walk', 'attack'].forEach(state => {
    assert.ok(fs.existsSync(`assets/playable/${hero.id}/${state}.png`), `${hero.id} ${state} strip should exist`);
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
assert.ok(passiveSource.includes('anchorY: raw.height * anchor.yRatio'), 'playable frames should preserve one foot baseline across idle, walk, and attack');
assert.ok(passiveSource.includes("manifest[key] += '?v=20260718-motion2'"), 'updated playable sheets should bypass stale browser image caches');
assert.ok(uiSource.includes('walkCycleDuration = clampNumber(960 / moveRatio'), 'walk animation timing should target a complete cycle instead of treating the cycle duration as one frame');
assert.ok(!uiSource.includes("if (typeof isLocalRuntimeHost !== 'function' || !isLocalRuntimeHost()) return defaultTuning;"), 'playable character scale should remain consistent between local and deployed builds');

console.log('smoke-game-visual-overhaul passed');
