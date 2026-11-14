import { reuseInfoTooltip } from './tooltip-core.mjs';
import { keepKoreanUnitParticles } from '../common/text.mjs';

/** 타겟 방식과 최대 타겟 수: 수는 전투와 같은 상한(js/player-stats.js getPlayerStats: 6, 투사체 12)으로. 데이터가 99인 룬은 제 방식으로
* 치는 네이티브 룬이라 수를 적지 않는다(2026-10-20 검토: 99, 8, 7로 보였지만 전투는 6이었고, 광역은 4인데 6으로 보였다). */
export function getGemTargetSummaryHtml(runtime, skill) {
    const label = { all: '광역', whirl: '광역 회전', cleave: '전방 다중', chain: '연쇄', pierce: '관통' }[skill.targetMode] || '단일';
    const kind = `<div class="tooltip-line">${(0, runtime.deps._t)('타겟 방식: {label}', { label })}</div>`;
    if ((skill.targets || 0) >= 99) return kind;
    const cap = (skill.tags || []).includes('projectile') ? 12 : 6;
    return `${kind}<div class="tooltip-line">${(0, runtime.deps._t)('최대 타겟 수: {min}', { min: Math.min(cap, Math.max(1, skill.targets || 1)) })}</div>`;
}

/** The rune's awakened effect line (GEM_AWAKENED_PERKS) once awakened, or from rune level 15 marked as waiting for the awakening (a new
* rune's card stays short); '' for the others. */
export function getGemAwakenedPerkLine(runtime, name, type, info) {
    const perk = type !== 'support' && Object.hasOwn(runtime.deps.GEM_AWAKENED_PERKS, name) ? runtime.deps.GEM_AWAKENED_PERKS[name] : null;
    if (!perk || (!info.awakened && info.baseLevel < 15)) return '';
    return `<div class="tooltip-line" style="color:#9fd6ff;">${(0, runtime.deps._t)('각성 효과: {label}{value}', { label: (0, runtime.deps._t)(perk.label), value: info.awakened ? '' : (0, runtime.deps._t)(' (각성 룬 변환 뒤)') })}</div>`;
}

/** 룬 요구 레벨 줄: 제한이 없으면 없고, 모자라면 붉다. */
export function getRuneLevelTooltipLine(runtime, name, support) {
    const need = (0, runtime.deps.getRuneLevelReq)(name, support);
    if (!need) return '';
    return `<div class="tooltip-line"${(0, runtime.deps.getRuneLevelNote)(name, support) ? ' style="color:#ff9b8a;"' : ''}>${(0, runtime.deps._t)('요구 레벨 {need}', { need })}</div>`;
}

export function showGemTooltip(runtime, event, type, name, target = null) {
    if (gemTooltipCovered(runtime, target)) return;
    let cacheKey = `${runtime.deps.i18n.language}:${type || 'active'}:${name}`;
    if (!target && reuseInfoTooltip(runtime, event, cacheKey)) return;
    let stats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)();
    if (reuseGemTooltipCache(runtime, event, target, { key: cacheKey, stats })) return;
    let info = (0, runtime.deps.getUiGemPresentation)(name, type === 'support', stats);
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</div>${getRuneLevelTooltipLine(runtime, name, type === 'support')}`;
    if (type === 'support') {
        html = appendSupportRuneDetails(runtime, html, { info, name, stats });
    } else {
        html = appendActiveRuneDetails(runtime, html, { info, name, stats });
    }
    html = appendRuneProgression(runtime, html, { type, name, info, stats });
    let border = type === 'support' ? '#2bcbba' : '#ff5252';
    // 설명 글의 핵심어와 수치는 장비 옵션 색(2026-10-06). 이미 색이 있는 줄, 꼬리표, 제목은 그대로다.
    html = runtime.deps.statToneText.markup(html);
    runtime.state.gemTooltipCache = { key: cacheKey, html: html, border: border, stats: stats };
    presentGemTooltip(runtime, event, target, runtime.state.gemTooltipCache);
}

function appendSupportSummonPreview(runtime, html, context) {
    const { name, stats } = context;
    if (runtime.deps.SUPPORT_GEM_DB[name] && Array.isArray(runtime.deps.SUPPORT_GEM_DB[name].tags) && runtime.deps.SUPPORT_GEM_DB[name].tags.includes('summon')) {
        const preview = (typeof runtime.deps.getSummonTooltipPreview === 'function') ? (0, runtime.deps.getSummonTooltipPreview)(name, stats) : null;
        if (preview) {
            html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? (0, runtime.deps._t)(', 특징: {trait}', { trait: preview.trait }) : ''}</div>`;
            html += `<div class="tooltip-line">${(0, runtime.deps._t)('소환수 레벨: {gemLevel}', { gemLevel: preview.gemLevel })}</div>`;
            if (preview.maxHp > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('수액 골렘 생명력: 약 {floor}', { floor: Math.floor(preview.maxHp).toLocaleString() })}</div>`;
            if (preview.redirectPct > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('피해 대리: 히트 피해 {redirectPct}%', { redirectPct: preview.redirectPct })}</div>`;
        }
    }
    return html;
}

