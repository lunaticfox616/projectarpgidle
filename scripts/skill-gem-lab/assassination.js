// Laboratory presentation only: confirmed teleport/hit state drives the original actor pose.
(() => {
    const lab = newSkillLab, directions = {2:'south',4:'west',6:'east',8:'north'};
    const originalPlayer = drawBattlePlayerActor, originalEnemy = drawBattleEnemyActor;
    const originalSprite = drawBattleSprite, originalShadow = drawPixelShadow;
    let actorAlpha = null;
    // Sprite/shadow helpers set their own alpha; carry the actor fade through that boundary.
    drawBattleSprite = (...args) => {
        if(actorAlpha !== null) args[6] = {...args[6],alpha:(args[6]?.alpha ?? 1)*actorAlpha};
        return originalSprite(...args);
    };
    drawPixelShadow = (...args) => {
        if(actorAlpha !== null) args[5] *= actorAlpha;
        return originalShadow(...args);
    };
    function paintActor(ctx,state,alpha) {
        const previous = actorAlpha;
        ctx.save(); actorAlpha=alpha; ctx.globalAlpha *= alpha;
        try {originalPlayer(ctx,state);}
        finally {actorAlpha=previous;ctx.restore();}
    }
    lab.assassinationPose = at => {
        if(game.activeSkill !== '암살' || game.playerHp <= 0) return null;
        const row = lab.casts.findLast(entry => entry.name === '암살' && !entry.cast.cancelled);
        if(!row || at < row.start || at > row.cast.hitAt+120 || row.cast.reason) return null;
        const cast = row.cast, plan = cast.lockedPlan || cast.initialPlan;
        const pose = lab.native.WT_ASSASSINATION.actorPose({source:plan.sourceCell,
            landingCell:plan.destination, teleportAt:cast.teleportAt,
            teleported:cast.teleported, castable:true}, at);
        // Hold the stab just before contact until the combat tick confirms damage.
        const strikeAt = cast.resolved ? at : Math.min(at,cast.hitAt-1);
        const strike = cast.teleported ? Math.max(0,Math.min(1,(strikeAt-cast.teleportAt-60)/80)) : 0;
        const recovery = Math.max(0,1-Math.max(0,at-cast.hitAt)/120);
        return {...pose, direction:directions[plan.direction], source:plan.sourceCell,
            ghost:cast.teleported ? .18*Math.max(0,1-(at-cast.teleportAt)/80) : 0,
            thrust: strike*recovery, teleported:cast.teleported};
    };
    drawBattlePlayerActor = (ctx, state) => {
        const pose = lab.assassinationPose(lab.visualTime ?? getCombatTime());
        if(!pose || state.returnWarp || state.returnDeparture) return originalPlayer(ctx,state);
        const proj = lab.projection;
        if(!proj) return originalPlayer(ctx,state);
        const position = proj.cellToScreen(pose.cell.gx,pose.cell.gy);
        position.y += proj.actorGroundOffsetY || 0;
        if(pose.teleported) battleVisualState.playerFacingDirection = pose.direction;
        const facing = pose.teleported ? pose.direction : state.motionState.facingDirection;
        const motion = {...state.motionState,advanceBlend:0,attackBlend:0,attackActive:false,
            attackProgress:0,facingDirection:facing,attackDirection:facing};
        const still = {...state,playerPos:position,motionState:motion,swingPower:0};
        if(pose.ghost > 0 && (pose.source.gx !== pose.cell.gx || pose.source.gy !== pose.cell.gy)) {
            const source = proj.cellToScreen(pose.source.gx,pose.source.gy);
            source.y += proj.actorGroundOffsetY || 0;
            paintActor(ctx,{...still,playerPos:source},pose.ghost);
        }
        // A small body lean accompanies the contact streak; the actor's grid cell never slides.
        const vectors = {west:[-1,0],east:[1,0],north:[0,-1],south:[0,1]};
        const [dx,dy] = vectors[pose.direction], lean = pose.thrust*4*state.gridUnitScale;
        paintActor(ctx,{...still,playerPos:{x:position.x+dx*lean,y:position.y+dy*lean}},pose.alpha);
    };
    drawBattleEnemyActor = (ctx, entry, state) => {
        if(game.activeSkill !== '암살') return originalEnemy(ctx,entry,state);
        const dir = lab.targetFacing(entry.enemy);
        const playerPos = {x:entry.x+(dir===4?-1:dir===6?1:0),y:entry.y+(dir===8?-1:dir===2?1:0)};
        originalEnemy(ctx,entry,{...state,playerPos});
    };
})();
