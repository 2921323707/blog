// 图片上传功能

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
    //
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
