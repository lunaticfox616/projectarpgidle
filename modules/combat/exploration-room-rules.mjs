

// 그 벽의 문 안쪽에서 방 안으로 한 칸

/** 열쇠 "판:가로 덧칸:깊이 덧칸:놓임새:지역"(탐험 기록의 rooms). */
export function roomRoomPlanKey(env, spec) {return [env.deps.STAGE_ROOMS.version, spec.wide, spec.deep, spec.plan, spec.region || ''].join(':');}

/** 열쇠 → { wide, deep, plan, region }. 이 판이 놓을 수 없는 열쇠(옛 판 번호, 없는 덧칸, 모르는 놓임새)면 null. */
export function roomReadRoomKey(env, key) {
    const [version, wide, deep, plan, region = ''] = String(key).split(':'), rule = env.deps.STAGE_ROOMS;
    const known = Number(version) === rule.version && rule.wideSteps.includes(Number(wide)) && rule.deepSteps.includes(Number(deep));
    return known && env.deps.actExplorationRoomPlans.valid(plan) && /^[a-z0-9-]*$/.test(region) ? { wide: Number(wide), deep: Number(deep), plan, region } : null;
}

/** 방의 생김새(STAGE_ROOMS.shapes): 기준 방에서 줄이는 [가로 칸, 깊이 칸]. 전투, 정예, 들르는 방만 씨앗으로 고르고, 입구와 보스 방,
 * 한 줄 지도(놓임새 'c')의 방은 기준 크기다. 같은 씨앗과 방 이름이면 언제나 같은 생김새다. */
function roomRoomShapeOf(env, cell, spec) {
    if (spec.plan === 'c' || !['battle', 'elite', 'optional'].includes(cell.role)) return [0, 0];
    const rows = env.deps.STAGE_ROOMS.shapes, rng = env.deps.createSeededRng(`shape:${spec.seed}:${cell.id}`);
    let roll = rng() * rows.reduce((sum, row) => sum + row[2], 0);
    const shape = rows.find(row => (roll -= row[2]) < 0) || rows[0];
    return [Math.min(shape[0], spec.wide), Math.min(shape[1], spec.deep)];
}

/** 방 바닥의 크기: 구실에 따른 너비(값이 여럿이면 놓인 자리에 따라 번갈아)와 바탕 깊이에 덧칸을 더하고, 생김새만큼 줄인다. */
export function roomRoomSizeOf(env, cell, spec) {
    const rule = env.deps.STAGE_ROOMS, width = rule.widths[cell.role], [narrow, shallow] = roomRoomShapeOf(env, cell, spec);
    return { width: (Array.isArray(width) ? width[(cell.col + cell.row) % width.length] : width) + spec.wide - narrow, depth: rule.depth + spec.deep - shallow };
}

/** 무대 그림을 좌우로 뒤집어 쓰는 방: 지역마다 방 그림이 한 장이라 이웃한 방이 똑같아 보였다(2026-10-13). 전투, 정예, 들르는 방은
 * 놓임새의 자리가 홀수 칸이면 뒤집는다(이웃한 방끼리 번갈아). 입구와 보스 방은 그린 그대로 쓴다. */
export function roomRoomMirrored(cell) {return ['battle', 'elite', 'optional'].includes(cell.role) && (cell.col + cell.row) % 2 === 1;}

/** 기준 방의 크기(칸): 그 지도의 가장 큰 방. 무대 그림의 배율과 화면의 칸 크기가 이 크기에 맞춰진다. */
export function roomFrameOf(env, spec) {return { columns: env.deps.STAGE_ROOMS.slot + spec.wide, rows: env.deps.STAGE_ROOMS.depth + spec.deep };}

export function roomSupports(env, key) { return !!roomReadRoomKey(env, key); }
