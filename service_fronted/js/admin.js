// 全局错误处理 - 捕获并忽略主题脚本的错误
window.addEventListener('error', function (e) {
    // 如果是 page-events.js 或其他主题脚本的错误，忽略它
    if (e.filename && (e.filename.includes('page-events') ||
        e.filename.includes('main.js') ||
        e.filename.includes('utils.js') ||
        e.filename.includes('butterfly'))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return true;
    }
    // 如果错误信息包含 length 相关的主题脚本错误，也忽略
    if (e.message && (
        e.message.includes('Cannot read properties of undefined') ||
        (e.message.includes('length') && e.filename && e.filename.includes('.js'))
    )) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return true;
    }
}, true);

// 捕获未处理的 Promise 错误
window.addEventListener('unhandledrejection', function (e) {
    const reason = e.reason ? e.reason.toString() : '';
    if (reason.includes('page-events') || 
        reason.includes('Cannot read properties') ||
        (reason.includes('length') && reason.includes('undefined'))) {
        e.preventDefault();
    }
});

// 使用 try-catch 包装可能出错的主题脚本事件处理
// 在 DOMContentLoaded 之前设置，确保能捕获所有错误
(function() {
    const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function(event) {
        try {
            return originalDispatchEvent.call(this, event);
        } catch (error) {
            // 如果是主题脚本相关的错误，静默忽略
            if (error && error.message && (
                error.message.includes('Cannot read properties') ||
                error.message.includes('length') ||
                (error.stack && error.stack.includes('page-events'))
            )) {
                return false; // 返回 false 表示事件被阻止
            }
            // 其他错误正常抛出
            throw error;
        }
    };
})();

// 自动检测 API 基础路径
const API_BASE = window.location.origin.includes('5000')
    ? `${window.location.protocol}//${window.location.host}/api`
    : 'http://localhost:5000/api';

let tags = [];
let categories = [];
let uploadedImages = [];
let coverImageUrl = null;

// 设置默认日期为今天
document.getElementById('date').valueAsDate = new Date();

// 标签输入
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

function updateTagsDisplay() {
    tagsContainer.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <span class="remove" data-tag="${tag}">×</span>
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

// 分类输入
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

function updateCategoriesDisplay() {
    categoriesContainer.innerHTML = categories.map(cat => `
        <span class="category">
            ${cat}
            <span class="remove" data-category="${cat}">×</span>
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

async function handleCoverUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'cover');  // 指定为封面图片

    try {
        const response = await fetch(`${API_BASE}/posts/upload-image`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.errno === 0) {
            coverImageUrl = result.data.url;
            
            // 显示预览
            const imageSrc = `http://localhost:5000${coverImageUrl}`;
            const coverItem = document.createElement('div');
            coverItem.className = 'cover-preview-item';
            coverItem.innerHTML = `
                <img src="${imageSrc}" alt="封面预览">
                <button type="button" class="remove">×</button>
            `;
            coverPreview.innerHTML = '';
            coverPreview.appendChild(coverItem);
            
            // 添加删除按钮事件
            coverItem.querySelector('.remove').addEventListener('click', removeCover);
        } else {
            alert('封面图片上传失败: ' + result.errmsg);
        }
    } catch (error) {
        alert('封面图片上传失败: ' + error.message);
    }
}

function removeCover() {
    coverImageUrl = null;
    coverPreview.innerHTML = '';
    coverFileInput.value = '';
}

// 图片上传
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

async function handleFiles(files) {
    for (const file of files) {
        await uploadImage(file);
    }
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'content');  // 指定为内容图片

    try {
        const response = await fetch(`${API_BASE}/posts/upload-image`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.errno === 0) {
            const imageUrl = result.data.url;
            uploadedImages.push(imageUrl);

            // 显示预览
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            // 图片路径已经是 /img/xxx，直接从后端访问
            const imageSrc = `http://localhost:5000${imageUrl}`;
            imageItem.innerHTML = `
                <img src="${imageSrc}" alt="预览">
                <button type="button" class="remove" onclick="this.parentElement.remove()">×</button>
            `;
            imagePreview.appendChild(imageItem);

            // 自动插入到文章末尾
            const content = document.getElementById('content');
            const imageMarkdown = `\n\n![${file.name}](${imageUrl})\n`;
            content.value += imageMarkdown;
        } else {
            alert('上传失败: ' + result.errmsg);
        }
    } catch (error) {
        alert('上传失败: ' + error.message);
    }
}

// 表单提交
document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const status = document.getElementById('status');

    submitBtn.disabled = true;
    status.className = 'status';
    status.textContent = '正在提交...';

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
            status.className = 'status success';
            status.textContent = message;

            // 清空表单
            setTimeout(() => {
                document.getElementById('postForm').reset();
                tags = [];
                categories = [];
                uploadedImages = [];
                coverImageUrl = null;
                updateTagsDisplay();
                updateCategoriesDisplay();
                imagePreview.innerHTML = '';
                coverPreview.innerHTML = '';
                document.getElementById('date').valueAsDate = new Date();
                status.className = 'status';
            }, 5000);
        } else {
            status.className = 'status error';
            let errorMsg = `❌ 提交失败: ${result.errmsg || '未知错误'}`;
            if (result.detail) {
                console.error('详细错误:', result.detail);
            }
            status.textContent = errorMsg;
        }
    } catch (error) {
        status.className = 'status error';
        status.textContent = `❌ 提交失败: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});

// 预览功能
const previewBtn = document.getElementById('previewBtn');
const previewModal = document.getElementById('previewModal');
const closePreview = document.getElementById('closePreview');
const previewContent = document.getElementById('previewContent');

// 配置 marked.js
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true, // 支持 GitHub 风格的换行
        gfm: true, // 启用 GitHub 风格的 Markdown
        sanitize: false, // 允许 HTML（用于预览）
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
            // 如果 marked.js 未加载，显示提示
            html = '<p style="color: #d32f2f;">⚠️ Markdown 渲染库未加载，请刷新页面重试。</p><pre>' + 
                   content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
                   '</pre>';
        }
        
        // 处理外部链接，使其在新标签页打开
        html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
        
        // 显示预览
        previewContent.innerHTML = `<h1>${title}</h1>\n${html}`;
        previewModal.classList.add('show');
    } else {
        alert('请先输入文章内容');
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
