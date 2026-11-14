import { dirs, N8, MOVES } from './gem-cast-values.mjs';
import { gemGrow } from './gem-cast-math.mjs';

export function gemCell(unit) { return {gx:unit.gx, gy:unit.gy}; }

export function gemSame(a, b) { return a.gx===b.gx && a.gy===b.gy; }

export function gemDistance(a, b) { return Math.hypot(a.gx-b.gx,a.gy-b.gy); }

export function gemFacing(env, enemy,source) {
    const center=env.deps.getGridUnitCenter(enemy),x=source.gx-center.gx,y=source.gy-center.gy;
    return Math.abs(x)>=Math.abs(y) ? (x<0?4:6) : (y<0?8:2);
}

export function gemBehind(env, enemy,source) {
    const direction=enemy.facingDirection || gemFacing(env, enemy,source);
    const size=env.deps.getGridUnitFootprint(enemy),destination=gemCell(enemy);
    if(direction===4)destination.gx+=size.columns;
    if(direction===6)destination.gx--;
    if(direction===8)destination.gy+=size.rows;
    if(direction===2)destination.gy--;
    return destination;
}

/** A landing cell: on the board, walkable (walls and sealed gates block), not under a living enemy, not where the story guide
 * stands (js/act-exploration-doors.js guideCells) and not on a map object (a chest, a jar, a nest: like grid blinks, 2026-10-20). */
export function gemFree(env, destination,enemies) {
    const taken=new Set(enemies.flatMap(e=>env.deps.getGridUnitCells(e).map(c=>env.deps.gridCellKey(c.gx,c.gy)))),run=env.deps.actExplorationState.current(env.owner);
    env.deps.actExplorationDoors.guideCells(run).forEach(key=>taken.add(key));
    env.deps.actExplorationState.objects.solidCells(run).forEach(key=>taken.add(key));
    return env.deps.canPlaceGridFootprint(taken,destination.gx,destination.gy,{columns:1,rows:1});
}

export function gemNearness(c, source) { return Math.max(Math.abs(c.gx-source.gx),Math.abs(c.gy-source.gy))*100+(c.gx-source.gx)**2+(c.gy-source.gy)**2; }

/** Where 암살 may land, in order: straight behind the enemy, then its two sides (the one nearer the caster first). */
export function gemBlindSpots(env, enemy,source) {
    const direction=enemy.facingDirection || gemFacing(env, enemy,source),size=env.deps.getGridUnitFootprint(enemy),at=gemCell(enemy);
    const sides=direction===4 || direction===6 ? [{gx:at.gx,gy:at.gy-1},{gx:at.gx,gy:at.gy+size.rows}]
        : [{gx:at.gx-1,gy:at.gy},{gx:at.gx+size.columns,gy:at.gy}];
    return [gemBehind(env, enemy,source),...sides.sort((a,b)=>gemNearness(a,source)-gemNearness(b,source))];
}

export function gemLanding(env, enemy,source,enemies) {return gemBlindSpots(env, enemy,source).find(c=>gemFree(env, c,enemies)) || null;}

/** Facing (2/4/6/8) from the landing cell toward the enemy: the dagger strikes from where the assassin stands. */
export function gemToward(env, from,enemy) {
    const center=env.deps.getGridUnitCenter(enemy),x=center.gx-from.gx,y=center.gy-from.gy;
    return Math.abs(x)>=Math.abs(y) ? (x<0?4:6) : (y<0?8:2);
}

export function gemOnCross(c, center, radius) {const x=Math.abs(c.gx-center.gx),y=Math.abs(c.gy-center.gy);return (x===0 || y===0) && x+y<=radius;}

export function gemCross(env, source,target,radius=1) {
    for(const [direction,[x,y]] of Object.entries(dirs)) {
        const center={gx:source.gx+x*2,gy:source.gy+y*2};
        if(env.deps.hasGridCell(center) && env.deps.getGridUnitCells(target).some(c=>gemOnCross(c,center,radius))) {
            return {center,direction:Number(direction)};
        }
    }
    return null;
}

export function gemInArea(id,source,c,range) {
    if(id===45 || id===50)return Math.max(Math.abs(c.gx-source.gx),Math.abs(c.gy-source.gy))<=range && !gemSame(c,source);
    return gemDistance(source,c)<=range;
}

export function gemArea(env, enemies,center,shape,radius) {
    return enemies.filter(e=>e.hp>0 && env.deps.getGridUnitCells(e).some(c=>{
        const x=Math.abs(c.gx-center.gx),y=Math.abs(c.gy-center.gy);
        if(shape==='cross')return (x===0 || y===0) && x+y<=radius;
        if(shape==='square')return Math.max(x,y)<=radius;
        if(shape==='ring')return gemDistance(c,center)>radius-.5 && gemDistance(c,center)<=radius+.5;
        return gemDistance(c,center)<=radius;
    }));
}

/** The pattern's floor cells on the live board: the act map on wide maps, in bounds and walkable (walls and sealed
 * gates stay dark). It used to pick from a fixed 9×8 board, so a wide map's floor strikes drew nothing. */
