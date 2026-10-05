// Authored topology, not a random generator. Rooms use [id, centerX, centerY, radiusX, radiusY, role].
// terrain = the short name of the painted map; contents and atlas maps reuse these ten maps (js/exploration-layouts.js).
// Links use [from, to, optional orthogonal bend points]. Rotation is clockwise quarter turns.
// Every boss chamber has exactly one one-cell threshold; ordinary passages stay wider.
// Boss chambers are 9×5 (act 7: 7×5 — its deadwood room sits one wall column away) so a 2×2 boss has room to move.
const ACT_EXPLORATION_MAPS = Object.freeze([
    {
        act:1, id:'root-branches', terrain:'뿌리 동굴', biome:'root', width:39, height:35, rotation:0,
        gate:[19,7], approach:'crown',
        rooms:[['entry',19,31,2,2,'entry'],['hall',19,25,4,2,'battle'],
            ['fork',19,18,3,3,'battle'],['west',7,18,4,3,'elite'],
            ['east',31,18,4,3,'elite'],['twig',31,27,3,2,'optional'],
            ['hollow',6,10,3,2,'optional'],['crown',19,11,3,2,'battle'],['boss',19,4,4,2,'boss']],
        links:[['entry','hall'],['hall','fork'],['fork','west'],['fork','east'],
            ['east','twig'],['west','hollow'],['fork','crown']]
    },
    {
        act:2, id:'garden-circuit', terrain:'생울타리 중정', biome:'courtyard', width:43, height:35, rotation:0,
        gate:[21,7], approach:'balcony',
        rooms:[['entry',21,31,2,2,'entry'],['south',21,25,4,2,'battle'],
            ['west',8,25,3,2,'battle'],['east',34,25,3,2,'battle'],
            ['hedgeWest',8,14,3,3,'elite'],['hedgeEast',34,14,3,3,'elite'],
            ['alcove',3,20,1,2,'optional'],['arbor',39,20,1,2,'optional'],
            ['balcony',21,11,4,2,'battle'],['boss',21,4,4,2,'boss']],
        links:[['entry','south'],['south','west'],['south','east'],['west','hedgeWest'],
            ['east','hedgeEast'],['hedgeWest','balcony',[[8,11]]],['hedgeEast','balcony',[[34,11]]],
            ['west','alcove',[[3,25]]],['east','arbor',[[39,25]]]]
    },
    {
        act:3, id:'suspended-spans', terrain:'허공 널다리', biome:'aerial', width:35, height:49, rotation:1,
        gate:[17,7], approach:'summit', passage:1,
        rooms:[['entry',7,44,3,2,'entry'],['isleSouth',25,39,3,2,'battle'],
            ['isleWest',8,31,3,2,'elite'],['isleEast',25,22,3,2,'elite'],
            ['spur',29,31,2,2,'optional'],['ledge',5,18,2,2,'optional'],
            ['summit',17,11,3,2,'battle'],['boss',17,4,4,2,'boss']],
        links:[['entry','isleSouth',[[7,39]]],['isleSouth','isleWest',[[25,31]]],
            ['isleWest','isleEast',[[8,22]]],['isleEast','summit',[[25,11]]],
            ['isleWest','spur'],['isleEast','ledge',[[5,22]]]]
    },
    {
        act:4, id:'braided-maze', terrain:'책장 미궁', biome:'maze', width:47, height:39, rotation:3,
        gate:[23,7], approach:'threshold',
        rooms:[['entry',23,35,2,2,'entry'],['cross',23,28,2,2,'battle'],
            ['westLow',8,28,2,2,'battle'],['eastLow',38,28,2,2,'battle'],
            ['westHigh',8,16,2,2,'elite'],['eastHigh',38,16,2,2,'elite'],
            ['center',23,21,2,2,'battle'],['blindWest',3,21,1,1,'optional'],
            ['blindEast',43,21,1,1,'optional'],['threshold',23,11,2,2,'battle'],['boss',23,4,4,2,'boss']],
        links:[['entry','cross'],['cross','westLow'],['cross','eastLow'],['westLow','westHigh'],
            ['eastLow','eastHigh'],['westHigh','center',[[16,16],[16,21]]],
            ['eastHigh','center',[[30,16],[30,21]]],['center','cross'],['center','threshold'],
            ['westLow','blindWest',[[3,28]]],['eastLow','blindEast',[[43,28]]]]
    },
    {
        act:5, id:'silent-nave', terrain:'검은 물 신전', biome:'sanctum', width:35, height:43, rotation:0,
        gate:[17,7], approach:'altar',
        rooms:[['entry',17,39,2,2,'entry'],['naveSouth',17,32,3,3,'battle'],
            ['naveNorth',17,20,3,3,'battle'],['choir',6,30,3,3,'elite'],
            ['vestry',28,18,3,3,'elite'],['crypt',5,12,2,2,'optional'],
            ['archive',29,33,2,2,'optional'],['altar',17,11,3,2,'battle'],['boss',17,4,4,2,'boss']],
        links:[['entry','naveSouth'],['naveSouth','naveNorth'],['naveNorth','altar'],
            ['naveSouth','choir',[[6,32]]],['naveNorth','vestry',[[28,20]]],
            ['choir','crypt',[[6,12]]],['naveSouth','archive',[[29,32]]]]
    },
    {
        act:6, id:'broken-courtyard', terrain:'무너진 중정', biome:'ruins', width:43, height:35, rotation:0,
        gate:[21,7], approach:'balcony',
        rooms:[['entry',21,31,2,2,'entry'],['south',21,25,4,2,'battle'],
            ['west',8,25,3,2,'battle'],['east',34,25,3,2,'elite'],
            ['hedgeWest',8,14,3,3,'elite'],['hedgeEast',34,14,3,3,'optional'],
            ['breach',21,19,3,2,'battle'],['collapse',3,20,1,2,'optional'],
            ['balcony',21,11,4,2,'battle'],['boss',21,4,4,2,'boss']],
        links:[['entry','south'],['south','west'],['west','hedgeWest'],['west','collapse',[[3,25]]],
            ['south','breach'],['breach','east',[[34,19]]],['breach','hedgeEast',[[34,19]]],
            ['breach','balcony'],['hedgeWest','balcony',[[8,11]]]]
    },
    {
        act:7, id:'hollow-spiral', terrain:'줄기 속 나선', biome:'trunk', width:45, height:45, rotation:2,
        gate:[22,7], approach:'heart',
        rooms:[['entry',5,40,2,2,'entry'],['rimSouth',38,39,3,2,'battle'],
            ['rimEast',38,13,3,3,'elite'],['rimNorth',7,13,3,3,'battle'],
            ['innerWest',7,30,2,2,'elite'],['innerSouth',25,30,3,2,'battle'],
            ['innerEast',25,20,2,2,'battle'],['deadwood',15,6,2,2,'optional'],
            ['hollow',15,23,2,2,'optional'],['heart',22,11,2,2,'battle'],['boss',22,4,3,2,'boss']],
        links:[['entry','rimSouth',[[5,39]]],['rimSouth','rimEast'],['rimEast','rimNorth'],
            ['rimNorth','innerWest'],['innerWest','innerSouth'],['innerSouth','innerEast'],
            ['innerEast','heart',[[25,11]]],['innerWest','hollow',[[15,30]]],['rimNorth','deadwood',[[15,13]]]]
    },
    {
        act:8, id:'offset-veils', terrain:'보라 장막 섬', biome:'veil', width:49, height:39, rotation:1,
        gate:[24,7], approach:'veilEnd',
        rooms:[['entry',5,30,2,2,'entry'],['southEast',42,29,3,2,'battle'],
            ['middleEast',42,20,3,2,'elite'],['middleWest',13,20,3,2,'battle'],
            ['northWest',13,11,3,2,'elite'],['veilEnd',24,11,2,2,'battle'],
            ['foldSouth',25,35,2,2,'optional'],['foldNorth',42,11,3,2,'optional'],['boss',24,4,4,2,'boss']],
        links:[['entry','southEast',[[5,29]]],['southEast','middleEast'],['middleEast','middleWest'],
            ['middleWest','northWest'],['northWest','veilEnd'],['middleWest','foldSouth',[[25,20]]],
            ['middleEast','foldNorth']]
    },
    {
        act:9, id:'three-confluences', terrain:'꽃덤불 교차로', biome:'canopy', width:53, height:37, rotation:0,
        gate:[26,7], approach:'cocoon',
        rooms:[['entry',26,33,3,2,'entry'],['fork',26,27,3,2,'battle'],
            ['west',7,25,3,3,'elite'],['east',45,25,3,3,'elite'],
            ['center',26,19,4,3,'battle'],['westHigh',7,13,3,2,'battle'],
            ['eastHigh',45,13,3,2,'battle'],['sapWest',16,32,2,2,'optional'],
            ['sapEast',36,32,2,2,'optional'],['cocoon',26,11,4,2,'battle'],['boss',26,4,4,2,'boss']],
        links:[['entry','fork'],['fork','west',[[7,27]]],['fork','east',[[45,27]]],['fork','center'],
            ['west','westHigh'],['east','eastHigh'],['westHigh','cocoon',[[7,11]]],
            ['eastHigh','cocoon',[[45,11]]],['center','cocoon'],['west','sapWest',[[16,25]]],['east','sapEast',[[36,25]]]]
    },
    {
        act:10, id:'crown-wheel', terrain:'별빛 차륜', biome:'crown', width:49, height:43, rotation:0,
        gate:[24,7], approach:'axis',
        rooms:[['entry',24,39,2,2,'entry'],['south',24,33,3,2,'battle'],
            ['southWest',9,31,3,2,'battle'],['southEast',39,31,3,2,'battle'],
            ['west',6,20,3,3,'elite'],['east',42,20,3,3,'elite'],
            ['northWest',12,11,3,2,'battle'],['northEast',36,11,3,2,'battle'],
            ['innerWest',17,23,2,2,'optional'],['innerEast',31,23,2,2,'optional'],
            ['axis',24,11,3,2,'battle'],['boss',24,4,4,2,'boss']],
        links:[['entry','south'],['south','southWest',[[9,33]]],['south','southEast',[[39,33]]],
            ['southWest','west',[[6,31]]],['southEast','east',[[42,31]]],
            ['west','northWest',[[6,11]]],['east','northEast',[[42,11]]],
            ['northWest','axis'],['northEast','axis'],['south','innerWest',[[17,33]]],['south','innerEast',[[31,33]]]]
    }
]);
// Whole-map backdrops drawn at 16px per tile (shown at a whole-number zoom of the 16px art). Walkability still comes from the
// map data above. Each map is painted once per facing (views[rotation], 0 gate north, 1 east, 2 south, 3 west — a run draws one,
// js/combat.js createActExplorationEncounter): the light still falls from the upper left and the cliff faces still face the viewer, so a
// turned map is a new painting, never a rotated picture. gate: closed|open frames side by side at the same pixel scale;
// gateOffset = art px from the gate tile's centre to the frame's top-left; shade = the art's own darkness (the fog and the canvas
// around the map use it). Source: scripts/build-act-maps.cjs (node, --write), the painted look of 2026-10-02 (act looks:
// scripts/act-maps/looks.cjs). Every wide map is one of these ten (contents and atlas maps reuse them, js/exploration-layouts.js);
// a picture that fails to load falls back to a flat stand-in (js/canvas-exploration-art.js plain).
const ACT_EXPLORATION_BACKDROPS = (() => {
    const GATE_OFFSETS=[[-22,-28],[-10,-42],[-22,-44],[-10,-42]]; // N, E, S, W frames (scripts/act-maps/gate.cjs)
    const view=(act,rotation)=>Object.freeze({map:`assets/exploration/act${act}-r${rotation}-map.png`,
        gate:`assets/exploration/act${act}-r${rotation}-gate.png`,gateOffset:Object.freeze(GATE_OFFSETS[rotation])});
    const entry=(act,shade)=>Object.freeze({shade:Object.freeze(shade),views:Object.freeze(GATE_OFFSETS.map((_,rotation)=>view(act,rotation)))});
    return Object.freeze({
        'root-branches':entry(1,[20,16,24]),
        'garden-circuit':entry(2,[14,18,21]),
        'suspended-spans':entry(3,[7,8,13]),
        'braided-maze':entry(4,[18,11,13]),
        'silent-nave':entry(5,[17,13,12]),
        'broken-courtyard':entry(6,[16,13,11]),
        'hollow-spiral':entry(7,[18,12,8]),
        'offset-veils':entry(8,[10,8,16]),
        'three-confluences':entry(9,[18,11,16]),
        'crown-wheel':entry(10,[5,5,11])
    });
})();
// Version of the backdrop and gate pictures, added to their URLs (js/canvas-exploration-art.js) so a redrawn map is never
// served from the browser's image cache. Bump it with every --write.
const ACT_EXPLORATION_ART_VERSION = '20261004d';
// Sight around the hero in tiles (walked through floor, js/act-exploration-map.js visibleCells). Ground inside it is clear and the
// fog starts past it (js/canvas-act-exploration.js fogAlpha). 2026-10-02: 5 → 6 (user: the view felt cramped). 2026-10-04: the sixth
// tile was still dimmed (the fog began a tile inside and the unseen fog bled over it), so only the monsters showed there.
// Monsters still notice the hero within engageRadius (the old 5, js/act-exploration-state.js notice): the next pack shows a tile
// before it charges, and the fights a route takes stay the same. An area attack also reaches monsters that have not noticed the hero,
// within splashReach tiles of him (Chebyshev, js/combat.js getAttackTargets), and the strike pulls them into the fight (2026-10-04).
const ACT_EXPLORATION_VISION = Object.freeze({radius:6,engageRadius:5,splashReach:12});
// Whole-pixel camera zoom for the 16px art (js/canvas-act-exploration.js tileSize). 2026-10-02: at most ×4 (was ×5): on a 125%
// desktop display the ×5 tiles (80px) made the hero feel too big and the view cramped.
const ACT_EXPLORATION_CAMERA = Object.freeze({minZoom:3,maxZoom:4});
safeExposeData({ACT_EXPLORATION_MAPS,ACT_EXPLORATION_BACKDROPS,ACT_EXPLORATION_ART_VERSION,ACT_EXPLORATION_VISION,ACT_EXPLORATION_CAMERA});
