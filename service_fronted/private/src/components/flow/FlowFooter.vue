<script setup>
const emit = defineEmits(['navigate'])
</script>

<template>
  <footer class="flow-footer">
    <span class="flow-footer-label">帮助 · 统计</span>
    <a href="#" class="flow-footer-link" @click.prevent="emit('navigate', 'waifu')">老婆列表</a>
    <span class="flow-footer-sep">·</span>
    <a href="#" class="flow-footer-link" @click.prevent="emit('navigate', 'meitu')">旅行相册</a>
    <span class="flow-footer-sep">·</span>
    <a href="#" class="flow-footer-link" @click.prevent="emit('navigate', 'video')">别点我</a>
  </footer>
</template>

<style scoped>
.flow-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--private-border);
  font-size: 0.8rem;
  color: var(--private-muted);
}
.flow-footer-label {
  margin-right: 8px;
}
.flow-footer-link {
  color: var(--private-accent);
  text-decoration: none;
}
.flow-footer-link:hover {
  text-decoration: underline;
}
.flow-footer-sep {
  margin: 0 6px;
  user-select: none;
}
</style>
