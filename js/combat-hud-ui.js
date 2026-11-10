// 전투 HUD: 생명력 잔상, 스킬 칸, 게이지, 효과 아이콘, 몬스터 특성, updateCombatUI (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function setTextById(id, value) {
    setElementText(document.getElementById(id), value);
}

// Per-tick HUD writes: an identical write still dirties styles, so only real changes touch the DOM.
function setElementText(el, value) {
    if (!el) return;
    const text = value == null ? '' : String(value);
    if (el.textContent !== text) el.textContent = text;
}

function setElementAttribute(el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function updateHpDamageGhostState(state, actualPct, now, options) {
    actualPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
    if (!state || state.ghostPct === null || state.lastPct === null) {
        let initialPct = Math.max(actualPct, Math.min(100, Number((options && options.initialGhostPct) || actualPct) || actualPct));
        return { ghostPct: initialPct, lastPct: initialPct, lastAt: now, holdUntil: initialPct > actualPct + 0.05 ? now + PLAYER_HP_DAMAGE_GHOST_HOLD_MS : 0 };
    }
    let elapsedSec = Math.max(0, Math.min(0.5, (now - (state.lastAt || now)) / 1000));
    let continuousDecay = !!(options && options.continuousDecay);
    if (actualPct < state.lastPct - 0.05) {
        let isAlreadyTrailing = state.ghostPct > actualPct + 0.05;
        state.ghostPct = Math.max(state.ghostPct, state.lastPct);
        if (!continuousDecay || !isAlreadyTrailing) {
            state.holdUntil = now + PLAYER_HP_DAMAGE_GHOST_HOLD_MS;
        }
    } else if (actualPct > state.ghostPct) {
        state.ghostPct = actualPct;
    }
    if (now >= state.holdUntil && state.ghostPct > actualPct) {
        state.ghostPct = Math.max(actualPct, state.ghostPct - PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC * elapsedSec);
    }
    state.lastPct = actualPct;
    state.lastAt = now;
    return state;
}

function updatePlayerHpDamageGhost(actualPct) {
    let state = updateHpDamageGhostState({
        ghostPct: playerHpDamageGhostPct,
        lastPct: playerHpDamageGhostLastPct,
        lastAt: playerHpDamageGhostLastAt,
        holdUntil: playerHpDamageGhostHoldUntil
    }, actualPct, Date.now());
    playerHpDamageGhostPct = state.ghostPct;
    playerHpDamageGhostLastPct = state.lastPct;
    playerHpDamageGhostLastAt = state.lastAt;
    playerHpDamageGhostHoldUntil = state.holdUntil;
    return playerHpDamageGhostPct;
}

function primeEnemyHpDamageGhost(enemyId, actualPct) {
    // A settlement's monsters are never drawn: their entries stayed in the table until the next frame pruned it (2026-10-27).
    if (enemyId === null || enemyId === undefined || game.isBackgroundCalculation) return;
    let key = String(enemyId);
    if (enemyHpDamageGhostStates.has(key)) return;
    enemyHpDamageGhostStates.set(key, updateHpDamageGhostState(null, actualPct === undefined ? 100 : actualPct, Date.now()));
}

function updateEnemyHpDamageGhost(enemyId, actualPct) {
    if (enemyId === null || enemyId === undefined) return Math.max(0, Math.min(100, Number(actualPct) || 0));
    let key = String(enemyId);
    let now = Date.now();
    let state = updateHpDamageGhostState(enemyHpDamageGhostStates.get(key) || null, actualPct, now);
    if (state.ghostPct > actualPct + 0.05) {
        if (!Number.isFinite(state.snapAt) || state.snapAt <= 0) state.snapAt = now + ENEMY_HP_DAMAGE_GHOST_SNAP_MS;
        if (now >= state.snapAt) {
            state.ghostPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
            state.holdUntil = 0;
            state.snapAt = 0;
        }
    } else {
        state.snapAt = 0;
    }
    enemyHpDamageGhostStates.set(key, state);
    return state.ghostPct;
}

function pruneEnemyHpDamageGhostStates(activeEnemyIds) {
    if (!enemyHpDamageGhostStates || enemyHpDamageGhostStates.size <= 0) return;
    let activeSet = new Set((activeEnemyIds || []).map(id => String(id)));
    Array.from(enemyHpDamageGhostStates.keys()).forEach(key => {
        if (!activeSet.has(key)) enemyHpDamageGhostStates.delete(key);
    });
}

function shouldUseCommaSetting(settingKey) {
    return !(game && game.settings && game.settings[settingKey] === false);
}

function formatCommaNumber(value, options = {}) {
    let amount = Number(value) || 0;
    if (options.decimals !== undefined) return amount.toFixed(options.decimals);
    return Math.floor(amount).toLocaleString(i18n.locale);
}

function formatSettingNumber(value, settingKey, options = {}) {
    if (!shouldUseCommaSetting(settingKey)) {
        if (options.decimals !== undefined) return (Number(value) || 0).toFixed(options.decimals);
        return String(Math.floor(Number(value) || 0));
    }
    return formatCommaNumber(value, options);
}

function formatCappedResistanceValue(appliedValue, uncappedValue) {
    let applied = Math.floor(Number(appliedValue) || 0);
    let uncapped = Number.isFinite(Number(uncappedValue)) ? Math.floor(Number(uncappedValue)) : applied;
    return applied === uncapped ? `${applied}` : `${applied} (${uncapped})`;
}

function getCombatSkillHudEntries() {
    let summons = (Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : []).filter(name => {
        let def = SKILL_DB[name];
        return def && Array.isArray(def.tags) && def.tags.includes('summon_attack');
    });
    let gems = [game.activeSkill || '기본 공격']
        .concat(summons)
        .filter((name, index, list) => name && list.indexOf(name) === index)
        .slice(0, 4)
        .map((name, index) => ({ kind: index === 0 ? 'primary' : 'summon', name }));
    let mobility = SKILL_DB[game.mobilitySkill] ? [{ kind: 'mobility', name: game.mobilitySkill, hotkey: getHotkeyLabel('combat:mobility') }] : [];
    return gems.slice(0, 1).concat(mobility, gems.slice(1)).slice(0, COMBAT_SKILL_HUD_LIMIT);
}

/** Short key name of a PC hotkey action for HUD key caps ('' when unbound). */
function getHotkeyLabel(actionId) {
    return hotkeyBindings.label(hotkeyBindings.codeFor(game.settings.hotkeyOverrides, actionId));
}

function renderCombatSkillSlot(entry) {
    let name = escapeHTML(_t(entry.name));
    let art = renderSkillGemArt(entry.name, 'combat-skill-gem-art', { eager: true });
    let cooldown = entry.kind === 'mobility' ? '<span class="player-hud-skill-cooldown" aria-hidden="true" hidden></span>' : '';
    // 이동 스킬 칸은 누르거나 단축키(기본 E)로 쓴다: 키 표시는 자동 이동 단추와 같다.
    let key = entry.hotkey ? escapeHTML(entry.hotkey) : '';
    let keyAttrs = key ? ` aria-keyshortcuts="${key}"` : '';
    let keyCap = key ? `<i class="combat-hud-key" aria-hidden="true">${key}</i>` : '';
    return `<button type="button" class="player-hud-skill-slot ${entry.kind}" data-gem-name="${name}" data-slot-kind="${entry.kind}"${keyAttrs} data-info-tooltip-anchor="1" aria-label="${COMBAT_SKILL_SLOT_LABELS[entry.kind]}, ${name}">${art}${cooldown}${keyCap}</button>`;
}

function bindCombatSkillSlot(button) {
    let name = button.dataset.gemName;
    // 올려 두면 뜨는 설명은 마우스만: 터치는 떼도 mouseleave가 없어 이동 스킬을 누를 때마다 설명이 전장을 덮은 채 남았다.
    let show = event => { if (event.pointerType === 'mouse') showGemTooltip(event, 'active', name); };
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointermove', show);
    button.addEventListener('pointerleave', hideInfoTooltip);
    button.addEventListener('click', () => {
        if (button.dataset.slotKind === 'mobility') { hotkeysUi.useMobility(button); return; }
        openTabPane('tab-skills');
    });
}

function getCombatSkillCooldownSpan(name, readyAt, remaining) {
    let known = combatSkillCooldownSpans.get(name);
    if (!known || known.readyAt !== readyAt) {
        known = { readyAt, totalMs: Math.max(1, remaining) };
        combatSkillCooldownSpans.set(name, known);
    }
    return known.totalMs;
}

function paintCombatSkillCooldown(button, readyAt, now, justCast) {
    let name = button.dataset.gemName;
    let remaining = Math.max(0, readyAt - now);
    let badge = button.querySelector('.player-hud-skill-cooldown');
    let seconds = remaining > 0 ? String(Math.ceil(remaining / 1000)) : '';
    button.style.setProperty('--cooldown', remaining > 0 ? (remaining / getCombatSkillCooldownSpan(name, readyAt, remaining)).toFixed(3) : '0');
    button.classList.toggle('cooling', remaining > 0);
    button.classList.toggle('just-cast', justCast);
    if (badge.textContent !== seconds) badge.textContent = seconds;
    badge.hidden = !seconds;
}

function refreshCombatSkillCooldowns(host) {
    let now = getCombatTime();
    host.querySelectorAll('.player-hud-skill-slot.mobility').forEach(button => paintCombatSkillCooldown(button, now + mobilitySkill.cooldownLeft(now), now, false));
}

function renderCombatSkillHud() {
    let host = document.getElementById('ui-combat-skill-gems');
    if (!host) return;
    let entries = getCombatSkillHudEntries();
    let signature = entries.map(entry => `${entry.kind}:${entry.name}:${entry.hotkey || ''}`).join('|');
    if (host.dataset.signature !== signature) {
        entries.forEach(entry => {
            const spec = SKILL_SIGNATURE_SPRITES[SKILL_GEM_VFX_PROFILES[entry.name]?.signature];
            if (spec) getSkillGemVfxImage(spec.asset);
        });
        host.dataset.signature = signature;
        host.dataset.slotCount = String(entries.length);
        host.innerHTML = entries.map(renderCombatSkillSlot).join('');
        host.querySelectorAll('.player-hud-skill-slot').forEach(bindCombatSkillSlot);
    }
    refreshCombatSkillCooldowns(host);
}

function setUiImageGaugePercent(element, percent) {
    if (!element) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    // 같은 값은 다시 쓰지 않는다: 같은 값이라도 인라인 스타일을 쓰면 다음 프레임에 스타일 계산이 다시 돈다.
    if (element.__gaugePercent === safePercent) return;
    element.__gaugePercent = safePercent;
    element.style.width = '100%';
    element.style.setProperty('--gauge-fill', `${safePercent}%`);
    if (element.parentElement && element.parentElement.style) {
        element.parentElement.style.setProperty('--gauge-fill', `${safePercent}%`);
    }
}

function syncMapProgressRow(zone) {
    const row = document.getElementById('ui-map-progress-row');
    const speaks = !!zone && (MAP_PROGRESS_SPEAKING_TYPES.includes(zone.type) || (zone.type === 'outsideChaos' && !!game.woodsmanEntrancePending));
    if (row) row.toggleAttribute('hidden', !!zone && (zone.type === 'act' || !!zone.exploration) && !speaks);
}

function setCombatProgressGaugePercent(percent) {
    let bar = document.getElementById('ui-move-bar');
    if (!bar) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    bar.style.width = `${safePercent}%`;
    if (bar.parentElement && bar.parentElement.style) {
        bar.parentElement.style.setProperty('--progress-fill', `${safePercent}%`);
    }
}

function getUiCombatEffectPresentation(key) {
    return UI_COMBAT_EFFECT_PRESENTATION[key] || { sprite: 48, label: String(key || '알 수 없는 효과'), color: '#d8d8d8' };
}

function renderCombatEffectIcon(options) {
    let visual = getUiCombatEffectPresentation(options.key);
    let label = options.label || visual.label;
    let safeKey = String(options.key || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
    let sprite = Math.max(0, Math.min(48, Math.floor(Number(visual.sprite) || 0)));
    let spriteX = ((sprite % 7) / 6 * 100).toFixed(4);
    let spriteY = (Math.floor(sprite / 7) / 6 * 100).toFixed(4);
    let tooltip = options.tooltip || '';
    let tooltipAttrs = tooltip
        ? ` data-info-tooltip-anchor="1" onmouseenter="${tooltip}" onmousemove="${tooltip}" onmouseleave="hideInfoTooltip()"`
        : '';
    let remainingSec = Math.max(0, Number(options.remainingSec) || 0);
    let durationSec = Math.max(0, Number(options.durationSec) || 0);
    let timedClass = remainingSec > 0 ? ' timed' : '';
    let remainingAngle = durationSec > 0 ? Math.max(0, Math.min(360, remainingSec / durationSec * 360)) : 360;
    let time = remainingSec > 0 ? `<span class="combat-effect-time">${remainingSec >= 100 ? '99+' : Math.ceil(remainingSec)}</span>` : '';
    let badge = options.badge ? `<span class="combat-effect-badge">${escapeHTML(options.badge)}</span>` : '';
    return `<span class="combat-effect-icon effect-${safeKey}${timedClass}" role="img" aria-label="${escapeHTML(label)}" style="--effect-color:${visual.color};--effect-sprite-x:${spriteX}%;--effect-sprite-y:${spriteY}%;--effect-remaining-angle:${remainingAngle.toFixed(2)}deg;"${tooltipAttrs}><span class="combat-effect-art" aria-hidden="true"></span>${time}${badge}</span>`;
}

function getUiRuntimeEffectDetail(type, value, maxValue) {
    let formatter = UI_RUNTIME_EFFECT_DETAILS[type];
    return formatter ? formatter(value, maxValue) : '효과가 적용 중입니다.';
}

function getUiExperienceProgress(level, experience) {
    let required = Math.max(1, Number(getExpReq(level)) || 1);
    let current = Math.max(0, Number(experience) || 0);
    return {
        current,
        required,
        remaining: Math.max(0, Math.floor(required - current)),
        percent: Math.max(0, Math.min(100, current / required * 100))
    };
}

function getUiEffectRemainingSeconds(expiresAt, now) {
    return Math.ceil(Math.max(0, (Number(expiresAt || 0) - now) / 1000));
}

function renderUiRuntimeEffectIcon(options, now) {
    let keyArg = escapeHTML(JSON.stringify(String(options.key || '')));
    let value = Number(options.value || 0);
    let maxValue = Number(options.maxValue || 0);
    let remain = Number.isFinite(options.remainSec)
        ? Math.max(0, Math.ceil(options.remainSec))
        : getUiEffectRemainingSeconds(options.expiresAt, now);
    let tooltip = `showPlayerRuntimeEffectTooltip(event,${keyArg},${value},${maxValue},${remain})`;
    return renderCombatEffectIcon({ key: options.key, label: options.label, tooltip, badge: options.badge || '', remainingSec: remain, durationSec: options.durationSec });
}

function renderUiNamedEffectIcon(options, now) {
    let keyArg = escapeHTML(JSON.stringify(String(options.key || '')));
    let nameArg = escapeHTML(JSON.stringify(String(options.name || '')));
    let detailArg = escapeHTML(JSON.stringify(String(options.detail || '')));
    let remain = Number.isFinite(options.remainSec)
        ? Math.max(0, Math.ceil(options.remainSec))
        : getUiEffectRemainingSeconds(options.expiresAt, now);
    let tooltip = `showPlayerNamedEffectTooltip(event,${keyArg},${nameArg},${detailArg},${remain})`;
    return renderCombatEffectIcon({ key: options.key, label: options.name, tooltip, badge: options.badge || '', remainingSec: remain, durationSec: options.durationSec });
}

function getUiRecoveryEffectSummary(instances, target) {
    let active = (Array.isArray(instances) ? instances : []).filter(row => {
        if (!row || Number(row.remaining) <= 0 || Number(row.rate) <= 0) return false;
        return !target || (row.target === 'energyShield' ? 'energyShield' : 'life') === target;
    });
    if (active.length === 0) return null;
    return active.reduce((summary, row) => {
        let remaining = Math.max(0, Number(row.remaining) || 0);
        let rate = Math.max(0, Number(row.rate) || 0);
        summary.remaining += remaining;
        summary.rate += rate;
        summary.remainSec = Math.max(summary.remainSec, rate > 0 ? remaining / rate : 0);
        return summary;
    }, { remaining: 0, rate: 0, remainSec: 0 });
}

function getUiEliteTraitBuffDetail(trait) {
    let source = trait && typeof trait === 'object' ? trait : {};
    let parts = [];
    if (Number(source.atkMul) > 1) parts.push(`피해 +${Math.round((source.atkMul - 1) * 100)}%`);
    if (Number(source.attackSpeedVarMul) > 1) parts.push(`공격 속도 +${Math.round((source.attackSpeedVarMul - 1) * 100)}%`);
    if (Number(source.hpMul) > 1) parts.push(`최대 생명력 +${Math.round((source.hpMul - 1) * 100)}%`);
    if (Number(source.critChanceBonus)) parts.push(`치명타 확률 +${Number(source.critChanceBonus)}%p`);
    if (Number(source.dr)) parts.push(`피해 감소 +${Number(source.dr)}%`);
    let resistance = ['resF', 'resC', 'resL', 'resChaos'].reduce((sum, stat) => sum + Math.max(0, Number(source[stat]) || 0), 0);
    if (resistance > 0) parts.push(`저항 보너스 합계 +${resistance}%`);
    if (Number(source.hitRateGuard)) parts.push(`회피 +${Math.round(Number(source.hitRateGuard) * 100)}%`);
    return parts.join(', ') || '훔친 정예 특성이 적용됩니다.';
}

function buildPlayerAilmentEffectIcons() {
    return (game.playerAilments || []).filter(ail => ail && (ail.time || 0) > 0).map(ail => {
        let remain = Math.ceil(Math.max(0, ail.time || 0));
        let type = String(ail.type || 'unknown');
        let typeArg = escapeHTML(JSON.stringify(type));
        let visual = getUiCombatEffectPresentation(type);
        let stacks = Math.max(1, Math.floor(ail.stacks || 1));
        let tooltip = `showPlayerAilmentTooltip(event,${typeArg},${remain},${Number(ail.power || 0.1).toFixed(3)},${Math.floor(getUiStoredAilmentHitDamage(ail))})`;
        return renderCombatEffectIcon({ key: type, label: visual.label, tooltip, badge: stacks > 1 ? `${stacks}` : '', remainingSec: remain, durationSec: ail.duration });
    }).join('');
}

/** Icon title of a condition effect: the talisman line's gem name (or its kind), or 함성 공명 for the belt. */
function getConditionEffectTitle(name) {
    const id = String(name || '').replace(/^talisman:/, '');
    if (id === 'resonance') return '함성 공명';
    const def = talismans.conditionDef(id);
    return def ? (def.name || { guard: '수호', warcry: '함성', curse: '저주' }[def.kind]) : String(name || '');
}

function buildPlayerConditionEffectIcons(now) {
    let icons = [];
    if (game.woodsmanCurseActive) {
        let taken = Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) * 0.01;
        let tooltip = `showPlayerRuntimeEffectTooltip(event,'woodsmanCurse',${taken.toFixed(2)},0,0)`;
        icons.push(renderCombatEffectIcon({ key: 'woodsmanCurse', tooltip }));
    }
    talismanCombat.active().forEach(({ buff }) => {
        let nameArg = escapeHTML(JSON.stringify(String(buff.name || '')));
        let typeArg = escapeHTML(JSON.stringify(String(buff.type || 'buff')));
        let key = ['guard', 'warcry'].includes(buff.type) ? buff.type : 'buff';
        icons.push(renderCombatEffectIcon({ key, label: getConditionEffectTitle(buff.name), tooltip: `showPlayerBuffTooltip(event,${nameArg},${typeArg},0)` }));
    });
    (game.cosmosPlayerDebuffs || []).filter(row => row && (row.expiresAt || 0) > now).forEach(row => {
        let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1000));
        let type = String(row.type || 'unknown');
        let typeArg = escapeHTML(JSON.stringify(type));
        let labelArg = escapeHTML(JSON.stringify(String(row.label || '')));
        let tooltip = `showPlayerCosmosDebuffTooltip(event,${typeArg},${Number(row.value || 0).toFixed(2)},${remain},${labelArg})`;
        icons.push(renderCombatEffectIcon({ key: type, label: row.label, tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1000 }));
    });
    return icons.join('');
}

