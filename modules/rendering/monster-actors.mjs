import { createMonsterMotion } from './monster-motion.mjs';
import { getEnemyOutlineStyle } from './enemy-outline.mjs';

// 액트 몬스터 · 뿌리촉수 · 영역 몬스터 그리기(data/monster-sprites.js): 대기 반복 · 공격 1회를 16도트 칸 격자(도트 = 칸/16)로 찍는다.
// 공격 클립의 타격 프레임을 실제로 때린 순간(근접 enemyAttack 효과) 또는 투사체가 떠난 순간(원거리 combatTravel 효과, 보스는 bossRelease)에
// 맞추고, 공격 게이지 0.8→1 구간에서는 준비 프레임을 보인다. 걷는 동안은 대기를 빠르게 돌리며 한 도트씩 튄다(걷기 그림 없음).
// 테두리는 주인공처럼 그림 실루엣을 한 도트씩 네 방향으로 찍는다(색 = getEnemyOutlineStyle). 그림만 그린다.
class MonsterActors {
    constructor(deps, motion) {
        this.deps = deps;
        this.motion = motion;
        this.FACING_ROW = { north: 'up', south: 'down', west: 'left', east: 'right' };

        this.SILHOUETTE_LIMIT = 48;

        this.sheets = new Map();
        this.silhouettes = new Map();
        this.load = src => this.deps.stageAssetRetry.image(src);
        this.ready = image => image.complete && image.naturalWidth > 0;

        this.stageRimStep = p => Math.max(1, Math.round(this.deps.stageActors.scaleFor(p.tile)));
        this.isSheetMonster = id => typeof this.deps.MONSTER_SPRITE_SHEETS === 'object' && !!this.deps.MONSTER_SPRITE_SHEETS[id];
    }

    /** The sheet a monster draws from: its side-view stage sheet (data MONSTER_STAGE_SHEETS), else its four-direction sheet. A sheet
     * that failed to arrive is fetched again (js/stage-asset-retry.js) and the monster waits for it: until 2026-11-11 a failed stage sheet
     * switched the monster to its older four-direction look for the whole visit. */
    sheetSource(id) {
        const art = this.stageArt(id);
        if (art) return { key: 'stage:' + art.id, spec: art, kind: this.deps.MONSTER_STAGE_KIND };
        const spec = typeof this.deps.MONSTER_SPRITE_SHEETS === 'object' ? this.deps.MONSTER_SPRITE_SHEETS[id] : null;
        return spec ? { key: id, spec, kind: this.deps.MONSTER_SPRITE_KINDS[spec.kind] } : null;
    }

    /** A monster's stage sheet: its own, or for a wisp look (wisp-b01 …) the sheet of its element. */
    stageArt(id) {
        if (this.deps.MONSTER_STAGE_SHEETS[id]) return this.deps.MONSTER_STAGE_SHEETS[id];
        const element = typeof this.deps.WISP_SPRITE_BY_VISUAL === 'object' ? this.deps.WISP_SPRITE_BY_VISUAL[id] : null;
        return element ? this.deps.MONSTER_STAGE_SHEETS['wisp-' + element] || null : null;
    }

    /** The loaded (or loading) sheet pair of a source. */
    pairOf(source) {
        const { key, spec } = source;
        if (!this.sheets.has(key)) this.sheets.set(key, { spec, kind: source.kind, idle: this.load(spec.idle), attack: this.load(spec.attack) });
        return this.sheets.get(key);
    }

    /** { spec, kind, idle, attack } once both sheets decode; 'loading' meanwhile (also while a failed sheet waits to be fetched again);
     * null for other enemies. */
    sheetFor(id) {
        const source = this.sheetSource(id);
        if (!source) return null;
        const pair = this.pairOf(source);
        return this.ready(pair.idle) && this.ready(pair.attack) ? pair : 'loading';
    }

    /** The sheet with every opaque pixel painted one colour (cached per sheet and colour). */
    silhouette(image, colour) {
        const key = image.src + '|' + colour;
        if (this.silhouettes.has(key)) return this.silhouettes.get(key);
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const c = canvas.getContext('2d');
        c.drawImage(image, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, canvas.width, canvas.height);
        this.silhouettes.set(key, canvas);
        if (this.silhouettes.size > this.SILHOUETTE_LIMIT) this.silhouettes.delete(this.silhouettes.keys().next().value);
        return canvas;
    }

    /** Where one frame lands: source rect in the sheet and destination box (feet on (x, y)). A sheet may set its own feet,
     * one pair for every direction or one per direction. */
    placement(pair, frame, row, p) {
        if (pair.kind.stage) return this.stagePlacement(pair, frame, row, p);
        const kind = pair.kind, cell = kind.frame, dot = p.tile / 16 * (p.spawnScale || 1), own = pair.spec.feet;
        const feet = (own && (own[row] || own)) || kind.feet;
        const src = [frame.index * cell, kind.rows.indexOf(row) * cell, cell, cell];
        const left = this.motion.snap(p.x - feet[0] * dot), top = this.motion.snap(p.y - (feet[1] + frame.bob) * dot);
        return { src, left, top, size: cell * dot, dot, rim: this.stageRimStep(p) };
    }

