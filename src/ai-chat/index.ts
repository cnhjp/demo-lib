import { Router, Request, Response } from "express";

const router = Router();

const sendEvent = (res: Response, eventName: string, data: string) => {
    res.write(`event: ${eventName}\n`);
    // 将数据中的换行符替换，以符合SSE多行数据的格式
    const sseData = data.split('\n').map(line => `data: ${line}`).join('\n');
    res.write(`${sseData}\n\n`);
};

router.post('/chat', async (req: Request, res: Response) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    try {
        // 1. 发送思考过程
        const thinkingSteps = [
            { step: "好的，让我想想...", delay: 500 },
            { step: "正在分析你的问题...", delay: 1000 },
            { step: "正在检索相关信息库...", delay: 1500 },
            { step: "差不多了，正在组织语言...", delay: 800 }
        ];

        for (const { step, delay } of thinkingSteps) {
            sendEvent(res, 'thinking', step);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 2. 一次性发送完整答案
        const fullAnswer = "你好！这是一个由前端实现的打字机效果。\n如你所见，文字会逐个出现，并且带有一个闪烁的光标，动画效果更平滑、更稳定。\n\n这种打字机效果模拟了真实打字机的工作方式，每个字符按照一定的时间间隔依次显示在屏幕上，给用户一种正在实时输入的感觉。相比一次性显示全部文字，这种逐字显示的方式能够吸引用户的注意力，提升阅读体验，特别适用于聊天机器人、故事叙述或引导性文本等场景。\n\n在技术实现上，我们通过控制字符显示的时间和频率，结合CSS动画来实现光标的闪烁效果。前端通过JavaScript精确控制每个字符的显示时机，确保动画流畅且不卡顿。同时，我们还优化了渲染性能，即使在低端设备上也能保持良好的表现。\n\n这个效果不仅美观，还能在用户等待内容加载时提供更好的视觉反馈，减少等待的焦虑感。你可以注意到光标会持续闪烁，直到整段文字显示完毕，这进一步增强了仿真的打字机体验。";
        sendEvent(res, 'answer', fullAnswer);

    } catch (error) {
        console.error("SSE Error:", error);
        sendEvent(res, 'error', '服务器发生错误');
    } finally {
        // 3. 结束响应
        res.end();
    }
});

export default router;