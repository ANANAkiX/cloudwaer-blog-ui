<template>
  <div class="forum-page">
    <div class="page-head card">
      <h2>微论坛</h2>
      <p class="muted">短帖交流 · 登录后可发帖回复 · 管理员可置顶/加精</p>
    </div>

    <div v-if="topics.length" class="topic-list">
      <article
        v-for="t in topics"
        :key="t.id"
        class="topic-card card"
        @click="goDetail(t)"
      >
        <div class="topic-main">
          <h3>
            <span v-if="t.isTop === 1" class="badge top">置顶</span>
            <span v-if="t.isEssence === 1" class="badge essence">精华</span>
            {{ t.title }}
          </h3>
          <div class="meta">
            <span>{{ t.nickname }}</span>
            <span>{{ t.viewCount }} 浏览</span>
            <span>{{ t.replyCount }} 回复</span>
            <span>{{ t.likeCount }} 赞</span>
            <span>{{ formatDate(t.lastReplyTime || t.createTime) }}</span>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="empty card">暂无话题</div>

    <div v-if="pages > 1" class="pager">
      <button :disabled="current <= 1" @click="goPage(current - 1)">上一页</button>
      <span class="pager-info">{{ current }} / {{ pages }}</span>
      <button :disabled="current >= pages" @click="goPage(current + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTopicList, type TopicItem } from '@/api/blog'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const topics = ref<TopicItem[]>([])
const total = ref(0)
const size = 10
const current = computed(() => Math.max(1, Number(route.query.current) || 1))
const pages = computed(() => Math.max(1, Math.ceil(total.value / size)))

async function load() {
  try {
    const res = await getTopicList({ current: current.value, size })
    topics.value = res.records || []
    total.value = res.total || 0
  } catch {
    topics.value = []
    total.value = 0
  }
}

function goDetail(t: TopicItem) {
  router.push(`/forum/${t.id}`)
}

function goPage(p: number) {
  router.push({ path: '/forum', query: p > 1 ? { current: p } : {} })
}

onMounted(load)
watch(() => route.query, load)
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

.topic-card {
  padding: 16px 20px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}

.topic-card:hover {
  box-shadow: 0 6px 24px rgba(35, 38, 43, 0.06);
}

.topic-main h3 {
  margin: 0 0 8px;
  font-size: 17px;
  line-height: 1.4;
}

.badge {
  display: inline-block;
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 4px;
  margin-right: 8px;
  vertical-align: 2px;
}

.badge.top {
  background: #fff1f0;
  color: #cf1322;
}

.badge.essence {
  background: #fff7e6;
  color: #d46b08;
}

.meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: #9ca3af;
  font-size: 12px;
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

.pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-info {
  color: var(--muted);
  font-size: 13px;
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
