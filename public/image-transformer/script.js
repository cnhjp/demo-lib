/** 仿射变换矩阵工具 */
const Matrix = {
  identity: () => [1, 0, 0, 1, 0, 0],
  multiply: (m1, m2) => {
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;
    return [
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1
    ];
  },
  rotate: (deg) => {
    const rad = deg * Math.PI / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    return [c, s, -s, c, 0, 0];
  },
  scale: (sx, sy) => [sx, 0, 0, sy, 0, 0],
  translate: (tx, ty) => [1, 0, 0, 1, tx, ty]
};

const fileInput = document.getElementById("fileInput");
const originalPreview = document.getElementById("originalPreview");
const rotatedPreview = document.getElementById("rotatedPreview");
const hiddenCanvas = document.getElementById("hiddenCanvas");
const ctx = hiddenCanvas.getContext("2d");
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const captureBtn = document.getElementById("captureBtn");
const cameraPanel = document.getElementById("cameraPanel");
const cameraTip = document.getElementById("cameraTip");
const originalCameraPreview = document.getElementById("originalCameraPreview");
const rotatedCameraPreview = document.getElementById("rotatedCameraPreview");

const actionGroup = document.getElementById("actionGroup");
const originalBox = document.getElementById("originalBox");
const rotatedBox = document.getElementById("rotatedBox");

let currentImg = null;
let state = { rotation: 0, flipH: 1, flipV: 1, zoom: 1 };
let cameraStream = null;
let sourceMode = "none";

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(n => {
  document.body.addEventListener(n, e => { e.preventDefault(); e.stopPropagation(); });
});
document.body.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e => handleFile(e.target.files[0]));
startCameraBtn.addEventListener("click", startCamera);
stopCameraBtn.addEventListener("click", stopCamera);
captureBtn.addEventListener("click", captureFromCamera);

function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  stopCamera();
  const reader = new FileReader();
  reader.onload = e => {
    loadImageSource(e.target.result);
  };
  reader.readAsDataURL(file);
}

function loadImageSource(dataUrl) {
  sourceMode = "image";
  originalPreview.style.display = "inline-block";
  rotatedPreview.style.display = "inline-block";
  originalCameraPreview.style.display = "none";
  rotatedCameraPreview.style.display = "none";
  originalPreview.src = rotatedPreview.src = dataUrl;
  originalBox.style.display = rotatedBox.style.display = "block";
  currentImg = new Image();
  currentImg.onload = () => {
    resetTransform();
    actionGroup.style.display = "flex";
  };
  currentImg.src = dataUrl;
}

window.transform = function(type, val) {
  if (sourceMode === "image" && !currentImg) return;
  if (sourceMode === "camera" && !cameraStream) return;
  if (sourceMode === "none") return;
  if (type === 'rotate') state.rotation = (state.rotation + val + 360) % 360;
  else if (type === 'flip') {
    if (val === 'H') state.flipH *= -1;
    if (val === 'V') state.flipV *= -1;
  } else if (type === 'zoom') {
    state.zoom *= val;
    state.zoom = Math.min(Math.max(state.zoom, 0.05), 20);
  }
  render();
};

window.resetTransform = function() {
  state = { rotation: 0, flipH: 1, flipV: 1, zoom: 1 };
  render();
};

function render() {
  if (sourceMode === "image") {
    if (!currentImg) return;
  } else if (sourceMode === "camera") {
    if (!cameraStream) return;
  } else {
    return;
  }

  let m = Matrix.identity();
  m = Matrix.multiply(m, Matrix.rotate(state.rotation));
  m = Matrix.multiply(m, Matrix.scale(state.flipH * state.zoom, state.flipV * state.zoom));
  const [a, b, c, d, e, f] = m;
  if (sourceMode === "image") {
    rotatedPreview.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
  } else {
    rotatedCameraPreview.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
  }
}

