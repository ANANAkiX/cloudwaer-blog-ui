import request, { type PageResult } from './request'

/** 文章标签引用 */
export interface ArticleTagRef {
  id: string | number
  name: string
}

/** 文章（列表项不含正文 content） */
export interface ArticleItem {
  id: string | number
  title: string
  summary?: string | null
  content?: string | null
  coverUrl?: string | null
  categoryId?: string | number | null
  authorId?: string | number
  authorName: string
  publishStatus: number
  isTop: number
  isRecommend: number
  viewCount: number
  likeCount: number
  commentCount: number
  heatScore: number
  liked?: boolean
  publishTime?: string | null
  createTime?: string | null
  updateTime?: string | null
  tags: ArticleTagRef[]
}

export interface CategoryItem {
  id: string | number
  name: string
  slug?: string | null
  description?: string | null
  sort?: number
}

export interface TagItem {
  id: string | number
  name: string
  slug?: string | null
  useCount?: number
}

/** 评论（楼中楼） */
export interface CommentItem {
  id: string | number
  articleId: string | number
  parentId: number
  rootId: number
  userId?: string | number | null
  nickname: string
  avatar?: string | null
  content: string
  likeCount: number
  createTime?: string | null
  replies?: CommentItem[]
}

export interface CommentSavePayload {
  articleId: string | number
  parentId?: string | number
  rootId?: string | number
  content: string
}

export interface ArticleListParams {
  current?: number
  size?: number
  keyword?: string
  categoryId?: string | number
  tagId?: string | number
}

/** 已发布文章分页列表 */
export function getArticleList(params: ArticleListParams = {}): Promise<PageResult<ArticleItem>> {
  return request({ url: '/blog/open/article/list', method: 'get', params })
}

/** 文章详情（浏览量+1） */
export function getArticleDetail(id: string | number): Promise<ArticleItem> {
  return request({ url: '/blog/open/article/detail', method: 'get', params: { id } })
}

/** 归档列表（按发布时间倒序） */
export function getArticleArchive(): Promise<ArticleItem[]> {
  return request({ url: '/blog/open/article/archive', method: 'get' })
}

/** 热门文章（侧栏） */
export function getHotArticles(limit = 5): Promise<ArticleItem[]> {
  return request({ url: '/blog/open/article/hot', method: 'get', params: { limit } })
}

/** 上传图片，返回 /blog/uploads/** 路径（展示时需加 /api 前缀） */
export function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  return request({ url: '/blog/upload/image', method: 'post', data: form })
}

/** 把后端路径转为前台可访问 URL（经 Vite/网关 /api 前缀） */
export function toPublicUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/api/')) return path
  return path.startsWith('/') ? `/api${path}` : `/api/${path}`
}

/** 分类列表 */
export function getCategoryList(): Promise<CategoryItem[]> {
  return request({ url: '/blog/open/category/list', method: 'get' })
}

/** 标签列表（含已发布引用数） */
export function getTagList(): Promise<TagItem[]> {
  return request({ url: '/blog/open/tag/list', method: 'get' })
}

/** 文章评论树（仅已通过） */
export function getArticleComments(articleId: string | number): Promise<CommentItem[]> {
  return request({ url: '/blog/open/comment/list', method: 'get', params: { articleId } })
}

/** 发表评论（需登录） */
export function addComment(payload: CommentSavePayload): Promise<string | number> {
  return request({ url: '/blog/comment/add', method: 'post', data: payload })
}

/** ===== 微论坛 ===== */
export interface TopicItem {
  id: string | number
  title: string
  content?: string | null
  userId?: string | number
  nickname: string
  viewCount: number
  likeCount: number
  replyCount: number
  isTop: number
  isEssence: number
  lastReplyTime?: string | null
  createTime?: string | null
  liked?: boolean
}

export interface TopicReplyItem {
  id: string | number
  topicId: string | number
  parentId: number
  rootId: number
  nickname: string
  content: string
  likeCount: number
  liked?: boolean
  createTime?: string | null
  replies?: TopicReplyItem[]
}

export function getTopicList(params: {
  current?: number
  size?: number
  keyword?: string
  essence?: boolean
}): Promise<PageResult<TopicItem>> {
  return request({ url: '/blog/open/topic/list', method: 'get', params })
}

export function getTopicDetail(id: string | number): Promise<TopicItem> {
  return request({ url: '/blog/open/topic/detail', method: 'get', params: { id } })
}

export function getTopicReplies(topicId: string | number): Promise<TopicReplyItem[]> {
  return request({ url: '/blog/open/topic/replies', method: 'get', params: { topicId } })
}

export function saveTopic(data: { title: string; content: string }): Promise<string | number> {
  return request({ url: '/blog/topic/save', method: 'post', data })
}

export function replyTopic(data: {
  topicId: string | number
  parentId?: string | number
  rootId?: string | number
  content: string
}): Promise<string | number> {
  return request({ url: '/blog/topic/reply', method: 'post', data })
}

/** 点赞切换：type 1文章 2评论 3话题 4回复 */
export function toggleLike(
  type: number,
  targetId: string | number
): Promise<{ liked: boolean; likeCount: number }> {
  return request({ url: '/blog/like/toggle', method: 'post', params: { type, targetId } })
}
