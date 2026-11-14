import { labels, events } from './exploration-objects-values.mjs';

export function propNear(a,b) {return Math.abs(a.gx-b.gx)+Math.abs(a.gy-b.gy);}

export function propCellKey(c) {return `${c.gx},${c.gy}`;}

export function propRandom(seed) {
    let value=seed>>>0;
    return () => {value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}

/** One draw over the loop's odds (data/maps.js EXPLORATION_EVENT_LOOPS); null for no event. */
export function propEventKind(env, loop,roll) {
    const band=env.deps.EXPLORATION_EVENT_LOOPS.find(row=>loop>=row.fromLoop);if(!band)return null;
    let edge=0;
    for(const [kind,chance] of band.odds){edge+=chance;if(roll<edge)return kind;}
    return null;
}

/** A supply chest's grade (data/maps.js EXPLORATION_CHEST_GRADES), fixed from the map seed and the row id on its own stream,
 * so placement draws stay as they were. chest: an atlas map's rules (js/atlas.js chestRules), null elsewhere. */
export function propChestGrade(env, seed,id,chest=null) {
    const next=propRandom(env.deps.hashSeed(`${seed}:${id}:grade`)>>>0);next();const roll=next();
    // Outside the atlas the odds sum to 1 as drawn: dividing by 1 keeps every roll exactly where it fell before.
    const rows=propGradeWeights(env, chest),total=chest?rows.reduce((sum,row)=>sum+row.weight,0):1;
    let edge=0;
    for(const row of rows){edge+=row.weight/total;if(roll<edge)return row.id;}
    return rows[rows.length-1].id;
}

/** Grade odds: as drawn, or in an atlas map silver and gold × (1 + grade %) and, with min, no wooden chests (보급 각인). */
function propGradeWeights(env, chest) {
    if(!chest)return env.deps.EXPLORATION_CHEST_GRADES;
    const up=1+Math.max(0,Number(chest.grade)||0)/100;
    return env.deps.EXPLORATION_CHEST_GRADES.map((row,index)=>({id:row.id,weight:index<(chest.min||0)?0:row.weight*(index?up:1)}));
}

/** More supply chests from an atlas map's rules (보급 각인 chestExtra). */
export function propExtraChests(chest) {return chest?Math.max(0,Math.floor(Number(chest.extra)||0)):0;}

/** The grade row of a supply chest; null for every other kind. */
export function propGrade(env, row) {return row.kind==='chest'?env.deps.EXPLORATION_CHEST_GRADES.find(g=>g.id===row.grade)||null:null;}

/** What the player reads: the chest's grade name, else the kind's label. */
export function propName(env, row) {return propGrade(env, row)?.label||labels[row.kind];}

export function propIsEvent(row) {return events.includes(row.kind);}

/** Standing objects take their cell: nobody walks onto a closed or opened chest, an unbroken pot, crate or nest (2026-10-05).
 * Broken pots and crates, a spent nest and ambush tracks lie on the floor. */
export function propSolid(row) {return row.kind==='chest'||row.kind==='sealed'||(['pot','crate','nest'].includes(row.kind)&&row.phase!=='spent');}

/** The sealed chest automatic exploration walks to and opens (2026-10-05 user decision): ordinary chests, pots and crates
 * wait for a click; a sealed chest's fight is part of the hunt. Null until one is discovered. */
export function propAutoTarget(env, run) {return (run?.objects?.entries||[]).find(e=>e.kind==='sealed'&&e.phase==='ready'&&propVisible(env, run,e))||null;}

export function propSolidCells(run) {return new Set((run?.objects?.entries||[]).filter(propSolid).map(propCellKey));}

export function propActive(run) {return (run.objects?.entries||[]).some(e=>e.phase==='warning'||e.phase==='active');}

/** The player knows the object's cell (js/act-exploration-sight.js: a visited room, or in fog mode a discovered cell). */
export function propVisible(env, run,row) {return env.deps.actExplorationSight.knownCell(run,row);}