function buildPlayerUniqueEffectIcons(pStats, now) {
    let icons = [];
    let talentRuntime = game.talentCardRuntime;
    if (talentRuntime && Number(talentRuntime.stoneShieldAmount) > 0 && Number(talentRuntime.stoneShieldExpiresAt) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'stoneShield', value: talentRuntime.stoneShieldAmount, maxValue: talentRuntime.stoneShieldMax, expiresAt: talentRuntime.stoneShieldExpiresAt }, now));
    }
    let guard = game.playerUniqueGuard;
    if (guard && Number(guard.amount) > 0 && Number(guard.expiresAt) > now) {
        let hpPct = Number((pStats.uniqueDragonVeinGuard || {}).hpPct || 8);
        let maximum = Math.max(Number(guard.amount) || 0, Math.floor(Number(pStats.maxHp || 0) * hpPct / 100));
        icons.push(renderUiRuntimeEffectIcon({ key: 'playerUniqueGuard', value: guard.amount, maxValue: maximum, expiresAt: guard.expiresAt }, now));
    }
    let stealth = pStats.uniqueDeflectStealth;
    if (stealth && Number(game.shadowStealthExpiresAt) > now) {
        let detail = _t('이동 속도 +{move}%, 회피 +{evasionPct}%, 치명타 피해 +{critDmg}%', { move: Number(stealth.move || 20), evasionPct: Number(stealth.evasionPct || 20), critDmg: Number(stealth.critDmg || 20) });
        icons.push(renderUiNamedEffectIcon({ key: 'shadowStealth', name: '그림자 은신', detail, expiresAt: game.shadowStealthExpiresAt }, now));
    }
    let leech = pStats.uniqueLeechEfficiencyOnKill;
    if (leech && Number(game.uniqueLeechEfficiencyUntil) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'leechEfficiency', value: leech.efficiencyPct, expiresAt: game.uniqueLeechEfficiencyUntil }, now));
    }
    let armorAmp = pStats.uniqueMeleeArmorAmp;
    let armorStacks = Math.max(0, Math.floor(Number(game.uniqueMeleeArmorAmpStacks) || 0));
    if (armorAmp && armorStacks > 0 && Number(game.uniqueMeleeArmorAmpExpiresAt) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'meleeArmorAmp', value: armorStacks, maxValue: armorAmp.ampPct, expiresAt: game.uniqueMeleeArmorAmpExpiresAt, badge: `${armorStacks}` }, now));
    }
    let moveState = game.uniqueKillMoveStacksState;
    if (pStats.uniqueKillMoveStacks && moveState && Number(moveState.stacks) > 0 && Number(moveState.expiresAt) > now) {
        let stacks = Math.floor(moveState.stacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'killMoveStacks', value: stacks, maxValue: pStats.uniqueKillMoveStacks.movePerStack, expiresAt: moveState.expiresAt, badge: `${stacks}` }, now));
    }
    if (pStats.uniqueRiderCompass && Number(game.lastMoveEndedAt) > 0 && !game.uniqueRiderCompassConsumed) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'riderCompassReady' }, now));
    }
    icons.push(renderIncidentBreathIcon(now));
    let elite = game.uniqueEliteTraitBuff;
    if (elite && Number(elite.expiresAt) > now) {
        icons.push(renderUiNamedEffectIcon({ key: 'eliteTraitBuff', name: (elite.trait || {}).name || '무한한 허기', detail: getUiEliteTraitBuffDetail(elite.trait), expiresAt: elite.expiresAt }, now));
    }
    return icons.join('');
}

