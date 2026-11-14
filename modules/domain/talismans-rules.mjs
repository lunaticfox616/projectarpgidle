

export function talismanRoundTo(value, step) {
    return Number((Math.round(value / step) * step).toFixed(2));
}

export function talismanNormalizeLine(env, raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
    const value = Number(raw.value);
    if (!Number.isFinite(value) || Math.abs(value) > 10000) return null;
    if (raw.kind === 'condition') return env.conditionPool.has(raw.id) ? { kind: 'condition', id: raw.id, value } : null;
    return raw.wax === true ? { kind: 'stat', id: raw.id, value, wax: true } : { kind: 'stat', id: raw.id, value };
}

export function talismanUniqueFields(raw) {
    const out = {};
    if (raw.rarity === 'unique' && typeof raw.uniqueId === 'string') out.uniqueId = raw.uniqueId;
    if (typeof raw.uniqueEffect === 'string' && raw.uniqueEffect) out.uniqueEffect = raw.uniqueEffect.slice(0, 160);
    return out;
}

export function talismanSpecialFields(env, raw, special) {
    if (!special) return {};
    const out = { special };
    if (special === 'moment') out.moment = Math.min(15, Math.max(5, Math.round(Number(raw.moment) || 5)));
    if (env.DIRECTIONAL.has(special)) out.dir = [0, 1, 2, 3].includes(raw.dir) ? raw.dir : 1;
    return out;
}

export function talismanIsTalismanShape(env, raw) {
    return !!raw && typeof raw === 'object' && Array.isArray(raw.lines) && env.RARITIES.includes(raw.rarity);
}

/** Up to three rolled lines plus at most one wax line (kept last). */
export function talismanKeptLines(env, raw) {
    const lines = raw.lines.map((...args) => talismanNormalizeLine(env, ...args)).filter(Boolean);
    const waxLine = lines.find(line => line.wax);
    return lines.filter(line => !line.wax).slice(0, 3).concat(waxLine ? [waxLine] : []);
}

/** Save boundary for a stump item's talisman fields: unknown lines drop, uniques keep a known special only. Idempotent. */
export function talismanNormalizeTalisman(env, raw) {
    if (!talismanIsTalismanShape(env, raw)) return null;
    const lines = talismanKeptLines(env, raw);
    const special = raw.rarity === 'unique' && env.SPECIALS.has(raw.special) ? raw.special : null;
    if (!lines.length && !special) return null;
    const talisman = { name: String(raw.name || '부적').slice(0, 40), rarity: raw.rarity, lines, ...talismanUniqueFields(raw), ...talismanSpecialFields(env, raw, special) };
    if (lines.some(line => line.wax)) talisman.waxed = true;
    return talisman;
}

export function talismanRollValue(def, mul, random) {
    return talismanRoundTo((def.min + random() * (def.max - def.min)) * mul, def.step || 1);
}

export function talismanPick(list, random) {
    return list[Math.floor(random() * list.length)];
}

/** Weighted pick by def.weight (default 1). */
export function talismanPickWeighted(list, random) {
    const total = list.reduce((sum, def) => sum + (def.weight ?? 1), 0);
    let roll = random() * total;
    return list.find(def => (roll -= def.weight ?? 1) < 0) || list[list.length - 1];
}

export function talismanRollLine(env, rule, taken, random) {
    const conditional = random() < rule.conditionChance;
    const pool = (conditional ? env.deps.TALISMAN_CONDITION_POOL : env.deps.TALISMAN_STAT_POOL).filter(def => !taken.has(def.id));
    const def = talismanPick(pool, random);
    taken.add(def.id);
    return { kind: conditional ? 'condition' : 'stat', id: def.id, value: talismanRollValue(def, rule.mul, random) };
}

export function talismanLineName(env, line) {
    const def = line.kind === 'condition' ? env.conditionPool.get(line.id) : null;
    if (def) return def.name || { guard: '수호', warcry: '함성', curse: '저주' }[def.kind];
    return env.deps.getStatName(line.id).replace(/\(%\)$/, '');
}

