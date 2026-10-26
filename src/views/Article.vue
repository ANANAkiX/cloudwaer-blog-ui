<template>
  <div v-if="article || switching" class="article-page" :class="{ switching }">
    <aside class="article-left">
      <template v-for="m in leftMods" :key="m.key">
        <AuthorCard
          v-if="m.key === 'author'"
          :author-name="article.authorName"
          :author-avatar="article.authorAvatar"
          :site-name="settingsStore.siteName"
          :view-count="article.viewCount"
          :like-count="article.likeCount"
          :comment-count="article.commentCount"
          :liked="articleLiked"
        />
        <ReadingInfoCard
          v-else-if="m.key === 'readingInfo'"
          :publish-time="article.publishTime"
          :create-time="article.createTime"
          :update-time="article.updateTime"
          :word-count="wordCount"
          :reading-minutes="readingMinutes"
          :format-date="formatDate"
        />
        <ActionCard
          v-else-if="m.key === 'actions'"
          :like-count="article.likeCount"
          :liked="articleLiked"
          :copied="copied"
          @like="onLikeArticle"
          @copy="copyLink"
          @top="scrollToTop"
        />
        <RelatedCard
          v-else-if="m.key === 'related'"
          :title="sideListTitle"
          :items="sideArticles"
          :current-id="article.id"
          @open="openSideArticle"
        />
      </template>
    </aside>

    <div class="article-main card">
      <header class="article-header">
        <h1>{{ article.title }}</h1>
        <div class="meta">
          <span>{{ article.authorName }}</span>
          <span>{{ formatDate(article.publishTime || article.createTime) }}</span>
          <span>{{ article.viewCount }} 阅读</span>
          <span>{{ article.commentCount }} 评论</span>
          <button class="like-btn" type="button" :class="{ on: articleLiked }" @click="onLikeArticle">
            {{ articleLiked ? '已赞' : '点赞' }} {{ article.likeCount }}
          </button>
        </div>
        <div class="tags" v-if="article.tags?.length">
          <span
            v-for="t in article.tags"
            :key="t.id"
            class="pill"
            @click="filterByTag(t.id)"
          >{{ t.name }}</span>
        </div>
      </header>

      <div
        ref="mdEl"
        class="markdown-body article-scroll-body"
        v-html="rendered"
      ></div>

      <footer class="article-foot muted">本文由 {{ article.authorName }} 发表于{{ settingsStore.siteName }}</footer>

      <!-- 评论区 -->
      <CommentSection :article-id="article.id" />

    </div>

    <aside class="article-side">
      <template v-for="m in rightMods" :key="m.key">
        <TocCard
          v-if="m.key === 'toc' && toc.length"
          :toc="toc"
          :active-id="activeToc"
          @jump="scrollTo"
        />
        <TagCard
          v-else-if="m.key === 'tags'"
          :tags="article.tags || []"
          @filter="filterByTag"
        />
      </template>
    </aside>
  </div>

  <div v-else class="state card">
    <p v-if="error">{{ error }}</p>
    <p v-else>加载中…</p>
    <router-link to="/">返回首页</router-link>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import mermaid from 'mermaid'
import {
  getArticleDetail,
  toggleLike,
  getHotArticles,
  type ArticleItem
} from '@/api/blog'
import { formatDate } from '@/utils/date'
import { useSettingsStore } from '@/stores/settings'
import {
  defaultArticleModules,
  modulesByZone,
  normalizeModules,
  type LayoutModuleItem
} from '@/config/layoutModules'
import AuthorCard from '@/components/article/AuthorCard.vue'
import ReadingInfoCard from '@/components/article/ReadingInfoCard.vue'
import ActionCard from '@/components/article/ActionCard.vue'
import RelatedCard from '@/components/article/RelatedCard.vue'
import TocCard from '@/components/article/TocCard.vue'
import TagCard from '@/components/article/TagCard.vue'
import CommentSection from '@/components/article/CommentSection.vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

/** 详情侧栏编排（固定图二默认，后台可改） */
const articleModules = computed<LayoutModuleItem[]>(() =>
  normalizeModules(settingsStore.siteSetting?.articleLayout, defaultArticleModules(), [
    { key: 'author', label: '作者卡片', zones: ['left'], hideable: true },
    { key: 'readingInfo', label: '阅读信息', zones: ['left'], hideable: true },
    { key: 'actions', label: '操作', zones: ['left'], hideable: true },
    { key: 'related', label: '相关阅读/合集', zones: ['left', 'right'], hideable: true },
    { key: 'toc', label: '目录', zones: ['right'], hideable: true },
    { key: 'tags', label: '标签', zones: ['right'], hideable: true }
  ])
)
const leftMods = computed(() => modulesByZone(articleModules.value, 'left'))
const rightMods = computed(() => modulesByZone(articleModules.value, 'right'))

