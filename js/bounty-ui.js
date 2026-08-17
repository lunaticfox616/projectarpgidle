let bountyOfferDialogOpen = false;

function getBountyOfferChoices() {
    let state = bountyRuntime.ensureState();
    return state.offerIds.map(id => BOUNTY_TARGET_DB[id]).filter(Boolean).map(target => ({
        value: target.id,
        label: `${target.icon} ${target.name}`,
        detail: `위험: ${target.danger} · 보상: ${target.rewardLabel}`
    }));
}

async function openBountyOfferDialog() {
    if (bountyOfferDialogOpen) return;
    let choices = getBountyOfferChoices();
    if (choices.length === 0) return;
    bountyOfferDialogOpen = true;
    try {
        let selected = await requestGameChoice({
            title: '희귀 현상금 표적',
            kicker: 'BOUNTY TRACE',
            message: '한 표적을 선택하면 다음 일반 사냥 중간에 강화 정예로 출현합니다. 선택 전까지 제안은 사라지지 않습니다.',
            cancelLabel: '나중에 선택',
            submitOnChoice: true,
            choices
        });
        let result = selected ? bountyRuntime.acceptOffer(selected) : { accepted: false };
        if (!result.accepted) return;
        addLog(`🎯 현상금 수락: [${result.target.name}] · 다음 사냥에서 추적합니다.`, 'loot-unique');
        if (typeof queueImportantSave === 'function') queueImportantSave(200);
        updateStaticUI();
    } finally {
        bountyOfferDialogOpen = false;
    }
}

async function abandonBountyFromHud() {
    let state = bountyRuntime.ensureState();
    if (!state.activeId && state.offerIds.length === 0) return;
    let target = BOUNTY_TARGET_DB[state.activeId];
    let label = target ? target.name : '현재 제안';
    let confirmed = await requestGameConfirmation(`[${label}] 추적을 포기합니다. 진행도와 보상은 사라집니다.`, {
        title: '현상금 추적 포기', tone: 'danger', confirmLabel: '추적 포기'
    });
    if (!confirmed || !bountyRuntime.abandon()) return;
    addLog('🎯 현상금 흔적을 지웠습니다.', 'attack-monster');
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
    updateStaticUI();
}

function getBountyHudState() {
    let state = bountyRuntime.ensureState();
    if (!bountyRuntime.isUnlocked()) return { hidden: true, key: 'locked', html: '' };
    if (state.offerIds.length > 0) {
        return { key: `offer:${state.offerIds.join(',')}`, html: '<button class="bounty-hud-offer" onclick="bountyUi.openOffer()"><strong>🎯 희귀 표적 발견</strong><span>3개 중 선택</span></button><button class="bounty-hud-dismiss" onclick="bountyUi.abandon()" aria-label="현상금 제안 버리기">×</button>' };
    }
    if (state.activeId) {
        let target = BOUNTY_TARGET_DB[state.activeId];
        let status = state.status === 'hunting' ? '교전 중' : '다음 사냥에 출현';
        return { key: `${state.status}:${state.activeId}`, html: `<div class="bounty-hud-active"><strong>${target.icon} ${target.name}</strong><span>${status}</span></div><button class="bounty-hud-dismiss" onclick="bountyUi.abandon()" aria-label="현상금 추적 포기">×</button>` };
    }
    return { key: `idle:${state.pity}`, html: `<div class="bounty-hud-progress"><strong>🎯 현상금 흔적</strong><span>${state.pity}/${BOUNTY_HUNT_CONFIG.guaranteedAt}</span></div>` };
}

function renderBountyHud() {
    let box = document.getElementById('ui-bounty-box');
    if (!box) return;
    let view = getBountyHudState();
    box.hidden = !!view.hidden;
    if (view.hidden || box.dataset.stateKey === view.key) return;
    box.innerHTML = view.html;
    box.dataset.stateKey = view.key;
}

const bountyUi = Object.freeze({ renderHud: renderBountyHud, openOffer: openBountyOfferDialog, abandon: abandonBountyFromHud });
safeExposeGlobals({ bountyUi });
