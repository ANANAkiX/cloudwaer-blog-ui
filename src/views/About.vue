<template>
  <div class="about-page">
    <el-card class="hero" shadow="never">
      <h1>{{ aboutTitle }}</h1>
      <p class="lead">{{ aboutContent }}</p>
    </el-card>

    <div class="about-grid">
      <el-card class="block" shadow="never">
        <template #header><span>本站能做什么</span></template>
        <ul>
          <li>多作者入驻：访客申请成为博客主，独立撰写与管理文章</li>
          <li>Markdown 写作：代码高亮、目录导航、分类标签筛选</li>
          <li>互动：评论审核、点赞、热度排序、微论坛短帖</li>
          <li>管理后台：文章 / 评论 / 论坛 / 权限一体化（Cloudwaer Admin）</li>
        </ul>
      </el-card>

      <div class="about-side">
        <el-card class="block" shadow="never">
          <template #header><span>技术栈</span></template>
          <div class="stack">
            <el-tag v-for="s in ['Spring Boot 3','Spring Cloud','MyBatis-Plus','Vue 3','Vite','Element Plus']" :key="s" size="small" effect="plain">
              {{ s }}
            </el-tag>
          </div>
        </el-card>

        <el-card class="block" shadow="never">
          <template #header><span>友链</span></template>
          <p class="muted">欢迎同类技术博客互换友链，可先在微论坛留言。</p>
          <ul>
            <li><a href="https://spring.io" target="_blank" rel="noopener">Spring</a> — 官方文档</li>
            <li><a href="https://vuejs.org" target="_blank" rel="noopener">Vue.js</a> — 渐进式前端框架</li>
          </ul>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElCard, ElTag } from 'element-plus'

const settingsStore = useSettingsStore()

const aboutTitle = computed(() => settingsStore.aboutPage.title)
const aboutContent = computed(
  () =>
    settingsStore.aboutPage.content ||
    '云记博客是基于 cloudwaer-blog 的多作者技术写作与轻论坛平台，记录工程实践、踩坑与思考。'
)
</script>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.hero {
  padding: 32px 36px;
}

.hero h1 {
  margin: 0 0 12px;
  font-size: 28px;
}

.lead {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.8;
  max-width: 72ch;
}

.about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.about-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block {
  padding: 22px 28px;
}

.block h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.block ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
}

.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 999px;
}

.block a {
  color: var(--accent);
}

.muted {
  color: #9ca3af;
  font-size: 13px;
}

@media (max-width: 900px) {
  .about-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    padding: 24px 20px;
  }

  .hero h1 {
    font-size: 24px;
  }
}
</style>
