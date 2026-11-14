

/** 모두 처음으로. cracks: 대지 가르기(jg1) { gx, gy, until }. echoes: 이중 폭발(bm4) { rolledAt, at, hits: [{ enemyId, gx, gy, damage, element }] },
 * currentEcho는 지금 투척이 굴린 것(다음 공격이 바꾼다). rams: 철갑(jg2)이 모은 중첩, castRamMul: 지금 강타에 실린 배율. counterReadyAt: 반격(bd5, bd6)의
 * 다음 가능 시각. flow: 흐르는 칼끝(bd1). unyielding: 불굴의 진군(w7) 발동과 대기. focus: 멈추지 않는 칼날(bz5)이 이어 베는 적.
 * images: 잔상(bd2) { count, until }. gale: 바람 발(sa3)의 남은 바람 화살과 지금 공격이 바람 화살인가. mosses: 서리 이끼(gw1) { gx, gy, until }.
 * sap: 수액 재생(gw3)이 고인 생명력. still: 뿌리 갑주(gw6)가 보는 주인공의 마지막 자리와 그 뒤로 움직이지 않은 때. stormAt: 폭풍의 눈(sa8)의 다음 번개. */
export function ascendNodeReset(env) {
    env.cracks = []; env.echoes = []; env.currentEcho = null; env.rams = 0; env.castRamMul = 1; env.counterReadyAt = 0;
    env.flow = { stacks: 0, until: 0 }; env.unyielding = { until: 0, readyAt: 0 }; env.focus = { enemyId: null, since: 0, last: 0 };
    env.images = { count: 0, until: 0 }; env.gale = env.NO_GALE; env.mosses = []; env.sap = 0; env.still = { gx: null, gy: null, since: 0 }; env.stormAt = 0;
}

export function ascendNodeCapture(env) {
    const echoIndex = env.echoes.indexOf(env.currentEcho);
    return env.deps.cloneSnapshot({ cracks: env.cracks, echoes: env.echoes, echoIndex, rams: env.rams, castRamMul: env.castRamMul, counterReadyAt: env.counterReadyAt, flow: env.flow, unyielding: env.unyielding, focus: env.focus, images: env.images, gale: env.gale, mosses: env.mosses, sap: env.sap, still: env.still, stormAt: env.stormAt });
}

export function ascendNodeRestore(env, snapshot) {
    if (!snapshot) return ascendNodeReset(env);
    ascendNodeReset(env);
    const copy = env.deps.cloneSnapshot(snapshot);
    env.cracks = copy.cracks;
    env.echoes = copy.echoes;
    env.rams = copy.rams;
    env.castRamMul = copy.castRamMul;
    env.counterReadyAt = copy.counterReadyAt;
    env.flow = copy.flow;
    env.unyielding = copy.unyielding;
    env.focus = copy.focus;
    env.images = copy.images === undefined ? env.images : copy.images;
    env.gale = copy.gale === undefined ? env.gale : copy.gale;
    env.mosses = copy.mosses === undefined ? env.mosses : copy.mosses;
    env.sap = copy.sap === undefined ? env.sap : copy.sap;
    env.still = copy.still === undefined ? env.still : copy.still;
    env.stormAt = copy.stormAt === undefined ? env.stormAt : copy.stormAt;
    env.currentEcho = copy.echoIndex >= 0 ? env.echoes[copy.echoIndex] : null;
}
