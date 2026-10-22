// Story text (docs/story-bible.md), brought in by scripts/import-story-pack.cjs. Scenes play at act start and end and
// fill the journal (js/story-journal-ui.js); the room-stage lines are spoken over the battlefield
// (js/canvas-act-title-card.js); the unlock lines sit in the unlock window and the loop result
// (js/content-progression-ui.js, js/loop-ui.js).
const SUPPLIED_STORY_SCENES = Object.freeze([
    {"id":"prologue","title":"프롤로그, 밑거름의 우물","act":0,"phase":"start","journal":"prologue","image":"assets/journal/prologue.webp","lines":["이 세계의 모든 생명은 거대한 세계수의 가지로 태어나지만, 뿌리내리지 못한 당신은 정원사의 판결 아래 밑거름의 우물로 버려졌습니다.","그러나 썩은 진흙과 부러진 가지들 속에서, 당신은 끝내 숨을 거두지 않고 차가운 눈을 떴습니다."]},
    {"id":"act_2_end","title":"액트 2, 다시 추락하다","act":2,"phase":"end","journal":"act_2","image":"assets/journal/unified-20260910/act-2.webp","lines":["잔뿌리 매듭을 가르고 오른 중정에서, 부정한 은총의 부제녀가 길을 가로막았습니다.","그녀의 심장을 꿰뚫었으나 중정 바닥의 황금 수액관이 맥동하자 상처는 순식간에 다시 붙었고, 되살아난 일격에 당신은 아래쪽 허공뿌리로 추락했습니다."]},
    {"id":"act_3_start","title":"액트 3, 영원의 힘","act":3,"phase":"start","journal":"act_3","image":"assets/journal/unified-20260910/act-3.webp","lines":["추락한 허공뿌리 현수림은 잎 하나 없이 말라 비틀어져, 바람이 불 때마다 마른 가지들이 서로 부딪혀 울었습니다.","중정의 불멸을 지탱하는 황금 길의 수액 수송로가 이 굶주린 숲 너머 미궁으로 이어져 있었습니다."]},
    {"id":"act_4_end","title":"액트 4, 조력자의 정체","act":4,"phase":"end","journal":"act_4","image":"assets/journal/unified-20260910/act-4.webp","lines":["수액 운반선이 끊기자 부제녀의 상처는 더 이상 아물지 않았습니다.","피를 토하며 쓰러진 부제녀는 마지막 힘을 짜내어, 떨리는 손가락으로 발밑 깊은 성소 쪽을 가리켰습니다."]},
    {"id":"act_5_end","title":"액트 5, 뿌리가 만든 길","act":5,"phase":"end","journal":"act_5","image":"assets/journal/unified-20260910/act-5.webp","lines":["가슴을 꿰뚫린 하켄은 쓰러지지 않고, 한참 동안 당신의 칼날을 말없이 내려다보았습니다.","그는 마지막 생명력을 끌어모아 거대한 받침뿌리들을 맞물렸고, 무너진 중정으로 직행하는 보랏빛 다리를 놓아주었습니다."]},
    {"id":"act_6_end","title":"액트 6, 복수 그 이후","act":6,"phase":"end","journal":"act_6","image":"assets/journal/unified-20260910/act-6.webp","lines":["수액의 호혜를 잃은 정원사가 마침내 무릎을 꿇고, 그의 거대한 가위가 두 동강 났습니다.","가위가 부러지는 소리와 함께 발밑의 수액이 거꾸로 솟구치기 시작했고, 바닥에 스민 보랏빛 잔향이 속 빈 줄기를 가리켰습니다."]},
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
        wakeLine: '“젠장, 온몸이 부서질거같은 끔찍한 고통이야.”',
        spotLine: '“일단 공격받는 저 존재는 말이 통할거같은데.”',
        bossLines: Object.freeze({
            2: '“분명히 베었어… 바닥의 금빛 축복이 상처를 도로 붙다니...”',
            4: '“이제 그놈들의 보급로를 끊었다. 떨어진 이 열쇠는 성소 바닥의 것같은데?”',
            5: '“당신은.. 왜.. 나를?”',
            6: '“무슨 소리를 하는지 모르겠네, 변명같은건가.”',
            8: '“바닥에 박힌 대검.. 낯이 익는데..”',
            10: '“검을 거두고 손을 뻗었다고! 왜!”'
        })
    }),
    wanderer: Object.freeze({
        label: '방랑자 (그림자 처형인)',
        wakeLine: '“아..어디 뼈 부러진 거같은데..”',
        spotLine: '“저 늙은이, 괴물들한테 뜯어먹히기 직전인데?”',
        bossLines: Object.freeze({
            2: '“심장이 아니라 밑바닥에서 빌어먹는거였어?”',
            4: '“좋아. 축축한 밑동도 잘랐으니 이제 성소로 내려가 볼까.”',
            5: '“애시당초에 노인내가 혼자 거기있는게 말이 안됬어.”',
            6: '“도끼가 무서워 가지를 쳤다고? 뭔 소리야”',
            8: '“짜증나, 날 따라하는거같아”',
            10: '“나와 같은 결이야. 제발 한번이라도 저 손이 닿았어야했어”'
        })
    }),
    archer: Object.freeze({
        label: '궁수 (별을 쫓는 파수꾼)',
        wakeLine: '“위쪽에서 마른 바람이 불어 내려와.”',
        spotLine: '“거기 드루이드! 구출해 드릴게요!”',
        bossLines: Object.freeze({
            2: '“급소는 빗나가지 않았어. 바닥의 수액줄이 과녁을 되살리고 있네. 헛수고엿어”',
            4: '“수액관, 드루이드의 손길이 보여”',
            5: '“역시. 강한 드루이드였어. 내 예상이 빗나갈리가 없었어!”',
            6: '“온실 천장이 무너진다, 정원사. 이제 바람이 통하겠어.”',
            8: '“안개 바닥에 박힌 저 녹슨 화살촉들… 전부 내가 쏜 것 뿐이네”',
            10: '“손을 뻗어도 한 뼘 모자란 거리네. 아직 더 할일이 많겠어”'
        })
    }),
    cleric: Object.freeze({
        label: '성직자 (파문당한 고해사제)',
        wakeLine: '“가장 낮은 진흙 속에서도 빛나리라 향로의 불씨여”',
        spotLine: '“아직 거름이 되지못한 같은 신세를 외면할 수는 없어요”',
        bossLines: Object.freeze({
            2: '“아랫것들의 피를 쥐어짜 만든 불멸이 어찌 은총인가!”',
            4: '“이것은 헌신이 아닌 착취이니, 이제 필멸의 안식을 맞이하소서.”',
            5: '“당신의 고통도 거두어 드리나니, 날 거두어준 은혜의 보답이요.”',
            6: '“능히 사라져야할 삿된 자여, 그대의 입으로 어찌 날 비탄하겠느냐”',
            8: '“나의 기도, 나의 믿음이 되뇌이는 유혹의 장소인가?”',
            10: '“손끝이 끝내 닿지 않은 나의 창조자여. 그대의 약속을 새기리라”'
        })
    }),
    occultist: Object.freeze({
        label: '비술사 (금서의 해독자)',
        wakeLine: '“하! 날 내쳐?”',
        spotLine: '“거기 드루이드! 왜 가만히 있는거야!!”',
        bossLines: Object.freeze({
            2: '“역시. 저 밑바닥에서부터 여기까지 새긴 사술이 있어”',
            4: '“사술의 씨앗, 재밌는데? 좋은 지식이야”',
            5: '“음침한 드루이드, 스스로의 힘을 감추는건 처음볼때부터 알아봤어”',
            6: '“뭔가... 거대한 고대 마법이 느껴지는데”',
            8: '“아... 내가 제일 싫어하는 사술이야”',
            10: '“아 젠장할 나의 비술의 원천을 드높일 수 있었는데!”'
        })
    }),
    alchemist: Object.freeze({
        label: '연금술사 (이단 배양가)',
        wakeLine: '“으...으으으..다리야..”',
        spotLine: '“좀 거드는 때리는 시늉이라도 해봐요!!”',
        bossLines: Object.freeze({
            2: '“기생반응이야! 가짜 불사의 영약...”',
            4: '“이제 숙주를 잡았으니 기생체를 내 시약 재료로 만들러 가볼까~♪”',
            5: '“드루이드라구요? 잠깐만! 시약 재료 연성해주고 눈감아주세요! 어디가요!!”',
            6: '“으. 방부제 냄새, 본인을 계속 미이라처럼 방부제로 마감했던거야?”',
            8: '“내 약학지식을 감히 배껴써?”',
            10: '“연금술의 근원을 알 수 있었는데!! 결국 독학해야겠네...”'
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
            Object.freeze({ topic: '밑거름 판결', line: '“정원사는 가지에서 떨어져 내려오는 존재들을 솎아내는 자라네, 잘못된 존재나, 문드러져 내려온 하자를 다시 거름으로 되돌리는 판결을 받게되면 중앙의 우물을 통해 이곳으로 떨어지지. 간혹 살아남지만 이곳의 부패를 감당하는 이는 많지 못하네”' }),
            Object.freeze({ topic: '썩은갈기의 잔뿌리', line: '“그 존재는 본래 밑바닥의 진액을 정화해 위쪽으로 올리던 뿌리체들이다. 그 존재는 스스로 썩어들어가지만 자신의 의무를 다하고있지. 하지만 의무가 끝나지 않고 계속 썩어버린 뿌리체는 더이상 정화할수도 존재를 가져선 안될 거대한 종양이 되었네. 그 뿌리체 뒤에는 중정의 수로로 향하는 통로가 있을걸세.”' }),
            Object.freeze({ topic: '가지치기의 중정', line: '“은혜의 궁전, 어머니의 정원, 금가지의 수목지 이명은 수십가지의 허울이지, 진짜 이름은 가지치기의 중정이네. 썩은가지와 규율에 맞지 않는 존재들을 솎아내는 잔혹한 심판장이야. 그 규율은 어찌된일인지, 점점 뒤틀려 떨어져내려오는 밑거름들이 점점 많아지고 있다네”' }),
            Object.freeze({ topic: '허공뿌리와 수액관', reqAct: 3, line: '“그들의 불멸은 불멸이라 부르기 어렵지. 기생이라면 모를까. 이곳 뿌리에서부터 올려보내는 생명력과 수액들이 정원사에게 선택된 이들의 삿된불멸을 유지하고있다네, 좌편의 통로를 통해 지반없는 뿌리를 지키는 자를 무너트리고, 우편의 문을 통해 뿌리덩어리를 지키는 괴근의사를 처단하게 그렇게되면 순환은 시작될것이고 그들의 죽음의 순환이 다시 흐를걸세”' }),
            Object.freeze({ topic: '보조스킬룬과 잔향', line: '“이는 어머니의 몸에 떨어진 미지의 운석조각이네, 조각들은 서로 다른 기운이 있고 이를 벼려낼수도 있다네”' }),
            Object.freeze({ topic: '군락지 방벽', reqLoop: 15, line: '“공근과 괴근의 부재로 지하의 갑충 떼가 성소 방벽까지 기어올라왔네, 죽은 어미의 껍질을 먹고 증식하는 놈들이니 방벽안으로 들어오게 해선 안된다네”' })
        ])
    }),
    bern: Object.freeze({
        id: 'bern',
        name: '접목사 베른',
        title: '기억을 줍는 눈먼 수도사',
        dialogues: Object.freeze([
            Object.freeze({ topic: '눈먼 채화꾼', line: '“눈이 멀었어도 가지를 주울 수 있소, 이 눈은 본디 은혜를 받아 진리를 보는 눈이였으나 정원사는 어머니의 목령하에 나의 눈을 도려내어 채화꾼의 의무를 하사받았소.”' }),
            Object.freeze({ topic: '후임자', reqAct: 10, line: '“나는 정원사만이 볼 수 있는 심판장 뒤의 전실에서 진실된 목령을 읽게되었소. 그대가 잘라낸 정원사의 후대로서 나를 맺어놓으셨던것이였고, 나의 은혜도 어머니가 주신것였고 그를 거부하고 거짓목령으로 정원사의 심안을 도려냈더군.. 정원사는 자신의 쓰임이 다한것을 거부하며 이런 불경한 만행을 저지른 것이지.. 어차피 그릇된 순환을 위하여 날 맺어내린것이라면, 나는 이 또한 하나의 순리로서 분노를 갖지 않는것이라 생각하려하오... ”' }),
            Object.freeze({ topic: '부정한 은총의 부제녀', reqAct: 2, line: '“정원사에게 선택받은 부제자와 부제녀는 황금 수액의 축도를 받소. 황금 수액은 그들에게 썩지않는 몸과 부숴지지 않는 단단한 힘을 갖게되었다오. 그대가 그들을 어찌할 수 있을지는 모르더라도 힘든 길이 될것이오”' }),
            Object.freeze({ topic: '성소의 드루이드', reqAct: 5, line: '“처음 그대를 만났을때부터, 그 통로를 아는자는 지주근의 드루이드밖에 없다고 생각하였지만 언급하지 않았소, 그는 과거에 순환이 잘못되었다는 말을 수없이 부르짖으며 중정을 뿌리로 덮어 정체모를 검은 불길로 태우기 직전, 나는 처음 느꼈소. 어머니가 직접 뿌리를 돌려보내고 검은 불길을 든 지주근의 드루이드를 다시 올라오지 못하도록 뿌리와 통하는 중정의 길을 거대한 줄기로 끊으시는 기적을 행하고 평안을 되찾아 주셨소”' }),
            Object.freeze({ topic: '정원사', reqAct: 6, line: '“정원사는 원래 금빛으로 빛나는 눈을 통해 통찰하고 관찰 할 수 있는 존재였다하오, 허나 지주근의 드루이드 사건 이후로 그는 눈을 가리는 미트라를 쓰게되었다 들었소.”' }),
            Object.freeze({ topic: '비탄의 고치', reqAct: 9, line: '“슬픔이 전해지오.. 순환을 거절하는 어미로부터 떨어져나온 순환의 의지, 아홉으로 순환하여야 되었을 그들은 어머니의 돌봄없이 스스로 양분을 취할 수 없어 서로가 자양분이 되어 붙어들었고 그들을 품어줄 의지가 본디 어머니가 모르게 거울같은 장막을 내렸던것이오. 저 고치는 지금, 저편의 순환을 품는 의지의 어미는 끊임없는 비탄으로 붉은눈물로 가지를 두르고 있소”' }),
            Object.freeze({ topic: '고대 미궁과 심해', reqLoop: 3, line: '“뿌리 밑에는 어머니 나무 이전 시대의 지하에는 미지가 잠들어 있고, 그 끝은 흙이 아닌 검은 바다에 닿아 있소. 줄기 위가 아무리 흔들려도 가장 깊은 밑동의 기억은 사라지지 못한다 하오.”' })
        ])
    }),
    orga: Object.freeze({
        id: 'orga',
        name: '벼림꾼 오르가',
        title: '부러진 모루의 잔류 사념',
        dialogues: Object.freeze([
            Object.freeze({ topic: '무너진 모루터', line: '“흉흉해보여도 있을건 다 있어! 탄화모루에 그리고 이 몸! 새싹이든 이슬이든 내 탄화모루를 거치면 최고의 자재가 될걸?.”' }),
            Object.freeze({ topic: '다른 점', reqAct: 6, line: '“너에게서 익히 알던 기운이 아닌 다른 기운이 느껴진다 했더니만, 자네는 아무래도...아니지, 그냥, 일거리만 줘 ”' }),
            Object.freeze({ topic: '회랑', line: '“지하의 다섯 회랑은 어머니 나무 이전부터 있었지, 그곳은 고대의 존재들이 머물던 자리였으나 어머니 나무의 순환의 진리에 의해서 쫒겨낮지. 그들이 떠나간 자리또한 뿌리내리려 했지만 그 땅들은 내려오는 뿌리들을 잘라 거부했다더라고, 고대의 존재들이 어떤놈들인진 몰라도 대단들 한가봐. 비운 자리가 알아서 하나의 작은 회랑처럼 서로 다른 의지를 갖게 되었고 그곳은 어머니의 규율과 맺음이 없는 곳이 되었지.”' }),
            Object.freeze({ topic: '화석과 공허 주얼', reqLoop: 3, line: '“이봐, 저 끝없는 밑바닥에서 뭘 주워온거야? 감당안되는 물건이야? 내가보기엔 꽤 흥미로운데말이야. 이 원석을 봐, 하나의 성질만 띄고있어. 이걸 내가 한번 만져보면 너한테 쓸만한게 나오겠어”' }),
            Object.freeze({ topic: '시간의 균열과 지핵', reqLoop: 13, line: '“모든 벼림에는 시간도 재료다. 근데, 시간을 거스른다고? 하 참, 구미가 당기는 일거리인데? 사람을 정말 못쉬게하는 지독한 친구구만! 이리된거 더 깊은곳까지 가보는게 어때?”' }),
            Object.freeze({ topic: '고대의 존재', reqLoop: 31, line: '“고대의 존재들... 그들은 어머니 나무와 동등한 강함을 가졌지만 지고한 원칙과 규율에는 어쩔 수 없었지, 그 지고한 원칙과 규율을 만든게 누구냐고? 이봐, 누구한테 뭘 물어보는거야 난 벼림꾼이야. 거기까지 어떻게 알겠냐. 확실한건 이 어머니라는 분이 원칙과 규율을 어긋내게 되면서 그들이 돌아올 명분이 생길거야... 준비 단단히 해야겠는데 친구”' })
        ])
    }),
    ivel: Object.freeze({
        id: 'ivel',
        name: '배교자 이벨',
        title: '장막을 걷는 순례자',
        dialogues: Object.freeze([
            Object.freeze({ topic: '시든 도시', line: '“나도 한때는 중정에서 금빛수액을 더 정밀하게 정제하던 꽤 지위높은 부제자였어. 그럴수록, 은혜가 뒤틀려가고 점점 잘못되어가는걸 느끼지. 다른이들은 정원사에게 미쳐서 이게 문제인지 모르더라고? 그 자리에서 난 바로 도망쳤고 아마 거기선 배교자라고 날 이미 파문했겠지. 대체 어떻게 된 일인지 알기위해서 점점 위로 타고 올라갈수록 올라오길 잘했더라. 어찌되었든 어서와. ”' }),
            Object.freeze({ topic: '도망', reqAct: 7, line: '“정말 좋은 기회였어. 정원사가 만든 모든 질서가 잠깐 흐트러지는 처음이면서 마지막 기회. 중정에서 정원사의 명령으로 모두 뿌리와 통하는 수로를 향해 전병력을 보내는 말도안되는 상황이 일어났지. 그때 난 바로 그 자리에서 조용히 사라졌지”' }),
            Object.freeze({ topic: '삽목들의 탈출', reqAct: 8, line: '“삽목들은 원래 어머니가 모든 순환과 규율을 뜯어서 물려주고 나뉘어 번성하기 위한 존재야. 그러나 어머니나무는 갑작스럽게도 그 순환을 거부했어. 왜일지는 모르겠지만.. 정원사는 어머니나무에 맹신하면서 그 영원을 부추기고 있었는데. 네가 저지한 뒤로 남은 모든 생기와 은혜가 삽목을 향해 가고있어. 당연한 일이겠지.”' }),
            Object.freeze({ topic: '부적과 고급 홀씨', reqLoop: 6, line: '“미궁에서 건진 봉인편린에는 잘려 나간 옛 가지들의 원한이 서려 있어.네 피를 먹여 깨우면 어떤 갑옷보다 든든한 부적이 되지. 정제된 고급 홀씨는 내가 만들어줄 수 있지. 조심해 독성이 강할거야. 그만큼의 값도 받아야겠고.”' }),
            Object.freeze({ topic: '지하 벌집', reqLoop: 8, line: '“썩은 수액을 먹고 자란 지하 벌집에는 여왕의 밀실마다 진귀한 로열젤리와 밀랍이 쌓여 있어. 아틀라스에서 붉은 제단의 잉걸이나 푸른 제단의 즙을 찾거든 언제든 가져와.”' })
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
            bark: '“하마터면 잔뿌리들에게 먹힐 뻔했네. 살려주어 고맙소. 잠시 날 도와줄 수 있겠나..?”',
            loopBark: '“다시 시작하는 이 규율.. 이제 내가 할 일을 알겠어”',
            classBarks: Object.freeze({
                warrior: '“이 악취, 우물 밑바닥.. 노인이 없어도 중정으로 오르는 내가 아는 그 길...”',
                wanderer: '“좋아! 이번엔 뼈가 안부러졌어.”',
                archer: '“시간이 돌아와 다시 우물 바닥이야. 위쪽에서 불어오는 바람결은 그대로네.”',
                cleric: '“이것은..나의 고행이며 나의 시련이리라.”',
                occultist: '“뇌되이는 세계의 감각, 이건 오래된 저주이며 비술이야”',
                alchemist: '“모아놨던 시약의 재료가 다 사라졌어!!!”'
            }),
            classReplies: Object.freeze({
                warrior: '“인사는 필요없어. 중정으로 오르는 길이나 알려주시죠.”',
                wanderer: '“위쪽 중정으로 올라가는 길? 늙은이 구한 값어치가 있긴하네”',
                archer: '“당신은 드루이드같은데.. 꽤 약한 드루이드인가”',
                cleric: '“그리 위험했었는데도 다치지는 않으셨네요.”',
                occultist: '“음흉한 드루이드, 뭘 숨기고있지?”',
                alchemist: '“좋은 약재가 많은데? 가져가면 도움이 되겠어”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '진흙에 잠긴 파문 명패', bark: '“판결. 연결없이 썩은 낙과, 처형. 밑거름(중정 판결록 제1장)”' }),
        boss: Object.freeze({})
    }),
    2: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“가지를 줍는 채화꾼 베른이다. 중정의 부제녀를 찾는가? 중정은 영원이다”',
            loopBark: '“눈은 멀었지만 손끝은 알지. 이 그루터기 함은 어머니의 것이 아니군.”',
            classBarks: Object.freeze({
                warrior: '“너에게서 접목의 기운이 느껴지는구나..대검을 거두어주게”',
                wanderer: '“접목의 자식이여, 여기서는 경계를 풀게”',
                archer: '“접목의 파수꾼. 활시위를 바꿀때가 되었네”',
                cleric: '“새로운 순환의 율법을 쓸 그대. 잠시 내 말을 들어주게”',
                occultist: '“그대의 지식의 깊이는 역시, 어머니의 결이 아니였구려”',
                alchemist: '“너무 많은걸 채집하지말게!! 멈춰주게나! 그건 건들면 안된다네!!”'
            }),
            classReplies: Object.freeze({
                warrior: '“죽지 않는 수호자라고? 날 바닥으로 쳐던진 댓가를 치루게 해주지!”',
                wanderer: '“바닥 수액관에 목숨을 묶어뒀단 말이지? 일단 추방 안당하는 고귀한 상판을 뵈러 가볼까.”',
                archer: '“경고는 고마워, 정수리에 화살을 꽂기전까진 모르겠지.”',
                cleric: '“버려진 가지를 거두는 그대, 부제녀는 제가 마주하겠네”',
                occultist: '“바닥의 수액관으로 생명을 유지한다고? 아. 헛수고할 기분인데”',
                alchemist: '“들어보면 분명 기생반응일거같은데..”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '황금 수액관의 명문', bark: '“뿌리에서 올라오는 수액은 순환이며 그 순한은 영원하고 고귀한 황금이니라.(중정의 성서)”' }),
        boss: Object.freeze({ defeat: '「황금빛 은혜가 모두를 축도하나니 잃은 생명의 부제자들은 고개를 다시들어 적을 바라보라」' })
    }),
    3: Object.freeze({
        npc: Object.freeze({
            name: '뿌리끝의 드루이드, 하켄',
            bark: '“자네.. 아직도 살아있다니, 기적이군.. 이제 순환을 끊을 의무가 너를 부르는것같네”',
            loopBark: '“묘한 기분이군 자네, 날 보는 그 눈빛이”',
            classBarks: Object.freeze({
                warrior: '“그 검을 이 늙은이에게서 치워주지 않겠나?”',
                wanderer: '“날 그렇게 노려보진 말게나.”',
                archer: '“바람결은 언제나 자네편일것이네.”',
                cleric: '“불로서 율서를 써내려갈것이면 포기하게, 나도 이미 경험이 있네”',
                occultist: '“나에게서 물어보고싶은것이 많아보이는구려”',
                alchemist: '“난. 난 그런걸 만들 능력이 없네. 날 텃밭으로 보는겐가? 무례하구려”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '거꾸로 매달린 탄원서', bark: '“필요한 규칙이고 순환 아닌가요? 어째서 매말라가는 이곳을 멸시하죠? (허공뿌리 탄원서)”' }),
        boss: Object.freeze({})
    }),
    4: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“내가 여기있는 이유는 묻지 말게. 자네는 도움이 필요해.”',
            loopBark: '“잠시 내 말좀 들어주게.”',
            classBarks: Object.freeze({
                warrior: '“대검을 벼려줄 사람이 필요하지 않나?”',
                wanderer: '“방랑자, 더이상 방랑이 아닌것 같네만”',
                archer: '“미궁의 바람의 인도를 느끼는군, 화살이 더 필요하지 않나?”',
                cleric: '“향로에 넣을 숯이 필요하지 않소?”',
                occultist: '“비술사?사술사?아니면....마녀, 그대를 어찌 부르면 될지 모르겠구나.”',
                alchemist: '“그건 맹독이네! 잠깐! 만지지말게! 거기는 건들면 터진다네! 말썽 그만피우게나!!”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '깨진 수액 항아리의 낙인', bark: '“중정의 정원사는 영원하리며 언젠가 다시 부르실것이다! (부제녀 절명록)”', afterClear: true }),
        boss: Object.freeze({ defeat: '“지주근의 주인이 널 보냈구나.. 그분께.... 두번째 반란을... 알려야...”' })
    }),
    5: Object.freeze({
        npc: Object.freeze({
            name: '벼림꾼 오르가',
            bark: '“난 탄화모루의 대장장이 오르가, 이 탄화목 모루는 특별하지!”',
            loopBark: '“흠, 내가 벼린 흔적이군. 이건 우연이 아니겠어”',
            classBarks: Object.freeze({
                warrior: '“대검을 벼려주지. 음? 흠. 내가 너의 대검을 언제 벼려줬지?”',
                wanderer: '“방패같은게 필요하지 않겠나? 움직임에 방해가 되나? 다른 방법을 찾아주면 되나?”',
                archer: '“화살촉 하나하나에 내 모루의 손길이 왜 있는거지? 단골이셨나?”',
                cleric: '“사제님이 이리 누추한곳에는 무슨일신가! 이김에 내 모루에 축성이라도 해줘.”',
                occultist: '“이상한 눈으로 날 보지마, 아니면 벌써 요삿스러운 사술을 쓴건 아니지?”',
                alchemist: '“그, 그거들고 나한테 너무 붙지마. 터지는건 아니지? 붙지말라니까?”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '담금질 수조의 일지', bark: '“독을 먹이고 추락으로 날을 세웠다. 난 멈추지 않는 숫돌이다. (하켄 일지)”' }),
        boss: Object.freeze({ half: '“윤회를 어긋내고 규율을 져버린 어머니의 말로가 나의 눈에도 보이는구나”', defeat: '“나의 뿌리를 밟고 올라가라...진리를 짓누르는 어머니의 목을쳐라..”' })
    }),
    6: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“금빛 축도가 끊긴 지금, 호혜를 잃은 정원사의 몰골이 말이 아니네”',
            loopBark: '“정원사의 손끝이 떨리고 있소. 당신을 두려워하는게 모든 중정을 휘감고있네”',
            classBarks: Object.freeze({
                warrior: '“이 앞길, 대검을 충분히 깊게 찔러야 확실할걸세.”',
                wanderer: '“정원사는 더이상 완전무결이 아니네, 암살할 수 있다는 이야기지”',
                archer: '“이 두려움의 공기가 느껴지나? 흐름을 타고 건너가서 끝내게나”',
                cleric: '“자네의 새로운 성률에는 정원사는 끼어있지 않겠군”',
                occultist: '“자네의 비술은 어느 경지까지 오른거지? 이 중정을 덮을 수 있나?”',
                alchemist: '“그를 살려서 실험대상으로 쓸 생각을 한건 아니겠지? 들켰나보군, 제발 그러지말게”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '부러진 가위 안쪽의 명문', bark: '“어머니 나무를 위해. 내가 할 모든 일들은 규율이며 이치가 될것이다. (정원사의 회고)”' }),
        boss: Object.freeze({ half: '“어머니 나무시여 당신의 기적으로 다시금 저들을 참하실 시간이온데 어찌하여!”', defeat: '“당신의 뜻을 받들었건만...이미..저는... 중정의 정원사가 아니게 된것이였습니까...”' })
    }),
    7: Object.freeze({
        npc: Object.freeze({
            name: '배교자 이벨',
            bark: '“나뭇결의 흐름이 바뀌었어. 그리고 네가 올라왔다는건 네가 그 원인이겠지, 나는 은둔자 이벨이야”',
            loopBark: '“너, 왜 날 알고있는거야?”',
            classBarks: Object.freeze({
                warrior: '“그 작은 몸보다 대검이 더 큰거같은데, 범상치않은 손님이네”',
                wanderer: '“너도 나와 같은 방랑의 바람이 부는거같아. 난 배교자의 낙인이 있지만 하하”',
                archer: '“낙과되어 널 발견한게 바로 나인데, 기억해? 참 묘하게 만났네”',
                cleric: '“같은 배교자인거야? 아니면 이단? 어쨌든 좋아!”',
                occultist: '“내가 눈을 안마주치는걸 사술을 피하는거지 널 안반기는게 아니야.”',
                alchemist: '“나좀.. 봐줄래? 그 나무결은 언제까지 만지고있을거야..?”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '삽목 선봉대의 선언문', bark: '“스스로 줄기를 찢고 떠나는 것이 순환이요 어머니는 우리를 저버렸도다. (삽목의 서)”' }),
        boss: Object.freeze({})
    }),
    8: Object.freeze({
        npc: Object.freeze({
            name: '배교자 이벨',
            bark: '“여기까지 올라와보는건 처음인데, 영광이야 네덕분에 윗분들 얼굴한번 볼 수 있겠어.”',
            loopBark: '“묘하네, 이 장막.. 모든 기억이 쓰여져있는것 같아. 그리고 처음오는 네가 언급되”',
            classBarks: Object.freeze({
                warrior: '“저기봐, 저 큰 칼을 따라한다고 제대로 휘두를 수 있을까? 멍청하게 넘어질거같아.”',
                wanderer: '“방황하지 않아도 괜찮아.날 보고있어. 내가 장막을 거두는 법을 알아줄게”',
                archer: '“저기봐 어줍잖게 따라해서 활시위도 없는 놈이 있네?”',
                cleric: '“이단이다!! 널 따라하는 이단이야! 뭔가 내가 말하니까 이상하네”',
                occultist: '“이 베일의 사술법을 알고있다고? 처음오는게 아니야? 너 윗분들 출신인거야?”',
                alchemist: '“엉뚱맞은 널 따라하는게 무슨 이득인진 모르겠지만.. 넌 그거 재료로 쓸 생각하지마..”'
            }),
            tone: 'violet'
        }),
        stele: Object.freeze({ title: '장막에 박힌 녹슨 칼날들', bark: '“모든것이 투명하나 투명하지않다. 무엇을 숨기려 하는것인가.(무명 순례록)”' }),
        boss: Object.freeze({ half: '「성녀의 기도는 온 가지에 울려퍼지고 참회자의 흉터가 두드러진다.」' })
    }),
    9: Object.freeze({
        npc: Object.freeze({
            name: '접목사 베른',
            bark: '“아홉이였어야될 하나. 그리고 잘못된 순환... 아.. 어머니나무시여..”',
            loopBark: '“이 순환이 너를 기다리고있는것 같네만, 내 착각인게 마음이 편하겠네”',
            classBarks: Object.freeze({
                warrior: '“자네는 이 상황이 왠지 익숙해보이는군”',
                wanderer: '“자네의 방랑이 어찌, 여기서는 확실해보이오”',
                archer: '“자네가 날리는 바람의 기운이 저 고치와 이리도 비슷하다니..”',
                cleric: '“저 고치는 너의 예언서에 쓰여있는겐가? 어떤 계시가 이리도 정확할 수 있나”',
                occultist: '“아홉 생명을 묶는 고대 마법? 고대 마법이라니, 자네는 어찌 아는겐가”',
                alchemist: '“이쯤 하면 자네의 약초주머니도 다 찼을텐데.. 그 약초 주머니에 무언가 한겐가”'
            }),
            tone: 'gold'
        }),
        stele: Object.freeze({ title: '접목원 석판의 기도문', bark: '“하나이되 아홉, 아홉이여야될 하나. 이를 품어 봉하는 비통의 의무여 (비탄의 어머니)”' }),
        boss: Object.freeze({ defeat: '「비탄의 눈물이 멎어오르니 황금의 고치가 열리어 드높은 가지끝으로 날아오른다.」' })
    }),
    10: Object.freeze({
        npc: Object.freeze({
            name: '관측자의 그림자, 베일라',
            bark: '“기다렸습니다. 삽목의 낙과, 그대가 맞이할 그림자, 베일라라 합니다”',
            loopBark: '“다시 뵙게되었네요. 당신의 의지를 삽목께서 가상히 볼겁니다.”',
            classBarks: Object.freeze({
                warrior: '“당신은 하나이면서 많은 모습을 가질 수 있는 존재. 그분의 의지이며 당신의 의지”',
                wanderer: '“움직임이 다르더라도 그대를 압니다. 저에게만 허락된 유흥일까요?”',
                archer: '“이번에는 바람결을 타고 오셨나요? 다음에는 그림자가 되어보는것도 재밌어보이네요.”',
                cleric: '“기도문, 마법서, 연금술식. 이들또한 모두 하나의 형태로서 당신에게 비롯되었군요”',
                occultist: '“사술이 보이는 눈으로 오셨군요, 어떤 고대 비술이 보이시나요?”',
                alchemist: '“이런 모습조차 가능하신걸까요? 아니면 서로 다른 마음이라도 갖고있으신건가요?”'
            }),
            tone: 'cyan'
        }),
        stele: Object.freeze({ title: '합일의 차륜 비문', bark: '“하나이되 아홉, 아홉이였어야될 하나. 거절된 숨결, 순환의 파문(차륜의 메아리)”' }),
        boss: Object.freeze({ defeat: '「맞뻗은 두 손끝이 한 뼘의 틈을 남기고 멈추며, 차륜 아래로 혼돈의 심연이 열린다.」' })
    })
});

const STORY_TRIAL_ENCOUNTERS = Object.freeze({
    trial_1: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“무딘 껍질을 뜯는행위는 아무도 해본적이 없어서 나도 장담하기 어렵군.”', tone: 'gold' }),
        stele: Object.freeze({ title: '폐기된 시제품 목록', bark: '“벼려지는 고통을 피하는 물러섬은 나태함이라.”' }),
        boss: Object.freeze({})
    }),
    trial_2: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“별난 네 성질을 증명해봐”', tone: 'gold' }),
        stele: Object.freeze({ title: '균열된 담금질 기록', bark: '“세 수조를 건너며 결이 갈라지지 않았다면 두 번째 각인을 새겨라. (화로 규율)”' }),
        boss: Object.freeze({})
    }),
    trial_3: Object.freeze({
        npc: Object.freeze({ name: '배교자 이벨', bark: '“나무의 피가 피운 독무의 터는 오래전 금기된 구역이오.”', tone: 'violet' }),
        stele: Object.freeze({ title: '녹슨 칼날들의 묘비', bark: '“모든 어머니의 숨결이 끊어지는 독무. 숨을 쉬되 흩어지지말라. (정원 묘비)”' }),
        boss: Object.freeze({})
    }),
    trial_4: Object.freeze({
        npc: Object.freeze({ name: '벼림꾼 오르가', bark: '“빨리 닫아주지 않을래? 벌써부터 숨이 막히는데”', tone: 'gold' }),
        stele: Object.freeze({ title: '네 번째 모루의 기록', bark: '“회랑은 그 누구도 반기지 않을것이다. 허나 길을 아는것은 회랑뿐이니라. (비문)”' }),
        boss: Object.freeze({})
    }),
    trial_5: Object.freeze({
        npc: Object.freeze({ name: '관측자의 그림자, 베일라', bark: '“모든 재생과 온기가 거절된 혹한 속에서 피어내는 것을 관찰하게되면 좋겠네요.”', tone: 'cyan' }),
        stele: Object.freeze({ title: '백야의 심장 관측록', bark: '“차디찬 갈피를 잡아 피어있는 꽃을 찾되 피어내는 것 또한 참된 순환이니. (백야 기록)”' }),
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
