// Phase-2 extracted UI/tab/render helper block.
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

function applyTabHeaderOrder(){
    let header=document.querySelector('.tab-header'); if(!header) return;
    game.settings=game.settings||{};
    let ids=Array.from(header.querySelectorAll('.tab-btn')).map(el=>el.id);
    let order=Array.isArray(game.settings.tabOrder)?game.settings.tabOrder:ids;
    let map={}; Array.from(header.querySelectorAll('.tab-btn')).forEach(el=>map[el.id]=el);
    order.forEach(id=>{ if(map[id]) header.appendChild(map[id]); });
    ids.forEach(id=>{ if(!order.includes(id) && map[id]) header.appendChild(map[id]); });
}
function moveTabButton(tabId, dir){
    game.settings=game.settings||{};
    let header=document.querySelector('.tab-header'); if(!header) return;
    let ids=Array.from(header.querySelectorAll('.tab-btn')).map(el=>el.id);
    let order=Array.isArray(game.settings.tabOrder)?game.settings.tabOrder.slice():ids.slice();
    if(order.length!==ids.length) order=ids.slice();
    let idx=order.indexOf(tabId); if(idx<0) return;
    let ni=Math.max(0, Math.min(order.length-1, idx+dir)); if(ni===idx) return;
    let t=order[idx]; order[idx]=order[ni]; order[ni]=t; game.settings.tabOrder=order;
    applyTabHeaderOrder();
}

function isNotiEnabled(key){ game.settings=game.settings||{}; game.settings.notiFilters=game.settings.notiFilters||{}; return game.settings.notiFilters[key] !== false; }
function toggleNotiFilter(key){ game.settings=game.settings||{}; game.settings.notiFilters=game.settings.notiFilters||{}; game.settings.notiFilters[key]=!(game.settings.notiFilters[key] !== false); updateStaticUI(); }

function switchTab(tabId) {
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
    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'map', 'traits'].forEach(key => { if (tabId === 'tab-' + key) game.noti[key] = false; });
    if (tabId === 'tab-items') switchItemSubtab('item-tab-equip');
    updateStaticUI();
    if (tabId === 'tab-char') {
        setTimeout(function() {
            fitPassiveCameraToBounds(false);
            resizePassiveTreeCanvas(true);
            drawPassiveTree();
            resizeCanvas();
        }, 40);
    } else if (tabId === 'tab-battle') {
        setTimeout(function () {
            syncBattleTabLayout(false);
            scheduleStableResize();
        }, 40);
    }
}

function switchItemSubtab(subtabId) {
    if (subtabId === 'item-tab-market' && !isMarketUnlocked()) {
        addLog('액트 5를 먼저 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
        subtabId = 'item-tab-equip';
    }
    game.itemSubtab = subtabId;
    document.querySelectorAll('#tab-items .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-items .subtab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(subtabId).classList.add('active');
    document.getElementById('btn-' + subtabId).classList.add('active');
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


function renderLoop8BeehivePanel() {
    let open = (game.season || 1) >= 8;
    let header = document.getElementById('ui-beehive-header');
    let panel = document.getElementById('ui-beehive-panel');
    if (!header || !panel) return;
    header.style.display = open ? 'block' : 'none';
    panel.style.display = open ? 'block' : 'none';
    if (!open) return;
    let b = game.beehive || (game.beehive = { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 });
    let choiceHtml = '';
    if (b.inRun && b.pendingChoice) {
        choiceHtml = `<div style="margin-top:8px; display:grid; gap:6px;"><button onclick="resolveBeehiveChoice('now')">즉시 보상 선택 (${b.pendingChoice.nowText})</button><button onclick="resolveBeehiveChoice('later')">클리어 후 보상 (${b.pendingChoice.laterText})</button></div>`;
    }
    panel.innerHTML = `<div style="color:#f6d68e; margin-bottom:6px;">열쇠: <strong>${game.currencies.hiveKey||0}</strong> · 꽃가루: <strong>${game.currencies.pollen||0}</strong> · 독벌침: <strong>${game.currencies.venomStinger||0}</strong> · 벌꿀: <strong>${game.currencies.enchantedHoney||0}</strong></div>
    <div style="color:#b8c7d8; font-size:0.82em; margin-bottom:8px;">세 갈래길 10회 후 여왕벌 보스. 입장 중에는 다른 맵으로 이동 불가, 포기로만 탈출.</div>
    <div style="display:flex; gap:6px; flex-wrap:wrap;"><button onclick="startBeehiveRun()" ${(game.currencies.hiveKey||0)<=0 || b.inRun ? 'disabled':''}>벌집 입장</button><button onclick="advanceBeehivePath()" ${b.inRun && !b.pendingChoice ? '':'disabled'}>다음 갈래 진행 (${b.branchStep||0}/10)</button><button onclick="forfeitBeehiveRun()" ${b.inRun ? '':'disabled'}>던전 포기</button><button onclick="craftBeehiveCurrency('key')" ${(game.currencies.pollen||0)<200?'disabled':''}>꽃가루 200 → 열쇠</button><button onclick="craftBeehiveCurrency('stinger')" ${(game.currencies.pollen||0)<600?'disabled':''}>꽃가루 600 → 독벌침</button><button onclick="craftBeehiveCurrency('honey')" ${(game.currencies.pollen||0)<2000?'disabled':''}>꽃가루 2000 → 벌꿀</button></div>${choiceHtml}`;
}
function renderLoop9VoidRiftPanel(){ let open=(game.season||1)>=9; let h=document.getElementById('ui-voidrift-header'); let p=document.getElementById('ui-voidrift-panel'); if(!h||!p)return; h.style.display=open?'block':'none'; p.style.display=open?'block':'none'; if(!open)return; let v=game.voidRift||(game.voidRift={meter:0,active:false,breachClears:0,grandBreachUnlock:false}); p.innerHTML=`<div style="color:#c7d2ff;">공허 균열은 맵핑 중 낮은 확률로 랜덤 생성됩니다. · 대균열 해금: <strong>${v.grandBreachUnlock?'가능':'잠김'}</strong> · 공허의 끌: <strong>${game.currencies.voidChisel||0}</strong></div><div style="display:flex; gap:6px; margin-top:8px;"><button onclick="clearVoidBreach()" ${v.active?'':'disabled'}>쏟아지는 몬스터 정리</button><button onclick="enterGrandBreach()" ${v.grandBreachUnlock?'':'disabled'}>큰 구멍 진입</button></div>`; }
function startBeehiveRun(){ let b=game.beehive; if((game.currencies.hiveKey||0)<=0||b.inRun) return; game.currencies.hiveKey--; b.inRun=true; b.branchStep=0; b.pendingChoice=null; b.enemyEmpower=0; addLog('🐝 벌집 원정 시작! 완료/포기 전까지 다른 맵으로 이동할 수 없습니다.', 'season-up'); updateStaticUI(); }
function advanceBeehivePath(){ let b=game.beehive; if(!b.inRun) return; b.branchStep++; b.pendingChoice = { nowText:'꽃가루 +10~18', laterText:'벌꿀 6% / 독벌침 22%', eventType: rndChoice(['curse','preview','empower','penalty','none']) }; if(b.branchStep>=10){ b.inRun=false; b.cleared=true; b.unlockedPermanent=true; unlockJournalEntry('beehive_queen'); if(Math.random()<0.06){ let item=generateUniqueItem(Math.max(12,(getZone(game.currentZoneId)||{tier:12}).tier), '무기'); addItemToInventory(item); addLog('👑 여왕벌 전리품: 전용급 고유 장비를 발견했습니다!', 'loot-unique'); } if(Math.random()<0.08) game.currencies.enchantedHoney=(game.currencies.enchantedHoney||0)+1; if(Math.random()<0.2) game.currencies.venomStinger=(game.currencies.venomStinger||0)+1; addLog('👑 여왕벌 처치! 벌집 클리어 체크가 영구 적용되었습니다.', 'level-up'); b.pendingChoice=null; } updateStaticUI(); }
function resolveBeehiveChoice(mode){ let b=game.beehive; if(!b||!b.pendingChoice) return; if(mode==='now'){ game.currencies.pollen=(game.currencies.pollen||0)+Math.floor(10+Math.random()*9); addLog('갈래길 즉시 보상 획득', 'loot-normal'); } else { if(Math.random()<0.06) game.currencies.enchantedHoney=(game.currencies.enchantedHoney||0)+1; if(Math.random()<0.22) game.currencies.venomStinger=(game.currencies.venomStinger||0)+1; addLog('갈래길 클리어 후 보상 확보', 'loot-magic'); } let ev=b.pendingChoice.eventType; if(ev==='curse'){ game.playerHp=Math.max(1,Math.floor(game.playerHp*0.9)); addLog('☠️ 저주: 현재 생명력 10% 감소', 'attack-monster'); } else if(ev==='preview'){ addLog(`🔍 미리보기: 다음 갈래는 ${rndChoice(['축복','함정','강화'])} 기운이 감돕니다.`, 'loot-magic'); } else if(ev==='empower'){ b.enemyEmpower=Math.max(0,Math.floor((b.enemyEmpower||0)+1)); addLog(`🛡️ 적 강화: 벌집 적 체력 증폭 +${b.enemyEmpower}`, 'attack-monster'); } else if(ev==='penalty'){ game.currencies.pollen=Math.max(0,(game.currencies.pollen||0)-5); addLog('⚠️ 패널티: 꽃가루 5 소모', 'attack-monster'); } b.pendingChoice=null; updateStaticUI(); }
function forfeitBeehiveRun(){ let b=game.beehive; if(!b.inRun) return; b.inRun=false; b.branchStep=0; b.pendingChoice=null; b.enemyEmpower=0; addLog('벌집 원정을 포기하고 탈출했습니다.', 'attack-monster'); updateStaticUI(); }
function craftBeehiveCurrency(type){ let cost= type==='key'?200:type==='stinger'?600:2000; if((game.currencies.pollen||0)<cost) return; game.currencies.pollen-=cost; if(type==='key') game.currencies.hiveKey=(game.currencies.hiveKey||0)+1; if(type==='stinger') game.currencies.venomStinger=(game.currencies.venomStinger||0)+1; if(type==='honey') game.currencies.enchantedHoney=(game.currencies.enchantedHoney||0)+1; updateStaticUI(); }
function triggerVoidBreach(){ let v=game.voidRift; v.active=true; addLog('🕳️ 공허의 구멍이 열렸습니다! 몬스터가 쏟아집니다.', 'attack-monster'); updateStaticUI(); }
function clearVoidBreach(){ let v=game.voidRift; if(!v.active) return; v.active=false; v.breachClears=(v.breachClears||0)+1; if(Math.random()<0.12) v.grandBreachUnlock=true; game.currencies.voidChisel=(game.currencies.voidChisel||0)+(Math.random()<0.03?1:0); addLog('공허 균열 정리 완료. 낮은 확률로 큰 구멍이 열립니다.', 'loot-magic'); updateStaticUI(); }
function enterGrandBreach(){ let v=game.voidRift; if(!v.grandBreachUnlock) return; v.grandBreachUnlock=false; unlockJournalEntry('void_grand_breach'); if(Math.random()<0.04){ let item=generateUniqueItem(Math.max(14,(getZone(game.currentZoneId)||{tier:14}).tier)); addItemToInventory(item); addLog('🌌 큰 구멍 보스 전리품: 희귀 고유 장비 획득!', 'loot-unique'); } else addLog('🌌 큰 구멍 던전에 진입! 보스 보상이 떨어졌지만 고유는 아니었습니다.', 'season-up'); }
function switchMapSubtab(subtabId) {
    game.mapSubtab = subtabId;
    document.querySelectorAll('#tab-map .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-map .subtab-btn').forEach(el => el.classList.remove('active'));
    let panel = document.getElementById(subtabId);
    let btn = document.getElementById('btn-' + subtabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}

function toggleSeasonBossRepeat() {
    game.autoRepeatSeasonBoss = !game.autoRepeatSeasonBoss;
    addLog(`🗝️ 시즌 보스 반복 도전: ${game.autoRepeatSeasonBoss ? 'ON' : 'OFF'}`, 'season-up');
    updateStaticUI();
}

function renderStarWedgePanel() {
    let panel = document.getElementById('ui-star-wedge-panel');
    if (!panel) return;
    let st = ensureStarWedgeState();
    tryUnlockMeteorContentByProgress();
    if (!st.unlocked) {
        panel.innerHTML = `<div style="color:#7f89a0;">루프 ${STAR_WEDGE_UNLOCK_LOOP} + 액트 ${STAR_WEDGE_UNLOCK_ACT} 이후 해금됩니다.</div>`;
        return;
    }
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
        return `<div style="border:1px solid #3e3352; border-radius:8px; padding:8px; background:#121224;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;"><strong style="color:#efd8ff;">별쐐기 #${wedge.id % 10000}</strong>${socketedEntry ? `<button style="min-height:24px; padding:3px 8px; font-size:0.72em; background:#5c3448; border-color:#81506b;" onclick="unsocketStarWedge('${socketedEntry.nodeId}')">장착 해제</button>` : ''}</div>
            ${lines}
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em; ${selecting ? 'background:#2f6a42; border-color:#3f9b5c;' : ''}" onclick="beginStarWedgeSocketSelection(${wedge.id})">${selecting ? '슬롯 선택 취소' : '장착할 슬롯 선택'}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id})">리롤</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id}, 'single')">1줄 고정</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id}, 'double')">2줄 고정 (파편x10)</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em; background:#63383f; border-color:#8f5963;" onclick="destroyStarWedge(${wedge.id})">파괴하기</button>
            </div>
        </div>`;
    }).join('');
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
            <div style="color:#d6e0ec;">운석 파편: <strong style="color:#ffd36f;">${game.currencies.meteorShard || 0}</strong> · 불완전한 별쐐기: <strong style="color:#b9d3ff;">${game.currencies.incompleteStarWedge || 0}</strong> · 별쐐기: <strong style="color:#f0ccff;">${game.currencies.starWedge || 0}</strong></div>
            <div style="color:#8ea5c1;">장착 슬롯: ${socketNodeText}</div>
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
    let cells = TALISMAN_SHAPES[shape] || [];
    let style = getTalismanShapeStyle(shape);
    let cellSize = Math.max(4, Math.floor(options.cellSize || 6));
    let gap = Math.max(1, Math.floor(options.gap || 1));
    let width = (3 * cellSize) + (2 * gap);
    let height = (2 * cellSize) + gap;
    let filled = new Set(cells.map(cell => `${cell[0]},${cell[1]}`));
    let html = '';
    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
            let isFilled = filled.has(`${x},${y}`);
            html += `<span style="width:${cellSize}px; height:${cellSize}px; border-radius:2px; border:1px solid ${isFilled ? style.color : 'rgba(120,140,160,0.35)'}; background:${isFilled ? style.color : 'transparent'}; display:block;"></span>`;
        }
    }
    return `<span style="display:grid; grid-template-columns:repeat(3, ${cellSize}px); grid-auto-rows:${cellSize}px; gap:${gap}px; width:${width}px; height:${height}px; padding:2px; border:1px solid rgba(120,145,175,0.4); border-radius:4px; background:rgba(8,14,22,0.45); box-shadow:0 0 0 1px ${style.glow};">${html}</span>`;
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

function renderSealShardBadge(source) {
    let isStrong = source === 'strongSealShard';
    let color = isStrong ? '#f3c266' : '#9ed2ff';
    let label = isStrong ? '강력 편린' : '편린';
    return `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.72em; color:${color}; border:1px solid ${color}66; border-radius:999px; padding:2px 7px; background:${isStrong ? 'rgba(94,64,17,0.45)' : 'rgba(21,54,83,0.38)'};">${isStrong ? '✦' : '◆'} ${label}</span>`;
}

function rollTalismanRevealCount() {
    let r = Math.random();
    if (r < 0.002) return 6;
    if (r < 0.01) return 5;
    if (r < 0.06) return 4;
    if (r < 0.28) return 3;
    return 2;
}

function rollTalismanCandidate(isStrong) {
    let shapeKey = rndChoice(Object.keys(TALISMAN_SHAPES));
    let option = rndChoice(TALISMAN_OPTION_POOL);
    let multiplier = isStrong ? 1.35 : 1.0;
    let rolled = option.min + Math.random() * (option.max - option.min);
    let step = option.step || 1;
    let value = Math.round((rolled * multiplier) / step) * step;
    return {
        id: Date.now() + Math.floor(Math.random() * 100000),
        shape: shapeKey,
        cells: TALISMAN_SHAPES[shapeKey].map(([x, y]) => ({ x: x, y: y })),
        stat: option.stat,
        statName: option.label,
        value: Number(value.toFixed(step < 1 ? 1 : 0)),
        rarity: isStrong ? '강력한 기운' : '일반',
        source: isStrong ? 'strongSealShard' : 'sealShard'
    };
}

function startTalismanUnseal(currencyKey) {
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog('봉인편린이 부족합니다.', 'attack-monster');
    if (game.talismanUnseal) return addLog('이미 봉인 해제 중입니다. 먼저 선택/파괴를 완료하세요.', 'attack-monster');
    game.currencies[currencyKey]--;
    let total = rollTalismanRevealCount();
    game.talismanUnseal = {
        rollsLeft: total,
        totalRolls: total,
        current: rollTalismanCandidate(currencyKey === 'strongSealShard'),
        source: currencyKey
    };
    addLog(`🧿 봉인 해제 시작! 총 확인 기회 ${total}회`, 'season-up');
    updateStaticUI();
}

function previewNextTalismanShape() {
    let state = game.talismanUnseal;
    if (!state || state.rollsLeft <= 1) return;
    state.rollsLeft--;
    state.current = rollTalismanCandidate(state.source === 'strongSealShard');
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

function getTalismanUnlockedCellsSet() {
    let cells = Array.isArray(game.talismanUnlockedCells) ? game.talismanUnlockedCells : [];
    let set = new Set(cells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)));
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) if (isTalismanBoardCellValid(x,y)) set.add(talismanCellIndex(x,y));
    return set;
}

