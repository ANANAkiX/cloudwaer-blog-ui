<template>
  <section class="comments">
    <h3>评论 <span class="muted">({{ total }})</span></h3>

    <div class="comment-form card">
      <textarea
        ref="textareaEl"
        v-model="commentContent"
        rows="3"
        maxlength="1000"
        placeholder="写下你的评论…（支持表情与图片，审核通过后展示）"
        @paste="onPaste"
      ></textarea>

      <div v-if="uploadPreviews.length" class="upload-previews">
        <div v-for="(p, i) in uploadPreviews" :key="p.path" class="preview-item">
          <img :src="toPublicUrl(p.path)" alt="" />
          <button class="preview-remove" type="button" title="移除" @click="removePreview(i)">×</button>
          <span v-if="p.uploading" class="preview-loading">…</span>
        </div>
      </div>

      <div class="form-actions">
        <div class="form-tools">
          <button
            class="tool-btn"
            type="button"
            title="表情"
            @click="emojiOpen = !emojiOpen"
          >😀</button>
          <button class="tool-btn" type="button" title="图片（最多3张）" @click="pickImage">
            🖼️
          </button>
          <input
            ref="fileInputEl"
            class="hidden-input"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            @change="onFileChange"
          />
        </div>

        <div class="form-right">
          <span v-if="replyTo" class="reply-hint muted">
            回复 @{{ replyTo.nickname }}
            <button class="link-btn" type="button" @click="cancelReply">取消</button>
          </span>
          <button
            class="submit-btn"
            type="button"
            :disabled="submitting || !canSubmit"
            @click="submitComment"
          >
            {{ submitting ? '提交中…' : '发表评论' }}
          </button>
        </div>
      </div>

      <div v-if="emojiOpen" class="emoji-panel">
        <button
          v-for="e in EMOJIS"
          :key="e"
          class="emoji-item"
          type="button"
          @click="insertEmoji(e)"
        >{{ e }}</button>
      </div>

      <p v-if="commentMsg" class="form-msg">{{ commentMsg }}</p>
    </div>

    <div v-if="comments.length" class="comment-list">
      <article v-for="c in comments" :key="c.id" class="comment-item">
        <div class="comment-row">
          <span class="c-avatar" :class="{ sm: false }">
            <img v-if="avatarUrl(c)" :src="avatarUrl(c)" alt="" @error="onAvatarError($event, c)" />
            <template v-else>{{ initialOf(c) }}</template>
          </span>
          <div class="c-main">
            <div class="comment-head">
              <strong>{{ c.nickname }}</strong>
              <span class="muted">{{ formatDate(c.createTime) }}</span>
            </div>
            <p class="comment-body">{{ c.content }}</p>
            <div v-if="imagesOf(c).length" class="comment-images">
              <img
                v-for="img in imagesOf(c)"
                :key="img"
                :src="toPublicUrl(img)"
                alt="评论图片"
                loading="lazy"
              />
            </div>
            <div class="comment-ops">
              <button class="link-btn" type="button" @click="startReply(c)">回复</button>
              <button
                class="link-btn like-btn-sm"
                :class="{ liked: c.liked }"
                type="button"
                @click="onToggleLike(c)"
              >
                {{ c.liked ? '已赞' : '赞' }} {{ c.likeCount ?? 0 }}
              </button>
            </div>

            <div v-if="repliesOf(c).length" class="reply-list">
              <div v-for="r in repliesOf(c)" :key="r.id" class="reply-item">
                <span class="c-avatar xs">
                  <img v-if="avatarUrl(r)" :src="avatarUrl(r)" alt="" @error="onAvatarError($event, r)" />
                  <template v-else>{{ initialOf(r) }}</template>
                </span>
                <div class="c-main">
                  <div class="comment-head">
                    <strong>{{ r.nickname }}</strong>
                    <span class="muted">{{ formatDate(r.createTime) }}</span>
                  </div>
                  <p class="comment-body">{{ r.content }}</p>
                  <div v-if="imagesOf(r).length" class="comment-images">
                    <img
                      v-for="img in imagesOf(r)"
                      :key="img"
                      :src="toPublicUrl(img)"
                      alt="回复图片"
                      loading="lazy"
                    />
                  </div>
                  <div class="comment-ops">
                    <button class="link-btn" type="button" @click="startReply(c, r)">回复</button>
                    <button
                      class="link-btn like-btn-sm"
                      :class="{ liked: r.liked }"
                      type="button"
                      @click="onToggleLike(r)"
                    >
                      {{ r.liked ? '已赞' : '赞' }} {{ r.likeCount ?? 0 }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="replyStateOf(c).total > repliesOf(c).length" class="reply-expand">
              <button class="link-btn" type="button" :disabled="replyStateOf(c).loading" @click="expandReplies(c)">
                {{ replyStateOf(c).loading ? '加载中…' : `展开 ${replyStateOf(c).total - repliesOf(c).length} 条回复` }}
              </button>
            </div>
            <div v-else-if="replyStateOf(c).total > 3 && isReplyExpanded(c)" class="reply-expand">
              <button class="link-btn" type="button" @click="collapseReplies(c)">收起回复</button>
            </div>
          </div>
        </div>
      </article>

      <div v-if="total > comments.length" class="list-more">
        <button class="more-btn" type="button" :disabled="loadingMore" @click="loadMoreTops">
          {{ loadingMore ? '加载中…' : `查看更多评论（还有 ${total - comments.length} 条）` }}
        </button>
      </div>
    </div>
    <p v-else class="muted empty-comments">还没有评论，来抢沙发吧。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  addComment,
  getCommentReplies,
  getCommentTreePage,
  toPublicUrl,
  uploadCommentImage,
  toggleLike,
  type CommentItem
} from '@/api/blog'
import { message } from '@/api/request'
import { formatDate } from '@/utils/date'

