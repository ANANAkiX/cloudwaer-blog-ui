<script setup lang="ts">
import { ElMenu, ElMenuItem } from 'element-plus'

withDefaults(
  defineProps<{
    links?: Array<{ label: string; path: string }>
    isActive: (path: string) => boolean
  }>(),
  {
    links: () => [
      { label: '全部文章', path: '/' },
      { label: '归档', path: '/archive' },
      { label: '微论坛', path: '/forum' },
      { label: '写文章', path: '/write' }
    ]
  }
)

const emit = defineEmits<{ go: [path: string] }>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>快速入口</span>
    </template>
    <el-menu class="nav-menu" :ellipsis="false">
      <el-menu-item
        v-for="link in links"
        :key="link.path + link.label"
        :index="link.path"
        @click="emit('go', link.path)"
      >
        {{ link.label }}
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
.nav-menu .el-menu-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
