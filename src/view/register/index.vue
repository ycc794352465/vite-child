<template>
  <div class="register-page">
    <div class="register-panel">
      <div class="register-brand">
        <div class="logo">V</div>
        <div>
          <h1>欢迎注册</h1>
          <p>请填写相关信息进行注册</p>
        </div>
      </div>

      <form class="register-form" @submit.prevent>
        <label>
          <span>用户名</span>
          <input type="text" placeholder="请输入用户名" autocomplete="username" v-model="username" />
        </label>

        <label>
          <span>密码</span>
          <input type="password" placeholder="请输入密码" autocomplete="current-password" v-model="password" />
        </label>
        <label>
          <span>确认密码</span>
          <input type="password" placeholder="请确认密码" autocomplete="current-password" v-model="surePassword" />
        </label>

        <button type="submit" class="submit-button" @click="register">注册</button>
      </form>

      <div class="register-footer">
        以有账号？<a href="/#/login">返回登录</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const username = ref("");
const password = ref("");
const surePassword = ref("");
const register = () => {
  console.log("register");
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  padding: 24px;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top left, rgba(64, 138, 255, 0.24), transparent 24%),
    radial-gradient(circle at bottom right, rgba(123, 48, 255, 0.18), transparent 28%),
    linear-gradient(135deg, #0f172a 0%, #111827 100%);
}

.register-panel {
  width: min(420px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18);
  padding: 36px 32px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.register-brand {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}

.logo {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 24px;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
}

.register-brand h1 {
  margin: 0;
  font-size: 1.75rem;
  color: #111827;
}

.register-brand p {
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 0.96rem;
}

.register-form {
  display: grid;
  gap: 18px;
}

.register-form label {
  display: grid;
  gap: 10px;
  color: #374151;
  font-size: 0.95rem;
}

.register-form input {
  border: 1px solid #d1d5db;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 1rem;
  background: #f9fafb;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.register-form input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
  background: #fff;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.remember input {
  width: 16px;
  height: 16px;
  accent-color: #4f46e5;
}

.forgot {
  color: #4f46e5;
  text-decoration: none;
}

.forgot:hover {
  text-decoration: underline;
}

.submit-button {
  width: 100%;
  margin-top: 6px;
  padding: 14px 18px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.18);
}

.submit-button:hover {
  transform: translateY(-1px);
  opacity: 0.98;
}

.register-footer {
  margin-top: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 0.92rem;
}

.register-footer a {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}

.register-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 460px) {
  .register-panel {
    padding: 28px 20px;
    border-radius: 20px;
  }

  .register-brand {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>