function getTalismanExpandCost(extraUnlockedCount) {
    if (extraUnlockedCount >= 16) return 0;
    return 1 + Math.floor(extraUnlockedCount / 4);
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
    let extraUnlocked = Math.max(0, unlockedSet.size - 9);
    let cost = getTalismanExpandCost(extraUnlocked);
    if ((game.currencies.sealShard || 0) < cost) {
        addLog(`봉인편린이 부족합니다. (필요: ${cost})`, 'attack-monster');
        return false;
    }
    game.currencies.sealShard -= cost;
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
    if (!canPlaceTalismanAt(talisman, x, y)) return addLog('해당 위치에는 부적을 배치할 수 없습니다.', 'attack-monster');
    game.talismanBoard = Array.isArray(game.talismanBoard) ? game.talismanBoard : Array(TALISMAN_BOARD_W * TALISMAN_BOARD_H).fill(null);
    talisman.cells.forEach(cell => {
        let idx = talismanCellIndex(x + cell.x, y + cell.y);
        game.talismanBoard[idx] = talisman.id;
    });
    game.talismanPlacements = game.talismanPlacements || {};
    game.talismanPlacements[talisman.id] = { x: x, y: y, talisman: talisman };
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
    addLog('📚 도감 완성! 다음 시즌 환생부터 부위별 최하위 고유 선택 특전이 활성화됩니다.', 'loot-unique');
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
    if (stored.revealed && !stored.baseName) return addLog('이번 시즌에는 도감 정보만 남아 있어 꺼낼 수 없습니다.', 'attack-monster');
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

function renderCodexStatsHtml(entry, stored) {
    let statList = [];
    if (stored && stored.baseName) {
        (stored.baseStats || []).forEach(stat => {
            statList.push(`<span style="color:#95a5a6">${stat.statName} +${formatValue(stat.id, stat.val)}</span>`);
        });
        (stored.stats || []).forEach(stat => {
            let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatValue(stat.id, stat.valMin)}~${formatValue(stat.id, stat.valMax)})` : '';
            statList.push(`<span>${stat.statName} +${formatValue(stat.id, stat.val)}${range}</span>`);
        });
    } else if (stored) {
        (entry.stats || []).forEach(stat => {
            statList.push(`<span>${getStatName(stat.id)} ${formatValue(stat.id, stat.min)}~${formatValue(stat.id, stat.max)}</span>`);
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
    summary.innerHTML = `등록 수: <strong>${progress.stored}</strong> / ${progress.total} · 도감 보너스: 피해/생명력/드랍률 +${bonus.toFixed(1)}% · 완성 상태: <strong>${rewardState}</strong>`;
    let bySlot = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
    let lines = [];
    bySlot.forEach(slot => {
        let entries = UNIQUE_DB.filter(entry => (entry.slots || [])[0] === slot);
        if (entries.length === 0) return;
        let collapsed = !!game.codexCollapsedSlots[slot];
        lines.push(`<div style="grid-column:1/-1; margin-top:4px; display:flex; justify-content:space-between; align-items:center; gap:8px; background:#121822; border:1px solid #2f4f66; border-radius:8px; padding:8px 10px;"><strong style="color:#9bc2df;">${slot}</strong><button onclick="toggleCodexSlotCollapse('${slot}')" style="font-size:0.78em; padding:4px 8px;">${collapsed ? '펼치기' : '접기'}</button></div>`);
        if (collapsed) return;
        entries.forEach(entry => {
            let key = `${slot}|${entry.name}`;
            let stored = game.uniqueCodex[key];
            let infoLine = stored ? (stored.baseName ? `${stored.baseName} / 숨겨진 티어 ${getTierBadgeHtml(stored.hiddenTier || stored.itemTier || 1, 'T')}` : '정보만 유지됨 (시즌 리셋됨)') : '미등록';
            let statHtml = stored ? renderCodexStatsHtml(entry, stored) : '';
            lines.push(`<div class="item-card"><div><div class="item-title unique">[${slot}] ${stored ? entry.name : '???'}</div><div class="item-base-line">${infoLine}</div><div class="item-stats">${statHtml || '옵션 정보 없음'}</div></div><div class="item-actions">${stored ? (stored.baseName ? `<button onclick="withdrawUniqueFromCodex('${key}')">꺼내기</button>` : `<button disabled>초기화됨</button>`) : `<button disabled>비어있음</button>`}</div></div>`);
        });
    });
    listEl.innerHTML = lines.join('');
}

function grantCodexLegacyStarterUniques() {
    if (!game.uniqueCodexCompletedRewardClaimed) return;
    let slots = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
    let granted = [];
    slots.forEach(slot => {
        let options = UNIQUE_DB.filter(entry => (entry.slots || [])[0] === slot).sort((a, b) => (a.reqTier || 1) - (b.reqTier || 1));
        if (options.length === 0) return;
        let minTier = options[0].reqTier || 1;
        let pick = rndChoice(options.filter(entry => (entry.reqTier || 1) === minTier));
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
        if ((game.inventory || []).length < getInventoryLimit()) {
            game.inventory.push(normalizeItem(item));
            granted.push(`[${slot}] ${pick.name}`);
        }
    });
    if (granted.length > 0) addLog(`🎁 도감 완성 특전 지급: ${granted.join(', ')}`, 'loot-unique');
}

function changeSkill(name) { game.activeSkill = name; updateStaticUI(); }
function toggleSupport(name) {
    normalizeSupportLoadout(false);
    let idx = game.equippedSupports.indexOf(name);
    if (idx > -1) game.equippedSupports.splice(idx, 1);
    else if (game.equippedSupports.length < getPlayerStats().suppCap) game.equippedSupports.push(name);
    updateStaticUI();
}

function addLog(msg, cls) {
    const log = document.getElementById('log');
    const div = document.createElement('div');
    div.className = 'log-msg ' + (cls || '');
    div.innerHTML = msg;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    if (log.childElementCount > 60) log.removeChild(log.firstChild);
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
    game.settings.showSpawnLog = document.getElementById('chk-log-spawn').checked;
    game.settings.showExpLog = document.getElementById('chk-log-exp').checked;
    game.settings.showLootLog = document.getElementById('chk-log-loot').checked;
    game.settings.showCrowdPauseLog = document.getElementById('chk-log-crowd').checked;
    game.settings.showDeathNotice = document.getElementById('chk-death-notice').checked;
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

function renderBreakdownHtml(data) {
    let html = `<div class="tooltip-title">${data.title}</div>`;
    (data.lines || []).forEach(line => { html += `<div class="tooltip-line">${line}</div>`; });
    if (data.final !== undefined) html += `<div class="tooltip-final">최종 수치: ${data.final}</div>`;
    return html;
}

function showStatTooltip(event, key) {
    let stats = getPlayerStats();
    let data = stats.breakdowns[key];
    if (!data) return;
    showInfoTooltipHtml(event.clientX, event.clientY, renderBreakdownHtml(data), '#f39c12');
}

function showGemTooltip(event, type, name) {
    let info = getGemPresentation(name, type === 'support');
    let stats = getPlayerStats();
    let html = `<div class="tooltip-title">${name}</div>`;
    if (type === 'support') {
        html += `<div class="tooltip-line">${info.desc}</div>`;
        html += `<div class="tooltip-line" style="margin-top:6px;">효과: ${info.statName} +${formatValue(SUPPORT_GEM_DB[name].stat, info.value)}${SUPPORT_GEM_DB[name].isPct ? '%' : ''}</div>`;
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
            html += `<div class="tooltip-line">생명력 계수: 최대 생명력 100당 약 +${per100.toFixed(1)}% 추가 피해</div>`;
        }
        if ((skill.regenDmgScale || 0) > 0) html += `<div class="tooltip-line">재생 계수: 재생 1%당 ${skill.regenDmgScale.toFixed(2)}% 추가 배율</div>`;
        if ((skill.fireResDmgScale || 0) > 0) html += `<div class="tooltip-line">화염 저항 계수: 화염 저항 1%당 ${(skill.fireResDmgScale * 100).toFixed(2)}% 추가 배율</div>`;
        if (name === '화염 부패') html += `<div class="tooltip-line">특수 규칙: 공격력(기본 피해) 미적용</div>`;
        if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">지속 피해 배율 ${(skill.dotMultiplier || 1).toFixed(2)}x</div>`;
        html += `<div class="tooltip-line">타겟 방식: ${skill.targetMode === 'all' ? '전체' : skill.targetMode === 'cleave' ? '전방 다중' : skill.targetMode === 'chain' ? '연쇄' : skill.targetMode === 'pierce' ? '관통' : '단일'}</div>`;
        html += `<div class="tooltip-line">최대 타겟 수: ${Math.max(1, skill.targets || 1)}</div>`;
        if ((info.tags || []).length > 0) html += `<div class="tooltip-line">태그: ${info.tags.join(' / ')}</div>`;
        if (skill.crit) html += `<div class="tooltip-line">추가 치명타 +${skill.crit}%</div>`;
        if (skill.leech) html += `<div class="tooltip-line">추가 흡혈 +${skill.leech}%</div>`;
    }
    if (type === 'support' || SKILL_DB[name].isGem) {
        html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">총 레벨 ${type === 'support' ? info.totalLevel : info.finalLevel}</div>`;
        if (type === 'support') {
            html += `<div class="tooltip-line">(Lv.${info.baseLevel} + 패시브 ${stats.gemBonusSources.passive} + 장비 ${stats.gemBonusSources.gear} + 보상 ${stats.gemBonusSources.reward})</div>`;
        } else {
            html += `<div class="tooltip-line">(Lv.${info.baseLevel} + 패시브 ${stats.gemBonusSources.passive} + 장비 ${stats.gemBonusSources.gear} + 보상 ${stats.gemBonusSources.reward} + 군주의핵 ${info.bossCoreLevel || 0} + 창공의힘 ${info.skyCoreLevel || 0})</div>`;
        }
    }
    showInfoTooltipHtml(event.clientX, event.clientY, html, type === 'support' ? '#2bcbba' : '#ff5252');
}

function showItemTooltip(event, idx, isEquip) {
    let item = isEquip ? game.equipment[idx] : game.inventory[idx];
    if (!item) return;
    activeItemTooltipToken = isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`;
    let tt = document.getElementById('item-tooltip-box');
    let html = `<div class="tooltip-title" style="color:${getRarityColor(item.rarity)}">[${item.slot.replace(/[12]/, '')}] ${item.name}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}</div>`;
    html += `<div class="tooltip-line" style="color:#95a5a6;">베이스: ${item.baseName}</div>`;
    html += `<div class="tooltip-line" style="color:#a8c0da;">숨겨진 티어 ${getTierBadgeHtml(item.hiddenTier || item.itemTier || 1, 'T')}</div>`;
    if ((item.baseStats || []).length > 0) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#f1c40f;">베이스 옵션</div>`;
        item.baseStats.forEach(stat => html += `<div class="tooltip-line">${stat.statName} +${formatValue(stat.id, stat.val)}${stat.statName.includes('%') ? '%' : ''}</div>`);
    }
    if ((item.stats || []).length > 0) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#3498db;">추가 옵션</div>`;
        item.stats.forEach(stat => {
            let tierText = stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let rangeText = stat.valMin !== undefined && stat.valMax !== undefined ? ` <span style="color:#888;">(${formatValue(stat.id, stat.valMin)}~${formatValue(stat.id, stat.valMax)})</span>${tierText}` : tierText;
            html += `<div class="tooltip-line">${stat.statName} +${formatValue(stat.id, stat.val)}${rangeText}</div>`;
        });
    } else {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#7f8c8d;">노멀 아이템: 추가 옵션 없음</div>`;
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
    let group = 'physical';
    let primary = '#d7dde6';
    let secondary = '#ffffff';
    let aura = null;
    if (tags.includes('chaos')) {
        group = 'chaos';
        primary = '#ba83ff';
        secondary = '#f2ddff';
        aura = 'rgba(176,118,255,0.16)';
    } else if (tags.includes('cold')) {
        group = 'cold';
        primary = '#8de7ff';
        secondary = '#eefbff';
        aura = 'rgba(133,235,255,0.14)';
    } else if (tags.includes('lightning')) {
        group = 'lightning';
        primary = '#ffd84f';
        secondary = '#fff7cc';
        aura = 'rgba(255,216,79,0.14)';
    } else if (tags.includes('fire')) {
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
    if (!zone) return 'backdropAct1';
    if (zone.type === 'act') {
        if (zone.id === 0) return 'backdropAct1';
        if (zone.id === 4) return 'backdropAct5';
        if (zone.id === 1 || zone.id === 5) return 'backdropAct2_6';
        if (zone.id === 2 || zone.id === 6) return 'backdropAct3_7';
        if (zone.id === 3 || zone.id === 7) return 'backdropAct4_8';
        if (zone.id === 8 || zone.id === 9) return 'backdropAct9_10';
    }
    if (zone.type === 'labyrinth') return 'backdropAct5';
    if (zone.type === 'abyss' || zone.type === 'seasonBoss') return 'backdropAct9_10';
    if (zone.ele === 'fire') return 'backdropAct2_6';
    if (zone.ele === 'cold') return 'backdropAct3_7';
    if (zone.ele === 'light') return 'backdropAct4_8';
    if (zone.ele === 'chaos') return 'backdropAct9_10';
    return 'backdropAct1';
}

function getBattleBackdropForZone(zone) {
    let list = (battleAssets.backdrops || {});
    let key = getBattleBackdropKeyForZone(zone);
    let image = list[key] || list.backdropAct1 || Object.values(list)[0];
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
        ctx.fillStyle = variant.tone;
        ctx.fillRect(0, 0, width, height);
        let glow = ctx.createRadialGradient(width * 0.52, height * 0.2, width * 0.08, width * 0.52, height * 0.2, width * 0.7);
        glow.addColorStop(0, variant.glow);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        let zoneTint = ctx.createLinearGradient(0, 0, 0, height);
        zoneTint.addColorStop(0, theme.skyTop + '55');
        zoneTint.addColorStop(0.55, 'rgba(0,0,0,0)');
        zoneTint.addColorStop(1, theme.skyBottom + '6e');
        ctx.fillStyle = zoneTint;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#ffffff';
        let drift = (now / 70) % (width + 80);
        ctx.fillRect(-width + drift, height * 0.28, width * 0.45, 4);
        ctx.fillRect(drift - 30, height * 0.44, width * 0.35, 3);
        ctx.restore();

        ctx.save();
        let vignette = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.12, width * 0.5, height * 0.55, width * 0.78);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.26)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
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
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    let drift = (now / 70) % (width + 80);
    ctx.fillRect(-width + drift, height * 0.28, width * 0.45, 4);
    ctx.fillRect(drift - 30, height * 0.44, width * 0.35, 3);
    ctx.restore();

    ctx.save();
    let vignette = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.12, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
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
                motionName = 'hit';
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
            let glow = ctx.createRadialGradient(x, y - (metrics.drawH * 0.46), metrics.drawW * 0.1, x, y - (metrics.drawH * 0.46), metrics.drawH * 0.85);
            glow.addColorStop(0, 'rgba(205,236,255,0.22)');
            glow.addColorStop(1, 'rgba(205,236,255,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.ellipse(x, y - (metrics.drawH * 0.46), metrics.drawW * 0.75, metrics.drawH * 0.86, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.filter = 'brightness(1.15) contrast(1.08) saturate(1.05)';
            ctx.drawImage(
                battleAssets.images.hero,
                heroFrame.sx, heroFrame.sy, heroFrame.sw, heroFrame.sh,
                metrics.dx, metrics.dy, metrics.drawW, metrics.drawH
            );
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(
                battleAssets.images.hero,
                heroFrame.sx, heroFrame.sy, heroFrame.sw, heroFrame.sh,
                metrics.dx - 1, metrics.dy - 1, metrics.drawW, metrics.drawH
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
        drawPixelShadow(ctx, x, y + 15, 10, 4, 0.16);
        let normalizedHeroSize = 55.2 - downBlend * 6.5;
        normalizedHeroSize = clampNumber(normalizedHeroSize, 50, 55.2);
        let drawOptions = {
            alpha: downPhase !== null ? 0.98 : 1,
            smoothing: 'high',
            outlineColor: '#ffffff',
            outlineAlpha: 0.86,
            outlineThickness: 1
        };
        drawBattleSprite(ctx, battleAssets.atlas.hero.image, frame, x + stepOffset, y + 7 - advanceBlend * 0.18 + hurtBlend * 0.08 + downBlend * 2.2, normalizedHeroSize, drawOptions);
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
    if (skillVisual.aura) {
        ctx.fillStyle = skillVisual.aura;
        ctx.beginPath();
        ctx.ellipse(0, 14 * s, 18 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
    }

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
        drawBattleSprite(ctx, frameImage, frame, x, y + 5, drawSize, { smoothing: 'high' });
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

function drawBattleImpactBurst(ctx, x, y, primary, secondary, t) {
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
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

function drawBattleSwingFx(ctx, fx, t, playerPos) {
    let skillVisual = getBattleSkillVisual(fx.skillName, SKILL_DB[fx.skillName] || SKILL_DB['기본 공격']);
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.72;
    let reach = 16 + t * 18;
    if (skillVisual.group === 'physical_slam') {
        ctx.strokeStyle = skillVisual.primary;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(playerPos.x + 8, playerPos.y + 8, 10 + t * 18, Math.PI * 0.08, Math.PI * 1.65);
        ctx.stroke();
    } else {
        ctx.strokeStyle = skillVisual.primary;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(playerPos.x + 3, playerPos.y - 4);
        ctx.quadraticCurveTo(playerPos.x + 10 + t * 10, playerPos.y - 26, playerPos.x + reach, playerPos.y - 10);
        ctx.stroke();
        ctx.strokeStyle = skillVisual.secondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playerPos.x + 6, playerPos.y - 1);
        ctx.lineTo(playerPos.x + reach - 2, playerPos.y - 6);
        ctx.stroke();
    }
    if (fx.crit) {
        ctx.globalAlpha = (1 - t) * 0.52;
        ctx.strokeStyle = '#fff6c8';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            let angle = -0.8 + i * 0.5 + t * 0.25;
            ctx.beginPath();
            ctx.moveTo(playerPos.x + 10, playerPos.y - 6);
            ctx.lineTo(playerPos.x + 10 + Math.cos(angle) * (18 + t * 10), playerPos.y - 6 + Math.sin(angle) * (18 + t * 10));
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawBattleHitFx(ctx, fx, t, playerPos, enemyPosMap) {
    let enemyEntry = enemyPosMap[fx.enemyId];
    if (!enemyEntry) return;
    let skillVisual = getBattleSkillVisual(fx.skillName, SKILL_DB[fx.skillName] || SKILL_DB['기본 공격']);
    let tx = enemyEntry.x;
    let ty = enemyEntry.y - 6;
    let sx = playerPos.x + 10;
    let sy = playerPos.y - 2;
    ctx.save();
    let punchScale = fx.crit ? 1.4 : 1;
    if (skillVisual.group === 'physical_slam') {
        ctx.globalAlpha = 1 - t * 0.55;
        ctx.strokeStyle = skillVisual.primary;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(tx, ty + 6, 12 + t * 26 * punchScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,245,230,0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - 16, ty + 10);
        ctx.lineTo(tx + 16, ty + 10);
        ctx.stroke();
    } else {
        ctx.globalAlpha = 1 - t * 0.62;
        ctx.strokeStyle = skillVisual.primary;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }
    let impactTheme = getImpactThemeByElement((fx.element || (SKILL_DB[fx.skillName] || {}).ele || 'phys'));
    drawBattleImpactBurst(ctx, tx, ty, impactTheme.primary || skillVisual.primary, impactTheme.secondary || skillVisual.secondary, t);
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

function updateCombatUI(pStats) {
    game.playerHp = Math.min(game.playerHp, pStats.maxHp);
    document.getElementById('ui-hp').innerText = Math.max(0, Math.floor(game.playerHp));
    document.getElementById('ui-maxhp').innerText = pStats.maxHp;
    document.getElementById('ui-maxhp-stat').innerText = pStats.maxHp;
    document.getElementById('ui-hp-bar').style.width = Math.max(0, (game.playerHp / pStats.maxHp) * 100) + '%';
    document.getElementById('ui-exp').innerText = game.exp;
    document.getElementById('ui-maxexp').innerText = getExpReq(game.level);
    document.getElementById('ui-exp-bar').style.width = ((game.exp / getExpReq(game.level)) * 100) + '%';
    document.getElementById('ui-player-level').innerText = 'Lv.' + game.level;
    let ailmentEl = document.getElementById('ui-player-ailments');
    if (ailmentEl) {
        let labels = { ignite: '점화', chill: '냉각', shock: '감전', poison: '중독' };
        let text = (game.playerAilments || []).map(ail => `${labels[ail.type] || ail.type} ${Math.max(0, (ail.time || 0)).toFixed(1)}s`).join(' · ');
        ailmentEl.innerText = text ? `상태이상: ${text}` : '';
    }

    let zone = getZone(game.currentZoneId);
    let combatTitle = zone.name;
    if (zone.type === 'act') {
        let storyAct = getStoryActByZoneId(zone.id);
        if (storyAct) combatTitle = `⚔️ 전투 ${formatStoryActLabel(storyAct)}: ${storyAct.title}`;
    } else if (zone.type !== 'trial') {
        combatTitle = `⚔️ 전투 ${zone.name}`;
    }
    document.getElementById('ui-combat-zone').innerText = zone.type === 'trial' ? zone.name : combatTitle;

    if (game.moveTimer > 0) {
        let readyPct = Math.min(100, (1 - game.moveTimer / game.moveTotalTime) * 100);
        document.getElementById('ui-progress-label').innerText = game.isTownReturning ? '🏕️ 재정비 중...' : '🚶 다음 구간 준비';
        document.getElementById('ui-move-time-text').innerText = `${Math.max(0, game.moveTimer).toFixed(1)}초`;
        document.getElementById('ui-move-bar').style.width = readyPct + '%';
    } else if (isCrowdProgressPaused()) {
        document.getElementById('ui-progress-label').innerText = '⛔ 전장 정리 중';
        document.getElementById('ui-move-time-text').innerText = `적 ${ENEMY_CROWD_PAUSE_LIMIT}기 이상`;
        document.getElementById('ui-move-bar').style.width = game.runProgress + '%';
    } else {
        document.getElementById('ui-progress-label').innerText = '🧭 맵 진행';
        document.getElementById('ui-move-time-text').innerText = `${game.runProgress.toFixed(0)}%`;
        document.getElementById('ui-move-bar').style.width = game.runProgress + '%';
    }

    document.getElementById('ui-dps').innerText = Math.floor(pStats.dps);
    document.getElementById('ui-atk').innerText = Math.floor(pStats.baseDmg);
    document.getElementById('ui-aps').innerText = pStats.aspd.toFixed(2);
    document.getElementById('ui-crit').innerText = pStats.crit.toFixed(1);
    document.getElementById('ui-crit-dmg').innerText = Math.floor(pStats.critDmg);
    document.getElementById('ui-move-spd').innerText = Math.floor(pStats.moveSpeed);
    document.getElementById('ui-dr').innerText = Math.floor(pStats.dr);
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
        specialSummaryEl.innerText = notes.join(' · ');
    }

    let enemies = game.enemies || [];
    let targetIds = getSkillTargets(pStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    let focusedEnemy = enemies.find(enemy => targetIds.includes(enemy.id)) || enemies[0] || null;
    if (!focusedEnemy) {
        document.getElementById('ui-enemy-list').innerHTML = `<div class="enemy-empty">현재 조준 중인 적이 없습니다.</div>`;
    } else {
        let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
        let tags = getEnemyTraitSummary(focusedEnemy);
        document.getElementById('ui-enemy-list').innerHTML = `
            <div class="enemy-card targeted">
                <div class="enemy-name">${getEnemyDisplayName(focusedEnemy)}</div>
                <div class="hp-bar-bg">
                    <div class="hp-bar-fill" style="width:${pct}%"></div>
                    <div class="hp-text">${Math.max(0, Math.floor(focusedEnemy.hp))}/${focusedEnemy.maxHp}</div>
                </div>
                <div class="enemy-tags muted">특성: ${tags.join(' · ') || '일반'}</div>
            </div>
        `;
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
function updateStaticUI() {
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
    updateCombatUI(pStats);
    let showCombatScene = game.settings.showCombatScene !== false;
    let canvas = document.getElementById('battlefield-canvas');
    let caption = document.getElementById('ui-battlefield-caption');
    let battlefieldWrap = document.getElementById('battlefield-wrap');
    if (canvas) canvas.style.display = showCombatScene ? 'block' : 'none';
    if (battlefieldWrap) battlefieldWrap.classList.toggle('compressed', !showCombatScene);
    applyPanelLayoutSettings();
    if (!showCombatScene && caption) caption.innerText = '전투가 진행중입니다.';
    let shrineBox = document.getElementById('ui-shrine-box');
    if (shrineBox) {
        let active = game.shrineState && game.shrineState.active;
        let buff = game.shrineBuff;
        shrineBox.innerHTML = active ? `<button onclick="clickActiveShrine()">${active.name} 클릭</button>` : (buff ? `<div style="color:#ffd36b;">${buff.name} 지속중</div>` : '<div style="color:#7f8c8d;">성소 대기중</div>');
    }
    if (document.getElementById('tab-char') && document.getElementById('tab-char').classList.contains('active')) resizePassiveTreeCanvas(false);
    drawPassiveTree();
    renderStarWedgePanel();

    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'map', 'traits','jewel','journal','currency','fossil','ascend','loop'].forEach(key => { let el=document.getElementById('noti-' + key); if(!el) return; el.style.display = (game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none'; });
    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'map', 'traits'].forEach(key => document.getElementById('btn-tab-' + key).style.display = game.unlocks[key] ? 'block' : 'none');
    let jewelTabBtn = document.getElementById('btn-tab-jewel');
    if (jewelTabBtn) jewelTabBtn.style.display = game.unlocks.items ? 'block' : 'none';
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = window.matchMedia(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`).matches ? 'block' : 'none';
    let summarySkillTreeBtn = document.getElementById('btn-summary-tab-char');
    if (summarySkillTreeBtn) {
        summarySkillTreeBtn.disabled = !game.unlocks.char;
        summarySkillTreeBtn.innerText = game.unlocks.char ? '스킬트리' : '스킬트리 (Lv.2)';
    }
    let activeContent = document.querySelector('.tab-content.active');
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
    document.getElementById('ui-inv-count').innerText = game.inventory.length;
    document.getElementById('ui-inv-limit').innerText = getInventoryLimit();
    document.getElementById('ui-inventory-list').innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'equip')).join('');
    document.getElementById('ui-craft-inventory-list').innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'craft')).join('');
    document.getElementById('ui-fossil-inventory-list').innerHTML = game.inventory.map((item, idx) => renderInventoryCard(item, idx, 'fossil')).join('');
    let jewelUnlocked = (game.season || 1) >= 5;
    document.getElementById('ui-jewel-header').style.display = jewelUnlocked ? 'block' : 'none';
    document.getElementById('ui-jewel-panel').style.display = jewelUnlocked ? 'block' : 'none';
    if (jewelUnlocked) {
        game.jewelSlots = Array.isArray(game.jewelSlots) ? game.jewelSlots : [null, null];
        game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
        jewelFusionSelection = (jewelFusionSelection || []).filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length);
        document.getElementById('ui-jewel-cap').innerHTML = `주얼 인벤토리: <strong>${game.jewelInventory.length}</strong> / ${getJewelInventoryLimit()}`;
        syncJewelSalvageControlsFromSettings();
        game.jewelSlotAmplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [0, 0];
        document.getElementById('ui-jewel-core-craft').innerHTML = `<div style="color:#f1c67d; margin-bottom:4px;">주얼 제작 재화 (주얼 결정: ${game.currencies.jewelShard || 0})</div>
        <div style="font-size:0.8em; color:#8fb6d9; margin-bottom:6px;">일반 융합: 1줄 주얼 2개 + 주얼 결정 6개 → 2줄 주얼</div>
        <label style="display:block; font-size:0.78em; color:#e2c9a4; margin-bottom:4px;"><input type="checkbox" id="chk-jewel-amplified-fusion"> 증폭합성 사용 (주얼 결정 8 추가 소모, 랜덤 패널티 + 랜덤 추가옵션)</label>
        <button onclick="craftJewelFusion()" ${(game.currencies.jewelShard || 0) < 6 ? 'disabled' : ''}>선택한 주얼 융합</button>
        <div style="margin-top:8px; font-size:0.8em; color:#8fb6d9;">슬롯 증폭: 슬롯 효과 소폭 상승 (최대 10강, 실패 가능)</div>
        <div style="display:flex; gap:6px; margin-top:4px;"><button onclick="tryAmplifyJewelSlot(0)">슬롯1 증폭 (${game.jewelSlotAmplify[0] || 0}/10 · 비용 ${getJewelAmplifyCost(game.jewelSlotAmplify[0] || 0)} · 성공 ${Math.floor(getJewelAmplifySuccessChance(game.jewelSlotAmplify[0] || 0) * 100)}%)</button><button onclick="tryAmplifyJewelSlot(1)">슬롯2 증폭 (${game.jewelSlotAmplify[1] || 0}/10 · 비용 ${getJewelAmplifyCost(game.jewelSlotAmplify[1] || 0)} · 성공 ${Math.floor(getJewelAmplifySuccessChance(game.jewelSlotAmplify[1] || 0) * 100)}%)</button></div>
        <div style="margin-top:8px; color:#b4c9e2; font-size:0.8em;">공허 주얼: 저장 호환을 위해 현재 최대 2줄까지 지원</div>
        <div style="display:flex; gap:6px; margin-top:4px;"><button onclick="craftVoidJewel()" ${(game.currencies.voidChisel || 0) <= 0 || (game.jewelInventory||[]).length < 2 ? 'disabled' : ''}>공허 주얼 제작 (끌 1 + 주얼2)</button><button onclick="fuseSelectedVoidJewels()">선택 공허융합</button></div>`;
        document.getElementById('ui-jewel-slots').innerHTML = [0, 1].map(slotIdx => {
            let jewel = game.jewelSlots[slotIdx];
            let ampLv = (game.jewelSlotAmplify && game.jewelSlotAmplify[slotIdx]) || 0;
            if (!jewel) return `<div id="jewel-slot-card-${slotIdx}" class="slot-box" style="min-height:58px; cursor:default;">주얼 슬롯 ${slotIdx + 1} <span style="color:#f1c40f;">(+${ampLv})</span><br><span style="color:#7f8c8d;">비어있음</span></div>`;
            let desc = getJewelStats(jewel).map(stat => `${getStatName(stat.id)} +${stat.val}`).join(' / ');
            return `<div id="jewel-slot-card-${slotIdx}" class="slot-box" style="min-height:58px;">주얼 슬롯 ${slotIdx + 1} <span style="color:#f1c40f;">(+${ampLv})</span><br><span class="item-title ${getJewelRarityClass(jewel.rarity)}">${jewel.name}</span> (${desc})<br><button style="margin-top:4px; font-size:0.72em;" onclick="unequipJewel(${slotIdx})">해제</button></div>`;
        }).join('');
        document.getElementById('ui-jewel-inventory').innerHTML = game.jewelInventory.map((jewel, idx) => {
            let selected = (jewelFusionSelection || []).includes(idx) ? 'selected' : '';
            let desc = getJewelStats(jewel).map(stat => `${getStatName(stat.id)} +${stat.val}`).join(' / ');
            return `<div class="item-card ${selected}" style="min-height:72px;"><div class="item-title ${getJewelRarityClass(jewel.rarity)}">[${jewel.isVoid ? '공허' : getJewelRarityLabel(jewel.rarity)} 주얼] ${jewel.name}</div><div class="item-stats">${desc}</div><div class="item-actions"><button onclick="equipJewel(${idx}, 0)">슬롯1</button><button onclick="equipJewel(${idx}, 1)">슬롯2</button><button onclick="toggleJewelFusionSelection(${idx})">융합선택</button><button onclick="salvageJewel(${idx})">해체</button></div></div>`;
        }).join('') || `<div style="color:#7f8c8d;">주얼 인벤토리가 비었습니다.</div>`;
    }

    let selectedItem = getSelectedCraftItem();
    let forgeHtml = '아이템을 클릭하여 선택';
    if (selectedItem) {
        let lines = [];
        (selectedItem.baseStats || []).forEach(stat => lines.push(`<div class="tooltip-line" style="color:#95a5a6">${stat.statName} +${formatValue(stat.id, stat.val)}</div>`));
        (selectedItem.stats || []).forEach(stat => {
            let tierText = stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let honeyTag = stat.lockedByHoney ? ` <span style="color:#ffd166; font-weight:700;">[고정됨]</span>` : '';
            let stingerTag = stat.venomStingerBonus ? ` <span style="color:#9bff9e;">[독벌침]</span>` : '';
            lines.push(`<div class="tooltip-line">${stat.statName} +${formatValue(stat.id, stat.val)}${tierText}${honeyTag}${stingerTag}</div>`);
        });
        if ((selectedItem.stats || []).length === 0) lines.push(`<div class="tooltip-line" style="color:#7f8c8d">추가 옵션 없음</div>`);
        let voidSocketHtml = '';
        if (selectedItem.slot === '반지' || selectedItem.slot === '목걸이') {
            selectedItem.voidSocket = selectedItem.voidSocket || { open: false, jewel: null };
            if (!selectedItem.voidSocket.open) {
                voidSocketHtml = `<button onclick="applyVoidChiselToSelectedItem()" ${(game.currencies.voidChisel||0)<=0?'disabled':''}>🕳️ 공허 소켓 생성</button>`;
            } else if (selectedItem.voidSocket.jewel) {
                voidSocketHtml = `<div style="color:#9fd6ff;">소켓 주얼: ${selectedItem.voidSocket.jewel.name}</div><button onclick="removeJewelFromVoidSocket()" ${(game.currencies.voidChisel||0)<=0?'disabled':''}>주얼 제거(끌 1)</button>`;
            } else {
                let jewelBtns = (game.jewelInventory || []).map((j, i) => `<button onclick="insertJewelIntoVoidSocket(${i})">${j.name} 장착</button>`).join('');
                voidSocketHtml = `<div style="color:#9fd6ff;">빈 공허 소켓</div>${jewelBtns || '<div style="color:#7f8c8d;">장착 가능한 주얼 없음</div>'}`;
            }
        }
        forgeHtml = `<div class="item-title ${selectedItem.rarity}">[${selectedItem.slot.replace(/[12]/, '')}] ${selectedItem.name}</div><div class="item-base-line">${selectedItem.baseName}</div>${lines.join('')}<div style="display:flex; gap:6px; margin-top:8px;"><button onclick="applyEnchantedHoneyToSelectedItem()" ${((game.currencies.enchantedHoney||0)<=0 || (selectedItem.stats||[]).some(v=>v.lockedByHoney))?'disabled':''}>🍯 벌꿀 고정</button><button onclick="applyVenomStingerToSelectedItem()" ${((game.currencies.venomStinger||0)<=0 || selectedItem.slot!=='무기')?'disabled':''}>🦂 독벌침 부여</button></div><div style="margin-top:8px; display:grid; gap:6px;">${voidSocketHtml}</div>`;
    }
    document.getElementById('forge-item-display').innerHTML = forgeHtml;
    document.getElementById('fossil-item-display').innerHTML = forgeHtml;
    let fossilButtons = [];
    if ((game.currencies.fossil || 0) > 0) fossilButtons.push(`<button onclick="applyFossilCraft()">기본 화석 정제 (${game.currencies.fossil || 0})</button>`);
    FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).forEach(fossil => {
        fossilButtons.push(`<button onclick="applyFossilChaosCraft('${fossil.key}')" ${!selectedItem ? 'disabled' : ''}>${fossil.name} 사용 (${game.currencies[fossil.key] || 0})</button>`);
    });
    document.getElementById('ui-fossil-actions').innerHTML = fossilButtons.join('') || `<div style="color:#7f8c8d;">보유한 화석이 없습니다.</div>`;
    document.getElementById('ui-fossil-info').innerHTML = `<div style="margin-bottom:6px; color:#f1c67d;">원하는 옵션 1개가 확정인 카오스 재련</div>${FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).map(fossil => `<div style="margin-bottom:6px;"><strong>${fossil.name}</strong> - ${fossil.desc}</div>`).join('') || `<div style="color:#7f8c8d;">보유 중인 타입 화석이 없습니다.</div>`}<div style="margin-top:8px; color:#8fb6d9;">미궁 완료 시 기본 화석 + 타입 화석이 드랍되며, 심연 화석은 희귀하게 추가 드랍됩니다.</div>`;

    let hiddenCurrencyKeys = new Set(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'bossCore', 'skyEssence', 'fossil', 'fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic', 'fossilAbyssal', 'sealShard', 'strongSealShard', 'jewelCore', 'jewelShard']);
    document.getElementById('ui-currency-grid').innerHTML = Object.keys(ORB_DB).filter(key => {
        if (hiddenCurrencyKeys.has(key)) return false;
        if (key === 'tainted') return (game.season || 1) >= 5 && (game.currencies[key] || 0) > 0;
        return true;
    }).map(key => `
        <div class="currency-card">
            <div class="currency-name">${ORB_DB[key].name}</div>
            <div class="currency-desc">${ORB_DB[key].desc}</div>
            <div class="currency-count">보유: <strong>${game.currencies[key] || 0}</strong></div>
        </div>
    `).join('');

    Object.keys(ORB_DB).forEach(key => {
        let btn = document.getElementById('btn-orb-' + key);
        if (btn) btn.disabled = !selectedItem || (game.currencies[key] || 0) <= 0;
    });
    let taintedBtn = document.getElementById('btn-orb-tainted');
    if (taintedBtn) taintedBtn.style.display = ((game.season || 1) >= 5 && (game.currencies.tainted || 0) > 0) ? 'block' : 'none';
    let fossilTabBtn = document.getElementById('btn-item-tab-fossil');
    if (fossilTabBtn) fossilTabBtn.style.display = (game.season || 1) >= 3 ? 'block' : 'none';
    let marketTabBtn = document.getElementById('btn-item-tab-market');
    if (marketTabBtn) marketTabBtn.style.display = isMarketUnlocked() ? 'block' : 'none';
    if (!isMarketUnlocked() && game.itemSubtab === 'item-tab-market') switchItemSubtab('item-tab-equip');
    renderMarketUI();

    let legacyMapOverview = document.querySelector('#tab-map .map-overview-card');
    if (legacyMapOverview) legacyMapOverview.remove();
    document.querySelectorAll('#tab-map img').forEach(node => node.remove());

    let seasonMapCap = getCurrentSeasonFinalZoneId();
    let mapListHtml = MAP_ZONES.filter((zone, idx) => idx <= Math.min(game.maxZoneId, seasonMapCap)).map((zone, idx) => {
        let current = idx === game.currentZoneId ? 'current' : '';
        let unlockReveal = idx === pendingMapRevealZoneId ? 'map-unlock-reveal' : '';
        let icon = zone.ele === 'fire' ? '🔥' : (zone.ele === 'cold' ? '❄️' : (zone.ele === 'light' ? '⚡' : (zone.ele === 'chaos' ? '☠️' : '🩸')));
        let rewardReady = (game.claimableActRewards || []).includes(idx);
        let rewardClaimed = (game.claimedActRewards || []).includes(idx);
        let isActRewardZone = zone.type === 'act' && idx <= 9;
        let cleared = idx < game.maxZoneId || rewardReady || rewardClaimed;
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
    if (seasonBossRepeatWrap) seasonBossRepeatWrap.style.display = seasonBosses.length > 0 ? 'block' : 'none';
    if (seasonBossRepeatBtn) {
        seasonBossRepeatBtn.innerText = `반복 도전 ${game.autoRepeatSeasonBoss ? 'ON' : 'OFF'}`;
        seasonBossRepeatBtn.style.background = game.autoRepeatSeasonBoss ? '#2f6a42' : '#5b4a2f';
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
    document.getElementById('ui-labyrinth-list').innerHTML = labyrinthOpen ? `<div class="map-item ${game.currentZoneId === LABYRINTH_ZONE_ID ? 'current' : ''}" onclick="changeZone('${LABYRINTH_ZONE_ID}')">
        <div class="map-item-main"><span>🏛️</span><span>고대 미궁 ${game.labyrinthFloor || 1}층</span></div>
        <div class="map-item-actions"><span class="map-zone-status">미궁 화석: ${game.currencies.fossil || 0}</span></div>
    </div>` : '';

    let meteorUnlocked = !!(game.starWedge && game.starWedge.unlocked);
    let meteorReady = !!(game.starWedge && game.starWedge.skyRiftReady);
    let meteorGauge = Math.floor((game.starWedge && game.starWedge.skyRiftGauge) || 0);
    document.getElementById('ui-meteor-header').style.display = meteorUnlocked ? 'block' : 'none';
    document.getElementById('ui-meteor-list').innerHTML = meteorUnlocked ? `<div class="map-item ${game.currentZoneId === METEOR_FALL_ZONE_ID ? 'current' : ''}" ${meteorReady ? `onclick="changeZone('${METEOR_FALL_ZONE_ID}')"` : ''}>
        <div class="map-item-main"><span>☄️</span><span>운석 낙하 지점<br><span class="map-zone-status">하늘의 균열 ${meteorGauge}% ${meteorReady ? '· 입장 가능' : '· 충전 중'}</span></span></div>
        <div class="map-item-actions"><span class="map-zone-status">난이도: 혼돈 ${Math.max(1, Math.floor((game.starWedge && game.starWedge.skyRiftMinTier) || 1))}</span></div>
    </div>` : '';

    let availTrials = TRIAL_ZONES.filter(trial => (trial.reqZone !== -1 && game.maxZoneId >= trial.reqZone) || game.unlockedTrials.includes(trial.id));
    document.getElementById('ui-trials-header').style.display = availTrials.length > 0 ? 'block' : 'none';

    renderLoop8BeehivePanel();
    renderLoop9VoidRiftPanel();
    document.getElementById('ui-trial-list').innerHTML = availTrials.map(trial => {
        let isCurrent = game.currentZoneId === trial.id;
        let isCompleted = game.completedTrials.includes(trial.id);
        let cls = isCurrent ? 'current' : 'trial';
        if (isCompleted) cls = '';
        return `<div class="map-item ${cls}" ${isCompleted ? '' : `onclick="changeZone('${trial.id}')"`}><span>${trial.name} ${isCompleted ? '(완료)' : ''}</span><span style="font-size:0.8em; font-weight:normal;">${isCompleted ? '✔️' : '도전하기'}</span></div>`;
    }).join('');

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
                game.loop10BonusStats = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
                game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
                let depthButtons = game.abyssUnlockedDepths.slice().sort((a,b)=>b-a).slice(0, 12).map(depth => `<button onclick="enterUnlockedEndlessDepth(${depth})">심화 ${depth}층</button>`).join('');
                loop10Panel.innerHTML = `<div style="color:#d5c5ff; margin-bottom:6px;">루프10 강화 스탯 (투자할수록 비용 증가) · 포인트: <strong>${game.seasonPoints || 0}</strong></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    ${['flatHp','flatDmg','aspd','move'].map(key => `<button onclick="allocateLoop10BonusStat('${key}')">${getStatName(key)} Lv.${game.loop10BonusStats[key] || 0} (+ 비용 ${getLoop10StatCost(key)})</button>`).join('')}
                </div>
                <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;"><button onclick="game.loop10ChaosStayEnabled=!game.loop10ChaosStayEnabled; updateStaticUI();">혼돈 잔류 모드: ${game.loop10ChaosStayEnabled ? 'ON' : 'OFF'}</button><button onclick="enterNextEndlessChaosDepth()" ${game.loop10ChaosStayEnabled ? '' : 'disabled'}>심화 +1층 (${Math.floor(game.abyssEndlessDepth || 20)})</button></div>
                <div style="margin-top:8px; color:#9fb3d9;">기록된 층수로 재진입</div><div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:6px; margin-top:6px;">${depthButtons || '<span style="color:#7f8c8d;">기록 없음</span>'}</div>`;
            }
        }
    } else {
        document.getElementById('ui-abyss-passive-summary').innerHTML = `<span style="color:#7f8c8d;">혼돈(지도 ${ABYSS_START_ZONE_ID}번 이후)부터 개방됩니다.</span>`;
        document.getElementById('ui-abyss-passive-grid').innerHTML = '';
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
        let active = game.seasonNodes.includes(id);
        let reqMet = isSeasonNodeRequirementMet(node);
        let lockedHint = !!node.req && !reqMet ? `<br><span style="color:#d39ca7;">🔒 연결된 이전 노드를 먼저 활성화하세요</span>` : '';
        let statInfo = P_STATS[node.stat] || {};
        let suffix = statInfo.isPct ? '%' : '';
        let effectText = `${statInfo.name || node.stat} +${formatValue(node.stat, node.val)}${suffix}`;
        return `<div class="trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}" ${active || !reqMet ? '' : `onclick="buySeason('${id}')"`}><div class="trait-title">${node.name}</div><div class="trait-desc">${node.desc}<br><span style="color:#9bb9d4;">${effectText}</span></div></div>`;
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
            return `<div class="trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}" ${active || !reqMet ? '' : `onclick="buyAscend('${id}')"`}><div class="trait-title">${title}</div><div class="trait-desc">${desc}</div></div>`;
        };
        let coreRow = (tree.n11 || tree.n12) ? `<div class="trait-row">${renderAscend('n11')}${renderAscend('n12')}</div>` : '';
        document.getElementById('ui-ascend-tree-container').innerHTML = `<div class="trait-row">${renderAscend('n1')}</div><div class="trait-row">${renderAscend('n2')}${renderAscend('n3')}</div><div class="trait-row">${renderAscend('n4')}${renderAscend('n5')}${renderAscend('n6')}</div><div class="trait-row">${renderAscend('n7')}${renderAscend('n8')}${renderAscend('n9')}</div><div class="trait-row">${renderAscend('n10')}</div>${coreRow}`;
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
    document.getElementById('ui-skills-list').innerHTML = game.skills.filter(name => {
        if (!foldAttackInactive) return true;
        return name === game.activeSkill;
    }).map(name => {
        let active = name === game.activeSkill ? 'active' : '';
        let badge = '';
        let gemInfo = getGemPresentation(name, false);
        if (SKILL_DB[name].isGem) badge = `<span class="gem-level-badge ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${gemInfo.totalLevel}</span>`;
        return `<div class="skill-gem ${active}" onclick="changeSkill('${name}')" onmouseenter="showGemTooltip(event,'active','${name}')" onmouseleave="hideInfoTooltip()"><strong>${escapeHTML(name)}</strong>${badge}</div>`;
    }).join('');

    document.getElementById('ui-supp-count').innerText = game.equippedSupports.length;
    document.getElementById('ui-supp-max').innerText = pStats.suppCap;
    document.getElementById('ui-support-list').innerHTML = game.supports.filter(name => {
        if (!foldSupportInactive) return true;
        return game.equippedSupports.includes(name);
    }).map(name => {
        let active = game.equippedSupports.includes(name) ? 'active' : '';
        let gemInfo = getGemPresentation(name, true);
        return `<div class="skill-gem support-gem ${active}" onclick="toggleSupport('${name}')" onmouseenter="showGemTooltip(event,'support','${name}')" onmouseleave="hideInfoTooltip()"><strong>${escapeHTML(name)}</strong><span class="gem-level-badge ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${gemInfo.totalLevel}</span></div>`;
    }).join('');

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
            let skyNeed = activeGem ? ((activeGem.skyCoreLevel || 0) + 1) : 1;
            let engraveCap = activeGem ? (activeGem.skyEnhanceCap || 1) : 1;
            let capNeed = activeGem ? (engraveCap + 1) : 2;
            let coreDone = !!(activeGem && activeGem.bossCoreLevel >= 5 && activeGem.skyCoreLevel >= 5);
            let slotDone = !!(activeGem && engraveCap >= 5);
            let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
            document.getElementById('ui-gem-enhance-target').innerHTML = isGem
                ? `대상 젬: <strong>${active}</strong> (보유 창공의 힘: ${game.currencies.skyEssence || 0})<br><span style="color:#8aa4bf;">핵 강화: 군주의핵 ${activeGem.bossCoreLevel || 0}/5 · 창공의힘 ${activeGem.skyCoreLevel || 0}/5 · 각인 슬롯 ${engraveCap}/5</span><div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? '핵 강화 완료' : '핵 강화 진행중'}</span><span class="gem-status-chip ${slotDone ? 'done' : ''}">${slotDone ? '각인 슬롯 완료' : '각인 슬롯 확장 가능'}</span><span class="gem-status-chip ${engraveFilled ? 'done' : ''}">${engraveFilled ? '각인 장착 완료' : `각인 여유 ${Math.max(0, engraveCap - activeEnh.length)}칸`}</span></div><span style="color:#8aa4bf;">적용 옵션: ${activeEnh.map(id => GEM_SKY_ENHANCEMENTS[id] ? GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '없음'}</span>`
                : '공격 젬을 선택하면 창공의 힘으로 특수 옵션을 부여할 수 있습니다.';
            let upgradeBtns = [];
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.bossCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('bossCore', 1)" ${!isGem || (activeGem && activeGem.bossCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.bossCoreLevel >= 5 ? '✅ 군주의 핵 강화 완료' : '군주의 핵 강화'}</strong><br><small>보유: ${game.currencies.bossCore || 0} / 필요: ${bossNeed}${activeGem && activeGem.bossCoreLevel >= 5 ? ' (최대)' : ''}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.skyCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('skyEssence', 1)" ${!isGem || (activeGem && activeGem.skyCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.skyCoreLevel >= 5 ? '✅ 창공의 힘 강화 완료' : '창공의 힘 강화'}</strong><br><small>보유: ${game.currencies.skyEssence || 0} / 필요: ${skyNeed}${activeGem && activeGem.skyCoreLevel >= 5 ? ' (최대)' : ''}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && engraveCap >= 5 ? 'done' : ''}" onclick="upgradeSkyEngraveCap()" ${!isGem || (activeGem && engraveCap >= 5) ? 'disabled' : ''}><strong>${activeGem && engraveCap >= 5 ? '✅ 각인 슬롯 확장 완료' : '창공 각인 슬롯 확장'}</strong><br><small>보유: ${game.currencies.skyEssence || 0} / 필요: ${capNeed}${activeGem && engraveCap >= 5 ? ' (최대)' : ''}</small></button>`);
            document.getElementById('ui-gem-upgrade-actions').innerHTML = upgradeBtns.join('') || `<div style="grid-column:1/-1; color:#7f8c8d;">보유한 젬 강화 재료가 없습니다.</div>`;
            if ((game.season || 1) >= 4) {
                document.getElementById('ui-gem-enhance-options').innerHTML = Object.values(GEM_SKY_ENHANCEMENTS).map(enh => {
                    let applied = activeEnh.includes(enh.id);
                    return `<button class="gem-engrave-option ${applied ? 'applied' : ''}" onclick="${applied ? `removeSkyGemEnhancementFromActive('${enh.id}')` : `applySkyGemEnhancementToActive('${enh.id}')`}" ${!isGem ? 'disabled' : ''}><strong>${applied ? '✅ ' : ''}${enh.name}${applied ? ' (적용중)' : ''}</strong><br><small>${enh.desc}${applied ? ' · 클릭 시 해제' : ''}</small></button>`;
                }).join('');
            } else {
                document.getElementById('ui-gem-enhance-options').innerHTML = `<div style="grid-column:1/-1; color:#7f8c8d;">창공의 힘 특수 옵션은 시즌 4부터 해금됩니다.</div>`;
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
    document.getElementById('ui-talisman-currency').innerHTML = `${renderSealShardBadge('sealShard')} <strong>${game.currencies.sealShard || 0}</strong> &nbsp; ${renderSealShardBadge('strongSealShard')} <strong>${game.currencies.strongSealShard || 0}</strong>`;
    let unseal = game.talismanUnseal;
    if (!unseal) {
        document.getElementById('ui-talisman-unseal').innerHTML = `<div style="margin-bottom:8px; color:#9fc4ea;">봉인편린을 해제해 부적 후보를 확인하세요.</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="startTalismanUnseal('sealShard')" ${(game.currencies.sealShard || 0) <= 0 ? 'disabled' : ''}>봉인편린 해제</button>
                <button onclick="startTalismanUnseal('strongSealShard')" ${(game.currencies.strongSealShard || 0) <= 0 ? 'disabled' : ''}>[강력한 기운] 봉인편린 해제</button>
                <button onclick="expandTalismanBoard()" ${talismanUnlockCost <= 0 ? 'disabled' : ''}>칸 해금 안내 (${talismanUnlockCost > 0 ? talismanUnlockCost : '완료'})</button>
            </div>`;
    } else {
        let shapeStyle = getTalismanShapeStyle(unseal.current.shape);
        document.getElementById('ui-talisman-unseal').innerHTML = `<div style="margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">${renderTalismanMiniShape(unseal.current.shape, { cellSize: 8, gap: 1 })}<span>후보: <strong style="color:${shapeStyle.color};">[${unseal.current.shape}] ${unseal.current.statName} +${unseal.current.value}</strong> <span style="color:#9cb5d0;">(${unseal.current.rarity})</span></span>${renderSealShardBadge(unseal.source)}</div>
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
        return `<div class="item-card ${selected ? 'selected' : ''}" style="min-height:72px;" onclick="selectTalismanInventoryItem(${t.id})"><div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;"><div style="display:flex; align-items:center; gap:7px;">${renderTalismanMiniShape(t.shape)}<div><div class="item-title ${selected ? 'rare' : 'magic'}" style="color:${shapeStyle.color};">[${t.shape}] ${t.statName} +${t.value}</div><div class="item-base-line">${t.rarity} ${renderSealShardBadge(t.source || 'sealShard')}</div></div></div><div style="display:flex; gap:4px;"><button onclick="event.stopPropagation(); rotateTalismanInInventory(${t.id})" style="padding:4px 8px; min-height:30px;">회전</button><button onclick="event.stopPropagation(); destroyTalismanFromInventory(${t.id})" style="background:#6e3f3f; border-color:#8f5959; padding:4px 8px; min-height:30px;">파괴</button></div></div></div>`;
    }).join('') || `<div style="grid-column:1/-1; color:#7f8c8d;">보유한 부적이 없습니다.</div>`;
    document.getElementById('ui-talisman-board').innerHTML = Array.from({ length: TALISMAN_BOARD_W * TALISMAN_BOARD_H }, (_, i) => {
        let x = i % TALISMAN_BOARD_W;
        let y = Math.floor(i / TALISMAN_BOARD_W);
        let unlocked = isTalismanCellUnlocked(x, y);
        let id = game.talismanBoard[i];
        let placed = id ? (game.talismanPlacements && game.talismanPlacements[id] ? game.talismanPlacements[id].talisman : null) : null;
        let shape = placed ? placed.shape : null;
        let shapeStyle = shape ? getTalismanShapeStyle(shape) : null;
        let valid = isTalismanBoardCellValid(x,y); let cellColor = !valid ? '#0f1116' : (!unlocked ? '#1a1a1f' : (id ? (shapeStyle ? shapeStyle.glow : '#355d46') : '#1d2531'));
        let label = !unlocked ? '🔒' : (id ? (shapeStyle ? shapeStyle.symbol : '●') : '');
        let border = !unlocked ? '#3b4f63' : (id && shapeStyle ? shapeStyle.color : '#3b4f63');
        let textColor = !unlocked ? '#8b95a1' : (id && shapeStyle ? shapeStyle.color : '#d5e8ff');
        let unlockedSet = getTalismanUnlockedCellsSet();
        let extraUnlocked = Math.max(0, unlockedSet.size - 9);
        let unlockCost = getTalismanExpandCost(extraUnlocked);
        let lockTitle = unlocked ? '' : ` title="해금 비용: 봉인편린 ${unlockCost}"`;
        return `<button onclick="onTalismanBoardCellClick(${x},${y})"${lockTitle} style="width:42px; height:42px; border:1px solid ${border}; background:${cellColor}; color:${textColor}; border-radius:6px; font-weight:bold;">${label}</button>`;
    }).join('');
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

    function hideCanvasTooltip() {
        if (!canvasTooltip) return;
        canvasTooltip.style.display = 'none';
        clearActiveTooltip('canvas-tooltip');
    }

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
        (candidates.length > 0 ? candidates : passiveRenderCache.nodes).forEach(node => {
            if (getPassiveVisibility(node.id) === 'hidden') return;
            let radius = getPassiveNodeVisualRadius(node) + 8;
            let distance = Math.hypot(node.x - worldX, node.y - worldY);
            if (distance > radius) return;
            if (!found || distance < foundDistance) {
                found = node;
                foundDistance = distance;
                return;
            }
            if (selectingStarWedge && node.socketType === 'star_wedge' && found && found.socketType !== 'star_wedge' && distance <= (foundDistance + 3)) {
                found = node;
                foundDistance = distance;
            }
        });
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
            let hasSocket = (starState.sockets || []).find(entry => entry.nodeId === node.id);
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
        if (dragDist >= 10) pendingTouchPassiveId = null;
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
            if (hoverNode.socketType === 'star_wedge') {
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
    function normalizeDeathLog(log) {
        if (!log || typeof log !== 'object') return null;
        let primaryElement = normalizeDamageElementKey(log.primaryElement);
        let damageSummary = Array.isArray(log.damageSummary) ? log.damageSummary.map(entry => {
            if (!entry || typeof entry !== 'object') return null;
            let ele = normalizeDamageElementKey(entry.ele);
            let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
            return { ele: ele, value: value };
        }).filter(Boolean) : [];
        let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
        damageSummary.forEach(entry => {
            totals[entry.ele] = Math.max(0, Math.floor(entry.value || 0));
        });
        damageSummary = Object.keys(totals)
            .map(ele => ({ ele: ele, value: totals[ele] }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);
        return {
            primaryElement: primaryElement,
            reasonText: typeof log.reasonText === 'string' && log.reasonText.trim() ? log.reasonText : (DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys),
            expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
            damageSummary: damageSummary,
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
    merged.passives = Array.from(new Set((merged.passives || []).map(normalizePassiveNodeId).filter(Boolean)));
    merged.discoveredPassives = Array.from(new Set((merged.discoveredPassives || []).map(normalizePassiveNodeId).filter(Boolean)));
    if (merged.passiveLayoutVersion !== PASSIVE_LAYOUT_VERSION) {
        merged.discoveredPassives = Array.from(new Set(['n0'].concat(merged.passives || [])));
        merged.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION;
    }
    merged.claimableActRewards = (merged.claimableActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.claimedActRewards = (merged.claimedActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.actRewardBonuses = (merged.actRewardBonuses || []).filter(entry => entry && entry.stat);
    merged.seasonChaseUniqueDropped = !!merged.seasonChaseUniqueDropped;
    merged.skills = Array.isArray(merged.skills) ? merged.skills.filter(name => !!SKILL_DB[name]) : [];
    if (!merged.skills.includes('기본 공격')) merged.skills.unshift('기본 공격');
    merged.supports = Array.isArray(merged.supports) ? merged.supports.filter(name => !!SUPPORT_GEM_DB[name]) : [];
    merged.equippedSupports = Array.isArray(merged.equippedSupports) ? merged.equippedSupports.filter(name => merged.supports.includes(name)) : [];
    merged.seasonNodes = Array.isArray(merged.seasonNodes) ? merged.seasonNodes.filter(id => !!SEASON_NODES[id]) : [];
    merged.unlockedSeasonContents = Array.isArray(merged.unlockedSeasonContents) ? merged.unlockedSeasonContents.filter(id => typeof id === 'string') : ['season_1'];
    merged.seenSeasonContentNotices = Array.isArray(merged.seenSeasonContentNotices) ? merged.seenSeasonContentNotices.filter(id => typeof id === 'string') : ['season_1'];
    merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.labyrinthFloor, 1, 1)));
    function normalizeJewelRecord(jewel) {
        if (!jewel || typeof jewel !== 'object') return null;
        let stats = Array.isArray(jewel.stats) ? jewel.stats.filter(stat => stat && stat.id) : [];
        if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = [jewel.stat];
        if (stats.length === 0) return null;
        return { ...jewel, rarity: ['normal', 'magic', 'rare'].includes(jewel.rarity) ? jewel.rarity : 'normal', stats: stats.slice(0, 2) };
    }
    merged.jewelInventory = Array.isArray(merged.jewelInventory) ? merged.jewelInventory.map(normalizeJewelRecord).filter(Boolean) : [];
    let jewelInventoryCap = JEWEL_INVENTORY_LIMIT + (Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0))) * 5);
    merged.jewelInventory = merged.jewelInventory.slice(0, jewelInventoryCap);
    merged.jewelSlots = Array.isArray(merged.jewelSlots) ? merged.jewelSlots.slice(0, 2).map(normalizeJewelRecord) : [null, null];
    while (merged.jewelSlots.length < 2) merged.jewelSlots.push(null);
    merged.jewelSlotAmplify = Array.isArray(merged.jewelSlotAmplify) ? merged.jewelSlotAmplify.slice(0, 2).map(v => Math.max(0, Math.min(10, Math.floor(v || 0)))) : [0, 0];
    while (merged.jewelSlotAmplify.length < 2) merged.jewelSlotAmplify.push(0);
    merged.skyGemEnhancements = (merged.skyGemEnhancements && typeof merged.skyGemEnhancements === 'object') ? merged.skyGemEnhancements : {};
    Object.keys(merged.skyGemEnhancements).forEach(skill => {
        let arr = Array.isArray(merged.skyGemEnhancements[skill]) ? merged.skyGemEnhancements[skill] : [];
        merged.skyGemEnhancements[skill] = Array.from(new Set(arr.filter(id => !!GEM_SKY_ENHANCEMENTS[id]))).slice(0, 5);
    });
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter(id => typeof id === 'string') : [];
    merged.starWedge = (merged.starWedge && typeof merged.starWedge === 'object') ? merged.starWedge : {};
    merged.starWedge.unlocked = !!merged.starWedge.unlocked;
    merged.starWedge.unlockNoticeSeen = !!merged.starWedge.unlockNoticeSeen;
    merged.starWedge.skyRiftGauge = clampFiniteNumber(merged.starWedge.skyRiftGauge, 0, 0, 100);
    merged.starWedge.skyRiftReady = !!merged.starWedge.skyRiftReady;
    merged.starWedge.skyRiftMinTier = Number.isFinite(merged.starWedge.skyRiftMinTier) ? Math.max(1, Math.floor(merged.starWedge.skyRiftMinTier)) : null;
    merged.starWedge.activeMeteorTier = Number.isFinite(merged.starWedge.activeMeteorTier) ? Math.max(1, Math.floor(merged.starWedge.activeMeteorTier)) : null;
    merged.starWedge.entriesCleared = Math.max(0, Math.floor(clampFiniteNumber(merged.starWedge.entriesCleared, 0, 0)));
    merged.starWedge.firstClearDone = !!merged.starWedge.firstClearDone;
    merged.starWedge.selectedWedgeId = Number.isFinite(merged.starWedge.selectedWedgeId) ? merged.starWedge.selectedWedgeId : null;
    merged.starWedge.wedges = Array.isArray(merged.starWedge.wedges) ? merged.starWedge.wedges.filter(w => w && Number.isFinite(w.id) && Array.isArray(w.lines)).slice(0, 60) : [];
    merged.starWedge.sockets = Array.isArray(merged.starWedge.sockets) ? merged.starWedge.sockets.filter(s => s && typeof s.nodeId === 'string' && Number.isFinite(s.wedgeId)).slice(0, MAX_STAR_WEDGES) : [];
    merged.starWedge.nodeMutations = (merged.starWedge.nodeMutations && typeof merged.starWedge.nodeMutations === 'object') ? merged.starWedge.nodeMutations : {};
    merged.completedTrials = Array.isArray(merged.completedTrials) ? merged.completedTrials.filter(id => typeof id === 'string') : [];
    merged.unlockedTrials = Array.isArray(merged.unlockedTrials) ? merged.unlockedTrials.filter(id => typeof id === 'string') : [];
    merged.itemSubtab = ['item-tab-equip', 'item-tab-craft', 'item-tab-fossil', 'item-tab-market'].includes(merged.itemSubtab) ? merged.itemSubtab : 'item-tab-equip';
    merged.skillSubtab = (merged.skillSubtab === 'skill-tab-enhance') ? 'skill-tab-enhance' : 'skill-tab-equip';
    merged.mapSubtab = ['map-tab-zones', 'map-tab-abyss'].includes(merged.mapSubtab) ? merged.mapSubtab : 'map-tab-zones';
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
                if (x < 3 && y < 3) continue;
                merged.talismanUnlockedCells.push(y * 5 + x);
            }
        }
    }
    merged.talismanUnlockPickMode = !!merged.talismanUnlockPickMode;
    merged.talismanInventory = Array.isArray(merged.talismanInventory) ? merged.talismanInventory.filter(t => t && t.id && t.stat && t.shape) : [];
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
    merged.combatHalted = false;
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
    merged.settings.mapCompleteAction = ['nextZone', 'repeatZone', 'stop'].includes(merged.settings.mapCompleteAction) ? merged.settings.mapCompleteAction : 'nextZone';
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
    merged.playerAilments = Array.isArray(merged.playerAilments) ? merged.playerAilments.map(row => ({ type: row.type, time: Math.max(0, clampFiniteNumber(row.time, 0, 0, 30)) })).filter(row => row.type) : [];
    merged.recentDamageEvents = Array.isArray(merged.recentDamageEvents) ? merged.recentDamageEvents.map(normalizeRecentDamageEvent).filter(Boolean) : [];
    merged.lastDeathLog = normalizeDeathLog(merged.lastDeathLog);
    merged.enemies = Array.isArray(merged.enemies) ? merged.enemies.map(normalizeEnemyRecord).filter(Boolean) : [];
    merged.encounterPlan = Array.isArray(merged.encounterPlan) ? merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
    merged.level = Math.max(1, Math.floor(clampFiniteNumber(merged.level, defaultGame.level, 1, MAX_PLAYER_LEVEL)));
    merged.exp = Math.max(0, Math.floor(clampFiniteNumber(merged.exp, defaultGame.exp, 0)));
    merged.season = Math.max(1, Math.floor(clampFiniteNumber(merged.season, defaultGame.season, 1)));
    merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.loopCount, defaultGame.loopCount, 0)));
    merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanDefeatAttempts, defaultGame.woodsmanDefeatAttempts, 0)));
    merged.woodsmanSimulatorSeenLoop = !!merged.woodsmanSimulatorSeenLoop;
    merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(merged.killsInZone, defaultGame.killsInZone, 0)));
    merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.passivePoints, defaultGame.passivePoints, 0)));
    merged.inventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.inventoryExpandLevel, defaultGame.inventoryExpandLevel, 0)));
    merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0)));
    merged.settings = { ...defaultGame.settings, ...(merged.settings || {}) };
    merged.settings.notiFilters = { ...(defaultGame.settings.notiFilters || {}), ...(merged.settings.notiFilters || {}) };
    merged.playerHp = Math.max(1, Math.floor(clampFiniteNumber(merged.playerHp, defaultGame.playerHp, 1)));
    merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(merged.playerEnergyShield, defaultGame.playerEnergyShield, 0))); 
    merged.moveTimer = clampFiniteNumber(merged.moveTimer, defaultGame.moveTimer, 0);
    merged.moveTotalTime = clampFiniteNumber(merged.moveTotalTime, defaultGame.moveTotalTime, 0);
    merged.runProgress = clampFiniteNumber(merged.runProgress, defaultGame.runProgress, 0, 100);
    merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(merged.encounterIndex, defaultGame.encounterIndex, 0)));
    merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(merged.nextEnemyId, defaultGame.nextEnemyId, 1)));
    merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.seasonPoints, defaultGame.seasonPoints, 0)));
    merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendPoints, defaultGame.ascendPoints, 0)));
    merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, defaultGame.ascendRank, 0, 4)));
    merged.activeSkill = SKILL_DB[merged.activeSkill] ? merged.activeSkill : (merged.skills[0] || '기본 공격');
    if (typeof merged.currentZoneId === 'string' && /^\d+$/.test(merged.currentZoneId)) merged.currentZoneId = parseInt(merged.currentZoneId, 10);
    if (typeof merged.maxZoneId === 'string' && /^\d+$/.test(merged.maxZoneId)) merged.maxZoneId = parseInt(merged.maxZoneId, 10);
    if (typeof merged.currentZoneId !== 'string') merged.currentZoneId = clampNumber(Number.isFinite(merged.currentZoneId) ? merged.currentZoneId : 0, 0, MAP_ZONES.length - 1);
    if (typeof merged.maxZoneId !== 'string') merged.maxZoneId = clampNumber(Number.isFinite(merged.maxZoneId) ? merged.maxZoneId : 0, 0, MAP_ZONES.length - 1);
    if (typeof merged.currentZoneId === 'string' && !merged.currentZoneId.startsWith('trial_') && !merged.currentZoneId.includes('_boss_') && merged.currentZoneId !== LABYRINTH_ZONE_ID && merged.currentZoneId !== METEOR_FALL_ZONE_ID) merged.currentZoneId = 0;
    if (typeof merged.currentZoneId === 'string' && !getZone(merged.currentZoneId)) merged.currentZoneId = 0;
    if (typeof merged.maxZoneId !== 'string' && merged.currentZoneId > merged.maxZoneId) merged.currentZoneId = merged.maxZoneId;
    if (merged.discoveredPassives.length === 0) merged.discoveredPassives = ['n0'];
    let seasonCap = getSeasonFinalZoneId(merged.season || 1);
    if (typeof merged.maxZoneId !== 'string') merged.maxZoneId = clampNumber(merged.maxZoneId, 0, seasonCap);
    if (typeof merged.currentZoneId !== 'string') merged.currentZoneId = clampNumber(merged.currentZoneId, 0, seasonCap);
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
    let continueBtn = document.getElementById('btn-startup-continue');
    let switchBtn = document.getElementById('btn-startup-switch-account');
    let guestBtn = document.getElementById('btn-startup-guest');
    let backBtn = document.getElementById('btn-startup-back');
    let loginBtn = document.getElementById('btn-startup-login');
    let signupBtn = document.getElementById('btn-startup-signup');
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
        if (continueBtn) continueBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'none';
        if (loginBtn) loginBtn.disabled = true;
        if (signupBtn) signupBtn.disabled = true;
        if (guestBtn) guestBtn.disabled = false;
        return;
    }

    if (cloudState.user) {
        if (authFormEl) authFormEl.classList.add('hidden');
        if (authActionsEl) authActionsEl.style.display = 'none';
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
    if (continueBtn) continueBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (loginBtn) loginBtn.disabled = cloudState.busy;
    if (signupBtn) signupBtn.disabled = cloudState.busy;
    if (guestBtn) guestBtn.disabled = cloudState.busy;
}

