<template>
  <router-view />

  <div v-if="toasts.length" class="blog-toasts" aria-live="polite">
    <div
      v-for="item in toasts"
      :key="item.id"
      :class="['blog-toast', item.type]"
      role="status"
    >
      {{ item.msg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem {
  id: number
  type: ToastType
  msg: string
}

const toasts = ref<ToastItem[]>([])
let seq = 0

function onToast(e: Event) {
  const detail = (e as CustomEvent<{ type?: ToastType; msg?: string }>).detail
  if (!detail?.msg) return
  const id = ++seq
  const type = detail.type || 'info'
  toasts.value.push({ id, type, msg: detail.msg })
  window.setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 2800)
}

onMounted(() => window.addEventListener('blog-toast', onToast as EventListener))
onBeforeUnmount(() => window.removeEventListener('blog-toast', onToast as EventListener))
</script>

<style scoped>
.blog-toasts {
  position: fixed;
  top: 88px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.blog-toast {
  max-width: 280px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #1f2329;
  background: #fff;
  border: 1px solid #e5e6eb;
  box-shadow: 0 6px 16px rgb(0 0 0 / 8%);
}

.blog-toast.success {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.blog-toast.error {
  border-color: #ffccc7;
  background: #fff2f0;
}

.blog-toast.warning {
  border-color: #ffe58f;
  background: #fffbe6;
}
</style>
