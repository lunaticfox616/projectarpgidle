const assert=require('node:assert/strict');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const runtime=buildGameRuntime();
const run=code=>vm.runInContext(code,runtime);
run('game=mergeDefaults({});');
assert.equal(run('getCombatGridSize().columns'),9);
assert.equal(run('isGridCellInBounds(20,20)'),false);
const fixed=run('JSON.stringify(COMBAT_GRID_CONFIG)');
for(let act=1;act<=10;act++) {
    runtime.act=act;
    run('game.currentZoneId=act-1;game.actExploration={act,zoneId:act-1,packs:[]};');
    const map=run('actExplorationMap.layout(act)');
    assert.equal(run('getCombatGridSize().columns'),map.columns);
    assert.equal(run('getCombatGridSize().rows'),map.rows);
    runtime.lastX=map.columns-1;runtime.lastY=map.rows-1;
    assert.equal(run('isGridCellInBounds(lastX,lastY)'),true);
    assert.equal(run('isGridCellInBounds(lastX+1,lastY)'),false);
    assert.equal(run('isGridCellInBounds(lastX,lastY+1)'),false);
    assert.equal(run('hasGridCell({gx:lastX,gy:lastY,isBoss:true})'),false,'2x2 actor cannot cross map boundary');
    assert.equal(run('hasGridCell({gx:lastX-1,gy:lastY-1,isBoss:true})'),true);
    const free=run('findFreeGridCell(new Set(),{gx:lastX,gy:lastY})');
    assert.equal(map.tiles[free.gy*map.columns+free.gx],1,'free cell must be floor, never map-border wall');
    run(`{
        const map=actExplorationMap.layout(act);
        game.gridPlayer={gx:map.entry.gx,gy:map.entry.gy,gridMoveTimer:0};
        allFloorHazards=map.tiles.flatMap((tile,index)=>tile?[{gx:index%map.columns,gy:Math.floor(index/map.columns)}]:[]);
    }`);
    assert.equal(run('findNearestSafeGridRoute(game.gridPlayer,allFloorHazards)'),null,
        'hazard escape cannot mistake walls for safe terrain');
    assert.equal(run('advanceGridHazardEscape(game.gridPlayer,allFloorHazards,1,0.1).blocked'),true);
    assert.equal(run('game.gridPlayer.gx'),map.entry.gx,'failed escape preserves position');
    assert.equal(run('game.gridPlayer.gy'),map.entry.gy);
    assert.equal(run('JSON.stringify(COMBAT_GRID_CONFIG)'),fixed,'map changes never mutate shared constants');
}
run("game.currentZoneId='trial_1';");
assert.equal(run('getCombatGridSize().columns'),9,'special content keeps its original battlefield');
assert.equal(run('isGridCellInBounds(20,20)'),false);
run('const replay={currentZoneId:2,actExploration:{act:3,zoneId:2}};');
assert.equal(run('getCombatGridSize(replay).columns'),49);
assert.equal(run('getCombatGridSize().columns'),9,'background snapshot cannot resize live arena');
console.log('ten map sizes, footprint boundaries, free cells, special arenas and isolated replay dimensions: OK');
