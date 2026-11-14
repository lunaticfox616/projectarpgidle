class StageRuneAir {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.WIDE = this.K.WIDE;
        this.DEEP = this.K.DEEP;
        this.airNow = null;
        this.airMove = null;
        this.drawnLift = drawn => Number(drawn.clip.lift) || 0;
        this.airLift = () => (this.airNow ? this.airNow.lift : 0);
    }

    /** 몸이 뜨는 이동 룬의 공중 시간(ms, data/skills.js mobilityPattern.airMs), 포물선 높이(도트), 도는 각(인계의 startLeap, startFlip).
     * 공중제비(flip)는 높이 34도트로 한 바퀴, 도약은 거리에 따라 높이가 는다. 아니면 null. 2026-10-20 v42: 주인공 그림의 도약과 공중제비는
     * 그림이 스스로 뛰고 돌아서, 그림이 뜨는 높이(data/stage-characters.js lift)만큼 포물선을 낮추고 공중제비 그림이면 코드로 돌리지 않는다. */
    runeAir(gem, move) {
        const ms = Number(((this.deps.SKILL_DB[gem.meta.name] || {}).mobilityPattern || {}).airMs) || 0;
        if (!ms) return null;
        const drawn = this.heroMotionClip(gem.meta.name);
        return gem.map.flip ? this.flipAir(ms, drawn) : this.leapAir(ms, move, drawn);
    }

    flipAir(ms, drawn) {
        return drawn && drawn.motion === 'flip' ? { ms, arc: Math.max(8, 34 - this.drawnLift(drawn)), spin: 0 } : { ms, arc: 34, spin: Math.PI * 2 };
    }

    leapAir(ms, move, drawn) {
        const arc = 38 + Math.hypot((move.to.gx - move.from.gx) * this.WIDE, (move.to.gy - move.from.gy) * this.DEEP * 2) * 0.12;
        return { ms, arc: drawn && drawn.motion === 'leap' ? Math.max(12, arc - this.drawnLift(drawn)) : arc, spin: 0 };
    }

    /** 무대 주인공이 그 룬을 쓸 때 그리는 동작과 그 칸(js/canvas-stage-actors.js motionFor, clipOf). 무대가 아니거나 그 그림이 없으면 null. */
    heroMotionClip(name) {
        if ((typeof this.deps.stageView !== 'object') || typeof this.deps.getStageHeroStance !== 'function') return null;
        const classId = this.deps.getHeroAppearanceId(), stance = this.deps.getStageHeroStance(), motion = this.deps.stageActors.motionFor(name, classId, stance), clip = this.deps.stageActors.clipOf(classId, stance, motion);
        return clip ? { motion, clip } : null;
    }

    /** 가장 최근의 이동(js/combat.js가 남긴 playerMobility). 목록에서 사라졌으면 마지막으로 본 것. 없으면 null. */
    latestMobility(now) {
        for (let i = this.deps.battleFx.length - 1; i >= 0; i--) {
            const fx = this.deps.battleFx[i];
            if (fx && fx.type === 'playerMobility' && fx.start <= now) { this.airMove = fx; return fx; }
        }
        return this.airMove;
    }

    /** 이번 프레임 주인공의 공중 자세: 땅 위 자리(칸, 떠난 칸에서 닿는 칸으로), 높이(도트), 돈 각(라디안, 보는 쪽으로).
     * 가장 최근의 이동이 몸이 뜨는 룬이고 아직 공중이면, 아니면 null. */
    runeHeroAir(now) {
        const fx = this.latestMobility(now), gem = fx && fx.skillName && fx.fromCell && fx.toCell ? this.K.gemOf(fx.skillName) : null;
        const move = gem ? { from: fx.fromCell, to: fx.toCell } : null, air = move ? this.runeAir(gem, move) : null, k = air ? (now - fx.start) / air.ms : 1;
        this.airNow = k < 1 ? this.runeAirPose(move, air, k) : null;
        return this.airNow;
    }

    runeAirPose(move, air, k) {
        const face = Math.sign(move.to.gx - move.from.gx) || this.K.heroFace();
        return { gx: move.from.gx + (move.to.gx - move.from.gx) * k, gy: move.from.gy + (move.to.gy - move.from.gy) * k, lift: air.arc * 4 * k * (1 - k), rot: air.spin * k * face };
    }
}

export function createStageRuneAir(deps) {
    const instance = new StageRuneAir(deps);
    return Object.freeze({ runeAir: instance.runeAir.bind(instance), runeHeroAir: instance.runeHeroAir.bind(instance), airLift: instance.airLift });
}
