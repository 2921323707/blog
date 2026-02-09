<script setup>
import { ref } from 'vue'
import SideMusicPlayer from './SideMusicPlayer.vue'

const BASE = import.meta.env.BASE_URL || '/'
// 右侧：side/right.png，预留动作/语音等交互
const RIGHT_BANNER = BASE + 'side/right.png'
// QQ 音乐歌单 ID：可在 .env 中设置 VITE_QQ_PLAYLIST_ID，或在此直接写死
const qqPlaylistId = import.meta.env.VITE_QQ_PLAYLIST_ID || ''

const rightLoaded = ref(true)

function onRightError() {
  rightLoaded.value = false
}
</script>

<template>
  <div class="private-layout-wrap">
    <!-- 左侧：左下角 QQ 音乐歌单播放器，上方可后续加 Live2D -->
    <aside class="private-side-banner private-side-banner-left">
      <div class="private-side-left-inner">
        <div class="private-live2d-slot"><!-- Live2D 挂载点（可选） --></div>
        <SideMusicPlayer
          :playlist-id="qqPlaylistId"
          :mini="false"
          :fixed="false"
        />
      </div>
    </aside>
    <!-- 右侧：立绘大图、无背景，预留动作/语音交互 -->
    <aside class="private-side-banner private-side-banner-right">
      <div class="private-side-right-figure" role="img" aria-label="看板娘">
        <img
          v-if="rightLoaded"
          :src="RIGHT_BANNER"
          alt=""
          loading="lazy"
          @error="onRightError"
        />
        <div v-else class="private-side-right-fallback">图片加载失败</div>
      </div>
    </aside>
    <main class="private-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.private-layout-wrap {
  position: relative;
}
.private-main {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 左右侧栏：仅宽屏显示，固定、占满视口高度 */
.private-side-banner {
  display: none;
  position: fixed;
  top: var(--private-header-h);
  bottom: 0;
  z-index: 50;
  box-sizing: border-box;
  pointer-events: none;
}
.private-side-banner > * {
  pointer-events: auto;
}

.private-side-banner-left {
  left: 0;
  width: 200px;
  padding: 16px;
}
.private-side-banner-right {
  right: 0;
  width: 280px;
  padding: 16px 16px 24px;
}
@media (min-width: 1400px) {
  .private-side-banner {
    display: block;
  }
}
@media (min-width: 1600px) {
  .private-side-banner-left {
    width: 220px;
    left: 16px;
  }
  .private-side-banner-right {
    width: 320px;
    right: 16px;
    padding: 20px 20px 32px;
  }
}

/* 左侧置空，左下角 Live2D 挂载点 */
.private-side-left-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.private-live2d-slot {
  min-height: 0;
  flex: 1;
  /* 预留：Live2D 画布可挂载在此，目前仅下方音乐播放器 */
}

/* 右侧：立绘大图、无背景，固定居中，预留动作/语音交互 */
.private-side-right-figure {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.private-side-right-figure img {
  width: 100%;
  height: 100%;
  min-height: 400px;
  max-height: calc(100vh - var(--private-header-h) - 48px);
  object-fit: contain;
  object-position: 60% 95%;
  display: block;
  transform: translate(16px, 24px);
}
.private-side-right-fallback {
  font-size: 0.85rem;
  color: var(--private-muted, #888);
  padding: 1rem;
}
</style>
