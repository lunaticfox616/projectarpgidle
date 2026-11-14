export function currencyIcon(ctx, key) {
    const src = ctx.deps.ORB_DB[key] && ctx.deps.ORB_DB[key].icon;
    if (src) return `<img src="${src}" alt="" aria-hidden="true">`;
    return ctx.state.GLYPHS[key] ? (0, ctx.deps.renderPixelIcon)(ctx.state.GLYPHS[key], `dive-glyph is-${ctx.state.GLYPHS[key]}`) : '';
}

export function drainPerSec(ctx, st) {
    return (0, ctx.deps.getOceanOxygenDrainPerSec)() * Math.max(0.1, Number((0, ctx.deps.getOceanFishingStrategyDef)(st).oxygenDrainMul) || 1);
}

export function actionsHtml(ctx, st) {
    const workshop = `<button type="button" onclick="fishingUi.openWorkshop()">${(0, ctx.deps._t)('심해 제작')}</button>`;
    if (!st.diving) return `<button type="button" class="dive-go" data-exploration-departure onclick="oceanDiveUi.startDive()">${(0, ctx.deps._t)('잠수 시작')}<small>${(0, ctx.deps._t)('{checkpointM}m부터', { checkpointM: st.checkpointM })}</small></button>${shallowHtml(ctx, st)}${autoHtml(ctx, st)}${workshop}`;
    const back = ctx.deps.game.currentZoneId === ctx.deps.OCEAN_ZONE_ID ? '' : `<button type="button" class="dive-go" data-exploration-departure onclick="changeZone(OCEAN_ZONE_ID)">${(0, ctx.deps._t)('심해로 돌아가기')}</button>`;
    return `${back}<button type="button"${back ? '' : surfaceGuard(ctx, st)} onclick="oceanDiveUi.surfaceDive()">${(0, ctx.deps._t)('수면으로 복귀')}</button>${autoHtml(ctx, st)}${workshop}`;
}

/** 심해에서 떠오르기 전 확인(방 탐험 중일 때, js/act-exploration-ui.js departureCopy). 다른 곳에 있으면 떠올라도 그 자리에 머물러 묻지 않는다. */
export function surfaceGuard(ctx, st) {
    return (0, ctx.deps._t)(' data-exploration-departure data-departure-title="수면으로 올라갈까요?" data-departure-message="{checkpointM}m 체크포인트 뒤의 진행은 사라집니다. 이미 얻은 물고기와 재화는 유지됩니다."', { checkpointM: st.checkpointM })
        + ' data-departure-confirm="올라가기" data-departure-cancel="계속 잠수"';
}

/** 얕게 잠수: 가장 깊은 리프트가 넘지 못한 가디언 앞이면 지난 가디언 자리부터 내려가 무리와 낚시를 다시 한다. */
export function shallowHtml(ctx, st) {
    const lift = (0, ctx.deps.getOceanShallowLiftM)(st);
    return lift === null ? '' : `<button type="button" class="dive-go" data-exploration-departure onclick="oceanDiveUi.startDive(true)">${(0, ctx.deps._t)('얕게 잠수')}<small>${(0, ctx.deps._t)('{lift}m부터', { lift })}</small></button>`;
}

/** 자동 재잠수 단추: 켜짐, 꺼짐, 멈춤(소득 없이 떠오른 잠수가 한도에 닿음). 체크박스가 아니라 aria-pressed 단추다: 이 창은 속성만
* 맞춰 다시 그려서(updateGamePanelMarkup), 한 번 누른 체크박스는 값이 바뀌어도 화면이 따라가지 않는다. */
export function autoHtml(ctx, st) {
    const on = ctx.deps.game.settings.autoRediveOcean === true, stopped = on && (0, ctx.deps.isOceanAutoRediveHalted)(st);
    return `<button type="button" class="dive-auto${stopped ? ' is-stopped' : ''}" aria-pressed="${on}" onclick="oceanDiveUi.toggleAutoRedive()">`
        + `${(0, ctx.deps._t)('자동 재잠수')}<small>${stopped ? (0, ctx.deps._t)('멈춤') : (on ? (0, ctx.deps._t)('켜짐') : (0, ctx.deps._t)('꺼짐'))}</small></button>`;
}