const article = ref<ArticleItem | null>(null)
const rendered = ref('')
const error = ref('')
const mdEl = ref<HTMLElement | null>(null)
const toc = ref<{ id: string; text: string; level: number }[]>([])
const activeToc = ref('')

const articleLiked = ref(false)
const relatedArticles = ref<ArticleItem[]>([])

/** 左侧：有合集展示合集文章，否则相关阅读（后期可换算法） */
const sideListTitle = computed(() => {
  const name = article.value?.collection?.name
  return name ? `合集 · ${name}` : '相关阅读'
})

const sideArticles = computed(() => {
  const colArticles = article.value?.collectionArticles
  if (article.value?.collectionId && Array.isArray(colArticles)) {
    return colArticles
  }
  return relatedArticles.value
})
const copied = ref(false)
/** 合集内切换：淡出旧文 → 加载 → 淡入 */
const switching = ref(false)

const wordCount = computed(() => {
  const raw = article.value?.content || ''
  return raw.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length
})
const readingMinutes = computed(() => Math.max(1, Math.ceil(wordCount.value / 400)))

function copyLink() {
  const url = window.location.href
  const done = () => {
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => {
      window.prompt('复制链接', url)
    })
  } else {
    window.prompt('复制链接', url)
  }
}

function scrollToTop() {
  const main = document.querySelector('.article-main') as HTMLElement | null
  main?.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 合集/相关阅读：同页就地切换，带淡入淡出 */
function openSideArticle(id: string | number) {
  const current = article.value?.id
  if (current != null && String(current) === String(id)) return
  switching.value = true
  router.push(`/article/${id}`)
}

async function loadRelated() {
  // 有合集时侧栏用详情返回的合集文章（含当前篇），无需再拉热门
  if (article.value?.collectionId && article.value?.collectionArticles?.length) {
    relatedArticles.value = []
    return
  }
  try {
    const hot = await getHotArticles(6)
    const id = article.value?.id
    relatedArticles.value = (hot || []).filter(h => String(h.id) !== String(id)).slice(0, 5)
  } catch {
    relatedArticles.value = []
  }
}

function updateMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

async function onLikeArticle() {
  if (!article.value) return
  try {
    const res = await toggleLike(1, article.value.id)
    articleLiked.value = res.liked
    article.value.likeCount = res.likeCount
  } catch {
    // 登录失效时 request 层已有统一提示
  }
}

marked.setOptions({ gfm: true, breaks: false })

function buildToc() {
  const root = mdEl.value
  if (!root) return
  const headings = root.querySelectorAll('h2, h3')
  const items: { id: string; text: string; level: number }[] = []
  headings.forEach((el, i) => {
    const id = `heading-${i}`
    el.id = id
    items.push({
      id,
      text: el.textContent || '',
      level: el.tagName === 'H2' ? 2 : 3
    })
  })
  toc.value = items
}

function wrapTables() {
  mdEl.value?.querySelectorAll('table').forEach(table => {
    const parent = table.parentElement
    if (parent && parent.classList.contains('table-wrap')) return
    const wrap = document.createElement('div')
    wrap.className = 'table-wrap'
    table.parentNode?.insertBefore(wrap, table)
    wrap.appendChild(table)
  })
}

function highlightCode() {
  mdEl.value?.querySelectorAll('pre').forEach(pre => {
    const block = pre.querySelector('code')
    if (!block) return
    if (isMermaidBlock(block as HTMLElement)) return

    const cls = block.className || ''
    const langMatch = cls.match(/language-([\w+#-]+)/)
    const lang = langMatch?.[1] || ''
    if (lang) {
      pre.setAttribute('data-lang', lang)
    } else {
      pre.removeAttribute('data-lang')
    }

    if (!lang || hljs.getLanguage(lang)) {
      hljs.highlightElement(block as HTMLElement)
    }
  })
}

function isMermaidBlock(block: HTMLElement) {
  const cls = block.className || ''
  return cls.includes('language-mermaid') || cls.includes('mermaid')
}

/** ```mermaid → SVG 图 */
async function renderMermaid() {
  const root = mdEl.value
  if (!root) return
  const codes = Array.from(root.querySelectorAll('pre code')).filter(b => isMermaidBlock(b as HTMLElement))
  if (!codes.length) return

  codes.forEach((code, i) => {
    const pre = code.closest('pre')
    const source = code.textContent || ''
    const div = document.createElement('div')
    div.className = 'mermaid'
    div.dataset.mermaidSeq = String(i)
    div.textContent = source
    if (pre) {
      pre.replaceWith(div)
    } else {
      code.replaceWith(div)
    }
  })

  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'neutral',
      fontFamily: getComputedStyle(document.body).fontFamily
    })
    await mermaid.run({ nodes: root.querySelectorAll('.mermaid') })
  } catch (e) {
    console.warn('mermaid render failed', e)
  }
}

function scrollTo(id: string) {
  activeToc.value = id
  const el = document.getElementById(id)
  const main = document.querySelector('.article-main') as HTMLElement | null
  if (!el || !main) return
  const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 16
  main.scrollTo({ top, behavior: 'smooth' })
}

/** 目录高亮：监听正文容器滚动（仅正文滚动） */
let tocSpyRaf = 0

function updateActiveToc() {
  tocSpyRaf = 0
  const items = toc.value
  if (!items.length) return
  const main = document.querySelector('.article-main') as HTMLElement | null
  if (!main) return
  const offset = 24
  let current = items[0].id
  for (const item of items) {
    const el = document.getElementById(item.id)
    if (!el) continue
    const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top
    if (top - offset <= 0) {
      current = item.id
    } else {
      break
    }
  }
  activeToc.value = current
}

function onTocSpyScroll() {
  if (tocSpyRaf) return
  tocSpyRaf = window.requestAnimationFrame(updateActiveToc)
}

function bindTocSpy() {
  const main = document.querySelector('.article-main')
  main?.addEventListener('scroll', onTocSpyScroll, { passive: true })
  updateActiveToc()
}

function unbindTocSpy() {
  const main = document.querySelector('.article-main')
  main?.removeEventListener('scroll', onTocSpyScroll)
  if (tocSpyRaf) {
    window.cancelAnimationFrame(tocSpyRaf)
    tocSpyRaf = 0
  }
}

function filterByTag(id: string | number) {
  router.push({ path: '/', query: { tagId: String(id) } })
}

async function load() {
  const isSwitch = switching.value
  // 切换时保留旧文节点做淡出，避免闪白；首屏仍清空
  if (!isSwitch) {
    article.value = null
    rendered.value = ''
    toc.value = []
  }
  error.value = ''
  activeToc.value = ''
  articleLiked.value = false
  relatedArticles.value = []
  try {
    const id = route.params.id as string
    const data = await getArticleDetail(id)
    if (isSwitch) {
      // 短暂保持淡出态再换内容
      await new Promise(r => setTimeout(r, 120))
    }
    article.value = data
    rendered.value = marked.parse(data.content || '') as string
    document.title = `${data.title} · ${settingsStore.siteName}`
    updateMeta('description', data.summary || data.title)
    updateMeta('keywords', [data.title, data.authorName, ...(data.tags || []).map(t => t.name)].join(','))
    await nextTick()
    buildToc()
    wrapTables()
    highlightCode()
    await renderMermaid()
    await loadRelated()
    await nextTick()
    updateActiveToc()
    const main = document.querySelector('.article-main') as HTMLElement | null
    main?.scrollTo({ top: 0 })
    // 淡入
    await nextTick()
    switching.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : '文章加载失败'
    switching.value = false
  }
}

onMounted(() => {
  load()
  // 等 DOM 挂载后再绑正文滚动
  requestAnimationFrame(() => bindTocSpy())
})

onBeforeUnmount(() => {
  unbindTocSpy()
})

watch(
  () => route.params.id,
  (id, prev) => {
    if (id && id !== prev) {
      load()
    }
  }
)
</script>

<style scoped>
/* ---------- layout shell ----------
   仅中间正文滚动；左右栏与 header 固定。
   固定图二：左=作者/阅读/操作/相关，右=目录/标签。
*/
.article-page {
  --left-w: 200px;
  --side-w: 240px;
  --gap: 20px;
  --header-h: 72px;

  display: grid;
  grid-template-columns: var(--left-w) minmax(0, 1fr) var(--side-w);
  column-gap: var(--gap);
  justify-content: start;
  align-items: start;
  width: 100%;
  height: calc(100vh - var(--header-h));
  overflow: hidden;
}

/* 合集切换：整体轻微淡出，避免闪白 */
.article-page.switching .article-main,
.article-page.switching .article-left,
.article-page.switching .article-side {
  opacity: 0.35;
  transition: opacity 0.18s ease;
}

.article-page .article-main,
.article-page .article-left,
.article-page .article-side {
  transition: opacity 0.22s ease;
}

.article-left,
.article-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 8px;
  scrollbar-width: thin;
}

