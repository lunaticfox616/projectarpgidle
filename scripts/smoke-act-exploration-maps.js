const assert=require('node:assert/strict');
const {buildGameRuntime}=require('./lib/game-runtime');
const vm=require('node:vm');
const runtime=buildGameRuntime();
const result=vm.runInContext(`ACT_EXPLORATION_MAPS.map(source=>{
    const map=actExplorationMap.layout(source.act),boss=map.rooms.find(r=>r.role==='boss');
    const blocked=new Set([actExplorationMap.index(map,map.gate)]);
    const skipped=new Set();
    for(const room of map.rooms.filter(r=>r.role==='optional')) {
        for(let y=room.gy-room.radiusY;y<=room.gy+room.radiusY;y++)
            for(let x=room.gx-room.radiusX;x<=room.gx+room.radiusX;x++)skipped.add(y*map.columns+x);
    }
    return {act:source.act,id:map.id,columns:map.columns,rows:map.rows,tiles:[...map.tiles],
        gate:map.gate,entry:map.entry,rooms:map.rooms,
        paths:map.rooms.map(room=>({id:room.id,role:room.role,
            open:actExplorationMap.route(map,map.entry,room).length,
            skipped:actExplorationMap.route(map,map.entry,room,skipped).length,
            sealed:actExplorationMap.route(map,map.entry,room,blocked).length})),
        visible:actExplorationMap.visibleCells(map,map.entry),
        bossIndex:actExplorationMap.index(map,boss),
        invalid:actExplorationMap.route(map,map.entry,{gx:-1,gy:0}).length};
})`,runtime);
assert.equal(result.length,10);
const signatures=new Set();
for(const map of result) {
    signatures.add(map.columns+'x'+map.rows+':'+map.tiles.join(''));
    assert.equal(map.invalid,0);
    assert.equal(map.visible.includes(map.bossIndex),false,'boss starts undiscovered');
    assert.ok(map.rooms.filter(r=>r.role==='elite').length>=2);
    assert.ok(map.rooms.filter(r=>r.role==='optional').length>=2);
    for(const path of map.paths) {
        if(path.role==='entry')continue;
        assert.ok(path.open>0,`act ${map.act}: ${path.id} is reachable`);
        if(path.role!=='optional')assert.ok(path.skipped>0,`act ${map.act}: optional rooms can actually be skipped`);
        if(path.role==='boss')assert.equal(path.sealed,0,`act ${map.act}: boss has no bypass`);
        else assert.ok(path.sealed>0,`act ${map.act}: ${path.id} reachable before unlocking`);
    }
    // Every walkable tile is connected, not just named room anchors.
    const queue=[map.entry.gy*map.columns+map.entry.gx],reached=new Set(queue);
    for(let i=0;i<queue.length;i++) {
        const key=queue[i],x=key%map.columns,y=Math.floor(key/map.columns);
        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nx=x+dx,ny=y+dy,next=ny*map.columns+nx;
            if(nx<0||ny<0||nx>=map.columns||ny>=map.rows||!map.tiles[next]||reached.has(next))continue;
            reached.add(next);queue.push(next);
        }
    }
    assert.equal(reached.size,map.tiles.filter(Boolean).length,`act ${map.act}: no disconnected islands`);
}
assert.equal(signatures.size,10,'every act has a different layout');
assert.equal(vm.runInContext('actExplorationMap.layout(11)',runtime),null);
console.log('10 distinct authored maps: complete connectivity, sealed boss access, elites, optional paths and fog: OK');
