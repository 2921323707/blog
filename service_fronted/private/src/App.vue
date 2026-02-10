<script setup>
import { ref, computed } from 'vue'
import Breadcrumb from './components/common/Breadcrumb.vue'
import LayoutHeader from './components/layout/LayoutHeader.vue'
import LayoutMain from './components/layout/LayoutMain.vue'
import FlowPage from './components/flow/FlowPage.vue'
import MeituGallery from './components/gallery/MeituGallery.vue'
import ErciyuanGallery from './components/gallery/ErciyuanGallery.vue'
import PixivDaily from './components/pixiv/PixivDaily.vue'
import VideoSection from './components/video/VideoSection.vue'
import WaifuSection from './components/waifu/WaifuSection.vue'

const tabs = [
  { id: 'flow', label: '首页', icon: 'fa-home' },
  { id: 'meitu', label: '美图', icon: 'fa-image' },
  { id: 'erciyuan', label: '二次元', icon: 'fa-star' },
  { id: 'pixiv', label: 'Pixiv', icon: 'fa-palette' },
  { id: 'video', label: '视频', icon: 'fa-play' },
  { id: 'waifu', label: '老婆', icon: 'fa-heart' },
]

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

// 轮播占位：目前仅一条，无图片
const bannerSlides = [
  { id: 'ad1', title: '广告位招租', subtitle: '欢迎合作', description: '广告位招租，欢迎合作。', text: '广告位招租，欢迎合作。' },
]

const activeTab = ref('flow')
const waifuView = ref('list')
const currentWaifu = ref(null)
const currentVideo = ref(videoList[0] ?? null)

const waifuList = ref([
  { id: '1', name: '示例老婆', art: 'https://picsum.photos/400/600?random=waifu1', source: '示例作品', note: '占位数据，后续可增删改' },
])

const topicTabs = computed(() => tabs.filter(x => x.id !== 'flow'))

const latestEntries = computed(() => [
  ...waifuList.value.map(w => ({ label: w.name, to: 'waifu' })),
  { label: '美图一览', to: 'meitu' },
  { label: '二次元图库', to: 'erciyuan' },
  { label: 'Pixiv 每日一图', to: 'pixiv' },
  { label: '视频', to: 'video' },
])

const breadcrumbItems = computed(() => {
  const base = [{ label: '私站', to: '' }]
  if (activeTab.value !== 'waifu') {
    const t = tabs.find(x => x.id === activeTab.value)
    return [...base, { label: t?.label ?? '首页', to: t?.id === 'flow' ? null : t?.id }]
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
  if (to === '') setTab('flow')
  else if (to === 'waifu') setTab('waifu')
  else if (to) setTab(to)
}

function onFlowNavigate(to) {
  setTab(to)
}
</script>

<template>
  <!-- 全页动态背景：渐变 + 缓慢移动的模糊光晕 -->
  <div class="private-bg-layer" aria-hidden="true">
    <div class="private-bg-base"></div>
    <div class="private-bg-orb private-bg-orb-1"></div>
    <div class="private-bg-orb private-bg-orb-2"></div>
    <div class="private-bg-orb private-bg-orb-3"></div>
    <div class="private-bg-orb private-bg-orb-4"></div>
  </div>

  <LayoutHeader :active-tab="activeTab" @change-tab="setTab" />

  <LayoutMain>
    <Breadcrumb
      v-if="breadcrumbItems.length"
      :items="breadcrumbItems"
      :sep-image="breadcrumbSep"
      @navigate="onBreadcrumbNavigate"
    />

    <section class="private-section flow-page" :class="{ active: activeTab === 'flow' }">
      <FlowPage
        :banner-slides="bannerSlides"
        :topic-tabs="topicTabs"
        :waifu-count="waifuList.length"
        :image-count="meituList.length + erciyuanList.length"
        :latest-entries="latestEntries"
        @change-tab="setTab"
        @navigate="onFlowNavigate"
        @add-waifu="setTab('waifu')"
        @random="setTab('flow')"
        @banner-cta="setTab('waifu')"
      />
    </section>

    <section class="private-section" :class="{ active: activeTab === 'meitu' }">
      <MeituGallery :items="meituList" />
    </section>

    <section class="private-section" :class="{ active: activeTab === 'erciyuan' }">
      <ErciyuanGallery :items="erciyuanList" />
    </section>

    <section class="private-section" :class="{ active: activeTab === 'pixiv' }">
      <PixivDaily :daily="pixivDaily" />
    </section>

    <section class="private-section" :class="{ active: activeTab === 'video' }">
      <VideoSection
        :list="videoList"
        :current="currentVideo"
        @select="currentVideo = $event"
      />
    </section>

    <section class="private-section" :class="{ active: activeTab === 'waifu' }">
      <WaifuSection
        :view="waifuView"
        :list="waifuList"
        :current="currentWaifu"
        @select="currentWaifu = $event"
        @set-view="waifuView = $event"
      />
    </section>
  </LayoutMain>

  <div class="private-footer"></div>
</template>
