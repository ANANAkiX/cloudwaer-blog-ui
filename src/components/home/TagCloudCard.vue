<script setup lang="ts">
import type { TagItem } from '@/api/blog'
import { ElTag } from 'element-plus'

defineProps<{
  tags: TagItem[]
  isActive: (id: string | number) => boolean
}>()

const emit = defineEmits<{ select: [id: string | number] }>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>标签云</span>
    </template>
    <div class="tags">
      <el-tag
        v-for="t in tags"
        :key="t.id"
        :type="isActive(t.id) ? 'primary' : 'info'"
        :effect="isActive(t.id) ? 'dark' : 'plain'"
        size="small"
        class="tag-item"
        :title="`${t.useCount ?? 0} 篇文章`"
        @click="emit('select', t.id)"
      >{{ t.name }}<em v-if="t.useCount" class="tag-count">{{ t.useCount }}</em></el-tag>
      <span v-if="!tags.length" class="muted">暂无标签</span>
    </div>
  </el-card>
</template>

<style scoped>
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-item {
  cursor: pointer;
}
.tag-count {
  margin-left: 4px;
  font-style: normal;
  opacity: 0.75;
  font-size: 11px;
}
.muted {
  color: var(--muted);
  font-size: 13px;
}
</style>
