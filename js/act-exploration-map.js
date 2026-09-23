// Pure authored-map geometry. No game, combat, DOM or renderer dependency.
const actExplorationMap = (() => {
    const cache = new Map();
    /** @typedef {{gx:number,gy:number}} Cell Integer map tile. */
    /**
     * @typedef {object} Layout
     * @property {string} id Stable authored preset identifier.
     * @property {number} act Story act, 1 through 10.
     * @property {number} columns
     * @property {number} rows
     * @property {ReadonlyArray<number>} tiles Row-major wall=0, floor=1.
     * @property {Cell} entry
     * @property {Cell} gate
     * @property {ReadonlyArray<{id:string,gx:number,gy:number,role:string}>} rooms
     */
    function rotate(point, source) {
        let [gx,gy] = point, width=source.width, height=source.height;
        for(let turn=0;turn<source.rotation;turn++) {
            [gx,gy]=[height-1-gy,gx];[width,height]=[height,width];
        }
        return {gx,gy};
    }
    function carve(tiles, source, point, radius=0) {
        for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
            const x=point[0]+dx,y=point[1]+dy;
            if(x<=0||y<=0||x>=source.width-1||y>=source.height-1)throw Error('액트 지형이 경계를 벗어납니다: '+source.id);
            tiles[y*source.width+x]=1;
        }
    }
    function corridor(tiles, source, points, radius) {
        for(let i=1;i<points.length;i++) {
            const current=[...points[i-1]],end=points[i];
            carve(tiles,source,current,radius);
            for(const axis of [0,1])while(current[axis]!==end[axis]) {
                current[axis]+=Math.sign(end[axis]-current[axis]);carve(tiles,source,current,radius);
            }
        }
    }
    function floors(source) {
        const tiles=Array(source.width*source.height).fill(0);
        const centers=new Map(source.rooms.map(room=>[room[0],[room[1],room[2]]]));
        for(const [,x,y,rx,ry] of source.rooms) {
            for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++)carve(tiles,source,[x+dx,y+dy]);
        }
        for(const [from,to,bends=[]] of source.links) {
            corridor(tiles,source,[centers.get(from),...bends,centers.get(to)],source.passage===1?0:1);
        }
        corridor(tiles,source,[centers.get(source.approach),source.gate,centers.get('boss')],0);
        return tiles;
    }
    /** @returns {Readonly<Layout>|null} Compiles each static preset once. */
    function layout(act) {
        if(cache.has(act))return cache.get(act);
        const source=ACT_EXPLORATION_MAPS.find(row=>row.act===act);if(!source)return null;
        const columns=source.rotation%2?source.height:source.width, rows=source.rotation%2?source.width:source.height;
        const tiles=Array(columns*rows).fill(0),original=floors(source);
        original.forEach((value,index)=>{
            const p=rotate([index%source.width,Math.floor(index/source.width)],source);tiles[p.gy*columns+p.gx]=value;
        });
        const rooms=source.rooms.map(([id,x,y,rx,ry,role])=>Object.freeze({id,...rotate([x,y],source),role,
            radiusX:source.rotation%2?ry:rx,radiusY:source.rotation%2?rx:ry}));
        const result=Object.freeze({id:source.id,act,biome:source.biome,columns,rows,tiles:Object.freeze(tiles),
            rooms:Object.freeze(rooms),entry:rooms.find(r=>r.role==='entry'),gate:Object.freeze(rotate(source.gate,source)),rotation:source.rotation});
        cache.set(act,result);return result;
    }
    function index(map,cell) {return cell.gy*map.columns+cell.gx;}
    function inBounds(map,cell) {
        if(!Number.isInteger(cell.gx)||!Number.isInteger(cell.gy))return false;
        return cell.gx>=0&&cell.gy>=0&&cell.gx<map.columns&&cell.gy<map.rows;
    }
    function walkable(map,cell,sealed=false) {
        if(!inBounds(map,cell))return false;
        return map.tiles[index(map,cell)]===1&&!(sealed&&cell.gx===map.gate.gx&&cell.gy===map.gate.gy);
    }
    function neighbors(map,cell) {
        return [{gx:cell.gx-1,gy:cell.gy},{gx:cell.gx+1,gy:cell.gy},
            {gx:cell.gx,gy:cell.gy-1},{gx:cell.gx,gy:cell.gy+1}].filter(p=>walkable(map,p));
    }
    /** @param {Set<number>} blocked Row-major tile indices, including a sealed gate if needed. */
    function route(map,from,to,blocked=new Set()) {
        if(!walkable(map,from)||!walkable(map,to)||blocked.has(index(map,to)))return [];
        const parents=routeParents(map,from,to,blocked),begin=index(map,from),end=index(map,to);
        if(!parents.has(end))return [];
        const path=[];let cursor=end;
        while(cursor!==begin){path.push({gx:cursor%map.columns,gy:Math.floor(cursor/map.columns)});cursor=parents.get(cursor);}
        return path.reverse();
    }
    function routeParents(map,from,to,blocked) {
        const begin=index(map,from),end=index(map,to),parents=new Map([[begin,null]]),queue=[from];
        for(let cursor=0;cursor<queue.length;cursor++) {
            const current=queue[cursor],key=index(map,current);if(key===end)break;
            for(const next of neighbors(map,current)) {
                const id=index(map,next);if(parents.has(id)||blocked.has(id))continue;
                parents.set(id,key);queue.push(next);
            }
        }
        return parents;
    }
    /** Visible floor plus bordering wall tiles, reached through floor rather than through walls. */
    function visibleCells(map,from,radius=5) {
        if(!walkable(map,from))return [];
        const queue=[{...from,distance:0}],seen=new Set();
        for(let cursor=0;cursor<queue.length;cursor++) {
            const cell=queue[cursor],id=index(map,cell);if(seen.has(id))continue;
            seen.add(id);if(cell.distance>=radius||!walkable(map,cell))continue;
            for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const gx=cell.gx+dx,gy=cell.gy+dy;
                if(inBounds(map,{gx,gy}))queue.push({gx,gy,distance:cell.distance+1});
            }
        }
        return [...seen];
    }
    return {layout,index,walkable,neighbors,route,visibleCells};
})();
safeExposeGlobals({actExplorationMap});
