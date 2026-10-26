<script setup lang="ts">
import { ElCard, ElAvatar } from 'element-plus'

defineProps<{
  authorName: string
  authorAvatar?: string | null
  siteName: string
  viewCount: number
  likeCount: number
  commentCount: number
  liked?: boolean
}>()
</script>

<template>
  <el-card class="side-card author-card" shadow="never">
    <el-avatar :size="56" :src="authorAvatar || undefined" class="author-el-avatar">
      {{ (authorName || '作').charAt(0) }}
    </el-avatar>
    <h4 class="author-name">{{ authorName }}</h4>
    <p class="muted author-site">发表于 {{ siteName }}</p>
    <div class="site-stats">
      <div class="stat">
        <strong>{{ viewCount }}</strong>
        <span>阅读</span>
      </div>
      <div class="stat">
        <strong>{{ likeCount }}</strong>
        <span>点赞</span>
      </div>
      <div class="stat">
        <strong>{{ commentCount }}</strong>
        <span>评论</span>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.author-card {
  text-align: center;
}
.author-card :deep(.el-card__body) {
  padding: 20px 14px;
}
.author-el-avatar {
  margin: 2px auto 10px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  display: inline-flex;
}
.author-name {
  margin: 0 0 4px;
  font-size: 15px;
  color: var(--ink);
}
.author-site {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted);
}
.site-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat strong {
  font-size: 16px;
  color: var(--ink);
}
.stat span {
  font-size: 11px;
  color: var(--muted);
}
.muted {
  color: var(--muted);
}
</style>