function getCloudConfig() {
    let raw = window.CLOUD_SAVE_CONFIG || {};
    let supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
    let supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
    let enabled = raw.enabled !== false && !!supabaseUrl && !!supabaseAnonKey;
    return { enabled, supabaseUrl, supabaseAnonKey };
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
    cloudState.session = {
        access_token: session.access_token,
        refresh_token: session.refresh_token || (cloudState.session && cloudState.session.refresh_token) || '',
        expires_at: session.expires_at || 0,
        token_type: session.token_type || 'bearer',
        user: session.user || cloudState.user || null
    };
    cloudState.user = cloudState.session.user;
    cloudState.isLoaded = false;
    persistCloudSession(cloudState.session);
    updateCloudSaveUI();
}

async function cloudJsonRequest(path, options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) throw new Error('cloud-save-config.js 설정이 비어 있습니다.');
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
        renderBattlefield();
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
            title: '세이브 시각을 비교하는 중...',
            detail: '로컬 저장과 원격 저장 가운데 더 최신인 진행도를 찾고 있습니다.',
            caption: 'Comparing Timelines',
            progress: 48
        });
        await reconcileCloudSaveState();
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
    applyCloudSession(null);
    cloudState.lastRemoteUpdatedAt = 0;
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
        applyCloudSession(null);
        cloudState.lastRemoteUpdatedAt = 0;
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
    if (userEl) userEl.innerText = cloudState.user && cloudState.user.email ? cloudState.user.email : (config.enabled ? '로그인 안 됨' : '설정 필요');
    if (localEl) localEl.innerText = formatCloudTime(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0);
    if (remoteEl) remoteEl.innerText = formatCloudTime(cloudState.lastRemoteUpdatedAt || (game && game.saveMeta ? game.saveMeta.lastCloudSyncAt : 0));
    if (msgEl) msgEl.innerText = cloudState.lastMessage || '대기 중';
    updateStartupScreenUI();
}

