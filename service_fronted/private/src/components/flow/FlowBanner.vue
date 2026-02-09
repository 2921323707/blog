<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const BASE = import.meta.env.BASE_URL || '/'
const AD_BASE = BASE + 'ad/'
const MAX_AD = 5

// 本地广告图 ad_1.png ~ ad_5.png，动态检测可用数量（不超过 5 张）
const localAdUrls = ref([])
// 加载中：纹理背景 + 萝莉/萌系 GIF（可放 public/loading.gif 用 /private/loading.gif 替换）
const LOADING_GIF = 'https://media.tenor.com/JeVyRzBl-SAAAAAi/loading-waiting.gif'

function tryLoadAdImage(index) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(index)
    img.onerror = () => resolve(null)
    img.src = `${AD_BASE}ad_${index}.png`
  })
}

async function discoverLocalAds() {
  const indices = await Promise.all(
    Array.from({ length: MAX_AD }, (_, i) => tryLoadAdImage(i + 1))
  )
  localAdUrls.value = indices.filter((i) => i != null).map((i) => `${AD_BASE}ad_${i}.png`)
}

// 封面图：优先 slide.imageUrl，否则用本地 ad 列表中的对应项
function getCoverImageUrl(slide, index = 0) {
  if (slide?.imageUrl) return slide.imageUrl
  const list = localAdUrls.value
  return list[index] ?? list[0] ?? ''
}

function getExternalImageUrl(slide, index) {
  if (slide?.imageUrl) return slide.imageUrl
  const list = localAdUrls.value
  return list[index] ?? list[0] ?? ''
}

const props = defineProps({
  /** slides: { id, title, subtitle?, description?, imageUrl? }，imageUrl 为空时使用外部占位图 */
  slides: {
    type: Array,
    default: () => [],
  },
  interval: { type: Number, default: 5000 },
  /** 为 true 时只展示第一条，只渲染一个 DOM 节点（占位模式） */
  singleOnly: { type: Boolean, default: false },
})
const emit = defineEmits(['cta-click'])

const templateSlide = computed(() => props.slides[0] ?? { id: 'ad', title: '', subtitle: '' })

// 本地 ad 图生成 slides：每张图一条，共用同一标题/副标题
const localAdSlides = computed(() => {
  const urls = localAdUrls.value
  if (urls.length === 0) return []
  const t = templateSlide.value
  return urls.map((imageUrl, i) => ({
    id: t?.id ? `${t.id}-${i + 1}` : `ad-${i + 1}`,
    title: t?.title ?? '',
    subtitle: t?.subtitle ?? '',
    description: t?.description ?? '',
    text: t?.text ?? '',
    imageUrl,
  }))
})

// 有本地 ad 且多张时：始终轮播多张；仅一张或无本地 ad 时再按 singleOnly/条数决定
const effectiveSlides = computed(() => {
  const local = localAdSlides.value
  if (local.length > 1) return local
  if (local.length === 1) return [local[0]]
  if (props.singleOnly || props.slides.length <= 1) {
    return props.slides.length >= 1 ? [props.slides[0]] : []
  }
  return props.slides
})

const activeIndex = ref(0)
let timer = null


function startTimer() {
  timer = setInterval(() => {
    if (effectiveSlides.value.length <= 1) return
    activeIndex.value = (activeIndex.value + 1) % effectiveSlides.value.length
  }, props.interval)
}
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
function setIndex(i) {
  activeIndex.value = i
  stopTimer()
  startTimer()
}

watch(() => effectiveSlides.value.length, () => {
  if (activeIndex.value >= effectiveSlides.value.length) activeIndex.value = 0
})
onMounted(() => {
  startTimer()
  discoverLocalAds()
})
onUnmounted(stopTimer)
</script>