/** 세계수의 숨결(js/combat-incidents.js breathe)이 깃든 동안의 전투 효과 아이콘, 아니면 ''. */
function renderIncidentBreathIcon(now) {
    const breath = game.incidentBreath, kind = Number(breath && breath.until) > now ? combatIncidents.breathKind(breath) : null;
    return kind ? renderUiNamedEffectIcon({ key: 'incidentBreath', name: kind.name, detail: kind.text, expiresAt: breath.until, durationSec: ACT_EXPLORATION_INCIDENTS.breath.seconds }, now) : '';
}

function getUiLeechEffectDetail(summary, pStats, target) {
    let resource = target === 'energyShield' ? '보호막' : '생명력';
    let remaining = Math.floor(summary.remaining || 0);
    let rate = Math.floor(summary.rate || 0);
    if (typeof getLeechCaps !== 'function') return _t('남은 {resource} 회복 {remaining}, 초당 {rate}', { resource, remaining, rate });
    let caps = getLeechCaps(pStats, target);
    return _t('남은 {resource} 회복 {remaining} / 저장 한도 {floor}, 현재 초당 {rate}, 개별 초당 상한 {floor2}', { resource, remaining, floor: Math.floor(caps.totalCap), rate, floor2: Math.floor(caps.rateCap) });
}

function buildPlayerRecoveryEffectIcons(pStats) {
    let icons = [];
    let lifeLeech = getUiRecoveryEffectSummary(game.playerLeechInstances, 'life');
    let esLeech = getUiRecoveryEffectSummary(game.playerLeechInstances, 'energyShield');
    let recoup = getUiRecoveryEffectSummary(game.playerRecoupInstances);
    if (lifeLeech) icons.push(renderUiNamedEffectIcon({ key:'lifeLeech', name:'생명력 흡혈', detail:getUiLeechEffectDetail(lifeLeech, pStats, 'life'), remainSec:lifeLeech.remainSec }, 0));
    if (esLeech) icons.push(renderUiNamedEffectIcon({ key:'energyShieldLeech', name:'에너지 보호막 흡혈', detail:getUiLeechEffectDetail(esLeech, pStats, 'energyShield'), remainSec:esLeech.remainSec }, 0));
    if (recoup) icons.push(renderUiRuntimeEffectIcon({ key: 'lifeRecoup', value: recoup.remaining, maxValue: recoup.rate, remainSec: recoup.remainSec }, 0));
    if (Number(game.delayedGuardHealPool) >= 1) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'delayedGuardHeal', value: game.delayedGuardHealPool }, 0));
    }
    return icons.join('');
}

