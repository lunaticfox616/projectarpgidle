import { contentEarnedBy, contentPaceCarryOf, contentCarryOf, contentPaceGap, contentOverflowOf } from './content-unlock-points.mjs';
import { contentKind, contentParents } from './content-unlock-rules.mjs';

export function contentLegacyAccess(def, owner) {
    // These features did not exist in a pre-ledger save; normal progress opens them.
    if (def.addedIn || ['craftSimulator', 'knitting'].includes(def.id)) return false;
    // Saves predating the unlock ledger used act five for the market.
    if (def.id === 'market') return owner.maxZoneId >= 5;
    if ((def.routes || []).some(route => owner.unlockedMapContents.includes(route))) return true;
    if (def.id === 'journal') return owner.journalEntries.length > 0;
    if (def.gate) return !!owner.unlocks[def.gate];
    if (def.flags) return def.flags.some(flag => owner[flag]);
    return owner.season >= def.minLoop || ['support','craft','fossil','hall','records'].includes(def.id);
}

export function contentRestorePurchases(env, purchased, next, record) {
    const version = Number(record.version) || 0, saved = new Set(purchased);
    let remaining = contentEarnedBy(env, next.highestLoop) + next.carry + contentPaceCarryOf(env, next, next.highestLoop);
    for (const id of purchased) {
        const def = env.definitions.get(id);
        if (!def || contentKind(def) === 'auto' || next.inherited.includes(id)) continue;
        const cost = contentRestoredPrice(env, def, record);
        if (cost > remaining) continue;
        if (version >= 4 && !next.grandfathered.includes(id) && !contentCanRestoreChoice(env, def, next, version, saved)) continue;
        next.unlocked.push(id); next.paidCosts[id] = cost; remaining -= cost;
    }
}

/** 장부 14: a row whose loop moved later (2026-11-06, 룬 각인 4→6 and nine more) keeps the purchases made at its earlier loop. A record from
 * before the move holding such a purchase below today's loop bought it when purchase() allowed it, so it joins the grandfathered rows and
 * every later load keeps it; restorePurchases measures the others against today's loop and dropped these (룬 각인 vanished at loops 4, 5). */
export function contentKeepEarlyPurchases(env, purchased, next, record) {
    if (Number(record.version) >= env.LOOP_MOVE_VERSION) return;
    for (const id of purchased) {
        if (next.highestLoop < env.definitions.get(id).minLoop && !next.grandfathered.includes(id)) next.grandfathered.push(id);
    }
}

/** A purchase from before the tree (version 11) stays whatever its new prerequisites are. Later ones need theirs among the saved rows,
 * in any order (a save moved over from before the tree keeps its old order). An automatic prerequisite cannot be read here (it depends on
 * the rest of the save), and a purchase needed it when it was made. */
export function contentCanRestoreChoice(env, def, next, version, saved) {
    if (next.highestLoop < def.minLoop) return false;
    if (version < env.LEDGER_VERSION) return true;
    return contentParents(def).every(key => saved.has(key) || next.inherited.includes(key) || contentKind(env.definitions.get(key)) === 'auto');
}

// Save boundary: old 1P purchases are grandfathered and rows that were free before the tree (def.since) stay free for whoever holds
// them; invalid new prices use the catalog.
export function contentRestoredPrice(env, def, record) {
    const version = Number(record.version) || 0;
    if (version < env.LEDGER_VERSION && def.since === env.LEDGER_VERSION) return 0;
    if (version < 6) return 1;
    const paid = record.paidCosts?.[def.id];
    return paid === 0 || paid === 1 ? paid : def.cost;
}

export function contentInheritFormerFreeAccess(record, next, owner) {
    if (!(Number(record.version) < 4)) return;
    const previous = new Set([...(Array.isArray(record.unlocked) ? record.unlocked : []), ...next.inherited]);
    if (record.version === 3) {
        const bundled = [['gemForge', 4]];
        for (const [id, loop] of bundled) {
            if (previous.has(id) || (previous.has('support') && next.highestLoop >= loop)) next.inherited.push(id);
        }
    }
    if (owner.season >= 10) next.inherited.push('deepTree');
    next.inherited = [...new Set(next.inherited)];
}

