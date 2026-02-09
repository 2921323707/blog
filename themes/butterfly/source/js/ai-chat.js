(() => {
  // API 基础配置
  const getApiBase = () => {
    const { hostname, port } = window.location

    // 本地开发环境
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '5000') {
      return `http://${hostname}:5000/api`
    }

    // 生产环境走同源
    return `${window.location.origin}/api`
  }

  const API_BASE = getApiBase()

  // 缓存 DOM 查询结果
  const cache = {
    dialog: null,
    mask: null,
    close: null,
    messages: null,
    input: null,
    inputWrap: null,
    sendBtn: null,
    btn: null,
    initialized: false
  }

  // 滚动到底部
  const scrollToBottom = (el) => {
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  // 是否接近底部
  const isNearBottom = (el, threshold = 100) => {
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  // 追加用户消息
  const appendUserMsg = (container, text) => {
    const stick = isNearBottom(container)
    const item = document.createElement('div')
    item.className = 'ai-chat-msg ai-chat-msg--user'

    const bubble = document.createElement('div')
    bubble.className = 'ai-chat-bubble'
    bubble.textContent = text

    item.appendChild(bubble)
    container.appendChild(item)
    if (stick) scrollToBottom(container)
  }

  // 创建机器人消息元素（用于流式输出）
  const createBotMsg = (container) => {
    const stick = isNearBottom(container)
    const item = document.createElement('div')
    item.className = 'ai-chat-msg ai-chat-msg--bot'

    const bubble = document.createElement('div')
    bubble.className = 'ai-chat-bubble'
    // 初始隐藏，收到第一帧数据后显示
    bubble.style.opacity = '0'
    item.appendChild(bubble)

    container.appendChild(item)
    if (stick) scrollToBottom(container)

    return { item, bubble, stick }
  }

  // 追加机器人消息
  const appendBotMsg = (container, text, citations = []) => {
    const stick = isNearBottom(container)
    const item = document.createElement('div')
    item.className = 'ai-chat-msg ai-chat-msg--bot'

    const bubble = document.createElement('div')
    bubble.className = 'ai-chat-bubble'
    bubble.textContent = text
    bubble.style.opacity = '1'  // 非流式消息直接显示

    item.appendChild(bubble)

    // 添加引用来源
    if (citations.length > 0) {
      const citeWrap = document.createElement('details')
      citeWrap.className = 'ai-chat-citations'

      const summary = document.createElement('summary')
      summary.textContent = `引用来源（${citations.length}）`
      citeWrap.appendChild(summary)

      const list = document.createElement('ol')
      list.className = 'ai-chat-citations__list'

      citations.forEach(c => {
        const li = document.createElement('li')
        li.className = 'ai-chat-citations__item'

        const row = document.createElement('div')
        row.className = 'ai-chat-citations__row'

        const a = document.createElement('a')
        a.className = 'ai-chat-citations__link'
        a.href = c?.url || '#'
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.textContent = c?.title || c?.url || '来源'

        row.appendChild(a)
        li.appendChild(row)
        list.appendChild(li)
      })

      citeWrap.appendChild(list)
      item.appendChild(citeWrap)
    }

    container.appendChild(item)
    if (stick) scrollToBottom(container)
  }

  // 打开对话框
  const openDialog = () => {
    const { dialog, mask, messages, input } = cache
    if (!dialog || dialog.style.display === 'flex') return

    dialog.style.display = 'flex'
    mask.style.display = 'block'
    dialog.setAttribute('aria-hidden', 'false')
    mask.setAttribute('aria-hidden', 'false')
    // 移动端锁定背景滚动，避免滑动时背景在动（保存滚动位置以便关闭时恢复）
    const scrollY = window.scrollY || window.pageYOffset
    document.body.classList.add('ai-chat-open')
    document.body.dataset.aiChatScrollY = String(scrollY)

    // 首次打开显示欢迎语
    if (messages && messages.children.length === 0 && !messages.dataset.greeted) {
      messages.dataset.greeted = '1'
      appendBotMsg(messages, '你好，我是嘟嘟可。你可以直接问我"这篇文章讲了什么/某个概念在哪里提到/推荐相关阅读"等。')
    }

    // 移动端聚焦输入框
    if (input) {
      setTimeout(() => input.focus(), 100)
    }
  }

  // 关闭对话框
  const closeDialog = () => {
    const { dialog, mask, input } = cache
    if (!dialog || dialog.style.display === 'none') return

    dialog.style.display = 'none'
    mask.style.display = 'none'
    dialog.setAttribute('aria-hidden', 'true')
    mask.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('ai-chat-open')
    // 恢复打开弹窗前的滚动位置（移动端 body 使用 position:fixed 时会丢失）
    const savedScrollY = document.body.dataset.aiChatScrollY
    if (savedScrollY != null) {
      window.scrollTo(0, Number(savedScrollY))
      delete document.body.dataset.aiChatScrollY
    }

    input?.blur()
  }

  // 发送消息
  const sendMessage = async () => {
    const { input, sendBtn, messages } = cache
    if (!input || !sendBtn) return

    const text = input.value.trim()
    if (!text || sendBtn.disabled) return

    input.value = ''
    appendUserMsg(messages, text)

    sendBtn.disabled = true

    // 创建空的机器人消息容器用于流式输出
    const { item, bubble } = createBotMsg(messages)

    try {
      const resp = await fetch(`${API_BASE}/ai/mascot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, page_url: window.location.href, stream: true })
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        bubble.textContent = `出错了：${errorText || '请求失败'}`
        return
      }

      // 使用 ReadableStream 进行流式读取
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let citations = []
      let hasContent = false

      // 读取流数据
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 按行处理数据
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))
            console.log('[AI Chat] 收到数据:', data)

            // 处理引用来源数据
            if (data.type === 'citations' && data.citations) {
              citations = data.citations
              continue
            }

            // 处理文本内容
            if (data.type === 'content' && data.text) {
              // 收到第一帧数据时显示气泡
              if (!hasContent) {
                bubble.style.opacity = '1'
              }
              bubble.textContent += data.text
              hasContent = true
              scrollToBottom(messages)
            }

            // 处理结束信号
            if (data.type === 'done') {
              // 添加引用来源
              if (citations.length > 0) {
                const citeWrap = document.createElement('details')
                citeWrap.className = 'ai-chat-citations'

                const summary = document.createElement('summary')
                summary.textContent = `引用来源（${citations.length}）`
                citeWrap.appendChild(summary)

                const list = document.createElement('ol')
                list.className = 'ai-chat-citations__list'

                citations.forEach(c => {
                  const li = document.createElement('li')
                  li.className = 'ai-chat-citations__item'

                  const row = document.createElement('div')
                  row.className = 'ai-chat-citations__row'

                  const a = document.createElement('a')
                  a.className = 'ai-chat-citations__link'
                  a.href = c?.url || '#'
                  a.target = '_blank'
                  a.rel = 'noopener noreferrer'
                  a.textContent = c?.title || c?.url || '来源'

                  row.appendChild(a)
                  li.appendChild(row)
                  list.appendChild(li)
                })

                citeWrap.appendChild(list)
                item.appendChild(citeWrap)
                scrollToBottom(messages)
              }
              return
            }
          } catch (e) {
            console.log('[AI Chat] 解析错误:', e, line)
          }
        }
      }

      // 如果没有收到任何内容，显示提示
      if (!hasContent && !bubble.textContent) {
        bubble.textContent = '（没有收到回复）'
      }

      // 添加引用来源（如果有）
      if (citations.length > 0) {
        const citeWrap = document.createElement('details')
        citeWrap.className = 'ai-chat-citations'

        const summary = document.createElement('summary')
        summary.textContent = `引用来源（${citations.length}）`
        citeWrap.appendChild(summary)

        const list = document.createElement('ol')
        list.className = 'ai-chat-citations__list'

        citations.forEach(c => {
          const li = document.createElement('li')
          li.className = 'ai-chat-citations__item'

          const row = document.createElement('div')
          row.className = 'ai-chat-citations__row'

          const a = document.createElement('a')
          a.className = 'ai-chat-citations__link'
          a.href = c?.url || '#'
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          a.textContent = c?.title || c?.url || '来源'

          row.appendChild(a)
          li.appendChild(row)
          list.appendChild(li)
        })

        citeWrap.appendChild(list)
        item.appendChild(citeWrap)
        scrollToBottom(messages)
      }
    } catch (err) {
      console.log('[AI Chat] 错误:', err)
      bubble.textContent = `出错了：${err?.message || String(err)}`
    } finally {
      sendBtn.disabled = false
    }
  }

  // 更新输入框位置（跟随键盘，仅移动端）
  const updateInputPosition = () => {
    if (window.innerWidth > 768) return
    const { inputWrap } = cache
    if (!inputWrap) return

    const vv = window.visualViewport
    if (vv) {
      const offset = window.innerHeight - vv.height
      inputWrap.style.bottom = `${Math.max(0, offset)}px`
    }
  }

  // ESC 键关闭（命名函数便于 PJAX 时移除）
  const handleEscKey = (e) => {
    if (e.key === 'Escape' && cache.dialog?.style.display === 'flex') {
      closeDialog()
    }
  }

  // 移除全局监听（PJAX 重新初始化前调用，避免重复注册）
  const removeGlobalListeners = () => {
    document.removeEventListener('keydown', handleEscKey)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateInputPosition)
      window.visualViewport.removeEventListener('scroll', updateInputPosition)
    }
    window.removeEventListener('resize', updateInputPosition)
  }

  // 初始化事件绑定
  const initEvents = () => {
    if (cache.initialized) return
    cache.initialized = true

    const { dialog, mask, close, input, sendBtn, btn } = cache
    if (!dialog || !mask) return

    // 初始隐藏状态
    dialog.style.display = 'none'
    mask.style.display = 'none'

    // 按钮点击
    btn?.addEventListener('click', openDialog)
    close?.addEventListener('click', closeDialog)
    mask?.addEventListener('click', closeDialog)

    // 输入框事件
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    })

    // 发送按钮点击
    sendBtn?.addEventListener('click', sendMessage)

    // ESC 键关闭
    document.addEventListener('keydown', handleEscKey)

    // 键盘事件监听（移动端输入框跟随键盘）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateInputPosition, { passive: true })
      window.visualViewport.addEventListener('scroll', updateInputPosition, { passive: true })
    }

    // 兼容旧浏览器
    window.addEventListener('resize', updateInputPosition)
  }

  // 查找或创建按钮
  const ensureButton = () => {
    let btn = document.getElementById('ai-chat-btn')
    if (btn) {
      cache.btn = btn
      return btn
    }

    const rightside = document.querySelector('#rightside #rightside-config-show')
    btn = document.createElement('button')
    btn.id = 'ai-chat-btn'
    btn.type = 'button'
    btn.title = '看板娘'
    btn.innerHTML = '<i class="fas fa-robot" aria-hidden="true"></i>'

    if (rightside) {
      const goUp = document.getElementById('go-up')
      if (goUp && goUp.parentElement === rightside) {
        rightside.insertBefore(btn, goUp)
      } else {
        rightside.appendChild(btn)
      }
    } else {
      btn.className = 'ai-chat-float-btn'
      document.body.appendChild(btn)
    }

    cache.btn = btn
    return btn
  }

  // 初始化入口
  const init = () => {
    cache.dialog = document.getElementById('ai-chat-dialog')
    cache.mask = document.getElementById('ai-chat-mask')
    cache.close = document.getElementById('ai-chat-close')
    cache.messages = document.getElementById('ai-chat-messages')
    cache.input = document.querySelector('.ai-chat-input')
    cache.inputWrap = document.querySelector('.ai-chat-input-wrap')
    cache.sendBtn = document.querySelector('.ai-chat-send-btn')

    ensureButton()
    initEvents()
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // PJAX 加载完成后重新初始化
  document.addEventListener('pjax:complete', () => {
    removeGlobalListeners()
    cache.initialized = false
    cache.dialog = null
    cache.mask = null
    cache.messages = null
    cache.inputWrap = null
    init()
  })
})()
