const assert=require('node:assert/strict');

module.exports=async function checkMotion(frame) {
    const result=await frame.evaluate(()=>{
        const lab=newSkillLab,native=lab.native,a={gx:2,gy:4},b={gx:4,gy:4};
        const flight=[native.WT_BOUNCING_FLASK.flightMs(a,b,1),native.WT_EXPLOSIVE_MIXTURE.flightMs(a,b,1),
            native.WT_SUPERCOOLED_MIXTURE.flightMs(a,b,1)];
        const empty=native.WT_EMPTY_FLASK.createCast({source:a,aim:b,getEnemies:()=>[],startAt:0,speed:1});
        flight.push(empty.flightDuration);
        const cold=native.WT_SUPERCOOLED_MIXTURE.createCast({source:a,aim:b,getEnemies:()=>[],startAt:0,speed:1});
        const explosion=native.WT_EXPLOSIVE_MIXTURE.createCast({source:a,aim:b,getEnemies:()=>[],startAt:0,speed:1});
        changeSkill('신성한 안개');lab.reset();performPlayerAttack(getPlayerStats());
        const effect=lab.renderer.effects.find(e=>e.holyMistPhase==='censer');
        const poses=[];
        for(const fraction of [.2,.4,.6,.8]) {
            const rows=[];lab.renderer.layout(effect.at+effect.duration*fraction,(...row)=>rows.push(row));
            const mist=rows.find(row=>row[7]===64),body=rows.find(row=>row[7]===32);
            poses.push({count:rows.length,bodyRadius:Math.hypot(body[1]-(game.gridPlayer.gx*48+24),body[2]-(game.gridPlayer.gy*48+24)),
                bowlMistDistance:Math.hypot(mist[1]-body[1],mist[2]-body[2])});
        }
        changeSkill('탄성 플라스크');lab.reset();
        return {flight,ringInterval:cold.ringInterval,burstDuration:explosion.burstDuration,poses};
    });
    assert.deepEqual(result.flight,[217,289,289,283],'bottle travel is 1.8x faster for all four new flask skills');
    assert.equal(result.ringInterval,260,'wave cadence is preserved');
    assert.equal(result.burstDuration,540,'burst animation is not accelerated');
    for(const pose of result.poses) {
        assert.equal(pose.count,3,'one chain, one body and one local mist sprite');
        assert.ok(pose.bodyRadius<=47,'censer orbit stays in its adjacent-cell area');
        assert.ok(pose.bowlMistDistance>=22 && pose.bowlMistDistance<=26,'mist follows the censer bowl');
    }
    console.log('Flask flight speed, unchanged aftermath timing and compact censer mist verified.');
};
