/** 页面模块编排：首页 / 详情侧栏统一协议 */

export type LayoutZone = 'left' | 'main' | 'right' | 'hidden'

export interface LayoutModuleItem {
  key: string
  zone: LayoutZone
  order: number
  visible: boolean
  title?: string
  /** 扩展：条数、文案、样式等，由各模块自行解释 */
  extra?: Record<string, unknown>
}

export type PageLayoutKey = 'home' | 'article'

/** 模块元数据（后台编排下拉/图例用） */
export interface LayoutModuleMeta {
  key: string
  label: string
  description?: string
  /** 允许放置的 zone */
  zones: LayoutZone[]
  /** 是否允许隐藏 */
  hideable: boolean
}

export const HOME_MODULE_META: LayoutModuleMeta[] = [
  { key: 'siteProfile', label: '站点信息', description: '头像、简介、统计', zones: ['left'], hideable: true },
  { key: 'nav', label: '导航', zones: ['left'], hideable: true },
  { key: 'quickLinks', label: '快速入口', zones: ['left'], hideable: true },
  { key: 'featured', label: '精选大卡', zones: ['main'], hideable: true },
  { key: 'articleList', label: '文章列表', zones: ['main'], hideable: false },
  { key: 'categoryList', label: '分类', zones: ['right'], hideable: true },
  { key: 'tagCloud', label: '标签云', zones: ['right'], hideable: true },
  { key: 'hotArticles', label: '热门文章', zones: ['right'], hideable: true },
  { key: 'about', label: '关于', zones: ['right'], hideable: true }
]

export const ARTICLE_MODULE_META: LayoutModuleMeta[] = [
  { key: 'author', label: '作者卡片', zones: ['left'], hideable: true },
  { key: 'readingInfo', label: '阅读信息', zones: ['left'], hideable: true },
  { key: 'actions', label: '操作', zones: ['left'], hideable: true },
  { key: 'related', label: '相关阅读/合集', zones: ['left', 'right'], hideable: true },
  { key: 'toc', label: '目录', zones: ['right'], hideable: true },
  { key: 'tags', label: '标签', zones: ['right'], hideable: true }
]

export function defaultHomeModules(): LayoutModuleItem[] {
  return [
    { key: 'siteProfile', zone: 'left', order: 1, visible: true },
    { key: 'nav', zone: 'left', order: 2, visible: true },
    { key: 'quickLinks', zone: 'left', order: 3, visible: true },
    { key: 'featured', zone: 'main', order: 1, visible: true },
    { key: 'articleList', zone: 'main', order: 2, visible: true },
    { key: 'categoryList', zone: 'right', order: 1, visible: true },
    { key: 'tagCloud', zone: 'right', order: 2, visible: true },
    { key: 'hotArticles', zone: 'right', order: 3, visible: true },
    { key: 'about', zone: 'right', order: 4, visible: true }
  ]
}

/** 详情页固定图二：左作者/阅读/操作/相关，右目录/标签 */
export function defaultArticleModules(): LayoutModuleItem[] {
  return [
    { key: 'author', zone: 'left', order: 1, visible: true },
    { key: 'readingInfo', zone: 'left', order: 2, visible: true },
    { key: 'actions', zone: 'left', order: 3, visible: true },
    { key: 'related', zone: 'left', order: 4, visible: true },
    { key: 'toc', zone: 'right', order: 1, visible: true },
    { key: 'tags', zone: 'right', order: 2, visible: true }
  ]
}

/** 合并远端配置与默认：补齐缺失 key，丢弃未知 key，按 zone+order 排序
 *  raw 支持：模块数组，或 homeLayout/articleLayout 对象（含 modules 字段）
 */
export function normalizeModules(
  raw: unknown,
  defaults: LayoutModuleItem[],
  meta: LayoutModuleMeta[]
): LayoutModuleItem[] {
  const metaMap = new Map(meta.map(m => [m.key, m]))
  const known = new Map<string, LayoutModuleItem>()
  defaults.forEach(d => known.set(d.key, { ...d }))

  let list: LayoutModuleItem[] | null = null

  if (Array.isArray(raw)) {
    list = raw as LayoutModuleItem[]
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.modules)) {
      list = obj.modules as LayoutModuleItem[]
    }
    // 兼容旧开关字段
    if (obj.showFeatured === false) {
      const m = known.get('featured')
      if (m) m.visible = false
    }
    if (obj.showTagCloud === false) {
      const m = known.get('tagCloud')
      if (m) m.visible = false
    }
    if (obj.showHot === false) {
      const m = known.get('hotArticles')
      if (m) m.visible = false
    }
  }

  if (list && list.length) {
    for (const item of list) {
      if (!item || !item.key || !metaMap.has(item.key)) continue
      const def = known.get(item.key)
      const metaItem = metaMap.get(item.key)!
      let zone = item.zone
      if (!metaItem.zones.includes(zone)) {
        zone = def?.zone ?? metaItem.zones[0]
      }
      known.set(item.key, {
        key: item.key,
        zone,
        order: Number.isFinite(item.order) ? Number(item.order) : def?.order ?? 99,
        visible: item.visible !== false,
        title: item.title ?? def?.title,
        extra: item.extra ?? def?.extra
      })
    }
  }

  return [...known.values()].sort((a, b) => {
    if (a.zone !== b.zone) return zoneRank(a.zone) - zoneRank(b.zone)
    return a.order - b.order
  })
}

function zoneRank(z: LayoutZone): number {
  return { left: 0, main: 1, right: 2, hidden: 3 }[z]
}

export function modulesByZone(
  modules: LayoutModuleItem[],
  zone: LayoutZone
): LayoutModuleItem[] {
  return modules
    .filter(m => m.zone === zone && m.visible)
    .sort((a, b) => a.order - b.order)
}

export function moduleMeta(key: string, page: PageLayoutKey): LayoutModuleMeta | undefined {
  const list = page === 'home' ? HOME_MODULE_META : ARTICLE_MODULE_META
  return list.find(m => m.key === key)
}

/** 重排后写回 order（同 zone 内 1..n） */
export function resequenceZone(items: LayoutModuleItem[], zone: LayoutZone): LayoutModuleItem[] {
  return items.map((m, i) => (m.zone === zone ? { ...m, order: i + 1, zone } : m))
}
