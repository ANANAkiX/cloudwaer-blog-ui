<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { goLogin } from '@/router'
import { getToken, getUsername, setAvatar } from '@/stores/auth'
import { formatDate } from '@/utils/date'
import {
  pageMyArticles,
  pageMyCollections,
  saveMyCollection,
  deleteMyCollection,
  getMyCollectionArticles,
  bindArticleCollection,
  getMyProfile,
  updateMyProfile,
  uploadMyFile,
  applyAuthor,
  getMyAuthorApply,
  getMyBloggerStatus,
  deleteMyArticle,
  updateMyArticle,
  getMyArticleDetail,
  type ArticleItem,
  type CollectionItem,
  type AuthorApply,
  type BloggerStatus
} from '@/api/blog'
import {
  ElCard,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElPagination,
  ElEmpty,
  ElTag,
  ElAvatar,
  ElForm,
  ElFormItem,
  ElDivider,
  ElAlert,
  ElMessage,
  ElMessageBox,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem
} from 'element-plus'

const router = useRouter()
const route = useRoute()
const username = computed(() => getUsername())
/** 展示名：昵称优先，回退账号 */
const displayName = ref('')
const accountForm = ref({ nickname: '', avatarUrl: '', email: '', phone: '' })
const displayChar = computed(() => {
  const n = displayName.value || username.value || '我'
  return n.charAt(0).toUpperCase()
})
const displayAvatarUrl = computed(() => accountForm.value.avatarUrl || '')

type TabKey = 'overview' | 'articles' | 'collections' | 'account'
const activeTab = ref<TabKey>('overview')

const articles = ref<ArticleItem[]>([])
const articleTotal = ref(0)
const collections = ref<CollectionItem[]>([])
const collectionTotal = ref(0)
const loading = ref(false)

const articleQuery = ref({
  current: 1,
  size: 10,
  keyword: '',
  publishStatus: undefined as number | undefined
})
const collectionQuery = ref({ current: 1, size: 10, keyword: '' })

const articlePages = computed(() => Math.max(1, Math.ceil(articleTotal.value / articleQuery.value.size)))
const collectionPages = computed(() => Math.max(1, Math.ceil(collectionTotal.value / collectionQuery.value.size)))

async function loadOverview() {
  loading.value = true
  try {
    const [a, c] = await Promise.all([
      pageMyArticles({ current: 1, size: 5 }),
      pageMyCollections({ current: 1, size: 6 })
    ])
    articles.value = a.records || []
    articleTotal.value = Number(a.total || 0)
    collections.value = c.records || []
    collectionTotal.value = Number(c.total || 0)
  } finally {
    loading.value = false
  }
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await pageMyArticles({
      current: articleQuery.value.current,
      size: articleQuery.value.size,
      keyword: articleQuery.value.keyword || undefined,
      publishStatus: articleQuery.value.publishStatus
    })
    articles.value = res.records || []
    articleTotal.value = Number(res.total || 0)
  } finally {
    loading.value = false
  }
}

async function loadCollections() {
  loading.value = true
  try {
    const res = await pageMyCollections({
      current: collectionQuery.value.current,
      size: collectionQuery.value.size,
      keyword: collectionQuery.value.keyword || undefined
    })
    collections.value = res.records || []
    collectionTotal.value = Number(res.total || 0)
  } finally {
    loading.value = false
  }
}

function onTabChange(name: TabKey | string) {
  activeTab.value = name as TabKey
  if (name === 'overview') {
    void loadOverview()
    void loadBloggerApply()
    void loadBloggerStatus()
  }
  if (name === 'articles') void loadArticles()
  if (name === 'collections') void loadCollections()
}

// ===== 博客主申请 =====
const bloggerApply = ref<AuthorApply | null>(null)
const applyReason = ref('')
const applying = ref(false)
/** 自助查询的暂停状态（管理员在管理端封禁后，这里可见） */
const bloggerStatus = ref<BloggerStatus | null>(null)
/** 接口失败与「无封禁记录」必须区分：失败时不能伪装成正常 */
const statusError = ref(false)

const suspended = computed(() => !!bloggerStatus.value?.suspended)

