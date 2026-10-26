<template>
  <div class="forum-page">
    <el-card class="page-head" shadow="never">
      <template #header>
        <div class="head-row">
          <span>微论坛</span>
          <span class="muted tip">短帖交流 · 登录后可发帖回复 · 管理员可置顶/加精</span>
        </div>
      </template>
    </el-card>

    <div v-if="topics.length" class="topic-list">
      <el-card
        v-for="t in topics"
        :key="t.id"
        class="topic-card"
        shadow="never"
        @click="goDetail(t)"
      >
        <div class="topic-main">
          <h3>
            <el-tag v-if="t.isTop === 1" size="small" type="danger">置顶</el-tag>
            <el-tag v-if="t.isEssence === 1" size="small" type="warning">精华</el-tag>
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
      </el-card>
    </div>
    <el-empty v-else description="暂无话题" :image-size="100" />

    <div v-if="pages > 1" class="pager">
      <el-pagination
        layout="prev, pager, next"
        :total="pages * 10"
        :current-page="current"
        :page-size="10"
        @current-change="goPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTopicList, type TopicItem } from '@/api/blog'
import { formatDate } from '@/utils/date'
import { ElCard, ElTag, ElEmpty, ElPagination } from 'element-plus'

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
.page-head :deep(.el-card__body) {
  padding: 0;
}
.head-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  padding: 16px 20px;
}
.tip {
  font-size: 13px;
  font-weight: 400;
}
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.topic-card {
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.topic-card:hover {
  border-color: var(--accent);
}
.topic-card h3 {
  margin: 0 0 10px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--ink);
}
.meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 13px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.muted {
  color: var(--muted);
}
</style>
