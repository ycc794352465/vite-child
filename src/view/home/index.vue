<template>
  <div class="app-shell">
    <section class="hero">
      <div class="hero-badge">AI 工具</div>
      <h2>尹聪聪的AI工具</h2>
      <p class="hero-desc">智能助手、轻量工具与流程集成，打造更高阶的工作体验。</p>
    </section>
    <div class="chat-container">
      <div class="chat-header">
        <select v-model="selectModel" class="model-select">
          <option value="glm-4-flash">免费版(不耗额度)</option>
          <option value="glm-4v">高级4.6模型</option>
          <option value="glm-5.1">超强5.1模型</option>
        </select>

        <label class="web-search-switch">
          <span class="label-txt">联网搜索</span>
          <input v-model="useWebSearch" type="checkbox">
          <span class="slider"></span>
        </label>

        <button class="clear-btn" @click="clearChat">清空对话</button>
      </div>

      <div 
        class="chat-box" 
        ref="chatBox"
        @scroll="handleScroll"
      >
        <div :style="{ height: totalHeight + 'px' }"></div>
        <div 
          class="visible-items"
          :style="{ transform: `translateY(${offsetY}px)` }"
        >
          <div 
            class="item-wrapper"
            v-for="(msg, idx) in visibleItems"
            :key="idx"
          >
            <div 
              class="item"
              :class="msg.role === 'user' ? 'user' : 'ai'"
            >
              <span class="label">{{ msg.role === 'user' ? '你' : 'AI' }}：</span>
              <span class="content">{{ msg.content }}</span>
              <button 
                v-if="msg.role === 'assistant' && msg.content"
                class="copy-btn"
                @click="copyMsg(msg.content)"
              >
                复制
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="input-wrap">
        <textarea 
          v-model="userText" 
          placeholder="请输入消息..."
          @keydown.enter.prevent="handleKeydown"
        ></textarea>
        <button :disabled="loading" @click="debouncedSendMsg">
          {{ loading ? '思考中...' : '发送消息' }}
        </button>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, nextTick, watch, toRefs, reactive, computed } from 'vue'
import { debounce } from '@/common/utils'
import { fetchChatStream } from '@/common/request';

const state = reactive({
  userText: '',
  loading: false,
  chatList: [] as ChatMessage[],
  selectModel: 'glm-4-flash',
  useWebSearch: false
});

const { userText, loading, chatList, selectModel, useWebSearch } = toRefs(state);
const chatBox = ref<HTMLElement | null>(null)
const itemHeight = 80

const scrollTop = ref(0)
const visibleCount = ref(0)
const startIndex = ref(0)
const offsetY = ref(0)

const totalHeight = computed(() => chatList.value.length * itemHeight)
const visibleItems = computed(() => {
  return chatList.value.slice(startIndex.value, startIndex.value + visibleCount.value + 6)
})

const handleScroll = () => {
   if (!chatBox.value) return
  scrollTop.value = chatBox.value.scrollTop
  startIndex.value = Math.floor(scrollTop.value / itemHeight)
  offsetY.value = startIndex.value * itemHeight
}

const initVisibleCount = () => {
  if (chatBox.value) {
    visibleCount.value = Math.ceil(chatBox.value.clientHeight / itemHeight)
  }
}

const scrollToBottom = debounce(() => {
  nextTick(() => {
    if (chatBox.value) {
      chatBox.value.scrollTop = chatBox.value.scrollHeight
    }
  })
}, 20)

const clearChat = () => {
  chatList.value = []
  userText.value = ''
  localStorage.removeItem('chatList');
}

const copyMsg = async (content: string | Record<string, any>) => {
  try {
    await navigator.clipboard.writeText(content as string)
    alert('复制成功')
  } catch (err) {
    alert('复制失败，请手动复制')
  }
}

// 改造后的发送消息逻辑，集成真实联网
const sendMsg = async () => {
  const text = userText.value.trim()
  if (!text || loading.value) return

  chatList.value.push({ role: 'user', content: text })
  userText.value = ''
  loading.value = true
  scrollToBottom()

  try {
    const nowTime = new Date().toLocaleString('zh-CN')
    let systemPrompt = `当前北京时间：${nowTime}，请准确、简洁回答用户问题。`

    // 开启联网搜索时，先调用suxun接口获取实时信息
    
    // if (useWebSearch.value) {
    //   const searchTipIndex = chatList.value.length
    //   chatList.value.push({ role: 'assistant', content: '🔍 正在联网搜索相关信息，请稍候...' })
    //   scrollToBottom()
    //   chatList.value.splice(searchTipIndex, 1)
    // }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatList.value
    ]

    // 调用智谱流式接口（原有逻辑不变）
    const res = await fetchChatStream(selectModel.value, messages, useWebSearch.value)
    if (!res.body) {
      throw new Error('响应体为空')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let aiReply = ''

    const aiIndex = chatList.value.length
    chatList.value.push({ role: 'assistant', content: '' })
    scrollToBottom()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(Boolean)

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.replace('data: ', '')
          if (jsonStr === '[DONE]') continue

          try {
            const json = JSON.parse(jsonStr)
            const content = json.choices[0]?.delta?.content || ''
            aiReply += content
            chatList.value[aiIndex].content = aiReply
            scrollToBottom()
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    chatList.value.push({ role: 'assistant', content: '请求出错了，请稍后再试' })
    scrollToBottom()
  } finally {
    loading.value = false
  }
}

const debouncedSendMsg = debounce(sendMsg, 500);

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'Enter') {
    userText.value += '\n';
    return;
  }
  if (e.key === 'Enter' && !e.ctrlKey) {
    e.preventDefault();
    debouncedSendMsg();
  }
};

