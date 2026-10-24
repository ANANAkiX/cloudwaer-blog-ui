<template>
  <div v-if="article" class="article-page" :class="'toc-' + tocPosition">
    <aside class="article-left">
      <section class="card side-card author-card">
        <div class="author-avatar">{{ (article.authorName || '作').charAt(0) }}</div>
        <h4 class="author-name">{{ article.authorName }}</h4>
        <p class="muted author-site">发表于 {{ settingsStore.siteName }}</p>
        <div class="site-stats">
          <div class="stat">
            <strong>{{ article.viewCount }}</strong>
            <span>阅读</span>
          </div>
          <div class="stat">
            <strong>{{ article.likeCount }}</strong>
            <span>点赞</span>
          </div>
          <div class="stat">
            <strong>{{ article.commentCount }}</strong>
            <span>评论</span>
          </div>
        </div>
      </section>

      <section class="card side-card">
        <h4>阅读信息</h4>
        <ul class="info-list">
          <li><span>发布</span><em>{{ formatDate(article.publishTime || article.createTime) }}</em></li>
          <li><span>字数</span><em>{{ wordCount }}</em></li>
          <li><span>预计</span><em>{{ readingMinutes }} 分钟</em></li>
          <li v-if="article.updateTime"><span>更新</span><em>{{ formatDate(article.updateTime) }}</em></li>
        </ul>
      </section>

      <section class="card side-card">
        <h4>操作</h4>
        <div class="action-col">
          <button class="action-btn" type="button" :class="{ on: articleLiked }" @click="onLikeArticle">
            {{ articleLiked ? '已赞' : '点赞' }} {{ article.likeCount }}
          </button>
          <button class="action-btn" type="button" @click="copyLink">
            {{ copied ? '已复制链接' : '复制链接' }}
          </button>
          <button class="action-btn" type="button" @click="scrollToTop">回到顶部</button>
        </div>
      </section>

      <section v-if="toc.length && tocPosition === 'left'" class="card side-card toc-card">
        <h4>目录</h4>
        <ul>
          <li
            v-for="item in toc"
            :key="item.id"
            :class="['level-' + item.level, { active: activeToc === item.id }]"
            @click="scrollTo(item.id)"
          >
            {{ item.text }}
          </li>
        </ul>
      </section>
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
        class="markdown-body"
        v-html="rendered"
      ></div>

      <footer class="article-foot muted">本文由 {{ article.authorName }} 发表于{{ settingsStore.siteName }}</footer>

      <!-- 评论区 -->
      <section class="comments">
        <h3>评论 <span class="muted">({{ comments.length }})</span></h3>

        <div class="comment-form card">
          <textarea
            v-model="commentContent"
            rows="3"
            maxlength="1000"
            placeholder="写下你的评论…（审核通过后展示）"
          ></textarea>
          <div class="form-actions">
            <span v-if="replyTo" class="reply-hint muted">
              回复 @{{ replyTo.nickname }}
              <button class="link-btn" type="button" @click="cancelReply">取消</button>
            </span>
            <button
              class="submit-btn"
              type="button"
              :disabled="submitting || !commentContent.trim()"
              @click="submitComment"
            >
              {{ submitting ? '提交中…' : '发表评论' }}
            </button>
          </div>
          <p v-if="commentMsg" class="form-msg">{{ commentMsg }}</p>
        </div>

        <div v-if="comments.length" class="comment-list">
          <article v-for="c in comments" :key="c.id" class="comment-item">
            <div class="comment-head">
              <strong>{{ c.nickname }}</strong>
              <span class="muted">{{ formatDate(c.createTime) }}</span>
            </div>
            <p class="comment-body">{{ c.content }}</p>
            <button class="link-btn" type="button" @click="startReply(c)">回复</button>
            <div v-if="c.replies?.length" class="reply-list">
              <div v-for="r in c.replies" :key="r.id" class="reply-item">
                <div class="comment-head">
                  <strong>{{ r.nickname }}</strong>
                  <span class="muted">{{ formatDate(r.createTime) }}</span>
                </div>
                <p class="comment-body">{{ r.content }}</p>
                <button class="link-btn" type="button" @click="startReply(c, r)">回复</button>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="muted empty-comments">还没有评论，来抢沙发吧。</p>
      </section>
    </div>

    <aside class="article-side">
      <section v-if="toc.length && tocPosition === 'right'" class="card side-card toc-card">
        <h4>目录</h4>
        <ul>
          <li
            v-for="item in toc"
            :key="item.id"
            :class="['level-' + item.level, { active: activeToc === item.id }]"
            @click="scrollTo(item.id)"
          >
            {{ item.text }}
          </li>
        </ul>
      </section>

      <section class="card side-card">
        <h4>相关阅读</h4>
        <ol class="hot-list">
          <li v-for="(h, i) in relatedArticles" :key="h.id" @click="goDetail(h)">
            <em class="rank">{{ i + 1 }}</em>
            <span class="hot-title">{{ h.title }}</span>
          </li>
          <li v-if="!relatedArticles.length" class="muted">暂无</li>
        </ol>
      </section>

      <section class="card side-card">
        <h4>标签</h4>
        <div class="tags" v-if="article.tags?.length">
          <span
            v-for="t in article.tags"
            :key="t.id"
            class="pill"
            @click="filterByTag(t.id)"
          >{{ t.name }}</span>
        </div>
        <p v-else class="muted">暂无标签</p>
      </section>
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
  getArticleComments,
  addComment,
  toggleLike,
  getHotArticles,
  type ArticleItem,
  type CommentItem
} from '@/api/blog'
import { formatDate } from '@/utils/date'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const tocPosition = computed(() => settingsStore.tocPosition)

