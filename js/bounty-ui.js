// The modal owns presentation; an unopened or postponed reward stays in the saved treasure state.
let treasureDialogOpen=false;
function bountyTargetChoice(id) {
    const target=BOUNTY_TARGET_DB[id], steps=target.risk-1, config=BOUNTY_HUNT_CONFIG;
    let reward=escapeHTML(bountyRuntime.targetRewardLabel(id));
    reward=reward.replace('희귀 이상 장비',`<b style="color:${getRarityColor('rare')}">희귀 이상 장비</b>`);
    for (const key of Object.keys(target.reward.currencies || {})) {
        reward=reward.split(escapeHTML(ORB_DB[key].name)).join(window.getStyledOrbName(key));
    }
    const riskTitle=`생명력 +${Math.round(steps*config.riskHpStep*100)}% · 피해 +${Math.round(steps*config.riskDamageStep*100)}%`;
    const bonus=steps ? `<small class="bounty-reward-bonus">보상 기대량 +${Math.round(steps*config.riskRewardStep*100)}% · 희귀 보물 확률 +${Math.round(steps*config.riskRareStep*100)}%</small>` : '';
    return {value:id,label:target.name,detailHtml:
        `<span class="bounty-choice-row"><small>특성</small><span>${escapeHTML(target.danger)}</span></span>
        <span class="bounty-choice-row"><small>위험도</small><b class="bounty-risk bounty-risk-${target.risk}" title="${riskTitle}">${['','낮음','보통','높음'][target.risk]}</b></span>
        <span class="bounty-choice-reward"><small>보상</small><span>${reward}</span>${bonus}</span>`};
}
function getBountyRewardBasis(state) {
    const source=state.source;
    if (!source?.zone) return '';
    return `10마리 중 최저 보스 T${source.zone.tier} 기준 · 일반 재료 ×${source.materialMultiplier}`;
}
async function openTreasureDialog() {
    if (treasureDialogOpen) return;
    const pending=bountyRuntime.openTreasure();
    if (!pending) return;
    treasureDialogOpen=true;
    try {
        saveGame({skipCloudSync:false});
        const event=TREASURE_EVENT_DB[pending.id];
        const basis=getBountyRewardBasis(bountyRuntime.ensureState());
        if (pending.status==='queued') {
            await requestGameDialog({type:'notice',title:'보물사냥 예약',kicker:'보물사냥',confirmLabel:'알겠어요',
                message:`${BOUNTY_TARGET_DB[pending.targetId].name}\n다음 사냥 지역에서 표적을 처치하면 보물을 받을 수 있습니다.`});
            return;
        }
        if (pending.status!=='reward') {
            const selected=await requestGameChoice({title:'보물사냥',tone:'bounty',
                message:`선택한 표적은 다음 사냥 지역에 등장합니다.\n${basis}`,
                choices:pending.offerIds.map(bountyTargetChoice),
                confirmLabel:'다음 지역에 예약',cancelLabel:'나중에'});
            if (selected && bountyRuntime.startHunt(selected)) {
                saveGame({skipCloudSync:false});
                updateStaticUI();
            }
            return;
        }
        const accepted=await requestGameConfirmation(`${event.text}\n${basis}\n\n발견한 보물: ${bountyRuntime.rewardLabel(pending)}`,
            {title:event.name,kicker:'보물사냥',tone:'gold',confirmLabel:'보물 받기',cancelLabel:'나중에 받기'});
        if (!accepted) return;
        const result=bountyRuntime.claimTreasure();
        if (!result.ok) return;
        addLog(`보물사냥 · ${result.event.name}: ${result.label}`,'loot-'+result.event.rarity,{item:result.item,toast:true});
        saveGame({skipCloudSync:false});
        updateStaticUI();
    } finally { treasureDialogOpen=false; }
}
function getQueuedBountyHudState(state, tier, basis) {
    const id=state.pending.targetId;
    const inRun=(game.encounterPlan || []).some(marker=>marker.bountyId===id);
    const label=inRun ? '추적 중' : '다음 지역 등장 예정';
    return {key:`hunting:${id}:${inRun}${tier}`,html:`<div class="bounty-hud-progress" title="${basis}"><strong>보물사냥 · ${label}</strong><span>${BOUNTY_TARGET_DB[id].name}${tier}</span></div>`};
}
function getBountyHudState() {
    const state=bountyRuntime.ensureState();
    if (!bountyRuntime.isUnlocked()) return {hidden:true,key:'locked',html:''};
    const basis=getBountyRewardBasis(state), tier=state.source?.zone ? ` · 기준 T${state.source.zone.tier}` : '';
    const status=state.pending?.status;
    if (status==='queued') return getQueuedBountyHudState(state,tier,basis);
    if (state.remaining===0) return {key:(status || 'ready')+tier,
        html:`<button class="bounty-hud-offer" title="${basis}" onclick="bountyUi.openTreasure()"><strong>보물사냥</strong></button>`};
    return {key:'count:'+state.remaining+tier,html:`<div class="bounty-hud-progress" title="${basis}"><strong>다음 보물사냥까지</strong><span>${state.remaining}${tier}</span></div>`};
}
function renderBountyHud() {
    const box=document.getElementById('ui-bounty-box');
    if (!box) return;
    const view=getBountyHudState();
    box.hidden=!!view.hidden;
    if (view.hidden || box.dataset.stateKey===view.key) return;
    box.innerHTML=view.html;box.dataset.stateKey=view.key;
}
const bountyUi=Object.freeze({renderHud:renderBountyHud,openTreasure:openTreasureDialog});
safeExposeGlobals({bountyUi});

window.addEventListener('project-idle:player-defeated', event => {
    if (!event.detail?.bountyFailed) return;
    addLog(`보물사냥 실패 · 보스 ${BOUNTY_HUNT_CONFIG.guaranteedAt}회 처치 후 다시 선택할 수 있습니다.`,
        'death', {noToast:!!event.detail.noToast});
});
