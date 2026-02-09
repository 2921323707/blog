<script setup>
import { ref, computed, watch } from 'vue'

const DAYS = [
  { key: 'monday', label: '周一' },
  { key: 'tuesday', label: '周二' },
  { key: 'wednesday', label: '周三' },
  { key: 'thursday', label: '周四' },
  { key: 'friday', label: '周五' },
  { key: 'saturday', label: '周六' },
  { key: 'sunday', label: '周日' },
]

const JIKAN_SCHEDULES = 'https://api.jikan.moe/v4/schedules'

const activeDay = ref(
  DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key
)
const list = ref([])
const loading = ref(false)
const error = ref(null)
const scrollRef = ref(null)

const seasonLabel = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()
  const season = m < 3 ? '冬季' : m < 6 ? '春季' : m < 9 ? '夏季' : '秋季'
  return `日本${y}年${season}动画`
})

function normalizeItem(a) {
  return {
    id: a.mal_id,
    title: a.title_english || a.title || a.title_japanese || '',
    titleCn: a.title_japanese || a.title || '',
    image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '',
    url: a.url || '#',
  }
}

async function fetchDay(day) {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${JIKAN_SCHEDULES}?filter=${day}`)
    if (!res.ok) throw new Error(res.statusText)
    const json = await res.json()
    const raw = json.data || []
    const seen = new Set()
    list.value = raw
      .filter((a) => {
        if (seen.has(a.mal_id)) return false
        seen.add(a.mal_id)
        return true
      })
      .map(normalizeItem)
  } catch (e) {
    error.value = e.message
    list.value = []
  } finally {
    loading.value = false
  }
}

watch(activeDay, (day) => fetchDay(day), { immediate: true })

function scroll(direction) {
  const el = scrollRef.value
  if (!el) return
  const step = el.clientWidth * 0.8
  el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' })
}
</script>

<template>
  <section class="flow-anime-section">
    <div class="flow-anime-head">
      <div class="flow-anime-head-inner">
        <h2 class="flow-anime-title">
          <i class="fas fa-calendar-alt" aria-hidden="true"></i>
          日本周新番
        </h2>
        <a
          href="https://myanimelist.net/anime/season"
          target="_blank"
          rel="noopener noreferrer"
          class="flow-anime-season-link"
        >
          {{ seasonLabel }} <i class="fas fa-chevron-right"></i>
        </a>
      </div>
    </div>
    <div class="flow-anime-days">
      <button
        v-for="day in DAYS"
        :key="day.key"
        type="button"
        class="flow-anime-day"
        :class="{ active: activeDay === day.key }"
        @click="activeDay = day.key"
      >
        {{ day.label }}
      </button>
    </div>
    <div class="flow-anime-carousel-wrap">
      <button
        type="button"
        class="flow-anime-arrow flow-anime-arrow-left"
        aria-label="向左滑动"
        @click="scroll('left')"
      >
        <i class="fas fa-chevron-left"></i>
      </button>
      <button
        type="button"
        class="flow-anime-arrow flow-anime-arrow-right"
        aria-label="向右滑动"
        @click="scroll('right')"
      >
        <i class="fas fa-chevron-right"></i>
      </button>
      <div ref="scrollRef" class="flow-anime-list" tabindex="0">
        <template v-if="loading">
          <div class="flow-anime-loading">加载中…</div>
        </template>
        <template v-else-if="error">
          <div class="flow-anime-error">暂无数据，请稍后再试</div>
        </template>
        <template v-else-if="list.length">
          <a
            v-for="item in list"
            :key="item.id"
            class="flow-anime-card"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="flow-anime-card-image-wrap">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.title"
                class="flow-anime-card-image"
                loading="lazy"
              />
              <div v-else class="flow-anime-card-image flow-anime-card-placeholder">暂无图</div>
            </div>
            <p class="flow-anime-card-title">{{ item.titleCn || item.title }}</p>
          </a>
        </template>
        <template v-else>
          <div class="flow-anime-loading">该日暂无播出</div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.flow-anime-section {
  margin-bottom: 28px;
}
.flow-anime-head {
  margin-bottom: 10px;
}
.flow-anime-head-inner {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.flow-anime-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--private-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.flow-anime-title i {
  color: #26a65b;
}
.flow-anime-season-link {
  font-size: 0.875rem;
  color: #26a65b;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.flow-anime-season-link:hover {
  text-decoration: underline;
}
.flow-anime-days {
  display: flex;
  gap: 0 2px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--private-border);
  flex-wrap: wrap;
}
.flow-anime-day {
  padding: 8px 14px 10px;
  font-size: 0.9rem;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--private-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
}
.flow-anime-day:hover {
  color: var(--private-text);
}
.flow-anime-day.active {
  color: #26a65b;
  border-bottom-color: #26a65b;
  font-weight: 600;
}
.flow-anime-carousel-wrap {
  position: relative;
  margin: 0 -16px;
  padding: 0 40px;
}
.flow-anime-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(38, 166, 91, 0.9);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: background 0.15s, opacity 0.15s;
}
.flow-anime-arrow:hover {
  background: #1e8b4a;
}
.flow-anime-arrow-left {
  left: 8px;
}
.flow-anime-arrow-right {
  right: 8px;
}
.flow-anime-list {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  padding: 8px 0;
  outline: none;
}
.flow-anime-list::-webkit-scrollbar {
  height: 6px;
}
.flow-anime-list::-webkit-scrollbar-thumb {
  background: var(--private-border);
  border-radius: 3px;
}
.flow-anime-card {
  flex: 0 0 160px;
  scroll-snap-align: start;
  text-decoration: none;
  color: inherit;
  display: block;
}
.flow-anime-card-image-wrap {
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 12px;
  overflow: hidden;
  background: var(--private-border);
  margin-bottom: 8px;
}
.flow-anime-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.flow-anime-card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--private-muted);
  object-fit: none;
}
.flow-anime-card-title {
  margin: 0;
  font-size: 0.85rem;
  color: var(--private-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.flow-anime-card:hover .flow-anime-card-title {
  color: #26a65b;
}
.flow-anime-loading,
.flow-anime-error {
  padding: 32px 16px;
  text-align: center;
  color: var(--private-muted);
  font-size: 0.9rem;
  min-width: 100%;
}
</style>
