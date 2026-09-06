/** Optional-content purchase rules. No DOM, storage, timers or combat mutations. */
const contentProgression = (() => {
    const definitions = new Map(CONTENT_UNLOCK_CATALOG.map(row => [row.id, row]));
    const routes = new Map(CONTENT_UNLOCK_CATALOG.flatMap(row => (row.routes || []).map(route => [route, row.id])));
    const coreRoutes = new Set(['tab-character', 'tab-char', 'tab-items', 'tab-skills', 'tab-battle', 'tab-settings', 'tab-social',
        'item-tab-equip', 'skill-tab-equip', 'map-tab-zones', 'map-explore-hunting', 'map-explore-chaos',
        'map-explore-root-boss']);

    // Predicates only read normalized save state; unlocking a menu never grants world progress.
    const progressChecks = {
        market: owner => [['액트 5 클리어', owner.maxZoneId >= 5]],
        trials: owner => [['액트 3 도달', owner.maxZoneId >= 3 || owner.completedTrials.length > 0]],
        meteor: owner => [['액트 7 도달', owner.maxZoneId >= 7]],
        deepChaos: owner => [['혼돈 20층 클리어', hasCurrentLoopChaos20Clear(owner)]],
        chaosRealm: owner => [['나무꾼에게 10% 피해 후 전투 종료', !!owner.chaosRealm.unlocked]],
        underworld: owner => [['혼돈계 · 케르베로스 · 심화 30층 · 미궁 100층', isUnderworldUnlockReady(owner)]],
        cosmos: owner => [['나무꾼 기록 · 지하계 30층 도달', isCosmosContentUnlockReady(owner)]],
        sky: owner => [['혼돈 20층 클리어', owner.skyTower.unlocked || owner.season > 15 || hasCurrentLoopChaos20Clear(owner)]],
        beyond: owner => [['경계의 관측자 처치', isBeyondBoundaryUnlockRequirementMet(owner)]],
        cube: owner => [['지하계 10층 클리어', owner.underworldProgress.highestFloor >= 11]],
        arcana: owner => [['봉인된 카드 발견', owner.arcana.unlocked]],
        talent: owner => [['재능 개화', hasPermanentTalentTabUnlock(owner)]],
        woodsman: owner => [['나무꾼 조우 또는 기록', !!owner.woodsmanSimulatorSeenLoop || owner.woodsmanDefeatAttempts > 0 || owner.journalEntries.includes('woodsman')]]
    };

    function requirements(id, owner = game) {
        const def = definitions.get(id);
        if (!def) return [];
        const rows = [[`루프 ${def.minLoop}`, owner.season >= def.minLoop]];
        for (const key of new Set([def.after, ...(def.requires || [])].filter(Boolean))) {
            rows.push([definitions.get(key).name + ' 해금', isUnlocked(key, owner)]);
        }
        if (def.progress) rows.push(...progressChecks[def.progress](owner));
        return rows.map(([label, met]) => ({ label, met: !!met }));
    }

    function isUnlocked(id, owner = game) {
        const def = definitions.get(id);
        if (!def) return false;
        const state = owner.contentProgression;
        if (!state) return true;
        if (state.unlocked.includes(id) || state.inherited.includes(id)) return true;
        if (def.cost !== 0) return false;
        if (state.automatic.includes(id)) return true;
        if (owner.season < def.minLoop) return false;
        return !def.progress || progressChecks[def.progress](owner).every(row => row[1]);
    }

    /** Natural loot only: discovery prerequisites and shared combat keys must not depend on paid growth. */
    function canDropCurrency(key, owner = game) {
        const unlocks = ORB_DB[getCanonicalCurrencyKey(key)]?.dropUnlocks;
        return !unlocks || unlocks.some(id => isUnlocked(id, owner));
    }

    /** Flask discovery, crafting and inventory share the same feature boundary. */
    function canUseFlask(key, owner = game) {
        const def = FLASK_DB[key];
        return !!def && isUnlocked(def.kind === 'heal' ? 'flask' : 'flaskUtility', owner);
    }

    function canOpen(route, owner = game) {
        if (!owner.contentProgression || !route || coreRoutes.has(route)) return true;
        if (route === 'tab-map') return owner.season >= 2 || !!owner.contentProgression.legacy;
        if (route === 'tab-season' || route === 'tab-unlocks') return owner.season >= 2;
        const feature = routes.get(route);
        return !!feature && isUnlocked(feature, owner);
    }

    function balance(owner = game) {
        const state = owner.contentProgression;
        if (!state) return 0;
        const earned = (Math.max(state.highestLoop, owner.season) - 1) * CONTENT_UNLOCK_POINTS_PER_LOOP;
        return Math.max(0, earned - state.unlocked.reduce((sum, id) => sum + state.paidCosts[id], 0));
    }

    function status(id, owner = game) {
        const def = definitions.get(id);
        if (!def) return { available: false, reason: '알 수 없는 콘텐츠입니다.' };
        if (isUnlocked(id, owner)) return { available: false, reason: '해금 완료', unlocked: true };
        const missing = requirements(id, owner).filter(row => !row.met);
        if (missing.length) return { available: false, reason: missing[0].label + ' 필요' };
        if (balance(owner) < def.cost) return { available: false, reason: '해금 포인트 부족' };
        return { available: true, reason: `${def.cost}점으로 해금` };
    }

    function sync(owner = game) {
        const state = owner.contentProgression;
        if (!state) return;
        state.highestLoop = Math.max(state.highestLoop, Math.floor(owner.season || 1));
        Object.assign(owner.unlocks, { char: true, items: true, skills: true, map: canOpen('tab-map', owner), season: owner.season >= 2 });
        for (const def of CONTENT_UNLOCK_CATALOG) {
            const opened = isUnlocked(def.id, owner);
            if (def.gate) owner.unlocks[def.gate] = opened;
            for (const flag of def.flags || []) owner[flag] = opened;
        }
        const automatic = CONTENT_UNLOCK_CATALOG.filter(def => def.cost === 0 && isUnlocked(def.id, owner)).map(def => def.id);
        state.automatic = [...new Set([...state.automatic, ...automatic])];
    }

    function grantConditionEntryReward(key, owner) {
        if (!owner.conditionGemPool.includes(key)) owner.conditionGemPool.push(key);
        owner.conditionGemLevels[key] = Math.max(1, owner.conditionGemLevels[key] || 1);
        if (!owner.skillAutoRules.length) owner.skillAutoRules.push(normalizeConditionPatternRule({
            id:'condition-starter', enabled:true, priority:1, triggerType:'boss_warning',
            actionType:'condition_gem', skillName:key }));
    }

    /** One-time entry rewards share the purchase transaction; load/loop changes never replay them. */
    function grantEntryReward(id, key, owner) {
        if (id === 'condition') grantConditionEntryReward(key, owner);
        if (id === 'craft') owner.currencies[key]++;
        if (id === 'support') {
            if (hasSupportGemOwned(key, owner)) owner.currencies.gemShard += 8;
            else {
                owner.supports.push(key);
                owner.supportGemData[key] = normalizeGemRecord(null);
            }
        }
    }

    /** Synchronous check-and-spend: validate choices before mutating any state. */
    function purchase(id, owner = game, rewardKey) {
        const check = status(id, owner);
        if (!check.available) return { ok: false, message: check.reason };
        const def = definitions.get(id);
        const choices = def.rewardChoices || [];
        const key = rewardKey === undefined ? choices[0]?.key : rewardKey;
        if (choices.length && !choices.some(row => row.key === key)) return { ok: false, message: '받을 보상을 선택하세요.' };
        grantEntryReward(id, key, owner);
        owner.contentProgression.unlocked.push(id);
        owner.contentProgression.paidCosts[id] = def.cost;
        sync(owner);
        return { ok: true, message: definitions.get(id).name + ' 해금' };
    }

    function legacyAccess(def, owner) {
        if ((def.routes || []).some(route => owner.unlockedMapContents.includes(route))) return true;
        if (def.id === 'journal') return owner.journalEntries.length > 0;
        if (def.gate) return !!owner.unlocks[def.gate];
        if (def.flags) return def.flags.some(flag => owner[flag]);
        return owner.season >= def.minLoop || ['support','craft','fossil','research','hall','flask','records'].includes(def.id);
    }

    function restorePurchases(purchased, next, record) {
        const version = Number(record.version) || 0;
        let remaining = (next.highestLoop - 1) * CONTENT_UNLOCK_POINTS_PER_LOOP;
        for (const id of purchased) {
            const def = definitions.get(id);
            if (!def || def.cost === 0 || next.inherited.includes(id)) continue;
            const cost = restoredPrice(def, record);
            if (cost > remaining) continue;
            if (version >= 4 && !next.grandfathered.includes(id) && !canRestoreChoice(def, next)) continue;
            next.unlocked.push(id); next.paidCosts[id] = cost; remaining -= cost;
        }
    }

    function canRestoreChoice(def, next) {
        if (def.cost > 0 && next.highestLoop < def.minLoop) return false;
        return [def.after, ...(def.requires || [])].filter(Boolean)
            .every(key => next.unlocked.includes(key) || next.inherited.includes(key));
    }

    // Save boundary: old 1P purchases are grandfathered; invalid new prices use the catalog.
    function restoredPrice(def, record) {
        if ((Number(record.version) || 0) < 6) return 1;
        return record.paidCosts?.[def.id] === 1 ? 1 : def.cost;
    }

    function inheritFormerFreeAccess(record, next, owner) {
        if (!(Number(record.version) < 4)) return;
        const previous = new Set([...(Array.isArray(record.unlocked) ? record.unlocked : []), ...next.inherited]);
        if (record.version === 3) {
            const bundled = [['research', 3], ['gemForge', 4]];
            for (const [id, loop] of bundled) {
                if (previous.has(id) || (previous.has('support') && next.highestLoop >= loop)) next.inherited.push(id);
            }
        }
        if (owner.season >= 10) next.inherited.push('deepTree');
        next.inherited = [...new Set(next.inherited)];
    }

    function migrateConditionEntryReward(record, next, owner) {
        if ((Number(record.version) || 0) < 3 && [...next.unlocked, ...next.inherited].includes('condition')) {
            grantConditionEntryReward('긴급 회피', owner);
        }
    }

    /** Only save-boundary arrays pass here; drop unknown/duplicate content IDs. */
    function savedIds(raw) {
        return [...new Set((Array.isArray(raw) ? raw : []).filter(id => definitions.has(id)))];
    }

    function restoredLedger(record, owner, legacy) {
        const savedLoop = Number.isFinite(record.highestLoop) ? record.highestLoop : 1;
        const highestLoop = Math.max(1, owner.season, Math.min(1000000, Math.floor(savedLoop)));
        const inherited = legacy ? CONTENT_UNLOCK_CATALOG.filter(def => legacyAccess(def, owner)).map(def => def.id)
            : savedIds(record.inherited);
        const savedChoices = savedIds(record.unlocked);
        const grandfathered = Number(record.version) < 5 ? savedChoices : record.grandfathered;
        return { version: 7, highestLoop, legacy: legacy || record.legacy === true,
            unlocked: [], paidCosts: {}, inherited: savedIds(inherited), grandfathered: savedIds(grandfathered),
            automatic: savedIds(record.automatic).filter(id => definitions.get(id).cost === 0) };
    }

    /** Save boundary: retain paid access, grandfather free bundles, refund newly automatic content. */
    function restore(raw, owner, existingSave) {
        const record = raw && typeof raw === 'object' ? raw : {};
        const next = restoredLedger(record, owner, raw === undefined && existingSave);
        inheritFormerFreeAccess(record, next, owner);
        restorePurchases(savedIds(record.unlocked), next, record);
        if (Number(record.version) < 5 && [...next.unlocked, ...next.inherited].some(id => definitions.get(id).cost > 0)
            && ![...next.unlocked, ...next.inherited].includes('craft')) next.inherited.push('craft');
        next.grandfathered = next.grandfathered.filter(id => next.unlocked.includes(id));
        migrateConditionEntryReward(record, next, owner);
        inheritSplitGrowth(record, next);
        return next;
    }

    // Pre-split owners keep their former bundled feature without a second purchase.
    function inheritSplitGrowth(record, next) {
        if (Number(record.version) >= 7) return;
        const owned = new Set([...next.unlocked, ...next.inherited]);
        if (owned.has('gemForge') && !owned.has('engraving')) next.inherited.push('engraving');
        if (owned.has('flask') && !owned.has('flaskUtility')) next.inherited.push('flaskUtility');
    }

    return Object.freeze({ isUnlocked, canDropCurrency, canUseFlask, canOpen, balance, status, requirements, sync, purchase, restore });
})();
safeExposeGlobals({ contentProgression });
