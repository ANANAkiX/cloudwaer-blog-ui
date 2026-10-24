import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  getOpenSiteSetting,
  toPublicUrl,
  type SiteSetting,
  type NavSettingItem,
  type HomeLayoutSetting,
  type PageSettingItem
} from '@/api/blog'

export type ThemeMode = 'light' | 'dark' | 'system'
export type FontSizeMode = 'sm' | 'md' | 'lg'
export type LayoutMode = 'comfortable' | 'compact' | 'wide'
export type LocaleMode = 'zh-CN' | 'en-US'
export type TocPosition = 'left' | 'right' | 'off'

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
    write: '写文章',
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
    write: 'Write',
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

/** 后端 layout → 前端 layout（无匹配则忽略） */
const LAYOUT_MAP: Record<string, LayoutMode> = {
  default: 'comfortable',
  compact: 'compact',
  magazine: 'wide'
}

/** 默认导航（远程 nav 未配置时回落） */
const DEFAULT_NAV: NavSettingItem[] = [
  { key: 'home', label: '首页', path: '/', visible: true, order: 1 },
  { key: 'forum', label: '微论坛', path: '/forum', visible: true, order: 2 },
  { key: 'archive', label: '归档', path: '/archive', visible: true, order: 3 },
  { key: 'about', label: '关于', path: '/about', visible: true, order: 4 },
  { key: 'write', label: '写文章', path: '/write', visible: true, order: 5 }
]

const DEFAULT_HOME_LAYOUT: HomeLayoutSetting = {
  showFeatured: true,
  showTagCloud: true,
  showHot: true
}

function normalizeNav(raw?: NavSettingItem[]): NavSettingItem[] {
  const list = raw && raw.length ? raw : DEFAULT_NAV
  return [...list]
    .map((n, i) => ({
      key: n.key || `item${i + 1}`,
      label: n.label || '',
      path: n.path || '/',
      visible: n.visible !== false,
      order: n.order ?? i + 1
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings())
  const siteSetting = ref<SiteSetting | null>(null)
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

  /** 站点名：远程 siteTitle 优先 */
  const siteName = computed(() => siteSetting.value?.siteTitle?.trim() || dict[settings.value.locale]?.siteName || dict['zh-CN'].siteName)

  /** 页脚：远程 footerText 优先 */
  const footerText = computed(() => siteSetting.value?.footerText?.trim() || dict[settings.value.locale]?.footer || dict['zh-CN'].footer)

  /** enableSearch=0 时隐藏搜索框（未配置则显示） */
  const searchEnabled = computed(() => siteSetting.value?.enableSearch !== 0)

  /** 导航项：远程 nav 优先，仅保留 visible，按 order 排序 */
  const navItems = computed<NavSettingItem[]>(() =>
    normalizeNav(siteSetting.value?.nav).filter(n => n.visible !== false)
  )

  /** 文章目录位置：left / right / off（默认 right） */
  const tocPosition = computed<TocPosition>(() => {
    const raw = siteSetting.value?.articleLayout?.tocPosition
    if (raw === 'left' || raw === 'right' || raw === 'off') return raw
    return 'right'
  })

  /** 首页模块开关 */
  const homeLayout = computed<HomeLayoutSetting>(() => ({
    showFeatured: siteSetting.value?.homeLayout?.showFeatured !== false,
    showTagCloud: siteSetting.value?.homeLayout?.showTagCloud !== false,
    showHot: siteSetting.value?.homeLayout?.showHot !== false
  }))

  /** 关于页文案（pages.about） */
  const aboutPage = computed<PageSettingItem>(() => ({
    title: siteSetting.value?.pages?.about?.title?.trim() || '关于云记',
    content: siteSetting.value?.pages?.about?.content?.trim() || ''
  }))

  function t(key: string): string {
    if (key === 'siteName') return siteName.value
    if (key === 'footer') return footerText.value
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

  function applyFavicon(favicon?: string | null) {
    if (!favicon || typeof document === 'undefined') return
    const href = toPublicUrl(favicon)
    if (!href) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = href
  }

  /** 拉取远程站点设置；失败静默回落本地默认 */
  async function loadSiteSetting() {
    try {
      const data = await getOpenSiteSetting()
      if (!data) return
      siteSetting.value = data
      const mapped = data.layout ? LAYOUT_MAP[data.layout] : undefined
      if (mapped && settings.value.layout !== mapped) {
        settings.value = { ...settings.value, layout: mapped }
      }
      applyFavicon(data.favicon)
    } catch {
      // 接口失败保持本地默认
    }
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

  // 启动时拉取远程站点设置（失败静默回落）
  void loadSiteSetting()

  return {
    settings,
    siteSetting,
    isDark,
    resolvedTheme,
    siteName,
    footerText,
    searchEnabled,
    navItems,
    tocPosition,
    homeLayout,
    aboutPage,
    t,
    patch,
    reset,
    applyToDom,
    loadSiteSetting
  }
})
