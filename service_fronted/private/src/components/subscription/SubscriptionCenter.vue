<script setup>
import { ref, onMounted } from 'vue'
import PixivDaily from '../pixiv/PixivDaily.vue'

/**
 * 订阅中心：
 * - 上方：固定分组的精选 RSS 源（AI / 科技 / 市场）
 * - 下方：用户自定义 RSS 源，自上而下每个源一张卡片预览
 * - 右侧侧栏：Pixiv 每日一图
 */

const props = defineProps({
  pixivDaily: {
    type: Object,
    default: () => ({}),
  },
})

// 固定分组 RSS 源（进入页面时默认拉取）
const presetGroups = ref([
  {
    id: 'ai',
    title: 'AI 圈：从底层模型到应用落地',
    intro: '这个圈子现在的核心是「Agentic Workflow」和「物理世界 AI」。',
    feeds: [
      {
        id: 'ai-theinformation',
        name: 'The Information（AI 频道）',
        comment: '特点：硅谷深度内幕，关于模型训练成本、高层变动的消息全网最快。',
        url: 'https://www.theinformation.com/feed',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'ai-theneuron',
        name: 'The Neuron',
        comment: '特点：专注于 AI 的商业应用，每天帮你总结哪些 AI 工具真正好用。',
        url: 'https://www.theneuron.ai/feed',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'ai-alphasignal',
        name: 'AlphaSignal',
        comment: '特点：技术流最爱，由 AI 算法筛选出的本周最值得读的机器学习论文和硬核进展。',
        url: 'https://alphasignal.ai/feed',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'ai-mittr',
        name: 'MIT Technology Review（AI Section）',
        comment: '特点：权威性极高，更侧重于 AI 的伦理、政策及长远影响。',
        url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
        items: [],
        loading: false,
        error: '',
      },
    ],
  },
  {
    id: 'tech',
    title: '科技圈：泛科技与前沿趋势',
    intro: '关注「AI 之后」的硬件变革（如 AI PC、机器人）和开发者生态。',
    feeds: [
      {
        id: 'tech-hn',
        name: 'Hacker News（Best/Top Stories）',
        comment: '特点：极客风向标，这里的讨论质量往往比新闻本身还高。',
        url: 'https://news.ycombinator.com/rss',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'tech-techcrunch',
        name: 'TechCrunch',
        comment: '特点：创投圈的「老字号」，看初创公司融资和独角兽动态的首选。',
        url: 'https://techcrunch.com/feed/',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'tech-theverge',
        name: 'The Verge',
        comment: '特点：偏消费电子和科技文化，排版审美极佳。',
        url: 'https://www.theverge.com/rss/index.xml',
        items: [],
        loading: false,
        error: '',
      },
    ],
  },
  {
    id: 'market',
    title: '市场与投资圈：宏观风向与深度分析',
    intro: '在 2026 年波动的市场环境下，你需要一手的数据和专业的研报总结。',
    feeds: [
      {
        id: 'mkt-bloomberg',
        name: 'Bloomberg Markets',
        comment: '特点：全球市场的脉搏，数据驱动，极其客观。',
        url: 'https://www.bloomberg.com/feeds/markets/index.xml',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'mkt-ft',
        name: 'Financial Times（FT.com）',
        comment: '特点：深度财经评论，对于全球化投资风险的把控非常精准。',
        url: 'https://www.ft.com/?format=rss',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'mkt-seekingalpha',
        name: 'Seeking Alpha',
        comment: '特点：侧重个股分析和美股投资组合，汇集了大量个人投资者的实战见解。',
        url: 'https://seekingalpha.com/feed',
        items: [],
        loading: false,
        error: '',
      },
      {
        id: 'mkt-livemint',
        name: 'Livemint（Markets/AI）',
        comment: '特点：关注新兴市场（如印度等）与科技的结合，是很好的观察入口。',
        url: 'https://www.livemint.com/rss/markets',
        items: [],
        loading: false,
        error: '',
      },
    ],
  },
])

// 用户自定义 RSS 源列表（顺序即自上而下展示顺序）
const customSources = ref([])
const newSourceUrl = ref('')
const newSourceName = ref('')

// 简单的 RSS -> JSON 代理（示例用第三方服务，强烈建议换成你自己后端）
const RSS_PROXY = import.meta.env.VITE_RSS_PROXY || 'https://api.rss2json.com/v1/api.json?rss_url='

