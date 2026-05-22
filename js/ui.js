// Phase-2 extracted UI/tab/render helper block.
let lastHeavyUiRefreshAt = 0;
let lastPassiveTreeDrawAt = 0;
let lastPassiveTreeSignature = '';
let cachedTooltipStats = null;
let gemTooltipCache = null;

let mobilePipCanvas = null;
var lod = 1; // fallback for any legacy FX paths
let mobilePipCtx = null;
let mobilePipDrag = { active: false, moved: false, startX: 0, startY: 0, baseRight: 10, baseBottom: 94, lastTapAt: 0 };
let mobilePipRefreshHandle = null;
let battleAssetDeferredInitHandle = null;
let playerHpDamageGhostPct = null;
let playerHpDamageGhostLastPct = null;
let playerHpDamageGhostLastAt = 0;
let playerHpDamageGhostHoldUntil = 0;
let enemyHpDamageGhostStates = new Map();
const PLAYER_HP_DAMAGE_GHOST_HOLD_MS = 260;
const PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC = 34;
const ENEMY_HP_DAMAGE_GHOST_SNAP_MS = 680;

function startBattleAssetLoadNow() {
    window.__battleAssetAutoloadEnabled = true;
    if (battleAssetDeferredInitHandle) {
        clearTimeout(battleAssetDeferredInitHandle);
        battleAssetDeferredInitHandle = null;
    }
    initBattleAssets();
}

function scheduleDeferredBattleAssetLoad() {
    if (battleAssets.ready || battleAssets.loading || battleAssets.failed) return;
    if (battleAssetDeferredInitHandle) return;
    battleAssetDeferredInitHandle = setTimeout(() => {
        battleAssetDeferredInitHandle = null;
        startBattleAssetLoadNow();
    }, 1800);
}

function ensureMobileBattlePip() {
    let host = document.getElementById('mobile-battle-pip');
    if (!host) {
        host = document.createElement('div');
        host.id = 'mobile-battle-pip';
        host.style.cssText = 'position:fixed; right:10px; bottom:94px; width:148px; height:84px; border:1px solid #4c6b93; border-radius:10px; overflow:hidden; background:#0a1320; z-index:9997; display:none; box-shadow:0 8px 20px rgba(0,0,0,.35);';
        host.style.touchAction = 'none';
        host.addEventListener('pointerdown', (e) => {
            mobilePipDrag.active = true;
            mobilePipDrag.moved = false;
            mobilePipDrag.startX = e.clientX;
            mobilePipDrag.startY = e.clientY;
            mobilePipDrag.baseRight = parseFloat(host.dataset.right || '10') || 10;
            mobilePipDrag.baseBottom = parseFloat(host.dataset.bottom || '94') || 94;
            host.setPointerCapture && host.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        host.addEventListener('pointermove', (e) => {
            if (!mobilePipDrag.active) return;
            let dx = e.clientX - mobilePipDrag.startX;
            let dy = e.clientY - mobilePipDrag.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mobilePipDrag.moved = true;
            let right = Math.max(6, mobilePipDrag.baseRight - dx);
            let bottom = Math.max(72, mobilePipDrag.baseBottom - dy);
            host.dataset.right = String(right);
            host.dataset.bottom = String(bottom);
            host.style.right = right + 'px';
            host.style.bottom = bottom + 'px';
            e.preventDefault();
        });
        host.addEventListener('pointerup', (e) => {
            let wasMoved = mobilePipDrag.moved;
            mobilePipDrag.active = false;
            host.releasePointerCapture && host.releasePointerCapture(e.pointerId);
            if (wasMoved) return;
            let now = Date.now();
            if (now - mobilePipDrag.lastTapAt < 320) {
                mobilePipDrag.lastTapAt = 0;
                switchTab('tab-battle');
            } else {
                mobilePipDrag.lastTapAt = now;
            }
        });
        let c = document.createElement('canvas');
        c.width = 296; c.height = 168;
        c.style.cssText = 'width:100%; height:100%; display:block;';
        host.appendChild(c);
        document.body.appendChild(host);
    }
    if (!mobilePipCanvas) {
        mobilePipCanvas = host.querySelector('canvas');
        mobilePipCtx = mobilePipCanvas ? mobilePipCanvas.getContext('2d') : null;
    }
    return host;
}

function updateMobileBattlePipVisibility() {
    let host = ensureMobileBattlePip();
    if (!host) return;
    let isMobile = (window.matchMedia && window.matchMedia('(max-width: 1080px)').matches) || ('ontouchstart' in window);
    let activeBattle = (document.getElementById('tab-battle') || {}).classList.contains('active');
    let blocked = isStartupOverlayOpen() || isLoadingOverlayOpen();
    host.style.display = (isMobile && !activeBattle && !blocked && game.settings && game.settings.showMobileBattlePip !== false) ? 'block' : 'none';
    host.style.right = (host.dataset.right || '10') + 'px';
    host.style.bottom = (host.dataset.bottom || '94') + 'px';
    if (host.style.display !== 'none') {
        let src = document.getElementById('battlefield-canvas');
        if (src && (src.width < 32 || src.height < 32)) {
            src.width = 960;
            src.height = 540;
        }
    }
}

function isMobileBattlePipVisible() {
    let host = document.getElementById('mobile-battle-pip');
    return !!(host && host.style.display !== 'none');
}

function renderMobileBattlePipFrame() {
    if (!mobilePipCtx || !mobilePipCanvas) return;
    let host = document.getElementById('mobile-battle-pip');
    if (!host || host.style.display === 'none') return;
    let src = document.getElementById('battlefield-canvas');
    if (!src) return;
    if (src.width < 32 || src.height < 32) { src.width = 960; src.height = 540; }
    mobilePipCtx.clearRect(0, 0, mobilePipCanvas.width, mobilePipCanvas.height);
    mobilePipCtx.drawImage(src, 0, 0, mobilePipCanvas.width, mobilePipCanvas.height);
}


function startMobilePipRefreshLoop() {
    if (mobilePipRefreshHandle) clearInterval(mobilePipRefreshHandle);
    mobilePipRefreshHandle = setInterval(() => {
        try {
            if (document.hidden) return;
            updateMobileBattlePipVisibility();
            if (isMobileBattlePipVisible()) renderBattlefield(true);
            renderMobileBattlePipFrame();
        } catch (e) {}
    }, 120);
}

function tickShrineState(){
    game.shrineState = game.shrineState || { active: null, nextRollAt: 0 };
    let now = Date.now();
    if (game.shrineBuff && now > (game.shrineBuff.expiresAt || 0)) game.shrineBuff = null;
    if (game.shrineState.active && now > (game.shrineState.active.expiresAt || 0)) game.shrineState.active = null;
    if (!game.shrineState.active && now >= (game.shrineState.nextRollAt || 0) && Math.random() < 0.01) {
        game.shrineState.active = { name: rndChoice(['힘의 성소','수호의 성소','질주의 성소']), expiresAt: now + 30000 };
        game.shrineState.nextRollAt = now + 240000;
    }
}
function clickActiveShrine(){
    let active = game.shrineState && game.shrineState.active; if (!active) return;
    let stat = active.name.includes('힘') ? 'pctDmg' : active.name.includes('수호') ? 'dr' : 'aspd';
    let value = active.name.includes('수호') ? 10 : 16;
    game.shrineBuff = { name: active.name, stat: stat, value: value, expiresAt: Date.now() + 45000 };
    game.shrineState.active = null;
    addLog(`🛕 ${active.name} 축복 활성화!`, 'loot-rare');
    applyTabHeaderOrder();
    updateStaticUI();
}

function renderTabOrderSettings() {
    let tabOrderEl = document.getElementById('ui-tab-order-settings');
    if (!tabOrderEl) return;
    if (!(document.getElementById('tab-settings') || {}).classList.contains('active')) return;
    let tabs = Array.from(document.querySelectorAll('.tab-header .tab-btn'));
    tabOrderEl.innerHTML = tabs.map(el => {
        let place = (game.settings.tabPlacement[el.id] === 'bottom') ? 'bottom' : 'top';
        return `<div style="display:flex;justify-content:space-between;gap:6px;align-items:center;"><span>${el.innerText.replace(/\s*●?\s*$/,'')}</span><span style="display:flex;gap:4px;"><button onclick="moveTabButton('${el.id}',-1)">▲</button><button onclick="moveTabButton('${el.id}',1)">▼</button><button onclick="setTabPlacement('${el.id}','top')" ${place === 'top' ? 'disabled' : ''}>상단</button><button onclick="setTabPlacement('${el.id}','bottom')" ${place === 'bottom' ? 'disabled' : ''}>하단</button></span></div>`;
    }).join('');
}
function applyTabHeaderOrder(shouldRenderSettings){
    let headers = Array.from(document.querySelectorAll('.tab-header'));
    let topHeader = headers[0];
    if(!topHeader) return;
    let bottomHeader = document.getElementById('tab-header-bottom');
    game.settings=game.settings||{};
    game.settings.tabPlacement = game.settings.tabPlacement || {};
    if (!game.settings.tabPlacementInitialized && window.matchMedia('(max-width: 1080px)').matches) {
        game.settings.tabPlacementInitialized = true;
        let autoIds = Array.from(topHeader.querySelectorAll('.tab-btn')).map(el => el.id);
        autoIds.forEach((id, idx) => { game.settings.tabPlacement[id] = idx === 0 ? 'top' : 'bottom'; });
    }
    let allTabButtons = headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')));
    let ids=allTabButtons.map(el=>el.id);
    let order=Array.isArray(game.settings.tabOrder)?game.settings.tabOrder:ids;
    let map={}; allTabButtons.forEach(el=>map[el.id]=el);
    order.forEach(id=>{
        if(!map[id]) return;
        let target = (game.settings.tabPlacement[id] === 'bottom' && bottomHeader) ? bottomHeader : topHeader;
        target.appendChild(map[id]);
    });
    ids.forEach(id=>{ if(!order.includes(id) && map[id]) topHeader.appendChild(map[id]); });
    if (bottomHeader) bottomHeader.style.display = bottomHeader.children.length ? 'flex' : 'none';
    if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
}
function setTabPlacement(tabId, placement){
    game.settings = game.settings || {};
    game.settings.tabPlacement = game.settings.tabPlacement || {};
    game.settings.tabPlacement[tabId] = placement === 'bottom' ? 'bottom' : 'top';
    applyTabHeaderOrder(true);
}
function moveTabButton(tabId, dir){
    game.settings=game.settings||{};
    let headers = Array.from(document.querySelectorAll('.tab-header'));
    if (!headers.length) return;
    let ids=headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')).map(el=>el.id));
    let order=Array.isArray(game.settings.tabOrder)?game.settings.tabOrder.slice():ids.slice();
    if(order.length!==ids.length) order=ids.slice();
    let idx=order.indexOf(tabId); if(idx<0) return;
    let ni=Math.max(0, Math.min(order.length-1, idx+dir)); if(ni===idx) return;
    let t=order[idx]; order[idx]=order[ni]; order[ni]=t; game.settings.tabOrder=order;
    applyTabHeaderOrder(true);
}

function isNotiEnabled(key){ game.settings=game.settings||{}; game.settings.notiFilters=game.settings.notiFilters||{}; return game.settings.notiFilters[key] !== false; }
function toggleNotiFilter(key){ game.settings=game.settings||{}; game.settings.notiFilters=game.settings.notiFilters||{}; game.settings.notiFilters[key]=!(game.settings.notiFilters[key] !== false); updateStaticUI(); }

function switchTab(tabId) {
    hideInfoTooltip();
    hideItemTooltip();
    if (typeof window.hidePassiveNodeTooltip === 'function') window.hidePassiveNodeTooltip();
    syncDerivedTabUnlock(tabId);
    let gateKey = TAB_UNLOCK_GATES[tabId];
    if (gateKey && !game.unlocks[gateKey]) {
        addLog(getLockedTabMessage(tabId), 'attack-monster');
        return;
    }
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    let activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.add('active');
    if (activeBtn && activeBtn.scrollIntoView && window.matchMedia('(max-width: 1080px)').matches) {
        try {
            activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        } catch (error) {
            activeBtn.scrollIntoView();
        }
    }
    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'map', 'traits', 'expertise'].forEach(key => { if (tabId === 'tab-' + key) game.noti[key] = false; });
    if (tabId === 'tab-items') switchItemSubtab('item-tab-equip');
    updateMobileBattlePipVisibility();
    updateStaticUI();
    if (tabId === 'tab-char') {
        setTimeout(function() {
            fitPassiveCameraToBounds(false);
            resizePassiveTreeCanvas(true);
            drawPassiveTree();
            resizeCanvas();
        }, 40);
    } else if (tabId === 'tab-battle') {
        startBattleAssetLoadNow();
        setTimeout(function () {
            syncBattleTabLayout(false);
            scheduleStableResize();
        }, 40);
    } else if (tabId === 'tab-settings') {
        renderTabOrderSettings();
    }
}

function switchItemSubtab(subtabId) {
    if (subtabId === 'item-tab-market' && !isMarketUnlocked()) {
        addLog('액트 5를 먼저 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
        subtabId = 'item-tab-equip';
    }
    if (subtabId === 'item-tab-infuser' && (typeof isChaosInfuserUnlocked !== 'function' || !isChaosInfuserUnlocked())) {
        addLog('나무꾼을 한 번 이상 마주치면 혼돈 주입기가 해금됩니다.', 'attack-monster');
        subtabId = 'item-tab-equip';
    }
    game.itemSubtab = subtabId;
    document.querySelectorAll('#tab-items .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-items .subtab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(subtabId).classList.add('active');
    document.getElementById('btn-' + subtabId).classList.add('active');
}



function getDefaultSkillAutoRule() {
    return {
        id: `rule_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        enabled: true,
        priority: ((game.skillAutoRules || []).length + 1),
        hpThreshold: 40,
        triggerType: 'hp_below',
        skillName: ''
    };
}

function addSkillAutoRule() {
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];

    game.skillAutoRules.push(getDefaultSkillAutoRule());
    renderSkillAutoRulePanel();
}

function sortSkillAutoRules() {
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];

    game.skillAutoRules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    game.skillAutoRules.forEach((rule, idx) => rule.priority = idx + 1);
    renderSkillAutoRulePanel();
}

function getAllConditionGemEntries() {
    let db = window.CONDITION_GEM_DB || {};
    return [].concat(db.curse || [], db.warcry || [], db.guard || [], db.utility || []);
}

function rollConditionGemChoices() {
    if (!game.conditionGemUnlocked) return addLog('컨디션 젬이 아직 잠겨 있습니다. 루프2 뿌리 보스를 먼저 쓰러뜨리세요.', 'attack-monster');
    if ((game.currencies.bossCore || 0) <= 0) return addLog('군주의 핵이 부족합니다.', 'attack-monster');
    let all = getAllConditionGemEntries();
    let ownedSet = new Set(Array.isArray(game.conditionGemPool) ? game.conditionGemPool : []);
    let unownedPool = all.filter(entry => !ownedSet.has(entry.name));
    let upgradablePool = all.filter(entry => ownedSet.has(entry.name) && Math.max(1, Math.floor(((game.conditionGemLevels || {})[entry.name] || 1))) < 5);
    let pool = unownedPool.length > 0 ? unownedPool.slice() : upgradablePool.slice();
    if (pool.length === 0) return addLog('해금/강화 가능한 컨디션 젬이 더 이상 없습니다.', 'attack-monster');
    game.currencies.bossCore--;
    let choices = [];
    while (choices.length < Math.min(3, pool.length)) {
        let pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        choices.push(pick);
    }
    game.pendingConditionGemChoices = choices;
    renderSkillAutoRulePanel();
    openConditionGemChoiceOverlay();
}

function getConditionGemDetail(entry) {
    if (!entry) return '';
    let d = getConditionGemStatDelta(entry.name, entry.type);
    let out = [];
    if (d.enemyTakenMul) out.push(`받는피해 +${Math.round((d.enemyTakenMul - 1) * 100)}%`);
    if (d.enemyResShred) out.push(`저항관통 +${d.enemyResShred}`);
    if (d.pctDmg) out.push(`피해 +${d.pctDmg}%`);
    if (d.aspd) out.push(`공속 +${d.aspd}%`);
    if (d.dr) out.push(`물피감 ${d.dr > 0 ? '+' : ''}${d.dr}%`);
    if (d.regen) out.push(`재생 +${d.regen}%/s`);
    if (d.leech) out.push(`흡수 +${d.leech}%`);
    return out.join(' · ') || '특수 효과';
}
function getConditionGemTooltip(entry) {
    if (!entry) return '';
    let cast = Number(entry.castTime || 1).toFixed(1);
    let duration = Number(entry.duration || 4).toFixed(1);
    let cooldown = Math.max(2, Math.floor((entry.castTime || 1) * 1000 + 2500) / 1000).toFixed(1);
    return `${entry.name}\n유형: ${entry.type}\n시전 시간: ${cast}초\n지속 시간: ${duration}초\n쿨타임: ${cooldown}초\n효과: ${getConditionGemDetail(entry)}`;
}


function getConditionGemTooltipHtml(entry) {
    if (!entry) return '';
    let cast = Number(entry.castTime || 1).toFixed(1);
    let duration = Number(entry.duration || 4).toFixed(1);
    let cooldown = Math.max(2, Math.floor((entry.castTime || 1) * 1000 + 2500) / 1000).toFixed(1);
    let lv = Math.max(1, Math.min(5, Math.floor(((game.conditionGemLevels || {})[entry.name] || 1))));
    let html = `<div class="tooltip-title">${entry.name} · Lv.${lv}</div>`;
    html += `<div class="tooltip-line">${entry.desc || '컨디션 젬 효과'}</div>`;
    html += `<div class="tooltip-line" style="margin-top:6px;">시전 시간 ${cast}초 · 지속 ${duration}초 · 쿨타임 ${cooldown}초</div>`;
    html += `<div class="tooltip-line">효과: ${getConditionGemDetail(entry)}</div>`;
    if ((entry.tags || []).length > 0) html += `<div class="tooltip-line">태그: ${entry.tags.join(' / ')}</div>`;
    return html;
}
function showConditionGemTooltip(event, name) {
    let entry = getAllConditionGemEntries().find(e => e.name === name);
    if (!entry) return;
    showInfoTooltipHtml(event.clientX, event.clientY, getConditionGemTooltipHtml(entry), '#ff5252');
}

function openConditionGemChoiceOverlay() {
    let pending = Array.isArray(game.pendingConditionGemChoices) ? game.pendingConditionGemChoices : [];
    if (pending.length <= 0 || document.getElementById('condition-gem-overlay')) return;
    let html = `<div id="condition-gem-overlay" style="position:fixed;inset:0;background:rgba(9,12,20,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;">
        <div style="width:min(980px,95vw);background:#0f1520;border:1px solid #3e5472;border-radius:12px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong>군주의 핵 컨디션 젬 가공</strong><button onclick="closeConditionGemChoiceOverlay()">닫기</button></div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">${pending.map(e => `<button onclick="pickConditionGem('${e.name}')" style="text-align:left;padding:10px;"><div><strong>${e.name}</strong></div><div style="color:#9ac3e8;font-size:.82em;">${e.type} · ${(e.tags||[]).join('/')}</div><div style="color:#f2d79c;font-size:.8em;margin-top:4px;">${getConditionGemDetail(e)}</div></button>`).join('')}</div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
function closeConditionGemChoiceOverlay() { let el = document.getElementById('condition-gem-overlay'); if (el) el.remove(); }

function pickConditionGem(name) {
    game.conditionGemPool = Array.isArray(game.conditionGemPool) ? game.conditionGemPool : [];
    game.conditionGemLevels = game.conditionGemLevels || {};
    if (!game.conditionGemPool.includes(name)) {
        game.conditionGemPool.push(name);
        game.conditionGemLevels[name] = Math.max(1, Math.floor(game.conditionGemLevels[name] || 1));
        addLog(`✨ 컨디션 젬 [${name}] 해금!`, 'loot-unique');
    } else {
        let prev = Math.max(1, Math.floor(game.conditionGemLevels[name] || 1));
        let next = Math.min(5, prev + 1);
        game.conditionGemLevels[name] = next;
        addLog(next > prev ? `🔺 컨디션 젬 [${name}] 레벨 ${next} 달성!` : `ℹ️ 컨디션 젬 [${name}]은 이미 최대 레벨입니다.`, 'loot-rare');
    }
    game.pendingConditionGemChoices = null;
    closeConditionGemChoiceOverlay();
    renderSkillAutoRulePanel();
}

function renderSkillAutoRulePanel() {
    let panel = document.getElementById('ui-skill-rules-panel');
    if (!panel) return;
    let unlocked = !!game.conditionGemUnlocked;
    let owned = Array.isArray(game.conditionGemPool) ? game.conditionGemPool : [];
    let pending = Array.isArray(game.pendingConditionGemChoices) ? game.pendingConditionGemChoices : [];
    if (!unlocked) {
        panel.innerHTML = `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">잠금 상태: 루프2 뿌리 보스를 처음 처치하면 컨디션 젬이 해금됩니다.</div>`;
        return;
    }
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];
    let summary = `<div style="background:#101722; border:1px solid #324a66; border-radius:8px; padding:10px;">해금 젬 수: <strong>${owned.length}</strong> / ${getAllConditionGemEntries().length} · 군주의 핵: <strong>${game.currencies.bossCore || 0}</strong> · 선택지 <strong>3</strong>개 <button style="margin-left:8px;" onclick="rollConditionGemChoices()">군주의 핵으로 컨디션 젬 가공</button></div>`;
    let choiceHtml = pending.length > 0 ? `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">${pending.map(entry => `<button onclick="pickConditionGem('${entry.name}')"><strong>${entry.name}</strong><br><small>${entry.type} · ${entry.tags.join('/')}</small></button>`).join('')}</div>` : '';
    let ownedEntries = getAllConditionGemEntries().filter(entry => owned.includes(entry.name));
    let ownedHtml = ownedEntries.length > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">${ownedEntries.map(entry => {
        let safeName = String(entry.name || '').replace(/'/g, "\\'");
        return `<div class="condition-gem-card" style="border:1px solid #314761;border-radius:8px;padding:7px; cursor:help;" onmouseover="showConditionGemTooltip(event,'${safeName}')" onmouseenter="showConditionGemTooltip(event,'${safeName}')" onmousemove="showConditionGemTooltip(event,'${safeName}')" onmouseleave="hideInfoTooltip()"><strong>${entry.name}</strong><small style="margin-left:6px;color:#9ec1e1;">Lv.${Math.max(1,Math.min(5,Math.floor(((game.conditionGemLevels||{})[entry.name]||1))))}</small></div>`;
    }).join('')}</div>` : '';

    if (game.skillAutoRules.length === 0) {
        panel.innerHTML = summary + choiceHtml + ownedHtml + `<div style="color:#7f8c8d; border:1px dashed #39506c; border-radius:8px; padding:12px; margin-top:8px;">아직 규칙이 없습니다. 규칙 추가 버튼으로 시작하세요.</div>`;
        return;
    }
    panel.innerHTML = summary + choiceHtml + ownedHtml + game.skillAutoRules.map((rule, idx) => `
        <div style="background:#111722; border:1px solid #304a67; border-radius:10px; padding:10px; display:grid; gap:6px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <label><input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="game.skillAutoRules[${idx}].enabled=this.checked;"> 사용</label>
                <label>우선순위 <input type="number" min="1" value="${rule.priority || (idx+1)}" style="width:60px;" onchange="game.skillAutoRules[${idx}].priority=Math.max(1,Math.floor(this.value||1));"></label>
                <button onclick="game.skillAutoRules.splice(${idx},1); renderSkillAutoRulePanel();">삭제</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; color:#c7d7ea;">
                <span>IF</span>
                <select onchange="game.skillAutoRules[${idx}].triggerType=this.value;">
                    <option value="hp_below" ${(rule.triggerType||'hp_below')==='hp_below'?'selected':''}>HP ≤</option>
                    <option value="hp_above" ${(rule.triggerType||'hp_below')==='hp_above'?'selected':''}>HP ≥</option>
                    <option value="enemy_many" ${(rule.triggerType||'hp_below')==='enemy_many'?'selected':''}>적 수 ≥</option>
                    <option value="enemy_few" ${(rule.triggerType||'hp_below')==='enemy_few'?'selected':''}>적 수 ≤</option>
                    <option value="es_below" ${(rule.triggerType||'hp_below')==='es_below'?'selected':''}>ES ≤</option>
                    <option value="es_above" ${(rule.triggerType||'hp_below')==='es_above'?'selected':''}>ES ≥</option>
                    <option value="boss_present" ${(rule.triggerType||'hp_below')==='boss_present'?'selected':''}>보스 등장 시</option>
                    <option value="boss_absent" ${(rule.triggerType||'hp_below')==='boss_absent'?'selected':''}>보스 없음</option>
                </select>
                <input type="number" min="1" max="100" value="${rule.hpThreshold || 40}" style="width:64px;" onchange="game.skillAutoRules[${idx}].hpThreshold=Math.min(100,Math.max(1,Math.floor(this.value||40)));">
                <span>%</span>
                <span>THEN</span>
                <select onchange="game.skillAutoRules[${idx}].skillName=this.value;" style="min-width:180px;">
                    <option value="">사용할 젬 선택</option>
                    ${ownedEntries.map(entry => `<option value="${entry.name}" title="${escapeHTML(getConditionGemTooltip(entry))}" ${rule.skillName===entry.name?'selected':''}>${entry.name} (${entry.type})</option>`).join('')}
                </select>
            </div>
        </div>`).join('');
}

function switchSkillSubtab(subtabId) {
    game.skillSubtab = subtabId;
    document.querySelectorAll('#tab-skills .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-skills .subtab-btn').forEach(el => el.classList.remove('active'));
    let panel = document.getElementById(subtabId);
    let btn = document.getElementById('btn-' + subtabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}



function closeBeehiveChoiceOverlay() {
    let el = document.getElementById('beehive-choice-overlay');
    if (el) el.remove();
}

function getBeehiveChoiceButtonsHtml(c) {
    if (!c) return '';
    if (c.a && c.b && c.c) {
        return `<button onclick="resolveBeehiveChoice('a')" style="text-align:left;padding:10px;">${c.a.text}</button><button onclick="resolveBeehiveChoice('b')" style="text-align:left;padding:10px;">${c.b.text}</button><button onclick="resolveBeehiveChoice('c')" style="text-align:left;padding:10px;">${c.c.text}</button>`;
    }
    return `<button onclick="resolveBeehiveChoice('legacy_now')" style="text-align:left;padding:10px;">${c.nowText || '즉시 보상'}</button><button onclick="resolveBeehiveChoice('legacy_later')" style="text-align:left;padding:10px;">${c.laterText || '지연 보상'}</button>`;
}

function openBeehiveChoiceOverlay(reasonText) {
    let b = game.beehive || {};
    let alive = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (!b.inRun || !b.pendingChoice || b.awaitingClear || alive > 0 || document.getElementById('beehive-choice-overlay')) return;
    let next = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    let html = `<div id="beehive-choice-overlay" style="position:fixed;inset:0;background:rgba(8,8,5,.76);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;">
        <div style="width:min(920px,95vw);background:#17130b;border:1px solid #9b7a30;border-radius:14px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.45);">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;"><strong style="color:#ffd978;font-size:18px;">🐝 벌떼 웨이브 처치 완료</strong><button onclick="closeBeehiveChoiceOverlay()">닫기</button></div>
            <div style="color:#d9c08a;margin-bottom:10px;line-height:1.45;">${reasonText || '다음 갈림길을 선택하세요.'}<br>갈림길 ${next}/10 · 선택 즉시 다음 벌떼 웨이브가 시작됩니다.</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">${getBeehiveChoiceButtonsHtml(b.pendingChoice)}</div>
            <div style="color:#95835d;font-size:.82em;margin-top:10px;">닫아도 벌집 패널에서 다시 선택할 수 있습니다.</div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function renderLoop8BeehivePanel() {
    let open = (game.season || 1) >= 8;
    let header = document.getElementById('ui-beehive-header');
    let panel = document.getElementById('ui-beehive-panel');
    if (!header || !panel) return;
    header.style.display = open ? 'block' : 'none';
    panel.style.display = open ? 'block' : 'none';
    if (!open) return;
    let b = game.beehive || (game.beehive = { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 });
    if (b.inRun && !b.pendingChoice && !b.awaitingClear && !b.queenActive) prepareBeehiveBranchChoices(b);
    let choiceHtml = '';
    if (b.inRun && b.awaitingClear && (game.enemies || []).filter(e => e.hp > 0).length === 0) {
        onBeehiveWaveCleared();
    }
    let aliveBeeEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (b.inRun && b.pendingChoice && !b.awaitingClear && aliveBeeEnemies <= 0) {
        openBeehiveChoiceOverlay();
        let c = b.pendingChoice;
        if (c.a && c.b && c.c) {
            choiceHtml = `<div style="margin-top:8px; display:grid; gap:6px;"><div style="color:#ffd978; font-weight:700;">갈림길 선택 (${Math.min(10, (b.branchStep || 0) + 1)}/10) · 선택 즉시 벌떼 웨이브가 시작됩니다.</div><button onclick="resolveBeehiveChoice('a')">${c.a.text}</button><button onclick="resolveBeehiveChoice('b')">${c.b.text}</button><button onclick="resolveBeehiveChoice('c')">${c.c.text}</button></div>`;
        } else {
            // Legacy save compatibility: old shape used now/later keys.
            choiceHtml = `<div style="margin-top:8px; display:grid; gap:6px;"><div style="color:#ffd978; font-weight:700;">갈림길 선택 (${Math.min(10, (b.branchStep || 0) + 1)}/10)</div><button onclick="resolveBeehiveChoice('legacy_now')">${c.nowText || '즉시 보상'}</button><button onclick="resolveBeehiveChoice('legacy_later')">${c.laterText || '지연 보상'}</button></div>`;
        }
    } else if (b.inRun && b.awaitingClear) {
        choiceHtml = `<div style="margin-top:8px; color:#f3d28a;">${b.queenActive ? '여왕벌 전투 진행 중' : `벌떼 웨이브 진행 중 (${Math.max(0, Math.floor(b.branchStep || 0))}/10)`} · 남은 적 <strong>${aliveBeeEnemies}</strong>마리를 모두 처치해야 진행할 수 있습니다.</div>`;
    }
    let beekeeperLv = getBeekeeperLevelForHive();
    let hiveUnlockText = `양봉업자 Lv.${beekeeperLv} · 카오스 ${beekeeperLv >= 3 ? '해금' : 'Lv.3'} · 신성한오브 ${beekeeperLv >= 5 ? '해금' : 'Lv.5'}`;
    panel.innerHTML = `<div style="color:#f6d68e; margin-bottom:6px;">열쇠: <strong>${game.currencies.hiveKey||0}</strong> · 꽃가루: <strong>${game.currencies.pollen||0}</strong> · 독벌침: <strong>${game.currencies.venomStinger||0}</strong> · 벌꿀: <strong>${game.currencies.enchantedHoney||0}</strong> · 밀랍: <strong>${game.currencies.beeswax||0}</strong></div>
    <div style="color:#b8c7d8; font-size:0.82em; margin-bottom:8px;">자동 맵 진행 없이 갈림길 선택 → 벌떼 웨이브 → 전멸 확인 순서로 진행됩니다. 선택마다 진행도 10%가 오르고, 10개 갈림길 완료 후 여왕벌이 등장합니다.<br>${hiveUnlockText}</div>
    <div style="color:#f6d68e; margin-bottom:8px;">진행도: <strong>${Math.min(100, Math.max(0, Math.floor(b.branchStep || 0) * 10))}%</strong> · 완료한 갈림길: <strong>${Math.min(10, Math.max(0, Math.floor(b.branchStep || 0)))}/10</strong>${b.queenActive ? ' · <strong>여왕벌 등장</strong>' : ''}</div>
    <div style="display:flex; gap:6px; flex-wrap:wrap;"><button onclick="startBeehiveRun()" ${(game.currencies.hiveKey||0)<=0 || b.inRun ? 'disabled':''}>벌집 입장</button><button onclick="forfeitBeehiveRun()" ${b.inRun ? '':'disabled'}>던전 포기</button></div>${choiceHtml}`;
}
function renderLoop9VoidRiftPanel(){ let open=(game.season||1)>=9; let h=document.getElementById('ui-voidrift-header'); let p=document.getElementById('ui-voidrift-panel'); if(!h||!p)return; h.style.display=open?'block':'none'; p.style.display=open?'block':'none'; if(!open)return; let v=game.voidRift||(game.voidRift={meter:0,active:false,breachClears:0,grandBreachUnlock:false,activeKills:0,requiredKills:0}); let g=v.grandRun||{}; let progress=v.active?`${Math.max(0,Math.floor(v.activeKills||0))}/${Math.max(1,Math.floor(v.requiredKills||0))}`:'-'; let grandText=g.inRun?` · 대균열: <strong>${g.phase==='survival'?'생존전':'보스전'}</strong> · 남은시간: <strong>${Math.max(0,Math.ceil(g.timeLeft||0))}초</strong> · 처치: <strong>${Math.floor(g.kills||0)}</strong>`:''; let canEnter=(v.grandBreachUnlock&&!g.inRun); p.innerHTML=`<div style="color:#c7d2ff;">활성 균열: <strong>${v.active?'진행중':'없음'}</strong> · 균열 진행: <strong>${progress}</strong> · 대균열 해금: <strong>${v.grandBreachUnlock?'가능':'잠김'}</strong>${grandText}</div><div style="display:flex; gap:6px; margin-top:8px;"><button class="ominous-entry-btn" onclick="enterGrandBreach()" ${canEnter?'':'disabled'}>대균열 진입</button></div>`; }
function spawnBeehiveWave(isBoss){
    let b = game.beehive || {};
    let zone = getZone('beehive_run') || getZone(0);
    let step = Math.max(1, Math.floor(b.branchStep || 1));
    let count = isBoss ? 1 : Math.min(10, 5 + Math.floor(step / 2) + Math.floor(Math.random() * 2));
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.moveTimer = 0;
    for (let i = 0; i < count; i++) {
        let marker = { elite: !isBoss && Math.random() < 0.78, boss: isBoss };
        let enemy = createEnemy(zone, marker, i);
        let depthScale = 1 + Math.max(0, step) * 0.16 + Math.max(0, Math.floor(b.enemyEmpower || 0)) * 0.22;
        enemy.maxHp = Math.floor(enemy.maxHp * depthScale);
        enemy.hp = enemy.maxHp;
        enemy.atkMul *= (1 + Math.max(0, Math.floor(b.enemyEmpower || 0)) * 0.12);
        if (isBoss) {
            enemy.name = '👑 벌집 여왕';
            enemy.maxHp = Math.floor(enemy.maxHp * 2.4);
            enemy.hp = enemy.maxHp;
            enemy.atkMul *= 1.75;
            enemy.critChance = (enemy.critChance || 0) + 14;
            enemy.penetration = (enemy.penetration || 0) + 18;
            enemy.traitName = `분노한 군체 (강화 ${Math.floor(b.enemyEmpower || 0)})`;
        } else {
            enemy.name = `${enemy.isElite ? '정예 ' : ''}🐝 벌집 전투벌`;
            enemy.traitName = enemy.traitName || '벌떼 돌격';
        }
        game.enemies.push(enemy);
    }
    if (isBoss) addLog('👑 10개 갈림길을 완료해 여왕벌이 등장했습니다. 여왕벌을 처치하면 벌집 원정이 완료됩니다.', 'loot-unique');
    else addLog(`🐝 벌떼 웨이브 시작! 진행도 ${Math.min(100, step * 10)}% · 남은 적을 모두 처치해야 다음 갈림길이 열립니다.`, 'attack-monster');
}
function getBeekeeperLevelForHive() {
    return typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('beekeeper') || 1)) : 1;
}
function resetBeehiveRunModifiers(b) {
    if (!b) return;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = [];
    b.queenActive = false;
}
function getBeehiveRewardAmount(base, branchStep, expertLevel) {
    let depthBonus = Math.max(0, Math.floor(branchStep || 0)) * 0.08;
    let expertBonus = Math.max(0, expertLevel - 1) * 0.03;
    let nodeBonus = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('beehiveRewardPct') || 0) / 100 : 0;
    return Math.max(1, Math.floor(base * (1 + depthBonus + expertBonus + nodeBonus)));
}
function getBeehivePenaltyPool(expertLevel, branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    let pool = [
        { key: 'swarm', text: '군체 분노 +1', power: 1, apply: b => { b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + 1)); } },
        { key: 'sting', text: '독침 상처(체력 -5%)', power: 1, apply: () => { game.playerHp = Math.max(1, Math.floor((game.playerHp || 1) * 0.95)); } },
        { key: 'pollen_tax', text: '꽃가루 -6', power: 1, apply: () => { game.currencies.pollen = Math.max(0, (game.currencies.pollen || 0) - 6); } }
    ];
    if (depth >= 4) pool.push({ key: 'deep_swarm', text: '심층 군체 분노 +2', power: 2, apply: b => { b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + 2)); } });
    if (expertLevel >= 4) pool.push({ key: 'venom_tax', text: '독벌침 소모 가능', power: 1, apply: () => { if (Math.random() < 0.25) game.currencies.venomStinger = Math.max(0, (game.currencies.venomStinger || 0) - 1); } });
    if (expertLevel >= 6) pool.push({ key: 'honey_tax', text: '벌꿀 소모 가능', power: 1, apply: () => { if (Math.random() < 0.20) game.currencies.enchantedHoney = Math.max(0, (game.currencies.enchantedHoney || 0) - 1); } });
    if (expertLevel >= 10) pool.push({ key: 'royal_swarm', text: '왕실 군체 분노 +3', power: 3, apply: b => { b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + 3)); } });
    return pool;
}
function getBeehiveRewardPool(expertLevel, branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    let pool = [
        { type: 'pollen', weight: 42 },
        { type: 'honey', weight: expertLevel >= 2 ? 18 : 8 },
        { type: 'stinger', weight: expertLevel >= 4 ? 16 : 6 }
    ];
    if (expertLevel >= 3) pool.push({ type: 'chaos', weight: 14 + Math.min(8, depth) });
    if (expertLevel >= 5) pool.push({ type: 'divine', weight: 2 + Math.floor(depth / 4) + (expertLevel >= 13 ? 2 : 0) });
    if (expertLevel >= 7 || depth >= 6) pool.push({ type: 'jewelShard', weight: 10 }, { type: 'meteorShard', weight: 5 });
    if (expertLevel >= 8) pool.push({ type: 'spore', weight: 8 }, { type: 'beeswax', weight: 10 });
    if (expertLevel >= 15) pool.push({ type: 'bundle', weight: 4 });
    return pool;
}
function pickWeightedBeehiveReward(expertLevel, branchStep, usedTypes) {
    let used = usedTypes || new Set();
    let pool = getBeehiveRewardPool(expertLevel, branchStep).filter(row => !used.has(row.type));
    if (pool.length <= 0) pool = getBeehiveRewardPool(expertLevel, branchStep);
    let total = pool.reduce((sum, row) => sum + Math.max(0, row.weight || 0), 0);
    let roll = Math.random() * Math.max(1, total);
    for (let row of pool) {
        roll -= Math.max(0, row.weight || 0);
        if (roll <= 0) return row.type;
    }
    return pool[0].type;
}
function prepareBeehiveBranchChoices(b) {
    if (!b || !b.inRun || b.awaitingClear || b.queenActive) return;
    let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    let lv = getBeekeeperLevelForHive();
    let used = new Set();
    let immediate = pickWeightedBeehiveReward(lv, nextStep, used);
    used.add(immediate);
    let wave = pickWeightedBeehiveReward(lv, nextStep, used);
    used.add(wave);
    let queen = pickWeightedBeehiveReward(lv, nextStep, used);
    b.pendingChoice = {
        a: buildBeehiveChoiceOption(immediate, lv, nextStep, 'immediate'),
        b: buildBeehiveChoiceOption(wave, lv, nextStep, 'wave'),
        c: buildBeehiveChoiceOption(queen, lv, nextStep, 'queen'),
        expertLevel: lv,
        branchStep: nextStep
    };
}

function getBeehiveRewardTimingLabel(timing) {
    if (timing === 'immediate') return '즉시 보상';
    if (timing === 'queen') return '여왕벌 보상';
    return '웨이브 보상';
}

function getBeehiveRewardTimingMultiplier(timing) {
    if (timing === 'immediate') return 0.55;
    if (timing === 'queen') return 2.25;
    return 1;
}

function scaleBeehiveRewardAmount(baseAmount, timing) {
    return Math.max(1, Math.floor(Math.max(1, baseAmount || 1) * getBeehiveRewardTimingMultiplier(timing)));
}

function scaleBeehiveRewardChance(baseChance, timing) {
    let chance = Number.isFinite(baseChance) ? baseChance : 1;
    if (timing === 'immediate') return Math.max(0.05, Math.min(1, chance * 0.75));
    if (timing === 'queen') return Math.min(1, chance + 0.35);
    return chance;
}

function buildBeehiveChoiceOption(type, expertLevel, branchStep, timing = 'wave') {
    let lv = Math.max(1, Math.floor(expertLevel || getBeekeeperLevelForHive()));
    let step = Math.max(1, Math.floor(branchStep || ((game.beehive || {}).branchStep || 1)));
    let penaltyPool = getBeehivePenaltyPool(lv, step);
    let penalty = penaltyPool[Math.floor(Math.random() * penaltyPool.length)];
    let label = getBeehiveRewardTimingLabel(timing);
    let mk = (text, effect, amount, chance) => ({ text: `[${label}] ${text} / 대가: ${penalty.text}`, effect, amount, chance, penalty, expertLevel: lv, timing });
    if (type === 'pollen') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(12 + Math.floor(Math.random() * 7), step, lv), timing); return mk(`꽃가루 +${amount}`, 'pollen', amount); }
    if (type === 'honey') { let chance = scaleBeehiveRewardChance(lv >= 2 ? 0.30 : 0.12, timing); return mk(`벌꿀 획득 확률 ${Math.floor(chance * 100)}%`, 'honey', 1, chance); }
    if (type === 'stinger') { let chance = scaleBeehiveRewardChance(lv >= 4 ? 0.38 : 0.14, timing); return mk(`독벌침 획득 확률 ${Math.floor(chance * 100)}%`, 'stinger', 1, chance); }
    if (type === 'chaos') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(1 + (step >= 7 ? 1 : 0), step, lv), timing); return mk(`카오스 오브 +${amount}`, 'chaos', amount); }
    if (type === 'divine') { let chance = scaleBeehiveRewardChance(lv >= 13 || step >= 8 ? 1 : 0.35, timing); return mk(chance >= 1 ? '신성한 오브 +1' : `신성한 오브 획득 확률 ${Math.floor(chance * 100)}%`, 'divine', 1, chance); }
    if (type === 'jewelShard') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step, lv), timing); return mk(`주얼 파편 +${amount}`, 'jewelShard', amount); }
    if (type === 'meteorShard') { let amount = scaleBeehiveRewardAmount(step >= 8 ? 2 : 1, timing); return mk(`운석 파편 +${amount}`, 'meteorShard', amount); }
    if (type === 'beeswax') { let amount = scaleBeehiveRewardAmount(step >= 8 ? 2 : 1, timing); return mk(`밀랍 +${amount}`, 'beeswax', amount); }
    if (type === 'spore') {
        let sporeType = rndChoice(['sporeFire', 'sporeCold', 'sporeLight']);
        let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step, lv), timing);
        return mk(`${ORB_DB[sporeType].name} +${amount}`, sporeType, amount);
    }
    if (type === 'bundle') {
        let amount = scaleBeehiveRewardAmount(1, timing);
        return mk(amount > 1 ? `중첩 보상 x${amount}: 꽃가루 + 독벌침 + 카오스` : '중첩 보상: 꽃가루 + 독벌침 + 카오스', 'bundle', amount);
    }
    let amount = scaleBeehiveRewardAmount(10, timing);
    return mk(`꽃가루 +${amount}`, 'pollen', amount);
}
function applyBeehiveChoicePenalty(penalty, b) {
    if (!penalty) return '';
    if (typeof penalty.apply === 'function') { penalty.apply(b); return penalty.text || ''; }
    let power = Math.max(1, Math.floor(penalty.power || 1));
    if (['swarm', 'deep_swarm', 'royal_swarm'].includes(penalty.key)) b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + power));
    else if (penalty.key === 'sting') game.playerHp = Math.max(1, Math.floor((game.playerHp || 1) * 0.95));
    else if (penalty.key === 'pollen_tax') game.currencies.pollen = Math.max(0, (game.currencies.pollen || 0) - 6);
    else if (penalty.key === 'venom_tax' && Math.random() < 0.25) game.currencies.venomStinger = Math.max(0, (game.currencies.venomStinger || 0) - 1);
    else if (penalty.key === 'honey_tax' && Math.random() < 0.20) game.currencies.enchantedHoney = Math.max(0, (game.currencies.enchantedHoney || 0) - 1);
    return penalty.text || '';
}
function applyBeehiveChoiceReward(pick) {
    if (!pick) return '';
    let chance = Number.isFinite(pick.chance) ? pick.chance : 1;
    if (chance < 1 && Math.random() >= chance) return '보상 획득 실패';
    let amount = Math.max(1, Math.floor(pick.amount || 1));
    if (pick.effect === 'honey') { game.currencies.enchantedHoney = (game.currencies.enchantedHoney || 0) + amount; return `벌꿀 +${amount}`; }
    if (pick.effect === 'stinger') { game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount; return `독벌침 +${amount}`; }
    if (pick.effect === 'bundle') {
        game.currencies.pollen = (game.currencies.pollen || 0) + (20 * amount);
        game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount;
        game.currencies.chaos = (game.currencies.chaos || 0) + amount;
        return `꽃가루 +${20 * amount} / 독벌침 +${amount} / 카오스 +${amount}`;
    }
    if (pick.effect) {
        game.currencies[pick.effect] = (game.currencies[pick.effect] || 0) + amount;
        return `${ORB_DB[pick.effect] ? ORB_DB[pick.effect].name : pick.effect} +${amount}`;
    }
    return '';
}
function startBeehiveRun(){
    let b = game.beehive || (game.beehive = {});
    if ((game.currencies.hiveKey || 0) <= 0 || b.inRun) return;
    resetBeehiveRunModifiers(b);
    game.currencies.hiveKey--;
    b.inRun = true;
    b.branchStep = 0;
    b.inMapZoneId = 'beehive_run';
    b.returnZoneId = game.currentZoneId;
    b.queenActive = false;
    game.currentZoneId = 'beehive_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.combatHalted = true;
    prepareBeehiveBranchChoices(b);
    addLog(`🐝 벌집 원정 시작! 갈림길을 선택하면 즉시 벌떼 웨이브가 시작됩니다.`, 'season-up');
    updateStaticUI();
}
function advanceBeehivePath(){
    let b = game.beehive;
    if (!b || !b.inRun || b.awaitingClear || b.pendingChoice || b.queenActive) return;
    prepareBeehiveBranchChoices(b);
    updateStaticUI();
}
function resolveBeehiveChoice(key){
    closeBeehiveChoiceOverlay();
    let b = game.beehive;
    let liveEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (!b || !b.pendingChoice || b.awaitingClear || liveEnemies > 0) return;
    let pick = b.pendingChoice[key];
    let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    if (!pick && (key === 'legacy_now' || key === 'legacy_later')) pick = buildBeehiveChoiceOption(key === 'legacy_now' ? 'pollen' : 'honey', getBeekeeperLevelForHive(), nextStep);
    if (!pick) return;
    let penaltyText = applyBeehiveChoicePenalty(pick.penalty, b);
    b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
    b.penaltyLedger = Array.isArray(b.penaltyLedger) ? b.penaltyLedger : [];
    let rewardText = String(pick.text || '').split(' / 대가:')[0];
    let rewardResult = '';
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = Array.isArray(b.pendingQueenRewards) ? b.pendingQueenRewards : [];
    if (pick.timing === 'immediate') {
        rewardResult = applyBeehiveChoiceReward(pick);
        if (rewardResult) b.rewardLedger.push(rewardResult);
    } else if (pick.timing === 'queen') {
        b.pendingQueenRewards.push({ effect: pick.effect, amount: pick.amount, chance: pick.chance, text: rewardText });
    } else {
        b.pendingWaveReward = { effect: pick.effect, amount: pick.amount, chance: pick.chance };
        b.pendingWaveRewardText = rewardText;
    }
    b.penaltyLedger.push(penaltyText || '');
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_branch_choice');
    b.pendingChoice = null;
    b.branchStep = nextStep;
    b.awaitingClear = true;
    b.queenActive = false;
    game.runProgress = Math.min(100, b.branchStep * 10);
    game.combatHalted = false;
    let timingText = pick.timing === 'immediate' ? `즉시 지급(${rewardResult || '보상 없음'})` : (pick.timing === 'queen' ? `여왕벌 처치 후 지급(${rewardText || '보상 없음'})` : `웨이브 처치 후 지급(${rewardText || '보상 없음'})`);
    addLog(`🐝 갈림길 ${b.branchStep}/10 선택 완료: ${timingText} · 대가: ${penaltyText || '없음'} · 벌떼 웨이브 시작`, 'loot-magic');
    spawnBeehiveWave(false);
    updateStaticUI();
}
function exitBeehiveRun(message, logType){
    closeBeehiveChoiceOverlay();
    let b = game.beehive || {};
    b.inRun = false;
    b.branchStep = 0;
    resetBeehiveRunModifiers(b);
    game.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    b.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    if (message) addLog(message, logType || 'attack-monster');
    updateStaticUI();
}
function completeBeehiveRun(){
    closeBeehiveChoiceOverlay();
    let b = game.beehive || {};
    let queenRewardResults = [];
    if (Array.isArray(b.pendingQueenRewards)) {
        b.pendingQueenRewards.forEach(reward => {
            let result = applyBeehiveChoiceReward(reward);
            if (result) queenRewardResults.push(result);
        });
    }
    b.inRun = false;
    b.cleared = true;
    b.unlockedPermanent = true;
    resetBeehiveRunModifiers(b);
    b.branchStep = 0;
    game.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    b.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    markLoopSpecialBossKill('beehive_queen');
    unlockJournalEntry('beehive_queen');
    if (Math.random() < 0.08) {
        let item = generateUniqueItem(Math.max(12, (getZone(game.currentZoneId) || { tier: 12 }).tier), '무기');
        addItemToInventory(item);
    }
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_clear');
    addLog(`👑 여왕벌 처치! 벌집 클리어 체크가 영구 적용되고 벌집 패널티가 초기화되었습니다.${queenRewardResults.length ? ` 여왕벌 보상: ${queenRewardResults.join(' / ')}` : ''}`, 'level-up');
    updateStaticUI();
}
function onBeehiveWaveCleared(){
    let b = game.beehive || {};
    if (!b.inRun || !b.awaitingClear) return;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.moveTimer = 0;
    if (b.queenActive) return completeBeehiveRun();
    let rewardResult = '';
    if (b.pendingWaveReward) {
        rewardResult = applyBeehiveChoiceReward(b.pendingWaveReward);
        b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
        if (rewardResult) b.rewardLedger.push(rewardResult);
        b.pendingWaveReward = null;
        b.pendingWaveRewardText = '';
    }
    b.awaitingClear = false;
    game.combatHalted = true;
    game.runProgress = Math.min(100, Math.max(0, Math.floor(b.branchStep || 0)) * 10);
    if ((b.branchStep || 0) >= 10) {
        b.awaitingClear = true;
        b.queenActive = true;
        game.combatHalted = false;
        spawnBeehiveWave(true);
        if (rewardResult) addLog(`🐝 벌떼 웨이브 정리 완료: ${rewardResult}. 여왕벌이 등장합니다.`, 'loot-unique');
        updateStaticUI();
        return;
    }
    prepareBeehiveBranchChoices(b);
    addLog(`🐝 벌떼 웨이브 정리 완료${rewardResult ? `: ${rewardResult}` : ''}. 다음 갈림길을 선택할 수 있습니다. (${b.branchStep}/10)`, 'loot-magic');
    openBeehiveChoiceOverlay(rewardResult ? `웨이브 보상: ${rewardResult}` : '웨이브를 정리했습니다.');
    updateStaticUI();
}
function forfeitBeehiveRun(){ let b=game.beehive; if(!b.inRun) return; exitBeehiveRun('벌집 원정을 포기하고 탈출했습니다.', 'attack-monster'); }
function craftBeehiveCurrency(type){ let beeLv=typeof getExpertLevel==='function'?Math.max(1,Math.floor(getExpertLevel('beekeeper')||1)):1; if(type==='wax'&&beeLv<8) return addLog('밀랍 제작은 양봉업자 Lv.8에 해금됩니다.', 'attack-monster'); if(type!=='key'&&type!=='wax'&&beeLv<6) return addLog('벌꿀/독벌침 교환은 양봉업자 Lv.6에 해금됩니다.', 'attack-monster'); let cost= type==='key'?200:type==='wax'?350:type==='stinger'?600:2000; let discount=typeof getExpertNodeEffectValue==='function'?Math.max(0,getExpertNodeEffectValue('waxCostReducePct')||0)/100:0; if(type==='wax') cost=Math.max(1,Math.floor(cost*(1-discount))); if((game.currencies.pollen||0)<cost) return; game.currencies.pollen-=cost; if(type==='key') game.currencies.hiveKey=(game.currencies.hiveKey||0)+1; if(type==='stinger') game.currencies.venomStinger=(game.currencies.venomStinger||0)+1; if(type==='honey') game.currencies.enchantedHoney=(game.currencies.enchantedHoney||0)+1; if(type==='wax') game.currencies.beeswax=(game.currencies.beeswax||0)+1; if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_currency_craft'); updateStaticUI(); }
function triggerVoidBreach(){ let v=game.voidRift; v.active=true; addLog('🕳️ 공허의 구멍이 열렸습니다! 몬스터가 쏟아집니다.', 'attack-monster'); updateStaticUI(); }
function clearVoidBreach(){ let v=game.voidRift; if(!v.active) return; v.active=false; v.breachClears=(v.breachClears||0)+1; if((v.breachClears||0) >= 1 || Math.random()<0.12) v.grandBreachUnlock=true; game.currencies.voidChisel=(game.currencies.voidChisel||0)+(Math.random()<0.03?1:0); addLog('공허 균열 정리 완료. 낮은 확률로 큰 구멍이 열립니다.', 'loot-magic'); updateStaticUI(); }
function enterGrandBreach(){ if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked(); let v=game.voidRift; if(!v.grandBreachUnlock) return; if(v.grandRun&&v.grandRun.inRun) return; v.grandBreachUnlock=false; v.grandRun={ inRun:true, phase:'survival', timeLeft:35, kills:0, nextRefillAt:0, lastTickAt:Date.now(), returnZoneId:game.currentZoneId }; game.currentZoneId='grand_breach_run'; game.enemies=[]; game.encounterPlan=[]; game.encounterIndex=0; game.runProgress=0; game.moveTimer=0; game.combatHalted=false; addLog('🌌 대균열 진입! 제한 시간 동안 몬스터가 계속 리필됩니다.', 'season-up'); updateStaticUI(); }
function toggleMeteorAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterMeteor = !game.settings.autoEnterMeteor; addLog(`☄️ 운석 낙하 자동입장 ${game.settings.autoEnterMeteor ? 'ON' : 'OFF'}`, 'season-up'); updateStaticUI(); }

function renderChaosRealmMapPanel() {
    let panel = document.getElementById('ui-chaos-realm-panel');
    let list = document.getElementById('ui-chaos-realm-list');
    if (!panel || !list) return;
    let st = ensureChaosRealmState();
    let best = Math.max(0, Number(st.woodsmanBestDamagePct || 0));
    if (!st.unlocked) {
        panel.innerHTML = `<div style="font-weight:700; color:#e9d7ff; margin-bottom:6px;">해금 조건</div><div>혼돈 밖 최종보스 나무꾼에게 <strong style="color:#ffd36b;">최대 생명력 10% 이상</strong>의 피해를 준 전투 종료 시 해금됩니다.</div><div style="margin-top:6px; color:#aebde0;">현재 최고 피해율: <strong style="color:${best >= 10 ? '#7dffb2' : '#ffd36b'};">${best.toFixed(1)}%</strong></div>`;
        list.innerHTML = `<div class="map-item"><div class="map-item-main"><span>🔒</span><span>혼돈계 봉인<br><span class="map-zone-status">나무꾼 피해율 10% 이상 필요</span></span></div><div class="map-item-actions"><span class="map-zone-status">${best.toFixed(1)} / 10%</span></div></div>`;
        return;
    }
    let entryReady = canEnterChaosRealm();
    let floor = Math.max(1, Math.floor(st.currentFloor || 1));
    let highest = Math.max(1, Math.floor(st.highestFloor || 1));
    let affixes = getChaosRealmAffixes(floor);
    let bonus = st.permanentBonuses || {};
    let bonusLine = [`피해 +${(bonus.pctDmg||0).toFixed(1)}%`, `이속 +${(bonus.move||0).toFixed(1)}%`, `생명력 +${(bonus.pctHp||0).toFixed(1)}%`, `카오스저항 +${Math.floor(bonus.resChaos||0)}%`, `치명 +${Math.floor(bonus.crit||0)}%`, `관통 +${Math.floor(bonus.resPen||0)}%`, `방어/회피/보호막 +${Math.floor(bonus.armorPct||0)}%`, `치피 +${Math.floor(bonus.critDmg||0)}%`, `공속 +${Math.floor(bonus.aspd||0)}%`].join(' · ');
    panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;"><div><div style="font-weight:800; color:#efd6ff; font-size:1.05em;">혼돈계 영구 레이어</div><div style="color:#aebde0; margin-top:4px;">루프로 초기화되지 않습니다. 최고 입장층 <strong style="color:#ffd36b;">${highest}층</strong> · 클리어 ${st.clearedFloors.length}층 · 나무꾼 최고 피해율 ${best.toFixed(1)}%</div></div><button onclick="enterChaosRealmPrompt()" ${entryReady ? '' : 'disabled'}>층 선택 입장</button></div><div style="margin-top:8px; color:${entryReady ? '#d6e4ff' : '#ffcf8a'};">${entryReady ? `영구 보너스: ${bonusLine}` : '입장 조건: 이번 루프에서 혼돈 20 클리어 필요 · 진행도/보너스는 보존됨'}</div><div style="margin-top:8px; color:#bda8ff;">현재 선택층 특징: ${affixes.map(a => `${a.name}(${a.desc})`).join(' · ')}</div>${highest >= 10 ? '<div style="margin-top:6px; color:#7dffb2;">혼돈계 10층 효과 활성: 모든 액트 구간 지도 길이 50% 축소</div>' : ''}`;
    let zone = getZone(CHAOS_REALM_ZONE_ID);
    list.innerHTML = `<div class="map-item ${game.currentZoneId === CHAOS_REALM_ZONE_ID ? 'current' : ''}" ${entryReady ? 'onclick="enterChaosRealmPrompt()"' : ''}><div class="map-item-main"><span>🌌</span><span>혼돈계 ${floor}층<br><span class="map-zone-status">난이도 기준: 혼돈 심화 ${zone ? zone.tier : getChaosRealmTier(floor)}급 · 특징 ${affixes.length}개</span></span></div><div class="map-item-actions"><span class="map-zone-status">${entryReady ? `입장 가능: 1 ~ ${highest}` : '혼돈 20 필요'}</span></div></div>`;
}
function renderUnderworldMapPanel() {
    let panel = document.getElementById('ui-underworld-panel');
    let list = document.getElementById('ui-underworld-list');
    if (!panel || !list) return;
    let st = ensureChaosRealmState();
    let floor = Math.max(1, Math.floor(st.currentFloor || 1));
    let highest = Math.max(1, Math.floor(st.highestFloor || 1));
    let canEnter = typeof canEnterUnderworld === 'function' && canEnterUnderworld();
    let runeState = game.underworldRunes || { unlockedSlots: 0, unlockedRunesMaxNumber: 0 };
    let runeList = Array.isArray(runeState.obtainedRunes) ? runeState.obtainedRunes : [];
    let runeCountMap = runeList.reduce((acc, n) => { let k = Math.max(1, Math.floor(n || 1)); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    let runeLine = Object.keys(runeCountMap).sort((a,b)=>Number(a)-Number(b)).slice(0, 10).map(k => {
        let def = getUnderworldRuneDef(Number(k));
        return `${def ? def.name : ('룬'+k)}×${runeCountMap[k]}`;
    }).join(', ');
    let equippedLine = (Array.isArray(runeState.equippedRunes) ? runeState.equippedRunes : []).slice(0, 6).map((no, idx) => {
        if (!no || idx >= Math.max(0, Math.floor(runeState.unlockedSlots || 0))) return `[${idx + 1}] 비어있음`;
        let def = getUnderworldRuneDef(no);
        return `[${idx + 1}] ${def ? `${def.name} (${getStatName(def.stat)} +${formatValue(def.stat, def.val)})` : `룬${no}`}`;
    }).join('<br>');
    let runeShardCount = Math.max(0, Math.floor((game.currencies || {}).runeShard || 0));
    let ticketLine = [
        `화염 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketFlame || 0))}`,
        `냉기 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketFrost || 0))}`,
        `번개 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketStorm || 0))}`,
        `카오스 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketChaos || 0))}`
    ].join(' · ');
    panel.innerHTML = `<div style="font-weight:800; color:#e4d8ff;">지하계: 핵으로 하강</div><div style="margin-top:6px; color:#bfc8ea;">해금 조건: <strong>야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층</strong> (영구 해금)</div><div style="margin-top:4px; color:${canEnter ? '#d6e4ff' : '#ffcf8a'};">입장 조건: 이번 루프 혼돈 20 클리어 필요 · 고중력으로 층이 깊어질수록 이속/공속 감소 · 15층부터 지속 피해</div><div style="margin-top:6px; color:#c9b8ff;">룬 슬롯 ${Math.max(0, Math.floor(runeState.unlockedSlots || 0))}/6 · 해금된 룬 번호 1~${Math.max(0, Math.floor(runeState.unlockedRunesMaxNumber || 0))}</div><div style="margin-top:4px; color:#9fe3d6;">룬 조각: <strong>${runeShardCount}</strong></div><div style="margin-top:4px; color:#ffd8a8;">우버 뿌리 입장권: ${ticketLine}</div><div style="margin-top:6px;"><button onclick="craftUnderworldRune()">룬 가공 (룬조각 10)</button><button onclick="upgradeUnderworldRune()" style="margin-left:6px;">룬 승급 (동일 룬 3개 + 룬조각)</button></div><div style="margin-top:6px; color:#aebde0;">보유 룬: ${runeLine || '없음'}${Object.keys(runeCountMap).length > 10 ? ' ...' : ''}</div><div style="margin-top:6px; color:#d6e4ff;">장착 룬(영구 적용):<br>${equippedLine || '없음'}</div>`;
    list.innerHTML = `<div class="map-item ${game.currentZoneId === UNDERWORLD_ZONE_ID ? 'current' : ''}" ${canEnter ? 'onclick="enterUnderworldPrompt()"' : ''}><div class="map-item-main"><span>🕳️</span><span>지하계 ${floor}층<br><span class="map-zone-status">난이도 기준: 혼돈 심화 30급 · 전용 드랍/룬 해금</span></span></div><div class="map-item-actions"><span class="map-zone-status">${canEnter ? `입장 가능: 1 ~ ${highest}` : '케르베로스 + 심화30 + 미궁100 + 혼돈20 필요'}</span></div></div>`;
}
function ensureUnderworldRuneState() {
    if (!game.underworldRunes || typeof game.underworldRunes !== 'object') game.underworldRunes = { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [], equippedRunes: [null, null, null, null, null, null] };
    game.underworldRunes.obtainedRunes = Array.isArray(game.underworldRunes.obtainedRunes) ? game.underworldRunes.obtainedRunes : [];
    game.underworldRunes.equippedRunes = Array.isArray(game.underworldRunes.equippedRunes) ? game.underworldRunes.equippedRunes.slice(0, 6) : [null, null, null, null, null, null];
    while (game.underworldRunes.equippedRunes.length < 6) game.underworldRunes.equippedRunes.push(null);
    return game.underworldRunes;
}
function getUnderworldRuneDef(no) {
    return (Array.isArray(UNDERWORLD_RUNE_DB) ? UNDERWORLD_RUNE_DB : []).find(row => row.no === Math.max(1, Math.floor(no || 0))) || null;
}
function autoEquipUnderworldRune(no) {
    let st = ensureUnderworldRuneState();
    let cap = Math.max(0, Math.min(6, Math.floor(st.unlockedSlots || 0)));
    if (cap <= 0) return;
    for (let i = 0; i < cap; i++) {
        if (!st.equippedRunes[i]) { st.equippedRunes[i] = no; return; }
    }
}
function craftUnderworldRune() {
    let st = ensureUnderworldRuneState();
    let maxNo = Math.max(0, Math.floor(st.unlockedRunesMaxNumber || 0));
    if (maxNo <= 0) return addLog('먼저 지하계 10층 단위 보상으로 룬 번호를 해금하세요.', 'attack-monster');
    let need = 10;
    if ((game.currencies.runeShard || 0) < need) return addLog(`룬 조각이 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.runeShard -= need;
    let roll = 1 + Math.floor(Math.random() * maxNo);
    st.obtainedRunes.push(roll);
    autoEquipUnderworldRune(roll);
    let def = getUnderworldRuneDef(roll);
    addLog(`🧿 룬 가공 성공: ${def ? def.name : ('룬'+roll)} 획득 (${def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : ''})`, 'loot-unique');
    updateStaticUI();
}
function upgradeUnderworldRune() {
    let st = ensureUnderworldRuneState();
    let pool = Array.isArray(st.obtainedRunes) ? st.obtainedRunes : [];
    if (pool.length < 3) return addLog('승급할 룬이 부족합니다.', 'attack-monster');
    let count = {};
    pool.forEach(n => { let k = Math.max(1, Math.floor(n || 1)); count[k] = (count[k] || 0) + 1; });
    let from = Object.keys(count).map(Number).sort((a,b)=>a-b).find(n => count[n] >= 3 && n < 30);
    if (!from) return addLog('동일 번호 룬 3개가 필요합니다. (룬30은 승급 불가)', 'attack-monster');
    let shardNeed = Math.max(5, from);
    if ((game.currencies.runeShard || 0) < shardNeed) return addLog(`룬 조각이 부족합니다. (필요: ${shardNeed})`, 'attack-monster');
    let unlockedMax = Math.max(1, Math.min(30, Math.floor(st.unlockedRunesMaxNumber || 1)));
    if (from >= unlockedMax) return addLog(`현재는 룬${from}을 승급할 수 없습니다. (해금된 최대 번호: ${unlockedMax})`, 'attack-monster');
    game.currencies.runeShard -= shardNeed;
    let removed = 0;
    st.obtainedRunes = st.obtainedRunes.filter(n => {
        if (Math.floor(n || 0) === from && removed < 3) { removed++; return false; }
        return true;
    });
    let equipRemoved = 0;
    st.equippedRunes = Array.isArray(st.equippedRunes)
        ? st.equippedRunes.map(n => {
            if (Math.floor(n || 0) === from && equipRemoved < 3) { equipRemoved++; return null; }
            return n;
        })
        : [null, null, null, null, null, null];
    let to = Math.min(unlockedMax, from + 1);
    st.obtainedRunes.push(to);
    autoEquipUnderworldRune(to);
    let def = getUnderworldRuneDef(to);
    addLog(`🧿 룬 승급 성공: 룬${from}×3 + 룬조각 ${shardNeed} → ${def ? def.name : ('룬'+to)} (${def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : ''})`, 'loot-unique');
    updateStaticUI();
}

function switchMapSubtab(subtabId) {
    game.mapSubtab = subtabId;
    document.querySelectorAll('#tab-map .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-map .subtab-btn').forEach(el => el.classList.remove('active'));
    let panel = document.getElementById(subtabId);
    let btn = document.getElementById('btn-' + subtabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}
function enterLabyrinthFloor(floor){ if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked(); game.labyrinthFloor=Math.max(1,Math.floor(floor||1)); changeZone(LABYRINTH_ZONE_ID); updateStaticUI(); }
function enterChaosRealmPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    let st = ensureChaosRealmState();
    if (!st.unlocked) return addLog('혼돈계는 혼돈 밖 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투 종료 시 해금됩니다.', 'attack-monster');
    if (!canEnterChaosRealm()) return addLog('혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.', 'attack-monster');
    let max = Math.max(1, Math.floor(st.highestFloor || 1));
    let v = prompt(`진입할 혼돈계 층수를 입력하세요. (1 ~ ${max})`, String(max));
    if (v === null) return;
    let floor = Math.floor(Number(v) || 0);
    if (floor < 1 || floor > max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    st.currentFloor = floor;
    changeZone(CHAOS_REALM_ZONE_ID);
    updateStaticUI();
}
function enterUnderworldPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!(typeof canEnterUnderworld === 'function' && canEnterUnderworld())) return addLog('지하계 입장 조건: 야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층 + 이번 루프 혼돈20 클리어', 'attack-monster');
    let st = ensureChaosRealmState();
    let max = Math.max(1, Math.floor(st.highestFloor || 1));
    let v = prompt(`진입할 지하계 층수를 입력하세요. (1 ~ ${max})`, String(max));
    if (v === null) return;
    let floor = Math.floor(Number(v) || 0);
    if (floor < 1 || floor > max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    st.currentFloor = floor;
    changeZone(UNDERWORLD_ZONE_ID);
    updateStaticUI();
}

function enterTrialWithTicket(trialId) {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!['trial_3','trial_4'].includes(trialId)) return changeZone(trialId);
    if ((game.currencies.trialKey3 || 0) <= 0) return addLog('시련의 증표가 부족합니다.', 'attack-monster');
    game.currencies.trialKey3 -= 1;
    addLog(`🗝️ 시련의 증표 1개 소모 (남은 ${game.currencies.trialKey3 || 0})`, 'season-up');
    changeZone(trialId);
}

function enterDeepChaosPrompt(){ if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked(); let unlocked = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : []; let max=Math.max(20, unlocked.length ? Math.max(...unlocked) : Math.floor(game.abyssEndlessDepth||20)); let v=prompt(`진입할 심화 혼돈 층수를 입력하세요. (21 ~ ${max})`, String(max)); if(v===null)return; let depth=Math.floor(Number(v)||0); if(depth<21||depth>max) return addLog(`21~${max} 범위의 층수를 입력하세요.`, 'attack-monster'); if (unlocked.length > 0 && !unlocked.includes(depth)) return addLog(`해금된 심화 혼돈 층수만 입장 가능합니다.`, 'attack-monster'); enterUnlockedEndlessDepth(depth); }
function enterLabyrinthPrompt(){ if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked(); let max=Math.max(1,Math.floor(game.labyrinthUnlockedMaxFloor||game.labyrinthFloor||1)); let v=prompt(`진입할 고대 미궁 층수를 입력하세요. (1 ~ ${max})`, String(max)); if(v===null)return; let floor=Math.floor(Number(v)||0); if(floor<1||floor>max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster'); enterLabyrinthFloor(floor); }


function getChallengeContractState() {
    game.challengeContract = game.challengeContract || { enemyPower: false, fragileArmor: false, shortHunt: false, greedPact: false, enabled: false };
    return game.challengeContract;
}

function getChallengeContractScore() {
    let c = getChallengeContractState();
    return (c.enemyPower ? 1 : 0) + (c.fragileArmor ? 1 : 0) + (c.shortHunt ? 1 : 0) + (c.greedPact ? 1 : 0);
}

function isChallengeContractOverlappedWithAbyss() {
    let zone = getZone(game.currentZoneId);
    return !!(zone && zone.type === 'abyss');
}

function toggleChallengeContract(key) {
    let c = getChallengeContractState();
    if (!(key in c)) return;
    if (isChallengeContractOverlappedWithAbyss()) {
        addLog('📜 도전 계약은 혼돈 패시브 구간(혼돈 층)에서는 비활성화됩니다.', 'attack-monster');
        return;
    }
    c[key] = !c[key];
    c.enabled = getChallengeContractScore() > 0;
    addLog(`📜 도전 계약 변경: 활성 계약 ${getChallengeContractScore()}개`, 'season-up', { noToast: true });
    updateStaticUI();
}

function renderChallengeContractPanel() {
    let panel = document.getElementById('ui-challenge-contract-panel');
    if (!panel) return;
    let c = getChallengeContractState();
    let score = getChallengeContractScore();
    let bonus = score * 8;
    let lockedByAbyss = isChallengeContractOverlappedWithAbyss();
    panel.innerHTML = `
        <div style="color:#c9d6ea; font-size:0.85em; margin-bottom:8px;">[제안 미리보기] 기존 사냥터에 디버프를 걸어 보상을 높이는 설계입니다. 현재 보상 배율 <strong style="color:#ffd88a;">+${bonus}%</strong> (활성 계약 ${score}개)</div>
        ${lockedByAbyss ? '<div style="color:#ffb4b4; font-size:0.8em; margin-bottom:8px;">혼돈 패시브(혼돈 층)와 중첩 밸런스 충돌을 막기 위해 이 구간에서는 계약 토글이 잠깁니다.</div>' : ''}
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="toggleChallengeContract('enemyPower')" ${lockedByAbyss ? 'disabled' : ''} style="min-height:30px; ${c.enemyPower ? 'background:#6a3f35; border-color:#9d6354;' : ''}">적 공격력 +25%</button>
            <button onclick="toggleChallengeContract('fragileArmor')" ${lockedByAbyss ? 'disabled' : ''} style="min-height:30px; ${c.fragileArmor ? 'background:#6a3f35; border-color:#9d6354;' : ''}">내 물피감 -12%</button>
            <button onclick="toggleChallengeContract('shortHunt')" ${lockedByAbyss ? 'disabled' : ''} style="min-height:30px; ${c.shortHunt ? 'background:#6a3f35; border-color:#9d6354;' : ''}">맵 길이 -30%</button>
            <button onclick="toggleChallengeContract('greedPact')" ${lockedByAbyss ? 'disabled' : ''} style="min-height:30px; ${c.greedPact ? 'background:#6a3f35; border-color:#9d6354;' : ''}">회복량 -35%</button>
        </div>
    `;
}
function toggleSeasonBossRepeat() {
    game.autoRepeatSeasonBoss = !game.autoRepeatSeasonBoss;
    addLog(`🗝️ 뿌리 보스 반복 도전: ${game.autoRepeatSeasonBoss ? 'ON' : 'OFF'}`, 'season-up');
    updateStaticUI();
}

function renderStarWedgePanel() {
    let panel = document.getElementById('ui-star-wedge-panel');
    if (!panel) return;
    let st = ensureStarWedgeState();
    tryUnlockMeteorContentByProgress();
    st = ensureStarWedgeState();
    if (!st.unlocked) {
        panel.innerHTML = `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">잠금 상태: 루프 ${STAR_WEDGE_UNLOCK_LOOP}에서 액트 ${STAR_WEDGE_UNLOCK_ACT} 이후에 도달하면 별쐐기와 운석 낙하 지점이 해금됩니다.</div>`;
        return;
    }
    let astronomerLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
    let rerollLockedAttr = astronomerLv >= 5 ? '' : 'disabled';
    let rerollTitle = astronomerLv >= 5 ? '' : ' (천문학자 Lv.5 필요)';
    let maxEquippedStarWedges = typeof getMaxEquippedStarWedges === 'function' ? getMaxEquippedStarWedges() : MAX_STAR_WEDGES;
    let constellationText = st.constellationBuff ? `${st.constellationBuff.label || getStatName(st.constellationBuff.stat)} +${st.constellationBuff.val}${st.constellationBuff.stat === 'flatHp' ? '' : '%'}${st.constellationBuff.permanent ? ' · 영원' : ''}` : '미관측';
    let socketNodeText = (st.sockets || []).map(entry => {
        let node = PASSIVE_TREE.nodes[entry.nodeId];
        return node ? getPassiveNodeDisplayName(node) : entry.nodeId;
    }).join(', ') || '미장착';
    let wedgeCards = (st.wedges || []).slice(0, 12).map(wedge => {
        let lines = wedge.lines.map((line, idx) => {
            let lineTitle = idx === 3 ? '핵심노드' : `${idx + 1}경로`;
            return `<div style="color:${line.boosted ? '#ffd36f' : '#d4deea'};">${lineTitle}. ${getStatName(line.stat)} +${formatValue(line.stat, line.val)}${P_STATS[line.stat] && P_STATS[line.stat].isPct ? '%' : ''}${line.boosted ? ' <strong>★</strong>' : ''}</div>`;
        }).join('');
        let socketedEntry = (st.sockets || []).find(v => v.wedgeId === wedge.id) || null;
        let selecting = st.selectedWedgeId === wedge.id;
        let eternalBadge = wedge.eternal ? '<span style="color:#b7f6ff; font-size:0.8em;">영원</span>' : '';
        let eternalLockedAttr = astronomerLv >= 12 && !wedge.eternal ? '' : 'disabled';
        let eternalTitle = wedge.eternal ? '고정됨' : (astronomerLv >= 12 ? '별가루 25' : '천문학자 Lv.12 필요');
        return `<div style="border:1px solid #3e3352; border-radius:8px; padding:8px; background:#121224;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;"><strong style="color:#efd8ff;">별쐐기 #${wedge.id % 10000} ${eternalBadge}</strong>${socketedEntry ? `<button style="min-height:24px; padding:3px 8px; font-size:0.72em; background:#5c3448; border-color:#81506b;" onclick="unsocketStarWedge('${socketedEntry.nodeId}')">장착 해제</button>` : ''}</div>
            ${lines}
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em; ${selecting ? 'background:#2f6a42; border-color:#3f9b5c;' : ''}" onclick="beginStarWedgeSocketSelection(${wedge.id})">${selecting ? '슬롯 선택 취소' : '장착할 슬롯 선택'}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id})" ${rerollLockedAttr}>리롤${rerollTitle}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id}, 'single')" ${rerollLockedAttr}>1줄 고정${rerollTitle}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id}, 'double')" ${rerollLockedAttr}>2줄 고정 (파편x10)${rerollTitle}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="stabilizeStarWedge(${wedge.id})" ${eternalLockedAttr}>영원 고정 (${eternalTitle})</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em; background:#63383f; border-color:#8f5963;" onclick="destroyStarWedge(${wedge.id})" ${wedge.eternal ? 'disabled' : ''}>파괴하기</button>
            </div>
        </div>`;
    }).join('');
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
            <div style="color:#d6e0ec;">운석 파편: <strong style="color:#ffd36f;">${game.currencies.meteorShard || 0}</strong> · 별가루: <strong style="color:#b7f6ff;">${game.currencies.starDust || 0}</strong> · 불완전한 별쐐기: <strong style="color:#b9d3ff;">${game.currencies.incompleteStarWedge || 0}</strong> · 별쐐기: <strong style="color:#f0ccff;">${game.currencies.starWedge || 0}</strong></div>
            <div style="color:#8ea5c1;">장착 슬롯: ${(st.sockets || []).length}/${maxEquippedStarWedges} · ${socketNodeText} · 별자리: ${constellationText}</div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;"><button onclick="craftIncompleteStarWedge()">파편 49 → 불완전한 별쐐기</button><button onclick="craftCompleteStarWedge()">불완전 1 + 파편 77 → 별쐐기</button></div>
        <div style="color:#93a4bb; font-size:0.8em; margin-bottom:8px;">1/2/3경로 노드를 1~3번째 줄로 변성하고, 4번째 [핵심노드] 줄은 슬롯 자신(허브 노드)에 적용됩니다. 장착은 [장착할 슬롯 선택] 후 패시브 트리에서 슬롯을 클릭하세요.</div>
        <div style="display:grid; gap:8px;">${wedgeCards || '<div style="color:#7f89a0;">별쐐기가 없습니다. 운석 낙하 지점을 공략하거나 제작하세요.</div>'}</div>
    `;
}

function getTalismanShapeStyle(shape) {
    return TALISMAN_SHAPE_STYLE[shape] || { color: '#9fb3c7', glow: 'rgba(159,179,199,0.22)', symbol: '◆' };
}

function renderTalismanMiniShape(shape, options = {}) {
    return renderTalismanMiniShapeFromCells((TALISMAN_SHAPES[shape] || []).map(cell => ({ x: cell[0], y: cell[1] })), shape, options);
}

function renderTalismanMiniShapeFromCells(cellsInput, shape, options = {}) {
    let cells = Array.isArray(cellsInput) ? cellsInput.map(cell => ({ x: cell.x || 0, y: cell.y || 0 })) : [];
    let style = getTalismanShapeStyle(shape);
    let cellSize = Math.max(4, Math.floor(options.cellSize || 6));
    let gap = Math.max(1, Math.floor(options.gap || 1));
    let minX = cells.length > 0 ? Math.min(...cells.map(cell => cell.x)) : 0;
    let minY = cells.length > 0 ? Math.min(...cells.map(cell => cell.y)) : 0;
    let maxX = cells.length > 0 ? Math.max(...cells.map(cell => cell.x)) : 2;
    let maxY = cells.length > 0 ? Math.max(...cells.map(cell => cell.y)) : 1;
    let cols = Math.max(1, (maxX - minX + 1));
    let rows = Math.max(1, (maxY - minY + 1));
    let width = (cols * cellSize) + ((cols - 1) * gap);
    let height = (rows * cellSize) + ((rows - 1) * gap);
    let filled = new Set(cells.map(cell => `${cell.x - minX},${cell.y - minY}`));
    let html = '';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let isFilled = filled.has(`${x},${y}`);
            let fillStyle = isFilled
                ? `background:linear-gradient(145deg, rgba(255,255,255,0.28) 0%, ${style.color} 42%, rgba(8,12,18,0.2) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 2px rgba(0,0,0,0.45), 0 0 4px ${style.glow};`
                : 'background:transparent; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);';
            html += `<span style="width:${cellSize}px; height:${cellSize}px; border-radius:2px; border:1px solid ${isFilled ? style.color : 'rgba(120,140,160,0.35)'}; ${fillStyle} display:block;"></span>`;
        }
    }
    let dir = options.markDir;
    let arrow = '';
    if (dir === 'up' || dir === 'right' || dir === 'down' || dir === 'left') {
        let ch = dir === 'up' ? '↑' : (dir === 'right' ? '→' : (dir === 'down' ? '↓' : '←'));
        arrow = `<span style="position:absolute; right:-4px; bottom:-5px; font-size:${Math.max(10, cellSize + 2)}px; color:#ffd27a; text-shadow:0 0 4px rgba(255,200,110,0.9), 0 0 8px rgba(255,130,60,0.5); line-height:1;">${ch}</span>`;
    }
    return `<span style="position:relative; display:grid; grid-template-columns:repeat(${cols}, ${cellSize}px); grid-auto-rows:${cellSize}px; gap:${gap}px; width:${width}px; height:${height}px; padding:2px; border:1px solid rgba(120,145,175,0.4); border-radius:4px; background:rgba(8,14,22,0.45); box-shadow:0 0 0 1px ${style.glow};">${html}${arrow}</span>`;
}

function getTalismanAnchorCell(talisman) {
    if (!talisman || !Array.isArray(talisman.cells) || talisman.cells.length <= 0) return { x: 0, y: 0 };
    let cells = talisman.cells.map(cell => ({ x: cell.x || 0, y: cell.y || 0 }));
    let filled = new Set(cells.map(cell => `${cell.x},${cell.y}`));
    let centerX = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
    let centerY = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
    let ranked = cells.map(cell => {
        let neighbors = 0;
        if (filled.has(`${cell.x - 1},${cell.y}`)) neighbors++;
        if (filled.has(`${cell.x + 1},${cell.y}`)) neighbors++;
        if (filled.has(`${cell.x},${cell.y - 1}`)) neighbors++;
        if (filled.has(`${cell.x},${cell.y + 1}`)) neighbors++;
        let dist = Math.hypot(cell.x - centerX, cell.y - centerY);
        return { cell, neighbors, dist };
    });
    ranked.sort((a, b) => {
        if (b.neighbors !== a.neighbors) return b.neighbors - a.neighbors;
        if (a.dist !== b.dist) return a.dist - b.dist;
        if (a.cell.y !== b.cell.y) return a.cell.y - b.cell.y;
        return a.cell.x - b.cell.x;
    });
    return ranked[0].cell;
}


const TALISMAN_BOARD_W = 8;
const TALISMAN_BOARD_H = 8;
const TALISMAN_BOARD_MASK = new Set([
'2,0','3,0','4,0','5,0',
'1,1','2,1','5,1','6,1',
'0,2','1,2','2,2','3,2','4,2','5,2','6,2','7,2',
'0,3','2,3','3,3','4,3','5,3','7,3',
'0,4','2,4','3,4','4,4','5,4','7,4',
'0,5','1,5','2,5','3,5','4,5','5,5','6,5','7,5',
'1,6','2,6','5,6','6,6',
'2,7','3,7','4,7','5,7'
]);
function talismanCellKey(x,y){ return `${x},${y}`; }
function talismanCellIndex(x,y){ return y * TALISMAN_BOARD_W + x; }
function isTalismanBoardCellValid(x,y){ return TALISMAN_BOARD_MASK.has(talismanCellKey(x,y)); }
function isTalismanCellInitiallyUnlocked(x, y){ return x >= 2 && x <= 5 && y >= 2 && y <= 5; }

function renderSealShardBadge(source) {
    let isRadiant = source === 'radiantSealShard';
    let isStrong = source === 'strongSealShard';
    let color = isRadiant ? '#ffe38a' : (isStrong ? '#f3c266' : '#9ed2ff');
    let label = isRadiant ? '찬란 편린' : (isStrong ? '강력 편린' : '편린');
    let icon = isRadiant ? '✹' : (isStrong ? '✦' : '◆');
    let bg = isRadiant ? 'rgba(120,95,18,0.5)' : (isStrong ? 'rgba(94,64,17,0.45)' : 'rgba(21,54,83,0.38)');
    return `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.72em; color:${color}; border:1px solid ${color}66; border-radius:999px; padding:2px 7px; background:${bg};">${icon} ${label}</span>`;
}

function rollTalismanRevealCount() {
    let r = Math.random();
    if (r < 0.002) return 6;
    if (r < 0.01) return 5;
    if (r < 0.06) return 4;
    if (r < 0.28) return 3;
    return 2;
}


const TALISMAN_UNIQUE_POOL = [
    { id:'ut_z_1', name:'굽이치는 전류', shape:'Z', stats:[{stat:'aspd',value:9,label:'공격 속도(%)'},{stat:'lightPctDmg',value:16,label:'번개 피해(%)'}] },
    { id:'ut_z_2', name:'균열의 발걸음', shape:'Z', stats:[{stat:'move',value:11,label:'이동 속도(%)'},{stat:'resPen',value:8,label:'저항 관통(%)'}] },
    { id:'ut_s_1', name:'감긴 덩굴', shape:'S', stats:[{stat:'flatHp',value:90,label:'최대 생명력'},{stat:'regen',value:1.4,label:'생명력 재생(%)'}] },
    { id:'ut_s_2', name:'쐐기 관통', shape:'S', stats:[{stat:'physPctDmg',value:16,label:'물리 피해(%)'},{stat:'crit',value:3,label:'치명타 확률(%)'}] },
    { id:'ut_l_1', name:'황혼의 궤적', shape:'L', stats:[{stat:'dotPctDmg',value:18,label:'지속 피해 배율(%)'},{stat:'chaosPctDmg',value:14,label:'카오스 피해(%)'}] },
    { id:'ut_l_2', name:'강철 결의', shape:'L', stats:[{stat:'armorPct',value:18,label:'방어도 증가(%)'},{stat:'dr',value:7,label:'물리 피해 감소(%)'}] },
    { id:'ut_j_1', name:'냉광의 비늘', shape:'J', stats:[{stat:'coldPctDmg',value:16,label:'냉기 피해(%)'},{stat:'freezeChance',value:10,label:'동결 확률(%)'}] },
    { id:'ut_j_2', name:'파열의 첨탑', shape:'J', stats:[{stat:'critDmg',value:30,label:'치명타 피해 배율(%)'},{stat:'maxDmgRoll',value:6,label:'최대 피해 보정(%)'}] },
    { id:'ut_i_1', name:'장궁의 선', shape:'I', stats:[{stat:'projectilePctDmg',value:18,label:'투사체 피해(%)'},{stat:'targetProjectile',value:1,label:'투사체 타겟 +'}] },
    { id:'ut_i_2', name:'붉은 맥동', shape:'I', stats:[{stat:'firePctDmg',value:17,label:'화염 피해(%)'},{stat:'igniteChance',value:12,label:'점화 확률(%)'}] },
    { id:'ut_o_1', name:'쌍환의 방패', shape:'O', stats:[{stat:'resAll',value:12,label:'모든 저항(%)'},{stat:'energyShieldPct',value:16,label:'에너지 보호막 증가(%)'}] },
    { id:'ut_o_2', name:'이중 심장', shape:'O', stats:[{stat:'pctHp',value:12,label:'생명력 증가(%)'},{stat:'regen',value:1.2,label:'생명력 재생(%)'}] },
    { id:'ut_t_1', name:'왕좌의 창끝', shape:'T', stats:[{stat:'pctDmg',value:18,label:'피해 증가(%)'},{stat:'aspd',value:10,label:'공격 속도(%)'}] },
    { id:'ut_t_2', name:'교차 절개', shape:'T', stats:[{stat:'meleePctDmg',value:18,label:'근접 피해(%)'},{stat:'crit',value:3.5,label:'치명타 확률(%)'}] },
    { id:'ut_gravity', name:'중력', shape:'DOT', rarity:'매우 희귀', special:'gravity' },
    { id:'ut_simple', name:'단순한 부적', shape:'MARK_DOT', rarity:'매우 희귀', special:'simpleCopy' },
    { id:'ut_temperance', name:'절제의 미덕', shape:'G', rarity:'희귀', special:'temperance' },
    { id:'ut_pride', name:'오만', shape:'PLUS', rarity:'희귀', special:'pride' },
    { id:'ut_moment', name:'찰나', shape:'DASH2', rarity:'희귀', special:'moment', bossFinalDmgMin:5, bossFinalDmgMax:15 },
    { id:'ut_fire_focus', name:'불타는 부적', rarity:'희귀', special:'elementFocus', elem:'fire' },
    { id:'ut_cold_focus', name:'서릿빛 부적', rarity:'희귀', special:'elementFocus', elem:'cold' },
    { id:'ut_light_focus', name:'뇌전의 부적', rarity:'희귀', special:'elementFocus', elem:'light' },
    { id:'ut_phys_focus', name:'쇄격의 부적', rarity:'희귀', special:'elementFocus', elem:'phys' },
    { id:'ut_chaos_focus', name:'심연의 부적', rarity:'희귀', special:'elementFocus', elem:'chaos' }
];

function rollTalismanCandidate(currencyKey) {
    let isStrong = currencyKey === 'strongSealShard';
    let isRadiant = currencyKey === 'radiantSealShard';
    let forceUnique = Math.random() < (isRadiant ? 0.24 : (isStrong ? 0.03 : 0.005));
    if (forceUnique) {
        let row = rndChoice(TALISMAN_UNIQUE_POOL);
        let shapeKey = row.shape || rndChoice(['Z','S','L','J','I','O','T']);
        let tal = { id: Date.now() + Math.floor(Math.random() * 100000), shape: shapeKey, cells: TALISMAN_SHAPES[shapeKey].map(([x,y]) => ({x,y})), rarity: row.rarity || '고유', source: isRadiant ? 'radiantSealShard' : (isStrong ? 'strongSealShard' : 'sealShard'), isUnique: true, uniqueId: row.id, name: row.name, special: row.special || null, markDir: rndChoice(['up','right','down','left']) };
        if (row.special === 'temperance') {
            tal.stats = Array.from({length:3}, ()=>{ let o=rndChoice(TALISMAN_OPTION_POOL); let v=o.min + Math.random()*(o.max-o.min); return { stat:o.stat, label:o.label, value:Number(v.toFixed((o.step||1)<1?1:0))};});
        } else if (row.special === 'elementFocus') {
            let gemLv = 1 + Math.floor(Math.random()*3);
            let inc = 5 + Math.floor(Math.random()*11);
            let res = 5 + Math.floor(Math.random()*11);
            let map = { fire:['fireGemLevel','firePctDmg','resF','화염'], cold:['coldGemLevel','coldPctDmg','resC','냉기'], light:['lightGemLevel','lightPctDmg','resL','번개'], phys:['physGemLevel','physPctDmg','dr','물리'], chaos:['chaosGemLevel','chaosPctDmg','resChaos','카오스'] }[row.elem];
            tal.shape = rndChoice(['Z','S','L','J','I','O','T']); tal.cells = TALISMAN_SHAPES[tal.shape].map(([x,y])=>({x,y}));
            tal.stats=[{stat:map[0],label:`${map[3]} 스킬 젬 레벨`,value:gemLv},{stat:map[1],label:`${map[3]} 스킬 피해(%)`,value:inc},{stat:map[2],label:`${map[3]} 저항(%)`,value:res}];
        } else if (row.stats) tal.stats=row.stats.map(v=>({...v}));
        tal.stat = tal.stats && tal.stats[0] ? tal.stats[0].stat : null;
        tal.statName = row.name;
        tal.value = tal.stats && tal.stats[0] ? tal.stats[0].value : 0;
        return tal;
    }
    let shapeKey = rndChoice(Object.keys(TALISMAN_SHAPES).filter(k => ['I','O','T','S','Z','J','L'].includes(k)));
    let option = rndChoice(TALISMAN_OPTION_POOL);
    let multiplier = isRadiant ? 1.6 : (isStrong ? 1.35 : 1.0);
    let rolled = option.min + Math.random() * (option.max - option.min);
    let step = option.step || 1;
    let value = Math.round((rolled * multiplier) / step) * step;
    return { id: Date.now() + Math.floor(Math.random() * 100000), shape: shapeKey, cells: TALISMAN_SHAPES[shapeKey].map(([x, y]) => ({ x: x, y: y })), stat: option.stat, statName: option.label, value: Number(value.toFixed(step < 1 ? 1 : 0)), valueMin: Number(((option.min * multiplier)).toFixed(step < 1 ? 1 : 0)), valueMax: Number(((option.max * multiplier)).toFixed(step < 1 ? 1 : 0)), rarity: isRadiant ? '찬란한 기운' : (isStrong ? '강력한 기운' : '일반'), source: isRadiant ? 'radiantSealShard' : (isStrong ? 'strongSealShard' : 'sealShard') };
}

function startTalismanUnseal(currencyKey) {
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog('봉인편린이 부족합니다.', 'attack-monster');
    if (game.talismanUnseal) return addLog('이미 봉인 해제 중입니다. 먼저 선택/파괴를 완료하세요.', 'attack-monster');
    game.currencies[currencyKey]--;
    let total = rollTalismanRevealCount();
    game.talismanUnseal = {
        rollsLeft: total,
        totalRolls: total,
        current: rollTalismanCandidate(currencyKey),
        source: currencyKey
    };
    addLog(`🧿 봉인 해제 시작! 총 확인 기회 ${total}회`, 'season-up');
    updateStaticUI();
}

function previewNextTalismanShape() {
    let state = game.talismanUnseal;
    if (!state || state.rollsLeft <= 1) return;
    state.rollsLeft--;
    state.current = rollTalismanCandidate(state.source);
    updateStaticUI();
}

function acceptCurrentTalisman() {
    let state = game.talismanUnseal;
    if (!state || !state.current) return;
    game.talismanInventory = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    game.talismanInventory.push(state.current);
    addLog(`✅ 부적 획득: [${state.current.shape}] ${state.current.statName} +${state.current.value}`, 'loot-rare');
    game.talismanUnseal = null;
    updateStaticUI();
}

function discardCurrentTalisman() {
    if (!game.talismanUnseal) return;
    addLog('🗑️ 봉인 후보를 파괴했습니다.', 'attack-monster');
    game.talismanUnseal = null;
    updateStaticUI();
}

function rotateTalismanCells90(cells){
    if (!Array.isArray(cells)) return [];
    let rotated = cells.map(cell => ({ x: -(cell.y || 0), y: (cell.x || 0) }));
    let minX = Math.min(...rotated.map(c => c.x));
    let minY = Math.min(...rotated.map(c => c.y));
    return rotated.map(c => ({ x: c.x - minX, y: c.y - minY }));
}
function rotateTalismanInInventory(talismanId){
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let target = inv.find(t => t && t.id === talismanId);
    if (!target || !Array.isArray(target.cells)) return;
    target.cells = rotateTalismanCells90(target.cells);
    if (target.markDir) { let rot={up:'right',right:'down',down:'left',left:'up'}; target.markDir=rot[target.markDir]||target.markDir; }
    addLog(`🔄 부적 회전: [${target.shape}]`, 'loot-normal');
    updateStaticUI();
}

function destroyTalismanFromInventory(talismanId) {
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let target = inv.find(t => t && t.id === talismanId);
    if (!target) return;
    game.talismanInventory = inv.filter(t => t.id !== talismanId);
    if (game.talismanSelectedId === talismanId) game.talismanSelectedId = null;
    addLog(`🗑️ 부적 파괴: [${target.shape}] ${target.statName} +${target.value}`, 'attack-monster');
    updateStaticUI();
}

function salvageAllTalismansInInventory() {
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    if (inv.length <= 0) return addLog('일괄 해체할 부적이 없습니다.', 'attack-monster');
    if (!confirm(`인벤토리 부적 ${inv.length}개를 모두 해체할까요? (보드에 배치된 부적은 유지)`)) return;
    game.talismanInventory = [];
    game.talismanSelectedId = null;
    addLog(`🗑️ 부적 일괄 해체: ${inv.length}개`, 'attack-monster');
    updateStaticUI();
}

function getTalismanUnlockedCellsSet() {
    let cells = Array.isArray(game.talismanUnlockedCells) ? game.talismanUnlockedCells : [];
    let set = new Set(cells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)));
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) if (isTalismanBoardCellValid(x,y)) set.add(talismanCellIndex(x,y));
    return set;
}

function getTalismanExpandCost(extraUnlockedCount) {
    if (extraUnlockedCount >= 28) return { sealShard: 0, strongSealShard: 0 };
    let sealCost = 1 + Math.floor(extraUnlockedCount / 3);
    let strongCost = extraUnlockedCount >= 20 ? 1 : 0; // 마지막 8칸부터 강력 봉인편린 추가 소모
    return { sealShard: sealCost, strongSealShard: strongCost };
}

function formatTalismanUnlockCostLabel(cost) {
    if (!cost || cost.sealShard <= 0) return '완료';
    let parts = [`봉인편린 ${cost.sealShard}`];
    if ((cost.strongSealShard || 0) > 0) parts.push(`강력 봉인편린 ${cost.strongSealShard}`);
    return parts.join(' + ');
}

function expandTalismanBoard() {
    addLog('🧩 잠긴 칸을 클릭하면 즉시 해금됩니다. 칸 위에 마우스를 올리면 비용을 볼 수 있습니다.', 'season-up');
    updateStaticUI();
}

function unlockTalismanCell(x, y) {
    if (x < 0 || y < 0 || x >= TALISMAN_BOARD_W || y >= TALISMAN_BOARD_H) return false;
    if (!isTalismanBoardCellValid(x, y)) return false;
    let idx = talismanCellIndex(x, y);
    let unlockedSet = getTalismanUnlockedCellsSet();
    if (unlockedSet.has(idx)) return false;
    let extraUnlocked = Math.max(0, unlockedSet.size - 16);
    let cost = getTalismanExpandCost(extraUnlocked);
    if ((game.currencies.sealShard || 0) < (cost.sealShard || 0) || (game.currencies.strongSealShard || 0) < (cost.strongSealShard || 0)) {
        addLog(`봉인편린이 부족합니다. (필요: ${formatTalismanUnlockCostLabel(cost)})`, 'attack-monster');
        return false;
    }
    game.currencies.sealShard -= (cost.sealShard || 0);
    game.currencies.strongSealShard -= (cost.strongSealShard || 0);
    game.talismanUnlockedCells = Array.isArray(game.talismanUnlockedCells) ? game.talismanUnlockedCells : [];
    game.talismanUnlockedCells.push(idx);
    game.talismanUnlockedCells = Array.from(new Set(game.talismanUnlockedCells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H))));
    game.talismanUnlockPickMode = false;
    addLog(`🧩 부적 보드 칸 해금! (${x + 1},${y + 1})`, 'season-up');
    return true;
}

function isTalismanCellUnlocked(x, y) {
    let idx = talismanCellIndex(x, y);
    return getTalismanUnlockedCellsSet().has(idx);
}

function canPlaceTalismanAt(talisman, baseX, baseY) {
    if (!talisman || !Array.isArray(talisman.cells)) return false;
    let board = game.talismanBoard || [];
    for (let cell of talisman.cells) {
        let x = baseX + cell.x;
        let y = baseY + cell.y;
        if (x < 0 || y < 0 || x >= TALISMAN_BOARD_W || y >= TALISMAN_BOARD_H || !isTalismanCellUnlocked(x, y)) return false;
        if (board[talismanCellIndex(x, y)]) return false;
    }
    return true;
}

function placeSelectedTalismanAt(x, y) {
    let selectedId = game.talismanSelectedId;
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let talisman = inv.find(t => t.id === selectedId);
    if (!talisman) return;
    let anchor = getTalismanAnchorCell(talisman);
    let baseX = x - anchor.x;
    let baseY = y - anchor.y;
    if (!canPlaceTalismanAt(talisman, baseX, baseY)) return addLog('해당 위치에는 부적을 배치할 수 없습니다.', 'attack-monster');
    game.talismanBoard = Array.isArray(game.talismanBoard) ? game.talismanBoard : Array(TALISMAN_BOARD_W * TALISMAN_BOARD_H).fill(null);
    talisman.cells.forEach(cell => {
        let idx = talismanCellIndex(baseX + cell.x, baseY + cell.y);
        game.talismanBoard[idx] = talisman.id;
    });
    game.talismanPlacements = game.talismanPlacements || {};
    game.talismanPlacements[talisman.id] = { x: baseX, y: baseY, talisman: talisman };
    game.talismanInventory = inv.filter(t => t.id !== talisman.id);
    game.talismanSelectedId = null;
    updateStaticUI();
}

function removePlacedTalisman(talismanId) {
    if (!talismanId) return;
    let board = Array.isArray(game.talismanBoard) ? game.talismanBoard : [];
    for (let i = 0; i < board.length; i++) if (board[i] === talismanId) board[i] = null;
    let placed = (game.talismanPlacements || {})[talismanId];
    if (!placed) return updateStaticUI();
    if (placed.talisman) {
        game.talismanInventory = game.talismanInventory || [];
        game.talismanInventory.push(placed.talisman);
    }
    delete game.talismanPlacements[talismanId];
    updateStaticUI();
}

function selectTalismanInventoryItem(talismanId) {
    game.talismanSelectedId = game.talismanSelectedId === talismanId ? null : talismanId;
    updateStaticUI();
}

function onTalismanBoardCellClick(x, y) {
    if (!isTalismanCellUnlocked(x, y)) {
        if (unlockTalismanCell(x, y)) updateStaticUI();
        return;
    }
    let idx = talismanCellIndex(x, y);
    let board = game.talismanBoard || [];
    let occupant = board[idx];
    if (occupant) return removePlacedTalisman(occupant);
    if (game.talismanSelectedId) return placeSelectedTalismanAt(x, y);
}

function toggleGemFoldMode(mode) {
    if (mode === 'all') {
        game.gemFoldInactiveAttack = false;
        game.gemFoldInactiveSupport = false;
    } else if (mode === 'attack') {
        game.gemFoldInactiveAttack = !game.gemFoldInactiveAttack;
    } else if (mode === 'support') {
        game.gemFoldInactiveSupport = !game.gemFoldInactiveSupport;
    }
    updateStaticUI();
}

function getUniqueCodexProgress() {
    let keys = new Set(UNIQUE_DB.map(entry => `${entry.slots[0]}|${entry.name}`));
    let codex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
    let stored = Object.keys(codex).filter(key => !!codex[key] && keys.has(key)).length;
    return { stored: stored, total: keys.size };
}

function getCodexBonusPct() {
    return getUniqueCodexProgress().stored * 0.2;
}

function tryGrantCodexCompletionReward() {
    let progress = getUniqueCodexProgress();
    if (progress.total <= 0 || progress.stored < progress.total) return;
    if (game.uniqueCodexCompletedRewardClaimed) return;
    game.uniqueCodexCompletedRewardClaimed = true;
    addLog('📚 도감 완성! 다음 루프 환생부터 부위별 최하위 고유 선택 특전이 활성화됩니다.', 'loot-unique');
}

function storeUniqueToCodexByItemId(itemId) {
    let idx = (game.inventory || []).findIndex(item => item && item.id === itemId);
    if (idx < 0) return addLog('도감에 등록할 아이템을 찾지 못했습니다.', 'attack-monster');
    let item = game.inventory[idx];
    let key = getUniqueCodexKeyByItem(item);
    if (!key) return addLog('고유 아이템만 도감에 등록할 수 있습니다.', 'attack-monster');
    game.uniqueCodex = game.uniqueCodex || {};
    let existing = game.uniqueCodex[key];
    game.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    if (existing && existing.baseName) {
        let swapped = normalizeItem(JSON.parse(JSON.stringify(existing)));
        swapped.id = ++itemIdCounter;
        game.inventory[idx] = swapped;
        addLog(`🔁 도감 교체: [${item.name}] 등록, [${swapped.name}] 인벤토리로 반환`, 'season-up');
    } else {
        game.inventory.splice(idx, 1);
        addLog(`📚 도감 등록: [${item.name}]`, 'season-up');
    }
    tryGrantCodexCompletionReward();
    updateStaticUI();
}

function withdrawUniqueFromCodex(key) {
    game.uniqueCodex = game.uniqueCodex || {};
    let stored = game.uniqueCodex[key];
    if (!stored) return addLog('해당 도감 아이템은 비어 있습니다.', 'attack-monster');
    if (stored.revealed && !stored.baseName) return addLog('이번 루프에는 도감 정보만 남아 있어 꺼낼 수 없습니다.', 'attack-monster');
    if ((game.inventory || []).length >= getInventoryLimit()) return addLog('인벤토리가 가득 차서 꺼낼 수 없습니다.', 'attack-monster');
    let clone = normalizeItem(JSON.parse(JSON.stringify(stored)));
    clone.id = ++itemIdCounter;
    game.inventory.push(clone);
    let parts = String(key).split('|');
    game.uniqueCodex[key] = { revealed: true, slot: parts[0] || clone.slot || '', name: parts[1] || clone.name || '' };
    addLog(`📦 도감에서 [${clone.name}] 꺼냈습니다.`, 'loot-rare');
    updateStaticUI();
}

function toggleCodexSlotCollapse(slot) {
    game.codexCollapsedSlots = (game.codexCollapsedSlots && typeof game.codexCollapsedSlots === 'object') ? game.codexCollapsedSlots : {};
    game.codexCollapsedSlots[slot] = !game.codexCollapsedSlots[slot];
    updateStaticUI();
}

function renderCodexStatsHtml(entry, stored, codexKey) {
    let statList = [];
    if (stored && stored.baseName) {
        if (stored.uniqueEffect) statList.push(`<span style="color:#d7b8ff;">[고유 효과] ${escapeHTML(stored.uniqueEffect)}</span>`);
        (stored.baseStats || []).forEach(stat => {
            statList.push(`<span style="color:#95a5a6">${stat.statName} +${formatValue(stat.id, stat.val)}</span>`);
        });
        (stored.stats || []).forEach(stat => {
            let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatValue(stat.id, stat.valMin)}~${formatValue(stat.id, stat.valMax)})` : '';
            statList.push(`<span>${stat.statName} +${formatValue(stat.id, stat.val)}${range}</span>`);
        });
    } else if (stored) {
        if (entry.uniqueEffect) statList.push(`<span style="color:#d7b8ff;">[고유 효과] ${escapeHTML(entry.uniqueEffect)}</span>`);
        (entry.stats || []).forEach(stat => {
            let min = Number.isFinite(Number(stat.min)) ? Number(stat.min) : Number(stat.base || 0);
            let max = Number.isFinite(Number(stat.max)) ? Number(stat.max) : min;
            statList.push(`<span>${getStatName(stat.id)} +${formatValue(stat.id, min)}~+${formatValue(stat.id, max)}</span>`);
        });
    }
    return statList.join('<br>');
}

function renderUniqueCodexUI() {
    let summary = document.getElementById('ui-codex-summary');
    let listEl = document.getElementById('ui-codex-list');
    if (!summary || !listEl) return;
    game.uniqueCodex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
    game.codexCollapsedSlots = (game.codexCollapsedSlots && typeof game.codexCollapsedSlots === 'object') ? game.codexCollapsedSlots : {};
    let progress = getUniqueCodexProgress();
    let bonus = progress.stored * 0.2;
    let rewardState = progress.stored >= progress.total ? '완성' : '미완성';
    summary.innerHTML = `등록 수 / 전체: <strong>${progress.stored}</strong> / ${progress.total} · 도감 보너스: 피해/생명력/드랍률 +${bonus.toFixed(1)}% · 완성 상태: <strong>${rewardState}</strong>`;
    let bySlot = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
    let lines = [];
    bySlot.forEach(slot => {
        let entries = UNIQUE_DB.filter(entry => (entry.slots || [])[0] === slot);
        if (entries.length === 0) return;
        let slotStored = entries.filter(entry => !!game.uniqueCodex[`${slot}|${entry.name}`]).length;
        let collapsed = !!game.codexCollapsedSlots[slot];
        lines.push(`<div style="grid-column:1/-1; margin-top:4px; display:flex; justify-content:space-between; align-items:center; gap:8px; background:#121822; border:1px solid #2f4f66; border-radius:8px; padding:8px 10px;"><strong style="color:#9bc2df;">${slot} <span style="color:#ffd38b; font-size:0.86em;">${slotStored}/${entries.length}</span></strong><button onclick="toggleCodexSlotCollapse('${slot}')" style="font-size:0.78em; padding:4px 8px;">${collapsed ? '펼치기' : '접기'}</button></div>`);
        if (collapsed) return;
        entries.forEach(entry => {
            let key = `${slot}|${entry.name}`;
            let stored = game.uniqueCodex[key];
            let infoLine = stored ? (stored.baseName ? `${stored.baseName} / 숨겨진 티어 ${getTierBadgeHtml(stored.hiddenTier || stored.itemTier || 1, 'T')}` : '정보만 유지됨 (루프 리셋됨)') : '미등록';
            let statHtml = stored ? renderCodexStatsHtml(entry, stored, key) : '';
            lines.push(`<div class="item-card"><div><div class="item-title unique">[${slot}] ${stored ? entry.name : '???'}</div><div class="item-base-line">${infoLine}</div><div class="item-stats">${statHtml || '옵션 정보 없음'}</div></div><div class="item-actions">${stored ? (stored.baseName ? `<button onclick="withdrawUniqueFromCodex('${key}')">꺼내기</button>` : `<button disabled>초기화됨</button>`) : `<button disabled>비어있음</button>`}</div></div>`);
        });
    });
    listEl.innerHTML = lines.join('');
}

function grantCodexLegacyStarterUniques() {
    if (!game.uniqueCodexCompletedRewardClaimed) return;
    let act1Pool = UNIQUE_DB.filter(entry => {
        if (!entry) return false;
        if ((entry.reqTier || 1) > 1) return false;
        if (entry.dropOnly || entry.contentOnly || entry.bossOnly) return false;
        return !!((entry.slots || [])[0]);
    });
    if (act1Pool.length === 0) return;
    if ((game.inventory || []).length >= getInventoryLimit()) return;
    let pick = rndChoice(act1Pool);
    let uniqueTier = pick.reqTier || 1;
    let base = chooseItemBase(pick.slots[0], uniqueTier);
    let item = {
        id: ++itemIdCounter,
        slot: pick.slots[0],
        baseName: base.name,
        name: pick.name,
        rarity: 'unique',
        itemTier: uniqueTier,
        hiddenTier: uniqueTier,
        baseStats: rollBaseStats(base, uniqueTier),
        stats: []
    };
    pick.stats.forEach(stat => item.stats.push({ id: stat.id, statName: getStatName(stat.id), val: stat.min, valMin: stat.min, valMax: stat.max, tier: 1 }));
    game.inventory.push(normalizeItem(item));
    addLog(`🎁 도감 완성 특전 지급: [${pick.slots[0]}] ${pick.name} (액트1 고유 랜덤 1개)`, 'loot-unique');
}

function assertBuildEditable() {
    if (game.woodsmanBuildLock) {
        addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
        return false;
    }
    return true;
}

function changeSkill(name) { if (!assertBuildEditable()) return; game.activeSkill = name; updateStaticUI(); }
function getSupportResonanceCost(name) {
    let db = SUPPORT_GEM_DB[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[0])) return Math.max(1, Math.floor(db.resonanceCosts[0]));
    if (Number.isFinite(db.resonanceCost)) return Math.max(1, Math.floor(db.resonanceCost));
    let stat = db.stat || '';
    if (['flatDmg', 'critDmg', 'resPen', 'physIgnore', 'ds'].includes(stat)) return 3;
    if (['aspd', 'crit', 'dotPctDmg', 'elementalPctDmg', 'meleePctDmg', 'projectilePctDmg'].includes(stat)) return 2;
    return 1;
}

function getEffectiveResonanceCap() {
    let base = Math.max(0, Math.floor(game.resonancePower || 0));
    let runeBonus = 0;
    if (typeof getPlayerStats === 'function') {
        let stats = getPlayerStats();
        runeBonus = Math.max(0, Math.floor((stats && stats.runeResonancePower) || 0));
    }
    return base + runeBonus;
}

function getSupportTierResonanceCost(name) {
    let base = getSupportResonanceCost(name);
    let tier = getSupportActiveTier(name);
    let db = SUPPORT_GEM_DB[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[tier - 1])) return Math.max(1, Math.floor(db.resonanceCosts[tier - 1]));
    if (tier <= 1) return base;
    if (tier === 2) return Math.max(base + 2, Math.floor(base * 2.4));
    return Math.max(base + 5, Math.floor(base * 3.8));
}
function getSupportActiveTier(name) {
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let unlocked = Math.max(1, Math.min(3, Math.floor(rec.unlockedTier || 1)));
    let active = Math.max(1, Math.min(unlocked, Math.floor(rec.activeTier || 1)));
    rec.unlockedTier = unlocked;
    rec.activeTier = active;
    game.supportGemData = game.supportGemData || {};
    game.supportGemData[name] = rec;
    return active;
}
function setSupportActiveTier(name, tier) { if (!assertBuildEditable()) return;
    if (!SUPPORT_GEM_DB[name]) return;
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    rec.unlockedTier = Math.max(1, Math.min(3, Math.floor(rec.unlockedTier || 1)));
    let nextTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(tier || 1)));
    let prevTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(rec.activeTier || 1)));
    let equipped = (game.equippedSupports || []).includes(name);
    if (equipped && nextTier !== prevTier) {
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
        let nextUsed = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        let resonancePower = getEffectiveResonanceCap();
        if (nextUsed > resonancePower) {
            rec.activeTier = prevTier;
            game.supportGemData[name] = rec;
            let need = Math.max(0, nextUsed - used);
            let remain = Math.max(0, resonancePower - used);
            return addLog(`공명력 부족 (${remain}/${need})`, 'attack-monster');
        }
    } else {
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
    }
    normalizeSupportLoadout(false);
    updateStaticUI();
}
function toggleSupport(name) { if (!assertBuildEditable()) return;
    normalizeSupportLoadout(false);
    let idx = game.equippedSupports.indexOf(name);
    if (idx > -1) game.equippedSupports.splice(idx, 1);
    else if (game.equippedSupports.length < getPlayerStats().suppCap) {
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        let remain = Math.max(0, getEffectiveResonanceCap() - used);
        let activeTier = getSupportActiveTier(name);
        let cost = getSupportTierResonanceCost(name);
        if (remain < cost) return addLog(`공명력 부족 (${remain}/${cost})`, 'attack-monster');
        game.equippedSupports.push(name);
    }
    updateStaticUI();
}


let mobileToastQueue = [];
let mobileToastActive = false;

function shouldShowMobileToast(msg, cls, opts = {}) {
    if (opts && opts.noToast) return false;
    let isMobile = (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) || ('ontouchstart' in window);
    let logHidden = game && game.settings && game.settings.showCombatLog === false;
    if (!isMobile && !logHidden) return false;
    let text = stripHtmlMessage(msg);
    let importantFailure = /(부족|실패|불가|필요|없습니다|찾을 수 없습니다|잠겨|환불|반환)/.test(text || '');
    if (importantFailure) return true;
    let level = cls || '';
    if (level === 'attack-monster') {
        let noisyCombat = /(피격|상태이상|점화|중독|출혈|감전|냉각|도트|지속\s*피해)/.test(text || '');
        if (noisyCombat) return false;
        return true;
    }
    if (level === 'season-up' || level === 'loot-unique') return true;
    return false;
}

function getMobileToastRoot() {
    let root = document.getElementById('mobile-toast-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'mobile-toast-root';
    root.style.position = 'fixed';
    root.style.left = '50%';
    root.style.bottom = '84px';
    root.style.transform = 'translateX(-50%)';
    root.style.zIndex = '9999';
    root.style.pointerEvents = 'none';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '8px';
    root.style.width = 'min(92vw, 560px)';
    document.body.appendChild(root);
    return root;
}

function stripHtmlMessage(raw) {
    let div = document.createElement('div');
    div.innerHTML = String(raw || '');
    return (div.textContent || div.innerText || '').trim();
}

function enqueueMobileToast(msg, cls) {
    mobileToastQueue.push({ msg: stripHtmlMessage(msg), cls: cls || '' });
    if (!mobileToastActive) showNextMobileToast();
}

function showNextMobileToast() {
    if (mobileToastQueue.length <= 0) { mobileToastActive = false; return; }
    mobileToastActive = true;
    let entry = mobileToastQueue.shift();
    let root = getMobileToastRoot();
    let toast = document.createElement('div');
    toast.textContent = entry.msg;
    toast.style.background = entry.cls === 'attack-monster' ? 'rgba(120,35,35,0.94)' : 'rgba(22,30,45,0.94)';
    toast.style.border = entry.cls === 'attack-monster' ? '1px solid #b76464' : '1px solid #4f6f96';
    toast.style.color = '#eef5ff';
    toast.style.padding = '10px 12px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '13px';
    toast.style.lineHeight = '1.35';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .2s ease';
    root.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
            showNextMobileToast();
        }, 220);
    }, 1700);
}

let logQueue = [];
let logFlushRaf = 0;
let combatLogRateState = {};
let combatLogAggregateState = {};
function flushLogQueue() {
    logFlushRaf = 0;
    const log = document.getElementById('log');
    if (!log || logQueue.length === 0) return;
    let frag = document.createDocumentFragment();
    logQueue.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-msg ' + (entry.cls || '');
        div.innerHTML = entry.msg;
        frag.appendChild(div);
    });
    logQueue = [];
    log.appendChild(frag);
    while (log.childElementCount > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
}
function addLog(msg, cls, opts = {}) {
    let now = performance.now();
    let settings = game.settings || {};
    if (opts.rateKey && settings.combatLogRateLimit !== false) {
        let nextAt = combatLogRateState[opts.rateKey] || 0;
        let interval = Math.max(60, Number(opts.minIntervalMs || 180));
        if (now < nextAt) return;
        combatLogRateState[opts.rateKey] = now + interval;
    }
    if (opts.aggregateKey && settings.combatLogAggregate !== false) {
        let key = `${opts.aggregateKey}:${cls || ''}`;
        let state = combatLogAggregateState[key];
        let winMs = Math.max(120, Number(opts.aggregateWindowMs || 500));
        if (state && (now - state.lastAt) <= winMs) {
            state.count++;
            state.lastAt = now;
            state.msg = msg;
            return;
        }
        if (state && state.count > 0) {
            let merged = state.count > 1 ? `${state.msg} <span style="color:#9fb6cc;">x${state.count}</span>` : state.msg;
            logQueue.push({ msg: merged, cls: state.cls });
        }
        combatLogAggregateState[key] = { msg: msg, cls: cls, count: 1, lastAt: now };
        setTimeout(() => {
            let s = combatLogAggregateState[key];
            if (!s) return;
            if ((performance.now() - s.lastAt) >= winMs) {
                let merged = s.count > 1 ? `${s.msg} <span style="color:#9fb6cc;">x${s.count}</span>` : s.msg;
                logQueue.push({ msg: merged, cls: s.cls });
                delete combatLogAggregateState[key];
                if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
            }
        }, winMs + 10);
        if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
        return;
    }
    logQueue.push({ msg, cls });
    if (shouldShowMobileToast(msg, cls, opts)) enqueueMobileToast(msg, cls);
    if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
}

function applyThemeMode(mode) {
    let finalMode = mode === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('light-mode', finalMode === 'light');
}

function getHeroSelectionDef(heroId) {
    return HERO_SELECTION_DEFS[heroId] || HERO_SELECTION_DEFS.hero1;
}

function syncHeroSelectionState(source) {
    if (!Array.isArray(game.discoveredHeroIds)) game.discoveredHeroIds = [];
    game.discoveredHeroIds = game.discoveredHeroIds.filter(id => HERO_SELECTION_DEFS[id]);
    if (!HERO_SELECTION_DEFS[game.selectedHeroId]) game.selectedHeroId = 'hero1';
    if (!game.discoveredHeroIds.includes(game.selectedHeroId)) game.discoveredHeroIds.push(game.selectedHeroId);
    let unlockedBefore = !!game.heroFreeSwitchUnlocked;
    if (game.discoveredHeroIds.length >= HERO_SELECTION_ORDER.length) game.heroFreeSwitchUnlocked = true;
    if (!unlockedBefore && game.heroFreeSwitchUnlocked) addLog('🧬 모든 캐릭터 재능을 확인했습니다. 설정에서 언제든 외형 변경이 가능합니다.', 'season-up');
    if (source === 'init') return;
    let summaryEl = document.getElementById('ui-hero-talent-summary');
    if (summaryEl) {
        let def = getHeroSelectionDef(game.selectedHeroId);
        let discovered = Math.min(HERO_SELECTION_ORDER.length, game.discoveredHeroIds.length);
        let unlockText = game.heroFreeSwitchUnlocked ? '자유 변경 해금됨' : `해금 진행 ${discovered}/${HERO_SELECTION_ORDER.length}`;
        summaryEl.innerText = `${def.label} · 재능: ${def.talentsText} · ${unlockText}`;
    }
}

function renderHeroSelectionControls() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    selectEl.innerHTML = HERO_SELECTION_ORDER.map(id => {
        let def = HERO_SELECTION_DEFS[id];
        return `<option value="${id}">${def.label}</option>`;
    }).join('');
    selectEl.value = game.selectedHeroId || 'hero1';
    if (!game.heroFreeSwitchUnlocked) {
        selectEl.disabled = true;
        selectEl.title = '모든 캐릭터를 한 번씩 선택하면 자유 변경이 해금됩니다.';
    } else {
        selectEl.disabled = false;
        selectEl.title = '';
    }
    syncHeroSelectionState();
}

function applyHeroSelection(heroId, options = {}) {
    if (!HERO_SELECTION_DEFS[heroId]) return false;
    let prev = game.selectedHeroId;
    game.selectedHeroId = heroId;
    syncHeroSelectionState();
    if (prev !== heroId && battleAssets && battleAssets.ready) battleAssets.atlas = buildBattleAssetAtlas();
    renderHeroSelectionControls();
    if (!options.silent && prev !== heroId) addLog(`🧬 캐릭터 변경: ${getHeroSelectionDef(heroId).label}`, 'season-up');
    if (!options.skipSave) queueImportantSave(200);
    return true;
}

function onHeroSelectionChanged() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    if (!game.heroFreeSwitchUnlocked) {
        addLog('🔒 아직 자유 변경이 잠겨 있습니다. 루프를 돌며 모든 캐릭터를 확인하세요.', 'attack-monster');
        selectEl.value = game.selectedHeroId || 'hero1';
        return;
    }
    applyHeroSelection(selectEl.value);
    updateStaticUI();
}

function ensureInitialHeroSelection() {
    if (game.heroSelectionInitialized) return;
    openLoopHeroSelection((pickedId) => {
        game.heroSelectionInitialized = true;
        addLog(`🧬 첫 루프 캐릭터가 정해졌습니다: ${HERO_SELECTION_DEFS[pickedId].blindLabel}`, 'season-up');
        queueImportantSave(120);
    }, {
        kicker: 'Character Selection',
        title: '시작 캐릭터 선택',
        body: '첫 루프에서 사용할 캐릭터를 선택하세요.'
    });
}

function updateSettings() {
    game.settings.showCombatScene = document.getElementById('chk-combat-scene').checked;
    game.settings.showCombatLog = document.getElementById('chk-log-combat').checked;
    game.settings.combatLogAggregate = document.getElementById('chk-log-aggregate').checked;
    game.settings.combatLogRateLimit = document.getElementById('chk-log-rate-limit').checked;
    game.settings.showSpawnLog = document.getElementById('chk-log-spawn').checked;
    game.settings.showExpLog = document.getElementById('chk-log-exp').checked;
    game.settings.showLootLog = document.getElementById('chk-log-loot').checked;
    game.settings.showCrowdPauseLog = document.getElementById('chk-log-crowd').checked;
    game.settings.showDeathNotice = document.getElementById('chk-death-notice').checked;
    game.settings.showMobileBattlePip = document.getElementById('chk-mobile-battle-pip').checked;
    game.settings.itemFilterEnabled = document.getElementById('chk-item-filter-enabled').checked;
    game.settings.itemFilterRarities = game.settings.itemFilterRarities || { normal: true, magic: true, rare: true, unique: true };
    game.settings.itemFilterRarities.normal = document.getElementById('chk-item-filter-normal').checked;
    game.settings.itemFilterRarities.magic = document.getElementById('chk-item-filter-magic').checked;
    game.settings.itemFilterRarities.rare = document.getElementById('chk-item-filter-rare').checked;
    game.settings.itemFilterRarities.unique = document.getElementById('chk-item-filter-unique').checked;
    game.settings.itemFilterTierThreshold = Math.max(1, Math.floor(Number(document.getElementById('inp-item-filter-tier-threshold').value) || 1));
    game.settings.itemFilterMinTierCount = Math.max(0, Math.floor(Number(document.getElementById('inp-item-filter-tier-count').value) || 0));
    game.settings.itemFilterMinHiddenTier = Math.max(1, Math.floor(Number(document.getElementById('inp-item-filter-hidden-tier').value) || 1));
    game.settings.itemFilterOnlyNewCodexUnique = document.getElementById('chk-item-filter-unique-new-codex').checked;
    game.settings.mapCompleteAction = (document.getElementById('sel-map-complete-action') || {}).value || 'nextZone';
    game.settings.townReturnAction = (document.getElementById('sel-town-return-action') || {}).value || 'retry';
    let themeSelect = document.getElementById('sel-theme-mode');
    game.settings.themeMode = themeSelect ? themeSelect.value : (game.settings.themeMode || 'dark');
    applyThemeMode(game.settings.themeMode);
    toggleDeathNoticeSetting(game.settings.showDeathNotice);
    updateStaticUI();
}

function positionTooltipElement(el, x, y) {
    if (!el) return;
    el.style.left = '0px';
    el.style.top = '0px';
    let rect = el.getBoundingClientRect();
    let left = x + 18;
    let top = y + 18;
    if (left + rect.width > window.innerWidth - 10) left = x - rect.width - 18;
    if (top + rect.height > window.innerHeight - 10) top = y - rect.height - 18;
    left = clampNumber(left, 8, Math.max(8, window.innerWidth - rect.width - 8));
    top = clampNumber(top, 8, Math.max(8, window.innerHeight - rect.height - 8));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
}
function setActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') activeTooltipId = null;
    activeTooltipId = id;
    let el = document.getElementById(id);
    if (el && el.style.display !== 'none') positionTooltipElement(el, mouseX, mouseY);
}
function clearActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') return;
    if (activeTooltipId === id) activeTooltipId = null;
}

function showInfoTooltipHtml(x, y, html, borderColor) {
    let tt = document.getElementById('info-tooltip');
    tt.innerHTML = html;
    tt.style.borderColor = borderColor || '#777';
    tt.style.display = 'block';
    positionTooltipElement(tt, x, y);
    setActiveTooltip('info-tooltip');
}
function hideInfoTooltip() {
    clearActiveTooltip('info-tooltip');
    document.getElementById('info-tooltip').style.display = 'none';
}
document.addEventListener('mousemove', function(evt) {
    let tt = document.getElementById('info-tooltip');
    if (!tt || tt.style.display === 'none') return;
    let anchor = evt.target && evt.target.closest ? evt.target.closest('[data-info-tooltip-anchor="1"]') : null;
    if (!anchor && evt.target && evt.target.closest) anchor = evt.target.closest('.tip, .skill-gem, .support-gem, .item-card, .currency-card, .condition-gem-card');
    let overTooltip = evt.target && evt.target.closest ? evt.target.closest('#info-tooltip') : null;
    if (!anchor && !overTooltip) hideInfoTooltip();
});
let activeTalismanHoverId = null;
function setTalismanHoverGroup(talismanId) {
    if (activeTalismanHoverId === talismanId) return;
    document.querySelectorAll('.talisman-board-cell.talisman-hover-group').forEach(el => el.classList.remove('talisman-hover-group'));
    activeTalismanHoverId = talismanId || null;
    if (!activeTalismanHoverId) return;
    document.querySelectorAll(`[data-talisman-hover-id="${activeTalismanHoverId}"]`).forEach(el => el.classList.add('talisman-hover-group'));
}
function showTalismanBoardTooltip(event, talismanId) {
    let placed = talismanId ? ((game.talismanPlacements || {})[talismanId] || {}).talisman : null;
    if (!placed) return;
    setTalismanHoverGroup(talismanId);
    let min = Number.isFinite(placed.valueMin) ? placed.valueMin : placed.value;
    let max = Number.isFinite(placed.valueMax) ? placed.valueMax : placed.value;
    let specialDesc = getTalismanSpecialDescription(placed);
    let html = `<div class="tooltip-title">[${escapeHTML(placed.shape || '?')}] ${escapeHTML(placed.statName || '')}</div><div class="tooltip-line">수치: +${formatValue(placed.stat, placed.value)} (${formatValue(placed.stat, min)} ~ ${formatValue(placed.stat, max)})</div>${specialDesc ? `<div class=\"tooltip-line\" style=\"color:#ffd6a0;\">고유 효과: ${escapeHTML(specialDesc)}</div>` : ''}`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#8fd3ff');
}

function getTalismanSpecialDescription(talisman) {
    if (!talisman || !talisman.special) return '';
    if (talisman.special === 'gravity') return '인접(상하좌우) 부적들의 능력치를 25%씩 복제해 합산.';
    if (talisman.special === 'simpleCopy') return `화살표 방향(현재: ${talisman.markDir || 'up'})의 인접 부적 1개의 모든 능력치를 동일 수치로 복제.`;
    if (talisman.special === 'temperance') return '무작위 능력치 3줄을 동시에 부여(각 줄 독립 수치).';
    if (talisman.special === 'pride') return '인접 부적 수에 따라 보너스 부여: 0개(젬레벨+1/보조한도+1), 1개(보조한도+1), 2~4개(피해+15%/공속+10%), 5개 이상(치확+5%/치피+25% 포함).';
    if (talisman.special === 'moment') return `보스 최종 피해 +${talisman.bossFinalDmgMin || 5}~${talisman.bossFinalDmgMax || 15}% 및 보스 체력 5% 이하 즉시 처형.`;
    if (talisman.special === 'elementFocus') {
        let list = Array.isArray(talisman.stats) ? talisman.stats : [];
        if (list.length >= 3) return `${getStatName(list[0].stat)} +${formatValue(list[0].stat, list[0].value)}, ${getStatName(list[1].stat)} +${formatValue(list[1].stat, list[1].value)}, ${getStatName(list[2].stat)} +${formatValue(list[2].stat, list[2].value)}`;
        return '해당 계열 젬 레벨/해당 계열 피해/해당 계열 저항 3종을 동시에 부여.';
    }
    return talisman.special;
}

function showTalismanInventoryTooltip(event, talismanId) {
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let t = inv.find(row => row && row.id === talismanId);
    if (!t) return;
    let min = Number.isFinite(t.valueMin) ? t.valueMin : t.value;
    let max = Number.isFinite(t.valueMax) ? t.valueMax : t.value;
    let specialDesc = getTalismanSpecialDescription(t);
    let hasPrimaryStat = !!t.stat;
    let statLine = hasPrimaryStat ? `<div class="tooltip-line">수치: +${formatValue(t.stat, t.value)} (${formatValue(t.stat, min)} ~ ${formatValue(t.stat, max)})</div>` : '';
    let html = `<div class="tooltip-title">[${escapeHTML(t.shape || '?')}] ${escapeHTML(t.name || t.statName || '부적')}</div>${statLine}${specialDesc ? `<div class=\"tooltip-line\" style=\"color:#ffd6a0;\">고유 효과: ${escapeHTML(specialDesc)}</div>` : ''}`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#8fd3ff');
}

function showTalismanUnlockTooltip(event, x, y) {
    let unlockedSet = getTalismanUnlockedCellsSet();
    let extraUnlocked = Math.max(0, unlockedSet.size - 16);
    let unlockCost = getTalismanExpandCost(extraUnlocked);
    let html = `<div class="tooltip-title">잠긴 부적 칸</div><div class="tooltip-line">좌표: (${x + 1}, ${y + 1})</div><div class="tooltip-line">해금 비용: ${formatTalismanUnlockCostLabel(unlockCost)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7ea6d3');
}
function hideTalismanBoardTooltip(event, talismanId) {
    let next = event && event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(`[data-talisman-hover-id="${talismanId}"]`) : null;
    if (next) return;
    setTalismanHoverGroup(null);
    hideInfoTooltip();
}

function renderBreakdownHtml(data) {
    let html = `<div class="tooltip-title">${data.title}</div>`;
    (data.lines || []).forEach(line => { html += `<div class="tooltip-line">${line}</div>`; });
    if (data.final !== undefined) html += `<div class="tooltip-final">최종 수치: ${data.final}</div>`;
    return html;
}

function showStatTooltip(event, key) {
    let stats = cachedTooltipStats;
    if (!stats || !stats.breakdowns || !stats.breakdowns[key]) {
        stats = getPlayerStats();
        cachedTooltipStats = stats;
    }
    let data = stats && stats.breakdowns ? stats.breakdowns[key] : null;
    if (!data) return;
    showInfoTooltipHtml(event.clientX, event.clientY, renderBreakdownHtml(data), '#f39c12');
}


function showPlayerAilmentTooltip(event, type, timeLeft, power, sourceHitDamage) {
    let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈' };
    let p = Math.max(0.1, Number(power || 0.1));
    let source = Math.max(0, Number(sourceHitDamage || 0));
    let detail = '';
    if (isDamageAilmentType(type)) {
        let tooltipStats = cachedTooltipStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : null);
        let dps = getPlayerDamageAilmentDps({ type: type, power: p, sourceHitDamage: source }, tooltipStats);
        let basis = source > 0 ? `받은 피해 ${Math.floor(source)} 기준` : '최대 생명력 기반';
        detail = `초당 피해: 약 ${dps} <span style="color:#9fb4d1;">(${basis})</span>`;
    } else if (type === 'chill') detail = `공격 속도 약 32% 감소`;
    else if (type === 'shock') detail = `물리 피해 감소 -22% (최저 -40%)`; // dr은 물리 피해 감소 전용
    else if (type === 'freeze') detail = '행동 불가';
    let html = `<div class="tooltip-title">${labels[type] || type}</div><div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(timeLeft||0)))}초</div><div class="tooltip-line">위력: ${p.toFixed(2)}</div><div class="tooltip-line">${detail}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ff7f7f');
}
function showPlayerBuffTooltip(event, name, type, remainSec) {
    let delta = getConditionGemStatDelta(name, type || 'buff');
    let lines = Object.keys(delta || {}).map(key => `${getStatName(key)} ${delta[key] >= 0 ? '+' : ''}${formatValue(key, delta[key])}`);
    let html = `<div class="tooltip-title">${name}</div><div class="tooltip-line">분류: ${type || '버프'}</div><div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(remainSec||0)))}초</div><div class="tooltip-line">${lines.join(' / ') || '효과 정보 없음'}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}
function showEnemyAilmentTooltip(event, type, timeLeft, power, sourceHitDamage, specialDps) {
    let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈', flameDecay: '화염 부패' };
    let p = Math.max(0, Number(power || 0));
    let source = Math.max(0, Number(sourceHitDamage || 0));
    let detail = '';
    if (isDamageAilmentType(type)) {
        let dps = getDamageAilmentBaseDpsFromHit(source, p, (cachedTooltipStats && Number.isFinite(cachedTooltipStats.dotDamageScale)) ? cachedTooltipStats.dotDamageScale : 1);
        detail = `초당 피해: 약 ${dps} <span style="color:#9fb4d1;">(히트 피해 ${Math.floor(source)} 기준)</span>`;
    } else if (type === 'flameDecay') detail = `초당 피해: 약 ${Math.max(0, Math.floor(Number(specialDps || 0)))} <span style="color:#9fb4d1;">(화염 부패 지속 피해)</span><br><span style="color:#ffb48a;">점화 피해 증폭: 생명력 100당 8%</span>`;
    else if (type === 'chill') detail = '이동/공격 속도 감소 (최대 생명력 대비 타격 비율 반영)';
    else if (type === 'shock') detail = '받는 피해 증가 (최대 생명력 대비 타격 비율 반영)';
    else if (type === 'freeze') detail = '행동 불가 (최대 생명력 대비 타격 비율 반영)';
    let html = `<div class="tooltip-title">${labels[type] || type}</div><div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(timeLeft||0)))}초</div><div class="tooltip-line">위력: ${p.toFixed(2)}</div><div class="tooltip-line">${detail}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ffcf88');
}

function showGemTooltip(event, type, name) {
    let info = getGemPresentation(name, type === 'support');
    let stats = getPlayerStats();
    let cacheKey = `${type || 'active'}:${name}:${info && (info.totalLevel || info.finalLevel || info.baseLevel || 1)}`;
    let html = `<div class="tooltip-title">${name}</div>`;
    if (type === 'support') {
        html += `<div class="tooltip-line">${info.desc}</div>`;
        let tierText = info.activeTier === 3 ? '상급' : info.activeTier === 2 ? '중급' : '하급';
        html += `<div class="tooltip-line" style="margin-top:6px;">효과(${tierText}): ${info.statName} +${formatValue(SUPPORT_GEM_DB[name].stat, info.value)}${SUPPORT_GEM_DB[name].isPct ? '%' : ''}</div>`;
        if (Number.isFinite(SUPPORT_GEM_DB[name].heraldExplodeBase)) {
            let chancePct = Math.min(85, ((SUPPORT_GEM_DB[name].heraldExplodeBase + ((info.totalLevel - 1) * (SUPPORT_GEM_DB[name].heraldExplodeScale || 0))) * 100));
            html += `<div class="tooltip-line">시체폭발: 처치 시 ${chancePct.toFixed(1)}% 확률 발동</div>`;
            html += `<div class="tooltip-line">시체폭발 피해: 처치한 적 최대 생명력의 10%</div>`;
        }
        if (TAGGED_DAMAGE_STAT_BY_TAG && Object.values(TAGGED_DAMAGE_STAT_BY_TAG).includes(info.statId)) {
            let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === info.statId);
            html += `<div class="tooltip-line">적용 태그: ${translateSkillTag(tag)}</div>`;
        }
    } else {
        let skill = info.skill || SKILL_DB[name];
        html += `<div class="tooltip-line">${info.desc}</div>`;
        html += `<div class="tooltip-line" style="margin-top:6px;">피해 배율 ${formatPercentMultiplier(skill.dmg || skill.baseDmg || 1)}</div>`;
        html += `<div class="tooltip-line">공속 배율 ${formatPercentMultiplier(skill.spd || skill.baseSpd || 1)}</div>`;
        if ((info.tags || []).includes('spell')) {
            let spellLv = Math.max(1, info.finalLevel || 1);
            let spellLog = Math.log2(spellLv);
            let spellFlat = ((skill.spellFlatBase || 0) * 3) + Math.max(0, spellLv - 1) * (skill.spellFlatScale || 0) + ((skill.spellFlatBase || 0) * 0.8 * spellLog * spellLog);
            html += `<div class="tooltip-line">주문 내장 피해 ${Math.floor(spellFlat)}</div>`;
        }
        if ((skill.hpDmgScale || 0) > 0) {
            let per100 = (skill.hpDmgScale || 0) * 10000;
            html += `<div class="tooltip-line">생명력 계수: 최대 생명력 100당 약 +${per100.toFixed(1)}% 내장 피해 (주문 내장 피해처럼 피해 증가 적용)</div>`;
        }
        if ((skill.regenDmgScale || 0) > 0) html += `<div class="tooltip-line">재생 계수: 재생 1%당 ${skill.regenDmgScale.toFixed(2)}% 추가 배율</div>`;
        if ((skill.fireResDmgScale || 0) > 0) html += `<div class="tooltip-line">화염 저항 계수: 화염 저항 1%당 ${(skill.fireResDmgScale * 100).toFixed(2)}% 추가 배율</div>`;
        if ((skill.fireResOvercapMulPerPct || 0) > 0) {
            let stats = cachedTooltipStats || null;
            let rawFireRes = stats && Number.isFinite(stats.rawResF) ? stats.rawResF : null;
            let maxFireRes = stats && Number.isFinite(stats.maxResF) ? stats.maxResF : null;
            let appliedOvercap = rawFireRes !== null && maxFireRes !== null ? Math.max(0, rawFireRes - maxFireRes) : null;
            let currentText = rawFireRes !== null && maxFireRes !== null
                ? ` · 현재 적용분 ${appliedOvercap.toFixed(1)}% (미적용 화염 저항 ${Math.floor(rawFireRes)}% / 최대 ${Math.floor(maxFireRes)}%)`
                : ' · 현재 최대 화염 저항을 초과한 미적용 화염 저항 기준';
            html += `<div class="tooltip-line">초과 화염 저항 계수: 최대 화염 저항 초과 1%당 배율 +${Number(skill.fireResOvercapMulPerPct || 0).toFixed(2)}배${currentText}</div>`;
        }
        if (name === '화염 부패') html += `<div class="tooltip-line">특수 규칙: 공격력(기본 피해) 미적용 · 적에게 화염 부패 디버프 적용 · 화염 부패 대상은 점화 피해가 생명력 100당 8% 증폭</div>`;
        if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">지속 피해 배율 ${(skill.dotMultiplier || 1).toFixed(2)}x</div>`;
        if ((skill.multiHit || 1) > 1) html += `<div class="tooltip-line">다단 히트: 1회 시전당 ${Math.floor(skill.multiHit)}회 타격${skill.randomTargetEachHit ? ' (타격마다 무작위 대상)' : ''}</div>`;
        html += `<div class="tooltip-line">타겟 방식: ${skill.targetMode === 'all' ? '광역' : skill.targetMode === 'whirl' ? '광역 회전' : skill.targetMode === 'cleave' ? '전방 다중' : skill.targetMode === 'chain' ? '연쇄' : skill.targetMode === 'pierce' ? '관통' : '단일'}</div>`;
        let maxTargetsView = Math.max(1, skill.targets || 1);
        if (skill.targetMode === 'all') maxTargetsView = Math.min(8, Math.max(6, skill.targets || 6));
        html += `<div class="tooltip-line">최대 타겟 수: ${maxTargetsView}</div>`;
        if ((info.tags || []).length > 0) html += `<div class="tooltip-line">태그: ${info.tags.join(' / ')}</div>`;
        if (skill.crit) html += `<div class="tooltip-line">추가 치명타 +${Number(skill.crit).toFixed(Number.isInteger(skill.crit) ? 0 : 1)}%</div>`;
        if (skill.critScale) html += `<div class="tooltip-line">치명타 성장: 젬 레벨당 +${skill.critScale}%</div>`;
        if (skill.pierceOverkillCarry) html += `<div class="tooltip-line" style="color:#8fffe0;">특수 옵션: 처치 후 남은 피해가 다른 적에게 관통 연쇄</div>`;
        if (skill.leech) html += `<div class="tooltip-line">추가 흡혈 +${skill.leech}%</div>`;
        if (skill.instantLeech) html += `<div class="tooltip-line" style="color:#ffb3d1;">특수 옵션: 이 젬을 사용해서 주는 피해에는 흡혈 즉시 적용</div>`;
    }
    if (type === 'support' || SKILL_DB[name].isGem || SKILL_DB[name].levelable) {
        html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">총 레벨 ${type === 'support' ? info.totalLevel : info.finalLevel}</div>`;
        if (type === 'support') {
            html += `<div class="tooltip-line">(Lv.${info.baseLevel} + 패시브 ${stats.gemBonusSources.passive} + 장비 ${stats.gemBonusSources.gear} + 보상 ${stats.gemBonusSources.reward})</div>`;
        } else {
            html += `<div class="tooltip-line">(Lv.${info.baseLevel} + 패시브 ${stats.gemBonusSources.passive} + 장비 ${stats.gemBonusSources.gear} + 보상 ${stats.gemBonusSources.reward} + 군주의핵 ${info.bossCoreLevel || 0} + 창공의힘 ${info.skyCoreLevel || 0})</div>`;
        }
    }
    let border = type === 'support' ? '#2bcbba' : '#ff5252';
    gemTooltipCache = { key: cacheKey, html: html, border: border };
    showInfoTooltipHtml(event.clientX, event.clientY, html, border);
}

function showItemTooltip(event, idx, isEquip) {
    let item = isEquip ? game.equipment[idx] : game.inventory[idx];
    let resolveItemStatTone = (statId) => getItemStatToneColor(statId);
    if (!item) return;
    activeItemTooltipToken = isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`;
    let tt = document.getElementById('item-tooltip-box');
    let html = `<div class="tooltip-title" style="color:${getRarityColor(item.rarity)}">[${item.slot.replace(/[12]/, '')}] ${item.name}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}</div>`;
    html += `<div class="tooltip-line" style="color:#95a5a6;">베이스: ${item.baseName}</div>`;
    html += `<div class="tooltip-line" style="color:#a8c0da;">숨겨진 티어 ${getTierBadgeHtml(item.hiddenTier || item.itemTier || 1, 'T')}</div>`;
    if (item.rarity === 'unique' && item.uniqueEffect) {
        let uniqueGlow = 'display:inline-block;padding:1px 6px;border-radius:6px;border:1px solid rgba(198,162,255,0.55);background:linear-gradient(135deg, rgba(73,52,108,0.45) 0%, rgba(31,23,56,0.5) 100%);color:#f0dcff;font-weight:700;text-shadow:0 0 6px rgba(196,154,255,0.8),0 0 12px rgba(142,109,214,0.55);box-shadow:0 0 10px rgba(140,94,220,0.4),inset 0 0 10px rgba(229,205,255,0.2);';
        html += `<div class="tooltip-line" style="margin-top:6px;"><span style="${uniqueGlow}">✨ 고유 효과: ${escapeHTML(item.uniqueEffect)}</span></div>`;
    }
    function getItemDefenseView(target) {
        let base = { armor: 0, evasion: 0, energyShield: 0 };
        let flat = { armor: 0, evasion: 0, energyShield: 0 };
        let pct = { armor: 0, evasion: 0, energyShield: 0 };
        (target.baseStats || []).forEach(stat => { if (base[stat.id] !== undefined) base[stat.id] += Number(stat.val || 0); });
        let explicitForDefense = (target.stats || []).slice();
        if (target.chaosInfusion) explicitForDefense.push(target.chaosInfusion);
        explicitForDefense.forEach(stat => {
            if (flat[stat.id] !== undefined) flat[stat.id] += Number(stat.val || 0);
            if (stat.id === 'armorPct') pct.armor += Number(stat.val || 0);
            if (stat.id === 'evasionPct') pct.evasion += Number(stat.val || 0);
            if (stat.id === 'energyShieldPct') pct.energyShield += Number(stat.val || 0);
        });
        return {
            armor: Math.floor((base.armor + flat.armor) * (1 + pct.armor / 100)),
            evasion: Math.floor((base.evasion + flat.evasion) * (1 + pct.evasion / 100)),
            energyShield: Math.floor((base.energyShield + flat.energyShield) * (1 + pct.energyShield / 100)),
            base: base
        };
    }
    let defenseView = getItemDefenseView(item);
    if ((item.baseStats || []).length > 0) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#f1c40f;">베이스 옵션</div>`;
        function getBaseRollRange(stat) {
            let cur = Number(stat.val || 0);
            let min = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : Number((cur * 0.8).toFixed(2));
            let max = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number((cur * 1.2).toFixed(2));
            if (max < min) { let t = min; min = max; max = t; }
            return { min, max };
        }
        item.baseStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            if (statKey === 'armor' || statKey === 'evasion' || statKey === 'energyShield') return;
            let cur = Number(stat.val || 0);
            let { min, max } = getBaseRollRange(stat);
            let label = stat.statName || getStatName(statKey) || statKey;
            html += `<div class="tooltip-line"><span style="color:${resolveItemStatTone(statKey)};">${label} +${formatValue(statKey, cur)}</span> <span style="color:#888;">(${formatValue(statKey, min)}~${formatValue(statKey, max)})</span></div>`;
        });
        ['armor','evasion','energyShield'].forEach(id => {
            let label = getStatName(id);
            let finalVal = defenseView[id];
            let baseVal = defenseView.base[id];
            if (finalVal <= 0 && baseVal <= 0) return;
            let src = (item.baseStats || []).find(stat => stat && stat.id === id);
            let rangeText = '';
            if (src) {
                let { min, max } = getBaseRollRange(src);
                rangeText = ` <span style="color:#888;">(${formatValue(id, min)}~${formatValue(id, max)})</span>`;
            }
            if (Math.floor(finalVal) === Math.floor(baseVal)) {
                html += `<div class="tooltip-line">${label}: <span style="color:${resolveItemStatTone(id)};">${Math.floor(baseVal)}</span>${rangeText}</div>`;
            } else {
                html += `<div class="tooltip-line">${label}: <span style="color:${resolveItemStatTone(id)};">${Math.floor(finalVal)}</span> <span style="color:#9fb4d1;">(${Math.floor(baseVal)})</span>${rangeText}</div>`;
            }
        });
    }
    let explicitStats = (item.stats || []).slice();
    if (item.chaosInfusion) explicitStats.push({ ...item.chaosInfusion, statName: `[주입] ${item.chaosInfusion.statName || getStatName(item.chaosInfusion.id)}` });
    if (explicitStats.length > 0) {
        function getItemTooltipGroupOrder(statId) {
            let key = String(statId || '').toLowerCase();
            if (['energyshield', 'energyshieldpct', 'energyshieldregen'].includes(key) || key.includes('energyshield') || key === 'es') return 1;
            if (['armor', 'armorpct', 'dr'].includes(key) || key.includes('armor')) return 2;
            if (['evasion', 'evasionpct'].includes(key) || key.includes('evasion')) return 3;
            if (['flathp', 'pcthp', 'regen', 'regenflat'].includes(key) || key.includes('hp') || key.includes('life')) return 4;
            if (['resf', 'resc', 'resl', 'resall', 'reschaos'].includes(key) || key.includes('res')) return 5;
            if (['firepctdmg', 'coldpctdmg', 'lightpctdmg', 'chaospctdmg', 'dotpctdmg', 'pctdmg'].includes(key) || key.includes('dmg') || key.includes('dot')) return 6;
            if (['crit', 'critdmg'].includes(key) || key.includes('crit')) return 7;
            if (['aspd', 'move'].includes(key) || key.includes('speed') || key.includes('move')) return 8;
            return 99;
        }
        explicitStats.sort((a, b) => {
            let aKey = a && (a.id || a.stat);
            let bKey = b && (b.id || b.stat);
            let g = getItemTooltipGroupOrder(aKey) - getItemTooltipGroupOrder(bKey);
            if (g !== 0) return g;
            return String(aKey || '').localeCompare(String(bKey || ''));
        });
        html += `<div class="tooltip-line" style="margin-top:6px; color:#3498db;">추가 옵션 (${explicitStats.length}/6)</div>`;
        explicitStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            let tierText = stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let rangeText = stat.valMin !== undefined && stat.valMax !== undefined ? ` <span style="color:#888;">(${formatValue(statKey, stat.valMin)}~${formatValue(statKey, stat.valMax)})</span>${tierText}` : tierText;
            let label = stat.statName || getStatName(statKey) || statKey;
            html += `<div class="tooltip-line"><span style="color:${resolveItemStatTone(statKey)};">${label} +${formatValue(statKey, stat.val)}</span>${rangeText}</div>`;
        });
    } else {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#7f8c8d;">노멀 아이템: 추가 옵션 없음</div>`;
    }
    if (item.encroached) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#b084ff;">잠식 특수 옵션</div>`;
        if (item.encroached.liberated && item.encroached.chosen) {
            let st = item.encroached.chosen;
            html += `<div class="tooltip-line" style="color:#d7b8ff;">[잠식] ${st.statName || getStatName(st.id)} +${formatValue(st.id, st.val)} ${getTierBadgeHtml(st.tier || 10, 'T')}</div>`;
        } else {
            html += `<div class="tooltip-line" style="color:#8d7bb3;">해방 전에는 효과 없음 · 모든 제작으로도 변하지 않음</div>`;
        }
    }

    if (!isEquip) {
        let compareSlots = getEquipCandidateSlots(item).filter(slotKey => !!game.equipment[slotKey]);
        if (compareSlots.length === 0 && item.slot !== '반지') compareSlots = getEquipCandidateSlots(item);
        compareSlots.forEach((targetSlot, idx) => {
            let before = getPlayerStats();
            let backup = game.equipment[targetSlot];
            game.equipment[targetSlot] = item;
            let after = getPlayerStats();
            game.equipment[targetSlot] = backup;
            let changedLines = Object.keys(COMPARE_STAT_META).map(key => {
                let diff = (after[key] || 0) - (before[key] || 0);
                if (Math.abs(diff) < 0.001) return null;
                let meta = COMPARE_STAT_META[key];
                let color = diff > 0 ? '#2ecc71' : '#e74c3c';
                let sign = diff > 0 ? '▲' : '▼';
                return `<div class="tooltip-line"><span style="color:${color}">${sign}</span> ${meta.label}: <span style="color:${color}">${meta.format(Math.abs(diff))}</span></div>`;
            }).filter(Boolean);
            if (changedLines.length > 0) {
                let label = getDualSlotDisplayLabel(targetSlot);
                html += `<div class="tooltip-line" style="margin-top:8px; border-top:1px dashed #555; padding-top:8px; color:#aaa;">${label} 기준 착용 시 변화</div>`;
                html += changedLines.join('');
            } else if (isDualSlotItem(item.slot)) {
                let label = getDualSlotDisplayLabel(targetSlot);
                html += `<div class="tooltip-line" style="margin-top:${idx === 0 ? 8 : 4}px; color:#7f8c8d;">${label} 교체 시 변화 없음</div>`;
            }
        });
    }

    tt.innerHTML = html;
    tt.style.display = 'block';
    positionTooltipElement(tt, event.clientX, event.clientY);
    setActiveTooltip('item-tooltip-box');
}
function hideItemTooltip() {
    activeItemTooltipToken = null;
    clearActiveTooltip('item-tooltip-box');
    document.getElementById('item-tooltip-box').style.display = 'none';
}

function validateItemTooltipAnchor() {
    if (!activeItemTooltipToken) return;
    let [scope, key, idText] = String(activeItemTooltipToken).split(':');
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

let lastBattlefieldCanvasSize = { width: 0, height: 0, dpr: 1 };
function resizeBattlefieldCanvas() {
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas || canvas.offsetParent === null) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;
    const cssWidth = Math.max(1, Math.round(rect.width || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || 1));
    const dpr = clampNumber(window.devicePixelRatio || 1, 1, 2);
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.dataset.renderScale = String(dpr);
    lastBattlefieldCanvasSize = { width: cssWidth, height: cssHeight, dpr };
}

function getBattleLayout(enemies, width, height) {
    let list = enemies || [];
    if (list.length === 0) return [];
    let columnAnchors = [0.54, 0.64, 0.74, 0.84, 0.92];
    let rowAnchors = [0.48, 0.58, 0.69, 0.79, 0.86, 0.92];
    return list.map(enemy => {
        let slot = Number.isFinite(enemy.battleSlot) ? enemy.battleSlot : 0;
        let col = clampNumber(slot % 5, 0, columnAnchors.length - 1);
        let row = Math.max(0, Math.floor(slot / 5));
        let rowAnchor = row < rowAnchors.length ? rowAnchors[row] : (rowAnchors[rowAnchors.length - 1] + ((row - rowAnchors.length + 1) * 0.04));
        return {
            enemy: enemy,
            x: width * columnAnchors[col] + (((enemy.variantSeed || enemy.id) * 17) % 5 - 2),
            y: height * Math.min(0.94, rowAnchor) + (((enemy.variantSeed || enemy.id) * 29) % 5 - 2)
        };
    }).sort((a, b) => a.y - b.y || ((a.enemy.battleSlot || 0) - (b.enemy.battleSlot || 0)));
}

function drawPixelShadow(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function getBattleZoneTheme(zone) {
    zone = zone || getZone(game.currentZoneId);
    let theme = {
        skyTop: '#17324c',
        skyBottom: '#0c1b28',
        floorA: '#245a3b',
        floorB: '#2d6b48',
        pathA: '#355d46',
        pathB: '#3f6c54',
        propA: '#7cb86f',
        propB: '#4e8f52',
        accent: '#d7f0a1',
        ruin: '#6f876b',
        water: '#183b57',
        mist: 'rgba(173,223,255,0.08)'
    };
    if (zone.ele === 'fire') {
        theme = { skyTop: '#4a2419', skyBottom: '#1d1010', floorA: '#5e3224', floorB: '#70392a', pathA: '#744436', pathB: '#8a5540', propA: '#f59e55', propB: '#9b3f2d', accent: '#ffcf72', ruin: '#7f5a47', water: '#4b170f', mist: 'rgba(255,149,91,0.08)' };
    } else if (zone.ele === 'cold') {
        theme = { skyTop: '#18354d', skyBottom: '#0f1828', floorA: '#506b86', floorB: '#64839c', pathA: '#7897ae', pathB: '#88a7bc', propA: '#d7f7ff', propB: '#9cd7ea', accent: '#effcff', ruin: '#8d9eb1', water: '#244c6b', mist: 'rgba(219,250,255,0.12)' };
    } else if (zone.ele === 'light') {
        theme = { skyTop: '#25344f', skyBottom: '#121626', floorA: '#61613e', floorB: '#706d46', pathA: '#7f7a4b', pathB: '#978f57', propA: '#ffe27d', propB: '#d7bf58', accent: '#fff4a8', ruin: '#918764', water: '#3a4465', mist: 'rgba(255,235,158,0.09)' };
    } else if (zone.ele === 'chaos') {
        theme = { skyTop: '#25173b', skyBottom: '#0f0a1a', floorA: '#35244d', floorB: '#473065', pathA: '#563776', pathB: '#654589', propA: '#b98cff', propB: '#7b59be', accent: '#f2d1ff', ruin: '#6d5b84', water: '#271f3a', mist: 'rgba(193,140,255,0.08)' };
    }
    if (zone.type === 'trial') {
        theme.pathA = '#7f6840';
        theme.pathB = '#9f8251';
        theme.accent = '#ffe2a4';
        theme.ruin = '#9a7d54';
    } else if (zone.type === 'abyss') {
        theme.skyTop = '#111421';
        theme.skyBottom = '#07080d';
        theme.floorA = '#1c2431';
        theme.floorB = '#252f3d';
        theme.pathA = '#30394a';
        theme.pathB = '#3b4660';
        theme.mist = 'rgba(126,162,255,0.07)';
    } else if (zone.type === 'meteor') {
        theme.skyTop = '#1a1026';
        theme.skyBottom = '#07050c';
        theme.floorA = '#241736';
        theme.floorB = '#332248';
        theme.pathA = '#4a2f68';
        theme.pathB = '#5c3a78';
        theme.mist = 'rgba(189,120,255,0.1)';
    }
    return theme;
}

function getBattleSkillVisual(skillName, skillData) {
    skillData = skillData || SKILL_DB[skillName] || SKILL_DB['기본 공격'];
    let tags = (skillData.tags || []).map(tag => String(tag).toLowerCase());
    let ele = String(skillData.ele || '').toLowerCase();
    let group = 'physical';
    let primary = '#d7dde6';
    let secondary = '#ffffff';
    let aura = null;
    if (tags.includes('chaos') || ele === 'chaos') {
        group = 'chaos';
        primary = '#ba83ff';
        secondary = '#f2ddff';
        aura = 'rgba(176,118,255,0.16)';
    } else if (tags.includes('cold') || ele === 'cold') {
        group = 'cold';
        primary = '#8de7ff';
        secondary = '#eefbff';
        aura = 'rgba(133,235,255,0.14)';
    } else if (tags.includes('lightning') || tags.includes('light') || ele === 'light' || ele === 'lightning') {
        group = 'lightning';
        primary = '#ffd84f';
        secondary = '#fff7cc';
        aura = 'rgba(255,216,79,0.14)';
    } else if (tags.includes('fire') || ele === 'fire') {
        group = 'fire';
        primary = '#ff8a4a';
        secondary = '#ffe3b0';
        aura = 'rgba(255,126,74,0.14)';
    } else if (tags.includes('physical') && tags.includes('slam')) {
        group = 'physical_slam';
        primary = '#c7a27b';
        secondary = '#f3e1cf';
    }
    return {
        pose: tags.includes('projectile') ? 'bow' : 'sword',
        group: group,
        effect: group,
        primary: primary,
        secondary: secondary,
        aura: aura,
        isSlam: group === 'physical_slam'
    };
}

function getBattleEffectFrame(effectName, phase) {
    if (!battleAssets.ready || !battleAssets.atlas || !battleAssets.atlas.effects) return null;
    let effectAtlas = battleAssets.atlas.effects;
    let frames = effectAtlas.frames;
    let animations = effectAtlas.animations || {};
    function pickEffectClipFrame(name) {
        let clip = (animations[name] || []).filter(Boolean);
        if (clip.length === 0) return null;
        return phase === 'hit' ? clip[clip.length - 1] : clip[0];
    }
    if (effectName === 'flurry') return pickEffectClipFrame('sword_slash_vfx') || null;
    if (effectName === 'flameSlash') return pickEffectClipFrame('fireball_vfx') || (phase === 'hit' ? frames.fireball : frames.flurry);
    if (effectName === 'iceLance') return pickEffectClipFrame('ice_projectile_vfx') || frames.iceLance;
    if (effectName === 'chain' || effectName === 'storm') return pickEffectClipFrame('lightning_vfx') || (phase === 'hit' ? frames.lightningBurst : frames.chain);
    if (effectName === 'poisonDart') return pickEffectClipFrame('dark_magic_projectile_vfx') || frames.poison;
    if (effectName === 'nova') return null;
    if (effectName === 'lightSpear') return pickEffectClipFrame('lightning_vfx') || (phase === 'hit' ? frames.lightningBurst : frames.chain);
    if (effectName === 'quake' || effectName === 'slam') return pickEffectClipFrame('impact_vfx') || frames.quake;
    if (effectName === 'magma') return pickEffectClipFrame('fireball_vfx') || (phase === 'hit' ? frames.eruption : frames.magma);
    if (effectName === 'arrow' || effectName === 'projectile') return null;
    if (effectName === 'voidSlash' || effectName === 'shadowSlash') return pickEffectClipFrame('dark_magic_projectile_vfx') || (phase === 'hit' ? frames.voidOrb : frames.voidSlash);
    if (effectName === 'drain') return pickEffectClipFrame('impact_vfx') || (phase === 'hit' ? frames.drain : frames.crimsonSlash);
    if (effectName === 'whirl') return pickEffectClipFrame('sword_slash_vfx') || null;
    return pickEffectClipFrame('sword_slash_vfx') || null;
}

function getBattleGroundFrames(zone) {
    if (!battleAssets.ready || !battleAssets.atlas || !battleAssets.atlas.tiles) return null;
    let frames = battleAssets.atlas.tiles.frames;
    if (zone.type === 'trial') return { floor: frames.stone, path: frames.temple, pathAlt: frames.templeAlt, prop: frames.templeAlt };
    if (zone.type === 'abyss') return { floor: frames.abyss, path: frames.ruin, pathAlt: frames.abyss, prop: frames.roots };
    if (zone.ele === 'fire') return { floor: frames.dirt, path: frames.dirtWarm, pathAlt: frames.lava, prop: frames.dirtWarm };
    if (zone.ele === 'cold') return { floor: frames.frost, path: frames.stone, pathAlt: frames.frost, prop: frames.stone };
    if (zone.ele === 'light') return { floor: frames.stone, path: frames.temple, pathAlt: frames.templeAlt, prop: frames.stone };
    if (zone.ele === 'chaos') return { floor: frames.abyss, path: frames.roots, pathAlt: frames.ruin, prop: frames.abyss };
    return { floor: frames.grass, path: frames.stone, pathAlt: frames.moss, prop: frames.grassDeep };
}

function getBattleBackdropKeyForZone(zone) {
    if (!zone) return 'bgAct1';
    if (zone.type === 'act') {
        let actNo = Math.max(1, Math.min(10, (Number(zone.id) || 0) + 1));
        return `bgAct${actNo}`;
    }
    if (zone.type === 'labyrinth') return 'bgAct5';
    if (zone.type === 'abyss' || zone.type === 'seasonBoss') return 'bgAct10';
    if (zone.ele === 'fire') return 'bgAct2';
    if (zone.ele === 'cold') return 'bgAct3';
    if (zone.ele === 'light') return 'bgAct4';
    if (zone.ele === 'chaos') return 'bgAct9';
    return 'bgAct1';
}

function getBattleBackdropForZone(zone) {
    let list = (battleAssets.backdrops || {});
    let key = getBattleBackdropKeyForZone(zone);
    let fallbackLegacy = { bgAct1:'backdropAct1', bgAct2:'backdropAct2_6', bgAct3:'backdropAct3_7', bgAct4:'backdropAct4_8', bgAct5:'backdropAct5', bgAct6:'backdropAct2_6', bgAct7:'backdropAct3_7', bgAct8:'backdropAct4_8', bgAct9:'backdropAct9_10', bgAct10:'backdropAct9_10' };
    let image = list[key] || list[fallbackLegacy[key]] || list.backdropAct1 || Object.values(list)[0];
    if (!image) return null;
    let zoneSeed = Number.isFinite(zone && zone.id) ? zone.id : 0;
    if (!zoneSeed && zone && zone.name) zoneSeed = zone.name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    let variant = BATTLE_BACKDROP_VARIANTS[Math.abs(zoneSeed) % BATTLE_BACKDROP_VARIANTS.length] || BATTLE_BACKDROP_VARIANTS[0];
    return { image: image, variant: variant };
}

function drawBattleBackdrop(ctx, width, height, theme, now, zone) {
    let backdropEntry = getBattleBackdropForZone(zone);
    if (backdropEntry && backdropEntry.image) {
        let backdropImage = backdropEntry.image;
        let variant = backdropEntry.variant || BATTLE_BACKDROP_VARIANTS[0];
        let srcW = backdropImage.width || width;
        let srcH = backdropImage.height || height;
        let scale = Math.max(width / srcW, height / srcH);
        let drawW = Math.ceil(srcW * scale);
        let drawH = Math.ceil(srcH * scale);
        let dx = Math.floor((width - drawW) / 2);
        let dy = Math.floor((height - drawH) / 2);
        ctx.drawImage(backdropImage, dx, dy, drawW, drawH);
        return;
    }

    let sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    let horizon = Math.floor(height * 0.2);
    let fieldTop = horizon;
    let pathTop = Math.floor(height * 0.6);
    let pathBottom = Math.floor(height * 0.84);
    let lowerBand = Math.floor(height * 0.92);

    ctx.fillStyle = theme.water;
    ctx.fillRect(0, 0, width, horizon);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, horizon + 10, width, 5);
    ctx.fillRect(0, horizon + 48, width, 4);

    ctx.fillStyle = theme.floorA;
    ctx.fillRect(0, fieldTop, width, pathTop - fieldTop);
    ctx.fillStyle = theme.pathA;
    ctx.fillRect(0, pathTop, width, pathBottom - pathTop);
    ctx.fillStyle = theme.floorB;
    ctx.fillRect(0, pathBottom, width, lowerBand - pathBottom);
    ctx.fillStyle = '#0c1621';
    ctx.fillRect(0, lowerBand, width, height - lowerBand);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, pathTop - 1);
    ctx.lineTo(width, pathTop - 1);
    ctx.moveTo(0, pathBottom);
    ctx.lineTo(width, pathBottom);
    ctx.stroke();

    ctx.save();
    let vignette = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.12, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function getLocalBattleHeroVisualTuning() {
    const defaultTuning = {
        baseHeight: 55.2,
        minHeight: 50,
        maxHeight: 55.2,
        downShrink: 6.5,
        maxScaleBoost: 1,
        shadowWidth: 10,
        shadowHeight: 4,
        shadowAlpha: 0.16,
        offsetY: 0
    };
    if (typeof isLocalRuntimeHost !== 'function' || !isLocalRuntimeHost()) return defaultTuning;
    const localTuningByHero = {
        hero1: { baseHeight: 68, minHeight: 60, maxHeight: 84, downShrink: 8.2, maxScaleBoost: 1.24, shadowWidth: 12.5, shadowHeight: 5, shadowAlpha: 0.18, offsetY: 2 },
        hero2: { baseHeight: 66, minHeight: 58, maxHeight: 81, downShrink: 8, maxScaleBoost: 1.23, shadowWidth: 12.5, shadowHeight: 5, shadowAlpha: 0.18, offsetY: 2 },
        hero3: { baseHeight: 66, minHeight: 58, maxHeight: 81, downShrink: 8, maxScaleBoost: 1.23, shadowWidth: 12.5, shadowHeight: 5, shadowAlpha: 0.18, offsetY: 2 },
        hero4: { baseHeight: 67, minHeight: 59, maxHeight: 82, downShrink: 8.1, maxScaleBoost: 1.24, shadowWidth: 13, shadowHeight: 5.2, shadowAlpha: 0.18, offsetY: 2 }
    };
    return { ...defaultTuning, ...(localTuningByHero[game.selectedHeroId] || localTuningByHero.hero1) };
}

function drawPlayerSprite(ctx, x, y, scale, flash, swingPower, skillVisual, now, motionState) {
    let activeSkillPlayback = getSkillPlaybackState(now);
    if (battleAssets.images.hero) {
        motionState = motionState || {};
        let motionName = 'idle';
        let frameIndex = HERO_MOTIONS.idle[0];
        if (activeSkillPlayback) {
            motionName = activeSkillPlayback.skillCfg.motion;
            frameIndex = activeSkillPlayback.frameIndex;
        } else {
            let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : 0, 0, 1);
            let attackBlend = clampNumber(Number.isFinite(motionState.attackBlend) ? motionState.attackBlend : 0, 0, 1);
            let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
            if (hurtBlend > 0.55) {
                motionName = 'idle';
            } else if (attackBlend > 0.2 || Math.abs(swingPower) > 0.16) {
                let effect = skillVisual && skillVisual.effect ? skillVisual.effect : 'slash';
                if (effect === 'arrow' || effect === 'projectile') motionName = 'bow';
                else if (effect === 'poisonDart' || effect === 'lightSpear') motionName = 'throw';
                else if (effect === 'chain' || effect === 'storm' || effect === 'iceLance' || effect === 'nova') motionName = 'cast';
                else motionName = 'slash';
            } else if (advanceBlend > 0.08) {
                motionName = advanceBlend > 0.6 ? 'run' : 'walk';
            } else {
                motionName = 'idle';
            }
            let frames = HERO_MOTIONS[motionName] || HERO_MOTIONS.idle;
            const _motionMs = { walk: 285, run: 190, slash: 160, throw: 170, cast: 180, bow: 175, hit: 200, idle: 320 };
            let _frameMs = _motionMs[motionName] || 220;
            if (motionName === 'walk' || motionName === 'run') {
                let moveSpeed = Number(getPlayerStats().moveSpeed) || 100;
                let moveRatio = clampNumber(moveSpeed / 100, 0.6, 3.2);
                _frameMs = clampNumber(_frameMs / moveRatio, 62, 460);
            }
            let localFrame = Math.floor((now / _frameMs)) % frames.length;
            frameIndex = frames[localFrame];
        }
        let heroFrame = getSpriteFrameRectByIndex(battleAssets.images.hero, frameIndex, HERO_SPRITE_CONFIG);
        if (heroFrame) {
            let frameMeta = getHeroFrameMeta(frameIndex);
            let metrics = getHeroDrawMetrics(x, y, heroFrame, frameMeta);
            drawPixelShadow(ctx, x, y + 15, 11, 4, 0.18);
            ctx.save();
            ctx.filter = 'brightness(1.15) contrast(1.08) saturate(1.05)';
            ctx.drawImage(
                battleAssets.images.hero,
                heroFrame.sx, heroFrame.sy, heroFrame.sw, heroFrame.sh,
                metrics.dx, metrics.dy, metrics.drawW, metrics.drawH
            );
            ctx.restore();
            if (DEBUG_BATTLE_ANCHORS) {
                ctx.save();
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 1;
                ctx.strokeRect(metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
                let handX = metrics.dx + ((frameMeta.hand.x / 300) * heroFrame.sw) * metrics.scaleX;
                let handY = metrics.dy + ((frameMeta.hand.y / 300) * heroFrame.sh) * metrics.scaleY;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(handX, handY, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }
    }
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.hero) {
        motionState = motionState || {};
        let frames = battleAssets.atlas.hero.frames;
        let bodyClips = frames.characterAnimations || {};
        let clipLoop = frames.clipLoop || {};
        let activeEnemies = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
        let isAdvancing = activeEnemies === 0 && game.moveTimer <= 0 && game.runProgress < 100;
        let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : (isAdvancing ? 1 : 0), 0, 1);
        let attackBlend = clampNumber(Number.isFinite(motionState.attackBlend) ? motionState.attackBlend : 0, 0, 1);
        let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
        let downFx = battleFx.filter(fx => fx.type === 'playerDown' && now - fx.start <= fx.duration).slice(-1)[0];
        let downPhase = downFx ? clampNumber((now - downFx.start) / downFx.duration, 0, 0.999) : null;
        let downBlend = clampNumber(Number.isFinite(motionState.downBlend) ? motionState.downBlend : (downPhase !== null ? 1 : 0), 0, 1);
        let isAttacking = !isAdvancing && (attackBlend > 0.12 || Math.abs(swingPower) > 0.14);
        let idleCycle = Array.isArray(bodyClips.idle) && bodyClips.idle.length > 0 ? bodyClips.idle : (Array.isArray(frames.idle) && frames.idle.length > 0 ? frames.idle : [frames.sideIdle, frames.frontIdle, frames.frontGuard].filter(Boolean));
        let walkCycle = Array.isArray(bodyClips.walk_or_run) && bodyClips.walk_or_run.length > 0 ? bodyClips.walk_or_run : (Array.isArray(frames.walk) && frames.walk.length > 0 ? frames.walk : [frames.sideWalk, frames.sideIdle, frames.frontGuard].filter(Boolean));
        let runCycle = walkCycle;
        let hurtCycle = Array.isArray(bodyClips.hurt) && bodyClips.hurt.length > 0 ? bodyClips.hurt : (Array.isArray(frames.hurt) && frames.hurt.length > 0 ? frames.hurt : [frames.frontGuard, frames.sideIdle].filter(Boolean));
        let downCycle = Array.isArray(bodyClips.down_or_knockdown) && bodyClips.down_or_knockdown.length > 0 ? bodyClips.down_or_knockdown : (Array.isArray(frames.down) && frames.down.length > 0 ? frames.down : hurtCycle);
        function pickCycle(list, speed, phaseOffset) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let baseSpeed = speed || 110;
            let sequenceSpeedScale = sequence.length <= 3 ? 1.32 : (sequence.length <= 5 ? 1.14 : 1);
            let adjustedSpeed = baseSpeed * sequenceSpeedScale;
            let phase = ((now / adjustedSpeed) + (phaseOffset || 0)) % sequence.length;
            return sequence[Math.floor(phase)];
        }
        function pickProgressFrame(list, phase) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let idx = Math.floor(clampNumber(phase, 0, 0.999) * sequence.length);
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        function pickSkillAttackCycle() {
            let activeSkillName = game && typeof game.activeSkill === 'string' ? game.activeSkill : '';
            let activeSkillData = (SKILL_DB && activeSkillName && SKILL_DB[activeSkillName]) ? SKILL_DB[activeSkillName] : null;
            let activeTags = activeSkillData && Array.isArray(activeSkillData.tags)
                ? activeSkillData.tags.map(tag => String(tag).toLowerCase())
                : [];
            let isSlamGem = activeTags.includes('slam');
            if (isSlamGem && Array.isArray(frames.greatswordCombo) && frames.greatswordCombo.length > 0) {
                return frames.greatswordCombo;
            }
            if (!isSlamGem && Array.isArray(frames.quakeCombo) && frames.quakeCombo.length > 0) {
                return frames.quakeCombo;
            }
            if (Array.isArray(bodyClips.sword_attack_body) && bodyClips.sword_attack_body.length > 0) {
                return bodyClips.sword_attack_body;
            }
            return frames.swordCombo || frames.greatswordCombo || frames.quakeCombo || frames.castCombo || frames.bowCombo || frames.projectileCombo || frames.whirlCombo;
        }
        function pickAttackFrame(list) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let attackProgress = Number.isFinite(motionState.attackProgress) ? motionState.attackProgress : Math.abs(swingPower);
            let phase = clampNumber(attackProgress, 0, 0.999);
            let idx = Math.floor(phase * sequence.length);
            if (clipLoop.sword_attack_body === true) {
                let aspd = Math.max(0.1, Number(getPlayerStats().aspd) || 1);
                let loopFrameMs = clampNumber(120 / aspd, 38, 170);
                idx = Math.floor((now / loopFrameMs) % sequence.length);
            }
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        let idleFrame = pickCycle(idleCycle, 920, 0);
        let moveStat = Math.max(70, Number(getPlayerStats().move) || 100);
        let moveRatio = clampNumber(moveStat / 100, 0.85, 2.25);
        const WALK_ANIM_SPEED_MULT = 2;
        let moveCycleSpeed = clampNumber((1040 / moveRatio) / WALK_ANIM_SPEED_MULT, 310, 490);
        let walkFrame = pickCycle(walkCycle, moveCycleSpeed, 0);
        let movingFrame = pickCycle(runCycle, moveCycleSpeed, 0) || walkFrame;
        let frame = downPhase !== null || downBlend > 0.24
            ? pickProgressFrame(downCycle, downPhase !== null ? downPhase : clampNumber(downBlend * 0.999, 0, 0.999))
            : (advanceBlend > 0.08 ? movingFrame : idleFrame);
        if (downPhase === null && hurtBlend > 0.8 && !isAttacking && hurtCycle.length > 0) frame = hurtCycle[0];
        if (downPhase === null && isAttacking) {
            frame = pickAttackFrame(pickSkillAttackCycle());
        }
        const _walkBobPeriod = Math.max(80, moveCycleSpeed / Math.max(1, (walkCycle.length || 4)) / 2);
        let stepOffset = (downPhase === null && advanceBlend > 0.08)
            ? Math.sin(now / _walkBobPeriod) * lerpNumber(0.08, 0.24, advanceBlend)
            : 0;
        let localHeroTuning = getLocalBattleHeroVisualTuning();
        let heroScaleBoost = clampNumber((Number(scale) || 1) / 1.85, 1, localHeroTuning.maxScaleBoost);
        let normalizedHeroSize = (localHeroTuning.baseHeight * heroScaleBoost) - downBlend * localHeroTuning.downShrink;
        normalizedHeroSize = clampNumber(normalizedHeroSize, localHeroTuning.minHeight, localHeroTuning.maxHeight);
        drawPixelShadow(ctx, x, y + 15, localHeroTuning.shadowWidth * heroScaleBoost, localHeroTuning.shadowHeight * heroScaleBoost, localHeroTuning.shadowAlpha);
        let drawOptions = {
            alpha: downPhase !== null ? 0.98 : 1,
            smoothing: 'high',
            outlineColor: '#ffffff',
            outlineAlpha: 0.86,
            outlineThickness: 1
        };
        let attackXOffset = (downPhase === null && isAttacking && game.selectedHeroId === 'hero3') ? 6 : 0;
        drawBattleSprite(ctx, battleAssets.atlas.hero.image, frame, x + stepOffset + attackXOffset, y + 7 + localHeroTuning.offsetY - advanceBlend * 0.18 + hurtBlend * 0.08 + downBlend * 2.2, normalizedHeroSize, drawOptions);
        if (flash && downPhase === null) {
            ctx.save();
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = '#dff6ff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - 11, y - 10);
            ctx.lineTo(x - 3, y - 16);
            ctx.moveTo(x + 2, y - 14);
            ctx.lineTo(x + 10, y - 19);
            ctx.moveTo(x - 9, y - 1);
            ctx.lineTo(x - 2, y - 7);
            ctx.stroke();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#dff6ff';
            ctx.fillRect(Math.round(x - 4), Math.round(y - 15), 8, 2);
            ctx.restore();
        }
        return;
    }
    let s = scale;
    let bob = Math.sin(now / 180) * 0.7 * s;
    let tunic = flash ? '#9fe5ff' : '#4f7cff';
    let trim = flash ? '#fefefe' : '#dff3ff';
    let shield = '#f2d27c';
    drawPixelShadow(ctx, x, y + 18 * s, 13 * s, 5 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.fillStyle = '#2f4571';
    ctx.fillRect(-4 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillRect(1 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillStyle = tunic;
    ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
    ctx.fillStyle = '#28456b';
    ctx.fillRect(-3 * s, 2 * s, 6 * s, 4 * s);
    ctx.fillStyle = trim;
    ctx.fillRect(-4 * s, -2 * s, 8 * s, 2 * s);
    ctx.fillStyle = '#f0c79a';
    ctx.fillRect(-4 * s, -11 * s, 8 * s, 7 * s);
    ctx.fillStyle = '#7c4e2e';
    ctx.fillRect(-5 * s, -13 * s, 10 * s, 4 * s);
    ctx.fillStyle = '#b8d2ff';
    ctx.fillRect(-8 * s, -1 * s, 3 * s, 5 * s);
    ctx.fillStyle = shield;
    ctx.fillRect(-11 * s, -1 * s, 3 * s, 6 * s);
    ctx.fillStyle = '#cfa44f';
    ctx.fillRect(-10 * s, 1 * s, 1 * s, 2 * s);

    let handOffset = 4 * s + swingPower * 4 * s;
    ctx.fillStyle = '#f0c79a';
    ctx.fillRect(5 * s, -1 * s, 3 * s, 5 * s);
    if (skillVisual.pose === 'hammer') {
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(8 * s, -1 * s, 8 * s + handOffset, 2 * s);
        ctx.fillStyle = '#d3d8e5';
        ctx.fillRect(14 * s + handOffset, -4 * s, 6 * s, 8 * s);
    } else if (skillVisual.pose === 'spear') {
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(8 * s, 0, 12 * s + handOffset, 1.5 * s);
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(19 * s + handOffset, -2 * s, 6 * s, 5 * s);
    } else if (skillVisual.pose === 'staff') {
        ctx.fillStyle = '#846038';
        ctx.fillRect(8 * s, -3 * s, 2 * s, 11 * s);
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(8 * s, -7 * s, 4 * s, 4 * s);
    } else if (skillVisual.pose === 'bow') {
        ctx.strokeStyle = '#d1b37a';
        ctx.lineWidth = Math.max(2, 1.5 * s);
        ctx.beginPath();
        ctx.moveTo(11 * s, -5 * s);
        ctx.quadraticCurveTo(18 * s + handOffset, 0, 11 * s, 5 * s);
        ctx.stroke();
        ctx.strokeStyle = '#f1ede7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(11 * s, -5 * s);
        ctx.lineTo(11 * s, 5 * s);
        ctx.stroke();
    } else if (skillVisual.pose === 'throw') {
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(11 * s + handOffset, -2 * s, 5 * s, 3 * s);
    } else if (skillVisual.pose === 'dual' || skillVisual.pose === 'dagger') {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(9 * s, -4 * s, 7 * s + handOffset, 2 * s);
        ctx.fillRect(7 * s, 3 * s, 5 * s + handOffset * 0.5, 2 * s);
    } else {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(9 * s, -3 * s, 9 * s + handOffset, 2 * s);
        ctx.fillStyle = '#e2b25c';
        ctx.fillRect(7 * s, -3 * s, 2 * s, 3 * s);
    }
    ctx.restore();
}

function pickBattleEnemyVariant(enemy, enemyAtlas) {
    if (!enemyAtlas) return null;
    let pools = enemyAtlas.variants || {};
    let frames = enemyAtlas.frames || {};
    let baseImage = enemyAtlas.image;
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let normalPool = (pools.normal || []).slice();
    let elitePool = (pools.elite || []).slice();
    let bossPool = (pools.boss || []).slice();
    if (normalPool.length === 0) {
        normalPool = [
            { image: baseImage, frame: frames.slime },
            { image: baseImage, frame: frames.bandit },
            { image: baseImage, frame: frames.shadow },
            { image: baseImage, frame: frames.wraith }
        ].filter(entry => entry.frame);
    }
    if (elitePool.length === 0) {
        elitePool = [
            { image: baseImage, frame: frames.knight },
            { image: baseImage, frame: frames.skeleton },
            { image: baseImage, frame: frames.shadow },
            { image: baseImage, frame: frames.wraith }
        ].filter(entry => entry.frame);
    }
    if (bossPool.length === 0) {
        bossPool = [
            { image: baseImage, frame: frames.boss },
            { image: baseImage, frame: frames.knight },
            { image: baseImage, frame: frames.skeleton }
        ].filter(entry => entry.frame);
    }
    let pool = enemy.isBoss ? bossPool : (enemy.isElite ? elitePool : normalPool);
    if (pool.length === 0) return null;
    let elementOffset = enemy.ele === 'fire' ? 1 : (enemy.ele === 'cold' ? 2 : (enemy.ele === 'light' ? 3 : (enemy.ele === 'chaos' ? 4 : 0)));
    return pool[(variantSeed + elementOffset) % pool.length];
}

function drawEnemySprite(ctx, enemy, x, y, scale, flash, now) {
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.enemies) {
        let enemyAtlas = battleAssets.atlas.enemies;
        let variantEntry = pickBattleEnemyVariant(enemy, enemyAtlas) || {};
        let frame = variantEntry.frame || enemyAtlas.frames.bandit || enemyAtlas.frames.slime;
        let frameImage = variantEntry.image || enemyAtlas.image;
        let drawSize = enemy.isBoss ? 70 : (enemy.isElite ? 50 : 38);
        drawSize *= scale / (enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95));
        drawPixelShadow(ctx, x, y + (enemy.isBoss ? 16 : 13), enemy.isBoss ? 15 : 9, enemy.isBoss ? 5 : 4, 0.17);
        drawBattleSprite(ctx, frameImage, frame, x, y + 5, drawSize, { smoothing: 'low' });
        if (flash) {
            ctx.save();
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = '#fff3c5';
            ctx.beginPath();
            ctx.ellipse(x, y + 11, enemy.isBoss ? 20 : 13, enemy.isBoss ? 10 : 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        return;
    }
    let s = scale;
        let wobble = Math.sin((now / 170) + (enemy.variantSeed || enemy.id)) * 1.4 * s;
    let main = enemy.isBoss ? '#8b4cc7' : (enemy.isElite ? '#cc7a28' : '#c24d3f');
    let accent = enemy.isBoss ? '#e4b8ff' : (enemy.isElite ? '#ffd07b' : '#ff9c73');
    if (enemy.ele === 'cold') {
        main = enemy.isBoss ? '#6493d8' : '#5f88b6';
        accent = '#dbf7ff';
    } else if (enemy.ele === 'light') {
        main = enemy.isBoss ? '#9f8e37' : '#b6992f';
        accent = '#fff5a1';
    } else if (enemy.ele === 'chaos') {
        main = enemy.isBoss ? '#6e38a4' : '#7a49af';
        accent = '#f1cbff';
    } else if (enemy.ele === 'fire') {
        main = enemy.isBoss ? '#b2422d' : '#bd5540';
        accent = '#ffbb8e';
    }
    let variant = enemy.isBoss ? 'boss' : (enemy.isElite ? 'knight' : (enemy.id % 3 === 0 ? 'slime' : (enemy.id % 3 === 1 ? 'bat' : 'cultist')));
    drawPixelShadow(ctx, x, y + 13 * s, (enemy.isBoss ? 15 : 11) * s, 4 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + wobble));
    if (variant === 'slime') {
        ctx.fillStyle = flash ? '#fff8e2' : accent;
        ctx.fillRect(-5 * s, -5 * s, 10 * s, 8 * s);
        ctx.fillStyle = flash ? '#fffbe9' : main;
        ctx.fillRect(-7 * s, -1 * s, 14 * s, 7 * s);
        ctx.fillStyle = '#111';
        ctx.fillRect(-3 * s, -1 * s, 1.5 * s, 1.5 * s);
        ctx.fillRect(2 * s, -1 * s, 1.5 * s, 1.5 * s);
    } else if (variant === 'bat') {
        ctx.fillStyle = flash ? '#fff8d9' : main;
        ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
        ctx.fillRect(-10 * s, -6 * s, 6 * s, 3 * s);
        ctx.fillRect(4 * s, -6 * s, 6 * s, 3 * s);
        ctx.fillRect(-9 * s, -2 * s, 5 * s, 2 * s);
        ctx.fillRect(4 * s, -2 * s, 5 * s, 2 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-2 * s, -6 * s, 4 * s, 3 * s);
    } else if (variant === 'knight') {
        ctx.fillStyle = '#41444f';
        ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
        ctx.fillStyle = flash ? '#fff4cc' : main;
        ctx.fillRect(-4 * s, -2 * s, 8 * s, 9 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-3 * s, -10 * s, 6 * s, 6 * s);
        ctx.fillStyle = '#d8dce4';
        ctx.fillRect(-6 * s, -1 * s, 2 * s, 5 * s);
        ctx.fillRect(4 * s, -1 * s, 2 * s, 5 * s);
    } else if (variant === 'boss') {
        ctx.fillStyle = flash ? '#fff1c8' : main;
        ctx.fillRect(-8 * s, -6 * s, 16 * s, 12 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-6 * s, -14 * s, 12 * s, 8 * s);
        ctx.fillStyle = '#28152d';
        ctx.fillRect(-7 * s, 5 * s, 4 * s, 5 * s);
        ctx.fillRect(3 * s, 5 * s, 4 * s, 5 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-8 * s, -17 * s, 3 * s, 4 * s);
        ctx.fillRect(5 * s, -17 * s, 3 * s, 4 * s);
    } else {
        ctx.fillStyle = flash ? '#fff7d1' : main;
        ctx.fillRect(-4 * s, -5 * s, 8 * s, 10 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-3 * s, -12 * s, 6 * s, 7 * s);
        ctx.fillStyle = '#241717';
        ctx.fillRect(-3 * s, 4 * s, 2 * s, 5 * s);
        ctx.fillRect(1 * s, 4 * s, 2 * s, 5 * s);
        ctx.fillStyle = '#f8ef8f';
        ctx.fillRect(-2 * s, -9 * s, 1 * s, 1 * s);
        ctx.fillRect(1 * s, -9 * s, 1 * s, 1 * s);
    }
    ctx.restore();
}

function drawBattleZigZag(ctx, x1, y1, x2, y2, amplitude, segments) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
        let t = i / segments;
        let px = x1 + (x2 - x1) * t;
        let py = y1 + (y2 - y1) * t + (i % 2 === 0 ? amplitude : -amplitude);
        ctx.lineTo(px, py);
    }
    ctx.lineTo(x2, y2);
}

const GEM_IMPACT_THEME = {
    phys: { primary: '#f5d7a1', secondary: '#ffffff' }, fire: { primary: '#ff7a42', secondary: '#ffd36b' }, cold: { primary: '#8fd6ff', secondary: '#dff7ff' },
    light: { primary: '#f7e36a', secondary: '#fff8bf' }, chaos: { primary: '#b56bff', secondary: '#e9d2ff' }
};
window.BATTLE_EFFECT_OVERRIDES = window.BATTLE_EFFECT_OVERRIDES || {};
function getImpactThemeByElement(ele){ return (window.BATTLE_EFFECT_OVERRIDES[ele] || GEM_IMPACT_THEME[ele] || GEM_IMPACT_THEME.phys); }

function normalizeBattleElement(ele) {
    let id = String(ele || 'phys').toLowerCase();
    if (id === 'physical') return 'phys';
    if (id === 'lightning' || id === 'thunder') return 'light';
    if (id === 'ice') return 'cold';
    return id;
}

function drawBattleImpactBurst(ctx, x, y, primary, secondary, t) {
    const fxLoad = Math.max(0, Math.floor((Array.isArray(battleFx) ? battleFx.length : 0)));
    const lod = fxLoad >= 40 ? 0.45 : (fxLoad >= 22 ? 0.65 : 1);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    for (let i = 0; i < Math.max(3, Math.floor(6 * lod)); i++) {
        let angle = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * (6 + t * 16), y + Math.sin(angle) * (6 + t * 16));
        ctx.stroke();
    }
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.arc(x, y, 3 + t * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawGemAttackTrail(ctx, element, sx, sy, tx, ty, t) {
    const e = normalizeBattleElement(element);
    if (e === 'fire') {
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.strokeStyle = 'rgba(255,120,60,0.9)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + tx) * 0.5, Math.min(sy, ty) - 16, tx, ty);
        ctx.stroke();
    } else if (e === 'cold') {
        ctx.globalAlpha = (1 - t) * 0.3;
        ctx.strokeStyle = 'rgba(184,238,255,0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (e === 'light') {
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.strokeStyle = 'rgba(255,238,150,0.95)';
        ctx.lineWidth = 2.4;
        drawBattleZigZag(ctx, sx, sy, tx, ty, 7, 9);
        ctx.stroke();
    } else if (e === 'chaos') {
        ctx.globalAlpha = (1 - t) * 0.38;
        ctx.strokeStyle = 'rgba(214,120,255,0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 18, sy - 18, tx - 24, ty + 14, tx, ty);
        ctx.stroke();
    } else {
        ctx.globalAlpha = (1 - t) * 0.25;
        ctx.strokeStyle = 'rgba(245,225,190,0.8)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }
}

function drawBattleSwingFx(ctx, fx, t, playerPos) {
    let skillVisual = getBattleSkillVisual(fx.skillName, SKILL_DB[fx.skillName] || SKILL_DB['기본 공격']);
    let swingElement = normalizeBattleElement(fx.element || (SKILL_DB[fx.skillName] || {}).ele || 'phys');
    let swingTheme = getImpactThemeByElement(swingElement);
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.72;
    let reach = 16 + t * 18;
    ctx.strokeStyle = fx.color || swingTheme.primary || skillVisual.primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(playerPos.x + 3, playerPos.y - 4);
    ctx.quadraticCurveTo(playerPos.x + 10 + t * 10, playerPos.y - 26, playerPos.x + reach, playerPos.y - 10);
    ctx.stroke();
    ctx.strokeStyle = swingTheme.secondary || skillVisual.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerPos.x + 6, playerPos.y - 1);
    ctx.lineTo(playerPos.x + reach - 2, playerPos.y - 6);
    ctx.stroke();
    if (fx.crit) {
        ctx.globalAlpha = (1 - t) * 0.52;
        ctx.strokeStyle = '#fff6c8';
        ctx.lineWidth = 2;
        for (let i = 0; i < Math.max(2, Math.floor(3 * lod)); i++) {
            let angle = -0.8 + i * 0.5 + t * 0.25;
            ctx.beginPath();
            ctx.moveTo(playerPos.x + 10, playerPos.y - 6);
            ctx.lineTo(playerPos.x + 10 + Math.cos(angle) * (18 + t * 10), playerPos.y - 6 + Math.sin(angle) * (18 + t * 10));
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawElementalHitAccent(ctx, element, tx, ty, t, crit) {
    const e = normalizeBattleElement(element || 'phys');
    const boost = crit ? 1.2 : 1;
    if (e === 'fire') {
        ctx.globalAlpha = (1 - t) * 0.62;
        ctx.fillStyle = 'rgba(255,120,64,0.65)';
        for (let i = 0; i < Math.max(2, Math.floor(3 * lod)); i++) {
            let spread = (i - 1) * 5;
            ctx.beginPath();
            ctx.ellipse(tx + spread, ty + 2 - t * 9, (3 + t * 5) * boost, (6 + t * 10) * boost, spread * 0.03, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (e === 'cold') {
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.strokeStyle = 'rgba(187,236,255,0.95)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < Math.max(2, Math.floor(3 * lod)); i++) {
            let a = (Math.PI * 2 * i) / 3 + t * 0.2;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(a) * (8 + t * 14), ty + Math.sin(a) * (8 + t * 14));
            ctx.stroke();
        }
    } else if (e === 'light') {
        ctx.globalAlpha = (1 - t) * 0.82;
        ctx.strokeStyle = 'rgba(255,244,150,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - 6, ty - 7);
        ctx.lineTo(tx + 1, ty - 1);
        ctx.lineTo(tx - 2, ty + 5);
        ctx.lineTo(tx + 7, ty + 1);
        ctx.stroke();
    } else if (e === 'chaos') {
        ctx.globalAlpha = (1 - t) * 0.58;
        ctx.strokeStyle = 'rgba(220,128,255,0.86)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(tx, ty, 7 + t * 11, t * 4.4, t * 4.4 + Math.PI * 1.2);
        ctx.stroke();
    } else {
        ctx.globalAlpha = (1 - t) * 0.44;
        ctx.strokeStyle = 'rgba(255,235,205,0.72)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(tx, ty + 2, 6 + t * 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}


function drawGemImpactFx(ctx, element, tx, ty, t, crit) {
    const e = normalizeBattleElement(element || 'phys');
    const burst = crit ? 1.2 : 1;
    const fxLoad = Math.max(0, Math.floor((Array.isArray(battleFx) ? battleFx.length : 0)));
    const lod = fxLoad >= 40 ? 0.45 : (fxLoad >= 22 ? 0.65 : 1);
    if (e === 'fire') {
        ctx.globalAlpha = (1 - t) * 0.78;
        for (let i = 0; i < Math.max(10, Math.floor(24 * lod)); i++) {
            const a = (-Math.PI * 0.95) + (Math.PI * 0.9) * (i / 23);
            const r = 5 + t * (24 + (i % 4) * 2.8);
            ctx.fillStyle = i % 4 === 0 ? '#ffe39a' : (i % 2 ? '#ff8a3d' : '#ff3d1f');
            ctx.beginPath();
            ctx.ellipse(tx + Math.cos(a) * r * 0.72, ty + Math.sin(a) * r, (1.1 + (1 - t) * 1.8) * burst, (2.1 + (1 - t) * 2.4) * burst, a, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.fillStyle = 'rgba(255,120,40,0.7)';
        ctx.beginPath();
        ctx.arc(tx, ty + 2, 6 + t * 8, 0, Math.PI * 2);
        ctx.fill();
    } else if (e === 'cold') {
        ctx.globalAlpha = (1 - t) * 0.88;
        ctx.strokeStyle = 'rgba(198,244,255,0.98)';
        ctx.lineWidth = 1.9;
        for (let i = 0; i < Math.max(4, Math.floor(8 * lod)); i++) {
            const a = (Math.PI * 2 * i) / 8 + t * 0.35;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(a) * (8 + t * 20), ty + Math.sin(a) * (8 + t * 20));
            ctx.stroke();
        }
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.fillStyle = 'rgba(220,248,255,0.75)';
        for (let i = 0; i < Math.max(3, Math.floor(6 * lod)); i++) {
            const a = (Math.PI * 2 * i) / 6;
            const r = 6 + t * 10;
            ctx.beginPath();
            ctx.moveTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r);
            ctx.lineTo(tx + Math.cos(a + 0.16) * (r + 5), ty + Math.sin(a + 0.16) * (r + 5));
            ctx.lineTo(tx + Math.cos(a - 0.16) * (r + 5), ty + Math.sin(a - 0.16) * (r + 5));
            ctx.closePath();
            ctx.fill();
        }
    } else if (e === 'light') {
        ctx.globalAlpha = (1 - t) * 0.88;
        ctx.strokeStyle = 'rgba(255,243,150,0.95)';
        ctx.lineWidth = 2.2;
        for (let i = 0; i < Math.max(2, Math.floor(3 * lod)); i++) {
            const ox = (i - 1) * 5;
            drawBattleZigZag(ctx, tx - 16 + ox, ty - 14, tx + 8 + ox, ty + 6, 4 + i, 6);
            ctx.stroke();
        }
    } else if (e === 'chaos') {
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.strokeStyle = 'rgba(210,120,255,0.9)';
        ctx.lineWidth = 2;
        for (let i = 0; i < Math.max(1, Math.floor(2 * lod)); i++) {
            ctx.beginPath();
            ctx.ellipse(tx, ty, 8 + t * (10 + i * 5), 5 + t * (8 + i * 4), t * 3.2 + i * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else {
        ctx.globalAlpha = (1 - t) * 0.68;
        ctx.strokeStyle = 'rgba(247,224,177,0.9)';
        ctx.lineWidth = 2.4;
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI * 0.8 + i * (Math.PI * 0.4);
            ctx.beginPath();
            ctx.moveTo(tx, ty + 4);
            ctx.lineTo(tx + Math.cos(a) * (8 + t * 12), ty + 4 + Math.sin(a) * (8 + t * 12));
            ctx.stroke();
        }
    }
}

function drawBattleHitFx(ctx, fx, t, playerPos, enemyPosMap) {
    let enemyEntry = enemyPosMap[fx.enemyId];
    if (!enemyEntry) return;
    let tx = enemyEntry.x;
    let ty = enemyEntry.y - 6;
    ctx.save();
    let impactElement = normalizeBattleElement(fx.element || (SKILL_DB[fx.skillName] || {}).ele || 'phys');
    if (fx.dot) {
        ctx.restore();
        return;
    }
    drawGemImpactFx(ctx, impactElement, tx, ty, t, fx.crit);
    if (fx.crit) {
        ctx.globalAlpha = (1 - t) * 0.75;
        ctx.strokeStyle = '#fff4a8';
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 4; i++) {
            let angle = (Math.PI * 2 * i) / 4 + t * 0.35;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle) * (10 + t * 20), ty + Math.sin(angle) * (10 + t * 20));
            ctx.stroke();
        }
    }
    ctx.restore();
}


safeExposeGlobals({ switchTab });

function setTextById(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.innerText = value;
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
    if (enemyId === null || enemyId === undefined) return;
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

function updateCombatUI(pStats) {
    if (pStats && pStats.breakdowns) cachedTooltipStats = pStats;
    game.playerHp = Math.min(game.playerHp, pStats.maxHp);
    let safeHp = Math.max(0, Number(game.playerHp) || 0);
    setTextById('ui-hp', safeHp >= 100 ? Math.floor(safeHp) : safeHp.toFixed(1));
    setTextById('ui-maxhp', pStats.maxHp);
    setTextById('ui-maxhp-stat', pStats.maxHp);
    let hpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let hpBar = document.getElementById('ui-hp-bar');
    hpBar.style.width = hpPct + '%';
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
    let esPct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
    let esInlineEl = document.getElementById('ui-es-inline');
    if (esInlineEl) esInlineEl.innerText = (pStats.energyShield || 0) > 0 ? ` · ES ${Math.floor(game.playerEnergyShield || 0)}/${Math.floor(pStats.energyShield)}` : '';
    let esBar = document.getElementById('ui-es-bar');
    if (!esBar) {
        let hpWrap = document.querySelector('#ui-hp-bar').parentElement;
        esBar = document.createElement('div');
        esBar.id = 'ui-es-bar';
        esBar.className = 'hp-bar-fill';
        esBar.style.backgroundColor = '#55c1ff';
        esBar.style.opacity = '0.75';
        esBar.style.position = 'absolute';
        esBar.style.left = '0';
        esBar.style.top = '0';
        esBar.style.zIndex = '5';
        hpWrap.insertBefore(esBar, document.getElementById('ui-hp-bar'));
    }
    esBar.style.zIndex = '5';
    esBar.style.width = esPct + '%';
    esBar.style.display = (pStats.energyShield || 0) > 0 ? 'block' : 'none';
    setTextById('ui-exp', game.exp);
    setTextById('ui-maxexp', getExpReq(game.level));
    document.getElementById('ui-exp-bar').style.width = ((game.exp / getExpReq(game.level)) * 100) + '%';
    setTextById('ui-player-level', 'Lv.' + game.level);
    [['ui-hp', 'ui-hp-mobile'], ['ui-maxhp', 'ui-maxhp-mobile'], ['ui-exp', 'ui-exp-mobile'], ['ui-maxexp', 'ui-maxexp-mobile'], ['ui-player-level', 'ui-player-level-mobile']].forEach(([src, dst]) => {
        let sourceEl = document.getElementById(src);
        let targetEl = document.getElementById(dst);
        if (sourceEl && targetEl) targetEl.innerText = sourceEl.innerText;
    });
    let hpBarMobile = document.getElementById('ui-hp-bar-mobile');
    if (hpBarMobile) hpBarMobile.style.width = document.getElementById('ui-hp-bar').style.width;
    let expBarMobile = document.getElementById('ui-exp-bar-mobile');
    if (expBarMobile) expBarMobile.style.width = document.getElementById('ui-exp-bar').style.width;
    let ailmentEl = document.getElementById('ui-player-ailments');
    if (ailmentEl) {
        let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈' };
        let ailmentColors = { ignite: '#ff9f43', chill: '#9be7ff', freeze: '#4da3ff', shock: '#ffe66d', poison: '#c56cff', bleed: '#ff6b6b', flameDecay: '#ff7a3d', assassinWeakness: '#ff9bd1' };
        let text = (game.playerAilments || []).map(ail => `<span data-info-tooltip-anchor=\"1\" style=\"color:${ailmentColors[ail.type] || '#ffffff'};font-weight:700;cursor:help;\" onmouseenter=\"showPlayerAilmentTooltip(event,'${ail.type}',${Math.ceil(Math.max(0,(ail.time||0)))},${Number(ail.power||0.1).toFixed(3)},${Math.floor(getStoredAilmentHitDamage(ail))})\" onmouseleave=\"hideInfoTooltip()\">${labels[ail.type] || ail.type} ${Math.ceil(Math.max(0, (ail.time || 0)))}s</span>`).join(' · ');
        if (game.woodsmanCurseActive) {
            let curseTaken = (Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) * 0.01).toFixed(2);
            let curseText = `<span style=\"color:#d0a8ff;font-weight:700;\">나무꾼의 저주 +${curseTaken}%</span>`;
            text = text ? `${text} · ${curseText}` : curseText;
        }
        let activeBuffs = (game.playerConditionBuffs || []).filter(buff => (buff.expiresAt || 0) > Date.now());
        let guardWarcryText = activeBuffs.filter(buff => ['guard', 'warcry'].includes(buff.type)).map(buff => `<span data-info-tooltip-anchor=\"1\" style=\"color:#9be7ff;font-weight:700;cursor:help;\" onmouseenter=\"showPlayerBuffTooltip(event,'${buff.name}','${buff.type || ''}',${Math.ceil(Math.max(0,((buff.expiresAt||0)-Date.now())/1000))})\" onmouseleave=\"hideInfoTooltip()\">${buff.name} ${Math.ceil(Math.max(0, ((buff.expiresAt || 0) - Date.now()) / 1000))}s</span>`).join(' · ');
        let ailmentText = [text, guardWarcryText ? `효과: ${guardWarcryText}` : ''].filter(Boolean).join(' · ');
        // 데스크톱에서 터치 디바이스 플래그가 잡히더라도 상태 표시를 숨기지 않도록
        // 화면 너비 기준으로만 모바일 UI 분기를 판단한다.
        let isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 1080px)').matches);
        let fallbackText = '<span style="color:#8da1b8;">효과 없음</span>';
        let desktopText = ailmentText || fallbackText;
        // 데스크톱에서는 생명력 바 "아래"에 효과를 고정 노출한다.
        ailmentEl.innerHTML = '';
        let ailmentUnderEl = document.getElementById('ui-player-ailments-under');
        if (ailmentUnderEl) ailmentUnderEl.innerHTML = isMobile ? '' : desktopText;
        let mobileAilmentEl = document.getElementById('ui-player-ailments-mobile');
        if (mobileAilmentEl) mobileAilmentEl.innerHTML = isMobile ? desktopText : '';
        let projectedPlayerAilDmg = (game.playerAilments || []).reduce((sum, ail) => {
            if (!ail || (ail.time || 0) <= 0) return sum;
            if (!isDamageAilmentType(ail.type)) return sum;
            return sum + Math.floor(getPlayerDamageAilmentDps(ail, pStats) * Math.max(0, ail.time || 0));
        }, 0);
        let playerHpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
        let pendingPlayerPct = Math.max(0, Math.min(playerHpPct, (projectedPlayerAilDmg / Math.max(1, pStats.maxHp)) * 100));
        hpAilBar.style.width = `${pendingPlayerPct}%`;
        hpAilBar.style.left = 'auto';
        hpAilBar.style.right = `${Math.max(0, 100 - playerHpPct)}%`;
        hpAilBar.style.display = pendingPlayerPct > 0.05 ? 'block' : 'none';
    }
    let hpCombatBar = document.getElementById('ui-player-hp-combat');
    if (hpCombatBar) hpCombatBar.style.width = `${Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100))}%`;
    let esCombatBar = document.getElementById('ui-player-es-combat');
    if (esCombatBar) {
        let pct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
        esCombatBar.style.width = `${pct}%`;
        esCombatBar.style.display = (pStats.energyShield || 0) > 0 ? 'block' : 'none';
    }

    let zone = getZone(game.currentZoneId);
    let combatTitle = zone.name;
    if (zone.type === 'act') {
        let storyAct = getStoryActByZoneId(zone.id);
        if (storyAct) combatTitle = `⚔️ 전투 ${formatStoryActLabel(storyAct)}: ${storyAct.title}`;
    } else if (zone.type !== 'trial') {
        combatTitle = `⚔️ 전투 ${zone.name}`;
    }
    let zoneText = zone.type === 'trial' ? zone.name : combatTitle;
    setTextById('ui-combat-zone', zoneText);
    let inlineZoneEl = document.getElementById('ui-combat-zone-inline');
    if (inlineZoneEl) inlineZoneEl.innerText = zoneText;

    let pendingWoodsmanEntrance = !!game.woodsmanEntrancePending && zone && zone.type === 'outsideChaos';
    if (pendingWoodsmanEntrance) {
        let totalTime = Math.max(0.1, Number(game.moveTotalTime) || 3);
        let readyPct = Math.min(100, Math.max(0, (1 - Math.max(0, game.moveTimer || 0) / totalTime) * 100));
        setTextById('ui-progress-label', '☠️ 나무꾼 등장 대기');
        setTextById('ui-move-time-text', game.moveTimer > 0 ? `${Math.max(0, game.moveTimer).toFixed(1)}초` : '등장 임박');
        document.getElementById('ui-move-bar').style.width = readyPct + '%';
    } else if (game.moveTimer > 0) {
        let readyPct = Math.min(100, (1 - game.moveTimer / game.moveTotalTime) * 100);
        setTextById('ui-progress-label', game.isTownReturning ? '🏕️ 재정비 중...' : '🚶 다음 구간 준비');
        setTextById('ui-move-time-text', `${Math.max(0, game.moveTimer).toFixed(1)}초`);
        document.getElementById('ui-move-bar').style.width = readyPct + '%';
    } else if (isCrowdProgressPaused()) {
        setTextById('ui-progress-label', '⛔ 전장 정리 중');
        setTextById('ui-move-time-text', `적 ${ENEMY_CROWD_PAUSE_LIMIT}기 이상`);
        document.getElementById('ui-move-bar').style.width = game.runProgress + '%';
    } else {
        setTextById('ui-progress-label', '🧭 맵 진행');
        setTextById('ui-move-time-text', `${game.runProgress.toFixed(0)}%`);
        document.getElementById('ui-move-bar').style.width = game.runProgress + '%';
    }

    document.getElementById('ui-dps').innerText = Math.floor(pStats.dps);
    document.getElementById('ui-atk').innerText = Math.floor(pStats.baseDmg);
    document.getElementById('ui-aps').innerText = pStats.aspd.toFixed(2);
    document.getElementById('ui-crit').innerText = pStats.crit.toFixed(1);
    document.getElementById('ui-crit-dmg').innerText = Math.floor(pStats.critDmg);
    document.getElementById('ui-ignite-chance').innerText = Math.max(0, pStats.igniteChance || 0).toFixed(1);
    document.getElementById('ui-chill-chance').innerText = Math.max(0, pStats.chillChance || 0).toFixed(1);
    document.getElementById('ui-freeze-chance').innerText = Math.max(0, pStats.freezeChance || 0).toFixed(1);
    document.getElementById('ui-poison-chance').innerText = Math.max(0, pStats.poisonChance || 0).toFixed(1);
    document.getElementById('ui-bleed-chance').innerText = Math.max(0, pStats.bleedChance || 0).toFixed(1);
    document.getElementById('ui-move-spd').innerText = Math.floor(pStats.moveSpeed);
    document.getElementById('ui-dr').innerText = Math.floor(pStats.dr);
    let armorEl = document.getElementById('ui-armor'); if (armorEl) armorEl.innerText = Math.floor(pStats.armor || 0);
    let evasionEl = document.getElementById('ui-evasion'); if (evasionEl) evasionEl.innerText = Math.floor(pStats.evasion || 0);
    let esEl = document.getElementById('ui-es'); if (esEl) esEl.innerText = Math.floor(pStats.energyShield || 0);
    document.getElementById('ui-phys-ignore').innerText = Math.floor(pStats.physIgnore || 0);
    document.getElementById('ui-res-pen').innerText = Math.floor(pStats.resPen || 0);
    document.getElementById('ui-res-fire').innerText = Math.floor(pStats.resF);
    document.getElementById('ui-res-cold').innerText = Math.floor(pStats.resC);
    document.getElementById('ui-res-light').innerText = Math.floor(pStats.resL);
    document.getElementById('ui-res-chaos').innerText = Math.floor(pStats.resChaos);
    document.getElementById('ui-min-dmg-roll').innerText = Math.floor(pStats.minDmgRoll || 80);
    document.getElementById('ui-max-dmg-roll').innerText = Math.floor(pStats.maxDmgRoll || 100);
    document.getElementById('ui-loop-deaths').innerText = Math.max(0, Math.floor(game.loopDeaths || 0));
    document.getElementById('ui-loop-kills').innerText = Math.max(0, Math.floor(game.loopKills || 0));

    document.getElementById('row-phys-ignore').style.display = (pStats.physIgnore || 0) > 0 ? 'grid' : 'none';
    document.getElementById('row-res-pen').style.display = (pStats.resPen || 0) > 0 ? 'grid' : 'none';
    document.getElementById('row-regen').style.display = pStats.regen > 0 ? 'grid' : 'none';
    document.getElementById('row-regen-suppress').style.display = (pStats.regenSuppress || 0) > 0 ? 'grid' : 'none';
    document.getElementById('row-leech').style.display = pStats.leech > 0 ? 'grid' : 'none';
    document.getElementById('row-ds').style.display = pStats.ds > 0 ? 'grid' : 'none';
    document.getElementById('row-gemlv').style.display = pStats.gemLv > 0 ? 'grid' : 'none';
    if (pStats.regen > 0) document.getElementById('ui-regen').innerText = formatValue('regen', pStats.regen);
    if ((pStats.regenSuppress || 0) > 0) document.getElementById('ui-regen-suppress').innerText = formatValue('regenSuppress', pStats.regenSuppress);
    if (pStats.leech > 0) document.getElementById('ui-leech').innerText = formatValue('leech', pStats.leech);
    if (pStats.ds > 0) document.getElementById('ui-ds').innerText = Math.floor(pStats.ds);
    if (pStats.gemLv > 0) document.getElementById('ui-gemlv').innerText = `+${pStats.gemLv}`;
    let specialSummaryEl = document.getElementById('ui-unique-special-summary');
    if (specialSummaryEl) {
        let notes = [];
        if ((pStats.glovePairAspdBonus || 0) > 0) notes.push(`🧤 동형 장갑 세트 보너스 활성화: 기본 공속 +${(pStats.glovePairAspdBonus || 0).toFixed(2)}`);
        let heroDef = getHeroSelectionDef(game.selectedHeroId);
        if (heroDef) notes.push(`🧬 ${heroDef.label} 재능: ${heroDef.talentsText}`);
        if (game.ascendClass && Array.isArray(game.ascendKeystones) && game.ascendKeystones.length > 0) {
            let defs = getClassKeystoneDefs(game.ascendClass);
            let pickedNames = game.ascendKeystones.map(id => ((defs.find(node => node.id === id) || {}).name || id));
            notes.push(`★ 키스톤: ${pickedNames.join(' / ')}`);
        }
        if ((pStats.minDmgRoll || 80) >= (pStats.maxDmgRoll || 100)) notes.push(`⚖️ 최소 피해 보정(${Math.floor(pStats.minDmgRoll || 80)}%)이 최대 보정 이상이라 최대 피해 보정이 동일 값으로 조정됩니다.`);
        specialSummaryEl.innerText = notes.join(' · ');
    }

    let enemies = (game.enemies || []).filter(enemy => enemy && (enemy.hp || 0) > 0);
    pruneEnemyHpDamageGhostStates(enemies.map(enemy => enemy.id));
    let targetIds = getSkillTargets(pStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    let focusedEnemy = enemies.find(enemy => targetIds.includes(enemy.id)) || enemies[0] || null;
    let enemyListEl = document.getElementById('ui-enemy-list');
    if (!focusedEnemy) {
        if (enemyListEl.dataset.enemyId !== '') {
            enemyListEl.dataset.enemyId = '';
            enemyListEl.innerHTML = `<div class="enemy-empty">현재 조준 중인 적이 없습니다.</div>`;
        }
    } else {
        let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
        let tags = getEnemyTraitSummary(focusedEnemy);
        if (Array.isArray(focusedEnemy.chaosRealmAffixes) && focusedEnemy.chaosRealmAffixes.length > 0) tags = tags.concat(focusedEnemy.chaosRealmAffixes.map(a => a.name));
        let ailmentLabels = { ignite: '🔥 점화', chill: '❄ 냉각', freeze: '🧊 동결', shock: '⚡ 감전', poison: '☠ 중독', bleed: '🩸 출혈', flameDecay: '🔥 화염 부패', assassinWeakness: '🗡 독점 약점' };
        let activeAilments = (focusedEnemy.ailments || []).filter(ail => ail && (ail.time || 0) > 0);
        let enemyDebuffs = (((game.enemyConditionDebuffs || {})[focusedEnemy.id]) || []).filter(row => row && (row.expiresAt || 0) > Date.now());
        let ailmentColors = { ignite: '#ff9f43', chill: '#9be7ff', freeze: '#4da3ff', shock: '#ffe66d', poison: '#c56cff', bleed: '#ff6b6b', flameDecay: '#ff7a3d', assassinWeakness: '#ff9bd1' };
        let ailmentText = activeAilments.map(ail => `<span data-info-tooltip-anchor=\"1\" style=\"color:${ailmentColors[ail.type] || '#ffffff'};font-weight:700;cursor:help;\" onmouseenter=\"showEnemyAilmentTooltip(event,'${ail.type}',${Math.ceil(ail.time || 0)},${Number(ail.power || 0).toFixed(3)},${Math.floor(getStoredAilmentHitDamage(ail))},${Math.floor(ail.flameDecayDps || 0)})\" onmouseleave=\"hideInfoTooltip()\">${ailmentLabels[ail.type] || ail.type}${ail.type === 'assassinWeakness' ? ` ${Math.floor(ail.power || 0)}중첩` : ''} ${Math.ceil(ail.time || 0)}s</span>`).join(' · ');
        let curseText = enemyDebuffs.map(row => `<span data-info-tooltip-anchor=\"1\" style=\"color:#ff9bd1;font-weight:700;cursor:help;\" onmouseenter=\"showPlayerBuffTooltip(event,'${row.name}','curse',${Math.ceil(Math.max(0,((row.expiresAt||0)-Date.now())/1000))})\" onmouseleave=\"hideInfoTooltip()\">🕯 저주:${row.name} ${Math.ceil(Math.max(0, ((row.expiresAt || 0) - Date.now()) / 1000))}s</span>`).join(' · ');
        ailmentText = [ailmentText, curseText].filter(Boolean).join(' · ');
        let projectedAilmentDamage = activeAilments.reduce((sum, ail) => {
            if (!ail || (ail.time || 0) <= 0) return sum;
            if (ail.type === 'flameDecay') return sum + Math.floor(Math.max(0, ail.flameDecayDps || 0) * Math.max(0, ail.time || 0));
            if (!isDamageAilmentType(ail.type)) return sum;
            let dps = getEnemyDamageAilmentDps(ail, cachedTooltipStats || getPlayerStats());
            return sum + Math.floor(dps * Math.max(0, ail.time || 0));
        }, 0);
        let pendingPct = Math.max(0, Math.min(pct, (projectedAilmentDamage / Math.max(1, focusedEnemy.maxHp || 1)) * 100));
        let pendingStartPct = Math.max(0, pct - pendingPct);
        let ghostPct = updateEnemyHpDamageGhost(focusedEnemy.id, pct);
        let ghostDisplay = ghostPct > pct + 0.2 ? 'block' : 'none';
        let focusedKey = String(focusedEnemy.id);
        if (enemyListEl.dataset.enemyId !== focusedKey || !enemyListEl.querySelector('.enemy-card.targeted')) {
            enemyListEl.dataset.enemyId = focusedKey;
            enemyListEl.innerHTML = `
                <div class="enemy-card targeted">
                    <div class="enemy-name"></div>
                    <div class="hp-bar-bg">
                        <div class="hp-bar-fill enemy-damage-ghost"></div>
                        <div class="hp-bar-fill enemy"></div>
                        <div class="hp-bar-fill enemy-pending"></div>
                        <div class="hp-text"></div>
                    </div>
                    <div class="enemy-tags muted enemy-ailments"></div>
                    <div class="enemy-tags muted enemy-traits"></div>
                </div>
            `;
        }
        let nameEl = enemyListEl.querySelector('.enemy-name');
        let ghostEl = enemyListEl.querySelector('.enemy-damage-ghost');
        let hpEl = enemyListEl.querySelector('.hp-bar-fill.enemy');
        let pendingEl = enemyListEl.querySelector('.enemy-pending');
        let hpTextEl = enemyListEl.querySelector('.hp-text');
        let ailmentEl = enemyListEl.querySelector('.enemy-ailments');
        let traitEl = enemyListEl.querySelector('.enemy-traits');
        if (nameEl) nameEl.innerText = getEnemyDisplayName(focusedEnemy);
        if (ghostEl) { ghostEl.style.width = `${ghostPct}%`; ghostEl.style.display = ghostDisplay; }
        if (hpEl) hpEl.style.width = `${pct}%`;
        if (pendingEl) { pendingEl.style.left = `${pendingStartPct}%`; pendingEl.style.width = `${pendingPct}%`; }
        if (hpTextEl) hpTextEl.innerText = `${focusedEnemy.energyShield > 0 ? `ES ${Math.floor(focusedEnemy.energyShield)} · ` : ''}${Math.max(0, Math.floor(focusedEnemy.hp))}/${focusedEnemy.maxHp}`;
        if (ailmentEl) ailmentEl.innerHTML = ailmentText ? `상태이상: ${ailmentText}` : '상태이상: 없음';
        if (traitEl) traitEl.innerText = `특성: ${tags.join(' · ') || '일반'}`;
    }
}

// passive render cache dirty helper: 구조 변경/노드 상태 변경 시 호출
function markPassiveRenderCacheDirty(type) {
    if (!passiveRenderCache) return;
    if (type === 'structure') passiveRenderCache.structureDirty = true;
    passiveRenderCache.stateDirty = true;
}

function getPassiveStateSignature() {
    let passives = (game.passives || []).slice().sort().join('|');
    let discovered = Array.from(discoveredPassiveNodes || []).sort().join('|');
    let reachable = Array.from(reachableNodes || []).sort().join('|');
    return `${passives}::${discovered}::${reachable}`;
}

function rebuildPassiveStructureCache() {
    let nodes = Object.values(PASSIVE_TREE.nodes || {});
    let edges = (PASSIVE_TREE.edges || []).map(edge => {
        let a = PASSIVE_TREE.nodes[edge.from];
        let b = PASSIVE_TREE.nodes[edge.to];
        if (!a || !b) return null;
        return { ...edge, a, b };
    }).filter(Boolean);
    passiveRenderCache.nodes = nodes;
    passiveRenderCache.edges = edges;
    passiveRenderCache.hoverGrid = new Map();
    let cellSize = passiveRenderCache.cellSize;
    nodes.forEach(node => {
        let cx = Math.floor(node.x / cellSize);
        let cy = Math.floor(node.y / cellSize);
        let key = `${cx},${cy}`;
        if (!passiveRenderCache.hoverGrid.has(key)) passiveRenderCache.hoverGrid.set(key, []);
        passiveRenderCache.hoverGrid.get(key).push(node);
    });
    passiveRenderCache.structureDirty = false;
}

function rebuildPassiveStateCache() {
    passiveRenderCache.glowNodes = passiveRenderCache.nodes.filter(node => {
        if (!isPassiveNodeAvailable(node)) return false;
        let visibility = getPassiveVisibility(node.id);
        if (visibility === 'hidden') return false;
        let discovered = discoveredPassiveNodes.has(node.id) || (game.passives || []).includes(node.id);
        return discovered || visibility === 'preview';
    });
    passiveRenderCache.activeEdges = passiveRenderCache.edges.filter(edge => {
        if (!isPassiveNodeAvailable(edge.a) || !isPassiveNodeAvailable(edge.b)) return false;
        let va = getPassiveVisibility(edge.a.id);
        let vb = getPassiveVisibility(edge.b.id);
        return va !== 'hidden' && vb !== 'hidden';
    });
    passiveRenderCache.stateSignature = getPassiveStateSignature();
    passiveRenderCache.stateDirty = false;
}

function ensurePassiveRenderCache() {
    if (passiveRenderCache.structureDirty) rebuildPassiveStructureCache();
    let signature = getPassiveStateSignature();
    if (passiveRenderCache.stateDirty || passiveRenderCache.stateSignature !== signature) rebuildPassiveStateCache();
}

function getPassiveWorldViewport(displayWidth, displayHeight) {
    let halfW = displayWidth / 2;
    let halfH = displayHeight / 2;
    return {
        minX: (-halfW - camX) / camZoom,
        maxX: (halfW - camX) / camZoom,
        minY: (-halfH - camY) / camZoom,
        maxY: (halfH - camY) / camZoom
    };
}

function isNodeInViewport(node, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    return node.x >= viewport.minX - m && node.x <= viewport.maxX + m && node.y >= viewport.minY - m && node.y <= viewport.maxY + m;
}

function isEdgeInViewport(edge, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    let minX = Math.min(edge.a.x, edge.b.x);
    let maxX = Math.max(edge.a.x, edge.b.x);
    let minY = Math.min(edge.a.y, edge.b.y);
    let maxY = Math.max(edge.a.y, edge.b.y);
    return !(maxX < viewport.minX - m || minX > viewport.maxX + m || maxY < viewport.minY - m || minY > viewport.maxY + m);
}


safeExposeGlobals({ updateCombatUI });


// Phase-2 appended static UI renderer block.
let uiRefreshQueued = false;
let uiRefreshRunning = false;
let uiRefreshLastPointerAt = 0;
let uiRefreshLastFlushAt = 0;
let uiRefreshPendingForce = false;
const UI_REFRESH_CLICK_GUARD_MS = 90;
const UI_REFRESH_FORCE_FLUSH_MS = 250;

if (!window.__uiRefreshPointerGuardBound) {
    window.__uiRefreshPointerGuardBound = true;
    document.addEventListener('pointerdown', () => { uiRefreshLastPointerAt = Date.now(); }, true);
}

function updateStaticUI(forceImmediate) {
    if (forceImmediate) {
        uiRefreshPendingForce = true;
    }
    if (uiRefreshQueued || uiRefreshRunning) return;
    uiRefreshQueued = true;
    requestAnimationFrame(processQueuedUIRefresh);
}

function processQueuedUIRefresh() {
    uiRefreshQueued = false;
    let now = Date.now();
    let inGuardWindow = (now - uiRefreshLastPointerAt) < UI_REFRESH_CLICK_GUARD_MS;
    let forceFlush = uiRefreshPendingForce || (now - uiRefreshLastFlushAt) >= UI_REFRESH_FORCE_FLUSH_MS;
    if (inGuardWindow && !forceFlush) {
        uiRefreshQueued = true;
        requestAnimationFrame(processQueuedUIRefresh);
        return;
    }
    uiRefreshPendingForce = false;
    uiRefreshRunning = true;
    try {
        performUpdateStaticUI();
    } finally {
        uiRefreshRunning = false;
        uiRefreshLastFlushAt = Date.now();
        if (uiRefreshQueued) requestAnimationFrame(processQueuedUIRefresh);
    }
}

function shouldRedrawPassiveTree(now) {
    let signature = [
        game.passivePoints || 0,
        (game.passives || []).length,
        (game.discoveredPassives || []).length,
        game.startNode || '',
        game.ascendClass || '',
        game.season || 1
    ].join('|');
    let changed = signature !== lastPassiveTreeSignature;
    let due = (now - lastPassiveTreeDrawAt) >= 180;
    if (changed) lastPassiveTreeSignature = signature;
    return changed || due;
}

function performUpdateStaticUI() {

    ensureStarWedgeState();
    tryUnlockMeteorContentByProgress();
    validateItemTooltipAnchor();
    applySeasonContentProgression({ silent: false });
    tickShrineState();
    applyTabHeaderOrder();
    calculateReachableNodes();
    refreshPassiveVisibility();
    normalizeSupportLoadout(true);
    let pStats = getPlayerStats();
    cachedTooltipStats = pStats;
    updateCombatUI(pStats);
    let showCombatScene = game.settings.showCombatScene !== false;
    let canvas = document.getElementById('battlefield-canvas');
    let caption = document.getElementById('ui-battlefield-caption');
    let battlefieldWrap = document.getElementById('battlefield-wrap');
    if (canvas) canvas.style.display = showCombatScene ? 'block' : 'none';
    if (battlefieldWrap) battlefieldWrap.classList.toggle('compressed', !showCombatScene);
    applyPanelLayoutSettings();
    if (!showCombatScene && caption) caption.innerText = '전투가 진행중입니다.';
    let loopDecisionOverlay = document.getElementById('loop-decision-overlay');
    if (loopDecisionOverlay) loopDecisionOverlay.classList.toggle('active', !!game.pendingLoopDecision);
    let shrineBox = document.getElementById('ui-shrine-box');
    if (shrineBox) {
        let active = game.shrineState && game.shrineState.active;
        let buff = game.shrineBuff;
        let now = Date.now();
        let activeRemain = active ? Math.max(0, Math.ceil(((active.expiresAt || 0) - now) / 1000)) : 0;
        let buffRemain = buff ? Math.max(0, Math.ceil(((buff.expiresAt || 0) - now) / 1000)) : 0;
        let shrineStateKey = active ? `active:${active.name}` : (buff ? `buff:${buff.name}` : 'idle');
        if (shrineBox.dataset.stateKey !== shrineStateKey) {
            shrineBox.innerHTML = active ? `<button onclick="clickActiveShrine()">${active.name} 클릭 (${activeRemain}s)</button>` : (buff ? `<div style="color:#ffd36b;">${buff.name} 지속중 (${buffRemain}s)</div>` : '<div style="color:#7f8c8d;">성소 대기중</div>');
            shrineBox.dataset.stateKey = shrineStateKey;
        } else if (active) {
            let btn = shrineBox.querySelector('button');
            if (btn) btn.innerText = `${active.name} 클릭 (${activeRemain}s)`;
        } else if (buff) {
            shrineBox.innerHTML = `<div style="color:#ffd36b;">${buff.name} 지속중 (${buffRemain}s)</div>`;
        }
    }
    if (document.getElementById('tab-char') && document.getElementById('tab-char').classList.contains('active')) {
        let drawNow = Date.now();
        if (shouldRedrawPassiveTree(drawNow)) {
            resizePassiveTreeCanvas(false);
            drawPassiveTree();
            lastPassiveTreeDrawAt = drawNow;
        }
    }
    renderStarWedgePanel();

    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'map', 'traits','jewel','journal','currency','fossil','ascend','loop'].forEach(key => { let el=document.getElementById('noti-' + key); if(!el) return; el.style.display = (game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none'; });
    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'map', 'traits', 'expertise'].forEach(key => document.getElementById('btn-tab-' + key).style.display = game.unlocks[key] ? 'block' : 'none');
    let jewelTabBtn = document.getElementById('btn-tab-jewel');
    if (jewelTabBtn) jewelTabBtn.style.display = game.unlocks.jewel ? 'block' : 'none';
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = window.matchMedia(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`).matches ? 'block' : 'none';
    let summarySkillTreeBtn = document.getElementById('btn-summary-tab-char');
    if (summarySkillTreeBtn) {
        summarySkillTreeBtn.disabled = !game.unlocks.char;
        summarySkillTreeBtn.innerText = game.unlocks.char ? '스킬트리' : '스킬트리 (Lv.2)';
    }
    let activeContent = document.querySelector('.tab-content.active');
    if (activeContent) syncDerivedTabUnlock(activeContent.id);
    let activeGate = activeContent ? TAB_UNLOCK_GATES[activeContent.id] : null;
    if (activeGate && !game.unlocks[activeGate]) {
        switchTab('tab-character');
        return;
    }

    document.getElementById('ui-passive-points').innerText = game.passivePoints;
    document.getElementById('ui-season-text-tab').innerText = game.season;
    document.getElementById('ui-season-pts').innerText = game.seasonPoints;
    document.getElementById('ui-ascend-pts').innerText = game.ascendPoints;

    syncSalvageControlsFromSettings();
    renderPaperdoll('ui-equip-list', false);
    renderPaperdoll('ui-craft-equip-list', true);
    renderPaperdoll('ui-fossil-equip-list', true);
    if (document.getElementById('ui-infuser-equip-list')) renderPaperdoll('ui-infuser-equip-list', true);
    document.getElementById('ui-inv-count').innerText = game.inventory.length;
    document.getElementById('ui-inv-limit').innerText = getInventoryLimit();
    document.getElementById('ui-inventory-list').innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'equip')).join('');
    document.getElementById('ui-craft-inventory-list').innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'craft')).join('');
    document.getElementById('ui-fossil-inventory-list').innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'fossil')).join('');
    let infuserInv = document.getElementById('ui-infuser-inventory-list');
    if (infuserInv) infuserInv.innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'infuser')).join('');
    let jewelUnlocked = !!game.unlocks.jewel;
    document.getElementById('ui-jewel-header').style.display = jewelUnlocked ? 'block' : 'none';
    document.getElementById('ui-jewel-panel').style.display = jewelUnlocked ? 'block' : 'none';
    if (jewelUnlocked) {
        game.jewelSlots = Array.isArray(game.jewelSlots) ? game.jewelSlots : [null, null];
        game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
        jewelFusionSelection = (jewelFusionSelection || []).filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length);
        document.getElementById('ui-jewel-cap').innerHTML = `주얼 인벤토리: <strong>${game.jewelInventory.length}</strong> / ${getJewelInventoryLimit()} · 선택 융합: <strong>${(jewelFusionSelection||[]).length}</strong>`;
        syncJewelSalvageControlsFromSettings();
        game.jewelSlotAmplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [0, 0];
        document.getElementById('ui-jewel-core-craft').innerHTML = `<div style="color:#f1c67d; margin-bottom:4px;">주얼 제작 재화 (주얼 결정: ${game.currencies.jewelShard || 0})</div>
        <div style="font-size:0.8em; color:#8fb6d9; margin-bottom:6px;">일반 융합: 1줄 주얼 2개 + 주얼 결정 6개 → 2줄 주얼</div>
        <label style="display:block; font-size:0.78em; color:#e2c9a4; margin-bottom:4px;"><input type="checkbox" id="chk-jewel-amplified-fusion"> 증폭합성 사용 (주얼 결정 8 추가 소모, 랜덤 패널티 + 랜덤 추가옵션)</label>
        <div style="display:flex; gap:6px; flex-wrap:wrap;"><button onclick="craftJewelFusion()" ${(game.currencies.jewelShard || 0) < 6 ? 'disabled' : ''}>선택한 주얼 융합</button><button onclick="drawJewelRefine()" ${(game.currencies.jewelShard || 0) < 12 || (game.jewelInventory||[]).length >= getJewelInventoryLimit() ? 'disabled' : ''}>주얼 가공 (주얼 결정 12)</button></div>
        <div style="margin-top:8px; font-size:0.8em; color:#8fb6d9;">슬롯 증폭: 슬롯 효과 소폭 상승 (최대 20강, 실패 가능)</div>
        <div style="display:flex; gap:6px; margin-top:4px;"><button onclick="tryAmplifyJewelSlot(0)">슬롯1 증폭 (${game.jewelSlotAmplify[0] || 0}/20 · 비용 ${getJewelAmplifyCost(game.jewelSlotAmplify[0] || 0)} · 성공 ${Math.floor(getJewelAmplifySuccessChance(game.jewelSlotAmplify[0] || 0) * 100)}%)</button><button onclick="tryAmplifyJewelSlot(1)">슬롯2 증폭 (${game.jewelSlotAmplify[1] || 0}/20 · 비용 ${getJewelAmplifyCost(game.jewelSlotAmplify[1] || 0)} · 성공 ${Math.floor(getJewelAmplifySuccessChance(game.jewelSlotAmplify[1] || 0) * 100)}%)</button></div>
        <div style="margin-top:8px; color:#b4c9e2; font-size:0.8em;">공허 주얼: 최대 4줄까지 지원</div>
        <div style="display:flex; gap:6px; margin-top:4px;"><button onclick="craftVoidJewel()" ${(game.currencies.voidChisel || 0) <= 0 || (game.jewelInventory||[]).length < 2 ? 'disabled' : ''}>공허 주얼 제작 (끌 1 + 주얼2)</button><button onclick="fuseSelectedVoidJewels()">선택 공허융합</button></div>`;
        document.getElementById('ui-jewel-slots').innerHTML = [0, 1].map(slotIdx => {
            let jewel = game.jewelSlots[slotIdx];
            let ampLv = (game.jewelSlotAmplify && game.jewelSlotAmplify[slotIdx]) || 0;
            let ampBonus = ampLv * 2;
            if (!jewel) return `<div id="jewel-slot-card-${slotIdx}" class="slot-box" style="min-height:70px; cursor:default; border:1px solid #4a5f87; background:linear-gradient(170deg,#101722,#152238); box-shadow:0 0 12px rgba(90,130,200,.18) inset;">💠 주얼 슬롯 ${slotIdx + 1} <span style="color:#f1c40f;">(+${ampLv})</span><br><span style="color:#7f8c8d;">비어있음</span><br><span style="font-size:0.75em;color:#9dc3ff;">강화효과 +${ampBonus}%</span></div>`;
            let desc = getJewelStats(jewel).map(stat => {
                let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatJewelStatValue(stat.id, stat.valMin)}~${formatJewelStatValue(stat.id, stat.valMax)})` : '';
                let tier = Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
                let petite = isJewelPetiteStat(stat) ? '쁘띠 ' : '';
                let tone = getJewelStatToneColor(stat.id);
                return `<span style="color:${tone};">${petite}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}</span>${range}${tier}`;
            }).join('<br>');
            return `<div id="jewel-slot-card-${slotIdx}" class="slot-box" style="min-height:86px; border:2px solid ${getRarityColor(jewel.rarity || 'normal')}; background:linear-gradient(170deg,#101722,#152238); box-shadow:0 0 12px rgba(90,130,200,.18) inset;" data-info-tooltip-anchor="1" onmouseenter="showInfoTooltipHtml(event.clientX,event.clientY,buildJewelRangeTooltipHtml(game.jewelSlots[${slotIdx}]),'#7fb3ff')" onmousemove="showInfoTooltipHtml(event.clientX,event.clientY,buildJewelRangeTooltipHtml(game.jewelSlots[${slotIdx}]),'#7fb3ff')" onmouseleave="hideInfoTooltip()">💠 주얼 슬롯 ${slotIdx + 1} <span style="color:#f1c40f;">(+${ampLv})</span><br><span class="item-title ${getJewelRarityClass(jewel.rarity)}">${jewel.name}</span><div class="item-stats" style="margin-top:3px;line-height:1.4;color:#d7e9ff;">${desc}</div><span style="font-size:0.75em;color:#9dc3ff;">강화효과 +${ampBonus}%</span><br><button style="margin-top:4px; font-size:0.72em;" onclick="unequipJewel(${slotIdx})">해제</button></div>`;
        }).join('');
        document.getElementById('ui-jewel-inventory').innerHTML = game.jewelInventory.map((jewel, idx) => {
            let selected = (jewelFusionSelection || []).includes(idx) ? 'selected' : '';
            let desc = getJewelStats(jewel).map(stat => {
                let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatJewelStatValue(stat.id, stat.valMin)}~${formatJewelStatValue(stat.id, stat.valMax)})` : '';
                let tier = Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
                let petite = isJewelPetiteStat(stat) ? '쁘띠 ' : '';
                let tone = getJewelStatToneColor(stat.id);
                return `<span style="color:${tone};">${petite}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}</span>${range}${tier}`;
            }).join('<br>');
            return `<div class="item-card ${selected}" style="min-height:72px;" data-info-tooltip-anchor="1" onmouseenter="showInfoTooltipHtml(event.clientX,event.clientY,buildJewelRangeTooltipHtml(game.jewelInventory[${idx}]),'#7fb3ff')" onmousemove="showInfoTooltipHtml(event.clientX,event.clientY,buildJewelRangeTooltipHtml(game.jewelInventory[${idx}]),'#7fb3ff')" onmouseleave="hideInfoTooltip()"><div class="item-title ${getJewelRarityClass(jewel.rarity)}">[${jewel.isVoid ? '공허' : getJewelRarityLabel(jewel.rarity)} 주얼] ${jewel.name}${jewel.isVoid ? ' ✦융합계열' : ''}</div><div class="item-stats" style="line-height:1.45;color:#d7e9ff;">• ${desc}</div><div class="item-actions"><button onclick="equipJewel(${idx}, 0)">슬롯1</button><button onclick="equipJewel(${idx}, 1)">슬롯2</button><button onclick="toggleJewelFusionSelection(${idx})">융합선택</button>${jewel.waxedByBeeswax ? `<button onclick="removeBeeswaxFromJewel(${idx})">밀랍 제거</button>` : `<button onclick="applyBeeswaxToJewel(${idx})" ${(game.currencies.beeswax || 0) > 0 ? '' : 'disabled'}>밀랍</button>`}<button onclick="salvageJewel(${idx})">해체</button></div></div>`;
        }).join('') || `<div style="color:#7f8c8d;">주얼 인벤토리가 비었습니다.</div>`;
    }

function getJewelStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    if (['firePctDmg', 'resF', 'igniteChance'].includes(statId)) return '#ff9a76';
    if (['coldPctDmg', 'resC', 'freezeChance'].includes(statId)) return '#8fd3ff';
    if (['lightPctDmg', 'resL', 'shockChance'].includes(statId)) return '#ffe083';
    if (['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance'].includes(statId)) return '#c7a6ff';
    if (['armor', 'armorPct', 'dr'].includes(statId)) return '#ffd2a6';
    if (['evasion', 'evasionPct'].includes(statId)) return '#baffc2';
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(statId)) return '#b9c6ff';
    if (['flatHp', 'pctHp', 'regen'].includes(statId)) return '#ffb3b3';
    if (['crit', 'critDmg'].includes(statId)) return '#ffd6f2';
    if (['aspd', 'move'].includes(statId)) return '#fff3a8';
    return '#d7e9ff';
}

function getItemStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    let id = String(statId);
    let low = id.toLowerCase();

    if (['firePctDmg', 'resF', 'igniteChance', 'fireResOvercapMulPerPct'].includes(id)) return '#ff9a76';
    if (['coldPctDmg', 'resC', 'freezeChance'].includes(id)) return '#8fd3ff';
    if (['lightPctDmg', 'resL', 'shockChance'].includes(id)) return '#ffe083';
    if (['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance'].includes(id)) return '#c7a6ff';
    if (['armor', 'armorPct', 'dr'].includes(id)) return '#ffd2a6';
    if (['evasion', 'evasionPct'].includes(id)) return '#baffc2';
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(id)) return '#b9c6ff';
    if (['flatHp', 'pctHp', 'regen', 'regenFlat'].includes(id)) return '#ffb3b3';
    if (['crit', 'critDmg'].includes(id)) return '#ffd6f2';
    if (['aspd', 'move'].includes(id)) return '#fff3a8';
    if (['flatDmg', 'pctDmg', 'physPctDmg', 'meleePctDmg', 'aoePctDmg', 'minDmgRoll', 'maxDmgRoll'].includes(id)) return '#ffcf9f';
    if (['spellFlatPct', 'spellFlatDmg'].includes(id)) return '#d4a8ff';
    if (['leech'].includes(id)) return '#ff8fa3';
    if (['resPen', 'resAll', 'ds'].includes(id)) return '#ffcb8e';
    if (['gemLevel', 'suppCap'].includes(id)) return '#a8e6cf';

    if (low.includes('res') || low.includes('pen')) return '#ffcb8e';
    if (low.includes('chaos') || low.includes('dot') || low.includes('poison') || low.includes('bleed')) return '#c7a6ff';
    if (low.includes('fire') || low.includes('ignite') || low.includes('burn')) return '#ff9a76';
    if (low.includes('cold') || low.includes('freeze') || low.includes('chill')) return '#8fd3ff';
    if (low.includes('light') || low.includes('shock')) return '#ffe083';
    if (low.includes('hp') || low.includes('life') || low.includes('regen') || low.includes('leech')) return '#ffb3b3';
    if (low.includes('armor') || low.includes('block') || low.includes('guard') || low.includes('dr')) return '#ffd2a6';
    if (low.includes('evasion') || low.includes('dodge')) return '#baffc2';
    if (low.includes('energyshield') || low.includes('es')) return '#b9c6ff';
    if (low.includes('crit')) return '#ffd6f2';
    if (low.includes('aspd') || low.includes('speed') || low.includes('move')) return '#fff3a8';
    if (low.includes('spell')) return '#d4a8ff';
    if (low.includes('gem') || low.includes('supp')) return '#a8e6cf';
    if (low.includes('dmg') || low.includes('atk') || low.includes('phys') || low.includes('melee') || low.includes('aoe')) return '#ffcf9f';

    return '#d7e9ff';
}

function getStyledOrbName(orbKey) {
    let name = (ORB_DB[orbKey] && ORB_DB[orbKey].name) ? ORB_DB[orbKey].name : String(orbKey || '');
    if (orbKey === 'transmute' || orbKey === 'augment' || orbKey === 'alteration') return `<span style="color:#9fd3ff;">${name}</span>`;
    if (orbKey === 'alchemy' || orbKey === 'regal' || orbKey === 'scour' || orbKey === 'blessing') return `<span style="color:#ffe07a;">${name}</span>`;
    if (orbKey === 'chaos' || orbKey === 'exalted') return `<span style="color:#ffbc8a;">${name}</span>`;
    if (orbKey === 'divine') return `<span style="color:#ffffff; border:1px solid #7a1f1f; border-radius:4px; padding:0 4px; background:#0f1116;">${name}</span>`;
    if (orbKey === 'tainted') return `<span style="color:#8a2f3f;">${name}</span>`;
    return name;
}

function buildJewelRangeTooltipHtml(jewel) {
    if (!jewel) return '<div class="tooltip-title">주얼</div><div class="tooltip-line">정보 없음</div>';
    let stats = getJewelStats(jewel);
    let coreStats = stats.filter(stat => !isJewelPetiteStat(stat));
    let tierSummary = coreStats.length > 0 ? Math.max(...coreStats.map(stat => Math.floor(stat.tier || 1))) : null;
    let lines = stats.map(stat => {
        let min = (stat.valMin !== undefined && stat.valMin !== null) ? formatJewelStatValue(stat.id, stat.valMin) : formatJewelStatValue(stat.id, stat.val);
        let max = (stat.valMax !== undefined && stat.valMax !== null) ? formatJewelStatValue(stat.id, stat.valMax) : formatJewelStatValue(stat.id, stat.val);
        let petite = isJewelPetiteStat(stat);
        let tier = Number.isFinite(Number(stat.tier)) && !petite ? ` <span style="color:#ffd68a;">T${Math.floor(stat.tier)}</span>` : '';
        let petiteLabel = petite ? '<span style="color:#b6d7ff;">쁘띠 </span>' : '';
        let expireText = petite ? ' · 융합 시 소멸' : '';
        let tone = getJewelStatToneColor(stat.id);
        return `<div class="tooltip-line"><span style="color:${tone};">${petiteLabel}${getStatName(stat.id)}: +${formatJewelStatValue(stat.id, stat.val)}${tier}</span> <span style="color:#9fb4d1;">(고정 범위 ${min}~${max}${expireText})</span></div>`;
    }).join('');
    let tierLine = tierSummary ? `<div class="tooltip-line" style="color:#9fb4d1;">숨겨진 티어: T${tierSummary}</div>` : '';
    return `<div class="tooltip-title">${escapeHTML(jewel.name || '주얼')}</div>${tierLine}${lines || '<div class="tooltip-line">옵션 정보 없음</div>'}`;
}

safeExposeGlobals({ buildJewelRangeTooltipHtml, getStyledOrbName, getItemStatToneColor });


function showSocketedJewelTooltip(event, socketType, socketIdx) {
    let item = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
    if (!item) return hideInfoTooltip();
    let jewel = null;
    if (socketType === 'void') {
        jewel = item.voidSocket && item.voidSocket.jewel ? item.voidSocket.jewel : null;
    } else if (socketType === 'abyss') {
        let sockets = Array.isArray(item.abyssSockets) ? item.abyssSockets : [];
        let idx = Math.max(0, Math.floor(Number(socketIdx) || 0));
        jewel = sockets[idx] && sockets[idx].jewel ? sockets[idx].jewel : null;
    }
    if (!jewel) return hideInfoTooltip();
    let html = buildJewelRangeTooltipHtml(jewel);
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}


function getCraftActionValidators(item) {
    let hasHoneyLocked = (item.stats || []).some(v => v.lockedByHoney);
    return {
        honey: !!item && (game.currencies.enchantedHoney || 0) > 0 && !hasHoneyLocked,
        stinger: !!item && (game.currencies.venomStinger || 0) > 0 && item.slot === '무기',
        baseUpgrade: !!item,
        voidSocket: !!item && (item.slot === '반지' || item.slot === '목걸이')
    };
}



function getCraftOrbUseState(key, item) {
    if (!item) return { enabled: false, reason: '아이템 미선택' };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: '재화 부족' };
    if (item.corrupted && key !== 'tainted') return { enabled: false, reason: '타락 아이템은 일반 제작 불가' };
    let ok = false;
    if (key === 'transmute') ok = item.rarity === 'normal';
    else if (key === 'augment') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 2;
    else if (key === 'alteration') ok = item.rarity === 'magic';
    else if (key === 'alchemy') ok = item.rarity === 'normal';
    else if (key === 'exalted') ok = item.rarity === 'rare' && getItemExplicitOptionCount(item) < 6;
    else if (key === 'regal') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 6;
    else if (key === 'chaos') ok = item.rarity === 'rare';
    else if (key === 'divine') ok = item.rarity !== 'normal';
    else if (key === 'scour') ok = item.rarity !== 'normal' && item.rarity !== 'unique';
    else if (key === 'tainted') ok = !item.corrupted;
    return { enabled: ok, reason: ok ? '사용 가능' : '현재 아이템 조건 불일치' };
}

function renderCraftSelectedSummary(item) {
    let host = document.getElementById('ui-craft-selected-summary');
    if (!host) return;
    if (!item) {
        host.innerHTML = '아이템을 선택하세요.';
        return;
    }
    let statCount = getItemExplicitOptionCount(item);
    host.innerHTML = `<div><strong>[${item.slot.replace(/[12]/,'')}] ${item.name}</strong> · ${item.rarity.toUpperCase()} · 추가 옵션 ${statCount}/6</div><div style="color:#a9bfd6; font-size:0.83em;">${item.baseName || ''}</div>`;
}


function renderChaosInfuserPanel(selectedItem) {
    let host = document.getElementById('ui-chaos-infuser-panel');
    if (!host) return;
    let unlocked = typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked();
    let infuserBtn = document.getElementById('btn-item-tab-infuser');
    if (infuserBtn) infuserBtn.style.display = unlocked ? 'block' : 'none';
    if (!unlocked) {
        host.innerHTML = '<div style="color:#9fb4d1;">나무꾼을 한 번 이상 마주치면 혼돈 주입기가 영구 해금됩니다.</div>';
        return;
    }
    if (!selectedItem) {
        host.innerHTML = '<div style="color:#9fb4d1;">장착 장비나 인벤토리 아이템을 선택하세요. 혼돈 주입 옵션은 아이템당 한 줄만 유지되며 언제든 교체할 수 있습니다.</div>';
        return;
    }
    let current = selectedItem.chaosInfusion
        ? `<div style="color:#d7a8ff; margin-bottom:8px;">현재 주입: <strong>${selectedItem.chaosInfusion.statName || getStatName(selectedItem.chaosInfusion.id)} +${formatValue(selectedItem.chaosInfusion.id, selectedItem.chaosInfusion.val)}</strong> <span style="color:#9fb4d1;">(${formatValue(selectedItem.chaosInfusion.id, selectedItem.chaosInfusion.valMin)}~${formatValue(selectedItem.chaosInfusion.id, selectedItem.chaosInfusion.valMax)})</span> <button onclick="removeChaosInfusionFromSelectedItem()" ${(game.currencies.scour || 0) > 0 ? '' : 'disabled'}>제거(정화 1)</button></div>`
        : '<div style="color:#7f8c8d; margin-bottom:8px;">현재 주입 옵션 없음</div>';
    let eligibility = typeof isChaosInfusionEligibleItem === 'function' ? isChaosInfusionEligibleItem(selectedItem) : { ok: true, reason: '' };
    let explicitCount = typeof getItemExplicitOptionCount === 'function' ? getItemExplicitOptionCount(selectedItem) : ((selectedItem.stats || []).length + (selectedItem.chaosInfusion ? 1 : 0));
    let options = typeof getChaosInfuserOptionsForItem === 'function' ? getChaosInfuserOptionsForItem(selectedItem) : (Array.isArray(window.CHAOS_INFUSER_OPTIONS) ? window.CHAOS_INFUSER_OPTIONS : []);
    let buttons = eligibility.ok ? options.map(opt => {
        let costs = typeof getChaosInfusionCost === 'function' ? getChaosInfusionCost(opt, selectedItem) : [{ key: opt.currency, amount: opt.cost }];
        let canPay = costs.every(row => (game.currencies[row.key] || 0) >= row.amount);
        let costText = typeof formatCurrencyCosts === 'function' ? formatCurrencyCosts(costs) : `${opt.currency} ${opt.cost}`;
        let key = opt.optionId || opt.id;
        let same = selectedItem.chaosInfusion && (selectedItem.chaosInfusion.sourceOptionId === key || selectedItem.chaosInfusion.id === opt.id);
        let rangeText = `${formatValue(opt.id, opt.min)}~${formatValue(opt.id, opt.max)}`;
        return `<button onclick="applyChaosInfusionToSelectedItem('${key}')" ${canPay && !same ? '' : 'disabled'}>${opt.label || getStatName(opt.id)} +${rangeText}<br><span style="font-size:0.78em;color:#b7c6df;">${same ? '적용 중' : costText}</span></button>`;
    }).join('') : `<div style="grid-column:1/-1; color:#ffb4b4;">${eligibility.reason}</div>`;
    if (eligibility.ok && !buttons) buttons = '<div style="grid-column:1/-1; color:#9fb4d1;">이 부위에 추가할 수 있는 주입 옵션이 없습니다.</div>';
    host.innerHTML = `<div style="margin-bottom:8px;"><strong>[${selectedItem.slot.replace(/[12]/,'')}] ${selectedItem.name}</strong><div style="font-size:0.82em;color:#9fb4d1;">T5급 범위 옵션 한 줄을 추가 옵션으로 부여합니다. 추가 옵션 제한: ${explicitCount}/6. 교체/제거 시 정화의 오브가 추가로 필요합니다.</div></div>${current}<div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px;">${buttons}</div>`;
}

function renderCraftOrbActions(selectedItem) {
    let host = document.getElementById('ui-craft-orb-actions');
    if (!host) return;
    host.innerHTML = '';
}

function openSporeModeOverlay(currencyKey) {
    let allowed = ['transmute','augment','alteration','alchemy','regal','chaos','exalted'];
    if (!allowed.includes(currencyKey)) return;
    let modeOptions = [
        { id: 'none', label: '미사용' },
        { id: 'fire', label: '화염' },
        { id: 'cold', label: '냉기' },
        { id: 'light', label: '번개' },
        { id: 'chaos', label: '카오스', minMyco: 10 },
        { id: 'damage', label: '피해', minMyco: 10 }
    ];
    let mycoLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
    modeOptions = modeOptions.filter(opt => !opt.minMyco || mycoLv >= opt.minMyco);
    game.sporeCraftModes = game.sporeCraftModes || {};
    let cur = game.sporeCraftModes[currencyKey] || 'none';
    if (!modeOptions.some(opt => opt.id === cur)) cur = 'none';
    let old = document.getElementById('spore-mode-overlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    let overlay = document.createElement('div');
    overlay.id = 'spore-mode-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(5,8,14,0.74); display:flex; align-items:center; justify-content:center; z-index:9999;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    let panel = document.createElement('div');
    panel.style.cssText = 'width:min(560px, 92vw); border:1px solid #405a8f; border-radius:12px; background:linear-gradient(160deg, #182544, #0f1629); padding:14px; box-shadow:0 12px 28px rgba(0,0,0,0.45);';
    panel.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div style="font-size:17px; font-weight:700; color:#e5efff;">홀씨 모드 선택</div><button id="spore-overlay-close" style="background:#22365e; color:#d6e4ff; border:1px solid #4669a9; border-radius:8px; padding:4px 9px; cursor:pointer;">닫기</button></div><div style="color:#9fb4d1; font-size:13px; margin-bottom:10px;">오브 사용 시 적용할 홀씨 태그를 고르세요.${mycoLv >= 10 ? '' : ' 카오스/피해 태그는 균사학자 Lv.10에 해금됩니다.'}</div>`;

    let buttons = document.createElement('div');
    buttons.style.cssText = 'display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px;';
    modeOptions.forEach(opt => {
        let btn = document.createElement('button');
        let selected = cur === opt.id;
        btn.type = 'button';
        btn.textContent = opt.label + (selected ? ' ✓' : '');
        btn.style.cssText = `padding:10px 8px; border-radius:9px; border:1px solid ${selected ? '#89a7ff' : '#3f547f'}; background:${selected ? '#304f91' : '#1d2e4f'}; color:${selected ? '#ffffff' : '#d6e3ff'}; cursor:pointer; font-weight:700;`;
        btn.onclick = () => {
            game.sporeCraftModes[currencyKey] = opt.id;
            updateStaticUI();
            overlay.remove();
        };
        buttons.appendChild(btn);
    });

    panel.appendChild(buttons);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    let closeBtn = panel.querySelector('#spore-overlay-close');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();
}
window.openSporeModeOverlay = openSporeModeOverlay;

function showCurrencyCardTooltip(event, key, reason) {
    let orb = ORB_DB[key];
    if (!orb) return;
    let html = `<div class="tooltip-title">${orb.name}</div><div class="tooltip-line">${orb.desc || ''}</div><div class="tooltip-line" style="margin-top:6px; color:#9fb4d1;">상태: ${reason || '-'}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#f1c40f');
}
window.showCurrencyCardTooltip = showCurrencyCardTooltip;
window.showOrbTooltip = showCurrencyCardTooltip;

function buildCraftActionButtons(item) {
    let v = getCraftActionValidators(item);
    let defs = [
        { key:'honey', label:'🍯 벌꿀 고정', onclick:'applyEnchantedHoneyToSelectedItem()' },
        { key:'stinger', label:'🦂 독벌침 부여', onclick:'applyVenomStingerToSelectedItem()' },
        { key:'baseUpgrade', label:'⬆️ 베이스 업그레이드', onclick:'upgradeSelectedItemBase()' }
    ];
    return defs.map(d => `<button onclick="${d.onclick}" ${v[d.key] ? '' : 'disabled'}>${d.label}</button>`).join('');
}

    let selectedItem = getSelectedCraftItem();
    renderCraftSelectedSummary(selectedItem);
    let forgeHtml = '아이템을 클릭하여 선택';
    if (selectedItem) {
        let lines = [];
        (selectedItem.baseStats || []).forEach(stat => lines.push(`<div class="tooltip-line" style="color:#95a5a6">${stat.statName} +${formatValue(stat.id, stat.val)}</div>`));
        let selectedExplicitStats = (selectedItem.stats || []).slice();
        if (selectedItem.chaosInfusion) selectedExplicitStats.push({ ...selectedItem.chaosInfusion, statName: `[주입] ${selectedItem.chaosInfusion.statName || getStatName(selectedItem.chaosInfusion.id)}` });
        selectedExplicitStats.forEach(stat => {
            let tierText = stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let honeyTag = stat.lockedByHoney ? ` <span style="color:#ffd166; font-weight:700;">[고정됨]</span>` : '';
            let stingerTag = stat.venomStingerBonus ? ` <span style="color:#9bff9e;">[독벌침]</span>` : '';
            lines.push(`<div class="tooltip-line">${stat.statName} +${formatValue(stat.id, stat.val)}${tierText}${honeyTag}${stingerTag}</div>`);
        });
        if (selectedExplicitStats.length === 0) lines.push(`<div class="tooltip-line" style="color:#7f8c8d">추가 옵션 없음</div>`);
        if (selectedItem.encroached) {
            if (selectedItem.encroached.liberated && selectedItem.encroached.chosen) {
                let st = selectedItem.encroached.chosen;
                lines.push(`<div class="tooltip-line" style="color:#d7b8ff;">[잠식] ${st.statName || getStatName(st.id)} +${formatValue(st.id, st.val)} ${getTierBadgeHtml(st.tier || 10, 'T')}</div>`);
            } else {
                lines.push(`<div class="tooltip-line" style="color:#8d7bb3;">[잠식] 해방 전 효과 없음 · 제작으로 변하지 않음</div>`);
            }
        }
        let voidSocketHtml = '';
        let abyssSocketHtml = '';
        if (selectedItem.slot === '반지' || selectedItem.slot === '목걸이') {
            selectedItem.voidSocket = selectedItem.voidSocket || { open: false, jewel: null };
            if (!selectedItem.voidSocket.open) {
                voidSocketHtml = `<button onclick="applyVoidChiselToSelectedItem()" ${(game.currencies.voidChisel||0)<=0?'disabled':''}>🕳️ 공허 소켓 생성</button>`;
            } else if (selectedItem.voidSocket.jewel) {
                voidSocketHtml = `<div style="color:#9fd6ff;">소켓 주얼: <span class="${getJewelRarityClass(selectedItem.voidSocket.jewel.rarity || 'normal')}" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'void',0)" onmousemove="showSocketedJewelTooltip(event,'void',0)" onmouseleave="hideInfoTooltip()">${selectedItem.voidSocket.jewel.name}</span></div><button onclick="removeJewelFromVoidSocket()" ${(game.currencies.voidChisel||0)<=0?'disabled':''}>주얼 제거(끌 1)</button>`;
            } else {
                let jewelBtns = (game.jewelInventory || []).map((j, i) => `<button onclick="insertJewelIntoVoidSocket(${i})">${j.name} 장착</button>`).join('');
                voidSocketHtml = `<div style="color:#9fd6ff;">빈 공허 소켓</div>${jewelBtns || '<div style="color:#7f8c8d;">장착 가능한 주얼 없음</div>'}`;
            }
        }
        let abyssCap = typeof getAbyssSocketCapacity === 'function' ? getAbyssSocketCapacity(selectedItem) : 0;
        if (abyssCap > 0) {
            if (typeof ensureAbyssSockets === 'function') ensureAbyssSockets(selectedItem);
            selectedItem.abyssSockets = Array.isArray(selectedItem.abyssSockets) ? selectedItem.abyssSockets : [];
            let makeBtn = `<div style="color:#9fd6ff;">심연 소켓: ${selectedItem.abyssSockets.length}/${abyssCap} (아이템 고유 옵션으로 제공)</div>`;
            let rows = selectedItem.abyssSockets.map((sock, sidx) => {
                if (sock && sock.jewel) {
                    let j = sock.jewel;
                    return `<div style="margin-top:4px; color:#9fd6ff;">심연 소켓 #${sidx + 1}: <span class="${getJewelRarityClass(j.rarity || 'normal')}" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'abyss',${sidx})" onmousemove="showSocketedJewelTooltip(event,'abyss',${sidx})" onmouseleave="hideInfoTooltip()">${j.name}</span></div>`;
                }
                let jewelBtns = (game.jewelInventory || []).map((j, i) => `<button data-info-tooltip-anchor="1" onmouseenter="showInfoTooltipHtml(event.clientX,event.clientY,buildJewelRangeTooltipHtml(game.jewelInventory[${i}]),'#7fb3ff')" onmousemove="showInfoTooltipHtml(event.clientX,event.clientY,buildJewelRangeTooltipHtml(game.jewelInventory[${i}]),'#7fb3ff')" onmouseleave="hideInfoTooltip()" onclick="insertJewelIntoAbyssSocket(${i}, ${sidx})">${j.name} 장착</button>`).join('');
                return `<div style="margin-top:4px; color:#9fd6ff;">심연 소켓 #${sidx + 1}: 빈 슬롯</div>${jewelBtns || '<div style="color:#7f8c8d;">장착 가능한 주얼 없음</div>'}`;
            }).join('');
            abyssSocketHtml = `<div class="craft-section-title">심연 소켓</div>${makeBtn}${rows}`;
        }
        forgeHtml = `<div class="item-title ${selectedItem.rarity}">[${selectedItem.slot.replace(/[12]/, '')}] ${selectedItem.name}${selectedItem.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}</div><div class="item-base-line">${selectedItem.baseName}</div><div class="craft-section-title">옵션</div>${lines.join('')}<div class="craft-section-title">베이스</div><div style="display:flex; gap:6px; margin-top:8px;"><button onclick="upgradeSelectedItemBase()">⬆️ 베이스 업그레이드</button></div><div style="margin-top:8px; display:grid; gap:6px;">${selectedItem.encroached && !selectedItem.encroached.liberated ? `<button onclick="liberateSelectedEncroachedItem()">🕳️ 잠식 해방</button>` : ''}${voidSocketHtml}${abyssSocketHtml}</div>`;
    }
    document.getElementById('forge-item-display').innerHTML = forgeHtml;
    document.getElementById('fossil-item-display').innerHTML = forgeHtml;
    let fossilButtons = [];
    let mycologistLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
    if ((game.currencies.fossil || 0) > 0) fossilButtons.push(`<button onclick="applyFossilCraft()">기본 화석 정제 (${game.currencies.fossil || 0})</button>`);
    if ((game.currencies.fossilPrimal || 0) > 0) fossilButtons.push(`<button onclick="restorePrimalFossil('normal')" ${mycologistLv < 4 ? 'disabled' : ''}>원시 화석 복원 (${game.currencies.fossilPrimal || 0})${mycologistLv < 4 ? ' · 균사학자 Lv.4 필요' : ''}</button>`);
    if ((game.currencies.fossilAncientPrimal || 0) > 0) fossilButtons.push(`<button onclick="restorePrimalFossil('ancient')" ${mycologistLv < 5 ? 'disabled' : ''}>원시 고대 화석 복원 (${game.currencies.fossilAncientPrimal || 0})${mycologistLv < 5 ? ' · 균사학자 Lv.5 필요' : ''}</button>`);
    FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).forEach(fossil => {
        fossilButtons.push(`<button onclick="applyFossilChaosCraft('${fossil.key}')" ${!selectedItem ? 'disabled' : ''}>${fossil.name} 사용 (${game.currencies[fossil.key] || 0})</button>`);
    });
    document.getElementById('ui-fossil-actions').innerHTML = fossilButtons.join('') || `<div style="color:#7f8c8d;">보유한 화석이 없습니다.</div>`;
    document.getElementById('ui-fossil-info').innerHTML = `<div style="margin-bottom:6px; color:#f1c67d;">원하는 옵션 1개가 확정인 카오스 재련</div>${FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).map(fossil => `<div style="margin-bottom:6px;"><strong>${fossil.name}</strong> - ${fossil.desc}</div>`).join('') || `<div style="color:#7f8c8d;">보유 중인 타입 화석이 없습니다.</div>`}<div style="margin-top:8px; color:#8fb6d9;">기본 화석 정제는 항상 가능하며, 균사학자 Lv.4부터 원시 화석(복원 전용), Lv.5부터 원시 고대 화석(태고 화석 추가/고급 재화 확률 증가)이 미궁에서 드랍됩니다. 화석 전용 옵션은 Lv.6부터 제작이 아니라 장비 드랍 시 일정 확률로 붙습니다.</div>`;

    let hiddenCurrencyKeys = new Set(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'bossCore', 'skyEssence', 'fossil', 'fossilPrimal', 'fossilAncientPrimal', 'fossilPrimordial', 'fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic', 'fossilAbyssal', 'sealShard', 'strongSealShard', 'radiantSealShard', 'jewelCore', 'jewelShard', 'hiveKey', 'meteorShard', 'incompleteStarWedge', 'starWedge', 'pollen', 'beeswax', 'starDust', 'awakenedEcho', 'trialKey3', 'runeShard', 'uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']);
    document.getElementById('ui-currency-grid').innerHTML = Object.keys(ORB_DB).filter(key => {
        if (hiddenCurrencyKeys.has(key)) return false;
        if (key === 'tainted') return (game.season || 1) >= 5 && (game.currencies[key] || 0) > 0;
        if (key === 'enchantedHoney' || key === 'venomStinger' || key === 'voidChisel') return (game.currencies[key] || 0) > 0;
        if (key === 'deepWhetstone' || key === 'rootIron' || key === 'jewelPolish') return (game.currencies[key] || 0) > 0;
        if (key === 'sporeFire' || key === 'sporeCold' || key === 'sporeLight') return false;
        return true;
    }).map(key => {
        let useBtn = '';
        if (key === 'enchantedHoney') useBtn = `<div style="display:flex; justify-content:flex-end; margin-top:6px;"><button onclick="applyEnchantedHoneyToSelectedItem()">사용</button></div>`;
        if (key === 'venomStinger') useBtn = `<div style="display:flex; justify-content:flex-end; margin-top:6px;"><button onclick="applyVenomStingerToSelectedItem()">사용</button></div>`;
        let sporeModes = game.sporeCraftModes || {};
        let modeLabelMap = { none: '미사용', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스', damage: '피해' };
        let isCraftOrb = ['transmute','augment','alteration','alchemy','exalted','regal','chaos','divine','scour','tainted','blessing'].includes(key);
        let canUseSporeMode = ['transmute','augment','alteration','alchemy','exalted','regal','chaos'].includes(key);
        let mode = sporeModes[key] || 'none';
        let reason = getCraftOrbUseState(key, getSelectedCraftItem()).reason;
        if (isCraftOrb) {
            let rightButtons = '';
            if (canUseSporeMode) rightButtons += `<button style="padding:6px 10px; font-size:0.9em; line-height:1; white-space:nowrap;" onclick="openSporeModeOverlay('${key}')">홀씨:${modeLabelMap[mode] || '미사용'}</button>`;
            rightButtons += `<button style="padding:6px 10px; font-size:0.9em; line-height:1; white-space:nowrap;" onclick="useCurrency('${key}')">사용</button>`;
            useBtn += `<div style="display:flex; justify-content:flex-end; margin-top:4px;"><div style="display:flex; flex-wrap:nowrap; align-items:center; gap:4px;">${rightButtons}</div></div>`;
        }
        let premiumGray = (key === 'deepWhetstone' || key === 'rootIron' || key === 'jewelPolish') ? 'style="background:linear-gradient(180deg,#656d78,#4f5660); -webkit-background-clip:text; background-clip:text; color:transparent; text-shadow:0 0 6px rgba(220,225,235,.2);"' : '';
        return `<div class="currency-card" onmouseenter="showCurrencyCardTooltip(event,'${key}','${reason.replace(/'/g, "\\'")}')" onmouseleave="hideInfoTooltip()"><div style="display:flex; justify-content:space-between; align-items:center; gap:8px;"><div class="currency-name" ${premiumGray}>${getStyledOrbName(key)}</div><div class="currency-count" style="margin:0; white-space:nowrap;">x <strong>${game.currencies[key] || 0}</strong></div></div>${useBtn}</div>`;
    }).join('');
    let sporeHost = document.getElementById('ui-spore-summary');
    if (sporeHost) {
        sporeHost.innerHTML = `<div style="border:1px solid #3d4f71; border-radius:10px; padding:8px; margin-bottom:8px; background:linear-gradient(160deg, rgba(39,51,86,0.25), rgba(16,22,38,0.5));">
            <div style="font-weight:700; color:#d7e6ff; margin-bottom:6px; font-size:0.92em;">🌱 홀씨 보유량</div>
            <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:6px;">
                <div style="padding:5px; border:1px solid #6b3a3a; border-radius:8px; color:#ff9f9f; font-size:0.86em;">화염 홀씨<br><strong>x ${game.currencies.sporeFire || 0}</strong></div>
                <div style="padding:5px; border:1px solid #3a5a7a; border-radius:8px; color:#9fd6ff; font-size:0.86em;">냉기 홀씨<br><strong>x ${game.currencies.sporeCold || 0}</strong></div>
                <div style="padding:5px; border:1px solid #7a6a2a; border-radius:8px; color:#ffe08a; font-size:0.86em;">번개 홀씨<br><strong>x ${game.currencies.sporeLight || 0}</strong></div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button onclick="applyCorruptSporeToSelectedItem()" ${typeof getExpertLevel === 'function' && getExpertLevel('mycologist') >= 7 ? '' : 'disabled'}>부패 홀씨 (각 8)</button>
                <button onclick="applyRiftSporeToSelectedItem()" ${typeof getExpertLevel === 'function' && getExpertLevel('mycologist') >= 9 ? '' : 'disabled'}>균열 홀씨 (화석1+각5)</button>
            </div>
        </div>`;
    }

    renderChaosInfuserPanel(selectedItem);
    renderCraftOrbActions(selectedItem);
    let fossilTabBtn = document.getElementById('btn-item-tab-fossil');
    if (fossilTabBtn) fossilTabBtn.style.display = (game.season || 1) >= 3 ? 'block' : 'none';
    let marketTabBtn = document.getElementById('btn-item-tab-market');
    if (marketTabBtn) marketTabBtn.style.display = isMarketUnlocked() ? 'block' : 'none';
    let infuserTabBtn = document.getElementById('btn-item-tab-infuser');
    let chaosInfuserOpen = typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked();
    if (infuserTabBtn) infuserTabBtn.style.display = chaosInfuserOpen ? 'block' : 'none';
    if (!isMarketUnlocked() && game.itemSubtab === 'item-tab-market') switchItemSubtab('item-tab-equip');
    if (!chaosInfuserOpen && game.itemSubtab === 'item-tab-infuser') switchItemSubtab('item-tab-equip');
    renderMarketUI();
    renderExpertiseUI();

    // 벌집 진행 상태 갱신은 UI 표시와 무관하게 항상 돌아야 한다.
    // (awaitingClear -> pendingChoice 전환이 여기서 처리됨)
    renderLoop8BeehivePanel();
    let mapTabActive = (document.getElementById('tab-map') || {}).classList.contains('active');
    if (mapTabActive) {
    let legacyMapOverview = document.querySelector('#tab-map .map-overview-card');
    if (legacyMapOverview) legacyMapOverview.remove();
    document.querySelectorAll('#tab-map img').forEach(node => node.remove());

    let seasonMapCap = typeof getVisibleHuntingMapCapZoneId === 'function' ? getVisibleHuntingMapCapZoneId() : Math.min(getCurrentSeasonFinalZoneId(), getAbyssZoneIdForDepth(20));
    let highestMapZone = Math.min(Math.max(0, Math.floor(game.maxZoneId || 0)), seasonMapCap);
    let mapZones = Array.from({ length: highestMapZone + 1 }, (_, idx) => getZone(idx)).filter(Boolean);
    let mapListHtml = mapZones.map(zone => {
        let idx = Number(zone.id);
        let current = idx === game.currentZoneId ? 'current' : '';
        let unlockReveal = idx === pendingMapRevealZoneId ? 'map-unlock-reveal' : '';
        let icon = zone.ele === 'fire' ? '🔥' : (zone.ele === 'cold' ? '❄️' : (zone.ele === 'light' ? '⚡' : (zone.ele === 'chaos' ? '☠️' : '🩸')));
        let rewardReady = (game.claimableActRewards || []).includes(idx);
        let rewardClaimed = (game.claimedActRewards || []).includes(idx);
        let isActRewardZone = zone.type === 'act' && idx <= 9;
        let chaos20Conquered = (getAbyssDepthFromZoneId(idx) === 20) && (
            !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared) ||
            (Array.isArray(game.abyssClearedDepths) && game.abyssClearedDepths.includes(20)) ||
            Math.floor(game.abyssEndlessDepth || 0) >= 21
        );
        let cleared = idx < game.maxZoneId || rewardReady || rewardClaimed || chaos20Conquered;
        let actionHtml = '';
        let mapZoneText = zone.name;
        if (zone.type === 'act') {
            let storyAct = getStoryActByZoneId(idx);
            if (storyAct) mapZoneText = `${zone.name}<br><span class="map-zone-status">보스: ${storyAct.bossName}</span>`;
        }
        if (isActRewardZone && rewardReady) actionHtml = `<button class="map-reward-btn" onclick="event.stopPropagation(); openActReward(${idx})">보상 받기</button>`;
        else if (isActRewardZone && rewardClaimed) actionHtml = `<button class="map-reward-btn claimed" disabled>보상 완료</button>`;
        else if (cleared) actionHtml = `<span class="map-zone-status">정복 완료</span>`;
        return `
            <div class="map-item ${current} ${unlockReveal}" onclick="changeZone(${idx})">
                <div class="map-item-main"><span>${icon}</span><span>${mapZoneText}</span></div>
                <div class="map-item-actions">${actionHtml}</div>
            </div>
        `;
    }).join('');
    if (lastRenderedMapListHtml !== mapListHtml) {
        document.getElementById('ui-map-list').innerHTML = mapListHtml;
        lastRenderedMapListHtml = mapListHtml;
    }

    let seasonBosses = SEASON_BOSS_ZONES.filter(zone => (game.season || 1) >= (zone.reqSeason || 2));
    document.getElementById('ui-season-boss-header').style.display = seasonBosses.length > 0 ? 'block' : 'none';
    let seasonBossRepeatWrap = document.getElementById('ui-season-boss-repeat-wrap');
    let seasonBossRepeatBtn = document.getElementById('btn-season-boss-repeat');
    if (seasonBossRepeatWrap) seasonBossRepeatWrap.style.display = 'none';
    if (seasonBossRepeatBtn) {
        seasonBossRepeatBtn.style.display = seasonBosses.length > 0 ? 'inline-block' : 'none';
        seasonBossRepeatBtn.innerText = `반복 도전 ${game.autoRepeatSeasonBoss ? 'ON' : 'OFF'}`;
        seasonBossRepeatBtn.style.background = game.autoRepeatSeasonBoss ? '#2f6a42' : '#5b4a2f';
        seasonBossRepeatBtn.style.minWidth = '0';
    }
    document.getElementById('ui-season-boss-list').innerHTML = seasonBosses.map(zone => {
        let keys = game.currencies[zone.key] || 0;
        let disabled = keys <= 0;
        return `<div class="map-item ${game.currentZoneId === zone.id ? 'current' : ''}" ${disabled ? '' : `onclick="changeZone('${zone.id}')"`}>
            <div class="map-item-main"><span>🗝️</span><span>${zone.name}</span></div>
            <div class="map-item-actions"><span class="map-zone-status">${ORB_DB[zone.key].name}: ${keys}</span></div>
        </div>`;
    }).join('');

    let labyrinthOpen = (game.season || 1) >= 3;
    document.getElementById('ui-labyrinth-header').style.display = labyrinthOpen ? 'block' : 'none';
    if (labyrinthOpen) {
        let maxFloor = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        document.getElementById('ui-labyrinth-list').innerHTML = `<div class="map-item ${game.currentZoneId === LABYRINTH_ZONE_ID ? 'current' : ''}" onclick="enterLabyrinthPrompt()">
            <div class="map-item-main"><span>🏛️</span><span>고대 미궁 ${game.labyrinthFloor || 1}층</span></div>
            <div class="map-item-actions"><span class="map-zone-status">미궁 화석: ${game.currencies.fossil || 0}</span></div>
        </div><div class="map-item-actions"><span class="map-zone-status">해금 최고층: ${maxFloor}층 · 클릭하여 층수 선택 입장</span></div></div>`;
    } else document.getElementById('ui-labyrinth-list').innerHTML = '';

    let deepChaosOpen = (game.season || 1) >= 10 && (typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear() : !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared));
    document.getElementById('ui-deep-chaos-header').style.display = deepChaosOpen ? 'block' : 'none';
    if (deepChaosOpen) {
        let unlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21).sort((a, b) => a - b) : [];
        let highestDepth = Math.max(21, unlockedDepths.length > 0 ? unlockedDepths[unlockedDepths.length - 1] : Math.floor(game.abyssEndlessDepth || 21));
        document.getElementById('ui-deep-chaos-list').innerHTML = `<div class="map-item ${getAbyssDepthFromZoneId(game.currentZoneId) >= 21 ? 'current' : ''}" onclick="enterDeepChaosPrompt()">
            <div class="map-item-main"><span>♾️</span><span>혼돈 심화층<br><span class="map-zone-status">현재 심화층: ${Math.floor(game.abyssEndlessDepth || 21)}층 · 최고 기록: ${highestDepth}층</span></span></div>
            <div class="map-item-actions"><span class="map-zone-status">입장 가능: 21 ~ ${highestDepth}</span></div>
        </div><div class="map-item-actions"><span class="map-zone-status">클릭하여 심화 층수 선택 입장</span></div></div>`;
    } else document.getElementById('ui-deep-chaos-list').innerHTML = '';

    let meteorUnlocked = !!(game.starWedge && game.starWedge.unlocked);
    let meteorReady = !!(game.starWedge && game.starWedge.skyRiftReady);
    let meteorGauge = Math.floor((game.starWedge && game.starWedge.skyRiftGauge) || 0);
    document.getElementById('ui-meteor-header').style.display = meteorUnlocked ? 'block' : 'none';
    
    let meteorAutoBtn = document.getElementById('btn-meteor-auto-enter');
    if (meteorAutoBtn) {
        meteorAutoBtn.style.display = meteorUnlocked ? 'inline-block' : 'none';
        meteorAutoBtn.innerText = `자동입장 ${game.settings.autoEnterMeteor ? 'ON' : 'OFF'}`;
    }

    document.getElementById('ui-meteor-list').innerHTML = meteorUnlocked ? `<div class="map-item ${game.currentZoneId === METEOR_FALL_ZONE_ID ? 'current' : ''}" ${meteorReady ? `onclick="changeZone('${METEOR_FALL_ZONE_ID}')"` : ''}>
        <div class="map-item-main"><span>☄️</span><span>운석 낙하 지점<br><span class="map-zone-status">하늘의 균열 ${meteorGauge}% ${meteorReady ? '· 입장 가능' : '· 충전 중'}</span></span></div>
        <div class="map-item-actions" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;"><span class="map-zone-status">난이도: 혼돈 ${Math.max(1, Math.floor((game.starWedge && game.starWedge.skyRiftMinTier) || 1))}</span></div>
    </div>` : '';

    renderChaosRealmMapPanel();
    renderUnderworldMapPanel();

    let availTrials = TRIAL_ZONES.filter(trial => (trial.reqZone !== -1 && game.maxZoneId >= trial.reqZone) || game.unlockedTrials.includes(trial.id));
    document.getElementById('ui-trials-header').style.display = availTrials.length > 0 ? 'block' : 'none';

    renderLoop9VoidRiftPanel();
    document.getElementById('ui-trial-list').innerHTML = availTrials.map(trial => {
        let isCurrent = game.currentZoneId === trial.id;
        let isCompleted = game.completedTrials.includes(trial.id);
        let needsTicket = isCompleted && (trial.id === 'trial_3' || trial.id === 'trial_4');
        let hasTicket = (game.currencies.trialKey3 || 0) > 0;
        let cls = isCurrent ? 'current' : 'trial';
        if (isCompleted) cls = '';
        return `<div class="map-item ${cls}" ${(isCompleted && needsTicket && !hasTicket) ? '' : `onclick="${(isCompleted && needsTicket) ? `enterTrialWithTicket('${trial.id}')` : `changeZone('${trial.id}')`}"`}><span>${trial.name} ${isCompleted ? '(완료)' : ''}</span><span style="font-size:0.8em; font-weight:normal;">${isCompleted ? (needsTicket ? `재도전권 ${game.currencies.trialKey3||0}` : '✔️') : '도전하기'}</span></div>`;
    }).join('');
    }

    let seasonVisible = game.season > 1 || game.seasonPoints > 0;
    document.getElementById('trait-season-section').style.display = seasonVisible ? 'block' : 'none';
    document.getElementById('season-content-section').style.display = seasonVisible ? 'block' : 'none';
    let mapAbyssUnlocked = (game.maxZoneId || 0) >= ABYSS_START_ZONE_ID;
    let mapAbyssBtn = document.getElementById('btn-map-tab-abyss');
    if (mapAbyssBtn) mapAbyssBtn.style.display = mapAbyssUnlocked ? 'block' : 'none';
    if (!mapAbyssUnlocked && game.mapSubtab === 'map-tab-abyss') game.mapSubtab = 'map-tab-zones';
    if (mapAbyssUnlocked) {
        let abyssState = getAbyssPassiveState();
        let total = Math.max(0, Math.floor(game.abyssPassivePoints || 0));
        let spent = getAbyssPassiveSpent();
        let free = getAbyssPassiveFreePoints();
        let cleared = (game.abyssClearedDepths || []).length;
        document.getElementById('ui-abyss-passive-summary').innerHTML = `획득 포인트 <strong>${total}</strong> / 사용 <strong>${spent}</strong> / 남은 <strong>${free}</strong> · 밝혀낸 혼돈 ${cleared}개`;
        document.getElementById('ui-abyss-passive-grid').innerHTML = ABYSS_PASSIVE_NODES.map(node => {
            let rank = Math.max(0, Math.floor(abyssState[node.key] || 0));
            let pointCost = Math.max(1, Math.floor(node.cost || 1));
            let disabled = free < pointCost || rank >= node.max;
            return `<div style="background:#141e2b; border:1px solid #2e4361; border-radius:10px; padding:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
                    <strong style="color:#d5e7fa;">${node.name}</strong><span style="color:#f8d37c; font-weight:700;">${rank}/${node.max}</span>
                </div>
                <div style="font-size:0.82em; color:#9ec0df; min-height:34px; margin-bottom:8px;">${node.desc}</div>
                <button style="width:100%;" onclick="tryAllocateAbyssPassive('${node.key}')" ${disabled ? 'disabled' : ''}>+1 투자 (비용 ${pointCost})</button>
            </div>`;
        }).join('');
        let loop10Panel = document.getElementById('ui-loop10-panel');
        if (loop10Panel) {
            let loop10Open = (game.season || 1) >= 10;
            loop10Panel.style.display = loop10Open ? 'block' : 'none';
            if (loop10Open) {
                game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
                game.loopProgressBase = game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
                game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false };
                let loopRequirementMet = (typeof hasCurrentLoopChaos20Clear === 'function') ? hasCurrentLoopChaos20Clear() : !!game.loopProgressCurrent.chaos20Cleared;
                let loopRequirementText = getLoopAbyssRequirementText(game.season || 1);
                let unlockedDepthsForReward = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : []; let highestUnlockedForReward = unlockedDepthsForReward.length > 0 ? Math.max(...unlockedDepthsForReward) : Math.floor(game.abyssEndlessDepth || 20); let clearedDepthForReward = Math.max(20, highestUnlockedForReward >= 21 ? (highestUnlockedForReward - 1) : highestUnlockedForReward); let expectedDepthGain = Math.max(0, Math.floor(clearedDepthForReward - (game.loopProgressBase.abyssEndlessDepth || 20)));
                let expectedLabGain = Math.max(0, Math.floor((game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1) - (game.loopProgressBase.labyrinthUnlockedMaxFloor || 1)));
                let expectedBossGain = (game.loopProgressCurrent.specialBosses || []).filter(id => !(game.loopProgressBase.specialBosses || []).includes(id)).length;
                let woodsmanScore = Math.max(0, Math.floor(game.woodsmanPendingScore || 0));
                let woodsmanSettled = Math.max(0, Math.floor(game.woodsmanSettledScore || 0));
                let expectedWoodsmanGain = Math.floor(Math.sqrt(Math.max(0, woodsmanScore - woodsmanSettled)) / 25);
                let deepStats = game.loopDeepStats || {};
                let deepTotalLine = `총합 보너스: 생명력 +${Math.floor((deepStats.flatHp||0)*10)}, 피해 +${Math.floor((deepStats.flatDmg||0)*2)}, 공속 +${((deepStats.aspd||0)*1.2).toFixed(1)}%, 이속 +${((deepStats.move||0)*0.8).toFixed(1)}%, 물피감 +${((deepStats.dr||0)*0.5).toFixed(1)}%, 치명 +${((deepStats.crit||0)*0.6).toFixed(1)}%`;
                loop10Panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:8px;"><div><div style="color:#eedbff; font-weight:700; font-size:1.05em;">∞ 혼돈 심화 등반</div><div style="color:#aebde0; font-size:0.82em;">${loopRequirementText} 이후 무한 등반 · 현재 심화층 <strong style="color:#ffd68a;">${Math.floor(game.abyssEndlessDepth || 20)}</strong></div></div><div style="color:#e8dcff;">심화 루프 포인트: <strong style="color:#ffd68a;">${game.loopDeepPoints || 0}</strong></div></div>
                <div style="background:linear-gradient(160deg, rgba(84,59,136,0.22), rgba(26,31,56,0.35)); border:1px solid #5f4a93; border-radius:10px; padding:10px; margin-bottom:8px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap;"><button onclick="triggerSeasonReset()" ${loopRequirementMet ? '' : 'disabled'}>지금 즉시 루프</button><button class="ominous-entry-btn" onclick="enterOutsideChaos()" ${(game.season||1)>=10 && loopRequirementMet?'':'disabled'}>☠️ 혼돈 밖 진입</button></div>
                    <div style="margin-top:6px; color:#9fb4d1;">기록된 층수 재진입</div><div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;"><button onclick="enterDeepChaosPrompt()" ${loopRequirementMet ? '' : 'disabled'}>심화 혼돈 층수 선택 입장</button><span style="color:#9fb4d1;">21 ~ ${Math.max(21, Math.floor(game.abyssEndlessDepth || 20))}${loopRequirementMet ? '' : ` (${loopRequirementText} 필요)`}</span></div>
                </div>
                <div style="margin-top:6px; color:#e0d4ff;">다음 루프 예상 획득: 혼돈심화 +${expectedDepthGain}층, 미궁 +${expectedLabGain}층, 특수보스 +${expectedBossGain}종, 나무꾼 +${expectedWoodsmanGain}</div>
                <div style="margin-top:4px; color:#9ec4f0;">${deepTotalLine}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">${['flatHp','flatDmg','aspd','move','dr','crit'].map(key => `<button onclick="allocateLoopDeepStat('${key}')">심화 ${getStatName(key)} Lv.${(game.loopDeepStats||{})[key]||0} (+ 비용 ${getLoopDeepStatCost(key)})</button>`).join('')}</div>`;
            }
        }
    } else {
        document.getElementById('ui-abyss-passive-summary').innerHTML = `<span style="color:#7f8c8d;">혼돈(지도 ${ABYSS_START_ZONE_ID}번 이후)부터 개방됩니다.</span>`;
        document.getElementById('ui-abyss-passive-grid').innerHTML = '';
        let loop10Panel = document.getElementById('ui-loop10-panel');
        if (loop10Panel) {
            let loop10Open = (game.season || 1) >= 10;
            loop10Panel.style.display = loop10Open ? 'block' : 'none';
            if (loop10Open) {
                let deepStats = game.loopDeepStats || {};
                let deepTotalLine = `총합 보너스: 생명력 +${Math.floor((deepStats.flatHp||0)*10)}, 피해 +${Math.floor((deepStats.flatDmg||0)*2)}, 공속 +${((deepStats.aspd||0)*1.2).toFixed(1)}%, 이속 +${((deepStats.move||0)*0.8).toFixed(1)}%, 물피감 +${((deepStats.dr||0)*0.5).toFixed(1)}%, 치명 +${((deepStats.crit||0)*0.6).toFixed(1)}%`;
                loop10Panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:8px;"><div><div style="color:#eedbff; font-weight:700; font-size:1.05em;">∞ 혼돈 심화 등반</div><div style="color:#aebde0; font-size:0.82em;">루프 조건 달성 후 해금됩니다.</div></div><div style="color:#e8dcff;">심화 루프 포인트: <strong style="color:#ffd68a;">${game.loopDeepPoints || 0}</strong></div></div><div style="margin-top:4px; color:#9ec4f0;">${deepTotalLine}</div><div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">${['flatHp','flatDmg','aspd','move','dr','crit'].map(key => `<button onclick="allocateLoopDeepStat('${key}')">심화 ${getStatName(key)} Lv.${(game.loopDeepStats||{})[key]||0} (+ 비용 ${getLoopDeepStatCost(key)})</button>`).join('')}</div>`;
            }
        }
    }
    let seasonRoadmapKeys = (game.unlockedSeasonContents || []).map(id => parseInt(String(id).replace('season_', ''), 10)).filter(v => Number.isFinite(v) && v >= 1).sort((a, b) => a - b);
    document.getElementById('ui-season-content-roadmap').innerHTML = seasonRoadmapKeys.map(seasonNum => {
        let def = SEASON_CONTENT_ROADMAP[seasonNum];
        if (!def) return '';
        let unlocked = seasonNum <= game.season;
        let current = seasonNum === game.season;
        let stateColor = current ? '#f1c40f' : (unlocked ? '#2ecc71' : '#7f8c8d');
        let stateText = current ? '진행 중' : (unlocked ? '해금됨' : '잠김');
        let reqText = getLoopAbyssRequirementText(seasonNum);
        return `<div style="background:#121822; border:1px solid ${stateColor}; border-radius:8px; padding:10px 12px;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
                <strong style="color:${stateColor};">루프 ${seasonNum} - ${def.title}</strong><span style="color:${stateColor}; font-size:0.8em;">${stateText}</span>
            </div>
            <div style="color:#a8bdd3; font-size:0.82em; line-height:1.5;">• ${reqText}<br>${(def.features || []).map(v => `• ${v}`).join('<br>')}</div>
        </div>`;
    }).join('') || `<div style="color:#7f8c8d;">루프 1을 클리어하면 루프 이정표가 열립니다.</div>`;
    let renderSeasonNode = id => {
        let node = SEASON_NODES[id];
        let lv = getSeasonNodeLevel(id);
        let active = lv > 0;
        let evolved = isSeasonTreeEvolved();
        let cap = evolved ? 5 : 1;
        let reqMet = isSeasonNodeRequirementMet(node);
        let lockedHint = !!node.req && !reqMet ? `<br><span style="color:#d39ca7;">🔒 연결된 이전 노드를 먼저 활성화하세요</span>` : '';
        let statInfo = P_STATS[node.stat] || {};
        let suffix = statInfo.isPct ? '%' : '';
        let scaled = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
        let levelText = active ? ` (${lv}/${cap})` : '';
        let effectText = `${statInfo.name || node.stat} +${formatValue(node.stat, scaled)}${suffix}${levelText}`;
        let refundLink = active ? `<br><span style=\"color:#e4b4b4; font-size:0.78em; text-decoration:underline; cursor:pointer;\" onclick=\"event.stopPropagation(); askRefundSeasonNode('${id}')\">환불</span>` : '';
        return `<div class=\"trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}\" ${reqMet ? `onclick=\"buySeason('${id}')\"` : ''}><div class=\"trait-title\">${node.name}</div><div class=\"trait-desc\">${node.desc}${lockedHint}<br><span style=\"color:#9bb9d4;\">${effectText}</span>${refundLink}</div></div>`;
    };
    let visibleSeasonRows = SEASON_NODE_ROWS.filter((row, idx) => idx < 4 || (game.season || 1) >= 5);
    document.getElementById('ui-season-tree').innerHTML = visibleSeasonRows.map(row => `<div class="trait-row">${row.map(renderSeasonNode).join('')}</div>`).join('');

    if (game.ascendClass) {
        document.getElementById('ui-class-select').style.display = 'none';
        document.getElementById('ui-class-locked').style.display = 'none';
        document.getElementById('ui-class-tree').style.display = 'block';
        document.getElementById('ui-selected-class-name').innerText = `[ ${CLASS_TEMPLATES[game.ascendClass].name} ]`;
        let tree = getClassTreeDef(game.ascendClass);
        let renderAscend = id => {
            let node = tree[id];
            if (!node) return '';
            let active = game.ascendNodes.includes(id);
            let reqMet = isAscendNodeRequirementMet(node);
            let statInfo = P_STATS[node.stat];
            let desc = node.stat === 'suppCap' ? '보조스킬 장착 한도 +1' : `${statInfo.name} +${node.val}${statInfo.isPct ? '%' : ''}`;
            let title = id === 'n10' ? '👑 궁극기' : ((id === 'n11' || id === 'n12') ? '💠 4차 핵심' : statInfo.name);
            return `<div class="trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}" ${active ? `onclick="refundAscendNode('${id}')"` : (!reqMet ? '' : `onclick="buyAscend('${id}')"`)}><div class="trait-title">${title}</div><div class="trait-desc">${desc}</div></div>`;
        };
        let coreRow = (tree.n11 || tree.n12) ? `<div class="trait-row">${renderAscend('n11')}${renderAscend('n12')}</div>` : '';
        document.getElementById('ui-ascend-tree-container').innerHTML = `<div class="trait-row">${renderAscend('n1')}</div><div class="trait-row">${renderAscend('n2')}${renderAscend('n3')}</div><div class="trait-row">${renderAscend('n4')}${renderAscend('n5')}${renderAscend('n6')}</div><div class="trait-row">${renderAscend('n7')}${renderAscend('n8')}${renderAscend('n9')}</div><div class="trait-row">${renderAscend('n10')}</div>${coreRow}`;
        let kDefs = getClassKeystoneDefs(game.ascendClass);
        if (kDefs.length > 0) {
            game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
            let kRows = [];
            for (let i = 0; i < kDefs.length; i += 2) kRows.push(kDefs.slice(i, i + 2));
            let kPts = Math.max(0, Math.floor(game.ascendKeystonePoints || 0));
            let kHtml = `<div style="margin-top:12px; color:#f0d7a6; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;"><span>키스톤 선택 (${game.ascendKeystones.length}/${CLASS_KEYSTONE_PICK_LIMIT}) · 보유 포인트 ${kPts}</span><button onclick="resetAscendKeystones()" style="padding:3px 8px; font-size:0.75em;">키스톤 초기화</button></div><div style="font-size:0.78em; color:#a7bdd9; margin-top:4px;">해제 비용: 정화의 오브 1개 · 전체 초기화 비용: 선택 개수만큼</div>` + kRows.map(row => `<div class="trait-row">${row.map(k => { let active = game.ascendKeystones.includes(k.id); let reqMet = isAscendKeystoneRequirementMet(k); return `<div class="trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}" ${active ? `onclick="refundAscendKeystone('${k.id}')"` : (!reqMet || game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT || kPts <= 0 ? '' : `onclick="buyAscendKeystone('${k.id}')"`)}><div class="trait-title">★ ${k.name}${active ? ' ✓' : ''}</div><div class="trait-desc">${k.desc}${active ? '<br><span style="color:#9bc7ff;">(클릭 시 해제)</span>' : ''}</div></div>`; }).join('')}</div>`).join('');
            document.getElementById('ui-ascend-tree-container').innerHTML += kHtml;
        }
    } else if (game.ascendPoints > 0) {
        document.getElementById('ui-class-select').style.display = 'block';
        document.getElementById('ui-class-locked').style.display = 'none';
        document.getElementById('ui-class-tree').style.display = 'none';
        document.getElementById('ui-class-grid').innerHTML = Object.keys(CLASS_TEMPLATES).map(key => `<div class="class-card" onclick="selectClass('${key}')"><div style="font-weight:bold; color:#f1c40f; margin-bottom:5px;">${CLASS_TEMPLATES[key].name}</div><div style="font-size:0.85em; color:#aaa;">${CLASS_TEMPLATES[key].desc}</div></div>`).join('');
    } else {
        document.getElementById('ui-class-select').style.display = 'none';
        document.getElementById('ui-class-locked').style.display = 'block';
        document.getElementById('ui-class-tree').style.display = 'none';
    }

    let foldAttackInactive = !!game.gemFoldInactiveAttack;
    let foldSupportInactive = !!game.gemFoldInactiveSupport;
    let foldActiveBtn = document.getElementById('btn-skill-fold-active');
    let foldAttackBtn = document.getElementById('btn-skill-fold-inactive-attack');
    let foldSupportBtn = document.getElementById('btn-skill-fold-inactive-support');
    if (foldActiveBtn) foldActiveBtn.style.background = (!foldAttackInactive && !foldSupportInactive) ? '#2f6a42' : '#2c3e50';
    if (foldAttackBtn) foldAttackBtn.style.background = foldAttackInactive ? '#2f6a42' : '#2c3e50';
    if (foldSupportBtn) foldSupportBtn.style.background = foldSupportInactive ? '#2f6a42' : '#2c3e50';
    let resonancePower = getEffectiveResonanceCap();
    let sealedSkills = Array.isArray(game.sealedSkills) ? game.sealedSkills : [];
    let sealedSupports = Array.isArray(game.sealedSupports) ? game.sealedSupports : [];
    let skillsHtml = game.skills.filter(name => {
        if (!foldAttackInactive) return true;
        return name === game.activeSkill;
    }).map(name => {
        let active = name === game.activeSkill ? 'active' : '';
        let badge = '';
        let gemInfo = getGemPresentation(name, false);
        if (SKILL_DB[name].isGem || SKILL_DB[name].levelable) badge = `<span class="gem-level-badge ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${gemInfo.totalLevel}</span>`;
        let sealBtn = name === game.activeSkill ? '' : `<button style="margin-left:6px; font-size:0.7em; padding:2px 6px;" onclick="event.stopPropagation(); sealSkillGem('${name}')">🔒 봉인</button>`;
        return `<div class="skill-gem ${active}" onclick="changeSkill('${name}')" onmouseover="showGemTooltip(event,'active','${name}')" onmouseenter="showGemTooltip(event,'active','${name}')" onmousemove="showGemTooltip(event,'active','${name}')" onmouseleave="hideInfoTooltip()"><strong>${escapeHTML(name)}</strong>${badge}${sealBtn}</div>`;
    }).join('');
    if (!foldAttackInactive) skillsHtml += `<div style="margin-top:6px;"><button style="width:100%; font-size:0.75em; padding:4px 8px;" onclick="sealAllInactiveSkillGems()">미사용 젬 일괄 봉인</button></div>`;
    if (sealedSkills.length > 0 && !foldAttackInactive) skillsHtml += sealedSkills.map(name => `<div class="skill-gem" style="opacity:0.78;"><strong>🔒 ${escapeHTML(name)}</strong><button style="margin-left:6px; font-size:0.7em; padding:2px 6px;" onclick="unsealSkillGem('${name}')">해제 (공명 -1)</button></div>`).join('');
    let skillsListEl = document.getElementById('ui-skills-list');
    if (skillsListEl && skillsListEl.dataset.renderSig !== skillsHtml) {
        skillsListEl.innerHTML = skillsHtml;
        skillsListEl.dataset.renderSig = skillsHtml;
    }

    let suppCountEl = document.getElementById('ui-supp-count');
    let suppMaxEl = document.getElementById('ui-supp-max');
    let suppResonanceEl = document.getElementById('ui-resonance');
    if (suppCountEl) suppCountEl.innerText = game.equippedSupports.length;
    if (suppMaxEl) suppMaxEl.innerText = pStats.suppCap;
    if (suppResonanceEl) {
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        suppResonanceEl.innerText = `${Math.max(0, Math.floor(game.resonancePower || 0) - used)}`;
    }
    let supportHtml = game.supports.filter(name => {
        if (!foldSupportInactive) return true;
        return game.equippedSupports.includes(name);
    }).map(name => {
        let active = game.equippedSupports.includes(name) ? 'active' : '';
        let gemInfo = getGemPresentation(name, true);
        let unlockedTier = Math.max(1, Math.min(3, Math.floor((((game.supportGemData || {})[name]) || {}).unlockedTier || 1)));
        let activeTier = getSupportActiveTier(name);
        let tierLabel = activeTier === 3 ? '상급' : activeTier === 2 ? '중급' : '하급';
        let cost = getSupportTierResonanceCost(name);
        let sealBtn = active ? '' : `<button style="margin-left:4px; font-size:0.66em; padding:1px 4px;" onclick="event.stopPropagation(); sealSupportGem('${name}')">🔒 봉인</button>`;
        let tierBtns = [1,2,3].map(t => `<button style="font-size:0.62em; padding:1px 3px; ${t<=unlockedTier?'':'opacity:.4;'}" onclick="event.stopPropagation(); setSupportActiveTier('${name}', ${t})" ${t<=unlockedTier?'':'disabled'}>${t===1?'하':t===2?'중':'상'}</button>`).join('');
        return `<div class="skill-gem support-gem ${active}" onclick="toggleSupport('${name}')" onmouseover="showGemTooltip(event,'support','${name}')" onmouseenter="showGemTooltip(event,'support','${name}')" onmousemove="showGemTooltip(event,'support','${name}')" onmouseleave="hideInfoTooltip()"><strong>${escapeHTML(name)}</strong><span class="gem-level-badge ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">${tierLabel} · Lv.${gemInfo.totalLevel} · 공명 ${cost}</span><span style="display:inline-flex; gap:2px; margin-left:4px;">${tierBtns}</span>${sealBtn}</div>`;
    }).join('');
    if (!foldSupportInactive) supportHtml += `<div style="margin-top:6px;"><button style="width:100%; font-size:0.75em; padding:4px 8px;" onclick="sealAllInactiveSupportGems()">미사용 젬 일괄 봉인</button></div>`;
    if (sealedSupports.length > 0 && !foldSupportInactive) supportHtml += sealedSupports.map(name => `<div class="skill-gem support-gem" style="opacity:0.78;"><strong>🔒 ${escapeHTML(name)}</strong><button style="margin-left:6px; font-size:0.7em; padding:2px 6px;" onclick="unsealSupportGem('${name}')">해제 (공명 -1)</button></div>`).join('');
    let supportListEl = document.getElementById('ui-support-list');
    if (supportListEl && supportListEl.dataset.renderSig !== supportHtml) {
        supportListEl.innerHTML = supportHtml;
        supportListEl.dataset.renderSig = supportHtml;
    }

    let suppHeader = document.querySelector('#tab-skills #skill-tab-equip h2');
    if (suppHeader) suppHeader.title = `공명력 ${resonancePower}`;

    renderUniqueCodexUI();
    let gemEnhanceOpen = !!game.gemEnhanceUnlocked;
    let gemEnhanceHeader = document.getElementById('ui-gem-enhance-header');
    let gemEnhancePanel = document.getElementById('ui-gem-enhance-panel');
    let skillEnhanceBtn = document.getElementById('btn-skill-tab-enhance');
    if (gemEnhanceHeader && gemEnhancePanel) {
        gemEnhanceHeader.style.display = gemEnhanceOpen ? 'block' : 'none';
        gemEnhancePanel.style.display = gemEnhanceOpen ? 'block' : 'none';
        if (skillEnhanceBtn) {
            skillEnhanceBtn.disabled = !gemEnhanceOpen;
            skillEnhanceBtn.style.opacity = gemEnhanceOpen ? '1' : '0.45';
            skillEnhanceBtn.title = gemEnhanceOpen ? '' : '군주의 핵 또는 창공의 힘을 처음 획득하면 개방됩니다.';
        }
        if (!gemEnhanceOpen && game.skillSubtab === 'skill-tab-enhance') game.skillSubtab = 'skill-tab-equip';
        if (gemEnhanceOpen) {
            let active = game.activeSkill;
            let isGem = !!(SKILL_DB[active] && SKILL_DB[active].isGem);
            let activeEnh = getSkyEnhancementForSkill(active);
            let activeGem = isGem ? normalizeGemRecord((game.gemData || {})[active]) : null;
            let bossNeed = activeGem ? ((activeGem.bossCoreLevel || 0) + 1) : 1;
            let gemExpertLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1;
            let qualityNeed = activeGem ? Math.max(1, Math.floor(1 + Math.floor((activeGem.quality || 0) / 5))) : 1;
            let awakenReady = !!(activeGem && !activeGem.awakened && (activeGem.level || 1) >= 20 && gemExpertLv >= 15);
            let skyNeed = activeGem ? ((activeGem.skyCoreLevel || 0) + 1) : 1;
            let engraveCap = activeGem ? (activeGem.skyEnhanceCap || 1) : 1;
            let capNeed = activeGem ? (engraveCap + 1) : 2;
            let coreDone = !!(activeGem && activeGem.bossCoreLevel >= 5 && activeGem.skyCoreLevel >= 5);
            let slotDone = !!(activeGem && engraveCap >= 5);
            let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
            document.getElementById('ui-gem-enhance-target').innerHTML = isGem
                ? `대상 젬: <strong>${active}</strong> (보유 창공의 힘: ${game.currencies.skyEssence || 0})<br><span style="color:#8aa4bf;">핵 강화: 군주의핵 ${activeGem.bossCoreLevel || 0}/5 · 창공의힘 ${activeGem.skyCoreLevel || 0}/5 · 퀄리티 ${activeGem.quality || 0}%${activeGem.awakened ? ' · 각성 젬' : ''} · 각인 슬롯 ${engraveCap}/5</span><div style="margin-top:4px; color:#b9d7ff; font-size:0.84em;">각성 각인은 각성 젬 전용이 아니며, 모든 공격 젬에 젬당 1개까지 부여할 수 있습니다.</div><div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? '핵 강화 완료' : '핵 강화 진행중'}</span><span class="gem-status-chip ${slotDone ? 'done' : ''}">${slotDone ? '각인 슬롯 완료' : '각인 슬롯 확장 가능'}</span><span class="gem-status-chip ${engraveFilled ? 'done' : ''}">${engraveFilled ? '각인 장착 완료' : `각인 여유 ${Math.max(0, engraveCap - activeEnh.length)}칸`}</span></div><span style="color:#8aa4bf;">적용 옵션: ${activeEnh.map(id => GEM_SKY_ENHANCEMENTS[id] ? GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '없음'}</span>`
                : '공격 젬을 선택하면 창공의 힘으로 특수 옵션을 부여할 수 있습니다.';
            let upgradeBtns = [];
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.bossCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('bossCore', 1)" ${!isGem || (activeGem && activeGem.bossCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.bossCoreLevel >= 5 ? '✅ 군주의 핵 강화 완료' : '군주의 핵 강화'}</strong><br><small>보유: ${game.currencies.bossCore || 0} / 필요: ${bossNeed}${activeGem && activeGem.bossCoreLevel >= 5 ? ' (최대)' : ''}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.skyCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('skyEssence', 1)" ${!isGem || (activeGem && activeGem.skyCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.skyCoreLevel >= 5 ? '✅ 창공의 힘 강화 완료' : '창공의 힘 강화'}</strong><br><small>보유: ${game.currencies.skyEssence || 0} / 필요: ${skyNeed}${activeGem && activeGem.skyCoreLevel >= 5 ? ' (최대)' : ''}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && (activeGem.quality || 0) >= 20 ? 'done' : ''}" onclick="upgradeActiveGemQuality()" ${!isGem || gemExpertLv < 8 || (activeGem && (activeGem.quality || 0) >= 20) ? 'disabled' : ''}><strong>${activeGem && (activeGem.quality || 0) >= 20 ? '✅ 퀄리티 완료' : '젬 퀄리티 강화'}</strong><br><small>젬 각인사 Lv.8 · 보유 군주의 핵: ${game.currencies.bossCore || 0} / 필요: ${qualityNeed}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.awakened ? 'done' : ''}" onclick="awakenActiveGemCandidate()" ${!isGem || !awakenReady || (game.currencies.awakenedEcho || 0) < 3 ? 'disabled' : ''}><strong>${activeGem && activeGem.awakened ? '✅ 각성 젬' : '각성 젬 변환'}</strong><br><small>젬 각인사 Lv.15 · Lv.20 필요 · 각성 잔향 ${game.currencies.awakenedEcho || 0}/3 · 젬 레벨 +2/슬롯 보정</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && engraveCap >= 5 ? 'done' : ''}" onclick="upgradeSkyEngraveCap()" ${!isGem || (activeGem && engraveCap >= 5) ? 'disabled' : ''}><strong>${activeGem && engraveCap >= 5 ? '✅ 각인 슬롯 확장 완료' : '창공 각인 슬롯 확장'}</strong><br><small>보유: ${game.currencies.skyEssence || 0} / 필요: ${capNeed}${activeGem && engraveCap >= 5 ? ' (최대)' : ''}</small></button>`);
            document.getElementById('ui-gem-upgrade-actions').innerHTML = upgradeBtns.join('') || `<div style="grid-column:1/-1; color:#7f8c8d;">보유한 젬 강화 재료가 없습니다.</div>`;
            if ((game.season || 1) >= 4) {
                document.getElementById('ui-gem-enhance-options').innerHTML = Object.values(GEM_SKY_ENHANCEMENTS).map(enh => {
                    let applied = activeEnh.includes(enh.id);
                    let unlockLv = typeof getSkyEnhancementUnlockLevel === 'function' ? getSkyEnhancementUnlockLevel(enh.id) : 1;
                    let locked = gemExpertLv < unlockLv;
                    let canRemove = applied && gemExpertLv >= 7;
                    let awakenedNote = typeof isAwakenedSkyEnhancement === 'function' && isAwakenedSkyEnhancement(enh.id) ? ' · 모든 공격 젬 가능' : '';
                    return `<button class="gem-engrave-option ${applied ? 'applied' : ''}" onclick="${applied ? `removeSkyGemEnhancementFromActive('${enh.id}')` : `applySkyGemEnhancementToActive('${enh.id}')`}" ${!isGem || (locked && !applied) || (applied && !canRemove) ? 'disabled' : ''}><strong>${applied ? '✅ ' : ''}${enh.name}${applied ? ' (적용중)' : locked ? ` (Lv.${unlockLv})` : ''}</strong><br><small>${enh.desc}${awakenedNote}${applied ? (canRemove ? ' · 클릭 시 해제' : ' · 해제 Lv.7 필요') : locked ? ` · 젬 각인사 Lv.${unlockLv} 필요` : ''}</small></button>`;
                }).join('');
            } else {
                document.getElementById('ui-gem-enhance-options').innerHTML = `<div style="grid-column:1/-1; color:#7f8c8d;">창공의 힘 특수 옵션은 루프 4부터 해금됩니다.</div>`;
            }
        }
    }

    game.talismanBoard = Array.isArray(game.talismanBoard) ? game.talismanBoard.slice(0, TALISMAN_BOARD_W * TALISMAN_BOARD_H) : [];
    while (game.talismanBoard.length < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)) game.talismanBoard.push(null);
    game.talismanInventory = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    game.talismanPlacements = (game.talismanPlacements && typeof game.talismanPlacements === 'object') ? game.talismanPlacements : {};
    let talismanUnlockedSet = getTalismanUnlockedCellsSet();
    let extraUnlocked = Math.max(0, talismanUnlockedSet.size - 9);
    let talismanUnlockCost = getTalismanExpandCost(extraUnlocked);
    document.getElementById('ui-talisman-board-size').innerText = talismanUnlockedSet.size;
    document.getElementById('ui-talisman-board-size2').innerText = TALISMAN_BOARD_MASK.size;
    document.getElementById('ui-talisman-currency').innerHTML = `${renderSealShardBadge('sealShard')} <strong>${game.currencies.sealShard || 0}</strong> &nbsp; ${renderSealShardBadge('strongSealShard')} <strong>${game.currencies.strongSealShard || 0}</strong> &nbsp; ${renderSealShardBadge('radiantSealShard')} <strong>${game.currencies.radiantSealShard || 0}</strong>`;
    let unseal = game.talismanUnseal;
    if (!unseal) {
        document.getElementById('ui-talisman-unseal').innerHTML = `<div style="margin-bottom:8px; color:#9fc4ea;">봉인편린을 해제해 부적 후보를 확인하세요.</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="startTalismanUnseal('sealShard')" ${(game.currencies.sealShard || 0) <= 0 ? 'disabled' : ''}>봉인편린 해제</button>
                <button onclick="startTalismanUnseal('strongSealShard')" ${(game.currencies.strongSealShard || 0) <= 0 ? 'disabled' : ''}>[강력한 기운] 봉인편린 해제</button>
                <button onclick="startTalismanUnseal('radiantSealShard')" ${(game.currencies.radiantSealShard || 0) <= 0 ? 'disabled' : ''}>[찬란한 기운] 봉인편린 해제</button>
                <button onclick="expandTalismanBoard()" ${(talismanUnlockCost.sealShard || 0) <= 0 ? 'disabled' : ''}>칸 해금 안내 (${formatTalismanUnlockCostLabel(talismanUnlockCost)})</button>
                <button onclick="salvageAllTalismansInInventory()" ${(game.talismanInventory || []).length <= 0 ? 'disabled' : ''} style="background:#6e3f3f; border-color:#8f5959;">부적 일괄 해체</button>
            </div>`;
    } else {
        let shapeStyle = getTalismanShapeStyle(unseal.current.shape);
        document.getElementById('ui-talisman-unseal').innerHTML = `<div style="margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">${renderTalismanMiniShape(unseal.current.shape, { cellSize: 8, gap: 1, markDir: unseal.current.markDir })}<span>후보: <strong style="color:${shapeStyle.color};">[${unseal.current.shape}] ${unseal.current.statName} +${unseal.current.value}</strong> <span style="color:#9cb5d0;">(${unseal.current.rarity})</span></span>${renderSealShardBadge(unseal.source)}</div>
            <div style="margin-bottom:8px; color:#8fa7c3;">남은 형태 확인 기회: ${unseal.rollsLeft}/${unseal.totalRolls}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="acceptCurrentTalisman()">선택</button>
                <button onclick="previewNextTalismanShape()" ${unseal.rollsLeft <= 1 ? 'disabled' : ''}>다음 형태 보기</button>
                <button onclick="discardCurrentTalisman()" style="background:#6e3f3f; border-color:#8f5959;">파괴</button>
            </div>`;
    }
    let selectedTalismanId = game.talismanSelectedId;
    document.getElementById('ui-talisman-inventory').innerHTML = game.talismanInventory.map(t => {
        let selected = selectedTalismanId === t.id;
        let shapeStyle = getTalismanShapeStyle(t.shape);
        return `<div class="item-card ${selected ? 'selected' : ''}" style="min-height:72px;" onclick="selectTalismanInventoryItem(${t.id})" data-info-tooltip-anchor="1" onmouseenter="showTalismanInventoryTooltip(event, ${t.id})" onmousemove="showTalismanInventoryTooltip(event, ${t.id})" onmouseleave="hideInfoTooltip()"><div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;"><div style="display:flex; align-items:center; gap:7px;">${renderTalismanMiniShapeFromCells(t.cells, t.shape, { markDir: t.markDir })}<div><div class="item-title ${selected ? 'rare' : 'magic'}" style="color:${shapeStyle.color};">[${t.shape}] ${t.name || t.statName || '부적'} ${t.stat ? ` · ${t.statName} +${formatValue(t.stat, t.value)}` : ''}</div><div class="item-base-line" style="color:#b7d4f2;">${t.rarity} ${renderSealShardBadge(t.source || 'sealShard')} ${t.special ? `· 효과: ${getTalismanSpecialDescription(t)}` : ''}</div></div></div><div style="display:flex; gap:4px;"><button onclick="event.stopPropagation(); rotateTalismanInInventory(${t.id})" style="padding:4px 8px; min-height:30px;">회전</button><button onclick="event.stopPropagation(); destroyTalismanFromInventory(${t.id})" style="background:#6e3f3f; border-color:#8f5959; padding:4px 8px; min-height:30px;">파괴</button></div></div></div>`;
    }).join('') || `<div style="grid-column:1/-1; color:#7f8c8d;">보유한 부적이 없습니다.</div>`;
    document.getElementById('ui-talisman-board').innerHTML = Array.from({ length: TALISMAN_BOARD_W * TALISMAN_BOARD_H }, (_, i) => {
        let x = i % TALISMAN_BOARD_W;
        let y = Math.floor(i / TALISMAN_BOARD_W);
        let unlocked = isTalismanCellUnlocked(x, y);
        let id = game.talismanBoard[i];
        let placed = id ? (game.talismanPlacements && game.talismanPlacements[id] ? game.talismanPlacements[id].talisman : null) : null;
        let shape = placed ? placed.shape : null;
        let shapeStyle = shape ? getTalismanShapeStyle(shape) : null;
        let valid = isTalismanBoardCellValid(x,y);
        let coreOpen = isTalismanCellInitiallyUnlocked(x, y);
        if (!valid) return `<div style="width:42px; height:42px; border:0; background:transparent; border-radius:8px; opacity:0; pointer-events:none;"></div>`;
        let cellColor = coreOpen ? 'radial-gradient(circle at 30% 25%, #595f69 0%, #3a3f48 52%, #1f2329 100%)' : (!unlocked ? 'linear-gradient(180deg, #05070c 0%, #0b0e14 100%)' : 'radial-gradient(circle at 30% 25%, #666c76 0%, #434a54 58%, #252b32 100%)');
        if (id) cellColor = (shapeStyle ? `linear-gradient(145deg, rgba(255,255,255,0.3) 0%, ${shapeStyle.color} 42%, rgba(10,12,17,0.22) 100%)` : '#355d46');
        let label = '';
        let border = !unlocked ? '#5a616b' : (id && shapeStyle ? shapeStyle.color : '#767d88');
        let textColor = !unlocked ? '#d5dbe6' : (id && shapeStyle ? shapeStyle.color : '#d7dbe2');
        let unlockedSet = getTalismanUnlockedCellsSet();
        let extraUnlocked = Math.max(0, unlockedSet.size - 16);
        let unlockCost = getTalismanExpandCost(extraUnlocked);
        let lockTitle = ''; // 기본 브라우저 툴팁 비활성화 (커스텀 툴팁 사용)
        let isHoverGroup = !!(id && activeTalismanHoverId && id === activeTalismanHoverId);
        let surfaceShadow = id
            ? `inset 0 1px 0 rgba(255,255,255,0.34), 0 2px 6px rgba(0,0,0,0.35), 0 0 8px ${shapeStyle ? shapeStyle.glow : 'rgba(120,180,240,0.25)'}`
            : 'inset 0 2px 4px rgba(0,0,0,0.55), inset 0 -1px 2px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.25)';
        if (isHoverGroup) surfaceShadow = `0 0 0 2px rgba(255,230,140,.85), 0 0 18px rgba(255,210,110,.55), ${surfaceShadow}`;
        let placedTitle = '';
        let hoverHandlers = id
            ? ` data-info-tooltip-anchor="1" data-talisman-hover-id="${id}" onmouseenter="showTalismanBoardTooltip(event, ${id})" onmousemove="showTalismanBoardTooltip(event, ${id})" onmouseleave="hideTalismanBoardTooltip(event, ${id})"`
            : (!unlocked ? ` data-info-tooltip-anchor="1" onmouseenter="showTalismanUnlockTooltip(event, ${x}, ${y})" onmousemove="showTalismanUnlockTooltip(event, ${x}, ${y})" onmouseleave="hideInfoTooltip()"` : '');
        return `<button class="talisman-board-cell" onclick="onTalismanBoardCellClick(${x},${y})"${lockTitle}${placedTitle}${hoverHandlers} style="width:42px; height:42px; border:1px solid ${border}; background:${cellColor}; color:${textColor}; border-radius:10px; font-weight:bold; box-shadow:${surfaceShadow};">${label}</button>`;
    }).join('');
    let talismanTotalEl = document.getElementById('ui-talisman-total');
    if (talismanTotalEl) {
        let placements = Object.values(game.talismanPlacements || {}).filter(row => row && row.talisman);
        let idPos = {};
        placements.forEach(row => { if (row.talisman && row.talisman.id) idPos[row.talisman.id] = row; });
        let total = {};
        function addTotal(stat, value) {
            if (!stat || !Number.isFinite(Number(value))) return;
            total[stat] = (total[stat] || 0) + Number(value || 0);
        }
        function adjIds(tid) {
            let e = idPos[tid]; if (!e) return [];
            let set = new Set();
            (e.talisman.cells || []).forEach(cell => {
                let x=(e.x||0)+(cell.x||0), y=(e.y||0)+(cell.y||0);
                [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{ let nx=x+d[0], ny=y+d[1]; if (nx<0||ny<0||nx>=8||ny>=8) return; let nid=(game.talismanBoard||[])[ny*8 + nx]; if (nid && nid!==tid) set.add(nid); });
            });
            return Array.from(set);
        }
        function adjCount(tid) {
            return adjIds(tid).length;
        }
        function findMarkedNeighborId(entry) {
            if (!entry || !entry.talisman || !entry.talisman.markDir) return null;
            let anchor = (typeof getTalismanAnchorCell === 'function') ? getTalismanAnchorCell(entry.talisman) : ((entry.talisman.cells || [])[0] || {x:0,y:0});
            let x=(entry.x||0)+(anchor.x||0), y=(entry.y||0)+(anchor.y||0);
            let d = entry.talisman.markDir === 'up' ? [0,-1] : entry.talisman.markDir === 'right' ? [1,0] : entry.talisman.markDir === 'down' ? [0,1] : [-1,0];
            let nx=x+d[0], ny=y+d[1];
            if (nx<0||ny<0||nx>=8||ny>=8) return null;
            return (game.talismanBoard||[])[ny*8 + nx] || null;
        }
        placements.forEach(row => {
            let t = row && row.talisman;
            if (!t) return;
            if (Array.isArray(t.stats) && t.stats.length > 0) t.stats.forEach(st => addTotal(st.stat, st.value || 0));
            else if (t.stat) addTotal(t.stat, t.value || 0);
        });
        placements.forEach(row => {
            let t = row && row.talisman;
            if (!t || !t.special) return;
            if (t.special === 'gravity') {
                adjIds(t.id).forEach(nid => {
                    let n = idPos[nid] && idPos[nid].talisman;
                    if (!n) return;
                    let list = Array.isArray(n.stats) && n.stats.length > 0 ? n.stats : (n.stat ? [{ stat:n.stat, value:n.value || 0 }] : []);
                    list.forEach(st => addTotal(st.stat, (st.value || 0) * 0.25));
                });
            }
            if (t.special === 'simpleCopy') {
                let nid = findMarkedNeighborId(row);
                let n = nid ? (idPos[nid] && idPos[nid].talisman) : null;
                if (!n) return;
                let list = Array.isArray(n.stats) && n.stats.length > 0 ? n.stats : (n.stat ? [{ stat:n.stat, value:n.value || 0 }] : []);
                list.forEach(st => addTotal(st.stat, st.value || 0));
            }
            if (t.special === 'pride') {
                let n = adjCount(t.id);
                if (n === 0) { addTotal('gemLevel', 1); addTotal('suppCap', 1); }
                else if (n === 1) addTotal('suppCap', 1);
                else if (n <= 4) { addTotal('pctDmg', 15); addTotal('aspd', 10); }
                else { addTotal('crit', 5); addTotal('critDmg', 25); addTotal('pctDmg', 15); addTotal('aspd', 10); }
            }
        });
        let rows = Object.keys(total).map(stat => {
            let tone = getItemStatToneColor(stat);
            return `<span style="color:${tone};">${getStatName(stat)} +${formatValue(stat, total[stat])}</span>`;
        });
        talismanTotalEl.innerHTML = rows.length > 0
            ? `<div style="font-weight:800; color:#eaf3ff; border-bottom:1px solid #35506b; padding-bottom:6px; margin-bottom:6px;">부적으로 얻은 능력치 총합</div><div style="display:grid; gap:3px;">${rows.map(row => `<div>• <strong>${row}</strong></div>`).join('')}</div>`
            : `<div style="font-weight:800; color:#eaf3ff; border-bottom:1px solid #35506b; padding-bottom:6px; margin-bottom:6px;">부적으로 얻은 능력치 총합</div><div style="color:#9fb4cb;">없음</div>`;
    }
    let journalList = document.getElementById('ui-journal-list');
    if (journalList) {
        let unlocked = new Set((game.journalEntries || []).filter(id => JOURNAL_DB[id]));
        let orderedIds = JOURNAL_ENTRY_ORDER.filter(id => {
            let def = JOURNAL_DB[id];
            if (!def) return false;
            return unlocked.has(id) || !!def.hidden;
        });
        let entries = orderedIds.map(id => ({ id: id, def: JOURNAL_DB[id] }));
        journalList.innerHTML = entries.map(({ id, def }) => `<div style="background:#1a1a24; border:1px solid #3d3d5c; border-radius:8px; padding:10px;">
            <div style="font-weight:bold; color:#ffd36b; margin-bottom:6px;">${unlocked.has(id) ? def.title : '히든 저널 - ???'}</div>
            <div style="color:#c5d6e8; font-size:0.86em; line-height:1.6;">${unlocked.has(id) ? (def.lines || []).map(line => `• ${line}`).join('<br>') : `• 힌트: ${def.hint || '조건 미상'}`}</div>
            ${unlocked.has(id) && def.bonus ? `<div style="margin-top:8px; color:#9fe2b1; font-size:0.82em;">영구 보너스: ${def.bonus.label}</div>` : ''}
        </div>`).join('') || `<div style="color:#7f8c8d;">아직 해금된 기록이 없습니다.</div>`;
    }

    switchItemSubtab(game.itemSubtab || 'item-tab-equip');
    renderSkillAutoRulePanel();
    switchSkillSubtab(game.skillSubtab || 'skill-tab-equip');
    switchMapSubtab(game.mapSubtab || 'map-tab-zones');
}

function setupCanvasEvents() {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;
    const canvasTooltip = document.getElementById('canvas-tooltip');
    let pinchStartDistance = 0;
    let touchStartZoom = camZoom;
    let pinchAnchorWorldX = 0;
    let pinchAnchorWorldY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let pendingTouchPassiveId = null;
    let pendingTouchPassiveAt = 0;
    let pendingTouchPassiveRefundId = null;
    let pendingTouchPassiveRefundAt = 0;

    function hideCanvasTooltip() {
        if (!canvasTooltip) return;
        canvasTooltip.style.display = 'none';
        clearActiveTooltip('canvas-tooltip');
    }

    window.hidePassiveNodeTooltip = hideCanvasTooltip;

    function getPassiveNodeAtClientPosition(clientX, clientY) {
        ensurePassiveRenderCache();
        const rect = canvas.getBoundingClientRect();
        const viewW = passiveCanvasMetrics.width || rect.width;
        const viewH = passiveCanvasMetrics.height || rect.height;
        const worldX = (clientX - rect.left - viewW / 2 - camX) / camZoom;
        const worldY = (clientY - rect.top - viewH / 2 - camY) / camZoom;
        let found = null;
        let foundDistance = Infinity;
        let cellSize = passiveRenderCache.cellSize;
        let cx = Math.floor(worldX / cellSize);
        let cy = Math.floor(worldY / cellSize);
        let candidates = [];
        let starState = ensureStarWedgeState();
        let selectingStarWedge = Number.isFinite(starState.selectedWedgeId);
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                let bucket = passiveRenderCache.hoverGrid.get(`${cx + ox},${cy + oy}`);
                if (bucket && bucket.length) candidates.push(...bucket);
            }
        }
        let nearbyNodes = (candidates.length > 0 ? candidates : passiveRenderCache.nodes);
        let nearestStarSlot = null;
        let nearestStarSlotDistance = Infinity;
        nearbyNodes.forEach(node => {
            if (getPassiveVisibility(node.id) === 'hidden') return;
            let radius = getPassiveNodeVisualRadius(node) + 8;
            let distance = Math.hypot(node.x - worldX, node.y - worldY);
            if (distance > radius) return;
            if (selectingStarWedge && node.socketType === 'star_wedge' && distance < nearestStarSlotDistance) {
                nearestStarSlot = node;
                nearestStarSlotDistance = distance;
            }
            if (!found || distance < foundDistance) {
                found = node;
                foundDistance = distance;
            }
        });
        if (selectingStarWedge && nearestStarSlot) return nearestStarSlot;
        return found;
    }

    function renderPassiveTooltip(node, clientX, clientY) {
        if (!canvasTooltip || !node) return;
        recalculateStarWedgeMutations();
        let starState = ensureStarWedgeState();
        let mutation = (starState.nodeMutations || {})[node.id];
        let passiveAccent = getPassiveStatAccent(node.stat);
        let state = getPassiveVisibility(node.id);
        let ownedApexCount = getPassiveApexNodeIds().filter(id => (game.passives || []).includes(id)).length;
        let msg = (game.passives || []).includes(node.id)
            ? '✔️ 활성화됨'
            : (reachableNodes.has(node.id)
                ? '🖱️ 클릭해 활성화하고 주변 노드를 밝혀내기'
                : '🌒 아직 길이 이어지지 않은 노드');

        if (state === 'preview' && !discoveredPassiveNodes.has(node.id)) {
            msg = '🌫️ 안개 속 노드입니다. 활성화하여 주변을 밝힐 수 있습니다.';
        }
        if (node.kind === 'apex' && !(game.passives || []).includes(node.id)) {
            msg = `★ 별끝 특수 노드 ${ownedApexCount}/5. 다섯 개를 모두 잇면 외곽 성좌가 별 모양으로 각성합니다.`;
        } else if ((node.kind === 'evolved' || node.kind === 'transcendent') && game.passiveStarEvolution) {
            msg = (game.passives || []).includes(node.id)
                ? '✔️ 각성된 별자리를 이미 받아들였습니다.'
                : '✨ 성좌 진화 이후 드러난 강력한 외곽 노드입니다.';
        } else if (node.socketType === 'star_wedge') {
            let hasSocket = (starState.sockets || []).find(entry => String(entry.nodeId) === String(node.id));
            msg = hasSocket ? '🌑 별쐐기가 장착된 슬롯입니다.' : '🌑 별쐐기 장착 가능 슬롯입니다.';
        }

        let mutationHtml = '';
        if (mutation) {
            let originalLabel = `${getStatName(mutation.originalStat)} +${formatValue(mutation.originalStat, mutation.originalVal)}${P_STATS[mutation.originalStat] && P_STATS[mutation.originalStat].isPct ? '%' : ''}`;
            let currentLabel = `${getStatName(mutation.currentStat)} +${formatValue(mutation.currentStat, mutation.currentVal)}${P_STATS[mutation.currentStat] && P_STATS[mutation.currentStat].isPct ? '%' : ''}`;
            mutationHtml = `<div class="tooltip-line" style="margin-top:6px; color:#9bb2c9;">기존 효과: ${originalLabel}</div><div class="tooltip-line" style="color:#f0b7ff;">변성 효과: ${currentLabel}</div>`;
        }

        canvasTooltip.innerHTML =
            `<div class="tooltip-title" style="color:${node.tier >= 3 || node.kind === 'apex' || node.kind === 'transcendent' ? '#e7bf73' : '#b9d0df'}">${getPassiveNodeDisplayName(node)}</div>
             <div class="tooltip-line">${getPassiveKindLabel(node)}</div>
             <div class="tooltip-line" style="color:${passiveAccent.text}">효과: ${getPassiveEffectLabel(node)}</div>
             ${node.desc ? `<div class="tooltip-line" style="margin-top:4px;">${node.desc}</div>` : ''}
             ${mutationHtml}
             <div class="tooltip-line" style="margin-top:6px;">${msg}</div>`;

        canvasTooltip.style.display = 'block';
        positionTooltipElement(canvasTooltip, clientX, clientY);
        setActiveTooltip('canvas-tooltip');
    }

    function updateHoverNode(clientX, clientY) {
        let oldHover = hoverNode;
        hoverNode = getPassiveNodeAtClientPosition(clientX, clientY);
        if (oldHover !== hoverNode) {
            drawPassiveTree();
            if (hoverNode) renderPassiveTooltip(hoverNode, clientX, clientY);
            else hideCanvasTooltip();
        } else if (hoverNode) {
            positionTooltipElement(canvasTooltip, clientX, clientY);
        }
    }

    function updateDrag(clientX, clientY, deltaX, deltaY) {
        camX = clientX - dragStartX;
        camY = clientY - dragStartY;
        clampPassiveCamera();
        dragDist += Math.abs(deltaX) + Math.abs(deltaY);
        if (dragDist >= 10) {
            pendingTouchPassiveId = null;
            pendingTouchPassiveRefundId = null;
        }
        drawPassiveTree();
        hideCanvasTooltip();
    }

    function activateHoveredPassive(opts) {
        let options = opts || {};
        if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) {
            hoverNode = getPassiveNodeAtClientPosition(options.clientX, options.clientY);
        }
        if (dragDist >= 10 || !hoverNode) return;
        let starState = ensureStarWedgeState();
        if (Number.isFinite(starState.selectedWedgeId)) {
            let hoveredNodeId = hoverNode && hoverNode.id;
            let resolvedNode = hoveredNodeId != null ? (PASSIVE_TREE.nodes[hoveredNodeId] || PASSIVE_TREE.nodes[String(hoveredNodeId)] || null) : null;
            let isStarWedgeSlot = !!(resolvedNode && resolvedNode.socketType === 'star_wedge');
            if (!isStarWedgeSlot && hoveredNodeId != null) {
                let hoveredKey = String(hoveredNodeId);
                isStarWedgeSlot = !!Object.values(PASSIVE_TREE.nodes || {}).find(node => node && node.socketType === 'star_wedge' && String(node.id) === hoveredKey);
            }
            if (isStarWedgeSlot) {
                socketStarWedgeOnNode(hoverNode.id, starState.selectedWedgeId);
                starState.selectedWedgeId = null;
                updateStaticUI();
            } else {
                addLog('별쐐기 슬롯(허브 노드)을 클릭해 장착하세요.', 'attack-monster');
            }
            return;
        }
        let canActivate = !(game.passives || []).includes(hoverNode.id) && reachableNodes.has(hoverNode.id);
        if (!canActivate) {
            if ((game.passives || []).includes(hoverNode.id)) {
                if (options.fromTouch) {
                    let now = Date.now();
                    if (pendingTouchPassiveRefundId !== hoverNode.id || (now - pendingTouchPassiveRefundAt) > 1200) {
                        pendingTouchPassiveRefundId = hoverNode.id;
                        pendingTouchPassiveRefundAt = now;
                        renderPassiveTooltip(hoverNode, options.clientX || 0, options.clientY || 0);
                        addLog('👆 반환 확인: 같은 노드를 한 번 더 탭하면 환불 창이 열립니다.', 'loot-magic');
                        return;
                    }
                }
                let label = getPassiveNodeDisplayName(hoverNode);
                if (!confirm(`[${label}] 노드를 반환할까요?
정화의 오브 1개가 소모됩니다.`)) return;
                pendingTouchPassiveId = null;
                pendingTouchPassiveRefundId = null;
                return refundPassiveNode(hoverNode.id);
            }
            if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(hoverNode, options.clientX, options.clientY);
            return addLog("연결된 노드가 아니라 활성화할 수 없습니다.", "attack-monster");
        }
        if (game.passivePoints <= 0) {
            if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(hoverNode, options.clientX, options.clientY);
            return addLog("패시브 포인트가 부족합니다.", "attack-monster");
        }
        if (options.fromTouch && canActivate) {
            let now = Date.now();
            if (pendingTouchPassiveId !== hoverNode.id || (now - pendingTouchPassiveAt) > 1200) {
                pendingTouchPassiveId = hoverNode.id;
                pendingTouchPassiveAt = now;
                renderPassiveTooltip(hoverNode, options.clientX || 0, options.clientY || 0);
                addLog("👆 패시브 노드 정보 확인됨. 같은 노드를 한 번 더 탭하면 활성화됩니다.", "loot-magic");
                return;
            }
        }
        if (canActivate) {
            pendingTouchPassiveId = null;
            game.passives.push(hoverNode.id);
            game.passivePoints--;
            revealAroundNode(hoverNode.id, { forcePulse: true });
            unlockPassiveStarEvolution();
            tickShrineState();
    applyTabHeaderOrder();
    calculateReachableNodes();
            addLog(`🌟 ${getPassiveNodeDisplayName(hoverNode)} 활성화!`, "loot-magic");
            updateStaticUI();
        }
    }

    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        dragDist = 0;
        dragStartX = e.clientX - camX;
        dragStartY = e.clientY - camY;
        hoverNode = getPassiveNodeAtClientPosition(e.clientX, e.clientY);
        canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            updateDrag(e.clientX, e.clientY, e.movementX, e.movementY);
            return;
        }
        updateHoverNode(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', e => {
        isDragging = false;
        canvas.style.cursor = 'grab';
        activateHoveredPassive({ clientX: e.clientX, clientY: e.clientY });
    });
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        hoverNode = null;
        pendingTouchPassiveId = null;
        canvas.style.cursor = 'grab';
        drawPassiveTree();
        hideCanvasTooltip();
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let centerX = rect.width / 2;
        let centerY = rect.height / 2;
        let localX = e.clientX - rect.left;
        let localY = e.clientY - rect.top;
        let worldX = (localX - centerX - camX) / camZoom;
        let worldY = (localY - centerY - camY) / camZoom;
        camZoom *= (e.deltaY > 0 ? 0.8 : 1.2);
        camZoom = clampNumber(camZoom, 0.12, 2.5);
        camX = localX - centerX - worldX * camZoom;
        camY = localY - centerY - worldY * camZoom;
        clampPassiveCamera();
        drawPassiveTree();
    });
    canvas.addEventListener('touchstart', e => {
        if (!e.touches.length) return;
        e.preventDefault();
        if (e.touches.length >= 2) {
            const rect = canvas.getBoundingClientRect();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistance = Math.hypot(dx, dy);
            touchStartZoom = camZoom;
            let midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            let centerX = rect.width / 2;
            let centerY = rect.height / 2;
            pinchAnchorWorldX = (midX - rect.left - centerX - camX) / camZoom;
            pinchAnchorWorldY = (midY - rect.top - centerY - camY) / camZoom;
            isDragging = false;
            pendingTouchPassiveId = null;
            hideCanvasTooltip();
            return;
        }
        let touch = e.touches[0];
        isDragging = true;
        dragDist = 0;
        dragStartX = touch.clientX - camX;
        dragStartY = touch.clientY - camY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        hoverNode = getPassiveNodeAtClientPosition(touch.clientX, touch.clientY);
        canvas.style.cursor = 'grabbing';
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        if (!e.touches.length) return;
        e.preventDefault();
        if (e.touches.length >= 2) {
            const rect = canvas.getBoundingClientRect();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            let distance = Math.hypot(dx, dy);
            if (!pinchStartDistance) {
                pinchStartDistance = distance;
                touchStartZoom = camZoom;
            }
            camZoom = clampNumber(touchStartZoom * (distance / pinchStartDistance), 0.12, 2.5);
            let midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            let centerX = rect.width / 2;
            let centerY = rect.height / 2;
            camX = (midX - rect.left - centerX) - (pinchAnchorWorldX * camZoom);
            camY = (midY - rect.top - centerY) - (pinchAnchorWorldY * camZoom);
            clampPassiveCamera();
            pendingTouchPassiveId = null;
            drawPassiveTree();
            hideCanvasTooltip();
            return;
        }
        let touch = e.touches[0];
        if (isDragging) {
            updateDrag(touch.clientX, touch.clientY, touch.clientX - lastTouchX, touch.clientY - lastTouchY);
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (e.touches.length >= 2) {
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistance = Math.hypot(dx, dy);
            touchStartZoom = camZoom;
            return;
        }
        if (e.touches.length === 1) {
            let touch = e.touches[0];
            isDragging = true;
            dragStartX = touch.clientX - camX;
            dragStartY = touch.clientY - camY;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            pinchStartDistance = 0;
            return;
        }
        isDragging = false;
        pinchStartDistance = 0;
        canvas.style.cursor = 'grab';
        if (e.changedTouches && e.changedTouches.length) {
            let touch = e.changedTouches[0];
            hoverNode = getPassiveNodeAtClientPosition(touch.clientX, touch.clientY);
            activateHoveredPassive({ fromTouch: true, clientX: touch.clientX, clientY: touch.clientY });
        }
    }, { passive: false });
    canvas.addEventListener('touchcancel', () => {
        isDragging = false;
        pinchStartDistance = 0;
        hoverNode = null;
        pendingTouchPassiveId = null;
        canvas.style.cursor = 'grab';
        drawPassiveTree();
        hideCanvasTooltip();
    }, { passive: false });
    resizePassiveTreeCanvas(true);
}

function resizePassiveTreeCanvas(force) {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return false;
    let parent = canvas.parentElement || document.getElementById('tree-container');
    if (!parent || canvas.offsetParent === null) return false;
    let rect = parent.getBoundingClientRect();
    let displayWidth = Math.max(1, Math.floor(rect.width));
    let displayHeight = Math.max(1, Math.floor(rect.height));
    if (displayWidth < 50 || displayHeight < 50) return false;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let bufferWidth = Math.max(1, Math.round(displayWidth * dpr));
    let bufferHeight = Math.max(1, Math.round(displayHeight * dpr));
    let changed = !!force
        || canvas.width !== bufferWidth
        || canvas.height !== bufferHeight
        || passiveCanvasMetrics.width !== displayWidth
        || passiveCanvasMetrics.height !== displayHeight
        || Math.abs((passiveCanvasMetrics.dpr || 1) - dpr) > 0.001;
    if (!changed) return false;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    passiveCanvasMetrics.width = displayWidth;
    passiveCanvasMetrics.height = displayHeight;
    passiveCanvasMetrics.dpr = dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

function resizeCanvas() {
    handleResponsiveLayoutChange();
    const canvas = document.getElementById('tree-canvas');
    if (canvas && canvas.offsetParent !== null) {
        fitPassiveCameraToBounds(false);
        if (resizePassiveTreeCanvas(false)) drawPassiveTree();
    }
    resizeBattlefieldCanvas();
    renderBattlefield();
}

function scheduleStableResize() {
    requestAnimationFrame(() => requestAnimationFrame(() => resizeCanvas()));
}

function handleResponsiveLayoutChange() {
    let isMobileLayout = window.matchMedia('(max-width: 1080px)').matches;
    if (window.__lastResponsiveMobile === undefined) {
        window.__lastResponsiveMobile = isMobileLayout;
        return;
    }
    if (window.__lastResponsiveMobile && !isMobileLayout) {
        function resetDesktopScroll() {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            let leftPane = document.getElementById('left-pane');
            if (leftPane) leftPane.scrollTop = 0;
            let rightPane = document.getElementById('right-pane');
            if (rightPane) rightPane.scrollTop = 0;
            document.querySelectorAll('.tab-content').forEach(node => {
                node.scrollTop = 0;
            });
        }
        resetDesktopScroll();
        requestAnimationFrame(resetDesktopScroll);
    }
    window.__lastResponsiveMobile = isMobileLayout;
}


function ensureLoopChallengeState() {
    if (!game.loopChallenge) {
        let loopTier = Math.max(1, Math.floor(game.loopCount || game.season || 1));
        game.loopChallenge = {
            id: `loop-${Date.now()}`,
            tier: loopTier,
            targetKills: 50 + (loopTier * 10),
            kills: 0,
            completed: false,
            rewardClaimed: false
        };
    }
}

function mergeDefaults(save) {
    function clampFiniteNumber(value, fallback, min, max) {
        let num = Number(value);
        if (!Number.isFinite(num)) num = fallback;
        if (Number.isFinite(min)) num = Math.max(min, num);
        if (Number.isFinite(max)) num = Math.min(max, num);
        return num;
    }
    function normalizePassiveNodeId(rawId) {
        if (typeof rawId === 'string') {
            if (PASSIVE_TREE.nodes[rawId]) return rawId;
            if (/^\d+$/.test(rawId)) {
                let converted = 'n' + rawId;
                if (PASSIVE_TREE.nodes[converted]) return converted;
            }
            return null;
        }
        if (typeof rawId === 'number' && Number.isFinite(rawId)) {
            let converted = 'n' + Math.floor(rawId);
            return PASSIVE_TREE.nodes[converted] ? converted : null;
        }
        return null;
    }
    function normalizeAllocatedPassiveTreeNodes(rawIds, passiveStarEvolution) {
        let rawList = Array.isArray(rawIds) ? rawIds : [];
        let seen = new Set();
        let kept = [];
        let refunded = 0;
        rawList.forEach(rawId => {
            let id = normalizePassiveNodeId(rawId);
            if (!id) { refunded++; return; }
            if (seen.has(id)) return;
            seen.add(id);
            let node = PASSIVE_TREE.nodes[id];
            if (!node || (node.requiresEvolution && !passiveStarEvolution)) {
                if (id !== 'n0') refunded++;
                return;
            }
            kept.push(id);
        });
        let owned = new Set(kept);
        owned.add('n0');
        let connected = new Set(['n0']);
        let queue = ['n0'];
        let passiveEdges = (PASSIVE_TREE && Array.isArray(PASSIVE_TREE.edges)) ? PASSIVE_TREE.edges : [];
        while (queue.length > 0) {
            let current = queue.shift();
            passiveEdges.forEach(edge => {
                let next = null;
                if (edge.from === current && owned.has(edge.to)) next = edge.to;
                else if (edge.to === current && owned.has(edge.from)) next = edge.from;
                if (next && !connected.has(next)) {
                    connected.add(next);
                    queue.push(next);
                }
            });
        }
        let connectedPassives = [];
        kept.forEach(id => {
            if (id === 'n0' || connected.has(id)) connectedPassives.push(id);
            else refunded++;
        });
        return { passives: connectedPassives, refunded: refunded };
    }
    function normalizeEncounterMarker(marker) {
        if (!marker || typeof marker !== 'object') return null;
        let at = clampFiniteNumber(marker.at, NaN, 0, 100);
        if (!Number.isFinite(at)) return null;
        return {
            at: at,
            count: Math.max(1, Math.floor(clampFiniteNumber(marker.count, 1, 1, 99))),
            elite: !!marker.elite,
            boss: !!marker.boss
        };
    }
    function normalizeEnemyRecord(enemy) {
        if (!enemy || typeof enemy !== 'object') return null;
        let hp = clampFiniteNumber(enemy.hp, NaN, 0);
        let maxHp = clampFiniteNumber(enemy.maxHp, hp, 1);
        if (!Number.isFinite(hp)) hp = maxHp;
        return {
            ...enemy,
            id: Math.max(1, Math.floor(clampFiniteNumber(enemy.id, 1, 1))),
            hp: Math.min(maxHp, hp),
            maxHp: maxHp,
            attackTimer: clampFiniteNumber(enemy.attackTimer, 0, 0),
            regenBank: Math.round(clampFiniteNumber(enemy.regenBank, 0, 0) * 10) / 10,
            spawnAt: clampFiniteNumber(enemy.spawnAt, 0, 0, 100),
            spawnStamp: 0,
            groupIndex: Math.max(0, Math.floor(clampFiniteNumber(enemy.groupIndex, 0, 0))),
            battleSlot: Math.max(0, Math.floor(clampFiniteNumber(enemy.battleSlot, Math.max(0, enemy.id - 1), 0))),
            variantSeed: Math.floor(clampFiniteNumber(enemy.variantSeed, 1)),
            ele: enemy.ele || 'phys',
            name: enemy.name || '이름 없는 적',
            atkMul: clampFiniteNumber(enemy.atkMul, 1, 0.1),
            dr: clampFiniteNumber(enemy.dr, 0, 0),
            resF: clampFiniteNumber(enemy.resF, 0),
            resC: clampFiniteNumber(enemy.resC, 0),
            resL: clampFiniteNumber(enemy.resL, 0),
            resChaos: clampFiniteNumber(enemy.resChaos, 0),
            isElite: !!enemy.isElite,
            isBoss: !!enemy.isBoss
        };
    }
    function normalizeRecentDamageEvent(entry) {
        if (!entry || typeof entry !== 'object') return null;
        let ele = normalizeDamageElementKey(entry.ele);
        let amount = Math.max(0, Math.floor(clampFiniteNumber(entry.amount, 0, 0)));
        return {
            at: clampFiniteNumber(entry.at, Date.now(), 0),
            ele: ele,
            amount: amount,
            source: typeof entry.source === 'string' ? entry.source : ''
        };
    }
    function normalizeDeathDamageSummaryRows(rows) {
        let damageSummary = Array.isArray(rows) ? rows.map(entry => {
            if (!entry || typeof entry !== 'object') return null;
            let ele = normalizeDamageElementKey(entry.ele);
            let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
            return { ele: ele, value: value };
        }).filter(Boolean) : [];
        let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
        damageSummary.forEach(entry => {
            totals[entry.ele] += Math.max(0, Math.floor(entry.value || 0));
        });
        return Object.keys(totals)
            .map(ele => ({ ele: ele, value: totals[ele] }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);
    }
    function normalizeDeathLog(log) {
        if (!log || typeof log !== 'object') return null;
        let primaryElement = normalizeDamageElementKey(log.primaryElement);
        let damageSummary = normalizeDeathDamageSummaryRows(log.damageSummary);
        let ailmentDamageSummary = normalizeDeathDamageSummaryRows(log.ailmentDamageSummary);
        let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.map(row => {
            if (!row || typeof row !== 'object') return null;
            let type = typeof row.type === 'string' && row.type ? row.type : 'unknown';
            return {
                type: type,
                label: typeof row.label === 'string' && row.label ? row.label : getAilmentDisplayLabel(type),
                time: Math.max(0, Math.ceil(clampFiniteNumber(row.time, 0, 0, 30))),
                power: Math.max(0, clampFiniteNumber(row.power, 0, 0, 1.5)),
                sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0)))
            };
        }).filter(Boolean) : [];
        return {
            primaryElement: primaryElement,
            reasonText: typeof log.reasonText === 'string' && log.reasonText.trim() ? log.reasonText : (DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys),
            expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
            damageSummary: damageSummary,
            ailmentDamageSummary: ailmentDamageSummary,
            activeAilments: activeAilments,
            sourceName: typeof log.sourceName === 'string' ? log.sourceName : '',
            at: clampFiniteNumber(log.at, Date.now(), 0)
        };
    }
    let merged = {
        ...defaultGame,
        ...save,
        settings: { ...defaultGame.settings, ...(save.settings || {}) },
        unlocks: { ...defaultGame.unlocks, ...(save.unlocks || {}) },
        noti: { ...defaultGame.noti, ...(save.noti || {}) },
        currencies: { ...defaultGame.currencies, ...(save.currencies || {}) },
        equipment: { ...defaultGame.equipment, ...(save.equipment || {}) },
        saveMeta: { ...defaultGame.saveMeta, ...(save.saveMeta || {}) }
    };
    merged.unlocks.jewel = !!merged.unlocks.jewel;
    if (!save.currencies && save.materials) {
        merged.currencies.transmute += Math.floor(save.materials / 2);
        merged.currencies.augment += Math.floor(save.materials / 4);
        merged.currencies.alchemy += Math.floor(save.materials / 10);
    }
    let normalizedEquipment = { ...defaultGame.equipment };
    Object.keys(normalizedEquipment).forEach(slot => {
        normalizedEquipment[slot] = merged.equipment[slot] || null;
    });
    if (save && save.equipment && save.equipment['장갑'] && !save.equipment['장갑1'] && !save.equipment['장갑2']) {
        normalizedEquipment['장갑1'] = save.equipment['장갑'];
    }
    merged.equipment = normalizedEquipment;
    merged.inventory = (merged.inventory || []).map(normalizeItem);
    Object.keys(merged.equipment).forEach(slot => merged.equipment[slot] = normalizeItem(merged.equipment[slot]));
    merged.gemData = (merged.gemData && typeof merged.gemData === 'object') ? merged.gemData : {};
    merged.gemData['기본 공격'] = normalizeGemRecord(merged.gemData['기본 공격']);
    Object.keys(merged.gemData).forEach(name => merged.gemData[name] = normalizeGemRecord(merged.gemData[name]));
    merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
    Object.keys(merged.supportGemData).forEach(name => merged.supportGemData[name] = normalizeGemRecord(merged.supportGemData[name]));
    if ((save.saveVersion || 0) < 9) {
        merged.passives = [];
        merged.discoveredPassives = ['n0'];
    }
    if ((save.saveVersion || 0) < 13) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 10) merged.currentZoneId += (ABYSS_START_ZONE_ID - 10);
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 10) merged.maxZoneId += (ABYSS_START_ZONE_ID - 10);
    } else if ((save.saveVersion || 0) < 14) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 11) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 11) merged.maxZoneId -= 1;
    } else if ((save.saveVersion || 0) < 15) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 5) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 5) merged.maxZoneId -= 1;
    }
    let passiveAllocationNormalization = normalizeAllocatedPassiveTreeNodes(merged.passives, !!merged.passiveStarEvolution);
    merged.passives = passiveAllocationNormalization.passives;
    merged.autoRefundedPassivePoints = Math.max(0, Math.floor(passiveAllocationNormalization.refunded || 0));
    function getPassiveTierValueForLoad(statKey, tier) {
        let statDef = P_STATS[statKey];
        if (!statDef) return tier === 3 ? 8 : (tier === 2 ? 4 : 2);
        if (tier === 0) return 10;
        if (tier === 1) return statDef.s !== undefined ? statDef.s : (statDef.m !== undefined ? statDef.m : (statDef.k !== undefined ? statDef.k : 2));
        if (tier === 2) return statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : (statDef.k !== undefined ? statDef.k : 4));
        return statDef.k !== undefined ? statDef.k : (statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : 8));
    }
    Object.values(PASSIVE_TREE.nodes || {}).forEach(node => {
        if (!node || node.stat !== 'critDmg') return;
        node.val = getPassiveTierValueForLoad('critDmg', Math.max(0, Math.floor(node.tier || 1)));
    });
    merged.discoveredPassives = Array.from(new Set((merged.discoveredPassives || []).map(normalizePassiveNodeId).filter(Boolean)));
    if (merged.passiveLayoutVersion !== PASSIVE_LAYOUT_VERSION) {
        merged.discoveredPassives = Array.from(new Set(['n0'].concat(merged.passives || [])));
        merged.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION;
    }
    merged.claimableActRewards = (merged.claimableActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.claimedActRewards = (merged.claimedActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.actRewardBonuses = (merged.actRewardBonuses || []).filter(entry => entry && entry.stat);
    merged.seasonChaseUniqueDropped = !!merged.seasonChaseUniqueDropped;
    merged.skills = dedupeList(Array.isArray(merged.skills) ? merged.skills.filter(name => !!SKILL_DB[name]) : []);
    if (!merged.skills.includes('기본 공격')) merged.skills.unshift('기본 공격');
    merged.sealedSkills = dedupeList(Array.isArray(merged.sealedSkills) ? merged.sealedSkills.filter(name => !!SKILL_DB[name] && name !== '기본 공격' && !merged.skills.includes(name)) : []);
    merged.supports = dedupeList(Array.isArray(merged.supports) ? merged.supports.filter(name => !!SUPPORT_GEM_DB[name]) : []);
    merged.sealedSupports = dedupeList(Array.isArray(merged.sealedSupports) ? merged.sealedSupports.filter(name => !!SUPPORT_GEM_DB[name] && !merged.supports.includes(name)) : []);
    merged.equippedSupports = Array.isArray(merged.equippedSupports) ? dedupeList(merged.equippedSupports.filter(name => merged.supports.includes(name))) : [];
    merged.seasonNodes = Array.isArray(merged.seasonNodes) ? merged.seasonNodes.filter(id => !!SEASON_NODES[id]) : [];
    merged.seasonNodeLevels = (merged.seasonNodeLevels && typeof merged.seasonNodeLevels === 'object') ? merged.seasonNodeLevels : {};
    merged.seasonNodes.forEach(id => {
        let lv = Math.max(1, Math.floor(merged.seasonNodeLevels[id] || 1));
        merged.seasonNodeLevels[id] = Math.min(5, lv);
    });
    merged.unlockedSeasonContents = Array.isArray(merged.unlockedSeasonContents) ? merged.unlockedSeasonContents.filter(id => typeof id === 'string') : ['season_1'];
    merged.seenSeasonContentNotices = Array.isArray(merged.seenSeasonContentNotices) ? merged.seenSeasonContentNotices.filter(id => typeof id === 'string') : ['season_1'];
    merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.labyrinthFloor, defaultGame.labyrinthFloor || 1, 1)));
    merged.labyrinthUnlockedMaxFloor = Math.max(
        merged.labyrinthFloor,
        Math.floor(clampFiniteNumber(merged.labyrinthUnlockedMaxFloor, defaultGame.labyrinthUnlockedMaxFloor || 1, 1))
    );
    merged.abyssEndlessDepth = Math.max(20, Math.floor(clampFiniteNumber(merged.abyssEndlessDepth, defaultGame.abyssEndlessDepth || 20, 20)));
    merged.abyssUnlockedDepths = Array.isArray(merged.abyssUnlockedDepths)
        ? Array.from(new Set(merged.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b)
        : [20];
    if (!merged.abyssUnlockedDepths.includes(20)) merged.abyssUnlockedDepths.unshift(20);
    if (merged.abyssEndlessDepth >= 21 && !merged.abyssUnlockedDepths.includes(merged.abyssEndlessDepth)) merged.abyssUnlockedDepths.push(merged.abyssEndlessDepth);
    function normalizeJewelRecord(jewel) {
        if (!jewel || typeof jewel !== 'object') return null;
        let stats = typeof getJewelStats === 'function' ? getJewelStats(jewel) : (Array.isArray(jewel.stats) ? jewel.stats.filter(stat => stat && stat.id) : []);
        if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = typeof normalizeJewelStat === 'function' ? [normalizeJewelStat(jewel.stat)].filter(Boolean) : [jewel.stat];
        if (stats.length === 0) return null;
        let hiddenTier = Math.max(1, Math.floor(Math.max(...stats.map(stat => Math.floor(stat.tier || 1)))));
        let hasWaxBonus = stats.some(stat => stat && stat.waxBonus);
        let statLimit = jewel.waxedByBeeswax || hasWaxBonus ? 5 : 4;
        return { ...jewel, rarity: ['normal', 'magic', 'rare', 'unique'].includes(jewel.rarity) ? jewel.rarity : 'normal', waxedByBeeswax: !!jewel.waxedByBeeswax || hasWaxBonus, hiddenTier: hiddenTier, stats: stats.slice(0, statLimit) };
    }
    merged.jewelInventory = Array.isArray(merged.jewelInventory) ? merged.jewelInventory.map(normalizeJewelRecord).filter(Boolean) : [];
    let jewelInventoryCap = JEWEL_INVENTORY_LIMIT + (Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0))) * 5);
    merged.jewelInventory = merged.jewelInventory.slice(0, jewelInventoryCap);
    merged.jewelSlots = Array.isArray(merged.jewelSlots) ? merged.jewelSlots.slice(0, 2).map(normalizeJewelRecord) : [null, null];
    while (merged.jewelSlots.length < 2) merged.jewelSlots.push(null);
    merged.jewelSlotAmplify = Array.isArray(merged.jewelSlotAmplify) ? merged.jewelSlotAmplify.slice(0, 2).map(v => Math.max(0, Math.min(20, Math.floor(v || 0)))) : [0, 0];
    while (merged.jewelSlotAmplify.length < 2) merged.jewelSlotAmplify.push(0);
    merged.skyGemEnhancements = (merged.skyGemEnhancements && typeof merged.skyGemEnhancements === 'object') ? merged.skyGemEnhancements : {};
    Object.keys(merged.skyGemEnhancements).forEach(skill => {
        let arr = Array.isArray(merged.skyGemEnhancements[skill]) ? merged.skyGemEnhancements[skill] : [];
        merged.skyGemEnhancements[skill] = Array.from(new Set(arr.filter(id => !!GEM_SKY_ENHANCEMENTS[id]))).slice(0, 5);
    });
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter(id => typeof id === 'string') : [];
    merged.ascendKeystonePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendKeystonePoints, 0, 0)));
    let classKeystoneSet = new Set(getClassKeystoneDefs(merged.ascendClass).map(node => node.id));
    merged.ascendKeystones = Array.isArray(merged.ascendKeystones)
        ? Array.from(new Set(merged.ascendKeystones.filter(id => typeof id === 'string' && classKeystoneSet.has(id)))).slice(0, CLASS_KEYSTONE_PICK_LIMIT)
        : [];
    if (merged.ascendClass) {
        let legacyTrialCount = Array.isArray(merged.completedTrials)
            ? merged.completedTrials.filter(id => ['trial_1', 'trial_2', 'trial_3', 'trial_4'].includes(id)).length
            : 0;
        let legacyAscendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, 0, 0, 4)));
        let legacyKeystoneTotal = Math.min(CLASS_KEYSTONE_PICK_LIMIT, Math.max(legacyAscendRank, legacyTrialCount));
        let minExpectedPoints = Math.max(0, legacyKeystoneTotal - merged.ascendKeystones.length);
        merged.ascendKeystonePoints = Math.max(merged.ascendKeystonePoints, minExpectedPoints);
    }
    merged.starWedge = (merged.starWedge && typeof merged.starWedge === 'object') ? merged.starWedge : {};
    merged.starWedge.unlocked = !!merged.starWedge.unlocked;
    merged.starWedge.unlockNoticeSeen = !!merged.starWedge.unlockNoticeSeen;
    merged.starWedge.skyRiftGauge = clampFiniteNumber(merged.starWedge.skyRiftGauge, 0, 0, 100);
    merged.starWedge.skyRiftReady = !!merged.starWedge.skyRiftReady;
    merged.starWedge.skyRiftMinTier = Number.isFinite(merged.starWedge.skyRiftMinTier) ? Math.max(1, Math.floor(merged.starWedge.skyRiftMinTier)) : null;
    merged.starWedge.activeMeteorTier = Number.isFinite(merged.starWedge.activeMeteorTier) ? Math.max(1, Math.floor(merged.starWedge.activeMeteorTier)) : null;
    merged.starWedge.lastAnomalyAt = Number.isFinite(merged.starWedge.lastAnomalyAt) ? Math.max(0, Math.floor(merged.starWedge.lastAnomalyAt)) : 0;
    merged.starWedge.skyRiftCarryGauge = clampFiniteNumber(merged.starWedge.skyRiftCarryGauge, 0, 0, 99);
    merged.starWedge.constellationBuff = (merged.starWedge.constellationBuff && typeof merged.starWedge.constellationBuff === 'object') ? merged.starWedge.constellationBuff : null;
    merged.starWedge.entriesCleared = Math.max(0, Math.floor(clampFiniteNumber(merged.starWedge.entriesCleared, 0, 0)));
    merged.starWedge.firstClearDone = !!merged.starWedge.firstClearDone;
    merged.starWedge.selectedWedgeId = Number.isFinite(merged.starWedge.selectedWedgeId) ? merged.starWedge.selectedWedgeId : null;
    merged.starWedge.wedges = Array.isArray(merged.starWedge.wedges) ? merged.starWedge.wedges.filter(w => w && Number.isFinite(w.id) && Array.isArray(w.lines)).slice(0, 60) : [];
    let mergedAstronomerLevel = merged.expertise && merged.expertise.levels ? merged.expertise.levels.astronomer : 1;
    let starWedgeSocketCap = typeof getMaxEquippedStarWedgesForLevel === 'function' ? getMaxEquippedStarWedgesForLevel(mergedAstronomerLevel) : MAX_STAR_WEDGES;
    merged.starWedge.sockets = Array.isArray(merged.starWedge.sockets) ? merged.starWedge.sockets.filter(s => s && typeof s.nodeId === 'string' && Number.isFinite(s.wedgeId)).slice(0, starWedgeSocketCap) : [];
    merged.starWedge.nodeMutations = (merged.starWedge.nodeMutations && typeof merged.starWedge.nodeMutations === 'object') ? merged.starWedge.nodeMutations : {};
    merged.completedTrials = Array.isArray(merged.completedTrials) ? merged.completedTrials.filter(id => typeof id === 'string') : [];
    merged.unlockedTrials = Array.isArray(merged.unlockedTrials) ? merged.unlockedTrials.filter(id => typeof id === 'string') : [];
    merged.itemSubtab = ['item-tab-equip', 'item-tab-craft', 'item-tab-fossil', 'item-tab-market', 'item-tab-infuser'].includes(merged.itemSubtab) ? merged.itemSubtab : 'item-tab-equip';
    merged.skillSubtab = ['skill-tab-equip','skill-tab-enhance','skill-tab-condition'].includes(merged.skillSubtab) ? merged.skillSubtab : 'skill-tab-equip';
    merged.skillAutoRules = Array.isArray(merged.skillAutoRules) ? merged.skillAutoRules : [];
    merged.conditionGemUnlocked = !!merged.conditionGemUnlocked;
    merged.conditionGemPool = Array.isArray(merged.conditionGemPool) ? merged.conditionGemPool : [];
    merged.pendingConditionGemChoices = Array.isArray(merged.pendingConditionGemChoices) ? merged.pendingConditionGemChoices : null;
    merged.clearedRootBosses = Array.isArray(merged.clearedRootBosses) ? merged.clearedRootBosses : [];
    merged.mapSubtab = ['map-tab-zones', 'map-tab-abyss', 'map-tab-chaos-realm', 'map-tab-underworld'].includes(merged.mapSubtab) ? merged.mapSubtab : 'map-tab-zones';
    merged.gemFoldInactiveAttack = !!merged.gemFoldInactiveAttack;
    merged.gemFoldInactiveSupport = !!merged.gemFoldInactiveSupport;
    if (merged.gemFoldInactive) {
        merged.gemFoldInactiveAttack = true;
        merged.gemFoldInactiveSupport = true;
    }
    merged.autoRepeatSeasonBoss = !!merged.autoRepeatSeasonBoss;
    if (((merged.currencies || {}).talismanCore || 0) > 0) {
        merged.currencies.sealShard = (merged.currencies.sealShard || 0) + (merged.currencies.talismanCore || 0);
        merged.currencies.talismanCore = 0;
    }
    if (((merged.currencies || {}).jewelCore || 0) > 0) {
        merged.currencies.jewelShard = (merged.currencies.jewelShard || 0) + Math.max(0, Math.floor(merged.currencies.jewelCore || 0));
        merged.currencies.jewelCore = 0;
    }
    merged.talismanUnlocked = !!merged.talismanUnlocked || ((merged.currencies.sealShard || 0) > 0) || ((merged.currencies.strongSealShard || 0) > 0);
    merged.talismanUnlockedCells = Array.isArray(merged.talismanUnlockedCells) ? merged.talismanUnlockedCells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)).filter(v => isTalismanBoardCellValid(v % TALISMAN_BOARD_W, Math.floor(v / TALISMAN_BOARD_W))) : [];
    merged.talismanBoardUnlock = Math.max(3, Math.min(5, Math.floor(clampFiniteNumber(merged.talismanBoardUnlock, 3, 3, 5))));
    if (merged.talismanUnlockedCells.length === 0 && merged.talismanBoardUnlock > 3) {
        for (let y = 0; y < merged.talismanBoardUnlock; y++) {
            for (let x = 0; x < merged.talismanBoardUnlock; x++) {
                if (x < 4 && y < 4) continue;
                if (!isTalismanBoardCellValid(x, y)) continue;
                merged.talismanUnlockedCells.push(talismanCellIndex(x, y));
            }
        }
    }
    merged.talismanUnlockPickMode = !!merged.talismanUnlockPickMode;
    merged.talismanInventory = Array.isArray(merged.talismanInventory) ? merged.talismanInventory.filter(t => t && t.id && t.shape && (t.stat || (Array.isArray(t.stats) && t.stats.length > 0) || t.special || t.isUnique)) : [];
    merged.talismanBoard = Array.isArray(merged.talismanBoard) ? merged.talismanBoard.slice(0, TALISMAN_BOARD_W * TALISMAN_BOARD_H) : [];
    while (merged.talismanBoard.length < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)) merged.talismanBoard.push(null);
    merged.talismanPlacements = (merged.talismanPlacements && typeof merged.talismanPlacements === 'object') ? merged.talismanPlacements : {};
    merged.talismanSelectedId = Number.isFinite(merged.talismanSelectedId) ? merged.talismanSelectedId : null;
    merged.talismanUnseal = (merged.talismanUnseal && merged.talismanUnseal.current) ? merged.talismanUnseal : null;
    if (merged.talismanUnlocked) merged.unlocks.talisman = true;
    merged.gemEnhanceUnlocked = !!merged.gemEnhanceUnlocked;
    merged.uniqueCodex = (merged.uniqueCodex && typeof merged.uniqueCodex === 'object') ? merged.uniqueCodex : {};
    merged.codexCollapsedSlots = (merged.codexCollapsedSlots && typeof merged.codexCollapsedSlots === 'object') ? merged.codexCollapsedSlots : {};
    merged.uniqueCodexCompletedRewardClaimed = !!merged.uniqueCodexCompletedRewardClaimed;
    if (!merged.gemEnhanceUnlocked && (((merged.currencies || {}).bossCore || 0) > 0 || ((merged.currencies || {}).skyEssence || 0) > 0)) merged.gemEnhanceUnlocked = true;
    merged.inTicketBossFight = !!merged.inTicketBossFight;
    merged.beehive = (merged.beehive && typeof merged.beehive === 'object') ? merged.beehive : { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 };
    let beeHasReturnZone = merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null;
    let beeHasStartedRoute = Math.max(0, Math.floor(merged.beehive.branchStep || 0)) > 0;
    let activeBeehiveRuntime = !!(merged.beehive.inRun && merged.currentZoneId === 'beehive_run' && (
        merged.beehive.awaitingClear
        || (merged.beehive.pendingChoice && (beeHasReturnZone || beeHasStartedRoute))
        || merged.beehive.queenActive
        || merged.beehive.pendingWaveReward
        || (Array.isArray(merged.beehive.pendingQueenRewards) && merged.beehive.pendingQueenRewards.length > 0)
        || (Array.isArray(merged.enemies) && merged.enemies.some(enemy => enemy && enemy.hp > 0))
    ));
    if (!activeBeehiveRuntime) {
        let staleBeehiveReturnZone = beeHasReturnZone ? merged.beehive.returnZoneId : merged.maxZoneId;
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
        if (merged.currentZoneId === 'beehive_run') merged.currentZoneId = staleBeehiveReturnZone;
    }
    if (merged.beehive && merged.beehive.inRun) {
        merged.combatHalted = !merged.beehive.awaitingClear;
    } else {
        merged.combatHalted = !!merged.combatHalted;
    }
    merged.seenTutorials = Array.isArray(merged.seenTutorials) ? merged.seenTutorials.filter(id => typeof id === 'string') : [];
    merged.journalEntries = Array.isArray(merged.journalEntries) ? Array.from(new Set(merged.journalEntries.filter(id => typeof id === 'string' && JOURNAL_DB[id]))) : ['prologue'];
    if (!merged.journalEntries.includes('prologue')) merged.journalEntries.unshift('prologue');
    if (Math.max(Math.floor(merged.season || 1), Math.floor(merged.loopCount || 0)) >= 2) {
        Object.keys(JOURNAL_DB).forEach(id => {
            if (/^act_/.test(id) && !merged.journalEntries.includes(id)) merged.journalEntries.push(id);
        });
    }
    merged.journalBonuses = Array.isArray(merged.journalBonuses) ? merged.journalBonuses.filter(entry => entry && typeof entry.stat === 'string' && Number.isFinite(entry.value)) : [];
    merged.journalBonusClaims = (merged.journalBonusClaims && typeof merged.journalBonusClaims === 'object') ? merged.journalBonusClaims : {};
    merged.journalEntries.forEach(id => {
        let entry = JOURNAL_DB[id];
        if (!entry || !entry.bonus) return;
        if (!merged.journalBonusClaims[id]) {
            merged.journalBonusClaims[id] = true;
            merged.journalBonuses.push({ entryId: id, stat: entry.bonus.stat, value: entry.bonus.value });
        }
    });
    merged.passiveStarEvolution = !!merged.passiveStarEvolution;
    merged.settings.showDeathNotice = merged.settings.showDeathNotice !== false;
    merged.settings.themeMode = merged.settings.themeMode === 'light' ? 'light' : 'dark';
    merged.settings.leftPaneCollapsed = !!merged.settings.leftPaneCollapsed;
    merged.settings.combatLogCollapsed = !!merged.settings.combatLogCollapsed;
    merged.settings.autoSalvageEnabled = !!merged.settings.autoSalvageEnabled;
    merged.settings.autoSalvageRarities = { ...(defaultGame.settings.autoSalvageRarities || {}), ...(merged.settings.autoSalvageRarities || {}) };
    merged.settings.jewelAutoSalvageEnabled = !!merged.settings.jewelAutoSalvageEnabled;
    merged.settings.jewelAutoSalvageRarities = { ...(defaultGame.settings.jewelAutoSalvageRarities || {}), ...(merged.settings.jewelAutoSalvageRarities || {}) };
    merged.settings.mapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(merged.settings.mapCompleteAction) ? merged.settings.mapCompleteAction : 'nextZone';
    merged.settings.townReturnAction = ['retry', 'stop'].includes(merged.settings.townReturnAction) ? merged.settings.townReturnAction : 'retry';
    merged.selectedHeroId = HERO_SELECTION_DEFS[merged.selectedHeroId] ? merged.selectedHeroId : 'hero1';
    merged.discoveredHeroIds = Array.isArray(merged.discoveredHeroIds) ? merged.discoveredHeroIds.filter(id => HERO_SELECTION_DEFS[id]) : ['hero1'];
    if (!merged.discoveredHeroIds.includes(merged.selectedHeroId)) merged.discoveredHeroIds.push(merged.selectedHeroId);
    merged.heroSelectionInitialized = !!merged.heroSelectionInitialized;
    merged.heroFreeSwitchUnlocked = !!merged.heroFreeSwitchUnlocked || merged.discoveredHeroIds.length >= HERO_SELECTION_ORDER.length;
    merged.pendingLoopHeroSelection = !!merged.pendingLoopHeroSelection;
    merged.abyssPassivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.abyssPassivePoints, defaultGame.abyssPassivePoints, 0)));
    merged.abyssClearedDepths = Array.isArray(merged.abyssClearedDepths) ? merged.abyssClearedDepths.map(v => Math.max(1, Math.floor(v || 1))).filter(v => v <= 20) : [];
    merged.abyssPassives = { ...(defaultGame.abyssPassives || {}), ...(merged.abyssPassives || {}) };
    merged.playerAilments = Array.isArray(merged.playerAilments) ? merged.playerAilments.map(row => ({ type: row.type, time: Math.max(0, clampFiniteNumber(row.time, 0, 0, 30)), power: Math.max(0, clampFiniteNumber(row.power, 0.1, 0, 1.5)), sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))) })).filter(row => row.type) : [];
    merged.playerLeechInstances = Array.isArray(merged.playerLeechInstances) ? merged.playerLeechInstances.map(row => ({ remaining: Math.max(0, clampFiniteNumber(row.remaining, 0, 0)), rate: Math.max(0, clampFiniteNumber(row.rate, 0, 0)), target: row.target === 'energyShield' ? 'energyShield' : 'life' })).filter(row => row.remaining > 0 && row.rate > 0).slice(0, 80) : [];
    merged.recentDamageEvents = Array.isArray(merged.recentDamageEvents) ? merged.recentDamageEvents.map(normalizeRecentDamageEvent).filter(Boolean) : [];
    merged.lastDeathLog = normalizeDeathLog(merged.lastDeathLog);
    merged.enemies = Array.isArray(merged.enemies) ? merged.enemies.map(normalizeEnemyRecord).filter(Boolean) : [];
    let aliveEnemyIds = new Set((merged.enemies || []).map(enemy => String(enemy.id)));
    function pruneEnemyRuntimeMap(rawMap, options = {}) {
        let map = (rawMap && typeof rawMap === 'object') ? rawMap : {};
        let keys = Object.keys(map);
        let maxKeys = Math.max(0, Math.floor(options.maxKeys || 200));
        let out = {};
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!aliveEnemyIds.has(String(key))) continue;
            out[key] = map[key];
            if (Object.keys(out).length >= maxKeys) break;
        }
        return out;
    }
    merged.enemyKeystoneDebuffs = pruneEnemyRuntimeMap(merged.enemyKeystoneDebuffs, { maxKeys: 120 });
    merged.rangerWeakpointMarks = pruneEnemyRuntimeMap(merged.rangerWeakpointMarks, { maxKeys: 120 });
    merged.enemyUniqueChaosResDown = pruneEnemyRuntimeMap(merged.enemyUniqueChaosResDown, { maxKeys: 120 });
    merged.enemyUniqueElementalResDown = pruneEnemyRuntimeMap(merged.enemyUniqueElementalResDown, { maxKeys: 120 });
    merged.enemyCurseExpirePayloads = pruneEnemyRuntimeMap(merged.enemyCurseExpirePayloads, { maxKeys: 120 });
    merged.encounterPlan = Array.isArray(merged.encounterPlan) ? merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
    merged.level = Math.max(1, Math.floor(clampFiniteNumber(merged.level, defaultGame.level, 1, MAX_PLAYER_LEVEL)));
    merged.exp = Math.max(0, Math.floor(clampFiniteNumber(merged.exp, defaultGame.exp, 0)));
    merged.season = Math.max(1, Math.floor(clampFiniteNumber(merged.season, defaultGame.season, 1)));
    merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.loopCount, defaultGame.loopCount, 0)));
    merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanDefeatAttempts, defaultGame.woodsmanDefeatAttempts, 0)));
    merged.woodsmanSimulatorSeenLoop = !!merged.woodsmanSimulatorSeenLoop;
    merged.woodsmanEntrancePending = !!(merged.woodsmanEntrancePending && merged.currentZoneId === OUTSIDE_CHAOS_ZONE_ID);
    merged.woodsmanCurseActive = !!merged.woodsmanCurseActive;
    merged.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseDamageTakenStacks, defaultGame.woodsmanCurseDamageTakenStacks || 0, 0)));
    merged.woodsmanCurseLastTickAt = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseLastTickAt, defaultGame.woodsmanCurseLastTickAt || 0, 0)));
    merged.woodsmanCurseNextLogStack = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseNextLogStack, defaultGame.woodsmanCurseNextLogStack || 0, 0)));
    merged.chaosInfuserUnlocked = !!merged.chaosInfuserUnlocked || merged.woodsmanSimulatorSeenLoop || Math.max(0, Math.floor(merged.woodsmanDefeatAttempts || 0)) > 0 || (Array.isArray(merged.journalEntries) && merged.journalEntries.includes('woodsman'));
    merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(merged.killsInZone, defaultGame.killsInZone, 0)));
    merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.passivePoints, defaultGame.passivePoints, 0))) + Math.max(0, Math.floor(merged.autoRefundedPassivePoints || 0));
    merged.inventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.inventoryExpandLevel, defaultGame.inventoryExpandLevel, 0)));
    merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0)));
    merged.settings = { ...defaultGame.settings, ...(merged.settings || {}) };
    merged.settings.notiFilters = { ...(defaultGame.settings.notiFilters || {}), ...(merged.settings.notiFilters || {}) };
    merged.playerHp = Math.max(0, Math.floor(clampFiniteNumber(merged.playerHp, defaultGame.playerHp, 0)));
    merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(merged.playerEnergyShield, defaultGame.playerEnergyShield, 0))); 
    merged.moveTimer = clampFiniteNumber(merged.moveTimer, defaultGame.moveTimer, 0);
    merged.moveTotalTime = clampFiniteNumber(merged.moveTotalTime, defaultGame.moveTotalTime, 0);
    merged.runProgress = clampFiniteNumber(merged.runProgress, defaultGame.runProgress, 0, 100);
    merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(merged.encounterIndex, defaultGame.encounterIndex, 0)));
    merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(merged.nextEnemyId, defaultGame.nextEnemyId, 1)));
    merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.seasonPoints, defaultGame.seasonPoints, 0)));
    merged.loopDeepPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.loopDeepPoints, defaultGame.loopDeepPoints, 0)));
    merged.loopDeepStats = { ...(defaultGame.loopDeepStats || {}), ...(merged.loopDeepStats || {}) };
    merged.chaosRealm = { ...createDefaultChaosRealmState(), ...(merged.chaosRealm || {}) };
    merged.chaosRealm.permanentBonuses = { ...CHAOS_REALM_DEFAULT_BONUSES, ...((merged.chaosRealm || {}).permanentBonuses || {}) };
    merged.chaosRealm.unlocked = !!merged.chaosRealm.unlocked;
    merged.chaosRealm.highestFloor = Math.max(0, Math.floor(clampFiniteNumber(merged.chaosRealm.highestFloor, 0, 0)));
    merged.chaosRealm.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.chaosRealm.currentFloor, 1, 1)));
    merged.chaosRealm.clearedFloors = Array.isArray(merged.chaosRealm.clearedFloors) ? Array.from(new Set(merged.chaosRealm.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.chaosRealm.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(merged.chaosRealm.woodsmanBestDamagePct) || 0));
    Object.keys(CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { merged.chaosRealm.permanentBonuses[key] = Math.max(0, Number(merged.chaosRealm.permanentBonuses[key]) || 0); });
    if (merged.chaosRealm.unlocked && merged.chaosRealm.highestFloor < 1) merged.chaosRealm.highestFloor = 1;
    merged.woodsmanPendingScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanPendingScore, defaultGame.woodsmanPendingScore || 0, 0)));
    merged.woodsmanLifetimeScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanLifetimeScore, defaultGame.woodsmanLifetimeScore || 0, 0)));
    merged.woodsmanSettledScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanSettledScore, defaultGame.woodsmanSettledScore || 0, 0)));
    merged.loopProgressBase = { ...(defaultGame.loopProgressBase || {}), ...(merged.loopProgressBase || {}) };
    merged.loopProgressCurrent = { ...(defaultGame.loopProgressCurrent || {}), ...(merged.loopProgressCurrent || {}) };
    merged.loopProgressBase.specialBosses = Array.isArray(merged.loopProgressBase.specialBosses) ? merged.loopProgressBase.specialBosses : [];
    merged.loopProgressCurrent.specialBosses = Array.isArray(merged.loopProgressCurrent.specialBosses) ? merged.loopProgressCurrent.specialBosses : [];
    merged.loopProgressCurrent.chaos20Cleared = !!merged.loopProgressCurrent.chaos20Cleared;
    merged.pendingLoopDecision = !!merged.pendingLoopDecision;
    merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendPoints, defaultGame.ascendPoints, 0)));
    merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, defaultGame.ascendRank, 0, 4)));
    merged.activeSkill = SKILL_DB[merged.activeSkill] ? merged.activeSkill : (merged.skills[0] || '기본 공격');
    if (typeof merged.currentZoneId === 'string' && /^\d+$/.test(merged.currentZoneId)) merged.currentZoneId = parseInt(merged.currentZoneId, 10);
    if (typeof merged.maxZoneId === 'string' && /^\d+$/.test(merged.maxZoneId)) merged.maxZoneId = parseInt(merged.maxZoneId, 10);
    if (typeof merged.maxZoneId !== 'string') {
        let mergedSeasonCap = getSeasonFinalZoneId(merged.season || 1);
        merged.maxZoneId = clampNumber(Number.isFinite(merged.maxZoneId) ? merged.maxZoneId : 0, 0, Math.max(MAP_ZONES.length - 1, mergedSeasonCap));
    }
    if (typeof merged.currentZoneId !== 'string') {
        let numericZoneId = Number.isFinite(merged.currentZoneId) ? merged.currentZoneId : 0;
        let savedDepth = Math.max(Math.floor(merged.abyssEndlessDepth || 20), getAbyssDepthFromZoneId(numericZoneId), ...((Array.isArray(merged.abyssUnlockedDepths) ? merged.abyssUnlockedDepths : [20]).map(v => Math.floor(v || 0))));
        let maxDeepZoneId = getAbyssZoneIdForDepth(Math.max(20, savedDepth));
        merged.currentZoneId = clampNumber(numericZoneId, 0, Math.max(MAP_ZONES.length - 1, maxDeepZoneId));
    }
    if (typeof merged.currentZoneId === 'string' && !merged.currentZoneId.startsWith('trial_') && !merged.currentZoneId.includes('_boss_') && merged.currentZoneId !== 'beehive_run' && merged.currentZoneId !== LABYRINTH_ZONE_ID && merged.currentZoneId !== METEOR_FALL_ZONE_ID && merged.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID && merged.currentZoneId !== CHAOS_REALM_ZONE_ID && merged.currentZoneId !== UNDERWORLD_ZONE_ID) merged.currentZoneId = 0;
    if (typeof merged.currentZoneId === 'string' && !getZone(merged.currentZoneId)) merged.currentZoneId = 0;
    if (merged.currentZoneId === 'beehive_run' && !(merged.beehive && merged.beehive.inRun)) merged.currentZoneId = merged.beehive && merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null ? merged.beehive.returnZoneId : merged.maxZoneId;
    if (merged.beehive && merged.beehive.inRun && merged.currentZoneId !== 'beehive_run') {
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
    }
    if (merged.woodsmanBuildLock && (merged.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID || !merged.woodsmanBuildSnapshot)) {
        merged.woodsmanBuildLock = false;
        merged.woodsmanBuildSnapshot = null;
    }
    let currentAbyssDepth = typeof merged.currentZoneId !== 'string' ? getAbyssDepthFromZoneId(merged.currentZoneId) : 0;
    let legacyDeepChaosSlot = (merged.season || 1) >= 10 && currentAbyssDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
    if (typeof merged.maxZoneId !== 'string' && typeof merged.currentZoneId !== 'string' && merged.currentZoneId > merged.maxZoneId && currentAbyssDepth <= 20 && !legacyDeepChaosSlot) merged.currentZoneId = merged.maxZoneId;
    if (merged.discoveredPassives.length === 0) merged.discoveredPassives = ['n0'];
    let seasonCap = getSeasonFinalZoneId(merged.season || 1);
    if (typeof merged.maxZoneId !== 'string') merged.maxZoneId = clampNumber(merged.maxZoneId, 0, seasonCap);
    if (typeof merged.currentZoneId !== 'string') {
        let normalizedDepth = getAbyssDepthFromZoneId(merged.currentZoneId);
        let keepLegacyDeepChaosSlot = (merged.season || 1) >= 10 && normalizedDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
        if ((normalizedDepth <= 20 && !keepLegacyDeepChaosSlot) || (merged.season || 1) < 10) merged.currentZoneId = clampNumber(merged.currentZoneId, 0, seasonCap);
    }
    if ((merged.season || 1) >= STAR_WEDGE_UNLOCK_LOOP && (merged.maxZoneId || 0) >= STAR_WEDGE_UNLOCK_ACT) {
        merged.starWedge.unlocked = true;
    }
    merged.saveVersion = defaultGame.saveVersion;
    return merged;
}

function cloneDefaultGame() {
    return JSON.parse(JSON.stringify(defaultGame));
}

function isStartupOverlayOpen() {
    return !!startupOverlayActive;
}

function setStartupOverlayActive(active) {
    startupOverlayActive = !!active;
    document.body.classList.toggle('startup-active', startupOverlayActive);
    let overlay = document.getElementById('startup-overlay');
    if (overlay) overlay.classList.toggle('active', startupOverlayActive);
}

function setLoadingOverlayState(active, options = {}) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (loadingOverlayTimer) {
        clearInterval(loadingOverlayTimer);
        loadingOverlayTimer = null;
    }
    if (!active) {
        overlay.classList.remove('active');
        document.body.classList.remove('loading-active');
        loadingOverlayProgress = 0;
        if (barEl) barEl.style.width = '0%';
        return;
    }
    loadingOverlayProgress = Math.max(0, Math.min(92, options.progress || 12));
    if (titleEl) titleEl.innerText = options.title || '차원을 정렬하는 중...';
    if (detailEl) detailEl.innerText = options.detail || '세이브 상태를 점검하고 전장을 준비하고 있습니다.';
    if (captionEl) captionEl.innerText = options.caption || 'Syncing Timeline';
    if (barEl) barEl.style.width = `${loadingOverlayProgress}%`;
    overlay.classList.add('active');
    document.body.classList.add('loading-active');
    loadingOverlayTimer = setInterval(() => {
        loadingOverlayProgress = Math.min(93, loadingOverlayProgress + (Math.random() * 7 + 2));
        if (barEl) barEl.style.width = `${loadingOverlayProgress}%`;
    }, 260);
}

function advanceLoadingOverlay(options = {}) {
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (titleEl && options.title) titleEl.innerText = options.title;
    if (detailEl && options.detail) detailEl.innerText = options.detail;
    if (captionEl && options.caption) captionEl.innerText = options.caption;
    if (barEl && Number.isFinite(options.progress)) {
        loadingOverlayProgress = Math.max(loadingOverlayProgress, options.progress);
        barEl.style.width = `${loadingOverlayProgress}%`;
    }
}

async function finishLoadingOverlay() {
    advanceLoadingOverlay({
        progress: 100,
        title: '전장을 여는 중...',
        detail: '진입 준비를 마무리하고 있습니다.',
        caption: 'Opening Gate'
    });
    await new Promise(resolve => setTimeout(resolve, 320));
    setLoadingOverlayState(false);
}

function openStartupGate(options = {}) {
    if (options.accountOnly && cloudState.user) setCloudMessage('계정 화면을 열었습니다. 다른 계정을 쓰려면 "다른 계정 사용"을 눌러주세요.');
    else if (options.accountOnly && !cloudState.user) setCloudMessage('계정 화면을 열었습니다. 로그인하거나 회원가입할 수 있습니다.');
    else setCloudMessage('시작 화면을 다시 열었습니다.');
    setStartupOverlayActive(true);
    updateCloudSaveUI();
}

function getCurrentZoneLabel() {
    let zone = getZone && typeof getZone === 'function' ? getZone(game.currentZoneId) : null;
    return zone && zone.name ? zone.name : '액트 1: 버려진 해안';
}

function updateStartupScreenUI() {
    let overlay = document.getElementById('startup-overlay');
    if (!overlay) return;
    let config = getCloudConfig();
    let localSummaryEl = document.getElementById('startup-local-summary');
    let localTimeEl = document.getElementById('startup-local-time');
    let statusEl = document.getElementById('startup-status');
    let authFormEl = document.getElementById('startup-auth-form');
    let authActionsEl = document.getElementById('startup-auth-actions');
    let socialActionsEl = document.getElementById('startup-social-actions');
    let continueBtn = document.getElementById('btn-startup-continue');
    let switchBtn = document.getElementById('btn-startup-switch-account');
    let guestBtn = document.getElementById('btn-startup-guest');
    let backBtn = document.getElementById('btn-startup-back');
    let loginBtn = document.getElementById('btn-startup-login');
    let signupBtn = document.getElementById('btn-startup-signup');
    let googleBtn = document.getElementById('btn-startup-google');
    let kakaoBtn = document.getElementById('btn-startup-kakao');
    let localStamp = game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0;
    let zoneLabel = getCurrentZoneLabel();
    let loopLabel = Math.max(1, Math.floor((game && game.season) || 1));
    if (localSummaryEl) localSummaryEl.innerText = `Lv.${game.level || 1} · 루프 ${loopLabel} · ${zoneLabel}`;
    if (localTimeEl) localTimeEl.innerText = formatCloudTime(localStamp);
    if (statusEl) statusEl.innerHTML = `<strong>안내</strong><br>${cloudState.lastMessage || '시작 방식을 선택해주세요.'}`;
    if (backBtn) {
        backBtn.style.display = gameplayStarted ? 'block' : 'none';
        backBtn.disabled = cloudState.busy;
    }

    if (!config.enabled) {
        if (authFormEl) authFormEl.classList.remove('hidden');
        if (authActionsEl) authActionsEl.style.display = 'grid';
        if (socialActionsEl) socialActionsEl.style.display = 'grid';
        if (continueBtn) continueBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'none';
        if (loginBtn) loginBtn.disabled = true;
        if (signupBtn) signupBtn.disabled = true;
        if (googleBtn) googleBtn.disabled = true;
        if (kakaoBtn) kakaoBtn.disabled = true;
        if (guestBtn) guestBtn.disabled = false;
        return;
    }

    if (cloudState.user) {
        if (authFormEl) authFormEl.classList.add('hidden');
        if (authActionsEl) authActionsEl.style.display = 'none';
        if (socialActionsEl) socialActionsEl.style.display = 'none';
        if (continueBtn) {
            continueBtn.style.display = 'block';
            continueBtn.disabled = cloudState.busy;
        }
        if (switchBtn) {
            switchBtn.style.display = 'block';
            switchBtn.disabled = cloudState.busy;
        }
        if (guestBtn) guestBtn.disabled = cloudState.busy;
        return;
    }

    if (authFormEl) authFormEl.classList.remove('hidden');
    if (authActionsEl) authActionsEl.style.display = 'grid';
    if (socialActionsEl) socialActionsEl.style.display = 'grid';
    if (continueBtn) continueBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (loginBtn) loginBtn.disabled = cloudState.busy;
    if (signupBtn) signupBtn.disabled = cloudState.busy;
    if (googleBtn) googleBtn.disabled = cloudState.busy;
    if (kakaoBtn) kakaoBtn.disabled = cloudState.busy;
    if (guestBtn) guestBtn.disabled = cloudState.busy;
}

function getCloudConfig() {
    let raw = window.CLOUD_SAVE_CONFIG || {};
    let supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
    let supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
    let enabled = raw.enabled !== false && !!supabaseUrl && !!supabaseAnonKey;
    return { enabled, supabaseUrl, supabaseAnonKey };
}

const CLOUD_TOKEN_REFRESH_LEEWAY_MS = 5 * 60 * 1000;
const CLOUD_TOKEN_EXPIRY_WARNING_MS = 10 * 60 * 1000;

const CLOUD_SKIP_OAUTH_RESTORE_KEY = 'projectidle_cloud_skip_oauth_restore';

function markSkipOAuthRestoreOnce() {
    try { localStorage.setItem(CLOUD_SKIP_OAUTH_RESTORE_KEY, '1'); } catch (e) {}
}

function consumeSkipOAuthRestoreOnce() {
    try {
        let marked = localStorage.getItem(CLOUD_SKIP_OAUTH_RESTORE_KEY) === '1';
        if (marked) localStorage.removeItem(CLOUD_SKIP_OAUTH_RESTORE_KEY);
        return marked;
    } catch (e) {
        return false;
    }
}

async function clearSupabasePersistedSession() {
    let client = getSupabaseClient();
    if (!client) return;
    try {
        await client.auth.signOut({ scope: 'local' });
    } catch (error) {
        console.warn('supabase local signout failed:', error);
    }
}

let supabaseClient = null;

function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (supabaseClient) return supabaseClient;
    let config = getCloudConfig();
    if (!config.enabled) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('supabase-js is not loaded.');
        return null;
    }
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    window.supabaseClient = supabaseClient;
    return supabaseClient;
}

function getOAuthRedirectUrl() {
    let origin = window.location.origin || '';
    let pathname = window.location.pathname || '/';
    let normalizedPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
    return `${origin}${normalizedPath}`;
}

async function loginWithGoogle() {
    await loginWithOAuthProvider('google');
}

async function loginWithKakao() {
    await loginWithOAuthProvider('kakao');
}

function getSocialOAuthOptions(provider) {
    let redirectTo = getOAuthRedirectUrl();
    let options = { redirectTo };
    if (provider === 'kakao') {
        // 카카오 로그인에서 account_email scope를 요청하지 않습니다.
        options.scopes = 'profile_nickname';
        options.queryParams = { scope: 'profile_nickname' };
    }
    return options;
}


function sanitizeKakaoScopeInUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        let url = new URL(rawUrl);
        let scopeRaw = url.searchParams.get('scope') || '';
        let scopes = scopeRaw.split(/\s+/).map(v => v.trim()).filter(Boolean);
        let filtered = scopes.filter(scope => scope !== 'account_email');
        if (filtered.length === 0) filtered = ['profile_nickname'];
        url.searchParams.set('scope', filtered.join(' '));
        return url.toString();
    } catch (e) {
        return rawUrl;
    }
}

async function loginWithOAuthProvider(provider) {
    let client = getSupabaseClient();
    if (!client) return setCloudMessage('OAuth 클라이언트를 초기화하지 못했습니다.');
    if (cloudState.busy) return;
    cloudState.busy = true;
    setCloudMessage(`${provider === 'google' ? 'Google' : '카카오'} 로그인으로 이동 중입니다...`);
    updateCloudSaveUI();
    try {
        let options = getSocialOAuthOptions(provider);
        if (provider === 'kakao') options.skipBrowserRedirect = true;
        let { data, error } = await client.auth.signInWithOAuth({ provider, options });
        if (error) throw error;
        if (provider === 'kakao') {
            let safeUrl = sanitizeKakaoScopeInUrl(data && data.url);
            if (!safeUrl) throw new Error('Kakao OAuth URL을 생성하지 못했습니다.');
            window.location.assign(safeUrl);
            return;
        }
    } catch (error) {
        cloudState.busy = false;
        setCloudMessage('OAuth 로그인 시작 실패: ' + (error.message || error));
        updateCloudSaveUI();
    }
}

function recoverBusyStateAfterOAuthBack() {
    if (!cloudState.busy) return;
    let href = window.location.href || '';
    let hasOAuthParams = /[?#].*(access_token|code|error|state)=/i.test(href);
    if (hasOAuthParams) return;
    cloudState.busy = false;
    setCloudMessage('인증이 취소되었습니다. 다시 시도해주세요.');
    updateCloudSaveUI();
}

window.addEventListener('pageshow', recoverBusyStateAfterOAuthBack);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) recoverBusyStateAfterOAuthBack();
});

async function tryRestoreSupabaseOAuthSession() {
    let client = getSupabaseClient();
    if (!client) return false;
    try {
        let { data, error } = await client.auth.getSession();
        if (error) throw error;
        let session = data && data.session;
        if (!session || !session.access_token) return false;
        applyCloudSession(session);
        await refreshCloudLinkedIdentities();
        let userLabel = (session.user && session.user.email) ? session.user.email : (session.user && session.user.id ? session.user.id : '알 수 없음');
        setCloudMessage('로그인됨: ' + userLabel);
        return true;
    } catch (error) {
        console.warn('supabase oauth session restore failed:', error);
        return false;
    }
}

function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function persistCloudSession(session) {
    try {
        localStorage.setItem(CLOUD_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {}
}

function clearCloudSessionStorage() {
    try {
        localStorage.removeItem(CLOUD_SESSION_STORAGE_KEY);
    } catch (e) {}
}

function loadStoredCloudSession() {
    try {
        let raw = localStorage.getItem(CLOUD_SESSION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function applyCloudSession(session) {
    if (!session || !session.access_token) {
        cloudState.session = null;
        cloudState.user = null;
        cloudState.isLoaded = false;
        clearCloudSessionStorage();
        updateCloudSaveUI();
        return;
    }
    let expiresAt = Number(session.expires_at) || 0;
    if (!expiresAt && Number(session.expires_in) > 0) expiresAt = Math.floor(Date.now() / 1000) + Math.floor(Number(session.expires_in));
    cloudState.session = {
        access_token: session.access_token,
        refresh_token: session.refresh_token || (cloudState.session && cloudState.session.refresh_token) || '',
        expires_at: expiresAt,
        token_type: session.token_type || 'bearer',
        user: session.user || cloudState.user || null
    };
    cloudState.user = cloudState.session.user;
    cloudState.isLoaded = false;
    cloudState.tokenExpiryWarned = false;
    persistCloudSession(cloudState.session);
    updateCloudSaveUI();
}

function getCloudSessionExpiresAtMs() {
    let expiresAt = cloudState.session ? Number(cloudState.session.expires_at || 0) : 0;
    return expiresAt > 0 ? expiresAt * 1000 : 0;
}

function notifyCloudSessionExpired(message) {
    let text = message || '클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
    setCloudMessage(text);
    if (!cloudState.tokenExpiryWarned && typeof addLog === 'function') addLog(`⚠️ ${text}`, 'loot-rare');
    cloudState.tokenExpiryWarned = true;
}

async function refreshCloudSession(reason) {
    if (!cloudState.session || !cloudState.session.refresh_token) {
        notifyCloudSessionExpired('클라우드 로그인 갱신 정보가 없습니다. 다시 로그인해주세요.');
        return false;
    }
    if (cloudState.tokenRefreshPromise) return await cloudState.tokenRefreshPromise;
    cloudState.tokenRefreshPromise = (async () => {
        try {
            setCloudMessage(reason ? `클라우드 로그인 갱신 중... (${reason})` : '클라우드 로그인 갱신 중...');
            let refreshed = await cloudJsonRequest('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST',
                useAuth: false,
                body: { refresh_token: cloudState.session.refresh_token }
            });
            applyCloudSession(refreshed);
            setCloudMessage('클라우드 로그인 세션을 자동 갱신했습니다.');
            return true;
        } catch (error) {
            console.warn('cloud token refresh failed:', error);
            applyCloudSession(null);
            notifyCloudSessionExpired('클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            return false;
        } finally {
            cloudState.tokenRefreshPromise = null;
            updateCloudSaveUI();
        }
    })();
    return await cloudState.tokenRefreshPromise;
}

async function ensureCloudSessionFresh(reason) {
    if (!cloudState.session || !cloudState.session.access_token) return false;
    let expiresAtMs = getCloudSessionExpiresAtMs();
    if (!expiresAtMs) return true;
    let remaining = expiresAtMs - Date.now();
    if (remaining <= CLOUD_TOKEN_REFRESH_LEEWAY_MS) return await refreshCloudSession(reason || '만료 예정');
    if (remaining <= CLOUD_TOKEN_EXPIRY_WARNING_MS && !cloudState.tokenExpiryWarned) notifyCloudSessionExpired('클라우드 로그인 세션이 곧 만료됩니다. 만료 전 자동 갱신 예정입니다.');
    return true;
}

async function cloudJsonRequest(path, options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) throw new Error('cloud-save-config.js 설정이 비어 있습니다.');
    if (options.useAuth !== false) {
        let fresh = await ensureCloudSessionFresh('요청 전 확인');
        if (!fresh) throw new Error('클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    }
    let headers = { apikey: config.supabaseAnonKey, ...(options.headers || {}) };
    if (options.useAuth !== false && cloudState.session && cloudState.session.access_token) headers.Authorization = `Bearer ${cloudState.session.access_token}`;
    let body = options.body;
    if (body !== undefined && typeof body !== 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    let response = await fetch(config.supabaseUrl + path, {
        method: options.method || 'GET',
        headers,
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    });
    let text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text;
        }
    }
    if (!response.ok) {
        let message = data && (data.msg || data.error_description || data.message || data.error);
        throw new Error(message || `HTTP ${response.status}`);
    }
    return data;
}

function collectCloudCredentials() {
    let emailEl = document.getElementById('startup-email');
    let passwordEl = document.getElementById('startup-password');
    return {
        email: emailEl ? String(emailEl.value || '').trim() : '',
        password: passwordEl ? String(passwordEl.value || '') : ''
    };
}

function clearCloudPasswordInput() {
    let passwordEl = document.getElementById('startup-password');
    if (passwordEl) passwordEl.value = '';
}

async function enterGameWorld() {
    advanceLoadingOverlay({
        title: '전장을 불러오는 중...',
        detail: '전투 로그와 캐릭터 상태를 복원하고 있습니다.',
        caption: 'Restoring Battlefield',
        progress: 88
    });
    gameplayStarted = true;
    setStartupOverlayActive(false);
    try {
        let settingsTab = document.getElementById('tab-settings');
        if (settingsTab && settingsTab.classList.contains('active')) {
            try {
                switchTab('tab-character');
            } catch (error) {
                console.error('switchTab on enterGameWorld failed:', error);
            }
        }
        updateStaticUI();
    } catch (error) {
        console.error('updateStaticUI on enterGameWorld failed:', error);
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('renderBattlefield on enterGameWorld failed:', error);
    } finally {
        try {
            await finishLoadingOverlay();
        } catch (error) {
            console.error('finishLoadingOverlay on enterGameWorld failed:', error);
        }
        setLoadingOverlayState(false);
    }
}

async function continueWithCloudSession() {
    if (!cloudState.user || cloudState.busy) return;
    cloudState.busy = true;
    setLoadingOverlayState(true, {
        title: '클라우드 세이브를 여는 중...',
        detail: '계정 연결을 확인하고 최신 진행도를 비교하고 있습니다.',
        caption: 'Checking Cloud Save',
        progress: 14
    });
    setCloudMessage('클라우드 세이브를 확인하고 있습니다...');
    updateCloudSaveUI();
    try {
        advanceLoadingOverlay({
            title: '클라우드 저장을 불러오는 중...',
            detail: '클라우드 저장 전체를 로컬에 적용할 준비를 하고 있습니다.',
            caption: 'Comparing Timelines',
            progress: 48
        });
        await reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true });
        await enterGameWorld();
    } catch (error) {
        setCloudMessage('클라우드 세이브 연결 실패: ' + (error.message || error));
        setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

function prepareStartupAccountSwitch() {
    markSkipOAuthRestoreOnce();
    clearSupabasePersistedSession();
    applyCloudSession(null);
    cloudState.lastRemoteUpdatedAt = 0;
    cloudState.lastRemoteLoop = 0;
    setCloudMessage('다른 계정으로 로그인할 수 있습니다.');
    updateCloudSaveUI();
}

function returnFromStartupGate() {
    if (!gameplayStarted || cloudState.busy) return;
    setStartupOverlayActive(false);
    updateCloudSaveUI();
}

function startGuestMode() {
    if (cloudState.busy) return;
    if (cloudState.user && !confirm('현재 복원된 로그인 세션은 사용하지 않고 이 기기 로컬 저장만으로 시작할까요?')) return;
    if (cloudState.user) {
        markSkipOAuthRestoreOnce();
        clearSupabasePersistedSession();
        applyCloudSession(null);
        cloudState.linkedProviders = [];
        cloudState.lastRemoteUpdatedAt = 0;
        cloudState.lastRemoteLoop = 0;
    }
    setCloudMessage('게스트 모드로 시작합니다. 이 기기 저장만 사용합니다.');
    setLoadingOverlayState(true, {
        title: '게스트 세션을 준비하는 중...',
        detail: '현재 기기 로컬 저장을 기준으로 전장을 준비하고 있습니다.',
        caption: 'Starting Local Session',
        progress: 22
    });
    enterGameWorld();
}

function startupLogin() {
    cloudLogin({ source: 'startup', enterGame: true });
}

function startupSignUp() {
    cloudSignUp({ source: 'startup', enterGame: true });
}


async function refreshCloudLinkedIdentities() {
    let client = getSupabaseClient();
    if (!client || !cloudState.user) {
        cloudState.linkedProviders = [];
        cloudState.identityLookupState = cloudState.user ? 'needs_login' : 'idle';
        return [];
    }
    try {
        if (cloudState.session && cloudState.session.access_token && cloudState.session.refresh_token && client.auth && typeof client.auth.setSession === 'function') {
            try {
                await client.auth.setSession({
                    access_token: cloudState.session.access_token,
                    refresh_token: cloudState.session.refresh_token
                });
            } catch (sessionSyncError) {
                console.warn('supabase session sync failed before identity lookup:', sessionSyncError);
            }
        }
        let sessionResult = await client.auth.getSession();
        if (sessionResult && sessionResult.error) throw sessionResult.error;
        let session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        if (!session || !session.access_token) {
            cloudState.linkedProviders = [];
            cloudState.identityLookupState = 'needs_login';
            setCloudMessage('로그인 후 이용 가능합니다');
            return [];
        }
        let providers = [];
        if (client.auth && typeof client.auth.getUserIdentities === 'function') {
            let { data, error } = await client.auth.getUserIdentities();
            if (error) throw error;
            let identities = data && (data.identities || data.user_identities) ? (data.identities || data.user_identities) : [];
            providers = identities.map(it => it && (it.provider || it.identity_provider)).filter(Boolean);
        } else {
            let { data, error } = await client.auth.getUser();
            if (error) throw error;
            let identities = data && data.user && Array.isArray(data.user.identities) ? data.user.identities : [];
            providers = identities.map(it => it && it.provider).filter(Boolean);
        }
        cloudState.linkedProviders = Array.from(new Set(providers));
        cloudState.identityLookupState = 'ready';
        return cloudState.linkedProviders;
    } catch (error) {
        console.warn('failed to load linked identities:', error);
        cloudState.linkedProviders = [];
        cloudState.identityLookupState = 'needs_login';
        return [];
    }
}

async function linkGoogleAccount() {
    return await linkSocialIdentityProvider('google');
}

async function linkKakaoAccount() {
    return await linkSocialIdentityProvider('kakao');
}

async function linkSocialIdentityProvider(provider) {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    await refreshCloudLinkedIdentities();
    let providerKey = String(provider || '').toLowerCase();
    let linkedProviders = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders : [];
    let alreadyLinked = linkedProviders.some(it => String(it || '').toLowerCase() === providerKey);
    if (alreadyLinked) return setCloudMessage(`${provider === 'google' ? 'Google' : '카카오'} 계정은 이미 연동되어 있습니다.`);
    let client = getSupabaseClient();
    if (!client) return setCloudMessage('Supabase OAuth 클라이언트를 초기화하지 못했습니다.');
    // Supabase Dashboard > Authentication에서 Manual Identity Linking 옵션이 켜져 있어야 동작합니다.
    if (typeof client.auth.linkIdentity !== 'function') return setCloudMessage('현재 Supabase 클라이언트에서 계정 연결 API를 지원하지 않습니다.');
    if (cloudState.session && cloudState.session.access_token && cloudState.session.refresh_token && client.auth && typeof client.auth.setSession === 'function') {
        try {
            await client.auth.setSession({
                access_token: cloudState.session.access_token,
                refresh_token: cloudState.session.refresh_token
            });
        } catch (sessionSyncError) {
            console.warn('supabase session sync failed before linkIdentity:', sessionSyncError);
        }
    }
    let sessionResult = await client.auth.getSession();
    if (sessionResult && sessionResult.error) return setCloudMessage('로그인 후 이용 가능합니다');
    let session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    if (!session || !session.access_token) return setCloudMessage('로그인 후 이용 가능합니다');
    cloudState.busy = true;
    setCloudMessage(`${provider === 'google' ? 'Google' : '카카오'} 계정 연결을 시작합니다...`);
    updateCloudSaveUI();
    try {
        let options = getSocialOAuthOptions(provider);
        let { data, error } = await client.auth.linkIdentity({ provider, options });
        if (error) throw error;
        if (provider === 'kakao') {
            let safeUrl = sanitizeKakaoScopeInUrl(data && data.url);
            if (!safeUrl) throw new Error('카카오 연동 페이지 URL을 받지 못했습니다.');
            window.location.assign(safeUrl);
            return;
        }
    } catch (error) {
        setCloudMessage('소셜 계정 연결 시작 실패: ' + (error.message || error));
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

function updateCloudSaveUI() {
    let pill = document.getElementById('ui-cloud-status-pill');
    let config = getCloudConfig();
    cloudState.configured = config.enabled;
    let hintEl = document.getElementById('ui-cloud-config-hint');
    let userEl = document.getElementById('ui-cloud-user');
    let localEl = document.getElementById('ui-cloud-local-save');
    let remoteEl = document.getElementById('ui-cloud-remote-save');
    let msgEl = document.getElementById('ui-cloud-message');
    let openGateBtn = document.getElementById('btn-cloud-open-gate');
    let switchGateBtn = document.getElementById('btn-cloud-return-startup');
    let canSync = config.enabled && !cloudState.busy && !!cloudState.user;

    if (pill) {
        pill.className = 'cloud-status-pill';
        if (!config.enabled) {
            pill.innerText = '미설정';
        } else if (cloudState.busy) {
            pill.classList.add('syncing');
            pill.innerText = '처리 중';
        } else if (cloudState.user) {
            pill.classList.add('online');
            pill.innerText = '연결됨';
        } else {
            pill.innerText = '대기 중';
        }
    }
    if (!config.enabled) {
        if (hintEl) hintEl.innerText = 'cloud-save-config.js에 Supabase URL과 publishable key를 넣으면 클라우드 세이브가 켜집니다.';
    } else if (cloudState.busy) {
        if (hintEl) hintEl.innerText = '시작 화면 또는 현재 세션에서 저장 데이터를 서버와 동기화하고 있습니다.';
    } else if (cloudState.user) {
        if (hintEl) hintEl.innerText = '로그인된 계정은 수동 저장 시 자동 업로드됩니다. 계정 변경은 시작 화면을 다시 열어 진행할 수 있습니다.';
    } else {
        if (hintEl) hintEl.innerText = '로그인과 회원가입은 시작 화면에서 진행합니다. 여기서는 상태 확인과 시작 화면 재열기만 제공합니다.';
    }
    if (pill && cloudState.lastMessage && /실패|오류/.test(cloudState.lastMessage) && !cloudState.busy) pill.classList.add('error');

    if (openGateBtn) openGateBtn.disabled = cloudState.busy;
    if (switchGateBtn) switchGateBtn.disabled = cloudState.busy || (!cloudState.user && !gameplayStarted);
    ['btn-cloud-logout', 'btn-cloud-push', 'btn-cloud-pull'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.disabled = !canSync;
    });
    let linkedProviders = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders.map(it => String(it || '').toLowerCase()) : [];
    let isGoogleLinked = linkedProviders.includes('google');
    let isKakaoLinked = linkedProviders.includes('kakao');
    let linkGoogleBtn = document.getElementById('btn-cloud-link-google');
    let linkKakaoBtn = document.getElementById('btn-cloud-link-kakao');
    if (linkGoogleBtn) {
        linkGoogleBtn.disabled = !canSync || isGoogleLinked;
        linkGoogleBtn.innerHTML = isGoogleLinked
            ? '<span>Google 연동됨</span>'
            : '<img src="assets/google_login.png" alt="Google 계정 연결">';
    }
    if (linkKakaoBtn) {
        linkKakaoBtn.disabled = !canSync || isKakaoLinked;
        linkKakaoBtn.innerHTML = isKakaoLinked
            ? '<span>카카오 연동됨</span>'
            : '<img src="assets/kakao_login.png" alt="카카오 계정 연결">';
    }
    if (userEl) userEl.innerText = cloudState.user && cloudState.user.email ? cloudState.user.email : (cloudState.user && cloudState.user.id ? cloudState.user.id : (config.enabled ? '로그인 안 됨' : '설정 필요'));
    if (localEl) localEl.innerText = formatCloudTime(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0);
    if (remoteEl) remoteEl.innerText = formatCloudTime(cloudState.lastRemoteUpdatedAt || (game && game.saveMeta ? game.saveMeta.lastCloudSyncAt : 0));
    let identitiesEl = document.getElementById('ui-cloud-identities');
    if (identitiesEl) {
        let providers = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders : [];
        if (!cloudState.user || cloudState.identityLookupState === 'needs_login') {
            identitiesEl.innerText = '로그인 필요';
        } else {
            identitiesEl.innerText = providers.length ? providers.join(', ') : '연결된 소셜 계정 없음';
        }
    }
    if (msgEl) msgEl.innerText = cloudState.lastMessage || '대기 중';
    updateStartupScreenUI();
}

function applyExternalSave(snapshot, sourceStamp) {
    game = mergeDefaults(snapshot || {});
    applySeasonContentProgression({ silent: true });
    ensureSaveMeta();
    if (sourceStamp) {
        cloudState.lastRemoteUpdatedAt = sourceStamp;
        cloudState.lastRemoteLoop = getSaveLoopNumber(game);
        game.saveMeta.lastCloudSyncAt = Math.max(game.saveMeta.lastCloudSyncAt || 0, sourceStamp);
        if (!game.saveMeta.lastModifiedAt) game.saveMeta.lastModifiedAt = sourceStamp;
    }
    persistLocalSave({ touchModifiedAt: false });
    recoverRuntimeState();
    refreshPassiveVisibility();
    tickShrineState();
    applyTabHeaderOrder();
    calculateReachableNodes();
    normalizeSupportLoadout(false);
    try {
        updateStaticUI();
    } catch (error) {
        console.error('updateStaticUI after cloud load failed:', error);
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('renderBattlefield after cloud load failed:', error);
    }
    updateCloudSaveUI();
}

async function fetchCloudUser() {
    return await cloudJsonRequest('/auth/v1/user');
}

async function restoreCloudSession() {
    let stored = loadStoredCloudSession();
    if (!stored || !stored.access_token) return false;
    if (stored.refresh_token) {
        cloudState.session = stored;
        cloudState.user = stored.user || null;
        return await refreshCloudSession('저장된 세션 복원');
    }
    clearCloudSessionStorage();
    setCloudMessage('저장된 클라우드 세션에 갱신 토큰이 없습니다. 다시 로그인해주세요.');
    return false;
}

async function fetchCloudSaveRecord() {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    try {
        let userId = encodeURIComponent(cloudState.user.id);
        let rows = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${userId}&select=user_id,save_data,updated_at&order=updated_at.desc.nullslast&limit=1`, {
            headers: { Accept: 'application/json' }
        });
        let record = Array.isArray(rows) ? rows[0] : null;
        if (!record) {
            let fallbackRows = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${userId}&select=user_id,save_data,updated_at`, {
                headers: { Accept: 'application/json' }
            });
            if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
                record = fallbackRows
                    .filter(Boolean)
                    .sort((a, b) => {
                        let at = a && a.updated_at ? (new Date(a.updated_at).getTime() || 0) : 0;
                        let bt = b && b.updated_at ? (new Date(b.updated_at).getTime() || 0) : 0;
                        return bt - at;
                    })[0] || null;
            }
        }
        cloudState.isLoaded = true;
        cloudState.lastRemoteCheckedAt = Date.now();
        if (record && record.updated_at) cloudState.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
        if (record && record.save_data) updateRemoteLoopFromRecord(record);
        updateCloudSaveUI();
        return record;
    } catch (error) {
        cloudState.isLoaded = false;
        updateCloudSaveUI();
        throw error;
    }
}

function getLocalSaveStamp() {
    ensureSaveMeta();
    return game.saveMeta.lastModifiedAt || 0;
}

function getRemoteSaveStamp(record) {
    if (!record) return 0;
    return record.updated_at ? (new Date(record.updated_at).getTime() || 0) : ((record.save_data && record.save_data.saveMeta && record.save_data.saveMeta.lastModifiedAt) || 0);
}

function getSaveLoopNumber(snapshot) {
    let s = snapshot || {};
    let season = Math.max(1, Math.floor(Number(s.season) || 1));
    let loopCount = Math.max(0, Math.floor(Number(s.loopCount) || 0));
    return Math.max(season, loopCount + 1);
}

function updateRemoteLoopFromRecord(record) {
    if (!record || !record.save_data) return 0;
    let remoteLoop = getSaveLoopNumber(record.save_data);
    cloudState.lastRemoteLoop = remoteLoop;
    return remoteLoop;
}

function shouldBlockLocalPushForRemoteLoop(record, localSnapshot = game) {
    let localLoop = getSaveLoopNumber(localSnapshot || {});
    let remoteLoop = updateRemoteLoopFromRecord(record);
    if (remoteLoop > localLoop) return { blocked: true, reason: 'higher-loop', localLoop, remoteLoop };
    if (record && record.save_data && isLikelyBootstrapLocalSave(localSnapshot)) return { blocked: true, reason: 'bootstrap-local', localLoop, remoteLoop };
    return { blocked: false, reason: 'safe', localLoop, remoteLoop };
}

function getLoopCompareSummary(record, localSnapshot = game) {
    let localLoop = getSaveLoopNumber(localSnapshot || {});
    let remoteLoop = updateRemoteLoopFromRecord(record);
    return { localLoop, remoteLoop, safeToPush: localLoop >= remoteLoop };
}

function getSaveContentRichnessScore(snapshot) {
    let s = snapshot || {};
    let score = 0;
    score += Array.isArray(s.inventory) ? Math.min(200, s.inventory.length) : 0;
    score += Array.isArray(s.jewelInventory) ? Math.min(120, s.jewelInventory.length * 2) : 0;
    score += Array.isArray(s.talismanInventory) ? Math.min(120, s.talismanInventory.length * 2) : 0;
    score += (s.equipment && typeof s.equipment === 'object') ? Object.values(s.equipment).filter(Boolean).length * 8 : 0;
    score += (s.gemData && typeof s.gemData === 'object') ? Object.keys(s.gemData).length * 3 : 0;
    score += (s.supportGemData && typeof s.supportGemData === 'object') ? Object.keys(s.supportGemData).length * 3 : 0;
    score += (s.uniqueCodex && typeof s.uniqueCodex === 'object') ? Math.min(300, Object.keys(s.uniqueCodex).length * 2) : 0;
    score += (s.expertise && s.expertise.levels && typeof s.expertise.levels === 'object')
        ? Object.values(s.expertise.levels).reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v) || 0)), 0)
        : 0;
    score += Math.max(0, Math.floor(Number(s.abyssEndlessDepth) || 0));
    score += Math.max(0, Math.floor(Number(s.labyrinthUnlockedMaxFloor) || 0));
    return score;
}

function isLikelyBootstrapLocalSave(snapshot) {
    let s = snapshot || game || {};
    let hasProgress = false;
    if ((s.level || 1) > 1) hasProgress = true;
    if ((s.exp || 0) > 0) hasProgress = true;
    if ((s.season || 1) > 1) hasProgress = true;
    if ((s.loopCount || 0) > 0) hasProgress = true;
    if ((s.maxZoneId || 0) > 0) hasProgress = true;
    if ((s.killsInZone || 0) > 0) hasProgress = true;
    if ((s.loopKills || 0) > 0) hasProgress = true;
    if ((s.loopDeaths || 0) > 0) hasProgress = true;
    if (Array.isArray(s.inventory) && s.inventory.length > 0) hasProgress = true;
    if (s.equipment && Object.values(s.equipment).some(Boolean)) hasProgress = true;
    if (Array.isArray(s.passives) && s.passives.length > 0) hasProgress = true;
    if ((s.passivePoints || 0) > 0) hasProgress = true;
    if (Array.isArray(s.skills) && s.skills.some(name => name && name !== '기본 공격')) hasProgress = true;
    if (s.activeSkill && s.activeSkill !== '기본 공격') hasProgress = true;
    if (s.gemData && Object.keys(s.gemData).length > 0) hasProgress = true;
    if (Array.isArray(s.supports) && s.supports.length > 0) hasProgress = true;
    if (s.supportGemData && Object.keys(s.supportGemData).length > 0) hasProgress = true;
    if (s.currencies && Object.keys(s.currencies).some(key => (s.currencies[key] || 0) > 0)) hasProgress = true;
    return !hasProgress;
}

function shouldPreferRemoteOverBootstrapLocal(record) {
    if (!record || !record.save_data) return false;
    return getRemoteSaveStamp(record) > 0 && isLikelyBootstrapLocalSave(game);
}

async function guardAgainstStaleLocalOverwrite(options = {}) {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) return { record, status: 'no-remote' };
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    cloudState.lastRemoteUpdatedAt = remoteStamp;
    let loopGuard = shouldBlockLocalPushForRemoteLoop(record);
    if (loopGuard.blocked) {
        applyExternalSave(record.save_data, remoteStamp);
        let guardMessage = loopGuard.reason === 'bootstrap-local'
            ? '로컬 세이브가 새로 생성된 기본 상태라 클라우드 업로드를 차단하고 서버 저장을 불러왔습니다.'
            : `클라우드 루프(${loopGuard.remoteLoop})가 로컬 루프(${loopGuard.localLoop})보다 높아 로컬 업로드를 차단하고 클라우드를 불러왔습니다.`;
        setCloudMessage(guardMessage);
        if (!options.silentLog) addLog('클라우드 루프가 더 높아 로컬 저장으로 서버를 덮어쓰지 않았습니다.', 'loot-magic');
        return { record, status: 'pulled-remote-higher-loop' };
    }
    if (remoteStamp > localStamp + CLOUD_STALE_OVERWRITE_GUARD_MS) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage(options.automatic ? '클라우드 저장이 더 최신이라 로컬에 먼저 반영했습니다.' : '클라우드 저장이 더 최신이라 덮어쓰기를 막고 자동으로 불러왔습니다.');
        if (!options.silentLog) addLog('클라우드가 더 최신이라 자동으로 불러왔습니다.', 'loot-magic');
        return { record, status: 'pulled-remote' };
    }
    return { record, status: 'safe-to-push' };
}

async function pushCloudSave(options = {}) {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    let t0 = Date.now();
    let remoteRecord = null;
    try {
        remoteRecord = await fetchCloudSaveRecord();
    } catch (loadError) {
        console.warn('cloud push preflight remote load failed:', loadError);
        throw new Error('클라우드 상태를 확인할 수 없어 업로드를 중단했습니다: ' + (loadError.message || loadError));
    }
    let tFetch = Date.now();
    let loopGuard = shouldBlockLocalPushForRemoteLoop(remoteRecord);
    if (loopGuard.blocked) {
        let guardMessage = loopGuard.reason === 'bootstrap-local'
            ? '로컬 세이브가 새로 생성된 기본 상태라 기존 클라우드 저장을 덮어쓸 수 없습니다.'
            : `클라우드 루프(${loopGuard.remoteLoop})가 로컬 루프(${loopGuard.localLoop})보다 높아 로컬 저장으로 덮어쓸 수 없습니다.`;
        setCloudMessage(guardMessage);
        throw new Error(guardMessage);
    }
    persistLocalSave({ touchModifiedAt: options.touchModifiedAt === true });
    let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
    let payloadSize = 0;
    try {
        payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 900000 && typeof addLog === 'function') addLog(`☁️ 클라우드 저장 데이터 최적화 적용 (${Math.round(payloadSize / 1024)}KB)`, 'attack-monster', { noToast: true });
    } catch (e) {}
    let tSerialize = Date.now();
    let rows = await cloudJsonRequest('/rest/v1/cloud_saves', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: { user_id: cloudState.user.id, save_data: payload }
    });
    let tUpload = Date.now();
    let row = Array.isArray(rows) ? rows[0] : null;
    let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
    ensureSaveMeta();
    game.saveMeta.lastCloudSyncAt = syncedAt;
    cloudState.lastRemoteUpdatedAt = syncedAt;
    cloudState.lastRemoteLoop = getSaveLoopNumber(game);
    persistLocalSave({ touchModifiedAt: false });
    let fetchMs = Math.max(0, tFetch - t0);
    let serializeMs = Math.max(0, tSerialize - tFetch);
    let uploadMs = Math.max(0, tUpload - tSerialize);
    let totalMs = Math.max(0, tUpload - t0);
    cloudState.lastSyncProfile = { fetchMs, serializeMs, uploadMs, totalMs, payloadBytes: payloadSize };
    if (typeof addLog === 'function' && !options.automatic) addLog(`☁️ 업로드 시간 ${totalMs}ms (조회 ${fetchMs}ms · 직렬화 ${serializeMs}ms · 전송 ${uploadMs}ms · ${(payloadSize/1024).toFixed(1)}KB)`, 'attack-monster', { noToast: true });
    updateCloudSaveUI();
    return row;
}

async function pullCloudSave(options = {}) {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) {
        setCloudMessage('클라우드에 저장된 데이터가 아직 없습니다.');
        return null;
    }
    let remoteStamp = record.updated_at ? (new Date(record.updated_at).getTime() || 0) : 0;
    applyExternalSave(record.save_data, remoteStamp);
    setCloudMessage('클라우드 저장을 로컬로 불러왔습니다.');
    if (!options.silent) addLog('클라우드 세이브를 불러왔습니다.', 'loot-magic');
    return record;
}

async function reconcileCloudSaveState(options = {}) {
    let preferRemoteOnResume = options.preferRemoteOnResume === true;
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) {
        if (options.createRemoteFromLocal) {
            await pushCloudSave({ touchModifiedAt: false });
            setCloudMessage('클라우드에 저장이 없어 현재 로컬 세이브를 업로드했습니다.');
            return 'pushed-local';
        }
        setCloudMessage('클라우드 저장을 찾지 못했습니다. 데이터를 확인한 뒤 수동 업로드를 진행해주세요.');
        return 'no-remote';
    }
    ensureSaveMeta();
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    cloudState.lastRemoteUpdatedAt = remoteStamp;
    let loopGuard = shouldBlockLocalPushForRemoteLoop(record);
    if (loopGuard.blocked) {
        applyExternalSave(record.save_data, remoteStamp);
        let guardMessage = loopGuard.reason === 'bootstrap-local'
            ? '새 기기 기본 로컬 저장으로 판단되어 클라우드 세이브를 우선 적용했습니다.'
            : `클라우드 루프(${loopGuard.remoteLoop})가 로컬 루프(${loopGuard.localLoop})보다 높아 클라우드 세이브를 우선 적용했습니다.`;
        setCloudMessage(guardMessage);
        if (!options.silent) addLog('클라우드 루프가 더 높아 로컬 저장 업로드를 차단하고 서버 저장을 적용했습니다.', 'loot-magic');
        return 'pulled-remote-higher-loop';
    }
    if (preferRemoteOnResume) {
        if (remoteStamp >= localStamp) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage('이어하기는 서버 저장이 로컬보다 최신이거나 같은 상태라 클라우드를 적용했습니다.');
            if (!options.silent) addLog('이어하기(클라우드 우선)로 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-resume-preferred';
        }
        let loopSummary = getLoopCompareSummary(record);
        if (!loopSummary.safeToPush) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage(`클라우드 루프(${loopSummary.remoteLoop})가 로컬 루프(${loopSummary.localLoop})보다 높아 클라우드를 적용했습니다.`);
            if (!options.silent) addLog('루프 비교 결과 클라우드 진행이 더 높아 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-higher-loop-late-guard';
        }
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 로컬 저장을 업로드했습니다.`);
        if (!options.silent) addLog(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 클라우드에 업로드했습니다.`, 'loot-magic');
        return 'pushed-local-newer-than-remote-resume';
    }
    if (isLikelyBootstrapLocalSave(game) && remoteStamp > 0) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage('새 기기 기본 로컬 저장으로 판단되어 클라우드 세이브를 우선 적용했습니다.');
        if (!options.silent) addLog('클라우드 세이브를 우선 적용했습니다.', 'loot-magic');
        return 'pulled-remote-bootstrap';
    }
    if (remoteStamp > localStamp + CLOUD_REMOTE_TIME_SKEW_MS) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage('클라우드 저장이 더 최신이라 자동으로 불러왔습니다.');
        if (!options.silent) addLog('더 최신인 클라우드 세이브를 적용했습니다.', 'loot-magic');
        return 'pulled-remote';
    }
    if (localStamp > remoteStamp) {
        let loopSummary = getLoopCompareSummary(record);
        if (!loopSummary.safeToPush) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage(`클라우드 루프(${loopSummary.remoteLoop})가 로컬 루프(${loopSummary.localLoop})보다 높아 클라우드를 적용했습니다.`);
            if (!options.silent) addLog('루프 비교 결과 클라우드 진행이 더 높아 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-higher-loop-late-guard';
        }
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 로컬 저장을 업로드했습니다.`);
        if (!options.silent) addLog(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 클라우드에 업로드했습니다.`, 'loot-magic');
        return localStamp > remoteStamp + CLOUD_REMOTE_TIME_SKEW_MS ? 'pushed-local' : 'pushed-local-within-skew';
    }
    applyExternalSave(record.save_data, remoteStamp);
    setCloudMessage('로컬과 클라우드 저장 시간이 같거나 클라우드가 근소하게 최신이라 클라우드 저장을 우선 적용했습니다.');
    if (!options.silent) addLog('저장 시간 차이가 작아 클라우드 세이브를 우선 적용했습니다.', 'loot-magic');
    return 'pulled-remote-within-skew';
}

let cloudSyncTimer = null;
function isCloudSaveDirty() {
    let localStamp = game && game.saveMeta ? Math.max(0, Number(game.saveMeta.lastModifiedAt || 0)) : 0;
    // IMPORTANT: only use confirmed sync watermark.
    // game.saveMeta.lastCloudSyncAt can be set optimistically in page-exit path before network success.
    let syncedStamp = Math.max(0, Number(cloudState.lastSyncedLocalModifiedAt || 0));
    return localStamp > syncedStamp;
}
function scheduleCloudAutoSync() {
    if (!cloudState.configured || !cloudState.user || cloudState.busy || isStartupOverlayOpen()) return;
    if (!isCloudSaveDirty()) {
        cloudState.pendingAutoSyncDirty = false;
        return;
    }
    let now = Date.now();
    cloudState.pendingAutoSyncDirty = true;
    if (now - cloudState.lastSyncAttemptAt < CLOUD_SYNC_MIN_INTERVAL_MS) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
        cloudSyncTimer = null;
        if (!cloudState.pendingAutoSyncDirty || !isCloudSaveDirty()) return;
        cloudState.pendingAutoSyncDirty = false;
        syncCloudSave({ automatic: true }).catch(error => {
            console.warn('auto cloud sync failed:', error);
            setCloudMessage('자동 클라우드 저장 실패: ' + (error.message || error));
        });
    }, 5000);
}


function schedulePendingForcedCloudSyncDrain() {
    if (cloudState.pendingForcedSyncRetryTimer) return;
    cloudState.pendingForcedSyncRetryTimer = setTimeout(() => {
        cloudState.pendingForcedSyncRetryTimer = null;
        let pendingForced = cloudState.pendingForcedSyncOptions;
        if (!pendingForced || !cloudState.configured || !cloudState.user) return;
        if (cloudState.busy) {
            schedulePendingForcedCloudSyncDrain();
            return;
        }
        cloudState.pendingForcedSyncOptions = null;
        syncCloudSave(pendingForced).catch(error => {
            console.warn(`queued cloud save failed (${pendingForced.reason || 'important'}):`, error);
            setCloudMessage('대기 중이던 클라우드 저장 실패: ' + (error.message || error));
        });
    }, 500);
}

async function syncCloudSave(options = {}) {
    if (!cloudState.configured || !cloudState.user) return;
    if (cloudState.busy) {
        if (options.force === true) {
            cloudState.pendingForcedSyncOptions = { ...options, force: true, reason: options.reason || 'important' };
            setCloudMessage(`클라우드 업로드 대기 중... (${cloudState.pendingForcedSyncOptions.reason})`);
            updateCloudSaveUI();
            schedulePendingForcedCloudSyncDrain();
        }
        return;
    }
    cloudState.busy = true;
    cloudState.lastSyncAttemptAt = Date.now();
    setCloudMessage(options.reason ? `클라우드 업로드 중... (${options.reason})` : (options.automatic ? '자동 클라우드 업로드 중...' : '클라우드 업로드 중...'));
    updateCloudSaveUI();
    try {
        let fresh = await ensureCloudSessionFresh(options.reason || '클라우드 저장');
        if (!fresh) return;
        let guardResult = await guardAgainstStaleLocalOverwrite({ automatic: !!options.automatic, silentLog: !!options.automatic });
        if (guardResult.status === 'pulled-remote' || guardResult.status === 'pulled-remote-higher-loop') return;
        await pushCloudSave({ touchModifiedAt: options.automatic !== true });
        cloudState.lastSyncedLocalModifiedAt = Math.max(0, Number(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0));
        setCloudMessage(options.automatic ? '클라우드 자동 저장을 완료했습니다.' : '클라우드 업로드를 완료했습니다.');
        if (!options.automatic) addLog('클라우드 세이브를 업로드했습니다.', 'loot-magic');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        if (cloudState.pendingForcedSyncOptions) schedulePendingForcedCloudSyncDrain();
    }
}

async function initializeCloudSave() {
    cloudState.initialized = true;
    cloudState.configured = getCloudConfig().enabled;
    if (!cloudState.configured) {
        setCloudMessage('cloud-save-config.js를 설정하면 클라우드 세이브를 켤 수 있습니다.');
        updateCloudSaveUI();
        return;
    }
    ['startup-password'].forEach(id => {
        let passwordEl = document.getElementById(id);
        if (passwordEl && !passwordEl.dataset.boundCloudEnter) {
            passwordEl.dataset.boundCloudEnter = '1';
            passwordEl.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    startupLogin();
                }
            });
        }
    });
    try {
        cloudState.busy = true;
        setCloudMessage('저장된 로그인 세션을 확인하는 중입니다...');
        updateCloudSaveUI();
        let skipOAuthRestore = consumeSkipOAuthRestoreOnce();
        let restored = false;
        if (!skipOAuthRestore) restored = await tryRestoreSupabaseOAuthSession();
        if (!restored) restored = await restoreCloudSession();
        if (restored && cloudState.user) {
            await refreshCloudLinkedIdentities();
            if (isStartupOverlayOpen()) setCloudMessage('이전 로그인 세션을 복원했습니다. 클라우드 세이브로 계속할 수 있습니다.');
            else {
                setCloudMessage('이전 로그인 세션을 복원했습니다.');
                await reconcileCloudSaveState({ silent: true, createRemoteFromLocal: true });
            }
        } else {
            setCloudMessage('로그인하면 클라우드 저장을 사용할 수 있습니다.');
        }
    } catch (error) {
        console.warn('cloud init failed:', error);
        applyCloudSession(null);
        setCloudMessage('클라우드 세션 복원 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudSignUp(options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) return setCloudMessage('먼저 cloud-save-config.js를 설정해주세요.');
    let credentials = collectCloudCredentials();
    if (!credentials.email || !credentials.password) return setCloudMessage('이메일과 비밀번호를 입력해주세요.');
    cloudState.busy = true;
    if (options.enterGame) {
        setLoadingOverlayState(true, {
            title: '계정을 생성하는 중...',
            detail: '인증 정보를 등록하고 첫 클라우드 세이브를 준비하고 있습니다.',
            caption: 'Creating Account',
            progress: 12
        });
    }
    setCloudMessage('회원가입을 진행 중입니다...');
    updateCloudSaveUI();
    try {
        let result = await cloudJsonRequest('/auth/v1/signup', {
            method: 'POST',
            useAuth: false,
            body: { email: credentials.email, password: credentials.password }
        });
        if (result && result.session && result.user) {
            applyCloudSession({ ...result.session, user: result.user });
            await refreshCloudLinkedIdentities();
            clearCloudPasswordInput();
            advanceLoadingOverlay({
                title: '첫 세이브를 연결하는 중...',
                detail: '새 계정에 현재 진행도를 연결하고 있습니다.',
                caption: 'Binding Save Data',
                progress: 54
            });
            await reconcileCloudSaveState({ createRemoteFromLocal: true });
            addLog('클라우드 계정을 만들고 저장을 연결했습니다.', 'loot-magic');
            if (options.enterGame) await enterGameWorld();
        } else {
            setCloudMessage('회원가입은 완료되었습니다. Supabase 이메일 인증을 사용하는 경우 메일 확인 후 로그인해주세요.');
            if (options.enterGame) setLoadingOverlayState(false);
        }
    } catch (error) {
        setCloudMessage('회원가입 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudLogin(options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) return setCloudMessage('먼저 cloud-save-config.js를 설정해주세요.');
    let credentials = collectCloudCredentials();
    if (!credentials.email || !credentials.password) return setCloudMessage('이메일과 비밀번호를 입력해주세요.');
    cloudState.busy = true;
    if (options.enterGame) {
        setLoadingOverlayState(true, {
            title: '계정을 확인하는 중...',
            detail: '인증 정보를 검증하고 연결된 클라우드 세이브를 찾고 있습니다.',
            caption: 'Authenticating',
            progress: 14
        });
    }
    setCloudMessage('로그인하는 중입니다...');
    updateCloudSaveUI();
    try {
        let session = await cloudJsonRequest('/auth/v1/token?grant_type=password', {
            method: 'POST',
            useAuth: false,
            body: { email: credentials.email, password: credentials.password }
        });
        applyCloudSession(session);
        await refreshCloudLinkedIdentities();
        clearCloudPasswordInput();
        advanceLoadingOverlay({
            title: '저장 데이터를 불러오는 중...',
            detail: '계정에 저장된 클라우드 세이브가 있으면 전체 데이터를 우선 적용합니다.',
            caption: 'Syncing Save Data',
            progress: 58
        });
        await reconcileCloudSaveState({
            createRemoteFromLocal: true,
            preferRemoteOnResume: options.enterGame === true,
            strictRemoteResume: options.enterGame === true
        });
        addLog('클라우드 세이브 계정에 로그인했습니다.', 'loot-magic');
        if (options.enterGame) await enterGameWorld();
    } catch (error) {
        setCloudMessage('로그인 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudLogout() {
    if (!cloudState.user) return setCloudMessage('이미 로그아웃 상태입니다.');
    cloudState.busy = true;
    setCloudMessage('로그아웃하는 중입니다...');
    updateCloudSaveUI();
    try {
        let client = getSupabaseClient();
        if (client) {
            try { await client.auth.signOut(); } catch (oauthLogoutError) { console.warn('supabase oauth logout failed:', oauthLogoutError); }
        }
        if (cloudState.session && cloudState.session.access_token) {
            try {
                await cloudJsonRequest('/auth/v1/logout', { method: 'POST' });
            } catch (logoutError) {
                console.warn('cloud logout request failed:', logoutError);
            }
        }
        applyCloudSession(null);
        cloudState.linkedProviders = [];
        cloudState.lastRemoteUpdatedAt = 0;
        cloudState.lastRemoteLoop = 0;
        setCloudMessage('클라우드 계정에서 로그아웃했습니다.');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}


function requestImmediateCloudSave(reason) {
    if (!cloudState.configured || !cloudState.user) return false;
    saveGame({ skipCloudSync: true });
    syncCloudSave({ automatic: true, force: true, reason: reason || 'important' }).catch(error => {
        console.warn(`immediate cloud save failed (${reason || 'important'}):`, error);
        setCloudMessage('즉시 클라우드 저장 실패: ' + (error.message || error));
    });
    return true;
}


function pushCloudSaveOnPageExit(reason) {
    let config = getCloudConfig();
    if (!config.enabled || !cloudState.user || !cloudState.user.id || !cloudState.session || !cloudState.session.access_token) return false;
    if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return false;
    if (!gameplayStarted) return false;
    let localLoop = getSaveLoopNumber(game);
    if ((cloudState.lastRemoteLoop || 0) > localLoop) {
        setCloudMessage(`클라우드 루프(${cloudState.lastRemoteLoop})가 로컬 루프(${localLoop})보다 높아 종료 전 업로드를 차단했습니다.`);
        return false;
    }
    if ((cloudState.lastRemoteLoop || 0) > 0 && isLikelyBootstrapLocalSave(game)) {
        setCloudMessage('로컬 세이브가 새로 생성된 기본 상태라 종료 전 클라우드 업로드를 차단했습니다.');
        return false;
    }
    try {
        persistLocalSave({ touchModifiedAt: true });
        ensureSaveMeta();
        let optimisticSyncAt = Date.now();
        game.saveMeta.lastCloudSyncAt = optimisticSyncAt;
        cloudState.lastRemoteUpdatedAt = optimisticSyncAt;
        persistLocalSave({ touchModifiedAt: false });
        let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
        let body = JSON.stringify({ user_id: cloudState.user.id, save_data: payload });
        let headers = {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${cloudState.session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        };
        let endpoint = config.supabaseUrl + '/rest/v1/cloud_saves';
        // NOTE: sendBeacon cannot attach Authorization/apikey headers required by Supabase RLS.
        // Always use authenticated keepalive fetch on exit path to avoid silent unauthenticated drops.
        fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            keepalive: true
        }).catch(error => {
            let msg = String((error && error.message) || error || '');
            let expectedAbort = /failed to fetch|networkerror|abort|cancel/i.test(msg);
            if (expectedAbort && reason === 'visibilitychange') {
                console.debug(`cloud save on ${reason} skipped by browser lifecycle:`, error);
            } else {
                console.warn(`cloud save on ${reason || 'page exit'} failed:`, error);
            }
        });
        cloudState.lastSyncAttemptAt = optimisticSyncAt;
        setCloudMessage('페이지 종료 전 클라우드 저장을 시도했습니다.');
        return true;
    } catch (error) {
        console.warn(`cloud save on ${reason || 'page exit'} setup failed:`, error);
        return false;
    }
}

async function cloudPushNow() {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    try {
        await syncCloudSave({ automatic: false });
    } catch (error) {
        setCloudMessage('업로드 실패: ' + (error.message || error));
    }
}

async function cloudCompactAndPushNow() {
    if (!cloudState.user || !cloudState.user.id) return setCloudMessage('먼저 로그인해주세요.');
    if (!confirm('클라우드 저장을 경량화(임시 전투 데이터 제거)해서 즉시 덮어쓸까요?\n핵심 진행 데이터(장비/인벤/패시브/재화)는 유지됩니다.')) return;
    cloudState.busy = true;
    setCloudMessage('클라우드 저장 경량화 업로드 중...');
    updateCloudSaveUI();
    try {
        ensureSaveMeta();
        game.saveMeta.lastModifiedAt = Date.now();
        persistLocalSave({ touchModifiedAt: false });
        let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
        let payloadBytes = 0;
        try { payloadBytes = JSON.stringify(payload).length; } catch (e) {}
        let rows = await cloudJsonRequest('/rest/v1/cloud_saves', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: { user_id: cloudState.user.id, save_data: payload }
        });
        let row = Array.isArray(rows) ? rows[0] : null;
        let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
        game.saveMeta.lastCloudSyncAt = syncedAt;
        cloudState.lastRemoteUpdatedAt = syncedAt;
        cloudState.lastSyncAttemptAt = Date.now();
        cloudState.lastSyncedLocalModifiedAt = Math.max(0, Number(game.saveMeta.lastModifiedAt || 0));
        persistLocalSave({ touchModifiedAt: false });
        setCloudMessage(`경량화 업로드 완료 (${(payloadBytes / 1024).toFixed(1)}KB)`);
        addLog(`☁️ 경량화 클라우드 저장 완료 (${(payloadBytes / 1024).toFixed(1)}KB)`, 'loot-magic');
    } catch (error) {
        setCloudMessage('경량화 업로드 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudForcePullNow() {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    if (!confirm('⚠️ 서버 저장을 현재 기기 세이브에 강제로 덮어씁니다. 계속할까요?')) return;
    cloudState.busy = true;
    setCloudMessage('서버 저장을 강제로 불러오는 중입니다...');
    updateCloudSaveUI();
    try {
        await pullCloudSave({ silent: false });
        setCloudMessage('서버 저장을 현재 기기에 강제로 적용했습니다.');
        addLog('☁️ 서버 저장 강제 불러오기를 완료했습니다.', 'loot-magic');
    } catch (error) {
        setCloudMessage('서버 강제 불러오기 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudPullNow() {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    if (!confirm('현재 기기의 세이브를 클라우드 세이브로 덮어쓸까요?')) return;
    cloudState.busy = true;
    setCloudMessage('클라우드 저장을 불러오는 중입니다...');
    updateCloudSaveUI();
    try {
        await pullCloudSave();
    } catch (error) {
        setCloudMessage('클라우드 불러오기 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

function reportFatalError(stage, error) {
    let message = error && error.message ? error.message : String(error);
    let stack = error && error.stack ? String(error.stack).split('\n').slice(0, 4).join('\n') : '';
    console.error(stage + ' failed:', error);
    try {
        let label = document.getElementById('ui-progress-label');
        if (label) label.innerText = '⚠️ 오류';
        let pct = document.getElementById('ui-move-time-text');
        if (pct) pct.innerText = stage;
        let caption = document.getElementById('ui-battlefield-caption');
        if (caption) caption.innerText = `${stage}: ${message}`;
        let log = document.getElementById('log');
        if (log) {
            let detail = stack ? `<pre style="white-space:pre-wrap;margin:6px 0 0;color:#ff9f9f;font-size:0.78em;">${escapeHTML(stack)}</pre>` : '';
            log.innerHTML = `<div class="log-item attack-monster">[${stage}] ${escapeHTML(message)}${detail}</div>`;
        }
    } catch (uiError) {
        console.error('fatal error UI update failed:', uiError);
    }
}

function recoverRuntimeState() {
    game = mergeDefaults(game || {});
    if (game.moveTimer <= 0 && (!Array.isArray(game.encounterPlan) || game.encounterPlan.length === 0)) startEncounterRun();
}

function runStartupSmokeChecks() {
    // 기본 배포에서는 상태 오염 가능성이 있는 런타임 시뮬레이션을 실행하지 않는다.
    // 필요 시 콘솔에서 window.__ENABLE_STARTUP_SMOKE__ = true 로 활성화.
    if (!(typeof window !== 'undefined' && window.__ENABLE_STARTUP_SMOKE__ === true)) return;
    let snapshot = JSON.parse(JSON.stringify(game));
    let issues = [];
    try {
        // 저장 데이터 상태(맵 잠금/이벤트 러닝 상태)에 영향받지 않도록 최소 런타임을 정규화한다.
        game.moveTimer = 0;
        game.combatHalted = false;
        game.isTownReturning = false;
        game.woodsmanEntrancePending = false;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
        startEncounterRun();
        if (!Array.isArray(game.encounterPlan) || game.encounterPlan.length === 0) issues.push('encounterPlan-empty');
        let before = game.runProgress;
        let stats = getPlayerStats();
        for (let i = 0; i < 6; i++) coreLoop();
        ensureLoopChallengeState();
        if (game.moveTimer <= 0 && game.runProgress <= before) issues.push('runProgress-stalled');
        if (!Number.isFinite(stats.maxHp) || stats.maxHp <= 0) issues.push('invalid-player-stats');
    } catch (error) {
        issues.push('smoke-exception:' + (error && error.message ? error.message : String(error)));
    } finally {
        game = snapshot;
        tickShrineState();
    applyTabHeaderOrder();
    calculateReachableNodes();
        refreshPassiveVisibility();
        normalizeSupportLoadout(false);
    }
    if (issues.length > 0) console.warn('[SmokeCheck] startup issues:', issues.join(', '));
}

async function resetGame() {
    if (!confirm("초기화하시겠습니까?")) return;
    let resetCloudToo = false;
    if (cloudState.user && getCloudConfig().enabled) {
        resetCloudToo = confirm('클라우드 저장도 새 게임 상태로 덮어쓸까요?\n취소를 누르면 이 기기만 초기화되고 현재 계정은 로그아웃됩니다.');
    }
    try {
        localStorage.removeItem(LOCAL_SAVE_KEY);
        LEGACY_SAVE_KEYS.forEach(key => localStorage.removeItem(key));
        if (resetCloudToo) {
            cloudState.busy = true;
            setCloudMessage('클라우드 저장을 초기화하는 중입니다...');
            updateCloudSaveUI();
            game = cloneDefaultGame();
            await pushCloudSave({ touchModifiedAt: true });
        } else if (cloudState.user) {
            applyCloudSession(null);
        }
    } catch (error) {
        console.error('resetGame failed:', error);
        if (resetCloudToo) alert('클라우드 초기화 중 문제가 발생했습니다: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        location.reload();
    }
}

function init() {
    if (!window.__startupFirstPaintDone) {
        window.__startupFirstPaintDone = true;
        gameplayStarted = false;
        setStartupOverlayActive(true);
        setLoadingOverlayState(false);
        loadGame();
        updateCloudSaveUI();
        setTimeout(init, 0);
        return;
    }
    applySeasonContentProgression({ silent: true });
    recoverRuntimeState();
    unlockPassiveStarEvolution({ silent: true });
    window.__battleAssetAutoloadEnabled = false;
    scheduleDeferredBattleAssetLoad();
    refreshPassiveVisibility();
    tickShrineState();
    applyTabHeaderOrder();
    calculateReachableNodes();
    document.getElementById('chk-combat-scene').checked = game.settings.showCombatScene !== false;
    document.getElementById('chk-log-combat').checked = game.settings.showCombatLog !== false;
    document.getElementById('chk-log-aggregate').checked = game.settings.combatLogAggregate !== false;
    document.getElementById('chk-log-rate-limit').checked = game.settings.combatLogRateLimit !== false;
    document.getElementById('chk-log-spawn').checked = game.settings.showSpawnLog !== false;
    document.getElementById('chk-log-exp').checked = game.settings.showExpLog !== false;

    applyTabHeaderOrder();

    document.getElementById('chk-log-loot').checked = game.settings.showLootLog !== false;
    document.getElementById('chk-log-crowd').checked = game.settings.showCrowdPauseLog !== false;
    document.getElementById('chk-death-notice').checked = game.settings.showDeathNotice !== false;
    document.getElementById('chk-mobile-battle-pip').checked = game.settings.showMobileBattlePip !== false;
    game.settings.itemFilterRarities = { normal: true, magic: true, rare: true, unique: true, ...(game.settings.itemFilterRarities || {}) };
    document.getElementById('chk-item-filter-enabled').checked = !!game.settings.itemFilterEnabled;
    document.getElementById('chk-item-filter-normal').checked = game.settings.itemFilterRarities.normal !== false;
    document.getElementById('chk-item-filter-magic').checked = game.settings.itemFilterRarities.magic !== false;
    document.getElementById('chk-item-filter-rare').checked = game.settings.itemFilterRarities.rare !== false;
    document.getElementById('chk-item-filter-unique').checked = game.settings.itemFilterRarities.unique !== false;
    document.getElementById('inp-item-filter-tier-threshold').value = Math.max(1, Math.floor(game.settings.itemFilterTierThreshold || 10));
    document.getElementById('inp-item-filter-tier-count').value = Math.max(0, Math.floor(game.settings.itemFilterMinTierCount || 0));
    document.getElementById('inp-item-filter-hidden-tier').value = Math.max(1, Math.floor(game.settings.itemFilterMinHiddenTier || 1));
    document.getElementById('chk-item-filter-unique-new-codex').checked = !!game.settings.itemFilterOnlyNewCodexUnique;
    document.getElementById('sel-map-complete-action').value = game.settings.mapCompleteAction || 'nextZone';
    document.getElementById('sel-town-return-action').value = game.settings.townReturnAction || 'retry';
    document.getElementById('sel-theme-mode').value = game.settings.themeMode === 'light' ? 'light' : 'dark';
    applyThemeMode(game.settings.themeMode);
    ensureInitialHeroSelection();
    renderHeroSelectionControls();
    toggleDeathNoticeSetting(game.settings.showDeathNotice !== false);
    syncSalvageControlsFromSettings();
    syncJewelSalvageControlsFromSettings();
    checkUnlocks();
    renderExpertiseUI();
    normalizeSupportLoadout(false);
    if (game.moveTimer <= 0 && (!game.encounterPlan || game.encounterPlan.length === 0)) startEncounterRun();
    runStartupSmokeChecks();
    if (!(game.discoveredPassives || []).includes('n0')) game.discoveredPassives.push('n0');
    window.addEventListener('resize', function() {
        syncBattleTabLayout(false);
        scheduleStableResize();
    });
    if (!window.__mobileViewportResizeBound) {
        window.__mobileViewportResizeBound = true;
        window.addEventListener('orientationchange', function() {
            syncBattleTabLayout(false);
            scheduleStableResize();
        });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', function() {
            syncBattleTabLayout(false);
            scheduleStableResize();
        });
    }
    syncBattleTabLayout(true);
    updateMobileBattlePipVisibility();
    startMobilePipRefreshLoop();
    setupCanvasEvents();
    resizeCanvas();
    if (!window.__cloudVisibilitySaveBound) {
        window.__cloudVisibilitySaveBound = true;
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                saveGame({ skipCloudSync: true });
                pushCloudSaveOnPageExit('visibilitychange');
            }
        });
        window.addEventListener('pagehide', function() {
            saveGame({ skipCloudSync: true });
            pushCloudSaveOnPageExit('pagehide');
        });
        window.addEventListener('beforeunload', function() {
            saveGame({ skipCloudSync: true });
            pushCloudSaveOnPageExit('beforeunload');
        });
    }
    initializeCloudSave();
    if (!window.__cloudTokenRefreshBound) {
        window.__cloudTokenRefreshBound = true;
        setInterval(() => {
            if (cloudState.user && cloudState.session) ensureCloudSessionFresh('주기 확인').catch(error => console.warn('periodic cloud token refresh failed:', error));
        }, 60000);
    }
    window.runStartupSmokeChecks = runStartupSmokeChecks;
    if (!window.__globalTouchTooltipCleanup) {
        window.__globalTouchTooltipCleanup = true;
        document.addEventListener('touchstart', function(e) {
            let target = e.target;
            let keep = target && target.closest && (target.closest('.item-card') || target.closest('.skill-gem') || target.closest('#tree-canvas'));
            if (!keep) {
                hideInfoTooltip();
                hideItemTooltip();
            }
        }, { passive: true });
    }
    try {
        updateStaticUI();
    } catch (error) {
        console.error('initial updateStaticUI failed:', error);
        game = mergeDefaults(game || {});
        try { updateStaticUI(); } catch (retryError) { console.error('retry updateStaticUI failed:', retryError); }
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('initial battlefield render failed:', error);
    } finally {
        if (gameTickHandle) clearInterval(gameTickHandle);
        gameTickHandle = setInterval(() => {
            try {
                if (isStartupOverlayOpen() || isLoadingOverlayOpen() || isTutorialOpen() || isRewardOpen() || isDeathOverlayOpen() || isLoopHeroSelectOpen()) return;
                coreLoop();
                ensureLoopChallengeState();
                if (pendingHeavyUiRefresh) {
                    let now = Date.now();
                    if (now - lastHeavyUiRefreshAt >= 1200) {
                        pendingHeavyUiRefresh = false;
                        lastHeavyUiRefreshAt = now;
                        // 킬 이후 드랍/인벤/재화/지도 상태가 누락되지 않도록
                        // 스로틀된 정적 UI 갱신을 복구한다.
                        updateStaticUI();
                    }
                }
                updateCombatUI(getPlayerStats());
            } catch (error) {
                console.error('gameTick error:', error);
                recoverRuntimeState();
                try { updateCombatUI(getPlayerStats()); } catch (uiError) { console.error('tick UI recovery failed:', uiError); }
            }
        }, 100);
        requestAnimationFrame(gameLoop);
        if (autoSaveHandle) clearInterval(autoSaveHandle);
        autoSaveHandle = setInterval(() => {
            if (isStartupOverlayOpen() || isLoadingOverlayOpen()) return;
            saveGame();
        }, 15000);
    }
}

function gameLoop() {
    try {
        if (document.hidden) return;
        if (isTutorialOpen() || isRewardOpen() || isDeathOverlayOpen() || isLoopHeroSelectOpen()) {
            if (document.getElementById('tab-char').classList.contains('active') || passiveRevealBursts.length > 0) drawPassiveTree();
            updateMobileBattlePipVisibility();
            renderBattlefield(isMobileBattlePipVisible());
            renderMobileBattlePipFrame();
            return;
        }
        if (document.getElementById('tab-char').classList.contains('active') || passiveRevealBursts.length > 0) drawPassiveTree();
        updateMobileBattlePipVisibility();
        renderBattlefield(isMobileBattlePipVisible());
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('gameLoop error:', error);
        recoverRuntimeState();
    } finally {
        requestAnimationFrame(gameLoop);
    }
}


safeExposeGlobals({ updateStaticUI });

// Phase-4 extracted unlock/class/tab helper block.

function getExpertiseOverviewHtml(total, spent, free) {
    const branchSummary = `균사 ${getExpertBranchSpent('mycologist')} · 젬 ${getExpertBranchSpent('gemEngraver')} · 천문 ${getExpertBranchSpent('astronomer')} · 양봉 ${getExpertBranchSpent('beekeeper')}`;
    return `<div class="expertise-panel">전문가 포인트 · 총 <b>${total}</b> / 사용 <b>${spent}</b> / 남은 <b style="color:#ffd36b;">${free}</b> <button style="margin-left:8px;" onclick="resetExpertTree();updateStaticUI();">트리 초기화</button><div class="expertise-summary">분기 투자: ${branchSummary}</div></div>`;
}



function formatExpertFavorEffect(effect) {
    let map = {
        chillEffectReducePct:'냉각 효과 감소', freezeDurationReducePct:'동결 지속시간 감소', shockEffectReducePct:'감전 효과 감소',
        igniteDamageReducePct:'점화 피해 감소', bleedDamageReducePct:'출혈 피해 감소', poisonDamageReducePct:'중독 피해 감소',
        dotTakenDamageReducePct:'받는 지속 피해 감소', takenDamageReduceWhen2EnemiesPct:'적 2명+ 받는 피해 감소', takenDamageReduceWhen1EnemyPct:'적 1명 받는 피해 감소',
        igniteChance:'점화 확률', igniteDamageMultiplierPct:'점화 피해', accuracyBonusPct:'정확도 보정', minDmgRoll:'최소 피해 보정',
        projectilePctDmg:'투사체 피해', crit:'치명타 확률', critDmg:'치명타 피해 배율', aspd:'공격 속도', regen:'생명력 재생',
        energyShieldPct:'에너지 보호막', evasionPct:'회피', pctDmg:'피해', armorPct:'방어도'
    };
    return Object.entries(effect||{}).map(([k,v])=>`${map[k]||k} +${v}%`).join('<br>');
}
function selectExpertFavor(expertId, optionId){
    if (!expertId || !optionId) return;
    if (typeof setSelectedExpertFavor !== 'function') return;
    let ok = setSelectedExpertFavor(expertId, optionId);
    if (!ok) return addLog('해당 호의 선택지는 아직 해금되지 않았습니다.', 'attack-monster');
    addLog(`✨ 전문가의 호의 선택: ${(EXPERT_DEFS[expertId]||{}).name || expertId}`, 'loot-magic');
    updateStaticUI();
}
function getExpertiseCardHtml(id) {
    let d = EXPERT_DEFS[id], lv = getExpertLevel(id), cur = getCurrentExpertUnlock(id), next = getNextExpertUnlock(id), pt = Math.max(0, lv - 15);
    let exp = getExpertExp(id), req = getExpertExpReq(lv);
    let pct = Math.max(0, Math.min(100, req > 0 ? (exp / req) * 100 : 0));
    let cap = ((game.expertise || {}).loopExpCaps || {});
    let used = (((cap.total || {})[id]) || 0);
    let loopCap = (((EXPERT_EXP_RULES || {})[id] || {}).loopCap) || 250;
    let currentUnlockLine = cur ? `현재 적용 해금(Lv.${cur.level}): ${cur.title} - ${cur.desc}` : '해금 대기: 아직 해금된 컨텐츠가 없습니다.';
    let nextUnlockLine = next ? `다음(Lv.${next.level}): ${next.title}` : '다음 해금 없음';
    let history = typeof getExpertUnlockHistory === 'function' ? getExpertUnlockHistory(id) : getExpertUnlocks(id).filter(row => row.level <= lv);
    let historyHtml = history.length > 0
        ? `<div class="expertise-unlock-log"><div style="color:#dce9ff; font-weight:700; margin-bottom:4px;">해금 기록</div>${history.map(row => `<div class="expertise-unlock-entry">Lv.${row.level} · <strong>${row.title}</strong><br><span>${row.desc || ''}</span></div>`).join('')}</div>`
        : '<div class="expertise-muted">해금 기록 없음</div>';
    let favorOptions = (typeof getExpertFavorOptions === 'function') ? getExpertFavorOptions(id) : [];
    let favorSelected = (typeof getSelectedExpertFavor === 'function') ? getSelectedExpertFavor(id) : null;
    let favorHtml = favorOptions.length > 0
        ? `<div class="expertise-panel" style="margin-top:8px;"><div style="color:#dce9ff; font-weight:700; margin-bottom:4px;">전문가의 호의 (영구 1개 선택)</div>${favorOptions.map(opt => { let unlocked = lv >= (opt.level || 1); let active = favorSelected === opt.id; return `<button ${unlocked ? `onclick="selectExpertFavor('${id}','${opt.id}')"` : 'disabled'} style="display:block; width:100%; text-align:left; margin:4px 0; ${active ? 'border-color:#ffd36b; color:#ffd36b;' : ''}">${active ? '✓ ' : ''}${opt.name} ${unlocked ? '' : `(Lv.${opt.level} 필요)`}<br><span class='expertise-muted'>${formatExpertFavorEffect(opt.effect)}</span></button>`; }).join('')}</div>`
        : '';
    let guideRows = ((typeof EXPERT_EXP_GUIDES !== 'undefined' && EXPERT_EXP_GUIDES[id]) || []).map(line => `<li>${line}</li>`).join('');
    let guideHtml = guideRows ? `<div class="expertise-panel" style="margin-top:8px;"><div style="color:#dce9ff; font-weight:700; margin-bottom:4px;">경험치 획득 가이드</div><ul style="margin:0 0 0 18px; padding:0; color:#b8c7d8; line-height:1.55;">${guideRows}</ul></div>` : '';
    return `<div class="expertise-card"><h4>${d.icon} ${d.name} <span class="expertise-muted">Lv.${lv}</span> ${lv>=16?`<span style='color:#ffd36b;'>+${pt}pt</span>`:''}</h4><div class="expertise-muted">EXP ${exp}/${req} · 이번 루프 ${used}/${loopCap}</div><div style="margin:6px 0 8px 0; height:8px; border-radius:999px; background:#1c2a3a; border:1px solid #344b66;"><div style="width:${pct.toFixed(1)}%; height:100%; border-radius:999px; background:linear-gradient(90deg,#3f84ff,#72d1ff);"></div></div><div class="expertise-muted">${currentUnlockLine}</div><div class="expertise-muted">${nextUnlockLine}</div>${guideHtml}${historyHtml}${favorHtml}</div>`;
}

function getExpertiseNodeButtonHtml(node) {
    let lv = (game.expertise.nodes[node.id] || 0);
    let can = canAllocateExpertNode(node.id);
    let reqText = '';
    if (node.requireBranchPoints) {
        let spent = getExpertBranchSpent(node.branch);
        reqText = ` · 분기 ${spent}/${node.requireBranchPoints}`;
    }
    return `<button class="expertise-node ${node.branch==='common'?'common':''}" onclick="allocateExpertNode('${node.id}')&&updateStaticUI()" ${can?'':'disabled'}>${node.name} (${lv}/${node.max}) · cost ${node.cost}${reqText}</button>`;
}

function renderExpertiseUI() {
    ensureExpertiseState();
    let ov = document.getElementById('ui-expertise-overview');
    let subtabs = document.getElementById('ui-expert-subtabs');
    let detail = document.getElementById('ui-expertise-detail');
    let tree = document.getElementById('ui-expert-tree');
    let treeTitle = document.getElementById('ui-expert-tree-title');
    if (!ov || !subtabs || !detail || !tree) return;
    const total = getExpertPointTotal(), spent = getExpertPointSpent(), free = getExpertPointFree();
    ov.innerHTML = '';
    let unlocked = EXPERT_IDS.filter(id => (game.expertise.unlockedExperts||[]).includes(id));
    let treeUnlocked = hasExpertTreeUnlocked();
    let validTabs = [...unlocked, '__tree'];
    game.expertise.selectedExpertTab = validTabs.includes(game.expertise.selectedExpertTab) ? game.expertise.selectedExpertTab : (unlocked[0] || '__tree');
    let expertBtns = unlocked.map(id => `<button class="subtab-btn ${game.expertise.selectedExpertTab===id?'active':''}" onclick="game.expertise.selectedExpertTab='${id}';updateStaticUI();">${EXPERT_DEFS[id].icon} ${EXPERT_DEFS[id].name}</button>`).join('');
    let treeLabel = treeUnlocked ? '전문가 노드 트리' : '전문가 노드 트리(잠김)';
    let treeBtn = `<button class="subtab-btn ${game.expertise.selectedExpertTab==='__tree'?'active':''}" onclick="game.expertise.selectedExpertTab='__tree';updateStaticUI();">${treeLabel}</button>`;
    subtabs.innerHTML = expertBtns + treeBtn;
    let showingTree = game.expertise.selectedExpertTab === '__tree';
    if (treeTitle) treeTitle.style.display = showingTree ? '' : 'none';
    tree.style.display = showingTree ? '' : 'none';
    if (!showingTree) {
        ov.innerHTML = '';
        detail.innerHTML = unlocked.filter(id => !game.expertise.selectedExpertTab || id === game.expertise.selectedExpertTab).map(id => getExpertiseCardHtml(id)).join('') || '<div style="color:#98abc0;">아직 조우한 전문가가 없습니다.</div>';
        tree.innerHTML = '';
        return;
    }
    ov.innerHTML = '';
    detail.innerHTML = '';
    let treeOverview = getExpertiseOverviewHtml(total, spent, free);
    if (!treeUnlocked) { tree.innerHTML = treeOverview + '<div class="expertise-panel" style="color:#c7b6d9;">전문가 노드 트리는 전문가 중 한 명이 Lv.16에 도달해 첫 전문가 포인트를 획득하면 해금됩니다.</div>'; return; }
    let groups = { common:[], mycologist:[], gemEngraver:[], astronomer:[], beekeeper:[] };
    EXPERT_TREE_NODES.forEach(n => groups[n.branch].push(n));
    tree.innerHTML = treeOverview + `<div class="expertise-tree-grid"><div><div class="expertise-muted">[균사학자]</div>${groups.mycologist.map(getExpertiseNodeButtonHtml).join('')}</div><div><div class="expertise-muted">[천문학자]</div>${groups.astronomer.map(getExpertiseNodeButtonHtml).join('')}<div class="expertise-panel" style="margin:8px 0;">[전문가 공통]${groups.common.map(getExpertiseNodeButtonHtml).join('')}</div><div class="expertise-muted">[양봉업자]</div>${groups.beekeeper.map(getExpertiseNodeButtonHtml).join('')}</div><div><div class="expertise-muted">[젬 각인사]</div>${groups.gemEngraver.map(getExpertiseNodeButtonHtml).join('')}</div></div>`;
}

function isJewelTabUnlockReady() {
    return (game.season || 1) >= 5
        || (Array.isArray(game.jewelInventory) && game.jewelInventory.length > 0)
        || ((game.currencies || {}).jewelShard || 0) > 0;
}

function syncDerivedTabUnlock(tabId) {
    if (tabId === 'tab-jewel' && game.unlocks && !game.unlocks.jewel && isJewelTabUnlockReady()) {
        game.unlocks.jewel = true;
        game.noti.jewel = true;
    }
}

function checkUnlocks() {
    let u = game.unlocks;
    if (game.level >= 2 && !u.char) {
        u.char = true;
        game.noti.char = true;
        queueTutorialNotice('unlock_char', '스킬트리 개방', '레벨 2에 도달해 성좌를 찍을 수 있게 되었습니다.\n패시브 포인트를 사용해 성장 방향을 정해보세요.', 'tab-char');
    }
    if ((game.inventory.length > 0 || Object.values(game.currencies).some(v => v > 0)) && !u.items) {
        u.items = true;
        game.noti.items = true;
        queueTutorialNotice('unlock_items', '장비/제작 개방', '첫 장비 또는 제작 재화를 얻었습니다.\n아이템을 장착하고, 오브를 사용해 장비를 강화할 수 있습니다.', 'tab-items');
    }
    if (isJewelTabUnlockReady() && !u.jewel) {
        u.jewel = true;
        game.noti.jewel = true;
        queueTutorialNotice('unlock_jewel', '주얼 탭 개방', '주얼과 주얼 결정을 사용할 수 있게 되었습니다.', 'tab-jewel');
    }
    if ((game.skills.length > 1 || game.supports.length > 0) && !u.skills) {
        u.skills = true;
        game.noti.skills = true;
        queueTutorialNotice('unlock_skills', '스킬 젬 개방', '새로운 젬을 얻었습니다.\n공격 스킬을 교체하거나 보조 젬을 연결해 전투 스타일을 바꿔보세요.', 'tab-skills');
    }
    let hasUniqueForCodex = (game.inventory || []).some(item => item && item.rarity === 'unique')
        || Object.values(game.equipment || {}).some(item => item && item.rarity === 'unique')
        || Object.keys(game.uniqueCodex || {}).length > 0;
    if (hasUniqueForCodex && !u.codex) {
        u.codex = true;
        game.noti.codex = true;
        queueTutorialNotice('unlock_codex', '도감 탭 개방', '첫 고유 아이템을 획득해 도감이 열렸습니다.\n고유 아이템을 등록/보관하고 도감 보너스를 받을 수 있습니다.', 'tab-codex');
    }
    if (game.maxZoneId >= 1 && !u.map) {
        u.map = true;
        game.noti.map = true;
        queueTutorialNotice('unlock_map', '지도 개방', '새 사냥터가 열렸습니다.\n원하는 지역으로 이동해 드랍과 속성을 조절할 수 있습니다.', 'tab-map');
    }
    if (game.maxZoneId >= 5 && !(game.seenTutorials || []).includes('unlock_market')) {
        game.noti.items = true;
        queueTutorialNotice('unlock_market', '거래소 개방', '액트 5를 클리어해 거래소가 열렸습니다.\n장비/제작 탭의 거래소에서 재화 교환과 특수 서비스를 이용할 수 있습니다.', 'tab-items', 'item-tab-market');
    }
    if (game.season > 1 && !u.season) {
        u.season = true;
        game.noti.season = true;
        queueTutorialNotice('unlock_season_tab', '루프 탭 개방', `루프 ${game.season}에 도달했습니다!\n루프 이정표와 디버깅 포인트 트리를 루프 탭에서 확인할 수 있습니다.`, 'tab-season');
    }
    if (((game.completedTrials || []).length > 0 || game.ascendPoints > 0 || !!game.ascendClass) && !u.traits) {
        u.traits = true;
        game.noti.traits = true;
        queueTutorialNotice('unlock_traits', '전직 탭 개방', '전직 시련을 통과해 직업전직 탭이 열렸습니다.\n클래스를 선택하고 전직 노드를 활성화하세요.', 'tab-traits');
    }
    if ((((game.currencies || {}).sealShard || 0) > 0 || ((game.currencies || {}).strongSealShard || 0) > 0) && !u.talisman) {
        u.talisman = true;
        game.talismanUnlocked = true;
        game.noti.talisman = true;
        addLog('🧿 봉인편린을 얻어 부적 탭이 개방되었습니다!', 'loot-unique');
    }
    if (typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked() && !game.chaosInfuserUnlocked) {
        game.chaosInfuserUnlocked = true;
        game.noti.items = true;
        addLog('🧪 나무꾼의 흔적을 해석해 혼돈 주입기가 해금되었습니다.', 'loot-unique');
    }
    ensureExpertiseState();
    const beforeExperts = new Set(game.expertise.unlockedExperts || []);
    if ((game.season||1) >= 2 && (game.currencies.sporeFire||0) > 0) game.expertise.unlockedExperts.push('mycologist');
    if (((game.season||1) >= 2 && (game.currencies.bossCore||0) > 0) || ((game.season||1) >= 4 && (game.currencies.skyEssence||0) > 0)) game.expertise.unlockedExperts.push('gemEngraver');
    if ((game.season||1) >= 7 && ((game.starWedge||{}).unlocked || getStarWedgeUnlockReady())) game.expertise.unlockedExperts.push('astronomer');
    if ((game.season||1) >= 8 && (((game.beehive||{}).unlockedPermanent) || (game.currencies.hiveKey||0) > 0)) game.expertise.unlockedExperts.push('beekeeper');
    game.expertise.unlockedExperts = Array.from(new Set(game.expertise.unlockedExperts));
    if (!game.unlocks.expertise && game.expertise.unlockedExperts.length > 0) { game.unlocks.expertise = true; game.noti.expertise = true; queueTutorialNotice('unlock_expertise','전문가 탭 개방','전문가 조우를 통해 전문가 시스템이 개방되었습니다.','tab-expertise'); }
    let newlyUnlockedExperts = (game.expertise.unlockedExperts||[]).filter(id => !beforeExperts.has(id));
    if (newlyUnlockedExperts.length > 0) game.noti.expertise = true;
    if (game.unlocks.expertise) newlyUnlockedExperts.forEach(id => {
        let key = `unlock_expert_${id}`;
        if ((game.seenTutorials||[]).includes(key)) return;
        let def = EXPERT_DEFS[id] || { name: id, desc: '전문가를 조우했습니다.' };
        queueTutorialNotice(key, `${def.icon || '🧠'} ${def.name} 조우`, `${def.desc}\n전문가 탭에서 레벨과 해금, 노드 트리를 확인해보세요.`, 'tab-expertise');
    });
    if (game.level >= 100 && (game.completedTrials || []).includes('trial_3') && !(game.unlockedTrials || []).includes('trial_4')) {
        game.unlockedTrials.push('trial_4');
        game.noti.map = true;
        addLog('🏛️ Lv.100 달성으로 4차 전직 미궁 시련이 개방되었습니다!', 'loot-unique');
    }
}

function isSeasonNodeRequirementMet(node) {
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.seasonNodes.includes(req));
    return game.seasonNodes.includes(node.req);
}
function getSeasonNodeLevel(id) {
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (game.seasonNodes.includes(id)) return Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1));
    return 0;
}
function isSeasonTreeEvolved() {
    let keys = Object.keys(SEASON_NODES || {});
    if (keys.length <= 0) return false;
    return keys.every(id => getSeasonNodeLevel(id) >= 1);
}

function isAscendNodeRequirementMet(node) {
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.ascendNodes.includes(req));
    return game.ascendNodes.includes(node.req);
}


function canRefundPassiveNode(nodeId) {
    if (nodeId === 'n0') return false;
    let owned = new Set((game.passives || []).filter(id => id !== nodeId));
    if (!owned.has('n0')) owned.add('n0');
    let seen = new Set(['n0']);
    let q = ['n0'];
    while (q.length > 0) {
        let cur = q.shift();
        let passiveEdges = (PASSIVE_TREE && Array.isArray(PASSIVE_TREE.edges)) ? PASSIVE_TREE.edges : [];
        passiveEdges.forEach(edge => {
            let next = null;
            if (edge.from === cur && owned.has(edge.to)) next = edge.to;
            else if (edge.to === cur && owned.has(edge.from)) next = edge.from;
            if (next && !seen.has(next)) { seen.add(next); q.push(next); }
        });
    }
    return Array.from(owned).every(id => seen.has(id));
}

function refundPassiveNode(id) { if (!assertBuildEditable()) return;
    game.passives = Array.isArray(game.passives) ? game.passives : ['n0'];
    if (!game.passives.includes(id) || id === 'n0') return;
    if ((game.currencies.scour || 0) < 1) return addLog('패시브 노드 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    if (!canRefundPassiveNode(id)) return addLog('연결 유지에 필요한 노드는 반환할 수 없습니다.', 'attack-monster');
    if (!confirm('전직 패시브를 반환하시겠습니까? (정화의 오브 1 소모)')) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    game.passives = game.passives.filter(nodeId => nodeId !== id);
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0)) + 1;
    calculateReachableNodes();
    addLog(`♻️ 패시브 노드 반환: ${id} (정화의 오브 1개 소모)`, 'season-up');
    updateStaticUI();
}

function askRefundSeasonNode(id) { if (!assertBuildEditable()) return;
    if (!confirm('해당 디버깅 노드를 환불하시겠습니까? (정화의 오브 1 소모)')) return;
    return refundSeasonNode(id);
}

function refundSeasonNode(id) { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (!game.seasonNodes.includes(id)) return;
    let blockers = Object.keys(SEASON_NODES).filter(key => {
        if (key === id || !game.seasonNodes.includes(key)) return false;
        let req = SEASON_NODES[key].req;
        if (!req) return false;
        if (Array.isArray(req)) return req.includes(id) && req.filter(v => v !== id).every(v => !game.seasonNodes.includes(v));
        return req === id;
    });
    if (blockers.length > 0) return addLog('선행 조건으로 연결된 루프 패시브가 있어 반환할 수 없습니다.', 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('루프 패시브 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    let lv = getSeasonNodeLevel(id);
    game.seasonNodes = game.seasonNodes.filter(nodeId => nodeId !== id);
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    delete game.seasonNodeLevels[id];
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + lv;
    updateStaticUI();
}

function refundAscendNode(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (!game.ascendNodes.includes(id)) return;
    let tree = getClassTreeDef(game.ascendClass);
    let blockers = Object.keys(tree).filter(key => {
        if (key === id || !game.ascendNodes.includes(key)) return false;
        let req = tree[key].req;
        let reqAny = Array.isArray(tree[key].reqAny) ? tree[key].reqAny : [];
        let blockedByReq = false;
        if (req) {
            if (Array.isArray(req)) blockedByReq = req.includes(id) && req.filter(v => v !== id).every(v => !game.ascendNodes.includes(v));
            else blockedByReq = req === id;
        }
        let blockedByReqAny = reqAny.includes(id) && reqAny.filter(v => v !== id).every(v => !game.ascendNodes.includes(v));
        return blockedByReq || blockedByReqAny;
    });
    if (blockers.length > 0) return addLog('선행 조건으로 연결된 전직 패시브가 있어 반환할 수 없습니다.', 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('전직 패시브 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    game.ascendNodes = game.ascendNodes.filter(nodeId => nodeId !== id);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + 1;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function buySeason(id) {
    let node = SEASON_NODES[id];
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (!node || !isSeasonNodeRequirementMet(node)) return;
    let lv = getSeasonNodeLevel(id);
    let evolved = isSeasonTreeEvolved();
    let cap = evolved ? 5 : 1;
    if (lv >= cap && lv > 0) {
        if (!confirm('이미 최대 단계입니다. 환불하시겠습니까? (정화의 오브 1 소모)')) return;
        return refundSeasonNode(id);
    }
    if (game.seasonPoints <= 0) return;
    if (lv <= 0) game.seasonNodes.push(id);
    game.seasonNodeLevels[id] = lv + 1;
    game.seasonPoints--;
    updateStaticUI();
}


function getClassKeystoneDefs(clsKey) {
    let defs = (CLASS_KEYSTONE_DEFS && CLASS_KEYSTONE_DEFS[clsKey]) || [];
    return Array.isArray(defs) ? defs : [];
}

function isAscendKeystoneRequirementMet(node) {
    if (!node) return false;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (node.req) return game.ascendKeystones.includes(node.req);
    if (Array.isArray(node.reqAny) && node.reqAny.length > 0) return node.reqAny.some(id => game.ascendKeystones.includes(id));
    return true;
}


function enforceWarriorDualTrainingEquipment(onEnable) {
    if (game.ascendClass !== 'warrior') return true;
    game.equipment = game.equipment || {};
    game.inventory = Array.isArray(game.inventory) ? game.inventory : [];
    let neck = game.equipment['목걸이'];
    if (onEnable) {
        if (neck && neck.slot === '목걸이') {
            if (game.inventory.length >= getInventoryLimit()) {
                addLog('쌍수 훈련 활성화를 위해 목걸이를 해제해야 하지만 인벤토리가 가득 찼습니다.', 'attack-monster');
                return false;
            }
            game.inventory.push(neck);
            game.equipment['목걸이'] = null;
            addLog('🛡️ 쌍수 훈련 활성화: 기존 목걸이를 인벤토리로 이동했습니다.', 'loot-normal');
        }
        return true;
    }
    if (neck && neck.slot === '무기') {
        if (game.inventory.length >= getInventoryLimit()) {
            addLog('쌍수 훈련 해제를 위해 목걸이 슬롯 무기를 해제해야 하지만 인벤토리가 가득 찼습니다.', 'attack-monster');
            return false;
        }
        game.inventory.push(neck);
        game.equipment['목걸이'] = null;
        addLog('🧰 쌍수 훈련 해제: 목걸이 슬롯 무기를 인벤토리로 이동했습니다.', 'loot-normal');
    }
    return true;
}
function buyAscendKeystone(id) {
    if (!game.ascendClass) return;
    let defs = getClassKeystoneDefs(game.ascendClass);
    let node = defs.find(row => row.id === id);
    if (!node) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.includes(id)) return;
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0));
    if (game.ascendKeystonePoints <= 0) return addLog('키스톤 포인트가 부족합니다.', 'attack-monster');
    if (game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT) return addLog(`키스톤은 최대 ${CLASS_KEYSTONE_PICK_LIMIT}개 선택할 수 있습니다.`, 'attack-monster');
    if (!isAscendKeystoneRequirementMet(node)) return addLog('선행 키스톤 조건이 필요합니다.', 'attack-monster');
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(true)) return;
    game.ascendKeystones.push(id);
    game.ascendKeystonePoints -= 1;
    updateStaticUI();
}

function refundAscendKeystone(id) { if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (!game.ascendKeystones.includes(id)) return;
    let blockers = getClassKeystoneDefs(game.ascendClass).filter(node => {
        if (!game.ascendKeystones.includes(node.id) || node.id === id) return false;
        if (node.req && node.req === id) return true;
        if (Array.isArray(node.reqAny) && node.reqAny.includes(id)) {
            let hasAlt = node.reqAny.some(reqId => reqId !== id && game.ascendKeystones.includes(reqId));
            return !hasAlt;
        }
        return false;
    });
    if (blockers.length > 0) return addLog(`선행 키스톤입니다: ${blockers.map(v => v.name).join(', ')}`, 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('키스톤 환불에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    if (!confirm('키스톤을 반환하시겠습니까? (정화의 오브 1 소모)')) return;
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    game.ascendKeystones = game.ascendKeystones.filter(key => key !== id);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
    updateStaticUI();
}

function resetAscendKeystones() {
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return;
    let cost = game.ascendKeystones.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`키스톤 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (game.ascendKeystones.includes('w3') && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + game.ascendKeystones.length;
    game.ascendKeystones = [];
    updateStaticUI();
}

function resetSeasonNodes() { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (game.seasonNodes.length <= 0) return;
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    let totalLv = game.seasonNodes.reduce((s, id) => s + Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1)), 0);
    let cost = game.seasonNodes.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`디버깅 포인트 트리 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!confirm(`디버깅 포인트 트리 전체 초기화? (정화의 오브 ${cost} 소모)`)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + totalLv;
    game.seasonNodes = [];
    game.seasonNodeLevels = {};
    updateStaticUI();
}

function resetAscendNodes() { if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return;
    let cost = game.ascendNodes.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`전직 패시브 트리 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!confirm(`전직 패시브 트리 전체 초기화? (정화의 오브 ${cost} 소모)`)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + game.ascendNodes.length;
    game.ascendNodes = [];
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function selectClass(key) {
    if (confirm(`[${CLASS_TEMPLATES[key].name}] 직업을 선택하시겠습니까? 이번 루프에는 변경할 수 없습니다.`)) {
        game.ascendClass = key;
        game.ascendKeystones = [];
        updateStaticUI();
    }
}

function buyAscend(id) {
    if (!game.ascendClass) return;
    let tree = getClassTreeDef(game.ascendClass);
    let node = tree[id];
    let reqMet = isAscendNodeRequirementMet(node);
    if (node && node.exclusive && game.ascendNodes.includes(node.exclusive)) return addLog('4차 핵심 노드는 2개 중 1개만 선택할 수 있습니다.', 'attack-monster');
    if (!node || game.ascendPoints <= 0 || game.ascendNodes.includes(id) || !reqMet) return;
    game.ascendNodes.push(id);
    game.ascendPoints--;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function getLockedTabMessage(tabId) {
    if (tabId === 'tab-char') return '레벨 2에 도달하면 스킬트리가 열립니다.';
    if (tabId === 'tab-season') return '루프 1을 클리어하면 루프 탭이 열립니다.';
    if (tabId === 'tab-items') return '장비나 제작 재화를 얻으면 장비/제작 탭이 열립니다.';
    if (tabId === 'tab-jewel') return '루프 5에 도달하거나 주얼 또는 주얼 결정을 얻으면 주얼 탭이 열립니다.';
    if (tabId === 'tab-skills') return '새 스킬 젬이나 보조 젬을 획득하면 스킬 젬 탭이 열립니다.';
    if (tabId === 'tab-codex') return '첫 고유 아이템을 획득하면 도감 탭이 열립니다.';
    if (tabId === 'tab-talisman') return '봉인편린을 획득하면 부적 탭이 열립니다.';
    if (tabId === 'tab-map') return '새 사냥터를 발견하면 지도 탭이 열립니다.';
    if (tabId === 'tab-traits') return '전직 시련을 통과하면 직업전직 탭이 열립니다.';
    return '아직 해금되지 않은 탭입니다.';
}


safeExposeGlobals({ checkUnlocks, buySeason, askRefundSeasonNode, refundSeasonNode, refundPassiveNode, selectClass, buyAscend, refundAscendNode, buyAscendKeystone, refundAscendKeystone, resetAscendKeystones, resetSeasonNodes, resetAscendNodes, getLockedTabMessage, selectExpertFavor, openBeehiveChoiceOverlay, closeBeehiveChoiceOverlay, cloudCompactAndPushNow });
