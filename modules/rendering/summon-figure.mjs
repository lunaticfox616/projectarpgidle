import { clampNumber } from '../common/numbers.mjs';

// summon1.png keeps only the guard golem. Wisps use stage-skill-casts; unloaded frames use the existing dot fallback.
const SUMMON1_CANONICAL_WIDTH = 540;
const SUMMON1_FRAMES = Object.freeze({ '수액 골렘 소환': Object.freeze([464, 540]) });

function getSummonSpriteFrameRectByName(name, image) {
    const span = image && image.width && image.height ? SUMMON1_FRAMES[String(name || '').trim()] : null;
    if (!span) return null;
    const scale = image.width / SUMMON1_CANONICAL_WIDTH, sx = clampNumber(Math.round(span[0] * scale), 0, image.width - 1);
    return { sx, sy: 0, sw: Math.max(1, clampNumber(Math.round(span[1] * scale), 0, image.width) - sx), sh: image.height };
}

class SummonFigureRenderer {
    constructor(deps) { this.deps = deps; }

    drawActiveSummons(ctx, playerPos, now, proj) {
        const summons = (this.deps.summons() || []).filter(s => s && s.alive && (s.hp || 0) > 0);
        if (summons.length <= 0) return;
        const strikes = this.getLatestSummonStrikes(now);
        summons.forEach((summon, index) => {
            const at = this.getSummonDrawPosition(summon, index, { count: summons.length, playerPos, now, proj });
            ctx.save();
            if (summon.isGhost) ctx.globalAlpha = 0.46;
            const top = this.drawWispSummon(ctx, summon, at, { now, proj, strike: strikes.get(summon.id) }) ?? this.drawLegacySummon(ctx, summon, at);
            if (summon.isGhost) this.drawSummonGhostRing(ctx, summon, at);
            ctx.restore();
            this.drawSummonHpBar(ctx, summon, at.x, top);
            this.deps.doorMarks.seal.body({ x: at.x, y: at.y, halfW: Math.max(12, (at.y - top) * .5), h: at.y - top });
        });
    }

    /** 그리드 유닛: 자기 칸(발 위치)에 그린다 — 위습은 공격할 때도 제자리에서 쏜다(인계 lunge 0). 칸이 아직 없으면(스폰 직후)
     * 플레이어 주변 궤도로 표시한다. */
    getSummonDrawPosition(summon, index, view) {
        if (view.proj && this.deps.hasGridCell(summon)) {
            const cell = view.proj.cellToScreen(summon.gx, summon.gy);
            return { x: cell.x, y: cell.y + (Number(view.proj.actorGroundOffsetY) || 0) };
        }
        const angle = (view.now / 1000) * 0.9 + (index / Math.max(1, view.count)) * Math.PI * 2, radius = 24 + Math.min(40, view.count * 4);
        return { x: view.playerPos.x + Math.cos(angle) * radius, y: view.playerPos.y - 18 + Math.sin(angle) * 12 };
    }

    /** Latest visible strike per summon (the hit resolves as the effect starts, so it is also the strike frame's time). */
    getLatestSummonStrikes(now) {
        const strikes = new Map();
        for (const fx of this.deps.effects()) {
            if (!fx || fx.type !== 'summonAttack' || fx.start > now) continue;
            const known = strikes.get(fx.summonId);
            if (!known || fx.start > known.start) strikes.set(fx.summonId, fx);
        }
        return strikes;
    }

    /** @returns {?number} top of the drawn body, or null when the summon is no wisp or its sheet is still loading. */
    drawWispSummon(ctx, summon, at, view) {
        // 옆에서 보는 무대: 인계 받은 새 스킬 이펙트의 위습 몸(js/canvas-stage-skill-casts.js).
        return view.proj && typeof this.deps.stageSkillCasts === 'object' ? this.deps.stageSkillCasts.wispBody(ctx, summon, at, view) : null;
    }

    drawLegacySummon(ctx, summon, at) {
        const image = this.deps.assets && this.deps.assets.images ? this.deps.assets.images.summon1 : null;
        const frame = image ? getSummonSpriteFrameRectByName(summon.gemName, image) : null;
        const guard = summon.role === 'guard';
        if (frame) {
            const drawW = guard ? 42 : 34, drawH = Math.max(18, Math.round(drawW * (frame.sh / Math.max(1, frame.sw))));
            ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, Math.round(at.x - drawW / 2), Math.round(at.y - drawH + 3), drawW, drawH);
        } else {
            ctx.fillStyle = guard ? 'rgba(132, 205, 167, 0.8)' : 'rgba(159, 212, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(at.x, at.y, guard ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
        }
        return at.y - (guard ? 42 : 34);
    }

    drawSummonGhostRing(ctx, summon, at) {
        ctx.strokeStyle = 'rgba(204, 174, 255, 0.94)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(at.x, at.y - 10, summon.role === 'guard' ? 15 : 12, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawSummonHpBar(ctx, summon, x, top) {
        const hpPct = clampNumber(summon.hp / Math.max(1, summon.maxHp || summon.hp), 0, 1);
        const hpWidth = summon.role === 'guard' ? 38 : 32;
        const hpX = Math.round(x - hpWidth / 2), hpY = Math.round(top - 7);
        ctx.save();
        ctx.fillStyle = summon.isGhost ? '#c9a8ff' : (summon.role === 'guard' ? '#59d98e' : '#78d9ff');
        ctx.fillRect(hpX, hpY, Math.max(1, Math.round(hpWidth * hpPct)), 4);
        ctx.strokeStyle = 'rgba(220, 248, 255, 0.72)';
        ctx.strokeRect(hpX - 0.5, hpY - 0.5, hpWidth + 1, 5);
        ctx.restore();
    }
}

export function createSummonFigureRenderer(deps) {
    const owner = new SummonFigureRenderer(deps);
    return owner.drawActiveSummons.bind(owner);
}
