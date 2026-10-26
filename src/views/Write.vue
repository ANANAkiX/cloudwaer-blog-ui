<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import {
  getCategoryList,
  getTagList,
  getMyCollections,
  saveMyCollection,
  saveArticle,
  saveTag,
  uploadImage,
  importArticleFile,
  type CategoryItem,
  type CollectionItem,
  type TagItem
} from '@/api/blog'
import { ElMessage } from 'element-plus'
import { getToken } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { ElCard, ElButton, ElInput, ElSelect, ElOption } from 'element-plus'

const message = {
  success: (m: string) => ElMessage.success(m),
  error: (m: string) => ElMessage.error(m),
  warning: (m: string) => ElMessage.warning(m)
}

const router = useRouter()

const categories = ref<CategoryItem[]>([])
const tags = ref<TagItem[]>([])
const collections = ref<CollectionItem[]>([])
const newCollectionName = ref('')
const creatingCollection = ref(false)
const submitting = ref(false)
const settingsStore = useSettingsStore()
/** 站点开启发布审核时提示（管理员发布不受限，以提交后回执为准） */
const auditHint = computed(() => settingsStore.siteSetting?.requireArticleAudit !== 0)
const coverUploading = ref(false)
const importing = ref(false)
const importFile = ref<HTMLInputElement | null>(null)

/** md | rich */
const editorMode = ref<'md' | 'rich'>('md')
const showPreview = ref(false)

const form = reactive({
  title: '',
  summary: '',
  content: '',
  coverUrl: '',
  categoryId: null as string | number | null,
  collectionId: null as string | number | null,
  tagIds: [] as (string | number)[]
})

const previewHtml = ref('')
const richEditor = ref<HTMLElement | null>(null)
const coverFile = ref<HTMLInputElement | null>(null)

const contentWordCount = computed(() => {
  const text = (form.content || '').replace(/<[^>]+>/g, '').trim()
  if (!text) return 0
  const cjk = text.match(/[一-鿿]/g)?.length || 0
  const latin = (text.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g)?.length) || 0
  return cjk + latin
})
const readingMinutes = computed(() => Math.max(1, Math.ceil(contentWordCount.value / 400)))

const previewEl = ref<HTMLElement | null>(null)

function wrapPreviewTables() {
  previewEl.value?.querySelectorAll('table').forEach(table => {
    const parent = table.parentElement
    if (parent && parent.classList.contains('table-wrap')) return
    const wrap = document.createElement('div')
    wrap.className = 'table-wrap'
    table.parentNode?.insertBefore(wrap, table)
    wrap.appendChild(table)
  })
}

function refreshPreview() {
  if (editorMode.value !== 'md') return
  try {
    previewHtml.value = marked.parse(form.content || '') as string
  } catch {
    previewHtml.value = ''
  }
  nextTick(() => {
    wrapPreviewTables()
  })
}

function setEditorMode(mode: 'md' | 'rich') {
  if (mode === editorMode.value) return
  if (editorMode.value === 'rich' && richEditor.value) {
    form.content = richEditor.value.innerHTML
  }
  if (mode === 'rich' && form.content.trim()) {
    const ok = window.confirm('切换到富文本会把当前 Markdown 源码当作纯文本插入，可能丢失格式。继续？')
    if (!ok) return
  }
  editorMode.value = mode
  if (mode === 'rich') {
    showPreview.value = false
    nextTick(() => {
      if (richEditor.value) {
        richEditor.value.innerHTML = form.content || ''
      }
    })
  } else {
    refreshPreview()
  }
}

function syncRichToForm() {
  if (editorMode.value === 'rich' && richEditor.value) {
    form.content = richEditor.value.innerHTML
  }
}

function execRich(cmd: string, value?: string) {
  richEditor.value?.focus()
  document.execCommand(cmd, false, value)
  syncRichToForm()
}

function onInsertLink() {
  const url = window.prompt('链接地址', '')
  if (url) execRich('createLink', url)
}

function onRichInput() {
  syncRichToForm()
}

const onCoverUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  coverUploading.value = true
  try {
    form.coverUrl = await uploadImage(file)
    message.success('封面已上传')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '上传失败')
  } finally {
    coverUploading.value = false
    input.value = ''
  }
}

/** 导入 MD/TXT/PDF/DOCX → 填入标题与正文 */
const onImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!getToken()) {
    message.warning('请先登录')
    router.push('/login')
    input.value = ''
    return
  }
  importing.value = true
  try {
    const result = await importArticleFile(file)
    form.title = result.title || file.name.replace(/\.[^.]+$/, '')
    form.content = result.content || ''
    if (editorMode.value === 'rich') {
      editorMode.value = 'md'
      showPreview.value = false
    }
    refreshPreview()
    message.success(`已导入「${result.filename || file.name}」，请确认后发布`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    importing.value = false
    input.value = ''
  }
}

/** ===== 标签：可搜可建 ===== */
const tagQuery = ref('')
const tagOpen = ref(false)
const tagInput = ref<HTMLInputElement | null>(null)

const filteredTags = computed(() => {
  const q = tagQuery.value.trim().toLowerCase()
  const list = tags.value.filter(t => !form.tagIds.some(id => String(id) === String(t.id)))
  if (!q) return list
  return list.filter(t => t.name.toLowerCase().includes(q))
})

const canCreateTag = computed(() => {
  const q = tagQuery.value.trim()
  if (!q) return false
  return !tags.value.some(t => t.name.toLowerCase() === q.toLowerCase())
})

function openTagDropdown() {
  tagOpen.value = true
}

function closeTagDropdown() {
  tagOpen.value = false
}

function toggleTag(id: string | number) {
  const key = String(id)
  const idx = form.tagIds.findIndex(x => String(x) === key)
  if (idx >= 0) form.tagIds.splice(idx, 1)
  else form.tagIds.push(id)
  tagQuery.value = ''
  tagInput.value?.focus()
}

function removeTag(id: string | number) {
  const idx = form.tagIds.findIndex(x => String(x) === String(id))
  if (idx >= 0) form.tagIds.splice(idx, 1)
}

async function onCreateCollection() {
  const name = newCollectionName.value.trim()
  if (!name) return
  creatingCollection.value = true
  try {
    await saveMyCollection({ name })
    const list = await getMyCollections().catch(() => [])
    collections.value = list || []
    const created = collections.value.find(c => c.name === name)
    if (created) {
      form.collectionId = created.id
    }
    newCollectionName.value = ''
    message.success(`已创建合集「${name}」`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建合集失败')
  } finally {
    creatingCollection.value = false
  }
}

async function createTagFromQuery() {
  const name = tagQuery.value.trim()
  if (!name) return
  const existed = tags.value.find(t => t.name.toLowerCase() === name.toLowerCase())
  if (existed) {
    if (!form.tagIds.some(id => String(id) === String(existed.id))) {
      form.tagIds.push(existed.id)
    }
    tagQuery.value = ''
    return
  }
  try {
    const id = await saveTag({ name })
    tags.value.push({ id, name })
    form.tagIds.push(id)
    tagQuery.value = ''
    message.success(`已创建标签「${name}」`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建标签失败')
  }
}

function onTagKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (canCreateTag.value || tagQuery.value.trim()) {
      createTagFromQuery()
    }
  } else if (e.key === 'Backspace' && !tagQuery.value && form.tagIds.length) {
    removeTag(form.tagIds[form.tagIds.length - 1])
  }
}

function selectedTagItems() {
  return form.tagIds
    .map(id => tags.value.find(t => String(t.id) === String(id)))
    .filter(Boolean) as TagItem[]
}

function onDocClick(e: MouseEvent) {
  const root = (tagInput.value?.closest('.tag-select') as HTMLElement) || null
  if (root && !root.contains(e.target as Node)) closeTagDropdown()
}

