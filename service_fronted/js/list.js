// 文章列表功能

// 视图切换
function initViewToggle() {
    const viewToggle = document.getElementById('viewToggle');
    const viewToggleIcon = document.getElementById('viewToggleIcon');
    const viewToggleText = document.getElementById('viewToggleText');

    viewToggle.addEventListener('click', () => {
        if (currentView === 'editor') {
            showListView();
        } else {
            showEditorView();
        }
    });
}

function showListView() {
    currentView = 'list';
    document.getElementById('postsListView').style.display = 'block';
    document.getElementById('postForm').style.display = 'none';
    document.getElementById('viewToggleIcon').className = 'fas fa-edit';
    document.getElementById('viewToggleText').textContent = '编辑文章';
    loadPostsList();
}

function showEditorView() {
    currentView = 'editor';
    document.getElementById('postsListView').style.display = 'none';
    document.getElementById('postForm').style.display = 'block';
    document.getElementById('viewToggleIcon').className = 'fas fa-list';
    document.getElementById('viewToggleText').textContent = '文章列表';
}

// 文章列表功能
function initPostsList() {
    const newPostBtn = document.getElementById('newPostBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    newPostBtn.addEventListener('click', () => {
        resetForm();
        showEditorView();
    });

    cancelEditBtn.addEventListener('click', () => {
        if (confirm('确定要取消编辑吗？未保存的更改将丢失。')) {
            resetForm();
            showListView();
        }
    });
}

async function loadPostsList() {
    const container = document.getElementById('postsListContainer');
    const loading = document.getElementById('postsListLoading');

    loading.style.display = 'flex';
    container.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/posts/list`);
        const result = await response.json();

        loading.style.display = 'none';

        if (result.errno === 0) {
            const posts = result.data || [];

            if (posts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>还没有文章，点击"新建文章"开始创作吧！</p>
                    </div>
                `;
            } else {
                container.innerHTML = posts.map(post => {
                    const rawFilename = post.filename;
                    const safeFilename = rawFilename.replace(/"/g, '&quot;');
                    const displayFilename = escapeHtml(post.filename);
                    return `
                    <div class="post-item" data-filename="${safeFilename}">
                        <div class="post-item-content">
                            <h3 class="post-title">${escapeHtml(post.title || post.filename)}</h3>
                            <div class="post-meta">
                                <span class="post-date">
                                    <i class="fas fa-calendar"></i>
                                    ${post.date || '未设置日期'}
                                </span>
                                <span class="post-filename">
                                    <i class="fas fa-file"></i>
                                    ${displayFilename}
                                </span>
                                <span class="post-size">
                                    <i class="fas fa-hdd"></i>
                                    ${formatFileSize(post.size || 0)}
                                </span>
                            </div>
                        </div>
                        <div class="post-item-actions">
                            <button class="btn btn-sm btn-primary edit-post-btn" data-filename="${safeFilename}" title="编辑">
                                <i class="fas fa-edit"></i>
                                编辑
                            </button>
                            <button class="btn btn-sm btn-danger delete-post-btn" data-filename="${safeFilename}" title="删除">
                                <i class="fas fa-trash"></i>
                                删除
                            </button>
                        </div>
                    </div>
                `;
                }).join('');

                // 绑定编辑和删除按钮事件
                container.querySelectorAll('.edit-post-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const filename = e.target.closest('.edit-post-btn').getAttribute('data-filename');
                        editPost(filename);
                    });
                });

                container.querySelectorAll('.delete-post-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const filename = e.target.closest('.delete-post-btn').getAttribute('data-filename');
                        deletePost(filename);
                    });
                });
            }
        } else {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载失败: ${result.errmsg || '未知错误'}</p>
                    <button class="btn btn-primary retry-load-btn">重试</button>
                </div>
            `;
            container.querySelector('.retry-load-btn').addEventListener('click', loadPostsList);
        }
    } catch (error) {
        loading.style.display = 'none';
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载失败: ${error.message}</p>
                <button class="btn btn-primary retry-load-btn">重试</button>
            </div>
        `;
        container.querySelector('.retry-load-btn').addEventListener('click', loadPostsList);
    }
}

async function editPost(filename) {
    // 将 &quot; 转换回引号
    const decodedFilename = filename.replace(/&quot;/g, '"');
    try {
        showStatus('正在加载文章...', 'info');
        const response = await fetch(`${API_BASE}/posts/get?filename=${encodeURIComponent(decodedFilename)}`);
        const result = await response.json();

        if (result.errno === 0) {
            const post = result.data;

            // 填充表单
            document.getElementById('title').value = post.title || '';
            document.getElementById('content').value = post.content || '';
            document.getElementById('date').value = post.date ? post.date.split(' ')[0].split('T')[0] : '';

            // 填充标签
            tags = Array.isArray(post.tags) ? [...post.tags] : (post.tags ? [post.tags] : []);
            updateTagsDisplay();

            // 填充分类
            categories = Array.isArray(post.categories) ? [...post.categories] : (post.categories ? [post.categories] : []);
            updateCategoriesDisplay();

            // 填充封面
            if (post.cover) {
                coverImageUrl = post.cover;
                const coverPreview = document.getElementById('coverPreview');
                const imageSrc = post.cover.startsWith('http')
                    ? post.cover
                    : `${window.location.origin}${post.cover}`;
                const coverItem = document.createElement('div');
                coverItem.className = 'cover-preview-item';
                coverItem.innerHTML = `
                    <img src="${imageSrc}" alt="封面预览" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'400\' height=\'200\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'18\' dy=\'10.5\' font-weight=\'bold\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3E图片加载失败%3C/text%3E%3C/svg%3E'">
                    <button type="button" class="remove" title="删除封面">×</button>
                `;
                coverPreview.innerHTML = '';
                coverPreview.appendChild(coverItem);
                coverItem.querySelector('.remove').addEventListener('click', removeCover);
            } else {
                coverImageUrl = null;
                document.getElementById('coverPreview').innerHTML = '';
            }

            // 清空图片预览（编辑时不自动加载已上传的图片）
            uploadedImages = [];
            document.getElementById('imagePreview').innerHTML = '';

            // 设置编辑模式
            editingFilename = decodedFilename;
            document.getElementById('submitBtnText').textContent = '更新文章';
            document.getElementById('cancelEditBtn').style.display = 'inline-flex';

            // 切换到编辑器视图
            showEditorView();

            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });

            showStatus('文章加载成功', 'success');
            setTimeout(() => {
                const status = document.getElementById('status');
                status.className = 'status';
                status.textContent = '';
            }, 2000);
        } else {
            showStatus(`❌ 加载失败: ${result.errmsg || '未知错误'}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ 加载失败: ${error.message}`, 'error');
    }
}

async function deletePost(filename) {
    // 将 &quot; 转换回引号
    const decodedFilename = filename.replace(/&quot;/g, '"');
    const postTitle = decodedFilename.replace('.md', '');
    if (!confirm(`确定要删除文章 "${postTitle}" 吗？此操作不可恢复！`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/posts/delete?filename=${encodeURIComponent(decodedFilename)}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.errno === 0) {
            showStatus(`✅ ${result.data.message || '文章删除成功！'}`, 'success');
            // 刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showStatus(`❌ 删除失败: ${result.errmsg || '未知错误'}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ 删除失败: ${error.message}`, 'error');
    }
}
