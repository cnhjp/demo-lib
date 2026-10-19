# LRN: 静态 Demo 的模块化集成经验

## Context
在 `demo-lib` 项目中集成外部全功能 Demo（如图片增强处理器）。

## Failure / Problem
原始代码为单文件 HTML 格式，包含内联 CSS 和 JS，直接写入会导致：
1. 代码冗长，难以阅读。
2. 样式与逻辑耦合，不便于后期维护。
3. 违反项目中已有的模块化（HTML/CSS/JS 分离）惯例。

## Root Cause
用户提供的代码片段通常为了演示方便而采用单文件结构，但在生产级或整理后的 Demo 库中，应遵循职责分离原则。

## Resolution
1. **结构拆分**：
   - 将 `<style>` 内容提取到 `style.css`。
   - 将 `<script>` 内容提取到 `script.js`。
   - `index.html` 仅保留 DOM 结构，并使用 `<link>` 和 `<script src="...">` 引入外部资源。
2. **全局作用域处理**：
   - 在拆分 JS 时，如果 HTML 中有内联 `onclick` 事件（如 `onclick="transform(...)"`），需要确保 JS 中的对应函数挂载到 `window` 对象上，否则会因模块化作用域导致 `undefined`。
3. **动态配置**：
   - 在 `public/config.js` 中追加对象，确保首页能够自动渲染新增的 Demo 卡片。
4. **容错处理**：
   - 遇到工具调用异常（如 API 偶发错误）时，采取分步重试策略，确保文件写入成功。

## Prevention / Rule
- **分离优先**：集成外部 Demo 时，除非极简，否则必须执行 HTML/CSS/JS 拆分。
- **显式挂载**：若 HTML 依赖 JS 函数（如 `onclick`），在 JS 中显式使用 `window.funcName = ...` 导出。
- **配置同步**：完成文件创建后，务必检查并更新项目的全局配置文件（如 `config.js`）。
