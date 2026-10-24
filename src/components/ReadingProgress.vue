<template>
  <div class="reading-progress" :title="t('readingProgress')" aria-hidden="true">
    <div class="bar" :style="{ width: percent + '%' }" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const t = (k: string) => store.t(k)
const percent = ref(0)

function calc() {
  const el = document.documentElement
  const scrollTop = el.scrollTop || document.body.scrollTop
  const height = el.scrollHeight - el.clientHeight
  percent.value = height <= 0 ? 0 : Math.min(100, Math.max(0, (scrollTop / height) * 100))
}

onMounted(() => {
  calc()
  window.addEventListener('scroll', calc, { passive: true })
  window.addEventListener('resize', calc)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', calc)
  window.removeEventListener('resize', calc)
})
</script>

<style scoped>
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--progress-h, 3px);
  z-index: 100;
  pointer-events: none;
  background: transparent;
}

.bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, var(--accent), #7c9aff);
  transition: width 0.08s linear;
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 40%, transparent);
}
</style>