/** The record's purchases. 강화 steps did not exist before version 10: such a record cannot hold them (ledger reads it without them). */
export function contentSavedPurchases(env, record) {
    const ids = contentSavedIds(env, record.unlocked);
    return Number(record.version) >= env.SERIES_VERSION ? ids : ids.filter(id => !env.definitions.get(id).series);
}

/** Only save-boundary arrays pass here; drop unknown/duplicate content IDs. */
export function contentSavedIds(env, raw) {
    return [...new Set((Array.isArray(raw) ? raw : []).filter(id => env.definitions.has(id)))];
}

export function contentRestoredLedger(env, record, owner, legacy) {
    const savedLoop = Number.isFinite(record.highestLoop) ? record.highestLoop : 1;
    const highestLoop = Math.max(1, owner.season, Math.min(1000000, Math.floor(savedLoop)));
    const inherited = legacy ? env.deps.CONTENT_UNLOCK_CATALOG.filter(def => contentLegacyAccess(def, owner)).map(def => def.id)
        : contentSavedIds(env, record.inherited);
    const savedChoices = contentSavedIds(env, record.unlocked);
    const grandfathered = Number(record.version) < 5 ? savedChoices : record.grandfathered;
    return { version: env.deps.CONTENT_UNLOCK_RECORD_VERSION, highestLoop, legacy: legacy || record.legacy === true, carry: contentCarryOf(env, record, highestLoop),
        looseContent: record.looseContent === true,
        graftFloor: Number(record.version) >= env.SERIES_VERSION ? Math.max(0, Math.floor(Number(record.graftFloor) || 0)) : 0,
        paceCarry: Number(record.version) >= env.SERIES_VERSION ? Math.max(0, Math.floor(Number(record.paceCarry) || 0)) : contentPaceGap(env, highestLoop),
        unlocked: [], paidCosts: {}, inherited: contentSavedIds(env, inherited), grandfathered: contentSavedIds(env, grandfathered),
        plannedUnlockId: env.definitions.has(record.plannedUnlockId) ? record.plannedUnlockId : '',
        automatic: contentSavedIds(env, record.automatic).filter(id => contentKind(env.definitions.get(id)) === 'auto') };
}

/** Save boundary: retain paid access, grandfather free bundles, refund newly automatic content. */
export function contentRestore(env, raw, owner, existingSave) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const next = contentRestoredLedger(env, record, owner, raw === undefined && existingSave);
    contentInheritFormerTactics(env, record, next, owner, existingSave);
    contentInheritFormerFreeAccess(record, next, owner);
    const purchases = contentSavedPurchases(env, record);
    contentKeepEarlyPurchases(env, purchases, next, record);
    contentRestorePurchases(env, purchases, next, record);
    if (Number(record.version) < 5 && [...next.unlocked, ...next.inherited].some(id => contentKind(env.definitions.get(id)) !== 'auto')
        && ![...next.unlocked, ...next.inherited].includes('craft')) next.inherited.push('craft');
    next.grandfathered = next.grandfathered.filter(id => next.unlocked.includes(id));
    contentInheritSplitGrowth(record, next);
    contentInheritGrowthSeries(env, record, next, owner, existingSave);
    contentInheritTreeAccess(env, record, next, existingSave);
    contentKeepOverflowOfAddedRows(env, record, next, existingSave);
    contentInheritVoidSockets(env, record, next, existingSave);
    contentInheritPassiveTree(env, record, next, owner, existingSave);
    return next;
}

// 강화가 해금 탭으로 들어오기 전(장부 버전 10 미만)의 저장: 그때 가진 것은 값을 치르지 않고 물려받는다. 가방은 그 루프에 저절로
// 늘어 있던 쪽 수(getEquipmentInventoryPageCount의 옛 셈), 시간 인식과 전투 효율은 시간의 잔재로 올린 단계(효율은 끝이 5단계로
// 줄었다). 그리고 그 장부가 접붙이기에 넘기던 점수(overflow)를 graftFloor로 남겨, 새 목록 때문에 넘치는 몫이 줄어도 접붙이기 단계가
// 깎이지 않게 한다(js/stump-box.js restoreGraft는 이 복원보다 먼저 옛 장부로 센다).
export function contentInheritGrowthSeries(env, record, next, owner, existingSave) {
    if (Number(record.version) >= env.SERIES_VERSION || !existingSave) return;
    const offline = owner.offlineProgress || {}, level = key => Math.max(0, Math.floor(Number(offline[key]) || 0));
    const steps = { bagPage: env.deps.getEquipmentInventoryPageCount({ ...owner, contentProgression: null }) - 1,
        offlineHours: level('recognitionLevel'), offlineRate: level('efficiencyLevel') };
    for (const def of env.deps.CONTENT_UNLOCK_CATALOG) {
        if (def.series && def.rank <= (steps[def.series] || 0) && !next.inherited.includes(def.id)) next.inherited.push(def.id);
    }
    next.graftFloor = contentOverflowOf(env, record, next.highestLoop);
}

