<template>
  <div class="home">
    <div class="home-main">
      <!-- 精选大卡（仅首页无筛选时展示） -->
      <article v-if="featured" class="featured card" @click="goDetail(featured)">
        <div class="cover">
          <span class="cover-mark">{{ (featured.title || '文').charAt(0) }}</span>
        </div>
        <div class="featured-body">
          <span class="badge">{{ featured.isTop === 1 ? '置顶' : '精选' }}</span>
          <h2>{{ featured.title }}</h2>
          <p class="summary">{{ featured.summary }}</p>
          <div class="meta">
            <span>{{ featured.authorName }}</span>
            <span>{{ featured.viewCount }} 阅读</span>
            <span>{{ featured.commentCount }} 评论</span>
            <span>{{ formatDate(featured.publishTime || featured.createTime) }}</span>
          </div>
        </div>
      </article>

      <!-- 文章信息流 -->
      <div v-if="listItems.length" class="article-list">
        <article
          v-for="a in listItems"
          :key="a.id"
          class="article-card card"
          @click="goDetail(a)"
        >
          <h3>
            <span v-if="a.isTop === 1" class="tag-top">置顶</span>
            {{ a.title }}
          </h3>
          <p class="summary">{{ a.summary || '这篇作者很懒，还没有写摘要。' }}</p>
          <div class="tags" v-if="a.tags?.length">
            <span
              v-for="t in a.tags"
              :key="t.id"
              class="pill"
              @click.stop="filterByTag(t.id)"
            >{{ t.name }}</span>
          </div>
          <div class="meta">
            <span>{{ a.authorName }}</span>
            <span>{{ a.viewCount }} 阅读</span>
            <span>{{ a.commentCount }} 评论</span>
            <span>{{ formatDate(a.publishTime || a.createTime) }}</span>
          </div>
        </article>
      </div>
      <div v-else-if="!articles.length" class="empty card">没有找到文章</div>

      <!-- 分页 -->
      <div v-if="pages > 1" class="pager">
        <button :disabled="current <= 1" @click="goPage(current - 1)">上一页</button>
        <span class="pager-info">{{ current }} / {{ pages }}</span>
        <button :disabled="current >= pages" @click="goPage(current + 1)">下一页</button>
      </div>
    </div>

    <aside class="side">
      <section class="card side-card">
        <h4>分类</h4>
        <ul class="cat-list">
          <li
            v-for="c in categories"
            :key="c.id"
            :class="{ active: isActiveCategory(c.id) }"
            @click="filterByCategory(c.id)"
          >
            {{ c.name }}
            <em v-if="c.articleCount" class="cat-count">{{ c.articleCount }}</em>
          </li>
          <li v-if="!categories.length" class="muted">暂无分类</li>
        </ul>
      </section>

      <section class="card side-card">
        <h4>标签云</h4>
        <div class="tags">
          <span
            v-for="t in tags"
            :key="t.id"
            class="pill"
            :class="[{ active: isActiveTag(t.id) }, tagSizeClass(t.useCount)]"
            :title="`${t.useCount ?? 0} 篇文章`"
            @click="filterByTag(t.id)"
          >{{ t.name }}<em v-if="t.useCount" class="tag-count">{{ t.useCount }}</em></span>
          <span v-if="!tags.length" class="muted">暂无标签</span>
        </div>
      </section>

      <section class="card side-card">
        <h4>热门文章</h4>
        <ol class="hot-list">
          <li v-for="(h, i) in hotArticles" :key="h.id" @click="goDetail(h)">
            <em class="rank">{{ i + 1 }}</em>
            <span class="hot-title">{{ h.title }}</span>
          </li>
          <li v-if="!hotArticles.length" class="muted">暂无</li>
        </ol>
      </section>

      <section class="card side-card about">
        <h4>关于</h4>
        <p class="muted">云记博客 — 技术实践与工程记录，由 cloudwaer-blog 驱动。</p>
        <router-link to="/about" class="more-link">了解更多 →</router-link>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getArticleList,
  getCategoryList,
  getTagList,
  getHotArticles,
  type ArticleItem,
  type CategoryItem,
  type TagItem
} from '@/api/blog'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()

const articles = ref<ArticleItem[]>([])
const categories = ref<CategoryItem[]>([])
const tags = ref<TagItem[]>([])
const hotArticles = ref<ArticleItem[]>([])
const total = ref(0)
const size = 10

const current = computed(() => Math.max(1, Number(route.query.current) || 1))
const pages = computed(() => Math.max(1, Math.ceil(total.value / size)))
const keyword = computed(() => (route.query.keyword as string) || '')
const categoryId = computed(() => (route.query.categoryId as string) || '')
const tagId = computed(() => (route.query.tagId as string) || '')
const hasFilter = computed(() => !!(keyword.value || categoryId.value || tagId.value))

