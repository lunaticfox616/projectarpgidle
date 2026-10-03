// 넓은 맵 명세와 콘텐츠 맵 (js/exploration-layouts.js · js/content-maps.js, docs/atlas-pinnacles-20261002.md 1절):
// 생성 미로 · 섬 · 갱도 대신 그림이 완성된 액트 지도 10장을 다시 쓴다. 모든 지도와 보스만 서는 변형이 온전하고, 같은 명세는 같은 맵,
// 저장은 명세로 다시 짓고, 예전 생성 맵을 걷던 저장은 그 런만 버리고 새 지도로 다시 시작한다. 고대 미궁은 실제 전투로 층을 넘는다.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { runtime, run } = fixture(31);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// ---------------------------------------------------------------- every act map, as a map and as a boss arena
const survey = copy(`(() => {
    const out = [];
    for (let act = 1; act <= 10; act++) for (const arena of [false, true]) {
        const spec = arena ? { style: 'act', act, seed: 's', arena: true } : { style: 'act', act, seed: 's' };
        try {
            const map = actExplorationMap.generated(spec), roles = map.rooms.map(room => room.role), source = ACT_EXPLORATION_MAPS.find(row => row.act === act);
            out.push({ act, arena, ok: true, id: map.id, art: !!ACT_EXPLORATION_BACKDROPS[map.id], sameId: map.id === source.id,
                elites: roles.filter(role => role === 'elite').length, monsters: actExplorationState.packRooms(map).length,
                bosses: roles.filter(role => role === 'boss').length, entries: roles.filter(role => role === 'entry').length,
                startsAtGate: map.entry.id === source.approach });
        } catch (error) { out.push({ act, arena, ok: false, error: error.message }); }
    }
    return out;
})()`);
assert.deepEqual(survey.filter(row => !row.ok), [], 'every act map is whole: all rooms reachable, the boss room only through its gate');
assert.ok(survey.every(row => row.bosses === 1 && row.entries === 1 && row.sameId && row.art), 'one boss, one entry, and the painted backdrop of that act');
assert.ok(survey.filter(row => !row.arena).every(row => row.elites >= 1 && row.monsters >= 4 && !row.startsAtGate), 'a map keeps its elite rooms and starts at its entry');
assert.ok(survey.filter(row => row.arena).every(row => row.monsters === 0 && row.startsAtGate), 'an arena has nothing but its boss and starts before its gate');

const same = copy(`(() => {
    const a = actExplorationMap.generated({ style: 'act', act: 4, seed: 'x' });
    const b = actExplorationMap.generated({ style: 'act', act: 4, seed: 'y' });
    return { key: explorationLayouts.key({ style: 'act', act: 4, seed: 'x' }), sameTiles: a.tiles.join('') === b.tiles.join(''),
        story: a.tiles.join('') === actExplorationMap.layout(4).tiles.join(''), storyAct: actExplorationMap.layout(4).act, act: a.act };
})()`);
assert.ok(same.sameTiles && same.story, 'a spec walks the act map itself, whatever its seed');
assert.equal(same.key, 'act:4:map');
assert.deepEqual([same.storyAct, same.act], [4, null], 'the story run keeps its act; a content run on the same map is not a story act');
for (const bad of ["{ style: 'maze', biome: 'maze', size: 2, seed: 1 }", "{ style: 'act', act: 11, seed: 1 }", "{ style: 'act', act: 0 }"]) {
    assert.throws(() => run(`explorationLayouts.build(${bad})`), /넓은 맵 명세/, 'retired styles and unknown maps are refused');
}

