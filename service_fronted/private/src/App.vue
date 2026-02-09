<script setup>
import { ref, nextTick, computed } from 'vue'
import Breadcrumb from './components/Breadcrumb.vue'

const tabs = [
  { id: 'meitu', label: '美图', icon: 'fa-image' },
  { id: 'erciyuan', label: '二次元', icon: 'fa-star' },
  { id: 'pixiv', label: 'Pixiv', icon: 'fa-palette' },
  { id: 'video', label: '视频', icon: 'fa-play' },
  { id: 'waifu', label: '老婆', icon: 'fa-heart' },
]

// 面包屑分隔符图片（public/breadcrumb/arrow.svg）
const breadcrumbSep = import.meta.env.BASE_URL + 'breadcrumb/arrow.svg'

const placeholderImages = (count, seed) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${seed}-${i}`,
    thumb: `https://picsum.photos/400/400?random=${seed}${i}`,
    title: seed === 'meitu' ? `美图 ${i + 1}` : `二次元 ${i + 1}`,
  }))

const meituList = placeholderImages(8, 'meitu')
const erciyuanList = placeholderImages(8, 'erciyuan')

const pixivDaily = {
  image: 'https://picsum.photos/800/600?random=pixiv',
  title: '每日一图',
  author: '示例作者',
  link: '#',
}

const videoList = [
  { id: 'v1', title: '示例视频 1', thumb: 'https://picsum.photos/320/180?random=video1', src: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'v2', title: '示例视频 2', thumb: 'https://picsum.photos/320/180?random=video2', src: 'https://www.w3schools.com/html/movie.mp4' },
]

const activeTab = ref('meitu')
const waifuView = ref('list') // list | add | edit | detail
const currentWaifu = ref(null)
const currentVideo = ref(videoList[0] ?? null)
const videoPlayer = ref(null)

// 老婆列表占位（后续接 CRUD）
const waifuList = ref([
  { id: '1', name: '示例老婆', art: 'https://picsum.photos/400/600?random=waifu1', source: '示例作品', note: '占位数据，后续可增删改' },
])

const breadcrumbItems = computed(() => {
  const base = [{ label: '私站', to: '' }]
  if (activeTab.value !== 'waifu') {
    const t = tabs.find(x => x.id === activeTab.value)
    return [...base, { label: t?.label ?? '首页', to: null }]
  }
  const second = [{ label: '老婆', to: 'waifu' }]
  const thirdMap = {
    list: { label: '列表', to: null, icon: 'list' },
    add: { label: '添加', to: null, icon: 'add' },
    edit: { label: '编辑', to: null, icon: 'edit' },
    detail: { label: '详情', to: null, icon: 'user' },
  }
  const third = thirdMap[waifuView.value] || thirdMap.list
  return [...base, ...second, third]
})

function setTab(id) {
  activeTab.value = id
  if (id === 'waifu') waifuView.value = 'list'
}

function onBreadcrumbNavigate(to) {
  if (to === '') setTab('meitu')
  else if (to === 'waifu') setTab('waifu')
}

function playVideo(item) {
  currentVideo.value = item
  nextTick(() => {
    if (videoPlayer.value) {
      videoPlayer.value.load()
      videoPlayer.value.play().catch(() => {})
    }
  })
}
</script>

