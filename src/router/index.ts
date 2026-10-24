import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import BlogLayout from '@/layouts/BlogLayout.vue'

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
  document.title = title ? `${title} · 云记博客` : '云记博客'
})

export default router
