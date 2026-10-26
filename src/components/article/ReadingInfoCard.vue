<script setup lang="ts">
import { ElCard } from 'element-plus'

defineProps<{
  publishTime?: string | null
  createTime?: string | null
  updateTime?: string | null
  wordCount: number
  readingMinutes: number
  formatDate: (v?: string | null) => string
}>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>阅读信息</span>
    </template>
    <ul class="info-list">
      <li><span>发布</span><em>{{ formatDate(publishTime || createTime) }}</em></li>
      <li><span>字数</span><em>{{ wordCount }}</em></li>
      <li><span>预计</span><em>{{ readingMinutes }} 分钟</em></li>
      <li v-if="updateTime"><span>更新</span><em>{{ formatDate(updateTime) }}</em></li>
    </ul>
  </el-card>
</template>

<style scoped>
.info-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.info-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}
.info-list span {
  color: var(--muted);
}
.info-list em {
  font-style: normal;
  color: var(--ink);
  text-align: right;
}
</style>
