const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

const start = stateSource.indexOf('const CHALLENGE_CONTRACT_REWARD_PER_MODIFIER_PCT');
const end = stateSource.indexOf('// 시간의 균열 런타임 상태', start);
assert(start >= 0 && end > start, 'challenge contract rules should live in shared state helpers');

const context = {
    game: {
        currentZoneId: 0,
        challengeContract: { enemyPower: true, fragileArmor: true, shortHunt: true, greedPact: true }
    },
    getZone(id) { return id === 0 ? { id: 0, type: 'act', maxKills: 10 } : { id, type: 'abyss', maxKills: 10 }; }
};
vm.createContext(context);
vm.runInContext(stateSource.slice(start, end), context, { filename: 'challenge-contract-rules.js' });

const actZone = { type: 'act', maxKills: 10 };
const abyssZone = { type: 'abyss', maxKills: 10 };
assert.strictEqual(context.getChallengeContractScore(), 4);
assert.strictEqual(context.getChallengeContractRewardMultiplier(actZone), 1.32);
assert.strictEqual(context.getChallengeContractRewardMultiplier(abyssZone), 1);
assert.strictEqual(context.getChallengeContractEnemyDamageMultiplier(actZone), 1.25);
assert.strictEqual(context.getChallengeContractEnemyHealthMultiplier(actZone), 1.30);
assert.strictEqual(context.getChallengeContractPhysicalReductionPenalty(actZone), 12);
assert.strictEqual(context.getChallengeContractRecoveryMultiplier(actZone), 0.65);

context.game.challengeContract = { enemyPower: false, fragileArmor: false, shortHunt: false, greedPact: false };
assert.strictEqual(context.getChallengeContractScore(), 4, 'changing the pending selection must not change the current hunt snapshot');
assert.strictEqual(context.getChallengeContractRewardMultiplier(actZone), 1.32, 'current-hunt rewards must remain fixed until the next hunt');
context.applyPendingChallengeContract();
assert.strictEqual(context.getChallengeContractScore(), 0, 'the pending contract should apply at the next hunt boundary');
assert.strictEqual(context.getChallengeContractEnemyDamageMultiplier(actZone), 1, 'the next hunt must use the newly applied difficulty');

const toggleStart = uiSource.indexOf('function toggleChallengeContract');
const toggleEnd = uiSource.indexOf('function renderChallengeContractPanel', toggleStart);
assert(toggleStart >= 0 && toggleEnd > toggleStart, 'contract toggle should be executable in isolation');
context.game = {
    currentZoneId: 0,
    killsInZone: 7,
    runProgress: 61,
    enemies: [{ id: 1, hp: 10 }],
    encounterPlan: [{ type: 'normal' }],
    challengeContract: { enemyPower: false },
    activeChallengeContract: { enemyPower: false }
};
context.addLog = () => {};
context.updateStaticUI = () => {};
vm.runInContext(uiSource.slice(toggleStart, toggleEnd), context, { filename: 'challenge-contract-toggle.js' });
context.toggleChallengeContract('enemyPower');
assert.strictEqual(context.game.killsInZone, 7, 'contract selection must preserve current zone progress');
assert.strictEqual(context.game.runProgress, 61, 'contract selection must preserve current encounter progress');
assert.strictEqual(context.game.enemies.length, 1, 'contract selection must not despawn the current encounter');
assert.strictEqual(context.getChallengeContractScore(), 0, 'current hunt snapshot must remain unchanged after toggling');
assert.strictEqual(context.getChallengeContractScore(context.getChallengeContractState()), 1, 'the toggled selection should be queued for the next hunt');

assert(combatSource.includes('exp * getChallengeContractRewardMultiplier(zone)'), 'contract reward should affect experience');
assert(combatSource.includes('itemChance *= challengeRewardMul;'), 'contract reward should affect equipment drops');
assert(combatSource.includes('getChallengeContractEnemyDamageMultiplier()'), 'enemy power contract should affect incoming attacks');
assert(combatSource.includes('hp * getChallengeContractEnemyHealthMultiplier(zone)'), 'enemy health contract should affect spawned enemy health');
assert(combatSource.includes('getChallengeContractPhysicalReductionPenalty()'), 'fragile armor contract should affect physical mitigation');
assert(combatSource.includes('getChallengeContractRecoveryMultiplier()'), 'greed contract should affect recovery');
assert(passiveSource.includes('* challengeRewardMul);'), 'contract reward should affect currency drop rolls');
assert(indexSource.includes('id="ui-challenge-contract-panel"'), 'challenge contract panel should exist in the map UI');
assert(indexSource.includes('id="ui-combat-contract-status"'), 'active contracts should have a combat HUD indicator');
assert(uiSource.includes('renderChallengeContractPanel();'), 'map refresh should render the contract panel');
assert(uiSource.includes('contractStatus.innerText = `📜 계약 ${contractScore}'), 'combat HUD should disclose active contract count and reward');
assert(uiSource.includes('📜 계약 ${contractScore} · 보상 +${contractBonusPct}%'), 'act map cards should disclose contract reward');
assert(!uiSource.includes('[제안 미리보기]'), 'shipping UI should not label the system as a proposal preview');

console.log('smoke-challenge-contracts passed');
