<script setup lang="ts">
import { ElCard } from 'element-plus'

defineProps<{ aboutText: string }>()
</script>

<template>
  <el-card class="side-card about" shadow="never">
    <template #header>
      <span>关于</span>
    </template>
    <p class="muted">{{ aboutText }}</p>
    <router-link to="/about" class="more-link">了解更多 →</router-link>
  </el-card>
</template>

<style scoped>
.about p {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted);
}
.more-link {
  font-size: 13px;
  color: var(--accent);
}
.muted {
  color: var(--muted);
}
</style>
