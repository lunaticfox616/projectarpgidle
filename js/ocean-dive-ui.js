/** 심해 잠수(지도의 심해, 2026-10-09 사용자 "게임 전체에서 부족한 화면" 2순위). 브라우저 기본 초록 막대, 재화 이름뿐인 강화 비용,
 * "잠수 시작, 0m" 단추를 바꿨다: 머리(권장 전투력, 잠수 단추), 수심 게이지(이번 가디언 구간, 100m 리프트 눈금, 체크포인트 표시),
 * 산소 막대(20% 이하 빨강), 수압과 해류 칩, 잠수 장비 강화 카드(레벨 막대, 지금과 다음 수치, 재화 그림 칩), 잠수 규칙.
 * 규칙은 js/state.js(산소, 수압, 강화 수치)와 js/passives.js(잠수, 수면 복귀, 강화). */
const oceanDiveUi = (() => {
    const esc = value => escapeHTML(String(value ?? ''));
    const share = (value, max) => Math.max(0, Math.min(100, (Number(value) || 0) / Math.max(1, Number(max) || 1) * 100));

    /** Currency art when the currency has a picture; the dive materials have none, so they get a pixel glyph in their colour. */
    const GLYPHS = Object.freeze({ skyEssence: 'cloud', oceanRerollShard: 'shard', reefFragment: 'coral', bossCore: 'gem' });
    function currencyIcon(key) {
        const src = pixelIconPath(ORB_DB[key] && ORB_DB[key].icon);
        if (src) return `<img src="${src}" alt="" aria-hidden="true">`;
        return GLYPHS[key] ? renderPixelIcon(GLYPHS[key], `dive-glyph is-${GLYPHS[key]}`) : '';
    }
    function drainPerSec(st) {
        return getOceanOxygenDrainPerSec() * Math.max(0.1, Number(getOceanFishingStrategyDef(st).oxygenDrainMul) || 1);
    }
    function actionsHtml(st) {
        const fishing = `<button type="button" onclick="switchMapSubtab('map-tab-fishing')">낚시와 제작</button>`;
        if (!st.diving) return `<button type="button" class="dive-go" data-exploration-departure onclick="oceanDiveUi.startDive()">잠수 시작<small>${st.checkpointM}m부터</small></button>${fishing}`;
        const back = game.currentZoneId === OCEAN_ZONE_ID ? '' : `<button type="button" class="dive-go" data-exploration-departure onclick="changeZone(OCEAN_ZONE_ID)">심해로 돌아가기</button>`;
        return `${back}<button type="button" data-exploration-departure onclick="oceanDiveUi.surfaceDive()">수면으로 복귀</button>${fishing}`;
    }
    function headHtml(st) {
        return `<div class="dive-head"><span class="dive-emblem">${renderPixelIcon('drop', 'dive-emblem-icon')}</span>`
            + `<div class="dive-title"><h3>심해 잠수</h3>${buildMapPowerEstimateHtml(getZone(OCEAN_ZONE_ID))}</div><div class="dive-actions">${actionsHtml(st)}</div></div>`;
    }
    /** This guardian stretch (the last cleared guardian to the next), lifts every 100m as ticks, the depth as fill and the checkpoint as a pin. */
    function depthHtml(st) {
        const interval = getOceanBossBoundaryInterval(), depth = Math.floor(st.depthM || 0);
        const guard = (Math.floor(Math.max(0, st.bossClearM || 0) / interval) + 1) * interval, start = guard - interval;
        const at = value => share(value - start, interval).toFixed(1);
        const nums = [['depth', '현재 수심', `${depth}m`], ['check', '체크포인트', `${st.checkpointM}m`], ['guard', '가디언까지', `${Math.max(0, guard - depth)}m`]]
            .map(([key, label, value]) => `<span class="is-${key}"><small>${label}</small><b>${value}</b></span>`).join('');
        return `<div class="dive-depth"><div class="dive-depth-nums">${nums}</div>`
            + `<div class="dive-depth-bar" aria-hidden="true" style="--lifts:${Math.max(1, Math.round(interval / 100))}"><i style="width:${at(depth)}%"></i><em style="left:${at(st.checkpointM)}%"></em></div>`
            + `<div class="dive-depth-ends"><span>${start}m</span><span>${guard}m 가디언</span></div></div>`;
    }
    function oxygenHtml(st) {
        const left = share(st.oxygenCur, st.oxygenMax), drain = drainPerSec(st), secs = drain > 0 ? Math.floor(st.oxygenCur / drain) : 0;
        return `<div class="dive-oxygen${left <= 20 ? ' is-low' : ''}"><div><span>산소</span><b>${Math.round(left)}%</b><small>${Math.ceil(st.oxygenCur)} / ${st.oxygenMax}, 약 ${secs}초 남음</small></div>`
            + `<div class="dive-oxygen-bar" role="meter" aria-label="남은 산소" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(left)}"><i style="width:${left.toFixed(1)}%"></i></div></div>`;
    }
    function chipsHtml(st) {
        const currents = (getZone(OCEAN_ZONE_ID).currents || []).map(current => `<span><b>${esc(current.name)}</b>${statToneText.html(current.desc)}</span>`).join('');
        return `<div class="dive-chips"><span class="is-pressure"><b>수압</b>${getOceanDepthTier(st.depthM)}단계</span>${currents}</div>`;
    }
    function costHtml(cost) {
        return Object.keys(cost).filter(key => cost[key] > 0).map(key => {
            const owned = Math.max(0, Math.floor(game.currencies[key] || 0));
            return `<span class="${owned < cost[key] ? 'is-short' : 'is-ready'}">${currencyIcon(key)}${esc(ORB_DB[key].name)}<b>${owned}/${cost[key]}</b></span>`;
        }).join('');
    }
    function upgradeHtml(key) {
        const def = OCEAN_PERMANENT_UPGRADE_DEFS[key], level = getOceanPermanentUpgradeLevel(key), cost = getOceanPermanentUpgradeCost(key);
        const now = getOceanPermanentUpgradeEffect(key), next = cost ? `<span class="is-next">다음 <b>+${now + def.valuePerLevel}${def.unit}</b></span>` : '';
        const button = cost ? `<button type="button" onclick="oceanDiveUi.buyDiveUpgrade('${key}')"${canPayOceanUpgradeCost(cost) ? '' : ' disabled'}>강화</button>` : '<button type="button" disabled>최대</button>';
        return `<div class="dive-upgrade${cost ? '' : ' is-max'}"><header><strong>${esc(def.label)}</strong><b>Lv.${level}/${def.maxLevel}</b></header>`
            + `<span class="dive-upgrade-bar"><i style="width:${share(level, def.maxLevel).toFixed(1)}%"></i></span>`
            + `<p><span>지금 <b>+${now}${def.unit}</b></span>${next}</p>${cost ? `<div class="dive-costs">${costHtml(cost)}</div>` : ''}${button}</div>`;
    }
    function rulesHtml(st) {
        const rows = [['check', '체크포인트', '100m마다 열리고, 다음 잠수는 여기서 시작합니다.'],
            ['guard', '가디언', `${getOceanBossBoundaryInterval()}m마다 길을 막습니다. 쓰러뜨려야 더 내려갑니다.`],
            ['oxygen', '산소', `초당 ${drainPerSec(st).toFixed(2)} 줄어듭니다. 다 떨어지면 익사 피해를 받다가 수면으로 올라오고, 체크포인트 뒤 진행은 사라집니다.`],
            ['pressure', '수압', '100m마다 1단계 오릅니다. 공격 속도, 피해, 이동 속도가 줄고 산소가 더 빨리 줄어듭니다.']];
        return `<details class="dive-rules"><summary>잠수 규칙</summary><ul>${rows.map(([key, label, text]) => `<li class="is-${key}"><b>${label}</b>${text}</li>`).join('')}</ul></details>`;
    }
    function render() {
        const panel = document.getElementById('ui-ocean-panel');
        if (!panel) return;
        const st = ensureOceanState();
        if (!st.unlocked) {
            updateGamePanelMarkup(panel, `<div class="dive-head"><span class="dive-emblem">${renderPixelIcon('drop', 'dive-emblem-icon')}</span><div class="dive-title"><h3>심해 잠수</h3><small>루프 ${OCEAN_UNLOCK_LOOP}부터</small></div></div>`);
            return;
        }
        updateGamePanelMarkup(panel, `${headHtml(st)}${depthHtml(st)}${oxygenHtml(st)}${chipsHtml(st)}`
            + `<section class="dive-upgrades"><header><strong>잠수 장비 강화</strong><small>영구 유지</small></header><div class="dive-upgrade-grid">${OCEAN_PERMANENT_UPGRADE_KEYS.map(upgradeHtml).join('')}</div></section>${rulesHtml(st)}`);
    }
    function startDive() {
        if (!enterOceanDive()) return;
        changeZone(OCEAN_ZONE_ID);
        updateStaticUI();
    }
    function surfaceDive() {
        forceSurfaceOcean('manual');
        changeZone(Math.max(0, game.maxZoneId || 0));
        updateStaticUI();
    }
    function buyDiveUpgrade(key) {
        upgradeOceanPermanent(key);
        render();
        fishingUi.render();
    }
    return Object.freeze({ render, startDive, surfaceDive, buyDiveUpgrade });
})();

safeExposeGlobals({ oceanDiveUi });
