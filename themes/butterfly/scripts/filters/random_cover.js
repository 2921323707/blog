/**
 * Random cover for posts
 * 加载逻辑：
 * 1. 如果用户上传了指定封面，则使用指定封面
 * 2. 如果没有上传封面，如果文章内容中存在图片，随机从博客内容中获取一张作为封面
 * 3. 如果都没有，使用默认封面图片 /img/article_default.jpg
 */

'use strict'

const imgTestReg = /\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i
const https = require('https')
const http = require('http')

// 默认封面图片路径
const DEFAULT_COVER_IMAGE = '/img/article_default.jpg'

/**
 * 从文章数据中提取标签名称，返回用于搜索的关键词
 */
function getSearchQueryFromTags(article) {
  let tags = []

  // 尝试多种方式获取标签
  if (article.tags) {
    if (Array.isArray(article.tags)) {
      // 直接是数组
      tags = article.tags
    } else if (article.tags.data && Array.isArray(article.tags.data)) {
      // Hexo 3.x+ 格式：tags.data 是数组
      tags = article.tags.data
    } else if (article.tags.toArray && typeof article.tags.toArray === 'function') {
      // Hexo 的 TagList 对象，使用 toArray 方法
      tags = article.tags.toArray()
    }
  }

  // 提取标签名称
  const tagNames = tags
    .map(tag => {
      if (typeof tag === 'string') {
        return tag
      } else if (tag && tag.name) {
        return tag.name
      } else if (tag && tag.data && tag.data.name) {
        return tag.data.name
      }
      return null
    })
    .filter(name => name && name.trim())

  // 如果有标签，使用第一个标签作为搜索关键词（或组合前几个）
  if (tagNames.length > 0) {
    // 使用第一个标签，或者组合前两个标签（如果第一个太短）
    let query = tagNames[0]
    if (query.length < 3 && tagNames.length > 1) {
      query = `${query} ${tagNames[1]}`
    }
    return query.substring(0, 50) // 限制查询长度
  }

  // 如果没有标签，返回 null，让调用者使用标题作为备选
  return null
}

/**
 * 从 markdown 内容中提取所有图片 URL
 */
function extractImagesFromContent(content) {
  if (!content) return []

  const images = []
  // 匹配 markdown 图片语法: ![alt](url) 或 [![alt](url)](link)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g
  // 匹配 HTML img 标签: <img src="url" ...>
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  // 匹配图片 URL（直接链接）
  const urlImageRegex = /https?:\/\/[^\s<>"']+\.(png|jpe?g|gif|svg|webp|avif)(\?[^\s<>"']*)?/gi

  let match

  // 提取 markdown 图片
  while ((match = markdownImageRegex.exec(content)) !== null) {
    const url = match[2].trim()
    if (url && (url.startsWith('http') || url.startsWith('/') || imgTestReg.test(url))) {
      images.push(url)
    }
  }

  // 提取 HTML img 标签
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const url = match[1].trim()
    if (url && (url.startsWith('http') || url.startsWith('/') || imgTestReg.test(url))) {
      images.push(url)
    }
  }

  // 提取直接 URL
  while ((match = urlImageRegex.exec(content)) !== null) {
    images.push(match[0])
  }

  // 去重
  return [...new Set(images)]
}

/**
 * 获取默认封面图片路径
 * 直接使用本地默认图片，不依赖第三方API
 */
function getDefaultCoverImage() {
  return DEFAULT_COVER_IMAGE
}

// 使用 filter 处理所有文章（包括首页列表）
hexo.extend.filter.register('before_post_render', data => {
  if (!data.layout || data.layout !== 'post') return data

  const { post_asset_folder: postAssetFolder } = hexo.config
  const { cover: { default_cover: defaultCover } } = hexo.theme.config

  let { cover: coverVal, top_img: topImg, pagination_cover: paginationCover } = data

  // Add path to top_img and cover if post_asset_folder is enabled
  if (postAssetFolder) {
    if (topImg && topImg.indexOf('/') === -1 && imgTestReg.test(topImg)) {
      data.top_img = `${data.path}${topImg}`
    }
    if (coverVal && coverVal.indexOf('/') === -1 && imgTestReg.test(coverVal)) {
      data.cover = `${data.path}${coverVal}`
    }
    if (paginationCover && paginationCover.indexOf('/') === -1 && imgTestReg.test(paginationCover)) {
      data.pagination_cover = `${data.path}${paginationCover}`
    }
  }

  // 如果明确设置为 false，则不使用封面
  if (coverVal === false) return data

  // 逻辑1: 如果用户已上传指定封面，直接使用
  if (coverVal) {
    if (coverVal.indexOf('//') !== -1 || imgTestReg.test(coverVal)) {
      data.cover_type = 'img'
    }
    return data
  }

  // 逻辑2: 从文章内容中提取图片，随机选择一张作为封面
  const contentImages = extractImagesFromContent(data.content || data._content || '')
  if (contentImages.length > 0) {
    const randomImage = contentImages[Math.floor(Math.random() * contentImages.length)]
    data.cover = randomImage
    data.cover_type = 'img'
    hexo.log.info(`Post "${data.title}" using random image from content: ${randomImage}`)
    return data
  }

  // 逻辑3: 使用默认封面图片
  const defaultImage = getDefaultCoverImage()

  if (defaultImage) {
    data.cover = defaultImage
    data.cover_type = 'img'
    hexo.log.info(`Post "${data.title}" using default cover image: ${defaultImage}`)
    return data
  }

  // 如果以上都失败，使用默认封面
  if (defaultCover) {
    const unifiedCover = Array.isArray(defaultCover) ? defaultCover[0] : defaultCover
    data.cover = unifiedCover
    coverVal = unifiedCover
    if (coverVal && (coverVal.indexOf('//') !== -1 || imgTestReg.test(coverVal))) {
      data.cover_type = 'img'
    }
  }

  return data
})

