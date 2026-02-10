<script setup>
import { ref, onMounted } from 'vue'
import PixivDaily from '../pixiv/PixivDaily.vue'

/**
 * 订阅中心新版布局：
 * - 左侧主列：资讯订阅（主）、微信公众号、B 站更新、自定义 RSS
 * - 右侧侧栏：Pixiv 每日一图
 *
 * 实际生产中建议后端做统一聚合与缓存，这里以前端 + RSS 代理为示例。
 */

const props = defineProps({
  pixivDaily: {
    type: Object,
    default: () => ({}),
  },
})

// 简单的数据结构定义（顺序即展示顺序：资讯 > 微信 > B 站）
const channels = ref([
  {
    id: 'news',
    title: '资讯订阅',
    icon: 'fa-newspaper',
    desc: 'IT / ACG / 日常资讯，示例使用 RSS 聚合，可替换为你自己的后端接口。',
    sources: [
      {
        id: 'rss-36kr',
        name: '36氪（示例）',
        url: 'https://36kr.com/feed',
        type: 'rss',
      },
      {
        id: 'rss-smzdm',
        name: '什么值得买（示例）',
        url: 'https://post.smzdm.com/feed',
        type: 'rss',
      },
    ],
    items: [],
    loading: false,
    error: '',
  },
  {
    id: 'wechat',
    title: '微信公众号',
    icon: 'fa-weixin',
    desc: '通过 RSSHub / 自建服务暴露为 RSS，再在此聚合展示。',
    sources: [
      {
        id: 'rss-wechat-demo',
        name: '示例公众号',
        // 这里用 RSSHub 作为示例，实际请替换为你自己的地址
        url: 'https://rsshub.app/wechat/channel/0',
        type: 'rss',
      },
    ],
    items: [],
    loading: false,
    error: '',
  },
  {
    id: 'bilibili',
    title: 'Bilibili 更新',
    icon: 'fa-bilibili', // 若无该图标，可用 fa-play-circle 代替
    desc: '关注 UP 主投稿 / 收藏夹 / 专栏，推荐通过 RSSHub / 自建接口输出 RSS 或 JSON。',
    sources: [
      {
        id: 'rss-bilibili-demo',
        name: '示例 UP 主',
        url: 'https://rsshub.app/bilibili/user/video/2',
        type: 'rss',
      },
    ],
    items: [],
    loading: false,
    error: '',
  },
])

// 微信绑定信息（预留给后端，当前为前端占位展示）
const wechatBindInfo = ref({
  bound: false,
  account: '',
  followerCount: null,
  lastSync: '',
})

// B 站 UID，可根据用户输入切换订阅源
const bilibiliUid = ref('2')

// 自定义 RSS：用户在前端临时添加，开发期方便调试
const customUrl = ref('')
const customFeeds = ref({
  loading: false,
  error: '',
  items: [],
})

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

async function loadChannel(channel) {
  channel.loading = true
  channel.error = ''
  try {
    const all = []
    for (const s of channel.sources) {
      if (s.type === 'rss' && s.url) {
        try {
          const items = await fetchRss(s.url)
          all.push(
            ...items.map(x => ({
              ...x,
              _sourceId: s.id,
              _sourceName: s.name,
            })),
          )
        } catch (e) {
          // 单个源失败仅记录日志，不影响其他源
          console.warn('订阅源加载失败', s, e)
        }
      }
    }
    channel.items = all
  } catch (e) {
    channel.error = e?.message || '订阅数据加载失败'
  } finally {
    channel.loading = false
  }
}

async function loadAllChannels() {
  for (const c of channels.value) {
    // 懒加载：页面首次挂载时加载一次
    loadChannel(c)
  }
}

// 「绑定」微信（当前为前端占位逻辑，后端接入后可替换为真实接口）
function onMockWechatBind() {
  const now = new Date()
  wechatBindInfo.value = {
    bound: true,
    account: '示例公众号',
    followerCount: 12345,
    lastSync: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`,
  }
}

// 根据用户输入的 UID 更新 B 站订阅源，并重新拉取
function applyBilibiliUid() {
  const uid = bilibiliUid.value.trim()
  if (!uid) return
  const ch = channels.value.find(c => c.id === 'bilibili')
  if (!ch) return
  ch.sources = [
    {
      id: `rss-bilibili-${uid}`,
      name: `UID ${uid}`,
      url: `https://rsshub.app/bilibili/user/video/${uid}`,
      type: 'rss',
    },
  ]
  ch.items = []
  loadChannel(ch)
}

