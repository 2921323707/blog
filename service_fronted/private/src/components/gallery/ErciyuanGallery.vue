<script setup>
/** items: { id, thumb, title }[] */
defineProps({
  items: { type: Array, default: () => [] },
})
</script>

<template>
  <div>
    <h2 class="section-title"><i class="fas fa-star"></i> 二次元</h2>
    <div class="gallery-grid">
      <a
        v-for="item in items"
        :key="item.id"
        class="gallery-card"
        :href="item.thumb"
        target="_blank"
        rel="noopener"
      >
        <img class="thumb" :src="item.thumb" :alt="item.title" loading="lazy" />
        <div class="info"><strong>{{ item.title }}</strong></div>
      </a>
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
  padding: 10px 12px;
  font-size: 0.8rem;
  color: var(--private-muted);
  line-height: 1.3;
}
.gallery-card .info strong {
  color: var(--private-text);
  display: block;
  margin-bottom: 2px;
}
</style>
