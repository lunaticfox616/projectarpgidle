# 전사 검집 보행 자산

2026-09-06: 좌우 이동을 기존 캐릭터 원본의 검집 보행으로 교체했다.
다른 방향과 공격 모션은 유지한다.

- 원본: `new_characters walk plus.zip`
- 내부 경로: `characters/Idle/pixel_art_knight_sta/animations/armored_knight_walking_sword_sheathed_at_the_waist/{east,west}`
- 각 방향 96×96 프레임 9개, 투명 알파 보존, 무손실 WebP 864×96 스트립.
- 게임 자산: `assets/playable/classes/warrior/walk.webp`, `walk-west.webp`.
- 발 기준선: 양쪽 `anchorY: 80`. 프레임별 발 끝은 79–80픽셀에 있다.
- `scripts/build-test-character-assets.py`의 기존 `pack_strip`으로 이 두 스트립만 갱신했다.
  전체 재생성 시 기존 `--archive` 외에 `--sheathed-walk-archive`로 위 보조 압축 파일을 지정한다.
  클래스 manifest와 `data/passives.js`의 기준선을 함께 관리한다.

검증: `scripts/smoke-test-character-motions.js`,
`tests/browser/motion-notices.spec.js`의 방향별 프레임 접지 검사 및 이미지 확인.
이동 속도, 공격 속도, 판정, 저장 데이터에는 변경이 없다.
