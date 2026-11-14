/** 없어진 창(7단계 2026-10-01: 가지치기 · 아르카나 · 전문가)의 메뉴 단추. 저장된 순서 · 배치에서 버린다. */
/** 보스 특수 공격의 예고 상태는 저장에 싣지 않는다(다음 틱에 다시 계산한다). 예전 저장은 예고 영역의 중심에 보스 전체 사본이
 * 겹겹이 들어가 특수 공격마다 커졌다(검토 5차: 20분 보스전에서 저장 1MB · 직렬화 실패) — 중심은 칸 좌표로 줄인다. 두 번 불러와도 같다. */
export function stripBossPatternRuntime(deps, enemy) {
    if (!enemy || typeof enemy !== 'object') return;
    // 다음 예고 미리보기(nextPatternState)는 영역이 없어 겹치지 않으니 그대로 둔다 — 지우면 불러온 탐험이 저장 전과 달라졌다.
    delete enemy.lastPatternState;
    // The shared pending-hit queue is runtime-only. Restart this authored cast with its full warning on reload.
    if (enemy.patternMode === 'woodsman') {
        normalizeWoodsmanStumps(deps, enemy);
        Object.assign(enemy, { patternArea: null, patternTelegraphKey: null, patternTelegraphStartedAt: 0,
            nextPatternState: null, attackCast: null, attackTimer: 0, apexRecoveryUntil: 0 });
    }
    const center = enemy.patternArea && enemy.patternArea.center;
    const nested = center && typeof center === 'object' && ['hp', 'patternArea', 'lastPatternState'].some(key => key in center);
    if (nested) enemy.patternArea.center = { gx: Math.floor(Number(center.gx) || 0), gy: Math.floor(Number(center.gy) || 0) };
}

/** Keep only the bounded, non-transient summon anchors when loading a Woodsman encounter. */
export function normalizeWoodsmanStumps(deps, enemy) {
        enemy.woodsmanStumpsDue = !!enemy.woodsmanStumpsDue;
        enemy.woodsmanStumpsPlaced = !!enemy.woodsmanStumpsPlaced;
        const rows = Array.isArray(enemy.woodsmanStumps) ? enemy.woodsmanStumps : [];
        enemy.woodsmanStumps = rows.filter(c => c && Number.isInteger(c.gx) && Number.isInteger(c.gy)
            && c.gx >= 0 && c.gy >= 0 && c.gx < 999 && c.gy < 999).slice(0, 1)
            .map(((...args) => normalizeWoodsmanStumpAnchor(deps, ...args)));
}

export function normalizeWoodsmanStumpAnchor(deps, c) {
    const time = value => Number.isFinite(value) ? Math.max(0, value) : 0;
    // Old 1-cell chests retain their footprint: never enlarge a restored obstacle underneath a player.
    const large = c.footprint?.columns === 3 && c.footprint?.rows === 2;
    const footprint = large ? { columns: 3, rows: 2 } : { columns: 1, rows: 1 };
    const { phase, target } = normalizeWoodsmanCycle(c);
    const cap = deps.WOODSMAN_BATTLE.stumps.maxAdds, count = Number.isFinite(c.absorbedCount) ? Math.floor(c.absorbedCount) : 0;
    return { gx: c.gx, gy: c.gy, footprint, plantedAt: time(c.plantedAt), nextSpawnAt: time(c.nextSpawnAt),
        phase, phaseAt: time(c.phaseAt), target, lastSpawnAt: time(c.lastSpawnAt), healAt: time(c.healAt),
        spawnSerial: Math.floor(time(c.spawnSerial)) % deps.WOODSMAN_BATTLE.stumps.summons.length,
        absorbedCount: phase === 'absorbing' ? Math.max(0, Math.min(cap, count)) : 0,
        echoes: phase === 'absorbing' ? normalizeWoodsmanEchoes(deps, c.echoes) : [] };
}

export function normalizeWoodsmanCycle(c) {
    let phase = ['idle', 'rising', 'absorbing', 'seeking', 'moving'].includes(c.phase) ? c.phase : 'idle';
    const target = phase === 'moving' ? normalizeWoodsmanLanding(c.target) : null;
    if (phase === 'moving' && !target) phase = 'seeking';
    return { phase, target };
}

export function normalizeWoodsmanLanding(cell) {
    return cell && Number.isInteger(cell.gx) && Number.isInteger(cell.gy)
        && cell.gx >= 0 && cell.gy >= 0 && cell.gx < 999 && cell.gy < 999 ? { gx: cell.gx, gy: cell.gy } : null;
}

export function normalizeWoodsmanEchoes(deps, value) {
    const looks = new Set(deps.WOODSMAN_BATTLE.stumps.summons.map(row => row.look));
    return (Array.isArray(value) ? value : []).filter(e => normalizeWoodsmanLanding(e) && looks.has(e.spriteVariantId))
        .slice(0, deps.WOODSMAN_BATTLE.stumps.maxAdds).map((e, index) => ({
            ...normalizeWoodsmanLanding(e), id: Number.isFinite(e.id) ? e.id : -3000 - index,
            spriteVariantId: e.spriteVariantId, hp: 1, maxHp: 1, isBoss: false,
            ele: deps.WOODSMAN_BATTLE.elements.includes(e.ele) ? e.ele : 'chaos' }));
}