const suspendUntilText = computed(() => {
  const s = bloggerStatus.value
  if (!s?.suspended) return '永久'
  return s.suspendUntil ? formatDate(s.suspendUntil) : '永久'
})

async function loadBloggerStatus() {
  if (!getToken()) return
  try {
    bloggerStatus.value = await getMyBloggerStatus()
    statusError.value = false
  } catch (e) {
    bloggerStatus.value = null
    statusError.value = true
    console.warn('[blog] 暂停状态获取失败', e)
  }
}

const bloggerStatusTag = computed(() => {
  const s = bloggerApply.value?.applyStatus
  if (s === 0) return { label: '审核中', type: 'warning' as const }
  if (s === 1) return { label: '已通过', type: 'success' as const }
  if (s === 2) return { label: '已拒绝', type: 'danger' as const }
  return { label: '未申请', type: 'info' as const }
})

/** 未申请 或 被拒后都可再次提交 */
const canApplyBlogger = computed(
  () => !bloggerApply.value || bloggerApply.value.applyStatus === 2
)

async function loadBloggerApply() {
  if (!getToken()) return
  try {
    bloggerApply.value = await getMyAuthorApply()
  } catch {
    bloggerApply.value = null
  }
}

async function submitBloggerApply() {
  if (!getToken()) {
    goLogin()
    return
  }
  applying.value = true
  try {
    await applyAuthor(applyReason.value.trim() || undefined)
    applyReason.value = ''
    ElMessage.success('申请已提交，管理员审核通过后你即可发布文章')
    bloggerApply.value = await getMyAuthorApply()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '申请失败，请稍后再试')
  } finally {
    applying.value = false
  }
}

function goArticle(id: string | number) {
  router.push(`/article/${id}`)
}

// ===== 我的文章：编辑 / 查看 / 下线 / 删除 =====
function editArticle(id: string | number) {
  router.push(`/write?id=${id}`)
}

/** 已发布看前台，其它状态（草稿/待审/已下线）进编辑器查看 */
function viewArticle(a: ArticleItem) {
  if (a.publishStatus === 1) goArticle(a.id)
  else editArticle(a.id)
}

