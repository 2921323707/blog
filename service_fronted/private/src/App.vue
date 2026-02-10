<script setup>
import { ref, computed } from 'vue'
import Breadcrumb from './components/common/Breadcrumb.vue'
import LayoutHeader from './components/layout/LayoutHeader.vue'
import LayoutMain from './components/layout/LayoutMain.vue'
import FlowPage from './components/flow/FlowPage.vue'
import MeituGallery from './components/gallery/MeituGallery.vue'
import ErciyuanGallery from './components/gallery/ErciyuanGallery.vue'
import SubscriptionCenter from './components/subscription/SubscriptionCenter.vue'
import VideoSection from './components/video/VideoSection.vue'
import WaifuSection from './components/waifu/WaifuSection.vue'

const tabs = [
  { id: 'flow', label: '首页', icon: 'fa-home' },
  { id: 'meitu', label: '旅行', icon: 'fa-plane-departure' },
  { id: 'erciyuan', label: '二次元', icon: 'fa-star' },
  // 原 Pixiv tab，改名为“订阅”
  { id: 'pixiv', label: '订阅', icon: 'fa-palette' },
  { id: 'video', label: '别点我', icon: 'fa-play' },
  { id: 'waifu', label: '老婆', icon: 'fa-heart' },
]

const breadcrumbSep = import.meta.env.BASE_URL + 'breadcrumb/arrow.svg'

const placeholderImages = (count, seed) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${seed}-${i}`,
    thumb: `https://picsum.photos/400/400?random=${seed}${i}`,
    title: `二次元 ${i + 1}`,
  }))

const meituList = [
  {
    id: 'travel-tokyo',
    thumb: 'https://picsum.photos/seed/tokyo-night/400/400',
    title: '东京夜景',
    location: '日本 · 东京',
    lat: 35.681236,
    lng: 139.767125,
    description: '在高楼林立之间俯瞰车流与霓虹，城市从不真正入睡。',
  },
  {
    id: 'travel-kyoto',
    thumb: 'https://picsum.photos/seed/kyoto-temple/400/400',
    title: '京都清晨',
    location: '日本 · 京都',
    lat: 35.011564,
    lng: 135.768149,
    description: '寺院石阶上落满晨露，安静得只剩下风吹松针的声音。',
  },
  {
    id: 'travel-paris',
    thumb: 'https://picsum.photos/seed/paris-eiffel/400/400',
    title: '塞纳河畔黄昏',
    location: '法国 · 巴黎',
    lat: 48.85837,
    lng: 2.294481,
    description: '夕阳把铁塔染成金色，河面是流动的光。',
  },
  {
    id: 'travel-london',
    thumb: 'https://picsum.photos/seed/london-bridge/400/400',
    title: '伦敦雨后街道',
    location: '英国 · 伦敦',
    lat: 51.507351,
    lng: -0.127758,
    description: '雨水洗净了玻璃橱窗，倒映出行色匆匆的路人。',
  },
  {
    id: 'travel-iceland',
    thumb: 'https://picsum.photos/seed/iceland-lake/400/400',
    title: '冰岛蓝湖',
    location: '冰岛 · 雷克雅未克',
    lat: 64.128288,
    lng: -21.827774,
    description: '白色蒸汽缓缓上升，仿佛走进一幅温暖的极地油画。',
  },
  {
    id: 'travel-guilin',
    thumb: 'https://picsum.photos/seed/guilin-mountain/400/400',
    title: '桂林山水',
    location: '中国 · 桂林',
    lat: 25.273566,
    lng: 110.290195,
    description: '山如碧玉簪，水似青罗带，小船划开一条宁静。',
  },
  {
    id: 'travel-lijiang',
    thumb: 'https://picsum.photos/seed/lijiang-oldtown/400/400',
    title: '丽江古城夜色',
    location: '中国 · 丽江',
    lat: 26.872108,
    lng: 100.238129,
    description: '石板路在灯笼下闪光，沿河人声鼎沸又不失惬意。',
  },
  {
    id: 'travel-xizang',
    thumb: 'https://picsum.photos/seed/tibet-mountain/400/400',
    title: '高原星空',
    location: '中国 · 西藏',
    lat: 29.652491,
    lng: 91.172108,
    description: '银河触手可及，每一次呼吸都格外清晰。',
  },
]

const erciyuanList = placeholderImages(8, 'erciyuan')

const pixivDaily = {
  image: 'https://picsum.photos/800/600?random=pixiv',
  title: '每日一图',
  author: '示例作者',
  link: '#',
}

// 别点我：各种奇奇怪怪小站的 .m3u8 资源
const videoList = [
  { id: 'm1', title: '神秘 m3u8 #1', thumb: 'https://picsum.photos/320/180?random=m1', src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { id: 'm2', title: '神秘 m3u8 #2', thumb: 'https://picsum.photos/320/180?random=m2', src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' },
  { id: 'm3', title: '神秘 m3u8 #3', thumb: 'https://picsum.photos/320/180?random=m3', src: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f7efa.m3u8' },
  { id: 'm4', title: '神秘 m3u8 #4', thumb: 'https://picsum.photos/320/180?random=m4', src: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8' },
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
  { label: '旅行相册', to: 'meitu' },
  { label: '二次元图库', to: 'erciyuan' },
  { label: '订阅中心（含 Pixiv 每日一图）', to: 'pixiv' },
  { label: '别点我', to: 'video' },
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
      <SubscriptionCenter :pixiv-daily="pixivDaily" />
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