// 处理首页列表中的文章 - 在生成前处理所有文章数据
hexo.extend.filter.register('before_generate', () => {
  const { cover: { default_cover: defaultCover } } = hexo.theme.config

  // 处理所有文章数据
  const posts = hexo.locals.get('posts')
  if (!posts || !posts.length) return

  const unifiedCover = defaultCover ? (Array.isArray(defaultCover) ? defaultCover[0] : defaultCover) : null

  // 处理文章封面（首页列表中的文章不会经过 before_post_render，所以在这里处理）
  posts.forEach(post => {
    if (post.cover === false) return

    // 逻辑1: 如果已有封面，设置类型并跳过
    if (post.cover) {
      if (post.cover.indexOf('//') !== -1 || imgTestReg.test(post.cover)) {
        post.cover_type = 'img'
      }
      return
    }

    // 逻辑2: 从文章内容中提取图片
    const contentImages = extractImagesFromContent(post.content || post._content || '')
    if (contentImages.length > 0) {
      const randomImage = contentImages[Math.floor(Math.random() * contentImages.length)]
      post.cover = randomImage
      post.cover_type = 'img'
      hexo.log.info(`Post "${post.title}" using random image from content: ${randomImage}`)
      return
    }

    // 逻辑3: 使用默认封面图片
    const defaultImage = getDefaultCoverImage()

    if (defaultImage) {
      post.cover = defaultImage
      post.cover_type = 'img'
      hexo.log.info(`Post "${post.title}" using default cover image: ${defaultImage}`)
      return
    }

    // 如果以上都失败，使用默认封面
    if (unifiedCover) {
      post.cover = unifiedCover
      if (unifiedCover.indexOf('//') !== -1 || imgTestReg.test(unifiedCover)) {
        post.cover_type = 'img'
      }
    }
  })
})

hexo.extend.generator.register('post', locals => {
  const { post_asset_folder: postAssetFolder } = hexo.config
  const { cover: { default_cover: defaultCover } } = hexo.theme.config

  function* createCoverGenerator() {
    if (!defaultCover) {
      while (true) yield false
    }
    if (!Array.isArray(defaultCover)) {
      while (true) yield defaultCover
    }

    const coverCount = defaultCover.length
    if (coverCount === 1) {
      while (true) yield defaultCover[0]
    }

    const maxHistory = Math.min(3, coverCount - 1)
    const history = []

    while (true) {
      let index
      do {
        index = Math.floor(Math.random() * coverCount)
      } while (history.includes(index))

      history.push(index)
      if (history.length > maxHistory) history.shift()

      yield defaultCover[index]
    }
  }

  const coverGenerator = createCoverGenerator()

  const handleImg = data => {
    let { cover: coverVal, top_img: topImg, pagination_cover: paginationCover } = data

    // Add path to top_img and cover if post_asset_folder is enabled
    if (postAssetFolder) {
      if (topImg && topImg.indexOf('/') === -1 && imgTestReg.test(topImg)) {
        data.top_img = `${data.path}${topImg}`
      }
      if (coverVal && coverVal.indexOf('/') === -1 && imgTestReg.test(coverVal)) {
        data.cover = `${data.path}${coverVal}`
      }
      if (paginationCover && paginationCover.indexOf('/') === -1 && imgTestReg.test(paginationCover)) {
        data.pagination_cover = `${data.path}${paginationCover}`
      }
    }

    // 如果明确设置为 false，则不使用封面
    if (coverVal === false) return data

    // 逻辑1: 如果用户已上传指定封面，直接使用
    if (coverVal) {
      if (coverVal.indexOf('//') !== -1 || imgTestReg.test(coverVal)) {
        data.cover_type = 'img'
      }
      return data
    }

    // 逻辑2: 从文章内容中提取图片，随机选择一张作为封面
    const contentImages = extractImagesFromContent(data.content || data._content || '')
    if (contentImages.length > 0) {
      const randomImage = contentImages[Math.floor(Math.random() * contentImages.length)]
      data.cover = randomImage
      data.cover_type = 'img'
      return data
    }

    // 逻辑3: 使用默认封面图片
    const defaultImage = getDefaultCoverImage()

    if (defaultImage) {
      data.cover = defaultImage
      data.cover_type = 'img'
      return data
    }

    // 如果以上都失败，使用默认封面
    if (defaultCover) {
      const unifiedCover = Array.isArray(defaultCover) ? defaultCover[0] : defaultCover
      data.cover = unifiedCover
      coverVal = unifiedCover
    } else {
      const randomCover = coverGenerator.next().value
      data.cover = randomCover
      coverVal = randomCover
    }

    if (coverVal && (coverVal.indexOf('//') !== -1 || imgTestReg.test(coverVal))) {
      data.cover_type = 'img'
    }

    return data
  }

  const posts = locals.posts.sort('date').toArray()
  const { length } = posts

  return posts.map((post, i) => {
    if (i) post.prev = posts[i - 1]
    if (i < length - 1) post.next = posts[i + 1]

    post.__post = true

    return {
      data: handleImg(post),
      layout: 'post',
      path: post.path
    }
  })
})