const onSubmit = async (publish: boolean) => {
  if (!getToken()) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  syncRichToForm()
  if (!form.title.trim() || !form.content.trim()) {
    message.warning('标题与正文不能为空')
    return
  }
  submitting.value = true
  try {
    const status = await saveArticle({
      title: form.title.trim(),
      summary: form.summary?.trim() || undefined,
      content: form.content,
      coverUrl: form.coverUrl || undefined,
      categoryId: form.categoryId || null,
      collectionId: form.collectionId || null,
      tagIds: form.tagIds.map(String).filter(s => /^\d+$/.test(s)),
      publishStatus: publish ? 1 : 0
    })
    if (status === 3) {
      message.success('已提交，等待管理员审核通过后对外可见')
    } else if (status === 1) {
      message.success('已发布')
    } else {
      message.success('已保存草稿')
    }
    router.push('/')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!getToken()) {
    message.warning('请先登录后再写文章')
    router.push('/login')
    return
  }
  document.addEventListener('click', onDocClick)
  try {
    const [c, t, col] = await Promise.all([
      getCategoryList().catch(() => []),
      getTagList().catch(() => []),
      getMyCollections().catch(() => [])
    ])
    categories.value = c || []
    tags.value = t || []
    collections.value = col || []
  } catch {
    /* ignore */
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="write-page">
    <!-- 顶栏：标题 + 次要操作（发布在右栏） -->
    <el-card class="page-head" shadow="never">
      <div class="head-main">
        <button type="button" class="back-link" @click="router.push('/')">← 返回</button>
        <div>
          <h2>写文章</h2>
          <p class="muted">左侧编辑 · 右侧发布设置 · 预览为悬浮层</p>
        </div>
      </div>
      <div class="head-actions">
        <input
          ref="importFile"
          type="file"
          accept=".md,.markdown,.txt,.pdf,.docx"
          class="hidden-file"
          @change="onImportFile"
        />
        <el-button :loading="importing" @click="importFile?.click()">
          {{ importing ? '导入中…' : '导入文件' }}
        </el-button>
        <el-button
          :type="showPreview ? 'primary' : 'default'"
          :disabled="editorMode === 'rich'"
          @click="showPreview = !showPreview"
        >
          预览
        </el-button>
      </div>
    </el-card>

    <!-- 主体：左编辑 + 右发布设置 -->
    <div class="write-layout">
      <el-card class="editor-card" shadow="never">
        <el-input
          v-model="form.title"
          class="title-input"
          maxlength="200"
          placeholder="文章标题…"
          size="large"
        />

        <div class="editor-head">
          <div class="mode-switch">
            <button
              type="button"
              class="mode-btn"
              :class="{ on: editorMode === 'md' }"
              @click="setEditorMode('md')"
            >
              Markdown
            </button>
            <button
              type="button"
              class="mode-btn"
              :class="{ on: editorMode === 'rich' }"
              @click="setEditorMode('rich')"
            >
              富文本
            </button>
          </div>
          <div v-if="editorMode === 'md'" class="md-tools">
            <button type="button" class="tool" title="粗体" @click="form.content += '****'; refreshPreview()">B</button>
            <button type="button" class="tool" title="斜体" @click="form.content += '**'; refreshPreview()">I</button>
            <button type="button" class="tool" title="标题" @click="form.content += '\n## '; refreshPreview()">H</button>
            <button type="button" class="tool" title="引用" @click="form.content += '\n> '; refreshPreview()">”</button>
            <button type="button" class="tool" title="代码" @click="form.content += '\n```\n\n```\n'; refreshPreview()">{ }</button>
            <button type="button" class="tool" title="列表" @click="form.content += '\n- '; refreshPreview()">≡</button>
            <button type="button" class="tool" title="链接" @click="form.content += '[标题](url)'; refreshPreview()">🔗</button>
          </div>
          <div v-else class="md-tools">
            <button type="button" class="tool" title="粗体" @click="execRich('bold')">B</button>
            <button type="button" class="tool" title="斜体" @click="execRich('italic')">I</button>
            <button type="button" class="tool" title="下划线" @click="execRich('underline')">U</button>
            <button type="button" class="tool" title="标题" @click="execRich('formatBlock', '<h2>')">H</button>
            <button type="button" class="tool" title="引用" @click="execRich('formatBlock', '<blockquote>')">”</button>
            <button type="button" class="tool" title="列表" @click="execRich('insertUnorderedList')">≡</button>
            <button type="button" class="tool" title="链接" @click="onInsertLink">🔗</button>
          </div>
        </div>

        <div class="editor-body">
          <template v-if="editorMode === 'md'">
            <textarea
              v-model="form.content"
              class="md-area"
              placeholder="# 开始写作…"
              @input="refreshPreview"
            ></textarea>
          </template>
          <div
            v-else
            ref="richEditor"
            class="rich-area"
            contenteditable="true"
            data-placeholder="开始富文本写作…"
            @input="onRichInput"
          ></div>
        </div>

        <div class="editor-foot">
          <span class="muted small">字数 {{ contentWordCount }} · 预计阅读 {{ readingMinutes }} 分钟</span>
          <span class="muted small">支持 MD · 可导入 PDF / Word</span>
        </div>
      </el-card>

      <!-- 右侧发布设置 -->
      <aside class="publish-panel" shadow="never">
        <h3 class="panel-title">发布设置</h3>

        <div class="side-field">
          <span class="side-label">封面图</span>
          <div
            class="cover-drop"
            :class="{ has: !!form.coverUrl }"
            @click="coverFile?.click()"
          >
            <img v-if="form.coverUrl" :src="form.coverUrl" alt="封面预览" class="cover-preview" />
            <div v-else class="cover-placeholder">
              <span>点击上传封面</span>
              <span class="muted small">建议 16:9</span>
            </div>
            <input ref="coverFile" type="file" accept="image/*" class="hidden-file" @change="onCoverUpload" />
          </div>
          <el-input
            v-model="form.coverUrl"
            class="cover-url"
            size="small"
            placeholder="或粘贴图片路径"
            clearable
          />
        </div>

        <div class="side-field">
          <span class="side-label">分类</span>
          <el-select v-model="form.categoryId" clearable placeholder="选择分类…" class="side-select">
            <el-option
              v-for="c in categories"
              :key="String(c.id)"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </div>

        <div class="side-field">
          <span class="side-label">合集</span>
          <div class="side-row">
            <el-select v-model="form.collectionId" clearable placeholder="不加入合集" class="side-select">
              <el-option
                v-for="c in collections"
                :key="String(c.id)"
                :label="c.name"
                :value="c.id"
              />
            </el-select>
            <el-button :loading="creatingCollection" :disabled="!newCollectionName.trim()" @click="onCreateCollection">
              新建
            </el-button>
          </div>
          <el-input
            v-model="newCollectionName"
            class="side-inline-input"
            size="small"
            maxlength="100"
            placeholder="新合集名称，可选"
            clearable
          />
        </div>

        <div class="side-field tag-select" @click.stop="openTagDropdown">
          <span class="side-label">标签</span>
          <div class="tag-box">
            <span v-for="t in selectedTagItems()" :key="String(t.id)" class="tag-chip">
              {{ t.name }}
              <button type="button" class="tag-x" @click.stop="removeTag(t.id)">×</button>
            </span>
            <input
              ref="tagInput"
              v-model="tagQuery"
              class="tag-input"
              placeholder="搜索或回车创建…"
              @focus="openTagDropdown"
              @keydown="onTagKeydown"
            />
          </div>
          <div v-if="tagOpen" class="tag-dropdown">
            <button
              v-for="t in filteredTags"
              :key="String(t.id)"
              type="button"
              class="tag-option"
              @click.stop="toggleTag(t.id)"
            >
              {{ t.name }}
            </button>
            <button
              v-if="canCreateTag"
              type="button"
              class="tag-option create"
              @click.stop="createTagFromQuery()"
            >
              ＋ 创建「{{ tagQuery.trim() }}」
            </button>
            <div v-if="!filteredTags.length && !canCreateTag" class="tag-empty">无匹配标签</div>
          </div>
        </div>

        <div class="side-field">
          <span class="side-label">摘要</span>
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="3"
            maxlength="500"
            placeholder="可选，列表页展示…"
            show-word-limit
          />
        </div>

        <div class="publish-actions">
          <p v-if="auditHint" class="publish-audit-hint">本站开启发布审核：非管理员发布需审核通过后才对外可见</p>
          <el-button class="publish-draft" :disabled="submitting" @click="onSubmit(false)">存草稿</el-button>
          <el-button class="publish-primary" type="primary" :loading="submitting" @click="onSubmit(true)">
            {{ submitting ? '提交中…' : '发布' }}
          </el-button>
        </div>
      </aside>
    </div>

    <!-- 预览：悬浮层，不拆分编辑区 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPreview" class="preview-float" role="dialog" aria-modal="true" aria-label="文章预览" @click.self="showPreview = false">
          <Transition name="pop" appear>
            <div class="preview-float-panel">
              <header class="preview-float-head">
                <div class="preview-float-title">
                  <strong>预览</strong>
                  <span class="muted small">{{ form.title || '未命名文章' }}</span>
                </div>
                <div class="preview-float-actions">
                  <button type="button" class="preview-close" aria-label="关闭预览" @click="showPreview = false">✕</button>
                </div>
              </header>
              <div ref="previewEl" class="preview-float-body markdown-body" v-html="previewHtml"></div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.write-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  padding: 16px 22px;
}

.page-head :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.head-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.back-link {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
}

.back-link:hover {
  color: var(--accent);
}

.head-main h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.head-main p {
  margin: 0;
  font-size: 12px;
}

.head-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.write-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: stretch;
  /* 整体工作区约 70% 视口高度 */
  height: 70vh;
  min-height: 480px;
  max-height: 860px;
}

