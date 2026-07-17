const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveFiles = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/passives.js', 'data/bosses.js',
  'data/rewards.js', 'data/talent-cards.js', 'js/utils.js', 'js/state.js', 'js/passives.js',
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
const damageTextLayout = vm.runInContext(`(() => {
  battleVisualState.damageTexts = [];
  spawnDamageText({ start: 1200, x: 400, y: 240, value: 10 });
  spawnDamageText({ start: 1200, x: 400, y: 240, value: 11 });
  spawnDamageText({ start: 1200, x: 400, y: 240, value: 12 });
  return battleVisualState.damageTexts.map(text => ({
    start: text.start,
    offsetX: text.offsetX,
    duration: text.duration,
  }));
})()`, context);
assert.ok(damageTextLayout.every(text => text.start === 1200), 'damage labels should share the battlefield visual clock instead of wall-clock time');
assert.strictEqual(new Set(damageTextLayout.map(text => text.offsetX)).size, damageTextLayout.length, 'same-frame damage labels should spread across separate lanes');
assert.ok(damageTextLayout.every(text => text.duration <= 760), 'ordinary damage labels should clear quickly instead of lingering over combat');

for (let index = 0; index < 18; index++) {
  assert.ok(fs.existsSync(`assets/background/chaos/endgame-${index}.png`), `chaos backdrop ${index} should exist`);
}
assert.ok(fs.existsSync('assets/background/chaos/loop-final.png'), 'chaos loop-final backdrop should exist');
assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="chk-camera-shake"'), 'settings should expose the camera shake checkbox');
assert.ok(fs.existsSync('assets/ui/passive-node-major-v1.png'), 'generated major passive frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-void-v1.png'), 'generated void socket frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-star-wedge-v1.png'), 'generated star-wedge socket frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-path-v1.png'), 'generated path node frame should exist');
assert.ok(fs.existsSync('assets/ui/window-frame-luxe-v1.png'), 'generated window frame should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-ring-v1.png'), 'generated boss ring telegraph should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-fan-v1.png'), 'generated boss fan telegraph should exist');
assert.ok(fs.existsSync('assets/effects/boss-telegraph-pulse-v1.png'), 'generated boss pulse telegraph should exist');
[
  'skill-whirlwind-v1.png', 'skill-chain-primary-v1.png', 'skill-chain-jump-v1.png',
  'skill-slam-primary-v1.png', 'skill-slam-aftershock-v1.png', 'skill-slash-v1.png',
  'skill-projectile-v1.png', 'skill-burst-v1.png', 'skill-dot-field-v1.png',
  'skill-summon-strike-v1.png',
].forEach(file => assert.ok(fs.existsSync(`assets/effects/${file}`), `generated skill VFX ${file} should exist`));
const skillVfxCoverage = vm.runInContext(`(() => {
  const gems = Object.keys(SKILL_DB).filter(name => SKILL_DB[name] && SKILL_DB[name].isGem);
  return { count: gems.length, missing: gems.filter(name => !SKILL_GEM_VFX_PROFILES[name]) };
})()`, context);
assert.ok(skillVfxCoverage.count >= 41, 'the active skill-gem roster should remain fully represented');
assert.deepStrictEqual(Array.from(skillVfxCoverage.missing), [], 'every active skill gem should have an explicit image VFX profile');
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
assert.ok(passiveSource.includes("key.startsWith('skillFx')"), 'transparent skill VFX should bypass sprite-sheet sanitization');
assert.ok(passiveSource.includes("const frameKey = getPassiveNodeFrameKey(node)"), 'passive nodes should select their dedicated frame assets');
assert.ok(!passiveSource.includes('if (!lightweightMode && useMajorFrame'), 'drag optimization should not hide passive frame images');
const windowCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
assert.ok(!windowCss.includes('border-image-source:'), 'regular windows should avoid a visually noisy full-image frame');
assert.ok(windowCss.includes('> .ui-window-resize'), 'window resize handle should retain an explicit absolute layer');
assert.ok(windowCss.includes('border: 1px solid rgba(111, 151, 188, .58);'), 'regular windows should use a restrained one-pixel frame');
assert.ok(!windowCss.includes('.tab-content.ui-window::after'), 'window frame should not float over text as a pseudo-element');
assert.ok(windowCss.includes('padding: clamp(12px, 1.15vw, 18px);'), 'window content should retain a compact text-safe inset inside the real border');
assert.ok(windowCss.includes('clip-path: none;'), 'combat health panels should use clean rectangular silhouettes');
assert.ok(windowCss.includes('align-items: center;'), 'health text should remain vertically centered when monster traits are shown');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert.ok(indexSource.includes('id="tutorial-dismiss-btn"'), 'tutorial notice should expose a single acknowledgement action');
assert.ok(!indexSource.includes('id="tutorial-progress-fill"'), 'tutorial notice should not use multi-step progress');
assert.ok(!indexSource.includes('id="tutorial-visual"'), 'tutorial notice should keep the actual game screen visible');
assert.ok(!passiveSource.includes('activeTutorial.steps = getTutorialGuide(activeTutorial)'), 'tutorial notices should not expand into illustrated multi-step lessons');
assert.ok(windowCss.includes('#tutorial-overlay.active'), 'tutorial notice should use a compact live-screen presentation');
const battlefieldSource = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
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
assert.ok(battlefieldSource.includes("drawBossTelegraphDecal(ctx, 'ring'"), 'boss ring patterns should use the generated ground decal');
assert.ok(battlefieldSource.includes("drawBossTelegraphDecal(ctx, 'fan'"), 'boss fan patterns should use the generated ground decal');
assert.ok(battlefieldSource.includes("drawBossTelegraphDecal(ctx, 'pulse'"), 'boss pulse patterns should use the generated ground decal');
assert.ok(battlefieldSource.includes('function queueSkillGemVfx('), 'resolved skill hits should enqueue generated image effects');
assert.ok(battlefieldSource.includes('drawSkillGemVfxLayer(ctx, now);'), 'skill VFX should render through the battlefield ground layer');
assert.ok(battlefieldSource.indexOf('drawSkillGemVfxLayer(ctx, now);') < battlefieldSource.indexOf('drawPlayerSprite(ctx, playerPos.x'), 'skill VFX should stay below the player sprite and combat text');
assert.ok(battlefieldSource.includes("stageKind === 'chainJump'"), 'secondary chain hits should use their connector image');
assert.ok(battlefieldSource.includes("stageKind === 'slamAftershock'"), 'delayed slam aftershocks should use their own image');
assert.ok(battlefieldSource.includes('if (list.length > 96)'), 'skill image effects should retain a hard runtime allocation cap');
const stagedSkillVfx = vm.runInContext(`(() => {
  battleVisualState.skillEffects = [];
  const player = { x: 100, y: 220 };
  const target = { x: 250, y: 210, enemy: { id: 'b' } };
  const map = { a: { x: 190, y: 205, enemy: { id: 'a' } }, b: target };
  queueSkillGemVfx({ id: 1, skillName: '회오리바람', stageKind: 'whirlPrimary', element: 'phys' }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 2, skillName: '연쇄 폭풍', stageKind: 'chainJump', chainFromEnemyId: 'a', element: 'light' }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 3, skillName: '지진 파쇄', stageKind: 'slamAftershock', element: 'phys' }, target, player, map, 1000, 1);
  queueSkillGemVfx({ id: 4, skillName: '서리늑대 소환', stageKind: 'primary', element: 'cold', summon: true }, target, player, map, 1000, 1);
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
assert.ok(stagedSkillVfx.count <= 96, 'skill image effect queue should stay bounded during rapid attacks');
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
assert.ok(uiSource.includes("hunterExpose: '약점 노출'"), 'hunter exposure should use its Korean display name');
assert.ok(uiSource.includes("type === 'hunterExpose') detail = '헌터 전직 키스톤 효과로 받는 모든 피해가 20% 증가합니다.'"), 'hunter exposure should explain its actual effect in the custom tooltip');
assert.ok(uiSource.includes("'rivalKey', 'cosmosSovereignKey'"), 'rival and echo marks should stay hidden from the crafting currency list');
assert.ok(uiSource.includes('gem-tag--${getTone(tag)}'), 'skill-gem tags should render semantic color classes');
assert.ok(uiSource.includes('gem-tag--support') && uiSource.includes('gem-tag--resonance'), 'support gem tags should use distinct support and resonance colors');
assert.ok(uiSource.includes("renderSkillGemArt(name, 'gem-card-sigil gem-card-art')"), 'skill cards should use their dedicated gem portraits');
assert.ok(uiSource.includes('class="gem-orbit-slot slot-${index + 1}'), 'engraving slots should orbit the selected gem instead of forming a detached row');
assert.ok(indexSource.includes('id="ui-gem-engrave-slots" class="gem-engrave-orbit"'), 'the gem forge should expose the central-gem engraving overlay');
assert.ok(windowCss.includes('.gem-orbit-center'), 'the engraving overlay should keep the selected gem at its visual center');
assert.ok(windowCss.includes('grid-template-columns: minmax(0, 1fr); justify-items: center'), 'the engraving device should remain symmetric instead of reserving an uneven side column');
assert.ok(windowCss.includes('.gem-orbit-center {') && windowCss.includes('border-radius: 50%'), 'the selected gem should use a circular socket instead of a tall card silhouette');
assert.ok(windowCss.includes('aspect-ratio: 1') && windowCss.includes('.gem-orbit-slot.slot-1 { left: 50%; top: 10%'), 'all engraving slot centers should sit on one circular path around the gem');
assert.ok(uiSource.includes('class="gem-orbit-legend"') && windowCss.includes(".gem-orbit-slot.filled::after { content: '◆'"), 'empty and filled engraving slots should differ by shape as well as color');
assert.ok(!uiSource.includes('<small>${index + 1}</small>'), 'engraving slots should not show redundant corner number badges');
assert.ok(windowCss.includes('@container (max-width: 430px)'), 'the engraving constellation should retain a dedicated mobile layout');
assert.ok(indexSource.includes('<small>장착 중인 공격 젬</small>'), 'gem forge target rail should describe its equipped-only scope');
assert.ok(uiSource.includes('.tutorial-overlay.active:not(#tutorial-overlay)'), 'compact tutorial notices should not pause the live battle screen');
assert.ok(!uiSource.includes('if (isTutorialOpen() || isRewardOpen()'), 'compact tutorial notices should keep the game loop running');
assert.ok(windowManagerSource.includes('.tutorial-overlay.active:not(#tutorial-overlay)'), 'compact tutorial notices should not block desktop window interactions');
assert.ok(socialSource.includes('연결이 끝나면 채팅이 이 화면에서 자동으로 열립니다.'), 'chat should show a cloud-session pending state');
assert.ok(uiSource.includes('refreshSocialAfterCloudStateChange'), 'cloud session changes should refresh an already-open chat tab');
assert.ok(uiSource.includes("socialTab.classList.contains('ui-community-dock')"), 'cloud session restore should refresh an open community dock');
assert.ok(uiSource.includes("socialTab.classList.contains('ui-community-overlay')"), 'cloud session restore should refresh an open community overlay');
assert.ok(uiSource.includes('exitPushStartedAt - lastPageExitCloudPushAt < 1500'), 'page-exit cloud uploads should be deduplicated across lifecycle events');
assert.ok(socialSource.includes('function syncSocialBackgroundTasks()'), 'social timers should follow cloud-session lifetime');
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

console.log('smoke-game-visual-overhaul passed');
