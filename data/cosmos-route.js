// G1 route references existing atlas IDs; names, enemies and loot remain atlas-owned.
const COSMOS_ROUTE_G1 = Object.freeze({
    version: 4, retryMs: 30000, start: 'planet-0', boss: 'planet-46', requiredClears: 15,
    lengths: Object.freeze([8, 8, 8, 2]),
    habitatByNode: Object.freeze({
        'planet-0':'swarm', 'planet-1':'guard', 'planet-6':'storm', 'planet-11':'swarm',
        'planet-16':'guard', 'planet-21':'storm', 'planet-26':'swarm', 'planet-31':'guard',
        'planet-36':'storm', 'planet-41':'guard', 'planet-46':'guard',
        'asteroid-32':'swarm', 'asteroid-60':'storm', 'asteroid-81':'swarm', 'asteroid-111':'guard',
        'asteroid-115':'storm', 'asteroid-127':'swarm', 'asteroid-132':'guard', 'asteroid-140':'storm',
        'asteroid-155':'swarm', 'asteroid-156':'guard', 'asteroid-164':'storm', 'asteroid-166':'swarm',
        'asteroid-168':'guard', 'asteroid-170':'storm', 'asteroid-181':'swarm'
    }),
    habitats: Object.freeze({
        swarm: Object.freeze({ name: '군집', markerCount: 3, minPack: 7, maxPack: 8, eliteChance: .06, bossAdds: 0, hp: .55, damage: .5, speed: 1, trait: null }),
        guard: Object.freeze({ name: '수호', markerCount: 6, minPack: 1, maxPack: 2, eliteChance: .8, bossAdds: 0, hp: 1.5, damage: 1, speed: .85, trait: 'energyShield' }),
        storm: Object.freeze({ name: '폭풍', markerCount: 4, minPack: 3, maxPack: 4, eliteChance: .25, bossAdds: 0, hp: .85, damage: .65, speed: 1.55, trait: null, element: 'light' })
    }),
    planets: Object.freeze([1, 6, 11, 16, 21, 26, 31, 36, 41].map(n => `planet-${n}`)),
    asteroids: Object.freeze([32, 60, 81, 111, 115, 127, 132, 140, 155, 156, 164, 166, 168, 170, 181].map(n => `asteroid-${n}`)),
    choices: Object.freeze({ 1: ['survey', 'salvage'], 3: ['survey', 'rift'] })
});
safeExposeData({ COSMOS_ROUTE_G1 });

// Atlas membership is shared by route validation and the individual destination UI.
const COSMOS_ROUTE_GALAXIES = Object.freeze((() => {
    const asteroids = [32,60,81,111,115,127,132,140,155,156,164,166,168,170,181,183,195,198,204,208,211,214,227,234,241,261,264,291,299,308,331,343,349,358,365,394,406,430,431,442,463,477,486,511,533,550,554,599,681,693,702,715,726,737,756,757,761,767,769,778,781,786,800,813,824,843,866,886,900,944,947,964,969,985,1000];
    const bosses = [46,47,48,49,45];
    return Object.fromEntries([1,2,3,4,5].map(galaxy => {
        const planets = Array.from({length:50},(_,i)=>i).filter(i=>i>0 && (i-1)%5+1===galaxy).map(i=>'planet-'+i);
        const rocks = asteroids.slice((galaxy-1)*15,galaxy*15).map(i=>'asteroid-'+i);
        const start = galaxy === 1 ? 'planet-0' : planets[0], boss = 'planet-'+bosses[galaxy-1];
        const middle = planets.filter(id=>id!==start && id!==boss).concat(rocks);
        const total = middle.length+2, count = total-2;
        const lengths = [0,1,2].map(i=>Math.floor(count/3)+(i<count%3 ? 1 : 0)).concat(2);
        return [galaxy,Object.freeze({galaxy,start,boss,middle:Object.freeze(middle),asteroids:Object.freeze(rocks),lengths:Object.freeze(lengths),total})];
    }));
})());
const COSMOS_GRAVITY_FIELD = Object.freeze({nodeId:'planet-0',gx:4,gy:3,intervalMs:600,restMs:4800,warningMs:1200,steps:3});
safeExposeData({ COSMOS_ROUTE_GALAXIES, COSMOS_GRAVITY_FIELD });
