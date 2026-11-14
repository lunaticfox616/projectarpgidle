import { createStageSkillCatalog } from './stage-skill-catalog.mjs';
import { scaleForStageArt } from '../common/stage-art-scale.mjs';

/** 무대 스킬 이펙트의 연결 규칙이 함께 쓰는 작은 도구 (js/canvas-stage-skill-rules.js, js/canvas-stage-skill-casts.js).
 * 룬 이름에서 인계의 룬 번호와 연결표를 찾고, 주인공과 적이 선 자리, 보는 쪽, 클립의 램프를 답한다. 읽기만 한다.
 */
class StageSkillKit {
    constructor(deps) {
        this.deps = deps;
        this.WIDE = 64;
        this.DEEP = 32;
        this.BODY = -50;
        this.HAND = -58;
        this.lastFace = 1;

        this.kitRamp = (gem, element) => gem.map.ramp || this.deps.STAGE_SKILL_VFX.elementRamp[element] || this.deps.STAGE_SKILL_VFX.elementRamp[gem.meta.el] || 'phys';
        this.kitRef = (value, index = 0) => (Array.isArray(value) ? value[index % value.length] : value);
        this.kitOnGround = ref => { const clip = this.deps.stageSkillVfx.clipOf(ref); return !!clip && clip.an === 'bottom'; };
        this.SIDE = Object.freeze({ west: -1, east: 1 });
        this.kitLastFace = () => this.lastFace;
        this.kitAt = (spot, dx = 0, dy = 0) => ({ gx: spot.gx, gy: spot.gy, dx, dy });
        this.EMERGE = 10;
    }

    /** 주문 룬인데 지금 활로 쏘는 룬(STAGE_VIEW.runeStanceMotions): 시전의 오라와 발밑 고리 대신 활의 빛을 쓴다. */
    kitFiredFromBow(skillName) {
        return !!this.deps.STAGE_VIEW.runeStanceMotions[skillName]?.bow && this.deps.getEquippedWeaponStance() === 'bow';
    }

    kitHeroSpot(owner) { return { gx: owner.gridPlayer.gx, gy: owner.gridPlayer.gy }; }

    /** 그려진 주인공이 선 자리(칸, 소수): 걷거나 이동 룬으로 옮겨 가는 동안 그림은 칸보다 늦게 따라간다. 주인공에 붙어 따라가는 연출이 쓴다.
     * 아직 그린 적이 없으면 주인공의 칸. */
    kitHeroDrawn(owner) {
        const p = this.deps.stageSkillVfx.projection(), pos = typeof this.deps.battleVisualState === 'object' ? this.deps.battleVisualState.playerPos : null;
        if (!p || !pos) return this.kitHeroSpot(owner);
        const o = p.cellToScreen(0, 0), ax = p.cellToScreen(1, 0), ay = p.cellToScreen(0, 1), lift = p.actorGroundOffsetY || 0;
        return { gx: (pos.x - o.x) / ((ax.x - o.x) || 1), gy: (pos.y - lift - o.y) / ((ay.y - o.y) || 1) };
    }

    kitEnemy(owner, id) { return (owner.enemies || []).find(unit => unit.id === id && this.deps.hasGridCell(unit)) || null; }

    /** 적이 선 자리: 몸의 가로 가운데와 앞줄. */
    kitEnemySpot(enemy) {
        const size = this.deps.getGridUnitFootprint(enemy);
        return { gx: enemy.gx + (size.columns - 1) / 2, gy: enemy.gy + size.rows - 1 };
    }

    /** 주인공이 보는 쪽(1 오른쪽, -1 왼쪽): 이번 프레임에 주인공 그림이 볼 쪽(걷는 쪽, 공격 중이면 대상이 선 쪽. js/canvas-battlefield.js가
     * 타격을 넘기기 전에 정한다), 그것이 좌우가 아니면 공격 대상이 선 쪽, 그것도 없으면 마지막으로 그려진 쪽. 주인공에게 붙는 연출(휘두름,
     * 마법진, 발사 섬광)은 이 값을 써서 늘 주인공 그림의 앞에 나온다. */
    kitHeroFace() {
        const view = typeof this.deps.battleVisualState === 'object' ? this.deps.battleVisualState : {};
        return this.SIDE[view.playerFacingDirection] || this.SIDE[view.playerAttackDirection]
            || (typeof this.deps.stageActors === 'object' && this.deps.stageActors.facing ? this.deps.stageActors.facing() : this.lastFace);
    }

