<template>
  <router-view />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

type ToastType = 'success' | 'error' | 'warning' | 'info'

function onToast(e: Event) {
  const detail = (e as CustomEvent<{ type?: ToastType; msg?: string }>).detail
  if (!detail?.msg) return
  const type = detail.type || 'info'
  if (type === 'success') ElMessage.success(detail.msg)
  else if (type === 'error') ElMessage.error(detail.msg)
  else if (type === 'warning') ElMessage.warning(detail.msg)
  else ElMessage.info(detail.msg)
}

onMounted(() => window.addEventListener('blog-toast', onToast as EventListener))
onBeforeUnmount(() => window.removeEventListener('blog-toast', onToast as EventListener))
</script>
