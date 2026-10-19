// ==========================================
// 全局常量与配置规范
// ==========================================

export const DIRS = {
  up: { dr: -1, dc: 0, char: '↑' },
  down: { dr: 1, dc: 0, char: '↓' },
  left: { dr: 0, dc: -1, char: '←' },
  right: { dr: 0, dc: 1, char: '→' }
};

export const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

// 莫兰迪轻奢宝石调色板（北欧极简·大师级温润高对比，亮暗双模兼顾，白箭头对比度优异）
export const ARROW_COLORS = [
  '#3b71ca', // 海蓝宝石 (Cerulean)
  '#d95d48', // 温润珊瑚 (Terracotta)
  '#2a9d8f', // 翡翠石青 (Forest Jade)
  '#c78528', // 复古暖金 (Warm Ochre)
  '#7c5295', // 幽兰紫檀 (Amethyst)
  '#528b70', // 北欧灰绿 (Nordic Sage)
  '#d06a28', // 琥珀焦橙 (Burnt Orange)
  '#be466e', // 烟熏蔷薇 (Dusty Rose)
  '#4361ee', // 极光靛蓝 (Deep Ultramarine)
  '#475569'  // 青石墨韵 (Warm Slate)
];

// 经典几何形状轮廓发生器
export const SHAPES = {
  rect: {
    name: '矩形密集阵',
    getDimensions: (diff) => {
      if (diff === 'easy') return { rows: 20, cols: 14 };
      if (diff === 'medium') return { rows: 24, cols: 16 };
      return { rows: 28, cols: 18 };
    },
    isInside: () => true
  },
  heart: {
    name: '❤️ 爱心轮廓',
    getDimensions: (diff) => {
      if (diff === 'easy') return { rows: 20, cols: 20 };
      if (diff === 'medium') return { rows: 24, cols: 24 };
      return { rows: 28, cols: 28 };
    },
    isInside: (r, c, rows, cols) => {
      const midR = rows * 0.45;
      const midC = cols * 0.5;
      const x = (c - midC) / (cols * 0.38);
      const y = -(r - midR) / (rows * 0.42);
      return Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0.02;
    }
  },
  diamond: {
    name: '💎 钻石点阵',
    getDimensions: (diff) => {
      if (diff === 'easy') return { rows: 20, cols: 20 };
      if (diff === 'medium') return { rows: 24, cols: 24 };
      return { rows: 28, cols: 28 };
    },
    isInside: (r, c, rows, cols) => {
      const midR = (rows - 1) / 2;
      const midC = (cols - 1) / 2;
      const maxDist = (Math.min(rows, cols) / 2) * 0.76;
      return Math.abs(r - midR) + Math.abs(c - midC) <= maxDist;
    }
  },
  donut: {
    name: '🍩 甜甜圈环形',
    getDimensions: (diff) => {
      if (diff === 'easy') return { rows: 20, cols: 20 };
      if (diff === 'medium') return { rows: 24, cols: 24 };
      return { rows: 28, cols: 28 };
    },
    isInside: (r, c, rows, cols) => {
      const midR = (rows - 1) / 2;
      const midC = (cols - 1) / 2;
      const rMax = (Math.min(rows, cols) / 2) * 0.78;
      const rMin = (Math.min(rows, cols) / 2) * 0.32;
      const dist = Math.hypot(r - midR, c - midC);
      return dist <= rMax && dist >= rMin;
    }
  }
};

export const GAME_RULES = {
  PENALTY_SECONDS: 5,
  HOURGLASS_BONUS_SECONDS: 10,
  BASE_TIME_LIMIT: 130
};

// ==========================================
// 3D 立体空间正交方向规范 (X:左右, Y:上下, Z:前后)
// ==========================================
export const DIRS_3D = {
  right:   { dx: 1,  dy: 0,  dz: 0,  axis: 'x', sign: 1,  label: '右 (+X)' },
  left:    { dx: -1, dy: 0,  dz: 0,  axis: 'x', sign: -1, label: '左 (-X)' },
  up:      { dx: 0,  dy: 1,  dz: 0,  axis: 'y', sign: 1,  label: '上 (+Y)' },
  down:    { dx: 0,  dy: -1, dz: 0,  axis: 'y', sign: -1, label: '下 (-Y)' },
  forward: { dx: 0,  dy: 0,  dz: 1,  axis: 'z', sign: 1,  label: '前 (+Z)' },
  back:    { dx: 0,  dy: 0,  dz: -1, axis: 'z', sign: -1, label: '后 (-Z)' }
};

export const DIR_3D_KEYS = ['right', 'left', 'up', 'down', 'forward', 'back'];

export const OPPOSITE_3D = {
  right: 'left',
  left: 'right',
  up: 'down',
  down: 'up',
  forward: 'back',
  back: 'forward'
};

// 3D 空间立体造型发生器
export const SHAPES_3D = {
  cube: {
    name: '🧊 经典立体魔方',
    getDimensions: (diff) => {
      if (diff === 'easy') return { sizeX: 4, sizeY: 4, sizeZ: 4 };
      if (diff === 'medium') return { sizeX: 5, sizeY: 5, sizeZ: 5 };
      return { sizeX: 6, sizeY: 6, sizeZ: 6 };
    },
    isInside: () => true
  },
  diamond3d: {
    name: '💎 3D水晶八面体',
    getDimensions: (diff) => {
      if (diff === 'easy') return { sizeX: 5, sizeY: 5, sizeZ: 5 };
      if (diff === 'medium') return { sizeX: 7, sizeY: 7, sizeZ: 7 };
      return { sizeX: 7, sizeY: 7, sizeZ: 7 };
    },
    isInside: (x, y, z, sx, sy, sz) => {
      const midX = (sx - 1) / 2;
      const midY = (sy - 1) / 2;
      const midZ = (sz - 1) / 2;
      const maxDist = (Math.min(sx, sy, sz) / 2) * 1.15;
      return (Math.abs(x - midX) + Math.abs(y - midY) + Math.abs(z - midZ)) <= maxDist;
    }
  },
  heart3d: {
    name: '❤️ 3D立体爱心',
    getDimensions: (diff) => {
      if (diff === 'easy') return { sizeX: 5, sizeY: 5, sizeZ: 5 };
      if (diff === 'medium') return { sizeX: 7, sizeY: 7, sizeZ: 7 };
      return { sizeX: 7, sizeY: 7, sizeZ: 7 };
    },
    isInside: (x, y, z, sx, sy, sz) => {
      const midX = (sx - 1) / 2;
      const midY = (sy - 1) * 0.45;
      const midZ = (sz - 1) / 2;
      const nx = (x - midX) / (sx * 0.38);
      const ny = -(y - midY) / (sy * 0.42);
      const nz = (z - midZ) / (sz * 0.38);
      const r2 = nx * nx + nz * nz + ny * ny - 1;
      return Math.pow(r2, 3) - (nx * nx + 0.1 * nz * nz) * (ny * ny * ny) <= 0.08;
    }
  }
};
