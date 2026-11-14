export function announceJewelReward(runtime, receipt) {
    if(!runtime.deps.game.settings.showLootLog)return;
    const {jewel,inventoryFull,protectOverflow,stored,shardGain}=receipt;
    if(!stored) {
        if(!runtime.deps.game.isBackgroundCalculation)(0, runtime.deps.addLog)((0, runtime.deps._t)('💠 {how}: [{name}], 주얼 결정 +{gain}', { how: (0, runtime.deps._t)(inventoryFull?'가방이 가득 차 해체':'주얼 자동해체'), name: (0, runtime.deps._t)(jewel.name), gain: shardGain }),inventoryFull?'attack-monster':'loot-normal');
        return;
    }
    const lines=(0, runtime.deps.getJewelStats)(jewel).map(stat=>`${(0, runtime.deps.isJewelPetiteStat)(stat)?(0, runtime.deps._t)('쁘띠 '):''}${(0, runtime.deps.getStatName)(stat.id)} +${(0, runtime.deps.formatJewelStatValue)(stat.id,stat.val)}${Number.isFinite(Number(stat.tier))&&!(0, runtime.deps.isJewelPetiteStat)(stat)?` T${Math.floor(stat.tier)}`:''}`).join(' / ');
    (0, runtime.deps.addLog)((0, runtime.deps._t)('💠 {rarity} 주얼 [{name}] 획득!{protect} ({lines})', { rarity: (0, runtime.deps._t)((0, runtime.deps.getJewelRarityLabel)(jewel.rarity)), name: (0, runtime.deps._t)(jewel.name), protect: protectOverflow ? ` <span style="color:#ffb86b;">${(0, runtime.deps._t)('(공간 부족 보호)')}</span>` : '', lines: lines || (0, runtime.deps._t)('미가공') }),protectOverflow?'loot-unique':'loot-rare',{item:jewel,itemKind:'jewel'});
}

export function announceCore(runtime, core) {
    // 완전한 코어(js/core-items.js rollPerfect): 체이싱 티어 알림(설정과 무관하게, 방치 정산 중에는 말고).
    if(core.perfect && !runtime.deps.game.isBackgroundCalculation)(0, runtime.deps.dispatchRuntimeEvent)('incident',{text:(0, runtime.deps._t)('체이싱 코어를 획득했습니다. 「{name}」', { name: core.name }),tone:'chase',chase:true});
    if(runtime.deps.game.settings.showLootLog && !runtime.deps.game.isBackgroundCalculation)(0, runtime.deps.addLog)((0, runtime.deps._t)('🧊 코어 [{name}] 획득! ({map})', { name: (0, runtime.deps._t)(core.name), map: core.lines.map(runtime.deps.coreItems.describe).join(', ') }),'loot-unique',{item:core,itemKind:'core'});
}

export function announceDropVariant(runtime, {kind,items}) {
    const item=items[0],name=`<span class='loot-${item.rarity}'>[${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemDisplayName)(item))}]</span>`;
    const text=kind==='corrupted'?(0, runtime.deps._t)('🩸 타락한 장비 {name}: 제작할 수 없지만 추가 옵션이 더 강합니다.', { name })
        :kind==='duplicate'?(0, runtime.deps._t)('✨ 복제된 장비 {name}: 똑같은 장비가 하나 더 떨어졌습니다.', { name })
        :(0, runtime.deps._t)('📦 장비 묶음: {baseName} {length}개가 함께 떨어졌습니다.', { baseName: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName)||item.name), length: items.length });
    (0, runtime.deps.addLog)(text,'loot-unique',{item});
}