function applyExternalSave(snapshot, sourceStamp) {
    game = mergeDefaults(snapshot || {});
    applySeasonContentProgression({ silent: true });
    ensureSaveMeta();
    if (sourceStamp) {
        cloudState.lastRemoteUpdatedAt = sourceStamp;
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
        renderBattlefield();
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
    cloudState.session = stored;
    cloudState.user = stored.user || null;
    if (stored.refresh_token) {
        try {
            let refreshed = await cloudJsonRequest('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST',
                useAuth: false,
                body: { refresh_token: stored.refresh_token }
            });
            applyCloudSession(refreshed);
            return true;
        } catch (refreshError) {
            console.warn('cloud session refresh failed:', refreshError);
        }
    }
    let user = await fetchCloudUser();
    applyCloudSession({ ...stored, user });
    return true;
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
        if (record && record.updated_at) cloudState.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
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

async function guardAgainstStaleLocalOverwrite(options = {}) {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) return { record, status: 'no-remote' };
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    cloudState.lastRemoteUpdatedAt = remoteStamp;
    if (remoteStamp > localStamp + CLOUD_REMOTE_TIME_SKEW_MS) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage(options.automatic ? '클라우드 저장이 더 최신이라 로컬에 먼저 반영했습니다.' : '클라우드 저장이 더 최신이라 덮어쓰기를 막고 자동으로 불러왔습니다.');
        if (!options.silentLog) addLog('클라우드가 더 최신이라 자동으로 불러왔습니다.', 'loot-magic');
        return { record, status: 'pulled-remote' };
    }
    return { record, status: 'safe-to-push' };
}

