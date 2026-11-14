class StageGothicCenser {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.MIST_PIVOT = Object.freeze([0, -60]);
    }

    censerTilt(head) {
        const a = -Math.atan2(head.x - this.MIST_PIVOT[0], head.y - this.MIST_PIVOT[1]) * 180 / Math.PI;
        return Math.max(0, Math.min(6, Math.round((Math.max(-60, Math.min(60, a)) + 60) / 20)));
    }

    /** 동작이 그리는 향로 머리 자리에 금색 고딕 향로를 겹친다(두 번째 향로를 따로 돌리지 않는다). head(): 지금 장의 머리(발에서 도트) 또는 null.
     * 시뮬레이터처럼 뒤쪽 장에서도 몸 위에 그린다(몸 뒤에 두면 동작 그림의 은빛 향로가 보인다). */
    dressCenser(head, life) {
        this.deps.stageSkillVfx.paint(this.shared.K.at(this.shared.K.heroDrawn()), { life, layer: 'top', follow: this.shared.K.heroDrawn }, (ctx, t, dot) => {
            const h = head();
            if (!h) return;
            ctx.scale(dot, dot); ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.shared.built.censer[this.censerTilt(h)], Math.round(h.x - 32), Math.round(h.y - 32));
        });
    }

    /** 향연 한 줄기: 향로 머리에서 나와 바깥쪽으로 조금 흐르며 떠올라 한 번 커졌다 사라진다(0.65초). pocket(): 얼굴, 가슴과 향로 머리의 빈칸(도트, 이 자리 기준). */
    incensePuff(spot, head, pocket) {
        const length = Math.max(20, Math.hypot(head.x, head.y + 34)), vx = head.x / length, vy = (head.y + 34) / length, face = head.x >= 0 ? 1 : -1;
        this.deps.stageSkillVfx.paint(this.shared.K.at(spot, head.x, head.y - 7), { life: 650, layer: head.rear ? 'ground' : 'top' }, (ctx, age, dot) => {
            const u = this.shared.clamp(age / 650), alpha = 0.46 * Math.min(1, age / 80) * (1 - this.shared.clamp((age - 270) / 380));
            if (alpha <= 0) return;
            ctx.scale(dot, dot);
            const w = Math.round(52 + u * 24), h = Math.round(w * 0.8), holes = head.rear ? null : pocket(head.x, head.y - 7);
            if (holes) { ctx.beginPath(); ctx.rect(-4096, -4096, 8192, 8192); holes.forEach(r => ctx.rect(...r)); ctx.clip('evenodd'); }
            ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
            ctx.translate(Math.round(vx * age * 0.057), Math.round(-11 - age * 0.025 + vy * age * 0.008)); ctx.scale(face, 1);
            ctx.drawImage(this.shared.image('incense'), -Math.round(w / 2), -Math.round(h / 2), w, h);
        });
    }

    /** 둘레에 낮게 퍼지는 향연 여섯(앞쪽 셋은 몸 앞, 뒤쪽 셋은 몸 뒤, 0.79초). radius: 둘레 칸. */
    incenseField(spot, radius) {
        const rx = (radius + 0.5) * this.shared.WIDE * 0.7, ry = (radius + 0.5) * this.shared.DEEP * 0.65;
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3, front = Math.sin(a) >= 0;
            this.deps.stageSkillVfx.paint(this.shared.K.at(spot), { life: 790, layer: front ? 'top' : 'ground' }, (ctx, age, dot) => {
                const fade = this.shared.clamp(age / 140) * (1 - this.shared.clamp((age - 430) / 360)), grow = 0.65 + 0.35 * this.shared.clamp(age / 280);
                if (fade <= 0) return;
                ctx.scale(dot, dot); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.25 * fade;
                ctx.translate(Math.round(Math.cos(a) * rx * grow), Math.round(-24 + Math.sin(a) * ry * grow - age * 0.007)); ctx.scale(i % 2 ? 1 : -1, 1);
                ctx.drawImage(this.shared.image('incense'), -36, -28, 72, 56);
            });
        }
    }
}

export function createStageGothicCenser(deps, shared) {
    return new StageGothicCenser(deps, shared);
}
