/**
 * Random cover for posts
 */

'use strict'

const imgTestReg = /\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i

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

  if (coverVal === false) return data

  // If cover is not set, use index.png as default cover
  if (!coverVal) {
    if (defaultCover) {
      // 统一使用 index.png 作为默认封面
      const unifiedCover = Array.isArray(defaultCover) ? defaultCover[0] : defaultCover
      data.cover = unifiedCover
      coverVal = unifiedCover
    }
  }

  if (coverVal && (coverVal.indexOf('//') !== -1 || imgTestReg.test(coverVal))) {
    data.cover_type = 'img'
  }

  return data
})

// 处理首页列表中的文章 - 在生成前处理所有文章数据
hexo.extend.filter.register('before_generate', () => {
  const { cover: { default_cover: defaultCover } } = hexo.theme.config
  
  if (!defaultCover) return
  
  const unifiedCover = Array.isArray(defaultCover) ? defaultCover[0] : defaultCover
  
  // 处理所有文章数据
  const posts = hexo.locals.get('posts')
  if (posts && posts.length) {
    posts.forEach(post => {
      if (post.cover === false) return
      
      // 如果文章没有设置封面，统一使用 index.png
      if (!post.cover) {
        post.cover = unifiedCover
        if (unifiedCover && (unifiedCover.indexOf('//') !== -1 || imgTestReg.test(unifiedCover))) {
          post.cover_type = 'img'
        }
      }
    })
  }
})

hexo.extend.generator.register('post', locals => {
  const { post_asset_folder: postAssetFolder } = hexo.config
  const { cover: { default_cover: defaultCover } } = hexo.theme.config

  function * createCoverGenerator () {
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

    if (coverVal === false) return data

    // If cover is not set, use @index.png as default cover
    if (!coverVal) {
      if (defaultCover) {
        // 统一使用 @index.png 作为默认封面
        const unifiedCover = Array.isArray(defaultCover) ? defaultCover[0] : defaultCover
        data.cover = unifiedCover
        coverVal = unifiedCover
      } else {
        const randomCover = coverGenerator.next().value
        data.cover = randomCover
        coverVal = randomCover
      }
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
