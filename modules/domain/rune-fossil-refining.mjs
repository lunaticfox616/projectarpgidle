

export function* runeFlowPrepareFossilRefinement(env, owner) {
    if (owner.season < 3) return { refused: true, value: yield { kind: 'runeLog', args: [env.deps._t('미궁 제작은 루프3부터 사용할 수 있습니다.'), 'attack-monster'] } };
    const have = Math.max(0, Math.floor(owner.currencies.fossil));
    if (have <= 0) return { refused: true, value: yield { kind: 'runeLog', args: [env.deps._t('미궁 화석이 부족합니다.'), 'attack-monster'] } };
    return { refused: false, have };
}

export function* runeFlowCompleteFossilRefinement(env, owner, raw, have) {
    if (raw === null) return;
    let count = Math.max(0, Math.min(have, Math.floor(Number(raw))));
    if (!Number.isFinite(count) || count <= 0) return (yield { kind: 'runeLog', args: [env.deps._t('정제 개수가 올바르지 않습니다.'), 'attack-monster'] });
    if (owner.season < 3 || owner.currencies.fossil < count) return (yield { kind: 'runeLog', args: [env.deps._t('진행도 또는 보유 화석이 변경되었습니다. 정제를 다시 선택하세요.'), 'attack-monster'] });
    let underworldOnlyFossils = new Set(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']);
    let refinablePool = env.deps.FOSSIL_DB.filter(fossil => !fossil.ancientPrimalOnly && !underworldOnlyFossils.has(fossil.key));
    let gained = {};
    for (let i = 0; i < count; i++) {
        owner.currencies.fossil--;
        let randomFossil = env.deps.rndChoice(refinablePool);
        owner.currencies[randomFossil.key] = (owner.currencies[randomFossil.key] || 0) + 1;
        gained[randomFossil.name] = (gained[randomFossil.name] || 0) + 1;
    }
    let summary = Object.keys(gained).map(name => env.deps._t('[{name}] {gained}개', { name, gained: gained[name] })).join(', ');
    (yield { kind: 'runeLog', args: [env.deps._t('🪨 기본 화석 {count}개를 정제해 {summary}를 획득했습니다.', { count, summary }), 'loot-magic'] });
    (yield { kind: 'runeRefresh', args: [] });
}

export function runeFlowGetFossilSurplusRefiningCost(env, fossilKey) {
    let cost = Number(env.FOSSIL_SURPLUS_REFINING_COSTS[fossilKey]);
    return Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : null;
}

export function* runeFlowRefineFossilSurplus(env, owner, fossilKey) {
    let cost = runeFlowGetFossilSurplusRefiningCost(env, fossilKey);
    if (!cost) return false;
    if (!env.deps.contentProgression.isUnlocked('fossilRestore', owner)) return (yield { kind: 'runeLog', args: [env.deps._t('잉여 화석 정제는 화석 복원을 해금해야 쓸 수 있습니다.'), 'attack-monster'] });
    if ((owner.currencies[fossilKey] || 0) < cost) return (yield { kind: 'runeLog', args: [env.deps._t('잉여 화석 정제에는 같은 화석 {cost}개가 필요합니다.', { cost }), 'attack-monster'] });
    owner.currencies[fossilKey] -= cost;
    env.deps.awardCurrency('fossilPrimal', 1);
    let sourceName = fossilKey === 'fossil' ? '미궁 화석' : ((env.deps.FOSSIL_DB.find(row => row.key === fossilKey) || {}).name || fossilKey);
    (yield { kind: 'runeLog', args: [env.deps._t('🪨 {sourceName} {cost}개를 압축해 원시 화석 1개를 만들었습니다.', { sourceName, cost }), 'loot-magic'] });
    (yield { kind: 'runeRefresh', args: [] });
    return true;
}

export function* runeFlowRestorePrimalFossil(env, owner, kind) {
    let key = kind === 'ancient' ? 'fossilAncientPrimal' : 'fossilPrimal';
    let isAncient = key === 'fossilAncientPrimal';
    if (!env.deps.contentProgression.isUnlocked('fossilRestore', owner)) return (yield { kind: 'runeLog', args: [env.deps._t('{fossil} 복원은 화석 복원을 해금해야 쓸 수 있습니다.', { fossil: env.deps._t(isAncient ? '원시 고대 화석' : '원시 화석') }), 'attack-monster'] });
    if ((owner.currencies[key] || 0) <= 0) return (yield { kind: 'runeLog', args: [env.deps._t('{name}이 부족합니다.', { name: env.deps.ORB_DB[key] ? env.deps._t(env.deps.ORB_DB[key].name) : key }), 'attack-monster'] });
    owner.currencies[key]--;
    let rewardLines = [];
    grantRestoredFossilMaterials(env, isAncient, rewardLines);
    let currencyRoll = env.deps.runeRandom();
    grantRestoredFossilCurrency(env, isAncient, currencyRoll, rewardLines);
    grantRestoredFossilBonus(env, isAncient, rewardLines);
    (yield { kind: 'runeLog', args: [env.deps._t('🪨 {name} 복원 완료! [{rewardLines}]', { name: env.deps._t(env.deps.ORB_DB[key].name), rewardLines: rewardLines.join(' / ') }), isAncient ? 'loot-unique' : 'loot-magic'] });
    (yield { kind: 'runeRefresh', args: [] });
}

function grantRestoredFossilMaterials(env, isAncient, rewardLines) {
    let baseFossilGain = isAncient ? 2 : 1;
    env.deps.awardCurrency('fossil', baseFossilGain);
    rewardLines.push(`미궁 화석 +${baseFossilGain}`);
    let typed = env.deps.rndChoice(env.deps.FOSSIL_DB.filter(row => row.key !== 'fossilAbyssal' && !row.ancientPrimalOnly && row.key !== 'fossilOld' && row.key !== 'fossilRift'));
    env.deps.awardCurrency(typed.key, 1);
    rewardLines.push(`${typed.name} +1`);
    if (isAncient) {
        env.deps.awardCurrency('fossilPrimordial', 1);
        rewardLines.push('태고 화석 +1');
        if (env.deps.runeRandom() < 0.35) {
            env.deps.awardCurrency('fossilAbyssal', 1);
            rewardLines.push('심연 화석 +1');
        }
    }
}

function grantRestoredFossilCurrency(env, isAncient, currencyRoll, rewardLines) {
    if (isAncient) {
        if (currencyRoll < 0.08) { env.deps.awardCurrency('goldenRule', 1); rewardLines.push('황금률 +1'); }
        else if (currencyRoll < 0.30) { env.deps.awardCurrency('sapBud', 1); rewardLines.push('수액 봉우리 +1'); }
        else { env.deps.awardCurrency('formlessDew', 2); rewardLines.push('형체 없는 이슬 +2'); }
    } else {
        if (currencyRoll < 0.04) { env.deps.awardCurrency('sapBud', 1); rewardLines.push('수액 봉우리 +1'); }
        else if (currencyRoll < 0.24) { env.deps.awardCurrency('formlessDew', 1); rewardLines.push('형체 없는 이슬 +1'); }
        else { env.deps.awardCurrency('magicBud', 2); rewardLines.push('마법의 새싹 +2'); }
    }
}

function grantRestoredFossilBonus(env, isAncient, rewardLines) {
    let greatChance = isAncient ? 0.16 : 0.07;
    if (env.deps.runeRandom() < greatChance) {
        let bonus = isAncient ? 'goldenRule' : 'sapBud';
        env.deps.awardCurrency(bonus, 1);
        rewardLines.push(`대성공: ${env.deps._t(env.deps.ORB_DB[bonus].name)} +1`);
    }
}
