<template>
  <div v-if="topic" class="topic-page">
    <article class="card main">
      <header class="head">
        <h1>
          <span v-if="topic.isTop === 1" class="badge top">置顶</span>
          <span v-if="topic.isEssence === 1" class="badge essence">精华</span>
          {{ topic.title }}
        </h1>
        <div class="meta">
          <span>{{ topic.nickname }}</span>
          <span>{{ formatDate(topic.createTime) }}</span>
          <span>{{ topic.viewCount }} 浏览</span>
          <button class="like-btn" type="button" :class="{ on: topic.liked }" @click="onLike">
            {{ topic.liked ? '已赞' : '点赞' }} {{ topic.likeCount }}
          </button>
        </div>
      </header>

      <div class="body markdown" v-html="rendered"></div>

      <section class="replies">
        <h3>回复（{{ replies.length }}）</h3>
        <div class="reply-form card">
          <textarea
            v-model="replyContent"
            rows="3"
            maxlength="1000"
            placeholder="写下回复…（需登录）"
          ></textarea>
          <div class="form-actions">
            <span v-if="replyTo" class="muted">
              回复 @{{ replyTo.nickname }}
              <button class="link-btn" type="button" @click="replyTo = null">取消</button>
            </span>
            <button
              class="submit-btn"
              type="button"
              :disabled="submitting || !replyContent.trim()"
              @click="submitReply"
            >
              {{ submitting ? '提交中…' : '发表回复' }}
            </button>
          </div>
          <p v-if="msg" class="form-msg">{{ msg }}</p>
        </div>

        <div v-if="replies.length" class="reply-list">
          <article v-for="r in replies" :key="r.id" class="reply-item">
            <div class="reply-head">
              <strong>{{ r.nickname }}</strong>
              <span class="muted">{{ formatDate(r.createTime) }}</span>
            </div>
            <p class="reply-body">{{ r.content }}</p>
            <div class="reply-actions">
              <button class="link-btn" type="button" @click="startReply(r)">回复</button>
              <button class="link-btn" type="button" @click="onLikeReply(r)">
                {{ r.liked ? '已赞' : '赞' }} {{ r.likeCount }}
              </button>
            </div>
            <div v-if="r.replies?.length" class="sub-list">
              <div v-for="s in r.replies" :key="s.id" class="sub-item">
                <div class="reply-head">
                  <strong>{{ s.nickname }}</strong>
                  <span class="muted">{{ formatDate(s.createTime) }}</span>
                </div>
                <p class="reply-body">{{ s.content }}</p>
                <div class="reply-actions">
                  <button class="link-btn" type="button" @click="startReply(r, s)">回复</button>
                  <button class="link-btn" type="button" @click="onLikeReply(s)">
                    {{ s.liked ? '已赞' : '赞' }} {{ s.likeCount }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="muted empty">还没有回复</p>
      </section>
    </article>
  </div>

  <div v-else class="state card">
    <p v-if="error">{{ error }}</p>
    <p v-else>加载中…</p>
    <router-link to="/forum">返回论坛</router-link>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import {
  getTopicDetail,
  getTopicReplies,
  replyTopic,
  toggleLike,
  type TopicItem,
  type TopicReplyItem
} from '@/api/blog'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()

const topic = ref<TopicItem | null>(null)
const replies = ref<TopicReplyItem[]>([])
const rendered = ref('')
const error = ref('')
const replyContent = ref('')
const msg = ref('')
const submitting = ref(false)
const replyTo = ref<{ parentId: string | number; rootId?: string | number; nickname: string } | null>(null)

marked.setOptions({ gfm: true, breaks: false })

async function load() {
  error.value = ''
  try {
    const id = route.params.id as string
    topic.value = await getTopicDetail(id)
    rendered.value = marked.parse(topic.value?.content || '') as string
    replies.value = await getTopicReplies(id)
    document.title = `${topic.value?.title || '话题'} · 微论坛`
  } catch (e) {
    error.value = e instanceof Error ? e.message : '话题加载失败'
  }
}

function startReply(root: TopicReplyItem, sub?: TopicReplyItem) {
  if (sub) {
    replyTo.value = {
      parentId: sub.id,
      rootId: sub.rootId || root.id,
      nickname: sub.nickname
    }
  } else {
    replyTo.value = { parentId: root.id, rootId: root.id, nickname: root.nickname }
  }
}

async function submitReply() {
  const content = replyContent.value.trim()
  if (!content || !topic.value) return
  submitting.value = true
  msg.value = ''
  try {
    await replyTopic({
      topicId: topic.value.id,
      content,
      parentId: replyTo.value?.parentId,
      rootId: replyTo.value?.rootId
    })
    replyContent.value = ''
    replyTo.value = null
    msg.value = '回复已发表'
    await load()
  } catch (e) {
    msg.value = e instanceof Error ? e.message : '回复失败，请登录后重试'
  } finally {
    submitting.value = false
  }
}

async function onLike() {
  if (!topic.value) return
  try {
    const res = await toggleLike(3, topic.value.id)
    topic.value.liked = res.liked
    topic.value.likeCount = res.likeCount
  } catch (e) {
    msg.value = e instanceof Error ? e.message : '点赞失败，请登录后重试'
  }
}

async function onLikeReply(r: TopicReplyItem) {
  try {
    const res = await toggleLike(4, r.id)
    r.liked = res.liked
    r.likeCount = res.likeCount
  } catch (e) {
    msg.value = e instanceof Error ? e.message : '点赞失败，请登录后重试'
  }
}

onMounted(load)
</script>

<style scoped>
.main {
  padding: 28px 32px;
}

.head h1 {
  margin: 0 0 12px;
  font-size: 26px;
  line-height: 1.35;
}

.badge {
  display: inline-block;
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 4px;
  margin-right: 8px;
  vertical-align: 4px;
}

.badge.top {
  background: #fff1f0;
  color: #cf1322;
}

.badge.essence {
  background: #fff7e6;
  color: #d46b08;
}

.meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
  color: #9ca3af;
  font-size: 13px;
}

.like-btn {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 12px;
  cursor: pointer;
  color: var(--ink);
}

.like-btn.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.body {
  margin-top: 20px;
  font-size: 15px;
  line-height: 1.8;
}

.body :deep(pre) {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
}

.body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13.5px;
}

.replies {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.replies h3 {
  margin: 0 0 14px;
  font-size: 17px;
}

.reply-form {
  padding: 14px 16px;
  margin-bottom: 18px;
}

.reply-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  background: var(--card);
  color: var(--ink);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 12px;
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
  margin-right: 10px;
}

.reply-item {
  padding: 12px 0;
  border-bottom: 1px dashed var(--border);
}

.reply-head {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 6px;
}

.reply-body {
  margin: 0 0 6px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.sub-list {
  margin: 10px 0 0 24px;
  padding-left: 12px;
  border-left: 2px solid var(--border);
}

.sub-item {
  padding: 8px 0;
}

.state {
  padding: 64px 24px;
  text-align: center;
  color: var(--muted);
}

.muted {
  color: #9ca3af;
  font-size: 12px;
}

.empty {
  padding: 20px 0;
  text-align: center;
}
</style>
