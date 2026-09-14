// Supplied journal text, preserved verbatim. Rewards and existing entry IDs are unchanged.
const STORY_JOURNAL_SCENES = Object.freeze([
    {"id":"prologue","title":"프롤로그 · 밑거름의 우물","act":0,"phase":"start","journal":"prologue","image":"assets/journal/prologue.webp","lines":["당신은 세계수에서 태어났으나, 정원사는 당신을 밑거름의 우물로 떨어트렸습니다.","그러나 당신은 진흙 속에서 죽지 않고 살아났습니다. 정원사에게 복수하세요."]},
    {"id":"act_2_end","title":"액트 2 · 다시 추락하다","act":2,"phase":"end","journal":"act_2","image":"assets/journal/unified-20260910/act-2.webp","lines":["당신은 썩은 뿌리를 기어올라, 마침내 정원사의 중정에 도착했습니다.","그러나 부제녀가 당신을 가로막았습니다. 그녀에게 제압된 당신은 복수를 이루지 못한 채 다시 추락했습니다."]},
    {"id":"act_3_start","title":"액트 3 · 영원의 힘","act":3,"phase":"start","journal":"act_3","image":"assets/journal/unified-20260910/act-3.webp","lines":["황금 길의 마지막 운반자와 부정한 은총의 부제녀를 쓰러뜨리세요.","두 존재가 쓰러지면, 중정에 깃든 영원의 힘도 사라질 것입니다."]},
    {"id":"act_4_end","title":"액트 4 · 조력자의 정체","act":4,"phase":"end","journal":"act_4","image":"assets/journal/unified-20260910/act-4.webp","lines":["쓰러져 죽어가던 부제녀는 당신을 도왔던 이의 정체를 밝혔습니다.","그 조력자는 깊은 성소를 떠받치는 지주근의 주인이었습니다."]},
    {"id":"act_5_end","title":"액트 5 · 뿌리가 만든 길","act":5,"phase":"end","journal":"act_5","image":"assets/journal/unified-20260910/act-5.webp","lines":["드루이드는 마지막 생명력을 끌어모아 손을 내밀었습니다.","그의 손끝에서 뻗어 나온 뿌리들이 맞물려, 중정으로 돌아가는 길을 이루었습니다."]},
    {"id":"act_6_end","title":"액트 6 · 복수 그 이후","act":6,"phase":"end","journal":"act_6","image":"assets/journal/unified-20260910/act-6.webp","lines":["당신은 마침내 정원사를 쓰러뜨리고 복수를 이루었습니다.","그러나 모든 수액과 힘이 세계수 위쪽으로 솟구치기 시작했습니다.","그때, 당신 앞에 익숙한 보랏빛이 일렁였습니다.","길을 열어 주었던 지주근의 기운이, 다시 당신을 위로 이끄는 듯했습니다."]},
    {"id":"act_7_start","title":"액트 7 · 속 빈 줄기","act":7,"phase":"start","journal":"act_7","image":"assets/journal/unified-20260910/act-7.webp","lines":["당신은 익숙한 보랏빛을 따라, 세계수의 속 빈 줄기로 들어섰습니다.","시든 도시 사이로 수액은 여전히 위를 향하고 있었습니다.","당신은 그 힘이 어디로 모이는지 알아내기 위해, 줄기를 감아 오르는 길에 발을 디뎠습니다."]},
    {"id":"act_8_start","title":"액트 8 · 장막의 성소","act":8,"phase":"start","journal":"act_8","image":"assets/journal/unified-20260910/act-8.webp","lines":["줄기의 끝을 넘자, 겹겹이 접힌 장막의 성소가 펼쳐졌습니다.","수관으로 향하는 길은 살아 있는 장막 사이로 모습을 감추고 있었습니다.","당신은 발밑에 스며든 익숙한 보랏빛을 따라, 성소 깊숙이 걸음을 옮겼습니다."]},
    {"id":"act_9_start","title":"액트 9 · 황금빛 수관","act":9,"phase":"start","journal":"act_9","image":"assets/journal/unified-20260910/act-9-start.webp","lines":["겹겹의 장막이 빛을 잃고 무너져 내렸습니다.","그 너머로, 황금빛 꽃과 가지가 뒤얽힌 세계수의 수관이 모습을 드러냈습니다.","당신은 발밑에 스며든 익숙한 보랏빛을 따라, 찬란한 빛 속으로 걸음을 옮겼습니다."]},
    {"id":"act_9_end","title":"액트 9 · 고치에서 태어난 존재","act":9,"phase":"end","journal":"act_9","image":"assets/journal/unified-20260910/act-9-end.webp","lines":["비탄하는 접목의 어머니가 쓰러지자, 그녀가 품고 있던 고치가 열렸습니다.","고치에서 태어난 존재는 옅은 금빛 후광에 둘러싸여, 세계수의 끝자락으로 올라갔습니다."]},
    {"id":"act_10_end","title":"액트 10 · 손끝 사이","act":10,"phase":"end","journal":"act_10","image":"assets/journal/unified-20260910/act-10.webp","lines":["쓰러진 존재가 당신을 향해 힘없이 손을 뻗었습니다.","당신은 몸을 숙여, 그 손끝을 향해 손을 내밀었습니다.","두 손 사이에는 아직 작은 틈이 남아 있었습니다."]},
]);
for (const entryId of new Set(STORY_JOURNAL_SCENES.map(scene => scene.journal))) {
    const scenes = STORY_JOURNAL_SCENES.filter(scene => scene.journal === entryId);
    JOURNAL_DB[entryId].title = scenes[0].title;
    JOURNAL_DB[entryId].lines = scenes.flatMap(scene => scene.lines);
    JOURNAL_DB[entryId].scenes = scenes.map(scene => scene.id);
}
safeExposeData({ STORY_JOURNAL_SCENES });
