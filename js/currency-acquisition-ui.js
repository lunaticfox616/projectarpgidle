// Currency state is committed in the domain; banners and logs cannot grant it again.
(() => {
    function announce(event) {
        const {currencyKey,gain,unlocked}=event.detail;
        if(currencyKey==='goldenRule' && gain>0) {
            showDivineDropBanner(gain);
            addLog(`✨✨ <strong>${ORB_DB.goldenRule.name} +${gain}</strong> 획득!`,'loot-unique');
        }
        if(['chaosKey','coreKey'].includes(currencyKey) && gain>0) {
            const name=ORB_DB[currencyKey].name;
            addLog(`🗝️ <strong>${name} +${gain}</strong> 획득! 5차 미궁 시련(재능 개화)을 지도에서 확인하세요.`,'loot-unique');
        }
        if(currencyKey==='ouroboros' && gain>0) {
            addLog(`🌿✨ <strong>${ORB_DB.ouroboros.name} +${gain}</strong> 획득! 장비를 봉인해 루프가 지나도 지킬 수 있습니다.`,'loot-unique');
        }
        if(unlocked.gem)addLog('☁️ 스킬 젬 강화 탭이 개방되었습니다!','loot-unique');
        if(unlocked.talisman)addLog('🧿 부적 탭이 개방되었습니다!','loot-unique');
    }
    function announceGemReward(reward) {
        if(!game.settings.showLootLog)return;
        const {gem,kind,shards,name}=reward,suffix=shards?` 젬 잔향 +${shards}`:'';
        if(gem) {
            if(kind==='attack')addLog(`✨ 공격 젬 <span class='loot-magic'>[${gem.name}]</span> 획득!${gem.awakened?' (각성 후보)':''}${suffix}`);
            else addLog(`🟢 보조젬 <span class='loot-rare'>[${gem.name}]</span> 획득! (해금: ${getSupportTierLabel(gem.name,gem.tier)})${suffix}`);
            return;
        }
        if(shards<=0)return;
        const message=kind==='attack'?`모든 공격 젬을 보유해 드랍이 젬 잔향 +${shards}로 환원되었습니다.`
            :`최고 등급 보조 젬 [${name}]이 젬 잔향 +${shards}로 환원되었습니다.`;
        addLog('💠 '+message,kind==='attack'?'loot-magic':'loot-rare');
    }
    window.addEventListener('project-idle:currency-acquired',announce);
    window.addEventListener('project-idle:gem-loot-received',event=>announceGemReward(event.detail));
    function announceJewelReward(receipt) {
        if(!game.settings.showLootLog)return;
        const {jewel,inventoryFull,protectOverflow,stored,shardGain}=receipt;
        if(!stored) {
            if(!game.isBackgroundCalculation)addLog(`💠 ${inventoryFull?'주얼 인벤토리 초과':'주얼 자동해체'}: [${jewel.name}] · 주얼 결정 +${shardGain}`,inventoryFull?'attack-monster':'loot-normal');
            return;
        }
        const lines=getJewelStats(jewel).map(stat=>`${isJewelPetiteStat(stat)?'쁘띠 ':''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id,stat.val)}${Number.isFinite(Number(stat.tier))&&!isJewelPetiteStat(stat)?` T${Math.floor(stat.tier)}`:''}`).join(' / ');
        addLog(`💠 ${getJewelRarityLabel(jewel.rarity)} 주얼 [${jewel.name}] 획득!${protectOverflow?' <span style="color:#ffb86b;">(공간 부족 보호)</span>':''} (${lines||'미가공'})`,protectOverflow?'loot-unique':'loot-rare',{item:jewel,itemKind:'jewel'});
    }
    window.addEventListener('project-idle:jewel-drop-received',event=>announceJewelReward(event.detail));
    window.addEventListener('project-idle:exploration-departed',event=>{
        if(event.detail.background)return;
        updateStaticUI();queueImportantSave(220);
    });
    window.addEventListener('project-idle:exploration-loot-claimed',event=>{
        if(event.detail.equipmentCount||event.detail.gems.length)checkUnlocks();
        event.detail.gems.forEach(gem=>announceGemReward({gem,kind:gem.kind,shards:0}));
        event.detail.jewels.forEach(jewel=>announceJewelReward({jewel,stored:true}));
        if(game.settings.showLootLog)event.detail.growthItems.forEach(item=>addLog(`🌱 <span class='loot-${item.rarity}'>[${item.name}]</span> 획득!`,'',{item,itemKind:'growth'}));
        if(event.detail.blurred45 && game.settings.showLootLog)addLog(`🧊 흐릿한 45면체 +${event.detail.blurred45}`,'loot-unique');
        for(const key of event.detail.flasks) {
            if(game.settings.showLootLog)addLog(`🧪 새로운 플라스크 발견: [${FLASK_DB[key].name}]`,'loot-rare');
        }
        if(event.detail.flasks.length)requestGoalSystemRefresh();
    });
})();
