// 부적(2026-09-30 개편): 그루터기 함의 세 번째 계열(색 없는 한 칸 조각). 판 · 보관함 · 성장(깨어남) · 루프 회귀는
// stump-box.js가, 부적의 줄 · 굴림 · 봉인 풀기 · 밀랍 · 표식 방향은 여기서 맡는다. 이웃 효과 합산은 talisman-effects.js,
// 전투 적용은 talisman-combat.js, 화면은 stump-talisman-ui.js.
// 부적 필드(그루터기 아이템에 함께 저장): { name, rarity: 'magic'|'rare'|'unique', lines: [{ kind: 'stat'|'condition', id, value, wax? }],
//   uniqueId?, special?, uniqueEffect?, moment?, dir?(0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽, 방향이 필요한 고유만), waxed? }.
const talismans = (() => {
    const statPool = new Map(TALISMAN_STAT_POOL.map(def => [def.id, def]));
    const conditionPool = new Map(TALISMAN_CONDITION_POOL.map(def => [def.id, def]));
    const uniquePool = new Map(TALISMAN_UNIQUE_DB.map(def => [def.id, def]));
    const RARITIES = ['magic', 'rare', 'unique'];
    const SPECIALS = new Set(['gravity', 'simpleCopy', 'temperance', 'pride', 'moment', 'elementFocus',
        'cosmosChoice', 'cosmosLightningVariance', 'cosmosRepulsion']);
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

    function rollLine(rule, taken, random) {
        const conditional = random() < rule.conditionChance;
        const pool = (conditional ? TALISMAN_CONDITION_POOL : TALISMAN_STAT_POOL).filter(def => !taken.has(def.id));
        const def = pick(pool, random);
        taken.add(def.id);
        return { kind: conditional ? 'condition' : 'stat', id: def.id, value: rollValue(def, rule.mul, random) };
    }

    function lineName(line) {
        if (line.kind === 'condition') return { guard: '수호', warcry: '함성', curse: '저주' }[conditionPool.get(line.id).kind];
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

    function unsealRefusal(source, state) {
        if (!TALISMAN_UNSEAL_RULES[source]) return '알 수 없는 편린입니다.';
        if (!stumpBox.of(state).acquired) return '그루터기 함을 먼저 얻어야 합니다.';
        if (!contentProgression.isUnlocked('talisman', state)) return '해금 목록에서 부적을 먼저 여세요.';
        if ((state.currencies[source] || 0) < TALISMAN_UNSEAL_RULES[source].cost) return '편린이 부족합니다.';
        return stumpBox.storage(state).length >= STUMP_BOX_STORAGE ? '그루터기 함 보관함이 가득 찼습니다.' : '';
    }

    /** Spends one shard and puts the new talisman into the stump box storage. */
    function unseal(source, state = game, random = Math.random) {
        const reason = unsealRefusal(source, state);
        if (reason) return { ok: false, reason };
        const rule = TALISMAN_UNSEAL_RULES[source];
        state.currencies[source] -= rule.cost;
        const talisman = random() < rule.uniqueChance ? rollUnique(pick(TALISMAN_UNIQUE_DB, random), random) : rollNormal(source, random);
        return { ok: true, item: stumpBox.addTalisman(state, talisman) };
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

    function describeLine(line) {
        if (line.kind === 'condition') return conditionPool.get(line.id).text.replace('{v}', line.value);
        return `${getStatName(line.id)} +${formatValue(line.id, line.value)}${line.wax ? ' (밀랍)' : ''}`;
    }

    return Object.freeze({ normalizeTalisman, rollNormal, rollUnique, fromCosmos, unseal, exchange, wax, waxPreview, turn, describeLine,
        isDirectional: item => !!item && DIRECTIONAL.has(item.special), directionName: dir => DIRECTION_NAMES[dir] || DIRECTION_NAMES[1],
        conditionDef: id => conditionPool.get(id), uniqueDef: id => uniquePool.get(id), statDef: id => statPool.get(id) });
})();
safeExposeGlobals({ talismans });
