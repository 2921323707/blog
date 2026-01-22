// 编辑器功能（预览、帮助、导入）

// 预览功能
function initPreview() {
    const previewBtn = document.getElementById('previewBtn');
    const previewModal = document.getElementById('previewModal');
    const closePreview = document.getElementById('closePreview');
    const previewContent = document.getElementById('previewContent');

    // 配置 marked.js
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false,
        });
    }

    previewBtn.addEventListener('click', () => {
        const content = document.getElementById('content').value;
        const title = document.getElementById('title').value || '未命名文章';

        if (content.trim()) {
            // 渲染 Markdown 为 HTML
            let html = '';
            if (typeof marked !== 'undefined') {
                html = marked.parse(content);
            } else {
                html = '<p style="color: var(--color-error);">⚠️ Markdown 渲染库未加载，请刷新页面重试。</p><pre>' +
                    content.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                    '</pre>';
            }

            // 处理外部链接，使其在新标签页打开
            html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');

            // 显示预览
            previewContent.innerHTML = `<h1>${escapeHtml(title)}</h1>\n${html}`;
            previewModal.classList.add('show');
        } else {
            showStatus('请先输入文章内容', 'error');
        }
    });

    // 关闭预览
    closePreview.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    // 点击模态框外部关闭
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.classList.remove('show');
        }
    });

    // ESC 键关闭预览
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewModal.classList.contains('show')) {
            previewModal.classList.remove('show');
        }
    });

    // 工具栏预览按钮
    const toolbarPreview = document.querySelector('[data-action="preview"]');
    if (toolbarPreview) {
        toolbarPreview.addEventListener('click', () => {
            previewBtn.click();
        });
    }
}

// 帮助功能
function initHelp() {
    const helpModal = document.getElementById('helpModal');
    const closeHelp = document.getElementById('closeHelp');
    const toolbarHelp = document.querySelector('[data-action="help"]');

    if (toolbarHelp) {
        toolbarHelp.addEventListener('click', () => {
            helpModal.classList.add('show');
        });
    }

    closeHelp.addEventListener('click', () => {
        helpModal.classList.remove('show');
    });

    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.classList.contains('show')) {
            helpModal.classList.remove('show');
        }
    });
}

// 导入 Markdown 文件功能
function initImportMd() {
    const importBtn = document.getElementById('importMdBtn');
    const importInput = document.getElementById('importMdInput');

    importBtn.addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImportMd(file);
        }
        // 清空 input，允许重复选择同一文件
        e.target.value = '';
    });
}

// 处理导入的 Markdown 文件
function handleImportMd(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const parsed = parseMarkdownFile(content);

            // 填充表单
            if (parsed.title) {
                document.getElementById('title').value = parsed.title;
            }

            if (parsed.date) {
                // 转换日期格式 YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DD 为 YYYY-MM-DD
                const dateStr = parsed.date.split(' ')[0].split('T')[0];
                document.getElementById('date').value = dateStr;
            }

            // 填充标签
            if (parsed.tags && parsed.tags.length > 0) {
                tags = Array.isArray(parsed.tags) ? [...parsed.tags] : [parsed.tags];
                updateTagsDisplay();
            }

            // 填充分类
            if (parsed.categories && parsed.categories.length > 0) {
                categories = Array.isArray(parsed.categories) ? [...parsed.categories] : [parsed.categories];
                updateCategoriesDisplay();
            }

            // 填充封面（如果有）
            if (parsed.cover) {
                coverImageUrl = parsed.cover;
                // 显示封面预览
                const coverPreview = document.getElementById('coverPreview');
                const imageSrc = parsed.cover.startsWith('http')
                    ? parsed.cover
                    : `${window.location.origin}${parsed.cover}`;
                const coverItem = document.createElement('div');
                coverItem.className = 'cover-preview-item';
                coverItem.innerHTML = `
                    <img src="${imageSrc}" alt="封面预览" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'400\' height=\'200\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'18\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3E图片加载失败%3C/text%3E%3C/svg%3E'">
                    <button type="button" class="remove" title="删除封面">×</button>
                `;
                coverPreview.innerHTML = '';
                coverPreview.appendChild(coverItem);
                coverItem.querySelector('.remove').addEventListener('click', removeCover);
            }

            // 填充内容
            if (parsed.content) {
                document.getElementById('content').value = parsed.content;
            }

            // 显示成功提示
            showImportNotice(`✅ 成功导入文件: ${file.name}`, 'success');

            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('导入文件错误:', error);
            showImportNotice(`❌ 导入失败: ${error.message}`, 'error');
        }
    };

    reader.onerror = () => {
        showImportNotice('❌ 文件读取失败', 'error');
    };

    reader.readAsText(file, 'UTF-8');
}

