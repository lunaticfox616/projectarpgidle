import { setTextById, formatSettingNumber, setUiImageGaugePercent, renderEnergyShieldInline, setElementText, renderHudIdentity } from './combat-hud-values.mjs';
import { renderCombatSkillHud } from './combat-hud-skills.mjs';
import { markPlayerEnergyShieldRow, showHudLevel } from './combat-hud-level.mjs';
import { getUiExperienceProgress, syncMapProgressRow, setCombatProgressGaugePercent } from './combat-hud-progress.mjs';
import { updatePlayerCombatEffectHud, patchCombatEffectStrip } from './combat-hud-effect-strip.mjs';
import { pruneEnemyHpDamageGhostStates, updatePlayerHpDamageGhost, updateEnemyHpDamageGhost } from './combat-hud-hp-ghost.mjs';
import { getUiEnemyTraitLabels, updateFocusedEnemyTraitPanel } from './combat-hud-traits.mjs';
import { releaseCombatHudTrait } from './combat-hud-lifetime.mjs';
import { buildEnemyCombatEffectIcons } from './combat-hud-enemy-effects.mjs';

export function updateCombatUI(runtime, pStats) {
    pStats = (0, runtime.deps.normalizeUiPlayerStats)(pStats, runtime.deps.cachedTooltipStats || {});
    if (pStats.__uiFallbackStats) pStats.maxHp = Math.max(pStats.maxHp, Math.max(1, Number(runtime.deps.game.playerHp) || 1));
    if (pStats && pStats.breakdowns && !pStats.__uiFallbackStats) runtime.deps.cachedTooltipStats = pStats;
    const { hpBar, hpPct } = updatePlayerLifeGauge(runtime, pStats);
    renderCombatSkillHud(runtime);
    const { hpWrap, hpAilBar } = updatePlayerLifeOverlays(runtime, hpBar, hpPct);
    updatePlayerShieldGauge(runtime, pStats, hpWrap);
    updatePlayerExperienceGauge(runtime);
    updatePlayerCombatEffectHud(runtime, pStats, hpAilBar);
    updatePlayerFieldBars(runtime, pStats);

    const zone = updateCombatLocation(runtime);
    updateCombatRegionProgress(runtime, zone);

    runtime.deps.sideEncounterUi.updateHud(zone);
    syncMapProgressRow(runtime, zone);
    runtime.deps.atlasUi.updateHud(zone);
    if ((0, runtime.deps.getRenderingUiTabIds)().has('tab-character')) (0, runtime.deps.renderCharacterStats)(pStats);

    updateEnemyCombatHud(runtime, pStats, zone);
    runtime.handlers.showEnemyTraitTooltip.sync();
}


