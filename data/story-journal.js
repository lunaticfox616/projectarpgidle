// Story text (2026-10-14 rewrite, docs/story-bible.md). Scenes play at act start and end and fill the journal
// (js/story-journal-ui.js); the room-stage lines are spoken over the battlefield (js/canvas-act-title-card.js);
// the unlock lines sit in the unlock window and the loop result (js/content-progression-ui.js, js/loop-ui.js).
const SUPPLIED_STORY_SCENES = Object.freeze([
    {"id":"prologue","title":"프롤로그: 밑거름의 우물","act":0,"phase":"start","journal":"prologue","image":"assets/journal/prologue.webp","lines":["세계수의 중정에서 뿌리내리지 못한 파편 하나가 밑거름의 우물로 버려졌습니다.","썩은 진흙과 부러진 가지들 속에서, 오직 당신만이 식지 않은 쇳소리를 내며 눈을 떴습니다."]},
    {"id":"act_2_end","title":"액트 2: 다시 추락하다","act":2,"phase":"end","journal":"act_2","image":"assets/journal/unified-20260910/act-2.webp","lines":["잔뿌리 매듭을 가르고 오른 중정에서, 부정한 은총의 부제녀가 길을 가로막았습니다.","그녀의 심장을 꿰뚫었으나 중정 바닥의 황금 수액관이 맥동하자 상처는 순식간에 다시 붙었고, 되살아난 일격에 당신은 아래쪽 허공뿌리로 추락했습니다."]},
    {"id":"act_3_start","title":"액트 3: 영원의 힘","act":3,"phase":"start","journal":"act_3","image":"assets/journal/unified-20260910/act-3.webp","lines":["추락한 허공뿌리 현수림의 가지들은 모든 수액을 중정으로 수탈당한 채 말라 죽어가고 있었습니다.","중정의 불멸을 지탱하는 황금 길의 수액 수송로가 이 굶주린 숲 너머 미궁으로 이어져 있었습니다."]},
    {"id":"act_4_end","title":"액트 4: 조력자의 정체","act":4,"phase":"end","journal":"act_4","image":"assets/journal/unified-20260910/act-4.webp","lines":["수액 운반선이 끊기자 부제녀의 상처는 더 이상 아물지 않았습니다.","피를 토하며 쓰러진 부제녀는, 당신을 우물에서 건져 올린 지주근의 주인이 구원자가 아니라 당신을 무기로 벼려낸 장본인임을 폭로했습니다."]},
    {"id":"act_5_end","title":"액트 5: 뿌리가 만든 길","act":5,"phase":"end","journal":"act_5","image":"assets/journal/unified-20260910/act_5.webp","lines":["지주근의 드루이드 하켄은 자신의 심장을 꿰뚫은 궤적에서 나무꾼의 첫 번째 날붙이를 읽어냈습니다.","그는 마지막 생명력을 끌어모아 거대한 받침뿌리들을 맞물렸고, 무너진 중정으로 직행하는 보랏빛 다리를 놓아주었습니다."]},
    {"id":"act_6_end","title":"액트 6: 복수 그 이후","act":6,"phase":"end","journal":"act_6","image":"assets/journal/unified-20260910/act_6.webp","lines":["수액의 호혜를 잃은 정원사가 마침내 무릎을 꿇고, 그의 거대한 가위가 두 동강 났습니다.","그러나 가위가 부러지자 억눌려 있던 세계수의 모든 수액이 수관 꼭대기를 향해 폭주하기 시작했고, 바닥에 스민 지주근의 보랏빛 잔향이 속 빈 줄기를 가리켰습니다."]},
    {"id":"act_7_start","title":"액트 7: 속 빈 줄기","act":7,"phase":"start","journal":"act_7","image":"assets/journal/unified-20260910/act-7.webp","lines":["역류하는 수액을 따라 들어선 큰 줄기 내부의 도시는 이미 양분을 모두 빼앗겨 텅 비어 있었습니다.","썩어가는 어미나무에서 스스로를 도려내어 탈출하려는 삽목들의 행렬 사이로, 수관으로 향하는 나선 계단이 이어져 있었습니다."]},
    {"id":"act_8_start","title":"액트 8: 장막의 성소","act":8,"phase":"start","journal":"act_8","image":"assets/journal/unified-20260910/act-8.webp","lines":["줄기 끝을 넘어선 곳에는 이전 계절들의 흔적을 겹겹이 덮어둔 살아 있는 장막의 성소가 펼쳐져 있었습니다.","바닥에 박힌 녹슨 칼날들과 당신의 보폭과 정확히 겹치는 발자국들이, 이 등반이 처음이 아님을 무언으로 증언하고 있었습니다."]},
    {"id":"act_9_start","title":"액트 9: 황금빛 수관","act":9,"phase":"start","journal":"act_9","image":"assets/journal/unified-20260910/act-9-start.webp","lines":["장막이 걷히자 아래쪽 뿌리에서 끌어올린 모든 수액이 응집된 황금빛 수관이 모습을 드러냈습니다.","바깥의 도끼에 맞서기 위해 잘려 나간 아홉 가지를 하나로 꿰맨 거대한 고치가 수관 중심에서 맥동하고 있었습니다."]},
    {"id":"act_9_end","title":"액트 9: 고치에서 태어난 존재","act":9,"phase":"end","journal":"act_9","image":"assets/journal/unified-20260910/act-9-end.webp","lines":["고치를 지키던 접목의 어머니가 쓰러지자, 아홉 가지의 울음을 삼킨 고치의 외피가 갈라졌습니다.","그 안에서 깨어난 형상이 옅은 금빛 후광을 두른 채 세계수의 가장 높은 차륜으로 날아올랐습니다."]},
    {"id":"act_10_end","title":"액트 10: 손끝 사이","act":10,"phase":"end","journal":"act_10","image":"assets/journal/unified-20260910/act-10.webp","lines":["합일의 차륜 위에서 쓰러진 존재가 당신을 향해 힘없이 손을 뻗었습니다.","당신 또한 몸을 숙여 손을 내밀었으나, 맞닿지 못한 두 손끝의 작은 틈새로 계절의 나이테가 다시 감기기 시작했습니다."]}
]);

