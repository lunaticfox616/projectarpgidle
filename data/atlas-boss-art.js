/** Pixel-redrawn key poses: shared 16-entry palettes, binary alpha, 2px clusters. Sources: artifacts/endgame-expansion/pixel-style. */
const ATLAS_BOSS_ART = Object.freeze({
  "apex_gardener": {
    "id": "apex_gardener",
    "version": "20261018-pixel1",
    "name": "정원사의 메아리",
    "w": 448,
    "h": 304,
    "feet": [
      200,
      290
    ],
    "height": 220,
    "width": 340,
    "gait": "legs",
    "stride": 170,
    "walkMs": [
      150,
      140,
      150,
      140
    ],
    "attackMs": [
      130,
      230,
      90,
      250
    ],
    "impactFrame": 2,
    "walkCols": 4,
    "attackCols": 4,
    "pace": "stride",
    "still": false,
    "reach": [
      270,
      190
    ],
    "death": null
  },
  "apex_weaver": {
    "id": "apex_weaver",
    "version": "20261018-pixel1",
    "name": "나이테를 엮는 자",
    "w": 352,
    "h": 288,
    "feet": [
      180,
      275
    ],
    "height": 236,
    "width": 265,
    "gait": "float",
    "stride": 160,
    "walkMs": [
      600,
      600
    ],
    "attackMs": [
      140,
      300,
      100,
      300
    ],
    "impactFrame": 2,
    "walkCols": 2,
    "attackCols": 4,
    "pace": "time",
    "still": false,
    "reach": [
      250,
      175
    ],
    "death": null
  },
  "apex_archbishop": {
    "id": "apex_archbishop",
    "version": "20261018-pixel1",
    "name": "검은 태양의 대사제",
    "w": 256,
    "h": 288,
    "feet": [
      126,
      275
    ],
    "height": 250,
    "width": 165,
    "gait": "float",
    "stride": 160,
    "walkMs": [
      650,
      650
    ],
    "attackMs": [
      150,
      330,
      120,
      310
    ],
    "impactFrame": 2,
    "walkCols": 2,
    "attackCols": 4,
    "pace": "time",
    "still": false,
    "reach": [
      196,
      175
    ],
    "death": null
  }
});
safeExposeData({ ATLAS_BOSS_ART });
