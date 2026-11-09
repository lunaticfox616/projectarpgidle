// 툴팁: 위치 잡기, 능력치와 효과 툴팁, 룬 툴팁, 아이템 툴팁 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function applyTooltipPosition(el, x, y) {
    if (!el || el.style.display === 'none') return;
    if (el.style.left !== '0px' || el.style.top !== '0px') {
        el.style.left = '0px';
        el.style.top = '0px';
    }
    let size = tooltipSizeCache.get(el);
    if (!size || size.factor !== uiDisplay.factor) {
        let rect = el.getBoundingClientRect();
        size = { width: rect.width, height: rect.height, factor: uiDisplay.factor };
        tooltipSizeCache.set(el, size);
    }
    let left = x + 18;
    let top = y + 18;
    if (left + size.width > window.innerWidth - 10) left = x - size.width - 18;
    if (top + size.height > window.innerHeight - 10) top = y - size.height - 18;
    left = clampNumber(left, 8, Math.max(8, window.innerWidth - size.width - 8));
    top = clampNumber(top, 8, Math.max(8, window.innerHeight - size.height - 8));
    ({ left, top } = tutorialActionUi.clearTooltipSpot({ left, top, width: size.width, height: size.height }, x, y));
    const deviceScale = Math.max(1, Number(window.devicePixelRatio) || 1);
    const snappedLeft = Math.round(left * deviceScale) / deviceScale;
    const snappedTop = Math.round(top * deviceScale) / deviceScale;
    el.style.transform = `translate(${snappedLeft / uiDisplay.factor}px, ${snappedTop / uiDisplay.factor}px)`;
}

function flushTooltipPositions() {
    tooltipPositionFrame = null;
    let positions = Array.from(pendingTooltipPositions.entries());
    pendingTooltipPositions.clear();
    positions.forEach(([el, point]) => applyTooltipPosition(el, point.x, point.y));
}

function positionTooltipElement(el, x, y) {
    if (!el) return;
    pendingTooltipPositions.set(el, { x: Number(x) || 0, y: Number(y) || 0 });
    if (tooltipPositionFrame !== null) return;
    tooltipPositionFrame = requestAnimationFrame(flushTooltipPositions);
}

function invalidateTooltipSize(el) {
    if (!el) return;
    tooltipSizeCache.delete(el);
}

function reuseInfoTooltip(event, token) {
    let tt = document.getElementById('info-tooltip');
    if (!token || activeInfoTooltipToken !== token || !tt || tt.style.display !== 'block' || !tt.innerHTML) return false;
    positionTooltipElement(tt, event.clientX, event.clientY);
    return true;
}

function setActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') activeTooltipId = null;
    activeTooltipId = id;
}

function clearActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') return;
    if (activeTooltipId === id) activeTooltipId = null;
}

function showInfoTooltipHtml(x, y, html, borderColor, contentToken) {
    if (tutorialActionUi.hushesTooltipAt(x, y)) return;
    let tt = document.getElementById('info-tooltip');
    let hadComparison = tt.classList.contains('item-compare-tooltip');
    if (hadComparison) tt.classList.remove('item-compare-tooltip');
    if (tt.innerHTML !== html || hadComparison) {
        tt.innerHTML = html;
        invalidateTooltipSize(tt);
    }
    activeInfoTooltipToken = contentToken || null;
    tt.style.borderColor = borderColor || '#777';
    tt.style.display = 'block';
    positionTooltipElement(tt, x, y);
    setActiveTooltip('info-tooltip');
}

function hideInfoTooltip() {
    clearActiveTooltip('info-tooltip');
    activeInfoTooltipToken = null;
    document.getElementById('info-tooltip').style.display = 'none';
}

function showSporeCraftTooltip(event, kind) {
    let info = kind === 'corrupt'
        ? { name: '부패 수확', desc: '잠기지 않은 원소 피해/원소 저항 옵션 1개를 무작위로 제거합니다.', color: '#b58ad9' }
        : { name: '균열 수확', desc: '빈 옵션 1칸에 해당 부위의 화석 전용 옵션 1개를 추가합니다.', color: '#72c8d8' };
    let html = `<div class="tooltip-title">${_t(info.name)}</div><div class="tooltip-line">${_t(info.desc)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, info.color);
}

function renderBreakdownHtml(data) {
    let html = `<div class="tooltip-title">${_t(data.title)}</div>`;
    (data.lines || []).filter(Boolean).forEach(line => { html += `<div class="tooltip-line">${line}</div>`; });
    if (data.final !== undefined) html += `<div class="tooltip-final">${_t('최종 수치: {final}', { final: data.final })}</div>`;
    return html;
}

function showStatTooltip(event, key) {
    // Combat ticks keep numeric stats only; build current explanations on explicit inspection.
    let stats = getUiPlayerStats();
    cachedTooltipStats = stats;
    let data = stats && stats.breakdowns ? stats.breakdowns[key] : null;
    if (!data) return;
    const rect = event.currentTarget.getBoundingClientRect();
    showInfoTooltipHtml(event.clientX ?? rect.left, event.clientY ?? rect.bottom, renderBreakdownHtml(data), '#f39c12');
}

function showPlayerAilmentTooltip(event, type, timeLeft, power, sourceHitDamage) {
    let visual = getUiCombatEffectPresentation(type);
    let p = Math.max(0.1, Number(power || 0.1));
    let source = Math.max(0, Number(sourceHitDamage || 0));
    let detail = '';
    if (isUiDamageAilmentType(type)) {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let dps = getUiPlayerDamageAilmentDps({ type: type, power: p, sourceHitDamage: source }, tooltipStats);
        let basis = source > 0 ? _t('받은 피해 {floor} 기준', { floor: Math.floor(source) }) : '최대 생명력 기반';
        detail = `${_t('초당 피해: 약 {dps}', { dps })} <span style="color:var(--copy-bright);">(${basis})</span>`;
    } else if (type === 'chill') detail = _t('공격 속도 약 32% 감소');
    else if (type === 'shock') {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let shockTakenIncrease = getUiPlayerShockTakenDamageIncreasePct(p, tooltipStats);
        detail = formatUiTakenDamageShockLine(shockTakenIncrease);
    }
    else if (type === 'freeze') detail = '행동 불가';
    let html = `<div class="tooltip-title">${escapeHTML(_t(visual.label))}</div><div class="tooltip-line">${_t('남은 시간: {ceil}초', { ceil: Math.ceil(Math.max(0, Number(timeLeft||0))) })}</div><div class="tooltip-line">${_t('위력: {p}', { p: p.toFixed(2) })}</div><div class="tooltip-line">${detail}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ff7f7f');
}

function showPlayerEhpTooltip(event) {
    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    const html = `<div class="tooltip-title">${_t('속성별 실효 체력')}</div><div class="tooltip-line">${escapeHTML(anchor.dataset.ehpDetail)}</div><div class="tooltip-line tooltip-muted">${_t('공격 EHP는 회피를 포함한 평균 내구도, 직격 EHP는 회피하지 못한 타격 기준입니다.')}</div>`;
    showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, '#b49b68');
}

function showMapProgressTooltip(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const speed = Math.max(1, Number(cachedTooltipStats?.moveSpeed) || 100);
    const multiplier = speed / 100;
    const saved = (1 - 1 / multiplier) * 100;
    const html = `<div class="tooltip-title">${_t('이동 속도와 진행도')}</div><div class="tooltip-line">${_t('이동 속도 {speed}, 기본 대비 {multiplier}배', { speed: speed.toFixed(1), multiplier: multiplier.toFixed(2) })}</div><div class="tooltip-line">${_t('같은 이동 구간의 소요 시간 {abs}% {value}', { abs: Math.abs(saved).toFixed(1), value: saved >= 0 ? _t('단축') : _t('증가') })}</div>`;
    showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, '#b49b68');
}