function appendSupportRuneScaling(runtime, html, context) {
    const { info, valueText } = context;
    if (info.scaleWithOwnStat) {
        let baseText = typeof runtime.deps.formatSupportGemEffectValue === 'function' ? (0, runtime.deps.formatSupportGemEffectValue)(info.scaleBase) : Number(info.scaleBase || 0).toFixed(1);
        let ratioText = typeof runtime.deps.formatSupportGemEffectValue === 'function' ? (0, runtime.deps.formatSupportGemEffectValue)(info.scaleRatioPct) : Number(info.scaleRatioPct || 0).toFixed(1);
        html += `<div class="tooltip-line" style="color:#9fd4ff;">${(0, runtime.deps._t)('계산: 보조스킬룬 제외 {statName} {baseText}% × 공명 계수 {ratioText}% = +{valueText}%', { statName: (0, runtime.deps._t)(info.statName), baseText, ratioText, valueText })}</div>`;
        html += `<div class="tooltip-line" style="color:#b8a6ff;">${(0, runtime.deps._t)('제외: 이 보조스킬룬 및 다른 보조스킬룬으로 얻은 {statName} 증가', { statName: (0, runtime.deps._t)(info.statName) })}</div>`;
    }
    return html;
}

function appendSupportRuneDetails(runtime, html, context) {
    const { info, name, stats } = context;
    html += `<div class="tooltip-line">${keepKoreanUnitParticles((0, runtime.deps._t)(info.desc))}</div>`;
    let tierText = typeof runtime.deps.getSupportTierLabel === 'function' ? (0, runtime.deps.getSupportTierLabel)(name, info.activeTier) : (info.activeTier === 3 ? '상급' : info.activeTier === 2 ? '중급' : '하급');
    let valueText = typeof runtime.deps.formatSupportGemEffectValue === 'function' ? (0, runtime.deps.formatSupportGemEffectValue)(info.value) : Number(info.value || 0).toFixed(1);
    html += `<div class="tooltip-line" style="margin-top:6px;">${(0, runtime.deps._t)('효과({tierText}): {effectText}', { tierText: (0, runtime.deps._t)(tierText), effectText: (0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.effectText(name, info.activeTier, stats)) })}</div>` + runtime.deps.gemSlotDialog.tierLineHtml(name, stats);
    html = appendSupportRuneScaling(runtime, html, { info, valueText });
    if (runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG && Object.values(runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG).includes(info.statId)) {
        let tag = Object.keys(runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG).find(key => runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG[key] === info.statId);
        html += `<div class="tooltip-line">${(0, runtime.deps._t)('적용 태그:')} <span class="gem-card-tags gem-tooltip-tags">${(0, runtime.deps.renderGemTagChips)({ tags: [tag] }, 1)}</span></div>`;
    }
    html = appendSupportSummonPreview(runtime, html, { name, stats });
    return html;
}

