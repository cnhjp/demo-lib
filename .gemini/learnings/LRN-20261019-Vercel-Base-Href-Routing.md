# LRN: Vercel 静态子目录路由下的相对资源解析与 `<base href>` 规范

## Context
在 `demo-lib`（部署于 Vercel）中新增或重构静态 Demo（如 `tiny-arrows`）。每个 Demo 位于 `public/<demo-name>/` 独立目录中。

## Failure / Problem
Vercel 部署发布后，访问 `https://demo-lib.vercel.app/<demo-name>` 发生严重报错：
1. `Refused to apply style from 'https://demo-lib.vercel.app/style.css' because its MIME type ('text/html') is not a supported stylesheet MIME type, and strict MIME checking is enabled.`
2. `GET https://demo-lib.vercel.app/game.js net::ERR_ABORTED 404 (Not Found)`
导致页面无样式白屏、逻辑完全无法运行。

## Root Cause
1. **RFC 3986 相对路径解析机制**：
   当用户或主页链接访问 `https://demo-lib.vercel.app/<demo-name>` 时，URL 末尾没有斜杠 `/`，浏览器会将 URL 的最后一个片段 `<demo-name>` 视为单个文件名，而不是目录路径。
2. 因此，HTML 中引用的相对路径 `./style.css`、`style.css`、`game.js` 或 `./js/xxx.js`，会被浏览器错误地相对于根路径 `/` 进行解析，直接向根域名请求 `/style.css` 和 `/game.js`。
3. Vercel 根目录下不存在这些文件，触发 404 并根据单页配置回退返回了根目录的 `index.html`（MIME 类型为 `text/html`），进而引发浏览器的 MIME 校验拦截和 404 脚本终止。

## Resolution
1. **强制添加 `<base href>`**：
   在所有 `public/<demo-name>/index.html` 的 `<head>` 最顶部显式添加：
   ```html
   <base href="/<demo-name>/" />
   ```
   只要配置了带有末尾斜杠的 `<base href>`，无论用户当前访问的 URL 是否带斜杠，所有相对路径（样式表、ES Modules、图片资源等）都会严格以此目录为基准，百分之百精准解析。
2. **跳转链接末尾补齐斜杠**：
   在 `public/config.js` 的 `demos` 列表中，`link` 字段统一使用带斜杠的目录路径：
   ```javascript
   link: "/<demo-name>/",
   ```

## Prevention / Rule
- **必配 Base 标签**：开发任何静态子 Demo 时，`index.html` 的 `<head>` 必须声明 `<base href="/<demo-name>/" />`。
- **严禁根绝对路径**：严禁在子 Demo 中使用以 `/` 开头的绝对路径（如 `/style.css`），否则会击穿至网站主目录。
- **发布前检查**：测试验证时，务必测试不带末尾斜杠的 URL（如 `/tiny-arrows`），确认无资源解析飘移。
