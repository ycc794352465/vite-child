// src/api/chat.js
import { ZP_API } from '@/common/common';
import server from './baseAxios';
import apiUrl from '@/common/apUrl';

const baseUrl = import.meta.env.VITE_API_BASE_URL

/**
 * 发起流式聊天请求
 * 
 * @param model - 使用的模型名称
 * @param messages - 聊天消息历史数组
 * @param useWebSearch - 是否启用网络搜索功能
 * @returns 返回 fetch 的 Response 对象，包含流式响应数据
 */
export const fetchChatStream = async (
  model: string,
  messages: ChatMessage[],
  useWebSearch: boolean
): Promise<Response> => {
  const body: ChatRequestBody = 
  {
    model,
    messages,
    stream: true
  };
  if(useWebSearch) {
    body.tools = [{ type: "web_search", web_search: { enable: true } }]
  }
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZP_API}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res;
};

// 联网搜索工具

export const useNetSearch = async (keyword: string): Promise<string> => {
  // try {
  //   const res = await fetch(`https://serpapi.com/search?q=${encodeURIComponent(keyword)}&api_key=你的API_KEY&engine=baidu`);
  //   const data = await res.json();
  //   const results = data.organic_results?.slice(0, 3).map((item: any) => item.snippet) || [];
  //   return results.join('\n\n');
  // } catch (e) {
  //   console.error('搜索失败:', e);
  //   return '';
  // }
  try {
    const res = await fetch("http://localhost:3000/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyword }),
    });
    return await res.text();
  } catch (err) {
    console.log("搜索失败", err);
    return "";
  }
}

// ... existing code ...
/**
 * 用户登录请求函数
 * @param username - 用户名
 * @param password - 密码
 * @returns 无返回值，通过控制台输出登录结果或错误信息
 */
export const loginHttp = async(loginData: { username: string; password: string }) => {
  try {
    const res = await server.post(apiUrl.loginUrl, loginData);
    return res.data;
  } catch (err) {
    throw err;
  }
}

export const chunkFileUpload = async(formData:FormData, signal:AbortSignal, callback:(progressEvent: any) => void) =>{
  try {
    const res = await server.post(apiUrl.chunkUploadUrl, formData,{
      signal: signal,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => callback(progressEvent),
    });
    console.log(res.data,'chunkUpload')
    return res;
  } catch (err) {
    throw err;
  }
}

export const chunkMergeRequest = async(trunkData:ChunkMergeData) => {
  try {
    const res = await server.post(apiUrl.chunkMergeUrl, trunkData)
   return res;
  } catch (err) {
    throw err;
  }
   
}
// ... existing code ...