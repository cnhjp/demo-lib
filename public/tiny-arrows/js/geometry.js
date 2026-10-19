// ==========================================
// 矢量几何与轨迹采样计算引擎
// ==========================================

import { DIRS } from './constants.js';

/**
 * 构建高精正交折线箭头几何规范
 * @param {Object} arrow 箭头数据模型
 * @param {number} S 单元格像素尺寸
 */
export function buildArrowSvgGeometry(arrow, S) {
  const head = arrow.head;
  const { dr, dc } = DIRS[head.dir];

  // 纤巧色带宽度：收紧至单元格的 38%
  const shaftW = S * 0.38;

  const hx = head.c * S + S / 2;
  const hy = head.r * S + S / 2;

  // 锐利双翼三角形头部几何规范
  const tipX = hx + dc * (S * 0.44);
  const tipY = hy + dr * (S * 0.44);

  const headLength = S * 0.45;
  const baseX = tipX - dc * headLength;
  const baseY = tipY - dr * headLength;

  const halfBase = S * 0.36;
  const wing1X = baseX - dr * halfBase;
  const wing1Y = baseY + dc * halfBase;
  const wing2X = baseX + dr * halfBase;
  const wing2Y = baseY - dc * halfBase;

  const headPoints = `${tipX.toFixed(1)},${tipY.toFixed(1)} ${wing1X.toFixed(1)},${wing1Y.toFixed(1)} ${wing2X.toFixed(1)},${wing2Y.toFixed(1)}`;

  // 正交折线节点：完整包含每一个身体格子中心！
  const bodyPoints = [];
  for (let i = 0; i < arrow.cells.length; i++) {
    const pt = arrow.cells[i];
    bodyPoints.push({
      x: pt.c * S + S / 2,
      y: pt.r * S + S / 2
    });
  }

  // 从头部格子中心直插至底边中心（纯正交直线）
  bodyPoints.push({ x: baseX, y: baseY });

  const pointsStr = bodyPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return {
    shaftPointsStr: pointsStr,
    shaftPointsArray: bodyPoints,
    shaftWidth: shaftW,
    headPointsStr: headPoints,
    headGeometry: { tipX, tipY, wing1X, wing1Y, wing2X, wing2Y, baseX, baseY }
  };
}

/**
 * 构建全屏破框飞行与倒流的绝对物理坐标采样轨迹
 */
export function buildFlightTrack(arrow, S, boardRect, svgWidth, svgHeight) {
  const head = arrow.head;
  const { dr, dc } = DIRS[head.dir];
  const scaleX = boardRect.width / (svgWidth || 1);
  const scaleY = boardRect.height / (svgHeight || 1);

  const geom = arrow.geometry || buildArrowSvgGeometry(arrow, S);

  const track = [];
  geom.shaftPointsArray.forEach(pt => {
    track.push({
      x: boardRect.left + pt.x * scaleX,
      y: boardRect.top + pt.y * scaleY
    });
  });

  const shootDist = Math.max(window.innerWidth, window.innerHeight) * 1.35;
  const lastPt = track[track.length - 1];
  track.push({
    x: lastPt.x + dc * shootDist,
    y: lastPt.y + dr * shootDist
  });

  const dists = [0];
  for (let i = 1; i < track.length; i++) {
    const d = Math.hypot(track[i].x - track[i - 1].x, track[i].y - track[i - 1].y);
    dists.push(dists[i - 1] + d);
  }
  const totalTrackLen = dists[dists.length - 1];
  const initialBodyLen = dists[dists.length - 2];

  return {
    track,
    dists,
    totalTrackLen,
    initialBodyLen,
    shootDist,
    scaleX,
    scaleY,
    geom
  };
}

/**
 * 沿轨迹距离区间进行高频采样并提取头部正交姿态
 */
export function sampleTrack(track, dists, totalTrackLen, startDist, endDist) {
  const getPt = (targetD) => {
    if (targetD <= 0) {
      return { x: track[0].x, y: track[0].y, seg: 0, dirX: track[1].x - track[0].x, dirY: track[1].y - track[0].y };
    }
    if (targetD >= totalTrackLen) {
      const l = track.length - 1;
      return { x: track[l].x, y: track[l].y, seg: l - 1, dirX: track[l].x - track[l - 1].x, dirY: track[l].y - track[l - 1].y };
    }
    for (let i = 1; i < dists.length; i++) {
      if (targetD <= dists[i]) {
        const segL = dists[i] - dists[i - 1];
        const t = (targetD - dists[i - 1]) / segL;
        return {
          x: track[i - 1].x + (track[i].x - track[i - 1].x) * t,
          y: track[i - 1].y + (track[i].y - track[i - 1].y) * t,
          seg: i - 1,
          dirX: track[i].x - track[i - 1].x,
          dirY: track[i].y - track[i - 1].y
        };
      }
    }
  };

  const pStart = getPt(startDist);
  const pEnd = getPt(endDist);

  const pts = [{ x: pStart.x, y: pStart.y }];
  for (let i = pStart.seg + 1; i <= pEnd.seg; i++) {
    pts.push({ x: track[i].x, y: track[i].y });
  }
  pts.push({ x: pEnd.x, y: pEnd.y });

  const dirLen = Math.hypot(pEnd.dirX, pEnd.dirY) || 1;
  return {
    pts,
    headPt: pEnd,
    normDir: { x: pEnd.dirX / dirLen, y: pEnd.dirY / dirLen }
  };
}