// ---------------------------------------------------------------- contents walk the maps of their mood
const moods = copy(`({
    chaos: [1, 2, 10, 11, 21].map(depth => contentMaps.chaos(depth).exploration.act),
    labyrinth: [1, 2, 3].map(floor => contentMaps.labyrinth(floor).act),
    sky: [1, 2, 3, 4].map(floor => contentMaps.skyTower(floor).exploration.act),
    rift: [contentMaps.timeRift('past', 3).exploration.act, contentMaps.timeRift('future', 3).exploration.act],
    arena: contentMaps.arena('pinnacle_sky', 'aerial'),
    trials: TRIAL_ZONES.map(zone => contentMaps.trialCorridor(zone).exploration.act)
})`);
assert.deepEqual(moods.chaos, [1, 7, 10, 1, 1], 'chaos walks all ten maps, depth by depth');
assert.deepEqual(moods.labyrinth, [4, 7, 4], 'the labyrinth alternates the bookshelf maze and the hollow spiral');
assert.deepEqual(moods.sky, [3, 8, 10, 3], 'the sky tower climbs isles over the void');
assert.deepEqual(moods.rift, [2, 6], 'the past is the hedge courtyard, the future the same courtyard in ruins');
assert.deepEqual([moods.arena.act, moods.arena.arena], [3, true], 'a boss stands at the gate of the map that matches its look');
assert.ok(moods.trials.every(act => act >= 1 && act <= 10) && new Set(moods.trials).size === moods.trials.length, 'each trial has its own map');

// ---------------------------------------------------------------- the labyrinth through the real loop, save round trip
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
assert.deepEqual([first.source.style, first.source.act, first.layoutId], ['act', 7, 'hollow-spiral'], 'floor 12 walks the hollow spiral');
assert.equal(first.zoneId, run('LABYRINTH_ZONE_ID'), 'the run belongs to the labyrinth');
assert.ok(first.board > 9 && first.packs >= 4, 'the battlefield is the map, not the 9×8 board');

const saved = copy('JSON.parse(serializeSaveState(game)).actExploration');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));recoverRuntimeState();');
assert.equal(run('game.actExploration.layoutId'), first.layoutId, 'a reload rebuilds the same map from the saved spec');
assert.deepEqual(copy('game.actExploration.source'), saved.source);
runtime.broken = { ...saved, source: { ...saved.source, act: 13 } };
assert.throws(() => run('actExplorationState.validate(broken,[])'), /넓은 맵 명세|지원하지 않는/, 'a corrupt spec is refused at the save boundary');

while (tick < 4000 && run('game.labyrinthFloor') === 12) advance();
assert.equal(run('game.labyrinthFloor'), 13, 'clearing the boss advances to floor 13');
for (let n = 0; n < 200 && run('!game.actExploration || game.actExploration.layoutId === ' + JSON.stringify(first.layoutId)); n++) advance();
assert.equal(run('game.actExploration.layoutId'), 'braided-maze', 'floor 13 walks the bookshelf maze');

// ---------------------------------------------------------------- a save that walked a retired generated map
const retired = copy(`(() => {
    const save = JSON.parse(serializeSaveState(game));
    save.actExploration.source = { style: 'maze', biome: 'maze', size: 2, seed: 'old' };
    save.enemies = (save.enemies || []).concat([{ id: 999991, hp: 10, maxHp: 10, explorationPack: 'room:old' }]);
    const merged = mergeDefaults(save);
    const dropped = merged.actExploration === null && !merged.enemies.some(enemy => enemy.explorationPack === 'room:old');
    game = merged; window.game = game; recoverRuntimeState();
    for (let n = 0; n < 40 && !game.actExploration; n++) coreLoop(1800000000000 + 900000 + n * 100);
    return { dropped, restarted: game.actExploration && game.actExploration.source.style, zone: game.currentZoneId === LABYRINTH_ZONE_ID };
})()`);
assert.equal(retired.dropped, true, 'the run on a retired maze is dropped on load, its pack enemies with it');
assert.equal(retired.restarted, 'act', 'and the floor starts over on its painted map');
assert.equal(retired.zone, true, 'the hero stays in the labyrinth');
console.log('content maps: 10 act maps whole as maps and arenas, stable specs, content moods, labyrinth run, save round trip, retired runs dropped: OK');
