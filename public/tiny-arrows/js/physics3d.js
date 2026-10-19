// ==========================================
// 3D 空间射线物理穿透与立体阻挡判定引擎 (高性能空间网格加速)
// ==========================================

import { DIRS_3D } from './constants.js';

/**
 * 构建 3D 空间体素快速查找哈希表
 * @param {Array} arrows3D 空间箭头列表
 * @returns {Map<string, Object>} 坐标字符串 -> 箭头对象引用
 */
export function buildSpatialMap3D(arrows3D) {
  const map = new Map();
  for (let i = 0; i < arrows3D.length; i++) {
    const a = arrows3D[i];
    for (let j = 0; j < a.cells.length; j++) {
      const c = a.cells[j];
      map.set(`${c.x},${c.y},${c.z}`, a);
    }
  }
  return map;
}

/**
 * 3D 空间射线投射检查立体箭头前方是否有阻挡
 * @param {Object} arrow 待发射的 3D 箭头
 * @param {Array|Map} arrowsOrMap3D 空间内所有当前 3D 箭头 或 SpatialMap
 * @param {number} sizeX X 轴尺寸
 * @param {number} sizeY Y 轴尺寸
 * @param {number} sizeZ Z 轴尺寸
 * @returns {Object} { clear: boolean, blocker?: Object }
 */
export function checkArrowClearance3D(arrow, arrowsOrMap3D, sizeX, sizeY, sizeZ) {
  const head = arrow.head;
  const { dx, dy, dz } = DIRS_3D[head.dir];

  let cx = head.x + dx;
  let cy = head.y + dy;
  let cz = head.z + dz;

  const isMap = arrowsOrMap3D instanceof Map;

  while (cx >= 0 && cx < sizeX && cy >= 0 && cy < sizeY && cz >= 0 && cz < sizeZ) {
    if (isMap) {
      const blocker = arrowsOrMap3D.get(`${cx},${cy},${cz}`);
      if (blocker && blocker.id !== arrow.id) {
        return { clear: false, blocker };
      }
    } else {
      for (let i = 0; i < arrowsOrMap3D.length; i++) {
        const other = arrowsOrMap3D[i];
        if (other.id === arrow.id) continue;
        for (let j = 0; j < other.cells.length; j++) {
          const c = other.cells[j];
          if (c.x === cx && c.y === cy && c.z === cz) {
            return { clear: false, blocker: other };
          }
        }
      }
    }
    cx += dx;
    cy += dy;
    cz += dz;
  }

  return { clear: true };
}

/**
 * 一次性高效获取所有当前 3D 可发射无阻挡的箭头 (O(N) 空间索引)
 * @param {Array} arrows3D 空间所有箭头
 * @param {number} sizeX 
 * @param {number} sizeY 
 * @param {number} sizeZ 
 * @returns {Array} 可发射 3D 箭头数组
 */
export function findMovableArrows3D(arrows3D, sizeX, sizeY, sizeZ) {
  if (!arrows3D || arrows3D.length === 0) return [];
  const map = buildSpatialMap3D(arrows3D);
  const movables = [];
  for (let i = 0; i < arrows3D.length; i++) {
    const a = arrows3D[i];
    if (checkArrowClearance3D(a, map, sizeX, sizeY, sizeZ).clear) {
      movables.push(a);
    }
  }
  return movables;
}
