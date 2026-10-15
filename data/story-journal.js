// Story text (docs/story-bible.md), brought in by scripts/import-story-pack.cjs. Scenes play at act start and end and
// fill the journal (js/story-journal-ui.js); the room-stage lines are spoken over the battlefield
// (js/canvas-act-title-card.js); the unlock lines sit in the unlock window and the loop result
// (js/content-progression-ui.js, js/loop-ui.js).
const SUPPLIED_STORY_SCENES = Object.freeze([
    {"id":"prologue","title":"프롤로그, 밑거름의 우물","act":0,"phase":"start","journal":"prologue","image":"assets/journal/prologue.webp","lines":["이 세계의 모든 생명은 거대한 세계수의 가지로 태어나지만, 뿌리내리지 못한 당신은 정원사의 판결 아래 밑거름의 우물로 버려졌습니다.","그러나 썩은 진흙과 부러진 가지들 속에서, 당신은 끝내 숨을 거두지 않고 차가운 눈을 떴습니다."]},
    {"id":"act_2_end","title":"액트 2, 다시 추락하다","act":2,"phase":"end","journal":"act_2","image":"assets/journal/unified-20260910/act-2.webp","lines":["잔뿌리 매듭을 가르고 오른 중정에서, 부정한 은총의 부제녀가 길을 가로막았습니다.","그녀의 심장을 꿰뚫었으나 중정 바닥의 황금 수액관이 맥동하자 상처는 순식간에 다시 붙었고, 되살아난 일격에 당신은 아래쪽 허공뿌리로 추락했습니다."]},
    {"id":"act_3_start","title":"액트 3, 영원의 힘","act":3,"phase":"start","journal":"act_3","image":"assets/journal/unified-20260910/act-3.webp","lines":["추락한 허공뿌리 현수림은 잎 하나 없이 말라 비틀어져, 바람이 불 때마다 마른 가지들이 서로 부딪혀 울었습니다.","중정의 불멸을 지탱하는 황금 길의 수액 수송로가 이 굶주린 숲 너머 미궁으로 이어져 있었습니다."]},
    {"id":"act_4_end","title":"액트 4, 조력자의 정체","act":4,"phase":"end","journal":"act_4","image":"assets/journal/unified-20260910/act-4.webp","lines":["수액 운반선이 끊기자 부제녀의 상처는 더 이상 아물지 않았습니다.","피를 토하며 쓰러진 부제녀는 마지막 힘을 짜내어, 떨리는 손가락으로 발밑 깊은 성소 쪽을 가리켰습니다."]},
    {"id":"act_5_end","title":"액트 5, 뿌리가 만든 길","act":5,"phase":"end","journal":"act_5","image":"assets/journal/unified-20260910/act_5.webp","lines":["가슴을 꿰뚫린 하켄은 쓰러지지 않고, 한참 동안 당신의 칼날을 말없이 내려다보았습니다.","그는 마지막 생명력을 끌어모아 거대한 받침뿌리들을 맞물렸고, 무너진 중정으로 직행하는 보랏빛 다리를 놓아주었습니다."]},
    {"id":"act_6_end","title":"액트 6, 복수 그 이후","act":6,"phase":"end","journal":"act_6","image":"assets/journal/unified-20260910/act_6.webp","lines":["수액의 호혜를 잃은 정원사가 마침내 무릎을 꿇고, 그의 거대한 가위가 두 동강 났습니다.","가위가 부러지는 소리와 함께 발밑의 수액이 거꾸로 솟구치기 시작했고, 바닥에 스민 보랏빛 잔향이 속 빈 줄기를 가리켰습니다."]},
    {"id":"act_7_start","title":"액트 7, 속 빈 줄기","act":7,"phase":"start","journal":"act_7","image":"assets/journal/unified-20260910/act-7.webp","lines":["역류하는 수액을 따라 들어선 큰 줄기 내부의 도시는 이미 양분을 모두 빼앗겨 텅 비어 있었습니다.","썩어가는 어미나무에서 스스로를 도려내어 탈출하려는 삽목들의 행렬 사이로, 수관으로 향하는 나선 계단이 이어져 있었습니다."]},
    {"id":"act_8_start","title":"액트 8, 장막의 성소","act":8,"phase":"start","journal":"act_8","image":"assets/journal/unified-20260910/act-8.webp","lines":["줄기 끝을 넘어선 곳에는 이전 계절들의 흔적을 겹겹이 덮어둔 살아 있는 장막의 성소가 펼쳐져 있었습니다.","희미한 촛불이 줄지어 선 통로마다, 누군가 오래전에 지나간 순례의 흔적이 겹겹이 쌓여 있었습니다."]},
    {"id":"act_9_start","title":"액트 9, 황금빛 수관","act":9,"phase":"start","journal":"act_9","image":"assets/journal/unified-20260910/act-9-start.webp","lines":["장막이 걷히자 아래쪽 뿌리에서 끌어올린 모든 수액이 응집된 황금빛 수관이 모습을 드러냈습니다.","바깥의 도끼에 맞서기 위해 잘려 나간 아홉 가지를 하나로 꿰맨 거대한 고치가 수관 중심에서 맥동하고 있었습니다."]},
    {"id":"act_9_end","title":"액트 9, 고치에서 태어난 존재","act":9,"phase":"end","journal":"act_9","image":"assets/journal/unified-20260910/act-9-end.webp","lines":["고치를 지키던 접목의 어머니가 쓰러지자, 고치의 외피에 금이 가며 안쪽에서 낮은 박동이 터져 나왔습니다.","그 안에서 깨어난 형상이 옅은 금빛 후광을 두른 채 세계수의 가장 높은 차륜으로 날아올랐습니다."]},
    {"id":"act_10_end","title":"액트 10, 손끝 사이","act":10,"phase":"end","journal":"act_10","image":"assets/journal/unified-20260910/act-10.webp","lines":["합일의 차륜 위에서 쓰러진 존재가 당신을 향해 힘없이 손을 뻗었습니다.","당신도 몸을 숙여 손을 내밀었지만, 손끝이 닿기 직전 차륜이 삐걱이며 거꾸로 돌기 시작했습니다."]}
]);

// Text-only scenes for beats the illustrated set skips (act 1 only: the act 3, 7 and 8 ends were dropped on
// 2026-10-15, docs/stage-view-20261011.md). A scene added here after release needs the seen marker in js/story-journal-ui.js
// markPassedBridges raised, or saves already past its act get it out of order.
const STORY_BRIDGE_SCENES = Object.freeze([
    {"id":"act_1_start","title":"액트 1, 뿌리의 드루이드","act":1,"phase":"start","journal":"act_1","lines":["추락의 충격 속에서 눈을 떴을 때, 첫 방 구석에서 폭주한 잔뿌리 괴물들에게 몰려 신음하는 늙은 드루이드 하켄이 보였습니다.","당신이 무장을 고쳐 쥐고 달려들어 괴물들을 베어 넘기자, 기사회생한 노인은 거친 숨을 고르며 중정으로 오르는 통로를 가리켰습니다."]}
]);

