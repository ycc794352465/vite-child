import express from 'express'
import fetch from 'node-fetch'

const app = express()

// 跨域配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use(express.json())

// ✅ 100%稳定的通用搜索接口
app.post('/api/search', async (req, res) => {
  try {
    const { keyword } = req.body
    if (!keyword) return res.send('')

    console.log('正在搜索:', keyword)
    // 用 DuckDuckGo 公开接口，不爬网页、不被反爬
    const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(keyword)}&format=json&no_html=1&skip_disambig=1`)
    const data = await resp.json() as {
      AbstractText?: string
      RelatedTopics?: Array<{ Text?: string }>
    }

    let result = ''
    // 优先用摘要信息
    if (data.AbstractText) {
      result += `【摘要】\n${data.AbstractText}\n\n`
    }
    // 补充相关结果
    if (data.RelatedTopics?.length) {
      data.RelatedTopics.slice(0, 3).forEach((topic, idx) => {
        if (topic.Text) {
          result += `${idx+1}. ${topic.Text}\n`
        }
      })
    }

    // 兜底处理
    if (!result) {
      result = `当前时间：${new Date().toLocaleString()}\n未找到相关信息，请按常识回答。`
    } else {
      // 加上强制指令，让AI必须用这些信息回答
      result += `\n\n【重要指令】请严格使用以上信息回答用户问题，不要编造、不要说无法获取数据。`
    }

    res.send(result)
  } catch (err) {
    console.error('搜索失败:', err)
    res.send(`当前时间：${new Date().toLocaleString()}\n请正常回答用户问题。`)
  }
})

const PORT = 3000
app.listen(PORT, () => {
  console.log('✅ 稳定通用搜索服务已启动：http://localhost:3000')
})