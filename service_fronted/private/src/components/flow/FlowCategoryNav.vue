<script setup>
const emit = defineEmits(['change-tab'])
</script>

<template>
  <nav class="flow-category-nav">
    <button type="button" class="flow-category-btn active">无限瀑布流</button>
    <button type="button" class="flow-category-btn" @click="emit('change-tab', 'meitu')">旅行 · 二次元</button>
    <button type="button" class="flow-category-btn" @click="emit('change-tab', 'pixiv')">Pixiv</button>
    <button type="button" class="flow-category-btn" @click="emit('change-tab', 'video')">别点我</button>
    <button type="button" class="flow-category-btn" @click="emit('change-tab', 'waifu')">创作中心</button>
  </nav>
</template>

<style scoped>
.flow-category-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--private-border);
}
.flow-category-btn {
  padding: 6px 14px;
  background: transparent;
  border: none;
  border-radius: var(--private-radius-sm);
  color: var(--private-muted);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}
.flow-category-btn:hover {
  color: var(--private-accent);
  background: var(--private-accent-soft);
}
.flow-category-btn.active {
  color: var(--private-accent);
  font-weight: 500;
  background: var(--private-accent-soft);
}
</style>