.article-page .article-main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.article-left {
  grid-column: 1;
  grid-row: 1;
}

.article-side {
  grid-column: 3;
  grid-row: 1;
}

.article-main {
  padding: 28px 36px 48px;
}

.side-card {
  padding: 16px;
  flex-shrink: 0;
}

.side-card h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.author-card {
  text-align: center;
}

.author-avatar {
  width: 56px;
  height: 56px;
  margin: 2px auto 10px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.author-name {
  margin: 0 0 4px;
  font-size: 15px;
}

.author-site {
  margin: 0 0 12px;
  font-size: 12px;
}

.site-stats {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}

.site-stats .stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.site-stats .stat strong {
  font-size: 15px;
  color: var(--ink);
  font-weight: 600;
}

.site-stats .stat span {
  font-size: 11px;
  color: var(--muted);
}

.info-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.info-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}

.info-list li:last-child {
  border-bottom: none;
}

.info-list li span {
  color: var(--muted);
}

.info-list li em {
  font-style: normal;
  color: var(--ink);
  text-align: right;
  word-break: break-all;
}

.action-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--ink);
  text-align: center;
}

.action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.action-btn.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.toc-card ul,
.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-card li {
  font-size: 13px;
  color: var(--muted);
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  line-height: 1.5;
}

.toc-card li.level-3 {
  padding-left: 20px;
  font-size: 12px;
}

