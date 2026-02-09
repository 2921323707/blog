<script setup>
/**
 * 面包屑导航，支持每级使用图片素材（image）或内置图标
 * items: { to?: string, label: string, image?: string }[]
 */
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  /** 分隔符图片 URL，不传则显示 "/" */
  sepImage: {
    type: String,
    default: '',
  },
})

// 内置 SVG 图标（可被传入的 image 覆盖）
const defaultIcons = {
  home: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'),
  heart: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'),
  list: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'),
  add: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'),
  edit: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'),
  user: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'),
}

function getIcon(item, index) {
  if (item.image) return item.image
  const key = item.icon || (index === 0 ? 'home' : index === 1 ? 'heart' : 'list')
  return defaultIcons[key] || defaultIcons.list
}
</script>

<template>
  <nav class="breadcrumb" aria-label="面包屑导航">
    <ol class="breadcrumb-list">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="breadcrumb-item"
      >
        <template v-if="i > 0">
          <span class="breadcrumb-sep" aria-hidden="true">
            <img v-if="sepImage" :src="sepImage" alt="" class="breadcrumb-sep-img" />
            <span v-else class="breadcrumb-sep-char">/</span>
          </span>
        </template>
        <component
          :is="item.to != null && item.to !== '' ? 'a' : 'span'"
          :href="item.to || undefined"
          :class="['breadcrumb-link', { 'is-current': i === items.length - 1 && (item.to == null || item.to === '') }]"
          @click.prevent="item.to != null && item.to !== '' && $emit('navigate', item.to)"
        >
          <img
            v-if="getIcon(item, i)"
            :src="getIcon(item, i)"
            alt=""
            class="breadcrumb-icon"
          />
          <span class="breadcrumb-label">{{ item.label }}</span>
        </component>
      </li>
    </ol>
  </nav>
</template>
