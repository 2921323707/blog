// 全局错误处理 - 捕获并忽略主题脚本的错误
window.addEventListener('error', function (e) {
    // 如果是 page-events.js 或其他主题脚本的错误，忽略它
    if (e.filename && (e.filename.includes('page-events') ||
        e.filename.includes('main.js') ||
        e.filename.includes('utils.js'))) {
        e.preventDefault();
        console.warn('已忽略主题脚本错误:', e.message);
        return true;
    }
}, true);

// 捕获未处理的 Promise 错误
window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.toString().includes('page-events')) {
        e.preventDefault();
        console.warn('已忽略主题脚本 Promise 错误');
    }
});

// 自动检测 API 基础路径
const API_BASE = window.location.origin.includes('5000')
    ? `${window.location.protocol}//${window.location.host}/api`
    : 'http://localhost:5000/api';

let tags = [];
let categories = [];
let uploadedImages = [];

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
                updateTagsDisplay();
                updateCategoriesDisplay();
                imagePreview.innerHTML = '';
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

// 预览功能（简单实现）
document.getElementById('previewBtn').addEventListener('click', () => {
    const content = document.getElementById('content').value;
    if (content) {
        // 这里可以集成 markdown 预览库，暂时用 alert 提示
        alert('预览功能：可以在新窗口中打开预览页面，或集成 markdown 预览库');
    }
});
