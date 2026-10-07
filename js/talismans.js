// 부적(2026-09-30 개편): 그루터기 함의 세 번째 계열(색 없는 한 칸 조각). 판 · 보관함 · 성장(깨어남) · 루프 회귀는
// stump-box.js가, 부적의 줄 · 굴림 · 봉인 풀기 · 밀랍 · 표식 방향은 여기서 맡는다. 이웃 효과 합산은 talisman-effects.js,
// 전투 적용은 talisman-combat.js, 화면은 stump-talisman-ui.js.
// 부적 필드(그루터기 아이템에 함께 저장): { name, rarity: 'magic'|'rare'|'unique', lines: [{ kind: 'stat'|'condition', id, value, wax? }],
//   uniqueId?, special?, uniqueEffect?, moment?, dir?(0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽, 방향이 필요한 고유만), waxed? }.
const talismans = (() => {
    const statPool = new Map(TALISMAN_STAT_POOL.map(def => [def.id, def]));
    const conditionPool = new Map(TALISMAN_CONDITION_POOL.map(def => [def.id, def]));
    const uniquePool = new Map([...TALISMAN_UNIQUE_DB, ...TALISMAN_WILD_UNIQUE_DB].map(def => [def.id, def]));
    const wildIds = new Set(TALISMAN_WILD_UNIQUE_DB.map(def => def.id));
    const RARITIES = ['magic', 'rare', 'unique'];
    const SPECIALS = new Set(['gravity', 'simpleCopy', 'temperance', 'pride', 'moment', 'elementFocus',
        'cosmosChoice', 'cosmosLightningVariance', 'cosmosRepulsion', ...TALISMAN_WILD_UNIQUE_DB.map(def => def.special).filter(Boolean)]);
    const DIRECTIONAL = new Set(['simpleCopy', 'cosmosChoice']);
    const DIRECTION_NAMES = ['위', '오른쪽', '아래', '왼쪽'];

    function roundTo(value, step) {
        return Number((Math.round(value / step) * step).toFixed(2));
    }

    function normalizeLine(raw) {
        if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
        const value = Number(raw.value);
        if (!Number.isFinite(value) || Math.abs(value) > 10000) return null;
        if (raw.kind === 'condition') return conditionPool.has(raw.id) ? { kind: 'condition', id: raw.id, value } : null;
        return raw.wax === true ? { kind: 'stat', id: raw.id, value, wax: true } : { kind: 'stat', id: raw.id, value };
    }

    function uniqueFields(raw) {
        const out = {};
        if (raw.rarity === 'unique' && typeof raw.uniqueId === 'string') out.uniqueId = raw.uniqueId;
        if (typeof raw.uniqueEffect === 'string' && raw.uniqueEffect) out.uniqueEffect = raw.uniqueEffect.slice(0, 160);
        return out;
    }

    function specialFields(raw, special) {
        if (!special) return {};
        const out = { special };
        if (special === 'moment') out.moment = Math.min(15, Math.max(5, Math.round(Number(raw.moment) || 5)));
        if (DIRECTIONAL.has(special)) out.dir = [0, 1, 2, 3].includes(raw.dir) ? raw.dir : 1;
        return out;
    }

    function isTalismanShape(raw) {
        return !!raw && typeof raw === 'object' && Array.isArray(raw.lines) && RARITIES.includes(raw.rarity);
    }

    /** Up to three rolled lines plus at most one wax line (kept last). */
    function keptLines(raw) {
        const lines = raw.lines.map(normalizeLine).filter(Boolean);
        const waxLine = lines.find(line => line.wax);
        return lines.filter(line => !line.wax).slice(0, 3).concat(waxLine ? [waxLine] : []);
    }

    /** Save boundary for a stump item's talisman fields: unknown lines drop, uniques keep a known special only. Idempotent. */
    function normalizeTalisman(raw) {
        if (!isTalismanShape(raw)) return null;
        const lines = keptLines(raw);
        const special = raw.rarity === 'unique' && SPECIALS.has(raw.special) ? raw.special : null;
        if (!lines.length && !special) return null;
        const talisman = { name: String(raw.name || '부적').slice(0, 40), rarity: raw.rarity, lines, ...uniqueFields(raw), ...specialFields(raw, special) };
        if (lines.some(line => line.wax)) talisman.waxed = true;
        return talisman;
    }

    function rollValue(def, mul, random) {
        return roundTo((def.min + random() * (def.max - def.min)) * mul, def.step || 1);
    }

    function pick(list, random) {
        return list[Math.floor(random() * list.length)];
    }

    /** Weighted pick by def.weight (default 1). */
    function pickWeighted(list, random) {
        const total = list.reduce((sum, def) => sum + (def.weight ?? 1), 0);
        let roll = random() * total;
        return list.find(def => (roll -= def.weight ?? 1) < 0) || list[list.length - 1];
    }

    function rollLine(rule, taken, random) {
        const conditional = random() < rule.conditionChance;
        const pool = (conditional ? TALISMAN_CONDITION_POOL : TALISMAN_STAT_POOL).filter(def => !taken.has(def.id));
        const def = pick(pool, random);
        taken.add(def.id);
        return { kind: conditional ? 'condition' : 'stat', id: def.id, value: rollValue(def, rule.mul, random) };
    }

    function lineName(line) {
        const def = line.kind === 'condition' ? conditionPool.get(line.id) : null;
        if (def) return def.name || { guard: '수호', warcry: '함성', curse: '저주' }[def.kind];
        return getStatName(line.id).replace(/\(%\)$/, '');
    }

    function rollNormal(source, random = Math.random) {
        const rule = TALISMAN_UNSEAL_RULES[source];
        const [low, high] = rule.lines;
        const count = low + Math.floor(random() * (high - low + 1));
        const taken = new Set();
        const lines = Array.from({ length: count }, () => rollLine(rule, taken, random));
        return { name: `${lineName(lines[0])} 부적`, rarity: count >= 2 ? 'rare' : 'magic', lines };
    }

    function uniqueLines(def, random) {
        if (def.special === 'temperance') {
            const taken = new Set();
            return Array.from({ length: 3 }, () => rollLine({ conditionChance: 0, mul: 1 }, taken, random));
        }
        if (def.special === 'elementFocus') {
            const [gem, damage, resist] = TALISMAN_ELEMENT_FOCUS[def.elem];
            return [{ kind: 'stat', id: gem, value: 1 + Math.floor(random() * 3) }, { kind: 'stat', id: damage, value: 5 + Math.floor(random() * 11) },
                { kind: 'stat', id: resist, value: 5 + Math.floor(random() * 11) }];
        }
        return (def.lines || []).map(([id, value]) => ({ kind: 'stat', id, value }));
    }

    function rollUnique(def, random = Math.random) {
        const talisman = { name: def.name, rarity: 'unique', uniqueId: def.id, lines: uniqueLines(def, random) };
        if (def.special) talisman.special = def.special;
        if (def.uniqueEffect) talisman.uniqueEffect = def.uniqueEffect;
        if (def.special === 'moment') talisman.moment = def.momentMin + Math.floor(random() * (def.momentMax - def.momentMin + 1));
        if (DIRECTIONAL.has(def.special)) talisman.dir = 1;
        return talisman;
    }

    /** 우주계 보스 전용 부적(data/items.js COSMOS_BOSS_REWARD_DB의 talisman 줄). */
    function fromCosmos(row) {
        return normalizeTalisman({ name: row.name, rarity: 'unique', uniqueId: row.id, special: row.special, uniqueEffect: row.uniqueEffect,
            dir: 1, lines: (row.stats || []).map(stat => ({ kind: 'stat', id: stat.stat, value: Number(stat.value) || 0 })) });
    }

    /** A talisman as unsealed with this shard (unique chance included), without paying anything. */
    function roll(source, random = Math.random) {
        const rule = TALISMAN_UNSEAL_RULES[source];
        return random() < rule.uniqueChance ? rollUnique(pick(TALISMAN_UNIQUE_DB, random), random) : rollNormal(source, random);
    }

    /** 조합창: 밀랍이 아닌 일반 줄 하나를 강력한 기운의 봉인편린 배율로 새로 굴린다(줄 종류도 새로). @returns {?object} the new line. */
    function rerollStatLine(item, random = Math.random) {
        const lines = item.lines.filter(line => line.kind === 'stat' && !line.wax);
        if (!lines.length) return null;
        const old = pick(lines, random);
        const taken = new Set(item.lines.map(line => line.id));
        const next = rollLine({ conditionChance: 0, mul: TALISMAN_UNSEAL_RULES.strongSealShard.mul }, taken, random);
        item.lines[item.lines.indexOf(old)] = next;
        return next;
    }

    /** 조합창: 다른 고유 부적 하나(재료와 같은 고유는 나오지 않는다). 야생 고유가 재료에 있으면 야생 고유에서 뽑는다. */
    function rollOtherUnique(excludedIds, random = Math.random) {
        const source = excludedIds.some(id => wildIds.has(id)) ? TALISMAN_WILD_UNIQUE_DB : TALISMAN_UNIQUE_DB;
        const pool = source.filter(def => !excludedIds.includes(def.id));
        return rollUnique(pickWeighted(pool.length ? pool : source, random), random);
    }

    function killKind(enemy) {
        return enemy && enemy.isBoss ? 'boss' : enemy && enemy.isElite ? 'elite' : 'normal';
    }

    /** 야생 부적 드랍이 열렸는가: 부적 해금 · 그루터기 함 · 최고 도달 루프 25. */
    function wildDropsOpen(state = game) {
        return contentProgression.isUnlocked('talisman', state) && stumpBox.of(state).acquired
            && stumpBox.highestLoop(state) >= TALISMAN_WILD_DROPS.minLoop;
    }

    /** 적 등급의 야생 부적 하나(고유면 야생 고유에서). */
    function rollWild(kind, random = Math.random) {
        return random() < TALISMAN_WILD_DROPS.uniqueChance[kind] ? rollUnique(pickWeighted(TALISMAN_WILD_UNIQUE_DB, random), random)
            : rollNormal(TALISMAN_WILD_DROPS.rule[kind], random);
    }

    /** 이 처치의 야생 부적 드랍(아직 받지 않음): 부적과, 보관함이 가득 찼을 때 대신 받을 편린. */
    function rollWildDrop(enemy, random = Math.random) {
        const kind = killKind(enemy);
        return { talisman: rollWild(kind, random), overflow: TALISMAN_WILD_DROPS.overflow[kind] };
    }

    /** 굴린 야생 부적을 받는다: 그루터기 함 보관함에, 가득 찼으면 편린 하나로. @returns {{item?:object, currency?:string}} */
    function receiveWild(state, drop) {
        const item = stumpBox.addTalisman(state, drop.talisman);
        if (item) return { item };
        state.currencies[drop.overflow] = (state.currencies[drop.overflow] || 0) + 1;
        return { currency: drop.overflow };
    }

    /** 야생 부적 드랍을 바로 받는다(탐험 바닥 밖). @returns {{item?:object, currency?:string}} */
    function dropWild(state, enemy, random = Math.random) {
        return receiveWild(state, rollWildDrop(enemy, random));
    }

    function unsealRefusal(source, state) {
        if (!TALISMAN_UNSEAL_RULES[source]) return '알 수 없는 편린입니다.';
        if (!stumpBox.of(state).acquired) return '그루터기 함을 먼저 얻어야 합니다.';
        if (!contentProgression.isUnlocked('talisman', state)) return '해금 목록에서 부적을 먼저 여세요.';
        if ((state.currencies[source] || 0) < TALISMAN_UNSEAL_RULES[source].cost) return '편린이 부족합니다.';
        return stumpBox.storageFull(state) ? '그루터기 함 보관함이 가득 찼습니다.' : '';
    }

    /** Spends one shard and puts the new talisman into the stump box storage. */
    function unseal(source, state = game, random = Math.random) {
        const reason = unsealRefusal(source, state);
        if (reason) return { ok: false, reason };
        state.currencies[source] -= TALISMAN_UNSEAL_RULES[source].cost;
        return { ok: true, item: stumpBox.addTalisman(state, roll(source, random)) };
    }

    function exchange(index, state = game) {
        const row = TALISMAN_SHARD_EXCHANGE[index];
        if (!row || (state.currencies[row.from] || 0) < row.cost) return { ok: false, reason: '교환할 편린이 부족합니다.' };
        state.currencies[row.from] -= row.cost;
        state.currencies[row.to] = (state.currencies[row.to] || 0) + 1;
        return { ok: true, row };
    }

    function talismanItem(state, id) {
        const item = stumpBox.itemById(state, id);
        return item && item.family === 'talisman' ? item : null;
    }

    /** 밀랍 줄이 될 줄: 양수인 일반 줄 가운데 가장 약한 것. */
    function waxSource(item) {
        return item.lines.filter(line => line.kind === 'stat' && !line.wax && line.value > 0)
            .sort((a, b) => Math.abs(a.value) - Math.abs(b.value))[0] || null;
    }

    function waxPreview(item) {
        const source = item && !item.waxed ? waxSource(item) : null;
        if (!source) return null;
        const raw = source.value * TALISMAN_WAX_COPY_PCT / 100;
        return { kind: 'stat', id: source.id, value: Number(raw.toFixed(Math.abs(raw) < 1 ? 2 : 1)), wax: true };
    }

    function wax(id, state = game) {
        const item = talismanItem(state, id), line = waxPreview(item);
        if (!line) return { ok: false, reason: '밀랍을 바를 수 있는 부적이 아닙니다.' };
        if (!stumpBox.editable(state)) return { ok: false, reason: '지금은 그루터기 함을 바꿀 수 없습니다.' };
        if ((state.currencies.beeswax || 0) < 1) return { ok: false, reason: '밀랍이 부족합니다.' };
        state.currencies.beeswax -= 1;
        item.lines.push(line);
        item.waxed = true;
        return { ok: true, line };
    }

    /** Turns a directional talisman's mark a quarter clockwise. */
    function turn(id, state = game) {
        const item = talismanItem(state, id);
        if (!item || !DIRECTIONAL.has(item.special) || !stumpBox.editable(state)) return false;
        item.dir = ((item.dir ?? 1) + 1) % 4;
        return true;
    }

    // ── 조건부 줄의 효과 ────────────────────────────────────
    const HEX_FORMS = Object.freeze({ mulUp: v => 1 + v / 100, mulDown: v => 1 - v / 100, flat: v => v });

    // A multiplier around 1 (받는 피해 ×1.1) scales its distance from 1; everything else scales linearly.
    function scaleEffect(key, base, power) {
        const [, form, fixed] = TALISMAN_CONDITION_EFFECTS[key] || [];
        if (fixed === 'fixed') return base;
        const scaled = form === 'mulUp' || form === 'mulDown' ? 1 + (base - 1) * power / 100 : base * power / 100;
        return Number(scaled.toFixed(4));
    }

    /** A conditional line's stat delta: a one-stat line puts its value in, a gem line scales the gem's table by its power %. */
    function conditionDelta(line) {
        const def = conditionPool.get(line.id);
        if (def.delta) return Object.fromEntries(Object.entries(def.delta).map(([key, base]) => [key, scaleEffect(key, base, line.value)]));
        if (def.kind !== 'curse') return { [def.stat]: line.value };
        return { [def.effect]: HEX_FORMS[def.form](line.value) };
    }

    const round1 = value => Math.round(value * 10) / 10;
    const signed = value => `${value < 0 ? '−' : '+'}${round1(Math.abs(value))}`;
    const EFFECT_FORMATS = Object.freeze({
        pct: (label, v) => `${label} ${signed(v)}%`, fraction: (label, v) => `${label} ${signed(v * 100)}%`, count: (label, v) => `${label} +${v}`,
        flag: label => label, seconds: (label, v) => `${label} ${signed(v)}초`, minus: (label, v) => `${label} −${round1(v)}`,
        mulUp: (label, m) => `${label} +${round1((m - 1) * 100)}%`, mulDown: (label, m) => `${label} −${round1((1 - m) * 100)}%`,
        fractionUp: (label, v) => `${label} +${round1(v * 100)}%p`, fractionDown: (label, v) => `${label} −${round1(v * 100)}%`
    });

    function effectText(key, value) {
        const [label, form] = TALISMAN_CONDITION_EFFECTS[key] || [key, 'pct'];
        return label ? EFFECT_FORMATS[form](label, value) : '';
    }

    /** Readable effect list of a delta (the tooltip of a gem line, a HUD icon, an enemy curse). */
    function describeDelta(delta) {
        return Object.entries(delta || {}).map(([key, value]) => effectText(key, value)).filter(Boolean).join(', ');
    }

    function describeCondition(line) {
        const def = conditionPool.get(line.id);
        if (!def.delta) return def.text.replace('{v}', line.value);
        const head = def.kind === 'curse'
            ? `${TALISMAN_HEX_RULES.intervalMs / 1000}초마다 적 하나에 ${def.name}(위력 ${line.value}%): ${TALISMAN_HEX_RULES.durationMs / 1000}초 동안`
            : `${TALISMAN_CONDITION_WHEN[def.when]} ${def.name}(위력 ${line.value}%):`;
        return `${head} ${describeDelta(conditionDelta(line))}`;
    }

    function describeLine(line) {
        if (line.kind === 'condition') return describeCondition(line);
        return `${getStatName(line.id)} +${formatValue(line.id, line.value)}${line.wax ? ' (밀랍)' : ''}`;
    }

    return Object.freeze({ normalizeTalisman, rollNormal, rollUnique, roll, rerollStatLine, rollOtherUnique, fromCosmos, unseal, exchange, wax, waxPreview, turn, describeLine,
        wildDropsOpen, rollWild, rollWildDrop, receiveWild, dropWild, isWild: id => wildIds.has(id),
        conditionDelta, describeDelta,
        isDirectional: item => !!item && DIRECTIONAL.has(item.special), directionName: dir => DIRECTION_NAMES[dir] || DIRECTION_NAMES[1],
        conditionDef: id => conditionPool.get(id), uniqueDef: id => uniquePool.get(id), statDef: id => statPool.get(id) });
})();
safeExposeGlobals({ talismans });
