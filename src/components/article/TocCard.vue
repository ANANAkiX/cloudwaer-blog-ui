<script setup lang="ts">
import { ElCard } from 'element-plus'

export interface TocItem {
  id: string
  text: string
  level: number
}

defineProps<{
  toc: TocItem[]
  activeId?: string
}>()

const emit = defineEmits<{ jump: [id: string] }>()
</script>

<template>
  <el-card class="side-card toc-card" shadow="never">
    <template #header>
      <span>目录</span>
    </template>
    <ul class="toc-list">
      <li
        v-for="item in toc"
        :key="item.id"
        :class="['level-' + item.level, { active: activeId === item.id }]"
        @click="emit('jump', item.id)"
      >
        {{ item.text }}
      </li>
    </ul>
  </el-card>
</template>

<style scoped>
.toc-card {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.toc-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
}
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  max-height: calc(70vh - 56px);
  overscroll-behavior: contain;
}
.toc-list li {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: var(--muted);
  line-height: 1.4;
}
.toc-list li:hover {
  color: var(--accent);
}
.toc-list li.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.toc-list li.level-3 {
  padding-left: 22px;
  font-size: 12px;
}
</style>
