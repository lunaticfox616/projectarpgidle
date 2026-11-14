import { clampNumber } from '../common/numbers.mjs';
import { returnArrival, returnDeparture } from './battlefield-motion.mjs';

const MAP_MONSTERS_LEFT_HINT = 5;

/** Owns frame ordering only. The game, visual clock, assets and mutable laboratory hooks are injected. */
export class BattlefieldRenderer {
    constructor(deps, parts) { this.deps = deps; this.parts = parts; }

    resize(canvas, box) {
        const scale = this.deps.display.battleRenderScale;
        const width = box.width || Math.round((canvas.width || 960) / scale) || 960;
        const height = box.height || Math.round((canvas.height || 540) / scale) || 540;
        if (canvas.width !== Math.max(1, Math.round(width * scale)) || canvas.height !== Math.max(1, Math.round(height * scale))) this.deps.resize();
    }

    open(forceWhenHidden) {
        const canvas = this.deps.document.getElementById('battlefield-canvas');
        if (!canvas) return null;
        const box = this.deps.canvasBox.read(canvas);
        if (!forceWhenHidden && box.width === 0) return null;
        this.loadAssets();
        this.resize(canvas, box);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const renderScale = clampNumber(Number(canvas.dataset.renderScale) || 1, 1, 2);
        const view = this.deps.canvasBox.read(canvas);
        const width = Math.max(1, view.width || Math.round(canvas.width / renderScale) || canvas.width);
        const height = Math.max(1, view.height || Math.round(canvas.height / renderScale) || canvas.height);
        return { canvas, ctx, renderScale, box: view, width, height };
    }

    loadAssets() {
        const assets = this.deps.assets;
        if (!assets.ready && !assets.loading && !assets.failed && this.deps.autoload()) this.deps.initAssets();
    }

    clock(view, cadence) {
        const wallNow = this.deps.now(), observerScene = this.deps.bossMoves.observerScene(wallNow);
        const time = this.deps.tree.feedback.advanceClock(wallNow, !!observerScene);
        this.deps.tree.feedback.begin(time.now);
        this.deps.visual().lastNow = time.now;
        this.deps.cleanupFx(time.now);
        const count = (this.deps.game().enemies || []).reduce((sum, enemy) => sum + (enemy && enemy.hp > 0 ? 1 : 0), 0);
        const density = this.parts.timing.updateDensity(time.rawDeltaMs, count, cadence);
        if (typeof this.deps.updateAttacks === 'function') this.deps.updateAttacks(time.deltaMs);
        Object.assign(view, time, { observerScene, density, deltaSec: time.deltaMs / 1000 });
    }

    backdrop(view) {
        const { ctx, canvas, renderScale, width, height, now } = view;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = view.density < .7 ? 'medium' : 'high';
        view.cameraShake = this.parts.screen.shake(now);
        ctx.translate(view.cameraShake.x, view.cameraShake.y);
        const zone = this.deps.zone(this.deps.game().currentZoneId), theme = this.deps.theme(zone);
        view.gridProj = this.deps.projection(width, height, 'grid-contain');
        this.deps.bossMoves.observerCamera(ctx, view.observerScene, width, height, view.gridProj);
        this.deps.backdrop(ctx, width, height, theme, now, zone, view.gridProj);
    }

    loading(view) {
        if (this.deps.assets.ready || !this.deps.assets.loading) return false;
        const { ctx, width, height } = view;
        ctx.save();
        ctx.fillStyle = 'rgba(6,10,16,0.55)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(201, 223, 244, 0.82)';
        ctx.font = `700 24px ${this.parts.text.font()}`;
        ctx.textAlign = 'center';
        this.deps.drawText(ctx, '전장을 준비하는 중...', width / 2, height / 2);
        ctx.restore();
        this.deps.document.getElementById('ui-battlefield-caption').innerText = this.deps._t('전장을 준비하는 중...');
        return true;
    }

