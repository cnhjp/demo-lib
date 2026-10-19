// ==========================================
// Three.js 3D 空间立体视口与交互动画管理器
// ==========================================

import { DIRS_3D } from './constants.js';

export class View3D {
  constructor(containerEl, { onArrowClick, onArrowHover, theme = 'light' } = {}) {
    this.container = containerEl;
    this.onArrowClick = onArrowClick;
    this.onArrowHover = onArrowHover;
    this.theme = theme;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animFrameId = null;

    this.hemiLight = null;
    this.ambientLight = null;
    this.dirLight1 = null;
    this.dirLight2 = null;
    this.dirLight3 = null;

    this.arrowGroups = new Map(); // arrowId -> THREE.Group
    this.spacing = 1.6; // 3D 体素间距
    this.cubeSize = 1.35; // 体素方块尺寸

    this.hoveredArrowId = null;
    this.downCoord = { x: 0, y: 0 };
    this.raycaster = null;
    this.mouse = null;

    this.init();
  }

  init() {
    const THREE = window.THREE;
    if (!THREE) {
      console.error('Three.js 未加载，无法初始化 3D 空间！');
      return;
    }

    const w = this.container.clientWidth || 600;
    const h = this.container.clientHeight || 500;

    // 1. 场景
    this.scene = new THREE.Scene();

    // 2. 透视摄像机
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 150);
    this.camera.position.set(14, 16, 20);

