<script setup lang="ts">
import type { ArticleItem } from '@/api/blog'
import { ElCard, ElPopover } from 'element-plus'
import { ref } from 'vue'

defineProps<{
  title: string
  items: ArticleItem[]
  currentId?: string | number
}>()

const emit = defineEmits<{ open: [id: string | number] }>()

/** 已溢出的文章 id 集合（截断时才弹全称） */
const overflowIds = ref(new Set<string>())

function onTitleEnter(e: MouseEvent, id: string | number) {
  const el = e.currentTarget as HTMLElement
  const key = String(id)
  if (el.scrollWidth > el.clientWidth + 1) {
    overflowIds.value.add(key)
  } else {
    overflowIds.value.delete(key)
  }
}

function onTitleLeave(id: string | number) {
  overflowIds.value.delete(String(id))
}
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>{{ title }}</span>
    </template>
    <ol class="hot-list">
      <li
        v-for="(h, i) in items"
        :key="h.id"
        :class="{ current: String(h.id) === String(currentId) }"
        @click="emit('open', h.id)"
      >
        <em class="rank">{{ i + 1 }}</em>
        <el-popover
          placement="top"
          :width="240"
          trigger="hover"
          :show-arrow="false"
          :disabled="!overflowIds.has(String(h.id))"
          popper-class="title-popper"
          effect="light"
          :show-after="80"
        >
          <template #reference>
            <span
              class="hot-title"
              @mouseenter="onTitleEnter($event, h.id)"
              @mouseleave="onTitleLeave(h.id)"
            >{{ h.title }}</span>
          </template>
          <div class="title-pop">{{ h.title }}</div>
        </el-popover>
      </li>
      <li v-if="!items.length" class="muted">暂无</li>
    </ol>
  </el-card>
</template>

<style scoped>
.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 280px;
  overflow-y: auto;
}
.hot-list li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 2px;
  font-size: 13px;
  cursor: pointer;
  line-height: 1.45;
  color: var(--ink);
}
.hot-list li:hover .hot-title,
.hot-list li.current .hot-title {
  color: var(--accent);
}
.hot-list li.current {
  background: var(--accent-soft);
  border-radius: 6px;
  padding-left: 6px;
  padding-right: 6px;
  font-weight: 600;
}
.rank {
  font-style: normal;
  font-weight: 700;
  color: var(--accent);
  width: 16px;
  flex-shrink: 0;
}
.hot-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.muted {
  color: var(--muted);
}
.title-pop {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink);
  word-break: break-word;
  white-space: normal;
}
</style>
