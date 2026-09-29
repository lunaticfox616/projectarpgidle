// 생성 탐험 맵과 콘텐츠 맵 (js/exploration-layouts.js · js/content-maps.js, docs/atlas-endgame-20260930.md 2·4절):
// every style builds whole maps, the same spec always builds the same map, a generated run saves and restores by its spec,
// and the ancient labyrinth walks a new maze each floor through the real combat loop.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { runtime, run } = fixture(31);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// ---------------------------------------------------------------- every style, size and many seeds
const survey = copy(`(() => {
    const out = [];
    for (const style of explorationLayouts.styles) for (const size of [1, 2, 3]) for (let seed = 0; seed < 40; seed++) {
        const spec = { style, biome: 'root', size, seed: 'survey' + seed };
        try {
            const map = actExplorationMap.generated(spec), roles = map.rooms.map(room => room.role);
            out.push({ style, size, ok: true, elites: roles.filter(role => role === 'elite').length, monsters: actExplorationState.packRooms(map).length,
                bosses: roles.filter(role => role === 'boss').length, entries: roles.filter(role => role === 'entry').length, fits: map.columns <= 60 && map.rows <= 60 });
        } catch (error) { out.push({ style, size, ok: false, error: error.message }); }
    }
    return out;
})()`);
const broken = survey.filter(row => !row.ok);
assert.deepEqual(broken, [], 'every generated map is whole: all rooms reachable, the boss room only through its gate');
assert.ok(survey.every(row => row.bosses === 1 && row.entries === 1 && row.fits), 'one boss room, one entry, at most 60×60');
assert.ok(survey.filter(row => row.style !== 'arena').every(row => row.elites >= 1 && row.monsters >= 2), 'explored styles have elite rooms that seal the gate');
assert.ok(survey.filter(row => row.style === 'arena').every(row => row.monsters === 0), 'an arena has nothing but its boss');

const same = copy(`(() => {
    const a = actExplorationMap.generated({ style: 'maze', biome: 'maze', size: 2, seed: 'x' });
    const b = explorationLayouts.build({ style: 'maze', biome: 'maze', size: 2, seed: 'x' });
    const c = actExplorationMap.generated({ style: 'maze', biome: 'maze', size: 2, seed: 'y' });
    return { sameId: a.id === 'gen:' + explorationLayouts.key({ style: 'maze', biome: 'maze', size: 2, seed: 'x' }), rooms: b.rooms.length,
        differs: a.tiles.join('') !== c.tiles.join(''), stable: a.tiles.join('') === actExplorationMap.generated({ style: 'maze', biome: 'maze', size: 2, seed: 'x' }).tiles.join('') };
})()`);
assert.ok(same.sameId && same.stable && same.rooms > 10, 'the same spec always builds the same map');
assert.ok(same.differs, 'another seed builds another map');
assert.throws(() => run("explorationLayouts.build({ style: 'volcano', biome: 'root', size: 1, seed: 1 })"), /생성 탐험 맵 명세/, 'unknown styles are refused');

// ---------------------------------------------------------------- the labyrinth walks a maze through the real loop
let tick = 0;
function advance(count = 1) { for (let n = 0; n < count; n++) run(`coreLoop(${1800000000000 + (++tick) * 100})`); }
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'nextZone'}});
    game.maxZoneId=9;game.labyrinthFloor=12;game.labyrinthUnlockedMaxFloor=12;game.currentZoneId=LABYRINTH_ZONE_ID;
    game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
    startEncounterRun();game.playerHp=getPlayerStats().maxHp;
`);
const first = copy('{source:game.actExploration.source,layoutId:game.actExploration.layoutId,zoneId:game.actExploration.zoneId,board:getCombatGridSize().columns,packs:game.actExploration.packs.length}');
assert.equal(first.source.style, 'maze', 'the labyrinth is a maze');
assert.equal(first.source.size, 2, 'floor 12 is a medium maze');
assert.equal(first.zoneId, run('LABYRINTH_ZONE_ID'), 'the run belongs to the labyrinth');
assert.ok(first.board > 9 && first.packs >= 4, 'the battlefield is the maze, not the 9×8 board');

const saved = copy('JSON.parse(serializeSaveState(game)).actExploration');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));recoverRuntimeState();');
assert.equal(run('game.actExploration.layoutId'), first.layoutId, 'a reload rebuilds the same maze from the saved spec');
assert.deepEqual(copy('game.actExploration.source'), saved.source);
runtime.broken = { ...saved, source: { ...saved.source, style: 'volcano' } };
assert.throws(() => run('actExplorationState.validate(broken,[])'), /생성 탐험 맵 명세|지원하지 않는/, 'a corrupt spec is refused at the save boundary');

while (tick < 4000 && run('game.labyrinthFloor') === 12) advance();
assert.equal(run('game.labyrinthFloor'), 13, 'clearing the maze boss advances to floor 13');
for (let n = 0; n < 200 && run('!game.actExploration || game.actExploration.layoutId === ' + JSON.stringify(first.layoutId)); n++) advance();
const second = copy('{style:game.actExploration.source.style,layoutId:game.actExploration.layoutId,status:game.actExploration.status}');
assert.equal(second.style, 'maze', 'floor 13 is a maze too');
assert.notEqual(second.layoutId, first.layoutId, 'and a different one');
console.log('content maps: 6 styles × 3 sizes × 40 seeds whole, stable specs, labyrinth maze run, save round trip: OK');
