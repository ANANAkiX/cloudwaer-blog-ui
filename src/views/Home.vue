<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getArticleList,
  getCategoryList,
  getTagList,
  getHotArticles,
  type ArticleItem,
  type CategoryItem,
  type TagItem
} from '@/api/blog'
import { useSettingsStore } from '@/stores/settings'
import {
  defaultHomeModules,
  modulesByZone,
  normalizeModules,
  type LayoutModuleItem
} from '@/config/layoutModules'
import SiteProfileCard from '@/components/home/SiteProfileCard.vue'
import NavCard from '@/components/home/NavCard.vue'
import QuickLinksCard from '@/components/home/QuickLinksCard.vue'
import FeaturedCard from '@/components/home/FeaturedCard.vue'
import ArticleListCard from '@/components/home/ArticleListCard.vue'
import CategoryListCard from '@/components/home/CategoryListCard.vue'
import TagCloudCard from '@/components/home/TagCloudCard.vue'
import HotArticlesCard from '@/components/home/HotArticlesCard.vue'
import AboutCard from '@/components/home/AboutCard.vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

const aboutText = computed(() => {
  const desc = settingsStore.siteSetting?.siteDescription?.trim()
  if (desc) return desc
  return `${settingsStore.siteName} — 技术实践与工程记录，由 cloudwaer-blog 驱动。`
})

const homeModules = computed<LayoutModuleItem[]>(() =>
  normalizeModules(settingsStore.siteSetting?.homeLayout, defaultHomeModules(), [
    { key: 'siteProfile', label: '站点信息', zones: ['left'], hideable: true },
    { key: 'nav', label: '导航', zones: ['left'], hideable: true },
    { key: 'quickLinks', label: '快速入口', zones: ['left'], hideable: true },
    { key: 'featured', label: '精选大卡', zones: ['main'], hideable: true },
    { key: 'articleList', label: '文章列表', zones: ['main'], hideable: false },
    { key: 'categoryList', label: '分类', zones: ['right'], hideable: true },
    { key: 'tagCloud', label: '标签云', zones: ['right'], hideable: true },
    { key: 'hotArticles', label: '热门文章', zones: ['right'], hideable: true },
    { key: 'about', label: '关于', zones: ['right'], hideable: true }
  ])
)

const leftMods = computed(() => modulesByZone(homeModules.value, 'left'))
const mainMods = computed(() => modulesByZone(homeModules.value, 'main'))
const rightMods = computed(() => modulesByZone(homeModules.value, 'right'))

const articles = ref<ArticleItem[]>([])
const categories = ref<CategoryItem[]>([])
const tags = ref<TagItem[]>([])
const hotArticles = ref<ArticleItem[]>([])
const total = ref(0)
const size = 10

const current = computed(() => Math.max(1, Number(route.query.current) || 1))
const pages = computed(() => Math.max(1, Math.ceil(total.value / size)))
const keyword = computed(() => (route.query.keyword as string) || '')
const categoryId = computed(() => (route.query.categoryId as string) || '')
const tagId = computed(() => (route.query.tagId as string) || '')
const hasFilter = computed(() => !!(keyword.value || categoryId.value || tagId.value))

const featured = computed<ArticleItem | null>(() => {
  if (hasFilter.value || current.value > 1) return null
  return articles.value.find(a => a.isTop === 1 || a.isRecommend === 1) || null
})

const listItems = computed<ArticleItem[]>(() => {
  const showFeatured = homeModsHas('featured')
  if (!showFeatured || !featured.value) return articles.value
  return articles.value.filter(a => a.id !== featured.value!.id)
})

function homeModsHas(key: string) {
  return mainMods.value.some(m => m.key === key && m.visible)
}

function isActiveNav(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

function goNav(path: string) {
  if (!path) return
  router.push(path)
}

async function fetchList() {
  try {
    const result = await getArticleList({
      current: current.value,
      size,
      keyword: keyword.value || undefined,
      categoryId: categoryId.value || undefined,
      tagId: tagId.value || undefined
    })
    articles.value = result.records || []
    total.value = result.total || 0
  } catch (e) {
    articles.value = []
    total.value = 0
    console.error(e)
  }
}

function goPage(p: number) {
  router.push({
    path: '/',
    query: {
      ...route.query,
      current: p > 1 ? String(p) : undefined
    }
  })
}

function filterByCategory(id: string | number) {
  const next = isActiveCategory(id) ? undefined : String(id)
  router.push({ path: '/', query: { ...route.query, categoryId: next, current: undefined, tagId: undefined } })
}

function filterByTag(id: string | number) {
  const next = isActiveTag(id) ? undefined : String(id)
  router.push({ path: '/', query: { ...route.query, tagId: next, current: undefined, categoryId: undefined } })
}

function isActiveCategory(id: string | number) {
  return categoryId.value === String(id)
}

function isActiveTag(id: string | number) {
  return tagId.value === String(id)
}

function goDetail(a: ArticleItem) {
  router.push(`/article/${a.id}`)
}

function goById(id: string | number) {
  router.push(`/article/${id}`)
}

onMounted(async () => {
  await fetchList()
  try {
    const [cats, ts, hot] = await Promise.all([getCategoryList(), getTagList(), getHotArticles(5)])
    categories.value = cats
    tags.value = ts
    hotArticles.value = hot || []
  } catch (e) {
    console.error(e)
  }
})

watch(
  () => route.query,
  () => {
    fetchList()
  }
)
</script>

<template>
  <div class="home">
    <aside class="home-left">
      <template v-for="m in leftMods" :key="m.key">
        <SiteProfileCard
          v-if="m.key === 'siteProfile'"
          :site-name="settingsStore.siteName"
          :about-text="aboutText"
          :total="total"
          :category-count="categories.length"
          :tag-count="tags.length"
        />
        <NavCard
          v-else-if="m.key === 'nav'"
          :items="settingsStore.navItems"
          :is-active="isActiveNav"
          @go="goNav"
        />
        <QuickLinksCard
          v-else-if="m.key === 'quickLinks'"
          :is-active="isActiveNav"
          @go="goNav"
        />
      </template>
    </aside>

    <div class="home-main">
      <template v-for="m in mainMods" :key="m.key">
        <FeaturedCard
          v-if="m.key === 'featured' && featured"
          :article="featured"
          @open="goById"
        />
        <ArticleListCard
          v-else-if="m.key === 'articleList'"
          :articles="listItems"
          :empty="!articles.length"
          :current="current"
          :pages="pages"
          @open="goById"
          @filter-tag="filterByTag"
          @page="goPage"
        />
      </template>
    </div>

    <aside class="side">
      <template v-for="m in rightMods" :key="m.key">
        <CategoryListCard
          v-if="m.key === 'categoryList'"
          :categories="categories"
          :is-active="isActiveCategory"
          @select="filterByCategory"
        />
        <TagCloudCard
          v-else-if="m.key === 'tagCloud'"
          :tags="tags"
          :is-active="isActiveTag"
          @select="filterByTag"
        />
        <HotArticlesCard
          v-else-if="m.key === 'hotArticles'"
          :articles="hotArticles"
          @open="goById"
        />
        <AboutCard
          v-else-if="m.key === 'about'"
          :about-text="aboutText"
        />
      </template>
    </aside>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}
.home-left,
.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 84px;
}
.home-main {
  min-width: 0;
}
@media (max-width: 1100px) {
  .home {
    grid-template-columns: 200px minmax(0, 1fr);
  }
  .side {
    display: none;
  }
}
@media (max-width: 800px) {
  .home {
    grid-template-columns: 1fr;
  }
  .home-left {
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
</style>
