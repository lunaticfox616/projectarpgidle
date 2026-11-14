

export function stripHtmlMessage(runtime, raw) {
    let div = runtime.deps.document.createElement('div');
    div.innerHTML = String(raw || '');
    return (div.textContent || div.innerText || '').trim();
}

export function registerCombatLogItemSnapshot(runtime, item) {
    let token = ++runtime.state.combatLogItemSequence;
    let snapshot = JSON.parse(JSON.stringify(item));
    runtime.state.combatLogItemSnapshots.set(token, snapshot);
    while (runtime.state.combatLogItemSnapshots.size > 80) {
        const expired=[...runtime.state.combatLogItemSnapshots.keys()].find(key=>
            !runtime.deps.document.querySelector(`#background-combat-result-overlay [data-log-item-token="${key}"]`));
        if (expired === undefined) break;
        runtime.state.combatLogItemSnapshots.delete(expired);
    }
    return token;
}

export function decorateCombatLogItemMessage(runtime, msg, item) {
    if (!item || typeof item !== 'object' || !item.name) return msg;
    let token = registerCombatLogItemSnapshot(runtime, item);
    let label = `[${item.name}]`;
    let link = `<span class="combat-log-item-link" role="button" tabindex="0" data-item-tooltip-anchor="1" data-log-item-token="${token}" onmouseenter="showCombatLogItemTooltip(event,${token})" onmousemove="showCombatLogItemTooltip(event,${token})" onmouseleave="hideCombatLogItemTooltip(event)" onclick="openCombatLogItemEquipment(event)" onkeydown="if(event.key==='Enter'||event.key===' '){openCombatLogItemEquipment(event)}">${(0, runtime.deps.escapeHTML)(label)}</span>`;
    return String(msg).replace(label, link);
}

export function stripCombatLogEmoji(runtime, raw) {
    return (0, runtime.deps.stripDecorativeEmoji)(raw);
}

export function getCombatLogElementFromText(message) {
    let text = String(message || '');
    if (/(화염|점화)/.test(text)) return 'fire';
    if (/(냉기|한기|동결)/.test(text)) return 'cold';
    if (/(번개|감전)/.test(text)) return 'light';
    if (/(카오스|중독|독)/.test(text)) return 'chaos';
    if (/(물리|출혈)/.test(text)) return 'phys';
    return '';
}

export function getCombatLogIconKind(message, cls, options) {
    let opts = options || {};
    if (opts.item) return 'item';
    if (['attack', 'phys', 'fire', 'cold', 'light', 'chaos'].includes(opts.logIcon)) return opts.logIcon;
    if (['phys', 'fire', 'cold', 'light', 'chaos'].includes(opts.element)) return opts.element;
    return inferCombatLogIconKind(message, cls);
}

function inferCombatLogIconKind(message, cls) {
    let text = String(message || '');
    let element = getCombatLogElementFromText(message);
    if (element && /(피격|피해|상태이상|점화|냉각|동결|감전|중독|출혈)/.test(text)) return element;
    if (cls === 'attack-player' && /(피해|타격|공격)/.test(text)) return 'attack';
    if (cls === 'attack-monster' && /피해/.test(text)) return element || 'phys';
    return '';
}

export function renderCombatLogIcon(runtime, kind, options) {
    let opts = options || {};
    if (kind === 'item') {
        let asset = typeof runtime.deps.getInventoryItemVisualAsset === 'function'
            ? (0, runtime.deps.getInventoryItemVisualAsset)(opts.item, opts.itemKind) : '';
        return asset ? `<img class="combat-log-icon combat-log-item-icon" src="${(0, runtime.deps.escapeHTML)(asset)}" alt="" aria-hidden="true">` : '';
    }
    return kind ? `<span class="combat-log-icon combat-log-icon--${kind}" aria-hidden="true"></span>` : '';
}

/** A critical hit colours only its damage number and keeps the player-hit line colour: whole grey and orange lines in turn made the log
 * busier (2026-10-06 user: "치명타는 그냥 숫자 색만 바꿔도 충분할거같은데?"). critValue is the formatted number before "피해". */
export function markCombatLogCritNumber(runtime, message, critValue) {
    let at = critValue ? message.lastIndexOf((0, runtime.deps._t)('{critValue} 피해', { critValue })) : -1;
    if (at < 0) return message;
    return `${message.slice(0, at)}<span class="combat-log-crit">${critValue}</span>${message.slice(at + critValue.length)}`;
}

export function decorateCombatLogMessage(runtime, message, cls, options) {
    let cleanMessage = stripCombatLogEmoji(runtime, message);
    let icon = renderCombatLogIcon(runtime, getCombatLogIconKind(cleanMessage, cls, options), options);
    return `${icon}${markCombatLogCritNumber(runtime, cleanMessage, options && options.critValue)}`;
}
