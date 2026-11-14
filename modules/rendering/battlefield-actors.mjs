import { sortBattleActorsByDepth } from './battlefield-enemies.mjs';

const HERO_TALL_DOTS = 118;

function transitionPositions(state, position) {
    const warp = state.returnWarp, departure = state.returnDeparture;
    const warpPosition = warp && warp.position ? warp.position : position;
    const departurePosition = departure && departure.position ? departure.position : position;
    return { warp, departure, warpPosition, departurePosition };
}

/** Depth ordering and occlusion use drawn bodies; actor hooks stay replaceable by the skill laboratory. */
export class BattlefieldActors {
    constructor(deps, hits, body, returning) {
        this.deps = deps; this.hits = hits; this.body = body; this.returning = returning;
    }

    markHero(playerPos, projection) {
        const frames = this.deps.messageFrames;
        if (typeof frames !== 'object' || !frames.isActive()) return;
        frames.heroAt(playerPos.x, playerPos.y, playerPos.y - HERO_TALL_DOTS * this.deps.actors.scaleFor(projection.tileW));
    }

    noteBody(actor, state) {
        const tile = state.gridProj.tileW;
        if (actor.kind === 'player') {
            this.deps.doors.seal.body({ ...state.playerPos, halfW: tile * .4, h: this.body.heroHeight(state.playerPos, state.now) });
        } else if (actor.kind === 'enemy' && actor.entry.enemy.hp > 0) {
            const entry = actor.entry, size = this.deps.roster.bodySize(entry.enemy, tile)
                || { halfW: tile * .45 * this.deps.footprint(entry.enemy).columns, h: this.body.barLift(entry.enemy) - 10 };
            this.deps.doors.seal.body({ x: entry.x, y: entry.y, ...size });
        }
    }

    visible(entries, state) {
        const view = { width: state.width, height: state.height, tile: state.gridProj.tileW };
        const waiting = this.deps.layout(this.deps.exploration.waitingEnemies(), 0, 0, state.gridProj)
            .filter(entry => this.deps.drawList.touchesView(entry, view));
        const seen = [];
        for (const entry of entries || []) {
            if (entry.drawn) seen.push(entry);
            else if (entry.seen) this.deps.drawList.keepFacing(entry, state.playerPos, view.tile);
        }
        this.hits.softenCrowd(state.enemyHitFlashes, seen, view.tile);
        const visible = seen.concat(waiting);
        this.deps.drawList.noteDrawn(visible, view.tile);
        return visible;
    }

    draw(ctx, entries, state) {
        state = { ...state, enemyHitRecoil: this.hits.recoils(this.deps.effects(), state) };
        const visible = this.visible(entries, state);
        const actors = visible.map(entry => ({ kind: 'enemy', id: entry.enemy.id, y: entry.y, entry }));
        actors.push({ kind: 'player', id: -1, y: state.playerPos.y });
        this.deps.exploration.appendScenery(actors, state);
        this.deps.woodsman.stumps(actors, state.gridProj);
        actors.push(...this.deps.traps.riseActors(this.deps.effects(), state.now, state.gridProj));
        this.deps.entrance.drawGround(ctx, state);
        const dim = this.deps.entrance.sceneryDim(state.now);
        for (const actor of sortBattleActorsByDepth(actors)) {
            this.drawActor(ctx, actor, state, dim);
            this.noteBody(actor, state);
        }
        this.deps.readability.begin(state, visible);
    }

    drawActor(ctx, actor, state, dim) {
        if (actor.kind === 'player') return this.deps.drawPlayer(ctx, state);
        if (actor.kind === 'trapRise' || actor.kind === 'woodsmanStump') return actor.draw(ctx);
        if (actor.kind !== 'gate' && actor.kind !== 'scenery' && actor.kind !== 'object') return this.deps.drawEnemy(ctx, actor.entry, state);
        ctx.save();
        if (dim && !actor.npc) ctx.filter = `brightness(${1 - dim})`;
        this.deps.exploration.drawScenery(ctx, actor, state);
        ctx.restore();
    }

    player(ctx, input) {
        const state = this.deps.tree.actorState(input), position = this.hits.hurtPosition(state);
        const { warp, departure, warpPosition, departurePosition } = transitionPositions(state, position);
        const transition = warp || departure, transitionPosition = warp ? warpPosition : departurePosition;
        const facingLeft = this.deps.mirrored(state.motionState);
        this.returning.shroud(ctx, transitionPosition, transition && transition.whiteShroud, false);
        this.returning.arrival(ctx, warpPosition, warp, false);
        this.returning.departure(ctx, departurePosition, departure, false);
        ctx.save();
        if (transition) ctx.globalAlpha = transition.actorAlpha;
        if (facingLeft) { ctx.translate(position.x * 2, 0); ctx.scale(-1, 1); }
        this.deps.tintedPlayer(ctx, state, position);
        ctx.restore();
        this.returning.shroud(ctx, transitionPosition, transition && transition.whiteShroud, true);
        this.returning.arrival(ctx, warpPosition, warp, true);
        this.returning.departure(ctx, departurePosition, departure, true);
    }
}
