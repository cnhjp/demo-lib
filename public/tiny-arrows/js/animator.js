// ==========================================
// 破框穿梭发射与时光倒流动画引擎
// ==========================================

import { buildFlightTrack, sampleTrack } from './geometry.js';

/**
 * 正向破框蛇形滑行发射动画
 */
export function animateSlitherFlowOut({
  arrow,
  flightOverlayEl,
  cellSize,
  boardRect,
  svgWidth,
  svgHeight,
  durationOverride = 300,
  onComplete
}) {
  const g = arrow.groupEl;
  if (!g) {
    onComplete?.();
    return;
  }

  const {
    track,
    dists,
    totalTrackLen,
    initialBodyLen,
    shootDist,
    scaleX,
    geom
  } = buildFlightTrack(arrow, cellSize, boardRect, svgWidth, svgHeight);

  // 原生节点立即隐藏，由飞行图层接管
  g.style.visibility = 'hidden';

  const flySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  flySvg.style.position = 'fixed';
  flySvg.style.inset = '0';
  flySvg.style.width = '100vw';
  flySvg.style.height = '100vh';
  flySvg.style.pointerEvents = 'none';
  flySvg.style.zIndex = '9999';
  flySvg.style.overflow = 'visible';

  const movingBody = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  movingBody.setAttribute('fill', 'none');
  movingBody.setAttribute('stroke', arrow.color);
  movingBody.setAttribute('stroke-width', geom.shaftWidth * scaleX);
  movingBody.setAttribute('stroke-linecap', 'round');
  movingBody.setAttribute('stroke-linejoin', 'round');

  const movingHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  movingHead.setAttribute('fill', arrow.color);
  movingHead.setAttribute('stroke-linejoin', 'round');

  flySvg.appendChild(movingBody);
  flySvg.appendChild(movingHead);
  flightOverlayEl.appendChild(flySvg);

  const duration = durationOverride || 300;
  const startTime = performance.now();

  const animateFrame = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const easeProgress = t * t * (3 - 2 * t);

    const advanceDistance = easeProgress * shootDist;
    const headDist = initialBodyLen + advanceDistance;
    const tailDist = advanceDistance;

    const sampled = sampleTrack(track, dists, totalTrackLen, tailDist, headDist);

    const bodyPtsStr = sampled.pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    movingBody.setAttribute('points', bodyPtsStr);

    const hx = sampled.headPt.x;
    const hy = sampled.headPt.y;
    const hDirX = sampled.normDir.x;
    const hDirY = sampled.normDir.y;

    const headL = cellSize * 0.45 * scaleX;
    const halfBase = cellSize * 0.36 * scaleX;

    const tipX = hx + hDirX * headL;
    const tipY = hy + hDirY * headL;
    const wing1X = hx - hDirY * halfBase;
    const wing1Y = hy + hDirX * halfBase;
    const wing2X = hx + hDirY * halfBase;
    const wing2Y = hy - hDirX * halfBase;

    movingHead.setAttribute('points', `${tipX.toFixed(1)},${tipY.toFixed(1)} ${wing1X.toFixed(1)},${wing1Y.toFixed(1)} ${wing2X.toFixed(1)},${wing2Y.toFixed(1)}`);

    if (t < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      flySvg.remove();
      g.remove();
      onComplete?.();
    }
  };

  requestAnimationFrame(animateFrame);
}

/**
 * 逆向蛇形折线时光倒流飞回归槽动画
 */
export function animateSlitherRewindIn({
  arrow,
  flightOverlayEl,
  cellSize,
  boardRect,
  svgWidth,
  svgHeight,
  durationOverride = 320,
  onComplete
}) {
  const {
    track,
    dists,
    totalTrackLen,
    initialBodyLen,
    shootDist,
    scaleX,
    geom
  } = buildFlightTrack(arrow, cellSize, boardRect, svgWidth, svgHeight);

  const flySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  flySvg.style.position = 'fixed';
  flySvg.style.inset = '0';
  flySvg.style.width = '100vw';
  flySvg.style.height = '100vh';
  flySvg.style.pointerEvents = 'none';
  flySvg.style.zIndex = '9999';
  flySvg.style.overflow = 'visible';

  const movingBody = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  movingBody.setAttribute('fill', 'none');
  movingBody.setAttribute('stroke', arrow.color);
  movingBody.setAttribute('stroke-width', geom.shaftWidth * scaleX);
  movingBody.setAttribute('stroke-linecap', 'round');
  movingBody.setAttribute('stroke-linejoin', 'round');

  const movingHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  movingHead.setAttribute('fill', arrow.color);
  movingHead.setAttribute('stroke-linejoin', 'round');

  flySvg.appendChild(movingBody);
  flySvg.appendChild(movingHead);
  flightOverlayEl.appendChild(flySvg);

  const duration = durationOverride || 320;
  const startTime = performance.now();

  const animateFrame = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    // 缓动倒放曲线
    const easeProgress = t * t * (3 - 2 * t);
    // 距离从 shootDist 倒退缩减至 0
    const advanceDistance = (1 - easeProgress) * shootDist;

    const headDist = initialBodyLen + advanceDistance;
    const tailDist = advanceDistance;

    const sampled = sampleTrack(track, dists, totalTrackLen, tailDist, headDist);

    const bodyPtsStr = sampled.pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    movingBody.setAttribute('points', bodyPtsStr);

    const hx = sampled.headPt.x;
    const hy = sampled.headPt.y;
    const hDirX = sampled.normDir.x;
    const hDirY = sampled.normDir.y;

    const headL = cellSize * 0.45 * scaleX;
    const halfBase = cellSize * 0.36 * scaleX;

    const tipX = hx + hDirX * headL;
    const tipY = hy + hDirY * headL;
    const wing1X = hx - hDirY * halfBase;
    const wing1Y = hy + hDirX * halfBase;
    const wing2X = hx + hDirY * halfBase;
    const wing2Y = hy - hDirX * halfBase;

    movingHead.setAttribute('points', `${tipX.toFixed(1)},${tipY.toFixed(1)} ${wing1X.toFixed(1)},${wing1Y.toFixed(1)} ${wing2X.toFixed(1)},${wing2Y.toFixed(1)}`);

    if (t < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      flySvg.remove();
      onComplete?.();
    }
  };

  requestAnimationFrame(animateFrame);
}