const props = defineProps<{ articleId: string | number }>()

/** 每次展开顶级 / 楼中楼追加条数 */
const PAGE_SIZE = 10

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😅',
  '😎', '🥰', '😇', '🤩', '😭', '😤', '😱', '🤗', '🤭', '🫡',
  '👍', '👎', '👏', '🙏', '💪', '🤝', '🎉', '🔥', '✨', '💯',
  '❤️', '💔', '🌹', '🍉', '☕', '🍺', '🍜', '🎂', '🌈', '🐱'
]

const comments = ref<CommentItem[]>([])
const total = ref(0)
const topPage = ref(1)
const loadingMore = ref(false)

const commentContent = ref('')
const commentMsg = ref('')
const submitting = ref(false)
const replyTo = ref<{ parentId: string | number; rootId?: string | number; nickname: string } | null>(null)
const emojiOpen = ref(false)

const textareaEl = ref<HTMLTextAreaElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)

interface PreviewItem {
  path: string
  uploading: boolean
}
const uploadPreviews = ref<PreviewItem[]>([])

/** 每条根评论的楼中楼展示态：初始来自树接口，展开后追加 */
interface ReplyState {
  list: CommentItem[]
  total: number
  expanded: boolean
  loading: boolean
}
const replyStates = reactive<Record<string, ReplyState>>({})

const canSubmit = computed(() => commentContent.value.trim().length > 0 || uploadPreviews.value.some(p => !p.uploading))

function stateKey(id: string | number) {
  return String(id)
}

function replyStateOf(c: CommentItem): ReplyState {
  return replyStates[stateKey(c.id)] || { list: [], total: 0, expanded: false, loading: false }
}

function repliesOf(c: CommentItem): CommentItem[] {
  return replyStateOf(c).list
}

function isReplyExpanded(c: CommentItem) {
  return replyStateOf(c).expanded
}

function imagesOf(c: CommentItem): string[] {
  return Array.isArray(c.images) ? c.images.filter(Boolean) : []
}

const brokenAvatars = reactive<Record<string, boolean>>({})

