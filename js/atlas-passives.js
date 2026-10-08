/** 세계수 아틀라스 패시브 (data/atlas-passives.js): 아틀라스 포인트(완료 + 보너스)로 노드를 찍는다. 루프를 넘어 남는다.
 * 찍기는 뿌리이거나 requires 중 하나가 찍혀 있을 때, 되돌리기는 그 노드에만 기대는 찍힌 노드가 없을 때 무료로 한다.
 */
const atlasPassives = (() => {
    const NODES = new Map(ATLAS_PASSIVES.wheels.flatMap(wheel => wheel.nodes.map(node => [node.id, { ...node, wheel: wheel.id }])));
    const EFFECT_KEYS = new Set(Object.keys(ATLAS_PASSIVES.labels));
    const taken = state => state.atlas.passives;
    const supported = (node, has) => !node.requires.length || node.requires.some(has);
    // The loop a node opens at (computed, never saved): its wheel's and its own minLoop, and the first loop one of the content rooms
    // its effect names opens (data/atlas.js encounters minLoop: 잿불 터 30, 수액 상처 32, 시든 정원 36, 묘목장 39).
    const ROOM_LOOPS = new Map(Object.entries(ATLAS.encounters).flatMap(([type, rule]) => [[type, rule.minLoop || 0], [`${type}Reward`, rule.minLoop || 0]]));
    function loopOf(id) {
        const node = NODES.get(id);
        const rooms = node ? Object.keys(node.effect).filter(key => ROOM_LOOPS.has(key)).map(key => ROOM_LOOPS.get(key)) : [];
        return node ? Math.max(node.minLoop || 0, rooms.length ? Math.min(...rooms) : 0) : 0;
    }
    const waits = (state, id) => (Number(state.season) || 1) < loopOf(id);

    function available(state) { return atlas.points(state) - taken(state).length; }
    function reason(state, id) {
        const node = NODES.get(id), list = taken(state);
        if (!node) return '없는 패시브입니다.';
        if (list.includes(id)) return '이미 찍은 패시브입니다.';
        if (waits(state, id)) return `루프 ${loopOf(id)}부터 찍을 수 있습니다.`;
        if (available(state) < 1) return '아틀라스 포인트가 부족합니다. 노드를 완료하거나 보너스를 달성하세요.';
        return supported(node, req => list.includes(req)) ? '' : '이어진 패시브를 먼저 찍으세요.';
    }
    function allocate(state, id) {
        const why = reason(state, id);
        if (!why) taken(state).push(id);
        return why;
    }
    function refundReason(state, id) {
        const list = taken(state);
        if (!list.includes(id)) return '찍지 않은 패시브입니다.';
        const orphaned = list.some(other => other !== id && NODES.get(other).requires.includes(id)
            && !supported(NODES.get(other), req => req !== id && list.includes(req)));
        return orphaned ? '이 패시브에 이어진 패시브를 먼저 되돌리세요.' : '';
    }
    function refund(state, id) {
        const why = refundReason(state, id);
        if (!why) state.atlas.passives = taken(state).filter(entry => entry !== id);
        return why;
    }
    function status(state, id) {
        if (taken(state).includes(id)) return 'taken';
        if (waits(state, id)) return 'locked';
        return supported(NODES.get(id), req => taken(state).includes(req)) ? 'open' : 'locked';
    }
    /** Summed effects of the given passive ids (and extra effect objects, e.g. fragments) — keys from ATLAS_PASSIVES.labels. */
    function sum(ids, extras = []) {
        const total = {};
        for (const effect of [...ids.map(id => NODES.get(id).effect), ...extras]) {
            for (const [key, value] of Object.entries(effect)) total[key] = (total[key] || 0) + value;
        }
        return total;
    }
    const effects = state => sum(taken(state));
    /** A switch-like effect (e.g. bee events) is on once any taken passive grants it. Safe before the atlas state exists. */
    const has = (state, key) => !!(state && state.atlas && Array.isArray(state.atlas.passives)) && (effects(state)[key] || 0) > 0;
    /** Save boundary: known, unique, supported (a keystone may have been kept by its later notable) and within the points. */
    function normalize(raw, points) {
        const wanted = [...new Set(Array.isArray(raw) ? raw : [])].filter(id => NODES.has(id)), list = [];
        for (let grew = true; grew;) {
            grew = false;
            for (const id of wanted) {
                if (list.includes(id) || list.length >= points || !supported(NODES.get(id), req => list.includes(req))) continue;
                list.push(id);
                grew = true;
            }
        }
        return list;
    }
    return Object.freeze({ nodes: NODES, effectKeys: EFFECT_KEYS, loopOf, waits, available, reason, allocate, refundReason, refund, status, sum, effects, has, normalize });
})();
safeExposeGlobals({ atlasPassives });
