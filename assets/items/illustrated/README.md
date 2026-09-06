# 장비 전용 래스터 아트

현재 게임의 장비 그림은 베이스별로 생성한 개별 래스터 이미지다.
베이스는 `data/items.js`의 `ITEM_VISUAL_ASSET_DB.equipmentGrid.baseAssets`,
특수 고유는 같은 객체의 `uniqueAssets`가 소유한다.
장비 이름/부위에서 실제 파일을 고르는 경계는 `js/items.js`다.

- `*.png`: 로컬 생성 원본 보관. PR에서는 제외하며, 실제 인벤토리에서도 직접 로드하지 않는다.
- `*.webp`: 표시용 파생 파일. 최대 384 × 384, 비율 유지, WebP quality 84 / alphaQuality 100.
- 이미지에는 등급 색을 씌우지 않는다. 등급 모서리 표시는 장비 UI의 CSS가 맡는다.
- 카드 안의 `object-fit: contain`과 여백을 유지한다. 그림을 확대해 칸 바깥으로 넘기지 않는다.
- 추가 장비도 기존 그림의 색상 변경이나 SVG 대체 대신 해당 베이스 모양을 갖춘 별도 그림을 사용한다.

로컬 작업 자료 `artifacts/ui-direction/equipment-art-manifest.json`과
`equipment-art-generated.json`에는 생성 프롬프트와 원본 위치가 있다.
같은 디렉터리의 `equipment-art.html`은 큰 그림과 작은 칸 크기 비교용이다.
이 원본·시안 자료는 로컬에 보존하며 배포 코드에는 포함하지 않는다.

게임 안의 로딩·칸 경계·페이지 전환·등급 표시·장착 검증:
`npx playwright test tests/browser/equipment-art.spec.js`.
