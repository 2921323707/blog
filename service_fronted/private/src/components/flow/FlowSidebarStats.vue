<script setup>
defineProps({
  waifuCount: { type: Number, default: 0 },
  imageCount: { type: Number, default: 0 },
})
const emit = defineEmits(['add-waifu', 'random'])
</script>

<template>
  <div class="flow-sidebar-card wiki-block">
    <div class="flow-sidebar-logo"><i class="fas fa-heart"></i> 宅站</div>
    <p class="flow-sidebar-desc">万物皆可萌的小站</p>
    <p class="flow-stats-inline">{{ waifuCount }} 位老婆 · {{ imageCount }} 张图</p>
    <div class="flow-sidebar-btns">
      <button type="button" class="flow-btn-primary" @click="emit('add-waifu')"><i class="fas fa-plus"></i> 添加老婆</button>
      <button type="button" class="flow-btn-primary" @click="emit('random')"><i class="fas fa-random"></i> 随机看看</button>
    </div>
  </div>
</template>

<style scoped>
.flow-sidebar-card {
  margin-bottom: 0;
}
.flow-sidebar-logo {
  font-size: 1rem;
  font-weight: 600;
  color: var(--private-accent);
  margin-bottom: 4px;
}
.flow-sidebar-desc {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: var(--private-muted);
}
.flow-stats-inline {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: var(--private-muted);
}
.flow-sidebar-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flow-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 14px;
  background: var(--private-accent);
  border: none;
  border-radius: var(--private-radius-sm);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.2s;
}
.flow-btn-primary:hover {
  filter: brightness(1.08);
}
.wiki-block {
  background: var(--private-card);
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius);
  padding: 16px;
}
</style>
