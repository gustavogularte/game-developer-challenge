export interface IslandPoint {
  x: number;
  y: number;
}

interface IslandDecoration {
  tileId: number;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
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
  sandTextureId: 69,
  sandDetailTextureId: 68,
  grassTextureId: 23,
  mainCornerRadius: 32,
  smallCornerRadius: 20,
};

function points(coordinates: [number, number][]): IslandPoint[] {
  return coordinates.map(([x, y]) => ({ x, y }));
}

// Fixed art direction keeps the navigation map stable and the waterways open.
function createOriginalIslands(): IslandDefinition[] {
  return [
    {
      id: "forest-fort-island",
      x: 224,
      y: 192,
      cornerRadius: islandConfig.mainCornerRadius,
      outline: points([
        [18, 112],
        [62, 52],
        [170, 20],
        [256, 38],
        [320, 12],
        [392, 42],
        [486, 18],
        [575, 48],
        [618, 102],
        [600, 162],
        [542, 201],
        [468, 198],
        [438, 238],
        [455, 291],
        [410, 340],
        [329, 352],
        [278, 416],
        [196, 432],
        [137, 390],
        [145, 324],
        [111, 280],
        [46, 260],
        [0, 199],
      ]),
      grassOutline: points([
        [49, 117],
        [95, 75],
        [175, 55],
        [258, 77],
        [324, 48],
        [394, 85],
        [477, 56],
        [552, 76],
        [574, 116],
        [528, 154],
        [455, 148],
        [398, 196],
        [412, 276],
        [373, 303],
        [305, 310],
        [260, 379],
        [205, 391],
        [174, 363],
        [185, 304],
        [149, 239],
        [85, 216],
        [39, 169],
      ]),
      decorations: [
        { tileId: 71, x: 126, y: 117, scale: 1.1 },
        { tileId: 72, x: 173, y: 86, scale: 0.85 },
        { tileId: 70, x: 94, y: 158 },
        { tileId: 87, x: 161, y: 156 },
        { tileId: 88, x: 220, y: 107 },
        { tileId: 71, x: 480, y: 97 },
        { tileId: 70, x: 524, y: 121, scale: 0.85 },
        { tileId: 65, x: 435, y: 127, scale: 0.8 },
        { tileId: 89, x: 263, y: 191 },
        { tileId: 90, x: 295, y: 159 },
        { tileId: 91, x: 327, y: 191 },
        { tileId: 92, x: 295, y: 249 },
        { tileId: 88, x: 246, y: 246 },
        { tileId: 87, x: 347, y: 244 },
        { tileId: 67, x: 364, y: 280, scale: 0.85 },
        { tileId: 72, x: 226, y: 333 },
        { tileId: 70, x: 196, y: 357, scale: 0.75 },
        { tileId: 87, x: 245, y: 363 },
        { tileId: 49, x: 117, y: 276, scale: 0.65 },
      ],
    },
    {
      id: "rocky-cove-island",
      x: 1552,
      y: 700,
      cornerRadius: islandConfig.mainCornerRadius,
      outline: points([
        [0, 196],
        [48, 152],
        [113, 139],
        [135, 60],
        [216, 16],
        [283, 0],
        [355, 58],
        [424, 50],
        [464, 27],
        [529, 52],
        [590, 106],
        [619, 180],
        [596, 238],
        [544, 259],
        [492, 240],
        [448, 260],
        [421, 344],
        [348, 410],
        [276, 420],
        [209, 375],
        [181, 307],
        [123, 271],
        [34, 280],
      ]),
      grassOutline: points([
        [71, 192],
        [151, 176],
        [175, 88],
        [228, 56],
        [273, 42],
        [344, 100],
        [419, 105],
        [465, 72],
        [513, 99],
        [555, 154],
        [553, 206],
        [497, 193],
        [449, 218],
        [392, 309],
        [331, 365],
        [289, 376],
        [246, 338],
        [222, 266],
        [154, 233],
        [77, 231],
      ]),
      decorations: [
        { tileId: 50, x: 493, y: 153, scale: 1.05 },
        { tileId: 51, x: 547, y: 183, scale: 0.85 },
        { tileId: 49, x: 525, y: 222, scale: 0.65 },
        { tileId: 67, x: 451, y: 142 },
        { tileId: 66, x: 421, y: 188 },
        { tileId: 65, x: 397, y: 224, scale: 0.75 },
        { tileId: 88, x: 374, y: 177 },
        { tileId: 71, x: 237, y: 131, scale: 1.08 },
        { tileId: 72, x: 284, y: 109 },
        { tileId: 70, x: 205, y: 166, scale: 0.85 },
        { tileId: 87, x: 264, y: 178 },
        { tileId: 88, x: 323, y: 267 },
        { tileId: 72, x: 313, y: 324, scale: 0.85 },
        { tileId: 65, x: 358, y: 312, scale: 0.65 },
        { tileId: 49, x: 153, y: 265, scale: 0.6 },
      ],
    },
    {
      id: "palm-islet",
      x: 320,
      y: 960,
      cornerRadius: islandConfig.smallCornerRadius,
      outline: points([
        [0, 92],
        [24, 57],
        [64, 46],
        [98, 10],
        [133, 0],
        [158, 33],
        [142, 75],
        [99, 105],
        [70, 145],
        [23, 154],
        [8, 131],
      ]),
      grassOutline: points([
        [47, 84],
        [75, 66],
        [106, 30],
        [127, 26],
        [124, 65],
        [89, 88],
        [61, 117],
        [36, 121],
      ]),
      decorations: [
        { tileId: 71, x: 99, y: 57, scale: 0.85 },
        { tileId: 70, x: 65, y: 103, scale: 0.7 },
        { tileId: 87, x: 79, y: 83, scale: 0.7 },
      ],
    },
    {
      id: "rock-islet",
      x: 640,
      y: 992,
      cornerRadius: islandConfig.smallCornerRadius,
      outline: points([
        [0, 69],
        [30, 36],
        [76, 39],
        [108, 0],
        [143, 13],
        [163, 54],
        [136, 88],
        [140, 116],
        [103, 141],
        [54, 118],
        [13, 113],
      ]),
      grassOutline: [],
      decorations: [
        { tileId: 50, x: 85, y: 80, scale: 0.85 },
        { tileId: 51, x: 120, y: 47, scale: 0.7 },
        { tileId: 49, x: 48, y: 96, scale: 0.55 },
      ],
    },
  ];
}

