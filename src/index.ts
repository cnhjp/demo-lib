import express from 'express'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import aiChatRouter from './ai-chat/index.js'

// 获取当前模块的目录名
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// 设置静态资源目录
app.use(express.static(join(__dirname, '..', 'public')))

// 使用API路由模块
app.use('/api/ai-chat', aiChatRouter)

export default app