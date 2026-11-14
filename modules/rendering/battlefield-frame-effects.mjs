import { clampNumber } from '../common/numbers.mjs';
import { bodyCueFromFx, damageBodyY } from './battlefield-body.mjs';
import { combatScreenPoint } from './combat-effect-geometry.mjs';

/** Consume each existing effect once for sounds/numbers; paint it until its existing visual expiry. */
export class BattlefieldFrameEffects {
    constructor(deps, parts) {
        this.deps = deps; this.parts = parts;
        const { events, death, travel, telegraphs } = parts;
        this.painters = {
            playerSwing: (ctx, fx, t, v) => deps.tree.swing(ctx, fx, v.now, v.gridProj),
            playerMobility: (ctx, fx, t, v) => events.mobility(ctx, fx, t, v.gridProj),
            combatTravel: (ctx, fx, t, v) => travel.draw(ctx, fx, { now: v.now, projection: v.gridProj, playerPos: v.playerPos, enemyPosMap: v.enemyPosMap }),
            hit: (ctx, fx, t, v) => events.legacyHit(ctx, fx, t, v.playerPos, v.enemyPosMap),
            levelUp: (ctx, fx, t, v) => events.levelUp(ctx, fx, t, v.playerPos, v.now),
            objectReward: (ctx, fx, t, v) => deps.tree.feedback.object(ctx, fx, t, v.gridProj),
            ambushBlink: (ctx, fx, t, v) => deps.ambush.draw(ctx, fx, v.now, v.gridProj),
            enemySpawn: (ctx, fx, t, v) => events.spawn(ctx, fx, t, v.enemyPosMap[fx.enemyId]),
            enemyDeath: (ctx, fx, t, v) => death.draw(ctx, fx, t, { enemy: v.enemyPosMap[fx.enemyId], playerPos: v.playerPos, gridProj: v.gridProj, now: v.now }),
            bossAreaImpact: (ctx, fx, t, v) => telegraphs.trap(ctx, fx, t, v.gridProj, false),
            trialTrapWarning: (ctx, fx, t, v) => telegraphs.trap(ctx, fx, t, v.gridProj, true),
            trialTrap: (ctx, fx, t, v) => telegraphs.trap(ctx, fx, t, v.gridProj, false),
            lootPickup: (ctx, fx, t, v) => events.pickup(ctx, fx, t, { from: v.enemyPosMap[fx.enemyId], to: v.playerPos, width: v.width, height: v.height }),
            lootCelebration: (ctx, fx, t, v) => events.celebrate(ctx, fx, t, v.enemyPosMap[fx.enemyId], v)
        };
    }

    autoSwing(player, view) {
        const latest = player.swings.latest, visual = this.deps.visual();
        if (latest && latest.id !== visual.lastAutoSwingId && view.now >= (visual.lastAutoSkillAt || 0)) {
            this.deps.playSkill(latest.skillName || '기본 공격');
            visual.lastAutoSwingId = latest.id;
            const interval = Math.min(600, Math.max(120, (1 / Math.max(.1, player.stats.aspd)) * 100));
            visual.lastAutoSkillAt = view.now + interval;
        }
        if (latest && latest.projectile && !latest.combatTravel) {
            this.parts.queue.launch(latest, { targetEntries: player.targets, playerPos: view.playerPos,
                enemyPosMap: view.enemyPosMap, viewportScale: Math.min(view.width / 960, view.height / 540) });
        }
    }

    enemyPosition(fx, view) {
        return view.enemyPosMap[fx.enemyId] || this.deps.visual().enemyGhostPos[fx.enemyId];
    }

    hit(fx, view) {
        const { timing, body, queue, layer } = this.parts;
        timing.hitStop(fx);
        const enemy = this.enemyPosition(fx, view) || { x: view.width * .72, y: view.height * .58 };
        if (typeof fx.damage === 'number') this.deps.damageText.fromHit(fx, enemy.x, damageBodyY(enemy.y, body.enemyHeight(enemy)), view.now);
        if (!fx.dot && fx.skillName) {
            queue.hit({ ...fx, combatFx: fx, footprint: this.deps.projectFootprint(fx.attackFootprint, view.gridProj, fx.sourceCell) }, {
                enemyPos: enemy, playerPos: combatScreenPoint(view.gridProj, fx.sourceCell, view.playerPos),
                enemyPosMap: view.enemyPosMap, now: view.now, viewportScale: Math.min(view.width / 960, view.height / 540)
            });
            layer.noteGround(this.deps.visual().skillEffects || [], view.gridProj);
        }
        this.hitParticles(fx, enemy, view);
    }

