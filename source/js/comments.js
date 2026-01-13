(function () {
    // API地址配置：优先使用window.COMMENTS_API，其次使用window.COMMENTS_CDN_API，最后使用默认值
    // 支持通过CDN访问后端API
    const API_BASE = window.COMMENTS_API || window.COMMENTS_CDN_API || (window.location.protocol === 'https:'
        ? 'https://localhost:5000/api'
        : 'http://localhost:5000/api');

    // Emoji数据（常用表情）
    const EMOJI_DATA = {
        'smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
        'gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
        'hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️'],
        'objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🪆', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓']
    };

    // 颜文字数据
    const KAOMOJI_DATA = [
        '(´▽｀)', '(￣▽￣)', '(～￣▽￣)～', '(￣y▽￣)╭', '(╯▽╰)', '(´∀｀)', '(￣ε￣)', '(￣3￣)', '(￣0￣)', '(￣.￣)',
        '(￣へ￣)', '(￣︿￣)', '(￣︶￣)', '(￣ω￣)', '(￣△￣)', '(￣▽￣)', '(￣∀￣)', '(￣ー￣)', '(￣o￣)', '(￣◇￣)',
        '╮(╯▽╰)╭', '╮(╯_╰)╭', '╮(﹀_﹀")╭', '╮(╯◇╰)╭', '╮(╯﹏╰)╭', '╮(╯3╰)╭', '╮(╯▽╰)╭', '╮(╯∀╰)╭', '╮(╯ε╰)╭', '╮(╯ω╰)╭',
        'o(╥﹏╥)o', 'o(≧口≦)o', 'o(≧∇≦)o', 'o(≧▽≦)o', 'o(≧v≦)o', 'o(≧ω≦)o', 'o(≧∀≦)o', 'o(≧ε≦)o', 'o(≧◇≦)o', 'o(≧﹏≦)o',
        '(╯°□°）╯', '(╯°Д°）╯', '(╯°▽°）╯', '(╯°ω°）╯', '(╯°∀°）╯', '(╯°ε°）╯', '(╯°◇°）╯', '(╯°﹏°）╯', '(╯°3°）╯', '(╯°▽°）╯',
        '┐(´д｀)┌', '┐(´∀｀)┌', '┐(´▽｀)┌', '┐(´ω｀)┌', '┐(´ε｀)┌', '┐(´◇｀)┌', '┐(´﹏｀)┌', '┐(´3｀)┌', '┐(´▽｀)┌', '┐(´∀｀)┌',
        '_(:з」∠)_', '_(:3」∠)_', '_(:з」∠)_', '_(:з」∠)_', '_(:з」∠)_', '_(:з」∠)_', '_(:з」∠)_', '_(:з」∠)_', '_(:з」∠)_', '_(:з」∠)_',
        'ヽ(´▽｀)ノ', 'ヽ(´∀｀)ノ', 'ヽ(´ω｀)ノ', 'ヽ(´ε｀)ノ', 'ヽ(´◇｀)ノ', 'ヽ(´﹏｀)ノ', 'ヽ(´3｀)ノ', 'ヽ(´▽｀)ノ', 'ヽ(´∀｀)ノ', 'ヽ(´ω｀)ノ',
        '٩(◕‿◕)۶', '٩(◕‿◕｡)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶', '٩(◕‿◕)۶',
        '(๑•̀ㅂ•́)و✧', '(๑•̀ω•́)و✧', '(๑•̀∀•́)و✧', '(๑•̀ε•́)و✧', '(๑•̀◇•́)و✧', '(๑•̀﹏•́)و✧', '(๑•̀3•́)و✧', '(๑•̀▽•́)و✧', '(๑•̀∀•́)و✧', '(๑•̀ω•́)و✧',
        '♪(´▽｀)', '♪(´∀｀)', '♪(´ω｀)', '♪(´ε｀)', '♪(´◇｀)', '♪(´﹏｀)', '♪(´3｀)', '♪(´▽｀)', '♪(´∀｀)', '♪(´ω｀)',
        '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)', '(ノへ￣、)',
        'ヾ(´▽｀)ノ', 'ヾ(´∀｀)ノ', 'ヾ(´ω｀)ノ', 'ヾ(´ε｀)ノ', 'ヾ(´◇｀)ノ', 'ヾ(´﹏｀)ノ', 'ヾ(´3｀)ノ', 'ヾ(´▽｀)ノ', 'ヾ(´∀｀)ノ', 'ヾ(´ω｀)ノ',
        '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)', '(｡◕‿◕｡)',
        'ヽ(´▽｀)ノ', 'ヽ(´∀｀)ノ', 'ヽ(´ω｀)ノ', 'ヽ(´ε｀)ノ', 'ヽ(´◇｀)ノ', 'ヽ(´﹏｀)ノ', 'ヽ(´3｀)ノ', 'ヽ(´▽｀)ノ', 'ヽ(´∀｀)ノ', 'ヽ(´ω｀)ノ',
        '(´･ω･`)', '(´･∀･`)', '(´･ε･`)', '(´･◇･`)', '(´･﹏･`)', '(´･3･`)', '(´･▽･`)', '(´･∀･`)', '(´･ω･`)', '(´･ε･`)',
        '（´∀｀）', '（´▽｀）', '（´ω｀）', '（´ε｀）', '（´◇｀）', '（´﹏｀）', '（´3｀）', '（´▽｀）', '（´∀｀）', '（´ω｀）',
        '(´・ω・`)', '(´・∀・`)', '(´・ε・`)', '(´・◇・`)', '(´・﹏・`)', '(´・3・`)', '(´・▽・`)', '(´・∀・`)', '(´・ω・`)', '(´・ε・`)',
        '（´∀｀）', '（´▽｀）', '（´ω｀）', '（´ε｀）', '（´◇｀）', '（´﹏｀）', '（´3｀）', '（´▽｀）', '（´∀｀）', '（´ω｀）'
    ];

    const twikoo = {
        init: function (options) {
            // 支持传入DOM元素或选择器字符串
            let el = options.el;
            if (typeof el === 'string') {
                el = document.querySelector(el);
            }

            // 如果找不到元素，尝试查找默认的twikoo-wrap
            if (!el) {
                el = document.querySelector('#twikoo-wrap');
            }

            if (!el) {
                console.warn('评论容器 #twikoo-wrap 未找到，评论系统无法初始化');
                return;
            }

            // 确保el是有效的DOM元素
            if (el === document || el === document.body || el === document.documentElement) {
                console.error('评论容器不能是document或body元素，请检查模板配置');
                return;
            }

            this.el = el;
            this.path = options.path || window.location.pathname;
            this.onCommentLoaded = options.onCommentLoaded;
            this.render();
        },

        render: function () {
            fetch(`${API_BASE}/comments?url=${encodeURIComponent(this.path)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.errno === 0) {
                        this.renderComments(data.data);
                        this.renderForm();
                        if (this.onCommentLoaded) this.onCommentLoaded();
                    }
                })
                .catch(err => {
                    console.error('加载评论失败:', err);
                    // 只更新评论区域，不影响页面其他内容
                    if (this.el && this.el.nodeType === 1 && this.el !== document && this.el !== document.body) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'comment-error';
                        errorDiv.textContent = '评论加载失败，请稍后重试';
                        this.el.innerHTML = '';
                        this.el.appendChild(errorDiv);
                    }
                });
        },

        renderComments: function (comments) {
            if (!this.el || this.el === document || this.el === document.body) {
                console.error('无法渲染评论：容器无效');
                return;
            }

            // 将所有评论平铺显示，按时间排序
            const flatComments = this.flattenComments(comments);
            
            // 保存所有评论数据，用于加载更多
            this.allComments = flatComments;
            this.displayedCount = 0;
            
            // 初始显示前5条评论
            const INITIAL_COUNT = 5;
            const commentsToShow = flatComments.slice(0, INITIAL_COUNT);
            this.displayedCount = commentsToShow.length;
            
            const html = commentsToShow.map(c => this.commentToHtml(c, comments)).join('');
            
            // 生成加载更多按钮（如果还有更多评论）
            const loadMoreBtn = flatComments.length > INITIAL_COUNT 
                ? `<div class="tk-load-more-container">
                    <button class="tk-load-more-btn" onclick="twikoo.loadMoreComments()">
                        加载更多评论 (${flatComments.length - INITIAL_COUNT}条)
                    </button>
                   </div>`
                : '';

            // 安全地更新容器内容
            const wrapper = document.createElement('div');
            wrapper.className = 'twikoo-comments';
            wrapper.innerHTML = `
        <div class="tk-comments-container">${html}</div>
        ${loadMoreBtn}
        <div class="tk-comments-form"></div>
      `;

            // 只清空并更新容器内容，不影响页面其他部分
            if (this.el && this.el.nodeType === 1) { // 确保是元素节点
                this.el.innerHTML = '';
                this.el.appendChild(wrapper);
            }
        },

        flattenComments: function (comments) {
            // 创建评论映射，方便查找父评论
            const commentMap = {};
            comments.forEach(c => {
                commentMap[c.id] = c;
            });

            // 将所有评论按创建时间排序（降序，最新的在最上面）
            return comments.sort((a, b) => {
                const dateA = new Date(a.created);
                const dateB = new Date(b.created);
                return dateB - dateA;
            }).map(c => {
                // 如果这是回复，添加父评论信息
                if (c.pid && commentMap[c.pid]) {
                    c.parentComment = commentMap[c.pid];
                }
                return c;
            });
        },

        commentToHtml: function (c, allComments) {
            // 调整时区，加上8小时
            const dateObj = new Date(c.created);
            dateObj.setHours(dateObj.getHours() + 8);
            const date = dateObj.toLocaleString('zh-CN');
            const avatar = this.getAvatar(c.mail || '');
            const nick = c.nick || '匿名用户';
            const isReply = c.pid && c.parentComment;
            const parentNick = isReply ? (c.parentComment.nick || '匿名用户') : '';
            
            return `
        <div class="tk-comment" data-id="${c.id}">
          <div class="tk-avatar">
            <img src="${avatar}" alt="${this.escapeHtml(nick)}">
          </div>
          <div class="tk-main">
            <div class="tk-header">
              <span class="tk-nick">${this.escapeHtml(nick)}</span>
              ${isReply ? `<span class="tk-reply-to">回复 <span class="tk-reply-nick">@${this.escapeHtml(parentNick)}</span></span>` : ''}
              <span class="tk-date">${date}</span>
            </div>
            <div class="tk-content">${this.parseContent(c.comment)}</div>
            <div class="tk-actions">
              <span class="tk-action" onclick="twikoo.reply('${c.id}')">回复</span>
            </div>
          </div>
        </div>
      `;
        },

        parseContent: function (text) {
            if (!text) return '';
            // 转义HTML，但保留换行
            let html = this.escapeHtml(text);
            // 将换行符转换为<br>
            html = html.replace(/\n/g, '<br>');
            return html;
        },

        getAvatar: function (mail) {
            // 使用通用默认头像（SVG data URI）
            // 生成一个简单的圆形默认头像
            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e9ecef'/%3E%3Cpath d='M20 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-2 3.5-2 1.33 0 2.5.67 3.5 2-.67-2.67-2.33-4-5-4zm-5 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-5 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z' fill='%23999'/%3E%3C/svg%3E";
            return defaultAvatar;
        },

        md5: function (str) {
            return btoa(str).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        },

        renderForm: function (pid) {
            if (!this.el || this.el === document || this.el === document.body) {
                return;
            }

            let formEl = this.el.querySelector('.tk-comments-form');
            if (!formEl) {
                formEl = document.createElement('div');
                formEl.className = 'tk-comments-form';
                const wrapper = this.el.querySelector('.twikoo-comments') || this.el;
                if (wrapper && wrapper.nodeType === 1) {
                    wrapper.appendChild(formEl);
                }
            }

            const replyHint = pid ? '<div class="reply-hint">正在回复评论...</div>' : '';
            formEl.innerHTML = `
        ${replyHint}
        <div class="tk-form">
          <div class="tk-emoji-picker">
            <button type="button" class="tk-emoji-btn" onclick="twikoo.toggleEmojiPanel('emoji')">emoji</button>
            <button type="button" class="tk-emoji-btn" onclick="twikoo.toggleEmojiPanel('kaomoji')">颜文字</button>
            <div class="tk-emoji-panel" id="tk-emoji-panel">
              <div id="tk-emoji-content"></div>
            </div>
          </div>
          <textarea id="tk-comment" placeholder="写下你的评论..." required></textarea>
          <div class="tk-form-actions">
            ${pid ? `<button type="button" class="tk-btn-cancel" onclick="twikoo.cancelReply()">取消</button>` : ''}
            <button type="button" class="tk-btn-submit" onclick="twikoo.submit('${pid || ''}')">提交评论</button>
          </div>
        </div>
      `;
            this.replyingTo = pid;
            this.currentEmojiType = null;
        },

        toggleEmojiPanel: function (type) {
            const panel = document.getElementById('tk-emoji-panel');
            const content = document.getElementById('tk-emoji-content');
            
            if (!panel || !content) {
                console.error('Emoji panel elements not found');
                return;
            }
            
            if (this.currentEmojiType === type && panel.classList.contains('active')) {
                panel.classList.remove('active');
                this.currentEmojiType = null;
                return;
            }

            this.currentEmojiType = type;
            panel.classList.add('active');

            if (type === 'emoji') {
                let html = '';
                Object.keys(EMOJI_DATA).forEach(category => {
                    html += `<div class="tk-emoji-category">
                        <div class="tk-emoji-category-title">${category}</div>
                        <div class="tk-emoji-grid">`;
                    EMOJI_DATA[category].forEach(emoji => {
                        // 转义单引号，避免HTML注入
                        const safeEmoji = emoji.replace(/'/g, "\\'");
                        html += `<div class="tk-emoji-item" onclick="twikoo.insertEmoji('${safeEmoji}')">${emoji}</div>`;
                    });
                    html += `</div></div>`;
                });
                content.innerHTML = html;
            } else if (type === 'kaomoji') {
                let html = '<div class="tk-emoji-category"><div class="tk-emoji-category-title">颜文字</div><div class="tk-kaomoji-grid">';
                KAOMOJI_DATA.forEach(kaomoji => {
                    // 转义单引号，避免HTML注入
                    const safeKaomoji = kaomoji.replace(/'/g, "\\'");
                    html += `<div class="tk-kaomoji-item" onclick="twikoo.insertEmoji('${safeKaomoji}')">${kaomoji}</div>`;
                });
                html += '</div></div>';
                content.innerHTML = html;
            }
        },

        insertEmoji: function (emoji) {
            const textarea = document.getElementById('tk-comment');
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                textarea.value = text.substring(0, start) + emoji + text.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
                textarea.focus();
            }
            // 关闭面板
            const panel = document.getElementById('tk-emoji-panel');
            if (panel) {
                panel.classList.remove('active');
                this.currentEmojiType = null;
            }
        },

        reply: function (pid) {
            this.renderForm(pid);
            document.getElementById('tk-comment').focus();
        },

        cancelReply: function () {
            this.renderForm();
        },

        submit: function (pid) {
            const comment = document.getElementById('tk-comment').value.trim();

            if (!comment) {
                alert('请输入评论内容');
                return;
            }

            // 生成随机昵称和邮箱（因为只保留评论内容字段）
            const randomNick = '用户' + Math.random().toString(36).substr(2, 6);
            const randomMail = Math.random().toString(36).substr(2, 10) + '@example.com';

            fetch(`${API_BASE}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: this.path,
                    nick: randomNick,
                    mail: randomMail,
                    link: '',
                    comment: comment,
                    pid: pid || null
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.errno === 0) {
                        // 清空输入框
                        document.getElementById('tk-comment').value = '';
                        this.render();
                    } else {
                        alert('提交失败: ' + data.errmsg);
                    }
                })
                .catch(err => {
                    console.error('提交评论失败:', err);
                    alert('提交失败，请稍后重试');
                });
        },

        getCommentsCount: function (options) {
            return fetch(`${API_BASE}/comments/count`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    urls: options.urls,
                    includeReply: options.includeReply || false
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.errno === 0) {
                        return data.data.map(item => ({ count: item.count }));
                    }
                    throw new Error(data.errmsg || '获取评论数失败');
                });
        },

        getRecentComments: function (options) {
            const params = new URLSearchParams({
                pageSize: options.pageSize || 10,
                includeReply: options.includeReply || false
            });
            return fetch(`${API_BASE}/comments/recent?${params}`)
                .then(res => res.json())
                .then(data => {
                    if (data.errno === 0) {
                        // 添加avatar字段以兼容主题
                        return data.data.map(c => ({
                            ...c,
                            avatar: this.getAvatar(c.mail || '')
                        }));
                    }
                    throw new Error(data.errmsg || '获取最新评论失败');
                });
        },

        loadMoreComments: function () {
            if (!this.allComments || !this.el) {
                return;
            }

            const LOAD_MORE_COUNT = 5; // 每次加载5条
            const container = this.el.querySelector('.tk-comments-container');
            const loadMoreContainer = this.el.querySelector('.tk-load-more-container');
            
            if (!container) {
                return;
            }

            // 计算需要加载的评论
            const remainingCount = this.allComments.length - this.displayedCount;
            const loadCount = Math.min(LOAD_MORE_COUNT, remainingCount);
            const commentsToLoad = this.allComments.slice(this.displayedCount, this.displayedCount + loadCount);
            
            // 渲染新评论
            const newHtml = commentsToLoad.map(c => this.commentToHtml(c, this.allComments)).join('');
            container.insertAdjacentHTML('beforeend', newHtml);
            
            // 更新已显示数量
            this.displayedCount += loadCount;
            
            // 更新或移除加载更多按钮
            if (this.displayedCount >= this.allComments.length) {
                // 所有评论已加载完，移除按钮
                if (loadMoreContainer) {
                    loadMoreContainer.remove();
                }
            } else {
                // 更新按钮文本
                if (loadMoreContainer) {
                    const btn = loadMoreContainer.querySelector('.tk-load-more-btn');
                    if (btn) {
                        const remaining = this.allComments.length - this.displayedCount;
                        btn.textContent = `加载更多评论 (${remaining}条)`;
                    }
                }
            }
        },

        escapeHtml: function (text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // 点击外部关闭emoji面板
    document.addEventListener('click', function (e) {
        const panel = document.getElementById('tk-emoji-panel');
        const picker = e.target.closest('.tk-emoji-picker');
        if (panel && panel.classList.contains('active')) {
            // 如果点击的不是面板内部，也不是按钮，则关闭面板
            if (!panel.contains(e.target) && !e.target.closest('.tk-emoji-btn') && !picker) {
                panel.classList.remove('active');
                if (window.twikoo) {
                    window.twikoo.currentEmojiType = null;
                }
            }
        }
    });

    window.twikoo = twikoo;
})();
