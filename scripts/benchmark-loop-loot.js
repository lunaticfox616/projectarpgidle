// Frequency and quality audit; rarity is conditional on a successful equipment roll.
// Uses production enemy/drop/pity/rarity functions; excludes inventory filtering and item affix rolls.
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const args = process.argv.slice(2);
const value = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const overrides = args.includes('--sources') ? JSON.parse(fs.readFileSync(value('--sources'), 'utf8')) : {};
const runtime = buildGameRuntime(overrides);
const report = vm.runInContext(`(() => {
    const rows=[];
    for(const loop of [1,10,30,50]) for(const gap of [0,20,30]) for(const rank of ['regular','elite','boss']) {
        game=mergeDefaults({});window.game=game;
        game.season=loop;game.loopCount=loop-1;game.currentZoneId=29;game.maxZoneId=40;
        Math.random=()=>0.5;
        const zone=getZone(29),enemy=createEnemy(zone,{at:50,boss:rank==='boss',elite:rank==='elite'},0);
        game.level=enemy.level+gap;
        let seed=17;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        const chance=getEquipmentDropChances(zone,enemy).equipment;
        const rarity={normal:0,magic:0,rare:0,unique:0},droughts=[];
        let dry=0,guarantees=0;
        for(let i=0;i<20000;i++) {
            const roll=rollEquipmentDrop(zone,enemy,chance);game.equipmentDropProgress=roll.nextProgress;
            if(!roll.dropped){dry++;continue;}
            droughts.push(dry);dry=0;guarantees+=Number(roll.guaranteed);
            let quality=getEquipmentDropRarity(enemy,Math.random());
            if(roll.minimumRarity==='rare'&&['normal','magic'].includes(quality))quality='rare';
            rarity[quality]++;
        }
        droughts.sort((a,b)=>a-b);
        rows.push({loop,gap,rank,kills:20000,chance,rarity,guarantees,maxDry:Math.max(dry,...droughts),
            p95Dry:droughts[Math.floor(droughts.length*.95)]??null});
    }
    return {method:'20k seeded kills per loop/gap/rank; real drop and rarity rolls including drought guarantees. No gear affix quality, salvage, map travel time or player fun claim.',rows};
})()`, runtime);
const output = value('--output', 'artifacts/loop-balance/loot-latest.json');
fs.mkdirSync(require('node:path').dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`${output}: ${report.rows.length * 20000} seeded equipment rolls`);
