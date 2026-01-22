// 工具函数

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 状态提示
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.className = `status ${type}`;
    status.textContent = message;
    status.style.display = 'block';
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
