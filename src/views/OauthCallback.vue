<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { setToken } from '@/stores/auth'
import { resolveLoginRedirect } from '@/router'

const route = useRoute()
const router = useRouter()
const tip = ref('正在登录…')

function cleanupOauthSession() {
  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_intent')
  sessionStorage.removeItem('oauth_redirect')
  sessionStorage.removeItem('oauth_provider')
}

function pickQuery(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

onMounted(async () => {
  const error = pickQuery(route.query.error)
  const code = pickQuery(route.query.code)
  const state = pickQuery(route.query.state)
  const intent = sessionStorage.getItem('oauth_intent') || 'login'
  const providerType = sessionStorage.getItem('oauth_provider') || ''
  const savedRedirect = sessionStorage.getItem('oauth_redirect') || ''

  if (error) {
    ElMessage.error('授权被拒绝或失败')
    cleanupOauthSession()
    router.replace('/login')
    return
  }

  if (!code || !state) {
    ElMessage.error('授权回调参数缺失，请从登录页重新发起')
    cleanupOauthSession()
    router.replace('/login')
    return
  }

  const savedState = sessionStorage.getItem('oauth_state')
  if (!savedState || savedState !== state) {
    ElMessage.error('授权状态校验失败，请从登录页重新发起')
    cleanupOauthSession()
    router.replace('/login')
    return
  }

  if (!providerType) {
    ElMessage.error('授权信息不完整，请从登录页重新发起')
    cleanupOauthSession()
    router.replace(intent === 'bind' ? '/profile' : '/login')
    return
  }

  try {
    if (intent === 'bind') {
      tip.value = '正在绑定…'
      await request({
        url: '/auth/oauth/bind',
        method: 'post',
        data: { providerType, code, state }
      })
      cleanupOauthSession()
      ElMessage.success('绑定成功')
      router.replace(savedRedirect || '/profile')
      return
    }

    tip.value = '正在登录…'
    const res = (await request({
      url: '/auth/oauth/login',
      method: 'post',
      data: { providerType, code, state, clientId: 'blog' }
    })) as {
      status?: string
      token?: string
      username?: string
      registerTicket?: string
      profile?: { nickname?: string; email?: string; avatar?: string }
    } | string

    // 未绑定系统账号：携带注册票据去注册页，注册后自动绑定并登录
    if (res && typeof res === 'object' && res.status === 'NEED_REGISTER') {
      if (!res.registerTicket) {
        ElMessage.error('注册凭证缺失，请重新发起第三方登录')
        cleanupOauthSession()
        router.replace('/login')
        return
      }
      sessionStorage.setItem('oauth_register_ticket', res.registerTicket)
      sessionStorage.setItem('oauth_register_profile', JSON.stringify(res.profile || {}))
      cleanupOauthSession()
      tip.value = '正在跳转注册…'
      router.replace('/register')
      return
    }

    const token = typeof res === 'string' ? res : res?.token || ''
    const username = typeof res === 'string' ? '' : res?.username || ''
    const status = typeof res === 'string' ? 'OK' : res?.status
    if (status && status !== 'OK') {
      ElMessage.error('登录返回状态异常，请重新发起第三方登录')
      cleanupOauthSession()
      router.replace('/login')
      return
    }
    if (!token) {
      ElMessage.error('登录未返回 Token')
      cleanupOauthSession()
      router.replace('/login')
      return
    }
    setToken(token, username)
    cleanupOauthSession()
    ElMessage.success('登录成功')
    router.push(resolveLoginRedirect(savedRedirect || route.query.redirect))
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '授权处理失败')
    cleanupOauthSession()
    router.replace(intent === 'bind' ? '/profile' : '/login')
  }
})
</script>

<template>
  <div class="oauth-callback-page">
    <div class="oauth-callback-tip">{{ tip }}</div>
  </div>
</template>

<style scoped>
.oauth-callback-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  padding: 48px 16px;
}

.oauth-callback-tip {
  font-size: 15px;
  color: var(--muted);
}
</style>
