<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-brand">
        <div class="logo">V</div>
        <div>
          <h1>欢迎登录</h1>
          <p>请输入账号和密码继续</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent>
        <label>
          <span>邮箱 / 用户名</span>
          <input type="text" placeholder="请输入邮箱或用户名" autocomplete="username" />
        </label>

        <label>
          <span>密码</span>
          <input type="password" placeholder="请输入密码" autocomplete="current-password" />
        </label>

        <div class="form-actions">
          <label class="remember">
            <input type="checkbox" />
            记住我
          </label>
          <a href="#" class="forgot">忘记密码?</a>
        </div>

        <button type="submit" class="submit-button">登录</button>
      </form>

      <div class="login-footer">
        没有账号？<a href="/#/register">立即注册</a>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top left, rgba(64, 138, 255, 0.24), transparent 24%),
    radial-gradient(circle at bottom right, rgba(123, 48, 255, 0.18), transparent 28%),
    linear-gradient(135deg, #0f172a 0%, #111827 100%);
}

.login-panel {
  width: min(420px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18);
  padding: 36px 32px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.login-brand {
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

.login-brand h1 {
  margin: 0;
  font-size: 1.75rem;
  color: #111827;
}

.login-brand p {
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 0.96rem;
}

.login-form {
  display: grid;
  gap: 18px;
}

.login-form label {
  display: grid;
  gap: 10px;
  color: #374151;
  font-size: 0.95rem;
}

.login-form input {
  border: 1px solid #d1d5db;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 1rem;
  background: #f9fafb;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-form input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
  background: #fff;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #6b7280;
  font-size: 0.92rem;
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

.login-footer {
  margin-top: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 0.92rem;
}

.login-footer a {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}

.login-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 460px) {
  .login-panel {
    padding: 28px 20px;
    border-radius: 20px;
  }

  .login-brand {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>