// Currency state is committed in the domain; notices and logs cannot grant it again.
/** 전투 화면의 기본 재화 줄(2026-10-21 사용자: "메인 화면 즉 전투화면에서 기본 재화들 (있는 것만) 몇개 있는지 보여주면"): 제작실의 기본 재화
 * 묶음(js/crafting-workspace-state.js) 가운데 가진 것만 지역 이름 아래에. 제작이 닫힌 루프 1에도 NPC 상점에 낼 재화가 보인다.
 * js/main.js refreshCombatTickUi가 틱마다 부르고, 수가 바뀐 때만 다시 그린다. */
const combatCurrencyHud = (() => {
    let keys = null, drawn = '';
    function update() {
        const root = document.getElementById('ui-combat-currencies');
        if (!root) return;
        keys = keys || Object.keys(ORB_DB).filter(key => craftingWorkspaceState.group(key) === 'basic' && ORB_DB[key].icon);
        const held = keys.map(key => [key, Math.floor(Number(game.currencies[key]) || 0)]).filter(([, count]) => count > 0);
        const sign = held.join('|');
        if (sign === drawn) return;
        drawn = sign;
        root.hidden = !held.length;
        root.innerHTML = held.map(([key, count]) => {
            const name = escapeHTML(ORB_DB[key].name);
            return `<span title="${name}" aria-label="${name} ${count}개"><img src="${ORB_DB[key].icon}" alt="">${count.toLocaleString('ko-KR')}</span>`;
        }).join('');
    }
    return Object.freeze({ update });
})();
safeExposeGlobals({ combatCurrencyHud });
(() => {
    /** 알림창(js/ui-feedback.js): 황금률은 금빛, 체이싱 티어 재화(js/loot.js lootMoments jackpot: 요정의 고리, 우로보로스)는 붉은 금빛. */
    function noticeCurrency(currencyKey,gain) {
        if(!(gain>0))return;
        const chase=lootMoments.ofCurrency(currencyKey)==='jackpot';
        if(currencyKey!=='goldenRule' && !chase)return; // 그 밖의 재화는 알림이 없다(군락지 편린 같은 지갑 재화는 ORB_DB에 없어 이름을 읽다 멈췄다)
        const name=ORB_DB[currencyKey].name;
        // 설정 > 아이템 필터의 발견 연출에서 끈 알림은 띄우지 않는다(game.settings.lootFx.notices).
        if(game.settings.lootFx?.notices?.[chase?'chase':'goldenRule']===false)return;
        showGameToast(`${withObjectParticle(name)} 획득했습니다.`,{tone:chase?'chase':'reward',duration:chase?6000:3600});
    }
    /** 처음 얻은 제작 뿌리와 기억 조각칼: 어디서 어떻게 쓰는지 한 번(2026-10-18, 둘 다 늦은 콘텐츠의 드문 재화라 처음 보면 쓸 곳을 모른다). */
    const FIRST_USE={
        roots:['craft_roots','제작 뿌리','제작 뿌리를 얻었습니다.\n‘장비 → 제작실’의 ‘뿌리 함께 사용’에서 걸어 두면 그 뿌리가 바꾸는 다음 제작 한 번에 쓰입니다.'],
        memoryImprint:['memory_chisel','기억 조각칼','기억 조각칼을 얻었습니다.\n‘장비 → 제작실’에서 장비의 지금 추가 옵션을 새겨 두면, 뒤에 제작이 마음에 들지 않을 때 그 옵션으로 한 번 되돌릴 수 있습니다.']
    };
    function noticeFirstUse(currencyKey,gain) {
        const row=FIRST_USE[CRAFT_OMENS.keys.includes(currencyKey)?'roots':currencyKey];
        if(gain>0&&row)queueTutorialNotice(row[0],row[1],row[2],'tab-items','item-tab-craft');
    }
    function announce(event) {
        const {currencyKey,gain,unlocked}=event.detail;
        noticeCurrency(currencyKey,gain);
        noticeFirstUse(currencyKey,gain);
        if(currencyKey==='goldenRule' && gain>0) {
            addLog(`✨✨ <strong>${ORB_DB.goldenRule.name} +${gain}</strong> 획득!`,'loot-unique');
        }
        if(['chaosKey','coreKey'].includes(currencyKey) && gain>0) {
            const name=ORB_DB[currencyKey].name;
            addLog(`🗝️ <strong>${name} +${gain}</strong> 획득! 5차 미궁 시련(재능 개화)을 지도에서 확인하세요.`,'loot-unique');
        }
        if(currencyKey==='ouroboros' && gain>0) {
            addLog(`🌿✨ <strong>${ORB_DB.ouroboros.name} +${gain}</strong> 획득! 장비를 봉인해 루프가 지나도 지킬 수 있습니다.`,'loot-unique');
        }
        if(unlocked.gem)addLog('☁️ 스킬룬 탭의 성장과 각인이 열렸습니다!','loot-unique');
    }
    /** 새 공격 룬이 지금 주 공격 룬보다 보이는 DPS가 10% 넘게 높으면 알림창에 알린다. 주 공격 칸을 잠시 그 룬으로 바꿔 한 번 잰다.
     * 이동 룬은 이동 칸에 끼므로 재지 않는다. */
    const RUNE_UPGRADE_NOTICE_GAIN=1.1;
    function noticeRuneUpgrade(name) {
        if(game.activeSkill===name || isMobilityRuneName(name) || !(game.skills||[]).includes(name) || !canUseSkillWithCurrentEquipment(name))return;
        const keep=game.activeSkill,before=getPlayerStats(false).dps||0;
        let after=0;
        game.activeSkill=name;
        try { after=getPlayerStats(false).dps||0; } finally { game.activeSkill=keep; }
        const format=COMPARE_STAT_META.dps.format;
        if(before>0 && after>=before*RUNE_UPGRADE_NOTICE_GAIN)showGameToast(`더 강한 공격 룬을 얻었습니다. 「${name}」 DPS ${format(before)} → ${format(after)}`,{tone:'reward',duration:4200});
    }
    /** 주 공격으로 쓰는 공격 룬(위습 소환 말고)을 얻었으면 전투 틱이 끝난 뒤 noticeRuneUpgrade로 잰다. 방치 정산 중에는 재지 않는다. */
    function queueRuneUpgradeNotice({gem,kind}) {
        if(!gem || kind!=='attack' || game.isBackgroundCalculation || (SKILL_DB[gem.name]?.tags||[]).includes('summon'))return;
        setTimeout(()=>noticeRuneUpgrade(gem.name),0);
    }
    /** 공격 룬 줄 끝: 지금 든 무기로 쓸 수 없으면 그 까닭. */
    const runeWeaponNote=name=>(canUseSkillWithCurrentEquipment(name)?'':` (지금 무기로 쓸 수 없음: ${getSkillRuneWeaponNote(name)})`);
    function announceGemReward(reward) {
        queueRuneUpgradeNotice(reward);
        if(!game.settings.showLootLog)return;
        const {gem,kind,shards,name}=reward,suffix=shards?` 룬 잔향 +${shards}`:'';
        if(gem) {
            if(kind==='attack')addLog(`✨ 공격 룬 <span class='loot-magic'>[${gem.name}]</span> 획득!${gem.awakened?' (각성 후보)':''}${runeWeaponNote(gem.name)}${suffix}`);
            else addLog(`🟢 보조스킬룬 <span class='loot-rare'>[${gem.name}]</span> 획득! (해금: ${getSupportTierLabel(gem.name,gem.tier)})${suffix}`);
            return;
        }
        if(shards<=0)return;
        const message=kind==='attack'?`모든 공격 룬을 보유해 드랍이 룬 잔향 +${shards}로 환원되었습니다.`
            :`최고 등급 보조스킬룬 [${name}]${pickParticle(name, '이', '가')} 룬 잔향 +${shards}로 환원되었습니다.`;
        addLog('💠 '+message,kind==='attack'?'loot-magic':'loot-rare');
    }
    window.addEventListener('project-idle:currency-acquired',announce);
    window.addEventListener('project-idle:gem-loot-received',event=>announceGemReward(event.detail));
    function announceJewelReward(receipt) {
        if(!game.settings.showLootLog)return;
        const {jewel,inventoryFull,protectOverflow,stored,shardGain}=receipt;
        if(!stored) {
            if(!game.isBackgroundCalculation)addLog(`💠 ${inventoryFull?'가방이 가득 차 해체':'주얼 자동해체'}: [${jewel.name}], 주얼 결정 +${shardGain}`,inventoryFull?'attack-monster':'loot-normal');
            return;
        }
        const lines=getJewelStats(jewel).map(stat=>`${isJewelPetiteStat(stat)?'쁘띠 ':''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id,stat.val)}${Number.isFinite(Number(stat.tier))&&!isJewelPetiteStat(stat)?` T${Math.floor(stat.tier)}`:''}`).join(' / ');
        addLog(`💠 ${getJewelRarityLabel(jewel.rarity)} 주얼 [${jewel.name}] 획득!${protectOverflow?' <span style="color:#ffb86b;">(공간 부족 보호)</span>':''} (${lines||'미가공'})`,protectOverflow?'loot-unique':'loot-rare',{item:jewel,itemKind:'jewel'});
    }
    window.addEventListener('project-idle:jewel-drop-received',event=>announceJewelReward(event.detail));
    function announceCore(core) {
        // 완전한 코어(js/core-items.js rollPerfect): 체이싱 티어 알림(설정과 무관하게, 방치 정산 중에는 말고).
        if(core.perfect && !game.isBackgroundCalculation)dispatchRuntimeEvent('incident',{text:`체이싱 코어를 획득했습니다. 「${core.name}」`,tone:'chase',chase:true});
        if(game.settings.showLootLog && !game.isBackgroundCalculation)addLog(`🧊 코어 [${core.name}] 획득! (${core.lines.map(coreItems.describe).join(', ')})`,'loot-unique',{item:core,itemKind:'core'});
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
