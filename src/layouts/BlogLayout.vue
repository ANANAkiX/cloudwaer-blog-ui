<template>
  <div class="blog-layout">
    <ReadingProgress />
    <header class="site-header">
      <div class="container header-inner">
        <router-link to="/" class="logo">{{ t('siteName') }}</router-link>
        <nav class="nav">
          <router-link to="/">{{ t('home') }}</router-link>
          <router-link to="/forum">{{ t('forum') }}</router-link>
          <router-link to="/archive">{{ t('archive') }}</router-link>
          <router-link to="/about">{{ t('about') }}</router-link>
          <router-link to="/write">写文章</router-link>
        </nav>
        <div class="header-actions">
          <div class="search-box" role="search">
            <input
              v-model="searchKeyword"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="onSearch"
            />
          </div>
          <button
            class="icon-btn"
            type="button"
            :title="t('settings')"
            :aria-label="t('settings')"
            @click="settingsOpen = true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09A1.7 1.7 0 0 0 21 10.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="site-main container">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="container">{{ t('footer') }}</div>
    </footer>

    <SettingsPanel v-model="settingsOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ReadingProgress from '@/components/ReadingProgress.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const store = useSettingsStore()
const t = (k: string) => store.t(k)
const searchKeyword = ref('')
const settingsOpen = ref(false)

function onSearch() {
  const kw = searchKeyword.value.trim()
  router.push({ path: '/', query: kw ? { keyword: kw } : {} })
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
  gap: 28px;
  height: 60px;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}

.nav {
  display: flex;
  gap: 20px;
  flex: 1;
}

.nav a {
  color: var(--muted);
  font-size: 14px;
}

.nav a.router-link-active {
  color: var(--accent);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box input {
  width: 180px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: var(--card);
  color: var(--ink);
  font-size: 13px;
  outline: none;
}

.search-box input::placeholder {
  color: var(--muted);
}

.icon-btn {
  width: 34px;
  height: 34px;
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
  min-height: calc(100vh - 60px - 56px);
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
  .search-box input {
    width: 120px;
  }

  .nav {
    gap: 12px;
  }
}
</style>
