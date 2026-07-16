const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const feedback = fs.readFileSync('js/ui-feedback.js', 'utf8');
const feedbackCss = fs.readFileSync('css/ui-feedback.css', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const windowManager = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');
const battlefield = fs.readFileSync('js/canvas-battlefield.js', 'utf8');

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

assert(windowCss.includes("border-image-source: url('../assets/ui/window-frame-luxe-v1.png')"), 'window art must use a real sliced border');
assert(windowCss.includes('border-image-slice:'), 'window art must use 9-slice scaling');
assert(windowCss.includes('.ui-management-mode .combat-feed'), 'management screens must reduce combat HUD density');
assert(windowCss.includes('(max-height: 760px)'), '720p-class layouts need a dedicated compact mode');
assert(windowCss.includes('(min-aspect-ratio: 21/9)'), 'ultrawide layouts need a dedicated composition');
assert(windowManager.includes('syncWorkspacePresentation'), 'window state must switch between combat and management presentation');

console.log('smoke-steam-ui-combat passed');
