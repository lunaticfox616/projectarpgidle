
const SHAPES=Object.freeze({
        cluster:[[0,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[0,-1],[-1,1],[1,0]],
        line:[[0,0],[1,0],[-1,0],[2,0],[-2,0],[3,0],[-3,0],[4,0],[-4,0]],
        column:[[0,0],[0,1],[0,-1],[0,2],[0,-2],[1,0],[-1,0],[1,1],[-1,-1]],
        loose:[[0,0],[-2,0],[0,1],[2,-1],[-2,-1],[2,1],[0,-1],[-2,1],[2,0]]
    });

function packLayoutWeightedPick(deps, rows) {
        let roll=deps.random()*rows.reduce((sum,row)=>sum+row.weight,0);
        return rows.find(row=>(roll-=row.weight)<0) || rows[0];
    }

function packLayoutFarSign(deps, map,room) {
        const back=map.hops[room.index][map.entry.index];
        if(back && back.side==='east')return -1;
        if(back && back.side==='west')return 1;
        return deps.random()<.5?1:-1;
    }

function packLayoutOpenRoom(deps, map,room) {
        return {room,layout:packLayoutWeightedPick(deps, deps.STAGE_ROOMS.layouts),sign:packLayoutFarSign(deps, map,room),taken:new Set()};
    }

function packLayoutSpotCentre(state,slot) {
        const room=state.room,[fx,fy]=state.layout.spots[slot%state.layout.spots.length];
        return {gx:room.gx+Math.round(fx*state.sign*Math.max(0,room.radiusX-3)),gy:room.gy+Math.round(fy*Math.max(0,room.radiusY-2))};
    }

const packLayoutRingAround=(at,ring)=>{
        const out=[];
        for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===ring)out.push({gx:at.gx+dx,gy:at.gy+dy});
        return out;
    };

function packLayoutFreeCellNear(state,want) {
        const room=state.room,inner=cell=>cell.gx>room.x0 && cell.gx<room.x1 && cell.gy>room.y0 && cell.gy<room.y1;
        for(let ring=0;ring<=room.radiusX*2;ring++) {
            const cell=packLayoutRingAround(want,ring).find(spot=>inner(spot) && !state.taken.has(spot.gx+','+spot.gy));
            if(cell){state.taken.add(cell.gx+','+cell.gy);return cell;}
        }
        return want;
    }

function packLayoutPackCells(deps, state,slot,count) {
        const centre=packLayoutSpotCentre(state,slot),shape=SHAPES[packLayoutWeightedPick(deps, deps.STAGE_ROOMS.packShapes).id];
        return Array.from({length:count},(_,index)=>{
            const [dx,dy]=shape[index] || [0,0];
            return packLayoutFreeCellNear(state,{gx:centre.gx+dx,gy:centre.gy+dy});
        });
    }

function packLayoutForMap(deps, map) {
        const states=new Map();
        const stateOf=room=>states.get(room.id) || states.set(room.id,packLayoutOpenRoom(deps, map,room)).get(room.id);
        return {cells:(room,slot,count)=>(map.stage?packLayoutPackCells(deps, stateOf(room),slot,count):null),front:room=>packLayoutApproach(map,room)};
    }

function packLayoutApproach(map,room) {
        return map.hops[room.index][map.entry.index]?.landing || map.entry;
    }

export function createStageRoomArranger(deps) {
    return Object.freeze({
        forMap: (map) => packLayoutForMap(deps, map)
    });
}
