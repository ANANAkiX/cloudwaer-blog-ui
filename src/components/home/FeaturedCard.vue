<script setup lang="ts">
import type { ArticleItem } from '@/api/blog'
import { formatDate } from '@/utils/date'
import { ElTag } from 'element-plus'

defineProps<{ article: ArticleItem }>()
const emit = defineEmits<{ open: [id: string | number] }>()
</script>

<template>
  <el-card class="featured" shadow="never" @click="emit('open', article.id)">
    <div class="featured-grid">
      <div class="cover">
        <span class="cover-mark">{{ (article.title || '文').charAt(0) }}</span>
      </div>
      <div class="featured-body">
        <el-tag size="small" type="primary" effect="dark">
          {{ article.isTop === 1 ? '置顶' : '精选' }}
        </el-tag>
        <h2>{{ article.title }}</h2>
        <p class="summary">{{ article.summary }}</p>
        <div class="meta">
          <span>{{ article.authorName }}</span>
          <span>{{ article.viewCount }} 阅读</span>
          <span>{{ article.commentCount }} 评论</span>
          <span>{{ formatDate(article.publishTime || article.createTime) }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.featured {
  cursor: pointer;
  margin-bottom: 16px;
  overflow: hidden;
}
.featured :deep(.el-card__body) {
  padding: 0;
}
.featured-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
}
.cover {
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
.cover-mark {
  font-size: 56px;
  font-weight: 700;
  color: var(--accent);
  opacity: 0.7;
}
.featured-body {
  padding: 24px 28px;
}
h2 {
  margin: 10px 0;
  font-size: 22px;
  line-height: 1.35;
  color: var(--ink);
}
.summary {
  margin: 0 0 14px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}
.meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 13px;
}
</style>
