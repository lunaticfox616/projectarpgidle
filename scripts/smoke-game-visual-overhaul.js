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
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
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
assert.ok(!passiveSource.includes('ctx.roundRect(x - boxW / 2'), 'damage labels should not draw opaque backing boxes');
assert.ok(passiveSource.includes("impactTier = damageRatio >= 1 ? 'annihilate'"), 'combat feedback should classify heavy and annihilating hits');
assert.ok(passiveSource.includes("text.impactTier === 'annihilate' ? 27"), 'damage labels should use the compact font hierarchy');
assert.ok(!passiveSource.includes("ctx.fillText('ANNIHILATION'"), 'damage labels should avoid redundant oversized impact captions');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes("addBattleFx('levelUp'"), 'player level-ups should create a battlefield effect');
const socialSource = fs.readFileSync('js/social.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const windowManagerSource = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const shellSource = fs.readFileSync('js/ui-game-shell.js', 'utf8');
assert.ok(!windowCss.includes("content: 'P I'"), 'the in-game PI rail badge should be removed');
assert.ok(!shellSource.includes('PROJECT IDLE</strong>'), 'the in-game expedition brand should be removed');
assert.ok(!uiSource.includes('enemy-target-strip'), 'meaningless enemy count/target buttons should be removed');
assert.ok(uiSource.includes("showTraits = !!(focusedEnemy.isElite || focusedEnemy.isBoss || focusedEnemy.bossPhase)"), 'elite and boss traits should remain visible under the health bar');
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
assert.ok(passiveSource.includes('style="--hero-preview-image:url('), 'hero preview cards should receive their mapped character artwork');
assert.ok(windowCss.includes('background-image: var(--hero-preview-image);'), 'hero preview cards should render the mapped preview asset');
const heroVisualMap = vm.runInContext(`HERO_SELECTION_ORDER.map(id => ({
  id,
  preview: HERO_SELECTION_DEFS[id].preview,
  spriteFormat: HERO_SELECTION_DEFS[id].spriteFormat,
  idle: HERO_SELECTION_DEFS[id].strips.idle,
  attack: HERO_SELECTION_DEFS[id].strips.attack
}))`, context);
assert.strictEqual(heroVisualMap.length, 10, 'all ten talents should have playable character artwork');
assert.strictEqual(new Set(heroVisualMap.map(row => row.preview)).size, 10, 'every talent should have a distinct selection preview');
assert.strictEqual(new Set(heroVisualMap.map(row => row.idle)).size, 10, 'every talent should have a distinct idle sprite');
assert.strictEqual(new Set(heroVisualMap.map(row => row.attack)).size, 10, 'every talent should have a distinct action sprite');
heroVisualMap.forEach(row => {
  assert.strictEqual(row.spriteFormat, 'directional-pack-v1', `${row.id} should use the imported directional sprite format`);
  assert.ok(fs.existsSync(row.preview), `${row.id} preview should exist`);
  assert.ok(fs.existsSync(`assets/playable/${row.id}-idle.png`), `${row.id} idle sprite should exist`);
  assert.ok(fs.existsSync(`assets/playable/${row.id}-attack.png`), `${row.id} attack sprite should exist`);
});
assert.ok(passiveSource.includes("hero7Idle: 'assets/playable/hero7-idle.png'"), 'summoner should no longer reuse the druid sprite');
assert.ok(passiveSource.includes("hero8Idle: 'assets/playable/hero8-idle.png'"), 'guardian should no longer reuse the warrior sprite');
assert.ok(uiSource.includes("let importedPixelHero = renderedHeroDef.spriteFormat === 'directional-pack-v1'"), 'imported characters should use their pixel rendering path');
assert.ok(uiSource.includes("smoothing: importedPixelHero ? 'pixel' : 'high'"), 'imported pixel characters should render without smoothing');
assert.ok(uiSource.includes("outlineColor: importedPixelHero ? null : '#ffffff'"), 'imported artwork should keep its authored outline instead of receiving a synthetic white rim');

console.log('smoke-game-visual-overhaul passed');
