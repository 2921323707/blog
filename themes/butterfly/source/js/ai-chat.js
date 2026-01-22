(() => {
  const getApiBase = () => {
    const { origin, hostname, port } = window.location

    // 本地开发：Hexo(4000) + Flask(5000)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '5000') {
      return `http://${hostname}:5000/api`
    }

    // file:// 或某些环境下 origin 可能是 "null"
    if (!origin || origin === 'null') return 'http://localhost:5000/api'

    // 生产/同源：走当前站点的 HTTPS，再由 Nginx 反代到 Flask(5000)
    return `${origin}/api`
  }

  const API_BASE = getApiBase()

  const SELECTORS = {
    dialog: '#ai-chat-dialog',
    mask: '#ai-chat-mask',
    close: '#ai-chat-close',
    form: '#ai-chat-form',
    input: '#ai-chat-input',
    send: '#ai-chat-send',
    messages: '#ai-chat-messages'
  }

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches

  // 移动端键盘弹起时：参考微信/Telegram 方案，使用 visualViewport 适配
  const updateMobileViewportVars = (dialogEl) => {
    const dialog = dialogEl || document.querySelector(SELECTORS.dialog)
    if (!dialog) return

    // 只在移动端启用，避免影响桌面端定位（右下角悬浮）
    if (!isMobile()) {
      dialog.style.removeProperty('--ai-chat-height')
      return
    }

    // 使用 visualViewport API（支持现代浏览器）
    // 参考：微信小程序、Telegram、ChatGPT 的移动端适配方案
    const vv = window.visualViewport

    if (vv) {
      // 获取动态视口高度（排除键盘）
      const dvh = vv.height
      // 设置 CSS 变量，配合 dvh 使用
      dialog.style.setProperty('--ai-chat-height', `${dvh}px`)
    } else {
      // 降级方案：使用 innerHeight
      dialog.style.setProperty('--ai-chat-height', `${window.innerHeight}px`)
    }
  }

  const ensureLauncherButton = () => {
    let btn = document.getElementById('ai-chat-btn')
    if (btn) return btn

    // Prefer adding into Butterfly rightside toolbar for consistent UI
    const rightsideShow = document.querySelector('#rightside #rightside-config-show')
    btn = document.createElement('button')
    btn.id = 'ai-chat-btn'
    btn.type = 'button'
    btn.title = '看板娘'
    btn.innerHTML = '<i class="fas fa-robot" aria-hidden="true"></i>'

    if (rightsideShow) {
      // Insert above "go-up" if possible
      const goUp = document.getElementById('go-up')
      if (goUp && goUp.parentElement === rightsideShow) {
        rightsideShow.insertBefore(btn, goUp)
      } else {
        rightsideShow.appendChild(btn)
      }
      return btn
    }

    // Fallback: on some mobile layouts rightside may be unavailable
    btn.className = 'ai-chat-float-btn'
    document.body.appendChild(btn)
    return btn
  }

  const animateIn = (el, animation) => {
    if (!el) return
    if (window.btf && typeof window.btf.animateIn === 'function') {
      window.btf.animateIn(el, animation)
    } else {
      el.style.display = 'block'
    }
  }

  const animateOut = (el, animation) => {
    if (!el) return
    if (window.btf && typeof window.btf.animateOut === 'function') {
      window.btf.animateOut(el, animation)
      // 确保 btf 动画完成后真正隐藏元素
      setTimeout(() => {
        el.style.display = 'none'
      }, 500)
    } else {
      el.style.display = 'none'
    }
  }

  const lockScroll = () => {
    if (window.btf?.overflowPaddingR?.add) return window.btf.overflowPaddingR.add()
    document.body.style.overflow = 'hidden'
  }

  const unlockScroll = () => {
    if (window.btf?.overflowPaddingR?.remove) return window.btf.overflowPaddingR.remove()
    document.body.style.overflow = ''
  }

  const safeText = (v) => (v == null ? '' : String(v))

  const isNearBottom = (el, threshold = 120) => {
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  const scrollToBottom = (el) => {
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const appendMsg = (container, role, text) => {
    const stick = isNearBottom(container)
    const item = document.createElement('div')
    item.className = `ai-chat-msg ai-chat-msg--${role}`

    const bubble = document.createElement('div')
    bubble.className = 'ai-chat-bubble'
    bubble.textContent = text

    item.appendChild(bubble)
    container.appendChild(item)
    if (stick) scrollToBottom(container)
    return item
  }

  const appendBotMsgWithCitations = (container, text, citations) => {
    const stick = isNearBottom(container)
    const item = document.createElement('div')
    item.className = 'ai-chat-msg ai-chat-msg--bot'

    const bubble = document.createElement('div')
    bubble.className = 'ai-chat-bubble'
    bubble.textContent = safeText(text)

    item.appendChild(bubble)

    const cites = Array.isArray(citations) ? citations : []
    if (cites.length) {
      const citeWrap = document.createElement('details')
      citeWrap.className = 'ai-chat-citations'

      const summary = document.createElement('summary')
      summary.className = 'ai-chat-citations__summary'
      summary.textContent = `引用来源（${cites.length}）`
      citeWrap.appendChild(summary)

      const list = document.createElement('ol')
      list.className = 'ai-chat-citations__list'

      cites.forEach((c) => {
        const li = document.createElement('li')
        li.className = 'ai-chat-citations__item'

        const row = document.createElement('div')
        row.className = 'ai-chat-citations__row'

        const a = document.createElement('a')
        a.className = 'ai-chat-citations__link'
        a.href = safeText(c?.url)
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.textContent = safeText(c?.title || c?.url || '来源')
        row.appendChild(a)

        li.appendChild(row)

        list.appendChild(li)
      })

      citeWrap.appendChild(list)
      item.appendChild(citeWrap)
    }

    container.appendChild(item)
    if (stick) scrollToBottom(container)
    return item
  }

  const setAriaHidden = (el, hidden) => {
    if (!el) return
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false')
  }

  const show = ({ dialog, mask, input, messages }) => {
    // 防止重复显示
    if (dialog && dialog.style.display !== 'none') return

    animateIn(dialog, 'to_show 0.5s')
    animateIn(mask, 'to_show 0.5s')
    // 保证 flex 布局生效（消息区/输入区才能正确占满并滚动）
    if (dialog) dialog.style.display = 'flex'
    if (mask) mask.style.display = 'block'
    setAriaHidden(dialog, false)
    setAriaHidden(mask, false)
    lockScroll()
    updateMobileViewportVars(dialog)

    // 首次打开：给一个轻量引导，增强"可用性认知"
    if (messages && messages.children.length === 0 && messages.dataset.greeted !== '1') {
      messages.dataset.greeted = '1'
      appendMsg(messages, 'bot', '你好，我是嘟嘟可。你可以直接问我"这篇文章讲了什么/某个概念在哪里提到/推荐相关阅读"等。')
    }

    input && input.focus()
    // 移动端键盘弹出可能有延迟，延迟更新确保高度正确
    setTimeout(() => updateMobileViewportVars(dialog), 100)
    setTimeout(() => updateMobileViewportVars(dialog), 300)
  }

  const hide = ({ dialog, mask, input, send }) => {
    // 防止重复隐藏
    if (dialog && dialog.style.display === 'none') return

    // 立即设置 display 为 none，防止动画导致的再次显示
    if (dialog) dialog.style.display = 'none'
    if (mask) mask.style.display = 'none'

    animateOut(dialog, 'to_hide 0.5s')
    animateOut(mask, 'to_hide 0.5s')
    setAriaHidden(dialog, true)
    setAriaHidden(mask, true)
    unlockScroll()
    updateMobileViewportVars(dialog)
    input && input.blur()
    if (send) send.disabled = false
  }

  const bindOnce = () => {
    const dialog = document.querySelector(SELECTORS.dialog)
    const mask = document.querySelector(SELECTORS.mask)
    const close = document.querySelector(SELECTORS.close)
    const form = document.querySelector(SELECTORS.form)
    const input = document.querySelector(SELECTORS.input)
    const send = document.querySelector(SELECTORS.send)
    const messages = document.querySelector(SELECTORS.messages)

    if (!dialog || !mask || !form || !input || !messages) return
    if (dialog.dataset.bound === '1') return
    dialog.dataset.bound = '1'

    // Initial state
    dialog.style.display = 'none'
    mask.style.display = 'none'
    setAriaHidden(dialog, true)
    setAriaHidden(mask, true)

    // 键盘/地址栏变化会改变 visual viewport；只绑定一次即可
    const bindViewportOnce = () => {
      if (dialog.dataset.vvBound === '1') return
      dialog.dataset.vvBound = '1'

      const onChange = () => {
        // 只有打开时才需要频繁更新
        if (dialog.style.display === 'none') return
        updateMobileViewportVars(dialog)
      }

      const vv = window.visualViewport
      if (vv) {
        // 监听 visualViewport 变化事件
        vv.addEventListener('resize', onChange, { passive: true })
        vv.addEventListener('scroll', onChange, { passive: true })
      }

      // 降级：监听窗口变化
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          updateMobileViewportVars(dialog)
          // 横竖屏切换后，滚动到消息底部
          if (messages) scrollToBottom(messages)
        }, 150)
      })

      window.addEventListener('resize', () => {
        setTimeout(onChange, 100)
      })

      // 键盘弹出/收起时的处理
      if (input) {
        input.addEventListener('focus', () => {
          setTimeout(onChange, 50)
        }, { passive: true })

        input.addEventListener('blur', () => {
          setTimeout(onChange, 100)
        }, { passive: true })
      }

      // 首次也更新一次（避免初始高度取错）
      updateMobileViewportVars(dialog)
    }

    bindViewportOnce()

    const btn = ensureLauncherButton()

    let sending = false
    let inFlight = null

    const setSending = (v) => {
      sending = v
      if (input) input.disabled = v
      if (send) send.disabled = v
    }

    const abortInFlight = () => {
      if (!inFlight) return
      try {
        inFlight.abort()
      } catch (_) {}
      inFlight = null
    }

    const onOpen = () => show({ dialog, mask, input, messages })
    const onClose = () => {
      abortInFlight()
      setSending(false)
      if (messages) {
        messages.querySelectorAll('[data-loading="1"]').forEach((el) => el.remove())
      }
      hide({ dialog, mask, input, send })
    }

    const addListener = (el, evt, fn, opt) => {
      if (!el) return
      if (window.btf && typeof window.btf.addEventListenerPjax === 'function') {
        window.btf.addEventListenerPjax(el, evt, fn, opt || false)
      } else {
        el.addEventListener(evt, fn, opt || false)
      }
    }

    addListener(btn, 'click', onOpen)
    addListener(close, 'click', onClose)
    addListener(mask, 'click', onClose)

    addListener(window, 'keydown', (e) => {
      if (e.key !== 'Escape') return
      if (dialog.style.display === 'none') return
      onClose()
    })

    addListener(form, 'submit', async (e) => {
      e.preventDefault()
      if (sending) return
      const q = (input.value || '').trim()
      if (!q) return

      input.value = ''
      appendMsg(messages, 'user', q)
      const loadingEl = appendMsg(messages, 'bot', '思考中…')
      if (loadingEl) loadingEl.dataset.loading = '1'
      setSending(true)

      try {
        abortInFlight()
        inFlight = new AbortController()
        const resp = await fetch(`${API_BASE}/ai/mascot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, page_url: window.location.href }),
          signal: inFlight.signal
        })

        const result = await resp.json()
        if (!resp.ok || result.errno !== 0) {
          const msg = result?.errmsg || `请求失败（HTTP ${resp.status}）`
          loadingEl && loadingEl.remove()
          appendMsg(messages, 'bot', `出错了：${msg}`)
          return
        }

        const answer = result?.data?.answer || ''
        const citations = result?.data?.citations || []
        loadingEl && loadingEl.remove()
        appendBotMsgWithCitations(messages, answer || '（没有返回内容）', citations)
      } catch (err) {
        if (err?.name === 'AbortError') {
          loadingEl && loadingEl.remove()
          return
        }
        loadingEl && loadingEl.remove()
        appendMsg(messages, 'bot', `出错了：${err?.message || String(err)}`)
      } finally {
        inFlight = null
        setSending(false)
      }
    })
  }

  document.addEventListener('DOMContentLoaded', bindOnce)
  document.addEventListener('pjax:complete', bindOnce)
})()