const article = ref<ArticleItem | null>(null)
const rendered = ref('')
const error = ref('')
const mdEl = ref<HTMLElement | null>(null)
const toc = ref<{ id: string; text: string; level: number }[]>([])
const activeToc = ref('')

const comments = ref<CommentItem[]>([])
const commentContent = ref('')
const commentMsg = ref('')
const submitting = ref(false)
const replyTo = ref<{ parentId: string | number; rootId?: string | number; nickname: string } | null>(null)
const articleLiked = ref(false)
const relatedArticles = ref<ArticleItem[]>([])
const copied = ref(false)

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
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goDetail(a: ArticleItem) {
  router.push(`/article/${a.id}`)
}

async function loadRelated() {
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
  } catch (e) {
    commentMsg.value = e instanceof Error ? e.message : '点赞失败，请登录后重试'
  }
}

async function loadComments() {
  if (!route.params.id) return
  try {
    comments.value = await getArticleComments(route.params.id as string)
  } catch {
    comments.value = []
  }
}

function startReply(root: CommentItem, reply?: CommentItem) {
  if (reply) {
    replyTo.value = {
      parentId: reply.id,
      rootId: reply.rootId || root.id,
      nickname: reply.nickname
    }
  } else {
    replyTo.value = { parentId: root.id, rootId: root.id, nickname: root.nickname }
  }
}

function cancelReply() {
  replyTo.value = null
}

async function submitComment() {
  const content = commentContent.value.trim()
  if (!content || !article.value) return
  submitting.value = true
  commentMsg.value = ''
  try {
    await addComment({
      articleId: article.value.id,
      content,
      parentId: replyTo.value?.parentId,
      rootId: replyTo.value?.rootId
    })
    commentContent.value = ''
    replyTo.value = null
    commentMsg.value = '评论已提交，审核通过后展示。'
  } catch (e) {
    commentMsg.value = e instanceof Error ? e.message : '评论失败，请登录后重试'
  } finally {
    submitting.value = false
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
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 滚动时同步目录高亮（sticky 顶栏偏移约 88px） */
let tocSpyRaf = 0

function updateActiveToc() {
  tocSpyRaf = 0
  const items = toc.value
  if (!items.length) return
  const offset = 100
  let current = items[0].id
  for (const item of items) {
    const el = document.getElementById(item.id)
    if (!el) continue
    const top = el.getBoundingClientRect().top
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
  window.addEventListener('scroll', onTocSpyScroll, { passive: true })
  updateActiveToc()
}

function unbindTocSpy() {
  window.removeEventListener('scroll', onTocSpyScroll)
  if (tocSpyRaf) {
    window.cancelAnimationFrame(tocSpyRaf)
    tocSpyRaf = 0
  }
}

function filterByTag(id: string | number) {
  router.push({ path: '/', query: { tagId: String(id) } })
}

async function load() {
  error.value = ''
  article.value = null
  rendered.value = ''
  toc.value = []
  activeToc.value = ''
  try {
    const id = route.params.id as string
    const data = await getArticleDetail(id)
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
    await loadComments()
    await loadRelated()
    await nextTick()
    updateActiveToc()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '文章加载失败'
  }
}

onMounted(() => {
  load()
  bindTocSpy()
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
   3-col: [left author/meta | article | right toc/related]
   Left edge stays in .container, aligned with the site title.
   toc-left moves TOC under the left rail; toc-right keeps it on the right.
*/
.article-page {
  --left-w: 200px;
  --side-w: 240px;
  --gap: 20px;

  display: grid;
  grid-template-columns: var(--left-w) minmax(0, 1fr) var(--side-w);
  column-gap: var(--gap);
  justify-content: start;
  align-items: start;
  width: 100%;
}

.article-left,
.article-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 84px;
}

.article-page .article-main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  width: 100%;
  max-width: none;
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
  padding: 40px 48px;
}

.side-card {
  padding: 16px;
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

.comments {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.comments h3 {
  margin: 0 0 16px;
  font-size: 18px;
}

.comment-form {
  padding: 14px 16px;
  margin-bottom: 20px;
}

.comment-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  background: var(--card);
  color: var(--ink);
  box-sizing: border-box;
}

.comment-form textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 12px;
}

.form-msg {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--accent);
}

.submit-btn {
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.comment-item {
  padding: 14px 0;
  border-bottom: 1px dashed var(--border);
}

.comment-head {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 6px;
}

.comment-body {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-list {
  margin: 10px 0 0 28px;
  padding-left: 14px;
  border-left: 2px solid var(--border);
}

.reply-item {
  padding: 10px 0;
}

.empty-comments {
  padding: 24px 0;
  text-align: center;
}

.reply-hint {
  font-size: 12px;
}

.reply-hint .link-btn {
  margin-left: 8px;
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

/* tablet: left rail becomes a top strip, keep article + right rail */
@media (min-width: 900px) and (max-width: 1099px) {
  .article-page {
    grid-template-columns: minmax(0, 1fr) var(--side-w);
  }

  .article-left {
    grid-column: 1 / -1;
    grid-row: 1;
    position: static;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .article-main {
    grid-column: 1;
    grid-row: 2;
    max-width: none;
  }

  .article-side {
    grid-column: 2;
    grid-row: 2;
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
