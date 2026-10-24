<template>
  <div v-if="open" class="settings-overlay" @click.self="open = false">
    <aside class="settings-panel card" role="dialog" :aria-label="t('settings')">
      <header class="panel-head">
        <h3>{{ t('settings') }}</h3>
        <button class="close-btn" type="button" @click="open = false" :title="t('close')">✕</button>
      </header>

      <section class="section">
        <h4>{{ t('theme') }}</h4>
        <div class="seg">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            type="button"
            :class="{ active: store.settings.theme === opt.value }"
            @click="store.patch({ theme: opt.value })"
          >
            {{ t(opt.label) }}
          </button>
        </div>
      </section>

      <section class="section">
        <h4>{{ t('fontSize') }}</h4>
        <div class="seg">
          <button
            v-for="opt in fontOptions"
            :key="opt.value"
            type="button"
            :class="{ active: store.settings.fontSize === opt.value }"
            @click="store.patch({ fontSize: opt.value })"
          >
            {{ t(opt.label) }}
          </button>
        </div>
      </section>

      <section class="section">
        <h4>{{ t('layout') }}</h4>
        <div class="seg">
          <button
            v-for="opt in layoutOptions"
            :key="opt.value"
            type="button"
            :class="{ active: store.settings.layout === opt.value }"
            @click="store.patch({ layout: opt.value })"
          >
            {{ t(opt.label) }}
          </button>
        </div>
      </section>

      <section class="section">
        <h4>{{ t('language') }}</h4>
        <div class="seg">
          <button
            type="button"
            :class="{ active: store.settings.locale === 'zh-CN' }"
            @click="store.patch({ locale: 'zh-CN' })"
          >
            中文
          </button>
          <button
            type="button"
            :class="{ active: store.settings.locale === 'en-US' }"
            @click="store.patch({ locale: 'en-US' })"
          >
            English
          </button>
        </div>
      </section>

      <footer class="panel-foot">
        <button class="reset-btn" type="button" @click="store.reset()">{{ t('reset') }}</button>
      </footer>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  useSettingsStore,
  type ThemeMode,
  type FontSizeMode,
  type LayoutMode
} from '@/stores/settings'

const store = useSettingsStore()
const open = defineModel<boolean>({ default: false })

const t = (k: string) => store.t(k)

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'themeLight' },
  { value: 'dark', label: 'themeDark' },
  { value: 'system', label: 'themeSystem' }
]

const fontOptions: { value: FontSizeMode; label: string }[] = [
  { value: 'sm', label: 'fontSm' },
  { value: 'md', label: 'fontMd' },
  { value: 'lg', label: 'fontLg' }
]

const layoutOptions: { value: LayoutMode; label: string }[] = [
  { value: 'comfortable', label: 'layoutComfortable' },
  { value: 'compact', label: 'layoutCompact' },
  { value: 'wide', label: 'layoutWide' }
]
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 18, 28, 0.35);
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: min(320px, 92vw);
  height: 100%;
  border-radius: 0;
  border-right: none;
  border-top: none;
  border-bottom: none;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  animation: slide-in 0.18s ease;
}

@keyframes slide-in {
  from {
    transform: translateX(16px);
    opacity: 0.6;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-head h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.close-btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.section h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.seg {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seg button {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--ink);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 500;
}

.panel-foot {
  margin-top: auto;
}

.reset-btn {
  width: 100%;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--muted);
  border-radius: 8px;
  padding: 8px;
  font-size: 13px;
  cursor: pointer;
}

.reset-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
</style>
