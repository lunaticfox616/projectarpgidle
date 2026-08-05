const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const battlefieldSource = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
const start = source.indexOf('const UI_COMBAT_EFFECT_PRESENTATION');
const end = source.indexOf('function updateCombatUI(', start);
assert(start >= 0 && end > start, 'combat effect helpers must have a testable boundary');

const now = 10000;
const ownedKeystones = new Set(['w2', 'w5']);
const context = {
  game: {
    playerAilments: [{ type: 'ignite', time: 2, duration: 4, power: 0.2 }, { type: 'shock', time: 0, power: 0.1 }],
    woodsmanCurseActive: true,
    woodsmanCurseDamageTakenStacks: 125,
    playerConditionBuffs: [
      { name: '철벽', type: 'guard', expiresAt: 13000 },
      { name: '만료된 함성', type: 'warcry', expiresAt: 9000 }
    ],
    cosmosPlayerDebuffs: [{ type: 'cosmos_res_down', label: '저항 감소', value: 18, expiresAt: 14000 }],
    realmDeathWard: { amount: 70, maxAmount: 100 },
    realmInvulnerableBarrierUntil: 12000,
    ascendClass: 'warrior',
    warriorRageExpiresAt: 13000,
    playerUniqueGuard: { amount: 80, expiresAt: 13000 },
    shadowStealthExpiresAt: 13000,
    uniqueLeechEfficiencyUntil: 13000,
    uniqueMeleeArmorAmpStacks: 2,
    uniqueMeleeArmorAmpExpiresAt: 13000,
    uniqueKillMoveStacksState: { stacks: 3, expiresAt: 14000 },
    lastMoveEndedAt: 9000,
    uniqueRiderCompassConsumed: false,
    playerLeechInstances: [
      { remaining: 30, rate: 10, target: 'life' },
      { remaining: 20, rate: 5, target: 'energyShield' }
    ],
    playerRecoupInstances: [{ remaining: 40, rate: 10 }],
    warriorRhythmStacks: 2,
    warriorRhythmExpiresAt: 12000,
    warriorRhythmDoubleStacks: 1,
    warriorRhythmDoubleExpiresAt: 13000,
    talentRuntime: { aegisEvadeAmp: true, aegisBlockBonus: 5, fletcherCount: 2, colosseumReady: true },
    bloomTrialRegenSuppress: 0.25,
    delayedGuardHealPool: 60,
    queenBees: [{ expiresAt: 14000, attacksLeft: 2 }, { expiresAt: 15000, attacksLeft: 1 }],
    summonDeathDamageBuffPct: 40,
    summonDeathDamageBuffExpiresAt: 13000,
    summonCritAspdStacks: 2,
    summonCritAspdPerStack: 10,
    summonCritAspdExpiresAt: 13000,
    shrineBuff: { name: '힘의 성소', stat: 'pctDmg', value: 16, expiresAt: 14000 },
    uniqueEliteTraitBuff: { trait: { name: '고속 공세', attackSpeedVarMul: 1.18 }, expiresAt: 14000 }
  },
  FLASK_UTILITY_POOL: { speed: { key: 'speed', name: '신속 플라스크' } },
  escapeHTML(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  getExpReq() { return 100; },
  getUiStoredAilmentHitDamage() { return 40; },
  ensureFlaskState() {
    return {
      healTier: 1,
      healOverTimeUntil: 12000,
      utils: [{ key: 'speed', until: 12500 }]
    };
  },
  getFlaskHealDef() { return { key: 'heal', name: '생명력 플라스크' }; },
  getMaxFlaskUtilitySlotCount() { return 1; },
  hasKeystone(id) { return ownedKeystones.has(id); },
  isTalentCardActive(id) {
    return ['hero1__guardian', 'hero1__gladiator', 'hero2__gladiator', 'hero5__warrior'].includes(id) ? 1 : 0;
  },
  getWarriorRageStacks() { return 3; },
  getStatName() { return '피해'; },
  isUiDamageAilmentType(type) { return ['ignite', 'poison', 'bleed'].includes(type); },
  getUiPlayerDamageAilmentDps() { return 10; }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, { filename: 'combat-effect-icons.js' });

const playerStats = {
  maxHp: 1000,
  uniqueDeathWard: true,
  uniqueDragonVeinGuard: { hpPct: 8 },
  uniqueDeflectStealth: { move: 20, evasionPct: 20, critDmg: 20 },
  uniqueLeechEfficiencyOnKill: { efficiencyPct: 60 },
  uniqueMeleeArmorAmp: { ampPct: 5 },
  uniqueKillMoveStacks: { movePerStack: 5 },
  uniqueRiderCompass: true
};
const playerMarkup = context.buildPlayerCombatEffectIcons(playerStats, now);
const expectedPlayerEffects = ['ignite', 'woodsmanCurse', 'guard', 'cosmos_res_down', 'healFlask',
  'utilityFlask', 'playerUniqueGuard', 'shadowStealth', 'leechEfficiency', 'meleeArmorAmp',
  'killMoveStacks', 'riderCompassReady', 'shrineBuff', 'eliteTraitBuff', 'lifeLeech', 'energyShieldLeech',
  'lifeRecoup', 'delayedGuardHeal', 'warriorRhythm', 'talentAegis', 'fletcherCharge', 'colosseumReady',
  'bloomRegenSuppress', 'queenBeeSwarm', 'summonDeathDamageBuff', 'summonCritAspd',
  'deathWard', 'invulnerableBarrier', 'warriorRage'];
assert.strictEqual((playerMarkup.match(/class="combat-effect-icon/g) || []).length, expectedPlayerEffects.length,
  'every active player ailment and runtime effect must receive one icon');
expectedPlayerEffects.forEach(key => assert(playerMarkup.includes(`effect-${key}`), `${key} must be represented`));
assert(playerMarkup.includes('combat-effect-art') && !playerMarkup.includes('combat-effect-glyph'),
  'status effects must use the generated image atlas instead of text glyphs');
const firstSpriteMarkup = context.renderCombatEffectIcon({ key: 'ignite' });
const lastSpriteMarkup = context.renderCombatEffectIcon({ key: 'unmapped-effect' });
const timedMarkup = context.renderCombatEffectIcon({ key: 'ignite', remainingSec: 3, durationSec: 6 });
assert(timedMarkup.includes('class="combat-effect-icon effect-ignite timed"')
  && timedMarkup.includes('--effect-remaining-angle:180.00deg')
  && timedMarkup.includes('class="combat-effect-time">3</span>'),
  'timed effects must expose a clockwise half-duration sweep and readable seconds');
assert(firstSpriteMarkup.includes('--effect-sprite-x:0.0000%') && firstSpriteMarkup.includes('--effect-sprite-y:0.0000%'),
  'the first effect must address the first atlas cell');
assert(lastSpriteMarkup.includes('--effect-sprite-x:100.0000%') && lastSpriteMarkup.includes('--effect-sprite-y:100.0000%'),
  'unknown effects must address the final fallback atlas cell');
assert.notStrictEqual(firstSpriteMarkup, context.renderCombatEffectIcon({ key: 'freeze' }),
  'different effects must select different atlas cells');
context.game.talentRuntime.colosseumReady = false;
context.game.talentRuntime.colosseumKills = 4;
assert(context.buildPlayerTalentAndSummonEffectIcons(now).includes('effect-colosseumCharge'),
  'colosseum kill progress must remain visible before the empowered attack is ready');
const activeTalentLookup = context.isTalentCardActive;
context.isTalentCardActive = () => 0;
const staleTalentMarkup = context.buildPlayerTalentAndSummonEffectIcons(now);
assert(!staleTalentMarkup.includes('effect-talentAegis') && !staleTalentMarkup.includes('effect-fletcherCharge')
  && !staleTalentMarkup.includes('effect-colosseumCharge'), 'unequipped talent cards must not leave stale effect icons');
context.isTalentCardActive = activeTalentLookup;
context.game.talentRuntime.colosseumReady = true;
assert(!playerMarkup.includes('effect-shock') && !playerMarkup.includes('만료된 함성'), 'expired effects must not remain visible');
assert(!playerMarkup.includes('효과 없음') && !playerMarkup.includes('상태이상:'), 'icon strips must not recreate the old text box');

context.game.gladiatorFlurryStacks = 4;
context.game.gladiatorFlurryExpiresAt = 13000;
context.game.gladiatorVeteranCritBonus = 15;
context.game.gladiatorSwiftOpeningReady = true;
context.game.gladiatorSwiftGuardReady = true;
context.game.ascendClass = 'gladiator';
ownedKeystones.clear(); ['g2', 'g3', 'g5'].forEach(id => ownedKeystones.add(id));
const gladiatorMarkup = context.buildPlayerAscendStackEffectIcons(now) + context.buildPlayerAscendReadyEffectIcons(now);
['gladiatorFlurry', 'gladiatorVeteran', 'gladiatorSwift']
  .forEach(key => assert(gladiatorMarkup.includes(`effect-${key}`), `${key} must expose its live state`));

context.game.ascendClass = 'assassin'; context.game.assassinBlurred = true;
ownedKeystones.clear(); ownedKeystones.add('a2');
assert(context.buildPlayerAscendReadyEffectIcons(now).includes('effect-assassinBlurred'));
context.game.ascendClass = 'elementalist'; context.game.elementalistOverloadStacks = 6;
ownedKeystones.clear(); ownedKeystones.add('e8');
assert(context.buildPlayerAscendStackEffectIcons(now).includes('effect-elementalistOverload'));
context.game.ascendClass = 'catalyst'; context.game.catalystEvadeBoostReady = true;
ownedKeystones.clear(); ownedKeystones.add('ct4');
assert(context.buildPlayerAscendReadyEffectIcons(now).includes('effect-catalystEvade'));
context.game.ascendClass = 'crusader'; context.game.crusaderLightningAegisUntil = 13000;
ownedKeystones.clear(); ownedKeystones.add('cr8');
assert(context.buildPlayerAscendReadyEffectIcons(now).includes('effect-crusaderLightningAegis'));
context.game.ascendClass = 'guardian'; context.game.guardianEnduranceStacks = 3; context.game.guardianEnduranceExpiresAt = 13000;
ownedKeystones.clear(); ownedKeystones.add('gd6');
assert(context.buildPlayerAscendStackEffectIcons(now).includes('effect-guardianEndurance'));

const enemy = {
  id: 7,
  chaosErosionShred: 12,
  regenSuppressPct: 25,
  dotStacks: 3,
  skillSlowPct: 12,
  dotState: { stacks: 3, rawTickDamage: 44, timeLeft: 2.5, skillName: '빙결 침식' }
};
context.game.talentDawnHits = { 7: 1 };
context.game.enemyWitherStacks = { 7: 4 };
context.game.enemyUniqueChaosResDown = { 7: { stacks: 3, perHit: 2 } };
context.game.enemyUniqueElementalResDown = { 7: { stacks: 2, perHit: 3 } };
context.game.talentInquisitorMarks = { 7: { accumulated: 500, explodeAt: 13000 } };
context.game.talentButcherMarks = { 7: { hits: 2 } };
context.game.rangerWeakpointMarks = { 7: { hits: 1 } };
const enemyMarkup = context.buildEnemyCombatEffectIcons([
  { type: 'ignite', time: 3, duration: 6, power: 0.2 },
  { type: 'assassinWeakness', time: 5, power: 4 },
  { type: 'freeze', time: 0, power: 0 }
], [{ name: '쇠약', expiresAt: 13000 }, { name: '만료', expiresAt: 9000 }], now, enemy);
const enemyRuntimeKeys = ['dawnSeal', 'enemySkillDot', 'enemyWither', 'enemyChaosResDown', 'enemyElementalResDown',
  'talentInquisitorMark', 'talentButcherMark', 'rangerWeakpointMark', 'chaosErosion', 'regenSuppress'];
assert.strictEqual((enemyMarkup.match(/class="combat-effect-icon/g) || []).length, 3 + enemyRuntimeKeys.length,
  'enemy ailments, curses, marks, and runtime debuffs must share one active icon strip');
enemyRuntimeKeys.forEach(key => assert(enemyMarkup.includes(`effect-${key}`), `${key} must be represented`));
assert(enemyMarkup.includes('combat-effect-badge">4'), 'assassin weakness must show its actual stack count');
assert(enemyMarkup.includes('showEnemyAilmentTooltip') && enemyMarkup.includes('showPlayerBuffTooltip'), 'icons must keep the existing detailed hover tooltips');
assert.strictEqual(context.buildEnemyCombatEffectIcons(null, null, now), '', 'empty enemy state must collapse to empty markup');

function decodeHtmlAttribute(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function getMouseEnterHandler(markup) {
  const match = markup.match(/onmouseenter="([^"]*)"/);
  assert(match, 'effect markup must expose a hover handler');
  return decodeHtmlAttribute(match[1]);
}
const injectedType = "ignite');globalThis.__effectInjected=1;//";
context.game.playerAilments = [{ type: injectedType, time: 2, power: 0.1 }];
const playerInjectionMarkup = context.buildPlayerAilmentEffectIcons();
let receivedPlayerType;
const playerHandlerContext = {
  event: {},
  showPlayerAilmentTooltip(...args) { receivedPlayerType = args[1]; }
};
vm.runInNewContext(getMouseEnterHandler(playerInjectionMarkup), playerHandlerContext);
assert.strictEqual(receivedPlayerType, injectedType, 'player ailment type must survive safe serialization');
assert.strictEqual(playerHandlerContext.__effectInjected, undefined, 'player ailment type must not execute injected code');

const enemyInjectionMarkup = context.buildEnemyCombatEffectIcons([{ type: injectedType, time: 2, power: 0.1 }], [], now);
let receivedEnemyPayload;
const enemyHandlerContext = {
  event: {},
  showEnemyAilmentTooltip(...args) { receivedEnemyPayload = args[1]; }
};
vm.runInNewContext(getMouseEnterHandler(enemyInjectionMarkup), enemyHandlerContext);
assert.strictEqual(receivedEnemyPayload.type, injectedType, 'enemy ailment type must survive safe serialization');
assert.strictEqual(enemyHandlerContext.__effectInjected, undefined, 'enemy ailment type must not execute injected code');

context.game.woodsmanCurseActive = false;
context.game.playerConditionBuffs = [{ name: injectedType, type: 'guard', expiresAt: 13000 }];
context.game.cosmosPlayerDebuffs = [];
let receivedBuffName;
const buffHandlerContext = {
  event: {},
  showPlayerBuffTooltip(...args) { receivedBuffName = args[1]; }
};
vm.runInNewContext(getMouseEnterHandler(context.buildPlayerConditionEffectIcons(now)), buffHandlerContext);
assert.strictEqual(receivedBuffName, injectedType, 'dynamic buff names must survive safe serialization');
assert.strictEqual(buffHandlerContext.__effectInjected, undefined, 'dynamic buff names must not execute injected code');

let receivedNamedEffect;
const namedHandlerContext = {
  event: {},
  showPlayerNamedEffectTooltip(...args) { receivedNamedEffect = { name: args[2], detail: args[3] }; }
};
const namedInjectionMarkup = context.renderUiNamedEffectIcon({
  key: 'shrineBuff', name: injectedType, detail: injectedType, expiresAt: 13000
}, now);
vm.runInNewContext(getMouseEnterHandler(namedInjectionMarkup), namedHandlerContext);
assert.deepStrictEqual(receivedNamedEffect, { name: injectedType, detail: injectedType },
  'named shrine and elite details must survive safe serialization');
assert.strictEqual(namedHandlerContext.__effectInjected, undefined, 'named effect details must not execute injected code');

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.getUiEnemyTraitLabels(['보스', '화염', '정예', '광폭']))),
  ['화염', '광폭'],
  'rarity labels must not be repeated as enemy traits'
);

const traitStart = battlefieldSource.indexOf('function getEnemyTraitSummary(');
const traitEnd = battlefieldSource.indexOf('function getEnemyShortLabel(', traitStart);
const traitContext = {
  getElementLabel(element) { return element === 'fire' ? '화염' : '물리'; },
  getBossPatternModeLabel() { return ''; },
  getBossPatternPreview() { return null; }
};
vm.createContext(traitContext);
vm.runInContext(battlefieldSource.slice(traitStart, traitEnd), traitContext, { filename: 'enemy-trait-summary.js' });
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(traitContext.getEnemyTraitSummary({ isBoss: true, ele: 'fire', traitName: '광폭' }))),
  ['화염', '광폭'],
  'boss rarity must not be injected into the trait data'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(traitContext.getEnemyTraitSummary({ isElite: true, ele: 'fire', traitName: '철갑' }))),
  ['화염', '철갑'],
  'elite rarity must not be injected into the trait data'
);

