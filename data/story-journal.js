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
    {"id":"act_8_start","title":"액트 8, 장막의 성소","act":8,"phase":"start","journal":"act_8","image":"assets/journal/unified-20260910/act-8.webp","lines":["줄기 끝을 넘어선 곳에는 침입자의 기억과 그림자를 겹겹이 비추는 하얀 장막의 성소가 펼쳐져 있었습니다.","희미한 촛불이 줄지어 선 통로마다, 누군가 오래전에 지나간 순례의 흔적이 겹겹이 쌓여 있었습니다."]},
    {"id":"act_9_start","title":"액트 9, 황금빛 수관","act":9,"phase":"start","journal":"act_9","image":"assets/journal/unified-20260910/act-9-start.webp","lines":["장막이 걷히자 아래쪽 뿌리에서 끌어올린 모든 수액이 응집된 황금빛 수관이 모습을 드러냈습니다.","바깥의 도끼에 맞서기 위해 잘려 나간 아홉 가지를 하나로 꿰맨 거대한 고치가 수관 중심에서 맥동하고 있었습니다."]},
    {"id":"act_9_end","title":"액트 9, 고치에서 태어난 존재","act":9,"phase":"end","journal":"act_9","image":"assets/journal/unified-20260910/act-9-end.webp","lines":["고치를 지키던 접목의 어머니가 쓰러지자, 고치의 외피에 금이 가며 안쪽에서 낮은 박동이 터져 나왔습니다.","그 안에서 깨어난 형상이 옅은 금빛 후광을 두른 채 세계수의 가장 높은 차륜으로 날아올랐습니다."]},
    {"id":"act_10_end","title":"액트 10, 손끝 사이","act":10,"phase":"end","journal":"act_10","image":"assets/journal/unified-20260910/act-10.webp","lines":["합일의 차륜 위에서 쓰러진 존재가 당신을 향해 힘없이 손을 뻗었습니다.","당신도 몸을 숙여 손을 내밀었지만, 끝내 맞닿지 못한 두 손끝의 한 뼘 틈새 아래로 깊은 혼돈 층계가 입을 열었습니다."]}
]);

// Text-only scenes for beats the illustrated set skips (act 1 only: the act 3, 7 and 8 ends were dropped on
// 2026-10-15, docs/stage-view-20261011.md). A scene added here after release needs the seen marker in js/story-journal-ui.js
// markPassedBridges raised, or saves already past its act get it out of order.
const STORY_BRIDGE_SCENES = Object.freeze([
    {"id":"act_1_start","title":"액트 1, 뿌리의 드루이드","act":1,"phase":"start","journal":"act_1","lines":["우물 바닥에서 몸을 일으켜 문 너머로 나섰을 때, 폭주한 잔뿌리 괴물 둘에게 몰려 신음하는 늙은 드루이드 하켄이 보였습니다.","당신이 무장을 고쳐 쥐고 달려들어 괴물들을 베어 넘기자, 기사회생한 노인은 거친 숨을 고르며 중정으로 오르는 통로를 가리켰습니다."]}
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
        spotLine: '“문 너머에 노인이 몰리고 있군.”',
        bossLines: Object.freeze({
            2: '“분명히 베었는데… 바닥의 금빛 관이 상처를 도로 붙이는군.”',
            4: '“거짓 불멸은 끝났다. 품에서 떨어진 이 열쇠는 성소 바닥의 것인가.”',
            5: '“날 무기로 벼려냈다고… 결국 네 목을 베는 칼이 되었군.”',
            6: '“바깥의 도끼라… 변명치고는 흘린 피가 너무 많다.”',
            8: '“바닥에 박힌 저 녹슨 검과 방패… 내 손자국이 왜 여기에 남아 있지.”',
            10: '“검을 거두고 손을 뻗었건만… 한 뼘이 닿지 않는군.”'
        })
    }),
    wanderer: Object.freeze({
        label: '방랑자 (그림자 처형인)',
        wakeLine: '“시체 더미 밑바닥이라, 늘 일하던 그늘 같네.”',
        spotLine: '“저 노인네, 괴물들한테 뜯어먹히기 직전인데?”',
        bossLines: Object.freeze({
            2: '“심장이 아니라 바닥의 수액줄에 목숨을 묶어뒀네.”',
            4: '“목숨줄이 끊기니 단검 한 자루면 충분하네. 이제 성소로 내려가 볼까.”',
            5: '“은인인 척하더니 날 암살용 단검으로 갈고 있었네.”',
            6: '“도끼가 무서워 가지를 쳤다고? 위선자다운 유언이네.”',
            8: '“장막에 남은 단검 자국들… 각도까지 내 버릇 그대로야.”',
            10: '“모처럼 무기를 내리고 손을 뻗었는데… 한 뼘 앞에서 멈추네.”'
        })
    }),
    archer: Object.freeze({
        label: '궁수 (별을 쫓는 파수꾼)',
        wakeLine: '“위쪽에서 마른 바람이 불어 내려와.”',
        spotLine: '“문 너머의 노인이 위험해. 시위부터 당기자.”',
        bossLines: Object.freeze({
            2: '“급소는 빗나가지 않았어. 바닥의 수액줄이 과녁을 되살리고 있네.”',
            4: '“운반선이 끊기자 부제녀를 감싸던 금빛 아지랑이도 걷혔어.”',
            5: '“바깥에서 떨어진 쇠조각… 그래서 내 눈이 늘 별을 향했던 거구나.”',
            6: '“온실 천장이 무너진다, 정원사. 이제 바람이 통하겠어.”',
            8: '“안개 바닥에 박힌 저 녹슨 화살촉들… 전부 내가 쏜 깃이야.”',
            10: '“손을 뻗어도 한 뼘 모자란 거리네. 아직 더 깊은 곳이 남았나 봐.”'
        })
    }),
    cleric: Object.freeze({
        label: '성직자 (파문당한 고해사제)',
        wakeLine: '“가장 낮은 진흙 속에서도 향로의 불씨는 남았군요.”',
        spotLine: '“문 너머에 쓰러진 분이 계시는군요.”',
        bossLines: Object.freeze({
            2: '“아랫것들의 피를 쥐어짜 만든 불멸이 어찌 은총일 수 있습니까.”',
            4: '“착취의 관이 끊겼으니, 이제 필멸의 안식을 맞이하소서.”',
            5: '“복수의 연장으로 저를 시험하셨으나, 당신의 고통도 거두어 드리리다.”',
            6: '“가위에 잘려 나간 수천 가지의 원혼이 당신 앞에서 답하는군요.”',
            8: '“장막에 밴 오래된 향내와 핏자국… 기억에 없는 저의 흔적이군요.”',
            10: '“맞뻗은 손끝이 끝내 닿지 않는군요. 아직 건너야 할 심연이 남았습니다.”'
        })
    }),
    occultist: Object.freeze({
        label: '비술사 (금서의 해독자)',
        wakeLine: '“추락의 충격에도 오브는 깨지지 않았네.”',
        spotLine: '“저 노인을 덮치는 잔뿌리들부터 치우자.”',
        bossLines: Object.freeze({
            2: '“중정의 수액 회로가 죽음 자체를 거부하고 있어.”',
            4: '“수송로가 끊기자 불멸의 술식도 허무하게 무너지네.”',
            5: '“세계수의 법칙과 섞이지 않던 내 기운… 모루터의 쇠였기 때문이군.”',
            6: '“억제기였던 가위가 부러지자 수액이 수관 꼭대기로 역류하네.”',
            8: '“착각이 아니야. 장막 바닥의 발자국은 전부 내가 남긴 흔적이었어.”',
            10: '“손끝이 닿기엔 아직 해답이 한 뼘 부족해. 아래쪽 심연으로 내려가 보자.”'
        })
    }),
    alchemist: Object.freeze({
        label: '연금술사 (이단 배양가)',
        wakeLine: '“진흙 구덩이로 떨어졌는데 플라스크는 무사하네요.”',
        spotLine: '“저기 위험한 노인분부터 구해볼까요.”',
        bossLines: Object.freeze({
            2: '“부식액을 부었는데도 황금 수액이 상처를 바로 붙여버리네요.”',
            4: '“정제된 수액 공급이 멎으니까 재생 반응도 괴사하네요.”',
            5: '“절 불에 달구고 독에 담가 벼려내셨다고요? 꽤 마음에 들어요.”',
            6: '“정원사의 피에 방부 수액이 가득해요. 썩는 나무를 절여뒀던 거군요.”',
            8: '“장막에 묻은 시약 자국… 배합 비율이 제 플라스크랑 똑같잖아요.”',
            10: '“손을 뻗었는데 한 뼘 차이로 멈췄네요. 아래쪽 심연에서 답을 찾아볼까요?”'
        })
    })
});

