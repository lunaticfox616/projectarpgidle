const assert = require('node:assert/strict');
module.exports = async function checkAssassination(frame) {
    const result = await frame.evaluate(() => {
        const lab = newSkillLab, random = Math.random;
        Math.random = () => .5;
        try {
            changeSkill('암살'); lab.bossMode=true; lab.reset();
            const start=getCombatTime(); performPlayerAttack(getPlayerStats());
            const cast=lab.casts.at(-1).cast, samples=[];
            for(const offset of [0,50,99]) samples.push(lab.assassinationPose(start+offset));
            const before=game.enemies[0].hp;
            // Capture the actual canvas boundary, including sprite helpers that assign alpha.
            const ctx=document.createElement('canvas').getContext('2d'), alphas=[];
            const draw=ctx.drawImage;
            ctx.drawImage=function(...args) {alphas.push(this.globalAlpha);return draw.apply(this,args);};
            lab.visualTime=start+50;
            drawBattlePlayerActor(ctx,{playerPos:{x:100,y:100},now:performance.now(),gridUnitScale:1,
                motionState:{playerStats:getPlayerStats()},swingPower:0,currentSkillVisual:{},playerFlash:false});
            game.combatTimeMs=cast.teleportAt; cast.update(getCombatTime());
            for(const offset of [100,135,170,239]) samples.push(lab.assassinationPose(start+offset));
            const afterBlink=game.enemies[0].hp;
            game.combatTimeMs=cast.hitAt; cast.update(getCombatTime());
            const contact=lab.assassinationPose(getCombatTime()),hits=lab.history.length;
            const phases=lab.renderer.effects.map(effect=>effect.assassinationPhase);
            const contactArt=[];
            lab.renderer.layout(cast.hitAt+30,(...row)=>contactArt.push(row));
            for(let t=0;t<120;t+=16) lab.assassinationPose(getCombatTime()+t);
            const stillHits=lab.history.length;
            const damage=before-game.enemies[0].hp;
            lab.cancel(); const cancelled=lab.assassinationPose(getCombatTime());
            lab.reset(); performPlayerAttack(getPlayerStats());
            const cancelledCast=lab.casts.at(-1).cast;
            cancelledCast.cancel(getCombatTime()+50);
            const midFadeCancel=lab.assassinationPose(getCombatTime()+50);
            return {samples,alphas,phases,contactArt,before,afterBlink,contact,hits,stillHits,damage,cancelled,midFadeCancel};
        } finally {Math.random=random;lab.bossMode=false;changeSkill('탄성 플라스크');lab.reset();}
    });
    assert.deepEqual(result.samples.slice(0,3).map(row=>row.alpha),[1,.5,.01]);
    assert.ok(result.alphas.length>0 && result.alphas.every(alpha=>alpha<=.5),'actual actor sprites inherit the fade');
    assert.deepEqual(result.samples.slice(3,6).map(row=>row.alpha),[0,.5,1]);
    assert.notDeepEqual(result.samples[2].cell,result.samples[3].cell,'hidden actor snaps at confirmed teleport');
    assert.ok(result.samples[3].ghost>0 && result.samples[6].ghost===0,'one brief departure afterimage');
    assert.equal(result.before,result.afterBlink,'teleport and rendering do not inflict damage');
    assert.equal(result.contact.thrust,1,'body thrust peaks on the controller hit');
    assert.equal(result.phases.includes('dagger'),false,'no floating dagger is emitted');
    assert.ok(result.phases.includes('slash') && result.contactArt.length>0,'original contact effect still renders');
    assert.ok(result.damage>0); assert.equal(result.hits,1); assert.equal(result.stillHits,1);
    assert.equal(result.cancelled,null); assert.equal(result.midFadeCancel,null,'cancel restores normal visible actor');
    console.log('Assassination: fade, snap, reappear, single contact damage and cancel recovery passed.');
};