<template>
  <header class="private-header">
    <h1><i class="fas fa-heart"></i> 私站</h1>
    <nav class="private-nav">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="private-nav-btn"
        :class="{ active: activeTab === t.id }"
        @click="setTab(t.id)"
      >
        <i class="fas" :class="t.icon"></i>
        <span>{{ t.label }}</span>
      </button>
    </nav>
  </header>

  <main class="private-main">
    <Breadcrumb
      v-if="breadcrumbItems.length"
      :items="breadcrumbItems"
      :sep-image="breadcrumbSep"
      @navigate="onBreadcrumbNavigate"
    />

    <section class="private-section" :class="{ active: activeTab === 'meitu' }">
      <h2 class="section-title"><i class="fas fa-image"></i> 美图</h2>
      <div class="gallery-grid">
        <a
          v-for="item in meituList"
          :key="item.id"
          class="gallery-card"
          :href="item.thumb"
          target="_blank"
          rel="noopener"
        >
          <img class="thumb" :src="item.thumb" :alt="item.title" loading="lazy" />
          <div class="info"><strong>{{ item.title }}</strong></div>
        </a>
      </div>
    </section>

    <section class="private-section" :class="{ active: activeTab === 'erciyuan' }">
      <h2 class="section-title"><i class="fas fa-star"></i> 二次元</h2>
      <div class="gallery-grid">
        <a
          v-for="item in erciyuanList"
          :key="item.id"
          class="gallery-card"
          :href="item.thumb"
          target="_blank"
          rel="noopener"
        >
          <img class="thumb" :src="item.thumb" :alt="item.title" loading="lazy" />
          <div class="info"><strong>{{ item.title }}</strong></div>
        </a>
      </div>
    </section>

    <section class="private-section" :class="{ active: activeTab === 'pixiv' }">
      <h2 class="section-title"><i class="fas fa-palette"></i> Pixiv 每日一图</h2>
      <div class="pixiv-daily">
        <div class="daily-image-wrap">
          <img :src="pixivDaily.image" :alt="pixivDaily.title" loading="lazy" />
        </div>
        <div class="daily-meta">
          <span>{{ pixivDaily.title }}</span>
          <span v-if="pixivDaily.author"> · {{ pixivDaily.author }}</span>
          <a v-if="pixivDaily.link" :href="pixivDaily.link" target="_blank" rel="noopener">查看原图</a>
        </div>
      </div>
      <p class="empty-state">
        <i class="fas fa-info-circle"></i><br />
        接入 Pixiv API 后可在此展示每日推荐插画。
      </p>
    </section>

    <section class="private-section" :class="{ active: activeTab === 'video' }">
      <h2 class="section-title"><i class="fas fa-play"></i> 视频</h2>
      <div class="video-section">
        <div class="video-player-wrap" v-if="currentVideo">
          <video
            ref="videoPlayer"
            controls
            playsinline
            :poster="currentVideo.thumb"
            :src="currentVideo.src"
          />
        </div>
        <div class="video-list">
          <div
            v-for="item in videoList"
            :key="item.id"
            class="video-item"
            :class="{ playing: currentVideo && currentVideo.id === item.id }"
            @click="playVideo(item)"
          >
            <div class="thumb-wrap">
              <img :src="item.thumb" :alt="item.title" />
              <div class="play-overlay"><i class="fas fa-play"></i></div>
            </div>
            <div class="title">{{ item.title }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="private-section" :class="{ active: activeTab === 'waifu' }">
      <h2 class="section-title"><i class="fas fa-heart"></i> 我推的老婆</h2>
      <div class="waifu-layout">
        <aside class="waifu-art">
          <template v-if="waifuView === 'list'">
            <div class="waifu-art-placeholder">选一位查看立绘</div>
          </template>
          <template v-else>
            <img
              v-if="currentWaifu?.art"
              :src="currentWaifu.art"
              :alt="currentWaifu.name"
            />
            <div v-else class="waifu-art-placeholder">暂无立绘</div>
          </template>
        </aside>
        <div class="waifu-info">
          <template v-if="waifuView === 'list'">
            <p class="empty-state">点击下方卡片可进入详情（CRUD 后续完善）</p>
            <div class="waifu-list-grid">
              <div
                v-for="w in waifuList"
                :key="w.id"
                class="waifu-list-card"
                @click="currentWaifu = w; waifuView = 'detail'"
              >
                <img class="art" :src="w.art" :alt="w.name" loading="lazy" />
                <div class="name">{{ w.name }}</div>
              </div>
            </div>
            <div class="waifu-actions">
              <button type="button" class="private-nav-btn active" @click="waifuView = 'add'">
                <i class="fas fa-plus"></i> 添加老婆
              </button>
            </div>
          </template>
          <template v-else-if="waifuView === 'add'">
            <div class="waifu-info-card">
              <h3><i class="fas fa-plus"></i> 添加</h3>
              <p class="empty-state">表单占位，后续接 CRUD</p>
              <button type="button" class="private-nav-btn" @click="waifuView = 'list'">返回列表</button>
            </div>
          </template>
          <template v-else>
            <div class="waifu-info-card" v-if="currentWaifu">
              <h3><i class="fas fa-user"></i> 基本信息</h3>
              <div class="waifu-info-row"><span class="waifu-info-label">名字</span><span class="waifu-info-value">{{ currentWaifu.name }}</span></div>
              <div class="waifu-info-row"><span class="waifu-info-label">出处</span><span class="waifu-info-value">{{ currentWaifu.source }}</span></div>
              <div class="waifu-info-row"><span class="waifu-info-label">备注</span><span class="waifu-info-value">{{ currentWaifu.note }}</span></div>
            </div>
            <div class="waifu-actions">
              <button type="button" class="private-nav-btn" @click="waifuView = 'edit'"><i class="fas fa-edit"></i> 编辑</button>
              <button type="button" class="private-nav-btn" @click="waifuView = 'list'; currentWaifu = null"><i class="fas fa-list"></i> 返回列表</button>
            </div>
          </template>
        </div>
      </div>
    </section>
  </main>

  <div class="private-footer"></div>
</template>
