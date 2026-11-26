import { clampNumber } from '../common/numbers.mjs';
import { combatScreenPoint, radialEffectRadius } from './combat-effect-geometry.mjs';
import { vfxElement, projectileStyle, combatTravelImage, skillEffectFilter, specializedTravelImage } from './skill-effect-look.mjs';
import { paintElementProjectile } from './element-projectile.mjs';
import { isAlwaysHitShot, paintEnemyShot, shotHit } from './enemy-shot.mjs';

function projectileSize(fx, profile) {
    if (profile.projectileAsset) return { width: Number(profile.projectileWidth) || 58, height: Number(profile.projectileHeight) || 26 };
    if (fx.patternKind === 'moving') return { width: 112, height: 58 };
    return fx.patternKind === 'boomerang' ? { width: 72, height: 48 } : { width: 64, height: 24 };
}

function cachedBossSource(fx, cell) {
    return fx.bossShotOffset && cell ? { x: cell.x + fx.bossShotOffset.x, y: cell.y + fx.bossShotOffset.y } : null;
}

/** Uses immutable path waypoints or the original tracked-target policy; owns no combat timers. */
export class CombatTravelEffect {
    constructor(deps, images, cells) { this.deps = deps; this.images = images; this.cells = cells; }

    moving(ctx, fx, flight) {
        const { now, launchAt, arriveAt, source, targets, imageKey } = flight;
        if (now < launchAt || now > arriveAt || !source) return;
        const progress = clampNumber((now - launchAt) / Math.max(1, arriveAt - launchAt), 0, 1);
        if (this.deps.enemyProjectiles.draw(ctx, fx, source, targets, progress)) return;
        const profile = this.deps.profile(fx.skillName) || {};
        const image = this.deps.image(imageKey);
        const look = { ...projectileSize(fx, profile), image, profile, progress,
            useImage: !!image && !profile.projectileStyle };
        targets.forEach(target => this.projectile(ctx, fx, flight, look, target));
    }

