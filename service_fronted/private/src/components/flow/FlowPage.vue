<script setup>
import FlowLayout from './FlowLayout.vue'
import FlowFooter from './FlowFooter.vue'

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
  <div class="flow-top-promo">
    <a href="#" class="flow-top-promo-inner">
      <img
        src="https://storage.moegirl.org.cn/console-plus/uploads/2026/01/21/3748df47120c59d5547597b3d4a12b22.jpeg"
        alt="推广"
        class="flow-top-promo-img"
      />
    </a>
  </div>
  <FlowLayout
    :banner-slides="bannerSlides"
    :topic-tabs="topicTabs"
    :waifu-count="waifuCount"
    :image-count="imageCount"
    :latest-entries="latestEntries"
    @change-tab="emit('change-tab', $event)"
    @navigate="emit('navigate', $event)"
    @add-waifu="emit('add-waifu')"
    @random="emit('random')"
    @banner-cta="emit('banner-cta')"
  />
  <FlowFooter @navigate="emit('navigate', $event)" />
</template>

<style scoped>
.flow-top-promo {
  margin-bottom: 16px;
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius);
  background: var(--private-card);
  overflow: hidden;
}
.flow-top-promo-inner {
  display: block;
  text-decoration: none;
  line-height: 0;
  transition: opacity 0.2s;
}
.flow-top-promo-inner:hover {
  opacity: 0.96;
}
.flow-top-promo-img {
  width: 100%;
  height: auto;
  max-height: 240px;
  object-fit: cover;
  object-position: center;
  display: block;
  vertical-align: middle;
}
</style>
