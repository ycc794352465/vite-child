<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
</script>

<template>
  <div class="app-shell">
    <section class="hero">
      <div class="hero-badge">AI 工具</div>
      <h2>尹聪聪的AI工具</h2>
      <p class="hero-desc">智能助手、轻量工具与流程集成，打造更高阶的工作体验。</p>
    </section>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  gap: 2rem;
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

.content {
  width: min(100%, 1200px);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
