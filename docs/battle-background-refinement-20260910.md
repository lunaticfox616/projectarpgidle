# 전장 배경 전체 개선 · 2026-09-10

사용자의 “지금 게임에 쓰고 있는 배경 다 고쳐줘” 요청에 따라 개발본의 활성 전장 배경을 새 파일로 연결했다.
기존 파일을 덮어쓰거나 삭제하지 않았다. 타이틀·로그인 UI와 사용되지 않는 구형 backdropAct 자산은 이번 전장 작업에 포함하지 않았다.

## 적용 범위와 소유 모듈

- 일반 액트 10종: `data/maps.js`의 ACT_BATTLE_MAP_SOURCES.
- 운석·천공탑·지하계·심해·우주 5종: `js/battle-backdrops.js`의 지연 로딩 목록.
- 혼돈 19개 키: `js/passives.js`의 이미지 목록. 내용이 동일한 기존 원본 4개는 새 파일을 공유한다.
- 합계 34개 연결, 중복을 제외한 새 WebP 30종: `assets/background/refined-20260910/`.
- 혼돈 중복 매핑: bgChaos14 → bgChaos11, bgChaos15 → bgChaos10, bgChaos16 → bgChaos9, bgChaos17 → bgChaos1.
- 미궁·심연·시즌 보스의 기존 지역 선택 규칙에 따라 위 이미지가 재사용된다.

## 제작과 표시 계약

내장 image_gen 이미지 편집 도구로 원본을 참조했다. 실제 모델 버전은 인터페이스에서 확인되지 않았다.
각 지역의 팔레트·주요 구조를 유지하면서 불분명한 반복 질감, 재질 구분, 빛과 구조를 정리했다.
과도한 격자가 생긴 혼돈 6·18은 원본만 참조해 다시 생성했다.

가로형 12종은 816×624, 정사각형 특수 3종은 627×627, 혼돈 15종은 512×512를 유지한다.
가로형 전장의 바닥은 (192,144)에서 시작하는 48px 셀 9×8로 조립했다.
생성 이미지에서 바닥과 주변 8개 사각 영역을 분리해 크기를 맞췄으며, 7행으로 생성된 Act 2·7·10은
바닥 셀을 재배치해 8행으로 맞췄다. 이는 생성 결과를 그대로 축소한 파일과 다르다.
모든 결과는 실제 불투명 WebP이며 투명 체크무늬 배경은 없다.

`js/ui.js`의 drawGridAlignedBackdrop에서 운석·지하계도 일반 액트와 동일한 map transform을 사용한다.
이전 생성 이미지 좌표에 의존하던 운석·지하계 보정식을 제거했다.
정사각형 전장은 기존 cover 표시를 유지한다. 전투 좌표·판정·진행·저장 데이터와 스크립트 순서는 변경하지 않았다.
새 전역이나 모듈 의존은 추가하지 않았다.

## 비교 화면과 재현 자료

[전체 전후 비교](../artifacts/background-refinement/index.html): 지역 선택, 이전/다음, 나란히 보기,
드래그 슬라이더, 한 장씩 전환, 1:1 표시, 전체 지역 썸네일, 원본/새 파일 다운로드.
HTTP 서버가 필요하다. `PLAYWRIGHT_PORT=4216 node scripts/serve-test.js`에 해당하는 셸 설정으로 실행한다.
비교 주소는 http://127.0.0.1:4216/artifacts/background-refinement/index.html 이다.

작업용 자료는 gitignored `artifacts/background-refinement/`에 보관한다:
all-backgrounds.json(원본 경로·SHA-256·연결), generations/*.json(프롬프트와 생성 경로),
generated/*.png(최종 채택한 생성 원본), registration.json(바닥 측정 좌표),
pack-all.cjs(크기·압축·조립), asset-report.json(출력 해시·용량), verify.cjs/verification.json(검증).
이전 Act 1 단독 시안 파일도 남겨 두었다. 게임용 파일과 이 문서는 저장소에 포함할 대상이다.

원본 30종 합계 4,182,463바이트 → 새 파일 3,914,792바이트(약 6.4% 감소).
특수 배경 기존 4종 합계 512KiB 미만, 운석 160KiB 미만 제한을 유지했다.

## 검증 결과

- 원본 34개 참조 SHA-256 보존, 새 이미지 30종 전체 디코딩·크기·불투명도, 34개 소스 URL 연결 확인.
- `node scripts/smoke-special-battle-backdrops.js`: 통과. 특수 배경 지연 로딩·캐시·실패 후 재시도와 PC/모바일 바닥 투영 정렬.
- `node scripts/smoke-grid-combat.js`: 통과.
- `npm test`: 181/181 통과.
- `npm run check:architecture`: 통과.
- `git diff --check`: 오류 없음.
- 실제 브라우저: 34개 지역의 원본/새 이미지 모두 로드, 슬라이더 25% 및 단일 이미지 전환, 콘솔 경고·오류 0.
- 실제 게임: 별도 로컬 포트 4217에서 전사 진입 후 PC 및 390×844 모바일 전투 화면 확인. 모바일 본문 가로 넘침 없음, 게임 콘솔 경고·오류 0.
- 미술적 선호와 모든 엔드게임의 장시간 플레이는 자동 검사로 보장하지 않는다. 비교 화면에서 지역별 결과를 검토할 수 있다.

무관한 기존 작업트리 변경은 보존했다. 원본으로 되돌릴 때는 all-backgrounds.json의 original 경로와
운석·지하계의 이전 렌더 보정식을 함께 복원해야 한다.
