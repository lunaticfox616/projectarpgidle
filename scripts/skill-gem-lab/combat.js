// Laboratory adapter: original controllers own contact timing; existing combat owns hit damage.
(() => {
    const lab = newSkillLab, native = lab.native;
    const originalAttack = performPlayerAttack, originalTick = coreLoop, originalFx = addBattleFx;
    const originalMitigation = getEffectiveEnemyMitigation;
    let castId = 0, damageContext = null, channelCell = null;
    const alive = () => game.enemies.filter(e => e.hp > 0);
    const position = () => ({gx:game.gridPlayer.gx, gy:game.gridPlayer.gy});
    const emit = event => lab.renderer.emit(event);
    // Native controllers use integer anchors. Only the emitted artwork uses body centers.
    function castEmitter(item) {
        if(![44,45,47,49,52].includes(item.id)) return emit;
        const centers = new Map();
        const center = cell => centers.get(gridCellKey(cell.gx,cell.gy)) || cell;
        return event => {
            // Keep the original contact streak; do not draw a separate floating weapon.
            if(item.id === 52 && event.assassinationPhase === 'dagger') return;
            for(const enemy of game.enemies) {
                centers.set(gridCellKey(enemy.gx,enemy.gy),getGridUnitCenter(enemy));
            }
            const visual = {...event, targetCells:event.targetCells.map(center)};
            if(item.id === 44 || item.id === 49) visual.sourceCell = center(event.sourceCell);
            if(item.id === 49 && event.landingCell) visual.landingCell = center(event.landingCell);
            return emit(visual);
        };
    }
    function record(hit, name, damage) {
        lab.history.push({at:hit.at, name, damage, ids:(hit.targets || [hit.enemy]).filter(Boolean).map(e => e.id)});
        if(lab.history.length > 100) lab.history.shift();
    }
    function statsFor(name) {
        const previous = game.activeSkill;
        try {game.activeSkill = name; return getPlayerStats();}
        finally {game.activeSkill = previous;}
    }
    // The existing mitigation boundary is shared by hits and DOT; apply the debuff once.
    getEffectiveEnemyMitigation = (element, tier, enemy, stats) => {
        const resistance = originalMitigation(element, tier, enemy, stats);
        if(element !== 'fire' || !enemy) return resistance;
        const more = 1 + lab.mist.getFireTakenIncreasePercent(enemy.id, getCombatTime())/100;
        return 100 - (100-resistance)*more;
    };
    function directHit(hit, name, stats) {
        const ids = new Set((hit.targets || [hit.enemy]).filter(Boolean).map(e => e.id));
        const targets = alive().filter(e => ids.has(e.id));
        if(!targets.length) return false;
        const before = targets.reduce((n,e) => n+e.hp+(e.energyShield||0),0);
        const oldContext = damageContext;
        damageContext = name;
        try {
            originalAttack({...stats, projectileExtraShots:0}, {stageReplay:true, skillName:name,
                sourceCell:hit.sourceCell || position(), forcedElement:hit.element,
                targetEntries:targets.map(e => ({enemyId:e.id,mult:1})), stageRepeatOnce:true,
                restrictRandomTargets:true, skipSlamEcho:true, skipGridControl:true,
                hitDamageMultiplier:hit.bonusShard ? PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100 : 1,
                damageTextGroupId:'new-gem-' + (++castId)});
        } finally {damageContext = oldContext;}
        const dealt = before-targets.reduce((n,e) => n+Math.max(0,e.hp)+(e.energyShield||0),0);
        record(hit, name, dealt); return dealt > 0;
    }
    function dotTick(hit, stats) {
        let total = 0;
        for(const enemy of hit.targets) {
            if(enemy.hp <= 0) continue;
            const mitigation = getEffectiveEnemyMitigation('chaos', getZone(game.currentZoneId).tier, enemy, stats);
            const raw = stats.baseDmg * stats.dotDamageScale;
            const dealt = applyDamageToEnemyResource(enemy, Math.max(1, Math.floor(raw*(1-mitigation/100))));
            total += dealt;
            addBattleFx('hit', {enemyId:enemy.id, damage:dealt, element:'chaos', color:getElementColor('chaos'),
                duration:240, noLine:true, dot:true, resolvedSkillContact:true});
            if(enemy.hp <= 0) handleEnemyDeath(enemy, stats);
        }
        record(hit, '시간 가속', total);
    }
    function teleport(hit) {
        if(!lab.canLand(hit.to)) return false;
        Object.assign(game.gridPlayer, hit.to);
        originalFx('playerMobility',{skillName:'암살',fromCell:hit.from,toCell:hit.to,instant:true,duration:180});
        return true;
    }
    function ailment(hit, stats) {
        const chosen = hit.type === 'poison' ? 'chaos' : 'phys';
        applyEnemyAilmentFromHit(hit.target, {...stats, sSkill:{...stats.sSkill, ele:chosen}},
            stats.baseDmg, false, {primaryAilmentChance:1});
        return hit.target.ailments.some(a => a.type === hit.type);
    }
    function direction(source, aim) {
        const x = aim.gx-source.gx, y = aim.gy-source.gy;
        return Math.abs(x) >= Math.abs(y) ? (x < 0 ? 4 : 6) : (y < 0 ? 8 : 2);
    }
    function aimFor(item, source, target) {
        if(item.id !== 48) return {gx:target.gx,gy:target.gy};
        return lab.coldAim(source,target);
    }
    function makeCast(name, stats) {
        const source = position();
        const item = lab.items.find(s => s.name === name);
        const targets = [48,51].includes(item.id) ? getSkillTargets(stats).map(row=>row.enemy) : alive();
        const target = findNearestGridEnemy(source,targets);
        if(!target) return null;
        const aim = aimFor(item,source,target);
        if(!aim) return null;
        const options = {source, aim, getEnemies:alive, getSource:position,
            getCasterCell:position, getSourceCell:position, targetId:target.id, primaryTargetId:target.id,
            getTargetFacing:lab.targetFacing, isWalkable:lab.canLand,
            emit:castEmitter(item), startAt:getCombatTime(), speed:Math.max(.5,Math.min(2.5,stats.aspd)), channelId:'lab-'+(++castId),
            onImpact:hit => directHit(item.id === 51 ? {...hit,targets:lab.areaTargets(hit)} : hit,name,stats),
            onRing:hit => directHit({...hit,targets:lab.coldTargets(hit)},name,stats),
            onTick:hit => dotTick(hit,stats), onHit:hit => directHit(hit,name,stats),
            onTeleport:teleport, onAilment:hit => ailment(hit,stats), debuffStore:lab.mist,
            direction:item.id === 51 ? lab.judgmentDirection(source,target) : direction(source,target),
            extraProjectileChance:Math.max(0,stats.projectileExtraShots||0)*100,
            onVisualError:lab.fail, onCancel:(id, at) => lab.renderer.cancel(id,at)};
        const key = 'WT_' + item.slug.replaceAll('-','_').toUpperCase();
        return native[key].createCast(options);
    }
    lab.reaction = native.WT_CAUSALITY.createReactor({ownerId:'player', getSource:position, getEnemies:alive, emit,
        onExplosion:hit => directHit(hit,'인과',statsFor('인과')), onVisualError:lab.fail});
    lab.reaction.setEquipped(false);
    const originalCancelChannel = cancelCombatChannel, originalResetChannel = resetCombatChannelRuntime;
    function stopCausality() {
        channelCell = null; lab.reaction.setEquipped(false); lab.report(lab.reaction.snapshot());
    }
    cancelCombatChannel = reason => {
        const result = originalCancelChannel(reason); stopCausality(); return result;
    };
    resetCombatChannelRuntime = () => {originalResetChannel(); stopCausality();};
    function syncCausality(now) {
        if(!channelCell) return false;
        const moved = game.gridPlayer.gx !== channelCell.gx || game.gridPlayer.gy !== channelCell.gy;
        const valid = game.activeSkill === '인과' && game.playerHp > 0 && !game.combatHalted
            && !hasPlayerChannelBreakingAilment() && !moved && alive().length > 0;
        if(!valid || !combatChannelRuntime.id || combatChannelRuntime.skillName !== '인과') {
            cancelCombatChannel(); return false;
        }
        // Keep the existing movement lock while concentration continues, without periodic recasts.
        combatChannelRuntime.endAt = now + 5000;
        return true;
    }
    function startCausality() {
        if(hasPlayerChannelBreakingAilment() || game.combatHalted || game.playerHp <= 0 || !alive().length) return;
        if(syncCausality(getCombatTime())) return;
        beginCombatChannel('인과',0,5000,{repeatChannelCast:false,channelContinuation:false});
        channelCell = position(); lab.reaction.setAlive(true); lab.reaction.setEquipped(true);
        lab.report(lab.reaction.snapshot());
        originalFx('statusText',{text:'집중 유지',color:'#d7c3a0',duration:700});
    }
    addBattleFx = (type, data) => {
        if(type === 'enemyAttack' && lab.ready) {
            const enemy = game.enemies.find(row => row.id === data.enemyId);
            if(enemy) lab.turnTarget(enemy);
        }
        const result = originalFx(type, data);
        if(type === 'playerHit' && lab.ready && !damageContext && syncCausality(getCombatTime())) {
            lab.reaction.receiveHit({sequence:++lab.sequence, at:getCombatTime(), targetId:'player',
                sourceId:data.enemyId, kind:'hit', damageTaken:data.damage, targetAliveAfter:game.playerHp > 0});
            lab.report(lab.reaction.snapshot());
        }
        return result;
    };
    performPlayerAttack = (stats, options) => {
        const name = options?.skillName || game.activeSkill;
        const item = lab.items.find(s => s.name === name);
        if(!lab.ready || !item || options?.stageReplay) return originalAttack(stats, options);
        if(item.id === 53) {startCausality(); return;}
        if(getCombatTime() < lab.nextCast) return;
        if(item.id === 52 && lab.casts.some(row => row.name === name && !row.cast.resolved && !row.cast.cancelled)) return;
        if(item.id === 46 && lab.casts.some(row => row.name === name && !row.cast.done && !row.cast.cancelled)) return;
        const cast = makeCast(name, stats);
        lab.nextCast = getCombatTime() + lab.intervals[item.id-44];
        if(!cast || cast.ok === false) {lab.report({hint:cast?.reason || '대상 없음'}); return;}
        lab.casts.push({cast, name, start:getCombatTime(), end:getCombatTime()+10000});
        cast.update(getCombatTime());
    };
    coreLoop = now => {
        if(lab.ready) syncCausality(now);
        originalTick(now);
        if(!lab.ready) return;
        if(game.playerHp <= 0 || game.combatHalted) {lab.cancel(); lab.reaction.setAlive(false); return;}
        lab.reaction.setAlive(true);
        if(game.activeSkill !== lab.lastSkill) {lab.cancel(); lab.lastSkill = game.activeSkill;}
        const clock = getCombatTime();
        for(const row of lab.casts) row.cast.update(clock);
        lab.casts = lab.casts.filter(row => !row.cast.done && !row.cast.cancelled && clock < row.end);
        lab.mist.update(clock, {getEnemies:alive, emit, onVisualError:lab.fail});
        lab.renderer.prune(clock);
    };
})();