export function talismanRollNormal(env, source, random = Math.random) {
    const rule = env.deps.TALISMAN_UNSEAL_RULES[source];
    const [low, high] = rule.lines;
    const count = low + Math.floor(random() * (high - low + 1));
    const taken = new Set();
    const lines = Array.from({ length: count }, () => talismanRollLine(env, rule, taken, random));
    return { name: env.deps._t('{lines} 부적', { lines: talismanLineName(env, lines[0]) }), rarity: count >= 2 ? 'rare' : 'magic', lines };
}

export function talismanUniqueLines(env, def, random) {
    if (def.special === 'temperance') {
        const taken = new Set();
        return Array.from({ length: 3 }, () => talismanRollLine(env, { conditionChance: 0, mul: 1 }, taken, random));
    }
    if (def.special === 'elementFocus') {
        const [gem, damage, resist] = env.deps.TALISMAN_ELEMENT_FOCUS[def.elem];
        return [{ kind: 'stat', id: gem, value: 1 + Math.floor(random() * 3) }, { kind: 'stat', id: damage, value: 5 + Math.floor(random() * 11) },
            { kind: 'stat', id: resist, value: 5 + Math.floor(random() * 11) }];
    }
    return (def.lines || []).map(([id, value]) => ({ kind: 'stat', id, value }));
}

export function talismanRollUnique(env, def, random = Math.random) {
    const talisman = { name: def.name, rarity: 'unique', uniqueId: def.id, lines: talismanUniqueLines(env, def, random) };
    if (def.special) talisman.special = def.special;
    if (def.uniqueEffect) talisman.uniqueEffect = def.uniqueEffect;
    if (def.special === 'moment') talisman.moment = def.momentMin + Math.floor(random() * (def.momentMax - def.momentMin + 1));
    if (env.DIRECTIONAL.has(def.special)) talisman.dir = 1;
    return talisman;
}

/** 우주계 보스 전용 부적(data/items.js COSMOS_BOSS_REWARD_DB의 talisman 줄). */
export function talismanFromCosmos(env, row) {
    return talismanNormalizeTalisman(env, { name: row.name, rarity: 'unique', uniqueId: row.id, special: row.special, uniqueEffect: row.uniqueEffect,
        dir: 1, lines: (row.stats || []).map(stat => ({ kind: 'stat', id: stat.stat, value: Number(stat.value) || 0 })) });
}

/** A talisman as unsealed with this shard (unique chance included), without paying anything. */
export function talismanRoll(env, source, random = Math.random) {
    const rule = env.deps.TALISMAN_UNSEAL_RULES[source];
    return random() < rule.uniqueChance ? talismanRollUnique(env, talismanPick(env.deps.TALISMAN_UNIQUE_DB, random), random) : talismanRollNormal(env, source, random);
}

/** 조합창: 밀랍이 아닌 일반 줄 하나를 강력한 기운의 봉인편린 배율로 새로 굴린다(줄 종류도 새로). @returns {?object} the new line. */
export function talismanRerollStatLine(env, item, random = Math.random) {
    const lines = item.lines.filter(line => line.kind === 'stat' && !line.wax);
    if (!lines.length) return null;
    const old = talismanPick(lines, random);
    const taken = new Set(item.lines.map(line => line.id));
    const next = talismanRollLine(env, { conditionChance: 0, mul: env.deps.TALISMAN_UNSEAL_RULES.strongSealShard.mul }, taken, random);
    item.lines[item.lines.indexOf(old)] = next;
    return next;
}

/** 조합창: 다른 고유 부적 하나(재료와 같은 고유는 나오지 않는다). 야생 고유가 재료에 있으면 야생 고유에서 뽑는다. */
export function talismanRollOtherUnique(env, excludedIds, random = Math.random) {
    const source = excludedIds.some(id => env.wildIds.has(id)) ? env.deps.TALISMAN_WILD_UNIQUE_DB : env.deps.TALISMAN_UNIQUE_DB;
    const pool = source.filter(def => !excludedIds.includes(def.id));
    return talismanRollUnique(env, talismanPickWeighted(pool.length ? pool : source, random), random);
}

export function talismanKillKind(enemy) {
    return enemy && enemy.isBoss ? 'boss' : enemy && enemy.isElite ? 'elite' : 'normal';
}

