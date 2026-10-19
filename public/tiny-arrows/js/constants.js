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

// 鲜艳高对比调色板（经典高饱和与明度）
export const ARROW_COLORS = [
  '#18181b', // 纯黑
  '#16a34a', // 翠绿
  '#2563eb', // 宝石蓝
  '#0284c7', // 天蓝
  '#ea580c', // 亮橙
  '#d97706', // 琥珀黄
  '#9333ea', // 紫罗兰
  '#db2777', // 玫红
  '#854d0e', // 咖啡棕
  '#64748b', // 烟灰
  '#dc2626'  // 绯红
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
