// Authored topology, not a random generator. Rooms use [id, centerX, centerY, radiusX, radiusY, role].
// Links use [from, to, optional orthogonal bend points]. Rotation is clockwise quarter turns.
// Every boss chamber has exactly one one-cell threshold; ordinary passages stay wider.
const ACT_EXPLORATION_MAPS = Object.freeze([
    {
        act:1, id:'root-branches', biome:'root', width:39, height:35, rotation:0,
        gate:[19,7], approach:'crown',
        rooms:[['entry',19,31,2,2,'entry'],['hall',19,25,4,2,'battle'],
            ['fork',19,18,3,3,'battle'],['west',7,18,4,3,'elite'],
            ['east',31,18,4,3,'elite'],['twig',31,27,3,2,'optional'],
            ['hollow',6,10,3,2,'optional'],['crown',19,11,3,2,'battle'],['boss',19,4,2,2,'boss']],
        links:[['entry','hall'],['hall','fork'],['fork','west'],['fork','east'],
            ['east','twig'],['west','hollow'],['fork','crown']]
    },
    {
        act:2, id:'garden-circuit', biome:'courtyard', width:43, height:35, rotation:0,
        gate:[21,7], approach:'balcony',
        rooms:[['entry',21,31,2,2,'entry'],['south',21,25,4,2,'battle'],
            ['west',8,25,3,2,'battle'],['east',34,25,3,2,'battle'],
            ['hedgeWest',8,14,3,3,'elite'],['hedgeEast',34,14,3,3,'elite'],
            ['alcove',3,20,1,2,'optional'],['arbor',39,20,1,2,'optional'],
            ['balcony',21,11,4,2,'battle'],['boss',21,4,2,2,'boss']],
        links:[['entry','south'],['south','west'],['south','east'],['west','hedgeWest'],
            ['east','hedgeEast'],['hedgeWest','balcony',[[8,11]]],['hedgeEast','balcony',[[34,11]]],
            ['west','alcove',[[3,25]]],['east','arbor',[[39,25]]]]
    },
    {
        act:3, id:'suspended-spans', biome:'aerial', width:35, height:49, rotation:1,
        gate:[17,7], approach:'summit', passage:1,
        rooms:[['entry',7,44,3,2,'entry'],['isleSouth',25,39,3,2,'battle'],
            ['isleWest',8,31,3,2,'elite'],['isleEast',25,22,3,2,'elite'],
            ['spur',29,31,2,2,'optional'],['ledge',5,18,2,2,'optional'],
            ['summit',17,11,3,2,'battle'],['boss',17,4,2,2,'boss']],
        links:[['entry','isleSouth',[[7,39]]],['isleSouth','isleWest',[[25,31]]],
            ['isleWest','isleEast',[[8,22]]],['isleEast','summit',[[25,11]]],
            ['isleWest','spur'],['isleEast','ledge',[[5,22]]]]
    },
    {
        act:4, id:'braided-maze', biome:'maze', width:47, height:39, rotation:3,
        gate:[23,7], approach:'threshold',
        rooms:[['entry',23,35,2,2,'entry'],['cross',23,28,2,2,'battle'],
            ['westLow',8,28,2,2,'battle'],['eastLow',38,28,2,2,'battle'],
            ['westHigh',8,16,2,2,'elite'],['eastHigh',38,16,2,2,'elite'],
            ['center',23,21,2,2,'battle'],['blindWest',3,21,1,1,'optional'],
            ['blindEast',43,21,1,1,'optional'],['threshold',23,11,2,2,'battle'],['boss',23,4,2,2,'boss']],
        links:[['entry','cross'],['cross','westLow'],['cross','eastLow'],['westLow','westHigh'],
            ['eastLow','eastHigh'],['westHigh','center',[[16,16],[16,21]]],
            ['eastHigh','center',[[30,16],[30,21]]],['center','cross'],['center','threshold'],
            ['westLow','blindWest',[[3,28]]],['eastLow','blindEast',[[43,28]]]]
    },
    {
        act:5, id:'silent-nave', biome:'sanctum', width:35, height:43, rotation:0,
        gate:[17,7], approach:'altar',
        rooms:[['entry',17,39,2,2,'entry'],['naveSouth',17,32,3,3,'battle'],
            ['naveNorth',17,20,3,3,'battle'],['choir',6,30,3,3,'elite'],
            ['vestry',28,18,3,3,'elite'],['crypt',5,12,2,2,'optional'],
            ['archive',29,33,2,2,'optional'],['altar',17,11,3,2,'battle'],['boss',17,4,2,2,'boss']],
        links:[['entry','naveSouth'],['naveSouth','naveNorth'],['naveNorth','altar'],
            ['naveSouth','choir',[[6,32]]],['naveNorth','vestry',[[28,20]]],
            ['choir','crypt',[[6,12]]],['naveSouth','archive',[[29,32]]]]
    },
    {
        act:6, id:'broken-courtyard', biome:'ruins', width:43, height:35, rotation:0,
        gate:[21,7], approach:'balcony',
        rooms:[['entry',21,31,2,2,'entry'],['south',21,25,4,2,'battle'],
            ['west',8,25,3,2,'battle'],['east',34,25,3,2,'elite'],
            ['hedgeWest',8,14,3,3,'elite'],['hedgeEast',34,14,3,3,'optional'],
            ['breach',21,19,3,2,'battle'],['collapse',3,20,1,2,'optional'],
            ['balcony',21,11,4,2,'battle'],['boss',21,4,2,2,'boss']],
        links:[['entry','south'],['south','west'],['west','hedgeWest'],['west','collapse',[[3,25]]],
            ['south','breach'],['breach','east',[[34,19]]],['breach','hedgeEast',[[34,19]]],
            ['breach','balcony'],['hedgeWest','balcony',[[8,11]]]]
    },
    {
        act:7, id:'hollow-spiral', biome:'trunk', width:45, height:45, rotation:2,
        gate:[22,7], approach:'heart',
        rooms:[['entry',5,40,2,2,'entry'],['rimSouth',38,39,3,2,'battle'],
            ['rimEast',38,13,3,3,'elite'],['rimNorth',7,13,3,3,'battle'],
            ['innerWest',7,30,2,2,'elite'],['innerSouth',25,30,3,2,'battle'],
            ['innerEast',25,20,2,2,'battle'],['deadwood',15,6,2,2,'optional'],
            ['hollow',15,23,2,2,'optional'],['heart',22,11,2,2,'battle'],['boss',22,4,2,2,'boss']],
        links:[['entry','rimSouth',[[5,39]]],['rimSouth','rimEast'],['rimEast','rimNorth'],
            ['rimNorth','innerWest'],['innerWest','innerSouth'],['innerSouth','innerEast'],
            ['innerEast','heart',[[25,11]]],['innerWest','hollow',[[15,30]]],['rimNorth','deadwood',[[15,13]]]]
    },
    {
        act:8, id:'offset-veils', biome:'veil', width:49, height:39, rotation:1,
        gate:[24,7], approach:'veilEnd',
        rooms:[['entry',5,30,2,2,'entry'],['southEast',42,29,3,2,'battle'],
            ['middleEast',42,20,3,2,'elite'],['middleWest',13,20,3,2,'battle'],
            ['northWest',13,11,3,2,'elite'],['veilEnd',24,11,2,2,'battle'],
            ['foldSouth',25,35,2,2,'optional'],['foldNorth',42,11,3,2,'optional'],['boss',24,4,2,2,'boss']],
        links:[['entry','southEast',[[5,29]]],['southEast','middleEast'],['middleEast','middleWest'],
            ['middleWest','northWest'],['northWest','veilEnd'],['middleWest','foldSouth',[[25,20]]],
            ['middleEast','foldNorth']]
    },
    {
        act:9, id:'three-confluences', biome:'canopy', width:53, height:37, rotation:0,
        gate:[26,7], approach:'cocoon',
        rooms:[['entry',26,33,3,2,'entry'],['fork',26,27,3,2,'battle'],
            ['west',7,25,3,3,'elite'],['east',45,25,3,3,'elite'],
            ['center',26,19,4,3,'battle'],['westHigh',7,13,3,2,'battle'],
            ['eastHigh',45,13,3,2,'battle'],['sapWest',16,32,2,2,'optional'],
            ['sapEast',36,32,2,2,'optional'],['cocoon',26,11,4,2,'battle'],['boss',26,4,2,2,'boss']],
        links:[['entry','fork'],['fork','west',[[7,27]]],['fork','east',[[45,27]]],['fork','center'],
            ['west','westHigh'],['east','eastHigh'],['westHigh','cocoon',[[7,11]]],
            ['eastHigh','cocoon',[[45,11]]],['center','cocoon'],['west','sapWest',[[16,25]]],['east','sapEast',[[36,25]]]]
    },
    {
        act:10, id:'crown-wheel', biome:'crown', width:49, height:43, rotation:0,
        gate:[24,7], approach:'axis',
        rooms:[['entry',24,39,2,2,'entry'],['south',24,33,3,2,'battle'],
            ['southWest',9,31,3,2,'battle'],['southEast',39,31,3,2,'battle'],
            ['west',6,20,3,3,'elite'],['east',42,20,3,3,'elite'],
            ['northWest',12,11,3,2,'battle'],['northEast',36,11,3,2,'battle'],
            ['innerWest',17,23,2,2,'optional'],['innerEast',31,23,2,2,'optional'],
            ['axis',24,11,3,2,'battle'],['boss',24,4,2,2,'boss']],
        links:[['entry','south'],['south','southWest',[[9,33]]],['south','southEast',[[39,33]]],
            ['southWest','west',[[6,31]]],['southEast','east',[[42,31]]],
            ['west','northWest',[[6,11]]],['east','northEast',[[42,11]]],
            ['northWest','axis'],['northEast','axis'],['south','innerWest',[[17,33]]],['south','innerEast',[[31,33]]]]
    }
]);
// Visual profiles are independent of walkability, enemy placement and saved progress.
const ACT_EXPLORATION_ART = Object.freeze({
    root: {
        material:'assets/exploration/root-materials.png',props:'assets/exploration/root-props.png',paving:0,
        regions:[[0,0,448,592],[448,0,352,592],[800,0,416,592],[1216,0,320,592],
            [0,592,416,432],[416,592,400,432],[816,592,400,432],[1216,592,320,432]]
    },
    courtyard: {
        material:'assets/exploration/courtyard-materials.png',props:'assets/exploration/courtyard-props.png',paving:.72,
        landmarkWidths:[2.2,1.05,2.3,1.25],
        regions:[[0,0,627,627],[627,0,627,627],[0,627,627,627],[627,627,627,627]]
    },
    aerial: {
        material:'assets/exploration/wood-materials.png',props:'assets/exploration/aerial-props.png',surface:'suspended',
        platformWidths:[.7,1.8,1.6,1.1],
        regions:[[0,0,670,670],[670,0,584,670],[0,670,700,584],[700,670,554,584]]
    },
    maze: {
        material:'assets/exploration/maze-materials.png',props:'assets/exploration/maze-props.png',paving:.55,
        landmarkWidths:[1.2,1,1.8,1.3],
        regions:[[0,0,627,790],[627,0,627,790],[0,790,627,464],[627,790,627,464]]
    },
    sanctum: {
        material:'assets/exploration/sanctum-materials.png',props:'assets/exploration/sanctum-props.png',surface:'suspended',
        platformWidths:[.95,1.1,1.6,1.3],
        regions:[[0,0,656,670],[656,0,656,670],[0,670,656,529],[656,670,656,529]]
    },
    ruins: {
        material:'assets/exploration/ruins-materials.png',props:'assets/exploration/ruins-props.png',paving:.35,
        landmarkWidths:[1.6,1.1,2,1.8],
        regions:[[0,0,627,730],[627,0,627,730],[0,730,627,524],[627,730,627,524]]
    },
    trunk: {
        material:'assets/exploration/trunk-materials.png',props:'assets/exploration/trunk-props.png',paving:.8,
        landmarkWidths:[1.8,.8,2.1,1.65],
        regions:[[0,0,690,675],[690,0,605,675],[0,675,690,539],[690,675,605,539]]
    }
});
safeExposeData({ACT_EXPLORATION_MAPS,ACT_EXPLORATION_ART});