function buildPlayerAscendStackEffectIcons(now) {
    let icons = [];
    let owns = id => typeof hasKeystone === 'function' && hasKeystone(id);
    if (owns('w2')) {
        let crit = Number(game.warriorRhythmExpiresAt) > now ? Math.min(5, Math.floor(game.warriorRhythmStacks || 0)) : 0;
        let chain = Number(game.warriorRhythmDoubleExpiresAt) > now ? Math.min(5, Math.floor(game.warriorRhythmDoubleStacks || 0)) : 0;
        if (crit + chain > 0) {
            let expiresAt = Math.max(Number(game.warriorRhythmExpiresAt) || 0, Number(game.warriorRhythmDoubleExpiresAt) || 0);
            icons.push(renderUiRuntimeEffectIcon({ key: 'warriorRhythm', value: crit, maxValue: chain, expiresAt, badge: `${crit + chain}` }, now));
        }
    }
    if (owns('g2') && Number(game.gladiatorFlurryExpiresAt) > now) {
        let stacks = Math.min(12, Math.floor(game.gladiatorFlurryStacks || 0));
        if (stacks > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'gladiatorFlurry', value: stacks, expiresAt: game.gladiatorFlurryExpiresAt, badge: `${stacks}` }, now));
    }
    if (owns('g3') && Number(game.gladiatorVeteranCritBonus) > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'gladiatorVeteran', value: game.gladiatorVeteranCritBonus, badge: `${Math.floor(game.gladiatorVeteranCritBonus)}` }, now));
    }
    if (owns('e8') && Number(game.elementalistOverloadStacks) > 0) {
        let stacks = Math.floor(game.elementalistOverloadStacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'elementalistOverload', value: stacks, badge: `${stacks}` }, now));
    }
    if (owns('gd6') && Number(game.guardianEnduranceExpiresAt) > now) {
        let stacks = Math.min(5, Math.floor(game.guardianEnduranceStacks || 0));
        if (stacks > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'guardianEndurance', value: stacks, expiresAt: game.guardianEnduranceExpiresAt, badge: `${stacks}` }, now));
    }
    return icons.join('');
}

function buildPlayerAscendReadyEffectIcons(now) {
    let icons = [];
    let owns = id => typeof hasKeystone === 'function' && hasKeystone(id);
    if (owns('g5') && (game.gladiatorSwiftOpeningReady || game.gladiatorSwiftGuardReady)) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'gladiatorSwift', value: game.gladiatorSwiftOpeningReady ? 1 : 0, maxValue: game.gladiatorSwiftGuardReady ? 1 : 0 }, now));
    }
    if (owns('a2') && game.assassinBlurred) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'assassinBlurred' }, now));
    }
    if (owns('ct4') && game.catalystEvadeBoostReady) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'catalystEvade' }, now));
    }
    if (owns('cr8') && Number(game.crusaderLightningAegisUntil) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'crusaderLightningAegis', expiresAt: game.crusaderLightningAegisUntil }, now));
    }
    return icons.join('');
}

function buildPlayerTalentAndSummonEffectIcons(now) {
    let icons = [];
    let talent = game.talentRuntime && typeof game.talentRuntime === 'object' ? game.talentRuntime : {};
    let talentActive = id => typeof isTalentCardActive !== 'function' || isTalentCardActive(id);
    let fletcherCount = Math.max(0, Math.min(3, Math.floor(talent.fletcherCount || 0)));
    if (talentActive('hero1__gladiator') && fletcherCount > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'fletcherCharge', value: fletcherCount, badge: `${fletcherCount}` }, now));
    }
    if (talentActive('hero2__gladiator') && talent.colosseumReady) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'colosseumReady' }, now));
    } else if (talentActive('hero2__gladiator') && Number(talent.colosseumKills) > 0) {
        let kills = Math.min(4, Math.floor(talent.colosseumKills));
        icons.push(renderUiRuntimeEffectIcon({ key: 'colosseumCharge', value: kills, badge: `${kills}` }, now));
    }
    if (Number(game.bloomTrialRegenSuppress) > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'bloomRegenSuppress', value: game.bloomTrialRegenSuppress * 100 }, now));
    }
    let bees = (Array.isArray(game.queenBees) ? game.queenBees : [])
        .filter(bee => bee && Number(bee.expiresAt) > now && Number(bee.attacksLeft) > 0);
    if (bees.length > 0) {
        let attacksLeft = bees.reduce((sum, bee) => sum + Math.floor(bee.attacksLeft), 0);
        let expiresAt = Math.max(...bees.map(bee => Number(bee.expiresAt) || 0));
        icons.push(renderUiRuntimeEffectIcon({ key: 'queenBeeSwarm', value: bees.length, maxValue: attacksLeft, expiresAt, badge: `${bees.length}` }, now));
    }
    if (Number(game.summonDeathDamageBuffExpiresAt) > now && Number(game.summonDeathDamageBuffPct) > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'summonDeathDamageBuff', value: game.summonDeathDamageBuffPct, expiresAt: game.summonDeathDamageBuffExpiresAt }, now));
    }
    if (Number(game.summonCritAspdExpiresAt) > now && Number(game.summonCritAspdStacks) > 0) {
        let stacks = Math.floor(game.summonCritAspdStacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'summonCritAspd', value: stacks, maxValue: game.summonCritAspdPerStack, expiresAt: game.summonCritAspdExpiresAt, badge: `${stacks}` }, now));
    }
    return icons.join('');
}

function buildPlayerRealmEffectIcons(pStats, now) {
    let icons = [];
    if (pStats.uniqueDeathWard && game.realmDeathWard && Number(game.realmDeathWard.amount) > 0) {
        let amount = Math.max(0, Math.floor(Number(game.realmDeathWard.amount) || 0));
        let maximum = Math.max(amount, Math.floor(Number(game.realmDeathWard.maxAmount) || 0));
        icons.push(renderCombatEffectIcon({ key: 'deathWard', tooltip: `showPlayerRuntimeEffectTooltip(event,'deathWard',${amount},${maximum},0)` }));
    }
    if ((game.realmInvulnerableBarrierUntil || 0) > now) {
        let remain = Math.ceil((game.realmInvulnerableBarrierUntil - now) / 1000);
        icons.push(renderCombatEffectIcon({ key: 'invulnerableBarrier', tooltip: `showPlayerRuntimeEffectTooltip(event,'invulnerableBarrier',0,0,${remain})`, remainingSec: remain, durationSec: 1.5 }));
    }
    if (typeof hasKeystone === 'function' && hasKeystone('w5')) {
        let stacks = typeof getWarriorRageStacks === 'function' ? getWarriorRageStacks(now) : 0;
        if (stacks > 0) {
            let remain = Math.ceil(Math.max(0, (game.warriorRageExpiresAt - now) / 1000));
            icons.push(renderCombatEffectIcon({ key: 'warriorRage', tooltip: `showPlayerRuntimeEffectTooltip(event,'warriorRage',${stacks},5,${remain})`, badge: `${stacks}`, remainingSec: remain, durationSec: 5 }));
        }
    }
    return icons.join('');
}

function buildPlayerCombatEffectIcons(pStats, now) {
    return buildPlayerAilmentEffectIcons()
        + buildPlayerConditionEffectIcons(now)
        + buildPlayerUniqueEffectIcons(pStats, now)
        + buildPlayerRecoveryEffectIcons(pStats)
        + buildPlayerAscendStackEffectIcons(now)
        + buildPlayerAscendReadyEffectIcons(now)
        + buildPlayerTalentAndSummonEffectIcons(now)
        + buildPlayerRealmEffectIcons(pStats, now);
}

/** An effect icon strip's new markup. Its timer rings turn every tick (--effect-remaining-angle), and rebuilding the strip for that
 * removed and re-added its elements ten times a second, so the page re-checked every body:has() rule each time (2026-10-07 frame
 * drops: the costliest style passes of the endgame). While the icons keep their shape, only the changed attributes and texts move. */
function patchCombatEffectStrip(host, markup) {
    if (!host || host.__lastHtml === markup) return;
    host.__lastHtml = markup;
    const parsed = document.createElement('template');
    parsed.innerHTML = markup;
    if (!parsed.content || !host.children) { host.innerHTML = markup; return; } // no template parsing here (script tests' stand-in DOM)
    const fresh = [...parsed.content.children], live = [...host.children];
    if (fresh.length === live.length && fresh.every((node, index) => sameEffectShape(node, live[index]))) {
        fresh.forEach((node, index) => syncEffectNode(live[index], node));
    } else host.innerHTML = markup;
}

/** Same tags and classes all the way down (a new icon, a timer appearing, or a badge coming means a rebuild). */
function sameEffectShape(fresh, live) {
    const pairs = [[fresh, live]];
    while (pairs.length) {
        const [a, b] = pairs.pop();
        if (a.tagName !== b.tagName || a.className !== b.className || a.children.length !== b.children.length) return false;
        for (let index = 0; index < a.children.length; index++) pairs.push([a.children[index], b.children[index]]);
    }
    return true;
}

function syncEffectNode(live, fresh) {
    const pairs = [[live, fresh]];
    while (pairs.length) {
        const [to, from] = pairs.pop();
        for (const { name, value } of from.attributes) if (to.getAttribute(name) !== value) to.setAttribute(name, value);
        if (from.children.length) for (let index = 0; index < from.children.length; index++) pairs.push([to.children[index], from.children[index]]);
        else if (to.textContent !== from.textContent) to.textContent = from.textContent;
    }
}

