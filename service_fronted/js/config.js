// 配置和全局状态

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

// 全局状态
let tags = [];
let categories = [];
let uploadedImages = [];
let coverImageUrl = null;
let currentView = 'editor'; // 'editor' 或 'list'
let editingFilename = null; // 当前编辑的文章文件名，null 表示新建
