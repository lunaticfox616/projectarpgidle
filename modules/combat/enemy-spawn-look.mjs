

export function buildRollEnemyTrait(env, zone, isElite, isBoss, seed) {
    if (!isElite && !isBoss) return null;
    let list = env.deps.ENEMY_TRAIT_POOL.slice();
    list = trialTraitPool(list, zone);
    if ((env.owner.season || 1) >= 10 && zone && zone.type === 'abyss' && zone.ele === 'chaos') {
        list.unshift({ id: 'veryFast_loop10', name: '매우 빠름', outlineColor: '#82d8de', attackSpeedVarMul: 1.34, expMul: 1.10, dropMul: 1.08 });
    }
    let idx = Math.abs(seed || 0) % list.length;
    return { ...list[idx] };
}

function trialTraitPool(list, zone) {
    if (zone && zone.type === 'trial' && zone.id === 'trial_3') {
        list = list.filter(trait => trait.id !== 'bloodless');
    }
    if (zone && zone.type === 'trial' && zone.id === 'trial_4') {
        list = list.map(trait => trait.id === 'bloodless'
            ? { ...trait, id: 'leechResist_trial4', name: '흡혈저항', leechEffMul: 0.45 }
            : trait);
    }
    return list;
}

/** Chaos bosses borrow a random act boss; an atlas node keeps its own (zone.bossAct). */
export function buildGetChaosBossVisual(env, zone, variantSeed) {
    if (!zone || !['abyss', 'chaosRealm', 'atlasMap'].includes(zone.type) || typeof env.deps.getBossAssetKeyForZone !== 'function') return null;
    const seed = Math.abs(Math.floor(variantSeed || 0)), fixedAct = Number.isInteger(zone.bossAct);
    const actId = fixedAct ? zone.bossAct : seed % 10;
    // 액트와 그 안의 모습을 같은 나머지로 고르면 일부 모습(예: 액트 4의 첫째)이 절대 나오지 않는다.
    const assetKey = env.deps.getBossAssetKeyForZone({ type: 'act', id: actId }, fixedAct ? seed : Math.floor(seed / 10));
    let hues = [286, 318, 202, 266, 334, 178, 244, 302, 222, 274];
    return { assetKey: assetKey, tint: hues[actId] };
}

export function buildGetWispEnemyDefenseBonuses(env, monsterVariant) {
    const isWisp = !!(monsterVariant && String(monsterVariant.id || '').startsWith('wisp-'));
    const elements = new Set(isWisp && Array.isArray(monsterVariant.elements) ? monsterVariant.elements : []);
    const rules = isWisp ? env.deps.WISP_ENEMY_RULES : env.deps.WISP_NEUTRAL_RULES;
    return {
        isWisp,
        evasionMul: rules.evasionMul,
        armorMul: rules.armorMul,
        hpMul: rules.hpMul,
        ...wispElementDefences(elements)
    };
}

function wispElementDefences(elements) {
    return {
        dr: elements.has('phys') ? 18 : 0,
        resF: elements.has('fire') ? 30 : 0,
        resC: elements.has('cold') ? 30 : 0,
        resL: elements.has('light') ? 30 : 0,
        resChaos: elements.has('chaos') ? 30 : 0
    };
}

/** What the monster looks like and is: a boss's art, its trait, a realm visual or a monster variant, wisp defenses. */
export function buildGetEnemyLook(env, zone, marker, ctx) {
    const { isBoss, isElite, enemyEle, variantSeed } = ctx;
    const art = buildGetEnemyBossArt(env, zone, marker, isBoss, variantSeed);
    const trait = buildRollEnemyTrait(env, zone, isElite, isBoss, variantSeed);
    const realmVisualSet = typeof env.deps.getRealmMonsterVisualSet === 'function' ? env.deps.getRealmMonsterVisualSet(zone) : null;
    const realmVisual = buildGetRealmVisualFor(env, realmVisualSet, { isBoss, isElite, variantSeed }, marker.packVisualId);
    const monsterVariant = !realmVisual && !isBoss && typeof env.deps.getMonsterVariantDefinition === 'function'
        ? env.deps.getMonsterVariantDefinition(variantSeed, enemyEle, zone, marker)
        : null;
    const wispDefense = buildGetWispEnemyDefenseBonuses(env, monsterVariant);
    return { ...art, trait, realmVisualSet, realmVisual, monsterVariant, wispDefense, wispVisual: wispDefense.isWisp ? monsterVariant : null };
}

/** An atlas boss keeps its own roster identity. Act art remains the fallback for an undelivered sheet. */
export function buildGetEnemyBossArt(env, zone, marker, isBoss, variantSeed) {
    const chaosBossVisual = isBoss ? buildGetChaosBossVisual(env, zone, variantSeed) : null;
    const bossAssetKey = chaosBossVisual ? chaosBossVisual.assetKey : (isBoss && typeof env.deps.getBossAssetKeyForZone === 'function' ? env.deps.getBossAssetKeyForZone(zone, variantSeed, marker.storyStage ?? 0) : null);
    const bossVisualId = isBoss ? zone.bossVisualId || null : null;
    return { chaosBossVisual: bossVisualId ? null : chaosBossVisual, bossAssetKey, bossVisualId };
}

/** A pack may choose a nonboss body from its own realm without changing the member's elite rank or trait roll. */
export function buildGetRealmVisualFor(env, realmVisualSet, { isBoss, isElite, variantSeed }, packVisualId) {
    const requested = !isBoss && realmVisualSet?.members.find(member => member.id === packVisualId && member.role !== 'boss');
    if (requested) return requested;
    const realmVisualRole = isBoss ? 'boss' : (isElite ? 'elite' : 'normal');
    return typeof env.deps.getRealmMonsterVisualDefinition === 'function' ? env.deps.getRealmMonsterVisualDefinition(realmVisualSet, realmVisualRole, variantSeed) : null;
}

/** A realm visual's or monster variant's name, else name; an elite's trait name goes before it. A boss keeps name. */
export function buildGetEnemyLookName(name, isBoss, isElite, look) {
    if (isBoss) return name;
    const shown = look.realmVisual || look.monsterVariant;
    if (shown) return isElite && look.trait ? `${look.trait.name} ${shown.name}` : shown.name;
    return isElite && look.trait ? `${look.trait.name} ${name}` : name;
}