.editor-card {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-card :deep(.el-card__body) {
  padding: 18px 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.publish-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius, 12px);
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow: auto;
  min-height: 0;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  color: var(--ink);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.side-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  flex-shrink: 0;
}

.side-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}

.side-row {
  display: flex;
  gap: 8px;
}

.side-select {
  flex: 1;
  min-width: 0;
}

.side-inline-input {
  margin-top: -2px;
}

.cover-drop {
  border: 1px dashed var(--border);
  border-radius: 10px;
  min-height: 88px;
  background: var(--bg);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease;
}

.cover-drop:hover {
  border-color: var(--accent);
}

.cover-drop.has {
  border-style: solid;
  min-height: auto;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ink);
  padding: 16px;
  text-align: center;
}

.cover-preview {
  width: 100%;
  display: block;
  max-height: 110px;
  object-fit: cover;
}

.cover-url {
  margin-top: 2px;
}

.publish-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  background: var(--card);
}

.publish-actions :deep(.el-button) {
  width: 100%;
  margin-left: 0;
}

.publish-audit-hint {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
  text-align: center;
}

.back-link,
.head-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.head-actions {
  gap: 8px;
}

.editor-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 4px;
  flex-wrap: wrap;
}

.title-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  padding: 8px 2px 12px;
  font-size: 26px;
  font-weight: 600;
  background: transparent;
  color: var(--ink);
  outline: none;
}

