

/** What a ripening seed becomes (꽃, 열매, 덩굴, 뿌리), evenly (2026-11-04 사용자: 키우기 전에는 모른다). */
export function stumpGrowKind(env, random = Math.random) { return env.KINDS[Math.min(env.KINDS.length - 1, Math.floor(random() * env.KINDS.length))]; }

/** A grown seed saved without its kind: a fixed one by id (restore stays repeatable). */
export function stumpLegacyKind(env, id) { return env.KINDS[Number(id) % env.KINDS.length]; }

// ── 아이템 ─────────────────────────────────────────────
export function stumpNeed(env, item) { return env.deps.STUMP_BOX_GROWTH.need[item.family]; }

export function stumpIsMature(item) { return item.ripe === true; }

/** flower · fruit · vine · root: what a grown seed became (null while it grows, and for talismans and scars). */
export function stumpYieldKind(item) { return item.family === 'seed' && stumpIsMature(item) ? item.path : null; }

/** Seeds grow until they ripen, talismans and scars until they wake. */
export function stumpGrows(env, item) { return env.FAMILIES.includes(item.family) || !!env.FIXED_TARGET[item.family]; }

/** What the item gives once grown (nothing while a seed grows: its kind is not known yet). */
export function stumpYieldOf(env, item) {
    const kind = stumpYieldKind(item);
    return kind ? env.deps.STUMP_BOX_YIELDS[kind][item.color] : null;
}

export function stumpTargetStage(env, item) { return env.FIXED_TARGET[item.family] || item.path; }

export function stumpIsPlainHarvest(env, item) { return !item.albino && !item.ancient && stumpGoldenMul(env, item) === 1; }

// 지도석 기운 바꾸기(js/atlas.js changeOmen): 평범한 꽃은 다시 굴리고 황금 꽃은 고른다. 둘은 서로의 값을 대신하지 않고, 알비노와 고대 씨앗은 쓰지 않는다.
// 화폐화한 꽃은 표식이 없어 평범한 꽃으로 세고, 다른 값처럼 실물보다 먼저 낸다.
export function stumpIsGoldenHarvest(env, item) { return !item.albino && !item.ancient && stumpGoldenMul(env, item) > 1; }

export function stumpClampRoll(env, value, cap = env.deps.STUMP_BOX_ROLL_LIMIT.max) {
    return Math.round(Math.min(cap, Math.max(env.deps.STUMP_BOX_ROLL_LIMIT.min, Number(value) || 1)) * 100) / 100;
}

/** Quality this ripening counts: the stored roll plus a bumper harvest's bonus (풍작). */
export function stumpQualityOf(item) { return item.roll + ((item.harvest && item.harvest.bonus) || 0); }

/** 황금(born golden or golden at ripening): every line × STUMP_BOX_RIPENING.golden.mul. */
export function stumpGoldenMul(env, item) { return item.golden || (item.harvest && item.harvest.golden) ? env.deps.STUMP_BOX_RIPENING.golden.mul : 1; }

/** Quality × golden × the board's multiplier (synergies × graft). */
export function stumpItemScale(env, item, boardMul) { return stumpQualityOf(item) * stumpGoldenMul(env, item) * boardMul; }

export function stumpItemValue(env, item, boardMul) {
    return Math.round(stumpYieldOf(env, item).value * stumpItemScale(env, item, boardMul) * 100) / 100;
}

/** The ripening roll's extra lines at the item's quality, golden, synergies and graft. */
export function stumpLineValues(env, item, boardMul) {
    const scale = stumpItemScale(env, item, boardMul);
    return ((item.harvest && item.harvest.lines) || []).map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(stumpAlbinoLines(env, item));
}

/** Fixed unique options, also shown in storage. */
export function stumpAlbinoLines(env, item) {
    return item.albino && stumpIsMature(item) ? env.deps.STUMP_BOX_RIPENING.albino.variants[stumpYieldKind(item)][item.color] : [];
}

/** A placed, awake scar's absorbed lines at its cell's graft (no resonance: it has no colour). */
export function stumpScarValues(item, graft) {
    return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value: Math.round(value * graft * 100) / 100 }));
}

export function stumpAddLines(stats, lines) {
    lines.forEach(line => { stats[line.stat] = Math.round(((stats[line.stat] || 0) + line.value) * 100) / 100; });
}