function appendAttackSummonPreview(runtime, html, context) {
    const { rawSkillTags, name, stats } = context;
    if (rawSkillTags.includes('summon_attack')) {
        const preview = (typeof runtime.deps.getSummonTooltipPreview === 'function') ? (0, runtime.deps.getSummonTooltipPreview)(name, stats) : null;
        if (preview) {
            html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? (0, runtime.deps._t)(', 특징: {trait}', { trait: preview.trait }) : ''}</div>`;
            html += `<div class="tooltip-line">${(0, runtime.deps._t)('소환수 레벨: {gemLevel}', { gemLevel: preview.gemLevel })}</div>`;
            html += `<div class="tooltip-line">예상 1타 피해: ${preview.hitDamageMin} ~ ${preview.hitDamageMax}${preview.attackPerSecond > 0 ? (0, runtime.deps._t)(', 공속 {attackPerSecond}/s', { attackPerSecond: preview.attackPerSecond }) : ''}</div>`;
            html += `<div class="tooltip-line">${(0, runtime.deps._t)('소환수 생명력: {floor}, 자체 재생 {floor2}/s', { floor: Math.floor(preview.maxHp).toLocaleString(), floor2: Math.floor(preview.regenPerSec).toLocaleString() })}</div>`;
            html += `<div class="tooltip-line">${(0, runtime.deps._t)('회피 {floor}, 현재 지역 적 기준 {evadeChancePct}%', { floor: Math.floor(preview.evasion).toLocaleString(), evadeChancePct: preview.evadeChancePct.toFixed(1) })}</div>`;
            if (preview.critChancePct > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('치명타: {critChancePct}%, 치명 피해 {floor}%', { critChancePct: preview.critChancePct, floor: Math.floor(preview.critDmgPct) })}</div>`;
            if (preview.resPenBonus > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('소환수 자체 저항 관통 +{resPenBonus}%', { resPenBonus: preview.resPenBonus })}</div>`;
            if (preview.physIgnoreBonus > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('소환수 자체 물리 피해 감소 무시 +{physIgnoreBonus}%', { physIgnoreBonus: preview.physIgnoreBonus })}</div>`;
            if (preview.redirectPct > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('피해 대리: 히트 피해 {redirectPct}%', { redirectPct: preview.redirectPct })}</div>`;
        }
    }
    return html;
}

function appendFireOvercapScaling(runtime, html, context) {
    const { skill } = context;
    if ((skill.fireResOvercapMulPerPct || 0) > 0) {
        const { rawFireRes, maxFireRes, overcapCap, appliedOvercap, effectiveOvercap } = fireOvercapValues(runtime, skill);
        let capText = Number.isFinite(overcapCap) ? (0, runtime.deps._t)(' (최대 {overcapCap}%까지 적용)', { overcapCap: overcapCap.toFixed(0) }) : '';
        let currentText = rawFireRes !== null && maxFireRes !== null
            ? (0, runtime.deps._t)(', 현재 초과 {appliedOvercap}% 중 적용 {effectiveOvercap}% (미적용 화염 저항 {floor}% / 최대 {floor2}%)', { appliedOvercap: appliedOvercap.toFixed(1), effectiveOvercap: effectiveOvercap.toFixed(1), floor: Math.floor(rawFireRes), floor2: Math.floor(maxFireRes) })
            : ', 현재 최대 화염 저항을 초과한 미적용 화염 저항 기준';
        html += `<div class="tooltip-line">${(0, runtime.deps._t)('초과 화염 저항 계수: 최대 화염 저항 초과 1%당 배율 +{fireResOvercapMulPerPct}배{capText}{currentText}', { fireResOvercapMulPerPct: Number(skill.fireResOvercapMulPerPct || 0).toFixed(2), capText, currentText })}</div>`;
    }
    return html;
}

function appendRuneLifeScaling(runtime, html, context) {
    const { skill } = context;
    if ((skill.hpDmgScale || 0) > 0) {
        let per100 = (skill.hpDmgScale || 0) * 10000;
        html += `<div class="tooltip-line">${(0, runtime.deps._t)('생명력 계수: 최대 생명력 100당 약 +{per100}% 내장 피해 (주문 내장 피해처럼 피해 증가 적용)', { per100: per100.toFixed(1) })}</div>`;
    }
    if ((skill.regenDmgScale || 0) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('재생 계수: 재생 1%당 {regenDmgScale}% 추가 배율', { regenDmgScale: skill.regenDmgScale.toFixed(2) })}</div>`;
    if ((skill.fireResDmgScale || 0) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('화염 저항 계수: 화염 저항 1%당 {value}% 추가 배율', { value: (skill.fireResDmgScale * 100).toFixed(2) })}</div>`;
    return html;
}

function appendRuneHitDetails(runtime, html, context) {
    const { skill, name } = context;
    html = appendRuneDotMultiplier(runtime, html, { skill, name });
    if ((skill.multiHit || 1) > 1) html += `<div class="tooltip-line">다단 히트: 1회 시전당 ${Math.floor(skill.multiHit)}회 타격${skill.repeatHitDamagePct ? (0, runtime.deps._t)(', 후속 타격 {repeatHitDamagePct}%', { repeatHitDamagePct: skill.repeatHitDamagePct }) : ''}${skill.randomTargetEachHit ? (0, runtime.deps._t)(' (타격마다 무작위 대상)') : ''}</div>`;
    if (skill.extraProjectileDamagePct) html += `<div class="tooltip-line">${(0, runtime.deps._t)('추가 투사체 타격 배율: 기본 타격의 {extraProjectileDamagePct}%', { extraProjectileDamagePct: Number(skill.extraProjectileDamagePct).toFixed(0) })}</div>`;
    if (skill.ailmentChanceBonus) {
        let bonusText = Object.entries(skill.ailmentChanceBonus).map(([type, value]) => `${(0, runtime.deps.getAilmentDisplayLabel)(type)} +${value}%`).join(' / ');
        html += `<div class="tooltip-line">${(0, runtime.deps._t)('상태이상 확률 보너스: {bonusText}', { bonusText })}</div>`;
    }
    return html;
}

function appendRuneAilmentDetails(runtime, html, context) {
    const { skill } = context;
    if (skill.activeAilmentDamageMore) html += `<div class="tooltip-line">${(0, runtime.deps._t)('{type} 상태인 적에게 적중 피해 {pct}% 증폭', { type: (0, runtime.deps.getAilmentDisplayLabel)(skill.activeAilmentDamageMore.type), pct: skill.activeAilmentDamageMore.pct })}</div>`;
    if (skill.consumeAilmentDamageMore) {
        let consumeText = skill.consumeAilmentDamageMore.map(row => (0, runtime.deps._t)('{type} 소모 시 {pct}%', { type: (0, runtime.deps.getAilmentDisplayLabel)(row.type), pct: row.pct })).join(' / ');
        html += `<div class="tooltip-line">${(0, runtime.deps._t)('상태 소모 증폭: {consumeText} 증폭', { consumeText })}</div>`;
    }
    if (skill.ailmentSpreadOnHit) html += `<div class="tooltip-line">${(0, runtime.deps._t)('전파: {round}% 확률로 다른 적 {targets}기', { round: Math.round(skill.ailmentSpreadOnHit.chance * 100), targets: skill.ailmentSpreadOnHit.targets })}</div>`;
    if (skill.missingLifeDamagePct) html += `<div class="tooltip-line">${(0, runtime.deps._t)('잃은 생명력 비례 피해: 최대 +{missingLifeDamagePct}%', { missingLifeDamagePct: skill.missingLifeDamagePct })}</div>`;
    if (skill.executeThreshold) html += `<div class="tooltip-line">${(0, runtime.deps._t)('처형: 일반 적 생명력 {value}% 미만', { value: (skill.executeThreshold * 100).toFixed(0) })}</div>`;
    if (skill.periodicOnHit) html += `<div class="tooltip-line">${(0, runtime.deps._t)('반복 타격: {interval}초 간격, {hits}회, 적중 피해의 {damagePct}%', { interval: skill.periodicOnHit.interval, hits: skill.periodicOnHit.hits, damagePct: skill.periodicOnHit.damagePct })}</div>`;
    return html;
}

function appendRuneTargetDetails(runtime, html, context) {
    const { skill, isSummonAttackTooltip, info } = context;
    if (skill.dotStackCap) html += `<div class="tooltip-line">${(0, runtime.deps._t)('누적: 최대 {dotStackCap}중첩, 중첩당 피해 +{dotStackDamagePct}% / 둔화 +{dotStackSlowPct}%', { dotStackCap: skill.dotStackCap, dotStackDamagePct: skill.dotStackDamagePct, dotStackSlowPct: skill.dotStackSlowPct })}</div>`;
    if (skill.dotTransferOnDeath) html += `<div class="tooltip-line">${(0, runtime.deps._t)('처치 전파: 남은 지속 피해의 {remainingDamagePct}%를 다른 적 {targets}기에게 이전', { remainingDamagePct: skill.dotTransferOnDeath.remainingDamagePct, targets: skill.dotTransferOnDeath.targets })}</div>`;
    if (!isSummonAttackTooltip) html += getGemTargetSummaryHtml(runtime, skill);
    if ((info.tags || []).length > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('태그:')} <span class="gem-card-tags gem-tooltip-tags">${(0, runtime.deps.renderGemTagChips)(info, info.tags.length)}</span></div>`;
    return html;
}

function appendRuneCritAndLeech(runtime, html, context) {
    const { skill } = context;
    if (skill.crit) html += `<div class="tooltip-line">${(0, runtime.deps._t)('추가 치명타 +{crit}%', { crit: Number(skill.crit).toFixed(Number.isInteger(skill.crit) ? 0 : 1) })}</div>`;
    if (skill.critScale) html += `<div class="tooltip-line">${(0, runtime.deps._t)('치명타 성장: 룬 레벨당 +{critScale}%', { critScale: skill.critScale })}</div>`;
    if (skill.pierceOverkillCarry) html += `<div class="tooltip-line" style="color:#8fffe0;">${(0, runtime.deps._t)('특수 옵션: 각 원본 타겟의 초과 피해가 다른 적에게 연속 관통')}</div>`;
    if (skill.leech) html += `<div class="tooltip-line">${(0, runtime.deps._t)('추가 흡혈 +{leech}%', { leech: skill.leech })}</div>`;
    if (skill.instantLeech) html += `<div class="tooltip-line" style="color:#ffb3d1;">${(0, runtime.deps._t)('특수 옵션: 이 룬을 사용해서 주는 피해에는 흡혈 즉시 적용')}</div>`;
    return html;
}

function appendRuneDamageDetails(runtime, html, context) {
    const { info, name, stats, skill, isSummonAttackTooltip, rawSkillTags } = context;
    html += `<div class="tooltip-line">${keepKoreanUnitParticles((0, runtime.deps._t)(info.desc))}</div><div class="tooltip-line">${(0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.summonEffect(name, stats))}</div>`;
    if (!isSummonAttackTooltip && typeof runtime.deps.describeSkillGridProfile === 'function') {
        html += `<div class="tooltip-line" style="margin-top:6px;color:#7fffd4;">${(0, runtime.deps.describeSkillGridProfile)(name, skill)}</div>`;
    }
    if (!isSummonAttackTooltip) {
        html += `<div class="tooltip-line" style="margin-top:6px;color:${(0, runtime.deps.getItemStatToneColor)('pctDmg')};">${(0, runtime.deps._t)('피해 배율 {dmg}', { dmg: (0, runtime.deps.formatPercentMultiplier)(skill.dmg || skill.baseDmg || 1) })}</div>`;
        html += `<div class="tooltip-line" style="color:${(0, runtime.deps.getItemStatToneColor)('aspd')};">${(0, runtime.deps._t)('공속 배율 {spd}', { spd: (0, runtime.deps.formatPercentMultiplier)(skill.spd || skill.baseSpd || 1) })}</div>`;
    }
    if (rawSkillTags.includes('spell')) {
        let spellLv = Math.max(1, info.finalLevel || 1);
        let spellFlat = (0, runtime.deps.getGemSpellBaseDamage)(skill, spellLv);
        html += `<div class="tooltip-line">${(0, runtime.deps._t)('주문 내장 피해 {floor}', { floor: Math.floor(spellFlat) })}</div>`;
    }
    return html;
}

function appendRuneProgression(runtime, html, context) {
    const { type, name, info, stats } = context;
    if (type === 'support' || runtime.deps.SKILL_DB[name].isGem || runtime.deps.SKILL_DB[name].levelable) {
        let gemBonusSources = info.gemBonusSources || stats.gemBonusSources;
        html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">${(0, runtime.deps._t)('총 레벨 {value}', { value: type === 'support' ? info.totalLevel : info.finalLevel })}</div>`;
        const sources = [['패시브', gemBonusSources.passive], ['장비', gemBonusSources.gear], ['보상', gemBonusSources.reward],
            ['룬 강화', runtime.deps.gemCoreForge.effects(info).levels],
            ['응축 창공', info.permanentSkyBonus], ['각성', info.awakened ? 2 : 0], ['창공 각인', info.engraveLevel]];
        const levels = sources.filter(([, value]) => value > 0).map(([label, value]) => `${label} +${value}`);
        levels.unshift((0, runtime.deps._t)('룬 Lv.{value}', { value: type === 'support' ? info.baseLevel : Math.min(20, info.baseLevel) }));
        html += `<div class="tooltip-line">${levels.join(', ')}</div>` + getGemAwakenedPerkLine(runtime, name, type, info);
    }
    html = appendRuneEnhancement(runtime, html, { type, name, info });
    return html;
}

function gemTooltipCovered(runtime, target) {
    return !target && runtime.deps.document.getElementById('gem-selection')?.matches(':popover-open');
}

function reuseGemTooltipCache(runtime, event, target, request) {
    const entry = runtime.state.gemTooltipCache;
    if (!entry || entry.key !== request.key || entry.stats !== request.stats) return false;
    presentGemTooltip(runtime, event, target, entry);
    return true;
}

function presentGemTooltip(runtime, event, target, entry) {
    if (target) target.innerHTML = entry.html;
    else runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, entry.html, entry.border, entry.key);
}