async function onAddCustomRss() {
  const url = customUrl.value.trim()
  if (!url) return
  customFeeds.value.loading = true
  customFeeds.value.error = ''
  customFeeds.value.items = []
  try {
    customFeeds.value.items = await fetchRss(url)
  } catch (e) {
    customFeeds.value.error = e?.message || '自定义 RSS 加载失败'
  } finally {
    customFeeds.value.loading = false
  }
}

onMounted(() => {
  loadAllChannels()
})
</script>

<template>
  <div class="subscription-page">
    <h2 class="subscription-title">
      <i class="fas fa-rss"></i>
      订阅中心
      <span class="subscription-subtitle">左侧资讯流 / 微信 / B 站 · 右侧 Pixiv 每日一图</span>
    </h2>

    <div class="subscription-layout">
      <!-- 左侧主列：资讯订阅 / 微信公众号 / B 站更新 / 自定义 RSS -->
      <div class="subscription-main">
        <section
          v-for="ch in channels"
          :key="ch.id"
          class="subscription-card"
          :class="`subscription-card--${ch.id}`"
        >
          <header class="subscription-card-header">
            <div class="subscription-card-title">
              <i
                v-if="ch.icon === 'fa-bilibili'"
                class="fab fa-bilibili"
              ></i>
              <i
                v-else
                :class="['fas', ch.icon]"
              ></i>
              <span>{{ ch.title }}</span>
            </div>
            <p class="subscription-card-desc">
              {{ ch.desc }}
            </p>
          </header>

          <div class="subscription-card-body">
            <!-- 微信公众号：绑定状态展示（预留后端能力） -->
            <div
              v-if="ch.id === 'wechat'"
              class="subscription-extra-row"
            >
              <div v-if="!wechatBindInfo.bound" class="subscription-extra-content">
                <span class="extra-label">账号绑定：</span>
                <span class="extra-text">当前未绑定，可在接入后端接口后，通过扫码/授权方式获取公众号关注情况与文章。</span>
                <button
                  type="button"
                  class="subscription-btn subtle"
                  @click="onMockWechatBind"
                >
                  模拟绑定预览
                </button>
              </div>
              <div v-else class="subscription-extra-content">
                <span class="extra-label">已绑定账号：</span>
                <span class="extra-tag">{{ wechatBindInfo.account }}</span>
                <span v-if="wechatBindInfo.followerCount" class="extra-meta">
                  关注人数约 {{ wechatBindInfo.followerCount.toLocaleString() }}
                </span>
                <span v-if="wechatBindInfo.lastSync" class="extra-meta">
                  · 最近同步：{{ wechatBindInfo.lastSync }}
                </span>
              </div>
            </div>

            <!-- B 站：按用户 UID 拉取关注/投稿更新（通过 RSSHub 示例） -->
            <div
              v-if="ch.id === 'bilibili'"
              class="subscription-extra-row"
            >
              <div class="subscription-extra-content">
                <span class="extra-label">B 站 UID：</span>
                <input
                  v-model="bilibiliUid"
                  type="text"
                  inputmode="numeric"
                  class="subscription-input slim"
                  placeholder="输入你的 B 站 UID，如 2"
                />
                <button
                  type="button"
                  class="subscription-btn"
                  @click="applyBilibiliUid"
                >
                  更新订阅
                </button>
              </div>
              <p class="subscription-hint">
                这里使用 RSSHub 的用户投稿 RSS 作为示例，实际项目可以改为「关注列表」或自建 JSON 接口。
              </p>
            </div>

            <div v-if="ch.loading" class="subscription-empty">
              <i class="fas fa-circle-notch fa-spin"></i>
              正在加载订阅内容…
            </div>
            <div v-else-if="ch.error" class="subscription-empty error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ ch.error }}（可在代码中替换为你自己的后端接口）
            </div>
            <template v-else>
              <!-- B 站：卡片小窗预览 -->
              <div
                v-if="ch.id === 'bilibili' && ch.items && ch.items.length"
                class="bilibili-grid"
              >
                <article
                  v-for="(item, i) in ch.items"
                  :key="i"
                  class="bilibili-card"
                >
                  <a
                    :href="item.link"
                    class="bilibili-link"
                    target="_blank"
                    rel="noopener"
                  >
                    <div class="bilibili-thumb" v-if="item.thumb">
                      <img
                        :src="item.thumb"
                        :alt="item.title"
                        loading="lazy"
                      />
                    </div>
                    <div class="bilibili-thumb placeholder" v-else>
                      <i class="fas fa-play-circle"></i>
                    </div>
                    <div class="bilibili-meta">
                      <div class="bilibili-title">
                        {{ item.title }}
                      </div>
                      <div class="bilibili-sub">
                        <span v-if="item._sourceName" class="meta-tag">
                          {{ item._sourceName }}
                        </span>
                        <span v-if="item.date" class="meta-date">
                          · {{ item.date.slice(0, 10) }}
                        </span>
                      </div>
                    </div>
                  </a>
                </article>
              </div>

              <!-- 默认列表样式：资讯 / 微信等 -->
              <ul
                v-else-if="ch.items && ch.items.length"
                class="subscription-list"
              >
                <li
                  v-for="(item, i) in ch.items"
                  :key="i"
                  class="subscription-list-item"
                >
                  <a
                    :href="item.link"
                    class="subscription-link"
                    target="_blank"
                    rel="noopener"
                  >
                    <span class="subscription-link-main">
                      <span class="subscription-link-title">{{ item.title }}</span>
                      <span class="subscription-link-meta">
                        <span v-if="item._sourceName" class="meta-tag">
                          {{ item._sourceName }}
                        </span>
                        <span v-if="item.author" class="meta-author">
                          · {{ item.author }}
                        </span>
                        <span v-if="item.date" class="meta-date">
                          · {{ item.date.slice(0, 10) }}
                        </span>
                      </span>
                    </span>
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </li>
              </ul>

              <div v-else class="subscription-empty">
                <i class="fas fa-info-circle"></i>
                暂无可用数据，可在前端修改订阅源列表或接入后端接口。
              </div>
            </template>
          </div>
        </section>

        <!-- 自定义 RSS 订阅区 -->
        <section class="subscription-card subscription-card--custom">
          <header class="subscription-card-header">
            <div class="subscription-card-title">
              <i class="fas fa-plus-circle"></i>
              <span>自定义 RSS 源</span>
            </div>
            <p class="subscription-card-desc">
              临时订阅任意 RSS 地址，开发/调试阶段非常方便。正式环境推荐写死在配置或通过后端管理。
            </p>
          </header>
          <div class="subscription-card-body">
            <div class="subscription-custom-form">
              <input
                v-model="customUrl"
                type="url"
                class="subscription-input"
                placeholder="输入 RSS Feed 地址，如 https://example.com/feed.xml"
              />
              <button
                type="button"
                class="subscription-btn"
                @click="onAddCustomRss"
              >
                拉取
              </button>
            </div>

            <div v-if="customFeeds.loading" class="subscription-empty">
              <i class="fas fa-circle-notch fa-spin"></i>
              正在拉取自定义 RSS…
            </div>
            <div v-else-if="customFeeds.error" class="subscription-empty error">
              <i class="fas fa-exclamation-triangle"></i>
              {{ customFeeds.error }}
            </div>
            <ul
              v-else-if="customFeeds.items && customFeeds.items.length"
              class="subscription-list"
            >
              <li
                v-for="(item, i) in customFeeds.items"
                :key="i"
                class="subscription-list-item"
              >
                <a
                  :href="item.link"
                  class="subscription-link"
                  target="_blank"
                  rel="noopener"
                >
                  <span class="subscription-link-main">
                    <span class="subscription-link-title">{{ item.title }}</span>
                    <span class="subscription-link-meta">
                      <span v-if="item.source" class="meta-tag">
                        {{ item.source }}
                      </span>
                      <span v-if="item.author" class="meta-author">
                        · {{ item.author }}
                      </span>
                      <span v-if="item.date" class="meta-date">
                        · {{ item.date.slice(0, 10) }}
                      </span>
                    </span>
                  </span>
                  <i class="fas fa-external-link-alt"></i>
                </a>
              </li>
            </ul>
            <div v-else class="subscription-empty">
              <i class="fas fa-info-circle"></i>
              还没有拉取任何自定义 RSS，可以尝试填入一个有效的 RSS 地址。
            </div>
          </div>
        </section>
      </div>

      <!-- 右侧侧栏：Pixiv 每日一图，从主内容中挪出 -->
      <aside class="subscription-sidebar">
        <section class="subscription-sidebar-card">
          <PixivDaily :daily="pixivDaily" />
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.subscription-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subscription-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--private-text);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.subscription-title i {
  color: var(--private-accent);
}