const enemyLookupStart = combatSource.indexOf('function getAliveEnemyByRuntimeKey(');
const enemyLookupEnd = combatSource.indexOf('function getActiveTalentCardId(', enemyLookupStart);
const markStart = combatSource.indexOf('function processTalentInquisitorMarks(');
const markEnd = combatSource.indexOf('const TALENT_CARD_MAX_LEVEL_REF', markStart);
const markedEnemy = { id: 7, hp: 1000 };
const markContext = {
  game: {
    enemies: [markedEnemy],
    settings: { showCombatLog: false },
    talentInquisitorMarks: {
      7: { accumulated: 500, explodeAt: 9000, cooldownUntil: 0 },
      8: { accumulated: 100, explodeAt: 9000, cooldownUntil: 0 }
    }
  },
  Date: { now: () => 10000 },
  TALENT_CARD_MAX_LEVEL_REF: 10,
  isTalentCardActive: () => 10,
  addBattleFx() {},
  getElementColor: () => '#fff',
  handleEnemyDeath() {},
  getPlayerStats: () => ({}),
  formatNumberKR: String,
  addLog() {}
};
vm.createContext(markContext);
vm.runInContext(combatSource.slice(enemyLookupStart, enemyLookupEnd), markContext, { filename: 'enemy-runtime-key.js' });
vm.runInContext(combatSource.slice(markStart, markEnd), markContext, { filename: 'inquisitor-mark.js' });
markContext.processTalentInquisitorMarks();
assert.strictEqual(markedEnemy.hp, 940, 'a string map key must resolve the numeric enemy and detonate the judgment mark');
assert.deepStrictEqual(JSON.parse(JSON.stringify(markContext.game.talentInquisitorMarks[7])),
  { accumulated: 0, explodeAt: 0, cooldownUntil: 16000 }, 'detonated judgment marks must enter cooldown');
