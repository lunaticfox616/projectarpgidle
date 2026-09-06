// The modal owns presentation; an unopened or postponed reward stays in the saved treasure state.
let treasureDialogOpen=false;
async function openTreasureDialog() {
    if (treasureDialogOpen) return;
    const pending=bountyRuntime.openTreasure();
    if (!pending) return;
    treasureDialogOpen=true;
    try {
        saveGame({skipCloudSync:false});
        const event=TREASURE_EVENT_DB[pending.id];
        const accepted=await requestGameConfirmation(`${event.text}\n\n발견한 보물: ${bountyRuntime.rewardLabel(pending)}`,
            {title:event.name,kicker:'보물사냥',tone:'gold',confirmLabel:'보물 받기',cancelLabel:'나중에 받기'});
        if (!accepted) return;
        const result=bountyRuntime.claimTreasure();
        if (!result.ok) return;
        addLog(`보물사냥 · ${result.event.name}: ${result.label}`,'loot-'+result.event.rarity,{item:result.item,toast:true});
        saveGame({skipCloudSync:false});
        updateStaticUI();
    } finally { treasureDialogOpen=false; }
}
function getBountyHudState() {
    const state=bountyRuntime.ensureState();
    if (!bountyRuntime.isUnlocked()) return {hidden:true,key:'locked',html:''};
    if (state.remaining===0) return {key:state.pending ? 'reward' : 'ready',
        html:`<button class="bounty-hud-offer" onclick="bountyUi.openTreasure()"><strong>보물사냥</strong><span>${state.pending ? '발견한 보물 받기' : '탐색하기'}</span></button>`};
    return {key:'count:'+state.remaining,html:`<div class="bounty-hud-progress"><strong>다음 보물사냥까지</strong><span>${state.remaining}</span></div>`};
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