export function gemCells(env, center,shape,radius) {
    const board=[],open=new Set();
    for(let gy=Math.floor(center.gy-radius);gy<=Math.ceil(center.gy+radius);gy++) {
        for(let gx=Math.floor(center.gx-radius);gx<=Math.ceil(center.gx+radius);gx++) {
            if(env.deps.canPlaceGridFootprint(open,gx,gy,{columns:1,rows:1}))board.push({gx,gy,hp:1});
        }
    }
    return gemArea(env, board,center,shape,radius).map(gemCell);
}

export function gemReach2(a, b) { return (a.gx-b.gx)**2+(a.gy-b.gy)**2; }

export function gemLineCells(a,b) {
    const n=Math.max(Math.abs(b.gx-a.gx),Math.abs(b.gy-a.gy)),out=[];
    for(let i=1;i<=n;i++)out.push({gx:Math.round(a.gx+(b.gx-a.gx)*i/n),gy:Math.round(a.gy+(b.gy-a.gy)*i/n)});
    return out;
}

/** The neighbour of c that passes ok and lies nearest the caster (straight before diagonal on a tie). */
export function gemNearestNeighbour(c,source,ok) {
    let best=null,bd=Infinity;
    for(const [dx,dy] of N8) {
        const q={gx:c.gx+dx,gy:c.gy+dy},d=gemReach2(q,source)+(dx && dy?.01:0);
        if(d<bd && ok(q)){bd=d;best=q;}
    }
    return best;
}

/** 차원찢기 lands on the aimed cell if free, else on the first free cell back toward the caster, else on the aimed
 * cell's free neighbour nearest the caster — always within reach. */
export function gemLandNear(env, source,want,enemies,range) {
    const ok=c=>!gemSame(c,source) && gemReach2(source,c)<=range*range && gemFree(env, c,enemies);
    return ok(want) ? gemCell(want) : (gemLineCells(want,source).find(ok) || gemNearestNeighbour(want,source,ok));
}

/** 향로구름: the target's free neighbour nearest the caster. */
export function gemBesideTarget(env, source,target,enemies) {return gemNearestNeighbour(target,source,c=>!gemSame(c,source) && gemFree(env, c,enemies));}

/** 작살화살: the last free cell on the way in when it touches the target, else the target's free neighbour nearest the
 * archer; none when the archer already stands next to it. */
export function gemPullLanding(env, source,target,enemies) {
    const touches=c=>Math.max(Math.abs(c.gx-target.gx),Math.abs(c.gy-target.gy))<=1;
    if(touches(source))return null;
    const before=gemLineCells(source,target).slice(0,-1).reverse().find(c=>gemFree(env, c,enemies));
    return before && touches(before) ? before : gemNearestNeighbour(target,source,c=>gemFree(env, c,enemies));
}

export function gemMoveTargets(env, id,source,live,extra) {
    const range=gemMoveReach(id,extra);
    return live.filter(e=>{
        const aim=env.deps.getClosestGridUnitCell(source,e);
        if(gemReach2(source,aim)>range*range)return false;
        if(id===56 || id===77)return true;
        return !!(id===55 ? gemBesideTarget(env, source,aim,live) : gemLandNear(env, source,aim,live,range));
    });
}

export function gemMoveReach(id, extra) { return MOVES[id].range+(MOVES[id].grows==='range'?extra:0); }

export function gemMoveRadius(c) { return 1+(MOVES[c.id].grows==='radius'?gemGrow(c.stats):0); }

export function gemMoveStart(env, state,c,enemies) {
    const live=enemies.filter(e=>e.hp>0);
    state.pose=c;
    return {live,aim:env.deps.getClosestGridUnitCell(c.source,live.find(e=>e.id===c.targetId))};
}

/** The planned landing — or, if an enemy walked onto it meanwhile, its free neighbour nearest the caster (the art and
 * the caster's motion follow c.move.to). Null when nothing around it is free. */
export function gemLandingNow(env, c,input) {
    const live=input.enemies.filter(e=>e.hp>0);
    if(gemFree(env, c.move.to,live))return c.move.to;
    const near=gemNearestNeighbour(c.move.to,c.move.from,q=>!gemSame(q,input.source) && gemFree(env, q,live));
    if(near)c.move.to=near;
    return near;
}

/** Where to stand beside the foe: its left or right neighbour on its middle row (the side nearer `from` first), else any free
 * neighbour nearest `from`. Never `from` itself, so the same foe is crossed to its other side. */
export function gemFlickerLanding(env, enemy,from,live) {
    const at=gemCell(enemy),size=env.deps.getGridUnitFootprint(enemy),gy=at.gy+Math.floor((size.rows-1)/2);
    const sides=[{gx:at.gx-1,gy},{gx:at.gx+size.columns,gy}];
    if(from.gx>env.deps.getGridUnitCenter(enemy).gx)sides.reverse();
    const ok=q=>!gemSame(q,from) && gemFree(env, q,live);
    return sides.find(ok) || gemNearestNeighbour(env.deps.getClosestGridUnitCell(from,enemy),from,ok);
}