// The story's five NPCs (docs/story-bible.md section 4): id (also the stage art's id, data/stage-view.js STAGE_NPC_ART), name as
// the encounters write it, title, and dialogues: the keywords of its window (js/content-progression-ui.js openNpc), each the NPC
// alone speaking (line), shown once the hero has reached act reqAct and loop reqLoop (both optional). Each keeps the unlocks whose
// loop lines it speaks (STORY_LOOP_MILESTONES speaker): its window sells those buyable now (즉시 해금), and its shop (js/npc-shop.js) one kind of ware.
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
            Object.freeze({ topic: '보조스킬룬과 잔향', line: '“우물 바닥에는 앞서 버려진 자들의 기억이 결정으로 굳어 있다. 부서진 잔향을 모아 보면 그들이 남긴 기술의 흔적을 건질 수 있을 거다.”' }),
            Object.freeze({ topic: '군락지 방벽', reqLoop: 15, line: '“죽은 뿌리 냄새를 맡고 지하의 갑충 떼가 성소 방벽까지 기어올라 왔다. 죽은 어미의 껍질을 뒤집어쓰고 불어나는 놈들이니 방벽 밖에서 짓이겨라.”' })
        ])
    }),
    bern: Object.freeze({
        id: 'bern',
        name: '접목사 베른',
        title: '기억을 줍는 눈먼 수도사',
        dialogues: Object.freeze([
            Object.freeze({ topic: '가지치기의 중정', line: '“나는 정원사가 잘라낸 잔가지들을 거두는 눈먼 수도사 베른이다. 이 아름다운 중정 바닥 아래로는 아래쪽 뿌리들의 피를 빨아올리는 황금 수액관이 쉼 없이 맥동하고 있지.”' }),
            Object.freeze({ topic: '그루터기 함', reqAct: 10, line: '“내 눈은 멀었지만 잘려 나간 잔가지들의 맥박은 손끝으로 느낀다. 불씨와 서리처럼 상극인 기운만 피해서 씨앗을 심어 두면 죽어가던 가지도 이 함 안에서 다시 숨을 쉬지.”' }),
            Object.freeze({ topic: '부정한 은총의 부제녀', reqAct: 2, line: '“부제녀도 한때는 아랫가지의 아픔을 돌보던 사제였어. 황금 수액에 취한 뒤로는 하층의 비명을 듣지 못하게 되었지. 발밑의 수액줄을 끊기 전엔 쓰러지지 않는다.”' }),
            Object.freeze({ topic: '성소의 드루이드', reqAct: 5, line: '“처음 성소 옆 방에서 괴물에게 몰리던 하켄을 네가 구해주었다고 믿었나? 내 귀에는 그 노인이 숫돌에 칼을 갈듯 숨죽여 웃던 소리가 똑똑히 들렸어. 넌 구원받은 게 아니라 벼려진 거다.”' }),
            Object.freeze({ topic: '정원사의 가위', reqAct: 6, line: '“정원사는 도살자라는 오명을 쓰면서도 가위를 놓지 않았지. 바깥의 도끼날에 나무 전체가 찍혀 넘어가지 않도록, 아홉 가지를 잘라 수관의 고치 하나를 살리려 한 거야.”' }),
            Object.freeze({ topic: '비탄의 고치', reqAct: 9, line: '“잘려 나간 아홉 가지의 유해가 수관의 황금 고치 안에서 하나로 꿰매어져 있어. 고치를 품은 어미의 노랫소리는 공격이 아니라, 덜 여문 아이를 지키려는 울부짖음이지.”' }),
            Object.freeze({ topic: '고대 미궁과 심해', reqLoop: 3, line: '“뿌리 밑에는 정원사 이전 시대의 지하 미궁이 잠들어 있고, 그 끝은 흙이 아닌 검은 바다에 닿아 있어. 줄기 위가 아무리 흔들려도 가장 깊은 밑동의 기억은 사라지지 않는다.”' })
        ])
    }),
    orga: Object.freeze({
        id: 'orga',
        name: '벼림꾼 오르가',
        title: '부러진 모루의 잔류 사념',
        dialogues: Object.freeze([
            Object.freeze({ topic: '무너진 모루터', line: '“몸뚱이는 바스러졌지만 망치를 쥐던 이 외팔의 사념은 모루에 남았다. 새싹이든 이슬이든 내 화로에 던져 넣으면 강철의 날을 세우는 약재가 되지.”' }),
            Object.freeze({ topic: '첫 번째 날붙이', reqAct: 6, line: '“네 뼈대에서 나는 건 식물의 수액 냄새가 아니다. 태초에 내가 나무꾼의 모루 위에서 첫 번째로 두드렸던 강철의 쇳내지. 하켄도 그걸 알고 제 성소를 숫돌로 쓴 거다.”' }),
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
            Object.freeze({ topic: '장막 안의 순례자', reqAct: 8, line: '“하얀 장막 안쪽을 배회하는 저 순례자 말이야, 숨을 고르는 박자부터 걸음 보폭까지 너랑 판박이잖아. 처음 온 길이라면서 왜 장막 바닥의 해묵은 발자국들이 네 걸음걸이랑 똑같은 거지?”' }),
            Object.freeze({ topic: '부적과 고급 홀씨', reqLoop: 6, line: '“미궁에서 건진 봉인편린에는 잘려 나간 옛 가지들의 원한이 서려 있어. 피를 먹여 깨우면 어떤 갑옷보다 든든한 부적이 되지. 독성 강한 고급 홀씨도 내 좌판에서 구할 수 있어.”' }),
            Object.freeze({ topic: '지하 벌집과 두 제단', reqLoop: 8, line: '“썩은 수액을 먹고 자란 지하 벌집에는 여왕의 밀실마다 진귀한 로열젤리와 밀랍이 쌓여 있어. 아틀라스에서 붉은 제단의 잉걸이나 푸른 제단의 즙을 찾거든 언제든 가져와.”' })
        ])
    }),
    veila: Object.freeze({
        id: 'veila',
        name: '관측자의 그림자, 베일라',
        title: '경계의 기록관',
        dialogues: Object.freeze([
            Object.freeze({ topic: '뿌리 아래의 혼돈 층계', reqAct: 10, line: '“차륜 위에서 맞닿지 못한 한 뼘의 틈을 메우려면 뿌리 아래의 혼돈 층계로 내려가야 합니다. 다섯 번째 층계 끝에서 모루터의 주인이 당신의 서슬을 기다리고 있습니다.”' }),
            Object.freeze({ topic: '합일의 차륜과 윤회', reqLoop: 2, line: '“모루터의 주인이 당신의 서슬이 아직 심재를 가르기엔 무디다고 판단할 때마다 모든 시간이 처음으로 되돌아갑니다. 기억을 간직한 채 다시 우물 바닥에서 눈을 뜨는 이유이지요.”' }),
            Object.freeze({ topic: '세계수의 그림자, 혼돈계', reqLoop: 10, line: '“나무꾼의 도끼날에 흠집을 낸 자에게는 세계수가 드리운 거대한 그림자, 혼돈계가 열립니다. 다섯 권역의 아틀라스 지도를 따라 나무가 감춘 심연의 잔상들을 관측하십시오.”' }),
            Object.freeze({ topic: '공허 균열과 검은 별', reqLoop: 7, line: '“어긋난 나이테의 틈새로 세계수 바깥의 공허가 스며들고, 수관 너머 천공에서는 검은 별의 파편이 줄기 옆구리에 추락했습니다. 나무의 법칙 밖에서 온 힘들이지요.”' }),
            Object.freeze({ topic: '창공의 탑과 성간 항로', reqLoop: 15, line: '“수관이 닿지 못한 허공 위로 부러진 가지들을 쌓아 올린 첨탑이 창공의 탑입니다. 그 너머에는 다섯 은하의 군주가 지배하는 성간 항로와 잔향체 아스트라가 기다립니다.”' }),
            Object.freeze({ topic: '네 곳의 극점과 경계', reqLoop: 31, line: '“지하계의 모르그란, 무광해의 탈라사, 창공의 카엘룸, 그리고 성간의 아스트라. 네 극점의 기록이 모두 당신의 칼끝에 모일 때 비로소 마지막 경계가 열립니다.”' }),
            Object.freeze({ topic: '관측자의 사명', reqLoop: 31, line: '“저는 세계수 바깥의 경계에서 당신이 거듭해 온 모든 궤적을 기록하는 관측자입니다. 창조주의 손아귀에서 벗어날 자격을 갖추었는지 마지막 경계에서 직접 달아보겠습니다.”' })
        ])
    })
});