async function pushCloudSave(options = {}) {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    if (!cloudState.isLoaded) throw new Error('원격 저장 로드 전에는 업로드할 수 없습니다.');
    persistLocalSave({ touchModifiedAt: options.touchModifiedAt === true });
    let payload = JSON.parse(JSON.stringify(game));
    let rows = await cloudJsonRequest('/rest/v1/cloud_saves', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: { user_id: cloudState.user.id, save_data: payload }
    });
    let row = Array.isArray(rows) ? rows[0] : null;
    let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
    ensureSaveMeta();
    game.saveMeta.lastCloudSyncAt = syncedAt;
    cloudState.lastRemoteUpdatedAt = syncedAt;
    persistLocalSave({ touchModifiedAt: false });
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
    if (remoteStamp > localStamp + CLOUD_REMOTE_TIME_SKEW_MS) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage('클라우드 저장이 더 최신이라 자동으로 불러왔습니다.');
        if (!options.silent) addLog('더 최신인 클라우드 세이브를 적용했습니다.', 'loot-magic');
        return 'pulled-remote';
    }
    if (localStamp > remoteStamp + CLOUD_REMOTE_TIME_SKEW_MS) {
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage('로컬 저장이 더 최신이라 클라우드에 업로드했습니다.');
        return 'pushed-local';
    }
    game.saveMeta.lastCloudSyncAt = Math.max(game.saveMeta.lastCloudSyncAt || 0, remoteStamp || localStamp);
    persistLocalSave({ touchModifiedAt: false });
    setCloudMessage('로컬과 클라우드 저장이 같은 상태입니다.');
    return 'in-sync';
}

