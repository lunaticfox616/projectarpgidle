/** 실타래 수집·발견 기록·뜨개질. counts/once는 이번 루프, seen/knitted는 영구 기록. UI/저장 호출은 소비자가 한다.
 * 드롭(2026-10-22 개편): 확정 드롭은 없다. 처치 등급 확률(KNITTING.chance, 액트 보스 포함) → 출처가 맞는 종류 → 가치 등급 가중치.
 * 주력 지역(row.homes)은 homeBonus, 그 밖의 보스·정예 전용 출처는 그보다 작은 rankBonus를 받고 둘은 겹쳐 곱하지 않는다.
 * 가산 뒤에도 더 좋은 등급이 더 흔하거나 더 빨리 완성되지 않는다. source.once는 루프당 최대 한 번이라는 상한일 뿐 확정 지급이 아니다. */
const knitting = (() => {
    const byId = new Map(KNITTING.list.map(row => [row.id, row]));
    const defaults = season => ({ season, counts: {}, seen: [], knitted: {}, once: [] });
    const whole = (value, cap) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(cap, Math.floor(Number(value)))) : 0;
    const open = (state, row) => (row.unlocks || []).every(id => contentProgression.isUnlocked(id, state));
    const pick = (rows, random) => rows[Math.floor(random() * rows.length)];
    const knownIds = raw => [...new Set(Array.isArray(raw) ? raw : [])].filter(id => byId.has(id));
    function restoreCounts(src, out, same) {
        for (const id of byId.keys()) {
            const count = whole(src.counts?.[id], KNITTING.countCap), knitted = whole(src.knitted?.[id], 999999);
            if (count && same) out.counts[id] = count;
            if (knitted) out.knitted[id] = knitted;
            if (count || knitted) out.seen.push(id);
        }
    }

    /** Normalize at load. Stale-loop stock never returns, but discovered entries and knitted totals stay. */
    function normalize(raw, season) {
        const src = raw && typeof raw === 'object' ? raw : {}, out = defaults(season);
        const same = src.season === season || src.season === undefined;
        restoreCounts(src, out, same);
        out.seen = knownIds([...out.seen, ...knownIds(src.seen)]);
        out.once = same ? knownIds(src.once) : [];
        return out;
    }
    function resetForLoop(state) {
        state.knitting = { ...defaults(state.season), seen: state.knitting.seen.slice(), knitted: { ...state.knitting.knitted } };
    }

    /** 이 지역을 가리키는 고정 키: 'type:<zone.type>', 액트는 'act:<zone.id>', 아틀라스 지도는 'atlas:<atlasRegion>'과 'node:<atlasNode>'. */
    function zoneKeys(zone) {
        if (!zone) return [];
        const keys = ['type:' + zone.type];
        if (zone.type === 'act' && Number.isInteger(Number(zone.id))) keys.push('act:' + Number(zone.id));
        if (zone.atlasRegion) keys.push('atlas:' + zone.atlasRegion);
        if (zone.atlasNode !== undefined && zone.atlasNode !== null) keys.push('node:' + zone.atlasNode);
        return keys;
    }
    const sourceChecks = {
        types: (value, zone) => value.includes(zone.type),
        zones: (value, zone) => zoneKeys(zone).some(key => value.includes(key)),
        boss: (value, zone, enemy) => !value || !!enemy.isBoss,
        elite: (value, zone, enemy) => !value || !!enemy.isElite || !!enemy.isBoss,
        treasure: (value, zone, enemy) => !value || !!enemy.treasureCarrier,
        minAtlasTier: (value, zone) => zone.type === 'atlasMap' && Number(zone.atlasTier) >= value,
        act: (value, zone) => Number(zone.id) === value, minAct: (value, zone) => Number(zone.id) >= value,
        kind: (value, zone) => zone.atlasKind === value, apostle: (value, zone) => !value || !!zone.atlasApostle
    };
    const sourceMatches = (source, zone, enemy) => Object.entries(sourceChecks).every(([key, test]) =>
        source[key] === undefined || test(source[key], zone, enemy));
    function dropPool(state, zone, enemy) {
        return KNITTING.list.filter(row => open(state, row) && sourceMatches(row.source, zone, enemy)
            && !(row.source.once && state.knitting.once.includes(row.id)));
    }
    /** 처치 등급 확률(KNITTING.chance: 일반·정예·콘텐츠 보스, 액트의 보스는 actBoss). 어느 등급도 확정이 아니며, 나오는 종류는 아래 가치 가중치로 굴린다. */
    function killChance(zone, enemy, level) {
        const rank = enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular';
        const chance = zone.type === 'act' && enemy.isBoss ? KNITTING.chance.actBoss : KNITTING.chance[rank];
        return chance * levelProgression.rewardMultiplier(zone, enemy, level);
    }
    /** 등급 가중치에 가산 한 번: 주력 지역이면 homeBonus, 아니고 보스·정예 전용 출처면 그보다 작은 rankBonus. 등급이 없는 행은 0. */
    function baseWeight(row, keys, enemy) {
        const grade = KNITTING.grades[row.grade];
        if (!grade || !(row.set >= 1)) return 0;
        if ((row.homes || []).some(key => keys.includes(key))) return grade.weight * KNITTING.homeBonus;
        const ranked = !!enemy && !!(row.source.boss || row.source.elite);
        return grade.weight * (ranked ? KNITTING.rankBonus : 1);
    }
    /** 풀 안에서 등급 순으로: 어떤 행도 더 낮은 등급 어느 행보다 무겁지 않고, 완성 속도(가중치 ÷ 세트)도 더 빠르지 않다. */
    function weighted(rows, zone, enemy) {
        const keys = zoneKeys(zone);
        const list = rows.map(row => ({ row, weight: baseWeight(row, keys, enemy) })).filter(entry => entry.weight > 0)
            .sort((a, b) => a.row.grade - b.row.grade);
        const floor = { weight: Infinity, pace: Infinity }, current = { grade: 0, weight: Infinity, pace: Infinity };
        for (const entry of list) {
            if (entry.row.grade !== current.grade) {
                floor.weight = Math.min(floor.weight, current.weight);
                floor.pace = Math.min(floor.pace, current.pace);
                Object.assign(current, { grade: entry.row.grade, weight: Infinity, pace: Infinity });
            }
            entry.weight = Math.min(entry.weight, floor.weight, floor.pace * entry.row.set);
            current.weight = Math.min(current.weight, entry.weight);
            current.pace = Math.min(current.pace, entry.weight / entry.row.set);
        }
        return list;
    }
    function pickWeighted(list, random) {
        const total = list.reduce((sum, entry) => sum + entry.weight, 0);
        if (!(total > 0)) return null;
        let roll = random() * total;
        return (list.find(entry => (roll -= entry.weight) < 0) || list[list.length - 1]).row.id;
    }
    function rollKill(state, zone, enemy, random = Math.random) {
        // 첫 관문: 해금 전에는 난수, 150행 순회, 풀 작성, 가중치 정렬, 보상 검사를 하나도 하지 않는다.
        // isUnlocked는 hardMinLoop에서 바로 끝난다(content-progression meetsUsageGate).
        if (!contentProgression.isUnlocked('knitting', state)) return null;
        if (!zone || !enemy || enemy.noLoot) return null;
        if (random() >= killChance(zone, enemy, state.level)) return null;
        return pickWeighted(weighted(dropPool(state, zone, enemy), zone, enemy), random);
    }
    /** Mark a once-per-loop drop when it is laid, not picked up; a second kill cannot duplicate a still-uncollected thread. */
    function markDrop(state, id) {
        if (byId.get(id)?.source.once && !state.knitting.once.includes(id)) state.knitting.once.push(id);
    }
    function receive(state, id) {
        const row = byId.get(id), st = state.knitting;
        if (!row) return null;
        const first = !st.seen.includes(id), previous = st.counts[id] || 0;
        if (first) st.seen.push(id);
        st.counts[id] = Math.min(KNITTING.countCap, previous + 1);
        return { id, name: row.name, count: st.counts[id], set: row.set, first, complete: previous < row.set && st.counts[id] >= row.set };
    }
    /** 반환 실타래: 발견한 여러 개짜리 중 반환하는 종류의 등급 이하만. 반환형·1개짜리·반환 제외·잠긴 종류는 없다. */
    function yarnPool(state, id) {
        const grade = byId.get(id)?.grade || 0;
        return KNITTING.list.filter(row => row.id !== id && row.set > 1 && !row.reward.yarns && row.yarnOut !== false
            && row.grade <= grade && state.knitting.seen.includes(row.id) && open(state, row));
    }
    const pickYarn = (state, id, random) => pickWeighted(weighted(yarnPool(state, id), null, null), random);
    function reason(state, id) {
        const row = byId.get(id);
        const count = state.knitting.counts[id] || 0;
        if (!row || !state.knitting.seen.includes(id)) return '발견하지 않은 실타래입니다.';
        if (!contentProgression.isUnlocked('knitting', state)) return '뜨개질이 아직 열리지 않았습니다.';
        if (state.woodsmanBuildLock) return '나무꾼 전투 중에는 뜨개질할 수 없습니다.';
        if (!open(state, row)) return '보상에 필요한 콘텐츠를 먼저 해금하세요.';
        if (count < row.set) return `실타래 부족 (${count}/${row.set})`;
        if (row.reward.yarns && !yarnPool(state, id).length) return '다른 종류의 실타래를 먼저 발견하세요.';
        return '';
    }
    const visible = state => KNITTING.list.filter(row => state.knitting.seen.includes(row.id));
    function gainedBetween(before, after) {
        const old = before?.counts || {}, seen = before?.seen || [];
        return { total: Object.entries(after?.counts || {}).reduce((sum, [id, n]) => sum + Math.max(0, n - (old[id] || 0)), 0),
            fresh: (after?.seen || []).filter(id => !seen.includes(id) && byId.has(id)).map(id => byId.get(id).name) };
    }

    /** Catalogue checks for smoke/artifacts: identity, grade/set bands, sources, unlock links and home counts. */
    /** Catalogue checks for smoke/artifacts: identity, grade/set bands, sources, unlock links and home counts. */
    function setProblem(row) {
        const range = KNITTING.setRange[row.grade];
        const inRange = Number.isInteger(row.set) && row.set >= range[0] && row.set <= range[1];
        return inRange ? [] : [`${row.id}: 세트 ${row.set}, 등급 ${row.grade} 범위 ${range}`];
    }
    const nameProblem = row => (/실타래/.test(row.name) ? [`${row.id}: 이름에 종류명`] : []);
    function sourceProblem(row) {
        const src = row.source || {};
        const has = !!src.any || !!(src.types && src.types.length) || !!(src.zones && src.zones.length);
        return has ? [] : [`${row.id}: 출처 없음`];
    }
    const ZONE_KEY = /^(type|act|atlas|node):\S+$/;
    function zoneKeyProblem(row) {
        const keys = (row.homes || []).concat((row.source || {}).zones || []);
        return keys.every(key => ZONE_KEY.test(key)) ? [] : [`${row.id}: 지역 키 형식`];
    }
    /** 콘텐츠 타입 출처의 해금이 전부 알려진 경우에만, 그중 하나라도 행의 unlocks에 없으면 누락이다. */
    function unlockProblem(row) {
        const needed = ((row.source || {}).types || []).map(type => KNITTING.typeUnlocks[type]);
        const own = row.unlocks || [];
        const missing = needed.length > 0 && needed.every(Boolean) && needed.some(id => !own.includes(id));
        return missing ? [`${row.id}: 출처 해금 누락`] : [];
    }
    /** 기존 순서 그대로: 세트 범위, 이름, 출처, 지역 키, 출처 해금. */
    const ROW_CHECKS = [setProblem, nameProblem, sourceProblem, zoneKeyProblem, unlockProblem];
    /** 등급이 틀리면 그 한 줄만(세트 범위를 읽을 수 없다). */
    function rowProblems(row) {
        if (!KNITTING.grades[row.grade] || !KNITTING.setRange[row.grade]) return [`${row.id}: 등급 ${row.grade}`];
        return ROW_CHECKS.flatMap(check => check(row));
    }
    function homeProblems() {
        return KNITTING.homeZones.map(key => [key, KNITTING.list.filter(row => (row.homes || []).includes(key)).length])
            .filter(([, n]) => n < 1 || n > 4).map(([key, n]) => `주력 ${key}: ${n}종`);
    }
    /** node: 키는 공개 API(atlas.nodes, atlas.node)로 확인한다. 모든 일반 지도(kind 'map')는 주력 목록에 있어야 하고, 지도 하나만 주력으로
     * 둔 종류의 found는 그 지도 이름이다(슬롯 순서 확인). */
    function nodeProblems() {
        if (typeof atlas !== 'object' || typeof atlas.node !== 'function') return ['아틀라스 공개 API(atlas.node)를 읽을 수 없음'];
        const maps = atlas.nodes.filter(node => node.kind === 'map');
        const out = maps.filter(node => !KNITTING.homeZones.includes('node:' + node.id)).map(node => `주력 목록에 없는 지도 ${node.id}`);
        out.push(...KNITTING.homeZones.filter(key => key.startsWith('node:') && atlas.node(key.slice(5))?.kind !== 'map')
            .map(key => `일반 지도가 아님 ${key}`));
        for (const row of KNITTING.list) {
            const own = (row.homes || []).filter(key => key.startsWith('node:'));
            const node = own.length === 1 ? atlas.node(own[0].slice(5)) : null;
            if (node?.name && row.found !== node.name) out.push(`${row.id}: ${node.name} 지도와 표시 불일치`);
        }
        return out;
    }
    function structureProblems() {
        const out = [], ids = new Set(), names = new Set();
        for (const row of KNITTING.list) {
            if (ids.has(row.id)) out.push(`중복 id ${row.id}`);
            if (names.has(row.name)) out.push(`중복 이름 ${row.name}`);
            ids.add(row.id); names.add(row.name);
            out.push(...rowProblems(row));
        }
        const singles = KNITTING.list.filter(row => row.set === 1).length;
        if (singles > KNITTING.maxSingles) out.push(`1개짜리 ${singles}종, 상한 ${KNITTING.maxSingles}`);
        if (KNITTING.list.length !== KNITTING.target) out.push(`종류 ${KNITTING.list.length}, 목표 ${KNITTING.target}`);
        return out.concat(homeProblems(), nodeProblems());
    }
    return Object.freeze({ defaults, normalize, resetForLoop, zoneKeys, dropPool, weighted, rollKill, markDrop, receive, yarnPool,
        pickYarn, reason, visible, gainedBetween, structureProblems, row: id => byId.get(id), validId: id => byId.has(id), pick });
})();
safeExposeGlobals({ knitting });