// Text-only scenes for beats the illustrated set skips. A scene added here after release needs the seen marker in
// js/story-journal-ui.js markPassedBridges raised, or saves already past its act get it out of order.
const STORY_BRIDGE_SCENES = Object.freeze([
    {"id":"act_1_start","title":"액트 1: 뿌리의 드루이드","act":1,"phase":"start","journal":"act_1","lines":["진흙 속에서 기어 나온 당신을 거둔 것은 뿌리끝 성소에 은둔하던 늙은 드루이드 하켄이었습니다.","우물 위쪽으로 향하는 수액 통로는 당신의 몸에서 배어 나오는 낯선 쇳내를 두려워한 잔뿌리들에 의해 겹겹이 봉쇄되어 있었습니다."]},
    {"id":"act_3_end","title":"액트 3: 접목사와 마른 수액관","act":3,"phase":"end","journal":"act_3","lines":["기근의 맹수가 쓰러진 자리 아래로, 하층의 수액을 빨아올려 중정으로 나르던 황금 길의 수송관이 드러났습니다.","잘린 가지들의 기억을 그루터기 함에 옮겨 심던 눈먼 접목사 베른은, 당신을 올려 보낸 드루이드 하켄의 눈빛이 구원자가 아니라 대장장이의 눈이었다고 나지막이 일러주었습니다."]},
    {"id":"act_7_end","title":"액트 7: 배교자와 도살자의 밀서","act":7,"phase":"end","journal":"act_7","lines":["줄기의 전령이 남긴 부러진 나팔 안쪽에서 정원사가 남긴 오래된 밀서가 발견되었습니다.","부제복의 금실을 뜯어낸 배교자 이벨은, 바깥의 도끼날에 나무 전체가 찍혀 넘어가지 않으려고 정원사가 아홉 가지를 쳐내어 모든 수액을 수관의 고치 하나로 모으려 했던 것이라 전했습니다."]},
    {"id":"act_8_end","title":"액트 8: 서른세 번의 손금","act":8,"phase":"end","journal":"act_8","lines":["순례자의 가면 아래에서 드러난 것은 수없이 되감긴 계절 동안 마모된 이전 회차의 당신 자신이었습니다.","수관 끝에서 두 손끝이 닿지 못할 때마다, 나무꾼과 세계수의 차륜이 계절의 나이테를 되감아 당신을 다시 우물 바닥의 모루로 던져 넣고 있었습니다."]}
]);

// Story order: the journal, the popups and the idle-return fold read it in this order.
const STORY_JOURNAL_SCENES = Object.freeze([
    SUPPLIED_STORY_SCENES[0],
    STORY_BRIDGE_SCENES[0],
    SUPPLIED_STORY_SCENES[1],
    SUPPLIED_STORY_SCENES[2],
    STORY_BRIDGE_SCENES[1],
    SUPPLIED_STORY_SCENES[3],
    SUPPLIED_STORY_SCENES[4],
    SUPPLIED_STORY_SCENES[5],
    SUPPLIED_STORY_SCENES[6],
    STORY_BRIDGE_SCENES[2],
    SUPPLIED_STORY_SCENES[7],
    STORY_BRIDGE_SCENES[3],
    SUPPLIED_STORY_SCENES[8],
    SUPPLIED_STORY_SCENES[9],
    SUPPLIED_STORY_SCENES[10]
]);

// The spoken lines of each journal entry (data/maps.js JOURNAL_DB) stay with the scene where they are said, before it
// (verdicts, last words) or after it (reflections).
const STORY_QUOTE_PLACEMENT = Object.freeze({
    prologue: ['prologue', 'before'], act_1: ['act_1_start', 'after'], act_2: ['act_2_end', 'after'], act_3: ['act_3_start', 'before'],
    act_4: ['act_4_end', 'before'], act_5: ['act_5_end', 'before'], act_6: ['act_6_end', 'before'],
    act_7: ['act_7_start', 'after'], act_8: ['act_8_start', 'after'], act_9: ['act_9_end', 'after'], act_10: ['act_10_end', 'after']
});

const STORY_SCENE_QUOTES = {};
for (const [entryId, [sceneId, placement]] of Object.entries(STORY_QUOTE_PLACEMENT)) {
    STORY_SCENE_QUOTES[sceneId] = Object.freeze({ lines: Object.freeze([...JOURNAL_DB[entryId].lines]), before: placement === 'before' });
}
Object.freeze(STORY_SCENE_QUOTES);

for (const entryId of new Set(STORY_JOURNAL_SCENES.map(scene => scene.journal))) {
    const scenes = STORY_JOURNAL_SCENES.filter(scene => scene.journal === entryId);
    JOURNAL_DB[entryId].title = scenes[0].title;
    JOURNAL_DB[entryId].lines = scenes.flatMap(scene => scene.lines);
    JOURNAL_DB[entryId].scenes = scenes.map(scene => scene.id);
}