    position(view, player) {
        const game = this.deps.game(), visual = this.deps.visual(), swing = player.swings.frame;
        const enemies = (game.enemies || []).filter(enemy => enemy.hp > 0);
        view.enemies = enemies;
        view.swingPower = swing ? Math.sin(((view.now - swing.start) / (swing.duration * player.durationScale)) * Math.PI) : 0;
        view.currentSkillVisual = this.deps.skillVisual(game.activeSkill, player.skill);
        this.parts.player.blend(player, view);
        const layout = this.deps.layout(enemies, view.width, view.height, view.gridProj);
        const hero = this.parts.player.place(player, view);
        view.playerPos = hero.pos;
        this.parts.actors.markHero(hero.pos, view.gridProj);
        if (!visual.enemySmoothPos) visual.enemySmoothPos = {};
        const glide = { now: view.now, deltaSec: view.deltaSec, gridProj: view.gridProj };
        view.layout = this.deps.drawList.markDrawn(layout.map(entry => this.parts.enemies.glide(entry, glide)),
            { width: view.width, height: view.height, tile: view.gridProj.tileW });
        view.enemyPosMap = this.parts.enemies.positions(view.layout, this.deps.effects(), view.now, view.gridProj);
        this.parts.player.direction(player, hero, view.enemyPosMap, view.now);
        view.motionState = hero.state;
    }

    returnPosition(effect, projection) {
        if (!effect) return null;
        const cell = this.deps.hasCell(effect.cell) ? effect.cell : this.deps.spawn;
        const anchor = projection.cellToScreen(cell.gx, cell.gy);
        effect.position = { x: anchor.x, y: anchor.y + (Number(projection.actorGroundOffsetY) || 0) };
        return effect;
    }

    actors(view, player) {
        view.ctx = this.deps.loot.actorContext(view.canvas, view.ctx, view.now, view.gridProj);
        const { ctx, gridProj, now, playerPos, enemyPosMap } = view;
        (this.deps.visual().projectiles || []).forEach(projectile => this.deps.projectile(ctx, projectile, now));
        this.parts.telegraphs.draw(ctx, view.layout, view.gridUnitScale, gridProj, this.deps.pending());
        const motions = this.parts.hits.attackMotions(this.deps.effects(), enemyPosMap, playerPos, now, gridProj);
        const enemyAttackMotions = this.deps.bossAttacks.addMotions(motions, view.layout, playerPos, now, gridProj.tileW);
        const returnWarp = this.returnPosition(returnArrival(this.deps.effects(), now), gridProj);
        const returnDepartureEffect = this.returnPosition(returnDeparture(this.deps.effects(), now), gridProj);
        this.parts.actors.draw(ctx, view.layout, {
            now, width: view.width, height: view.height, gridProj, gridUnitScale: view.gridUnitScale,
            enemyHitFlashes: view.enemyHitFlashes, enemyCount: view.layout.length,
            playerPos, currentTargets: player.targets, enemyPosMap, playerFlash: player.flash,
            swingPower: view.swingPower, currentSkillVisual: view.currentSkillVisual, motionState: view.motionState,
            enemyAttackMotions, returnWarp, returnDeparture: returnDepartureEffect
        });
    }

    foreground(view, player) {
        const { ctx, now, gridProj } = view;
        this.parts.frameEffects.afterimages(ctx, view);
        this.deps.frontSkills(ctx, now, gridProj);
        this.deps.woodsman.foreground(ctx, gridProj);
        if (typeof this.deps.drawAttacks === 'function') this.deps.drawAttacks(ctx);
        const health = this.parts.player.health(player.stats, view);
        const targets = player.targets.map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
        this.parts.frameEffects.draw(ctx, view);
        return { width: view.width, height: view.height, light: view.playerPos, ...health, now,
            layout: view.layout, targets, tileW: gridProj.tileW, projection: gridProj,
            pending: this.deps.pending(), observerScene: view.observerScene };
    }

