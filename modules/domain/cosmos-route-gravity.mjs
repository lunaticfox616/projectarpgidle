

/** Domain floor center shared by warning and pull; the classic board keeps its authored center. */
export function cosmosJourneyGravityAnchor(env, owner) {
    const run = env.deps.actExplorationState.current(owner);
    if (!run?.rooms) return { gx:env.deps.COSMOS_GRAVITY_FIELD.gx, gy:env.deps.COSMOS_GRAVITY_FIELD.gy, roomId:null };
    const map = env.deps.actExplorationMap.forRun(run), room = env.deps.actExplorationRooms.roomAt(map,owner.gridPlayer);
    if (!room || !env.deps.actExplorationMap.walkable(map,room)) return null;
    return { gx:room.gx, gy:room.gy, roomId:room.id, map };
}

export function cosmosJourneyGravityTarget(env, enemy, anchor) {
    if (enemy.hp<=0 || enemy.isBoss || !env.deps.hasGridCell(enemy)) return false;
    return !anchor.map || env.deps.actExplorationRooms.roomAt(anchor.map,enemy)?.id === anchor.roomId;
}

export function cosmosJourneyGravityMatchesRoom(field, anchor) {
    return !!field && (field.roomId || null) === anchor.roomId;
}

/** Combat-time scheduling, shared by live combat and isolated background replay. */
export function cosmosJourneyTickGravity(env, owner) {
    const config = env.deps.COSMOS_GRAVITY_FIELD, anchor = cosmosJourneyGravityActive(env, owner) ? cosmosJourneyGravityAnchor(env, owner) : null;
    if (!anchor || !owner.enemies.some(enemy=>cosmosJourneyGravityTarget(env, enemy,anchor))) {
        owner.cosmosGravity = null;
        return;
    }
    const now = env.deps.getCombatTime();
    // This optional room identity is transient too: save recovery already discards the whole pulse.
    if (!cosmosJourneyGravityMatchesRoom(owner.cosmosGravity,anchor)) {
        owner.cosmosGravity = {nextPulseAt:now+config.warningMs,steps:0,roomId:anchor.roomId};
    }
    const field = owner.cosmosGravity;
    if (now < field.nextPulseAt) return;
    for (const enemy of owner.enemies) {
        if (!cosmosJourneyGravityTarget(env, enemy,anchor)) continue;
        env.deps.gridStepToward(enemy,anchor.gx,anchor.gy,env.deps.getGridBlockedCells(enemy));
    }
    field.steps = (field.steps+1)%config.steps;
    field.nextPulseAt = now + (field.steps === 0 ? config.restMs : config.intervalMs);
}

export function cosmosJourneyGravityActive(env, owner) {
    return owner.currentZoneId === 'cosmos_challenge'
        && owner.cosmosAtlas.activeChallenge?.nodeId === env.deps.COSMOS_GRAVITY_FIELD.nodeId
        && !owner.combatHalted && owner.moveTimer <= 0;
}

export function cosmosJourneyGravityView(env, owner) {
    if (!owner.cosmosGravity || !cosmosJourneyGravityActive(env, owner)) return null;
    const anchor = cosmosJourneyGravityAnchor(env, owner);
    if (!anchor || !cosmosJourneyGravityMatchesRoom(owner.cosmosGravity,anchor)) return null;
    const until = owner.cosmosGravity.nextPulseAt-env.deps.getCombatTime();
    return { ...env.deps.COSMOS_GRAVITY_FIELD, gx:anchor.gx, gy:anchor.gy,
        progress:1-Math.max(0,Math.min(1,until/env.deps.COSMOS_GRAVITY_FIELD.warningMs)) };
}
