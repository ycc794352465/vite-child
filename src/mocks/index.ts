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
console.log('✅ Mock 已启动，所有接口自动拦截')