function updatePlayerCombatEffectHud(pStats, hpAilBar) {
    let markup = buildPlayerCombatEffectIcons(pStats, getCombatTime());
    patchCombatEffectStrip(document.getElementById('ui-player-ailments-under'), markup);
    let projectedDamage = (game.playerAilments || []).reduce((sum, ail) => {
        if (!ail || (ail.time || 0) <= 0 || !isUiDamageAilmentType(ail.type)) return sum;
        return sum + Math.floor(getUiPlayerDamageAilmentDps(ail, pStats) * Math.max(0, ail.time || 0));
    }, 0);
    let playerHpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let pendingPct = Math.max(0, Math.min(playerHpPct, projectedDamage / Math.max(1, pStats.maxHp) * 100));
    if (!hpAilBar) return;
    hpAilBar.style.width = `${pendingPct}%`;
    hpAilBar.style.left = 'auto';
    hpAilBar.style.right = `${Math.max(0, 100 - playerHpPct)}%`;
    hpAilBar.style.display = pendingPct > 0.05 ? 'block' : 'none';
}

function getUiEnemyTraitLabels(tags) {
    return (Array.isArray(tags) ? tags : []).filter(tag => {
        let label = String(tag || '').trim();
        return label && label !== '보스' && label !== '정예';
    });
}

function getUiEnemyTraitDisplayText(tags) {
    let labels = getUiEnemyTraitLabels(tags);
    let fullText = labels.join(', ');
    let compactLabels = labels.map(label => String(label)
        .replace(/^패턴:\s*/, '')
        .replace(/^다음:\s*/, '다음 ')
        .split(/\s+[—–]\s+/)[0]
        .replace(/\s+전개$/, ''));
    let compactText = compactLabels.join(', ');
    if (compactText.length > 25) {
        compactText = compactLabels.map(label => label.length > 7 ? `${label.slice(0, 6)}…` : label).join(', ');
    }
    return { fullText, compactText };
}

function clearUiEnemyTraitRotation(traitEl) {
    if (!traitEl || traitEl.__traitRotationTimer == null) return;
    clearInterval(traitEl.__traitRotationTimer);
    traitEl.__traitRotationTimer = null;
}

/** Trait text with its keywords and numbers in the item tone colours (2026-10-06: the line was one colour). One wrapping span:
 * the ticker track is a flex box, and spaces between coloured pieces would be dropped as separate flex items. */
function setUiEnemyTraitText(target, text) {
    target.innerHTML = `<span class="enemy-trait-text">${statToneText.html(text)}</span>`;
}

function scheduleUiEnemyTraitOverflow(traitEl, track, content, signature) {
    setUiEnemyTraitText(track, content);
    traitEl.__traitOverflowPending = true;
    if (typeof document !== 'undefined' && document.hidden) return;
    let generation = Math.max(0, Math.floor(traitEl.__traitOverflowGeneration || 0)) + 1;
    traitEl.__traitOverflowGeneration = generation;
    let measure = () => {
        if (!traitEl.isConnected || traitEl.__traitOverflowGeneration !== generation || traitEl.__traitSignature !== signature) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        setUiEnemyTraitText(track, content);
        let panelWidth = Math.max(0, traitEl.clientWidth);
        let singleWidth = Math.max(0, track.scrollWidth);
        let overflowing = singleWidth > panelWidth + 4;
        traitEl.classList.toggle('is-overflowing', overflowing);
        if (overflowing) {
            let loopText = statToneText.html(`${content}　　　`);
            track.innerHTML = `<span class="enemy-trait-marquee-copy">${loopText}</span><span class="enemy-trait-marquee-copy" aria-hidden="true">${loopText}</span>`;
            let loopDistance = Math.max(singleWidth, track.scrollWidth / 2);
            track.style.setProperty('--trait-duration', `${Math.max(8, Math.min(20, loopDistance / 20)).toFixed(2)}s`);
        }
        traitEl.__traitOverflowPending = false;
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(measure);
    else measure();
}

function updateUiEnemyTraitMarqueeCopies(traitEl, track, content) {
    if (!traitEl.classList.contains('is-overflowing')) return false;
    let copies = track.querySelectorAll('.enemy-trait-marquee-copy');
    if (copies.length !== 2) return false;
    let loopText = `${content}　　　`;
    copies.forEach(copy => {
        if (copy.textContent !== loopText) setUiEnemyTraitText(copy, loopText);
    });
    return true;
}

function updateUiEnemyTraitPanel(traitEl, labels, display, fullTooltip, isBoss) {
    if (!traitEl) return;
    let track = traitEl.querySelector('.enemy-trait-marquee');
    if (!track) return;
    let visible = Array.isArray(labels) && labels.length > 0;
    traitEl.style.display = visible ? '' : 'none';
    setElementAttribute(traitEl, 'data-enemy-trait-tooltip', fullTooltip || display.fullText || '');
    setElementAttribute(traitEl, 'data-enemy-trait-kind', isBoss ? '보스 특성' : '정예 특성');
    setElementAttribute(traitEl, 'aria-label', fullTooltip || display.fullText || '');
    setElementAttribute(traitEl, 'tabindex', '0');
    if (!visible) {
        clearUiEnemyTraitRotation(traitEl);
        traitEl.__traitSignature = '';
        traitEl.__traitOverflowPending = false;
        traitEl.__traitOverflowGeneration = Math.max(0, Math.floor(traitEl.__traitOverflowGeneration || 0)) + 1;
        track.textContent = '';
        return;
    }
    let mobile = isBoss && typeof matchMedia === 'function' && uiDisplay.matches('(max-width: 1080px)');
    let reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let signature = `${isBoss ? 'boss' : 'elite'}|${mobile}|${reducedMotion}|${labels.join('\u001f')}`;
    if (traitEl.__traitSignature === signature) {
        if (traitEl.__traitOverflowPending && isBoss && (!mobile || reducedMotion || labels.length === 1)) {
            if (typeof document !== 'undefined' && document.hidden) return;
            scheduleUiEnemyTraitOverflow(traitEl, track, display.fullText, signature);
        }
        return;
    }
    traitEl.__traitSignature = signature;
    if (isBoss && !mobile && !reducedMotion
        && updateUiEnemyTraitMarqueeCopies(traitEl, track, display.fullText)) return;
    clearUiEnemyTraitRotation(traitEl);
    traitEl.classList.remove('is-overflowing', 'is-rotating');
    if (!isBoss) {
        setUiEnemyTraitText(track, display.compactText);
        return;
    }
    if (!mobile || reducedMotion || labels.length === 1) {
        scheduleUiEnemyTraitOverflow(traitEl, track, display.fullText, signature);
        return;
    }
    let index = 0;
    traitEl.classList.add('is-rotating');
    setUiEnemyTraitText(track, labels[index]);
    traitEl.__traitRotationTimer = setInterval(() => {
        if (!traitEl.isConnected) return clearUiEnemyTraitRotation(traitEl);
        if (traitEl.matches(':hover') || (typeof document !== 'undefined' && document.activeElement === traitEl)) return;
        index = (index + 1) % labels.length;
        setUiEnemyTraitText(track, labels[index]);
    }, 2600);
}

/** Use the existing information line for the special currently preparing/releasing; ordinary attacks retain traits. */
function updateFocusedEnemyTraitPanel(traitEl, enemy, tags) {
    const isBoss = !!(enemy.isBoss || enemy.bossPhase);
    const pending = pendingEnemyCombatAttacks.find(attack => attack.enemyId === enemy.id);
    const cast = isBoss ? enemyAttackRules.castBar(enemy, getCombatTime(), pending) : null;
    const traits = getUiEnemyTraitLabels(tags);
    const labels = cast?.label ? [cast.label] : traits;
    const display = getUiEnemyTraitDisplayText(labels);
    const pattern = enemy.noAttack ? '' : getBossPatternDescription(enemy.patternMode);
    const tooltip = [cast?.label, traits.join(', '), pattern].filter(Boolean).join('\n');
    traitEl.classList.toggle('is-casting', !!cast?.label);
    updateUiEnemyTraitPanel(traitEl, labels, display, tooltip, isBoss);
    if (cast?.label) setElementAttribute(traitEl, 'data-enemy-trait-kind', '보스 행동');
    traitEl.closest('.enemy-card').classList.toggle('has-trait-line', labels.length > 0);
}

function showEnemyTraitTooltip(event) {
    let anchor = event.currentTarget || (event.target && event.target.closest
        ? event.target.closest('.enemy-traits') : null);
    if (!anchor) return;
    let detail = anchor.getAttribute('data-enemy-trait-tooltip') || '';
    if (!detail) return showEnemyTraitTooltip.hide();
    let title = anchor.getAttribute('data-enemy-trait-kind') || '적 특성';
    let html = `<div class="tooltip-title">${escapeHTML(title)}</div>`
        + String(detail).split('\n').map(line => `<div class="tooltip-line">${statToneText.html(line)}</div>`).join('');
    const rect = anchor.getBoundingClientRect();
    showEnemyTraitTooltip.current = { anchor, detail, title };
    showInfoTooltipHtml(event.clientX || rect.left + rect.width / 2, event.clientY || rect.bottom, html, '#d99a8f', anchor);
}

function buildEnemyCombatEffectIcons(activeAilments, enemyDebuffs, now, enemy) {
    let ailmentIcons = (activeAilments || []).filter(ail => ail && (ail.time || 0) > 0).map(ail => {
        let remain = Math.ceil(Math.max(0, ail.time || 0));
        let type = String(ail.type || 'unknown');
        let stacks = type === 'assassinWeakness'
            ? Math.max(1, Math.floor(ail.power || 1))
            : Math.max(1, Math.floor(ail.stacks || 1));
        let badge = stacks > 1 ? `${stacks}` : '';
        let tooltipPayload = {
            type,
            timeLeft: remain,
            power: Number(ail.power || 0),
            sourceHitDamage: Math.floor(getUiStoredAilmentHitDamage(ail)),
            specialDps: Math.floor(ail.flameDecayDps || 0),
            critDotBonusPct: Number(ail.critDotBonusPct || 0),
            stacks,
            rawTickDamage: Math.floor(ail.rawTickDamage || 0),
            tickInterval: Number(ail.tickInterval || 0),
            enemyRes: Number(ail.enemyRes || 0),
            abyssPlayerMul: Number(ail.abyssPlayerMul || 1),
            igniteTakenMultiplier: Number(ail.igniteTakenMultiplier || 1)
        };
        let tooltip = `showEnemyAilmentTooltip(event,${escapeHTML(JSON.stringify(tooltipPayload))})`;
        return renderCombatEffectIcon({ key: type, tooltip, badge, remainingSec: remain, durationSec: ail.duration });
    });
    let curseIcons = (enemyDebuffs || []).filter(row => row && (row.expiresAt || 0) > now).map(row => {
        let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1000));
        let nameArg = escapeHTML(JSON.stringify(String(row.name || '')));
        let tooltip = `showPlayerBuffTooltip(event,${nameArg},'curse',${remain})`;
        return renderCombatEffectIcon({ key: 'curse', label: getConditionEffectTitle(row.name), tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1000 });
    });
    return ailmentIcons.concat(curseIcons).join('') + buildEnemyRuntimeEffectIcons(enemy, now);
}

