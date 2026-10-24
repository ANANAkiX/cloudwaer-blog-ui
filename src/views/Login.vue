<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/api/request'
import { setToken } from '@/stores/auth'
import { message } from '@/api/request'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  if (!form.username || !form.password) {
    message.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res = (await request({
      url: '/auth/login',
      method: 'post',
      data: {
        username: form.username,
        password: form.password,
        loginType: 'ACCESS_PASSWORD',
        scope: 'DEFAULT',
        clientId: 'blog'
      }
    })) as { token?: string; accessToken?: string } | string
    const token = typeof res === 'string' ? res : res?.token || res?.accessToken || ''
    if (!token) {
      message.error('登录未返回 Token')
      return
    }
    setToken(token, form.username.trim())
    message.success('登录成功')
    router.push('/write')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="card login-card" @submit.prevent="onSubmit">
      <h2>登录后写作</h2>
      <p class="muted">使用后台账号登录，需具备「新增文章」权限</p>
      <label>
        用户名
        <input v-model="form.username" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="form.password" type="password" autocomplete="current-password" />
      </label>
      <button type="submit" class="btn primary" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  padding: 48px 16px;
}
.login-card {
  width: min(380px, 100%);
  padding: 28px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-card h2 {
  margin: 0;
  font-size: 20px;
}
.login-card label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
}
.login-card input {
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
}
.btn {
  margin-top: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
}
.muted {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}
</style>
