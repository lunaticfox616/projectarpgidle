/** 투사체가 맞는 자리의 타격감(2026-11-02 스킬 전체 전달본 V3.8, V3.9.1, 사용자 "투사체 적중시의 타격감이 부족합니다"): 맞을 때마다 맞은 자리의 섬광(pixelfx hit-spark), 부드러운 빛,
 * 바닥의 빛 웅덩이와 퍼지는 점선 고리, 무게만큼의 화면 흔들림. 연쇄로 건너간 적에게는 번개선과 작은 전기 매듭(zap-hit)만. 룬의 타격 클립은 그대로 함께 나온다(js/canvas-stage-skill-rules.js).
 * 피해와 판정에는 닿지 않는다. 관통하는 발이 잠깐 멈추는 일은 js/combat-grid.js pierceHoldMs가 맡는다. 시뮬레이터의 "판정 표시" 칠은 게임에 그 설정이 없어 넣지 않았다.
 * 크기는 캐릭터 도트다. 무게: 화살 1, 창 1.3, 큰 창 1.7, 화염 검기 1.4, 플라스크 1.2. */
const stageProjectileImpact = (() => {
    const K = stageSkillKit;
    /** 룬 번호 → 투사체 무게. 범위로 터지는 플라스크는 맞은 적마다 섬광을 내지 않는다(연쇄로 건너간 적만). 심연 전염은 제 연출이 맡는다. */
    const WEIGHT = Object.freeze({ 7: 1.3, 9: 1.3, 11: 1.3, 26: 1.3, 30: 1.7, 14: 1, 25: 1, 78: 1, 44: 1.2, 66: 1.4 });
    const SKIP = 23, SPARK_HEIGHT = -44, KNOT_HEIGHT = -50, KNOT_WEIGHT = 0.7;
    let kick = { until: -1e9, amp: 0, ms: 1 };

    const rampOf = element => STAGE_SKILL_VFX.elementRamp[element] || 'phys';
    const colours = element => STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements.phys;
    /** 연쇄로 건너온 타격인가: 관통은 앞서 맞은 적을 적어 두지만 같은 발이다. */
    const chained = fx => ['chainJump', 'supportChain'].includes(fx.stageKind) || String(fx.damageTextGroupId).endsWith(':chain');
    /** 탄성 플라스크가 떨어진 자리의 작은 폭발은 발이 아니다. */
    const splash = fx => String(fx.damageTextGroupId).endsWith(':pop');
    const isProjectile = gem => (SKILL_DB[gem.meta.name]?.tags || []).includes('projectile');

    function shakeKick(amp, ms) {
        const now = stageSkillVfx.now(), left = Math.max(0, kick.until - now) / kick.ms * kick.amp;
        if (amp >= left) kick = { until: now + ms, amp, ms };
    }
    /** 지금 흔들 세기(도트). 전장의 흔들림(js/canvas-battlefield.js getBattleCameraShake)과 겹치면 큰 쪽이 된다. */
    function impactShake(now) {
        const left = kick.until - now;
        return left <= 0 || left > kick.ms ? 0 : kick.amp * left / kick.ms;
    }
    /** 바닥에 눕힌 빛 웅덩이와 퍼지는 점선 고리. */
    function paintGround(look, weight) {
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
    function paintLight(look, reach) {
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
    /** 한 발이 맞은 자리. */
    function playStrike(gem, hit, weight) {
        const { victim, look, fx } = hit, hero = K.heroSpot(), face = look.face, shade = colours(fx.element);
        const angle = Math.atan2((victim.gy - hero.gy) * K.DEEP, Math.abs(victim.gx - hero.gx) * K.WIDE + 1), own = gem.map.pfxImpact;
        const spot = K.at(victim, -face * 4, SPARK_HEIGHT);
        stageSkillVfx.play(own || `pfx_hitspark@${rampOf(fx.element)}`, spot, { face, rot: own ? 0 : angle, scale: 0.9 + 0.25 * (weight - 1) });
        if (gem.map.pfxBurst) stageSkillVfx.play(gem.map.pfxBurst, K.at(victim, 0, 1), { face, alpha: 0.95 });
        stageSkillVfx.paint(K.at(victim, 0, 1), { life: 260, layer: 'ground' }, paintGround(shade, weight));
        stageSkillVfx.paint(spot, { life: 170 }, paintLight(shade, 16 + 6 * weight));
        const dot = stageActors.scaleFor(stageSkillVfx.projection()?.tileW || K.WIDE);
        shakeKick((weight >= 1.6 ? 2 : weight >= 1.2 ? 1.5 : 1) * dot, 90 + 30 * weight);
    }
    /** 연쇄의 번개선: 앞서 맞은 적에서 이번 적까지 들쭉날쭉한 도트 선. */
    function paintZap(look, dx, dy) {
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
    function playKnot(gem, hit) {
        const { victim, look, fx } = hit, before = fx.chainFromEnemyId == null ? null : K.enemy(fx.chainFromEnemyId), from = before ? K.enemySpot(before) : fx.sourceCell;
        if (!gem.map.zap && from) stageSkillVfx.paint(K.at(from, 0, KNOT_HEIGHT), { life: 200 }, paintZap(colours(fx.element), (victim.gx - from.gx) * K.WIDE, (victim.gy - from.gy) * K.DEEP));
        stageSkillVfx.play(`pfx_zaphit@${fx.element === 'light' ? '=' : rampOf(fx.element)}`, K.at(victim, -look.face * 4, KNOT_HEIGHT), { face: look.face, scale: KNOT_WEIGHT, alpha: 0.9 });
    }
    /** 맞은 적마다 한 번(js/canvas-stage-skill-rules.js ruleNoteHit). */
    function impactNote(gem, hit) {
        if (gem.id === SKIP || splash(hit.fx)) return;
        if (chained(hit.fx)) { if (WEIGHT[gem.id] || isProjectile(gem)) playKnot(gem, hit); return; }
        if (WEIGHT[gem.id]) playStrike(gem, hit, WEIGHT[gem.id]);
    }
    /** 그 룬이 틀 수 있는 클립(낀 룬의 띠를 미리 만든다: js/canvas-stage-skill-rules.js ruleGemClips). */
    function impactRefs(gem, element) {
        if (gem.id === SKIP || !(WEIGHT[gem.id] || isProjectile(gem))) return [];
        return [`pfx_hitspark@${rampOf(element)}`, `pfx_zaphit@${element === 'light' ? '=' : rampOf(element)}`];
    }
    return Object.freeze({ note: impactNote, refs: impactRefs, shake: impactShake });
})();
safeExposeGlobals({ stageProjectileImpact });
