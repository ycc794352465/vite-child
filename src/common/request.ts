// src/api/chat.js
import { ZP_API } from '@/common/common';


export const fetchChatStream = async (
  model: string,
  messages: ChatMessage[],
): Promise<Response> => {
  const body: ChatRequestBody = 
  {
    model,
    messages,
    stream: true,
  };

  // const res = await fetch('/bigmodel-api/chat/completions', {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {

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