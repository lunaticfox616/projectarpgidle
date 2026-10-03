/* 메뉴 아이콘(13×13 도트, 금빛 3단 + 반짝임). scripts/build-pixel-ui.cjs가 한 줄 그림(menu-icons.png)으로 찍고,
 * css/themes/pixel-menu.css가 버튼마다 --px-icon 번호로 골라 2배(26px)로 그린다. 순서를 바꾸면 CSS 번호도 같이 바꾼다.
 * '.'은 비움, d 그늘 · m 금 · l 밝은 금 · w 반짝임 · k 검은 홈(열쇠 구멍 같은 파인 곳).
 */
'use strict';

const PALETTE = { d: '#6e5226', m: '#b08540', l: '#dcb068', w: '#fff0c4', k: '#0b0805' };

const ICONS = {
    // 0 전투: 곧게 선 칼
    battle: [
        '......w......',
        '.....lwd.....',
        '.....lwd.....',
        '.....lwd.....',
        '.....lwd.....',
        '.....lwd.....',
        '.....lwd.....',
        '.....lwd.....',
        '..lllmmmddd..',
        '..ddddmdddd..',
        '.....lmd.....',
        '.....lmd.....',
        '.....ddd.....'
    ],
    // 1 캐릭터: 머리와 어깨
    character: [
        '.............',
        '.....lll.....',
        '....lwmmd....',
        '...lwmmmmd...',
        '...lmmmmmd...',
        '...lmmmmmd...',
        '....dmmmd....',
        '.....ddd.....',
        '...lllmmmd...',
        '..lwmmmmmmd..',
        '.lwmmmmmmmmd.',
        '.lmmmmmmmmmd.',
        '.ddddddddddd.'
    ],
    // 2 스킬트리: 이어진 마디 셋
    tree: [
        '.....lll.....',
        '....lwmmd....',
        '....lmmmd....',
        '.....ddd.....',
        '......m......',
        '......m......',
        '..mmmmmmmmm..',
        '..m.......m..',
        '.lll.....lll.',
        'lwmmd...lwmmd',
        'lmmmd...lmmmd',
        '.ddd.....ddd.',
        '.............'
    ],
    // 3 해금: 열린 자물쇠
    unlocks: [
        '...lllll.....',
        '..lw...md....',
        '..l.....d....',
        '..l.....d....',
        '..l..........',
        '.............',
        '.lllllllllll.',
        '.lwmmmmmmmmd.',
        '.lmmmmkmmmmd.',
        '.lmmmkkkmmmd.',
        '.lmmmmkmmmmd.',
        '.lmmmmmmmmmd.',
        '.ddddddddddd.'
    ],
    // 4 루프 패시브: 한 바퀴 도는 화살
    loop: [
        '.............',
        '....lllll.l..',
        '..llw....lwd.',
        '.lw.....lmmmd',
        '.lm......ddd.',
        'lw...........',
        'lm.........l.',
        'lm.........md',
        'lm.........md',
        '.lm.......md.',
        '.lmm.....mmd.',
        '..dmmmmmmmd..',
        '....ddddd....'
    ],
    // 5 그루터기 함: 나이테 한 줄 · 껍질 · 뿌리
    stump: [
        '.............',
        '...lllllll...',
        '.llwmmmmmmdd.',
        'lwm.ddddd.mmd',
        'lm.d.....d.md',
        'lmm.ddddd.mmd',
        '.ddmmmmmmmdd.',
        '.lmmmdmmmmmd.',
        '.lmmmdmmdmmd.',
        '.lmmmdmmdmmd.',
        'llmmmdmmdmmdd',
        'lmd.lmmmd.dmd',
        'dd..dd.dd..dd'
    ],
    // 6 장비: 가슴 갑옷
    items: [
        '.............',
        '..ll.....ll..',
        '.lwml...lmmd.',
        'lwmmmlllmmmmd',
        'lmmmmmwmmmmmd',
        '.dmmmmwmmmmd.',
        '..lmmmwmmmd..',
        '..lmmmwmmmd..',
        '..lmmmwmmmd..',
        '..lmmmwmmmd..',
        '...lmmwmmd...',
        '...ddddddd...',
        '.............'
    ],
    // 7 보조장비: 물약 병
    flask: [
        '.....lll.....',
        '.....ddd.....',
        '.....lmd.....',
        '.....lmd.....',
        '....lwmmd....',
        '...lw...md...',
        '..lw.....md..',
        '..lmmmmmmmd..',
        '..lmwmmmmmd..',
        '..lmmmmmmmd..',
        '...lmmmmmd...',
        '....ddddd....',
        '.............'
    ],
    // 8 지도: 나침반 별
    map: [
        '......l......',
        '......l......',
        '.....lwd.....',
        '.....lmd.....',
        '....lwmmd....',
        '..llmmmmmdd..',
        'llwwmmkmmmmdd',
        '..ddmmmmmdd..',
        '....dmmmd....',
        '.....dmd.....',
        '.....dmd.....',
        '......d......',
        '......d......'
    ],
    // 9 스킬 젬: 깎은 보석
    skills: [
        '.............',
        '...lllllll...',
        '..lwwlmmmmd..',
        '.lwwlmmmmmmd.',
        'lllllmmmddddd',
        '.lwmmmmmmmmd.',
        '..lwmmmmmmd..',
        '...lmmmmmd...',
        '....lmmmd....',
        '.....lmd.....',
        '......d......',
        '.............',
        '.............'
    ],
    // 10 기록: 펼친 책
    journal: [
        '.............',
        '.............',
        '.llll...llll.',
        'lwmmmlllmmmmd',
        'lm...mlm...md',
        'lmmmmmlmmmmmd',
        'lm...mlm...md',
        'lmmmmmlmmmmmd',
        'lm...mlm...md',
        'lmmmmmlmmmmmd',
        'ddddddldddddd',
        '.....ddd.....',
        '.............'
    ],
    // 11 기타: 점 셋
    more: [
        '.............',
        '.............',
        '.............',
        '.............',
        '.............',
        '.ll...ll...ll',
        'lwmd.lwmd.lwm',
        'lmmd.lmmd.lmm',
        '.dd...dd...dd',
        '.............',
        '.............',
        '.............',
        '.............'
    ],
    // 12 정리: 창 닫기(X)
    close: [
        '.............',
        '.lw.......md.',
        '.lwm.....mmd.',
        '..lmm...mmd..',
        '...lmm.mmd...',
        '....lmmmd....',
        '.....lmd.....',
        '....lmmmd....',
        '...lmm.mmd...',
        '..lmm...mmd..',
        '.lmm.....mmd.',
        '.ld.......dd.',
        '.............'
    ],
    // 13 전체(휴대폰): 네 칸
    grid: [
        '.............',
        '.llll...llll.',
        '.lwmd...lwmd.',
        '.lmmd...lmmd.',
        '.dddd...dddd.',
        '.............',
        '.............',
        '.............',
        '.llll...llll.',
        '.lwmd...lwmd.',
        '.lmmd...lmmd.',
        '.dddd...dddd.',
        '.............'
    ],
    // 14 가지치기: 가위
    pruning: [
        '.l.........l.',
        '.lw.......md.',
        '..lw.....md..',
        '...lw...md...',
        '....lw.md....',
        '.....lwd.....',
        '......k......',
        '.....lmd.....',
        '..llmd.lmdd..',
        '.lw..d.l..md.',
        '.lm..d.l..md.',
        '..ddd...ddd..',
        '.............'
    ],
    // 15 아르카나: 별이 그려진 카드
    arcana: [
        '..lllllllll..',
        '..lwmmmmmmd..',
        '..lm.....md..',
        '..lm..w..md..',
        '..lm..l..md..',
        '..lmwlwlwmd..',
        '..lm..l..md..',
        '..lm..w..md..',
        '..lm.....md..',
        '..lm.....md..',
        '..lmmmmmmmd..',
        '..ddddddddd..',
        '.............'
    ],
    // 16 전문가: 대장 망치
    expertise: [
        '.............',
        '..lllllllll..',
        '.lwwmmmmmmmd.',
        '.lwmmmmmmmmd.',
        '.lmmmmmmmmmd.',
        '..ddddmdddd..',
        '.....lmd.....',
        '.....lmd.....',
        '.....lmd.....',
        '.....lmd.....',
        '.....lmd.....',
        '.....lmd.....',
        '.....ddd.....'
    ],
    // 17 재능: 별
    talent: [
        '......l......',
        '.....lwd.....',
        '.....lmd.....',
        '....lwmmd....',
        'lllllwmmmdddd',
        '.lwmmmmmmmmd.',
        '..lmmmmmmmd..',
        '...lmmmmmd...',
        '...lmmdmmd...',
        '..lmmd.dmmd..',
        '..lmd...dmd..',
        '.ld.......dd.',
        '.............'
    ],
    // 18 커뮤니티: 말풍선
    social: [
        '.............',
        '..lllllllll..',
        '.lwmmmmmmmmd.',
        'lwm.......mmd',
        'lm.k..k..k.md',
        'lm.........md',
        'lmm.......mmd',
        '.dmmmmmmmmmd.',
        '..dddmmdddd..',
        '....lmd......',
        '...lmd.......',
        '...dd........',
        '.............'
    ],
    // 19 설정: 톱니바퀴
    settings: [
        '.....lll.....',
        '..l..lmd..d..',
        '.lwllmmmdddd.',
        '..lmmmmmmmd..',
        '..lmm...mmd..',
        'llmm.....mddd',
        'lwmm.....mmdd',
        'llmm.....mddd',
        '..lmm...mmd..',
        '..lmmmmmmmd..',
        '.lllmmmmddd..',
        '..l..lmd..d..',
        '.....ddd.....'
    ],
    // 20 전투 완료 후 행동: 깃발
    flag: [
        '.l...........',
        '.lllllllll...',
        '.lwwmmmmmmd..',
        '.lwmmmmmmmmd.',
        '.lmmmmmmmmd..',
        '.lmmmmmmmd...',
        '.lddddddd....',
        '.l...........',
        '.l...........',
        '.l...........',
        '.l...........',
        'ldd..........',
        '.............'
    ]
};

const ORDER = Object.keys(ICONS);

module.exports = { PALETTE, ICONS, ORDER };
