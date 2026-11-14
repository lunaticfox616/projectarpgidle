import { clampNumber, approachNumber } from '../common/numbers.mjs';
import { selectSwingEffects } from './battlefield-motion.mjs';

function blendValue(current, active, rates, delta) {
    return approachNumber(current || 0, active ? 1 : 0, active ? rates[0] : rates[1], delta);
}

const BLEND_RATES = Object.freeze({ attack: [4, 3], hurt: [6.5, 4.2], down: [7.5, 4.8] });

function playerHits(effects, now) {
    let flash = false, down = false;
    for (let index = effects.length - 1; index >= 0; index--) {
        const effect = effects[index];
        if (!effect) continue;
        const age = now - effect.start;
        if (age < 0 || age > effect.duration) continue;
        if (effect.type === 'playerHit') flash = true;
        else if (effect.type === 'playerDown') down = true;
    }
    return { flash, down };
}

/** Per-frame hero presentation. Resource amounts and combat targeting remain domain-owned. */
export class BattlefieldPlayerFrame {
    constructor(deps, timing, movement, facing) {
        this.deps = deps; this.timing = timing; this.movement = movement; this.facing = facing;
    }

    read(now) {
        const game = this.deps.game(), stats = this.timing.stats(), targets = this.timing.targets(stats);
        const appearance = this.deps.appearance ? this.deps.appearance() : game.selectedHeroId;
        const durationScale = this.movement.attackDurationScale(appearance), effects = this.deps.effects();
        const swings = selectSwingEffects(effects, now, durationScale);
        const skill = this.deps.skills[game.activeSkill] || this.deps.skills['기본 공격'];
        return { stats, targets, durationScale, swings, skill, ...playerHits(effects, now) };
    }

    blend(player, frame) {
        const visual = this.deps.visual(), swing = player.swings.frame, delta = frame.deltaSec;
        visual.playerAttackBlend = blendValue(visual.playerAttackBlend, swing, BLEND_RATES.attack, delta);
        if (swing && Number.isFinite(swing.motionVariantSeed)) visual.playerAttackMotionSeed = swing.motionVariantSeed;
        visual.playerHurtBlend = blendValue(visual.playerHurtBlend, player.flash, BLEND_RATES.hurt, delta);
        visual.playerDownBlend = blendValue(visual.playerDownBlend, player.down, BLEND_RATES.down, delta);
    }

    place(player, frame) {
        const visual = this.deps.visual(), game = this.deps.game(), swing = player.swings.frame;
        const attackBlend = visual.playerAttackBlend || 0, hurtBlend = visual.playerHurtBlend || 0, downBlend = visual.playerDownBlend || 0;
        const cell = this.deps.hasCell(game.gridPlayer) ? game.gridPlayer : this.deps.spawn;
        const speed = Number(player.stats.moveSpeed) || Number(player.stats.move) || 100;
        const motion = this.movement.update(frame.gridProj, cell, frame.now, speed);
        const pos = this.movement.airGround({ x: motion.position.x, y: motion.position.y + downBlend * .6 }, frame.now, frame.gridProj);
        const state = {
            playerStats: player.stats, advanceBlend: motion.animating ? 1 : 0,
            moveProgress: motion.progress, moveDirection: motion.direction,
            attackBlend, attackActive: !!swing,
            attackProgress: swing ? clampNumber((frame.now - swing.start) / Math.max(1, swing.duration * player.durationScale), 0, .999) : 0,
            attackVariantSeed: visual.playerAttackMotionSeed, hurtBlend, downBlend
        };
        visual.playerPos = { x: pos.x, y: pos.y };
        return { pos, motion, state };
    }

    direction(player, actor, enemies, now) {
        const visual = this.deps.visual();
        actor.state.attackDirection = this.facing.attackDirection(actor.pos, player.targets, enemies);
        const strike = this.facing.strikeSide(now);
        if (actor.motion.animating) visual.playerFacingDirection = actor.motion.direction;
        else if (strike) visual.playerFacingDirection = strike;
        else if (player.swings.frame) visual.playerFacingDirection = actor.state.attackDirection;
        actor.state.facingDirection = visual.playerFacingDirection || actor.state.attackDirection;
    }

    healthGhost(hp, frame) {
        const visual = this.deps.visual();
        if (!Number.isFinite(visual.playerHpGhostPct)) visual.playerHpGhostPct = hp;
        if (!Number.isFinite(visual.playerHpLastPct)) visual.playerHpLastPct = hp;
        if (!Number.isFinite(visual.playerHpGhostHoldUntil)) visual.playerHpGhostHoldUntil = 0;
        if (hp < visual.playerHpLastPct - .001) {
            visual.playerHpGhostPct = Math.max(visual.playerHpGhostPct, visual.playerHpLastPct);
            visual.playerHpGhostHoldUntil = frame.now + 260;
        } else if (hp > visual.playerHpGhostPct) visual.playerHpGhostPct = hp;
        if (frame.now >= visual.playerHpGhostHoldUntil && visual.playerHpGhostPct > hp) {
            visual.playerHpGhostPct = Math.max(hp, visual.playerHpGhostPct - .34 * frame.deltaSec);
        }
        visual.playerHpLastPct = hp;
        return clampNumber(visual.playerHpGhostPct, hp, 1);
    }

    health(stats, frame) {
        const game = this.deps.game();
        const hp = clampNumber((game.playerHp || 0) / Math.max(1, stats.maxHp || 1), 0, 1);
        const ghost = this.healthGhost(hp, frame);
        const es = (stats.energyShield || 0) > 0 ? clampNumber((game.playerEnergyShield || 0) / Math.max(1, stats.energyShield), 0, 1) : 0;
        return { hpPct: hp, ghostPct: ghost, esPct: es };
    }
}
