<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

/**
 * 基于 APlayer + MetingJS 的第三方音乐播放器，支持 QQ 音乐歌单。
 * 歌单 ID：QQ 音乐 → 歌单 → 分享 → 链接里 id= 后的数字。
 * 可选：配置 api 为自建 Meting API 地址以提升可用性。
 */
const props = defineProps({
  /** QQ 音乐歌单 ID（分享链接中的 id 参数） */
  playlistId: { type: String, default: '' },
  /** 迷你模式（紧凑样式），歌单默认展开可点击切歌 */
  mini: { type: Boolean, default: true },
  /** 是否固定样式（已由布局固定在左下角） */
  fixed: { type: Boolean, default: false },
  /** 自建 Meting API 地址，不填则用默认 */
  api: { type: String, default: '' },
})

const container = ref(null)
let metingEl = null
const scriptsLoaded = ref(false)

const CDN = {
  aplayerCss: 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css',
  aplayerJs: 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js',
  metingJs: 'https://cdn.jsdelivr.net/npm/meting@2.0.1/dist/Meting.min.js',
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function loadCss(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    document.head.appendChild(link)
  })
}

function renderMeting() {
  if (!container.value || !props.playlistId || !scriptsLoaded.value) return
  if (metingEl) {
    metingEl.remove()
    metingEl = null
  }
  metingEl = document.createElement('meting-js')
  metingEl.setAttribute('server', 'tencent')
  metingEl.setAttribute('type', 'playlist')
  metingEl.setAttribute('id', props.playlistId)
  metingEl.setAttribute('mini', props.mini ? 'true' : 'false')
  metingEl.setAttribute('fixed', props.fixed ? 'true' : 'false')
  metingEl.setAttribute('list-folded', 'false')
  metingEl.setAttribute('autoplay', 'false')
  if (props.api) metingEl.setAttribute('api', props.api)
  container.value.appendChild(metingEl)
}

async function init() {
  if (scriptsLoaded.value) {
    renderMeting()
    return
  }
  try {
    await loadCss(CDN.aplayerCss)
    await loadScript(CDN.aplayerJs)
    await loadScript(CDN.metingJs)
    scriptsLoaded.value = true
    renderMeting()
  } catch (e) {
    console.warn('[SideMusicPlayer] Load APlayer/Meting failed:', e)
  }
}

watch(() => props.playlistId, () => renderMeting())

onMounted(() => {
  if (props.playlistId) init()
})

onUnmounted(() => {
  if (metingEl && container.value) {
    metingEl.remove()
    metingEl = null
  }
})
</script>

<template>
  <div class="side-music-player">
    <div v-if="!playlistId" class="side-music-placeholder">
      <span>请配置 QQ 音乐歌单 ID</span>
      <small>歌单 → 分享 → 链接中 id= 后的数字</small>
    </div>
    <div v-else ref="container" class="side-music-container"></div>
  </div>
</template>

<style scoped>
.side-music-player {
  width: 100%;
  min-height: 160px;
}

.side-music-placeholder {
  padding: 12px 8px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--private-muted, #666);
  background: rgba(0, 0, 0, 0.03);
  border-radius: var(--private-radius, 8px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.side-music-placeholder small {
  font-size: 0.7rem;
  opacity: 0.8;
}

.side-music-container {
  width: 100%;
}

.side-music-container :deep(.aplayer) {
  margin: 0;
  border-radius: var(--private-radius, 8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.side-music-container :deep(.aplayer-list) {
  max-height: 320px;
  overflow-y: auto;
}
.side-music-container :deep(.aplayer-list ol) {
  padding-left: 0;
}
.side-music-container :deep(.aplayer-list li) {
  cursor: pointer;
  border-radius: 4px;
}
.side-music-container :deep(.aplayer-list li:hover) {
  background: rgba(0, 0, 0, 0.06);
}
</style>