    hitParticles(fx, enemy, view) {
        if (fx.dot || this.deps.atlas[fx.skillName] || typeof this.deps.spawnAttack !== 'function') return;
        const options = this.parts.timing.spawnOptions(fx, enemy.enemy, view.currentSkillVisual, Math.min(view.width / 960, view.height / 540));
        if (options) this.deps.spawnAttack(fx.element || 'phys', enemy.x, enemy.y - 6, options);
    }

    status(fx, view) {
        const enemy = fx.enemyId ? this.enemyPosition(fx, view) : null, anchor = enemy || view.playerPos;
        const height = enemy ? this.parts.body.enemyHeight(enemy) : this.parts.body.heroHeight(view.playerPos, view.now);
        this.deps.damageText(bodyCueFromFx(fx, anchor, height, view.now));
    }

    observe(fx, view) {
        const { timing, hits, body } = this.parts;
        this.deps.tree.feedback.observe(fx, view.now);
        if (fx.type === 'hit') this.hit(fx, view);
        else if (fx.type === 'playerHit') {
            timing.hitStop(fx);
            if (typeof fx.damage === 'number') hits.heroText(fx, view.playerPos, view.now);
        } else if (fx.type === 'summonHit') {
            if (typeof fx.damage === 'number') hits.summonText(fx, view.gridProj, view.playerPos, view.now);
        } else if (fx.type === 'enemyEvade') {
            const enemy = this.enemyPosition(fx, view) || { x: view.width * .72, y: view.height * .58 };
            this.deps.damageText(bodyCueFromFx(fx, enemy, body.enemyHeight(enemy), view.now));
        } else if (fx.type === 'statusText') this.status(fx, view);
        else if (fx.type === 'enemyDeath') this.deathSound(fx, view.now);
    }

    deathSound(fx, now) {
        if (now - fx.start < 500 && typeof this.deps.playFeedback === 'function') {
            this.deps.playFeedback(fx.boss ? 'killBoss' : (fx.elite ? 'killElite' : 'kill'));
        }
    }

    consume(effects, view) {
        const processed = this.deps.visual().processedFxIds;
        effects.forEach(fx => {
            if (processed.has(fx.id) || view.now < fx.start) return;
            this.observe(fx, view);
            processed.add(fx.id);
        });
        this.deps.cleanupVisual(view.now);
    }

    afterimages(ctx, view) {
        const pending = new Set();
        for (const fx of this.deps.effects()) {
            if (!fx || fx.type !== 'hit' || view.now >= fx.start || view.enemyPosMap[fx.enemyId] || pending.has(fx.enemyId)) continue;
            const ghost = this.deps.visual().enemyGhostPos[fx.enemyId];
            if (!ghost || !ghost.enemy) continue;
            pending.add(fx.enemyId);
            this.drawAfterimage(ctx, ghost, view);
        }
    }

    drawAfterimage(ctx, ghost, view) {
        const scale = (ghost.enemy.isBoss ? 3.65 : (ghost.enemy.isElite ? 2.2 : 1.95)) * view.gridUnitScale;
        this.parts.enemies.afterimage(ctx, ghost.enemy, { x: ghost.x, y: ghost.y, scale,
            gridProj: view.gridProj, now: view.now, facing: this.parts.facing.direction(ghost, view.playerPos) });
    }

    retainGhost(fx, view) {
        const ghost = (fx.enemyId && !view.enemyPosMap[fx.enemyId]) ? this.deps.visual().enemyGhostPos[fx.enemyId] : null;
        if (!ghost || view.enemyPosMap[fx.enemyId]) return;
        view.enemyPosMap[fx.enemyId] = { enemy: ghost.enemy || { id: fx.enemyId, hp: 0, maxHp: 1 }, x: ghost.x, y: ghost.y, actualAim: ghost.actualAim };
    }

    draw(ctx, view) {
        const effects = this.deps.effects().filter(fx => !this.parts.travel.isGround(fx) && !fx.loot && !fx.groundLoot);
        for (const fx of effects) {
            if (view.now < fx.start) continue;
            const t = clampNumber((view.now - fx.start) / fx.duration, 0, 1);
            this.deps.bossAttacks.drawHeadRelease(ctx, fx, view.now);
            this.deps.bossMoves.drawWoodsmanFx(ctx, fx, view.now, view.gridProj);
            this.retainGhost(fx, view);
            const paint = this.painters[fx.type];
            if (paint) paint(ctx, fx, t, view);
        }
    }
}
