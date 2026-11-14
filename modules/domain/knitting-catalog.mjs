

/** Catalogue checks for smoke/artifacts: identity, grade/set bands, sources, unlock links and home counts. */
/** Catalogue checks for smoke/artifacts: identity, grade/set bands, sources, unlock links and home counts. */
export function threadSetProblem(env, row) {
    const range = env.deps.KNITTING.setRange[row.grade];
    const inRange = Number.isInteger(row.set) && row.set >= range[0] && row.set <= range[1];
    return inRange ? [] : [env.deps._t('{id}: 세트 {set}, 등급 {grade} 범위 {range}', { id: row.id, set: row.set, grade: row.grade, range })];
}

export function threadNameProblem(env, row) { return /실타래/.test(row.name) ? [env.deps._t('{id}: 이름에 종류명', { id: row.id })] : []; }

export function threadSourceProblem(env, row) {
    const src = row.source || {};
    const has = !!src.any || !!(src.types && src.types.length) || !!(src.zones && src.zones.length);
    return has ? [] : [env.deps._t('{id}: 출처 없음', { id: row.id })];
}

export function threadZoneKeyProblem(env, row) {
    const keys = (row.homes || []).concat((row.source || {}).zones || []);
    return keys.every(key => env.ZONE_KEY.test(key)) ? [] : [env.deps._t('{id}: 지역 키 형식', { id: row.id })];
}

/** 콘텐츠 타입 출처의 해금이 전부 알려진 경우에만, 그중 하나라도 행의 unlocks에 없으면 누락이다. */
export function threadUnlockProblem(env, row) {
    const needed = ((row.source || {}).types || []).map(type => env.deps.KNITTING.typeUnlocks[type]);
    const own = row.unlocks || [];
    const missing = needed.length > 0 && needed.every(Boolean) && needed.some(id => !own.includes(id));
    return missing ? [env.deps._t('{id}: 출처 해금 누락', { id: row.id })] : [];
}

/** 등급이 틀리면 그 한 줄만(세트 범위를 읽을 수 없다). */
export function threadRowProblems(env, row) {
    if (!env.deps.KNITTING.grades[row.grade] || !env.deps.KNITTING.setRange[row.grade]) return [env.deps._t('{id}: 등급 {grade}', { id: row.id, grade: row.grade })];
    return env.ROW_CHECKS.flatMap(check => check(row));
}

export function threadHomeProblems(env) {
    return env.deps.KNITTING.homeZones.map(key => [key, env.deps.KNITTING.list.filter(row => (row.homes || []).includes(key)).length])
        .filter(([, n]) => n < 1 || n > 4).map(([key, n]) => env.deps._t('주력 {key}: {n}종', { key, n }));
}

/** node: 키는 공개 API(atlas.nodes, atlas.node)로 확인한다. 모든 일반 지도(kind 'map')는 주력 목록에 있어야 하고, 지도 하나만 주력으로
 * 둔 종류의 found는 그 지도 이름이다(슬롯 순서 확인). */
export function threadNodeProblems(env) {
    if (typeof env.deps.atlas !== 'object' || typeof env.deps.atlas.node !== 'function') return ['아틀라스 공개 API(atlas.node)를 읽을 수 없음'];
    const maps = env.deps.atlas.nodes.filter(node => node.kind === 'map');
    const out = maps.filter(node => !env.deps.KNITTING.homeZones.includes('node:' + node.id)).map(node => env.deps._t('주력 목록에 없는 지도 {id}', { id: node.id }));
    out.push(...env.deps.KNITTING.homeZones.filter(key => key.startsWith('node:') && env.deps.atlas.node(key.slice(5))?.kind !== 'map')
        .map(key => env.deps._t('일반 지도가 아님 {key}', { key })));
    for (const row of env.deps.KNITTING.list) {
        const own = (row.homes || []).filter(key => key.startsWith('node:'));
        const node = own.length === 1 ? env.deps.atlas.node(own[0].slice(5)) : null;
        if (node?.name && row.found !== node.name) out.push(`${row.id}: ${node.name} 지도와 표시 불일치`);
    }
    return out;
}

export function threadStructureProblems(env) {
    const out = [], ids = new Set(), names = new Set();
    for (const row of env.deps.KNITTING.list) {
        if (ids.has(row.id)) out.push(`중복 id ${row.id}`);
        if (names.has(row.name)) out.push(`중복 이름 ${row.name}`);
        ids.add(row.id); names.add(row.name);
        out.push(...threadRowProblems(env, row));
    }
    const singles = env.deps.KNITTING.list.filter(row => row.set === 1).length;
    if (singles > env.deps.KNITTING.maxSingles) out.push(`1개짜리 ${singles}종, 상한 ${env.deps.KNITTING.maxSingles}`);
    if (env.deps.KNITTING.list.length !== env.deps.KNITTING.target) out.push(`종류 ${env.deps.KNITTING.list.length}, 목표 ${env.deps.KNITTING.target}`);
    return out.concat(threadHomeProblems(env), threadNodeProblems(env));
}
