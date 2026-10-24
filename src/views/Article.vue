<template>
  <div v-if="article" class="article-page">
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

      <footer class="article-foot muted">本文由 {{ article.authorName }} 发表于云记博客</footer>

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

    <aside v-if="toc.length" class="toc card">
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
    </aside>
  </div>

  <div v-else class="state card">
    <p v-if="error">{{ error }}</p>
    <p v-else>加载中…</p>
    <router-link to="/">返回首页</router-link>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import {
  getArticleDetail,
  getArticleComments,
  addComment,
  toggleLike,
  type ArticleItem,
  type CommentItem
} from '@/api/blog'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()

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

function highlightCode() {
  mdEl.value?.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block as HTMLElement)
  })
}

function scrollTo(id: string) {
  activeToc.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function filterByTag(id: string | number) {
  router.push({ path: '/', query: { tagId: String(id) } })
}

async function load() {
  error.value = ''
  article.value = null
  rendered.value = ''
  toc.value = []
  try {
    const id = route.params.id as string
    const data = await getArticleDetail(id)
    article.value = data
    rendered.value = marked.parse(data.content || '') as string
    document.title = `${data.title} · 云记博客`
    updateMeta('description', data.summary || data.title)
    updateMeta('keywords', [data.title, data.authorName, ...(data.tags || []).map(t => t.name)].join(','))
    await nextTick()
    buildToc()
    highlightCode()
    await loadComments()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '文章加载失败'
  }
}

onMounted(load)
</script>

<style scoped>
.article-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 24px;
  align-items: start;
}

.article-main {
  padding: 36px 42px;
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

.markdown-body :deep(img) {
  border-radius: 8px;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 14px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  font-size: 14px;
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

.toc {
  position: sticky;
  top: 84px;
  padding: 16px 18px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.toc h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc li {
  font-size: 13px;
  color: var(--muted);
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  line-height: 1.5;
}

.toc li.level-3 {
  padding-left: 22px;
  font-size: 12.5px;
}

.toc li:hover,
.toc li.active {
  background: var(--accent-soft);
  color: var(--accent);
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

@media (max-width: 900px) {
  .article-page {
    grid-template-columns: 1fr;
  }

  .toc {
    position: static;
  }

  .article-main {
    padding: 24px 20px;
  }
}
</style>