/** 精选卡：首页第一页未筛选时，取置顶或推荐的第一篇 */
const featured = computed<ArticleItem | null>(() => {
  if (hasFilter.value || current.value > 1) return null
  return articles.value.find(a => a.isTop === 1 || a.isRecommend === 1) || null
})

const listItems = computed<ArticleItem[]>(() => {
  if (!featured.value) return articles.value
  return articles.value.filter(a => a.id !== featured.value!.id)
})

async function fetchList() {
  try {
    const result = await getArticleList({
      current: current.value,
      size,
      keyword: keyword.value || undefined,
      categoryId: categoryId.value || undefined,
      tagId: tagId.value || undefined
    })
    articles.value = result.records || []
    total.value = result.total || 0
  } catch (e) {
    articles.value = []
    total.value = 0
    console.error(e)
  }
}

function pushQuery(patch: Record<string, string | number | undefined>) {
  router.push({
    path: '/',
    query: {
      ...route.query,
      ...patch,
      current: patch.current ?? undefined
    }
  })
}

function goPage(p: number) {
  pushQuery({ current: p > 1 ? p : undefined })
}

function filterByCategory(id: string | number) {
  const next = isActiveCategory(id) ? undefined : String(id)
  router.push({ path: '/', query: { ...route.query, categoryId: next, current: undefined, tagId: undefined } })
}

function filterByTag(id: string | number) {
  const next = isActiveTag(id) ? undefined : String(id)
  router.push({ path: '/', query: { ...route.query, tagId: next, current: undefined, categoryId: undefined } })
}

function isActiveCategory(id: string | number) {
  return categoryId.value === String(id)
}

function isActiveTag(id: string | number) {
  return tagId.value === String(id)
}

function tagSizeClass(useCount?: number) {
  const n = useCount ?? 0
  if (n >= 5) return 'tag-lg'
  if (n >= 2) return 'tag-md'
  return ''
}

function goDetail(a: ArticleItem) {
  router.push(`/article/${a.id}`)
}

onMounted(async () => {
  await fetchList()
  try {
    const [cats, ts, hot] = await Promise.all([getCategoryList(), getTagList(), getHotArticles(5)])
    categories.value = cats
    tags.value = ts
    hotArticles.value = hot || []
  } catch (e) {
    console.error(e)
  }
})

watch(
  () => route.query,
  () => {
    fetchList()
  }
)
</script>

<style scoped>
.home {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
}

.featured {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 20px;
  transition: box-shadow 0.15s ease;
}

.featured:hover,
.article-card:hover {
  box-shadow: 0 6px 24px rgba(35, 38, 43, 0.06);
}

.cover {
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.cover-mark {
  font-size: 64px;
  font-weight: 700;
  color: var(--accent);
  opacity: 0.55;
}

.featured-body {
  padding: 22px 24px;
}

.badge {
  display: inline-block;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.featured-body h2 {
  margin: 0 0 10px;
  font-size: 22px;
  line-height: 1.4;
}

.summary {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 14px;
  color: #9ca3af;
  font-size: 12px;
}

.article-card {
  padding: 22px 24px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}

.article-card h3 {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.45;
}

.tag-top {
  display: inline-block;
  background: #fff1f0;
  color: #cf1322;
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 4px;
  margin-right: 8px;
  vertical-align: 2px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.pill {
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.pill.active {
  background: var(--accent);
  color: #fff;
}

.pill.tag-md {
  font-size: 13px;
  padding: 4px 14px;
}

.pill.tag-lg {
  font-size: 14px;
  font-weight: 600;
  padding: 5px 16px;
}

.tag-count {
  margin-left: 4px;
  font-style: normal;
  opacity: 0.7;
  font-size: 11px;
}

.cat-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cat-count {
  font-style: normal;
  font-size: 12px;
  opacity: 0.65;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}

.pager button {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--ink);
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
}

.pager button:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-info {
  color: var(--muted);
  font-size: 13px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 84px;
}

.side-card {
  padding: 18px 20px;
}

.side-card h4 {
  margin: 0 0 12px;
  font-size: 15px;
}

.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cat-list li {
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
}

.cat-list li:hover {
  background: var(--bg);
}

.cat-list li.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.about p {
  margin: 0;
  font-size: 13px;
}

.more-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--accent);
}

.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hot-list li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 4px;
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

.muted {
  color: #9ca3af;
  font-size: 13px;
}

.empty {
  padding: 56px 24px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 900px) {
  .home {
    grid-template-columns: 1fr;
  }

  .featured {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
  }
}
</style>