function buildEnemyRuntimeEffectIcons(enemy, now) {
    if (!enemy || enemy.id == null) return '';
    let icons = [];
    let id = enemy.id;
    let dot = enemy.dotState && typeof enemy.dotState === 'object' ? enemy.dotState : null;
    if (dot && Number(dot.timeLeft) > 0 && dot.skillName !== '화염 부패') {
        let stacks = Math.max(1, Math.floor(Number(dot.stacks) || Number(enemy.dotStacks) || 1));
        let slow = Math.max(0, Number(enemy.skillSlowPct) || 0);
        let name = dot.skillName && dot.skillName !== 'dot' ? dot.skillName : '지속 피해';
        let detail = `${stacks}중첩, 틱 피해 ${Math.floor(Number(dot.rawTickDamage) || 0)}${slow > 0 ? _t(', 둔화 {slow}%', { slow: slow.toFixed(0) }) : ''}`;
        icons.push(renderUiNamedEffectIcon({ key: 'enemySkillDot', name, detail, remainSec: dot.timeLeft, badge: `${stacks}` }, now));
    }
    let witherStacks = Math.max(0, Math.floor(Number((game.enemyWitherStacks || {})[id]) || 0));
    if (witherStacks > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'enemyWither', value: witherStacks, badge: `${witherStacks}` }, now));
    let chaosRow = (game.enemyUniqueChaosResDown || {})[id];
    if (chaosRow && Number(chaosRow.stacks) > 0) {
        let stacks = Math.floor(chaosRow.stacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'enemyChaosResDown', value: stacks, maxValue: chaosRow.perHit, badge: `${stacks}` }, now));
    }
    let elementalRow = (game.enemyUniqueElementalResDown || {})[id];
    if (elementalRow && Number(elementalRow.stacks) > 0) {
        let stacks = Math.floor(elementalRow.stacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'enemyElementalResDown', value: stacks, maxValue: elementalRow.perHit, badge: `${stacks}` }, now));
    }
    let judgment = (game.talentInquisitorMarks || {})[id];
    if (judgment && Number(judgment.accumulated) > 0 && Number(judgment.explodeAt) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'talentInquisitorMark', value: judgment.accumulated, expiresAt: judgment.explodeAt }, now));
    }
    let butcherHits = Math.max(0, Math.floor(Number(((game.talentButcherMarks || {})[id] || {}).hits) || 0));
    if (butcherHits > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'talentButcherMark', value: butcherHits, badge: `${butcherHits}` }, now));
    let weakpointHits = Math.max(0, Math.floor(Number(((game.rangerWeakpointMarks || {})[id] || {}).hits) || 0));
    if (weakpointHits > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'rangerWeakpointMark', value: weakpointHits, badge: `${weakpointHits}` }, now));
    if (Number(enemy.chaosErosionShred) > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'chaosErosion', value: enemy.chaosErosionShred }, now));
    if (Number(enemy.regenSuppressPct) > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'regenSuppress', value: enemy.regenSuppressPct }, now));
    return icons.join('');
}

/** 모바일 HUD는 보호막이 없으면 생명력 아래 보호막 줄 자리를 접는다(css/components/bars.css). */
function markPlayerEnergyShieldRow(hpTrack, hasEnergyShield) {
    let frame = hpTrack && hpTrack.closest && hpTrack.closest('.player-health-frame');
    if (frame) frame.toggleAttribute('data-energy-shield', hasEnergyShield);
}

/** 생명 구슬 안 보호막 글자: 파란 "현재/최대"(이름 없이: 2026-10-17 사용자 "보호막 < 이 문구 삭제해줘"). 휴대폰의 작은 구슬(50px)에서는 CSS가
 * 최대를 숨기고 현재값만 남긴다(pixel-hud.css). */
/** 틱마다 숫자 글자만 바꾼다: innerHTML을 갈면 새 요소가 끼어들어 body의 :has() 규칙까지 다시 따졌다(2026-10-07 프레임 드랍). */
function renderEnergyShieldInline(el, hasEnergyShield, current, max) {
    if (!el) return;
    const display = hasEnergyShield ? '' : 'none';
    if (el.style.display !== display) el.style.display = display;
    if (!hasEnergyShield) return;
    const parts = energyShieldInlineParts(el);
    const nowText = String(Math.floor(current || 0)), maxText = `/${Math.floor(max || 0)}`;
    if (parts.now.data !== nowText) parts.now.data = nowText;
    if (parts.max.data !== maxText) parts.max.data = maxText;
}

/** The two number text nodes of the ES line, built once (current, "/max"). */
function energyShieldInlineParts(el) {
    if (el.__esParts && el.__esParts.now.parentNode === el) return el.__esParts;
    el.innerHTML = '0<span class="combat-es-max">/0</span>';
    el.__esParts = { now: el.childNodes[0], max: el.lastChild.firstChild };
    return el.__esParts;
}

/** 경험치 구슬의 레벨 글자. 레벨이 오르면 구슬 위에 "레벨 업 · Lv N"을 잠깐 띄운다 — 기록 한 줄 · 0.5초 이펙트 · 메뉴 점만으로는
 * 놓치기 쉬웠다(검토 2026-10-01). 처음 그릴 때와 방치 정산 중에는 띄우지 않는다. */
function showHudLevel(level) {
    setTextById('ui-exp-level-label', `Lv.${level}`);
    const previous = hudShownLevel;
    hudShownLevel = level;
    if (!previous || level <= previous || game.isBackgroundCalculation) return;
    playLevelUpCallout(level);
}

function playLevelUpCallout(level) {
    const orb = document.querySelector('#battle-column .combat-exp-bar');
    if (!orb || typeof orb.animate !== 'function') return;
    let label = orb.querySelector('.level-up-callout');
    if (!label) {
        label = document.createElement('span');
        label.className = 'level-up-callout';
        label.setAttribute('aria-hidden', 'true');
        orb.appendChild(label);
    }
    label.textContent = _t('레벨 업 Lv {level}', { level });
    label.getAnimations().forEach(animation => animation.cancel());
    label.animate([
        { opacity: 0, translate: '0 6px' },
        { opacity: 1, translate: '0 0', offset: 0.1 },
        { opacity: 1, translate: '0 0', offset: 0.8 },
        { opacity: 0, translate: '0 -6px' }
    ], { duration: 2000, easing: 'steps(20, end)', fill: 'forwards' });
}