    // 3. WebGL 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. 空间漫游控制器 (OrbitControls)
    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 6;
      this.controls.maxDistance = 60;
      this.controls.autoRotate = false;
      this.controls.autoRotateSpeed = 3.5;
    }

    // 5. 影视棚级立体全景光照（柔和半球光 + 主光 + 天蓝侧光 + 边缘轮廓光）
    this.hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x334155, 0.85);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLight);

    this.dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    this.dirLight1.position.set(20, 32, 24);
    this.dirLight1.castShadow = true;
    this.dirLight1.shadow.mapSize.width = 1024;
    this.dirLight1.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight1);

    this.dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.45); // 侧逆光天蓝补光
    this.dirLight2.position.set(-20, -12, -18);
    this.scene.add(this.dirLight2);

    this.dirLight3 = new THREE.DirectionalLight(0xa855f7, 0.25); // 轮廓紫光
    this.dirLight3.position.set(-15, 20, -20);
    this.scene.add(this.dirLight3);

    // 6. 预创建共享高性能几何体与浮雕材质
    this.boxGeom = new THREE.BoxGeometry(this.cubeSize * 0.90, this.cubeSize * 0.90, this.cubeSize * 0.90);
    this.headGeom = this.createSculptedArrowHeadGeometry(this.cubeSize);
    this.chevronGeom = this.createChevronGeometry(this.cubeSize * 0.52);
    this.chevronMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.08,
      emissive: 0xffffff,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.95
    });

    // 初始应用主题光影与场景背景
    this.applyTheme(this.theme);

    // 7. 射线检测拾取
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();
    this.startLoop();
  }

  bindEvents() {
    this.boundResize = () => this.onResize();
    window.addEventListener('resize', this.boundResize);

    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.downCoord.x = e.clientX;
      this.downCoord.y = e.clientY;
    });

    dom.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - this.downCoord.x, e.clientY - this.downCoord.y);
      if (dist < 5) {
        // 判定为纯点击，非旋转拖拽
        this.handleClick(e);
      }
    });

    dom.addEventListener('pointermove', (e) => {
      this.handleHover(e);
    });
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      if (this.controls) this.controls.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  // 坐标转换：体素离散网格 [x, y, z] -> Three.js 世界坐标 (居中对齐)
  getVoxelWorldPos(x, y, z, sizeX, sizeY, sizeZ) {
    const S = this.spacing;
    return {
      wx: (x - (sizeX - 1) / 2) * S,
      wy: (y - (sizeY - 1) / 2) * S,
      wz: (z - (sizeZ - 1) / 2) * S
    };
  }

  // ==========================================
  // 3D 棋盘构建与体素色带网格
  // ==========================================
  renderLevel(levelData) {
    const THREE = window.THREE;
    if (!THREE) return;

    // 清理既有对象
    this.arrowGroups.forEach(g => {
      this.scene.remove(g);
      this.disposeHierarchy(g);
    });
    this.arrowGroups.clear();

    const { sizeX, sizeY, sizeZ, arrows } = levelData;
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;

    // 动态调整最佳视距
    const maxDim = Math.max(sizeX, sizeY, sizeZ);
    const camDist = maxDim * 3.4;
    this.camera.position.set(camDist * 0.7, camDist * 0.8, camDist * 0.95);
    if (this.controls) {
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }

    // 逐条装配 3D 折线箭头 Mesh
    arrows.forEach(arrow => {
      const arrowGroup = this.buildArrowMeshGroup(arrow);
      this.scene.add(arrowGroup);
      this.arrowGroups.set(arrow.id, arrowGroup);
    });
  }

  // ==========================================
  // 立体造型核心：气动全包络箭首与浮雕指示标
  // ==========================================

  // 1. 规整严密立体箭首几何体 (基底严密对齐体素方阵，尖端对称收束)
  createSculptedArrowHeadGeometry(S) {
    const THREE = window.THREE;
    const geom = new THREE.BufferGeometry();
    const positions = [];

    const h = (S * 0.90) / 2; // 与身体方块严格等宽，杜绝侧向鼓包变形
    const z1 = -S / 2;
    const z2 = 0; // 方块基底截面
    const zTip = S * 0.46; // 前凸尖端收束点

    function pushTri(p1, p2, p3) { positions.push(...p1, ...p2, ...p3); }
    function pushQuad(p1, p2, p3, p4) { pushTri(p1, p2, p3); pushTri(p1, p3, p4); }

    // 后接合方颈 (-Z)
    pushQuad([-h, -h, z1], [-h,  h, z1], [ h,  h, z1], [ h, -h, z1]);

    // 4 侧向平直柱面 (形成与身体立方体完全吻合的规整基座)
    pushQuad([-h,  h, z1], [-h,  h, z2], [ h,  h, z2], [ h,  h, z1]); // Top
    pushQuad([-h, -h, z1], [ h, -h, z1], [ h, -h, z2], [-h, -h, z2]); // Bottom
    pushQuad([ h, -h, z1], [ h,  h, z1], [ h,  h, z2], [ h, -h, z2]); // Right
    pushQuad([-h, -h, z1], [-h, -h, z2], [-h,  h, z2], [-h,  h, z1]); // Left

    // 4 尖端收束切面 (从 z2 方形基底对称汇聚至顶点 (0, 0, zTip))
    pushTri([ h,  h, z2], [-h,  h, z2], [ 0,  0, zTip]); // Top
    pushTri([-h, -h, z2], [ h, -h, z2], [ 0,  0, zTip]); // Bottom
    pushTri([ h, -h, z2], [ h,  h, z2], [ 0,  0, zTip]); // Right
    pushTri([-h,  h, z2], [-h, -h, z2], [ 0,  0, zTip]); // Left

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }

  // 2. 现代游戏级立体浮雕方向箭头 ▲
  createChevronGeometry(size = 0.58) {
    const THREE = window.THREE;
    const shape = new THREE.Shape();
    const w = size * 0.46;
    const h = size * 0.42;
    const t = size * 0.16; // 箭翼宽度
    const notch = size * 0.14; // 内凹深度

    shape.moveTo(0, h);
    shape.lineTo(w, 0);
    shape.lineTo(w - t, -t * 0.5);
    shape.lineTo(0, h - t - notch);
    shape.lineTo(-(w - t), -t * 0.5);
    shape.lineTo(-w, 0);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: false
    });
    geom.center();
    return geom;
  }

  buildArrowMeshGroup(arrow) {
    const THREE = window.THREE;
    const group = new THREE.Group();
    group.userData = { arrowId: arrow.id, arrow };

    let colorHexStr = arrow.color;
    if (colorHexStr.toLowerCase() === '#18181b') {
      colorHexStr = '#27272a';
    }
    const colorHex = parseInt(colorHexStr.replace('#', '0x'), 16);

    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.32,
      metalness: 0.08
    });

    const head = arrow.head;
    const dirInfo = DIRS_3D[head.dir];
    const dirVec = new THREE.Vector3(dirInfo.dx, dirInfo.dy, dirInfo.dz);

    // 1. 装配蛇身体素方块（带有 4 侧立体白浮雕方向指示标）
    const ALL_NORMALS = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1)
    ];
    const lateralNormals = ALL_NORMALS.filter(n => Math.abs(n.dot(dirVec)) < 0.01);

    arrow.cells.forEach(c => {
      // 头部体素单独由精雕箭冠渲染，此处仅渲染非头部身体体素
      if (c.x === head.x && c.y === head.y && c.z === head.z) return;

      const mesh = new THREE.Mesh(this.boxGeom, material);
      const { wx, wy, wz } = this.getVoxelWorldPos(c.x, c.y, c.z, this.sizeX, this.sizeY, this.sizeZ);
      mesh.position.set(wx, wy, wz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { arrowId: arrow.id };

      // 在身体体素的 4 个可见侧面上加装沿飞行方向的 3D 浮雕箭头
      lateralNormals.forEach(n => {
        const chevron = new THREE.Mesh(this.chevronGeom, this.chevronMaterial);
        const xVec = new THREE.Vector3().crossVectors(dirVec, n).normalize();
        const mat = new THREE.Matrix4();
        mat.makeBasis(xVec, dirVec, n);
        mat.setPosition(n.clone().multiplyScalar((this.cubeSize * 0.90) / 2 + 0.02));
        chevron.applyMatrix4(mat);
        chevron.userData = { arrowId: arrow.id };
        mesh.add(chevron);
      });

      group.add(mesh);
    });

    // 2. 装配一体化锐利 3D 箭冠 (Sculpted Arrow Head)
    const { wx: hx, wy: hy, wz: hz } = this.getVoxelWorldPos(head.x, head.y, head.z, this.sizeX, this.sizeY, this.sizeZ);
    const headMesh = new THREE.Mesh(this.headGeom, material);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headMesh.position.set(hx, hy, hz);

    // 箭冠根据 3D 六向正交旋转
    if (head.dir === 'right') {
      headMesh.rotateY(Math.PI / 2);
    } else if (head.dir === 'left') {
      headMesh.rotateY(-Math.PI / 2);
    } else if (head.dir === 'up') {
      headMesh.rotateX(-Math.PI / 2);
    } else if (head.dir === 'down') {
      headMesh.rotateX(Math.PI / 2);
    } else if (head.dir === 'forward') {
      // 默认指向 +Z
    } else if (head.dir === 'back') {
      headMesh.rotateY(Math.PI);
    }

    headMesh.userData = { arrowId: arrow.id };
    group.add(headMesh);

    return group;
  }

  // ==========================================
  // 鼠标拾取与悬停反馈
  // ==========================================
  handleClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData?.arrowId && target.parent) {
        target = target.parent;
      }
      if (target && target.userData?.arrowId) {
        this.onArrowClick?.(target.userData.arrowId);
      }
    }
  }

  handleHover(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let foundId = null;
    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData?.arrowId && target.parent) {
        target = target.parent;
      }
      if (target && target.userData?.arrowId) {
        foundId = target.userData.arrowId;
      }
    }

    if (foundId !== this.hoveredArrowId) {
      // 恢复旧箭头
      if (this.hoveredArrowId) {
        const oldG = this.arrowGroups.get(this.hoveredArrowId);
        if (oldG) this.setGroupEmissive(oldG, 0x000000);
      }
      // 高亮新箭头
      this.hoveredArrowId = foundId;
      if (this.hoveredArrowId) {
        const newG = this.arrowGroups.get(this.hoveredArrowId);
        if (newG) this.setGroupEmissive(newG, 0x38bdf8);
      }
    }
  }

  setGroupEmissive(group, hex) {
    const THREE = window.THREE;
    group.traverse(child => {
      if (child.isMesh && child.material && child.material !== this.chevronMaterial) {
        child.material.emissive = new THREE.Color(hex);
        child.material.emissiveIntensity = hex === 0 ? 0 : 0.45;
      }
    });
  }

  // ==========================================
  // 3D 动画系统：破空发射、阻挡震颤与时光倒流
  // ==========================================

  // 1. 破空发射飞向宇宙
  animateShootOut(arrowId, onComplete, duration = 300) {
    const group = this.arrowGroups.get(arrowId);
    if (!group) { onComplete?.(); return; }

    const arrow = group.userData.arrow;
    const dir = DIRS_3D[arrow.head.dir];
    const shootDist = 45; // 破空飞行距离

    const startPos = group.position.clone();
    const targetPos = startPos.clone().add(
      new window.THREE.Vector3(dir.dx * shootDist, dir.dy * shootDist, dir.dz * shootDist)
    );

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // 缓动曲线
      const ease = t * t * (3 - 2 * t);

      group.position.lerpVectors(startPos, targetPos, ease);
      group.scale.setScalar(1 - ease * 0.3); // 微缩远去

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        this.disposeHierarchy(group);
        this.arrowGroups.delete(arrowId);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  // 2. 时光倒流逆向从远空飞回归位
  animateRewindIn(arrow, onComplete, duration = 320) {
    const group = this.buildArrowMeshGroup(arrow);
    this.scene.add(group);
    this.arrowGroups.set(arrow.id, group);

    const dir = DIRS_3D[arrow.head.dir];
    const shootDist = 45;

    const finalPos = new window.THREE.Vector3(0, 0, 0);
    const startPos = new window.THREE.Vector3(dir.dx * shootDist, dir.dy * shootDist, dir.dz * shootDist);

    group.position.copy(startPos);
    group.scale.setScalar(0.7);

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t * t * (3 - 2 * t);

      group.position.lerpVectors(startPos, finalPos, ease);
      group.scale.setScalar(0.7 + ease * 0.3);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        group.position.copy(finalPos);
        group.scale.setScalar(1);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  // 3. 受阻高频 3D 震颤
  animateBlockedShake(arrowId) {
    const group = this.arrowGroups.get(arrowId);
    if (!group) return;

    const origPos = group.position.clone();
    const arrow = group.userData.arrow;
    const dir = DIRS_3D[arrow.head.dir];
    const startTime = performance.now();
    const duration = 220;

    const animate = (now) => {
      const elapsed = now - startTime;
      if (elapsed < duration) {
        const s = Math.sin((elapsed / duration) * Math.PI * 8) * 0.28;
        group.position.set(
          origPos.x + dir.dx * s,
          origPos.y + dir.dy * s,
          origPos.z + dir.dz * s
        );
        requestAnimationFrame(animate);
      } else {
        group.position.copy(origPos);
      }
    };
    requestAnimationFrame(animate);
  }

  // 4. 阻挡方赤红警示爆闪
  highlightBlocker(blockerArrowId) {
    const group = this.arrowGroups.get(blockerArrowId);
    if (!group) return;

    this.setGroupEmissive(group, 0xef4444);
    setTimeout(() => {
      if (group && this.hoveredArrowId !== blockerArrowId) {
        this.setGroupEmissive(group, 0x000000);
      }
    }, 900);
  }

  // 5. 单步提示聚焦
  highlightHintArrow(arrowId) {
    const group = this.arrowGroups.get(arrowId);
    if (!group) return;

    let count = 0;
    const pulse = () => {
      if (count >= 4) {
        this.setGroupEmissive(group, 0x000000);
        return;
      }
      this.setGroupEmissive(group, count % 2 === 0 ? 0x06b6d4 : 0x000000);
      count++;
      setTimeout(pulse, 200);
    };
    pulse();
  }

  // ==========================================
  // 3D 场景动态主题换肤（亮色极简陶瓷 vs 暗色科幻曜石）
  // ==========================================
  setTheme(theme = 'light') {
    this.theme = theme;
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    const THREE = window.THREE;
    if (!this.scene || !THREE) return;

    if (theme === 'dark') {
      // 暗夜星空深蓝黑曜石背景
      this.scene.background = new THREE.Color(0x0b1120);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x1e293b);
        this.hemiLight.intensity = 0.75;
      }
      if (this.ambientLight) this.ambientLight.intensity = 0.35;
      if (this.dirLight1) this.dirLight1.intensity = 0.85;
      if (this.dirLight2) {
        this.dirLight2.color.setHex(0x38bdf8);
        this.dirLight2.intensity = 0.45;
      }
      if (this.chevronMaterial) {
        this.chevronMaterial.emissiveIntensity = 0.28;
      }
    } else {
      // 现代演播厅明亮陶瓷银白背景
      this.scene.background = new THREE.Color(0xf8fafc);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0xcfd8dc);
        this.hemiLight.intensity = 0.95;
      }
      if (this.ambientLight) this.ambientLight.intensity = 0.45;
      if (this.dirLight1) this.dirLight1.intensity = 0.95;
      if (this.dirLight2) {
        this.dirLight2.color.setHex(0x93c5fd);
        this.dirLight2.intensity = 0.4;
      }
      if (this.chevronMaterial) {
        this.chevronMaterial.emissiveIntensity = 0.22;
      }
    }
  }

  // 视角跟随/环绕运镜系统
  setAutoRotate(enabled, speed = 3.5) {
    if (!this.controls) return;
    this.controls.autoRotate = !!enabled;
    this.controls.autoRotateSpeed = speed;
  }

  // 复位正交等轴透视视角
  resetCamera() {
    if (!this.controls) return;
    this.controls.autoRotate = false;
    const maxDim = Math.max(this.sizeX || 5, this.sizeY || 5, this.sizeZ || 5);
    const camDist = maxDim * 3.4;
    this.camera.position.set(camDist * 0.7, camDist * 0.8, camDist * 0.95);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  disposeHierarchy(obj) {
    obj.traverse(child => {
      if (child.geometry && child.geometry !== this.boxGeom && child.geometry !== this.headGeom && child.geometry !== this.chevronGeom) {
        child.geometry.dispose();
      }
      if (child.material && child.material !== this.chevronMaterial) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.boundResize);
    if (this.controls) this.controls.dispose();
    if (this.boxGeom) this.boxGeom.dispose();
    if (this.headGeom) this.headGeom.dispose();
    if (this.chevronGeom) this.chevronGeom.dispose();
    if (this.chevronMaterial) this.chevronMaterial.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}
