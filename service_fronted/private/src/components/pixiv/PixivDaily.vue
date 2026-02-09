<script setup>
/** daily: { image, title, author?, link? } */
defineProps({
  daily: {
    type: Object,
    default: () => ({}),
  },
})
</script>

<template>
  <div>
    <h2 class="section-title"><i class="fas fa-palette"></i> Pixiv 每日一图</h2>
    <div class="pixiv-daily">
      <div class="daily-image-wrap">
        <img :src="daily.image" :alt="daily.title" loading="lazy" />
      </div>
      <div class="daily-meta">
        <span>{{ daily.title }}</span>
        <span v-if="daily.author"> · {{ daily.author }}</span>
        <a v-if="daily.link" :href="daily.link" target="_blank" rel="noopener">查看原图</a>
      </div>
    </div>
    <p class="empty-state">
      <i class="fas fa-info-circle"></i><br />
      接入 Pixiv API 后可在此展示每日推荐插画。
    </p>
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
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--private-muted);
  font-size: 0.9rem;
}
.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.6;
}
</style>