/** 야생 부적 드랍이 열렸는가: 부적 해금, 그루터기 함, 야생 부적 드랍 해금. */
export function talismanWildDropsOpen(env, state) {
    return env.deps.contentProgression.isUnlocked('talisman', state) && env.deps.stumpBox.of(state).acquired
        && env.deps.contentProgression.holds('wildTalisman', state);
}

/** 적 등급의 야생 부적 하나(고유면 야생 고유에서). */
export function talismanRollWild(env, kind, random = Math.random) {
    return random() < env.deps.TALISMAN_WILD_DROPS.uniqueChance[kind] ? talismanRollUnique(env, talismanPickWeighted(env.deps.TALISMAN_WILD_UNIQUE_DB, random), random)
        : talismanRollNormal(env, env.deps.TALISMAN_WILD_DROPS.rule[kind], random);
}

/** 이 처치의 야생 부적 드랍(아직 받지 않음): 부적과, 보관함이 가득 찼을 때 대신 받을 편린. */
export function talismanRollWildDrop(env, enemy, random = Math.random) {
    const kind = talismanKillKind(enemy);
    return { talisman: talismanRollWild(env, kind, random), overflow: env.deps.TALISMAN_WILD_DROPS.overflow[kind] };
}

/** 굴린 야생 부적을 받는다: 그루터기 함 보관함에, 가득 찼으면 편린 하나로. @returns {{item?:object, currency?:string}} */
export function talismanReceiveWild(env, state, drop) {
    const item = env.deps.stumpBox.addTalisman(state, drop.talisman);
    if (item) return { item };
    state.currencies[drop.overflow] = (state.currencies[drop.overflow] || 0) + 1;
    return { currency: drop.overflow };
}

/** 야생 부적 드랍을 바로 받는다(탐험 바닥 밖). @returns {{item?:object, currency?:string}} */
export function talismanDropWild(env, state, enemy, random = Math.random) {
    return talismanReceiveWild(env, state, talismanRollWildDrop(env, enemy, random));
}

export function talismanUnsealRefusal(env, source, state) {
    if (!env.deps.TALISMAN_UNSEAL_RULES[source]) return '알 수 없는 편린입니다.';
    if (!env.deps.stumpBox.of(state).acquired) return '그루터기 함을 먼저 얻어야 합니다.';
    if (!env.deps.contentProgression.isUnlocked('talisman', state)) return '해금 목록에서 부적을 먼저 여세요.';
    if ((state.currencies[source] || 0) < env.deps.TALISMAN_UNSEAL_RULES[source].cost) return '편린이 부족합니다.';
    return env.deps.stumpBox.storageFull(state) ? '그루터기 함 보관함이 가득 찼습니다.' : '';
}

/** Spends one shard and puts the new talisman into the stump box storage. */
export function talismanUnseal(env, source, state, random = Math.random) {
    const reason = talismanUnsealRefusal(env, source, state);
    if (reason) return { ok: false, reason };
    state.currencies[source] -= env.deps.TALISMAN_UNSEAL_RULES[source].cost;
    return { ok: true, item: env.deps.stumpBox.addTalisman(state, talismanRoll(env, source, random)) };
}

export function talismanExchange(env, index, state) {
    const row = env.deps.TALISMAN_SHARD_EXCHANGE[index];
    if (!row || (state.currencies[row.from] || 0) < row.cost) return { ok: false, reason: env.deps._t('교환할 편린이 부족합니다.') };
    state.currencies[row.from] -= row.cost;
    state.currencies[row.to] = (state.currencies[row.to] || 0) + 1;
    return { ok: true, row };
}

export function talismanTalismanItem(env, state, id) {
    const item = env.deps.stumpBox.itemById(state, id);
    return item && item.family === 'talisman' ? item : null;
}

/** 밀랍 줄이 될 줄: 양수인 일반 줄 가운데 가장 약한 것. */
export function talismanWaxSource(item) {
    return item.lines.filter(line => line.kind === 'stat' && !line.wax && line.value > 0)
        .sort((a, b) => Math.abs(a.value) - Math.abs(b.value))[0] || null;
}

