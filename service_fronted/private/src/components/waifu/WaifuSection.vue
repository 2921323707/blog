<script setup>
/** view: 'list' | 'add' | 'edit' | 'detail' */
defineProps({
  view: { type: String, default: 'list' },
  list: { type: Array, default: () => [] },
  current: { type: Object, default: null },
})
const emit = defineEmits(['select', 'set-view', 'add'])
</script>

<template>
  <div>
    <h2 class="section-title"><i class="fas fa-heart"></i> 我推的老婆</h2>
    <div class="waifu-layout">
      <aside class="waifu-art">
        <template v-if="view === 'list'">
          <div class="waifu-art-placeholder">选一位查看立绘</div>
        </template>
        <template v-else>
          <img
            v-if="current?.art"
            :src="current.art"
            :alt="current.name"
          />
          <div v-else class="waifu-art-placeholder">暂无立绘</div>
        </template>
      </aside>
      <div class="waifu-info">
        <template v-if="view === 'list'">
          <p class="empty-state">点击下方卡片可进入详情（CRUD 后续完善）</p>
          <div class="waifu-list-grid">
            <div
              v-for="w in list"
              :key="w.id"
              class="waifu-list-card"
              @click="emit('select', w); emit('set-view', 'detail')"
            >
              <img class="art" :src="w.art" :alt="w.name" loading="lazy" />
              <div class="name">{{ w.name }}</div>
            </div>
          </div>
          <div class="waifu-actions">
            <button type="button" class="private-nav-btn active" @click="emit('set-view', 'add')">
              <i class="fas fa-plus"></i> 添加老婆
            </button>
          </div>
        </template>
        <template v-else-if="view === 'add'">
          <div class="waifu-info-card">
            <h3><i class="fas fa-plus"></i> 添加</h3>
            <p class="empty-state">表单占位，后续接 CRUD</p>
            <button type="button" class="private-nav-btn" @click="emit('set-view', 'list')">返回列表</button>
          </div>
        </template>
        <template v-else>
          <div class="waifu-info-card" v-if="current">
            <h3><i class="fas fa-user"></i> 基本信息</h3>
            <div class="waifu-info-row"><span class="waifu-info-label">名字</span><span class="waifu-info-value">{{ current.name }}</span></div>
            <div class="waifu-info-row"><span class="waifu-info-label">出处</span><span class="waifu-info-value">{{ current.source }}</span></div>
            <div class="waifu-info-row"><span class="waifu-info-label">备注</span><span class="waifu-info-value">{{ current.note }}</span></div>
          </div>
          <div class="waifu-actions">
            <button type="button" class="private-nav-btn" @click="emit('set-view', 'edit')"><i class="fas fa-edit"></i> 编辑</button>
            <button type="button" class="private-nav-btn" @click="emit('set-view', 'list'); emit('select', null)"><i class="fas fa-list"></i> 返回列表</button>
          </div>
        </template>
      </div>
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
.waifu-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}
@media (min-width: 768px) {
  .waifu-layout {
    grid-template-columns: minmax(240px, 360px) 1fr;
  }
}
.waifu-art {
  position: sticky;
  top: calc(var(--private-header-h) + 16px);
  background: var(--private-card);
  border-radius: var(--private-radius);
  overflow: hidden;
  border: 1px solid var(--private-border);
}
.waifu-art img {
  width: 100%;
  height: auto;
  display: block;
  background: var(--private-surface);
}
.waifu-art-placeholder {
  aspect-ratio: 3/4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--private-muted);
  font-size: 0.9rem;
  background: var(--private-surface);
}
.waifu-info {
  min-width: 0;
}
.waifu-info-card {
  background: var(--private-card);
  border-radius: var(--private-radius);
  border: 1px solid var(--private-border);
  padding: 16px;
  margin-bottom: 16px;
}
.waifu-info-card h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: var(--private-accent);
  display: flex;
  align-items: center;
  gap: 8px;
}
.waifu-info-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px 16px;
  font-size: 0.875rem;
  margin-bottom: 8px;
}
.waifu-info-row:last-child {
  margin-bottom: 0;
}
.waifu-info-label {
  color: var(--private-muted);
}
.waifu-info-value {
  color: var(--private-text);
}
.waifu-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.private-nav-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border: none;
  border-radius: var(--private-radius-sm);
  background: transparent;
  color: var(--private-muted);
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, background 0.2s;
}
.private-nav-btn:hover {
  color: var(--private-text);
  background: var(--private-accent-soft);
}
.private-nav-btn.active {
  color: var(--private-accent);
  background: var(--private-accent-soft);
}
.waifu-list-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .waifu-list-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 900px) {
  .waifu-list-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.waifu-list-card {
  background: var(--private-card);
  border-radius: var(--private-radius);
  overflow: hidden;
  border: 1px solid var(--private-border);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}
.waifu-list-card:hover {
  border-color: var(--private-accent);
  transform: translateY(-2px);
}
.waifu-list-card .art {
  aspect-ratio: 3/4;
  object-fit: cover;
  width: 100%;
  display: block;
  background: var(--private-surface);
}
.waifu-list-card .name {
  padding: 10px 12px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--private-text);
}
</style>
