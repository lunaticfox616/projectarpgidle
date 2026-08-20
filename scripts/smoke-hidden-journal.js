const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const unlocked = [];
const context = {
  console,
  safeExposeGlobals(values) { Object.assign(context, values); },
  unlockJournalEntry(id) { if (!unlocked.includes(id)) unlocked.push(id); }
};
context.window = context;
context.game = { playerHp: 100, hiddenJournalBossRun: null };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/hidden-journal.js', 'utf8'), context);

const endgameZone = { id:'rival_masterwork', type:'seasonBoss' };
const boss = { id:71, isBoss:true };
assert(context.startHiddenJournalBossRun(boss, endgameZone), 'endgame boss must begin hidden journal tracking');
assert(!context.startHiddenJournalBossRun(boss, endgameZone), 'same boss must not reset an active run');
['ignite', 'shock', 'poison', 'freeze', 'ignite', 'internalDebuff'].forEach(type => context.trackHiddenJournalAilment(type, boss));
context.trackHiddenJournalPlayerDamage(95);
context.game.playerHp = 5;
assert(context.completeHiddenJournalBossRun(boss, endgameZone, { maxHp:100 }), 'matching defeated boss must complete its run');
assert(unlocked.includes('hidden_last_breath'), 'five-percent boss kill must unlock the last-breath journal');
assert(unlocked.includes('hidden_fourfold_affliction'), 'four distinct supported ailments must unlock the affliction journal');
assert(!unlocked.includes('hidden_unscarred'), 'taking life damage must not unlock an unscarred victory');
assert.strictEqual(context.game.hiddenJournalBossRun, null, 'completed runs must clear transient tracking state');

unlocked.length = 0;
const pinnacleZone = { id:'pinnacle_observer', type:'seasonBoss', milestonePinnacle:true };
const pinnacle = { id:72, isBoss:true };
context.game.playerHp = 100;
context.startHiddenJournalBossRun(pinnacle, pinnacleZone);
context.completeHiddenJournalBossRun(pinnacle, pinnacleZone, { maxHp:100 });
assert(unlocked.includes('hidden_unscarred'), 'pinnacle victory without life damage must unlock the unscarred journal');
assert(unlocked.includes('hidden_dry_vial'), 'pinnacle victory without flask use must unlock the dry-vial journal');

unlocked.length = 0;
const secondPinnacle = { id:73, isBoss:true };
context.startHiddenJournalBossRun(secondPinnacle, pinnacleZone);
context.trackHiddenJournalFlaskUse();
context.completeHiddenJournalBossRun(secondPinnacle, pinnacleZone, { maxHp:100 });
assert(!unlocked.includes('hidden_dry_vial'), 'any flask activation during the fight must block the dry-vial journal');

unlocked.length = 0;
const defeatedBoss = { id:75, isBoss:true };
context.game.playerHp = 0;
context.startHiddenJournalBossRun(defeatedBoss, endgameZone);
context.completeHiddenJournalBossRun(defeatedBoss, endgameZone, { maxHp:100 });
assert(!unlocked.includes('hidden_last_breath'), 'a zero-life completion must not count as a last-breath victory');

const ordinaryBoss = { id:74, isBoss:true };
assert(!context.startHiddenJournalBossRun(ordinaryBoss, { id:1, type:'act' }), 'ordinary act bosses must not grant endgame hidden feats');

console.log('smoke-hidden-journal: ok');
