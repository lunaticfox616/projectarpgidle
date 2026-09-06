// Seeded reward frequency audit; does not claim to measure player enjoyment.
const fs=require('fs');
const fixture=require('./lib/replay-fixture');
const results=[];
for(const type of ['act','underworld']) for(const rank of ['regular','elite','boss']) {
    const {runtime:r,state}=fixture(17);
    const zone={type,id:1,floor:1};state.maxZoneId=2;
    const enemy={isBoss:rank==='boss',isElite:rank==='elite',dropMul:1};
    const chance=r.getEquipmentDropChances(zone,enemy).equipment;
    let drops=0,guarantees=0,streak=0,maxDryKills=0;
    const kills=20000;
    for(let index=0;index<kills;index++) {
        const roll=r.rollEquipmentDrop(zone,enemy,chance);
        state.equipmentDropProgress=roll.nextProgress;
        if(roll.dropped) {drops++;guarantees+=Number(roll.guaranteed);streak=0;}
        else {streak++;maxDryKills=Math.max(streak,maxDryKills);}
    }
    results.push({type,rank,kills,baseChance:chance,drops,guarantees,maxDryKills,
        dropsPer100Kills:Number((drops/kills*100).toFixed(3))});
}
const currencies=[];
for(const rank of ['regular','elite','boss']) {
    const {runtime:r,state}=fixture(17);
    state.currentZoneId=1;state.maxZoneId=2;
    const enemy={isBoss:rank==='boss',isElite:rank==='elite',dropMul:1};
    const quantities={};
    for(let index=0;index<20000;index++) {
        for(const [key,amount] of r.getCurrencyDrops(enemy)) quantities[key]=(quantities[key] || 0)+amount;
    }
    currencies.push({type:'act',rank,kills:20000,quantities});
}
fs.writeFileSync(process.argv[2] || 'artifacts/loot-reward-frequency.json',JSON.stringify({seed:17,results,currencies},null,2)+'\n');
console.table(results);
console.log(JSON.stringify(currencies));