/** has-four: four dive buttons go 2x2 on a narrow panel (css/ocean-dive.css). */
export function headHtml(ctx, st) {
    const actions = actionsHtml(ctx, st), four = (actions.match(/<button/g) || []).length >= 4;
    return `<div class="dive-head${four ? ' has-four' : ''}"><span class="dive-emblem">${(0, ctx.deps.renderPixelIcon)('drop', 'dive-emblem-icon')}</span>`
        + `<div class="dive-title"><h3>${(0, ctx.deps._t)('심해 잠수')}</h3>${(0, ctx.deps.buildMapPowerEstimateHtml)((0, ctx.deps.getZone)(ctx.deps.OCEAN_ZONE_ID))}</div><div class="dive-actions">${actions}</div></div>`;
}

/** This guardian stretch (the last cleared guardian to the next), lifts every 100m as ticks, the depth as fill and the checkpoint as a pin. */
export function depthHtml(ctx, st) {
    const interval = (0, ctx.deps.getOceanBossBoundaryInterval)(), depth = Math.floor(st.depthM || 0);
    const guard = (Math.floor(Math.max(0, st.bossClearM || 0) / interval) + 1) * interval, start = guard - interval;
    const at = value => share(ctx, value - start, interval).toFixed(1);
    const nums = [['depth', '현재 수심', `${depth}m`], ['check', '체크포인트', `${st.checkpointM}m`], ['guard', '가디언까지', `${Math.max(0, guard - depth)}m`]]
        .map(([key, label, value]) => `<span class="is-${key}"><small>${label}</small><b>${value}</b></span>`).join('');
    return `<div class="dive-depth"><div class="dive-depth-nums">${nums}</div>`
        + `<div class="dive-depth-bar" aria-hidden="true" style="--lifts:${Math.max(1, Math.round(interval / 100))}"><i style="width:${at(depth)}%"></i><em style="left:${at(st.checkpointM)}%"></em></div>`
        + `<div class="dive-depth-ends"><span>${start}m</span><span>${(0, ctx.deps._t)('{guard}m 가디언', { guard })}</span></div></div>`;
}

export function oxygenHtml(ctx, st) {
    const left = share(ctx, st.oxygenCur, st.oxygenMax), drain = drainPerSec(ctx, st), secs = drain > 0 ? Math.floor(st.oxygenCur / drain) : 0;
    return `<div class="dive-oxygen${left <= 20 ? ' is-low' : ''}"><div><span>${(0, ctx.deps._t)('산소')}</span><b>${Math.round(left)}%</b><small>${(0, ctx.deps._t)('{ceil} / {oxygenMax}, 약 {secs}초 남음', { ceil: Math.ceil(st.oxygenCur), oxygenMax: st.oxygenMax, secs })}</small></div>`
        + `<div class="dive-oxygen-bar" role="meter" aria-label="${(0, ctx.deps._t)('남은 산소')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(left)}"><i style="width:${left.toFixed(1)}%"></i></div></div>`;
}

export function chipsHtml(ctx, st) {
    const currents = ((0, ctx.deps.getZone)(ctx.deps.OCEAN_ZONE_ID).currents || []).map(current => `<span><b>${esc(ctx, (0, ctx.deps._t)(current.name))}</b>${ctx.deps.statToneText.html((0, ctx.deps._t)(current.desc))}</span>`).join('');
    return `<div class="dive-chips"><span class="is-pressure"><b>${(0, ctx.deps._t)('수압')}</b>${(0, ctx.deps._t)('{depthM}단계', { depthM: (0, ctx.deps.getOceanDepthTier)(st.depthM) })}</span>${currents}</div>`;
}

