import type { IncomingMessage, ServerResponse } from 'http'

// 分片信息类型
interface ChunkInfo {
  fileHash: string
  chunkIndex: number
}

// 内存存储已上传分片（仅开发环境）
const uploadedChunkMap = new Map<string, number[]>()


/**
 * 统一处理跨域 + OPTIONS 请求
 * 返回 true 表示是 OPTIONS 预检请求，直接结束即可
 */
export function handleCors(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  // 统一设置跨域头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')

  // 如果是 OPTIONS 预检请求，直接返回 200 结束
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return true
  }

  return false
}
// ... existing code ...

/**
 * 解析 application/x-www-form-urlencoded 格式的请求体
 * 
 * @param body - 原始请求体字符串
 * @returns Record<string, string> - 解析后的键值对对象
 */
function parseUrlEncoded(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pairs = body.split('&')
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key) {
      result[decodeURIComponent(key)] = decodeURIComponent(value || '')
    }
  }
  
  return result
}

/**
 * 解析 multipart/form-data 请求体
 * 
 * @param req - HTTP请求对象
 * @returns Promise<Record<string, any>> - 解析后的表单数据
 */
function parseMultipartFormData(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    const contentType = req.headers['content-type'] || ''
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
    
    if (!boundaryMatch) {
      resolve({})
      return
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2]
    let body = ''
    
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        const result: Record<string, any> = {}
        const parts = body.split(`--${boundary}`)
        
        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const nameMatch = part.match(/name="([^"]+)"/)
            if (nameMatch) {
              const name = nameMatch[1]
              const lines = part.split('\r\n')
              const valueStartIndex = lines.findIndex(line => line === '') + 1
              if (valueStartIndex > 0 && valueStartIndex < lines.length) {
                const value = lines.slice(valueStartIndex).join('\r\n').trim()
                if (value && !value.startsWith('--')) {
                  result[name] = value
                }
              }
            }
          }
        }
        
        console.log('Parsed multipart data:', result)
        resolve(result)
      } catch (error) {
        console.error('Parse multipart error:', error)
        resolve({})
      }
    })
  })
}

/**
 * 解析 HTTP 请求体数据
 * 
 * 从 IncomingMessage 对象中读取并解析 JSON 格式的请求体数据
 * 
 * @template T - 返回数据的类型，默认为 any
 * @param req - Node.js 的 IncomingMessage 对象，包含请求信息
 * @returns Promise<T> - 解析后的请求体数据，以 Promise 形式返回
 */
function parseRequestBody<T = any>(req: IncomingMessage): Promise<T | null> {
  return new Promise((resolve) => {
    
    // 1. 先判断 Content-Type，非JSON格式直接返回 null，不解析
    console.log('headers:', req.headers);
    const contentType = req.headers['content-type'] || '';
    console.log('contentType', contentType);
    // 判断是否为 multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      parseMultipartFormData(req).then((data) => {
        resolve(data as unknown as T)
      })
      return
    }
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        console.log('Received request body:', body); // 调试日志，查看原始请求体
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const parsed = parseUrlEncoded(body)
          resolve(parsed as unknown as T)
          return
        }

        // 判断是否为 text/plain
        if (contentType.includes('text/plain')) {
          resolve({ text: body } as unknown as T)
          return
        }

        // 处理 application/json 或空 Content-Type（axios 默认）
        if (!body || body.trim() === '') {
          console.warn('Empty request body');
          resolve(null);
          return;
        }
        // 2. 用 try/catch 包裹，防止非法JSON导致崩溃
        const parsed = JSON.parse(body);
        
        resolve(parsed as T);
      } catch (err) {
        console.error('JSON parse error:', err);
        resolve(null);
      }
    })
    // 添加错误处理
    req.on('error', (err) => {
      console.error('Request body read error:', err);
      resolve(null);
    });
  })
}
/**
 * 文件分片上传中间件
 * 
 * 处理大文件的分片上传流程，支持断点续传和秒传功能。
 * 提供三个接口：
 * - POST /api/upload/check: 检查已上传的分片，用于断点续传或秒传判断
 * - POST /api/upload/chunk: 上传单个文件分片
 * - POST /api/upload/merge: 合并所有分片完成文件上传
 * 
 * @param req - HTTP请求对象，包含请求URL、方法和请求体数据
 * @param res - HTTP响应对象，用于返回JSON格式的响应结果
 * @param next - 下一个中间件函数，当请求不匹配任何上传接口时调用
 */
export function uploadChunkMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  // 跨域配置
  if (handleCors(req, res)) return

  // ------------------------------
  // 1. 检查已上传分片（断点续传 / 秒传）
  // ------------------------------
  if (req.url === '/api/upload/check' && req.method === 'POST') {
    parseRequestBody(req).then(({ fileHash }) => {
      const uploadedChunks = uploadedChunkMap.get(fileHash) || []
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        code: 0,
        uploadedChunks,
        needUpload: true
      }))
    })
    return
  }

  // ------------------------------
  // 2. 上传单个分片
  // ------------------------------
  if (req.url === '/api/upload/chunk' && req.method === 'POST') {
    parseRequestBody(req).then(({fileHash, chunkIndex}) => {
      console.log('上传分片', fileHash, chunkIndex)
      if (!uploadedChunkMap.has(fileHash)) {
        uploadedChunkMap.set(fileHash, [])
      }
      const list = uploadedChunkMap.get(fileHash)!
      if (!list.includes(chunkIndex)) {
        list.push(chunkIndex)
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 0, msg: '分片上传成功' }))
    })
    return
  }

  // ------------------------------
  // 3. 合并分片
  // ------------------------------
  if (req.url === '/api/upload/merge' && req.method === 'POST') {
    parseRequestBody(req).then(({ fileHash }) => {
      uploadedChunkMap.delete(fileHash) // 清理内存

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        code: 0,
        msg: '文件合并成功',
        url: '/mock-large-file.mp4'
      }))
    })
    return
  }

  next()
}


export function loginMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) { 
    // 跨域配置
    if (handleCors(req, res)) return
    if (req.url === '/api/login' && req.method === 'POST') {
        parseRequestBody(req).then(({ username, password }) => {
        
            console.log('username', username, 'password', password)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
                code: 0,
                msg: '登录成功',
                data: {
                    accessToken: 'testAccessToken',
                    refreshToken: 'testRefreshToken'
                }
            }))
        })
        return 
    }
    next()
}