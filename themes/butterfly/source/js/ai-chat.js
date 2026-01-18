(() => {
  const getApiBase = () => {
    const { origin, hostname, port } = window.location

    // 本地开发：Hexo(4000) + Flask(5000)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '5000') {
      return `http://${hostname}:5000/api`
    }

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
    messages: '#ai-chat-messages'
  }

  const ensureRightsideButton = () => {
    // Prefer adding into Butterfly rightside toolbar for consistent UI
    const rightsideShow = document.querySelector('#rightside #rightside-config-show')
    if (!rightsideShow) return null

    let btn = document.getElementById('ai-chat-btn')
    if (btn) return btn

    btn = document.createElement('button')
    btn.id = 'ai-chat-btn'
    btn.type = 'button'
    btn.title = '看板娘'
    btn.innerHTML = '<i class="fas fa-robot"></i>'

    // Insert above "go-up" if possible
    const goUp = document.getElementById('go-up')
    if (goUp && goUp.parentElement === rightsideShow) {
      rightsideShow.insertBefore(btn, goUp)
    } else {
      rightsideShow.appendChild(btn)
    }
    return btn
  }

  const animateIn = (el, animation) => {
    if (!el) return
    if (window.btf && typeof window.btf.animateIn === 'function') return window.btf.animateIn(el, animation)
    el.style.display = 'block'
  }

  const animateOut = (el, animation) => {
    if (!el) return
    if (window.btf && typeof window.btf.animateOut === 'function') return window.btf.animateOut(el, animation)
    el.style.display = 'none'
  }

  const lockScroll = () => {
    if (window.btf?.overflowPaddingR?.add) return window.btf.overflowPaddingR.add()
    document.body.style.overflow = 'hidden'
  }

  const unlockScroll = () => {
    if (window.btf?.overflowPaddingR?.remove) return window.btf.overflowPaddingR.remove()
    document.body.style.overflow = ''
  }

  const appendMsg = (container, role, text) => {
    const item = document.createElement('div')
    item.className = `ai-chat-msg ai-chat-msg--${role}`

    const bubble = document.createElement('div')
    bubble.className = 'ai-chat-bubble'
    bubble.textContent = text

    item.appendChild(bubble)
    container.appendChild(item)
    container.scrollTop = container.scrollHeight
  }

  const show = () => {
    const dialog = document.querySelector(SELECTORS.dialog)
    const mask = document.querySelector(SELECTORS.mask)
    const input = document.querySelector(SELECTORS.input)
    animateIn(dialog, 'to_show 0.5s')
    animateIn(mask, 'to_show 0.5s')
    lockScroll()
    input && input.focus()
  }

  const hide = () => {
    const dialog = document.querySelector(SELECTORS.dialog)
    const mask = document.querySelector(SELECTORS.mask)
    animateOut(dialog, 'to_hide 0.5s')
    animateOut(mask, 'to_hide 0.5s')
    unlockScroll()
  }

  const bindOnce = () => {
    const dialog = document.querySelector(SELECTORS.dialog)
    const mask = document.querySelector(SELECTORS.mask)
    const close = document.querySelector(SELECTORS.close)
    const form = document.querySelector(SELECTORS.form)
    const input = document.querySelector(SELECTORS.input)
    const messages = document.querySelector(SELECTORS.messages)

    if (!dialog || !mask || !form || !input || !messages) return
    if (dialog.dataset.bound === '1') return
    dialog.dataset.bound = '1'

    // Initial state
    dialog.style.display = 'none'
    mask.style.display = 'none'

    const btn = ensureRightsideButton()
    const onOpen = () => show()
    const onClose = () => hide()

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
      if (e.key === 'Escape') onClose()
    })

    addListener(form, 'submit', async (e) => {
      e.preventDefault()
      const q = (input.value || '').trim()
      if (!q) return

      input.value = ''
      appendMsg(messages, 'user', q)
      appendMsg(messages, 'bot', '思考中…')

      const loadingEl = messages.lastElementChild

      try {
        const resp = await fetch(`${API_BASE}/ai/mascot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, page_url: window.location.href })
        })

        const result = await resp.json()
        if (!resp.ok || result.errno !== 0) {
          const msg = result?.errmsg || `请求失败（HTTP ${resp.status}）`
          loadingEl && loadingEl.remove()
          appendMsg(messages, 'bot', `出错了：${msg}`)
          return
        }

        const answer = result?.data?.answer || ''
        loadingEl && loadingEl.remove()
        appendMsg(messages, 'bot', answer || '（没有返回内容）')
      } catch (err) {
        loadingEl && loadingEl.remove()
        appendMsg(messages, 'bot', `出错了：${err?.message || String(err)}`)
      }
    })
  }

  document.addEventListener('DOMContentLoaded', bindOnce)
  document.addEventListener('pjax:complete', bindOnce)
})()

