<script setup>
import FlowMain from './FlowMain.vue'
import FlowSidebar from './FlowSidebar.vue'

defineProps({
  bannerSlides: { type: Array, default: () => [] },
  topicTabs: { type: Array, default: () => [] },
  waifuCount: { type: Number, default: 0 },
  imageCount: { type: Number, default: 0 },
  latestEntries: { type: Array, default: () => [] },
})
const emit = defineEmits(['change-tab', 'navigate', 'add-waifu', 'random', 'banner-cta'])
</script>

<template>
  <div class="flow-layout">
    <FlowMain
      :banner-slides="bannerSlides"
      :topic-tabs="topicTabs"
      @change-tab="emit('change-tab', $event)"
      @banner-cta="emit('banner-cta')"
    />
    <FlowSidebar
      :waifu-count="waifuCount"
      :image-count="imageCount"
      :latest-entries="latestEntries"
      @navigate="emit('navigate', $event)"
      @add-waifu="emit('add-waifu')"
      @random="emit('random')"
    />
  </div>
</template>

<style scoped>
.flow-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius);
  padding: 20px;
  background: rgba(0, 0, 0, 0.02);
}
@media (min-width: 900px) {
  .flow-layout {
    grid-template-columns: 1fr 280px;
    align-items: start;
  }
}
</style>