function avatarUrl(c: CommentItem): string {
  if (brokenAvatars[stateKey(c.id)]) return ''
  return c.avatar ? toPublicUrl(c.avatar) : ''
}

function initialOf(c: CommentItem) {
  const n = (c.nickname || '').trim()
  return n ? n.slice(0, 1) : '?'
}

function onAvatarError(_e: Event, c: CommentItem) {
  brokenAvatars[stateKey(c.id)] = true
}

function initReplyState(list: CommentItem[]) {
  for (const c of list) {
    const key = stateKey(c.id)
    replyStates[key] = {
      list: [...(c.replies || [])],
      total: c.replyTotal ?? (c.replies?.length || 0),
      expanded: false,
      loading: false
    }
  }
}

async function loadFirstPage() {
  try {
    const res = await getCommentTreePage(props.articleId, { current: 1, size: 5, childSize: 3 })
    comments.value = res.records || []
    total.value = Number(res.total || 0)
    topPage.value = 1
    initReplyState(comments.value)
  } catch {
    comments.value = []
    total.value = 0
  }
}

async function loadMoreTops() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    const next = topPage.value + 1
    const res = await getCommentTreePage(props.articleId, { current: next, size: PAGE_SIZE, childSize: 3 })
    const more = res.records || []
    comments.value = [...comments.value, ...more]
    total.value = Number(res.total || 0)
    topPage.value = next
    initReplyState(more)
  } catch {
    /* keep current list */
  } finally {
    loadingMore.value = false
  }
}

async function expandReplies(c: CommentItem) {
  const key = stateKey(c.id)
  const st = replyStates[key]
  if (!st || st.loading) return
  st.loading = true
  try {
    const res = await getCommentReplies(c.id, st.list.length, PAGE_SIZE)
    const more = res.records || []
    st.list = [...st.list, ...more]
    st.total = Number(res.total ?? st.total)
    st.expanded = true
  } catch {
    /* ignore */
  } finally {
    st.loading = false
  }
}

function collapseReplies(c: CommentItem) {
  const st = replyStates[stateKey(c.id)]
  if (!st) return
  st.expanded = false
  st.list = (c.replies || []).slice(0, 3)
}

function startReply(root: CommentItem, reply?: CommentItem) {
  if (reply) {
    replyTo.value = {
      parentId: reply.id,
      rootId: reply.rootId || root.id,
      nickname: reply.nickname
    }
  } else {
    replyTo.value = { parentId: root.id, rootId: root.id, nickname: root.nickname }
  }
  emojiOpen.value = false
}

function cancelReply() {
  replyTo.value = null
}

/** 评论点赞（type=2）：就地更新该条的 liked / likeCount */
async function onToggleLike(c: CommentItem) {
  try {
    const res = await toggleLike(2, c.id)
    c.liked = res.liked
    c.likeCount = res.likeCount
  } catch (e) {
    message.error(e instanceof Error ? e.message : '点赞失败，请登录后重试')
  }
}

function insertEmoji(e: string) {
  const el = textareaEl.value
  const text = commentContent.value
  if (el) {
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    commentContent.value = text.slice(0, start) + e + text.slice(end)
    // 光标移到插入后
    requestAnimationFrame(() => {
      const pos = start + e.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  } else {
    commentContent.value = text + e
  }
}

function pickImage() {
  if (uploadPreviews.value.length >= 3) {
    commentMsg.value = '评论图片最多 3 张'
    return
  }
  fileInputEl.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await addImageFile(file)
}

async function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        await addImageFile(file)
        return
      }
    }
  }
}

