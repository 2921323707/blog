<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** daily: { image, title, author?, link? } 作为占位与兜底 */
const props = defineProps({
  daily: {
    type: Object,
    default: () => ({}),
  },
})

const loading = ref(true)
const error = ref('')
const slides = ref([]) // [{ image, title, author, link }]
const currentIndex = ref(0)
let timerId

const current = computed(() => {
  if (slides.value.length === 0) return props.daily || {}
  return slides.value[currentIndex.value] || slides.value[0] || props.daily || {}
})

const hasSlides = computed(() => slides.value.length > 0)

// mokeyjay 公开 API 直连地址（无需后端、国内可访问、支持 CORS）
const MOKEYJAY_PIXIV_JSON = 'https://pixiv.mokeyjay.com/?r=api/pixiv-json'

function normalizePixivData(raw) {
  // 兼容：后端 { image_url, title, user_name, page_url } 与 mokeyjay { url, title, user_name, id }
  const image = raw.image_url || raw.url || raw.image
  const pageUrl = raw.page_url || (raw.id ? `https://www.pixiv.net/artworks/${raw.id}` : '')
  return {
    image: image || props.daily?.image,
    title: raw.title || props.daily?.title || 'Pixiv 插画',
    author: raw.user_name || raw.author || '',
    link: pageUrl || raw.link || '',
  }
}

function parseRankingResponse(data) {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.illusts)
    ? data.illusts
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.results)
    ? data.results
    : []
  return list.slice(0, 5).map(normalizePixivData).filter(x => x.image)
}

async function fetchPixivRanking() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(MOKEYJAY_PIXIV_JSON)
    if (!res.ok) throw new Error('mokeyjay API 请求失败')
    const data = await res.json()
    const top5 = parseRankingResponse(data)
    if (!top5.length) throw new Error('接口返回为空')
    slides.value = top5
    currentIndex.value = 0
    startAutoplay()
  } catch (e) {
    console.error(e)
    error.value = e?.message || 'Pixiv 数据加载失败'
  } finally {
    loading.value = false
  }
}

function startAutoplay() {
  stopAutoplay()
  if (slides.value.length <= 1) return
  timerId = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % slides.value.length
  }, 5000)
}

function stopAutoplay() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function goTo(index) {
  if (!hasSlides.value) return
  currentIndex.value = index
  startAutoplay()
}

onMounted(() => {
  fetchPixivRanking()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<template>
  <div>
    <h2 class="section-title"><i class="fas fa-palette"></i> Pixiv 每日一图</h2>
    <div class="pixiv-daily">
      <div class="daily-image-wrap">
        <img
          v-if="current.image"
          :src="current.image"
          :alt="current.title"
          loading="lazy"
        />
        <div v-else class="daily-empty">暂无图片</div>

        <div v-if="hasSlides" class="daily-indicators">
          <button
            v-for="(item, i) in slides"
            :key="i"
            type="button"
            class="indicator-dot"
            :class="{ active: i === currentIndex }"
            @click="goTo(i)"
          ></button>
        </div>
      </div>
      <div class="daily-meta">
        <span>{{ current.title }}</span>
        <span v-if="current.author"> · {{ current.author }}</span>
        <a
          v-if="current.link"
          :href="current.link"
          target="_blank"
          rel="noopener"
        >查看原图</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--private-text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title i {
  color: var(--private-accent);
}
.pixiv-daily {
  background: var(--private-card);
  border-radius: var(--private-radius);
  overflow: hidden;
  border: 1px solid var(--private-border);
  margin-bottom: 20px;
}
.pixiv-daily .daily-image-wrap {
  position: relative;
  width: 100%;
  max-height: 70vh;
  background: var(--private-surface);
}
.pixiv-daily .daily-image-wrap img {
  width: 100%;
  height: auto;
  max-height: 70vh;
  object-fit: contain;
  display: block;
}
.pixiv-daily .daily-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--private-muted);
  font-size: 0.9rem;
}
.daily-indicators {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  transition: background 0.2s, width 0.2s;
}
.indicator-dot.active {
  width: 18px;
  background: var(--private-accent);
}
.pixiv-daily .daily-meta {
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--private-muted);
}
.pixiv-daily .daily-meta a {
  color: var(--private-accent);
  text-decoration: none;
}
.pixiv-daily .daily-meta a:hover {
  text-decoration: underline;
}
</style>
