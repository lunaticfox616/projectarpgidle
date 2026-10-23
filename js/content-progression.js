/** Optional-content purchase rules. No DOM, storage, timers or combat mutations. */
const contentProgression = (() => {
    const definitions = new Map(CONTENT_UNLOCK_CATALOG.map(row => [row.id, row]));
    const routes = new Map(CONTENT_UNLOCK_CATALOG.flatMap(row => (row.routes || []).map(route => [route, row.id])));
    const coreRoutes = new Set(['tab-character', 'tab-char', 'tab-items', 'tab-skills', 'tab-battle', 'tab-settings', 'tab-social',
        'item-tab-equip', 'skill-tab-equip', 'map-tab-zones', 'map-explore-atlas', 'map-explore-hunting', 'map-explore-chaos',
        'map-explore-root-boss']);

    // Predicates only read normalized save state; unlocking a menu never grants world progress.
    const progressChecks = {
        tactics: owner => [['액트 3 클리어', hasCombatTacticsUnlockProgress(owner)]],
        trials: owner => [['액트 3 도달', owner.maxZoneId >= 3 || owner.completedTrials.length > 0]],
        meteor: owner => [['액트 7 도달', owner.maxZoneId >= 7]],
        deepChaos: owner => [['혼돈 20층 클리어', hasCurrentLoopChaos20Clear(owner)]],
        chaosRealm: owner => [['나무꾼에게 10% 피해 후 전투 종료', !!owner.chaosRealm.unlocked]],
        underworld: owner => [['혼돈계, 케르베로스, 심화 30층, 미궁 100층', isUnderworldUnlockReady(owner)]],
        cosmos: owner => [['나무꾼 기록과 지하계 30층 도달', isCosmosContentUnlockReady(owner)]],
        sky: owner => [['혼돈 20층 클리어', owner.skyTower.unlocked || owner.season > 15 || hasCurrentLoopChaos20Clear(owner)]],
        beyond: owner => [['경계의 관측자 처치, 그리고 루프 50 또는 세계수 씨앗 4개', isBeyondBoundaryUnlockRequirementMet(owner)]],
        cube: owner => [['지하계 10층 클리어', owner.underworldProgress.highestFloor >= 11]],
        talent: owner => [['재능 개화', hasPermanentTalentTabUnlock(owner)]],
        woodsman: owner => [['나무꾼 조우 또는 기록', !!owner.woodsmanSimulatorSeenLoop || owner.woodsmanDefeatAttempts > 0 || owner.journalEntries.includes('woodsman')]],
        stump: owner => [['액트 10 클리어', !!(owner.stumpBox && owner.stumpBox.acquired) || stumpBox.eligible(owner)]]
    };

    /** How an unlock opens: 'paid' with 해금 points in the unlock tab, 'npc' for no points in its NPC's window only (def.npc,
     * 2026-10-21 사용자: NPC 해금과 일반 해금 분리), 'auto' by itself once its conditions are met. */
    function kind(def) {
        if (def.npc) return 'npc';
        return def.cost > 0 ? 'paid' : 'auto';
    }

    /** An NPC's personal name, the last word of its STORY_NPCS name (벼림꾼 오르가 → 오르가). */
    function npcName(id) {
        return String(STORY_NPCS[id]?.name || id).split(/[\s,]+/).pop();
    }

    function requirements(id, owner = game) {
        const def = definitions.get(id);
        if (!def) return [];
        const rows = [[`루프 ${def.minLoop}`, owner.season >= def.minLoop]];
        for (const key of new Set([def.after, ...(def.requires || [])].filter(Boolean))) {
            rows.push([definitions.get(key).name + ' 해금', isUnlocked(key, owner)]);
        }
        if (def.progress) rows.push(...progressChecks[def.progress](owner));
        // Meetings are counted on the maps (js/npc-shop.js meet) and kept across loops.
        if (def.npc) rows.push([npcName(def.npc) + ' 조우', !!owner.npcMet?.[def.npc]]);
        return rows.map(([label, met]) => ({ label, met: !!met }));
    }

    function meetsUsageGate(def, owner) {
        // 해금 루프를 늦춘 콘텐츠(def.hardMinLoop, 뜨개질 2026-10-22): 저장에 남은 구매·상속·자동·레거시 기록이 있어도 그 루프 전에는 닫는다.
        // 기록은 지우지 않으므로 루프가 닿으면 그대로 다시 열린다.
        if (def.hardMinLoop && !(owner.season >= def.minLoop)) return false;
        if (def.id !== 'battleTrials') return true;
        const state = owner.contentProgression;
        return owner.season >= def.minLoop && !!state
            && (state.unlocked.includes('trials') || state.inherited.includes('trials'));
    }

    function isUnlocked(id, owner = game) {
        const def = definitions.get(id);
        if (!def || !meetsUsageGate(def, owner)) return false;
        const state = owner.contentProgression;
        if (!state) return true;
        if (state.unlocked.includes(id) || state.inherited.includes(id)) return true;
        if (kind(def) !== 'auto') return false;
        if (state.automatic.includes(id)) return true;
        return automaticAccess(def, owner);
    }

    function automaticAccess(def, owner) {
        if (owner.season < def.minLoop) return false;
        // Free bundles and ascension trials can require a matching growth purchase.
        const owned = [...owner.contentProgression.unlocked, ...owner.contentProgression.inherited];
        if (def.after && !owned.includes(def.after)) return false;
        return !def.progress || progressChecks[def.progress](owner).every(row => row[1]);
    }

    /** Natural loot only: discovery prerequisites and shared combat keys must not depend on paid growth. */
    function canDropCurrency(key, owner = game) {
        const unlocks = ORB_DB[getCanonicalCurrencyKey(key)]?.dropUnlocks;
        return !unlocks || unlocks.some(id => isUnlocked(id, owner));
    }

    /** Content-specific equipment becomes eligible only after its source content is open. */
    const canDropUnique = (unique, owner = game) => !!unique && (!unique.contentUnlock || isUnlocked(unique.contentUnlock, owner));

    function canOpenMap(owner) {
        return owner.season >= 2 || owner.maxZoneId >= 1 || owner.unlocks.map || owner.contentProgression.legacy === true;
    }

    // Menus that follow world progress instead of a catalog purchase.
    const progressRoutes = {
        'tab-map': canOpenMap,
        'tab-season': owner => owner.season >= 2,
        'tab-unlocks': owner => owner.season >= 2,
        // NPC 탭(js/npc-roster-ui.js): 맵에서 NPC를 한 번이라도 만난 뒤(만나면 unlocks.npcs가 켜지고, 단추도 그 값을 따른다).
        'tab-npcs': owner => !!(owner.unlocks && owner.unlocks.npcs) || Object.keys(owner.npcMet || {}).length > 0,
        // 세계수 탐험 창(아틀라스)은 혼돈계와 같은 경로지만, 아틀라스가 열렸으면 혼돈계 관문 전이라도 연다.
        'map-explore-worldtree': owner => !!owner.atlas?.unlocked || isUnlocked('chaosRealm', owner)
    };

    function canOpen(route, owner = game) {
        if (!owner.contentProgression || !route || coreRoutes.has(route)) return true;
        if (progressRoutes[route]) return progressRoutes[route](owner);
        const feature = routes.get(route);
        return !!feature && isUnlocked(feature, owner);
    }

    /** Unlock points earned up to a loop: loop L (2 or later) gives awards.early[L - 2], every loop after them awards.perLoop. */
    function earnedBy(loop, awards = CONTENT_UNLOCK_POINT_AWARDS) {
        const { early, perLoop } = awards, loops = Math.max(0, Math.floor(Number(loop) || 1) - 1);
        return early.slice(0, loops).reduce((sum, points) => sum + points, 0) + Math.max(0, loops - early.length) * perLoop;
    }

    // The awards before NPC unlocks split from the paid ones (2026-10-21). A save from then keeps every point that table had given
    // it by its highest loop (the ledger's carry), so loading never drops a paid unlock it bought nor a stump graft rank bought with
    // overflow points (js/stump-box.js restoreGraft).
    const AWARDS_BEFORE_NPC_SPLIT = Object.freeze({ early: Object.freeze([4, 4, 3, 3]), perLoop: 2 });
    const LEDGER_VERSION = 9;
    const carryGap = loop => Math.max(0, earnedBy(loop, AWARDS_BEFORE_NPC_SPLIT) - earnedBy(loop));
    /** Points beyond the current awards: a ledger from before version 9 is owed the whole gap at the loop it reached; a current one
     * keeps the carry fixed when it was first loaded (never more than that gap). */
    function carryOf(state, loop) {
        if (!(Number(state.version) >= LEDGER_VERSION)) return carryGap(loop);
        return Math.min(carryGap(loop), Math.max(0, Math.floor(Number(state.carry) || 0)));
    }

    /** Points earned by a loop, the points paid and what the catalog can still take (unbought paid unlocks). Only unlock-tab prices
     * count: points once paid for what is now an NPC unlock or automatic content come back. The record may still be the saved one: the
     * stump box restores its graft ranks (overflow) before mergeDefaults normalizes this ledger. */
    function ledger(state, loop) {
        const unlocked = Array.isArray(state.unlocked) ? state.unlocked : [], inherited = Array.isArray(state.inherited) ? state.inherited : [];
        const paid = def => !!def && kind(def) === 'paid';
        const remaining = CONTENT_UNLOCK_CATALOG.reduce((sum, def) =>
            sum + (paid(def) && !unlocked.includes(def.id) && !inherited.includes(def.id) ? def.cost : 0), 0);
        const spent = unlocked.reduce((sum, id) => sum + (paid(definitions.get(id)) ? Number((state.paidCosts || {})[id]) || 0 : 0), 0);
        const reached = Math.max(Number(state.highestLoop) || 1, loop);
        return { remaining, spent, earned: earnedBy(reached) + carryOf(state, reached) };
    }

    /** Read-only point budget; future gated growth counts, automatic combat never costs points. */
    function points(owner = game) {
        const state = owner.contentProgression;
        if (!state) return { balance: 0, remaining: 0, nextAward: 0, complete: true };
        const { remaining, spent, earned } = ledger(state, owner.season);
        const current = Math.min(remaining, Math.max(0, earned - spent));
        const nextEarned = ledger(state, owner.season + 1).earned;
        const nextAward = Math.min(remaining, Math.max(0, nextEarned - spent)) - current;
        return { balance: current, remaining, nextAward, complete: remaining === 0 };
    }

    /** Points past what the catalog can still take. The balance never holds them, so the stump box counts them as graft points
     * (js/stump-box.js graftEarned, 2026-10-09: once the catalog was bought, about loop 20, the 2 points a loop were lost). */
    function overflow(owner = game) {
        const state = owner.contentProgression;
        if (!state) return 0;
        const { remaining, spent, earned } = ledger(state, owner.season);
        return Math.max(0, earned - spent - remaining);
    }

    function balance(owner = game) {
        return points(owner).balance;
    }

    /** The cheapest paid unlock whose conditions are met now, or null while every remaining one waits for a loop or progress. */
    function cheapestOpen(owner = game) {
        return CONTENT_UNLOCK_CATALOG.filter(def => kind(def) === 'paid' && owner.season >= def.minLoop && !isUnlocked(def.id, owner)
            && requirements(def.id, owner).every(row => row.met))
            .reduce((best, def) => (!best || def.cost < best.cost ? def : best), null);
    }

    function status(id, owner = game) {
        const def = definitions.get(id);
        if (!def) return { available: false, reason: '알 수 없는 콘텐츠입니다.' };
        if (isUnlocked(id, owner)) return { available: false, reason: '해금 완료', unlocked: true };
        const missing = requirements(id, owner).filter(row => !row.met);
        if (missing.length) return { available: false, reason: missing[0].label + ' 필요' };
        // npc: the NPC whose window opens it (gift); the unlock tab cannot buy it.
        if (kind(def) === 'npc') return { available: true, npc: def.npc, reason: npcName(def.npc) + '에게서 받기' };
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
        const automatic = CONTENT_UNLOCK_CATALOG.filter(def => kind(def) === 'auto' && isUnlocked(def.id, owner)).map(def => def.id);
        state.automatic = [...new Set([...state.automatic, ...automatic])];
    }

    /** One-time entry rewards share the purchase transaction; load/loop changes never replay them. */
    function grantEntryReward(id, key, owner) {
        if (id === 'craft') owner.currencies[key]++;
        if (id === 'support') {
            if (hasSupportGemOwned(key, owner)) owner.currencies.gemShard += 8;
            else {
                owner.supports.push(key);
                owner.supportGemData[key] = normalizeGemRecord(null);
            }
        }
    }

    /** Synchronous check-and-spend: validate choices before mutating any state. NPC unlocks are opened by their NPC (gift) only. */
    function purchase(id, owner = game, rewardKey) {
        const def = definitions.get(id);
        if (def && kind(def) === 'npc') return { ok: false, message: npcName(def.npc) + '에게서 받는 해금입니다.' };
        const check = status(id, owner);
        if (!check.available) return { ok: false, message: check.reason };
        return takeUnlock(id, owner, rewardKey, def.cost);
    }

    /** An NPC's 즉시 해금 (js/content-progression-ui.js npcReady; 2026-10-16 사용자: 포인트 없이 공짜로): one of its NPC unlocks with
     * the first reward, for no points, once the hero has met that NPC and the loop, progress and earlier-unlock conditions are met.
     * Paid unlocks are the unlock tab's alone since 2026-10-21. paidCosts 0 keeps it free across loads. */
    function gift(id, owner = game, rewardKey) {
        const def = definitions.get(id);
        if (!def) return { ok: false, message: '알 수 없는 콘텐츠입니다.' };
        if (kind(def) !== 'npc') return { ok: false, message: '해금 탭에서 여는 해금입니다.' };
        const check = status(id, owner);
        if (!check.available) return { ok: false, message: check.reason };
        return takeUnlock(id, owner, rewardKey, 0);
    }

    function takeUnlock(id, owner, rewardKey, price) {
        const choices = definitions.get(id).rewardChoices || [];
        const key = rewardKey === undefined ? choices[0]?.key : rewardKey;
        if (choices.length && !choices.some(row => row.key === key)) return { ok: false, message: '받을 보상을 선택하세요.' };
        grantEntryReward(id, key, owner);
        owner.contentProgression.unlocked.push(id);
        owner.contentProgression.paidCosts[id] = price;
        sync(owner);
        return { ok: true, message: definitions.get(id).name + ' 해금' };
    }

    function legacyAccess(def, owner) {
        // These features did not exist in a pre-ledger save; normal progress opens them.
        if (['craftSimulator', 'knitting'].includes(def.id)) return false;
        // Saves predating the unlock ledger used act five for the market.
        if (def.id === 'market') return owner.maxZoneId >= 5;
        if ((def.routes || []).some(route => owner.unlockedMapContents.includes(route))) return true;
        if (def.id === 'journal') return owner.journalEntries.length > 0;
        if (def.gate) return !!owner.unlocks[def.gate];
        if (def.flags) return def.flags.some(flag => owner[flag]);
        return owner.season >= def.minLoop || ['support','craft','fossil','research','hall','records'].includes(def.id);
    }

    function restorePurchases(purchased, next, record) {
        const version = Number(record.version) || 0;
        let remaining = earnedBy(next.highestLoop) + next.carry;
        for (const id of purchased) {
            const def = definitions.get(id);
            if (!def || kind(def) === 'auto' || next.inherited.includes(id)) continue;
            const cost = restoredPrice(def, record);
            if (cost > remaining) continue;
            if (version >= 4 && !next.grandfathered.includes(id) && !canRestoreChoice(def, next)) continue;
            next.unlocked.push(id); next.paidCosts[id] = cost; remaining -= cost;
        }
    }

    function canRestoreChoice(def, next) {
        if (next.highestLoop < def.minLoop) return false;
        return [def.after, ...(def.requires || [])].filter(Boolean)
            .every(key => next.unlocked.includes(key) || next.inherited.includes(key));
    }

    // Save boundary: old 1P purchases are grandfathered and NPC gifts (gift, paid 0) stay free; invalid new prices use the catalog.
    // An NPC unlock takes no points: one bought before the split (2026-10-21) gets its points back.
    function restoredPrice(def, record) {
        if (kind(def) === 'npc') return 0;
        if ((Number(record.version) || 0) < 6) return 1;
        const paid = record.paidCosts?.[def.id];
        return paid === 0 || paid === 1 ? paid : def.cost;
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
        return { version: LEDGER_VERSION, highestLoop, legacy: legacy || record.legacy === true, carry: carryOf(record, highestLoop),
            unlocked: [], paidCosts: {}, inherited: savedIds(inherited), grandfathered: savedIds(grandfathered),
            automatic: savedIds(record.automatic).filter(id => kind(definitions.get(id)) === 'auto') };
    }

    /** Save boundary: retain paid access, grandfather free bundles, refund newly automatic content. */
    function restore(raw, owner, existingSave) {
        const record = raw && typeof raw === 'object' ? raw : {};
        const next = restoredLedger(record, owner, raw === undefined && existingSave);
        inheritFormerTactics(record, next, owner, existingSave);
        inheritFormerFreeAccess(record, next, owner);
        restorePurchases(savedIds(record.unlocked), next, record);
        if (Number(record.version) < 5 && [...next.unlocked, ...next.inherited].some(id => kind(definitions.get(id)) !== 'auto')
            && ![...next.unlocked, ...next.inherited].includes('craft')) next.inherited.push('craft');
        next.grandfathered = next.grandfathered.filter(id => next.unlocked.includes(id));
        inheritSplitGrowth(record, next);
        return next;
    }

    // 설정에서 쓰던 전술과 이전 유료 해금은 유지한다. 무료 전환된 구매 비용은 복원하지 않는다.
    function inheritFormerTactics(record, next, owner, existingSave) {
        if (!existingSave || next.inherited.includes('tactics')) return;
        const formerSetting = Number(record.version || 0) < 8 && owner.combatTacticsUnlocked === true;
        if (formerSetting || savedIds(record.unlocked).includes('tactics')) next.inherited.push('tactics');
    }

    // Pre-split owners keep their former bundled feature without a second purchase.
    function inheritSplitGrowth(record, next) {
        if (Number(record.version) >= 7) return;
        const owned = new Set([...next.unlocked, ...next.inherited]);
        if (owned.has('gemForge') && !owned.has('engraving')) next.inherited.push('engraving');
    }

    return Object.freeze({ kind, npcName, isUnlocked, canDropUnique, canDropCurrency, canOpen, earnedBy, points, overflow, balance, cheapestOpen, status, requirements, sync,
        purchase, gift, restore });
})();
safeExposeGlobals({ contentProgression });
