<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import {
  getCategoryList,
  getTagList,
  saveArticle,
  saveTag,
  uploadImage,
  importArticleFile,
  type CategoryItem,
  type TagItem
} from '@/api/blog'
import { message } from '@/api/request'
import { getToken } from '@/stores/auth'

const router = useRouter()

const categories = ref<CategoryItem[]>([])
const tags = ref<TagItem[]>([])
const submitting = ref(false)
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
  tagIds: [] as (string | number)[]
})

const previewHtml = ref('')
const richEditor = ref<HTMLElement | null>(null)
const coverFile = ref<HTMLInputElement | null>(null)

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
  nextTick(wrapPreviewTables)
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
    await saveArticle({
      title: form.title.trim(),
      summary: form.summary?.trim() || undefined,
      content: form.content,
      coverUrl: form.coverUrl || undefined,
      categoryId: form.categoryId || null,
      tagIds: form.tagIds.map(String).filter(s => /^\d+$/.test(s)),
      publishStatus: publish ? 1 : 0
    })
    message.success(publish ? '已发布' : '已保存草稿')
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
    const [c, t] = await Promise.all([getCategoryList().catch(() => []), getTagList().catch(() => [])])
    categories.value = c || []
    tags.value = t || []
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
    <div class="page-head card">
      <div class="head-main">
        <h2>写文章</h2>
        <p class="muted">Markdown / 富文本 · 支持导入 MD/PDF/Word · 标签可搜可建</p>
      </div>
      <div class="head-actions">
        <input
          ref="importFile"
          type="file"
          accept=".md,.markdown,.txt,.pdf,.docx"
          class="hidden-file"
          @change="onImportFile"
        />
        <button
          type="button"
          class="btn"
          :disabled="importing"
          @click="importFile?.click()"
        >
          {{ importing ? '导入中…' : '导入文件' }}
        </button>
        <button
          type="button"
          class="btn"
          :class="{ on: showPreview }"
          :disabled="editorMode === 'rich'"
          @click="showPreview = !showPreview"
        >
          预览
        </button>
        <button type="button" class="btn ghost" :disabled="submitting" @click="onSubmit(false)">
          存草稿
        </button>
        <button type="button" class="btn primary" :disabled="submitting" @click="onSubmit(true)">
          {{ submitting ? '提交中…' : '发布' }}
        </button>
      </div>
    </div>

    <section class="card panel">
      <input
        v-model="form.title"
        class="title-input"
        maxlength="200"
        placeholder="文章标题…"
      />

      <div class="meta-row">
        <label class="meta-item">
          <span class="meta-label">分类</span>
          <select v-model="form.categoryId" class="select">
            <option :value="null">无分类</option>
            <option v-for="c in categories" :key="String(c.id)" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <div class="meta-item tag-select" @click.stop="openTagDropdown">
          <span class="meta-label">标签</span>
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

        <label class="meta-item cover-item">
          <span class="meta-label">封面</span>
          <div class="cover-row">
            <input v-model="form.coverUrl" class="cover-input" placeholder="上传或粘贴路径" />
            <button type="button" class="btn sm" :disabled="coverUploading" @click.prevent="coverFile?.click()">
              {{ coverUploading ? '上传中…' : '上传' }}
            </button>
            <input ref="coverFile" type="file" accept="image/*" class="hidden-file" @change="onCoverUpload" />
          </div>
        </label>
      </div>

      <div class="summary-row">
        <textarea
          v-model="form.summary"
          class="summary-input"
          rows="2"
          maxlength="500"
          placeholder="摘要（可选，列表页展示）"
        ></textarea>
      </div>

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
          <button type="button" class="tool" title="链接" @click="execRich('createLink', prompt('链接地址') || '')">🔗</button>
        </div>
      </div>

      <div class="editor-body" :class="{ split: showPreview && editorMode === 'md' }">
        <template v-if="editorMode === 'md'">
          <textarea
            v-model="form.content"
            class="md-area"
            placeholder="# 开始写作…"
            @input="refreshPreview"
          ></textarea>
          <div
            v-if="showPreview"
            ref="previewEl"
            class="md-view markdown-body"
            v-html="previewHtml"
          ></div>
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
    </section>
  </div>
</template>

<style scoped>
.write-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 22px 28px;
}

.head-main h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.head-main p {
  margin: 0;
  font-size: 13px;
}

.head-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.panel {
  padding: 28px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.title-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  padding: 12px 4px;
  font-size: 26px;
  font-weight: 600;
  background: transparent;
  color: var(--ink);
  outline: none;
}

.title-input::placeholder {
  color: #c4c0b6;
  font-weight: 500;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.meta-label {
  font-size: 12px;
  color: var(--muted);
}

.select {
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  padding: 0 10px;
  color: var(--ink);
  min-width: 140px;
}

.tag-select {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.tag-box {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 36px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 5px 8px;
  background: var(--card);
  cursor: text;
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
  min-width: 120px;
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

.cover-item {
  min-width: 220px;
}

.cover-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cover-input {
  flex: 1;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 10px;
  background: var(--card);
  color: var(--ink);
  min-width: 120px;
}

.hidden-file {
  display: none;
}

.summary-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--ink);
  background: var(--card);
  resize: vertical;
  font-family: inherit;
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mode-switch {
  display: inline-flex;
  background: #f1efe8;
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
  min-height: 420px;
  display: grid;
  grid-template-columns: 1fr;
}

.editor-body.split {
  grid-template-columns: 1fr 1fr;
}

.md-area {
  border: none;
  padding: 18px 20px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  min-height: 420px;
  background: var(--card);
  color: var(--ink);
  outline: none;
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
  min-height: 420px;
  padding: 18px 22px;
  font-size: 15px;
  line-height: 1.8;
  outline: none;
  background: var(--card);
  color: var(--ink);
}

.rich-area:empty::before {
  content: attr(data-placeholder);
  color: #c4c0b6;
  pointer-events: none;
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
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .editor-body.split {
    grid-template-columns: 1fr;
  }

  .md-view {
    border-left: none;
    border-top: 1px solid var(--border);
    min-height: 240px;
  }
}
</style>