let cloudSyncTimer = null;
function scheduleCloudAutoSync() {
    if (!cloudState.configured || !cloudState.user || cloudState.busy || isStartupOverlayOpen()) return;
    let now = Date.now();
    if (now - cloudState.lastSyncAttemptAt < CLOUD_SYNC_MIN_INTERVAL_MS) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
        cloudSyncTimer = null;
        syncCloudSave({ automatic: true }).catch(error => {
            console.warn('auto cloud sync failed:', error);
            setCloudMessage('자동 클라우드 저장 실패: ' + (error.message || error));
        });
    }, 1200);
}

async function syncCloudSave(options = {}) {
    if (!cloudState.configured || !cloudState.user || cloudState.busy) return;
    cloudState.busy = true;
    cloudState.lastSyncAttemptAt = Date.now();
    setCloudMessage(options.automatic ? '자동 클라우드 업로드 중...' : '클라우드 업로드 중...');
    updateCloudSaveUI();
    try {
        let guardResult = await guardAgainstStaleLocalOverwrite({ automatic: !!options.automatic, silentLog: !!options.automatic });
        if (guardResult.status === 'pulled-remote') return;
        await pushCloudSave({ touchModifiedAt: options.automatic !== true });
        setCloudMessage(options.automatic ? '클라우드 자동 저장을 완료했습니다.' : '클라우드 업로드를 완료했습니다.');
        if (!options.automatic) addLog('클라우드 세이브를 업로드했습니다.', 'loot-magic');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
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
        let restored = await restoreCloudSession();
        if (restored && cloudState.user) {
            if (isStartupOverlayOpen()) setCloudMessage('이전 로그인 세션을 복원했습니다. 클라우드 세이브로 계속할 수 있습니다.');
            else {
                setCloudMessage('이전 로그인 세션을 복원했습니다.');
                await reconcileCloudSaveState({ silent: true });
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
        clearCloudPasswordInput();
        advanceLoadingOverlay({
            title: '저장 데이터를 동기화하는 중...',
            detail: '클라우드 세이브와 이 기기 저장 가운데 더 최신인 진행도를 정렬하고 있습니다.',
            caption: 'Syncing Save Data',
            progress: 58
        });
        await reconcileCloudSaveState({ createRemoteFromLocal: false });
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
        if (cloudState.session && cloudState.session.access_token) {
            try {
                await cloudJsonRequest('/auth/v1/logout', { method: 'POST' });
            } catch (logoutError) {
                console.warn('cloud logout request failed:', logoutError);
            }
        }
        applyCloudSession(null);
        cloudState.lastRemoteUpdatedAt = 0;
        setCloudMessage('클라우드 계정에서 로그아웃했습니다.');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
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
    console.error(stage + ' failed:', error);
    try {
        let label = document.getElementById('ui-progress-label');
        if (label) label.innerText = '⚠️ 오류';
        let pct = document.getElementById('ui-move-time-text');
        if (pct) pct.innerText = stage;
        let caption = document.getElementById('ui-battlefield-caption');
        if (caption) caption.innerText = `${stage}: ${message}`;
        let log = document.getElementById('log');
        if (log) log.innerHTML = `<div class="log-item attack-monster">[${stage}] ${message}</div>`;
    } catch (uiError) {
        console.error('fatal error UI update failed:', uiError);
    }
}

function recoverRuntimeState() {
    game = mergeDefaults(game || {});
    if (game.moveTimer <= 0 && (!Array.isArray(game.encounterPlan) || game.encounterPlan.length === 0)) startEncounterRun();
}

function runStartupSmokeChecks() {
    let snapshot = JSON.parse(JSON.stringify(game));
    let issues = [];
    try {
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
    gameplayStarted = false;
    setStartupOverlayActive(true);
    setLoadingOverlayState(false);
    loadGame();
    updateCloudSaveUI();
    applySeasonContentProgression({ silent: true });
    recoverRuntimeState();
    unlockPassiveStarEvolution({ silent: true });
    initBattleAssets();
    refreshPassiveVisibility();
    tickShrineState();
    applyTabHeaderOrder();
    calculateReachableNodes();
    document.getElementById('chk-combat-scene').checked = game.settings.showCombatScene !== false;
    document.getElementById('chk-log-combat').checked = game.settings.showCombatLog !== false;
    document.getElementById('chk-log-spawn').checked = game.settings.showSpawnLog !== false;
    document.getElementById('chk-log-exp').checked = game.settings.showExpLog !== false;

    let tabOrderEl = document.getElementById('ui-tab-order-settings');
    if (tabOrderEl) {
        let header = document.querySelector('.tab-header');
        let tabs = header ? Array.from(header.querySelectorAll('.tab-btn')) : [];
        tabOrderEl.innerHTML = tabs.map(el => `<div style="display:flex;justify-content:space-between;gap:6px;align-items:center;"><span>${el.innerText.replace(/\s*●?\s*$/,'')}</span><span><button onclick="moveTabButton('${el.id}',-1)">▲</button><button onclick="moveTabButton('${el.id}',1)">▼</button></span></div>`).join('');
    }

    document.getElementById('chk-log-loot').checked = game.settings.showLootLog !== false;
    document.getElementById('chk-log-crowd').checked = game.settings.showCrowdPauseLog !== false;
    document.getElementById('chk-death-notice').checked = game.settings.showDeathNotice !== false;
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
    setupCanvasEvents();
    resizeCanvas();
    if (!window.__cloudVisibilitySaveBound) {
        window.__cloudVisibilitySaveBound = true;
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) saveGame();
        });
    }
    initializeCloudSave();
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
        renderBattlefield();
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
                    pendingHeavyUiRefresh = false;
                    updateStaticUI();
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
        autoSaveHandle = setInterval(() => saveGame({ skipCloudSync: true }), 15000);
    }
}

