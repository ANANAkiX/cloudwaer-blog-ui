import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import BlogLayout from '@/layouts/BlogLayout.vue'
import { useSettingsStore } from '@/stores/settings'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: BlogLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'article/:id',
        name: 'article',
        component: () => import('@/views/Article.vue'),
        meta: { title: '文章' }
      },
      {
        path: 'forum',
        name: 'forum',
        component: () => import('@/views/Forum.vue'),
        meta: { title: '微论坛' }
      },
      {
        path: 'forum/:id',
        name: 'topic',
        component: () => import('@/views/Topic.vue'),
        meta: { title: '话题' }
      },
      {
        path: 'archive',
        name: 'archive',
        component: () => import('@/views/Archive.vue'),
        meta: { title: '归档' }
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/About.vue'),
        meta: { title: '关于' }
      },
      {
        path: 'write',
        name: 'write',
        component: () => import('@/views/Write.vue'),
        meta: { title: '写文章' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心' }
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/Login.vue'),
        meta: { title: '登录' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

router.afterEach(to => {
  const title = to.meta.title as string | undefined
  let siteName = '云记博客'
  try {
    siteName = useSettingsStore().siteName || siteName
  } catch {
    // pinia 未就绪时回落默认站名
  }
  document.title = title ? `${title} · ${siteName}` : siteName
})

export default router
