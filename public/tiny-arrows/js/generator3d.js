// ==========================================
// 3D 空间立体多格体素关卡生成器 (DAG 定向互锁反推链体系)
// ==========================================

import { DIRS_3D, DIR_3D_KEYS, OPPOSITE_3D, ARROW_COLORS, SHAPES_3D, GENERATOR_CONFIG } from './constants.js';
import { findMovableArrows3D } from './physics3d.js';

// 获取指定 3D 方向的正交方向集合（在剩余 2 个维度上的 4 个方向）
function getOrthogonal3D(dirKey) {
  const info = DIRS_3D[dirKey];
  return DIR_3D_KEYS.filter(k => DIRS_3D[k].axis !== info.axis);
}

/**
 * 过程生成 3D 空间关卡数据
 * @param {Object} options { shapeKey, difficulty }
 * @returns {Object} 3D关卡生成结果
 */
export function generateLevel3D({ shapeKey = 'cube', difficulty = 'medium' } = {}) {
  const shape = SHAPES_3D[shapeKey] || SHAPES_3D.cube;
  const dims = shape.getDimensions(difficulty);
  const { sizeX, sizeY, sizeZ } = dims;

  const midX = (sizeX - 1) / 2;
  const midY = (sizeY - 1) / 2;
  const midZ = (sizeZ - 1) / 2;

  // 1. 搜集该立体形状内部所有合法体素坐标
  const allValidVoxels = [];
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        if (shape.isInside(x, y, z, sizeX, sizeY, sizeZ)) {
          const dist = Math.hypot(x - midX, y - midY, z - midZ);
          allValidVoxels.push({ x, y, z, dist });
        }
      }
    }
  }

  const totalTime = GENERATOR_CONFIG.TIME_LIMITS_3D[difficulty] || 105;

  const occupied = new Set();
  const voxelKey = (x, y, z) => `${x},${y},${z}`;
  // 严格 3D 空间坐标范围与立体形状双重校验（严防立体超界截断）
  const isVoxelValid = (x, y, z) => x >= 0 && x < sizeX && y >= 0 && y < sizeY && z >= 0 && z < sizeZ && shape.isInside(x, y, z, sizeX, sizeY, sizeZ);

  // 检查从当前体素朝 dirKey 方向发射是否有任何占用阻挡（直到立体外壁）
  const isRayClear3D = (head, dirKey) => {
    const { dx, dy, dz } = DIRS_3D[dirKey];
    let cx = head.x + dx;
    let cy = head.y + dy;
    let cz = head.z + dz;

    while (cx >= 0 && cx < sizeX && cy >= 0 && cy < sizeY && cz >= 0 && cz < sizeZ) {
      if (occupied.has(voxelKey(cx, cy, cz))) return false;
      cx += dx;
      cy += dy;
      cz += dz;
    }
    return true;
  };

  // 检查从当前体素朝 dirKey 方向发射是否能命中已有体素（用于构建闭环拦截）
  const rayHitsOccupied3D = (head, dirKey) => {
    const { dx, dy, dz } = DIRS_3D[dirKey];
    let cx = head.x + dx;
    let cy = head.y + dy;
    let cz = head.z + dz;

    while (cx >= 0 && cx < sizeX && cy >= 0 && cy < sizeY && cz >= 0 && cz < sizeZ) {
      if (occupied.has(voxelKey(cx, cy, cz))) return true;
      cx += dx;
      cy += dy;
      cz += dz;
    }
    return false;
  };

  // 验证拓扑完全可解性 (DAG 拓扑剥离检查)
  const isFullySolvable3D = (arrows) => {
    let rem = [...arrows];
    while (rem.length > 0) {
      const clear = findMovableArrows3D(rem, sizeX, sizeY, sizeZ);
      if (clear.length === 0) return false;
      rem = rem.filter(a => !clear.includes(a));
    }
    return true;
  };

  const createdArrows = [];
  let arrowId = 0;

  // 尝试在 head 处生长一条修长、具备三维立体扭转折角的体素蛇（箭尖与身体严格共线同向）
  const tryGrowStructuredArrow3D = (head, allowTurns, forceBlocked = false, minLen = 3) => {
    let candidateDirs = DIR_3D_KEYS.filter(d => {
      const opp = OPPOSITE_3D[d];
      const nx = head.x + DIRS_3D[opp].dx;
      const ny = head.y + DIRS_3D[opp].dy;
      const nz = head.z + DIRS_3D[opp].dz;
      return isVoxelValid(nx, ny, nz) && !occupied.has(voxelKey(nx, ny, nz));
    });
    if (candidateDirs.length === 0) return null;

    if (forceBlocked) {
      const blockedDirs = candidateDirs.filter(d => rayHitsOccupied3D(head, d));
      if (blockedDirs.length > 0) {
        candidateDirs = blockedDirs;
      } else {
        return null;
      }
    } else {
      const clearDirs = candidateDirs.filter(d => isRayClear3D(head, d));
      if (clearDirs.length > 0) candidateDirs = clearDirs;
    }

    const chosenDir = candidateDirs[Math.floor(Math.random() * candidateDirs.length)];
    const body = [{ x: head.x, y: head.y, z: head.z }];
    const bodySet = new Set([voxelKey(head.x, head.y, head.z)]);

    let curr = { ...head };
    let seg1Dir = OPPOSITE_3D[chosenDir];
    const seg1Target = Math.floor(Math.random() * 3) + 2; // 2 ~ 4 格长臂

    for (let s = 1; s < seg1Target; s++) {
      const nx = curr.x + DIRS_3D[seg1Dir].dx;
      const ny = curr.y + DIRS_3D[seg1Dir].dy;
      const nz = curr.z + DIRS_3D[seg1Dir].dz;
      const key = voxelKey(nx, ny, nz);

      if (nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= sizeZ || !isVoxelValid(nx, ny, nz)) break;
      if (occupied.has(key) || bodySet.has(key)) break;

      body.push({ x: nx, y: ny, z: nz });
      bodySet.add(key);
      curr = { x: nx, y: ny, z: nz };
    }

    if (body.length < 2) return null;

    // 可选 3D 转折 1 (跨轴正交转折)
    if (allowTurns >= 1 && Math.random() < 0.78) {
      const ortho1 = getOrthogonal3D(seg1Dir).sort(() => Math.random() - 0.5);
      for (const d2 of ortho1) {
        const x1 = curr.x + DIRS_3D[d2].dx;
        const y1 = curr.y + DIRS_3D[d2].dy;
        const z1 = curr.z + DIRS_3D[d2].dz;
        const k1 = voxelKey(x1, y1, z1);

        if (x1 >= 0 && x1 < sizeX && y1 >= 0 && y1 < sizeY && z1 >= 0 && z1 < sizeZ &&
            isVoxelValid(x1, y1, z1) && !occupied.has(k1) && !bodySet.has(k1)) {
          body.push({ x: x1, y: y1, z: z1 });
          bodySet.add(k1);
          curr = { x: x1, y: y1, z: z1 };

          // 延伸第 2 格
          const x2 = curr.x + DIRS_3D[d2].dx;
          const y2 = curr.y + DIRS_3D[d2].dy;
          const z2 = curr.z + DIRS_3D[d2].dz;
          const k2 = voxelKey(x2, y2, z2);

          if (x2 >= 0 && x2 < sizeX && y2 >= 0 && y2 < sizeY && z2 >= 0 && z2 < sizeZ &&
              isVoxelValid(x2, y2, z2) && !occupied.has(k2) && !bodySet.has(k2)) {
            body.push({ x: x2, y: y2, z: z2 });
            bodySet.add(k2);
            curr = { x: x2, y: y2, z: z2 };

            // 可选 3D 转折 2 (向第 3 个正交轴空间扭转，形成立体鲁班锁结构)
            if (allowTurns >= 2 && Math.random() < 0.65) {
              const ortho2 = getOrthogonal3D(d2).sort(() => Math.random() - 0.5);
              for (const d3 of ortho2) {
                const tx1 = curr.x + DIRS_3D[d3].dx;
                const ty1 = curr.y + DIRS_3D[d3].dy;
                const tz1 = curr.z + DIRS_3D[d3].dz;
                const tk1 = voxelKey(tx1, ty1, tz1);

                if (tx1 >= 0 && tx1 < sizeX && ty1 >= 0 && ty1 < sizeY && tz1 >= 0 && tz1 < sizeZ &&
                    isVoxelValid(tx1, ty1, tz1) && !occupied.has(tk1) && !bodySet.has(tk1)) {
                  body.push({ x: tx1, y: ty1, z: tz1 });
                  bodySet.add(tk1);
                  curr = { x: tx1, y: ty1, z: tz1 };

                  const tx2 = curr.x + DIRS_3D[d3].dx;
                  const ty2 = curr.y + DIRS_3D[d3].dy;
                  const tz2 = curr.z + DIRS_3D[d3].dz;
                  const tk2 = voxelKey(tx2, ty2, tz2);
                  if (tx2 >= 0 && tx2 < sizeX && ty2 >= 0 && ty2 < sizeY && tz2 >= 0 && tz2 < sizeZ &&
                      isVoxelValid(tx2, ty2, tz2) && !occupied.has(tk2) && !bodySet.has(tk2)) {
                    body.push({ x: tx2, y: ty2, z: tz2 });
                    bodySet.add(tk2);
                  }
                  break;
                }
              }
            }
          }
          break;
        }
      }
    }

    // 依阶段灵活保障长度：骨架阶段 >= 3 格，末轮微隙嵌合 >= 2 格
    if (body.length < minLen) return null;

    arrowId++;
    const cells = [...body].reverse();
    const color = ARROW_COLORS[(arrowId - 1) % ARROW_COLORS.length];
    const arrowObj = {
      id: arrowId,
      color,
      head: { x: head.x, y: head.y, z: head.z, dir: chosenDir },
      cells
    };

    cells.forEach(pt => occupied.add(voxelKey(pt.x, pt.y, pt.z)));
    createdArrows.push(arrowObj);

    // 拓扑可解性校验：一旦导致死锁立即回滚
    if (!isFullySolvable3D(createdArrows)) {
      cells.forEach(pt => occupied.delete(voxelKey(pt.x, pt.y, pt.z)));
      createdArrows.pop();
      arrowId--;
      return null;
    }

    return arrowObj;
  };

  // 外表面体素判别 (用于布设唯一的先锋开局钥匙)
  const isSurfaceVoxel = (x, y, z) => {
    for (const d of DIR_3D_KEYS) {
      const nx = x + DIRS_3D[d].dx;
      const ny = y + DIRS_3D[d].dy;
      const nz = z + DIRS_3D[d].dz;
      if (nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= sizeZ || !isVoxelValid(nx, ny, nz)) {
        return true;
      }
    }
    return false;
  };

  // Pass 1: 【外表面先锋钥匙布设】严格放置 2 ~ 3 支无阻挡发射钥匙（全盘仅有破局突破口）
  const targetKeyCount = GENERATOR_CONFIG.TARGET_KEYS[difficulty] || 3;
  const surfaceCandidates = allValidVoxels
    .filter(pt => isSurfaceVoxel(pt.x, pt.y, pt.z))
    .sort(() => Math.random() - 0.5);

  let placedKeys = 0;
  for (const pt of surfaceCandidates) {
    if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
      const a = tryGrowStructuredArrow3D(pt, 1, false, GENERATOR_CONFIG.MIN_LEN_STANDARD);
      if (a) {
        placedKeys++;
        if (placedKeys >= targetKeyCount) break;
      }
    }
  }

  // Pass 2: 【全空间深度鲁班互锁多轮压实】（消除空间镂空）
  for (let sweep = 0; sweep < GENERATOR_CONFIG.SWEEPS_PASS2; sweep++) {
    const remPass2 = allValidVoxels
      .filter(pt => !occupied.has(voxelKey(pt.x, pt.y, pt.z)))
      .sort(() => Math.random() - 0.5);
    for (const pt of remPass2) {
      if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
        tryGrowStructuredArrow3D(pt, 2, true, GENERATOR_CONFIG.MIN_LEN_STANDARD);
      }
    }
  }

  // Pass 3: 【多折角立体缝隙咬合】（递归嵌合）
  for (let sweep = 0; sweep < GENERATOR_CONFIG.SWEEPS_PASS3; sweep++) {
    const remPass3 = allValidVoxels
      .filter(pt => !occupied.has(voxelKey(pt.x, pt.y, pt.z)))
      .sort(() => Math.random() - 0.5);
    for (const pt of remPass3) {
      if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
        tryGrowStructuredArrow3D(pt, 1, true, GENERATOR_CONFIG.MIN_LEN_STANDARD);
      }
    }
  }

  // Pass 4: 【最终紧凑立体缝隙终极压实】（充盈空间，立体紧凑度跃升至 88%~92%）
  const remPass4 = allValidVoxels
    .filter(pt => !occupied.has(voxelKey(pt.x, pt.y, pt.z)))
    .sort(() => Math.random() - 0.5);
  for (const pt of remPass4) {
    if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
      tryGrowStructuredArrow3D(pt, 1, true, GENERATOR_CONFIG.MIN_LEN_MICRO_PACK);
    }
  }

  return {
    sizeX,
    sizeY,
    sizeZ,
    totalTime,
    arrows: createdArrows,
    hourglasses: []
  };
}