// 解析 Markdown 文件（支持 front-matter）
function parseMarkdownFile(content) {
    const result = {
        title: '',
        date: '',
        tags: [],
        categories: [],
        cover: '',
        content: ''
    };

    // 检查是否有 front-matter（以 --- 开头）
    if (content.trim().startsWith('---')) {
        const parts = content.split('---');

        // 至少需要 3 个部分：---、front-matter、内容
        if (parts.length >= 3) {
            const frontMatter = parts[1].trim();
            result.content = parts.slice(2).join('---').trim();

            // 解析 front-matter（YAML 格式）
            const lines = frontMatter.split('\n');
            let currentKey = '';
            let currentValue = '';
            let inList = false;
            let listKey = '';

            for (const line of lines) {
                const trimmed = line.trim();

                // 跳过空行
                if (!trimmed) continue;

                // 检查是否是列表项（以 - 开头）
                if (trimmed.startsWith('-')) {
                    inList = true;
                    const value = trimmed.substring(1).trim();
                    if (listKey === 'tags') {
                        result.tags.push(value);
                    } else if (listKey === 'categories') {
                        result.categories.push(value);
                    }
                    continue;
                }

                // 检查是否是键值对
                if (trimmed.includes(':')) {
                    // 如果之前有列表，结束列表
                    if (inList) {
                        inList = false;
                        listKey = '';
                    }

                    const colonIndex = trimmed.indexOf(':');
                    currentKey = trimmed.substring(0, colonIndex).trim();
                    currentValue = trimmed.substring(colonIndex + 1).trim();

                    // 移除引号
                    if ((currentValue.startsWith('"') && currentValue.endsWith('"')) ||
                        (currentValue.startsWith("'") && currentValue.endsWith("'"))) {
                        currentValue = currentValue.slice(1, -1);
                    }

                    // 处理不同的键
                    switch (currentKey) {
                        case 'title':
                            result.title = currentValue;
                            break;
                        case 'date':
                            result.date = currentValue;
                            break;
                        case 'cover':
                            result.cover = currentValue;
                            break;
                        case 'tags':
                            if (currentValue) {
                                // 可能是单值或列表开始
                                if (currentValue.startsWith('[')) {
                                    // 数组格式 [tag1, tag2]
                                    try {
                                        result.tags = JSON.parse(currentValue);
                                    } catch {
                                        result.tags = [currentValue];
                                    }
                                } else {
                                    listKey = 'tags';
                                    inList = true;
                                    if (currentValue) {
                                        result.tags.push(currentValue);
                                    }
                                }
                            } else {
                                listKey = 'tags';
                                inList = true;
                            }
                            break;
                        case 'categories':
                            if (currentValue) {
                                if (currentValue.startsWith('[')) {
                                    try {
                                        result.categories = JSON.parse(currentValue);
                                    } catch {
                                        result.categories = [currentValue];
                                    }
                                } else {
                                    listKey = 'categories';
                                    inList = true;
                                    if (currentValue) {
                                        result.categories.push(currentValue);
                                    }
                                }
                            } else {
                                listKey = 'categories';
                                inList = true;
                            }
                            break;
                    }
                }
            }
        } else {
            // 没有正确的前置元数据，整个内容作为正文
            result.content = content.trim();
        }
    } else {
        // 没有 front-matter，整个内容作为正文
        result.content = content.trim();
    }

    return result;
}
