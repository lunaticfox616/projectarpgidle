// Colour and prop choices for each act biome. All terrain is drawn from these ramps (dark → light);
// nothing here is an image file.

export type PropKind = 'tree' | 'bush' | 'rock' | 'stump' | 'mushroom' | 'flower' | 'crystal' | 'pillar' | 'deadTree';

export interface Look {
  /** Room floor (moss, lawn, bark…), 4 shades. */
  ground: string[];
  /** Corridors and worn centres, 3 shades. */
  path: string[];
  /** Stone slabs around elite and boss rooms, 3 shades + mortar. */
  paving: string[];
  mortar: string;
  /** Wall mass seen from above, 4 shades. */
  wallTop: string[];
  /** The wall's front face above a floor edge, 3 shades. */
  wallFace: string[];
  /** Suspended biomes: the drop beneath platforms, 3 shades (none for grounded biomes). */
  void?: string[];
  /** Small colour accents: flowers, embers, glow. */
  accent: string[];
  /** Leaves of trees and bushes, 4 shades (defaults to wallTop). */
  leaves?: string[];
  /** Big props along walls and small ones on floors. */
  wallProps: PropKind[];
  floorProps: PropKind[];
}

export const LOOKS: Record<string, Look> = {
  root: {
    ground: ['#2f4a24', '#3d5e2a', '#517a33', '#6b9a3e'], path: ['#4a3524', '#5e4530', '#76583a'],
    paving: ['#4d4a44', '#6a665c', '#86806f'], mortar: '#2a2622',
    wallTop: ['#0f1f14', '#16301d', '#1f4227', '#2c5a32'], wallFace: ['#1a140e', '#2a2016', '#3a2c1e'],
    accent: ['#e2cf62', '#d07494'], leaves: ['#1c3a1e', '#2b5528', '#3f7432', '#5c9640'],
    wallProps: ['tree', 'tree', 'bush'], floorProps: ['flower', 'mushroom', 'rock']
  },
  courtyard: {
    ground: ['#3f6a2c', '#4f8235', '#63a040', '#7fbd4f'], path: ['#7a6a52', '#958165', '#ad997b'],
    paving: ['#8e8b82', '#aeaa9e', '#cbc6b6'], mortar: '#5d5a52',
    wallTop: ['#16361c', '#1f4a25', '#2b6331', '#3a7c3c'], wallFace: ['#122a16', '#1a3a1e', '#234a27'],
    accent: ['#f0e8f6', '#e27aa2'], leaves: ['#1f4a25', '#2b6331', '#3a7c3c', '#52a04c'],
    wallProps: ['bush', 'pillar', 'bush'], floorProps: ['flower', 'flower']
  },
  aerial: {
    ground: ['#4a3020', '#6b4630', '#8a5e3e', '#a87a50'], path: ['#5a3a26', '#74503a', '#8e6648'],
    paving: ['#5c4a3a', '#76624e', '#907a62'], mortar: '#2d1c12',
    wallTop: ['#0b1422', '#12203a', '#1c2e52', '#24406a'], wallFace: ['#2d1c12', '#3d2618', '#4e3120'],
    void: ['#070d18', '#0e1a30', '#18284a'], accent: ['#7aa84a', '#c8e08a'],
    wallProps: [], floorProps: ['flower', 'mushroom']
  },
  maze: {
    ground: ['#3a3a30', '#4a4a3c', '#5c5a48', '#706c56'], path: ['#5a4a38', '#6e5c46', '#85705a'],
    paving: ['#4a4845', '#605d57', '#77736a'], mortar: '#26241f',
    wallTop: ['#1c1510', '#2a1f16', '#3b2c1f', '#4f3b28'], wallFace: ['#150f0b', '#211811', '#2e2218'],
    accent: ['#b8a468', '#7c9a52'], leaves: ['#243a1c', '#324f24', '#44682e', '#5a843a'],
    wallProps: ['rock', 'stump', 'bush'], floorProps: ['rock', 'mushroom']
  },
  sanctum: {
    ground: ['#5c5c6a', '#74748a', '#8e8ea4', '#a8a8c0'], path: ['#6a6a7c', '#80809a', '#9a9ab4'],
    paving: ['#62607a', '#7c7a96', '#9896b2'], mortar: '#383650',
    wallTop: ['#070d12', '#0c1a22', '#12303a', '#18404c'], wallFace: ['#3a3a4c', '#4a4a60', '#5a5a74'],
    void: ['#04080c', '#0a161e', '#10262e'], accent: ['#7fe0e0', '#c8f6ff'],
    wallProps: [], floorProps: ['crystal', 'crystal', 'pillar']
  },
  ruins: {
    ground: ['#3a302a', '#4a3c33', '#5c4b3e', '#6e5a48'], path: ['#4a3a2e', '#5e4a3a', '#735c48'],
    paving: ['#4a4440', '#5f5750', '#766c62'], mortar: '#221c18',
    wallTop: ['#1a1412', '#261d1a', '#342823', '#45352c'], wallFace: ['#140f0d', '#1e1714', '#2a201b'],
    accent: ['#ff7a30', '#ffc060'], leaves: ['#2a2018', '#3a2c20', '#4a3a28', '#5a4830'],
    wallProps: ['pillar', 'deadTree', 'rock'], floorProps: ['rock', 'flower']
  },
  trunk: {
    ground: ['#3a2618', '#4d3321', '#63432b', '#7a5536'], path: ['#6a4a2e', '#80603c', '#9a784c'],
    paving: ['#5a3a22', '#72502e', '#8c663c'], mortar: '#2a1a0e',
    wallTop: ['#1f140c', '#2c1d12', '#3a2718', '#4c3420'], wallFace: ['#170f09', '#22170e', '#2e2014'],
    accent: ['#d8c078', '#f0e0a0'], leaves: ['#3a2a18', '#4e3a22', '#644c2c', '#7c6038'],
    wallProps: ['stump', 'mushroom', 'stump'], floorProps: ['mushroom', 'mushroom']
  },
  veil: {
    ground: ['#2a2238', '#352b48', '#44385c', '#554774'], path: ['#3c3050', '#4e4066', '#62527e'],
    paving: ['#3e3c4e', '#525066', '#68657e'], mortar: '#1c1a28',
    wallTop: ['#120e1c', '#1b1528', '#261e38', '#33284c'], wallFace: ['#0d0a15', '#161020', '#1f172d'],
    accent: ['#b48cff', '#7fd8ff'], leaves: ['#241a3a', '#34264e', '#4a3668', '#644a86'],
    wallProps: ['tree', 'crystal', 'tree'], floorProps: ['mushroom', 'crystal']
  },
  canopy: {
    ground: ['#5a2e18', '#7a3e1c', '#9a5424', '#b86e2e'], path: ['#4a3424', '#5e4430', '#76583c'],
    paving: ['#4e4640', '#645a52', '#7c7064'], mortar: '#2a2420',
    wallTop: ['#2a1408', '#3c1e0c', '#552a10', '#6e3a16'], wallFace: ['#1e0f06', '#2c170a', '#3a200e'],
    accent: ['#e8b848', '#d0542c'], leaves: ['#5a2410', '#80361a', '#a84c22', '#d0702e'],
    wallProps: ['tree', 'deadTree', 'bush'], floorProps: ['flower', 'rock']
  },
  crown: {
    ground: ['#8a7a5a', '#a8966c', '#c8b482', '#e6d4a0'], path: ['#9a8a66', '#b4a27a', '#cebc90'],
    paving: ['#a09070', '#bcaa86', '#d6c49c'], mortar: '#5e4e34',
    wallTop: ['#05060f', '#0a0c1e', '#141838', '#1e2450'], wallFace: ['#4a3e2a', '#5e4e34', '#72603e'],
    void: ['#03040a', '#080a1a', '#10143a'], accent: ['#ffe6a0', '#a8ccff'],
    wallProps: [], floorProps: ['crystal', 'pillar']
  }
};

export const lookFor = (biome: string): Look => LOOKS[biome] ?? LOOKS.root!;
