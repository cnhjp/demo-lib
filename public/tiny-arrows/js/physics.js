// ==========================================
// 射线物理穿透与阻挡判定引擎
// ==========================================

import { DIRS } from './constants.js';

/**
 * 射线投射检查箭头前方是否有阻挡
 * @param {Object} arrow 当前待发射箭头
 * @param {Array} arrows 棋盘内所有当前箭头
 * @param {number} rows 棋盘行数
 * @param {number} cols 棋盘列数
 * @returns {Object} { clear: boolean, blocker?: Object }
 */
export function checkArrowClearance(arrow, arrows, rows, cols) {
  const head = arrow.head;
  const { dr, dc } = DIRS[head.dir];

  let cr = head.r + dr;
  let cc = head.c + dc;

  while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
    for (const other of arrows) {
      if (other.id === arrow.id) continue;
      const hit = other.cells.some(c => c.r === cr && c.c === cc);
      if (hit) {
        return { clear: false, blocker: other };
      }
    }
    cr += dr;
    cc += dc;
  }

  return { clear: true };
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
