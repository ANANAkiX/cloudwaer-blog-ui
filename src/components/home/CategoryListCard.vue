<script setup lang="ts">
import type { CategoryItem } from '@/api/blog'

defineProps<{
  categories: CategoryItem[]
  isActive: (id: string | number) => boolean
}>()

const emit = defineEmits<{ select: [id: string | number] }>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>分类</span>
    </template>
    <ul class="cat-list">
      <li
        v-for="c in categories"
        :key="c.id"
        :class="{ active: isActive(c.id) }"
        @click="emit('select', c.id)"
      >
        {{ c.name }}
        <em v-if="c.articleCount" class="cat-count">{{ c.articleCount }}</em>
      </li>
      <li v-if="!categories.length" class="muted">暂无分类</li>
    </ul>
  </el-card>
</template>

<style scoped>
.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cat-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--ink);
  line-height: 1.5;
}
.cat-list li:hover,
.cat-list li.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.cat-count {
  font-style: normal;
  font-size: 12px;
  color: var(--muted);
}
.muted {
  color: var(--muted);
  font-size: 13px;
  padding: 8px 12px;
}
</style>