function updateEnemyCombatHud(runtime, pStats, zone) {
    let enemies = (runtime.deps.game.enemies || []).filter(enemy => enemy && (enemy.hp || 0) > 0);
    pruneEnemyHpDamageGhostStates(runtime, enemies.map(enemy => enemy.id));
    let targetIds = (0, runtime.deps.getUiSkillTargets)(pStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    let bossEnemy = enemies.find(enemy => enemy.isBoss || enemy.bossPhase);
    let focusedEnemy = bossEnemy || enemies.find(enemy => targetIds.includes(enemy.id)) || enemies[0] || null;
    let enemyListEl = runtime.deps.document.getElementById('ui-enemy-list');
    if (!focusedEnemy) {
        enemyListEl.hidden = !!runtime.deps.woodsmanBattle.introduction();
        if (enemyListEl.dataset.enemyId !== '') {
            releaseCombatHudTrait(runtime);
            enemyListEl.dataset.enemyId = '';
            enemyListEl.innerHTML = `<div class="enemy-empty">${(0, runtime.deps._t)('현재 조준 중인 적이 없습니다.')}</div>`;
        }
    } else { updateFocusedCombatEnemy(runtime, pStats, zone, focusedEnemy, enemyListEl); }
}

function updateCombatRegionProgress(runtime, zone) {
    let pendingWoodsmanEntrance = !!runtime.deps.game.woodsmanEntrancePending && zone && zone.type === 'outsideChaos';
    if (pendingWoodsmanEntrance) { updateWoodsmanEntranceProgress(runtime); } else if (runtime.deps.game.moveTimer > 0) { updateRoomMoveProgress(runtime); } else if (zone && zone.type === 'oceanDepth') { updateOceanDepthProgress(runtime); } else if ((0, runtime.deps.getUiCrowdProgressPaused)()) {
        setTextById(runtime, 'ui-progress-label', '적 정리 중');
        setTextById(runtime, 'ui-move-time-text', `${runtime.deps.game.runProgress.toFixed(0)}%`);
        setCombatProgressGaugePercent(runtime, runtime.deps.game.runProgress);
    } else {
        setTextById(runtime, 'ui-progress-label', '진행도');
        setTextById(runtime, 'ui-move-time-text', `${runtime.deps.game.runProgress.toFixed(0)}%`);
        setCombatProgressGaugePercent(runtime, runtime.deps.game.runProgress);
    }
}

function updateCombatLocation(runtime) {
    let zone = (0, runtime.deps.getZone)(runtime.deps.game.currentZoneId);
    let storyAct = zone.type === 'act' ? (0, runtime.deps.getStoryActByZoneId)(zone.id) : null;
    // 지역 이름만(전투 머리말 없이): 액트는 "액트 1: 제목", 그 밖은 지역 이름을 현재 언어로.
    let compactZoneText = storyAct ? `${(0, runtime.deps.formatStoryActLabel)(storyAct)}: ${(0, runtime.deps._t)(storyAct.title)}` : (0, runtime.deps._t)(zone.name);
    setTextById(runtime, 'ui-combat-zone', compactZoneText);
    // 레벨·직업은 경험치바 왼쪽(ui-exp-level-label)으로 이동했으므로 여기는 지역 이름만 표기한다.
    setTextById(runtime, 'ui-combat-zone-inline', compactZoneText);
    runtime.deps.cosmosRouteUi.updateHud();
    setTextById(runtime, 'btn-combat-return', runtime.deps.sideEncounterUi.returnLabel(zone));
    return zone;
}

function updatePlayerFieldBars(runtime, pStats) {
    let hpCombatBar = runtime.deps.document.getElementById('ui-player-hp-combat');
    if (hpCombatBar) hpCombatBar.style.width = `${Math.max(0, Math.min(100, (runtime.deps.game.playerHp / Math.max(1, pStats.maxHp)) * 100))}%`;
    let esCombatBar = runtime.deps.document.getElementById('ui-player-es-combat');
    if (esCombatBar) {
        let pct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, ((runtime.deps.game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
        esCombatBar.style.width = `${pct}%`;
        esCombatBar.style.display = (pStats.energyShield || 0) > 0 ? 'block' : 'none';
    }
}

function updatePlayerExperienceGauge(runtime) {
    let expProgress = getUiExperienceProgress(runtime, runtime.deps.game.level, runtime.deps.game.exp);
    setTextById(runtime, 'ui-exp', formatSettingNumber(runtime, expProgress.current, 'showExpComma'));
    setTextById(runtime, 'ui-maxexp', formatSettingNumber(runtime, expProgress.required, 'showExpComma'));
    let expPct = expProgress.percent;
    setUiImageGaugePercent(runtime, runtime.deps.document.getElementById('ui-exp-bar'), expPct);
    renderHudIdentity(runtime);
    showHudLevel(runtime, runtime.deps.game.level);
    setTextById(runtime, 'ui-exp-note', `${expPct.toFixed(1)}%`);
}

function updatePlayerShieldGauge(runtime, pStats, hpWrap) {
    let hasEnergyShield = (pStats.energyShield || 0) > 0;
    let esPct = hasEnergyShield ? Math.max(0, Math.min(100, ((runtime.deps.game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
    markPlayerEnergyShieldRow(runtime, hpWrap, hasEnergyShield);
    renderEnergyShieldInline(runtime, runtime.deps.document.getElementById('ui-es-inline'), hasEnergyShield, runtime.deps.game.playerEnergyShield, pStats.energyShield);
    let esBar = runtime.deps.document.getElementById('ui-es-bar');
    if (!esBar) {
        let esWrap = runtime.deps.document.getElementById('ui-es-track') || hpWrap;
        esBar = runtime.deps.document.createElement('div');
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
    setUiImageGaugePercent(runtime, esBar, esPct);
    esBar.style.display = hasEnergyShield ? 'block' : 'none';
}

function updatePlayerLifeOverlays(runtime, hpBar, hpPct) {
    let hpWrap = hpBar.parentElement;
    let hpGhostBar = runtime.deps.document.getElementById('ui-hp-damage-ghost-bar');
    if (!hpGhostBar && hpWrap) {
        hpGhostBar = runtime.deps.document.createElement('div');
        hpGhostBar.id = 'ui-hp-damage-ghost-bar';
        hpGhostBar.className = 'hp-bar-fill player-damage-ghost';
        hpWrap.insertBefore(hpGhostBar, hpBar);
    }
    if (hpGhostBar) {
        let ghostPct = updatePlayerHpDamageGhost(runtime, hpPct);
        hpGhostBar.style.width = `${ghostPct}%`;
        hpGhostBar.style.display = ghostPct > hpPct + 0.2 ? 'block' : 'none';
    }
    let hpAilBar = runtime.deps.document.getElementById('ui-hp-ailment-bar');
    if (!hpAilBar && hpWrap) {
        hpAilBar = runtime.deps.document.createElement('div');
        hpAilBar.id = 'ui-hp-ailment-bar';
        hpAilBar.className = 'hp-bar-fill player-ailment-pending';
        hpWrap.insertBefore(hpAilBar, hpBar);
    }
    return { hpWrap, hpAilBar };
}

function updatePlayerLifeGauge(runtime, pStats) {
    let safeHp = Math.max(0, Number(runtime.deps.game.playerHp) || 0);
    // 생명은 정수로 올림(1 미만이 남아도 1 — 살아 있음이 보이게), 최대 생명 표시(내림)는 넘지 않는다.
    let shownHp = Math.max(0, Math.min(Math.ceil(safeHp - 1e-6), Math.floor(Number(pStats.maxHp) || 0)));
    setTextById(runtime, 'ui-hp', formatSettingNumber(runtime, shownHp, 'showHpComma'));
    setTextById(runtime, 'ui-maxhp', formatSettingNumber(runtime, pStats.maxHp, 'showHpComma'));
    let hpPct = Math.max(0, Math.min(100, (runtime.deps.game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let hpBar = runtime.deps.document.getElementById('ui-hp-bar');
    setUiImageGaugePercent(runtime, hpBar, hpPct);
    hpBar.classList.toggle('player-danger', hpPct > 0 && hpPct <= 25);
    return { hpBar, hpPct };
}

function updateFocusedCombatEnemy(runtime, pStats, zone, focusedEnemy, enemyListEl) {
    let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
    const tags = combatEnemyTags(runtime, focusedEnemy);
    const { effectMarkup, projectedAilmentDamage } = combatEnemyEffects(runtime, focusedEnemy, pStats);
    const { pendingPct, pendingStartPct, ghostTrailPct, ghostDisplay } = combatEnemyHealthTrail(runtime, focusedEnemy, pct, projectedAilmentDamage);
    const enemyHudTier = ensureCombatEnemyCard(runtime, enemyListEl, focusedEnemy);
    let nameEl = enemyListEl.querySelector('.enemy-name');
    let ghostEl = enemyListEl.querySelector('.enemy-damage-ghost');
    let esEl = enemyListEl.querySelector('.hp-bar-fill.enemy-es');
    let hpEl = enemyListEl.querySelector('.hp-bar-fill.enemy');
    let pendingEl = enemyListEl.querySelector('.enemy-pending');
    let hpTextEl = enemyListEl.querySelector('.hp-text');
    let ailmentEl = enemyListEl.querySelector('.enemy-ailments');
    let traitEl = enemyListEl.querySelector('.enemy-traits');
    setElementText(runtime, nameEl, `${(0, runtime.deps.getEnemyDisplayName)(focusedEnemy)}, Lv.${runtime.deps.levelProgression.monsterLevel(zone, focusedEnemy)}`);
    paintEnemyGhostBar(ghostEl, pct, ghostTrailPct, ghostDisplay);
    paintEnemyShieldBar(esEl, focusedEnemy);
    if (hpEl) setUiImageGaugePercent(runtime, hpEl, pct);
    if (pendingEl) { pendingEl.style.left = `${pendingStartPct}%`; pendingEl.style.width = `${pendingPct}%`; }
    paintEnemyHpText(runtime, hpTextEl, focusedEnemy);
    patchCombatEffectStrip(runtime, ailmentEl, effectMarkup);
    if (traitEl) updateFocusedEnemyTraitPanel(runtime, traitEl, focusedEnemy, enemyHudTier === 'mob' ? [] : tags);
}


function paintEnemyHpText(runtime, hpTextEl, focusedEnemy) {
    if (hpTextEl) {
        let zoneNow = (0, runtime.deps.getZone)(runtime.deps.game.currentZoneId);
        if (zoneNow && zoneNow.type === 'woodsmanEcho') {
            let totalDealt = Math.max(0, Math.floor((focusedEnemy.echoStartHp || focusedEnemy.maxHp || 0) - Math.max(0, focusedEnemy.hp || 0)));
            setElementText(runtime, hpTextEl, `${enemyShieldText(runtime, focusedEnemy)}${formatSettingNumber(runtime, totalDealt, 'showEnemyHpComma')} / ?`);
        } else setElementText(runtime, hpTextEl, `${enemyShieldText(runtime, focusedEnemy)}${formatSettingNumber(runtime, Math.max(0, focusedEnemy.hp), 'showEnemyHpComma')}/${formatSettingNumber(runtime, focusedEnemy.maxHp, 'showEnemyHpComma')}`);
    }
}

function paintEnemyShieldBar(esEl, focusedEnemy) {
    if (esEl) {
        let esPct = (focusedEnemy.maxEnergyShield || 0) > 0 ? Math.max(0, Math.min(100, ((focusedEnemy.energyShield || 0) / Math.max(1, focusedEnemy.maxEnergyShield)) * 100)) : 0;
        esEl.style.width = `${esPct}%`;
        esEl.style.display = esPct > 0 ? 'block' : 'none';
    }
}

function paintEnemyGhostBar(ghostEl, pct, ghostTrailPct, ghostDisplay) {
    if (ghostEl) {
        ghostEl.style.left = `${pct}%`;
        ghostEl.style.width = `${ghostTrailPct}%`;
        ghostEl.style.display = ghostDisplay;
    }
}

function ensureCombatEnemyCard(runtime, enemyListEl, focusedEnemy) {
    let enemyHudTier = (focusedEnemy.isBoss || focusedEnemy.bossPhase) ? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob');
    let focusedKey = String(focusedEnemy.id) + '|' + enemyHudTier;
    // 2026-10-04 visibility: an ordinary monster's HP already rides over its head on the field, so the big top card
    // (name · bar) only shows for elites and bosses — on phones it covered the ground ahead where packs come from.
    // 같은 값이면 쓰지 않는다: 쓸 때마다 body의 :has() 규칙까지 스타일을 다시 계산했다(2026-10-25 측정, 일반 몹을 겨눈 동안 틱마다).
    if (enemyListEl.hidden !== (enemyHudTier === 'mob')) enemyListEl.hidden = enemyHudTier === 'mob';
    if (enemyListEl.dataset.enemyId !== focusedKey || !enemyListEl.querySelector('.enemy-card.targeted')) {
        releaseCombatHudTrait(runtime);
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
    return enemyHudTier;
}

function combatEnemyHealthTrail(runtime, focusedEnemy, pct, projectedAilmentDamage) {
    let pendingPct = Math.max(0, Math.min(pct, (projectedAilmentDamage / Math.max(1, focusedEnemy.maxHp || 1)) * 100));
    let pendingStartPct = Math.max(0, pct - pendingPct);
    let ghostPct = updateEnemyHpDamageGhost(runtime, focusedEnemy.id, pct);
    let ghostTrailPct = Math.max(0, ghostPct - pct);
    let ghostDisplay = ghostTrailPct > 0.2 ? 'block' : 'none';
    return { pendingPct, pendingStartPct, ghostTrailPct, ghostDisplay };
}

function combatEnemyEffects(runtime, focusedEnemy, pStats) {
    let activeAilments = (focusedEnemy.ailments || []).filter(ail => ail && (ail.time || 0) > 0);
    let effectNow = (0, runtime.deps.getCombatTime)();
    let enemyDebuffs = (((runtime.deps.game.enemyConditionDebuffs || {})[focusedEnemy.id]) || []).filter(row => row && (row.expiresAt || 0) > effectNow);
    let effectMarkup = buildEnemyCombatEffectIcons(runtime, activeAilments, enemyDebuffs, effectNow, focusedEnemy);
    let projectedAilmentDamage = activeAilments.reduce((sum, ail) => {
        if (!ail || (ail.time || 0) <= 0) return sum;
        if (ail.type === 'flameDecay') return sum + Math.floor(Math.max(0, ail.flameDecayDps || 0) * Math.max(0, ail.time || 0));
        if (!(0, runtime.deps.isUiDamageAilmentType)(ail.type)) return sum;
        let dps = (0, runtime.deps.getUiEnemyDamageAilmentDps)(ail, pStats);
        let stacks = Math.max(1, Math.floor(ail.stacks || 1));
        return sum + Math.floor(dps * stacks * Math.max(0, ail.time || 0));
        }, 0);
    return { effectMarkup, projectedAilmentDamage };
}

function combatEnemyTags(runtime, focusedEnemy) {
    let tags = (0, runtime.deps.getEnemyTraitSummary)(focusedEnemy);
    if (Array.isArray(focusedEnemy.chaosRealmAffixes) && focusedEnemy.chaosRealmAffixes.length > 0) tags = tags.concat(focusedEnemy.chaosRealmAffixes.map(a => a.name));
    tags = Array.from(new Set(getUiEnemyTraitLabels(runtime, tags)));
    return tags;
}

function updateOceanDepthProgress(runtime) {
    // 심해는 전투 진행도 대신 현재 수심(m)만 표기한다. 수심은 쓰러뜨린 몬스터만큼 조금씩 내려간다(js/passives.js tickOceanDepth).
    let oceanSt = (typeof runtime.deps.ensureOceanState === 'function') ? (0, runtime.deps.ensureOceanState)() : null;
    let depthM = oceanSt ? Math.floor(oceanSt.depthM || 0) : 0;
    // 진행 바는 현재 100m 구간 내 진행도를 표시해 수심 1m마다 약 1%씩 차오른다.
    let segPct = Math.min(100, Math.max(0, depthM - Math.floor(depthM / 100) * 100));
    let isDrowning = !!(oceanSt && oceanSt.drowning);
    setTextById(runtime, 'ui-progress-label', isDrowning ? '🫨 익사 위험' : '🌊 수심');
    setTextById(runtime, 'ui-move-time-text', isDrowning ? (0, runtime.deps._t)('{depthM}m, 산소 고갈! 익사 피해 누적', { depthM }) : `${depthM}m`);
    setCombatProgressGaugePercent(runtime, isDrowning ? 100 : segPct);
}

function updateRoomMoveProgress(runtime) {
    let readyPct = Math.min(100, (1 - runtime.deps.game.moveTimer / runtime.deps.game.moveTotalTime) * 100);
    setTextById(runtime, 'ui-progress-label', runtime.deps.game.isTownReturning ? '🏕️ 재정비 중...' : '다음 구간 준비');
    setTextById(runtime, 'ui-move-time-text', (0, runtime.deps._t)('{max}초', { max: Math.max(0, runtime.deps.game.moveTimer).toFixed(1) }));
    setCombatProgressGaugePercent(runtime, readyPct);
}

function updateWoodsmanEntranceProgress(runtime) {
    let totalTime = Math.max(0.1, Number(runtime.deps.game.moveTotalTime) || 3);
    let readyPct = Math.min(100, Math.max(0, (1 - Math.max(0, runtime.deps.game.moveTimer || 0) / totalTime) * 100));
    setTextById(runtime, 'ui-progress-label', '☠️ 나무꾼 등장 대기');
    setTextById(runtime, 'ui-move-time-text', runtime.deps.game.moveTimer > 0 ? (0, runtime.deps._t)('{max}초', { max: Math.max(0, runtime.deps.game.moveTimer).toFixed(1) }) : '등장 임박');
    setCombatProgressGaugePercent(runtime, readyPct);
}

function enemyShieldText(runtime, focusedEnemy) {
    return focusedEnemy.energyShield > 0 ? (0, runtime.deps._t)('보호막 {energyShield}, ', { energyShield: formatSettingNumber(runtime, focusedEnemy.energyShield, 'showEnemyHpComma') }) : '';
}
