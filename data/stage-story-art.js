// 장면 상태 그림(GPT, story-state-art-20261016, 다시 칠한 묶음 worldtree-props-20261018): node scripts/build-story-state-art.cjs가 쓴다.
// 손으로 고치지 않는다. 그림은 assets/stage-story/<id>.png(프레임을 가로로 이은 한 줄, 칸 w x h, 발 자리 feet, 도트 하나 = 캐릭터 도트 하나).
// kind: revive 보스가 다시 일어나는 그림, story 이야기 장면의 구조물(상태마다 한 장), prop 탐험 물체(재질마다, 온전함과 부서지거나 열린 모습).
// 어디에 언제 그리는지는 data/stage-view.js STAGE_STORY, 그리는 곳은 js/canvas-stage-story.js.
// revives: 쓰러진 뒤 다시 일어나는 보스의 쓰러짐 효과(ms): start 일어남이 시작하는 때, fadeFrom 흐려지기 시작하는 때, total 효과 길이.
const STAGE_STORY_ART = Object.freeze({
    path: 'assets/stage-story/',
    version: '17238e593a',
    clips: Object.freeze({
        'deacon-revive': Object.freeze({ kind: 'revive', frames: 6, w: 147, h: 136, feet: Object.freeze([73, 136]), ms: Object.freeze([350, 160, 170, 200, 190, 800]) }),
        'sap-conduit': Object.freeze({ kind: 'story', frames: 3, w: 300, h: 149, feet: Object.freeze([150, 124]), ms: Object.freeze([900, 900, 1200]) }),
        'haken-bridge': Object.freeze({ kind: 'story', frames: 3, w: 720, h: 133, feet: Object.freeze([360, 137]), ms: Object.freeze([900, 900, 1200]) }),
        'mother-cocoon': Object.freeze({ kind: 'story', frames: 3, w: 192, h: 244, feet: Object.freeze([96, 262]), ms: Object.freeze([900, 900, 1200]) }),
        'wood-crate-root': Object.freeze({ kind: 'prop', frames: 2, w: 100, h: 86, feet: Object.freeze([50, 86]), ms: Object.freeze([1100, 1100]) }),
        'wood-crate-court': Object.freeze({ kind: 'prop', frames: 2, w: 93, h: 86, feet: Object.freeze([46, 86]), ms: Object.freeze([1100, 1100]) }),
        'wood-crate-canopy': Object.freeze({ kind: 'prop', frames: 2, w: 97, h: 86, feet: Object.freeze([48, 86]), ms: Object.freeze([1100, 1100]) }),
        'sealed-chest-root': Object.freeze({ kind: 'prop', frames: 2, w: 130, h: 114, feet: Object.freeze([65, 114]), ms: Object.freeze([1100, 1100]) }),
        'sealed-chest-court': Object.freeze({ kind: 'prop', frames: 2, w: 132, h: 120, feet: Object.freeze([66, 120]), ms: Object.freeze([1100, 1100]) }),
        'sealed-chest-canopy': Object.freeze({ kind: 'prop', frames: 2, w: 133, h: 112, feet: Object.freeze([66, 112]), ms: Object.freeze([1100, 1100]) }),
        'egg-nest-root': Object.freeze({ kind: 'prop', frames: 2, w: 112, h: 99, feet: Object.freeze([56, 99]), ms: Object.freeze([1100, 1100]) }),
        'egg-nest-court': Object.freeze({ kind: 'prop', frames: 2, w: 112, h: 95, feet: Object.freeze([56, 95]), ms: Object.freeze([1100, 1100]) }),
        'egg-nest-canopy': Object.freeze({ kind: 'prop', frames: 2, w: 112, h: 102, feet: Object.freeze([56, 102]), ms: Object.freeze([1100, 1100]) })
    }),
    revives: Object.freeze({
        bossAct2: Object.freeze({ clip: 'deacon-revive', start: 1630, fadeFrom: 4000, total: 4400 })
    })
});

safeExposeData({ STAGE_STORY_ART });
