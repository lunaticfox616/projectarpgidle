import { mapTurned, mapCompile } from './exploration-map-compile.mjs';
import { mapRoute, mapIndex } from './exploration-map-path.mjs';
import { GENERATED_KEEP } from './act-exploration-map-values.mjs';

/** @returns {Readonly<Layout>|null} Compiles each static preset once per facing. */
export function mapLayout(env, act,rotation) {
    const source=env.deps.ACT_EXPLORATION_MAPS.find(row=>row.act===act);if(!source)return null;
    const oriented=mapTurned(source,rotation),key=`${act}:${oriented.rotation}`;
    if(env.memo.cache.has(key))return env.memo.cache.get(key);
    const result=mapCompile(oriented,act);
    env.memo.cache.set(key,result);return result;
}

// a few recent seeds: the live run, its arrival and the map screen
/** @returns {Readonly<Layout>} the map explorationLayouts builds for spec, checked to be whole (throws if not). */
export function mapGenerated(env, spec,rotation) {
    const oriented=mapTurned(env.deps.explorationLayouts.build(spec),rotation),key=env.deps.explorationLayouts.key(spec)+':'+oriented.rotation;
    if(env.memo.generatedCache.has(key))return env.memo.generatedCache.get(key);
    const result=mapCompile(oriented);
    mapAssertWhole(result,key);
    env.memo.generatedCache.set(key,result);
    if(env.memo.generatedCache.size>GENERATED_KEEP)env.memo.generatedCache.delete(env.memo.generatedCache.keys().next().value);
    return result;
}

/** Every room is reachable from the entry, and the boss room only through its one-cell gate. */
function mapAssertWhole(map,key) {
    const boss=map.rooms.find(room=>room.role==='boss');
    if(!map.entry || !boss)throw Error('생성 탐험 맵에 입구나 보스 방이 없습니다: '+key);
    const unreached=map.rooms.filter(room=>room!==boss && !mapRoute(map,map.entry,room).length && !mapSame(room,map.entry));
    if(unreached.length)throw Error('생성 탐험 맵이 끊겼습니다: '+key+' '+unreached.map(room=>room.id).join(','));
    if(mapRoute(map,map.entry,boss,new Set([mapIndex(map,map.gate)])).length)throw Error('생성 탐험 맵의 보스 방이 관문 밖으로 열려 있습니다: '+key);
}

function mapSame(a,b) {return a.gx===b.gx&&a.gy===b.gy;}

/** The map a run walks: its generated source, else its story act's authored map, turned to the run's facing. Remembered per
 * run while its source, act and facing stay the same: every grid bounds check asks for it (thousands of times a second with
 * summons pathing), and generated() normalised and rebuilt the spec before its own cache lookup (2026-10-07 frame drops). */
export function mapForRun(env, run) {
    const hit=env.memo.runMaps.get(run);
    if(hit&&hit.source===run.source&&hit.act===run.act&&hit.rotation===run.rotation&&hit.rooms===run.rooms)return hit.map;
    const map=mapMapOf(env, run);
    env.memo.runMaps.set(run,{source:run.source,act:run.act,rotation:run.rotation,rooms:run.rooms,map});
    return map;
}

/** A run marked rooms walks the room-by-room stage layout of its map (js/act-exploration-rooms.js), whatever its facing. */
function mapMapOf(env, run) {
    if(run.rooms)return env.deps.actExplorationRooms.forRun(run);
    return run.source?mapGenerated(env, run.source,run.rotation):mapLayout(env, run.act,run.rotation);
}

/** One three-cell group in the longest quiet approach. Existing terrain stays unchanged; gate stays sealed.
 * Cached per immutable layout, not searched during movement/render ticks. Boss-only arenas have no candidate. */
export function mapRoadGroup(env, map) {
    if(map.stage)return null; // 방 단위 지도에는 방 사이의 길이 없다
    if(env.memo.roadGroups.has(map))return env.memo.roadGroups.get(map);
    const blocked=new Set([mapIndex(map,map.gate)]);
    let best=null,score=5;
    for(const room of map.rooms.filter(row=>row.role==='battle')) {
        const path=mapRoute(map,map.entry,room,blocked);
        for(let i=1;i<path.length-1;i++) {
            const cell=path[i];
            const distance=Math.min(...map.rooms.map(row=>Math.abs(row.gx-cell.gx)+Math.abs(row.gy-cell.gy)));
            if(distance<=score)continue;
            score=distance;best={roomId:room.id,anchor:cell,cells:[cell,path[i-1],path[i+1]]};
        }
    }
    if(best) {
        best.anchor=Object.freeze({...best.anchor});
        best.cells=Object.freeze(best.cells.map(cell=>Object.freeze({...cell})));
        Object.freeze(best);
    }
    env.memo.roadGroups.set(map,best);return best;
}
