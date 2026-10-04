const assert=require('node:assert/strict');
const {runtime,run}=require('./lib/replay-fixture')(51);
run('game.currentZoneId=0;startEncounterRun(true);');
const map=run('actExplorationMap.layout(1)'),gate=map.gate;
const floor=map.rooms.find(r=>r.role==='entry');
const wall={gx:0,gy:0},outside={gx:-1,gy:-1};
const cells=[floor,wall,outside,gate];
const projection={tileW:16,tileH:16,cellToScreen:(gx,gy)=>({x:gx*16+8,y:gy*16+8})};
let path=[],clips=[],paints=[];
const ctx=new Proxy({}, {get:(target,key)=>key in target?target[key]:(...args)=>{
    if(key==='beginPath')path=[];
    if(key==='rect')path.push(args);
    if(key==='clip')clips.push(path.slice());
    if(key==='fill')paints.push({style:target.fillStyle,rects:path.slice()});
    if(key==='fillRect')paints.push({style:target.fillStyle,rects:[args]});
}});
runtime.groundCtx=ctx;runtime.groundProjection=projection;runtime.groundCells=cells;
run('game.enemies=[{id:77,hp:1,...groundCells[0]}];');
const before=run('JSON.stringify(game)');
for(const skin of ['rift','pixel']) {
    runtime.document.body.dataset.uiSkin=skin;paints=[];
    run('drawBattleGridFloor(groundCtx,groundProjection,{},[],groundCells,true);');
    const range=paints.filter(p=>['rgba(214, 170, 92, 0.12)','rgba(124, 255, 214, 0.12)'].includes(p.style));
    assert.equal(range.length,1,skin+': only the walkable cell is highlighted, even when an enemy occupies it');
    assert.equal(Math.floor(range[0].rects[0][0]/16),floor.gx);
}
for(const shape of ['square','circle','cone']) {
    runtime.groundArea={cells,center:floor,radius:map.columns,shape};
    if(shape==='cone')runtime.groundArea.cone={vertices:[floor,gate,wall]};
    clips=[];
    run('drawSkillFootprintGround(groundCtx,projectSkillFootprint(groundArea,groundProjection,groundCells[0]),"#fff",1);');
    const terrain=clips[0].map(([x,y])=>({gx:x/16,gy:y/16}));
    assert.ok(terrain.length>0);
    for(const cell of terrain)assert.equal(run(`actExplorationMap.walkable(actExplorationMap.layout(1),${JSON.stringify(cell)},true)`),true,
        shape+': no wall, outside or closed gate can remain in the ground clip');
    assert.ok(terrain.some(c=>c.gx===floor.gx&&c.gy===floor.gy),'occupied floor is still painted');
    paints=[]; clips=[];
    run('drawBattleDangerEdges(groundCtx,{layout:[{enemy:{isBoss:true,hp:1,attackTimer:0.9,patternArea:groundArea}}],projection:groundProjection});');
    assert.equal(paints.length,0,'foreground danger redraw adds an outline without covering actors with another fill');
    assert.ok(clips[0].length>0,'foreground outline preserves terrain clipping');
    clips=[];
    run('drawBattleDangerEdges(groundCtx,{layout:[],pending:[{delivery:"patternArea",bossPattern:{area:groundArea}}],projection:groundProjection});');
    assert.ok(clips[0].length>0,'released attacks keep their foreground edge until impact');
}
assert.equal(run('JSON.stringify(game)'),before,'rendering leaves combat geometry and ownership untouched');
run('game.actExploration.packs.forEach(p=>p.aliveIds=p.aliveIds.filter(id=>!p.eliteIds.includes(id)));');
paints=[];
run('drawBattleGridFloor(groundCtx,groundProjection,{},[],groundCells,true);');
assert.equal(paints.filter(p=>p.style==='rgba(124, 255, 214, 0.12)').length,2,'opening the gate immediately restores its highlight');
run('actExplorationProgress.depart(game);');clips=[];
run('drawSkillFootprintGround(groundCtx,projectSkillFootprint({shape:"square",center:{gx:1,gy:1},cells:[{gx:1,gy:1}]},groundProjection),"#fff",1);');
assert.equal(clips.length,0,'legacy arenas without terrain preserve their existing ground display');
console.log('Terrain display: all skins, square/circle/cone, walls, outside, occupied floor and sealed/open gates OK');