// 初始化
const initChatList = () => {
  const saved = localStorage.getItem('chatList');
  if (saved) {
    chatList.value = JSON.parse(saved);
    nextTick(() => {
      initVisibleCount();
      scrollToBottom();
    });
  }
};
initChatList();

// 保存聊天记录到本地
watch(chatList, (newVal) => {
  localStorage.setItem('chatList', JSON.stringify(newVal));
}, { deep: true });

// 初始化可视区域数量
nextTick(() => {
  initVisibleCount();
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  gap: 2rem;
  background: radial-gradient(circle at top left, rgba(96, 165, 250, 0.16), transparent 22%),
    radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.14), transparent 18%),
    linear-gradient(180deg, #020617 0%, #0b1122 100%);
}
.hero {
  width: min(100%, 960px);
  padding: 2rem 2.25rem;
  border-radius: 32px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.3);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(16px);
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top left, rgba(96, 165, 250, 0.22), transparent 28%),
    radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.14), transparent 24%);
  pointer-events: none;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.16);
  color: #dbeafe;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
}
h2 {
  margin: 0;
  color: #f8fbff;
  font-size: clamp(2rem, 3vw, 3.2rem);
  line-height: 1.05;
  letter-spacing: 0.02em;
  position: relative;
  z-index: 1;
}

.hero-desc {
  margin: 1rem 0 0;
  color: #cbd5e1;
  max-width: 760px;
  line-height: 1.8;
  font-size: 1rem;
}

.chat-container {
  width: 90%;
  max-width: 900px;
  margin: 30px auto;
  padding: 30px;
  background: rgba(15, 23, 42, 0.85);
  border-radius: 28px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
.chat-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 22px;
}
.model-select {
  min-width: 220px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.74);
  color: #e2e8f0;
  font-size: 0.98rem;
}
.model-select:focus {
  outline: none;
  border-color: rgba(96, 165, 250, 0.55);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.1);
}
.clear-btn {
  padding: 12px 22px;
  background: linear-gradient(135deg, #fb7185, #f97316);
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.clear-btn:hover {
  transform: translateY(-1px);
  opacity: 0.95;
}

/* 联网开关样式 */
.web-search-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 0.95rem;
  cursor: pointer;
  position: relative;
}
.web-search-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  background: #475569;
  border-radius: 24px;
  transition: 0.3s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}
.web-search-switch input:checked + .slider {
  background: #60a5fa;
}
.web-search-switch input:checked + .slider:before {
  transform: translateX(22px);
}

.chat-box {
  border: 1px solid rgba(148, 163, 184, 0.14);
  padding: 24px;
  min-height: 360px;
  max-height: 520px;
  margin-bottom: 22px;
  border-radius: 28px;
  overflow-y: auto;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.08);
  position: relative;
}
.visible-items {
  position: absolute;
  top: 24px;
  left: 24px;
  right: 24px;
}
.item-wrapper {
  width: 100%;
  display: flex;
  margin-bottom: 12px;
}
.item {
  display: flex;
  max-width: 84%;
  padding: 16px 20px;
  border-radius: 22px;
  line-height: 1.8;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
  word-break: break-word;
  position: relative;
}
.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  font-size: 0.7rem;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.2);
  color: #e2e8f0;
  cursor: pointer;
  display: none;
}
.item.user {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.14));
  border-color: rgba(96, 165, 250, 0.28);
  margin-left: auto;
}
.item:hover .copy-btn {
  display: block;
}
.item.ai {
  background: rgba(15, 23, 42, 0.84);
  margin-right: auto;
}
textarea {
  width: 100%;
  min-height: 100px;
  padding: 16px 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  resize: vertical;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-wrap {
  display: grid;
  gap: 14px;
}
button {
  align-self: flex-end;
  padding: 14px 26px;
  border: none;
  background: linear-gradient(135deg, #60a5fa, #0ea5e9);
  color: #fff;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease, filter 0.2s ease;
}
button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
button:disabled {
  background: rgba(96, 165, 250, 0.4);
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .chat-container {
    width: 100%;
    margin: 20px auto;
    padding: 20px;
    border-radius: 24px;
  }
  .chat-header {
    flex-direction: column;
    align-items: stretch;
  }
  .model-select,
  .clear-btn,
  .web-search-switch {
    width: 100%;
    justify-content: center;
  }
  .chat-box {
    min-height: 280px;
  }
  .copy-btn {
    display: block;
    padding: 2px 6px;
    font-size: 0.6rem;
  }
}
</style>