async function fetchRss(url) {
  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error('RSS 代理请求失败')
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items : []
    return items.slice(0, 8).map(item => ({
      title: item.title,
      link: item.link || item.url,
      author: item.author || item.creator || '',
      date: item.pubDate || item.date || '',
      source: data.feed?.title || '',
      // 部分 RSS（如 B 站）会带缩略图，这里做统一抽取，方便“小窗预览”
      thumb: item.thumbnail || item.enclosure?.link || '',
    }))
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function addCustomSource() {
  const url = newSourceUrl.value.trim()
  if (!url) return
  const name = newSourceName.value.trim() || url
  const id = `custom-${Date.now()}`
  const entry = {
    id,
    name,
    url,
    items: [],
    loading: true,
    error: '',
  }
  customSources.value.push(entry)
  newSourceUrl.value = ''
  newSourceName.value = ''
  try {
    entry.items = await fetchRss(url)
  } catch (e) {
    entry.error = e?.message || 'RSS 加载失败'
  } finally {
    entry.loading = false
  }
}

function removeCustomSource(id) {
  customSources.value = customSources.value.filter((s) => s.id !== id)
}

async function refreshSource(src) {
  src.loading = true
  src.error = ''
  try {
    src.items = await fetchRss(src.url)
  } catch (e) {
    src.error = e?.message || 'RSS 加载失败'
  } finally {
    src.loading = false
  }
}

// 页面挂载时，自动拉取固定分组下的所有 RSS 源
onMounted(() => {
  for (const group of presetGroups.value) {
    for (const feed of group.feeds) {
      refreshSource(feed)
    }
  }
})
</script>

<template>
  <div class="rss-page">
    <h2 class="rss-page-title">
      <i class="fas fa-rss"></i>
      订阅中心
      <span class="rss-page-subtitle">AI / 科技 / 市场 · 底部自定义 RSS · 右侧 Pixiv</span>
    </h2>

    <div class="rss-layout">
      <div class="rss-main">
        <!-- 固定分组：无 feed 头部，仅列表/加载/失败 -->
        <section
          v-for="group in presetGroups"
          :key="group.id"
          class="rss-block rss-block--group"
        >
          <header class="rss-block-head">
            <h3 class="rss-block-title">{{ group.title }}</h3>
            <p class="rss-block-desc">{{ group.intro }}</p>
          </header>
          <div class="rss-block-body">
            <div
              v-for="feed in group.feeds.filter(f => !f.error)"
              :key="feed.id"
              class="rss-feed"
            >
              <div v-if="feed.loading" class="rss-state rss-state--loading">
                <i class="fas fa-circle-notch fa-spin"></i>
                加载中…
              </div>
              <ul
                v-else-if="feed.items && feed.items.length"
                class="rss-article-list"
              >
                <li
                  v-for="(item, i) in feed.items"
                  :key="i"
                  class="rss-article-item"
                >
                  <a
                    :href="item.link"
                    class="rss-article-link"
                    target="_blank"
                    rel="noopener"
                  >
                    <span class="rss-article-inner">
                      <span class="rss-article-title">{{ item.title }}</span>
                      <span class="rss-article-meta">
                        <span v-if="item.source" class="rss-meta-tag">{{ item.source }}</span>
                        <span v-if="item.author" class="rss-meta-author">· {{ item.author }}</span>
                        <span v-if="item.date" class="rss-meta-date">· {{ item.date.slice(0, 10) }}</span>
                      </span>
                    </span>
                    <i class="fas fa-external-link-alt rss-article-icon"></i>
                  </a>
                </li>
              </ul>
              <div v-else class="rss-state rss-state--empty">
                <i class="fas fa-info-circle"></i>
                该源暂无文章
              </div>
            </div>
          </div>
        </section>

        <!-- 添加自定义源 -->
        <section class="rss-block rss-block--add">
          <header class="rss-block-head">
            <h3 class="rss-block-title"><i class="fas fa-plus-circle"></i> 添加 RSS 源</h3>
            <p class="rss-block-desc">输入 RSS 地址与可选名称，添加后在下方展示。</p>
          </header>
          <div class="rss-block-body">
            <div class="rss-add-form">
              <input
                v-model="newSourceUrl"
                type="url"
                class="rss-add-input"
                placeholder="RSS 地址"
              />
              <input
                v-model="newSourceName"
                type="text"
                class="rss-add-input rss-add-input--name"
                placeholder="显示名称（可选）"
              />
              <button type="button" class="rss-add-btn" @click="addCustomSource">
                添加并拉取
              </button>
            </div>
          </div>
        </section>

        <!-- 自定义源卡片 -->
        <section
          v-for="src in customSources"
          :key="src.id"
          class="rss-block rss-block--custom"
        >
          <header class="rss-block-head rss-block-head--row">
            <h3 class="rss-block-title">{{ src.name }}</h3>
            <div class="rss-block-actions">
              <button
                type="button"
                class="rss-btn rss-btn--sm"
                :disabled="src.loading"
                @click="refreshSource(src)"
              >
                {{ src.loading ? '加载中…' : '刷新' }}
              </button>
              <button
                type="button"
                class="rss-btn rss-btn--sm rss-btn--danger"
                @click="removeCustomSource(src.id)"
              >
                移除
              </button>
            </div>
          </header>
          <div class="rss-block-body">
            <div v-if="src.loading" class="rss-state rss-state--loading">
              <i class="fas fa-circle-notch fa-spin"></i>
              加载中…
            </div>
            <div v-else-if="src.error" class="rss-state rss-state--error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ src.error }}
            </div>
            <ul
              v-else-if="src.items && src.items.length"
              class="rss-article-list"
            >
              <li
                v-for="(item, i) in src.items"
                :key="i"
                class="rss-article-item"
              >
                <a
                  :href="item.link"
                  class="rss-article-link"
                  target="_blank"
                  rel="noopener"
                >
                  <span class="rss-article-inner">
                    <span class="rss-article-title">{{ item.title }}</span>
                    <span class="rss-article-meta">
                      <span v-if="item.source" class="rss-meta-tag">{{ item.source }}</span>
                      <span v-if="item.author" class="rss-meta-author">· {{ item.author }}</span>
                      <span v-if="item.date" class="rss-meta-date">· {{ item.date.slice(0, 10) }}</span>
                    </span>
                  </span>
                  <i class="fas fa-external-link-alt rss-article-icon"></i>
                </a>
              </li>
            </ul>
            <div v-else class="rss-state rss-state--empty">
              <i class="fas fa-info-circle"></i>
              该源暂无文章
            </div>
          </div>
        </section>
      </div>

      <aside class="rss-aside">
        <section class="rss-aside-card">
          <PixivDaily :daily="pixivDaily" />
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* 页面容器 */
.rss-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rss-page-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--private-text);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.rss-page-title i {
  color: var(--private-accent);
}

