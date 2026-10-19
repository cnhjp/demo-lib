// ==========================================
// 结构化多格折线关卡生成器
// ==========================================

import { DIRS, OPPOSITE, ARROW_COLORS, SHAPES } from './constants.js';
import { findMovableArrows } from './physics.js';

const DIR_KEYS = ['up', 'down', 'left', 'right'];

function getOpposite(d) {
  return OPPOSITE[d];
}

function getOrthogonal(d) {
  if (d === 'up' || d === 'down') return ['left', 'right'];
  return ['up', 'down'];
}

/**
 * 过程生成关卡数据
 * @param {Object} options { shapeKey, difficulty }
 * @returns {Object} 关卡生成结果
 */
export function generateLevel({ shapeKey = 'rect', difficulty = 'medium' } = {}) {
  const shape = SHAPES[shapeKey] || SHAPES.rect;
  const dims = shape.getDimensions(difficulty);
  const rows = dims.rows;
  const cols = dims.cols;

  const midR = (rows - 1) / 2;
  const midC = (cols - 1) / 2;

  const allValidCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape.isInside(r, c, rows, cols)) {
        const dist = Math.hypot(r - midR, c - midC);
        allValidCells.push({ r, c, dist });
      }
    }
  }

  let totalTime = 130;
  if (difficulty === 'easy') {
    totalTime = 90;
  } else if (difficulty === 'medium') {
    totalTime = 130;
  } else {
    totalTime = 180;
  }

  const occupied = new Set();
  const isCellValid = (r, c) => shape.isInside(r, c, rows, cols);
  const createdArrows = [];
  let arrowId = 0;

  const isRayClear = (head, dir) => {
    const { dr, dc } = DIRS[dir];
    let cr = head.r + dr;
    let cc = head.c + dc;
    while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
      if (occupied.has(`${cr},${cc}`)) return false;
      cr += dr;
      cc += dc;
    }
    return true;
  };

  // 核心：大跨度折角生成（段跨度 ≥ 2，确保折角舒展明显）
  const tryGrowStructuredArrow = (head, allowTurns) => {
    const validDirs = DIR_KEYS.filter(d => isRayClear(head, d));
    if (validDirs.length === 0) return null;

    const chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
    const body = [{ r: head.r, c: head.c }];
    const bodySet = new Set([`${head.r},${head.c}`]);

    let currCell = head;
    let seg1Dir = getOpposite(chosenDir);
    // 第一段：至少走 2~3 格（形成明显的长臂）
    const seg1Target = Math.floor(Math.random() * 2) + 2;

    for (let s = 1; s < seg1Target; s++) {
      const nr = currCell.r + DIRS[seg1Dir].dr;
      const nc = currCell.c + DIRS[seg1Dir].dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !isCellValid(nr, nc)) break;
      if (occupied.has(`${nr},${nc}`) || bodySet.has(`${nr},${nc}`)) break;

      body.push({ r: nr, c: nc });
      bodySet.add(`${nr},${nc}`);
      currCell = { r: nr, c: nc };
    }

    if (body.length < 2) return null;

    // 可选转折 1：至少转折走 2 格（构成清晰大方的 L 型）
    if (allowTurns >= 1 && Math.random() < 0.68) {
      const ortho1 = getOrthogonal(seg1Dir).sort(() => Math.random() - 0.5);
      for (const d2 of ortho1) {
        const r1 = currCell.r + DIRS[d2].dr;
        const c1 = currCell.c + DIRS[d2].dc;
        const r2 = r1 + DIRS[d2].dr;
        const c2 = c1 + DIRS[d2].dc;
        const k1 = `${r1},${c1}`;
        const k2 = `${r2},${c2}`;

        if (r1 >= 0 && r1 < rows && c1 >= 0 && c1 < cols && isCellValid(r1, c1) && !occupied.has(k1) && !bodySet.has(k1)) {
          body.push({ r: r1, c: c1 });
          bodySet.add(k1);
          currCell = { r: r1, c: c1 };

          // 成功延伸第 2 格
          if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols && isCellValid(r2, c2) && !occupied.has(k2) && !bodySet.has(k2)) {
            body.push({ r: r2, c: c2 });
            bodySet.add(k2);
            currCell = { r: r2, c: c2 };

            // 可选转折 2：至少再走 2 格（构成明显的 Z型台阶 或 U型回环）
            if (allowTurns >= 2 && Math.random() < 0.52) {
              const ortho2 = getOrthogonal(d2).sort(() => Math.random() - 0.5);
              for (const d3 of ortho2) {
                const tr1 = currCell.r + DIRS[d3].dr;
                const tc1 = currCell.c + DIRS[d3].dc;
                const tr2 = tr1 + DIRS[d3].dr;
                const tc2 = tc1 + DIRS[d3].dc;
                const tk1 = `${tr1},${tc1}`;
                const tk2 = `${tr2},${tc2}`;

                if (tr1 >= 0 && tr1 < rows && tc1 >= 0 && tc1 < cols && isCellValid(tr1, tc1) && !occupied.has(tk1) && !bodySet.has(tk1)) {
                  body.push({ r: tr1, c: tc1 });
                  bodySet.add(tk1);
                  currCell = { r: tr1, c: tc1 };
                  if (tr2 >= 0 && tr2 < rows && tc2 >= 0 && tc2 < cols && isCellValid(tr2, tc2) && !occupied.has(tk2) && !bodySet.has(tk2)) {
                    body.push({ r: tr2, c: tc2 });
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

    if (body.length < 2) return null;

    arrowId++;
    const cells = [...body].reverse();
    const color = ARROW_COLORS[(arrowId - 1) % ARROW_COLORS.length];

    cells.forEach(pt => occupied.add(`${pt.r},${pt.c}`));
    return {
      id: arrowId,
      color: color,
      head: { r: head.r, c: head.c, dir: chosenDir },
      cells: cells
    };
  };

  // Pass 1: 【中心向外深层生长】（多折线大跨度）
  const centerCandidates = [...allValidCells].sort((a, b) => a.dist - b.dist + (Math.random() - 0.5) * 4);
  for (const pt of centerCandidates) {
    if (!occupied.has(`${pt.r},${pt.c}`)) {
      const arrow = tryGrowStructuredArrow(pt, 2);
      if (arrow) createdArrows.push(arrow);
    }
  }

  // Pass 2: 【缝隙插播填充】（单折L型与直线）
  const remainingPass2 = allValidCells.filter(pt => !occupied.has(`${pt.r},${pt.c}`)).sort(() => Math.random() - 0.5);
  for (const pt of remainingPass2) {
    if (!occupied.has(`${pt.r},${pt.c}`)) {
      const arrow = tryGrowStructuredArrow(pt, 1);
      if (arrow) createdArrows.push(arrow);
    }
  }

  // Pass 3: 【微隙碎块紧密咬合】（短直线）
  const remainingPass3 = allValidCells.filter(pt => !occupied.has(`${pt.r},${pt.c}`)).sort(() => Math.random() - 0.5);
  for (const pt of remainingPass3) {
    if (!occupied.has(`${pt.r},${pt.c}`)) {
      const arrow = tryGrowStructuredArrow(pt, 0);
      if (arrow) createdArrows.push(arrow);
    }
  }

  // Pass 4: 【最终缝隙补漏填充】（尽最大努力填满空白格）
  const remainingPass4 = allValidCells.filter(pt => !occupied.has(`${pt.r},${pt.c}`)).sort(() => Math.random() - 0.5);
  for (const pt of remainingPass4) {
    if (!occupied.has(`${pt.r},${pt.c}`)) {
      const arrow = tryGrowStructuredArrow(pt, 0);
      if (arrow) createdArrows.push(arrow);
    }
  }

  // Pass 5: 【精致时间漏斗布设】（确保 100% 处于至少一支箭头的发射贯穿路径上）
  let targetHourglassCount = 2;
  if (difficulty === 'medium') targetHourglassCount = 3;
  else if (difficulty === 'hard') targetHourglassCount = 4;

  // 1. 分析开局直接可出射的无阻挡箭头，将其直接飞越路径计入“开局直吃黑名单”
  const initiallyMovable = findMovableArrows(createdArrows, rows, cols);
  const immediateFlightSet = new Set();
  const initiallyMovableIds = new Set(initiallyMovable.map(a => a.id));

  for (const arrow of initiallyMovable) {
    const head = arrow.head;
    const { dr, dc } = DIRS[head.dir];
    let cr = head.r + dr;
    let cc = head.c + dc;
    while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
      immediateFlightSet.add(`${cr},${cc}`);
      cr += dr;
      cc += dc;
    }
  }

  // 2. 统计受阻深层箭头（深度 >= 1）的前方出射轨迹网格与贯穿频次
  const blockedFlightMap = new Map();
  for (const arrow of createdArrows) {
    if (initiallyMovableIds.has(arrow.id)) continue;
    const head = arrow.head;
    const { dr, dc } = DIRS[head.dir];
    let cr = head.r + dr;
    let cc = head.c + dc;
    while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
      const key = `${cr},${cc}`;
      blockedFlightMap.set(key, (blockedFlightMap.get(key) || 0) + 1);
      cr += dr;
      cc += dc;
    }
  }

  // 3. 候选池：属于有效形状内 + 未被初始箭头占用 + 绝不开局直吃 + 处于受阻箭头解锁路线上
  let candidateCells = allValidCells
    .filter(pt => {
      const key = `${pt.r},${pt.c}`;
      return !occupied.has(key) && !immediateFlightSet.has(key) && blockedFlightMap.has(key);
    })
    .map(pt => {
      const key = `${pt.r},${pt.c}`;
      return {
        r: pt.r,
        c: pt.c,
        hits: blockedFlightMap.get(key) || 1
      };
    });

  // 安全保底：若因极端紧凑导致严格候选点不足，放宽开局直吃限制以确保漏斗数量达成
  if (candidateCells.length < targetHourglassCount) {
    candidateCells = allValidCells
      .filter(pt => {
        const key = `${pt.r},${pt.c}`;
        return !occupied.has(key) && blockedFlightMap.has(key);
      })
      .map(pt => {
        const key = `${pt.r},${pt.c}`;
        return {
          r: pt.r,
          c: pt.c,
          hits: blockedFlightMap.get(key) || 1
        };
      });
  }

  // 4. 排序策略：加权多重射线重叠点与适度随机散布
  candidateCells.sort((a, b) => (b.hits - a.hits) * 2 + (Math.random() - 0.5) * 4);

  // 4. 空间排斥采样：强制漏斗间距 ≥ 3.5 格欧氏距离，彻底杜绝相邻连在一起
  const hourglassList = [];
  const PRIMARY_MIN_DIST = 3.5;
  const FALLBACK_MIN_DIST = 2.0; // 紧凑棋盘二级保底（仍严格大于 1.414，绝不相邻紧挨）

  for (const pt of candidateCells) {
    if (hourglassList.length >= targetHourglassCount) break;
    const tooClose = hourglassList.some(h => Math.hypot(h.r - pt.r, h.c - pt.c) < PRIMARY_MIN_DIST);
    if (!tooClose) {
      hourglassList.push({ id: hourglassList.length + 1, r: pt.r, c: pt.c });
    }
  }

  // 极端紧凑异形棋盘二级保底补充
  if (hourglassList.length < targetHourglassCount) {
    for (const pt of candidateCells) {
      if (hourglassList.length >= targetHourglassCount) break;
      const alreadyPicked = hourglassList.some(h => h.r === pt.r && h.c === pt.c);
      if (alreadyPicked) continue;
      const tooClose = hourglassList.some(h => Math.hypot(h.r - pt.r, h.c - pt.c) < FALLBACK_MIN_DIST);
      if (!tooClose) {
        hourglassList.push({ id: hourglassList.length + 1, r: pt.r, c: pt.c });
      }
    }
  }

  return {
    rows,
    cols,
    totalTime,
    arrows: createdArrows,
    hourglasses: hourglassList
  };
}
