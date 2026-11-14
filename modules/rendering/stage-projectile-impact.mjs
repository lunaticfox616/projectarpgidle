/** 투사체가 맞는 자리의 타격감(2026-11-02 스킬 전체 전달본 V3.8, V3.9.1, 사용자 "투사체 적중시의 타격감이 부족합니다"): 맞을 때마다 맞은 자리의 섬광(pixelfx hit-spark), 부드러운 빛,
 * 바닥의 빛 웅덩이와 퍼지는 점선 고리, 무게만큼의 화면 흔들림. 연쇄로 건너간 적에게는 같은 투사체가 날아와 꽂히는 타격감(2026-11-09 V3.14.1),
 * 연쇄 주문, 독창 투척, 탄성 플라스크만 번개선과 작은 전기 매듭(zap-hit). 룬의 타격 클립은 그대로 함께 나온다(js/canvas-stage-skill-rules.js).
 * 피해와 판정에는 닿지 않는다. 관통하는 발이 잠깐 멈추는 일은 js/combat-grid.js pierceHoldMs가 맡는다. 시뮬레이터의 "판정 표시" 칠은 게임에 그 설정이 없어 넣지 않았다.
 * 크기는 캐릭터 도트다. 무게: 화살 1, 창 1.3, 큰 창 1.7, 화염 검기 1.4, 플라스크 1.2. */
import { scaleForStageArt } from '../common/stage-art-scale.mjs';