export function costHtml(ctx, cost) {
    return Object.keys(cost).filter(key => cost[key] > 0).map(key => {
        const owned = Math.max(0, Math.floor(ctx.deps.game.currencies[key] || 0));
        return `<span class="${owned < cost[key] ? 'is-short' : 'is-ready'}">${currencyIcon(ctx, key)}${esc(ctx, (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name))}<b>${owned}/${cost[key]}</b></span>`;
    }).join('');
}

export function upgradeHtml(ctx, key) {
    const def = ctx.deps.OCEAN_PERMANENT_UPGRADE_DEFS[key], level = (0, ctx.deps.getOceanPermanentUpgradeLevel)(key), cost = (0, ctx.deps.getOceanPermanentUpgradeCost)(key);
    const now = (0, ctx.deps.getOceanPermanentUpgradeEffect)(key), next = cost ? `<span class="is-next">${(0, ctx.deps._t)('다음')} <b>+${now + def.valuePerLevel}${def.unit}</b></span>` : '';
    const button = cost ? `<button type="button" onclick="oceanDiveUi.buyDiveUpgrade('${key}')"${(0, ctx.deps.canPayOceanUpgradeCost)(cost) ? '' : ' disabled'}>${(0, ctx.deps._t)('강화')}</button>` : '<button type="button" disabled>최대</button>';
    return `<div class="dive-upgrade${cost ? '' : ' is-max'}"><header><strong>${esc(ctx, (0, ctx.deps._t)(def.label))}</strong><b>Lv.${level}/${def.maxLevel}</b></header>`
        + `<span class="dive-upgrade-bar"><i style="width:${share(ctx, level, def.maxLevel).toFixed(1)}%"></i></span>`
        + `<p><span>${(0, ctx.deps._t)('지금')} <b>+${now}${def.unit}</b></span>${next}</p>${cost ? `<div class="dive-costs">${costHtml(ctx, cost)}</div>` : ''}${button}</div>`;
}

export function rulesHtml(ctx, st) {
    const rows = [['descent', '하강', (0, ctx.deps._t)('몬스터를 쓰러뜨린 만큼 내려갑니다. 정예는 {eliteKillMul}배입니다.', { eliteKillMul: ctx.deps.OCEAN_COMBAT_DIVE.eliteKillMul })],
        ['check', '체크포인트', '100m마다 열리고, 다음 잠수는 여기서 시작합니다. 가디언 앞에 멈췄으면 얕게 잠수로 지난 가디언 자리부터 내려갈 수 있습니다.'],
        ['guard', '가디언', (0, ctx.deps._t)('{value}m마다 길을 막고, 닿으면 남은 무리를 두고 바로 가디언 방으로 갑니다. 쓰러뜨려야 더 내려가고, 가디언에게 쓰러지면 잠수가 끝납니다.', { value: (0, ctx.deps.getOceanBossBoundaryInterval)() })],
        ['oxygen', '산소', (0, ctx.deps._t)('초당 {st} 줄어들고, 철갑 패각충과 정예, 가디언이 부른 졸개를 쓰러뜨리면 공기 방울로 찹니다. 다 떨어지면 익사 피해를 받다가 수면으로 올라와 잠수를 시작한 사냥터로 돌아오고, 체크포인트 뒤 진행은 사라집니다.', { st: drainPerSec(ctx, st).toFixed(2) })],
        ['pressure', '수압', '100m마다 1단계 오릅니다. 공격 속도, 피해, 이동 속도가 줄고 산소가 더 빨리 줄어듭니다.'],
        ['auto', '자동 재잠수', (0, ctx.deps._t)('켜 두면 산소가 떨어지거나 가디언에게 쓰러져 떠오른 뒤, 사냥터 하나를 깨고 다시 잠수합니다. 가디언 앞에 막혔으면 지난 가디언 자리부터 내려가 물고기를 모읍니다. 무리에게 쓰러지거나, 리프트도 가디언 처치도 물고기도 없이 {missLimit}번 떠오르면 멈춥니다. 새 루프의 첫 잠수와 자리를 비운 동안의 정산에서는 다시 잠수하지 않습니다.', { missLimit: ctx.deps.OCEAN_AUTO_REDIVE.missLimit })]];
    return `<details class="dive-rules"><summary>${(0, ctx.deps._t)('잠수 규칙')}</summary><ul>${rows.map(([key, label, text]) => `<li class="is-${key}"><b>${label}</b>${text}</li>`).join('')}</ul></details>`;
}

