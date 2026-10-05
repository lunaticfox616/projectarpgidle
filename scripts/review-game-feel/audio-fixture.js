// Review-only instrumentation of real Web Audio nodes; never loaded by the game.
(() => {
    const frame = document.querySelector('iframe'), output = document.querySelector('#audio-status');
    const labels = {hitPhysical:'근접 타격',hitProjectile:'투사체 적중',hitMagic:'마법 적중',hitCritical:'강한 타격',
        playerHurt:'플레이어 피격',kill:'일반 처치',killElite:'정예 처치',killBoss:'보스 처치',
        potBreak:'항아리 파괴',woodBreak:'목재 파괴',chestOpen:'상자 개봉',
        lootMajor:'귀중품 드롭',levelUp:'레벨업',returnWarp:'귀환'};
    let owner = null, total = 0, active = 0, maximum = 0, decoded = 0, last = '없음', context = null;
    const previews = new Set(), cursors = new Map();
    let repeatJob = 0;
    const byteNames = new WeakMap(), bufferNames = new WeakMap(), recent = [];
    const auditionStatus = document.querySelector('#audio-audition-status');
    let sampleBank = null, expected = 0;
    function game() {
        const a = frame.contentWindow;
        if (!a.game || a.isStartupOverlayOpen() || a.isLoadingOverlayOpen()) throw Error('아래 게임 진입을 먼저 마쳐 주세요.');
        return a;
    }
    function instrument() {
        const a = frame.contentWindow;
        if (!a.AudioContext || owner === a.AudioContext.prototype) return;
        owner = a.AudioContext.prototype;
        const create = owner.createBufferSource, decode = owner.decodeAudioData;
        const fetch = a.fetch.bind(a);
        a.fetch = async (...args) => {
            const response = await fetch(...args);
            if (String(args[0]).includes('assets/audio/game-sfx-v2/')) {
                const read = response.arrayBuffer.bind(response);
                response.arrayBuffer = async () => {
                    const bytes = await read();
                    byteNames.set(bytes, String(args[0]).split('/').pop().split('?')[0]);
                    return bytes;
                };
            }
            return response;
        };
        owner.decodeAudioData = function(...args) {
            return decode.apply(this,args).then(buffer => {decoded++;bufferNames.set(buffer,byteNames.get(args[0]));return buffer;});
        };
        owner.createBufferSource = function() {
            context = this;
            const source = create.call(this), start = source.start.bind(source);
            source.start = (...args) => {
                start(...args); total++; active++; maximum = Math.max(maximum,active);
                const file = bufferNames.get(source.buffer) || '이름 미확인';
                last = `${file} · ${source.buffer.duration.toFixed(2)}초`;
                recent.push(file);if(recent.length>6)recent.shift();
                source.addEventListener('ended',()=>{active--;},{once:true});
            };
            return source;
        };
    }
    function action(fn) {
        try { fn(game()); }
        catch(error) { output.textContent=error.message;console.error(error); }
    }
    document.querySelector('#audio-enable').onclick = () => action(a => {
        a.game.settings.uiSounds=true;a.document.querySelector('#chk-ui-sounds').checked=true;
        a.playUiFeedbackSound.syncSettings();
    });
    document.querySelector('#audio-mute').onclick = () => action(a => {
        stopPreview();
        a.game.settings.uiSounds=false;a.document.querySelector('#chk-ui-sounds').checked=false;
        a.playUiFeedbackSound.syncSettings();
    });
    document.querySelector('#audio-burst').onclick = () => action(a => {
        stopPreview();
        for(let i=0;i<100;i++)a.playUiFeedbackSound('hitPhysical');
        a.playUiFeedbackSound('killBoss');a.playLootDropSound(true);
    });
    for(const [kind,label] of Object.entries(labels)) {
        const button=document.createElement('button');button.textContent=label;
        button.onclick=()=>action(a=>{stopPreview();a.playUiFeedbackSound(kind);});
        document.querySelector('#audio-samples').append(button);
    }
    function stopPreview() {
        clearInterval(repeatJob);repeatJob=0;
        for(const player of previews)player.pause();
        previews.clear();
    }
    function preview(spec,index) {
        if(previews.size>=4)return;
        const file=spec.files[index],player=new Audio(`/assets/audio/game-sfx-v2/${file}`);
        player.volume=.55*spec.gain;previews.add(player);
        player.addEventListener('ended',()=>{if(!previews.delete(player))return;if(!previews.size&&!repeatJob)auditionStatus.textContent=`${spec.label} · 재생 완료`;});
        player.addEventListener('playing',()=>{if(!previews.has(player)){player.pause();return;}auditionStatus.textContent=`${spec.label} · 변주 ${'ABC'[index]} · 재생 중`;});
        player.play().catch(error=>{if(!previews.delete(player))return;auditionStatus.textContent=error.message;console.error(error);});
    }
    function nextPreview(spec) {
        const key=spec.files.join('|'),index=cursors.get(key)||0;
        preview(spec,index);cursors.set(key,(index+1)%spec.files.length);
    }
    function updateVariants() {
        const spec=sampleBank?.[document.querySelector('#audio-family').value];
        ['a','b','c'].forEach((letter,index)=>{document.querySelector('#audio-family-'+letter).disabled=!spec||index>=spec.files.length;});
    }
    function selected() {
        return sampleBank?.[document.querySelector('#audio-family').value];
    }
    fetch('/assets/audio/game-sfx-v2/bank.json?v=20261006-rare-silent').then(response=>{
        if(!response.ok)throw Error('원본 목록을 불러오지 못했습니다.');
        return response.json();
    }).then(bank=>{
        sampleBank=bank;expected=new Set(Object.values(bank).flatMap(spec=>spec.files)).size;
        for(const [key,spec] of Object.entries(bank).filter(([,spec])=>spec.label)) {
            const option=document.createElement('option');option.value=key;option.textContent=spec.label;
            document.querySelector('#audio-family').append(option);
        }
        for(const key of ['levelUp','hitLightArc','hitLightBurst','lootMajor','hitPhysical','hitProjectile','hitFireBurst','hitColdBurst','hitVenom','hitChaosPulse']) {
            const button=document.createElement('button');button.textContent=bank[key].label;
            button.onclick=()=>{stopPreview();document.querySelector('#audio-family').value=key;updateVariants();nextPreview(bank[key]);};
            document.querySelector('#audio-quick').append(button);
        }
        updateVariants();auditionStatus.textContent=`새 효과음 ${expected}개 · 바로 들어볼 수 있습니다`;
    }).catch(error=>{auditionStatus.textContent=error.message;console.error(error);});
    document.querySelector('#audio-family').onchange=()=>{stopPreview();updateVariants();};
    document.querySelector('#audio-family-play').onclick=()=>{stopPreview();if(selected())nextPreview(selected());};
    document.querySelector('#audio-stop').onclick=()=>{stopPreview();auditionStatus.textContent='재생 정지';};
    document.querySelector('#audio-repeat').onclick=()=>{
        stopPreview();const spec=selected();if(!spec)return;
        let left=5;nextPreview(spec);
        repeatJob=setInterval(()=>{nextPreview(spec);if(--left===0){clearInterval(repeatJob);repeatJob=0;}},333);
    };
    for(const [id,index] of [['audio-family-a',0],['audio-family-b',1],['audio-family-c',2]]) {
        document.querySelector('#'+id).onclick=()=>{
            const spec=sampleBank?.[document.querySelector('#audio-family').value];
            if(!spec)return;
            stopPreview();preview(spec,index);
        };
    }
    function skillOptions() {
        const select=document.querySelector('#audio-skill');select.replaceChildren();
        for(const [name,skill] of Object.entries(frame.contentWindow.SKILL_DB || {})) {
            if(!skill.tags?.some(tag=>['attack','spell','summon'].includes(tag)))continue;
            const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);
        }
    }
    document.querySelector('#audio-skill-play').onclick=()=>action(a=>{
        stopPreview();const name=document.querySelector('#audio-skill').value;
        const now=a.performance.now();
        a.worldTreeSkillFx.feedback.observe({type:'hit',skillName:name,element:a.SKILL_DB[name].ele,damage:10,start:now},now);
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPreview();});
    frame.addEventListener('load',()=>{instrument();skillOptions();});instrument();skillOptions();
    setInterval(()=>{
        if(!owner)return;
        output.textContent=`효과음 ${frame.contentWindow.game?.settings?.uiSounds===false?'OFF':'ON'} · 디코딩 ${decoded}/${expected} · 실제 재생 ${total}회 · 동시 ${active} / 최대 ${maximum} · AudioContext ${context?.state || '입력 대기'} · 최근 ${last}`;
        document.querySelector('#audio-sequence').textContent=recent.join(' → ');
    },150);
})();
