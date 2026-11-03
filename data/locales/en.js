// 영어 언어팩(docs/i18n.md). 열쇠는 코드·index.html의 한국어 원문 그대로(gettext 방식, 문맥이 필요하면 '원문|문맥'). 값은 글이거나
// 복수형 { one: '...', other: '...' }이고, {이름} 자리는 원문의 자리와 같은 이름만 쓴다. 팩에 없는 글은 한국어로 보이며,
// `npm run check:i18n -- --report`가 아직 번역이 없는 원문과 코드에서 사라진 열쇠를 알려 준다.
const LANGUAGE_PACK_EN = Object.freeze({
    code: 'en',
    name: 'English',
    locale: 'en-US',
    strings: Object.freeze({
        // 설정 분류(index.html #tab-settings)
        '설정 분류': 'Settings sections',
        '화면과 소리': 'Display & Sound',
        '전투': 'Combat',
        '자동 진행': 'Automation',
        '아이템 필터': 'Item Filter',
        '알림과 채팅': 'Alerts & Chat',
        '조작': 'Controls',
        '저장과 계정': 'Save & Account',
        '바꾸면 바로 적용되고 저장됩니다.': 'Changes apply and save immediately.',
        // 화면과 글자
        '화면과 글자': 'Screen & Text',
        '화면 배율': 'UI scale',
        '메뉴와 글자의 크기': 'Size of menus and text',
        '{step}% (추천)': '{step}% (recommended)',
        '{step}% (글꼴 바꿈)': '{step}% (smooth font)',
        '메뉴와 글자의 크기. (추천)은 도트가 또렷한 배율이고, 글꼴 바꿈 배율은 글자를 일반 글꼴로 보입니다.':
            'Size of menus and text. (recommended) keeps the pixel font crisp; smooth-font scales show text in a regular font.',
        '100% (기본)': '100% (default)',
        '화면 모드': 'Display mode',
        'F11이나 Alt+Enter로도 바꿉니다': 'F11 and Alt+Enter also switch it',
        '전체 화면': 'Full screen',
        '창 모드': 'Windowed',
        '고대비 모드': 'High contrast',
        '글자와 테두리를 또렷하게 하고 전장 가장자리의 어둠을 줄입니다': 'Sharpens text and borders and lightens the dark battlefield edges',
        '언어': 'Language',
        '글과 숫자 표기. 바꾸면 바로 적용됩니다': 'Text and number formatting. Applies immediately',
        // 소리
        '소리': 'Sound',
        '효과음': 'Sound effects',
        '공격, 피격, 처치, 전리품, 버튼 소리': 'Attacks, hits, kills, loot and button sounds',
        '음량': 'Volume',
        '미리 듣기': 'Preview',
        // 캐릭터 외형
        '캐릭터 외형': 'Hero appearance',
        '외형 방식': 'Appearance mode',
        '외형 고정': 'Fixed appearance',
        '현재 직업 외형 사용': 'Follow current class',
        '고정 외형': 'Fixed look',
        '외형은 능력치에 영향을 주지 않습니다.': 'Appearance does not affect stats.',
        // 장비 부위(저장 키이기도 하다: data/items.js, js/ui.js getItemSlotDisplayLabel)
        '장비': 'Equipment',
        '무기': 'Weapon',
        '투구': 'Helmet',
        '갑옷': 'Armor',
        '장갑': 'Gloves',
        '신발': 'Boots',
        '목걸이': 'Amulet',
        '반지': 'Ring',
        '허리띠': 'Belt',
        '방패': 'Shield',
        '완갑': 'Buckler',
        '코어': 'Core',
        '부적': 'Talisman',
        // 무기 종류(data/weapon-categories.js, 부위 이름 자리에 무기 종류가 나온다)
        '대검': 'Greatsword',
        '한손검': 'Scimitar',
        '단궁': 'Shortbow',
        '오브': 'Orb',
        '플라스크': 'Flask',
        '향로': 'Censer',
        // 희귀도(data/items.js ITEM_RARITY_LABELS)
        '일반': 'Normal',
        '마법': 'Magic',
        '희귀': 'Rare',
        '고유': 'Unique'
    })
});

safeExposeData({ LANGUAGE_PACK_EN });
