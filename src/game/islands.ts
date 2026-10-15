export interface IslandPoint {
  x: number;
  y: number;
}

interface IslandDecoration {
  tileId: number;
  x: number;
  y: number;
}

export interface IslandDefinition {
  id: string;
  x: number;
  y: number;
  cornerRadius: number;
  outline: IslandPoint[];
  grassOutline: IslandPoint[];
  decorations: IslandDecoration[];
}

export const islandConfig = {
  sandTextureId: 4,
  grassTextureId: 23,
  mainCornerRadius: 48,
  smallCornerRadius: 28,
};

function points(coordinates: [number, number][]): IslandPoint[] {
  return coordinates.map(([x, y]) => ({ x, y }));
}

export function createIslands(): IslandDefinition[] {
  return [
    {
      id: 'forest-fort-island',
      x: 224,
      y: 192,
      cornerRadius: islandConfig.mainCornerRadius,

      outline: points([
        [40, 30],
        [210, 0],
        [330, 35],
        [470, 0],
        [580, 40],
        [630, 150],
        [550, 235],
        [480, 240],
        [450, 330],
        [320, 355],
        [260, 435],
        [120, 410],
        [115, 300],
        [20, 270],
        [0, 150],
      ]),

      grassOutline: points([
        [90, 90],
        [220, 65],
        [315, 100],
        [460, 70],
        [520, 120],
        [480, 180],
        [395, 175],
        [390, 265],
        [275, 280],
        [235, 355],
        [160, 320],
        [165, 240],
        [70, 205],
        [45, 140],
      ]),

      decorations: [
        { tileId: 71, x: 210, y: 120 },
        { tileId: 70, x: 430, y: 120 },
        { tileId: 72, x: 225, y: 315 },
        { tileId: 65, x: 140, y: 260 },
        { tileId: 87, x: 320, y: 125 },
        { tileId: 29, x: 192, y: 208 },
        { tileId: 16, x: 256, y: 208 },
        { tileId: 30, x: 320, y: 208 },
      ],
    },

    {
      id: 'rocky-cove-island',
      x: 1552,
      y: 700,
      cornerRadius: islandConfig.mainCornerRadius,

      outline: points([
        [0, 160],
        [100, 125],
        [120, 35],
        [255, 0],
        [360, 55],
        [470, 20],
        [590, 90],
        [620, 230],
        [555, 285],
        [465, 280],
        [420, 385],
        [295, 420],
        [180, 360],
        [120, 280],
        [25, 285],
      ]),

      grassOutline: points([
        [70, 195],
        [155, 170],
        [170, 90],
        [245, 65],
        [350, 120],
        [450, 85],
        [530, 130],
        [555, 220],
        [465, 215],
        [405, 315],
        [300, 350],
        [215, 300],
        [170, 230],
        [70, 240],
      ]),

      decorations: [
        { tileId: 71, x: 410, y: 155 },
        { tileId: 72, x: 280, y: 285 },
        { tileId: 66, x: 480, y: 245 },
        { tileId: 67, x: 505, y: 200 },
        { tileId: 88, x: 235, y: 140 },
      ],
    },

    {
      id: 'palm-islet',
      x: 320,
      y: 960,
      cornerRadius: islandConfig.smallCornerRadius,

      outline: points([
        [10, 30],
        [80, 0],
        [150, 40],
        [145, 125],
        [80, 160],
        [0, 125],
      ]),

      grassOutline: points([
        [50, 45],
        [100, 30],
        [120, 80],
        [100, 115],
        [40, 100],
      ]),

      decorations: [{ tileId: 71, x: 80, y: 75 }],
    },

    {
      id: 'rock-islet',
      x: 640,
      y: 992,
      cornerRadius: islandConfig.smallCornerRadius,

      outline: points([
        [20, 10],
        [100, 0],
        [160, 55],
        [130, 140],
        [40, 130],
        [0, 75],
      ]),

      grassOutline: [],

      decorations: [{ tileId: 65, x: 80, y: 65 }],
    },
  ];
}
