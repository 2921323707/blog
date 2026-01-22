// 表单相关功能

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

// 表单提交
async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const status = document.getElementById('status');

    submitBtn.disabled = true;
    showStatus(editingFilename ? '正在更新...' : '正在提交...', 'info');

    const data = {
        title: document.getElementById('title').value.trim(),
        content: document.getElementById('content').value.trim(),
        tags: tags,
        categories: categories,
        cover: coverImageUrl || undefined,
        date: document.getElementById('date').value || undefined
    };

    // 如果是编辑模式，添加文件名
    if (editingFilename) {
        data.filename = editingFilename;
    }

    try {
        const url = editingFilename ? `${API_BASE}/posts/update` : `${API_BASE}/posts/submit`;
        const method = editingFilename ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.errno === 0) {
            let message = `✅ ${result.data.message || (editingFilename ? '文章更新成功！' : '文章提交成功！')}`;
            if (result.warning) {
                message += `\n⚠️ ${result.warning}`;
            }
            showStatus(message, 'success');

            // 清空表单并返回列表
            setTimeout(() => {
                resetForm();
                showListView();
            }, 2000);
        } else {
            showStatus(`❌ ${editingFilename ? '更新' : '提交'}失败: ${result.errmsg || '未知错误'}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ ${editingFilename ? '更新' : '提交'}失败: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

function resetForm() {
    document.getElementById('postForm').reset();
    tags = [];
    categories = [];
    uploadedImages = [];
    coverImageUrl = null;
    editingFilename = null;
    updateTagsDisplay();
    updateCategoriesDisplay();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('coverPreview').innerHTML = '';
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('submitBtnText').textContent = '提交文章';
    document.getElementById('cancelEditBtn').style.display = 'none';
    const status = document.getElementById('status');
    status.className = 'status';
    status.textContent = '';
}