.subscription-subtitle {
  font-size: 0.8rem;
  color: var(--private-muted);
}

.subscription-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(0, 1.6fr);
  gap: 16px;
  align-items: flex-start;
}

.subscription-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subscription-sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subscription-sidebar-card {
  position: sticky;
  top: 0;
}

.subscription-card {
  background: var(--private-card);
  border-radius: var(--private-radius);
  border: 1px solid var(--private-border);
  padding: 10px 12px;
}

.subscription-card-header {
  margin-bottom: 8px;
}

.subscription-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--private-text);
}

.subscription-card-title i {
  color: var(--private-accent);
}

.subscription-card-desc {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--private-muted);
}

.subscription-card-body {
  margin-top: 4px;
}

.subscription-extra-row {
  margin-bottom: 8px;
}

.subscription-extra-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--private-muted);
}

.extra-label {
  font-weight: 500;
  color: var(--private-text);
}

.extra-text {
  flex: 1;
  min-width: 0;
}

.extra-tag {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--private-accent-soft);
  color: var(--private-accent);
}

.extra-meta {
  white-space: nowrap;
}

.subscription-hint {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: var(--private-muted);
}

.subscription-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 8px;
  font-size: 0.8rem;
  color: var(--private-muted);
  text-align: center;
}

.subscription-empty i {
  font-size: 1.2rem;
  opacity: 0.8;
}