function updateCombatUI(pStats) {
    pStats = normalizeUiPlayerStats(pStats, cachedTooltipStats || {});
    if (pStats.__uiFallbackStats) pStats.maxHp = Math.max(pStats.maxHp, Math.max(1, Number(game.playerHp) || 1));
    if (pStats && pStats.breakdowns && !pStats.__uiFallbackStats) cachedTooltipStats = pStats;
    let safeHp = Math.max(0, Number(game.playerHp) || 0);
    // 생명은 정수로 올림(1 미만이 남아도 1 — 살아 있음이 보이게), 최대 생명 표시(내림)는 넘지 않는다.
    let shownHp = Math.max(0, Math.min(Math.ceil(safeHp - 1e-6), Math.floor(Number(pStats.maxHp) || 0)));
    setTextById('ui-hp', formatSettingNumber(shownHp, 'showHpComma'));
    setTextById('ui-maxhp', formatSettingNumber(pStats.maxHp, 'showHpComma'));
    let hpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let hpBar = document.getElementById('ui-hp-bar');
    setUiImageGaugePercent(hpBar, hpPct);
    hpBar.classList.toggle('player-danger', hpPct > 0 && hpPct <= 25);
    renderCombatSkillHud();
    let hpWrap = hpBar.parentElement;
    let hpGhostBar = document.getElementById('ui-hp-damage-ghost-bar');
    if (!hpGhostBar && hpWrap) {
        hpGhostBar = document.createElement('div');
        hpGhostBar.id = 'ui-hp-damage-ghost-bar';
        hpGhostBar.className = 'hp-bar-fill player-damage-ghost';
        hpWrap.insertBefore(hpGhostBar, hpBar);
    }
    if (hpGhostBar) {
        let ghostPct = updatePlayerHpDamageGhost(hpPct);
        hpGhostBar.style.width = `${ghostPct}%`;
        hpGhostBar.style.display = ghostPct > hpPct + 0.2 ? 'block' : 'none';
    }
    let hpAilBar = document.getElementById('ui-hp-ailment-bar');
    if (!hpAilBar && hpWrap) {
        hpAilBar = document.createElement('div');
        hpAilBar.id = 'ui-hp-ailment-bar';
        hpAilBar.className = 'hp-bar-fill player-ailment-pending';
        hpWrap.insertBefore(hpAilBar, hpBar);
    }
    let hasEnergyShield = (pStats.energyShield || 0) > 0;
    let esPct = hasEnergyShield ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
    markPlayerEnergyShieldRow(hpWrap, hasEnergyShield);
    renderEnergyShieldInline(document.getElementById('ui-es-inline'), hasEnergyShield, game.playerEnergyShield, pStats.energyShield);
    let esBar = document.getElementById('ui-es-bar');
    if (!esBar) {
        let esWrap = document.getElementById('ui-es-track') || hpWrap;
        esBar = document.createElement('div');
        esBar.id = 'ui-es-bar';
        esBar.className = 'hp-bar-fill player-es';
        esBar.style.backgroundColor = '#55c1ff';
        esBar.style.opacity = '0.75';
        esBar.style.position = 'absolute';
        esBar.style.left = '0';
        esBar.style.top = '0';
        esBar.style.zIndex = '5';
        esWrap.insertBefore(esBar, esWrap.firstChild);
    }
    esBar.style.zIndex = '5';
    setUiImageGaugePercent(esBar, esPct);
    esBar.style.display = hasEnergyShield ? 'block' : 'none';
    let expProgress = getUiExperienceProgress(game.level, game.exp);
    setTextById('ui-exp', formatSettingNumber(expProgress.current, 'showExpComma'));
    setTextById('ui-maxexp', formatSettingNumber(expProgress.required, 'showExpComma'));
    let expPct = expProgress.percent;
    setUiImageGaugePercent(document.getElementById('ui-exp-bar'), expPct);
    renderPlayerHudIdentity(getUiPlayerHudIdentity());
    showHudLevel(game.level);
    setTextById('ui-exp-note', `${expPct.toFixed(1)}%`);
    updatePlayerCombatEffectHud(pStats, hpAilBar);
    let hpCombatBar = document.getElementById('ui-player-hp-combat');
    if (hpCombatBar) hpCombatBar.style.width = `${Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100))}%`;
    let esCombatBar = document.getElementById('ui-player-es-combat');
    if (esCombatBar) {
        let pct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
        esCombatBar.style.width = `${pct}%`;
        esCombatBar.style.display = (pStats.energyShield || 0) > 0 ? 'block' : 'none';
    }

    let zone = getZone(game.currentZoneId);
    let storyAct = zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    // 지역 이름만(전투 머리말 없이): 액트는 "액트 1: 제목", 그 밖은 지역 이름을 현재 언어로.
    let compactZoneText = storyAct ? `${formatStoryActLabel(storyAct)}: ${_t(storyAct.title)}` : _t(zone.name);
    setTextById('ui-combat-zone', compactZoneText);
    // 레벨·직업은 경험치바 왼쪽(ui-exp-level-label)으로 이동했으므로 여기는 지역 이름만 표기한다.
    setTextById('ui-combat-zone-inline', compactZoneText);
    cosmosRouteUi.updateHud();
    setTextById('btn-combat-return', sideEncounterUi.returnLabel(zone));
    let pendingWoodsmanEntrance = !!game.woodsmanEntrancePending && zone && zone.type === 'outsideChaos';
    if (pendingWoodsmanEntrance) {
        let totalTime = Math.max(0.1, Number(game.moveTotalTime) || 3);
        let readyPct = Math.min(100, Math.max(0, (1 - Math.max(0, game.moveTimer || 0) / totalTime) * 100));
        setTextById('ui-progress-label', '☠️ 나무꾼 등장 대기');
        setTextById('ui-move-time-text', game.moveTimer > 0 ? _t('{max}초', { max: Math.max(0, game.moveTimer).toFixed(1) }) : '등장 임박');
        setCombatProgressGaugePercent(readyPct);
    } else if (game.moveTimer > 0) {
        let readyPct = Math.min(100, (1 - game.moveTimer / game.moveTotalTime) * 100);
        setTextById('ui-progress-label', game.isTownReturning ? '🏕️ 재정비 중...' : '다음 구간 준비');
        setTextById('ui-move-time-text', _t('{max}초', { max: Math.max(0, game.moveTimer).toFixed(1) }));
        setCombatProgressGaugePercent(readyPct);
    } else if (zone && zone.type === 'oceanDepth') {
        // 심해는 전투 진행도 대신 현재 수심(m)만 표기한다. 수심은 쓰러뜨린 몬스터만큼 조금씩 내려간다(js/passives.js tickOceanDepth).
        let oceanSt = (typeof ensureOceanState === 'function') ? ensureOceanState() : null;
        let depthM = oceanSt ? Math.floor(oceanSt.depthM || 0) : 0;
        // 진행 바는 현재 100m 구간 내 진행도를 표시해 수심 1m마다 약 1%씩 차오른다.
        let segPct = Math.min(100, Math.max(0, depthM - Math.floor(depthM / 100) * 100));
        let isDrowning = !!(oceanSt && oceanSt.drowning);
        setTextById('ui-progress-label', isDrowning ? '🫨 익사 위험' : '🌊 수심');
        setTextById('ui-move-time-text', isDrowning ? _t('{depthM}m, 산소 고갈! 익사 피해 누적', { depthM }) : `${depthM}m`);
        setCombatProgressGaugePercent(isDrowning ? 100 : segPct);
    } else if (getUiCrowdProgressPaused()) {
        setTextById('ui-progress-label', '적 정리 중');
        setTextById('ui-move-time-text', `${game.runProgress.toFixed(0)}%`);
        setCombatProgressGaugePercent(game.runProgress);
    } else {
        setTextById('ui-progress-label', '진행도');
        setTextById('ui-move-time-text', `${game.runProgress.toFixed(0)}%`);
        setCombatProgressGaugePercent(game.runProgress);
    }

    sideEncounterUi.updateHud(zone);
    syncMapProgressRow(zone);
    atlasUi.updateHud(zone);
    if (getRenderingUiTabIds().has('tab-character')) renderCharacterStats(pStats);

    let enemies = (game.enemies || []).filter(enemy => enemy && (enemy.hp || 0) > 0);
    pruneEnemyHpDamageGhostStates(enemies.map(enemy => enemy.id));
    let targetIds = getUiSkillTargets(pStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    let bossEnemy = enemies.find(enemy => enemy.isBoss || enemy.bossPhase);
    let focusedEnemy = bossEnemy || enemies.find(enemy => targetIds.includes(enemy.id)) || enemies[0] || null;
    let enemyListEl = document.getElementById('ui-enemy-list');
    if (!focusedEnemy) {
        enemyListEl.hidden = !!woodsmanBattle.introduction();
        if (enemyListEl.dataset.enemyId !== '') {
            clearUiEnemyTraitRotation(enemyListEl.querySelector('.enemy-traits'));
            enemyListEl.dataset.enemyId = '';
            enemyListEl.innerHTML = `<div class="enemy-empty">${_t('현재 조준 중인 적이 없습니다.')}</div>`;
        }
    } else {
        let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
        let tags = getEnemyTraitSummary(focusedEnemy);
        if (Array.isArray(focusedEnemy.chaosRealmAffixes) && focusedEnemy.chaosRealmAffixes.length > 0) tags = tags.concat(focusedEnemy.chaosRealmAffixes.map(a => a.name));
        tags = Array.from(new Set(getUiEnemyTraitLabels(tags)));
        let activeAilments = (focusedEnemy.ailments || []).filter(ail => ail && (ail.time || 0) > 0);
        let effectNow = getCombatTime();
        let enemyDebuffs = (((game.enemyConditionDebuffs || {})[focusedEnemy.id]) || []).filter(row => row && (row.expiresAt || 0) > effectNow);
        let effectMarkup = buildEnemyCombatEffectIcons(activeAilments, enemyDebuffs, effectNow, focusedEnemy);
        let projectedAilmentDamage = activeAilments.reduce((sum, ail) => {
            if (!ail || (ail.time || 0) <= 0) return sum;
            if (ail.type === 'flameDecay') return sum + Math.floor(Math.max(0, ail.flameDecayDps || 0) * Math.max(0, ail.time || 0));
            if (!isUiDamageAilmentType(ail.type)) return sum;
            let dps = getUiEnemyDamageAilmentDps(ail, pStats);
            let stacks = Math.max(1, Math.floor(ail.stacks || 1));
            return sum + Math.floor(dps * stacks * Math.max(0, ail.time || 0));
        }, 0);
        let pendingPct = Math.max(0, Math.min(pct, (projectedAilmentDamage / Math.max(1, focusedEnemy.maxHp || 1)) * 100));
        let pendingStartPct = Math.max(0, pct - pendingPct);
        let ghostPct = updateEnemyHpDamageGhost(focusedEnemy.id, pct);
        let ghostTrailPct = Math.max(0, ghostPct - pct);
        let ghostDisplay = ghostTrailPct > 0.2 ? 'block' : 'none';
        let enemyHudTier = (focusedEnemy.isBoss || focusedEnemy.bossPhase) ? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob');
        let focusedKey = String(focusedEnemy.id) + '|' + enemyHudTier;
        // 2026-10-04 visibility: an ordinary monster's HP already rides over its head on the field, so the big top card
        // (name · bar) only shows for elites and bosses — on phones it covered the ground ahead where packs come from.
        // 같은 값이면 쓰지 않는다: 쓸 때마다 body의 :has() 규칙까지 스타일을 다시 계산했다(2026-10-25 측정, 일반 몹을 겨눈 동안 틱마다).
        if (enemyListEl.hidden !== (enemyHudTier === 'mob')) enemyListEl.hidden = enemyHudTier === 'mob';
        if (enemyListEl.dataset.enemyId !== focusedKey || !enemyListEl.querySelector('.enemy-card.targeted')) {
            clearUiEnemyTraitRotation(enemyListEl.querySelector('.enemy-traits'));
            enemyListEl.dataset.enemyId = focusedKey;
            let traitMarkup = '<div class="enemy-tags muted enemy-traits" role="button" tabindex="0" aria-controls="info-tooltip" data-info-tooltip-anchor="1" onmouseenter="showEnemyTraitTooltip(event)" onmousemove="showEnemyTraitTooltip(event)" onfocus="showEnemyTraitTooltip(event)" onclick="event.stopPropagation(); showEnemyTraitTooltip(event)" onkeydown="showEnemyTraitTooltip.onKey(event)" onblur="showEnemyTraitTooltip.hide()" onmouseleave="if(document.activeElement!==this) showEnemyTraitTooltip.hide()"><span class="enemy-trait-marquee"></span></div>';
            let effectMarkup = '<div class="enemy-tags muted enemy-ailments combat-effect-strip enemy-combat-effect-strip" aria-label="활성 상태이상 및 효과"></div>';
            let metaMarkup = `<div class="enemy-hud-meta">${traitMarkup}</div>`;
            enemyListEl.innerHTML = `
                <div class="enemy-card targeted enemy-${enemyHudTier}">
                    <div class="enemy-nameplate"><div class="enemy-name"></div></div>
                    <div class="enemy-health-frame">
                        <img class="health-skin-frame" src="assets/ui/health-${enemyHudTier}-v2.png" alt="" aria-hidden="true">
                        <div class="hp-bar-bg">
                            <div class="health-skin-track">
                                <div class="hp-bar-fill enemy-damage-ghost"></div>
                                <div class="hp-bar-fill enemy-es"></div>
                                <div class="hp-bar-fill enemy"></div>
                                <div class="hp-bar-fill enemy-pending"></div>
                                <div class="hp-text"></div>
                            </div>
                        </div>
                        ${metaMarkup}
                    </div>
                    ${effectMarkup}
                </div>
            `;
        }
        let nameEl = enemyListEl.querySelector('.enemy-name');
        let ghostEl = enemyListEl.querySelector('.enemy-damage-ghost');
        let esEl = enemyListEl.querySelector('.hp-bar-fill.enemy-es');
        let hpEl = enemyListEl.querySelector('.hp-bar-fill.enemy');
        let pendingEl = enemyListEl.querySelector('.enemy-pending');
        let hpTextEl = enemyListEl.querySelector('.hp-text');
        let ailmentEl = enemyListEl.querySelector('.enemy-ailments');
        let traitEl = enemyListEl.querySelector('.enemy-traits');
        setElementText(nameEl, `${getEnemyDisplayName(focusedEnemy)}, Lv.${levelProgression.monsterLevel(zone, focusedEnemy)}`);
        if (ghostEl) {
            ghostEl.style.left = `${pct}%`;
            ghostEl.style.width = `${ghostTrailPct}%`;
            ghostEl.style.display = ghostDisplay;
        }
        if (esEl) {
            let esPct = (focusedEnemy.maxEnergyShield || 0) > 0 ? Math.max(0, Math.min(100, ((focusedEnemy.energyShield || 0) / Math.max(1, focusedEnemy.maxEnergyShield)) * 100)) : 0;
            esEl.style.width = `${esPct}%`;
            esEl.style.display = esPct > 0 ? 'block' : 'none';
        }
        if (hpEl) setUiImageGaugePercent(hpEl, pct);
        if (pendingEl) { pendingEl.style.left = `${pendingStartPct}%`; pendingEl.style.width = `${pendingPct}%`; }
        if (hpTextEl) {
            let zoneNow = getZone(game.currentZoneId);
            if (zoneNow && zoneNow.type === 'woodsmanEcho') {
                let totalDealt = Math.max(0, Math.floor((focusedEnemy.echoStartHp || focusedEnemy.maxHp || 0) - Math.max(0, focusedEnemy.hp || 0)));
                setElementText(hpTextEl, `${focusedEnemy.energyShield > 0 ? _t('보호막 {energyShield}, ', { energyShield: formatSettingNumber(focusedEnemy.energyShield, 'showEnemyHpComma') }) : ''}${formatSettingNumber(totalDealt, 'showEnemyHpComma')} / ?`);
            } else setElementText(hpTextEl, `${focusedEnemy.energyShield > 0 ? _t('보호막 {energyShield}, ', { energyShield: formatSettingNumber(focusedEnemy.energyShield, 'showEnemyHpComma') }) : ''}${formatSettingNumber(Math.max(0, focusedEnemy.hp), 'showEnemyHpComma')}/${formatSettingNumber(focusedEnemy.maxHp, 'showEnemyHpComma')}`);
        }
        patchCombatEffectStrip(ailmentEl, effectMarkup);
        if (traitEl) updateFocusedEnemyTraitPanel(traitEl, focusedEnemy, enemyHudTier === 'mob' ? [] : tags);
    }
    showEnemyTraitTooltip.sync();
}

exposeFileGlobals({ setTextById, setElementText, primeEnemyHpDamageGhost, updateEnemyHpDamageGhost, formatSettingNumber, formatCappedResistanceValue, renderCombatSkillHud, setCombatProgressGaugePercent, getUiCombatEffectPresentation, getUiRuntimeEffectDetail, getUiExperienceProgress, getConditionEffectTitle, updatePlayerCombatEffectHud, showEnemyTraitTooltip, renderEnergyShieldInline, updateCombatUI });
})();

showEnemyTraitTooltip.onKey = event => {
    if (!['Enter', ' ', 'Escape'].includes(event.key)) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.key === 'Escape') { event.currentTarget.blur(); showEnemyTraitTooltip.hide(); }
    else showEnemyTraitTooltip(event);
};

showEnemyTraitTooltip.sync = () => {
    const current = showEnemyTraitTooltip.current;
    if (!current) return;
    const { anchor, detail, title } = current;
    if (activeInfoTooltipToken !== anchor) { showEnemyTraitTooltip.current = null; return; }
    if (!anchor.isConnected || anchor.style.display === 'none' || anchor.closest('[hidden]')) return showEnemyTraitTooltip.hide();
    if (detail !== (anchor.getAttribute('data-enemy-trait-tooltip') || '')
        || title !== (anchor.getAttribute('data-enemy-trait-kind') || '적 특성')) showEnemyTraitTooltip({ currentTarget: anchor });
};

showEnemyTraitTooltip.hide = () => {
    const anchor = showEnemyTraitTooltip.current?.anchor;
    showEnemyTraitTooltip.current = null;
    if (anchor && activeInfoTooltipToken === anchor) hideInfoTooltip();
};