assert.strictEqual(markContext.game.talentInquisitorMarks[8], undefined, 'marks for missing enemies must be removed');

const dotTickStart = combatSource.indexOf('function tickEnemyDotEffects(');
const dotTickEnd = combatSource.indexOf('function syncCrowdPauseState(', dotTickStart);
const expiringDotEnemy = {
  id: 9,
  hp: 100,
  dotStacks: 3,
  skillSlowPct: 12,
  dotState: { timeLeft: 0.1, tickTimer: 1, tickInterval: 1, rawTickDamage: 10 },
  ailments: [{ type: 'flameDecay', time: 0.1 }]
};
const dotContext = {
  game: { currentZoneId: 1, enemies: [expiringDotEnemy] },
  DOT_TICK_INTERVAL: 1,
  getZone: () => ({ id: 1, tier: 1, type: 'act' }),
  getAbyssMonsterScales: () => ({ playerDamageMul: 1 }),
  getStoryActByZoneId: () => null,
  syncEnemyFlameDecayAilment() {}
};
vm.createContext(dotContext);
vm.runInContext(combatSource.slice(dotTickStart, dotTickEnd), dotContext, { filename: 'enemy-dot-tick.js' });
dotContext.tickEnemyDotEffects({}, 0.2);
assert.strictEqual(expiringDotEnemy.dotState, null, 'expired skill DOT must clear its runtime state');
assert.strictEqual(expiringDotEnemy.dotStacks, 0, 'expired skill DOT must clear its stack count');
assert.strictEqual(expiringDotEnemy.skillSlowPct, 0, 'expired frost erosion must clear its slow effect');
assert.deepStrictEqual(expiringDotEnemy.ailments, [], 'expired flame-decay presentation state must be removed');

console.log('smoke-combat-effect-icons passed');
