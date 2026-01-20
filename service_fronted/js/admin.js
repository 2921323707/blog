// 自动检测 API 基础路径
// - 线上（https://域名/...）：走同域 /api（由 Nginx 反代到后端）
// - 本地开发（http://localhost:4000/...）：默认后端在 :5000
const API_BASE = (() => {
    const { protocol, hostname, port, origin } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // 例如 Hexo 本地预览通常是 4000；后端通常是 5000
    if (isLocalhost && port && port !== '5000') {
        return `${protocol}//${hostname}:5000/api`;
    }

    // file:// 或某些环境下 origin 可能是 "null"
    if (!origin || origin === 'null') {
        return 'http://localhost:5000/api';
    }

    return `${origin}/api`;
})();

// 调试：确认 JavaScript 文件已加载
console.log('📦 admin.js 文件已加载');

// 全局状态
let tags = [];
let categories = [];
let uploadedImages = [];
let coverImageUrl = null;

// 主题切换
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('admin-theme') || 'light';

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('admin-theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded 事件触发，开始初始化...');
    try {
        initTheme();
        initForm();
        initTags();
        initCategories();
        initImageUpload();
        initCoverUpload();
        initPreview();
        initHelp();
        initImportMd();
        console.log('✅ 所有初始化函数执行完成');
    } catch (error) {
        console.error('❌ 初始化过程中发生错误:', error);
    }
});

// 表单初始化
function initForm() {
    // 设置默认日期为今天
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // 表单提交
    const form = document.getElementById('postForm');
    form.addEventListener('submit', handleSubmit);
}

// 标签管理
function initTags() {
    const tagInput = document.getElementById('tagInput');
    const tagsContainer = document.getElementById('tagsContainer');

    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = tagInput.value.trim();
            if (value && !tags.includes(value)) {
                tags.push(value);
                updateTagsDisplay();
                tagInput.value = '';
            }
        }
    });
}

