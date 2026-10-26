<script setup lang="ts">
import type { ArticleTagRef } from '@/api/blog'
import { ElCard, ElTag, ElEmpty } from 'element-plus'

defineProps<{ tags: ArticleTagRef[] }>()
const emit = defineEmits<{ filter: [id: string | number] }>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>标签</span>
    </template>
    <div class="tags" v-if="tags.length">
      <el-tag
        v-for="t in tags"
        :key="t.id"
        size="small"
        effect="plain"
        class="clickable"
        @click="emit('filter', t.id)"
      >{{ t.name }}</el-tag>
    </div>
    <el-empty v-else description="暂无标签" :image-size="48" />
  </el-card>
</template>

<style scoped>
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.clickable {
  cursor: pointer;
}
</style>
