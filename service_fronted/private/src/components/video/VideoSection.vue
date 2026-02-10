<script setup>
import { ref, nextTick, watch, onBeforeUnmount } from 'vue'
import Hls from 'hls.js'

const props = defineProps({
  list: { type: Array, default: () => [] },
  current: { type: Object, default: null },
})
const emit = defineEmits(['select'])

const videoPlayer = ref(null)
let hlsInstance = null

/** 是否为 HLS/m3u8 地址（含第三方资源站常见 m3u8 链接） */
function isHlsSource(src) {
  if (!src || typeof src !== 'string') return false
  return /\.m3u8(\?|$)/i.test(src) || src.includes('m3u8')
}

/** 使用原生 src（MP4 等）或 Safari 下原生 HLS */
function setNativeSource(el, src) {
  if (!el) return
  el.src = src || ''
  el.load()
  el.play().catch(() => {})
}

/** 使用 Hls.js 播放 m3u8 */
function setHlsSource(el, src) {
  if (!el || !src) return
  destroyHls()
  el.src = ''
  // Safari 等原生支持 HLS 的浏览器直接用 src
  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    setNativeSource(el, src)
    return
  }
  if (!Hls.isSupported()) {
    setNativeSource(el, src)
    return
  }
  hlsInstance = new Hls({
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
  })
  hlsInstance.attachMedia(el)
  hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
    el.play().catch(() => {})
  })
  hlsInstance.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) {
      destroyHls()
    }
  })
  hlsInstance.loadSource(src)
}

function destroyHls() {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
}

watch(() => props.current, (cur) => {
  nextTick(() => {
    const el = videoPlayer.value
    if (!el || !cur?.src) return
    if (isHlsSource(cur.src)) {
      setHlsSource(el, cur.src)
    } else {
      destroyHls()
      setNativeSource(el, cur.src)
    }
  })
}, { immediate: true })

onBeforeUnmount(destroyHls)

function play(item) {
  emit('select', item)
}
</script>

<template>
  <div>
    <h2 class="section-title"><i class="fas fa-play"></i> 别点我</h2>
    <div class="video-section">
      <div class="video-player-wrap" v-if="current">
        <video
          ref="videoPlayer"
          controls
          playsinline
          :poster="current.thumb"
        />
      </div>
      <div class="video-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="video-item"
          :class="{ playing: current && current.id === item.id }"
          @click="play(item)"
        >
          <div class="thumb-wrap">
            <img :src="item.thumb" :alt="item.title" />
            <div class="play-overlay"><i class="fas fa-play"></i></div>
          </div>
          <div class="title">{{ item.title }}</div>
        </div>
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
.video-section {
  margin-bottom: 24px;
}
.video-player-wrap {
  background: #000;
  border-radius: var(--private-radius);
  overflow: hidden;
  aspect-ratio: 16/9;
  max-width: 100%;
  margin: 0 auto 12px;
}
.video-player-wrap video {
  width: 100%;
  height: 100%;
  display: block;
}
.video-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 600px) {
  .video-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
.video-item {
  background: var(--private-card);
  border-radius: var(--private-radius);
  overflow: hidden;
  border: 1px solid var(--private-border);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.video-item:hover,
.video-item.playing {
  border-color: var(--private-accent);
  background: var(--private-accent-soft);
}
.video-item .thumb-wrap {
  aspect-ratio: 16/9;
  position: relative;
  background: var(--private-surface);
}
.video-item .thumb-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-item .play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 2rem;
}
.video-item .title {
  padding: 10px 12px;
  font-size: 0.875rem;
  color: var(--private-text);
}
</style>