function showPlayerExperienceTooltip(event) {
    let progress = getUiExperienceProgress(game.level, game.exp);
    let current = formatSettingNumber(progress.current, 'showExpComma');
    let required = formatSettingNumber(progress.required, 'showExpComma');
    let remaining = formatSettingNumber(progress.remaining, 'showExpComma');
    let html = '<div class="tooltip-title">경험치</div>'
        + `<div class="tooltip-line">${_t('현재: {current} / {required}', { current, required })}</div>`
        + `<div class="tooltip-line">${_t('다음 레벨까지: {remaining}', { remaining })}</div>`
        + `<div class="tooltip-line">${_t('진행도: {percent}%', { percent: progress.percent.toFixed(1) })}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#c89be8');
}

function showPlayerRuntimeEffectTooltip(event, type, value, maxValue, remainSec) {
    let visual = getUiCombatEffectPresentation(type);
    let detail = getUiRuntimeEffectDetail(type, value, maxValue);
    let duration = Number(remainSec || 0) > 0
        ? `<div class="tooltip-line">${_t('남은 시간: {ceil}초', { ceil: Math.ceil(remainSec) })}</div>` : '';
    let html = `<div class="tooltip-title">${escapeHTML(_t(visual.label))}</div>${duration}<div class="tooltip-line">${escapeHTML(detail)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
}

function showPlayerNamedEffectTooltip(event, type, name, detail, remainSec) {
    let visual = getUiCombatEffectPresentation(type);
    let duration = Number(remainSec || 0) > 0
        ? `<div class="tooltip-line">${_t('남은 시간: {ceil}초', { ceil: Math.ceil(remainSec) })}</div>` : '';
    let html = `<div class="tooltip-title">${escapeHTML(name || visual.label)}</div>${duration}`
        + `<div class="tooltip-line">${escapeHTML(detail || '효과가 적용 중입니다.')}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
}

function showPlayerCosmosDebuffTooltip(event, type, value, remainSec, label) {
    let visual = getUiCombatEffectPresentation(type);
    let safeLabel = escapeHTML(label || visual.label);
    let html = `<div class="tooltip-title">${safeLabel}</div>`
        + `<div class="tooltip-line">${_t('남은 시간: {ceil}초', { ceil: Math.ceil(Math.max(0, Number(remainSec || 0))) })}</div>`
        + `<div class="tooltip-line">${safeLabel} -${Math.max(0, Number(value || 0)).toFixed(0)}%</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
}

function findConditionEffectDelta(name, type) {
    if (type !== 'curse') return (talismanCombat.active().find(row => row.buff.name === name) || {}).delta || null;
    for (const rows of Object.values(game.enemyConditionDebuffs || {})) {
        const row = (rows || []).find(entry => entry && entry.name === name);
        if (row) return row.delta;
    }
    return null;
}

function showPlayerBuffTooltip(event, name, type, remainSec) {
    const typeLabel = { curse: '저주', warcry: '함성', guard: '수호' }[type] || '효과';
    let html = `<div class="tooltip-title">${escapeHTML(getConditionEffectTitle(name))}</div><div class="tooltip-line">${_t('분류: {typeLabel}, 부적 조건부 줄', { typeLabel })}</div>`;
    if (Number(remainSec) > 0) html += `<div class="tooltip-line">${_t('남은 시간: {ceil}초', { ceil: Math.ceil(Number(remainSec)) })}</div>`;
    html += `<div class="tooltip-line">${escapeHTML(talismans.describeDelta(findConditionEffectDelta(name, type)) || '효과 없음')}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}

function getUiEnemyDamageAilmentTooltipDetail(state) {
    let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
    let ailmentDps = getUiEnemyDamageAilmentDps({
        type: state.type,
        power: state.power,
        sourceHitDamage: state.sourceHitDamage,
        critDotBonusPct: state.critDotBonusPct
    }, tooltipStats);
    let totalDamage = Math.max(0, Math.floor(ailmentDps * state.stacks * state.timeLeft));
    let stackText = state.stacks > 1 ? _t(', {stacks}중첩', { stacks: state.stacks }) : '';
    return `${_t('총 피해량: 약 {totalDamage}', { totalDamage })} <span style="color:var(--copy-bright);">${_t('(원천피해: {floor} / 초당 피해: 약 {ailmentDps}{stackText})', { floor: Math.floor(state.sourceHitDamage), ailmentDps, stackText })}</span>`;
}

function getUiFlameDecayTooltipDetail(state) {
    let dps = Math.max(0, Math.floor(state.specialDps));
    let totalDamage = Math.max(0, Math.floor(dps * state.timeLeft));
    let rawTick = Math.max(0, Math.floor(state.rawTickDamage));
    let interval = Math.max(0.02, state.tickInterval);
    let rawDps = rawTick > 0 ? Math.floor(rawTick / interval) : 0;
    let resistText = Number.isFinite(state.enemyRes) ? _t(', 적 화염 저항/관통 후 {enemyRes}%', { enemyRes: state.enemyRes.toFixed(1) }) : '';
    let abyssText = Math.abs(state.abyssPlayerMul - 1) > 0.001 ? _t(', 심연/지역 배율 {abyssPlayerMul}x', { abyssPlayerMul: state.abyssPlayerMul.toFixed(2) }) : '';
    return `${_t('총 피해량: 약 {totalDamage}', { totalDamage })} <span style="color:var(--copy-bright);">${_t('(최종 초당 피해: 약 {dps}, 원시 {rawDps}/s{resistText}{abyssText})', { dps, rawDps, resistText, abyssText })}</span><br><span style="color:#ffb48a;">${_t('점화 피해 증폭: {igniteTakenMultiplier}x (생명력 기반 시너지)', { igniteTakenMultiplier: state.igniteTakenMultiplier.toFixed(2) })}</span>`;
}

function getUiEnemyAilmentTooltipDetail(state) {
    if (isUiDamageAilmentType(state.type)) return getUiEnemyDamageAilmentTooltipDetail(state);
    if (state.type === 'flameDecay') return getUiFlameDecayTooltipDetail(state);
    if (state.type === 'shock') {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let increase = getUiEnemyShockTakenDamageIncreasePct(state.power, tooltipStats);
        return `${formatUiTakenDamageShockLine(increase)} <span style="color:var(--copy-bright);">${_t('(최대 생명력 대비 타격 비율 반영)')}</span>`;
    }
    let formatter = UI_ENEMY_AILMENT_DETAIL_FORMATTERS[state.type];
    return formatter ? formatter(state) : '효과가 적용 중입니다.';
}

function showEnemyAilmentTooltip(event, payload) {
    let source = payload && typeof payload === 'object' ? payload : {};
    let state = {
        type: String(source.type || 'unknown'),
        timeLeft: Math.max(0, Number(source.timeLeft) || 0),
        power: Math.max(0, Number(source.power) || 0),
        sourceHitDamage: Math.max(0, Number(source.sourceHitDamage) || 0),
        specialDps: Math.max(0, Number(source.specialDps) || 0),
        critDotBonusPct: Number(source.critDotBonusPct) || 0,
        stacks: Math.max(1, Math.floor(Number(source.stacks) || 1)),
        rawTickDamage: Math.max(0, Number(source.rawTickDamage) || 0),
        tickInterval: Math.max(0.02, Number(source.tickInterval) || 0.02),
        enemyRes: Number.isFinite(Number(source.enemyRes)) ? Number(source.enemyRes) : NaN,
        abyssPlayerMul: Number.isFinite(Number(source.abyssPlayerMul)) ? Number(source.abyssPlayerMul) : 1,
        igniteTakenMultiplier: Math.max(1, Number(source.igniteTakenMultiplier) || 1)
    };
    let visual = getUiCombatEffectPresentation(state.type);
    let powerLine = isUiDamageAilmentType(state.type) || state.type === 'hunterExpose'
        ? '' : `<div class="tooltip-line">${_t('위력: {power}', { power: state.power.toFixed(2) })}</div>`;
    let html = `<div class="tooltip-title">${escapeHTML(_t(visual.label))}</div><div class="tooltip-line">${_t('남은 시간: {ceil}초', { ceil: Math.ceil(state.timeLeft) })}</div>${powerLine}<div class="tooltip-line">${getUiEnemyAilmentTooltipDetail(state)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ffcf88');
}

/** 타겟 방식과 최대 타겟 수: 수는 전투와 같은 상한(js/player-stats.js getPlayerStats: 6, 투사체 12)으로. 데이터가 99인 룬은 제 방식으로
 * 치는 네이티브 룬이라 수를 적지 않는다(2026-10-20 검토: 99, 8, 7로 보였지만 전투는 6이었고, 광역은 4인데 6으로 보였다). */
function getGemTargetSummaryHtml(skill) {
    const label = { all: '광역', whirl: '광역 회전', cleave: '전방 다중', chain: '연쇄', pierce: '관통' }[skill.targetMode] || '단일';
    const kind = `<div class="tooltip-line">${_t('타겟 방식: {label}', { label })}</div>`;
    if ((skill.targets || 0) >= 99) return kind;
    const cap = (skill.tags || []).includes('projectile') ? 12 : 6;
    return `${kind}<div class="tooltip-line">${_t('최대 타겟 수: {min}', { min: Math.min(cap, Math.max(1, skill.targets || 1)) })}</div>`;
}

/** The rune's awakened effect line (GEM_AWAKENED_PERKS) once awakened, or from rune level 15 marked as waiting for the awakening (a new
 * rune's card stays short); '' for the others. */
function getGemAwakenedPerkLine(name, type, info) {
    const perk = type !== 'support' && Object.hasOwn(GEM_AWAKENED_PERKS, name) ? GEM_AWAKENED_PERKS[name] : null;
    if (!perk || (!info.awakened && info.baseLevel < 15)) return '';
    return `<div class="tooltip-line" style="color:#9fd6ff;">${_t('각성 효과: {label}{value}', { label: _t(perk.label), value: info.awakened ? '' : _t(' (각성 룬 변환 뒤)') })}</div>`;
}

/** 룬 요구 레벨 줄: 제한이 없으면 없고, 모자라면 붉다. */
function getRuneLevelTooltipLine(name, support) {
    const need = getRuneLevelReq(name, support);
    if (!need) return '';
    return `<div class="tooltip-line"${getRuneLevelNote(name, support) ? ' style="color:#ff9b8a;"' : ''}>${_t('요구 레벨 {need}', { need })}</div>`;
}

function showGemTooltip(event, type, name, target = null) {
    if (!target && document.getElementById('gem-selection')?.matches(':popover-open')) return;
    let cacheKey = `${i18n.language}:${type || 'active'}:${name}`;
    if (!target && reuseInfoTooltip(event, cacheKey)) return;
    let stats = cachedTooltipStats || getUiPlayerStats();
    if (gemTooltipCache && gemTooltipCache.key === cacheKey && gemTooltipCache.stats === stats) {
        if (target) { target.innerHTML = gemTooltipCache.html; return; }
        showInfoTooltipHtml(event.clientX, event.clientY, gemTooltipCache.html, gemTooltipCache.border, cacheKey);
        return;
    }
    let info = getUiGemPresentation(name, type === 'support', stats);
    let html = `<div class="tooltip-title">${escapeHTML(_t(name))}</div>${getRuneLevelTooltipLine(name, type === 'support')}`;
    if (type === 'support') {
        html += `<div class="tooltip-line">${keepKoreanUnitParticles(_t(info.desc))}</div>`;
        let tierText = typeof getSupportTierLabel === 'function' ? getSupportTierLabel(name, info.activeTier) : (info.activeTier === 3 ? '상급' : info.activeTier === 2 ? '중급' : '하급');
        let valueText = typeof formatSupportGemEffectValue === 'function' ? formatSupportGemEffectValue(info.value) : Number(info.value || 0).toFixed(1);
        html += `<div class="tooltip-line" style="margin-top:6px;">${_t('효과({tierText}): {effectText}', { tierText: _t(tierText), effectText: escapeHTML(gemSelectionUi.effectText(name, info.activeTier, stats)) })}</div>` + gemSlotDialog.tierLineHtml(name, stats);
        if (info.scaleWithOwnStat) {
            let baseText = typeof formatSupportGemEffectValue === 'function' ? formatSupportGemEffectValue(info.scaleBase) : Number(info.scaleBase || 0).toFixed(1);
            let ratioText = typeof formatSupportGemEffectValue === 'function' ? formatSupportGemEffectValue(info.scaleRatioPct) : Number(info.scaleRatioPct || 0).toFixed(1);
            html += `<div class="tooltip-line" style="color:#9fd4ff;">${_t('계산: 보조스킬룬 제외 {statName} {baseText}% × 공명 계수 {ratioText}% = +{valueText}%', { statName: _t(info.statName), baseText, ratioText, valueText })}</div>`;
            html += `<div class="tooltip-line" style="color:#b8a6ff;">${_t('제외: 이 보조스킬룬 및 다른 보조스킬룬으로 얻은 {statName} 증가', { statName: _t(info.statName) })}</div>`;
        }
        if (TAGGED_DAMAGE_STAT_BY_TAG && Object.values(TAGGED_DAMAGE_STAT_BY_TAG).includes(info.statId)) {
            let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === info.statId);
            html += `<div class="tooltip-line">${_t('적용 태그:')} <span class="gem-card-tags gem-tooltip-tags">${renderGemTagChips({ tags: [tag] }, 1)}</span></div>`;
        }
        if (SUPPORT_GEM_DB[name] && Array.isArray(SUPPORT_GEM_DB[name].tags) && SUPPORT_GEM_DB[name].tags.includes('summon')) {
            const preview = (typeof getSummonTooltipPreview === 'function') ? getSummonTooltipPreview(name, stats) : null;
            if (preview) {
                html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? _t(', 특징: {trait}', { trait: preview.trait }) : ''}</div>`;
                html += `<div class="tooltip-line">${_t('소환수 레벨: {gemLevel}', { gemLevel: preview.gemLevel })}</div>`;
                if (preview.maxHp > 0) html += `<div class="tooltip-line">${_t('수액 골렘 생명력: 약 {floor}', { floor: Math.floor(preview.maxHp).toLocaleString() })}</div>`;
                if (preview.redirectPct > 0) html += `<div class="tooltip-line">${_t('피해 대리: 히트 피해 {redirectPct}%', { redirectPct: preview.redirectPct })}</div>`;
            }
        }
    } else {
        let skill = info.skill || SKILL_DB[name];
        let rawSkillTags = Array.isArray(skill.tags) ? skill.tags : [];
        let isSummonAttackTooltip = rawSkillTags.includes('summon');
        html += `<div class="tooltip-line">${keepKoreanUnitParticles(_t(info.desc))}</div><div class="tooltip-line">${escapeHTML(gemSelectionUi.summonEffect(name, stats))}</div>`;
        if (!isSummonAttackTooltip && typeof describeSkillGridProfile === 'function') {
            html += `<div class="tooltip-line" style="margin-top:6px;color:#7fffd4;">${describeSkillGridProfile(name, skill)}</div>`;
        }
        if (!isSummonAttackTooltip) {
            html += `<div class="tooltip-line" style="margin-top:6px;color:${getItemStatToneColor('pctDmg')};">${_t('피해 배율 {dmg}', { dmg: formatPercentMultiplier(skill.dmg || skill.baseDmg || 1) })}</div>`;
            html += `<div class="tooltip-line" style="color:${getItemStatToneColor('aspd')};">${_t('공속 배율 {spd}', { spd: formatPercentMultiplier(skill.spd || skill.baseSpd || 1) })}</div>`;
        }
        if (rawSkillTags.includes('spell')) {
            let spellLv = Math.max(1, info.finalLevel || 1);
            let spellFlat = getGemSpellBaseDamage(skill, spellLv);
            html += `<div class="tooltip-line">${_t('주문 내장 피해 {floor}', { floor: Math.floor(spellFlat) })}</div>`;
        }
        if ((skill.hpDmgScale || 0) > 0) {
            let per100 = (skill.hpDmgScale || 0) * 10000;
            html += `<div class="tooltip-line">${_t('생명력 계수: 최대 생명력 100당 약 +{per100}% 내장 피해 (주문 내장 피해처럼 피해 증가 적용)', { per100: per100.toFixed(1) })}</div>`;
        }
        if ((skill.regenDmgScale || 0) > 0) html += `<div class="tooltip-line">${_t('재생 계수: 재생 1%당 {regenDmgScale}% 추가 배율', { regenDmgScale: skill.regenDmgScale.toFixed(2) })}</div>`;
        if ((skill.fireResDmgScale || 0) > 0) html += `<div class="tooltip-line">${_t('화염 저항 계수: 화염 저항 1%당 {value}% 추가 배율', { value: (skill.fireResDmgScale * 100).toFixed(2) })}</div>`;
        if ((skill.fireResOvercapMulPerPct || 0) > 0) {
            let stats = cachedTooltipStats || null;
            let rawFireRes = stats && Number.isFinite(stats.rawResF) ? stats.rawResF : null;
            let maxFireRes = stats && Number.isFinite(stats.maxResF) ? stats.maxResF : null;
            let overcapCap = Number.isFinite(Number(skill.fireResOvercapCap)) ? Math.max(0, Number(skill.fireResOvercapCap)) : Infinity;
            let appliedOvercap = rawFireRes !== null && maxFireRes !== null ? Math.max(0, rawFireRes - maxFireRes) : null;
            let effectiveOvercap = appliedOvercap !== null ? Math.min(appliedOvercap, overcapCap) : null;
            let capText = Number.isFinite(overcapCap) ? _t(' (최대 {overcapCap}%까지 적용)', { overcapCap: overcapCap.toFixed(0) }) : '';
            let currentText = rawFireRes !== null && maxFireRes !== null
                ? _t(', 현재 초과 {appliedOvercap}% 중 적용 {effectiveOvercap}% (미적용 화염 저항 {floor}% / 최대 {floor2}%)', { appliedOvercap: appliedOvercap.toFixed(1), effectiveOvercap: effectiveOvercap.toFixed(1), floor: Math.floor(rawFireRes), floor2: Math.floor(maxFireRes) })
                : ', 현재 최대 화염 저항을 초과한 미적용 화염 저항 기준';
            html += `<div class="tooltip-line">${_t('초과 화염 저항 계수: 최대 화염 저항 초과 1%당 배율 +{fireResOvercapMulPerPct}배{capText}{currentText}', { fireResOvercapMulPerPct: Number(skill.fireResOvercapMulPerPct || 0).toFixed(2), capText, currentText })}</div>`;
        }
        if (name === '화염 부패') html += `<div class="tooltip-line">${_t('특수 규칙: 공격력(기본 피해) 미적용, 적에게 화염 부패 디버프 적용, 화염 부패 대상은 점화 피해가 생명력 100당 8% 증폭(최대 {max}x)', { max: (Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1) })}</div>`;
        if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">${_t('지속 피해 배율 {dotMultiplier}x', { dotMultiplier: (skill.dotMultiplier || 1).toFixed(2) })}</div>`;
        if ((skill.multiHit || 1) > 1) html += `<div class="tooltip-line">다단 히트: 1회 시전당 ${Math.floor(skill.multiHit)}회 타격${skill.repeatHitDamagePct ? _t(', 후속 타격 {repeatHitDamagePct}%', { repeatHitDamagePct: skill.repeatHitDamagePct }) : ''}${skill.randomTargetEachHit ? _t(' (타격마다 무작위 대상)') : ''}</div>`;
        if (skill.extraProjectileDamagePct) html += `<div class="tooltip-line">${_t('추가 투사체 타격 배율: 기본 타격의 {extraProjectileDamagePct}%', { extraProjectileDamagePct: Number(skill.extraProjectileDamagePct).toFixed(0) })}</div>`;
        if (skill.ailmentChanceBonus) {
            let bonusText = Object.entries(skill.ailmentChanceBonus).map(([type, value]) => `${getAilmentDisplayLabel(type)} +${value}%`).join(' / ');
            html += `<div class="tooltip-line">${_t('상태이상 확률 보너스: {bonusText}', { bonusText })}</div>`;
        }
        if (skill.activeAilmentDamageMore) html += `<div class="tooltip-line">${_t('{type} 상태인 적에게 적중 피해 {pct}% 증폭', { type: getAilmentDisplayLabel(skill.activeAilmentDamageMore.type), pct: skill.activeAilmentDamageMore.pct })}</div>`;
        if (skill.consumeAilmentDamageMore) {
            let consumeText = skill.consumeAilmentDamageMore.map(row => _t('{type} 소모 시 {pct}%', { type: getAilmentDisplayLabel(row.type), pct: row.pct })).join(' / ');
            html += `<div class="tooltip-line">${_t('상태 소모 증폭: {consumeText} 증폭', { consumeText })}</div>`;
        }
        if (skill.ailmentSpreadOnHit) html += `<div class="tooltip-line">${_t('전파: {round}% 확률로 다른 적 {targets}기', { round: Math.round(skill.ailmentSpreadOnHit.chance * 100), targets: skill.ailmentSpreadOnHit.targets })}</div>`;
        if (skill.missingLifeDamagePct) html += `<div class="tooltip-line">${_t('잃은 생명력 비례 피해: 최대 +{missingLifeDamagePct}%', { missingLifeDamagePct: skill.missingLifeDamagePct })}</div>`;
        if (skill.executeThreshold) html += `<div class="tooltip-line">${_t('처형: 일반 적 생명력 {value}% 미만', { value: (skill.executeThreshold * 100).toFixed(0) })}</div>`;
        if (skill.periodicOnHit) html += `<div class="tooltip-line">${_t('반복 타격: {interval}초 간격, {hits}회, 적중 피해의 {damagePct}%', { interval: skill.periodicOnHit.interval, hits: skill.periodicOnHit.hits, damagePct: skill.periodicOnHit.damagePct })}</div>`;
        if (skill.dotStackCap) html += `<div class="tooltip-line">${_t('누적: 최대 {dotStackCap}중첩, 중첩당 피해 +{dotStackDamagePct}% / 둔화 +{dotStackSlowPct}%', { dotStackCap: skill.dotStackCap, dotStackDamagePct: skill.dotStackDamagePct, dotStackSlowPct: skill.dotStackSlowPct })}</div>`;
        if (skill.dotTransferOnDeath) html += `<div class="tooltip-line">${_t('처치 전파: 남은 지속 피해의 {remainingDamagePct}%를 다른 적 {targets}기에게 이전', { remainingDamagePct: skill.dotTransferOnDeath.remainingDamagePct, targets: skill.dotTransferOnDeath.targets })}</div>`;
        if (!isSummonAttackTooltip) html += getGemTargetSummaryHtml(skill);
        if ((info.tags || []).length > 0) html += `<div class="tooltip-line">${_t('태그:')} <span class="gem-card-tags gem-tooltip-tags">${renderGemTagChips(info, info.tags.length)}</span></div>`;
        if (skill.crit) html += `<div class="tooltip-line">${_t('추가 치명타 +{crit}%', { crit: Number(skill.crit).toFixed(Number.isInteger(skill.crit) ? 0 : 1) })}</div>`;
        if (skill.critScale) html += `<div class="tooltip-line">${_t('치명타 성장: 룬 레벨당 +{critScale}%', { critScale: skill.critScale })}</div>`;
        if (skill.pierceOverkillCarry) html += `<div class="tooltip-line" style="color:#8fffe0;">${_t('특수 옵션: 각 원본 타겟의 초과 피해가 다른 적에게 연속 관통')}</div>`;
        if (skill.leech) html += `<div class="tooltip-line">${_t('추가 흡혈 +{leech}%', { leech: skill.leech })}</div>`;
        if (skill.instantLeech) html += `<div class="tooltip-line" style="color:#ffb3d1;">${_t('특수 옵션: 이 룬을 사용해서 주는 피해에는 흡혈 즉시 적용')}</div>`;
        if (rawSkillTags.includes('summon_attack')) {
            const preview = (typeof getSummonTooltipPreview === 'function') ? getSummonTooltipPreview(name, stats) : null;
            if (preview) {
                html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? _t(', 특징: {trait}', { trait: preview.trait }) : ''}</div>`;
                html += `<div class="tooltip-line">${_t('소환수 레벨: {gemLevel}', { gemLevel: preview.gemLevel })}</div>`;
                html += `<div class="tooltip-line">예상 1타 피해: ${preview.hitDamageMin} ~ ${preview.hitDamageMax}${preview.attackPerSecond > 0 ? _t(', 공속 {attackPerSecond}/s', { attackPerSecond: preview.attackPerSecond }) : ''}</div>`;
                html += `<div class="tooltip-line">${_t('소환수 생명력: {floor}, 자체 재생 {floor2}/s', { floor: Math.floor(preview.maxHp).toLocaleString(), floor2: Math.floor(preview.regenPerSec).toLocaleString() })}</div>`;
                html += `<div class="tooltip-line">${_t('회피 {floor}, 현재 지역 적 기준 {evadeChancePct}%', { floor: Math.floor(preview.evasion).toLocaleString(), evadeChancePct: preview.evadeChancePct.toFixed(1) })}</div>`;
                if (preview.critChancePct > 0) html += `<div class="tooltip-line">${_t('치명타: {critChancePct}%, 치명 피해 {floor}%', { critChancePct: preview.critChancePct, floor: Math.floor(preview.critDmgPct) })}</div>`;
                if (preview.resPenBonus > 0) html += `<div class="tooltip-line">${_t('소환수 자체 저항 관통 +{resPenBonus}%', { resPenBonus: preview.resPenBonus })}</div>`;
                if (preview.physIgnoreBonus > 0) html += `<div class="tooltip-line">${_t('소환수 자체 물리 피해 감소 무시 +{physIgnoreBonus}%', { physIgnoreBonus: preview.physIgnoreBonus })}</div>`;
                if (preview.redirectPct > 0) html += `<div class="tooltip-line">${_t('피해 대리: 히트 피해 {redirectPct}%', { redirectPct: preview.redirectPct })}</div>`;
            }
        }
    }
    if (type === 'support' || SKILL_DB[name].isGem || SKILL_DB[name].levelable) {
        let gemBonusSources = info.gemBonusSources || stats.gemBonusSources;
        html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">${_t('총 레벨 {value}', { value: type === 'support' ? info.totalLevel : info.finalLevel })}</div>`;
        const sources = [['패시브', gemBonusSources.passive], ['장비', gemBonusSources.gear], ['보상', gemBonusSources.reward],
            ['룬 강화', gemCoreForge.effects(info).levels],
            ['응축 창공', info.permanentSkyBonus], ['각성', info.awakened ? 2 : 0], ['창공 각인', info.engraveLevel]];
        const levels = sources.filter(([, value]) => value > 0).map(([label, value]) => `${label} +${value}`);
        levels.unshift(_t('룬 Lv.{value}', { value: type === 'support' ? info.baseLevel : Math.min(20, info.baseLevel) }));
        html += `<div class="tooltip-line">${levels.join(', ')}</div>` + getGemAwakenedPerkLine(name, type, info);
    }
    if (info.enhanceLevel > 0) html += `<div class="tooltip-line gem-sky-tone">${_t('룬 강화 +{enhanceLevel}: {effectText}', { enhanceLevel: info.enhanceLevel, effectText: gemCoreForge.effectText(info.enhanceLevel) })}</div>`;
    if (type !== 'support' && gemDropRewards.spareCount(game, name) > 0) html += `<div class="tooltip-line">${_t('여분 {spareCount}개', { spareCount: gemDropRewards.spareCount(game, name) })}</div>`;
    let border = type === 'support' ? '#2bcbba' : '#ff5252';
    // 설명 글의 핵심어와 수치는 장비 옵션 색(2026-10-06). 이미 색이 있는 줄, 꼬리표, 제목은 그대로다.
    html = statToneText.markup(html);
    gemTooltipCache = { key: cacheKey, html: html, border: border, stats: stats };
    if (target) { target.innerHTML = html; return; }
    showInfoTooltipHtml(event.clientX, event.clientY, html, border, cacheKey);
}

/** The '세계수 기운' line of an item that remembers its atlas region (item.dropRegion), in the region's colour; '' otherwise. */
function getItemDropRegionLineHtml(item) {
    const region = item && item.dropRegion ? ATLAS.regions.find(row => row.id === item.dropRegion) : null;
    return region ? `<div class="tooltip-line" style="color:${REGION_AFFIX_TONES[region.id]};">${_t('🌳 세계수 기운: {name}', { name: escapeHTML(_t(region.name)) })}</div>` : '';
}

function getItemStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    let id = String(statId);
    let low = id.toLowerCase();
    if (ITEM_STAT_TONE_BY_ID[id]) return ITEM_STAT_TONE_BY_ID[id];

    if (low.includes('res') || low.includes('pen')) return '#ffcb8e';
    if (low.includes('chaos') || low.includes('dot') || low.includes('poison') || low.includes('bleed')) return '#c7a6ff';
    if (low.includes('fire') || low.includes('ignite') || low.includes('burn')) return '#ff9a76';
    if (low.includes('cold') || low.includes('freeze') || low.includes('chill')) return '#8fd3ff';
    if (low.includes('light') || low.includes('shock')) return '#ffe083';
    if (low.includes('hp') || low.includes('life') || low.includes('regen') || low.includes('leech')) return '#ffb3b3';
    if (low.includes('armor') || low.includes('block') || low.includes('guard') || low.includes('dr')) return '#ffd2a6';
    if (low.includes('evasion') || low.includes('dodge') || low.includes('deflect')) return '#baffc2';
    if (low.includes('energyshield') || low.includes('es')) return '#8fdcff';
    if (low.includes('crit')) return '#ffd6f2';
    if (low.includes('aspd') || low.includes('speed') || low.includes('move')) return '#fff3a8';
    if (low.includes('spell')) return '#d4a8ff';
    if (low.includes('gem') || low.includes('supp')) return '#a8e6cf';
    if (low.includes('dmg') || low.includes('atk') || low.includes('phys') || low.includes('melee') || low.includes('aoe')) return '#ffcf9f';

    return '#d7e9ff';
}

function getItemSlotDisplayLabel(item, fallbackLabel) {
    let rawSlot = item && item.slot !== undefined && item.slot !== null ? item.slot : null;
    if (rawSlot === null && item && Array.isArray(item.slots) && item.slots.length > 0) rawSlot = item.slots[0];
    let label = rawSlot !== null ? rawSlot : (fallbackLabel || '장비');
    // 부위 이름은 저장 키이기도 해서 여기서만 현재 언어로 옮긴다(docs/i18n.md).
    return _t(weaponCategorySlotLabel(item, String(label || '장비').replace(/[12]$/, '')));
}

function getItemStatRollRange(stat, options) {
    if (!stat) return null;
    let min = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : Number(stat.baseRollMin);
    let max = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.baseRollMax);
    if ((!Number.isFinite(min) || !Number.isFinite(max)) && options && options.estimateFromValue) {
        let cur = Number(stat.val || 0);
        min = Number((cur * 0.8).toFixed(2));
        max = Number((cur * 1.2).toFixed(2));
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (max < min) {
        let tmp = min;
        min = max;
        max = tmp;
    }
    return { min, max };
}

function getItemStatRollRangeHtml(stat, options) {
    let statKey = stat && (stat.id || stat.stat);
    let range = getItemStatRollRange(stat, options);
    if (!range) return '';
    return ` <span style="color:#888;">(${formatValue(statKey, range.min)}~${formatValue(statKey, range.max)})</span>`;
}

function getHoneyLockBadgeHtml(stat) {
    return stat && stat.lockedByHoney
        ? ' <span class="item-affix-lock item-affix-lock--honey" data-tip="마력 깃든 벌꿀로 고정되어 재련/소멸되지 않는 옵션">🍯 벌꿀 고정</span>'
        : '';
}

function getUniqueEffectApplicationHint(item, isEquipped, equipSlotKey) {
    if (!item || item.rarity !== 'unique' || !item.uniqueEffectKey) return '';
    let key = String(item.uniqueEffectKey || '');
    if (key === 'rightRingSummonCap') {
        if (isEquipped && equipSlotKey !== '반지2') return '현재 조건 미충족: 오른쪽 반지 슬롯에 장착해야 적용';
        return '오른쪽 반지 슬롯 전용';
    }
    let triggerLabels = {
        summonDeathDamageBuff: '소환수 사망 시 발동',
        summonCritAspdStacks: '소환수 치명타 적중 시 발동',
        blockRecoverEnergyShieldPct: '막기 성공 시 발동',
        deflectGrantShadowStealth: '비껴내기 성공 시 발동',
        hitShockedEnemyDamageMorePct: '감전된 적을 타격할 때 적용',
        stackingElementalResDownOnHit: '원소 피해 적중 시 중첩',
        projectileExtraShotChance: '투사체 공격 시 확률 발동',
        maxRollBonusHit: '최대 피해 조건을 만족한 타격 시 발동',
        leechEfficiencyOnKill: '적 처치 시 발동',
        corpseExplodeOnKill: '적 처치 시 확률 발동',
        stealEliteTrait: '정예 처치 시 발동',
        realmRiftWaveOnHit: '적중 시 확률 발동',
        realmInvulnerableBarrierOnHit: '피격 시 확률 발동',
        realmAllResDownOnHit: '적중 시 중첩',
        realmKillMoveStacks: '적 처치 시 중첩',
        meteorFootsteps: '이동 중 확률 발동',
        queenBeeSummonOnHit: '적중 시 확률 발동',
        implicitAmp: '이 장비의 기본 옵션에 적용',
        loopGrowth: '지금 루프 수만큼 적용',
        familyBond: '장착한 수평 베이스 수만큼 적용',
        sightBeyond: '탐험 지도에서 적용',
        chestLuck: '탐험 지도를 열 때 적용',
        emberHeart: '장착한 타락 장비 수만큼 적용',
        amberTime: '장착한 장비의 품질 합만큼 적용',
        witheredEcho: '목걸이에 새긴 노드 수만큼 적용',
        nurseryBloom: '그루터기 함의 성장 완료된 꽃, 열매, 덩굴, 뿌리 수만큼 적용',
        // 체이싱 고유(2026-10-20, data/items.js): 수만큼 자라는 넷과 잔잔한 사건(js/combat-incidents.js)을 바꾸는 넷, 액막이 허리띠.
        uniqueChorus: '장착한 고유 장비 수만큼 적용',
        rareBark: '장착한 희귀 장비 수만큼 적용',
        wardVow: '끼운 액막이 수만큼 적용',
        emptyPlaces: '비어 있는 장비 칸 수만큼 적용',
        critterLure: '금빛 수액 슬라임을 만날 때 적용',
        goldenTouch: '적 처치 시 확률 발동',
        repdigitLuck: '행운의 숫자에 적용',
        drowsyIncense: '처음 들어선 전투 방에서 확률 발동',
        wardString: '액막이 칸과 끼운 액막이에 적용'
    };
    if (triggerLabels[key]) return triggerLabels[key];
    if (key === 'uniqueTakenReduceWhen1Enemy') return '생존한 적이 1명일 때만 적용';
    if (key === 'uniqueTakenReduceWhen2Enemies') return '생존한 적이 2명 이상일 때만 적용';
    if (key === 'crowdEvasionMore') return '요구 적 수를 만족할 때만 적용';
    if (key === 'mirrorOppositeRing') return '반대쪽 반지의 옵션을 복제';
    if (key === 'kaleidoscopeShield') return '이 장비의 추가 옵션에 적용';
    if (/OnHit|onHit|OnKill|onKill|OnCrit|onCrit|OnBlock|onBlock/.test(key)) return '전투 조건 충족 시 발동';
    return '';
}

function getPlayerStatComparisonLines(before, after) {
    return Object.keys(COMPARE_STAT_META).map(key => {
        let diff = (after[key] || 0) - (before[key] || 0);
        if (Math.abs(diff) < 0.001) return null;
        let meta = COMPARE_STAT_META[key];
        let color = diff > 0 ? '#2ecc71' : '#e74c3c';
        let sign = diff > 0 ? '▲' : '▼';
        return `<div class="tooltip-line item-compare-line"><span style="color:${color}">${sign}</span> ${_t(meta.label)}: <span style="color:${color}">${meta.format(Math.abs(diff))}</span></div>`;
    }).filter(Boolean);
}

/** The tooltip context; a jewel or a core draws its own card here and the equipment tooltip stops (js/bag-items-ui.js). */
function prepareItemTooltip(event, item, idx, isEquip, options) {
    const context = prepareItemTooltipContext(event, item, idx, isEquip, options);
    return context && bagItemsUi.presentTooltip(context, event, item) ? null : context;
}

function prepareItemTooltipContext(event, item, idx, isEquip, options) {
    if (options.target) return { target: options.target, inline: true };
    if (equipmentInventoryInteraction.getFocusedKey()) return null;
    if (itemTooltipHideTimer) {
        clearTimeout(itemTooltipHideTimer);
        itemTooltipHideTimer = null;
    }
    let nextTooltipToken = options.token || (isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`);
    let tt = document.getElementById('item-tooltip-box');
    itemTooltipComparisonScheduler.setPointer(event);
    if (activeItemTooltipToken === nextTooltipToken && tt.style.display === 'block' && tt.innerHTML) {
        positionTooltipElement(tt, event.clientX, event.clientY);
        return null;
    }
    itemTooltipComparisonScheduler.cancel();
    activeItemTooltipToken = nextTooltipToken;
    return { target: tt, token: nextTooltipToken, inline: false };
}

function presentItemTooltip(context, event, item, html, isEquip) {
    let tt = context.target;
    tt.innerHTML = html;
    itemInfluencesUi.markTooltip(tt, item);
    if (context.inline) return;
    // 스킨이 희귀도별 머리띠·테두리를 그릴 수 있도록 표시 중인 장비의 희귀도를 남긴다.
    tt.dataset.rarity = item.rarity || 'normal';
    tt.classList.toggle('item-compare-tooltip', false);
    tt.classList.toggle('dual-compare-tooltip', false);
    invalidateTooltipSize(tt);
    tt.style.display = 'block';
    positionTooltipElement(tt, event.clientX, event.clientY);
    setActiveTooltip('item-tooltip-box');
    if (!isEquip) itemTooltipComparisonScheduler.schedule(item, context.token, html);
}

function getItemAffixTierHtml(stat) {
    const tier = isFixedEquipmentAffix(stat) ? ' <span class="tier-badge tier-badge-fixed">[T0]</span>'
        : (stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '');
    const source = equipmentCrafting.getLabel(stat);
    return `${tier}${source ? ` <span class="equipment-craft-source">, ${source}</span>` : ''}`;
}

/**
 * Renders complete equipment details, either in the hover tooltip or an inline comparison column.
 * @param {{token?: string, target?: HTMLElement}} options Inline targets do not change hover state.
 */
/** 추가 옵션 머리말: 마법과 희귀는 "추가 옵션 5/6 (접두 2/3, 접미 3/3)"(2026-10-07 접두 3, 접미 3). 예전 규칙으로 한도를 넘은
 * 장비는 머리말을 경고색으로, 아래에 한 줄 안내. */
function itemExplicitAffixHeaderHtml(item, count) {
    const used = EXPLICIT_AFFIX_RULES[item.rarity] ? equipmentCrafting.affixCounts(item) : null;
    const header = item.fusedRelic
        ? { text: `추가 옵션 ${count}개 (계승 ${item.stats.filter(stat => stat.fusedFromRare).length}개)`, over: false }
        : equipmentCrafting.affixHeader(item.rarity, count, used);
    const style = header.over ? ' style="color:#ffb454;"' : '';
    const note = header.over ? `<div class="tooltip-line" style="color:#ffb454;">${_t('레거시 아이템')}</div>` : '';
    return `<div class="tooltip-line tooltip-section tooltip-section-explicit"${style}><span class="px-center">${_t(header.text)}</span></div>${note}`;
}

/** The base line's badge: the upgrade step ([2/4]). The 수평 word for a horizontal base is gone (2026-11-08 사용자: 무엇인지 모르겠다, 문구 삭제). */
function getItemBaseBadgesHtml(item) {
    let info = typeof getItemBaseChainInfo === 'function' ? getItemBaseChainInfo(item) : null;
    let step = info && info.total > 1
        ? ` <span class="${getBaseStepClassName(info)}" data-tip="${_t('업그레이드 단계 (낮을수록 하위, 높을수록 상위 베이스)')}">[${info.step}/${info.total}]</span>` : '';
    return step;
}

function showItemTooltip(event, idx, isEquip, itemOverride, options = {}) {
    let item = itemOverride || (isEquip ? game.equipment[idx] : game.inventory[idx]);
    let resolveItemStatTone = (statId) => getItemStatToneColor(statId);
    if (!item) return;
    let context = prepareItemTooltip(event, item, idx, isEquip, options);
    if (!context) return;
    const inactiveAffixes = equipmentInspectionUi.getInactiveAffixIds(cachedTooltipStats, game.equippedSummonSkills);
    const affixClass = statId => inactiveAffixes.has(statId) ? ' class="equipment-affix-inactive"' : '';
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    let html = `<div class="tooltip-title" style="color:${getRarityColor(item.rarity)}"><span class="px-center">[${getItemSlotDisplayLabel(item)}] ${escapeHTML(getItemDisplayName(item))}${exceptionalStars}${item.encroached ? ` <span style="color:#b084ff;">${_t('(잠식)')}</span>` : ''}${item.corrupted ? ` <span style="color:#e74c3c;">${_t('(타락)')}</span>` : ''}${craftingWorkspaceUi.imprintMark(item)}${item.loopSealed ? ` <span style="color:#7fd99a;" data-tip="${_t('나무꾼의 손길로 봉인됨: 루프가 지나도 유지')}">${_t('🌿봉인')}</span>` : ''}</span></div>${itemInfluencesUi.tooltipHtml(item)}`;
    if (item.hallReplica) html += `<div class="tooltip-line" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${escapeHTML(item.hallCuratorName || '익명')}, 감정 ${Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString()}, 제작/재등록 불가</div>`;
    else if (item.hallRelistBlocked) html += '<div class="tooltip-line" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>';
    html += `<div class="tooltip-line tooltip-meta tooltip-meta-base">${_t('베이스')}: ${escapeHTML(_t(item.baseName))}${getItemBaseBadgesHtml(item)}</div>`;
    html += `<div class="tooltip-line tooltip-meta">${_t('아이템 Lv.')}${item.itemLevel || levelProgression.tierLevel(item.hiddenTier || item.itemTier)} &ensp; ${_t('등급|티어')} ${getTierBadgeHtml(getItemCraftTier(item), 'T')}</div>${levelProgressionUi.item(item, isEquip, idx)}`;
    if (item.rarity === 'unique' && item.uniqueEffect) {
        let uniqueGlow = 'display:inline-block;padding:1px 6px;border-radius:6px;border:1px solid rgba(198,162,255,0.55);background:linear-gradient(135deg, rgba(73,52,108,0.45) 0%, rgba(31,23,56,0.5) 100%);color:#f0dcff;font-weight:700;text-shadow:0 0 6px rgba(196,154,255,0.8),0 0 12px rgba(142,109,214,0.55);box-shadow:0 0 10px rgba(140,94,220,0.4),inset 0 0 10px rgba(229,205,255,0.2);';
        html += `<div class="tooltip-line" style="margin-top:6px;"><span style="${uniqueGlow}">✨ ${_t('고유 효과')}: ${escapeHTML(_t(item.uniqueEffect))}</span></div>`;
        let applicationHint = getUniqueEffectApplicationHint(item, !!isEquip, isEquip ? idx : null);
        if (applicationHint) html += `<div class="tooltip-line" style="color:#bda9d8; margin-top:3px;">◆ ${escapeHTML(applicationHint)}</div>`;
    }
    html += equipmentSocketsUi.tooltipHtml(item) + getItemDropRegionLineHtml(item);
    if (item.fusedRelic) {
        let fusionGradeLabel = _t(item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합'));
        html += `<div class="tooltip-line" style="color:#8fd8ff;">⌛ ${fusionGradeLabel}${item.fusedRareName ? _t(', [{fusedRareName}]의 기억', { fusedRareName: escapeHTML(item.fusedRareName) }) : ''}, 황금률/잿불가지/축복의 꽃잎만 사용 가능</div>`;
    }
    let defenseView = itemTooltipRules.defenseView(item);
    if ((item.baseStats || []).length > 0) {
        html += `<div class="tooltip-line tooltip-section tooltip-section-base"><span class="px-center">${_t('베이스 옵션')}</span></div>${colonyWardsUi.beltLineHtml(item)}`;
        item.baseStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            if (statKey === 'armor' || statKey === 'evasion' || statKey === 'energyShield') return;
            let cur = Number(stat.val || 0);
            let rangeText = getItemStatRollRangeHtml(stat, { estimateFromValue: true });
            let label = escapeHTML(_t(stat.statName || getStatName(statKey)) || statKey);   // the stat name goes through the language pack (2026-11-03)
            let valueColor = stat.exceptional ? '#ffb454' : resolveItemStatTone(statKey);
            let exMark = (stat.exceptional ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '') + itemInfluencesUi.lineBadgeHtml(item, stat);
            html += `<div class="tooltip-line"><span${affixClass(statKey)}><span style="color:${resolveItemStatTone(statKey)};">${label} </span><span style="color:${valueColor};">${formatSignedValue(statKey, cur)}</span></span>${rangeText}${exMark}</div>`;
        });
        ['armor','evasion','energyShield'].forEach(id => {
            let label = escapeHTML(getStatName(id));
            let finalVal = defenseView[id];
            let baseVal = defenseView.base[id];
            if (finalVal <= 0 && baseVal <= 0) return;
            let src = (item.baseStats || []).find(stat => stat && stat.id === id);
            let rangeText = '';
            if (src) {
                rangeText = getItemStatRollRangeHtml(src, { estimateFromValue: true });
            }
            let valueColor = (src && src.exceptional) ? '#ffb454' : resolveItemStatTone(id);
            let exMark = (src && src.exceptional) ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '';
            if (Math.floor(finalVal) === Math.floor(baseVal)) {
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(baseVal)}</span>${rangeText}${exMark}</div>`;
            } else {
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(finalVal)}</span> <span style="color:var(--copy-bright);">(${Math.floor(baseVal)})</span>${rangeText}${exMark}</div>`;
            }
        });
    }
    let explicitStats = (item.stats || []).slice();
    if (item.chaosInfusion) explicitStats.push({ ...item.chaosInfusion, statName: _t('[주입] {statName}', { statName: _t(item.chaosInfusion.statName || getStatName(item.chaosInfusion.id)) }) });
    if (explicitStats.length > 0) {
        explicitStats.sort(itemTooltipRules.compareStats);
        html += itemExplicitAffixHeaderHtml(item, explicitStats.length);
        explicitStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            let tierText = getItemAffixTierHtml(stat);
            let rangeText = `${getItemStatRollRangeHtml(stat)}${tierText}`;
            let honeyLockText = getHoneyLockBadgeHtml(stat) + emberCorruptionUi.scaleBadgeHtml(stat) + itemInfluencesUi.lineBadgeHtml(item, stat);
            let label = escapeHTML(_t(stat.statName || getStatName(statKey)) || statKey);   // the stat name goes through the language pack (2026-11-03)
            // 복합 옵션은 한 줄에 두 스탯까지 표기하고, 듀얼+복합처럼 길어지는 경우 다음 줄로 넘긴다.
            if (Array.isArray(stat.extraStats) && stat.extraStats.length > 0) {
                let parts = [`<span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${escapeHTML(getStatName(statKey))} +${formatValue(statKey, stat.val)}</span>`];
                stat.extraStats.forEach(extra => {
                    let exKey = extra && (extra.id || extra.stat);
                    parts.push(`<span${affixClass(exKey)} style="color:${resolveItemStatTone(exKey)};">${escapeHTML(getStatName(exKey))} +${formatValue(exKey, extra.val)}</span>`);
                });
                for (let i = 0; i < parts.length; i += 2) {
                    let chunk = parts.slice(i, i + 2).join(' <span style="color:var(--copy-muted);">/</span> ');
                    let continuation = i > 0 ? ' compound-option-continuation' : '';
                    let indent = i > 0 ? 'padding-left:14px;' : '';
                    let suffix = i === 0 ? `${rangeText}${honeyLockText}` : '';
                    html += `<div class="tooltip-line${continuation}" style="${indent}">${chunk}${suffix}</div>`;
                }
                return;
            }
            html += `<div class="tooltip-line"><span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${label} +${formatValue(statKey, stat.val)}</span>${rangeText}${honeyLockText}</div>`;
        });
    } else {
        html += itemTooltipRules.emptyExplicitHtml(item);
    }
    if (item.encroached) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#b084ff;">${_t('잠식 특수 옵션')}</div>`;
        if (item.encroached.liberated && item.encroached.chosen) {
            let st = item.encroached.chosen;
            html += `<div class="tooltip-line" style="color:#d7b8ff;">${_t('[잠식] {statName} +{id} {tier}', { statName: escapeHTML(_t(st.statName || getStatName(st.id))), id: formatValue(st.id, st.val), tier: getTierBadgeHtml(st.tier || 10, 'T') })}</div>`;
        } else {
            html += `<div class="tooltip-line" style="color:#8d7bb3;">${_t('해방 전에는 효과 없음, 모든 제작으로도 변하지 않음')}</div>`;
        }
    }

    presentItemTooltip(context, event, item, html + sapCatalystsUi.qualityHtml(item) + gardenOilsUi.tooltipHtml(item) + emberCorruptionUi.tooltipHtml(item) + weaponMasteryUi.tooltipHtml(item), isEquip);
}

function showCombatLogItemTooltip(event, token) {
    let item = combatLogItemSnapshots.get(Number(token));
    if (!item) return;
    showItemTooltip(event, null, false, item, { token: `log:${token}:snapshot` });
}

function openCombatLogItemEquipment(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    dismissItemTooltipNow();
    switchTab('tab-items');
    if (document.body.classList.contains('desktop-windowed-ui') && typeof openWindow === 'function') openWindow('tab-items');
    switchItemSubtab('item-tab-equip');
}

function hideCombatLogItemTooltip(event) {
    hideItemTooltip(event);
}

function dismissItemTooltipNow() {
    itemTooltipComparisonScheduler.cancel();
    itemTooltipComparisonScheduler.setPointer(null);
    activeItemTooltipToken = null;
    clearActiveTooltip('item-tooltip-box');
    document.getElementById('item-tooltip-box').style.display = 'none';
}

function validateItemTooltipAnchor() {
    if (!activeItemTooltipToken) return;
    let [scope, key, idText] = String(activeItemTooltipToken).split(':');
    if (scope === 'log') {
        if (!combatLogItemSnapshots.has(Number(key))) hideItemTooltip();
        return;
    }
    let expectedId = Number(idText);
    if (!Number.isFinite(expectedId)) return hideItemTooltip();
    let valid = false;
    if (scope === 'equip') {
        let eqItem = game.equipment && game.equipment[key];
        valid = !!eqItem && eqItem.id === expectedId;
    } else if (scope === 'inv') {
        let idx = Number(key);
        let invItem = Array.isArray(game.inventory) ? game.inventory[idx] : null;
        valid = !!invItem && invItem.id === expectedId;
    }
    if (!valid) hideItemTooltip();
}

exposeFileGlobals({ applyTooltipPosition, positionTooltipElement, invalidateTooltipSize, reuseInfoTooltip, setActiveTooltip, clearActiveTooltip, showInfoTooltipHtml, hideInfoTooltip, showSporeCraftTooltip, showStatTooltip, showPlayerAilmentTooltip, showPlayerEhpTooltip, showMapProgressTooltip, showPlayerExperienceTooltip, showPlayerRuntimeEffectTooltip, showPlayerNamedEffectTooltip, showPlayerCosmosDebuffTooltip, showPlayerBuffTooltip, showEnemyAilmentTooltip, showGemTooltip, getItemStatToneColor, getItemSlotDisplayLabel, getItemStatRollRange, getItemStatRollRangeHtml, getUniqueEffectApplicationHint, getPlayerStatComparisonLines, prepareItemTooltip, presentItemTooltip, getItemAffixTierHtml, showItemTooltip, showCombatLogItemTooltip, openCombatLogItemEquipment, hideCombatLogItemTooltip, dismissItemTooltipNow, validateItemTooltipAnchor });
})();

safeExposeGlobals({ showSporeCraftTooltip, showPlayerEhpTooltip, showMapProgressTooltip });