// Spoken by the hero: eliteLine when the boss gate opens, bossLines[act] after the act boss falls.
const STORY_CLASS_ORIGINS = Object.freeze({
    warrior: Object.freeze({
        label: '전사 (부러진 근위병)',
        eliteLine: '“문지기치고는 가벼웠군. 보스 방 빗장이 풀리는 소리가 난다.”',
        bossLines: Object.freeze({
            1: '“겁먹은 뿌리들이군. 날붙이 맛을 본 적이 있다는 뜻이지.”',
            2: '“분명히 베었는데 바닥의 황금 관이 상처를 도로 붙이는군.”',
            3: '“굶주린 짐승 배 속에 정원사의 부러진 가위가 박혀 있군.”',
            4: '“수액 독이 깨지니 별수 없군. 성녀도 피는 똑같이 흘린다.”',
            5: '“날 망치로 두드렸다고? 덕분에 네 목을 칠 만큼 단단해졌다.”',
            6: '“가위가 무디더군, 정원사. 제 목 지키는 법은 잊었나 보지.”',
            7: '“도망치는 가지든 정원사든, 내 앞길만 막지 마라.”',
            8: '“바닥에 꽂힌 옛 대검 자루에 내 손과 같은 굳은살 자국이 있군.”',
            9: '“어미의 팔이 꺾이니 고치가 열리는군. 마지막은 맨 위인가.”',
            10: '“손 내밀지 마라. 내 손은 이미 너무 많은 것을 베어냈다.”'
        })
    }),
    wanderer: Object.freeze({
        label: '방랑자 (혀 뽑힌 처형인)',
        eliteLine: '“방해꾼 정리 완료. 이제 안쪽 주인장 얼굴 좀 보러 갈까.”',
        bossLines: Object.freeze({
            1: '“내가 쥐고 있는 게 단순한 쇠가 아니란 걸 아는 눈치네.”',
            2: '“심장이 아니라 바닥의 수액줄에 목숨을 묶어뒀군. 줄부터 끊자고.”',
            3: '“짐승 목덜미에 중정 수송대 낙인이 찍혀 있네. 꼴좋군.”',
            4: '“거봐, 수액 줄이 끊기면 성녀님도 똑같이 붉은 피를 흘린다니까.”',
            5: '“스승님 행세하더니 날 숫돌에 갈고 있었군. 취향 참 고약하네.”',
            6: '“도끼가 무서워서 가지를 쳤다고? 변명치고는 피를 너무 흘렸어.”',
            7: '“살겠다고 줄기를 찢고 나가다니, 중정 위선자들보단 훨씬 솔직하네.”',
            8: '“바닥에 찍힌 발자국 좀 봐. 보폭도 칼버릇도 전부 내 거잖아.”',
            9: '“울음소리로 빚은 왕관이라니, 화려하기보단 끔찍하군.”',
            10: '“손끝이 닿기 전에 먼저 베는 게 내 오랜 버릇이라서 말이야.”'
        })
    }),
    archer: Object.freeze({
        label: '궁수 (눈 먼 파수꾼)',
        eliteLine: '“막혀 있던 바람길이 트였어. 이제 보스 방으로 갈 수 있겠군.”',
        bossLines: Object.freeze({
            1: '“뿌리들이 내 화살촉의 쇳소리를 피해 스스로 엉켜 있었군.”',
            2: '“급소는 맞혔어. 바닥의 수액줄이 과녁을 되살리고 있다.”',
            3: '“현수림 아래로 중정에 수액을 나르는 금빛 관로가 내려다보인다.”',
            4: '“운반선이 끊기자 부제녀를 감싸던 금빛 아지랑이도 걷혔군.”',
            5: '“바깥에서 떨어진 날붙이, 그래서 내 눈이 늘 별을 향했던 거군.”',
            6: '“온실 천장이 무너진다, 정원사. 이제 역류하는 바람을 탈 차례다.”',
            7: '“속이 다 비었어. 바람이 텅 빈 줄기 안에서 울부짖는구나.”',
            8: '“안개 장막 바닥에 내가 쏘았던 화살촉들이 녹슨 채 박혀 있다.”',
            9: '“고치를 찢고 나온 금빛 형상이 가장 높은 차륜으로 날아올랐어.”',
            10: '“한 뼘 모자란 거리군. 저 틈을 넘으려면 시위를 더 당겨야겠어.”'
        })
    }),
    cleric: Object.freeze({
        label: '성직자 (파문당한 고해사제)',
        eliteLine: '“거짓 결계가 흩어졌습니다. 이제 심장부로 나아갈 시간입니다.”',
        bossLines: Object.freeze({
            1: '“두려움에 통로를 막았던 잔뿌리들이여, 이제 흙으로 돌아가소서.”',
            2: '“아랫것들의 피를 쥐어짜 만든 불멸이 어찌 축복일 수 있습니까.”',
            3: '“수액을 다 빼앗기고 굶주림만 남은 숲이군요. 맹수의 죄가 아닙니다.”',
            4: '“성수라 불리던 착취의 관이 끊겼으니, 필멸의 안식을 맞이하소서.”',
            5: '“복수의 연장으로 저를 거두셨으나, 당신의 고통도 거두어 드리리다.”',
            6: '“가위에 잘려 나간 수천 가지의 원혼이 당신의 목 앞에서 답하는군요.”',
            7: '“살기 위해 떠나는 삽목들의 발걸음을 누가 배신이라 부르겠습니까.”',
            8: '“장막의 기도문 끝자락마다 이전 계절의 제가 남긴 핏자국이 있군요.”',
            9: '“아이를 품은 어머니의 울음을 누가 죄라 부르겠습니까. 잠드소서.”',
            10: '“닿지 못한 구원의 손끝 사이로 또 한 번의 계절이 내려앉습니다.”'
        })
    }),
    occultist: Object.freeze({
        label: '비술사 (금서의 해독자)',
        eliteLine: '“관문 결계의 수액 회로가 끊겼군. 중심부로 진입한다.”',
        bossLines: Object.freeze({
            1: '“잔뿌리들이 두려워한 건 내 영혼에 섞인 외계의 금속 파장이었군.”',
            2: '“중정의 수액 회로가 죽음 자체를 기각하고 있어. 회로부터 끊어야겠군.”',
            3: '“현수림의 지맥이 미궁의 수송로 한곳으로 빨려 들어가고 있다.”',
            4: '“수송로가 차단되자 중정을 감싸던 불멸의 인과율이 붕괴하는군.”',
            5: '“나무꾼의 첫 번째 날붙이, 내 파장이 나무와 달랐던 이유가 밝혀졌군.”',
            6: '“억제기인 정원사가 사라지자 수액이 수관의 특이점으로 폭주하는군.”',
            7: '“줄기 내부의 괴사율은 임계점을 넘었다. 자가 절단은 필연적 진화야.”',
            8: '“데자뷰가 아니라 시간 단층의 중첩이다. 난 여길 수십 번 통과했어.”',
            9: '“아홉 삽목의 신경계를 접합한 고치라니, 절망이 빚은 실험체군.”',
            10: '“손끝이 닿으면 특이점이 닫히겠지. 아직 연산이 한 뼘 부족한가.”'
        })
    }),
    alchemist: Object.freeze({
        label: '연금술사 (이단 배양가)',
        eliteLine: '“좋은 시료였어. 보스 방 문에 걸린 응고 봉인도 녹아내렸군.”',
        bossLines: Object.freeze({
            1: '“부패 수액과 내 안의 강철이 반응해서 꽤 매운 열기를 뿜어내는데?”',
            2: '“고농도 황금 수액이 즉석에서 조직을 재합성하네. 공급관을 잠가야겠어.”',
            3: '“영양실조로 말라붙은 시료들이 중정의 수액관 하나만 빨아들이고 있었군.”',
            4: '“정제된 황금 수액 공급이 멎으니까 부제녀의 재생 반응도 괴사하네.”',
            5: '“날 불에 달구고 독에 담가 합금으로 만들었다고? 결과물은 마음에 들어.”',
            6: '“정원사의 피에 방부 수액이 가득해. 썩는 나무를 억지로 절여뒀던 거군.”',
            7: '“어미나무가 썩어가니 가지들이 스스로 세포를 끊고 도망치네.”',
            8: '“장막 섬유질마다 이전 실험체의 혈흔이 배어 있어. 그게 바로 나였고.”',
            9: '“아홉 개체를 한 고치에 접목하다니, 정원사 녀석이 더 지독한 실험가네.”',
            10: '“반응이 불완전하게 끝났어. 용광로가 이번 계절을 다시 녹이려나 본데.”'
        })
    })
});

