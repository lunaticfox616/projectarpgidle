import { listenView } from './view-events.mjs';
import { releaseCombatHudSkills } from './combat-hud-lifetime.mjs';

export function getCombatSkillHudEntries(runtime) {
    let summons = (Array.isArray(runtime.deps.game.equippedSummonSkills) ? runtime.deps.game.equippedSummonSkills : []).filter(name => {
        let def = runtime.deps.SKILL_DB[name];
        return def && Array.isArray(def.tags) && def.tags.includes('summon_attack');
    });
    let gems = [runtime.deps.game.activeSkill || '기본 공격']
        .concat(summons)
        .filter((name, index, list) => name && list.indexOf(name) === index)
        .slice(0, 4)
        .map((name, index) => ({ kind: index === 0 ? 'primary' : 'summon', name }));
    let mobility = runtime.deps.SKILL_DB[runtime.deps.game.mobilitySkill] ? [{ kind: 'mobility', name: runtime.deps.game.mobilitySkill, hotkey: getHotkeyLabel(runtime, 'combat:mobility') }] : [];
    return gems.slice(0, 1).concat(mobility, gems.slice(1)).slice(0, runtime.state.COMBAT_SKILL_HUD_LIMIT);
}

/** Short key name of a PC hotkey action for HUD key caps ('' when unbound). */
export function getHotkeyLabel(runtime, actionId) {
    return runtime.deps.hotkeyBindings.label(runtime.deps.hotkeyBindings.codeFor(runtime.deps.game.settings.hotkeyOverrides, actionId));
}

export function renderCombatSkillSlot(runtime, entry) {
    let name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(entry.name));
    let art = (0, runtime.deps.renderSkillGemArt)(entry.name, 'combat-skill-gem-art', { eager: true });
    let cooldown = entry.kind === 'mobility' ? '<span class="player-hud-skill-cooldown" aria-hidden="true" hidden></span>' : '';
    // 이동 스킬 칸은 누르거나 단축키(기본 E)로 쓴다: 키 표시는 자동 이동 단추와 같다.
    let key = entry.hotkey ? (0, runtime.deps.escapeHTML)(entry.hotkey) : '';
    let keyAttrs = key ? ` aria-keyshortcuts="${key}"` : '';
    let keyCap = key ? `<i class="combat-hud-key" aria-hidden="true">${key}</i>` : '';
    return `<button type="button" class="player-hud-skill-slot ${entry.kind}" data-gem-name="${name}" data-slot-kind="${entry.kind}"${keyAttrs} data-info-tooltip-anchor="1" aria-label="${runtime.state.COMBAT_SKILL_SLOT_LABELS[entry.kind]}, ${name}">${art}${cooldown}${keyCap}</button>`;
}

export function bindCombatSkillSlot(runtime, button) {
    let name = button.dataset.gemName;
    const owner = runtime.owner;
    const current = () => runtime.active && runtime.deps.game === owner && button.isConnected;
    // 올려 두면 뜨는 설명은 마우스만: 터치는 떼도 mouseleave가 없어 이동 스킬을 누를 때마다 설명이 전장을 덮은 채 남았다.
    let show = event => { if (current() && event.pointerType === 'mouse') (0, runtime.deps.showGemTooltip)(event, 'active', name); };
    listenView(runtime, button, 'pointerenter', show);
    listenView(runtime, button, 'pointermove', show);
    listenView(runtime, button, 'pointerleave', () => { if (current()) (0, runtime.deps.hideInfoTooltip)(); });
    listenView(runtime, button, 'click', () => {
        if (!current()) return;
        if (button.dataset.slotKind === 'mobility') { runtime.deps.hotkeysUi.useMobility(button); return; }
        (0, runtime.deps.openTabPane)('tab-skills');
    });
}

export function getCombatSkillCooldownSpan(runtime, name, readyAt, remaining) {
    let known = runtime.state.combatSkillCooldownSpans.get(name);
    if (!known || known.readyAt !== readyAt) {
        known = { readyAt, totalMs: Math.max(1, remaining) };
        runtime.state.combatSkillCooldownSpans.set(name, known);
    }
    return known.totalMs;
}

export function paintCombatSkillCooldown(runtime, button, readyAt, now, justCast) {
    let name = button.dataset.gemName;
    let remaining = Math.max(0, readyAt - now);
    let badge = button.querySelector('.player-hud-skill-cooldown');
    let seconds = remaining > 0 ? String(Math.ceil(remaining / 1000)) : '';
    button.style.setProperty('--cooldown', remaining > 0 ? (remaining / getCombatSkillCooldownSpan(runtime, name, readyAt, remaining)).toFixed(3) : '0');
    button.classList.toggle('cooling', remaining > 0);
    button.classList.toggle('just-cast', justCast);
    if (badge.textContent !== seconds) badge.textContent = seconds;
    badge.hidden = !seconds;
}

export function refreshCombatSkillCooldowns(runtime, host) {
    let now = (0, runtime.deps.getCombatTime)();
    host.querySelectorAll('.player-hud-skill-slot.mobility').forEach(button => paintCombatSkillCooldown(runtime, button, now + runtime.deps.mobilitySkill.cooldownLeft(now), now, false));
}

export function renderCombatSkillHud(runtime) {
    let host = runtime.deps.document.getElementById('ui-combat-skill-gems');
    if (runtime.skillHost !== host) releaseCombatHudSkills(runtime);
    if (!host) return;
    runtime.skillHost = host;
    let entries = getCombatSkillHudEntries(runtime);
    let signature = runtime.deps.i18n.locale + '|' + entries.map(entry => `${entry.kind}:${entry.name}:${entry.hotkey || ''}`).join('|');
    if (host.dataset.signature !== signature) {
        releaseCombatHudSkills(runtime);
        runtime.skillHost = host;
        entries.forEach(entry => {
            const spec = runtime.deps.SKILL_SIGNATURE_SPRITES[runtime.deps.SKILL_GEM_VFX_PROFILES[entry.name]?.signature];
            if (spec) (0, runtime.deps.getSkillGemVfxImage)(spec.asset);
        });
        host.dataset.signature = signature;
        host.dataset.slotCount = String(entries.length);
        host.innerHTML = entries.map(runtime.handlers.renderCombatSkillSlot).join('');
        host.querySelectorAll('.player-hud-skill-slot').forEach(runtime.handlers.bindCombatSkillSlot);
    }
    refreshCombatSkillCooldowns(runtime, host);
}
