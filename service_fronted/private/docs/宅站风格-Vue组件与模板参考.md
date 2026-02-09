# 宅站 / 萌娘百科风格 — Vue 组件、模板与技能参考

## 一、风格特点（萌娘百科那种感觉）

- **配色**：浅色底 + 粉色/紫色/蓝色高亮、圆角、柔和阴影
- **排版**：信息密度高、卡片/表格/信息框多，偏「百科/维基」布局
- **元素**：角色头像、标签、徽章、时间线、引用块、折叠面板、导航塔（侧边/顶栏）
- **字体**：清晰易读，标题可配日系/萌系字体（如思源、霞鹜等）

---

## 二、可直接用的 Vue 组件库 / 模板

| 类型 | 项目 | 说明 | 链接/技术 |
|------|------|------|-----------|
| 蔚蓝档案风 | Blue Archive 风格主页 | 个人主页，宅站 UI 参考 | [sf-yuzifu/homepage](https://github.com/sf-yuzifu/homepage) |
| 蔚蓝档案风 | VitePress 蔚蓝档案主题 | 博客/文档站，可直接当模板 | [vitepress-theme-bluearchive](https://github.com/Alittfre/vitepress-theme-bluearchive) |
| 二次元游戏 UI | EnsembleStars 风格组件库 | Vue3，偶像梦幻祭风格组件 | [Bernankez/EnsembleStars](https://github.com/Bernankez/EnsembleStars) |
| 动漫向组件 | anime-skip/ui | Vue + Tailwind，面向动漫类产品 | [anime-skip/ui](https://github.com/anime-skip/ui) |
| 赛博/科幻风 | CyberPunk-UI | Vue3 组件库，可当「科技感宅站」基础 | [CyberPunk-UI](https://cyberpunk-ui.netlify.app/) |
| 二次元角色风 | 神里綾華 Bot 前端 | Vue3 + TS + uniapp，角色主题管理界面 | DCloud 插件 ID: 9325 |

---

## 三、做「萌娘百科那种」页面需要的组件技能/模板思路

### 1. 布局与导航（像百科顶栏/侧栏）

- **顶栏**：Logo + 搜索 + 主导航 + 用户区（可做成 Vue 组件 `AppHeader`）
- **侧栏/塔**：分类树、本页目录、相关页面（可做成 `WikiSidebar` / `NavTower`）
- **面包屑**：首页 > 分类 > 当前条目（`Breadcrumb`）

### 2. 内容展示（百科式信息块）

- **信息框**：角色/作品/术语的「右侧或顶部信息卡」（`InfoBox`，支持头像、表格、标签）
- **引用块 / 对话**：台词、注释（`QuoteBlock` / `DialogueBox`）
- **标签/徽章**：属性、状态、分类（`Tag` / `Badge`）
- **时间线**：角色经历、作品年表（`Timeline`）
- **折叠面板**：长列表、剧透（`Collapse` / `Spoiler`）
- **表格**：参数表、对比表（增强 `el-table` 或自定义 `WikiTable`）

### 3. 媒体与图鉴

- **头像/立绘**：圆角、边框、悬停放大（`CharacterCard`）
- **图鉴/相册**：网格 + 灯箱（你私站已有类似，可抽象成 `GalleryGrid` + `Lightbox`）
- **视频嵌入**：本地播放器 + 封面（你私站已有，可做成 `VideoCard`）

### 4. 百科/维基特有

- **内部链接**：站内词条链接统一样式（`WikiLink`）
- **分类标签**：按分类筛选、高亮当前分类（`CategoryTags`）
- **编辑/历史**：若要做 UGC，可预留「编辑」「历史」按钮 + 简单版本对比（`EditBar`）

---

## 四、推荐在私站里优先做的「宅站组件」

在现有 `service_fronted/private` 的 Vue 项目里，可以按「萌娘百科感」逐步加这些组件（都做成 `.vue` 单文件组件即可）：

1. **InfoBox** — 右侧/顶部信息卡（头像 + 键值对 + 标签）
2. **WikiCard** — 条目卡片（标题 + 摘要 + 缩略图 + 分类标签）
3. **Tag / Badge** — 统一标签样式（颜色、圆角、可关闭）
4. **Collapse / Spoiler** — 折叠块、剧透遮罩
5. **Breadcrumb** — 面包屑导航
6. **CharacterCard** — 角色/立绘卡片（头像 + 名字 + 简短描述）

样式上可统一：圆角 8–12px、浅色背景 + 淡紫/粉高亮、柔和阴影，就很容易接近「宅站/萌娘百科」那种感觉。

---

## 五、萌娘百科本身的技术参考

- 萌娘百科基于 **MediaWiki**，前端主要是服务端渲染 + 皮肤 + TemplateStyles，不是 Vue SPA。
- 要做「类似萌娘百科」的**界面观感**，用 Vue 实现上述布局和组件即可；**内容结构**可参考其信息框、分类、引用块等排版方式。
- GitHub 上有 **moepad/moe-homeland-data** 等与萌娘百科相关的数据/脚本，可作内容结构参考，而非直接拿来当 Vue 模板。

---

## 六、小结

- **直接用**：Blue Archive 风主页、vitepress-theme-bluearchive、EnsembleStars 组件库、anime-skip/ui。
- **自己写**：按上面「宅站组件技能」在私站里做 InfoBox、WikiCard、Tag、Collapse、Breadcrumb、CharacterCard，再统一一套萌系配色和圆角，就能做出接近萌娘百科那种的宅站 Vue 模板。

如需，我可以按你当前 `private` 项目结构，给出一两个组件的示例代码（例如 `InfoBox.vue`、`WikiCard.vue`）和用法。