// Room-stage lines per act (key: STORY_ACTS order; STORY_TRIAL_ENCOUNTERS below has the same shape per trial zone id): npc on
// entering the entry room, stele on entering a side room, boss intro once the final boss is up, half at 55% life, defeat
// when the map is cleared. Each line 50 characters at most (one line of the banner on PC).
const STORY_ACT_ENCOUNTERS = Object.freeze({
    1: Object.freeze({
        npc: Object.freeze({ name: '뿌리끝의 드루이드, 하켄', bubble: '「드루이드 하켄」', bark: '“네 몸의 쇳내를 두려워해 잔뿌리들이 길을 막고 있구나.”', tone: 'violet' }),
        stele: Object.freeze({ title: '진흙에 잠긴 파문 명패', bubble: '「파문 명패」', bark: '“뿌리내리지 못한 것은 우물의 밑거름이 될지어다. (중정 판결록 제1장)”' }),
        boss: Object.freeze({ intro: '「통로를 틀어막은 잔뿌리 매듭이 쇳내에 반응하며 꿈틀거린다.」', half: '「매듭이 끊어진 틈새로 지주근의 보랏빛 수액이 스며 나온다.」', defeat: '「잔뿌리가 절단되자 봉쇄되었던 중정행 수액 통로가 열린다.」' })
    }),
    2: Object.freeze({
        npc: Object.freeze({ name: '접목사 베른', bubble: '「접목사 베른」', bark: '“불씨와 서리는 나란히 심지 마라. 상극은 서로 숨을 멈춘단다.”', tone: 'gold' }),
        stele: Object.freeze({ title: '황금 수액관의 명문', bubble: '「수액관 명문」', bark: '“허공뿌리의 수액이 흐르는 한 부제의 숨은 끊어지지 않는다. (수액관 명문)”' }),
        boss: Object.freeze({ intro: '「바닥의 황금 수액이 맥동하며 부정한 은총의 부제녀를 감싼다.」', half: '「부제녀의 베인 상처마다 황금 수액이 차오르며 살이 맞붙는다.」', defeat: '「황금 수액 기둥이 쏟아져 내리며 쓰러진 부제녀를 다시 일으킨다!」' })
    }),
    3: Object.freeze({
        npc: Object.freeze({ name: '뿌리끝의 드루이드, 하켄', bubble: '「드루이드 하켄」', bark: '“위쪽 중정의 영원은 아래쪽 뿌리의 목마름을 쥐어짠 것이다.”', tone: 'violet' }),
        stele: Object.freeze({ title: '거꾸로 매달린 탄원서', bubble: '「마른 탄원서」', bark: '“수액을 다 바쳤으나 돌아온 것은 정원사의 가위뿐이었다. (허공뿌리 탄원서)”' }),
        boss: Object.freeze({ intro: '「수액을 빼앗긴 숲의 굶주림이 하나의 맹수로 응집되어 포효한다.」', half: '「맹수의 갈라진 가죽 사이로 중정 수송대의 부러진 창끝이 보인다.」', defeat: '「맹수가 쓰러진 자리 아래로 미궁으로 향하는 수액 관로가 드러난다.」' })
    }),
    4: Object.freeze({
        npc: Object.freeze({ name: '접목사 베른', bubble: '「접목사 베른」', bark: '“너를 올려 보낸 드루이드의 눈은 구원자가 아닌 대장장이의 눈이었어.”', tone: 'gold' }),
        stele: Object.freeze({ title: '깨진 수액 항아리의 낙인', bubble: '「깨진 수액 인장」', bark: '“마지막 수액 독이 깨졌다. 성녀도 우리처럼 피를 흘리리라. (부제녀 절명록)”' }),
        boss: Object.freeze({ intro: '「수액 공급이 끊긴 부제녀가 창백한 얼굴로 검을 고쳐 쥔다.」', half: '「부제녀의 갈라진 상처에서 더 이상 황금빛 수액이 피어나지 않는다.」', defeat: '“지주근의 주인은 너를 정원사를 벨 날붙이로 벼려냈을 뿐이다…”' })
    }),
    5: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bubble: '「벼림꾼 오르가」', bark: '“성소 바닥이 통째로 숫돌이군. 네 안의 강철은 나무꾼의 첫 날붙이다.”', tone: 'gold' }),
        stele: Object.freeze({ title: '담금질 수조의 일지', bubble: '「담금질 일지」', bark: '“독을 먹이고 추락으로 날을 세웠다. 내 심장이 마지막 숫돌이다. (하켄 일지)”' }),
        boss: Object.freeze({ intro: '「드루이드 하켄이 자신이 벼려낸 칼날의 예리함을 시험하려 일어난다.」', half: '“단검을 벼린 줄 알았건만, 네 궤적에서 도끼의 그림자가 보이는구나.”', defeat: '“나무꾼의 첫 날붙이여, 내 뿌리로 중정으로 오르는 다리를 놓아주마.”' })
    }),
    6: Object.freeze({
        npc: Object.freeze({ name: '접목사 베른', bubble: '「접목사 베른」', bark: '“황금 길이 끊긴 지금, 호혜를 잃은 정원사는 필멸자에 불과하다.”', tone: 'gold' }),
        stele: Object.freeze({ title: '부러진 가위 안쪽의 명문', bubble: '「가위의 명문」', bark: '“한 가지를 살릴 수 있다면 기꺼이 만대의 도살자로 남으리라. (가위의 명문)”' }),
        boss: Object.freeze({ intro: '「불멸을 잃은 정원사가 이가 나간 거대한 가위를 끌며 일어선다.」', half: '“내가 쓰러지면 누가 저 바깥의 도끼날을 막는단 말이냐!”', defeat: '「정원사가 무너지자 억눌렸던 수액이 수관 위쪽으로 역류하기 시작한다.」' })
    }),
    7: Object.freeze({
        npc: Object.freeze({ name: '배교자 이벨', bubble: '「배교자 이벨」', bark: '“살겠다고 줄기를 찢고 나온 곳이야. 기도문 대신 부적을 챙겨.”', tone: 'violet' }),
        stele: Object.freeze({ title: '삽목 선봉대의 선언문', bubble: '「삽목의 선언문」', bark: '“스스로 줄기를 찢고 떠나는 것은 배신이 아니라 번식이다. (삽목 선언문)”' }),
        boss: Object.freeze({ intro: '「속 빈 줄기의 나선 계단 끝에서 줄기의 전령이 나팔을 들어 올린다.」', half: '「전령의 균열된 갑주 사이로 역류하는 보랏빛 수액이 소용돌이친다.」', defeat: '「전령이 무너지고, 역류하는 수액 너머로 하얀 장막의 성소가 드러난다.」' })
    }),
    8: Object.freeze({
        npc: Object.freeze({ name: '배교자 이벨', bubble: '「배교자 이벨」', bark: '“장막 안의 순례자가 왜 너와 같은 검법을 쓰는지 직접 확인해 봐.”', tone: 'violet' }),
        stele: Object.freeze({ title: '장막에 박힌 녹슨 칼날들', bubble: '「녹슨 칼날 무덤」', bark: '“바닥에 꽂힌 칼자루마다 당신과 똑같은 손금이 찍혀 있다. (무명 순례록)”' }),
        boss: Object.freeze({ intro: '「겹겹이 접힌 시간의 장막 사이에서 순례자가 걸어 나온다.」', half: '「순례자의 가면이 갈라지며 당신과 닮은 오래된 흉터가 비친다.」', defeat: '「순례자가 스러지자 장막이 걷히고 황금빛 수관이 모습을 드러낸다.」' })
    }),
    9: Object.freeze({
        npc: Object.freeze({ name: '접목사 베른', bubble: '「접목사 베른」', bark: '“잘려 나간 아홉 가지의 생명이 저 고치 안에서 하나로 꿰매어졌구나.”', tone: 'gold' }),
        stele: Object.freeze({ title: '접목원 석판의 기도문', bubble: '「접목원 석판」', bark: '“아홉 가지의 울음을 묶어 바깥의 도끼를 견딜 고치를 기웠다. (접목원 석판)”' }),
        boss: Object.freeze({ intro: '「황금 고치를 품은 접목의 어머니가 아홉 목소리로 합창을 시작한다.」', half: '「고치 표면에 금이 가며 눈부신 금빛 후광이 수관을 물들인다.」', defeat: '「어머니가 쓰러지자 고치가 열리고 금빛 존재가 차륜으로 떠오른다.」' })
    }),
    10: Object.freeze({
        npc: Object.freeze({ name: '관측자의 그림자, 베일라', bubble: '「관측자 베일라」', bark: '“손을 잡을지, 도끼날이 되어 계절을 감을지 당신의 선택을 기록하겠습니다.”', tone: 'cyan' }),
        stele: Object.freeze({ title: '합일의 차륜 비문', bubble: '「차륜의 비문」', bark: '“첫 날붙이가 완성되기 전까지 계절의 차륜은 멈추지 않는다. (차륜의 비문)”' }),
        boss: Object.freeze({ intro: '「가장 높은 차륜 위에서 고치에서 태어난 존재가 금빛 후광을 펼친다.」', half: '「차륜 바깥의 허공이 갈라지며 거대한 도끼날의 그림자가 드리운다.」', defeat: '「맞닿지 못한 두 손끝의 작은 틈새로 계절의 나이테가 다시 감긴다.」' })
    })
});

