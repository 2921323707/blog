<script setup>
defineProps({
  tabs: { type: Array, default: () => [] },
})
const emit = defineEmits(['change-tab'])
</script>

<template>
  <div class="flow-topics wiki-block">
    <h3 class="wiki-block-title">专题导航</h3>
    <div class="topic-grid">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="topic-card"
        @click="emit('change-tab', t.id)"
      >
        <i class="fas" :class="t.icon"></i>
        <span>{{ t.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.flow-topics {
  background: var(--private-card);
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius);
  padding: 16px;
  margin-bottom: 16px;
}
.wiki-block-title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--private-accent);
}
.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 500px) {
  .topic-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 700px) {
  .topic-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
.topic-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 10px;
  background: var(--private-surface);
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius-sm);
  color: var(--private-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.topic-card:hover {
  color: var(--private-accent);
  border-color: var(--private-accent);
  background: var(--private-accent-soft);
}
.topic-card i {
  font-size: 1.25rem;
}
</style>
