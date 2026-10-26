<script setup lang="ts">
import { ElCard, ElButton } from 'element-plus'

defineProps<{
  likeCount: number
  liked?: boolean
  copied?: boolean
}>()

const emit = defineEmits<{ like: []; copy: []; top: [] }>()
</script>

<template>
  <el-card class="side-card" shadow="never">
    <template #header>
      <span>操作</span>
    </template>
    <div class="action-col">
      <el-button
        class="action-btn"
        :type="liked ? 'primary' : 'default'"
        plain
        @click="emit('like')"
      >
        {{ liked ? '已赞' : '点赞' }} {{ likeCount }}
      </el-button>
      <el-button class="action-btn" plain @click="emit('copy')">
        {{ copied ? '已复制链接' : '复制链接' }}
      </el-button>
      <el-button class="action-btn" plain @click="emit('top')">回到顶部</el-button>
    </div>
  </el-card>
</template>

<style scoped>
.action-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.action-btn {
  width: 100%;
  margin-left: 0 !important;
}
</style>