    /** 마지막으로 친 쪽을 적어 둔다(방향을 알 수 없는 사건이 쓴다). */
    kitNoteFace(face) { if (face) this.lastFace = face; }

    /** 그 자리의 화면 좌표(발 자리)와 도트 하나의 크기. */
    kitScreen(p, spot) {
        const base = p.cellToScreen(spot.gx, spot.gy);
        return { x: base.x, y: base.y + (p.actorGroundOffsetY || 0), dot: scaleForStageArt(p.tileW, this.deps.STAGE_VIEW.heroTile) };
    }

    /** 길(칸과 그 칸에 닿는 때)을 따라 지금 있는 자리와 나아가는 쪽. 길이 없으면 처음 칸에서 대상 칸으로 곧게 간다. */
    kitAlong(event, elapsed) {
        const path = event.travelPath && event.travelPath.length > 1 ? event.travelPath
            : [{ ...event.sourceCell, offsetMs: 0 }, { ...event.targetCells[0], offsetMs: event.duration }];
        let i = 0;
        while (i < path.length - 2 && path[i + 1].offsetMs <= elapsed) i++;
        const a = path[i], b = path[i + 1], u = Math.max(0, Math.min(1, (elapsed - a.offsetMs) / Math.max(1, b.offsetMs - a.offsetMs)));
        const face = Math.sign(b.gx - a.gx) || Math.sign(path[path.length - 1].gx - path[0].gx) || this.lastFace;   // 맞은 자리에 멈춘 동안(같은 칸 두 점)에도 나아가던 쪽을 본다
        return { gx: a.gx + (b.gx - a.gx) * u, gy: a.gy + (b.gy - a.gy) * u, face, from: a, to: b };
    }

    /** 쓴 자리에서 나아가는 그림(파동, 곧게 나는 투사체)을 쓴 사람이 내민 손보다 앞쪽에만 그리게 한다. 그런 그림은 앞머리가 기준점이라
     * 몸통이 뒤로 길게 놓이고, 막 나갈 때는 쓴 사람의 등 뒤까지 걸쳐 등 뒤에서 나오는 것처럼 보였다(2026-10-13 사용자: 서리 파동이
     * "캐릭터 몸 뒤쪽에서부터 나오는것 같으니"). 이렇게 가리면 몸 앞에서 자라 나와 나아간다. 깊이 쪽으로 곧게 가는 것은 가리지 않는다.
     * 부른 쪽이 save와 restore로 감싼다. @param {CanvasRenderingContext2D} ctx @param {object} p 투영 @param {object} event 그림 사건 */
    kitEmerge(ctx, p, event) {
        const first = this.kitAlong(event, 0), face = Math.sign(first.to.gx - first.from.gx);
        if (!face || Math.abs(first.to.gx - first.from.gx) < 0.5) return;
        const at = this.kitScreen(p, first.from), x = at.x + face * this.EMERGE * at.dot, span = ctx.canvas.width + ctx.canvas.height;
        ctx.beginPath();
        ctx.rect(face < 0 ? x - span : x, -span, span, span * 2);
        ctx.clip();
    }
}

export function createStageSkillKit(deps) {
    const catalog = createStageSkillCatalog(deps);
    const instance = new StageSkillKit(deps);
    return Object.freeze({ catalog, WIDE: instance.WIDE, DEEP: instance.DEEP, BODY: instance.BODY, HAND: instance.HAND, gemId: catalog.gemId, gemOf: catalog.gemOf, firedFromBow: instance.kitFiredFromBow.bind(instance), ramp: instance.kitRamp, ref: instance.kitRef, onGround: instance.kitOnGround, heroSpot: instance.kitHeroSpot.bind(instance), enemy: instance.kitEnemy.bind(instance),
        heroDrawn: instance.kitHeroDrawn.bind(instance), enemySpot: instance.kitEnemySpot.bind(instance), heroFace: instance.kitHeroFace.bind(instance), noteFace: instance.kitNoteFace.bind(instance), lastFace: instance.kitLastFace, at: instance.kitAt, screen: instance.kitScreen.bind(instance), along: instance.kitAlong.bind(instance), emerge: instance.kitEmerge.bind(instance) });
}
