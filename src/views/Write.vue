<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import {
  getCategoryList,
  getTagList,
  saveArticle,
  saveTag,
  uploadImage,
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

const form = reactive({
  title: '',
  summary: '',
  content: '',
  coverUrl: '',
  categoryId: null as string | number | null,
  tagIds: [] as (string | number)[],
  isTop: 0,
  isRecommend: 0
})

const previewHtml = ref('')

function refreshPreview() {
  try {
    previewHtml.value = marked.parse(form.content || '') as string
  } catch {
    previewHtml.value = ''
  }
}

const onCoverUpload = async (options: { file: File }) => {
  coverUploading.value = true
  try {
    form.coverUrl = await uploadImage(options.file)
    message.success('封面已上传')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '上传失败')
  } finally {
    coverUploading.value = false
  }
}

async function ensureTagsExist() {
  const known = new Set(tags.value.map(t => String(t.id)))
  for (const id of [...form.tagIds]) {
    if (known.has(String(id))) continue
  }
}

const onSubmit = async (publish: boolean) => {
  if (!getToken()) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  if (!form.title.trim() || !form.content.trim()) {
    message.warning('标题与正文不能为空')
    return
  }
  submitting.value = true
  try {
    await ensureTagsExist()
    await saveArticle({
      title: form.title.trim(),
      summary: form.summary?.trim() || undefined,
      content: form.content,
      coverUrl: form.coverUrl || undefined,
      categoryId: form.categoryId || null,
      tagIds: form.tagIds.map(String),
      publishStatus: publish ? 1 : 0,
      isTop: form.isTop,
      isRecommend: form.isRecommend
    })
    message.success(publish ? '已发布' : '已保存草稿')
    router.push('/')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

/** el-select allow-create 会塞入字符串标签名：提交前转为已有 id 或新建 */
async function onTagChange(ids: (string | number)[]) {
  const next: (string | number)[] = []
  for (const id of ids) {
    if (typeof id === 'string' && !tags.value.some(t => String(t.id) === id)) {
      try {
        await saveTag({ name: id })
        const created = { id: Date.now(), name: id }
        tags.value.push(created)
        next.push(created.id!)
        message.success(`已创建标签「${id}」`)
      } catch (e) {
        message.error(e instanceof Error ? e.message : '创建标签失败')
      }
    } else {
      next.push(id)
    }
  }
  form.tagIds = next
}

onMounted(async () => {
  if (!getToken()) {
    message.warning('请先登录后再写文章')
    router.push('/login')
    return
  }
  try {
    const [c, t] = await Promise.all([getCategoryList().catch(() => []), getTagList().catch(() => [])])
    categories.value = c || []
    tags.value = t || []
  } catch {
    /* ignore */
  }
})
</script>

<template>
  <div class="write-page">
    <div class="page-head card">
      <h2>写文章</h2>
      <p class="muted">Markdown 编辑 · 需要「新增文章」权限 · 保存后由管理员/自己管理列表</p>
    </div>

    <div class="layout">
      <section class="card panel">
        <el-form label-width="72px">
          <el-form-item label="标题" required>
            <el-input v-model="form.title" maxlength="200" placeholder="文章标题" />
          </el-form-item>
          <el-form-item label="摘要">
            <el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit />
          </el-form-item>
          <el-form-item label="封面">
            <div class="cover-row">
              <el-input v-model="form.coverUrl" placeholder="上传或粘贴路径" />
              <el-upload :show-file-list="false" :http-request="onCoverUpload as any" accept="image/*">
                <button type="button" class="btn">上传</button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="分类">
            <select v-model="form.categoryId" class="select">
              <option :value="null">无分类</option>
              <option v-for="c in categories" :key="String(c.id)" :value="c.id">{{ c.name }}</option>
            </select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select
              v-model="form.tagIds"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="搜索或输入回车创建"
              style="width: 100%"
              @change="onTagChange as any"
            >
              <el-option v-for="t in tags" :key="String(t.id)" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <label class="check"><input v-model="form.isTop" :true-value="1" :false-value="0" type="checkbox" /> 置顶</label>
            <label class="check" style="margin-left: 16px">
              <input v-model="form.isRecommend" :true-value="1" :false-value="0" type="checkbox" /> 推荐
            </label>
          </el-form-item>
          <el-form-item label="正文" required>
            <div class="md-split">
              <textarea
                v-model="form.content"
                class="md-area"
                placeholder="# 开始写作…"
                @input="refreshPreview"
              />
              <div class="md-view markdown-body" v-html="previewHtml" />
            </div>
          </el-form-item>
          <div class="actions">
            <button type="button" class="btn ghost" :disabled="submitting" @click="onSubmit(false)">
              存草稿
            </button>
            <button type="button" class="btn primary" :disabled="submitting" @click="onSubmit(true)">
              {{ submitting ? '提交中…' : '发布' }}
            </button>
          </div>
        </el-form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.write-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.page-head {
  padding: 18px 24px;
}
.page-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
}
.page-head p {
  margin: 0;
  font-size: 13px;
}
.panel {
  padding: 20px 24px;
}
.cover-row {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
}
.cover-row .el-input {
  flex: 1;
}
.select {
  width: 100%;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  padding: 0 8px;
}
.md-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  min-height: 360px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.md-area {
  border: none;
  border-right: 1px solid var(--border);
  padding: 12px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 13px;
  resize: vertical;
  min-height: 360px;
  background: #fff;
}
.md-view {
  padding: 12px;
  overflow: auto;
  background: #fafafa;
  font-size: 13px;
  line-height: 1.7;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--ink);
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
}
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn.ghost {
  background: transparent;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.check {
  font-size: 13px;
  color: var(--muted);
}
.warn {
  margin: 8px 0 0;
  font-size: 12px;
  color: #e67700;
  text-align: right;
}
.muted {
  color: #9ca3af;
}
@media (max-width: 900px) {
  .md-split {
    grid-template-columns: 1fr;
  }
  .md-area {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
</style>