.subscription-empty.error {
  color: #f97373;
}

.subscription-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow: auto;
}

.subscription-list-item {
  border-radius: var(--private-radius-sm);
  overflow: hidden;
}

.subscription-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  color: var(--private-text);
  text-decoration: none;
  font-size: 0.8rem;
  transition: background 0.15s ease, transform 0.05s ease;
}

.subscription-link:hover {
  background: var(--private-accent-soft);
  transform: translateY(-0.5px);
}

.subscription-link-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.subscription-link-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subscription-link-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--private-muted);
}

.meta-tag {
  padding: 1px 4px;
  border-radius: 999px;
  background: var(--private-accent-soft);
  color: var(--private-accent);
}

.meta-author,
.meta-date {
  white-space: nowrap;
}

.subscription-link i.fas {
  font-size: 0.7rem;
  color: var(--private-muted);
  flex-shrink: 0;
}

.subscription-custom-form {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.subscription-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--private-border);
  font-size: 0.8rem;
  outline: none;
}

.subscription-input.slim {
  height: 26px;
  font-size: 0.78rem;
}

.subscription-input:focus {
  border-color: var(--private-accent);
}

.subscription-btn {
  padding: 0 12px;
  min-width: 64px;
  border-radius: 999px;
  border: none;
  background: var(--private-accent);
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.subscription-btn:hover {
  opacity: 0.95;
}

.subscription-btn.subtle {
  background: var(--private-surface);
  color: var(--private-text);
  border: 1px solid var(--private-border);
}

.subscription-btn.subtle:hover {
  background: var(--private-accent-soft);
}

/* B 站小窗卡片预览 */
.bilibili-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}

.bilibili-card {
  border-radius: var(--private-radius-sm);
  overflow: hidden;
  background: var(--private-surface);
  border: 1px solid var(--private-border);
}

.bilibili-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--private-text);
}

.bilibili-thumb {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  background: #000;
}

.bilibili-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bilibili-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
}

.bilibili-thumb.placeholder i {
  font-size: 1.6rem;
}

.bilibili-meta {
  padding: 6px 8px;
  font-size: 0.78rem;
}

.bilibili-title {
  max-height: 2.6em;
  overflow: hidden;
}

.bilibili-sub {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--private-muted);
}

@media (max-width: 900px) {
  .subscription-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .subscription-card {
    padding: 8px;
  }

  .subscription-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
</style>

