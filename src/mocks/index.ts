import MockAdapter from 'axios-mock-adapter'
import loginData from './data/login.json' // 直接用 JSON 文件！
import axios from 'axios'

// 创建 mock 实例
const mock = new MockAdapter(axios)

// 拦截 GET /api/test 接口
mock.onPost('/api/login').reply(() => {
  return [200, { 
    code: 200, 
    message: '成功登录',
    data: loginData 
  }]
})

const passThroughList = [
  '/api/upload/check',    // 检查
  '/api/upload/chunk',    // 上传分片
  '/api/upload/merge',    // 合并
]

// 批量设置 passThrough
passThroughList.forEach(url => {
  mock.onAny(url).passThrough()
})

console.log('✅ Mock 已启动，所有接口自动拦截')