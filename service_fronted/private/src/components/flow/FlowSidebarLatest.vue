<script setup>
/** entries: { label: string, to?: string }[] */
defineProps({
  entries: { type: Array, default: () => [] },
})
const emit = defineEmits(['navigate'])
</script>

<template>
  <div class="flow-sidebar-card wiki-block">
    <div class="flow-sidebar-tabs">
      <span class="flow-sidebar-tab active">最新条目</span>
    </div>
    <ul class="flow-sidebar-list">
      <li v-for="(ent, i) in entries" :key="i">
        <a v-if="ent.to" href="#" class="flow-sidebar-link" @click.prevent="emit('navigate', ent.to)">{{ ent.label }}</a>
        <span v-else class="flow-sidebar-link plain">{{ ent.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.flow-sidebar-card {
  margin-bottom: 0;
}
.flow-sidebar-tabs {
  margin-bottom: 10px;
}
.flow-sidebar-tab {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--private-accent);
}
.flow-sidebar-list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
}
.flow-sidebar-list li {
  margin-bottom: 6px;
}
.flow-sidebar-link {
  display: block;
  padding: 4px 0;
  font-size: 0.85rem;
  color: var(--private-accent);
  text-decoration: none;
}
.flow-sidebar-link:hover {
  text-decoration: underline;
}
.flow-sidebar-link.plain {
  color: var(--private-text);
  cursor: default;
}
.wiki-block {
  background: var(--private-card);
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius);
  padding: 16px;
}
</style>