export function talismanWaxPreview(env, item) {
    const source = item && !item.waxed ? talismanWaxSource(item) : null;
    if (!source) return null;
    const raw = source.value * env.deps.TALISMAN_WAX_COPY_PCT / 100;
    return { kind: 'stat', id: source.id, value: Number(raw.toFixed(Math.abs(raw) < 1 ? 2 : 1)), wax: true };
}

export function talismanWax(env, id, state) {
    const item = talismanTalismanItem(env, state, id), line = talismanWaxPreview(env, item);
    if (!line) return { ok: false, reason: env.deps._t('밀랍을 바를 수 있는 부적이 아닙니다.') };
    if (!env.deps.stumpBox.editable(state)) return { ok: false, reason: env.deps._t('지금은 그루터기 함을 바꿀 수 없습니다.') };
    if ((state.currencies.beeswax || 0) < 1) return { ok: false, reason: env.deps._t('밀랍이 부족합니다.') };
    state.currencies.beeswax -= 1;
    item.lines.push(line);
    item.waxed = true;
    return { ok: true, line };
}

/** Turns a directional talisman's mark a quarter clockwise. */
export function talismanTurn(env, id, state) {
    const item = talismanTalismanItem(env, state, id);
    if (!item || !env.DIRECTIONAL.has(item.special) || !env.deps.stumpBox.editable(state)) return false;
    item.dir = ((item.dir ?? 1) + 1) % 4;
    return true;
}

// A multiplier around 1 (받는 피해 ×1.1) scales its distance from 1; everything else scales linearly.
export function talismanScaleEffect(env, key, base, power) {
    const [, form, fixed] = env.deps.TALISMAN_CONDITION_EFFECTS[key] || [];
    if (fixed === 'fixed') return base;
    const scaled = form === 'mulUp' || form === 'mulDown' ? 1 + (base - 1) * power / 100 : base * power / 100;
    return Number(scaled.toFixed(4));
}

/** A conditional line's stat delta: a one-stat line puts its value in, a gem line scales the gem's table by its power %. */
export function talismanConditionDelta(env, line) {
    const def = env.conditionPool.get(line.id);
    if (def.delta) return Object.fromEntries(Object.entries(def.delta).map(([key, base]) => [key, talismanScaleEffect(env, key, base, line.value)]));
    if (def.kind !== 'curse') return { [def.stat]: line.value };
    return { [def.effect]: env.HEX_FORMS[def.form](line.value) };
}

export function talismanRound1(value) { return Math.round(value * 10) / 10; }

export function talismanSigned(value) { return `${value < 0 ? '−' : '+'}${talismanRound1(Math.abs(value))}`; }

export function talismanEffectText(env, key, value) {
    const [label, form] = env.deps.TALISMAN_CONDITION_EFFECTS[key] || [key, 'pct'];
    return label ? env.EFFECT_FORMATS[form](label, value) : '';
}

/** Readable effect list of a delta (the tooltip of a gem line, a HUD icon, an enemy curse). */
export function talismanDescribeDelta(env, delta) {
    return Object.entries(delta || {}).map(([key, value]) => talismanEffectText(env, key, value)).filter(Boolean).join(', ');
}

export function talismanDescribeCondition(env, line) {
    const def = env.conditionPool.get(line.id);
    if (!def.delta) return def.text.replace('{v}', line.value);
    const head = def.kind === 'curse'
        ? env.deps._t('{value}초마다 적 하나에 {name}(위력 {value2}%): {value3}초 동안', { value: env.deps.TALISMAN_HEX_RULES.intervalMs / 1000, name: def.name, value2: line.value, value3: env.deps.TALISMAN_HEX_RULES.durationMs / 1000 })
        : env.deps._t('{TALISMAN_CONDITION_WHEN} {name}(위력 {value}%):', { TALISMAN_CONDITION_WHEN: env.deps.TALISMAN_CONDITION_WHEN[def.when], name: def.name, value: line.value });
    return `${head} ${talismanDescribeDelta(env, talismanConditionDelta(env, line))}`;
}

export function talismanDescribeLine(env, line) {
    if (line.kind === 'condition') return talismanDescribeCondition(env, line);
    return `${env.deps.getStatName(line.id)} +${env.deps.formatValue(line.id, line.value)}${line.wax ? env.deps._t(' (밀랍)') : ''}`;
}
