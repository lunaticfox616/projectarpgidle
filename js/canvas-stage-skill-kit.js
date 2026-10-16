/** 무대 스킬 이펙트의 연결 규칙이 함께 쓰는 작은 도구 (js/canvas-stage-skill-rules.js, js/canvas-stage-skill-casts.js).
 * 룬 이름에서 인계의 룬 번호와 연결표를 찾고, 주인공과 적이 선 자리, 보는 쪽, 클립의 램프를 답한다. 읽기만 한다.
 */
const stageSkillKit = (() => {
    const WIDE = 64, DEEP = 32;                   // 한 칸의 도트
    const BODY = -50;                             // 몸 가운데 높이(발에서, 도트)
    const HAND = -58;                             // 손 높이: 투사체가 나는 높이
    let lastFace = 1;
    let names = null;                             // 인계의 룬 이름 → 번호(게임에 그림 번호가 없는 룬: 위습 소환)

    function kitNames() {
        if (!names) names = new Map(Object.entries(STAGE_SKILL_VFX.meta).map(([id, row]) => [row.name, Number(id)]));
        return names;
    }
    /** 룬 이름 → 인계의 번호: 게임의 그림 번호, 따로 시전하는 룬의 번호, 그것도 없으면 이름으로 찾는다. */
    function kitGemId(skillName) {
        const spec = SKILL_FX_ATLAS[skillName], def = SKILL_DB[skillName];
        return (spec && spec.id) || (def && def.nativeCastId) || kitNames().get(skillName) || 0;
    }
    /** @returns {?{id:number, map:object, meta:object}} 그 룬의 연결표와 갈래. 인계에 없는 룬이면 null. */
    function kitGemOf(skillName) {
        const id = kitGemId(skillName), map = id ? STAGE_SKILL_VFX.gems[id] : null;
        return map ? { id, map, meta: STAGE_SKILL_VFX.meta[id] } : null;
    }
    const kitRamp = (gem, element) => gem.map.ramp || STAGE_SKILL_VFX.elementRamp[element] || STAGE_SKILL_VFX.elementRamp[gem.meta.el] || 'phys';
    const kitRef = (value, index = 0) => (Array.isArray(value) ? value[index % value.length] : value);
    const kitOnGround = ref => { const clip = stageSkillVfx.clipOf(ref); return !!clip && clip.an === 'bottom'; };
    const kitHeroSpot = () => ({ gx: game.gridPlayer.gx, gy: game.gridPlayer.gy });
    const kitEnemy = id => (game.enemies || []).find(unit => unit.id === id && hasGridCell(unit)) || null;
    /** 적이 선 자리: 몸의 가로 가운데와 앞줄. */
    function kitEnemySpot(enemy) {
        const size = getGridUnitFootprint(enemy);
        return { gx: enemy.gx + (size.columns - 1) / 2, gy: enemy.gy + size.rows - 1 };
    }
    const SIDE = Object.freeze({ west: -1, east: 1 });
    /** 주인공이 보는 쪽(1 오른쪽, -1 왼쪽): 이번 프레임에 주인공 그림이 볼 쪽(걷는 쪽, 공격 중이면 대상이 선 쪽. js/canvas-battlefield.js가
     * 타격을 넘기기 전에 정한다), 그것이 좌우가 아니면 공격 대상이 선 쪽, 그것도 없으면 마지막으로 그려진 쪽. 주인공에게 붙는 연출(휘두름,
     * 마법진, 발사 섬광)은 이 값을 써서 늘 주인공 그림의 앞에 나온다. */
    function kitHeroFace() {
        const view = typeof battleVisualState === 'object' ? battleVisualState : {};
        return SIDE[view.playerFacingDirection] || SIDE[view.playerAttackDirection]
            || (typeof stageActors === 'object' && stageActors.facing ? stageActors.facing() : lastFace);
    }
    /** 마지막으로 친 쪽을 적어 둔다(방향을 알 수 없는 사건이 쓴다). */
    function kitNoteFace(face) { if (face) lastFace = face; }
    const kitLastFace = () => lastFace;
    const kitAt = (spot, dx = 0, dy = 0) => ({ gx: spot.gx, gy: spot.gy, dx, dy });
    /** 그 자리의 화면 좌표(발 자리)와 도트 하나의 크기. */
    function kitScreen(p, spot) {
        const base = p.cellToScreen(spot.gx, spot.gy);
        return { x: base.x, y: base.y + (p.actorGroundOffsetY || 0), dot: stageActors.scaleFor(p.tileW) };
    }
    /** 길(칸과 그 칸에 닿는 때)을 따라 지금 있는 자리와 나아가는 쪽. 길이 없으면 처음 칸에서 대상 칸으로 곧게 간다. */
    function kitAlong(event, elapsed) {
        const path = event.travelPath && event.travelPath.length > 1 ? event.travelPath
            : [{ ...event.sourceCell, offsetMs: 0 }, { ...event.targetCells[0], offsetMs: event.duration }];
        let i = 0;
        while (i < path.length - 2 && path[i + 1].offsetMs <= elapsed) i++;
        const a = path[i], b = path[i + 1], u = Math.max(0, Math.min(1, (elapsed - a.offsetMs) / Math.max(1, b.offsetMs - a.offsetMs)));
        return { gx: a.gx + (b.gx - a.gx) * u, gy: a.gy + (b.gy - a.gy) * u, face: Math.sign(b.gx - a.gx) || lastFace, from: a, to: b };
    }
    const EMERGE = 10;  // 쓴 자리에서 앞으로 내민 손까지(도트)
    /** 쓴 자리에서 나아가는 그림(파동, 곧게 나는 투사체)을 쓴 사람이 내민 손보다 앞쪽에만 그리게 한다. 그런 그림은 앞머리가 기준점이라
     * 몸통이 뒤로 길게 놓이고, 막 나갈 때는 쓴 사람의 등 뒤까지 걸쳐 등 뒤에서 나오는 것처럼 보였다(2026-10-13 사용자: 서리 파동이
     * "캐릭터 몸 뒤쪽에서부터 나오는것 같으니"). 이렇게 가리면 몸 앞에서 자라 나와 나아간다. 깊이 쪽으로 곧게 가는 것은 가리지 않는다.
     * 부른 쪽이 save와 restore로 감싼다. @param {CanvasRenderingContext2D} ctx @param {object} p 투영 @param {object} event 그림 사건 */
    function kitEmerge(ctx, p, event) {
        const first = kitAlong(event, 0), face = Math.sign(first.to.gx - first.from.gx);
        if (!face || Math.abs(first.to.gx - first.from.gx) < 0.5) return;
        const at = kitScreen(p, first.from), x = at.x + face * EMERGE * at.dot, span = ctx.canvas.width + ctx.canvas.height;
        ctx.beginPath();
        ctx.rect(face < 0 ? x - span : x, -span, span, span * 2);
        ctx.clip();
    }
    return Object.freeze({ WIDE, DEEP, BODY, HAND, gemOf: kitGemOf, ramp: kitRamp, ref: kitRef, onGround: kitOnGround, heroSpot: kitHeroSpot, enemy: kitEnemy,
        enemySpot: kitEnemySpot, heroFace: kitHeroFace, noteFace: kitNoteFace, lastFace: kitLastFace, at: kitAt, screen: kitScreen, along: kitAlong, emerge: kitEmerge });
})();
safeExposeGlobals({ stageSkillKit });