async function addImageFile(file: File) {
  if (uploadPreviews.value.length >= 3) {
    commentMsg.value = '评论图片最多 3 张'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    commentMsg.value = '图片不能超过 5MB'
    return
  }
  const tempPath = `pending-${Date.now()}`
  uploadPreviews.value = [...uploadPreviews.value, { path: tempPath, uploading: true }]
  const idx = uploadPreviews.value.findIndex(p => p.path === tempPath)
  try {
    const path = await uploadCommentImage(file)
    if (idx >= 0) uploadPreviews.value[idx] = { path, uploading: false }
    commentMsg.value = ''
  } catch (err) {
    uploadPreviews.value = uploadPreviews.value.filter(p => p.path !== tempPath)
    commentMsg.value = err instanceof Error ? err.message : '图片上传失败，请登录后重试'
  }
}

function removePreview(i: number) {
  const next = [...uploadPreviews.value]
  next.splice(i, 1)
  uploadPreviews.value = next
}

async function submitComment() {
  const content = commentContent.value.trim()
  const images = uploadPreviews.value.filter(p => !p.uploading).map(p => p.path)
  if (!content && !images.length) return
  if (uploadPreviews.value.some(p => p.uploading)) {
    commentMsg.value = '图片上传中，请稍候'
    return
  }
  submitting.value = true
  commentMsg.value = ''
  try {
    await addComment({
      articleId: props.articleId,
      content: content || '（图片评论）',
      parentId: replyTo.value?.parentId,
      rootId: replyTo.value?.rootId,
      images: images.length ? images : undefined
    })
    commentContent.value = ''
    uploadPreviews.value = []
    replyTo.value = null
    emojiOpen.value = false
    commentMsg.value = '评论已提交，审核通过后展示。'
  } catch (e) {
    commentMsg.value = e instanceof Error ? e.message : '评论失败，请登录后重试'
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.articleId,
  () => {
    comments.value = []
    total.value = 0
    topPage.value = 1
    commentContent.value = ''
    commentMsg.value = ''
    replyTo.value = null
    emojiOpen.value = false
    uploadPreviews.value = []
    loadFirstPage()
  },
  { immediate: true }
)
</script>

<style scoped>
.comments {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.comments h3 {
  margin: 0 0 16px;
  font-size: 18px;
}

.comment-form {
  padding: 14px 16px;
  margin-bottom: 20px;
}

.comment-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  background: var(--card);
  color: var(--ink);
  box-sizing: border-box;
}

.comment-form textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 12px;
  flex-wrap: wrap;
}

.form-tools {
  display: flex;
  gap: 4px;
  align-items: center;
}

.tool-btn {
  border: none;
  background: transparent;
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
}

.tool-btn:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.hidden-input {
  display: none;
}

.form-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.preview-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink) 55%, transparent);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--card) 60%, transparent);
  color: var(--ink);
  font-size: 14px;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 2px;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
}

.emoji-item {
  border: none;
  background: transparent;
  font-size: 18px;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
}

.emoji-item:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.form-msg {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--accent);
}

.submit-btn {
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.like-btn-sm {
  margin-left: 12px;
}

.like-btn-sm.liked {
  color: var(--accent);
  font-weight: 600;
}

.comment-item {
  padding: 14px 0;
  border-bottom: 1px dashed var(--border);
}

.comment-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.c-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.c-avatar.xs {
  width: 26px;
  height: 26px;
  font-size: 12px;
}

.c-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.c-main {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 6px;
}

.comment-body {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 8px;
}

.comment-images img {
  max-width: 160px;
  max-height: 160px;
  border-radius: 8px;
  border: 1px solid var(--border);
  object-fit: cover;
  cursor: pointer;
}

.comment-ops {
  margin-bottom: 2px;
}

.reply-list {
  margin: 10px 0 0 0;
  padding: 8px 0 0 12px;
  border-left: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reply-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.reply-expand {
  margin-top: 6px;
}

.list-more {
  margin-top: 16px;
  text-align: center;
}

.more-btn {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 20px;
  font-size: 13px;
  cursor: pointer;
}

.more-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-comments {
  padding: 24px 0;
  text-align: center;
}

.reply-hint {
  font-size: 12px;
}

.reply-hint .link-btn {
  margin-left: 8px;
}

.muted {
  color: var(--muted);
}
</style>
