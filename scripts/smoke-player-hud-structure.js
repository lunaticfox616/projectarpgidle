const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');

// 실제 HUD/툴팁 출력 검증. 화면 배치와 크기는 브라우저 core-ui.spec.js에서 검사한다.
const identityStart = uiSource.indexOf('function getUiPlayerHudIdentity()');
const identityEnd = uiSource.indexOf('const BACKGROUND_PROGRESS_MIN_REAL_MS', identityStart);
assert(identityStart >= 0 && identityEnd > identityStart, 'player identity calculation must have a testable boundary');
const identityContext = {
  game: { selectedHeroId: 'hero2', ascendClass: null },
  CLASS_TEMPLATES: { warrior: { name: '워리어' } },
  getHeroSelectionDef(heroId) {
    return heroId === 'hero2' ? { label: '전사' } : null;
  }
};
vm.createContext(identityContext);
require('./lib/load-combat-clock')(identityContext);
vm.runInContext(uiSource.slice(identityStart, identityEnd), identityContext, { filename: 'player-hud-identity.js' });
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(identityContext.getUiPlayerHudIdentity())),
  { name: '전사', className: '미전직' },
  'an unascended hero must keep its hero name and an explicit class state'
);
identityContext.game.ascendClass = 'warrior';
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(identityContext.getUiPlayerHudIdentity())),
  { name: '전사', className: '워리어' },
  'ascension must update the class without replacing the hero name'
);
identityContext.game.selectedHeroId = 'missing';
assert.strictEqual(identityContext.getUiPlayerHudIdentity().name, '플레이어', 'missing hero data must use the visible fallback name');

// 전투 HUD의 젬 칸 · 게이지 · 효과 아이콘(플라스크 칸은 2026-10-01 물약 삭제와 함께 없어졌다).
const hudStart = uiSource.indexOf('/** Combat HUD skill tray');
const hudEnd = uiSource.indexOf('function updateCombatUI(', hudStart);
assert(hudStart >= 0 && hudEnd > hudStart, 'combat HUD rendering must have a testable boundary');
assert(!uiSource.includes('renderCombatFlaskHud'), 'the flask strip went with the flasks');
const skillHost = { dataset: {}, innerHTML: '', querySelectorAll() { return []; } };
const hudContext = {
  Date,
  game: { season: 3, activeSkill: '독니 사출', equippedSummonSkills: ['서리늑대 소환', '유성낙화'] },
  SKILL_DB: {
    '독니 사출': { tags: ['projectile'] },
    '서리늑대 소환': { tags: ['summon', 'summon_attack'] },
    '유성낙화': { tags: ['spell', 'aoe'] }
  },
  document: { getElementById(id) { return id === 'ui-combat-skill-gems' ? skillHost : null; } },
  getExpReq() { return 100; },
  escapeHTML(value) { return String(value); },
  renderSkillGemArt(name) { return `<i>${name}</i>`; }
};
vm.createContext(hudContext);
require('./lib/load-content-progression')(hudContext);
require('./lib/load-combat-clock')(hudContext);
// 실제 단축키 배정 모듈로 이동 스킬 칸의 키 표시를 만든다.
hudContext.safeExposeData = map => Object.assign(hudContext, map);
hudContext.safeExposeGlobals = map => Object.assign(hudContext, map);
for (const file of ['data/hotkeys.js', 'js/hotkeys.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), hudContext, { filename: file });
hudContext.game.settings = { hotkeyOverrides: {} };
vm.runInContext(uiSource.slice(hudStart, hudEnd), hudContext, { filename: 'player-hud.js' });

const effectRuntime = require('./lib/game-runtime').buildGameRuntime();
hudContext.SKILL_SIGNATURE_SPRITES = effectRuntime.SKILL_SIGNATURE_SPRITES;
hudContext.SKILL_GEM_VFX_PROFILES = effectRuntime.SKILL_GEM_VFX_PROFILES;
hudContext.getSkillGemVfxImage = effectRuntime.getSkillGemVfxImage;
hudContext.renderCombatSkillHud();
assert(skillHost.innerHTML.includes('독니 사출') && skillHost.innerHTML.includes('서리늑대 소환'),
  'the combat gem rack must show the active attack and equipped summon gems');
assert(!skillHost.innerHTML.includes('유성낙화'),
  'the combat gem rack must ignore non-summon entries outside the single active attack');
assert.strictEqual((skillHost.innerHTML.match(/player-hud-skill-slot/g) || []).length, 2,
  'the combat gem rack must create one actionable slot per equipped attack gem');
assert.strictEqual((skillHost.innerHTML.match(/data-info-tooltip-anchor="1"/g) || []).length, 2,
  'combat gem slots must remain recognized by the shared tooltip lifetime manager while hovered');

// 전술 규칙(예전 컨디션 젬 규칙)은 전투 HUD에 칸을 더하지 않는다.
hudContext.game.skillAutoRules = [
  { enabled: true, priority: 1, actionType: 'target_nearest' },
  { enabled: true, priority: 2, actionType: 'return_town' }
];
skillHost.dataset = {};
hudContext.renderCombatSkillHud();
const slotKinds = [...skillHost.innerHTML.matchAll(/data-gem-name="([^"]+)" data-slot-kind="([^"]+)"/g)].map(match => `${match[2]}:${match[1]}`);
assert.deepStrictEqual(slotKinds, ['primary:독니 사출', 'summon:서리늑대 소환'], 'tactics rules add no combat HUD slots');

const gaugeStyle = {
  width: '',
  values: {},
  setProperty(name, value) { this.values[name] = value; }
};
const gaugeParentStyle = {
  values: {},
  setProperty(name, value) { this.values[name] = value; }
};
hudContext.setUiImageGaugePercent({ style: gaugeStyle, parentElement: { style: gaugeParentStyle } }, 42.5);
assert.strictEqual(gaugeStyle.width, '100%', 'image gauges must preserve the source texture width');
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '42.5%', 'image gauges must clip the source texture to the live percentage');
assert.strictEqual(gaugeParentStyle.values['--gauge-fill'], '42.5%', 'the gauge frame must receive the live percentage for its end cap');
hudContext.setUiImageGaugePercent({ style: gaugeStyle }, -1);
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '0%', 'image gauges must clamp underflow');
hudContext.setUiImageGaugePercent({ style: gaugeStyle }, 101);
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '100%', 'image gauges must clamp overflow');

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(hudContext.getUiExperienceProgress(7, 42.5))),
  { current: 42.5, required: 100, remaining: 57, percent: 42.5 },
  'experience presentation must derive the bar, percent, and exact remaining value from one calculation'
);
assert.strictEqual(hudContext.getUiExperienceProgress(7, 150).percent, 100, 'experience presentation must clamp visual overflow');
const igniteIcon = hudContext.renderCombatEffectIcon({ key: 'ignite', tooltip: 'tip()', badge: '3' });
assert(igniteIcon.includes('effect-ignite') && igniteIcon.includes('combat-effect-art'),
  'ailment icons must use the shared raster presentation');
assert(igniteIcon.includes('combat-effect-badge">3'), 'stacked effects must keep a compact count badge');
assert(igniteIcon.includes('onmouseenter="tip()"'), 'effect icons must retain custom tooltip behavior');

console.log('smoke-player-hud-structure passed');
