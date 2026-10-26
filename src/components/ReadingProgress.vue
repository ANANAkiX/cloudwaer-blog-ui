<template>
  <div class="reading-progress" :title="t('readingProgress')" aria-hidden="true">
    <div class="bar" :style="{ width: percent + '%' }" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const route = useRoute()
const t = (k: string) => store.t(k)
const percent = ref(0)

let boundTarget: HTMLElement | null = null
let retryTimer: number | null = null
let observer: MutationObserver | null = null

function scrollTarget(): HTMLElement | null {
  return document.querySelector('.article-main')
}

function calc() {
  const target = scrollTarget()
  if (target) {
    const h = target.scrollHeight - target.clientHeight
    percent.value = h <= 0 ? 0 : Math.min(100, Math.max(0, (target.scrollTop / h) * 100))
    return
  }
  const el = document.documentElement
  const scrollTop = el.scrollTop || document.body.scrollTop
  const height = el.scrollHeight - el.clientHeight
  percent.value = height <= 0 ? 0 : Math.min(100, Math.max(0, (scrollTop / height) * 100))
}

function unbind() {
  window.removeEventListener('scroll', calc)
  boundTarget?.removeEventListener('scroll', calc)
  boundTarget = null
  if (retryTimer != null) {
    window.clearTimeout(retryTimer)
    retryTimer = null
  }
}

function bind() {
  unbind()
  stopObserve()

  // 详情页：优先绑正文容器；加载中可能尚未挂载，稍后重试
  if (route.name === 'article') {
    const target = scrollTarget()
    if (!target) {
      retryTimer = window.setTimeout(bind, 150)
      observeShell()
      return
    }
    boundTarget = target
    target.addEventListener('scroll', calc, { passive: true })
    calc()
    return
  }

  // 其它页面：整页滚动
  window.addEventListener('scroll', calc, { passive: true })
  calc()
}

function observeShell() {
  const root = document.querySelector('.site-main') || document.body
  observer = new MutationObserver(() => {
    if (scrollTarget()) {
      bind()
    }
  })
  observer.observe(root, { childList: true, subtree: true })
}

function stopObserve() {
  observer?.disconnect()
  observer = null
}

onMounted(() => {
  bind()
  window.addEventListener('resize', calc)
})

onBeforeUnmount(() => {
  unbind()
  stopObserve()
  window.removeEventListener('resize', calc)
})

watch(
  () => route.fullPath,
  () => {
    // 路由变化后等一帧，让目标页 DOM 挂上
    requestAnimationFrame(bind)
  },
  { flush: 'post' }
)
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