.title-input::placeholder {
  color: color-mix(in srgb, var(--muted) 70%, transparent);
  font-weight: 500;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  padding-left: 0;
  font-size: 22px;
  font-weight: 600;
  background: transparent;
}

.title-input :deep(.el-input__inner) {
  font-size: 22px;
  font-weight: 600;
  color: var(--ink);
}

.tag-select {
  position: relative;
}

.tag-box {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 5px 8px;
  background: var(--card);
  cursor: text;
}

.tag-box:focus-within {
  border-color: var(--accent);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}

.tag-x {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}

.tag-input {
  flex: 1;
  min-width: 100px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  height: 24px;
}

.tag-dropdown {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  max-height: 220px;
  overflow: auto;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: 4px;
}

.tag-option {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--ink);
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.tag-option:hover {
  background: var(--accent-soft);
}

.tag-option.create {
  color: var(--accent);
  border-top: 1px solid var(--border);
  margin-top: 2px;
  border-radius: 0 0 6px 6px;
}

.tag-empty {
  padding: 10px;
  font-size: 12px;
  color: var(--muted);
}

.hidden-file {
  display: none;
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mode-switch {
  display: inline-flex;
  background: color-mix(in srgb, var(--ink) 6%, var(--card));
  border-radius: 999px;
  padding: 3px;
}

.mode-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
}