function syncCanvas() {
  const isV = state.rotation % 180 !== 0;
  const cw = (isV ? currentImg.height : currentImg.width) * state.zoom;
  const ch = (isV ? currentImg.width : currentImg.height) * state.zoom;
  hiddenCanvas.width = Math.max(1, cw);
  hiddenCanvas.height = Math.max(1, ch);

  let m = Matrix.translate(cw / 2, ch / 2);
  m = Matrix.multiply(m, Matrix.rotate(state.rotation));
  m = Matrix.multiply(m, Matrix.scale(state.flipH * state.zoom, state.flipV * state.zoom));
  m = Matrix.multiply(m, Matrix.translate(-currentImg.width / 2, -currentImg.height / 2));

  const [a, b, c, d, e, f] = m;
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(currentImg, 0, 0);
}

window.downloadImage = function() {
  if (sourceMode === "image") {
    if (!currentImg) return;
    syncCanvas();
  } else if (sourceMode === "camera") {
    if (!cameraStream || !rotatedCameraPreview.videoWidth || !rotatedCameraPreview.videoHeight) return;
    syncCanvasFromCamera();
  } else {
    return;
  }

  const link = document.createElement('a');
  link.download = `transform_image_${Date.now()}.png`;
  link.href = hiddenCanvas.toDataURL("image/png");
  link.click();
};

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraTip.textContent = "当前浏览器不支持摄像头功能。";
    cameraPanel.style.display = "block";
    return;
  }

  try {
    if (cameraStream) stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    sourceMode = "camera";
    currentImg = null;
    originalPreview.style.display = "none";
    rotatedPreview.style.display = "none";
    originalCameraPreview.style.display = "inline-block";
    rotatedCameraPreview.style.display = "inline-block";
    originalCameraPreview.srcObject = cameraStream;
    rotatedCameraPreview.srcObject = cameraStream;
    originalBox.style.display = rotatedBox.style.display = "block";
    actionGroup.style.display = "flex";
    await Promise.all([
      originalCameraPreview.play().catch(() => {}),
      rotatedCameraPreview.play().catch(() => {})
    ]);
    resetTransform();
    cameraPanel.style.display = "block";
    cameraTip.textContent = "摄像头已开启，处理预览为实时画面。";
  } catch (err) {
    cameraPanel.style.display = "block";
    cameraTip.textContent = `摄像头开启失败：${err.message || "请检查权限"}`;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  originalCameraPreview.srcObject = null;
  rotatedCameraPreview.srcObject = null;
  if (sourceMode === "camera") sourceMode = "none";
  cameraPanel.style.display = "none";
}

function captureFromCamera() {
  if (!cameraStream || !rotatedCameraPreview.videoWidth || !rotatedCameraPreview.videoHeight) {
    cameraTip.textContent = "摄像头尚未就绪，请稍后再试。";
    return;
  }

  hiddenCanvas.width = rotatedCameraPreview.videoWidth;
  hiddenCanvas.height = rotatedCameraPreview.videoHeight;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(rotatedCameraPreview, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
  const dataUrl = hiddenCanvas.toDataURL("image/png");

  stopCamera();
  loadImageSource(dataUrl);
}

function syncCanvasFromCamera() {
  const sw = rotatedCameraPreview.videoWidth;
  const sh = rotatedCameraPreview.videoHeight;
  const isV = state.rotation % 180 !== 0;
  const cw = (isV ? sh : sw) * state.zoom;
  const ch = (isV ? sw : sh) * state.zoom;
  hiddenCanvas.width = Math.max(1, cw);
  hiddenCanvas.height = Math.max(1, ch);

  let m = Matrix.translate(cw / 2, ch / 2);
  m = Matrix.multiply(m, Matrix.rotate(state.rotation));
  m = Matrix.multiply(m, Matrix.scale(state.flipH * state.zoom, state.flipV * state.zoom));
  m = Matrix.multiply(m, Matrix.translate(-sw / 2, -sh / 2));
  const [a, b, c, d, e, f] = m;
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(rotatedCameraPreview, 0, 0);
}

window.addEventListener("beforeunload", stopCamera);
