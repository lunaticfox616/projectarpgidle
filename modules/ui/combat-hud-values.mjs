/** Identity labels belong to the HUD; no public lookup/render pair is needed. */
export function renderHudIdentity(runtime) {
    const { deps } = runtime;
    const identityId = deps.game.selectedClassId || deps.game.selectedHeroId;
    const hero = typeof deps.getHeroSelectionDef === 'function' ? deps.getHeroSelectionDef(identityId) : null;
    const ascension = deps.game.ascendClass && deps.CLASS_TEMPLATES ? deps.CLASS_TEMPLATES[deps.game.ascendClass] : null;
    setTextById(runtime, 'ui-player-name-label', hero ? hero.label : '플레이어');
    setTextById(runtime, 'ui-player-class-label', ascension ? ascension.name : '미전직');
    deps.document.querySelector('#battle-column .player-hud-identity-row')?.toggleAttribute('data-ascended', !!ascension);
}

export function setTextById(runtime, id, value) {
    setElementText(runtime, runtime.deps.document.getElementById(id), value);
}

export function setElementText(runtime, el, value) {
    if (!el) return;
    const text = value == null ? '' : String(value);
    if (el.textContent !== text) el.textContent = text;
}

export function setElementAttribute(runtime, el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function shouldUseCommaSetting(runtime, settingKey) {
    return !(runtime.deps.game && runtime.deps.game.settings && runtime.deps.game.settings[settingKey] === false);
}

export function formatCommaNumber(runtime, value, options = {}) {
    let amount = Number(value) || 0;
    if (options.decimals !== undefined) return amount.toFixed(options.decimals);
    return Math.floor(amount).toLocaleString(runtime.deps.i18n.locale);
}

export function formatSettingNumber(runtime, value, settingKey, options = {}) {
    if (!shouldUseCommaSetting(runtime, settingKey)) {
        if (options.decimals !== undefined) return (Number(value) || 0).toFixed(options.decimals);
        return String(Math.floor(Number(value) || 0));
    }
    return formatCommaNumber(runtime, value, options);
}

export function formatCappedResistanceValue(runtime, appliedValue, uncappedValue) {
    let applied = Math.floor(Number(appliedValue) || 0);
    let uncapped = Number.isFinite(Number(uncappedValue)) ? Math.floor(Number(uncappedValue)) : applied;
    return applied === uncapped ? `${applied}` : `${applied} (${uncapped})`;
}

export function setUiImageGaugePercent(runtime, element, percent) {
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

/** 틱마다 숫자 글자만 바꾼다: innerHTML을 갈면 새 요소가 끼어들어 body의 :has() 규칙까지 다시 따졌다(2026-10-07 프레임 드랍). */
export function renderEnergyShieldInline(runtime, el, hasEnergyShield, current, max) {
    if (!el) return;
    const display = hasEnergyShield ? '' : 'none';
    if (el.style.display !== display) el.style.display = display;
    if (!hasEnergyShield) return;
    const parts = energyShieldInlineParts(runtime, el);
    const nowText = String(Math.floor(current || 0)), maxText = `/${Math.floor(max || 0)}`;
    if (parts.now.data !== nowText) parts.now.data = nowText;
    if (parts.max.data !== maxText) parts.max.data = maxText;
}

/** The two number text nodes of the ES line, built once (current, "/max"). */
export function energyShieldInlineParts(runtime, el) {
    if (el.__esParts && el.__esParts.now.parentNode === el) return el.__esParts;
    el.innerHTML = '0<span class="combat-es-max">/0</span>';
    el.__esParts = { now: el.childNodes[0], max: el.lastChild.firstChild };
    return el.__esParts;
}
