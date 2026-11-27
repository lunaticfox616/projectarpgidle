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

    /** 몸이 뜨는 이동 룬(섬머솔트 슬래시)의 공중 시간(ms, data/skills.js mobilityPattern.airMs), 포물선 높이(도트), 도는 각(인계의 startFlip).
     * 공중제비(flip)는 높이 34도트로 한 바퀴. 아니면 null. 2026-10-20 v42: 주인공 그림의 공중제비는 그림이 스스로 뛰고 돌아서, 그림이 뜨는 높이
     * (data/stage-characters.js lift)만큼 포물선을 낮추고 코드로 돌리지 않는다. 포물선으로 뛰던 도약 강타는 2026-11-27 강림(descendPose)이 이었다. */
    runeAir(gem) {
        const ms = Number(((this.deps.SKILL_DB[gem.meta.name] || {}).mobilityPattern || {}).airMs) || 0;
        return ms && gem.map.flip ? this.flipAir(ms, this.heroMotionClip(gem.meta.name)) : null;
    }

    flipAir(ms, drawn) {
        return drawn && drawn.motion === 'flip' ? { ms, arc: Math.max(8, 34 - this.drawnLift(drawn)), spin: 0 } : { ms, arc: 34, spin: Math.PI * 2 };
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
        const fx = this.latestMobility(now);
        this.airNow = fx && fx.descend ? this.descendPose(fx, now) : this.flipPose(fx, now);
        return this.airNow;
    }

    /** 공중제비(섬머솔트 슬래시)의 자세, 공중이 아니면 null. */
    flipPose(fx, now) {
        const gem = fx && fx.skillName && fx.fromCell && fx.toCell ? this.K.gemOf(fx.skillName) : null, air = gem ? this.runeAir(gem) : null;
        const k = air ? (now - fx.start) / air.ms : 1;
        return k < 1 ? this.runeAirPose({ from: fx.fromCell, to: fx.toCell }, air, k) : null;
    }

    /** 강림(2026-11-27 V3.24 시뮬레이터 startDescend): 웅크렸다가(wind) 떠난 칸에서 화면 밖으로 솟구치고(up, 처음이 빠르다), 안 보이는 동안(hang)
     * 닿는 칸 위로 옮겨 빨라지며 내리꽂힌다(fall). sky: 화면 밖 높이의 몫(0~1), 주인공 그림이 발에서 화면 위 끝까지에 170도트를 더한 높이로 바꾼다
     * (modules/rendering/player-figure.mjs drawStageHeroAloft). 그림은 통째로 옮기기만 한다. */
    descendPose(fx, now) {
        const d = fx.descend, t = now - d.at, top = d.wind + d.up, drop = top + d.hang;
        if (t < 0 || t >= drop + d.fall) return null;
        const spot = t < top ? fx.fromCell : fx.toCell;
        return { gx: spot.gx, gy: spot.gy, lift: 0, rot: 0, sky: this.descendSky(d, t, top, drop) };
    }

    descendSky(d, t, top, drop) {
        if (t < d.wind) return 0;
        if (t < top) { const u = (t - d.wind) / d.up; return u * (2 - u) * 0.35 + u * u * 0.65; }
        if (t < drop) return 1;
        const u = (t - drop) / d.fall;
        return 1 - u * u;
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
