const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const feedback = fs.readFileSync('js/ui-feedback.js', 'utf8');
const feedbackCss = fs.readFileSync('css/ui-feedback.css', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const windowManager = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');
const battlefield = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
const equipmentRenderer = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
const gameShell = fs.readFileSync('js/ui-game-shell.js', 'utf8');
const overhaulCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const skills = fs.readFileSync('js/skills.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');

const productionSources = [
  'index.html',
  ...fs.readdirSync('js').filter(name => name.endsWith('.js')).map(name => `js/${name}`),
].map(file => fs.readFileSync(file, 'utf8')).join('\n');

assert(!/\b(?:alert|confirm|prompt)\s*\(/.test(productionSources), 'browser-native dialogs must not remain in production sources');
assert(html.includes('css/ui-feedback.css'), 'game feedback CSS must be loaded');
assert(html.includes('js/ui-feedback.js'), 'game feedback runtime must be loaded');
assert(html.indexOf('js/ui-feedback.js') < html.indexOf('js/items.js'), 'feedback runtime must load before user actions');
[
  'requestGameConfirmation',
  'requestGameNumber',
  'requestGameText',
  'requestGameChoice',
  'showGameToast',
].forEach(name => assert(feedback.includes(name), `${name} must be provided by the game feedback layer`));
assert(feedbackCss.includes(':focus-visible'), 'game dialogs need a consistent keyboard focus treatment');
assert(feedbackCss.includes('.game-number-range'), 'number dialogs need a slider/stepper control');
assert(feedbackCss.includes('.game-toast'), 'success and failure notices need game toasts');

assert(passives.includes('BATTLE_FEEDBACK_PROFILES'), 'combat feedback needs a shared intensity table');
assert(passives.includes("normal: Object.freeze({ hitStopMs: 0, shake: 0"), 'ordinary hits must remain restrained');
assert(battlefield.includes('requestBattleHitStop(fx)'), 'impact processing must request hit stop on the damage frame');
assert(battlefield.includes('drawEnemyAttackTelegraphs'), 'enemy attacks need pre-impact danger telegraphs');
assert(battlefield.lastIndexOf('drawBattlefieldEnemyHealthBars(ctx') > battlefield.lastIndexOf("fx.type === 'lootCelebration'"), 'health bars must render above combat and loot effects');
assert(battlefield.indexOf('drawDamageTexts(ctx, now)') > battlefield.lastIndexOf('drawBattlefieldEnemyHealthBars(ctx'), 'damage text must remain the top combat information layer');

assert(!windowCss.includes('border-image-source:'), 'window frame artwork must remain disabled');
assert(!html.includes('combat-feed-sub'), 'combat log must not render a LIVE badge container');
assert(!gameShell.includes("sub.textContent = 'LIVE'"), 'game shell must not restore the LIVE badge');
assert(passives.includes("text.impactTier === 'annihilate' ? 27"), 'damage number hierarchy should use the compact font scale');
assert(passives.includes('const DAMAGE_TEXT_STACK_SPACING'), 'rapid damage numbers should use a vertical stack');
assert(passives.includes('queueDamageTextStackShift(activeTexts'), 'new damage numbers should push earlier labels upward');
assert(windowCss.includes('.ui-management-mode .combat-feed'), 'management screens must reduce combat HUD density');
assert(windowCss.includes('(max-height: 760px)'), '720p-class layouts need a dedicated compact mode');
assert(windowCss.includes('(min-aspect-ratio: 21/9)'), 'ultrawide layouts need a dedicated composition');
assert(windowManager.includes('syncWorkspacePresentation'), 'window state must switch between combat and management presentation');
assert(html.includes('equipment-workspace'), 'equipment tab needs a dedicated loadout and inventory workspace');
assert(html.includes('ui-equipment-loadout-summary'), 'equipment tab needs an at-a-glance loadout summary');
assert(equipmentRenderer.includes('equipment-slot-head'), 'equipped items need semantic slot hierarchy');
assert(equipmentRenderer.includes('equipment-card-actions'), 'inventory cards need consistent game actions');
assert(overhaulCss.includes('grid-template-columns: minmax(330px, .82fr) minmax(430px, 1.35fr)'), 'desktop equipment layout should prioritize inventory space');
assert(overhaulCss.includes('@container (max-width: 860px)'), 'equipment layout must switch composition in narrow windows');
assert(html.includes('skill-loadout-workspace'), 'skill tab needs separate attack and support loadout libraries');
assert(html.includes('gem-forge-workspace'), 'skill progression needs a target rail and forge detail workspace');
assert(html.includes('ui-support-process-list'), 'support gem sky processing must be reachable from the gem forge');
assert(ui.includes('renderAttackGemCard'), 'attack gems need semantic loadout cards');
assert(ui.includes('renderGemEngraveSlots'), 'engraving capacity needs a visible slot presentation');
assert(ui.includes('renderSupportGemProcessList'), 'support gem processing needs a dedicated renderer');
assert(skills.includes('getSupportGemSkyProcessState'), 'support processing cost and max-state rules need a shared calculation');
assert(skills.includes("getSupportTierCap === 'function' ? getSupportTierCap(name) : 3"), 'support processing must respect tierless gem caps');
assert(skills.includes("if (processState.maxed) return addLog('해당 보조 젬은 이미 최대 등급·레벨입니다.'"), 'maxed support gems must not consume processing currency');
assert(overhaulCss.includes('.skill-loadout-summary'), 'skill loadout needs an at-a-glance build summary');
assert(overhaulCss.includes('.gem-engrave-option.group-awakened'), 'awakened engravings need a distinct visual tier');

console.log('smoke-steam-ui-combat passed');
