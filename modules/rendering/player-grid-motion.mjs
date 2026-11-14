import { clampNumber, lerpNumber } from '../common/numbers.mjs';
import { recentBattleEffect } from './battlefield-motion.mjs';

function cardinalDirection(from, to) {
    const dx = Number(to.gx) - Number(from.gx), dy = Number(to.gy) - Number(from.gy);
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'south' : 'north';
    return dx < 0 ? 'west' : 'east';
}

function displayedStep(projection, state, now) {
    const progress = state.durationMs > 0 ? clampNumber((now - state.startedAt) / state.durationMs, 0, 1) : 1;
    const eased = progress * progress * (3 - 2 * progress);
    const from = projection.cellToScreen(state.fromCell.gx, state.fromCell.gy);
    const to = projection.cellToScreen(state.toCell.gx, state.toCell.gy);
    const ground = Number(projection.actorGroundOffsetY) || 0;
    from.y += ground;
    to.y += ground;
    const moving = progress < 1;
    return {
        position: { x: lerpNumber(from.x, to.x, eased), y: lerpNumber(from.y, to.y, eased) },
        targetPosition: to, progress, direction: state.direction,
        animating: moving || (!moving && now < state.holdUntil)
    };
}

/** Visual interpolation only. Domain cells and encounter movement are never changed here. */
export class PlayerGridMotion {
    constructor(deps) { this.deps = deps; }

    attackDurationScale(heroId) {
        const classes = this.deps.classes, talents = this.deps.heroes;
        const definition = (classes && classes[heroId]) || (talents && talents[heroId]);
        return clampNumber(Number(definition && definition.attackAnimationDurationScale) || 1, 1, 1.6);
    }

    moveDuration(moveSpeed, distance) {
        const speed = clampNumber(Number(moveSpeed) || 100, 60, 320);
        const stepMs = this.deps.moveIntervalSec * 1000 * (100 / speed);
        return clampNumber(stepMs * 0.82 * Math.sqrt(Math.max(1, Number(distance) || 1)), 140, 520);
    }

    teleported(fx, from, to, now) {
        if (fx.type !== 'playerMobility' || !fx.instant || !fx.fromCell || !fx.toCell) return false;
        return now >= fx.start && now < fx.start + fx.duration
            && this.deps.cellKey(fx.fromCell.gx, fx.fromCell.gy) === this.deps.cellKey(from.gx, from.gy)
            && this.deps.cellKey(fx.toCell.gx, fx.toCell.gy) === this.deps.cellKey(to.gx, to.gy);
    }

    nextStep(previous, current, now, speed) {
        const distance = Math.max(Math.abs(current.gx - previous.gx), Math.abs(current.gy - previous.gy));
        const teleport = this.deps.effects().some(fx => this.teleported(fx, previous, current, now));
        const durationMs = teleport ? 0 : this.moveDuration(speed, distance);
        return { lastCell: current, fromCell: previous, toCell: current, startedAt: now, durationMs,
            holdUntil: now + durationMs + Math.min(70, durationMs * 0.14), direction: cardinalDirection(previous, current) };
    }

    update(projection, player, now, speed) {
        if (this.deps.run()) return this.exploring(projection, player);
        const cell = { gx: player.gx, gy: player.gy }, visual = this.deps.visual();
        let state = visual.playerGridMotion;
        if (!state) {
            state = { lastCell: cell, fromCell: cell, toCell: cell, startedAt: now, durationMs: 0, holdUntil: now, direction: 'east' };
            visual.playerGridMotion = state;
        }
        if (state.lastCell.gx !== cell.gx || state.lastCell.gy !== cell.gy) {
            state = this.nextStep(state.lastCell, cell, now, speed);
            visual.playerGridMotion = state;
            visual.playerFacingDirection = state.direction;
        }
        return displayedStep(projection, state, now);
    }

    exploring(projection, player) {
        const run = this.deps.run();
        const cell = this.displacedCell(player) || this.kickoffCell(player) || this.deps.explorationMotion.position(run, player);
        const position = projection.cellToScreen(cell.gx, cell.gy);
        position.y += Number(projection.actorGroundOffsetY) || 0;
        return { position, targetPosition: position, direction: run.motionDirection,
            progress: run.motion ? run.motion.elapsed / run.motion.duration : 1,
            animating: (run.motion || this.deps.explorationMotion.freeMoving(run)) && !this.deps.paused() };
    }

    displacedCell(player) {
        const now = this.deps.visual().visualNow, hit = recentBattleEffect(this.deps.effects(), 'playerHit', now, 220);
        if (!hit?.displaceFrom || hit.displaceTo.gx !== player.gx || hit.displaceTo.gy !== player.gy) return null;
        const t = clampNumber((now - hit.start) / 180, 0, 1), left = (1 - t) ** 2;
        return { gx: player.gx + (hit.displaceFrom.gx - player.gx) * left, gy: player.gy + (hit.displaceFrom.gy - player.gy) * left };
    }

    kickoffCell(player) {
        const now = this.deps.visual().visualNow;
        if (!Number.isFinite(now)) return null;
        const move = this.deps.effects().find(fx => fx && fx.type === 'playerMobility' && fx.kickoff && fx.fromCell && fx.toCell
            && now >= fx.start && now < fx.start + this.deps.kickoffMs && fx.toCell.gx === player.gx && fx.toCell.gy === player.gy);
        return move ? { gx: move.fromCell.gx, gy: move.fromCell.gy } : null;
    }

    /** Airborne runes move the displayed ground anchor; only the body renderer applies height/rotation. */
    airGround(playerPos, now, projection) {
        const air = this.deps.runes ? this.deps.runes.heroAir(now) : null;
        this.deps.visual().playerAir = air;
        if (!air) return playerPos;
        const at = projection.cellToScreen(air.gx, air.gy);
        return { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) };
    }
}