.toc-card li:hover,
.toc-card li.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.hot-list li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 2px;
  font-size: 13px;
  cursor: pointer;
  line-height: 1.45;
}

.hot-list li:hover .hot-title {
  color: var(--accent);
}

.hot-list li.current {
  background: var(--accent-soft);
  border-radius: 6px;
}

.hot-list li.current .hot-title {
  color: var(--accent);
  font-weight: 600;
}

.rank {
  font-style: normal;
  font-weight: 700;
  color: var(--accent);
  width: 16px;
  flex-shrink: 0;
}

.hot-title {
  flex: 1;
}

.article-header h1 {
  margin: 0 0 14px;
  font-size: 30px;
  line-height: 1.35;
}

.meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  color: #9ca3af;
  font-size: 13px;
}

.like-btn {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--ink);
}

.like-btn.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.pill {
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.markdown-body {
  margin-top: 28px;
  font-size: 1.05em;
  line-height: 1.8;
  color: var(--ink);
}

.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  scroll-margin-top: 88px;
}

.markdown-body :deep(h2) {
  font-size: 22px;
  margin: 36px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.markdown-body :deep(h3) {
  font-size: 18px;
  margin: 26px 0 10px;
}

.markdown-body :deep(p) {
  margin: 12px 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 24px;
}

.markdown-body :deep(blockquote) {
  margin: 14px 0;
  padding: 4px 16px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  color: var(--muted);
}

.markdown-body :deep(pre) {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
}

.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13.5px;
}

.markdown-body :deep(p code),
.markdown-body :deep(li code) {
  background: var(--accent-soft);
  color: var(--accent);
  padding: 1px 6px;
  border-radius: 4px;
}

.markdown-body :deep(.mermaid) {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin: 14px 0;
  overflow-x: auto;
  text-align: center;
}

.markdown-body :deep(.mermaid svg) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(img) {
  border-radius: 8px;
}

.markdown-body :deep(.table-wrap) {
  max-width: 100%;
  overflow-x: auto;
  margin: 14px 0;
  -webkit-overflow-scrolling: touch;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  font-size: 14px;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.article-foot {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px dashed var(--border);
  font-size: 13px;
}

/* TOC card scrolls when long */
.toc-card {
  max-height: calc(100vh - 110px);
  overflow-y: auto;
}

.state {
  padding: 64px 24px;
  text-align: center;
  color: var(--muted);
}

.state p {
  margin: 0 0 12px;
}

.muted {
  color: #9ca3af;
}

/* medium desktop: shrink side rails so the article stays readable */
@media (min-width: 900px) and (max-width: 1399px) {
  .article-page {
    --left-w: 180px;
    --side-w: 200px;
    --gap: 16px;
  }
}

/* tablet / mobile: stack; body page scroll restored */
@media (max-width: 1099px) {
  .article-page {
    height: auto;
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .article-left,
  .article-side {
    height: auto;
    overflow: visible;
    position: static;
  }

  .article-page .article-main {
    height: auto;
    overflow: visible;
    order: 0;
  }

  .article-left {
    order: -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .site-main.main-article {
    height: auto;
    overflow: visible;
    min-height: calc(100vh - 72px);
  }

  .container-article {
    height: auto;
  }
}

/* ---------- mobile: single column, TOC near top ---------- */
@media (max-width: 899px) {
  .article-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    max-width: 100%;
  }

  .article-left,
  .article-side {
    position: static;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .article-left {
    order: -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .article-left .author-card {
    grid-column: 1 / -1;
  }

  .article-page .article-main {
    width: 100%;
    max-width: none;
  }

  .toc-card {
    max-height: none;
  }

  .article-main {
    padding: 24px 20px;
  }
}
</style>
