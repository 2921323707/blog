<script setup>
import FlowBanner from './FlowBanner.vue'
import FlowAnimeSection from './FlowAnimeSection.vue'
import FlowPromo from './FlowPromo.vue'
import FlowTopics from './FlowTopics.vue'
import FlowAbout from './FlowAbout.vue'

defineProps({
  bannerSlides: { type: Array, default: () => [] },
  topicTabs: { type: Array, default: () => [] },
})
const emit = defineEmits(['change-tab', 'banner-cta'])
</script>

<template>
  <div class="flow-main">
    <div class="flow-welcome">
      <p class="flow-welcome-text"><b>玉米加农炮</b></p>
    </div>
    <FlowBanner
      v-if="bannerSlides.length"
      :slides="bannerSlides"
      single-only
      @cta-click="emit('banner-cta')"
    />
    <FlowAnimeSection />
    <FlowPromo />
    <FlowTopics
      :tabs="topicTabs"
      @change-tab="emit('change-tab', $event)"
    />
    <FlowAbout />
  </div>
</template>

<style scoped>
.flow-main {
  min-width: 0;
}
.flow-welcome {
  margin-bottom: 20px;
}
.flow-welcome-text {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--private-text);
}
</style>
