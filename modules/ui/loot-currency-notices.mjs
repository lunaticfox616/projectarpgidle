export function noticeCurrency(runtime, currencyKey, gain) {
    if(!(gain>0))return;
    const chase=runtime.deps.lootMoments.ofCurrency(currencyKey)==='jackpot';
    if(currencyKey!=='goldenRule' && !chase)return; // 그 밖의 재화는 알림이 없다(군락지 편린 같은 지갑 재화는 ORB_DB에 없어 이름을 읽다 멈췄다)
    const name=(0, runtime.deps._t)(runtime.deps.ORB_DB[currencyKey].name);
    // 설정 > 아이템 필터의 발견 연출에서 끈 알림은 띄우지 않는다(game.settings.lootFx.notices).
    if(runtime.deps.game.settings.lootFx?.notices?.[chase?'chase':'goldenRule']===false)return;
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)('{name} 획득했습니다.', { name: (0, runtime.deps.withObjectParticle)(name) }),{tone:chase?'chase':'reward',duration:chase?6000:3600});
}

export function noticeFirstUse(runtime, currencyKey, gain) {
    const row=runtime.state.FIRST_USE[runtime.deps.CRAFT_OMENS.keys.includes(currencyKey)?'roots':currencyKey];
    if(gain>0&&row)(0, runtime.deps.queueTutorialNotice)(row[0],row[1],row[2],'tab-items','item-tab-craft');
}

export function announce(runtime, event) {
    const {currencyKey,gain,unlocked}=event.detail;
    noticeCurrency(runtime, currencyKey,gain);
    noticeFirstUse(runtime, currencyKey,gain);
    if(currencyKey==='goldenRule' && gain>0) {
        (0, runtime.deps.addLog)((0, runtime.deps._t)('✨✨ <strong>{name} +{gain}</strong> 획득!', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB.goldenRule.name), gain }),'loot-unique');
    }
    if(['chaosKey','coreKey'].includes(currencyKey) && gain>0) {
        const name=(0, runtime.deps._t)(runtime.deps.ORB_DB[currencyKey].name);
        (0, runtime.deps.addLog)((0, runtime.deps._t)('🗝️ <strong>{name} +{gain}</strong> 획득! 5차 미궁 시련(재능 개화)을 지도에서 확인하세요.', { name, gain }),'loot-unique');
    }
    if(currencyKey==='ouroboros' && gain>0) {
        (0, runtime.deps.addLog)((0, runtime.deps._t)('🌿✨ <strong>{name} +{gain}</strong> 획득! 장비를 봉인해 루프가 지나도 지킬 수 있습니다.', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB.ouroboros.name), gain }),'loot-unique');
    }
    if(unlocked.gem)(0, runtime.deps.addLog)((0, runtime.deps._t)('☁️ 스킬룬 탭의 각인이 열렸습니다!'),'loot-unique');
}