const STORY_TRIAL_ENCOUNTERS = Object.freeze({
    trial_1: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bubble: '「벼림꾼 오르가」', bark: '“첫 번째 숫돌을 통과해 무딘 껍질을 벗어낸 자만이 전직의 길을 얻는다.”', tone: 'gold' }),
        stele: Object.freeze({ title: '폐기된 시제품 목록', bubble: '「시제품 목록」', bark: '“벼려지는 고통을 피하려 물러선 쇠는 자루에 끼워지지 않는다. (초벌 각인)”' }),
        boss: Object.freeze({ intro: '「군더더기를 도려내는 숫돌의 집행자가 회랑 끝에서 모습을 드러낸다.」', half: '「집행자의 칼날이 회랑 벽면의 숫돌과 부딪히며 불꽃을 튀긴다.」', defeat: '「초벌 벼림을 견뎌낸 강철 위에 첫 번째 전직의 각인이 새겨진다.」' })
    }),
    trial_2: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bubble: '「벼림꾼 오르가」', bark: '“화염, 냉기, 번개 세 화로의 열기를 견뎌내어 네 성질을 증명하라.”', tone: 'gold' }),
        stele: Object.freeze({ title: '균열된 담금질 기록', bubble: '「담금질 기록」', bark: '“세 수조를 건너며 결이 갈라지지 않았다면 두 번째 각인을 새겨라. (화로 규율)”' }),
        boss: Object.freeze({ intro: '「세 화로의 열기와 한기가 삼원 제단 중앙의 수호자에게 응집된다.」', half: '「수호자의 몸에서 화염, 서리, 번개의 파동이 교차하며 제단을 흔든다.」', defeat: '「삼원의 담금질을 마친 칼날이 흔들리지 않는 경도를 얻는다.」' })
    }),
    trial_3: Object.freeze({
        npc: Object.freeze({ name: '배교자 이벨', bubble: '「배교자 이벨」', bark: '“나무의 피가 피운 독무 속에서도 무뎌지지 않는 날만 심재에 닿지.”', tone: 'violet' }),
        stele: Object.freeze({ title: '녹슨 칼날들의 묘비', bubble: '「녹슨 칼날 묘비」', bark: '“독무에 머문 날은 모두 부식되었다. 스칠 자리와 멈출 자리를 알라. (정원 묘비)”' }),
        boss: Object.freeze({ intro: '「썩은 수액을 머금은 정원의 수호자가 독무 중심에서 모습을 드러낸다.」', half: '「수호자가 내뿜는 짙은 독무가 정원 바닥의 빈틈을 잠식해 들어온다.」', defeat: '「부식되지 않는 서슬을 증명한 칼날 위에 세 번째 전직이 열린다.」' })
    }),
    trial_4: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bubble: '「벼림꾼 오르가」', bark: '“나무의 피와 바깥의 공허가 교차하는 십자 회랑에서 축을 세워라.”', tone: 'gold' }),
        stele: Object.freeze({ title: '네 번째 모루의 기록', bubble: '「모루의 기록」', bark: '“네 번의 벼림을 견딘 칼날은 더 이상 대장장이의 망치를 찾지 않는다. (모루 기록)”' }),
        boss: Object.freeze({ intro: '「피와 공허가 교차하는 네거리 심장부에서 미궁의 심판자가 깨어난다.」', half: '「십자 회랑의 네 벽면에서 핏빛 칼날과 공허의 파동이 동시에 교차한다.」', defeat: '「십자의 교차를 넘어선 칼날이 마침내 전직의 핵심에 도달한다.」' })
    }),
    trial_5: Object.freeze({
        npc: Object.freeze({ name: '관측자의 그림자, 베일라', bubble: '「관측자 베일라」', bark: '“모든 재생과 온기가 거세된 혹한 속에서 피어나는 것이 진짜 개화입니다.”', tone: 'cyan' }),
        stele: Object.freeze({ title: '백야의 심장 관측록', bubble: '「백야 관측록」', bark: '“겨울 미궁 끝에서 돌아온 칼날에 지워지지 않는 재능의 꽃이 피었다. (백야 기록)”' }),
        boss: Object.freeze({ intro: '「모든 수액과 재생이 얼어붙은 백야의 중심에서 혹한의 수호자가 깨어난다.」', half: '「혹한의 파동이 회랑의 숨통을 조이며 칼날의 마지막 한계를 시험한다.」', defeat: '「극한의 겨울을 깨고 마침내 칼날 본연의 재능이 완전하게 개화한다.」' })
    })
});

