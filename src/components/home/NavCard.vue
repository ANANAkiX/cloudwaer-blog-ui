<script setup lang="ts">
import type { NavSettingItem } from '@/api/blog'
import { ElMenu, ElMenuItem } from 'element-plus'

defineProps<{
  items: NavSettingItem[]
  isActive: (path: string) => boolean
}>()

const emit = defineEmits<{ go: [path: string] }>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>导航</span>
    </template>
    <el-menu class="nav-menu" :ellipsis="false">
      <el-menu-item
        v-for="item in items"
        :key="item.key || item.path"
        :index="item.path || '/'"
        :class="{ active: isActive(item.path || '/') }"
        @click="emit('go', item.path || '/')"
      >
        {{ item.label || item.path }}
      </el-menu-item>
    </el-menu>
  </el-card>
</template>

<style scoped>
.nav-menu {
  border-right: none !important;
  padding: 0;
}
.nav-menu .el-menu-item {
  height: 36px;
  line-height: 36px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ink);
}
.nav-menu .el-menu-item:hover,
.nav-menu .el-menu-item.is-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
</style>