    projectile(ctx, fx, flight, look, target) {
        const { source, element, imageKey } = flight;
        const { progress, profile, image, width, height, useImage } = look;
        ctx.save();
        ctx.translate(source.x + (target.x - source.x) * progress, source.y + (target.y - source.y) * progress);
        ctx.rotate(Math.atan2(target.y - source.y, target.x - source.x));
        if (fx.patternKind === 'boomerang' && !useImage) ctx.rotate(progress * Math.PI * 3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = useImage ? 0.94 : 0.82;
        const filter = profile.projectileAsset || specializedTravelImage(imageKey) ? 'none' : skillEffectFilter(element, imageKey);
        const drawnImage = this.images.use(ctx, useImage ? image : null, filter);
        ctx.imageSmoothingEnabled = false;
        if (useImage) ctx.drawImage(drawnImage, -width / 2, -height / 2, width, height);
        else if (fx.owner === 'player') {
            const style = projectileStyle(this.deps.profile(fx.skillName), element);
            paintElementProjectile(ctx, { style, width, height, progress }, this.deps.color(style === 'shield' ? 'phys' : style));
        } else { ctx.fillStyle = this.deps.color(element); ctx.fillRect(-12, -3, 24, 6); }
        ctx.restore();
    }

    path(ctx, fx, now, projection) {
        if (fx.enemyFlight?.finished) return;
        const releaseAt = fx.start + fx.releaseDelayMs;
        const elapsed = now - releaseAt, path = fx.travelPath;
        const next = path.findIndex(point => point.offsetMs > elapsed);
        const index = next < 0 ? path.length - 1 : Math.max(1, next);
        const source = combatScreenPoint(projection, path[index - 1]);
        const target = combatScreenPoint(projection, path[index]);
        this.moving(ctx, fx, { now, launchAt: releaseAt + path[index - 1].offsetMs,
            arriveAt: releaseAt + path[index].offsetMs, source, targets: [target],
            imageKey: combatTravelImage(fx, this.deps.profile(fx.skillName)), element: vfxElement(fx.element) });
    }

    bossSource(fx, projection, positions) {
        const entry = fx.owner === 'enemy' && positions ? positions[fx.sourceId] : null;
        const cell = combatScreenPoint(projection, fx.sourceCell, null);
        if (!entry || !entry.enemy || !entry.enemy.isBoss) return cachedBossSource(fx, cell);
        fx.screenShotScale = clampNumber(projection.tileW / 48, 0.75, 2) * 1.6;
        const origin = this.deps.headOrigin(fx.sourceId, fx.cerberusHead,
            { x: entry.x, y: entry.y - Math.max(24, (this.deps.drawnHeight(entry.enemy) || 0) * 0.5) });
        if (cell) fx.bossShotOffset = { x: origin.x - cell.x, y: origin.y - cell.y };
        return origin;
    }

    target(fx, scene, cell, index) {
        const { projection, playerPos, enemyPosMap } = scene;
        const current = fx.owner === 'player' && fx.delivery === 'projectileTarget'
            ? enemyPosMap[(fx.targetIds || [])[index]] : null;
        if (fx.owner === 'enemy' && fx.delivery === 'projectileTarget') {
            const game = this.deps.game();
            const victim = fx.targetType === 'player' ? game.gridPlayer : game.summons.find(unit => unit.id === fx.targetId);
            return combatScreenPoint(projection, victim || cell, playerPos);
        }
        return current ? { x: current.x, y: current.y - 10 } : combatScreenPoint(projection, cell, playerPos);
    }

    draw(ctx, fx, scene) {
        const { now, projection, playerPos, enemyPosMap } = scene;
        this.deps.rules.repeat(fx, now);
        if (this.deps.tree.travel(ctx, fx, now, projection)) return;
        if (fx.travelPath) return this.path(ctx, fx, now, projection);
        const launchAt = fx.start + Math.max(0, Number(fx.releaseDelayMs) || 0);
        const arriveAt = launchAt + Math.max(1, Number(fx.flightMs) || 1);
        const source = this.bossSource(fx, projection, enemyPosMap) || combatScreenPoint(projection, fx.sourceCell, playerPos);
        const targets = (fx.targetCells || []).map((cell, index) => this.target(fx, scene, cell, index)).filter(Boolean);
        const imageKey = combatTravelImage(fx, this.deps.profile(fx.skillName));
        const element = vfxElement(fx.element, fx.element);
        if (this.deps.signature(ctx, fx, { now, launchAt, arriveAt, source, targets }, projection)) return;
        this.deliver(ctx, fx, scene, { now, launchAt, arriveAt, source, targets, imageKey, element });
    }

    deliver(ctx, fx, scene, flight) {
        if (isAlwaysHitShot(fx) && flight.targets[0]) this.alwaysHitShot(ctx, fx, { ...flight, target: flight.targets[0] }, scene);
        else if (fx.delivery === 'magicCell') this.cell(ctx, fx, scene, flight);
        else this.moving(ctx, fx, flight);
    }

    /** An enemy shot that always hits (js/rendering/enemy-shot.mjs): from the caster's middle (a boss's head) to the hero's body. The drawn
     * ends are kept on the effect (screenShot) for the impact the hero's playerHit paints. */
    alwaysHitShot(ctx, fx, flight, scene) {
        const { tileW, tileH } = scene.projection, lift = fx.screenShotScale ? 0 : tileH * 0.9;
        const to = fx.targetType === 'player' && scene.playerPos ? scene.playerPos : flight.target;
        fx.screenShot = { from: { x: flight.source.x, y: flight.source.y - lift }, to: { x: to.x, y: to.y - tileH * 1.45 } };
        paintEnemyShot(ctx, fx, { now: flight.now, launchAt: flight.launchAt, arriveAt: flight.arriveAt, ...fx.screenShot,
            p: Math.max(1, Math.round(tileH / 13)), tileW, reduced: this.deps.tree.feedback.reduced(), scale: fx.screenShotScale ? 1.5 : 1,
            hit: fx.targetType === 'player' ? shotHit(this.deps.effects(), fx) : null });
    }

    cell(ctx, fx, scene, flight) {
        fx.screenSource = flight.source;
        fx.screenAim = combatScreenPoint(scene.projection, fx.aimCell, flight.targets[0]);
        fx.screenFootprint = this.deps.footprint(this.deps.enemyProjectiles.groundArea(fx), scene.projection);
        if (fx.patternKind === 'radialBurst') fx.screenRadius = radialEffectRadius(fx, scene.projection, this.deps.grids);
        this.cells.footprint(ctx, fx, { ...flight, playerPoint: scene.playerPos,
            reduced: this.deps.tree.feedback.reduced() });
    }

    groundWarning(ctx, attack, scene) {
        const fx = { enemyFlight:attack, element:attack.groundElement, start:scene.now };
        const footprint = this.deps.footprint(this.deps.enemyProjectiles.groundArea(fx),scene.projection);
        if (footprint) this.deps.enemyProjectiles.drawGround(ctx,fx,footprint,{now:scene.now,
            reduced:this.deps.tree.feedback.reduced(),playerPoint:scene.playerPos});
    }

    groundWarningAir(ctx, attack, projection) { return this.deps.enemyProjectiles.warningComet(ctx, attack, projection); }

    chorusWindup(source, pending) {
        return this.deps.enemyProjectiles.isChorusShot({source})
            && !pending.some(attack => attack.source === source && attack.groundCell);
    }

    isChorusContact(fx) { return fx.groundImpact && this.deps.enemyProjectiles.isChorusShot(fx.enemyFlight); }

    chorusContactBehindHero(fx, hero) {
        const floor = fx.screenFootprint;
        return hero && floor && hero.y > floor.y + floor.height * .42 &&
            Math.abs(hero.x - floor.x) < floor.width * .6;
    }

    chorusContact(ctx, fx, view) {
        if (fx.screenFootprint) this.deps.enemyProjectiles.chorusContact(ctx,fx,fx.screenFootprint,{now:view.now,reduced:this.deps.tree.feedback.reduced()});
    }

    isGround(fx) {
        if (fx.type !== 'combatTravel' || fx.delivery !== 'magicCell') return false;
        if (this.deps.enemyProjectiles.isGround(fx)) return true;
        if ([10, 28, 29, 32].includes(this.deps.atlas[fx.skillName]?.id)) return true;
        return ['gravity', 'erosion', 'decay', 'resonance', 'mine'].includes(this.deps.profile(fx.skillName)?.signature);
    }
}