// Hand-shaped coastlines keep bays and channels readable instead of scattering tiles.
function createCoastalIsland(
  id: string, x: number, y: number,
  coast: [number, number][], grass: [number, number][],
  decorations: IslandDecoration[],
): IslandDefinition {
  return { id, x, y, cornerRadius: islandConfig.mainCornerRadius,
    outline: points(coast), grassOutline: points(grass), decorations };
}

export function createIslands(): IslandDefinition[] {
  return [
    ...createOriginalIslands(),
    createCoastalIsland("crescent-bay", 1160, 180,
      [[0,160],[45,75],[150,20],[270,0],[390,40],[435,115],[390,166],[315,115],[225,88],[147,126],[133,212],[175,285],[110,330],[40,265]],
      [[38,157],[78,99],[157,55],[270,35],[361,66],[382,105],[311,83],[219,54],[119,100],[94,209],[129,277],[107,282],[69,247]],
      [{tileId:71,x:172,y:65},{tileId:72,x:90,y:160},{tileId:70,x:89,y:233,scale:0.85},{tileId:88,x:267,y:55},{tileId:65,x:347,y:90,scale:0.7}]),
    createCoastalIsland("eastern-watch", 3360, 410,
      [[0,152],[48,78],[138,61],[194,0],[282,14],[333,81],[417,111],[449,200],[398,260],[316,240],[271,302],[179,325],[125,275],[42,250]],
      [[43,151],[79,112],[163,99],[211,39],[263,49],[305,113],[381,144],[405,194],[374,219],[302,202],[245,268],[182,282],[145,236],[74,214]],
      [{tileId:50,x:229,y:100},{tileId:67,x:281,y:141},{tileId:71,x:132,y:174},{tileId:72,x:180,y:235},{tileId:87,x:335,y:181},{tileId:49,x:83,y:203,scale:0.7}]),
    createCoastalIsland("southern-palm-shore", 2690, 2010,
      [[0,122],[66,49],[157,28],[217,0],[294,33],[324,110],[393,153],[418,239],[360,292],[275,271],[222,319],[140,298],[97,227],[29,209]],
      [[42,125],[92,83],[163,69],[220,40],[267,66],[287,135],[351,176],[371,224],[345,250],[270,231],[208,276],[165,261],[126,199],[65,177]],
      [{tileId:71,x:194,y:110},{tileId:72,x:249,y:160},{tileId:70,x:153,y:195},{tileId:88,x:313,y:215},{tileId:65,x:210,y:248,scale:0.7},{tileId:87,x:117,y:125}]),
    createCoastalIsland("western-sandbar", 720, 1900,
      [[0,100],[81,66],[150,12],[235,0],[299,36],[356,39],[397,84],[361,130],[272,121],[210,162],[129,180],[47,156]],
      [[77,109],[157,62],[237,43],[285,70],[320,86],[262,84],[196,126],[130,141]],
      [{tileId:70,x:181,y:99,scale:0.85},{tileId:72,x:241,y:76,scale:0.8},{tileId:49,x:90,y:131,scale:0.65}]),
    createCoastalIsland("far-reef", 4160, 1740,
      [[0,66],[48,12],[110,0],[171,37],[188,105],[135,149],[71,135],[24,111]], [],
      [{tileId:50,x:88,y:63},{tileId:51,x:131,y:99,scale:0.8},{tileId:49,x:50,y:93,scale:0.7}]),
    createCoastalIsland("lagoon-garden", 3640, 2180,
      [[0,120],[46,42],[123,0],[202,25],[256,10],[324,55],[350,133],[309,204],[235,216],[182,174],[117,215],[42,190]],
      [[38,119],[78,72],[125,40],[199,63],[256,47],[288,81],[308,132],[283,167],[240,178],[184,135],[113,176],[70,157]],
      [{tileId:71,x:120,y:90},{tileId:72,x:255,y:103},{tileId:87,x:183,y:104},{tileId:88,x:100,y:147},{tileId:66,x:276,y:154,scale:0.8}]),
  ];
}
