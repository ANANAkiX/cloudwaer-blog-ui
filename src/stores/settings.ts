import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'
export type FontSizeMode = 'sm' | 'md' | 'lg'
export type LayoutMode = 'comfortable' | 'compact' | 'wide'
export type LocaleMode = 'zh-CN' | 'en-US'

export interface AppSettings {
  theme: ThemeMode
  fontSize: FontSizeMode
  layout: LayoutMode
  locale: LocaleMode
}

const STORAGE_KEY = 'cloudwaer-blog-settings'

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 'md',
  layout: 'comfortable',
  locale: 'zh-CN'
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      theme: parsed.theme ?? defaultSettings.theme,
      fontSize: parsed.fontSize ?? defaultSettings.fontSize,
      layout: parsed.layout ?? defaultSettings.layout,
      locale: parsed.locale ?? defaultSettings.locale
    }
  } catch {
    return { ...defaultSettings }
  }
}

/** UI 文案（布局/设置面板用；正文内容仍由后端提供） */
const dict: Record<LocaleMode, Record<string, string>> = {
  'zh-CN': {
    siteName: '云记博客',
    home: '首页',
    forum: '微论坛',
    archive: '归档',
    about: '关于',
    searchPlaceholder: '搜索文章…',
    settings: '设置',
    appearance: '外观',
    theme: '主题',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '跟随系统',
    fontSize: '字号',
    fontSm: '小',
    fontMd: '标准',
    fontLg: '大',
    layout: '布局',
    layoutComfortable: '舒适',
    layoutCompact: '紧凑',
    layoutWide: '宽屏',
    language: '语言',
    reset: '恢复默认',
    close: '关闭',
    readingProgress: '阅读进度',
    footer: '© 2026 CloudWaer · Powered by cloudwaer-blog'
  },
  'en-US': {
    siteName: 'Yunji Blog',
    home: 'Home',
    forum: 'Forum',
    archive: 'Archive',
    about: 'About',
    searchPlaceholder: 'Search posts…',
    settings: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    fontSize: 'Font size',
    fontSm: 'S',
    fontMd: 'M',
    fontLg: 'L',
    layout: 'Layout',
    layoutComfortable: 'Comfortable',
    layoutCompact: 'Compact',
    layoutWide: 'Wide',
    language: 'Language',
    reset: 'Reset',
    close: 'Close',
    readingProgress: 'Reading progress',
    footer: '© 2026 CloudWaer · Powered by cloudwaer-blog'
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings())
  const systemDark = ref(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )

  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (settings.value.theme === 'system') {
      return systemDark.value ? 'dark' : 'light'
    }
    return settings.value.theme
  })

  const isDark = computed(() => resolvedTheme.value === 'dark')

  function t(key: string): string {
    const locale = settings.value.locale
    return dict[locale]?.[key] ?? dict['zh-CN'][key] ?? key
  }

  function applyToDom() {
    const root = document.documentElement
    root.classList.toggle('dark', isDark.value)
    root.dataset.theme = resolvedTheme.value
    root.dataset.fontSize = settings.value.fontSize
    root.dataset.layout = settings.value.layout
    root.lang = settings.value.locale === 'en-US' ? 'en' : 'zh-CN'
  }

  function patch(partial: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...partial }
  }

  function reset() {
    settings.value = { ...defaultSettings }
  }

  watch(settings, () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    applyToDom()
  }, { deep: true })

  watch(resolvedTheme, () => applyToDom())

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      systemDark.value = e.matches
      applyToDom()
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
  }

  // 首次挂载应用
  if (typeof document !== 'undefined') {
    applyToDom()
  }

  return {
    settings,
    isDark,
    resolvedTheme,
    t,
    patch,
    reset,
    applyToDom
  }
})
