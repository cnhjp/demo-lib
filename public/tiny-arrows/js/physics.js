// ==========================================
// 射线物理穿透与阻挡判定引擎 (高性能空间网格加速)
// ==========================================

import { DIRS } from './constants.js';

/**
 * 构建 2D 空间单元格快速查找哈希表 O(N)
 * @param {Array} arrows 箭头列表
 * @returns {Map<number, Object>} 坐标压缩整数键 -> 箭头对象引用
 */
export function buildSpatialMap(arrows) {
  const map = new Map();
  for (let i = 0; i < arrows.length; i++) {
    const a = arrows[i];
    for (let j = 0; j < a.cells.length; j++) {
      const c = a.cells[j];
      map.set((c.r << 16) | c.c, a);
    }
  }
  return map;
}

/**
 * 射线投射检查箭头前方是否有阻挡
 * @param {Object} arrow 当前待发射箭头
 * @param {Array|Map} arrowsOrMap 棋盘内所有当前箭头 或 预构建的 SpatialMap
 * @param {number} rows 棋盘行数
 * @param {number} cols 棋盘列数
 * @returns {Object} { clear: boolean, blocker?: Object }
 */
export function checkArrowClearance(arrow, arrowsOrMap, rows, cols) {
  const head = arrow.head;
  const { dr, dc } = DIRS[head.dir];

  let cr = head.r + dr;
  let cc = head.c + dc;

  const isMap = arrowsOrMap instanceof Map;

  while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
    if (isMap) {
      const blocker = arrowsOrMap.get((cr << 16) | cc);
      if (blocker && blocker.id !== arrow.id) {
        return { clear: false, blocker };
      }
    } else {
      for (let i = 0; i < arrowsOrMap.length; i++) {
        const other = arrowsOrMap[i];
        if (other.id === arrow.id) continue;
        for (let j = 0; j < other.cells.length; j++) {
          const c = other.cells[j];
          if (c.r === cr && c.c === cc) {
            return { clear: false, blocker: other };
          }
        }
      }
    }
    cr += dr;
    cc += dc;
  }

  return { clear: true };
}

/**
 * 一次性高效获取所有当前无阻挡可发射的箭头 (O(N) 极速空间哈希索引)
 * @param {Array} arrows 棋盘所有箭头
 * @param {number} rows 棋盘行数
 * @param {number} cols 棋盘列数
 * @returns {Array} 可发射箭头数组
 */
export function findMovableArrows(arrows, rows, cols) {
  if (!arrows || arrows.length === 0) return [];
  const map = buildSpatialMap(arrows);
  const movables = [];
  for (let i = 0; i < arrows.length; i++) {
    const a = arrows[i];
    if (checkArrowClearance(a, map, rows, cols).clear) {
      movables.push(a);
    }
  }
  return movables;
}

/**
 * 飞行贯穿拾取时间漏斗判定 (漏斗不阻挡射线，仅在贯穿时拾取)
 * @param {Object} arrow 发射箭头
 * @param {Array} hourglasses 当前漏斗列表 (原地修改或提取)
 * @param {number} rows 棋盘行数
 * @param {number} cols 棋盘列数
 * @returns {Array} looted 拾取到的漏斗数组
 */
export function checkFlightLoot(arrow, hourglasses, rows, cols) {
  const head = arrow.head;
  const { dr, dc } = DIRS[head.dir];
  let cr = head.r + dr;
  let cc = head.c + dc;
  const looted = [];

  while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
    const hgIdx = hourglasses.findIndex(h => h.r === cr && h.c === cc);
    if (hgIdx !== -1) {
      const hg = hourglasses.splice(hgIdx, 1)[0];
      looted.push(hg);
    }
    cr += dr;
    cc += dc;
  }

  return looted;
}