function appendActiveRuneDetails(runtime, html, context) {
    const { info, name, stats } = context;
    let skill = info.skill || runtime.deps.SKILL_DB[name];
    let rawSkillTags = Array.isArray(skill.tags) ? skill.tags : [];
    let isSummonAttackTooltip = rawSkillTags.includes('summon');
    html = appendRuneDamageDetails(runtime, html, { info, name, stats, skill, isSummonAttackTooltip, rawSkillTags });
    html = appendRuneLifeScaling(runtime, html, { skill });
    html = appendFireOvercapScaling(runtime, html, { skill });
    html = appendRuneHitDetails(runtime, html, { skill, name });
    html = appendRuneAilmentDetails(runtime, html, { skill });
    html = appendRuneTargetDetails(runtime, html, { skill, isSummonAttackTooltip, info });
    html = appendRuneCritAndLeech(runtime, html, { skill });
    html = appendAttackSummonPreview(runtime, html, { rawSkillTags, name, stats });
    return html;
}

function appendRuneDotMultiplier(runtime, html, context) {
    const { skill, name } = context;
    if (name === '화염 부패') html += `<div class="tooltip-line">${(0, runtime.deps._t)('특수 규칙: 공격력(기본 피해) 미적용, 적에게 화염 부패 디버프 적용, 화염 부패 대상은 점화 피해가 생명력 100당 8% 증폭(최대 {max}x)', { max: (Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1) })}</div>`;
    if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">${(0, runtime.deps._t)('지속 피해 배율 {dotMultiplier}x', { dotMultiplier: (skill.dotMultiplier || 1).toFixed(2) })}</div>`;
    return html;
}

