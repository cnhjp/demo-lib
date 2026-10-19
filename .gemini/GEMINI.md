# GEMINI.md - demo-lib 项目指南

## 1. 项目概览 (Project Overview)
`demo-lib` 是一个综合性的前端特效与交互 Demo 展示库，采用 **静态页面 + AI API 服务** 的混合架构，部署于 Vercel。

- **前端展示层**：位于 `public/` 目录，通过 `index.html` 统一导航，各子目录（如 `maze`, `spotlight-effect`, `tiny-arrows`）为独立 Demo。
- **配置驱动**：首页展示内容由 `public/config.js` 中的 `demos` 数组驱动。
- **后端 API 层**：位于 `src/`，基于 TypeScript + Express 实现，主要提供 SSE (Server-Sent Events) AI 聊天能力。
- **文档沉淀层**：位于 `docs/<demo-name>/`，记录具备复杂交互、自研算法或图形渲染 Demo 的架构设计与技术文档。

## 2. 技术栈 (Tech Stack)
- **Runtime**: Node.js (via Vercel Functions)
- **Backend Framework**: Express 5.x
- **Language**: TypeScript (Source), Vanilla JS/HTML/CSS (Demos)
- **Package Manager**: pnpm
- **Deployment**: Vercel

## 3. 核心开发流程 (Core Workflows)

### 3.1 如何新增一个 Demo
1. **创建目录**：在 `public/` 下新建 Demo 文件夹（例如 `my-new-demo/`）。
2. **准备资源**：包含 `index.html`, `script.js` (或 `game.js`), `style.css` 及一张预览图（`preview.png` 或 `preview.svg`）。
3. **强制配置 `<base href>`**：在 `index.html` 的 `<head>` 中首位加入 `<base href="/my-new-demo/" />`。
4. **注册配置**：修改 `public/config.js`，在 `demos` 数组中追加新 Demo 的元数据（`link` 务必携带尾部斜杠）：
   ```javascript
   {
     title: "Demo 标题",
     description: "简短描述",
     imageUrl: "/my-new-demo/preview.png",
     link: "/my-new-demo/",
     buttonClass: "bg-xxx-500 hover:bg-xxx-600"
   }
   ```

### 3.2 如何修改 API 逻辑
- 核心逻辑位于 `src/index.ts` (入口) 和 `src/ai-chat/index.ts` (SSE 实现)。
- 修改后需通过 TypeScript 校验。

### 3.3 如何维护复杂 Demo 的开发设计文档
对于包含自研数学/拓扑算法、物理碰撞判定、多维空间渲染（如 `tiny-arrows`）等深逻辑 Demo，必须在 `docs/<demo-name>/` 目录留存对应的技术设计文档（命名为 `开发设计文档.md`）：
1. **模块职责与架构分层**：阐述数据模型、表现层与物理引擎的解耦设计。
2. **算法设计与数学证明**：详细推导核心算法（如 DAG 有向无环图、空间哈希碰撞、泊松空间排斥采样等）。
3. **仿真验证命令**：提供脱机端到端测试与质量验证的 Node.js 脚本指令。

## 4. 关键命令 (Key Commands)
- **依赖安装**: `pnpm install`
- **本地开发 (推荐)**: `vercel dev` (模拟 Vercel 环境，支持 API 路由)
- **编译检查**: `pnpm exec tsc --noEmit` (验证 TypeScript 类型)

## 5. 开发规约 (Conventions)
- **文件命名**: 静态资源文件夹使用 `kebab-case`。
- **基准路径强制规范 (`<base href>`)【必读防坑】**:
  - `public/<demo-name>/index.html` **必须**在 `<head>` 中声明 `<base href="/<demo-name>/" />`。
  - **原因**：Vercel 上访问 `https://domain.com/<demo-name>`（无尾部斜杠）时，浏览器若无 `<base href>` 会将相对路径（如 `style.css`、`game.js`、`./js/xxx.js`）错误解析至根域名，导致 404 及 MIME 校验错误（返回 HTML 触发 `Refused to apply style...`）。
  - **禁止项**：严禁在 Demo 内使用根绝对路径（如 `<link href="/style.css">`），会击穿至网站主目录。
  - **跳转规范**：`public/config.js` 中的 `link` 统一使用带尾部斜杠的目录路径（如 `link: "/<demo-name>/"`）。
- **AI 交互**: API 接口遵循标准的 SSE 协议，响应头需包含 `Content-Type: text/event-stream`。
- **禁止项**: 严禁在静态 Demo 中引入大型框架（如 React/Vue），保持 Vanilla JS / ES Modules 的轻量性。
- **文档零二进制规范**: 技术文档严格使用纯 Markdown 与 Mermaid 图表描述流程与架构，严禁将截图、录屏或 Base64 编码图片落盘提交至 `docs/` 目录中。

## 6. 验证清单 (Validation Checklist)
- [ ] Demo 的 `index.html` 是否在 `<head>` 正确声明了 `<base href="/<demo-name>/" />`？
- [ ] `public/config.js` 中的 `link` 是否以斜杠结尾（如 `link: "/<demo-name>/"`）？
- [ ] 修改 `public/config.js` 后，首页是否正确渲染新卡片？
- [ ] 在无尾部斜杠 URL 下（如 `/tiny-arrows`），样式与 JS 脚本是否均能 200 正常加载？
- [ ] 复杂算法/双维度 Demo 是否已在 `docs/<demo-name>/` 留存对应的技术设计文档？
- [ ] API 变更后，`vercel dev` 下的 `/api/ai-chat` 接口是否响应正常？