// Story order: the journal, the popups and the idle-return fold read it in this order.
const STORY_JOURNAL_SCENES = Object.freeze([
    SUPPLIED_STORY_SCENES[0],
    STORY_BRIDGE_SCENES[0],
    SUPPLIED_STORY_SCENES[1],
    SUPPLIED_STORY_SCENES[2],
    SUPPLIED_STORY_SCENES[3],
    SUPPLIED_STORY_SCENES[4],
    SUPPLIED_STORY_SCENES[5],
    SUPPLIED_STORY_SCENES[6],
    SUPPLIED_STORY_SCENES[7],
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

// Spoken by the hero: wakeLine on getting up in act 1's entry room, spotLine on seeing Haken struck in the room behind
// its door (loop 1), eliteLine at the loop's first opened boss gate, bossLines[act] after the act boss falls.
const STORY_CLASS_ORIGINS = Object.freeze({
    warrior: Object.freeze({
        label: '전사 (부러진 근위병)',
        wakeLine: '“추락해도 검과 방패는 멀쩡하군.”',
        spotLine: '“저쪽의 노인이 괴물들에게 몰리고 있나!”',
        eliteLine: '“문지기는 베었다. 굳게 닫혔던 안쪽 석문의 빗장이 풀리는군.”',
        bossLines: Object.freeze({
            1: '“질긴 뿌리들이군. 중정으로 오르는 숨통이 이제야 트였다.”',
            2: '“분명히 심장을 찔렀는데, 바닥의 금빛 수액이 상처를 도로 붙이는군.”',
            3: '“굶주린 짐승의 배 속에 중정 근위대의 부러진 창이 박혀 있다.”',
            4: '“수액 독이 깨지니 별수 없군. 성녀도 피는 똑같이 흘린다.”',
            5: '“날 무기로 벼려냈다고? 덕분에 네 목을 벨 만큼 단단해졌다.”',
            6: '“가위가 무디더군, 정원사. 내 방패 하나 뚫지 못할 줄이야.”',
            7: '“도망치는 가지든 추격자든, 내 앞길을 막는다면 벨 뿐이다.”',
            8: '“바닥에 꽂힌 저 녹슨 검과 방패, 내 손자국이 그대로 남아 있군.”',
            9: '“어미의 팔이 꺾이니 고치가 열리는군. 마지막은 저 위인가.”',
            10: '“손 내밀지 마라. 내 검은 누군가를 구하기엔 너무 많이 베었다.”'
        })
    }),
    wanderer: Object.freeze({
        label: '방랑자 (그림자 처형인)',
        wakeLine: '“추락한 바닥치곤 꽤 소란스럽네.”',
        spotLine: '“저 노인네, 괴물들한테 뜯어먹히기 직전인데?”',
        eliteLine: '“성가신 문지기는 치웠어. 이제 안쪽 주인을 보러 갈까.”',
        bossLines: Object.freeze({
            1: '“단검 끝에 닿자마자 움츠러드네. 쇠 맛을 아는 뿌리들이야.”',
            2: '“심장이 아니라 바닥의 수액줄에 목숨이 붙어 있네. 줄부터 끊자.”',
            3: '“가죽만 남은 짐승 목덜미에 중정 수송대 낙인이 찍혀 있네.”',
            4: '“거봐, 수액 줄이 끊기면 고귀한 성녀님도 똑같이 피를 흘리지.”',
            5: '“죽는 시늉까지 하며 날 암살용 단검으로 갈았단 말이지. 고약해라.”',
            6: '“바깥의 도끼가 무서워 가지를 쳤다고? 변명치고는 피가 너무 많아.”',
            7: '“살겠다고 스스로 줄기를 찢고 나가다니, 중정 위선자들보단 낫네.”',
            8: '“장막에 그어진 단검 자국 좀 봐. 각도까지 내 손버릇 그대로야.”',
            9: '“아홉 가지의 울음으로 빚은 왕관이라니, 화려하기보단 소름 끼치네.”',
            10: '“미안하지만 손끝이 닿기 전에 먼저 베는 게 내 오랜 버릇이라서.”'
        })
    }),
    archer: Object.freeze({
        label: '궁수 (별을 쫓는 파수꾼)',
        wakeLine: '“진흙 바닥에 떨어졌는데도 활시위는 무사해.”',
        spotLine: '“저기 노인을 덮치는 괴물들부터 쏘자.”',
        eliteLine: '“가로막던 기척이 사라졌어. 굳게 닫혔던 안쪽 문이 열리네.”',
        bossLines: Object.freeze({
            1: '“화살촉에 매듭이 끊어졌어. 위쪽에서 불어오는 바람이 한결 가까워졌네.”',
            2: '“급소는 빗나가지 않았어. 바닥의 수액줄이 과녁을 되살리고 있네.”',
            3: '“이 마른 숲 아래로 금빛 관로가 흐르고 있어. 저걸 따라가 보자.”',
            4: '“운반선이 끊기자 부제녀를 감싸던 금빛 아지랑이도 걷혔네.”',
            5: '“바깥에서 떨어진 쇠조각, 그래서 내 눈이 늘 수관 너머를 향했던 거군.”',
            6: '“네가 가둔 온실 천장이 무너진다, 정원사. 이제 바람을 탈 차례야.”',
            7: '“줄기 속이 다 비었어. 마른 바람이 빈 공동 안에서 울부짖네.”',
            8: '“안개 장막 바닥에 내가 쏘았던 화살촉들이 녹슨 채 박혀 있어.”',
            9: '“고치를 찢고 나온 금빛 형상이 가장 높은 차륜으로 날아올랐어.”',
            10: '“한 뼘 모자란 거리네. 저 틈을 넘으려면 시위를 더 당겨야겠어.”'
        })
    }),
    cleric: Object.freeze({
        label: '성직자 (파문당한 고해사제)',
        wakeLine: '“추락 속에서도 향로의 불씨는 꺼지지 않았군요.”',
        spotLine: '“위기에 처한 저 노인분부터 구하죠.”',
        eliteLine: '“향로의 연기가 거짓 결계를 거두었습니다. 심장부로 나아가죠.”',
        bossLines: Object.freeze({
            1: '“통로를 틀어막던 잔뿌리들이여, 이제 향 연기 속에 잠드소서.”',
            2: '“아랫것들의 피를 쥐어짜 만든 불멸이 어찌 은총일 수 있습니까.”',
            3: '“수액을 다 빼앗기고 굶주림만 남은 숲이군요. 맹수의 죄가 아닙니다.”',
            4: '“성수라 불리던 착취의 관이 끊겼으니, 필멸의 안식을 맞이하소서.”',
            5: '“복수의 연장으로 저를 시험하셨으나, 당신의 고통도 거두어 드리리다.”',
            6: '“가위에 잘려 나간 수천 가지의 원혼이 당신의 목 앞에서 답하는군요.”',
            7: '“살기 위해 떠나는 삽목들의 발걸음을 누가 배신이라 부르겠습니까.”',
            8: '“장막에 밴 오래된 향내와 핏자국, 이전 계절의 제가 남긴 흔적이군요.”',
            9: '“아이를 품은 어머니의 울음을 누가 죄라 부르겠습니까. 잠드소서.”',
            10: '“닿지 못한 구원의 손끝 사이로 또 한 번의 계절이 내려앉습니다.”'
        })
    }),
    occultist: Object.freeze({
        label: '비술사 (금서의 해독자)',
        wakeLine: '“추락의 충격에도 오브는 멀쩡하네.”',
        spotLine: '“저 노인을 포위한 잔뿌리들부터 정리하자.”',
        eliteLine: '“문지기가 쓰러지자 봉인 술식이 풀렸어. 안쪽 문이 열리는군.”',
        bossLines: Object.freeze({
            1: '“잔뿌리들이 내 안의 낯선 기운을 두려워하며 길을 막고 있었군.”',
            2: '“바닥의 수액 회로가 죽음 자체를 되돌리고 있어. 밑줄기부터 끊어야 해.”',
            3: '“숲 전체가 말라 죽어가는데 미궁 쪽 관로만 생생하게 맥동하고 있네.”',
            4: '“수송로가 끊기자 부제녀를 감싸던 불멸의 술식도 허무하게 무너지네.”',
            5: '“나무꾼의 첫 번째 날붙이, 내가 나무와 섞이지 못했던 이유가 이거였군.”',
            6: '“정원사가 쓰러지자 억눌려 있던 수액이 수관 꼭대기로 폭주하기 시작했어.”',
            7: '“줄기 안쪽이 이미 다 썩었어. 가지들이 스스로를 끊어내는 것도 당연해.”',
            8: '“착각이 아니야. 이 장막 바닥의 발자국은 전부 내가 남긴 흔적이었어.”',
            9: '“아홉 생명을 억지로 기워 만든 고치라니, 절망이 빚은 비극이군.”',
            10: '“손끝이 닿으면 이 윤회도 닫히겠지. 아직 해답이 한 뼘 부족한 걸까.”'
        })
    }),
    alchemist: Object.freeze({
        label: '연금술사 (이단 배양가)',
        wakeLine: '“진흙 구덩이로 떨어졌는데 플라스크는 무사하네요.”',
        spotLine: '“저기 위험한 노인분부터 구해볼까요.”',
        eliteLine: '“좋은 시료였어요. 안쪽 문을 막던 응고 봉인도 다 녹았네요.”',
        bossLines: Object.freeze({
            1: '“썩은 잔뿌리에 초록 시약을 한 방울 떨어뜨렸더니 거품을 물고 녹네요.”',
            2: '“어머, 부식액을 부었는데 황금 수액이 상처를 바로 붙여버리네요.”',
            3: '“바싹 마른 짐승들 밑으로 아주 진한 황금 수액 냄새가 흐르고 있어요.”',
            4: '“정제된 수액 공급이 멎으니까 부제녀의 재생 반응도 괴사하네요.”',
            5: '“절 불에 달구고 독에 담가 합금으로 빚으셨다고요? 꽤 마음에 들어요.”',
            6: '“정원사의 피에 방부 수액이 가득해요. 썩는 나무를 절여뒀던 거군요.”',
            7: '“어미나무가 썩어가니 가지들이 스스로 세포를 끊고 도망치네요.”',
            8: '“장막에 묻은 시약 자국, 배합 비율이 제 플라스크랑 똑같잖아요.”',
            9: '“아홉 개체를 한 고치에 접목하다니, 정원사님이 더 지독한 실험가네요.”',
            10: '“반응이 불완전하게 끝났네요. 용광로가 이번 계절을 다시 녹이려나 봐요.”'
        })
    })
});

// The story's five NPCs (docs/story-bible.md section 4): id (also the stage art's id, data/stage-view.js STAGE_NPC_ART), name as
// the encounters write it, title, and dialogues: the keywords of its window (js/content-progression-ui.js openNpc), each the NPC
// alone speaking (line), shown once the hero has reached act reqAct and loop reqLoop (both optional). Each keeps the unlocks whose
// loop lines it speaks (STORY_LOOP_MILESTONES speaker): the window lists them under 맡은 해금.
const STORY_NPCS = Object.freeze({
    haken: Object.freeze({
        id: 'haken',
        name: '뿌리끝의 드루이드, 하켄',
        title: '뿌리끝 성소의 은둔자',
        dialogues: Object.freeze([
            Object.freeze({ topic: '밑거름의 우물', line: '“정원사는 자기 뜻대로 자라지 않는 가지를 모두 이 우물 바닥으로 내던지지. 진흙 속에서 썩지 않고 걸어 나온 건 네가 처음이군.”' }),
            Object.freeze({ topic: '썩은갈기의 잔뿌리', line: '“원래는 시체의 진액을 빨아 위쪽으로 올리던 뿌리들이다. 네가 떨어진 뒤로 무엇에 겁을 먹었는지 통로를 틀어막고 날뛰고 있지.”' }),
            Object.freeze({ topic: '가지치기의 중정', line: '“성소 위쪽의 중정은 정원사와 부제들이 머무는 황금빛 온실이다. 아래쪽 뿌리의 피를 빨아 영원을 누리는 그 목덜미에 쇠 맛을 보여줄 때지.”' }),
            Object.freeze({ topic: '허공뿌리와 수액관', reqAct: 3, line: '“부제녀의 불멸은 신성한 은총 따위가 아니다. 이 마른 숲과 미궁에서 뽑아 올리는 황금 수액 덕분이지. 미궁의 수액 독을 깨면 그 여자도 피를 흘린다.”' }),
            Object.freeze({ topic: '보조 젬과 잔향', line: '“우물 바닥에는 앞서 버려진 자들의 기억이 결정으로 굳어 있다. 부서진 잔향을 모아 보면 그들이 남긴 기술의 흔적을 건질 수 있을 거다.”' }),
            Object.freeze({ topic: '군락지 방벽', reqLoop: 15, line: '“죽은 뿌리 냄새를 맡고 지하의 갑충 떼가 성소 방벽까지 기어올라 왔다. 죽은 어미의 껍질을 뒤집어쓰고 불어나는 놈들이니 방벽 밖에서 짓이겨라.”' })
        ])
    }),
    bern: Object.freeze({
        id: 'bern',
        name: '접목사 베른',
        title: '기억을 줍는 눈먼 수도사',
        dialogues: Object.freeze([
            Object.freeze({ topic: '그루터기 함', line: '“눈은 멀었지만 잘려 나간 잔가지들의 맥박은 손끝으로 느낀다. 상극인 기운만 피해서 씨앗을 심어 두면 죽어가던 가지도 이 함 안에서 다시 숨을 쉬지.”' }),
            Object.freeze({ topic: '부정한 은총의 부제녀', reqAct: 2, line: '“부제녀도 한때는 아랫가지의 아픔을 돌보던 사제였어. 황금 수액에 취한 뒤로는 하층의 비명을 듣지 못하게 되었지. 발밑의 수액줄을 끊기 전엔 쓰러지지 않는다.”' }),
            Object.freeze({ topic: '성소의 드루이드', reqAct: 4, line: '“첫 방에서 괴물에게 몰리던 하켄을 네가 구해주었다고 믿나? 내 귀에는 그 노인이 숫돌에 칼을 갈듯 숨죽여 웃던 소리가 똑똑히 들렸어. 넌 구원받은 게 아니라 벼려진 거다.”' }),
            Object.freeze({ topic: '정원사의 가위', reqAct: 6, line: '“정원사는 도살자라는 오명을 쓰면서도 가위를 놓지 않았지. 바깥의 도끼날에 나무 전체가 찍혀 넘어가지 않도록, 아홉 가지를 잘라 수관의 고치 하나를 살리려 한 거야.”' }),
            Object.freeze({ topic: '비탄의 고치', reqAct: 9, line: '“잘려 나간 아홉 가지의 유해가 수관의 황금 고치 안에서 하나로 꿰매어져 있어. 고치를 품은 어미의 노랫소리는 공격이 아니라, 덜 여문 아이를 지키려는 울부짖음이지.”' }),
            Object.freeze({ topic: '고대 미궁과 심해', reqLoop: 3, line: '“뿌리 밑에는 정원사 이전 시대의 지하 미궁이 잠들어 있고, 그 끝은 흙이 아닌 검은 바다에 닿아 있어. 계절이 되감겨도 밑동에 새긴 기억은 사라지지 않는다.”' })
        ])
    }),
    orga: Object.freeze({
        id: 'orga',
        name: '벼림꾼 오르가',
        title: '부러진 모루의 잔류 사념',
        dialogues: Object.freeze([
            Object.freeze({ topic: '무너진 모루터', line: '“몸뚱이는 바스러졌지만 망치를 쥐던 이 외팔의 사념은 모루에 남았다. 새싹이든 이슬이든 내 화로에 던져 넣으면 강철의 날을 세우는 약재가 되지.”' }),
            Object.freeze({ topic: '첫 번째 날붙이', reqAct: 5, line: '“네 뼈대에서 나는 건 식물의 수액 냄새가 아니다. 태초에 내가 나무꾼의 모루 위에서 첫 번째로 두드렸던 강철의 쇳내지. 하켄도 그걸 알고 제 성소를 숫돌로 쓴 거다.”' }),
            Object.freeze({ topic: '담금질 회랑과 전직', line: '“지하의 다섯 회랑은 원래 나무꾼이 시제품들의 강도를 시험하던 숫돌과 화로다. 칼날과 불길, 독무와 백야의 혹한을 버텨내면 네 본래의 예리한 결이 깨어날 거다.”' }),
            Object.freeze({ topic: '화석과 공허 주얼', reqLoop: 3, line: '“미궁 밑바닥에서 캐낸 태고의 화석을 갈아 넣으면 강철이 원하는 성질을 문다. 거기에 공허의 끌로 홈을 파고 주얼을 박으면 죽은 철에도 다시 맥박이 뛰지.”' }),
            Object.freeze({ topic: '시간의 균열과 지핵', reqLoop: 13, line: '“시간의 균열에선 어제의 쇠와 내일의 쇠를 한 모루에서 두드려 붙일 수 있다. 더 깊은 지하계 끝까지 내려가면 지핵의 용광로에서 식지 않는 룬과 코어도 건질 수 있지.”' }),
            Object.freeze({ topic: '버려진 형제들', reqLoop: 31, line: '“나무꾼이 벼리다 버린 날붙이가 너 하나뿐인 줄 알았나. 과열, 무딤, 탐식, 잔영, 역린, 그리고 일곱 번째 완성작까지 네 날이 우는 소리를 듣고 찾아올 거다.”' })
        ])
    }),
    ivel: Object.freeze({
        id: 'ivel',
        name: '배교자 이벨',
        title: '장막을 걷는 순례자',
        dialogues: Object.freeze([
            Object.freeze({ topic: '시든 도시와 암시장', line: '“나도 한때는 중정에서 황금 수액 장부를 적던 상급 부제였어. 위쪽의 영원이 아랫것들을 굶겨 죽여 만든 거짓말이란 걸 알고는, 사제복 금실을 뜯어내고 이리로 도망쳤지.”' }),
            Object.freeze({ topic: '삽목들의 탈출', reqAct: 7, line: '“정원사가 쓰러지자마자 수관의 고치가 남은 수액을 다 빨아들이고 있어. 썩어가는 어미나무와 함께 찍혀 넘어가지 않으려고 줄기를 찢고 떠나는 걸 누가 배신이라 부르겠어?”' }),
            Object.freeze({ topic: '장막 안의 순례자', reqAct: 8, line: '“하얀 장막 안쪽을 배회하는 저 순례자 말이야, 무기를 쥐는 버릇부터 보폭까지 너랑 판박이잖아. 지난 계절에 수관 끝까지 오르지 못하고 장막에 갇힌 네 그림자일지도 몰라.”' }),
            Object.freeze({ topic: '부적과 고급 홀씨', reqLoop: 6, line: '“미궁에서 건진 봉인편린에는 잘려 나간 옛 가지들의 원한이 서려 있어. 피를 먹여 깨우면 어떤 갑옷보다 든든한 부적이 되지. 독성 강한 고급 홀씨도 내 좌판에서 구할 수 있어.”' }),
            Object.freeze({ topic: '지하 벌집과 두 제단', reqLoop: 8, line: '“썩은 수액을 먹고 자란 지하 벌집에는 여왕의 밀실마다 진귀한 로열젤리와 밀랍이 쌓여 있어. 아틀라스에서 붉은 제단의 잉걸이나 푸른 제단의 즙을 찾거든 언제든 가져와.”' })
        ])
    }),
    veila: Object.freeze({
        id: 'veila',
        name: '관측자의 그림자, 베일라',
        title: '경계의 기록관',
        dialogues: Object.freeze([
            Object.freeze({ topic: '합일의 차륜과 윤회', line: '“차륜 위에서 맞뻗은 두 손끝이 닿기 직전마다 계절이 되감깁니다. 모루터의 주인인 나무꾼이 아직 당신의 날이 심재를 가르기엔 무디다고 판단하기 때문입니다.”' }),
            Object.freeze({ topic: '세계수의 그림자, 혼돈계', line: '“열 번의 나이테가 겹쳐 감기면 줄기 너머로 세계수가 드리운 그림자, 혼돈계가 열립니다. 아틀라스의 다섯 권역을 따라가며 나무가 감춘 심연의 잔상들을 마주하십시오.”' }),
            Object.freeze({ topic: '공허 균열과 검은 별', reqLoop: 7, line: '“어긋난 나이테의 틈새로 세계수 바깥의 공허가 스며들고, 수관 너머 천공에서는 검은 별의 파편이 줄기 옆구리에 추락했습니다. 나무의 법칙 밖에서 온 힘들이지요.”' }),
            Object.freeze({ topic: '창공의 탑과 성간 항로', reqLoop: 15, line: '“수관이 닿지 못한 허공 위로 부러진 가지들을 쌓아 올린 첨탑이 창공의 탑입니다. 그 너머에는 다섯 은하의 군주가 지배하는 성간 항로와 잔향체 아스트라가 기다립니다.”' }),
            Object.freeze({ topic: '네 곳의 극점과 경계', reqLoop: 31, line: '“지하계의 모르그란, 무광해의 탈라사, 창공의 카엘룸, 그리고 성간의 아스트라. 네 극점의 기록이 모두 당신의 칼끝에 모일 때 비로소 마지막 경계가 열립니다.”' }),
            Object.freeze({ topic: '관측자의 사명', reqLoop: 31, line: '“저는 모루터와 수관 사이에서 모든 계절의 궤적을 기록하는 관측자입니다. 당신이 창조주의 손아귀에서 벗어날 자격을 갖추었는지 마지막 경계에서 직접 달아보겠습니다.”' })
        ])
    })
});

// Room-stage lines per act (key: STORY_ACTS order; STORY_TRIAL_ENCOUNTERS below has the same shape per trial zone id): npc on
// entering the entry room (loopBark from loop 2 on), stele on entering a side room, boss intro once the final boss is up,
// half at 55% life, defeat when the map is cleared. Each line 50 characters at most (one line of the band on PC).
const STORY_ACT_ENCOUNTERS = Object.freeze({
    1: Object.freeze({
        npc: Object.freeze({
            name: '뿌리끝의 드루이드, 하켄',
            bark: '“하마터면 잔뿌리들에게 먹힐 뻔했군. 살려주어 고맙다, 앞길의 어미 매듭도 베어다오.”',
            loopBark: '“기이한 일이군. 내가 부르기도 전에 잔뿌리가 덮칠 자리를 먼저 베어내다니.”',
            classBarks: Object.freeze({
                warrior: '“이가 나간 방패로 괴물을 단숨에 쳐내더군. 중정 근위대의 솜씨가 남다르다.”',
                wanderer: '“소리도 없이 잔뿌리의 급소를 따버리더군. 중정의 그림자 처형인이 맞나 보군.”',
                archer: '“눈을 뜨자마자 날 덮치던 잔뿌리를 꿰뚫더군. 파수꾼의 활솜씨 덕분에 살았다.”',
                cleric: '“향로의 불씨로 괴물들을 물리쳐 주었군. 파문당한 사제라더니 은혜를 입었다.”',
                occultist: '“오브의 기운으로 잔뿌리들을 단숨에 떨쳐내더군. 금서 서고의 학자 덕분에 살았다.”',
                alchemist: '“시약 한 방울로 날 덮치던 괴물을 녹여버리더군. 고맙다, 앞길도 부탁하지.”'
            }),
            classReplies: Object.freeze({
                warrior: '“몸을 추스르고 물러서 있어라. 앞을 막는 잔뿌리들도 내가 다 베고 올라가겠다.”',
                wanderer: '“구해준 값은 중정으로 올라가는 길 안내면 충분해. 남은 잔뿌리들도 마저 치우지.”',
                archer: '“다친 데가 없다면 다행이야. 위쪽 통로에서 불어오는 바람을 따라 마저 올라가 볼게.”',
                cleric: '“다행히 큰 상처는 없으시군요. 성소 출구를 막은 어미 잔뿌리도 제가 거두겠습니다.”',
                occultist: '“구해준 김에 물어보지. 중정으로 오르는 통로가 저 잔뿌리 매듭 너머 맞지?”',
                alchemist: '“구해드린 보답으로 저 잔뿌리들은 제 시료로 쓸게요. 중정 길은 저 너머인가요?”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '진흙에 잠긴 파문 명패', bark: '“뿌리내리지 못한 것은 우물의 밑거름이 될지어다. (중정 판결록 제1장)”' }),
        boss: Object.freeze({ intro: '「중정으로 오르는 숨통을 틀어막은 거대한 잔뿌리 매듭이 꿈틀거린다.」', half: '「매듭이 끊어진 틈새로 지주근의 보랏빛 수액이 스며 나온다.」', defeat: '「잔뿌리가 절단되자 봉쇄되었던 중정행 수액 통로가 열린다.」' })
    }),
    2: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“불씨와 서리는 나란히 심지 마라. 상극이 맞닿으면 서로 숨을 멈추게 된다.”',
            loopBark: '“내 눈은 멀었지만 손끝은 기억하지. 넌 이미 이 함에 씨앗을 심어본 손이야.”',
            classBarks: Object.freeze({
                warrior: '“방패에 깊게 패인 가위 자국이 느껴지는군. 정원사에게 맞섰던 근위병이 너였어.”',
                wanderer: '“발소리가 조금도 나지 않는군. 중정의 그림자 속에서 일하던 처형인이지?”',
                archer: '“옷자락에서 허공뿌리 끝단의 바람 냄새가 나네. 별을 쫓던 파수꾼이 맞군.”',
                cleric: '“익숙한 고해소의 향내군. 시든 가지에 축복을 내렸다던 사제가 너였어.”',
                occultist: '“금서의 종이 냄새가 아직 가시지 않았군. 우물로 던져졌다던 학자가 살아 있었네.”',
                alchemist: '“소매에서 증류된 균사 냄새가 나네. 불타버린 실험실의 주인이 바로 너였군.”'
            }),
            classReplies: Object.freeze({
                warrior: '“상극이든 뭐든 내 방패 앞에서는 똑같다. 정원사는 어디 있지?”',
                wanderer: '“그루터기 함 다루는 법은 잘 들었어. 이제 중정 안쪽 구경이나 가볼까.”',
                archer: '“씨앗에도 서로 밀어내는 바람결이 있네. 기억해 두고 중정으로 오르겠어.”',
                cleric: '“버려진 씨앗을 거두는 그루터기 함이라니, 중정의 성소보다 훨씬 따뜻하군요.”',
                occultist: '“서로 밀어내는 씨앗은 피해서 심으면 되겠군. 조언은 고맙네.”',
                alchemist: '“불씨와 서리를 섞으면 반응이 죽는다는 뜻이죠? 실험 노트에 적어둘게요.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '황금 수액관의 명문', bark: '“허공뿌리의 수액이 흐르는 한 부제의 숨은 끊어지지 않는다. (수액관 명문)”' }),
        boss: Object.freeze({ intro: '「바닥의 황금 수액이 맥동하며 부정한 은총의 부제녀를 감싼다.」', half: '「부제녀의 베인 상처마다 황금 수액이 차오르며 살이 맞붙는다.」', defeat: '「황금 수액 기둥이 쏟아져 내리며 쓰러진 부제녀를 다시 일으킨다!」' })
    }),
    3: Object.freeze({
        npc: Object.freeze({
            name: '뿌리끝의 드루이드, 하켄',
            bark: '“중정에서 떨어지고도 살아남았군. 부제녀를 살리는 수액관이 이 숲 아래로 흐른다.”',
            loopBark: '“기이한 일이군. 추락한 자리에서 일어서자마자 수액관이 흐르는 숲 아래를 노려보다니.”',
            classBarks: Object.freeze({
                warrior: '“방패로 추락을 버텨냈군. 부제녀의 상처를 붙이던 수액관이 이 숲 아래로 흐른다.”',
                wanderer: '“단검으로 뿌리를 찍어 낙하를 멈췄군. 네가 찾는 부제녀의 수액줄이 이 아래에 있다.”',
                archer: '“거센 바람 속에서도 무사히 착지했군. 중정으로 수액을 나르는 관로가 이 숲 아래다.”',
                cleric: '“성녀의 일격을 견뎌냈군. 이 굶주린 숲 아래에 중정으로 가는 수액 줄기가 있다.”',
                occultist: '“추락하면서도 다치지 않았군. 부제녀를 되살리던 수액 수송로가 이 숲 아래로 이어진다.”',
                alchemist: '“부제녀의 상처가 붙는 걸 보았지. 이 숲의 진액을 빼돌리는 수액관이 바로 아래에 있다.”'
            }),
            classReplies: Object.freeze({
                warrior: '“이 정도 추락으론 안 죽는다. 바닥의 수액관부터 부수러 가겠다.”',
                wanderer: '“부제녀의 목숨줄이 이 밑에 있다 이거지? 줄 끊는 건 내 전공이야.”',
                archer: '“떨어지면서 수액관이 어디로 흐르는지 위에서 다 봐두었어.”',
                cleric: '“아래쪽 뿌리들의 굶주림을 보았습니다. 저 거짓 은총을 끊어내겠습니다.”',
                occultist: '“밑에서 수액을 끌어올리고 있었군. 미궁으로 내려가 그 줄기부터 끊겠어.”',
                alchemist: '“부제녀를 살리던 황금 수액관이라니, 부식 시약으로 통째로 녹여버릴게요.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '거꾸로 매달린 탄원서', bark: '“수액을 다 바쳤으나 돌아온 것은 정원사의 가위뿐이었다. (허공뿌리 탄원서)”' }),
        boss: Object.freeze({ intro: '「수액을 빼앗긴 숲의 굶주림이 하나의 맹수로 응집되어 포효한다.」', half: '「맹수의 갈라진 가죽 사이로 중정 수송대의 부러진 창끝이 보인다.」', defeat: '「맹수가 쓰러진 자리 아래로 미궁으로 향하는 수액 관로가 드러난다.」' })
    }),
    4: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“첫 방에서 괴물에게 몰리던 그 노인의 연기에 속지 마라. 눈빛은 대장장이였어.”',
            loopBark: '“미궁의 갈림길마다 망설임이 없네. 수액 독이 어디 숨었는지 다 아는 것처럼.”',
            classBarks: Object.freeze({
                warrior: '“하켄이 잔뿌리에게 당하던 건 미끼였어. 네 검끝이 정원사를 벨 만한지 시험한 거지.”',
                wanderer: '“남의 밀담을 잘 듣는 처형인이 정작 성소의 구출극이 꾸며진 연극인 줄은 몰랐나.”',
                archer: '“먼 곳의 별만 보다가 발밑의 덫을 놓치지 마라. 네가 구해준 그 노인을 경계해.”',
                cleric: '“가엾은 노인을 구해준 줄 알았겠지만, 하켄은 처음부터 너를 연장으로 벼리고 있었어.”',
                occultist: '“모든 걸 해독한다면서 왜 첫 방의 습격이 너를 시험할 미끼였다는 건 놓쳤나.”',
                alchemist: '“네가 첫 방에서 구해준 줄 알았던 그 드루이드가, 실은 너를 배양하고 있었던 거야.”'
            }),
            classReplies: Object.freeze({
                warrior: '“그 구출극이 날 시험하려는 연기였다고? 부제녀부터 베고 내려가 직접 확인하겠다.”',
                wanderer: '“어쩐지 잔뿌리 따위한테 당한다 했어. 노인네 속셈은 이따 내려가서 직접 따져보지.”',
                archer: '“첫 만남부터 꾸며진 시험이었다니, 먼저 눈앞의 운반선부터 끊고 성소로 내려가겠어.”',
                cleric: '“제가 구해드린 분이 저를 연장으로 보았다면, 그 업보 또한 내려가서 직접 묻겠습니다.”',
                occultist: '“첫 방의 습격조차 날 떠보려는 미끼였다니, 이 미궁부터 정리하고 내려가 보지.”',
                alchemist: '“어머, 불쌍한 노인인 척 저를 시험하셨다고요? 누가 시료가 될지는 두고 봐야죠.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '깨진 수액 항아리의 낙인', bark: '“마지막 수액 독이 깨졌다. 성녀도 우리처럼 피를 흘리리라. (부제녀 절명록)”' }),
        boss: Object.freeze({ intro: '「수액 공급이 끊긴 부제녀가 창백한 얼굴로 검을 고쳐 쥔다.」', half: '「부제녀의 갈라진 상처에서 더 이상 황금빛 수액이 피어나지 않는다.」', defeat: '“지주근의 주인은 너를 정원사를 벨 날붙이로 벼려냈을 뿐이다…”' })
    }),
    5: Object.freeze({
        npc: Object.freeze({
            name: '벼림꾼 오르가',
            bark: '“성소 바닥이 통째로 숫돌이군. 네 안의 강철은 나무꾼의 첫 날붙이다.”',
            loopBark: '“드루이드 녀석, 기억이 되감긴 줄도 모르고 또 널 숫돌 위에 올렸군.”',
            classBarks: Object.freeze({
                warrior: '“근위병의 검과 방패라지만, 속살은 내가 태초에 두드린 첫 번째 강철이군.”',
                wanderer: '“가벼운 단검 꼴을 하고 있어도, 뼈대에 서린 살기만큼은 영락없는 첫 날붙이다.”',
                archer: '“화살촉 하나하나에 내 모루의 쇳내가 배어 있군. 넌 활을 든 칼날이다.”',
                cleric: '“사슬 향로를 휘두르지만, 네 영혼의 결은 기도문이 아니라 벼려진 쇠다.”',
                occultist: '“공허 오브로 감싸 두었어도 내 눈은 못 속여. 넌 나무꾼의 첫 번째 강철이다.”',
                alchemist: '“독약으로 철을 녹이는 배양가라더니, 내 모루의 불길과 궁합이 잘 맞겠군.”'
            }),
            classReplies: Object.freeze({
                warrior: '“첫 번째 강철이든 근위병이든, 내 검을 쥔 건 나 자신이다.”',
                wanderer: '“나무꾼의 첫 날붙이? 거창한 이름은 됐고, 내 단검이나 잘 벼려줘.”',
                archer: '“내 화살이 늘 수관 바깥을 향했던 게 그 첫 번째 강철 때문이었군.”',
                cleric: '“기도문 대신 강철로 태어났다면, 이 향로로 거짓 성소를 부수겠습니다.”',
                occultist: '“세계수의 법칙과 섞이지 않던 내 영혼의 출처가 모루터였군.”',
                alchemist: '“태초의 강철 합금이라니, 제 몸이 가장 완벽한 연금술 시료였네요.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '담금질 수조의 일지', bark: '“미끼로 살의를 보았고 추락으로 날을 세웠다. 내 심장이 마지막 숫돌이다. (하켄 일지)”' }),
        boss: Object.freeze({ intro: '「드루이드 하켄이 자신이 벼려낸 칼날의 마지막 담금질을 위해 일어난다.」', half: '“성소의 독과 중정의 추락을 모두 견뎠군. 이제 내 심장을 꿰뚫어 보아라!”', defeat: '“충분히 예리해졌군. 내 죽음을 밟고 올라가 정원사의 목을 베어라.”' })
    }),
    6: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“황금 길이 끊긴 지금, 호혜를 잃은 정원사는 필멸자에 불과하다.”',
            loopBark: '“정원사의 손끝이 떨리고 있어. 네 발걸음에서 자기가 베였던 악몽을 본 거지.”',
            classBarks: Object.freeze({
                warrior: '“네가 부러뜨렸던 의식용 가위의 주인이 저기 서 있다. 이제 결판을 내거라.”',
                wanderer: '“네가 엿듣고 폭로했던 정원사의 맥박이 이제 필멸의 박동으로 내려앉았어.”',
                archer: '“너의 관측구를 부수고 눈을 가리려 했던 정원사가 마지막 가위를 들었군.”',
                cleric: '“너를 파문하고 우물로 밀어 넣었던 교단의 주인이 이제 피를 흘리는군.”',
                occultist: '“너의 금서를 불태우던 정원사도 결국 나이테가 썩는 건 막지 못했어.”',
                alchemist: '“네 실험실을 태웠던 정원사가 정작 자신은 방부 수액에 절여져 있군.”'
            }),
            classReplies: Object.freeze({
                warrior: '“불멸이 사라진 정원사가 얼마나 버틸지, 내 방패로 시험해 보겠다.”',
                wanderer: '“호혜가 끊긴 도살자라, 이제야 공평한 싸움이 되겠네.”',
                archer: '“가위가 무뎌진 정원사에게 더 이상 숨을 온실은 없어.”',
                cleric: '“잘려 나간 가지들의 고해를 대신하여 정원사에게 종언을 고하겠습니다.”',
                occultist: '“수액 공급이 끊긴 지금이 정원사를 끝장낼 기회야.”',
                alchemist: '“불멸이 빠진 정원사의 혈액 샘플, 얼마나 변질됐을지 기대되네요.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '부러진 가위 안쪽의 명문', bark: '“한 가지를 살릴 수 있다면 기꺼이 만대의 도살자로 남으리라. (가위의 명문)”' }),
        boss: Object.freeze({ intro: '「불멸을 잃은 정원사가 이가 나간 거대한 가위를 끌며 일어선다.」', half: '“내가 쓰러지면 누가 저 바깥의 도끼날을 막는단 말이냐!”', defeat: '「정원사가 무너지자 억눌렸던 수액이 수관 위쪽으로 역류하기 시작한다.」' })
    }),
    7: Object.freeze({
        npc: Object.freeze({
            name: '배교자 이벨',
            bark: '“살겠다고 줄기를 찢고 나온 곳이야. 기도문 대신 부적을 챙겨.”',
            loopBark: '“초면인데도 내 좌판 쪽으로 바로 걸어오네? 오래 알고 지낸 단골처럼 말이야.”',
            classBarks: Object.freeze({
                warrior: '“어이, 가위를 부러뜨렸다는 전설의 근위병 양반! 살아 있을 줄은 몰랐는데?”',
                wanderer: '“중정 그림자 처형인 아가씨 아냐? 그 단검, 내 목을 노리는 건 아니지?”',
                archer: '“허공뿌리 파수꾼이군. 중정 장부에서 네 추방 기록을 본 적이 있어.”',
                cleric: '“그 사슬 향로, 중정 고해소 물건이잖아? 너도 나처럼 파문당해 내려왔군.”',
                occultist: '“금서 서고에서 쫓겨난 비술사 아가씨네. 네가 예언한 대로 줄기가 다 썩었어.”',
                alchemist: '“금지된 접목체를 키우다 쫓겨난 연금술사 맞지? 내 좌판에 쓸 만한 독이 많아.”'
            }),
            classReplies: Object.freeze({
                warrior: '“부적이든 검이든 가리지 않는다. 수관으로 오르는 길만 비켜라.”',
                wanderer: '“암시장 냄새가 아주 익숙하네. 쓸 만한 물건 있으면 좀 내놔 봐.”',
                archer: '“줄기를 찢고 나가는 삽목들의 마음, 바깥을 보던 나도 이해해.”',
                cleric: '“교복의 금실을 뜯어내셨군요. 위선의 성소보다 이곳이 훨씬 정직합니다.”',
                occultist: '“썩어가는 어미나무에서 스스로를 잘라내고 탈출하다니, 현명한 선택이야.”',
                alchemist: '“원한을 새긴 부적이라니, 영혼 공명 촉매로 쓰기에 딱 좋겠네요.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '삽목 선봉대의 선언문', bark: '“스스로 줄기를 찢고 떠나는 것은 배신이 아니라 번식이다. (삽목 선언문)”' }),
        boss: Object.freeze({ intro: '「속 빈 줄기의 나선 계단 끝에서 줄기의 전령이 나팔을 들어 올린다.」', half: '「전령의 균열된 갑주 사이로 역류하는 보랏빛 수액이 소용돌이친다.」', defeat: '「전령이 무너지고, 역류하는 수액 너머로 하얀 장막의 성소가 드러난다.」' })
    }),
    8: Object.freeze({
        npc: Object.freeze({
            name: '배교자 이벨',
            bark: '“장막 안의 순례자가 왜 너와 똑같은 기술을 쓰는지 직접 확인해 봐.”',
            loopBark: '“장막 바닥의 발자국이 지난번보다 더 깊게 패였어. 대체 몇 번째 걸음이야?”',
            classBarks: Object.freeze({
                warrior: '“장막 안의 저 순례자, 방패를 치켜드는 각도가 너랑 소름 끼치게 똑같아.”',
                wanderer: '“저 안의 그림자, 단검을 역수로 쥐고 숨는 버릇이 너랑 판박이던데?”',
                archer: '“장막 너머에서 날아오는 화살 궤적이 네가 시위를 당기는 버릇이랑 똑같아.”',
                cleric: '“장막 안에서 들리는 사슬 향로 소리, 네가 걸을 때 나는 박자랑 똑같잖아.”',
                occultist: '“장막 안쪽에서 떠도는 저 검은 오브의 궤적, 네 손버릇이랑 똑같은데?”',
                alchemist: '“장막 바닥에 쏟아진 초록 시약 냄새, 네가 들고 있는 플라스크랑 똑같아.”'
            }),
            classReplies: Object.freeze({
                warrior: '“내 검법을 흉내 내는 망령이라면 내 손으로 직접 베어 넘기겠다.”',
                wanderer: '“내 손버릇을 똑같이 따라 하는 스토커라니, 기분 나빠서라도 베어야겠네.”',
                archer: '“내 화살 궤적을 아는 상대라면 더 망설일 것 없이 시위를 당겨야지.”',
                cleric: '“이전 계절에 쓰러진 저의 잔영이라면, 이번에는 안식을 주어야겠군요.”',
                occultist: '“지난 계절에 이곳을 지나간 내 그림자군. 직접 마주해 보지.”',
                alchemist: '“이전 회차의 저 자신이 남긴 부산물이라니, 해부해 볼 가치가 충분해요.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '장막에 박힌 녹슨 칼날들', bark: '“바닥에 꽂힌 칼자루마다 당신과 똑같은 손금이 찍혀 있다. (무명 순례록)”' }),
        boss: Object.freeze({ intro: '「겹겹이 접힌 시간의 장막 사이에서 순례자가 걸어 나온다.」', half: '「순례자의 가면이 갈라지며 당신과 닮은 오래된 흉터가 비친다.」', defeat: '「순례자가 스러지자 장막이 걷히고 황금빛 수관이 모습을 드러낸다.」' })
    }),
    9: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“잘려 나간 아홉 가지의 생명이 저 고치 안에서 하나로 꿰매어져 있다.”',
            loopBark: '“고치 안의 아이가 네 발소리에 맞춰 울고 있어. 지난 계절의 온기를 기억하나 봐.”',
            classBarks: Object.freeze({
                warrior: '“아홉 가지를 벨 때는 망설임 없던 네 검도, 저 고치의 울음 앞에서는 무겁군.”',
                wanderer: '“위선자들의 목만 따던 네 단검이 어미의 비탄 앞에서는 잠시 멈추는군.”',
                archer: '“별빛을 쫓던 네 화살이 마지막에는 가장 슬픈 왕관을 겨누게 되었네.”',
                cleric: '“중정의 성수보다 저 어미가 흘리는 눈물이 더 성스럽다는 걸 너는 알겠지.”',
                occultist: '“아홉 생명을 하나로 기워낸 저 절망의 고치를 네 손으로 끝맺을 수 있겠나.”',
                alchemist: '“정원사가 평생을 바쳐 배양한 최후의 접목체가 저 고치 안에서 울고 있어.”'
            }),
            classReplies: Object.freeze({
                warrior: '“울음소리가 아무리 커도 내 발걸음은 멈추지 않는다.”',
                wanderer: '“아홉 가지를 기워 만든 고치라, 정원사의 마지막 발악이 눈물겹네.”',
                archer: '“고치 너머의 하늘을 보려면 이 슬픈 합창부터 끝내야 해.”',
                cleric: '“아홉 가지의 비탄을 거두고, 고치 속의 아이가 짐을 내려놓게 하소서.”',
                occultist: '“바깥의 도끼에 맞서려 만든 마지막 방패였군. 여기서 끝내주지.”',
                alchemist: '“아홉 생명을 하나로 응축한 고치라니, 연금술의 극치에 가까운 결정체네요.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '접목원 석판의 기도문', bark: '“아홉 가지의 울음을 묶어 바깥의 도끼를 견딜 고치를 기웠다. (접목원 석판)”' }),
        boss: Object.freeze({ intro: '「황금 고치를 품은 접목의 어머니가 아홉 목소리로 합창을 시작한다.」', half: '「고치 표면에 금이 가며 눈부신 금빛 후광이 수관을 물들인다.」', defeat: '「어머니가 쓰러지자 고치가 열리고 금빛 존재가 차륜으로 떠오른다.」' })
    }),
    10: Object.freeze({
        npc: Object.freeze({
            name: '관측자의 그림자, 베일라',
            bark: '“손을 잡을지, 도끼날이 되어 계절을 감을지 당신의 선택을 기록하겠습니다.”',
            loopBark: '“다시 차륜의 끝에 서셨군요. 이번엔 저 한 뼘의 틈이 좁혀질지 기록하겠습니다.”',
            classBarks: Object.freeze({
                warrior: '“부러진 근위병이여, 마지막 차륜 위에서 방패를 내릴지 검을 들지 기록하겠습니다.”',
                wanderer: '“그림자 속을 걷던 처형인이 가장 밝은 수관 끝에서 내릴 선택을 지켜보겠습니다.”',
                archer: '“별을 쫓던 파수꾼이여, 수관의 끝에서 마주한 저 창공을 어떻게 기록할지 보겠습니다.”',
                cleric: '“파문당한 사제여, 당신의 향로가 마지막 존재에게 구원이 될지 심판이 될지 보겠습니다.”',
                occultist: '“금서의 해독자여, 되감기는 계절의 마지막 물음에 어떻게 답할지 기록하겠습니다.”',
                alchemist: '“이단 배양가여, 세계수가 빚어낸 마지막 결정체 앞에서 어떤 반응을 보일지 기록하죠.”'
            }),
            classReplies: Object.freeze({
                warrior: '“도끼날이 될 생각은 없다. 내 끝은 내 검으로 정한다.”',
                wanderer: '“누구 손도 안 잡을 건데? 내 운명은 내가 알아서 베어낼 거거든.”',
                archer: '“기록해 두어라. 내 화살이 차륜 너머의 별에 닿는 순간을.”',
                cleric: '“구원이든 심판이든, 이 마지막 차륜 위에서 기도를 끝맺겠습니다.”',
                occultist: '“관측자의 기록, 이번 계절의 해답이 윤회의 끝을 여는지 지켜보라고.”',
                alchemist: '“마지막 반응 실험을 시작할게요. 플라스크가 깨질지 차륜이 녹을지 보자고요.”'
            }),
            tone: 'cyan'
        }),
        stele: Object.freeze({ title: '합일의 차륜 비문', bark: '“첫 날붙이가 완성되기 전까지 계절의 차륜은 멈추지 않는다. (차륜의 비문)”' }),
        boss: Object.freeze({ intro: '「가장 높은 차륜 위에서 고치에서 태어난 존재가 금빛 후광을 펼친다.」', half: '「차륜 바깥의 허공이 갈라지며 거대한 도끼날의 그림자가 드리운다.」', defeat: '「맞닿지 못한 두 손끝의 작은 틈새로 계절의 나이테가 다시 감긴다.」' })
    })
});

const STORY_TRIAL_ENCOUNTERS = Object.freeze({
    trial_1: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“첫 번째 숫돌을 통과해 무딘 껍질을 벗어낸 자만이 전직의 길을 얻는다.”', tone: 'gold' }),
        stele: Object.freeze({ title: '폐기된 시제품 목록', bark: '“벼려지는 고통을 피하려 물러선 쇠는 자루에 끼워지지 않는다. (초벌 각인)”' }),
        boss: Object.freeze({ intro: '「군더더기를 도려내는 숫돌의 집행자가 회랑 끝에서 모습을 드러낸다.」', half: '「집행자의 칼날이 회랑 벽면의 숫돌과 부딪히며 불꽃을 튀긴다.」', defeat: '「초벌 벼림을 견뎌낸 강철 위에 첫 번째 전직의 각인이 새겨진다.」' })
    }),
    trial_2: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“화염, 냉기, 번개 세 화로의 열기를 견뎌내어 네 성질을 증명하라.”', tone: 'gold' }),
        stele: Object.freeze({ title: '균열된 담금질 기록', bark: '“세 수조를 건너며 결이 갈라지지 않았다면 두 번째 각인을 새겨라. (화로 규율)”' }),
        boss: Object.freeze({ intro: '「세 화로의 열기와 한기가 삼원 제단 중앙의 수호자에게 응집된다.」', half: '「수호자의 몸에서 화염, 서리, 번개의 파동이 교차하며 제단을 흔든다.」', defeat: '「삼원의 담금질을 마친 칼날이 흔들리지 않는 경도를 얻는다.」' })
    }),
    trial_3: Object.freeze({
        npc: Object.freeze({ name: '배교자 이벨', bark: '“나무의 피가 피운 독무 속에서도 무뎌지지 않는 날만 심재에 닿지.”', tone: 'violet' }),
        stele: Object.freeze({ title: '녹슨 칼날들의 묘비', bark: '“독무에 머문 날은 모두 부식되었다. 스칠 자리와 멈출 자리를 알라. (정원 묘비)”' }),
        boss: Object.freeze({ intro: '「썩은 수액을 머금은 정원의 수호자가 독무 중심에서 모습을 드러낸다.」', half: '「수호자가 내뿜는 짙은 독무가 정원 바닥의 빈틈을 잠식해 들어온다.」', defeat: '「부식되지 않는 서슬을 증명한 칼날 위에 세 번째 전직이 열린다.」' })
    }),
    trial_4: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“나무의 피와 바깥의 공허가 교차하는 십자 회랑에서 축을 세워라.”', tone: 'gold' }),
        stele: Object.freeze({ title: '네 번째 모루의 기록', bark: '“네 번의 벼림을 견딘 칼날은 더 이상 대장장이의 망치를 찾지 않는다. (모루 기록)”' }),
        boss: Object.freeze({ intro: '「피와 공허가 교차하는 네거리 심장부에서 미궁의 심판자가 깨어난다.」', half: '「십자 회랑의 네 벽면에서 핏빛 칼날과 공허의 파동이 동시에 교차한다.」', defeat: '「십자의 교차를 넘어선 칼날이 마침내 전직의 핵심에 도달한다.」' })
    }),
    trial_5: Object.freeze({
        npc: Object.freeze({ name: '관측자의 그림자, 베일라', bark: '“모든 재생과 온기가 거세된 혹한 속에서 피어나는 것이 진짜 개화입니다.”', tone: 'cyan' }),
        stele: Object.freeze({ title: '백야의 심장 관측록', bark: '“겨울 미궁 끝에서 돌아온 칼날에 지워지지 않는 재능의 꽃이 피었다. (백야 기록)”' }),
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
        quote: '“줄기 하나에 잔가지를 엮으면 수액의 물살도 배로 거세지는 법이지.”'
    }),
    research: Object.freeze({
        narration: Object.freeze(['부서진 젬의 잔향 속에서 잊힌 전투 기법의 문양들이 떠오릅니다.', '흩어진 잔향을 모아 아직 손에 넣지 못한 새로운 기술을 복원합니다.']),
        speaker: '뿌리끝의 드루이드, 하켄',
        quote: '“부서진 잔향 속에도 우물로 버려졌던 옛 가지들의 기술이 남아 있다.”'
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
        quote: '“실물은 계절과 함께 흩어져도, 그 안에 깃든 명성은 나이테에 남는다.”'
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
        quote: '“줄기는 다시 자라도 밑동에 한 번 감긴 나이테는 시간이 지우지 못한다.”'
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
        quote: '“미궁의 균사는 침입자의 발걸음을 먹고 끝없이 새로운 방을 빚어내지.”'
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
        quote: '“가장 깊은 암반을 뚫고 내린 뿌리는 그 어떤 도끼질에도 뽑히지 않는다.”'
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
        quote: '“가장 깊은 뿌리는 흙이 아니라 빛 한 점 없는 검은 바다를 마시고 있었지.”'
    }),
    fishing: Object.freeze({
        narration: Object.freeze(['검은 해구 가장자리의 고요한 물가에서 심해의 생명체를 건져 올릴 낚시터가 열립니다.', '건져 올린 어획물의 도감 기록과 보너스는 계절이 바뀌어도 유지됩니다.']),
        speaker: '접목사 베른',
        quote: '“잠시 칼을 내려놓고 검은 물결이 보내오는 태고의 숨결을 낚아 보아라.”'
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

// The boss lines of the endgame fights, spoken like an act boss's (key: zone id; an atlas map's apex boss by its
// atlasStages id).
const STORY_ENDGAME_ENCOUNTERS = Object.freeze({
    s2_boss_flame: Object.freeze({
        intro: '「타오르는 뿌리의 화로에서 화염 군주 이그니스가 불길을 일으킨다.」',
        half: '「이그니스의 갑주가 달궈지며 주변 바닥으로 잿불 열기가 번진다.」',
        defeat: '「불길이 잦아들고, 식어가는 잿더미 속에서 군주의 핵이 드러난다.」'
    }),
    s2_boss_frost: Object.freeze({
        intro: '「얼어붙은 수액의 왕좌에서 서리 여제 글라시아가 눈을 뜬다.」',
        half: '「글라시아의 숨결이 회랑의 공기를 얼리며 발걸음을 붙잡는다.」',
        defeat: '「얼음 왕관이 부서지며 차갑게 응축된 군주의 핵이 남는다.」'
    }),
    s2_boss_storm: Object.freeze({
        intro: '「수관 끝의 벼락을 머금은 폭풍 군단장 볼타가 창을 겨눈다.」',
        half: '「볼타의 주변으로 사나운 뇌전이 감기며 연격의 속도가 빨라진다.」',
        defeat: '「뇌전이 흩어지고 전류가 맥동하는 군주의 핵이 바닥에 떨어진다.」'
    }),
    s6_beast_cerberus: Object.freeze({
        intro: '「밑거름 구덩이의 파수견, 세 머리의 케르베로스가 사슬을 끊고 포효한다.」',
        half: '「잘려 나간 목의 자리마다 검은 수액이 솟구치며 몸집이 부풀어 오른다.」',
        defeat: '「세 개의 아가리가 모두 침묵하며 야수왕의 거대한 육신이 무너진다.」'
    }),
    apex_gardener: Object.freeze({
        intro: '「다섯 권역의 가위 조각이 맞물리며 전성기의 정원사가 메아리로 재현된다.」',
        half: '“잘라내도 잘라내도 다시 자라나는군! 네놈이 정녕 이 나무의 종말이냐!”',
        defeat: '「정원사의 메아리가 흩어지며 그가 끝내 지키려 했던 가지 왕관이 남는다.」'
    }),
    apex_compost: Object.freeze({
        intro: '「우물 밑바닥에 버려진 수만 가지의 원한이 밑거름의 장로로 깨어난다.」',
        half: '「장로의 몸에서 마름병 포자가 터져 나오며 사도들의 군세를 불러낸다.」',
        defeat: '「썩어 문드러진 거체가 가라앉으며 박동하는 장로의 심장이 남는다.」'
    }),
    apex_weaver: Object.freeze({
        intro: '「되감긴 계절의 틈새에서 나이테를 엮는 자가 시간의 베틀을 돌린다.」',
        half: '「당신이 지난 계절에 베어 넘겼던 보스들의 잔상이 나이테 위로 불려 나온다.」',
        defeat: '「시간의 베틀이 멈추고, 끊어지지 않는 엮인 나이테가 손에 들어온다.」'
    }),
    apex_archbishop: Object.freeze({
        intro: '「성화 잉걸을 삼킨 검은 태양의 대사제가 불타는 제단 위에서 강림한다.」',
        half: '“타올라라! 나무의 썩은 속살을 모두 태워야 검은 태양이 떠오른다!”',
        defeat: '「광신도의 성화가 꺼지고 제단 위에 불멸의 성물이 남겨진다.」'
    }),
    apex_devourer: Object.freeze({
        intro: '「푸른 제단의 허기를 먹고 자란 고대의 식충이 심재를 뚫고 기어 나온다.」',
        half: '「끝없는 허기가 전장을 집어삼키며 사방에서 뿌리 촉수가 솟구친다.」',
        defeat: '「세계수를 갉아먹던 거대한 아가리가 찢어지며 삼켜졌던 유물이 쏟아진다.」'
    }),
    rival_overheat: Object.freeze({
        intro: '“내가 먼저 베면 된다! 녹아내리기 전에 네 목부터 태워주마!”',
        half: '「제 열기를 이기지 못한 두 번째 날의 손잡이가 붉게 녹아내리기 시작한다.」',
        defeat: '“결국… 내 열기에 내가 먼저 타버리는군…”'
    }),
    rival_dull: Object.freeze({
        intro: '“베지 못해도 상관없다. 끝까지 부러지지 않는 쪽이 이기는 거다!”',
        half: '「무딘 강철 덩어리가 엄청난 무게로 바닥을 찍어 누르며 충격파를 일으킨다.」',
        defeat: '“부러지지 않는 것만으로는… 끝내 날이라 불릴 수 없었나…”'
    }),
    rival_glutton: Object.freeze({
        intro: '“네 피와 수액을 전부 삼켜주마! 배가 부를수록 상처는 사라지니까!”',
        half: '「지나치게 많은 피를 삼킨 네 번째 날의 궤적이 무겁게 둔해진다.」',
        defeat: '“너무 많이 삼켰어… 날이… 더 이상 들지 않아…”'
    }),
    rival_afterimage: Object.freeze({
        intro: '“보이지 않는 칼날은 부러지지도 않지. 그림자 속에서 베어주마.”',
        half: '「허공을 스치는 수십 겹의 잔영이 사방에서 동시에 파고든다.」',
        defeat: '“부딪히기를 피한 칼날은… 결국 아무것도 베지 못하는군…”'
    }),
    rival_backedge: Object.freeze({
        intro: '“내 손목이 끊어지더라도 네 갑옷 안쪽의 심장부터 도려내주마!”',
        half: '「역날이 뿜어내는 피보라가 적과 자신의 몸을 가리지 않고 할퀸다.」',
        defeat: '“방향이 틀렸다고 했지… 끝내 내 손목부터 끊어지는군…”'
    }),
    rival_masterwork: Object.freeze({
        intro: '“나무꾼이 끝내 손에서 놓지 않은 완성작의 검격을 네 몸에 새겨주마.”',
        half: '“어째서냐! 버려진 첫 번째 파편이 어째서 완성작인 나보다 날카로운 것이냐!”',
        defeat: '“알겠다… 모루에 남은 나보다, 진흙을 기어 오른 네가 진짜 날이었다.”'
    }),
    outside_chaos_woodsman: Object.freeze({
        intro: '“종착점에 닿았군, 나의 첫 번째 날붙이여. 어디 네 서슬을 달아보자.”',
        half: '“자루에서 벗어난 날붙이가 감히 주인의 손목을 겨누는가!”',
        defeat: '“훌륭하다… 이제 너는 내 도끼의 부품이 아니라 스스로 베는 칼날이다.”'
    }),
    pinnacle_underking: Object.freeze({
        intro: '「세계수의 가장 깊은 뿌리를 아래에서 태우던 지핵군주 모르그란이 일어난다.」',
        half: '「지핵의 용광로가 들끓으며 대지를 파쇄하는 강타가 내리꽂힌다.」',
        defeat: '「지핵군주가 무너지며 뿌리 아래를 짓누르던 영겁의 침묵이 갈라진다.」'
    }),
    pinnacle_leviathan: Object.freeze({
        intro: '「빛 한 점 닿지 않는 천 미터 해구에서 고대 포식자 탈라사가 떠오른다.」',
        half: '「심해의 검은 조류와 수압이 소용돌이치며 숨통을 조여 온다.」',
        defeat: '「무광해의 포식자가 심연으로 가라앉으며 태고의 바다 길이 열린다.」'
    }),
    pinnacle_sky: Object.freeze({
        intro: '「창공의 탑 꼭대기, 주인 없는 왕좌 앞을 지키던 집행자 카엘룸이 기동한다.」',
        half: '「천정의 번개가 카엘룸의 칼끝으로 집중되며 빈틈없는 연격이 쏟아진다.」',
        defeat: '「빈 왕좌의 자동 집행자가 멈춰 서고, 수관 너머의 천공이 활짝 열린다.」'
    }),
    cosmos_astra: Object.freeze({
        intro: '「소멸한 다섯 은하의 유언이 하나의 잔향체 아스트라로 응집되어 빛난다.」',
        half: '「다섯 별의 중력과 심판이 성간의 궤도를 뒤틀며 전장을 짓누른다.」',
        defeat: '「다섯 별의 잔향이 잠들며 성간의 침묵 너머로 마지막 경계가 열린다.」'
    }),
    pinnacle_observer: Object.freeze({
        intro: '“모든 기록이 모였습니다. 이제 마지막 경계에서 당신의 무게를 달아보겠습니다.”',
        half: '“땅과 바다, 창공과 별의 시련을 모두 넘었군요. 하지만 이 경계는 더 깊습니다!”',
        defeat: '“관측을 종료합니다. 이제 당신은 누구의 도구도 아닌, 경계 너머의 주인입니다.”'
    })
});

safeExposeData({
    STORY_JOURNAL_SCENES, STORY_BRIDGE_SCENES, STORY_SCENE_QUOTES,
    STORY_CLASS_ORIGINS, STORY_NPCS, STORY_ACT_ENCOUNTERS, STORY_TRIAL_ENCOUNTERS, STORY_ENDGAME_ENCOUNTERS, STORY_LOOP_MILESTONES
});
