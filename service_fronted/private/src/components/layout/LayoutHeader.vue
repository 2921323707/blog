<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 用户头像：优先直接 URL，其次 QQ 号自动取 QQ 头像
const qqAvatar = import.meta.env.VITE_QQ_AVATAR || ''
const userAvatarUrl = import.meta.env.VITE_USER_AVATAR || ''
const userAvatar = computed(() => {
  if (userAvatarUrl) return userAvatarUrl
  if (qqAvatar) return `https://q1.qlogo.cn/g?b=qq&nk=${qqAvatar}&s=100`
  return ''
})
const avatarLoadFailed = ref(false)
function onAvatarError() {
  avatarLoadFailed.value = true
}

defineProps({
  activeTab: { type: String, default: 'flow' },
})
const emit = defineEmits(['change-tab'])
const navDropdownOpen = ref(false)

const navItems = [
  { id: 'flow', label: '首页' },
  { id: 'meitu', label: '美图' },
  { id: 'erciyuan', label: '二次元' },
  { id: 'pixiv', label: 'Pixiv' },
  { id: 'video', label: '视频' },
  { id: 'waifu', label: '创作中心' },
]

function setTab(id) {
  emit('change-tab', id)
  navDropdownOpen.value = false
}

function onClickOutside(e) {
  if (!e.target.closest('.wiki-nav-nav-wrap')) navDropdownOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <header class="private-header wiki-nav">
    <div class="wiki-nav-left">
      <a href="#" class="wiki-logo" @click.prevent="setTab('flow')">小驴萌站</a>
      <nav class="wiki-nav-links">
        <div class="wiki-nav-nav-wrap">
          <a
            href="#"
            class="wiki-nav-link wiki-nav-link-drop"
            :class="{ 'is-open': navDropdownOpen }"
            @click.prevent="navDropdownOpen = !navDropdownOpen"
          >
            导航 <i class="fas fa-chevron-down"></i>
          </a>
          <div v-show="navDropdownOpen" class="wiki-nav-dropdown">
            <a
              v-for="(item, i) in navItems"
              :key="i"
              href="#"
              class="wiki-nav-dropdown-item"
              @click.prevent="setTab(item.id)"
            >
              {{ item.label }}
            </a>
          </div>
        </div>
        <a href="#" class="wiki-nav-link wiki-nav-link-drop">
          帮助 <i class="fas fa-chevron-down"></i>
        </a>
        <a href="#" class="wiki-nav-link wiki-nav-link-drop">
          关注我们 <i class="fas fa-chevron-down"></i>
        </a>
      </nav>
    </div>
    <div class="wiki-nav-search">
      <i class="fas fa-search wiki-search-icon"></i>
      <input
        type="search"
        class="wiki-search-input"
        placeholder="搜索..."
        aria-label="搜索"
      />
    </div>
    <div class="wiki-nav-right">
      <span
        class="wiki-user-avatar"
        :class="{ 'has-img': userAvatar && !avatarLoadFailed }"
        aria-hidden="true"
      >
        <img
          v-if="userAvatar && !avatarLoadFailed"
          :src="userAvatar"
          alt="用户头像"
          referrerpolicy="no-referrer"
          @error="onAvatarError"
        />
      </span>
      <button type="button" class="wiki-btn-create" @click="setTab('waifu')">
        <i class="fas fa-feather"></i> 创建
      </button>
    </div>
  </header>
</template>

<style scoped>
.private-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--private-header-h);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid var(--private-border);
  backdrop-filter: blur(8px);
}
.private-header.wiki-nav {
  padding: 0 20px;
  gap: 24px;
}
.wiki-nav-left {
  display: flex;
  align-items: center;
  gap: 6px 16px;
  flex-shrink: 0;
  min-width: 0;
}
.wiki-logo {
  font-family: 'ZCOOL KuaiLe', 'Ma Shan Zheng', cursive;
  font-size: 1.5rem;
  font-weight: 400;
  text-decoration: none;
  letter-spacing: 0.08em;
  white-space: nowrap;
  /* 萌萌艺术字：渐变文字 */
  background: linear-gradient(135deg, #22c55e 0%, #14b8a6 35%, #a855f7 70%, #ec4899 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 1px 2px rgba(34, 197, 94, 0.25));
  transition: filter 0.25s ease, opacity 0.25s ease;
}
.wiki-logo:hover {
  filter: drop-shadow(0 2px 6px rgba(168, 85, 247, 0.35)) brightness(1.05);
  opacity: 1;
}
.wiki-nav-links {
  display: flex;
  align-items: center;
  gap: 4px 2px;
  flex-wrap: wrap;
}
.wiki-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  color: var(--private-text);
  font-size: 0.875rem;
  text-decoration: none;
  border-radius: var(--private-radius-sm);
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}
.wiki-nav-link:hover {
  color: var(--private-accent);
  background: var(--private-accent-soft);
}
.wiki-nav-link i {
  font-size: 0.7rem;
  color: var(--private-muted);
}
.wiki-nav-link-drop i {
  margin-left: 2px;
  transition: transform 0.2s;
}
.wiki-nav-link-drop.is-open i {
  transform: rotate(180deg);
}
.wiki-nav-nav-wrap {
  position: relative;
}
.wiki-nav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 140px;
  padding: 6px 0;
  background: var(--private-surface);
  border: 1px solid var(--private-border);
  border-radius: var(--private-radius-sm);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 200;
}
.wiki-nav-dropdown-item {
  display: block;
  padding: 8px 14px;
  color: var(--private-text);
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}
.wiki-nav-dropdown-item:hover {
  background: var(--private-accent-soft);
  color: var(--private-accent);
}
.wiki-nav-search {
  flex: 1;
  min-width: 120px;
  max-width: 360px;
  margin: 0 12px;
  position: relative;
  display: flex;
  align-items: center;
}
.wiki-search-icon {
  position: absolute;
  left: 12px;
  color: var(--private-muted);
  font-size: 0.9rem;
  pointer-events: none;
}
.wiki-search-input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--private-border);
  border-radius: 18px;
  background: #fff;
  font-size: 0.875rem;
  color: var(--private-text);
  outline: none;
  transition: border-color 0.2s;
}
.wiki-search-input::placeholder {
  color: var(--private-muted);
}
.wiki-search-input:hover,
.wiki-search-input:focus {
  border-color: #c0c0c0;
}
.wiki-nav-right {
  display: flex;
  align-items: center;
  gap: 12px 16px;
  flex-shrink: 0;
}
.wiki-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px dashed var(--private-accent);
  background: var(--private-accent-soft);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wiki-user-avatar.has-img {
  border-style: solid;
}
.wiki-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wiki-btn-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--private-accent);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s;
  white-space: nowrap;
}
.wiki-btn-create:hover {
  filter: brightness(1.08);
}
.wiki-btn-create i {
  font-size: 0.85rem;
}
@media (max-width: 768px) {
  .private-header.wiki-nav {
    flex-wrap: wrap;
    gap: 12px;
    padding: 8px 12px;
    min-height: var(--private-header-h);
    height: auto;
  }
  .wiki-nav-left {
    order: 1;
    flex: 1;
  }
  .wiki-nav-search {
    order: 3;
    max-width: none;
    margin: 0;
    flex: 1 1 100%;
  }
  .wiki-nav-right {
    order: 2;
  }
  .wiki-nav-links .wiki-nav-link {
    font-size: 0.8rem;
  }
}
</style>
