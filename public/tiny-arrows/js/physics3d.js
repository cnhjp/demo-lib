// ==========================================
// 3D 空间射线物理穿透与立体阻挡判定引擎
// ==========================================

import { DIRS_3D } from './constants.js';

/**
 * 3D 空间射线投射检查立体箭头前方是否有阻挡
 * @param {Object} arrow 待发射的 3D 箭头
 * @param {Array} arrows3D 空间内所有当前 3D 箭头
 * @param {number} sizeX X 轴尺寸
 * @param {number} sizeY Y 轴尺寸
 * @param {number} sizeZ Z 轴尺寸
 * @returns {Object} { clear: boolean, blocker?: Object }
 */
export function checkArrowClearance3D(arrow, arrows3D, sizeX, sizeY, sizeZ) {
  const head = arrow.head;
  const { dx, dy, dz } = DIRS_3D[head.dir];

  let cx = head.x + dx;
  let cy = head.y + dy;
  let cz = head.z + dz;

  while (cx >= 0 && cx < sizeX && cy >= 0 && cy < sizeY && cz >= 0 && cz < sizeZ) {
    for (const other of arrows3D) {
      if (other.id === arrow.id) continue;
      const hit = other.cells.some(c => c.x === cx && c.y === cy && c.z === cz);
      if (hit) {
        return { clear: false, blocker: other };
      }
    }
    cx += dx;
    cy += dy;
    cz += dz;
  }

  return { clear: true };
}
