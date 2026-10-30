<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import request from '@/api/request'
import { setToken } from '@/stores/auth'
import { resolveLoginRedirect } from '@/router'
import { rsaEncryptWithPublicKey } from '@/utils/rsa'
import { ElCard, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'

const router = useRouter()
const form = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)
const avatar = ref('')
const registerTicket = ref('')

/** 清理第三方登录/注册过程中写入的全部临时键 */
function cleanupOauthKeys() {
  const keys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k && k.startsWith('oauth_')) keys.push(k)
  }
  keys.forEach(k => sessionStorage.removeItem(k))
}

// 离开注册页即清理票据与预填资料：SPA 路由跳转（下条）+ 整页卸载（地址栏跳转/刷新/关标签）都覆盖
onBeforeRouteLeave(() => {
  cleanupOauthKeys()
})

const purgeOnUnload = (): void => {
  cleanupOauthKeys()
}

onMounted(() => {
  window.addEventListener('pagehide', purgeOnUnload)
})

onUnmounted(() => {
  window.removeEventListener('pagehide', purgeOnUnload)
})

onMounted(() => {
  const ticket = sessionStorage.getItem('oauth_register_ticket') || ''
  // 有票据走「注册并绑定第三方」；无票据走直接注册（不再跳回登录页）
  if (!ticket) return
  registerTicket.value = ticket
  try {
    const raw = sessionStorage.getItem('oauth_register_profile')
    if (raw) {
      const profile = JSON.parse(raw) as {
        nickname?: string
        email?: string
        avatar?: string
      }
      if (profile.nickname) form.nickname = profile.nickname
      if (profile.email) form.email = profile.email
      if (profile.avatar) avatar.value = profile.avatar
    }
  } catch {
    // 预填资料解析失败按空表单继续
  }
})

function validate(): boolean {
  const username = form.username.trim()
  if (!username) {
    ElMessage.warning('请输入用户名')
    return false
  }
  if (!form.password) {
    ElMessage.warning('请输入密码')
    return false
  }
  if (form.password.length < 6 || form.password.length > 32) {
    ElMessage.warning('密码长度须在 6-32 位')
    return false
  }
  if (!form.confirmPassword) {
    ElMessage.warning('请再次输入密码')
    return false
  }
  if (form.confirmPassword.length < 6 || form.confirmPassword.length > 32) {
    ElMessage.warning('确认密码长度须在 6-32 位')
    return false
  }
  if (form.password !== form.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return false
  }
  return true
}

async function onSubmit() {
  if (!validate()) return
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
    const username = form.username.trim()
    const nickname = form.nickname.trim() || undefined
    const email = form.email.trim() || undefined

    if (!registerTicket.value) {
      // 直接注册：成功后不自动登录，引导手动登录（避免验证码开启时登录接口被拦）
      await request({
        url: '/auth/register',
        method: 'post',
        data: { username, password, nickname, email }
      })
      ElMessage.success('注册成功，请登录')
      router.replace('/login')
      return
    }

    const res = (await request({
      url: '/auth/oauth/register',
      method: 'post',
      data: {
        registerTicket: registerTicket.value,
        username,
        password,
        nickname,
        email
      }
    })) as { status?: string; token?: string; username?: string } | string
    const token = typeof res === 'string' ? res : res?.token || ''
    const boundUsername = typeof res === 'string' ? username : res?.username || username
    if (!token) {
      ElMessage.error('注册未返回 Token')
      return
    }
    setToken(token, boundUsername)
    cleanupOauthKeys()
    ElMessage.success('注册成功，已绑定第三方账号')
    router.push(resolveLoginRedirect(undefined))
  } catch (e) {
    // 后端 message 为可展示中文（如「用户名已存在」）
    ElMessage.error(e instanceof Error ? e.message : '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <el-card class="register-card" shadow="never">
      <template #header>
        <div class="register-head">
          <h2>{{ registerTicket ? '注册' : '注册新账号' }}</h2>
          <p class="muted">
            {{ registerTicket ? '注册后将自动绑定刚授权的第三方账号' : '填写以下信息创建新账号' }}
          </p>
        </div>
      </template>

      <div v-if="avatar" class="register-avatar">
        <img :src="avatar" alt="" />
      </div>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="账号">
          <el-input
            v-model="form.username"
            autocomplete="username"
            placeholder="账号"
            clearable
          />
        </el-form-item>
        <el-form-item label="显示昵称">
          <el-input
            v-model="form.nickname"
            autocomplete="显示昵称"
            placeholder="昵称（可选）"
            clearable
          />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="邮箱（可选）"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            placeholder="密码（6-32 位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="再次输入密码"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="register-btn"
          native-type="submit"
          :loading="loading"
          @click="onSubmit"
        >
          {{ loading ? '注册中…' : registerTicket ? '注册并绑定' : '注册' }}
        </el-button>
      </el-form>

      <div v-if="!registerTicket" class="to-login">
        <span class="muted">已有账号？</span>
        <router-link to="/login">去登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.register-page {
  display: flex;
  justify-content: center;
  padding: 48px 16px;
}
.register-card {
  width: min(380px, 100%);
}
.register-card :deep(.el-card__body) {
  padding: 24px 28px;
}
.register-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--ink);
}
.register-head .muted {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.register-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.register-avatar img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
  background: var(--bg);
}
.register-btn {
  width: 100%;
  margin-top: 4px;
}
.to-login {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
}
.to-login .muted {
  color: var(--muted);
}
.to-login a {
  color: var(--accent);
  text-decoration: none;
}
.to-login a:hover {
  text-decoration: underline;
}
</style>
