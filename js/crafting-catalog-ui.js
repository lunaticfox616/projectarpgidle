// Resource inventory. Persistent discovery and pins belong to craftingWorkspaceState.
const craftingCatalogUi = (() => {
    const groups=[['all','전체'],['basic','기본 재화'],['spore','홀씨'],['fossil','화석'],['special','특수 제작']];

    const separateMaterials=new Set(craftingWorkspaceState.materials);
    let craftingOnly=false;
    let useState;
    let dialog, onSelect, onPin, recipes, category='all', query='', ownedOnly=true, active='', inspected='', editing=false, pinSlot=0, openerId='';

    const pins=()=>game.craftingWorkspace.pins;
    const esc=value=>escapeHTML(String(value));
    const name=key=>ORB_DB[key].name.replace(/^[^가-힣A-Za-z0-9]+/u,'');

    function catalogCapture() { craftingWorkspaceState.capture(game); }

    function catalogVisible(key) {return !!catalogGroup(key)&&game.craftingWorkspace.discovered.includes(key)&&contentProgression.canDropCurrency(key);}
    const listed=key=>catalogVisible(key)&&(!craftingOnly||!separateMaterials.has(key));
    const pinned=()=>pins().map(key=>catalogVisible(key)?key:null);
    const theme=key=>({sporeFire:'fire',sporeCold:'cold',sporeLight:'light'})[key]||catalogGroup(key);
    const styledName=key=>`<span class="cl-currency-name" data-theme="${theme(key)}">${window.getStyledOrbName(key)}</span>`;

    function catalogGroup(key) { return craftingWorkspaceState.group(key); }

    const keywordTones={일반:'normal',매직:'magic',희귀:'rare',고유:'unique',물리:'physical',근접:'physical',생명:'life',방어:'defense',속도:'speed',치명:'critical',저항:'resist',원소:'element',카오스:'chaos',흡혈:'life',재생:'life',화염:'fire',냉기:'cold',번개:'light',투사체:'speed',관통:'physical',균열:'chaos',타락:'life'};
    const keywordPattern=new RegExp(Object.keys(keywordTones).join('|'),'g');
    const summaries={
        magicBud:'일반 → 매직 · 매직 옵션 재련',sapBud:'매직 → 희귀 · 옵션 1줄 추가',
        formlessDew:'일반 → 희귀 · 희귀 옵션 재련',goldenRule:'옵션 수치 재설정',
        blessing:'베이스 옵션 수치 재설정',blightSpore:'일반 등급으로 초기화',
        pruningShears:'무작위 옵션 1줄 제거',fairyRing:'고유 진화 · 25% 파괴',
        emberBranch:'타락 옵션 시도 · 이후 제작 불가',ouroboros:'장비 봉인 · 루프 후 유지',
        deepWhetstone:'무기 퀄리티 강화',rootIron:'방어구 퀄리티 강화',jewelPolish:'장신구 퀄리티 강화',
        abyssCatalyst:'퀄리티 속성 변경',enchantedHoney:'옵션 1줄 영구 고정',
        venomStinger:'무기 공격 옵션 추가·재설정',voidChisel:'장신구 소켓 · 공허 주얼 제작',
        oceanRerollShard:'베이스 옵션 1줄 재설정',
        sporeFire:'화염 홀씨 · 함께 사용',sporeCold:'냉기 홀씨 · 함께 사용',sporeLight:'번개 홀씨 · 함께 사용',
        fossil:'타입별 화석으로 정제',fossilPrimal:'복원 · 화석과 재화 획득',fossilAncientPrimal:'복원 · 전용 화석과 고급 재화',
        fossilJagged:'물리/근접 1줄 확정 · 희귀 재련',fossilBound:'생명/방어 1줄 확정 · 희귀 재련',
        fossilGale:'속도/치명 1줄 확정 · 희귀 재련',fossilPrismatic:'저항/원소 1줄 확정 · 희귀 재련',
        fossilAbyssal:'카오스/흡혈/재생 1줄 확정 · 희귀 재련',fossilPrimordial:'관통/카오스 1줄 확정 · 희귀 재련',
        fossilBulwark:'최대 원소 저항 확정 · 방어구 재련',fossilWedge:'투사체/치명 1줄 확정 · 희귀 재련',
        fossilOld:'화석 전용 1줄 확정 · 희귀 재련',fossilRift:'균열 표식 · 추가 옵션 50% 증폭'
    };

    function catalogDescription(key, compact=false) {
        return esc(compact?summaries[key]:ORB_DB[key].desc).replace(keywordPattern,word=>`<span class="cl-keyword" data-keyword="${keywordTones[word]}">${word}</span>`);
    }

    function catalogActionLabel(key,state) {
        if(editing)return `${pinSlot+1}번 칸에 지정`;
        const blocked=state&&!state.enabled;
        const reason=blocked?(state.reason==='방어구 전용'?state.reason:'사용 불가'):'';
        return [key===(inspected||active)?'선택 중':'',pins().includes(key)?'주 재화':'',reason,game.currencies[key]?'':'보유 없음'].filter(Boolean).join(' · ');
    }

    function catalogCard(key) {
        const def=ORB_DB[key], amount=game.currencies[key]||0;
        const selected=key===(inspected||active);
        const state=useState(key), blocked=state&&!state.enabled;
        return `<button type="button" class="cl-resource ${amount?'':'is-empty'} ${selected?'is-selected':''} ${blocked?'is-unavailable':''}" data-theme="${theme(key)}" data-resource="${key}" aria-pressed="${selected}">
            <span class="cl-resource-head">${def.icon?`<img src="${esc(def.icon)}" alt="">`:''}<strong>${styledName(key)}</strong><b>${amount.toLocaleString('ko-KR')}</b></span>
            <span class="cl-resource-desc">${catalogDescription(key,true)}</span><small>${esc(catalogActionLabel(key,state))}</small></button>`;
    }

    function catalogList() {
        catalogCapture();
        const keys=Object.keys(ORB_DB).filter(listed)
            .filter(key=>(category==='all'||catalogGroup(key)===category)&&(!ownedOnly||game.currencies[key]>0))
            .filter(key=>(name(key)+' '+ORB_DB[key].desc).includes(query));
        dialog.querySelector('.cl-resource-list').innerHTML=keys.map(catalogCard).join('')||'<p class="cl-resource-empty">해당하는 재화가 없습니다.</p>';
        dialog.querySelector('.cl-resource-count').textContent=`${keys.length}종`;
        catalogRenderPins();
    }

    function catalogRenderPins() {
        dialog.querySelector('[data-edit]').textContent=editing?'편집 완료':'주 재화 편집';
        dialog.querySelector('.cl-pin-editor').hidden=!editing;
        dialog.querySelector('.cl-pin-editor').innerHTML=`<small>바꿀 칸을 고른 뒤 재화를 선택하세요.</small><div>${pinned().map((key,index)=>`<button data-pin-slot="${index}" aria-pressed="${pinSlot===index}"><small>${index+1}</small>${key?styledName(key):'빈 칸'}</button>`).join('')}</div>`;
    }

    function catalogAssignPin(key) {
        if(!catalogVisible(key)||separateMaterials.has(key))return;
        const other=pins().indexOf(key), previous=pins()[pinSlot];
        pins()[pinSlot]=key;if(other>=0&&other!==pinSlot)pins()[other]=previous;
        queueImportantSave(180);onPin();catalogList();
    }

    function catalogSelect(key) {
        if(!listed(key))return;
        if(editing){catalogAssignPin(key);return;}
        inspected=key;catalogList();
        const detail=dialog.querySelector('.cl-resource-detail');
        const available=recipes.some(row=>row.key===key)||/^(spore|fossil)/.test(key);
        const label=['fossil','fossilPrimal','fossilAncientPrimal'].includes(key)?'정제·복원 열기':'제작실에서 선택';
        const state=useState(key), blocked=state&&!state.enabled;
        detail.innerHTML=`<div><strong>${styledName(key)}</strong><p>${catalogDescription(key)}</p>${blocked?`<small class="cl-use-reason">${esc(state.reason)}</small>`:''}</div>${available?`<button type="button" data-apply ${blocked?'disabled':''}>${label}</button>`:''}`;
        detail.hidden=false;
        const selectedCard=dialog.querySelector(`[data-resource="${key}"]`);
        if(selectedCard){selectedCard.focus({preventScroll:true});selectedCard.scrollIntoView({block:'nearest',inline:'nearest'});}
    }

    function catalogClose() {dialog.close();document.getElementById(openerId)?.focus({preventScroll:true});}

    function catalogRenderNavigation() {
        dialog.querySelector('#cl-catalog-title').textContent=craftingOnly?'제작 재화 선택':'재화 인벤토리';
        if(craftingOnly&&category==='spore')category='all';
        dialog.querySelectorAll('[data-category]').forEach(tab=>{
            tab.hidden=craftingOnly&&tab.dataset.category==='spore';
            tab.setAttribute('aria-pressed',String(tab.dataset.category===category));
        });
    }

    function catalogOpen(available, callback, settings={}) {
        recipes=available;onSelect=callback;onPin=settings.onPin;active=settings.active||'';inspected='';editing=!!settings.edit;
        craftingOnly=!!settings.craftingOnly;
        useState=settings.useState;
        openerId=document.activeElement?.id||'cl-catalog-open';
        catalogCapture();if(!dialog)catalogCreate();
        catalogRenderNavigation();
        query='';dialog.querySelector('input[type="search"]').value='';
        dialog.querySelector('.cl-resource-detail').hidden=true;catalogList();dialog.querySelector('.cl-resource-list').scrollTop=0;if(!dialog.open)dialog.showModal();
        catalogSelectOpeningResource(settings.inspect);
    }

    function catalogSelectOpeningResource(key) {
        const target=key||active;
        if(!editing&&listed(target))catalogSelect(target);
    }

    function catalogClick(event) {
        const button=event.target.closest('button');if(!button)return;
        if(button.hasAttribute('data-close'))return catalogClose();
        if(button.hasAttribute('data-apply')){if(catalogVisible(inspected)){catalogClose();onSelect(inspected);}return;}
        if(button.dataset.resource)return catalogSelect(button.dataset.resource);
        if(button.hasAttribute('data-edit')){editing=!editing;dialog.querySelector('.cl-resource-detail').hidden=true;catalogRenderPins();catalogList();return;}
        if(button.hasAttribute('data-pin-slot')){pinSlot=Number(button.dataset.pinSlot);catalogList();return;}
        category=button.dataset.category;
        dialog.querySelector('.cl-resource-detail').hidden=true;
        catalogRenderNavigation();catalogList();
    }

    function catalogCreate() {
        dialog=document.createElement('dialog');dialog.className='cl-catalog';dialog.setAttribute('aria-labelledby','cl-catalog-title');
        dialog.innerHTML=`<header><div><small>보관함</small><h2 id="cl-catalog-title">재화 인벤토리</h2></div><div><button type="button" data-edit>주 재화 편집</button><button type="button" data-close aria-label="재화 목록 닫기">닫기</button></div></header>
            <div class="cl-pin-editor" hidden></div>
            <nav aria-label="재화 분류">${groups.map(([key,label])=>`<button type="button" data-category="${key}" data-theme="${key}" aria-pressed="${key===category}">${label}</button>`).join('')}</nav>
            <div class="cl-resource-tools"><input type="search" aria-label="재화 검색" placeholder="이름·효과 검색"><label><input type="checkbox"> 소진한 재화도 보기</label><small class="cl-resource-count"></small></div>
            <div class="cl-resource-list"></div><aside class="cl-resource-detail" tabindex="-1" hidden></aside>`;
        document.body.append(dialog);
        dialog.addEventListener('click',catalogClick);
        dialog.addEventListener('input',event=>{
            if(event.target.type==='search')query=event.target.value.trim();
            else ownedOnly=!event.target.checked;
            catalogList();
        });
        dialog.addEventListener('cancel',()=>document.getElementById(openerId)?.focus({preventScroll:true}));
    }
    return {open:catalogOpen,name,styledName,description:catalogDescription,theme,capture:catalogCapture,pinned};
})();

safeExposeGlobals({ craftingCatalogUi });
