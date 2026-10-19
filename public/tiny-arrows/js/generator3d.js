// ==========================================
// 3D 空间立体多格体素关卡生成器
// ==========================================

import { DIRS_3D, DIR_3D_KEYS, OPPOSITE_3D, ARROW_COLORS, SHAPES_3D } from './constants.js';

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

  let totalTime = 130;
  if (difficulty === 'easy') totalTime = 100;
  else if (difficulty === 'medium') totalTime = 150;
  else totalTime = 200;

  const occupied = new Set();
  const voxelKey = (x, y, z) => `${x},${y},${z}`;
  const isVoxelValid = (x, y, z) => shape.isInside(x, y, z, sizeX, sizeY, sizeZ);

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

  const createdArrows = [];
  let arrowId = 0;

  // 尝试在 head 处生长一条至少 2 格、可解的 3D 折线体素蛇
  const tryGrowStructuredArrow3D = (head, allowTurns) => {
    const validDirs = DIR_3D_KEYS.filter(d => isRayClear3D(head, d));
    if (validDirs.length === 0) return null;

    const chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
    const body = [{ x: head.x, y: head.y, z: head.z }];
    const bodySet = new Set([voxelKey(head.x, head.y, head.z)]);

    let curr = { ...head };
    let seg1Dir = OPPOSITE_3D[chosenDir];
    const seg1Target = Math.floor(Math.random() * 2) + 2; // 2 ~ 3 格

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

    // 可选 3D 转折 1
    if (allowTurns >= 1 && Math.random() < 0.65) {
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

            // 可选 3D 转折 2 (立体三维台阶)
            if (allowTurns >= 2 && Math.random() < 0.5) {
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
                  break;
                }
              }
            }
          }
          break;
        }
      }
    }

    if (body.length < 2) return null;

    arrowId++;
    const cells = [...body].reverse();
    const color = ARROW_COLORS[(arrowId - 1) % ARROW_COLORS.length];

    cells.forEach(pt => occupied.add(voxelKey(pt.x, pt.y, pt.z)));

    return {
      id: arrowId,
      color,
      head: { x: head.x, y: head.y, z: head.z, dir: chosenDir },
      cells
    };
  };

  // Pass 1: 中心向外深度立体生长 (多折线长蛇)
  const centerCandidates = [...allValidVoxels].sort((a, b) => a.dist - b.dist + (Math.random() - 0.5) * 2);
  for (const pt of centerCandidates) {
    if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
      const arrow = tryGrowStructuredArrow3D(pt, 2);
      if (arrow) createdArrows.push(arrow);
    }
  }

  // Pass 2: 缝隙多向填充 (L型折角)
  const remainingPass2 = allValidVoxels.filter(pt => !occupied.has(voxelKey(pt.x, pt.y, pt.z))).sort(() => Math.random() - 0.5);
  for (const pt of remainingPass2) {
    if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
      const arrow = tryGrowStructuredArrow3D(pt, 1);
      if (arrow) createdArrows.push(arrow);
    }
  }

  // Pass 3: 边界紧凑碎块填充 (2格直线)
  const remainingPass3 = allValidVoxels.filter(pt => !occupied.has(voxelKey(pt.x, pt.y, pt.z))).sort(() => Math.random() - 0.5);
  for (const pt of remainingPass3) {
    if (!occupied.has(voxelKey(pt.x, pt.y, pt.z))) {
      const arrow = tryGrowStructuredArrow3D(pt, 0);
      if (arrow) createdArrows.push(arrow);
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