async function removeArticle(a: ArticleItem) {
  try {
    await ElMessageBox.confirm(`删除「${a.title}」？其楼中楼评论会一并删除，不可恢复。`, '删除文章', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteMyArticle(a.id)
    ElMessage.success('已删除')
    if (activeTab.value === 'articles') void loadArticles()
    else void loadOverview()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/** 下线：取详情后改 publishStatus=2（列表行不带正文，接口要求标题正文必填） */
async function offlineArticle(a: ArticleItem) {
  try {
    await ElMessageBox.confirm(`下线「${a.title}」？下线后前台不再展示，可随时重新发布。`, '下线文章', {
      confirmButtonText: '确定下线',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    const detail = await getMyArticleDetail(a.id)
    await updateMyArticle({
      id: detail.id,
      title: detail.title,
      summary: detail.summary || undefined,
      content: detail.content || '',
      coverUrl: detail.coverUrl || undefined,
      categoryId: detail.categoryId ?? null,
      collectionId: detail.collectionId ?? null,
      tagIds: (detail.tags || []).map(t => t.id),
      publishStatus: 2
    })
    ElMessage.success('已下线')
    if (activeTab.value === 'articles') void loadArticles()
    else void loadOverview()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '下线失败')
  }
}

function statusLabel(s?: number) {
  if (s === 0) return '草稿'
  if (s === 1) return '已发布'
  if (s === 2) return '已下线'
  if (s === 3) return '待审核'
  return '—'
}

function statusType(s?: number): 'info' | 'success' | 'warning' {
  if (s === 1) return 'success'
  if (s === 3) return 'warning'
  return 'info'
}

// ===== 合集管理 =====
const collectionDialog = ref(false)
const collectionSaving = ref(false)
const collectionForm = ref<{ id?: string | number; name: string; description: string }>({
  name: '',
  description: ''
})

const manageCollection = ref<CollectionItem | null>(null)
const collectionArticles = ref<ArticleItem[]>([])
const collectionArticlesTotal = ref(0)
const collectionArticleQuery = ref({ current: 1, size: 10 })
const candidateArticles = ref<ArticleItem[]>([])
const addArticleId = ref<string | number | null>(null)

async function openCollectionDialog(row?: CollectionItem) {
  collectionForm.value = row
    ? { id: row.id, name: row.name, description: row.description || '' }
    : { name: '', description: '' }
  collectionDialog.value = true
}

async function saveCollectionForm() {
  if (!collectionForm.value.name.trim()) {
    ElMessage.warning('请输入合集名称')
    return
  }
  collectionSaving.value = true
  try {
    await saveMyCollection({
      id: collectionForm.value.id,
      name: collectionForm.value.name.trim(),
      description: collectionForm.value.description.trim() || undefined
    })
    ElMessage.success('已保存')
    collectionDialog.value = false
    await loadCollections()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    collectionSaving.value = false
  }
}

async function removeCollection(row: CollectionItem) {
  try {
    await ElMessageBox.confirm(`删除合集「${row.name}」？旗下文章将解除绑定。`, '提示', {
      type: 'warning'
    })
    await deleteMyCollection(String(row.id))
    ElMessage.success('已删除')
    await loadCollections()
  } catch {
    /* cancel */
  }
}

function onCollectionCommand(cmd: string, row: CollectionItem) {
  if (cmd === 'manage') void openManage(row)
  if (cmd === 'edit') void openCollectionDialog(row)
  if (cmd === 'delete') void removeCollection(row)
}

async function openManage(row: CollectionItem) {
  manageCollection.value = row
  collectionArticleQuery.value.current = 1
  await loadCollectionArticles()
}

async function loadCollectionArticles() {
  if (!manageCollection.value) return
  loading.value = true
  try {
    const res = await getMyCollectionArticles(manageCollection.value.id, {
      current: collectionArticleQuery.value.current,
      size: collectionArticleQuery.value.size
    })
    collectionArticles.value = res.records || []
    collectionArticlesTotal.value = Number(res.total || 0)
    // 候选：本人未在本合集的文章
    const inIds = new Set(collectionArticles.value.map(a => String(a.id)))
    const all = await pageMyArticles({ current: 1, size: 50 })
    candidateArticles.value = (all.records || []).filter(a => !inIds.has(String(a.id)))
  } finally {
    loading.value = false
  }
}

async function onAddArticleToCollection() {
  if (!manageCollection.value || !addArticleId.value) return
  try {
    await bindArticleCollection(addArticleId.value, manageCollection.value.id)
    ElMessage.success('已加入合集')
    addArticleId.value = null
    await loadCollectionArticles()
    await loadCollections()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加入失败')
  }
}

async function onRemoveArticleFromCollection(a: ArticleItem) {
  try {
    await ElMessageBox.confirm(`将「${a.title}」移出合集？`, '提示', { type: 'warning' })
    await bindArticleCollection(a.id, null)
    ElMessage.success('已移出')
    await loadCollectionArticles()
    await loadCollections()
  } catch {
    /* cancel */
  }
}

function closeManage() {
  manageCollection.value = null
  collectionArticles.value = []
}

const accountSaving = ref(false)
const avatarUploading = ref(false)
const avatarFileInput = ref<HTMLInputElement | null>(null)

async function loadAccount() {
  try {
    const p = await getMyProfile()
    displayName.value = (p.nickname || p.username || '').trim()
    accountForm.value = {
      nickname: p.nickname || '',
      avatarUrl: p.avatar || '',
      email: p.email || '',
      phone: p.phone || ''
    }
    setAvatar(p.avatar || '')
  } catch {
    /* 未登录或接口失败 */
  }
}

async function onAvatarPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  avatarUploading.value = true
  try {
    const res = await uploadMyFile(file, 'avatar')
    if (res?.accessUrl) {
      accountForm.value.avatarUrl = res.accessUrl
      await updateMyProfile({ avatar: res.accessUrl })
      setAvatar(res.accessUrl)
      ElMessage.success('头像已更新')
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '头像上传失败')
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

async function saveAccount() {
  accountSaving.value = true
  try {
    await updateMyProfile({
      nickname: accountForm.value.nickname?.trim() || undefined,
      email: accountForm.value.email,
      phone: accountForm.value.phone,
      avatar: accountForm.value.avatarUrl || undefined
    })
    if (accountForm.value.nickname?.trim()) {
      displayName.value = accountForm.value.nickname.trim()
    }
    setAvatar(accountForm.value.avatarUrl || '')
    ElMessage.success('资料已保存')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    accountSaving.value = false
  }
}

onMounted(() => {
  if (!getToken()) {
    // 用 replace 并记住来源：避免回退键在 /profile ↔ /login 之间来回弹
    router.replace({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  // 支持 /profile?tab=articles 直达（写文章保存后回跳）
  const tab = route.query.tab
  if (tab === 'articles' || tab === 'collections' || tab === 'account' || tab === 'overview') {
    activeTab.value = tab
  }
  void loadAccount()
  void loadOverview()
  void loadBloggerApply()
  void loadBloggerStatus()
  if (activeTab.value === 'articles') void loadArticles()
  if (activeTab.value === 'collections') void loadCollections()
})

watch(articleQuery, () => {
  if (activeTab.value === 'articles') void loadArticles()
}, { deep: true })
</script>

<template>
  <div class="profile-page">
    <el-card class="profile-left" shadow="never">
      <div class="profile-avatar-wrap">
        <el-avatar :size="56" :src="displayAvatarUrl || undefined" class="profile-el-avatar">
          {{ displayChar }}
        </el-avatar>
      </div>
      <h3 class="profile-name">{{ displayName || username || '未登录' }}</h3>
      <p class="profile-account muted">账号 {{ username }}</p>
      <p class="profile-role muted">博客主 · 云记</p>

      <div class="profile-stats">
        <div class="stat">
          <strong>{{ articleTotal }}</strong>
          <span>文章</span>
        </div>
        <div class="stat">
          <strong>{{ collectionTotal }}</strong>
          <span>合集</span>
        </div>
        <div class="stat">
          <strong>—</strong>
          <span>阅读</span>
        </div>
      </div>

      <el-menu class="profile-nav" :default-active="activeTab" @select="onTabChange">
        <el-menu-item index="overview">概览</el-menu-item>
        <el-menu-item index="articles">我的文章</el-menu-item>
        <el-menu-item index="collections">我的合集</el-menu-item>
        <el-menu-item index="account">账号设置</el-menu-item>
      </el-menu>
    </el-card>

    <el-card class="profile-main" shadow="never" v-loading="loading">
      <!-- 概览 -->
      <template v-if="activeTab === 'overview'">
        <div class="main-head">
          <h2>概览</h2>
        </div>

        <!-- 博客主申请 -->
        <section class="apply-card">
          <div class="apply-head">
            <strong>博客主申请</strong>
            <el-tag size="small" :type="bloggerStatusTag.type">{{ bloggerStatusTag.label }}</el-tag>
            <el-tag v-if="suspended" size="small" type="danger">封禁中</el-tag>
          </div>

          <!-- 暂停状态优先展示：封禁期内无法发布，覆盖「已通过」的乐观文案 -->
          <p v-if="suspended" class="apply-suspend">
            博客主权限已封禁至 {{ suspendUntilText }}<template v-if="bloggerStatus?.suspendReason">（{{ bloggerStatus.suspendReason }}）</template>，到期自动恢复，期间无法发布新文章。
          </p>

          <template v-if="canApplyBlogger">
            <div class="apply-form">
              <el-input
                v-model="applyReason"
                maxlength="255"
                clearable
                placeholder="申请理由（可选）：写作方向、更新频率…"
              />
              <el-button type="primary" :loading="applying" @click="submitBloggerApply">
                申请成为博客主
              </el-button>
            </div>
            <p v-if="bloggerApply?.applyStatus === 2" class="apply-remark">
              上次被拒：{{ bloggerApply.handleRemark || '管理员未填写理由' }}
            </p>
          </template>

          <p v-else-if="bloggerApply?.applyStatus === 0" class="apply-note muted">
            申请已提交于 {{ formatDate(bloggerApply.createTime) }}，审核通过后即可发布文章。
          </p>
          <p v-else-if="suspended" class="apply-note muted">申请已通过，当前处于封禁期。</p>
          <p v-else-if="statusError" class="apply-note muted">
            暂停状态暂未获取到（见控制台 [blog] 日志），先按正常展示；若你已被封禁请联系管理员核实。
          </p>
          <p v-else class="apply-note apply-ok">已通过，你现在可以发布自己的文章了。</p>
        </section>

        <div class="metric-row">
          <div class="metric">
            <span class="metric-label">我的文章</span>
            <strong class="metric-value">{{ articleTotal }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">我的合集</span>
            <strong class="metric-value">{{ collectionTotal }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">待完善</span>
            <strong class="metric-value muted">—</strong>
          </div>
        </div>

        <h4 class="section-title">我的合集</h4>
        <div class="collection-wall">
          <div v-for="c in collections" :key="c.id" class="collection-card">
            <strong>{{ c.name }}</strong>
            <span class="muted">{{ c.articleCount ?? 0 }} 篇</span>
            <span class="muted small">{{ formatDate(c.createTime) }}</span>
          </div>
          <el-button class="collection-add" plain @click="onTabChange('collections')">
            + 管理合集
          </el-button>
        </div>

        <h4 class="section-title">最近文章</h4>
        <ul class="recent-list">
          <li v-for="a in articles" :key="a.id" @click="goArticle(a.id)">
            <span class="recent-title">{{ a.title }}</span>
            <el-tag size="small" :type="statusType(a.publishStatus)">
              {{ statusLabel(a.publishStatus) }}
            </el-tag>
            <span class="muted small">{{ formatDate(a.publishTime || a.createTime) }}</span>
          </li>
          <li v-if="!articles.length">
            <el-empty description="暂无文章" :image-size="64" />
          </li>
        </ul>
      </template>

      <!-- 我的文章 -->
      <template v-else-if="activeTab === 'articles'">
        <div class="main-head">
          <h2>我的文章</h2>
        </div>
        <div class="toolbar">
          <el-input
            v-model="articleQuery.keyword"
            style="width: 220px"
            placeholder="搜索标题"
            clearable
            @keyup.enter="() => { articleQuery.current = 1; loadArticles() }"
            @clear="() => { articleQuery.current = 1; loadArticles() }"
          />
          <el-select
            v-model="articleQuery.publishStatus"
            style="width: 140px"
            placeholder="全部状态"
            clearable
            @change="() => { articleQuery.current = 1; loadArticles() }"
          >
            <el-option label="待审核" :value="3" />
            <el-option label="草稿" :value="0" />
            <el-option label="已发布" :value="1" />
            <el-option label="已下线" :value="2" />
          </el-select>
        </div>
        <div class="table-like">
          <div v-for="a in articles" :key="a.id" class="row">
            <div class="row-main" @click="viewArticle(a)">
              <strong>{{ a.title }}</strong>
              <span class="muted small">
                {{ statusLabel(a.publishStatus) }} · {{ formatDate(a.publishTime || a.createTime) }}
              </span>
              <span v-if="a.auditRemark" class="audit-remark">审核意见：{{ a.auditRemark }}</span>
            </div>
            <div class="row-actions">
              <el-button link type="primary" size="small" @click.stop="editArticle(a.id)">编辑</el-button>
              <el-button link type="info" size="small" @click.stop="viewArticle(a)">
                {{ a.publishStatus === 1 ? '查看' : '预览' }}
              </el-button>
              <el-button
                v-if="a.publishStatus === 1"
                link
                type="warning"
                size="small"
                @click.stop="offlineArticle(a)"
              >
                下线
              </el-button>
              <el-button link type="danger" size="small" @click.stop="removeArticle(a)">删除</el-button>
            </div>
          </div>
          <el-empty v-if="!articles.length" description="暂无文章" :image-size="80" />
        </div>
        <div v-if="articlePages > 1" class="pager">
          <el-pagination
            layout="prev, pager, next, jumper"
            :total="articleTotal"
            :current-page="articleQuery.current"
            :page-size="articleQuery.size"
            @current-change="(p: number) => { articleQuery.current = p; loadArticles() }"
          />
        </div>
      </template>

      <!-- 我的合集 -->
      <template v-else-if="activeTab === 'collections'">
        <div v-if="!manageCollection">
          <div class="main-head">
            <h2>我的合集</h2>
            <el-button type="primary" @click="openCollectionDialog()">新建合集</el-button>
          </div>
          <div class="toolbar">
            <el-input
              v-model="collectionQuery.keyword"
              style="width: 220px"
              placeholder="搜索合集"
              clearable
              @keyup.enter="() => { collectionQuery.current = 1; loadCollections() }"
              @clear="() => { collectionQuery.current = 1; loadCollections() }"
            />
          </div>
          <div class="collection-wall">
            <div
              v-for="c in collections"
              :key="c.id"
              class="collection-card manage"
              @click="openManage(c)"
            >
              <div class="collection-card-top">
                <strong>{{ c.name }}</strong>
                <el-dropdown trigger="click" @command="(cmd: string) => onCollectionCommand(cmd, c)" @click.stop>
                  <button type="button" class="card-more" aria-label="更多操作" @click.stop>
                    ⋯
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="manage">管理文章</el-dropdown-item>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <span class="collection-desc">{{ c.description || '暂无简介' }}</span>
              <span class="muted small">{{ c.articleCount ?? 0 }} 篇 · {{ formatDate(c.createTime) }}</span>
              <button type="button" class="collection-manage-cta" @click.stop="openManage(c)">
                管理文章 →
              </button>
            </div>
            <el-empty
              v-if="!collections.length"
              description="暂无合集，点击右上角新建"
              :image-size="80"
              style="grid-column: 1 / -1"
            />
          </div>
          <div v-if="collectionPages > 1" class="pager">
            <el-pagination
              layout="prev, pager, next"
              :total="collectionTotal"
              :current-page="collectionQuery.current"
              :page-size="collectionQuery.size"
              @current-change="(p: number) => { collectionQuery.current = p; loadCollections() }"
            />
          </div>
        </div>

        <!-- 合集内文章管理 -->
        <div v-else>
          <div class="main-head">
            <h2>
              <el-button link @click="closeManage">← 返回</el-button>
              {{ manageCollection.name }}
            </h2>
          </div>
          <div class="toolbar">
            <el-select v-model="addArticleId" style="width: 280px" placeholder="选择文章加入合集" clearable filterable>
              <el-option
                v-for="a in candidateArticles"
                :key="a.id"
                :label="a.title"
                :value="a.id"
              />
            </el-select>
            <el-button type="primary" :disabled="!addArticleId" @click="onAddArticleToCollection">
              加入合集
            </el-button>
          </div>
          <div class="table-like">
            <div v-for="a in collectionArticles" :key="a.id" class="row">
              <div class="row-main" @click="goArticle(a.id)">
                <strong>{{ a.title }}</strong>
                <span class="muted small">
                  {{ statusLabel(a.publishStatus) }} · {{ formatDate(a.publishTime || a.createTime) }}
                </span>
              </div>
              <el-button link type="danger" size="small" @click="onRemoveArticleFromCollection(a)">
                移出
              </el-button>
            </div>
            <el-empty v-if="!collectionArticles.length" description="合集暂无文章" :image-size="80" />
          </div>
          <div v-if="Math.ceil(collectionArticlesTotal / collectionArticleQuery.size) > 1" class="pager">
            <el-pagination
              layout="prev, pager, next"
              :total="collectionArticlesTotal"
              :current-page="collectionArticleQuery.current"
              :page-size="collectionArticleQuery.size"
              @current-change="(p: number) => { collectionArticleQuery.current = p; loadCollectionArticles() }"
            />
          </div>
        </div>

        <el-dialog v-model="collectionDialog" :title="collectionForm.id ? '编辑合集' : '新建合集'" width="420px">
          <el-form label-width="64px">
            <el-form-item label="名称" required>
              <el-input v-model="collectionForm.name" maxlength="100" placeholder="合集名称" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="collectionForm.description" type="textarea" :rows="3" maxlength="500" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="collectionDialog = false">取消</el-button>
            <el-button type="primary" :loading="collectionSaving" @click="saveCollectionForm">确定</el-button>
          </template>
        </el-dialog>
      </template>

      <!-- 账号设置 -->
      <template v-else>
        <div class="main-head account-head">
          <div>
            <h2>账号设置</h2>
            <p class="account-sub muted">完善展示信息，邮箱与手机号仅本人可见</p>
          </div>
          <el-button type="primary" :loading="accountSaving" @click="saveAccount">保存修改</el-button>
        </div>

        <div class="account-layout">
          <!-- 左：头像卡 -->
          <aside class="account-aside">
            <button
              type="button"
              class="avatar-hero"
              :disabled="avatarUploading"
              title="点击更换头像"
              @click="avatarFileInput?.click()"
            >
              <el-avatar
                :size="88"
                :src="accountForm.avatarUrl || undefined"
                class="avatar-el avatar-el-lg"
              >
                {{ displayChar }}
              </el-avatar>
              <span class="avatar-hero-overlay">{{ avatarUploading ? '上传中…' : '更换头像' }}</span>
            </button>
            <input
              ref="avatarFileInput"
              type="file"
              accept="image/*"
              class="hidden-input"
              @change="onAvatarPick"
            />
            <div class="aside-meta">
              <strong>{{ displayName || username || '未登录' }}</strong>
              <span class="muted small">@{{ username }}</span>
              <span class="role-pill">博客主</span>
            </div>
            <p class="aside-hint muted small">支持 JPG / PNG，建议正方形，≤2MB</p>
          </aside>

          <!-- 右：表单分区 -->
          <div class="account-sections">
            <section class="account-section">
              <header class="section-head">
                <h3>基础资料</h3>
                <span class="muted small">展示在文章页与评论区</span>
              </header>
              <el-form label-position="top" class="account-form" @submit.prevent>
                <div class="field-grid">
                  <el-form-item label="登录账号">
                    <el-input :model-value="username || ''" disabled placeholder="不可修改" />
                  </el-form-item>
                  <el-form-item label="昵称 / 展示名" required>
                    <el-input v-model="accountForm.nickname" maxlength="50" placeholder="如：管理员" clearable />
                  </el-form-item>
                </div>
              </el-form>
            </section>

            <section class="account-section">
              <header class="section-head">
                <h3>联系方式</h3>
                <span class="muted small">仅本人可见，不会公开</span>
              </header>
              <el-form label-position="top" class="account-form" @submit.prevent>
                <div class="field-grid">
                  <el-form-item label="邮箱">
                    <el-input v-model="accountForm.email" placeholder="name@example.com" clearable>
                      <template #prefix>
                        <span class="field-icon">@</span>
                      </template>
                    </el-input>
                  </el-form-item>
                  <el-form-item label="手机号">
                    <el-input v-model="accountForm.phone" placeholder="选填" clearable maxlength="20">
                      <template #prefix>
                        <span class="field-icon">#</span>
                      </template>
                    </el-input>
                  </el-form-item>
                </div>
              </el-form>
            </section>

            <div class="account-foot muted small">
              昵称为展示名；账号仅登录使用。保存后顶栏与文章页昵称立即生效。
            </div>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.profile-page {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.profile-left {
  padding: 0;
  text-align: center;
  position: sticky;
  top: 84px;
}

.profile-left :deep(.el-card__body) {
  padding: 24px 12px 12px;
}

.profile-avatar-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.profile-el-avatar {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.profile-name {
  margin: 0 0 4px;
  font-size: 16px;
  color: var(--ink);
  text-align: center;
}

.profile-account {
  margin: 0 0 2px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

.profile-role {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 12px 4px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat strong {
  font-size: 15px;
  color: var(--ink);
}

.stat span {
  font-size: 11px;
  color: var(--muted);
}

.profile-nav {
  border-right: none !important;
  padding: 0 8px;
  background: transparent;
}

.profile-nav .el-menu-item {
  height: 36px;
  line-height: 36px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--ink);
}

.profile-nav .el-menu-item:hover,
.profile-nav .el-menu-item.is-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.profile-main {
  padding: 0;
  min-height: 420px;
}

.profile-main :deep(.el-card__body) {
  padding: 24px 28px;
}

.main-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.main-head h2 {
  margin: 0;
  font-size: 18px;
  color: var(--ink);
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.metric {
  background: var(--bg);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-label {
  font-size: 12px;
  color: var(--muted);
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.section-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.collection-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.collection-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 88px;
  background: var(--card);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.collection-card strong {
  font-size: 13px;
  color: var(--ink);
}

.collection-card.manage {
  min-height: 148px;
  cursor: pointer;
  justify-content: flex-start;
}

.collection-card.manage:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  box-shadow: 0 6px 18px rgb(0 0 0 / 4%);
}

.collection-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.collection-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 1.45em;
}

.card-more {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  line-height: 1;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.card-more:hover {
  background: var(--bg);
  color: var(--ink);
}

.collection-manage-cta {
  margin-top: auto;
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 0 0;
  cursor: pointer;
}

.collection-manage-cta:hover {
  text-decoration: underline;
}

.head-actions-row {
  display: flex;
  gap: 8px;
}

.collection-add {
  min-height: 88px;
  border-style: dashed;
}

/* ===== 账号设置 ===== */
.account-head {
  align-items: flex-start;
}

.account-sub {
  margin: 4px 0 0;
  font-size: 12px;
}

.account-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.account-aside {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.avatar-hero {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  line-height: 0;
}

.avatar-hero:disabled {
  cursor: wait;
  opacity: 0.7;
}

.avatar-el-lg {
  border: 3px solid var(--card);
  box-shadow: 0 0 0 1px var(--border);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.avatar-hero-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(35 38 43 / 48%);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.15s ease;
  line-height: 1.3;
}

.avatar-hero:hover .avatar-hero-overlay,
.avatar-hero:focus-visible .avatar-hero-overlay {
  opacity: 1;
}

.aside-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.aside-meta strong {
  font-size: 15px;
  color: var(--ink);
}

.role-pill {
  margin-top: 4px;
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
}

.aside-hint {
  margin: 0;
  line-height: 1.4;
}

.account-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-section {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px 8px;
  background: var(--card);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  color: var(--ink);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.account-form :deep(.el-form-item__label) {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
  line-height: 1.3;
}

.account-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.account-form :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.account-form :deep(.el-input.is-disabled .el-input__wrapper) {
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.field-icon {
  color: var(--muted);
  margin-right: 4px;
  font-size: 12px;
}

.account-foot {
  padding: 0 4px;
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  font-size: 13px;
  color: var(--ink);
}

.recent-list li:hover {
  background: var(--accent-soft);
}

.recent-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.table-like .row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--border);
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  min-width: 0;
}

.row-main strong {
  font-size: 13px;
  color: var(--ink);
}

.audit-remark {
  font-size: 12px;
  color: var(--el-color-danger);
  word-break: break-word;
}

.apply-card {
  margin: 0 0 20px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
}

.apply-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.apply-head strong {
  font-size: 14px;
  color: var(--ink);
}

.apply-form {
  display: flex;
  gap: 10px;
}

.apply-form :deep(.el-input) {
  flex: 1;
}

.apply-remark {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-color-danger);
  word-break: break-word;
}

.apply-note {
  margin: 0;
  font-size: 13px;
}

.apply-ok {
  color: var(--el-color-success);
}

.apply-suspend {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-color-danger);
  word-break: break-word;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.small {
  font-size: 12px;
}

.muted {
  color: var(--muted);
}

.avatar-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.avatar-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-el {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.avatar-click {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  line-height: 0;
  display: inline-flex;
}

.avatar-click:hover .avatar-mask,
.avatar-click:focus-visible .avatar-mask {
  opacity: 1;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity 0.15s ease;
  line-height: 1.3;
}

.hidden-input {
  display: none;
}

.account-form {
  max-width: none;
}

.tip-inline {
  margin-left: 8px;
}

@media (max-width: 800px) {
  .profile-page {
    grid-template-columns: 1fr;
  }
  .profile-left {
    position: static;
  }
  .account-layout {
    grid-template-columns: 1fr;
  }
  .field-grid {
    grid-template-columns: 1fr;
  }
  .metric-row {
    grid-template-columns: 1fr;
  }
}
</style>
