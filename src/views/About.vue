<template>
  <div class="about-page">
    <section class="card hero">
      <h1>关于云记</h1>
      <p class="lead">
        云记博客是基于 <strong>cloudwaer-blog</strong> 的多作者技术写作与轻论坛平台，
        记录工程实践、踩坑与思考。
      </p>
    </section>

    <section class="card block">
      <h2>本站能做什么</h2>
      <ul>
        <li>多作者入驻：访客申请成为博客主，独立撰写与管理文章</li>
        <li>Markdown 写作：代码高亮、目录导航、分类标签筛选</li>
        <li>互动：评论审核、点赞、热度排序、微论坛短帖</li>
        <li>管理后台：文章 / 评论 / 论坛 / 权限一体化（Cloudwaer Admin）</li>
      </ul>
    </section>

    <section class="card block">
      <h2>技术栈</h2>
      <div class="stack">
        <span class="pill">Spring Boot 3</span>
        <span class="pill">Spring Cloud</span>
        <span class="pill">MyBatis-Plus</span>
        <span class="pill">Vue 3</span>
        <span class="pill">Vite</span>
        <span class="pill">Element Plus</span>
      </div>
    </section>

    <section class="card block">
      <h2>友链</h2>
      <p class="muted">欢迎同类技术博客互换友链，可先在微论坛留言。</p>
      <ul>
        <li><a href="https://spring.io" target="_blank" rel="noopener">Spring</a> — 官方文档</li>
        <li><a href="https://vuejs.org" target="_blank" rel="noopener">Vue.js</a> — 渐进式前端框架</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 760px;
}

.hero {
  padding: 28px 32px;
}

.hero h1 {
  margin: 0 0 12px;
  font-size: 26px;
}

.lead {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.8;
}

.block {
  padding: 22px 28px;
}

.block h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.block ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
}

.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 999px;
}

.block a {
  color: var(--accent);
}

.muted {
  color: #9ca3af;
  font-size: 13px;
}
</style>