class StageProjectileImpact {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.WEIGHT = Object.freeze({ 7: 1.3, 9: 1.3, 11: 1.3, 26: 1.3, 30: 1.7, 14: 1, 25: 1, 78: 1, 44: 1.2, 66: 1.4, 45: 1.3, 49: 1 });
        this.ONLY = Object.freeze({ 49: fx => String(fx.damageTextGroupId).endsWith(':stab') });
        this.BODY_WEIGHT = Object.freeze({ arrow: 1, spear: 1, flask: 1.2 });
        this.weightOf = (gem, fx) => (this.WEIGHT[gem.id] && (!this.ONLY[gem.id] || this.ONLY[gem.id](fx)) ? this.WEIGHT[gem.id] : this.BODY_WEIGHT[gem.meta.body] || 0);
        this.SKIP = 23;
        this.SPARK_HEIGHT = -44;
        this.KNOT_HEIGHT = -50;
        this.KNOT_WEIGHT = 0.7;
        this.kick = { until: -1e9, amp: 0, ms: 1 };
        this.rampOf = element => this.deps.STAGE_SKILL_VFX.elementRamp[element] || 'phys';
        this.colours = element => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
        this.chained = fx => ['chainJump', 'supportChain'].includes(fx.stageKind) || String(fx.damageTextGroupId).endsWith(':chain');
        this.splash = fx => String(fx.damageTextGroupId).endsWith(':pop');
        this.isProjectile = gem => (this.deps.SKILL_DB[gem.meta.name]?.tags || []).includes('projectile');
        this.KNOT_KEEP = new Set([9, 44]);
        this.HOP_WEIGHT = Object.freeze({ 47: 1.2, 48: 1.2, 79: 1.2, 87: 1.2 });
    }

    shakeKick(amp, ms) {
        const now = this.deps.stageSkillVfx.now(), left = Math.max(0, this.kick.until - now) / this.kick.ms * this.kick.amp;
        if (amp >= left) this.kick = { until: now + ms, amp, ms };
    }

    /** 지금 흔들 세기(도트). 전장의 흔들림(js/canvas-battlefield.js getBattleCameraShake)과 겹치면 큰 쪽이 된다. */
    impactShake(now) {
        const left = this.kick.until - now;
        return left <= 0 || left > this.kick.ms ? 0 : this.kick.amp * left / this.kick.ms;
    }

    /** 바닥에 눕힌 빛 웅덩이와 퍼지는 점선 고리. */
    paintGround(look, weight) {
        return (ctx, t, dot) => {
            if (t < 260) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.22 * (1 - t / 260);
                ctx.fillStyle = look.c2;
                ctx.beginPath();
                ctx.ellipse(0, 0, 22 * weight * dot, 7 * weight * dot, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            if (t >= 200) return;
            const k = t / 200, r = 6 + 22 * weight * (1 - (1 - k) ** 2), n = Math.round(10 + r), size = Math.max(1, Math.round(dot));
            ctx.globalAlpha = 0.7 * (1 - k);
            ctx.fillStyle = look.c1;
            for (let i = 0; i < n; i += 2) {
                const q = i / n * Math.PI * 2;
                ctx.fillRect(Math.round(Math.cos(q) * r * dot), Math.round(Math.sin(q) * r * 0.32 * dot), size, size);
            }
        };
    }

    /** 맞은 자리의 부드러운 빛. */
    paintLight(look, reach) {
        return (ctx, t, dot) => {
            const r = reach * dot, glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            glow.addColorStop(0, look.c2);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.34 * (1 - t / 170);
            ctx.fillStyle = glow;
            ctx.fillRect(-r, -r, r * 2, r * 2);
        };
    }

    /** 한 발이 맞은 자리. from: 날아온 자리(연쇄로 건너온 발은 앞 적, 그 밖에는 주인공). */
    playStrike(gem, hit, weight, from = this.K.heroSpot()) {
        const { victim, look, fx } = hit, face = look.face, shade = this.colours(fx.element);
        const angle = Math.atan2((victim.gy - from.gy) * this.K.DEEP, Math.abs(victim.gx - from.gx) * this.K.WIDE + 1), own = gem.map.pfxImpact;
        const spot = this.K.at(victim, -face * 4, this.SPARK_HEIGHT);
        this.deps.stageSkillVfx.play(own || `pfx_hitspark@${this.rampOf(fx.element)}`, spot, { face, rot: own ? 0 : angle, scale: 0.9 + 0.25 * (weight - 1) });
        if (gem.map.pfxBurst) this.deps.stageSkillVfx.play(gem.map.pfxBurst, this.K.at(victim, 0, 1), { face, alpha: 0.95 });
        this.deps.stageSkillVfx.paint(this.K.at(victim, 0, 1), { life: 260, layer: 'ground' }, this.paintGround(shade, weight));
        this.deps.stageSkillVfx.paint(spot, { life: 170 }, this.paintLight(shade, 16 + 6 * weight));
        const dot = scaleForStageArt(this.deps.stageSkillVfx.projection()?.tileW || this.K.WIDE, this.deps.STAGE_VIEW.heroTile);
        this.shakeKick((weight >= 1.6 ? 2 : weight >= 1.2 ? 1.5 : 1) * dot, 90 + 30 * weight);
    }

    /** 연쇄의 번개선: 앞서 맞은 적에서 이번 적까지 들쭉날쭉한 도트 선. */
    paintZap(look, dx, dy) {
        const points = Array.from({ length: 6 }, (_, i) => [dx * i / 5 + (i % 5 ? (Math.random() - 0.5) * 12 : 0), dy * i / 5 + (i % 5 ? (Math.random() - 0.5) * 12 : 0)]);
        return (ctx, t, dot) => {
            const size = Math.max(1, Math.round(dot));
            ctx.globalAlpha = 1 - t / 200;
            ctx.fillStyle = look.c1;
            points.slice(1).forEach(([x, y], i) => {
                const [x0, y0] = points[i], steps = Math.max(1, Math.ceil(Math.hypot(x - x0, y - y0)));
                for (let u = 0; u <= steps; u++) ctx.fillRect(Math.round((x0 + (x - x0) * u / steps) * dot), Math.round((y0 + (y - y0) * u / steps) * dot), size, size);
            });
        };
    }

    playKnot(gem, hit) {
        const { victim, look, fx } = hit, before = fx.chainFromEnemyId == null ? null : this.K.enemy(fx.chainFromEnemyId), from = before ? this.K.enemySpot(before) : fx.sourceCell;
        if (!gem.map.zap && from) this.deps.stageSkillVfx.paint(this.K.at(from, 0, this.KNOT_HEIGHT), { life: 200 }, this.paintZap(this.colours(fx.element), (victim.gx - from.gx) * this.K.WIDE, (victim.gy - from.gy) * this.K.DEEP));
        this.deps.stageSkillVfx.play(`pfx_zaphit@${fx.element === 'light' ? '=' : this.rampOf(fx.element)}`, this.K.at(victim, -look.face * 4, this.KNOT_HEIGHT), { face: look.face, scale: this.KNOT_WEIGHT, alpha: 0.9 });
    }

    playHop(gem, hit) {
        const { victim, look, fx } = hit, before = fx.chainFromEnemyId == null ? null : this.K.enemy(fx.chainFromEnemyId);
        this.playStrike(gem, hit, this.WEIGHT[gem.id] || this.HOP_WEIGHT[gem.id] || 1, before ? this.K.enemySpot(before) : undefined);
        const burst = this.HOP_WEIGHT[gem.id] ? gem.map.burst || gem.map.area : null;
        if (burst) this.deps.stageSkillVfx.play(burst, this.K.at(victim, 0, this.K.onGround(burst) ? 1 : -30), { face: look.face, ramp: look.ramp, scale: 0.7 });
        if (gem.map.bolt) this.deps.stageSkillVfx.play(gem.map.bolt, this.K.at(victim, 0, 1), { face: look.face, ramp: look.ramp, scale: 0.7 });
    }

    /** 맞은 적마다 한 번(js/canvas-stage-skill-rules.js ruleNoteHit). */
    impactNote(gem, hit) {
        if (gem.id === this.SKIP || this.splash(hit.fx)) return;
        if (this.chained(hit.fx)) {
            if (!(this.WEIGHT[gem.id] || this.isProjectile(gem))) return;
            if (gem.map.zap || this.KNOT_KEEP.has(gem.id)) this.playKnot(gem, hit); else this.playHop(gem, hit);
            return;
        }
        const weight = this.weightOf(gem, hit.fx);
        if (weight) this.playStrike(gem, hit, weight);
    }

    /** 그 룬이 틀 수 있는 클립(낀 룬의 띠를 미리 만든다: js/canvas-stage-skill-rules.js ruleGemClips). */
    impactRefs(gem, element) {
        if (gem.id === this.SKIP || !(this.WEIGHT[gem.id] || this.isProjectile(gem))) return [];
        return [`pfx_hitspark@${this.rampOf(element)}`, `pfx_zaphit@${element === 'light' ? '=' : this.rampOf(element)}`];
    }
}

export function createStageProjectileImpact(deps) {
    const instance = new StageProjectileImpact(deps);
    return Object.freeze({ note: instance.impactNote.bind(instance), refs: instance.impactRefs.bind(instance), shake: instance.impactShake.bind(instance) });
}