    /** A stage sheet: one row facing right at the character's dot size; facing left mirrors it about the feet (mirror = that x). */
    stagePlacement(pair, frame, row, p) {
        const cell = pair.kind.frame, dot = this.deps.stageActors.scaleFor(p.tile) * (p.spawnScale || 1), feet = pair.spec.feet;
        const left = this.motion.snap(p.x - feet[0] * dot), top = this.motion.snap(p.y - (feet[1] + frame.bob) * dot);
        return { src: [frame.index * cell, 0, cell, cell], left, top, size: cell * dot, dot, mirror: row === 'left' ? p.x : null, stage: true };
    }

    /** One frame at its place; a stage frame goes through stageDots so its dots stay even at any size. */
    stamp(ctx, image, at, dx = 0, dy = 0) {
        if (!at.stage) { ctx.drawImage(image, ...at.src, at.left + dx, at.top + dy, at.size, at.size); return; }
        this.deps.stageDots.blit(ctx, image, { x: at.src[0], y: at.src[1], w: at.src[2], h: at.src[3] }, { x: at.left + dx, y: at.top + dy, scale: at.dot });
    }

    /** A stage frame, and over it the hit flash as a pale silhouette. */
    drawStageFrame(ctx, image, at, flash) {
        this.stamp(ctx, image, at);
        if (!(flash > 0)) return;
        ctx.globalAlpha *= Math.min(1, Number(flash));
        this.stamp(ctx, this.silhouette(image, '#fff4df'), at);
    }

    drawFrame(ctx, pair, frame, at, look) {
        const image = pair[frame.clip];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (Number.isFinite(at.mirror)) { ctx.translate(at.mirror * 2, 0); ctx.scale(-1, 1); }
        if (look.outline) {
            const rim = this.silhouette(image, look.outline.color);
            ctx.globalAlpha *= look.outline.alpha;
            const step = at.rim || at.dot;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.stamp(ctx, rim, at, dx * step, dy * step);
            ctx.globalAlpha /= look.outline.alpha;
        }
        if (at.stage) this.drawStageFrame(ctx, image, at, look.flash);
        else this.deps.drawBattleSpriteImage(ctx, image, at.src, [at.left, at.top, at.size, at.size], look.flash);
        ctx.restore();
    }

    /** The shadow under a monster: a dot ellipse on the stage (js/canvas-stage-rings.js), the soft one elsewhere. */
    groundShadow(ctx, pair, p) {
        const share = pair === 'loading' ? 0.3 : pair.kind.shadow;
        // 무대에서는 예전 그림의 몬스터도 새 그림과 같은 도트 그림자를 딛는다(한 무리 안에서 그림자 두 가지가 섞여 보였다)
        this.deps.stageRings.shadow(ctx, { x: p.x, y: p.y, dot: this.deps.stageActors.scaleFor(p.tile) }, Math.round(share * 64), 0.34);
    }

    /** Draws a sheet monster (act monsters and roots by spriteVariantId, realm sets by monsterVisualId). On the stage a
     * monster with newer art (js/canvas-stage-roster.js: walk and attack sheets, story bosses too) draws from that first.
     * p = { x, y (feet), tile, now, facing, flash, spawnScale, moving }. False → not one of these. */
    draw(owner, ctx, enemy, p) {
        if (!enemy || !(p.tile > 0) || typeof this.deps.Image !== 'function') return false;
        if (this.deps.stageRoster.draw(owner, ctx, enemy, p)) return true;
        const pair = this.sheetFor(enemy.spriteVariantId || enemy.monsterVisualId);
        if (!pair) return false;
        this.groundShadow(ctx, pair, p);
        if (pair === 'loading') return true;
        const frame = this.motion.clipFrame(enemy, pair.kind, p.now, p.moving);
        const at = this.placement(pair, frame, this.FACING_ROW[this.deps.stageView.facing(enemy, p.facing)] || 'down', p);
        this.deps.noteEnemyDrawnHeight(enemy, (pair.spec.height + frame.bob) * at.dot);
        this.drawFrame(ctx, pair, frame, at, { outline: getEnemyOutlineStyle(enemy, this.deps.outlinePalette), flash: p.flash });
        return true;
    }
}

export function createMonsterActors(deps) {
    const motion = createMonsterMotion(deps);
    const instance = new MonsterActors(deps, motion);
    return { draw: instance.draw.bind(instance), isSheetMonster: instance.isSheetMonster, clipFrame: motion.clipFrame, frameAt: motion.frameAt, attackFrame: motion.attackFrame, snap: motion.snap, motion };
}
