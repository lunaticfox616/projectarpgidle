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
    function announceCore(core) {
        if(game.settings.showLootLog && !game.isBackgroundCalculation)addLog(`🧊 코어 [${core.name}] 획득! (${core.lines.map(coreItems.describe).join(' · ')})`,'loot-unique',{item:core,itemKind:'core'});
    }
    window.addEventListener('project-idle:core-item-received',event=>announceCore(event.detail));
    // 장비 드랍 변형(js/loot.js equipmentDropVariants): 드물고 눈여겨볼 일이라 습득 로그 설정과 무관하게 알린다.
    function announceDropVariant({kind,items}) {
        const item=items[0],name=`<span class='loot-${item.rarity}'>[${escapeHTML(item.name)}]</span>`;
        const text=kind==='corrupted'?`🩸 타락한 장비 ${name}: 제작할 수 없지만 추가 옵션이 더 강합니다.`
            :kind==='duplicate'?`✨ 복제된 장비 ${name}: 똑같은 장비가 하나 더 떨어졌습니다.`
            :`📦 장비 묶음: ${escapeHTML(item.baseName||item.name)} ${items.length}개가 함께 떨어졌습니다.`;
        addLog(text,'loot-unique',{item});
    }
    window.addEventListener('project-idle:equipment-drop-variant',event=>announceDropVariant(event.detail));
    window.addEventListener('project-idle:exploration-departed',event=>{
        if(event.detail.background)return;
        updateStaticUI();queueImportantSave(220);
    });

})();