function gameLoop() {
    try {
        if (document.hidden) return;
        if (isTutorialOpen() || isRewardOpen() || isDeathOverlayOpen() || isLoopHeroSelectOpen()) {
            if (document.getElementById('tab-char').classList.contains('active') || passiveRevealBursts.length > 0) drawPassiveTree();
            renderBattlefield();
            return;
        }
        if (document.getElementById('tab-char').classList.contains('active') || passiveRevealBursts.length > 0) drawPassiveTree();
        renderBattlefield();
    } catch (error) {
        console.error('gameLoop error:', error);
        recoverRuntimeState();
    } finally {
        requestAnimationFrame(gameLoop);
    }
}


safeExposeGlobals({ updateStaticUI });

// Phase-4 extracted unlock/class/tab helper block.
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

function isAscendNodeRequirementMet(node) {
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.ascendNodes.includes(req));
    return game.ascendNodes.includes(node.req);
}

function buySeason(id) {
    let node = SEASON_NODES[id];
    if (!node || game.seasonPoints <= 0 || game.seasonNodes.includes(id) || !isSeasonNodeRequirementMet(node)) return;
    game.seasonNodes.push(id);
    game.seasonPoints--;
    updateStaticUI();
}

function selectClass(key) {
    if (confirm(`[${CLASS_TEMPLATES[key].name}] 직업을 선택하시겠습니까? 이번 시즌에는 변경할 수 없습니다.`)) {
        game.ascendClass = key;
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
    if (tabId === 'tab-jewel') return '장비 탭이 열리면 주얼 탭을 사용할 수 있습니다.';
    if (tabId === 'tab-skills') return '새 스킬 젬이나 보조 젬을 획득하면 스킬 젬 탭이 열립니다.';
    if (tabId === 'tab-codex') return '첫 고유 아이템을 획득하면 도감 탭이 열립니다.';
    if (tabId === 'tab-talisman') return '봉인편린을 획득하면 부적 탭이 열립니다.';
    if (tabId === 'tab-map') return '새 사냥터를 발견하면 지도 탭이 열립니다.';
    if (tabId === 'tab-traits') return '전직 시련을 통과하면 직업전직 탭이 열립니다.';
    return '아직 해금되지 않은 탭입니다.';
}


safeExposeGlobals({ checkUnlocks, buySeason, selectClass, buyAscend, getLockedTabMessage });