.rss-page-subtitle {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--private-muted);
}

/* 主布局：左主右栏 */
.rss-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.5fr) minmax(0, 1.5fr);
  gap: 20px;
  align-items: start;
}

.rss-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rss-aside {
  min-width: 0;
}

.rss-aside-card {
  position: sticky;
  top: 0;
}

/* 通用块：分组 / 添加 / 自定义 */
.rss-block {
  background: var(--private-card);
  border: 1px solid var(--private-border);
  border-radius: 10px;
  padding: 14px 16px;
}

.rss-block-head {
  margin-bottom: 10px;
}

.rss-block-head--row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rss-block-title {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--private-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rss-block-title i {
  color: var(--private-accent);
}

.rss-block-desc {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--private-muted);
  line-height: 1.4;
}

.rss-block-body {
  margin-top: 2px;
}

.rss-block-actions {
  display: flex;
  gap: 8px;
}

/* 分组内每个 feed 的盒子 */
.rss-block--group .rss-block-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rss-feed {
  padding: 10px 0;
  border-top: 1px solid var(--private-border);
}

.rss-feed:first-child {
  border-top: none;
  padding-top: 0;
}

/* 状态：加载中 / 失败 / 空 */
.rss-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 12px;
  font-size: 0.85rem;
  color: var(--private-muted);
  text-align: center;
}

.rss-state i {
  font-size: 1.1rem;
  opacity: 0.9;
}

.rss-state--loading {
  color: var(--private-muted);
}

.rss-state--error {
  color: #e57373;
  background: rgba(229, 115, 115, 0.08);
  border-radius: 8px;
}

.rss-state--empty {
  color: var(--private-muted);
}

/* 文章列表 */
.rss-article-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}

.rss-article-item {
  border-radius: 6px;
  overflow: hidden;
}

.rss-article-link {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  color: var(--private-text);
  text-decoration: none;
  font-size: 0.85rem;
  line-height: 1.45;
  transition: background 0.2s ease;
}

.rss-article-link:hover {
  background: var(--private-accent-soft);
}

.rss-article-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rss-article-title {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.rss-article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--private-muted);
  line-height: 1.4;
}

.rss-meta-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--private-accent-soft);
  color: var(--private-accent);
}

.rss-meta-author,
.rss-meta-date {
  white-space: nowrap;
}

.rss-article-icon {
  font-size: 0.75rem;
  color: var(--private-muted);
  flex-shrink: 0;
  margin-top: 2px;
}

/* 添加源表单 */
.rss-add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.rss-add-input {
  flex: 1;
  min-width: 120px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--private-border);
  border-radius: 8px;
  font-size: 0.85rem;
  outline: none;
  background: var(--private-surface);
  color: var(--private-text);
}

.rss-add-input:focus {
  border-color: var(--private-accent);
}

.rss-add-input--name {
  flex: 0 1 180px;
}

.rss-add-btn {
  height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 8px;
  background: var(--private-accent);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.rss-add-btn:hover {
  opacity: 0.9;
}

/* 自定义块内按钮 */
.rss-btn {
  padding: 0 12px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--private-border);
  background: var(--private-surface);
  color: var(--private-text);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.rss-btn:hover:not(:disabled) {
  background: var(--private-accent-soft);
  border-color: var(--private-accent);
}

.rss-btn--sm {
  padding: 0 10px;
  height: 26px;
  font-size: 0.75rem;
}

.rss-btn--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.rss-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .rss-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .rss-page-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .rss-block {
    padding: 12px;
  }

  .rss-article-link {
    padding: 8px 10px;
  }
}
</style>