// 트리 전(장부 버전 11 미만)의 저장은 잃는 것이 없다(2026-11-02). 값이 새로 붙은 줄(def.since)은 그 루프에 닿았으면 물려받고(그때는 무료이거나 루프로 저절로
// 열렸다), 콘텐츠는 앞 해금을 따지지 않으며(looseContent), 접붙이기에 넘기던 점수는 graftFloor로 남긴다(새 비용 때문에 넘치는 몫이 줄어도 단계가 깎이지 않게).
/** A record from before rows were added (def.addedIn) keeps the overflow it read then: the new prices never take back a graft rank. */
export function contentKeepOverflowOfAddedRows(env, record, next, existingSave) {
    if (Number(record.version) >= env.deps.CONTENT_UNLOCK_RECORD_VERSION || !existingSave) return;
    next.graftFloor = Math.max(next.graftFloor, contentOverflowOf(env, record, next.highestLoop));
}

// 공허 소켓 줄(addedIn 13, 2026-11-06) 전의 저장은 스킬트리 공허 칸을 해금 없이 쓰고 있었다. 그 루프에 닿았으면 값 없이 물려받는다.
// 루프 1, 2의 저장은 찍어 둔 공허 칸만 루프가 바뀔 때까지 남는다(js/passives.js isVoidSocketHidden).
export function contentInheritVoidSockets(env, record, next, existingSave) {
    const def = env.definitions.get('voidSocket');
    if (!(Number(record.version) < def.addedIn) || !existingSave || next.highestLoop < def.minLoop) return;
    if (!next.unlocked.includes(def.id) && !next.inherited.includes(def.id)) next.inherited.push(def.id);
}

export function contentInheritPassiveTree(env, record, next, owner, existingSave) {
    const def = env.definitions.get('passiveTree');
    if (!existingSave || (Number(record.version) || 0) >= def.addedIn) return;
    if (next.unlocked.includes(def.id) || next.inherited.includes(def.id)) return;
    if (next.highestLoop >= def.minLoop || owner.passives?.length || owner.passivePoints > 0) next.inherited.push(def.id);
}

export function contentInheritTreeAccess(env, record, next, existingSave) {
    if (Number(record.version) >= env.LEDGER_VERSION || !existingSave || next.highestLoop < 2) return;
    next.looseContent = true;
    for (const def of env.deps.CONTENT_UNLOCK_CATALOG) {
        const owned = next.unlocked.includes(def.id) || next.inherited.includes(def.id);
        if (def.since === env.LEDGER_VERSION && !owned && next.highestLoop >= (def.formerLoop || def.minLoop)) next.inherited.push(def.id);
    }
    next.graftFloor = Math.max(next.graftFloor, contentOverflowOf(env, record, next.highestLoop));
}

// 설정에서 쓰던 전술과 이전 유료 해금은 유지한다. 무료 전환된 구매 비용은 복원하지 않는다.
export function contentInheritFormerTactics(env, record, next, owner, existingSave) {
    if (!existingSave || next.inherited.includes('tactics')) return;
    const formerSetting = Number(record.version || 0) < 8 && owner.combatTacticsUnlocked === true;
    if (formerSetting || contentSavedIds(env, record.unlocked).includes('tactics')) next.inherited.push('tactics');
}

// Pre-split owners keep their former bundled feature without a second purchase.
export function contentInheritSplitGrowth(record, next) {
    if (Number(record.version) >= 7) return;
    const owned = new Set([...next.unlocked, ...next.inherited]);
    if (owned.has('gemForge') && !owned.has('engraving')) next.inherited.push('engraving');
}