function updateTagsDisplay() {
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <span class="remove" data-tag="${tag}" title="删除标签">×</span>
        </span>
    `).join('');

    tagsContainer.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.getAttribute('data-tag');
            tags = tags.filter(t => t !== tag);
            updateTagsDisplay();
        });
    });
}

// 分类管理
function initCategories() {
    const categoryInput = document.getElementById('categoryInput');
    const categoriesContainer = document.getElementById('categoriesContainer');

    categoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = categoryInput.value.trim();
            if (value && !categories.includes(value)) {
                categories.push(value);
                updateCategoriesDisplay();
                categoryInput.value = '';
            }
        }
    });
}

function updateCategoriesDisplay() {
    const categoriesContainer = document.getElementById('categoriesContainer');
    categoriesContainer.innerHTML = categories.map(cat => `
        <span class="category">
            ${cat}
            <span class="remove" data-category="${cat}" title="删除分类">×</span>
        </span>
    `).join('');

    categoriesContainer.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.target.getAttribute('data-category');
            categories = categories.filter(c => c !== cat);
            updateCategoriesDisplay();
        });
    });
}

// 封面图片上传
function initCoverUpload() {
    const coverUploadArea = document.getElementById('coverUploadArea');
    const coverFileInput = document.getElementById('coverFileInput');
    const coverPreview = document.getElementById('coverPreview');

    coverUploadArea.addEventListener('click', () => coverFileInput.click());

    coverUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        coverUploadArea.classList.add('dragover');
    });

    coverUploadArea.addEventListener('dragleave', () => {
        coverUploadArea.classList.remove('dragover');
    });

    coverUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        coverUploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            handleCoverUpload(files[0]);
        }
    });

    coverFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleCoverUpload(e.target.files[0]);
        }
    });
}

async function handleCoverUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'cover');

    const coverPreview = document.getElementById('coverPreview');
    coverPreview.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-secondary);">上传中...</div>';

    try {
        const response = await fetch(`${API_BASE}/posts/upload-image`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.errno === 0) {
            coverImageUrl = result.data.url;

            // 显示预览
            const imageSrc = `${window.location.origin}${coverImageUrl}`;
            const coverItem = document.createElement('div');
            coverItem.className = 'cover-preview-item';
            coverItem.innerHTML = `
                <img src="${imageSrc}" alt="封面预览" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'400\' height=\'200\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'18\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3E图片加载失败%3C/text%3E%3C/svg%3E'">
                <button type="button" class="remove" title="删除封面">×</button>
            `;
            coverPreview.innerHTML = '';
            coverPreview.appendChild(coverItem);

            // 添加删除按钮事件
            coverItem.querySelector('.remove').addEventListener('click', removeCover);
        } else {
            coverPreview.innerHTML = '';
            showStatus(`封面图片上传失败: ${result.errmsg}`, 'error');
        }
    } catch (error) {
        coverPreview.innerHTML = '';
        showStatus(`封面图片上传失败: ${error.message}`, 'error');
    }
}

function removeCover() {
    coverImageUrl = null;
    document.getElementById('coverPreview').innerHTML = '';
    document.getElementById('coverFileInput').value = '';
}

// 图片上传
function initImageUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
    });
}

async function handleFiles(files) {
    for (const file of files) {
        await uploadImage(file);
    }
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'content');

    const imagePreview = document.getElementById('imagePreview');

    // 显示上传中占位符
    const loadingItem = document.createElement('div');
    loadingItem.className = 'image-item';
    loadingItem.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary);">上传中...</div>';
    imagePreview.appendChild(loadingItem);

    try {
        const response = await fetch(`${API_BASE}/posts/upload-image`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.errno === 0) {
            const imageUrl = result.data.url;
            uploadedImages.push(imageUrl);

            // 移除加载占位符
            loadingItem.remove();

            // 显示预览
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            const imageSrc = `${window.location.origin}${imageUrl}`;
            imageItem.innerHTML = `
                <img src="${imageSrc}" alt="预览" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Crect fill=\'%23ddd\' width=\'120\' height=\'120\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'12\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3E加载失败%3C/text%3E%3C/svg%3E'">
                <button type="button" class="remove" title="删除图片">×</button>
            `;
            imagePreview.appendChild(imageItem);

            // 添加删除按钮事件
            imageItem.querySelector('.remove').addEventListener('click', () => {
                imageItem.remove();
                uploadedImages = uploadedImages.filter(url => url !== imageUrl);
            });

            // 自动插入到文章末尾
            const content = document.getElementById('content');
            const imageMarkdown = `\n\n![${file.name}](${imageUrl})\n`;
            content.value += imageMarkdown;
        } else {
            loadingItem.remove();
            showStatus(`图片上传失败: ${result.errmsg}`, 'error');
        }
    } catch (error) {
        loadingItem.remove();
        showStatus(`图片上传失败: ${error.message}`, 'error');
    }
}

// 表单提交
async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const status = document.getElementById('status');

    submitBtn.disabled = true;
    showStatus('正在提交...', 'info');

    const data = {
        title: document.getElementById('title').value.trim(),
        content: document.getElementById('content').value.trim(),
        tags: tags,
        categories: categories,
        cover: coverImageUrl || undefined,
        date: document.getElementById('date').value || undefined
    };

    try {
        const response = await fetch(`${API_BASE}/posts/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.errno === 0) {
            let message = `✅ ${result.data.message || '文章提交成功！'}`;
            if (result.warning) {
                message += `\n⚠️ ${result.warning}`;
            }
            showStatus(message, 'success');

            // 清空表单
            setTimeout(() => {
                document.getElementById('postForm').reset();
                tags = [];
                categories = [];
                uploadedImages = [];
                coverImageUrl = null;
                updateTagsDisplay();
                updateCategoriesDisplay();
                document.getElementById('imagePreview').innerHTML = '';
                document.getElementById('coverPreview').innerHTML = '';
                document.getElementById('date').valueAsDate = new Date();
                status.className = 'status';
                status.textContent = '';
            }, 5000);
        } else {
            showStatus(`❌ 提交失败: ${result.errmsg || '未知错误'}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ 提交失败: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// 状态提示
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.className = `status ${type}`;
    status.textContent = message;
    status.style.display = 'block';
}

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

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// 显示导入提示
function showImportNotice(message, type = 'info') {
    const notice = document.getElementById('importNotice');
    const noticeText = document.getElementById('importNoticeText');

    if (notice && noticeText) {
        noticeText.textContent = message;
        notice.className = `import-notice ${type}`;
        notice.style.display = 'block';

        // 3秒后自动隐藏
        setTimeout(() => {
            notice.style.display = 'none';
        }, 3000);
    }
}

