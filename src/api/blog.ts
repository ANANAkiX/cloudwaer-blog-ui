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
  collectionId?: string | number | null
  collectionSort?: number | null
  collection?: CollectionItem | null
  collectionArticles?: ArticleItem[] | null
  authorId?: string | number
  authorName: string
  authorAvatar?: string | null
  publishStatus: number
  /** 审核意见（文章被拒时反馈给作者） */
  auditRemark?: string | null
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

/** 合集（创作中心/详情侧栏） */
export interface CollectionItem {
  id: string | number
  name: string
  description?: string | null
  coverUrl?: string | null
  articleCount?: number
  sort?: number
  createTime?: string | null
  updateTime?: string | null
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
  /** 附图列表（/blog/uploads/**） */
  images?: string[] | null
  likeCount: number
  createTime?: string | null
  replies?: CommentItem[]
  /** 楼中楼总数（树分页回填） */
  replyTotal?: number
}

export interface CommentSavePayload {
  articleId: string | number
  parentId?: string | number
  rootId?: string | number
  content: string
  images?: string[]
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

/** 上传评论图片/表情包（登录即可，不要求作者权限） */
export function uploadCommentImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  return request({ url: '/blog/upload/comment-image', method: 'post', data: form })
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

/** 文章评论树分页（默认5条顶级，每条附带3条楼中楼） */
export function getCommentTreePage(
  articleId: string | number,
  params: { current?: number; size?: number; childSize?: number } = {}
): Promise<PageResult<CommentItem>> {
  return request({
    url: '/blog/open/comment/page',
    method: 'get',
    params: { articleId, current: params.current ?? 1, size: params.size ?? 5, childSize: params.childSize ?? 3 }
  })
}

/** 楼中楼「展开更多」：从 offset（已展示条数）起再取 size 条 */
export function getCommentReplies(
  rootId: string | number,
  offset: number,
  size = 10
): Promise<PageResult<CommentItem>> {
  return request({
    url: '/blog/open/comment/replies',
    method: 'get',
    params: { rootId, offset, size }
  })
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

/** 发布/保存文章（需 blog:article:add） */
export function saveArticle(data: {
  title: string
  summary?: string
  content: string
  coverUrl?: string
  categoryId?: string | number | null
  collectionId?: string | number | null
  collectionSort?: number | null
  tagIds?: (string | number)[]
  publishStatus?: number
  isTop?: number
  isRecommend?: number
}): Promise<number> {
  return request({ url: '/blog/article/my/save', method: 'post', data })
}

/** 我的合集下拉（登录即可，仅本人） */
export function getMyCollections(): Promise<CollectionItem[]> {
  return request({ url: '/blog/collection/my/options', method: 'get' })
}

/** 我的合集保存（登录即可，仅本人） */
export function saveMyCollection(data: {
  id?: string | number
  name: string
  description?: string
}): Promise<boolean> {
  return request({ url: '/blog/collection/my/save', method: 'post', data })
}

/** 我的合集删除 */
export function deleteMyCollection(id: string | number): Promise<boolean> {
  return request({ url: '/blog/collection/my/delete', method: 'delete', params: { id } })
}

/** 合集内本人文章 */
export function getMyCollectionArticles(
  collectionId: string | number,
  params: { current?: number; size?: number } = {}
): Promise<PageResult<ArticleItem>> {
  return request({
    url: '/blog/collection/my/articles',
    method: 'get',
    params: { collectionId, ...params }
  })
}

/** 文章加入/移出合集（collectionId 空=移出） */
export function bindArticleCollection(
  articleId: string | number,
  collectionId: string | number | null
): Promise<boolean> {
  return request({
    url: '/blog/collection/my/bind-article',
    method: 'put',
    params: { articleId, collectionId: collectionId ?? undefined }
  })
}

/** 我的合集分页（创作中心/个人中心） */
export function pageMyCollections(params: {
  current?: number
  size?: number
  keyword?: string
}): Promise<PageResult<CollectionItem>> {
  return request({ url: '/blog/collection/my/page', method: 'get', params })
}

/** 我的文章分页（仅本人） */
export function pageMyArticles(params: {
  current?: number
  size?: number
  keyword?: string
  publishStatus?: number
}): Promise<PageResult<ArticleItem>> {
  return request({ url: '/blog/article/my/page', method: 'get', params })
}

/** 我的文章详情 */
export function getMyArticleDetail(id: string | number): Promise<ArticleItem> {
  return request({ url: '/blog/article/my/detail', method: 'get', params: { id } })
}

/** 我的文章更新 */
export function updateMyArticle(data: {
  id: string | number
  title: string
  summary?: string
  content: string
  coverUrl?: string
  categoryId?: string | number | null
  collectionId?: string | number | null
  tagIds?: (string | number)[]
  publishStatus?: number
}): Promise<number> {
  return request({ url: '/blog/article/my/update', method: 'put', data })
}

/** 我的文章删除 */
export function deleteMyArticle(id: string | number): Promise<boolean> {
  return request({ url: '/blog/article/my/delete', method: 'delete', params: { id } })
}

/** 新建标签（需 blog:tag:add），返回标签 ID */
export function saveTag(data: { name: string; slug?: string }): Promise<string | number> {
  return request({ url: '/blog/tag/save', method: 'post', data })
}

/** 文章导入解析结果 */
export interface ArticleImportResult {
  title: string
  content: string
  filename?: string
  textLength?: number
}

/** 平台用户资料（仅本人） */
export interface UserProfile {
  id?: string | number
  username?: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string | null
}

export function getMyProfile(): Promise<UserProfile> {
  return request({ url: '/admin/user/profile', method: 'get' })
}

export function updateMyProfile(data: {
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
}): Promise<boolean> {
  return request({ url: '/admin/user/profile', method: 'put', data })
}

/** 登录用户上传头像等（平台文件服务） */
export function uploadMyFile(
  file: File,
  bizType = 'avatar'
): Promise<{ accessUrl?: string; fileName?: string; id?: string | number }> {
  const form = new FormData()
  form.append('file', file)
  form.append('bizType', bizType)
  return request({ url: '/admin/file/my/upload', method: 'post', data: form })
}

/** 导入 MD/TXT/PDF/DOCX → 标题+Markdown（需 blog:article:add，不落库） */
export function importArticleFile(file: File): Promise<ArticleImportResult> {
  const form = new FormData()
  form.append('file', file)
  return request({ url: '/blog/article/import', method: 'post', data: form })
}

/** ===== 站点设置（与 SiteSettingDTO 对齐） ===== */

/** 导航菜单项（blog_site_setting.nav JSON） */
export interface NavSettingItem {
  key?: string
  label?: string
  path?: string
  visible?: boolean
  order?: number
}

/** 独立页面文案（blog_site_setting.pages JSON 值） */
export interface PageSettingItem {
  title?: string
  content?: string
}

/** 文章详情布局（blog_site_setting.articleLayout JSON） */
export interface ArticleLayoutSetting {
  /** left | right | off */
  tocPosition?: string
}

/** 首页模块开关（blog_site_setting.homeLayout JSON） */
export interface HomeLayoutSetting {
  showFeatured?: boolean
  showTagCloud?: boolean
  showHot?: boolean
}

export interface SiteSetting {
  siteTitle?: string
  siteDescription?: string
  favicon?: string
  /** 是否开启搜索：0-关闭，1-开启 */
  enableSearch?: number
  /** 非管理员发布文章是否需审核：0-免审，1-需审核（缺省1） */
  requireArticleAudit?: number
  /** 网站布局：default / compact / magazine */
  layout?: string
  footerText?: string
  nav?: NavSettingItem[]
  pages?: Record<string, PageSettingItem>
  articleLayout?: ArticleLayoutSetting
  homeLayout?: HomeLayoutSetting
}

/** 公开读站点设置（匿名） */
export function getOpenSiteSetting(): Promise<SiteSetting> {
  return request({ url: '/blog/open/setting', method: 'get' })
}
