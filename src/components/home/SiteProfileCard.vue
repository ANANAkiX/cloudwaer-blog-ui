<script setup lang="ts">
defineProps<{
  siteName: string
  aboutText: string
  total: number
  categoryCount: number
  tagCount: number
}>()
</script>

<template>
  <el-card class="side-card site-card" shadow="never">
    <div class="site-avatar">{{ (siteName || '云').charAt(0) }}</div>
    <h4 class="site-name">{{ siteName }}</h4>
    <p class="muted site-desc">{{ aboutText }}</p>
    <div class="site-stats">
      <div class="stat">
        <strong>{{ total }}</strong>
        <span>文章</span>
      </div>
      <div class="stat">
        <strong>{{ categoryCount }}</strong>
        <span>分类</span>
      </div>
      <div class="stat">
        <strong>{{ tagCount }}</strong>
        <span>标签</span>
      </div>
    </div>
    <router-link to="/about" class="more-link">关于本站 →</router-link>
  </el-card>
</template>

<style scoped>
.site-card {
  text-align: center;
}
.site-card :deep(.el-card__body) {
  padding: 20px 16px;
}
.site-avatar {
  width: 64px;
  height: 64px;
  margin: 4px auto 12px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.site-name {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--ink);
}
.site-desc {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--muted);
}
.site-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat strong {
  font-size: 18px;
  color: var(--ink);
}
.stat span {
  font-size: 12px;
  color: var(--muted);
}
.more-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--accent);
}
</style>
