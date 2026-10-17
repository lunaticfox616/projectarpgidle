/** 로컬 테스트 패널. 127.0.0.1/localhost 에서 주소 끝에 ?dev=1 을 붙여 열 때만 나타난다(배포판·앱에서는 없음).
 * 직업·스킬룬·캐릭터 스프라이트·이펙트 스타일·무적·배속·레벨·액트를 바로 바꿔
 * 새 캐릭터와 스킬 이펙트, 스토리 장면을 확인한다. 저장 데이터를 바꾸므로 테스트용 세이브에서 쓴다.
 */
const devTestPanel = (() => {
    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    const SPEEDS = [1, 2, 4, 8];
    const WEAPON_MODES = [['auto', '착용 무기'], ['class', '직업 기본'], ['greatsword', '대검'], ['scimitar', '곡도'],
        ['shortbow', '단궁'], ['orb', '오브'], ['flask', '플라스크'], ['censer', '향로']];
    const STAGE_STANCES = [['auto', '착용 무기'], ['unarmed', '맨손'], ['swordshield', '검방패'], ['dagger', '단검'], ['bow', '활'],
        ['orb', '오브'], ['flask', '플라스크'], ['censer', '향로']];
    let root = null, godTimer = null, speed = 1;

    function isEnabled() {
        if (typeof location === 'undefined' || !LOCAL_HOSTS.has(location.hostname)) return false;
        return new URLSearchParams(location.search).get('dev') === '1';
    }
    function el(tag, props = {}, children = []) {
        const { dataset, ...rest } = props;
        const node = document.createElement(tag);
        Object.assign(node, rest);
        if (dataset) Object.assign(node.dataset, dataset);
        children.forEach(child => node.append(child));
        return node;
    }
    function button(label, onClick, extra = {}) {
        return el('button', { type: 'button', textContent: label, onclick: onClick, ...extra });
    }
    function section(title, rows) { return el('section', {}, [el('h4', { textContent: title }), ...rows]); }
    function row(children) { return el('div', { className: 'dtp-row' }, children); }
    function note(text) { log(text); status(); }
    function log(text) { if (typeof addLog === 'function') addLog(`🧪 ${text}`, 'season-up'); }
    function refresh() { if (typeof updateStaticUI === 'function') updateStaticUI(); }

    // ------------------------------------------------------------------ actions
    function chooseClass(classId) {
        applyHeroSelection(classId, { alignTalent: true });
        if (typeof hanaActors === 'object') hanaActors.preload(classId);
        refresh();
        note(`직업: ${PLAYER_CLASS_DEFS[classId].label}`);
    }
    function equipGem(name) {
        if (!SKILL_DB[name]) return;
        game.skills = Array.isArray(game.skills) ? game.skills : [];
        if (!game.skills.includes(name)) game.skills.push(name);
        changeSkill(name);
        note(`룬 장착: ${name}`);
    }
    function setSetting(key, value, label) {
        game.settings[key] = value;
        note(label);
    }
    function toggleGodMode(on) {
        clearInterval(godTimer);
        godTimer = on ? setInterval(() => {
            if (game.playerHp > 0) game.playerHp = getPlayerHpCap(getUiPlayerStats());
        }, 200) : null;
        note(on ? '무적 켬' : '무적 끔');
    }
    function setSpeed(value) {
        speed = setTestCombatSpeed(value);
        root.querySelectorAll('[data-speed]').forEach(node => node.classList.toggle('on', Number(node.dataset.speed) === speed));
        note(`배속 ×${speed}`);
    }
    function addLevels(count) {
        for (let i = 0; i < count && game.level < MAX_PLAYER_LEVEL; i++) { game.level++; game.passivePoints++; }
        game.exp = 0;
        game.playerHp = getPlayerHpCap(getUiPlayerStats());
        checkUnlocks();
        refresh();
        note(`레벨 ${game.level}`);
    }
    /** 그루터기 함: 액트 10을 깨지 않고 받기, 씨앗·수액 몇 개, 판 위 아이템 처치 100회분 성장. */
    function grantStumpBox() {
        const box = stumpBox.of(game);
        if (!box.acquired) { box.acquired = true; box.via = 'dev'; }
        contentProgression.sync(game);
        checkUnlocks();
        refresh();
        note('그루터기 함 지급');
    }
    function giveStumpItems() {
        if (!game.stumpBox.acquired) grantStumpBox();
        const colors = Object.keys(STUMP_BOX_COLORS);
        const made = Array.from({ length: 8 }, (_, i) => stumpBox.createItem(game, { family: i % 3 ? 'seed' : 'sap', color: colors[i % 4], roll: 0.8 + Math.random() * 0.4 }));
        refresh();
        note(`씨앗/수액 ${made.filter(Boolean).length}개`);
    }
    function growStumpBox() {
        for (let i = 0; i < 100; i++) stumpBox.grow(game, {});
        refresh();
        note('그루터기 함 성장 +100');
    }
    /** 효과 확장 +N for the active skill (rules only for now — items, inner growth and the keystone come later). */
    function setExpansion(n) {
        const level = skillEffectExpansion.setTestLevel(n);
        root.querySelectorAll('[data-expand]').forEach(node => node.classList.toggle('on', Number(node.dataset.expand) === level));
        refresh();
        note(level ? `효과 확장 +${level}${level >= 2 ? ' (피해 −30%)' : ''}` : '효과 확장 없음');
    }
    /** 방 단위 이동(js/act-exploration-doors.js)을 켜고 끈다. 지금 액트의 지도를 처음부터 다시 열어 바로 보이게 한다. */
    function setStageRooms(value) {
        game.settings.stageRooms = value;
        if (getZone(game.currentZoneId)?.type === 'act') changeZone(game.currentZoneId);
        refresh();
        note(value === 'off' ? '지도: 이어진 지도' : '지도: 방 단위 이동');
    }
    /** 시야 방식(js/act-exploration-sight.js): 'fog'면 어느 지역의 방이든 시야 반경과 안개로 걷는다(지역 정의가 켠 지역이 걷는 방식을
     * 미리 본다). 걷던 탐험도 다음 걸음부터 그 방식을 따른다. */
    function setStageSight(value) {
        game.settings.stageSight = value;
        refresh();
        note(value === 'fog' ? '시야: 반경과 안개(특수 지역 방식)' : '시야: 방 전체(바탕)');
    }
    /** 방 크기 덧칸(data/stage-view.js STAGE_ROOMS.grow)을 바꾸고 지금 액트의 지도를 그 크기로 다시 연다. */
    function setStageRoomSize(key, value, label) {
        game.settings[key] = value;
        if (getZone(game.currentZoneId)?.type === 'act') changeZone(game.currentZoneId);
        refresh();
        note(label);
    }
    /** 새 세이브로는 닿지 못하는 구역(혼돈, 영역, 고정 전장)의 무대를 바로 보기 위한 시험 입장: 입장 조건을 보지 않고 그 구역의 전투를
     * 새로 연다. 낮은 레벨로 들어가므로 무적을 함께 켠다. 로컬 테스트 전용. 심화 혼돈은 루프가 낮으면 게임이 얕은 층으로 되돌려 넣지 않았다. */
    const TEST_ZONES = Object.freeze([
        ['혼돈 3층', () => getAbyssZoneIdForDepth(3)], ['1차 전직 시련', () => 'trial_1'],
        ['창공의 탑', () => SKY_TOWER_ZONE_ID], ['지하계', () => UNDERWORLD_ZONE_ID], ['고대 미궁', () => LABYRINTH_ZONE_ID], ['혼돈계', () => CHAOS_REALM_ZONE_ID],
        ['벌집 원정', () => 'beehive_run', startTestBeehive], ['케르베로스', () => 's6_beast_cerberus'],
        // 2026-10-13 밤: 판에서 싸우다 방 단위 지도를 걷게 된 콘텐츠, 그리고 아틀라스(지도 한 장과 수호자)
        ['우주계', null, startTestCosmos], ['심해', null, () => startTestOcean(120)], ['심해 가디언', null, () => startTestOcean(500)],
        ['경계 너머', null, startTestBoundary], ['군락지', null, startTestColony], ['대균열', null, startTestBreach],
        ['혼돈 밖', () => OUTSIDE_CHAOS_ZONE_ID], ['나무꾼의 잔상', null, startTestEcho],
        ['아틀라스 지도', null, () => startTestAtlas('map')], ['아틀라스 수호자', null, () => startTestAtlas('guardian')]
    ]);
    /** 벌집 원정은 구역만 바꾸면 갈림길 없이 빈 지도가 열린다: 열쇠 하나를 주고 원정을 시작해 첫 갈림길 창을 연다. */
    function startTestBeehive() {
        if (game.beehive && game.beehive.inRun) return;
        game.currencies.hiveKey = (game.currencies.hiveKey || 0) + 1;
        startBeehiveRun();
        openBeehiveChoiceOverlay('시험 입장');
    }
    /** 그 구역의 전투를 새로 연다(입장 조건을 보지 않는다). */
    function openTestZone(id) {
        actExplorationProgress.depart(game);
        game.currentZoneId = id;
        game.enemies = [];
        game.encounterPlan = [];
        game.runProgress = 0;
        game.moveTimer = 0;
        game.combatHalted = false;
        ensureEncounterRun();
    }
    /** 아래의 시험 입장들은 그 콘텐츠가 열려 있는 것처럼 상태를 만들어 들어간다(입장 재료는 받지 않는다). */
    function startTestCosmos() {
        game.cosmosAtlas.activeChallenge = { nodeId: null, galaxy: 1, name: '시험 행성', tier: 5, lootTier: 1, gravity: 1.2, sizeClass: 2, tag: '', theme: '',
            mechanicId: '', ele: 'chaos', directive: null };
        game.killsInZone = 0;
        openTestZone('cosmos_challenge');
    }
    /** depth: 잠수를 시작하는 수심(m). 500이면 그 경계의 가디언이 기다린다. */
    function startTestOcean(depth) {
        const ocean = ensureOceanState(), oxygen = Math.max(1, Math.floor(getOceanOxygenMax()));
        Object.assign(ocean, { unlocked: true, diving: true, checkpointM: depth, depthM: depth, bossClearM: 0, oxygenMax: oxygen, oxygenCur: oxygen,
            drowning: false, drownSec: 0, lastTickAt: getCombatTime() });
        openTestZone(OCEAN_ZONE_ID);
    }
    function startTestBoundary() {
        const boundary = ensureBeyondBoundaryState(game);
        boundary.activeRun = { tier: boundary.selectedTier, wave: 1, sealId: boundary.selectedSealId, rewardFocusId: boundary.selectedRewardFocusId,
            intensityId: boundary.selectedIntensityId, returnZoneId: Number.isInteger(game.currentZoneId) ? game.currentZoneId : 0 };
        openTestZone(BEYOND_BOUNDARY_ZONE_ID);
    }
    function startTestColony() {
        if (game.colony.inRun) return;
        game.currencies.colonyTrace = (game.currencies.colonyTrace || 0) + 1;
        startColonyRun();
    }
    function startTestBreach() {
        game.voidRift.grandBreachUnlock = true;
        enterGrandBreach();
    }
    function startTestEcho() {
        Object.assign(ensureWoodsmanEchoRunState(), { active: true, duration: 30, timeLeft: 30, lastTickAt: getCombatTime(), totalDamage: 0 });
        openTestZone(WOODSMAN_ECHO_ZONE_ID);
    }
    /** kind: 'map' 일반 지도, 'guardian' 지역 수호자의 투기장. 지도석 하나를 만들어 지도 장치가 여는 것과 같은 길로 연다. 지도 장치는 이번 루프의
     * 혼돈 20 클리어를 보므로 그 기록을 켠다(시험 저장에 남는다). */
    function startTestAtlas(kind) {
        if (game.atlas.run) atlasRun.abandon();
        const node = atlas.nodes.find(row => row.kind === kind), map = atlasMaps.create(node.id, node.tier, 'normal');
        map.uid = game.atlas.nextUid++;
        game.atlas.unlocked = true;
        game.loopProgressCurrent.chaos20Cleared = true;
        game.atlas.stash.push(map);
        const reason = atlasRun.open(map.uid);
        if (reason) note(reason);
    }
    function enterTestZone(index) {
        const [name, zoneId, start] = TEST_ZONES[index] || [];
        if (!name) return;
        const box = root.querySelector('#dtp-god');
        if (box && !box.checked) { box.checked = true; toggleGodMode(true); }
        if (start) { start(); refresh(); note(`${name} 시험 입장(무적 켬)`); return; }
        const id = zoneId();
        // 혼돈의 층은 가 본 깊이까지만 열려 있다: 액트 이동과 같이 기록을 그 층까지 올려 둔다
        if (typeof id === 'number') game.maxZoneId = Math.max(game.maxZoneId || 0, id);
        game.currentZoneId = id;
        game.enemies = [];
        game.actExploration = null;
        game.encounterPlan = [];
        game.runProgress = 0;
        ensureEncounterRun();
        refresh();
        note(`${name}에 시험 입장(무적 켬)`);
    }
    function travelToAct(order) {
        const zoneId = order - 1;
        game.maxZoneId = Math.max(game.maxZoneId || 0, zoneId);
        changeZone(zoneId);
        refresh();
        note(`액트 ${order}(으)로 이동`);
    }

    // ------------------------------------------------------------------ markup
    function gemLabel(name) {
        const id = SKILL_FX_ATLAS[name]?.id;
        return id ? `${String(id).padStart(2, '0')} ${name}` : name;
    }
    function gemGroup(name) {
        const tags = SKILL_DB[name].tags || [];
        if (tags.includes('summon_attack')) return '소환';
        if (tags.includes('mobility')) return '이동 스킬(따로 장착)';
        if (SKILL_DB[name].nativeCastId) return '전용 시전(44~51)';
        return tags.includes('spell') ? '주문' : '공격';
    }
    function gemSelect() {
        const select = el('select', { id: 'dtp-gem' });
        const groups = new Map();
        Object.keys(SKILL_DB).filter(name => SKILL_DB[name].isGem).forEach(name => {
            const group = gemGroup(name);
            if (!groups.has(group)) groups.set(group, el('optgroup', { label: group }));
            groups.get(group).append(el('option', { value: name, textContent: gemLabel(name) }));
        });
        groups.forEach(group => select.append(group));
        select.value = SKILL_DB[game.activeSkill]?.isGem ? game.activeSkill : '이중 베기';
        return select;
    }
    function classRow() {
        return row(Object.keys(PLAYER_CLASS_DEFS).map(id => button(PLAYER_CLASS_DEFS[id].label, () => chooseClass(id))));
    }
    function weaponSelect() {
        const select = el('select', { id: 'dtp-weapon' }, WEAPON_MODES.map(([value, label]) => el('option', { value, textContent: label })));
        select.value = game.settings.heroWeaponMode || 'auto';
        select.onchange = () => setSetting('heroWeaponMode', select.value, `무기: ${select.selectedOptions[0].textContent}`);
        return select;
    }
    function characterSection() {
        return section('캐릭터', [classRow(), row([
            button('Hana 스프라이트', () => setSetting('heroSpriteSet', 'hana', '캐릭터: Hana +6')),
            button('기존 스프라이트', () => setSetting('heroSpriteSet', 'legacy', '캐릭터: 기존'))
        ]), row([el('label', { textContent: '무기' }), weaponSelect()])]);
    }
    /** 무대 몬스터(js/canvas-stage-roster.js): 지금 나오는 몬스터를 모두 한 가지 모습으로 바꿔 보기(새 그림이 있는 몬스터 아무나
     * 실제 전투에서 본다). */
    function monsterRows() {
        const look = el('select', { id: 'dtp-monster-look' }, [el('option', { value: '', textContent: '원래 모습' }),
            ...stageRoster.looks().map(([value, label]) => el('option', { value, textContent: label }))]);
        look.value = game.settings.stageMonsterLook || '';
        look.onchange = () => setSetting('stageMonsterLook', look.value, `몬스터 모습: ${look.selectedOptions[0].textContent}`);
        return [row([el('label', { textContent: '몬스터 모습' }), look])];
    }
    /** 옆에서 보는 무대 시험판(data/stage-view.js): 켜고 끄기, 지도 칸 크기, 들 자세. 그림 폴더(assets/playable/stage)가 있어야 켜진다. */
    function stageSection() {
        const stance = el('select', { id: 'dtp-stance' }, STAGE_STANCES.map(([value, label]) => el('option', { value, textContent: label })));
        stance.value = game.settings.stageStance || 'auto';
        stance.onchange = () => setSetting('stageStance', stance.value, `무대 자세: ${stance.selectedOptions[0].textContent}`);
        return section('옆에서 보는 무대(시험판)', [
            row([button('무대 켜기', () => setSetting('battleView', 'stage', '전장: 옆에서 보는 무대')),
                button('끄기', () => setSetting('battleView', 'top', '전장: 위에서 보기'))]),
            row([el('label', { textContent: '크기' }), button('자동', () => setSetting('stageZoom', 0, '무대 크기: 자동')),
                ...[1, 1.5, 2].map(zoom => button(`×${zoom}`, () => setSetting('stageZoom', zoom, `무대 크기 ×${zoom}`)))]),
            row([el('label', { textContent: '자세' }), stance]),
            row([el('label', { textContent: '지도' }), button('방 단위', () => setStageRooms('on')), button('이어진 지도', () => setStageRooms('off'))]),
            // 단추에는 보통 방의 가로 칸 수를 적는다(전에는 덧칸 0이 '기본'이라고 적혀, 가장 작은 크기가 기본처럼 보였다)
            row([el('label', { textContent: '방 가로' }), ...STAGE_ROOMS.wideSteps.map(step => button(`${STAGE_ROOMS.slot + step}칸`,
                () => setStageRoomSize('stageRoomWide', step, `방 가로: ${STAGE_ROOMS.slot + step}칸`)))]),
            row([el('label', { textContent: '방 깊이' }), ...STAGE_ROOMS.deepSteps.map(step => button(`${STAGE_ROOMS.depth + step}칸`,
                () => setStageRoomSize('stageRoomDeep', step, `방 깊이: ${STAGE_ROOMS.depth + step}칸`)))]),
            // 방 놓임새(data/stage-room-plans.js): 액트는 프리셋 넷 가운데 하나가 소프트 랜덤으로 나온다. 여기서 하나를 못박거나 준 랜덤으로 짜 볼 수 있다.
            row([el('label', { textContent: '놓임새' }), button('자동', () => setStageRoomSize('stageRoomPlan', 'auto', '방 놓임새: 자동(프리셋 넷 가운데)')),
                ...[1, 2, 3, 4].map(index => button(String(index), () => setStageRoomSize('stageRoomPlan', index, `방 놓임새: 프리셋 ${index}`))),
                button('준 랜덤', () => setStageRoomSize('stageRoomPlan', 'random', '방 놓임새: 준 랜덤'))]),
            row([el('label', { textContent: '시야' }), button('방 전체', () => setStageSight('room')), button('반경과 안개', () => setStageSight('fog'))]),
            row([el('label', { textContent: '뒤쪽' }), button('배경 그림', () => setSetting('stageBackdrop', 'on', '방 뒤쪽: 배경 그림')),
                button('벽돌 벽', () => setSetting('stageBackdrop', 'off', '방 뒤쪽: 벽돌 벽'))]),
            // 무대의 스킬 이펙트(js/canvas-stage-skill-vfx.js): 인계 받은 새 클립과 시전 마법진. 끄면 예전 이펙트가 나온다.
            row([el('label', { textContent: '이펙트' }), button('새 그림', () => setSetting('stageSkillFx', 'on', '무대 스킬 이펙트: 새 그림')),
                button('예전 그림', () => setSetting('stageSkillFx', 'off', '무대 스킬 이펙트: 예전 그림'))]),
            ...monsterRows()
        ]);
    }
    function gemSection() {
        const select = gemSelect();
        return section('스킬 이펙트', [
            row([select, button('장착', () => equipGem(select.value))]),
            row([button('리메이크(16도트)', () => setSetting('skillFxStyle', 'remake', '이펙트: 리메이크')),
                button('원본 v3.38', () => setSetting('skillFxStyle', 'original', '이펙트: 원본'))]),
            row([el('label', { textContent: '효과 확장' }), ...['없음', '+1', '+2'].map((label, n) =>
                button(label, () => setExpansion(n), { dataset: { expand: String(n) } }))])
        ]);
    }
    function combatSection() {
        const god = el('input', { type: 'checkbox', id: 'dtp-god', onchange: () => toggleGodMode(god.checked) });
        return section('전투', [
            row([el('label', { htmlFor: 'dtp-god' }, [god, ' 무적(생명력 유지)'])]),
            row(SPEEDS.map(value => button(`×${value}`, () => setSpeed(value), { dataset: { speed: String(value) } })))
        ]);
    }
    function progressSection() {
        const acts = el('select', { id: 'dtp-act' }, STORY_ACTS.map(act => el('option', { value: String(act.order), textContent: `액트 ${act.displayAct}, ${act.title}` })));
        const zones = el('select', { id: 'dtp-zone' }, TEST_ZONES.map(([name], index) => el('option', { value: String(index), textContent: name })));
        return section('진행', [
            row([button('레벨 +1', () => addLevels(1)), button('레벨 +5', () => addLevels(5)), button('레벨 +20', () => addLevels(20))]),
            row([acts, button('이동', () => travelToAct(Number(acts.value)))]),
            row([zones, button('시험 입장', () => enterTestZone(Number(zones.value)))]),
            row([button('그루터기 함 받기', grantStumpBox), button('씨앗/수액 +8', giveStumpItems), button('함 성장 +100', growStumpBox)])
        ]);
    }
    function status() {
        const line = root && root.querySelector('.dtp-status');
        if (!line) return;
        const sprite = game.settings.heroSpriteSet === 'legacy' ? '기존' : 'Hana';
        const fx = game.settings.skillFxStyle === 'original' ? '원본' : '리메이크';
        line.textContent = `${PLAYER_CLASS_DEFS[game.selectedClassId]?.label || '-'}, ${game.activeSkill}${game.mobilitySkill ? ' + ' + game.mobilitySkill : ''}, ${weaponLabel()}, Lv.${game.level}, ${sprite}, 이펙트 ${fx}, ×${speed}`;
    }
    function weaponLabel() {
        const weapon = hanaActors.weaponFor(getHeroAppearanceId(), game.equipment['무기'], game.settings.heroWeaponMode || 'auto');
        return HANA_WEAPON_COMBOS.weapons[weapon]?.label || '-';
    }

    function mount() {
        const panel = el('div', { className: 'dtp-panel', hidden: true }, [
            el('header', {}, [el('strong', { textContent: '🧪 테스트 패널' }), button('닫기', () => { panel.hidden = true; })]),
            el('p', { className: 'dtp-status' }),
            characterSection(), stageSection(), gemSection(), combatSection(), progressSection(),
            el('p', { className: 'dtp-hint', textContent: '로컬 테스트 전용, 이 세이브에 바로 반영됩니다. 새 게임은 런처 2번(임시 세이브)으로.' })
        ]);
        const toggle = button('🧪 테스트', () => { panel.hidden = !panel.hidden; status(); }, { className: 'dtp-toggle' });
        root = el('div', { id: 'dev-test-panel' }, [el('style', { textContent: STYLE }), toggle, panel]);
        document.body.append(root);
        setSpeed(1);
        status();
    }
    // 왼쪽 아래는 하단 HUD(생명 구슬 · 휴대폰은 HUD와 하단 메뉴)라 그 위로 띄운다.
    const STYLE = `#dev-test-panel{--dtp-bottom:170px;position:fixed;left:10px;bottom:var(--dtp-bottom);z-index:30000;font:13px/1.45 'Malgun Gothic',sans-serif;color:#efe6cf}
@media (max-width:1080px){#dev-test-panel{--dtp-bottom:250px}}
#dev-test-panel button{background:#231d15;color:#f3dfae;border:1px solid #6b5431;border-radius:6px;padding:4px 8px;cursor:pointer}
#dev-test-panel button:hover,#dev-test-panel button.on{background:#4a3a1f;border-color:#d7b36f}
#dev-test-panel select{background:#15120e;color:#efe6cf;border:1px solid #6b5431;border-radius:6px;padding:3px;max-width:190px}
.dtp-toggle{font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.dtp-panel{position:absolute;left:0;bottom:40px;width:330px;max-height:min(72vh,calc(100vh - var(--dtp-bottom) - 72px));overflow:auto;padding:10px 12px;background:rgba(13,11,9,.95);border:1px solid #b58a48;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
.dtp-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.dtp-panel h4{margin:10px 0 4px;color:#d7b36f;font-size:12px;letter-spacing:.04em}
.dtp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:4px 0}
.dtp-status{margin:0;color:#b9d7c4;font-size:12px}.dtp-hint{margin:10px 0 0;color:#9c927c;font-size:11px}`;

    function init() { if (isEnabled() && !root) mount(); }
    return Object.freeze({ init, isEnabled, status });
})();
safeExposeGlobals({ devTestPanel });
document.addEventListener('DOMContentLoaded', () => devTestPanel.init(), { once: true });
