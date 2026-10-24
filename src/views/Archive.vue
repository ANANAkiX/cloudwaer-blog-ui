<template>
  <div class="archive-page">
    <div class="page-head card">
      <h2>归档</h2>
      <p class="muted">共 {{ total }} 篇已发布文章</p>
    </div>

    <div v-for="group in groups" :key="group.month" class="month-block card">
      <h3 class="month-title">{{ group.month }} <span class="muted">({{ group.items.length }})</span></h3>
      <ul class="archive-list">
        <li v-for="a in group.items" :key="a.id" @click="goDetail(a)">
          <span class="date muted">{{ formatDay(a.publishTime || a.createTime) }}</span>
          <span class="title">{{ a.title }}</span>
          <span class="muted meta">{{ a.viewCount }} 阅读</span>
        </li>
      </ul>
    </div>

    <div v-if="!groups.length" class="empty card">暂无归档文章</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getArticleArchive, type ArticleItem } from '@/api/blog'

const router = useRouter()
const articles = ref<ArticleItem[]>([])

const total = computed(() => articles.value.length)

const groups = computed(() => {
  const map = new Map<string, ArticleItem[]>()
  for (const a of articles.value) {
    const d = a.publishTime || a.createTime || ''
    const month = String(d).slice(0, 7) || '未知'
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(a)
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }))
})

function formatDay(val?: string | null) {
  if (!val) return ''
  return String(val).slice(5, 10)
}

function goDetail(a: ArticleItem) {
  router.push(`/article/${a.id}`)
}

onMounted(async () => {
  try {
    articles.value = (await getArticleArchive()) || []
  } catch {
    articles.value = []
  }
})
</script>

<style scoped>
.page-head {
  padding: 20px 24px;
  margin-bottom: 16px;
}

.page-head h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.page-head p {
  margin: 0;
  font-size: 13px;
}

.month-block {
  padding: 18px 24px;
  margin-bottom: 14px;
}

.month-title {
  margin: 0 0 10px;
  font-size: 16px;
}

.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.archive-list li {
  display: flex;
  gap: 14px;
  align-items: baseline;
  padding: 8px 4px;
  border-bottom: 1px dashed var(--border);
  cursor: pointer;
}

.archive-list li:last-child {
  border-bottom: none;
}

.archive-list li:hover .title {
  color: var(--accent);
}

.date {
  font-size: 12px;
  width: 48px;
  flex-shrink: 0;
}

.title {
  flex: 1;
  font-size: 14px;
}

.meta {
  font-size: 12px;
}

.empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--muted);
}

.muted {
  color: #9ca3af;
}
</style>