function appendRuneEnhancement(runtime, html, context) {
    const { type, name, info } = context;
    if (info.enhanceLevel > 0) html += `<div class="tooltip-line gem-sky-tone">${(0, runtime.deps._t)('룬 강화 +{enhanceLevel}: {effectText}', { enhanceLevel: info.enhanceLevel, effectText: runtime.deps.gemCoreForge.effectText(info.enhanceLevel) })}</div>`;
    if (type !== 'support' && runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('여분 {spareCount}개', { spareCount: runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) })}</div>`;
    return html;
}

function fireOvercapValues(runtime, skill) {
    let stats = runtime.deps.cachedTooltipStats || null;
    let rawFireRes = stats && Number.isFinite(stats.rawResF) ? stats.rawResF : null;
    let maxFireRes = stats && Number.isFinite(stats.maxResF) ? stats.maxResF : null;
    let overcapCap = Number.isFinite(Number(skill.fireResOvercapCap)) ? Math.max(0, Number(skill.fireResOvercapCap)) : Infinity;
    let appliedOvercap = rawFireRes !== null && maxFireRes !== null ? Math.max(0, rawFireRes - maxFireRes) : null;
    let effectiveOvercap = appliedOvercap !== null ? Math.min(appliedOvercap, overcapCap) : null;
    return { rawFireRes, maxFireRes, overcapCap, appliedOvercap, effectiveOvercap };
}
