let bountyOfferDialogOpen = false;
let bountyDetailDialogOpen = false;

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

async function openActiveBountyDialog() {
    if (bountyDetailDialogOpen) return;
    let state = bountyRuntime.ensureState();
    let target = BOUNTY_TARGET_DB[state.activeId];
    if (!target) return;
    bountyDetailDialogOpen = true;
    try {
        let status = state.status === 'hunting' ? '현재 교전 중' : '다음 사냥에 출현';
        let confirmed = await requestGameConfirmation(
            `위험: ${target.danger}\n보상: ${target.rewardLabel}\n상태: ${status}\n\n추적을 취소하면 진행도와 보상을 잃습니다.`,
            { title: `${target.icon} ${target.name}`, kicker: 'BOUNTY TRACE', tone: 'danger',
                confirmLabel: '추적 취소', cancelLabel: '계속 추적' }
        );
        if (!confirmed || !bountyRuntime.abandon()) return;
        addLog(`🎯 [${target.name}] 현상금 추적을 취소했습니다.`, 'attack-monster');
        if (typeof queueImportantSave === 'function') queueImportantSave(200);
        updateStaticUI();
    } finally {
        bountyDetailDialogOpen = false;
    }
}

function getBountyHudState() {
    let state = bountyRuntime.ensureState();
    if (!bountyRuntime.isUnlocked()) return { hidden: true, key: 'locked', html: '' };
    if (state.offerIds.length > 0) {
        return { key: `offer:${state.offerIds.join(',')}`, html: '<button class="bounty-hud-offer" onclick="bountyUi.openOffer()"><strong>🎯 희귀 표적 발견</strong><span>3개 중 선택</span></button>' };
    }
    if (state.activeId) {
        let target = BOUNTY_TARGET_DB[state.activeId];
        let status = state.status === 'hunting' ? '교전 중' : '다음 사냥에 출현';
        return { key: `${state.status}:${state.activeId}`, html: `<button class="bounty-hud-active" onclick="bountyUi.openActive()" aria-label="${target.name} 현상금 보상 확인 및 취소"><strong>${target.icon} ${target.name}</strong><span>${status} · 보상 확인</span></button>` };
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

const bountyUi = Object.freeze({ renderHud: renderBountyHud, openOffer: openBountyOfferDialog,
    openActive: openActiveBountyDialog });
safeExposeGlobals({ bountyUi });
