// A room-map specification is attached to a copy of the zone; active runs retain their saved specification.
const arenaForBoard=(rules,zone)=>({style:'act',act:rules.acts[zone.type],seed:`arena:${zone.type}`,arena:true});

function chainForBoard(rules,zone,rooms) {
    const chain=Math.max(1,Math.min(rules.chainMax,Math.floor(rooms)));
    return {style:'act',act:rules.acts[zone.type],seed:`${zone.type}:${chain}`,chain};
}

export function createBoardRoutes(deps) {
    const arena=zone=>arenaForBoard(deps.rules,zone);
    const markers=zone=>chainForBoard(deps.rules,zone,deps.countEncounterMarkers(zone)-1);
    const builders=Object.freeze({
        outsideChaos:arena,woodsmanEcho:arena,cosmos:markers,beyondBoundary:markers,
        oceanDepth:zone=>deps.oceanBoundary()>0?arena(zone):markers(zone),
        colony:arena,grandBreach:arena
    });
    return Object.freeze({
        withRooms(zone) {
            const rooms=!!zone&&!!builders[zone.type]&&deps.enabled();
            return rooms?{...zone,exploration:builders[zone.type](zone)}:zone;
        }
    });
}