export function render(ctx) {
    const panel = ctx.deps.document.getElementById('ui-ocean-panel');
    if (!panel) return;
    const st = (0, ctx.deps.ensureOceanState)();
    if (!st.unlocked) {
        (0, ctx.deps.updateGamePanelMarkup)(panel, `<div class="dive-head"><span class="dive-emblem">${(0, ctx.deps.renderPixelIcon)('drop', 'dive-emblem-icon')}</span><div class="dive-title"><h3>${(0, ctx.deps._t)('심해 잠수')}</h3><small>${(0, ctx.deps._t)('루프 {OCEAN_UNLOCK_LOOP}부터', { OCEAN_UNLOCK_LOOP: ctx.deps.OCEAN_UNLOCK_LOOP })}</small></div></div>`);
        return;
    }
    (0, ctx.deps.updateGamePanelMarkup)(panel, `${headHtml(ctx, st)}${depthHtml(ctx, st)}${oxygenHtml(ctx, st)}${chipsHtml(ctx, st)}`
            + `<section class="dive-upgrades"><header><strong>${(0, ctx.deps._t)('잠수 장비 강화')}</strong><small>${(0, ctx.deps._t)('영구 유지')}</small></header><div class="dive-upgrade-grid" style="--dive-upgrade-count:${ctx.deps.OCEAN_PERMANENT_UPGRADE_KEYS.length}">${ctx.deps.OCEAN_PERMANENT_UPGRADE_KEYS.map(ctx.handlers.upgradeHtml).join('')}</div></section>${rulesHtml(ctx, st)}`);
}

export function startDive(ctx, shallow) {
    if (!(0, ctx.deps.enterOceanDive)({ shallow: shallow === true })) return;
    (0, ctx.deps.changeZone)(ctx.deps.OCEAN_ZONE_ID);
    (0, ctx.deps.updateStaticUI)();
}

/** 수면으로 복귀: 심해에 있으면 잠수를 시작한 사냥터로 돌아가고, 잠수를 둔 채 다른 곳에 있으면 그 자리에 머문다. */
export function surfaceDive(ctx) {
    const inOcean = ctx.deps.game.currentZoneId === ctx.deps.OCEAN_ZONE_ID, back = (0, ctx.deps.forceSurfaceOcean)('manual');
    if (inOcean) (0, ctx.deps.changeZone)(back);
    (0, ctx.deps.updateStaticUI)();
}

export function toggleAutoRedive(ctx) {
    const on = ctx.deps.game.settings.autoRediveOcean !== true;
    (0, ctx.deps.setOceanAutoRedive)(on);
    (0, ctx.deps.addLog)(`🌊 ${(0, ctx.deps._t)('심해 자동 재잠수')} ${(0, ctx.deps._t)(on ? '켜짐' : '꺼짐')}`, 'season-up');
    (0, ctx.deps.queueImportantSave)(200);
    render(ctx);
}

export function buyDiveUpgrade(ctx, key) {
    (0, ctx.deps.upgradeOceanPermanent)(key);
    render(ctx);
    ctx.deps.fishingUi.render();
}

export function esc(ctx, value) { return (0, ctx.deps.escapeHTML)(String(value ?? '')); }

export function share(ctx, value, max) { return Math.max(0, Math.min(100, (Number(value) || 0) / Math.max(1, Number(max) || 1) * 100)); }