<template>
  <div class="flow-carousel-wrap">
    <div class="flow-carousel">
      <!-- 仅一条时：横屏图铺满、加高；加载中为纹理+萝莉GIF，不占位老图 -->
      <template v-if="effectiveSlides.length === 1">
        <div class="flow-banner flow-banner-single flow-banner-cover">
          <div class="flow-banner-bg">
            <template v-if="getCoverImageUrl(effectiveSlides[0])">
              <img :src="getCoverImageUrl(effectiveSlides[0])" alt="" loading="lazy" />
            </template>
            <div v-else class="flow-banner-loading">
              <img :src="LOADING_GIF" alt="" class="flow-banner-loading-gif" />
            </div>
          </div>
        </div>
      </template>
      <!-- 多张图：封面轮播，仅当前项可见，左下角白色圆点/胶囊指示器 -->
      <template v-else-if="effectiveSlides.length > 1">
        <div class="flow-banner flow-banner-single flow-banner-cover flow-banner-cover-carousel">
          <div
            v-for="(slide, index) in effectiveSlides"
            :key="slide.id"
            class="flow-banner-bg flow-banner-bg-slide"
            :class="{ active: index === activeIndex }"
          >
            <template v-if="getCoverImageUrl(slide, index)">
              <img :src="getCoverImageUrl(slide, index)" alt="" loading="lazy" />
            </template>
            <div v-else class="flow-banner-loading">
              <img :src="LOADING_GIF" alt="" class="flow-banner-loading-gif" />
            </div>
          </div>
          <div class="flow-banner-dots flow-banner-dots-cover">
            <button
              v-for="(slide, index) in effectiveSlides"
              :key="slide.id + '-dot'"
              type="button"
              class="flow-banner-dot"
              :class="{ active: index === activeIndex }"
              @click="setIndex(index)"
              aria-label="切换 Banner"
            ></button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.flow-carousel-wrap {
  margin: 0 -16px 20px;
  padding: 0 16px;
}
.flow-carousel {
  position: relative;
}
.flow-banner {
  display: none;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: 18px;
  background: radial-gradient(circle at 0 0, #ffe9f5 0, #fff 35%) padding-box,
    linear-gradient(120deg, #7fd4ff 0, #9df0c9 40%, #ffd682 80%) border-box;
  border: 1px solid transparent;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}
.flow-banner.active,
.flow-banner-single {
  display: flex;
}

/* 单条：横屏图铺满、盒子加高；加载中纹理+萝莉GIF */
.flow-banner-cover {
  position: relative;
  min-height: 280px;
  padding: 0;
  overflow: hidden;
  background: #1a1a2e;
}
.flow-banner-cover .flow-banner-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.flow-banner-cover .flow-banner-bg > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.flow-banner-cover .flow-banner-loading {
  width: 100%;
  height: 100%;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    repeating-linear-gradient(
      105deg,
      transparent,
      transparent 2px,
      rgba(255, 182, 193, 0.12) 2px,
      rgba(255, 182, 193, 0.12) 4px
    ),
    repeating-linear-gradient(
      -15deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.6) 3px,
      rgba(255, 255, 255, 0.6) 6px
    ),
    radial-gradient(ellipse 80% 60% at 70% 30%, rgba(255, 192, 203, 0.4) 0%, transparent 55%),
    radial-gradient(ellipse 60% 80% at 20% 70%, rgba(255, 218, 224, 0.5) 0%, transparent 50%),
    linear-gradient(165deg, #fff 0%, #fff5f8 35%, #ffe9f2 70%, #ffdde8 100%);
}
.flow-banner-cover .flow-banner-loading-gif {
  width: 120px;
  height: auto;
  object-fit: contain;
  opacity: 0.9;
}

/* 多图封面轮播：多层叠放，仅当前激活可见 */
.flow-banner-cover-carousel {
  display: flex;
}
.flow-banner-cover-carousel .flow-banner-bg-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}
.flow-banner-cover-carousel .flow-banner-bg-slide.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}
.flow-banner-dots-cover {
  left: 24px;
  right: auto;
  bottom: 14px;
  z-index: 2;
  gap: 8px;
}
.flow-banner-dots-cover .flow-banner-dot {
  width: 8px;
  height: 8px;
  background: rgba(38, 194, 129, 0.6);
}
.flow-banner-dots-cover .flow-banner-dot.active {
  width: 24px;
  border-radius: 999px;
  background: #26c281;
}

.flow-banner-left {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.flow-banner-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  margin-bottom: 10px;
  font-size: 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #26a65b;
  border: 1px solid rgba(38, 166, 91, 0.15);
}
.flow-banner-title {
  margin: 0 0 6px;
  font-size: 1.6rem;
  font-weight: 700;
  color: #13a05f;
}
.flow-banner-subtitle {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: var(--private-text);
}
.flow-banner-desc {
  margin: 0 0 18px;
  font-size: 0.85rem;
  color: var(--private-muted);
  line-height: 1.6;
}
.flow-banner-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  font-size: 0.9rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: #26c281;
  color: #fff;
  box-shadow: 0 6px 14px rgba(19, 160, 95, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.flow-banner-cta:hover {
  background: #18b572;
  box-shadow: 0 9px 18px rgba(19, 160, 95, 0.45);
  transform: translateY(-1px);
}
.flow-banner-cta:active {
  transform: translateY(0);
  box-shadow: 0 4px 10px rgba(19, 160, 95, 0.35);
}
.flow-banner-right {
  flex: 0 0 260px;
  max-width: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.flow-banner-image {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(0, 0, 0, 0.08), transparent 50%),
    linear-gradient(135deg, #e8f4fd 0%, #f0e8f8 50%, #fef0e8 100%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--private-muted);
  font-size: 0.85rem;
  overflow: hidden;
}
.flow-banner-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
}
.flow-banner-image:not(:has(img))::before {
  content: '暂无图片';
}
.flow-banner-dots {
  position: absolute;
  right: 24px;
  bottom: 14px;
  display: flex;
  gap: 6px;
}
.flow-banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.6);
  transition: width 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}
.flow-banner-dot.active {
  width: 16px;
  background: #26c281;
}
@media (max-width: 960px) {
  .flow-banner {
    padding: 18px 16px;
    gap: 16px;
  }
  .flow-banner-right {
    flex-basis: 200px;
    max-width: 200px;
  }
}
@media (max-width: 720px) {
  .flow-carousel-wrap {
    margin-inline: -12px;
    padding-inline: 12px;
  }
  .flow-banner {
    flex-direction: column;
  }
  .flow-banner-right {
    flex-basis: auto;
    max-width: none;
    width: 100%;
  }
  .flow-banner-cover {
    min-height: 240px;
  }
  .flow-banner-cover .flow-banner-loading {
    min-height: 240px;
  }
}
</style>
