# Demo-Lib 全局开发与跨端适配规范文档

本文档总结并规范 `demo-lib` 仓库中所有交互式 Demo（PC 桌面端与 H5 移动端）的架构设计、响应式适配标准、手势交互规范以及自检清单，旨在确保所有项目在不同端上都具备一致且高质量的体验。

---

## 1. 基础架构与工程规范

### 1.1 目录组织与路由
- 每一个独立 Demo 位于 `public/<demo-name>/` 下，拥有完整的 `index.html`、`style.css`、`script.js` 及封面 `preview.png`。
- **必须配置 Base 标签**：为确保在独立路径和二级子路径下相对资源引用正常，必须在 `<head>` 中第一行配置：
  ```html
  <base href="/<demo-name>/" />
  ```
- **注册到总展厅**：所有新 Demo 必须在根目录 [public/config.js](file:///c:/Users/hjp/Desktop/demo-lib/public/config.js) 中登记：
  ```javascript
  {
    title: "示例标题",
    description: "一句话功能描述及特色介绍",
    imageUrl: "/<demo-name>/preview.png",
    altText: "示例预览图",
    link: "/<demo-name>/",
    buttonClass: "bg-sky-500 hover:bg-sky-600"
  }
  ```

### 1.2 展厅统一返回导航（Back Navigation）
所有 Demo 必须提供一键返回展厅主页 `/` 的快捷胶囊入口，统一风格如下：

```html
<a href="/" class="back-link" title="返回展厅">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
  <span>展厅</span>
</a>
```

**通用 CSS 规范**：
```css
.back-link {
  color: var(--muted, #94a3b8);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  background: var(--panel, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--panel-border, rgba(255, 255, 255, 0.2));
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  line-height: 1;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.back-link:hover {
  background: var(--panel-border, rgba(255, 255, 255, 0.25));
  color: var(--ink, #fff);
}
```

---

## 2. 跨端适配核心原则 (PC vs H5)

### 2.1 触控与拖拽：双事件统一机制
> [!IMPORTANT]
> **移动端触屏浏览器（iOS Safari / Android Chrome）不支持原生 HTML5 拖拽 API（`dragstart`, `dragover`, `drop`）**。

- **禁止只写 `mousedown / mousemove / mouseup`**：
  任何具备拖动、拖拽、手势控制的组件，必须同时或统一使用 Pointer Events (`pointerdown`, `pointermove`, `pointerup`)，或显式兼容 Touch Events (`touchstart`, `touchmove`, `touchend`)。
- **拖拽加备用兜底（Tap to Add / Direct Click）**：
  在调色板、贴纸箱、工具箱等场景中，移动端必须支持**轻触直接生成（Tap to Add）**，不能强制要求用户在小屏幕上做高难度的微小拖拽。
- **防止手势穿透与页面滚动冲突**：
  1. 对所有可拖动元素添加 `touch-action: none;`。
  2. 对全局或局部拖拽手势监听，必须显式传递 `{ passive: false }` 并在触发拖拽逻辑后调用 `event.preventDefault()`：
     ```javascript
     element.addEventListener('touchstart', onTouchStart, { passive: false });
     window.addEventListener('touchmove', onTouchMove, { passive: false });
     ```

### 2.2 视口高度与滚动规范
- **禁止在移动端全局滥用 `height: 100vh; overflow: hidden;`**：
  在手机端加上键盘、工具栏或内容堆叠时，`100vh` 必然会导致底部内容被截断且无法滚动查看。
- **规范的移动端页面自适应**：
  ```css
  @media (max-width: 900px) {
    html, body {
      height: auto;
      min-height: 100%;
      overflow-y: auto;
    }
    .game-container, .page-container {
      height: auto;
      min-height: 100vh;
      min-height: 100dvh;
      padding-bottom: calc(2.5rem + env(safe-area-inset-bottom));
    }
  }
  ```

### 2.3 绝对定位与不可见点击遮挡（Pointer Events 防护）
- 任何绝对居中定位的标题、遮罩、飘落粒子容器，其外框容器如果叠在按钮或交互区上方，**必须在 CSS 中添加 `pointer-events: none;`**，避免透明外框拦截底层点击事件。
- 在小屏设备上，标题文案过长时应在 `@media` 下调整定位（如移出按钮行）或缩小字号，避免视线与控件相互遮蔽。

---

## 3. UI 交互与体验设计细节

### 3.1 移动端虚拟按键（D-Pad）标准
- 游戏类项目的方向键排布严禁使用一字型长条 `[↑][←][↓][→]`，必须采用人体工学经典的**倒 T 型 / 十字键 Grid 布局**：
  ```css
  .touch-controls {
    display: grid;
    grid-template-columns: repeat(3, 58px);
    grid-template-rows: repeat(2, 52px);
    gap: 8px;
    justify-content: center;
  }
  .pad[data-m="u"] { grid-column: 2; grid-row: 1; }
  .pad[data-m="l"] { grid-column: 1; grid-row: 2; }
  .pad[data-m="d"] { grid-column: 2; grid-row: 2; }
  .pad[data-m="r"] { grid-column: 3; grid-row: 2; }
  ```
- 按键必须配置 `:active { transform: scale(0.92); }` 触觉微缩回弹，触摸尺寸不得小于 44px。

### 3.2 滚动条轻量化与去灰处理
在桌面端出现滚动面板（如操作侧边栏、历史表格）时，必须配置现代精细半透明滚动条，避免原生灰色粗滚动条破坏深色主题氛围：
```css
.scrollable-panel {
  scrollbar-width: thin;
  scrollbar-color: var(--panel-border) transparent;
}
.scrollable-panel::-webkit-scrollbar {
  width: 6px;
}
.scrollable-panel::-webkit-scrollbar-thumb {
  background-color: var(--panel-border);
  border-radius: 3px;
}
```

### 3.3 音效系统标准
- 采用 Web Audio API (`AudioContext`) 或 `Tone.js` 构建音效系统。
- 必须遵循浏览器手势激活原则（在首次用户交互 `click` 或 `keydown` 时调用 `ctx.resume()` 或 `Tone.start()`）。
- 必须提供显式的音效静音切换按钮（`🔊 音效: 开 / 关`），且持久化或记忆开关状态。

---

## 4. 自用应用敏感输入规范 (Security Constraint)

在个人自用应用中若涉及大模型 Key、密码、PIN 码等输入框，**严禁使用 HTML `type="password"`**（防止移动端系统钥匙串和浏览器密码保险箱强行唤起）：
- 统一使用 `type="text"` 搭配 CSS 黑圆点掩码：
  ```html
  <input
    type="text"
    autocomplete="off"
    autocapitalize="none"
    autocorrect="off"
    spellcheck="false"
    data-lpignore="true"
    data-1p-ignore="true"
    data-bwignore="true"
    data-form-type="other"
    style="-webkit-text-security: disc;"
  />
  ```

---

## 5. 新 Demo 交付验收清单 (Checklist)

开发或修改任何 Demo 时，发布前请逐项自查：

- [ ] **Base 路径**：`<head>` 是否包含 `<base href="/<demo-name>/" />`？
- [ ] **展厅导航**：页面是否提供直观可点击的 `[← 展厅]` 返回链接？
- [ ] **展厅注册**：`public/config.js` 是否已注册该 Demo 并配有有效 preview 封面？
- [ ] **H5 触控支持**：是否有依赖 `mousedown` / `mousemove` 而未实现 `touchstart` / `touchmove` 的手势？
- [ ] **H5 拖拽兜底**：若有拖拽功能，是否支持触屏拖拽及轻触直接添加（Tap to Add）？
- [ ] **无遮挡**：标题、漂浮层、粒子遮罩是否添加了 `pointer-events: none`？
- [ ] **无视口死锁**：在 375px 小屏手机或视口高度受限时，底部关键操作按钮能否正常滚入视线？
- [ ] **控制按键体验**：按钮触控面积是否 ≥ 42px，摇杆是否采用倒 T 型十字键且有缩放反馈？
