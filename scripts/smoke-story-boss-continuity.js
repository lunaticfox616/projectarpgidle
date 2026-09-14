const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
const value = source => JSON.parse(run(`JSON.stringify(${source})`));

run(`game = mergeDefaults({}); game.currentZoneId = 3; game.maxZoneId = 3;
    game.enemies = []; game.killsInZone = 0;
    spawnEncounterMarker({at:100,count:1,boss:true});`);
assert.deepEqual(value('game.enemies.filter(e=>e.isBoss).map(e=>[e.name,e.bossAssetKey])'),
    [['👿 황금 길의 마지막 운반자','bossAct4_1']]);
run('game.enemies=[];finishEncounterRun();');
assert.equal(run('game.killsInZone'),1);
assert.equal(run("game.journalEntries.includes('act_4')"),false,'first boss cannot reveal the dying deaconess');
const state = value('game');
runtime.game = runtime.mergeDefaults(state);
assert.equal(run('game.killsInZone'),1,'save restoration retains the second boss stage');
run('game.enemies=[];spawnEncounterMarker({at:100,count:1,boss:true});');
assert.deepEqual(value('game.enemies.filter(e=>e.isBoss).map(e=>[e.name,e.bossAssetKey])'),
    [['👿 부정한 은총의 부제녀','bossAct4_2']]);
run('game.enemies=[];finishEncounterRun();');
assert.equal(run("game.journalEntries.includes('act_4')"),true);
assert.equal(run("game.journalBonuses.find(row=>row.entryId==='act_4').value"),2);
assert.deepEqual(value('[getBossNameForZone(getZone(1)),getBossNameForZone(getZone(8))]'),
    ['부정한 은총의 부제녀','비탄하는 접목의 어머니']);
console.log('story boss order, assets, save continuation and journal timing passed');
