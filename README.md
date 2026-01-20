# demo-lib

## 项目用途
这是一个部署在 Vercel 上的 Demo 展示项目。主页读取 `public/config.js` 中的配置，渲染多个静态 Demo 入口；同时提供 `/api/ai-chat` 的 SSE 接口用于 AI 聊天示例。

## 目录结构
- `public/`：静态页面与各个 Demo 资源
- `public/index.html`：Demo 展示首页
- `public/config.js`：Demo 配置数据
- `src/index.ts`：Express 应用入口（API）
- `src/ai-chat/index.ts`：SSE 聊天接口实现

## 本地运行（Vercel）
1. 安装依赖：
   - `pnpm install`
2. 启动本地预览（需安装 Vercel CLI）：
   - `vercel dev`
3. 访问：
   - 首页：`http://localhost:3000`
   - SSE 接口：`POST http://localhost:3000/api/ai-chat/chat`

## 部署到 Vercel
1. 在 Vercel 控制台导入仓库。
2. Framework 选择 `Other`。
3. Output Directory 选择 `public`（作为静态站点入口）。
4. 如果需要 `/api/ai-chat` 接口，在 Vercel 中配置 Node Functions 并指向 `src/index.ts`（可通过添加 `vercel.json` 来完成路由与构建配置）。
