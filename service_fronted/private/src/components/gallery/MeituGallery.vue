<script setup>
import { computed, ref } from 'vue'

/** items: { id, thumb, title, location?, lat?, lng?, description? }[] */
const props = defineProps({
  items: { type: Array, default: () => [] },
})

const userLocation = ref(null)
const geolocationSupported = typeof window !== 'undefined' && 'geolocation' in navigator
const geolocationStatus = ref<'idle' | 'requesting' | 'ok' | 'error'>('idle')
const geolocationError = ref('')

function requestLocation() {
  if (!geolocationSupported || geolocationStatus.value === 'requesting') return
  geolocationStatus.value = 'requesting'
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }
      geolocationStatus.value = 'ok'
      geolocationError.value = ''
    },
    err => {
      geolocationStatus.value = 'error'
      geolocationError.value = err?.message || '获取地理位置失败'
    },
  )
}

function toRad(v) {
  return (v * Math.PI) / 180
}

function computeDistanceKm(a, b) {
  if (!a || !b) return null
  const R = 6371 // km
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

const displayItems = computed(() =>
  props.items.map(item => {
    if (!userLocation.value || !item.lat || !item.lng) {
      return { ...item, distanceKm: null }
    }
    const d = computeDistanceKm(userLocation.value, { lat: item.lat, lng: item.lng })
    return {
      ...item,
      distanceKm: d != null ? Math.round(d * 10) / 10 : null,
    }
  }),
)
</script>

<template>
  <div>
    <div class="section-header">
      <h2 class="section-title">
        <i class="fas fa-plane-departure"></i>
        旅行相册
      </h2>
      <div v-if="geolocationSupported" class="geo-actions">
        <button
          type="button"
          class="geo-btn"
          :disabled="geolocationStatus === 'requesting'"
          @click="requestLocation"
        >
          <i class="fas fa-location-crosshairs"></i>
          <span v-if="geolocationStatus === 'idle'">获取当前位置</span>
          <span v-else-if="geolocationStatus === 'requesting'">定位中...</span>
          <span v-else-if="geolocationStatus === 'ok'">已基于你的位置</span>
          <span v-else>重新尝试</span>
        </button>
        <span v-if="geolocationStatus === 'error'" class="geo-error">
          {{ geolocationError }}
        </span>
      </div>
    </div>

    <p class="section-subtitle">
      记录每一次脚步
    </p>

    <div class="gallery-grid">
      <article
        v-for="item in displayItems"
        :key="item.id"
        class="gallery-card"
      >
        <a
          class="gallery-thumb-link"
          :href="item.thumb"
          target="_blank"
          rel="noopener"
        >
          <img
            class="thumb"
            :src="item.thumb"
            :alt="item.title || item.location || '旅行照片'"
            loading="lazy"
          />
        </a>
        <div class="info">
          <div class="info-main">
            <strong>{{ item.title || '未命名旅程' }}</strong>
            <span v-if="item.location" class="location">
              <i class="fas fa-location-dot"></i>
              {{ item.location }}
            </span>
          </div>
          <p v-if="item.description" class="description">
            {{ item.description }}
          </p>
          <div class="info-meta">
            <span
              v-if="item.distanceKm != null"
              class="distance"
            >
              距你约 {{ item.distanceKm }} km
            </span>
          </div>
          <div class="info-actions">
            <a
              v-if="item.lat && item.lng"
              class="action-link"
              :href="`https://www.google.com/maps?q=${item.lat},${item.lng}`"
              target="_blank"
              rel="noopener"
            >
              <i class="fas fa-map-location-dot"></i>
              在地图中查看
            </a>
            <a
              v-if="item.location"
              class="action-link"
              :href="`https://www.google.com/maps/search/${encodeURIComponent(item.location)}`"
              target="_blank"
              rel="noopener"
            >
              <i class="fas fa-compass"></i>
              附近探索
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--private-text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title i {
  color: var(--private-accent);
}
.section-subtitle {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: var(--private-muted);
}
.geo-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.geo-btn {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--private-border);
  background: var(--private-surface);
  font-size: 0.75rem;
  color: var(--private-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.geo-btn i {
  color: var(--private-accent);
}
.geo-btn:hover:not(:disabled) {
  border-color: var(--private-accent);
  background: var(--private-accent-soft);
}
.geo-btn:disabled {
  opacity: 0.7;
  cursor: default;
}
.geo-error {
  font-size: 0.75rem;
  color: #ef4444;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}
@media (min-width: 900px) {
  .gallery-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.gallery-card {
  background: var(--private-card);
  border-radius: var(--private-radius);
  overflow: hidden;
  border: 1px solid var(--private-border);
  transition: transform 0.2s, box-shadow 0.2s;
}
.gallery-thumb-link {
  display: block;
}
.gallery-card:active {
  transform: scale(0.98);
}
@media (hover: hover) {
  .gallery-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
}
.gallery-card .thumb {
  aspect-ratio: 1;
  width: 100%;
  object-fit: cover;
  display: block;
  background: var(--private-surface);
}
.gallery-card .info {
  padding: 10px 12px 12px;
  font-size: 0.8rem;
  color: var(--private-muted);
  line-height: 1.4;
}
.gallery-card .info strong {
  color: var(--private-text);
  display: inline-block;
  margin-bottom: 2px;
}
.info-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}
.location {
  font-size: 0.78rem;
  color: var(--private-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.location i {
  color: var(--private-accent);
  font-size: 0.75rem;
}
.description {
  margin: 0 0 6px;
}
.info-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.distance {
  font-size: 0.75rem;
  color: var(--private-muted);
}
.info-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.action-link {
  font-size: 0.75rem;
  color: var(--private-accent);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.action-link i {
  font-size: 0.75rem;
}
.action-link:hover {
  text-decoration: underline;
}
</style>
