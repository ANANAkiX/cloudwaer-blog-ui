<script setup lang="ts">
import type { ArticleItem } from '@/api/blog'
import { formatDate } from '@/utils/date'
import { ElTag, ElEmpty, ElPagination } from 'element-plus'
import { computed } from 'vue'

withDefaults(
  defineProps<{
    articles: ArticleItem[]
    empty?: boolean
    current?: number
    pages?: number
  }>(),
  { empty: false, current: 0, pages: 0 }
)

const emit = defineEmits<{
  open: [id: string | number]
  filterTag: [id: string | number]
  page: [p: number]
}>()
</script>

<template>
  <div v-if="articles.length" class="article-list">
    <el-card
      v-for="a in articles"
      :key="a.id"
      class="article-card"
      shadow="never"
      @click="emit('open', a.id)"
    >
      <h3>
        <el-tag v-if="a.isTop === 1" size="small" type="danger" effect="light">置顶</el-tag>
        {{ a.title }}
      </h3>
      <p class="summary">{{ a.summary || '这篇作者很懒，还没有写摘要。' }}</p>
      <div class="tags" v-if="a.tags?.length">
        <el-tag
          v-for="t in a.tags"
          :key="t.id"
          size="small"
          effect="plain"
          class="clickable-tag"
          @click.stop="emit('filterTag', t.id)"
        >{{ t.name }}</el-tag>
      </div>
      <div class="meta">
        <span>{{ a.authorName }}</span>
        <span>{{ a.viewCount }} 阅读</span>
        <span>{{ a.commentCount }} 评论</span>
        <span>{{ formatDate(a.publishTime || a.createTime) }}</span>
      </div>
    </el-card>
  </div>
  <el-empty v-else-if="empty" description="没有找到文章" :image-size="80" />

  <div v-if="pages > 1 && current" class="pager">
    <el-pagination
      layout="prev, pager, next"
      :total="pages * 10"
      :current-page="current"
      :page-size="10"
      @current-change="(p: number) => emit('page', p)"
    />
  </div>
</template>

<style scoped>
.article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.article-card {
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.article-card:hover {
  border-color: var(--accent);
}
.article-card :deep(.el-card__body) {
  padding: 22px 26px;
}
.article-card h3 {
  margin: 0 0 10px;
  font-size: 18px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.summary {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 14px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.clickable-tag {
  cursor: pointer;
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
</style>
