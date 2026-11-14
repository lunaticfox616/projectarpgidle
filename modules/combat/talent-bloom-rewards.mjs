

/** 개화 재능은 지금 전직이 속한 직업의 대표 재능이다(2026-10-02 재능 정리). 카드도 그 재능 × 전직으로 정해진다. */
export function hitResolveTalentBloomHeroId(env) {
    const heroId = typeof env.deps.getTalentBloomHeroIdForAscendancy === 'function' ? env.deps.getTalentBloomHeroIdForAscendancy(env.owner.ascendClass) : null;
    if (heroId) return heroId;
    if (env.deps.HERO_SELECTION_DEFS[env.owner.pendingTalentBloomHeroId]) return env.owner.pendingTalentBloomHeroId;
    return env.deps.HERO_SELECTION_DEFS[env.owner.selectedHeroId] ? env.owner.selectedHeroId : 'hero1';
}

export function* hitUnlockLoopBloomSpecialization(env, heroId, classKey, classLabel, firstEverBloomOfClass) {
    if (!classKey || classKey === 'none' || env.owner.bloomLoopSpecGranted === classKey) return false;
    env.owner.bloomLoopSpecGranted = classKey;
    env.owner.bloomedClassThisLoop = classKey;
    env.owner.bloomedTalentThisLoop = heroId;
    env.owner.ascendPoints = Math.max(0, Math.floor(env.owner.ascendPoints || 0)) + 2;
    env.owner.ascendKeystonePoints = Math.max(0, Math.floor(env.owner.ascendKeystonePoints || 0)) + 1;
    env.owner.ascendRank = Math.max(env.owner.ascendRank || 0, 5);
    if (firstEverBloomOfClass && typeof env.deps.queueTutorialNotice === 'function') {
        (yield { kind: 'queueTutorialNotice', args: ['unlock_fifth_node', env.deps._t('5차 특화 노드'), env.deps._t('이번 루프에 처음 피운 개화 조합으로 5차 특화 노드가 열렸습니다.\n‘스킬트리 → 전직’에서 재능과 전직 특화 노드를 확인하세요.'), 'tab-traits'] });
    }
    (yield { kind: 'addLog', args: [env.deps._t('[{classLabel}] 5차 특화 개방: 전직 포인트 +2, 키스톤 포인트 +1', { classLabel }), 'loot-unique'] });
    return true;
}

export function* hitAwardTalentBloomCard(env, comboKey, heroLabel, classLabel) {
    if (typeof env.deps.recordTalentBloomCard !== 'function') return;
    let result = env.deps.recordTalentBloomCard(comboKey);
    if (!env.owner.unlocks) env.owner.unlocks = {};
    let firstUnlock = !env.owner.unlocks.talent;
    env.owner.unlocks.talent = true;
    env.owner.noti.talent = true;
    if (firstUnlock && typeof env.deps.queueTutorialNotice === 'function') {
        (yield { kind: 'queueContentNotice', args: ['unlock_talent_tab', '재능 개화', 'talent', { open: '재능 개화 카드를 얻었습니다.\n‘재능’에서 가진 카드와 효과를 확인하세요.',
            locked: '재능 개화 카드를 얻었습니다.\n‘해금’에서 재능을 열면 카드와 효과를 관리할 수 있습니다.' }, 'tab-talent'] });
    }
    (yield { kind: 'addLog', args: [env.deps._t('개화 카드 [{hero} × {cls}] Lv.{level} (점수 {score}){up}', { hero: heroLabel, cls: classLabel, level: result.card.level, score: result.score, up: result.leveledUp ? `, ${env.deps._t('레벨 상승')}` : '' }), 'loot-unique'] });
    (yield { kind: 'dispatchRuntimeEvent', args: ['talent-tab-refresh-requested'] });
}

// 재능 개화 시련 클리어 처리. 카드 조합은 입장 시 고르고, 5차 특화 포인트는 루프당 한 번만 지급한다.
export function* hitHandleTalentBloomClear(env) {
    consumeBloomKeys(env.owner);
    let heroId = hitResolveTalentBloomHeroId(env), classKey = env.owner.ascendClass || 'none';
    let comboKey = `${heroId}__${classKey}`;
    let isNewCombo = recordBloomCombo(env.owner, comboKey);
    let heroLabel = env.deps.HERO_SELECTION_DEFS[heroId]?.label || heroId;
    let classLabel = env.deps.CLASS_TEMPLATES[classKey]?.name || '미전직';
    (yield { kind: 'addLog', args: [env.deps._t('재능 개화 성공: [{hero} × {cls}]{fresh}', { hero: heroLabel, cls: classLabel, fresh: isNewCombo ? `, ${env.deps._t('신규 조합')}` : '' }), 'loot-unique'] });
    let firstEverBloomOfClass = recordBloomClass(env.owner, classKey);
    (yield* hitUnlockLoopBloomSpecialization(env, heroId, classKey, classLabel, firstEverBloomOfClass));
    (yield* hitAwardTalentBloomCard(env, comboKey, heroLabel, classLabel));
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.owner.inTicketBossFight = false;
    env.deps.startMoving(false);
    (yield { kind: 'updateStaticUI', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

function consumeBloomKeys(owner) {
    owner.currencies.chaosKey = Math.max(0, Math.floor(owner.currencies.chaosKey || 0) - 1);
    owner.currencies.coreKey = Math.max(0, Math.floor(owner.currencies.coreKey || 0) - 1);
    owner.bloomTrialRegenSuppress = 0;
}

function recordBloomCombo(owner, comboKey) {
    owner.pendingTalentBloomHeroId = null;
    owner.talentBloomClears = Math.max(0, Math.floor(owner.talentBloomClears || 0)) + 1;
    owner.talentBloomCombos = Array.isArray(owner.talentBloomCombos) ? owner.talentBloomCombos : [];
    const isNew = !owner.talentBloomCombos.includes(comboKey);
    if (isNew) owner.talentBloomCombos.push(comboKey);
    return isNew;
}

function recordBloomClass(owner, classKey) {
    owner.bloomedClasses = Array.isArray(owner.bloomedClasses) ? owner.bloomedClasses : [];
    const first = classKey !== 'none' && !owner.bloomedClasses.includes(classKey);
    if (first) owner.bloomedClasses.push(classKey);
    return first;
}
