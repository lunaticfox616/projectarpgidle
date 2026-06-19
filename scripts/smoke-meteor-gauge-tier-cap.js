#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/passives.js', 'utf8');
const helperStart = source.indexOf('function getSkyRiftGaugeTierCap');
const gainEnd = source.indexOf('\nfunction grantMeteorEncounterRewards', helperStart);
assert(helperStart >= 0 && gainEnd > helperStart, 'meteor gauge helpers must exist before rewards');
const block = source.slice(helperStart, gainEnd);

const starWedge = { unlocked: true, skyRiftReady: false, skyRiftGauge: 0, skyRiftAllCosmos: false, skyRiftMinTier: null };
const context = {
  STAR_WEDGE_UNLOCK_ACT: 7,
  game: { starWedge, noti: {} },
  ensureStarWedgeState: () => starWedge,
  getExpertLevel: () => 1,
  getExpertNodeEffectValue: () => 0,
  clampNumber: (value, min, max) => Math.max(min, Math.min(max, value)),
  triggerAstronomerAnomaly: () => {},
  addLog: () => {},
  Math,
};
vm.createContext(context);
vm.runInContext(`${block}; this.getSkyRiftGaugeGain = getSkyRiftGaugeGain; this.gainSkyRiftGaugeFromCombat = gainSkyRiftGaugeFromCombat;`, context);

assert.strictEqual(context.getSkyRiftGaugeGain({ type: 'abyss', tier: 20 }, {}, { skyRiftAllCosmos: false }), 7, 'chaos 20 should charge with exactly the chaos-20 capped speed');
assert.strictEqual(context.getSkyRiftGaugeGain({ type: 'abyss', tier: 30 }, {}, { skyRiftAllCosmos: false }), 7, 'deep chaos above 20 must not charge faster than the non-cosmos difficulty cap');
assert.strictEqual(context.getSkyRiftGaugeGain({ type: 'cosmos', tier: 40 }, {}, { skyRiftAllCosmos: true }), 14, 'all-cosmos meteor rifts may use the higher cosmos difficulty cap');

context.gainSkyRiftGaugeFromCombat({ type: 'abyss', tier: 30 }, {});
assert.strictEqual(starWedge.skyRiftGauge, 7, 'runtime abyss charging should use the capped gain');
assert.strictEqual(starWedge.skyRiftMinTier, 20, 'runtime abyss charging should store the same capped meteor difficulty');

console.log('meteor gauge tier cap smoke checks passed');