    overlays(view, scene) {
        const { ctx, now, gridProj, width, height, renderScale, cameraShake } = view;
        this.parts.screen.finish(ctx, scene);
        if (typeof this.deps.stageScene === 'object') this.deps.stageScene.drawMarks(ctx, gridProj);
        const exclusions = view.box.enemyOverlays.map(rect => ({ ...rect, x: rect.x - cameraShake.x, y: rect.y - cameraShake.y }));
        this.deps.drawDamage(ctx, now, this.parts.bars.exclusions(exclusions));
        this.deps.titleCard.draw(ctx, scene);
        ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        this.parts.screen.hurtEdge(ctx, width, height, now);
        this.deps.tree.feedback.screen(ctx, { width, height, now });
        this.parts.banner.draw(ctx, { width, height, now }, this.parts.banner.update(view.enemies, now));
        if (typeof this.deps.rooms === 'object') this.deps.rooms.drawOverlay(ctx, view.box, gridProj);
        this.deps.bossMoves.drawObserverTransition(ctx, view.observerScene, width, height);
    }

    monstersLeft() {
        const exploration = this.deps.explorationState;
        const run = typeof exploration === 'object' ? exploration.current(this.deps.game()) : null;
        if (!run || !Array.isArray(run.packs)) return null;
        return run.packs.filter(pack => pack && pack.stage === null).reduce((sum, pack) => sum + (pack.aliveIds || []).length, 0);
    }

    caption() {
        const game = this.deps.game();
        if (game.isTownReturning && game.moveTimer > 0) return '마을로 귀환 중...';
        if (game.woodsmanEntrancePending) return '혼돈 밖이 침묵합니다… 나무꾼이 다가옵니다.';
        if (game.moveTimer > 0) return '';
        const left = this.monstersLeft();
        return [this.deps.barkEffect().on ? '세계수 껍질 구간' : '',
            left > 0 && left <= MAP_MONSTERS_LEFT_HINT ? this.deps._t('몬스터 {left}마리 남음', { left }) : ''].filter(Boolean).join(', ');
    }

    flush(view) {
        // DOM writes follow drawing, avoiding style recalculation within canvas font/filter operations.
        this.deps.bossMoves.syncObserverHud(view.observerScene);
        this.deps.setText(this.deps.document.getElementById('ui-battlefield-caption'), this.caption());
        const exploration = this.deps.explorationView;
        if (typeof exploration === 'object' && exploration.objects) exploration.objects.flushButtons();
        this.deps.warmup.afterBattleDraw(view.ctx);
    }

    /** Only completed frames count toward performance statistics. Hidden/missing/loading surfaces return early. */
    render(forceWhenHidden, targetFrameMs) {
        this.deps.doors.begin();
        this.deps.tree.beginFrame();
        const view = this.open(forceWhenHidden);
        if (!view) return;
        this.clock(view, targetFrameMs);
        this.backdrop(view);
        const player = this.parts.player.read(view.now);
        view.enemyHitFlashes = this.parts.hits.flashes(this.deps.effects(), view.now);
        const cells = this.parts.ground.skillAreaCells(this.deps.game().activeSkill || '기본 공격', player.skill, player.targets);
        this.parts.ground.grid(view.ctx, view.gridProj, player.targets, cells);
        if (this.loading(view)) return;
        this.position(view, player);
        this.parts.frameEffects.autoSwing(player, view);
        view.gridUnitScale = clampNumber(view.gridProj.tileW / 46, .48, Math.max(1.3, view.gridProj.unitScaleCap || 0));
        this.deps.drawGround(view.ctx, this.deps.effects(), view);
        this.deps.bossAttacks.drawGround(view.ctx, view.gridProj);
        this.parts.frameEffects.consume(this.deps.effects(), view);
        this.actors(view, player);
        this.overlays(view, this.foreground(view, player));
        this.flush(view);
        return true;
    }
}
