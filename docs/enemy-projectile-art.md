# 적 투사체 이미지

최종 자산: `assets/effects/enemy-projectiles-v1.webp` (128×128, 투명 배경, 8종).
게임에는 작은 단일 스프라이트로 표시하며 추가 파티클이나 잔광은 없다. 플레이어 이펙트와 피해 규칙은 유지한다.
물리: 화살/뼛조각, 화염: 불꽃, 냉기: 얼음, 번개: 번개, 혼돈: 마력탄/독탄, 위습: 영혼불.
기존 자산 로더가 시트를 한 번 불러오며 렌더러는 적의 속성·식별자·위습 여부로 형태를 선택한다.
로드 전에는 기존 투사체 표현을 사용한다. `canvas-enemy-projectiles.js`는 battlefield 앞에 로드한다.

제작: 내장 image_gen으로 생성·단순화·투명 배경 추출 후 WebP 스프라이트 시트로 패킹.
최종 단순화 프롬프트:

Edit this enemy projectile sprite atlas into VERY SIMPLE compact pixel-art game sprites. Preserve exactly the same 2-column 4-row order (arrow/fireball, ice shard/lightning, purple orb/green poison drop, bone dart/teal wisp), all facing right. Preserve real transparent alpha background, no labels. Drastically simplify: each object should look like it was designed at 32x16 native pixels, with just 3 or 4 flat shades, clean strong silhouettes and a tiny one-pixel dark outline. No glow, NO PARTICLES, NO floating chips, NO filigree, NO texture, NO detailed feather veins or bone holes, NO long trailing flames. A simple short steel arrow; a small orange teardrop with cream center and 2 short flame points; a pale cyan elongated diamond shard; a single short yellow zigzag; a small purple orb with a 2-pixel short tail; a small green teardrop; an ivory narrow dart; a tiny teal ghost-flame with two short points. Keep each sprite centered in its own cell, horizontally aligned, tip right. Lots of transparency. These are modest ordinary enemy shots, NOT ultimate skill effects. Nearest-neighbor crisp square pixel clusters, no antialiasing. One single atlas, not mockup.

마지막 배경 추출은 그림과 배치를 유지하며 회색 체크무늬를 실제 alpha=0 배경으로 교체하도록 요청했다.
검증: 8종 실제 drawImage 동작, 미로딩 fallback, PC/모바일 체험 화면, 전체 스모크 및 구조 검사.
