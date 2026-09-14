const assert = require('node:assert/strict');

function positionScenarios() {
        const lab = newSkillLab, random = Math.random;
        Math.random = () => .5;
        function scene(name, boss, player, enemy) {
            changeSkill(name); lab.bossMode=boss; lab.reset();
            game.enemies=game.enemies.slice(0,1);
            Object.assign(game.enemies[0],enemy,{hp:1000000,maxHp:1000000});
            Object.assign(game.gridPlayer,player);
        }
        function attack() {
            performPlayerAttack(getPlayerStats());
            return lab.casts.at(-1)?.cast;
        }
        function finish(cast) {
            game.combatTimeMs=Math.max(cast.hitAt || 0,cast.endAt || 0,getCombatTime()+2000);
            cast.update(game.combatTimeMs);
        }
        try {
            const assassin=[];
            for(const player of [{gx:3,gy:3},{gx:6,gy:3},{gx:4,gy:2},{gx:4,gy:5}]) {
                scene('암살',true,player,{gx:4,gy:3});
                const projection={cellToScreen:(gx,gy)=>({x:gx*48,y:gy*48})};
                battleVisualState.playerGridMotion=null;
                updatePlayerGridVisualMotion(projection,game.gridPlayer,performance.now(),100);
                const first=attack(); finish(first);
                const blink=battleFx.find(fx=>fx.type==='playerMobility' && fx.instant);
                const motion=updatePlayerGridVisualMotion(projection,game.gridPlayer,blink.start,100);
                const afterFirst={...game.gridPlayer}, firstHits=lab.history.length;
                const second=attack(); finish(second);
                assassin.push({motion,afterFirst,afterSecond:{...game.gridPlayer},firstHits,hits:lab.history.length,
                    overlap:getGridUnitDistance(game.gridPlayer,game.enemies[0])===0});
            }
            // Only a real enemy attack turns it toward the new player position.
            addBattleFx('enemyAttack',{enemyId:game.enemies[0].id,duration:220});
            const turned=attack(); finish(turned);
            const afterTurn={...game.gridPlayer};
            scene('암살',true,{gx:3,gy:3},{gx:4,gy:3});
            const blockedCast=attack(), before={...game.gridPlayer};
            game.enemies.push({...game.enemies[0],id:999999,isBoss:false,gx:6,gy:3});
            finish(blockedCast);
            const blocked={before,after:{...game.gridPlayer},hits:lab.history.length};
            scene('파문심판',false,{gx:3,gy:4},{gx:4,gy:5});
            const stats=getPlayerStats(), initial=getSkillTargets(stats).length;
            for(let i=0;i<20 && !getSkillTargets(stats).length;i++) updatePlayerGridEngagement(stats,{});
            const aligned=getSkillTargets(stats).length, ripple=attack();
            if(ripple) finish(ripple);
            const judgment={initial,aligned,hits:lab.history.length,position:{...game.gridPlayer}};
            const cold=[];
            for(const [player,enemy,boss] of [[{gx:3,gy:4},{gx:4,gy:4},false],
                [{gx:7,gy:4},{gx:8,gy:4},false],[{gx:3,gy:4},{gx:5,gy:3},true]]) {
                scene('과냉각 혼합물',boss,player,enemy);
                const cast=attack(), landing=cast?.landingCell;
                if(cast) finish(cast);
                cold.push({player,enemy,landing,center:getGridUnitCenter(game.enemies[0]),hits:lab.history.length,
                    image:lab.renderer.effects.find(e=>e.supercooledPhase==='flight')?.targetCells[0],
                    unique:lab.history.every(hit=>new Set(hit.ids).size===hit.ids.length)});
            }
            return {assassin,afterTurn,blocked,judgment,cold};
        } finally {Math.random=random; lab.bossMode=false; changeSkill('탄성 플라스크'); lab.reset();}
}

function automaticScenarios() {
    const lab=newSkillLab, results=[];
    try {
        for(const name of ['암살','파문심판','과냉각 혼합물']) {
            changeSkill(name); lab.bossMode=name==='암살'; lab.reset();
            game.enemies=game.enemies.slice(0,1);
            Object.assign(game.enemies[0],{gx:4,gy:5,hp:1e7,maxHp:1e7,gridMoveTimer:-999,attackTimer:-999});
            let overlap=false;
            for(let tick=0;tick<120;tick++) {
                coreLoop(getCombatTime()+100);
                overlap ||= getGridUnitDistance(game.gridPlayer,game.enemies[0])===0;
            }
            results.push({name,hits:lab.history.length,overlap});
        }
        return results;
    } finally {lab.bossMode=false; changeSkill('탄성 플라스크'); lab.reset();}
}

module.exports = async function checkPositions(frame) {
    const result = await frame.evaluate(positionScenarios);
    for(const row of result.assassin) {
        assert.equal(row.firstHits,1); assert.equal(row.hits,2); assert.equal(row.overlap,false);
        assert.equal(row.motion.animating,false,'native assassination snaps instead of walking');
        assert.deepEqual(row.motion.position,{x:row.afterFirst.gx*48,y:row.afterFirst.gy*48});
        assert.deepEqual(row.afterFirst,row.afterSecond,'casting does not turn the enemy or cause ping-pong');
    }
    assert.notDeepEqual(result.afterTurn,result.assassin.at(-1).afterSecond,'a real enemy turn changes the rear');
    assert.deepEqual(result.blocked.before,result.blocked.after,'new obstacle cancels teleport atomically');
    assert.equal(result.blocked.hits,0);
    assert.equal(result.judgment.initial,0); assert.equal(result.judgment.aligned,1);
    assert.equal(result.judgment.hits,1,'diagonal encounter moves into the cross and hits');
    for(const row of result.cold) {
        assert.ok(row.landing); assert.notDeepEqual(row.landing,row.player,'do not throw at own feet');
        assert.deepEqual(row.image,row.landing,'art and collision share the landing');
        assert.deepEqual(row.landing,row.center,'throw directly at the target center');
        assert.ok(row.hits>0 && row.hits<=3 && row.unique,'rings hit occupied boss cells at most once per wave');
    }
    assert.equal(result.cold[0].hits,1,'stationary primary receives one landing hit, no extra central ring ticks');
    for(const row of await frame.evaluate(automaticScenarios)) {
        assert.ok(row.hits>=2,row.name+' repeats through automatic combat');
        assert.equal(row.overlap,false,row.name+' never occupies the enemy body');
    }
    console.log('Skill positions: repeated rear attacks, blocked teleport, diagonal cross and cold throw passed.');
};
