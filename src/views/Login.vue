<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/api/request'
import { setToken } from '@/stores/auth'
import { resolveLoginRedirect } from '@/router'
import { rsaEncryptWithPublicKey } from '@/utils/rsa'
import { ElCard, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const form = reactive({ username: '', password: '' })
const loading = ref(false)

/** 是否带了回跳目标（用于副标题文案） */
const hasRedirect = !!route.query.redirect

async function onSubmit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    // 密码传输加密启用时用公钥加密（未启用原样发送）
    let password = form.password
    try {
      const pub = (await request({ url: '/auth/public-settings', method: 'get' })) as {
        passwordTransport?: { enabled?: boolean; publicKey?: string }
      }
      if (pub?.passwordTransport?.enabled) {
        if (!pub.passwordTransport.publicKey) {
          ElMessage.error('服务器密码加密配置不完整，请联系管理员')
          return
        }
        password = rsaEncryptWithPublicKey(form.password, pub.passwordTransport.publicKey)
      }
    } catch {
      // 公开配置拉取失败按明文发送（后端未启用加密时行为一致）
    }
    const res = (await request({
      url: '/auth/login',
      method: 'post',
      data: {
        username: form.username,
        password,
        loginType: 'ACCESS_PASSWORD',
        scope: 'DEFAULT',
        clientId: 'blog'
      }
    })) as { token?: string; accessToken?: string } | string
    const token = typeof res === 'string' ? res : res?.token || res?.accessToken || ''
    if (!token) {
      ElMessage.error('登录未返回 Token')
      return
    }
    setToken(token, form.username.trim())
    ElMessage.success('登录成功')
    // 有来源页回来源页，否则回首页
    router.push(resolveLoginRedirect(route.query.redirect))
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card" shadow="never">
      <template #header>
        <div class="login-head">
          <h2>{{ hasRedirect ? '登录后继续' : '登录' }}</h2>
          <p class="muted">{{ hasRedirect ? '' : '使用后台账号登录' }}</p>
        </div>
      </template>
      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            autocomplete="username"
            placeholder="用户名"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="密码"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="login-btn"
          native-type="submit"
          :loading="loading"
          @click="onSubmit"
        >
          {{ loading ? '登录中…' : '登录' }}
        </el-button>
      </el-form>
    </el-card>
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
}
.login-card :deep(.el-card__body) {
  padding: 24px 28px;
}
.login-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--ink);
}
.login-head .muted {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.login-btn {
  width: 100%;
  margin-top: 4px;
}
</style>
