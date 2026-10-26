<template>
  <div class="blog-layout">
    <ReadingProgress/>
    <header class="site-header">
      <div class="container header-inner">
        <router-link to="/" class="logo">{{ siteName }}</router-link>
        <nav class="nav">
          <router-link v-for="item in mainNavItems" :key="item.key || item.path" :to="item.path || '/'">
            {{ navLabel(item) }}
          </router-link>
        </nav>
        <div class="header-actions">
          <el-input
              v-if="searchEnabled"
              v-model="searchKeyword"
              class="search-input"
              type="search"
              clearable
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="onSearch"
              @clear="onSearch"
          >
            <template #prefix>
              <el-icon>
                <Search/>
              </el-icon>
            </template>
          </el-input>

          <el-button type="primary" round class="write-btn" @click="goWrite">写文章</el-button>

          <el-popover
              placement="bottom"
              :width="140"
              trigger="hover"
              popper-class="user-popover"
              :show-arrow="false"
              :offset="8"
          >
            <template #reference>
              <button
                  type="button"
                  class="avatar-btn"
                  :title="isLoggedIn ? username || '个人中心' : '登录'"
              >
                <img v-if="isLoggedIn && avatarUrl" :src="avatarUrl" alt="avatar" class="avatar-img"/>
                <span v-else class="avatar-text">{{ avatarChar }}</span>
              </button>
            </template>
            <div class="user-menu" role="menu">
              <button type="button" class="menu-item" role="menuitem" @click="openSettings">
                设置
              </button>
              <button type="button" class="menu-item" role="menuitem" @click="goProfile">
                个人中心
              </button>
              <button v-if="isLoggedIn" type="button" class="menu-item danger" role="menuitem" @click="onLogout">
                退出登录
              </button>
              <button v-else type="button" class="menu-item" role="menuitem" @click="goLogin">
                登录
              </button>
            </div>
          </el-popover>
        </div>
      </div>
    </header>

    <main class="site-main" :class="{ 'main-article': isArticleRoute }">
      <div class="container" :class="{ 'container-article': isArticleRoute }">
        <router-view v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path"/>
          </Transition>
        </router-view>
      </div>
    </main>

    <footer v-if="!isArticleRoute" class="site-footer">
      <div class="container">{{ footerText }}</div>
    </footer>

    <SettingsPanel v-model="settingsOpen"/>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Search} from '@element-plus/icons-vue'
import ReadingProgress from '@/components/ReadingProgress.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import {useSettingsStore} from '@/stores/settings'
import {getToken, getUsername, getAvatar, setAvatar, clearToken} from '@/stores/auth'
import {ElMessage} from 'element-plus'
import type {NavSettingItem} from '@/api/blog'
import {getMyProfile} from '@/api/blog'

const route = useRoute()
const router = useRouter()
const store = useSettingsStore()
const t = (k: string) => store.t(k)
const isArticleRoute = computed(() => route.name === 'article')
const siteName = computed(() => store.siteName)
const footerText = computed(() => store.footerText)
const searchEnabled = computed(() => store.searchEnabled)
const navItems = computed(() => store.navItems)
const searchKeyword = ref('')
const settingsOpen = ref(false)

const isLoggedIn = computed(() => !!getToken())
const username = computed(() => getUsername())
const avatarUrl = computed(() => getAvatar())
const avatarChar = computed(() => {
  if (!isLoggedIn.value) return '登'
  const name = username.value || '我'
  return name.charAt(0).toUpperCase()
})

/** 左侧导航去掉「写文章」，入口改到搜索与用户区之间 */
const mainNavItems = computed(() =>
    navItems.value.filter(item => {
      const path = (item.path || '').toLowerCase()
      const key = (item.key || '').toLowerCase()
      return path !== '/write' && key !== 'write'
    })
)

function navLabel(item: NavSettingItem): string {
  if (item.label?.trim()) return item.label.trim()
  return item.key ? t(item.key) : item.path || '/'
}

function onSearch() {
  const kw = searchKeyword.value.trim()
  router.push({path: '/', query: kw ? {keyword: kw} : {}})
}

function goWrite() {
  if (!getToken()) {
    router.push('/login')
    return
  }
  router.push('/write')
}

function goUser() {
  goProfile()
}

function goProfile() {
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  router.push('/profile')
}

function goLogin() {
  router.push('/login')
}

function openSettings() {
  settingsOpen.value = true
}

onMounted(async () => {
  if (isLoggedIn.value && !avatarUrl.value) {
    try {
      const p = await getMyProfile()
      if (p.avatar) setAvatar(p.avatar)
    } catch {
      /* ignore */
    }
  }
})

function onLogout() {
  clearToken()
  ElMessage.success('已退出登录')
  router.push('/')
}
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 72px;
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  gap: 22px;
  flex: 1;
  align-items: center;
}

.nav a {
  color: var(--muted);
  font-size: 15px;
  padding: 6px 2px;
  transition: color 0.15s ease;
}

.nav a:hover {
  color: var(--ink);
}

/* 首页 href="/" 会因前缀匹配在所有页 active，故首页只认 exact */
.nav a[href='/'].router-link-exact-active {
  color: var(--accent);
  font-weight: 600;
}

/* 其余项（含 /forum 子路由）用 active */
.nav a:not([href='/']).router-link-active {
  color: var(--accent);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 200px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 20px;
  padding-left: 10px;
  box-shadow: 0 0 0 1px var(--border) inset;
  background: var(--card);
}

.write-btn {
  font-weight: 500;
}

.avatar-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  margin-left: 4px;
  flex-shrink: 0;
}

.avatar-btn:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.menu-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.menu-item.danger {
  color: #e5534b;
}

.menu-item.danger:hover {
  background: rgb(229 83 75 / 12%);
  color: #e5534b;
}

.menu-item.danger:hover {
  background: color-mix(in srgb, #d93025 12%, transparent);
  color: #d93025;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.site-main {
  min-height: calc(100vh - 72px - 56px);
  padding-top: 28px;
  padding-bottom: 40px;
}

.site-main.main-article {
  min-height: 0;
  height: calc(100vh - 72px);
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}

.container-article {
  height: 100%;
  padding-top: 12px;
  padding-bottom: 0;
}

.site-footer {
  border-top: 1px solid var(--border);
  padding: 18px 0;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 720px) {
  .header-inner {
    height: 60px;
    gap: 16px;
  }

  .logo {
    font-size: 18px;
  }

  .nav {
    gap: 12px;
  }

  .nav a {
    font-size: 13px;
  }

  .search-box input {
    width: 120px;
    height: 34px;
  }

  .write-btn {
    height: 34px;
    padding: 0 12px;
    font-size: 13px;
  }

  .avatar-btn {
    width: 34px;
    height: 34px;
    font-size: 13px;
  }
}
</style>

<style>
/* el-popover 挂 body，需全局样式（非 scoped） */
.user-popover.el-popover.el-popper {
  padding: 6px !important;
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px !important;
  box-shadow: 0 8px 24px rgba(35, 38, 43, 0.12) !important;
  color: var(--ink);
}
</style>