// Room-stage lines per act (key: STORY_ACTS order; STORY_TRIAL_ENCOUNTERS below has the same shape per trial zone id): npc on
// entering the entry room (loopBark from loop 2 on), stele in a side room (afterClear: after the ending instead), boss intro once the final boss is up,
// half at 55% life, defeat when the map is cleared. Each line 50 characters at most (one line of the band on PC).
const STORY_ACT_ENCOUNTERS = Object.freeze({
    1: Object.freeze({
        npc: Object.freeze({
            name: '뿌리끝의 드루이드, 하켄',
            bark: '“하마터면 잔뿌리들에게 먹힐 뻔했군. 살려주어 고맙다, 앞길의 어미 매듭도 베어다오.”',
            loopBark: '“시간이 돌아와 다시 우물 바닥이군. 문 너머에 있던 노인의 기척은 사라졌다.”',
            classBarks: Object.freeze({
                warrior: '“다시 우물 밑바닥인가. 노인이 없어도 중정으로 오르는 길은 내 검이 기억한다.”',
                wanderer: '“또 이 축축한 우물 바닥으로 돌아왔네. 죽는 시늉 하던 노인네는 어디로 숨었담?”',
                archer: '“시간이 돌아와 다시 우물 바닥이야. 위쪽에서 불어오는 바람결은 그대로네.”',
                cleric: '“다시 가장 낮은 진흙 속으로 돌아왔군요. 멈추지 않고 다시 올라가겠습니다.”',
                occultist: '“모든 시간이 처음으로 돌아왔어. 기억은 온전하니 다시 수관 끝으로 가보자.”',
                alchemist: '“어머, 다시 우물 밑바닥에서 눈을 떴네요. 이번엔 또 어떤 시료를 만날까요?”'
            }),
            classReplies: Object.freeze({
                warrior: '“인사는 됐다. 중정으로 오르는 길이나 알려줘.”',
                wanderer: '“목숨값은 위쪽 중정으로 올라가는 길 안내로 받을게.”',
                archer: '“위쪽에서 불어오는 바람결만 일러줘. 앞길은 내가 뚫을게.”',
                cleric: '“다친 곳은 없으십니까. 출구를 막은 매듭은 제가 거두겠습니다.”',
                occultist: '“이 성소의 지맥 구조부터 알려줘. 출구는 내가 열겠어.”',
                alchemist: '“별말씀을요. 앞길을 막고 있는 큰 뿌리도 마저 녹여드릴게요.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '진흙에 잠긴 파문 명패', bark: '“뿌리내리지 못한 것은 우물의 밑거름이 될지어다. (중정 판결록 제1장)”' }),
        boss: Object.freeze({})
    }),
    2: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“난 버려진 가지를 줍는 베른이다. 중정의 부제녀는 바닥 수액관이 뛰는 한 죽지 않아.”',
            loopBark: '“눈은 멀었지만 손끝은 알지. 초면인데도 이미 내 그루터기 함을 다뤄본 손길이야.”',
            classBarks: Object.freeze({
                warrior: '“방패에 깊게 패인 가위 자국이 느껴지는군. 정원사에게 맞섰던 근위병이 너였어.”',
                wanderer: '“발소리가 조금도 나지 않는군. 중정의 그림자 속에서 일하던 처형인이지?”',
                archer: '“옷자락에서 허공뿌리 끝단의 바람 냄새가 나네. 별을 쫓던 파수꾼이 맞군.”',
                cleric: '“익숙한 고해소의 향내군. 시든 가지에 축복을 내렸다던 사제가 너였어.”',
                occultist: '“금서의 종이 냄새가 아직 가시지 않았군. 우물로 던져졌다던 학자가 살아 있었네.”',
                alchemist: '“소매에서 증류된 균사 냄새가 나네. 불타버린 실험실의 주인이 바로 너였군.”'
            }),
            classReplies: Object.freeze({
                warrior: '“죽지 않는 수호자라. 내 검에 베이지 않는지 직접 확인해 보겠다.”',
                wanderer: '“바닥 수액관에 목숨을 묶어뒀단 말이지? 일단 얼굴부터 보러 가볼까.”',
                archer: '“경고는 고마워, 베른. 중정 안쪽에서 직접 시위를 당겨볼게.”',
                cleric: '“버려진 가지를 거두는 분이시군요. 부제녀는 제가 마주하겠습니다.”',
                occultist: '“바닥의 수액관으로 생명을 유지한다니, 직접 확인해 봐야겠어.”',
                alchemist: '“상처가 바로 붙는 부제녀라니, 어떤 수액 반응인지 시험해 볼게요.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '황금 수액관의 명문', bark: '“허공뿌리의 수액이 흐르는 한 부제의 숨은 끊어지지 않는다. (수액관 명문)”' }),
        boss: Object.freeze({ defeat: '「황금 수액 기둥이 쏟아져 내리며 쓰러진 부제녀를 다시 일으킨다!」' })
    }),
    3: Object.freeze({
        npc: Object.freeze({
            name: '뿌리끝의 드루이드, 하켄',
            bark: '“그 높은 중정에서 떨어지고도 살았구나. 부제녀의 수액줄이 이 숲 아래를 흐른다.”',
            loopBark: '“현수림의 벌레들이 널 보자마자 뒷걸음질 치는군. 전에 썰려본 적이라도 있는 것처럼.”',
            classBarks: Object.freeze({
                warrior: '“방패가 반쯤 찌그러졌는데도 눈빛은 더 매서워졌군.”',
                wanderer: '“추락하면서도 단검으로 뿌리를 찍어 낙하를 멈추더군. 놀라운 감각이야.”',
                archer: '“허공뿌리의 거센 바람 속에서도 화살통 하나 흐트러지지 않았구나.”',
                cleric: '“성녀의 창에 찔리고도 향로의 불씨를 지켰구나. 이제 아랫길을 보거라.”',
                occultist: '“떨어지는 와중에도 중정의 수액 회로를 읽었느냐. 영리한 아이로구나.”',
                alchemist: '“부제녀의 황금 수액을 플라스크에 받아 왔구나. 집념이 대단하군.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '거꾸로 매달린 탄원서', bark: '“수액을 다 바쳤으나 돌아온 것은 정원사의 가위뿐이었다. (허공뿌리 탄원서)”' }),
        boss: Object.freeze({})
    }),
    4: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“미궁 끝에 중정으로 가는 마지막 수액 독이 있다. 그걸 깨야 부제녀의 재생이 멈춘다.”',
            loopBark: '“미궁의 갈림길마다 망설임이 없네. 수액 독이 어디 숨었는지 다 아는 것처럼.”',
            classBarks: Object.freeze({
                warrior: '“근위병의 방패로군. 이 미궁 끝의 수액 독을 부수면 부제녀의 상처도 다시 붙지 못한다.”',
                wanderer: '“수액 회로를 엿듣던 처형인이지. 네가 찾던 중정의 숨통이 이 미궁 끝에 숨어 있어.”',
                archer: '“수관의 바람을 쫓던 파수꾼이군. 성녀의 숨통을 끊으려면 미궁 끝의 수액 독부터 쏘아라.”',
                cleric: '“파문당한 사제의 향로로군. 아랫것들의 피를 모은 수액 독을 깨야 거짓 성녀도 쓰러진다.”',
                occultist: '“금서를 읽던 학자로군. 부제녀의 불멸을 지탱하는 마지막 수액 독이 이 미궁 끝에 있어.”',
                alchemist: '“추방당한 배양가로군. 중정으로 올라가는 정제 수액 독이 이 미궁 끝에서 맥동하고 있어.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '깨진 수액 항아리의 낙인', bark: '“마지막 수액 독이 깨졌다. 성녀도 우리처럼 피를 흘리리라. (부제녀 절명록)”', afterClear: true }),
        boss: Object.freeze({ defeat: '“어리석은 것… 네 등 뒤에서 칼을 갈던 성소의 노인에게 놀아난 줄도 모르고…”' })
    }),
    5: Object.freeze({
        npc: Object.freeze({
            name: '벼림꾼 오르가',
            bark: '“피 냄새에 깼군. 난 무너진 모루의 대장장이 오르가, 이 성소 바닥은 통째로 숫돌이다.”',
            loopBark: '“기이한 일이군. 처음 온 발걸음인데 네 무기엔 이미 내 모루의 벼림 자국이 배어 있다.”',
            classBarks: Object.freeze({
                warrior: '“근위병의 검과 방패라지만, 속살은 내가 태초에 두드린 첫 번째 강철이군.”',
                wanderer: '“가벼운 단검 꼴을 하고 있어도, 뼈대에 서린 살기만큼은 영락없는 첫 날붙이다.”',
                archer: '“화살촉 하나하나에 내 모루의 쇳내가 배어 있군. 넌 활을 든 칼날이다.”',
                cleric: '“사슬 향로를 휘두르지만, 네 영혼의 결은 기도문이 아니라 벼려진 쇠다.”',
                occultist: '“공허 오브로 감싸 두었어도 내 눈은 못 속여. 넌 나무꾼의 첫 번째 강철이다.”',
                alchemist: '“독약으로 철을 녹이는 배양가라더니, 내 모루의 불길과 궁합이 잘 맞겠군.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '담금질 수조의 일지', bark: '“독을 먹이고 추락으로 날을 세웠다. 내 심장이 마지막 숫돌이다. (하켄 일지)”' }),
        boss: Object.freeze({ half: '“단검을 벼린 줄 알았건만, 네 궤적에서 도끼의 그림자가 보이는구나.”', defeat: '“나무꾼의 첫 날붙이여, 내 뿌리로 중정으로 오르는 다리를 놓아주마.”' })
    }),
    6: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“황금 길이 끊긴 지금, 호혜를 잃은 정원사는 필멸자에 불과하다.”',
            loopBark: '“정원사의 손끝이 떨리고 있어. 처음 마주한 네 눈빛에서 섬뜩한 한기를 느낀 모양이다.”',
            classBarks: Object.freeze({
                warrior: '“네가 부러뜨렸던 의식용 가위의 주인이 저기 서 있다. 이제 결판을 내거라.”',
                wanderer: '“네가 엿듣고 폭로했던 정원사의 맥박이 이제 필멸의 박동으로 내려앉았어.”',
                archer: '“너의 관측구를 부수고 눈을 가리려 했던 정원사가 마지막 가위를 들었군.”',
                cleric: '“너를 파문하고 우물로 밀어 넣었던 교단의 주인이 이제 피를 흘리고 있어.”',
                occultist: '“너의 금서를 불태우던 정원사도 결국 나무의 괴사는 막지 못했군.”',
                alchemist: '“네 실험실을 소각했던 정원사가 정작 자신은 방부 수액에 절여져 있네.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '부러진 가위 안쪽의 명문', bark: '“한 가지를 살릴 수 있다면 기꺼이 만대의 도살자로 남으리라. (가위의 명문)”' }),
        boss: Object.freeze({ half: '“내가 쓰러지면 누가 저 바깥의 도끼날을 막는단 말이냐!”', defeat: '“바깥의 도끼 소리가… 이미 나무껍질에 닿았는데…”' })
    }),
    7: Object.freeze({
        npc: Object.freeze({
            name: '배교자 이벨',
            bark: '“살겠다고 줄기를 찢고 나온 곳이야. 기도문 대신 부적을 챙겨.”',
            loopBark: '“초면인데도 내 좌판 쪽으로 바로 걸어오네? 오래 알고 지낸 단골처럼 말이야.”',
            classBarks: Object.freeze({
                warrior: '“가위를 부러뜨렸다는 전설의 근위병 양반! 살아 있을 줄은 몰랐는데?”',
                wanderer: '“중정 그림자 처형인 아가씨 아냐? 그 단검, 내 목을 노리는 건 아니지?”',
                archer: '“허공뿌리 파수꾼이군. 중정 장부에서 네 추방 기록을 본 적이 있어.”',
                cleric: '“그 사슬 향로, 중정 고해소 물건이잖아? 너도 나처럼 파문당해 내려왔구나.”',
                occultist: '“금서 서고에서 쫓겨난 비술사 아가씨네. 네가 예언한 대로 줄기가 다 썩었어.”',
                alchemist: '“금지된 접목체를 키우다 쫓겨난 연금술사 맞지? 내 좌판에 쓸 만한 독이 많아.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '삽목 선봉대의 선언문', bark: '“스스로 줄기를 찢고 떠나는 것은 배신이 아니라 번식이다. (삽목 선언문)”' }),
        boss: Object.freeze({})
    }),
    8: Object.freeze({
        npc: Object.freeze({
            name: '배교자 이벨',
            bark: '“장막 안의 순례자가 왜 너와 똑같은 보폭으로 걷는지 직접 확인해 봐.”',
            loopBark: '“기괴한 일이야. 봉인된 장막 바닥의 해묵은 발자국들이 방금 들어선 네 보폭과 똑같잖아.”',
            classBarks: Object.freeze({
                warrior: '“두건 쓴 저 순례자 말이야, 거리를 재며 발을 딛는 보폭이 너랑 소름 끼치게 똑같아.”',
                wanderer: '“지팡이를 짚은 저 순례자, 기척을 죽이고 사각으로 파고드는 버릇이 너랑 판박이던데?”',
                archer: '“장막 안의 저 순례자, 바람결을 읽으며 멈춰 서는 호흡이 네 버릇이랑 똑같아.”',
                cleric: '“두건 아래로 보이는 저 순례자의 눈매, 걸을 때마다 숨을 고르는 박자가 너랑 똑같잖아.”',
                occultist: '“장막 안쪽을 걷는 저 순례자, 갈림길마다 시선을 두는 순서가 너랑 똑같은데?”',
                alchemist: '“지팡이를 든 저 순례자 말이야, 고개를 기울이며 상대를 관찰하는 버릇이 너랑 똑같아.”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '장막에 박힌 녹슨 칼날들', bark: '“바닥에 꽂힌 칼자루마다 당신과 똑같은 손금이 찍혀 있다. (무명 순례록)”' }),
        boss: Object.freeze({ half: '「순례자의 가면이 갈라지며 당신과 닮은 오래된 흉터가 비친다.」' })
    }),
    9: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“잘려 나간 아홉 가지의 생명이 저 고치 안에서 하나로 꿰매어져 있다.”',
            loopBark: '“이상하군. 갓 여문 고치 안의 아이가 처음 듣는 네 발소리에 맞춰 구슬프게 울고 있어.”',
            classBarks: Object.freeze({
                warrior: '“아홉 가지를 벨 때는 망설임 없던 네 검도, 저 고치의 울음 앞에서는 무겁군.”',
                wanderer: '“위선자들의 목만 따던 네 단검이 어미의 비탄 앞에서는 잠시 멈추는군.”',
                archer: '“별빛을 쫓던 네 화살이 마지막에는 가장 슬픈 왕관을 겨누게 되었군.”',
                cleric: '“중정의 성수보다 저 어미가 흘리는 눈물이 더 성스럽다는 걸 너는 알겠지.”',
                occultist: '“아홉 생명을 하나로 꿰맨 저 절망의 공식을 네 오브로 해독할 수 있겠나.”',
                alchemist: '“정원사가 평생을 바쳐 배양한 최후의 접목체가 저 고치 안에서 울고 있어.”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '접목원 석판의 기도문', bark: '“아홉 가지의 울음을 묶어 바깥의 도끼를 견딜 고치를 기웠다. (접목원 석판)”' }),
        boss: Object.freeze({ defeat: '「어미가 쓰러지자 갈라진 고치 속에서 금빛 존재가 차륜으로 떠오른다.」' })
    }),
    10: Object.freeze({
        npc: Object.freeze({
            name: '관측자의 그림자, 베일라',
            bark: '“수관 끝에 닿으셨군요. 차륜 위에서 고치의 존재와 마주할 마지막 순간을 기록하겠습니다.”',
            loopBark: '“다시 차륜의 끝에 서셨군요. 이번엔 저 한 뼘의 틈이 좁혀질지 기록하겠습니다.”',
            classBarks: Object.freeze({
                warrior: '“부러진 근위병이여, 가장 높은 차륜 위에서 마주할 마지막 결전의 순간을 기록하겠습니다.”',
                wanderer: '“그림자 속을 걷던 처형인이 가장 밝은 수관 끝에서 도달한 마지막 순간을 기록하겠습니다.”',
                archer: '“별을 쫓던 파수꾼이여, 수관의 끝에서 마주한 저 창공을 어떻게 기록할지 보겠습니다.”',
                cleric: '“파문당한 사제여, 가장 높은 차륜 위에서 울려 퍼질 마지막 기도를 기록하겠습니다.”',
                occultist: '“금서의 해독자여, 수관의 정점에서 마주한 마지막 물음에 어떻게 답할지 기록하겠습니다.”',
                alchemist: '“이단 배양가여, 세계수가 빚어낸 마지막 결정체 앞에서 어떤 반응을 보일지 기록하죠.”'
            }),
            tone: 'cyan'
        }),
        stele: Object.freeze({ title: '합일의 차륜 비문', bark: '“아홉 가지의 마지막 숨결이 이 가장 높은 차륜 위에서 하나로 모인다. (차륜의 비문)”' }),
        boss: Object.freeze({ defeat: '「맞뻗은 두 손끝이 한 뼘의 틈을 남기고 멈추며, 차륜 아래로 혼돈의 심연이 열린다.」' })
    })
});

const STORY_TRIAL_ENCOUNTERS = Object.freeze({
    trial_1: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“첫 번째 숫돌을 통과해 무딘 껍질을 벗어낸 자만이 전직의 길을 얻는다.”', tone: 'gold' }),
        stele: Object.freeze({ title: '폐기된 시제품 목록', bark: '“벼려지는 고통을 피하려 물러선 쇠는 자루에 끼워지지 않는다. (초벌 각인)”' }),
        boss: Object.freeze({})
    }),
    trial_2: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“화염, 냉기, 번개 세 화로의 열기를 견뎌내어 네 성질을 증명하라.”', tone: 'gold' }),
        stele: Object.freeze({ title: '균열된 담금질 기록', bark: '“세 수조를 건너며 결이 갈라지지 않았다면 두 번째 각인을 새겨라. (화로 규율)”' }),
        boss: Object.freeze({})
    }),
    trial_3: Object.freeze({
        npc: Object.freeze({ name: '배교자 이벨', bark: '“나무의 피가 피운 독무 속에서도 무뎌지지 않는 날만 심재에 닿지.”', tone: 'violet' }),
        stele: Object.freeze({ title: '녹슨 칼날들의 묘비', bark: '“독무에 머문 날은 모두 부식되었다. 스칠 자리와 멈출 자리를 알라. (정원 묘비)”' }),
        boss: Object.freeze({})
    }),
    trial_4: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“나무의 피와 바깥의 공허가 교차하는 십자 회랑에서 축을 세워라.”', tone: 'gold' }),
        stele: Object.freeze({ title: '네 번째 모루의 기록', bark: '“네 번의 벼림을 견딘 칼날은 더 이상 대장장이의 망치를 찾지 않는다. (모루 기록)”' }),
        boss: Object.freeze({})
    }),
    trial_5: Object.freeze({
        npc: Object.freeze({ name: '관측자의 그림자, 베일라', bark: '“모든 재생과 온기가 거세된 혹한 속에서 피어나는 것이 진짜 개화입니다.”', tone: 'cyan' }),
        stele: Object.freeze({ title: '백야의 심장 관측록', bark: '“겨울 미궁 끝에서 돌아온 칼날에 지워지지 않는 재능의 꽃이 피었다. (백야 기록)”' }),
        boss: Object.freeze({})
    })
});

// One per unlock (data/content-progression.js CONTENT_UNLOCK_CATALOG id); default closes the loop result.
const STORY_LOOP_MILESTONES = Object.freeze({
    craft: Object.freeze({
        narration: Object.freeze(['우물 바닥 옆의 무너진 지하 공방에서 묵직한 망치 소리가 울려 퍼집니다.', '손끝에 남은 전투의 감각이 마법의 새싹과 강철의 결을 다루는 기술로 깨어납니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“나무의 새싹과 이슬도 내 모루 위에선 강철의 날을 세우는 약재가 되지.”'
    }),
    market: Object.freeze({
        narration: Object.freeze(['속 빈 줄기 외곽의 어두운 틈새마다 살아남은 삽목들이 좌판을 펼칩니다.', '중정이 버린 파편과 금기된 수액이 이곳에서는 생명을 잇는 화폐로 거래됩니다.']),
        speaker: '배교자 이벨',
        quote: '“기도문보단 당장 손에 쥐는 새싹 하나가 목숨을 살리는 법이야.”'
    }),
    hall: Object.freeze({
        narration: Object.freeze(['무너진 모루터 안쪽에 사투를 버텨낸 무구들의 전시대가 세워집니다.', '이가 나간 검날마다 당신이 헤쳐 온 전장의 흔적이 깊게 새겨져 있습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“잘 벼려진 쇠는 주인이 바뀌어도 제 궤적을 기억하는 법이다.”'
    }),
    support: Object.freeze({
        narration: Object.freeze(['지주근 바닥에서 건져 올린 룬의 파편들이 주력 기술의 맥동에 공명하기 시작합니다.', '하나의 칼끝에 여러 갈래의 결을 덧대어 위력을 증폭시킬 수 있습니다.']),
        speaker: '뿌리끝의 드루이드, 하켄',
        quote: '“줄기 하나에 잔가지를 엮으면 수액의 물살도 배로 거세지는 법이지.”'
    }),
    research: Object.freeze({
        narration: Object.freeze(['부서진 룬의 잔향 속에서 잊힌 전투 기법의 문양들이 떠오릅니다.', '흩어진 잔향을 모아 아직 손에 넣지 못한 새로운 기술을 복원합니다.']),
        speaker: '뿌리끝의 드루이드, 하켄',
        quote: '“부서진 잔향 속에도 우물로 버려졌던 옛 가지들의 기술이 남아 있다.”'
    }),
    gemForge: Object.freeze({
        narration: Object.freeze(['군주의 핵과 창공의 정수가 룬의 중심부에 뜨거운 압력을 불어넣습니다.', '불길 속에서 제련된 룬이 이전보다 훨씬 날카로운 기운을 내뿜습니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“강철만 두드리는 게 아니다. 영혼이 깃든 보석도 달궈야 날이 선다.”'
    }),
    engraving: Object.freeze({
        narration: Object.freeze(['룬의 표면에 미세한 홈을 파고 금기된 문양을 새겨 넣습니다.', '각인이 완성되자 기술이 뻗어 나가는 궤적 자체가 달라집니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“표면에 새긴 각인 한 줄이 칼날이 나아갈 방향을 통째로 바꾸지.”'
    }),
    gemAwakening: Object.freeze({
        narration: Object.freeze(['스무 번의 성장을 마친 룬이 각성 잔향을 삼키며 한계를 넘어섭니다.', '완전히 깨어난 기술에서 이전과는 차원이 다른 서슬이 피어오릅니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“임계점을 넘은 보석이 마침내 별의 파장과 같은 빛을 내기 시작했군요.”'
    }),
    codex: Object.freeze({
        narration: Object.freeze(['한 번 손에 넣었던 전설적인 유물의 형상과 기운이 도감에 영구히 기록됩니다.', '차곡차곡 쌓인 유물의 기억이 당신의 무장을 보이지 않는 곳에서 지탱합니다.']),
        speaker: '접목사 베른',
        quote: '“손에서 떠난 유물이라도 그 안에 깃든 기운은 나이테에 길이 남는다.”'
    }),
    journal: Object.freeze({
        narration: Object.freeze(['우물 바닥부터 수관 끝까지 흩어진 서판과 판결문이 하나의 기록철로 묶입니다.', '되찾은 진실 한 줄마다 당신의 육신을 단단하게 받쳐 줍니다.']),
        speaker: '접목사 베른',
        quote: '“잘려 나간 가지들의 유언을 잊지 않는 한, 너는 결코 무뎌지지 않는다.”'
    }),
    stump: Object.freeze({
        narration: Object.freeze(['눈먼 수도사 베른이 잘려 나간 가지들의 기억을 모아 두었던 작은 그루터기 함을 건넵니다.', '상극인 기운을 피해 씨앗과 수액을 심어 두면 전투의 피를 머금고 거목의 힘으로 자라납니다.']),
        speaker: '접목사 베른',
        quote: '“불씨와 서리는 나란히 심지 마라. 상극만 피하면 죽은 가지도 다시 숨을 쉰다.”'
    }),
    records: Object.freeze({
        narration: Object.freeze(['지금까지의 처치 수와 도달 깊이가 그루터기 나이테 위에 또렷이 기록됩니다.', '지나온 궤적과 지금의 궤적을 비교하며 다음 등반의 보폭을 가늠합니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“기록된 숫자는 거짓말을 하지 않습니다. 당신의 칼끝은 거듭될수록 빨라집니다.”'
    }),
    loopTree: Object.freeze({
        narration: Object.freeze(['반복되는 등반 끝에 축적된 기억이 영구적인 뿌리 회로로 자리 잡습니다.', '모든 것이 처음으로 돌아가도 밑동에 새겨진 이 힘만큼은 사라지지 않습니다.']),
        speaker: '접목사 베른',
        quote: '“가지가 꺾이고 줄기가 흔들려도 밑동에 새겨진 나이테는 지워지지 않는다.”'
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
        narration: Object.freeze(['과거와 미래의 시간이 한자리에서 충돌하는 시간의 균열이 열립니다.', '과거의 제단에 두 유물을 올리고 시간압을 견뎌내면 시대를 초월한 융합 유물이 탄생합니다.']),
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
        narration: Object.freeze(['영구동토의 혹한 미궁을 돌파할 자격을 얻어 재능 개화의 길이 열립니다.', '얼어붙은 시련 속에서 피어난 개화 카드는 영원히 시들지 않는 힘으로 남습니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“모든 온기가 사라진 겨울의 끝에서 당신만의 진짜 재능이 개화합니다.”'
    }),
    chaosRealm: Object.freeze({
        narration: Object.freeze(['수관 끝의 차륜을 넘어 세계수가 드리운 거대한 그림자, 혼돈계가 열립니다.', '다섯 권역의 아틀라스 지도를 따라 세계수의 그림자와 심연을 추적합니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“이제 줄기 안쪽의 온실이 아니라 나무가 드리운 그림자를 관측할 차례입니다.”'
    }),
    deepChaos: Object.freeze({
        narration: Object.freeze(['혼돈 스무 번째 층계의 바닥이 무너지며 끝을 알 수 없는 심화 혼돈이 열립니다.', '더 깊은 어둠으로 내려갈수록 영구적인 심화 성장의 보상이 뒤따릅니다.']),
        speaker: '관측자의 그림자, 베일라',
        quote: '“스무 번째 층계 아래에는 정원사의 가위조차 닿지 못한 심연이 있습니다.”'
    }),
    deepTree: Object.freeze({
        narration: Object.freeze(['심화 등반과 극점 토벌로 모은 포인트가 가장 깊은 뿌리 줄기에 각인됩니다.', '뿌리 심층에 새겨진 심화 패시브가 당신의 기본 체급을 영구히 끌어올립니다.']),
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
        narration: Object.freeze(['검은 해구 가장자리의 고요한 물가에서 심해의 생명체를 건져 올릴 낚시터가 열립니다.', '건져 올린 어획물의 도감 기록과 보너스는 영구히 사라지지 않고 유지됩니다.']),
        speaker: '접목사 베른',
        quote: '“잠시 칼을 내려놓고 검은 물결이 보내오는 태고의 숨결을 낚아 보아라.”'
    }),
    duel: Object.freeze({
        narration: Object.freeze(['세계수를 오르는 또 다른 날붙이들의 기록과 결투장에서 검을 맞댑니다.', '서로의 예리함을 정면으로 겨루며 자신의 서슬이 닿은 위치를 확인합니다.']),
        speaker: '벼림꾼 오르가',
        quote: '“네 날이 얼마나 잘 섰는지 알고 싶다면 다른 쇠와 직접 부딪쳐 봐라.”'
    }),
    beyond: Object.freeze({
        narration: Object.freeze(['서른 번의 담금질을 거친 칼날의 울림에 버려진 다섯 시제품과 완성작의 봉인이 풀립니다.', '모든 관문을 넘어선 자만이 발을 들일 수 있는 경계 너머의 전장이 열립니다.']),
        speaker: '일곱 번째 날, 완성작',
        quote: '“우물에 버려졌던 첫 번째 파편이 어째서 완성작인 나보다 날카롭게 울리는가.”'
    }),
    default: Object.freeze({
        narration: Object.freeze(['차륜이 무겁게 거꾸로 돌며, 당신이 지나온 모든 시간이 다시 처음의 우물 바닥으로 되돌아갑니다.', '진흙 속에서 다시 눈을 떠도 당신의 손끝에 새겨진 전투의 기억만큼은 사라지지 않습니다.']),
        speaker: '나무꾼 (모루터의 주인)',
        quote: '“한 번의 벼림으로는 심재를 가를 수 없다. 다시 우물 바닥에서 기어올라 와라.”'
    })
});

// The boss lines of the endgame fights, spoken like an act boss's (key: zone id; an atlas map's apex boss by its
// atlasStages id).
const STORY_ENDGAME_ENCOUNTERS = Object.freeze({
    apex_gardener: Object.freeze({
        half: '“잘라내도 잘라내도 다시 자라나는군! 네놈이 정녕 이 나무의 종말이냐!”'
    }),
    apex_archbishop: Object.freeze({
        half: '“타올라라! 나무의 썩은 속살을 모두 태워야 검은 태양이 떠오른다!”'
    }),
    rival_overheat: Object.freeze({
        intro: '“내가 먼저 베면 된다! 녹아내리기 전에 네 목부터 태워주마!”',
        defeat: '“결국… 내 열기에 내가 먼저 타버리는구나…”'
    }),
    rival_dull: Object.freeze({
        intro: '“베지 못해도 상관없다. 끝까지 부러지지 않는 쪽이 이기는 거다!”',
        defeat: '“부러지지 않는 것만으로는… 끝내 날이라 불릴 수 없었나…”'
    }),
    rival_glutton: Object.freeze({
        intro: '“네 피와 수액을 전부 삼켜주마! 배가 부를수록 상처는 사라지니까!”',
        defeat: '“너무 많이 삼켰어… 날이… 더 이상 들지 않아…”'
    }),
    rival_afterimage: Object.freeze({
        intro: '“보이지 않는 칼날은 부러지지도 않지. 그림자 속에서 베어주마.”',
        defeat: '“부딪히기를 피한 칼날은… 결국 아무것도 베지 못하는구나…”'
    }),
    rival_backedge: Object.freeze({
        intro: '“내 손목이 끊어지더라도 네 갑옷 안쪽의 심장부터 도려내주마!”',
        defeat: '“방향이 틀렸다고 했지… 끝내 내 손목부터 끊어지는구나…”'
    }),
    rival_masterwork: Object.freeze({
        intro: '“나무꾼이 끝내 손에서 놓지 않은 완성작의 검격을 네 몸에 새겨주마.”',
        half: '“어째서냐! 버려진 첫 번째 파편이 어째서 완성작인 나보다 날카로운 것이냐!”',
        defeat: '“알겠다… 모루에 남은 나보다, 진흙을 기어 오른 네가 진짜 날이었구나.”'
    }),
    outside_chaos_woodsman: Object.freeze({
        intro: '“종착점에 닿았구나, 나의 첫 번째 날붙이여. 어디 네 서슬을 달아보자.”',
        half: '“자루에서 벗어난 날붙이가 감히 주인의 손목을 겨누는구나!”',
        defeat: '“훌륭하다… 이제 너는 내 도끼의 부품이 아니라 스스로 베는 칼날이다.”'
    }),
    pinnacle_observer: Object.freeze({
        intro: '“모든 기록이 수렴되었습니다. 이제 마지막 경계에서 당신의 무게를 달아보겠습니다.”',
        half: '“땅과 바다, 창공과 별의 시련을 모두 넘었군요. 하지만 이 경계는 더 깊습니다!”',
        defeat: '“관측을 종료합니다. 이제 당신은 누구의 도구도 아닌, 경계 너머의 주인입니다.”'
    })
});

safeExposeData({
    STORY_JOURNAL_SCENES, STORY_BRIDGE_SCENES, STORY_SCENE_QUOTES,
    STORY_CLASS_ORIGINS, STORY_NPCS, STORY_ACT_ENCOUNTERS, STORY_TRIAL_ENCOUNTERS, STORY_ENDGAME_ENCOUNTERS, STORY_LOOP_MILESTONES
});