// One per unlock (data/content-progression.js CONTENT_UNLOCK_CATALOG id); default closes the loop result.
const STORY_LOOP_MILESTONES = Object.freeze({
    craft: Object.freeze({
        narration: Object.freeze(['되감긴 우물 바닥 옆의 무너진 공방에서 묵직한 망치 소리가 울려 퍼집니다.', '지난 계절에 베어냈던 상처의 기억이 마법의 새싹과 강철의 결로 응고되어 남아 있습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“나무의 새싹과 이슬도 내 모루 위에선 강철의 날을 세우는 약재가 되지.”'
    }),
    market: Object.freeze({
        narration: Object.freeze(['속 빈 줄기 외곽의 어두운 틈새마다 살아남은 삽목들이 좌판을 펼칩니다.', '중정이 버린 파편과 금기된 수액이 이곳에서는 생명을 잇는 화폐로 거래됩니다.']),
        speaker: '배교자 이벨',
        quote: '“기도문보단 당장 손에 쥐는 새싹 하나가 목숨을 살리는 법이야.”'
    }),
    hall: Object.freeze({
        narration: Object.freeze(['무너진 모루터 안쪽에 지난 계절들을 버텨낸 무구들의 전시대가 세워집니다.', '이가 나간 검날마다 당신이 지나온 나이테의 깊이가 새겨져 있습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“잘 벼려진 쇠는 주인이 바뀌어도 제 궤적을 기억하는 법이다.”'
    }),
    support: Object.freeze({
        narration: Object.freeze(['지주근 바닥에서 건져 올린 젬의 파편들이 주력 기술의 맥동에 공명하기 시작합니다.', '하나의 칼끝에 여러 갈래의 결을 덧대어 위력을 증폭시킬 수 있습니다.']),
        speaker: '뿌리끝의 드루이드, 하켄',
        quote: '“줄기 하나에 잔가지를 엮으면 수액의 물살도 두 배로 거세진다.”'
    }),
    research: Object.freeze({
        narration: Object.freeze(['부서진 젬의 잔향 속에서 잊힌 전투 기법의 문양들이 떠오릅니다.', '흩어진 잔향을 모아 아직 손에 넣지 못한 새로운 기술을 복원합니다.']),
        speaker: '뿌리끝의 드루이드, 하켄',
        quote: '“부서진 잔향 속에도 이전 계절의 날붙이들이 남긴 기술이 깃들어 있다.”'
    }),
    gemForge: Object.freeze({
        narration: Object.freeze(['군주의 핵과 창공의 정수가 젬의 중심부에 뜨거운 압력을 불어넣습니다.', '제련된 젬은 이전 계절보다 훨씬 날카로운 파장을 내뿜습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“강철만 두드리는 게 아니다. 영혼이 깃든 보석도 달궈야 날이 선다.”'
    }),
    engraving: Object.freeze({
        narration: Object.freeze(['젬의 표면에 미세한 홈을 파고 금기된 문양을 새겨 넣습니다.', '각인이 완성되자 기술이 뻗어 나가는 궤적 자체가 달라집니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“표면에 새긴 각인 한 줄이 칼날이 나아갈 방향을 통째로 바꾸지.”'
    }),
    gemAwakening: Object.freeze({
        narration: Object.freeze(['스무 번의 성장을 마친 젬이 각성 잔향을 삼키며 한계를 넘어섭니다.', '완전히 깨어난 기술에서 이전과는 차원이 다른 서슬이 피어오릅니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“임계점을 넘은 보석이 마침내 별의 파장과 같은 빛을 내기 시작했군요.”'
    }),
    codex: Object.freeze({
        narration: Object.freeze(['계절이 되감겨도 한 번 손에 넣었던 전설적인 유물의 형상은 도감에 영구히 기록됩니다.', '축적된 유물의 기억이 다음 계절의 당신을 보이지 않게 지탱합니다.']),
        speaker: '접목사 베른',
        quote: '“실물은 계절과 함께 흩어져도, 그 안에 깃든 명성은 나이테에 남는단다.”'
    }),
    journal: Object.freeze({
        narration: Object.freeze(['우물 바닥부터 수관 끝까지 흩어진 서판과 판결문이 하나의 기록철로 묶입니다.', '되찾은 진실 한 줄마다 당신의 육신을 단단하게 받쳐 줍니다.']),
        speaker: '접목사 베른',
        quote: '“잘려 나간 가지들의 유언을 잊지 않는 한, 너는 결코 무뎌지지 않는다.”'
    }),
    stump: Object.freeze({
        narration: Object.freeze(['눈먼 수도사가 건넨 작은 그루터기 함 안에서 버려진 씨앗들이 새 숨을 쉽니다.', '피를 머금고 자라난 씨앗과 수액이 계절을 넘어 당신의 밑거름이 됩니다.']),
        speaker: '접목사 베른',
        quote: '“버려진 씨앗도 제자리에 심어 두면 다음 계절의 거목으로 자라나지.”'
    }),
    records: Object.freeze({
        narration: Object.freeze(['지나온 계절의 처치 수와 도달 깊이가 그루터기 나이테 위에 또렷이 기록됩니다.', '어제의 궤적과 오늘의 궤적을 비교하며 다음 등반의 보폭을 가늠합니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“기록된 숫자는 거짓말을 하지 않습니다. 당신의 칼끝은 매 계절 빨라집니다.”'
    }),
    loopTree: Object.freeze({
        narration: Object.freeze(['되감긴 계절의 틈새에서 건져 올린 루프 포인트가 영구적인 뿌리 회로로 자리 잡습니다.', '나무가 시간을 되돌려도 이 밑동의 힘만큼은 결코 초기화되지 않습니다.']),
        speaker: '접목사 베른',
        quote: '“줄기는 다시 자라도 밑동에 한 번 감긴 나이테는 시간이 지우지 못한단다.”'
    }),
    trials: Object.freeze({
        narration: Object.freeze(['세계수 지하에 숨겨진 담금질 회랑의 빗장이 풀리며 세 갈래 전직의 길이 열립니다.', '초벌 숫돌과 화로를 통과한 강철만이 자기만의 고유한 이름을 얻습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“무딘 쇳덩이로 남을지, 이름을 가진 칼날이 될지는 저 회랑에서 결판난다.”'
    }),
    battleTrials: Object.freeze({
        narration: Object.freeze(['전직의 서약을 마친 당신 앞에 다섯 담금질 회랑으로 내려가는 석문이 열립니다.', '함정과 수호자를 돌파할 때마다 칼날의 위계가 한 단계씩 높아집니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“함정을 피하고 수호자를 베어내라. 그게 내 모루의 시험 방식이다.”'
    }),
    fossil: Object.freeze({
        narration: Object.freeze(['뿌리 아래 고대 미궁에서 캐낸 화석과 속성 홀씨가 모루 위에 오릅니다.', '태고에 굳어버린 생명의 결정이 장비에 원하는 방향의 힘을 불어넣습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“미궁 밑바닥에 굳은 화석을 갈아 넣으면 강철이 원하는 성질을 물게 되지.”'
    }),
    fossilRestore: Object.freeze({
        narration: Object.freeze(['미궁 깊은 층에서 건져 올린 원시 화석의 흙껍질을 벗겨내고 본래의 결을 복원합니다.', '정제된 고대 화석은 일반 제작으로는 닿을 수 없는 깊은 옵션을 깨웁니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“오래 묵은 원시 화석일수록 껍질을 잘 벗기면 진국이 나오는 법이다.”'
    }),
    advancedSpores: Object.freeze({
        narration: Object.freeze(['부패와 균열, 혼돈의 기운을 머금은 고급 홀씨를 다루는 비법이 해금됩니다.', '위험한 독성 포자를 덧입혀 장비의 공격성을 극한까지 끌어올립니다.']),
        speaker: '배교자 이벨',
        quote: '“독이 강할수록 약도 독해지는 법이지. 손에 닿지 않게 조심해서 다뤄.”'
    }),
    labyrinth: Object.freeze({
        narration: Object.freeze(['정원사 이전의 시대에 지어진 지하 서고, 고대 미궁의 첫 번째 석문이 열립니다.', '기억을 먹고 구조가 바뀌는 끝없는 회랑에서 화석과 봉인편린이 기다립니다.']),
        speaker: '접목사 베른',
        quote: '“미궁의 균사는 침입자의 발걸음을 먹고 끝없이 새로운 방을 빚어낸단다.”'
    }),
    jewel: Object.freeze({
        narration: Object.freeze(['공허의 끌로 장비에 소켓을 뚫고 응축된 주얼을 끼워 넣는 세공술이 열립니다.', '작은 보석 하나가 장비 전체의 성질을 날카롭게 조율합니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“공허의 끌로 판 홈에 주얼을 박으면 죽은 철에도 새로운 맥박이 뛴다.”'
    }),
    talisman: Object.freeze({
        narration: Object.freeze(['고대 미궁의 봉인편린으로 잘려 나간 옛 가지들의 원한이 깃든 부적을 깨웁니다.', '그루터기 함에 묻어 피를 먹이면 부적에 잠든 고대의 권능이 눈을 뜹니다.']),
        speaker: '배교자 이벨',
        quote: '“마른 나뭇조각에 새긴 원한이 때로는 그 어떤 갑옷보다 든든하거든.”'
    }),
    beehive: Object.freeze({
        narration: Object.freeze(['썩은 수액을 먹고 비대해진 지하 벌집 군락으로의 원정로가 열립니다.', '위험도를 높일수록 여왕의 밀실에 숨겨진 진귀한 로열젤리와 밀랍을 얻습니다.']),
        speaker: '배교자 이벨',
        quote: '“달콤한 로열젤리 냄새에 취하진 마. 여왕의 독침은 갑옷도 뚫으니까.”'
    }),
    voidrift: Object.freeze({
        narration: Object.freeze(['어긋난 나이테의 틈새로 세계수 바깥의 공허가 스며드는 균열 지대가 발견됩니다.', '밀려드는 공백의 무리를 베어내고 장비를 뚫는 공허의 끌을 수확합니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“나이테가 갈라진 틈으로 바깥의 공허가 새어 들어오고 있습니다.”'
    }),
    meteorSite: Object.freeze({
        narration: Object.freeze(['수관 바깥의 천공에서 떨어진 검은 운석이 줄기 옆구리에 불타는 분화구를 남겼습니다.', '사냥으로 하늘 균열이 열릴 때 진입하면 별의 쇳조각이 깃든 유물을 얻습니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“천공에서 추락한 별의 파편이 아직 식지 않은 채 주인을 기다립니다.”'
    }),
    timerift: Object.freeze({
        narration: Object.freeze(['감기기 전의 계절과 감긴 후의 계절이 충돌하는 시간의 균열이 열립니다.', '과거의 제단에 두 유물을 올리고 시간압을 견뎌내면 시대를 초월한 융합 유물이 탄생합니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“어제의 쇠와 내일의 쇠를 한 모루에서 두드리면 시간을 넘는 물건이 나오지.”'
    }),
    colony: Object.freeze({
        narration: Object.freeze(['죽은 뿌리 껍질을 파먹던 갑충 군락이 방벽을 넘어 끝없이 범람하기 시작합니다.', '밀려오는 파동을 막아내고 군락 수호판에 꺾이지 않는 방어의 각인을 세웁니다.']),
        speaker: '뿌리끝의 드루이드, 하켄',
        quote: '“죽은 껍질을 탐하는 벌레 떼다. 한 걸음도 방벽 안으로 들이지 마라.”'
    }),
    sky: Object.freeze({
        narration: Object.freeze(['수관이 닿지 못한 허공 위로 부러진 가지들을 쌓아 올린 창공의 탑이 열립니다.', '역중력의 층계를 오를수록 영구히 사라지지 않는 응축된 창공의 정수를 얻습니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“대지의 인력을 벗어난 첨탑 끝에서 주인 없는 빈 왕좌가 기다립니다.”'
    }),
    cube: Object.freeze({
        narration: Object.freeze(['지하계 깊은 층의 적들에게서 고대 동력원인 코어가 떨어지기 시작합니다.', '장비의 심장부에 코어를 장착해 전투 방식의 중심축을 세웁니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“지하계 깊은 곳에서 건진 동력 핵이다. 네 무구의 심장에 끼워 넣어라.”'
    }),
    talent: Object.freeze({
        narration: Object.freeze(['영구동토의 혹한 미궁을 돌파할 자격을 얻어 재능 개화의 길이 열립니다.', '얼어붙은 시련 속에서 피어난 개화 카드는 계절이 바뀌어도 시들지 않습니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“모든 온기가 사라진 겨울의 끝에서 당신만의 진짜 재능이 개화합니다.”'
    }),
    chaosRealm: Object.freeze({
        narration: Object.freeze(['열 번의 나이테가 겹쳐 감기며 세계수가 드리운 거대한 그림자, 혼돈계가 열립니다.', '다섯 권역의 아틀라스 지도를 따라 세계수의 그림자와 심연을 추적합니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“이제 줄기 안쪽의 온실이 아니라 나무가 드리운 그림자를 관측할 차례입니다.”'
    }),
    deepChaos: Object.freeze({
        narration: Object.freeze(['혼돈 스무 번째 층계의 바닥이 무너지며 끝을 알 수 없는 심화 혼돈이 열립니다.', '더 깊은 어둠으로 내려갈수록 영구적인 심화 성장의 보상이 뒤따릅니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“스무 번째 층계 아래에는 정원사의 가위조차 닿지 못한 심연이 있습니다.”'
    }),
    deepTree: Object.freeze({
        narration: Object.freeze(['심화 등반과 극점 토벌로 모은 포인트가 가장 깊은 뿌리 줄기에 각인됩니다.', '계절의 윤회를 초월한 심화 패시브가 당신의 기본 체급을 영구히 끌어올립니다.']),
        speaker: '접목사 베른',
        quote: '“가장 깊은 암반을 뚫고 내린 뿌리는 그 어떤 도끼질에도 뽑히지 않는단다.”'
    }),
    underworld: Object.freeze({
        narration: Object.freeze(['세계수의 뿌리 끝을 넘어 대지의 심장부로 내려가는 지하계 통로가 열립니다.', '타오르는 지핵을 향해 내려가며 영구히 유지되는 고대 룬을 수집합니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“뿌리 밑바닥을 태우는 지핵의 불길 속에 태고의 룬 문자가 잠들어 있다.”'
    }),
    cosmos: Object.freeze({
        narration: Object.freeze(['수관 너머의 성간 항로가 열리며 다섯 은하의 군주가 지배하는 우주계가 펼쳐집니다.', '별들의 유언이 뭉친 잔향체 아스트라를 향해 성간의 침묵을 가로지릅니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“세계수의 수관을 넘어 다섯 별의 궤도가 맞물리는 성간이 열렸습니다.”'
    }),
    ocean: Object.freeze({
        narration: Object.freeze(['가장 깊은 뿌리가 닿아 있던 빛 없는 검은 바다, 심해의 해구가 열립니다.', '짓누르는 수압을 견디며 천 미터 아래에 잠든 태고의 포식자를 추적합니다.']),
        speaker: '접목사 베른',
        quote: '“가장 깊은 뿌리는 흙이 아니라 빛 한 점 없는 검은 바다를 마시고 있었단다.”'
    }),
    fishing: Object.freeze({
        narration: Object.freeze(['검은 해구 가장자리의 고요한 물가에서 심해의 생명체를 건져 올릴 낚시터가 열립니다.', '건져 올린 어획물의 도감 기록과 보너스는 계절이 바뀌어도 유지됩니다.']),
        speaker: '접목사 베른',
        quote: '“잠시 칼을 내려놓고 검은 물결이 보내오는 태고의 숨결을 낚아 보렴.”'
    }),
    duel: Object.freeze({
        narration: Object.freeze(['다른 시간선에서 세계수를 오르던 또 다른 날붙이들의 기록과 검을 맞댑니다.', '결투장 위에서 서로의 예리함을 겨루며 자신의 위치를 확인합니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“네 날이 얼마나 잘 섰는지 알고 싶다면 다른 쇠와 직접 부딪쳐 봐라.”'
    }),
    beyond: Object.freeze({
        narration: Object.freeze(['서른 번의 담금질을 거친 칼날의 울림에 버려진 다섯 시제품과 완성작의 봉인이 풀립니다.', '모든 관문을 넘어선 자만이 발을 들일 수 있는 경계 너머의 전장이 열립니다.']),
        speaker: '일곱 번째 날, 완성작',
        quote: '“우물에 버려졌던 첫 번째 파편이 어째서 완성작인 나보다 날카롭게 울리는가.”'
    }),
    default: Object.freeze({
        narration: Object.freeze(['수관 끝에서 맞닿지 못한 두 손끝의 틈새로 계절의 나이테가 다시 감깁니다.', '나무가 시간을 되돌려도 밑동에 새겨진 나이테와 칼날의 기억은 다음 계절로 이어집니다.']),
        speaker: '나무꾼 (모루터의 주인)',
        quote: '“한 번의 계절로는 심재를 가를 수 없다. 다시 우물 바닥에서 기어올라 와라.”'
    })
});

safeExposeData({
    STORY_JOURNAL_SCENES, STORY_BRIDGE_SCENES, STORY_SCENE_QUOTES,
    STORY_CLASS_ORIGINS, STORY_ACT_ENCOUNTERS, STORY_TRIAL_ENCOUNTERS, STORY_LOOP_MILESTONES
});
