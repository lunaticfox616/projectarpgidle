import { ROTATIONS } from './act-exploration-map-values.mjs';

/** @typedef {{gx:number,gy:number}} Cell Integer map tile. */
/**
 * @typedef {object} Layout
 * @property {string} id Stable preset identifier ('gen:…' for generated maps).
 * @property {?number} act Story act, 1 through 10; null for a generated map.
 * @property {number} columns
 * @property {number} rows
 * @property {ReadonlyArray<number>} tiles Row-major wall=0, floor=1.
 * @property {Cell} entry
 * @property {Cell} gate
 * @property {number} rotation Clockwise quarter turns from the drawn plan (0 the gate north, 1 east, 2 south, 3 west).
 * @property {ReadonlyArray<{id:string,gx:number,gy:number,role:string}>} rooms
 */
function mapRotate(point, source) {
    let [gx,gy] = point, width=source.width, height=source.height;
    for(let turn=0;turn<source.rotation;turn++) {
        [gx,gy]=[height-1-gy,gx];[width,height]=[height,width];
    }
    return {gx,gy};
}

function mapCarve(tiles, source, point, radius=0) {
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
        const x=point[0]+dx,y=point[1]+dy;
        if(x<=0||y<=0||x>=source.width-1||y>=source.height-1)throw Error('액트 지형이 경계를 벗어납니다: '+source.id);
        tiles[y*source.width+x]=1;
    }
}

function mapCorridor(tiles, source, points, radius) {
    for(let i=1;i<points.length;i++) {
        const current=[...points[i-1]],end=points[i];
        mapCarve(tiles,source,current,radius);
        for(const axis of [0,1])while(current[axis]!==end[axis]) {
            current[axis]+=Math.sign(end[axis]-current[axis]);mapCarve(tiles,source,current,radius);
        }
    }
}

function mapFloors(source) {
    const tiles=Array(source.width*source.height).fill(0);
    const centers=new Map(source.rooms.map(room=>[room[0],[room[1],room[2]]]));
    for(const [,x,y,rx,ry] of source.rooms) {
        for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++)mapCarve(tiles,source,[x+dx,y+dy]);
    }
    for(const [from,to,bends=[]] of source.links) {
        mapCorridor(tiles,source,[centers.get(from),...bends,centers.get(to)],source.passage===1?0:1);
    }
    mapCorridor(tiles,source,[centers.get(source.approach),source.gate,centers.get('boss')],0);
    return tiles;
}

/** @returns {Readonly<Layout>} tiles, rooms, entry and gate of an authored or generated source (act = null if generated). */
export function mapCompile(source,act=null) {
    const columns=source.rotation%2?source.height:source.width, rows=source.rotation%2?source.width:source.height;
    const tiles=Array(columns*rows).fill(0),original=mapFloors(source);
    original.forEach((value,index)=>{
        const p=mapRotate([index%source.width,Math.floor(index/source.width)],source);tiles[p.gy*columns+p.gx]=value;
    });
    const rooms=source.rooms.map(([id,x,y,rx,ry,role])=>Object.freeze({id,...mapRotate([x,y],source),role,
        radiusX:source.rotation%2?ry:rx,radiusY:source.rotation%2?rx:ry}));
    return Object.freeze({id:source.id,act,biome:source.biome,columns,rows,tiles:Object.freeze(tiles),
        rooms:Object.freeze(rooms),entry:rooms.find(r=>r.role==='entry'),gate:Object.freeze(mapRotate(source.gate,source)),rotation:source.rotation});
}

/** @param {object} source authored or arena source; @param {number|undefined} rotation clockwise quarter turns, undefined for the authored one. */
export function mapTurned(source,rotation) {
    const turn=rotation===undefined?source.rotation:rotation;
    if(!Number.isInteger(turn)||turn<0||turn>=ROTATIONS)throw Error('탐험 맵 방향이 잘못되었습니다: '+rotation);
    return turn===source.rotation?source:{...source,rotation:turn};
}
