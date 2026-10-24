/** Shared supports resolve per source skill. Scheduled contacts keep that source's stats and tags. */
(function () {
    'use strict';
    window.GameModules.combat = window.GameModules.combat || {};
    function resolve(skill) {
        const out = window.GameModules.skills.supports.prepare(skill), fx = out.supportEffects;
        out.dmg = (out.dmg ?? out.baseDmg ?? 1) * fx.damageMultiplier;
        out.spd = (out.spd ?? out.baseSpd ?? 1) * fx.speedMultiplier;
        out.pushAwayCells = Math.max(out.pushAwayCells || 0, fx.push || 0);
        out.supportExpansion = Number(Boolean(fx.expansion));
        if (fx.conversion?.pct === 100) out.ele = fx.conversion.element;
        reshapeSkill(out, fx);
        return out;
    }
    function reshapeSkill(out, fx) {
        const transforms=['throwRange','mineDelayMs','channeling','spreadRadius','focus','slam'];
        if (transforms.some(key=>fx[key])) delete out.combatPattern;
        if (transforms.some(key=>fx[key])) delete out.nativeCastId;
        if (transforms.concat(['chain','pierce','projectiles','sweep','expansion']).some(key=>fx[key])) delete out.rangeText;
        out.targets=Math.max(1,out.targets || 1)+extraTargets(fx);
        if(fx.spreadRadius)out.targets=Math.max(9,out.targets);
        if(fx.focus)Object.assign(out,{targets:1,multiHit:1,targetMode:'single'});
        if(fx.slam) { out.aftershockDamagePct ??= 38; out.aftershockDelayMs ??= 420; }
    }
    function extraTargets(fx) {
        return (fx.sweep?.extra || 0)+(fx.chain?.count || 0)+(fx.pierce || 0)+(fx.projectiles?.extra || 0);
    }
    function grid(profile, skill) {
        const fx = skill?.supportEffects;
        if (!fx) return profile;
        const out = { ...profile };
        projectileGrid(out,fx,!!skill.combatPattern);
        if (fx.spreadRadius) Object.assign(out, {kind:'blast', radius:fx.spreadRadius+(skill.effectExpansion || 0)});
        if (fx.focus) Object.assign(out, {kind:'single', radius:0, band:0});
        return out;
    }
    function projectileGrid(out,fx,authored) {
        if (['throwRange','sweep','pierce','chain','projectiles'].some(key=>fx[key])) delete out.band;
        if (fx.throwRange) Object.assign(out, {kind:'line', range:fx.throwRange, radius:0});
        if (fx.sweep) Object.assign(out, {kind:'cone', range:Math.max(1,out.range)});
        if (fx.pierce) Object.assign(out, {kind:'line', range:Math.max(4,out.range)});
        if (fx.chain && !authored) Object.assign(out, {kind:'chain', jump:3});
        if (fx.projectiles) Object.assign(out, {kind:'fan', rays:Math.min(8, (out.rays || 1) + fx.projectiles.extra), spreadDeg:55});
    }
    function stages(rows, skill) {
        const fx = skill.supportEffects;
        if (!fx || !rows.length) return rows;
        let result = rows.map(row => ({...row, targets:row.targets.map((entry,i)=>({...entry,
            mult:stageTargetMultiplier(entry,i,skill)}))}));
        if (fx.chain) result = skill.combatPattern ? appendAuthoredChain(result,fx.chain) : chainStages(uniqueStageTargets(result), fx.chain);
        if (fx.repeat) {
            const delay = Math.max(...result.map(row=>row.delayMs || 0)) + 180;
            result = result.concat(result.map(row=>({...row, kind:'supportRepeat', label:'반복',
                singleRepeat:true, delayMs:(row.delayMs||0)+delay, damageMultiplier:row.damageMultiplier*fx.repeat.damagePct/100})));
        }
        if (fx.mineDelayMs) result = result.map(row=>({...row, delayMs:(row.delayMs||0)+fx.mineDelayMs, delivery:'instantTarget'}));
        return result;
    }
    function stageTargetMultiplier(entry,index,skill) {
        const fx=skill.supportEffects;
        if(fx.sweep && index>0)return fx.sweep.damagePct/100;
        if(fx.projectiles && skill.projectilePattern?.kind!=='fan')return 1;
        return entry.mult;
    }
    function chainStages(targets, config) {
        return targets.map((entry,i)=>({kind:i?'chainJump':'chainPrimary',label:i?'연쇄':'직격',delayMs:i*120,
            damageMultiplier:Math.pow(1+config.stepDamagePct/100,i),chainFromEnemyId:i?targets[i-1].enemy.id:null,targets:[{...entry,mult:1}]}));
    }
    function uniqueStageTargets(rows) { return Array.from(new Map(rows.flatMap(row=>row.targets).map(entry=>[entry.enemy.id,entry])).values()); }
    function appendAuthoredChain(rows,chain) {
        return rows.flatMap(row=>{
            const first=row.targets[0]?.enemy;
            if(!first)return [row];
            const plan=[],seen=new Set(row.targets.map(entry=>entry.enemy.id));
            nativeChain(plan,first,seen,chain);
            const extra=plan.map(contact=>({...row,kind:'supportChain',label:'추가 연쇄',
                delayMs:(row.delayMs || 0)+contact.delay,damageMultiplier:row.damageMultiplier*contact.mult,
                chainFromEnemyId:contact.from,delivery:'instantTarget',singleRepeat:true,skipGridControl:true,
                targets:[{enemy:contact.enemy,mult:1}]}));
            return [row,...extra];
        });
    }
    /** The combat slot swap is a cast context, not an equipment edit; domain fitting still checks its weapon. */
    function activeSkillStats(bonus) {
        const mobility=typeof mobilitySkill==='object' && mobilitySkill.mainGem()!==game.activeSkill;
        return resolve(getActiveSkillStats(bonus,mobility));
    }
    function targetMultiplier(enemy, skill) {
        const fx = skill?.supportEffects?.execute;
        return fx ? (enemy.hp/Math.max(1,enemy.maxHp) <= fx.thresholdPct/100 ? 1+fx.damageMorePct/100 : fx.otherwiseMultiplier) : 1;
    }
    function dealHit(enemy,stats,damage) {
        const dealt=applyDamageToEnemyResource(enemy,damage*targetMultiplier(enemy,stats.sSkill));
        afterHit(enemy,stats,dealt);
        return dealt;
    }
    function deferAttack(stats,options) {
        return conversionContacts(stats,options) || shouldDeferNativeGemCast(stats,options);
    }
    function retire(enemy) { retireDeadEnemyAttacks(enemy); onDeath(enemy); }
    function expectedMultiplier(skill) {
        const fx=skill.supportEffects;
        if(!fx)return 1;
        return (1+(fx.repeat?.damagePct || 0)/100)*(1+(fx.dot?.damagePct || 0)/100);
    }
    function nativeDot(skill) { return (skill.supportBaseTags || skill.tags || []).includes('dot'); }
    function repeatNative(command,targets) {
        const stats=command.stats,repeat=stats.sSkill.supportEffects?.repeat;
        if(!repeat)return;
        const stages=[{kind:'supportRepeat',label:'반복',delayMs:180,damageMultiplier:(command.damagePct??100)/100*repeat.damagePct/100,
            targets:targets.map(enemy=>({enemy,mult:1})),singleRepeat:true}];
        queuePendingSkillStageHits(stages,stats,{...command.attackOptions,skillName:command.name,baseDelayMs:0,forcedElement:stats.sSkill.ele});
    }
    /** Native casts retain their own bounce, shard, wave and movement stages; supports append contacts only. */
    function augmentNative(command, targets) {
        const fx=command.stats.sSkill.supportEffects, first=targets[0], seen=new Set(targets.map(enemy=>enemy.id));
        if(!fx || !first)return;
        const plan=[];
        nativeChain(plan,first,seen,fx.chain);
        nativeRays(plan,command.sourceCell || game.gridPlayer,first,seen,fx);
        if(fx.sweep) nativeCandidates(first,seen,1).slice(0,fx.sweep.extra).forEach(enemy=>{
            seen.add(enemy.id);plan.push({enemy,mult:fx.sweep.damagePct/100,delay:0,from:first.id,kind:'supportSweep'});
        });
        queueNativeExtras(command,plan);
    }
    function nativeCandidates(from,seen,range) {
        return game.enemies.filter(enemy=>enemy.hp>0 && !seen.has(enemy.id) && getGridUnitDistance(from,enemy)<=range)
            .sort((a,b)=>getGridUnitDistance(from,a)-getGridUnitDistance(from,b));
    }
    function nativeChain(plan,first,seen,chain) {
        if(!chain)return;
        let from=first;
        for(let i=1;i<=chain.count;i++) {
            const enemy=nativeCandidates(from,seen,3)[0];
            if(!enemy)break;
            seen.add(enemy.id);plan.push({enemy,mult:Math.pow(1+chain.stepDamagePct/100,i),delay:i*120,from:from.id,kind:'supportChain'});
            from=enemy;
        }
    }
    function nativeRayTarget(source,first,enemy,fan) {
        const ax=first.gx-source.gx,ay=first.gy-source.gy,bx=enemy.gx-source.gx,by=enemy.gy-source.gy;
        const aim=Math.hypot(ax,ay),distance=Math.hypot(bx,by);
        if(!aim || !distance || distance>Math.max(4,aim+2))return false;
        const forward=(ax*bx+ay*by)/aim;
        return fan ? forward/distance>=Math.cos(Math.PI*55/180) : forward>aim && Math.abs(ax*by-ay*bx)/aim<=0.55;
    }
    function nativeRays(plan,source,first,seen,fx) {
        for(const [count,fan,kind] of [[fx.pierce,false,'supportPierce'],[fx.projectiles?.extra,true,'supportFan']]) {
            if(!count)continue;
            nativeCandidates(source,seen,Math.max(4,getGridUnitDistance(source,first)+2))
                .filter(enemy=>nativeRayTarget(source,first,enemy,fan)).slice(0,count).forEach(enemy=>{
                    seen.add(enemy.id);plan.push({enemy,mult:1,delay:80,from:first.id,kind});
                });
        }
    }
    function queueNativeExtras(command,plan) {
        if(!plan.length)return;
        const stats=command.stats,base=(command.bonus?PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100:1)*(command.damagePct??100)/100;
        let rows=plan.map(row=>({kind:row.kind,label:'추가 타격',delayMs:row.delay,damageMultiplier:base*row.mult,
            chainFromEnemyId:row.from,delivery:'instantTarget',singleRepeat:true,skipGridControl:true,targets:[{enemy:row.enemy,mult:1}]}));
        const repeat=stats.sSkill.supportEffects.repeat;
        if(repeat)rows=rows.concat(rows.map(row=>({...row,delayMs:row.delayMs+180,damageMultiplier:row.damageMultiplier*repeat.damagePct/100})));
        queuePendingSkillStageHits(rows,stats,{...command.attackOptions,skillName:command.name,baseDelayMs:0,
            forcedElement:command.attackOptions?.forcedElement || stats.sSkill.ele,damageTextGroupId:command.key});
    }
    /** 속성을 모두(100%) 바꾸는 변환: 바뀐 속성으로 한 번 친다. 일부(50%, 75%)는 그대로 한 번 치고 적중 안에서 나눈다(splitConversion). */
    function conversionContacts(stats, options) {
        const fx=stats.sSkill.supportEffects?.conversion;
        if (!options.stageReplay || options.supportConverted || !fx || fx.pct < 100) return false;
        performPlayerAttack({...stats,sSkill:{...stats.sSkill,ele:fx.element}},{...options,supportConverted:true,forcedElement:fx.element});
        return true;
    }
    /** 일부 속성 변환(50%, 75%): 원래 속성의 적중 하나를 원래 속성 몫과 바뀐 속성 몫으로 나눈다(원소 변환 재능 getTalentDamageConversion과 같은 길).
     * 전에는 몫마다 따로 쳐서 적중, 상태 이상 판정, 적중 시 효과가 두 번이었다. conversion: { mainPct, added } */
    function splitConversion(conversion, stats, hitElement) {
        const fx=stats.sSkill?.supportEffects?.conversion;
        if (!fx || fx.pct >= 100 || hitElement !== fx.sourceElement) return conversion;
        const added={...conversion.added,[fx.element]:(conversion.added[fx.element] || 0)+fx.pct*conversion.mainPct};
        return {...conversion,mainPct:conversion.mainPct*(1-fx.pct/100),added};
    }
    function afterHit(enemy, stats, damage) {
        if (damage<=0) return;
        enemy.supportDeathSource=stats;
        const fx=stats.sSkill.supportEffects?.dot;
        if (!fx || enemy.hp<=0) return;
        const now=getCombatTime(), rows=enemy.supportDots || [];
        rows.push({remaining:damage*fx.damagePct/100,pending:0,until:now+fx.durationMs,at:now,stats,element:stats.sSkill.ele});
        // 잔불은 적중마다 한 줄씩 쌓이고 지속 시간이 지나면 tickDots가 걷는다.
        enemy.supportDots=rows;
    }
    function tickDots() {
        const now=getCombatTime();
        for(const enemy of game.enemies.slice()) {
            for(const row of enemy.supportDots || []) {
                if(enemy.hp<=0)break;
                advanceDot(enemy,row,now);
            }
            enemy.supportDots=(enemy.supportDots||[]).filter(row=>row.until>now && row.remaining>0);
        }
    }
    function advanceDot(enemy,row,now) {
        const end=Math.min(now,row.until),span=row.until-row.at;
        if(end<=row.at || span<=0)return;
        const damage=row.remaining*(end-row.at)/span;
        row.remaining-=damage;row.at=end;row.pending=(row.pending || 0)+damage;
        const whole=Math.floor(row.pending);row.pending-=whole;
        const dealt=applyDamageToEnemyResource(enemy,whole);
        enemy.supportDeathSource=row.stats;
        if(dealt>0)addBattleFx('hit',{enemyId:enemy.id,damage:dealt,element:row.element,dot:true,noLine:true,duration:200});
        if(enemy.hp<=0)handleEnemyDeath(enemy,row.stats);
    }
    function playerProjectile(skill) { return skill.tags.includes('projectile') && !skill.tags.includes('summon'); }
    function onDeath(enemy) {
        const stats=enemy.supportDeathSource, fx=stats?.sSkill?.supportEffects?.corpse;
        if(!fx || Math.random()*100>=fx.chancePct)return;
        const source={...stats,sSkill:{...stats.sSkill,supportEffects:{...stats.sSkill.supportEffects,corpse:null}}};
        for(const other of game.enemies.slice()) {
            if(other.hp<=0 || getGridUnitDistance(enemy,other)>2)continue;
            const mitigation=getEffectiveEnemyMitigation(source.sSkill.ele,getZone(game.currentZoneId).tier,other,source);
            const damage=enemy.maxHp*fx.lifePct/100*(1-mitigation/100)*loopMutation.takenMul(other,source.sSkill.ele);
            const dealt=applyDamageToEnemyResource(other,damage);
            other.supportDeathSource=source;
            addBattleFx('hit',{enemyId:other.id,damage:dealt,element:source.sSkill.ele,noLine:true,duration:300});
            if(other.hp<=0)handleEnemyDeath(other,source);
        }
        addBattleFx('corpseExplosion',{enemyId:enemy.id,sourceCell:{gx:enemy.gx,gy:enemy.gy},element:source.sSkill.ele,duration:400});
    }
    /** 지금 걸린 가호(사역룬, 2026-10-24 스킬룬 추가본 v54): 소환 칸 차례대로 소환 한도(cap) 안에 든 룬 가운데 첫 가호 하나. 가호는 하나만 걸린다.
     * 보유하지 않았거나 지금 무기로 못 쓰는(맨손) 룬은 자리를 차지하지 않는다(js/combat.js getActiveSummonGemDefs와 같은 차례). 없으면 null.
     * cap을 주지 않으면(무대의 발밑 표시) 한도를 보지 않는다. */
    function activeBlessing(state, cap = Infinity) {
        let used = 0;
        for (const name of state.equippedSummonSkills || []) {
            const def = summonPlaceOf(state, name);
            if (!def) continue;
            if (used >= cap) return null;
            if (def.aura) return name;
            used += summonPlaces(state, name, def);
        }
        return null;
    }
    /** 소환 칸에 끼운 룬이 자리를 차지하면 그 정의(보유하고 지금 무기로 쓸 수 있는 소환 룬), 아니면 null. */
    function summonPlaceOf(state, name) {
        const def = SKILL_DB[name];
        return def && (def.tags || []).includes('summon') && state.skills.includes(name) && canUseSkillWithCurrentEquipment(name) ? def : null;
    }
    /** 소환 룬 하나가 차지하는 자리: 공격 소환수는 소환 수만큼, 그 밖에는 하나. */
    function summonPlaces(state, name, def) {
        return def.tags.includes('summon_attack') ? Math.max(1, Math.floor(Number((state.summonSkillCounts || {})[name]) || 1)) : 1;
    }
    function auraValues(state, bonus, cap) {
        const values = {}, name = activeBlessing(state, cap), aura = name && SKILL_DB[name].aura;
        if (!aura) return values;
        const steps = getGemLevelGrowthSteps(auraLevel(state, name, bonus(name)));
        if (aura.flatStat) values[aura.flatStat] = aura.flatBase + steps * aura.flatScale;
        for (const row of aura.stats) addAuraStat(values, row, steps);
        return values;
    }
    function auraLevel(state,name,bonus) {
        return getSkillGemLevels(name,SKILL_DB[name],normalizeGemRecord(state.gemData[name]),{total:bonus}).finalLevel;
    }
    function addAuraStat(values,row,steps) { values[row.stat]=(values[row.stat]||0)+row.base+steps*row.scale; }
    function auraFlat(values) { return Object.fromEntries(['phys','fire','cold','light','chaos'].map(ele=>[ele,values[ele+'FlatDmg'] || 0])); }
    function igniteDuration(stats,type,duration) { return duration+(type==='ignite' ? (stats.sSkill?.supportEffects?.ignite?.durationMs || 0)/1000 : 0); }
    function lockState(state) {
        return {equippedSummonSkills:state.equippedSummonSkills || [],summonSkillCounts:state.summonSkillCounts || {},
            sealedSkills:state.sealedSkills || [],sealedSupports:state.sealedSupports || []};
    }
    function supportValue(name,level,ownStat) {
        const def=SUPPORT_GEM_DB[name],gem=normalizeGemRecord(game.supportGemData[name]);
        const {tierMul}=getSupportGemTier(name,gem,null);
        const value=(def.baseVal+getGemLevelGrowthSteps(level)*def.scale)*tierMul;
        if(def.tierValues)return window.GameModules.skills.supports.value(name);
        return def.scaleWithOwnStat ? Math.max(0,ownStat(def.scaleWithOwnStat))*value/100 : value;
    }
    function values(skill,context) {
        const result={};
        for(const name of context.names) {
            const def=SUPPORT_GEM_DB[name];
            if(!def)continue;
            const gem=normalizeGemRecord(game.supportGemData[name]);
            const level=Math.max(1,gem.level+context.bonus(name));
            result[name]=supportValue(name,level,context.ownStat);
            if(!def.stat || !window.GameModules.skills.supports.matches(name,skill,'main'))continue;
            context.add(def.stat,result[name]);
            if(def.capStat)context.add(def.capStat,capValue(def,level));
        }
        return result;
    }
    function capValue(def,level) { return (def.capBase||0)+getGemLevelGrowthSteps(level,def.capGrowAfterLevel||0)*(def.capPerLevel||0); }
    window.GameModules.combat.supports=Object.freeze({resolve,grid,stages,targetMultiplier,conversionContacts,afterHit,tickDots,onDeath,auraValues,
        values,auraFlat,activeBlessing,splitConversion,lockState,igniteDuration,dealHit,deferAttack,retire,expectedMultiplier,repeatNative,augmentNative,nativeDot,playerProjectile,activeSkillStats});
})();
