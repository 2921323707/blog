<script setup>
import { ref } from 'vue'
import FlowSidebarStats from './FlowSidebarStats.vue'
import FlowSidebarLatest from './FlowSidebarLatest.vue'

const BASE = import.meta.env.BASE_URL || '/'
const RIGHT_BANNER = BASE + 'side/right.png'
const rightLoaded = ref(true)
function onRightError() {
  rightLoaded.value = false
}

defineProps({
  waifuCount: { type: Number, default: 0 },
  imageCount: { type: Number, default: 0 },
  latestEntries: { type: Array, default: () => [] },
})
const emit = defineEmits(['navigate', 'add-waifu', 'random'])
</script>

<template>
  <aside class="flow-sidebar">
    <FlowSidebarStats
      :waifu-count="waifuCount"
      :image-count="imageCount"
      @add-waifu="emit('add-waifu')"
      @random="emit('random')"
    />
    <FlowSidebarLatest
      :entries="latestEntries"
      @navigate="emit('navigate', $event)"
    />
    <div class="flow-sidebar-figure">
      <img
        v-if="rightLoaded"
        :src="RIGHT_BANNER"
        alt=""
        loading="lazy"
        @error="onRightError"
      />
    </div>
  </aside>
</template>

<style scoped>
.flow-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (max-width: 899px) {
  .flow-sidebar {
    order: -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
@media (max-width: 500px) {
  .flow-sidebar {
    grid-template-columns: 1fr;
  }
}
.flow-sidebar-figure {
  background: var(--private-card);
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius);
  overflow: hidden;
  padding: 0;
}
.flow-sidebar-figure img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: contain;
  object-position: center;
}
</style>