.mode-btn.on {
  background: var(--accent);
  color: #fff;
}

.md-tools {
  display: flex;
  gap: 4px;
}

.tool {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 13px;
}

.tool:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.editor-body {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.md-area {
  border: none;
  padding: 16px 18px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: none;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--card);
  color: var(--ink);
  outline: none;
  box-sizing: border-box;
}

.md-view {
  padding: 18px 20px;
  overflow: auto;
  background: var(--card);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.75;
  border-left: 1px solid var(--border);
  min-height: 420px;
}

.md-view :deep(h1),
.md-view :deep(h2),
.md-view :deep(h3),
.md-view :deep(h4) {
  color: var(--ink);
}

.md-view :deep(p),
.md-view :deep(li),
.md-view :deep(td),
.md-view :deep(th) {
  color: var(--ink);
}

.rich-area {
  min-height: 100%;
  padding: 16px 18px;
  font-size: 14px;
  line-height: 1.7;
  outline: none;
  background: var(--card);
  color: var(--ink);
  overflow: auto;
}

.rich-area:empty::before {
  content: attr(data-placeholder);
  color: color-mix(in srgb, var(--muted) 75%, transparent);
  pointer-events: none;
}

/* 预览悬浮层 */
.preview-float {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(18 20 26 / 42%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  backdrop-filter: blur(2px);
}

.preview-float-panel {
  width: min(820px, 94vw);
  height: min(78vh, 860px);
  background: var(--card);
  border-radius: 14px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 64px rgb(0 0 0 / 18%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-float-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.preview-float-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preview-float-title strong {
  font-size: 14px;
  color: var(--ink);
}

.preview-float-title .muted {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-close {
  border: none;
  background: var(--bg);
  color: var(--muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}

.preview-close:hover {
  color: var(--ink);
  background: var(--accent-soft);
}

.preview-float-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 28px 36px;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.8;
}

.preview-float-body :deep(h1),
.preview-float-body :deep(h2),
.preview-float-body :deep(h3),
.preview-float-body :deep(h4) {
  color: var(--ink);
  margin-top: 1.2em;
}

.preview-float-body :deep(p),
.preview-float-body :deep(li),
.preview-float-body :deep(td),
.preview-float-body :deep(th) {
  color: var(--ink);
}

.preview-float-body :deep(pre),
.preview-float-body :deep(code) {
  background: var(--bg);
}

.preview-float-body :deep(blockquote) {
  border-left: 3px solid var(--accent);
  color: var(--muted);
  margin: 0.8em 0;
  padding: 0.2em 0 0.2em 1em;
}

.btn {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--ink);
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 13px;
  cursor: pointer;
}

.btn.sm {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
}

.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.btn.ghost {
  background: transparent;
}

.btn.on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.muted {
  color: var(--muted);
}

@media (max-width: 900px) {
  .page-head :deep(.el-card__body) {
    flex-direction: column;
    align-items: flex-start;
  }

  .write-layout {
    grid-template-columns: 1fr;
    height: auto;
    max-height: none;
  }

  .editor-card {
    height: auto;
  }

  .editor-card :deep(.el-card__body) {
    overflow: visible;
  }

  .editor-body {
    min-height: 360px;
    height: 50vh;
  }

  .publish-panel {
    height: auto;
    overflow: visible;
  }

  .publish-actions {
    position: static;
  }

  .preview-float {
    padding: 16px 12px;
  }

  .preview-float-panel {
    width: 100%;
    height: 86vh;
  }

  .md-view {
    border-left: none;
    border-top: 1px solid var(--border);
    min-height: 240px;
  }
}
</style>
