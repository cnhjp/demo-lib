// ==========================================
// 结构化多格折线关卡生成器 (DAG定向互锁与多轮致密填充)
// ==========================================

import { DIRS, OPPOSITE, ARROW_COLORS, SHAPES, GENERATOR_CONFIG } from './constants.js';
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

  const totalTime = GENERATOR_CONFIG.TIME_LIMITS_2D[difficulty] || 85;

  const occupied = new Set();
  // 严格坐标范围与形状轮廓双重校验（严防外溢截断）
  const isCellValid = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && shape.isInside(r, c, rows, cols);
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

  const rayHitsOccupied = (head, dir) => {
    const { dr, dc } = DIRS[dir];
    let cr = head.r + dr;
    let cc = head.c + dc;
    while (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
      if (occupied.has(`${cr},${cc}`)) return true;
      cr += dr;
      cc += dc;
    }
    return false;
  };

  const isFullySolvable = (arrows) => {
    let rem = [...arrows];
    while (rem.length > 0) {
      const clear = findMovableArrows(rem, rows, cols);
      if (clear.length === 0) return false;
      rem = rem.filter(a => !clear.includes(a));
    }
    return true;
  };

  // 核心：大跨度多折角 DAG 生成（段跨度 2~5 格，形态舒展大方，箭首与身体严格共线同向）
  const tryGrowStructuredArrow = (head, allowTurns, forceBlocked = false, minLen = 3) => {
    let candidateDirs = DIR_KEYS.filter(d => {
      const opp = getOpposite(d);
      const nr = head.r + DIRS[opp].dr;
      const nc = head.c + DIRS[opp].dc;
      return isCellValid(nr, nc) && !occupied.has(`${nr},${nc}`);
    });
    if (candidateDirs.length === 0) return null;

    if (forceBlocked) {
      const blockedDirs = candidateDirs.filter(d => rayHitsOccupied(head, d));
      if (blockedDirs.length > 0) {
        candidateDirs = blockedDirs;
      } else {
        return null;
      }
    } else {
      const clearDirs = candidateDirs.filter(d => isRayClear(head, d));
      if (clearDirs.length > 0) candidateDirs = clearDirs;
    }

    const chosenDir = candidateDirs[Math.floor(Math.random() * candidateDirs.length)];
    const body = [{ r: head.r, c: head.c }];
    const bodySet = new Set([`${head.r},${head.c}`]);

    let currCell = head;
    let seg1Dir = getOpposite(chosenDir);
    const seg1Target = Math.floor(Math.random() * 4) + 2; // 2 ~ 5 格首臂长蛇

    for (let s = 1; s < seg1Target; s++) {
      const nr = currCell.r + DIRS[seg1Dir].dr;
      const nc = currCell.c + DIRS[seg1Dir].dc;
      if (!isCellValid(nr, nc) || occupied.has(`${nr},${nc}`) || bodySet.has(`${nr},${nc}`)) break;

      body.push({ r: nr, c: nc });
      bodySet.add(`${nr},${nc}`);
      currCell = { r: nr, c: nc };
    }

    if (body.length < 2) return null;

    // 可选转折 1：高概率形成 L 型或拐角（大跨度 2~4 格延伸）
    if (allowTurns >= 1 && Math.random() < 0.88) {
      const ortho1 = getOrthogonal(seg1Dir).sort(() => Math.random() - 0.5);
      for (const d2 of ortho1) {
        const seg2Target = Math.floor(Math.random() * 3) + 2;
        let grew2 = 0;
        let c2 = currCell;
        for (let s2 = 0; s2 < seg2Target; s2++) {
          const r1 = c2.r + DIRS[d2].dr;
          const c1 = c2.c + DIRS[d2].dc;
          const k1 = `${r1},${c1}`;
          if (!isCellValid(r1, c1) || occupied.has(k1) || bodySet.has(k1)) break;
          body.push({ r: r1, c: c1 });
          bodySet.add(k1);
          c2 = { r: r1, c: c1 };
          grew2++;
        }
        if (grew2 > 0) {
          currCell = c2;
          // 可选转折 2：更高概率构成复杂 Z型台阶、U型回环或 S型蛇折
          if (allowTurns >= 2 && Math.random() < 0.72) {
            const ortho2 = getOrthogonal(d2).sort(() => Math.random() - 0.5);
            for (const d3 of ortho2) {
              const seg3Target = Math.floor(Math.random() * 3) + 2;
              let c3 = currCell;
              for (let s3 = 0; s3 < seg3Target; s3++) {
                const tr1 = c3.r + DIRS[d3].dr;
                const tc1 = c3.c + DIRS[d3].dc;
                const tk1 = `${tr1},${tc1}`;
                if (!isCellValid(tr1, tc1) || occupied.has(tk1) || bodySet.has(tk1)) break;
                body.push({ r: tr1, c: tc1 });
                bodySet.add(tk1);
                c3 = { r: tr1, c: tc1 };
              }
              break;
            }
          }
          break;
        }
      }
    }

    if (body.length < minLen) return null;

    arrowId++;
    const cells = [...body].reverse();
    const color = ARROW_COLORS[(arrowId - 1) % ARROW_COLORS.length];
    const arrowObj = {
      id: arrowId,
      color,
      head: { r: head.r, c: head.c, dir: chosenDir },
      cells
    };

    cells.forEach(pt => occupied.add(`${pt.r},${pt.c}`));
    createdArrows.push(arrowObj);

    if (!isFullySolvable(createdArrows)) {
      cells.forEach(pt => occupied.delete(`${pt.r},${pt.c}`));
      createdArrows.pop();
      arrowId--;
      return null;
    }

    return arrowObj;
  };

  const isPerimeterCell = (r, c) => {
    for (const d of DIR_KEYS) {
      const nr = r + DIRS[d].dr;
      const nc = c + DIRS[d].dc;
      if (!isCellValid(nr, nc)) return true;
    }
    return false;
  };

  // Pass 1: 【先锋钥匙布设】严格在外围边界布设 2 ~ 3 支无阻挡发射钥匙（全盘唯一破局口，全形状通用）
  const targetKeyCount = GENERATOR_CONFIG.TARGET_KEYS[difficulty] || 3;
  const perimeterCells = allValidCells
    .filter(pt => isPerimeterCell(pt.r, pt.c))
    .sort(() => Math.random() - 0.5);

  let placedKeys = 0;
  for (const pt of perimeterCells) {
    if (!occupied.has(`${pt.r},${pt.c}`)) {
      const a = tryGrowStructuredArrow(pt, 1, false, GENERATOR_CONFIG.MIN_LEN_STANDARD);
      if (a) {
        placedKeys++;
        if (placedKeys >= targetKeyCount) break;
      }
    }
  }

  // Pass 2: 【全盘深层互锁长蛇多轮压实】（多轮循环扫描，消除盲区大块空白）
  for (let sweep = 0; sweep < GENERATOR_CONFIG.SWEEPS_PASS2; sweep++) {
    const remPass2 = allValidCells
      .filter(pt => !occupied.has(`${pt.r},${pt.c}`))
      .sort(() => Math.random() - 0.5);
    for (const pt of remPass2) {
      if (!occupied.has(`${pt.r},${pt.c}`)) {
        tryGrowStructuredArrow(pt, 2, true, GENERATOR_CONFIG.MIN_LEN_STANDARD);
      }
    }
  }

  // Pass 3: 【多折角缝隙高密度咬合】（递归嵌合）
  for (let sweep = 0; sweep < GENERATOR_CONFIG.SWEEPS_PASS3; sweep++) {
    const remPass3 = allValidCells
      .filter(pt => !occupied.has(`${pt.r},${pt.c}`))
      .sort(() => Math.random() - 0.5);
    for (const pt of remPass3) {
      if (!occupied.has(`${pt.r},${pt.c}`)) {
        tryGrowStructuredArrow(pt, 1, true, GENERATOR_CONFIG.MIN_LEN_STANDARD);
      }
    }
  }

  // Pass 4: 【最终紧凑缝隙终极压实】（消除突兀空白，填满率稳定在 88%~92%）
  const remPass4 = allValidCells
    .filter(pt => !occupied.has(`${pt.r},${pt.c}`))
    .sort(() => Math.random() - 0.5);
  for (const pt of remPass4) {
    if (!occupied.has(`${pt.r},${pt.c}`)) {
      tryGrowStructuredArrow(pt, 1, true, GENERATOR_CONFIG.MIN_LEN_MICRO_PACK);
    }
  }

  // Pass 5: 【精致时间漏斗布设】（确保 100% 处于至少一支深层箭头的发射贯穿路径上）
  const targetHourglassCount = GENERATOR_CONFIG.HOURGLASS_TARGETS[difficulty] || 3;

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
