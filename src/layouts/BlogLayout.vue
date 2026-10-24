<template>
  <div class="blog-layout">
    <ReadingProgress />
    <header class="site-header">
      <div class="container header-inner">
        <router-link to="/" class="logo">{{ siteName }}</router-link>
        <nav class="nav">
          <router-link v-for="item in mainNavItems" :key="item.key || item.path" :to="item.path">
            {{ navLabel(item) }}
          </router-link>
        </nav>
        <div class="header-actions">
          <div v-if="searchEnabled" class="search-box" role="search">
            <input
              v-model="searchKeyword"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="onSearch"
            />
          </div>

          <button type="button" class="write-btn" @click="goWrite">写文章</button>

          <div class="user-area">
            <div class="user-anchor">
              <button
                type="button"
                class="avatar-btn"
                :title="isLoggedIn ? username || '个人中心' : '登录'"
                @click="goUser"
              >
                <span class="avatar-text">{{ avatarChar }}</span>
              </button>
              <div class="user-menu" role="menu">
                <button type="button" class="menu-item" role="menuitem" @click="openSettings">
                  设置
                </button>
                <button type="button" class="menu-item" role="menuitem" @click="goProfile">
                  个人中心
                </button>
                <template v-if="isLoggedIn">
                  <button type="button" class="menu-item danger" role="menuitem" @click="onLogout">
                    退出登录
                  </button>
                </template>
                <template v-else>
                  <button type="button" class="menu-item" role="menuitem" @click="goLogin">
                    登录
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="site-main container">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="container">{{ footerText }}</div>
    </footer>

    <SettingsPanel v-model="settingsOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ReadingProgress from '@/components/ReadingProgress.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import { useSettingsStore } from '@/stores/settings'
import { getToken, getUsername, clearToken } from '@/stores/auth'
import { message } from '@/api/request'
import type { NavSettingItem } from '@/api/blog'

const router = useRouter()
const store = useSettingsStore()
const t = (k: string) => store.t(k)
const siteName = computed(() => store.siteName)
const footerText = computed(() => store.footerText)
const searchEnabled = computed(() => store.searchEnabled)
const navItems = computed(() => store.navItems)
const searchKeyword = ref('')
const settingsOpen = ref(false)

const isLoggedIn = computed(() => !!getToken())
const username = computed(() => getUsername())
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
  router.push({ path: '/', query: kw ? { keyword: kw } : {} })
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
  router.push('/')
}

function goLogin() {
  router.push('/login')
}

function openSettings() {
  settingsOpen.value = true
}

function onLogout() {
  clearToken()
  message.success('已退出登录')
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

.nav a.router-link-active {
  color: var(--accent);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box input {
  width: 220px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card);
  color: var(--ink);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.search-box input:focus {
  border-color: var(--accent);
}

.search-box input::placeholder {
  color: var(--muted);
}

.write-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 20px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.write-btn:hover {
  opacity: 0.9;
}

.user-area {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 40px;
  /* 扩大命中区，鼠标从头像移到下方菜单时不丢 hover */
  padding: 12px 24px 140px 24px;
  margin: -12px -24px -140px -24px;
}

/* 仅包住头像，菜单相对头像水平居中 */
.user-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
  z-index: 2;
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
  position: relative;
  z-index: 2;
}

.avatar-btn:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

/* 用户下拉：头像正下方居中（设置 / 个人中心 / 退出） */
.user-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 132px;
  padding: 6px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(35, 38, 43, 0.12);
  display: flex;
  flex-direction: column;
  gap: 2px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.12s ease;
  z-index: 30;
}

.user-area:hover .user-menu,
.user-area:focus-within .user-menu {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.menu-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.menu-item.danger {
  color: #d93025;
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

  .user-menu {
    min-width: 120px;
  }
}
</style>
